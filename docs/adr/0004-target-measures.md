# Target measures: foreshortening, overlap and bifurcation checks

Session 6 turns the PLAN's traffic-light table into numbers. The PLAN fixed the thresholds but not how to measure, so these choices were settled with the fellow on 2026-10-04. All measures run on one shared centerline per vessel (`src/centerline.js`), the same one the simulated angiogram draws, so a number always describes the vessel on the screen.

- **Foreshortening** = 1 − (length on the image ÷ true length), summed along the curved centerline. Each step is projected along the beam axis, so magnification does not count. A vessel parallel to the detector reads 0%, and one tilted 60° out of that plane reads 50% (the PLAN check, in `test/measure.test.js`).
- **Overlap** = the share of the target's length on the image where another vessel's shadow touches or crosses the target's shadow. "Touches" means the centerlines are closer than the sum of the two drawn radii. We chose touching over "covers the centerline" because any hidden lumen edge can hide a stenosis.
- **Only the target's own coronary** can overlap it, because only that coronary holds contrast during its injection. The "Show the other coronary too" box changes the picture, not the number.
- **Junction zone**: within 0.5 cm (in 3D) of a branch point the lumens merge, so two steps near the same branch point never count as overlap against each other. A branch point is any point shared by two or more vessels.
- **Bifurcation checks** judge the last 10 mm of the parent and the first 10 mm of each daughter. A daughter's stretch runs on into the next segment where needed (the LAD after D1 is only 2.5 mm of segment 6). We chose 10 mm over 5 mm because the first 5 mm sit in the junction zone, so 5 mm would leave nothing to judge for overlap.
- **Carina opening** = the projected angle between the two 10 mm daughter chords ÷ their true 3D angle. It is pass/fail as the PLAN states: 70% or more is green, less is red. There is no amber step.
- Percentages are rounded to whole numbers before the colour is chosen, so the number and the colour always agree.

## Consequences

- Overlap is good to one sample step, which is at most 1.3 mm on this tree.
- Some standard views score red in this model where textbooks call them good, for example the mid LAD in AP cranial (a second obtuse marginal runs along it). These are properties of the Dodge-based geometry, not of the measure; the attending review should look at them.
- Session 7 (best angle map) reuses `measureTarget`. One measure takes about 1–3 ms in the browser, so the map will need a coarser grid or caching to draw in under 1 second on a phone.
