import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FULL_RANGE } from '../src/carm.js';

const { views } = JSON.parse(readFileSync('data/standard-views.json', 'utf8'));
const tree = JSON.parse(readFileSync('data/coronary-tree.json', 'utf8'));

test('10 standard views: 7 for the left coronary, 3 for the right (PLAN settled decisions)', () => {
  assert.equal(views.filter((v) => v.coronary === 'left').length, 7);
  assert.equal(views.filter((v) => v.coronary === 'right').length, 3);
  assert.equal(new Set(views.map((v) => v.id)).size, views.length, 'duplicate id');
});

test('every standard view is a whole-degree projection inside the full range, with both notes', () => {
  for (const v of views) {
    for (const k of ['primary', 'secondary']) {
      assert.ok(Number.isInteger(v[k]), `${v.id} ${k}`);
      assert.ok(FULL_RANGE[k][0] <= v[k] && v[k] <= FULL_RANGE[k][1], `${v.id} ${k}`);
    }
    assert.ok(v.opens.trim() && v.hides.trim(), `${v.id} notes`);
    assert.ok(['draft', 'fellow edited', 'attending approved'].includes(v.status), `${v.id} status`);
  }
});

test('notes name segments exactly as the tree does, for example "proximal LAD (6)"', () => {
  const labels = new Set(tree.segments.map((s) => s.label));
  for (const v of views) {
    for (const [label] of `${v.opens} ${v.hides}`.matchAll(/[A-Za-z][A-Za-z ]*\(\d+[a-c]?\)/g)) {
      // The match may start a few words early ("and the distal LCx (13)"), so try its endings.
      const words = label.split(' ');
      const found = words.some((_, i) => labels.has(words.slice(i).join(' ')));
      assert.ok(found, `${v.id}: "${label}" is not a segment name in coronary-tree.json`);
    }
  }
});

test('the injection splits the tree: RCA vessels are the right coronary, all others the left', async () => {
  const { vessels } = await import('../src/vessels.js');
  const list = vessels(tree);
  assert.ok(list.every((v) => v.coronary === (v.artery === 'RCA' ? 'right' : 'left')));
  assert.equal(list.filter((v) => v.coronary === 'right').length, 6, 'segments 1, 2, 3, 4, 16, 16a');
});
