// Draws a best angle map (src/anglemap.js): primary angle across, secondary angle up, with the
// clinical range outlined, the standard views as dots and a ring at the C-arm's projection.
import { FULL_RANGE, CLINICAL_RANGE } from './carm.js';
import { MAP_STEP_DEG, MAP_COLUMNS, MAP_ROWS, COLOR_OF_CODE } from './anglemap.js';

// Same traffic-light colours as the dots beside the measures (index.html).
const RGB = { green: [63, 185, 80], amber: [227, 179, 65], red: [248, 81, 73] };
// A tap this close to a standard view's dot (CSS pixels) goes to that view.
const DOT_TAP_PX = 12;
// Each cell covers half a step on every side of its projection, so the map spans this.
const SPAN = {
  primary: [FULL_RANGE.primary[0] - MAP_STEP_DEG / 2, FULL_RANGE.primary[1] + MAP_STEP_DEG / 2],
  secondary: [FULL_RANGE.secondary[0] - MAP_STEP_DEG / 2, FULL_RANGE.secondary[1] + MAP_STEP_DEG / 2],
};

// onPick(primary, secondary, view) reports a tap: whole degrees, plus the standard view if a dot was tapped.
export function createAngleMap(container, onPick) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  // The map at one pixel per cell, scaled up when drawn.
  const cells = document.createElement('canvas');
  Object.assign(cells, { width: MAP_COLUMNS, height: MAP_ROWS });
  const cellsCtx = cells.getContext('2d');

  let map = null;
  let views = [];
  let projection = [0, 0];

  // Canvas pixels of a projection. One degree is as tall as it is wide.
  const toCanvas = ([primary, secondary]) => [
    ((primary - SPAN.primary[0]) / (SPAN.primary[1] - SPAN.primary[0])) * canvas.width,
    ((SPAN.secondary[1] - secondary) / (SPAN.secondary[1] - SPAN.secondary[0])) * canvas.height,
  ];

  function draw() {
    const { width, height } = canvas;
    if (!map || width === 0) return;
    const ratio = window.devicePixelRatio;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cells, 0, 0, width, height);

    // Faint AP and no-tilt lines, then the clinical range as a dashed box.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = ratio;
    ctx.beginPath();
    const [apX, levelY] = toCanvas([0, 0]);
    ctx.moveTo(apX, 0);
    ctx.lineTo(apX, height);
    ctx.moveTo(0, levelY);
    ctx.lineTo(width, levelY);
    ctx.stroke();
    const [left, top] = toCanvas([CLINICAL_RANGE.primary[0], CLINICAL_RANGE.secondary[1]]);
    const [right, bottom] = toCanvas([CLINICAL_RANGE.primary[1], CLINICAL_RANGE.secondary[0]]);
    ctx.setLineDash([5 * ratio, 4 * ratio]);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 * ratio;
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.setLineDash([]);

    // Standard views: white dots on a dark edge, with their names.
    ctx.font = `${11 * ratio}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const view of views) {
      const [x, y] = toCanvas([view.primary, view.secondary]);
      ctx.beginPath();
      ctx.arc(x, y, 4 * ratio, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 1.5 * ratio;
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.lineWidth = 3 * ratio;
      ctx.strokeText(view.name, x, y + 6 * ratio);
      ctx.fillText(view.name, x, y + 6 * ratio);
    }

    // The C-arm now: a ring.
    const [x, y] = toCanvas(projection);
    for (const [color, lineWidth] of [['#000', 4], ['#fff', 2]]) {
      ctx.beginPath();
      ctx.arc(x, y, 8 * ratio, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * ratio;
      ctx.stroke();
    }
  }

  function resize() {
    const width = container.clientWidth;
    const height = width * ((SPAN.secondary[1] - SPAN.secondary[0]) / (SPAN.primary[1] - SPAN.primary[0]));
    // The width comes from CSS (100%), so the canvas never holds its box wider than the screen.
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * window.devicePixelRatio);
    canvas.height = Math.round(height * window.devicePixelRatio);
    draw();
  }
  new ResizeObserver(resize).observe(container);

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const at = [(event.clientX - rect.left) * scale, (event.clientY - rect.top) * scale];
    const view = views.find((v) => Math.hypot(...toCanvas([v.primary, v.secondary]).map((c, i) => c - at[i])) < DOT_TAP_PX * scale);
    if (view) return onPick(view.primary, view.secondary, view);
    const fraction = [at[0] / canvas.width, at[1] / canvas.height];
    const primary = SPAN.primary[0] + fraction[0] * (SPAN.primary[1] - SPAN.primary[0]);
    const secondary = SPAN.secondary[1] - fraction[1] * (SPAN.secondary[1] - SPAN.secondary[0]);
    const clamp = (v, [min, max]) => Math.max(min, Math.min(max, Math.round(v)));
    onPick(clamp(primary, FULL_RANGE.primary), clamp(secondary, FULL_RANGE.secondary), null);
  });

  return {
    // newMap: the letters from data/angle-maps.json, or null to show nothing. newViews: the dots.
    setMap(newMap, newViews) {
      if (newMap === map) return;
      map = newMap;
      views = newViews;
      if (!map) return;
      const image = cellsCtx.createImageData(MAP_COLUMNS, MAP_ROWS);
      for (let k = 0; k < map.length; k++) {
        image.data.set([...RGB[COLOR_OF_CODE[map[k]]], 255], 4 * k);
      }
      cellsCtx.putImageData(image, 0, 0);
      resize();
    },
    setProjection(primary, secondary) {
      projection = [primary, secondary];
      draw();
    },
  };
}
