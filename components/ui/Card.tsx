import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'soft';
}

export function Card({ children, style, variant = 'elevated' }: CardProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'outlined':
        return styles.outlined;
      case 'soft':
        return styles.soft;
      case 'elevated':
      default:
        return styles.elevated;
    }
  };

  return <View style={[styles.card, getVariantStyle(), style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  elevated: {
    ...Shadows.card,
    borderWidth: 1,
    borderColor: '#FFF0F5',
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  soft: {
    backgroundColor: Colors.primarySoft,
  },
});
