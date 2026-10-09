import { create } from 'zustand';
import { AppLockManager } from '../lib/crypto/AppLockManager';

interface PrivacySettings {
  hidePreviews: boolean;
  hideOnlineStatus: boolean;
  disableReadReceipts: boolean;
  disableTypingIndicators: boolean;
  autoDownloadMedia: boolean;
}

interface AppLockState {
  isLocked: boolean;
  isConfigured: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  autoLockDelaySeconds: number;
  lastActiveTimestamp: number;
  remainingAttempts: number;
  lockoutRemainingSeconds: number;
  privacySettings: PrivacySettings;

  // Actions
  initializeLock: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  unlockWithBiometric: () => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setAutoLockDelay: (seconds: number) => Promise<void>;
  lockNow: () => void;
  recordActivity: () => void;
  checkInactivityTimeout: () => void;
  updatePrivacySetting: <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => void;
}

const appLock = AppLockManager.getInstance();

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isLocked: false,
  isConfigured: false,
  isBiometricAvailable: false,
  isBiometricEnabled: false,
  autoLockDelaySeconds: 0,
  lastActiveTimestamp: Date.now(),
  remainingAttempts: 5,
  lockoutRemainingSeconds: 0,
  privacySettings: {
    hidePreviews: false,
    hideOnlineStatus: false,
    disableReadReceipts: false,
    disableTypingIndicators: false,
    autoDownloadMedia: true,
  },

  initializeLock: async () => {
    const config = await appLock.getAppLockConfig();
    const bioAvail = await appLock.isBiometricAvailable();

    set({
      isConfigured: config.isPinSet,
      isBiometricAvailable: bioAvail,
      isBiometricEnabled: config.isBiometricEnabled,
      autoLockDelaySeconds: config.autoLockDelaySeconds,
      isLocked: config.isPinSet, // Lock upon initial launch if PIN is configured
      lastActiveTimestamp: Date.now(),
    });
  },

  unlockWithPin: async (pin: string) => {
    const res = await appLock.verifyPin(pin);
    if (res.success) {
      set({
        isLocked: false,
        remainingAttempts: 5,
        lockoutRemainingSeconds: 0,
        lastActiveTimestamp: Date.now(),
      });
      return { success: true };
    }

    if (res.lockoutDurationSeconds) {
      set({
        lockoutRemainingSeconds: res.lockoutDurationSeconds,
      });
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${res.lockoutDurationSeconds} seconds.`,
      };
    }

    set({
      remainingAttempts: res.remainingAttempts ?? 5,
    });
    return {
      success: false,
      error: `Incorrect PIN. ${res.remainingAttempts ?? 0} attempts remaining.`,
    };
  },

  unlockWithBiometric: async () => {
    const success = await appLock.authenticateBiometric();
    if (success) {
      set({
        isLocked: false,
        lastActiveTimestamp: Date.now(),
      });
    }
    return success;
  },

  setupPin: async (pin: string) => {
    await appLock.setPin(pin);
    set({
      isConfigured: true,
      isLocked: false,
      lastActiveTimestamp: Date.now(),
    });
  },

  removePin: async () => {
    await appLock.disablePin();
    set({
      isConfigured: false,
      isLocked: false,
    });
  },

  setBiometricEnabled: async (enabled: boolean) => {
    await appLock.setBiometricEnabled(enabled);
    set({ isBiometricEnabled: enabled });
  },

  setAutoLockDelay: async (seconds: number) => {
    await appLock.setAutoLockDelay(seconds);
    set({ autoLockDelaySeconds: seconds });
  },

  lockNow: () => {
    if (get().isConfigured) {
      set({ isLocked: true });
    }
  },

  recordActivity: () => {
    set({ lastActiveTimestamp: Date.now() });
  },

  checkInactivityTimeout: () => {
    const { isConfigured, isLocked, autoLockDelaySeconds, lastActiveTimestamp } = get();
    if (!isConfigured || isLocked) return;

    if (autoLockDelaySeconds === 0) {
      // Immediate lock on backgrounding
      set({ isLocked: true });
      return;
    }

    const elapsedSeconds = (Date.now() - lastActiveTimestamp) / 1000;
    if (elapsedSeconds >= autoLockDelaySeconds) {
      set({ isLocked: true });
    }
  },

  updatePrivacySetting: (key, value) => {
    set((s) => ({
      privacySettings: { ...s.privacySettings, [key]: value },
    }));
  },
}));
