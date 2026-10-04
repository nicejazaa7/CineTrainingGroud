// Best angle map (docs/PLAN.md, session 7): one target's traffic-light colour at every projection
// on a grid over the full range. The maps are computed once by scripts/build-maps.js
// (docs/adr/0005), so a phone only draws them.
import { FULL_RANGE, carmPose } from './carm.js';
import { measureTarget } from './measure.js';

export const MAP_STEP_DEG = 2;
const [PRIMARY_MIN, PRIMARY_MAX] = FULL_RANGE.primary;
const [SECONDARY_MIN, SECONDARY_MAX] = FULL_RANGE.secondary;
export const MAP_COLUMNS = (PRIMARY_MAX - PRIMARY_MIN) / MAP_STEP_DEG + 1;
export const MAP_ROWS = (SECONDARY_MAX - SECONDARY_MIN) / MAP_STEP_DEG + 1;

// Laid out as the map is drawn: columns run from RAO 120 (left) to LAO 120 (right),
// rows from CRA 45 (top) to CAU 45 (bottom). Returns [primary, secondary].
export const cellProjection = (column, row) => [PRIMARY_MIN + column * MAP_STEP_DEG, SECONDARY_MAX - row * MAP_STEP_DEG];

// One letter per cell, row after row.
export const CODE = { green: 'g', amber: 'a', red: 'r' };
export const COLOR_OF_CODE = { g: 'green', a: 'amber', r: 'red' };

// The key of a target's map in data/angle-maps.json, for example "segment:6" or "bifurcation:LM".
export const targetKey = ({ kind, id }) => `${kind}:${id}`;

// Every target of the model: all numbered segments and all bifurcations.
export const allTargets = (model) => [
  ...model.vessels.filter((v) => v.segment).map((v) => ({ kind: 'segment', id: v.id })),
  ...model.bifurcations.map((b) => ({ kind: 'bifurcation', id: b.id })),
];

export function computeMap(model, target, isocenter) {
  let map = '';
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let column = 0; column < MAP_COLUMNS; column++) {
      map += CODE[measureTarget(model, target, carmPose(...cellProjection(column, row), isocenter)).color];
    }
  }
  return map;
}
