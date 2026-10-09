import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { Colors, Radii } from '../../constants/theme';
import { AvatarConfig, AvatarAnimationState } from '../../types';

interface ThreeRoomCanvasProps {
  myConfig?: AvatarConfig;
  partnerConfig?: AvatarConfig;
  myAnimation?: AvatarAnimationState;
  partnerAnimation?: AvatarAnimationState;
  onRoomTap?: (point: { x: number; z: number }) => void;
}

const defaultAvatar: AvatarConfig = {
  skinColor: '#FDDFB2',
  hairStyle: 'wavy',
  hairColor: '#4A2B11',
  eyeColor: '#3E2723',
  shirtColor: '#FF5C8A',
  pantsColor: '#292238',
  accessory: 'none',
};

const defaultPartnerAvatar: AvatarConfig = {
  skinColor: '#F5C6A5',
  hairStyle: 'short',
  hairColor: '#1E1E24',
  eyeColor: '#2B2D42',
  shirtColor: '#6C4AB6',
  pantsColor: '#3D348B',
  accessory: 'none',
};

export function ThreeRoomCanvas({
  myConfig = defaultAvatar,
  partnerConfig = defaultPartnerAvatar,
  myAnimation = 'idle',
  partnerAnimation = 'idle',
  onRoomTap,
}: ThreeRoomCanvasProps) {
  const animFrameRef = useRef<number | null>(null);

  // References to dynamic avatar 3D groups
  const myAvatarGroup = useRef<THREE.Group | null>(null);
  const partnerAvatarGroup = useRef<THREE.Group | null>(null);
  const heartsGroup = useRef<THREE.Group | null>(null);
  const myCheeks = useRef<THREE.Mesh[]>([]);
  const partnerCheeks = useRef<THREE.Mesh[]>([]);
  const myArms = useRef<{ left: THREE.Group; right: THREE.Group } | null>(null);
  const partnerArms = useRef<{ left: THREE.Group; right: THREE.Group } | null>(null);

  const currentAnimState = useRef({
    my: myAnimation,
    partner: partnerAnimation,
  });

  useEffect(() => {
    currentAnimState.current = {
      my: myAnimation,
      partner: partnerAnimation,
    };
  }, [myAnimation, partnerAnimation]);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FFF5FA');

    // 2. Camera setup (Romantic isometric perspective)
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    camera.position.set(0, 3.8, 5.8);
    camera.lookAt(0, 0.9, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        clientHeight: gl.drawingBufferHeight,
        clientWidth: gl.drawingBufferWidth,
        getContext: () => gl,
      } as any,
      context: gl as any,
      antialias: true,
    });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff0f5, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff8e7, 0.9);
    dirLight.position.set(4, 7, 5);
    scene.add(dirLight);

    const lampLight = new THREE.PointLight(0xffc2d1, 1.2, 8);
    lampLight.position.set(-2, 2.2, -1.8);
    scene.add(lampLight);

    // 5. Room Environment Construction
    // 5.1 Hardwood Floor
    const floorGeo = new THREE.BoxGeometry(5.4, 0.2, 4.8);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xe8cfb0 }); // Warm parquet
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    scene.add(floor);

    // 5.2 Romantic Pastel Rug
    const rugGeo = new THREE.CylinderGeometry(1.65, 1.65, 0.04, 32);
    const rugMat = new THREE.MeshLambertMaterial({ color: 0xffe4ec }); // Soft pink
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.position.set(0, 0.02, 0.2);
    scene.add(rug);

    // 5.3 Walls
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xfdf2f8 });
    // Back wall
    const backWallGeo = new THREE.BoxGeometry(5.4, 3.2, 0.2);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 1.5, -2.4);
    scene.add(backWall);

    // Left wall
    const leftWallGeo = new THREE.BoxGeometry(0.2, 3.2, 4.8);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-2.7, 1.5, 0);
    scene.add(leftWall);

    // 5.4 Comfy Couple Sofa (Back of room)
    const sofaGroup = new THREE.Group();
    const sofaMat = new THREE.MeshLambertMaterial({ color: 0xb8a4ff }); // Lavender sofa
    const seatGeo = new THREE.BoxGeometry(2.4, 0.45, 0.9);
    const seat = new THREE.Mesh(seatGeo, sofaMat);
    seat.position.set(0, 0.35, -1.5);
    sofaGroup.add(seat);

    const backrestGeo = new THREE.BoxGeometry(2.4, 0.75, 0.3);
    const backrest = new THREE.Mesh(backrestGeo, sofaMat);
    backrest.position.set(0, 0.85, -1.85);
    sofaGroup.add(backrest);

    // Pillows
    const pillowMat = new THREE.MeshLambertMaterial({ color: 0xff5c8a });
    const pillowGeo = new THREE.BoxGeometry(0.4, 0.35, 0.15);
    const pillowL = new THREE.Mesh(pillowGeo, pillowMat);
    pillowL.position.set(-0.8, 0.65, -1.7);
    pillowL.rotation.z = 0.2;
    sofaGroup.add(pillowL);

    const pillowR = new THREE.Mesh(pillowGeo, pillowMat);
    pillowR.position.set(0.8, 0.65, -1.7);
    pillowR.rotation.z = -0.2;
    sofaGroup.add(pillowR);
    scene.add(sofaGroup);

    // 5.5 Couple Photo Frame on Wall
    const frameGeo = new THREE.BoxGeometry(1.0, 0.75, 0.05);
    const frameMat = new THREE.MeshLambertMaterial({ color: 0xffd166 }); // Gold frame
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 2.2, -2.28);
    scene.add(frame);

    // Photo inside frame (Stylized heart image canvas texture)
    const photoGeo = new THREE.PlaneGeometry(0.85, 0.6);
    const photoMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3 });
    const photo = new THREE.Mesh(photoGeo, photoMat);
    photo.position.set(0, 2.2, -2.24);
    scene.add(photo);

    // 5.6 Indoor Plant in Cute Pot
    const potGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.4, 16);
    const potMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(2.1, 0.2, -1.8);
    scene.add(pot);

    const plantMat = new THREE.MeshLambertMaterial({ color: 0x48bb78 });
    for (let i = 0; i < 5; i++) {
      const leafGeo = new THREE.SphereGeometry(0.18, 8, 8);
      leafGeo.scale(1, 1.6, 0.4);
      const leaf = new THREE.Mesh(leafGeo, plantMat);
      leaf.position.set(2.1 + (i % 2 === 0 ? 0.08 : -0.08), 0.45 + i * 0.06, -1.8);
      leaf.rotation.z = (i - 2) * 0.3;
      scene.add(leaf);
    }

    // 6. 3D Cartoon Avatar Builder Function
    const buildAvatar = (config: AvatarConfig, isUser: boolean) => {
      const avatarGroup = new THREE.Group();

      // Materials based on config
      const skinMat = new THREE.MeshLambertMaterial({ color: config.skinColor });
      const hairMat = new THREE.MeshLambertMaterial({ color: config.hairColor });
      const eyeMat = new THREE.MeshBasicMaterial({ color: config.eyeColor });
      const shirtMat = new THREE.MeshLambertMaterial({ color: config.shirtColor });
      const pantsMat = new THREE.MeshLambertMaterial({ color: config.pantsColor });
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xff85a1, transparent: true, opacity: 0.6 });

      // Head
      const headGeo = new THREE.SphereGeometry(0.32, 24, 24);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.35;
      avatarGroup.add(head);

      // Hair
      const hairGeo = new THREE.SphereGeometry(0.34, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 1.42;
      avatarGroup.add(hair);

      if (config.hairStyle === 'wavy' || config.hairStyle === 'long') {
        const sideGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.4, 12);
        const hairL = new THREE.Mesh(sideGeo, hairMat);
        hairL.position.set(-0.28, 1.25, 0.05);
        avatarGroup.add(hairL);

        const hairR = new THREE.Mesh(sideGeo, hairMat);
        hairR.position.set(0.28, 1.25, 0.05);
        avatarGroup.add(hairR);
      }

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.045, 12, 12);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.11, 1.38, 0.28);
      avatarGroup.add(eyeL);

      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(0.11, 1.38, 0.28);
      avatarGroup.add(eyeR);

      // Cheeks (Blushing)
      const cheekGeo = new THREE.SphereGeometry(0.05, 12, 12);
      cheekGeo.scale(1.2, 0.8, 0.4);
      const cheekL = new THREE.Mesh(cheekGeo, blushMat);
      cheekL.position.set(-0.18, 1.28, 0.26);
      avatarGroup.add(cheekL);

      const cheekR = new THREE.Mesh(cheekGeo, blushMat);
      cheekR.position.set(0.18, 1.28, 0.26);
      avatarGroup.add(cheekR);

      if (isUser) {
        myCheeks.current = [cheekL, cheekR];
      } else {
        partnerCheeks.current = [cheekL, cheekR];
      }

      // Torso
      const torsoGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.52, 16);
      const torso = new THREE.Mesh(torsoGeo, shirtMat);
      torso.position.y = 0.92;
      avatarGroup.add(torso);

      // Arms
      const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.42, 12);
      armGeo.translate(0, -0.21, 0);

      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(-0.28, 1.12, 0);
      const leftArmMesh = new THREE.Mesh(armGeo, shirtMat);
      leftArmGroup.add(leftArmMesh);
      avatarGroup.add(leftArmGroup);

      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(0.28, 1.12, 0);
      const rightArmMesh = new THREE.Mesh(armGeo, shirtMat);
      rightArmGroup.add(rightArmMesh);
      avatarGroup.add(rightArmGroup);

      if (isUser) {
        myArms.current = { left: leftArmGroup, right: rightArmGroup };
      } else {
        partnerArms.current = { left: leftArmGroup, right: rightArmGroup };
      }

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.55, 12);
      const legL = new THREE.Mesh(legGeo, pantsMat);
      legL.position.set(-0.11, 0.4, 0);
      avatarGroup.add(legL);

      const legR = new THREE.Mesh(legGeo, pantsMat);
      legR.position.set(0.11, 0.4, 0);
      avatarGroup.add(legR);

      return avatarGroup;
    };

    // Instantiate User Avatar (Left)
    const myAvatar = buildAvatar(myConfig, true);
    myAvatar.position.set(-0.65, 0, 0.2);
    myAvatar.rotation.y = 0.35;
    scene.add(myAvatar);
    myAvatarGroup.current = myAvatar;

    // Instantiate Partner Avatar (Right)
    const partnerAvatar = buildAvatar(partnerConfig, false);
    partnerAvatar.position.set(0.65, 0, 0.2);
    partnerAvatar.rotation.y = -0.35;
    scene.add(partnerAvatar);
    partnerAvatarGroup.current = partnerAvatar;

    // 7. 3D Floating Hearts Particle System (for Hug & Kiss)
    const hGroup = new THREE.Group();
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xff2a6d });
    for (let i = 0; i < 16; i++) {
      const heartShapeGeo = new THREE.SphereGeometry(0.06, 8, 8);
      heartShapeGeo.scale(1.2, 1, 0.6);
      const hMesh = new THREE.Mesh(heartShapeGeo, heartMat);
      hMesh.position.set((Math.random() - 0.5) * 1.5, Math.random() * 2 + 0.5, (Math.random() - 0.5) * 0.8);
      hMesh.visible = false;
      hGroup.add(hMesh);
    }
    scene.add(hGroup);
    heartsGroup.current = hGroup;

    // 8. Animation & Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const myAnim = currentAnimState.current.my;
      const partnerAnim = currentAnimState.current.partner;

      // Handle Hug & Kiss coordinated positioning
      if (myAnim === 'hug' || myAnim === 'kiss') {
        // Avatars step close together towards center
        if (myAvatarGroup.current && partnerAvatarGroup.current) {
          myAvatarGroup.current.position.x = THREE.MathUtils.lerp(myAvatarGroup.current.position.x, -0.22, 0.08);
          partnerAvatarGroup.current.position.x = THREE.MathUtils.lerp(partnerAvatarGroup.current.position.x, 0.22, 0.08);

          // Face each other
          myAvatarGroup.current.rotation.y = THREE.MathUtils.lerp(myAvatarGroup.current.rotation.y, Math.PI / 2, 0.08);
          partnerAvatarGroup.current.rotation.y = THREE.MathUtils.lerp(partnerAvatarGroup.current.rotation.y, -Math.PI / 2, 0.08);

          // Arm wrap around
          if (myArms.current && partnerArms.current) {
            myArms.current.right.rotation.z = -1.2;
            myArms.current.right.rotation.x = 0.8;
            partnerArms.current.left.rotation.z = 1.2;
            partnerArms.current.left.rotation.x = 0.8;
          }

          // Blushing cheeks color intensity boost
          myCheeks.current.forEach((c) => ((c.material as THREE.MeshBasicMaterial).opacity = 0.95));
          partnerCheeks.current.forEach((c) => ((c.material as THREE.MeshBasicMaterial).opacity = 0.95));

          // Animate floating hearts
          if (heartsGroup.current) {
            heartsGroup.current.children.forEach((h, i) => {
              h.visible = true;
              h.position.y += 0.015;
              h.position.x += Math.sin(elapsedTime * 3 + i) * 0.005;
              if (h.position.y > 2.6) h.position.y = 0.8;
            });
          }
        }
      } else {
        // Return to resting positions
        if (myAvatarGroup.current && partnerAvatarGroup.current) {
          myAvatarGroup.current.position.x = THREE.MathUtils.lerp(myAvatarGroup.current.position.x, -0.65, 0.05);
          partnerAvatarGroup.current.position.x = THREE.MathUtils.lerp(partnerAvatarGroup.current.position.x, 0.65, 0.05);

          myAvatarGroup.current.rotation.y = THREE.MathUtils.lerp(myAvatarGroup.current.rotation.y, 0.35, 0.05);
          partnerAvatarGroup.current.rotation.y = THREE.MathUtils.lerp(partnerAvatarGroup.current.rotation.y, -0.35, 0.05);

          // Natural breathing idle animation
          const breath = Math.sin(elapsedTime * 2.5) * 0.025;
          myAvatarGroup.current.position.y = breath;
          partnerAvatarGroup.current.position.y = Math.sin(elapsedTime * 2.5 + 0.8) * 0.025;

          // Reset arms
          if (myArms.current && partnerArms.current) {
            myArms.current.right.rotation.set(0, 0, 0);
            partnerArms.current.left.rotation.set(0, 0, 0);
          }

          // Reset cheeks
          myCheeks.current.forEach((c) => ((c.material as THREE.MeshBasicMaterial).opacity = 0.6));
          partnerCheeks.current.forEach((c) => ((c.material as THREE.MeshBasicMaterial).opacity = 0.6));

          // Hide hearts
          if (heartsGroup.current) {
            heartsGroup.current.children.forEach((h) => (h.visible = false));
          }
        }
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 380,
    backgroundColor: '#FFF5FA',
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  glView: {
    flex: 1,
  },
});
