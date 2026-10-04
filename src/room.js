// Room view: the patient, table, C-arm and coronary tree model seen from outside.
// The scene uses the patient frame directly (x = patient left, y = head, z = anterior; cm),
// so the patient lies supine and "up" in the room is +z.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { carmPose, SOURCE_TO_DETECTOR_CM, SOURCE_TO_ISOCENTER_CM, DETECTOR_HALF_CM } from './carm.js';
import { MIDLINE_X, vertebrae, DIAPHRAGM } from './landmarks.js';
import { vessels, ARTERY_COLOR } from './vessels.js';

// Body, table and floor are authored for drawing only: rough adult sizes around the heart.
const BODY = { midlineX: MIDLINE_X, backZ: -12, frontZ: 11, halfWidth: 17, shoulderY: 15, hipY: -45 };
const TABLE = { topZ: BODY.backZ - 0.5, thickness: 4, halfWidth: 25, headY: 50, footY: -160 };
const FLOOR_Z = -100;

const ARC_RADIUS_CM = 80;
const DETECTOR_CM = SOURCE_TO_DETECTOR_CM - SOURCE_TO_ISOCENTER_CM;
const VESSEL_RADIUS = { main: 0.15, branch: 0.1, side: 0.06 };

export function createRoomView(container, tree) {
  const isocenter = new THREE.Vector3(...tree.shell.center);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15181d);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-100, -150, 300);
  scene.add(sun);

  scene.add(drawRoom(), drawPatient(), drawLandmarks(), drawShell(tree.shell), drawTree(tree));
  const carm = drawCarm();
  scene.add(carm);

  const camera = new THREE.PerspectiveCamera(40, 1, 1, 3000);
  camera.up.set(0, 0, 1);
  camera.position.copy(isocenter).add(new THREE.Vector3(-75, -175, 85));
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(isocenter);
  controls.update();

  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);
  new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }).observe(container);

  return {
    setProjection(primaryDeg, secondaryDeg) {
      const pose = carmPose(primaryDeg, secondaryDeg, tree.shell.center);
      const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(...pose.imageRight),
        new THREE.Vector3(...pose.imageUp),
        new THREE.Vector3(...pose.towardDetector),
      );
      carm.position.copy(isocenter);
      carm.quaternion.setFromRotationMatrix(basis);
      render();
    },
  };
}

function drawRoom() {
  const group = new THREE.Group();
  const grey = new THREE.MeshStandardMaterial({ color: 0x6b7480 });

  const tableLength = TABLE.headY - TABLE.footY;
  const top = new THREE.Mesh(new THREE.BoxGeometry(2 * TABLE.halfWidth, tableLength, TABLE.thickness), grey);
  top.position.set(BODY.midlineX, (TABLE.headY + TABLE.footY) / 2, TABLE.topZ - TABLE.thickness / 2);

  // The table top is held from the foot end only, so the C-arm can pass under the chest.
  const pedestalHeight = TABLE.topZ - TABLE.thickness - FLOOR_Z;
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(30, 40, pedestalHeight), grey);
  pedestal.position.set(BODY.midlineX, TABLE.footY + 40, FLOOR_Z + pedestalHeight / 2);

  const floor = new THREE.GridHelper(500, 20, 0x3a414b, 0x2a3038);
  floor.rotation.x = Math.PI / 2;
  floor.position.set(BODY.midlineX, -40, FLOOR_Z);

  const sideZ = TABLE.topZ;
  group.add(top, pedestal, floor,
    label('Head', [BODY.midlineX, TABLE.headY + 12, sideZ]),
    label("Patient's left", [BODY.midlineX + TABLE.halfWidth + 40, -20, sideZ]),
    label("Patient's right", [BODY.midlineX - TABLE.halfWidth - 40, -20, sideZ]));
  return group;
}

