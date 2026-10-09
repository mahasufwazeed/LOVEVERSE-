import { Vector3D } from './index';

export type RoomType =
  | 'bedroom'
  | 'living_room'
  | 'apartment'
  | 'beach_house'
  | 'dream_room';

export type FloorMaterial =
  | 'hardwood_oak'
  | 'hardwood_dark'
  | 'marble_pink'
  | 'pastel_tile'
  | 'cozy_carpet';

export type LightingTheme =
  | 'warm_sunset'
  | 'romantic_pink'
  | 'cozy_candlelight'
  | 'bright_daylight'
  | 'midnight_stars';

export type WindowScenery =
  | 'city_sunset'
  | 'beach_ocean'
  | 'mountain_stars'
  | 'fairy_forest'
  | 'rainy_window';

export type FurnitureCategory =
  | 'bedroom'
  | 'living_room'
  | 'romantic_decor'
  | 'lighting'
  | 'seating';

export type FurnitureInteractionType =
  | 'sit'
  | 'sleep'
  | 'watch_tv'
  | 'hug_near'
  | 'photo';

export interface RoomDimensions {
  width: number; // in meters/units, e.g. 6
  depth: number; // in meters/units, e.g. 6
  height: number; // in meters/units, e.g. 3.2
}

export interface FurnitureCatalogItem {
  catalogId: string;
  name: string;
  category: FurnitureCategory;
  icon: string;
  description: string;
  defaultColor: string;
  availableColors: string[];
  gridWidth: number; // tiles (0.5m each)
  gridDepth: number; // tiles (0.5m each)
  height: number;
  interactionType?: FurnitureInteractionType;
}

export interface RoomObject {
  id: string;
  catalogId: string;
  position: Vector3D; // snapped to grid
  rotationY: number; // in radians or deg (0, Math.PI/2, Math.PI, 3*Math.PI/2)
  color: string;
  scale?: number;
  interactionType?: FurnitureInteractionType;
  photoUrl?: string;
}

export interface RoomTemplate {
  id: string;
  name: string;
  roomType: RoomType;
  description: string;
  icon: string;
  dimensions: RoomDimensions;
  wallColor: string;
  floorMaterial: FloorMaterial;
  lightingTheme: LightingTheme;
  windowScenery: WindowScenery;
  defaultObjects: Omit<RoomObject, 'id'>[];
}

export interface RoomData {
  id: string;
  coupleId: string;
  name: string;
  roomType: RoomType;
  dimensions: RoomDimensions;
  wallColor: string;
  floorMaterial: FloorMaterial;
  lightingTheme: LightingTheme;
  windowScenery: WindowScenery;
  objects: RoomObject[];
  revision: number;
  lastEditedBy?: string;
  updatedAt: string;
}

export type CameraPreset = 'isometric' | 'front' | 'top_down' | 'couple_focus';
