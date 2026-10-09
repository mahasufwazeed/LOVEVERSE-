import * as THREE from 'three';
import { CameraPreset } from '../../../types/room';
import { Vector3D } from '../../../types';

export class RoomCameraController {
  public theta: number = Math.PI / 4; // Azimuth angle (around Y axis)
  public phi: number = Math.PI / 3.8; // Polar angle (elevation from Y axis)
  public distance: number = 8.5; // Distance from target
  public target: THREE.Vector3 = new THREE.Vector3(0, 0.8, 0);

  private minDistance: number = 3.5;
  private maxDistance: number = 14.0;
  private minPhi: number = 0.2; // Don't look straight down
  private maxPhi: number = Math.PI / 2.1; // Don't go below floor level

  constructor(preset: CameraPreset = 'isometric') {
    this.setPreset(preset);
  }

  setPreset(preset: CameraPreset, couplePos?: Vector3D) {
    switch (preset) {
      case 'isometric':
        this.theta = Math.PI / 4;
        this.phi = Math.PI / 3.6;
        this.distance = 9.2;
        this.target.set(0, 0.8, 0);
        break;
      case 'front':
        this.theta = 0;
        this.phi = Math.PI / 3.2;
        this.distance = 7.5;
        this.target.set(0, 0.9, 0);
        break;
      case 'top_down':
        this.theta = 0;
        this.phi = 0.35; // Almost straight down for grid layout
        this.distance = 9.8;
        this.target.set(0, 0, 0);
        break;
      case 'couple_focus':
        this.theta = Math.PI / 8;
        this.phi = Math.PI / 3.0;
        this.distance = 4.8;
        if (couplePos) {
          this.target.set(couplePos.x, 0.9, couplePos.z);
        } else {
          this.target.set(0, 0.9, 0.2);
        }
        break;
    }
  }

  rotate(deltaTheta: number, deltaPhi: number) {
    this.theta += deltaTheta;
    this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi + deltaPhi));
  }

  zoom(factor: number) {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance * factor));
  }

  focusOnObject(pos: Vector3D) {
    this.target.set(pos.x, pos.y + 0.5, pos.z);
    this.distance = 5.2;
  }

  updateCamera(camera: THREE.PerspectiveCamera) {
    const sinPhi = Math.sin(this.phi);
    const cosPhi = Math.cos(this.phi);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    const x = this.target.x + this.distance * sinPhi * sinTheta;
    const y = this.target.y + this.distance * cosPhi;
    const z = this.target.z + this.distance * sinPhi * cosTheta;

    camera.position.set(x, y, z);
    camera.lookAt(this.target);
  }
}
