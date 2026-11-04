# Reference: SAVE_AND_RECEIPTS (moved out of CLAUDE.md in the (am) slimming, 4 Nov 2026)

Read this file when: touching how photos and receipts are saved: the Save-wait rule (C1-C3), the leave guard, Replace, undo, the receipt slot and Binder, remove / shared Replace, receipt file naming, the Photos and Receipts tab writes, receipt-to-PDF, or "save only when something changed" (z).
Back to [CLAUDE.md](../../CLAUDE.md). Sections below are verbatim from CLAUDE.md as it was at commit `a7fcb20`; the original line numbers are in [docs/INDEX.md](../INDEX.md).

## Photos wait for Save (Oct 2026, merged to main 27 Oct 2026 by fast-forward to `928d7a9`, built on `claude/photos-wait-for-save`)
**Merged on Ray's go-ahead (27 Oct 2026)** after his tablet retests (below).
C1-C3, rounds 2-3 and the Replace / PhotoID fix are all on `main`; the branch
stays on origin as history. The "held" wording in the sub-section headers
below records the state while each was being tested.
Backlog items l, m, n, o. Plan answered by Ray 24 Oct 2026 (Q1-Q11). Built in
stages. **C1 is built and passed Ray's tablet test of `c5a8b29`** (steps 1-9,
11-13; step 10, the workbook check, deferred to a computer session; step 14,
airplane mode, skipped, so the partial-failure path is device-unverified).
**C2 passed Ray's tablet test of `79b4f90`** (all 15 steps). **The C2
follow-ups and C3 (open-ended Package/OGP) are built, held for Ray's
tablet test** (see "C2 follow-ups" and "C3: open-ended Package / OGP"
below); C4 is this file. **Ray's tablet test of `0a0cbd1` passed except a
second Back in a row leaving the app; that, the Dashboard exit toast, the
Mint Mark display and Tap to label are fixed in round 2, held for his
retest** (see "Round 2 after Ray's tablet test of `0a0cbd1`"). **His retest
of `6eaef11` passed everything except Tap to label (field focused, no
keyboard); round 3 re-focuses the field, held for his retest** (see "Round
3 after Ray's tablet retest of `6eaef11`"). **His tablet test of `826e2d4`
found a Replace writing over the old photo file (a must-fix before merge,
on main too) and a duplicate PhotoID; both fixed, held for his retest** (see
"Replace never overwrites a photo file; PhotoIDs minted inside the lock").
Branch cut from `main` `34dc28b`. Suites: `tests/verify_photos_wait_for_save.js`
(35), `tests/verify_leave_guard.js` (37), `tests/verify_device_back_everywhere.js`
(49 since round 2), `tests/verify_ogp_open_ended.js` (40),
`tests/verify_tablet_retest_0a0cbd1.js` (17 since round 3),
`tests/verify_replace_never_overwrites.js` (35).
- **The rule (C1).** On a saved record (an owned coin or Set, write layer on:
  `photoCommitTargetId`) Add, Replace, Recrop, Crop from another photo and ✕
  are held in memory and written only by Save Changes (Edit Coin, Edit Set)
  or Save (Manage Photos). Nothing writes on tap-away, a redraw,
  visibilitychange or pagehide. Draft mode (Add Coin, the Staging-draft
  edit) is unchanged; its S3 golden is unchanged.
- **Where it changed: one choke point.** `addGalleryEntryAndCommit` (every
  add/Replace/Recrop/crop-from-another goes through it) now places the entry
  `pendingSave` instead of writing (`placePendingAdd`; a single-instance slot
  that still holds a photo becomes a Replace of it). `opts.immediate` keeps
  the old write for any caller that needs it (none today).
  `replaceGalleryEntryAndCommit` records `pendingReplaces` (the saved photo it
  replaces; replacing a pick that was never saved points past it).
- **✕** (`confirmRemovePendingPhoto`, called from `confirmRemoveGalleryPhoto`
  for a saved record): a saved photo is marked `pendingRemove` and hidden, but
  stays IN the list, because taken out the next redraw would hydrate it back
  from the Photos index. A pick that was never saved just goes; a pick that
  replaced a saved photo is UNDONE (29 Oct 2026, was "takes that photo with
  it"): see "✕ on a Replace pick is an undo" below. *(The legacyOnly "can't
  remove this one" case is gone: receipts and photos alignment, Build 1.)* Hidden from the screen via
  `visibleGalleryFor`, `manageCount`, the pair slot lookup, the open-ended
  loop and `cropSourceEntriesFor`.
- **Save** (`savePhotosAndLabels` -> `savePendingPhotos`, then
  `savePhotoLabels`). Order: adds and replaces one at a time in screen order
  (each uploads its crop, then its `_original`, THEN writes its Photos row, so
  a row never points at a missing file); removals last (row blanked, file
  never deleted); labels last, one cell each. Edit Coin: the coin row (with
  its conflict check), then the CoinID re-link, then photos, then labels; a
  conflict or a failed field save writes no photos. With no field changed the
  coin row is not touched (`performBrowseEditLabelsOnly`, now photos and
  labels). Edit Set writes photos and labels; its fields stay session-only.
- **Partial failure.** A failed photo stays `pendingSave` with `uploadError`,
  dimmed, "Not saved — tap Save again", no ↻ (Save is the retry). Each file
  that uploaded is remembered (`entry.uploadedNames`), so the next Save sends
  only what is missing; a photo whose row landed is never re-sent. A removal
  whose write fails stays `pendingRemove`. The toast names the files
  (`photoSaveFailureText`); the form stays open (`photoEditsAllSaved`).
- **A new photo's row is created with its typed label** (Ray's Q1), so its
  label needs no second write and counts as a photo change, not a label
  (`unsavedPhotoLabelEntries` skips pending entries). This reverses the old
  "a brand-new photo's row starts with a blank Label".
- **In-place Replace writes ONLY Filename and OriginalFilename** (Ray's Q3),
  each a single cell, re-checked against PhotoID and CollectionID just before
  (`replaceFileCells` inside `writePhotoRow`). PhotoType, SubGroupID, Label
  and DateAdded are left as they are. New rows still use `writeRecordRow`
  (claim a blank row); detach still blanks the whole row on purpose. Label
  writes stay single-cell (`writePhotoLabel`). The replaced file stays on disk
  (the later `_Replaced` folder item would move it after the row write;
  *superseded by backlog (s), the "Keep the old photo?" choice*).
  *(Not true for fixed-name types until 27 Oct 2026: their Replace uploaded
  over the old file. Fixed: see "Replace never overwrites a photo file".)*
- **Repeatable filenames** are chosen at Save: a pick's provisional name no
  longer counts in `nextFreeRepeatableFilename` / `coinPhotoNameKnown`, so a
  discarded pick never uses up a number.
- **Progress and lock.** The Save button shows the spinning coin and "Saving
  photo 2 of 3…", "Removing 1 photo…", "Saving labels…"
  (`pendingButtonProgress`); each tile shows "Saving…" as it goes
  (`photoHostRenders` / `repaintPhotoHost`). While a Save runs
  (`withEditSaveLock`, `editSaveInFlight`) Back and Close Drawer toast "Still
  saving — wait for it to finish" and the active view takes no taps
  (`body.edit-save-locked`) (Ray's Q5).
- **Manage Photos** has ONE "Save" (`saveManagePhotos`; the element keeps the
  id `managePhotosSaveLabelsBtn`), shown while a photo or label is unsaved.
  Footer: "Photos and labels save to OneDrive when you tap Save." Edit Set's
  footer: "Photos and their labels save to OneDrive when you tap Save
  Changes."
- **Discard** (`discardPendingPhotos`, wrapped with labels in
  `discardUnsavedPhotoEdits`): picks go, replaced photos come back in their own
  place, ✕'d photos come back. Back's "Discard unsaved edits?" counts photos
  ("1 field, 1 photo label and 2 photos"). *(C1 left `navigate()` discarding
  silently; since C2 it asks first, see below.)*
  Opening Edit Coin or Edit Set discards that record's leftovers.
- **Known effect, accepted:** ↻ no longer appears on a saved record (Save is
  the retry). `retryGalleryPhotoCommit` and the ↻ markup are kept for a
  committed failure, which nothing produces today.
### C2: the leave guard (built on the same branch, HELD for Ray's device test; merged to main 27 Oct 2026)
Backlog l and o, Ray's Q4 and Q6, plus his four tidy-ups from the C1 test.
- **One check, one dialog, every way off an editing screen.**
  `activeEditScreen()` says which editing screen is up ("editcoin",
  "editset", "managephotos", "addcoin" — a new coin or a Staging-draft
  edit); `unsavedEditsForView()` says what is unsaved there (fields, photo
  labels, photos, a receipt on Add Coin) and how to discard it;
  `guardLeaveEditScreen(leave, onKeep)` runs `leave` at once when nothing is
  unsaved, else shows `showDiscardEditsDialog`. Title "Discard unsaved
  edits?"; body "You've changed {count} on {ID} and haven't saved.
  Discard leaves this screen and loses those changes. Keep editing stays
  here so you can save." ({ID} is "this new coin" on a new Add Coin.)
  Buttons Keep editing / Discard. The old `confirmLeaveWithUnsavedEdits` is
  gone.
- **Where it runs.** `navigate(viewId)` is now the guard around
  `navigateNow(viewId)` and returns whether it left (`beginCoinDraftEdit`
  checks it). That covers Close Drawer and every other route. The in-form
  and chrome Back of Edit Coin / Edit Set / Manage Photos, Edit Set's "Coins
  in this Set" row, and `openManagePhotos` (wrapping `openManagePhotosNow`,
  so a Set's Manage Photos opening a coin's asks first) all go through it.
  While a Save runs nothing leaves: `navigate()` toasts "Still saving —
  wait for it to finish" and returns false.
- **What counts.** Edit Coin: `browseEditTouchedFields` (file inputs no
  longer count: the receipt saves on pick, Q10). Edit Set: fields that
  differ from the form as opened (`editSetChangedFieldCount`, Q4; they are
  session-only but still count). Both plus unsaved labels and pending photos.
  Manage Photos: labels and photos. Add Coin: `addCoinTouchedFields` (a
  delegated listener on `#view-addcoin` that records only trusted user events
  and skips file inputs, so an album or Wishlist deep-link prefill and a
  Staging draft being loaded never count), photo picks
  (`addCoinUnsavedPhotoCount`: entries not `stagingStored`, plus Staging
  photos ✕'d), and a picked or removed receipt (`addCoinUnsavedReceipt`).
  Add Coin's Discard is `resetAddCoinForm()` + `clearCoinDraftEditContext()`.
- **Device Back (Q6).** *(Widened to every screen by the C2 follow-ups
  below: the entry now stays on top everywhere and nothing steps back over
  it except Leave.)* Opening an editing screen pushes ONE history entry
  `{coinLeaveGuard: token}` (`armLeaveGuard`); `setNavBack` (run on every
  screen change) queues `syncLeaveGuard`, which arms or disarms, so redraws
  never stack a second entry. The popstate handler (`onLeaveGuardPop`) runs
  the same check: nothing unsaved -> the in-app Back (`navBackHandler`);
  something unsaved -> the dialog; Keep editing pushes the entry back;
  Discard runs the in-app Back. Leaving any other way (Save that leaves,
  in-app Back, Close Drawer, navigate) steps back over the entry
  (`disarmLeaveGuard`, the pop it causes is expected and ignored). The photo
  viewer keeps its own entry on top; Back there closes only the viewer (the
  pop lands on our entry, which stays). While a dialog or a Save is up, Back
  re-arms and changes nothing; with the image chooser open it closes the
  chooser; with the crop tool open it cancels the crop (as its Cancel does). Each entry has its own token, so one left behind by a reload is
  never mistaken for ours.
- **Tidy-ups (Ray, C1 test).** (1) The status line ("Not saved yet",
  "Saving…", "Not saved — tap Save again") sits under the Replace button on
  every tile type (open-ended tiles had it above the label line). (2) Remove
  dialog for a saved photo: "This {Reference photo} will be removed when you
  tap Save. Until then nothing changes, and Discard brings it back. The
  photo file itself is never deleted." plus the legacy All-columns note when
  it applies; a never-saved pick: "This {…} hasn't been saved yet, so taking
  it off writes nothing." (3) The Discard dialog above. (4) One Save toast
  wording on every editing screen, `photoSaveHeadline`: "Saved {ID} — 1 photo
  added." / "— 1 photo removed." / "— 1 label updated." (Edit Set's labels-
  only toast used to be "1 photo label saved to the workbook."). Edit Coin's
  fields toast keeps "Saved {ID} to the workbook (N fields updated, …)".
- **Edge case pinned (Ray, C1 test):** a label changed and then ✕ on the
  same photo: Save writes the removal only; the toast says "Saved {ID} — 1
  photo removed."; the row ends fully blank; no Label cell is written
  (`unsavedPhotoLabelEntries` skips `pendingRemove`). Test E1.
### Replace never overwrites a photo file; PhotoIDs minted inside the lock (same branch, HELD for Ray's retest; merged to main 27 Oct 2026)
Ray's tablet test of `826e2d4` (27 Oct 2026). **Must-fix before merge:**
AY-00724's Holder back was replaced; row PH-00038 kept Filename
`AY-00724_slab_reverse.jpg` (DateAdded 3 Oct, correctly kept) and the new
picture was uploaded OVER the old file in TEST's CoinPhotos.
- **Also on main / LIVE, not new on this branch.** Every fixed-name type
  (Obverse, Reverse, Holder front/back, a Set's whole-set and sub-group
  pairs, the old Package pair) uploaded under its one convention name with a
  plain PUT (Graph's default is replace), so Replace and Recrop wrote over
  the previous `{ID}_slab_reverse.jpg` / `_obverse_cropped.jpg` /
  `_obverse_original.jpg`. On main this happened on capture; here at Save.
  It is the "silent file overwrite on slab/reference/receipt captures" item
  in "Known effects, accepted". Numbered types were already safe
  (`nextFreeRepeatableFilename`), and Crop from another photo
  (`freeFlipCropFilename`, `_cropped_02`).
- **Fix 1, names chosen at Save for fixed-name types too**
  (`freeSingleFilenames`, called from `commitGalleryPhoto`): the plain name
  when it's free, else `_02`, `_03`… (`{ID}_slab_reverse_02.jpg`); a flip
  source's crop and original take ONE number
  (`_obverse_cropped_02.jpg` + `_obverse_original_02.jpg`). "Free" is the
  existing `coinPhotoNameIsFree` (no Photos row, no gallery entry, no file
  in CoinPhotos), so a stray file with no row is never written over either.
  The row's Filename/OriginalFilename cells are then patched as before
  (`replaceFileCells`); the old file stays in CoinPhotos untouched.
- **Fix 2, the upload itself refuses to overwrite** (`NO_OVERWRITE`,
  `uploadFile(path, blob, opts)` / `uploadBytes`): the real client adds
  `?@microsoft.graph.conflictBehavior=fail`, so a name taken between the
  check and the upload fails with 409 (`uploadError`, `err.conflict`)
  instead of replacing. The photo stays "Not saved — tap Save again", its
  name is cleared (`filenameResolved = false`), and the next Save picks a
  free one. The mock client honours the option too.
- **Recrop from the original** (`adjustStoredPhoto` when `src.fromRaw`, and
  the in-session Recrop of a saved photo): the original is already in
  CoinPhotos, so the new entry carries `rawStored` and the row keeps pointing
  at that file; only the new crop is uploaded (no second copy, nothing
  written over). A Recrop from the saved photo (no original on file) uploads
  the source bytes as a new free `_original_NN`, as before minus the
  overwrite.
- **Every upload path, checked** (what each does now):
  - Save on Edit Coin / Edit Set / Manage Photos (`commitGalleryPhoto`):
    free names + `NO_OVERWRITE`.
  - Add Coin's new draft (`uploadCoinDraftPhotos`, a fresh Staging folder):
    `NO_OVERWRITE`.
  - Staging-draft edit (`uploadStagingEditFiles` / `stagingEditNamesFor`): a
    fixed-name Replace used to overwrite the draft's own file in place; now
    it takes `_02` (crop and original together), uploads with
    `NO_OVERWRITE` (a file that already landed on an earlier attempt isn't
    re-sent, `entry.stagingLanded`), and the old file is deleted only after
    coin.json lists the new one (`finishStagingEditFiles`, unchanged).
  - Promotion moves, coin and Set (`moveFileWithoutOverwrite`, shared): a
    destination already holding the SAME bytes is the copy from an
    interrupted earlier run, so the move finishes; anything else there is
    refused ("nothing overwritten, source kept"); an empty destination is
    copied with `NO_OVERWRITE`. Before, a file at the destination was simply
    written over.
  - Crop from another photo: already free-named; now also `NO_OVERWRITE`.
  - **Not changed, reported:** receipts (`commitReceiptCapture`: a new
    filename not on the Receipts tab still uploads with replace, and a
    photographed re-capture `{ID}_receipt.pdf` that IS on the tab skips the
    upload, keeping the old file), Add Set (`uploadDraftPhoto`: fixed child
    names; a second Pause re-uploads over its own Staging file by design),
    Staging-edit receipts, and JSON drafts (`uploadJson`, rewritten on
    purpose).
- **Numbered names read back:** `rawNameForCropped` / `croppedNameForRaw`
  pair `_cropped_02` with `_original_02` (used by `storedRawFilenameFor`,
  `stagingPhotoGroups`, `recordPromotedCoinRecords`);
  `stagingPhotoTypeFromFilename` accepts `_02` on fixed-name types.
- **PH-00129 on two rows (AY-00212 Slab_Obverse and Slab_Reverse, 18 Oct,
  before this branch): the app wrote both, and the cause is fixed.**
  `writePhotoRow` minted the id (`nextPhotoId`) BEFORE `writeRecordRow` took
  the Photos table's lock. On main a pick commits at once, so a Holder front
  and back picked back to back both read the same highest id; the lock then
  gave them different rows. Reproduced by the control below (both got
  PH-00041). Now: the id is minted INSIDE the lock (`writeRecordRow`'s
  `mintId`), and never at or below one this session already gave out
  (`lastMintedIds`, per graph client), because a column read straight after
  a write can lag. Receipts the same (`writeReceiptRow(…, null)` mints inside
  the lock; promotion and `commitReceiptCapture` no longer mint first). On
  this branch a Save commits photos one at a time, so the race couldn't
  recur within one Save; the lagging read could. Main and LIVE still have
  it. The workbook row is Ray's to fix; nothing here writes it.
## Receipts never overwrite (Oct 2026, merged to main 28 Oct 2026 by fast-forward, built on `claude/receipts-never-overwrite`)
*(Naming refined on Edit Coin / Edit Set by alignment Build 2, item 4: a photo replaced on 2 or more coins at once is named `{ReceiptID}_receipt.pdf`; a single-coin photo is still `{CollectionID}_receipt.pdf`. The never-overwrite rules below are unchanged.)*
**Merged on Ray's go-ahead (28 Oct 2026)** after his tablet retest of `e4cfa79` passed (Staging replace keeps every old file; toast says the original was kept). Last fix before merge `f14cb97`: the Staging-edit Save changes toast capitalises its first word ("Receipt saved to Staging (the old file is kept there)."; P22b follows). The branch stays on origin. The "held" wording below records the state while it was tested.
Backlog (t), Ray's own Q1 on the "Replace never overwrites a photo file" fix
above. Same `NO_OVERWRITE` / free-name approach, extended to the one place
receipts still worked the old, unsafe way.
- **What was broken.** `commitReceiptCapture()` (Edit Coin / Edit Set /
  Manage Photos' receipt slot) treated ANY filename match on the Receipts
  tab as "this is the same document" and skipped the upload — correct for
  the intended multi-coin sharing (RC-00001 genuinely covers three real
  coins), wrong the moment two UNRELATED documents happen to share a name
  (two sellers' own `invoice.pdf`): the second coin's row would point at the
  FIRST seller's file, and nothing would ever upload for the second. A
  re-photographed `{ID}_receipt.pdf` hit the identical bug from the other
  side: since that fixed name is always this coin's own, the "dedupe" always
  found this coin's own existing row and skipped the real upload entirely —
  Replace did nothing at all. The Staging-draft-edit receipt branch
  (`uploadStagingEditFiles()`) had the second half of that same bug:
  replacing a receipt mid-edit uploaded straight over the old Staging file.
- **The fix.** Which of the two readings applies is now decided by BYTES
  (`sameFileBytes()`, the same check `moveFileWithoutOverwrite()` already
  uses for the identical ambiguity on a promotion move), never by the
  filename alone. A byte-fetch failure is treated as "different" (Ray's Q2)
  — a spurious extra file is cheap and visible; silently reusing the wrong
  ReceiptID is not. New `freeReceiptFilename()`/`receiptFilenameIsFree()`
  mirror the photo free-name helpers exactly (checked against both the
  Receipts table's own Filename column and a live `getItemMeta` against
  CoinReceipts, so a stray file with no row is caught too). Every receipt
  PUT (`commitReceiptCapture`, the Staging-edit branch, and a brand-new Add
  Coin draft's own first upload) now passes `NO_OVERWRITE`.
- **The new invariant (Ray's addition): one ReceiptID must never point at
  two different files.** Before a replace keeps this coin's own existing
  ReceiptID, `receiptIdUsedByOtherCoin()` checks whether any OTHER coin's
  row still carries it. If one does, this coin's row gets a freshly-minted
  id instead, and the other coin's row and file are left completely
  untouched — covers both phrasings: a re-photographed fixed-name receipt
  whose row happens to share an id, and a coin on a genuinely shared
  receipt (e.g. `invoice.pdf` on two coins) picking something new.
- **Add Set's own `uploadDraftPhoto()` is deliberately UNCHANGED** — still
  the same "a second Pause re-uploads over its own Staging file by design"
  behavior this file already documents; out of scope for this branch.
- **Blank-row claiming (the new standing rule above), audited for this
  branch specifically**: `writeReceiptRow()`'s new-row path already went
  through the shared `writeRecordRow()` helper, which already claims a
  blank row first — confirmed with a dedicated test (a Receipts table
  seeded with real rows plus trailing blanks; both `commitReceiptCapture()`
  and the Staging/promotion path's own `recordPromotedCoinRecords()` claim
  the next blank row, never appending). No code change was needed here —
  only the explicit, Receipts-specific test coverage, which didn't exist
  before (only Photos' had its own row-number assertion).
## ✕ on a Replace pick is an undo (29 Oct 2026, merged to main 30 Oct 2026 by fast-forward, built on `ccr-06105bea-fexby9`)
Ray's change to Q3, everywhere photos are edited. ✕ on a pick that REPLACED a
saved/stored photo removes the pick and puts the previous photo back in its
slot, as if the Replace never happened. Nothing is deleted, uploaded or written.
To delete the old photo too, ✕ on it is a separate step. Plain ✕ on a stored
photo and ✕ on a never-saved Add are unchanged.
- **Owned records** (Edit Coin, Edit Set, Manage Photos): `confirmRemovePendingPhoto`
  — a pick with `pendingReplaces` (set by `replaceGalleryEntryAndCommit` /
  `placePendingAdd`, so Replace, Recrop and Crop from another photo all
  count) restores `pendingReplaces` with `pendingRemove = false` (it used to
  be marked to come off at Save). Replace twice then ✕ restores the ORIGINAL
  saved photo (`pendingReplaces` already points past an unsaved pick).
- **Staging draft edit:** see the next section.
- **Dialog** (`confirmUndoReplaceDialog`, shared): title "Put the previous photo
  back?"; body "This {photo} replaced the one that was here. Removing it puts
  the previous photo back in its place, as if you had never replaced it.
  Nothing is deleted. To delete the previous photo as well, tap ✕ on it
  afterwards."; buttons Cancel / Put it back.
- Tests: `verify_photos_wait_for_save` W15-W16b (8 new; 43 total). Negative
  control with the undo removed: W15, W15b, W15c, W15f, W16, W16b fail (6).
- Not verified on a real device.

## Staging photo replace keeps the old file (Oct 2026, merged to main 30 Oct 2026 by fast-forward, built on `ccr-06105bea-fexby9`, code `7b56955`)
Backlog (w), Ray 28 Oct 2026. The Staging-draft edit (draft mode) only; owned
records (C1, "Replace never overwrites a photo file") are untouched.
- **Rule: a Replace, Recrop or Crop from another photo in a Staging draft
  edit keeps every old file.** Only ✕ after its confirm deletes. The only
  delete path is `finishStagingEditFiles()`, fed by `mergeStagingEditFiles()`'s
  `dropped`; `dropped` now leaves out the files a Replace stood in for.
- **How:** `draftPlaceGalleryEntry()` sets `newEntry.stagingReplaces` (the
  replaced stored files, carried through a chain of picks);
  `mergeStagingEditFiles()` builds `replacedFiles` from uploaded entries and
  returns `photosReplaced`. coin.json lists only the new files; the old ones
  stay in the folder, unlisted, so the next edit shows one slot and the free-name
  scan (`stagingTakenNames`) never reuses them. Names were already free
  (`stagingEditNamesFor`, `NO_OVERWRITE`): unchanged.
- **✕ on a pick that replaced a stored photo is an UNDO** (Ray, 29 Oct 2026,
  reversing the first build, which deleted the old files): the pick goes and
  the ORIGINAL stored entry comes back in its slot, through a chain of picks
  (`newEntry.stagingReplacedEntry`, set in `draftPlaceGalleryEntry`).
  Nothing is deleted or uploaded and coin.json is unchanged. ✕ on the
  restored photo is the ordinary stored-photo remove (deleted at Save
  changes). Crop from another photo into Obverse/Reverse counts as a Replace.
- **Promotion:** moves only what coin.json lists; kept old files stay in the
  Staging folder (no new field). A future Docket file cleanup can compute
  candidates as folder children minus coin.json's photos, receipt and itself.
  Reject deletes the whole folder; its dialog now says so.
- **Left alone on purpose:** Recrop still writes a second `_original_02`
  (reusing the old original would break the name pairing in
  `stagingPhotoGroups` / `recordPromotedCoinRecords`); Add Set's
  `uploadDraftPhoto`; (y) the Staging receipt slot.
- Tests: `verify_staging_replace_keeps_old` (21, A-M plus H2-H4);
  `verify_staging_edit_photos` P12, P13, Q10 follow the design. Negative
  controls: with the keep exclusion removed, A-F, M, P12, P13 and Q10 fail and
  the ✕ cases still pass; with the undo removed, H-H4 fail (4).
- Not verified on a real device. Crop from another photo is tested through
  `saveDraftCropFromUpload()` directly, not the crop UI.
### A failed Staging-edit save cleans up its own half-pair (30 Oct 2026, merged to main 30 Oct 2026 with the section above, code `960634d`)
Ray's tablet retest on `5d23349`, draft AY-00756. An Add's first Save wrote
`obverse_cropped_04`, then `obverse_original_04` was refused (409: OneDrive can
refuse a recently deleted name even though a lookup says it is free). Ray
re-saved: the retry took `_05` for both and wrote the crop again, leaving an
orphan `cropped_04`, `cropped_05`, `original_05`, and no `original_04`.
Cause: `uploadStagingEditFiles()` cleared the chosen names on a conflict but
left the half that had already landed. **Undo + Save was NOT at fault**
(reproduced: it uploads and deletes nothing).
- **Rule:** when a Staging-edit save fails partway, the failing entry's own
  landed files (`entry.stagingLanded`, uploaded by this attempt) are deleted
  before the failure is reported, so the re-save writes a matching pair. Only
  that entry's own files: never one already in the folder, never another
  entry's (a Reference that landed earlier in the same attempt stays and is
  not re-sent). The pick is still in memory, nothing is lost. No auto-retry.
- A cleanup delete that fails leaves a harmless orphan and the failure toast
  says so in one clause ("N partly uploaded file(s) couldn't be cleaned up
  from Staging (names) — harmless, and not part of the draft").
- A name OneDrive refused is remembered (`entry.stagingBadNames`) and skipped
  when the names are re-chosen, so the re-save takes the next number rather
  than hitting the same refusal again.
- Tests: `verify_staging_replace_keeps_old` N1-N4 (8 new; 29 total): the exact
  409-on-original_04 sequence, cleanup scope, a failed cleanup, and Add, Save,
  reopen, Replace, X, Put it back, Save uploading nothing. Negative control
  (the pre-fix app): N1, N1c, N1d, N2, N2b, N3 fail (6); N4 passes both ways,
  as the diagnosis said it would.
- Not verified on a real device.
## Save only when something changed (task (z), built 30 Oct 2026 on `claude/save-only-when-changed`, merged to main 31 Oct 2026 by fast-forward, code `014be60`)
Backlog (z), Ray's answers Q1-Q7. Display and guard only: no write path changed.
- **The rule: a form is dirty only while it differs from what it was loaded with**, compared in the shape Save would write (text trimmed, numbers as numbers: 1, "1" and 1.00 are the same; a cert number "00123" is text and stays text). Putting a value back makes the form clean again. `formValuesEqual(numeric, a, b)`, `FORM_NUMERIC_KEYS`.
- **Edit Coin:** `browseEditBaseline` (the form as loaded, `captureBrowseEditBaseline()` at the end of `showBrowseEditViewInner`), re-based when the live row lands or after a conflict (`rebaselineBrowseEditFromSnapshot`: an untouched box's baseline is what is on screen, a touched box's is the row's value) and after a partly failed save. `browseEditDirtyKeys()` = fields that differ AND were touched (`browseEditTouchedFields`, kept for the conflict re-base and the Status-only-if-touched write rule). The touched gate means nothing the app does to a box can make it dirty. StorageLocation is left out while it is hidden (container-derived).
- **Edit Set:** `editSetOpenedFields` already was a snapshot; `editSetChangedIds()` now compares numbers as numbers (`EDIT_SET_NUMERIC_IDS`). Field-only changes still count (Q3).
- **Add Coin / Staging-draft edit:** `addCoinBaseline` = what a box held before the user's first focus, tap or key press (capture-phase listeners on `#view-addcoin`, trusted events only); `addCoinDirtyFieldIds()` = touched boxes that differ. A Staging edit also counts: photos taken off (`addCoinRemovedStoredCount()`, worked out from `editDraftFiles.loadedEntries`, no longer the add-only `removedCount`), a label changed on a stored photo (`addCoinStagingLabelCount()`, `entry.stagingBaseCaption`; it was not counted at all before, Q5), and a receipt picked or the draft's own stored receipt taken off (✕ on a receipt the draft never had is not a change).
- **The Save button (a view only):** `refreshEditSaveState()` / `applySaveCleanState()`. Edit Coin, Edit Set and the Staging-draft edit show Save dimmed and disabled with "No changes to save." under it (`.save-btn.is-clean`, `.save-clean-hint`, ids `browseEditSaveHint`, `editSetSaveHint`, `stagingEditSaveHint`) while clean (Q1). A new coin's Save is never dimmed (Q2); Manage Photos still hides its Save when clean. It follows input/change events, every photo-host redraw (`refreshManagePhotosSaveLabelsBtn`), draft picks and ✕, receipt picks, label edits, `setNavBack` and the end of every Save (`withEditSaveLock`'s `finally`). It never touches a button whose Save is running (`editSaveInFlight` or the spinner). **The leave guard and the click handlers ask `unsavedEditsForView()` afresh every time; they never read the button.**
- **A Save click on a clean form writes nothing** (Q6): Edit Coin, Edit Set and the Staging edit (`saveAddCoinForm`) toast `SAVE_CLEAN_TEXT` and return: no LastModified stamp, no Reviewed blanking, no coin.json rewrite, no upload.
- **Gifted (Q4):** `applyGiftedSalePrice()` fills a blank Sale Price with 0 as before; moving Status off Gifted takes back only a 0 the app put there (typing in the box clears the claim, `wireGiftedSalePriceTyping`), so Gifted and back is clean.
- **Test-helper note:** after a Save that leaves nothing to save the button stays dimmed, so a test must wait for `editSaveInFlight` to clear, not for the button to re-enable (`save()` in verify_photo_label_save / verify_photos_wait_for_save / the new suite). Two suites clicked Save twice on a form the first Save had already left; they now reopen the form between saves.
- **Every way into Add Coin / Add Set, and how (z) treats it** (tests J, K, H, G in `verify_save_only_when_changed`): (1) navigation (Acquisitions button, drawer): `navigate("addcoin")` resets and clears the baseline, blank and clean; (2) an empty Album slot: `albumContext` + `applyAlbumContext()`, and (3) a Wishlist "Found it": `wishlistContext` + `applyWishlistContext()`: both fill boxes by code with no trusted event, so the form is clean; typing over the prefill is a change, typing the prefill back is clean; (4) a Staging draft (Staging Review Edit, Docket Edit): `beginCoinDraftEdit()` asks first through `navigate()`, `applyCoinDraftToForm()` + `loadStagingEditFiles()`, clean, then photos / labels / receipt compare to what was loaded; (5) an ID lookup (PCGS label, Mint Item Number, GSID, Mint Mark Other): `applyDbCoinsRowToForm()` etc., app-filled so not an edit, though the box the user typed the code into counts as before; (6) matcher autofill after a user edit: counts only through boxes the user touched; (7) the Year picker: user-tapped, counted through `markAddCoinUserEdit()`. Add Set: (8) navigation, blank; (9) the Sets-checklist tile: `setChecklistContext` + `applyAddSetContext()` fills Name, Year and Category and sets `addSetNameTouched` / `addSetYearTouched` (the 22 Jul protection: a product code entered afterwards cannot overwrite them; tested K1-K3 with a no-deep-link control); (10) the Docket "Missing whole-set photo" row: `resumeSetDraftAtStep1()` sets the same flags. Add Set is not a leave-guard screen (`activeEditScreen()` is null there) and (z) changed nothing in it.
- **`refreshEditSaveState()` has 19 call sites, each with its own test** (a case that forces the button into the wrong look, triggers that one event and checks it was put right; found by disabling each call in turn and running the suite): Edit Coin: input/change listener (A2-A13), clean-click (L2), live row landing (L1); Edit Set: input/change listener (D2, D3), show (L6), clean-click (L5), after a save (L7); `syncLeaveGuard` (L3); `withEditSaveLock` release (L4); photo-host redraw `refreshManagePhotosSaveLabelsBtn` (B1-B3); `applyPhotoLabelText` (G2); Staging edit: `draftPlaceGalleryEntry` (G8a), ✕ (G8b), Put it back (G8c), clean-click (G8d), receipt PDF and photo picks (G8e, G8f), `removeStagingEditReceipt` (G5), Add Coin input/change listener (H1, H3). Four earlier calls were removed as redundant (an earlier call inside the same function always gave the same answer): the end of `showBrowseEditViewInner`, two in `beginCoinDraftEdit` around `loadStagingEditFiles`, and the `finally` of `completeAddCoinSave`. The Ledger spot-price Review / Confirm is out of scope (Q7).
- **Left alone on purpose (Q7, backlog (ab) below):** Add Set Step 1 resume, Add Set child capture, Wishlist detail, Batch Receipt, Ledger spot-price update. **Year picker (fixed in a follow-up):** `selectYear()` sets the Year with an untrusted `input` event, so a year chosen through the Add Coin Year picker was never counted by the guard. It now calls `markAddCoinUserEdit(input)` first (captures the box's baseline, marks it touched), so a picked year is a change on a new coin and on a Staging edit, and picking the loaded year back is clean. **Pre-existing, unchanged:** a SerNo edit that changes only leading zeros ("00123" vs "123") is a change here but the write layer's own diff (`cellsEqual`) treats the numbers as equal, so it would stamp the row and write nothing else.
- Tests: `verify_save_only_when_changed` (64 incl. the self-check pair). Edit Coin A1-A14, B1-B4, C1-C3; Edit Set D1-D5; Manage Photos E1; new coin F1-F2; Staging edit G1-G8, H1-H4; Year picker I1 (and H3, J5); deep links J1-J6; Add Set checklist deep link K1-K3; call-site isolation G8a-G8f and L1-L7. Existing suites updated to follow the design: verify_cacbean_and_value_rounding (C3), verify_status_exit (C5, E6 and J2 after it), verify_photo_label_save (the `save()` helper, S5b, L11e), verify_photos_wait_for_save (`save()` helper). Negative controls: see docs/HISTORY.md.
- Not verified on a real device.

## Receipts wait for Save (task x, built 31 Oct 2026 on `claude/receipts-wait-for-save`, code `939c1d3`, merged to main 31 Oct 2026 by fast-forward to `da1c19e` after Ray's 8 tablet checks on TEST passed)
Backlog (x), Ray's answers 31 Oct 2026. Edit Coin and Edit Set only; Add Coin / Staging-draft receipt, Wishlist and Batch Receipt are unchanged (not in `receiptCommitTargets`).
- **The rule: a receipt picked on Edit Coin / Edit Set is held in memory and written only by Save Changes.** `holdPendingReceipt()` (called from `wireMockPhotoSlot`'s `handleFile` for both PDF and photo picks) moves the prepared PDF into `pendingReceipts[CollectionID]` (`prepared`, `replaces`, `landedName`, `saving`, `error`, `refused`). Nothing uploads or writes on pick, redraw, visibilitychange or pagehide. Only when `photoCommitTargetId(id)` is true (owned record, write layer on); otherwise the file just sits in `receiptFiles` as before and nothing is counted. `commitReceiptForSlot()` is gone (nothing commits on pick any more).
- **Counted everywhere (z) counts:** `unsavedEditsForView()` sets `c.receipts = pendingReceiptCount(id)` ("1 receipt" in the Discard dialog); `photoEditsPending()` includes it; `discardUnsavedPhotoEdits()` calls `discardPendingReceipts()` FIRST (so the photo discard's Save-state refresh already sees it gone); `prepareReceiptSlotForRecord()` drops a record's leftover pick on open. `refreshEditSaveState()` is called after a pick (both branches), after ✕ / Put it back and (via discard / `withEditSaveLock`) everywhere else; each has a test (H1, H1b, H2, H3).
- **Save order: coin fields (conflict check), CoinID re-link, photo adds/replaces, photo removals, photo labels, then the receipt** (`savePendingReceipt()`, the last step of `savePhotosAndLabels()`, which now returns `{photos, labels, receipt}`). A field conflict or failed field save writes nothing else. After that photos, labels and the receipt are independent: one failing does not stop another. A receipt-only change on Edit Coin takes the labels-only path (the coin row is not written: no LastModified, no Reviewed blanking). Toast: `photoSaveSummaryText` adds "receipt added / replaced / attached (RC-nnnnn)"; "that receipt is already on file, nothing to change" when nothing was written; failure text "Receipt not saved (reason) … Tap Save Changes again." or "Receipt not changed: …" for a refusal. `photoEditsAllSaved()` includes it, so the form stays open on a failure.
- **`commitReceiptCapture(collectionId, prepared, opts)` (receipts-never-overwrite rules unchanged) gained three things:** a coin with 2+ Receipts rows is REFUSED before any upload (`err.multiRow`; the message names the coin; `writeReceiptRow` replaces the first row while the app shows the last, backlog (j)); a same-document pick whose own row already has that ReceiptID and filename writes nothing (`res.unchanged`, DateAdded kept); `opts.landedName` / `opts.onUploaded` let a retry after "file landed, row write failed" reuse the landed file (bytes re-checked) instead of uploading `_02`.
- **The slot (ids `browseEdit…` / `editSet…`: `ReceiptStored`, `ReceiptRemoveBtn`, plus the existing preview, buttons and status note):** shows "On file: <name>" (tap opens `openReceiptInViewer`) or "No receipt on file"; a pending pick shows its preview, "Not saved yet: tap Save Changes to save it." (adds "It replaces the receipt on file." when one is), a muted "On file (replaced when you save)" line and the ✕. `repaintReceiptSlot()` draws it from state.
- **✕ appears only on a pending pick** *(changed by alignment Build 2: it also shows on a stored receipt, as a double-checked removal)*. Over a stored receipt it is an UNDO ("Put the previous receipt back?", Cancel / Put it back, nothing deleted); a pick pending past an earlier pick still undoes to the STORED receipt. With nothing stored it asks "Remove receipt?" (writes nothing) and drops the pick. **There is no way to remove a stored receipt** (Ray 31 Oct: backlog (af)); the old "↻ Retry upload" button is gone for these slots (Save is the retry).
- *(Superseded by the receipts and photos alignment, Build 1: All.Receipt is no longer read at all, the coin's FIRST Receipts row is the receipt, and "Binder" is a Receipts row.)* **What the slot and the detail page show (`storedReceiptFor`):** the Receipts row wins WHENEVER one exists for the coin (all 121 coins with a Receipts row also carry the same name in All.Receipt, but the app never rewrites that column, so after a Replace they differ); All.Receipt is only the fallback for a coin with no Receipts row (25 coins; result flagged `legacy: true`), and "Binder" there is no file. A pick on such a coin creates a Receipts row (first blank row, new ReceiptID) that then wins; the old file and All.Receipt are untouched. `syncStoredReceiptIndexUpsert()` updates `LIVE_RECEIPTS` after a Save, so the detail page is right at once (the part of (x) that said it was not).
- **Left alone on purpose:** the slot stays inside Photos (not Purchase Details); Camera / Library buttons (no shared chooser, no Files button: (y), (e)); no conflict check against a Copilot edit of the coin's Receipts row since the form opened (photos have none either); a pick whose bytes equal the stored file still counts as a change (Save then reports it is already on file); a legacy-only coin that picks its own All.Receipt file again uploads a `_02` copy (no row claims the name; the receipts-never-overwrite stray-file rule; the fix is alignment Build 2).
- Tests: `tests/verify_receipts_wait_for_save.js` (85 incl. the self-check pair): A pick held, B Save (receipt-only, order, same document, attach, shared id, blank row, taken name), C Discard, D change-then-undo, F partial failure (upload fails, row fails after upload, photo fails, field conflict, 2+ rows), G Edit Set, H refresh call sites, I Receipts row over All.Receipt (both cases), J other slots / write layer off, M layout. Negative controls (each run on the suite): pick commits at once (23 fail, suite throws); receipt not counted by `unsavedEditsForView` (28 fail); undo does nothing (6); landedName not passed (1, F3b); receipt saved before photos (1, B2b); All.Receipt wins over the Receipts row (6, I1a / I1b / I2 / I4c plus F7a / B1f); same document rewrites the row (2); 2+ rows not refused (2); no refresh after a PDF pick (25) and after a JPEG pick (1, H1b); no refresh after Put it back (5); Discard not dropping the receipt (4); Discard after the photo refresh (1, H3).
- Not verified on a real device.

## Receipts and photos alignment, Build 1 (merged to main 31 Oct 2026 by fast-forward to `6a21b60`, built on `claude/receipts-photos-alignment`, code `e38e921` + `62cb911`)
Backlog (p), part of (af), (j). One line: the Photos and Receipts tabs are the only record; the old All media columns are never read for display and never written (Copilot has since made them formulas over the tabs); a coin's receipt is its first Receipts row; "Binder" is a Receipts row (paper receipt, not scanned); Docket rows for 2+ receipts and for drift. Passed Ray's device tests on TEST (T1, R1-R3, T4-T10). Background (the workbook check that removed the "Move across" step), the Build 78 finding, the tests and negative controls: docs/HISTORY.md.
- **Standing rule: the Photos and Receipts tabs are the only record of a record's photos and receipt.** The app does not read the old All media columns (Obverse, Reverse, Obverse_Original, Reverse_Original, Photo3, Photo4, OGPPhoto, Receipt) for display anywhere: `mapWorkbookRowToCoin` no longer sets `obversePhotoFile` / `reversePhotoFile` / `receiptFile` / `hasObversePhoto` / `hasReversePhoto`; `storedPhotoFilename`, `hydrateStoredPhotos`, `coinMissingPhoto`, `purgeablePhotosFor`, `storedReceiptFor` and the detail page read the tabs only. Removed: `legacyStoredRowsFor`, `legacyFallbackFilenameFor`, `looksLikeReceiptFilename`, `hasStoredPhoto`, the whole `legacyOnly` class (the "Can't remove this one" dialog, the "keeps showing from there" notes, the Purge legacy refusal and skip, `PHOTO_LABEL_LEGACY_TEXT` / `.gc-label-legacy`). A coin named only in the old columns now has no photo / receipt in the app (it shows in the Docket's "Missing photo"; Purge treats it as a no-photo coin). `hasObversePhoto` survives only on the offline demo rows (FAKE_COINS).
- **The media columns are never written, under the old or the new names** (`ALL_MEDIA_COLUMNS_OLD`, `ALL_MEDIA_COLUMNS_NEW`, `ALL_MEDIA_COLUMNS` are on `ALL_NEVER_WRITE_COLUMNS`), and `allSheetRowIsBlank` skips them like SpotValue / Total, because once Copilot turns them into formulas a blank row can show something there. After Build 1 is LIVE, Copilot turns them into formulas over the tabs and renames them: Obverse, Reverse, Holder_Front (was Obverse_Original), Holder_Back (was Reverse_Original), References (was Photo3), COA_Photos (was Photo4), OGP_Photos (was OGPPhoto), a new Other_Photos, and Receipt. The app works with the old names, the new names or the columns missing. All writes to All happen in exactly six functions (`saveCoinRowToWorkbook`, `writeCoinIdCell`, `writeNewRowKeyCells`, `createAllSheetRow`, `writeOriginSetIdCell`, `writePurgedCell`), all column-specific; the Ledger writes only Ref_SpotPrices, Batch Receipt writes nothing, Add Set / Staging write no All row.
- **Receipts: a coin's receipt is its FIRST Receipts row** (`buildReceiptIndex` keeps the first, the row `writeReceiptRow` changes; it used to keep the last), with `rowCount`. A coin with 2+ rows is still refused on Save (`ownReceiptRowOrRefuse`, shared by `commitReceiptCapture` and `commitBinderReceipt`). One purchase receipt per coin for now (grading receipts: backlog (ag)).
- **Binder = a Receipts row whose Filename is exactly "Binder"** (any case, trimmed, no extension; `isBinderReceiptName`, `BINDER_RECEIPT_FILENAME`), with its own ReceiptID: a paper receipt not scanned. **One wording everywhere a Binder receipt shows, stored or pending** (Ray, device test T2/T3, `62cb911`; `BINDER_RECEIPT_TEXT`): "Not scanned (paper receipt in binder)" on the detail page (`#detailReceiptBinder`, plain text), in the Edit Coin / Edit Set slot (nothing to tap), the Add Coin / Staging slot and Add Set. It replaced "Binder (not scanned)" and "Paper receipt in the binder (not scanned)". Never opened or fetched (`openReceiptInViewer`, `ensureReceiptBytes`, `getCachedReceiptWebUrl` return early). The filename checks ignore Binder rows (`receiptFilenameIsFree`, `findExistingReceiptByFilename`, `receiptIdUsedByOtherCoin`, `commitReceiptCapture`'s same-name row). Scanning over a Binder row replaces that row and KEEPS its ReceiptID (Ray's Q7), even if other coins' Binder rows share it (they still say Binder).
- **The button "📒 Not scanned, paper in binder" in every receipt slot** (`.receipt-binder-btn`). **It shows ONLY while the slot has no receipt at all** (Ray, `62cb911`): hidden over a stored scan, a pending scan, a stored Binder and a pending Binder (Edit slots: `binderReceiptOffered(pending, stored)`; Add Coin / Staging: `repaintAddCoinReceiptSlot`; Add Set: hidden after a file pick and on resuming a draft that has a receipt file or a Binder). The pick functions refuse in the same cases even if called directly. So a Binder pick never replaces a stored scan; removing a wrong scan is Build 2's ✕. Edit Coin / Edit Set (`pickBinderReceipt`): a pending pick (`pendingReceipts[id].binder`, `prepared: null`, `replaces: null`) counted like a file pick (leave guard, (z) dimmed Save, Discard), "Not saved yet: tap Save Changes to save it.", ✕ drops it ("Remove receipt?"); a scan picked over a stored Binder says "On file (replaced when you save): Not scanned (paper receipt in binder)" and ✕ puts the Binder back. Save writes a Binder row (`commitBinderReceipt`: this coin's own row if it has one, else the first blank row; a NEW ReceiptID minted in the lock; today's DateAdded; already Binder writes nothing); other coins on the old ReceiptID and the old file are untouched; toast "receipt set to the paper copy in the binder (RC-…)". Add Coin and the Staging-draft edit (`addCoinBinderPick`, `pickAddCoinBinderReceipt`, `repaintAddCoinReceiptSlot`, `onAddCoinReceiptRemoveClick`, `#addCoinReceiptStored`): the draft records `receiptBinder: true` (a file always wins); a Staging edit shows "Replaces … when you save." for a scan picked over a stored receipt, and ✕ over a stored receipt is now an UNDO (it used to take the stored receipt off too); ✕ with nothing picked still takes the stored one off at Save (its file is deleted then, as before, even if Binder is then picked: the button only appears after that ✕); ✕ now also shows on a new coin once a receipt is picked. Add Set (`addSetReceiptBinder`, `pickAddSetBinderReceipt`): saved on the Set draft (`receiptBinder`), no leave guard (Add Set is not guarded, (ab)). Promotion (`recordPromotedCoinRecords`, `recordPromotedSetRecords`) writes the Binder row through `commitBinderReceipt` (a re-run writes nothing more). Wishlist and Batch Receipt: not touched (no CollectionID).
- **Docket rows (Other / Requires Photos), no Dismiss, a tap opens the coin's detail page:** (a) a coin with 2+ Receipts rows (`storedReceiptRowCount`); (b) drift (`allMediaDriftFor`, `ALL_MEDIA_DRIFT_RULES`): a NEW-named All media column whose value differs from the tabs, one row per column, naming the column and both values. Obverse / Reverse / Holder_Front / Holder_Back = the first matching Photos row's Filename (Slab_Obverse / Slab_Reverse for Holder); References / COA_Photos / OGP_Photos (OGP, OGP_Obverse, OGP_Reverse) / Other_Photos = all matching Filenames joined "; " in table order; SubGroup rows feed nothing; Receipt = the first Receipts row's Filename. Trimmed, case ignored, both blank = match, an error such as #N/A is drift. Checked only once a new-only header (Holder_Front, References, COA_Photos, OGP_Photos, Other_Photos) is on All (`allMediaColumnsRenamed`), only with both tabs loaded, and never for a record whose photos / receipt this session changed (`mediaChangedThisSession`: its All cells are stale until a reload). Old-named columns are ignored. `mapWorkbookRowToCoin` keeps the new-named cells as `coin.mediaCells` (`allMediaCellsFromRow`) only for this.
- **Left alone on purpose:** the slot stays inside Photos ((x)); the Add Coin / Staging slot stays old-style ((y)); Add Set's slot still shows no stored FILE on resume (only a stored Binder); there is still no way to remove a stored receipt *(done in Build 2)*; a hand-made Purge call on a coin with no Photos rows ends with Purged=Y (unreachable from the UI, which takes the zero-photo "Mark purged" path); drift rows refresh only when the Docket re-renders after a load; the `_02` copy on re-picking a file already in CoinReceipts with no row (Build 2).
- Not verified on LIVE (deploy in progress, 31 Oct 2026), nor the drift rows against the real formulas.

## Receipts and photos alignment, Build 2 (built 31 Oct 2026 on `claude/receipt-remove-and-shared-replace-w1cf1j`, code `1795746` + interim naming `d56e295`, merged to main 31 Oct 2026 by fast-forward to `28e5d5d`; deployed to LIVE in `d61f1dd`)
Backlog (af), Ray's answers Q1-Q8 on 31 Oct 2026. Edit Coin and Edit Set only; Add Coin / Staging-draft edit, Add Set, Wishlist and Batch Receipt are unchanged. Display and Receipts-tab writes only: the All sheet is never touched (its Receipt column is a Copilot formula over the tab).
- **1. Remove a stored receipt.** ✕ now shows on a stored receipt (scan or Binder) when nothing is pending (`repaintReceiptSlot`; only for an owned record with the write layer on, `photoCommitTargetId`). `onReceiptRemoveClick` sends a pending pick to the old undo / drop dialogs and a stored receipt to `confirmRemoveStoredReceipt`, which ALWAYS asks: title "Remove this receipt from this coin?", Cancel / Remove. Shared: "This receipt is on N other coins. <ReceiptID> · <filename>." then "Remove it from this coin only? The other coins keep it, and the file isn't deleted." Not shared: "<ReceiptID> · <filename>." then "Remove it from this coin? The file isn't deleted." (Binder: no file clause; its name reads "Not scanned (paper receipt in binder)".) N is `receiptSharingFor()`: a FRESH read of the Receipts tab, the session index when the read fails (the dialog then says the count may be out of date); it counts distinct other coins carrying the ReceiptID. Confirming only makes it PENDING (`makeRemovalPending`: `pendingReceipts[id] = {remove: true, prepared: null, replaces: the stored receipt}`), so `pendingReceiptCount`, the leave guard ("1 receipt"), the (z) dimmed Save and Discard all see it. The slot then says "Will be removed when you save.", hides the ✕, shows "↩ Put it back" (`putBackRemovedReceipt`, ids `browseEditReceiptPutBackBtn` / `editSetReceiptPutBackBtn`, no dialog, nothing was written) and the Binder button is offered again (`binderReceiptOffered` treats a pending removal as an empty slot).
- **Save of a removal** is the last step of `savePhotosAndLabels` as before (`savePendingReceipt` -> `commitReceiptRemoval`): re-reads the sheet; `ownReceiptRowOrRefuse` refuses a coin with 2+ rows (toast "Receipt not changed: …", still pending); refuses when this coin's row no longer says the ReceiptID / filename the user chose to remove (`err.refused`, nothing blanked; my addition, not in the brief); a row already gone writes nothing ("that receipt was already removed, nothing to change"); otherwise it blanks ONLY this coin's row with `patchRecordRow(…, {})` (like `detachPhotoRow`, so the row returns to the blank-row pool) and syncs `syncStoredReceiptIndexRemove` (`mediaChangedThisSession` too). It never blanks by ReceiptID, never touches another coin's row and **never deletes a file** (no `deleteItem` call exists on this path). Toast "Saved AY-nnnnn — receipt removed from this coin (RC-nnnnn)."
- **Combining a removal with a new pick (Q6).** A scan picked after a pending removal is a Replace of the stored receipt (`replaces` = stored, `afterRemoval: true`; the shared dialog applies); its ✕ asks "Take this pick off?" and goes back to the pending removal, and Put it back then restores the stored receipt. A Binder picked after removing a scan replaces that scan (`commitBinderReceipt`: this coin's row, a new ReceiptID; other coins untouched; no scope dialog). Binder removed then Binder picked again cancels the removal (nothing pending).
- **2. Replace of a shared receipt.** What happened BEFORE this build (reported to Ray): a scan over a receipt other coins share already behaved as "this coin only" with no choice: the new file uploaded under a free name, this coin's row got it with a NEW ReceiptID, the other coins kept the old id and file; an unshared receipt kept its id; the same bytes = "already on file". Now `holdPendingReceipt` -> `askSharedReceiptScope` asks at PICK time, every time (a second pick asks again; Cancel drops the pick and goes back to whatever was pending before it): "Replace a shared receipt?", "<ReceiptID> · <filename> is on N coins." (N includes this coin; fresh read, index fallback), buttons "Replace on all N coins" (primary) / "This coin only" / Cancel. The choice is stored on the pending pick (`scope` "all" | "this", `scopeCoins`) and shown in the slot ("It replaces the receipt on all N coins." / "… on this coin only."). No answer (dialog replaced) reads as this coin only. A stored Binder, an unshared receipt and a Binder pick ask nothing. Even the same document asks (Q8); at Save the same-document check wins ("already on file", nothing written).
- **`commitReceiptCapture(…, { scope })`.** "all" applies to the rows that carry this coin's ReceiptID AT SAVE (fresh read), non-Binder, other coins only: each gets the new Filename and TODAY's DateAdded (Q3) and keeps its ReceiptID and CollectionID (`buildPhotoRowPatch` + `patchRecordRow`, one row at a time after this coin's own row); rows of any other ReceiptID are never touched, even ones with the same Filename. Result: `scope: "all"`, `coins` (the real number), `otherCoinIds`, `keptIdOver`. The session index follows for every coin on the receipt. Toast "receipt replaced on N coins (RC-nnnnn)". **Q4:** if the picked bytes are already filed under a DIFFERENT ReceiptID (RC-2), the rows keep their own id and point at that existing file, nothing is uploaded and nothing is merged; the toast adds ", RC-1 kept; that file is also RC-2's". A failed Save keeps the pick and its choice; the retry finishes the remaining rows (the landed file is reused, one upload in total). "This coin only" and no choice are the old rule (a shared id is not followed onto the new file; a fresh one is minted). Old files are never deleted.
- **3. The `_02` fix.** When the candidate name (the picked PDF's own name, or `{CollectionID}_receipt.pdf` / `{ReceiptID}_receipt.pdf` per item 4 below) already exists in CoinReceipts, no Receipts row claims it, and its bytes equal the pick (`sameFileBytes`), the file is reused: no upload, a new ReceiptID (`res.adopted`). Different bytes still take the next free name. Candidate name only, plus this coin's own stored file (item 4): no folder scan by bytes. Under "Replace on all" the rows keep their id instead.
- **4. File naming for NEW receipt files (Ray, 31 Oct 2026: the INTERIM rule, in force until Batch Receipt is designed and built; Edit Coin and Edit Set only).** A photographed or camera receipt has no usable name. Before Build 2 it became `{CollectionID}_receipt.pdf`, so after "Replace on all N coins" six coins showed one coin's name. Rule (`storedReceiptFilename(collectionId, prepared, naming)`, called from `commitReceiptCapture`): (a) a picked PDF keeps its own real name, a generic one such as `scan0001.pdf` included, in every case; (b) a photo whose receipt ends up attached to TWO OR MORE coins at once, i.e. "Replace on all N coins" with N of 2 or more (`allMode`), is `{ReceiptID}_receipt.pdf`, so the name does not point at one coin; (c) every other photo is `{CollectionID}_receipt.pdf`, "This coin only" on a shared receipt included (one coin, a new ReceiptID). **Files already in the folder are never renamed.** Collisions work as before: same bytes = reuse / "already on file", different bytes = the next `_NN` (`RC-00030_receipt_02.pdf`, `AY-00092_receipt_02.pdf`).
  - **Seller and purchase date play NO part in the slot flow.** The helpers built for the first version are kept, unit-tested (N1 in `verify_receipt_file_naming`) and UNUSED by the slot flow, for Batch Receipt, which will save a file once under seller + date and keep that name when a coin later links to it: `cleanSellerForFilename` (accents dropped, split into words at whitespace, non-letters/digits removed from each word, the FIRST letter of each word capitalised and the rest left as typed, joined with no separator: "finders keepers" -> FindersKeepers, "eBay" -> EBay, "AUCTIONS" stays "AUCTIONS"; at most `RECEIPT_SELLER_MAX_CHARS` = 40; "" counts as missing), `receiptPurchaseDatePart` (a real YYYY-MM-DD only), `receiptSellerDateName` (`Seller_YYYY-MM-DD_receipt.pdf`, "" when either is missing), `receiptIdFallbackName`. The hand-made files they follow: `CharlestonCoinExchange_2026-10-02_receipt.pdf`, `FindersKeepers_2026-06-27_receipt.pdf`. **Batch Receipt itself is still a placeholder (its Save only toasts); it names nothing today.**
  - **No ReceiptID is minted before an upload.** The multi-coin case always has an existing id (every row on the receipt keeps it, `keepId`), so there is nothing to mint early; a single-coin receipt mints inside the table's lock after the upload, as in the first Build 2 commit. (An earlier version of this task pre-minted the id for an id-named fallback; that code is gone.) The PH-00129 protection (`nextRecordId()`'s per-session floor `lastMintedIds`, ids minted inside the lock) is untouched; test N7 shows a failed upload reserves no number and a competing mint never repeats one.
  - **Q5, the second same-bytes check (kept).** `commitReceiptCapture` also compares the pick with this coin's OWN currently stored file when that file is not already the candidate (`ownFileSame`, one extra download), so re-picking what is on file stays "already on file" whatever it is called: a multi-coin `RC-nnnnn_receipt.pdf` picked again as "This coin only", an old name, or a picked PDF with another name but the same bytes (N6e, N6f). The candidate-name checks for another coin's identical file (attach) and for an unclaimed identical file (adopt, new ReceiptID) are unchanged.
  - `receiptFilenameLooksAppMade` (the early pdf.js load) now also matches `RC-nnnnn_receipt.pdf` and `RC-nnnnn_receipt_NN.pdf` (KEPT: the multi-coin names are app-made).
  - **Left alone on purpose (Ray): Add Coin, the Staging-draft edit and Add Set keep `{CollectionID}_receipt.pdf`** (their file names are fixed when the draft uploads and the ReceiptID is only minted at promotion). They wait for Batch Receipt. The six TEST coins that show `AY-00718_receipt.pdf` stay as they are.
  - Tests: `tests/verify_receipt_file_naming.js` (24 incl. the self-check pair): N1 the helpers (N1a / N1a2: lowercase words, mixed case kept, an accented first letter; N1e the interim `storedReceiptFilename`; N1f the app-made test), N2 a coin WITH seller and date still gets `{CollectionID}_receipt.pdf` (and edited seller/date change nothing), N3 no seller/date and "This coin only", N4 Replace on all 3 coins = `RC-00030_receipt.pdf` on every row with no id minted, N5 a picked PDF keeps its name in every case, N6 already on file / `_02` as before / own stored file under another name, N7 no early mint. Negative controls, each run and failing: a multi-coin photo named for the coin (N4a); a single-coin photo named by ReceiptID (N3b, N6c); a photo given a seller + date name (6 fail); a picked PDF renamed (N1e, N5a); an early mint reinstated (N7b); the Q5 check off (N6e, N6f); capitalisation removed, accents kept, date not validated, the old app-made pattern (N1a/N1a2, N1a/N1a2, N1b, N1f). The assertions the first naming commits had changed in `verify_receipts_never_overwrite` (E1, E2, E3's lookup, E7, F6) and `verify_photo_receipt_write` (G5) are back to their pre-naming wording (the interim rule keeps `{CollectionID}_receipt.pdf` for a single coin), so those two suites have no naming-related change at all.
- **Left alone on purpose:** photos (their ✕ already existed); no conflict check against a Copilot edit of a Replace (only the removal checks its row); the slot stays inside Photos ((x)); nothing for Add Coin / Staging / Add Set; the Docket rows from Build 1 are unchanged; a Purge call still never touches Receipts.
- Tests: `tests/verify_receipt_remove_shared_replace.js` (51 incl. the self-check pair): R1-R22 (remove: dialogs, pending, Put it back, Save blanks only the one row, other rows / ReceiptIDs untouched, no delete, blank row reused, Binder, Edit Set, leave guard / Discard, 2+ rows, row changed, row gone, the Q6 combinations, fresh count and index fallback), S1-S16 (shared Replace: ask, Cancel, this coin only, all with Filename + DateAdded on every row, other ReceiptID with the same Filename untouched, toast, index, asked each time, same document, failed Save and retry), Q4a-b, U1-U4 (the `_02` reuse). Existing suites updated to follow the design (the ✕ now shows on a stored receipt): `verify_receipts_wait_for_save` A2, C4, C6, D1, D4; `verify_receipts_photos_alignment` B3. **Negative controls, each run on the new suite and failing:** blank by ReceiptID (R7, R9); a file delete called (R8, R14, R16); the pending count removed for a removal (14 fail); "replace on all" selecting rows by Filename as well (S8, S10, S16); the `_02` reuse off (U1, U2, U4); the removal using the first row instead of refusing 2+ (R18); DateAdded left off the other rows (S7); the kept ReceiptID following the existing file's (Q4a, Q4b).
- **Not verified on a real device:** everything above. Suggested checks for Ray on TEST: (1) ✕ on a stored scan asks, Cancel keeps it; (2) Remove, then Put it back, Save stays dimmed; (3) Remove, Save: the receipt line is gone from the detail page, the file is still in CoinReceipts; (4) a shared receipt (RC-00001's three coins): ✕ names "2 other coins", and after Save the other coins still show it; (5) pick a scan on a shared receipt: the three-button question, try each; (6) re-pick a file that is already in CoinReceipts with no row: no `_02` copy.

### Photo / receipt write layer — Photos & Receipts tabs (BUILT and merged to main)
Ray reviewed this whole feature (the write layer itself plus every
live-device follow-up round below — Replace, Adjust's fallback, circle
framing, Trash confirmation, and the gallery viewer fix) and gave explicit
go-ahead to merge as-is, no changes. `claude/photo-receipt-write-layer` has
no commits of its own that aren't now in main's history — **main is the
source of truth for this whole feature**, same standing as every other
merged-after-holding branch in this file.

The gallery/crop UI has produced real Blobs and real filenames since it was
built and then dropped them into an in-memory store, so **every capture
outside Add Coin's own Staging flow vanished on reload**. And **nothing in
the app had ever written a row to the Photos or Receipts tab** — so even
the files Add Coin genuinely did upload landed in CoinPhotos/CoinReceipts
with nothing in the workbook pointing at them. This connects the
already-proven `graph().uploadFile()` plumbing to the newer UI and adds the
workbook half.

**Audit first — what was real vs. stub, read from the code (this corrects
several assumptions a reader would draw from this file's own history):**
- **REAL already**: Add Coin's photos (`uploadCoinDraftPhotos()`) and
  receipt (`uploadCoinDraftReceipt()`) into the Staging draft folder, moved
  to CoinPhotos/CoinReceipts on promotion; Add Set's whole-set photo and
  receipt via `uploadDraftPhoto()`.
- **STUB**: Edit Coin / Edit Set / the standalone Manage Photos screen, for
  photos AND receipt — `buildPhotoPairSlot()`/`manageOpenEndedBlock()`/
  `initGalleryCapture()` all called `addGalleryEntry()` and nothing else.
  Wishlist (all four slots) and Batch Receipt. Add Set's own gallery
  (OGP/COA/other/sub-group) except the single OGP-front → `addSetPhotoFiles
  ["whole"]` mirror.
- **`receiptFiles` had exactly ONE consumer** (Add Coin's). Browse Edit's,
  Edit Set's, Wishlist's and Batch Receipt's entries were written and never
  read by anything.
- **The read side was thinner than "repoint" implies.** `All.Obverse`/
  `Reverse` were read ONLY as booleans (`hasObversePhoto`/`hasReversePhoto`,
  consumed only by `coinMissingPhoto()`); `All.Receipt` was not read at all
  (the detail page's Receipt row read the `FAKE_COIN_DETAILS` demo lookup);
  and **no coin's own stored photo was ever displayed anywhere** —
  `applyDiscContent()` went from a just-captured session blob straight to
  the SERIES reference image. So Task 3 wasn't a repoint, it was building
  that display path.

**Workbook facts this was built against (read directly from the 2026-09-05
upload, not assumed):**
- **Photos and Receipts are real named Excel tables**, so `addTableRow()`
  can target them: `Photos` `A1:G1030` (PhotoID, CollectionID, PhotoType,
  SubGroupID, Filename, Label, DateAdded) holding **29** data rows;
  `Receipts` `A1:D1073` (ReceiptID, CollectionID, Filename, DateAdded)
  holding **85**.
- **BOTH overrun their data exactly the way `AllCoins` does** — ~1000 and
  ~987 blank rows sit inside their refs — so appending would drop new rows
  a thousand rows past everything else. This is the same bug class
  `createAllSheetRow()`'s claim-a-blank-row fix exists to prevent, and one
  Receipts row (RC-00009 / AY-00706) is already sitting at row 1073 as
  evidence of what appending does here.
- PhotoTypes in real use: Obverse, Reverse, Slab_Obverse, Slab_Reverse,
  Reference. All filenames `.jpg`. Repeatable naming is
  `AY-00207_reference_01.jpg`.
- `All.Receipt` (103 rows) vs Receipts (85): the 18-row difference is
  entirely the literal string **"Binder"** — a placeholder meaning the
  paper receipt hasn't been scanned, **not a filename**.
- `All.Obverse` (5 rows) vs Photos Obverse (4): `AY-00706` carries
  `AY-00706_slab_obverse.jpg` in its **Obverse** column with no Photos row
  — hand-entered, following the documented legacy overload pattern. So
  unlike receipts, the two photo sources do NOT fully agree, which is
  exactly why the legacy fallback is kept.

**Two naming conventions corrected against that data:**
- **`.jpg`, not `.png`.** Both crop stages bake through `canvas.toBlob(...,
  "image/jpeg", 0.92)`, so every file this layer has ever named has been
  JPEG bytes wearing a `.png` name. `GALLERY_FILE_EXT` is now `.jpg`.
  Files already uploaded to `_Testing/CoinPhotos` under the old names are
  orphans (no Photos row will point at one) — Ray's to delete by hand
  whenever convenient, not this task's.
- **Repeatable types use the full type word + a zero-padded 2-digit index**
  (`AY-00207_reference_01.jpg`), matching the sheet rather than inventing a
  second convention beside it. `reference`'s suffix went `_ref` →
  `_reference` and `other`'s `_photo` → `_other` (zero real files behind
  either).

**PhotoType vocabulary** (`GALLERY_TYPE_TO_PHOTOTYPE`, both directions):
the five real values matched exactly, plus `OGP_Obverse`, `OGP_Reverse`,
`COA`, `SubGroup_Obverse`, `SubGroup_Reverse`, `Other` in the same
Title_Case_With_Underscores shape. Ray may have Copilot record these 11 in
a `Lookup_PhotoTypes` tab; nothing here is built against one. *(A 12th,
"OGP", comes with open-ended Package / OGP; see C3 under "Photos wait for
Save".)*

**The write layer.** New Photos/Receipts module: header maps resolved from
the sheet's own header row at run time (`ensureSheetHeaderMap()`, cached
per sheet), id minting by max+1 over the table's own ID column, a
per-table creation lock, and **blank-row claiming** rather than appending.
- **`createAllSheetRow()` is deliberately NOT generalised.** It carries
  AllCoins-specific semantics this doesn't need — a key pair written
  through a narrow audited path, two live formula columns that must never
  fall inside a range, a duplicate-aware two-half verify, the promote lock
  — and it is the one write path that has been through three live runs.
  This copies its SHAPE, not its code. Photos/Receipts have no formula
  columns and contiguous columns, so a row here is one plain range PATCH.
- **"Blank" means every column empty**, not just the id — same rule and
  same reason as the All-sheet version.
- `DateAdded` goes through `excelSerialToday()` with an explicit
  `yyyy-mm-dd` number format, never ISO text.

**When a capture commits, and why the line falls there.**
- **A record that already exists on the All sheet** (Edit Coin, Edit Set,
  the standalone Manage Photos screen on an owned coin/Set) uploads to
  CoinPhotos and writes/replaces its Photos row **immediately on capture**.
  Immediate rather than on Save because the standalone screen has no Save
  button at all. `photoCommitTargetId()` is the gate; the ownership check
  (`activeCoins()` / `FAKE_SET_CHILDREN`) is the enforcement, the
  `AY-#####` regex only a cheap early-out.
- **Draft-backed flows are unchanged.** Add Coin and Add Set capture
  against records with no All row yet; writing straight to CoinPhotos would
  put a coin's photos in their final home before the coin exists and strand
  them if the draft were rejected. Those get their rows **at promotion**,
  once the files have verifiably landed —
  `recordPromotedCoinRecords()` / `recordPromotedSetRecords()`.
- **A single-instance type REPLACES its row** (one row per CollectionID +
  PhotoType + SubGroupID) so a re-capture can't accumulate near-duplicates
  a "show all photos" read would render twice; repeatable types add.

**A failure is loud and loses nothing.** This is a phone flow on a
possibly-flaky connection, and silently dropping a capture would recreate
the exact "photo vanished" problem the whole layer exists to fix. On
failure the entry stays in the gallery **with its Blob intact**, the tile
shows "Not saved — tap ↻" (`.photo-upload-state.failed`) alongside a real
retry control, and a toast names the file and the error. The retry
re-sends without re-capturing anything.

**Removing a photo detaches the ROW and never deletes the file.** Two
reasons, both pre-existing rules rather than preferences: the `_original`
raw is locked in as never-deleted by the crop-commit convention, and this
write layer deliberately has no delete primitive — claim-a-blank-row was
chosen for AllCoins specifically to avoid needing one. A blanked row simply
returns to the claimable pool, which is the same mechanism from the other
side.

**Receipts de-duplicate on filename — and one decision is what makes that
reachable at all.** A Receipts row is one (receipt × coin) pair and one
ReceiptID legitimately spans several rows (RC-00001 already covers three
coins) because Ray's normal pattern is several coins on one receipt. So
before minting anything, `commitReceiptCapture()` looks for an identical
Filename already on the tab and reuses that ReceiptID **and skips the
upload**. For that to ever fire, **an already-PDF pick keeps the picked
file's own name** (`sourceWasPdf`) rather than being renamed to
`{CollectionID}_receipt.pdf` — which is also the shape the real data
already has (`FindersKeepers_2026-06-27_receipt.pdf`). A **photographed**
receipt is inherently per-coin (and a camera's own filename is
meaningless), so it keeps `{CollectionID}_receipt.pdf`. Re-attaching to a
coin that already has one replaces that coin's row.
- **An "attach an existing receipt" picker was NOT built** — flagged to Ray
  as the better-still option rather than assumed. The filename dedupe is
  the minimum fix and is in.

**The read side.** Photos and Receipts are fetched alongside All/DB_Sets/
DB_Coins/Lookup_MetalContent/Lookup_Graders in `ensureLiveNavDataFetch()`
and indexed by CollectionID (`LIVE_PHOTOS`/`LIVE_RECEIPTS`; a null response
leaves the previous index in place rather than blanking the display).
- *(Superseded by the receipts and photos alignment, Build 1: no fallback, the Photos tab only; `looksLikeReceiptFilename()` is removed and "Binder" is a Receipts row.)* **`storedPhotoFilename()` reads the Photos tab first and the legacy flat
  `All.Obverse`/`Reverse` only as a FALLBACK** — which is what stops
  `AY-00706` (recorded only the old way) losing its photo. **The flat
  columns are never written and never cleared by this app**, per the
  explicit scope boundary; clearing them waits on a real-device
  confirmation that the repointed reads work.
- **A coin's own stored photo now displays**, via a new `CoinPhotos` fetch
  tier modelled on `fetchReferenceImageBlob()` (GET-only, raw bytes → a
  same-session blob URL, one real request per filename, and the same
  attempted/not-attempted rule so a no-token failure retries after sign-in
  instead of caching "no photo" forever). Wired as a tier in
  `applyDiscContent()` **ahead of the series reference image** — an actual
  photograph of this coin beats a generic picture of its series — and into
  `renderSlotCell()` (Albums), which inherits that surface's existing
  picks-up-on-next-render tradeoff since it is string-templated.
- **`coinMissingPhoto()` reads the Photos tab first too**, so a coin whose
  photos all came through the new layer doesn't keep nagging in the Docket
  just because the retired flat column was never backfilled.
- **The Receipt row on Browse detail reads the Receipts tab**, renders the
  filename immediately and upgrades itself to a real OneDrive link once
  that file's webUrl resolves. The old version linked a path that had never
  resolved to anything (a confirmed 404 — "a real link in markup only").
  **"Binder" and anything else without a file extension is never treated as
  a filename** (`looksLikeReceiptFilename()`); it renders as
  `Binder (not scanned)`, never as a link that could only break.

**A latent bug found and fixed on the way.**
`plannedCoinPromotionMoves()` iterated `draft.photos` as if it held bare
strings, but `uploadCoinDraftPhotos()` stores `{type, filename, caption}`
objects — so it concatenated an object straight into a path and would have
produced `.../[object Object]`. Never hit live only because the one live
promote run didn't exercise photos. Both shapes are accepted now.

**Out of scope, deliberately, all confirmed with Ray:**
- **Wishlist and Batch Receipt are untouched.** Neither has a CollectionID
  to key a row on (a wishlist item isn't owned; a batch receipt is
  explicitly "not yet tied to a coin"), and an untracked orphan file is
  worse than no file.
- No bulk backfill/migration script; the Containers tab; and no clearing of
  the legacy flat columns.

### Receipt photos auto-convert to PDF (locked in)
Every Receipt slot in the app — Add Coin, Browse Edit, Wishlist, Edit Set,
Batch Receipt, and Add Set's receipt slot, all six — auto-wraps a captured or
picked image (jpg/png) into a single-page PDF before it's treated as "the file
to store." **Naming convention updated**: `CoinReceipts/{CollectionID}_receipt.jpg`
is now `..._receipt.pdf` (see "OneDrive folder structure" above) — this
supersedes every earlier `_receipt.jpg` reference in this file.
- **Page size = the photo's own pixel dimensions, no forced US-Letter page, no
  re-flow.** A tall phone photo gets a tall page; a wide one gets a wide page.
- **Losslessly wrapped, not re-compressed.** A JPEG's original bytes are
  embedded byte-for-byte via the PDF's native `/DCTDecode` filter — zero
  re-encoding, so quality is bit-identical to the captured photo. A PNG has no
  equivalent native PDF filter, so it's decoded to raw pixels and re-packed via
  `/FlateDecode` (lossless deflate, via the browser's built-in
  `CompressionStream` — no library); inflating it reproduces the exact same
  pixels, the same lossless relationship a `.png` already has to its own raw
  data. EXIF rotation (JPEG only) is honored via the PDF page's own `/Rotate`
  entry rather than baking a rotation into the pixels, so the embedded bytes
  stay identical to the source while still displaying right-side-up. Only the
  four pure-rotation EXIF values are mapped; the four mirrored values (rare
  from a real camera) are left unrotated — a known, accepted limitation, same
  "not worth the tradeoff for a case that basically never happens" call as the
  no-dedicated-combined-image-splitter-tool decision elsewhere in this file.
- **If the picked file is already a PDF, it passes through completely
  unchanged** — no re-wrap, byte-for-byte the original file, just renamed to
  the standard `..._receipt.pdf` convention. Every Receipt slot's Library
  file input now accepts `application/pdf` alongside images so a PDF is
  actually selectable there (Camera inputs stay image-only, unchanged — a
  camera capture is inherently a photo, never a PDF).
- **No PDF library** — a minimal valid single-page/single-image PDF (a
  handful of objects + an xref table) is hand-written directly, matching this
  project's established self-contained/no-external-CDN posture (see the
  self-hosted-fonts and jsdelivr-not-default-MSAL-CDN notes above) rather than
  pulling in something like pdf-lib from a CDN for what's a small, well-
  defined file-format subset.
- **The on-screen preview is unaffected — still a live photo thumbnail**,
  exactly as before; the PDF wrap is a storage-format change, not a UI
  change. The one exception is the already-a-PDF pass-through case, where
  there's no image to preview at all — that slot shows a small "📄 filename
  attached" indicator instead (reusing the existing placeholder-icon element
  where one exists, or a small note appended into the photo-box where it
  doesn't, e.g. Add Set's plainer boxes) rather than leaving the box looking
  blank/broken.
- **Add Set's receipt slot is the one real end-to-end wire-up** — it already
  has a real write layer (`ENABLE_SET_WRITE_LAYER`), so its captured/picked
  file is prepared into a PDF Blob immediately and that's what actually
  uploads via `uploadDraftPhoto()`/`graph().uploadFile()` (Blob-safe already —
  confirmed `uploadFile(path, fileOrBlob)` never assumed a real `File`). The
  promotion file-move step (`plannedPromotionMoves()`) now derives the
  destination extension from the Staging filename itself instead of a
  hardcoded `.jpg`, so it stays correct regardless of what actually got
  stored there. **Add Set's whole-set photo (`wireAddSetPhotoSlot("whole", ...)`)
  is explicitly NOT a receipt and is untouched** — still a plain image, no
  PDF wrap; only the `"receipt"` key opts in (`isReceipt` param).
- **The other five slots (Add Coin, Browse Edit, Wishlist, Edit Set, Batch
  Receipt) have no real write layer yet — every Save there is still a stub**,
  per the hard constraint above. For these, the prepared PDF is stored in a
  new `receiptFiles` registry (keyed by the slot's preview element ID),
  ready-but-unconsumed — the same "build for a future consumer" posture the
  Add Set draft/reservation system already established. Nothing currently
  reads `receiptFiles`; whichever write layer eventually lands for these
  flows is what should consume it, at which point no further conversion work
  is needed — the PDF is already sitting there prepared.
- **A conversion failure never blocks the live preview or the capture
  itself** — wrapped in try/catch, same "a secondary feature can't take down
  the primary flow" posture as the reference-image MSAL-load-failure
  handling. Add Set's receipt slot falls back to storing the raw photo
  (renamed `receipt.jpg`) rather than losing the capture entirely if the
  wrap throws; the other five just leave `receiptFiles` unset for that slot.
- **Not verified against a real device/browser beyond this environment's
  Chromium** — `CompressionStream` (used for the PNG path) needs Chrome
  80+/Safari 16.4+/Firefox 113+; confirmed present in this environment's
  headless Chromium, but Samsung Internet's exact support window wasn't
  independently confirmed. Worth a real-device check, same "cannot verify
  from this environment" caveat as the Web Share API note elsewhere in this
  file — if it's ever missing on a real device, the try/catch means it fails
  quietly (no receiptFiles entry, or the Add Set raw-photo fallback) rather
  than breaking capture.
