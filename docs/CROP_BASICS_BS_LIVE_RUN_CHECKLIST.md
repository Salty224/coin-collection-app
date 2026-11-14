# (bs) Build 3, crop-screen basics: TEST checklist (branch `claude/crop-basics-bs`)

Run on the TEST build (blue "TEST · claude/crop-basics-bs" bar), on a _Testing coin (e.g. AY-00003), phone first. Write-up: [docs/ref/PHOTOS.md](ref/PHOTOS.md) "(bs) Crop-screen basics". Holder / Reference / other trim-only photos save exactly as before (step 2 and R5 check that); since fix round 2 an Obverse / Reverse is cut from the full-resolution original with the circle's framing (R12).

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

## Re-test after fix rounds 1 and 2 (one list; steps 1-11 above stand as passed except where these replace them)
R1. Both crop screens, under the photo / circle: the control pad. Circle: top row − ↑ +, middle ← →, bottom ↺ ↓ ↻. Rectangle crop: the same with the − and + spots empty. Nothing sits right next to ← or →. Buttons comfortable to hit (44 px).
R2. No 0° button anywhere. The readout ("Straighten +1.5°") sits just above the angle slider; a small gold tick marks 0° in the middle of the slider.
R3. ↺ / ↻ step −0.5° / +0.5° and the angle slider moves with them.
R4. Snap: drag the angle slider out, then back towards the middle; anywhere within about ±0.3° of the tick it jumps to exactly 0 ("Straighten 0°").
R5. Snap keeps the bytes: on an untouched Holder, drag the angle slider out a few degrees, bring it back near 0 so it snaps, Use Crop, Skip, Save. The OneDrive file is exactly the original's size (as step 2).
R6. Upright phone: Use Crop (rectangle) and Use Photo (circle) are on screen without scrolling, with a tall photo too.
R7. Lock to square sits between the two 90° buttons; ticking it still squares the box and shows the centre mark.
R8. Circle start (new): frame a Holder's coin tightly with the square, Use Crop. The circle opens with the square EXACTLY filling it (the coin's rim at the circle's edge, nothing cut), and a gold tick on the Zoom slider marks where it starts (left of centre).
R9. Zoom out (new): drag the Zoom slider left or tap − : the circle shows the photo round the square (about 1.5x wider when the square was in the middle of the photo). At the slider's left end the circle is still full of photo: no black anywhere, also after panning to every edge and with the angle slider moved.
R10. Zoom in (new): a small coin (e.g. a dime) cropped with the square at the holder's edges: drag the Zoom slider right or tap + until the coin fills the circle; there is room to spare (up to 6x the start). − / + move about 1% a tap and the slider moves with them; the slider feels even all the way along.
R11. Zoom keeps the centre (new): pan the coin off-centre, then zoom: what is under the circle's centre stays there. A 90° turn on the circle also keeps it there.
R12. Sharp small coin (new, the reason for saving from the original): on the R10 dime at full zoom, Use Photo, Save. The saved Obverse in OneDrive is sharp (about 500-1400 px across, depending on the photo), not blurry or blocky.
R13. Square at the photo's edge (new): pull the square into a corner of the photo, Use Crop: the circle can zoom out only towards the side that has photo, and never shows black.
R14. Direct Obverse pick (new): pick a photo that is just the coin and pull the square out to the whole photo: the circle starts at its smallest zoom (the tick at the far left), can still zoom in, and never shows black. A direct pick left at its usual square has the photo round it to zoom out into.
R15. Guided crop from a Holder: R8-R12 behave the same there.

## Re-test results
Build of `7a19175` (Ray, phone, 14 Nov 2026): R1-R15 passed. Asked for next (fix round 3): the snap zone to ±0.5°, arrows at 1 px, and view zoom on the rectangle crop (plan: docs/BACKLOG.md "(bs) fix round 3 plan").

## Fix round 3 TEST (changed items only)
T1. Angle snap: drag the angle slider back towards the tick; anywhere within about ±0.5° it jumps to exactly 0 ("Straighten 0°"). On an untouched Holder: drag the angle out a few degrees, let go just under half a degree from the tick, Use Crop, Skip, Save: the OneDrive file is exactly the original's size.
T2. Arrows: each tap now moves the box (rectangle) or the coin (circle) 1 px.
T3. Rectangle crop, − / +: the − and + spots now zoom the VIEW: 1.25x a tap, up to 4x; a "2.0×"-style badge shows the zoom; − is grey at 1x and + at 4x. Nothing about the saved photo changes.
T4. Zoom about the right place: open a Holder and tap + without touching anything: it zooms into the middle of the view. Then touch a corner handle (no need to move it) and tap +: it zooms into that corner, which stays where it was on screen.
T5. Panning: zoomed in, drag one finger on the dimmed photo outside the box (or on the dark margin): the view moves; the box does not. Drag inside the box: the box moves. Two fingers: pinch to zoom, move both to pan.
T6. Placing an edge precisely: zoom into a holder's edge and drag the handle onto it; drag it towards the view's edge and hold: the view slides along with the handle under your finger.
T7. At 4x, pan to each corner of an untouched Holder photo: the corner handle sits on the dark margin and can be grabbed (no Lock to square trick needed).
T8. Arrows while zoomed: at 4x one tap is a tiny move; if the edge is off the view, the view follows it.
T9. Zoom and the other controls: a 90° turn goes back to 1x; the angle slider keeps the zoom; ticking Lock to square keeps the zoom and shows the squared box; Use Crop / Cancel and the next crop opens at 1x.
T10. Saving is unchanged: (a) an untouched Holder zoomed in, panned and pinched, then Use Crop, Skip, Save: the OneDrive file is exactly the original's size; (b) a trimmed Holder placed while zoomed comes out at full resolution, trimmed exactly where the box was.
T11. Use Crop still on screen without scrolling on the upright phone.
