# History of merged work (moved out of CLAUDE.md)

Build narratives, test lists, negative controls, bug-fix rounds and superseded designs. Not needed for ordinary work; read it only when you need the story behind a feature.
Back to [CLAUDE.md](../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](INDEX.md)).

## Superseded: the "Current state" block as of `21bcd95` (replaced when CLAUDE.md was slimmed)

## Current state (rewritten at the end of every task; read this first)
- main: last code commit `f14cb97` (receipts never overwrite, merged 28 Oct
  2026 by fast-forward of `claude/receipts-never-overwrite`); main's head is
  the docs commit that last rewrote this block (`git log -1`). LIVE still
  runs `928d7a9`'s code (deployed by Ray 27 Oct 2026, splash `d08c82e`):
  NOT deployed by this merge. Ray runs the deploy workflow for `main`.
- Baseline: 4088 passed, 0 failed, 0 page errors, 78 suites (run on the
  branch before the merge, 28 Oct 2026; the merge is a fast-forward).
- Open branch: none. `claude/receipts-never-overwrite` and
  `claude/photos-wait-for-save` are merged and kept on origin.
- Next task, in Ray's order (27 Oct): (g) value fallback + Set Variety line
  + album star rule; (r) Edit Set saving, then split out child coins, then
  partial sales; (e) C4 Add Set / Wishlist onto the shared chooser; (s)
  "Keep the old photo?"; (p) retire the All-sheet fallback, then (q) the
  old OGP mapping. New backlog from 28 Oct: (w) Staging photo replace
  should keep the old file; (x) Edit Coin receipts like Add Coin; (y)
  Staging edit receipt slot on the shared chooser. (u) is a data fix
  outside the app; (v) is a note only.
- Waiting on Ray: deploy of `main` to LIVE (his call); he checks LIVE's
  Photos tab for duplicate PhotoIDs (u) before any Replace on LIVE.
- Not verified on a real device: Samsung Internet in a browser tab; Graph's
  `@microsoft.graph.conflictBehavior=fail` (409) on a real upload.


#### (continued) Photos wait for Save (Oct 2026, merged to main 27 Oct 2026 by fast-forward to `928d7a9`, built on `claude/photos-wait-for-save`)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 577-598).

- **Tests changed to follow the design, not weakened:** `verify_image_chooser`
  (pick-then-row blocks tap Save via `finishCrop`'s autoSave; SR2/R3 now
  expect Save to write the typed label as its own cell; RM, UNS rewritten to
  ✕ / failed-at-Save; RC rewritten: RC1/RC2 check the failed mark and dim
  with no ↻, RC3 the retry by Save — the four centred-↻ geometry checks per
  screen and size are gone with the ↻, 208 -> 184), `verify_photo_label_save`
  (L5, L6, L9 rewritten for label-on-create, failure at Save, file-cell
  Replace), `verify_photo_receipt_write` (J, Q, R2, S, U tap Save; U14's
  fixture now has a real row so the failed detach really happens; U9b added),
  `verify_crop_from_upload` (flow taps Save; C3a added; F retries by Save),
  `verify_addcoin_shared_photos` (pickVia taps Save on a saved coin; CS4b
  added), `verify_row_tiles_viewer_label` (V1 and F3a wording).
- **Negative controls** (real app.html, restored by checksum, each failing by
  name): write on pick (25 fail); ✕ takes the photo out of the list (W1d, W1e,
  W2, W3c, W3e, W8, W9, W9b); photos before the coin row (W3, W3e, W11);
  whole-row Replace (W4, W4b); retry re-uploads (W7c); no lock (W12); new row
  without its typed label (W5); Discard leaving pending photos (W8b, W8c, W13).
- `npm test` on C1 `aa41775`: 3848 passed, 0 failed, 0 page errors, 72 suites
  (3836 - 24 retired centred-↻ checks + 32 new suite + 4 added elsewhere).
- **Not verified:** any real device; Samsung Internet; a real Save to
  `_Testing` with several photos.


#### (continued) C2: the leave guard (built on the same branch, HELD for Ray's device test; merged to main 27 Oct 2026)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 664-687).

- **Tests changed to follow the design, not weakened:**
  `verify_photos_wait_for_save` (install discards leftovers; W10 new toast;
  W13 navigate now asks, Discard drops the pick; W14b the status line under
  Replace on a Reference tile and a Holder slot), `verify_photo_label_save`
  (L11b/L11d new Edit Set toast), `verify_image_chooser` (RM1 new Remove
  wording).
- **Negative controls** (real app.html, restored by checksum, each failing
  by name): navigate() unguarded (G1a, G1c, G3b, G4a, G5a-d, G7b, G9); the
  history guard removed (H1-H8, 15 checks); the Add Coin prefill counted as
  an edit (G6, G7a, G7b); Edit Set fields not counted (G3a, G3b, G8);
  entries without a token (H7); Back with the crop tool open leaving the
  screen (H8b); the status line back above the label line (W14b x3). The E1
  edge case has two protections, each enough on its own (✕'d photos are
  removed before labels are written, and `unsavedPhotoLabelEntries` skips
  `pendingRemove`): removing either one alone still passes; removing both
  fails E1a and E1c.
- `npm test` on C2: 3888 passed, 0 failed, 0 page errors, 73 suites (3848 +
  37 new leave-guard checks + 3 W14b).
- **Not verified:** any real device; Samsung Internet's and the installed
  app's handling of the history entry (Chrome may skip a history entry
  pushed without a recent tap when Back is pressed; every push here follows
  a tap, but that is untested on a device); Android's Back gesture versus
  the Back button.


### C2 follow-ups (same branch, commit `7b4471e`, HELD for Ray's tablet test; merged to main 27 Oct 2026)
Ray's tablet test of `79b4f90` passed; his answers: Q1 keep the separate
remove line for a never-saved pick; Q2 Back inside any confirmation dialog
acts as Cancel / Keep editing; Q3 go ahead with C3 after these.
- **Wording.** The discard dialog body is "You've changed {count} on {ID}
  and haven't saved. Discard leaves this screen and loses those changes.
  Keep editing stays here so you can save." (no "them").
