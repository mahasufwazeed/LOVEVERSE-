import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { Colors, Radii, Spacing, Shadows } from '../../constants/theme';
import { CoupleAvatarScene } from '../../components/world/CoupleAvatarScene';
import { RoomCreator3D } from '../../components/world/RoomCreator3D';
import { FloatingHearts } from '../../components/ui/FloatingHearts';
import { AvatarCustomizer } from '../../components/avatars/AvatarCustomizer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import { useWorldStore } from '../../stores/worldStore';
import { useRoomStore } from '../../stores/roomStore';
import { CoupleInteraction, FacialExpression } from '../../types';

const ROMANTIC_ACTIONS: { type: CoupleInteraction; label: string; icon: string; expr: FacialExpression }[] = [
  { type: 'hug', label: 'Hug', icon: '❤️', expr: 'loving' },
  { type: 'kiss', label: 'Kiss', icon: '💋', expr: 'blushing' },
  { type: 'cuddle', label: 'Cuddle', icon: '🫂', expr: 'loving' },
  { type: 'hold_hands', label: 'Hold Hands', icon: '👫', expr: 'happy' },
  { type: 'forehead_kiss', label: 'Forehead Kiss', icon: '🥰', expr: 'blushing' },
  { type: 'flying_hearts', label: 'Flying Hearts', icon: '💕', expr: 'excited' },
  { type: 'blow_kiss', label: 'Blow Kiss', icon: '😘', expr: 'loving' },
  { type: 'dance', label: 'Dance', icon: '💃', expr: 'laughing' },
  { type: 'sit_together', label: 'Sit on Sofa', icon: '🛋️', expr: 'happy' },
  { type: 'sleep_beside', label: 'Sleep Beside', icon: '😴', expr: 'loving' },
];

const EXPRESSION_CHIPS: { expr: FacialExpression; label: string; icon: string }[] = [
  { expr: 'happy', label: 'Happy', icon: '😊' },
  { expr: 'loving', label: 'Loving', icon: '🥰' },
  { expr: 'blushing', label: 'Blushing', icon: '☺️' },
  { expr: 'excited', label: 'Excited', icon: '🤩' },
  { expr: 'laughing', label: 'Laughing', icon: '😂' },
  { expr: 'shy', label: 'Shy', icon: '🙈' },
  { expr: 'surprised', label: 'Surprised', icon: '😮' },
  { expr: 'sad', label: 'Sad', icon: '🥺' },
];

export default function WorldScreen() {
  const { profile, updateAvatarConfig } = useAuthStore();
  const { couple, partner } = useCoupleStore();
  const {
    currentInteraction,
    myExpression,
    partnerExpression,
    isHeartsActive,
    setMyExpression,
    triggerInteraction,
    subscribeToWorld,
    unsubscribeFromWorld,
  } = useWorldStore();

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const { loadRoom, subscribeToRoom, unsubscribeFromRoom } = useRoomStore();

  useEffect(() => {
    if (couple?.id && profile?.id) {
      subscribeToWorld(couple.id, profile.id);
      loadRoom(couple.id);
      subscribeToRoom(couple.id, profile.id);
    }
    return () => {
      unsubscribeFromWorld();
      unsubscribeFromRoom();
    };
  }, [couple?.id, profile?.id]);

  const handleInteraction = async (type: CoupleInteraction, expr: FacialExpression) => {
    if (!couple?.id || !profile?.id) {
      Alert.alert('Not Paired', 'Please connect with your partner first to share interactions.');
      return;
    }
    await triggerInteraction(couple.id, profile.id, type, expr);
  };

  return (
    <View style={styles.container}>
      <FloatingHearts active={isHeartsActive} count={18} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Our World 🏡</Text>
            <Text style={styles.headerSubtitle}>
              {partner ? `Together with ${partner.displayName}` : 'Your 3D Bitmoji couple sanctuary'}
            </Text>
          </View>
          <Badge label={partner ? 'Connected ❤️' : 'Solo Space'} variant={partner ? 'primary' : 'lavender'} />
        </View>

        {/* Advanced 3D Virtual Room Creator & Avatar Engine */}
        <Card style={styles.canvasCard}>
          <RoomCreator3D />
        </Card>

        {/* 10 Coordinated Couple Interactions Grid */}
        <Text style={styles.sectionTitle}>Couple Romantic Interactions</Text>
        <View style={styles.actionsGrid}>
          {ROMANTIC_ACTIONS.map((act) => (
            <Pressable
              key={act.type}
              disabled={!couple?.id}
              onPress={() => handleInteraction(act.type, act.expr)}
              style={({ pressed }) => [
                styles.actionChip,
                currentInteraction === act.type && styles.actionChipActive,
                pressed && { transform: [{ scale: 0.95 }] },
                !couple?.id && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.actionIcon}>{act.icon}</Text>
              <Text style={[styles.actionLabel, currentInteraction === act.type && styles.actionLabelActive]}>
                {act.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Facial Expression Switcher */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>My Avatar Expression</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expressionsScroll}>
          {EXPRESSION_CHIPS.map((chip) => (
            <Pressable
              key={chip.expr}
              onPress={() => setMyExpression(chip.expr)}
              style={[
                styles.exprChip,
                myExpression === chip.expr && styles.exprChipActive,
              ]}
            >
              <Text style={styles.exprIcon}>{chip.icon}</Text>
              <Text style={[styles.exprLabel, myExpression === chip.expr && styles.exprLabelActive]}>
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 3D Avatar Customizer Card */}
        <Card style={styles.avatarCard}>
          <View style={styles.avatarCardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.avatarCardTitle}>Bitmoji-Style 3D Avatar</Text>
              <Text style={styles.avatarCardSub}>
                Customize face shapes, hairstyles, outfits, glasses & expressions in real-time.
              </Text>
            </View>
            <Button
              title="Studio ✨"
              size="sm"
              variant="outline"
              onPress={() => setIsCustomizerOpen(true)}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Bitmoji-Style Avatar Customizer Studio Modal */}
      {profile && (
        <AvatarCustomizer
          visible={isCustomizerOpen}
          initialConfig={profile.avatarConfig}
          onSave={updateAvatarConfig}
          onClose={() => setIsCustomizerOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl + 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textDark,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  canvasCard: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#FFF6FA',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    marginLeft: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: Spacing.xs,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  actionChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  actionLabelActive: {
    color: Colors.primary,
  },
  expressionsScroll: {
    marginVertical: Spacing.xs,
  },
  exprChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exprChipActive: {
    backgroundColor: '#F3E8FF',
    borderColor: Colors.lavender,
  },
  exprIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  exprLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
  exprLabelActive: {
    color: Colors.deepPurple,
  },
  avatarCard: {
    marginTop: Spacing.md,
  },
  avatarCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  avatarCardSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 3,
    marginRight: Spacing.sm,
    lineHeight: 16,
  },
});
