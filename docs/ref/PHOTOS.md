# Reference: PHOTOS (moved out of CLAUDE.md)

Read this file when: touching photos, crop, receipts, the image chooser, Manage Photos, photo labels, Replace, Save-wait behaviour, or reference images.
Rules that stayed in CLAUDE.md (not in this file): "Photos wait for Save" (C1-C3, "C2: the leave guard", "Replace never overwrites a photo file"), "Receipts never overwrite", "Photo / receipt write layer", "Receipt photos auto-convert to PDF", and the chooser rule E2 (under "Rules extracted from moved sections"). The continuations of the Save-wait, leave guard, Replace, Receipts and write-layer sections are in docs/HISTORY.md.
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

## Add Coin uses Edit Coin's photo section (Oct 2026, merged to main 23 Oct 2026 by fast-forward, built on `claude/addcoin-shared-photos`)
**Merged on Ray's go-ahead (23 Oct 2026).** T1 passed on `1e231f0`; T2 passed on
`031c48f` on the S25 and tablet (T2.1-T2.9 as expected, T2.10 skipped); Q1-Q3
after T1 accepted. Commit 6 (`c6f0ba0`, the retired code removed) and this
doc commit came after T2 and change nothing Ray sees. `main` is the source of
truth; the branch stays on origin as history. Add Coin's old 📷 🖼️ 📁 slots,
preview card and gallery are gone from `main`.
Ray's decision (22 Oct 2026), replacing unified-image-chooser C3: Add Coin
and Edit Coin give the SAME photo experience; only the timing differs.
Add Coin and the Staging-draft edit will render Edit Coin's own section
(`renderManagePhotosInto` and its blocks) in a draft storage mode: picks stay
in memory, nothing is written until Save, and Save writes to Staging exactly
as today (file names, coin.json, gallery). No "Saving…" and no ↻ in draft
mode; a failed "Save changes" reads "Not saved — tap Save changes again".
Answers he gave to the plan (Q1-Q6, all as recommended): retire Add Coin's
live preview card (flip frame, corner labels, Obverse/Reverse toggle);
add Package (OGP) and COA to both coin screens; crop sources Holder,
Reference and Other only; that failed-save wording; branch Option A
(main fast-forwarded to `38b0207`, this branch cut from it); Add Set's
matching text renamed now, text only.
Suite: `tests/verify_addcoin_shared_photos.js` (70 at commit 1, 266 at
commit 5).
- **Planned commits**: (1) wording, crop sources, OGP/COA on the coin
  screens — BUILT, T1 passed; (2) draft mode in the shared blocks — BUILT;
  (3) Add Coin new draft uses the section — BUILT; (4) the Staging-draft
  edit uses it — BUILT; (5) crop from another photo in draft mode — BUILT,
  HELD for T2 (Ray tests Add Coin and a Staging edit on the S25); (6) remove
  the dead Add Coin preview/slot code, its own revertible commit — BUILT
  (`c6f0ba0`); (7) CLAUDE.md. Details of 2-6 below, after the T1 follow-ups.
- **S3 golden (`tests/fixtures/addcoin_photo_save_golden.json`)**, recorded
  on `main` `38b0207` before any change: a fixed pick set (front, back,
  holder front/back, two references labelled "TrueView obverse/reverse", one
  other labelled "Mint box") through the real Add Coin screen and crop tool,
  saved as a new draft (AY-00501) on the mock client. Pins coin.json's photo
  list (type, filename, label, order, both `_original`s) and the nine
  uploaded names. `pickAll` in the suite is the only screen-specific part:
  when Add Coin's screen changes, `pickAll` changes and the golden must not.
  Re-record only on purpose: `RECORD_ADDCOIN_GOLDEN=1 node tests/verify_addcoin_shared_photos.js`.
- **Commit 1, wording (Edit Coin, Manage Photos for a coin, crop dialogs,
  type labels, Add Set text)**: sections read "✂️ Crop from another photo",
  "🪙 Obverse & reverse", "🔲 Holder (slab or flip)", "🔗 Reference photos",
  "📦 Package / OGP", "📜 COA / certificates", "🖼️ Other photos". Obverse &
  reverse hint (unchanged): "The coin itself — the images the app shows for this coin. Cropped
  square, then framed into the circle." Holder hint: "…a slab (rectangle) or
  a flip (square — tick Lock to square)." Reference hint (and Add Set's
  child reference text): "Professional images of this coin or its type —
  PCGS TrueView, auction listings and similar." Type labels: "Obverse",
  "Reverse", "Holder — front", "Holder — back" (shown in crop titles, the
  type picker, source tiles, the coin page's Photos strip and the viewer
  footer). **Rule (Ray, 22 Oct, T1): the coin's own display images are
  Obverse / Reverse; Front / Back is only for the Holder** (and for the
  other non-coin pairs: Package, whole set, sub-group). The coin pair's
  slots read "Obverse"/"Reverse" (`managePairBlock` picks by `flipSource`).
  Commit 1 first shipped "🪙 Front & back" and "Front (obverse)"/"Back
  (reverse)"; corrected after T1.
  Recrop titles "Recrop (from the original)" / "Recrop (from the saved
  photo)"; toasts "…a later Recrop works from this cropped image",
  "No original on file — recropping the saved photo itself." Gallery default
  text "Any other photos — holder, COA or box shots, extra angles…". Add
  Set child: "🔲 Holder (slab or flip)" with the same holder hint plus the
  slab cert-number note. **Stored values unchanged**: keys `slab_*`,
  PhotoType `Slab_Obverse`/`Slab_Reverse`, `Obverse`, `Reverse`.
  Left alone: "Lock to square", "Adjust Photo" (the circle step),
  "— none / not slabbed —" (Grading Service), and the Obverse/Reverse toggle
  on Add Coin (retired in commit 3) and Wishlist (C4).
- **Commit 1, crop sources**: `CROP_SOURCE_TYPES` = `slab_obverse`,
  `slab_reverse`, `reference`, `other` (was obverse, reverse, slab ×2,
  reference). Obverse/Reverse dropped (Recrop re-frames them from the original);
  Other added; Reference kept (often a PCGS TrueView of this very coin).
  Destination buttons "Obverse" / "Reverse" / "Reference" (were Extra image
  for the last); "Replace the obverse?" / "Your new crop becomes this coin's
  obverse image." (same for reverse). Hint: "Tap a Holder, Reference or Other
  photo to crop this coin's Obverse, Reverse or a Reference image out of it.
  The photo you tap is never changed." What each writes is unchanged.
- **Commit 1, OGP and COA on a coin**: the coin branch of
  `renderManagePhotosInto` gains "📦 Package / OGP" (pair, `ogp_obverse`/
  `ogp_reverse`) and "📜 COA / certificates" (open list, `coa`) between
  Reference and Other, same blocks, hints and chooser as the Set screens.
  Before, a coin's stored OGP/COA rows were hydrated into the gallery and
  then shown nowhere, although Add Coin's gallery could capture them.
  **A coin inside a Set (`ctx.parentSetId`) gets no COA section of its own**
  (the parent's COA read-through still shows), unless it already has COA
  photos, which are never hidden. Commit, Replace, ✕, ↻ and naming are the
  shared ones (`{ID}_ogp_reverse.jpg`, next `_coa_NN`).
- **Tests, commit 1** (W, CS, OC, L blocks; S3 unchanged): wording on both
  coin screens incl. titles/aria-labels/placeholders; exact sources on both;
  a crop from an Other photo lands as the Front (row PH-1 updated in place,
  `_obverse_cropped_02.jpg`, source untouched); stored OGP front and
  labelled COA page show; a new OGP back and COA page commit with the right
  rows and two uploads; Set-child COA rule both ways; layout at 360x800,
  412x915, 1024x768 on both screens (Edit Coin pair slots 112/138/444px,
  Manage Photos 144/170/476px, Package equal to Obverse & reverse, titles one
  line, no page scroll). Existing suites followed the new strings, not
  weakened: `verify_crop_from_upload` A1-A3/A3b/A6/B2/C/C9/D/D1/E,
  `verify_live_no_demo_data` A7/A8/A11, `verify_photo_receipt_write` P7b,
  `verify_staging_edit_photos` (Holder picks), `verify_files_picker`
  (Holder pick, D5 "Crop — Reverse" title), `verify_image_chooser`
  (Holder and "Obverse & reverse" sections), `verify_in_app_viewer` B2 (the
  viewer footer says "Reverse"). `npm test` on the branch at
  `0809ee8`: 3320 passed, 0 failed, 0 page errors, 70 suites.
- **Negative controls, commit 1** (real app.html, restored by checksum,
  each failing by name): "🔲 Slab photos" back (W1, W6, L3 ×6); old crop
  sources (CS1 ×2, CS2-CS4); no OGP/COA on coins (W1, OC1-OC7, L2-L4 ×6);
  COA always on a Set child (OC6); old Reference hint (W4, W6); old
  destination names (CS2-CS4).
- **Not verified**: any real device; how "Holder (slab or flip)" and the two
  new sections read on the S25; a real OGP/COA upload to `_Testing`.
- **Follow-up to commit 1 (Ray's T1, 22 Oct): non-circle photos at their own
  shape.** Holder, Reference, Package/OGP, COA, Other, and a Set's whole-set
  and sub-group pairs were cover-cropped to a square, cutting the edges off a
  wide PCGS TrueView and a tall slab. Now drawn at the image's own shape on
  Edit Coin, Manage Photos (coin and Set), Edit Set, the parent-COA
  read-through and the coin page's Photos strip. Front/Back unchanged; the
  "+" boxes unchanged (88px tile, 120px pair box).
  *(Open-ended tiles on the editing screens, the coin page strip and the
  three coin screens' parent-COA tiles superseded on
  `claude/photo-label-save-changes`: same row height, own shape, labels in
  the viewer. See "Photo labels save with Save Changes". Add Set step 2's
  parent-COA copy and the crop-source tiles keep this.)*
  - Open-ended thumbs (`.gc-thumb.gc-shaped`, chooser mode only): the tile
    stays 88px tall and its width follows the image, capped at 174px of
    image (a 2:1 TrueView fills 174x88). `galleryThumbInner(entry, {shaped,
    inside})` puts a hidden `<img class="gc-img-sizer">` inside `.gc-img` to
    size it; the photo is still the `.gc-img` background, so every existing
    reader of `.gc-img`/`backgroundImage` is unchanged. The failed-save dim
    and ↻ move inside the image box (`opts.inside`) so they cover and centre
    on it. Caption, Replace and state lines use `width:0; min-width:100%` so
    they take the image's width; the ✕ stays on the image corner because
    the tile is exactly as wide as the image.
  - Pair slots (`.sg-photo-slot.sg-shaped`, chooser mode, non-flip types):
    the photo, label and Replace sit in `.sg-photo-col`, as wide as the
    image; image max 120px tall and max the slot's width (a 2:1 Package
    photo at 360px on Edit Coin is 112x57). The slot needs `min-width:0`,
    or a flex item grows to the image's natural width (seen: 238px in a
    112px slot).
  - `galleryEntryIsShaped(entry)` = not a flip source. An image the browser
    can't decode falls back to today's square (a capture-phase `error`
    listener), so a shaped tile never collapses to nothing.
  - **Stored files are already full images**, confirmed in code: non-flip
    types never run Stage 2, and Stage 1 bakes the user's crop at its own
    aspect (long edge capped at 1400px), uploaded as-is by
    `commitGalleryPhoto` and `uploadCoinDraftPhotos`. Nothing is
    square-cropped at upload. Front/Back are stored square by design.
  - **The in-app viewer (`.gallery-viewer-grid .gc-img`, `contain`) already
    showed the full image** and is unchanged. Also unchanged: the "Crop from
    another photo" source tiles (still squares), Add Coin's own gallery
    (moves onto the shared section in commit 3), Add Set and Wishlist.
