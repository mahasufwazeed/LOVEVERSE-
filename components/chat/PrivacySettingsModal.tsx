import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useAppLockStore } from '../../stores/appLockStore';
import { useSecureChatStore } from '../../stores/secureChatStore';

interface PrivacySettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({ visible, onClose }) => {
  const {
    isConfigured,
    isBiometricAvailable,
    isBiometricEnabled,
    autoLockDelaySeconds,
    privacySettings,
    setupPin,
    removePin,
    setBiometricEnabled,
    setAutoLockDelay,
    updatePrivacySetting,
  } = useAppLockStore();

  const { clearLocalChatCache } = useSecureChatStore();

  const [pinInput, setPinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinError, setPinError] = useState('');

  const handleSavePin = async () => {
    if (pinInput.length !== 4) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    await setupPin(pinInput);
    setPinInput('');
    setShowPinSetup(false);
    setPinError('');
  };

  const handleRemovePin = async () => {
    await removePin();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerIcon}>🔒</Text>
              <Text style={styles.headerTitle}>Privacy & Security Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Section 1: App Lock */}
            <Text style={styles.sectionTitle}>App Lock & Biometrics</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>App PIN Lock</Text>
                  <Text style={styles.settingDesc}>
                    {isConfigured ? 'Vault is secured with salted PBKDF2 hash' : 'Require PIN to view chats'}
                  </Text>
                </View>
                {isConfigured ? (
                  <TouchableOpacity onPress={handleRemovePin} style={styles.dangerSmallBtn}>
                    <Text style={styles.dangerSmallBtnText}>Disable</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowPinSetup(true)}
                    style={styles.actionSmallBtn}
                  >
                    <Text style={styles.actionSmallBtnText}>Set PIN</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* In-place PIN Setup Box */}
              {showPinSetup && (
                <View style={styles.pinSetupBox}>
                  <Text style={styles.pinPrompt}>Enter 4-Digit Security PIN:</Text>
                  <TextInput
                    style={styles.pinInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    value={pinInput}
                    onChangeText={setPinInput}
                    placeholder="••••"
                    placeholderTextColor="#718096"
                  />
                  {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}
                  <View style={styles.pinActions}>
                    <TouchableOpacity onPress={handleSavePin} style={styles.pinSaveBtn}>
                      <Text style={styles.pinSaveText}>Save PIN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setShowPinSetup(false);
                        setPinInput('');
                        setPinError('');
                      }}
                      style={styles.pinCancelBtn}
                    >
                      <Text style={styles.pinCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Biometrics Toggle */}
              {isBiometricAvailable && isConfigured && (
                <View style={[styles.settingRow, styles.borderTop]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Android Biometric Unlock</Text>
                    <Text style={styles.settingDesc}>Use fingerprint or face recognition</Text>
                  </View>
                  <Switch
                    value={isBiometricEnabled}
                    onValueChange={setBiometricEnabled}
                    trackColor={{ false: '#2D3748', true: '#FF6B8B' }}
                  />
                </View>
              )}

              {/* Auto-Lock Delay Selector */}
              {isConfigured && (
                <View style={[styles.settingColumn, styles.borderTop]}>
                  <Text style={styles.settingLabel}>Auto-Lock After Inactivity</Text>
                  <View style={styles.delayRow}>
                    {[
                      { label: 'Immediate', val: 0 },
                      { label: '30s', val: 30 },
                      { label: '1m', val: 60 },
                      { label: '5m', val: 300 },
                    ].map((d) => (
                      <TouchableOpacity
                        key={d.val}
                        style={[
                          styles.delayChip,
                          autoLockDelaySeconds === d.val && styles.delayChipActive,
                        ]}
                        onPress={() => setAutoLockDelay(d.val)}
                      >
                        <Text
                          style={[
                            styles.delayChipText,
                            autoLockDelaySeconds === d.val && styles.delayChipTextActive,
                          ]}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Section 2: Privacy Toggles */}
            <Text style={styles.sectionTitle}>Chat & Media Privacy</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Hide Message Previews</Text>
                  <Text style={styles.settingDesc}>Prevent message text in notifications</Text>
                </View>
                <Switch
                  value={privacySettings.hidePreviews}
                  onValueChange={(v) => updatePrivacySetting('hidePreviews', v)}
                  trackColor={{ false: '#2D3748', true: '#FF6B8B' }}
                />
              </View>

              <View style={[styles.settingRow, styles.borderTop]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Hide Online Status</Text>
                  <Text style={styles.settingDesc}>Do not broadcast active presence</Text>
                </View>
                <Switch
                  value={privacySettings.hideOnlineStatus}
                  onValueChange={(v) => updatePrivacySetting('hideOnlineStatus', v)}
                  trackColor={{ false: '#2D3748', true: '#FF6B8B' }}
                />
              </View>

              <View style={[styles.settingRow, styles.borderTop]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Disable Read Receipts</Text>
                  <Text style={styles.settingDesc}>Do not show when you've read messages</Text>
                </View>
                <Switch
                  value={privacySettings.disableReadReceipts}
                  onValueChange={(v) => updatePrivacySetting('disableReadReceipts', v)}
                  trackColor={{ false: '#2D3748', true: '#FF6B8B' }}
                />
              </View>

              <View style={[styles.settingRow, styles.borderTop]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Disable Typing Indicators</Text>
                  <Text style={styles.settingDesc}>Do not show when you are typing</Text>
                </View>
                <Switch
                  value={privacySettings.disableTypingIndicators}
                  onValueChange={(v) => updatePrivacySetting('disableTypingIndicators', v)}
                  trackColor={{ false: '#2D3748', true: '#FF6B8B' }}
                />
              </View>
            </View>

            {/* Section 3: Data Hygiene & Disconnection */}
            <Text style={styles.sectionTitle}>Data Hygiene & Security</Text>

            <View style={styles.settingCard}>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  clearLocalChatCache();
                  onClose();
                }}
              >
                <Text style={styles.actionRowLabel}>🧹 Clear Decrypted RAM Cache</Text>
                <Text style={styles.actionRowSub}>Purges in-memory decrypted messages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRow, styles.borderTop]}
                onPress={() => {
                  onClose();
                }}
              >
                <Text style={[styles.actionRowLabel, { color: '#FF4757' }]}>💔 Disconnect Partner</Text>
                <Text style={styles.actionRowSub}>Revokes couple space access without deleting your account</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#161522',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFE',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFE',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B8B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },
  settingCard: {
    backgroundColor: '#0F0E17',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingColumn: {
    gap: 10,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
    marginTop: 14,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFE',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#A7A9BE',
    lineHeight: 16,
  },
  actionSmallBtn: {
    backgroundColor: '#FF6B8B',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionSmallBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  dangerSmallBtn: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  dangerSmallBtnText: {
    color: '#FF4757',
    fontWeight: '700',
    fontSize: 12,
  },
  pinSetupBox: {
    backgroundColor: '#1C1B2A',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  pinPrompt: {
    color: '#FFFFFE',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  pinInput: {
    backgroundColor: '#0F0E17',
    borderRadius: 8,
    width: 140,
    height: 44,
    textAlign: 'center',
    fontSize: 22,
    color: '#FFFFFE',
    letterSpacing: 8,
    marginBottom: 8,
  },
  pinErrorText: {
    color: '#FF4757',
    fontSize: 12,
    marginBottom: 8,
  },
  pinActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pinSaveBtn: {
    backgroundColor: '#FF6B8B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pinSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  pinCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pinCancelText: {
    color: '#A7A9BE',
    fontSize: 12,
  },
  delayRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  delayChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#1C1B2A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  delayChipActive: {
    borderColor: '#FF6B8B',
    backgroundColor: 'rgba(255, 107, 139, 0.15)',
  },
  delayChipText: {
    fontSize: 12,
    color: '#A7A9BE',
    fontWeight: '600',
  },
  delayChipTextActive: {
    color: '#FF6B8B',
  },
  actionRow: {
    paddingVertical: 4,
  },
  actionRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFE',
    marginBottom: 2,
  },
  actionRowSub: {
    fontSize: 12,
    color: '#A7A9BE',
  },
});
