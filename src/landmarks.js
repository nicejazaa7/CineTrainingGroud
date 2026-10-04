// Landmarks: the spine and the diaphragm, drawn faintly for orientation.
// Every value here is authored for drawing only (rough adult anatomy), not taken from Dodge.
// Same frame as the coronary tree model: x = patient left, y = head, z = anterior; cm.

export const MIDLINE_X = -1;

// Thoracic vertebral bodies: short upright cylinders down the midline, behind the heart.
// The front of each body sits about 4 cm behind the most posterior vessel (LCx, z = -2.1).
const SPINE = { z: -8, radius: 1.8, height: 2.2, disc: 0.6, topY: 8, count: 11 };

export function vertebrae() {
  return Array.from({ length: SPINE.count }, (_, i) => ({
    center: [MIDLINE_X, SPINE.topY - SPINE.height / 2 - i * (SPINE.height + SPINE.disc), SPINE.z],
    radius: SPINE.radius,
    height: SPINE.height,
  }));
}

// Hemidiaphragms: the top halves of two ellipsoids under the heart. The right dome sits 1 cm
// higher (the liver lies below it). Placed so the heart shell rests 0.25 cm above the left dome.
export const DIAPHRAGM = [
  { side: 'right', center: [MIDLINE_X - 9, -13.5, -1], radii: [9, 6, 10] },
  { side: 'left', center: [MIDLINE_X + 8, -14.5, -1], radii: [9, 6, 10] },
];

// Height (y) of the diaphragm surface above the point (x, z); -Infinity outside both domes.
export function diaphragmHeight(x, z) {
  return Math.max(...DIAPHRAGM.map(({ center: [cx, cy, cz], radii: [rx, ry, rz] }) => {
    const q = 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2;
    return q < 0 ? -Infinity : cy + ry * Math.sqrt(q);
  }));
}
