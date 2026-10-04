# Projection angles: tilt toward the head first, then turn about the long axis

For a projection with primary angle α (LAO positive, RAO negative) and secondary angle β (CRA positive, CAU negative), the beam axis from the source toward the detector is d = (sin α cos β, sin β, cos α cos β) in the Dodge frame (x = patient left, y = head, z = anterior). In words: tilt the anterior direction toward the head by β, then turn it about the long axis toward the patient's left by α. So the secondary angle alone sets how far the beam leans toward the head or feet. We chose this order because these are exactly Dodge's θ and Φ, so the measured data and the C-arm share one definition. The other order (turn first, then tilt) points the beam about 10° differently at LAO 45 / CRA 30, so the order is fixed here and checked by `test/carm.test.js`.

The picture axes are fixed too: at AP, picture right is the patient's left and picture up is the head, as seen from the detector side. Session 4 builds the simulated angiogram on these axes.

## Consequences

- The C-arm is drawn with source 75 cm and detector 25 cm from the isocenter (source to detector 100 cm). The isocenter is the heart shell center.
- The patient body, table and floor in the room view are authored for drawing only. Their sizes do not come from Dodge.
