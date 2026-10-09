jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
  isSupabaseConfigured: false,
}));

import { useRoomStore } from '../stores/roomStore';

describe('Advanced 3D Room Creator — Concurrency & Realtime Synchronization', () => {
  beforeEach(() => {
    useRoomStore.getState().applyTemplate('cozy_bedroom');
  });

  test('increments room revision on every mutation to enable optimistic locking', () => {
    const initialRev = useRoomStore.getState().room.revision;

    useRoomStore.getState().addObject('candle_cluster');
    const revAfterAdd = useRoomStore.getState().room.revision;
    expect(revAfterAdd).toBe(initialRev + 1);

    const candle = useRoomStore.getState().room.objects.find((o) => o.catalogId === 'candle_cluster');
    expect(candle).toBeDefined();

    useRoomStore.getState().rotateObject(candle!.id);
    const revAfterRotate = useRoomStore.getState().room.revision;
    expect(revAfterRotate).toBe(revAfterAdd + 1);

    useRoomStore.getState().removeObject(candle!.id);
    const revAfterDelete = useRoomStore.getState().room.revision;
    expect(revAfterDelete).toBe(revAfterRotate + 1);
  });

  test('updates room atmosphere settings and increments revision', () => {
    const initialRev = useRoomStore.getState().room.revision;

    useRoomStore.getState().updateRoomSettings({
      wallColor: '#FEF3C7',
      floorMaterial: 'marble_pink',
      lightingTheme: 'romantic_pink',
      windowScenery: 'beach_ocean',
    });

    const updated = useRoomStore.getState().room;
    expect(updated.wallColor).toBe('#FEF3C7');
    expect(updated.floorMaterial).toBe('marble_pink');
    expect(updated.lightingTheme).toBe('romantic_pink');
    expect(updated.windowScenery).toBe('beach_ocean');
    expect(updated.revision).toBe(initialRev + 1);
  });

  test('mode switching preserves room objects and clears selection on live mode', () => {
    const store = useRoomStore.getState();
    store.setMode('edit');
    store.selectObject(store.room.objects[0].id);
    expect(useRoomStore.getState().selectedObjectId).toBe(store.room.objects[0].id);

    // Switch back to live mode -> deselects object
    store.setMode('live');
    expect(useRoomStore.getState().mode).toBe('live');
    expect(useRoomStore.getState().selectedObjectId).toBeNull();
  });
});
