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

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, loginAsUser, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    const res = await signIn(email.trim(), password);
    if (res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>❤️</Text>
        <Text style={styles.title}>LoveVerse</Text>
        <Text style={styles.subtitle}>Our Little World, Just for Two.</Text>
      </View>

      <View style={styles.form}>
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          </View>
        ) : null}

        <Input
          label="Email Address"
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (errorMessage) setErrorMessage(null);
          }}
        />

        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errorMessage) setErrorMessage(null);
          }}
        />

        <Button
          title="Sign In to LoveVerse ❤️"
          loading={isLoading}
          onPress={handleSignIn}
          style={{ marginTop: Spacing.md }}
        />

        {/* Quick Demo Pairing Access */}
        <View style={styles.demoSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR QUICK SIGN IN</Text>
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.demoSubtitle}>
            Select a test account to experience the Him & Her Unique ID pairing flow instantly:
          </Text>

          <Button
            title="❤️ Sign In as Alex (Him — LV-A7K92MP4TX)"
            variant="secondary"
            onPress={() => loginAsUser('him')}
            style={{ marginTop: Spacing.xs }}
          />

          <Button
            title="💖 Sign In as Emma (Her — LV-M4R81X92PL)"
            variant="outline"
            onPress={() => loginAsUser('her')}
            style={{ marginTop: Spacing.sm }}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to LoveVerse? </Text>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Create Account</Text>
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
    paddingTop: 60,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorBanner: {
    backgroundColor: '#FFF2F5',
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    color: '#C2185B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  demoSection: {
    marginTop: Spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EBEBEB',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginHorizontal: Spacing.sm,
  },
  demoSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
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
