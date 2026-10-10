import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { RoomCreator3D } from '../../components/world/RoomCreator3D';
import { UnrealRenderLauncher } from '../../components/world/UnrealRenderLauncher';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { REALISTIC_3D_ACTIONS, RENDER3D_ENGINE_FEATURES } from '../../lib/render3d';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import { useRoomStore } from '../../stores/roomStore';
import { useWorldStore } from '../../stores/worldStore';

export default function Render3DScreen() {
  const { profile } = useAuthStore();
  const { couple, partner } = useCoupleStore();
  const { loadRoom, subscribeToRoom, unsubscribeFromRoom } = useRoomStore();
  const {
    currentInteraction,
    triggerInteraction,
    subscribeToWorld,
    unsubscribeFromWorld,
  } = useWorldStore();

  useEffect(() => {
    const coupleId = couple?.id || 'demo-space';
    const userId = profile?.id || 'local-user';

    loadRoom(coupleId);
    subscribeToWorld(coupleId, userId);
    subscribeToRoom(coupleId, userId);

    return () => {
      unsubscribeFromWorld();
      unsubscribeFromRoom();
    };
  }, [couple?.id, profile?.id]);

  const playAction = async (actionIndex: number) => {
    const action = REALISTIC_3D_ACTIONS[actionIndex];
    await triggerInteraction(
      couple?.id || 'demo-space',
      profile?.id || 'local-user',
      action.type,
      action.expression
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>LoveVerse Render Engine</Text>
            <Text style={styles.title}>Real 3D Couple World</Text>
            <Text style={styles.subtitle}>
              {partner
                ? `Live synced 3D room with ${partner.displayName}`
                : 'Preview the complete 3D room, avatars, and realistic couple actions.'}
            </Text>
          </View>
          <Badge label={currentInteraction === 'idle' ? 'Live 3D' : `Playing ${currentInteraction}`} variant="primary" />
        </View>

        <View style={styles.stageShell}>
          <RoomCreator3D />
        </View>

        <Card style={styles.actionsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Realistic 3D Actions</Text>
            <Badge label={`${REALISTIC_3D_ACTIONS.length} actions`} variant="lavender" />
          </View>

          <View style={styles.actionGrid}>
            {REALISTIC_3D_ACTIONS.map((action, index) => {
              const isActive = currentInteraction === action.type;
              return (
                <Pressable
                  key={action.type}
                  accessibilityRole="button"
                  accessibilityLabel={action.title}
                  onPress={() => playAction(index)}
                  style={({ pressed }) => [
                    styles.actionTile,
                    isActive && styles.actionTileActive,
                    pressed && styles.actionTilePressed,
                  ]}
                >
                  <Text style={[styles.actionTitle, isActive && styles.actionTitleActive]}>
                    {action.title}
                  </Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <UnrealRenderLauncher coupleId={couple?.id} userId={profile?.id} />

        <Card>
          <Text style={styles.sectionTitle}>Engine Stack</Text>
          <View style={styles.featureList}>
            {RENDER3D_ENGINE_FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  title: {
    color: Colors.textDark,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  stageShell: {
    overflow: 'hidden',
    borderRadius: Radii.lg,
    backgroundColor: '#FFF6FA',
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  actionsCard: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textDark,
    fontSize: 16,
    fontWeight: '900',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionTile: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
    borderRadius: Radii.md,
    borderWidth: 1,
    minWidth: 145,
    padding: Spacing.md,
    flex: 1,
  },
  actionTileActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  actionTilePressed: {
    transform: [{ scale: 0.98 }],
  },
  actionTitle: {
    color: Colors.textDark,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  actionTitleActive: {
    color: Colors.primary,
  },
  actionDescription: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  featureList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  featureDot: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 8,
    width: 8,
  },
  featureText: {
    color: Colors.textDark,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
