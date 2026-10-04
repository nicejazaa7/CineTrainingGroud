# Data

## dodge1988.csv

Tables 3, 4 and 5 of Dodge et al., "Intrathoracic spatial location of specified coronary segments on the normal human heart", Circulation 1988;78:1167 (PMID 3180376). Right-dominant men.

The values were copied by hand from the page images, not from PDF text extraction, because extraction scrambles the rows (see [ADR 0002](../docs/adr/0002-dodge-skeleton-with-authored-extensions.md)). Each value is a population mean; the `_sd` columns hold the ± standard deviation printed next to it. Location names are the paper's own labels (Figure 1), not SYNTAX numbers.

Columns:

| Column | Meaning |
|---|---|
| `table` | Table number in the paper (3 = LM/LAD, 4 = LCx, 5 = RCA) |
| `location` | Point label exactly as printed |
| `origin` | `left_ostium` (Tables 3–4) or `right_ostium` (Table 5) |
| `n` | Number of patients |
| `r_cm`, `r_sd_cm` | Distance from the ostium, cm |
| `theta_deg`, `theta_sd_deg` | θ, degrees |
| `sd_r_cosphi_theta_cm` | SD(r·cosΦ·θ), the θ spread expressed in cm |
| `phi_deg`, `phi_sd_deg` | Φ, degrees |
| `sd_r_phi_cm` | SD(r·Φ), the Φ spread expressed in cm |

The two `Catheter` rows are the scaling segment of the Judkins catheter, not coronary points.

## Coordinate frame (Dodge Figure 3)

Axes are fixed to the patient. Units are cm.

- **x**: toward the patient's left (lateral).
- **y**: toward the head (cephalad).
- **z**: toward the front (anterior).
- **θ**: rotation about the long (y) axis. 0° points anterior; positive turns toward the patient's left.
- **Φ**: elevation above the x–z plane; positive points toward the head.

So x = r·cosΦ·sinθ, y = r·sinΦ, z = r·cosΦ·cosθ.

## dodge1988-points.json

The same points converted to x, y, z, all in one frame with the origin at the **left** coronary ostium. Table 5 points are moved by the RCA ostium position from Table 3, which rests on only 6 patients, so every RCA point carries that uncertainty. Every point is a measured point.

Regenerate it after any change to the CSV:

```
npm run build:points
```

## tree-spec.json → coronary-tree.json

`tree-spec.json` is the hand-written description of the coronary tree model. `coronary-tree.json` is built from it and from `dodge1988-points.json`:

```
npm run build:tree
```

A test fails if `coronary-tree.json` is older than the spec, so rebuild after every spec edit.

### What is in the tree

The tree is right-dominant, like the Dodge Tables 3–5 population. Segment numbers follow SYNTAX (modified AHA). Dodge Table 2 maps the paper's labels to AHA numbers, and we follow it where it gives one.

| Dodge label | SYNTAX | Plain name |
|---|---|---|
| R1, R2, R3 | 1, 2, 3 | proximal, mid, distal RCA |
| RD | 4 | posterior descending |
| R4 continuing into RP | 16 | right posterolateral |
| RI | 16a | first right posterolateral branch |
| LM | 5 | left main |
| L1, L2 | 6, 7 | proximal, mid LAD |
| L3 and L4 | 8 | apical LAD |
| D1, D2, D3 | 9, 10, 10a | first, second, additional second diagonal |
| C1 | 11 | proximal LCx |
| C2 and C3 | 13 | distal LCx |
| M1, M2 | 12a, 12b | first, second obtuse marginal |

Segment boundaries sit at branch origins where Dodge measured one: S1 origin (6/7), S3 origin (7/8, the paper's L2/L3 rule), M1 origin (11/13). The septals S1–S3 have no SYNTAX number, so they are listed as side branches. They are short measured stubs (origin to mid) with no authored extension, because they run inside the septum.

Left out on purpose, because they belong to a minority or to balanced anatomy: C4 (n=6; the paper puts it in balanced hearts), median ramus (n=7), the large OM variant (n=5) and M3 (small, often absent). They can return with the version 2 dominance variants.

The LM bifurcation point is Dodge's MR origin (n=7). Dodge did not measure the LM bifurcation, but the paper places the MR origin at the LM trifurcation.

### Heart shell

The heart shell is an ellipsoid fitted by least squares to the 25 measured points on the outer surface of the ventricles (listed in `src/shell.js`). Ostia, LM, septals and the catheter are left out of the fit. The fit error is 0.28 cm (root mean square). The long axis runs from the base (right, posterior, superior) to the apex (left, anterior, inferior). As a check, the septal mid points lie about 1.5 cm inside the shell.

### Authored points

Each authored point has a `guide` position and a `note` that says how it was placed. The build moves each guide onto the shell along the ray from the shell center, then 0.1 cm outward, so no authored point lies inside the heart shell. Two rules were used:

- **Segment boundaries with no measured landmark** (RCA 1/2, 2/3 and the crux): halfway between the two neighbouring mid points.
- **Distal halves of branches**: Dodge's "mid" point is halfway along the visible branch. So each branch continues past its mid point, along the shell, until it is about twice the origin-to-mid distance.

These guides are first drafts. Session 5 may move them to match textbook standard views.

### Known weak points

- R3 mid and RD mid have a very wide θ spread (±64°, ±60°), because they point almost straight down. RD mid sits 0.68 cm inside the shell, which suggests its mean is off the true path.
- Every RCA point depends on the RCA ostium position, which rests on 6 patients.
- Dodge measured no origin for RD, RI or RP. The crux is authored, and RI is drawn from R4 mid.

## angle-maps.json

The best angle map of every target, made by `npm run build:maps` from `coronary-tree.json` and the measures in `src/measure.js`. Do not edit it by hand. Rebuild it after changing the tree, the measures or the traffic-light thresholds; a test fails if it is stale. Layout and reasons: [ADR 0005](../docs/adr/0005-best-angle-map.md).
