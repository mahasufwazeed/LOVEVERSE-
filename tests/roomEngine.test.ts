import { RoomCollisionEngine } from '../components/world/roomEngine/RoomCollisionEngine';
import { RoomDimensions, RoomObject } from '../types/room';
import { ROOM_TEMPLATES } from '../constants/roomTemplates';

describe('Advanced 3D Room Creator — Collision & Boundary Engine', () => {
  const sampleRoomDim: RoomDimensions = { width: 6, depth: 6, height: 3.2 };

  test('snaps coordinates to 0.5m grid steps', () => {
    expect(RoomCollisionEngine.snap(0.24)).toBe(0.0);
    expect(RoomCollisionEngine.snap(0.26)).toBe(0.5);
    expect(RoomCollisionEngine.snap(1.2)).toBe(1.0);
    expect(RoomCollisionEngine.snap(1.3)).toBe(1.5);
    expect(RoomCollisionEngine.snap(-0.8)).toBe(-1.0);
  });

  test('computes correct 2D footprint taking rotation into account', () => {
    // double_bed: gridWidth 3 (1.5m), gridDepth 4 (2.0m)
    const bedUnrotated: RoomObject = {
      id: 'bed_1',
      catalogId: 'double_bed',
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      color: '#FF6B8B',
    };

    const fp0 = RoomCollisionEngine.getFootprint(bedUnrotated);
    expect(fp0.maxX - fp0.minX).toBeCloseTo(1.5);
    expect(fp0.maxZ - fp0.minZ).toBeCloseTo(2.0);

    // Rotated 90 degrees (Math.PI / 2) -> transposed dimensions
    const bedRotated: RoomObject = {
      ...bedUnrotated,
      rotationY: Math.PI / 2,
    };
    const fp90 = RoomCollisionEngine.getFootprint(bedRotated);
    expect(fp90.maxX - fp90.minX).toBeCloseTo(2.0);
    expect(fp90.maxZ - fp90.minZ).toBeCloseTo(1.5);
  });

  test('validates placement within room boundaries and rejects out-of-bounds', () => {
    const insideBed: RoomObject = {
      id: 'bed_1',
      catalogId: 'double_bed',
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      color: '#FF6B8B',
    };
    expect(RoomCollisionEngine.isInsideBoundaries(insideBed, sampleRoomDim)).toBe(true);

    const outsideBed: RoomObject = {
      id: 'bed_2',
      catalogId: 'double_bed',
      position: { x: 3.5, y: 0, z: 0 }, // Out of bounds for 6m room (limits are ~±2.8m)
      rotationY: 0,
      color: '#FF6B8B',
    };
    expect(RoomCollisionEngine.isInsideBoundaries(outsideBed, sampleRoomDim)).toBe(false);
  });

  test('detects collision and rejects overlapping furniture placement', () => {
    const existingSofa: RoomObject = {
      id: 'sofa_1',
      catalogId: 'plush_sofa',
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      color: '#8E7DBE',
    };

    // Overlapping table
    const overlappingTable: RoomObject = {
      id: 'table_1',
      catalogId: 'coffee_table',
      position: { x: 0.2, y: 0, z: 0.1 },
      rotationY: 0,
      color: '#CDB4DB',
    };

    const res = RoomCollisionEngine.validatePlacement(
      overlappingTable,
      [existingSofa],
      sampleRoomDim
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Collides');

    // Distant table: should pass
    const distantTable: RoomObject = {
      ...overlappingTable,
      position: { x: 0, y: 0, z: -1.8 },
    };
    const res2 = RoomCollisionEngine.validatePlacement(
      distantTable,
      [existingSofa],
      sampleRoomDim
    );
    expect(res2.valid).toBe(true);
  });

  test('permits rugs to overlap with furniture (rug under bed/sofa)', () => {
    const existingBed: RoomObject = {
      id: 'bed_1',
      catalogId: 'double_bed',
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      color: '#FF6B8B',
    };

    const rugUnderBed: RoomObject = {
      id: 'rug_1',
      catalogId: 'fluffy_rug',
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      color: '#FFD1DC',
    };

    const validation = RoomCollisionEngine.validatePlacement(
      rugUnderBed,
      [existingBed],
      sampleRoomDim
    );
    expect(validation.valid).toBe(true);
  });

  test('all 5 starter room templates have valid, collision-free default objects', () => {
    expect(ROOM_TEMPLATES.length).toBe(5);

    ROOM_TEMPLATES.forEach((tmpl) => {
      expect(tmpl.dimensions.width).toBeGreaterThanOrEqual(6);
      expect(tmpl.dimensions.depth).toBeGreaterThanOrEqual(6);
      expect(tmpl.defaultObjects.length).toBeGreaterThan(0);

      // Verify each object in the template is inside walls
      tmpl.defaultObjects.forEach((obj, idx) => {
        const item: RoomObject = { ...obj, id: `test_${idx}` };
        expect(RoomCollisionEngine.isInsideBoundaries(item, tmpl.dimensions)).toBe(true);
      });
    });
  });
});
