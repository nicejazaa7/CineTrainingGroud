# Coronary Angiography View Trainer

A teaching tool for cardiology fellows. It shows how moving the C-arm changes the angiographic picture, so a fellow can see why a given projection opens or hides a coronary segment.

## Anatomy

**Coronary tree model**:
The 3D description of the coronary arteries that the tool displays. Version 1 uses one generic, right-dominant tree built from published normal-anatomy data, never from a real patient.
_Avoid_: heart model, mesh, patient model

**Measured point**:
A point of the coronary tree model taken from published normal-anatomy data (Dodge 1988).

**Authored point**:
A point of the coronary tree model added by hand to complete a vessel where the published data stops.
_Avoid_: estimated point, fake point

**Heart shell**:
A smooth surface approximating the outside of the ventricles, used to guide authored points and drawn faintly in the room view.
_Avoid_: heart model, epicardium

**Segment**:
A named portion of the coronary tree model, identified by its SYNTAX (modified AHA) number and a plain name, for example "proximal LAD (6)".
_Avoid_: branch (for a numbered portion), part

**Bifurcation**:
A point where one vessel divides into two, described by its parent segment and its two daughter branches (for example LM into LAD and LCx).

**Carina**:
The dividing tip of a bifurcation, between the two daughter branches.

**Dominance variant**:
An alternative coronary tree model with a different dominance (left-dominant or co-dominant). Planned for version 2.

## Imaging geometry

**C-arm**:
The rotating X-ray source and detector. It is the only thing that moves; the patient and the coronary tree model stay fixed.
_Avoid_: camera, gantry

**Projection**:
One C-arm position, written as a primary angle plus a secondary angle (for example LAO 40 / CAU 25).
_Avoid_: view (for an arbitrary position), angle (for the pair)

**Primary angle**:
The left–right rotation of the C-arm around the patient's long axis, named LAO or RAO.

**Secondary angle**:
The head–foot tilt of the C-arm, named CRA (cranial) or CAU (caudal).

**Clinical range**:
The part of the C-arm's full movement used in routine practice (about LAO 60 to RAO 30, CRA 40 to CAU 40). The full machine range stays available.

**Standard view**:
A named projection used in routine practice (for example "LAO caudal, spider"), stored with teaching notes on which segments it opens up and which it hides.
_Avoid_: preset, default view

**Foreshortening**:
The shortening of a vessel segment on the image because it runs partly toward or away from the detector.

**Overlap**:
The share of a target's length on the image that is covered by other vessels, given as a percentage.

**Target**:
The segment or bifurcation a fellow wants to see clearly, and for which foreshortening and overlap are judged.
_Avoid_: lesion (the tool has no disease), region of interest

## Screen

**Room view**:
The 3D panel showing the patient, table, C-arm and coronary tree model from outside, as a bystander in the cath lab would see them.
_Avoid_: 3D view, model view

**Simulated angiogram**:
The 2D panel showing the flat X-ray picture that the current projection would produce.
_Avoid_: fluoro image, X-ray view, projection image

**Landmark**:
A non-coronary structure drawn faintly for orientation: the spine and the diaphragm.

**Best angle map**:
A traffic-light chart over all projections that shows, for one target, where it is seen well (green), acceptably (amber) or poorly (red).
_Avoid_: heat map, angle chart
