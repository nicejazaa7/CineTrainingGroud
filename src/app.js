import { createRoomView } from './room.js';
import { createAngiogram } from './angiogram.js';
import { FULL_RANGE, CLINICAL_RANGE, carmPose, formatProjection, projectionDuringMove, moveDurationMs } from './carm.js';
import { measureModel, measureTarget, pickTarget, foreshorteningColor, overlapColor, ORIGIN_CM, CARINA_OPEN_SHARE } from './measure.js';

const [tree, { views }] = await Promise.all(
  ['data/coronary-tree.json', 'data/standard-views.json'].map(async (url) => (await fetch(url)).json()),
);
const room = createRoomView(document.getElementById('room'), tree);
const model = measureModel(tree);
// The target the fellow tapped: { kind: 'segment' | 'bifurcation', id }, or null.
let selected = null;
const angiogram = createAngiogram(document.getElementById('angiogram'), tree, (point, toleranceCm) => {
  selected = pickTarget(model, carmPose(...current, tree.shell.center), point, toleranceCm, injectedNow());
  show(current);
});

const colorCoding = document.getElementById('color-coding');
// Browsers may restore the box's state on reload, so read it once at start too.
const applyColorCoding = () => angiogram.setColorCoding(colorCoding.checked);
colorCoding.addEventListener('change', applyColorCoding);
applyColorCoding();

// One coronary holds contrast at a time; the other can be shown too, to see where a collateral goes.
const injectedChoices = [...document.querySelectorAll('input[name=injected]')];
const otherCoronary = document.getElementById('other-coronary');
const injectedNow = () => {
  const injected = injectedChoices.find((c) => c.checked).value;
  return otherCoronary.checked ? ['left', 'right'] : [injected];
};
const applyInjection = () => {
  angiogram.setInjected(injectedNow());
  // A target that no longer holds contrast cannot be seen, so it is let go.
  if (selected && !injectedNow().includes(coronaryOf(selected))) {
    selected = null;
    show(current);
  }
};
const coronaryOf = ({ kind, id }) => (kind === 'segment' ? model.vessels : model.bifurcations).find((x) => x.id === id).coronary;
for (const c of [...injectedChoices, otherCoronary]) c.addEventListener('change', applyInjection);
applyInjection();

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
  const result = selected && measureTarget(model, selected, carmPose(primary, secondary, tree.shell.center));
  if (!result && document.body.classList.contains('focus')) setFocus(false);
  angiogram.setProjection(primary, secondary, result && { pieces: result.highlight, at: result.at, color: result.color });
  showResult(result);
  inputs.primary.value = primary;
  inputs.secondary.value = secondary;
  document.getElementById('projection').textContent = formatProjection(Math.round(primary), Math.round(secondary));
}

// Turns the C-arm smoothly from where it is to the chosen standard view.
function moveTo(view) {
  cancelAnimationFrame(move);
  selectView(view);
  for (const c of injectedChoices) c.checked = c.value === view.coronary;
  applyInjection();
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

// Focus mode: a large, zoomed angiogram with only the sliders and the target's measures.
const focusButton = document.getElementById('focus');
function setFocus(on) {
  document.body.classList.toggle('focus', on);
  focusButton.textContent = on ? 'Back to full view' : 'Focus on this target';
  angiogram.setZoomed(on);
}
focusButton.addEventListener('click', () => setFocus(!document.body.classList.contains('focus')));

// The measures of the selected target in the current projection (docs/PLAN.md session 6).
const LIGHT_WORD = { green: 'Green', amber: 'Amber', red: 'Red' };
const dot = (color) => `<span class="dot ${color}" title="${LIGHT_WORD[color]}"></span>`;
function showResult(result) {
  const box = document.getElementById('target-result');
  focusButton.hidden = !result;
  if (!result) {
    box.innerHTML = '<p class="hint">Tap a vessel or a branch point on the angiogram to measure it.</p>';
    return;
  }
  const mm = `${10 * ORIGIN_CM} mm`;
  const where = { parent: `Before the branch, last ${mm}`, daughter: `Branch, first ${mm}` };
  const row = (name, p) =>
    `<tr><td>${name}</td><td>${dot(foreshorteningColor(p.foreshortening))}${p.foreshortening}%</td><td>${dot(overlapColor(p.overlap))}${p.overlap}%</td></tr>`;
  const rows = result.kind === 'segment'
    ? row('Whole segment', result)
    : result.parts.map((p) => row(`${where[p.role]}: ${p.label}`, p)).join('');
  let extra = '';
  if (result.kind === 'bifurcation') {
    const { daughtersOverlap: d, carina: c } = result;
    extra = `<p>${dot(d.color)}Branches overlap each other: ${d.percent}%</p>
      <p>${dot(c.color)}Carina opening: ${c.projectedDeg}° of the true ${c.trueDeg}° (${c.share}%; opened at ${100 * CARINA_OPEN_SHARE}% or more)</p>`;
  }
  box.innerHTML = `<p class="result-title">${dot(result.color)}<b>${result.label}</b>: ${LIGHT_WORD[result.color]}</p>
    <table><thead><tr><th></th><th>Foreshortening</th><th>Overlap</th></tr></thead><tbody>${rows}</tbody></table>${extra}`;
}

show(current);
