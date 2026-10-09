import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { AvatarConfig, AvatarStickerDef, CoupleInteraction } from '../../types';

interface AvatarStickerGeneratorProps {
  visible: boolean;
  myConfig?: AvatarConfig;
  partnerConfig?: AvatarConfig;
  onSelectSticker: (sticker: AvatarStickerDef) => void;
  onClose: () => void;
}

import { COUPLE_STICKERS } from '../../constants/stickers';
export { COUPLE_STICKERS };

export function AvatarStickerGenerator({
  visible,
  myConfig,
  partnerConfig,
  onSelectSticker,
  onClose,
}: AvatarStickerGeneratorProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Bitmoji Couple Stickers ✨</Text>
              <Text style={styles.subtitle}>Send animated cards starring both your 3D avatars</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollGrid} contentContainerStyle={styles.gridContent}>
            {COUPLE_STICKERS.map((stk) => (
              <Pressable
                key={stk.id}
                onPress={() => {
                  onSelectSticker(stk);
                  onClose();
                }}
                style={[styles.stickerCard, { backgroundColor: stk.bgGradient[0] }]}
              >
                <View style={styles.avatarPreviewMock}>
                  <Text style={styles.stickerEmoji}>{stk.badge}</Text>
                  <View style={styles.coupleAvatarsRow}>
                    <Text style={{ fontSize: 26 }}>🧑🏻‍❤️‍🧑🏽</Text>
                  </View>
                </View>

                <View style={styles.stickerInfo}>
                  <Text style={styles.stickerTitle}>{stk.title}</Text>
                  <Text style={styles.stickerDesc} numberOfLines={2}>
                    {stk.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  closeText: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  scrollGrid: {
    maxHeight: 400,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: Spacing.xl,
  },
  stickerCard: {
    width: '48%',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  avatarPreviewMock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
  },
  stickerEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  coupleAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stickerInfo: {
    marginTop: Spacing.xs,
  },
  stickerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textDark,
  },
  stickerDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
});
