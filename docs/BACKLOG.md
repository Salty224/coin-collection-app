# Reference: BACKLOG (moved out of CLAUDE.md in the (am) slimming, 4 Nov 2026)

Read this file when: choosing the next task or touching any backlog item. CLAUDE.md keeps one line per open item; this file keeps the full text.
Back to [CLAUDE.md](../CLAUDE.md). Sections below are verbatim from CLAUDE.md as it was at commit `a7fcb20`; the original line numbers are in [docs/INDEX.md](INDEX.md).

## Open backlog (Oct 2026) — recorded only, not built
*(Status updates since this section was written: (am) CLAUDE.md slimming is DONE (4 Nov 2026). (ai) LastModified date + time is DONE. New line: confirm ParkingLot rows 1, 3 and 4 were transferred to the workbook (see "ParkingLot entries to transfer" at the end of this file).)*
- (a) A newly promoted coin does not appear in the Catalog until the app is
  restarted. Plan only first, before any build.
- (b) The "Mark ready" toast still says the app doesn't write the All sheet
  ("Copilot moves the row across"); out of date since Promote and the direct
  write landed. *(Fixed; on main since 24 Oct 2026.)*
- (c) The Add Coin gallery has no per-photo Replace button. *(Closed 23 Oct 2026, on main: Add Coin uses Edit Coin's
  section, which has Replace.)*
- (d) A new obverse, reverse or receipt picked during a Staging edit shows
  its remove (✕) button only after the screen is redrawn. *(Photos closed 23 Oct 2026, on main; the receipt is unchanged.)*
- (e) Unified image chooser: C1 (coin screens) and C2 (Set screens) are on
  `main` (22 Oct 2026). Add Coin and the Staging-draft edit use Edit
  Coin's photo section, merged 23 Oct 2026 (closes (c) and (d)). Left:
  C4 (Add Set, Wishlist), C5 receipts only with his go-ahead.
  HEIC picked through Files is unverified on a real phone.
- (f) The Catalog Finish filter groups (`CATALOG_FINISH_GROUPS`) are fixed in
  code; the app does not load `Lookup_Finishes`.
- (g) *(Done: built 30 Oct 2026 on `claude/value-fallback-melt-label`, merged to main 30 Oct 2026
  by fast-forward; see docs/ref/LEDGER.md "Value fallback: melt is labelled" and the star
  rule in docs/ref/ALBUMS.md.)* Melt is labelled "melt" with the spot-price date (melt below face counts as face, not melt) on
  detail, share and Ledger; the Ledger keeps Valued, Melt and face-only apart; Sets get a
  Variety line (default "Standard"); album star: filled = Key Date / Key Variety, outline
  = Semi-Key Date, none otherwise. Display only.
- (h) Graded/reholdered coins: capture design (cost basis, grader, cert,
  slab photos, location). Questions-first. *(The cost-basis part, grading
  cost and the grading receipt, is now (ag).)*
- (i) The in-app image viewer's back gesture is unverified on a real
  phone/tablet.
- (j) Deferred receipt / Edit Coin bugs: a receipt file is left without a
  row if the Receipts append fails; the receipt index picks first-row versus
  last-row inconsistently; Edit Coin still shows a stale "Session-only"
  note; the receipt viewer can show an old copy after a same-name
  replacement. *(Status after alignment Build 1: first vs last row FIXED
  (the first row everywhere; 2+ refused and flagged on the Docket); the
  "Session-only" note was already fixed (`applySaveNote`); the same-name
  viewer copy cannot happen since receipts never overwrite (names are never
  reused; keep in mind for (aa)); file-without-row is handled within a
  session by (x)'s `landedName` retry, and after a reload by Build 2's
  `_02` fix.)*
- (k) Deploy workflow: upgrade its actions to Node 24 versions.
- (l) *(Done: C2 of "Photos wait for Save", merged to main 27 Oct 2026.)* Close Drawer / navigate should warn on any unsaved edit (all fields,
  Edit Coin and the other edit screens), not only Back. Today `navigate()`
  leaves silently and the edits (photo labels included) are discarded.
  Next branch, plan first (Ray, 23 Oct): the same "Discard unsaved edits?"
  dialog as Back.
