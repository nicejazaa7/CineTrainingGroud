// C-arm geometry in the patient frame (x = patient left, y = head, z = anterior; cm).
// Primary angle: LAO positive, RAO negative. Secondary angle: CRA positive, CAU negative.
// The beam axis is the anterior direction tilted by the secondary angle toward the head,
// then turned by the primary angle about the long axis toward the patient's left
// (docs/adr/0003). These are the same angle definitions as Dodge's θ and Φ.

const DEG = Math.PI / 180;

export const SOURCE_TO_DETECTOR_CM = 100;
export const SOURCE_TO_ISOCENTER_CM = 75;

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

// "LAO 40 / CAU 25", "AP / CRA 30", "RAO 30".
export function formatProjection(primaryDeg, secondaryDeg) {
  const primary = primaryDeg === 0 ? 'AP' : `${primaryDeg > 0 ? 'LAO' : 'RAO'} ${Math.abs(primaryDeg)}`;
  if (secondaryDeg === 0) return primary;
  return `${primary} / ${secondaryDeg > 0 ? 'CRA' : 'CAU'} ${Math.abs(secondaryDeg)}`;
}
