// Drawing data shared by the room view and the simulated angiogram:
// one entry per segment and side branch, with its artery (for colour), its coronary
// ('left' or 'right', for the injection) and size class.

export const ARTERY_COLOR = { LM: '#e04848', LAD: '#e04848', LCx: '#3fb5a0', RCA: '#f0a030' };
// Drawn vessel diameters (cm), rough adult sizes for drawing only. Overlap uses them too.
export const VESSEL_DIAMETER_CM = { main: 0.35, branch: 0.25, side: 0.15 };
const MAIN_VESSELS = new Set(['1', '2', '3', '5', '6', '7', '8', '11', '13']);

export function vessels(tree) {
  const bySyntax = new Map(tree.segments.map((s) => [s.syntax, s]));
  const artery = (syntax) => {
    if (syntax === '5') return 'LM';
    if (syntax === '6') return 'LAD';
    if (syntax === '11') return 'LCx';
    const s = bySyntax.get(syntax);
    return s.parent === null ? 'RCA' : artery(s.parent);
  };
  return [
    ...tree.segments.map((s) => ({ id: s.syntax, label: s.label, segment: true, parent: s.parent, points: s.points, artery: artery(s.syntax), size: MAIN_VESSELS.has(s.syntax) ? 'main' : 'branch' })),
    ...tree.sideBranches.map((b) => ({ id: b.id, label: b.name, segment: false, parent: b.parent, points: b.points, artery: artery(b.parent), size: 'side' })),
  ].map((v) => ({ ...v, coronary: v.artery === 'RCA' ? 'right' : 'left' }));
}
