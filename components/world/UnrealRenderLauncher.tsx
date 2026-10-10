import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { buildUnrealSessionUrl, isUnrealStreamingConfigured } from '../../lib/unreal';

interface UnrealRenderLauncherProps {
  coupleId?: string | null;
  userId?: string | null;
}

export function UnrealRenderLauncher({ coupleId, userId }: UnrealRenderLauncherProps) {
  const openUnrealWorld = async () => {
    const sessionUrl = buildUnrealSessionUrl({ coupleId, userId });

    if (!sessionUrl) {
      Alert.alert(
        'Unreal world not connected',
        'Add EXPO_PUBLIC_UNREAL_PIXEL_STREAMING_URL in your environment to connect LoveVerse with your Unreal Pixel Streaming build.'
      );
      return;
    }

    const supported = await Linking.canOpenURL(sessionUrl);
    if (!supported) {
      Alert.alert('Cannot open Unreal world', 'The configured Unreal streaming URL is not available on this device.');
      return;
    }

    await Linking.openURL(sessionUrl);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Unreal 3D Render</Text>
          <Text style={styles.subtitle}>
            Open the high-fidelity LoveVerse world through Unreal Pixel Streaming.
          </Text>
        </View>
        <Badge
          label={isUnrealStreamingConfigured ? 'Ready' : 'Setup'}
          variant={isUnrealStreamingConfigured ? 'primary' : 'lavender'}
        />
      </View>

      <View style={styles.previewPanel}>
        <Text style={styles.previewTitle}>UE Room Target</Text>
        <Text style={styles.previewCopy}>
          Couple room, avatars, hug and kiss actions can be mirrored in Unreal using the
          coupleId and userId query parameters.
        </Text>
      </View>

      <Button
        title={isUnrealStreamingConfigured ? 'Open Unreal World' : 'Connect Unreal URL'}
        onPress={openUnrealWorld}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    color: Colors.textDark,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  previewPanel: {
    backgroundColor: '#1F1B2E',
    borderRadius: Radii.md,
    marginVertical: Spacing.md,
    padding: Spacing.md,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  previewCopy: {
    color: '#E9D8FD',
    fontSize: 12,
    lineHeight: 17,
  },
});
