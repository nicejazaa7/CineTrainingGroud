// Foreshortening, overlap and the traffic-light colour of a target in one projection
// (docs/PLAN.md, session 6). Pure math on the vessel centerlines, so it is tested in Node.
import { projectToDetector, SOURCE_TO_DETECTOR_CM, SOURCE_TO_ISOCENTER_CM } from './carm.js';
import { vessels, VESSEL_DIAMETER_CM } from './vessels.js';
import { sampleCenterline } from './centerline.js';

// Within this distance (cm, in 3D) of a branch point the lumens merge, so shadows that meet
// there are the branching itself, not overlap.
export const JUNCTION_CM = 0.5;
// Bifurcation checks judge this much (cm) of the parent before the branch point and of each daughter after it.
export const ORIGIN_CM = 1;
// The carina counts as opened when the projected angle is at least this share of the true 3D angle.
export const CARINA_OPEN_SHARE = 0.7;
// Fine enough that one step is under 1 mm on the longest stretch between two points.
const SAMPLES_PER_INTERVAL = 32;
// Vessels lie near the isocenter, so their shadows share its magnification (as in angiogram.js).
const MAGNIFICATION = SOURCE_TO_DETECTOR_CM / SOURCE_TO_ISOCENTER_CM;

// Traffic light (PLAN, after Green 2005), applied to whole percentages so the number and colour agree.
export const foreshorteningColor = (percent) => (percent <= 10 ? 'green' : percent <= 19 ? 'amber' : 'red');
export const overlapColor = (percent) => (percent <= 5 ? 'green' : percent <= 20 ? 'amber' : 'red');
const RANK = { green: 0, amber: 1, red: 2 };
export const worst = (colors) => colors.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));

// Share of a centerline's true length that the picture loses: 1 − projected length / true length.
// Each step is projected along the beam axis, so magnification does not count:
// a vessel parallel to the detector gives 0, one tilted 60° out of that plane gives 0.5.
export function foreshortening(samples, pose) {
  let full = 0;
  let seen = 0;
  for (let k = 1; k < samples.length; k++) {
    const step = sub(samples[k], samples[k - 1]);
    const length = Math.hypot(...step);
    const along = dot(step, pose.towardDetector);
    full += length;
    seen += Math.sqrt(Math.max(0, length * length - along * along));
  }
  return 1 - seen / full;
}

// A stretch of centerline for the overlap check. near[k] lists the branch points within JUNCTION_CM of sample k.
export function makePiece(samples, size, junctions) {
  return { samples, size, near: samples.map((p) => junctions.flatMap((j, i) => (distance(p, j) < JUNCTION_CM ? [i] : []))) };
}

// Share of a piece's length on the picture that lies where another vessel's shadow touches or
// crosses its own shadow. Two steps near the same branch point never count against each other.
export function overlap(piece, others, pose) {
  const flat = (samples) => samples.map((p) => projectToDetector(pose, p));
  const mine = flat(piece.samples);
  // Each other vessel with its picture outline box, so vessels out of reach are skipped quickly.
  const theirs = others.map((o) => {
    const points = flat(o.samples);
    const reach = ((VESSEL_DIAMETER_CM[piece.size] + VESSEL_DIAMETER_CM[o.size]) / 2) * MAGNIFICATION;
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const box = [Math.min(...xs) - reach, Math.max(...xs) + reach, Math.min(...ys) - reach, Math.max(...ys) + reach];
    return { o, points, reach, box };
  });
  let total = 0;
  let covered = 0;
  for (let k = 1; k < mine.length; k++) {
    const length = Math.hypot(mine[k][0] - mine[k - 1][0], mine[k][1] - mine[k - 1][1]);
    total += length;
    const mx = (mine[k][0] + mine[k - 1][0]) / 2;
    const my = (mine[k][1] + mine[k - 1][1]) / 2;
    const nearHere = [...piece.near[k - 1], ...piece.near[k]];
    const sharesBranchPoint = (list) => list.length > 0 && list.some((j) => nearHere.includes(j));
    const hit = theirs.some(({ o, points, reach, box }) => {
      if (mx < box[0] || mx > box[1] || my < box[2] || my > box[3]) return false;
      for (let q = 1; q < points.length; q++) {
        if (nearHere.length > 0 && (sharesBranchPoint(o.near[q - 1]) || sharesBranchPoint(o.near[q]))) continue;
        if (distanceToStep(mx, my, points[q - 1], points[q]) < reach) return true;
      }
      return false;
    });
    if (hit) covered += length;
  }
  return total > 1e-9 ? covered / total : 0;
}

// Prepares the tree once: every vessel's centerline and the branch points (points shared by two or more vessels).
export function measureModel(tree) {
  const xyz = (name) => [tree.points[name].x, tree.points[name].y, tree.points[name].z];
  const list = vessels(tree);
  const uses = new Map();
  for (const v of list) for (const name of v.points) uses.set(name, (uses.get(name) ?? 0) + 1);
  const junctions = [...uses].filter(([, count]) => count > 1).map(([name]) => xyz(name));
  const all = list.map((v) => ({ ...v, ...makePiece(sampleCenterline(v.points.map(xyz), SAMPLES_PER_INTERVAL), v.size, junctions) }));
  const coronaryOf = (syntax) => all.find((v) => v.id === syntax).coronary;
  const bifurcations = tree.bifurcations.map((b) => ({ ...b, at: xyz(b.point), coronary: coronaryOf(b.parent) }));
  return { vessels: all, bifurcations };
}

// target: { kind: 'segment' | 'bifurcation', id }. Overlap counts only vessels of the target's own
// coronary, because only that coronary holds contrast during its injection.
export function measureTarget(model, target, pose) {
  return target.kind === 'segment' ? measureSegment(model, target.id, pose) : measureBifurcation(model, target.id, pose);
}

