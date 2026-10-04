import { createRoomView } from './room.js';
import { createAngiogram } from './angiogram.js';
import { FULL_RANGE, CLINICAL_RANGE, formatProjection, projectionDuringMove, moveDurationMs } from './carm.js';

const [tree, { views }] = await Promise.all(
  ['data/coronary-tree.json', 'data/standard-views.json'].map(async (url) => (await fetch(url)).json()),
);
const room = createRoomView(document.getElementById('room'), tree);
const angiogram = createAngiogram(document.getElementById('angiogram'), tree);

const colorCoding = document.getElementById('color-coding');
// Browsers may restore the box's state on reload, so read it once at start too.
const applyColorCoding = () => angiogram.setColorCoding(colorCoding.checked);
colorCoding.addEventListener('change', applyColorCoding);
applyColorCoding();

const inputs = {};
for (const key of ['primary', 'secondary']) {
  const input = document.getElementById(key);
  const [min, max] = FULL_RANGE[key];
  const fraction = (v) => (v - min) / (max - min);
  Object.assign(input, { min, max, step: 1, value: 0 });
  const band = input.parentElement;
  band.style.setProperty('--from', fraction(CLINICAL_RANGE[key][0]));
  band.style.setProperty('--to', fraction(CLINICAL_RANGE[key][1]));
  // Moving a slider by hand stops any C-arm move and leaves the standard view.
  input.addEventListener('input', () => {
    cancelAnimationFrame(move);
    selectView(null);
    show([Number(inputs.primary.value), Number(inputs.secondary.value)]);
  });
  inputs[key] = input;
}

let current = [0, 0];
let move = 0;

function show([primary, secondary]) {
  current = [primary, secondary];
  room.setProjection(primary, secondary);
  angiogram.setProjection(primary, secondary);
  inputs.primary.value = primary;
  inputs.secondary.value = secondary;
  document.getElementById('projection').textContent = formatProjection(Math.round(primary), Math.round(secondary));
}

// Turns the C-arm smoothly from where it is to the chosen standard view.
function moveTo(view) {
  cancelAnimationFrame(move);
  selectView(view);
  const from = current;
  const to = [view.primary, view.secondary];
  const duration = moveDurationMs(from, to);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    show(projectionDuringMove(from, to, t));
    if (t < 1) move = requestAnimationFrame(step);
  };
  move = requestAnimationFrame(step);
}

const STATUS_TEXT = { draft: 'Draft, not yet reviewed', 'fellow edited': 'Edited by the fellow, not yet approved', 'attending approved': '' };
const buttons = new Map();
for (const view of views) {
  const button = document.createElement('button');
  button.textContent = view.name;
  button.title = formatProjection(view.primary, view.secondary);
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => moveTo(view));
  document.getElementById(`views-${view.coronary}`).append(button);
  buttons.set(view, button);
}

// Highlights the chosen view's button and shows its teaching note; null clears both.
function selectView(view) {
  for (const [v, button] of buttons) button.setAttribute('aria-pressed', String(v === view));
  document.getElementById('note').hidden = !view;
  if (!view) return;
  const projection = formatProjection(view.primary, view.secondary);
  document.getElementById('note-name').textContent = view.name === projection ? projection : `${view.name}: ${projection}`;
  document.getElementById('note-status').textContent = STATUS_TEXT[view.status];
  document.getElementById('note-opens').textContent = view.opens;
  document.getElementById('note-hides').textContent = view.hides;
}

show(current);
