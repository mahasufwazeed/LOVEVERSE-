import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { Colors, Radii } from '../../constants/theme';
import { AvatarConfig, CoupleInteraction, FacialExpression } from '../../types';
import { createBitmojiAvatar, AvatarParts } from '../avatars/AvatarRenderer';
import { FacialExpressionController } from '../avatars/FacialExpressionController';
import { AvatarAnimationController } from '../avatars/AvatarAnimationController';

interface CoupleAvatarSceneProps {
  myConfig?: AvatarConfig;
  partnerConfig?: AvatarConfig;
  interaction?: CoupleInteraction;
  myExpression?: FacialExpression;
  partnerExpression?: FacialExpression;
  onInteractionComplete?: () => void;
}

const defaultUserConfig: AvatarConfig = {
  skinColor: '#FDDFB2',
  hairStyle: 'wavy',
  hairColor: '#4A2B11',
  eyeColor: '#3E2723',
  shirtColor: '#FF5C8A',
  pantsColor: '#292238',
  expression: 'happy',
};

const defaultPartnerConfig: AvatarConfig = {
  skinColor: '#F5C6A5',
  hairStyle: 'short',
  hairColor: '#1E1E24',
  eyeColor: '#2B2D42',
  shirtColor: '#6C4AB6',
  pantsColor: '#3D348B',
  expression: 'loving',
};

