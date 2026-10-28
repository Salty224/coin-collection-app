# Reference: FORMER_HOLDINGS (moved out of CLAUDE.md)

Read this file when: touching Former Holdings, Purge, or the Show Purged toggle.
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

#### (continued) Former Holdings sub-catalog + Purge (BUILT and merged to main; built on `claude/vigilant-cerf-maworr`, tip `12079cf`, landed via rebase; the code is on `main`)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 11593-11620).

**Verified headless (original build) — new committed suite
`tests/verify_former_holdings_purge.js` (97 assertions); 1820 across 42
suites, zero failures, zero page errors.** Covers the schema/flag
invariants (including that CollectionID/CoinID/OriginSetID are *still*
never-write — Purge loosened nothing); `formerHoldings()` scope across all
three record kinds; the rename with "Exit History" gone from the page
entirely; all five filter axes plus AND-combination, per-page year state,
and the empty-result message; what Purge offers (both files for a flip
source, legacy-only flagged); both dialog stages naming exactly the checked
files; and full execution against the mock Graph client — partial purge
leaving the flag blank and the coin listed, full purge writing `Y` and
dropping it from the list while remaining reachable by ID, receipts and the
All row provably untouched, failure/idempotence/locking, and flag-off
inertness.
- **Eight verified negative controls**, each applied to the real `app.html`,
  run, and reverted: the purge filter removed from `formerHoldings()` (fails
  10); the legacy-only guard removed (fails I1b only — see the trap note
  above); **file-then-row order** (fails 6, including J6/J7); the step
  fallback reverted (fails N1); the per-coin lock removed (fails K1/K2);
  purge ignoring the selection (fails 7, including the unchecked-photo
  guarantees); `Purged` written on a partial purge (fails 4); and the
  search-styling fix reverted (fails P1/P2).
- **Honest scope note on the Receipts assertions (G5):** nothing in the code
  touches Receipts, so there is no revert that would make G5 fail short of
  writing the bug on purpose. It is a **guard** assertion — it exists to
  catch a future change, not to prove today's code, and should be read that
  way.


### Purge follow-up: independent crop/original selection, all unchecked by default (BUILT, same branch, merged to main)
Ray's live testing surfaced a real gap between what was scoped for the
original build (Q2: Purge deletes both the crop and the `_original` raw
together) and what would actually be desirable in hand: rather than a
single bundled checkbox per photo, a photo's crop and its retained original
are now **two independently selectable rows**, and **every checkbox starts
unchecked** (a reversal of the original "all checked by default" design) —
Ray wants to hand-pick exactly what gets deleted each time, nothing
pre-selected.

- **Data model, resolved per Ray's own proposed rule, confirmed against the
  actual code:** a `Photos` row can carry two files under one row
  (`Filename`, the crop; `OriginalFilename`, the retained raw). Checking
  only ONE of a photo's two files clears just that one field on the row and
  **leaves the row in place**, since it still references the surviving
  file. Only when **both** of a photo's currently-present files are checked
  does the row itself get removed. `groupPurgeSelectionByPhoto()` groups
  the checked file rows back by `photo.photoId` to decide which case
  applies per photo — `group.kinds.size >= photo.files.length` is the exact
  test ("does the selection cover every file this photo currently has").
- **`patchRecordRow()` was already a full-row rewrite, not a merge** — a
  real structural fact that had to be worked around, not something new:
  every column absent from its `values` argument gets blanked. So a partial
  clear (`clearPhotoRowField()`) has to read the row's CURRENT full values
  first (`readRecordRows()`) and re-pass everything, only the one target
  field changed (`buildPhotoRowPatch()`).
- **A real, non-obvious pitfall found and fixed while doing that:**
  `readRecordRows()` stringifies every cell (`String(raw).trim()`),
  including `DateAdded`, which Graph returns as a raw numeric Excel serial.
  Carrying that stringified value straight back into a `patchRecordRow()`
  call would write a numeric-LOOKING TEXT string into a cell still carrying
  a date number format — the same ISO/text-date corruption class this
  workbook has already suffered once (see the ValueDate history elsewhere
  in this file). `buildPhotoRowPatch()` coerces `DateAdded` back to a real
  `Number` before it goes anywhere near a write.
