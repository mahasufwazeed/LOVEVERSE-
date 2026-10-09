import * as THREE from 'three';
import { RoomObject } from '../../../types/room';

export class FurnitureMeshBuilder {
  /**
   * Builds an optimized, high-fidelity Three.js Group for a given furniture object
   */
  static buildFurniture(item: RoomObject, isSelected: boolean = false): THREE.Group {
    const group = new THREE.Group();
    group.name = `furniture_${item.id}`;
    group.userData = {
      id: item.id,
      catalogId: item.catalogId,
      interactionType: item.interactionType,
      position: item.position,
      rotationY: item.rotationY,
    };

    const colorHex = parseInt(item.color.replace('#', '0x'), 16) || 0xff6b8b;

    switch (item.catalogId) {
      case 'double_bed':
        this.buildBed(group, colorHex);
        break;
      case 'nightstand':
        this.buildNightstand(group, colorHex);
        break;
      case 'wardrobe':
        this.buildWardrobe(group, colorHex);
        break;
      case 'fluffy_rug':
        this.buildRug(group, colorHex);
        break;
      case 'table_lamp':
        this.buildTableLamp(group, colorHex);
        break;
      case 'plush_sofa':
        this.buildSofa(group, colorHex);
        break;
      case 'coffee_table':
        this.buildCoffeeTable(group, colorHex);
        break;
      case 'smart_tv':
        this.buildSmartTV(group, colorHex);
        break;
      case 'bookshelf':
        this.buildBookshelf(group, colorHex);
        break;
      case 'potted_plant':
        this.buildPlant(group, colorHex);
        break;
      case 'floor_lamp':
        this.buildFloorLamp(group, colorHex);
        break;
      case 'heart_pillow':
        this.buildHeartPillow(group, colorHex);
        break;
      case 'couple_frame':
        this.buildPhotoFrame(group, colorHex, item.photoUrl);
        break;
      case 'teddy_bear':
        this.buildTeddyBear(group, colorHex);
        break;
      case 'fairy_lights':
        this.buildFairyLights(group, colorHex);
        break;
      case 'rose_vase':
        this.buildRoseVase(group, colorHex);
        break;
      case 'candle_cluster':
        this.buildCandleCluster(group, colorHex);
        break;
      default:
        this.buildGenericBox(group, colorHex);
        break;
    }

    // Apply scale & rotation
    const scale = item.scale || 1;
    group.scale.set(scale, scale, scale);
    group.position.set(item.position.x, item.position.y, item.position.z);
    group.rotation.y = item.rotationY;

    // Selection Indicator Ring
    if (isSelected) {
      const ringGeo = new THREE.RingGeometry(0.8, 0.95, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff007f,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      group.add(ring);
    }

    return group;
  }

  // --- Bedroom Builders ---

  private static buildBed(group: THREE.Group, sheetColor: number) {
    // Bed Frame
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x5a3d28 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 2.4), frameMat);
    frame.position.y = 0.14;
    group.add(frame);

    // Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.18), frameMat);
    headboard.position.set(0, 0.55, -1.15);
    group.add(headboard);