export function CoupleAvatarScene({
  myConfig = defaultUserConfig,
  partnerConfig = defaultPartnerConfig,
  interaction = 'idle',
  myExpression = 'happy',
  partnerExpression = 'loving',
  onInteractionComplete,
}: CoupleAvatarSceneProps) {
  const animFrameRef = useRef<number | null>(null);

  // Controller references
  const animControllerRef = useRef<AvatarAnimationController | null>(null);
  const myExprControllerRef = useRef<FacialExpressionController | null>(null);
  const partnerExprControllerRef = useRef<FacialExpressionController | null>(null);
  const heartsParticleGroupRef = useRef<THREE.Group | null>(null);

  const activeInteraction = useRef(interaction);
  const activeMyExpr = useRef(myExpression);
  const activePartnerExpr = useRef(partnerExpression);

  useEffect(() => {
    activeInteraction.current = interaction;
    if (animControllerRef.current) {
      animControllerRef.current.setInteraction(interaction);
    }
  }, [interaction]);

  useEffect(() => {
    activeMyExpr.current = myExpression;
    if (myExprControllerRef.current) {
      myExprControllerRef.current.setExpression(myExpression);
    }
  }, [myExpression]);

  useEffect(() => {
    activePartnerExpr.current = partnerExpression;
    if (partnerExprControllerRef.current) {
      partnerExprControllerRef.current.setExpression(partnerExpression);
    }
  }, [partnerExpression]);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FFF6FA');

    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    camera.position.set(0, 3.6, 6.2);
    camera.lookAt(0, 0.9, -0.2);

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

    // 1. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xfff5f8, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 0.85);
    sunLight.position.set(4, 8, 5);
    scene.add(sunLight);

    const fairyLight = new THREE.PointLight(0xff9ebb, 1.2, 10);
    fairyLight.position.set(0, 2.8, -1.8);
    scene.add(fairyLight);

    // 2. Room Environment Construction
    // Floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.2, 5.6),
      new THREE.MeshLambertMaterial({ color: 0xecd5bd })
    );
    floor.position.y = -0.1;
    scene.add(floor);

    // Soft Romantic Oval Rug
    const rug = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.9, 0.04, 32),
      new THREE.MeshLambertMaterial({ color: 0xffe4ec })
    );
    rug.position.set(0, 0.02, 0.3);
    scene.add(rug);

    // Walls
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xfdf4f9 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 0.2), wallMat);
    backWall.position.set(0, 1.6, -2.7);
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 5.6), wallMat);
    leftWall.position.set(-3.2, 1.6, 0);
    scene.add(leftWall);

    // Couple Sofa (Center Back)
    const sofa = new THREE.Group();
    const sofaMat = new THREE.MeshLambertMaterial({ color: 0xb8a4ff });
    const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.45, 0.9), sofaMat);
    sofaBase.position.set(0, 0.32, -1.5);
    sofa.add(sofaBase);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.3), sofaMat);
    sofaBack.position.set(0, 0.85, -1.85);
    sofa.add(sofaBack);

    // Heart Cushions
    const pillowMat = new THREE.MeshLambertMaterial({ color: 0xff5c8a });
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.16), pillowMat);
    pL.position.set(-0.75, 0.65, -1.7);
    pL.rotation.z = 0.2;
    sofa.add(pL);

    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.16), pillowMat);
    pR.position.set(0.75, 0.65, -1.7);
    pR.rotation.z = -0.2;
    sofa.add(pR);
    scene.add(sofa);

    // Couple Bed (Left Side)
    const bed = new THREE.Group();
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 2.2), new THREE.MeshLambertMaterial({ color: 0xd9b99b }));
    bedFrame.position.set(-2.2, 0.2, 0.2);
    bed.add(bedFrame);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 2.1), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    mattress.position.set(-2.2, 0.45, 0.2);
    bed.add(mattress);

    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.26, 1.4), new THREE.MeshLambertMaterial({ color: 0xff85a1 }));
    blanket.position.set(-2.2, 0.46, 0.55);
    bed.add(blanket);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 0.45), new THREE.MeshLambertMaterial({ color: 0xfff0f5 }));
    pillow.position.set(-2.2, 0.62, -0.6);
    bed.add(pillow);
    scene.add(bed);

    // Wall Smart TV (Right Back)
    const tvGroup = new THREE.Group();
    const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.08), new THREE.MeshLambertMaterial({ color: 0x1a1a24 }));
    tvFrame.position.set(1.6, 2.2, -2.58);
    tvGroup.add(tvFrame);

    const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.88), new THREE.MeshBasicMaterial({ color: 0xffb3c6 }));
    tvScreen.position.set(1.6, 2.2, -2.53);
    tvGroup.add(tvScreen);
    scene.add(tvGroup);

    // Fairy Light Strings Along Wall
    const fairyGroup = new THREE.Group();
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    for (let i = 0; i < 9; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), bulbMat);
      bulb.position.set(-2.0 + i * 0.5, 2.95 + Math.sin(i * 0.8) * 0.12, -2.58);
      fairyGroup.add(bulb);
    }
    scene.add(fairyGroup);

    // 3. Render Avatars
    const userParts = createBitmojiAvatar(myConfig, false);
    const partnerParts = createBitmojiAvatar(partnerConfig, true);

    scene.add(userParts.group);
    scene.add(partnerParts.group);

    // Attach Controllers
    const animController = new AvatarAnimationController(userParts, partnerParts);
    animControllerRef.current = animController;

    const myExprController = new FacialExpressionController(userParts);
    myExprController.setExpression(myExpression);
    myExprControllerRef.current = myExprController;

    const partnerExprController = new FacialExpressionController(partnerParts);
    partnerExprController.setExpression(partnerExpression);
    partnerExprControllerRef.current = partnerExprController;

    // 4. 3D Floating Heart Particle System
    const heartsGroup = new THREE.Group();
    const heartMeshMat = new THREE.MeshBasicMaterial({ color: 0xff2a6d });
    for (let i = 0; i < 20; i++) {
      const hGeo = new THREE.SphereGeometry(0.07, 8, 8);
      hGeo.scale(1.2, 1, 0.5);
      const h = new THREE.Mesh(hGeo, heartMeshMat);
      h.position.set((Math.random() - 0.5) * 1.6, Math.random() * 2.2 + 0.4, (Math.random() - 0.5) * 0.8);
      h.visible = false;
      heartsGroup.add(h);
    }
    scene.add(heartsGroup);
    heartsParticleGroupRef.current = heartsGroup;

    // 5. Render Loop
    let clock = new THREE.Clock();

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Update couple skeletal animations
      if (animControllerRef.current) {
        animControllerRef.current.update(delta, elapsedTime);
      }

      // Handle Particle effects for hugs/kisses
      const curInter = activeInteraction.current;
      const isRomantic = ['hug', 'kiss', 'cuddle', 'flying_hearts', 'blow_kiss', 'forehead_kiss'].includes(curInter);

      if (heartsParticleGroupRef.current) {
        heartsParticleGroupRef.current.children.forEach((h, i) => {
          if (isRomantic) {
            h.visible = true;
            h.position.y += 0.016;
            h.position.x += Math.sin(elapsedTime * 3 + i) * 0.006;
            if (h.position.y > 2.8) {
              h.position.y = 0.6;
              h.position.x = (Math.random() - 0.5) * 1.4;
            }
          } else {
            h.visible = false;
          }
        });
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    render();
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
    height: 400,
    backgroundColor: '#FFF6FA',
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  glView: {
    flex: 1,
  },
});
