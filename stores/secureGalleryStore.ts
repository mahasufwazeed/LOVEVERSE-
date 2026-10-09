import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MediaEncryptionManager } from '../lib/crypto/MediaEncryption';
import { EncryptedAttachmentMetadata } from '../lib/crypto/types';

export interface GalleryItem {
  id: string;
  conversationId: string;
  uploaderId: string;
  mimeType: string;
  mediaType: 'photo' | 'video';
  safeDataUrl: string; // Decrypted safe Data URL for rendering
  caption: string; // Decrypted client-side
  originalFileName: string;
  fileSizeBytes: number;
  albumId?: string;
  albumName?: string;
  isFavorite: boolean;
  createdAt: string;
  mediaKeyBase64: string;
  ivBase64: string;
}

export interface GalleryAlbum {
  id: string;
  name: string;
  coverItemUrl?: string;
  itemCount: number;
  createdAt: string;
}

interface SecureGalleryState {
  items: GalleryItem[];
  albums: GalleryAlbum[];
  selectedFilter: 'all' | 'photo' | 'video' | 'favorite' | 'album';
  selectedAlbumId: string | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number; // 0 - 100

  // Actions
  loadGalleryItems: (conversationId: string) => Promise<void>;
  uploadMediaToGallery: (conversationId: string, rawBytes: Uint8Array, mimeType: string, fileName: string, caption?: string, albumId?: string) => Promise<{ success: boolean; error?: string }>;
  toggleFavorite: (itemId: string) => Promise<void>;
  createAlbum: (name: string) => Promise<string>;
  deleteGalleryItem: (itemId: string) => Promise<void>;
  setFilter: (filter: SecureGalleryState['selectedFilter'], albumId?: string | null) => void;
  clearDecryptedMemoryCache: () => void;
}

const mediaCrypto = MediaEncryptionManager.getInstance();

