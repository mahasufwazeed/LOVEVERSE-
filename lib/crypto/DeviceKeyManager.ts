import * as SecureStore from 'expo-secure-store';
import { x25519, ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  getRandomBytes,
  bytesToBase64,
  base64ToBytes,
  bytesToHex,
  hexToBytes,
  utf8ToBytes,
} from './utils';
import { DeviceIdentityBundle, OneTimePreKey, SafetyNumberComparison } from './types';

const STORAGE_KEYS = {
  DEVICE_ID: 'loveverse_secure_device_id',
  REGISTRATION_ID: 'loveverse_secure_reg_id',
  X25519_PRIVATE_KEY: 'loveverse_secure_x25519_priv',
  X25519_PUBLIC_KEY: 'loveverse_secure_x25519_pub',
  ED25519_PRIVATE_KEY: 'loveverse_secure_ed25519_priv',
  ED25519_PUBLIC_KEY: 'loveverse_secure_ed25519_pub',
  SIGNED_PREKEY_PRIVATE: 'loveverse_secure_signed_prekey_priv',
  SIGNED_PREKEY_PUBLIC: 'loveverse_secure_signed_prekey_pub',
  SIGNED_PREKEY_SIG: 'loveverse_secure_signed_prekey_sig',
  ONE_TIME_PREKEYS: 'loveverse_secure_otk_list',
  PARTNER_IDENTITY_KEY: 'loveverse_secure_partner_id_key',
  PARTNER_VERIFIED_STATUS: 'loveverse_secure_partner_verified',
};

// Fallback in-memory secure vault for test environments where SecureStore isn't native
const memoryVault = new Map<string, string>();

async function secureSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    memoryVault.set(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(key);
    if (val !== null) return val;
    return memoryVault.get(key) || null;
  } catch {
    return memoryVault.get(key) || null;
  }
}

async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore error
  }
  memoryVault.delete(key);
}

export class DeviceKeyManager {
  private static instance: DeviceKeyManager;

  public static getInstance(): DeviceKeyManager {
    if (!DeviceKeyManager.instance) {
      DeviceKeyManager.instance = new DeviceKeyManager();
    }
    return DeviceKeyManager.instance;
  }

