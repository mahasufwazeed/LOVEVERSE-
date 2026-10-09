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
  const { signIn, loginAsDemo, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    const res = await signIn(email.trim(), password);
    if (res.error) {
      Alert.alert('Sign In Failed', res.error);
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
        <Input
          label="Email Address"
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          title="Sign In to LoveVerse ❤️"
          loading={isLoading}
          onPress={handleSignIn}
          style={{ marginTop: Spacing.md }}
        />

        <Button
          title="✨ Explore Demo Space (Instant Access)"
          variant="secondary"
          onPress={() => loginAsDemo()}
          style={{ marginTop: Spacing.sm }}
        />

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
    paddingTop: 80,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
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
