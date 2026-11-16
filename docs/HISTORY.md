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

## Details photo viewer: next / previous, Build B: negative controls (2 Nov 2026, `claude/details-viewer-next-prev`, code `f48c729`)
Rules and design: CLAUDE.md "Details photo viewer: next / previous, Build B" and docs/ref/PHOTOS.md. Each control was applied to `app.html` on its own, `tests/verify_details_viewer_nav.js` run, and `app.html` restored; every one failed by name except where noted.
- Wrap instead of stop: C2, C4. A receipt added to the list: B1. Each step pushes a history entry: G1, G2, G3. Late fetches allowed to paint (token ignored in `mediaViewerCurrent`): H2. Keyboard text-field guard removed: E3. Keyboard modifier guard removed: E2, E3. Swipe without the 50px threshold: F3-F7. Without the horizontal rule: F4-F7. Without the pinch-zoom guard: F6, F7. Sequence not cleared when another viewer opens: B2, B3, B3b. A Set's list including its child coins: I2, I3. Raw gallery order instead of the page order: 17 fail (A2-A4 and everything that walks the list). Next/previous added to the edit-screen opener: L1, L2. Neighbour prefetch off: H3. Parent COA pages not appended: A5, A6, A7.
- **Multi-touch swipe guard has two layers** (the touchstart single-finger check and the touchend "a finger is still down" check). Removing either ONE leaves F5 passing (the other layer catches it), so it passed as a single control; with BOTH removed F5, F6 and F7 fail. Both layers are kept on purpose.
- Test-quality note: `history.length` does not rise when entries ahead are dropped by a pushState, so G counts `history.pushState` calls instead.

## Dates the app writes are real Excel dates (merged to main 4 Nov 2026, `7b75c4e`): tests and TEST checks
Moved from CLAUDE.md at the merge (rules stay there).
- **Ray's TEST check of Build 92 (`167d688`, 4 Nov 2026):** (1) Edit Coin Value Date save gives a real date: passed; (2) a typed ISO text date reads as its day on the detail page and in Edit Coin, shows on the Docket, and a Remarks save turns it into a real date and clears the row: passed. Two other findings were NOT this branch: AY-00760's ValueDate was in fact written (Ray had looked at PurchaseDate); the blank Finish / Category and the leftover Staging draft go to the next branch (see Current state).
- Tests: `tests/verify_date_writes_real_dates.js` (56 incl. the self-check pair; T8 LastModified date-time a-e, T9 the wording a-c added in `bfe52cc`, P1c / P1d / P2 / P3 / D1 follow that design; negative control with the floored stamp and the old wording: 6 fail), run in America/New_York at 23:30 local on 4 Nov (UTC already 5 Nov). E0 the environment; N1-N5 negative controls (each fails on main `716a5e3`: 15 assertions fail, then the suite throws on the new names); H1-H9 the helper; P1-P9 every write path (Edit Coin, the self-repair, value + format in one request, a junk date refusing the Save, promote / Force Add, Set link and Purge LastModified, new Photos / Receipts rows, a Receipts row rewritten, spot-price LastUpdated and its "@" fallback, the JSON local day); D1-D4 the Docket row. Negative controls run on the branch: the UTC day instead of the local day (12 fail: N3a, H3, H6, H7, P1c, P2, P3, P4-P6, P8b, P9b); the "@" format kept (P8a). The 26 suites around these paths pass unchanged.
- **Not verified on a real device or the real workbook:** all of it. Suggested TEST checks: (1) Edit Coin on a coin, change Value Date, Save: the cell is a real date in Excel (right-aligned, yyyy-mm-dd, a number under General); (2) type ISO text into a TEST date cell in Excel, reload: the Docket shows "Date stored as text", the detail page and Edit Coin show the date; Save any change on that coin and the cell becomes a real date, the row goes on reload; (3) a receipt Replace on all over a row whose DateAdded is text: the DateAdded becomes a real date; (4) Add Coin with a Value Date, promote: both dates real; (5) after 8 pm, promote or dismiss a draft: the Staging JSON date is today, not tomorrow. Added for `bfe52cc`: (6) Edit Coin, change any field, Save: All.LastModified shows today's date AND the local time (yyyy-mm-dd hh:mm); a second save a few minutes later shows the later time; ValueDate / PurchaseDate stay date-only; (7) a Manage Photos or receipt-only save does not change LastModified; (8) the Docket's "Date stored as text" row for an All date names both fixes; a Photos / Receipts one says "Fix it in Excel.".
- Ray's TEST check of the head (Build after `bfe52cc`, 4 Nov 2026): Edit Coin dates, text-date Docket row and fix-on-save, Add Coin ValueDate, LastModified date + time on two saves, photo-only save leaves LastModified alone: all passed. Merged by fast-forward to `7b75c4e`.
- Investigation during this branch (4 Nov 2026), not bugs of this branch: AY-00760's "blank ValueDate" was PurchaseDate (ValueDate was written); a partial-batch theory did not fit the _Testing layout (ValueDate AD, LastModified AZ). Recorded instead as backlog (al) write-safety and the next branch (Finish / Category required, draft cleanup).


## Finish / Category required and draft cleanup (built 5 Nov 2026 on `claude/addcoin-finish-required-and-draft-cleanup`; merged to main 5 Nov 2026 by fast-forward to `7c3c82c` after Ray's TEST passed (all 7 checks))
Moved from CLAUDE.md: the spec as decided by Ray on 4 Nov 2026 (verbatim below), then what was built and how it was tested. Write-up of the code: docs/ref/ADD_COIN_WRITE.md ("Finish / Category gate and idempotent Promote") and docs/ref/DOCKET_STAGING.md ("Mark as promoted").