- **Row lookups are now keyed by `PhotoID`, not `Filename`.** Once a
  photo's crop or original can independently go blank, `Filename` stops
  being a safe lookup key — a partially-purged row can have a genuinely
  blank `Filename` while `OriginalFilename` is what still identifies it.
  New `findPhotoRowByPhotoId()`/`clearPhotoRowField()`/
  `detachPhotoRowByPhotoId()` all key on the one identifier that stays
  stable regardless of which file field is or isn't currently blank; the
  original `detachPhotoRowByFilename()` is untouched and still used
  elsewhere (Manage Photos' own detach).
- **The session index (`LIVE_PHOTOS`) gets the same treatment** — a new
  `syncStoredPhotoIndexClearField()` mutates just one field on the matching
  in-memory entry for a partial clear, alongside the existing
  `syncStoredPhotoIndexRemoveByPhotoId()` (a PhotoID-keyed sibling to the
  original `...RemoveByFilename()`) for a full row removal. Without this,
  `finalisePurgedFlag()`'s own "what's left to purge" count — computed via
  `purgeablePhotosFor()`, which reads straight from `LIVE_PHOTOS` — would
  still see a just-deleted file as present within the SAME purge call.
- **`fileRowsForPhotos(photos)`** is the new pure flattening function: one
  row per FILE (a photo with both a crop and a surviving original produces
  two; one already down to a single file produces one). Deliberately takes
  the already-computed photo array rather than a CollectionID, so the
  dialog can call `purgeablePhotosFor()` exactly ONCE and have both its
  `purgeable`/`legacy` arrays and every file row's own `.photo` reference
  point at the identical objects — the write side's photoId-based grouping
  depends on that.
- **Continue is genuinely DISABLED, not just rejected on click, until at
  least one file is checked** — a new, small, Purge-specific-but-generic
  `wireGuardCheckboxGate(buttonLabel, checkboxSelector)` toggles the real
  `disabled` DOM property on `showWriteGuard()`'s own rendered button
  (matched by its label, since that shared dialog hands back no element
  references) via a delegated `change` listener. The old "nothing selected"
  toast in the `onClick` handler stays as a defensive fallback, since a
  disabled button can't dispatch `click` at all under normal use.
- **The legacy-only guard inside `purgeCoinPhotos()` is now genuinely
  unreachable from the real UI** — `fileRowsForPhotos()` already excludes
  legacy-only photos, so nothing the dialog builds can ever select one.
  The write-side guard is kept anyway as defence in depth (same posture as
  the original build) and is now exercised in tests by handing
  `purgeCoinPhotos()` a hand-built file-row that deliberately bypasses that
  filter.

**Verified headless — the existing suite grew from 97 to 116 assertions;
1839 across 42 suites, zero failures, zero page errors.** Covers: the
dialog rendering two independent checkboxes for a two-file photo and one
for a single-file photo, all starting unchecked; Continue's disabled state
toggling correctly as a box is checked and unchecked; the confirmation
naming exactly the checked files across a mixed crop+non-crop selection;
crop-only deletion (file gone, original survives, row survives with
`Filename` blank and `OriginalFilename` untouched, the session index
updated, `DateAdded` surviving as a real Number, `Purged` staying blank);
the mirror-image original-only deletion; checking both of a photo's files
(the only case that removes the row), with the other photo's file and the
receipts/All-row boundaries re-confirmed unaffected; and a targeted
second-pass scenario proving the PhotoID-keyed lookup finds and fully
removes a row on a SECOND purge even though a prior partial purge already
left its `Filename` blank. `J`/`J2`/`K` (failure handling, row-then-file
order, locking) were adapted to the new file-row calling convention with
the same outcomes, except idempotent-rerun and failed-stage counts, which
now correctly report per FILE (3) rather than per photo (2) — a deliberate,
more granular improvement, not a behavior change.
- **Four verified negative controls, each applied to the real `app.html`,
  run, and reverted:** the unchecked-default + Continue-gate removed (fails
  6, exactly F3/F4/F6/F7/F8/F10); the partial-clear distinction removed —
  reverted to "any selection fully detaches the row" (fails 9, exactly the
  row-survives/field-preserved/session-index/second-pass assertions,
  nothing else); the `DateAdded` Number coercion removed (fails exactly the
  one assertion built to catch it); and the `PhotoID`-based lookup broken
  (matched against the wrong column) — this one is broadly load-bearing,
  failing 24 assertions across every real write scenario (G/H/J/K), which
  is itself the honest finding: the whole partial-and-full write path
  depends on this one lookup being correct, not just the narrow second-pass
  case it was originally designed to protect.
- **Not verified: any real device, any real OneDrive session.** This is
  still a destructive write path and wants a live `_Testing` run before it
  is trusted — see the checklist, updated for this build's dialog changes.
  **`WRITE_TARGET` stays `"copy"` throughout.**


### Purge follow-up 2: a zero-photo coin can now reach Purged too (BUILT, same branch, merged to main)
Real gap: a coin with zero stored photos of any kind — no `Photos` rows,
no legacy flat `All.Obverse`/`Reverse` reference either — hit Purge and got
the same "Nothing to purge" OK-only dead end as a **legacy-only** coin
(one that DOES have a photo, just not one this app can act on). Unlike a
legacy-only coin, a genuinely photo-less coin has no principled reason to
stay stuck: `finalisePurgedFlag()`'s own rule ("is there anything left to
purge? no? then mark it Purged") is already true of such a coin from the
moment the dialog opens — nothing in the normal delete-then-flag path ever
runs for it, since there is nothing to delete, so without this fix it
could never earn `Purged=Y` and would sit in Former Holdings permanently.

- **`openPurgeDialog()`'s zero-purgeable branch now splits in two.** A
  coin with `legacy.length > 0` keeps its exact, unchanged "Nothing to
  purge" OK-only dialog — that dead end is correct and deliberate (this
  app never writes the legacy flat columns, so deleting the file would
  leave them pointing at nothing; fixing it is a workbook-side job). A
  coin with **zero** photos of any kind — `legacy.length === 0` too — now
  routes to a new `markPurgedWithNoPhotos()`, a real Yes/Cancel dialog
  naming the coin and stating plainly that this only sets the `Purged`
  flag, nothing else changes.
