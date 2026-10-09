import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useAppLockStore } from '../../stores/appLockStore';

export const AppLockOverlay: React.FC = () => {
  const {
    isLocked,
    isBiometricAvailable,
    isBiometricEnabled,
    lockoutRemainingSeconds,
    remainingAttempts,
    unlockWithPin,
    unlockWithBiometric,
  } = useAppLockStore();

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isLocked) return null;

  const handlePressDigit = async (digit: string) => {
    if (lockoutRemainingSeconds > 0) return;
    if (enteredPin.length >= 4) return;

    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setErrorMessage('');

    if (nextPin.length === 4) {
      const res = await unlockWithPin(nextPin);
      if (!res.success) {
        setErrorMessage(res.error || 'Incorrect PIN');
        setEnteredPin('');
      } else {
        setEnteredPin('');
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin((p) => p.slice(0, -1));
    setErrorMessage('');
  };

  return (
    <Modal visible={isLocked} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.shieldIconContainer}>
            <Text style={styles.shieldIcon}>🔐</Text>
          </View>
          <Text style={styles.title}>LoveVerse Vault Locked</Text>
          <Text style={styles.subtitle}>Enter your secure PIN to access private chats & memories</Text>
        </View>

        {/* PIN Indicators */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                enteredPin.length > idx && styles.dotFilled,
                errorMessage ? styles.dotError : null,
              ]}
            />
          ))}
        </View>

        {/* Error / Lockout Message */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : lockoutRemainingSeconds > 0 ? (
          <Text style={styles.errorText}>
            Locked out. Try again in {lockoutRemainingSeconds}s
          </Text>
        ) : (
          <Text style={styles.attemptsText}>
            {remainingAttempts < 5 ? `${remainingAttempts} attempts remaining` : ' '}
          </Text>
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={styles.keyButton}
                  onPress={() => handlePressDigit(d)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.keypadRow}>
            {isBiometricAvailable && isBiometricEnabled ? (
              <TouchableOpacity
                style={styles.keyButtonSpecial}
                onPress={unlockWithBiometric}
                activeOpacity={0.7}
              >
                <Text style={styles.specialKeyIcon}>👆</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.keyButtonEmpty} />
            )}

            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handlePressDigit('0')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keyButtonSpecial}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Text style={styles.specialKeyIcon}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E17',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 35,
  },
  shieldIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 139, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 139, 0.3)',
  },
  shieldIcon: {
    fontSize: 38,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFE',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#A7A9BE',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 20,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#A7A9BE',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#FF6B8B',
    borderColor: '#FF6B8B',
  },
  dotError: {
    borderColor: '#FF4757',
    backgroundColor: '#FF4757',
  },
  errorText: {
    color: '#FF4757',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 25,
    textAlign: 'center',
  },
  attemptsText: {
    color: '#A7A9BE',
    fontSize: 13,
    marginBottom: 25,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1C1B2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFE',
  },
  keyButtonSpecial: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonEmpty: {
    width: 76,
    height: 76,
  },
  specialKeyIcon: {
    fontSize: 24,
    color: '#A7A9BE',
  },
});
