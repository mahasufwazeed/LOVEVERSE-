import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import { useWatchStore, DRIFT_TOLERANCE_SECONDS } from '../../stores/watchStore';

const PRESET_VIDEOS = [
  {
    title: 'Animated Nature Story',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    title: 'Elephant Dream (Creative Commons)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    title: 'Sintel Fantasy Film',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  },
];

const REACTION_EMOJIS = ['🍿', '❤️', '😂', '🥺', '🎉'];

export default function WatchScreen() {
  const { profile } = useAuthStore();
  const { couple, partner } = useCoupleStore();
  const {
    videoUrl,
    setVideoUrl,
    broadcastPlayback,
    subscribeToWatch,
    unsubscribeFromWatch,
  } = useWatchStore();

  const [inputUrl, setInputUrl] = useState(videoUrl);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  // Initialize expo-video player
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  const remoteSyncInProgress = useRef(false);
  const loadedUrlRef = useRef(videoUrl);

  useEffect(() => {
    if (!couple?.id || !profile?.id) return;

    subscribeToWatch(couple.id, profile.id, (isPlaying, targetTime, newUrl) => {
      remoteSyncInProgress.current = true;

      if (newUrl && newUrl !== loadedUrlRef.current) {
        loadedUrlRef.current = newUrl;
        player.replace(newUrl);
      }

      // Check drift tolerance
      const currentPos = player.currentTime;
      const drift = Math.abs(currentPos - targetTime);

      if (drift > DRIFT_TOLERANCE_SECONDS) {
        player.currentTime = targetTime;
      }

      if (isPlaying) {
        player.play();
      } else {
        player.pause();
      }

      setTimeout(() => {
        remoteSyncInProgress.current = false;
      }, 400);
    });

    return () => unsubscribeFromWatch();
  }, [couple?.id, profile?.id, player]);

  const handlePlayBoth = () => {
    player.play();
    if (couple?.id && profile?.id) {
      broadcastPlayback(true, player.currentTime, videoUrl, profile.id);
    }
  };

  const handlePauseBoth = () => {
    player.pause();
    if (couple?.id && profile?.id) {
      broadcastPlayback(false, player.currentTime, videoUrl, profile.id);
    }
  };

  const handleSeekSync = (forwardSeconds: number) => {
    const newPos = Math.max(0, player.currentTime + forwardSeconds);
    player.currentTime = newPos;
    if (couple?.id && profile?.id) {
      broadcastPlayback(player.playing, newPos, videoUrl, profile.id);
    }
  };

  const handleLoadCustomUrl = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed.startsWith('https://') || !trimmed.includes('.mp4')) {
      Alert.alert(
        'Invalid Video URL',
        'Please enter an authorized, direct HTTPS MP4 video link (e.g., https://...video.mp4).'
      );
      return;
    }

    setVideoUrl(trimmed);
    player.replace(trimmed);
    if (couple?.id && profile?.id) {
      broadcastPlayback(false, 0, trimmed, profile.id);
    }
  };

  const handleSelectPreset = (url: string) => {
    setInputUrl(url);
    setVideoUrl(url);
    player.replace(url);
    if (couple?.id && profile?.id) {
      broadcastPlayback(false, 0, url, profile.id);
    }
  };

  const triggerReaction = (emoji: string) => {
    setActiveReaction(emoji);
    setTimeout(() => setActiveReaction(null), 1800);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Watch Together 🍿</Text>
          <Text style={styles.headerSub}>
            {partner ? `Synchronized theater with ${partner.displayName}` : 'Couple Co-Watch Room'}
          </Text>
        </View>
        <Badge label={player.playing ? 'Playing ▶' : 'Paused ⏸'} variant={player.playing ? 'success' : 'lavender'} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Synchronized Video Player */}
        <Card style={styles.playerCard}>
          <VideoView
            player={player}
            style={styles.videoView}
            nativeControls={true}
            allowsFullscreen={true}
          />

          {/* Floating Reaction Overlay */}
          {activeReaction && (
            <View pointerEvents="none" style={styles.reactionOverlay}>
              <Text style={styles.bigReactionEmoji}>{activeReaction}</Text>
            </View>
          )}

          {/* Synchronized Control Toolbar */}
          <View style={styles.controlsRow}>
            <Button
              title="⏪ -15s"
              size="sm"
              variant="outline"
              onPress={() => handleSeekSync(-15)}
            />
            {player.playing ? (
              <Button
                title="⏸ Pause for Both"
                variant="primary"
                onPress={handlePauseBoth}
                style={{ flex: 1, marginHorizontal: 8 }}
              />
            ) : (
              <Button
                title="▶ Play for Both"
                variant="primary"
                onPress={handlePlayBoth}
                style={{ flex: 1, marginHorizontal: 8 }}
              />
            )}
            <Button
              title="+15s ⏩"
              size="sm"
              variant="outline"
              onPress={() => handleSeekSync(15)}
            />
          </View>
        </Card>

        {/* Live Theater Reaction Chips */}
        <Text style={styles.sectionTitle}>Send Live Theater Reaction</Text>
        <View style={styles.reactionChipsRow}>
          {REACTION_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => triggerReaction(emoji)}
              style={styles.reactionChip}
            >
              <Text style={styles.reactionChipEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        {/* Load Media URL Card */}
        <Card style={styles.urlCard}>
          <Text style={styles.cardHeading}>Load Custom Media Stream</Text>
          <Text style={styles.cardSub}>
            Enter an authorized direct HTTPS MP4 link to stream together with frame-accurate sync.
          </Text>
          <TextInput
            placeholder="https://example.com/movie.mp4"
            placeholderTextColor={Colors.textMuted}
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            style={styles.urlInput}
          />
          <Button title="Load & Sync to Room 🔄" onPress={handleLoadCustomUrl} />
        </Card>

        {/* Preset Videos */}
        <Text style={styles.sectionTitle}>Curated Media Library</Text>
        {PRESET_VIDEOS.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => handleSelectPreset(item.url)}
            style={styles.presetItem}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.presetTitle}>{item.title}</Text>
              <Text style={styles.presetUrl} numberOfLines={1}>{item.url}</Text>
            </View>
            <Text style={styles.presetPlayIcon}>▶</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textDark,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl + 40,
  },
  playerCard: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#111116',
    borderRadius: Radii.xl,
  },
  videoView: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
  },
  reactionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  bigReactionEmoji: {
    fontSize: 72,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: 4,
  },
  reactionChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    ...Shadows.soft,
  },
  reactionChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radii.full,
    backgroundColor: Colors.background,
  },
  reactionChipEmoji: {
    fontSize: 24,
  },
  urlCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  urlInput: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.sm + 4,
    fontSize: 13,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  presetUrl: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  presetPlayIcon: {
    fontSize: 16,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
});
