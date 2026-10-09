import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface FloatingHeartsProps {
  active: boolean;
  count?: number;
}

export function FloatingHearts({ active, count = 12 }: FloatingHeartsProps) {
  const animations = useRef(
    Array.from({ length: count }, () => ({
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
      xOffset: Math.random() * 240 - 120,
      size: 20 + Math.floor(Math.random() * 24),
    }))
  ).current;

  useEffect(() => {
    if (!active) return;

    animations.forEach((anim, i) => {
      anim.y.setValue(0);
      anim.opacity.setValue(1);
      anim.scale.setValue(0.5);

      Animated.sequence([
        Animated.delay(i * 90),
        Animated.parallel([
          Animated.timing(anim.y, {
            toValue: -280 - Math.random() * 100,
            duration: 1800 + Math.random() * 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1.4,
            friction: 4,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, [active]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {animations.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.heartItem,
            {
              transform: [
                { translateY: anim.y },
                { translateX: anim.xOffset },
                { scale: anim.scale },
              ],
              opacity: anim.opacity,
            },
          ]}
        >
          <Text style={{ fontSize: anim.size }}>❤️</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  heartItem: {
    position: 'absolute',
  },
});
