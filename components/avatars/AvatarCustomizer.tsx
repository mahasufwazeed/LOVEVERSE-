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
import { AvatarConfig, FacialExpression } from '../../types';
import { Button } from '../ui/Button';

interface AvatarCustomizerProps {
  visible: boolean;
  initialConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  onClose: () => void;
}

const SKIN_TONES = ['#FDDFB2', '#F5C6A5', '#E0A97E', '#C68652', '#8D5524', '#5C3317', '#3B1E08'];
const FACE_SHAPES: AvatarConfig['faceShape'][] = ['round', 'oval', 'square', 'heart'];
const HAIR_STYLES: AvatarConfig['hairStyle'][] = ['short', 'wavy', 'long', 'curly', 'bun', 'spiky', 'bob', 'afro'];
const HAIR_COLORS = ['#1E1E24', '#4A2B11', '#8C3B14', '#D69E2E', '#C53030', '#B83280', '#6B46C1', '#C0C0C0'];
const EYE_COLORS = ['#3E2723', '#2B6CB0', '#2F855A', '#4A5568', '#6B46C1', '#D69E2E'];
const NOSE_TYPES: AvatarConfig['noseType'][] = ['cute', 'button', 'straight'];
const GENDER_OPTIONS: AvatarConfig['genderPresentation'][] = ['feminine', 'masculine', 'neutral'];
const GLASSES_OPTIONS: AvatarConfig['glasses'][] = ['none', 'round', 'square', 'sunglasses'];
const SHIRT_COLORS = ['#FF5C8A', '#6C4AB6', '#3182CE', '#38A169', '#ED8936', '#E53E3E', '#2D3748', '#FFFFFF'];
const PANTS_COLORS = ['#292238', '#4A5568', '#E2E8F0', '#2B6CB0', '#1A202C', '#C53030'];
const EXPRESSIONS: FacialExpression[] = ['happy', 'loving', 'blushing', 'excited', 'laughing', 'shy', 'surprised', 'sad'];

export function AvatarCustomizer({
  visible,
  initialConfig,
  onSave,
  onClose,
}: AvatarCustomizerProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<'face' | 'hair' | 'eyes' | 'clothes' | 'style' | 'mood'>('face');

  const update = (partial: Partial<AvatarConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>✨ Bitmoji-Style Avatar Studio</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Navigation Category Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
            {(['face', 'hair', 'eyes', 'clothes', 'style', 'mood'] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'face'
                    ? '👤 Face'
                    : tab === 'hair'
                    ? '💇 Hair'
                    : tab === 'eyes'
                    ? '👀 Eyes'
                    : tab === 'clothes'
                    ? '👕 Outfit'
                    : tab === 'style'
                    ? '👓 Style'
                    : '🥰 Mood'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* FACE & SKIN */}
            {activeTab === 'face' && (
              <View>
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

                <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Face Shape</Text>
                <View style={styles.optionsGrid}>
                  {FACE_SHAPES.map((shape) => (
                    <Pressable
                      key={shape}
                      onPress={() => update({ faceShape: shape })}
                      style={[
                        styles.chip,
                        config.faceShape === shape && styles.chipSelected,
                      ]}
                    >
                      <Text style={[styles.chipText, config.faceShape === shape && styles.chipTextSelected]}>
                        {shape}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Nose Shape</Text>
                <View style={styles.optionsGrid}>
                  {NOSE_TYPES.map((nose) => (
                    <Pressable
                      key={nose}
                      onPress={() => update({ noseType: nose })}
                      style={[
                        styles.chip,
                        config.noseType === nose && styles.chipSelected,
                      ]}
                    >
                      <Text style={[styles.chipText, config.noseType === nose && styles.chipTextSelected]}>
                        {nose}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* HAIR & STYLES */}
            {activeTab === 'hair' && (
              <View>
                <Text style={styles.sectionTitle}>Hairstyle</Text>
                <View style={styles.optionsGrid}>
                  {HAIR_STYLES.map((st) => (
                    <Pressable
                      key={st}
                      onPress={() => update({ hairStyle: st })}
                      style={[
                        styles.chip,
                        config.hairStyle === st && styles.chipSelected,
                      ]}
                    >
                      <Text style={[styles.chipText, config.hairStyle === st && styles.chipTextSelected]}>
                        {st}
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

            {/* EYES & BROWS */}
            {activeTab === 'eyes' && (
              <View>
                <Text style={styles.sectionTitle}>Iris Eye Color</Text>
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

            {/* CLOTHES & BODY */}
            {activeTab === 'clothes' && (
              <View>
                <Text style={styles.sectionTitle}>Body Representation</Text>
                <View style={styles.optionsGrid}>
                  {GENDER_OPTIONS.map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => update({ genderPresentation: g, bodyType: g })}
                      style={[
                        styles.chip,
                        config.genderPresentation === g && styles.chipSelected,
                      ]}
                    >
                      <Text style={[styles.chipText, config.genderPresentation === g && styles.chipTextSelected]}>
                        {g}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Shirt Color</Text>
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

            {/* GLASSES & ACCESSORIES */}
            {activeTab === 'style' && (
              <View>
                <Text style={styles.sectionTitle}>Eyewear</Text>
                <View style={styles.optionsGrid}>
                  {GLASSES_OPTIONS.map((gl) => (
                    <Pressable
                      key={gl}
                      onPress={() => update({ glasses: gl })}
                      style={[
                        styles.chip,
                        config.glasses === gl && styles.chipSelected,
                      ]}
                    >
                      <Text style={[styles.chipText, config.glasses === gl && styles.chipTextSelected]}>
                        {gl}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* MOOD & EXPRESSION */}
            {activeTab === 'mood' && (
              <View>
                <Text style={styles.sectionTitle}>Facial Expression</Text>
                <View style={styles.optionsGrid}>
                  {EXPRESSIONS.map((expr) => (
                    <Pressable
                      key={expr}
                      onPress={() => update({ expression: expr })}
                      style={[
                        styles.chip,
                        config.expression === expr && styles.chipSelected,
                      ]}
                    >
                      <Text style={[styles.chipText, config.expression === expr && styles.chipTextSelected]}>
                        {expr}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Save Avatar Changes ✨"
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

export const AvatarCreator = AvatarCustomizer;

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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
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
    marginVertical: Spacing.xs,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  tabItemActive: {
    backgroundColor: Colors.primarySoft,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  content: {
    marginVertical: Spacing.md,
    maxHeight: 320,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.xs,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.background,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    marginTop: Spacing.sm,
  },
});
