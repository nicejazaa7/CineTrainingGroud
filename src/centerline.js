// One centerline per vessel, shared by the simulated angiogram and the measures, so the
// numbers describe the vessel that is drawn. It is a centripetal Catmull-Rom curve through
// the vessel's points: the same curve as THREE.CatmullRomCurve3 with its default settings,
// except for two-point vessels. These come out straight here, but three.js bends them
// slightly (up to 3 mm on the septals), because it reuses one scratch point for both ends.

// Returns [x, y, z] samples, evenly spaced in the curve parameter between each pair of
// points. Sample k * perInterval is point k.
export function sampleCenterline(points, perInterval) {
  const n = points.length;
  const samples = [];
  for (let i = 0; i < n - 1; i++) {
    // Past either end, the curve continues straight on (as in three.js).
    const before = i > 0 ? points[i - 1] : extend(points[0], points[1]);
    const after = i + 2 < n ? points[i + 2] : extend(points[n - 1], points[n - 2]);
    const piece = centripetal(before, points[i], points[i + 1], after);
    for (let k = 0; k < perInterval; k++) samples.push(piece(k / perInterval));
  }
  samples.push([...points[n - 1]]);
  return samples;
}

const extend = (end, next) => end.map((v, j) => 2 * v - next[j]);

// The curve piece from p1 to p2, with knot gaps of distance^0.5 (three.js initNonuniformCatmullRom).
function centripetal(p0, p1, p2, p3) {
  const gap = (a, b) => Math.sqrt(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  let dt1 = gap(p1, p2);
  if (dt1 < 1e-4) dt1 = 1;
  let dt0 = gap(p0, p1);
  if (dt0 < 1e-4) dt0 = dt1;
  let dt2 = gap(p2, p3);
  if (dt2 < 1e-4) dt2 = dt1;
  const coefficients = [0, 1, 2].map((j) => {
    const [x0, x1, x2, x3] = [p0[j], p1[j], p2[j], p3[j]];
    const t1 = ((x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1) * dt1;
    const t2 = ((x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2) * dt1;
    return [x1, t1, -3 * x1 + 3 * x2 - 2 * t1 - t2, 2 * x1 - 2 * x2 + t1 + t2];
  });
  return (t) => coefficients.map(([c0, c1, c2, c3]) => c0 + t * (c1 + t * (c2 + t * c3)));
}
