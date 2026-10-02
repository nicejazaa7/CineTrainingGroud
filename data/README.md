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
