import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  RoomData,
  RoomObject,
  RoomTemplate,
  FloorMaterial,
  LightingTheme,
  WindowScenery,
} from '../types/room';
import { ROOM_TEMPLATES } from '../constants/roomTemplates';
import { FURNITURE_CATALOG } from '../constants/furnitureCatalog';
import { RoomCollisionEngine } from '../components/world/roomEngine/RoomCollisionEngine';
import { Vector3D } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RoomStoreState {
  room: RoomData;
  selectedObjectId: string | null;
  mode: 'live' | 'edit';
  history: RoomObject[][];
  future: RoomObject[][];
  channel: RealtimeChannel | null;
  isLoading: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  errorMessage: string | null;

  // Actions
  setMode: (mode: 'live' | 'edit') => void;
  selectObject: (id: string | null) => void;
  loadRoom: (coupleId: string) => Promise<void>;
  applyTemplate: (templateId: string) => void;
  addObject: (catalogId: string) => { success: boolean; reason?: string };
  moveObject: (id: string, newPos: Vector3D) => { success: boolean; reason?: string };
  rotateObject: (id: string) => { success: boolean; reason?: string };
  updateObjectColor: (id: string, color: string) => void;
  removeObject: (id: string) => void;
  updateRoomSettings: (settings: {
    wallColor?: string;
    floorMaterial?: FloorMaterial;
    lightingTheme?: LightingTheme;
    windowScenery?: WindowScenery;
  }) => void;
  undo: () => void;
  redo: () => void;
  saveRoom: () => Promise<void>;
  subscribeToRoom: (coupleId: string, myUserId: string) => void;
  unsubscribeFromRoom: () => void;
}

const defaultTemplate = ROOM_TEMPLATES[0];

