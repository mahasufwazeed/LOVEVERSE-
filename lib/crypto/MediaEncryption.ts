import { gcm } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { MediaEncryptionEnvelope, DecryptedAttachmentResult, EncryptedAttachmentMetadata } from './types';
import {
  getRandomBytes,
  bytesToBase64,
  base64ToBytes,
  bytesToHex,
  utf8ToBytes,
  bytesToUtf8,
  constantTimeCompare,
} from './utils';

export class CorruptedMediaError extends Error {
  constructor(message = 'Encrypted media integrity verification failed.') {
    super(message);
    this.name = 'CorruptedMediaError';
  }
}

export class MediaEncryptionManager {
  private static instance: MediaEncryptionManager;

  public static getInstance(): MediaEncryptionManager {
    if (!MediaEncryptionManager.instance) {
      MediaEncryptionManager.instance = new MediaEncryptionManager();
    }
    return MediaEncryptionManager.instance;
  }

  /**
   * Encrypts arbitrary media binary data (photo, video, audio) with a single-use
   * random 256-bit media key and AES-256-GCM.
   */
  public async encryptMedia(
    rawBytes: Uint8Array,
    mimeType: string
  ): Promise<MediaEncryptionEnvelope> {
    // 1. Generate unique random 256-bit media key (single-use per attachment)
    const mediaKey = getRandomBytes(32);

    // 2. Generate unique random 96-bit IV
    const iv = getRandomBytes(12);

    // 3. Encrypt payload with AES-256-GCM
    const cipher = gcm(mediaKey, iv);
    const ciphertextWithTag = cipher.encrypt(rawBytes);

    // 4. Split tag from ciphertext
    const tagLength = 16;
    const tag = ciphertextWithTag.slice(ciphertextWithTag.length - tagLength);

    // 5. Compute SHA-256 hash of the ciphertext for transport integrity verification
    const ciphertextHash = bytesToHex(sha256(ciphertextWithTag));

    return {
      encryptedBytes: ciphertextWithTag,
      mediaKey: bytesToBase64(mediaKey),
      iv: bytesToBase64(iv),
      tag: bytesToBase64(tag),
      ciphertextHash,
      fileSizeBytes: ciphertextWithTag.length,
      mimeType,
    };
  }

  /**
   * Decrypts an encrypted media file after verifying SHA-256 checksum and AES-GCM auth tag.
   */
  public async decryptMedia(
    encryptedBytes: Uint8Array,
    mediaKeyBase64: string,
    ivBase64: string,
    expectedCiphertextHash?: string,
    mimeType: string = 'image/jpeg'
  ): Promise<DecryptedAttachmentResult> {
    // 1. Verify transport SHA-256 hash if provided
    if (expectedCiphertextHash) {
      const computedHash = bytesToHex(sha256(encryptedBytes));
      if (computedHash.toLowerCase() !== expectedCiphertextHash.toLowerCase()) {
        throw new CorruptedMediaError('Media checksum mismatch during transport.');
      }
    }

    // 2. Decode key and IV
    const mediaKey = base64ToBytes(mediaKeyBase64);
    const iv = base64ToBytes(ivBase64);

    try {
      const cipher = gcm(mediaKey, iv);
      const decryptedData = cipher.decrypt(encryptedBytes);
      return {
        data: decryptedData,
        mimeType,
      };
    } catch {
      throw new CorruptedMediaError('AES-GCM authentication tag verification failed.');
    }
  }

  /**
   * Encrypts attachment metadata (captions, album title, dimensions) client-side.
   */
  public async encryptMetadata(
    metadata: EncryptedAttachmentMetadata,
    mediaKeyBase64: string
  ): Promise<{ ciphertext: string; iv: string }> {
    const key = base64ToBytes(mediaKeyBase64);
    const iv = getRandomBytes(12);
    const cipher = gcm(key, iv);
    const jsonBytes = utf8ToBytes(JSON.stringify(metadata));
    const encrypted = cipher.encrypt(jsonBytes);

    return {
      ciphertext: bytesToBase64(encrypted),
      iv: bytesToBase64(iv),
    };
  }

  /**
   * Decrypts client-side encrypted metadata.
   */
  public async decryptMetadata(
    ciphertextBase64: string,
    ivBase64: string,
    mediaKeyBase64: string
  ): Promise<EncryptedAttachmentMetadata> {
    const key = base64ToBytes(mediaKeyBase64);
    const iv = base64ToBytes(ivBase64);
    const encryptedBytes = base64ToBytes(ciphertextBase64);

    const cipher = gcm(key, iv);
    const decryptedBytes = cipher.decrypt(encryptedBytes);
    const jsonStr = bytesToUtf8(decryptedBytes);
    return JSON.parse(jsonStr) as EncryptedAttachmentMetadata;
  }

  /**
   * Converts a decrypted byte array to a temporary Base64 Data URL for in-memory display
   * without persisting plaintext files to public storage.
   */
  public createSafeDataUrl(bytes: Uint8Array, mimeType: string): string {
    return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
  }
}
