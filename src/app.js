import { createRoomView } from './room.js';
import { createAngiogram } from './angiogram.js';
import { FULL_RANGE, CLINICAL_RANGE, formatProjection } from './carm.js';

const tree = await (await fetch('data/coronary-tree.json')).json();
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
  input.addEventListener('input', update);
  inputs[key] = input;
}

function update() {
  const primary = Number(inputs.primary.value);
  const secondary = Number(inputs.secondary.value);
  room.setProjection(primary, secondary);
  angiogram.setProjection(primary, secondary);
  document.getElementById('projection').textContent = formatProjection(primary, secondary);
}

update();
