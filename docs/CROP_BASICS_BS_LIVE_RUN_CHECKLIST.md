# (bs) Build 3, crop-screen basics: TEST checklist (branch `claude/crop-basics-bs`)

Run on the TEST build (blue "TEST · claude/crop-basics-bs" bar), on a _Testing coin (e.g. AY-00003), phone first. Write-up: [docs/ref/PHOTOS.md](ref/PHOTOS.md) "(bs) Crop-screen basics". Nothing here changes how a photo is saved; step 2 and step 7 check that.

1. Edit Coin, Holder front, 📷 Camera in Full (landscape). The whole crop screen fits; a dark margin runs round the photo; all 8 handles are on that margin and can be grabbed WITHOUT ticking Lock to square. Drag one corner in, then Use. Skip the guided offer.
2. Holder untouched: pick one and tap Use Crop straight away, Skip, Save. Its OneDrive file is the camera's own size, as in (ak) step 1.
3. A wide Reverse pick from the Gallery (a landscape photo): nothing runs off the right edge, the box's right-hand handles are reachable, no 90° turn needed.
4. Long-press on the photo in the crop box, on the margin, and inside the circle: no Android menu (no "Save image" / "Share" / text selection).
5. Arrows (← ↑ ↓ →, under the photo / under the circle): each tap moves the box a little (Stage 1) or the coin under the circle (Stage 2), same direction as a drag. On an untouched Holder all four Stage 1 arrows are grey until the box is pulled in. Say whether 2 px a tap is too much or too little.
6. Straighten: −0.5° / +0.5° buttons, the readout ("Straighten +1.5°"), and the slider in 0.1° steps, on both stages. Straighten a slightly tilted Holder by 1.5°: the saved photo comes out straight.
7. (Superseded in the fix round, 14 Nov 2026: the 0° button is gone; see R5.) 0° reset: on an untouched Holder, tap +0.5° three times and move the slider a little, then tap 0°. The readout says "Straighten 0°". Use Crop, Skip, Save. The OneDrive file is byte for byte the original: the same size as the camera / Gallery file (as in step 2).
8. Centre mark: a small cross at the centre of the circle (Stage 2) always; on Stage 1 only after ticking Lock to square. It is not in the saved photo.
9. Guided crop from a Holder: the same arrows, angle buttons and centre mark on both stages.
10. Turn the phone sideways during a crop: the screen re-fits, the box stays on the same part of the photo, and the panel scrolls to Use Crop.
11. Optional, tablet: the crop area is the full 360 x 300 size; nothing else changed.

## Results
Build 119 (Ray, phone, 14 Nov 2026): all steps passed; step 10 N/A (the app stays portrait, as Ray wants). Changes asked for: the fix round below.

## Fix round re-test (changed items only; the rest stands as passed)
R1. Both crop screens, under the photo / circle: the control pad. Circle: top row − ↑ +, middle ← →, bottom ↺ ↓ ↻. Rectangle crop: the same with the − and + spots empty. Nothing sits right next to ← or →. Buttons comfortable to hit (44 px).
R2. No 0° button anywhere. The readout ("Straighten +1.5°") sits just above the angle slider; a small gold tick marks 0° in the middle of the slider.
R3. ↺ / ↻ step −0.5° / +0.5° and the angle slider moves with them.
R4. Snap: drag the angle slider out, then back towards the middle; anywhere within about ±0.3° of the tick it jumps to exactly 0 ("Straighten 0°").
R5. Snap keeps the bytes: on an untouched Holder, drag the angle slider out a few degrees, bring it back near 0 so it snaps, Use Crop, Skip, Save. The OneDrive file is exactly the original's size (as step 2).
R6. Circle − / +: each tap zooms out / in about 1% and the Zoom slider moves with them; − stops when the picture just covers the circle. (The Zoom slider itself is unchanged, waiting for Ray's choice: see the report.)
R7. Upright phone: Use Crop (rectangle) and Use Photo (circle) are on screen without scrolling, with a tall photo too.
R8. Lock to square now sits between the two 90° buttons; ticking it still squares the box and shows the centre mark.