- **No new write primitive — reuses `finalisePurgedFlag()` directly**,
  wrapped in the same per-coin `withCoinPurgeLock()` a real purge already
  uses (so a double-tap coalesces onto one write rather than firing
  twice), inside a small `markCoinPurgedDirectly()` that never throws
  (mirrors `purgeCoinPhotos()`'s own try/catch-and-report posture for this
  exact call, since there's no delete loop here to wrap it for free).
  `writePurgedCell()` itself, `ALL_WRITABLE_COLUMNS`/`ALL_NEVER_WRITE_COLUMNS`,
  and every existing purge/detach code path are completely untouched.
- **Reported honestly, not just "success"**: a clean write toasts the
  coin is now fully purged (same wording as a normal full purge); a
  concurrent photo landing between opening the dialog and confirming
  correctly refuses (`finalisePurgedFlag()`'s own `remaining` check catches
  it) with a toast saying so rather than silently marking a coin purged
  out from under a photo that now genuinely exists; a missing All row or a
  thrown Graph error also reports by name rather than pretending nothing
  happened.
- **`LastModified` is stamped, `Reviewed` is NOT** — same divergence,
  same reasoning, as a normal Purge write: this is still `writePurgedCell()`
  under the hood, unchanged.

**Verified headless — the existing suite grew from 116 to 127 assertions;
1850 across 42 suites, zero failures, zero page errors.** New block: the
zero-photo dialog names the coin and offers a real Cancel/"Yes, mark
purged" choice (not the old single OK); Cancel writes nothing and the coin
stays listed; the **legacy-only coin is completely unaffected** — still
its own unchanged OK-only dead end, never offered the new choice;
confirming Yes writes `Purged=Y` with `LastModified` stamped and `Reviewed`
untouched, updates the in-memory record, drops the coin out of Former
Holdings, and leaves it reachable by CollectionID — all via the existing
audited `writePurgedCell()` path, no new write surface.
- **Verified negative control, applied to the real `app.html`, run, and
  reverted**: reverting the dialog split back to the old single "Nothing to
  purge" OK-only message fails exactly 7 of the 11 new assertions (the ones
  load-bearing on the actual fix — the dialog contents/buttons, the write
  itself, `LastModified`, the in-memory update, and the coin leaving the
  list); the other 4 correctly still pass, since they're true regardless
  (Cancel doing nothing, the legacy coin's own dialog being unaffected,
  `Reviewed` staying untouched when nothing is written at all, and the coin
  staying reachable by ID either way) — confirming the suite discriminates
  on the real fix rather than passing vacuously. A first version of this
  control **crashed the whole suite run** rather than failing cleanly (an
  unguarded `.click()` on a button label that doesn't exist under the
  reverted code) — the same "make a negative control fail by name, not by
  throwing" lesson this project has hit before; fixed by guarding every
  button lookup in the test before re-running.
- **Not verified: any real device, any real OneDrive session.** Same
  standing caveat as the rest of this feature — see the checklist, updated
  with a new Part covering this dialog. **`WRITE_TARGET` stays `"copy"`
  throughout.**


### Purge follow-up 3: one search box too many — "Open by CollectionID" retired for a "Show Purged" toggle (BUILT, same branch, merged to main)
Real usability finding from Ray: Ledger had three search/lookup boxes
stacked on one screen — "Find a Coin" (Owned-only, pre-existing, untouched
by this), Former Holdings' own `#formerSearchInput` (searches within the
already-filtered exited list), and "Open by CollectionID" (added alongside
the original Purge build specifically so a fully-purged coin — which by
design appears in no list — stayed reachable at all). The third box was
confusing sitting next to the other two, and existed only to compensate for
purged coins having nowhere to be found.

