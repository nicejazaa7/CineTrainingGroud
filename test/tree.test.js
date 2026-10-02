import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTree } from '../src/tree.js';
import { isInsideShell } from '../src/shell.js';

const measured = JSON.parse(readFileSync('data/dodge1988-points.json', 'utf8')).points;
const spec = JSON.parse(readFileSync('data/tree-spec.json', 'utf8'));
const tree = buildTree(measured, spec);
const segment = (syntax) => tree.segments.find((s) => s.syntax === syntax);

test('every segment has a SYNTAX number and a name (PLAN session 2 check)', () => {
  for (const s of tree.segments) {
    assert.match(s.syntax, /^\d+[a-c]?$/, `bad number on ${s.name}`);
    assert.ok(s.name.trim().length > 0, `segment ${s.syntax} has no name`);
    assert.equal(s.label, `${s.name} (${s.syntax})`);
  }
  const numbers = tree.segments.map((s) => s.syntax);
  assert.equal(new Set(numbers).size, numbers.length, 'duplicate SYNTAX number');
});

test('no authored point lies inside the heart shell (PLAN session 2 check)', () => {
  const authored = Object.entries(tree.points).filter(([, p]) => p.source === 'authored');
  assert.ok(authored.length > 0);
  for (const [name, p] of authored) assert.ok(!isInsideShell(tree.shell, p), `${name} is inside the shell`);
});

test('every point is labelled measured or authored, and authored points say why', () => {
  for (const [name, p] of Object.entries(tree.points)) {
    assert.ok(['measured', 'authored'].includes(p.source), name);
    if (p.source === 'authored') assert.ok(p.note, `${name} has no note`);
  }
});

test('measured points keep their Dodge coordinates exactly', () => {
  for (const m of measured) {
    const p = tree.points[m.location];
    if (!p || m.location === 'Catheter') continue;
    assert.deepEqual([p.x, p.y, p.z], [m.x, m.y, m.z], m.location);
  }
});

test('the 5 PLAN bifurcations exist and sit on their parent and daughters', () => {
  assert.deepEqual(tree.bifurcations.map((b) => b.id), ['LM', 'LAD-D1', 'LAD-D2', 'LCx-OM1', 'crux']);
  for (const b of tree.bifurcations) {
    assert.ok(segment(b.parent).points.includes(b.point), `${b.id}: point not on parent`);
    assert.equal(b.daughters.length, 2);
    for (const d of b.daughters) {
      const pts = segment(d).points;
      const i = pts.indexOf(b.point);
      assert.ok(i >= 0 && i < pts.length - 1, `${b.id}: daughter ${d} does not continue from the point`);
    }
  }
});

test('every segment and side branch starts on its parent', () => {
  for (const s of [...tree.segments, ...tree.sideBranches]) {
    if (s.parent === null) continue;
    assert.ok(segment(s.parent).points.includes(s.points[0]), `${s.syntax ?? s.id} is detached`);
  }
});

test('heart shell fits the surface points and its long axis points to the apex', () => {
  assert.ok(tree.shell.rmsCm < 0.5, `fit RMS ${tree.shell.rmsCm} cm`);
  const [x, y, z] = tree.shell.axes[0];
  assert.ok(x > 0 && y < 0 && z > 0, 'long axis should point left, inferior and anterior');
});

test('septal mid points lie inside the shell, as septals run in the septum', () => {
  for (const b of tree.sideBranches) assert.ok(isInsideShell(tree.shell, tree.points[b.points[1]]), b.id);
});

test('balanced-anatomy and variant branches are left out of the right-dominant tree', () => {
  for (const name of ['C4 mid', 'MR mid', 'OM origin', 'OM bifurcat', 'OM ant mid', 'OM pos mid', 'M3 origin', 'M3 mid']) {
    assert.ok(!(name in tree.points), name);
  }
});

test('data/coronary-tree.json is up to date with the spec (run npm run build:tree)', () => {
  assert.deepEqual(JSON.parse(readFileSync('data/coronary-tree.json', 'utf8')), tree);
});
