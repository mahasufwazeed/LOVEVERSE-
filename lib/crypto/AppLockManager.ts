import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  getRandomBytes,
  bytesToBase64,
  base64ToBytes,
  utf8ToBytes,
  constantTimeCompare,
} from './utils';
import { AppLockConfig } from './types';

const STORAGE_KEYS = {
  PIN_SALT: 'loveverse_applock_pin_salt',
  PIN_HASH: 'loveverse_applock_pin_hash',
  BIOMETRIC_ENABLED: 'loveverse_applock_bio_enabled',
  AUTO_LOCK_DELAY: 'loveverse_applock_delay',
  FAILED_ATTEMPTS: 'loveverse_applock_failed_attempts',
  LOCKOUT_TIMESTAMP: 'loveverse_applock_lockout_ts',
};

const memoryStore = new Map<string, string>();

async function secureSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    memoryStore.set(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(key);
    if (val !== null) return val;
    return memoryStore.get(key) || null;
  } catch {
    return memoryStore.get(key) || null;
  }
}

async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore error
  }
  memoryStore.delete(key);
}

export class AppLockManager {
  private static instance: AppLockManager;

  public static getInstance(): AppLockManager {
    if (!AppLockManager.instance) {
      AppLockManager.instance = new AppLockManager();
    }
    return AppLockManager.instance;
  }

  /**
   * Sets or updates the user's PIN using PBKDF2-HMAC-SHA256 with 10,000 rounds and a 32-byte salt.
   */
  public async setPin(pin: string): Promise<void> {
    if (pin.length < 4 || pin.length > 8) {
      throw new Error('PIN must be between 4 and 8 digits.');
    }

    const salt = getRandomBytes(32);
    const hash = pbkdf2(sha256, utf8ToBytes(pin), salt, { c: 10000, dkLen: 32 });

    await secureSet(STORAGE_KEYS.PIN_SALT, bytesToBase64(salt));
    await secureSet(STORAGE_KEYS.PIN_HASH, bytesToBase64(hash));
    await secureSet(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
    await secureDelete(STORAGE_KEYS.LOCKOUT_TIMESTAMP);
  }

  /**
   * Verifies the entered PIN against the salted hash with constant-time comparison.
   */
  public async verifyPin(pin: string): Promise<{
    success: boolean;
    remainingAttempts?: number;
    lockoutDurationSeconds?: number;
  }> {
    const lockoutTsStr = await secureGet(STORAGE_KEYS.LOCKOUT_TIMESTAMP);
    const now = Date.now();

    if (lockoutTsStr) {
      const lockoutTs = parseInt(lockoutTsStr, 10);
      if (now < lockoutTs) {
        const remainingSec = Math.ceil((lockoutTs - now) / 1000);
        return { success: false, lockoutDurationSeconds: remainingSec };
      } else {
        await secureDelete(STORAGE_KEYS.LOCKOUT_TIMESTAMP);
      }
    }

    const saltBase64 = await secureGet(STORAGE_KEYS.PIN_SALT);
    const expectedHashBase64 = await secureGet(STORAGE_KEYS.PIN_HASH);

    if (!saltBase64 || !expectedHashBase64) {
      // No PIN configured
      return { success: true };
    }

    const salt = base64ToBytes(saltBase64);
    const expectedHash = base64ToBytes(expectedHashBase64);
    const computedHash = pbkdf2(sha256, utf8ToBytes(pin), salt, { c: 10000, dkLen: 32 });

    const isValid = constantTimeCompare(computedHash, expectedHash);

    if (isValid) {
      await secureSet(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
      return { success: true };
    }

    // Handle failed attempt & rate-limiting
    const currentFailed = parseInt((await secureGet(STORAGE_KEYS.FAILED_ATTEMPTS)) || '0', 10) + 1;
    await secureSet(STORAGE_KEYS.FAILED_ATTEMPTS, currentFailed.toString());

    if (currentFailed >= 5) {
      const lockoutDuration = Math.min(300, 30 * Math.pow(2, currentFailed - 5)); // 30s, 60s, 120s...
      const lockoutExpiry = now + lockoutDuration * 1000;
      await secureSet(STORAGE_KEYS.LOCKOUT_TIMESTAMP, lockoutExpiry.toString());
      return { success: false, lockoutDurationSeconds: lockoutDuration };
    }

    return {
      success: false,
      remainingAttempts: 5 - currentFailed,
    };
  }

  /**
   * Checks if biometric authentication is available on device.
   */
  public async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }

  /**
   * Prompts the user with Android biometrics (fingerprint / face).
   */
  public async authenticateBiometric(): Promise<boolean> {
    const isAvail = await this.isBiometricAvailable();
    if (!isAvail) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock LoveVerse Private Vault',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Loads the current App Lock configuration.
   */
  public async getAppLockConfig(): Promise<AppLockConfig> {
    const pinHash = await secureGet(STORAGE_KEYS.PIN_HASH);
    const bioEnabled = (await secureGet(STORAGE_KEYS.BIOMETRIC_ENABLED)) === 'true';
    const delayStr = (await secureGet(STORAGE_KEYS.AUTO_LOCK_DELAY)) || '0';
    const failed = parseInt((await secureGet(STORAGE_KEYS.FAILED_ATTEMPTS)) || '0', 10);
    const lockoutStr = await secureGet(STORAGE_KEYS.LOCKOUT_TIMESTAMP);

    return {
      isPinSet: !!pinHash,
      isBiometricEnabled: bioEnabled,
      autoLockDelaySeconds: parseInt(delayStr, 10),
      failedAttempts: failed,
      lockoutUntilTimestamp: lockoutStr ? parseInt(lockoutStr, 10) : null,
    };
  }

  public async setBiometricEnabled(enabled: boolean): Promise<void> {
    await secureSet(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  }

  public async setAutoLockDelay(delaySeconds: number): Promise<void> {
    await secureSet(STORAGE_KEYS.AUTO_LOCK_DELAY, delaySeconds.toString());
  }

  public async disablePin(): Promise<void> {
    await secureDelete(STORAGE_KEYS.PIN_SALT);
    await secureDelete(STORAGE_KEYS.PIN_HASH);
    await secureDelete(STORAGE_KEYS.FAILED_ATTEMPTS);
    await secureDelete(STORAGE_KEYS.LOCKOUT_TIMESTAMP);
  }
}
