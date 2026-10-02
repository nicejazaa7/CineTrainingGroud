// Builds the coronary tree model from the Dodge measured points and data/tree-spec.json.
import { fitShell, snapToShell } from './shell.js';

// Authored points sit this far outside the heart shell (cm): the vessel lies on the epicardium.
export const AUTHORED_OFFSET_CM = 0.1;

export function buildTree(measuredPoints, spec) {
  const shell = fitShell(measuredPoints);

  const available = new Map([['left ostium', { x: 0, y: 0, z: 0, source: 'measured', dodge: 'frame origin' }]]);
  for (const p of measuredPoints) {
    if (p.location === 'Catheter') continue;
    available.set(p.location, { x: p.x, y: p.y, z: p.z, source: 'measured', dodge: `Table ${p.table}, ${p.location}` });
  }
  for (const [name, a] of Object.entries(spec.authored)) {
    if (available.has(name)) throw new Error(`Authored point "${name}" clashes with a measured point`);
    const [x, y, z] = a.guide;
    available.set(name, { ...round(snapToShell(shell, { x, y, z }, AUTHORED_OFFSET_CM)), source: 'authored', note: a.note });
  }

  // Keep only the points the tree uses, in first-use order.
  const points = {};
  const use = (name) => {
    if (!available.has(name)) throw new Error(`Unknown point "${name}"`);
    points[name] = available.get(name);
    return name;
  };
  const segments = spec.segments.map((s) => ({
    syntax: s.syntax,
    name: s.name,
    label: `${s.name} (${s.syntax})`,
    parent: s.parent,
    points: s.points.map(use),
  }));
  const sideBranches = spec.sideBranches.map((b) => ({ ...b, points: b.points.map(use) }));
  const bifurcations = spec.bifurcations.map((b) => ({ ...b, point: use(b.point) }));

  return {
    source: 'Dodge et al. Circulation 1988;78:1167 (measured points) plus authored points; see data/README.md',
    frame: 'origin = left coronary ostium; x = patient left, y = head, z = anterior; cm',
    shell: {
      center: shell.center.map(r2),
      axes: shell.axes.map((a) => a.map((v) => Math.round(v * 1e4) / 1e4)),
      radii: shell.radii.map(r2),
      rmsCm: r2(shell.rmsCm),
    },
    points,
    segments,
    sideBranches,
    bifurcations,
  };
}

const r2 = (v) => Math.round(v * 100) / 100;
const round = (p) => ({ x: r2(p.x), y: r2(p.y), z: r2(p.z) });
