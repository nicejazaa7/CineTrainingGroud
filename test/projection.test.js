import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carmPose, projectToDetector, SOURCE_TO_DETECTOR_CM, SOURCE_TO_ISOCENTER_CM } from '../src/carm.js';
import { vertebrae, diaphragmHeight } from '../src/landmarks.js';

const tree = JSON.parse(readFileSync('data/coronary-tree.json', 'utf8'));
const ISO = tree.shell.center;
const close = (actual, expected, msg) =>
  expected.forEach((v, i) => assert.ok(Math.abs(actual[i] - v) < 1e-9, `${msg}: got [${actual}], want [${expected}]`));
const add = (a, b, k = 1) => a.map((v, i) => v + k * b[i]);

test('the isocenter and every point on the beam axis land on the detector center', () => {
  for (const [a, b] of [[0, 0], [40, -25], [-30, 30], [120, 45]]) {
    const pose = carmPose(a, b, ISO);
    close(projectToDetector(pose, ISO), [0, 0], `${a}/${b} isocenter`);
    close(projectToDetector(pose, add(ISO, pose.towardDetector, -20)), [0, 0], `${a}/${b} near the source`);
  }
});

test('magnification is source-to-detector over source-to-point distance', () => {
  const pose = carmPose(40, -25, ISO);
  const m = SOURCE_TO_DETECTOR_CM / SOURCE_TO_ISOCENTER_CM;
  close(projectToDetector(pose, add(ISO, pose.imageRight)), [m, 0], '1 cm right at the isocenter');
  close(projectToDetector(pose, add(ISO, pose.imageUp, 2)), [0, 2 * m], '2 cm up at the isocenter');
  const nearer = add(add(ISO, pose.imageRight), pose.towardDetector, -25);
  close(projectToDetector(pose, nearer), [2, 0], 'halfway to the source doubles the size');
});

test('AP: the patient\'s left lands on the picture right, the head on the picture top', () => {
  const pose = carmPose(0, 0, ISO);
  assert.ok(projectToDetector(pose, add(ISO, [1, 0, 0]))[0] > 0);
  assert.ok(projectToDetector(pose, add(ISO, [0, 1, 0]))[1] > 0);
});

test('spine on the picture right in LAO and on the picture left in RAO (PLAN session 4 check)', () => {
  const spine = vertebrae();
  for (let secondary = -40; secondary <= 40; secondary += 20) {
    for (const primary of [20, 30, 45, 60, 90]) {
      const pose = carmPose(primary, secondary, ISO);
      for (const v of spine) assert.ok(projectToDetector(pose, v.center)[0] > 0, `LAO ${primary} / ${secondary}`);
    }
    for (const primary of [-20, -30, -45, -60, -90]) {
      const pose = carmPose(primary, secondary, ISO);
      for (const v of spine) assert.ok(projectToDetector(pose, v.center)[0] < 0, `RAO ${-primary} / ${secondary}`);
    }
  }
});

test('the spine lies behind every vessel, and the diaphragm below every vessel', () => {
  const spineFront = Math.max(...vertebrae().map((v) => v.center[2] + v.radius));
  for (const [name, p] of Object.entries(tree.points)) {
    assert.ok(p.z > spineFront, `${name} is not in front of the spine`);
    assert.ok(p.y > diaphragmHeight(p.x, p.z), `${name} is below the diaphragm`);
  }
});

test('the diaphragm lies under the heart, close below its lowest vessels', () => {
  const lowest = Object.values(tree.points).reduce((a, b) => (a.y < b.y ? a : b));
  const gap = lowest.y - diaphragmHeight(lowest.x, lowest.z);
  assert.ok(gap > 0 && gap < 1.5, `gap ${gap.toFixed(2)} cm`);
});
