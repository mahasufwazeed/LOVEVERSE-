import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated } from 'react-native';
import { utf8ToBytes } from '../../lib/crypto/utils';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (audioBytes: Uint8Array, durationSeconds: number) => Promise<void>;
  disabled?: boolean;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSendVoiceNote,
  disabled,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setSeconds(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    if (disabled) return;
    setIsRecording(true);
  };

  const handleStopAndSend = async () => {
    if (!isRecording) return;
    const dur = Math.max(1, seconds);
    setIsRecording(false);

    // Simulate encrypted voice note raw audio payload (e.g. AAC / M4A stream)
    const mockAudioBytes = utf8ToBytes(`VOICE_AUDIO_RECORDING_${Date.now()}_DURATION_${dur}`);
    await onSendVoiceNote(mockAudioBytes, dur);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <View style={styles.recordingOverlay}>
        <View style={styles.recordingLeft}>
          <Animated.View style={[styles.redDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.recordingTimer}>{formatDuration(seconds)}</Text>
          <View style={styles.waveRow}>
            <View style={[styles.waveBar, { height: 14 }]} />
            <View style={[styles.waveBar, { height: 22 }]} />
            <View style={[styles.waveBar, { height: 10 }]} />
            <View style={[styles.waveBar, { height: 26 }]} />
            <View style={[styles.waveBar, { height: 16 }]} />
          </View>
        </View>

        <View style={styles.recordingRight}>
          <TouchableOpacity onPress={handleCancelRecording} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel ✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleStopAndSend} style={styles.sendVoiceBtn}>
            <Text style={styles.sendVoiceIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.micButton}
      onPress={handleStartRecording}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={styles.micIcon}>🎙️</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1B2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 139, 0.25)',
  },
  micIcon: {
    fontSize: 20,
  },
  recordingOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1B2A',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.4)',
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4757',
  },
  recordingTimer: {
    color: '#FFFFFE',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#FF6B8B',
  },
  recordingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelText: {
    color: '#A7A9BE',
    fontSize: 12,
    fontWeight: '600',
  },
  sendVoiceBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FF6B8B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendVoiceIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 2,
  },
});
