// Converts the Dodge 1988 polar measurements to x, y, z (cm).
// Frame (Dodge Figure 3): x = patient's left, y = head, z = anterior.
// θ turns about the long axis from anterior toward the left; Φ is elevation toward the head.

const DEG = Math.PI / 180;

export function polarToCartesian(r, thetaDeg, phiDeg) {
  const t = thetaDeg * DEG;
  const p = phiDeg * DEG;
  return {
    x: r * Math.cos(p) * Math.sin(t),
    y: r * Math.sin(p),
    z: r * Math.cos(p) * Math.cos(t),
  };
}

export function parseDodgeCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    const row = {};
    keys.forEach((k, i) => {
      const v = cells[i];
      row[k] = k === 'location' || k === 'origin' ? v : Number(v);
    });
    return row;
  });
}

// Returns every row as a measured point in one frame, origin at the left ostium.
// Right-ostium rows (Table 5) are shifted by the RCA ostium position from Table 3.
export function toMeasuredPoints(rows) {
  const rca = rows.find((row) => row.table === 3 && row.location === 'RCA ostium');
  const rcaOstium = polarToCartesian(rca.r_cm, rca.theta_deg, rca.phi_deg);
  return rows.map((row) => {
    const p = polarToCartesian(row.r_cm, row.theta_deg, row.phi_deg);
    const offset = row.origin === 'right_ostium' ? rcaOstium : { x: 0, y: 0, z: 0 };
    return {
      table: row.table,
      location: row.location,
      source: 'measured',
      x: round2(p.x + offset.x),
      y: round2(p.y + offset.y),
      z: round2(p.z + offset.z),
    };
  });
}

function round2(v) {
  return Math.round(v * 100) / 100;
}
