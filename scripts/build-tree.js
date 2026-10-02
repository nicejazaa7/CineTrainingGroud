// Regenerates data/coronary-tree.json from the Dodge points and data/tree-spec.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildTree } from '../src/tree.js';

const measured = JSON.parse(readFileSync('data/dodge1988-points.json', 'utf8')).points;
const spec = JSON.parse(readFileSync('data/tree-spec.json', 'utf8'));
const tree = buildTree(measured, spec);

writeFileSync('data/coronary-tree.json', JSON.stringify(tree, null, 2) + '\n');
const count = (s) => Object.values(tree.points).filter((p) => p.source === s).length;
console.log(
  `Wrote ${tree.segments.length} segments, ${tree.sideBranches.length} side branches, ` +
    `${tree.bifurcations.length} bifurcations (${count('measured')} measured + ${count('authored')} authored points) ` +
    `to data/coronary-tree.json. Shell fit RMS ${tree.shell.rmsCm} cm.`,
);
