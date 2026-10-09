import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import { SharedMemory } from '../../types';

export default function UsScreen() {
  const { profile, signOut, updateProfile } = useAuthStore();
  const { couple, partner, disconnect } = useCoupleStore();

  const [anniversary, setAnniversary] = useState(
    profile?.anniversaryDate || '2024-02-14'
  );
  const [memories, setMemories] = useState<SharedMemory[]>([
    {
      id: '1',
      coupleId: couple?.id || 'default',
      creatorId: profile?.id || 'me',
      title: 'The Day We Met ❤️',
      description: 'The unforgettable day when everything in our lives changed forever.',
      memoryDate: '2024-02-14',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      coupleId: couple?.id || 'default',
      creatorId: profile?.id || 'me',
      title: 'Our First Roadtrip 🚗',
      description: 'Singing songs with the windows down under the starry evening sky.',
      memoryDate: '2024-06-21',
      createdAt: new Date().toISOString(),
    },
  ]);

  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  // Days Together Calculation
  const calculateDaysTogether = () => {
    try {
      const start = new Date(anniversary).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - start);
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return days;
    } catch {
      return 0;
    }
  };

  const daysTogether = calculateDaysTogether();

  const handleAddMemory = () => {
    if (!newTitle.trim()) return;
    const item: SharedMemory = {
      id: 'mem-' + Date.now(),
      coupleId: couple?.id || '',
      creatorId: profile?.id || '',
      title: newTitle.trim(),
      description: newDesc.trim(),
      memoryDate: newDate,
      createdAt: new Date().toISOString(),
    };
    setMemories([item, ...memories]);
    setNewTitle('');
    setNewDesc('');
    setIsMemoryModalOpen(false);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Partner',
      'Are you sure you want to disconnect from your partner space? You can always create or join a new space later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnect();
            Alert.alert('Disconnected', 'You have left the couple space.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Our Story 💕</Text>
        <Text style={styles.headerSub}>Celebrate our journey and shared memories</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Days Together Hero Card */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroSub}>WE HAVE BEEN TOGETHER FOR</Text>
          <Text style={styles.heroDays}>{daysTogether}</Text>
          <Text style={styles.heroUnit}>DAYS OF LOVE</Text>
          <View style={styles.heroDivider} />
          <Text style={styles.heroAnniversary}>Since {anniversary}</Text>
        </Card>

        {/* Couple Partner Cards */}
        <Text style={styles.sectionTitle}>Couple Partners</Text>
        <View style={styles.partnerCardsRow}>
          {/* My Card */}
          <Card style={styles.profileCard}>
            <Text style={styles.avatarEmoji}>🧑🏻‍🦰</Text>
            <Text style={styles.profileName}>{profile?.displayName || 'You'}</Text>
            <Badge label="You" variant="primary" style={{ marginTop: 4 }} />
          </Card>

          {/* Partner Card */}
          <Card style={styles.profileCard}>
            <Text style={styles.avatarEmoji}>🧑🏽</Text>
            <Text style={styles.profileName}>{partner?.displayName || 'Partner'}</Text>
            <Badge
              label={partner ? 'Connected ❤️' : 'Waiting...'}
              variant={partner ? 'lavender' : 'gold'}
              style={{ marginTop: 4 }}
            />
          </Card>
        </View>

        {/* Relationship Stats */}
        <Text style={styles.sectionTitle}>Love Milestones & Affection</Text>
        <View style={styles.statsGrid}>
          <Card variant="soft" style={styles.statCard}>
            <Text style={styles.statNumber}>142</Text>
            <Text style={styles.statLabel}>Hugs Given 🫂</Text>
          </Card>
          <Card variant="soft" style={styles.statCard}>
            <Text style={styles.statNumber}>89</Text>
            <Text style={styles.statLabel}>Kisses Shared 💋</Text>
          </Card>
          <Card variant="soft" style={styles.statCard}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Games Played 🎮</Text>
          </Card>
          <Card variant="soft" style={styles.statCard}>
            <Text style={styles.statNumber}>16</Text>
            <Text style={styles.statLabel}>Movie Nights 🍿</Text>
          </Card>
        </View>

        {/* Shared Memories Timeline */}
        <View style={styles.memoriesHeader}>
          <Text style={styles.sectionTitle}>Shared Memories</Text>
          <Button
            title="+ Add Memory"
            size="sm"
            variant="outline"
            onPress={() => setIsMemoryModalOpen(true)}
          />
        </View>

        {memories.map((mem) => (
          <Card key={mem.id} style={styles.memoryCard}>
            <View style={styles.memoryHeader}>
              <Text style={styles.memoryTitle}>{mem.title}</Text>
              <Text style={styles.memoryDate}>{mem.memoryDate}</Text>
            </View>
            {mem.description ? (
              <Text style={styles.memoryDesc}>{mem.description}</Text>
            ) : null}
          </Card>
        ))}

        {/* Space Settings & Account Actions */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Space & Account Settings</Text>
        <Card style={styles.settingsCard}>
          {couple && (
            <Button
              title="Disconnect Partner 💔"
              variant="outline"
              style={{ marginBottom: Spacing.sm }}
              textStyle={{ color: Colors.danger }}
              onPress={handleDisconnect}
            />
          )}
          <Button
            title="Sign Out of LoveVerse"
            variant="ghost"
            onPress={signOut}
          />
        </Card>
      </ScrollView>

      {/* Add Memory Modal */}
      <Modal visible={isMemoryModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add a Shared Memory ❤️</Text>
            <TextInput
              placeholder="Memory Title (e.g. Our First Kiss)"
              placeholderTextColor={Colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Memory Date (YYYY-MM-DD)"
              placeholderTextColor={Colors.textMuted}
              value={newDate}
              onChangeText={setNewDate}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Description or feelings..."
              placeholderTextColor={Colors.textMuted}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 80 }]}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.sm }}>
              <Button
                title="Cancel"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setIsMemoryModalOpen(false)}
              />
              <Button
                title="Save Memory"
                style={{ flex: 1 }}
                onPress={handleAddMemory}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
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
  heroCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: '#FFF0F5',
    borderWidth: 1.5,
    borderColor: '#FFD6E5',
  },
  heroSub: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  heroDays: {
    fontSize: 56,
    fontWeight: '900',
    color: Colors.deepPurple,
    marginVertical: Spacing.xs,
  },
  heroUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
    letterSpacing: 1,
  },
  heroDivider: {
    width: 48,
    height: 2,
    backgroundColor: Colors.primarySoft,
    marginVertical: Spacing.sm,
  },
  heroAnniversary: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: 4,
  },
  partnerCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  profileCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  avatarEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.deepPurple,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  memoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  memoryCard: {
    marginVertical: Spacing.xs,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  memoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },
  memoryDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  memoryDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  settingsCard: {
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
});
