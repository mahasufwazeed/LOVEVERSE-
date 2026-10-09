import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Colors, Radii, Spacing } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { useCoupleStore } from '../stores/coupleStore';
import LoginScreen from './(auth)/login';
import PairingScreen from './(onboarding)/pairing';
import TabLayout from './(tabs)/_layout';
import WorldScreen from './(tabs)/world';
import ChatScreen from './(tabs)/chat';
import GamesScreen from './(tabs)/games';
import WatchScreen from './(tabs)/watch';
import UsScreen from './(tabs)/us';
import { Pressable } from 'react-native';

export default function Index() {
  const { session, user, profile, isLoading: isAuthLoading, initialize } = useAuthStore();
  const { couple, loadCouple, isLoading: isCoupleLoading } = useCoupleStore();
  const [activeTab, setActiveTab] = useState<'world' | 'chat' | 'games' | 'watch' | 'us'>('world');

  const pulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initialize();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadCouple(user.id);
    }
  }, [user?.id]);

  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.Text style={[styles.loadingHeart, { transform: [{ scale: pulse }] }]}>
          ❤️
        </Animated.Text>
        <Text style={styles.loadingTitle}>LoveVerse</Text>
        <Text style={styles.loadingSubtitle}>Opening your little world...</Text>
      </View>
    );
  }

  // If user is not authenticated, show Login
  if (!session) {
    return <LoginScreen />;
  }

  // If user is authenticated but not connected to a couple space, show Pairing
  if (!couple) {
    return <PairingScreen />;
  }

  // If authenticated & paired, render the full tabbed LoveVerse experience
  return (
    <View style={styles.webWrapper}>
      <View style={styles.mainContainer}>
        {/* Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'world' && <WorldScreen />}
          {activeTab === 'chat' && <ChatScreen />}
          {activeTab === 'games' && <GamesScreen />}
          {activeTab === 'watch' && <WatchScreen />}
          {activeTab === 'us' && <UsScreen />}
        </View>

        {/* Romantic Bottom Tab Navigation Bar */}
        <View style={styles.tabBar}>
          {[
            { key: 'world', title: 'Our World', icon: '🏡' },
            { key: 'chat', title: 'Chat', icon: '💌' },
            { key: 'games', title: 'Games', icon: '🎮' },
            { key: 'watch', title: 'Watch', icon: '🍿' },
            { key: 'us', title: 'Us', icon: '💕' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={styles.tabBtn}
              >
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                  {tab.icon}
                </Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    backgroundColor: '#FAF5FF',
    width: '100%',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingHeart: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.deepPurple,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    width: '100%',
    maxWidth: 520,
  },
  contentArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
});
