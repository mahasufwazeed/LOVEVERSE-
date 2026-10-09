import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSecureChatStore, DisappearingDuration } from '../../stores/secureChatStore';

interface DisappearingDurationModalProps {
  visible: boolean;
  onClose: () => void;
}

const DURATIONS: Array<{ label: string; value: DisappearingDuration; desc: string }> = [
  { label: 'Off', value: 0, desc: 'Messages remain in chat until manually deleted' },
  { label: '30 Seconds', value: 30, desc: 'Self-destructs 30s after partner reads' },
  { label: '5 Minutes', value: 300, desc: 'Self-destructs 5m after partner reads' },
  { label: '1 Hour', value: 3600, desc: 'Self-destructs 1h after partner reads' },
  { label: '24 Hours', value: 86400, desc: 'Self-destructs 24h after partner reads' },
  { label: '7 Days', value: 604800, desc: 'Self-destructs 7 days after partner reads' },
];

export const DisappearingDurationModal: React.FC<DisappearingDurationModalProps> = ({
  visible,
  onClose,
}) => {
  const { disappearingDuration, setDisappearingDuration } = useSecureChatStore();

  const handleSelect = async (dur: DisappearingDuration) => {
    await setDisappearingDuration(dur);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.clockIcon}>⏳</Text>
              <Text style={styles.title}>Disappearing Messages</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            When enabled, new messages sent in this private chat will automatically delete from both devices after being read.
          </Text>

          <View style={styles.optionsList}>
            {DURATIONS.map((opt) => {
              const isSelected = disappearingDuration === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                  onPress={() => handleSelect(opt.value)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </View>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              ⚠️ Disappearing messages cannot guarantee deletion if recipient captures a screenshot or uses an external camera.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#161522',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockIcon: {
    fontSize: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFE',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFE',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#A7A9BE',
    lineHeight: 18,
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0E17',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionItemSelected: {
    borderColor: '#FF6B8B',
    backgroundColor: 'rgba(255, 107, 139, 0.08)',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFE',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#FF6B8B',
  },
  optionDesc: {
    fontSize: 12,
    color: '#A7A9BE',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#A7A9BE',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioCircleSelected: {
    borderColor: '#FF6B8B',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B8B',
  },
  noticeBox: {
    backgroundColor: 'rgba(255, 177, 66, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  noticeText: {
    fontSize: 11,
    color: '#FFBE76',
    lineHeight: 16,
  },
});
