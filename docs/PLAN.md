# Project plan: Coronary Angiography View Trainer

Agreed on 2026-09-27 after a design grilling session. Vocabulary follows [CONTEXT.md](../CONTEXT.md); key decisions are in [docs/adr/](adr/).

A **session** is one focused working sitting with Claude, with one deliverable and one check. There are no dates (no deadline); sessions run in order because each builds on the one before.

## Settled decisions

- **Users and device**: the fellow and other fellows in the program; a web page on laptop and phone, shared by link.
- **Anatomy**: one generic right-dominant coronary tree model, no patient data ([ADR 0001](adr/0001-generic-anatomy-no-patient-data.md)). Built on Dodge 1988 measured points plus labelled authored points ([ADR 0002](adr/0002-dodge-skeleton-with-authored-extensions.md)).
- **Screen**: room view and simulated angiogram side by side. The C-arm moves; the patient stays fixed.
- **Angles**: full machine range (about LAO/RAO 120, CRA/CAU 45), with the clinical range shaded.
- **Simulated angiogram**: X-ray style, overlaps drawn darker, colour-coding toggle. Perspective geometry, source about 100 cm from the detector.
- **Landmarks**: faint spine and diaphragm in both panels. Heart shell faint, room view only. No catheter in version 1.
- **Heart motion**: none; static end-diastole.
- **Segments**: SYNTAX (modified AHA) numbering shown with plain names, for example "proximal LAD (6)".
- **Targets**: segments and 5 bifurcations: LM → LAD/LCx, LAD/D1, LAD/D2, LCx/OM1, distal RCA crux → PDA/PLV.
- **Traffic-light scoring** (a target gets the worst colour of its checks; thresholds follow Green 2005 and may be adjusted by the attending):

  | Colour | Foreshortening | Overlap |
  |---|---|---|
  | Green | 10% or less | 5% or less |
  | Amber | 11–19% | 6–20% |
  | Red | 20% or more | more than 20% |

- **Bifurcation scoring**: parent and both daughter origins pass the checks above; daughters do not overlap each other; carina opened (projected angle at least 70% of the true 3D angle). Worst colour wins.
- **Best angle map**: in version 1. Standard views appear as dots on it, with a fixed note that optimal angles vary between patients and the map teaches the direction of adjustment, not an exact number.
- **Standard views (10)**: left coronary: RAO caudal, AP caudal, LAO caudal (spider), AP cranial, RAO cranial, LAO cranial, left lateral. Right coronary: LAO 30, RAO 30, AP cranial.
- **Teaching notes**: Claude drafts, the fellow edits, the attending approves.
- **Validation**: textbook figures, then an attending review before sharing.
- **Hosting**: GitHub Pages. One web page using Three.js, no install, no server.
- **Language**: English only, in every version.
- **Notice**: education only, not for clinical decisions.
- **Tools**: Claude Code only.

## Version 1: see the rotation and understand it

| # | Session | Deliverable | Check |
|---|---|---|---|
| 1 | Setup and data | Git repository; GitHub connected via `gh auth login`; Dodge Tables 3–5 copied from the page images and converted to 3D coordinates. | Fellow spot-checks 10 copied values against the PDF. The LAD apex point lands anterior, inferior and to the left. |
| 2 | Coronary tree model | Heart shell; authored branch extensions; SYNTAX numbers and plain names; the 5 bifurcations; every point labelled measured or authored. | Every segment has a number and a name. No authored point lies inside the heart shell. |
| 3 | Room view and C-arm | 3D patient, table and C-arm; sliders over the full range with the clinical range shaded. | At LAO 90 the detector is at the patient's left; at CRA 30 it tilts toward the head. Automatic tests check the rotation math. |
| 4 | Simulated angiogram | X-ray-style image with darker overlaps; colour toggle; spine and diaphragm landmarks; both panels move together. | Spine on the image right in LAO and on the image left in RAO. Crossing vessels appear darker where they cross. |
| 5 | Standard views | The 10 standard views with smooth animated C-arm movement between them; first drafts of the teaching notes. | Fellow compares each view with textbook figures and edits the notes. |
| 6 | Foreshortening and overlap | Tap a target to see foreshortening %, overlap %, traffic-light colour, and carina opening for bifurcations. | A vessel parallel to the detector shows 0% foreshortening; one tilted 60° shows 50%. |
| 7 | Best angle map | Traffic-light map over the full range; clinical range outlined; standard views as dots; patient-variation note. | Map draws in under 1 second on a phone. Green zones agree with Green 2005's general findings. |
| 8 | Phone layout and publishing | Phone layout; education-only notice; site live on GitHub Pages. | Link opens on the fellow's phone and one other fellow's phone. |
| — | Attending review (not a Claude session) | Attending reviews the 10 views, notes and thresholds. | A list of corrections. |
| 9 | Review fixes → version 1 release | Corrections applied. | Link shared with other fellows. |

## Version 2: practise and variants

| # | Session | Deliverable |
|---|---|---|
| 10 | Dominance variants | Left-dominant and co-dominant trees. Dodge measured only right-dominant hearts, so these are mostly authored and labelled so. |
| 11 | Anomalies | Separate LAD and LCx ostia; LCx from the right sinus or proximal RCA; RCA high anterior or from the left sinus. |
| 12 | Quiz, part 1 | Type 2 "find the best view" and type 4 "which way to move" (with animated C-arm). |
| 13 | Quiz, part 2 | Type 1 "name the projection" and type 3 "name the vessel". No score saving. |
| — | Attending review 2 | Variants, anomalies and quiz answers reviewed. |
| 14 | Review fixes → version 2 release | |

## Before session 1

- Create a free GitHub account at github.com if you do not have one. Session 1 connects it with `gh auth login`, so no password passes through chat or files.

## Known risks

- The Dodge tables are sparse (three points per main segment, branches stop at mid-course), so distal branches are authored.
- The RCA ostium position in Dodge rests on only 6 patients.
- PDF text extraction scrambles the Dodge tables; values must be copied from page images and spot-checked.
