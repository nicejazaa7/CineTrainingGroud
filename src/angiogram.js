// Simulated angiogram: the flat X-ray picture that the current projection would produce,
// as seen on the monitor (picture axes from carmPose, perspective from carm.js).
// Each structure lets through a share of the X-rays. It is drawn on its own layer and
// multiplied onto the picture, so where two structures overlap the picture is darker.
import { carmPose, projectToDetector, DETECTOR_HALF_CM, SOURCE_TO_DETECTOR_CM, SOURCE_TO_ISOCENTER_CM } from './carm.js';
import { vertebrae, DIAPHRAGM } from './landmarks.js';
import { vessels, ARTERY_COLOR, VESSEL_DIAMETER_CM } from './vessels.js';
import { sampleCenterline } from './centerline.js';

// Share of the picture's brightness kept by one layer of each structure (1 = no shadow).
const BACKGROUND = 0.8;
const VESSEL_SHADE = { main: 0.3, branch: 0.4, side: 0.55 };
const BONE_SHADE = 0.86;
const BONE_EDGE_SHADE = 0.76;
const DIAPHRAGM_SHADE = 0.86;
// The abdomen below each dome is drawn as the dome swept this far toward the feet (cm).
const ABDOMEN_DEPTH_CM = 40;
// The traffic-light colours of the selected target's outline.
const LIGHT = { green: '#3fb950', amber: '#e3b341', red: '#f85149' };
// A tap selects a vessel up to this far away (CSS pixels).
const TAP_TOLERANCE_PX = 20;
// Zoomed in, the picture shows a 10 cm field (a common magnified field on a C-arm): 2.5 times larger.
const ZOOM_HALF_CM = 5;

// onTap([right, up], toleranceCm) reports a tap in cm on the detector, as in projectToDetector.
export function createAngiogram(container, tree, onTap) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const scratch = document.createElement('canvas');
  const layerCtx = scratch.getContext('2d');

  const tubes = vessels(tree).map((v) => ({ ...v, samples: sampleCenterline(v.points.map((n) => xyz(tree.points[n])), 8) }));
  // Where two vessels join, their lumens merge, so the X-rays cross the contrast only once.
  // Each vessel therefore remembers the earlier-drawn vessels it shares a point with.
  tubes.forEach((t, i) => {
    t.joins = [];
    for (const earlier of tubes.slice(0, i)) {
      for (const name of t.points) if (earlier.points.includes(name)) t.joins.push({ earlier, at: xyz(tree.points[name]) });
    }
  });
  const spineOutlines = vertebrae().map(vertebraOutline);
  const diaphragmOutlines = DIAPHRAGM.map(domeOutline);

  let pose = carmPose(0, 0, tree.shell.center);
  let colorCoding = false;
  // The coronaries that hold contrast: 'left', 'right' or both.
  let injected = new Set(['left', 'right']);
  // The selected target: { pieces: [centerline samples], at: branch point or undefined, color }.
  let highlight = null;
  // Zoomed in on the selected target. The size stays fixed while the C-arm moves, so lengths stay comparable.
  let zoomed = false;
  // The part of the detector on the canvas: center [right, up] and half width, in cm.
  let shown = { center: [0, 0], half: DETECTOR_HALF_CM };

  function draw() {
    const { width, height } = canvas;
    if (width === 0) return;
    shown = zoomed && highlight ? { center: targetCenter(), half: ZOOM_HALF_CM } : { center: [0, 0], half: DETECTOR_HALF_CM };
    const px = width / (2 * shown.half);
    const toCanvas = (p) => {
      const [right, up] = projectToDetector(pose, p);
      return [width / 2 + (right - shown.center[0]) * px, height / 2 - (up - shown.center[1]) * px];
    };

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = grey(BACKGROUND);
    ctx.fillRect(0, 0, width, height);

    layer((c) => {
      c.fillStyle = grey(DIAPHRAGM_SHADE);
      for (const outline of diaphragmOutlines) fillHull(c, outline.map(toCanvas));
    });
    layer((c) => {
      c.fillStyle = grey(BONE_SHADE);
      c.strokeStyle = grey(BONE_EDGE_SHADE);
      c.lineWidth = 0.08 * px;
      for (const outline of spineOutlines) {
        fillHull(c, outline.map(toCanvas));
        c.stroke();
      }
    });

    // Vessels lie near the isocenter, so they share its magnification.
    const widthOf = (t) => VESSEL_DIAMETER_CM[t.size] * px * (SOURCE_TO_DETECTOR_CM / SOURCE_TO_ISOCENTER_CM);
    for (const t of tubes.filter((t) => injected.has(t.coronary))) {
      layer((c) => {
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.strokeStyle = colorCoding ? ARTERY_COLOR[t.artery] : grey(VESSEL_SHADE[t.size]);
        strokePath(c, t.samples.map(toCanvas), widthOf(t));
        // Remove the part that lies on an earlier vessel right at the join.
        c.globalCompositeOperation = 'destination-out';
        for (const { earlier, at } of t.joins) {
          const [x, y] = toCanvas(at);
          c.save();
          c.beginPath();
          c.arc(x, y, widthOf(earlier), 0, 2 * Math.PI);
          c.clip();
          strokePath(c, earlier.samples.map(toCanvas), widthOf(earlier));
          c.restore();
        }
      });
    }

    // The selected target: its centerline in its traffic-light colour on a dark edge (so it shows on the
    // artery colours too), and a ring on a branch point.
    if (!highlight) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const [color, widthPx] of [['#000', 4], [LIGHT[highlight.color], 2]]) {
      ctx.strokeStyle = color;
      for (const piece of highlight.pieces) strokePath(ctx, piece.map(toCanvas), widthPx * window.devicePixelRatio);
      if (highlight.at) {
        const [x, y] = toCanvas(highlight.at);
        ctx.beginPath();
        ctx.arc(x, y, 8 * window.devicePixelRatio, 0, 2 * Math.PI);
        ctx.lineWidth = widthPx * window.devicePixelRatio;
        ctx.stroke();
      }
    }
  }

  // The middle of the target's outline on the detector, kept far enough in that the field stays on the detector.
  function targetCenter() {
    const flat = highlight.pieces.flat().map((p) => projectToDetector(pose, p));
    const limit = DETECTOR_HALF_CM - ZOOM_HALF_CM;
    return [0, 1].map((i) => {
      const values = flat.map((p) => p[i]);
      const middle = (Math.min(...values) + Math.max(...values)) / 2;
      return Math.max(-limit, Math.min(limit, middle));
    });
  }

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const cmPerPx = (2 * shown.half) / rect.width;
    const right = shown.center[0] + (event.clientX - rect.left - rect.width / 2) * cmPerPx;
    const up = shown.center[1] + (rect.height / 2 - (event.clientY - rect.top)) * cmPerPx;
    onTap([right, up], TAP_TOLERANCE_PX * cmPerPx);
  });

  // Draws one structure on the scratch canvas, then multiplies it onto the picture.
  function layer(drawOn) {
    layerCtx.globalCompositeOperation = 'source-over';
    layerCtx.clearRect(0, 0, scratch.width, scratch.height);
    drawOn(layerCtx);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(scratch, 0, 0);
  }

  // The picture is square (a square detector), as large as the panel allows.
  new ResizeObserver(() => {
    const side = Math.floor(Math.min(container.clientWidth, container.clientHeight));
    canvas.style.width = canvas.style.height = `${side}px`;
    canvas.width = canvas.height = scratch.width = scratch.height = Math.round(side * window.devicePixelRatio);
    draw();
  }).observe(container);

  return {
    // target: the selected target's outline (see `highlight` above), or null.
    setProjection(primaryDeg, secondaryDeg, target = null) {
      pose = carmPose(primaryDeg, secondaryDeg, tree.shell.center);
      highlight = target;
      draw();
    },
    setZoomed(on) {
      zoomed = on;
      draw();
    },
    setColorCoding(on) {
      colorCoding = on;
      draw();
    },
    setInjected(coronaries) {
      injected = new Set(coronaries);
      draw();
    },
  };
}