    // Mattress
    const mattressMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.32, 2.2), mattressMat);
    mattress.position.y = 0.38;
    group.add(mattress);

    // Duvet / Bed Sheet
    const duvetMat = new THREE.MeshLambertMaterial({ color: sheetColor });
    const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.34, 1.55), duvetMat);
    duvet.position.set(0, 0.4, 0.32);
    group.add(duvet);

    // Twin Pillows
    const pillowMat = new THREE.MeshLambertMaterial({ color: 0xfff0f5 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.42), pillowMat);
    p1.position.set(-0.48, 0.55, -0.8);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.42), pillowMat);
    p2.position.set(0.48, 0.55, -0.8);
    group.add(p1, p2);
  }

  private static buildNightstand(group: THREE.Group, woodColor: number) {
    const mat = new THREE.MeshLambertMaterial({ color: woodColor });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.58, 0.55), mat);
    body.position.y = 0.29;

    // Brass Knob
    const knobMat = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), knobMat);
    knob.position.set(0, 0.29, 0.29);

    group.add(body, knob);
  }

  private static buildWardrobe(group: THREE.Group, woodColor: number) {
    const mat = new THREE.MeshLambertMaterial({ color: woodColor });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 0.65), mat);
    body.position.y = 1.05;

    // Double door handle
    const handleMat = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
    const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), handleMat);
    h1.position.set(-0.06, 1.05, 0.34);
    const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), handleMat);
    h2.position.set(0.06, 1.05, 0.34);

    group.add(body, h1, h2);
  }

  private static buildRug(group: THREE.Group, color: number) {
    const mat = new THREE.MeshLambertMaterial({ color });
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.02, 32), mat);
    rug.position.y = 0.01;
    group.add(rug);
  }

  private static buildTableLamp(group: THREE.Group, shadeColor: number) {
    const baseMat = new THREE.MeshLambertMaterial({ color: 0xd4af37 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16), baseMat);
    base.position.y = 0.02;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 12), baseMat);
    pole.position.y = 0.18;

    const shadeMat = new THREE.MeshLambertMaterial({ color: shadeColor, emissive: shadeColor, emissiveIntensity: 0.4 });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.2, 20), shadeMat);
    shade.position.y = 0.4;

    group.add(base, pole, shade);
  }

  // --- Living Room Builders ---

  private static buildSofa(group: THREE.Group, fabricColor: number) {
    const mat = new THREE.MeshLambertMaterial({ color: fabricColor });

    // Seat Cushion
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.36, 0.88), mat);
    seat.position.y = 0.22;

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 0.24), mat);
    back.position.set(0, 0.58, -0.32);

    // Armrests
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.88), mat);
    armL.position.set(-0.95, 0.32, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.88), mat);
    armR.position.set(0.95, 0.32, 0);

    // Accent Pillows
    const pillowMat = new THREE.MeshLambertMaterial({ color: 0xffe4e6 });
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), pillowMat);
    pL.position.set(-0.72, 0.45, -0.16);
    pL.rotation.z = 0.2;

    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), pillowMat);
    pR.position.set(0.72, 0.45, -0.16);
    pR.rotation.z = -0.2;

    group.add(seat, back, armL, armR, pL, pR);
  }

  private static buildCoffeeTable(group: THREE.Group, woodColor: number) {
    const mat = new THREE.MeshLambertMaterial({ color: woodColor });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), mat);
    top.position.y = 0.38;

    const legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const positions = [
      [-0.52, 0.18, -0.24],
      [0.52, 0.18, -0.24],
      [-0.52, 0.18, 0.24],
      [0.52, 0.18, 0.24],
    ];

    positions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8), legMat);
      leg.position.set(x, y, z);
      group.add(leg);
    });

    group.add(top);
  }

  private static buildSmartTV(group: THREE.Group, bodyColor: number) {
    // TV Stand Media Console
    const standMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.45), standMat);
    stand.position.y = 0.21;

    // TV Screen Frame
    const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.06), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    tvFrame.position.set(0, 0.9, 0);

    // Glowing TV Display (Watch Party display simulation)
    const tvScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.32, 0.77),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0 })
    );
    tvScreen.position.set(0, 0.9, 0.035);

    group.add(stand, tvFrame, tvScreen);
  }

  private static buildBookshelf(group: THREE.Group, woodColor: number) {
    const mat = new THREE.MeshLambertMaterial({ color: woodColor });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.35), mat);
    body.position.y = 0.9;

    // Shelves & colorful books
    const bookColors = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261];
    bookColors.forEach((c, idx) => {
      const bMat = new THREE.MeshLambertMaterial({ color: c });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.18), bMat);
      b.position.set(-0.35 + idx * 0.18, 0.85, 0.05);
      group.add(b);
    });

    group.add(body);
  }

  private static buildPlant(group: THREE.Group, leafColor: number) {
    // Ceramic Pot
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.18, 0.42, 16),
      new THREE.MeshLambertMaterial({ color: 0xdd6b20 })
    );
    pot.position.y = 0.21;

    // Soil
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16),
      new THREE.MeshLambertMaterial({ color: 0x3d2817 })
    );
    soil.position.y = 0.41;

    // Tropical Leaves
    const leafMat = new THREE.MeshLambertMaterial({ color: leafColor });
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.02), leafMat);
      const angle = (i * Math.PI * 2) / 5;
      leaf.position.set(Math.sin(angle) * 0.15, 0.65, Math.cos(angle) * 0.15);
      leaf.rotation.z = Math.sin(angle) * 0.4;
      leaf.rotation.x = Math.cos(angle) * 0.4;
      group.add(leaf);
    }

    group.add(pot, soil);
  }

  private static buildFloorLamp(group: THREE.Group, poleColor: number) {
    const baseMat = new THREE.MeshLambertMaterial({ color: poleColor });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.05, 20), baseMat);
    base.position.y = 0.025;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 12), baseMat);
    pole.position.y = 0.95;

    const shadeMat = new THREE.MeshLambertMaterial({
      color: 0xfffaed,
      emissive: 0xffdd88,
      emissiveIntensity: 0.6,
    });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 0.32, 20), shadeMat);
    shade.position.y = 1.85;

    group.add(base, pole, shade);
  }

  // --- Romantic Decor Builders ---

  private static buildHeartPillow(group: THREE.Group, color: number) {
    const mat = new THREE.MeshLambertMaterial({ color });
    // Left & Right lobes of heart
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
    s1.position.set(-0.12, 0.2, 0);
    s1.scale.set(1, 1.2, 0.7);

    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
    s2.position.set(0.12, 0.2, 0);
    s2.scale.set(1, 1.2, 0.7);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 16), mat);
    cone.position.set(0, 0.06, 0);
    cone.rotation.z = Math.PI;
    cone.scale.set(1, 1, 0.6);

    group.add(s1, s2, cone);
  }

  private static buildPhotoFrame(group: THREE.Group, frameColor: number, photoUrl?: string) {
    const frameMat = new THREE.MeshLambertMaterial({ color: frameColor });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.04), frameMat);
    frame.position.y = 0.35;

    // Picture inside frame
    const picMat = new THREE.MeshBasicMaterial({ color: 0xffd1dc });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.5), picMat);
    pic.position.set(0, 0.35, 0.025);

    // Stand on back
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.02), frameMat);
    stand.position.set(0, 0.22, -0.1);
    stand.rotation.x = 0.3;

    group.add(frame, pic, stand);
  }

  private static buildTeddyBear(group: THREE.Group, furColor: number) {
    const mat = new THREE.MeshLambertMaterial({ color: furColor });
    const noseMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Body & Head
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat);
    body.position.y = 0.24;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
    head.position.y = 0.52;

    // Ears
    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), mat);
    earL.position.set(-0.14, 0.65, 0);
    const earR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), mat);
    earR.position.set(0.14, 0.65, 0);

    // Muzzle & Nose
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshLambertMaterial({ color: 0xfff0db }));
    muzzle.position.set(0, 0.49, 0.14);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), noseMat);
    nose.position.set(0, 0.52, 0.2);

    // Tiny red bow tie
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), new THREE.MeshLambertMaterial({ color: 0xff0055 }));
    bow.position.set(0, 0.38, 0.16);

    group.add(body, head, earL, earR, muzzle, nose, bow);
  }

  private static buildFairyLights(group: THREE.Group, lightColor: number) {
    const bulbMat = new THREE.MeshLambertMaterial({
      color: lightColor,
      emissive: lightColor,
      emissiveIntensity: 0.85,
    });

    for (let i = 0; i < 9; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), bulbMat);
      const x = -1.2 + i * 0.3;
      const y = 0.3 - Math.sin((i / 8) * Math.PI) * 0.15;
      bulb.position.set(x, y, 0);
      group.add(bulb);
    }
  }

  private static buildRoseVase(group: THREE.Group, roseColor: number) {
    const vaseMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
    });
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.38, 16), vaseMat);
    vase.position.y = 0.19;

    const roseMat = new THREE.MeshLambertMaterial({ color: roseColor });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI * 2) / 4;
      const rose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), roseMat);
      rose.position.set(Math.cos(angle) * 0.08, 0.44, Math.sin(angle) * 0.08);
      group.add(rose);
    }

    group.add(vase);
  }

  private static buildCandleCluster(group: THREE.Group, waxColor: number) {
    const waxMat = new THREE.MeshLambertMaterial({ color: waxColor });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    const heights = [0.24, 0.18, 0.12];
    const offsets = [
      [-0.08, 0],
      [0.08, -0.06],
      [0.02, 0.08],
    ];

    heights.forEach((h, i) => {
      const [ox, oz] = offsets[i];
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 12), waxMat);
      candle.position.set(ox, h / 2, oz);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 8), flameMat);
      flame.position.set(ox, h + 0.025, oz);

      group.add(candle, flame);
    });
  }

  private static buildGenericBox(group: THREE.Group, color: number) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshLambertMaterial({ color }));
    box.position.y = 0.4;
    group.add(box);
  }
}