- **Parent COA read-through now reads the Photos tab itself** (Ray's Q1
  condition: a coin inside a Set must still show the Set's COA, linked).
  `renderParentCoaReadThrough()` read only the in-memory gallery, so a
  Set's stored COA appeared on its child coin only if the Set's own screen
  had been opened earlier in the session. It now calls
  `hydrateStoredPhotos(parentId)` first and paints each thumb when its file
  arrives. Tapping a page still opens the Set's photos in the viewer.
- **A child coin's page (Docket) shows its Set's COA** (Ray's T1 follow-up).
  The coin page's Photos section gets the same read-only "📜 COA — from
  parent Set" block as Edit Coin (`renderParentCoaReadThrough()` with
  `opts.onOpen`, inside `#detailParentCoa`), shown when the coin has a
  parent Set (`resolveChildParentSet`, OriginSetID) with COA photos; the
  Photos section appears for it even when the coin has no photos of its own.
  Each page is a button that opens that photo in the in-app media viewer,
  footer "COA — from parent Set — {label}" (`openCoinPhotoInViewer(coin,
  entry, { label })`). No ✕, no Replace, no label box. **The parent Set's
  Package/OGP (and its other photos) are shown nowhere on a child coin**:
  only the COA reads through, on Edit Coin, Manage Photos and now the coin
  page. Not added (Ray: report only).
- **Tests, follow-up** (`verify_addcoin_shared_photos.js` 70 -> 205; W12/W13,
  CS3b/CS3c for the Obverse/Reverse wording; DK1-DK5 for the Docket COA):
  SH1-SH9 at 360x800, 412x915, 1024x768 on Edit Coin, Manage Photos coin,
  Edit Set, Manage Photos Set and the coin page (shape kept, 2:1 and 1:1.6
  ratios within 3%, height kept unless capped, no sideways scroll and inside
  its slot, ✕ on the image corner, label and Replace as wide as the photo,
  "+" boxes square, Front unchanged); CR1-CR3 on a child coin's Edit Coin
  and Manage Photos with the Set's screen never opened. Negative controls
  (real app.html, restored by checksum): square thumbs back (SH1/SH2/SH3
  x15, CR2 x2); no parent hydration (CR1-CR3 x2); caption/Replace not
  constrained (SH3 x15); old Front/Back wording back (W1 x2, W5 x2, W8, W12,
  CS2-CS4, L3 x6); coin pair labelled Front/Back alone (W12); parent COA hidden
  on the Docket (DK1-DK3).
- `npm test` on the branch at `921ce84`: 3455 passed, 0 failed, 0 page
  errors, 70 suites (3320 + 135 new, all in `verify_addcoin_shared_photos`).
- **Not verified, follow-up**: a real TrueView, slab and COA photo on the
  S25; a very tall image (narrower than 1:2) gives a very narrow tile, and
  no minimum width was added.

- **After T1 (Ray, 22 Oct, on `1e231f0`): Q1-Q3 accepted** — whole-set and
  sub-group pairs keep their own shape; crop-source tiles at their own
  shape; Edit Coin's parent COA tap opens the full-screen viewer.
- **Commit A (`baab8ea`)**: "Crop from another photo" source tiles
  (`.crop-src-tile.gc-shaped`, `galleryShapedSizer`, painted when a stored
  file arrives) follow the photo's own shape; on Edit Coin / Manage Photos
  for a coin inside a Set, tapping a parent COA page calls
  `openCoinPhotoInViewer` (footer "COA — from parent Set — {label}"); the
  "COA — from parent Set" thumbs are left-aligned on the coin page and in
  Edit (`.gallery-strip[data-role="coa-strip"] { justify-content:
  flex-start }`). Tests CT1-CT4, CR3 (full-screen viewer), CR4, DK6.
- **Commit 2 (`f423bfe`), draft mode in the shared blocks.**
  `buildPhotoPairSlot`, `managePairBlock`, `manageOpenEndedBlock` and
  `renderManagePhotosInto` take `opts.draft` (an object, may be `{}`;
  `draft.onRemove(entry)` optional). A pick, Replace, Recrop or ✕ changes
  the in-memory gallery only (`draftPlaceGalleryEntry`, never a commit,
  whatever the target id); no hydration, no "Saving…", no ↻; a failed save
  reads `DRAFT_NOT_SAVED_TEXT` = "Not saved — tap Save changes again". ✕
  goes through `confirmRemoveDraftPhoto` ("It hasn't been saved yet, so
  taking it off writes nothing"; a `stagingStored` photo "comes off the
  draft when you tap Save changes"). Recrop uses `draftRecropSource`
  (`rawUrl`, then `stagingRawUrl`, then the shown photo). Tests DM1-DM9,
  driven on a REAL owned coin with the write layer on, so only draft mode
  keeps them off OneDrive.
- **Commit 3 (`2352da2`), Add Coin's new draft uses the section.**
  `renderAddCoinPhotos()` draws `renderManagePhotosInto("addCoinPhotoSections",
  { id: ADDCOIN_GALLERY_ID, kind: "coin" }, { draft })` inside Add Coin's
  Photos accordion, over the same gallery Save already reads; called at
  init, by `resetAddCoinForm`, by the Staging load/upload-state renders and
  by `clearCoinDraftEditContext`. Same sections (Package/OGP and COA
  included), wording and shapes as Edit Coin (AC2 compares the two screens'
  text). The retired preview card, Obverse/Reverse toggle, 📷 🖼️ 📁 slots
  and old gallery sat in `<div id="addCoinLegacyPhotos" hidden>` until
  commit 6 removed them. **S3 golden unchanged**:
  only `pickAll` moved (section "+" -> chooser -> Files -> crop). S3.8 no
  upload before Save; S3.9 section empty after Save; AC1-AC6 at 360x800,
  412x915, 1024x768. Tests that drove the retired UI follow the change:
  `verify_files_picker` I1/I2 (no 📷 🖼️ 📁 rows; the chooser's Camera /
  Library / Files whole and on screen), `verify_addcoin_accordion` (counts
  Add Coin's own sections; B3 = the section host), and
  **`tests/verify_addcoin_preview_fit.js` is deleted** with the preview card
  it tested (69 suites).
- **Commit 4 (`671c058`), the Staging-draft edit uses the section.**
  `loadStagingEditFiles` loads coin.json's photos into the same section as
  `stagingStored` entries, sets `stagingRawUrl` from the `_original` for
  Recrop, and keeps `parentSetId` / `parentSetName` from `draft.originSetId`
  on `editDraftFiles`; `renderAddCoinPhotos` passes them as the ctx parent,
  so **the parent Set's COA read-through shows on a Staging draft only when
  the draft already names a parent Set** (coin drafts don't today). ✕ on a
  saved photo counts `editDraftFiles.removedCount` (the "N photos removed"
  toast). A failed Save shows the draft-mode text; Save changes is the
  retry. Save, names and deletes (`uploadStagingEditFiles`,
  `mergeStagingEditFiles`, `finishStagingEditFiles`) unchanged.
  `verify_staging_edit_photos.js` picks and checks through the section
  (P2, P6, Q1-Q3, Q11 rewritten to the new UI); every save-output assertion
  unchanged. New SE1-SE4.
- **Commit 5 (`68f1c54`), crop from another photo in draft mode.** The
  section shows on Add Coin and the Staging edit too. Sources
  (`cropSourceEntriesFor(id, draft)`) are the draft's Holder/Reference/Other
  photos that have a picture; `cropSourceName` names a pick by its type in
  the dialogs (never the `__addcoin_draft__` filename);
  `saveDraftCropFromUpload` places the crop as the Obverse/Reverse (asking
  first, "Nothing is written until you save") or a new Reference. **Same
  rule as a saved coin: no `_original` copy for a crop from another photo**,
  so Save writes `{ID}_obverse_cropped.jpg` alone. On a Staging edit,
  cropping over a saved obverse replaces it like any Replace: at Save its old
  `_original` is no longer listed and is deleted. Saved coins unchanged.
  Tests CF1-CF6, SE5.
- **Commit 6 (`c6f0ba0`), the retired code removed** (its own revertible
  commit, built after T2 was set up; it changes nothing Ray sees). Gone: the
  preview card markup and its six file inputs (`obverse/reverse
  Camera/Library/FilesInput`), `updateFlipLabels`, `showObversePhoto` /
  `showReversePhoto` / `initPhotoToggle`, the obverse/reverse
  `wireMockPhotoSlot` calls, `initGalleryCapture("addCoinGallery")`,
  `STAGING_FLIP_SLOT_IDS`, `showStagingFlipPreview`,
  `setFlipSlotReplaceLabels`, `removeStagingEditEntry`, the flip-slot parts
  of `updateStagingEditRemoveButtons` / `wireStagingEditRemoveButtons` /
  `renderStagingEditUploadStates` (now just a section redraw),
  `initGalleryCapture`'s Add Coin-only Staging states, `.staging-retry-btn`.
  Kept on purpose: the receipt slot and its ✕; `wireMockPhotoSlot`
  (Wishlist, receipts); `initGalleryCapture`'s generic `opts.files` /
  `guardImages` (no caller now; Add Set's C4 may use them); the CSS the
  Wishlist toggle shares. Tests that read the removed card now check its
  absence or the chooser route: `verify_files_picker` (inventory 42 -> 38
  inputs, 22 -> 20 camera inputs; D/E drive the chooser from Add Coin's
  section; A3 Add Coin has only the receipt's inputs), accordion E1/E2,
  bugfixes 1.11/1.12 (Q2.1-Q2.3 removed with the card), composition K1,
  grade-designation B4 removed, image-chooser X1.
- **Negative controls, commits A-5** (real app.html, restored by checksum,
  each failing by name): crop tiles square (CT1/CT2 x6); Edit's COA tap to
  the old panel (CR3 x2); COA strip centred (CR4 x2, DK6); draft picks
  committing (DM2-DM6, DM9); old failed-save text and ↻ (DM8); committed
  remove in draft (DM6, DM7, DM9); legacy UI shown (AC3); no section (AC1,
  AC2, AC4, AC5 x3, S3.1/S3.2/S3.5/S3.6); no re-render on reset (S3.9);
  parent ignored on a draft (SE1); no Staging original (SE3,
  staging-edit-photos P5); removals not counted (staging-edit-photos Q5);
  crop hidden in draft mode (DM1, AC1, AC2, SE5, CF1-CF4, CF6); original
  kept on a draft crop (CF3, CF6); temp filename in the dialog (CF2).
  Commit 6: the old markup put back, hidden (files-picker B1/B3/C1/A3/A9,
  accordion E1, composition K1, image-chooser X1).
- **npm test**: commit A `baab8ea` 3482/0/0/70; commit 2 `f423bfe`
  3491/0/0/70; commit 3 `2352da2` 3463/0/0/69 (preview-fit suite removed); commit 4 `671c058` 3467/0/0/69; commit 5
  `68f1c54` 3474/0/0/69; commit 6 `c6f0ba0` 3464/0/0/69 (10 assertions on the removed card dropped).
- **Not verified**: any real device; the chooser's Files and Camera from
  Add Coin's section on the S25; a real Staging edit's Recrop and crop from
  a Holder photo; how Add Coin reads without the preview card.


### C3: open-ended Package / OGP (same branch, HELD for Ray's tablet test; merged to main 27 Oct 2026)
Backlog n; Ray's Q7 (open-ended in Add Coin and the Staging-draft edit too)
and Q8 (map existing OGP_Obverse / OGP_Reverse rows on read, no workbook
writes).
- **New gallery type `ogp`** (`label "Package"`, suffix `_ogp`,
  repeatable): PhotoType **"OGP"**, files `{ID}_ogp_NN.jpg`, one label per
  photo. "📦 Package / OGP" on Edit Coin, Edit Set, Manage Photos (coin and
  Set), Add Coin and the Staging-draft edit is now `manageOpenEndedBlock`
  (`PACKAGE_HINT` suggests labels "Closed" / "Open"), not a pair. Holder
  stays a Front/Back pair. Numbers are chosen at Save, so a discarded pick
  uses none (C1 rule).
- **Old rows mapped on read, never rewritten.** `PACKAGE_TYPES`
  (`ogp_obverse`, `ogp_reverse`, `ogp`) all show in the Package list;
  `packageEntriesInOrder` puts an old Front first, then an old Back, then
  the rest as added. While its label is blank an old row's label line reads
  "Front" / "Back" (`packageDisplayLabel`, display only: the viewer's label
  field stays blank and the text is never written). Replace on an old row
  keeps its row (PhotoID, PhotoType OGP_Obverse/OGP_Reverse, Label,
  DateAdded; only Filename/OriginalFilename are written, C1's Q3) under a
  new `{ID}_ogp_NN.jpg` name; the new entry carries `packageSide`, so it
  keeps its place and its "Front" until reload re-reads the row. ✕ detaches
  as normal. The `ogp_obverse`/`ogp_reverse` keys stay defined for reading
  and for Add Set.
- **Set flip photo** (`setFlipPhotoUrl`): the whole-set front first,
  unchanged; then the first Package photo in screen order, so an existing
  Set with an OGP_Obverse row shows exactly what it did. The back side keeps
  the old OGP_Reverse lookup (a Set's page shows the front only).
- **Add Set untouched (C4).** Its own Package Front/Back pair
  (`ADDSET_OGP_PAIR`) and the whole-set mirror into `addSetPhotoFiles
  ["whole"]` are unchanged; the new type is `managedOnly`, which keeps it
  out of `openGalleryTypePicker`'s default list (Add Set's "Add photo"
  picker). Wishlist untouched.
- **Draft mode** needed no new code: `stagingPhotoTypeFromFilename`,
  `nextFreeStagingRepeatableFilename`, `uploadCoinDraftPhotos` and
  promotion (`recordPromotedCoinRecords`) are generic on the type table, so
  an Add Coin Package pick saves as `{ID}_ogp_01.jpg` in Staging and is
  promoted as an OGP row with its label.
- **Copilot item (Ray's Q9):** if `Lookup_PhotoTypes` exists it needs the
  value "OGP"; the app writes it either way and needs no new column.
- **Tests:** `verify_ogp_open_ended.js` (40): O1-O3 the four screens (tiles,
  + Package, hint; old rows Front first with "Front"/"Back"; reading writes
  nothing); O4 two labelled picks save as OGP rows `_ogp_02/_03` past a
  stored `_01`, a discarded pick using no number; O5 Replace on an old Front
  (row kept, file cells only, still first, still "Front"); O6 the viewer
  field blank; O7 ✕ on an old Back; O8 the flip photo in five cases plus the
  Set's page; O9 Add Coin's draft naming and promotion; O10 Staging names;
  O11 Add Set's pair and type picker; O12 layout at 360x800, 412x915,
  1024x768. **Tests changed to follow the design, not weakened:**
  `verify_addcoin_shared_photos` (OC1/OC3: a stored OGP front is a "Front"
  tile, a new Package photo saves as `_ogp_01` with an OGP row; L2-L4:
  Package is tiles, so two pairs and three tiles are checked),
  `verify_image_chooser` (its Set-pair example moved from the OGP pair to
  the whole-set pair, still a real Set pair: fixture PH-00010 is now a
  whole-set front, SJ1 adds the whole-set back, `visible()` ignores the named
  sub-group, L1-set counts 4 slots), `verify_row_tiles_viewer_label`
  (P1/P2's Set pair is the whole-set pair), `verify_photo_receipt_write`
  (B1/B2: 12 types, OGP added).
- **Negative controls** (real app.html, restored by checksum, each failing
  by name): Package still a pair (O1-O4, O9a, O12: 25); old rows not mapped
  (O2 x4, O4c, O5, O7: 16); no "Front"/"Back" on screen (O2 x4, O4c, O5c,
  O7); the flip photo taking list order (O8b, O8e, O8f); Replace dropping
  the old side (O5c); Add Set's picker offering Package (O11b); no OGP
  PhotoType (15). Two controls first crashed the suite part-way; O4/O5/O7
  are null-safe now so they fail by name.
- **Not verified:** any real device; a real Package upload to `_Testing`.
- **Correction (Ray, 27 Oct 2026): old-style rows DO exist.** The "no
  OGP_Obverse/OGP_Reverse rows" assumption (from the 05 Sep upload) is
  wrong: on TEST, AY-00463 has OGP_Obverse and OGP_Reverse rows dated 22 Oct
  (probably an Add Set promotion, which still records the whole-set photo as
  OGP_Obverse), beside a new OGP row. Nothing changes: the read mapping
  above stays until C4 (backlog q).
- `npm test` on C3: 3961 passed, 0 failed, 0 page errors, 75 suites (3921 +
  40; every rewritten suite keeps its count).



## Photo labels save with Save Changes (Oct 2026, merged to main 24 Oct 2026 by fast-forward, built on `claude/photo-label-save-changes`)
**Merged on Ray's go-ahead (24 Oct 2026)** after his tablet test of `dac32fe`
passed and the Edit Set toast fix (`a576e42`, below). `main` is the source of
truth; the branch stays on origin as history. Branch cut from `main`
`e8abe7d`. Suite: `tests/verify_photo_label_save.js`. Replaces the earlier
`claude/label-save-on-blur` (`dfcb4f1`/`3994ee4`, never merged, kept on origin
as history): Ray tested save-on-blur on TEST and chose design B, because a
label saved on blur had no undo.
- **The rule.** A label typed on a saved photo (Reference, COA, Other on a
  coin; COA, Other on a Set) works like the coin's other fields: typing
  changes memory only. Nothing writes a label on blur, Enter, a redraw,
  navigation, the chrome Back, `visibilitychange` or `pagehide`, and there
  is no "Label saved." toast. Enter only closes the keyboard.
- **What saves it.**
  - Edit Coin: Save Changes.
  - Edit Set: Save Changes writes changed labels for real, even though the
    Set's other fields stay session-only (Ray's Q1).
  - Manage Photos (coin and Set): a "Save labels" button
    (`#managePhotosSaveLabelsBtn`) under the sections, shown only while a
    label differs from the saved one (Ray's Q2).
  - Draft mode (Add Coin, the Staging-draft edit): unchanged; Save writes
    the labels with the draft.
- **Back asks; everything else discards.** Edit Coin, Edit Set and Manage
  Photos Back show "Discard unsaved edits?" (Keep editing / Discard) when a
  label is unsaved. Edit Coin's dialog counts fields and labels together
  ("1 field and 1 photo label"). Discard puts every box back to
  `entry.savedLabel` (blank for a photo with no row yet) and clears the red
  line. `navigate()` (Close Drawer and every other route) discards without
  asking, as it already did for Edit Coin's fields (Ray's Q3; see backlog
  (l)). Opening Edit Coin or Edit Set also discards that record's leftovers.
- **Found while building, and fixed: Edit Coin's Back warning was not
  reachable.** The in-form Back (`#browseEditBackBtn`) is hidden by CSS like
  every `.back-link`; the visible chrome Back called `showBrowseDetail()`
  straight, skipping the warning for fields too. Both now go through
  `leaveBrowseEditGuarded()`; Edit Set through `leaveBrowseEditSetGuarded()`;
  Manage Photos' `setNavBack` wraps `ctx.backTo` the same way.
- **Capture, Replace and ↻ write the SAVED label, never the box text**
  (Ray's Q4). `commitGalleryPhoto` passes `entry.savedLabel || ""` to
  `writePhotoRow`. Replace carries `savedLabel` (and the typed caption) to
  the new entry, so the typed text stays unsaved in the box and Save Changes
  writes it. A brand-new photo's row starts with a blank Label, even with
  text typed while it says "Saving…". ✕ is unchanged.
- **Save Changes order (Edit Coin):** the coin row (with its conflict check),
  then the CoinID re-link, then each changed label, one at a time, one cell
  each. A conflict block or a failed field save writes no labels. If the
  fields save and a label fails, the label keeps its text and the red
  "Label not saved" line, and the form stays open; the next Save Changes
  finds no field changed and writes only the labels.
- **Labels-only save:** when no writable field differs from the snapshot
  (`rowFieldsUnchanged`), only the label cells are written; the coin row is
  not touched, so LastModified/Reviewed are not stamped.
- **Messages (Ray's Q5):** folded into the existing toast. "Saved AY-00099
  to the workbook (2 fields updated, 1 label)."; labels only "Saved AY-00099
  — 1 label updated."; Edit Set labels only "1 photo label saved to the
  workbook." *(changed by `a576e42`; see the Edit Set toast fix below)*;
  failures add "1 label not
  saved — it's still in the box. Tap Save Changes to try again." or "1 label
  not saved — its photo isn't saved yet. Tap ↻ on the photo, then Save
  Changes."
- **A photo still saving** is waited for (its `commitPromise`) before its
  label is written. A photo whose save failed (no row) gets no label write;
  ↻ writes its row with a blank Label, then Save Changes writes the label.
- **Functions:** `photoLabelDirty`, `photoLabelUnsaved`,
  `unsavedPhotoLabelEntries` / `unsavedPhotoLabelCount` (only records whose
  photos really save, via `photoCommitTargetId`), `savePhotoLabels(targetId)`
  (returns `{saved, failed, noPhotoRow}`), `photoLabelResultText`,
  `discardPhotoLabels(targetId?)` (never touches `ADDCOIN_GALLERY_ID`),
  `confirmLeaveWithUnsavedEdits`, `refreshManagePhotosSaveLabelsBtn`,
  `saveManagePhotosLabels`, `performBrowseEditLabelsOnly`, `rowFieldsUnchanged`.
- **Carried over from the blur branch, with their tests:**
  - `writePhotoLabel(collectionId, photoId, label)`: ONE cell, the Label
    column at the row found by PhotoID and checked against CollectionID.
    Not `patchRecordRow`, which rewrites A..last mapped column and blanks a
    column whose header is blank (`ensureSheetHeaderMap` reads A1:Z1 only).
    `writePhotoRow`'s own replace path still does that (backlog item,
    unchanged).
  - `entry.savedLabel`: set by hydration, by `commitGalleryPhoto` (the Label
    `writePhotoRow` wrote; it now returns `label`) and by a label write.
  - The hydration fix: a redraw never puts the sheet label back over an
    unsaved one, and a cleared label stays cleared.
  - legacyOnly photos get no label field (*since `13e931c` the label is
    edited in the viewer; the line under the tile reads "Replace this photo
    to give it a label"*). Thumbs carry `data-file`.
- **Tests.** One existing suite followed the Q4 change, not weakened:
  `verify_image_chooser` SR2-edit/SR2-manage/R3-edit/R3-manage now expect the
  replaced row's Label to be the SAVED one (blank) while the box still shows
  the typed "Test".
- **Suite (54 at `e2d4eae`, 56 since `a576e42`):** N1 nothing written before Save (blur, Enter, redraw,
  visibilitychange, pagehide); S1-S5 Save order, single cell, fields-only,
  conflict, failed field save, labels-only; L4 hydration; L5 new photo
  still saving; L6 never-saved photo; L7 label failure and retry; L9
  Replace; D1-D7 Back/Discard/navigate; L10 draft mode; L11 Edit Set and
  Manage Photos coin/Set; L12 legacyOnly; LL red line at 360x800, 412x915,
  1024x768. `npm test` on `e2d4eae`: 3518 passed, 0 failed, 0 page errors,
  70 suites.
- **Negative controls** (real app.html, restored by checksum, each failing
  by name): blur save put back (N1a-c, L5d); no discard on leave (D4-D7,
  L11c x3); old hydration overwrite (N1b/d, L4a/b); capture/Replace writing
  the typed text (L5c/d, L6d, L9a); labels written before the fields (S1c,
  S3, S4, S5a); label as a whole-row write (S1c/d, S5a, L5c, L11a/b x2);
  labels not counted in the Back warning (D1-D3, D5, L11c x3); labels-only
  save still writing the coin row (S5a/b, L6b, L7d); "Save labels" always
  shown (L11 x6); no wait for a photo still saving (L5c); a failed label
  still leaving the form (L7a/c).
- **Not protected, by design:** a label typed and not saved is lost if the
  app is closed or the tab killed, exactly like an unsaved field.
- **Not verified:** any real device; Samsung Internet; a real write to
  `_Testing`.
- **Ray's tablet test of `c90b51b` passed.** Three fixes before merge, same
  branch (`22c407f`), suite `tests/verify_tile_width_label_editor.js` (179,
  since replaced by `verify_row_tiles_viewer_label.js`;
  F1/F2 layout on all six screens at 360x800, 412x915 and 1024x768):
  - **F1, open-ended tiles at pair width** *(superseded by the same-height
    tiles below, Ray's tablet test of 22c407f)*. Reference, COA and Other tiles
    (coins and Sets), and their "+" tile, are each half the section wide, two
    per row, the same width as a pair slot on the same screen (measured: 112px
    Edit Coin / 144px Manage Photos at 360; 138/170 at 412; 444/476 at 1024).
    The photo is drawn whole (`background-size: contain`, letterboxed on
    black) in a 120px-tall box, whatever its shape, so a row's tiles match;
    120px is the pair slot's "+" and photo height. CSS `.gc-half-grid`
    (two-column grid, 10px gap like `.sg-photo-pair`), added by
    `manageOpenEndedBlock` in chooser mode only, so every chooser screen gets
    it (Edit Coin, Edit Set, Manage Photos coin/Set, Add Coin, the
    Staging-draft edit). The failed-save dim and ↻ now sit inside the image
    box (`galleryThumbInner(entry, { inside })`). **Supersedes, for these
    tiles only, the T1 follow-up's "open-ended thumbs at their own shape"**
    (`.gc-thumb.gc-shaped` / `.gc-img-sizer`): pair slots, the "Crop from
    another photo" source tiles, the coin page's Photos strip and the
    parent-COA read-through still follow the photo's shape. Non-chooser
    galleries (Add Set, Wishlist) unchanged.
  - **F2, one-line label box + full-width editor** *(superseded: labels
    are edited in the full-screen viewer, see below; the box, the editor
    and their functions are removed)*. The box
    (`.gc-caption.gc-label-box`, readonly so a tap never raises the keyboard
    on the small box) is one line with "…" (nowrap, ellipsis), 12px, 30px
    tall; its `title` is the whole label. A tap, or Enter/Space, opens
    `#photoLabelEditor` (`openPhotoLabelEditor(box, entry, title)`): a
    full-width panel (max 640px) near the top of the screen, a textarea with
    the whole label, a line saying what will save it (Save Changes / Save
    labels / the coin's Save), Cancel and Done. Done, Enter or a backdrop tap
    put the text back in the box by firing the box's own `input` event, so
    the label is unsaved exactly as if typed there (red line, Back warning,
    "Save labels" button, draft caption all unchanged); a newline becomes a
    space. Cancel and Esc change nothing. `navigate()` closes it without
    applying (`closePhotoLabelEditor(false)`). A tile redrawn while it is
    open gets the text on the box now on screen (`photoLabelThumbs`). A
    legacyOnly box (`.gc-caption-legacy`) never opens it. Draft mode too.
  - **F3, stale text.** Manage Photos' footer said "Photos are held for this
    session only — no OneDrive write happens yet." It is now
    `#managePhotosNote`, set in `openManagePhotos`: an owned record (via
    `photoCommitTargetId`) reads "Photos save to OneDrive as you add, replace
    or remove them. Labels save when you tap Save labels."; anything else (a
    Set still in progress) "This record isn't on the All sheet yet, so
    photos added here are kept for this session only." The grep found two
    more: Edit Set's footer (`#editSetSaveNote`, set in
    `showBrowseEditSetView`) now says the Set's fields are session-only but
    photos and labels save; and the Mark ready toast no longer says Copilot
    moves the row across (backlog (b), closed): it says to tap Promote, or,
    with no CoinID yet, that it waits in the Docket's Research section.
    Left as they are because they are still true: the flag-off mockup texts
    (`addCoinMockNote`, `stagingMockNote`, Edit Coin's session-only note,
    the mock toasts), Wishlist, Batch Receipt, the quick-capture note,
    Edit Set's own session-only toast.
  - **Tests changed to follow the design, not weakened**:
    `verify_addcoin_shared_photos` SH1-SH4/SH8 and AC4 (open-ended tiles on
    the editing screens are checked as half-width contain boxes; pair slots
    and the coin-page strip still checked for shape; "+" boxes are a tile
    wide and 120px tall); `verify_photo_receipt_write` V8 (the thumbnail is
    contain in its own 120px box, the viewer's box doesn't leak onto it);
    `verify_photo_label_save` L12 (a normal box opens the editor, a legacy
    one doesn't). `verify_image_chooser` RC4 passes unchanged once the dim
    covers the image border (`inset: -1px`).
  - **Negative controls** (real app.html, restored by checksum, each failing
    by name): two-column grid removed (F1b-F1f x18); "+" box back to 88px
    (F1f x18); photo cover-cropped (F1e x18); old shaped tiles in the JS
    (F1b-F1f); no ellipsis (F2a x18); tap not opening the editor (F2b x18,
    F2c-F2p); Done not firing the box's input (F2d/F2e/F2k/F2m/F2o/F2p);
    navigate leaving the editor open (F2l); Cancel applying (F2f/F2g); Done
    writing to a redrawn-away box (F2k); old footer text (F3a/F3c).
  - `npm test` on `22c407f`: 3697 passed, 0 failed, 0 page errors, 71
    suites (3518 + 179).
  - **Not verified:** any real device; how the letterboxed tiles and the
    editor feel on the S25 and tablet; the editor with the on-screen keyboard
    up.
- **Ray's tablet test of `22c407f`: F3 kept; F1 and F2 replaced** (no black
  bars anywhere, label text centred, labels edited in the full-screen viewer).
  Same branch, commit `13e931c`. Suite `tests/verify_row_tiles_viewer_label.js`
  (316), which replaces `verify_tile_width_label_editor.js` (its F3 block is
  kept unchanged). Plan answers: Q1 a photo wider than the row is scaled
  down whole; Q2 the label field sits at the top of the viewer; Q3 tiles are
  at least ~80px wide, a narrower photo centred on the tile's own
  (transparent, never black) background; Q4 the parent Set's COA follows
  the new layout on the three coin screens, Add Set step 2 keeps its copy;
  Q5 a Set's page strip gets the layout only; Q6 110px / 200px from 700px.
  - **A, same-height tiles.** Reference / COA / Other on every chooser
    screen (Edit Coin, Edit Set, Manage Photos coin/Set, Add Coin, the
    Staging-draft edit): `.gc-row-grid` sets `--gc-row-h` (110px, 200px at
    `min-width: 700px`). Each tile (`.gc-thumb.gc-row-tile`) has a photo box
    (`.gc-img.gc-img-row`) of width `calc(--gc-row-h * --gc-ar)`,
    `max-width: 100%`, `aspect-ratio: --gc-ar`, `background-size: cover` on
    a transparent background: the box IS the photo's shape, so no bars and
    nothing cropped; a photo wider than the row is scaled down to the row
    width (shorter, top still aligned). `--gc-ar` comes from a tiny hidden
    `<img class="gc-row-sizer">` (`galleryRowSizer(url)`): a capture-phase
    `load` listener and `applyRowSizerShapes(root)` (for cached files) set
    it; until then, or if the file can't be decoded, the box is a square.
    `galleryThumbInner(entry, { row: true, inside })`. The flex row wraps
    with `align-items: flex-start`, so tops line up and a tile grows
    downward for its label. Tile `min-width: 80px` with the photo centred;
    every other child takes the tile's width (`width: 0; min-width: 100%`).
    ✕, the failed-save dim and ↻ sit inside the photo box (✕ at -7px from
    its padding box = 6px past the outer corner, same as a pair slot's).
    The "+" tile is a square at `--gc-row-h`. Pair slots unchanged.
    `paintStoredThumbWhenReady` adds the sizer when a stored file arrives
    (it removes only the icon text, keeping ✕ and ↻).
  - **B, labels in the viewer.** Under each tile one centred line
    (`button.gc-label-line`, nowrap, ellipsis, `title` = whole label): the
    label, or muted "Tap to label" (`PHOTO_LABEL_EMPTY_TEXT`); a legacy
    photo reads "Replace this photo to give it a label" (italic,
    `.gc-label-legacy`). `paintPhotoLabelLine(line, entry, legacy)`. Tapping
    the photo (role=button, Enter/Space too) or the line calls
    `openGalleryPhotoInViewer(entry, { title, label: { draft, legacy, hint,
    title } })`: the in-app media viewer with `#mediaViewerLabel` (label,
    3-row textarea `#mediaViewerLabelInput`, the save hint from
    `photoLabelSaveHint(el)`, Cancel / Done) at the TOP, under the bar, so
    the keyboard can't cover it; while the field has focus the viewer also
    follows `visualViewport` (`syncMediaViewerToVisualViewport`). Done or
    Enter -> `finishMediaViewerLabel(true)` -> `applyPhotoLabelText(entry,
    text, draft)`: memory only, newline -> space, refreshes "Save labels",
    repaints the line (via `photoLabelThumbs`, now set in draft mode too,
    so a redrawn tile gets it). Cancel, Esc, ✕ and the phone's Back change
    nothing; `navigate()` calls `cancelMediaViewerLabel()`. Every save rule
    is unchanged (Save Changes / Save labels / draft Save, Back warning,
    Discard). Legacy photos: no field, footer "{type} — Replace this photo
    to give it a label". ✕ and ↻ inside the photo keep their jobs (the
    click handler ignores buttons). Removed: the inline box, `#photoLabelEditor`
    and its functions, `.gc-half-grid`, `.gc-caption-legacy`.
  - **Pair-slot photos open the viewer, VIEW ONLY** (Ray's addition): in
    chooser mode, a filled slot's `.sg-photo-face` (role=button) opens
    `openGalleryPhotoInViewer(entry, { title: label })` with no label field.
    ✕, Replace, Recrop and ↻ unchanged. Every chooser screen, draft mode
    included. `openCoinPhotoInViewer` and the new function share
    `showEntryInMediaViewer`; `openMediaViewer` hides the label panel first.
  - **Viewer close is now immediate.** `closeMediaViewer()` hides at once,
    then `history.back()`; the pop that follows is expected and ignored
    (`mediaViewerExpectPop`). Before, it waited for the pop, so a viewer
    reopened in between (Done, then a quick tap on the next photo) was
    closed by the late pop and the second Done applied nothing (found by the
    label-save suite). Phone Back still closes it (an unexpected pop).
  - **C, coin page.** `#detailPhotoStrip` (coin and Set pages) is a
    `.gc-row-strip` of `.gc-row-tile`s: same heights, tops aligned, the
    category caption (`.gc-type`, "Reference photo", "COA / certificate")
    centred under the photo and wrapping downward; the specific label is in
    the viewer (footer) only. The parent Set's COA (`renderParentCoaReadThrough`
    with `opts.row`) uses the same layout on the coin page, Edit Coin and
    Manage Photos, captioned `COA_CATEGORY_CAPTION` ("COA / certificate").
    **Add Set step 2's call passes no `row`**, so it keeps the shaped tiles
    captioned with each page's label (C4 untouched). Coin page taps stay
    view only.
  - **Left alone on purpose:** Add Set's gallery (`initGalleryCapture`: 88px
    squares, inline caption input), the Set gallery viewer panel, the "Crop
    from another photo" source tiles (88px, `galleryShapedSizer`), Wishlist
    (no gallery), and `manageOpenEndedBlock`'s non-chooser branch (no caller
    passes it any more; not deleted).
  - **Tests changed to follow the design, not weakened:**
    `verify_photo_label_save` (helpers type/blur/enter now go through the
    viewer; reads use the line's title; L12 = legacy has no field);
    `verify_image_chooser` (order and caption reads use the label line;
    SR2/R3 type "Test" through the viewer); `verify_addcoin_shared_photos`
    SH1-SH9 and AC4 (row-height tiles, + squares at the row height, the
    coin page's Obverse a square at the row height), OC2 and S3's `pickAll`
    caption (through the viewer), DK1 and CR2 (parent COA captioned
    "COA / certificate", row tile); `verify_photo_receipt_write` V8 (cover
    at the row height, measured on the open view); `verify_staging_edit_photos`
    (caption read); `verify_in_app_viewer` B4/B5 (count only what is shown;
    the label panel is hidden on the coin page).
  - **Negative controls** (real app.html, restored by checksum, each failing
    by name): black bars back (T5 x18); "+" not square (T8 x18); no width cap
    (T3/T4/T7 x72); tops not aligned (T6b x3; a first version of the suite
    passed this control because no fixture row mixed tile heights, so T6b
    adds a photo still saving); no 80px minimum (T7 x12); tap on the photo
    doing nothing (V1/V2 x36, B-block; a first version crashed instead of
    failing because B5 pressed Back with no viewer open and left the app;
    B5 now only presses Back while the viewer's entry is on top); Done not
    applying (B1-B12, G1/G2); Cancel applying (B3-B5); a legacy photo
    getting a field (B13); the field at the bottom (V2 x18); the coin page
    caption showing the label (C3/C4); captions not centred (C3 x15);
    pair-slot tap not opening the viewer (P1 x3); Add Set's gallery tiles
    changed (K1); Add Set step 2's copy following the new layout (K2); the
    old footer text (F3a/F3c).
  - `npm test` on `13e931c`: 3834 passed, 0 failed, 0 page errors, 71 suites (3697 - 179 for the retired verify_tile_width_label_editor + 316 for verify_row_tiles_viewer_label; every other suite keeps its count, its assertions rewritten, not removed).
  - **Not verified:** any real device; the field with the on-screen keyboard
    up (headless can't raise one: the test checks the field sits in the top
    half above the photo); Samsung Internet's visualViewport; how 200px
    tiles feel on the tablet; a real undecodable HEIC (falls back to a
    square by code, not seen).
- **Edit Set Save Changes toast (fix before merge, `a576e42`, Ray's tablet
  test of `dac32fe`).** A labels-only save said "Updated AY-00463 for this
  session only — not saved to OneDrive. 1 photo label saved to the
  workbook." Edit Set now keeps a copy of its field values when it opens
  (`editSetOpenedFields` from `editSetFieldValues()`, over
  `EDIT_SET_FIELD_IDS`, taken at the end of `showBrowseEditSetView`);
  `editSetFieldsChanged()` compares at Save. Only labels changed: "1 photo
  label saved to the workbook." (plus any label-failure text). A field
  changed, with or without labels: "Updated {ID} for this session only —
  not saved to OneDrive." plus the label count if any. Nothing changed:
  "No changes to save." The copy is retaken after a save (the form stays
  open when a label failed). Tests `verify_photo_label_save` L11b (labels
  only, now exact), new L11d (field + label) and L11e (field only).
  Negative controls (real app.html, restored by checksum): the old wording
  always (L11b fails); field changes never noticed (L11d, L11e fail).
  `npm test` on `a576e42`: 3836 passed, 0 failed, 0 page errors, 71 suites
  (3834 + 2).


## Unified image chooser — stages C1 + C2 (Oct 2026, merged to main 22 Oct 2026 by fast-forward to `38b0207`, built on `claude/unified-image-chooser`)
**Merged on Ray's go-ahead.** C1 (coin screens) and C2 (Set screens) and
every fix below passed Ray's tests on the S25 and tablet; tested build
`38b0207`. **NOT merged: stage C3 (Add Coin, `c386fbf`, `73d9dc6`) and its
smaller-circles follow-up (`74bf8d3`, `3101bf2`).** They were built but not
accepted, and stay on `claude/unified-image-chooser` at `3101bf2` as history
only. Ray's decision (22 Oct 2026) replaces C3: Add Coin and the
Staging-draft edit use Edit Coin's own photo section in a draft storage mode
(picks held in memory, written to Staging only on Save), built on
`claude/addcoin-shared-photos`, merged to `main` 23 Oct 2026 (Add Coin's own
📷 🖼️ 📁 buttons are gone). Add Set and Wishlist keep theirs (C4).
Supersedes the per-slot 📁 Files approach on `claude/edit-coin-files-picker-button`
(tip `e8d822a`, never merged, kept as history). Ray's call after testing it
on the S25: every image interaction works the same way. Suite:
`tests/verify_image_chooser.js` (37).
- **The rule.** An empty slot is ONE "+" box with the slot's label inside
  it. A filled slot shows the photo, its label under it, ONE "Replace" text
  button, then the icon actions (⤢ ↻ 🗑️) on their own row. "+" and Replace
  open the same chooser: 📷 Camera / 🖼️ Library / 📁 Files. No more
  📷 🖼️ 📁 rows and no 3-button add row.
- **The chooser** (`#imageSourceChooser`, `openImageSourceChooser({ onFile,
  guard, title })`, `closeImageSourceChooser()`): a bottom sheet on a phone,
  a centred card at 700px and wider, z-index 205 (above the 200 sheets,
  below the crop overlays at 210). Three SEPARATE shared inputs
  (`imageChooserCameraInput` image/* + capture=environment,
  `imageChooserLibraryInput` image/*, `imageChooserFilesInput`
  image/*,application/pdf = `FILES_PICKER_ACCEPT`, no capture): never one
  combined input, because Samsung Internet skips the native chooser. A
  source tap closes the sheet before the OS picker opens; the request rides
  on the input (`_chooserRequest`) until its change event, so cancelling the
  OS picker leaves the screen as it was. Cancel, a backdrop tap and Esc
  close it. **No Android back-gesture handling in v1** (Ray's call).
- **Behind it nothing changed**: Camera is never guarded; Library and Files
  go through `isPickableImage()` (a refusal toasts `NOT_A_PHOTO_MESSAGE`,
  calls nothing, sends no Graph request); then the same `runCropPipeline` and
  the same commit (`addGalleryEntryAndCommit` / `replaceGalleryEntryAndCommit`,
  Replace keeps PhotoID and Label).
- **Opt-in per call site while screens convert in stages**:
  `buildPhotoPairSlot({ chooser })`, `managePairBlock(..., opts)` and
  `manageOpenEndedBlock(..., opts)`. C1 passes `{ chooser: true }` only from
  the COIN branch of `renderManagePhotosInto` (Edit Coin, and Manage Photos
  for a coin). The Set branch, Add Set, Add Coin and Wishlist still draw
  their old 📷/🖼️ slots, asserted (X1).
- **Layout (measured).** Chooser-mode icon row: ⤢ ↻ 🗑️ at full size with a
  4px gap need 109px; the slot at 360px on Edit Coin is 112px, so one line
  (the wrap is only a safety net). The pre-existing overflow is gone on the
  coin screens: the old 📷 🖼️ ⤢ ↻ 🗑️ row forced each slot to 201px at 360px
  (112px available on Edit Coin, 144px on Manage Photos), pushing the pair
  past its card. Chooser buttons are 48px tall. Still present on the Set
  screens until C2.
- **C1 follow-up (Ray's S25 feedback on `9ff07b5`), coin screens only.**
  Pair slots: the 🗑️ is gone; delete is a ✕ in the photo's top-right
  corner (`.sg-photo-face > .sg-photo-remove`, same 20px circle and -6px
  offset as a Reference thumb's `.gc-remove`), same `data-act="remove"`
  handler, so the same `confirmRemoveGalleryPhoto` dialog and the same
  row-detach (file never deleted). The ⤢ icon is now a "Recrop" pill
  (`.sg-photo-replace-btn.sg-photo-recrop-btn`, `data-act="adjust"`)
  directly under Replace; it shows only where ⤢ did (flip sources
  obverse/reverse with a photo). ↻ (retry a failed upload) is the only
  icon left in `.sg-photo-actions`, shown only after a failed save.
  *(Superseded: ↻ is now centred on the photo; see "↻ centred on a failed
  photo" below.)*
  Reference/Other thumbs: photo, then label box, then Replace. The
  chooser grid is `align-items: flex-start`, so the 88px + box matches
  and top-aligns with the 88px thumbnail (a stretched button centred its
  box lower). Reference/Other have no recrop action (none added). Suite
  37 -> 50 (U7-U10, L6-L8; U1/L1 changed); `npm test` 3091/0/0/69 on the
  branch. Negative controls: 🗑️ reinstated (U1/U7/L1/L6), + box 96px
  (L8), grid stretch (L8), label under Replace (U9).
- **Replace live-list fix (S25 on `92a1152`; the bug was on `main` too).**
  After a Replace on a Reference/Other/COA photo the live list showed the
  new photo AND the old one again at the end (blank label) until a restart.
  The saved result was always right: the row is updated in place (same
  PhotoID, new `_NN` file, the typed Label carried over), exactly two
  uploads, the old file left in `_Testing/CoinPhotos` by design (Replace
  never deletes). Cause: `replaceGalleryEntryAndCommit()` drops the old
  entry and re-renders at once; the new entry carries the old PhotoID but
  no `storedFilename` yet, while `LIVE_PHOTOS` still names the old file
  until the write settles, so `hydrateStoredPhotos()` re-added the old file
  as a stored entry and nothing ever removed it. Fix: hydration treats a
  row as already shown when any entry carries its PhotoID. Front/Back were
  never affected (their hydration matches by type). Same on `main` with the
  old 🖼️ Replace (reproduced on `9028d1e`). Tests: R1b, R2b, R3/R4 for Edit
  Coin and Manage Photos (suite 50 -> 56). Negative control: removing the
  PhotoID check fails R1b, R4-edit, R4-manage. Not changed: a label typed
  in the box is only held in memory and is written only by the next
  capture/Replace of that photo (pre-existing, flagged). *(Superseded: labels
  save with Save Changes / "Save labels", see "Photo labels save with Save
  Changes"; Replace now writes the saved label, never the typed one.)*
- **Stage C2 (built on `6eb34d7`, Ray's go-ahead after his S25 pass): the
  Set branch of `renderManagePhotosInto`** (Edit Set and Manage Photos for a
  Set) passes `setPickOpts = { chooser: true }` to OGP, Whole set, each
  Sub-group pair, COA and Other. Same layout as the coin screens: empty slot
  = one "+" box with its label inside; filled pair slot = ✕ in the photo's
  corner (same `confirmRemoveGalleryPhoto` and row-detach), Replace, ↻ only
  after a failed save; COA/Other thumbs = photo, label box, Replace, ✕; the
  "+" tile matches the thumbnail and top-aligns. **No Recrop on any Set
  screen**: ⤢ never showed there (Set types don't `retainRaw`), so none is
  added. Guard, crop, commit and Replace rules unchanged; the b2c7ec2
  hydrate PhotoID clause is generic per CollectionID, so it already covers
  Sets (asserted, SR3). Edit Set's receipt pill is not part of this render
  and is untouched (V5).
  - **Old 360px overflow, measured** (Edit Set, OGP pair with a failed
    front): before C2 the front slot was forced to 164px by its 📷 🖼️ ↻ 🗑️
    row and the empty Back slot (81px) ran 6px past its card; after C2 both
    slots are 112px and inside the card (the whole-set pair was 124/100
    before). Manage Photos for a Set: OGP pair 164/124 before, 144/144 after. 412: 138/138 (Edit Set), 170/170
    (Manage). 1024: 444/444, 476/476.
  - **Replace keeps the photo in place (fixed before merge, Ray's Q2).**
    Replace on a repeatable photo (Reference, Other, COA) used to move it to
    the end of the live list until a restart, because
    `replaceGalleryEntryAndCommit` spliced it out and re-appended it
    (`addGalleryEntry` pushes repeatable types). Now the new entry takes the
    old one's index (`list[at] = newEntry`) and is committed through
    `addGalleryEntryAndCommit(..., { alreadyPlaced: true })`, which skips the
    add but keeps the same upload, row write, toast and failure handling.
    Coin and Set screens alike; nothing written changes (the row was always
    updated in place). Tests: R5-edit/R5-manage (coin, Replace the first
    Reference) and SR4-edit/SR4-manage (Set, Replace the first COA) assert
    the photo stays first; SR3 now checks the order instead of recording the
    move. Suite 116 -> 120; `npm test` 3161/0/0/69. Negative control
    (splice-and-re-add reinstated on the real app.html, restored by
    checksum): exactly R5-edit, R5-manage, SR4-edit, SR4-manage fail.
  - **Remove waits for an in-flight save (S25 on `7f83aad`; `main`
    `9028d1e` has it too, confirmed headless on its open-ended lists).**
    Ray added a COA/Other photo through "+", ✕'d it and confirmed: the row
    was blanked but the thumbnail stayed until a restart. Cause: the ✕ shows
    while a just-added photo still says "Saving…". Detaching then raced the
    add's own write — the detach blanked the row, then the add finished: its
    DateAdded PATCH landed on the blanked row (leaving a stray date on an
    otherwise-blank row, never claimable again), `syncStoredPhotoIndexUpsert`
    put the row back in `LIVE_PHOTOS`, and its re-render hydrated the photo
    straight back. NOT the b2c7ec2 PhotoID path (that is Replace); same
    family, the session index disagreeing with the sheet. Fix:
    `addGalleryEntryAndCommit` / `addGalleryEntryAndCommitExisting` keep
    `entry.commitPromise`; `detachGalleryPhoto` waits on it while
    `uploadPending`, then runs the unchanged detach
    (`detachGalleryPhotoNow`), with a "Finishing the save first, then
    removing…" toast. A failed save wrote no row, so the detach finds none
    and says so, as before. A remove still blanks the whole row (every
    column, DateAdded included) and never deletes the file. Tests RM1-RM5 x
    Edit Coin, Manage Photos coin, Edit Set, Manage Photos set (suite 120 ->
    140): open-ended ✕ while saving, after saving, and on a stored photo;
    pair ✕ while saving and on a stored Front; rendered photos and order
    equal the saved rows each time. Negative control (the wait removed on
    the real app.html, restored by checksum): RM1 and RM4 fail on all four
    screens by name, RM2/RM3 follow (the leftover stays in the list).
    Not verified: a real device.
  - **A never-saved photo is removed locally (Ray's Q1 on `1b54b21`).** If
    a photo's save failed (upload or row write; no Photos row exists, no
    retry has landed), the ✕ removes it from the screen with NO write: no
    upload, no row, no delete. Same "Remove photo?" confirmation; toast
    "Removed. This photo was never saved, so nothing was written." Test:
    `galleryEntryNeverSaved(entry)` (uploadError set, not pending, not
    `stored`, no `storedFilename`), checked in `detachGalleryPhotoNow` AFTER
    the 1b54b21 wait, so a save that lands still gets the normal detach.
    Before this, the ✕ hit "No Photos row was found for this one — nothing
    to remove." and the photo stayed. All four screens, open-ended lists and
    pair slots; a pair slot shows "+" again. Edge, accepted: a FAILED Replace
    of a saved photo, removed with ✕, drops only the new capture; the old
    saved photo comes back (it is still the saved row). Edge, not handled:
    a row write that partly landed before failing is treated as never saved.
    Tests UNS1-UNS4 x the four screens (suite 140 -> 156): failed save + ✕
    (gone, zero Graph calls during the remove, live list = saved rows) for
    both list kinds, and ↻ still saving a failed photo when ✕ isn't used.
    Negative control (the never-saved branch removed on the real app.html,
    restored by checksum): exactly UNS1 and UNS2 fail on all four screens.
    Not verified: a real device.
  - **↻ centred on a failed photo (Ray's tablet test of `ce5b6be`).** The
    open-ended thumb's ↻ was a 20px circle at the photo's top-left, right
    beside the neighbouring photo's ✕. Now, on a photo whose save failed,
    a light dim (`.gc-failed-dim` / `.sg-photo-failed-dim`, rgba black 0.4,
    `pointer-events: none`) covers the image and ↻ sits centred on it as a
    48px circle (`.gc-retry`, centred on the 88px `.gc-img`; on chooser-mode
    pair slots `.sg-photo-retry`, centred inside `.sg-photo-face`, no longer
    in a row under the buttons). Same `data-act="retry"` / `.gc-retry`
    selectors, same `retryGalleryPhotoCommit` handler. Unchanged: the
    "Not saved — tap ↻" text, the ✕ in its corner, Replace, the label box,
    and the legacy (non-chooser) slots on Add Coin / Add Set / Wishlist.
    All four screens. Tests RC1-RC4 x 4 screens x 360x800/412x915/1024x768
    (centred within 2px on both axes, 44px+, no overlap with any ✕, the
    element under the image centre, dim covers the image, text/✕/Replace
    kept) and RC5 x 4 screens (a real failed save retried by tapping the
    image centre saves the row). Suite 156 -> 208. L1/L1-set now count ↻
    wherever it is in the slot, not only in `.sg-photo-actions`. Negative
    control (↻ put back in the corner on the real app.html, restored by
    checksum): 49 fail by name (RC1/RC2/RC3 x 12, RC5 x 4, L1 x 3, L1-set
    x 6). Not verified: a real device.
  - Tests: `verify_image_chooser.js` 56 -> 116 (X1 rewritten: only Add Coin,
    Add Set and Wishlist keep old buttons; V1-V5 x2 surfaces; SC1, SJ1;
    SR1-SR3 x2 surfaces; SG1; L1-L8-set at 360x800, 412x915, 1024x768 on both
    surfaces). `npm test` 3157/0/0/69 on the branch. Negative controls on the
    real app.html, restored by checksum: C2 reverted (48 fail by name), the
    hydrate PhotoID clause removed (SR3 x2 + R1b/R4 x2), Replace not carrying
    the PhotoID (SR2/SR3 x2 + R1/R1b/R3/R4).
  - Not verified: any real device for the Set screens.
- **Planned stages**: Add Coin now follows Ray's 22 Oct decision (Edit
  Coin's photo section in draft mode, `claude/addcoin-shared-photos`), not
  the C3 described in the original plan; C4 Add Set and Wishlist; C5
  receipts only with Ray's go-ahead (needs a PDF-allowed, unguarded call).
  `stage.html` is out of scope; its 8 inputs stay pinned. Add Coin's own 📁
  code was removed when the Add Coin branch merged (23 Oct 2026).
- **Tests changed**: `verify_files_picker` B3 (37 -> 40 inputs), new B4 (the
  chooser's three inputs), C1 (21 -> 22 camera inputs), A9 (the chooser's
  one Files input excepted). `verify_photo_receipt_write` P4/P5/P9/P10 and
  the U-block legacy slot read the single Replace button instead of
  📷/🖼️; U13's empty-slot selector is now `.sg-photo-add`.
- **Negative controls** (real app.html, restored by checksum, each failing by
  name): guard removed (G1-G3, G5), Replace adding instead of replacing
  (R1), Cancel leaving the request live (C2), chooser at z-index 210 (S3),
  slab keeping its old row (U5, U6, J, K1), Camera guarded (K1), icon gap
  back to 6px (L1 at 360), C1 reverted (22 fail).
- **Not verified**: which picker each input opens on the S25 (Chrome and
  Samsung Internet), OneDrive listed under Files, `input.click()` from a
  sheet button counting as a user gesture on Samsung Internet, a real HEIC,
  a real upload to `_Testing` from a chooser pick, the bottom sheet's feel.


## Editing a Staging draft: photos, receipt and research note (Phase B) (Oct 2026, merged to main at `44b7a3d`, built on `claude/staging-edit-photos-phase-b`)
Merged to `main` (fast-forward to `44b7a3d`; last code commit `b2abb18`). TEST-verified by Ray on his tablet against `_Testing`. Suite: `tests/verify_staging_edit_photos.js` (45).
- **Live report (AY-00754):** photos picked while editing a Staging draft
  (Staging Review → Edit → `beginCoinDraftEdit`) were cropped and then
  dropped. `saveCoinDraftEdit()` never uploaded anything and kept the stored
  `photos`/`receiptPhoto`; `resetAddCoinAfterSave()` → `resetAddCoinForm()`
  then deleted the gallery (`galleryStore[ADDCOIN_GALLERY_ID]`) and
  `receiptFiles`. Not a 📁 Files bug.
- **Gate (`coinDraftEditRefusal`)**: no Staging edit when the draft is
  PROMOTED, `allRowWritten` or `filesMovedOnPromotion` (checked on open and
  again on save).
- **Opening an edit (`loadStagingEditFiles`)** puts coin.json's photos back
  into Add Coin's own slots/gallery as entries marked `stagingStored`, with
  `stagingFiles` (the crop and, for obverse/reverse, its `_original`), fetched
  from `Staging/{ID}/` via `getFileBytes`. `stagingPhotoGroups` pairs a crop
  with its original and also reads older bare-string photo lists
  (`stagingPhotoTypeFromFilename`); a name it doesn't know is never loaded and
  never touched. Obverse/reverse show the photo, say Replace in their titles
  (`setFlipSlotReplaceLabels` *(removed 23 Oct 2026, commit 6 `c6f0ba0`)*; the shared photo section now shows
  Replace) and Adjust from the original (`slotFiles`). The
  stored receipt shows as "{name} (in Staging)". Gallery thumbs say
  "In Staging".
- **Save (`saveCoinDraftEdit`) — upload first, then record**:
  `uploadStagingEditFiles` uploads every new/replaced entry and a new receipt
  to `Staging/{ID}/`; only if ALL landed does it re-read coin.json, merge
  (`mergeStagingEditFiles`) and write it ONCE; then
  `finishStagingEditFiles` deletes files no longer listed. Merged entries use
  the first save's `{type, filename, caption}` shape, so promotion
  (`plannedCoinPromotionMoves`, `recordPromotedCoinRecords`) needed no change.
- **Names**: single types (obverse, reverse, slab front/back) and the receipt
  (`{ID}_receipt.pdf`) overwrite their own file on Replace, the `_original`
  pair together. Repeatable types (reference, other, COA) use
  `nextFreeStagingRepeatableFilename`: one past the highest number in coin.json,
  the folder (`listChildren`) and this save, checked free with `getItemMeta`;
  never an existing `_NN`. (`nextFreeRepeatableFilename` was not reused: it
  checks CoinPhotos and Photos rows, not a Staging folder.)
- **Failed upload**: nothing is recorded, the photo (Blob) and every typed
  field stay, the form is not reset or left; "Not saved — tap ↻" on the thumb
  or slot plus a toast. The retry is the same save; a file that did land
  keeps its name (`stagingNames`/`stagingUploaded`) and isn't re-sent.
- **Remove (B2)**: ✕ on a stored thumb, and new `obverseRemoveBtn`,
  `reverseRemoveBtn` (both *(removed 23 Oct 2026, commit 6 `c6f0ba0`)*; photos now use the shared
  section's ✕), `receiptRemoveBtn` (shown only while editing a Staging
  draft), confirm first (`confirmStagingRemove`). The removal is staged;
  Save writes coin.json without it FIRST, then `graph().deleteItem`. A crop
  takes its `_original` with it; a photo replaced under a different name has
  its old file deleted the same way. A failed delete leaves a harmless orphan
  and a correct coin.json, and the toast says so.
- **Research note (5b)**: `buildCoinDraft` now stores `pcgsLabelRaw` and the
  edit form restores it (older drafts read it from the note,
  `draftPcgsLabelRaw`). `mergeEditResearchNote` keeps the first save's
  "Some captured files failed to upload" line and, when the CoinID is
  unchanged, the "CoinID X chosen from N" line and `matchedHow` (an edit used
  to turn a single match into "picked from 1").
- **Assign to Album (5c, test first, the problem was real)**: a saved slot
  missing from the list (albums not loaded, or the list rebuilt mid-edit) was
  written back blank. `applyCoinDraftToForm` uses
  `setSelectValuePreservingUnknown`; `populateAssignAlbumOptions` keeps the
  current choice across a rebuild (this also fixes the backlog item "Add
  Coin's Assign to Album selection resets when Albums arrive late");
  `resetAddCoinForm` drops kept (injected) options.
- **Left alone on purpose**: the fresh-capture path (`uploadCoinDraftPhotos`,
  `uploadCoinDraftReceipt`), Browse Edit, Manage Photos, receipts elsewhere,
  promotion. The new UI states in `initGalleryCapture` are opt-in
  (`opts.uploadStates`, Add Coin only).
- **One existing assertion changed**: `verify_staging_edit` block C. Its
  fixture (`allRowWritten` + `filesMovedOnPromotion`) is now refused by the
  gate, so C4 runs on an allowed Ready draft and new C5 asserts the refusal.
  B3 and its bare-string fixture are unchanged.
- **Negative controls** (run against the real app.html, restored by
  checksum, each failing by name): restore the drop (18 fail), session-only
  numbering (P15b), delete before coin.json (Q4), coin.json before upload (P16).
- **Not verified**: any real device, real OneDrive (bytes really fetched from
  and deleted in a Staging folder), Samsung Internet. Ray runs a TEST round
  against `_Testing`.


## Receipt PDFs: pdf.js on demand (Oct 2026)
Built on `claude/in-app-pdf-viewer-options`, held for Ray's go-ahead.
- **What:** a receipt PDF the app did not make (a seller's invoice printed
  from a website, often multi-page) now renders inside the receipt viewer
  with pdf.js, instead of "This PDF can't be displayed inside the app".
  Image receipts and app-made PDFs keep their existing paths (app-made PDFs
  stay on the fast `unwrapAppMadePdf()` path and never load pdf.js).
- **Library:** vendored, not a CDN: `vendor/pdfjs/`, pdf.js **6.3.289 legacy
  build**, Apache-2.0, with cmaps, standard fonts, wasm decoders and ICC data
  (about 5.8 MB in the repo; about 540 KB compressed is downloaded the first
  time a PDF opens in a session, plus any font/cmap that PDF needs). Pin,
  hashes and upgrade steps: `vendor/pdfjs/VERSION.md`. The scripting sandbox
  (`pdf.sandbox`) and the web viewer are deliberately not vendored.
- **Loading:** `loadPdfjs()` (dynamic `import()`), never at startup. Early
  start (`primePdfjs()`) when a coin page shows a receipt row that is a PDF
  not named like an app-made one (`{CollectionID}_receipt.pdf`); a picked PDF
  filed under that name simply loads on open instead. A failed load is never
  cached. From `file://` it is skipped (Chromium blocks module scripts
  there) and the viewer falls back.
- **Viewer:** one scrolling column, fit to width; pages within about a
  screen of the view are drawn, further ones released; DPR capped at 2 and
  each page canvas at 4 MP. + / − zoom (100–300%) plus pinch; "Page N of M"
  follows the scroll; Prev / Next disable at the ends; a one-page PDF shows
  neither. Plain canvases, no annotation layer (links not clickable),
  `enableXfa:false`, `isEvalSupported:false` (pdf.js 6.x has no eval path at
  all; the flag is a guard for future upgrades). The document is destroyed
  on close. Any load/render failure → the old "can't be displayed" message
  with Open file; "Open in OneDrive" stays in the footer.
- **Tests:** `tests/verify_pdf_receipt_viewer.js` is the only SERVED-mode
  suite (a local http server over the repo), because the harness's
  `file://` page can't run pdf.js. Fixtures: `tests/fixtures/receipt-3page.pdf`,
  `receipt-1page.pdf`. Note that every other suite still runs from
  `file://`, so there the viewer's external-PDF path shows the fallback.

- **In-app image viewer (Oct 2026) is the app's only use of browser history:** opening it pushes one same-URL entry so the phone's back button closes it, and Close/Escape remove that entry with `history.back()`; back-gesture behaviour on the tablet is unverified. *(Since `13e931c`, on main 24 Oct 2026: Close hides at once and the pop that follows is ignored, `mediaViewerExpectPop`; the viewer also carries the photo-label field for the edit screens.)*


### Photo Gallery, two-stage crop pipeline & Manage Photos (BUILT and merged to main on Ray's real-device sign-off; built on `claude/photo-gallery-crop`, whose tip is not an ancestor of `main` — landed via rebase; the code is on `main`)
A general per-record **photo gallery** replacing the old rigid "obverse/
reverse/additional" fixed slots, a **two-stage crop pipeline** (rectangular
background crop → derived circle crop), a **sub-group photo tier** for Sets,
and a dedicated **Manage Photos** screen for add/replace on any record at any
status. Architectural/cross-cutting, so per the merge policy it's **held on
its branch pending Ray's explicit go-ahead** — reviewed as one whole, not
piecemeal, even though it landed as several commits.
- **Scope is still mockup** — like every other coin-side Save, nothing here
  writes OneDrive. Captured photos live as in-browser blob URLs in
  `galleryStore` for the session (gone on reload); the naming/storage
  convention is documented for the future write layer, exactly as the
  crop-commit naming already is. The two crop TOOLS are real and work
  in-browser. The one exception is Add Set's own already-gated
  (`ENABLE_SET_WRITE_LAYER`) whole-set/receipt path — see the OGP coupling
  note below, which was deliberately preserved rather than broken.

#### Data model
- **One flat typed array per coin/Set**: `gallery: [{ type, url, rawUrl?,
  circleUrl?, caption, subGroupId?, filename, rawFilename? }]`, no fixed
  slots. `GALLERY_TYPES` is the controlled vocabulary; each type carries
  `suffix` / `flipSource` / `retainRaw` / `aspect` / `repeatable` / `tier` /
  `scope`. Accessors: `galleryFor(id)` (lazily deep-clones the
  `FAKE_GALLERIES` sparse seed so capture/remove never mutate the seed),
  `addGalleryEntry` (single-instance types replace in place; only
  `repeatable` types accumulate), `removeGalleryEntry`,
  `galleryEntriesForSubGroup`, `removeSubGroupPhotos`.
- **Revised taxonomy (supersedes the first build's type list):**
  - `obverse` / `reverse` — the coin's own flip sources. Square-locked,
    `retainRaw: true`, `scope: "coin"`. The only types that run Stage 2.
  - `slab_obverse` / `slab_reverse` — a **true front/back pair**, not the
    earlier single `slab_combined`. Free aspect, no raw retention.
  - `ogp_obverse` / `ogp_reverse` — packaging. **The earlier separate "OGP"
    and "whole-set" types were merged into this one pair**; valid on coin
    rows as well as Sets (`scope: "both"`), since a Mint-boxed single coin
    has packaging too.
  - `coa` — open-ended (`repeatable`), each entry carrying its own free-text
    `caption` label, so a multi-page certificate is N entries, not a fixed
    two.
  - `reference` — open-ended, coin-scoped. New this round: a reference/
    comparison shot (an auction listing photo, a Red Book page, a
    look-alike) kept alongside the coin without pretending to be the coin.
  - `subgroup_obverse` / `subgroup_reverse` — the new **sub-group tier**
    (`tier: "subgroup"`), a front/back pair per sub-group of a Set.
  - `other` — open-ended catch-all (the retired fixed "Additional Photo"
    slot's role).
- **Sub-group tier, and the implicit default.** A Set captured with named
  sub-groups (e.g. Philadelphia / Denver) gets one obverse/reverse pair per
  sub-group. A **flat Set with no sub-groups still gets exactly one pair**,
  stored against a `DEFAULT_SUBGROUP_ID` sentinel — that's what the UI shows
  as the plain "Whole set — front & back" block. Filenames namespace only a
  *named* sub-group (`{id}_{sg}_obverse.png`); the implicit default adds no
  namespace (`{id}_obverse.png`), so a flat Set's whole-set photo keeps the
  filename it always had.
  - **The whole-set pair and sub-groups are two independent optional
    things, not alternatives.** An early version of this tier hid the
    whole-set pair once any sub-group existed — that was wrong (Ray's
    correction from a live tablet test) and is fixed: a Set can have both.
  - **Sub-group IDs are stable (`data-sg-id`)**, generated once and never
    derived from the sub-group's name or index, so renaming or reordering
    sub-groups never re-points existing photos.
  - **Deleting a sub-group removes ONLY that sub-group's own obverse/
    reverse pair** — never Set-level photos (OGP/COA/other), and
    **structurally cannot cascade to the photos of coins captured under
    it**: a child coin's photos live in its own gallery keyed by the
    child's CollectionID, not in the parent Set's array `removeSubGroupPhotos()`
    touches. Explicitly required by Ray, explicitly asserted in the suite.
- **No filename collision between tiers.** A coin's flip sources are
  `scope: "coin"`, so a Set row can never produce `{id}_obverse_cropped.png`
  from a coin flip AND `{id}_obverse.png` from its default sub-group pair
  meaning two different things — the coin flip always carries the
  `_cropped`/`_original` suffix, the sub-group pair never does.

#### Crop pipeline
- **Stage 1 background crop (`openBgCrop`/`initBgCrop`)** — hand-rolled
  canvas + pointer events (no library, per the no-CDN posture). Draggable/
  resizable crop box (8 handles; edge handles hidden when square-locked),
  aspect-lock toggle (square default for flip sources, free for everything
  else), EXIF-oriented first via the existing `loadOrientedImageCanvas`,
  bakes the selected region to a blob via an `onComplete` callback.
- **Rotation in Stage 1 (added after a live tablet test found it missing).**
  Two 90° quick-rotate buttons (`#bgCropRotateLeftBtn`/`#bgCropRotateRightBtn`)
  plus a ±45° `#bgCropStraighten` slider, mirroring the circle adjuster's
  own controls. **Implemented by re-baking the source into a new upright
  canvas (`bakeRotatedWorkCanvas`), not by CSS-transforming the preview** —
  a transform would leave the crop box's math fighting a rotated coordinate
  space; re-baking keeps the box axis-aligned and the crop arithmetic
  unchanged. `refreshBgCropSource()` rebuilds the work canvas, stage size,
  and box on every rotation change.
  - **The final crop reads `bgCropState.workCanvas`, never the `<img>`.**
    A latent race was found and fixed here: the preview `<img>`'s `src` is
    set asynchronously from a data URL, so cropping immediately after a
    rotation could read a blank or stale image.
- **Stage 2 circle** reuses the EXISTING `openPhotoAdjust` circle adjuster,
  generalized to a callback mode (`openPhotoAdjust(source, { onComplete })`)
  alongside its legacy positional-target-ID mode — the legacy Add Coin/
  Browse Edit slot writes are unchanged. The circle is **re-derived at
  display time**, never a stored asset; `runCropPipeline(file, type,
  collectionId, onEntry, subGroupId)` chains raw → Stage 1 → (flip sources
  only) Stage 2, producing the gallery entry.
  **PARTLY SUPERSEDED — "never a stored asset" caused a real bug.** The
  circle is still re-derived at display time by masking a square, but the
  square STORED for a flip source is now Stage 2's own output, not Stage 1's.
  Storing the Stage-1 rectangle threw the user's circle framing away — see
  "Circle framing: what you frame is now what the card shows" below.
- **Overlay stacking.** `#bgCropOverlay` and `#photoAdjustOverlay` sit at
  `z-index: 210`, above the sub-group/type sheets at `200`. Both were `200`
  originally and the sheet, being later in the DOM, covered the crop tool
  and swallowed its clicks — it read as "the app froze." Caught here before
  it reached a device; keep any future sheet below 210.

#### Capture UI
- **`buildPhotoPairSlot(opts)` is the one shared pair-slot renderer** (face,
  label, 📷 / 🖼️ / 🗑️ actions) used by OGP, whole-set/sub-group, and slab
  blocks. It exists because the same defect — a single file input with no
  camera route — was found independently in three places. **Samsung
  Internet skips the native chooser dialog**, so every capture surface needs
  a real paired 📷 Camera (`capture="environment"`) and 🖼️ Library input,
  not one combined button. `initGalleryCapture`'s own widget had the same
  defect and was fixed the same way.
- **Progressive disclosure, mobile-first: nothing defaults expanded.** Every
  photo group is a collapsed accordion; per-row chips open a focused sheet
  rather than expanding inline. This applies to Add Coin, Add Set Step 1 and
  Step 2, and Manage Photos alike.
- **Add Set Step 2 (per-coin card)** gained the coin's slab pair and
  reference photos as their own collapsed accordions, so a slabbed child is
  captured fully without leaving the set-capture flow.
- **A child coin reads through to its parent Set's COA**
  (`renderParentCoaReadThrough(hostEl, parentId, parentName)`) — resolved
  **live** from the parent's gallery at render time; nothing is copied onto
  the child. Because the link is `originSetId`, it keeps working after
  promotion, which was the explicit requirement.

#### Manage Photos screen
A dedicated `view-managephotos` for adding/replacing photos on **any record
at any status** — the original capture flows are no longer the only way in.
`openManagePhotos(ctx)` / `renderManagePhotos()`, with `ctx = { id, name,
meta, kind:"coin"|"set", draft?, backTo, parentSetId?, parentSetName?,
originSetId? }`.
- **Coin records**: obverse & reverse, slab pair, reference photos, other,
  plus the parent-Set COA read-through when the coin is a Set child.
- **Set records**: OGP pair, whole-set pair, sub-group pairs, COA, other,
  and a **"Coins in this Set"** list that drills into each child's own
  Manage Photos screen and back.
- **Sections are collapsed accordions and open sections survive a
  re-render** (adding or removing a photo re-renders; the section you were
  working in stays open).
- **Three entry points**: (1) a "📷 Manage photos" button on Browse detail —
  **for both coins and Sets**; (2) a per-row 📷 Photos button on In Progress
  Sets, passing the draft; (3) Docket photo-gap rows, which now route here
  instead of to Edit Coin / a Step 1 resume. **The Docket tracks gap kind by
  construction** (four distinct row-building sites, no shared branch), so
  this routing carries no mis-route risk for future non-photo gap types —
  confirmed by reading the code, not assumed.
- **`activateViewOnly(viewId)`** was added for the Back path: the Browse-
  detail entry's `backTo` originally called `showBrowseDetail(coin)` alone,
  which only re-renders inside `#view-browse` and never changes the active
  view — Back left the user stranded on Manage Photos. Using
  `navigate("browse")` would have worked but would also fire
  `resetBrowseFilters()`, silently clearing the user's filters.
  `activateViewOnly()` swaps the active view without navigate()'s
  section-level side effects. **Use it for any future screen opened on top
  of a sub-view the user was already inside.**

#### Add Set: purchase info + storage
Add Set Step 1 gained the fields Add Coin already had — Cost
(`#addSetCost`), Shipping (`#addSetShippingCost`), Seller/Vendor
(`#addSetVendor`), Purchase Date (`#addSetPurchaseDate`), Storage Location
(`#addSetStorageLocation`), Container (`#addSetContainer`) — using **Edit
Set's existing field set and labels** rather than inventing new ones, so the
two Set forms agree. Same drill-down pattern as Add Coin (a Purchase Info
row opening `#addSetPurchaseView`, not an inline accordion).
- **Receipt capture lives inside the Purchase Info drill-down**, matching
  Add Coin — it was briefly placed in the Set photos/documents accordion and
  was **moved, not duplicated**, on Ray's call. Add Coin's placeholder-icon
  markup was deliberately NOT copied across: `wireAddSetPhotoSlot` passes a
  `null` placeholderId, so the icon would have been stuck permanently
  visible.
- **The real (gated) write path was preserved when the legacy whole-set slot
  was retired**: capturing OGP front mirrors its blob into
  `addSetPhotoFiles["whole"]`, so `draft.wholeSetPhoto`, the Staging upload,
  `plannedPromotionMoves()`, and the Docket's whole-set gap check all keep
  working unchanged. Ray explicitly confirmed OGP-front is the right
  semantic match for the old whole-set photo.

#### Known legacy data, NOT fixed here (separate future cleanup)
Both flagged by Ray, both deliberately out of scope for this feature:
- **Some existing coins' `Obverse`/`Reverse` columns already hold slab
  photos**, not raw coin photos — confirmed by inspecting the real
  CoinPhotos folder. A pre-existing data overload, not something this build
  touches. Those files should be renamed/re-pointed into the new
  `slab_obverse`/`slab_reverse` types in a future database cleanup pass.
- **Five real coins carry a `{CollectionID}_combined.jpg` in the Photo3
  column.** The first version of this feature deliberately named its type's
  suffix `_combined` to match them; the revised taxonomy replaced that with
  a true `slab_obverse`/`slab_reverse` pair, so those five files are now
  unmapped and want the same cleanup pass — split into a front/back pair, or
  re-filed as `other`.

#### Verification
Verified headless (Playwright, `verify_gallery_full.js`) — **92 assertions,
all passing, across two device contexts** (412×915 touch phone, 1024×768
touch tablet), zero page/console errors:
- Taxonomy and schema: slab as a true pair, no `slab_combined`, OGP merged,
  sub-group tier present, flip sources exactly obverse/reverse, raw retained
  only for flip sources, COA/reference/other open-ended, aspect locks.
- Filename derivation: `_cropped`/`_original` for flip sources, open-ended
  types indexing from 1, named sub-group namespacing, implicit default
  adding none, and no coin-flip/sub-group collision.
- Gallery accessors: empty start, single-instance replace, open-ended
  accumulate, remove-one, and `FAKE_GALLERIES` seed never mutated.
- **Sub-group delete scope**: removes only its own pair, leaves Set-level
  photos intact, never touches a child coin's gallery.
- End-to-end capture with a real non-square PNG upload: Stage 1 opens, has
  both quick-rotate buttons and the straighten slider, and sits at z-index
  ≥ 210.
- Add Set purchase/storage fields all present; all Add Set accordions
  collapsed by default.
- Manage Photos from all three entry points, for coins and Sets; sections
  open collapsed; camera+library present in the COA block; Back returns to
  Browse (the bug above) and to the Docket.
- Parent-COA read-through visible on a child with nothing copied onto it.
- Nav regression smoke across all 14 top-level routes; no page-level
  horizontal overflow.
Phone and tablet screenshots reviewed for both a coin and a Set record.
- **Ray also confirmed on a real tablet**: crop-box drag, resize handles
  (including coin-photo square-lock), rotation, and the straighten slider.
- **Not verified**: Samsung Internet specifically (only this environment's
  Chromium and Ray's tablet); any real OneDrive write (mockup — none
  exists). **Note the recurring lesson from the cabinet-nav passes**: this
  environment is weakest at catching real-device spacing/rendering issues,
  so a final phone pass on Ray's S25 is worth doing before merge.
- **Prior committed regression suites could not be re-run** — the project's
  `verify_*.js` scripts live in per-session scratchpads by convention and
  none survived into this session. The nav smoke check above is a
  substitute, not an equivalent; if a full regression matters before merge,
  those suites need rebuilding.
- **Merged to main on Ray's real-device sign-off** — both a tablet and a
  Samsung Internet phone pass came back clean, including the crop pipeline
  itself: a photo cropped through Stage 1/Stage 2 updates the slot/thumbnail
  immediately in-session. (Not seeing it again after leaving/reloading is
  the expected mockup limitation until the write layer exists — not a bug.)
  Ray explicitly accepted the 92-assertion suite above as sufficient
  coverage for this merge rather than holding for the fuller rebuild below.

**Tracked follow-up (not started): rebuild the fuller regression suite.**
Sized as its own task, not a quick pass — real gaps beyond what
`verify_gallery_full.js` covers today, some needing substantive rewriting
(not just re-running) since the taxonomy changed underneath them
(`slab_combined` → a true pair, OGP merge):
- The crop pipeline actually completing end-to-end — today's suite opens
  Stage 1 and checks its controls exist, but doesn't drive a capture all the
  way through Stage 2 to a finished entry with `url`/`rawUrl`/`circleUrl`
  and a live slot-preview update.
- The "View all photos (N)" viewer button + viewer overlay on coin detail.
- The Set detail thumbnail strip rendering real thumbs.
- The scope-filtered picker (coin scope = 5 types, excluding flip sources +
  whole-set).
- The capture widget wired into every flow it touches (Add Coin, Browse
  Edit), not just Add Set.
- Sub-group add/rename/reorder in the Add Set UI, confirming stable IDs
  survive a rename.
- Bug 1/Bug 2's original specific repros (Pause/resume photo persistence,
  the rotation race) — verified when built, but the repro scripts
  themselves didn't survive into later sessions.
Rough sizing given when asked: on the order of 60–100 additional
assertions, roughly half-day-to-day scale, not mechanical re-scaffolding.


### Photo touchpoint consolidation (BUILT and merged to main)
**Merged following Ray's real-device sign-off** — both rounds (Obverse/
Reverse capture, Stage 1/2 crop, rotate/straighten, the Adjust button; then
separately the Receipt-as-Photos-pill fold-in) confirmed working on Ray's
own hardware, same real-device-verification bar the photo-gallery-crop
branch was held to before its own merge. `claude/browse-detail-photo-
consolidation` has no commits of its own that aren't now in main's
history — main is the source of truth for this feature going forward, same
standing note as every other merged-after-holding branch in this file.

Browse detail (both Coin and Set) used to scatter photo access across four
places — a "View all photos (N)" pill / gallery strip above the flip card, a
standalone "📷 Manage photos" button next to Edit, Edit Coin's own separate
Obverse/Reverse toggle+capture block, and both Edit forms' own flat "add
photo, pick a type" picker. Consolidated to one real photo-editing surface
per record, at Ray's explicit request (Option A — replace, not add
alongside): "leaving Edit Coin's toggle and Manage Photos both able to touch
the same slab photo isn't real consolidation, it's just co-located
duplication."
- **Top image area is flip-card only, no controls layered on it** — the
  coin's "View all photos" pill and the Set's gallery strip (both sat above/
  below the flip) are removed entirely, not just hidden.
- **"Manage photos" is no longer a standalone button.** Edit is the single
  entry point for changing anything about a record, including photos.
- **Edit Coin and Edit Set now embed the real Manage-Photos section list**
  (`renderManagePhotosInto(hostId, ctx, options)`, generalized from the
  standalone screen's original `renderManagePhotos()` — see below) directly
  in the form, in place of their old simpler widgets:
  - Edit Coin: the old dedicated Obverse/Reverse toggle+frame+adjust block
    and the flat gallery picker are both gone. Obverse/Reverse is now one of
    the embedded sections (`🪙 Coin — obverse & reverse`), alongside Slab,
    Reference, Other, and (for a Set child) the parent-Set COA read-through
    — exactly the standalone screen's coin-branch section list.
  - Edit Set: the flat gallery picker is gone, replaced by the same
    Set-branch section list (OGP, Whole set, Sub-groups, COA, Other, and
    "Coins in this Set").
  - `initBrowseEdit()`/`initBrowseEditSet()` no longer wire the removed
    widgets; `showBrowseEditView(coin)`/`showBrowseEditSetView(coin)` call
    `renderManagePhotosInto()` fresh each time Edit opens for that coin.
- **`renderManagePhotosInto(hostId, ctx, options)` replaces the old
  hardcoded `renderManagePhotos()`** as the real section-list renderer —
  retargetable to any host element/ctx, which is what lets the exact same
  code serve three places (standalone Manage Photos, embedded Edit Coin,
  embedded Edit Set) instead of forking it. `renderManagePhotos()` is now a
  thin wrapper (`renderManagePhotosInto("managePhotosSections",
  managePhotosCtx, {...})`) preserving the standalone screen's original
  behavior — **still the reachable target for the other two Manage Photos
  entry points that this task did NOT touch** (the In Progress Sets
  per-row 📷 Photos button, and Docket photo-gap rows both still call
  `openManagePhotos()` exactly as before). `managePairBlock()`/
  `manageOpenEndedBlock()` now take a `render` callback (threaded through
  from `renderManagePhotosInto()`) instead of calling the old function name
  directly, so a photo add/remove/caption-edit re-renders whichever host
  it's actually in.
- **`buildManagePhotosCtx(coin)`** is the one place that builds the `{ id,
  name, meta, kind, originSetId, parentSetId, parentSetName }` shape
  `renderManagePhotosInto()` expects — extracted from the old standalone
  button's click handler (now removed) so Edit Coin/Edit Set build it the
  same way.
- **"Coins in this Set" (inside Edit Set's embedded photos) still drills a
  child coin into the STANDALONE Manage Photos screen, not that child's own
  Edit Coin.** Considered routing it straight to the child's Edit Coin
  instead (truer to "single source of truth"), but `showBrowseEditView()`'s
  gallery target is keyed off the module-level `currentBrowseCoin` (an
  existing invariant every other caller relies on — Edit is only ever
  reached today from Browse Detail's own Edit button, which always passes
  `currentBrowseCoin`), and reassigning that global mid-flow to jump into a
  child's Edit Coin — then correctly back out to the parent's Edit Set,
  without breaking that invariant for every other caller — is real
  navigation-state surgery, not a mechanical rename. Flagged as
  out-of-scope-for-this-pass rather than guessed at; kept the existing
  standalone-screen drill-down behavior instead, fixed only to return
  correctly to an EMBEDDED Edit Set (see `returnHere`/`onReturnHere` below)
  rather than always falling back to the standalone screen's own re-open.
- **`onReturnHere` (an option on `renderManagePhotosInto`) is how the "Coins
  in this Set" row's Back gets to WHATEVER is hosting that render** — the
  standalone screen's own wrapper defaults it to `() => openManagePhotos(
  managePhotosCtx)` (identical to the prior behavior); Edit Set's embedded
  call passes `() => returnToEditSetView()` *(removed later)* instead. **`returnToEditSetView()`
  is a new helper that restores Edit Set's visibility WITHOUT re-running
  `showBrowseEditSetView()`** — re-running it would re-populate every field
  from the coin record and silently discard anything Ray had typed but not
  yet "saved" (there's no real save yet either way — see below — but the
  in-progress form state itself shouldn't vanish just from a photo
  drill-down and back). Verified directly: typing into Storage Location,
  drilling into a child's photos, and returning preserves the typed value.
- **Additional Photos (bottom of the detail page) absorbs "view all
  photos"** — its old data source, a pre-gallery-system `FAKE_COIN_DETAILS
  .additionalPhotos` demo field (superseded, same as every other fixed-slot
  precursor to the real gallery system — only 2 demo rows ever had it),
  is replaced with the real gallery (`galleryFor(coin.id)`, filtered to
  exclude the coin's own obverse/reverse flip-source entries so it doesn't
  just repeat the flip card). Each thumbnail opens the same full-screen
  viewer (`openGalleryViewer`) the removed pill/strip used to open. Applies
  identically to coins and Sets — a Set's gallery never contains obverse/
  reverse entries, so the filter is a no-op there.
- **Real bug found and fixed while testing this (pre-existing, not
  introduced by this task): sections whose title contains an `&amp;` HTML
  entity never preserved their open/collapsed state across a re-render.**
  `appendManageSection()`'s open-state check compares against
  `header.textContent`, which the browser always returns HTML-decoded (a
  real `&`), while the two affected section titles ("🪙 Coin — obverse &
  reverse", "🖼️ Whole set — front & back") were being checked against the
  literal, still-entity-encoded string `"...&amp;..."` — a check that could
  never match. Net effect: those two sections silently collapsed on EVERY
  re-render, including the one that fires right after a photo is captured
  — so capturing an obverse photo, for example, would immediately snap the
  section shut. This existed in the original standalone Manage Photos
  screen too (not introduced here) but was never caught, because nothing
  before this drove a real capture end-to-end through it — this is exactly
  the gap the still-open "rebuild the fuller regression suite" item above
  already flagged ("today's suite opens Stage 1... but doesn't drive a
  capture all the way through Stage 2 to a finished entry"). Fixed by
  comparing against the decoded string instead; both affected `open:` checks
  updated. Caught and fixed via headless end-to-end capture testing this
  session, not by inspection.
- **`buildPhotoPairSlot()` gained a real "Adjust" (⤢) capability it never
  had before**, closing what would otherwise have been a genuine regression
  for Edit Coin's obverse/reverse: the OLD dedicated toggle block (removed
  by this task) always let Ray reopen the crop adjuster on the same already-
  captured photo without retaking it; the shared pair-slot component this
  task now routes obverse/reverse through (previously only used for OGP/
  slab/whole-set/sub-group pairs, none of which retain a raw original) had
  no equivalent — camera/library (retake) and remove were the only actions.
  Fixed by adding an Adjust button, shown only when the type retains a raw
  original AND a photo already exists (`def.retainRaw && entry.rawUrl`) —
  true only for obverse/reverse among every current caller of this shared
  component, confirmed by checking all four call sites, so the other three
  (sub-group pairs, Add Set's OGP pair, Add Set Step 2's child slab pair)
  are completely unaffected. Clicking it re-fetches a real Blob from the
  stored raw `blob:` URL (`fetch(rawUrl).then(r => r.blob())` — a `blob:`
  URL's underlying Blob is exactly what `fetch()` returns for it, and
  `runCropPipeline`/`loadOrientedImageCanvas` already work from any Blob,
  not just a `File`) and reruns the full two-stage pipeline from scratch on
  it, same as the old dedicated block did. This also means the STANDALONE
  Manage Photos screen's own obverse/reverse section gains this capability
  for the first time too (it never had it before this task) — a net
  improvement, not just parity.
- **Scope is still mockup, unchanged by this task** — Edit's Save button
  remains the existing placeholder stub (`"Placeholder only — edits to
  {id} aren't saved yet."`); nothing here adds or changes any OneDrive
  write behavior. This was a pure UI/navigation consolidation.
- **Held on its own branch, not auto-merged, per Ray's explicit instruction**
  — this touches Obverse/Reverse capture, the most-used photo control in the
  app, so it needs a real-device pass (crop, rotate, save) on Ray's own
  hardware before merging, same standing as the photo-gallery-crop branch's
  own real-device sign-off before it merged.
- **Verified headless** (Playwright, scratchpad scripts — not committed,
  same "scripts live in per-session scratchpads" convention as the rest of
  this project's regression history): top-area pill/strip/button all
  removed from the DOM for both a coin (AY-00001) and a Set (AY-00022);
  Additional Photos renders real gallery thumbnails and opens the viewer;
  Edit Coin's embedded Photos section shows Obverse/Reverse + Slab +
  Reference + Other, with the old toggle/gallery elements gone from the DOM;
  Edit Set's embedded Photos section shows OGP + Whole set + COA + Coins-in-
  this-Set, with the old gallery element gone; a full real capture through
  both crop stages (Stage 1 background crop → Stage 2 circle) produces a
  gallery entry with a working Adjust button, and Adjust correctly reopens
  Stage 1 on the same photo and replaces the entry in place (no duplicate);
  drilling from Edit Set into a child's photos and back preserves an
  unsaved field and returns to Edit Set (not Browse detail); the standalone
  Manage Photos screen (entry points #2/#3's target) still opens correctly
  with all its sections and independently-open-able accordions; a full
  8-route nav smoke test plus a 360px overflow check both came back clean.
  Zero page/console errors (aside from the pre-existing, unrelated MSAL
  jsdelivr CDN block this sandboxed environment always shows). **Real-device
  pass since confirmed by Ray** — Obverse/Reverse capture, crop, rotate, and
  the Adjust button all verified working on his own hardware; see the
  merge-status correction at the top of this section.
- **Note for the still-open "rebuild the fuller photo-gallery regression
  suite" tracked item above**: its "View all photos (N) viewer button" line
  is now stale (that button no longer exists — Additional Photos is the
  viewer entry point instead); worth rewording when that suite is actually
  rebuilt rather than treated as a still-accurate target.

**Follow-up (same branch, merged with everything above): Receipt folded
into the Photos area as its own pill, both forms.** Receipt used to sit as a bare, un-collapsed
photo-box lower in each form (after Container on Edit Coin; right after the
Purchase Details fields on Edit Set) — now it's a same-styled accordion
("🧾 Receipt", collapsed by default) positioned directly under the Photos
section, alongside Obverse/Reverse/Slab/Reference/Other (Edit Coin) and
OGP/Whole set/Sub-groups/COA/Other (Edit Set). No duplicate capture path
remains — the old bare photo-box is removed from both forms, not just
hidden.
- **Deliberately NOT folded into `renderManagePhotosInto()`'s own section
  list — a separate, sibling static accordion instead.** Receipt was never
  part of the gallery/crop-pipeline system (`galleryFor`/`GALLERY_TYPES`) to
  begin with; it's the distinct PDF-auto-wrap mechanism (`receiptFiles`
  registry, `prepareReceiptFile()`, see "Receipt photos auto-convert to
  PDF") — no cropping, no `runCropPipeline`. And `renderManagePhotosInto()`
  is SHARED with the standalone Manage Photos screen (the In Progress Sets
  and Docket entry points), which has no Receipt concept at all and must
  stay untouched. Folding Receipt into that shared function would have
  leaked a Receipt pill into those two unrelated entry points; keeping it
  as a separate, hand-built accordion (`wireStaticAccordionToggle()`, a
  small new shared toggle helper — the same open/collapse visual behavior
  `appendAccordion()`/`appendManageSection()` give their own dynamically-
  built accordions, but for a STATIC, already-in-HTML one instead) avoids
  that entirely.
- Wired once in `initBrowseEdit()`/`initBrowseEditSet()` (alongside the
  existing, unchanged `wireMockPhotoSlot()` receipt call), not rebuilt on
  every `showBrowseEditView()`/`showBrowseEditSetView()` re-render — Receipt
  state lives in `receiptFiles`, not the gallery array, so it doesn't need
  the same rebuild-on-every-photo-change cycle the Manage-Photos sections
  do. The underlying capture mechanism (camera/library → EXIF-oriented
  preview → lossless PDF wrap, or byte-for-byte pass-through for an
  already-PDF pick) is completely unchanged — this task only moved where
  the widget sits, not how it works.
- **Pre-existing, unrelated-to-this-task quirk, unchanged by this move**:
  the receipt preview isn't reset when Edit opens for a different coin
  (nothing ever explicitly cleared `browseEditReceiptPreview` between
  coins) — but since Edit's Save is still a stub and `receiptFiles` was
  already documented as "ready-but-unconsumed" (no real write layer reads
  it for Edit Coin/Edit Set), this has no functional consequence today, the
  same as before this move. Not fixed here — out of scope, flagging so a
  future real-write-layer pass knows to check it.
- Verified headless (19 new assertions): accordion exists and sits directly
  after the Photos host in both forms, starts collapsed, opens on click, no
  leftover Receipt widget in the old spot in either form, a real
  image-to-PDF capture still populates `receiptFiles` correctly in both
  forms, and the standalone Manage Photos screen confirmed to have NO
  Receipt section (scope boundary holds). All prior suites for this branch
  (73 assertions across 4 scripts) re-run clean alongside it, and the full
  set re-ran clean again against the merged main tree post-merge.


### Series-level reference images (locked in — framework only, real assets still open)
Any owned coin with no real Obverse/Reverse photo of its own now falls back
to a **generic reference image for its series**, rather than the bare
placeholder disc, wherever a coin renders at photo size (Spotlight, Browse
detail, Browse grid, Albums' filled slots) — `applyDiscContent()`/
`renderSlotCell()` check owned-photo-first (never true in this mockup, since
no real photo persistence exists — see "What NOT to build"), then
reference-image-second, then the bare placeholder third.
- **One image per series, reused across every year/mintmark — no exceptions,
  not even for visually-distinct varieties** (e.g. 1909-S VDB reuses the
  plain Lincoln Wheat image). No date/mintmark is ever baked into the image
  — the flip's own corner text already covers that, and a dated image could
  visually contradict it for a coin of a different year. This was
  deliberately kept exception-free to avoid reopening the exact scope
  question it was meant to close; revisit only in a future round if needed.
- **SeriesName key = `DB_Coins.Description` exactly, sanitized for
  filesystem-safe characters** (`sanitizeSeriesName()`) — the canonical join
  key, not `seriesLabel()`'s display-only corner abbreviation, which can
  drift from it. **`Description` text is series-specific and must never be
  assumed or derived — only looked up.** There is no reliable shortcut (no
  "always/never includes the denomination word" rule, no consistent
  parenthetical-vs-plain pattern) — it's whatever text actually sits in that
  column for that series, confirmed against the real workbook, full stop.
  (Superseded: an earlier version of this note claimed Description "never
  includes the denomination word," generalizing from one example — a claimed
  "Buffalo Nickel" → "Buffalo (Indian Head)" contrast that was never actually
  verified against the workbook and turned out to be wrong; dropped rather
  than repeated here. Confirmed against the real workbook instead: Lincoln
  Wheat Cent, Morgan Dollar, Barber Quarter, Buffalo Nickel, and Washington
  Quarter (the classic pre-1999 series, distinct from the 2007 "State -
  Washington" quarter) all include the denomination word in their real
  Description. None of this is guessable from the coin's own
  `name`/denomination — `seriesLabel()`'s suffix-stripping is a display-only
  abbreviation, never a stand-in for a real Description lookup.) This matters
  doubly since Ray will sometimes name Canva-made fallback files by hand — one
  canonical source avoids the app and the uploaded files disagreeing.
  **Caveat:** this mockup's `FAKE_COINS` rows don't carry their own
  Description field the way the real All sheet will. `referenceSeriesKey()`
  used to paper over that gap by falling back to `seriesLabel()` — exactly
  the guessing this note now warns against, since `seriesLabel()` is a
  display-formatting function (see above) with no relationship to the real
  Description column. That fallback is removed: `referenceSeriesKey()`
  returns `null` for a coin with no real `description` value, and every
  caller (`hasReferenceImage()`, `applyDiscContent()`, `renderSlotCell()`)
  treats a `null` key as "no reference image" rather than fetching against a
  fabricated one. Practical effect in this mockup: since no `FAKE_COINS` row
  carries a real `description` today, no coin shows a reference image yet —
  that's correct, not a regression to fix, until `FAKE_COINS` (or the real
  All sheet) actually carries confirmed Description values per coin.
- **Storage convention (superseded — now wired to a real read, see "Real
  Graph API reads" above): flat folder, no obverse/reverse subfolders.**
  ```
  CoinCollection/ReferenceImages/{SeriesName}_obverse.png
  CoinCollection/ReferenceImages/{SeriesName}_reverse.png
  ```
  e.g. `Lincoln_Wheat_obverse.png`. This replaced an earlier draft convention
  that subfoldered by side (`.../obverse/...`, `.../reverse/...`) — that
  layout is dropped, don't build against it. `{SeriesName}` is exactly
  `sanitizeSeriesName()`'s output: trimmed, **lowercased**, and every run of
  non-alphanumeric characters turned into one underscore (`Lincoln Wheat
  Cent` -> `lincoln_wheat_cent`). *(Corrected Oct 2026: this used to say
  "case preserved"; the code has always lowercased.)* A file must be named
  with exactly that lowercase key to be found.
- **Real asset sourcing is a separate, still-open task, not resolved by this
  framework pass.** For modern currently-sold Mint products, attempt an
  official U.S. Mint product render first (federal work, not copyrighted) —
  hotlink/fetch restrictions still need verifying. For historical series (the
  majority of this collection), no official render exists — propose a
  candidate and get Ray's approval before treating it as final; if rejected,
  Ray provides a Canva-made replacement via the same folder/naming
  convention. Display logic is source-agnostic — doesn't matter whether an
  image came from the Mint, was AI-generated, or hand-made, as long as it's
  in the right place with the right name.
- **Superseded: the fallback used to be demonstrated via a `FAKE_REFERENCE_IMAGES`
  boolean stub** (Lincoln Wheat and Morgan hardcoded `true`, rendering a
  visually-distinguished stand-in — desaturated, dashed-ring disc, generic 🪙
  glyph instead of the year — so it couldn't be mistaken for real approved
  art). That stub is gone — see "Real Graph API reads" above. The app now
  checks Ray's actual `CoinCollection/ReferenceImages/` folder for real
  `{SeriesName}_{obverse|reverse}.png` files; a series shows the 🪙 glyph only
  while its check is still in flight or unresolved (no token yet), and the
  bare year-number disc once it's confirmed no file exists there — whether a
  given series shows a real photo now depends entirely on whether that file
  actually exists in OneDrive, not on any code stub.


