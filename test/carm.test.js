import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  carmPose, formatProjection, FULL_RANGE, CLINICAL_RANGE,
  SOURCE_TO_DETECTOR_CM, SOURCE_TO_ISOCENTER_CM,
} from '../src/carm.js';
import { polarToCartesian } from '../src/dodge.js';

const close = (actual, expected, msg) =>
  expected.forEach((v, i) => assert.ok(Math.abs(actual[i] - v) < 1e-9, `${msg}: got [${actual}], want [${expected}]`));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a, b) => a.map((v, i) => v - b[i]);
const ISO = [1, -5, 3];
const DETECTOR_CM = SOURCE_TO_DETECTOR_CM - SOURCE_TO_ISOCENTER_CM;

test('AP: detector straight above the supine patient (anterior), source below', () => {
  const pose = carmPose(0, 0, ISO);
  close(pose.detector, [1, -5, 3 + DETECTOR_CM], 'detector');
  close(pose.source, [1, -5, 3 - SOURCE_TO_ISOCENTER_CM], 'source');
});

test("LAO 90: detector at the patient's left (PLAN session 3 check)", () => {
  close(carmPose(90, 0, ISO).detector, [1 + DETECTOR_CM, -5, 3], 'detector');
  close(carmPose(90, 0, ISO).source, [1 - SOURCE_TO_ISOCENTER_CM, -5, 3], 'source');
});

test("RAO 90: detector at the patient's right", () => {
  close(carmPose(-90, 0, ISO).detector, [1 - DETECTOR_CM, -5, 3], 'detector');
});

test('CRA 30: detector tilts toward the head (PLAN session 3 check)', () => {
  close(carmPose(0, 30).towardDetector, [0, 0.5, Math.sqrt(3) / 2], 'beam axis');
  close(carmPose(0, -30).towardDetector, [0, -0.5, Math.sqrt(3) / 2], 'CAU 30 tilts toward the feet');
});

test('LAO 45 / CRA 30: detector is left, anterior and toward the head', () => {
  const [x, y, z] = carmPose(45, 30).towardDetector;
  assert.ok(x > 0 && y > 0 && z > 0);
  assert.ok(Math.abs(y - 0.5) < 1e-9, 'the secondary angle alone sets the head-foot tilt');
});

test("beam axis uses the same angles as Dodge's θ (primary) and Φ (secondary)", () => {
  for (let a = -120; a <= 120; a += 15) {
    for (let b = -45; b <= 45; b += 15) {
      const p = polarToCartesian(1, a, b);
      close(carmPose(a, b).towardDetector, [p.x, p.y, p.z], `${a}/${b}`);
    }
  }
});

test('source, isocenter and detector lie on one line, 100 cm from source to detector', () => {
  for (const [a, b] of [[0, 0], [40, -25], [-30, 30], [120, 45], [-120, -45]]) {
    const pose = carmPose(a, b, ISO);
    const sd = sub(pose.detector, pose.source);
    assert.ok(Math.abs(Math.hypot(...sd) - SOURCE_TO_DETECTOR_CM) < 1e-9, `${a}/${b} distance`);
    close(sub(ISO, pose.source).map((v) => v / SOURCE_TO_ISOCENTER_CM), pose.towardDetector, `${a}/${b} line`);
  }
});

test('picture axes: at AP right = patient left, up = head; always square to the beam', () => {
  const ap = carmPose(0, 0);
  close(ap.imageRight, [1, 0, 0], 'AP image right');
  close(ap.imageUp, [0, 1, 0], 'AP image up');
  for (const [a, b] of [[40, -25], [-30, 30], [90, 0], [120, 45], [-120, -45]]) {
    const { imageRight: r, imageUp: u, towardDetector: d } = carmPose(a, b);
    for (const v of [r, u, d]) assert.ok(Math.abs(dot(v, v) - 1) < 1e-9, `${a}/${b} unit length`);
    assert.ok(Math.abs(dot(r, u)) < 1e-9 && Math.abs(dot(r, d)) < 1e-9 && Math.abs(dot(u, d)) < 1e-9, `${a}/${b} square`);
    close(cross(r, u), d, `${a}/${b} right-handed`);
  }
});

test('projection names', () => {
  assert.equal(formatProjection(0, 0), 'AP');
  assert.equal(formatProjection(40, -25), 'LAO 40 / CAU 25');
  assert.equal(formatProjection(-30, 0), 'RAO 30');
  assert.equal(formatProjection(0, 30), 'AP / CRA 30');
});

test('clinical range lies inside the full range', () => {
  for (const k of ['primary', 'secondary']) {
    assert.ok(FULL_RANGE[k][0] <= CLINICAL_RANGE[k][0] && CLINICAL_RANGE[k][1] <= FULL_RANGE[k][1], k);
  }
});
