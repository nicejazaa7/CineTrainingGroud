// Regenerates data/angle-maps.json: the best angle map of every target (docs/adr/0005).
// Rerun after changing the tree, the measures or the traffic-light thresholds. It takes about a minute.
import { readFileSync, writeFileSync } from 'node:fs';
import { measureModel } from '../src/measure.js';
import { computeMap, allTargets, targetKey, MAP_STEP_DEG, MAP_COLUMNS, MAP_ROWS } from '../src/anglemap.js';

const tree = JSON.parse(readFileSync('data/coronary-tree.json', 'utf8'));
const model = measureModel(tree);
const maps = {};
for (const target of allTargets(model)) {
  const start = performance.now();
  maps[targetKey(target)] = computeMap(model, target, tree.shell.center);
  console.log(`${targetKey(target)}: ${Math.round(performance.now() - start)} ms`);
}

const about = `Made by npm run build:maps; do not edit. Traffic-light colour of each target (g green, a amber, r red) every ${MAP_STEP_DEG}° over the full range: ${MAP_ROWS} rows from CRA 45 to CAU 45, each of ${MAP_COLUMNS} cells from RAO 120 to LAO 120 (src/anglemap.js).`;
// One map per line keeps the diff readable when one target changes.
const lines = Object.entries(maps).map(([key, map]) => `    ${JSON.stringify(key)}: ${JSON.stringify(map)}`);
const text = `{\n  "about": ${JSON.stringify(about)},\n  "step": ${MAP_STEP_DEG},\n  "maps": {\n${lines.join(',\n')}\n  }\n}\n`;
writeFileSync('data/angle-maps.json', text);
console.log(`Wrote ${lines.length} maps to data/angle-maps.json.`);