const initialRoomData: RoomData = {
  id: 'default_room_1',
  coupleId: 'demo_couple',
  name: defaultTemplate.name,
  roomType: defaultTemplate.roomType,
  dimensions: defaultTemplate.dimensions,
  wallColor: defaultTemplate.wallColor,
  floorMaterial: defaultTemplate.floorMaterial,
  lightingTheme: defaultTemplate.lightingTheme,
  windowScenery: defaultTemplate.windowScenery,
  objects: defaultTemplate.defaultObjects.map((obj, i) => ({
    ...obj,
    id: `obj_init_${i + 1}`,
  })),
  revision: 1,
  updatedAt: new Date().toISOString(),
};

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  room: initialRoomData,
  selectedObjectId: null,
  mode: 'live',
  history: [],
  future: [],
  channel: null,
  isLoading: false,
  saveStatus: 'saved',
  errorMessage: null,

  setMode: (mode) => set({ mode, selectedObjectId: mode === 'live' ? null : get().selectedObjectId }),

  selectObject: (id) => set({ selectedObjectId: id }),

  loadRoom: async (coupleId: string) => {
    if (!coupleId) return;

    if (!isSupabaseConfigured) {
      // In demo mode, load default room with couple ID
      set((state) => ({
        room: { ...state.room, coupleId },
        isLoading: false,
      }));
      return;
    }

    try {
      set({ isLoading: true, errorMessage: null });
      const { data: roomRecord, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('couple_id', coupleId)
        .maybeSingle();

      if (roomErr) throw roomErr;

      if (roomRecord) {
        // Fetch room objects
        const { data: objectsData } = await supabase
          .from('room_objects')
          .select('*')
          .eq('room_id', roomRecord.id);

        const loadedObjects: RoomObject[] = (objectsData || []).map((o: any) => ({
          id: o.id,
          catalogId: o.catalog_id,
          position: o.position || { x: 0, y: 0, z: 0 },
          rotationY: o.rotation_y || 0,
          color: o.color || '#FF6B8B',
          scale: o.scale || 1,
          interactionType: o.interaction_type,
          photoUrl: o.photo_url,
        }));

        set({
          room: {
            id: roomRecord.id,
            coupleId: roomRecord.couple_id,
            name: roomRecord.name || 'Our Couple Sanctuary',
            roomType: roomRecord.room_type || 'bedroom',
            dimensions: roomRecord.dimensions || { width: 6, depth: 6, height: 3.2 },
            wallColor: roomRecord.wall_color || '#FDF0ED',
            floorMaterial: roomRecord.floor_material || 'hardwood_oak',
            lightingTheme: roomRecord.lighting_theme || 'warm_sunset',
            windowScenery: roomRecord.window_scenery || 'city_sunset',
            objects: loadedObjects.length > 0 ? loadedObjects : initialRoomData.objects,
            revision: roomRecord.revision || 1,
            updatedAt: roomRecord.updated_at || new Date().toISOString(),
          },
          isLoading: false,
        });
      } else {
        // No room in DB yet, use initial template
        set((state) => ({
          room: { ...state.room, coupleId },
          isLoading: false,
        }));
      }
    } catch (e: any) {
      set({ isLoading: false, errorMessage: e.message });
    }
  },

  applyTemplate: (templateId: string) => {
    const tmpl = ROOM_TEMPLATES.find((t) => t.id === templateId) || ROOM_TEMPLATES[0];
    const { room, history } = get();

    // Push previous to history
    const newHistory = [...history.slice(-25), room.objects];

    const updatedObjects: RoomObject[] = tmpl.defaultObjects.map((obj, i) => ({
      ...obj,
      id: `obj_tmpl_${Date.now()}_${i}`,
    }));

    const updatedRoom: RoomData = {
      ...room,
      name: tmpl.name,
      roomType: tmpl.roomType,
      dimensions: tmpl.dimensions,
      wallColor: tmpl.wallColor,
      floorMaterial: tmpl.floorMaterial,
      lightingTheme: tmpl.lightingTheme,
      windowScenery: tmpl.windowScenery,
      objects: updatedObjects,
      revision: room.revision + 1,
      updatedAt: new Date().toISOString(),
    };

    set({
      room: updatedRoom,
      history: newHistory,
      future: [],
      selectedObjectId: null,
    });

    get().saveRoom();
  },

  addObject: (catalogId: string) => {
    const { room, history } = get();
    const catalogItem = FURNITURE_CATALOG.find((c) => c.catalogId === catalogId);
    if (!catalogItem) return { success: false, reason: 'Item not found in catalog.' };

    // Find first free location in room
    let targetPos: Vector3D = { x: 0, y: 0, z: 0 };
    const step = 0.5;
    let found = false;

    // Search around center
    for (let radius = 0; radius <= 2.5; radius += step) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const testPos: Vector3D = RoomCollisionEngine.clampToRoom(
          { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius },
          catalogId,
          room.dimensions
        );

        const candidate: RoomObject = {
          id: `obj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          catalogId,
          position: testPos,
          rotationY: 0,
          color: catalogItem.defaultColor,
          interactionType: catalogItem.interactionType,
        };

        const validation = RoomCollisionEngine.validatePlacement(candidate, room.objects, room.dimensions);
        if (validation.valid) {
          targetPos = testPos;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    const newItem: RoomObject = {
      id: `obj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      catalogId,
      position: targetPos,
      rotationY: 0,
      color: catalogItem.defaultColor,
      interactionType: catalogItem.interactionType,
    };

    const newHistory = [...history.slice(-25), room.objects];
    const updatedObjects = [...room.objects, newItem];

    set({
      room: {
        ...room,
        objects: updatedObjects,
        revision: room.revision + 1,
        updatedAt: new Date().toISOString(),
      },
      selectedObjectId: newItem.id,
      history: newHistory,
      future: [],
    });

    get().saveRoom();
    return { success: true };
  },

  moveObject: (id: string, newPos: Vector3D) => {
    const { room } = get();
    const item = room.objects.find((o) => o.id === id);
    if (!item) return { success: false, reason: 'Object not found.' };

    const snappedPos = RoomCollisionEngine.clampToRoom(newPos, item.catalogId, room.dimensions);
    const candidate: RoomObject = { ...item, position: snappedPos };

    const validation = RoomCollisionEngine.validatePlacement(candidate, room.objects, room.dimensions);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    const updatedObjects = room.objects.map((o) => (o.id === id ? candidate : o));

    set({
      room: {
        ...room,
        objects: updatedObjects,
        revision: room.revision + 1,
        updatedAt: new Date().toISOString(),
      },
    });

    // Broadcast change
    const channel = get().channel;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'object_moved',
        payload: {
          id,
          position: snappedPos,
          rotationY: item.rotationY,
          revision: room.revision + 1,
        },
      });
    }

    return { success: true };
  },

  rotateObject: (id: string) => {
    const { room, history } = get();
    const item = room.objects.find((o) => o.id === id);
    if (!item) return { success: false, reason: 'Object not found.' };

    const newRot = (item.rotationY + Math.PI / 2) % (Math.PI * 2);
    const candidate: RoomObject = { ...item, rotationY: newRot };

    const validation = RoomCollisionEngine.validatePlacement(candidate, room.objects, room.dimensions);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    const newHistory = [...history.slice(-25), room.objects];
    const updatedObjects = room.objects.map((o) => (o.id === id ? candidate : o));

    set({
      room: {
        ...room,
        objects: updatedObjects,
        revision: room.revision + 1,
        updatedAt: new Date().toISOString(),
      },
      history: newHistory,
      future: [],
    });

    get().saveRoom();
    return { success: true };
  },

  updateObjectColor: (id: string, color: string) => {
    const { room, history } = get();
    const newHistory = [...history.slice(-25), room.objects];
    const updatedObjects = room.objects.map((o) => (o.id === id ? { ...o, color } : o));

    set({
      room: {
        ...room,
        objects: updatedObjects,
        revision: room.revision + 1,
        updatedAt: new Date().toISOString(),
      },
      history: newHistory,
      future: [],
    });

    get().saveRoom();
  },

  removeObject: (id: string) => {
    const { room, history } = get();
    const newHistory = [...history.slice(-25), room.objects];
    const updatedObjects = room.objects.filter((o) => o.id !== id);

    set({
      room: {
        ...room,
        objects: updatedObjects,
        revision: room.revision + 1,
        updatedAt: new Date().toISOString(),
      },
      selectedObjectId: null,
      history: newHistory,
      future: [],
    });

    get().saveRoom();
  },

  updateRoomSettings: (settings) => {
    const { room } = get();
    const updated = {
      ...room,
      ...settings,
      revision: room.revision + 1,
      updatedAt: new Date().toISOString(),
    };

    set({ room: updated });
    get().saveRoom();
  },

  undo: () => {
    const { history, future, room } = get();
    if (history.length === 0) return;

    const previousObjects = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const newFuture = [room.objects, ...future];

    set({
      room: {
        ...room,
        objects: previousObjects,
        revision: room.revision + 1,
        updatedAt: new Date().toISOString(),
      },
      history: newHistory,
      future: newFuture,
      selectedObjectId: null,
    });

    get().saveRoom();
  },

  redo: () => {
    const { history, future, room } = get();
    if (future.length === 0) return;

    const nextObjects = future[0];
    const newFuture = future.slice(1);
    const newHistory = [...history, room.objects];

    set({
      room: {
        ...room,
        objects: nextObjects,
        revision: room.revision + 1,
        updatedAt: new Date().toISOString(),
      },
      history: newHistory,
      future: newFuture,
      selectedObjectId: null,
    });

    get().saveRoom();
  },

  saveRoom: async () => {
    const { room, channel } = get();
    set({ saveStatus: 'saving' });

    // 1. Broadcast to partner via Realtime channel
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'room_state_update',
        payload: { room },
      });
    }

    // 2. Persist to Supabase if configured
    if (!isSupabaseConfigured) {
      set({ saveStatus: 'saved' });
      return;
    }

    try {
      await supabase.from('rooms').upsert({
        id: room.id,
        couple_id: room.coupleId,
        name: room.name,
        room_type: room.roomType,
        dimensions: room.dimensions,
        wall_color: room.wallColor,
        floor_material: room.floorMaterial,
        lighting_theme: room.lightingTheme,
        window_scenery: room.windowScenery,
        revision: room.revision,
        updated_at: new Date().toISOString(),
      });

      // Sync room objects
      await supabase.from('room_objects').delete().eq('room_id', room.id);
      if (room.objects.length > 0) {
        const rows = room.objects.map((o) => ({
          id: o.id,
          room_id: room.id,
          catalog_id: o.catalogId,
          position: o.position,
          rotation_y: o.rotationY,
          color: o.color,
          scale: o.scale || 1,
          interaction_type: o.interactionType,
          photo_url: o.photoUrl,
        }));
        await supabase.from('room_objects').insert(rows);
      }

      set({ saveStatus: 'saved' });
    } catch {
      set({ saveStatus: 'error' });
    }
  },

  subscribeToRoom: (coupleId: string, myUserId: string) => {
    if (!isSupabaseConfigured || !coupleId) return;
    get().unsubscribeFromRoom();

    const channel = supabase.channel(`couple:${coupleId}:room`);

    // Listen for partner full room sync
    channel.on('broadcast', { event: 'room_state_update' }, (msg) => {
      const partnerRoom = msg.payload?.room as RoomData;
      if (partnerRoom && partnerRoom.revision > get().room.revision) {
        set({ room: partnerRoom, selectedObjectId: null });
      }
    });

    // Listen for incremental object moves
    channel.on('broadcast', { event: 'object_moved' }, (msg) => {
      const { id, position, rotationY, revision } = msg.payload || {};
      const { room } = get();
      if (revision > room.revision) {
        const updatedObjects = room.objects.map((o) =>
          o.id === id ? { ...o, position, rotationY } : o
        );
        set({
          room: {
            ...room,
            objects: updatedObjects,
            revision,
          },
        });
      }
    });

    channel.subscribe();
    set({ channel });
  },

  unsubscribeFromRoom: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
