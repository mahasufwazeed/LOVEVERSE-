import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { Colors, Radii, Spacing, Shadows } from '../../constants/theme';
import { AvatarConfig } from '../../types';
import { Button } from '../ui/Button';

interface AvatarCustomizerModalProps {
  visible: boolean;
  initialConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  onClose: () => void;
}

const SKIN_TONES = ['#FDDFB2', '#F5C6A5', '#E0A97E', '#C68652', '#8D5524', '#4B2810'];
const HAIR_STYLES: AvatarConfig['hairStyle'][] = ['short', 'wavy', 'long', 'curly', 'bun', 'spiky'];
const HAIR_COLORS = ['#1E1E24', '#4A2B11', '#8C3B14', '#D69E2E', '#E53E3E', '#805AD5'];
const EYE_COLORS = ['#3E2723', '#2B6CB0', '#2F855A', '#4A5568', '#6B46C1'];
const SHIRT_COLORS = ['#FF5C8A', '#6C4AB6', '#3182CE', '#38A169', '#ED8936', '#2D3748'];
const PANTS_COLORS = ['#292238', '#4A5568', '#E2E8F0', '#2B6CB0', '#1A202C'];

export function AvatarCustomizerModal({
  visible,
  initialConfig,
  onSave,
  onClose,
}: AvatarCustomizerModalProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<'skin' | 'hair' | 'eyes' | 'clothes'>('hair');

  const update = (partial: Partial<AvatarConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>✨ Customize Your 3D Avatar</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Navigation Category Tabs */}
          <View style={styles.tabBar}>
            {(['skin', 'hair', 'eyes', 'clothes'] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab === 'skin' ? '🎨 Skin' : tab === 'hair' ? '💇 Hair' : tab === 'eyes' ? '👀 Eyes' : '👕 Clothes'}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={styles.content}>
            {activeTab === 'skin' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skin Tone</Text>
                <View style={styles.paletteRow}>
                  {SKIN_TONES.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => update({ skinColor: color })}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        config.skinColor === color && styles.swatchSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'hair' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hairstyle</Text>
                <View style={styles.optionsGrid}>
                  {HAIR_STYLES.map((style) => (
                    <Pressable
                      key={style}
                      onPress={() => update({ hairStyle: style })}
                      style={[
                        styles.styleChip,
                        config.hairStyle === style && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          config.hairStyle === style && styles.chipTextSelected,
                        ]}
                      >
                        {style}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Hair Color</Text>
                <View style={styles.paletteRow}>
                  {HAIR_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => update({ hairColor: color })}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        config.hairColor === color && styles.swatchSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'eyes' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Eye Color</Text>
                <View style={styles.paletteRow}>
                  {EYE_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => update({ eyeColor: color })}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        config.eyeColor === color && styles.swatchSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'clothes' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shirt Color</Text>
                <View style={styles.paletteRow}>
                  {SHIRT_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => update({ shirtColor: color })}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        config.shirtColor === color && styles.swatchSelected,
                      ]}
                    />
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Pants Color</Text>
                <View style={styles.paletteRow}>
                  {PANTS_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => update({ pantsColor: color })}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color },
                        config.pantsColor === color && styles.swatchSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Save Avatar Changes"
              onPress={() => {
                onSave(config);
                onClose();
              }}
            />
          </View>
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
    fontWeight: '700',
    color: Colors.textDark,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  closeText: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radii.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radii.sm,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    ...Shadows.soft,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  content: {
    marginBottom: Spacing.md,
  },
  section: {
    marginVertical: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Shadows.soft,
  },
  swatchSelected: {
    borderColor: Colors.primary,
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.primarySoft,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.deepPurple,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    marginTop: Spacing.sm,
  },
});
