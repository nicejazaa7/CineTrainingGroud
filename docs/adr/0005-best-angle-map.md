# Best angle map: computed once at build time, every 2°

The best angle map shows one target's traffic-light colour at every projection over the full range. Each spot uses the same `measureTarget` as a tap on the angiogram (ADR 0004), so the map and the numbers always agree. We chose these with the fellow on 2026-10-04.

- **Computed once, not in the browser.** `npm run build:maps` measures every target every 2° and saves the colours to `data/angle-maps.json` (22 maps, 123 KB, about 45 s to build). Measuring live costs 0.1–0.7 s per target on a laptop at a 5° grid, and phones are slower, so a live map would miss the PLAN's "under 1 second on a phone" check. Drawing a saved map takes under 1 ms.
- **Rebuild after any change** to the tree, the measures or the thresholds. `test/anglemap.test.js` re-measures every 10° and fails if the file is stale.
- **Layout.** The primary angle runs across (RAO 120 on the left, LAO 120 on the right) and the secondary angle runs up (CRA at the top). One degree is as tall as it is wide. The clinical range is a dashed box, the standard views of the target's coronary are labelled dots, and a ring marks the C-arm now.
- **Tap to move.** A tap on the map moves the C-arm there with the usual animated move. A tap on a dot goes to that standard view and shows its note.
- **Patient-variation note** under the map, as the PLAN fixed it: best angles differ between patients, so the map teaches the direction of adjustment, not an exact number.

## Comparison with Green 2005

The PLAN check is "green zones agree with Green 2005's general findings". Only the abstract was available (PMID 15744720). It makes three general claims. Shares below are of the clinical range.

| Green 2005 | This model | Agrees |
|---|---|---|
| A view with almost no foreshortening and under 2% overlap existed for each stented segment. | All 17 segments have a green projection inside the clinical range. | Yes (tested) |
| RCA views were the least foreshortened. | Proximal RCA (1) is green over 66% and mid RCA (2) over 59%; no left segment passes 39% (left main). | Yes (tested) |
| Mid LCx views were the most foreshortened. | The LAD is the most foreshortened: mean foreshortening 34% (6) and 36% (7). The LCx means are 13–16%. | **No** |

We did not tune the data to match. The attending review should look at:

- **LAD foreshortening.** From start to end, the proximal LAD (6) and mid LAD (7) run mostly forward (anterior share of their direction 0.73 and 0.85), so they point along the beam in most projections near AP. Only steep LAO or RAO views lay them flat.
- **LAD/D1 and LAD/D2 bifurcations are almost never green** (0–2% of the full range). The diagonals leave the LAD at only 34–41° and run close beside it, so a daughter's first 10 mm is foreshortened or overlapped almost everywhere. This is the session 5 finding about diagonals in RAO cranial, seen over the whole range.
- **Mid LAD (7)** is green over only 1% of the clinical range, mostly because of overlap (session 6 finding: the second obtuse marginal runs along it in AP cranial).

## Consequences

- The map shows colours only. To see a projection's numbers, tap the map and read the measures.
- Version 2 trees (dominance variants, anomalies) will each need their own maps from the same build script.
