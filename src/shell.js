// Heart shell: an ellipsoid fitted to the measured epicardial points.
// Shell frame: axis 0 is the long axis (points toward the apex), axes 1 and 2 are the short axes.

// Points on the outer surface of the ventricles. Excluded: ostia and LM (above the base),
// septals (inside the septum), and the catheter.
export const SURFACE_LOCATIONS = [
  'L1 mid', 'L2 mid', 'L3 mid', 'L4 proximal (apex)', 'L4 mid',
  'D1 origin', 'D1 mid', 'D2 origin', 'D2 mid', 'D3 origin', 'D3 mid',
  'C1 mid', 'C2 mid', 'C3 mid', 'M1 origin', 'M1 mid', 'M2 origin', 'M2 mid',
  'R1 mid', 'R2 mid', 'R3 mid', 'R4 mid', 'RD mid', 'RI mid', 'RP mid',
];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => Math.hypot(a[0], a[1], a[2]);
const xyz = (p) => [p.x, p.y, p.z];

// Rotation matrix columns from three Euler angles (Rz·Ry·Rx).
function axesFromAngles(a, b, c) {
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c)];
  return [
    [cc * cb, sc * cb, -sb],
    [cc * sb * sa - sc * ca, sc * sb * sa + cc * ca, cb * sa],
    [cc * sb * ca + sc * sa, sc * sb * ca - cc * sa, cb * ca],
  ];
}

// Ellipsoid "size" of p: below 1 inside the ellipsoid, 1 on it, above 1 outside.
function scale(shell, p) {
  const d = sub(xyz(p), shell.center);
  return Math.hypot(...shell.axes.map((u, i) => dot(d, u) / shell.radii[i]));
}

// Signed distance (cm) from the ellipsoid along the ray from its center; positive outside.
export function radialDistance(shell, p) {
  const r = norm(sub(xyz(p), shell.center));
  return r - r / scale(shell, p);
}

export function isInsideShell(shell, p) {
  return scale(shell, p) < 1;
}

// Moves p along the ray from the center onto the ellipsoid, then `offset` cm further out.
export function snapToShell(shell, p, offset) {
  const d = sub(xyz(p), shell.center);
  const k = 1 / scale(shell, p) + offset / norm(d);
  return { x: shell.center[0] + d[0] * k, y: shell.center[1] + d[1] * k, z: shell.center[2] + d[2] * k };
}

export function fitShell(measuredPoints) {
  const byName = new Map(measuredPoints.map((p) => [p.location, p]));
  const surface = SURFACE_LOCATIONS.map((n) => byName.get(n));
  const centroid = [0, 1, 2].map((i) => surface.reduce((s, p) => s + xyz(p)[i], 0) / surface.length);

  const toShell = (q) => ({ center: q.slice(0, 3), axes: axesFromAngles(q[3], q[4], q[5]), radii: q.slice(6) });
  const cost = (q) => {
    if (q.slice(6).some((r) => r < 2)) return Infinity;
    const shell = toShell(q);
    return surface.reduce((s, p) => s + radialDistance(shell, p) ** 2, 0);
  };
  const q = nelderMead(cost, [...centroid, 0, 0, 0, 5, 5, 5]);

  // Put the longest radius first and point that axis toward the apex.
  const raw = toShell(q);
  const order = [0, 1, 2].sort((i, j) => raw.radii[j] - raw.radii[i]);
  const shell = { center: raw.center, axes: order.map((i) => raw.axes[i]), radii: order.map((i) => raw.radii[i]) };
  const toApex = sub(xyz(byName.get('L4 proximal (apex)')), shell.center);
  if (dot(toApex, shell.axes[0]) < 0) shell.axes[0] = shell.axes[0].map((v) => -v);
  shell.rmsCm = Math.sqrt(cost(q) / surface.length);
  return shell;
}

// Plain Nelder–Mead simplex minimiser, restarted until it stops improving.
function nelderMead(f, start) {
  let best = start;
  for (let restart = 0; restart < 20; restart++) {
    const next = simplex(f, best);
    if (f(best) - f(next) < 1e-12) return next;
    best = next;
  }
  return best;
}

function simplex(f, x0) {
  const n = x0.length;
  let pts = [x0, ...x0.map((_, i) => x0.map((v, j) => (i === j ? v + 1 : v)))];
  let vals = pts.map(f);
  for (let iter = 0; iter < 5000; iter++) {
    const idx = pts.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
    pts = idx.map((i) => pts[i]);
    vals = idx.map((i) => vals[i]);
    if (vals[n] - vals[0] < 1e-12) break;
    const c = x0.map((_, j) => pts.slice(0, n).reduce((s, p) => s + p[j], 0) / n);
    const along = (t) => c.map((v, j) => v + t * (pts[n][j] - v));
    const r = along(-1), fr = f(r);
    if (fr < vals[0]) {
      const e = along(-2), fe = f(e);
      [pts[n], vals[n]] = fe < fr ? [e, fe] : [r, fr];
    } else if (fr < vals[n - 1]) {
      [pts[n], vals[n]] = [r, fr];
    } else {
      const k = along(0.5), fk = f(k);
      if (fk < vals[n]) {
        [pts[n], vals[n]] = [k, fk];
      } else {
        pts = pts.map((p) => p.map((v, j) => pts[0][j] + 0.5 * (v - pts[0][j])));
        vals = pts.map(f);
      }
    }
  }
  return pts[0];
}
