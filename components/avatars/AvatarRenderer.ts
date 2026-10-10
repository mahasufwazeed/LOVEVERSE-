import * as THREE from 'three';
import { AvatarConfig } from '../../types';

export interface AvatarParts {
  group: THREE.Group;
  head: THREE.Group;
  hair: THREE.Group;
  eyes: { left: THREE.Group; right: THREE.Group };
  eyebrows: { left: THREE.Mesh; right: THREE.Mesh };
  mouth: THREE.Mesh;
  cheeks: { left: THREE.Mesh; right: THREE.Mesh };
  torso: THREE.Mesh;
  arms: { left: THREE.Group; right: THREE.Group };
  legs: { left: THREE.Group; right: THREE.Group };
  glasses?: THREE.Group;
  accessory?: THREE.Group;
}

export function createBitmojiAvatar(config: AvatarConfig, isPartner: boolean = false): AvatarParts {
  const avatarGroup = new THREE.Group();

  // 1. Materials with cartoonish specular soft shading
  const skinMat = new THREE.MeshLambertMaterial({
    color: config.skinColor || '#FDDFB2',
  });
  const hairMat = new THREE.MeshLambertMaterial({
    color: config.hairColor || '#4A2B11',
  });
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const irisMat = new THREE.MeshLambertMaterial({
    color: config.eyeColor || '#3E2723',
  });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyebrowMat = new THREE.MeshBasicMaterial({
    color: config.eyebrowColor || config.hairColor || '#4A2B11',
  });
  const mouthMat = new THREE.MeshBasicMaterial({
    color: config.lipColor || 0xd9536d,
  });
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xff708f,
    transparent: true,
    opacity: 0.55,
  });
  const shirtMat = new THREE.MeshLambertMaterial({
    color: config.shirtColor || '#FF5C8A',
  });
  const pantsMat = new THREE.MeshLambertMaterial({
    color: config.pantsColor || '#292238',
  });
  const shoesMat = new THREE.MeshLambertMaterial({
    color: config.shoesColor || 0x222222,
  });

  // 2. Head Pivot Group (holds head skin mesh, face features, hair, and glasses)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.38, 0);
  avatarGroup.add(headGroup);

  let headGeo: THREE.BufferGeometry;
  if (config.faceShape === 'square') {
    headGeo = new THREE.BoxGeometry(0.56, 0.62, 0.54);
  } else if (config.faceShape === 'oval') {
    headGeo = new THREE.SphereGeometry(0.32, 24, 24);
    headGeo.scale(0.92, 1.15, 0.95);
  } else if (config.faceShape === 'heart') {
    headGeo = new THREE.SphereGeometry(0.32, 24, 24);
    headGeo.scale(1.05, 1.0, 0.95);
  } else {
    // Round default
    headGeo = new THREE.SphereGeometry(0.33, 24, 24);
  }

  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headGroup.add(headMesh);

  // 3. Cute Cartoon Nose
  const noseGeo = new THREE.SphereGeometry(0.045, 12, 12);
  noseGeo.scale(1, 0.8, 1.3);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.position.set(0, -0.03, 0.32);
  headGroup.add(nose);

  // 4. Stylized Eyes with Iris, Pupil & Specular Glimmer
  const eyesGroup = {
    left: new THREE.Group(),
    right: new THREE.Group(),
  };

  const createEye = (isLeft: boolean) => {
    const eye = new THREE.Group();
    // Eye white base
    const baseGeo = new THREE.SphereGeometry(0.065, 16, 16);
    baseGeo.scale(1, 0.9, 0.5);
    const base = new THREE.Mesh(baseGeo, eyeWhiteMat);
    eye.add(base);

    // Colored Iris
    const irisGeo = new THREE.SphereGeometry(0.042, 14, 14);
    irisGeo.scale(1, 1, 0.3);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.z = 0.025;
    eye.add(iris);

    // Pupil
    const pupilGeo = new THREE.SphereGeometry(0.024, 12, 12);
    pupilGeo.scale(1, 1, 0.3);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.z = 0.035;
    eye.add(pupil);

    // Specular Highlight
    const glintGeo = new THREE.SphereGeometry(0.012, 8, 8);
    const glint = new THREE.Mesh(glintGeo, highlightMat);
    glint.position.set(0.012, 0.015, 0.042);
    eye.add(glint);

    const xOffset = isLeft ? -0.12 : 0.12;
    eye.position.set(xOffset, 0.03, 0.28);
    return eye;
  };

  eyesGroup.left = createEye(true);
  eyesGroup.right = createEye(false);
  headGroup.add(eyesGroup.left);
  headGroup.add(eyesGroup.right);

  // 5. Eyebrows
  const browGeo = new THREE.BoxGeometry(0.08, 0.02, 0.015);
  const leftBrow = new THREE.Mesh(browGeo, eyebrowMat);
  leftBrow.position.set(-0.12, 0.11, 0.29);
  leftBrow.rotation.z = 0.08;
  headGroup.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeo, eyebrowMat);
  rightBrow.position.set(0.12, 0.11, 0.29);
  rightBrow.rotation.z = -0.08;
  headGroup.add(rightBrow);

  // 6. Blushing Cheeks
  const cheekGeo = new THREE.SphereGeometry(0.055, 12, 12);
  cheekGeo.scale(1.2, 0.7, 0.4);
  const cheekL = new THREE.Mesh(cheekGeo, blushMat);
  cheekL.position.set(-0.19, -0.08, 0.26);
  headGroup.add(cheekL);

  const cheekR = new THREE.Mesh(cheekGeo, blushMat);
  cheekR.position.set(0.19, -0.08, 0.26);
  headGroup.add(cheekR);

  // 7. Expressive Mouth Mesh
  const mouthGeo = new THREE.TorusGeometry(0.05, 0.016, 8, 16, Math.PI);
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.position.set(0, -0.12, 0.3);
  mouth.rotation.x = Math.PI; // Smile arch
  headGroup.add(mouth);

  // 8. Modular Hairstyles
  const hairGroup = new THREE.Group();
  const style = config.hairStyle || 'wavy';

  if (style === 'afro') {
    const afroGeo = new THREE.SphereGeometry(0.42, 20, 20);
    const afro = new THREE.Mesh(afroGeo, hairMat);
    afro.position.set(0, 0.1, -0.02);
    hairGroup.add(afro);
  } else if (style === 'bob') {
    const topGeo = new THREE.SphereGeometry(0.36, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const top = new THREE.Mesh(topGeo, hairMat);
    top.position.y = 0.06;
    hairGroup.add(top);

    const sideGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.45, 16, 1, true, -Math.PI * 0.8, Math.PI * 1.6);
    const sides = new THREE.Mesh(sideGeo, hairMat);
    sides.position.set(0, -0.06, -0.02);
    hairGroup.add(sides);
  } else if (style === 'bun') {
    const topGeo = new THREE.SphereGeometry(0.35, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const top = new THREE.Mesh(topGeo, hairMat);
    top.position.y = 0.06;
    hairGroup.add(top);

    const bunGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const bun = new THREE.Mesh(bunGeo, hairMat);
    bun.position.set(0, 0.44, -0.1);
    hairGroup.add(bun);
  } else if (style === 'curly') {
    const baseGeo = new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const base = new THREE.Mesh(baseGeo, hairMat);
    base.position.y = 0.06;
    hairGroup.add(base);

    // Curls bubbles
    for (let i = 0; i < 9; i++) {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), hairMat);
      const angle = (i / 9) * Math.PI * 2;
      curl.position.set(Math.cos(angle) * 0.28, 0.24 + Math.sin(i) * 0.06, Math.sin(angle) * 0.28);
      hairGroup.add(curl);
    }
  } else if (style === 'spiky') {
    const baseGeo = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const base = new THREE.Mesh(baseGeo, hairMat);
    base.position.y = 0.06;
    hairGroup.add(base);

    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 8), hairMat);
      spike.position.set((i - 2) * 0.1, 0.38, 0);
      spike.rotation.z = (i - 2) * -0.2;
      hairGroup.add(spike);
    }
  } else if (style === 'long' || style === 'wavy') {
    const baseGeo = new THREE.SphereGeometry(0.35, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const base = new THREE.Mesh(baseGeo, hairMat);
    base.position.y = 0.06;
    hairGroup.add(base);

    const tressGeo = new THREE.CylinderGeometry(0.09, 0.06, 0.6, 12);
    const tressL = new THREE.Mesh(tressGeo, hairMat);
    tressL.position.set(-0.29, -0.18, 0.05);
    tressL.rotation.z = 0.1;
    hairGroup.add(tressL);

    const tressR = new THREE.Mesh(tressGeo, hairMat);
    tressR.position.set(0.29, -0.18, 0.05);
    tressR.rotation.z = -0.1;
    hairGroup.add(tressR);
  } else {
    // Short crop
    const shortGeo = new THREE.SphereGeometry(0.35, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const shortHair = new THREE.Mesh(shortGeo, hairMat);
    shortHair.position.y = 0.06;
    hairGroup.add(shortHair);
  }
  headGroup.add(hairGroup);

  // 9. Glasses (if selected)
  let glassesGroup: THREE.Group | undefined;
  if (config.glasses && config.glasses !== 'none') {
    glassesGroup = new THREE.Group();
    const frameColor = config.glasses === 'sunglasses' ? 0x111111 : 0x443322;
    const gMat = new THREE.MeshBasicMaterial({ color: frameColor });

    const rimL = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 8, 16), gMat);
    rimL.position.set(-0.12, 0.03, 0.31);
    glassesGroup.add(rimL);

    const rimR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 8, 16), gMat);
    rimR.position.set(0.12, 0.03, 0.31);
    glassesGroup.add(rimR);

    // Bridge
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.014, 0.014), gMat);
    bridge.position.set(0, 0.03, 0.32);
    glassesGroup.add(bridge);

    if (config.glasses === 'sunglasses') {
      const tintMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85 });
      const lensL = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), tintMat);
      lensL.position.set(-0.12, 0.03, 0.31);
      glassesGroup.add(lensL);

      const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), tintMat);
      lensR.position.set(0.12, 0.03, 0.31);
      glassesGroup.add(lensR);
    }
    headGroup.add(glassesGroup);
  }

  // 10. Torso & Outfits
  const isFem = config.genderPresentation === 'feminine' || config.bodyType === 'feminine';
  const torsoWidthTop = isFem ? 0.2 : 0.24;
  const torsoWidthBot = isFem ? 0.24 : 0.22;
  const torsoGeo = new THREE.CylinderGeometry(torsoWidthTop, torsoWidthBot, 0.54, 16);
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.position.y = 0.92;
  avatarGroup.add(torso);

  // 11. Articulated Limbs
  // Left & Right Arms
  const armGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.44, 12);
  armGeo.translate(0, -0.22, 0);

  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.3, 1.14, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, shirtMat);
  leftArmGroup.add(leftArmMesh);
  // Hand
  const handGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.y = -0.46;
  leftArmGroup.add(leftHand);
  avatarGroup.add(leftArmGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.3, 1.14, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, shirtMat);
  rightArmGroup.add(rightArmMesh);
  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.y = -0.46;
  rightArmGroup.add(rightHand);
  avatarGroup.add(rightArmGroup);

  // Left & Right Legs
  const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.56, 12);
  legGeo.translate(0, -0.28, 0);

  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.12, 0.65, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
  leftLegGroup.add(leftLegMesh);
  // Shoe
  const shoeGeo = new THREE.BoxGeometry(0.12, 0.08, 0.18);
  const leftShoe = new THREE.Mesh(shoeGeo, shoesMat);
  leftShoe.position.set(0, -0.58, 0.04);
  leftLegGroup.add(leftShoe);
  avatarGroup.add(leftLegGroup);

  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.12, 0.65, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
  rightLegGroup.add(rightLegMesh);
  const rightShoe = new THREE.Mesh(shoeGeo, shoesMat);
  rightShoe.position.set(0, -0.58, 0.04);
  rightLegGroup.add(rightShoe);
  avatarGroup.add(rightLegGroup);

  return {
    group: avatarGroup,
    head: headGroup,
    hair: hairGroup,
    eyes: eyesGroup,
    eyebrows: { left: leftBrow, right: rightBrow },
    mouth,
    cheeks: { left: cheekL, right: cheekR },
    torso,
    arms: { left: leftArmGroup, right: rightArmGroup },
    legs: { left: leftLegGroup, right: rightLegGroup },
    glasses: glassesGroup,
  };
}
