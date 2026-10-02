// Regenerates data/dodge1988-points.json from data/dodge1988.csv.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseDodgeCsv, toMeasuredPoints } from '../src/dodge.js';

const rows = parseDodgeCsv(readFileSync('data/dodge1988.csv', 'utf8'));
const points = toMeasuredPoints(rows);

const out = {
  source: 'Dodge et al. Circulation 1988;78:1167, Tables 3-5, right-dominant men',
  frame: 'origin = left coronary ostium; x = patient left, y = head, z = anterior; cm',
  points,
};
writeFileSync('data/dodge1988-points.json', JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${points.length} points to data/dodge1988-points.json`);