### The spec (verbatim from CLAUDE.md, "NEXT BRANCH")
#### NEXT BRANCH (decided by Ray 4 Nov 2026, NOT built): `claude/addcoin-finish-required-and-draft-cleanup`
Build in a NEW session, cut from main `7b75c4e`. Held write-layer change: Ray's TEST check, then his merge go-ahead. Read docs/ref/ADD_COIN.md, docs/ref/MATCHER.md and docs/ref/DOCKET_STAGING.md first.
- **Findings (investigated 4 Nov 2026, reproduced in the mock).** AY-00760 (2026 Lincoln Shield Cent) went to the All sheet with Finish and Category BLANK although its single catalog row C-2026--1C-01 says Business Strike. (a) `isConfidentMatch()` accepts exactly one candidate, and `dbCoinsCandidatesFor()` skips the Finish tier while the form's Finish is blank (the soft filter), so Save to Database showed. (b) The save wrote what the form had: a live match fills only Description (`applyMatchedDescriptionToForm`); Finish is filled from the catalog only by an ID lookup (`applyDbCoinsRowToForm`: PCGS label, Mint Item Number, GSID); Category only for bullion (`addCoinBullionCategory`, `applyInferredBullionCategoryToForm`). DB_Coins has NO Category column (coordinator checked). (c) After that direct save a Staging draft stayed open: Staging Review / the Docket hide a draft only when status is Promoted or `allRowWritten`, so the post-promote bookkeeping (`finishCoinDraftWrite`: it re-reads coin.json with no try/catch, then writes Promoted) did not leave Promoted, or a stale read was written back by Mark ready (`markCoinDraftReady` has no allRowWritten / on-All check). Ray's second Promote error fits the `createAllSheetRow` tripwire ("already appears on the All sheet at row N") after `findAllSheetRowNumber`'s column read missed a just-written row. All of this is the same on main before the date branch.
- **The Finish / Category gate (Ray: Q2, Q3, Q5).**
  - G1 `isConfidentMatch()` is false while the form's Finish is blank OR its Category is blank; the banner names what is missing and the catalog's value, e.g. "Pick a Finish to save straight to the database — the catalog entry says Business Strike." Save to Staging always stays available.
  - G2 One-tap buttons, never a silent fill: "Use <Finish> (from the catalog)" fills Finish from the single matched row; for a single coin (not a Set / Roll / bullion with its own Category) "Use Coin" fills Category with "Coin". Both stay editable afterwards. Bullion keeps its inferred Category as today.
  - G3 Save-time belt in `completeAddCoinSave`: promote only when the form has Finish AND Category; otherwise save to Staging and say why.
  - G4 The same rule gates **Promote from Staging** (the draft's finish / category must be set), **EXCEPT Force Add**, which may proceed with a blank Finish (and Category) as today.
- **Draft cleanup (Ray: Q1 build S1-S4, no coin.json check; Q4 tap only).**
  - S1 `finishCoinDraftWrite` never aborts on a failed re-read: fall back to the in-memory draft, write Promoted + allRowWritten FIRST, retry that write once.
  - S2 Staging Review and the Docket cross-check each listed draft against the loaded All rows (`activeCoins()`): a draft whose CollectionID is already on All shows "Already on the All sheet (row N)" with ONE action, "Mark as promoted" (sets Promoted + allRowWritten, moves photos as a promote does, writes no row). No Mark ready, no Promote, no Reject. **Only on Ray's tap, never automatic** (Q4).
  - S3 Mark ready, Back to draft and Edit refuse a draft whose coin is on All (`allRowWritten` or present in All), so a stale read can't overwrite Promoted.
  - S4 Promote is idempotent: retry `findAllSheetRowNumber` once after about 1.5 s before creating; if the `createAllSheetRow` tripwire finds exactly one row with this CollectionID, use that row; if that row already holds the draft's values, just mark the draft Promoted.
- **Tests (proposed, Ray agreed).** G-a negative control: one candidate + Finish blank -> not confident, Save to Database hidden, banner names the catalog Finish (fails on main). G-b Finish picked -> confident; the one-tap Finish button fills it. G-c a forced direct save with blank Finish writes no All row and leaves a Staging draft with a message. G-d review the suites that expect confident with blank Finish (`verify_description_conflict_gate`, `verify_retest_round2`, `verify_staging_edit`, `verify_finish_conflict_and_direct_write`): set a Finish / Category to follow the design, never weaken. Plus negative controls for the Promote gate, the Force Add exception (blank Finish still promotes) and the Category requirement (with "Use Coin"). S-a negative control: coin.json re-read throws during bookkeeping -> draft still ends Promoted. S-b a Draft whose CollectionID is on All shows only "Mark as promoted", which writes no row. S-c Mark ready refuses a coin on All. S-d negative control: Promote with a column read that lags once finishes on the existing row (one row, no duplicate) instead of the "already appears" error.
- Row 626 (AY-00760) on _Testing is left as it is (Ray).

### Ray's answers to the plan questions (5 Nov 2026)
- Q1 the Category literal is exactly "Coin" (live workbook: 359 rows, in Lookup_Categories, no blank Category on any All row); kept in one constant.
- Q2 CHANGED from the plan: Category is a dropdown filled from Lookup_Categories column A (header excluded) with a one-tap button labelled just "Coin"; shown on capture and in Staging edit; no free text; the app never adds a value; if nothing fits the coin goes to Staging; bullion keeps its own path and the two can never both be set; the "Use <Finish> (from the catalog)" wording stays.
- Q3 old Ready drafts without both show "Needs Finish and Category — Edit" (Edit only). Q4 keep the ~1.5 s look-again AND the tripwire adoption. Q5 keep "(row N)" via one column read only when a draft matches. Q6 loaded rows plus the allRowWritten flag; fresh reads only on the actions that write. Q7 check writePhotoRow for duplicates first.

### Change before TEST (Ray, 5 Nov 2026): adoption never overwrites
Ray's review of the first build: when Promote adopts an existing All row (second look, or named by the createAllSheetRow tripwire) it must never overwrite it. Built: identical row -> nothing written, draft marked Promoted; ANY difference -> nothing written, draft unchanged, message lists each differing field ("Cost: on the sheet 4, in the draft 3") then "Fix the row or the draft, or use Mark as promoted."; a different CoinID and two rows with the id unchanged (refused / hard error). The older first-look "row already exists" path was NOT changed; its callers and the overwrite behaviour are in ADD_COIN_WRITE.md and were reported to Ray. Test: `verify_draft_cleanup` S-d3 / S-d3b are NEGATIVE CONTROLS (an adopted row differing by Cost, via the second look and via the tripwire: no write to All, draft not Promoted, files not moved, message names the field); they FAILED on the earlier branch head `4fc5abd` (row overwritten, draft Promoted) and pass now. The identical-row cases (S-d1, S-d2) are kept; the old S-d3, which pinned the overwrite, was replaced.

### Second change before TEST (Ray, 5 Nov 2026): F7, the first-look path never overwrites either
Ray asked for the same never-overwrite rule on the older first-look "row already exists" path (it wrote the draft's populated fields over the row with no conflict check; the scratch run: Cost edited to 99, draft 3, result 3). Built: the first look, second look and tripwire now share ONE compare (`allRowHoldsCoinDraft`). Only fields the draft would write count; fully identical writes nothing (so a retry after failed bookkeeping no longer rewrites values or stamps LastModified); a blank sheet CoinID with the draft's CoinID and every other field matching writes ONLY the CoinID (`writeCoinIdCell`) and Promote finishes; any other difference writes nothing, leaves the draft open and lists the fields; a different non-blank CoinID and two rows stay refused. **Did it change the adoption behaviour?** Yes, in two ways: (1) the adoption compare already counted only fields the draft writes, so that part is unchanged; (2) a blank CoinID on an adopted row used to be listed as a difference and refused, and is now the expected link (CoinID-only write). Also new for both paths: an identical row is never touched. Tests (`verify_draft_cleanup` S-f, 8 new checks): S-f1 is the NEGATIVE CONTROL reproducing the scratch run (fails on `749e5a0`: Cost back to 3, draft Promoted, 4 patches; passes now: Cost stays 99, no patch, draft open, message "Cost: on the sheet 99, in the draft 3"); S-f2 only CoinID written (one `B<row>` patch, no LastModified stamp) and draft Promoted; S-f3 hand-added Remarks / StorageLocation where the draft is blank untouched; S-f4 identical retry writes nothing; S-f5 non-blank CoinID clash refused, Force Add retry writes nothing; S-f6 keys-only row refused. All 7 behavioural checks fail on `749e5a0`. No existing test needed a change.

### Third change before TEST (Ray, 5 Nov 2026): F3 pulled in, LastModified stamped; the branch is then closed to new scope
Ray: fill blank cells only, never overwrite, with the one shared compare. Built: the compare now splits `fills` (sheet blank, draft has a value) from `conflicts` (sheet holds something different). Promote (all three looks): only fills (+ a blank CoinID) -> those cells are written and Promote finishes; any conflict -> nothing written, draft open, only the conflicting fields listed; a keys-only row now finishes. Mark as promoted runs the same compare, fills the blanks first, keeps the sheet's values and says which ("Kept the sheet's Cost (99); the draft had 3."), and never closes a draft over an empty row (a failed fill leaves it open). Q2: the CoinID link (`writeCoinIdCell` with `stampLastModified`, same request) and the blank-cell fill (`saveCoinRowToWorkbook`) both stamp LastModified; the fill also blanks Reviewed like any app save, the link does not. Tests (`verify_draft_cleanup` now 43): S-g1 / S-g2 are NEGATIVE CONTROLS that FAIL on `2fa8716` (Promote refused a keys-only row; Mark as promoted closed the draft over an EMPTY row); S-g1b/c second look and tripwire; S-g2b a failed fill leaves the draft open; S-g3 / S-g3b the mixed case (Promote refuses with nothing written, Mark as promoted fills Remarks and keeps Cost 99); S-g4 blank cells plus blank CoinID. Updated for the new design: S-f2 (the link stamps LastModified, one request on the CoinID and LastModified cells; an old stamp is seeded so the change is observable); S-b (the leftover rows are now written by a real promote so they are complete; a hand-built partial row is correctly filled); S-f6 (keys-only refused) replaced by S-g. Not built, recorded under (al): F8, the "or use Mark as promoted" hint is not reachable for a re-linked Force Added draft.

### What was found (Q7) and decided
`writePhotoRow` rewrites the existing Photos row for a single-slot type but adds a NEW row for a repeatable type (Reference, Other, COA ...), so running `recordPromotedCoinRecords` twice can duplicate Photos rows (the (u) worry). `writeReceiptRow` replaces the coin's own row and `commitBinderReceipt` returns unchanged, so the Receipts side is safe. Mark as promoted therefore skips the photo move (and sets `filesMovedOnPromotion`) when the flag is set or the Photos / Receipts tabs already hold a row for the coin.

### Tests
- New: `tests/verify_addcoin_finish_category_gate.js` (44) and `tests/verify_draft_cleanup.js` (29 after the adoption change), both with the must-fail self-check. Negative controls, run against a worktree of main (`5a48157`) with a standalone script that uses only APIs main already has: A1 (`isConfidentMatch` true, Save to Database shown), C1 (a blank Finish / Category draft promotes), S-a (the draft stays "Ready for reconciliation" after a failed re-read), S-d1 (a lagging column read ends in "AY-00840 already appears on the All sheet at row 3", Ray's exact error): all four FAIL on main and pass on the branch.
- Existing tests changed to follow the design (an assertion was updated to the new rule, none weakened): `tests/harness.js` (`openApp` sets the Promote look-again wait to 0 unless `realPromoteRelook`; suites that sleep a fixed time around a Promote would otherwise race the 1.5 s wait and bleed a late Promote into the next scenario's mock); `verify_finish_conflict_and_direct_write` (the form fill and the direct-write scenario tap the Coin button: Category is required); `verify_description_conflict_gate` (FILL taps Coin; O4's source pin now allows the `!isLeftover(d)` term in front of READY && no CoinID; Q6's pin follows `readyAndMatched` / `readyToPromote = readyAndMatched && !promoteGaps.length`); `verify_retest_round2` (C1: the catalog row and the form carry Business Strike plus a Coin tap, then `resetAddCoinForm()` so the next scenario is not stopped by the leave guard); `verify_startup_connection` (J6's pinned request count 11 -> 12: Lookup_Categories is one more optional sheet read at startup, the same change Lookup_Errors made); `verify_phase2_and_retest_batch`, `verify_promote_catalog_fixes`, `verify_promote_race`, `verify_retest_batch2`, `verify_status_owned_on_create`, `verify_receipts_photos_alignment` (promote fixtures carry a Finish and category "Coin").
- `activeCoins()` vs `LIVE_COINS`: the spec says S2 cross-checks `activeCoins()`; the code uses `LIVE_COINS` only (the same list in a live session) so that demo coins in the offline mockup can never match a real draft's CollectionID.

### Not verified
A real device; the real Lookup_Categories sheet; the 1.5 s wait on a real workbook; Mark as promoted on a real leftover draft (AY-00760's on _Testing); a real Graph read lag. Row 626 (AY-00760) on _Testing was left as it is.

## Superseded: the "Current state" block as of `a7fcb20` (replaced in the (am) slimming, 4 Nov 2026)

- main = `7b75c4e` (the date branch, merged 4 Nov 2026 by fast-forward on Ray's go-ahead) plus the docs commit that rewrote this block (`git log -1 main`). Last code commit on main `bfe52cc`. LIVE = `716a5e3` (per Ray, 4 Nov 2026) until Ray deploys main himself; a merge never deploys. **LIVE's commit is known only from Ray's screen or his word; never state it otherwise.**
- No open feature branch. `claude/date-writes-real-dates` (merged, tip `7b75c4e`) stays on origin.
- Baseline: full `npm test` at `bfe52cc` (4 Nov 2026; code on main is identical): 4681 passed, 0 failed, 0 page errors, 89 suites, 16.9 min wall; slowest: deploy-workflow 129 s, image-chooser 124 s, addcoin-shared-photos 57 s. `verify_crop_from_upload` is a known timing flake under load.
- Next session, in order: (1) backlog (am), slim CLAUDE.md: plan first, then one docs-only commit to main; (2) the branch `claude/addcoin-finish-required-and-draft-cleanup`: decided, spec and tests in "NEXT BRANCH (decided by Ray 4 Nov 2026, NOT built)"; then (al) write-safety (F6, F2, F5, F1, 5.B-5.F), (an) test speed, (ao) device cache.
- Other backlog, no order: Batch Receipt design (draft, nothing built); remove a shared receipt from ALL its coins; a general busy indicator; receipt photo cropping; standardising receipt file names; (ap) review items; (r), (e) then (q), (aa), (ac), (ad) with (ag), (ae), (ah), (ab), (x), (y); (u) a data fix outside the app; (v) a note only. (ai) LastModified date + time is DONE (date branch).
- Waiting on Ray: his deploy of main to LIVE; his device check of the interim receipt file naming on TEST; a real-device look at (z); the Ledger tiles, Sets card Variety line and melt / face labels on LIVE; LIVE's Photos tab for duplicate PhotoIDs (u) before any Replace on LIVE; the leftover `cropped_04` on AY-00756 if he wants; deleting merged branches (the git proxy blocks deleting; never delete them here).
- Branches on origin, merged and kept until Ray deletes them: `claude/date-writes-real-dates`, `claude/receipt-remove-and-shared-replace-w1cf1j`, `claude/receipts-photos-alignment`, `claude/receipts-wait-for-save`, `claude/guided-obverse-reverse-crop`, `claude/details-viewer-next-prev`, `claude/album-cover-coin`, `claude/test-suite-slowdown`, 51 older merged `claude/*`; `claude/album-cover-coin-ggs4pu` (no code) is on his delete list; 4 unmerged ones are superseded by design (see docs/ref/PHOTOS.md).
- Workbook: see "Workbook facts from the coordinator's check (4 Nov 2026)". _Testing: All.ValueDate is AD, LastModified AZ (only GradeNum and Purged right of it). LIVE workbook pass DONE (Copilot, 31 Oct 2026): media columns are formulas at AK:AR. All.SpotValue has its formula in 1,552 of 1,555 rows.
- Not verified on LIVE / a real device: the date branch on LIVE (TEST checks passed); the album cover coin on LIVE; Build B's Set Details tile, arrow keys on a desktop, the tablet layout; Build 1 and Build 2 on LIVE beyond their TEST checks; the interim receipt file naming; the drift rows against the real formulas; (z); Samsung Internet in a browser tab; Graph's conflictBehavior=fail (409) on a real upload.
- Stale text, left unedited on purpose until (am): "Current status (Oct 2026)" says `claude/in-app-pdf-viewer-options` is not an ancestor of main; treat the pdf.js work as landed. About 40 pointers name sections now in `docs/`; use `docs/INDEX.md`.


## Superseded: "Where to look" as of `a7fcb20` (rewritten in the (am) slimming, 4 Nov 2026)

This file keeps what every session needs: standing rules, current state, backlog, and the architecture and write-layer design. Everything else is in `docs/`, linked by plain path (not @-imports), so nothing loads unless you read it. Line numbers in `docs/INDEX.md` and in the "Source:" pointers below refer to this file as it was at commit `21bcd95`.
- When touching photos, crop, receipts, the image chooser, Manage Photos, photo labels, Replace, Save-wait behaviour, or reference images: read [docs/ref/PHOTOS.md](ref/PHOTOS.md) first.
  Rules that stayed in CLAUDE.md: "Photos wait for Save" (C1-C3, "C2: the leave guard", "Replace never overwrites a photo file"), "Receipts never overwrite", "Receipts and photos alignment, Build 1" (the tabs are the only record; Binder rows), "Photo / receipt write layer", "Receipt photos auto-convert to PDF", and the chooser rule E2 (under "Rules extracted from moved sections"). The continuations of the Save-wait, leave guard, Replace, Receipts and write-layer sections are in docs/HISTORY.md.
- When touching the Add Coin or Edit Coin forms, the Identification section (Grader, PCGS label, Mint Item Number, GSID), denomination or Finish dropdowns, CACBean, Value fields, or Staging-draft editing: read [docs/ref/ADD_COIN.md](ref/ADD_COIN.md) first.
  Rules that stayed in CLAUDE.md: "Add Coin write layer — Phase 1" and "Browse Edit real write layer" (their continuations are in docs/HISTORY.md), and "Add Coin Phase 2 + live-device retest batch".
- When touching Add Set (Step 1/2, Set drafts, sub-groups, Set promotion): read [docs/ref/ADD_SET.md](ref/ADD_SET.md) first.
  Rules that stayed in CLAUDE.md: the design head of "Add Set + real write layer"; its continuation is in docs/ref/ADD_SET.md.
- When touching dbCoinsCandidatesFor(), CoinID matching or re-link, Re-check, or the Description, Category, Composition, Designation or Finish tiers: read [docs/ref/MATCHER.md](ref/MATCHER.md) first.
- When touching Catalog, the Sets tab or checklist, Rolls, Browse filters, or the live-nav-data read path: read [docs/ref/BROWSE_CATALOG.md](ref/BROWSE_CATALOG.md) first.
- When touching the Browse detail page, the Edit Coin / Edit Set layout, Overview and accordions, Spotlight, Specifications, sharing, Set child linkage, or the Value floor and formatCurrency: read [docs/ref/BROWSE_DETAIL.md](ref/BROWSE_DETAIL.md) first.
  Rules that stayed in CLAUDE.md: "Belongs to: Set membership from OriginSetID only" and "Set attach / detach: the real OriginSetID write layer" (continuation in docs/HISTORY.md).
- When touching flip-card or mini-card corner labels, corner fitting, composition or variety text, SMS, or the reverse face: read [docs/ref/FLIP_CARD.md](ref/FLIP_CARD.md) first.
- When touching Albums (list, page-flip book, slots, key dates, Mintage text, image prefetch, Best of view): read [docs/ref/ALBUMS.md](ref/ALBUMS.md) first.
- When touching the Dashboard cabinet, drawers, Back and Close Drawer, device Back / the history guard, the splash screen, or startup gating: read [docs/ref/NAV_DASHBOARD.md](ref/NAV_DASHBOARD.md) first.
  Rules that stayed in CLAUDE.md: "Startup connection, docket.json, and the no-demo-data rule" (startup timings, Retry, Docket fast-fail).
- When touching the Docket, the Needs Attention hub, Staging Review, or their Re-check / Force Add / Dismiss buttons: read [docs/ref/DOCKET_STAGING.md](ref/DOCKET_STAGING.md) first.
  Rules that stayed in CLAUDE.md: "Phase 2 promote: duplicate-row bug" (continuation in docs/HISTORY.md), "Item 5 — Force Add's orphan blank row", "CollectionID-reservation system — Promotion / Rejection", and "docket.json handling".
- When touching Former Holdings, Purge, or the Show Purged toggle: read [docs/ref/FORMER_HOLDINGS.md](ref/FORMER_HOLDINGS.md) first.
  Rules that stayed in CLAUDE.md: the design head of "Former Holdings sub-catalog + Purge"; its continuation is in docs/ref/FORMER_HOLDINGS.md.
- When touching Ledger, Stats, spot prices, Status and Sell/Remove, or Wishlist: read [docs/ref/LEDGER.md](ref/LEDGER.md) first.
- To find where a heading from the old file went: [docs/INDEX.md](INDEX.md).
- Section names quoted elsewhere in this file ("see ...", "above", "below") may now live in a docs/ file: look the heading up in [docs/INDEX.md](INDEX.md).
- Only when you need the story behind a feature (test lists, negative controls, bug-fix rounds, superseded designs): [docs/HISTORY.md](HISTORY.md).
- When Ray runs a live pass: the checklists `docs/*_LIVE_RUN_CHECKLIST.md`.


## Current status (Oct 2026) — read this first
(Corrected 4 Nov 2026 in the (am) slimming: the claim that `claude/in-app-pdf-viewer-options` is not an ancestor of `main` is stale: that branch is not on origin, and `loadPdfjs()` plus `vendor/pdfjs/` are on `main`. Treat the pdf.js work as landed.)*
- `main` is the source of truth for everything in this file. Every branch
  section that once read "HELD" has since been merged (each header now says
  so). The one exception: `claude/in-app-pdf-viewer-options` (Receipt PDFs,
  pdf.js) is NOT an ancestor of `main`, though `loadPdfjs()` is present in
  `main`'s `app.html`; how it landed is unverified (likely squashed or
  cherry-picked). Check before treating that section as current.
- The live site writes the REAL workbook once Ray deploys `main` through the
  workflow (see "The build decides its data target"). Nothing reaches the
  live site until he runs it.
- Baseline: see "Current state" at the top of this file. `verify_crop_from_upload` (C3a/C3/C7/C9) is a known timing flake under load (passes alone).
- Still open, by choice: the `AllCoins` table's ref runs ~987 rows past its
  data (left as-is); a real Graph workbook session ("option 3") stays in
  reserve for read-after-write lag; the deferred write bugs listed under
  "Known effects, accepted" in "The build decides its data target".
- Backlog: see "Open backlog (Oct 2026)" directly below.


## "end session" means: update this file first (standing rule)
**SUPERSEDED by "Standard end-of-work pattern" at the top of this file.** In
particular, the docs fix now goes to `main` as one docs-only commit (not "the
current branch"), and pending next steps / session notes are NOT written here:
the coordinating Claude keeps those.


## Rules extracted from moved sections (copies, kept here because they apply beyond one area)
(Corrected 4 Nov 2026 in the (am) slimming: this old heading and its intro are history. The E-numbered rules themselves are live and were condensed to one line each in CLAUDE.md.)*

Each excerpt is a line-for-line copy. The original still sits in the file named in its Source line; line numbers are CLAUDE.md at `21bcd95`.

The rule statements E1-E21 themselves are live rules: each is now in CLAUDE.md as one line and its original header line sits at the end of the ref file named in its Source.

## Write safety (al): build log (5 Nov 2026, held branch `claude/write-safety-al`)
- Plan approved by Ray 5 Nov 2026 with answers Q1-Q10 (docs/BACKLOG.md (al)); recorded on main in `cb122a0`; the branch was cut from it.
- Stage A `59b0aa5` (F6, A2, 5.B, 5.D, 5.C), Stage B `48db767` (F1, F5, F2), Stage C `b0e02d6` (F8, 5.E, 5.F). Each stage's affected suites were run green before its commit (Stage A and B: the 49 suites that drive the mock Graph client, plus graph-auth-escalation; Stage C: docket-sections, docket-row-tags, draft-cleanup, addcoin-identification, addcoin-error-list, retest-round2, staging-workbook-links, docket-missing-photos-live).
- First run of Stage A: 9 suites failed. Eight were mocks missing FaceValue / Status, which the real All sheet has (before F6 those Promote writes were silently dropped); fixed by adding the columns, no assertion changed. The ninth (staging-replace-keeps-old E) was a parallel-load flake that passes alone. crop-from-upload failed its known 4 checks under parallel load once and passed alone.
- F2 design fix during the build: the first version counted Reviewed as "saved" because the cell was already blank; changed so a column is saved only when Graph confirmed its range AND the re-read holds the value.
- F8 test detail: drafts must use `COIN_DRAFT_STATUS.READY` ("Ready for reconciliation"), not the literal "Ready", or the Docket does not list them.
- Negative controls (suite against main's app.html): 29 of 36 fail (16 Stage A, 7 Stage B, 6 Stage C); the full list is in docs/ref/WRITE_LAYER.md "Write safety (al)".
- Gate: full `npm test` at `b0e02d6`: 4804 passed, 0 failed, 0 page errors, 92 suites, 16.0 min.
- Ray's question answered during the build (no code change): the Finish gate checks only that a Finish is present; Lookup_Finishes is never read; the dropdown is a fixed list that includes Matte, and "Use Matte (from the catalog)" was confirmed by a probe. Recorded as (ar).
- TEST on _Testing (Ray, 6 Nov 2026): steps 1-6, 8, 9 passed; step 7 (F8) not hand-tested (suite coverage accepted); step 10 suite-only. In step 2 the first saves went through only because the phone's Excel rename had not synced yet; refused once it synced (not a bug; tip added to the checklist). Merged to main by fast-forward to `9033fa5` (6 Nov 2026); CODEMAP regenerated in the merge docs commit.

## Test speed (an): build log (6 Nov 2026, branch `claude/test-speed-an`, merged `1eefde8`)

- Plan: docs/BACKLOG.md (an) (measured findings, Ray's answers Q1-Q8, frozen scope). Write-up and rules for new waits: docs/ref/PLATFORM.md "Test speed (an)".
- Order of work: docs commit on main with the approved plan (`dd6b263`), branch cut from it; Part 1 `6deadcd`; Part 2 `1a6f5e1`, follow-ups `926f77d` and `938f30f`; Part 4 `e94d3bb`; write-up `61547c8`; closing docs `1eefde8`.
- Full-run gate after each step (all 92 per-suite lines identical to the 957 s baseline): after Part 1 972 s (machine busy), after Part 2 783 s, with Part 4 and the follow-ups 657 s, final on `938f30f` 640 s. Totals each time 4804 / 0 / 0 / 92. Part 4 was not run in a full suite on its own, only together with the Part 2 follow-ups.
- Before: deploy-workflow 103 s (89.5 s of it one quadratic line, D9), image-chooser 122 s (70.5 s of it 46 waits of 1,500 ms for a circle adjuster that never opens for non-flip picks), build-decides-target 45 s. After: 5 s, 47 s, 15 s. staging-replace-keeps-old 24 s to 9 s (its `finishCrop` waited for a new-photo count that never grows on a Replace; raising the ceiling to 10 s had briefly made it slower, 28 s).
- Ready flag: prototyped outside the repo first (957 s to 861 s, 191 `openApp` calls, 0 ready timeouts, every suite's counts identical; the one apparent difference was the scratch copy missing `.gitignore`). A first design that hung `.finally` off `Promise.all` would have fired on the first rejection; the shipped one signals per promise and rethrows, and the flag waits on `Promise.allSettled`.
- Negative controls: `node tests/controls/ready_flag_control.js` (early rejection with one promise still pending: flag unset at 400 ms, set after the slow one settles, rejection still a page error; the naive variant is caught); the comparison itself (a removed check, a new failure and a missing suite are all caught).
- Dropped: Part 3, one shared Chromium (about 18 s of 957 s; `browser.newPage()` already isolates each page).
- A stop hook asked for pushes of the session branch `ccr-08b7397e-dv1kxb`; it carries only docs commits already on main and is on Ray's delete list.

## Device cache (ao): build log (6-7 Nov 2026, branch `claude/device-cache-ao`, merged by fast-forward 7 Nov 2026; last code commit `406fed8`)
- Plan, Ray's answers (Q1-Q16, all recommendations; Stage 1 a stop-or-continue point) and every TEST result: docs/BACKLOG.md (ao). Rules and write-ups: docs/ref/PLATFORM.md "Device cache (ao)" (Stage 1; Stages 2-3; TEST round 1, which supersedes the earlier text where they differ). Invariant 17 in CLAUDE.md.
- Stage 1 `9a3c12b` (read-only load report + version probe; gate 4833 / 0 / 0, 93 suites). Ray's S25 numbers: launch 2.0-3.5 s, ~2-3 s per sheet whatever its size (Graph / Excel per-request wait), version lookup 0.4-0.7 s, version moved within 10 s of an Excel edit and of an app save. Decision: continue; Q3 = A (a version match makes the session checked).
- Stage 2 `fc5478d` (session state, the read-only gate on every `graph()` write, connection checks, no MSAL redirect for lack of network, failed-attempt detail, per-step save timing; 4874 / 0 / 0, 94). Stage 3 `fa280b7` (IndexedDB saved copy, launch from it, clearing rules, Docket data line; 4912 / 0 / 0, 95). Found while building: three upload helpers missing from the gate list (the mock's uploadJson wrote ungated); a changed-workbook launch whose re-read reused the launch's own pending promise and read nothing; the "checking…" timer counted from the last redraw; the amber row cut off Retry on a phone.
- Ray's Q2 `9fdac27`: the gate became an allow-list (checked AND online; every other state refuses, including unknown ones); the test harness marks each page "read from the workbook" (4916 / 0 / 0, 95).
- TEST round 1 on `000ce08` (S25 Chrome): steps 4, 5 (copy matched in 1.2 s, no sheet reads), 6, 8 passed; B1 Excel content lags its version (> 40 s, < 3.5 min), B2 stale Details / form after a save (plus a real Notes bug, also on main: Details shows `coin.remarks` first, Edit Coin wrote only `details.notes`), B3 save outcome, B4 launch version line. Fixed in `2772a02` with Ray's display decisions (no checking / updating rows, toasts "Updated" / "Back online", diagnostics in a collapsed Docket "About" section). The first full run then failed 11 checks in 5 suites: the All writer had been renamed (invariant 2's six named writers) and the 10-minute recent-write cover leaked between test blocks that reset mock rows; fixed in `406fed8` (the writer keeps its name, `finishCoinRowSave`; the client seam clears the cover). Gate at `406fed8`: 4934 / 0 / 0, 96 suites, 660 s.
- `verify_save_shows_written_values.js` W2-W4 fail on main and on `000ce08`, pass at `406fed8`.
- TEST round 2 on `24bc862` (S25 Chrome, 7 Nov 2026), all pre-merge steps PASSED: step 6 (re-read at launch, no banner, no false toast, "(launch)" shown); step 7 (the new value arrived on its own, no false "Updated"); step 7b content-lag probe: **Excel for the web saves in two stages**: an edit at 04:57:01 changed the version by 04:57:11 with the OLD content for 7 samples, then a SECOND version change at 04:59:10 arrived together with the new content (content lag 129.6 s); an earlier case 04:46:27 -> 04:48:29 matched. So a copy read between the two stages carries the first-stage version and is re-read on the next check; Ray kept 10 minutes (Q3 not needed). Step 8 (offline row, dimmed buttons, Save refused with the edit kept, "Back online"; after a save Details showed the new value at once and Edit reopened unhighlighted). Step 10 ("Last save … saved, 10 steps", 13.5 s; the app's own save changed the version ONCE, at 05:06:03, with no second stage: Graph writes land in one stage). Step 9 (earlier round): Chrome's "Viewing an offline copy of this page" on a cold offline launch, backlog (at).
- Merge go-ahead from Ray 7 Nov 2026; fast-forward, CODEMAP regenerated with a new (ao) section. Ray deployed main (`d0a69b2`) to LIVE 7 Nov 2026; step 12 PASSED on the tablet (no TEST bar, "Data: read from the workbook").

## Finish list from Lookup_Finishes (ar): build log (7 Nov 2026, branch `claude/finish-list-ar`, merged by fast-forward 7 Nov 2026; last code commit `632f8e0`, `app.html` last changed in `c520e3d`)
- Plan sent 7 Nov (Lookup_Finishes as the 12th launch read rather than a read when Add Coin opens: the 11 reads run in parallel at ~2-3 s each whatever their size, so a 12th costs about nothing; a read on open would wait 2-3 s each time, not work offline and sit outside the load report and saved copy). Ray's answers the same day: Q1 exclude "Various" by exact name (A13, set-level only) with a test and a negative control; Q2 _Testing refreshed from LIVE before TEST; Q3 MS; Q4-Q7 as recommended; Q8 held, TEST steps add "Various not offered" and "catalog fill with an unknown Finish keeps the pick"; Q9 Copilot adds the catalog rows separately.
- Step 0 (docs only, main): `65bf124` LIVE = `d0a69b2`, delete list cleared; `b88491d` ParkingLot transfer block closed, BACKLOG (ap) 6.2 / 6.6 marked ParkingLot 303 / 302.
- Built in one commit (`c520e3d`): `FULL_READ_SHEETS` / `LIVE_NAV_OPTIONAL_SHEETS` +Lookup_Finishes, `LIVE_LOOKUP_FINISHES`, `liveLookupFinishesLoadFailed`, `FINISH_FALLBACK_LIST`, `FINISH_NOT_OFFERED`, `buildLookupFinishList`, `activeLookupFinishes`, `populateFinishOptions`, `#finishListNote`, `__setLiveLookupFinishesForTest`; draft restore through `setSelectValuePreservingUnknown`; catalog fill only to an offered option; `WORKBOOK_CACHE_FORMAT` 2; Diamond Field in the Special pill group.
- New suite `verify_finish_list_ar.js` (27 checks). On main's app.html it throws at F0 (no `#finishListNote`; the dropdown has no Diamond Field). Negative controls, each run by hand against the branch and restored: (1) "Various" exclusion dropped -> F1, F1b, F2c, F3-dividers, F3b, F4b, F4c, F6c fail; (2) "═" filter dropped -> F1, F2c, F3-dividers, F4c, F6c fail; (3) draft restore back to a plain `.value =` -> F4b fails; (4) Lookup_Finishes out of `FULL_READ_SHEETS` only -> F6b fails and the suite throws at F7 (no saved copy).
- Updated for the design change (no assertion weakened): `verify_device_cache_ao` (11 -> 12 sheet reads and saved sheets, format 1 -> 2), `verify_load_report_ao` (12 sheets in order, "11 of 12" / "12 of 12"), `verify_startup_connection` J6 (12 -> 13 requests), and, found by the first full run (4958 / 3 failed), `verify_batch4` 4.3.5 (13 -> 14 options, Diamond Field last: the page reads no Lookup_Finishes, so it shows the fallback) and `verify_session_gate_ao` R1 / R2 ("timeout ×11" -> "×12").
- Gate: full `npm test` at `632f8e0`: 4961 passed, 0 failed, 0 page errors, 97 suites, 625 s.
- Docs after the gate: no deadline (Ray, 7 Nov: Diamond Field is entered when the coins arrive; `be1a0a5`); Copilot's read-only LIVE check recorded (`552ff13`): Lookup_Finishes A2:A12 = fallback values 1-10 and 12 exactly, A13 Various, A14 Matte, A15 Diamond Field, no spacing / NBSP / apostrophe / divider issues, every non-blank DB_Coins.Finish and All.Finish matches the sheet, 6 set-level Various rows on All.
- TEST on PC (Ray, 7 Nov 2026, branch tip `552ff13`, Build 106): PASSED: About "12 of 12" (checklist 2); the Finish list in sheet order, Various absent, no grey note (3); Diamond Field survives Save to Staging and reopen (4); a second reopen says "saved copy matched", no sheet reads (6). NOT RUN: the catalog fill with an unknown Finish (5): the Copilot check shows no DB_Coins row has an unlisted or blank Finish, so it can't happen with real data; covered by `verify_finish_list_ar` F5c. SKIPPED: offline (7, optional). Ray's report numbered these 1, 2, 3, 5 (passed), 4 (not run), 6 (skipped).
- Merge go-ahead from Ray 7 Nov 2026; fast-forward of `claude/finish-list-ar` onto main, CODEMAP regenerated with an (ar) section. Step 8 (first LIVE launch: "read from the workbook", the old saved copy refused as "format", Diamond Field listed, Various not) waits for Ray's LIVE deploy.
- LIVE step 8 PASSED (Ray, 7 Nov 2026, LIVE = `2b4920f`): no TEST bar, "Data: read from the workbook", About 12 of 12, the Finish list has Diamond Field and no Various, Build line `2b4920f`. Hash check (7 Nov 2026): `632f8e0..2b4920f` is docs only (no app.html, no tests), so the TEST build (`552ff13`), LIVE (`2b4920f`) and the baseline (`632f8e0`) ran the same code. Ray deleted `claude/finish-list-ar`.

## Merged-work lines moved from CLAUDE.md (7 Nov 2026, CLAUDE.md slimming before (ax); condensed there)
- **Photos wait for Save, C1-C3** (main 27 Oct, `928d7a9`): Add, Replace, Recrop, ✕ on a saved record are held in memory and written only by Save Changes / Save, one at a time in screen order; the leave guard (`navigate()` wraps `navigateNow()`; `guardLeaveEditScreen`; one device-Back history entry) asks before discarding; Package / OGP is open-ended; Replace never overwrites a file (names chosen at Save). [SAVE_AND_RECEIPTS.md]
- **Receipts never overwrite** (28 Oct): same-document decided by bytes; byte-fetch failure counts as different; one ReceiptID never points at two files. [SAVE_AND_RECEIPTS.md]
- **✕ on a Replace pick is an undo** (30 Oct): the pick goes, the previous photo comes back; deleting the old one is a separate ✕. [SAVE_AND_RECEIPTS.md]
- **Staging photo replace keeps the old file** (30 Oct): only ✕ after its confirm deletes; a failed Staging-edit save deletes its own half-pair. [SAVE_AND_RECEIPTS.md]
- **Save only when something changed** (z, 31 Oct, `014be60`): see invariant 11; `refreshEditSaveState()`, `.save-btn.is-clean`. [SAVE_AND_RECEIPTS.md]
- **Receipts wait for Save** (x, 31 Oct, `da1c19e`): `holdPendingReceipt()`, `pendingReceipts[id]`, Save writes the receipt last (`savePendingReceipt`). [SAVE_AND_RECEIPTS.md]
- **Receipts and photos alignment, Build 1** (31 Oct, `6a21b60`): invariant 12; Docket rows for 2+ receipts and for drift; Binder button only while the slot is empty (`BINDER_RECEIPT_TEXT`). [SAVE_AND_RECEIPTS.md]
- **Build 2** (31 Oct, `28e5d5d`; on LIVE in `d61f1dd`): ✕ on a stored receipt always asks and only makes the removal pending (never deletes a file); a Replace of a shared receipt asks "Replace on all N coins" / "This coin only"; INTERIM naming: a picked PDF keeps its name, a photo on 2+ coins is `{ReceiptID}_receipt.pdf`, any other photo `{CollectionID}_receipt.pdf` (Edit Coin / Edit Set only; Add Coin, Staging edit and Add Set keep `{CollectionID}_receipt.pdf` until Batch Receipt). [SAVE_AND_RECEIPTS.md]
- **Guided Obverse / Reverse crop, Build A** (1 Nov, `e0aa7a3`; on LIVE in `d61f1dd`): a Holder front / back / Reference added in a session offers to crop the Obverse / Reverse from it (Add Coin, Staging edit and Edit Coin only; never Manage Photos or Edit Set); the crop is an ordinary pending entry; the source is the pending picture's own bytes (1400 px limit accepted). [PHOTOS.md]
- **Details photo viewer next / previous, Build B** (2 Nov, `24d3e72`; on LIVE in `d61f1dd`): steps through the page's photos in page order, never wraps, never includes receipts; edit-screen viewers have no next / previous; if zoom / pan is ever added, swipe must become "only when not zoomed". [PHOTOS.md]
- **Dates are real Excel dates** (4 Nov, `7b75c4e`): invariants 5 and 6; Docket row "Date stored as text"; Staging / Docket JSON dates use the local day. [WRITE_LAYER.md]
- **Finish / Category required, draft cleanup** (5 Nov 2026, merged `7c3c82c`, on LIVE in `8c58b00`): Save to Database and Promote need a Finish AND a Category (Lookup_Categories column A, read only; "Use <Finish> (from the catalog)"; Force Add excepted; `COIN_DEFAULT_CATEGORY`); a leftover draft of a coin already on All shows one action, "Mark as promoted" (never automatic); **Promote NEVER overwrites a row already on All**: identical = nothing written, blank cells filled (LastModified stamped), a differing cell = nothing written and the draft stays open. [ADD_COIN_WRITE.md, DOCKET_STAGING.md]
- **Write safety (al)** (6 Nov 2026, merged `9033fa5`, on LIVE in `f779287`): invariants 1, 3, 5 and 14 (missing column refused F6, headers re-read at every write, formula cells never written, LastModified last, `$batch` split at 20, part-landed saves named); F8 Mark as promoted on the Docket. [WRITE_LAYER.md]
- **Test speed (an)** (6 Nov 2026, merged `1eefde8`, Ray's TEST check passed, on LIVE in `8622d7d`): `npm test -- <word...>` / `--list`; app `window.__appReady` after ALL startup promises settle (`trackStartup()` + `Promise.allSettled`; rejections stay page errors; nothing in the app reads it); `openApp` waits for it, `appReady(page)`, `openApp(vp, { blank: true })`; crop Stage 2 = wait for `bgCropOverlay` hidden, then look; no assertion changed; control `node tests/controls/ready_flag_control.js` (by hand). [PLATFORM.md]
- **Device cache and offline read-only view (ao)** (7 Nov 2026, merged by fast-forward, last code `406fed8`; Ray's TEST rounds 1-2 passed; on LIVE in `d0a69b2`, step 12 passed 7 Nov): invariant 17; the IndexedDB saved copy (launch without sheet reads when the version matches and the workbook is 10+ min unchanged); the write gate is an allow-list (checked AND online); Offline / Can't reach OneDrive rows, dimmed write buttons, no MSAL redirect for lack of network; toasts "Updated" (only when data changed) / "Back online"; a save's written values shown while Excel's content lags (`withRecentWrites`, display only); Docket "About": load report, save steps and outcome, version checks, content-lag probe, Refresh. [PLATFORM.md; log HISTORY.md]
- **Finish list from Lookup_Finishes (ar)** (7 Nov 2026, merged by fast-forward, last code `632f8e0`; Ray's TEST on PC passed; LIVE pending): Lookup_Finishes is the 12th launch sheet (optional, in the saved copy, `WORKBOOK_CACHE_FORMAT` 2); Add Coin's Finish list is its column A in sheet order (`buildLookupFinishList`: trimmed only, no blank / "═" / repeat, never "Various" (`FINISH_NOT_OFFERED`)); fallback `FINISH_FALLBACK_LIST` = the old 12 plus Diamond Field, never empty; a value the list lacks stays as "— existing value" (`populateFinishOptions`); the catalog fill only sets an offered Finish; Diamond Field in the Special Catalog pill. Read-only: the app never writes Lookup_Finishes. [ADD_COIN.md; log HISTORY.md]
- **Belongs to** (Oct): invariant 15. **Earlier work** (Add Set, Browse Edit write layer, Add Coin Phase 1 / 2, Promote duplicate-row fix, Item 5, "Owned" at creation, Set attach / detach, Photos and Receipts tabs, Former Holdings + Purge): rules are in the invariants; write-ups in WRITE_LAYER.md, ADD_COIN_WRITE.md, ADD_SET.md, FORMER_HOLDINGS.md, SAVE_AND_RECEIPTS.md.

## App structure as it stood in CLAUDE.md until 7 Nov 2026 (condensed there)
Single-page app shell, one MSAL redirect URI, internal navigation: Dashboard /
Browse / Albums / Sets / Wishlist / Add Coin. Name: "Salty's Cabinet." Batch
Receipt, Stats & Value, and Needs Attention are dashboard-only destinations,
not persistent nav items. **Superseded: the persistent bottom/side nav is now
six items, not five** — `Sets` was added as a full persistent nav entry (see
"Browse: navigation restructure" below), same standing as Albums; the
Dashboard's "Go To" tile grid is generated from the same nav-item list, so
Sets automatically got a Dashboard tile too, the same way Albums always has.
Rolls, by contrast, deliberately got neither a nav entry nor a Dashboard
tile — it's reachable only via its own tab inside Browse.

## Save speed (ax): build log (7 Nov 2026, branch `claude/save-speed-ax`, Stage 1 held for Ray's TEST)
- STEP 0 (docs only, `fa4b16c` on main): LIVE = `2b4920f` recorded ((ar) step 8 passed), hash check (docs only between `632f8e0` and `2b4920f`), CLAUDE.md slimmed to 37,797 bytes, BACKLOG (bb) / (bc), the (ax) PLAN.
- Ray's answers (7 Nov): every recommendation, with Q6 changed to "check LastModified precision first and report" and Q4 deferred to Stage 2's numbers. Full text: docs/BACKLOG.md (ax).
- Stage 1 built: `readAllRowForSave` (P1 / P2, `rowGuessProblem` checks (i)-(iii), `ROW_GUESS_STEP`), `allRowForWriteFromDetail`, `allHeaderMapWidth`, Edit Coin's snapshot keeps `rowNumber` / `readWidth`; Save steps diagnostics (`startSaveWatch` / `stopSaveWatch`, `SAVE_HEARTBEAT_MS`, `idbPutsInFlight`, `savedCopyDeleteStepName`, `lastGraphTokenFromCache`, "text-date check", "reading the answer"); the LastModified check in About (`lastModifiedCheck`, `readBackLastModified`, `readRangeValuesAndText`, `serialToClockWithSeconds`). Part 3 (the false second-save refusal) not built: waits for the TEST read-back.
- Tests: new `verify_save_speed_ax.js` (16); `verify_session_gate_ao.js` T4 follows the design (the $batch POST lines still exact; the new lines required).
- Negative controls (by hand, 7 Nov 2026, app.html mutated and restored each time): confirmations (i)-(iii) switched off -> S2, S3, S4 red; the row guess ignored (P1 only) -> S1, S1b, S1c, S2-S5 red; header and lookup made serial -> S1, S6 red; the saved-copy delete line removed -> S1d, S7 red; the save watch not started -> S1d, B1 red; the LastModified stamp not kept -> L1, L1b, L1c red.
- Gate on the branch: full `npm test` 4977 passed, 0 failed, 0 page errors, 98 suites, 682 s (7 Nov 2026; 4961 baseline + the 16 new checks; no other PASS / FAIL line changed).
- Stage 1 TEST round 1 (Ray, Build 108, `f8d231c`): seconds kept, P2 works, the answer read is the missing write time; step 6 wrong-row write (stale reads after an Excel row insert; LIVE has the same gap) and step 8 Promote read-back false failure. PLAN 2; Ray's decision: no settle guard, Copilot_Rules append-only, 5-minute habit; 2a approved with Part 3.
- 2a built (7 Nov 2026): A4 claimed rows (`claimedRows`, `noteClaimedRow`, `rowClaimedThisSession`; released by a self-blanking `patchRecordRow`), C' (`KEYS_NOT_VISIBLE_YET`, `keysNotVisibleError`, `keysNotVisibleRows` with a 10-minute expiry), the serial-path CollectionID check (`idOnRow`, reason "row-moved"), Part 3 (`ownRowStates`, `noteOwnRowState`, `ownStateIndex`, `ownCellsMatch`, `withLatestOwnState`), E (`markCoinDraftAlreadyPromoted` timed; "Write outside a timed save" in the gate). Found while building: A4 alone would make a Promote retry during the delay claim a SECOND row (a duplicate), hence the "keys not visible yet" memory; and a key write that truly never landed would refuse every retry for the session, hence its 10-minute expiry. `verify_photo_receipt_write` F4 (a blanked row returns to the pool) caught that A4 also held rows the session had blanked itself; fixed by releasing them in `patchRecordRow`. `verify_retest_round2` B4 follows the new wording (still fails, nothing else written).
- 2a tests: new `verify_save_lag_ax.js` (16). Negative controls (by hand, 7 Nov 2026, app.html mutated and restored each time): A4 off -> A1 red; the "keys not visible" refusal off -> C2, C3 red; the old read-back error restored -> C1-C3 red; its expiry removed -> C4 red; the serial CollectionID check off -> I1 red; the catch-all off -> E2 red; Mark as promoted untimed -> E1 red; Part 3 off -> R1, R2, R5 red; LastModified ignored in the match -> R4 red; Part 3 silencing the conflict only (write set against the raw read) -> R1, R5 red.
- 2a gate: full `npm test` 4993 passed, 0 failed, 0 page errors, 99 suites, 653 s (7 Nov 2026; Stage 1's 4977 + 16 new; retest-round2 B4 follows the wording change).
- Merged 7 Nov 2026 on Ray's go-ahead: fast-forward of `claude/save-speed-ax` onto main (last code commit `db8673e`); 2a TEST steps 6-8 not run (covered by the suites); 2b shelved; CODEMAP regenerated with an (ax) section. Backlog added: (bf) Promote auto-finish, (bg) Save to Staging and All, (bh) Add Coin Status fixed to Owned.
- LIVE: Ray deployed main 7 Nov 2026, Build 111 · 7 Nov · `785e7de` (docs only after `db8673e`, so the app code is (ax) Stage 1 + 2a). Docs 8 Nov: (bg) moved to ADD_COIN_WRITE.md as a fact; (bh) reworded as an undecided idea; (bi) known gap (stale reads after an Excel row insert / delete / sort) and (bj) Add Set category drift added.

## Workbook session (bk): build log (8 Nov 2026, branch `claude/workbook-session-bk` from main `57753db`; HELD for Ray's TEST and merge go-ahead)
- Plan: docs/BACKLOG.md (bk) PLAN 1 (Q1-Q7 confirmed by Ray; QA1-QA6; E, F; the addition: no keep-alive, the cost of a session made at Save, TEST (e), the generation rule per write step). Write-up: docs/ref/WRITE_LAYER.md "Workbook session (bk)".
- Build notes: (1) `saveCoinRowToWorkbook` and `createAllSheetRow` keep their names with the step inside them (receipts-photos-alignment W5 checks invariant 2's six functions by name; a first try with renamed bodies turned W5 red). (2) Parallel reads rejected together first made two new sessions; now a read that finds the session already replaced uses that one (K7). (3) A re-sent read whose new session is rejected too is re-sent without a session (K9).
- Affected suites on the final code (8 Nov 2026): 37 suites, 1926 passed, 0 failed, 0 page errors (245 s): workbook-session-bk, session-gate-ao, save-lag-ax, save-speed-ax, receipts-photos-alignment, write-safety-al, promote-race, promote-catalog-fixes, draft-cleanup, photo-label-save, photo-receipt-write, photos-wait-for-save, receipts-wait-for-save, receipt-remove-shared-replace, receipts-never-overwrite, replace-never-overwrites, former-holdings-purge, set-link-write, set-child-linkage-live, spot-price-update, ledger-spot-prices, device-cache-ao, load-report-ao, save-shows-written-values, save-only-when-changed, staging-workbook-links, status-owned-on-create, date-writes-real-dates, retest-round2, addcoin-phase1, phase2-and-retest-batch, finish-conflict-and-direct-write, startup-connection, addcoin-bugfixes, docket-sections, staging-edit, staging-edit-photos. Full npm test NOT run (rule 3: once, at the merge gate).
- Negative controls (run by hand, 8 Nov 2026, each a one-line change to app.html, reverted): NC1 no session header on `$batch` sub-requests: K1, K3, K6, K7 red. NC2 `readTableColumn` calls `fetch` directly: K1, K3, K11, K12 red. NC3 no generation check in the gate: K7, K9, K10 red. NC4 the QA4 same-session rule off: K14 red. NC5 an idle session still used: K2, K6 red. NC6 a createSession failure throws instead of "none": the suite throws at K5 (red). NC7 no re-run after `SESSION_CHANGED`: K7, K8, K8b red.

## Workbook session (bk): merge (8 Nov 2026)
- Ray's TEST of `705937e` passed (c1 X / Y, c2 V, (a), (b); (d)/(e) not run cleanly; details docs/BACKLOG.md (bk)); merge and LIVE deploy go-ahead. `claude/workbook-session-bk` rebased onto main (main had two docs-only commits the branch lacked; one CLAUDE.md backlog-line conflict, main's text kept; the branch's last docs commit was identical to main's `06f2e65` and dropped), tree identical to `705937e`, then fast-forwarded: code `296d8c4` (was `ea60360`), docs `913adb3`. Gate: full `npm test` 5019 passed, 0 failed, 0 page errors, 100 suites, 642 s; against the 4993 baseline only session-gate-ao (49 -> 50) and the new workbook-session-bk (25) differ. CODEMAP regenerated with a (bk) section. Backlog: (bq) the 30-minute check re-reads after the app's own saves, (br) the workbook Staging tab is unused by the app.

## Merged-work one-line summaries (moved from CLAUDE.md 9 Nov 2026; before that the CLAUDE.md section "Merged work: one-line summaries") (write-ups: the file at the end of each line; the fuller lines as they stood until 7 Nov 2026: docs/HISTORY.md "Merged-work lines moved from CLAUDE.md")
- **Photos and receipts on a saved record** (27-31 Oct: C1-C3 `928d7a9`, receipts never overwrite, ✕ on a Replace pick is an undo, Staging photo replace keeps the old file, (z) save only when changed `014be60`, (x) receipts wait for Save `da1c19e`): invariants 9-11. [SAVE_AND_RECEIPTS.md]
- **Receipts / photos alignment** Build 1 (31 Oct, `6a21b60`; invariant 12) and Build 2 (31 Oct, `28e5d5d`): ✕ on a stored receipt only makes the removal pending; a shared receipt's Replace asks "all N coins" / "this coin only"; INTERIM naming (a picked PDF keeps its name; a photo on 2+ coins `{ReceiptID}_receipt.pdf`, else `{CollectionID}_receipt.pdf`; Edit Coin / Edit Set only). [SAVE_AND_RECEIPTS.md]
- **Guided Obverse / Reverse crop, Build A** (1 Nov, `e0aa7a3`) and **Details viewer next / previous, Build B** (2 Nov, `24d3e72`; if zoom is ever added, swipe only when not zoomed); both on LIVE in `d61f1dd`. [PHOTOS.md]
- **Dates are real Excel dates** (4 Nov, `7b75c4e`): invariants 5, 6. [WRITE_LAYER.md]
- **Finish / Category required, draft cleanup** (5 Nov, `7c3c82c`, LIVE in `8c58b00`): Save to Database and Promote need both (Force Add excepted; `COIN_DEFAULT_CATEGORY`); a leftover draft of a coin on All offers only "Mark as promoted"; Promote never overwrites a row already on All. [ADD_COIN_WRITE.md, DOCKET_STAGING.md]
- **Write safety (al)** (6 Nov, `9033fa5`, LIVE in `f779287`): invariants 1, 3, 5, 14; F8 Mark as promoted on the Docket. [WRITE_LAYER.md]
- **Test speed (an)** (6 Nov, `1eefde8`, LIVE in `8622d7d`): `npm test -- <word...>` / `--list`; `window.__appReady` after every startup promise settles; `openApp` waits for it. [PLATFORM.md]
- **Device cache and offline read-only view (ao)** (7 Nov, last code `406fed8`, LIVE in `d0a69b2`): invariant 17; Offline / Can't reach OneDrive rows; toasts "Updated" / "Back online"; written values shown while Excel's content lags (`withRecentWrites`, display only); Docket "About" (load report, save steps and outcome, version checks, content-lag probe, Refresh). [PLATFORM.md]
- **Finish list from Lookup_Finishes (ar)** (7 Nov, last code `632f8e0`, LIVE in `2b4920f`, step 8 passed): the 12th launch sheet (optional; saved-copy format 2); the list is column A in sheet order, never "Various"; fallback `FINISH_FALLBACK_LIST` (13, with Diamond Field); a value the list lacks stays as "— existing value". Read-only. [ADD_COIN.md]
- **Save speed (ax), Stage 1 + 2a** (7 Nov, last code `db8673e`; LIVE in `785e7de`; 2b shelved): the header re-read, row lookup and row re-read run together (P2 for Edit Coin with checks (i)-(iii), P1 for Promote; invariant 3); Save steps diagnostics (saved-copy delete, token, answer read, main-thread stall, background work; Mark as promoted; "Write outside a timed save"); About's LastModified read-back; writes while Excel lags: claimed rows never re-claimed, Promote "not showing yet" with no second row on a retry, the serial re-read's CollectionID check, own row states by LastModified (invariants 4, 7). [WRITE_LAYER.md]
- **Full-resolution photos (ak)** (11 Nov, code `1332303`, merged by fast-forward): every non-flip photo trim-only and never downscaled, untouched = the picked file's own bytes; Obverse / Reverse one encode, 1400 / 0.92; thumbnails for tiles; upload session after a 413. [PHOTOS.md]
- **Workbook session (bk)** (8 Nov, code `296d8c4`): every workbook request through one Excel session, write steps pinned to its generation (invariant 18; Ray's TEST passed (a), (b), c1, c2). [WRITE_LAYER.md]
- **Belongs to** (Oct): invariant 15. **Earlier work** (Add Set, Browse Edit write layer, Add Coin Phase 1 / 2, Promote duplicate-row fix, Item 5, "Owned", Set attach / detach, Photos and Receipts tabs, Former Holdings + Purge): in the invariants; write-ups in WRITE_LAYER.md, ADD_COIN_WRITE.md, ADD_SET.md, FORMER_HOLDINGS.md, SAVE_AND_RECEIPTS.md.
- (bs) Build 3, crop-screen basics (merged 14 Nov 2026, code `85940b2`): crop screens fit the phone (F2) with handles on a 16 px dark margin and 44 px touch areas (F1); long-press blocked; a control pad (− ↑ + / ← → / ↺ ↓ ↻) with 1 px arrows and 0.5° steps; angle sliders in 0.1° with a ±0.5° snap to 0 and a 0° tick; the circle gets the square plus 25% of photo (start = square fills it, log zoom to 6x, never black) and is cut from the full-resolution original; display-only view zoom on the rectangle crop (1x-4x, pinch, pan, slide-along); choice dialogs wrap their buttons. [PHOTOS.md "(bs) Crop-screen basics"; HISTORY "(bs) build history"]
- Build 1 of the review plan (merged 15 Nov 2026 by fast-forward to `5bf3bee`, branch `claude/build1-gate-backlog`): B2 `npm test` runs suites 4 at a time in child processes (870 s -> about 230-260 s; `--serial` / `TEST_JOBS=1`; `RUN_ALONE`: crop_from_upload); B10 BACKLOG.md 151.8 KB -> 39.8 KB, finished items moved word for word to HISTORY "Moved from BACKLOG.md (B10, 15 Nov 2026)". [PLATFORM.md "Parallel runner (B2)"]
- Build 2 of the review plan (merged 15 Nov 2026 by fast-forward to `daafae4`, branch `claude/build2-failure-tests`; tests only): B6 failure suites `tests/verify_fi_*.js` (11 flows, every write request failed or its answer lost, then a retry; 196 KNOWN lines tagged A2 / A3 / A4 / A5 / A8 / A14 / A16 / A17 and new N1-N4; the list only shrinks); crop_from_upload's fixed 30 ms waits replaced by condition waits and its RUN_ALONE entry deleted; crop_basics 190 s -> about 25 s (`keepFramesComing`: headless Chromium starved canvas encodes of idle time). [PLATFORM.md "Failure injection (B6, Build 2)", "Image encodes and idle time (Build 2)"]
- Build 3 of the review plan (branch `claude/build3-data-safety`, 15 Nov 2026; NOT merged yet: held for Ray's device TEST and go-ahead): A1 Staging listings follow `@odata.nextLink` and a new draft's first coin.json / set.json is written no-overwrite with a `firstWriteToken` (`writeNewDraftJson`); A12 only exact AY-##### Staging names count, `stage.html` a notice page; A2 a first save that does not finish becomes the Staging-draft edit of the same id (`enterFirstSaveRetry`; Save again finishes it, then promotes for Save to Database; the double-row case closed); A16 Add Set writes set.json first and never overwrites (`addSetUnfinishedStart`, `uploadDraftPhoto`); A4 Reject refuses a coin on All (`rejectOnAllRefusal`, `allRowKeysSentThisSession`) and the toast says Mark as promoted; B1 failure toasts say why, Docket > About keeps the last 10 saves with Copy. KNOWN lines deleted: A2 30, A4 8, A16 4, A8 6. [ADD_COIN_WRITE.md "Build 3 of the November 2026 review"; TEST round (16 Nov, `67a9cc8`): B-1 Add Set saves every photo of its photo section (only the Package front was saved, on main too), F-1 to F-6 save-log, toast and wording fixes; ADD_SET.md "Add Set saves every photo (B-1)"]


## CLAUDE.md sections retired 9 Nov 2026 (usefulness-over-size rule)
Kept verbatim for the record. "End-of-task reporting" was folded into rule 3; "Merge policy" was replaced (every code merge waits for Ray); "Maintenance" contradicted rules 1 and 4 and was removed.

## End-of-task reporting (standing rule)
When finishing any task (bug fix, feature, batch), give Ray a copy-paste-able
plain-text summary block (one fenced code block; see rule 3 of "Standard
end-of-work pattern" at the top of this file): what changed, how it was verified, and — critically —
any open questions or concerns worth a second look (an ambiguous instruction,
a tradeoff made without explicit sign-off, a side effect on something else,
an unresolved item carried over from a prior task) so the two of you can
deliberate before anything moves further. Don't skip the questions section
just because nothing came up — say so explicitly rather than omitting it.
This applies on top of, not instead of, the CLAUDE.md update rule below.

## Merge policy (standing rule)
Auto-merge feature branches to main at the end of a task by default — don't wait
for Ray to explicitly ask each time. **Exception:** large/architectural/
cross-cutting work (e.g. the CollectionID-reservation system) stays held on its
branch — wait for Ray's explicit go-ahead before merging that class of work, same
as before this policy existed.

## Maintenance
Update this file only when something changes that a future session would actually
need to know to avoid re-doing work or making a wrong assumption — a new
architectural decision, a schema/naming convention change, a scope boundary, or a
change to how a feature is supposed to work. Don't update it for routine task
completions (a bug fix, a component built to existing spec, a screen finished per
existing spec) — just do the work. If unsure whether something rises to that bar,
ask before updating rather than updating by default.


## (bs) build history (11-14 Nov 2026, branch `claude/crop-basics-bs`, merged 14 Nov 2026)
- Plan 11 Nov (docs/HISTORY.md "(bs) Build 3 plan" (moved from BACKLOG.md 15 Nov 2026)); Ray's answers Q1-Q9 the same day, all as suggested, plus a reset to exactly 0° on both stages (Q6 addition). Built from main `1b502e0`: code `379290d`.
- Deviation from the plan: the Stage 1 panel's max-width went 420 -> 440 px. With the 2 x 16 px margin a 420 px panel gave a tablet only 348 x 261, so the 360 x 300 cap Ray kept (Q2) was out of reach (found by B2). The 0° reset is a separate button, not a tap on the readout (Ray left it to the build).
- Affected suites (16: the 15 crop-screen suites + crop_basics), one run after the build: all PASS, 0 failed (about 5 min).
- Branch gate (full `npm test` at `379290d`, 11 Nov 2026): 5106 passed, 0 failed, 0 page errors, 102 suites, 755 s.

- Ray's TEST of Build 119 (phone, 14 Nov 2026): all steps passed; step 10 N/A (the app stays portrait). Fix round asked for: remove the 0° button; one control pad per stage (− ↑ + / ← → / ↺ ↓ ↻); readout on the slider row; a 0° tick and a ±0.3° snap; circle zoom with a centred, even slider and − / + at about 1% a tap; sliders follow the buttons; Use on screen at about 384 x 740; a sharpness guard for (ak) with a stretched-display-copy negative control.
- Fix round, 14 Nov 2026: code `d28d70a`. Zoom finding: the circle's zoom runs 100-300% from a start of 110%, and 100% is the smallest that still covers the circle, so a centred even slider has no room below the start; per Ray's instruction the slider rework was NOT built and the options went to Ray (docs/HISTORY.md "(bs) Build 3 plan" (moved from BACKLOG.md 15 Nov 2026)). Built: everything else, including − / + on the existing range. Layout measured at 384 x 740 with the 24 px TEST bar: Stage 1 Use bottom 716-728, Stage 2 about 707; the 40 px fallback is only under 380 px wide. Affected suites, one run: 16 PASS, 1476 / 0 (5.5 min).
- Fix-round gate (full `npm test` at `d28d70a`, 14 Nov 2026): 5123 passed, 0 failed, 0 page errors, 102 suites, 737 s.

- Fix round 2 (Ray chose Z-C, 14 Nov 2026, with bounds: zoom-in at least 5x the start, zoom-out at least 1.25x where the photo allows, the circle saved from the full-resolution original): code `7a19175`. Built as asked; 6x in (66 / 13 mm = 5.1x, so 5x would not quite reach a 13 mm coin in a 66 mm square), 25% margin (1.5x out). Found while building: the old pan limit ignored a fine turn, so a straightened circle panned to its limit could show black at its edge (fixed: with a fine turn the limit keeps the circle inside the turned picture); and a black check on the SAVED circle alone proves nothing for the centre of a photo, because the original has real photo beyond the hand-off: the checks look at the on-screen cut (the hand-off) too. Affected suites (17, every suite that opens a crop screen), one run: 1524 / 0 (6.3 min).
- Fix-round-2 gate (full `npm test` at `7a19175`, 14 Nov 2026): 5136 passed, 0 failed, 0 page errors, 102 suites, 790 s.

- Ray's re-test of `7a19175` (phone, 14 Nov 2026): R1-R15 passed. Fix round 3 asked for: snap ±0.5° (±0.3° too hard to hit with a finger), arrows 1 px, and view zoom on the rectangle crop (planned first: docs/HISTORY.md "(bs) fix round 3 plan" (moved from BACKLOG.md 15 Nov 2026)).

- Fix round 3 (Ray's Q1-Q7 answers to the plan, defaults plus: no handle touched -> zoom about the view's centre; 14 Nov 2026): code `d927c55`. Snap ±0.5°, arrows 1 px, view zoom on the rectangle crop. Built as planned; no deviation. Affected suites (17), one run: 1551 / 0 (6.8 min).
- Fix-round-3 gate (full `npm test` at `d927c55`, 14 Nov 2026): 5163 passed, 0 failed, 0 page errors, 102 suites, 820 s.

- Ray's TEST of `d927c55` (phone, 14 Nov 2026): T1-T11 passed (T10 not confirmed with file sizes on the device; V7-V11 cover it). Found: the "Crop this photo into…" chooser ran Cancel off its box at about 384 px. Measured on main `1b502e0` too: the same overflow at 360 and 384 (and into the panel's padding at 412), so older than (bs). Cause: `showWriteGuard`'s button row (`.photo-adjust-btns`, one flex row, no wrap) in a panel of at most 360 px: four buttons need about 330 px, the row has 320 (304 at 384 px wide). Fix `85940b2`: `#writeGuardBtns` wraps, two to a row (`.wrap2`, added by `showWriteGuard` only when one row is too wide, measured with the overlay showing), every button at least 44 px tall (was 40). Because the dialog is capped at 360 px, these four wrap at every screen width; a two-button dialog stays on one row. The crop screens' own rows (both pads, Cancel / Use, the 90° / Lock row) were measured at 360 / 384 / 412: none ran off its panel. Affected suites (29: every suite that opens the dialog, plus photo_fullres and replace_never_overwrites): 2363 / 0 (8.4 min). Negative control, the old single row: crop_basics W1-W3 failed at every width (12 checks).
- Gate (full `npm test` at `85940b2`, 14 Nov 2026): 5179 passed, 0 failed, 0 page errors, 102 suites, 822 s.
- Ray's quick check of `85940b2` (14 Nov 2026): Q1 passed (the chooser in two rows, Cancel works), Q2 passed (a two-button dialog on one row). Merged by fast-forward to `d282ace` (main had not moved from `1b502e0`, so the gate at `85940b2` stood); the merge's docs commit regenerated CODEMAP (with a (bs) section), closed (bs) in BACKLOG and added (bx), (by).

### (bs) fix-round-3 negative controls (14 Nov 2026)
17 copies, four at a time (about 11.5 min), then 1 re-run. Each made crop_basics fail:
- Ray's: A snap left at ±0.3° (F6, F12, F13: the upload 129,457 bytes, not the original's 72,622); B arrows at 2 px (D3, E1, V21).
- The four (ak) proofs: P1 drag not divided by the zoom (V8: the box moved 30 px, not 10; V14, V20); P2 zoom written into the box (V6, then the suite threw: the moved box put a handle off screen); P3 pan limit without the margin (V5, V6, V12, V18, V19); P4 a decode on every zoom tap (V11: 3 decodes).
- New behaviour: C1 pinch about the view's centre (V15, V16); C2 no slide-along (V20); C3 − / + never greyed (V1, V3, V5); C4 the touched handle ignored (V6); C6 arrows without the view following (V21); C7 a 90° turn keeping the zoom (V24); C8 Lock to square not showing the box (V23); C9 a drag outside the box moving the box (the suite threw inside the V12-V21 block, before its checks, so no named check reported it); C10 a second finger keeping the half-done edit (V17); N3 margin 0 (17 checks incl. C1, C2, V1, V18, V19).
- C5 Ray's addition, the zoom about the BOX's centre when no handle was touched: first PASSED (the default whole-photo box's centre is the view's centre); V2 now uses an off-centre box and C5 fails it.

### (bs) fix-round-2 negative controls (14 Nov 2026)
Each on a copy, four at a time (15 copies, about 6.5 min), then 2 re-runs after the black check was corrected (about 3 min). Every one failed:
- Ray's four: CA the circle saved from the hand-off (Z15, Z16: 480 px from a 320 px cut, stripe contrast 113 of 255, 67% black or white; the real code: 640 px, 255 of 255, 100%); CB zoom-in capped at 4x (Z4, Z12, Z15); CC a minimum zoom of 0.8 that shows black (Z3, Z6, Z8, Z9, Z10, Z11, Z12: about 15,300 black samples a cut); CD no margin (E1, E3, E4, Z1, Z3, Z7, Z11, Z13, Z17).
- M1 the pan limit ignoring a fine turn: first PASSED (at the smallest zoom the square limit allows no pan, and the saved cut has real photo beyond the hand-off); after Z10 also ran at the starting zoom and the black check looked at the on-screen cut, it failed Z10 (530 and 570 black samples on the diagonal pushes).
- M2 Stage 1's turn left out of the original cut: Z14. M3 zoom not about the circle's centre: Z17. M4 the start tick in the middle: Z5. M5 a linear zoom slider: Z6, Z7. M6 a 90° turn re-centring the picture: Z18.
- Re-run on the new code: N6 Stage 2 nudge unclamped (E3); N8 a mark drawn into the ORIGINAL cut (G4, Z14, Z16); NB snap removed (F6, F11, F12, F13); NA the rectangle crop from the stretched display copy (photo_fullres K2: 92 of 255).
- True values (a copy with the thresholds raised, so they print): Z14 the original cut against the on-screen cut, through both stages' turns, a pan and a zoom: worst difference 1 of 255; Z16 stripes 255 of 255, 100% black or white.

### (bs) fix-round negative controls (14 Nov 2026)
Each on a copy of app.html (or of the suite, for NK), four at a time (about 8 min for 19, then 3 single re-runs of about 1 min each). Every one failed:
- Re-run on the new code: N1 no long-press block (A1, A2); N2 fixed 360 x 300 (8: B1 x3, B3, B6, C2, C3, K8); N3 margin 0 (5: B3, C1 x2, C2 x2); N4 no touch area (C3 x2); N5a Stage 1 nudge unclamped (D4); N5b never greyed (D1, D2, D4); N6 Stage 2 nudge unclamped (E3); N7b no rounding (F2); N8 a mark in the bake (G4).
- NB Ray's control, the snap removed (a small leftover angle): 4 failed (F6, F11, F12, F13: the upload was 123,814 bytes, not the original's 72,622; kind trimmed-fullres).
- NC zoom − / + unclamped: Z4 (0.81 and 5.9). ND the zoom slider not following: Z2, Z3, Z4. NE → moved next to the edge cell: K1, K2, K7, K8. NG no 0° tick: K4. NH 36 px buttons: K3, K7, K8.
- NA Ray's sharpness control, the crop cut from the 1600 px display copy and stretched back to full size: photo_fullres K2 failed (mean step 92 of 255 between neighbouring stripes, 20% of pixels black or white; the real code: 255 of 255, 100%, read from NK, a copy with the K2 threshold raised so it prints). N9 (ak)'s control at the display copy's own size now fails 4 (B2, C2, C4, K2).
- Use-on-screen controls: removing the fix round's panel padding alone (NF) PASSED: the shorter hints and the merged Lock / 90° row keep Use on screen. Removing all the spacing and restoring the old hints (NF2) failed only at 360 x 700 (K8). Pushing Use down 80 px (NF3) failed K6 and K8 but not K5, because Stage 1 shrinks its picture to keep the panel on screen (the F2 fit, down to 200 px). At 200 px (NF3b) K5, K6 and K8 all failed. So K5 / K6 catch Use off screen; the compaction is a margin at 384 x 740, not what keeps it there.

### (bs) negative controls (11 Nov 2026, branch `claude/crop-basics-bs`)
Each mutation was applied to a copy of app.html and the suite run there (in parallel, four at a time, about 3.5 min for all); every one failed:
- N1 no long-press block (`blockCropLongPress` adds nothing): crop_basics 2 failed (A1, A2).
- N2 the fixed 360 x 300 back (`bgCropFitBounds` returns the cap): 9 failed (B1 at 360 / 384 / 412, B3, B6, C2 at 384 and 412, C3 at 384, C4).
- N3 margin 0 (`BG_CROP_GUTTER` 0, padding 0): 4 failed (C1, C2 at 384 and 412).
- N4 no touch area (the ::before 16 px): 2 failed (C3 at 384 and 412).
- N5a Stage 1 nudge not clamped: 1 failed (D4). N5b arrows never greyed: 3 failed (D1, D2, D4).
- N6 Stage 2 nudge not clamped: 1 failed (E3; 82 px against a limit of 11.8).
- N7a Ray's control, a reset that leaves a residue (reset = current x 1e-9, rounding removed): 4 failed (F2, F9, F10, F11: the upload was 77,125 bytes, not the original's 72,622; kind "trimmed-fullres").
- N7b rounding removed only: 1 failed (F2). (A reset to a literal 0 still saves the bytes without the rounding; the rounding is what keeps a slider or step sequence back at 0 exactly.)
- N8 a white square drawn into Stage 2's bake: 1 failed (G4).
- N9 (ak)'s control, `bakeBgCropFromOriginal` drawing the display copy (`s.baseCanvas` at its own size) instead of the original: photo_fullres 3 failed (B2, C2, C4). (ak)'s run listed 9 failures for its version of this mutation; this version keeps the original's W x H, so the size checks pass and only the content checks fail. A first try that stretched the display copy to W x H passed photo_fullres (the geometry is then right, only softer): sharpness is not checked there, as it was not in (ak).

## (ak) build history (9-11 Nov 2026, branch `claude/holder-fullres-ak`, merged 11 Nov 2026)
- Plan round 9 Nov (Ray's Q1-Q15); build 9 Nov: code `13d1978` + test fixes `1332303`; branch gate 5057 / 0 / 0 on 101 suites (647 s); TEST deploy run #116 (Build 116).
- Ray's TEST, phone, _Testing coins (11 Nov): steps 1-10 passed. 1 camera holder untouched 2.6 MB, 2992 x 2992 (camera in 1:1); 2 trimmed + straightened 1600 x 1800, 730 KB (camera in Full mode); 3 guided Obverse 1354 x 1354, 382 KB; 4 Gallery pick byte-identical; 5 Reference via Files identical; 6 tiles and viewer fast; 7 Staging -> Promote sizes unchanged; 8 Replace: same PhotoID, `_02` name, old file kept, Obverse unchanged; 9 a 50 MP holder (AY-00004_slab_reverse_02.jpg, 11.99 MB), no crash, NO 413 line: the simple upload took it in 14.0 s, save total 18.9 s (the upload-session path not exercised on a device); 10 the in-app Camera's photo is NOT in the Samsung Gallery. Skipped: 11 (airplane-mode failure), 12 (LIVE vs TEST timing).
- Answers 11 Nov: Q1 keep the upload session (only after a 413); Q2 Staging-edit tiles -> backlog (bt); Q3 viewer zoom -> backlog (bu), after Build 3.
- Findings: F1 / F2 -> Build 3 (bs); F3 -> (bv); F4 watch + the keep-the-steps idea -> (bw).
- Merged by fast-forward to `1d53ec4` (main had not moved from `6437872`, so the branch gate stood); the merge's docs commit regenerated CODEMAP and moved these notes here.

### (ak) negative controls (9 Nov 2026, branch `claude/holder-fullres-ak`)
Each mutation was applied to app.html, `npm test -- photo_fullres` run, and app.html restored (`git checkout`). Every one failed the suite:
- Bake from the display copy instead of the original (`bakeBgCropFromOriginal` drew `s.baseCanvas`): 9 failed (A4, B1, C1, C3, D2, E2, E3, H1, H2).
- The 1400 cap left on trim-only photos (`outMax = BG_CROP_OUTPUT_MAX`): 4 failed (A4, B1, C1, H1).
- Untouched bytes re-encoded anyway (the original-bytes branch skipped): 1 failed (A2).
- Stored trim-only tiles read the full file (`storedTileFetch` never thumbnails): 1 failed (F4).
- The 80% inset kept for trim-only photos (`resetBgCropBox`): 9 failed (A1-A4, E1-E3, F2, H1).
- No upload session after a 413: 6 failed (G1-G6).
Found while running them: F4 counted every Graph request in its window, and a background docket.json read sometimes landed there (seen once, under the cap mutation); F4 now counts CoinPhotos requests only. details-viewer-nav H3 forgot each entry's `url` but not the new `fullUrl`, so the neighbour prefetch it checks was skipped; the fixture now forgets both (the assertion is unchanged).

## Moved from BACKLOG.md (B10, 15 Nov 2026)
Build 1 (B10 of docs/REVIEW_BUILD_PLAN_2026-11.md) moved the full text of finished items out of docs/BACKLOG.md, word for word, in their BACKLOG order; BACKLOG.md keeps one line each pointing here, and every still-open part ((ax) 2b, (bk) F and its follow-up, (an)'s left-alone list) stayed there. Headings below that start with "##" are the original BACKLOG headings, kept as they were.

## (bs) Build 3 plan (11 Nov 2026, plan only, no code; waiting for Ray's answers Q1-Q9)
Fix round (Ray's TEST of Build 119, 14 Nov 2026, all steps passed; step 10 N/A): 0° button removed, a control pad per stage (− ↑ + / ← → / ↺ ↓ ↻), readout over the slider, a 0° tick and a ±0.3° snap, circle zoom − / + about 1% a tap, sliders follow the buttons, Use on screen at 384 x 740, plus a sharpness guard for (ak). Built the same day, except the zoom SLIDER (item 5), held for Ray: the circle's zoom runs 100-300% and starts at 110%, and 100% is the smallest zoom that still covers the circle, so a centred even slider has no room below the start. Options (recommendation in brackets): Z-A keep the slider as it is, linear 100-300% from 110%, the − / + buttons give the fine control; Z-B a centred slider with two scales, 100-110% on the left half and 110-300% on the right (not even-feeling: the left half is about 20x finer); Z-C give the circle real room to zoom out: Stage 1 hands Stage 2 the box plus a margin of the photo round it (e.g. 25% a side, cut from the original, within the 2000 px hand-off cap), the circle starts with the box filling it, and a centred log slider runs from the cover minimum to the same factor above the start, with a tick at the start (today at 110% a tightly framed coin's rim is cut by about 9%, which may be why zoom-out is wanted) [Z-C]; Z-D allow zoom below 100% (black shows inside the circle and in the saved Obverse) [no]. RAY CHOSE Z-C (14 Nov 2026), with bounds: zoom-in at least 5x the start, zoom-out at least 1.25x where the photo allows, and the saved Obverse / Reverse cut from the full-resolution original with the circle's final framing (output unchanged: 480-1400 px, 0.92, one JPEG). Built the same day (fix round 2): 6x in, a 25% margin (1.5x out), saved from the original; write-up docs/ref/PHOTOS.md "(bs) Crop-screen basics" fix round 2.
Ray's answers (11 Nov 2026): Q1-Q9 all yes as suggested, with ONE ADDITION to Q6: a reset to exactly 0° on both stages (built as a separate 0° button, the build's call), with a test (an untouched Holder turned, reset, Saved = byte-identical) and a negative control (a reset leaving a residue must fail). Built the same day; see the BACKLOG line above.
Scope: the (bs) line above (long-press block, nudge arrows, 0.5° buttons + 0.1° slider + readout, centre mark) plus (ak) findings F1 and F2. Auto-fit stays out (Q11). Nothing here writes; invariants 1-18 untouched.
- **Screens.** Stage 1 (`#bgCropOverlay`, `openBgCrop`) is every pick: Holder front/back, Reference, Other, COA, Package / OGP, Set photos (trim-only, box starts at the whole photo), a direct Obverse / Reverse pick (square box, 80% inset, then Stage 2), a guided crop (Stage 1 then Stage 2), Recrop / Crop from another photo, Add Set's square child slots (capped 1400), Add Set's Set / sub-group photos. Stage 2 (`#photoAdjustOverlay`, `openPhotoAdjust`) is the Obverse / Reverse circle after Stage 1, incl. the guided crop, plus the legacy positional callers. One overlay each, so every screen gets the change at once.
- **F2 measured (Playwright, 11 Nov 2026, viewport 360 / 384 / 412 wide; S25 Chrome is about 384).** The stage is fitted to a fixed 360 x 300 (`BG_CROP_MAX_DISP_W/H`), but the panel's inside is only 282 / 306 / 334 px, so a landscape photo's stage runs from x 39 to 399: past the panel at every phone width and past the screen at 360 and 384. Main (`1332303` code) and pre-(ak) LIVE (`f1d07f0`) give identical stage sizes: F2 predates (ak). Pre-(ak) a trim-only box's right handles sat at 355-371 (on screen at 384); (ak)'s whole-photo box put them at 391-407 (off screen). A direct Obverse / Reverse square box has its handles at 319-335 in both, so Ray's Reverse case was most likely a moved / enlarged box or a narrower viewport (Chrome text zoom); either way the cause is the fixed width.
- **F2 fix.** `refreshBgCropSource` fits the stage to the space really available: width = min(cap, the panel's inside width), height = min(cap, what the screen leaves after the controls), measured each time the screen opens, after a 90° turn, and on resize / orientation change (the box is rescaled proportionally, as the straighten slider already does). The display copy (1600 px) and the bake are unchanged; only `dispW` / `dispH` get smaller. The stage is centred.
- **F1 fix (handles grabbable while the box still starts at, and can still cover, the whole photo).** (1) A dark margin (about 16 px, `BG_CROP_GUTTER`) round the picture inside the stage: the picture and the box sit in an inner frame offset by the margin, so a whole-photo box's handles land on the dark margin, fully on screen, never on the panel edge. Box coordinates stay in picture px (0..dispW), so clamping, `bgCropUntouched` and `bakeBgCropFromOriginal` are unchanged. (2) Each handle gets an invisible touch area of about 44 px (the visible square stays 16 px); corner handles win over edge handles and over "move" where they overlap. (3) Rejected: starting the box slightly inside the photo (it would break (ak)'s untouched-bytes rule, Q1 of (ak)).
- **Long-press block.** Both crop overlays: `contextmenu` cancelled, `-webkit-touch-callout: none` and `user-select: none` on the overlay, the image stays `draggable=false` / `pointer-events: none`. Only these two overlays (not the viewer, not tiles).
- **Nudge arrows (tap only, no repeat on hold).** Four arrow buttons on each stage, `CROP_NUDGE_PX` about 2 screen px a tap (tuned after Ray tries it). Stage 1: moves the box, clamped to the picture; an arrow that cannot move is disabled (so on an untouched whole-photo box all four are greyed). Stage 2: moves the picture under the circle (same direction as a drag), through `clampPhotoAdjustOffsets`. Drag stays for the big move.
- **Angle.** Both stages: "−0.5°" / "+0.5°" buttons beside the Straighten slider, slider `step` 0.1 (range ±45 unchanged), a readout ("Straighten +1.5°"). Every value is rounded to one decimal (`roundAngle`) so +0.5 then −0.5 is exactly 0 and an untouched trim-only photo still keeps its own bytes. Stage 1 buttons go through the same rAF re-bake as the slider.
- **Centre mark.** A small cross, display only (`pointer-events: none`, never in a bake): always at the centre of the Stage 2 circle; in Stage 1 at the box centre only while Lock to square is ticked.
- **Risks to (ak) and how tests guard them.** R1 untouched detection: a nudge or angle tap that returns to the start must leave the box exactly whole and the angle exactly 0 (test: +0.5 / −0.5 and slider back to 0 -> kind `original-bytes`, byte-identical). R2 the smaller `dispW`: mapping must still land on the original's pixels (test: the (ak) marker / quadrant checks at 360 and 412 wide, output size = the box in ORIGINAL px, not display px). R3 the margin: box coordinates must not include it (test: whole-photo box = 0..dispW; a crop of the left half maps to the original's left half). R4 Stage 2 nudge / 0.1° change only geometry: still one encode, 480-1400 px, JPEG 0.92. R5 the centre mark and handles never reach the output (test: centre pixel of a baked plain-colour photo is that colour). R6 resize mid-crop keeps the box on the same part of the picture.
- **Tests.** New `tests/verify_crop_basics.js` (shared check helper, must-fail self-check first; about 45 checks): A long-press (contextmenu cancelled on stage, box, circle; touch-callout none); B F2 fit at 360 / 384 / 412 / tablet 768, landscape 4:3 and 16:9, portrait, after a 90° turn: stage inside the panel, every visible handle inside the viewport; C F1: all 8 handles of a whole-photo box inside the stage and viewport, `elementFromPoint` at each handle centre is that handle, a real pointer drag of a corner shrinks the box, dragging back out reaches the whole photo and Use gives `original-bytes`; D Stage 1 nudge (2 px, clamps, disabled at the edge, result offset = 2 / k original px); E Stage 2 nudge (offset 2 px, clamped, baked output shifts); F angle (buttons, readout, step 0.1, rounding, +0.5 / −0.5 -> untouched bytes, 0.1° reaches the bake); G centre mark (circle always, Stage 1 only when locked, not in the output); H no Graph writes. Affected suites while iterating (15 touch the crop screens): photo_fullres, guided_crop, crop_from_upload, addcoin_shared_photos, staging_edit_photos, staging_replace_keeps_old, photos_wait_for_save, photo_label_save, photo_receipt_write, image_chooser, files_picker, leave_guard, ogp_open_ended, row_tiles_viewer_label, save_only_when_changed. Full npm test once, as the merge gate.
- **Negative controls (each must fail the new suite).** No contextmenu handler (A); the fixed 360 width back (B); margin 0 (C); no touch area (C); nudge ignores the clamp / not disabled at the edge (D); Stage 2 nudge not clamped (E); no angle rounding (F: 0.1 + 0.2 − 0.3 is not 0, so the untouched bytes are lost); centre mark drawn into the bake (G). Plus (ak)'s own: bake from the display copy (photo_fullres must still fail).
- **TEST steps for Ray (phone, TEST build, a _Testing coin).** 1 Holder front from the camera in Full (landscape): the whole crop screen fits, all 8 handles are visible and grabbable without Lock to square; drag one corner in; Use. 2 Holder untouched: Use straight away; About shows the original's size (as (ak) step 1). 3 A wide Reverse pick from the Gallery: nothing off the right edge, no 90° turn needed. 4 Long-press the photo in Stage 1 and in the circle: no Android menu. 5 Arrows: the box moves a little each tap in Stage 1, the coin in the circle; say if 2 px is too much or too little. 6 Straighten with +0.5 / −0.5 and the slider; the readout; a 1.5° holder comes out straight. 7 Centre mark on the circle, and in Stage 1 with Lock ticked; not in the saved photo. 8 Guided crop from a holder: the same controls in both stages. 9 One Save; OneDrive file sizes as in (ak). 10 Optional: the tablet.
- **Questions for Ray (suggested default in brackets).** Q1 F1 by a dark margin round the photo plus bigger invisible touch areas [yes]. Q2 F2: fit the stage to the screen, keep the 360 x 300 cap (tablets do not grow yet) [keep the cap]. Q3 nudge 2 screen px a tap, tap only, no hold-to-repeat [yes; tune after TEST]. Q4 on the circle an arrow moves the picture, like a drag [yes]. Q5 Stage 1 arrows greyed when the box cannot move that way (all four on an untouched whole-photo box) [yes]. Q6 0.5° buttons and the 0.1° slider on BOTH stages, range ±45 unchanged, no "reset to 0°" button [yes]. Q7 centre mark: circle always, Stage 1 only with Lock to square (as recorded) [yes]. Q8 long-press blocked on the two crop screens only [yes]. Q9 on a short screen (phone turned sideways) the crop panel scrolls rather than shrinking the stage below about 200 px [yes].
- **Size.** About 250-350 lines in app.html (CSS ~60, HTML ~40, JS ~150-250) and a new suite of about 450 lines; one branch, one build session plus Ray's TEST. Small-to-medium.

## (bs) fix round 3 plan (14 Nov 2026, plan only; Ray's re-test of `7a19175` passed R1-R15)
Ray's answers (14 Nov 2026): Q1-Q7 all as suggested, with one addition to Q2: if no handle has been touched yet, − / + zoom about the centre of the view. Built the same day (docs/ref/PHOTOS.md "(bs) Crop-screen basics", fix round 3).
To build without questions: (1) the angle slider's snap to 0 widens from ±0.3° to ±0.5° (`CROP_ANGLE_SNAP`; Ray found ±0.3° too hard to hit with a finger); (2) the arrows move 1 screen px a tap (`CROP_NUDGE_PX`, was 2), both stages. To plan: (3) VIEW ZOOM on the rectangle crop, so Ray can place the box's edges precisely on holder photos.
- **The model.** The box stays where it is kept today: in picture px at zoom 1 (0..dispW x 0..dispH), the space `clampBgBox`, `bgCropUntouched`, `bgCropHandOffRect` and `bakeBgCropFromOriginal` read. The view adds `bgCropState.view = { z, panX, panY }` (screen = picture x z + pan). Only drawing and pointer input change: `renderBgCrop` places the picture, shades, box and handles at screen = box x z + pan (the handles and the 44 px touch areas stay their own size: they are NOT scaled, only placed), and every drag delta is divided by z before it touches the box. Nothing that saves reads `view`. At z = 1 with pan = the 16 px margin, the screen is exactly today's.
- **The viewport.** The stage's inner area INCLUDING the 16 px margin (dispW + 32 x dispH + 32). Pan limit: the picture's edge can come in to 16 px from the viewport's edge, never further, so a handle on the photo's edge always has the margin to sit in (F1 kept at every zoom).
- **Zooming in.** + / − on the rectangle crop's pad (the empty − and + spots; no new rows, so Use stays on screen at 384 x 740). Zoom about the ACTIVE point: the handle last touched, else the box's centre; that point keeps its place on screen. Pinch (two fingers) zooms about the fingers' midpoint.
- **What to prove for (ak) and how.** (i) The same box gives byte-identical output at any zoom: place a box at zoom 1, Use, keep the bytes; re-open, zoom to 3x, pan, drag a handle 30 screen px out and back (net 0), Use: identical bytes. (ii) A drag of 30 screen px at 3x moves the box 10 picture px (and the result equals a zoom-1 crop of that box, byte for byte). (iii) Zoom in / out / pinch / pan on an untouched Holder, then Use: still the picked file's own bytes. (iv) No decode of the original while zooming (spy on `createImageBitmap`: 0 calls between opening and Use). Negative controls: drag delta not divided by z (ii fails); zoom written into the box (i, iii fail); pan limit without the margin (the F1-at-zoom check fails); an extra decode on zoom (iv fails).
- **Questions for Ray (suggested default in brackets).**
  - Q1 (a) What pans the zoomed view? [one finger dragged OUTSIDE the box (on the dimmed photo or the margin) pans; two fingers pan anywhere (the same gesture as pinch); while dragging a handle within about 24 px of the view's edge the view slides along (auto-follow). A drag inside the box still moves the box; the arrows still move the box. At 1x a drag outside the box does nothing, as today.]
  - Q2 (b) A handle outside the zoomed view? [Zoom works about the handle last touched: tap the corner at 1x (no need to move it), + zooms into that corner; − to zoom out, touch the next corner, + again. Also: pan to it (Q1), and auto-follow while dragging. The margin rule keeps an edge handle fully reachable at every zoom (F1 stays fixed).]
  - Q3 (c) Sharpness: the screen shows the 1600 px display copy. On a 300-360 px stage, 1x is about 5 copy px per screen px; at 4x about 1.3; past about 5x a screen px shows less than a copy px, so nothing more can be placed. On Ray's phone (about 2.8 device px per screen px) the view starts to look soft past about 1.6x, but an edge is still placed to about one copy px = 2.5 original px on a 4000 px photo, which is far finer than a trim needs. Drawing from the original when zoomed would mean holding a 48-200 MB decode, or a second 4096 px copy (about 67 MB, re-turned on every straighten), for the whole crop screen. [Max zoom 4x from the 1600 px copy; no sharper view now. If 4x looks too soft on the phone, a sharper copy is its own item later.]
  - Q4 (d) Range, step, slider, pinch. [1x-4x; − / + step 1.25x a tap (7 taps from 1x to about 3.8x, one more to 4x); − / + grey out at the ends; no zoom slider (no room under the no-scroll rule); a small "2.0x" badge in the stage's corner while zoomed; pinch works too.]
  - Q5 (e) Zoom on Use Crop, a 90° turn, a straighten, Lock to square. [Use Crop / Cancel: the next crop opens at 1x. 90° turn: back to 1x (the picture's shape changes and the box resets, as today). Straighten: keeps the zoom and the point under the view's centre. Lock to square: keeps the zoom; if the squared box leaves the view, the view moves to show it. A phone resize re-fit keeps the zoom and centre.]
  - Q6 (new) Arrows when zoomed. [1 SCREEN px a tap at every zoom, so at 4x a tap moves the box a quarter of a picture px (about 3 original px on a 4000 px photo): finer the more you zoom. The view follows the moved edge.]
  - Q7 (new) Should the circle (Stage 2) get anything from this? [No: the circle already zooms.]
- **Tests (crop_basics, new section V; about 30 checks).** The four proofs above; + / − about the active handle (the handle's screen position unchanged); 1x-4x and greyed ends; the badge; one-finger pan outside the box, box drag inside it, nothing outside at 1x; two-finger pinch and pan (synthetic pointer events with two pointerIds); auto-follow near the edge; pan limits incl. the margin at every edge at 4x, with all 8 handles of a whole-photo box reachable after panning to each edge; 90° turn / straighten / Lock / resize / reopen behaviour; Use on screen at 384 x 740 (K5) still. Items 1 and 2: F6-F7 move to ±0.5 (0.5 -> 0, 0.6 stays), F12-F13 let go at 0.4 (inside the new zone, outside the old one, so a ±0.3 snap fails them: that is the negative control); D3 and E1 expect 1 px. Negative controls: the four above, plus snap left at ±0.3, arrows at 2 px, pinch about the wrong point, no auto-follow, − / + not greyed at the ends.
- **Size.** Items 1-2: a few lines plus test updates. Item 3: about 250-350 lines in app.html (the view state, renderBgCrop placing by z and pan, pointer handling for pan / pinch / auto-follow, pan limits, the badge, − / + wiring) and about 350 lines of tests. One build session, then Ray's TEST.

### From BACKLOG: Open backlog status note
*(Status updates since this section was written: (am) CLAUDE.md slimming is DONE (4 Nov 2026). (ai) LastModified date + time is DONE. ParkingLot rows 3 and 4 ARE in the workbook (Ray, 5 Nov 2026): row 3 = ParkingLot 302, row 4 = ParkingLot 303; that "confirm transferred" line is closed for them. Row 1 (Mercury FB check) is in the workbook as ParkingLot 286, Open (Ray, 6 Nov 2026); the "confirm transferred" line is closed for all three rows.)*

### From BACKLOG: (b)
- (b) The "Mark ready" toast still says the app doesn't write the All sheet
  ("Copilot moves the row across"); out of date since Promote and the direct
  write landed. *(Fixed; on main since 24 Oct 2026.)*

### From BACKLOG: (c)
- (c) The Add Coin gallery has no per-photo Replace button. *(Closed 23 Oct 2026, on main: Add Coin uses Edit Coin's
  section, which has Replace.)*

### From BACKLOG: (g)
- (g) *(Done: built 30 Oct 2026 on `claude/value-fallback-melt-label`, merged to main 30 Oct 2026
  by fast-forward; see docs/ref/LEDGER.md "Value fallback: melt is labelled" and the star
  rule in docs/ref/ALBUMS.md.)* Melt is labelled "melt" with the spot-price date (melt below face counts as face, not melt) on
  detail, share and Ledger; the Ledger keeps Valued, Melt and face-only apart; Sets get a
  Variety line (default "Standard"); album star: filled = Key Date / Key Variety, outline
  = Semi-Key Date, none otherwise. Display only.

### From BACKLOG: (l)
- (l) *(Done: C2 of "Photos wait for Save", merged to main 27 Oct 2026.)* Close Drawer / navigate should warn on any unsaved edit (all fields,
  Edit Coin and the other edit screens), not only Back. Today `navigate()`
  leaves silently and the edits (photo labels included) are discarded.
  Next branch, plan first (Ray, 23 Oct): the same "Discard unsaved edits?"
  dialog as Back.

### From BACKLOG: (m)
- (m) *(Done: C1 of "Photos wait for Save", merged to main 27 Oct 2026.)* Photos on the
  edit screens wait for Save, the same as Add Coin's draft mode, instead of
  saving on capture; Discard undoes them; Manage Photos gets ONE Save button
  for photos and labels together (replacing "Save labels").

### From BACKLOG: (o)
- (o) *(Done: C2 of "Photos wait for Save", merged to main 27 Oct 2026.)* Same next branch as (l) and (m) (Ray, 24 Oct): Close Drawer on Add
  Coin must warn before throwing away a half-entered coin. Today
  `navigate("addcoin")` resets the form (`resetAddCoinForm()`) and leaving
  by any route discards whatever was typed or picked, with no warning.

### From BACKLOG: (n)
- (n) *(Done: C3, "C3: open-ended Package / OGP", merged to main 27 Oct
  2026.)* Package/OGP becomes open-ended
  (any number of photos, each labelled, e.g. Closed / Open) instead of a
  Front/Back pair. Needs a plan for the existing Front/Back Package photos
  (PhotoType `OGP_Obverse`/`OGP_Reverse`, Add Set's whole-set mirror, the
  Set's flip-photo fallback `setFlipPhotoUrl`).

### From BACKLOG: (p)
- (p) *(Done by the receipts and photos alignment, Build 1, on `claude/receipts-photos-alignment`, held: the fallback and the legacyOnly class are gone; the All columns stay, are never written, and become Copilot formulas.)* Its own small branch, after C3 (Ray, 24 Oct): retire the All-sheet
  photo fallback. The app still reads the old flat All columns (Obverse,
  Obverse_Original, Reverse, Reverse_Original, Photo3, Photo4, OGPPhoto) when
  a record has no Photos row (`legacyStoredRowsFor`, `storedPhotoFilename`'s
  fallback, `legacyFallbackFilenameFor`), and the Remove dialog's note "this
  coin also has a photo recorded in the old All sheet columns". The 3 Oct
  workbook copy shows all 41 filenames in those columns also have Photos
  rows, so the fallback looks unneeded. Recheck against the CURRENT workbook
  first. The All columns themselves stay as history (never cleared).

### From BACKLOG: (t)
- (t) *(Done: merged to main 28 Oct 2026, see "Receipts never overwrite".)*
  Receipts never overwrite (Ray, 27 Oct, his Q1 on the Replace fix), its
  own small branch. Today `commitReceiptCapture` uploads a new filename not
  on the Receipts tab with replace, and a photographed re-capture
  `{ID}_receipt.pdf` that IS on the tab skips the upload and keeps the old
  file. Same `NO_OVERWRITE` / free-name approach as photos.

### From BACKLOG: (w)
- (w) *(Done: merged to main 30 Oct 2026, code `7b56955` plus the undo `4589b46` and the failed-save cleanup `960634d`; see "Staging photo replace keeps the old file".)* Staging photo
  replace used to delete the old file; it now keeps it, like receipts.

### From BACKLOG: (z)
- (z) *(Done: built 30 Oct 2026 on `claude/save-only-when-changed`, merged to main 31 Oct 2026 by fast-forward, code `014be60`; see "Save only when something changed".)* Save changes only when something changed (Ray, 30 Oct 2026, found in
  his tablet retest). Save is enabled after a Replace even when an undo
  (✕ -> "Put it back") has returned the form to exactly its loaded state, and
  the leave guard (the "Discard unsaved edits?" dialog) likely still counts
  that Replace too. Fix both together: Save, and the leave guard, should
  count only real differences from what was loaded. Applies to every edit
  form: Edit Coin, Edit Set, Manage Photos and the Staging-draft edit.

### From BACKLOG: (af)
- (af) *(Build 2 BUILT 31 Oct 2026 on `claude/receipt-remove-and-shared-replace-w1cf1j`, merged to main 31 Oct 2026 by fast-forward to `28e5d5d`: all three items below are done; see "Receipts and photos alignment, Build 2". Build 1 merged to main 31 Oct 2026 (`6a21b60`): the All fallback is gone, the Binder line shows in the Edit slot, "Not scanned, paper in binder" in every receipt slot (only while the slot has no receipt), the Docket's 2+ rows and drift rows; see "Receipts and photos alignment, Build 1". **Build 2, recorded (Ray, 31 Oct 2026), now built on the branch:** (1) remove a stored receipt on Edit Coin / Edit Set, waiting for Save like everything else, with a double-check on EVERY ✕ (a shared receipt is removed from THIS coin only: only its row is blanked, other coins on the ReceiptID and the file stay); (2) a Replace of a receipt shared with other coins asks "Replace on all N coins" (the default) or "This coin only"; (3) the `_02` fix: the same bytes already in CoinReceipts with no row behind them reuse that file (no upload) and get a new ReceiptID.)* Remove a stored receipt or photo (Ray, 31 Oct 2026): not built in (x). Edit Coin and Edit Set have no way to take a stored receipt off (✕ appears only on a pending pick); photos already have ✕. Both belong to a later workbook / app alignment task for receipts and photos, which should also decide what to do about the old All.Receipt and photo columns that would show a removed file again (see (p)). Also for that task (Ray, 31 Oct 2026): the Edit Coin / Edit Set receipt slot should show "Binder (not scanned)" like the detail page does for a coin whose All.Receipt is "Binder" (18 records; the slot says "No receipt on file" today), and re-picking the same file on a coin whose receipt is only in All.Receipt makes a `_02` copy (no Receipts row claims the name).

### From BACKLOG: (aj)
- (aj) *(Closed 1 Nov 2026: estimate error, not a slowdown. The "80 min" was never a measured run; it was a projection from the first 24 suites, which happen to include several of the slowest. Measured full serial run: 15.9 min at `52a2f3c` (86 suites, median suite 3.9 s). `tests/run-all.js` now prints each suite's duration as it finishes, plus the total wall time and the slowest 5 at the end. The four suites that printed nothing when run directly (`catalog_finish_filter`, `former_holdings_purge`, `receipts_photos_alignment`, `replace_never_overwrites`) are now self-runnable: their closing line is `}, module);` like every other suite. Slowest suites for reference: `image_chooser` ~122 s, `deploy_workflow` ~96 s, `addcoin_shared_photos` ~54 s, `startup_connection` ~49 s, `build_decides_target` ~44 s. Parallel mode and speeding up individual suites were considered and not done (Ray).)*

### From BACKLOG: (al)
- (al) Write-safety branch (Ray, 4 Nov 2026; recorded only, NOT built; from the 3 Nov review and the date-branch investigation). In this order: **F6** a save refuses, naming the column, when a writable column is missing from the header row (`buildRowCellEdits` skips it silently today, `if (!idx) return`: a Copilot rename means silent data loss; same as review item 5.A); **F2** a batch that fails partway re-reads the row and the toast names the columns that did NOT land, keeping Graph's error text; **F5** split a `$batch` into chunks of at most 20 requests (Graph's limit), each chain stopping on its first failure; **F1** LastModified goes LAST in every All batch as its own range (the code comment says it is queued last, but `buildRowCellEdits` sorts by column, so any writable column right of LastModified is written after it; on _Testing only GradeNum (a formula) and Purged are right of it, at AZ). Also considered: F4 a clearer direct-save failure toast, and review item 5.B (re-read the header row before each save; `ensureAllHeaderMap` caches it for the session). Never blank a half-written row (Ray, Q5). **F8** (found 5 Nov 2026 while building the blank-cell fill; not built): the Promote refusal says "or use Mark as promoted", but the Mark as promoted card is only shown for a draft that is NOT `allRowWritten` (`coinDraftStaleOnAll`), so a Force Added draft that Re-check re-linked (flag set, listed in the Docket Staging section with Promote) has no such button; either show the card for it or word the message differently. Also not built: a leftover draft is detected only against the rows loaded at launch, so a row added later (by Copilot) is not seen until reload. Also in (al) (Ray, 4 Nov 2026, from the 3 Nov review): **5.B** re-read the header row before each save; **5.C** refuse to write a column that holds a formula, detected from the range's formulas (NOT only `calculatedColumnFormula`: see "Workbook facts from the coordinator's check"); **5.D** read All's header from the table, not A1:BZ1; **5.E** headers with spaces ("Cert Lookup Base URL", "Error Type") get no-space fallbacks in `colVal`; **5.F** Containers read by used range, not A1:B200.
  **(al) DONE: built 5 Nov 2026 on `claude/write-safety-al` (stages A, B, C; write-up: docs/ref/WRITE_LAYER.md "Write safety (al)"); Ray's TEST passed 6 Nov 2026 (steps 1-6, 8, 9; step 7 F8 not hand-tested, suite coverage accepted); merged to main by fast-forward to `9033fa5`.** Found while building, recorded here, NOT in the branch (none can lose or overwrite data today): (1) a table whose header is not on sheet row 1 is now REFUSED, not supported (supporting it would need the row math changed everywhere); (2) Photos / Receipts row rewrites (`patchRecordRow`, A..last column) are not formula-checked; neither tab has formulas today, so revisit only if Copilot adds one; (3) F8's button is on the Docket only, because Staging Review never lists `allRowWritten` drafts; (4) see (ar).
  **(al) PLAN, APPROVED 5 Nov 2026 (Ray's answers below). Scope is FROZEN to this plan:** anything new found while building or testing goes to this file, not the branch, unless it can lose or overwrite data (then stop and bring it to Ray). One HELD branch `claude/write-safety-al`, cut from main after the docs commit that recorded this plan, three stages A, B, C (each its own commits with its affected suites green), one full `npm test` as the gate at the end, one TEST pass on _Testing, NOT merged until Ray's TEST passes. Never overwrite; the shared compare (`allRowHoldsCoinDraft` / `cellsEqual`) stays as is. No seventh All writer.
  - Findings at `7c3c82c`: `buildRowCellEdits` and `readAllRowWritableValues` skip a missing column silently; `writeCoinIdCell` returns silently with no CoinID column (Promote reports success with no link); `writeNewRowKeyCells` skips a missing CollectionID; the three narrow writers skip the LastModified stamp when that column is missing; `patchRecordRow` drops Photos / Receipts values whose column is missing. Correction: Photos.OriginalFilename is NOT written blind: `writePhotoRow` checks `map.OriginalFilename` first, on purpose (the raw's name is derivable), so nothing is lost there. `ensureAllHeaderMap` reads A1:BZ1 once per session and `ensureSheetHeaderMap` A1:Z1 (a column Copilot inserts mid-session makes the cached index point at the wrong column: a wrong-cell write). `RealGraphClient.patchWorkbookRanges` sends every edit in one `$batch` (no 20 limit) and reports a failure without naming what landed; the mock applies everything. `buildRowCellEdits` sorts by column, so LastModified (AZ on _Testing) is written before Purged.
  - **Stage A, know the columns.** A1 F6: a helper names every column a write would drop; `buildRowCellEdits` refuses (code MISSING_COLUMN, nothing written) for any NON-BLANK value aimed at a missing column, and ALWAYS for Reviewed and LastModified (every save writes them); other blank values are ignored (Q1). `saveCoinRowToWorkbook` returns `{ ok:false, reason:"missing-column", columns, message }`. `writeCoinIdCell` and `writeNewRowKeyCells` throw instead of skipping; the narrow writers throw when LastModified is missing. `patchRecordRow` / `writeRecordRow` / the receipt writes refuse a non-blank value for a missing Photos / Receipts column, except `PHOTOS_OPTIONAL_COLUMNS = ["OriginalFilename"]` (Q2). A2: Promote checks `coinDraftToAllValues(draft)` against the header BEFORE `createAllSheetRow`, so a missing column refuses with no row created. A3 5.B: every write path re-reads the header once at its start (`fresh`) and uses that one map for its read, check and write; display reads keep the cache. A4 5.D: new client method `readTableHeaderRow(table)` (real: `tables('...')/headerRowRange`, values + address; mock: the grid's header row); All's header comes from the table (no BZ cap), and Photos and Receipts use the same helper (Q3). A5 5.C: `readAllRowWritableValues` reads values AND formulas in its one GET; `saveCoinRowToWorkbook` refuses (reason "formula-column") an edit whose target cell holds a formula; the narrow writers check their cell too, one extra GET each (Q4).
  - **Stage B, batches** (built F1, F5, F2: F2 needs F5's chunks and F1's "LastModified is last"). B1 F1: LastModified is its own final edit; Reviewed stays with the data (Q5). B2 F5: `patchWorkbookRanges` splits into `$batch` POSTs of at most 20 (`GRAPH_BATCH_LIMIT`), dependsOn inside each, chunks one after another, a failure stops every later chunk; the text-date check still runs over all edits first. B3 F2: a part-landed write throws PARTIAL_WRITE with the landed edits (from the per-response statuses); `saveCoinRowToWorkbook` re-reads the row (the authority; statuses are the fallback) and returns `{ ok:false, reason:"partial", landed, notLanded, freshValues, message }` keeping Graph's error text; nothing is blanked or rolled back; Browse Edit adopts `freshValues` as its snapshot (else the next Save reports a false conflict on its own columns); Promote / Mark as promoted show the same message and the draft stays open. F4 is NOT in this branch (Q6): see (aq).
  - **Stage C, small.** C1 F8: a Staging row (Docket and Staging Review) for an `allRowWritten` draft listed with Promote also shows "Mark as promoted", calling the unchanged `markCoinDraftAlreadyPromoted` (Q7); `coinDraftStaleOnAll` unchanged. C2 5.E: no-space fallbacks in `colVal` reads ("CertLookupBaseURL", "ErrorType", "FullName"); `buildLookupErrorList` accepts either spelling. C3 5.F: Containers read by used range, header found by name. The launch-time-only leftover detection stays a note (Q8).
  - **Tests:** new suite `tests/verify_write_safety_al.js` (shared check helper, must-fail self-check). A negative control per fix, run against main's `app.html`, with the failing counts recorded in the write-up: F6 (renamed Grade; no CoinID column; no Finish column at Promote, no row created; Photos without Label; positive: Photos without OriginalFilename still saves), 5.B (a column inserted mid-session), 5.D (a writable column past BZ; a header under a title row), 5.C (Value a formula on the row), F1 (Remarks right of LastModified), F5 (real client, 25 edits, Graph-like 400 above 20; a chunk-1 failure sends no chunk 2), F2 (request 2 of 4 fails: columns named, Graph text kept, LastModified not stamped, no self-conflict on the next Save), F8, 5.E, 5.F. A test mock lacking a writable column is fixed only where genuinely incomplete, never by weakening an assertion; listed in the report.
  - **Ray's answers (5 Nov 2026):** Q1 refuse non-blank values to a missing column, and always Reviewed and LastModified; ignore other blanks. Q2 keep OriginalFilename as a declared optional column; correct the CLAUDE.md note that called it F6. Q3 yes, same header helper for Photos and Receipts. Q4 yes, formula check on the narrow writers too. Q5 no, only LastModified moves to the end. Q6 F4 not in this branch: its own backlog item (aq). Q7 show the Mark as promoted button. Q8 leave it as a note. Q9 one held branch, three stages, one TEST pass. Q10 yes, this record.

### From BACKLOG: (ar)
- (ar) **DONE: MERGED 7 Nov 2026** by fast-forward of `claude/finish-list-ar` (last code commit `632f8e0`) after Ray's TEST on PC passed (results in the checklist and docs/HISTORY.md); LIVE step 8 PASSED (Ray, 7 Nov 2026, LIVE = `2b4920f`): no TEST bar, "Data: read from the workbook", About 12 of 12, the Finish list has Diamond Field and no Various, Build line `2b4920f`. Built 7 Nov 2026 (checklist docs/FINISH_LIST_AR_LIVE_RUN_CHECKLIST.md; write-up docs/ref/ADD_COIN.md "Finish list from Lookup_Finishes (ar)"; log docs/HISTORY.md).** Lookup_Finishes is the 12th launch sheet; the list is its column A in sheet order (no blank, no "═", no repeat, never "Various"); fallback `FINISH_FALLBACK_LIST` = the old 12 plus Diamond Field; saved-copy format 2. Ray's answers 7 Nov: Q1 project copy A2-A12 = the old dropdown's spelling, A13 Various (exclude by exact name), A14 Matte, A15 Diamond Field (Copilot read-only check of LIVE (7 Nov 2026, nothing changed): Lookup_Finishes A2:A12 match FINISH_FALLBACK_LIST values 1-10 and 12 exactly (order differs), A13 Various, A14 Matte, A15 Diamond Field; no spacing, NBSP, apostrophe or divider issues; every non-blank DB_Coins.Finish and All.Finish value matches the sheet exactly; All has 6 "Various" rows (set-level)); Q2 Ray refreshes _Testing from LIVE before TEST; Q3 Diamond Field grade prefix stays MS; Q4-Q7 as recommended (Special pill, format 2, note, trim only); Q8 held for TEST; Q9 DB_Coins / DB_Sets rows are Copilot's, not this branch. Original text: The Add Coin Finish dropdown (`#finish`) was a fixed list in `app.html`; the app never reads Lookup_Finishes (found 5 Nov 2026 answering Ray's question during (al)). The Finish gate (`coinDraftPromoteGaps`, `addCoinDirectSaveGaps`) checks only that a Finish is present, not that it is in Lookup_Finishes. "Use <Finish> (from the catalog)" appears only when the single catalog row's Finish matches a dropdown option (`addCoinCatalogFinish`, `normField`). "Matte" (added to Lookup_Finishes A14 by Copilot, 4 Nov) IS a dropdown option, and a probe confirmed "Use Matte (from the catalog)" shows and makes Save to Database available. A future Lookup_Finishes value not in the list gets no button (the gate message still names it; Save to Staging works) until the list is changed in code. Pairs with (f). **7 Nov 2026: picked up as the next task (ParkingLot 304).** Lookup_Finishes now has Matte (A14) and Diamond Field (A15); Diamond Field is for the 2026-P Diamond Field Morgan and Peace set; no deadline (Ray, 7 Nov: it is entered when the coins arrive). Plan sent 7 Nov (read Lookup_Finishes as the 12th launch sheet, fallback = today's list plus Diamond Field); planned branch `claude/finish-list-ar`.

### From BACKLOG: (am)
- (am) **FIRST task of the next session (Ray, 4 Nov 2026):** slim CLAUDE.md (review 4.1, 4.2) to under about 40 KB, moving build history into docs/ref/*.md and docs/HISTORY.md with pointers, fixing stale text, plus 4.3 a short docs/CODEMAP.md (function -> line range by area). One docs-only commit to main; PLAN FIRST for Ray's approval.

### From BACKLOG: (an)
- (an) Test-speed branch, small (Ray): 3.1 a name filter for `npm test`, 3.2 an app "ready" flag instead of openApp's 600 ms wait and `waitForFunction` instead of fixed sleeps in the slowest suites, 3.3 one Chromium per run with a context per suite, 3.5 deploy-workflow loads the page once. Parallel runs (3.4): not now.
  **(an) DONE: MERGED 6 Nov 2026 by fast-forward to `1eefde8` (last code commit `938f30f`) after Ray's one-minute check on a TEST build passed (splash gave way to the Dashboard, the Docket badge filled in). Ray's merge answers: keep the staging-replace-keeps-old `finishCrop` change (Q1), merge by fast-forward (Q2), Ray deletes `claude/test-speed-an`, `claude/write-safety-al` and `ccr-08b7397e-dv1kxb` himself (Q3).** Plan, APPROVED by Ray 6 Nov 2026 (answers Q1-Q8 below). Scope was FROZEN to Parts 1, 2 and 4, plus D9 and the two flaky checks; anything else found is below. Measured at app.html `b0e02d6` code: full `npm test` 957 s (15.9 min), 4804 / 0 / 0, 92 suites; the per-suite counts of that run are the comparison baseline (a sorted `name: N passed, M failed` list, diffed after every part). 53 suites under 5 s total 125 s; 22 suites of 5-15 s total 188 s; 17 suites of 15 s or more total 644 s. Slowest: image-chooser 121.7 s, deploy-workflow 103.3 s, addcoin-shared-photos 53.7, startup-connection 49.1, build-decides-target 44.8, photos-wait-for-save 39.9, album-book-flip 34.2. Fixed costs: Chromium launch + close 0.2 s per suite; `openApp` runs 191 times per full run and always waits 600 ms.
  - FINDINGS: (1) deploy-workflow: 89.5 s of its 103 s is ONE line, check D9, which calls `appSrc.split("\n")` inside a `.filter` callback (quadratic over 36,634 lines); hoisting the split gives the same result in 7 ms. (2) image-chooser: 70.5 s of its 122 s is `finishCrop` waiting 1,500 ms for the photo adjuster to open, 46 times, when the pick is not a flip source (it never opens). The app decides synchronously: `runCropPipeline`'s `onComplete` runs in the same task as `closeBgCrop()` and calls `openPhotoAdjust` (which un-hides the overlay at once) only when `def.flipSource`; so "crop overlay hidden" already tells the test which case it is. The same wait is in addcoin-shared-photos, guided-crop, save-only-when-changed, staging-edit-photos and staging-replace-keeps-old. (3) The ready flag: in the test browser (file://, offline) every startup promise has settled before the load event, so the 600 ms wait is dead time; prototyped OUTSIDE the repo: full run 861 s (-96 s), 191 openApp calls, 0 ready timeouts, every suite's counts identical to the baseline. (4) The two flaky suites fail on fixed in-page polling budgets (crop overlay 2 s, second crop stage 600 ms, `settle` 3 s), not on startup; the ready flag does not fix them.
  - PART 3 DROPPED (Ray, Q7): one shared Chromium. Reason: it saves only about 18 s of 957 s (launch + close is 0.2 s per suite, 92 suites), and `browser.newPage()` already gives every page its own context, so there is no isolation gain either. Not built; no env switch. Revisit only if the suite count grows a lot.
  - PARTS BUILT: 1 `npm test -- <name...>` filter (+ `--list`; matches a substring of the file name without `verify_` / `.js`, or of the suite name; several arguments mean "any"; a filtered run says it is not a baseline; no match = non-zero exit; no new suite, proved by pasted output, Q5, Q6); 2 app `window.__appReady` (set only after ALL startup promises launched in INIT have settled, a rejection included: each is wrapped so it signals when settled and rethrows, so the unhandled rejection still shows as a page error, and the flag waits on `Promise.allSettled`, never on the first rejection; read by nothing in the app) and `openApp` waits for it (10 s ceiling, a miss is a recorded failure), the Stage 2 wait replaced by "crop overlay hidden, then look" in all 6 suites (Q4), the two flaky checks wait on their condition with a 10 s ceiling, assertions unchanged (Q3); 4 deploy-workflow AND build-decides-target serve the page with one load instead of two (Q2), plus the D9 hoist (Q1). Proof: per-suite counts diffed against the baseline after each part (every line equal, 4804 / 0 / 0 / 92), a diff audit that no `check(` / `ok(` line changed, E4 negative controls for the comparison and for the ready flag (one startup promise rejects early while another is pending: the flag stays unset until the pending one settles).
  - **(an) BUILT 6 Nov 2026 on `claude/test-speed-an`, then merged (see above); on LIVE in `8622d7d` (Ray deployed main, 6 Nov).** Commits: Part 1 `6deadcd`, Part 2 `1a6f5e1` + follow-ups `926f77d` and `938f30f`, Part 4 `e94d3bb`, write-up `61547c8` and the closing docs commit. Gate: full `npm test` on `938f30f` 640 s (10.7 min) against 957 s before; 4804 passed, 0 failed, 0 page errors, 92 suites, and all 92 per-suite lines identical to the baseline (also identical after Part 1: 972 s under load, and after Part 2: 783 s). Biggest changes: deploy-workflow 103 s to 5 s, image-chooser 122 s to 47 s, build-decides-target 45 s to 15 s, staging-replace-keeps-old 24 s to 9 s (see below). Negative controls: the comparison catches a removed check, a new failure and a missing suite; the ready flag stays unset while a startup promise is pending after another rejected early, the rejection still reaches the page, and a naive `Promise.all(...).finally` variant is caught (`node tests/controls/ready_flag_control.js`, not part of `npm test`). Diff audit: every `check(` / `ok(` call site count is unchanged in all 11 edited suites; the only assertion line touched is D9 (the split hoist). Write-up: docs/ref/PLATFORM.md "Test speed (an)".
  - Found while building, one more wait of the same kind fixed: staging-replace-keeps-old `finishCrop` waited for a new-photo count that never grows on a Replace (4 s, then 10 s after the ceiling was raised); it now answers at once when the last overlay is hidden (the entry is placed in that same task).
  - ONE-MINUTE CHECK FOR RAY (branch deployed to TEST): open the TEST build, sign in, and confirm the splash gives way to the Dashboard and the Docket badge fills in as usual. PASSED (Ray, 6 Nov 2026).

### From BACKLOG: (ao)
- (ao) eTag-checked device cache for the workbook reads (review 1.3) and an offline read-only view (6.10). **DONE: MERGED 7 Nov 2026** by fast-forward of `claude/device-cache-ao` (last code commit `406fed8`) after Ray's TEST round 2 on `24bc862` passed every pre-merge step (6, 7, 7b, 8, 10; results and the two-stage Excel save in docs/HISTORY.md "Device cache (ao): build log"). On LIVE in `d0a69b2` (7 Nov 2026); step 12 (first LIVE launch) PASSED on the tablet. The plan and its rounds below are kept as the record.
  - **PLAN (6 Nov 2026). Ray's answers (6 Nov 2026): every recommendation Q1-Q16 accepted, Q16 wording approved as written. Q15 addition: Stage 1 is a STOP-OR-CONTINUE point: Ray runs TEST checklist steps 1-3 and reports the numbers, then decides whether Stages 2-3 are built (if the full 11-sheet read is already fast on the S25 the device cache may not be worth it, and only the offline read-only view would justify continuing). Do NOT start Stage 2 until Ray says so. Branch `claude/device-cache-ao`; never push the ccr- session branch again (Ray).** Scope frozen to the cache and the offline read-only view; anything else found goes to its own backlog letter ((as)-(av) below).
  - **Today's load (measured from the code; sizes estimated, timings never measured).** At launch `ensureLiveNavDataFetch()` sends 11 parallel `usedRange(valuesOnly=true)?$select=values` GETs through `fetchWorkbookSheetRows()`: core All, DB_Sets, DB_Coins, Lookup_MetalContent, Lookup_Graders (all five or nothing); optional Photos, Receipts, Albums, Wishlist, Lookup_Errors, Lookup_Categories (refetched in the background if missing). Also at launch, NOT workbook: docket.json, Staging folder listings (badges, draft cache, promoted-draft file moves). Later and lazy: Ref_SpotPrices (Ledger), image blobs, and the write layer's own fresh reads. Each read has a 12 s deadline, the splash waits up to 25 s. Size estimate: All's table is about 1,555 rows x 52 columns (a large part blank table rows), DB_Coins about 3,760 rows, Albums 419+ rows, the rest small: about 250k cells, roughly 2-4 MB of JSON before gzip. Per-sheet time and bytes are not recorded anywhere today (`liveNavDataDiagnostics` keeps kind and rowCount only): Stage 1 measures them. The version check is one OneDrive item GET (not the Excel service), so a match skips the Excel service entirely.
  - **What is cached, where.** The raw `values` arrays of those 11 sheets (header row included), in ONE IndexedDB record per target, written in one transaction: { formatVersion, target, workbookPath, driveItemId, eTag, cTag, size, lastModifiedDateTime, savedAt, buildCommit, accountId, sheets }. Database name per target: `salty-cabinet-cache-copy` / `salty-cabinet-cache-live`. Saved only after a full read in which all 11 came back AND the version read before the sheets equals the version read after them. Not cached: docket.json, Staging, Ref_SpotPrices (Q7), images. Estimated 2-4 MB on the S25 (quota is far larger; eviction or "clear browsing data" just means one normal load). Refactor: `fetchWorkbookSheetRows()` stays a pure network read returning values too; the processing in `ensureLiveNavDataFetch()` moves into one `applyLiveNavSheets()` used by both the network path and the cache path, so a cached load runs the same mapping and joins.
  - **Version check.** GET `/me/drive/root:/{writePaths().workbook}?$select=id,eTag,cTag,size,lastModifiedDateTime` (new read-only `fetchWorkbookVersion()`, 12 s deadline, token from `getLiveNavToken()`). A match needs id, eTag, cTag and size all equal AND lastModifiedDateTime older than 10 minutes (Q4: a workbook edited in the last 10 minutes is always fully read). When: at launch (the splash waits up to 3 s for it, Q6); on every resume (`visibilitychange` to visible, at most once per 60 s); on the `online` event; every 30 s while read-only; on "Refresh from workbook". Match: the session is VERIFIED, the 11 reads are skipped. Mismatch: the saved copy stays on screen read-only with "updating from the workbook…" while a full read runs (Q5); when it lands the data is replaced wholesale (`rerenderViewsAfterLiveNavData()`, which already skips an open album book), the cache is rewritten, the session is VERIFIED. Failure (offline, timeout, HTTP error): read-only, retried as above.
  - **Writes (new invariant 17, the cache is display-only).** The cache is read in exactly one place (launch: `loadWorkbookCache()` -> `applyLiveNavSheets()`). Nothing in the write layer ever reads it: not `readAllRowForWrite`, `findAllSheetRowNumber`, `ensureAllHeaderMap` / `ensureSheetHeaderMap` (`readTableHeaderRow`), `loadBrowseEditSnapshot`, `readAllRowWritableValues`, ID minting, the conflict check, the spot-price update read, or any `graph()` read; those stay fresh workbook reads exactly as (al) requires. No write starts unless the session is VERIFIED (a version match or a full fresh read this session): one gate wraps the mutating methods of whatever `graph()` returns (`putContent`, `deleteItem`, `patchWorkbookRanges`, `addTableRow`; mock and real alike) and throws a `ReadOnlyError` naming the reason; a test lists every client method and fails if a method that is not a get / read / list is missing from the gated set. Any workbook write deletes the cache record BEFORE its first request (so a crash mid-write leaves no saved copy). Honest limit: cached data can still reach the in-memory LIVE_* arrays that some write DECISIONS read today (the CoinID matcher's catalog, leftover-draft detection, Set chips), but only after the version check says they equal the workbook, i.e. as fresh as today's launch read; never a write's row values, baseline, header map, row number or id. Q3 offers the stricter option.
  - **Stale data and freshness display.** States: VERIFIED, CHECKING, UPDATING, READ-ONLY (offline / OneDrive unreachable). Nothing extra on screen when VERIFIED (Q13). Otherwise a row in the existing top strip (same mechanism as the TEST bar and the newer-build row, `--top-strip-h`): "Saved copy from Thu 6 Nov, 14:32 · checking with the workbook…" (only if the check takes over 1.5 s), "… · updating from the workbook…", "Offline · read-only · saved copy from …", "Can't reach OneDrive · read-only · saved copy from … · Retry". A line under the Build line at the bottom of the Docket: "Data: checked with the workbook 14:32 (saved copy matched)" / "Data: read from the workbook 14:32" / "Data: saved copy from … · not checked", with "Refresh from workbook". Mid-session Copilot / Excel change: found at the next resume or online check; background full read, data replaced, toast "Updated from the workbook"; an open edit form is never redrawn (its Save's conflict check already blocks on any difference).
  - **Offline read-only view.** Shows everything built from the 11 sheets: Dashboard, Browse (Coins, Sets, Rolls, details, specs), Albums (no images), Former Holdings, Ledger / Stats (no spot prices, Q7), Wishlist. Not available: photos, receipts and reference images (not cached; (as)), Docket ("?" as today), Staging Review. Every write is REFUSED by the gate above (the guarantee), and the entry buttons (Add Coin, Edit, Add Set, Promote, Re-check / Force Add / Dismiss, Purge, Status / Sell, spot-price update, Manage Photos, Batch Receipt, photo and receipt pickers) show disabled with a tap toast "Read-only while offline" (the courtesy). A form already open when the connection drops stays open with everything kept; Save says "Offline: nothing was saved. Your changes are still on this screen; Save again when back online." The startup draft file moves wait until VERIFIED. MSAL must never redirect to sign-in while offline: today 3 silent failures escalate to `acquireTokenRedirect`, which would replace the offline view with the browser's offline page; the escalation is skipped while `navigator.onLine` is false or the error is MSAL's network error. Back online: the check runs; match or full read, then the row goes, writes are enabled, toast "Back online · data is current" / "… · updated from the workbook". LIMIT (Q1): no service worker, so a cold launch with no network gets the browser's offline page; this view covers the app already open, a warm resume, and a launch where the page loads but OneDrive can't be reached. The existing `liveDataMode()` "offline" (the demo mockup) is unrelated; the new state never shows demo data.
  - **Clearing.** No account at launch, or a different account than the record's: delete every cache database (the app has no sign-out button; Q10). The other target's database is deleted at launch, and the record's target, workbookPath and driveItemId must match or it is deleted (TEST and LIVE share the salty224.github.io origin, so this matters). A different buildCommit or formatVersion deletes it (Q9). A workbook header or schema change is a content change, so the version mismatches and everything is re-read; the mapping always runs on the raw values, so a renamed header can never be mis-mapped from the cache. A corrupt or unreadable record is deleted. IndexedDB open has a 1.5 s deadline; any IndexedDB failure means "no cache", exactly today's behaviour.
  - **Risks and how each is prevented.** R1 stale data shown as current: never presented as current until VERIFIED; the top row labels it; version read before AND after a full read; the 10-minute rule; resume / online checks; Stage 1 probe (R8). R2 a write from cached data: the gate, the fresh write-layer reads, invariant 17, the poisoned-cache tests. R3 TEST / LIVE mixing: separate database names, record checks, the other target deleted. R4 another account: accountId check. R5 code or format change: buildCommit + formatVersion. R6 half-saved cache: one record, one transaction, saved only after a complete read. R7 IndexedDB missing, hanging, evicted, full: deadline, failure = today's behaviour. R8 the version lags the content (Excel for the web or Copilot co-authoring flushes later; the app's own Graph writes): measured by the Stage 1 probe; the 10-minute rule; record deleted at write start; Q3 option B if the probe is bad. R9 an offline sign-in redirect wipes the view: no redirect while offline. R10 a background refresh redraws under the user: reuses the existing redraw that skips an open book; a test keeps a dirty edit form untouched. R11 Chrome on the S25 storage (Ray uses Chrome, corrected 7 Nov 2026; does the installed app share the browser's storage? eviction?): unverified, harmless either way. R12 privacy: the data is the same the screen shows, stays on the phone, wiped on an account change; nothing goes in the repo.
  - **Tests.** New suite `tests/verify_device_cache_ao.js` (shared check helper, must-fail self-check). Mock: the fake `window.fetch` of `verify_startup_connection.js` gains a "version" route (the item GET) returning a test-set {id, eTag, cTag, size, lastModifiedDateTime} and an "offline" mode that throws `TypeError("Failed to fetch")` and fires the window `offline` event; `createMockGraphClient()` gains a version that every `patchWorkbookRanges` / `addTableRow` on the workbook bumps, with a seedable lag (`_flushVersion()`); one block uses Playwright's real `context.setOffline(true)`. Test seams for the account id and the target. Checks that FAIL on current main: seeded cache + hanging sheet reads still paints the coins; a version match sends 0 usedRange requests (main: 11); a mismatch re-reads and rewrites the record; every gated method throws while not VERIFIED and the mock grid is untouched; poisoned cache (cache Year 1909, grid 1910; a column inserted in the grid only): the Edit snapshot, the conflict check and the header map all follow the grid and the write lands in the right column; a "live" record is never shown by a copy build; wrong account, build or format deletes it; version changed during the full read saves nothing; a workbook write deletes the record before its first PATCH (also when the write fails); offline: banner text, entry buttons disabled, Save refused with no request sent, form kept; online again: banner gone, Save works; no MSAL redirect while offline after 3 network failures; IndexedDB throwing or hanging: startup exactly as today; a workbook modified 5 minutes ago is fully read despite a match. Hand-run mutation controls `node tests/controls/device_cache_control.js` (like `ready_flag_control.js`): gate removed, cache feeding the header map, version read only after the sheets, other-target deletion removed; each must turn a named check red. Existing suites that cover parts and must stay green (some extended): verify_startup_connection (splash, Retry, deadlines; plus cached cases), verify_splash_and_album_prefetch, verify_splash_docket_regression, verify_build_decides_target (database name follows the target), verify_graph_auth_escalation and verify_dynamic_redirect_and_live_flags (no redirect while offline), verify_write_safety_al (fresh header maps with a poisoned cache), verify_live_no_demo_data (read-only shows no demo data), verify_promote_catalog_fixes (force refresh rewrites the cache), verify_leave_guard and verify_save_only_when_changed (forms kept). Existing suites are unaffected by default: every `openApp` is a fresh context (empty IndexedDB) and MSAL never loads in the sandbox, so the cache path never runs unless a suite asks for it.
  - **Stage 1 BUILT (6 Nov 2026) on `claude/device-cache-ao`, held; waiting on Ray's TEST steps 1-3 and his stop-or-continue decision.** Write-up: docs/ref/PLATFORM.md "Device cache (ao), Stage 1". The report sits just ABOVE the Docket's Build line, not under it as planned: the Build line stays the last thing on the Docket (an existing rule, build-decides-target L3).
  - **Stage 1 RESULTS (Ray, S25 on 5G, TEST build 102 at `673fa28`, 6 Nov 2026).** Launch reads 3.5 s, 2.0 s, 2.6 s. Every sheet takes about 2-3 s whatever its size (Lookup_Graders 0.9 KB 2.7 s; DB_Coins 1.1 MB 3.1 s): the time is Graph / Excel per-request wait, not data. One launch timed out; the next attempt showed "1 failed attempt before it" (Ray has seen timeouts before on a slower connection at work). Version lookup 0.4-0.7 s. Excel for the web edit (_Testing, ParkingLot Z1): eTag, cTag, size and last changed all CHANGED before the 10 s check. App save (Edit Coin, Notes): the save took 12-15 s to confirm; all four version fields CHANGED by the 10 s check.
  - **Ray's decisions after Stage 1 (6 Nov 2026).** CONTINUE with Stages 2 and 3 as planned; Q3 is option A (a version match makes the session checked). Stage-1 Q1 moot (the load report stays as part of (ao)); Q2 yes, show it on LIVE. Additions to Stage 2 (small, diagnostic only): (1) the launch report shows each failed attempt's duration and reason (timeout / auth / HTTP status), not just a count; (2) per-step timing of the last save on the Docket report (header re-read, row lookup, conflict check, each write, LastModified) to see where the 12-15 s goes; (3) INVESTIGATE ONLY: could the 11 launch reads go as one Graph `$batch` or share one workbook session, and would that cut the 2-3 s per-request wait; findings and a recommendation in the report, anything to build goes to this file for Ray's decision. Full `npm test` after each stage, negative controls as planned, commit only on `claude/device-cache-ao`, then stop with TEST steps 4-12; held for Ray's merge go-ahead.
  - **Stages 2 and 3 BUILT (7 Nov 2026) on `claude/device-cache-ao`, held for Ray's merge go-ahead; waiting on Ray's TEST steps 4-12** (docs/DEVICE_CACHE_AO_LIVE_RUN_CHECKLIST.md). Write-up: docs/ref/PLATFORM.md "Device cache (ao), Stages 2-3" (includes the `$batch` / workbook-session findings). **Ray's answers (7 Nov 2026):** Q1 wording approved as written; Q2 CHANGED: the gate is an allow-list (checked AND online; every other state, including any added later, refuses; a test proves an unknown state refuses) — built in `9fdac27`, see PLATFORM.md; Q3, Q4, Q5 accepted; Q6 decide after Ray's Save-steps screenshot; Q7 merge by fast-forward after steps 4-12 pass, on his go-ahead. Ray uses Chrome on the S25, not Samsung Internet. Departures from the plan, for Ray (departure 1 is superseded by Q2): (1) the gate refuses writes in three states (offline, can't reach OneDrive, a saved copy not yet checked) rather than "allow only when verified": same guarantee, and a session that hasn't loaded yet (or the mockup / sandbox) writes as before; (2) a full read's version goes out WITH the sheets and is trusted only if the workbook was last changed 2+ minutes before the read (no added wait), instead of "version before and after"; (3) wording not in the approved list: the offline / unreachable rows for data read this session say "data from …" (approved text only covered "saved copy from …"); the entry toast for "can't reach OneDrive" is "Read-only: can't reach OneDrive" and for an unchecked copy "Read-only until the saved copy is checked with the workbook"; Refresh's toasts "Read from the workbook" / "Couldn't read the workbook; nothing changed on screen"; (4) photo and receipt pickers inside an open form are not blocked (they write nothing until Save, which is); (5) writes stay allowed during a mid-session background re-read of data that was read this session (only a saved copy not yet checked blocks).
  - **TEST round 1 (Ray, S25 Chrome, `000ce08`, 7 Nov 2026):** steps 4, 5 (copy matched in 1.2 s, no sheet reads), 6, 8 PASSED; step 7 found B1 (Excel content lags its version: > 40 s, < 3.5 min), step 10 / 8 found B2 (stale Details / form after a save; Save stayed lit; a second Save refused as "changed since you opened"), B3 (Last save said "done" for a refused save), B4 ("Workbook version: not checked yet" under "matched"). Ray's decisions: no "checking…" / "updating…" rows; toasts "Updated" and "Back online"; diagnostics in one collapsed Docket section "About"; Q6 = (ax), extended, on its own branch after (ao) merges. All fixed in `2772a02` (write-up PLATFORM.md "Device cache (ao): Ray's TEST round 1"); re-run steps 6, 7, 7b (new: content-lag probe), 8, 10. Open for Ray: (a) the remaining false "changed since you opened" when the SAME coin is saved twice while Excel's content changes over (safe direction, nothing written); fixing it means the conflict check accepting a difference explained only by our own recent write (changes invariant 4); (b) "Back online · updated" (toast when the re-read changed data) is an extension of his wording; (c) the risk if content lag exceeds 10 minutes (PLATFORM.md B1).
  - **Branch and stages.** `claude/device-cache-ao`, held for Ray's explicit merge go-ahead (cross-cutting). Stage 1 (read-only, deploy as TEST first, Q15): `fetchWorkbookVersion()`, per-sheet ms and bytes in `liveNavDataDiagnostics`, and on the Docket a "Last full read: 11 sheets, N MB, N s (slowest …)" line plus "Workbook version …, changed HH:MM · Check again"; nothing cached, nothing gated. Stage 2: session states, the write gate, the read-only row and buttons, no-redirect-while-offline, online / resume checks (useful even without a cache: offline mid-session today). Stage 3: the IndexedDB store, paint from cache, clearing rules, the Docket data line and Refresh. Stage 4: write-up (docs/ref/PLATFORM.md), invariant 17 in CLAUDE.md, CODEMAP, TEST checklist file. Full `npm test` after each stage.
  - **TEST checklist (phone unless marked).** Stage 1: (1) open the TEST build, Docket bottom: note the last-full-read line (size, seconds). (2) Note the workbook version time; change one _Testing cell in Excel (by hand or Copilot); tap Check again at about 10 s, 30 s, 60 s and 5 min; note when it changes. (3) Same after a Save in the app. Stages 2-3: (4) first launch: normal splash, Docket says "read from the workbook". (5) Swipe the app away, relaunch: splash goes fast, Docket says "saved copy matched". (6) Change a coin in Excel, wait 11 minutes, relaunch: the change shows, Docket says "read from the workbook". (7) App open, change a coin in Excel, leave the app for a minute, come back: toast "Updated from the workbook", value changed. (8) App open, airplane mode: amber "Offline · read-only" row; Browse and Albums text work; Edit / Add Coin show disabled with the toast; in a form opened before airplane mode, change a field and Save: refused, the change still there; airplane mode off: the row goes within about 30 s, Save works. (9) Airplane mode, swipe the app away, relaunch: the browser's offline page (expected, Q1). (10) Save a coin, relaunch: "read from the workbook" (the save cleared the saved copy). (11, desktop Chrome, optional) DevTools > Application > IndexedDB: only `salty-cabinet-cache-copy`, size. After merge and a LIVE deploy: (12) the first LIVE launch says "read from the workbook" (never TEST's copy) and has no TEST bar.
  - **Questions for Ray (recommendation in brackets).** Q1 offline means the open app, a warm resume, or OneDrive unreachable; no cold offline launch [accept; service worker to (at)]. Q2 rule change: IndexedDB allowed for a display-only, re-derivable copy (CLAUDE.md says caches are in-memory) [yes, IndexedDB only, invariant 17]. Q3 does a version match make the session VERIFIED (A: skip the reads), or always re-read in the background before writes (B) [A if the Stage 1 probe shows the version moves within about 30 s of an Excel / Copilot edit and of an app Save, else B]. Q4 a workbook modified in the last N minutes is always fully read [yes, 10 min]. Q5 on a mismatch show the saved copy read-only while updating, instead of the splash [yes]. Q6 splash waits up to 3 s for the version check [yes]. Q7 Ref_SpotPrices in the cache [no; Ledger without spot prices offline]. Q8 delete the other target's cache at launch (each TEST / LIVE switch costs one normal load) [yes]. Q9 a new build deletes the cache [yes]. Q10 no sign-out button; no account or a different account at launch wipes it [yes]. Q11 read-only blocks every Graph write (workbook, photos, receipts, Docket file, Staging, startup file moves), not only the workbook [yes]. Q12 entry buttons disabled with a toast; open forms kept, Save refused [yes]. Q13 nothing extra on screen when VERIFIED, only the Docket line [yes]. Q14 a change found mid-session updates in the background with a toast, never under an open edit form [yes]. Q15 Stage 1 deployed as TEST and measured before Stages 2-3 are built [yes]. Q16 wording of the rows, toasts and Docket line above [approve or edit].

### From BACKLOG: (ax)
- (ax) Save speed. **DONE: Stage 1 + 2a MERGED 7 Nov 2026** by fast-forward of `claude/save-speed-ax` (last code commit `db8673e`) on Ray's go-ahead (2a TEST steps 6-8 not run; covered by the suites). **2b SHELVED (Ray, 7 Nov 2026): recorded, not planned**: B1 drop Promote's look-before-lock reads and the 1.5 s wait; B2 one header read per promote; D2 skip the Reviewed range when it is already blank; D1 data ranges in parallel inside the $batch (measure); Q4-Q7 of PLAN 2. Earlier status: CHOSEN by Ray (7 Nov 2026), its own branch `claude/save-speed-ax`. PLAN written 7 Nov 2026 (below); Ray's answers 7 Nov (below); STAGE 1 BUILT 7 Nov 2026, held for Ray's TEST (docs/SAVE_SPEED_AX_LIVE_RUN_CHECKLIST.md) and merge go-ahead; write-up docs/ref/WRITE_LAYER.md "Save speed (ax), Stage 1". FIRST find the missing ~5 s in the write step (Ray, TEST round 2): Save steps showed "write (3 ranges, LastModified last): 8.0 s" while its one `$batch` POST took 2.9 s. Candidates inside that step, to time separately before changing anything: the gate wrapper's delete of the device's saved copy before every workbook write (`invalidateWorkbookCacheBeforeWrite` -> `idbCacheDelete`: an IndexedDB open and a transaction, each with a 1.5 s deadline), `getWriteToken()` (MSAL acquireTokenSilent, which can refresh the token), `assertNoTextDatesInEdits`, and reading the `$batch` response body. Then do the parallel reads.** His Save steps: each Graph call ~1.7 s, run one after another, 5.1 s before any write. Run the header re-read, the row lookup AND the conflict re-read at the same time in `saveCoinRowToWorkbook` (the row re-read currently needs the row number from the lookup and the header map for its width: read the row by a range wide enough for the table, or look the row up from a column read in parallel and re-read only if it moved; keep every check of invariants 1, 3, 4: header fresh, row by CollectionID, conflict on the fresh row, formulas detected). Expected: about 3.4 s less per save. Needs write-safety tests (the (al) suite) and a TEST measurement.
  - **Ray's answers (7 Nov 2026).** Q1 no screenshot; Stage 1 measures it. Q2 stages as in the plan. Q3 P2 with checks (i)-(iii) and the step-by-step fallback; Promote uses P1. Q4 Stage 2 decision: change the saved-copy delete only if Stage 1 shows it costs more than about 0.3 s. Q5 yes (if Q4 happens). Q6 yes, WITH A FIRST STEP: check LastModified precision and report before building Part 3 (LIVE evidence 7 Nov: 58 of 624 All rows have LastModified, 48 midnight, 10 with hh:mm and zero seconds, none with seconds; format "yyyy-mm-dd hh:mm" on 53, "yyyy-mm-dd" on 5; Copilot never writes All.LastModified, Copilot_Rules A7); if the reliable precision is coarser than one second, stop and report how the match would change and the risk left. Q7 same 10 minutes. Q8 record only ((bd)). Q9 hold the merge for Ray's go-ahead after TEST. Q10 record only ((be)). Ray deletes `claude/save-speed-plan-0lt5f5`.
  - **Stage 1 (built 7 Nov 2026):** P1 / P2 and the Save steps diagnostics; the LastModified check in About (stamp written + "Read it back"). Part 3 NOT built: waits for the TEST read-back (checklist step 2). Code finding on LastModified (for Ray): since `bfe52cc` (4 Nov; on LIVE by `8c58b00`, 5 Nov) every app stamp is `localDateTimeSerial`: the local day serial plus (h*3600 + m*60 + s) / 86400, sent as a JSON number (about 16 significant digits) with numberFormat "yyyy-mm-dd hh:mm" in the same request, through `buildRowCellEdits` (its own last range, F1). The app has never written a minutes-only value; before `bfe52cc` it wrote a whole-day serial with "yyyy-mm-dd" (the 48 midnight rows and the 5 "yyyy-mm-dd" cells). Excel keeps 15 significant digits: a 5-digit day leaves 10 decimals, about 9 microseconds, so the seconds survive storage. CORRECTED by Ray (7 Nov 2026): his LIVE check read the STORED values, and they are whole minutes (e.g. 46313.573611111111 = 13:46:00 exactly), but all 10 timed stamps are dated 18 Oct, before `bfe52cc`, written by Copilot before Copilot_Rules A7 (Copilot sometimes added a time, all zeroes); LIVE has no app stamp after 4 Nov. So they say nothing about the app's seconds; my "displayed text" guess was wrong. The TEST read-back (checklist step 2) settles it.
  - **Ray's answers to the Stage 1 report (7 Nov 2026).** Q1 yes: if the read-back keeps whole seconds, Part 3 is built in Stage 2 with whole-second matching (round(serial x 86400), never exact float equality), together with the write-step fix. Q2 yes: if seconds are lost, stop Part 3 and report; decide then. Q3 yes: the extra ~1.5 s read when the parallel read isn't used is fine. Section 6 yes: in Stage 2, the one-at-a-time row re-read also checks the row's CollectionID (with a test and a must-fail control). NEXT: Ray runs the TEST checklist (step 2 first) and sends the read-back line and the Save steps screenshots; Stage 2 waits for them.
  - **TEST round 1 of Stage 1 (Ray, S25, Build 108, `f8d231c`, 7 Nov 2026).** PASSED: step 2 LastModified keeps whole seconds (written 46333.48060185185, read 46333.4806018519, "read minus written 0 s"; text hh:mm only, the format); P2 (three reads at +0.0, no fallback line), reads 1.8-2.6 s (was ~5.5); saves 11.6 / 11.7 / 12.4 / 10.7 s (was ~13.5); write 8.4-9.8 s of which saved-copy delete 0.0, token 0.0 (from cache), text-date 0.0, no background work, longest stall 0.9 s, "$batch until the answer starts" 3.0-3.4 s and "$batch reading the answer" 5.4-6.4 s (the missing time); step 7 real conflict refused (Grade), nothing written. FAILED 1, step 6: a blank TABLE row inserted in Excel above AY-00001 (row 2) under a minute before the save; header, lookup and row read all returned the sheet as before the insert (checks i-iii agreed on stale data), the write went to sheet row 2 = the new BLANK row (Remarks test17 + LastModified 11:58:18; "row now holds" blank); AY-00001's real row 3 untouched; Ray deleted the row. FAILED 2, step 8 Promote AY-00760: header read 3x, CollectionID column 4x, one after another, first write at +16.8 s, total 24.9 s; keys written to row 626, the read-back (A626) came back empty though the keys had landed -> "reads back empty"; a retry ~3 min later adopted row 626 and filled the blanks (one complete row). That fill (LastModified 12:14:44) is missing from Save steps. _Testing leftovers (Ray cleans): AY-00002 Grade F; Remarks test13-test16 on AY-00001-00004; the AY-00760 test row.
  - **PLAN 2 (7 Nov 2026), WAITING on Ray's answers; no code.** Cause of FAILED 1 and 2 (code + Ray's evidence): for minutes after a change, Graph READS can return the workbook as it was before the change, while Graph WRITES (by sheet address) land on the workbook as it is now. Every write here is "read positions, then write by address", so a stale read can aim a write at the wrong row; checks i-iii cannot help when every read is stale together. main / LIVE has the same gap (the serial reads use the same Graph calls and the same address write; P2 neither adds nor removes it), and the same lag explains Promote's empty read-back, the false second-save refusal, and a conflict check that cannot see a Copilot edit made in the last ~2 minutes. Also exposed (from the code, not yet seen on TEST): a blank-row claim (All via `findClaimableBlankRow`, Photos / Receipts via `writeRecordRow`) made from a stale read can pick a row this session just filled. Proposed: A1 settle guard: before any workbook write (in the `graph()` gate, so no writer can skip it) the drive item's version (the cheap 0.4-0.7 s metadata GET, which moves within ~10 s of an Excel edit) is checked, started in parallel with the save's reads; if the workbook was changed in the last SETTLE window by anything other than this session's own last write (the version recorded right after each app write), nothing is written and the form stays ("Excel changed this workbook N s ago; ... try again in about M min"). A2 later: (aw) workbook-session probe on TEST, to see whether session reads see the latest state (could shorten the window). A3 no wait / retry rule (a read cannot tell it is stale). A4 remember the rows this session claimed (All, Photos, Receipts) and never claim them again from a stale read. C Promote's key read-back: Graph's 200 on the key PATCH is the proof it landed; the duplicate tripwire stays for what the read DOES show (the id at another row or at 2+ rows = refuse, as today); an empty read-back is "not visible yet", and the data save then writes to the claimed row directly (its own lookup would be stale too). Only together with A1. B Promote reads: P1 never ran (the promote failed inside `createAllSheetRow`, before `saveCoinRowToWorkbook`); header 3x = the promote's column check, `createAllSheetRow`, `writeNewRowKeyCells`; column 4x = first look, look-again after `PROMOTE_RELOOK_MS` 1.5 s, the in-lock read, the verify read; a full promote adds a 4th header, 5th column and a row read. B1 drop the two looks and the 1.5 s wait (the in-lock read already refuses / adopts through `ALL_ROW_EXISTS`; reverses Ray's 5 Nov Q4). B2 one fresh header read per promote, passed down (invariant 3 reworded to "at the start of every write operation"). D the answer read is Excel's time, not size: each range PATCH is about 3 s and the $batch chain (dependsOn) runs them one after another; Graph sends the headers after the first and the rest of the answer after the last. D2 skip the Reviewed range when the fresh read shows it already blank (one fewer Excel round, about 3 s, on most saves; Reviewed is still blank after the save, invariant 5 kept; safe only with A1). D1 data ranges without dependsOn (in parallel), LastModified depending on all of them (F1 kept; F2 then reports each range); about 3 s more only if Excel runs them in parallel: measure on TEST. E Save steps for every write: Mark as promoted (`markCoinDraftAlreadyPromoted`), Force Add, Set attach / detach (`applySetLinkageWrite`), Purge (`finalisePurgedFlag`), Docket re-check links (`applyDocketResolution`, `applyCoinDraftMatch`), spot prices; plus a net in the gate: a workbook write outside any timed save records its own entry. F Part 3 unchanged (whole seconds, the chain of own states, write set against the effective row), but applied only when A1 says nothing else changed the workbook since the app's write. Interim (no code): after any Excel / Copilot edit, wait 5 minutes before saving in the app; never insert, delete or sort All rows while the app is mid-edit.
  - **Ray's decision on PLAN 2 (7 Nov 2026).** No A1 settle guard. Instead: a Copilot_Rules line (Ray adds it): never insert, delete or sort rows inside All, Photos or Receipts, append at the bottom only; and a standing habit: wait ~5 minutes after any Excel / Copilot edit before saving in the app. A2 (session probe) stays in the backlog. Q8: Ray doesn't remember whether Excel was open in step 2. Speed (B, D, Q4-Q7) is held as 2b until 2a passes TEST. Re-check without A1 (answered 7 Nov): C as planned is NOT safe without A1 (an empty read-back carries no information either way, and C would add the data write to a row that might be wrong), so it becomes C': after a confirmed key write whose read-back is empty, nothing more is written, the message says the keys are on row N and Excel hasn't shown them yet, Promote again in a couple of minutes (the existing adopt path finishes it, as in Ray's retry); D2 is OK without A1 with one mild risk (a Reviewed tick made in Excel during the lag stays set), held for 2b anyway; Part 3 is safe without A1 (it only accepts a read that is exactly one of the app's own recorded row states, LastModified to the second; it creates no new blind spot, the conflict check's existing blindness during the lag is unchanged); a Copilot append and an app blank-row claim CAN collide within the lag (Copilot fills the first blank row at the bottom of the table, the same row the app claims, and a stale read shows it blank), A4 does not cover that (it only knows this session's own claims), the 5-minute habit does; a code guard would be a version check on the claim step only (Promote, Force Add, new Photos / Receipts rows): recorded, not planned.
  - **2a, revised (7 Nov 2026), waiting on Ray's go-ahead:** (1) A4: rows claimed this session (All, Photos, Receipts) are never claimed again; (2) the CollectionID check on the one-at-a-time row re-read; (3) C': the honest Promote read-back message, nothing written after it, the claimed row added to A4; (4) E (cheap): a Save steps entry for Mark as promoted, and a catch-all entry for any workbook write outside a timed save; (5) Part 3 if Ray agrees (recommended in 2a: a correctness fix, safe without A1). Each with a test and a must-fail control; full `npm test`; TEST round; merge held.
  - **2a BUILT (7 Nov 2026), Ray's go-ahead (Q1 Part 3 in 2a, Q2 yes); held for TEST (docs/SAVE_SPEED_AX_LIVE_RUN_CHECKLIST.md "2a") and merge go-ahead.** A4 claimed rows (All, Photos, Receipts; a row the session blanked itself returns to the pool), C' honest Promote read-back + no second row on a retry while the keys are still invisible, the CollectionID check on the one-at-a-time re-read, Part 3 (own row states, LastModified to the second), E (Mark as promoted timed; "Write outside a timed save" catch-all). Write-up docs/ref/WRITE_LAYER.md "Save speed (ax), 2a". Found while building: with A4 alone, a Promote retry during the delay would have claimed a SECOND row (a duplicate); the "keys not visible yet" memory refuses instead (test C2).
  - **PLAN (7 Nov 2026), WAITING on Ray's answers Q1-Q10; no code until then. Scope frozen to the three items below.** Read from the code at `2b4920f` (app.html unchanged since `c520e3d`).
  - **1. The missing ~5 s inside "write".** The step (`timeSaveStep("write …")` in `saveCoinRowToWorkbook`) wraps `graph().patchWorkbookRanges`, i.e. the gate wrapper (`gatedGraphClient`): `workbookWritesAllowed()` (synchronous), then `invalidateWorkbookCacheBeforeWrite()` -> `deleteWorkbookCacheForWrite()` -> `idbCacheDelete()` (an IndexedDB open with a 1.5 s deadline, then a readwrite transaction with another 1.5 s deadline: at most about 3.0 s; a cache put still running on the same store makes the delete wait for it), and only THEN the timed Graph call `RealGraphClient.patchWorkbookRanges`: `assertNoTextDatesInEdits` (three edits, microseconds; ruled out by reading), `getWriteToken()` -> `acquireGraphToken()` (MSAL `acquireTokenSilent`; a cache hit is milliseconds; it can wait on another caller's in-flight request; a refresh is unlikely here because the three reads just before it each got a token), the `$batch` fetch (the "$batch 1 of 1" line, 2.9 s, ends when the response HEADERS arrive), then `res.json()` (the body, NOT inside the 2.9 s). A fifth candidate not in the notes: the main thread busy during the save (a background re-read finishing: parsing 12 sheets, DB_Coins about 1.1 MB, and hashing every cell for `dataFingerprints`; or a saved-copy put), which delays every await. 5.1 s is more than the delete's two deadlines allow, so at least about 2 s is elsewhere. The Save steps list already has a "Graph patchWorkbookRanges … 3 ranges" line: its start offset minus the "write" start is the IndexedDB time, and its length minus 2.9 s is token + body read.
    - Measure (diagnostic only, Stage 1, About > Save steps): "saved copy delete: open N s, delete N s, result (deleted / nothing there / open timed out / delete timed out / not used)"; "token: N s (from cache / refreshed / waited for another request)" (MSAL `fromCache`; `graphTokenInFlight` already set when asked); "text-date check: N ms"; "$batch 1 of 1: headers N s, body N s"; "main thread: longest stall N s" (a 100 ms heartbeat's drift, plus Chrome's long-task observer where available) and "background work during the save: full re-read / saved-copy put / none". Ray's TEST: three Edit Coin saves (first save after a fresh launch; a second coin a minute later; a save after leaving the app 5+ minutes and coming back), a screenshot of Save steps after each.
    - Likely fixes, chosen from the numbers (Stage 2): F1 the delete (a) only when a copy may exist: an in-memory `savedCopyMayExist`, true at launch and whenever a put starts, false after a confirmed delete or an empty get; (b) started at the start of the save, alongside the reads, and awaited just before the first write request (the write still never starts before it has finished or timed out). Saves 0 to about 3 s per save. F2 token: only if measured (one token taken at the start of the save, in parallel with the reads); 0 to about 1 s. F3 body read: Graph's own wait; shown inside the $batch line, nothing to fix. F4 main thread: if a stall shows, background re-reads and saved-copy puts wait while a save runs (`activeSaveTiming` / the edit-save lock) and start after it; up to the stall.
  - **2. The three pre-write reads in parallel.** Dependencies today: the header re-read (`readTableHeaderRow`) needs nothing; the row lookup (`findAllSheetRowNumber` -> `readTableColumn` by table and column NAME) needs nothing, not even the header map; the row re-read (`readAllRowForWrite`: one range "A{row}:{last}{row}" with values and formulas) needs the row number AND the header map (its width and which cells are which). P1: header re-read and row lookup at the same time, then the row re-read: nothing weakened (both are fresh Graph reads made by this save); about 1.9 s saved. P2: all three at the same time, for Edit Coin (the only caller with a form snapshot): the row is read speculatively at the row number Edit Coin's snapshot was read from (kept in `browseEditSnapshot` at open; that number came from a Graph lookup, never from the saved copy or the loaded list, invariant 17) over the table's width from the previous header map; then, before anything is compared, three confirmations: (i) the fresh lookup returns the same row, (ii) every column the save needs lies inside the range read according to the FRESH header, (iii) NEW: the row's CollectionID cell (at the fresh header's position) is this coin's id. Any confirmation failing = the row is re-read serially as today (one extra read, about 1.5 s, only when the row moved or a column was added past the range). About 3.4 s saved (5.5 s -> about 2.1 s). Invariants kept: 1 (allow-list and formula check from the same read), 3 (header re-read fresh at this save, row resolved by CollectionID fresh, nothing remembered is trusted without a fresh confirmation), 4 (the conflict compares against a row read during this save), 17 (all three are Graph reads through `graph()`; the saved copy is never read; the write gate is still asked at the write; no write starts earlier than today). Not weaker than today: the three serial reads were never atomic either (a Copilot change between them is the same race), and (iii) checks something today's row read never checks. Promote (`saveCoinRowToWorkbook(id, values, null / held.fresh)`) has no form row number: P1 only. Not in scope: the narrow writers (`writeCoinIdCell` after a re-link does its own header re-read, formula read and write: three more serial requests on an identity edit).
  - **3. The false second-save refusal (round 1 Q1).** Cause, from the code: after a successful save Edit Coin re-baselines on the row as written (`browseEditSnapshot = { values: result.values }`), and a read in the next ~2 minutes can still return the row as it was BEFORE that save (content lag, B1 / B2). (A) Form left open, Save again: baseline = written row, fresh re-read = old row -> every field the first save changed "differs" -> refused. (B) Form re-opened during the lag: baseline = the old row (the display shows the written values through `withRecentWrites`, the baseline deliberately not), Save after the lag ends: fresh = written row -> refused. Nothing is written either way. Fix: recognise a read that is exactly the app's own recent save, before or after it landed, by LastModified: every app save stamps LastModified (to the second, last); Excel and Copilot edits never change it. Keep, per CollectionID for 10 minutes, the chain of row states the app wrote (each save's written columns with its LastModified stamp, plus the row before the first one). (A) fresh equals an earlier state of the chain in EVERY column the chain wrote, LastModified included -> compare the baseline against "fresh with the latest written values applied". (B) the baseline equals an earlier state AND fresh equals the latest state (LastModified = our stamp) -> compare "baseline with the latest written values applied" against fresh. Anything else (a third value in any written column, or a LastModified that is neither ours nor the one before) is a real difference -> refused as today, so a Copilot edit during the 10 minutes is still caught (its LastModified stays ours, but its value is a third one or the row is no longer exactly a chain state). The write set is computed against the effective row (fresh with our values applied), so a field set back to its old value while the read lags is still written (without that, the revert would be skipped and lost silently: tested). Residual: somebody restoring every written value AND typing back the old LastModified within 10 minutes. Changes invariant 4's wording: "any difference blocks, except a read that is exactly this app's own save of the last 10 minutes (recognised by LastModified)". Check on TEST: the LastModified serial reads back equal (float round trip); else compare to within one second.
  - **Save to Staging: not the same gaps.** `completeAddCoinSaveUntimed`: `reserveNextCollectionId()` = the All CollectionID column read and the Staging folder listing, ALREADY in parallel (the 2.6 s is the slower of the two); then coin.json PUT (this first write claims the folder name, so it must come first), each photo PUT one after another (cropped, then raw), the receipt, and coin.json again. No header / row / conflict reads; no IndexedDB delete (only workbook writes delete the saved copy). The reservation read must stay fresh (never the saved copy or the loaded list). Possible later gain, NOT in (ax): photo uploads in parallel (each has its own name and NO_OVERWRITE).
  - **Expected:** Edit Coin save today about 13.5 s (reads 5.5 s + write 8.0 s). P2: -3.4 s. Write step: -up to 5.1 s if Stage 1 finds all of it (the delete alone is at most about 3 s). Best case about 5 s. Part 3 saves no time; it removes a false refusal.
  - **Stages and merge class.** Branch `claude/save-speed-ax`. Stage 1: the Save steps sub-timings + P2 + the second-save fix (none of these depends on the numbers), full `npm test`, TEST build for Ray. Stage 2: the write-step fix chosen from Stage 1's numbers, full `npm test`, TEST again. Held for Ray's merge go-ahead (write layer; invariants 4 and 17 reworded).
  - **Tests (new suite `tests/verify_save_speed_ax.js`, shared check helper, must-fail self-check; a mock Graph client with per-call delays and a start / end log).** S1 the header read, the lookup and the row read start before any of them ends; read phase under 1.5x one read. S2 the row moved (lookup != snapshot row): the row is re-read at the new row, compared and written there (control: confirmation (i) removed -> wrong row written, red). S3 a column added past the range read: serial re-read, write in the right column (control: (ii) removed -> red). S4 the speculative row's CollectionID is another coin's: re-read (control: (iii) removed -> red). S5 the (al) write-safety suites unchanged and green (header not on row 1, missing column, formula cell all refused). S6 Promote (no snapshot) uses P1 and writes correctly. S7 the write never starts before the saved-copy delete has finished (mock IndexedDB with a delay; control: not awaited -> red); session-gate-ao and device-cache-ao suites unchanged and green. S8 after a confirmed delete the next save makes no IndexedDB call; after a put, the next save deletes again (control: flag never reset -> red). R1 (A) two saves on an open form with a lagging mock: the second lands (red on main). R2 (B) re-opened during the lag, saved after it: lands (red on main). R3 a Copilot change to another field in the window: refused. R4 a Copilot change of a field the app wrote, back to its old value: refused. R5 the user's revert while the read lags is written (control: write set computed against the raw read -> red). R6 after 10 minutes: refused as today. Controls for part 3: rule off -> R1, R2 red; LastModified ignored -> R3 / R4 red. T1 the new Save steps lines appear with numbers (control: instrumentation removed -> red). Full `npm test` compared with the 4961 baseline by sorted PASS / FAIL lines.
  - **Questions for Ray (recommendation in brackets).** Q1 do you still have the TEST round 2 Save steps screenshot? Its "Graph patchWorkbookRanges" line splits the 5.1 s into IndexedDB vs the rest today [send it if you have it; Stage 1 measures anyway]. Q2 stages as above (Stage 1 = diagnostics + parallel reads + second-save fix, one TEST round; Stage 2 = the write-step fix from the numbers), or strictly your order (measure only first) [as above: one TEST round fewer, and P2 and part 3 do not depend on the numbers]. Q3 P2 (all three reads at once, with the three confirmations and a serial fallback; about 3.4 s) or P1 (header + lookup only; about 1.9 s; simplest) [P2]. Q4 the saved-copy delete: skip when the session knows no copy exists, and start it with the reads (the write still waits for it); invariant 17 reworded to "every workbook write is preceded by the copy's delete, unless this session has confirmed there is none" [yes, if Stage 1 shows it costs more than about 0.3 s; otherwise leave it]. Q5 with Q4 (b), a save refused for a conflict will already have deleted the copy, so the next launch does a full read [accept; harmless]. Q6 the second-save fix by LastModified (invariant 4 reworded; residual risk above) [yes]. Q7 its window is the same 10 minutes as the display (`RECENT_WRITE_SHOW_MS`) [yes]. Q8 Save to Staging: record "upload a draft's photos in parallel" as its own backlog line, look at its Save steps later; not in (ax) [yes, record only]. Q9 merge class: held for your go-ahead after TEST [yes]. Q10 the narrow writers' extra serial reads on an identity edit (CoinID re-link): record only [yes, record only].

### From BACKLOG: (bk)
- (bk) Workbook session (Ray, 8 Nov 2026; PLAN 1 below, all answers in; BUILT 8 Nov on `claude/workbook-session-bk` (code `ea60360` + docs); **MERGED 8 Nov 2026** on Ray's go-ahead (rebased onto main's two docs commits, same tree as the tested `705937e`; code commit on main `296d8c4`; gate 5019 / 0 / 0, 100 suites). **Ray's TEST (705937e; tablet + PC Excel for the web + phone, _Testing):** c1 X (30 s) refused "something changed", session reused (held since 17:32:13); c1 Y (3 min from opening Edit Coin) refused, same session, PASS; c2 V (phone edit through the app, 30 s) refused, same session, PASS (W at 3 min skipped as redundant); (a) blank row inserted above Z in Excel for the web, saved at 3 min: wrote to Z's moved row, the blank row stayed blank, PASS; (b) Promote finished in one tap, no "not showing yet", wrote into the inserted blank row (first available), PASS; (d)/(e) NOT RUN cleanly (a photo save after 6+ min reused the session because the 30-minute background check at 18:02 saw a workbook change and re-read through the session); Q5 no session rejection seen. Ray watches for "created in N s" in normal use. write-up docs/ref/WRITE_LAYER.md "Workbook session (bk)"; build log docs/HISTORY.md (bk)). One session layer that every workbook call goes through: create the session, renew it when it expires, fall back to sessionless if one can't be had (never blocks a save). Reason: (ax) Stage 1 TEST step 6 wrote into the wrong row after a blank row was inserted in Excel (stale read, address-based write; (bi)). (ax) 2a's CollectionID re-read check runs on a read and may not catch a stale read; never re-tested on a device. Short TEST after the build: (a) re-run (ax) step 6; (b) one Promote completes with no "not showing yet"; (c) edit a coin in Excel or on a second device, then save it in the app: must refuse. If TEST passes, remove (ax)'s lag exceptions and what (bf) worked around. If it fails, stop and report.
  - **PLAN 1 (8 Nov 2026), WAITING on Ray; no code. Branch later: `claude/workbook-session-bk` from main.** (1) Layer: a new module (NOT named `workbookSession`: that is (ao)'s screen-state object) holding one session id in memory only, keyed by workbook path + account; one in-flight `createSession` (persistChanges true) shared by concurrent callers, 8 s deadline; ONE fetch helper every `/workbook/` request goes through adds the `workbook-session-id` header, and `patchWorkbookRanges` puts it on EVERY `$batch` sub-request. Renewal: idle over 4 min (Graph's persistent-session idle expiry is about 5) = make a new one before the next call; no keep-alive timer, no closeSession. Graph rejects the session: drop it, create once, re-send that ONE request, else re-send sessionless; a `$batch` is re-sent only when its first sub-request was the one rejected (nothing landed), otherwise today's "partial". createSession fails / times out / answers 202: sessionless (exactly today's path), 60 s cool-down before trying again. Never blocks a save; Save steps and About show "Excel session: reused / created N s / none (reason)". Not a client method (session-gate G1/G2 untouched); not tried offline. (2) Covered: the 9 RealGraphClient workbook methods (readWorkbookColumn, readWorkbookRange, readTableHeaderRow, readWorkbookRangeDetail, readRangeValuesAndText, readUsedRangeDetail, readTableColumn, patchWorkbookRanges, addTableRow), i.e. Edit Coin, Promote, Force Add, Save to Database, Photos / Receipts row claims, Set attach / detach, Purge, Mark as promoted, Docket re-check links, spot prices; `fetchWorkbookSheetRows` for background / Refresh / resume re-reads once a session exists. Proposed sessionless: the cold-launch sheet reads (a createSession first would add a serial Excel request before the splash; display only; Q1), and everything that is not the workbook API (the session does not apply): the (ao) version checks (`fetchWorkbookVersion`, drive-item metadata), docket.json, Staging, file uploads, thumbnails, getItemMeta / getWorkbookWebUrl. stage.html / index.html make no workbook calls. Risk to measure: with a persistent session the file's eTag may move later after an app write ((ao) version checks; safe direction, a re-read). (3) One session per workbook path; a page load has one target; memory only, never stored. (4) (aw) was never built; the only prior work is the (ao) Stage 2 desk note (PLATFORM.md) and "option 3" held in reserve (WRITE_LAYER.md, HISTORY.md Force Add verify, LEDGER.md spot-price read-back); no measurements exist. (5) Whether a held session sees an edit made in Excel for the web, desktop Excel, Copilot or another device cannot be known from the code or the docs; a session could even be blind to outside edits while it lives (worse than today). TEST (a) and (c) answer it, run with the session WARM (an app save in the last ~4 min before the Excel edit). (6) Removable after a passing TEST (list only): (ax) Part 3 own row states (`ownRowStates`, the invariant 4 exception); C' "not showing yet" (`KEYS_NOT_VISIBLE_YET`); the display overlay (`recentRowWrites`, `withRecentWrites`, `RECENT_WRITE_SHOW_MS`); `PROMOTE_RELOOK_MS`, `ROW_VERIFY_RETRIES`; `SPOT_PRICE_PATIENCE_DELAYS_MS`; close (bf). Keep `claimedRows`, `lastMintedIds`; the 5-minute Copilot rule stays unless (a) and (c) pass. Caveat: the sessionless fallback still lags (Q2). (7) Suite `tests/verify_workbook_session_bk.js` (mock grows createSession, a lagging sessionless view vs a current session view, expiry, rejection, create failure): every `/workbook/` request through the helper (source scan), header on every sub-request, one create for concurrent callers, create failure = sessionless save, idle renewal, reject + one re-send, partial not re-sent, path mismatch drops it, lagging mock: Save-Save, Promote with no "not showing yet", the step-6 wrong-row case correct; a negative control per check. Affected suites while iterating (save_speed_ax, save_lag_ax, session_gate_ao, device_cache_ao, load_report_ao, the (al) write-safety, Promote and spot-price suites); full npm test once at the merge gate. (8) TEST: (a) warm session, insert a blank row above the coin in Excel, save in the app: right row or refused, never the wrong row; (b) one Promote, no "not showing yet"; (c) warm session, edit coin X in Excel for the web (then on a second device), save X in the app within 2 min: refused; (d) proposed: idle 6 min, save: "created", lands. Any fail: stop and report, nothing removed. Q1 launch reads sessionless, session made in the background after launch? Q2 after a pass, keep the lag exceptions only for writes that went sessionless, or remove outright? Q3 8 s deadline, 60 s cool-down? Q4 TEST with a warm session, both Excel for the web and a second device, plus (d)? Q5 held for Ray's merge go-ahead (cross-cutting)? Q6 branch from main's docs head (same code as 76eb50f)? Q7 if (c) fails, stop only, or also try sessions for the app's own write sequences only?
  - **PLAN 1 answers (8 Nov 2026, coordinator; Ray to confirm):** Q1 yes (cold launch without a session, session made in the background after launch); Q2 keep the lag exceptions for writes that went without a session; Q3 yes (8 s, 60 s); Q4 yes (warm session, Excel for the web and a second device, plus (d)); Q5 held; Q6 branch `claude/workbook-session-bk` from `d0ed8f8`; Q7 stop and report. **Answers to A-D (from the code):** B every write takes its address from a fresh `graph()` read inside the same operation (`findAllSheetRowNumber`, `findClaimableBlankRow`, `readRecordRows`, `findPhotoRowByPhotoId`, the fresh header maps); the launch reads and the saved copy never give an address (invariants 3, 17). The one carry-over is Edit Coin's open-time snapshot (a Graph read at open, possibly before the session exists): its row is only a guess the save's own lookup must confirm, and its values are the conflict baseline, so a stale baseline can only cause a false refusal (safe; QA6). C yes: `patchWorkbookRanges` chains each chunk with `dependsOn` (request i depends on i-1; Graph answers 424 after a failure) and sends a chunk only after the previous one fully landed, so a rejected first sub-request of the FIRST chunk means nothing landed. D (plan changed): a write is never re-sent in another mode. The session layer keeps a generation number (it changes whenever the id is created, dropped or renewed); each write operation records it at its first workbook call (idle renewal happens only there), in the timed-save context every write already runs in; the write gate refuses to send a write whose operation started under another generation (SESSION_CHANGED, nothing sent); the operation re-runs its reads once from the start in the new mode, then writes; a second change refuses with "try again" (no loop). If part of the operation already landed (Promote keys), it stops as today (partial / "not showing yet"). Only READS are re-sent after a rejection. A (TEST (c) timing): two coins, so a save that is not refused cannot spoil the other run: coin X saved about 30 s after the Excel edit (recorded only: today's app cannot see it either), coin Y about 3 min after (must refuse; a write = FAIL, the session is blind, stop). About's session line is recorded each time; "created" instead of "reused" voids that run. (c2) the second device edits through the app (Graph writes land in one stage), same 30 s / 3 min; desktop Excel optional (c3). (a) only at about 3 min. **QA1** pass rule for (c): the 3-min run must refuse, the 30 s run is recorded only? [yes] **QA2** (c2) through the app, desktop Excel an optional (c3)? [yes] **QA3** (a) at about 3 min only (a 30 s run could write into another coin's row on _Testing)? [3 min only] **QA4** widen Q2: the lag exceptions apply whenever the read is not in the session that wrote (no session, or a renewed / replaced one), keyed by session generation? [yes] **QA5** the D rule (stop before sending, re-read once, then refuse)? [yes] **QA6** Edit Coin opened before the session exists: accept a possible false refusal rather than slow the open? [accept]
  - **E: what keeps the session warm, and the TEST steps (8 Nov 2026).** Activity = ANY request sent with the session id: a read or a write, foreground or background (Edit Coin's open read, a save, Refresh from workbook, a resume re-read after a version change). Not activity: the version checks, docket.json, Staging, files (they carry no session). The 4-min renewal counts from the last such request. The conflict baseline is Edit Coin's open-time snapshot (`browseEditSnapshot`); a background re-read never re-bases it (only a save or an acknowledged conflict does), so opening Edit Coin BEFORE the outside edit is both the warm-up and the baseline. Every run: after Save, Docket > About, note the session line; "reused" = warm, "created" = the run is void, repeat it a bit faster. Edit only test coins on _Testing. c1 30 s (coin X): 1 open X > Edit Coin, change nothing; 2 within 30 s, in Excel for the web (a computer is easiest) change X's Remarks to bk-c1x; 3 about 30 s later change one OTHER field in the app and Save; 4 record refused / saved + About line (recorded only). c1 3 min (coin Y): 5 open Y > Edit Coin (start the clock HERE: the 3 min count from opening Edit Coin, so the session's last use is under 4 min old at Save; Ray, 8 Nov 2026); 6 within 30 s change Y's Remarks in Excel to bk-c1y; 7 stay on the Edit form until 3 min after step 5 (no Refresh, no leaving it; that is about 2.5-3 min after the Excel edit, past Excel's ~2 min content stage); 8 change one other field, Save: MUST refuse (a save = FAIL, stop); About "reused". c2 (second device through the app): coins V (30 s) and W (3 min): device B is ALREADY on the coin's Edit Coin form before device A opens it (Ray, 8 Nov 2026); device A opens Edit Coin (start the clock); within 30 s device B changes Remarks and saves; device A, 30 s after opening (V, recorded only) or 3 min after opening (W, must refuse), changes another field and saves. c3 optional: as c1 with desktop Excel. (a) coin Z: open Z > Edit Coin (start the clock); within 30 s insert a blank row above Z in Excel for the web; Save 3 min after opening Edit Coin (change a field first): must land on Z's (moved) row or refuse; in Excel check the blank row is still blank and the row above Z is unchanged. (b) one Promote of a ready draft: completes in one tap, no "not showing yet". (d) open any test coin's Edit Coin, leave the app untouched 6 min (no switching to Excel), change a field, Save: lands; About "created".
  - **Ray's answers to the build report (8 Nov 2026).** Q1 Ray deploys `claude/workbook-session-bk` to TEST and runs (a)-(e). Q2 accepted for now, a KNOWN GAP: two unrelated saves that overlap (e.g. a Docket re-link while an Edit Coin save runs) share one write-step slot; the second joins the first's step, and once the first ends the second's later workbook writes are counted "outside a write step" and get no session generation check (today's behaviour; the save locks make it rare). Q3 yes: Mark as promoted and the spot-price update do not re-read after a session change, they refuse with "Try again". Q4 yes: a saved-copy launch whose version check is still out makes no session after launch; the first save makes it. Q5 Ray checks About's "Excel session events" in TEST for Graph's real session error codes. TEST step timing corrected as above (3 min counted from opening Edit Coin; c2 device B already on the coin).
  - **Addition (Ray, 8 Nov 2026): the cost of a session made at Save.** Ray's photo workflow keeps a coin open well over 4 min, and photo uploads carry no session, so most real saves will make a new session at Save. Accepted: NO keep-alive timer (a session held open longer is the blind-session risk in (c)). Build: Save steps get their own line "Excel session: created in N s" / "reused" / "none (reason)", so the added time is shown separately; the branch report gives that cost from TEST (the mock cannot measure Graph; createSession runs before the save's reads because they must carry its id; capped by the 8 s deadline, then sessionless). Refinement from this: the generation rule (D) applies per WRITE STEP that reads its own addresses (the fields save; each Photos / Receipts row claim; each label / removal patch; the receipt), not to the whole Edit Coin save, so a long upload between steps cannot turn a later step into a "partial" stop; Promote's keys-then-data stays ONE operation. A step whose session lapsed during an upload simply starts under the new generation and reads its addresses in it. Possible later (not built): start the session when the form first becomes dirty after 4 min idle. **TEST (e):** one real photo save after more than 4 min on the form: About's session line ("created" expected) and the save time and the session line in Save steps; compare with a quick save (session "reused") to give the added cost.

### From BACKLOG: (ak)
- (ak) DONE: merged 11 Nov 2026 (fast-forward to `1d53ec4`, code `1332303`) after Ray's TEST of Build 116 passed steps 1-10 (11 and 12 skipped). Decided differently from the first idea: no `_original` beside a holder; every non-flip photo is trim-only and never downscaled, untouched = the picked file's own bytes (Q1-Q3, Q13). Write-up: docs/ref/PHOTOS.md "(ak) Full-resolution ..."; TEST results and findings: docs/HISTORY.md "(ak) build history". Follow-ups: (bs)-(bw).

### From BACKLOG: (ai)
- (ai) *(Done: date branch, merged 4 Nov 2026 (`bfe52cc`); photo-only and receipt-only saves do not stamp it, Ray's Q4.)* LastModified should record the real date AND time of each change (Ray, 31 Oct 2026); today it is a date only, so it reads as midnight. Old midnight values stay as they are. Decide first whether a photo-only or receipt-only save updates it (today neither touches the coin row). Backlog only, not built.

## Session log — carried-forward state (not app architecture, tracked here for continuity)
(Corrected 4 Nov 2026 in the (am) slimming: the heading says "4 rows" but the block lists 6, two of them Resolved. Rows 1, 3 and 4 were Open. 5 Nov 2026 (Ray): rows 3 and 4 are in the workbook as ParkingLot 302 and 303 (marked below). 6 Nov 2026 (Ray): row 1 is in the workbook as ParkingLot 286, Open (the item itself stays open: a physical check not yet done).)*

### ParkingLot entries to transfer (4 rows, as of 2026-08-23)
**CLOSED 7 Nov 2026: nothing left to transfer.** Rows 1, 3 and 4 are in the workbook (ParkingLot 286, 302, 303); rows 2, 5 and 6 were Resolved before transfer. The "confirm transferred" line is closed; the text below is kept as the record.
~~Needs adding to the workbook's ParkingLot sheet — logged here because this
coding session has no write access to the live OneDrive workbook.~~ Recorded
verbatim in ParkingLot's own column shape (Item/Title, Category, Priority,
Date, Description, Status), same shape as the existing "Copper color
designations (RD/RB/BN)" future-pass row. Row 1 supersedes the earlier
2026-08-17 version of this same entry with Ray's own canonical wording
(same underlying item, not a new one — don't add both).

**Row 1:** *(IN THE WORKBOOK as ParkingLot 286, Open; confirmed by Ray 6 Nov 2026. The item stays open: Ray has not done the physical check.)*
- **Item/Title:** `Physical FB check pass on owned Mercury dimes`
- **Category:** `Data`  · **Priority:** `Medium`  · **Date:** `2026-08-17`
- **Status:** `Open`
- **Description:** `Matcher narrowing treats a blank All.Designation as meaning "not Full Bands" for Mercury dimes, which is correct for resolving CoinID links but doesn't confirm the physical coin actually lacks Full Bands. Owned Mercury dimes not yet inspected should get a coin-by-coin physical FB check, same shape as the deferred copper-color (RD/RB/BN) pass. Not urgent, not blocking any current work.`

**Row 2:**
- **Item/Title:** `Catalog grid/list view drops distinguishing catalog fields`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-22`
- **Status:** `Resolved`  · **Resolved Date:** `2026-09-03`
- **Resolution:** `BUILT — see CLAUDE.md "Catalog grid: Variety + Designation on the mini flip card". renderBrowseGrid()'s TL/BL now go through the same fitted renderers TR/BR use, so a VDB cent is distinguishable from a plain one in the grid. Also fixed a second bug found while wiring it: cornerClearsDisc() could never match .flip-frame-mini, so disc-clearance was a silent no-op on every Catalog card. Held on claude/add-coin-write-path-fs2rf8. NOTE: this does NOT close Row 6 (the FULL flip card's BL still has no overflow protection).`
- **Description:** `Catalog's grid and list views don't surface fields that distinguish otherwise-identical-looking catalog entries. Confirmed for two cases: Designation (FB Mercury dimes show bare Grade, e.g. "MS-64" instead of "MS-64FB") and Variety (1909 VDB vs non-VDB Wheat cents both show plain "1909 Wheat 1C" with no way to tell them apart). Individual Browse detail's flip card handles both fields correctly — only Catalog's grid/list views are missing them. Not blocking, cosmetic/data-clarity issue only.`

**Row 3:** *(IN THE WORKBOOK as ParkingLot 302, "album assignment"; confirmed by Ray 5 Nov 2026)*
- **Item/Title:** `Add Coin album assignment is captured but never acted on`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-23`
- **Status:** `Open`
- **Description:** `Add Coin's "Assign to Album" selection is now recorded on the Phase 1 Staging coin draft (assignAlbum), but nothing consumes it — no slot is filled, and the separately-specced post-save Albums matching flow (offer to fill a matching open slot; surface both coins on an already-filled slot; never auto-fill silently) is still unbuilt. Deliberately NOT scoped into any Add Coin write-layer phase: it is UX polish on a save that already works, not core to logging a coin. Pick up whenever. See CLAUDE.md "Post-save Albums matching" for the behaviour already agreed.`

**Row 4:** *(IN THE WORKBOOK as ParkingLot 303, "duplicate cert/serial warning"; confirmed by Ray 5 Nov 2026)*
- **Item/Title:** `Cert/serial duplicate check against owned coins`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-23`
- **Status:** `Open`
- **Description:** `Feature suggestion from the Add Coin Phase 1 live-run session, not a bug: nothing today cross-checks a PCGS/NGC cert number entered on a new coin against SerNo on already-owned coins to flag a likely duplicate entry (a coin re-added by mistake, or a cert typo colliding with a real existing coin). Could live in Add Coin's live matcher (a warning banner alongside the DB_Coins match banner) or as a save-time check. No design work done yet — flagging the idea, not scoping the build.`

**Row 5:**
- **Item/Title:** `Restructure Add Coin's field layout to match Edit Coin's accordion sections`
- **Category:** `App`  · **Priority:** `Medium`  · **Date:** `2026-08-23`
- **Status:** `Resolved`  · **Resolved Date:** `2026-08-24`
- **Resolution:** `BUILT — see CLAUDE.md "Add Coin: accordion restructure". Add Coin is now Grading & Certification + Overview / Photos / Notes & Facts / Purchase Details / Storage, matching Edit Coin. Specifications deliberately omitted (Ray's call). Held on claude/add-coin-write-path-fs2rf8 pending his go-ahead + a live retest pass. If this row was never transferred to the workbook in the first place, skip it rather than adding-then-closing it.`
- **Description:** `Ray's explicit ask (Add Coin batch 7 review): Add Coin should look nearly identical in structure to the Edit Coin / Browse detail page (see "Detail/Edit accordion redesign" — RECORD_SECTIONS: Overview, Photos, Specifications, Notes & Facts, Purchase Details, Storage), rather than its current one long flat form. Grading Service specifically should become its own clearly-bounded section (a real card/accordion, not just a text label) since it functionally drives the PCGS Label #/Cert-Type-Number fields beneath it, and should stay positioned near the top since a grader needs to be picked before the label-decode flow can run. This is a real, deliberate restructure — needs its own scoping pass (which fields land in which section, whether Purchase Details/Storage's existing drill-down pattern is kept or folded into the new accordion shape) before building, not a quick follow-on to the batch-7 header removal. Explicitly deferred, not started.`

**Row 6:**
- **Item/Title:** `Saved-coin flip card: BL (Grade+Designation) corner has no overflow protection`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-30`
- **Status:** `Resolved`  · **Resolved Date:** `2026-09-03`
- **Resolution:** `BUILT — see CLAUDE.md "Flip card: TL and BL are fitted (1787 Fugio Cent)". applyFlipCorners()'s BL now goes through the shared renderFittedCornerLines(), alongside TL which had the identical defect and caused a real-device collision on the Fugio Cent. Measured: "XF Details - Improperly Cleaned" was 295px of ink in a 139px box, 88.7px into the BR corner and 26px past the frame. Ordinary grades unchanged at 27px. Held on claude/add-coin-write-path-fs2rf8.`
- **Description:** `Found while measuring the composition-corner restack (see CLAUDE.md "CACBean UI, Value field rounding, composition corner restacked"): applyFlipCorners()'s BL corner (Grade+Designation, concatenated with no space) is plain textContent with no shortening logic at all — unlike TR (renderTypeDenomCorner()'s last-word-drop) and now BR (the composition split/reduction chain). A long free-typed "Details"-graded value (e.g. a PCGS Genuine-holder note like "XF Details - Improperly Cleaned") measured a genuine overlap with an unreduced BR value at 360px width before the BR restack (-9px gap); the restack fixed the specific collision by shrinking BR, not by giving BL any protection of its own, so a sufficiently long BL string could still in principle run close to whatever's in BR. Ray's explicit call: flag it, don't fix it here — out of scope for the composition-corner task. Would need its own scoping pass (truncate? shorten to last word like TR? something else for a Grade+Designation string specifically) if ever picked up.`
