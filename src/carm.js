// C-arm geometry in the patient frame (x = patient left, y = head, z = anterior; cm).
// Primary angle: LAO positive, RAO negative. Secondary angle: CRA positive, CAU negative.
// The beam axis is the anterior direction tilted by the secondary angle toward the head,
// then turned by the primary angle about the long axis toward the patient's left
// (docs/adr/0003). These are the same angle definitions as Dodge's θ and Φ.

const DEG = Math.PI / 180;

export const SOURCE_TO_DETECTOR_CM = 100;
export const SOURCE_TO_ISOCENTER_CM = 75;
// Square detector, 25 cm across: a common field size for coronary angiography.
export const DETECTOR_HALF_CM = 12.5;

export const FULL_RANGE = { primary: [-120, 120], secondary: [-45, 45] };
export const CLINICAL_RANGE = { primary: [-30, 60], secondary: [-40, 40] };

// Returns the C-arm position for one projection. The C-arm turns about the isocenter.
// towardDetector: unit beam axis from the source toward the detector.
// imageRight, imageUp: the detector's picture axes. At AP they are the patient's left and the head.
export function carmPose(primaryDeg, secondaryDeg, isocenter = [0, 0, 0]) {
  const [ca, sa] = [Math.cos(primaryDeg * DEG), Math.sin(primaryDeg * DEG)];
  const [cb, sb] = [Math.cos(secondaryDeg * DEG), Math.sin(secondaryDeg * DEG)];
  const towardDetector = [sa * cb, sb, ca * cb];
  const imageRight = [ca, 0, -sa];
  const imageUp = [-sa * sb, cb, -ca * sb];
  const along = (cm) => isocenter.map((v, i) => v + cm * towardDetector[i]);
  return {
    towardDetector,
    imageRight,
    imageUp,
    source: along(-SOURCE_TO_ISOCENTER_CM),
    detector: along(SOURCE_TO_DETECTOR_CM - SOURCE_TO_ISOCENTER_CM),
  };
}

// Where the X-ray from the source through point p hits the detector (perspective projection).
// Returns [right, up] in cm from the detector center, along the picture axes of `pose`.
export function projectToDetector(pose, p) {
  const d = p.map((v, i) => v - pose.source[i]);
  const along = (axis) => d[0] * axis[0] + d[1] * axis[1] + d[2] * axis[2];
  const magnification = SOURCE_TO_DETECTOR_CM / along(pose.towardDetector);
  return [magnification * along(pose.imageRight), magnification * along(pose.imageUp)];
}

// A smooth C-arm move from one [primary, secondary] projection to another. Both angles move
// together, starting and stopping gently. t runs from 0 (start) to 1 (end).
export function projectionDuringMove(from, to, t) {
  const eased = t * t * (3 - 2 * t);
  return from.map((v, i) => v + (to[i] - v) * eased);
}

// Longer moves take longer: 0.4 s plus 8 ms per degree of the larger angle change.
export function moveDurationMs(from, to) {
  return 400 + 8 * Math.max(...from.map((v, i) => Math.abs(to[i] - v)));
}

// "LAO 40 / CAU 25", "AP / CRA 30", "RAO 30".
export function formatProjection(primaryDeg, secondaryDeg) {
  const primary = primaryDeg === 0 ? 'AP' : `${primaryDeg > 0 ? 'LAO' : 'RAO'} ${Math.abs(primaryDeg)}`;
  if (secondaryDeg === 0) return primary;
  return `${primary} / ${secondaryDeg > 0 ? 'CRA' : 'CAU'} ${Math.abs(secondaryDeg)}`;
}
