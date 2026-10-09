import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radii, Spacing } from '../../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'lavender' | 'success' | 'gold';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'primary', style }: BadgeProps) {
  const getColors = () => {
    switch (variant) {
      case 'lavender':
        return { bg: '#F2EDFF', text: Colors.deepPurple };
      case 'success':
        return { bg: '#E6FAF5', text: Colors.success };
      case 'gold':
        return { bg: '#FFF8E6', text: '#D48800' };
      case 'primary':
      default:
        return { bg: Colors.primarySoft, text: Colors.primary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
