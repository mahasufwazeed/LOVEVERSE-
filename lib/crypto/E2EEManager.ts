import { gcm } from '@noble/ciphers/aes.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { DeviceKeyManager } from './DeviceKeyManager';
import { EncryptedMessagePayload } from './types';
import {
  getRandomBytes,
  bytesToBase64,
  base64ToBytes,
  utf8ToBytes,
  bytesToUtf8,
} from './utils';

const HKDF_INFO_MESSAGE = utf8ToBytes('LoveVerse-E2EE-Message-v1');
const HKDF_SALT = utf8ToBytes('LoveVerse-Couple-Messenger-Salt');

export class TamperDetectedError extends Error {
  constructor(message = 'Message ciphertext has been tampered with or corrupted.') {
    super(message);
    this.name = 'TamperDetectedError';
  }
}

export class E2EEManager {
  private static instance: E2EEManager;
  private keyManager: DeviceKeyManager;

  private constructor() {
    this.keyManager = DeviceKeyManager.getInstance();
  }

  public static getInstance(): E2EEManager {
    if (!E2EEManager.instance) {
      E2EEManager.instance = new E2EEManager();
    }
    return E2EEManager.instance;
  }

  /**
   * Encrypts a plaintext message string into an authenticated E2EE envelope using
   * X25519 Ephemeral Diffie-Hellman + HKDF-SHA256 + AES-256-GCM.
   */
  public async encryptMessage(
    plaintext: string,
    recipientPublicKeyBase64: string,
    recipientDeviceId: string,
    conversationId: string
  ): Promise<EncryptedMessagePayload> {
    const identity = await this.keyManager.getOrGenerateIdentity();
    const recipientPubKey = base64ToBytes(recipientPublicKeyBase64);

    // 1. Generate single-use Ephemeral X25519 Keypair (Forward Secrecy per message)
    const ephemeralPriv = x25519.utils.randomSecretKey();
    const ephemeralPub = x25519.getPublicKey(ephemeralPriv);

    // 2. Perform ECDH to compute Diffie-Hellman Shared Secret
    const sharedSecret = x25519.getSharedSecret(ephemeralPriv, recipientPubKey);

    // 3. Derive 256-bit symmetric session key using HKDF-SHA256
    const sessionKey = hkdf(sha256, sharedSecret, HKDF_SALT, HKDF_INFO_MESSAGE, 32);

    // 4. Generate fresh 96-bit CSPRNG Initialization Vector
    const iv = getRandomBytes(12);

    // 5. Construct Additional Authenticated Data (AAD) to prevent replay/cross-conversation injection
    const timestamp = Date.now();
    const aad = utf8ToBytes(`${conversationId}::${identity.deviceId}::${recipientDeviceId}::${timestamp}`);

    // 6. Encrypt with AES-256-GCM
    const cipher = gcm(sessionKey, iv, aad);
    const plaintextBytes = utf8ToBytes(plaintext);
    const ciphertextWithTag = cipher.encrypt(plaintextBytes);

    // Split 16-byte tag from the ciphertext body
    const tagLength = 16;
    const ciphertextOnly = ciphertextWithTag.slice(0, ciphertextWithTag.length - tagLength);
    const tagOnly = ciphertextWithTag.slice(ciphertextWithTag.length - tagLength);

    return {
      ciphertext: bytesToBase64(ciphertextOnly),
      iv: bytesToBase64(iv),
      tag: bytesToBase64(tagOnly),
      ephemeralPublicKey: bytesToBase64(ephemeralPub),
      senderDeviceId: identity.deviceId,
      recipientDeviceId,
      algorithm: 'AES-256-GCM+X25519-HKDF',
      timestamp,
    };
  }

  /**
   * Decrypts an authenticated E2EE envelope after verifying recipient identity,
   * AAD, and AES-256-GCM authentication tag.
   */
  public async decryptMessage(
    payload: EncryptedMessagePayload,
    conversationId: string
  ): Promise<string> {
    const recipientPriv = await this.keyManager.getPrivateIdentityKey();
    const ephemeralPub = base64ToBytes(payload.ephemeralPublicKey);

    // 1. Compute ECDH Shared Secret with sender's ephemeral key
    const sharedSecret = x25519.getSharedSecret(recipientPriv, ephemeralPub);

    // 2. Derive 256-bit symmetric session key with identical HKDF parameters
    const sessionKey = hkdf(sha256, sharedSecret, HKDF_SALT, HKDF_INFO_MESSAGE, 32);

    // 3. Reconstruct AAD
    const aad = utf8ToBytes(
      `${conversationId}::${payload.senderDeviceId}::${payload.recipientDeviceId}::${payload.timestamp}`
    );

    // 4. Reconstruct full ciphertext + tag buffer for @noble/ciphers verification
    const iv = base64ToBytes(payload.iv);
    const ciphertextBytes = base64ToBytes(payload.ciphertext);
    const tagBytes = base64ToBytes(payload.tag);

    const ciphertextWithTag = new Uint8Array(ciphertextBytes.length + tagBytes.length);
    ciphertextWithTag.set(ciphertextBytes, 0);
    ciphertextWithTag.set(tagBytes, ciphertextBytes.length);

    try {
      const cipher = gcm(sessionKey, iv, aad);
      const decryptedBytes = cipher.decrypt(ciphertextWithTag);
      return bytesToUtf8(decryptedBytes);
    } catch {
      throw new TamperDetectedError();
    }
  }

  /**
   * Helper to encrypt arbitrary JSON serializable objects (e.g. replies, media keys, stickers).
   */
  public async encryptObject<T>(
    data: T,
    recipientPublicKeyBase64: string,
    recipientDeviceId: string,
    conversationId: string
  ): Promise<EncryptedMessagePayload> {
    const json = JSON.stringify(data);
    return await this.encryptMessage(json, recipientPublicKeyBase64, recipientDeviceId, conversationId);
  }

  /**
   * Helper to decrypt and parse JSON objects.
   */
  public async decryptObject<T>(
    payload: EncryptedMessagePayload,
    conversationId: string
  ): Promise<T> {
    const json = await this.decryptMessage(payload, conversationId);
    return JSON.parse(json) as T;
  }
}
