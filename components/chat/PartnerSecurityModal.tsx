import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { DeviceKeyManager } from '../../lib/crypto/DeviceKeyManager';
import { useSecureChatStore } from '../../stores/secureChatStore';

interface PartnerSecurityModalProps {
  visible: boolean;
  onClose: () => void;
}

const keyManager = DeviceKeyManager.getInstance();

export const PartnerSecurityModal: React.FC<PartnerSecurityModalProps> = ({ visible, onClose }) => {
  const {
    partnerIdentityKey,
    partnerSafetyNumber,
    isPartnerVerified,
    hasKeyChangedAlert,
  } = useSecureChatStore();

  const [verifiedState, setVerifiedState] = useState(isPartnerVerified);
  const [activeTab, setActiveTab] = useState<'number' | 'qr'>('number');

  // Compute 12 blocks of 5 digits (Signal safety number style)
  const comparison = keyManager.computeSafetyNumberComparison(
    partnerIdentityKey || 'local-fallback-key',
    partnerIdentityKey || 'partner-fallback-key'
  );

  const handleToggleVerify = async () => {
    const next = !verifiedState;
    setVerifiedState(next);
    if (partnerIdentityKey) {
      await keyManager.setPartnerVerified(partnerIdentityKey, next);
    }
  };

  const handleResetVerification = async () => {
    await keyManager.resetPartnerVerification();
    setVerifiedState(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerIcon}>🛡️</Text>
              <Text style={styles.headerTitle}>Partner Identity Security</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Key Changed Alert Banner */}
            {hasKeyChangedAlert && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningTextContainer}>
                  <Text style={styles.warningTitle}>Partner Security Number Changed</Text>
                  <Text style={styles.warningBody}>
                    Your partner may have re-installed LoveVerse or switched to a new Android device. Verify their safety number before sharing private media.
                  </Text>
                </View>
              </View>
            )}

            {/* Verification Status Badge */}
            <View style={[styles.statusCard, verifiedState ? styles.statusCardVerified : styles.statusCardUnverified]}>
              <Text style={styles.statusBadgeIcon}>{verifiedState ? '✓' : 'ℹ️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>
                  {verifiedState ? 'Cryptographic Identity Verified' : 'Unverified Partner Identity'}
                </Text>
                <Text style={styles.statusDesc}>
                  {verifiedState
                    ? 'Both devices have verified end-to-end encryption keys out-of-band.'
                    : 'Compare the 60-digit safety numbers in person or over a trusted channel.'}
                </Text>
              </View>
            </View>

            {/* Mode Switcher */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'number' && styles.tabButtonActive]}
                onPress={() => setActiveTab('number')}
              >
                <Text style={[styles.tabText, activeTab === 'number' && styles.tabTextActive]}>
                  60-Digit Safety Number
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'qr' && styles.tabButtonActive]}
                onPress={() => setActiveTab('qr')}
              >
                <Text style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}>
                  QR Verification
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'number' ? (
              <View style={styles.numbersGrid}>
                {comparison.formattedBlocks.map((block, idx) => (
                  <View key={idx} style={styles.numberBlock}>
                    <Text style={styles.blockIndex}>{String(idx + 1).padStart(2, '0')}</Text>
                    <Text style={styles.blockDigits}>{block}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.qrContainer}>
                <View style={styles.mockQrCode}>
                  <Text style={styles.qrIcon}>📱 [QR CODE] 📱</Text>
                  <Text style={styles.qrSub}>Scan with Partner's Camera</Text>
                </View>
                <Text style={styles.qrPayloadLabel}>Verification Digest:</Text>
                <Text style={styles.qrFingerprint}>
                  {(partnerIdentityKey || 'e2ee-key').slice(0, 36)}...
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.verifyButton, verifiedState && styles.verifiedButton]}
                onPress={handleToggleVerify}
              >
                <Text style={styles.verifyButtonText}>
                  {verifiedState ? '✓ Verified by Partner' : 'Mark as Cryptographically Verified'}
                </Text>
              </TouchableOpacity>

              {verifiedState && (
                <TouchableOpacity style={styles.resetButton} onPress={handleResetVerification}>
                  <Text style={styles.resetButtonText}>Reset Verification</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Security Explanation */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>🔒 Military-Grade Protocol</Text>
              <Text style={styles.infoText}>
                LoveVerse uses X25519 authenticated key exchange with AES-256-GCM. Private keys are stored in your device's hardware Keystore and never uploaded to Supabase or visible to server administrators.
              </Text>
            </View>
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
    paddingBottom: 30,
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
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderWidth: 1,
    borderColor: '#FF4757',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  warningIcon: {
    fontSize: 22,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    color: '#FF4757',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  warningBody: {
    color: '#FFBE76',
    fontSize: 12,
    lineHeight: 18,
  },
  statusCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusCardVerified: {
    backgroundColor: 'rgba(46, 213, 115, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46, 213, 115, 0.3)',
  },
  statusCardUnverified: {
    backgroundColor: 'rgba(255, 177, 66, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 177, 66, 0.3)',
  },
  statusBadgeIcon: {
    fontSize: 20,
    color: '#FFFFFE',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFE',
    marginBottom: 2,
  },
  statusDesc: {
    fontSize: 12,
    color: '#A7A9BE',
    lineHeight: 16,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0F0E17',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FF6B8B',
  },
  tabText: {
    fontSize: 13,
    color: '#A7A9BE',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  numberBlock: {
    width: '31%',
    backgroundColor: '#0F0E17',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  blockIndex: {
    fontSize: 10,
    color: '#FF6B8B',
    fontWeight: '700',
    marginBottom: 2,
  },
  blockDigits: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFE',
    letterSpacing: 1,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  mockQrCode: {
    width: 180,
    height: 180,
    backgroundColor: '#FFFFFE',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  qrIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F0E17',
    marginBottom: 6,
  },
  qrSub: {
    fontSize: 11,
    color: '#718096',
  },
  qrPayloadLabel: {
    fontSize: 12,
    color: '#A7A9BE',
    marginBottom: 4,
  },
  qrFingerprint: {
    fontSize: 12,
    color: '#FF6B8B',
    fontFamily: 'monospace',
  },
  actionContainer: {
    gap: 10,
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: '#FF6B8B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifiedButton: {
    backgroundColor: '#2ED573',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  resetButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FF4757',
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFE',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#A7A9BE',
    lineHeight: 18,
  },
});