// Points on the rims of both end plates; their projected hull is the vertebral body's shadow.
function vertebraOutline({ center: [x, y, z], radius, height }) {
  const points = [];
  for (let k = 0; k < 24; k++) {
    const a = (2 * Math.PI * k) / 24;
    for (const dy of [-height / 2, height / 2]) points.push([x + radius * Math.cos(a), y + dy, z + radius * Math.sin(a)]);
  }
  return points;
}

// Points over the dome's ellipsoid and the same points moved toward the feet:
// their projected hull is the shadow of the dome and the abdomen below it.
function domeOutline({ center, radii }) {
  const points = [];
  for (let i = 0; i <= 12; i++) {
    const polar = (Math.PI * i) / 12;
    for (let k = 0; k < 24; k++) {
      const a = (2 * Math.PI * k) / 24;
      const p = [Math.sin(polar) * Math.cos(a), Math.cos(polar), Math.sin(polar) * Math.sin(a)].map((v, j) => center[j] + radii[j] * v);
      points.push(p, [p[0], p[1] - ABDOMEN_DEPTH_CM, p[2]]);
    }
  }
  return points;
}

function strokePath(c, points, lineWidth) {
  c.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.lineWidth = lineWidth;
  c.stroke();
}

// Fills the convex hull of 2D points (monotone chain) and leaves it as the current path.
function fillHull(c, points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  const hull = [...half(sorted), ...half([...sorted].reverse())];
  c.beginPath();
  hull.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.closePath();
  c.fill();
}

const xyz = (p) => [p.x, p.y, p.z];
const grey = (level) => {
  const v = Math.round(255 * level);
  return `rgb(${v}, ${v}, ${v})`;
};
