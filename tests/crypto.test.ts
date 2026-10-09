// Mock expo packages before importing crypto modules
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, val: string) => {
      store.set(key, val);
    }),
    getItemAsync: jest.fn(async (key: string) => {
      return store.get(key) || null;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  };
});

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    getRandomValues: (arr: Uint8Array) => nodeCrypto.randomFillSync(arr),
    getRandomBytes: (len: number) => nodeCrypto.randomBytes(len),
  };
});

import { DeviceKeyManager } from '../lib/crypto/DeviceKeyManager';
import { E2EEManager, TamperDetectedError } from '../lib/crypto/E2EEManager';
import { MediaEncryptionManager, CorruptedMediaError } from '../lib/crypto/MediaEncryption';
import { AppLockManager } from '../lib/crypto/AppLockManager';
import { utf8ToBytes, bytesToUtf8 } from '../lib/crypto/utils';

describe('LoveVerse End-to-End Cryptography Suite', () => {
  const keyManager = DeviceKeyManager.getInstance();
  const e2ee = E2EEManager.getInstance();
  const mediaCrypto = MediaEncryptionManager.getInstance();
  const appLock = AppLockManager.getInstance();

  describe('1. Device Key Management & Identity Verification', () => {
    it('generates cryptographic identity with X25519, Ed25519, and signed prekeys', async () => {
      const identity = await keyManager.rotateIdentityKeys();
      expect(identity.deviceId).toMatch(/^dev_[a-f0-9]{24}$/);
      expect(identity.identityKey).toBeDefined();
      expect(identity.signingKey).toBeDefined();
      expect(identity.signedPrekey).toBeDefined();
      expect(identity.prekeySignature).toBeDefined();
      expect(identity.safetyNumber).toHaveLength(60);
    });

    it('generates reproducible 60-digit safety numbers regardless of partner order', async () => {
      const keyA = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6';
      const keyB = 'z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4';

      const comp1 = keyManager.computeSafetyNumberComparison(keyA, keyB);
      const comp2 = keyManager.computeSafetyNumberComparison(keyB, keyA);

      expect(comp1.localSafetyNumber).toBe(comp2.localSafetyNumber);
      expect(comp1.formattedBlocks).toHaveLength(12);
      expect(comp1.formattedBlocks[0]).toHaveLength(5);
    });

    it('detects partner key rotation and triggers key-change warning', async () => {
      const partnerKeyOriginal = 'original_key_1111';
      const partnerKeyNew = 'rotated_key_2222';

      await keyManager.setPartnerVerified(partnerKeyOriginal, true);

      const status1 = await keyManager.getPartnerVerificationStatus(partnerKeyOriginal);
      expect(status1.isVerified).toBe(true);
      expect(status1.hasKeyChanged).toBe(false);

      const status2 = await keyManager.getPartnerVerificationStatus(partnerKeyNew);
      expect(status2.isVerified).toBe(false);
      expect(status2.hasKeyChanged).toBe(true); // Untrusted key rotation alert
    });
  });

  describe('2. E2EE Message Encryption & Tamper Detection', () => {
    it('encrypts and decrypts messages using X25519 + HKDF-SHA256 + AES-256-GCM', async () => {
      const identity = await keyManager.getOrGenerateIdentity();
      const conversationId = 'conv-couple-uuid-1234';
      const messageText = 'I love you to the moon and back ❤️';

      // Alice encrypts for Bob (using identity key as recipient)
      const envelope = await e2ee.encryptMessage(
        messageText,
        identity.identityKey,
        identity.deviceId,
        conversationId
      );

      expect(envelope.algorithm).toBe('AES-256-GCM+X25519-HKDF');
      expect(envelope.ciphertext).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.tag).toBeDefined();

      // Recipient decrypts
      const decrypted = await e2ee.decryptMessage(envelope, conversationId);
      expect(decrypted).toBe(messageText);
    });

    it('rejects tampered ciphertext with TamperDetectedError', async () => {
      const identity = await keyManager.getOrGenerateIdentity();
      const conversationId = 'conv-couple-uuid-1234';

      const envelope = await e2ee.encryptMessage(
        'Secret message',
        identity.identityKey,
        identity.deviceId,
        conversationId
      );

      // Tamper 1 character of ciphertext
      const originalCipher = envelope.ciphertext;
      const tamperedCipher = (originalCipher.charAt(0) === 'A' ? 'B' : 'A') + originalCipher.slice(1);
      const tamperedEnvelope = { ...envelope, ciphertext: tamperedCipher };

      await expect(e2ee.decryptMessage(tamperedEnvelope, conversationId)).rejects.toThrow(
        TamperDetectedError
      );
    });

    it('rejects replay into another conversation due to AAD mismatch', async () => {
      const identity = await keyManager.getOrGenerateIdentity();
      const conversationA = 'conv-couple-room-A';
      const conversationB = 'conv-couple-room-B';

      const envelope = await e2ee.encryptMessage(
        'Valid for Room A only',
        identity.identityKey,
        identity.deviceId,
        conversationA
      );

      // Attempting to decrypt in Room B must fail authentication tag check
      await expect(e2ee.decryptMessage(envelope, conversationB)).rejects.toThrow(
        TamperDetectedError
      );
    });
  });

  describe('3. Client-Side Media Encryption & Gallery Security', () => {
    it('encrypts photos with random 256-bit media key and verifies SHA-256 hash', async () => {
      const photoBytes = utf8ToBytes('BINARY_JPEG_IMAGE_DATA_BYTES_1234567890');
      const envelope = await mediaCrypto.encryptMedia(photoBytes, 'image/jpeg');

      expect(envelope.mediaKey).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.ciphertextHash).toHaveLength(64);

      // Decrypt
      const decrypted = await mediaCrypto.decryptMedia(
        envelope.encryptedBytes,
        envelope.mediaKey,
        envelope.iv,
        envelope.ciphertextHash,
        'image/jpeg'
      );

      expect(bytesToUtf8(decrypted.data)).toBe('BINARY_JPEG_IMAGE_DATA_BYTES_1234567890');
    });

    it('detects corrupted or tampered media bytes', async () => {
      const videoBytes = utf8ToBytes('MP4_VIDEO_STREAM_CHUNKS');
      const envelope = await mediaCrypto.encryptMedia(videoBytes, 'video/mp4');

      // Tamper with encrypted bytes
      const corruptedBytes = new Uint8Array(envelope.encryptedBytes);
      corruptedBytes[0] ^= 0xff;

      await expect(
        mediaCrypto.decryptMedia(
          corruptedBytes,
          envelope.mediaKey,
          envelope.iv,
          envelope.ciphertextHash,
          'video/mp4'
        )
      ).rejects.toThrow(CorruptedMediaError);
    });

    it('encrypts and decrypts gallery metadata (captions & titles)', async () => {
      const metadata = {
        originalFileName: 'sunset_beach.jpg',
        fileSizeBytes: 2048500,
        caption: 'Our first anniversary trip in Maui! 🌅',
        isFavorite: true,
      };

      const mediaEnvelope = await mediaCrypto.encryptMedia(
        utf8ToBytes('dummy'),
        'image/jpeg'
      );

      const enc = await mediaCrypto.encryptMetadata(metadata, mediaEnvelope.mediaKey);
      const dec = await mediaCrypto.decryptMetadata(enc.ciphertext, enc.iv, mediaEnvelope.mediaKey);

      expect(dec.caption).toBe(metadata.caption);
      expect(dec.isFavorite).toBe(true);
    });
  });

  describe('4. App Lock (PBKDF2 Salted Hashing & Rate Limiting)', () => {
    it('hashes PIN with PBKDF2 and verifies valid PIN', async () => {
      await appLock.setPin('1428');

      const validCheck = await appLock.verifyPin('1428');
      expect(validCheck.success).toBe(true);

      const invalidCheck = await appLock.verifyPin('9999');
      expect(invalidCheck.success).toBe(false);
      expect(invalidCheck.remainingAttempts).toBeDefined();
    });

    it('enforces lockout after 5 consecutive failed attempts', async () => {
      await appLock.setPin('5555');

      for (let i = 0; i < 4; i++) {
        await appLock.verifyPin('0000');
      }

      // 5th attempt triggers lockout
      const fifthAttempt = await appLock.verifyPin('0000');
      expect(fifthAttempt.success).toBe(false);
      expect(fifthAttempt.lockoutDurationSeconds).toBeGreaterThan(0);

      // Immediate subsequent attempt is blocked by cooldown
      const blockedAttempt = await appLock.verifyPin('5555');
      expect(blockedAttempt.success).toBe(false);
      expect(blockedAttempt.lockoutDurationSeconds).toBeGreaterThan(0);
    });

    it('authenticates with biometric credential', async () => {
      const bioResult = await appLock.authenticateBiometric();
      expect(bioResult).toBe(true);
    });
  });
});