function measureSegment(model, id, pose) {
  const vessel = model.vessels.find((v) => v.id === id);
  const result = judge(model, { ...vessel, from: [id] }, pose);
  return { kind: 'segment', label: vessel.label, ...result, highlight: [vessel.samples] };
}

function measureBifurcation(model, id, pose) {
  const b = model.bifurcations.find((x) => x.id === id);
  const parent = stretch(model, b.parent, b.point, -1);
  const daughters = b.daughters.map((d) => stretch(model, d, b.point, 1));
  const parts = [
    { role: 'parent', ...judge(model, parent, pose) },
    ...daughters.map((d) => ({ role: 'daughter', ...judge(model, d, pose) })),
  ];

  const between = Math.max(...[0, 1].map((i) => percent(overlap(daughters[i], [daughters[1 - i]], pose))));
  const ends = daughters.map((d) => d.samples[d.samples.length - 1]);
  const trueDeg = angleDeg(sub(ends[0], b.at), sub(ends[1], b.at));
  const [tip, ...flatEnds] = [b.at, ...ends].map((p) => projectToDetector(pose, p));
  const projectedDeg = angleDeg(...flatEnds.map((e) => sub(e, tip)));
  const share = percent(projectedDeg / trueDeg);
  const carina = { projectedDeg: Math.round(projectedDeg), trueDeg: Math.round(trueDeg), share, color: share >= 100 * CARINA_OPEN_SHARE ? 'green' : 'red' };

  const daughtersOverlap = { percent: between, color: overlapColor(between) };
  return {
    kind: 'bifurcation',
    label: b.name,
    parts,
    daughtersOverlap,
    carina,
    color: worst([...parts.map((p) => p.color), daughtersOverlap.color, carina.color]),
    highlight: [parent.samples, ...daughters.map((d) => d.samples)],
    at: b.at,
  };
}

// Foreshortening and overlap of one piece. `from` lists the segments the piece is cut from;
// they are the target itself, so they never overlap it.
function judge(model, piece, pose) {
  const others = model.vessels.filter((v) => v.coronary === piece.coronary && !piece.from.includes(v.id));
  const f = percent(foreshortening(piece.samples, pose));
  const o = percent(overlap(piece, others, pose));
  const first = model.vessels.find((v) => v.id === piece.from[0]);
  return { label: first.label, foreshortening: f, overlap: o, color: worst([foreshorteningColor(f), overlapColor(o)]) };
}

// ORIGIN_CM of segment `id`'s centerline from the named point, toward the segment's start (−1) or end (+1).
// Going toward the end, it runs on into the segment that continues this one where needed.
function stretch(model, id, pointName, direction) {
  const vessel = model.vessels.find((v) => v.id === id);
  const at = vessel.points.indexOf(pointName) * SAMPLES_PER_INTERVAL;
  let samples, near;
  const from = [id];
  if (direction < 0) {
    samples = vessel.samples.slice(0, at + 1).reverse();
    near = vessel.near.slice(0, at + 1).reverse();
  } else {
    samples = vessel.samples.slice(at);
    near = vessel.near.slice(at);
    const last = vessel.points[vessel.points.length - 1];
    const next = model.vessels.find((v) => v.segment && v.parent === id && v.points[0] === last);
    if (next) {
      samples = samples.concat(next.samples.slice(1));
      near = near.concat(next.near.slice(1));
      from.push(next.id);
    }
  }
  const cut = { samples: [samples[0]], near: [near[0]] };
  let length = 0;
  for (let k = 1; k < samples.length && length < ORIGIN_CM; k++) {
    const step = Math.hypot(...sub(samples[k], samples[k - 1]));
    const t = Math.min(1, (ORIGIN_CM - length) / step);
    cut.samples.push(samples[k - 1].map((v, j) => v + t * (samples[k][j] - v)));
    cut.near.push(t === 1 ? near[k] : near[k - 1]);
    length += t * step;
  }
  return { ...cut, length, size: vessel.size, coronary: vessel.coronary, from };
}

// The target under a tap at `point` ([right, up] cm on the detector), or null. Branch points win
// within half the tolerance, so a tap on the middle of a short segment still picks the segment.
export function pickTarget(model, pose, point, toleranceCm, injected) {
  const shown = (coronary) => injected.includes(coronary);
  let best = null;
  for (const b of model.bifurcations.filter((x) => shown(x.coronary))) {
    const d = Math.hypot(...sub(projectToDetector(pose, b.at), point));
    if (d < toleranceCm / 2 && (!best || d < best.d)) best = { d, target: { kind: 'bifurcation', id: b.id } };
  }
  if (best) return best.target;
  for (const v of model.vessels.filter((x) => x.segment && shown(x.coronary))) {
    const flat = v.samples.map((p) => projectToDetector(pose, p));
    for (let q = 1; q < flat.length; q++) {
      const d = distanceToStep(point[0], point[1], flat[q - 1], flat[q]);
      if (d < toleranceCm && (!best || d < best.d)) best = { d, target: { kind: 'segment', id: v.id } };
    }
  }
  return best ? best.target : null;
}

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const distance = (a, b) => Math.hypot(...sub(a, b));
const percent = (share) => Math.round(100 * share);
const angleDeg = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (Math.hypot(...a) * Math.hypot(...b))))) * 180) / Math.PI;

// Distance in the picture from point (px, py) to the step from a to b. Plain numbers, no arrays:
// this runs hundreds of thousands of times per measure.
function distanceToStep(px, py, a, b) {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - a[0]) * abx + (py - a[1]) * aby) / lengthSq)) : 0;
  return Math.hypot(px - a[0] - t * abx, py - a[1] - t * aby);
}