function drawPatient() {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc9a38a, transparent: true, opacity: 0.3, depthWrite: false });
  const midZ = (BODY.backZ + BODY.frontZ) / 2;

  // Capsule of radius 1 and length 3 is 5 units tall; stretch it to the torso.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1, 3, 8, 24), skin);
  torso.scale.set(BODY.halfWidth, (BODY.shoulderY - BODY.hipY) / 5, (BODY.frontZ - BODY.backZ) / 2);
  torso.position.set(BODY.midlineX, (BODY.shoulderY + BODY.hipY) / 2, midZ);

  const head = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), skin);
  head.position.set(BODY.midlineX, BODY.shoulderY + 13, BODY.backZ + 10);

  group.add(torso, head);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(7, 75, 8, 16), skin);
    leg.position.set(BODY.midlineX + side * 9, BODY.hipY - 40, BODY.backZ + 7);
    group.add(leg);
  }
  return group;
}

// Faint spine and diaphragm domes. The scene's y axis is the head, so a dome is the top half of a sphere.
function drawLandmarks() {
  const group = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color: 0xe8e0cc, transparent: true, opacity: 0.35, depthWrite: false });
  for (const v of vertebrae()) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(v.radius, v.radius, v.height, 24), bone);
    body.position.set(...v.center);
    group.add(body);
  }
  const muscle = new THREE.MeshStandardMaterial({ color: 0x9a6a5a, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  for (const d of DIAPHRAGM) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, 2 * Math.PI, 0, Math.PI / 2), muscle);
    dome.scale.set(...d.radii);
    dome.position.set(...d.center);
    group.add(dome);
  }
  return group;
}

function drawShell(shell) {
  const [a0, a1] = shell.axes.map((a) => new THREE.Vector3(...a));
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0xd06a6a, transparent: true, opacity: 0.15, depthWrite: false }),
  );
  mesh.scale.set(...shell.radii);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a0, a1, new THREE.Vector3().crossVectors(a0, a1)));
  mesh.position.set(...shell.center);
  return mesh;
}

function drawTree(tree) {
  const group = new THREE.Group();
  for (const v of vessels(tree)) {
    const curve = new THREE.CatmullRomCurve3(v.points.map((n) => new THREE.Vector3(tree.points[n].x, tree.points[n].y, tree.points[n].z)));
    const material = new THREE.MeshStandardMaterial({ color: ARTERY_COLOR[v.artery] });
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8 * v.points.length, VESSEL_RADIUS[v.size], 8), material));
  }
  return group;
}

// Built in C-arm coordinates: x = picture right, y = picture up, z = beam axis toward the detector,
// origin at the isocenter. setProjection turns the whole group.
function drawCarm() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.3, roughness: 0.5 });

  // Half circle from the detector end (+z) round the picture-right side to the source end (-z).
  const arc = new THREE.TorusGeometry(ARC_RADIUS_CM, 4, 12, 64, Math.PI);
  arc.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));
  group.add(new THREE.Mesh(arc, metal));

  const armLength = ARC_RADIUS_CM - DETECTOR_CM;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, armLength, 12), metal);
  arm.rotation.x = Math.PI / 2;
  arm.position.z = DETECTOR_CM + armLength / 2;

  const detector = new THREE.Mesh(
    new THREE.BoxGeometry(2 * DETECTOR_HALF_CM, 2 * DETECTOR_HALF_CM, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a7bd0 }),
  );
  detector.position.z = DETECTOR_CM + 3;

  const source = new THREE.Mesh(new THREE.BoxGeometry(22, 22, 14), new THREE.MeshStandardMaterial({ color: 0x50565f }));
  source.position.z = -SOURCE_TO_ISOCENTER_CM - 5;

  // Faint lines from the focal spot to the detector corners show the X-ray beam.
  const beam = [];
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    beam.push(0, 0, -SOURCE_TO_ISOCENTER_CM, sx * DETECTOR_HALF_CM, sy * DETECTOR_HALF_CM, DETECTOR_CM);
  }
  const beamGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(beam, 3));
  const beamLines = new THREE.LineSegments(beamGeometry, new THREE.LineBasicMaterial({ color: 0xf5e27a, transparent: true, opacity: 0.5 }));

  group.add(arm, detector, source, beamLines,
    label('Detector', [0, 0, DETECTOR_CM + 20]),
    label('X-ray source', [0, 0, -SOURCE_TO_ISOCENTER_CM - 24]));
  return group;
}

function label(text, [x, y, z]) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.font = '600 52px system-ui, sans-serif';
  ctx.fillStyle = '#e8ecf1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 48);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
  sprite.scale.set(64, 12, 1);
  sprite.position.set(x, y, z);
  return sprite;
}
