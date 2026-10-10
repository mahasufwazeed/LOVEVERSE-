import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ProfileLabel } from '../../types';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, loginAsUser, isLoading } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProfileLabel>('him');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Please provide an email address and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    const res = await signUp(email.trim(), password, displayName.trim(), selectedRole);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      if (res.requiresEmailConfirmation) {
        Alert.alert(
          'Check your email ✉️',
          'Your account was created. Confirm your email address, then sign in to continue.'
        );
      }
      // If session is already created (or local fallback succeeded), index.tsx will automatically transition to pairing!
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
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          </View>
        ) : null}

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
          placeholder="e.g. Alex, Emma, Darling"
          value={displayName}
          onChangeText={(val) => {
            setDisplayName(val);
            if (errorMessage) setErrorMessage(null);
          }}
        />

        {/* Him & Her Role Selector */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>Select Profile Role</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleChip,
                selectedRole === 'him' && styles.roleChipActiveHim,
              ]}
              onPress={() => setSelectedRole('him')}
            >
              <Text style={styles.roleChipText}>❤️ Him</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleChip,
                selectedRole === 'her' && styles.roleChipActiveHer,
              ]}
              onPress={() => setSelectedRole('her')}
            >
              <Text style={styles.roleChipText}>💖 Her</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleChip,
                selectedRole === 'partner' && styles.roleChipActive,
              ]}
              onPress={() => setSelectedRole('partner')}
            >
              <Text style={styles.roleChipText}>💕 Partner</Text>
            </TouchableOpacity>
          </View>
        </View>

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
          label="Password (6+ chars)"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errorMessage) setErrorMessage(null);
          }}
        />

        <Button
          title="Create Account ✨"
          loading={isLoading}
          disabled={!isSupabaseConfigured}
          onPress={handleSignUp}
          style={{ marginTop: Spacing.md }}
        />

        {/* Quick Demo Access */}
        <View style={styles.demoSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR TRY QUICK DEMO</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="❤️ Sign In as Alex (Him)"
            variant="secondary"
            size="sm"
            onPress={() => loginAsUser('him')}
            style={{ marginTop: Spacing.xs }}
          />

          <Button
            title="💖 Sign In as Emma (Her)"
            variant="outline"
            size="sm"
            onPress={() => loginAsUser('her')}
            style={{ marginTop: Spacing.xs }}
          />
        </View>

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
  roleContainer: {
    marginBottom: Spacing.md,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  roleChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleChipActiveHim: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  roleChipActiveHer: {
    borderColor: '#E83E8C',
    backgroundColor: '#FFE6F0',
  },
  roleChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  demoSection: {
    marginTop: Spacing.md,
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