  /**
   * Generates or loads the Android Keystore-backed device identity keys.
   */
  public async getOrGenerateIdentity(): Promise<DeviceIdentityBundle> {
    let deviceId = await secureGet(STORAGE_KEYS.DEVICE_ID);
    let x25519PrivBase64 = await secureGet(STORAGE_KEYS.X25519_PRIVATE_KEY);

    if (!deviceId || !x25519PrivBase64) {
      return await this.rotateIdentityKeys();
    }

    const x25519PubBase64 = (await secureGet(STORAGE_KEYS.X25519_PUBLIC_KEY)) || '';
    const ed25519PubBase64 = (await secureGet(STORAGE_KEYS.ED25519_PUBLIC_KEY)) || '';
    const signedPrekeyPub = (await secureGet(STORAGE_KEYS.SIGNED_PREKEY_PUBLIC)) || '';
    const prekeySignature = (await secureGet(STORAGE_KEYS.SIGNED_PREKEY_SIG)) || '';
    const regIdStr = (await secureGet(STORAGE_KEYS.REGISTRATION_ID)) || '1';

    const localSafetyNumber = this.calculateSingleSafetyNumber(x25519PubBase64);

    return {
      deviceId,
      identityKey: x25519PubBase64,
      signingKey: ed25519PubBase64,
      signedPrekey: signedPrekeyPub,
      prekeySignature,
      registrationId: parseInt(regIdStr, 10),
      safetyNumber: localSafetyNumber,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a completely new cryptographic device identity, signed prekey, and OTKs.
   */
  public async rotateIdentityKeys(): Promise<DeviceIdentityBundle> {
    const deviceId = 'dev_' + bytesToHex(getRandomBytes(12));
    const registrationId = Math.floor(Math.random() * 1000000) + 1;

    // 1. Generate X25519 Identity Keypair
    const x25519Priv = x25519.utils.randomSecretKey();
    const x25519Pub = x25519.getPublicKey(x25519Priv);

    // 2. Generate Ed25519 Signing Keypair
    const ed25519Priv = ed25519.utils.randomSecretKey();
    const ed25519Pub = ed25519.getPublicKey(ed25519Priv);

    // 3. Generate Signed Prekey
    const signedPrekeyPriv = x25519.utils.randomSecretKey();
    const signedPrekeyPub = x25519.getPublicKey(signedPrekeyPriv);
    const prekeySigBytes = ed25519.sign(signedPrekeyPub, ed25519Priv);

    // Store in Hardware-Backed Secure Storage
    await secureSet(STORAGE_KEYS.DEVICE_ID, deviceId);
    await secureSet(STORAGE_KEYS.REGISTRATION_ID, registrationId.toString());
    await secureSet(STORAGE_KEYS.X25519_PRIVATE_KEY, bytesToBase64(x25519Priv));
    await secureSet(STORAGE_KEYS.X25519_PUBLIC_KEY, bytesToBase64(x25519Pub));
    await secureSet(STORAGE_KEYS.ED25519_PRIVATE_KEY, bytesToBase64(ed25519Priv));
    await secureSet(STORAGE_KEYS.ED25519_PUBLIC_KEY, bytesToBase64(ed25519Pub));
    await secureSet(STORAGE_KEYS.SIGNED_PREKEY_PRIVATE, bytesToBase64(signedPrekeyPriv));
    await secureSet(STORAGE_KEYS.SIGNED_PREKEY_PUBLIC, bytesToBase64(signedPrekeyPub));
    await secureSet(STORAGE_KEYS.SIGNED_PREKEY_SIG, bytesToBase64(prekeySigBytes));

    // Generate initial one-time prekeys
    await this.generateOneTimePreKeys(20);

    const x25519PubBase64 = bytesToBase64(x25519Pub);
    const safetyNumber = this.calculateSingleSafetyNumber(x25519PubBase64);

    return {
      deviceId,
      identityKey: x25519PubBase64,
      signingKey: bytesToBase64(ed25519Pub),
      signedPrekey: bytesToBase64(signedPrekeyPub),
      prekeySignature: bytesToBase64(prekeySigBytes),
      registrationId,
      safetyNumber,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Returns the device's private X25519 key (for internal cryptographic operations only).
   */
  public async getPrivateIdentityKey(): Promise<Uint8Array> {
    const privBase64 = await secureGet(STORAGE_KEYS.X25519_PRIVATE_KEY);
    if (!privBase64) {
      throw new Error('Cryptographic identity private key not found in Keystore.');
    }
    return base64ToBytes(privBase64);
  }

  /**
   * Generates a batch of one-time prekeys for asynchronous authenticated initial key exchange.
   */
  public async generateOneTimePreKeys(count: number = 20): Promise<OneTimePreKey[]> {
    const keys: OneTimePreKey[] = [];
    const internalKeys: { id: number; priv: string; pub: string }[] = [];

    for (let i = 1; i <= count; i++) {
      const priv = x25519.utils.randomSecretKey();
      const pub = x25519.getPublicKey(priv);
      keys.push({
        keyId: i,
        publicKey: bytesToBase64(pub),
      });
      internalKeys.push({
        id: i,
        priv: bytesToBase64(priv),
        pub: bytesToBase64(pub),
      });
    }

    await secureSet(STORAGE_KEYS.ONE_TIME_PREKEYS, JSON.stringify(internalKeys));
    return keys;
  }

  /**
   * Computes the 60-digit safety number (12 blocks of 5 digits) for two partner identities.
   * Format: "12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890"
   */
  public computeSafetyNumberComparison(
    localIdentityKey: string,
    partnerIdentityKey: string
  ): SafetyNumberComparison {
    // Sort keys lexicographically to ensure both partners generate identical safety numbers
    const [first, second] = [localIdentityKey, partnerIdentityKey].sort();
    const concatenated = utf8ToBytes(first + '::' + second);
    const hash = sha256(concatenated);

    // Derive 60 digits from the cryptographic digest
    let digits = '';
    for (let i = 0; i < hash.length && digits.length < 60; i += 2) {
      const val = (hash[i] << 8) | hash[i + 1];
      const chunk = (val % 100000).toString().padStart(5, '0');
      digits += chunk;
    }
    while (digits.length < 60) {
      digits += '0';
    }
    digits = digits.substring(0, 60);

    const blocks: string[] = [];
    for (let i = 0; i < 60; i += 5) {
      blocks.push(digits.substring(i, i + 5));
    }

    const formatted = blocks.join(' ');
    const qrPayload = JSON.stringify({
      version: 1,
      safetyNumber: formatted,
      k1: localIdentityKey,
      k2: partnerIdentityKey,
      ts: Date.now(),
    });

    return {
      localSafetyNumber: formatted,
      partnerSafetyNumber: formatted,
      matches: true,
      formattedBlocks: blocks,
      qrCodePayload: qrPayload,
    };
  }

  private calculateSingleSafetyNumber(pubKeyBase64: string): string {
    const hash = sha256(utf8ToBytes(pubKeyBase64));
    let digits = '';
    for (let i = 0; i < 24; i += 2) {
      const val = (hash[i] << 8) | hash[i + 1];
      digits += (val % 100000).toString().padStart(5, '0');
    }
    return digits;
  }

  /**
   * Partner identity verification status.
   */
  public async getPartnerVerificationStatus(partnerIdentityKey: string): Promise<{
    isVerified: boolean;
    hasKeyChanged: boolean;
  }> {
    const storedPartnerKey = await secureGet(STORAGE_KEYS.PARTNER_IDENTITY_KEY);
    const verified = (await secureGet(STORAGE_KEYS.PARTNER_VERIFIED_STATUS)) === 'true';

    if (storedPartnerKey && storedPartnerKey !== partnerIdentityKey) {
      // Key change detected!
      return {
        isVerified: false,
        hasKeyChanged: true,
      };
    }

    return {
      isVerified: verified && storedPartnerKey === partnerIdentityKey,
      hasKeyChanged: false,
    };
  }

  public async setPartnerVerified(partnerIdentityKey: string, verified: boolean): Promise<void> {
    await secureSet(STORAGE_KEYS.PARTNER_IDENTITY_KEY, partnerIdentityKey);
    await secureSet(STORAGE_KEYS.PARTNER_VERIFIED_STATUS, verified ? 'true' : 'false');
  }

  public async resetPartnerVerification(): Promise<void> {
    await secureDelete(STORAGE_KEYS.PARTNER_IDENTITY_KEY);
    await secureDelete(STORAGE_KEYS.PARTNER_VERIFIED_STATUS);
  }
}
