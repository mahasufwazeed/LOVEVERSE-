import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please provide an email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    const res = await signUp(email.trim(), password, displayName.trim());
    if (res.error) {
      Alert.alert('Registration Failed', res.error);
    } else {
      Alert.alert(
        res.requiresEmailConfirmation ? 'Check your email ✉️' : 'Welcome to LoveVerse! ✨',
        res.requiresEmailConfirmation
          ? 'Your account was created. Confirm your email address, then sign in to continue.'
          : 'Account created successfully. Connect with your partner to start your journey.'
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>✨</Text>
        <Text style={styles.title}>Join LoveVerse</Text>
        <Text style={styles.subtitle}>Begin your shared virtual adventure together.</Text>
      </View>

      <View style={styles.form}>
        {!isSupabaseConfigured ? (
          <View style={styles.configurationNotice}>
            <Text style={styles.configurationTitle}>Account service is not configured</Text>
            <Text style={styles.configurationCopy}>
              Add this app’s real Supabase URL and publishable key to .env, then restart Expo.
            </Text>
          </View>
        ) : null}

        <Input
          label="Your Nickname"
          placeholder="e.g. My Love, Honey, Leo"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Input
          label="Email Address"
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Input
          label="Password (6+ chars)"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          title="Create Account ✨"
          loading={isLoading}
          disabled={!isSupabaseConfigured}
          onPress={handleSignUp}
          style={{ marginTop: Spacing.md }}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>
      </View>
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
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: 52,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.deepPurple,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    borderRadius: Radii.xl,
  },
  configurationNotice: {
    backgroundColor: '#FFF4E5',
    borderColor: '#F59E0B',
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  configurationTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
  },
  configurationCopy: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
