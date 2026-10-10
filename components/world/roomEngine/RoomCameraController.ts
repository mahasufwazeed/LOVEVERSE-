import * as THREE from 'three';
import { CameraPreset } from '../../../types/room';
import { Vector3D } from '../../../types';

export class RoomCameraController {
  public theta: number = Math.PI / 4;
  public phi: number = Math.PI / 3.4;
  public distance: number = 6.8;
  public target: THREE.Vector3 = new THREE.Vector3(0, 0.85, 0.2);

  // Target values for smooth lerp transitions
  private targetTheta: number = Math.PI / 4;
  private targetPhi: number = Math.PI / 3.4;
  private targetDistance: number = 6.8;
  private lookTarget: THREE.Vector3 = new THREE.Vector3(0, 0.85, 0.2);

  private minDistance: number = 3.2;
  private maxDistance: number = 12.0;
  private minPhi: number = 0.2;
  private maxPhi: number = Math.PI / 2.1;

  constructor(preset: CameraPreset = 'isometric') {
    this.setPreset(preset);
    this.theta = this.targetTheta;
    this.phi = this.targetPhi;
    this.distance = this.targetDistance;
    this.target.copy(this.lookTarget);
  }

  setPreset(preset: CameraPreset, couplePos?: Vector3D) {
    switch (preset) {
      case 'isometric':
        this.targetTheta = Math.PI / 4;
        this.targetPhi = Math.PI / 3.4;
        this.targetDistance = 6.8;
        this.lookTarget.set(0, 0.85, 0.2);
        break;
      case 'front':
        this.targetTheta = 0;
        this.targetPhi = Math.PI / 3.2;
        this.targetDistance = 5.8;
        this.lookTarget.set(0, 0.9, 0.2);
        break;
      case 'top_down':
        this.targetTheta = 0;
        this.targetPhi = 0.35;
        this.targetDistance = 8.5;
        this.lookTarget.set(0, 0, 0);
        break;
      case 'couple_focus':
        this.targetTheta = Math.PI / 7;
        this.targetPhi = Math.PI / 3.0;
        this.targetDistance = 4.2;
        if (couplePos) {
          this.lookTarget.set(couplePos.x, 0.95, couplePos.z);
        } else {
          this.lookTarget.set(0, 0.95, 0.2);
        }
        break;
    }
  }

  rotate(deltaTheta: number, deltaPhi: number) {
    this.targetTheta += deltaTheta;
    this.targetPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetPhi + deltaPhi));
  }

  zoom(factor: number) {
    this.targetDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.targetDistance * factor)
    );
  }

  focusOnObject(pos: Vector3D) {
    this.lookTarget.set(pos.x, pos.y + 0.5, pos.z);
    this.targetDistance = 4.6;
  }

  updateCamera(camera: THREE.PerspectiveCamera) {
    // Smooth cinematic lerp toward target
    this.theta = THREE.MathUtils.lerp(this.theta, this.targetTheta, 0.09);
    this.phi = THREE.MathUtils.lerp(this.phi, this.targetPhi, 0.09);
    this.distance = THREE.MathUtils.lerp(this.distance, this.targetDistance, 0.09);
    this.target.lerp(this.lookTarget, 0.09);

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
