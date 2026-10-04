import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carmPose, projectToDetector } from '../src/carm.js';
import { sampleCenterline } from '../src/centerline.js';
import {
  foreshortening, overlap, makePiece, measureModel, measureTarget, pickTarget,
  foreshorteningColor, overlapColor, ORIGIN_CM,
} from '../src/measure.js';

const tree = JSON.parse(readFileSync('data/coronary-tree.json', 'utf8'));
const ISO = tree.shell.center;
const model = measureModel(tree);
const add = (a, b, k = 1) => a.map((v, i) => v + k * b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// A straight vessel through `center` along `direction`, `length` cm long.
const straight = (center, direction, length) => sampleCenterline([add(center, direction, -length / 2), center, add(center, direction, length / 2)], 32);
const arcLength = (samples) => samples.slice(1).reduce((s, p, k) => s + Math.hypot(...sub(p, samples[k])), 0);

test('parallel to the detector shows 0% foreshortening; tilted 60° shows 50% (PLAN session 6 check)', () => {
  const DEG = Math.PI / 180;
  for (const [a, b] of [[0, 0], [-30, -25], [45, -30], [40, 35], [90, 0]]) {
    const pose = carmPose(a, b, ISO);
    for (const inPlane of [pose.imageRight, pose.imageUp]) {
      assert.ok(Math.abs(foreshortening(straight(ISO, inPlane, 4), pose)) < 1e-9, `${a}/${b} parallel`);
      const tilted = add(inPlane.map((v) => v * Math.cos(60 * DEG)), pose.towardDetector, Math.sin(60 * DEG));
      assert.ok(Math.abs(foreshortening(straight(ISO, tilted, 4), pose) - 0.5) < 1e-9, `${a}/${b} tilted 60°`);
    }
  }
});

test('a vessel crossing at a right angle covers the width of both shadows', () => {
  const pose = carmPose(30, -20, ISO);
  const target = makePiece(straight(ISO, pose.imageRight, 10), 'main', []);
  const crossing = makePiece(straight(ISO, pose.imageUp, 10), 'main', []);
  // Shadows touch while the centerlines are under one main-vessel diameter (0.35 cm) apart: 0.7 of 10 cm.
  // Each step counts whole, so the answer is good to one step (10 cm / 64 steps).
  const share = overlap(target, [crossing], pose);
  assert.ok(Math.abs(share - 0.07) <= 10 / 64 / 10, `${share}`);
  const behind = makePiece(straight(add(ISO, pose.imageUp, 3), pose.imageRight, 10), 'main', []);
  assert.equal(overlap(target, [behind], pose), 0, 'a vessel 3 cm away does not overlap');
});

test('a branch leaving from a branch point does not count as overlap there', () => {
  const pose = carmPose(0, 0, ISO);
  const target = straight(ISO, pose.imageRight, 10);
  const branch = sampleCenterline([ISO, add(ISO, pose.imageUp, 5)], 32);
  assert.ok(overlap(makePiece(target, 'main', []), [makePiece(branch, 'branch', [])], pose) > 0.04, 'without the branch point it would count');
  assert.equal(overlap(makePiece(target, 'main', [ISO]), [makePiece(branch, 'branch', [ISO])], pose), 0);
});

test('traffic-light thresholds follow the PLAN table', () => {
  assert.deepEqual([0, 10, 11, 19, 20, 60].map(foreshorteningColor), ['green', 'green', 'amber', 'amber', 'red', 'red']);
  assert.deepEqual([0, 5, 6, 20, 21, 100].map(overlapColor), ['green', 'green', 'amber', 'amber', 'red', 'red']);
});

test('every bifurcation check judges the full 10 mm of the parent and both daughters', () => {
  const pose = carmPose(0, 0, ISO);
  for (const b of model.bifurcations) {
    const result = measureTarget(model, { kind: 'bifurcation', id: b.id }, pose);
    assert.equal(result.highlight.length, 3);
    for (const piece of result.highlight) assert.ok(Math.abs(arcLength(piece) - ORIGIN_CM) < 1e-6, `${b.id}: ${arcLength(piece)} cm`);
  }
});

test('the carina opens fully when the beam is square to the bifurcation, and closes edge-on', () => {
  for (const b of model.bifurcations) {
    const ends = measureTarget(model, { kind: 'bifurcation', id: b.id }, carmPose(0, 0, ISO)).highlight.slice(1).map((s) => s[s.length - 1]);
    const [u, v] = ends.map((e) => sub(e, b.at));
    const angles = (d) => {
      const n = d.map((x) => x / Math.hypot(...d));
      return [(Math.atan2(n[0], n[2]) * 180) / Math.PI, (Math.asin(n[1]) * 180) / Math.PI];
    };
    // Square on: the beam along the normal of the plane holding both daughters. The isocenter is moved
    // onto the branch point so the perspective is the same on both sides.
    const square = carmPose(...angles(cross(u, v)), b.at);
    assert.ok(Math.abs(measureTarget(model, { kind: 'bifurcation', id: b.id }, square).carina.share - 100) <= 2, b.id);
    // Edge-on: the beam lies in that plane, square to the line halfway between the daughters,
    // so both daughters fall on one line on the same side of the branch point.
    const unit = (d) => d.map((x) => x / Math.hypot(...d));
    const edgeOn = carmPose(...angles(cross(cross(u, v), add(unit(u), unit(v)))), b.at);
    assert.ok(measureTarget(model, { kind: 'bifurcation', id: b.id }, edgeOn).carina.share < 10, b.id);
  }
});

test('a tap picks the branch point, the segment, or nothing', () => {
  const pose = carmPose(-30, -25, ISO);
  const lm = model.bifurcations.find((b) => b.id === 'LM');
  assert.deepEqual(pickTarget(model, pose, projectToDetector(pose, lm.at), 1, ['left']), { kind: 'bifurcation', id: 'LM' });
  const lcx = model.vessels.find((v) => v.id === '13');
  const middle = projectToDetector(pose, lcx.samples[Math.floor(lcx.samples.length / 2)]);
  assert.deepEqual(pickTarget(model, pose, middle, 0.3, ['left']), { kind: 'segment', id: '13' });
  assert.equal(pickTarget(model, pose, [11, 11], 0.3, ['left']), null, 'picture corner');
  const rca = model.vessels.find((v) => v.id === '2');
  const onRca = projectToDetector(pose, rca.samples[Math.floor(rca.samples.length / 2)]);
  assert.notDeepEqual(pickTarget(model, pose, onRca, 0.3, ['left']), { kind: 'segment', id: '2' }, 'RCA not injected');
  assert.deepEqual(pickTarget(model, pose, onRca, 0.3, ['right']), { kind: 'segment', id: '2' });
});

test('the centerline passes through every point of the vessel', () => {
  for (const v of model.vessels) {
    v.points.forEach((name, k) => {
      const p = tree.points[name];
      assert.ok(Math.hypot(...sub(v.samples[32 * k], [p.x, p.y, p.z])) < 1e-9, `${v.id} point ${k}`);
    });
  }
});
