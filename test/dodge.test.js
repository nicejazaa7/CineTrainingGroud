import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { polarToCartesian, parseDodgeCsv, toMeasuredPoints } from '../src/dodge.js';

const rows = parseDodgeCsv(readFileSync('data/dodge1988.csv', 'utf8'));
const points = toMeasuredPoints(rows);
const find = (table, location) => points.find((p) => p.table === table && p.location === location);

test('axis directions follow Dodge Figure 3', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
  const anterior = polarToCartesian(1, 0, 0);
  near(anterior.z, 1);
  const left = polarToCartesian(1, 90, 0);
  near(left.x, 1);
  const head = polarToCartesian(1, 0, 90);
  near(head.y, 1);
});

test('conversion keeps the distance r', () => {
  for (const row of rows) {
    const p = polarToCartesian(row.r_cm, row.theta_deg, row.phi_deg);
    assert.ok(Math.abs(Math.hypot(p.x, p.y, p.z) - row.r_cm) < 1e-9, row.location);
  }
});

test('all 47 table rows are present', () => {
  assert.equal(rows.length, 47);
  assert.deepEqual(
    [3, 4, 5].map((t) => rows.filter((r) => r.table === t).length),
    [21, 17, 9],
  );
});

test('LAD apex lands anterior, inferior and to the left (PLAN session 1 check)', () => {
  const apex = find(3, 'L4 proximal (apex)');
  assert.ok(apex.x > 0, 'left');
  assert.ok(apex.y < 0, 'inferior');
  assert.ok(apex.z > 0, 'anterior');
});

test('RCA ostium is anterior and to the right of the left ostium', () => {
  const rca = find(3, 'RCA ostium');
  assert.ok(rca.x < 0, 'right');
  assert.ok(rca.z > 0, 'anterior');
});

test('RCA points are shifted into the left-ostium frame', () => {
  const rca = find(3, 'RCA ostium');
  const r1 = rows.find((r) => r.table === 5 && r.location === 'R1 proximal');
  const local = polarToCartesian(r1.r_cm, r1.theta_deg, r1.phi_deg);
  const shifted = find(5, 'R1 proximal');
  assert.ok(Math.abs(shifted.x - (rca.x + local.x)) < 0.02);
  assert.ok(Math.abs(shifted.z - (rca.z + local.z)) < 0.02);
});

test('distal RCA (R4) lies posterior to the RCA ostium', () => {
  assert.ok(find(5, 'R4 mid').z < find(3, 'RCA ostium').z);
});
