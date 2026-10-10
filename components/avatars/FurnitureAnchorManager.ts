import * as THREE from 'three';
import { RoomObject } from '../../types/room';

export interface FurnitureAnchorPair {
  userTarget: THREE.Vector3;
  partnerTarget: THREE.Vector3;
  userRotationY: number;
  partnerRotationY: number;
  elevationY: number;
  type: 'sofa' | 'bed' | 'standing';
}

export class FurnitureAnchorManager {
  /**
   * Finds the best furniture anchor pair for a given interaction in the current room layout
   */
  public static getInteractionAnchors(
    interaction: string,
    objects: RoomObject[] = []
  ): FurnitureAnchorPair {
    if (interaction === 'sleep_beside') {
      // Find bed in room objects
      const bed = objects.find(
        (o) => o.catalogId === 'double_bed' || o.catalogId.includes('bed')
      );

      if (bed) {
        const bx = bed.position.x;
        const bz = bed.position.z;
        const rot = bed.rotationY || 0;

        // Bed left & right sleeping slots
        const offsetLeft = new THREE.Vector3(-0.45, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        const offsetRight = new THREE.Vector3(0.45, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);

        return {
          userTarget: new THREE.Vector3(bx + offsetLeft.x, 0, bz + offsetLeft.z),
          partnerTarget: new THREE.Vector3(bx + offsetRight.x, 0, bz + offsetRight.z),
          userRotationY: rot,
          partnerRotationY: rot,
          elevationY: 0.42, // Bed mattress height
          type: 'bed',
        };
      }

      // Default bed anchor if no bed object in room
      return {
        userTarget: new THREE.Vector3(-1.6, 0, 0.1),
        partnerTarget: new THREE.Vector3(-1.1, 0, 0.1),
        userRotationY: 0,
        partnerRotationY: 0,
        elevationY: 0.38,
        type: 'bed',
      };
    }

    if (interaction === 'sit_together' || interaction === 'cuddle') {
      // Find sofa in room objects
      const sofa = objects.find(
        (o) => o.catalogId === 'plush_sofa' || o.catalogId.includes('sofa') || o.catalogId.includes('couch')
      );

      if (sofa) {
        const sx = sofa.position.x;
        const sz = sofa.position.z;
        const rot = sofa.rotationY || 0;

        // Sofa left & right cushion slots
        const offsetL = new THREE.Vector3(-0.35, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        const offsetR = new THREE.Vector3(0.35, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);

        return {
          userTarget: new THREE.Vector3(sx + offsetL.x, 0, sz + offsetL.z),
          partnerTarget: new THREE.Vector3(sx + offsetR.x, 0, sz + offsetR.z),
          userRotationY: rot + Math.PI, // Facing forward from sofa
          partnerRotationY: rot + Math.PI,
          elevationY: 0.36, // Sofa cushion sitting height
          type: 'sofa',
        };
      }

      // Default cozy couch anchor
      return {
        userTarget: new THREE.Vector3(-0.4, 0, -1.35),
        partnerTarget: new THREE.Vector3(0.4, 0, -1.35),
        userRotationY: 0,
        partnerRotationY: 0,
        elevationY: 0.36,
        type: 'sofa',
      };
    }

    // Default standing couple center anchor
    return {
      userTarget: new THREE.Vector3(-0.25, 0, 0.2),
      partnerTarget: new THREE.Vector3(0.25, 0, 0.2),
      userRotationY: Math.PI * 0.45,
      partnerRotationY: -Math.PI * 0.45,
      elevationY: 0,
      type: 'standing',
    };
  }
}
