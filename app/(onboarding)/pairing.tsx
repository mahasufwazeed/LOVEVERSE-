import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Share,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import { useRouter } from 'expo-router';
import { ProfileLabel } from '../../types';
import {
  isValidLoveverseId,
  normalizeLoveverseId,
} from '../../services/PartnerConnectionService';
import { buildUnrealSessionUrl } from '../../lib/unreal';

export default function PairingScreen() {
  const router = useRouter();
  const { profile, signOut, setProfileLabel } = useAuthStore();
  const {
    couple,
    partner,
    publicCoupleId,
    incomingRequests,
    outgoingRequests,
    foundPartner,
    isSearching,
    isLoading,
    searchPartner,
    clearFoundPartner,
    sendPartnerRequest,
    acceptPartnerRequest,
    rejectPartnerRequest,
    cancelPartnerRequest,
    fetchRequests,
    subscribeToRequests,
    setDemoCouple,
    disconnect,
  } = useCoupleStore();

  const [inputPartnerId, setInputPartnerId] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const currentUserId = profile?.id || 'demo-user-123';
  const myLoveverseId = profile?.publicLoveverseId || 'LV-7KQ92MP4TX';
  const myProfileLabel: ProfileLabel = profile?.profileLabel || 'partner';

  // Real-time synchronization subscription
  useEffect(() => {
    if (currentUserId) {
      const unsubscribe = subscribeToRequests(currentUserId);
      return () => unsubscribe();
    }
  }, [currentUserId]);

  const handleCopyId = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(myLoveverseId);
      }
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    } catch {
      Alert.alert('LoveVerse ID', `Your ID is:\n${myLoveverseId}`);
    }
  };

  const handleShareId = async () => {
    try {
      await Share.share({
        message: `Connect with me on LoveVerse! ❤️\nMy LoveVerse ID: ${myLoveverseId}\nLet's pair our 3D avatars and build our private world together.`,
      });
    } catch {
      // Ignored
    }
  };

  const handleRoleSelect = async (role: ProfileLabel) => {
    try {
      await setProfileLabel(role);
    } catch (e: any) {
      Alert.alert('Role Update', e.message);
    }
  };

  const handleSearch = async () => {
    const normalized = normalizeLoveverseId(inputPartnerId);
    if (!isValidLoveverseId(normalized)) {
      Alert.alert(
        'Invalid LoveVerse ID',
        'Please enter a valid LoveVerse ID (e.g. LV-M4R81X92PL) with at least 10 characters.'
      );
      return;
    }
    if (normalized === myLoveverseId) {
      Alert.alert('Invalid Search', 'You cannot search for your own LoveVerse ID.');
      return;
    }

    const res = await searchPartner(normalized, currentUserId);
    if (res.error) {
      Alert.alert('Partner Search', res.error);
    }
  };

  const handleSendRequest = async () => {
    if (!foundPartner) return;
    const res = await sendPartnerRequest(currentUserId, foundPartner.publicLoveverseId);
    if (res.error) {
      Alert.alert('Request Failed', res.error);
    } else {
      setActionMessage(`Invitation sent to ${foundPartner.displayName}! ❤️`);
      setTimeout(() => setActionMessage(null), 4000);
      setInputPartnerId('');
      clearFoundPartner();
    }
  };

  const handleAcceptRequest = async (requestId: string, senderName?: string) => {
    const res = await acceptPartnerRequest(currentUserId, requestId);
    if (res.error) {
      Alert.alert('Accept Error', res.error);
    } else {
      Alert.alert(
        'Connected Forever! ❤️',
        `You and ${senderName || 'your partner'} are now officially paired in LoveVerse!\nPrivate Couple ID: ${res.publicCoupleId}`
      );
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const res = await rejectPartnerRequest(currentUserId, requestId);
    if (res.error) {
      Alert.alert('Decline Error', res.error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    const res = await cancelPartnerRequest(currentUserId, requestId);
    if (res.error) {
      Alert.alert('Cancel Error', res.error);
    }
  };

  const handleLaunchUnreal = () => {
    const url = buildUnrealSessionUrl({
      coupleId: couple?.id,
      publicCoupleId: publicCoupleId || couple?.publicCoupleId,
      userId: currentUserId,
      userLoveverseId: myLoveverseId,
      partnerLoveverseId: partner?.publicLoveverseId,
      role: myProfileLabel,
    });

    if (url) {
      Alert.alert(
        'Unreal Engine 5 Session',
        `Authorized Unreal Engine Pixel Streaming Session Ready!\nURL: ${url}`
      );
    } else {
      Alert.alert('Unreal Engine 5', 'Unreal Engine session configured. Entering 3D World.');
    }
    router.replace('/(tabs)/world');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Brand Header */}
      <View style={styles.header}>
        <Text style={styles.brandIcon}>💞</Text>
        <Text style={styles.brandTitle}>LOVEVERSE ❤️</Text>
        <Text style={styles.title}>Connect Your Partner</Text>
        <Text style={styles.subtitle}>
          Pair securely using your permanent unique LoveVerse IDs. Real-time synchronization
          connects your 3D avatars in your shared private home.
        </Text>
      </View>

      {/* Action Toast Notice */}
      {actionMessage && (
        <View style={styles.toastNotice}>
          <Text style={styles.toastText}>{actionMessage}</Text>
        </View>
      )}

      {/* 1. Him & Her Profile Selection */}
      <Card style={styles.card}>
        <Text style={styles.cardHeading}>1. Profile Label Selection</Text>
        <Text style={styles.cardDesc}>
          Select your display label. Both partners enjoy equal permissions and room access.
        </Text>

        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[
              styles.roleChip,
              myProfileLabel === 'him' && styles.roleChipActive,
            ]}
            onPress={() => handleRoleSelect('him')}
          >
            <Text style={styles.roleChipText}>❤️ Him</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleChip,
              myProfileLabel === 'her' && styles.roleChipActiveHer,
            ]}
            onPress={() => handleRoleSelect('her')}
          >
            <Text style={styles.roleChipText}>💖 Her</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleChip,
              myProfileLabel === 'partner' && styles.roleChipActive,
            ]}
            onPress={() => handleRoleSelect('partner')}
          >
            <Text style={styles.roleChipText}>💕 Partner</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 2. My LoveVerse ID Section */}
      <Card style={styles.card}>
        <Text style={styles.cardHeading}>2. Your LoveVerse ID</Text>
        <Text style={styles.cardDesc}>
          Your permanent, cryptographically secure identifier. Share it with your partner so
          they can connect with you.
        </Text>

        <View style={styles.idBox}>
          <Text style={styles.idLabel}>MY LOVEVERSE ID</Text>
          <Text selectable style={styles.idValue}>
            {myLoveverseId}
          </Text>
          {copiedNotice && (
            <Badge label="✓ Copied to Clipboard!" variant="success" style={{ marginTop: 4 }} />
          )}
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="Copy My ID 📋"
            variant="secondary"
            onPress={handleCopyId}
            style={styles.flexButton}
          />
          <View style={{ width: Spacing.sm }} />
          <Button
            title="Share ID 💌"
            variant="outline"
            onPress={handleShareId}
            style={styles.flexButton}
          />
        </View>
      </Card>

      {/* 3. Already Paired Couple Card (If connected) */}
      {couple && (
        <Card style={[styles.card, styles.coupleCard]}>
          <View style={styles.coupleHeaderRow}>
            <Text style={styles.coupleIcon}>💍</Text>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.coupleTitle}>Connected Couple</Text>
              <Text style={styles.coupleStatus}>Status: Active & Synchronized</Text>
            </View>
            <Badge label="PAIRED ❤️" variant="success" />
          </View>

          <View style={styles.coupleDetailsBox}>
            <Text style={styles.coupleIdLabel}>PRIVATE COUPLE ID</Text>
            <Text selectable style={styles.coupleIdValue}>
              {publicCoupleId || couple.publicCoupleId || 'CP-9TX42RK8M2'}
            </Text>

            <View style={styles.partnerInfoRow}>
              <View style={styles.partnerCol}>
                <Text style={styles.avatarMini}>🤵</Text>
                <Text style={styles.partnerName}>{profile?.displayName || 'Alex'}</Text>
                <Text style={styles.partnerRole}>
                  {myProfileLabel === 'him' ? '❤️ Him' : myProfileLabel === 'her' ? '💖 Her' : '💕 Partner'}
                </Text>
              </View>

              <Text style={styles.heartConnector}>❤️</Text>

              <View style={styles.partnerCol}>
                <Text style={styles.avatarMini}>👰</Text>
                <Text style={styles.partnerName}>{partner?.displayName || 'Emma'}</Text>
                <Text style={styles.partnerRole}>
                  {partner?.profileLabel === 'her' ? '💖 Her' : partner?.profileLabel === 'him' ? '❤️ Him' : '💕 Partner'}
                </Text>
              </View>
            </View>
          </View>

          <Button
            title="Enter Our 3D Room 🏡"
            variant="primary"
            style={{ marginTop: Spacing.md }}
            onPress={() => router.replace('/(tabs)/world')}
          />

          <Button
            title="Launch Unreal Engine 5 Session 🎮"
            variant="secondary"
            style={{ marginTop: Spacing.sm }}
            onPress={handleLaunchUnreal}
          />

          <Button
            title="Disconnect Couple"
            variant="ghost"
            style={{ marginTop: Spacing.xs }}
            onPress={() => {
              Alert.alert('Disconnect', 'Are you sure you want to unpair from your partner?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disconnect', style: 'destructive', onPress: disconnect },
              ]);
            }}
          />
        </Card>
      )}

      {/* 4. Find Partner by Unique ID (When not paired) */}
      {!couple && (
        <Card style={styles.card}>
          <Text style={styles.cardHeading}>3. Enter Partner's LoveVerse ID</Text>
          <Text style={styles.cardDesc}>
            Enter the exact ID provided by your partner to find their public profile.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="LV-7KQ92MP4TX"
              placeholderTextColor={Colors.textMuted}
              value={inputPartnerId}
              onChangeText={(text) => {
                setInputPartnerId(text.toUpperCase());
                if (foundPartner) clearFoundPartner();
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={15}
              style={styles.input}
            />
          </View>

          <Button
            title="Find Partner 🔍"
            variant="primary"
            loading={isSearching}
            onPress={handleSearch}
          />

          {/* Partner Preview Card */}
          {foundPartner && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewAvatarCircle}>
                  <Text style={styles.previewAvatarIcon}>
                    {foundPartner.profileLabel === 'her' ? '💖' : '❤️'}
                  </Text>
                </View>
                <View style={styles.previewDetails}>
                  <Text style={styles.previewName}>{foundPartner.displayName}</Text>
                  <Text style={styles.previewId}>{foundPartner.publicLoveverseId}</Text>
                </View>
                <Badge
                  label={
                    foundPartner.profileLabel === 'him'
                      ? 'Him ❤️'
                      : foundPartner.profileLabel === 'her'
                      ? 'Her 💖'
                      : 'Partner 💕'
                  }
                  variant="lavender"
                />
              </View>

              <Text style={styles.safePrivacyNote}>
                🔒 Privacy Protected: No personal email or phone number is disclosed.
              </Text>

              <Button
                title="Send Partner Request ❤️"
                variant="primary"
                loading={isLoading}
                onPress={handleSendRequest}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          )}
        </Card>
      )}

      {/* 5. Incoming Invitations */}
      {incomingRequests.length > 0 && (
        <Card style={[styles.card, styles.invitationsCard]}>
          <Text style={styles.cardHeading}>📬 Incoming Partner Requests</Text>
          <Text style={styles.cardDesc}>
            These users want to connect with you inside LoveVerse!
          </Text>

          {incomingRequests.map((req) => (
            <View key={req.id} style={styles.requestItem}>
              <View style={styles.requestItemHeader}>
                <Text style={styles.requestAvatar}>💌</Text>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.requestSenderName}>
                    {req.sender?.displayName || 'Alex'} wants to connect!
                  </Text>
                  <Text style={styles.requestIdText}>
                    LoveVerse ID: {req.sender?.publicLoveverseId || 'LV-A7K92MP4TX'}
                  </Text>
                  <Text style={styles.requestPrompt}>Would you like to become partners?</Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <Button
                  title="Accept ❤️"
                  variant="primary"
                  size="sm"
                  loading={isLoading}
                  onPress={() => handleAcceptRequest(req.id, req.sender?.displayName)}
                  style={styles.flexButton}
                />
                <View style={{ width: Spacing.sm }} />
                <Button
                  title="Decline"
                  variant="outline"
                  size="sm"
                  onPress={() => handleRejectRequest(req.id)}
                  style={styles.flexButton}
                />
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* 6. Outgoing Pending Requests */}
      {outgoingRequests.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardHeading}>⏳ Outgoing Requests</Text>
          <Text style={styles.cardDesc}>
            Invitations you have sent that are currently waiting for acceptance.
          </Text>

          {outgoingRequests.map((req) => (
            <View key={req.id} style={styles.outgoingItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.outgoingTarget}>
                  Partner: {req.receiver?.displayName || 'Emma'}
                </Text>
                <Text style={styles.outgoingId}>
                  {req.receiver?.publicLoveverseId || 'Pending Partner'}
                </Text>
                <Text style={styles.outgoingStatus}>Status: Waiting for partner to accept...</Text>
              </View>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => handleCancelRequest(req.id)}
              />
            </View>
          ))}
        </Card>
      )}

      {/* 7. Quick Demo Helper */}
      <Card style={styles.card}>
        <Text style={styles.cardHeading}>✨ Quick Demo Pairing</Text>
        <Text style={styles.cardDesc}>
          Instantly simulate a paired couple (Alex & Emma) to explore the 3D room, couple
          animations, and Unreal Engine session.
        </Text>

        <Button
          title="Auto-Pair with Virtual Darling 💕"
          variant="secondary"
          onPress={() => {
            setDemoCouple();
            router.replace('/(tabs)/world');
          }}
        />
      </Card>

      {/* Sign Out */}
      <Button
        title="Sign Out"
        variant="ghost"
        style={{ marginTop: Spacing.md, marginBottom: Spacing.xl }}
        onPress={signOut}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 50,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandIcon: {
    fontSize: 48,
    marginBottom: Spacing.xs,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 3,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 340,
    marginTop: 6,
    lineHeight: 18,
  },
  toastNotice: {
    backgroundColor: '#E6FAF5',
    borderColor: Colors.success,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  toastText: {
    color: Colors.success,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  coupleCard: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#FFF9FB',
  },
  invitationsCard: {
    borderColor: '#E8A598',
    borderWidth: 1.5,
    backgroundColor: '#FFFDF9',
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  roleChipActiveHer: {
    borderColor: '#E83E8C',
    backgroundColor: '#FFE6F0',
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  idBox: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: '#FFD3E2',
  },
  idLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.deepPurple,
    letterSpacing: 1.5,
  },
  idValue: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 2.5,
    marginVertical: Spacing.xs,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: Colors.textDark,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  previewCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarIcon: {
    fontSize: 22,
  },
  previewDetails: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  previewId: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  safePrivacyNote: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  requestItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  requestItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  requestAvatar: {
    fontSize: 28,
  },
  requestSenderName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  requestIdText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  requestPrompt: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  outgoingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: Radii.md,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outgoingTarget: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  outgoingId: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  outgoingStatus: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  coupleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  coupleIcon: {
    fontSize: 32,
  },
  coupleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  coupleStatus: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  coupleDetailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  coupleIdLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  coupleIdValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.deepPurple,
    letterSpacing: 2,
    fontFamily: 'monospace',
    marginVertical: 4,
  },
  partnerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  partnerCol: {
    alignItems: 'center',
  },
  avatarMini: {
    fontSize: 24,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: 2,
  },
  partnerRole: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  heartConnector: {
    fontSize: 20,
  },
});
