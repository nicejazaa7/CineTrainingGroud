# Dodge 1988 skeleton with authored extensions

The coronary tree model is built on the measured segment points of Dodge et al. (Circulation 1988;78:1167, PMID 3180376), which give only three points per main segment and stop each branch at its mid-point. We extend the branches by hand along a heart shell and tune them against textbook standard views, rather than switch to a public CT dataset, because the measured core keeps the angle behaviour honest and ADR 0001 keeps patient-derived data out. Every point carries a "measured" or "authored" label so that no reader mistakes an authored point for data.

## Consequences

- The Dodge tables must be copied from the page images: text extraction of the PDF misaligns row labels and values.
- The RCA ostium position relative to the left ostium rests on only 6 patients in Dodge; treat it as the least certain measured value.