- **Edit Set's Fun Fact is read-only**, like Edit Coin's (Fun Fact is
  Copilot-maintained, never edited in the app): `#editSetFunFact` is a
  `.readonly-field` div filled from `catalogFunFactFor(coin)` (the same
  source the Set's page reads), it and its label (`#editSetFunFactLabel`)
  hidden when blank. It is out of `EDIT_SET_FIELD_IDS`, so it never counts
  in the leave warning, and Save no longer writes `details.funFact`.
- **Device Back on every screen.** *(Superseded by round 2 below: a stack
  of entries added only on taps, and a "Press Back again to exit" toast on
  the Dashboard instead of the Stay / Leave prompt. The one-entry design
  let a second Back in a row leave the app on Ray's tablet.)* The app keeps ONE history entry
  `{coinLeaveGuard: token}` on top at all times (`armLeaveGuard`, run from
  `setNavBack` on every screen change; it pushes only when ours is not
  already on top). The device's Back pops it and `handleDeviceBack()` runs,
  then the entry goes straight back (so a second Back with a dialog now
  open is caught too). In order: a Save running -> lock toast, nothing
  else; a confirmation dialog open -> its safe button (`backOutOfWriteGuard`,
  `DIALOG_BACK_SAFE`: Cancel / Keep editing / Stay first, else OK / Close /
  Done, else the dialog just closes running nothing — Ray's Q2); the image
  chooser, the crop tool (`closeBgCrop` / `closePhotoAdjust`) and the small
  panels (`BACK_CLOSES_PANELS`: docket match, type picker, sub-group sheet,
  gallery viewer, grading help, year filter) close; on the Dashboard
  `askLeaveApp()` shows "Leave Salty's Cabinet?" with Stay / Leave;
  anywhere else `guardLeaveEditScreen(() => navBackHandler())`, i.e. the
  app's own Back (the editing screens still ask about unsaved edits). The
  photo viewer keeps its own entry on top, so Back there closes only the
  viewer, as before.
- **Leave** (`leaveApp`, `stepOutOfPage`) *(the Stay / Leave prompt is
  gone since round 2; `leaveApp` now runs only while the splash is up and
  when the Dashboard's second Back lands on an older entry of ours)*: stops catching Back, steps back
  over our own entries (this load's and any an earlier load left —
  `historyStateIsOurs`), then once more out of the page. With nothing behind
  the page it tries `window.close()` and, if still here, toasts "Press Back
  once more to close Salty's Cabinet." Until the app is touched again
  (a trusted pointerdown) nothing re-arms, so that next Back is the
  device's own. A page restored from the back-forward cache re-arms.
- **Reloads.** An entry left by a reload (an old `coinLeaveGuard` token, or
  a `{mediaViewer:true}` with no viewer open) is reused in place with
  `replaceState`, never stacked on, and never swallows a Back.
- **Splash.** While the splash is up Back is not caught (nothing is open
  yet): it leaves as Leave does.
- `disarmLeaveGuard` is gone: Save, the in-app Back and Close Drawer no
  longer step back over the entry, since it now belongs on every screen.
- **How far Leave really goes (not verifiable here):** a web page can only
  step back in its own tab's history. In a browser tab with a page before
  ours, Leave goes to that page (after a fresh sign-in that may be the
  Microsoft sign-in page). Opened fresh (a bookmark, a new tab) or as the
  installed app from its icon there is nothing behind the page;
  `window.close()` is usually refused for a window the page didn't open, so
  the toast asks for one more Back, which the app no longer catches: in the
  installed app that closes it, in a tab it leaves or closes the tab.
  Whether Samsung Internet or the installed app allows `window.close()`, and
  how each treats the Back gesture versus the Back button, is device-only.
  Chrome can skip a history entry pushed without a recent tap; the entry is
  first pushed at load, so the very first Back after opening may leave
  without asking on some devices (untested).
- **Tests** *(D1-D4 and S1 rewritten in round 2)*: `verify_device_back_everywhere.js` (33): W1 wording; F1a-d Fun
  Fact; K1 device Back = the chrome Back on Catalog, a coin's page, a Set's
  page, the album list, an open album, Docket, Staging Review, Ledger,
  Acquisitions; D1-D4 the Dashboard prompt, Stay, Back-in-prompt = Stay,
  Leave stepping out / window.close / toast / not re-arming until touched,
  walking past old entries; Q1a-d / Q2 Back inside dialogs; P1a/b panels and
  the viewer; S1 one entry over many screen changes and Backs; S2 a reload's
  entry reused; S3a/b Save lock and splash. `verify_leave_guard.js`
  H1/H2/H3c/H4/H6c/H7 follow the one-entry-always design (not weakened).
- **Negative controls** (real app.html, restored by checksum, each failing
  by name): "them" back (W1); Fun Fact an editable counted field (F1a/F1b);
  Back caught on editing screens only, as in C2 (K1 x9, D1-D3, Q1, P1,
  S1-S3a: 22); no Dashboard prompt (D1-D4); dialog Back pressing the first
  button (Q1b, Q1d); dialog Back doing nothing, the C2 behaviour (D2, Q1a-d,
  Q2); no re-arm after a caught Back (10); every sync pushing (S1); a
  reload's entry stacked on (S2); Leave not walking past old entries (D4); a
  redraw re-arming during Leave (D3c); Back not locked while saving (S3a);
  Back caught while the splash is up (S3b); panels not closed (P1a).
- **A test-quality trap found and fixed:** the new suite first passed its
  `ok()` arguments in the wrong order (label first), so every check counted
  as passed whatever happened; the first control run showed every control
  "passing". It now uses the same `ok(label, cond, data)` wrapper as the C1
  and C2 suites. Assume a brand-new suite is broken until a control fails it.
- `npm test` on the follow-ups (`7b4471e`): 3921 passed, 0 failed, 0 page
  errors, 74 suites (3888 + 33).


### Round 3 after Ray's tablet retest of `6eaef11` (same branch, HELD for his retest; merged to main 27 Oct 2026)
Passed on the tablet: Back twice from a coin page and from an open album
(each reaching the Dashboard), the Dashboard "Press Back again to exit"
toast and exit, Back with "Discard unsaved edits?" open on Edit Coin (stayed,
text kept), Mint Mark "— none (Other) —" on Add Coin. Failed: Tap to label
opened the viewer but the keyboard didn't come up. Answers: Q1 keep the
5-entry stack; Q2 yes to the Set notes labels, built in the Edit Set saving
build (backlog r), and hide a Set's Fun Fact until it has a real source.
- **The focus was already synchronous.** The label line's click handler
  opens the viewer, unhides the field and calls `focus()` in the same task:
  no animation, timeout, requestAnimationFrame or image-load wait (the photo
  loads into the stage separately). The field is a `<textarea>` that exists
  in the page from load; only its panel is unhidden. So the cause is not the
  one Ray suggested.
- **Likely cause (not provable here):** that same tap adds two history
  entries (the leave guard's Back step on `pointerup`, then the viewer's own
  entry on `click`). On Android the browser can drop the keyboard while it
  processes such changes, which happens after the handler has returned, so a
  keyboard raised in the handler goes away again. Headless Chromium has no
  on-screen keyboard, so this can't be seen in a suite.
- **The fix:** `showMediaViewerLabel` still focuses inside the tap (caret
  at the end), then re-focuses the field at 60, 300 and 700 ms
  (`MEDIA_VIEWER_LABEL_REFOCUS_MS`, `focusMediaViewerLabelInput`). Before
  each re-focus: the viewer must still be open on the same photo
  (`mediaViewerLabelState` unchanged), the focus must be on the field or on
  nothing (a control the user moved to is never taken back), and the
  keyboard must not already be up (`onScreenKeyboardLooksUp`: the visual
  viewport under 70% of the screen's height; a wrong "up", e.g. split
  screen, only skips the re-focus). If the field is still focused, it is
  blurred first, because `focus()` on the focused element may do nothing. A
  re-focus leaves the caret where it is.
- **Why it should hold on Samsung Internet and the installed app:** both are
  Chromium, like Chrome. In Chromium a script `focus()` raises the keyboard
  whenever the page has had a user tap at all ("sticky" activation), not
  only inside the tap's own handler (that stricter rule is Safari's), so a
  re-focus a moment later is allowed to bring it back. The installed app
  runs in Chrome's engine.
- **Known effect, accepted:** when the keyboard really was dropped, the user
  may see it close and open again within the first second.
- **Set Fun Fact, now:** on real data a Set's Fun Fact is always blank, and
  blank already hides it on the Set page (`notesAndFactsHtml` skips it) and
  on Edit Set (`#editSetFunFact` and its label hidden). Only the offline
  demo shows one. Hiding the display entirely is recorded in backlog (r),
  not built here.
- **Tests:** `verify_tablet_retest_0a0cbd1.js` 12 -> 17, new T2a-T2e: a
  focus lost right after the tap is put back; a still-focused field with no
  keyboard is stepped off and focused again; with the keyboard up the field
  is focused once only; a control the user moved to keeps the focus;
  nothing is re-focused after the viewer closes. T1a/T1b unchanged.
- **Negative controls** (real app.html, restored by checksum, each failing
  by name): no re-focus (T2a, T2b); no blur before re-focusing a focused
  field (T2b); the open/same-photo, user-moved-on and keyboard-up checks all
  removed (T2c, T2d). T2e is a guard assertion: a field in a closed (hidden)
  viewer can't take focus, so it passes with its check removed too.
- `npm test` on round 3 (`826e2d4`): 3994 passed, 0 failed, 0 page errors,
  76 suites (3989 + 5 new T2 checks).
- **Not verified:** any real device; whether the keyboard really comes up
  on the tablet; Samsung Internet; the installed app. *(27 Oct 2026, Ray's
  tablet: Tap to label raises the keyboard, passed. Samsung Internet in a
  browser tab still unverified.)*


#### (continued) Replace never overwrites a photo file; PhotoIDs minted inside the lock (same branch, HELD for Ray's retest; merged to main 27 Oct 2026)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 1119-1147).

- **Tests:** `verify_replace_never_overwrites.js` (35, new): R1/R2 Holder
  back `_02` then `_03`, old bytes and DateAdded kept; R3 Obverse pair `_02`;
  R4 Recrop from the original reuses it; R5 a stray file never written over,
  a free slot takes the plain names; R6 a 409 refuses, keeps the photo
  pending, the next Save lands under a new name; R7 every photo upload asks
  for no-overwrite; R8 promotion moves; R9/R10 Staging names and pairing; I1
  PhotoIDs and ReceiptIDs concurrent and with a lagging read. **Tests changed
  to follow the design, not weakened:** `verify_photos_wait_for_save` W7
  (the failing original is now `_obverse_original_02.jpg`),
  `verify_staging_edit_photos` P11-P14 (a Staging Replace writes a new `_02`
  pair and never uploads over the old names; P11 used to assert the
  overwrite).
- **Negative controls** (real app.html, restored by checksum, each failing
  by name): replace with the same name, no-overwrite left on (11: R1a/c/d,
  R2a/b, R3a/c, R4b/c, R5a, R6c — the upload is refused, so the old file
  survives but the photo doesn't save); the same name AND overwrite allowed
  (15, adds R1b/R3b: the old file overwritten, R6a/b, R7a); Staging plain
  names (R9a/b); promotion overwriting (R8a); no session floor (I1b); the
  id minted outside the lock with no floor, i.e. the old code (I1a/b/c,
  PH-00041 twice). Minting outside the lock WITH the floor passes: the two
  protections each prevent the concurrent case on their own.
- `npm test` on `8d9be8e`: 4029 passed, 0 failed, 0 page errors, 77 suites
  (3994 + 35 new; the rewritten W7 and P11-P14 keep their counts).
- **Not verified:** any real device; that Graph's simple upload honours
  `conflictBehavior=fail` (documented for PUT …/content, not tried live);
  a real Holder Replace on TEST. *(27 Oct 2026: Ray's tablet retest passed;
  both the old file and the new `_02` file are in `_Testing/CoinPhotos`.
  The 409 path itself is still unverified live.)*


#### (continued) Receipts never overwrite (Oct 2026, merged to main 28 Oct 2026 by fast-forward, built on `claude/receipts-never-overwrite`)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 1197-1264).

- **Tests**: new `tests/verify_receipts_never_overwrite.js` (57): SELF;
  A `receiptIdUsedByOtherCoin()` in isolation; B
  `freeReceiptFilename()`/`receiptFilenameIsFree()` in isolation; C two
  sellers' own `invoice.pdf` — the second coin gets a free name, a real
  upload, and its own ReceiptID, with the first coin's row and file
  untouched; D the genuine dedupe (same bytes, two coins) still reuses one
  id and uploads once; E a re-photographed receipt really replaces what the
  row shows (new free-named file, SAME id kept, old file untouched); F the
  shared-id invariant, both phrasings; F3 new Receipts rows claim a blank
  row for both callers; G every receipt upload asks for no-overwrite; H a
  409 mid-race leaves the coin's row untouched and a retry lands under a
  different free name; I a byte-fetch failure is treated as "different"; K
  `uploadStagingEditFiles()`'s own receipt branch never overwrites the old
  Staging file in place either. One existing assertion updated to follow
  the design, not weakened: `verify_staging_edit_photos` P8/P22 (a receipt
  picked during an edit used to assert the SAME path now held the new
  bytes — the literal overwrite this branch removes; it now asserts the
  free name, the old file's survival, and its cleanup once coin.json points
  elsewhere).
- **Negative controls** (the literal pre-fix function, and a version of the
  new one with only the sharing guard removed, both run inline against the
  real app's own helper functions, not a restored checksum — this is new
  logic with no prior committed version to diff against): the pre-fix
  function reproduces both the two-sellers collision and the do-nothing
  replace; removing only `receiptIdUsedByOtherCoin()`'s check reproduces one
  ReceiptID pointing at two different files.
- `npm test` on the branch: 4086 passed, 0 failed, 0 page errors, 78 suites
  (4029 + 57 new; every other suite's count unchanged).
- **Fix after Ray's tablet test of `8b6dcdd` (28 Oct 2026): a Staging draft
  edit DELETED the replaced receipt.** `uploadStagingEditFiles()` correctly
  wrote `_receipt_02.pdf`, but `mergeStagingEditFiles()` then listed the old
  receipt name in `dropped` (it was in `hydratedFiles` and no longer the
  draft's `receiptPhoto`) and `finishStagingEditFiles()` deleted it; the next
  replace found the plain name free again, hence the alternation and "always
  exactly 1 file". K1-K5 only tested the upload step, so they missed it. Now
  a replaced receipt (`receipt.stagingUploaded`) is left out of `dropped`:
  coin.json points at the new name, every earlier file stays on disk (a third
  replace gives `_03`). Only ✕ on the receipt (`receiptRemoved`, confirmed
  first) still deletes its file. **Left as is, for Ray to decide:** a
  replaced Staging PHOTO (fixed-name types) still has its superseded file
  deleted after coin.json is written (staging-edit-photos P11-P14, backlog
  (s) "Keep the old photo?").
- **Same fix: the Save changes toast said "Photos and receipt are
  unchanged" after a receipt change.** The summary was built after
  `resetAddCoinAfterSave()`, which clears `receiptFiles`, so it never saw the
  receipt. `mergeStagingEditFiles()` now returns `receiptSaved` /
  `receiptOldKept` and `stagingEditFilesSummary()` reads those: "receipt saved
  to Staging (the old file is kept there)".
- Tests: `verify_staging_edit_photos` P22 now asserts the old file stays,
  new P22b (toast) and P23 (two replaces in a row leave three files,
  coin.json on `_03`). Negative control: the old code fails exactly P22,
  P22b, P23. `npm test`: 4088 passed, 0 failed, 0 page errors, 78 suites.
- **Not verified:** any real device; any real OneDrive session. *(28 Oct
  2026, Ray's tablet: the Edit Coin / `_Testing` paths worked as designed:
  shared SecVol.pdf got a new RC-00036 for coin A, coin B untouched;
  re-photographing AY-00003 kept RC-00037 and wrote `_receipt_02.pdf`, old
  file kept; rows landed at 119-121.)*
- **Found in the same test, ALREADY ON `main` (identical code at `928d7a9`),
  not fixed here:** (1) after a receipt saves in Edit Coin the coin's detail
  screen keeps the old receipt (or none) until restart: `LIVE_RECEIPTS` is
  fetched once per session and `commitReceiptCapture()` never updates it
  (photos have `syncStoredPhotoIndexUpsert`, receipts have no equivalent);
  (2) Edit Coin's receipt slot shows no receipt even after restart:
  `prepareReceiptSlotForRecord()` only clears the slot and nothing ever paints
  the stored receipt into it. Both need their own small branch.
- **Noted, not built:** the Staging-edit receipt slot still has the old
  camera/gallery/✕ icons: no preview, no Replace, no Files button.


## Add Coin: 📁 Files button + photo guard (Oct 2026, merged to main at `0a86551`, built on `claude/add-coin-files-picker-button`)
*(Superseded 23 Oct 2026, now on main: these slots and inputs
are removed; Add Coin's photos go through the shared image chooser, whose
Files input has the same accept and guard. See "Add Coin uses Edit Coin's
photo section", commit 6.)*
Merged to `main` (fast-forward to `0a86551`). Suite: `tests/verify_files_picker.js` (40).
- **Why:** Chrome on Android opens its Photos-style picker for an image-only
  accept, and that picker's cloud sources are Google Photos or None — OneDrive
  can never appear there. An accept that also allows a non-image type makes
  Android open the system Files screen instead, where OneDrive is listed.
- **What:** a third button on Add Coin's Obverse and Reverse slots (📁, title
  "Files", same icon-only circle as 📷/🖼️) and on the "Add photo" gallery
  (📁 Files). Hidden inputs `obverseFilesInput`, `reverseFilesInput` and the
  gallery's `data-role="files"`, all `accept="image/*,application/pdf"`
  (`FILES_PICKER_ACCEPT`, the same value every receipt Library input already
  uses), no `capture`. A Files pick runs the SAME handler as Library: same
  crop pipeline, same JPEG output, same destination (in memory until Save,
  then Staging). Nothing is written before Save (asserted, H1).
- **Guard:** `isPickableImage(file)` — a typed file must be `image/*`, an
  untyped one must have an image extension (`PICKABLE_IMAGE_EXT`; some
  document providers send no MIME type), and either way it must decode via
  `createImageBitmap`. Runs on Library AND Files picks on those three slots;
  Camera is never guarded. A refusal toasts `NOT_A_PHOTO_MESSAGE` ("That file
  isn't a photo. Nothing was added.") and stops before the crop screen — no
  entry, no Graph request. Before this, main's handler sent a PDF/HEIC/broken
  file straight into `openBgCrop()`, which threw an uncaught decode error with
  nothing on screen.
- **Opt-in, so nothing else moved:** `wireMockPhotoSlot()` gained a 12th
  `opts` param (`filesBtnId`, `filesInputId`, `guardImages`);
  `initGalleryCapture()` gained `opts.files` / `opts.guardImages`. Only
  `initAddCoin()` passes them. Add Set's galleries, Wishlist, Edit Coin /
  Manage Photos, every receipt slot (they accept PDFs on purpose) and
  `stage.html` are byte-for-byte unchanged — the suite pins the accept and
  capture of all 42 pre-existing file inputs (34 app.html + 8 stage.html).
- **Labels in the 3-button gallery row:** "📷 Camera / 🖼️ Library / 📁 Files"
  (`.gc-add-row-3`, nowrap, equal flex, 150px cap). The original "Take photo /
  Choose photo" wording needs ~350px against ~264px at a 360px phone and
  wrapped to two lines. Galleries without `opts.files` keep the old labels.
- **Left alone on purpose:** Manage Photos / Edit Coin (next branch), Add
  Set, Staging-edit photo saving *(since built: see "Editing a Staging draft:
  photos, receipt and research note (Phase B)")*.
- **Not verified:** which picker Android actually opens for this accept on
  Ray's S25, whether OneDrive is listed in its Files menu, whether OneDrive
  files download through Files, and HEIC from a real phone (the suite uses a
  synthetic undecodable HEIC). Ray checks these on a TEST build.


### History: Current status as of 2026-09-05 (superseded, kept for the record)
The Add Coin Phase 1/Phase 2 merge (`claude/add-coin-write-path-fs2rf8`),
Phase A Staging edit, Docket sections, Composition tier, CACBean,
ValueSource/ValueDate, the workbook-alignment corrections, the Ledger/Stats
live-data fix and the corner-fitting chain all landed on `main` then. The
`WRITE_TARGET` / flag notes from that time are superseded by "The build
decides its data target"; `claude/photo-receipt-write-layer` has since
merged too (see its own section).


## Crop from an uploaded photo (Oct 2026, merged to main)
*(Superseded 23 Oct 2026, now on main: renamed "Crop from another photo", sources Holder/Reference/Other, destinations Obverse/Reverse/Reference — see "Add Coin uses Edit Coin's photo section".)*
Built on `claude/crop-from-uploaded-photos` (`e636e64`..`15359ea`), merged to
`main` on Ray's go-ahead. Suite: `tests/verify_crop_from_upload.js` (46).
- **Why:** on Ray's phone the file picker opens Google Photos only, so a photo
  already in OneDrive (e.g. a seller's combined shot) could not be reached
  again to crop a better obverse/reverse out of it.
- **Where:** a "Crop from an uploaded photo" section in Manage Photos / Edit
  Coin's embedded photos. **Coins only**, and only where a save is possible
  (owned coin, photo write layer on). Its tiles are the coin's own STORED
  photos as plain buttons — **no `<input type=file>`**. The source is read via
  `ensureCoinPhotoFetch()` and never written, renamed or detached.
- **Flow:** tap a tile → pick the destination FIRST (Obverse / Reverse / Extra
  image; Cancel writes nothing) → the unchanged `runCropPipeline()` (square +
  circle for obverse/reverse, free crop for an extra) → save through the
  ordinary `commitGalleryPhoto()`. Replacing an existing obverse/reverse asks
  first. Functions: `cropSourceEntriesFor`, `manageCropFromUploadBlock`,
  `startCropFromUpload`, `confirmCropDestination`, `runCropFromUpload`,
  `saveCropFromUpload`.
- **Naming, never overwriting:** obverse/reverse → `{ID}_obverse_cropped.jpg`,
  or `_cropped_02`, `_03`… if that name is taken (`freeFlipCropFilename`).
  Extra → next free `{ID}_reference_NN` (`nextFreeRepeatableFilename`). Every
  candidate is checked with `getItemMeta()` (a GET) before upload; a legacy
  `{ID}_obverse.jpg` is never touched. **No `_original` copy** — the source is
  already in OneDrive; the toast says a later Adjust re-crops the crop.
  `commitGalleryPhoto()` gained an optional per-entry `resolveFilename` hook,
  resolved ONCE so a retry keeps the same name.
- **Pre-existing bug fixed alongside (`d6fe771`), affects the normal Camera /
  Library buttons too:** the next `_reference_NN` / `_other_NN` / `_coa_NN`
  used to be "gallery count + 1", so `_01` + `_03` on file picked `_03` and
  OVERWROTE it, and a file with no Photos row was never counted. Now: one past
  the highest number in use, stepping up until `getItemMeta` says it's free.
  Every repeatable type, coins and Sets.
- **Left alone on purpose:** the ordinary Replace / Adjust buttons still write
  the convention name and can overwrite their own previous `_cropped` file.


### Horizontal hairline on the coin-disc — root cause found and fixed (BUILT, merged to main)
A report of "a visible horizontal hairline bisecting the circle" on the
flip-card coin graphic was root-caused via pixel-level screenshot diffing
(not guessed) rather than patched blind, per the explicit instruction that
prompted this pass. **Two completely different things were initially
conflated and had to be separated:**
- **The actual, confirmed cause — Dashboard Spotlight only**: `.display-
  case-glass::after` (a deliberate "muntin bar" decoration meant to make the
  display case read as glazed, not a photo) sits at `top: 50%` of
  `.display-case-glass` — which is also almost exactly where the Spotlight
  coin disc's own vertical center falls, since the disc is centered within
  `.flip-frame`, itself centered within `.spotlight`, itself inside that
  same box. As a generated `::after` with `z-index: auto`, it painted AFTER
  (visually on top of) `.spotlight` in their shared stacking context — both
  are positioned descendants of `.display-case-glass`, and `::after` is last
  in paint order — so the bar was drawing a faint white line directly across
  the coin, not just the surrounding glass margins. Confirmed by removing
  the fallback year-number text entirely and finding the seam persisted
  (independent of text) at every x-column across the disc's full width, at
  exactly `y = 50%` — then confirmed the fix by isolating the CSS in a
  standalone test page and pixel-diffing before/after.
- **The fix: `z-index: -1` on `.display-case-glass::after`**, nothing else
  changed (same size/opacity/position). This drops the bar into the
  negative-z-index paint layer, below the (non-positioned) opaque coin-disc,
  so it's naturally occluded wherever the coin covers it while still reading
  as a glazed-case divider in the visible glass margins beside the coin —
  exactly the original visual intent, just no longer drawn across the coin
  itself.
- **Browse detail was never actually affected by this bug at all** — its
  `.flip-frame` has no `.display-case-glass` ancestor (that class only wraps
  Spotlight), confirmed by the same text-removal pixel test coming back
  completely clean there with zero seam at any point. What can *look* like a
  faint horizontal line on Browse detail's disc is the ordinary fallback
  `coin.year` placeholder text itself (e.g. "1877") — dark serif digits,
  vertically centered by the disc's own flexbox layout, which can read as a
  thin dark smudge at a glance depending on rendering/distance. That's
  intentional placeholder content (see "Series-level reference images"
  above — the bare year-number disc is the accepted fallback until a real
  photo or reference image exists), not a CSS defect, and nothing about it
  was changed by this fix.


### Browse detail: CollectionID display above Overview (BUILT, merged to main — superseded placement, see the header-row consolidation follow-up below)
A standalone, centered `AY-#####` line (`.detail-collectionid`) now sits
directly above the Overview accordion in Browse detail's info panel — same
typographic weight as the accordion section headers below it (13px/600,
`var(--text)`) minus their interactive button chrome (no border/background/
hover, since this isn't clickable). Built inside `renderDetailAccordions()`
itself (the one function that owns/clears/rebuilds `#detailAccordions` on
every render) as the first element appended, ahead of the Overview
accordion — applies identically to individual coins and Set-bundle rows,
since every owned row has a CollectionID.


### Tap-to-flip (superseded — see "Coin-flip interaction redesign" below)
Every flip-frame a saved coin rendered in used to carry a small dedicated ⟲
icon (`.flip-toggle-btn`, bottom-center of the frame, via a shared
`attachFlipToggle()` helper) that flipped that one card between obverse/
reverse in place. **This entire mechanism — the icon, `attachFlipToggle()`,
and its CSS — is gone**, replaced by three separate, context-specific
treatments (auto-cycle, a global per-view toggle, or whole-card tap/swipe/
click) with no icon anywhere. Kept here only for history; see the current
design below.


### Carried forward — not yet built (empty — all three Browse issues are done)
The three issues raised against the Browse restructure above are **all built,
committed, and browser-verified** — nothing is carried forward here anymore.
Kept as a heading only so a future session sees the queue is intentionally
empty rather than missing.
- **Issue 1 (Sets tab cards rendered side-by-side)** — fixed via
  `.coin-grid.sets-mode` (parallels `.list-view`'s own stacking rule, applied
  only while rendering the Sets tab, cleared by `renderBrowseGrid()` so it
  can't leak into Coins/Rolls).
- **Issue 2 (Value overlay on Coins-tab grid cards)** — fixed via
  `#browseGrid[data-tab="coins"]:not(.list-view) .coin-card .value {
  display:none }`, with `showBrowseTab()` setting `#browseGrid`'s `data-tab`
  attribute so Rolls (same `.coin-card`/`renderBrowseGrid()` path) and both
  tabs' list modes keep Value.
- **Issue 3 (comprehensive coin detail view + Album/Set linkage)** — built;
  see the expanded "Browse detail view" section above for the full mechanism
  (`renderBrowseDetailPanel()` restructured into always-visible key facts +
  a "Belongs to" Album/Set linkage section + inline `appendAccordion()`
  groups; `resolveCoinAlbumLink()`/`resolveCoinSetLink()` *(removed Oct 2026)*; sparse
  `setId`/`shippingCost`/`receipt` demo data). Verified in a real browser at the time:
  Album linkage resolves via `Albums.FilledBy` (Lincoln Wheat Cent →
  Lincoln Cents album, opening at the cover), Set linkage resolved via `setId` (history:
  that SetID link was removed Oct 2026)
  and NOT CollectionID (Washington Quarter → 2021 Silver Proof Set bundle,
  which itself shows no self-link), the accordions collapse/expand, coins with
  no linkage omit the section cleanly, and Browse Edit is unaffected.


### Browse filters (locked in, superseded by "Browse: navigation restructure" below)
One filter row: `All / Cents / Nickels / Dimes / Quarters / Halves / Dollars`
(by Denomination), then a thin divider, then `Sets / Medals / Commemoratives`,
all multi-select/OR-combinable except "Sets," which was a separate exclusive
action replacing the coin grid with a picker of named **DB_Sets-style
entities** (`FAKE_SETS`, e.g. "2021 Silver Proof Set") each pointing at a list
of separately-owned member CollectionIDs — tapping a set showed just its
member coins. A coin's own `Set`/`Medals`/`Commemoratives` fields were tags
layered on an individually-catalogued coin, not mutually exclusive with each
other or Denomination (a coin could be both part of a Set and a
Commemorative, e.g. old AY-00014).
- **This whole model is gone as of the Browse navigation restructure below** —
  kept here only for history. The real bug that triggered the restructure:
  selecting "Sets" never un-highlighted "All," because Sets was never a peer
  value in the same underlying data as Denomination/Medals/Commemoratives —
  it was a different *kind* of thing (a navigation action) wearing a filter
  chip's clothes. Confirmed against the real workbook during the restructure:
  a coin's own Set-package tag isn't a reliable/real concept the way this
  section assumed — see below for what replaced it.
- Still true, unaffected by the restructure: half dimes / three-cent pieces
  will need their own Denomination code once catalogued (`5C` is already the
  modern nickel, so a half dime can't reuse it) — deal with it when the first
  one is catalogued.


### Metal filter (locked in, pill set superseded below — mechanics still apply)
A second single-select chip row (`All Metals / Gold / Silver / Platinum /
Palladium`) sits directly below the Type row, filtering on precious-metal
content sourced from `Lookup_MetalContent`'s `SilverOz`/`GoldOz`/`PlatinumOz`/
`PalladiumOz` columns (`FAKE_METAL_CONTENT`, a sparse lookup by CollectionID
in the mockup — matches the `FAKE_COIN_DETAILS` pattern rather than adding
four mostly-zero fields to every coin row).
- **Qualification is ANY nonzero content, regardless of purity** — a 35%
  Silver War Nickel and a 90% Silver Morgan both qualify under "Silver."
- **Metal ANDs with Type** (superseded name for what the Coins tab now calls
  Denomination — `applyCoinsTabFilters()`, née `applyBrowseFilters()`, filters
  on `browseFilterTest(c) && browseMetalTest(c) && ...`, now with a third
  Commemorative-toggle term added by the Browse navigation restructure above);
  Metal alone (Type left on "All") shows every coin of that metal regardless
  of denomination/category.
- **This is its own independent single-select row, not a conversion of the
  Type row into multi-select.** The original spec for this feature described
  Type pills as OR-combinable ("tapping both Dollar and Half Dollar shows
  either") as if that already existed — it doesn't; Type is still explicitly
  single-select, "only one chip active at a time," per the section above.
  Converting Type to multi-select would be a real, separate interaction-model
  change to an already-locked-in pattern, not a side effect of adding a metal
  dimension, so it wasn't done here without a dedicated decision. Everything
  the feature actually needs (qualification rule, AND-combination with Type,
  Metal-alone browsing) works fully with Type staying single-select.
  **Superseded by the Type row's multi-select conversion above** — Metal
  stays single-select itself (unchanged), it just now ANDs against whatever
  combination of Type chips is active rather than a single one.
- **Composition detail lives in the coin detail panel, not the grid/list
  cards** — a new Composition row in `renderBrowseDetailPanel()`, e.g.
  "Silver — 0.7734 oz," hidden when a coin has no tracked metal content.
  Purity percentage isn't a separately tracked field in this mockup's data
  model (only Oz content) — the real `Lookup_MetalContent` table would carry
  that alongside the Oz figure.


### Needs Attention queue (superseded by the hub above — kept for history)
Framed as a general discrepancy-tracking hub — "where any discrepancy gets
identified, worked, and tracked" — not something narrowly scoped to DB_Coins
misses. The only concrete content today is still coins saved without a DB_Coins
match (flagged automatically, shown with a live count badge), and resolution is
unchanged: Claude research + Copilot adds the DB_Coins row. The broader framing
is intentional headroom for other discrepancy types later (nothing else feeds
this queue yet) — don't assume every row is a DB_Coins miss when extending this.


#### (continued) Browse Edit real write layer (BUILT and merged to main)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 7175-7502).

**Verified headless — 206 assertions across both required viewports**
(`verify_browse_edit_write.js`, 103 × 2), zero page/console errors: allow-list
and never-write list contents and disjointness; header-map position
resolution against the real 49-column layout; row re-resolution after rows
shift; the row read never even exposing formula/identity columns; Excel
serial round-trips and whole-day stamping; conflict detection including
third-party edits, self-stamped-column exclusion and no phantom
blank/numeric conflicts; identity overwrite vs. blank-fill vs. non-identity
vs. Edit Set's own field list; edit ranges merging adjacent columns while
never touching U or Z, and date columns carrying their own format; a full
`saveCoinRowToWorkbook()` cycle (clean save, hard block writing nothing,
not-found, and a no-change save still stamping LastModified/Reviewed); the
Containers join across coin/Set/child; the detail view showing the derived
location; the read-only Fun Fact and derived-storage UI including clearing
Container; both guard dialogs; and a **full end-to-end run through the real
Save button** — snapshot load, Notes prefilled from Remarks, a plain save
writing real cells with both formula cells untouched, an identity edit
asking first and writing nothing on Cancel, a concurrent edit blocking a
real Save click with the typed text preserved, and a reopen-and-retry
landing. Plus: with the gate off, `ENABLE_BROWSE_EDIT_WRITE === false`, no
write-capable MSAL instance exists, a save returns `disabled` and writes
nothing, and Save still does the old session-only in-memory update. All 9
prior suites re-run clean alongside it — **479 assertions total, zero
failures**. `verify_addendum.js`'s "Fun Fact is an editable textarea"
assertion was updated to assert the new read-only behavior, following a real
design decision rather than weakening the suite.

**Two bugs found during Ray's live copy-workbook run, both fixed and
re-verified headless (checklist itself passed — B8-B9/C12-C14/D16/E19-E20 all
confirmed against real OneDrive data; these were refinements on top, not
architecture changes):**
- **Bug 1 — Edit Coin's Mint Mark field could load blank for a real "P" coin.**
  AY-00193 (a 2017-P Lincoln Shield Cent, workbook `MintMark = "P"`) loaded
  with Mint Mark blank in Edit Coin — setting a `<select>`'s `.value` to an
  option that doesn't exist silently falls back to no selection, and the
  dropdown only ever offered blank/D/S/CC/O/W. This then correctly tripped
  the identity-overwrite dialog on an unrelated save (`MintMark: P →
  (blank)`) — the identity-check logic itself was working correctly off of
  what the form had wrongly loaded; the bug was upstream of it. **Root cause
  confirmed against the real workbook**: 25 real rows carry a plain `"P"` —
  modern Philadelphia issues sometimes mark it explicitly even though
  historical Philadelphia coins carry no mint mark at all. Fixed by adding
  `"P — Philadelphia (explicit)"` as a real, separate option from the
  default blank in BOTH Add Coin's and Edit Coin's Mint Mark dropdowns (kept
  in sync, per the existing "Edit Coin reuses Add Coin's dropdown options"
  rule), and adding `"P"` to `MINT_MARK_ORDER` (right after blank) so the
  Coins tab's Year-then-MintMark sort treats it correctly instead of sorting
  it to the very end as an unrecognized value.
- **Bug 2 — CoinID wasn't recomputed when Year/MintMark/Denomination changed,
  silently linking to the wrong catalog data.** Reproduced live: AY-00008
  (`CoinID C-1919-S-1C-01`) had its Year edited to 1920 and saved
  successfully — CoinID stayed `C-1919-S-1C-01` instead of becoming
  `C-1920-S-1C-01`, even though DB_Coins has a real, DIFFERENT row for
  1920-S with its own Mintage. Since SpotValue's formula and any
  Mintage/Composition/FunFact display key off CoinID, the row would have
  silently shown 1919-S's catalog data on a coin now displayed as 1920-S —
  no error, nothing visibly wrong. **Fixed with a new, narrow, single-purpose
  module** (`resolveCoinIdForEdit`/`writeCoinIdCell`/`flagCoinIdNeedsRelink`),
  deliberately NOT added to `ALL_WRITABLE_COLUMNS` — CoinID has no general
  code path to a PATCH, only this one dedicated, explicitly-audited write,
  fired only from `performBrowseEditWrite()` after the main row save has
  already succeeded:
  - Triggers only when Year, MintMark, Denomination, or Variety actually
    changed (`coinIdInputsChanged()`, compared against the live snapshot).
  - Reuses the SAME DB_Coins candidate lookup Designation re-resolution
    already used (`dbCoinsCandidatesFor()`, factored out so both share one
    "which DB_Coins row matches?" implementation) — a real fix in its own
    right, since the Designation re-check was previously being run against
    the coin's STALE pre-edit identity (`{...coin, designation}`) rather
    than the new form values, meaning a genuine identity edit never actually
    got re-checked against what it was being changed TO. Both now run off
    one `identityShape` built from the actual submitted form values.
  - A unique DB_Coins match → writes the real CoinID and reports it in the
    save toast ("CoinID updated to C-...").
  - Zero matches → **clears CoinID to blank** (an already-supported "pending
    research" state elsewhere in the app, e.g. Add Coin's own DB_Coins-miss
    path) rather than leaving the stale, now-wrong value in place, and
    pushes the coin into the SAME `FAKE_NEEDS_QUEUE`/Needs Attention
    "Waiting on Copilot research" pipeline Add Coin already uses for a
    brand-new unmatched entry (`flagCoinIdNeedsRelink()`) — reusing that
    existing pattern rather than building a parallel one, per the explicit
    request. A `kind: "coinid-relink"` marker gives it its own wording in
    the hub ("Identity edited, no DB_Coins match — CoinID cleared, needs a
    catalog entry") so it doesn't read as a brand-new find.
  - 2+ candidates → the existing shared ambiguous-picker UI surfaces exactly
    as it already did for Designation; by the time the save callback fires,
    ambiguity has already been resolved into a real pick or a genuine miss,
    so the CoinID logic itself only ever sees "matched" or "didn't."
  - A write failure on this follow-up step (main row already saved
    successfully) degrades to a toast rather than losing the rest of the
    save.
- **Bug 3 — Notes briefly flashed unrelated mock content before settling to
  the real value.** On AY-00001 (real `Remarks` blank), Edit Coin's Notes
  field showed "Bought at auction, still in the original PCGS holder." for
  about half a second before correctly clearing — that text matched no real
  row; it was `FAKE_COIN_DETAILS`'s demo fallback rendering because the
  initial synchronous form-populate ran before `loadBrowseEditSnapshot()`'s
  async fetch resolved (fire-and-forget, not awaited). Functionally harmless
  (the eventual Save always wrote the real value), but confusing and
  plausible enough to be mistaken for real data. **Fixed**: with the write
  layer on, the mock `details.notes` fallback is never used at all — Notes
  starts genuinely blank with a "Loading current notes…" placeholder instead,
  filled in for real once the snapshot resolves. The write-layer-OFF
  (mockup) path is unchanged and still uses the mock value immediately,
  since there's no real fetch coming to correct it there.
- **Polish item**: the Storage Location read-only note reworded from "Set by
  this coin's container — change it on the container, not here." to "Set by
  the Containers tab — change it there, not here." — the old wording read
  ambiguously between "container" as a concept and as the literal tab name.
- **Checklist gap**: `docs/BROWSE_EDIT_LIVE_RUN_CHECKLIST.md` didn't mention
  `ENABLE_LIVE_NAV_DATA` needing to be on too, so Catalog only showed the
  ~17-item hardcoded demo set during the live pass instead of real workbook
  data. Added to the checklist's setup steps, plus a note that first open may
  now trigger sign-in redirects from BOTH separate MSAL instances (live-nav
  read, write-layer read/write), not just one.
- 40 new headless assertions (`verify_browse_edit_write.js`, 246 total now,
  123 × 2 viewports) cover all three bugs: the "P" option existing and
  loading correctly in both dropdowns plus its `MINT_MARK_ORDER` position;
  Notes never showing mock content while loading (with a distinguishing
  placeholder) vs. the unchanged write-layer-off behavior; and CoinID
  re-linking end-to-end through the real Save button — a real match writing
  the new CoinID and updating the in-memory record, a genuine miss clearing
  CoinID and flagging Needs Attention with the correct identity, and a
  non-identity save (Value only) leaving CoinID completely untouched with no
  confirmation dialog at all. All prior suites re-run clean alongside —
  **519 assertions total across the whole app, zero failures** (since grown
  to 563 by the Part-D2 fixes below).

**Four more findings from Ray's Part-D2 live pass, all resolved. Two were
serious and share ONE root cause worth remembering.**

**ROOT CAUSE (Bugs A + B) — the app was READING one workbook and WRITING
another.** `ENABLE_LIVE_NAV_DATA`'s reader hardcoded
`LIVE_NAV_WORKBOOK_PATH = "CoinCollection/CoinCollection (AI).xlsx"` (real
production) on the reasoning, recorded in this file, that "a read-only GET
can't corrupt anything, so it doesn't need the `_Testing` copy convention."
That reasoning was sound **only while nothing wrote**. It stopped being true
the moment Browse Edit could write, and the two features were built in
separate rounds so nothing forced a re-check.
- **Bug A (silent wrong data on screen):** Catalog, Browse detail and Edit
  Coin all displayed/pre-filled from PRODUCTION, while the write layer's
  conflict snapshot and its actual writes went to the `_Testing` COPY. On
  AY-00008 the copy said Year=1920/Variety="Type 69" while production still
  said 1919/blank — so both screens showed 1919-S with Variety blank. Ray's
  diagnosis that a shared upstream source was at fault was exactly right;
  it just wasn't a CoinID parse (nothing anywhere derives displayed identity
  from CoinID) — it was the wrong file.
- **Bug B (real data loss):** because the form pre-filled from production
  and the save diffed against the copy, a save that only intentionally
  touched Year submitted `Variety: "Type 69" → (blank)` as a side effect.
  The identity-confirmation dialog worked perfectly — it caught and named
  the change — but it read as routine, and confirming destroyed real data.
- **Fix, two layers, both deliberate:**
  1. **One workbook for the whole app.** `LIVE_NAV_WORKBOOK_PATH` is gone,
     replaced by `liveNavWorkbookPath()` returning `writePaths().workbook`.
     **Standing rule going forward: any new read path reads
     `writePaths().workbook`. Never reintroduce a separate read target — a
     read/write split is not a safety measure here, it IS the bug.**
  2. **The form now pre-fills from the SNAPSHOT, not the in-memory record**
     (`applySnapshotToEditForm()`, called when the snapshot lands). This is
     the structural fix: the form's baseline and the diff's baseline are now
     the same object by construction, so an untouched field cannot produce a
     change even if some display source diverges again. **If a new writable
     field is added to Edit Coin, it belongs in that function too.**
     A `browseEditTouchedFields` set (one delegated listener on the edit
     view) means a late-arriving snapshot re-bases only fields the user
     hasn't typed in — their own edits are never clobbered.
- **Also fixed, same class, wider than the earlier "P" bug:**
  `setSelectValuePreservingUnknown()` injects a real `<option>` for any
  workbook value a dropdown doesn't already list, instead of silently
  leaving the select on no selection (which then reads back as "user blanked
  it"). This matters beyond `"P"` — the real MintMark column also carries
  `"P/D"` (26 rows), `"P/D/S"`, `"P/S"`, `"None/D"`, `"P/W"` and others.

**Bug C — CoinID re-linking matched against the 12-row MOCK catalog.**
`dbCoinsCandidatesFor()`/`findDbCoinsMatch()` read `FAKE_DB_COINS` directly,
so AY-00008's edited identity (1920-S 1C) was reported "no match" and had
its CoinID cleared — even though DB_Coins row 335 is exactly
`C-1920-S-1C-01`, confirmed both in the workbook and independently by
Copilot. **Fixed:** `ensureLiveNavDataFetch()` already fetched DB_Coins for
the Metal-filter join and then *discarded* it (an explicit "neither sheet
gets its own LIVE_* cache" note — now superseded); it's cached as
`LIVE_DB_COINS` with an `activeDbCoins()` accessor, and both match functions
read through it. `mapWorkbookRowToDbCoin()` maps the real, confirmed
DB_Coins headers. Two notes worth carrying:
- **DB_Coins has no `Designation` column** — live rows get `""`. The
  ambiguous-match picker still works, since it triggers on 2+ rows sharing
  the base Year+MintMark+Denom+Variety key, which real data produces on its
  own.
- **`Mintage` and `PCGS#` are only partially populated**, so the Add Coin
  match banner now omits each when absent rather than calling
  `.toLocaleString()` on null and throwing.
- **Still on the mock, deliberately out of scope:** `slotMintage()`
  (Albums — Ray's earlier explicit call that Albums isn't wired to live
  data), `validVarietiesForCurrentCoin()` and the PCGS label decoder (both
  Add Coin, whose Save is still a stub). Worth doing when Add Coin's own
  write layer lands.

**Verified headless — 50 new assertions (296 total in
`verify_browse_edit_write.js`, 148 × 2 viewports; 569 across all 10 suites,
zero failures).** The Bug B coverage is a direct reproduction of the live
scenario: a workbook row saying 1920/"Type 69" behind an in-memory record
saying 1919/blank, then typing only Year and saving — asserting the form
re-bases onto the workbook values, that NO identity dialog fires, and that
the real Variety survives. Plus: read and write paths resolve to the same
file; an unlisted `"P/D"` round-trips through a select; a user-typed field
survives a late snapshot while untouched fields still re-base; the exact
1920-S identity matches `C-1920-S-1C-01` once the live catalog is loaded
and the full re-link succeeds end-to-end without flagging research; a null
Mintage doesn't throw; and the Docket badge counts both sections, equals
every visible row, and decrements back when an item is removed.

**Bug D — was working as designed, then Ray changed the design.** The fob
had counted the "Needs your action" section only, never research — his own
earlier call. Reported as intended rather than silently "fixed"; he then
decided research items SHOULD count, since handing something to Copilot and
reconciling the result is still his action. **Now a total across both
sections** — see "Needs Attention hub" → Dashboard badge above for the full
history of this decision (it has flipped twice) and the implementation.

**Part-F live pass: an unresolvable save loop that lost typed input.** On
AY-00680-C (1945-D Mercury Dime), editing only Grade and Notes produced:
duplicate-catalog picker on every save → pick → conflict block → OK →
picker again, forever, with typed Notes eventually lost. Five distinct
causes, three of them mine from the previous rounds.
- **The duplicate is REAL, not a spurious match.** DB_Coins rows 939 and
  3742 are both 1945-D 10C Mercury Dime Business Strike, blank Variety,
  differing only in CoinID / GSID (4623 vs 4624) / PCGS# (5058 vs 5059).
  And it is not rare: on the real catalog, **577 base keys
  (Denom+Year+Mint+Variety) have 2+ rows, covering 1,629 rows — ~43% of
  DB_Coins.**
- **The picker fired on EVERY save, not just identity edits.**
  `checkDesignationReresolution()` ran unconditionally. Invisible against
  the 12-row mock; against the real catalog it means any save on any coin
  with duplicate catalog rows pops a "pick one" list for no reason. Fixed
  with `resolveDbCoinsForSave()`, which runs the resolution only when
  Year/MintMark/Denomination/Variety/**Designation** actually changed
  against the snapshot. Designation stays a trigger — that was the
  mechanism's original purpose.
- **`Finish` was missing from the candidate match.** It's real specimen
  data on BOTH sheets (`All.Finish` populated on all 542 rows), so a Proof
  and a Business Strike of the same date were being treated as one match.
  Adding it cuts ambiguity from 577 groups/1,629 rows to **227
  groups/771 rows**. **Soft, never a hard filter** — `All.Finish` carries
  values DB_Coins doesn't (`Circulated` on 139 rows, `Various` on 6), so a
  strict filter would turn a good match into zero for ~145 rows and wrongly
  clear their CoinID. An empty narrowed set falls back to the full one.
- **The picker's options were visually identical**, confirmed in practice —
  both rendered "1945-D 10C · Mercury Dime · Business Strike". Now the
  CoinID leads (it's the value the pick actually writes) with PCGS# / GSID /
  Mintage beneath, which is what makes a candidate checkable against PCGS or
  the Red Book before committing.
- **The conflict block had no exit.** The snapshot stayed at its
  pre-conflict values, so the next save re-detected the identical conflict
  forever; the only escape was backing out, which silently discarded
  everything typed. Now `resolveConflictAndRebaseline()` adopts the
  acknowledged values as the new baseline and refreshes only fields the user
  has NOT touched, so a second save compares clean and lands. The dialog
  also now names any conflicted field the user is *also* editing ("your
  value will replace it if you save again"), which is the informed-consent
  half of that.
- **Two further bugs found while reproducing it, both mine:**
  (a) `applySnapshotToEditForm()`/`showBrowseEditView()` dispatch a real
  `input` event on the cert field to refresh its link button — and the
  delegated touched-field listener could not tell that from typing, so
  **SerNo was marked user-touched the instant the form opened, never
  re-based, and a stale in-memory SerNo got written over a row whose real
  SerNo was blank.** Fixed with `withProgrammaticFormUpdate()`, which
  suppresses touch-recording during app-driven population.
  (b) `showWriteGuard()` left its buttons in the DOM with live handlers
  after the overlay hid, so a stray later click could re-run a **stale**
  acknowledgement and silently roll the snapshot backwards. Buttons are now
  torn down on close.
- **Saving during the baseline read** used to fall through to the
  session-only path and toast "updated for this session only" — during a
  live write run that reads as success while writing nothing. Now it says
  "Still loading … try Save again in a moment" and nudges a retry.
- **Backing out with unsaved edits now warns first** (Keep editing /
  Discard). This is the actual mechanism by which the live typed Notes were
  lost: the conflict dialog promises the edits are still in the form, which
  is true right up until you back out — and backing out is the natural
  thing to try when a save won't go through.
- **Browse detail no longer disagrees with Edit.** Edit re-fetches its row
  every open; Browse renders from `LIVE_COINS`, fetched once per session and
  never refreshed, so the two showed different values for the same coin.
  Rather than give Browse its own re-fetch, `applySnapshotToRecord()` feeds
  the read Edit already performs back onto the shared record, so Browse
  agrees for free.
- Verified headless (+62 assertions, 358 total in the suite): the real
  duplicate pair reproduced end-to-end, no picker on a Grade+Notes save,
  picker still fires on a Designation change, Finish narrowing including the
  `Circulated` fallback, distinguishable picker rows, the conflict loop now
  exiting on the second save with edits landed, SerNo never written from
  stale memory, the shared record refreshing, the mid-load toast, and the
  back-out warning.

**Superseded — real live-device passes against real OneDrive have since
happened; this paragraph originally described a mock-only state before any
of them.** Three live passes ran against the `_Testing` copy workbook, each
finding and fixing real bugs before the next: Parts B–F (Mint Mark/CoinID/
Notes-flash bugs), Part-D2 (the read/write-target mismatch — Bugs A/B — plus
the DB_Coins mock-catalog bug, Bug C), and a final full B–F re-run (per this
section's own earlier instruction that the read/write-target fix invalidated
prior passes) which surfaced the two-MSAL-instance sign-in failure and the
Part-F picker/conflict save loop, both fixed and re-verified live. Ray
confirmed the full checklist (B, C, D, D2, E, F) passed against `_Testing`
with no data-loss or write-safety issues remaining open, and the branch was
merged to main on that basis — see the merge-status correction at the top of
this section. `docs/BROWSE_EDIT_LIVE_RUN_CHECKLIST.md` remains the
step-by-step this was run against, for reference on how a future live pass
(e.g. once a production redirect URI exists) should be structured.
- **The write pass can only run where a local server can run.** The only
  Entra redirect URI registered for `app.html` is
  `http://localhost:8791/app.html`, so the functional verification happens
  in a desktop browser against `python3 -m http.server 8791`. A phone
  pointed at the live GitHub Pages site cannot do this pass at all. To get
  a real Samsung Internet pass on the new UI, use USB port forwarding
  (`chrome://inspect` → Port forwarding, device 8791 → localhost:8791) so
  the phone's origin is still exactly `localhost:8791` and matches the
  registered URI. Registering a production redirect URI would remove this
  constraint but would also make the live site write-capable — a separate
  decision, deliberately not taken as a side effect of this feature.
- **First Edit open in a fresh session bounces to Microsoft sign-in and
  returns to the Dashboard, not the form** (a full page load, so app state
  resets). Expected MSAL redirect behavior, same as the reference-image
  feature's own first fetch — not a bug; reopen the coin and it's silent
  from then on.


#### (continued) Add Coin write layer — Phase 1 (BUILT and merged to main)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 7715-7763).

**Verified headless — 69 assertions (`tests/verify_addcoin_phase1.js`), all
passing, zero page errors**, driven by the mock Graph client. **Correction to
an earlier version of this line:** it claimed the whole suite ran at both
412x915 and 1024x768; it did not — the assertions ran at 412x915 only, and
only the screenshots covered both. That is now true rather than aspirational:
the logic assertions (Graph writes, draft shape, matcher resolution) are
viewport-independent and run once at 412x915, and the three genuinely
layout-sensitive checks — picker candidate count, picker truncation, and
horizontal overflow — are additionally re-run at 1024x768. Coverage:
flag-off inertness (no Graph call, in-memory path intact, nothing written);
the reservation seeing a coin draft that `listSetDrafts()` cannot, `_Docket`
never counting, and each lister ignoring the other's drafts; a full real save
writing `coin.json` at the reserved id with photos uploaded **under the real
CollectionID** and no `__addcoin_draft__` filename leaking; ambiguity opening
the picker with **nothing written before the pick**, the **second** candidate
(not the first) being what gets recorded, cancel writing nothing while keeping
the typed entry; Finish narrowing including the soft All-only fallback;
promote marking ready **without** creating an All row, and reject removing the
draft and its photos; the Docket showing both an unmatched draft and a
handed-off one; the picker not truncating a late differentiator; "Save to
Database" writing a draft in Phase 1 with `savedVia: "direct"`; and a 12-route
nav smoke with no horizontal overflow.
- **Prior committed regression suites could not be re-run** — under the
  convention in force at the time, the `verify_*.js` scripts lived in
  per-session scratchpads and none survived into this session. The nav smoke
  check is a substitute, not an equivalent (same caveat the
  photo-gallery-crop branch carried). **This is what prompted the convention
  change below**, so it should be the last time this caveat is needed.
- **Not verified: any real device, and any real OneDrive session.** This is a
  new write path and needs a live run against `_Testing` before it's trusted —
  see `docs/ADD_COIN_LIVE_RUN_CHECKLIST.md`.

**Four review decisions confirmed by Ray (2026-08-23), recorded so a future
session doesn't reopen them:**
- **"Save to Database" keeps its wording in Phase 1.** The interim banner
  already states that both options write a Staging draft; relabelling the
  button now would only mean relabelling it again at Phase 2 for no real
  benefit.
- **A draft marked ready STAYS VISIBLE in the Docket's research section**
  while it waits on the real `All` row. The Docket's job is "what still needs
  attention," and hiding a genuinely-pending draft would create a silent gap.
  (This had been flagged as my own call rather than a specified behaviour —
  it is now confirmed as intended.)
- **`Finish` stays out of `ALL_WRITABLE_COLUMNS` until Phase 2** — correct not
  to widen Browse Edit's editable scope as a side effect of an Add Coin build.
- **Album assignment / post-save slot-fill is a backlog item, not a phase.**
  UX polish on a working save, no urgency — logged as ParkingLot Row 3 in the
  session log below.


### Add Coin Phase 1: live-run bug-fix pass (BUILT and merged to main)
Ray's own full manual live run against `_Testing` (Parts A–H) found the write
path itself — reservation, the ambiguous-picker data integrity, photo/receipt
handling, network-failure honesty — clean. Everything below is real bugs and
UX findings from that same run, all fixed on this branch, still held for the
same explicit-go-ahead reason as the rest of Phase 1.

**Q3 — real `Ref_Denominations` data loaded, replacing the ~28-row hand-picked
stand-in.** 85 rows, pulled straight from the live workbook and loaded
verbatim (Ray's call), filtered to only the six denom codes Add Coin's own
dropdown supports (a literal filter on the sheet's real `Denomination` column,
not a numismatic judgment call — Silver/Gold/Platinum/Palladium Eagles, Half
Cents, Commemoratives, etc. get no autofill, same as they already didn't).
This is what actually root-caused bug #3 below — the OLD mock's single `$1`
row spanned 1979–2026 as one entry (`"Anthony / Sacagawea / Presidential"`),
so any year in that span resolved to all three names joined together. The
real sheet has each series as its own row with its own real range; 1982 now
resolves to Susan B. Anthony alone (confirmed against this exact data by Ray
before it was loaded). **Real data legitimately has 2+ rows matching the same
denom+year** in two different ways — a genuine transition year (Barber/Mercury
both cover 1916) and the modern era's concurrent dollar-coin proliferation
(Presidential/Native American/American Innovation all ran 2018–2020) — both
handled the same way as the DB_Coins matcher's own firm rule: never guess,
always ask.

**#2/#3 — Description auto-fill: clears on no match, offers a picklist on
2+.** `maybeAutoFillDescription()` used to no-op on zero candidates, leaving
whatever series name was already on screen — a stale answer that reads as
current. Now: 0 candidates clears the field; 1 autofills as before; 2+ leaves
it blank and shows a small inline picker (`#descriptionAmbiguousPanel`) rather
than silently taking the first match — the same failure class the
concatenation bug was, just moved from string-joining to first-of-N. Nothing
is written to Description until the user picks or types their own value.

**#4 — PCGS label decode was hardcoded to the 12-row mock, ignoring
`ENABLE_LIVE_NAV_DATA` entirely.** `handlePcgsLabelApply()` filtered
`FAKE_DB_COINS` directly; reproduced live with a real PCGS# (4908, a real
1916-S Mercury dime) reporting "not found." Now reads `activeDbCoins()`, the
same source every other matcher in the file already uses. **Found and fixed
the same gap in `validVarietiesForCurrentCoin()` alongside it** — CLAUDE.md
had already flagged this one as "worth doing when Add Coin's own write layer
lands" (it drives `isVarietyRecognized()`, which decides the direct-write-vs-
Staging routing — a real coin's variety was being judged against the mock).
`slotMintage()` (Albums) stays on the mock — separate, deliberate, unrelated
call from Ray.

**#7 — investigated in depth; not what it looked like, and not what Ray's own
correction guessed either.** Ray's follow-up note walked the finding back to
"probably the DB_Coins-once-per-load caching behaviour, drop it unless
cleanly reproduced." A clean, deterministic repro was already in hand
(save → Mark ready → open Docket) and it does NOT reproduce a missing entry —
but it surfaced a real, different bug: **the same coin rendered as two
independent, disagreeing records** — once via the draft's own live status
(`stagedHandedOff`, "ready for reconciliation") and once via a separate,
static Docket entry (`appendDocketEntry`'s pre-existing "no-db-coins-match"
push, which fired unconditionally on every save regardless of destination).
Root cause: Phase 1 made BOTH "Save to Database" and "Save to Staging" write
the same kind of coin.json draft, and the draft's own presence in the hub
already represents "needs a catalog entry" — so the old separate push became
pure duplication the moment that happened, and the two records could disagree
once the draft's own status moved on (Draft → Ready) with no way to update or
retract the earlier static entry. **Fixed by removing the redundant push
entirely on the real path** — the draft is the single source of truth there;
the flag-off mock path is unchanged, since a `FAKE_COINS`-destined mock save
has no draft-based representation to duplicate.

**#8 — Docket research rows never showed CollectionID for a staged coin with
no match**, unlike `docketEntryLabel()` (used a few lines below in the same
render for real Docket entries), which already did. Different label-building
code path, same missing field — now shown consistently.

**#9 — Reject was the only way back from "Marked ready," and Reject is
permanent (deletes the draft + photos).** Marking ready a beat too early is
an easy, ungated mistake in Phase 1 (there's no reconciliation check to catch
it). New `revertCoinDraftToDraft()`/`revertStagedCoinToDraft()` — Staging
Review now shows **"Revert to Draft"** in place of the old disabled "Ready"
button, touching only `status`; the CollectionID, photos, and every captured
field are untouched, so a revert is exactly as safe as the mark-ready it
undoes.

**#1 — Add Coin didn't reset between visits.** Reopening it via plain nav
(not a save, not an album/wishlist deep-link) showed whatever was left from a
prior unsaved session — every field, the photo thumbnails, all of it. New
`resetAddCoinForm()`, called unconditionally at the top of `navigate()`'s
`"addcoin"` branch, resets every field, photo slot, gallery entry, and match/
picker state. **The one real subtlety**: an album/wishlist deep-link sets its
context variable and calls `navigate("addcoin")`, then calls
`applyAlbumContext()`/`applyWishlistContext()` **right after** `navigate()`
returns — so the reset had to clear the two banners' visibility without
nulling the `albumContext`/`wishlistContext` variables themselves, or it would
null out a deep-link's own pending context from under it. Verified directly:
a plain re-entry starts fully blank, and a deep-link straight after still
prefills correctly. `resetAddCoinAfterSave()` now calls this same function
instead of its own narrower clear, so a second coin entered in the same
session also starts clean — a second, smaller fix in its own right.

**#12/#14/Q4 — picking an ambiguous-match candidate used to save immediately,
with no way to reconsider, and the live banner could disagree with the
picker.** Both are really one root cause: the banner and the save-time
resolution were two independently-updated pieces of state that could drift.
Fixed with one consolidated source of truth, `currentAddCoinMatchState()`:
- Picking a candidate now **resolves and stops** — it updates
  `addCoinResolvedPick` (the pick plus a snapshot of the exact identity it
  was picked for), refreshes the live banner to show it immediately (closing
  the #14 desync), toasts "press Save again to continue," and returns. **It
  does not save.**
- The **next** Save click re-derives match state, finds the still-valid
  resolved pick (identity unchanged), and proceeds straight to save with no
  picker shown a second time.
- **Any relevant field changing invalidates the pick** — the snapshot no
  longer matches, so a fresh identity re-derives candidates normally rather
  than silently reusing a stale choice.
- Verified end-to-end: nothing written between the pick and the second Save
  click; the banner shows the CHOSEN candidate (picked the second option
  deliberately, so "still shows the first" couldn't pass by accident); the
  second Save click writes the remembered pick without re-opening the picker.

**#11 — the picker's "Cancel — don't save yet" had no visual weight**
(`background:none; border:none`, blending into the page). Given a real
bordered/background button matching the candidate cards it sits beside.

**#13 — the DB_Coins match banners sat ABOVE Finish**, even though Finish is
one of the fields the match is actually computed from — recording it, then
watching the banner react, is the order that makes sense. Finish moved above
the banners.

**#15 — `Circulated` was selectable as an Add Coin Finish option**,
contradicting the Aug 17 session's established rule that Circulated is a
wear-state/condition, not a strike method (tolerated only in 139 legacy `All`
rows, never generated going forward). Removed from the dropdown; the
matcher's own soft-fallback tolerance for an All-only Finish value is
unchanged — a legacy `Circulated` row still matches correctly, it just can't
be newly created from this form.

**#6/Q2 — GradeSource baked into the coin's own flip-card label, even for a
non-certified estimate** (e.g. "VF-30 Seller"). Ray's resolution: keep it on
the graphic **only when it's a real third-party grading service** (PCGS/NGC/
ICG/etc., via the existing `isServiceGradeSource()`) — a raw/Seller/Owner/
AI-est-sourced grade shows Grade alone. **Scoped correctly after checking
both render paths**: this only ever applied to Add Coin's own live-entry
corner (`updateFlipLabels()`, *(removed 23 Oct 2026, commit 6 `c6f0ba0`)* with the preview card) — the SAVED-coin flip corner
(`applyFlipCorners()`, Spotlight/Browse detail) was already Grade+Designation
only and has never put GradeSource on the graphic at all; `gradeWithSourceText()`
(Overview/detail text, "MS-64 (PCGS)") is the separate display that already
shows GradeSource unconditionally, exactly as Q2 asked it to keep doing. One
edit, correctly scoped — not the two-surface change originally assumed before
checking the code.

**#5 — couldn't drag-reposition inside the circular crop guide.** Root-caused,
not guess-patched: for a perfectly SQUARE source (exactly what Stage 1's
background crop hands the adjuster for a flip source), `recomputePhotoAdjustBaseScale()`'s
"cover" fit gives **zero pixels of overscan at exactly 100% zoom** — there is
nothing to drag into, by the math; the clamp itself (`clampPhotoAdjustOffsets()`,
"can't pan past its own edges") is correct and untouched. Fixed by defaulting
the adjuster to a small above-100% starting zoom (110%) so a real ~12px of pan
headroom always exists without forcing a zoom action first; the slider's own
100–300% range and every other control are unchanged.

**#16 — Staging Review flattened "needs a decision" and "already handled"
into one list**, with a Draft row (needs Mark ready/Reject) visually
identical to a Ready row (nothing left to decide). Split into two labeled
sections, same section-label convention used elsewhere in this app — "Needs
a decision" first, "Marked ready — waiting on reconciliation" second, newest
first within each. The mock build never shows the second section (a
`FAKE_STAGING` row has no Ready status to begin with).

**#17 — Docket labels read "Description · Year-Mint," backwards from how a
coin is normally referenced** ("1916-D Mercury Dime," not "Mercury Dime
1916-D"). Year-Mint now leads in all three label-building sites
(`docketEntryLabel()`, the staged-no-match row, the handed-off-draft row) —
kept consistent across all of them, not just the one Ray happened to see.

**#10/#18 — toasts disappeared before they could reliably be read**, and
identity fields (Year especially) showed the browser's own autocomplete
suggestions. Toast duration now scales with message length (`1800 + 40ms/char`,
clamped 2600–7000ms) instead of one fixed 2600ms for every toast — a short
toast stays snappy, a real save confirmation or error message gets the time
it needs. `autocomplete="off"` added to Year, Description, Vendor, Storage
Location, Container, Cert/Type Number, and the PCGS Label field.

**A real bug in the fix itself, caught by screenshot, not by the test
suite.** The new `#descriptionAmbiguousPanel` and `#addCoinMatchAmbiguousPanel`
were built with `class="case hidden"`, copying two PRE-EXISTING elements'
visual look — but **this file has no generic `.hidden` rule**; every
`.hidden` is scoped to its own component (documented in CLAUDE.md already,
after being hit before). The two elements this was copied from
(`#pcgsLabelAmbiguousPanel`, `#designationAmbiguousPanel`) have their own
ID-scoped `.hidden` rules; the two new ones didn't, so `classList.contains("hidden")`
read `true` while the panel stayed fully visible and laid out on the page —
visible in a screenshot, invisible to `classList`-only assertions. **This
exposed a real gap in the committed suite itself**: every assertion checking
these panels checked `classList` state, never actual rendered visibility,
which is exactly what let this slip through 133 passing assertions. Fixed
both: added the two missing scoped rules, and added a dedicated
`getComputedStyle().display` check (confirmed to actually fail without the
CSS fix, not just pass trivially) so this class of bug can't hide behind a
green suite again.

**19 — logged, not built.** Cert/serial duplicate-check suggestion recorded
as ParkingLot Row 4 in the session log below — idea only, no design work.

**Verified headless — 137 assertions across two suites (`addcoin-phase1`:
73, `addcoin-bugfixes`: 64), all passing, zero page errors**, at 412×915 with
the three genuinely layout-sensitive checks re-run at 1024×768. Every fix
above has its own committed assertion(s); the visibility-gap fix additionally
includes a negative-control check (confirmed to fail with the bug
reintroduced). Screenshots reviewed at both viewports for the ambiguous
picker (open and post-pick states) and Staging Review's two-section split —
no horizontal overflow either width.

**Not verified: any real device, any real OneDrive session against these
specific fixes.** `docs/ADD_COIN_LIVE_RUN_CHECKLIST.md` covers the original
Phase 1 build; a second pass against these fixes specifically hasn't run yet.


### Add Coin Phase 1: second live-run retest pass (BUILT and merged to main)
Ray retested the first bug-fix pass live against `_Testing` and confirmed
most of it working; this round covers the new findings from that retest.
Six items fixed; one (#2) investigated and confirmed working-as-designed
rather than changed; the structural Docket/Staging-Review IA redesign Ray
flagged as a separate idea is deliberately **not** part of this round — it
stays its own future Opus-tier proposal, held for explicit go-ahead, per
Ray's own framing when he sent this retest.

- **#1 — PCGS label decode is now authoritative, not just a starting
  point.** A decoded label already identifies exactly one DB_Coins row via
  its own SPEC/PCGS# lookup — stronger evidence than the general denom+
  year+mint+variety+finish+designation matcher, which can still legitimately
  see 2+ candidates for that same identity on real data (real base-key
  duplicates are common — see the Part-F live-pass note above, ~43% of
  DB_Coins). Before this fix, decoding a label filled the form correctly but
  Save still re-derived candidates from scratch and could pop the ambiguous
  picker for a coin that had just been unambiguously decoded.
  `resolvePcgsLabelMatch()` now sets `addCoinResolvedPick` (the same
  "remembered pick" mechanism a manual picker choice already uses, Q4) the
  moment it resolves, so Save takes the already-resolved shortcut with no
  picker shown. Still invalidated by any later identity-field edit, exactly
  like a manual pick.
- **#2 — Finish's soft fallback is deliberate, hardened behavior, not a
  bug.** Ray's report described Finish "not narrowing" the match in some
  case. Read the matcher directly rather than changing it: `dbCoinsCandidatesFor()`'s
  Finish tier is a SOFT narrow — if the recorded Finish matches zero
  candidates (e.g. an All-only value like `Circulated` that DB_Coins simply
  doesn't carry), it falls back to the FULL candidate set rather than to
  zero. This is exactly the Part-F live-pass fix from the Browse Edit write
  layer (documented above): a strict filter would turn a good match into a
  false miss and wrongly clear/deny a CoinID link for real rows. Making
  Finish narrow strictly would reintroduce that exact regression. No code
  change here — flagging it as intentional so a future session doesn't
  "fix" it back into the bug it was built to avoid.
- **#4 — the ambiguous picker now offers "None of these — save as
  unmatched."** Previously the 2+ picker forced a choice among the listed
  candidates with no way to say none of them are actually right — a real
  gap when the catalog rows shown are all wrong for a genuinely new
  variety. Clicking it resolves exactly like a real 0-candidate miss:
  CoinID left pending, routed to Docket research, same as any other
  unmatched save. Sits alongside the existing Cancel button; both are torn
  down/reset the same way (`addCoinMatchNoneHandler`, same discipline
  `addCoinMatchCancelHandler` already uses).
- **#5 — the series (Description) ambiguous picker is now persistent/
  reconsiderable, not one-shot.** It used to hide itself the instant a
  series was picked — reconsidering meant re-touching Year/Denom to
  re-trigger the whole lookup from scratch. It now stays open as long as
  the same genuine multi-series ambiguity exists, so changing your mind is
  just picking a different option from the same dropdown. It still closes
  the normal way once the ambiguity itself resolves (0/1 candidates on a
  later Year/Denom change) or the user types directly into Description (a
  real manual override).
- **#6 — the Dashboard's "N coins awaiting your decision" tile undercounted
  relative to what Staging Review's own "Needs a decision" section actually
  shows.** Root cause: the tile counted only Draft-status coins WITH a
  DB_Coins match (`stagingActionable`), while Staging Review's own
  Draft-vs-Ready split (added in the prior round) shows every Draft-status
  coin under "Needs a decision" regardless of match — a real status-alone
  signal is what actually gates that screen (Mark ready/Reject apply either
  way), same as `draftSets`' own count above has no confidence axis at all.
  Fixed by counting all Draft-status coins for the real-draft path
  (`addCoinWriteEnabled()`), matching Staging Review exactly. **An unmatched
  Draft coin now counts in this aggregate tile AND still gets its own
  individual "Staged, no DB_Coins match" research row** (unchanged,
  `stagingResearch` — bug #8's territory from the first retest round) —
  deliberately NOT collapsed into one or the other, since "needs a
  decision" and "no catalog entry yet" are two independently-true facts
  about the same coin, not two sources disagreeing about its status the way
  the original #7 bug was. The match-based split is kept as-is for the
  flag-off mock path (`FAKE_STAGING` predates Phase 1's real drafts and has
  no Ready status of its own) — this only changes real-draft behavior.
- **#7 (this round) — helper-text spacing overlapped the field above it.**
  Five `.placeholder-note` elements (the PCGS-grader note, the manual
  Cert/Type Number note, and the notes under Variety, Finish, and Error)
  carried an inline `margin:-8px 0 16px;` override — a negative top margin
  large enough to overlap the `<select>`/`<input>` directly above, which
  itself has no bottom margin of its own. Changed to `margin:4px 0 16px;`
  (a small positive gap) on all five; verified via screenshot at both
  viewports that the note text now sits clear of the field's own border.
- **#9 — Reject had no confirmation, despite being permanent on the real
  path.** Reject deletes a draft's entire Staging folder — JSON and every
  captured photo/receipt — with no undo, unlike the Revert-to-Draft escape
  hatch the prior round added for an over-eager "Mark ready." `rejectStagedCoin()`
  now opens the shared `showWriteGuard()` dialog first (same shell Browse
  Edit's own guard dialogs use), naming what's actually at stake; the real
  deletion moved to a new `performRejectStagedCoin()`, called only from the
  dialog's Reject button. The flag-off mock path gets the same confirmation
  shell with mockup-appropriate wording (nothing is actually written either
  way, so the message says so).
- **#11 — fast/repeated tapping on action buttons could visibly
  text-select their own label.** Added `user-select: none` to `.save-btn`
  and `.staging-btn` (Save/Mark ready/Reject/the picker's Cancel/None) —
  chrome, not editable content, so nothing about text inputs, textareas, or
  Notes/Description fields was touched. Deliberately NOT applied to the
  ambiguous-picker candidate cards themselves (`.ambiguous-match`) — their
  text (CoinID/PCGS#/Mintage) is exactly what Ray might want to select and
  copy to cross-check against PCGS/the Red Book before picking.
- **Flagged for Ray's decision, not built this round** (real tension with
  established rules, per this project's "investigate, don't guess" standing
  instruction):
  - **#3 (series-picker narrowing DB_Coins candidates)** — would mean
    letting `Description`/series-name text narrow a DB_Coins match, which
    runs directly against the Add Coin Phase 1 "commemorative/Description
    blind spot" assessment above (deliberately NOT folded into
    `dbCoinsCandidatesFor()`, since `All.Description` and
    `DB_Coins.Description` are different sources with no guaranteed
    correspondence, and the project's own firm rule is "2+ always reaches a
    human"). Needs Ray's explicit call before any code changes here.
  - **#8 (denomination dropdown breadth)** — CLAUDE.md already carries a
    standing deferral for exactly this class of gap ("half dimes/three-cent
    pieces will need their own Denomination code... deal with it when the
    first one is catalogued" — see "Browse filters" above); widening Add
    Coin's dropdown is a scope decision for Ray, not an assumed default.
  - **#12–#16 (open design questions from the retest)** — discussion only,
    no code without further direction, consistent with every other
    "needs Ray's explicit decision" item in this file.
  - The structural **Docket/Staging-Review IA redesign** Ray separately
    proposed is explicitly out of scope for this round, per his own
    framing — stays a distinct, larger, Opus-tier effort held for go-ahead.
- **Verified headless — 9 new assertions added to `verify_addcoin_bugfixes.js`**
  (R1/R4/R6/R9), all passing, alongside every prior assertion from both
  committed Add Coin suites re-run clean (148 total across the two suites,
  zero failures) — R1 covers the PCGS-decode-authoritative fix directly
  against a synthetic real base-key duplicate; R4 covers the "None of
  these" button existing, the panel genuinely visible before it's clicked,
  and its resolution matching a real 0-match outcome; R6 covers the
  Dashboard tile counting both a matched and an unmatched Draft coin while
  the unmatched one still separately appears in research; R9 covers the
  full reject-confirmation round trip (dialog shown, nothing deleted on
  open, Cancel leaves the draft untouched, confirming actually deletes it).
  Three existing assertions (3.5, VIS.4 in `addcoin-bugfixes`) were updated
  to assert the panel STAYS open after a pick, following the #5 design
  change rather than weakening the suite; two direct-logic tests (21.2 in
  `addcoin-bugfixes`, F6 in `addcoin-phase1`) were updated to call the new
  `performRejectStagedCoin()` directly, since they test the reservation/
  deletion logic itself rather than the new confirmation dialog. Screenshots
  reviewed at both viewports for the description picker's new spacing, the
  ambiguous picker's new "None of these" button, and the reject
  confirmation dialog — no horizontal overflow at either width.
- **Not verified: any real device, any real OneDrive session against these
  specific fixes** — same standing caveat as the first bug-fix round.


### Add Coin Phase 1: batch 4 (BUILT and merged to main)
Three findings from Ray's live spot-check of batch 3's Category-narrowing
fix against the real `_Testing` copy (2017 American Silver Eagle, blank
Finish, correctly narrowed to 2 genuine candidates; Finish=Proof resolved
to one — confirming the fix itself works).

- **#1 — Bullion toggle relocated.** Moved from directly above the
  Denomination field to below the main data-entry window (after Notes,
  before the collapsed Purchase Details/Storage rows) — it's a mode switch
  for the Denomination field, not a field of its own, and reads better as
  a standalone control after the identification fields than interrupting
  them. No behavior change — same element id, same listener, same
  `populateAddCoinDenominationDropdown()` call.
  **Superseded by batch 6 below — corrected back to directly above
  Denomination** after Ray saw it live; kept here only for history.
- **#2 — series picker not Category-aware, a real bug.** After picking
  "American Silver Eagle" via the Bullion toggle, editing Year afterward
  re-triggered the classic denom+year series lookup against the shared
  `"$1"` code (which legitimately spans Peace/Morgan/Presidential/Native
  American dollars) and popped the classic-dollar ambiguous picker for a
  coin whose identity Category had already fully resolved — the exact same
  class of gap the DB_Coins matcher's own Category tier (batch 3) fixed,
  just on the Description auto-fill function instead. Root cause: the
  denomination change handler's own bullion branch correctly sets
  Description and skips the lookup, but `maybeAutoFillDescription()` is
  ALSO called from the Year field's own input listener with no Category
  awareness at all. **Fixed at the function itself, not the call site** —
  `maybeAutoFillDescription()` now returns immediately when
  `addCoinBullionCategory` is set, so every caller (present or future) is
  protected the same way, not just the one call site that happened to
  trigger this repro.
- **#3 — Finish dropdown didn't match real DB_Coins values.** Confirmed
  against the real catalog: missing `Burnished` (48 rows, confirmed
  against a real `C-2017-W-$1-03` case), `Satin Finish` (88 rows),
  `Enhanced Reverse Proof` (2 rows), `Enhanced Uncirculated` (2 rows — a
  distinct, real West Point 75th Anniversary product name, kept as its own
  option, never conflated with plain "Uncirculated"). `Specimen` removed —
  matches zero real rows. Fixed the same way the Denomination dropdown was
  fixed: options now reflect the real, confirmed catalog rather than a
  hand-guessed list.
  - **Explicitly NOT added: plain `Uncirculated` (172 rows).** Same class
    of issue as the already-confirmed `Circulated` case (139 rows,
    "Browse Edit real write layer" above) at larger scale — a
    condition-vs-finish data mix-up in the catalog itself, a future
    data-cleanup project, not a dropdown gap. Both stay excluded from the
    dropdown; the matcher's existing soft-fallback-to-full-list behavior
    (`dbCoinsCandidatesFor()`'s Finish tier) already covers a blank Finish
    for those rows, unchanged.
  - `FINISH_GRADE_PREFIX` (the PCGS-label-decode grade-prefix table) was
    deliberately left untouched — it defaults unrecognized Finish values to
    `"MS"`, a safe fallback, and none of the four new values were reported
    as needing a specific prefix. Out of scope for this pass; flag if a
    real coin with one of these Finishes is ever decoded from a PCGS label
    and needs a different prefix.
- Verified headless — new suite `tests/verify_batch4.js` (22 assertions,
  all passing): the toggle's new DOM position (after Notes, before
  Purchase Details, no longer immediately above Denomination); the series
  picker never firing after a Bullion pick, including after an explicit
  Year edit and a direct `maybeAutoFillDescription()` call; a control case
  confirming a genuine classic multi-series year still shows the picker
  (the fix is scoped to Bullion picks only, not a blanket suppression); all
  8 confirmed Finish values present, `Specimen`/`Uncirculated`/`Circulated`
  all absent, exactly 9 options total; and `Enhanced Uncirculated`
  narrowing the Finish tier correctly without being conflated with
  Business Strike. Screenshots reviewed at both viewports (a real Bullion
  pick with the toggle checked) confirming the new layout and no overflow/
  collision. All 3 prior suites (202 assertions) re-run clean alongside it
  — 224 total, zero failures.
- **Not verified: any real device, any real OneDrive session against these
  specific fixes** — same standing caveat as every prior round in this
  feature.


### Add Coin Phase 1: batch 6 (BUILT and merged to main)
Two findings from Ray's live-device review of batch 4's changes.

- **#1 — Bullion toggle placement, corrected.** Batch 4's move (checkbox +
  note down near Notes, before Purchase Details) read wrong in hand — the
  checkbox determines how Denomination/Category get captured together, so
  it needs to sit next to that field, not disconnected from it near the
  bottom of the identification block. **Moved back to directly above
  Denomination**, exactly its pre-batch-4 position. No behavior change —
  same element id, same listener, same
  `populateAddCoinDenominationDropdown()` call; markup position only, both
  times.
  **Superseded by batch 7 below — corrected again, per Ray's explicit,
  twice-repeated instruction**, to sit UNDERNEATH the Denomination dropdown
  itself rather than sandwiched between the label and the dropdown. This
  round's placement was a reasonable-looking guess at "the original spot"
  that turned out not to be what Ray meant — kept here only for history.
- **#2 — Grading Service section header: kept, not dropped.** Investigated
  rather than guessed: the "GRADING SERVICE (OPTIONAL)" header currently
  reads as sitting above a single field (Grader) because the section's
  other real content — the PCGS Label # block, the non-PCGS grader note,
  and the Cert/Type Number row — is conditionally hidden (`display:none`)
  until a Grader is actually picked. So at rest it *looks* like a
  one-field section, but it already isn't one — those three blocks are
  real, already-built content under this same header, not "planned soon"
  fields that would need to arrive first to justify it. Dropping the
  header (option b) would either leave the PCGS Label block/Cert-Type-
  Number row with no header of their own once revealed, or require
  re-adding one at that point anyway — so option (a) was the clear fit.
  **No code change** — the header stays exactly as it is.
  **Superseded by batch 7 below — Ray corrected this call too.** His actual
  objection wasn't about whether more fields exist under the hood; it's
  that the header visually reads as though Denomination/Year/etc. below it
  all fall under "Grading Service," which is genuinely confusing regardless
  of what's conditionally hidden. He also named a larger goal (matching
  Edit Coin's page structure) that this task's own analysis should have
  surfaced as a real, decidable factor rather than reasoning about the
  header in isolation.
- Verified headless: `tests/verify_batch4.js`'s own toggle-position
  assertions were rewritten to check the corrected (original) placement,
  following the real design change rather than weakening the suite (batch
  4's now-superseded assertions are gone, not left conflicting). 223
  assertions across all 4 suites, zero failures. Screenshots reviewed at
  both viewports confirming the toggle sits directly under the
  Denomination label with no overflow.
- **Not verified: any real device against this specific correction** —
  same standing caveat as every prior round in this feature; this round
  itself was a direct response to Ray's own device review, so the loop is
  already closer than usual.


### Add Coin Phase 1: batch 7 (BUILT and merged to main)
Ray corrected both of batch 6's calls directly, after explicitly asking to
be consulted before either was touched again — this round is exactly what
he confirmed, not a further guess.

- **#1 — Bullion toggle: the ACTUAL original/intended spot.** Every prior
  placement (original build, batch 3, batch 6) put the checkbox BETWEEN the
  "Denomination" `<label>` and the `<select>` itself. Ray's ask, stated
  twice, was for it to sit AFTER the dropdown — `<label>Denomination</label>
  <select>...</select>` first, THEN the checkbox + its explanatory note,
  THEN Year. No behavior change, markup position only.
- **#2 — "GRADING SERVICE (OPTIONAL)" bold section-label removed, `Grader`
  renamed to `Grading Service`.** Ray's confirmed direction is his own
  option (b) from the batch-6 question, in full — not just the header
  removal: drop the bold header, AND rename the field's own label from
  "Grader" to "Grading Service," styled the same plain way any other field
  label is (`<label>Grading Service</label>`, no special styling) — one
  clearly-labeled field instead of two mismatched headers. **Position is
  UNCHANGED** — still the first real field in the form, ahead of
  Denomination, since a grader needs to be picked before the PCGS
  label-decode flow can run. Only the element id (`addCoinGrader`) and
  every function that reads it are untouched — this is a visible label
  text change only, same "rename is label-only" pattern as every other
  pure relabel in this file. A real restructure to match Edit Coin's
  accordion-section layout (with Grading Service pulled into its own
  bounded card) is Ray's stated bigger goal — logged as ParkingLot Row 5
  above, explicitly scoped as a SEPARATE future task, not started here.
  **Since BUILT** — see "Add Coin: accordion restructure" below; ParkingLot
  Row 5 is resolved.
- Verified headless: `tests/verify_batch4.js`'s toggle-position assertions
  rewritten again for the corrected (AFTER-the-dropdown) placement, plus
  three assertions confirming no `.section-label` element anywhere in Add
  Coin still reads "Grading Service," that the field's own label text is
  now genuinely "Grading Service" (not left as "Grader"), and that its
  position ahead of Denomination is unchanged. 227 assertions across all 4
  suites, zero failures. Screenshots reviewed at both viewports (phone +
  tablet) — "Grading Service" sits plain near the top with no bold header
  above it, Denomination dropdown is immediately followed by the Bullion
  checkbox and its note, no overflow at either width.
- **Not verified: any real device against this specific correction** —
  same standing caveat as every round in this feature. **This time the
  placement was confirmed in writing by Ray before building**, not guessed
  — if it's still wrong, that's new information from an actual device, not
  a repeat of the same back-and-forth.


### Docket: "Other / Requires Photos" read FAKE_COINS in a live session (BUILT and merged to main)
Real bug from Ray's report: the Docket's photo-gap section showed fake/demo
coins in a live session — the same failure pattern as the Spotlight bug
fixed on `claude/live-data-and-composition-fixes` (a data source with no
live path), and the same class of bug this codebase had already hit once
elsewhere in the Docket (`applyDocketResolution()` reading `FAKE_COINS`
instead of `activeCoins()`, fixed in the Phase 2 write-path work).

**Root cause, traced rather than guessed: exactly one line, and it's
distinct from the previously-fixed instance.** `renderNeedsAttentionHub()`'s
photo-gap block read `FAKE_COINS.filter(c => !c.rollId && coinMissingPhoto(c)
&& !dismissedCoinPhotoGaps.has(c.id))` directly — unconditionally, with no
live path at all. This is a DIFFERENT function/call site from the earlier
`applyDocketResolution()` fix (that one resolves a Docket queue entry's
CoinID re-link; this one builds the "Other / Requires Photos" row list) —
the same class of gap recurring in a second, unrelated spot, not a
regression of the earlier fix.

**The missing-photo CHECK ITSELF (`coinMissingPhoto()`) needed NO change —
confirmed by tracing it, not assumed.** Per the explicit instruction not to
assume a "missing photo" report is real without tracing it to a live row:
- `coinMissingPhoto()` already checks `storedPhotoRowsFor(coin.id)` FIRST —
  the real Photos-tab index (`LIVE_PHOTOS`, populated by the just-merged
  photo/receipt write layer) — before ever falling back to the coin's own
  `hasObversePhoto`/`hasReversePhoto` flags.
- Those flags themselves are **real** for a live coin, not a demo-only
  field: `mapWorkbookRowToCoin()` sets them straight from
  `!!colVal(row, "Obverse")` / `!!colVal(row, "Reverse")` — the real
  All-sheet flat photo columns. `FAKE_COINS`' own sparse
  `hasObversePhoto`/`hasReversePhoto` fields are a demo-only stand-in
  (documented in this file as deliberately sparse so the demo hub doesn't
  flood with ~20 rows at once) — but they were never what a LIVE coin
  reads; a live coin was always going through the real column mapping.
  **So the check function was correct all along; only the array being
  iterated (`FAKE_COINS` instead of `activeCoins()`) was wrong.**

**Fix**: `FAKE_COINS.filter(...)` → `activeCoins().filter(...)`, one line,
same filter shape (`!c.rollId && coinMissingPhoto(c) &&
!dismissedCoinPhotoGaps.has(c.id)`) — Rolls still excluded (Q5b, unchanged),
a Set-bundle row still included (its own single-photo check inside
`coinMissingPhoto()` is untouched), and `dismissedCoinPhotoGaps` (the
in-memory, ephemeral dismissal set) still applies unchanged whether the IDs
come from live or demo data.

**Verified headless — new committed suite
`tests/verify_docket_missing_photos_live.js` (9 assertions), all passing;
1276 across 30 suites, zero failures, zero page errors.** Covers: a real
live coin with no photo appearing in the Docket's photo-gap list; a real
live coin with both photos correctly excluded; no `FAKE_COINS` demo name
leaking into a live session's list (the exact reported symptom); the check
itself correctly reading a live coin's real state through BOTH signals —
a coin whose photos exist only in the real Photos-tab index (no coin-level
flag at all) is correctly recognized as not missing, and a coin with
neither signal is correctly still flagged; demo mode is unchanged (no live
override still shows `FAKE_COINS`' own gaps); and a nav/overflow smoke
check. **Two verified negative controls**: an in-page probe re-deriving the
pre-fix `FAKE_COINS.filter(...)` reproduces demo names regardless of the
live override; and — the stronger one — reverting the actual app-level fix
(`activeCoins()` back to `FAKE_COINS` in the real function) reproduces the
exact reported symptom and fails the two assertions built to catch it.
Screenshot reviewed at 412px: only the live coin genuinely missing a photo
appears in the section, with Dismiss intact.
- **Not verified: any real device, any real OneDrive session.**
- **Reviewed and approved by Ray, merged to main as-is, no changes.**


### CACBean visibility fix, read-only Overview row, $ on Purchase/Shipping, Catalog composition, collision-based sizing (BUILT and merged to main)
Batch of small, independent fixes/polish from live testing. Eight items
total; items 1-6 below are built. Item 7 (reverse-flip investigation) needed
no code — see its own note. Item 8 (Mint Mark "None (Other)") is a separate,
still-open item pending a data-population check — see the end of this
section.

**1. Real bug fix: CAC Bean checkboxes were hidden specifically for PCGS in
Add Coin.** `#certTypeNumberRow` — holding BOTH the manual Cert/Type Number
input and the CAC checkboxes — only shows when `grader && grader !== "PCGS"`,
correct for the cert input (PCGS's cert is auto-decoded from the label, no
manual entry needed) but backwards for CAC, which almost exclusively
stickers PCGS/NGC coins. The checkboxes were nested inside that same
conditional block, so they were hidden exactly when PCGS was picked. Fixed
by pulling `.cac-bean-group` out into its own row (`#cacBeanRow`), gated on
`grader` truthy alone (in `applyGraderDependentVisibility()`) — shown for
ANY grader, hidden only when Grader is blank (a raw/ungraded coin can't
carry a CAC bean). Browse Edit's own checkboxes were already unconditional
and needed no fix.

**2. "CAC Bean" caption added to the checkbox pair, both forms.** An
internal `.cac-bean-heading` span inside `.cac-bean-group` itself (not a
block-level `<label>` above it) — deliberately, so the same markup works
correctly whether the group is its own standalone row (Add Coin, forced by
item 1's fix) or still inline inside Browse Edit's `.cert-badge-row`
alongside the cert input and lookup-link icon, where a block-level label
would have misread as labeling the whole row rather than just the
checkboxes. Browse Edit's row structure is otherwise completely untouched —
no structural symmetry was required between the two forms, only the visible
caption.

**3. CACBean now read-only in Browse detail's Overview — a deliberate
reversal of the earlier "edit-surface only" scope call, not an oversight.**
`overviewRows.push(["CAC Bean", coin.cacBean])`, same pattern as Grade/
Designation just above it: a plain fact row, omitted entirely when blank,
scoped to individual coins only (a Set bundle has no CAC status of its own).

**4. `$` prefix extended to Purchase Price and Shipping Cost, every form
instance of both fields** — the same `.currency-input-row`/`.currency-prefix`
treatment Value already had. Ten fields across five forms (Browse Edit, Edit
Set, Wishlist, Add Coin, Add Set). **Visual only, no rounding** — unlike
Value, none of these ten fields are ever populated from a computed source
(confirmed in an earlier round and re-confirmed here with a direct test:
`roundToCents()`'s call sites are completely untouched by this item), so
they still populate verbatim, exactly as typed/stored.

**5. Composition wired into the Catalog grid-mini flip card.**
`renderBrowseGrid()` is a genuinely separate render path from
`applyFlipCorners()` (Browse detail/Spotlight), which is why it never
inherited Composition automatically when that was first built — confirmed
via source before assuming it was a shared path. A new BR span added to the
card markup, wired to the exact same `setCompositionCornerText()` /
`preciousMetalCompositionFor()` the full flip-frame uses — same rule
(precious metal only), same stacking mechanism, at whatever size cascades to
it (14px, the existing grid-mini corner font). The retired `.set-child-grid`
mini-flips (dead CSS, confirmed via grep — no JS references it, consistent
with CLAUDE.md's own "RETIRED" note for that surface) were correctly left
untouched.

**6. Composition font-size: collision-based, per-instance — supersedes the
blanket smaller size.** The prior round's `#browseDetailBR, #spotlightBR {
font-size: 22px; }` shrank EVERY coin's composition text uniformly,
regardless of whether that specific coin's actual value needed it. Removed
entirely. `setCompositionCornerText()` now: reads the corner's own natural
size fresh from computed style (27px full flip-frame, 14px Catalog
grid-mini — no context-specific hardcoding, one function serves both);
renders at that natural size first; measures `scrollWidth > clientWidth`
(the same measurement already used everywhere else in this corner system —
`compositionLabelCandidates`, `renderTypeDenomCorner`'s shortening — per
Ray's explicit confirmation this is what "per-instance overflow" meant, not
new BL-vs-BR box-overlap machinery); and only if it doesn't fit, steps down
through `COMPOSITION_SHRINK_STEPS = [1, 0.82, 0.67]` (fractions of the
natural size), re-rendering and re-measuring at each step, stopping the
moment it fits.
- **Real, measured result, not assumed: every realistic single-metal
  composition now fits at the FULL natural size once stacked** — the
  two-line layout from the prior round already solved the width problem for
  the common case; the blanket 22px shrink was penalizing legibility for
  coins that never needed it. Verified directly: "90% Silver", ".9995 Fine
  Palladium", "99.95% Platinum", and "40% Silver" all render at 27px with no
  shrink applied.
- **A genuine side effect, also measured**: the bimetallic single-line
  fallback's own previously-documented "~20px overflow, known accepted gap"
  (from the composition-restack round) is now CLOSED for the demonstrated
  case — "50% Gold, 50% Silver" fits at 18.09px (the 67% step) on the real
  flip-frame. This mechanism was built for item 6, not for that case
  specifically, but resolves it as a side effect. Only a genuinely extreme
  two-metal string (long alloy names on both sides) can still outrun the
  smallest step — confirmed directly by forcing one; it degrades to the
  smallest step and stops, no infinite loop, same "known, accepted gap for
  an extreme case" posture as everywhere else in this file.
- **`el.style.fontSize` is cleared FIRST**, before measuring the natural
  size — `browseDetailBR`/`spotlightBR`/each Catalog card's own BR span are
  real DOM elements reused across many different coins as Ray browses/
  flips, so a previous coin's shrink must never leak into the next coin's
  render or its "natural size" measurement. Verified directly: rendering an
  extreme value then a short one back-to-back on the same reused element
  returns cleanly to full size for the second coin.

**Verified headless — both existing suites extended, not forked**:
`tests/verify_cacbean_and_value_rounding.js` (50 assertions, was 38) gained
items 1-4's coverage — the real bug repro (visible for PCGS specifically,
still hidden with no grader, still visible for NGC), the caption on both
forms, the Overview row for Gold/Green/blank-omitted, and all ten currency
fields wrapped with a verified-verbatim (non-rounded) populate. One real
test-ordering bug was found and fixed while writing this: the "blank
CACBean" Overview check originally reused AY-00002, which an EARLIER
assertion in the same suite (session-only save path) had already mutated to
`cacBean:"Gold"` via `applyEditsToRecord()` — switched to AY-00004
(untouched anywhere else in the file). `tests/verify_composition.js` (88
assertions, was 79) gained items 5-6 — the Catalog grid-mini BR span
existing and stacking a silver coin's composition correctly while staying
empty for clad, and the full collision-based-sizing mechanism: natural-size-
by-default across every realistic value, genuine per-instance shrink for an
extreme value, correct reset on a reused element, and the mini-card's own
14px natural size confirmed unaffected by any full-flip-frame-specific
logic. Both new mechanisms (item 1's visibility fix, item 6's shrink loop)
have verified negative controls — reintroducing the old PCGS-hiding
condition fails the exact repro assertion; neutering the shrink loop fails
the two assertions that depend on it. 488 assertions across 13 suites, zero
failures, zero page errors. Screenshots reviewed at phone width for every
new UI piece (Add Coin's CAC row under PCGS, Browse Edit's captioned inline
group, the Overview CAC Bean row, Browse Edit's $-prefixed Purchase Details,
the Catalog grid showing "90% / Silver" on several cards, and Add Set's own
$-prefixed Purchase Details drill-down) — no overflow, no collision.
- **Not verified: any real device, any real OneDrive session.** Same
  standing caveat as every round on this branch.

**Item 7 — reverse-flip on a saved coin: investigated, NOT a code bug, no
fix built.** Repro was AY-00001, Browse detail/Spotlight, four consecutive
flip captures all showing the same content. Driven directly and logged:
`browseDetailSide`/`spotlightSide` genuinely alternate every toggle, the
`.reverse-face` CSS class genuinely toggles, and the disc's radial-gradient
highlight genuinely shifts (`circle at 35% 30%` obverse vs `circle at 65%
30%` reverse) — the state machine and its wiring both work exactly as
coded. Two things combine to make it look like nothing happens: (a)
`applyFlipCorners()` takes no side parameter and renders once, unconditionally
— by design, per this file's own "corner labels stay the same on both faces
since they describe the coin, not which face is showing"; (b) since no coin
in this mockup has a real captured photo, the ONLY visual difference between
faces is that gradient shift, which is genuinely subtle and easy to read as
"no change" in a screenshot comparison. Reported back as a real, working
mechanism producing a UX gap worth a future decision, not a bug — no fix
proposed or built, per the explicit "ask, don't guess" instruction for this
item.

**Item 8 — Mint Mark "— none (Other) —": BUILT.** Was flagged STILL OPEN,
blocked on confirming `DB_Coins.Mint` was populated/reliable enough on
blank-MintMark rows to disambiguate on — Ray confirmed via Copilot that all
236 real blank-MintMark rows now carry a value, unblocking the real
disambiguation-picker path (not the plain fallback). See "Mint Mark 'None
(Other)': real DB_Coins.Mint disambiguation" below for the full build.


#### (continued) Phase 2 promote: duplicate-row bug (BUILT and merged to main)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 10576-10632).

**Verified headless — new committed suite `tests/verify_promote_race.js`
(25 assertions), all passing; 660 across 17 suites, zero failures.** Covers:
the original double-submit reproduced end to end (exactly one row, holding
real data, no stray blank row, second call coalesced onto the first); a
coalesced promote firing exactly one success toast rather than two; the
toast ordering asserted by event sequence rather than timing (the operation's
first `uploadJson` can only come from `finishCoinDraftWrite()`); the external
mid-write append leaving its own row intact while the new coin claims a
genuinely-new one; the refuse-rather-than-clobber path leaving every existing
cell untouched; the already-on-the-sheet tripwire; the duplicate-aware lookup
against a seeded double alongside proof `findAllSheetRowNumber()` still
returns the first match; the pending helper's four behaviours (immediate
disable/relabel, repeat click starting nothing, restore when still attached,
and leaving a detached button alone); both Promote surfaces genuinely wired
through it via real `.click()`; and an ordinary single promote still landing
with its data, its Error column, and both formula cells untouched.
**Verified negative control, one per fix**: removing the lock fails A3/A5;
restoring the stale-read arithmetic fails D1/E1/E2 with the exact reported
symptom (neighbouring row clobbered); moving the toast back after the chain
fails C1 with order `["chain","chain","toast"]`; unwiring the pending state
fails I1/I2. Each was restored and re-confirmed.
- **Not verified: any real device, and no live `_Testing` run against these
  fixes specifically.** Ray has cleared live `_Testing` testing for his own
  next pass; `WRITE_TARGET` stays `"copy"`.

**Follow-up: pending state extended to every action button on both
surfaces.** Ray asked for Re-check and Reject to match Promote. Two
corrections came out of doing it, both worth knowing:
- **Force Add did NOT already have it** (the request assumed it did). It
  has the same dialog-then-async-work shape as Reject, so it got the same
  treatment rather than being left as the one button believed done and not
  done. Dismiss, Mark ready and Revert to Draft are the same class of
  silent write and were included too — leaving three of six buttons on a
  row behaving differently would have invited the identical complaint next
  round.
- **`runWithButtonPending()` now calls the handler FIRST and only goes
  pending if it returned a thenable.** The first version wrapped every
  button unconditionally, which made a dialog-opening button flash
  "Rejecting…" for a frame while the user was still deciding — caught by a
  synchronous assertion in the suite, not on a device. An async handler
  returns its promise synchronously, so a real write still goes pending in
  the same tick; a handler that only opens a dialog returns undefined and
  gets nothing.
- **Two shapes, one convention.** A handler that does its work immediately
  (Re-check, Mark ready, Revert, Promote) shows pending on the click. A
  handler that opens a confirmation first (Reject, Force Add, Dismiss)
  takes the button as an optional second argument and applies pending
  inside its confirm handler, so the state appears when the work starts,
  never while the dialog is open. `showWriteGuard()` has no backdrop
  dismiss — every exit runs a declared button's `onClick` — so this cannot
  strand a button disabled.
- Verified headless: 8 further assertions in `tests/verify_promote_race.js`
  (33 in that suite; 668 across 17 suites, zero failures), with three
  negative controls — unwiring Staging Review's buttons fails I2/K1/K2;
  restoring the always-wrap helper fails H5/K3/L2 with the exact flash;
  stripping the button pass-through from `rejectStagedCoin()` fails K4.


#### (continued) Photo / receipt write layer — Photos & Receipts tabs (BUILT and merged to main)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 11066-11435).

**Verified headless — new committed suite
`tests/verify_photo_receipt_write.js` (84 assertions), all passing; 1142
across 27 suites, zero failures, zero page errors.** Covers the filename
convention including the `.png` sweep; the PhotoType map both ways; a write
CLAIMING row 4 with the table not growing; replace-vs-add; OriginalFilename
present and absent, with exactly one row either way; detach blanking the
row while the file survives and the row returns to the pool; the receipt
dedupe (reused id, **no second upload**, separate rows per coin) and the
photographed/picked filename split; which targets commit and which don't;
the loud-failure path end to end (Blob kept, error recorded, no row, then a
retry landing both file and row); promotion recording rows for a coin
draft; the read side's Photos-first/legacy-fallback behaviour, the photo-gap
check, the "Binder" guard; the stored photo actually painting onto the flip
card with the reverse not inheriting it; and a nav sweep with no overflow at
both viewports.
- **Eleven verified negative controls**, each re-run and confirmed to fail
  exactly its own assertions: appending instead of claiming (C1/C2/F4);
  removing the receipt dedupe (G2/G3/G6); treating "Binder" as a filename
  (L9/L11/M2/M3); dropping a failed capture silently (J1/J2/J3/J6);
  deleting the file on trash (F3); reverting the `[object Object]` path bug
  (K1–K3); removing the Photos-tab read (L1); removing the legacy fallback
  (L3); removing the ownership gate (I3); `coinMissingPhoto()` ignoring the
  Photos tab (L4); and removing the flip card's stored-photo tier
  (O1/O3/O4).
- **Two assertion-quality fixes worth knowing**, both cases where a first
  version passed against broken code: `G3` counted stored KEYS, which
  cannot distinguish "skipped the upload" from "re-uploaded the same path"
  — it counts upload CALLS now; and `F2` captured a live array reference
  that a later reclaim mutated in place. Third and fourth time this project
  has hit that trap; assume it applies to any assertion whose broken case
  also returns the passing value.
- **Two prior assertions updated, not weakened** (`verify_addcoin_phase1`
  C10/C11 and their fixtures), following the real `.png` → `.jpg`
  correction.
- Screenshots reviewed at both viewports with a failed, a pending and a
  clean capture visible — no overflow at either width.
- **Not verified: any real device, any real OneDrive session.** This is a
  new write surface and wants a live `_Testing` run before it is trusted.
  `WRITE_TARGET` stays `"copy"` throughout.

**Follow-up (same branch): replacing a photo that already exists.** Found
on Ray's own device — coin `AY-00208` has a correct `PH-00004` row, but the
file it points at is a screenshot of a PCGS cert page, and there was no way
to swap it.

**The diagnosis differs slightly from the report, and that difference is
what made it one fix rather than two.** Manage Photos — every section in
Edit Coin, Edit Set and the standalone screen — rendered EXCLUSIVELY from
`galleryStore` (this session's captures plus the `FAKE_GALLERIES` seed) and
had no awareness of `LIVE_PHOTOS` at all. The read side built the previous
round was never fed back into the capture UI. So for a coin with a stored
photo: the pair slot drew the empty `＋` face, the section header showed no
count, and **Remove and Adjust were both hidden too**, because all three
are gated on there being a gallery entry. The `📷`/`🖼️` buttons WERE
rendered and tapping one would in fact have replaced the row correctly —
but nothing on screen said the slot was occupied, so there was no way to
know that. Showing what's there is most of the fix; the Replace framing
sits on top.

- **`hydrateStoredPhotos(collectionId)`** merges the record's Photos-tab
  rows into its gallery as entries marked `stored: true`, so every existing
  consumer — the pair slots, the open-ended thumbnails, `manageCount()` —
  becomes correct at once instead of each growing its own lookup.
  **A session capture always wins**: an entry already present for a slot is
  never overwritten, since it is either newer than the sheet or is the
  thing currently uploading. Idempotent across the re-render every capture
  triggers.
- **`ensureStoredThumbs()`** fetches the missing thumbnails and re-renders
  **once**, only if something actually resolved — so it cannot loop against
  the render it triggers. `ensureCoinPhotoFetch()` already dedupes per
  filename per session, so repeat renders cost nothing.
- **A filled slot says "Replace"** and its buttons' labels/titles say
  Replace rather than Add. Camera and library stay SEPARATE inputs
  throughout (Samsung Internet skips the native chooser) — never collapsed
  into one button.
- **Repeatable types (Reference/COA/Other) get a per-thumbnail Replace**,
  since there is no fixed slot to match on. It carries that photo's
  **PhotoID and Label** forward (`writePhotoRow()` gained an optional
  `replacePhotoId`), so the row is updated in place rather than dropped and
  re-added.
- **Filename on replace: the CURRENT convention wins.** A replacement
  writes `{id}_obverse_cropped.jpg` and updates the row's `Filename`,
  rather than overwriting whatever the row pointed at. The old file is left
  on disk — never deleted, same rule as detach. So replacing a
  legacy-named photo (`AY-00208_obverse.jpg`) leaves one orphan and moves
  the record onto the convention: the deliberate trade, since consistent
  naming going forward matters more than the occasional sweepable file.
- **Adjust source priority** (`resolveStoredAdjustSource()`): the raw when
  one is genuinely resolvable — the sheet's `OriginalFilename`, or our own
  `_cropped`/`_original` pair, which this layer always uploads together —
  otherwise the DISPLAYED file itself.
  **SUPERSEDED, same branch:** Adjust was first restricted to a resolvable
  raw, with Replace as the only option otherwise. Ray's live testing showed
  that is too tight: most photos already on the Photos tab predate the crop
  pipeline and will never have a raw, yet they are exactly the ones that
  are visibly mis-framed — off-centre, letterboxed, not filling the circle
  — so the restriction meant re-taking a photo of a coin that may not be to
  hand, purely to fix framing. The fallback is a real quality tradeoff
  (re-encoding an already-cropped, already-compressed JPEG), which is why
  the raw still wins whenever there is one and the crop tool's own title
  says which source it opened on ("from the original" vs "re-crop").
  - **"Resolvable" means FETCHABLE, not name-derivable.** A `_cropped` file
    implies an `_original` sibling by convention, but an older build may
    never have uploaded one — a 404 there falls through to the displayed
    file rather than dead-ending.
  - **The write is identical either way** — current-convention filename,
    the row's `Filename` updated, the old file never deleted. The source
    choice only decides what the crop tool opens on.
  - The decision is split into its own function specifically so it can be
    asserted directly; driving it through the crop overlay would test the
    overlay instead.
- **Remove now works on a stored photo**, detaching its row (never
  deleting the file), which it could not do before.
  **SUPERSEDED, same branch — see "Trash: the confirmation that was never
  wired" below.** It shipped with no confirmation dialog and removed the
  entry locally without waiting on the write; both are fixed there.
- **A commit repoints the read cache at the bytes it just wrote.** Found
  while adding the re-crop fallback: an adjust can land on the SAME
  filename it read from, and `getCachedCoinPhotoUrl()` is what the flip
  card and Albums read through — so without this they would keep showing
  the pre-adjust image for the rest of the session.
- Add Coin's own slots are unaffected — a brand-new coin has no
  CollectionID and therefore no stored rows, so hydration is a no-op there,
  as it is for any draft record.

**Known, accepted, not fixed here:** hydration runs from
`renderManagePhotosInto()` only, so Browse detail's "Additional Photos"
strip still shows session captures alone until Edit has been opened for
that coin. Harmless (it never shows anything WRONG, only less), and wiring
it would mean hydrating from a hot read path.

Verified headless — the suite grew to **110 assertions; 1168 across 27
suites, zero failures, zero page errors** (since grown to 124 / 1182 by
the Adjust-fallback round below). Covers hydration (including
idempotence, session-capture precedence, and a draft hydrating nothing);
the slot showing the stored photo instead of `＋`; the Replace label and
button wording; Remove becoming available; Adjust hidden for a legacy name
and `storedRawFilenameFor()`'s three cases in isolation; per-thumbnail
Replace with separate camera/library inputs and the stored Label rendering
as its caption; and a full replace round trip asserting the row is updated
in place, keeps its PhotoID, moves to the convention filename, and leaves
the old file on disk. **Six more verified negative controls**: no
hydration (11 assertions fail, reproducing the reported symptom exactly),
hydration clobbering a session capture, replace adding a row instead of
updating, the sheet-side Label fallback removed, Adjust offered with no
resolvable raw, and a filled slot keeping the "Add" framing.
- **Two assertions were strengthened after a control failed to fire**:
  `Q6`/`Q7` matched the FIRST Reference row, which is the OLD one when a
  spurious row is added, so both passed against broken code; they now match
  on the row carrying the new filename. And `Q9` was added to isolate
  `writePhotoRow()`'s own Label fallback, which the JS-side caption
  carry-forward was masking. Same trap as `G3`/`F2` last round — assume it
  applies to any assertion whose broken case also returns the passing
  value.
- **The Adjust-fallback round adds 14 more assertions and 3 more controls**
  (124 in this suite; 1182 across 27): the source priority in all five
  states — a fetchable raw wins, an `OriginalFilename` column wins, a
  derivable-but-absent `_original` falls through, a legacy name falls
  through, nothing loadable resolves to null rather than throwing — plus
  the adjust round trip writing through as an ordinary Replace, and the
  read-cache refresh. Controls: restoring the raw-only restriction (fails
  the two UI assertions and both fallback cases), inverting the priority so
  the displayed file beats an available raw, and leaving the read cache
  stale. **A first version of this block tried to stub `runCropPipeline`
  via `window` and silently asserted nothing — it is a lexically scoped
  function declaration inside the IIFE, so the stub was never called.**
  That is what prompted splitting `resolveStoredAdjustSource()` out; the
  two remaining call-site facts are covered by a source-text guard.
- Screenshots reviewed at both viewports with a legacy-named photo, a
  convention-named photo, an empty pair, and a captioned Reference
  thumbnail all visible at once — both filled slots now show ⤢ with
  different tooltips. No overflow.
- **Not verified: any real device, any real OneDrive session.**

**Follow-up (same branch): circle framing — what you frame is now what the
card shows.** Reported live on AY-00002: after adjusting a photo to FILL the
Stage 2 circle, the flip card still showed a ring of background between the
coin's edge and the circle's edge.

**Root-caused by measurement, not inspection.** A synthetic source (a disc
filling 80% of a square — a normal Stage-1 trim, since Stage 1 removes
background rather than making the coin touch all four edges) was driven
through the real pipeline and the output measured pixel-wise. Two separate
defects, both real:
- **Stage 2's framing was discarded entirely.** `runCropPipeline`'s entry
  carried `url: rectUrl` and `blob: rectBlob` — the STAGE 1 rectangle —
  while the Stage-2 bake went only to `circleUrl`, which its own comment
  described as "a session-only display convenience... NOT a stored asset."
  So the card masked the intermediate trim into a circle and never saw what
  the user framed. Measured: the coin rendered at **0.80** of the circle's
  diameter against the **1.00** just framed. Stage 2's 110% default zoom
  guarantees a gap even when Stage 1 is perfectly tight.
- **The guide's assumed diameter was wrong.** `circleSize` was a hardcoded
  `240`, but this file sets `* { box-sizing: border-box }` and
  `.photo-adjust-circle` carries a `2px` border, so its real content box is
  **236px** (`clientWidth`, confirmed in a browser). The preview therefore
  scaled the image to 240 inside a 236px window — ~2px per side sat under
  the border, unseen — while the bake exported the full 240. The saved image
  carried a thin ring the user never framed, ~1.7% of the diameter. This is
  the "padding baked into the exported image" case, and it is independent of
  the first defect.

**Fixes.**
- **For a flip source, Stage 2's output IS the stored image.** One stored
  file per side still; the card still just masks a square. The fix is WHICH
  square — the one framed in the guide, not the intermediate trim.
  Non-flip types never run Stage 2 and are untouched.
- **`circleSize` is measured** (`circleEl.clientWidth`), so preview and bake
  agree exactly. The overlay is un-hidden BEFORE the size is read — a
  `display:none` element measures 0.
- **The bake's output resolution now follows the source** rather than a
  fixed 480. That fixed size was harmless while the bake was a throwaway
  preview; making it the stored file would have downsampled every photo to
  480px. `circleSize / scale` is exactly how many source pixels span the
  guide, so this neither up- nor down-samples, clamped to [480, 1400] (the
  same cap Stage 1 uses).

**Both a fresh capture and a re-crop of a stored photo go through the same
Stage 2, so both are fixed.** Photos already stored from before this fix
keep their old framing until re-adjusted — the framing was never recorded,
so there is nothing to recover retroactively.

Verified headless — **10 new assertions (134 in this suite; 1192 across 27,
zero failures)**, driving the REAL pipeline end to end: Stage 1's crop box
set to the whole frame (its default insets 10% a side and would have done
part of the framing for us, making the arithmetic approximate), then Stage 2
zoomed to fill the guide. The stored image measures **1.00** of the circle
diameter, its width equals the adjuster's own computed bake width (proving
the bytes are the Stage-2 bake, not the differently-sized Stage-1
rectangle), and `applyDiscContent()` paints that exact image. Plus: a
non-flip type never opens Stage 2 and still measures 0.80, unchanged; the
adjuster's `circleSize` equals `clientWidth` and is less than the CSS width;
and at 100% zoom the rendered preview width matches the visible circle to
within a pixel. **Three verified negative controls**, one per defect —
reverting to the Stage-1 rectangle fails T1 and T3 and reproduces the
reported symptom exactly, reverting `circleSize` to 240 fails T9/T10, and
reverting the bake to a fixed 480 fails T4.
- **A first version of T6 asserted the wrong premise** — that accepting
  Stage 1 "as-is" leaves the source untouched. Its default crop box insets
  10% per side, so the assertion measured 1.00 where it expected 0.80 and
  failed for a reason that had nothing to do with the fix. The test now sets
  the box explicitly rather than relying on a default it did not check.
- Flip card screenshot reviewed at both viewports: the coin's rim now sits
  on the circle's edge, no ring.
- **Not verified: any real device, any real OneDrive session.**

**Follow-up (same branch): Trash — the confirmation that was never wired,
and two read paths disagreeing.** Two live defects on AY-00002, both
reproduced and measured before anything was changed.

**1. The confirmation was never implemented.** Trash was specified to
confirm first, for the exact reason it went wrong: it sits immediately
beside Replace's camera and library icons with no visual separation, and Ray
tapped it by accident. Traced directly — the handler called
`detachGalleryPhoto()` with no `showWriteGuard()` anywhere near it. Not a
dialog that was easy to miss on a touch device; there was no dialog. That is
a miss in the round that built Remove, not a regression from something
later.

**2. THE TWO READ PATHS RESOLVED PHOTOS DIFFERENTLY — the real cause of the
"empty slot while the card shows the photo".** `storedPhotoFilename()` (the
flip card, Albums) reads the Photos tab and **falls back to the legacy flat
`All.Obverse`/`Reverse` column**; `hydrateStoredPhotos()` (Manage Photos)
read the Photos tab **only**. The legacy fallback was added when the read
side was built and simply not carried into hydration when Manage Photos
learned about stored photos a round later. For a coin recorded only the old
way — `AY-00002` is one of the five — the card showed the real photo while
Manage Photos drew an empty `＋` slot with no Replace, no Adjust and no
Remove. Reproduced exactly (card: photo; slot: `＋`, zero gallery entries)
before fixing, which is what identified it; the first repro attempt produced
the OPPOSITE of the report on both counts and was the thing that ruled out
the obvious explanations.
- Hydration now uses the same resolution, via `legacyStoredRowsFor()`. A
  legacy entry is marked **`legacyOnly`** because it has no Photos row
  behind it: it can be **Replaced** — which writes a proper row and migrates
  the coin onto the tab — but not detached, since this app never writes the
  flat columns. Trying says so plainly instead of silently doing nothing.

**3. The session's Photos index went stale on every write.** `LIVE_PHOTOS`
is fetched once per session, and hydration reads through it, so a detach
left the index still holding the row — and the next re-render hydrated the
photo **straight back**. Measured directly in the first repro: row blanked
in the workbook, photo still on screen. The mirror image of the reported
symptom, and the same "local state and the workbook disagree" defect.
`syncStoredPhotoIndexRemove/RemoveByFilename/Upsert()` keep the index in
step on both detach and write.

**4. The removal was optimistic.** The entry left the screen synchronously
while the write went off unawaited, so a failed detach removed it from view
and left the row on the sheet. The removal now waits on the write and
reports honestly when it fails.

**Truthful messaging where the two records overlap.** A coin can have BOTH a
Photos row and a legacy column for the same side (`AY-00002` does).
Detaching the row there does not make the photo disappear — both surfaces
correctly fall back to the legacy column — so the dialog says that up front
rather than letting Ray remove it and watch it stay.

Verified headless — **14 new assertions (148 in this suite; 1206 across 27,
zero failures)**: the card and Manage Photos now agreeing on a legacy-only
photo, its `legacyOnly` marking, the can't-remove-this-one path leaving it
in place, the confirmation firing with Cancel/Remove, Cancel changing
neither the gallery nor the workbook, Confirm detaching the row while
keeping the file, the index being synced so it cannot be re-hydrated back,
a removed photo staying removed across a re-render when there is no legacy
column, and a FAILED detach removing nothing.
- **Four verified negative controls**: no confirmation (fails 6), hydration
  without the legacy fallback (fails 5, reproducing the reported empty
  slot), a stale index after detach (fails 2), and a fully optimistic
  removal (fails U14).
- **Two test-quality fixes, both found by running the controls.** The first
  two controls THREW instead of failing by name — a thrown suite hides which
  property broke — so the block's DOM interactions are null-safe now. And
  `U14` counted gallery entries, which cannot distinguish "never removed"
  from "removed, then re-hydrated back off the unsynced index" — it checks a
  marker on the live entry instead. That is the fifth time on this branch an
  assertion has passed against broken code; assume it of any assertion whose
  broken case also returns the passing value.
- **A control that did not fire taught something too**: removing only the
  error branch left a second guard that independently blocks the removal, so
  the control passed. Both had to go to isolate the behaviour — worth
  knowing the two guards are genuinely independent.
- Screenshots at both viewports of the dialog, including the legacy-column
  note on `AY-00002`'s exact situation. No overflow.
- **Not verified: any real device, any real OneDrive session.**

**Follow-up (same branch): the gallery viewer showed a sliver, not the
photo.** Reported live on AY-00207 — the reference-photo viewer showed a
small zoomed portion ("191" of "1916...") filling the dialog.

**Neither of the suspected causes.** Not object-fit, and nothing about how
the file is served. `galleryThumbInner()` paints its image as a BACKGROUND
on a `.gc-img`, and the whole treatment for that — `center/cover`,
`no-repeat`, a dark ground, `overflow:hidden` — lives on **`.gc-thumb
.gc-img`**, a selector the viewer's own `.gv-cell` never matched. The viewer
therefore inherited none of it. Its only rule was `width/height: 130px`, so
`background-size` fell back to `auto` and `background-position` to `0% 0%`:
the image painted at NATURAL size, clipped to a 130px square, showing its
top-left corner at 1:1 — which for a PCGS cert screenshot is exactly the
"1916..." text. **Measured on a 1600×900 reference photo: 1.17% of the image
visible.**

The shared markup assumed a styling context one of its two call sites never
provided — the same "two surfaces silently disagreeing" family as the
hydration/flip-card split above, in CSS rather than JS.

**Fix.** The viewer gets its own complete rule: `contain` (a viewer wants the
WHOLE image, unlike the thumbnails' deliberate `cover` crop), centred,
un-tiled, on a dark ground, in a box worth opening a dialog for —
full-width cells up to a wider viewer-only panel (`#galleryViewerOverlay
.photo-adjust-panel`), `min(52vh, 320px)` tall. Measured after: 100% of the
image visible at 330px wide on a phone and 418px on a tablet, for both a
wide and a portrait source. **The Manage Photos thumbnails are untouched** —
still cover-cropped squares, asserted.

Verified headless — **8 new assertions (156 in this suite; 1214 across 27,
zero failures)**: the computed `background-size`/`position`/`repeat`, a wide
and a tall photo each fitting whole in the expected dimension, the box size,
and the thumbnail scope guard. **One verified negative control** — reverting
the CSS fails 5 of them and reproduces the sliver.
- **Two assertions initially passed against the broken CSS** and were
  tightened: they computed what `contain` WOULD give for that box rather
  than requiring the element to be in contain mode at all, so the
  hypothetical held either way. They now assert the mode as part of the
  claim. Sixth time on this branch; the tell is always the same — an
  assertion whose broken case also returns the passing value.
- Screenshots at both viewports with a wide and a tall photo open together.
  No overflow.
- **Not verified: any real device.**


### Ledger/Stats: live-data read-path fix (BUILT and merged to main)
Real bug, found while scoping the All.Status investigation (item 5 of the
workbook-alignment round): `renderStats()` read `FAKE_COINS` directly rather
than `activeCoins()` — the one swap point every other live-data-aware nav
function (`coinsTabBaseRows()`, `medalTabBaseRows()`, `applyRollsTabFilters()`,
`applySetsTabFilters()`, `renderSetChecklist()`, `ownedSetForSetId()`) already
goes through. Ledger/Stats therefore **always** showed the 26-row demo
dataset, even in a live session with `ENABLE_LIVE_NAV_DATA` on and real
coins already loaded elsewhere in the app (Catalog, Sets). Compounding it:
`navigate()` had no `"stats"` branch at all — unlike `staging`/`addset`/
`inprogresssets`/`needsdbcoins`, which each trigger their own render —  so
entering Stats via the cabinet drawer never even attempted the live fetch;
`renderStats()` ran exactly once anywhere in the file, at app-init time,
before any fetch could possibly have landed.

**Scope: this fix alone, nothing else.** Ray's explicit instruction: "Fix
the Ledger/Stats demo-data bug now, as its own standalone item... independent
of Item 5/Status... please proceed on item 1 only for now." Item 5
(`All.Status` filtering) stays unbuilt — see that section for the settled-
but-deferred design (a Status filter chip in Browse, defaulting to Owned,
covering the four list-producing tabs plus Stats — explicitly held for a
later round).

- **`renderStats()` now reads `const all = activeCoins();`** and derives
  `coins`/`medals`/`totalSpent`/`totalValue`/the total-items count from that,
  instead of `FAKE_COINS` directly. The rest of the function (the
  per-denomination breakdown loop) already read the local `coins` variable,
  so no further change was needed there.
- **`navigate()` gained a `"stats"` branch**, mirroring `showBrowseTab()`'s
  own pattern: `ensureLiveNavDataFetch()` (a no-op when the flag is off, or
  when already loaded/in flight — never blocks), then `renderStats()`
  synchronously with whatever's currently available.
- **`ensureLiveNavDataFetch()`'s own fetch-completion re-render, previously
  scoped to `view-browse` only, now also covers `view-stats`** — so a fetch
  kicked off from Browse that resolves while Stats happens to be the active
  view re-renders it too, instead of leaving it stuck on stale data until
  the next manual re-entry.
- **New test seam, `__setLiveCoinsForTest(rows)`** — sets `LIVE_COINS`
  directly, mirroring the existing `__setLiveDbCoinsForTest()`/
  `__setLiveLookupGradersForTest()` seams, since nothing previously needed to
  stand in for a real fetch landing specifically for Stats.
- **Stale UI copy fixed alongside it**: the Ledger page's own footnote used
  to flatly state "Cost and value figures are placeholder data — no live
  totals from the workbook yet" — no longer accurate once this fix landed.
  Reworded to "Cost and value figures reflect the live workbook once loaded;
  otherwise this shows placeholder demo data."

**Verified headless — new committed suite `tests/verify_stats_live_data.js`
(13 assertions), all passing; 784 across all 20 suites, zero failures.**
Covers: `renderStats()` genuinely reflecting a live single-coin dataset
(total items, coins/medals sub-line, spent/value totals) rather than
`FAKE_COINS`'s own count, and correctly falling back to `FAKE_COINS` again
once the live override clears; `navigate("stats")` calling
`ensureLiveNavDataFetch()` (it had no such branch before this fix); the
fetch-completion branch re-rendering Stats when it's the active view
(mirrored directly, since a real Graph/MSAL round trip can't be driven from
this environment); the stale footnote text being gone and replaced with an
accurate description; and a nav/overflow smoke check. **Two verified negative
controls**: reverting `renderStats()`'s body to read `FAKE_COINS` directly
fails the live-dataset assertion; navigating to an unrelated route
(`wishlist`) confirms the `ensureLiveNavDataFetch()` spy isn't a false
positive from being always-called. Screenshots reviewed at both viewports
(phone 412×915, tablet 1024×768) — layout unchanged, no overflow, footnote
reads correctly.
- **Not verified: any real device, any real OneDrive session.** Same
  standing caveat as every round on this branch — the live-fetch itself
  can't be exercised end-to-end from this environment; this fix corrects the
  read-path/render-trigger wiring that a real session would actually need.


### Live-device retest batch 2 (BUILT and merged to main)
Second real-device pass. Six items built; **item 5 (Force Add's orphan blank
row) was investigated and deliberately NOT fixed** — see its own section
below. Confirmed working and untouched: Sets flip-card removal, the First
Spouse long-name wrap, Dismiss, the Finish dropdown, Ledger's live totals,
the denomination codes.

**The single most important finding of this round is not in the app at all
— see "The AllCoins table is 987 rows longer than its data" below. Read that
before touching the row-creation path again.**

**B. "Edit Coin didn't write, and gave no identity warning" — NOT a bug.**
`ENABLE_BROWSE_EDIT_WRITE` was off. It is a SEPARATE flag from
`ENABLE_ADDCOIN_WRITE`, and `docs/ADD_COIN_LIVE_RUN_CHECKLIST.md`'s setup
block only listed the latter — so Add Coin/Promote wrote for real while Edit
Coin was still on its session-only stub. Reproduced headlessly: the
session-only toast fires, no dialog appears, and the in-memory record IS
mutated (which is why the detail page then showed the unsaved value as if
real). Both halves are one cause: `commitBrowseEdit()` short-circuits to the
session-only path for ANY field when the flag is off, and **both** confirm
gates (identity-overwrite and CoinID-change) live downstream of that
short-circuit on the write path. `COINID_TRIGGER_FIELDS` is intact; it was
never reached. **The checklist now lists both flags.** The deeper UX problem
— a session-only edit rendering identically to real data on the detail page
— is real but was not in this round's approved scope; flagged for Ray.

**C(a). PROMOTED drafts no longer appear in Staging Review.** The Docket
already filtered them from both its lists (which is why its count read 0),
but `renderStagingList()` mapped every draft regardless of status, and its
Draft-vs-Ready split puts anything that is not READY under **"Needs a
decision"** — so a just-promoted coin reappeared in the one bucket implying
it still needed action. Now filtered to match the Docket. **The draft FILE is
deliberately NOT deleted**: it is the audit trail and the retry source for
the photo move (`processPromotedCoinDrafts()` resumes an interrupted move at
next launch by reading exactly these PROMOTED drafts). Display filter only,
asserted.

**C(b). Staging Review is reachable at zero rows.** The ONLY route into
`view-staging` was the per-row `onClick` inside the Docket's Staging section,
so zero rows meant zero clickable elements — a genuine dead end, not just an
empty list (the empty note is a plain `<p>`). A persistent **"Open Staging
Review"** button now renders in that section unconditionally. **Deliberately
not folded into the accordion header itself**, despite the request naming it:
that header is the expand/collapse control, and giving one control two jobs
would break the accordion.

**Item 6. `ensureLiveNavDataFetch()` gained a `force` flag.** Clean root
cause: `refreshLiveCoinsAfterWrite()` cleared only `liveNavDataFetchPromise`,
but the function's SECOND guard is `if (LIVE_COINS && LIVE_DB_SETS) return
Promise.resolve(true)` — and **nothing anywhere in the file ever clears those
two** (verified: two assignments total, both inside the fetch's own `.then`).
So every post-write refresh since it was written returned `true` having
fetched nothing: a successful-looking no-op. That is why a just-promoted coin
stayed invisible in Catalog until a hard reload. `force` skips that guard.
**`LIVE_COINS` is deliberately NOT nulled first** — `activeCoins()` would
then fall back to `FAKE_COINS` for the duration of the fetch, dropping
Catalog and Ledger to demo data mid-session. An in-flight fetch is still
shared even when forcing (it was started a moment ago and will return fresh
data anyway).

**Item 7 + A(second half). Two fields that existed but were never fed.**
Same shape, same area, both fixed together:
- Edit Coin's prefill read Shipping/Seller/Purchase Date from the
  `FAKE_COIN_DETAILS` demo lookup only — empty for every real coin — while
  Cost read the row itself and therefore worked. `mapWorkbookRowToCoin()`
  already mapped all three onto `coin.shippingCost`/`.vendor`/`.purchaseDate`;
  the prefill just never read them. Now prefers the coin's own value, demo
  lookup as fallback — the pattern `renderDetailAccordions()` already used
  for the same three fields. **Independent of the write layer**: with it ON
  the snapshot re-base corrected these a moment later, so the symptom there
  was a flash of blank rather than a permanent one.
- **`All.Remarks` was never mapped onto the coin at all**, so a coin promoted
  WITH remarks (`coinDraftToAllValues()` does write them) showed none
  anywhere outside Edit Coin. Now mapped, and the detail page's Notes line
  prefers `coin.remarks` over the demo lookup.

**Item A(first half). Relabelled, not restructured — the report was a
misread.** Verified directly: Edit Coin's "Notes" is a `<textarea>` writing
`All.Remarks` (real, per-coin), and "Fun Fact" is a `<div
class="readonly-field">` with no write path to anything. No shared catalog
data was ever at risk and there was no field to remove. What was genuinely
wrong was the labelling — three fields of two different kinds under one
heading. Now split with a quiet `.field-origin` tag: **"Notes — yours,
editable"** vs **"Fun Fact — catalog reference, read-only"**, on both the
Edit form and the detail page.
- **`DB_Coins.Notes` is now read and displayed, read-only.** A real,
  heavily-populated catalog column — **1,101 of 4,227 rows, far more than
  FunFact's 79** — that nothing in the app read until this round. Shown on
  the detail page (Ray's ask: catalog content viewable on the coin's own
  page, not only inside Edit Coin) and on the Edit form, both read-only.
- **`catalogNotesFor()` deliberately has NO `FAKE_COIN_DETAILS` fallback**,
  unlike `catalogFunFactFor()`. That lookup's own `notes` field is the demo
  stand-in for `All.Remarks` — this coin's OWN note — which is a completely
  different thing from the catalog's notes about the coin type. Falling back
  to it would present a personal note as shared catalog reference data.
  Asserted.

**Item 2. Calendar-picker glyph.** The app declares no `color-scheme` and had
no `::-webkit-calendar-picker-indicator` rule, so the UA drew its native
glyph in default light-scheme black on the dark `--bg-elevated` field.
Fixed with a scoped filter on `input[type=date]`, covering every date input
through one selector. **No blanket `color-scheme: dark` on `:root`** — that
would also repaint scrollbars and native select popups app-wide, far larger
than this warrants. Asserted, including that `:root` is NOT dark-scheme.

**ValueSource / ValueDate — cheaper and more necessary than the request
assumed.** Both columns **already exist on All and are already in real use**:
`ValueSource` on 243 rows ("Red Book 2027" ×114, "PCGS" ×86, "Red Book 2027,
p. 386" ×21, "U.S. Mint"), `ValueDate` on 162 as real dates. The app read and
wrote **neither**. That reframes this from a nicety to a live data-integrity
gap: Edit Coin could change `Value` while leaving `ValueSource`/`ValueDate`
asserting where the OLD figure came from. Both are now on
`ALL_WRITABLE_COLUMNS`, editable in Edit Coin under Value, and shown
read-only in the detail page's Overview.
- **ValueSource is free text on purpose** — the real column already carries
  page-level detail ("Red Book 2027, p. 386") that a fixed dropdown would
  force Ray to discard.
- **ValueDate goes through `excelSerialFromISODate()` and is added to
  `isDateCol()`**, so it gets the explicit `yyyy-mm-dd` number format. This
  column has prior history of being corrupted by ISO/Zulu text pasted
  straight in (44 cells needed repair), so the serial path is not optional.
  Asserted separately from the value itself — a negative control showed the
  value assertion passing with the format omitted.
- **Known, accepted limit**: clearing ValueDate to blank is a no-op rather
  than a clear, because `excelSerialFromISODate("")` returns `null` and the
  form's cleanup loop drops null keys. `PurchaseDate` has behaved identically
  since the write layer landed; diverging one date field from the other was
  judged worse than the shared limitation. Flagged rather than fixed.

**Verified headless — new committed suite `tests/verify_retest_batch2.js`
(56 assertions), all passing; 840 across 21 suites, zero failures**, with the
nav/overflow smoke re-run at both viewports. **Six negative controls, each
re-run and confirmed to fail exactly the assertions that claim to catch it**:
reverting the PROMOTED filter (A3), removing the Staging entry point (B1/B2),
reverting the item-7 prefill (D1/D2/D3), reverting the force flag (C2/C3),
breaking the DB_Coins.Notes mapper (E3b), and dropping ValueDate from
`isDateCol()` (G8/G10).
- **Two of those controls initially passed, and the tests were fixed rather
  than the claim.** E3 injected an already-mapped row via
  `__setLiveDbCoinsForTest()`, so it never exercised
  `mapWorkbookRowToDbCoin()` at all; G6 asserted the written value was a
  serial, which comes from the form read, not from `isDateCol()`. Added E3b
  (drives the real mapper) and G8/G9/G10 (inspect `buildRowCellEdits()`'s
  actual `numberFormat`, and that a date cell never merges into a range with
  non-date neighbours). This is the same "green suite hiding a real bug" trap
  this file has recorded before — worth assuming it applies to any assertion
  that seeds its own input.
- **Not verified: any real device, any real OneDrive session.**


### Live retest round 2 (BUILT and merged to main)
Five items, all reproduced headlessly before being touched.

**Fix A — a force-added coin stops being a Staging draft.** Reproduced in
full: after Force Add the draft is READY with `allRowWritten` set, the Docket
correctly routes it to Research — and **Staging Review still listed it**,
offering Revert to Draft / Edit / Reject on a coin already in the database.
Reverting succeeded and dropped it back into the Docket's Staging section;
Reject then deleted the draft **while the All row survived with full data**.

ROOT CAUSE: `allRowWritten` was written onto the draft and never read by
anything that mattered. Its only consumers were the two writers that set it,
`applyCoinDraftMatch()`, and the staging-edit field preserver. Staging
Review filtered PROMOTED only; `revertCoinDraftToDraft()` and
`performRejectStagedCoin()` were unconditional.

**The Reject case was the serious one, and worse than reported**: it doesn't
merely fail to undo the row, it destroys the only record that the row needs
attention. Row stays with a blank CoinID, draft gone, coin drops out of the
Docket permanently. Silent loss of tracking on a real database row.
- Staging Review now excludes any draft with `allRowWritten`, same rule as
  PROMOTED. Such a draft appears only under Awaiting Copilot Research, which
  already offers Re-check / Dismiss / Force Add and correctly does not offer
  Reject.
- Revert and Reject both refuse when `allRowWritten` is set, checked against
  a freshly-read draft — belt-and-braces, since the filter means the UI can't
  reach them but a stale render or direct call can.
- The draft FILE is still kept (audit trail + photo-move retry).

**Fix B — the Force Add verify was a FALSE NEGATIVE, not a failed write.**
Live: "wrote keys for AY-00710 at row 561 but the sheet now reports it at row
(none)". Reproduced with a one-shot stale read; the keys HAD landed, and the
retry found the row and completed it (one row, no duplicate, full data) —
exactly what Ray saw.
- The write goes through a **worksheet range** PATCH; the verify read a
  **table column**. Two Graph endpoints, no workbook session, so
  read-after-write across them is not guaranteed. Ruled out the alternative:
  `patchWorkbookRanges()` inspects every `$batch` sub-response and throws on
  any non-2xx, so a silently rejected write is impossible here.
- **Row 561 is evidence the row-558 claim fix is WORKING, not regressing** —
  claiming sequential blanks after 557 gives 558, 559, 560, 561. No append,
  no table growth, no duplicate. The failure was strictly downstream.
- Now verified in two halves: `allSheetRowHasCollectionId()` reads the exact
  cell back through the SAME endpoint family the write used (most likely to
  be consistent with it), and the duplicate-aware table-column scan retries
  (`ROW_VERIFY_RETRIES = 2`, 400ms) before conceding. A row found elsewhere,
  or more than once, still fails immediately — retries must not weaken the
  uniqueness check, which is the valuable half.
- Error wording fixed: "check the All sheet for a duplicate row" sent Ray
  hunting a problem that didn't exist. It now says to press the button again,
  because a retry completes a row whose keys did land.
- **Option 3 (a real workbook session) stays in reserve, Ray's call.** This
  is its SECOND sighting; a third is the agreed trigger to stop patching
  around it.

**"Save to Database" now requires a resolved catalog match — a deliberate
supersession.** The original "Direct-write vs. Staging" rule said confidence
is driven PURELY by Variety recognition and that a DB_Coins miss must never
by itself block a direct save, because DB_Coins isn't exhaustive so blocking
would sometimes be wrong. **What changed: Phase 2 and Force Add now exist.**
An unmatched draft cannot be Promoted — Promote is only offered once a CoinID
resolves; writing an unmatched coin needs the deliberate Force Add override.
So the button offered a destination the coin could not reach, and the original
worry no longer applies: an uncatalogued coin isn't blocked, it takes the
honest route (Staging, then Force Add). `isConfidentMatch()` now also requires
`currentAddCoinMatchState()` to be resolved (one candidate, or a picked one).
The not-confident banner distinguishes the two reasons — telling someone their
Variety is unrecognized when the real problem is "no catalog row at all" sends
them to fix the wrong field.

**Edit from Awaiting Copilot Research — routed by whether an All row exists,
not by row kind.** That section holds two different things: a Docket queue
entry (an already-owned coin whose CoinID an identity edit cleared — Ray's
case) and a coin draft (force-added or not). "Does the database already hold
this coin" is the question that decides the right editor; row kind only
correlates with it. `openEditForDocketRow()` sends an existing row to Browse
Edit (with Back returning to the Docket, not a Browse grid the user never
visited) and anything else to Add Coin's draft editor.
- Folded in: `applyDocketResolution()` looked the coin up in `FAKE_COINS`
  rather than `activeCoins()`, so a resolved CoinID never reached the
  in-memory record in a live session. Now `activeCoins()`.

**"Open Staging Review" stays always visible** (Ray's call). Once Fix A lands
the two lists agree, so a 0 count means the screen really is empty; hiding it
would re-create the dead end it was added for.


### Real-Graph flags always on; WRITE_TARGET is the actual safety boundary (BUILT and merged to main)
**SUPERSEDED (Oct 2026) by "The build decides its data target" at the top of
this file:** `WRITE_TARGET` is now derived from an inline build stamp, and
every write flag is plain `true` in both targets. Part 1 below (the derived
`redirectUri`) still stands; Part 2's `(WRITE_TARGET === "copy")` flags and
"second explicit step to go live" do not.
Two changes, same session, both driven by the same underlying fact: Ray is
the only user of this app and that isn't expected to change, so the
always-off-until-a-local-file-enables-it posture every real-Graph flag
carried since it was introduced no longer earns its keep.

**1. `redirectUri` is derived, not hardcoded.** `graphMsalConfig.auth
.redirectUri` was `"http://localhost:8791/app.html"` — a literal string,
correct only for local dev. It's now `window.location.origin +
window.location.pathname`, which resolves to whatever exact URL the page
is actually being served from. This isn't a cosmetic simplification: the
two known launch modes have genuinely different PATHS, not just different
origins — locally the app is served from the repo root
(`python3 -m http.server 8791`), so the path is plain `/app.html`; on
GitHub Pages it's `/coin-collection-app/app.html`. A hardcoded path
appended to a dynamic origin would still be wrong for one of the two;
reading the real current path is what actually covers both with nothing
hardcoded. Both exact URLs this can resolve to are already registered as
SPA redirect URIs in Entra — `http://localhost:8791/app.html` (local dev,
pre-existing) and `https://salty224.github.io/coin-collection-app/app.html`
(production — confirmed already registered, no Entra change needed for
this task) — so this never needs a third registration for some other path
the formula might resolve to unexpectedly. Scoped to `app.html` only;
`index.html`/`stage.html` already have their own separately-registered,
working production redirect URIs and weren't touched.

**2. The `devFlagOverride()`/`dev-flags.local.js` mechanism is gone
entirely**, and with it the always-`false`/`"copy"` defaults it existed to
let a local session loosen. `ENABLE_REFERENCE_IMAGES` and
`ENABLE_LIVE_NAV_DATA` — both read-only, never write anything regardless
of `WRITE_TARGET` — are now plain `true` unconditionally. The four
write-capable flags are `(WRITE_TARGET === "copy")` instead of a bare
`true`, a deliberate choice over the simpler alternative:
- **`WRITE_TARGET` is now the one real safety boundary**, not "whether a
  local override file exists." It still defaults `"copy"`, so every write
  still resolves under `CoinCollection/_Testing/` and the real workbook
  stays untouchable — but with all four write flags tied to it, flipping
  `WRITE_TARGET` to `"live"` turns every one of them back OFF at that same
  instant. Going live for real therefore needs a **second, explicit
  step** — re-enabling each of the four flags individually — rather than
  being a side effect of the one `WRITE_TARGET` edit. This was a genuine
  design choice between two readings of "default the flags to fully
  functional whenever `WRITE_TARGET` is `'copy'`" (confirmed with Ray
  before building, not assumed): the alternative (all four as bare `true`,
  independent of `WRITE_TARGET`) would mean going live is a ONE-edit
  decision; this one makes it two.
- `WRITE_TARGET` itself had to move earlier in the file (declared
  immediately above the flags that now read it, instead of down beside
  `WRITE_PATHS`) to avoid a TDZ error — a `const` referenced before its
  declaration throws. `WRITE_PATHS`/`writePaths()` stayed where they were;
  only the `const WRITE_TARGET = "copy";` line itself moved.
- User-facing messages that used to say "localhost-dev only for now" (the
  three write-layer-disabled toasts/errors in `saveCoinRowToWorkbook()`,
  `promoteCoinDraftToAllSheetUnlocked()`, and Add Set's
  `writeUnavailableMessage()`) were reworded to reflect the real new
  gating condition — off now means "`WRITE_TARGET` is `'live'` and this
  flag hasn't been re-enabled yet," not "this only works on localhost."

**Everything else about each feature's own scoping is unchanged** — GET-
only enforcement, hardcoded Graph paths, the narrow `Files.Read` vs.
`Files.ReadWrite` scope split, the one-shared-MSAL-instance rule, the
per-feature token-getter checks. This task only changed which values the
flags/redirectUri resolve to, not any of the code that reads them.

**Cleanup, since the mechanism these existed for is gone:** removed
`dev-flags.local.example.js`, the `<script src="dev-flags.local.js">` tag
and its explanatory HTML comment, the `devFlagOverride()` function and its
own comment block, the `.gitignore` entry for `dev-flags.local.js`, and
README.md's entire "Local dev-flag overrides" section (replaced with a
short "Real-Graph feature flags" note pointing at this section). Nothing
else in the repo referenced `devFlagOverride` or `window.__DEV_FLAGS__` —
confirmed by grep before removing, not assumed.

**A real, if narrow, category of test breakage found and fixed.** Several
committed suites called a save/apply function (`saveAddCoinForm()`,
`showBrowseEditView()`) with no mock Graph client configured, relying on
the flag being off BY DEFAULT so the call took the session-only mockup
path. With the default flipped, those same calls now attempt the REAL
write/read path with nothing to talk to, throwing ("Write layer
unavailable" / a rejected fetch) instead of silently no-op'ing. Each was
fixed the same way: force the flag off explicitly via the existing test
seam (`__setAddCoinWriteEnabledForTest(false)` /
`__setBrowseEditWriteEnabledForTest(false)`) right before the call, and
restore it to `null` afterward — the same pattern every OTHER block in
these files already used when it deliberately wanted the mockup path,
just not yet applied to these specific blocks. Four call sites needed
this: `verify_addcoin_accordion.js` block F, `verify_addcoin_identification
.js` block D, `verify_addcoin_mintmark_other.js` block J, and
`verify_retest_batch2.js` block D (the last one specifically because
Notes' own prefill is gated on `browseEditWriteEnabled()` — the "Notes
flash" bug fix — while the other prefilled fields in that same block
aren't gated at all and kept passing throughout). `verify_addcoin_phase1
.js`'s own "flag ships off / inert" block was rewritten outright (not
just patched) to assert the new real default instead, since its entire
premise — checking the raw consts at page load — described exactly what
changed.

**Verified headless — new committed suite
`tests/verify_dynamic_redirect_and_live_flags.js` (15 assertions), all
passing; 1058 across all 26 suites, zero failures, zero page errors.**
Covers: `WRITE_TARGET === "copy"` and all six flags resolving correctly
in the shipped default (the two read-only ones `true` unconditionally,
the four write-capable ones matching `WRITE_TARGET === "copy"`);
`devFlagOverride` and `window.__DEV_FLAGS__` both genuinely gone from the
running page; `redirectUri` equal to `window.location.origin +
window.location.pathname` at the moment the page loaded, with a negative
control confirming this isn't a coincidental match against a leftover
hardcoded string; and direct filesystem checks (not just page behavior)
that `dev-flags.local.example.js` is deleted, `.gitignore` and README.md
no longer mention the mechanism, and `app.html`'s own source no longer
contains the script tag or the `devFlagOverride` function definition.
Every other suite's fixes (the four rescued blocks above) are covered by
those suites' own existing assertions, which now pass again unchanged in
substance — only the flag-management around each call site changed, not
what the assertions check.

- **Not verified: any real device, any real OneDrive session.** In
  particular, this is the first time any of these flags is genuinely live
  on the real GitHub Pages site rather than gated behind a local file —
  the next real page load there will attempt real Microsoft sign-in
  redirects for Reference Images and Live Nav Data (both read-only), and
  the four write-capable features will do the same the first time each
  is actually exercised, all still confined to the `_Testing` copy
  workbook by `WRITE_TARGET`. Worth Ray's own confirmation that the first
  real sign-in redirect on the live site behaves as expected.


### Docket: FAKE_NEEDS_QUEUE demo rows cleared (BUILT, Ray's explicit go-ahead)
The two "Awaiting Copilot Research" entries Ray flagged (`1932-D ·
Washington`, `1943-S · Lincoln Wheat · Steel`) were investigated and
confirmed to be the hardcoded `FAKE_NEEDS_QUEUE` mockup fallback rows, not
real orphaned Force Add data: no `collectionId` on either seed object
(a real Force-Added coin always carries one), the dates predate the real
Docket build entirely, and this very file used to cite one of them as its
own illustrative example. `docketOpenEntries()` only ever falls back to
this array when `ENABLE_DOCKET_WRITE` is off (the default/shipped state)
or the durable `docket.json` can't be read — the real durable queue has
fully superseded it as a fallback, so Ray's call was to clear it to `[]`
rather than keep it as demo filler. An empty Docket is now the correct
display with the write layer off, same as it will be once
`ENABLE_DOCKET_WRITE` eventually goes on for real.
`verify_docket_row_tags.js`'s "a real Docket queue entry tags Research"
check relied on those two seeded rows existing — updated to seed its own
entry via `appendDocketEntry()` instead (the same mechanism a real
flag-off no-DB_Coins-match save already uses), not weakened.


#### (continued) Set attach / detach: the real OriginSetID write layer (BUILT and merged to main; built on `claude/add-coin-write-path-fs2rf8`, tip `3767eb4`, landed via rebase; the code is on `main`)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 13317-13361).

**Verified headless — new suite `tests/verify_set_link_write.js` (63
assertions); 1631 across 39 suites, zero failures.** Covers the
never-write/allow-list invariants; attach and detach writing the real cell
with no other column and **no other row** touched; all four conflict cases;
the two comparison helpers' opposite blank semantics; the lock coalescing a
double-tap to one write; the `ensureOriginSetId()` guard; the opt-in detach
control (including zero controls on read-only Browse detail); the
stopPropagation; full end-to-end through Edit Set's own UI for both attach
and detach including the confirmation dialog's Cancel and Confirm paths; and
flag-off inertness (no controls, no writes, session-only path intact).

**Five verified negative controls**, each re-run against the real file and
confirmed to fail exactly its own assertions: conflict check removed
(D1–D4, cells clobbered); per-child lock removed (F2/F3, two writes);
detach control made unconditional (H1/H2/L1 — the destructive control leaks
into read-only Browse detail); `ensureOriginSetId()` guard removed (G1/G2);
and an optimistic detach (N2/N6).

- **A REAL GAP THE NEGATIVE CONTROLS CAUGHT, worth remembering.** The
  optimistic-detach control initially failed NOTHING — every block
  exercised only the SUCCESS path, where optimistic and non-optimistic are
  indistinguishable. The discriminating case is a write that FAILS, which
  nothing tested. Block N was added for exactly that (a rejected
  `patchWorkbookRanges`, so the failure lands after the conflict check
  passes — precisely where an optimistic implementation has already mutated
  memory) and now fails the control. **Seventh time this project has hit
  the "green suite hiding a real bug" trap; the tell is always the same —
  an assertion whose broken case also returns the passing value.**
- One existing block (`verify_phase2_and_retest_batch.js` K) needed
  `__setSetLinkWriteEnabledForTest(false)`: it tests the session-only path,
  which is now the flag-OFF behaviour. Following the established
  deliberately-flag-off convention, not weakened.
- **Not verified: any real device, any real OneDrive session.** This is a
  new write surface and wants a live `_Testing` run before it is trusted —
  in particular confirming that a real attach/detach lands on the child's
  row and that the conflict refusal reads sensibly on a phone.
- **Explicitly out of scope and untouched**: Set-level Value re-estimation,
  Sell/Remove for Sets, every other Edit Set field write (its Save is still
  session-only), and the candidate-list UX/filtering polish from Task 2's
  report. **Correction carried forward from that report: the picker's
  `!c.originSetId` exclusion is NOT a bug and was deliberately left alone** —
  it was a symptom of the `setChildrenFor()` gap fixed the round before, and
  loosening it now would make already-attached children appear as
  attachable candidates.


### Splash + Album prefetch: three live-device fixes (BUILT and merged to main)
**Merge status: confirmed and merged.** Everything from this section
through "Albums: variety-label bug fix, rounded Mintage, 'Included' for
shared figures" below (five sections in total — the splash/album-prefetch
bug fixes, the Docket-badge grace-period fix + Value floor/currency
formatting, the graph-auth escalation-threshold fix, the confirmed Docket
regression fix, and the Albums variety/Mintage display work) was built
across several rounds on `claude/code-primer-u8uv1d` and held pending a
live-device pass. Ray confirmed live: the Docket-badge ~3s lag is the
accepted, designed tradeoff of the grace-period fix (not a bug, no further
work needed); the Value floor + two-decimal currency formatting; the album
next/prev coin-order arrows; and the album image prefetch/population
("great now") are all working correctly, and gave explicit go-ahead to
merge the whole branch. Two small Albums display corrections (the
"Mintage" label prefix removed, variety/mintage render order swapped —
see that section's own follow-up note) landed in the same merge. **`main`
is now the source of truth for all of it**, same standing as every other
merged-after-holding branch in this file — the section headers below are
kept as "BUILT and merged to main" rather than rewritten, matching the
convention every other merged branch in this file already follows.

Ray's first real-device pass on the two features just above (splash gating,
album prefetch) found three real bugs — none of them new features, all of
them the prior task's own design assumptions turning out wrong once run
against a genuine signed-in session and a real album. All three are fixed
here.

**Bug A — the splash hid too early on a real device.** The splash-gating
section above already changed the gate from "any resolution hides it" to
"only a real `true` hides it" — but that alone didn't fix Ray's report,
because the REAL cause was a race that predates this feature entirely:
`handleRedirectPromise()` (MSAL's own once-per-load call, fired at module
init) was never awaited before the very first `acquireTokenSilent()` call
several thousand lines later (`navigate("dashboard")`'s own synchronous
`ensureLiveNavDataFetch()` call, run during init with no `await` in
between). On a normal boot with a valid cached session, `acquireTokenSilent()`
could fire while `handleRedirectPromise()` was still genuinely mid-flight —
a well-documented MSAL gotcha, not specific to this app — and the resulting
transient failure was previously enough to make the splash bail early (a
`false`/error treated as "done").
- **Fixed at the source**: `graphRedirectHandledPromise` now holds
  `handleRedirectPromise()`'s own promise (kept, not fire-and-forgotten),
  and `acquireGraphToken()` — the one serialized token-acquisition choke
  point every Graph feature already shares — `await`s it before ever
  calling `acquireTokenSilent()`. Since `handleRedirectPromise()` always
  resolves (with `null` on every boot that isn't literally the instant
  after a sign-in redirect lands), awaiting it costs nothing once already
  settled and removes the race for every caller, not just the splash.
- **Second, defense-in-depth half**: a throw from `acquireTokenSilent()`
  does not always mean "no session, must redirect." With a cached account
  on file, only MSAL's own `InteractionRequiredAuthError` genuinely means
  interaction is unavoidable; anything else (a transient cache/network
  hiccup) is now treated as "no answer yet, try again" rather than grounds
  to yank the user into a real sign-in redirect. Extracted into a pure,
  directly-testable function, `shouldStartInteractiveRedirect(hasAccount,
  error, InteractionRequiredAuthErrorClass)`, specifically because
  `acquireGraphToken()` itself can't be exercised end-to-end from this
  sandbox (`graphMsalInstance` is always `null` here — no real MSAL ever
  loads) — this is real coverage for the decision logic even though the
  MSAL integration around it can't be driven headlessly.
- **The splash's own gate is unchanged in shape from the section above**
  (hide only on a genuine `true`, retry every `SPLASH_RETRY_INTERVAL_MS`
  within the 5s ceiling) — Bug A was entirely about WHY a real session
  could produce a spurious non-`true` answer in the first place, not about
  the gate's own logic.
- **A second, genuinely new bug found WHILE building this fix, not
  guessed at**: `runSplashConnect()` is called more than once in real
  usage (the Retry button, or a fast double-click) — every invocation used
  to start its own fully independent 5s timeout with nothing canceling an
  older one's. An older, still-pending invocation's timer could fire the
  error box back up well after a NEWER, already-succeeded invocation had
  hidden the splash — reproduced directly in testing (a stale 5s timer
  fired ~3.75s into an unrelated later test block, corrupting its timing
  measurement). Fixed with a generation token (`splashConnectGeneration`,
  bumped at the top of every `runSplashConnect()` call) — a `stillCurrent()`
  check gates every DOM mutation, so only the most-recently-STARTED
  invocation is ever allowed to touch the splash, regardless of which one's
  timers fire first.

**Bug B — a fresh album open never prefetched real content.** The prior
section's own "scoping decision" claimed a fresh open (`showAlbumDetail()`,
always landing on the cover, pageIndex 0) correctly prefetches "zero
reference-image fetches — the cover has no slots to prefetch." That was
true and also exactly backwards from what the feature needed: the cover
page is the ONE thing that never needs prefetched images (no slots), so
scoping strictly to "whatever's currently visible" made the ONE path that
actually needs this feature (a brand-new open) a guaranteed no-op — the
user would still watch placeholders pop in the moment they turned past the
cover to the first real coins page.
- **Fix, inside `openAlbumAtPage()`**: after computing `visiblePages` via
  `computeVisibleIndices()` exactly as before, a new check —
  `if (!visiblePages.some(p => p.type === "coins"))` — catches the
  cover-only case specifically (the ONLY way `computeVisibleIndices()` can
  return a page set with no coins page in it, since `pageIndex` is only
  ever 0 for a fresh open) and appends the album's first real coins page
  to the prefetch target. **This does not change where the book opens** —
  the cover still displays first, in order, completely unchanged — it only
  widens what gets waited on BEFORE that reveal.
- **Scoped narrowly, on purpose**: the widening only fires when the
  visible set is genuinely cover-only. Reopening at a later coins page
  (the filled-slot Browse-detail "Back" round trip) already has a real
  coins page in its visible set and is completely untouched — it still
  prefetches exactly that page's own series, never also the album's first
  chunk on top of it.
- **The prior section's own claim is now stale and superseded by this
  note** — "a fresh open triggers zero reference-image fetches" described
  the bug, not the fix; don't read that line as still-current behavior.

**Bug C — a resolving image never repainted a page already on screen.**
Confirmed real and pre-existing, untouched by either feature above:
`renderSlotCell()` is a string-templated render (`innerHTML`), not a live
element reference the way `applyDiscContent()` is — so a slot's own image
fetch resolving had nothing to notify. The placeholder disc just sat there
until the user flipped away and back, which forces a fresh render that
finally reads the by-then-cached image.
- **New `albumBookIsShowingSlot(matchSlot)`** answers "is the slot this
  fetch was for still on screen right now" — fully derived from live state
  on every call (current album, current page, whether the book is even
  open vs. still on the list), no snapshot/token of its own needed: if the
  user has since closed the album, opened a different one, or flipped to a
  different page, it simply returns `false` and the caller skips the
  redraw.
- **Wired into `renderSlotCell()`'s two cache-miss tiers** (the stored
  Photos-tab photo, and the series reference image) — each now attaches a
  `.then(url => { if (url && albumBookIsShowingSlot(...)) renderAlbumBook();
  })` onto its existing fetch call, so a resolving fetch redraws the page
  in place, autonomously, exactly when the user is still looking at it.
  The reference-image tier's redraw-triggering call is a deliberately
  redundant, safe call to `ensureReferenceImageFetch()` — `hasReferenceImage()`
  already kicks off the same fetch on its own cache miss, and this second
  call dedupes against that same in-flight/cached promise (never a second
  real fetch); it exists purely to attach this one callback.
- **Deliberately scoped to the album book specifically** — not a
  project-wide live-update mechanism for every other place in this file
  with the same render-once-per-fetch pattern (e.g. Catalog/Browse's own
  reference-image tiers), which would be a separate, much larger
  undertaking. `hasReferenceImage()`/`ensureReferenceImageFetch()`
  themselves are untouched, shared code — only `renderSlotCell()`'s own
  call sites gained the new callback.
- **A real bug found and fixed WHILE BUILDING the test for this, not in
  the app itself** — worth recording since it cost real debugging time (a
  test process pinned at 100%+ CPU for several minutes before being
  root-caused): a test stub that fully replaces `ensureReferenceImageFetch()`
  but never reproduces its real CACHING side effect (writing into
  `referenceImageCache` once a real answer lands) creates an infinite
  render→fetch→render cycle. `hasReferenceImage()` never sees a cache hit,
  so `renderSlotCell()`'s own miss branch keeps re-calling
  `ensureReferenceImageFetch()` on every redraw — and since an
  ALREADY-RESOLVED promise's `.then()` fires on the very next microtask,
  that becomes an unbounded cascade that starves the event loop's
  macrotask queue (a real, reproduced hang, not a guess — a
  `setTimeout`-based wait inside the test never got to fire). This is not
  an app bug: production's real `ensureReferenceImageFetch()` does cache
  correctly, so the cycle self-terminates there after one real resolution.
  The committed test's stub was fixed to mimic that same caching side
  effect, not just the return value — a lesson worth remembering for any
  future stub of a memoizing function in this codebase.

**Verified headless — the existing `tests/verify_splash_and_album_prefetch.js`
suite was extended in place, not forked**, since all three bugs are
corrections to the same two features that suite already covers. Block I
(Bug B's scoping test) was rewritten to assert the new widened behavior —
a fresh open now includes the album's first coins page's series, and a
negative control confirms this is genuinely scoped to the cover-only case
(a reopen at a later page does NOT also include the first chunk). Two new
blocks were added for Bug C: `albumBookIsShowingSlot()` in isolation
(on/off the matching page, a nonexistent slot, after closing the book) and
a full end-to-end repro — driving the real `renderSlotCell()`/
`renderAlbumBook()` code path with a controlled, cache-aware stub, asserting
the disc has no image before, still none mid-flight, and the resolved image
appears afterward with the test itself never calling `renderAlbumBook()`
again — plus a negative control confirming the redraw is genuinely
suppressed once the user has left the book, not that it always happens
regardless. A new GEN/NEG_GEN pair covers the generation-token fix
directly, including a negative control that recreates the pre-fix
`runSplashConnect()` body inline and confirms it DOES reproduce the stale-timer
symptom.
- **Not verified: Bug A's actual live-device fix.** `graphMsalInstance` is
  always `null` in this sandbox — real MSAL never loads here — so
  `acquireGraphToken()`'s integration with `handleRedirectPromise()` and
  the real timing race it fixes cannot be exercised end-to-end from this
  environment at all. Only the extracted pure function
  (`shouldStartInteractiveRedirect()`) has direct test coverage; the actual
  fix needs Ray's own real signed-in-session pass to confirm it resolves
  the reported symptom (not just the synthetic no-token fixture this suite
  already runs against).
- **Not verified: Bug B/C on a real device.** Both need the same "open
  Mercury Dimes fresh from the album list, sit on the first coins page
  without flipping, watch images populate in place" pass the task itself
  asked for.


### Graph auth: a persistent silent failure now escalates to a real redirect (BUILT and merged to main)
Live-blocking regression from the splash-gating Bug A fix (see "Splash +
Album prefetch: three live-device fixes" above): Ray hit "Couldn't
connect," and Retry never helped, no matter how many times he clicked it.

**Root cause, diagnosed rather than guessed at, and confirmed as the
correct mechanism once traced.** Bug A's own fix
(`shouldStartInteractiveRedirect()`) correctly narrowed which
`acquireTokenSilent()` failures deserve a real interactive redirect — with
a cached account present, only a confirmed `InteractionRequiredAuthError`
does; anything else (a transient cache/network hiccup) is treated as "no
answer yet, try again." That's the right call for a genuine one-off blip.
**But the rule has no memory** — it re-evaluates the exact same way on
every single call, so a failure that ISN'T one-off (a silent-iframe
failure, e.g. a `BrowserAuthError` like `monitor_window_timeout` — common
on mobile Chrome when third-party cookies are restricted) repeats
identically forever. The splash's own retry loop calls `acquireGraphToken()`
(via `ensureLiveNavDataFetch()`/`loadDocketQueue()`) every
`SPLASH_RETRY_INTERVAL_MS` for up to `SPLASH_DATA_TIMEOUT_MS` — so this
produces an infinite silent-fail loop that never reaches the one thing
that would actually work: a real `acquireTokenRedirect()`. Retry just
restarts the identical doomed loop, since nothing about clicking it
changes what `acquireTokenSilent()` keeps throwing.

**No real-device console log was available to confirm the exact MSAL
error class** — this sandbox can never load real MSAL (`graphMsalInstance`
is always `null` here, same standing limitation Bug A's own fix already
carries), so the mechanism is diagnosed from the code's own logic rather
than a captured stack trace. The fix below is built to be correct
REGARDLESS of which specific non-`InteractionRequiredAuthError` MSAL
throws — it doesn't special-case `monitor_window_timeout` or any other
particular error class, so it holds even if the real error turns out to
be something else entirely.

**Fix: a failure-count ceiling on the "retry silently" branch
specifically**, layered on top of `shouldStartInteractiveRedirect()`
rather than replacing it — that function's own immediate-escalation rule
(missing account, or a confirmed `InteractionRequiredAuthError`) is
untouched and still fires instantly, unaffected by any of this.
- **New `shouldEscalateAfterSilentFailures(hasAccount, error,
  InteractionRequiredAuthErrorClass, silentFailureCount)`** — pure and
  directly testable, same reasoning as `shouldStartInteractiveRedirect()`
  itself. Defers to that function first (its own immediate-escalation
  cases pass straight through); only when it says "retry silently" does
  the new ceiling apply: `silentFailureCount >=
  GRAPH_SILENT_FAILURE_ESCALATION_THRESHOLD` also escalates.
- **`GRAPH_SILENT_FAILURE_ESCALATION_THRESHOLD = 3`** — small enough to
  rule out a genuine one-off blip (the exact case `shouldStartInteractiveRedirect()`'s
  "retry silently" branch exists to absorb) without leaving the user stuck
  for long: at the splash's own 400ms retry interval, 3 consecutive
  failures is ~1.2s into a boot attempt, comfortably inside the 5s display
  ceiling. Chosen, not derived — worth revisiting if a live pass shows it
  firing too eagerly or too slowly.
- **New `graphSilentFailureCount`**, a module-level counter alongside
  `graphTokenInFlight`/`graphRedirectStarted`. Incremented in
  `acquireGraphToken()`'s catch block only when `shouldStartInteractiveRedirect()`
  itself says "retry silently" (an immediate-escalation case doesn't need
  the ceiling and shouldn't inflate it); reset to `0` on any real
  `acquireTokenSilent()` success (a coin that recovers mid-streak must not
  carry a stale count into a later, unrelated failure streak); reset again
  once an escalation actually fires (defensive — `graphRedirectStarted`
  already prevents a second redirect on top of it, so this is belt-and-
  braces, not load-bearing).
- **Deliberately NOT tied to `runSplashConnect()`/Retry in any way — no
  reset on a new invocation.** The counter is a property of the shared
  token-acquisition choke point (`acquireGraphToken()`), not the splash
  specifically, so it keeps accumulating across repeated calls regardless
  of which feature is driving them. This is what satisfies the real
  requirement: a persistent failure trips the ceiling **within a single
  boot/Retry attempt** on its own (3 failures well inside the 5s window),
  never requiring the user to click Retry a specific number of times to
  slowly build up a count across separate invocations. A page reload (not
  just a Retry click) still clears it for free, same as every other
  module-level auth-state variable in this file — that's ordinary JS
  module-state lifetime, not something this fix manages explicitly.
- **`__resetGraphTokenStateForTest()` now also clears
  `graphSilentFailureCount`**, alongside the two variables it already
  reset.

**Not `monitor_window_timeout`-specific, and deliberately not scoped
narrower than "any non-`InteractionRequiredAuthError` failure with an
account present."** Special-casing one MSAL `BrowserAuthError` subtype
would have meant guessing at exactly which error Ray's device throws
without a confirmed log — the ceiling instead treats every persistent
failure of that general shape the same way, so it's correct whether the
real cause turns out to be `monitor_window_timeout`, a different
silent-iframe failure, or something else again.

**Verified headless — new committed suite
`tests/verify_graph_auth_escalation.js` (13 assertions), all passing;
1454 across 34 suites, zero failures, zero page errors.** Covers
`shouldEscalateAfterSilentFailures()` in isolation across every branch
(missing account always escalates regardless of count; a confirmed
`InteractionRequiredAuthError` always escalates regardless of count; a
non-`InteractionRequiredAuthError` failure with an account present does
NOT escalate below the threshold — the one-off-blip case the original
Bug A rule exists to protect — but DOES escalate at and past it); a
**negative control reproducing the exact reported symptom** — driving
`shouldStartInteractiveRedirect()` ALONE (the pre-fix decision, with no
failure-count widening) repeatedly and confirming it never escalates a
persistent failure no matter how many times it's called, proving the
positive assertions exercise a real fix and not a restatement of the old
rule; and a sandbox-limitation acknowledgment block — confirming
`graphMsalInstance` is genuinely `null` here (documenting WHY the real
`acquireGraphToken()` catch-block integration, the counter actually
incrementing and calling `acquireTokenRedirect()`, cannot be driven
end-to-end from this environment, same standing limitation
`shouldStartInteractiveRedirect()`'s own Bug A coverage already carries)
plus regression checks that `acquireGraphToken()` still resolves to
`null` immediately with no MSAL instance and that
`__resetGraphTokenStateForTest()` is still callable without throwing.
- **Not verified: the actual live fix.** This is the same acknowledged gap
  Bug A's own fix carried, now inherited by its follow-up: the real
  integration (a genuinely repeating `acquireTokenSilent()` failure on
  Ray's own device actually escalating to a real `acquireTokenRedirect()`
  after 3 attempts, and that redirect actually resolving his "Couldn't
  connect") needs his own live-device pass — this environment can only
  verify the pure decision logic in isolation. **If it's still reproducible
  after this fix, the most useful next artifact is a real console log of
  the actual thrown error** (its `errorCode`/`name`) — that would let a
  follow-up either confirm the diagnosis directly or reveal a different
  mechanism entirely (e.g. a genuinely-expired refresh token that MSAL
  itself should be classifying as `InteractionRequiredAuthError` but
  isn't, which would point at a different fix).

**SUPERSEDED — this was investigating the wrong layer.** A direct A/B
test (Ray switched GitHub Pages' deploy source from this branch to `main`,
no other change) made "Couldn't connect"/Retry-does-nothing disappear
completely. `main` has none of this branch's splash-gating code at
all — not the `handleRedirectPromise()` race fix, not the
`InteractionRequiredAuthError` distinction, not this escalation-threshold
fix, and (the actual culprit) not the Docket-badge gate either — so
NONE of it can be the real cause; the escalation-threshold work above is
kept as a real, independently-justified improvement (a persistent silent
auth failure genuinely should escalate eventually), but it was not what
Ray was hitting. See "Splash: the Docket queue can no longer block the
whole app" below for the confirmed regression and its fix.


### 17Jul2026 (chat session, reported after the CollectionID-reservation merge)
- **Workbook snapshot as of Copilot's morning briefing**: `All` sheet 532 rows,
  max CollectionID `AY-00663`, 16 rows still missing a CollectionID (blocked on
  the set-restructure). `DB_Coins` 3,760 rows, 0 duplicate CoinIDs. Albums 419
  slots across 6 albums (Roosevelt Dimes 1946-1964 at 12/48 filled).
  `PCGS_Duplicate_Queue` essentially resolved (197 items closed). ~79 open
  ParkingLot items. **Treat as a point-in-time snapshot, not current fact** —
  re-check before relying on any of these numbers, same caution CLAUDE.md
  already gives for any pulled copy of DB_Coins.
- **Two stale Copilot findings caught and sent back for re-verification**
  (not new gaps): (1) SpotValue formula — already built and deployed 7/13 on
  `All!Z`, Copilot's briefing proposed it as new work; (2) Albums "17 orphan
  CoinID references" — investigated 7/13, did not reproduce (0 orphan refs
  confirmed then). Don't accept either as a real open item without a fresh
  count.
- **Copilot task list in flight** (sequenced, one research thread at a time):
  re-verify the two stale items above; status-check NGC certification
  research (~93/366 as of last check) and the 3-row OGP Value paste
  (unconfirmed as of 7/16 evening); compile the 59 letter-only-grade rows
  with context (data-gathering only, no conversion decision yet); then
  research the Jamestown/Lincoln Bicentennial/Bald Eagle Recovery
  product-code pairs against PCGS CoinFacts.
- **Explicitly held back / blocked, not forgotten**: GSID Phase 2 (blocked on
  Ray photographing Lincoln Memorial/Wheat/Shield Cent + American Silver
  Eagle Red Book pages); the 158-set restructuring (blocked on Ray choosing a
  priority order — Proof Sets / Silver Proof Sets / Mint Sets / a specific
  year range); American Women Quarters Proof Set identification (needs Ray to
  check his own physical box/certificate); ANACS/ICG/CAC label research
  (parked, no urgency, unchanged from the ANACS/ICG/CAC note above).
- **This session's app-side work** (CollectionID-reservation Promotion/
  Rejection) is documented in full under "CollectionID-reservation system —
  Promotion / Rejection" above; this log entry is only the workbook/Copilot
  side of the same session, which doesn't otherwise touch app.html.
- No direct workbook edits were made by Claude (chat) this session — all
  app-side work went through Claude Code (merged to main, see above); all
  workbook-side work is Copilot's, per the task list above. No new checkpoint
  upload was needed yet — one is recommended once Copilot's current task
  list is confirmed complete.

## Value fallback: melt is labelled (task (g), built 30 Oct 2026 on `claude/value-fallback-melt-label`)
One-paragraph story; the rules are in docs/ref/LEDGER.md ("Value fallback: melt is labelled") and
docs/ref/ALBUMS.md (star rule). Plan first (27-30 Oct), then Ray's answers: One-Year Design / Dual
Date get no star; Net on valued coins only; compact tiles carry no date; "Recorded" becomes
"Valued"; a recorded Value below face stays "valued" at the face amount; face-only coins are a
separate line, in no total. Changed from the plan: face-only coins are NOT counted in the Valued
or Melt totals (Q3 rewritten by Ray), and the face floor first also applied to a melt amount while it
stayed basis "melt"; Ray then changed that (30 Oct, same branch): melt above 0 but below face is
basis "face", melt equal to face stays "melt". New suite `tests/verify_value_fallback_melt.js` (57 at first, 70 after the below-face change); changed on purpose:
`verify_ledger_value_by_metal` (A4, B3, B4, B6, D1, E2), `verify_album_best_of` (H3, H4). Negative
controls (SpotValue fallback and melt-as-valued restored: 24 fail; "other gets a star" restored:
J3, K1 fail; the below-face change: "floor but keep the melt label" restored, 8 fail).

## Save only when something changed (task (z), built 30 Oct 2026 on `claude/save-only-when-changed`)
The rules and names are in CLAUDE.md ("Save only when something changed"). This is the story behind them.
- **What the code did before.** Edit Coin and Add Coin counted `browseEditTouchedFields` / `addCoinTouchedFields`, sets that only grew, so a value typed and put back still counted. Save was never disabled on Edit Coin, Edit Set or the Staging edit; only Manage Photos hid its Save. Photos on owned records and in a Staging draft were already right (pending flags; undo clears them): reproduced with a throwaway script, Replace then Put it back left the leave guard at nothing unsaved. A label edit on a stored photo in a Staging draft was not counted at all. A Save click on a clean Edit Coin still stamped LastModified and blanked Reviewed; a clean Staging edit rewrote coin.json.
- **Build notes.** Edit Coin's baseline is taken at the end of `showBrowseEditViewInner` and re-taken when the live row lands (`applySnapshotToEditFormInner`), so the async re-base is never dirty. The Add Coin baseline is per box, captured in the capture phase on a user's first focus / pointer / key, because deep-link prefills and Staging loads happen at unpredictable moments. `removedCount` stays for the toast only. `pendingButtonProgress`'s restore and `restoreBtn()` still set `disabled = false`; `withEditSaveLock`'s `finally` re-runs `refreshEditSaveState()` afterwards.
- **Test traps met.** `W.set` in a copied helper overwrote the suite's own `W.set` (the Set record): the helper is `W.setv`. Two old suites clicked Save a second time on a form the first Save had already left (verify_cacbean_and_value_rounding C3, verify_status_exit C5 / E6); they now reopen the form. `save()` helpers waited for the Save button to re-enable, which no longer happens once nothing is left to save; they wait for `editSaveInFlight`. One verify_photo_label_save case set a Set field with `.value =` and no input event, so the dimmed button never woke (a person's typing always fires one). The new suite reloads the page between groups (`fresh()`): a late `blob:null` image error (a revoked photo URL) appeared only when the Manage Photos, Edit Coin and Edit Set groups ran in one page.
- **Negative controls** (each run against `tests/verify_save_only_when_changed.js`, then restored): touched-boxes-only for Edit Coin: A2-A10 and A13 fail; touched-boxes-only for Add Coin / Staging: F2, G1-G4, H1 fail; stored-photo labels not counted: G2; the photo-change refresh removed: B1-B3; the in-flight guard removed: C3; numbers compared as text: D1 (A3 cannot tell, Edit Coin's shape already holds numbers); Gifted takes nothing back: A10, D3-D5; the clean-click guards removed: A14, D5, G6; taken-off photos not derived: G4.
- **Not done, by Ray's decision (Q7):** Add Set Step 1 resume and child capture, Wishlist detail, Batch Receipt, Ledger spot-price update: backlog (ab).

### (z) follow-up: Year picker, deep links, call-site tests (30 Oct 2026, same branch)
- **Year picker.** `selectYear()` set the Year with an untrusted `input` event, so the Add Coin guard never counted a year chosen through the picker. `markAddCoinUserEdit()` (baseline + touched, called before the value is set) fixes it for a new coin and for a Staging edit; the control is a picker pick on a form whose Year box was never focused (H3, I1, J5). H3 first sat after a typed Year and could not tell: the typed edit had already captured the baseline and touched the box, so it now runs before any typing.
- **22 Jul Sets-checklist protection** is Add Set's `addSetNameTouched` / `addSetYearTouched` (set in `applyAddSetContext()` and `resumeSetDraftAtStep1()`); (z) did not touch Add Set. K1 is the control (no deep link: a product code does fill Name and Year), K2-K3 the protection; removing the two flags fails K2 and K3.
- **Call-site audit.** All 22 `refreshEditSaveState()` calls were disabled one at a time and the suite run. 16 of the 22 failed no assertion (an earlier call in the same function, the delegated listener or the redraw gives the same answer; only 6 were caught). Four were removed as redundant by construction (end of `showBrowseEditViewInner`, two in `beginCoinDraftEdit`, the `finally` of `completeAddCoinSave`); the rest each got a case that forces the button into the wrong look, fires that one event and checks it was corrected (G8a-G8f, L1-L7; the receipt PDF case stops the change event at the input so the delegated listener cannot do the work). Second sweep: every one of the 19 remaining calls fails at least one named assertion when disabled.
- Other controls: a deep link that counts as an edit (`addCoinTouchedFields.add("year")` in `applyAlbumContext()`) fails J1. A first version of that control marked the box after the value was set, so its baseline equalled the prefill and nothing failed: a control has to make the form differ from its baseline.

## Receipts and photos alignment, Build 1 (built 31 Oct 2026 on `claude/receipts-photos-alignment`, code `e38e921` + `62cb911`, merged to main 31 Oct 2026 by fast-forward to `6a21b60`)
The rules stay in CLAUDE.md under the same heading. This is the build history.
- Background. Backlog (p), part of (af), (j). Ray's decisions with the coordinator (31 Oct 2026) replace the plan-only Builds A/B/C: the coordinator checked the workbook and every old All photo filename already has a matching Photos row for the same CollectionID (Obverse 24, Reverse 22, Obverse_Original 18 = Slab_Obverse rows, Reverse_Original 16 = Slab_Reverse, Photo3 11 + Photo4 2 = Reference; one stale cell, AY-00001 All.Reverse `AY-00001_reverse.jpg` vs its row's `_reverse_cropped.jpg`; no OriginalFilename column on Photos), and the 7 Charleston coins (AY-00716 to 00722) now have RC-00037 (Copilot, LIVE). So there is no "Move across" step.
- Ray's device test T2/T3 on TEST (`6ba532b`) changed the Binder wording to one text everywhere ("Not scanned (paper receipt in binder)", button "📒 Not scanned, paper in binder") and limited the button to a slot with no receipt (`62cb911`). His tests on `6a21b60` then passed: T1, R1-R3, T4-T10.
- Workbook pass after the merge (Copilot, 31 Oct 2026, LIVE): the 7 Charleston rows (RC-00037, DateAdded 2026-10-03), the 18 Binder rows (RC-00038 to RC-00055, DateAdded blank), the five renames, new Other_Photos, the photo columns grouped at AK:AR, all nine media columns as calculated formulas. The same on `_Testing` without the reorder.
- **Q3 (what Build 78 / `da1c19e` does with a Binder row), checked by running that app.html against a mock:** the detail page shows a tappable "Binder" that opens the viewer with "This receipt file wasn't found in OneDrive"; the Edit slot says "On file: Binder"; a scan picked and saved over it replaces the row and keeps RC-…. No write, no data harm: cosmetic only.
- Tests: `tests/verify_receipts_photos_alignment.js` (79 incl. the self-check pair): R read side, F first row / 2+ rows, B Binder, AC Add Coin and Staging edit, AS Add Set, D drift, W writes (old, new, no media names: Edit Coin Save, promotion, Force Add, CoinID / OriginSetID / Purged cells; formula cells survive; blank-row claim with "#N/A" media; the static list of write sites). Existing suites updated to follow the design, not weakened: verify_receipts_wait_for_save (I3a/I3b/I4a/I5, I5b new), verify_photo_receipt_write (L3/L5/L8/L9/L11, M, U1-U6/U8), verify_former_holdings_purge (E5, F11, I1-I4, Q5), verify_in_app_viewer (A5, C10), verify_pdf_receipt_viewer (receipts as rows), verify_photo_label_save (L12), verify_row_tiles_viewer_label (B13). Negative controls on the new suite: the Binder button offered over a stored scan (`62cb911`: Edit slot 1 fail, B6; Add Coin / Staging slot 2 fail, AC7 / AC8); the All fallback put back (9 fail: R1, R3-R5, R7-R10, R12); a write merging across a gap onto a media column (4: W3/W4 old and new); Receipt put back on the allow-list and written at promotion (5: W3/W4 old and new, W6); the LAST receipt row read (2: F1, F2); "Binder" treated as a file (9: F1, B1-B5, B13, B17, B18; run on `e38e921`, before the B / AC rework of `62cb911`).
- Full `npm test`: 4424 / 0 / 0 / 83 on `e38e921` and again on `6a21b60` before the merge.
