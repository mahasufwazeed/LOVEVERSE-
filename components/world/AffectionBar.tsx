import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { InteractionType } from '../../types';

interface AffectionBarProps {
  onTrigger: (type: InteractionType) => void;
  disabled?: boolean;
}

export function AffectionBar({ onTrigger, disabled }: AffectionBarProps) {
  const actions: { type: InteractionType; icon: string; label: string }[] = [
    { type: 'hug', icon: '🫂', label: 'Hug' },
    { type: 'kiss', icon: '💋', label: 'Kiss' },
    { type: 'wave', icon: '👋', label: 'Wave' },
    { type: 'dance', icon: '💃', label: 'Dance' },
  ];

  return (
    <View style={styles.container}>
      {actions.map((act) => (
        <Pressable
          key={act.type}
          disabled={disabled}
          onPress={() => onTrigger(act.type)}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <Text style={styles.icon}>{act.icon}</Text>
          <Text style={styles.label}>{act.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    ...Shadows.card,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  pressed: {
    transform: [{ scale: 0.9 }],
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 26,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
  },
});
