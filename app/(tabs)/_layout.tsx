import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="world"
        options={{
          title: 'Our World',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏡</Text>,
        }}
      />
      <Tabs.Screen
        name="render3d"
        options={{
          title: '3D Render',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🎬</Text>,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>💌</Text>,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🎮</Text>,
        }}
      />
      <Tabs.Screen
        name="watch"
        options={{
          title: 'Watch',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🍿</Text>,
        }}
      />
      <Tabs.Screen
        name="us"
        options={{
          title: 'Us',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>💕</Text>,
        }}
      />
    </Tabs>
  );
}
