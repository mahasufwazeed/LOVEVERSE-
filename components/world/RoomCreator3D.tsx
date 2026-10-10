import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { useRoomStore } from '../../stores/roomStore';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import { useWorldStore } from '../../stores/worldStore';
import { FurnitureMeshBuilder } from './furniture/FurnitureMeshBuilder';
import { RoomCameraController } from './roomEngine/RoomCameraController';
import { FLOOR_COLORS, LIGHTING_COLORS, ROOM_TEMPLATES } from '../../constants/roomTemplates';
import { FURNITURE_CATALOG, CATEGORY_LABELS } from '../../constants/furnitureCatalog';
import { createBitmojiAvatar } from '../avatars/AvatarRenderer';
import { FacialExpressionController } from '../avatars/FacialExpressionController';
import { AvatarAnimationController } from '../avatars/AvatarAnimationController';
import { ProjectileHearts3D } from './ProjectileHearts3D';
import { CameraPreset, FurnitureCatalogItem, RoomObject } from '../../types/room';

interface RoomCreator3DProps {
  onOpenWatchParty?: () => void;
  onOpenPhotoPicker?: () => void;
}

export function RoomCreator3D({ onOpenWatchParty, onOpenPhotoPicker }: RoomCreator3DProps) {
  const {
    room,
    mode,
    selectedObjectId,
    history,
    future,
    saveStatus,
    setMode,
    selectObject,
    applyTemplate,
    addObject,
    moveObject,
    rotateObject,
    updateObjectColor,
    removeObject,
    updateRoomSettings,
    undo,
    redo,
    saveRoom,
  } = useRoomStore();

  const { profile } = useAuthStore();
  const { partner } = useCoupleStore();
  const { currentInteraction, interactionTimestamp, myExpression, partnerExpression } = useWorldStore();

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeCatalogCategory, setActiveCatalogCategory] = useState<string>('bedroom');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraControllerRef = useRef<RoomCameraController>(new RoomCameraController('isometric'));
  const animFrameRef = useRef<number | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Lighting and Environment References
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const floorMatRef = useRef<THREE.MeshLambertMaterial | null>(null);
  const wallMatRef = useRef<THREE.MeshLambertMaterial | null>(null);
  const backWallRef = useRef<THREE.Mesh | null>(null);
  const leftWallRef = useRef<THREE.Mesh | null>(null);
  const windowFrameRef = useRef<THREE.Mesh | null>(null);
  const windowSkyRef = useRef<THREE.Mesh | null>(null);
  const skyMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  // Avatar Controllers
  const animControllerRef = useRef<AvatarAnimationController | null>(null);
  const myExprControllerRef = useRef<FacialExpressionController | null>(null);
  const partnerExprControllerRef = useRef<FacialExpressionController | null>(null);

  // Touch tracking for camera drag
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Synchronize Camera Preset
  useEffect(() => {
    cameraControllerRef.current.setPreset(cameraPreset);
  }, [cameraPreset]);

  // Synchronize 3D Avatar Animations when interaction changes
  useEffect(() => {
    if (animControllerRef.current) {
      animControllerRef.current.setInteraction(currentInteraction);
      if (currentInteraction !== 'idle') {
        cameraControllerRef.current.setPreset('couple_focus');
      } else {
        cameraControllerRef.current.setPreset(cameraPreset);
      }
    }
  }, [currentInteraction, interactionTimestamp]);

  // Synchronize Facial Expressions
  useEffect(() => {
    if (myExprControllerRef.current) {
      myExprControllerRef.current.setExpression(myExpression);
    }
  }, [myExpression]);

  useEffect(() => {
    if (partnerExprControllerRef.current) {
      partnerExprControllerRef.current.setExpression(partnerExpression);
    }
  }, [partnerExpression]);

  // Synchronize Wall Color
  useEffect(() => {
    if (wallMatRef.current && room.wallColor) {
      const hex = parseInt(room.wallColor.replace('#', '0x'), 16) || 0xfdf0ed;
      wallMatRef.current.color.set(hex);
    }
  }, [room.wallColor]);

  // Synchronize Floor Material
  useEffect(() => {
    if (floorMatRef.current && room.floorMaterial) {
      const floorColor = FLOOR_COLORS[room.floorMaterial] || FLOOR_COLORS.hardwood_oak;
      floorMatRef.current.color.set(floorColor);
    }
  }, [room.floorMaterial]);

  // Synchronize Atmosphere & Lighting
  useEffect(() => {
    const lightCfg = LIGHTING_COLORS[room.lightingTheme] || LIGHTING_COLORS.warm_sunset;
    if (ambientLightRef.current) {
      ambientLightRef.current.color.set(lightCfg.ambient);
      ambientLightRef.current.intensity = lightCfg.ambientInt;
    }
    if (dirLightRef.current) {
      dirLightRef.current.color.set(lightCfg.dir);
      dirLightRef.current.intensity = lightCfg.dirInt;
    }
    if (pointLightRef.current) {
      pointLightRef.current.color.set(lightCfg.point);
    }
  }, [room.lightingTheme]);

  // Synchronize Window View
  useEffect(() => {
    const sceneryColors: Record<string, number> = {
      city_sunset: 0xffaa66,
      beach_ocean: 0x48cae4,
      mountain_stars: 0x1d3557,
      fairy_forest: 0x52b788,
      rainy_window: 0x6c757d,
    };
    if (skyMatRef.current) {
      skyMatRef.current.color.set(sceneryColors[room.windowScenery] || 0xffaa66);
    }
  }, [room.windowScenery]);

  // Synchronize Room Dimensions (e.g. when template changes)
  useEffect(() => {
    if (floorMeshRef.current) {
      floorMeshRef.current.geometry.dispose();
      floorMeshRef.current.geometry = new THREE.BoxGeometry(room.dimensions.width, 0.2, room.dimensions.depth);
    }
    if (backWallRef.current) {
      backWallRef.current.geometry.dispose();
      backWallRef.current.geometry = new THREE.BoxGeometry(room.dimensions.width, room.dimensions.height, 0.2);
      backWallRef.current.position.set(0, room.dimensions.height / 2, -room.dimensions.depth / 2);
    }
    if (leftWallRef.current) {
      leftWallRef.current.geometry.dispose();
      leftWallRef.current.geometry = new THREE.BoxGeometry(0.2, room.dimensions.height, room.dimensions.depth);
      leftWallRef.current.position.set(-room.dimensions.width / 2, room.dimensions.height / 2, 0);
    }
    if (windowFrameRef.current) {
      windowFrameRef.current.position.set(0, 2.0, -room.dimensions.depth / 2 + 0.12);
    }
    if (windowSkyRef.current) {
      windowSkyRef.current.position.set(0, 2.0, -room.dimensions.depth / 2 + 0.16);
    }
  }, [room.dimensions.width, room.dimensions.height, room.dimensions.depth]);

  // Synchronize Scene Furniture whenever room.objects or selectedObjectId changes
  useEffect(() => {
    if (!furnitureGroupRef.current) return;
    const group = furnitureGroupRef.current;

    // Clear old meshes
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Rebuild furniture
    room.objects.forEach((obj) => {
      const isSelected = mode === 'edit' && obj.id === selectedObjectId;
      const mesh = FurnitureMeshBuilder.buildFurniture(obj, isSelected);
      group.add(mesh);
    });

    if (animControllerRef.current) {
      animControllerRef.current.setRoomObjects(room.objects);
    }
  }, [room.objects, selectedObjectId, mode]);

  // Toggle Grid in Edit Mode
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = mode === 'edit';
    }
  }, [mode]);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    cameraRef.current = camera;
    cameraControllerRef.current.updateCamera(camera);

    const renderer = (gl as any).canvas
      ? new THREE.WebGLRenderer({ canvas: (gl as any).canvas, antialias: true, alpha: true })
      : new THREE.WebGLRenderer({
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
    rendererRef.current = renderer;

    // Lighting Setup
    const lightCfg = LIGHTING_COLORS[room.lightingTheme] || LIGHTING_COLORS.warm_sunset;
    const ambientLight = new THREE.AmbientLight(lightCfg.ambient, lightCfg.ambientInt);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(lightCfg.dir, lightCfg.dirInt);
    dirLight.position.set(5, 9, 6);
    dirLightRef.current = dirLight;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(lightCfg.point, 1.2, 12);
    pointLight.position.set(0, 3.2, 0);
    pointLightRef.current = pointLight;
    scene.add(pointLight);

    // 1. Floor & Walls
    const floorColor = FLOOR_COLORS[room.floorMaterial] || FLOOR_COLORS.hardwood_oak;
    const floorMat = new THREE.MeshLambertMaterial({ color: floorColor });
    floorMatRef.current = floorMat;

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(room.dimensions.width, 0.2, room.dimensions.depth),
      floorMat
    );
    floor.position.y = -0.1;
    floorMeshRef.current = floor;
    scene.add(floor);

    // Grid Overlay for Edit Mode
    const gridHelper = new THREE.GridHelper(
      Math.max(room.dimensions.width, room.dimensions.depth),
      Math.max(room.dimensions.width, room.dimensions.depth) * 2,
      0xff6b8b,
      0xe0e0e0
    );
    gridHelper.position.y = 0.01;
    gridHelper.visible = mode === 'edit';
    gridHelperRef.current = gridHelper;
    scene.add(gridHelper);

    // Back Wall
    const wallHex = parseInt(room.wallColor.replace('#', '0x'), 16) || 0xfdf0ed;
    const wallMat = new THREE.MeshLambertMaterial({ color: wallHex });
    wallMatRef.current = wallMat;

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(room.dimensions.width, room.dimensions.height, 0.2),
      wallMat
    );
    backWall.position.set(0, room.dimensions.height / 2, -room.dimensions.depth / 2);
    backWallRef.current = backWall;
    scene.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, room.dimensions.height, room.dimensions.depth),
      wallMat
    );
    leftWall.position.set(-room.dimensions.width / 2, room.dimensions.height / 2, 0);
    leftWallRef.current = leftWall;
    scene.add(leftWall);

    // Window with scenery
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.4, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    windowFrame.position.set(0, 2.0, -room.dimensions.depth / 2 + 0.12);
    windowFrameRef.current = windowFrame;

    const sceneryColors: Record<string, number> = {
      city_sunset: 0xffaa66,
      beach_ocean: 0x48cae4,
      mountain_stars: 0x1d3557,
      fairy_forest: 0x52b788,
      rainy_window: 0x6c757d,
    };
    const skyMat = new THREE.MeshBasicMaterial({ color: sceneryColors[room.windowScenery] || 0xffaa66 });
    skyMatRef.current = skyMat;

    const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), skyMat);
    sky.position.set(0, 2.0, -room.dimensions.depth / 2 + 0.16);
    windowSkyRef.current = sky;
    scene.add(windowFrame, sky);

    // 2. Furniture Container
    const furnitureGroup = new THREE.Group();
    furnitureGroupRef.current = furnitureGroup;
    scene.add(furnitureGroup);

    // Populate initial objects
    room.objects.forEach((obj) => {
      const mesh = FurnitureMeshBuilder.buildFurniture(obj, mode === 'edit' && obj.id === selectedObjectId);
      furnitureGroup.add(mesh);
    });

    // 3. 3D Avatars
    const userCfg = profile?.avatarConfig || {
      skinColor: '#FDDFB2',
      hairStyle: 'wavy' as const,
      hairColor: '#4A2B11',
      eyeColor: '#3E2723',
      shirtColor: '#FF5C8A',
      pantsColor: '#292238',
      accessory: 'glasses' as const,
      expression: 'happy' as const,
    };

    const partnerCfg = partner?.avatarConfig || {
      skinColor: '#F5C6A5',
      hairStyle: 'short' as const,
      hairColor: '#1E1E24',
      eyeColor: '#2B2D42',
      shirtColor: '#6C4AB6',
      pantsColor: '#3D348B',
      accessory: 'none' as const,
      expression: 'loving' as const,
    };

    const myAvatar = createBitmojiAvatar(userCfg);
    const partnerAvatar = createBitmojiAvatar(partnerCfg);

    // Initial couple positioning near sofa or bed
    myAvatar.group.position.set(-0.5, 0, 0.4);
    partnerAvatar.group.position.set(0.5, 0, 0.4);

    scene.add(myAvatar.group, partnerAvatar.group);

    // 3D Flying Heart Projectile System
    const projSystem = new ProjectileHearts3D(scene);

    // Animation & Facial Expression Controllers
    const myExpr = new FacialExpressionController(myAvatar);
    const partnerExpr = new FacialExpressionController(partnerAvatar);
    myExpr.setExpression(myExpression);
    partnerExpr.setExpression(partnerExpression);
    myExprControllerRef.current = myExpr;
    partnerExprControllerRef.current = partnerExpr;

    const animController = new AvatarAnimationController(myAvatar, partnerAvatar, room.objects);
    animController.setFacialControllers(myExpr, partnerExpr);
    animController.setProjectileSystem(projSystem);
    animController.setInteraction(currentInteraction);
    animControllerRef.current = animController;

    // 4. Render Loop
    let clock = new THREE.Clock();

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update couple kinematics & animation state machine
      if (animControllerRef.current) {
        animControllerRef.current.update(delta, elapsed);
      }

      // Update 3D projectile hearts
      projSystem.update(delta);

      // Update Camera
      if (cameraRef.current) {
        cameraControllerRef.current.updateCamera(cameraRef.current);
      }

      renderer.render(scene, camera);

      if (typeof (gl as any).endFrameEXP === 'function') {
        (gl as any).endFrameEXP();
      }
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

  // Handle Drag on Screen to Orbit Camera (Touch & Desktop Mouse)
  const handleTouchStart = (evt: any) => {
    const pageX = evt.nativeEvent?.pageX ?? evt.pageX;
    const pageY = evt.nativeEvent?.pageY ?? evt.pageY;
    if (pageX != null && pageY != null) {
      lastTouchRef.current = { x: pageX, y: pageY };
    }
  };

  const handleTouchMove = (evt: any) => {
    const pageX = evt.nativeEvent?.pageX ?? evt.pageX;
    const pageY = evt.nativeEvent?.pageY ?? evt.pageY;
    if (pageX != null && pageY != null && lastTouchRef.current) {
      const deltaX = (pageX - lastTouchRef.current.x) * 0.007;
      const deltaY = (pageY - lastTouchRef.current.y) * 0.007;
      cameraControllerRef.current.rotate(-deltaX, deltaY);
    }
    if (pageX != null && pageY != null) {
      lastTouchRef.current = { x: pageX, y: pageY };
    }
  };

  const handleTouchEnd = () => {
    lastTouchRef.current = null;
  };

  // Dynamically resize Three.js WebGL canvas and camera aspect when container layout changes
  const handleCanvasLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && rendererRef.current && cameraRef.current) {
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height, false);
    }
  };

  const selectedItem = room.objects.find((o) => o.id === selectedObjectId);
  const selectedCatalogItem = selectedItem
    ? FURNITURE_CATALOG.find((c) => c.catalogId === selectedItem.catalogId)
    : null;

  // Selected Object Movement
  const handleMoveObject = (dx: number, dz: number) => {
    if (!selectedItem) return;
    const newPos = {
      x: selectedItem.position.x + dx,
      y: selectedItem.position.y,
      z: selectedItem.position.z + dz,
    };
    const res = moveObject(selectedItem.id, newPos);
    if (!res.success && res.reason) {
      Alert.alert('Cannot Place Here', res.reason);
    }
  };

  const handleFurnitureInteraction = (item: RoomObject) => {
    if (item.interactionType === 'watch_tv') {
      if (onOpenWatchParty) onOpenWatchParty();
      else Alert.alert('Smart TV 📺', 'Opening synchronized couple Watch Party!');
    } else if (item.interactionType === 'photo') {
      if (onOpenPhotoPicker) onOpenPhotoPicker();
      else Alert.alert('Memory Photo 🖼️', 'Update your shared memory photograph.');
    } else if (item.interactionType === 'sit') {
      Alert.alert('Cuddle on Sofa 🛋️', 'You and your partner sat down together!');
    } else if (item.interactionType === 'sleep') {
      Alert.alert('Rest Together 🛏️', 'Goodnight! You both rest comfortably.');
    }
  };

  return (
    <View style={styles.container}>
      {/* 3D GLView Canvas with Touch & Mouse Drag Handling */}
      <View
        style={styles.canvasContainer}
        onLayout={handleCanvasLayout}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchEnd}
        {...({
          onPointerDown: handleTouchStart,
          onPointerMove: handleTouchMove,
          onPointerUp: handleTouchEnd,
          cursor: 'grab',
        } as any)}
      >
        <GLView style={styles.glView} onContextCreate={onContextCreate} />

        {/* Top Control Overlay */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.roomTitle}>{room.name} 🏡</Text>
            <Text style={styles.saveBadge}>
              {saveStatus === 'saving' ? 'Syncing...' : 'Synced with Partner ❤️'}
            </Text>
          </View>

          {/* Mode Switcher: Live vs Edit */}
          <View style={styles.modeToggle}>
            <Pressable
              onPress={() => setMode('live')}
              style={[styles.modeBtn, mode === 'live' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, mode === 'live' && styles.modeTextActive]}>
                Live 👫
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('edit')}
              style={[styles.modeBtn, mode === 'edit' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, mode === 'edit' && styles.modeTextActive]}>
                Design 🛠️
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Camera Quick Presets Floating Controls */}
        <View style={styles.cameraBar}>
          {(['isometric', 'front', 'top_down', 'couple_focus'] as CameraPreset[]).map((preset) => (
            <Pressable
              key={preset}
              onPress={() => setCameraPreset(preset)}
              style={[styles.cameraBtn, cameraPreset === preset && styles.cameraBtnActive]}
            >
              <Text style={styles.cameraIcon}>
                {preset === 'isometric' ? '📐' : preset === 'front' ? '👁️' : preset === 'top_down' ? '🗺️' : '❤️'}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => cameraControllerRef.current.zoom(0.85)}
            style={styles.cameraBtn}
          >
            <Text style={styles.cameraIcon}>➕</Text>
          </Pressable>
          <Pressable
            onPress={() => cameraControllerRef.current.zoom(1.15)}
            style={styles.cameraBtn}
          >
            <Text style={styles.cameraIcon}>➖</Text>
          </Pressable>
        </View>

        {/* EDIT MODE: Bottom Floating Toolbar */}
        {mode === 'edit' && (
          <View style={styles.editorToolbar}>
            {/* Action Bar (Add, Templates, Settings, Undo, Redo) */}
            <View style={styles.toolbarRow}>
              <Pressable onPress={() => setIsCatalogOpen(true)} style={styles.actionBtnPrimary}>
                <Text style={styles.actionBtnText}>➕ Add Furniture</Text>
              </Pressable>

              <Pressable onPress={() => setIsTemplatesOpen(true)} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>📋 Templates</Text>
              </Pressable>

              <Pressable onPress={() => setIsSettingsOpen(true)} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>🎨 Room</Text>
              </Pressable>

              <Pressable
                onPress={undo}
                disabled={history.length === 0}
                style={[styles.iconBtn, history.length === 0 && styles.iconBtnDisabled]}
              >
                <Text style={styles.iconBtnText}>↩️</Text>
              </Pressable>

              <Pressable
                onPress={redo}
                disabled={future.length === 0}
                style={[styles.iconBtn, future.length === 0 && styles.iconBtnDisabled]}
              >
                <Text style={styles.iconBtnText}>↪️</Text>
              </Pressable>
            </View>

            {/* Selected Object Control Inspector */}
            {selectedItem && selectedCatalogItem ? (
              <View style={styles.inspectorCard}>
                <View style={styles.inspectorHeader}>
                  <Text style={styles.inspectorTitle}>
                    {selectedCatalogItem.icon} {selectedCatalogItem.name}
                  </Text>
                  <Pressable onPress={() => selectObject(null)}>
                    <Text style={styles.closeInspectorText}>✕</Text>
                  </Pressable>
                </View>

                {/* Grid Movement Buttons */}
                <View style={styles.moveRow}>
                  <Text style={styles.moveLabel}>Nudge Grid (0.5m):</Text>
                  <Pressable onPress={() => handleMoveObject(0, -0.5)} style={styles.dirBtn}>
                    <Text style={styles.dirText}>▲</Text>
                  </Pressable>
                  <Pressable onPress={() => handleMoveObject(-0.5, 0)} style={styles.dirBtn}>
                    <Text style={styles.dirText}>◀</Text>
                  </Pressable>
                  <Pressable onPress={() => handleMoveObject(0.5, 0)} style={styles.dirBtn}>
                    <Text style={styles.dirText}>▶</Text>
                  </Pressable>
                  <Pressable onPress={() => handleMoveObject(0, 0.5)} style={styles.dirBtn}>
                    <Text style={styles.dirText}>▼</Text>
                  </Pressable>

                  {/* Rotate 90 deg */}
                  <Pressable
                    onPress={() => rotateObject(selectedItem.id)}
                    style={styles.rotateBtn}
                  >
                    <Text style={styles.rotateText}>🔄 Rotate</Text>
                  </Pressable>

                  {/* Delete Item */}
                  <Pressable
                    onPress={() => removeObject(selectedItem.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteText}>🗑️</Text>
                  </Pressable>
                </View>

                {/* Color Swatches */}
                {selectedCatalogItem.availableColors.length > 1 && (
                  <View style={styles.swatchRow}>
                    <Text style={styles.swatchLabel}>Color:</Text>
                    {selectedCatalogItem.availableColors.map((hex) => (
                      <Pressable
                        key={hex}
                        onPress={() => updateObjectColor(selectedItem.id, hex)}
                        style={[
                          styles.swatch,
                          { backgroundColor: hex },
                          selectedItem.color === hex && styles.swatchSelected,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>
                  💡 Tap any furniture or click "➕ Add Furniture" to customize your shared home!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* LIVE MODE: Interactive Quick Actions on Furniture in Room */}
        {mode === 'live' && (
          <View style={styles.liveInteractionsBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveScroll}>
              {room.objects
                .filter((o) => o.interactionType)
                .map((obj) => {
                  const cat = FURNITURE_CATALOG.find((c) => c.catalogId === obj.catalogId);
                  return (
                    <Pressable
                      key={obj.id}
                      onPress={() => handleFurnitureInteraction(obj)}
                      style={styles.liveChip}
                    >
                      <Text style={styles.liveChipIcon}>{cat?.icon || '✨'}</Text>
                      <Text style={styles.liveChipText}>Use {cat?.name}</Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* --- Catalog Modal Drawer --- */}
      <Modal visible={isCatalogOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setIsCatalogOpen(false)}>
          <Pressable style={styles.catalogModal} onPress={(e) => (e as any).stopPropagation?.()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Furniture Catalog 🛋️</Text>
              <Pressable onPress={() => setIsCatalogOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            {/* Category Tabs */}
            <View style={styles.categoryTabs}>
              {Object.entries(CATEGORY_LABELS).map(([catKey, val]) => (
                <Pressable
                  key={catKey}
                  onPress={() => setActiveCatalogCategory(catKey)}
                  style={[
                    styles.catTab,
                    activeCatalogCategory === catKey && styles.catTabActive,
                  ]}
                >
                  <Text style={styles.catTabIcon}>{val.icon}</Text>
                  <Text
                    style={[
                      styles.catTabText,
                      activeCatalogCategory === catKey && styles.catTabTextActive,
                    ]}
                  >
                    {val.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Catalog Items Grid */}
            <ScrollView style={styles.catalogScroll} contentContainerStyle={styles.catalogGrid}>
              {FURNITURE_CATALOG.filter((item) => item.category === activeCatalogCategory).map((item) => (
                <Pressable
                  key={item.catalogId}
                  onPress={() => {
                    const res = addObject(item.catalogId);
                    if (res.success) {
                      setIsCatalogOpen(false);
                    } else if (res.reason) {
                      Alert.alert('Cannot Add Item', res.reason);
                    }
                  }}
                  style={styles.catalogItemCard}
                >
                  <Text style={styles.catalogItemIcon}>{item.icon}</Text>
                  <Text style={styles.catalogItemName}>{item.name}</Text>
                  <Text style={styles.catalogItemSize}>
                    {item.gridWidth}×{item.gridDepth} tiles
                  </Text>
                  <View style={[styles.catalogItemColorDot, { backgroundColor: item.defaultColor }]} />
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* --- Templates Modal --- */}
      <Modal visible={isTemplatesOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setIsTemplatesOpen(false)}>
          <Pressable style={styles.catalogModal} onPress={(e) => (e as any).stopPropagation?.()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Starter Room Templates 🏠</Text>
              <Pressable onPress={() => setIsTemplatesOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.templatesList}>
              {ROOM_TEMPLATES.map((tmpl) => {
                const isCurrent = room.name === tmpl.name;
                return (
                  <Pressable
                    key={tmpl.id}
                    onPress={() => {
                      applyTemplate(tmpl.id);
                      setIsTemplatesOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.templateCard,
                      isCurrent && styles.templateCardActive,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Text style={styles.templateIcon}>{tmpl.icon}</Text>
                    <View style={styles.templateDetails}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.templateName}>{tmpl.name}</Text>
                        {isCurrent && <Text style={styles.activeTag}>Current Layout</Text>}
                      </View>
                      <Text style={styles.templateDesc}>{tmpl.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* --- Room Colors & Lighting Settings Modal --- */}
      <Modal visible={isSettingsOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setIsSettingsOpen(false)}>
          <Pressable style={styles.catalogModal} onPress={(e) => (e as any).stopPropagation?.()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Room Theme & Lighting 🎨</Text>
              <Pressable onPress={() => setIsSettingsOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.settingsScroll}>
              <Text style={styles.settingHeading}>Wall Color</Text>
              <View style={styles.settingSwatches}>
                {['#FDF0ED', '#F7EDF8', '#ECEFF1', '#E0F2FE', '#FCE7F3', '#FEF3C7'].map((hex) => (
                  <Pressable
                    key={hex}
                    onPress={() => updateRoomSettings({ wallColor: hex })}
                    style={[
                      styles.settingColorBtn,
                      { backgroundColor: hex },
                      room.wallColor === hex && styles.settingColorBtnActive,
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.settingHeading}>Floor Material</Text>
              <View style={styles.settingOptionsRow}>
                {[
                  { key: 'hardwood_oak', label: 'Warm Oak 🪵' },
                  { key: 'hardwood_dark', label: 'Dark Walnut 🌰' },
                  { key: 'marble_pink', label: 'Rose Marble 🏛️' },
                  { key: 'pastel_tile', label: 'Pastel Tile 🧊' },
                  { key: 'cozy_carpet', label: 'Plush Carpet 🧶' },
                ].map((opt) => {
                  const isActive = room.floorMaterial === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => updateRoomSettings({ floorMaterial: opt.key as any })}
                      style={[
                        styles.optionChip,
                        isActive && styles.optionChipActive,
                      ]}
                    >
                      <Text style={[styles.optionChipText, isActive && styles.optionChipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.settingHeading}>Atmosphere & Lighting</Text>
              <View style={styles.settingOptionsRow}>
                {[
                  { key: 'warm_sunset', label: 'Sunset Glow 🌅' },
                  { key: 'romantic_pink', label: 'Romantic Pink 💖' },
                  { key: 'cozy_candlelight', label: 'Candlelight 🕯️' },
                  { key: 'bright_daylight', label: 'Bright Daylight ☀️' },
                  { key: 'midnight_stars', label: 'Midnight Stars 🌌' },
                ].map((opt) => {
                  const isActive = room.lightingTheme === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => updateRoomSettings({ lightingTheme: opt.key as any })}
                      style={[
                        styles.optionChip,
                        isActive && styles.optionChipActive,
                      ]}
                    >
                      <Text style={[styles.optionChipText, isActive && styles.optionChipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.settingHeading}>Window View</Text>
              <View style={styles.settingOptionsRow}>
                {[
                  { key: 'city_sunset', label: 'City Skyline 🌆' },
                  { key: 'beach_ocean', label: 'Ocean Waves 🌊' },
                  { key: 'mountain_stars', label: 'Starry Mountains 🏔️' },
                  { key: 'fairy_forest', label: 'Fairy Forest 🌲' },
                ].map((opt) => {
                  const isActive = room.windowScenery === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => updateRoomSettings({ windowScenery: opt.key as any })}
                      style={[
                        styles.optionChip,
                        isActive && styles.optionChipActive,
                      ]}
                    >
                      <Text style={[styles.optionChipText, isActive && styles.optionChipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 480,
    backgroundColor: '#FFF6FA',
    borderRadius: Radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  glView: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topBarLeft: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    ...Shadows.soft,
  },
  roomTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.deepPurple,
  },
  saveBadge: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radii.full,
    padding: 3,
    ...Shadows.soft,
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  modeBtnActive: {
    backgroundColor: Colors.primary,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  cameraBar: {
    position: 'absolute',
    top: 58,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: Radii.full,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    zIndex: 10,
    ...Shadows.soft,
  },
  cameraBtn: {
    padding: 6,
    marginVertical: 2,
    borderRadius: 16,
  },
  cameraBtnActive: {
    backgroundColor: '#FFE4E6',
  },
  cameraIcon: {
    fontSize: 16,
  },
  editorToolbar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: Radii.md,
    padding: 10,
    ...Shadows.card,
    zIndex: 20,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.full,
  },
  actionBtn: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radii.full,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepPurple,
  },
  iconBtn: {
    padding: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: Radii.full,
  },
  iconBtnDisabled: {
    opacity: 0.35,
  },
  iconBtnText: {
    fontSize: 13,
  },
  inspectorCard: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inspectorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textDark,
  },
  closeInspectorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textMuted,
    padding: 4,
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  moveLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  dirBtn: {
    backgroundColor: '#F1F5F9',
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.deepPurple,
  },
  rotateBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 4,
  },
  rotateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  deleteText: {
    fontSize: 11,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  swatchLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  swatchSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    transform: [{ scale: 1.25 }],
  },
  hintBox: {
    marginTop: 6,
    paddingVertical: 4,
  },
  hintText: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  liveInteractionsBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  liveScroll: {
    gap: 8,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    ...Shadows.soft,
    gap: 6,
  },
  liveChipIcon: {
    fontSize: 16,
  },
  liveChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepPurple,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  catalogModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    padding: Spacing.md,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.deepPurple,
  },
  closeBtn: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textMuted,
    padding: 6,
    cursor: 'pointer' as any,
    userSelect: 'none' as any,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  catTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: '#F3F4F6',
    gap: 4,
    cursor: 'pointer' as any,
    userSelect: 'none' as any,
  },
  catTabActive: {
    backgroundColor: Colors.primary,
  },
  catTabIcon: {
    fontSize: 13,
  },
  catTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  catTabTextActive: {
    color: '#FFFFFF',
  },
  catalogScroll: {
    maxHeight: 340,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  catalogItemCard: {
    width: '48%',
    backgroundColor: '#FAF5FF',
    borderRadius: Radii.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    cursor: 'pointer' as any,
    userSelect: 'none' as any,
  },
  catalogItemIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  catalogItemName: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
  },
  catalogItemSize: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  catalogItemColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  templatesList: {
    gap: 10,
    paddingBottom: 20,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    padding: 12,
    borderRadius: Radii.md,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    cursor: 'pointer' as any,
    userSelect: 'none' as any,
  },
  templateCardActive: {
    backgroundColor: '#FFE4E6',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  activeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  templateIcon: {
    fontSize: 32,
  },
  templateDetails: {
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.deepPurple,
  },
  templateDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  settingsScroll: {
    gap: 12,
    paddingBottom: 30,
  },
  settingHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: 4,
  },
  settingSwatches: {
    flexDirection: 'row',
    gap: 10,
  },
  settingColorBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    cursor: 'pointer' as any,
  },
  settingColorBtnActive: {
    borderColor: Colors.primary,
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  settingOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
    cursor: 'pointer' as any,
    userSelect: 'none' as any,
  },
  optionChipActive: {
    backgroundColor: '#FFE4E6',
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  optionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepPurple,
  },
  optionChipTextActive: {
    color: Colors.primary,
  },
});
