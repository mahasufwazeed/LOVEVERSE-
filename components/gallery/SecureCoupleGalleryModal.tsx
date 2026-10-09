import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSecureGalleryStore, GalleryItem } from '../../stores/secureGalleryStore';
import { utf8ToBytes } from '../../lib/crypto/utils';

interface SecureCoupleGalleryModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
}

export const SecureCoupleGalleryModal: React.FC<SecureCoupleGalleryModalProps> = ({
  visible,
  onClose,
  conversationId,
}) => {
  const {
    items,
    albums,
    selectedFilter,
    selectedAlbumId,
    isLoading,
    isUploading,
    uploadProgress,
    loadGalleryItems,
    uploadMediaToGallery,
    toggleFavorite,
    deleteGalleryItem,
    setFilter,
    clearDecryptedMemoryCache,
  } = useSecureGalleryStore();

  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');

  // Load items when modal opens
  React.useEffect(() => {
    if (visible && conversationId) {
      loadGalleryItems(conversationId);
    }
  }, [visible, conversationId]);

  // Filter items
  const filteredItems = items.filter((it) => {
    if (selectedFilter === 'photo') return it.mediaType === 'photo';
    if (selectedFilter === 'video') return it.mediaType === 'video';
    if (selectedFilter === 'favorite') return it.isFavorite;
    if (selectedFilter === 'album' && selectedAlbumId) return it.albumId === selectedAlbumId;
    return true;
  });

  const handleSimulateAddPhoto = async () => {
    // Generates a sample encrypted couple photo with client-side AES-256-GCM
    const mockPhotoBytes = utf8ToBytes(`PHOTO_IMAGE_BYTES_${Date.now()}`);
    await uploadMediaToGallery(
      conversationId,
      mockPhotoBytes,
      'image/jpeg',
      `memory_${Date.now()}.jpg`,
      newCaption || 'Our special memory ❤️',
      selectedAlbumId || undefined
    );
    setNewCaption('');
    setShowUploadModal(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerIcon}>💎</Text>
            <View>
              <Text style={styles.headerTitle}>Private Couple Vault</Text>
              <Text style={styles.headerSub}>Client-Side Encrypted Media & Albums</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowUploadModal(true)}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
              All ({items.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'photo' && styles.filterChipActive]}
            onPress={() => setFilter('photo')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'photo' && styles.filterChipTextActive]}>
              Photos 📸
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'video' && styles.filterChipActive]}
            onPress={() => setFilter('video')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'video' && styles.filterChipTextActive]}>
              Videos 🎥
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'favorite' && styles.filterChipActive]}
            onPress={() => setFilter('favorite')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'favorite' && styles.filterChipTextActive]}>
              Favorites ⭐
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'album' && styles.filterChipActive]}
            onPress={() => setFilter('album')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'album' && styles.filterChipTextActive]}>
              Albums 📁
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Albums View if Album filter selected */}
        {selectedFilter === 'album' && !selectedAlbumId && (
          <View style={styles.albumsContainer}>
            <Text style={styles.sectionHeader}>Shared Romantic Albums</Text>
            <View style={styles.albumGrid}>
              {albums.map((alb) => (
                <TouchableOpacity
                  key={alb.id}
                  style={styles.albumCard}
                  onPress={() => setFilter('album', alb.id)}
                >
                  <View style={styles.albumIconBox}>
                    <Text style={{ fontSize: 32 }}>📁</Text>
                  </View>
                  <Text style={styles.albumName}>{alb.name}</Text>
                  <Text style={styles.albumCount}>{alb.itemCount} encrypted items</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Gallery Media Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B8B" />
            <Text style={styles.loadingText}>Decrypting private vault...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.gridContent}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔒</Text>
                <Text style={styles.emptyTitle}>Vault Empty</Text>
                <Text style={styles.emptyDesc}>
                  Add photos and videos to encrypt them locally before sharing with your partner.
                </Text>
              </View>
            ) : (
              <View style={styles.mediaGrid}>
                {filteredItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridItem}
                    onPress={() => setSelectedItem(item)}
                    activeOpacity={0.8}
                  >
                    {item.safeDataUrl ? (
                      <Image source={{ uri: item.safeDataUrl }} style={styles.gridImage} />
                    ) : (
                      <View style={styles.placeholderBox}>
                        <Text style={{ fontSize: 28 }}>{item.mediaType === 'video' ? '🎥' : '🖼️'}</Text>
                        <Text style={styles.encryptedTag}>Encrypted</Text>
                      </View>
                    )}
                    {item.isFavorite && (
                      <View style={styles.favBadge}>
                        <Text style={{ fontSize: 12 }}>❤️</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearCacheBtn} onPress={clearDecryptedMemoryCache}>
            <Text style={styles.clearCacheText}>🛡️ Clear Decrypted RAM Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Item Detail / Preview Modal */}
        {selectedItem && (
          <Modal visible={!!selectedItem} transparent animationType="fade">
            <View style={styles.detailOverlay}>
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.detailCloseBtn}>
                  <Text style={styles.detailCloseText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.detailHeaderActions}>
                  <TouchableOpacity
                    onPress={() => toggleFavorite(selectedItem.id)}
                    style={styles.detailFavBtn}
                  >
                    <Text style={{ fontSize: 20 }}>{selectedItem.isFavorite ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      deleteGalleryItem(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    style={styles.detailDeleteBtn}
                  >
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailImageContainer}>
                {selectedItem.safeDataUrl ? (
                  <Image source={{ uri: selectedItem.safeDataUrl }} style={styles.detailImage} resizeMode="contain" />
                ) : (
                  <View style={styles.detailPlaceholder}>
                    <Text style={{ fontSize: 60 }}>🔐</Text>
                    <Text style={styles.detailPlaceholderText}>AES-256-GCM Encrypted</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailFooter}>
                <Text style={styles.detailCaption}>{selectedItem.caption}</Text>
                <Text style={styles.detailDate}>
                  Added {new Date(selectedItem.createdAt).toLocaleDateString()} • {Math.round(selectedItem.fileSizeBytes / 1024)} KB
                </Text>
              </View>
            </View>
          </Modal>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <Modal visible={showUploadModal} transparent animationType="slide">
            <View style={styles.uploadOverlay}>
              <View style={styles.uploadCard}>
                <Text style={styles.uploadTitle}>Add to Private Vault</Text>
                <Text style={styles.uploadDesc}>
                  Media will be encrypted on this device using AES-256-GCM before uploading to private storage.
                </Text>

                <TextInput
                  style={styles.captionInput}
                  placeholder="Add a romantic caption..."
                  placeholderTextColor="#718096"
                  value={newCaption}
                  onChangeText={setNewCaption}
                />

                {isUploading ? (
                  <View style={{ alignItems: 'center', marginVertical: 15 }}>
                    <ActivityIndicator size="small" color="#FF6B8B" />
                    <Text style={{ color: '#FF6B8B', marginTop: 8, fontSize: 13 }}>
                      Encrypting & uploading ({uploadProgress}%)...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.uploadActions}>
                    <TouchableOpacity
                      style={styles.confirmUploadBtn}
                      onPress={handleSimulateAddPhoto}
                    >
                      <Text style={styles.confirmUploadText}>🔒 Encrypt & Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelUploadBtn}
                      onPress={() => setShowUploadModal(false)}
                    >
                      <Text style={styles.cancelUploadText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E17',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 26,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFE',
  },
  headerSub: {
    fontSize: 11,
    color: '#FF6B8B',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addBtn: {
    backgroundColor: '#FF6B8B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFE',
    fontWeight: '700',
    fontSize: 13,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFE',
    fontSize: 14,
  },
  filterScroll: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: '#1C1B2A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255, 107, 139, 0.2)',
    borderColor: '#FF6B8B',
  },
  filterChipText: {
    fontSize: 12,
    color: '#A7A9BE',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FF6B8B',
  },
  albumsContainer: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFE',
    marginBottom: 12,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  albumCard: {
    width: '47%',
    backgroundColor: '#1C1B2A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  albumIconBox: {
    marginBottom: 8,
  },
  albumName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFE',
    marginBottom: 4,
  },
  albumCount: {
    fontSize: 11,
    color: '#A7A9BE',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#A7A9BE',
    fontSize: 13,
  },
  gridContent: {
    padding: 12,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1C1B2A',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1B2A',
  },
  encryptedTag: {
    fontSize: 9,
    color: '#FF6B8B',
    fontWeight: '700',
    marginTop: 4,
  },
  favBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFE',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#A7A9BE',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  clearCacheBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
  },
  clearCacheText: {
    fontSize: 11,
    color: '#A7A9BE',
    fontWeight: '600',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    zIndex: 10,
  },
  detailCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  detailHeaderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailFavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 71, 87, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImage: {
    width: '100%',
    height: '80%',
  },
  detailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailPlaceholderText: {
    color: '#FF6B8B',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  detailFooter: {
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  detailCaption: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  detailDate: {
    fontSize: 12,
    color: '#A7A9BE',
  },
  uploadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  uploadCard: {
    backgroundColor: '#161522',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFE',
    marginBottom: 6,
  },
  uploadDesc: {
    fontSize: 12,
    color: '#A7A9BE',
    lineHeight: 18,
    marginBottom: 16,
  },
  captionInput: {
    backgroundColor: '#0F0E17',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFE',
    fontSize: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  uploadActions: {
    gap: 10,
  },
  confirmUploadBtn: {
    backgroundColor: '#FF6B8B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmUploadText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelUploadBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelUploadText: {
    color: '#A7A9BE',
    fontSize: 13,
  },
});
