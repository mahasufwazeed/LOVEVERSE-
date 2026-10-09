import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import { useRouter } from 'expo-router';

export default function PairingScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const { couple, inviteCode, createSpace, joinSpace, setDemoCouple, isLoading } = useCoupleStore();

  const [inputCode, setInputCode] = useState('');

  const handleCreate = async () => {
    const res = await createSpace();
    if (res.error) {
      Alert.alert('Pairing Error', res.error);
    } else if (res.code) {
      Alert.alert(
        'Space Created! 🎉',
        `Your private couple code is ${res.code}. Share it with your partner!`
      );
    }
  };

  const handleJoin = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Missing Code', 'Please enter your partner\'s 6-character invite code.');
      return;
    }
    const res = await joinSpace(inputCode.trim());
    if (res.error) {
      Alert.alert('Pairing Error', res.error);
    } else {
      Alert.alert('Connected! ❤️', 'You and your partner are now connected in LoveVerse!');
      router.replace('/(tabs)/world');
    }
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join our private world on LoveVerse! ❤️ Our couple invite code is: ${inviteCode}`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brandIcon}>💞</Text>
        <Text style={styles.title}>Connect with Your Partner</Text>
        <Text style={styles.subtitle}>
          Create your private little world for two, or enter your partner's invite code.
        </Text>
      </View>

      {/* Option 1: Create Space */}
      <Card style={styles.card}>
        <Text style={styles.cardHeading}>Option A: Create Your Couple Space</Text>
        <Text style={styles.cardDesc}>
          Generate a secret 6-character invite code and send it to your partner.
        </Text>

        {inviteCode ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>YOUR INVITE CODE</Text>
            <Text selectable style={styles.codeText}>{inviteCode}</Text>
            <Button
              title="Share Code with Partner 💌"
              variant="secondary"
              onPress={handleShare}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        ) : (
          <Button
            title="Generate Invite Code ✨"
            loading={isLoading}
            onPress={handleCreate}
          />
        )}
      </Card>

      {/* Option 2: Join Partner */}
      <Card style={styles.card}>
        <Text style={styles.cardHeading}>Option B: Enter Partner's Code</Text>
        <Text style={styles.cardDesc}>
          If your partner already created a space, enter their 6-character code below.
        </Text>

        <TextInput
          placeholder="e.g. A9B2X7"
          placeholderTextColor={Colors.textMuted}
          value={inputCode}
          onChangeText={(t) => setInputCode(t.toUpperCase())}
          autoCapitalize="characters"
          maxLength={8}
          style={styles.input}
        />

        <Button
          title="Join Partner Space ❤️"
          variant="outline"
          loading={isLoading}
          onPress={handleJoin}
        />
      </Card>

      {couple && (
        <Button
          title="Go to Our World 🏡"
          variant="primary"
          style={{ marginTop: Spacing.md }}
          onPress={() => router.replace('/(tabs)/world')}
        />
      )}

      <Button
        title="✨ Demo: Auto-Pair with Virtual Darling 💕"
        variant="secondary"
        style={{ marginTop: Spacing.md }}
        onPress={() => {
          setDemoCouple();
          router.replace('/(tabs)/world');
        }}
      />

      <Button
        title="Sign Out"
        variant="ghost"
        style={{ marginTop: Spacing.sm }}
        onPress={signOut}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 60,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  brandIcon: {
    fontSize: 54,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  codeBox: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.deepPurple,
    letterSpacing: 1.5,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 4,
    marginVertical: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.textDark,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
});