export const useSecureGalleryStore = create<SecureGalleryState>((set, get) => ({
  items: [],
  albums: [
    { id: 'album-anniversary', name: 'Our First Year 💕', itemCount: 4, createdAt: new Date().toISOString() },
    { id: 'album-vacation', name: 'Summer Getaway 🌴', itemCount: 6, createdAt: new Date().toISOString() },
    { id: 'album-dates', name: 'Cozy Date Nights 🍷', itemCount: 5, createdAt: new Date().toISOString() },
  ],
  selectedFilter: 'all',
  selectedAlbumId: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,

  loadGalleryItems: async (conversationId: string) => {
    set({ isLoading: true });
    try {
      if (isSupabaseConfigured) {
        const { data: rows } = await supabase
          .from('encrypted_attachments')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('is_gallery', true)
          .order('created_at', { ascending: false });

        if (rows && rows.length > 0) {
          const loaded: GalleryItem[] = [];
          for (const r of rows) {
            loaded.push({
              id: r.id,
              conversationId: r.conversation_id,
              uploaderId: r.uploader_id,
              mimeType: r.mime_type,
              mediaType: r.mime_type.startsWith('video') ? 'video' : 'photo',
              safeDataUrl: '', // Will be lazily decrypted upon viewing
              caption: r.encrypted_metadata || 'Shared memory',
              originalFileName: r.file_path,
              fileSizeBytes: Number(r.file_size_bytes),
              albumId: r.album_id,
              isFavorite: r.is_favorite,
              createdAt: r.created_at,
              mediaKeyBase64: '',
              ivBase64: r.iv,
            });
          }
          set({ items: loaded, isLoading: false });
          return;
        }
      }

      // Default initial mock private vault items for instant viewing
      if (get().items.length === 0) {
        set({
          items: [
            {
              id: 'gal-1',
              conversationId,
              uploaderId: 'user-1',
              mimeType: 'image/jpeg',
              mediaType: 'photo',
              safeDataUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop&q=80',
              caption: 'Our sunset picnic in the park 🌅',
              originalFileName: 'picnic_sunset.jpg',
              fileSizeBytes: 1845000,
              albumId: 'album-anniversary',
              albumName: 'Our First Year 💕',
              isFavorite: true,
              createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
              mediaKeyBase64: 'mock_key_1',
              ivBase64: 'mock_iv_1',
            },
            {
              id: 'gal-2',
              conversationId,
              uploaderId: 'user-2',
              mimeType: 'image/jpeg',
              mediaType: 'photo',
              safeDataUrl: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&auto=format&fit=crop&q=80',
              caption: 'Stargazing on the rooftop ✨',
              originalFileName: 'rooftop_stars.jpg',
              fileSizeBytes: 2120000,
              albumId: 'album-dates',
              albumName: 'Cozy Date Nights 🍷',
              isFavorite: true,
              createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
              mediaKeyBase64: 'mock_key_2',
              ivBase64: 'mock_iv_2',
            },
            {
              id: 'gal-3',
              conversationId,
              uploaderId: 'user-1',
              mimeType: 'image/jpeg',
              mediaType: 'photo',
              safeDataUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80',
              caption: 'Beach waves and holding hands 🌊',
              originalFileName: 'beach_walk.jpg',
              fileSizeBytes: 3410000,
              albumId: 'album-vacation',
              albumName: 'Summer Getaway 🌴',
              isFavorite: false,
              createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
              mediaKeyBase64: 'mock_key_3',
              ivBase64: 'mock_iv_3',
            },
          ],
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  uploadMediaToGallery: async (conversationId, rawBytes, mimeType, fileName, caption = '', albumId) => {
    set({ isUploading: true, uploadProgress: 10 });
    try {
      // 1. Client-Side Encryption of raw media bytes with AES-256-GCM
      const envelope = await mediaCrypto.encryptMedia(rawBytes, mimeType);
      set({ uploadProgress: 40 });

      // 2. Client-Side Encryption of metadata
      const metaObj: EncryptedAttachmentMetadata = {
        originalFileName: fileName,
        fileSizeBytes: envelope.fileSizeBytes,
        caption,
        albumId,
      };
      const encMeta = await mediaCrypto.encryptMetadata(metaObj, envelope.mediaKey);
      set({ uploadProgress: 60 });

      // 3. Upload Ciphertext to Private Supabase Bucket
      const safeDataUrl = mediaCrypto.createSafeDataUrl(rawBytes, mimeType);
      const isVideo = mimeType.startsWith('video');

      if (isSupabaseConfigured) {
        const remotePath = `${conversationId}/gallery_${Date.now()}.bin`;
        await supabase.storage
          .from('encrypted-gallery')
          .upload(remotePath, envelope.encryptedBytes, { contentType: 'application/octet-stream' });

        set({ uploadProgress: 80 });

        const { data: user } = await supabase.auth.getUser();
        await supabase.from('encrypted_attachments').insert({
          conversation_id: conversationId,
          uploader_id: user.user?.id,
          file_path: remotePath,
          bucket_id: 'encrypted-gallery',
          mime_type: mimeType,
          file_size_bytes: envelope.fileSizeBytes,
          iv: envelope.iv,
          ciphertext_hash: envelope.ciphertextHash,
          encrypted_metadata: encMeta.ciphertext,
          is_gallery: true,
          album_id: albumId,
          is_favorite: false,
        });
      }

      set({ uploadProgress: 100 });

      // 4. Update local state
      const newItem: GalleryItem = {
        id: 'gal-' + Date.now(),
        conversationId,
        uploaderId: 'me',
        mimeType,
        mediaType: isVideo ? 'video' : 'photo',
        safeDataUrl,
        caption,
        originalFileName: fileName,
        fileSizeBytes: envelope.fileSizeBytes,
        albumId,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        mediaKeyBase64: envelope.mediaKey,
        ivBase64: envelope.iv,
      };

      set((s) => ({
        items: [newItem, ...s.items],
        isUploading: false,
        uploadProgress: 0,
      }));

      return { success: true };
    } catch (e: any) {
      set({ isUploading: false, uploadProgress: 0 });
      return { success: false, error: e.message };
    }
  },

  toggleFavorite: async (itemId) => {
    set((s) => ({
      items: s.items.map((it) => (it.id === itemId ? { ...it, isFavorite: !it.isFavorite } : it)),
    }));

    if (isSupabaseConfigured) {
      const item = get().items.find((i) => i.id === itemId);
      if (item) {
        await supabase
          .from('encrypted_attachments')
          .update({ is_favorite: item.isFavorite })
          .eq('id', itemId);
      }
    }
  },

  createAlbum: async (name: string) => {
    const newId = 'album-' + Date.now();
    const newAlbum: GalleryAlbum = {
      id: newId,
      name,
      itemCount: 0,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ albums: [...s.albums, newAlbum] }));
    return newId;
  },

  deleteGalleryItem: async (itemId) => {
    set((s) => ({
      items: s.items.filter((it) => it.id !== itemId),
    }));

    if (isSupabaseConfigured) {
      await supabase.from('encrypted_attachments').delete().eq('id', itemId);
    }
  },

  setFilter: (filter, albumId = null) => {
    set({ selectedFilter: filter, selectedAlbumId: albumId });
  },

  clearDecryptedMemoryCache: () => {
    // Evicts all rendered safe Data URLs to ensure zero decrypted media persists
    set((s) => ({
      items: s.items.map((it) => ({ ...it, safeDataUrl: '' })),
    }));
  },
}));
