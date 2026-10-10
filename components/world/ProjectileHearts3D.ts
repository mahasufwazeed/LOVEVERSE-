import * as THREE from 'three';

export interface ProjectileHeart {
  mesh: THREE.Group;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  controlPos: THREE.Vector3;
  progress: number;
  duration: number;
  isAlive: boolean;
}

export class ProjectileHearts3D {
  private group: THREE.Group;
  private projectiles: ProjectileHeart[] = [];

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  public launchHeart(
    start: THREE.Vector3,
    target: THREE.Vector3,
    duration: number = 1.4
  ) {
    // Control point creates an affectionate rising arch
    const midPoint = new THREE.Vector3().addVectors(start, target).multiplyScalar(0.5);
    const controlPos = new THREE.Vector3(midPoint.x, midPoint.y + 0.55, midPoint.z);

    const heartGroup = new THREE.Group();

    // Stylized procedural 3D Heart geometry
    const heartShape = new THREE.Shape();
    const x = 0, y = 0;
    heartShape.moveTo(x, y + 0.08);
    heartShape.bezierCurveTo(x, y + 0.14, x - 0.12, y + 0.18, x - 0.12, y + 0.08);
    heartShape.bezierCurveTo(x - 0.12, y, x, y - 0.1, x, y - 0.14);
    heartShape.bezierCurveTo(x, y - 0.1, x + 0.12, y, x + 0.12, y + 0.08);
    heartShape.bezierCurveTo(x + 0.12, y + 0.18, x, y + 0.14, x, y + 0.08);

    const geom = new THREE.ShapeGeometry(heartShape);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.scale.set(1.4, 1.4, 1.4);
    heartGroup.add(mesh);

    // Glowing core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffebee })
    );
    heartGroup.add(core);

    heartGroup.position.copy(start);
    this.group.add(heartGroup);

    this.projectiles.push({
      mesh: heartGroup,
      startPos: start.clone(),
      targetPos: target.clone(),
      controlPos,
      progress: 0,
      duration,
      isAlive: true,
    });
  }

  public update(delta: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += delta / p.duration;

      if (p.progress >= 1.0) {
        p.isAlive = false;
        this.group.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      const t = p.progress;
      // Quadratic Bezier interpolation: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
      const pos = new THREE.Vector3();
      pos.x = (1 - t) * (1 - t) * p.startPos.x + 2 * (1 - t) * t * p.controlPos.x + t * t * p.targetPos.x;
      pos.y = (1 - t) * (1 - t) * p.startPos.y + 2 * (1 - t) * t * p.controlPos.y + t * t * p.targetPos.y;
      pos.z = (1 - t) * (1 - t) * p.startPos.z + 2 * (1 - t) * t * p.controlPos.z + t * t * p.targetPos.z;

      p.mesh.position.copy(pos);

      // Playful gentle wobble and scaling
      const pulse = 1.0 + Math.sin(t * 12) * 0.22;
      p.mesh.scale.set(pulse, pulse, pulse);
      p.mesh.rotation.y += delta * 4;
      p.mesh.rotation.z = Math.sin(t * 8) * 0.3;
    }
  }

  public clear() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.projectiles = [];
  }
}
