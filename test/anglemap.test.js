import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carmPose, CLINICAL_RANGE } from '../src/carm.js';
import { measureModel, measureTarget } from '../src/measure.js';
import { cellProjection, allTargets, targetKey, CODE, COLOR_OF_CODE, MAP_STEP_DEG, MAP_COLUMNS, MAP_ROWS } from '../src/anglemap.js';

const tree = JSON.parse(readFileSync('data/coronary-tree.json', 'utf8'));
const file = JSON.parse(readFileSync('data/angle-maps.json', 'utf8'));
const model = measureModel(tree);
const targets = allTargets(model);

// The cells of one map inside the clinical range, as colour words.
function clinicalCells(map) {
  const cells = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let column = 0; column < MAP_COLUMNS; column++) {
      const [primary, secondary] = cellProjection(column, row);
      const inside = (key, v) => CLINICAL_RANGE[key][0] <= v && v <= CLINICAL_RANGE[key][1];
      if (inside('primary', primary) && inside('secondary', secondary)) cells.push(COLOR_OF_CODE[map[row * MAP_COLUMNS + column]]);
    }
  }
  return cells;
}
const greenShare = (id) => {
  const cells = clinicalCells(file.maps[targetKey({ kind: 'segment', id })]);
  return cells.filter((c) => c === 'green').length / cells.length;
};

test('the grid runs from RAO 120 / CRA 45 at the top left to LAO 120 / CAU 45 at the bottom right', () => {
  assert.deepEqual(cellProjection(0, 0), [-120, 45]);
  assert.deepEqual(cellProjection(MAP_COLUMNS - 1, MAP_ROWS - 1), [120, -45]);
  assert.deepEqual(cellProjection((MAP_COLUMNS - 1) / 2, (MAP_ROWS - 1) / 2), [0, 0]);
});

test('data/angle-maps.json has one full map per target', () => {
  assert.equal(file.step, MAP_STEP_DEG);
  assert.deepEqual(Object.keys(file.maps).sort(), targets.map(targetKey).sort());
  for (const [key, map] of Object.entries(file.maps)) {
    assert.equal(map.length, MAP_ROWS * MAP_COLUMNS, key);
    assert.match(map, /^[gar]+$/, key);
  }
});

test('data/angle-maps.json matches the measures (rerun npm run build:maps if this fails)', () => {
  // Every 10° is enough to catch a stale file and keeps the test to a couple of seconds.
  const every = 10 / MAP_STEP_DEG;
  for (const target of targets) {
    const map = file.maps[targetKey(target)];
    for (let row = 0; row < MAP_ROWS; row += every) {
      for (let column = 0; column < MAP_COLUMNS; column += every) {
        const projection = cellProjection(column, row);
        const { color } = measureTarget(model, target, carmPose(...projection, tree.shell.center));
        assert.equal(map[row * MAP_COLUMNS + column], CODE[color], `${targetKey(target)} at ${projection}`);
      }
    }
  }
});

// Green 2005 (PMID 15744720): a computer-chosen view with almost no foreshortening and under 2%
// overlap existed for each stented segment, and RCA views were the least foreshortened.
test('Green 2005: every segment has a green projection inside the clinical range', () => {
  for (const target of targets.filter((t) => t.kind === 'segment')) {
    assert.ok(clinicalCells(file.maps[targetKey(target)]).includes('green'), targetKey(target));
  }
});

test('Green 2005: the proximal and mid RCA are green over more of the clinical range than any left segment', () => {
  const left = targets.filter((t) => t.kind === 'segment' && model.vessels.find((v) => v.id === t.id).coronary === 'left');
  const bestLeft = Math.max(...left.map((t) => greenShare(t.id)));
  for (const id of ['1', '2']) assert.ok(greenShare(id) > bestLeft, `segment ${id}: ${greenShare(id)} vs ${bestLeft}`);
});