- (m) *(Done: C1 of "Photos wait for Save", merged to main 27 Oct 2026.)* Photos on the
  edit screens wait for Save, the same as Add Coin's draft mode, instead of
  saving on capture; Discard undoes them; Manage Photos gets ONE Save button
  for photos and labels together (replacing "Save labels").
- (o) *(Done: C2 of "Photos wait for Save", merged to main 27 Oct 2026.)* Same next branch as (l) and (m) (Ray, 24 Oct): Close Drawer on Add
  Coin must warn before throwing away a half-entered coin. Today
  `navigate("addcoin")` resets the form (`resetAddCoinForm()`) and leaving
  by any route discards whatever was typed or picked, with no warning.
- (n) *(Done: C3, "C3: open-ended Package / OGP", merged to main 27 Oct
  2026.)* Package/OGP becomes open-ended
  (any number of photos, each labelled, e.g. Closed / Open) instead of a
  Front/Back pair. Needs a plan for the existing Front/Back Package photos
  (PhotoType `OGP_Obverse`/`OGP_Reverse`, Add Set's whole-set mirror, the
  Set's flip-photo fallback `setFlipPhotoUrl`).
- (p) *(Done by the receipts and photos alignment, Build 1, on `claude/receipts-photos-alignment`, held: the fallback and the legacyOnly class are gone; the All columns stay, are never written, and become Copilot formulas.)* Its own small branch, after C3 (Ray, 24 Oct): retire the All-sheet
  photo fallback. The app still reads the old flat All columns (Obverse,
  Obverse_Original, Reverse, Reverse_Original, Photo3, Photo4, OGPPhoto) when
  a record has no Photos row (`legacyStoredRowsFor`, `storedPhotoFilename`'s
  fallback, `legacyFallbackFilenameFor`), and the Remove dialog's note "this
  coin also has a photo recorded in the old All sheet columns". The 3 Oct
  workbook copy shows all 41 filenames in those columns also have Photos
  rows, so the fallback looks unneeded. Recheck against the CURRENT workbook
  first. The All columns themselves stay as history (never cleared).
- (q) After C4 (Ray's Q2, 26 Oct): once C4 moves Add Set onto the open-ended
  Package list, and a workbook check shows no OGP_Obverse / OGP_Reverse
  Photos rows remain (some DO exist on TEST today — AY-00463, 22 Oct — so
  they need moving to OGP first, or the mapping stays), retire the old-style OGP read mapping (`PACKAGE_TYPES`'
  `ogp_obverse`/`ogp_reverse`, `packageEntriesInOrder`'s Front/Back order,
  `packageDisplayLabel`, `packageSide` on Replace, `setFlipPhotoUrl`'s
  OGP_Reverse lookup).
- (r) The Edit Set saving and split build (queued, not started; 3rd in
  Ray's 27 Oct order). Order inside it: Edit Set saving (ALL fields, with a
  concurrent-edit conflict check like Edit Coin's snapshot), then splitting
  out child coins, then partial sales (selling part of a Set). Two items
  for it (Ray, 26 Oct): (1) "Coins in this Set" shows the Set's coin count
  and lists its coins, probably from DB_SetComposition; each line is replaced
  by Ray's own child coin once that coin has been split out. (2) Set notes:
  Edit Set's Notes box reads and writes the session-only details lookup, not
  the Set's All.Remarks (which its page shows), so it opens empty and its
  Save never reaches the page; and a Set's "Fun Fact" is always blank live
  (it looks in DB_Coins). Proposed labels, pending Ray: "My notes" (editable,
  All.Remarks) on coins and Sets; "Catalogue notes" (read-only: DB_Coins.Notes
  for a coin, DB_Sets.Notes for a Set); "Fun Fact" (read-only: DB_Coins.FunFact
  for a coin; for a Set, DB_Sets.KeyNotable or History, Ray to choose, since
  DB_Sets has no Fun Fact column). See "Round 2 after Ray's tablet test of
  `0a0cbd1`" for every column read today. **Ray's answer (26 Oct, round 3):
  yes to these labels, built in this build. A Set's Fun Fact display is
  hidden entirely (Set page and Edit Set, demo data included) until a real
  source exists.**
- (s) *(Folded into (aa) below, Ray 30 Oct 2026: do not plan it separately.)*
  "Keep the old photo?" on Replace of a fixed-name slot (Ray, 27 Oct;
  replaces the earlier `_Replaced` folder item). Applies to Obverse, Reverse,
  Holder front/back and a Set's whole-set / sub-group pairs. On Replace the
  user picks Keep as Reference / Keep as Other / Don't keep; like every
  other photo edit, nothing happens until Save. At Save the old file is
  moved out of the way FIRST: renamed to the chosen type's next numbered
  name with its own new Photos row, or (Don't keep) deleted to the OneDrive
  recycle bin. The new photo then takes the plain convention name: uploaded
  under a temporary name first, then renamed, so a failure never leaves a
  row pointing at a missing file. Guard against a cached old picture
  showing under the reused name (the session photo cache is keyed by
  filename). Plan first; until then Replace keeps today's free `_02` names.
- (t) *(Done: merged to main 28 Oct 2026, see "Receipts never overwrite".)*
  Receipts never overwrite (Ray, 27 Oct, his Q1 on the Replace fix), its
  own small branch. Today `commitReceiptCapture` uploads a new filename not
  on the Receipts tab with replace, and a photographed re-capture
  `{ID}_receipt.pdf` that IS on the tab skips the upload and keeps the old
  file. Same `NO_OVERWRITE` / free-name approach as photos.
- (u) Data fix, outside the app (Ray / Copilot): PhotoID PH-00129 is on two
  rows on TEST (AY-00212 Slab_Obverse and Slab_Reverse, 18 Oct). Also check
  LIVE's Photos tab for duplicate PhotoIDs: `main` / LIVE could mint them
  (id minted before the table lock, no session floor) until the 27 Oct
  merge. Nothing in the app writes this fix.
- (w) *(Done: merged to main 30 Oct 2026, code `7b56955` plus the undo `4589b46` and the failed-save cleanup `960634d`; see "Staging photo replace keeps the old file".)* Staging photo
  replace used to delete the old file; it now keeps it, like receipts.
- (x) Edit Coin receipts should match Add Coin (Ray, 28 Oct, his Q1/Q2 from
  the receipts retest). **Built 31 Oct 2026 on `claude/receipts-wait-for-save`
  (code `939c1d3`, merged 31 Oct 2026; see "Receipts wait for Save"): the receipt waits for
  Save like photos, the slot shows the stored receipt, and the detail screen is
  right after a receipt save.** Still open from (x): moving the Edit Coin /
  Edit Set receipt slot into Purchase Details (Add Coin already has it
  there). That is the only part of (x) still open.
- (y) The Staging-edit receipt slot needs the shared chooser (Ray, 28 Oct):
  it still has the old camera / gallery / ✕ icons, with no preview, no
  Replace and no Files button. Also (Ray, 31 Oct 2026): the receipt ✕
  should sit in the top-right corner like the photos' ✕ (today it is under
  the image). Backlog only, not built.
- (z) *(Done: built 30 Oct 2026 on `claude/save-only-when-changed`, merged to main 31 Oct 2026 by fast-forward, code `014be60`; see "Save only when something changed".)* Save changes only when something changed (Ray, 30 Oct 2026, found in
  his tablet retest). Save is enabled after a Replace even when an undo
  (✕ -> "Put it back") has returned the form to exactly its loaded state, and
  the leave guard (the "Discard unsaved edits?" dialog) likely still counts
  that Replace too. Fix both together: Save, and the leave guard, should
  count only real differences from what was loaded. Applies to every edit
  form: Edit Coin, Edit Set, Manage Photos and the Staging-draft edit.
- (aa) Keep or Delete prompt on every Replace (Ray, 30 Oct 2026; agreed
  design, to be planned later as ONE task; (s) is folded into it). Not built.
  - Scope: every Replace of a photo or a receipt, owned records and Staging
    drafts alike. The user chooses Keep or Delete for the old file.
  - Kept files go to ONE "Replaced" folder (not left beside the live files).
    Cleaning that folder up is done by the user through the OneDrive folder
    link (the Staging Review link pattern, verified on PC and tablet).
  - Staging folders: delete the draft's whole Staging folder as the very LAST
    step of a fully successful promotion, and add a clause saying so to the
    Promote dialog. Check Force Add separately: it writes a row without a
    CoinID and keeps the card, so it may need a different rule.
  - Check whether `_Docket` / `docket.json` is still used before relying on
    the Staging folder layout in this task.
  - One-time cleanup of the old promoted Staging folders already on OneDrive
    (the ones left behind by every promotion so far).
  - Plan first, questions first; it touches Replace, promotion and cleanup.
- (ab) The (z) rule applies to every form built or fleshed out later (Ray, 30 Oct 2026, Q7): Save enabled only when the form differs from what was loaded, plus a matching leave guard, with the `formValuesEqual` normalisation and the first-touch / loaded-baseline approach from "Save only when something changed". Not done for: Add Set Step 1 resume ("Save changes" on a resumed Set draft) and Add Set child capture (Save this coin / Pause), Wishlist detail ("Save Changes", a placeholder), Batch Receipt ("Save Receipt", a placeholder), and the Ledger spot-price update (Review / Confirm). Each follows the rule when it is built or fleshed out.
- (ac) Ledger "By Denomination" lists only six denominations, so Sets (`Denomination = "Multiple"`), $2.50 and $20 gold, and Medals are missing and its rows do not add up to the Valued and Melt totals. Backlog only, not built.
- (ad) Decide whether Total spent and Net on the Ledger should include Shipping; both use Cost only today. A decision first, then a change if wanted. Pair with (ag).
- (ag) Grading cost and grading receipt (Ray, 31 Oct 2026; merges (h)'s cost-basis part, including PCGS membership and grading shipping). Receipts get a ReceiptType column (Purchase / Grading), one row per coin per type; a batch grading invoice shares one ReceiptID across its coins like a purchase receipt; All gets a GradingCost column included in Total (Total stays a formula: Cost + Shipping + GradingCost); a Grading_Receipt formula column on All, like the other media columns. The "one purchase receipt per coin" rule of alignment Build 1 becomes one receipt per coin per type. Plan first; pair with (ad).
- (ae) A cert-number (SerNo) edit that changes only leading zeros ("00123" vs "123") counts as a change in (z) (text compare), but the write layer's `cellsEqual` treats them as equal, so Save stamps LastModified / blanks Reviewed and writes nothing else. Make the two comparisons agree.
- (af) *(Build 2 BUILT 31 Oct 2026 on `claude/receipt-remove-and-shared-replace-w1cf1j`, merged to main 31 Oct 2026 by fast-forward to `28e5d5d`: all three items below are done; see "Receipts and photos alignment, Build 2". Build 1 merged to main 31 Oct 2026 (`6a21b60`): the All fallback is gone, the Binder line shows in the Edit slot, "Not scanned, paper in binder" in every receipt slot (only while the slot has no receipt), the Docket's 2+ rows and drift rows; see "Receipts and photos alignment, Build 1". **Build 2, recorded (Ray, 31 Oct 2026), now built on the branch:** (1) remove a stored receipt on Edit Coin / Edit Set, waiting for Save like everything else, with a double-check on EVERY ✕ (a shared receipt is removed from THIS coin only: only its row is blanked, other coins on the ReceiptID and the file stay); (2) a Replace of a receipt shared with other coins asks "Replace on all N coins" (the default) or "This coin only"; (3) the `_02` fix: the same bytes already in CoinReceipts with no row behind them reuse that file (no upload) and get a new ReceiptID.)* Remove a stored receipt or photo (Ray, 31 Oct 2026): not built in (x). Edit Coin and Edit Set have no way to take a stored receipt off (✕ appears only on a pending pick); photos already have ✕. Both belong to a later workbook / app alignment task for receipts and photos, which should also decide what to do about the old All.Receipt and photo columns that would show a removed file again (see (p)). Also for that task (Ray, 31 Oct 2026): the Edit Coin / Edit Set receipt slot should show "Binder (not scanned)" like the detail page does for a coin whose All.Receipt is "Binder" (18 records; the slot says "No receipt on file" today), and re-picking the same file on a coin whose receipt is only in All.Receipt makes a `_02` copy (no Receipts row claims the name).
- (ah) The Sets list should sort and filter like the Coins list (Ray, 31 Oct 2026); today it can't be sorted by CollectionID. Backlog only, not built.
- (aj) *(Closed 1 Nov 2026: estimate error, not a slowdown. The "80 min" was never a measured run; it was a projection from the first 24 suites, which happen to include several of the slowest. Measured full serial run: 15.9 min at `52a2f3c` (86 suites, median suite 3.9 s). `tests/run-all.js` now prints each suite's duration as it finishes, plus the total wall time and the slowest 5 at the end. The four suites that printed nothing when run directly (`catalog_finish_filter`, `former_holdings_purge`, `receipts_photos_alignment`, `replace_never_overwrites`) are now self-runnable: their closing line is `}, module);` like every other suite. Slowest suites for reference: `image_chooser` ~122 s, `deploy_workflow` ~96 s, `addcoin_shared_photos` ~54 s, `startup_connection` ~49 s, `build_decides_target` ~44 s. Parallel mode and speeding up individual suites were considered and not done (Ray).)*
- (al) Write-safety branch (Ray, 4 Nov 2026; recorded only, NOT built; from the 3 Nov review and the date-branch investigation). In this order: **F6** a save refuses, naming the column, when a writable column is missing from the header row (`buildRowCellEdits` skips it silently today, `if (!idx) return`: a Copilot rename means silent data loss; same as review item 5.A); **F2** a batch that fails partway re-reads the row and the toast names the columns that did NOT land, keeping Graph's error text; **F5** split a `$batch` into chunks of at most 20 requests (Graph's limit), each chain stopping on its first failure; **F1** LastModified goes LAST in every All batch as its own range (the code comment says it is queued last, but `buildRowCellEdits` sorts by column, so any writable column right of LastModified is written after it; on _Testing only GradeNum (a formula) and Purged are right of it, at AZ). Also considered: F4 a clearer direct-save failure toast, and review item 5.B (re-read the header row before each save; `ensureAllHeaderMap` caches it for the session). Never blank a half-written row (Ray, Q5). **F8** (found 5 Nov 2026 while building the blank-cell fill; not built): the Promote refusal says "or use Mark as promoted", but the Mark as promoted card is only shown for a draft that is NOT `allRowWritten` (`coinDraftStaleOnAll`), so a Force Added draft that Re-check re-linked (flag set, listed in the Docket Staging section with Promote) has no such button; either show the card for it or word the message differently. Also not built: a leftover draft is detected only against the rows loaded at launch, so a row added later (by Copilot) is not seen until reload. Also in (al) (Ray, 4 Nov 2026, from the 3 Nov review): **5.B** re-read the header row before each save; **5.C** refuse to write a column that holds a formula, detected from the range's formulas (NOT only `calculatedColumnFormula`: see "Workbook facts from the coordinator's check"); **5.D** read All's header from the table, not A1:BZ1; **5.E** headers with spaces ("Cert Lookup Base URL", "Error Type") get no-space fallbacks in `colVal`; **5.F** Containers read by used range, not A1:B200.
- (am) **FIRST task of the next session (Ray, 4 Nov 2026):** slim CLAUDE.md (review 4.1, 4.2) to under about 40 KB, moving build history into docs/ref/*.md and docs/HISTORY.md with pointers, fixing stale text, plus 4.3 a short docs/CODEMAP.md (function -> line range by area). One docs-only commit to main; PLAN FIRST for Ray's approval.
- (an) Test-speed branch, small (Ray): 3.1 a name filter for `npm test`, 3.2 an app "ready" flag instead of openApp's 600 ms wait and `waitForFunction` instead of fixed sleeps in the slowest suites, 3.3 one Chromium per run with a context per suite, 3.5 deploy-workflow loads the page once. Parallel runs (3.4): not now.
- (ao) eTag-checked device cache for the workbook reads (review 1.3) and an offline read-only view (6.10): deferred until after the write-safety branch (al).
- (ap) Not scheduled (review 3 Nov 2026, one line each): 1.1 + 1.4 thumbnails, lazy loading and a concurrency limit for Catalog / Album photos, one ReferenceImages folder listing instead of 404 GETs; 1.2 Catalog card corner-fitting cost (window or cache); 1.5 a deadline on write requests, with 2.4 one shared `graphFetch` helper; 1.6 note: msal-browser 2.38.3 is old (upgrade sometime); 1.7 strip comments at deploy (Ray's call); 2.1 remove always-on ENABLE_* flags and the unreachable "re-enabled" messages; 2.2 decide the DIAGNOSTIC-ONLY blocks; 2.3 the remaining FAKE_* data in a live session (incl. FAKE_COIN_DETAILS on real coins); 2.5 split very large functions only when a task touches them; 2.6 escape workbook text in innerHTML templates; 3.6 fold event-named suites into feature suites only after a coverage check; features 6.1 slab barcode scan, 6.2 duplicate cert warning, 6.3 "value needs refreshing" Docket rows, 6.4 container audit mode, 6.5 quick-capture to ParkingLot, 6.6 post-save album slot offer, 6.7 one search box, 6.8 value over time (needs a ValueHistory sheet), 6.9 Wishlist live, 6.10 see (ao).
- (ak) Optional, undecided: keep the raw for Holder/Reference to lift the 1400 px guided-crop limit (adds an _original file per holder).
- (ai) *(Done: date branch, merged 4 Nov 2026 (`bfe52cc`); photo-only and receipt-only saves do not stamp it, Ray's Q4.)* LastModified should record the real date AND time of each change (Ray, 31 Oct 2026); today it is a date only, so it reads as midnight. Old midnight values stay as they are. Decide first whether a photo-only or receipt-only save updates it (today neither touches the coin row). Backlog only, not built.
- Known data note (31 Oct 2026, not an app item): All.SpotValue has its formula in 1,552 of 1,555 rows; 3 cells hold a typed or flattened value. Find and fix later via Copilot (the app never writes SpotValue).
- (v) Note only, no action (Ray, 27 Oct): on LIVE, a Replace or Recrop of a
  fixed-name photo before the 27 Oct merge uploaded over the old file
  (`{ID}_slab_reverse.jpg`, `_obverse_cropped.jpg`, `_obverse_original.jpg`
  …). The overwritten pictures exist only in OneDrive's version history for
  those files.

## Session log — carried-forward state (not app architecture, tracked here for continuity)
(Corrected 4 Nov 2026 in the (am) slimming: the heading says "4 rows" but the block lists 6, two of them Resolved. Rows 1, 3 and 4 are Open; whether they were transferred to the workbook is unknown (backlog line "ParkingLot rows 1, 3, 4").)*

### ParkingLot entries to transfer (4 rows, as of 2026-08-23)
**Needs adding to the workbook's ParkingLot sheet — logged here because this
coding session has no write access to the live OneDrive workbook.** Recorded
verbatim in ParkingLot's own column shape (Item/Title, Category, Priority,
Date, Description, Status), same shape as the existing "Copper color
designations (RD/RB/BN)" future-pass row. Row 1 supersedes the earlier
2026-08-17 version of this same entry with Ray's own canonical wording
(same underlying item, not a new one — don't add both).

**Row 1:**
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

**Row 3:**
- **Item/Title:** `Add Coin album assignment is captured but never acted on`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-23`
- **Status:** `Open`
- **Description:** `Add Coin's "Assign to Album" selection is now recorded on the Phase 1 Staging coin draft (assignAlbum), but nothing consumes it — no slot is filled, and the separately-specced post-save Albums matching flow (offer to fill a matching open slot; surface both coins on an already-filled slot; never auto-fill silently) is still unbuilt. Deliberately NOT scoped into any Add Coin write-layer phase: it is UX polish on a save that already works, not core to logging a coin. Pick up whenever. See CLAUDE.md "Post-save Albums matching" for the behaviour already agreed.`

**Row 4:**
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
