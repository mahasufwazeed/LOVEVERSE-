export interface DeviceKeyPair {
  publicKey: string; // Base64 or Hex
  privateKey: string; // Keystore-backed only
}

export interface DeviceIdentityBundle {
  deviceId: string;
  identityKey: string; // X25519 public key
  signingKey: string; // Ed25519 public key
  signedPrekey: string;
  prekeySignature: string;
  registrationId: number;
  safetyNumber: string;
  createdAt: string;
}

export interface OneTimePreKey {
  keyId: number;
  publicKey: string;
  isConsumed?: boolean;
}

export interface EncryptedMessagePayload {
  ciphertext: string; // Base64 AES-256-GCM ciphertext
  iv: string; // Base64 96-bit IV
  tag: string; // Base64 128-bit authentication tag
  ephemeralPublicKey: string; // Base64 ephemeral X25519 public key
  senderDeviceId: string;
  recipientDeviceId: string;
  algorithm: 'AES-256-GCM+X25519-HKDF';
  timestamp: number;
}

export interface MediaEncryptionEnvelope {
  encryptedBytes: Uint8Array;
  mediaKey: string; // Base64 256-bit random key (to be sent inside E2EE message envelope)
  iv: string; // Base64 96-bit IV
  tag: string; // Base64 128-bit tag
  ciphertextHash: string; // SHA-256 hex
  fileSizeBytes: number;
  mimeType: string;
}

export interface EncryptedAttachmentMetadata {
  originalFileName: string;
  fileSizeBytes: number;
  caption?: string;
  dimensions?: { width: number; height: number };
  durationSeconds?: number;
  isGallery?: boolean;
  albumId?: string;
  isFavorite?: boolean;
}

export interface DecryptedAttachmentResult {
  data: Uint8Array;
  mimeType: string;
  metadata?: EncryptedAttachmentMetadata;
}

export interface SafetyNumberComparison {
  localSafetyNumber: string;
  partnerSafetyNumber: string;
  matches: boolean;
  formattedBlocks: string[]; // 12 blocks of 5 digits (Signal style)
  qrCodePayload: string;
}

export interface AppLockConfig {
  isPinSet: boolean;
  isBiometricEnabled: boolean;
  autoLockDelaySeconds: number; // 0 = immediate, 30, 60, 300
  failedAttempts: number;
  lockoutUntilTimestamp: number | null;
}