- **"Open by CollectionID" is removed entirely** — the input, the button,
  `openLedgerCoinById()`, and both its event-listener wirings. Nothing else
  in the app called it (confirmed via source search before removing).
- **New "Show Purged" toggle** (`#formerShowPurgedBtn`), a plain boolean
  `.filter-chip` in Former Holdings' own toolbar row next to Year — same
  shape as the retired Browse "Missing Photos" toggle, not another OR-chip
  in the five existing multi-select rows (record kind/reason/denom/metal/
  grading service): it's a visibility switch on the base set itself, not
  another axis to narrow within it.
- **`formerHoldings()`'s hard `!isFullyPurged(c)` exclusion is now
  conditional**: `isExitStatus(c.status) && (formerShowPurged ||
  !isFullyPurged(c))`. **Default OFF** (`formerShowPurged = false`) —
  identical behavior to before this change for anyone who never touches the
  toggle. Toggling it on includes purged coins in the SAME base set
  `applyFormerHoldingsFilters()`/`renderFormerHoldings()` already render
  from, so every existing filter chip, the Year filter, and the result
  count all keep working unchanged against the wider set.
- **No new search mechanism was needed** — `#formerSearchInput` already
  filters whatever's currently in the rendered/filtered set
  (`coinMatchesSearchQuery()`), so a revealed purged coin is found by it
  exactly like any other row, with zero new code for that half.
- **A revealed purged row shows a plain "Purged" label instead of a live
  Purge button**, rather than leaving the button active — tapping Purge on
  an already-purged coin would just reopen the zero-photo "mark purged"
  dialog from the section above (harmless — `purgeablePhotosFor()` returns
  nothing left for it either way — but confusing, and a pointless
  re-confirmation). `renderFormerHoldings()`'s row-building branches on
  `isFullyPurged(coin)`: purged → a plain `.placeholder-note` span reading
  "Purged"; not purged → the existing Purge button, unchanged.
- **This is what actually closes the loop for the zero-photo "mark purged"
  dialog above** (Purge follow-up 2): a coin marked purged that way used to
  simply vanish from every list with no way back in except the (now
  removed) CollectionID box; it's now reachable again any time by toggling
  Show Purged on, then searching or scanning for it like any other former
  holding.
- **Direct single-coin lookups elsewhere in the app are unaffected** — the
  "Belongs to" chips, the album filled-slot tap, `openLedgerCoin()` itself,
  etc. all still resolve a specific coin from raw `activeCoins()` with no
  ownership/purge filtering, same standing precedent as before; this
  toggle only ever changes what's included in Former Holdings' own
  browsable LIST.
- **`browseStepListFallback()`'s own `ownedCoins()` fix, and every other
  prior-round mechanism, is completely untouched** — this task's only
  changes are the CollectionID-box removal, the new toggle, and
  `formerHoldings()`'s one-line condition.

Verified headless — `tests/verify_former_holdings_purge.js`'s old "M. Open
by CollectionID" block (M1–M4, which exercised the now-removed mechanism)
was replaced with a new 8-assertion block (M1–M8) covering: the old
input/button genuinely gone from the DOM; the toggle defaulting off with
the purged coin (`AY-90004`) hidden; toggling on revealing it while an
ordinary exited coin stays visible too; the revealed purged row showing the
plain label with no Purge button, while the ordinary row's real Purge
button is unaffected; `#formerSearchInput` finding the revealed purged coin
and correctly excluding an ordinary one under the same query; and toggling
back off hiding it again. Full `npm test` re-run clean alongside every
prior suite (no other test referenced the removed elements — confirmed via
source search before running). One verified negative control: reverting
`formerHoldings()`'s condition back to the old unconditional
`!isFullyPurged(c)` fails exactly M3/M5/M7 (the assertions that actually
depend on a purged coin becoming visible/searchable) while M2, M4, M6 and
M8 correctly still pass — those hold regardless of whether the fix exists
(the toggle still visually flips its own `.active` class either way, an
ordinary exited coin was never excluded to begin with, and toggling back
off is a no-op against an already-excluded row) — confirming the suite
discriminates on the real fix rather than passing vacuously.
- **Not verified: any real device, any real OneDrive session.** Same
  standing caveat as the rest of this feature. `WRITE_TARGET` stays
  `"copy"` throughout — this task touches display/filter logic only, no
  new write path.


