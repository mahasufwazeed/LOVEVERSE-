import { RoomDimensions, RoomObject, FurnitureCatalogItem } from '../../../types/room';
import { Vector3D } from '../../../types';
import { FURNITURE_CATALOG } from '../../../constants/furnitureCatalog';

export const GRID_CELL_SIZE = 0.5; // 0.5 meters per tile

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class RoomCollisionEngine {
  /**
   * Snaps a value to the nearest 0.5m grid step
   */
  static snap(value: number): number {
    return Math.round(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  }

  /**
   * Snaps a 3D position vector to the grid
   */
  static snapPosition(pos: Vector3D): Vector3D {
    return {
      x: this.snap(pos.x),
      y: Math.max(0, pos.y),
      z: this.snap(pos.z),
    };
  }

  /**
   * Computes the 2D footprint bounding box for a given room object, taking rotation into account
   */
  static getFootprint(item: RoomObject): BoundingBox2D {
    const catalogItem = FURNITURE_CATALOG.find((c: FurnitureCatalogItem) => c.catalogId === item.catalogId);
    const rawW = (catalogItem ? catalogItem.gridWidth : 1) * GRID_CELL_SIZE;
    const rawD = (catalogItem ? catalogItem.gridDepth : 1) * GRID_CELL_SIZE;

    // Check if rotated 90 or 270 degrees
    const normalizedRot = Math.abs(item.rotationY) % Math.PI;
    const isTransposed = normalizedRot > 0.4 && normalizedRot < 2.7;

    const width = isTransposed ? rawD : rawW;
    const depth = isTransposed ? rawW : rawD;

    return {
      minX: item.position.x - width / 2,
      maxX: item.position.x + width / 2,
      minZ: item.position.z - depth / 2,
      maxZ: item.position.z + depth / 2,
    };
  }

  /**
   * Checks if an object's footprint fits completely inside the room walls
   */
  static isInsideBoundaries(item: RoomObject, roomDim: RoomDimensions): boolean {
    const box = this.getFootprint(item);
    const halfW = roomDim.width / 2 - 0.2; // 0.2m safety margin from wall
    const halfD = roomDim.depth / 2 - 0.2;

    return (
      box.minX >= -halfW &&
      box.maxX <= halfW &&
      box.minZ >= -halfD &&
      box.maxZ <= halfD
    );
  }

  /**
   * Tests whether two 2D bounding boxes overlap (collision)
   */
  static isOverlapping(boxA: BoundingBox2D, boxB: BoundingBox2D, tolerance: number = 0.05): boolean {
    if (boxA.maxX - tolerance <= boxB.minX || boxA.minX + tolerance >= boxB.maxX) {
      return false;
    }
    if (boxA.maxZ - tolerance <= boxB.minZ || boxA.minZ + tolerance >= boxB.maxZ) {
      return false;
    }
    return true;
  }

  /**
   * Validates if a proposed furniture placement is valid
   * Rugs are allowed to overlap with other furniture!
   */
  static validatePlacement(
    candidate: RoomObject,
    existingItems: RoomObject[],
    roomDim: RoomDimensions
  ): { valid: boolean; reason?: string } {
    // 1. Boundary Check
    if (!this.isInsideBoundaries(candidate, roomDim)) {
      return { valid: false, reason: 'Object cannot be placed outside room boundaries.' };
    }

    // Rugs are flat floor coverings, so ignore collision with them
    const isRug = candidate.catalogId === 'fluffy_rug';

    // 2. Overlap Check with other items (excluding itself and rugs)
    const candidateBox = this.getFootprint(candidate);

    for (const item of existingItems) {
      if (item.id === candidate.id) continue;
      if (item.catalogId === 'fluffy_rug' || isRug) continue;

      const itemBox = this.getFootprint(item);
      if (this.isOverlapping(candidateBox, itemBox)) {
        return {
          valid: false,
          reason: `Collides with existing ${item.catalogId.replace('_', ' ')}.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Clamps an object's position so it stays safely within room walls
   */
  static clampToRoom(pos: Vector3D, catalogId: string, roomDim: RoomDimensions): Vector3D {
    const catalogItem = FURNITURE_CATALOG.find((c: FurnitureCatalogItem) => c.catalogId === catalogId);
    const halfW = ((catalogItem ? catalogItem.gridWidth : 1) * GRID_CELL_SIZE) / 2;
    const halfD = ((catalogItem ? catalogItem.gridDepth : 1) * GRID_CELL_SIZE) / 2;

    const limitX = roomDim.width / 2 - 0.2 - halfW;
    const limitZ = roomDim.depth / 2 - 0.2 - halfD;

    return {
      x: this.snap(Math.max(-limitX, Math.min(limitX, pos.x))),
      y: Math.max(0, pos.y),
      z: this.snap(Math.max(-limitZ, Math.min(limitZ, pos.z))),
    };
  }
}
