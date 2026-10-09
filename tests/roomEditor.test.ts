jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
  isSupabaseConfigured: false,
}));

import { useRoomStore } from '../stores/roomStore';
import { ROOM_TEMPLATES } from '../constants/roomTemplates';

describe('Advanced 3D Room Creator — Editor & Undo/Redo Engine', () => {
  beforeEach(() => {
    // Reset room state before each test
    useRoomStore.getState().applyTemplate('cozy_bedroom');
  });

  test('applies starter template with proper dimensions and objects', () => {
    const store = useRoomStore.getState();
    expect(store.room.name).toBe('Cozy Bedroom');
    expect(store.room.roomType).toBe('bedroom');
    expect(store.room.objects.length).toBeGreaterThanOrEqual(4);
    expect(store.room.wallColor).toBe('#FDF0ED');
    expect(store.room.floorMaterial).toBe('hardwood_oak');
  });

  test('adds a new furniture piece and selects it', () => {
    const store = useRoomStore.getState();
    const initialCount = store.room.objects.length;

    const res = store.addObject('potted_plant');
    expect(res.success).toBe(true);

    const updated = useRoomStore.getState();
    expect(updated.room.objects.length).toBe(initialCount + 1);
    expect(updated.selectedObjectId).toBeTruthy();

    const addedItem = updated.room.objects.find((o) => o.id === updated.selectedObjectId);
    expect(addedItem?.catalogId).toBe('potted_plant');
  });

  test('rotates an object by 90 degrees', () => {
    const store = useRoomStore.getState();
    store.addObject('potted_plant');
    const updated = useRoomStore.getState();
    const target = updated.room.objects[updated.room.objects.length - 1];
    const initialRot = target.rotationY;

    const res = store.rotateObject(target.id);
    expect(res.success).toBe(true);

    const updatedTarget = useRoomStore.getState().room.objects.find((o) => o.id === target.id);
    expect(updatedTarget?.rotationY).toBeCloseTo(initialRot + Math.PI / 2);
  });

  test('updates furniture color', () => {
    const store = useRoomStore.getState();
    const target = store.room.objects[0];

    store.updateObjectColor(target.id, '#4A90E2');

    const updatedTarget = useRoomStore.getState().room.objects.find((o) => o.id === target.id);
    expect(updatedTarget?.color).toBe('#4A90E2');
  });

  test('removes an object from the room', () => {
    const store = useRoomStore.getState();
    const initialCount = store.room.objects.length;
    const targetId = store.room.objects[0].id;

    store.removeObject(targetId);

    const updated = useRoomStore.getState();
    expect(updated.room.objects.length).toBe(initialCount - 1);
    expect(updated.room.objects.find((o) => o.id === targetId)).toBeUndefined();
  });

  test('undo and redo revert and restore object state', () => {
    const store = useRoomStore.getState();
    const initialCount = store.room.objects.length;

    // 1. Add an object
    store.addObject('potted_plant');
    expect(useRoomStore.getState().room.objects.length).toBe(initialCount + 1);

    // 2. Undo
    useRoomStore.getState().undo();
    expect(useRoomStore.getState().room.objects.length).toBe(initialCount);

    // 3. Redo
    useRoomStore.getState().redo();
    expect(useRoomStore.getState().room.objects.length).toBe(initialCount + 1);
  });

  test('supports switching between all 5 room templates', () => {
    const store = useRoomStore.getState();

    ROOM_TEMPLATES.forEach((tmpl) => {
      store.applyTemplate(tmpl.id);
      const current = useRoomStore.getState();
      expect(current.room.name).toBe(tmpl.name);
      expect(current.room.roomType).toBe(tmpl.roomType);
      expect(current.room.wallColor).toBe(tmpl.wallColor);
      expect(current.room.floorMaterial).toBe(tmpl.floorMaterial);
    });
  });
});
