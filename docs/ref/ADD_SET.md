# Reference: ADD_SET (moved out of CLAUDE.md)

Read this file when: touching Add Set (Step 1/2, Set drafts, sub-groups, Set promotion).
Rules that stayed in CLAUDE.md: the design head of "Add Set + real write layer"; its continuation is in this file.
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

#### (continued) Add Set + real write layer (BUILT and merged to main)

The design part of this section stays in CLAUDE.md; this is the rest of it (original lines 5870-6175).

- Verified headless (19 new assertions, `verify_addset_year.js`): the
  required either/or block, the Various checkbox's disable/blank behavior,
  pre-fill on a specific-year set (including re-applying for a second child,
  not a one-shot), no pre-fill on a Various set, pre-fill applying
  identically across both sub-groups of a sub-grouped set (including after
  rolling from one sub-group to the next), a per-coin override being
  respected and not sticking to later coins, the checklist deep-link
  pre-filling the new field correctly, and a legacy no-year draft degrading
  gracefully. Two existing suites (`verify_addset_receipt_pdf.js`,
  `verify_bug3_photo_pause.js`) needed a Year value added to their own Step 1
  calls now that it's required — updated, not weakened; one of those
  (`verify_bug3_photo_pause.js`'s empty-pause test) switched to Various
  specifically, since a specific-year draft's child form is no longer
  trivially empty by design. All 8 suites (119 assertions total) re-run
  clean, zero regressions.

**"Track coins individually within this set?" toggle + CollectionID `-Set`
suffix retirement (BUILT, locked in).** Resolves the July 18 ProjectPlan item
"CollectionID Parent-Child Convention for Sets." Two parts, shipped together
since the second is really the consequence of the first.
- **New Step 1 toggle** (`#addSetTrackIndividually`): whether this Set
  captures a per-coin breakdown (Step 2, as already built) or completes as
  one **single set-level record** — same shape as an existing bare-ID owned
  Set row in the workbook (e.g. `AY-00542`), no `-A/-B/-C` children ever
  expected. **Default is driven by the new Category field**
  (`#addSetCategory`, also new this round — Step 1 had no Category selector
  before): `Mint Set` / `Proof Set` / `Silver Proof Set` default **NO**
  (`defaultTrackIndividually()`); `Commemorative` / `Silver Eagle` /
  `Reverse Proof Set` / `Prestige Set` / `Legacy Collection` /
  `Assembled Set` / `Best of the Mint Set` default **YES**; blank or any
  other value (including `Other`) defaults **NO** — expressed as a single
  membership test against the YES set, so there's no way for a category to
  fall through neither bucket. **Always overridable in either direction** —
  two independent "touched" flags (`addSetCategoryTouched`,
  `addSetTrackIndividuallyTouched`), each reset only on a fresh Step 1 entry
  (`showAddSetStep1()`), make sure auto-fill (Category from a product-code
  match or a checklist deep-link; the toggle from Category) only ever
  applies *before* Ray's own choice, never silently overwrites it after.
- **Category auto-fills from two existing signals**, both already computing
  a category-shaped value before this round: a matched product code
  (`matchDbSetsByProductCode()`, already showing `m.category` in the match
  note) now also sets the dropdown; a Sets-checklist deep-link's `lineage`
  now maps onto Category too (`categoryFromLineage()` — "Uncirculated Coin
  Set" lineage → `"Mint Set"` category, same label/value split the
  completeness-checklist pill rename already established). Both paths are
  standard-issue-only by construction, so they always land on a default-NO
  category — correct, not a coincidence.
- **Unchecked → Step 2 is genuinely skipped, not just hidden.**
  `startSetCapture()` branches: Expected Count and Sub-groups are read as
  empty/zero regardless of what's still sitting in those (now-hidden)
  fields (`#addSetIndividualTrackingFields`, shown/hidden by
  `updateAddSetTrackIndividuallyVisibility()`, which also relabels the
  Start button — "Reserve ID & start capturing coins" vs. "Reserve ID &
  save set"); `renderChildStep()` is never called; the draft is written
  with `status` set directly to `SET_STATUS.COMPLETE` (the same terminal
  status Step 2's own "Done" button reaches via `markSetDraftComplete`) and
  `confirmedChildCount: 0` (never `null`, so a downstream reader can't
  mistake this for "Step 2 started but never finished"); Ray lands back on
  the Dashboard, since there's nothing left to do. A `trackIndividually:
  false` flag is stored on the draft itself, and the research note gains an
  explicit "Not tracked individually — single set-level record, no child
  coins expected" line — both purely for the reconciliation team's benefit,
  so an empty `children[]` on a `Complete` draft reads as "by design," not
  "capture stalled partway." Falls out of existing hub/dashboard logic for
  free: never appears in "In Progress Sets" (never enters `Draft` status),
  correctly appears under the Needs Attention hub's "Waiting on Copilot
  research" section like any other `Complete` draft, and the promotion
  file-move loop already tolerates an empty `children[]` (it always did —
  confirmed by re-reading `plannedPromotionMoves()`, which iterates
  `draft.children || []`).
- **`-Set`/`-SET` CollectionID suffix retired going forward.** Grepped the
  whole file: nothing in the reservation module, the Add Set write layer, or
  any `FAKE_*` demo data actually generates, parses, or depends on that
  suffix — `reservationIdNumber()`/`collectionIdNumber()` (two separate but
  structurally identical helpers, coin-side mockup and Add Set write layer)
  both strip only the `AY-` prefix and `parseInt` the rest, which silently
  ignores *any* suffix, `-Set` or otherwise, without special-casing it. Every
  real parent ID `reserveNextCollectionId()` produces is already a plain
  `AY-#####` — confirmed nothing needed to change there. Child linkage was
  already `originSetId`-based, never suffix-parsed (`setChildrenFor()`,
  `isSetRow()` — keyed on `denom === "Multiple"`, not the ID string). One
  stale comment (in the old Browse-restructure `FAKE_COINS` seed data)
  speculatively described a future `AY-#####-Set/-A/-B` suffix scheme that
  was never actually built that way — corrected in place to point at the
  real `originSetId` mechanism and the retirement decision, so a future
  session doesn't mistake it for a still-open design question.
- **Nothing else in the codebase assumes every Set gets an `-A/-B/-C`
  child** — this was checked directly, not assumed: `markSetDraftComplete()`
  never required `children.length > 0`; the promotion move-planner already
  handled zero children gracefully (needed anyway for the childless-backlog
  case the older coin-side `FAKE_SET_CHILDREN` mockup already exercised);
  the Needs Attention hub's Draft/Complete branching keys purely on
  `status`, never on children count. The only real gap was the missing
  *path* to reach a childless Complete draft at all (Step 2 was previously
  mandatory) — that's exactly what this toggle closes.
- Verified headless (39 new assertions, `verify_addset_track_individually.js`):
  every named category's default in both directions, blank/`Other`
  defaulting NO, a manual override in either direction surviving a
  subsequent Category change, the tracked path behaving exactly as before
  (Step 2 runs, `status` stays `Draft`), the not-tracked path's full draft
  shape (`status`, `children`, `expectedChildCount`, `confirmedChildCount`,
  the research-note line, Step 2 never activating, landing on Dashboard,
  absence from In Progress Sets), the Expected-Count/Sub-groups section's
  show/hide plus confirmation that a stray value typed before switching to
  NO never reaches the saved draft, and both auto-fill paths (checklist
  deep-link, product-code match) correctly setting Category and thus the
  default. All 9 suites (158 assertions total) re-run clean, zero
  regressions.

**Scope boundary — what the app writes (Q1=b / Q3):** the app NEVER writes the
Excel workbook. Its only writes are (i) Staging **drafts as JSON files** in
OneDrive folders, (ii) photo uploads to those folders, (iii) promotion-time
photo **file moves**, (iv) nothing else. Moving confirmed data into the real
All/DB_Sets/DB_Coins rows and setting `Status="Promoted"` is the EXTERNAL
manual/Copilot reconciliation step — the app only ever READS that status.

**Safety posture (all gates default to the safe state):**
- **Superseded:** `ENABLE_SET_WRITE_LAYER` is now `(WRITE_TARGET === "copy")`,
  not a bare `false` — see "Real-Graph flags always on; WRITE_TARGET is the
  actual safety boundary" below. `WRITE_TARGET` is the real gate now: at its
  shipped `"copy"` default this flag is true and the write layer is fully
  active (against the `_Testing` copy only); flipping `WRITE_TARGET` to
  `"live"` is what turns it back off. When off, `getWriteToken()` still
  returns null and never fires an auth redirect, so Add Set's Save
  degrades to a toast instead of a broken sign-in navigation — that
  mechanism is unchanged, only the condition that triggers it moved from
  "no production redirect URI" (resolved) to "WRITE_TARGET is live and this
  hasn't been re-enabled yet."
- `WRITE_TARGET = "copy"` (Q5) → every path resolves under
  `CoinCollection/_Testing/` (`WRITE_PATHS`), so nothing can touch the real
  workbook/Staging. Flipping to `"live"` is a manual, Ray-only, one-line
  change and STILL only writes Staging folders + photos, never the workbook.
  **Superseded (Oct 2026):** `WRITE_TARGET` is derived from the build stamp,
  not flipped by hand — see "The build decides its data target".
- The real workbook is never duplicated by the app — **Ray creates the test
  copy himself** at `CoinCollection/_Testing/CoinCollection (AI) COPY.xlsx`.

**Graph client abstraction (`RealGraphClient` / `createMockGraphClient` /
`graph()` / `__setGraphClientForTest`):** all reservation/draft/promotion
logic depends on a swappable `graph()` client, never on `fetch()` directly,
so a `MockGraphClient` (in-memory path→entry store + seeded workbook columns)
drives the whole flow headlessly with no OneDrive (Q12). `RealGraphClient`
adapts stage.html's proven `Files.ReadWrite` PUT pattern and adds
`getFileBytes`/`getItemMeta`/`listChildren`/`deleteItem`/`readWorkbookColumn`.

**Reservation module (`reserveNextCollectionId`, standalone/reusable per
Part 1 — Add Coin migrates to it LATER, not this round, Q11 — **superseded:
that migration is done, see "Add Coin write layer — Phase 1" below**):**
- Next parent ID = `max(All!CollectionID, open Staging draft parent IDs) + 1`,
  zero-padded `AY-#####`. The All read is the one unavoidable live-workbook
  touch and is **read-only** (Graph workbook `usedRange`, Q2=a); a counter
  file is the documented fallback if that proves slow/lock-prone.
- Reserving a parent implicitly reserves its whole `-A/-B/-C…` child namespace
  (`childSuffix()` is bijective base-26, correct past Z). The claim becomes
  durable the instant Step 1 writes the Draft (a real Staging file, so it
  survives close/reopen and other devices — Part 1 #3).
- Abandoned Draft reservations are left sitting indefinitely — no auto-expiry
  (Part 1 #4).

**Add Set flow (`view-addset` Step 1 → `view-addset-children` Step 2):**
- **Step 1** (set-level basics): name, optional Mint product code (live
  `matchDbSetsByProductCode()` against a sparse `FAKE_DB_SETS` stand-in →
  prefill note), self-declared expected child count, optional dynamic
  **sub-groups** (name + per-group count), optional whole-set + receipt
  photos. Submitting reserves the ID and writes the Draft IMMEDIATELY (does
  not require any children yet). GSID is stored **empty = pending** (Q9) with
  a `researchNote` spelling out what's unresolved (GSID + product-code
  confirmation), same shape as the NGC/PCGS research queues.
- **Step 2** (children one at a time): reuses the app's photo-slot + field
  widgets (NOT a forked form) but captures **identity + grade + photos only**
  — no DB_Coins confidence/routing, no per-child Save-to-DB-vs-Staging choice
  (Q7). Each child gets an app-assigned `-A/-B/-C` id and an `originSetId`
  pointing at the parent, appended into the parent's `set.json` (embedded, for
  reliable association) and persisted on each save. Sub-grouped sets show a
  per-group "coin N of M" and auto-advance to the next unfilled group.
- **Status field** (drives resume + the promotion loop): `Draft` (resume
  state) → `Complete — pending research` (Ray marks capture done; may confirm
  a final count differing from the declared expected) → `Promoted` (set
  EXTERNALLY by reconciliation; the app only reads it). The app never sets
  `Promoted` itself.
- **Resume** via a Dashboard-only **"In Progress Sets"** tile with a count
  badge (Q10): lists `Draft` drafts newest-first, tap to resume Step 2 at the
  right coin/sub-group. Same dashboard-tile pattern as Staging Review / Needs
  Attention.

**Promotion file-move loop (`processPromotedSetDrafts`, Part 3 step 3, runs at
launch):** for each `Promoted` draft not yet moved (`filesMovedOnPromotion`
flag), relocate its photos from the Staging folder to the final convention
(`CoinPhotos/{childId}_obverse.jpg` etc., `CoinReceipts/{parent}_receipt.pdf`,
whole-set → `CoinPhotos/{parent}_set.jpg`). **Every move is strictly
copy-then-verify-then-delete-original (Q4) — a failed/unverifiable copy always
leaves the source intact**, the draft stays `Promoted` (flag not set), and the
next launch retries; per-move idempotent (dest-exists + source-gone = already
moved). No whole-workbook backup this round (Q4) — the app never writes the
workbook, so there's nothing to protect; that logic is shelved until Add
Coin/reconciliation writes Excel directly.

**Reused vs. newly written:** REUSED — stage.html's PUT pattern (adapted into
`RealGraphClient`), the photo-capture File-per-slot idiom, `loadOrientedImageCanvas`,
`DENOM_LABELS`, the dashboard-tile/badge pattern, the coin-side `collectionIdNumber`
concept. NEW — the entire write layer + mock, the reservation/draft/promotion
modules, the three views + `initAddSet` controller, `FAKE_DB_SETS`, and the two
dashboard tiles. The coin-side in-memory reservation/Staging-Review mockup is
completely untouched (Q8).

**Step 1 field reorder + product-code-driven auto-populate + year-less Name
(small-fixes follow-up, locked in).** Product code moved to be the FIRST
field (most reliable identifier when Ray buys directly from the Mint — should
drive the fields below it, not be a late optional aside), followed by Name,
Year, Category — same order top to bottom now.
- **`matchDbSetsByProductCode()` is now live-data-aware** — previously
  `FAKE_DB_SETS`-only (explicitly out of scope when live-nav-data was built).
  Now reads through `activeDbSets()` and checks THREE possible fields per
  row: the two real, confirmed DB_Sets columns (`ItemNumber`, `ProductOption`
  — via `mapWorkbookRowToDbSet`, live data only) or `FAKE_DB_SETS`'s own
  single mock `productCode` field (demo data only, unchanged) — whichever is
  populated on that row. Today's demo codes (`1999RG`, `2021RC`) keep
  matching unchanged; a live row becomes matchable once
  `ENABLE_LIVE_NAV_DATA` is on. `mapWorkbookRowToDbSet()` gained `itemNumber`/
  `productOption` fields; the old unconfirmed `productCode` guess field was
  dropped from the live mapper (real column names superseded it).
  **Bug caught and fixed while widening this**: the product-code match path
  used to set Category directly from a matched row's raw `.category` field
  (`= String(colVal(row, "Lineage"))` on a live row) instead of running it
  through `categoryFromLineage()` — harmless on demo data (whose `productCode`
  rows already store a pre-translated category string) but would have set
  Category to `"Uncirculated Coin Set"` on a real match, a value with no
  matching `<option>` in the dropdown (silently resets to blank). Now uses
  `categoryFromLineage(m.lineage)`, consistent with every other auto-fill
  path on this form.
- **A miss is non-blocking** (expected for a brand-new, not-yet-catalogued
  Mint product) — Ray can keep entering everything by hand; the note reads
  "Not found in catalog — may be a new release, continue entering manually."
- **On a match: Name, Year, AND Category all auto-fill**, each independently
  gated by its own touched flag (`addSetNameTouched`/`addSetYearTouched`,
  new — same mechanism `addSetCategoryTouched` already established: set only
  by that field's own genuine `input`/`change` listener, never by a
  programmatic auto-fill `.value =` set, which never dispatches an event).
  A manual edit to any one of the three always wins over a later
  product-code match touching that same field — the other two can still
  auto-fill independently.
- **Name field is now year-less — holds a set TYPE, never one entry per
  year** (`dbSetTypeName()`): strips a DB_Sets row's own leading year off its
  Description using the row's real, separately-confirmed `Year` column —
  not a blind regex over the text — so a row with no such leading-year
  prefix (a rare non-annual product) passes through unchanged
  (`dbSetTypeName(s) === s.name` for those). The Name datalist
  (`populateAddSetNameOptions()`) now dedupes on this type name instead of
  the raw dated Description — supersedes the original one-entry-per-year
  list (~438 raw rows against real data, too granular to scan) with a
  deduplicated set-type list (~100 entries against real data, per Ray's own
  audit — "United States Mint Proof Set", "United States Mint Uncirculated
  Coin Set", "Best of the Mint Set," etc.). Free text still always works.
- **Category auto-fill logic changed to match (item 4)**, since Name no
  longer carries the year: `updateAddSetCategoryFromNameYear()`, called on
  every genuine Name or Year/Various change. When Year is a specific number,
  matches STRUCTURALLY — `s.year === yearValue && dbSetTypeName(s) ===
  typedName` — against every DB_Sets row, rather than reconstructing and
  re-matching a `"{Year} {Name}"` string; functionally identical for the
  normal case (every annual product's Description literally is
  `"{Year} {Type}"`) but avoids any assumption about exact spacing/
  punctuation in the real Description text. When Year is "Various"/unset,
  only a genuinely year-less Description (the rare non-annual product) can
  match a bare Name directly — never guesses which year's row an annual
  product's own type name should resolve to. Still exact-match only, no
  fuzzy matching (Ray's standing call).
- **Stored/displayed `draft.setName` recomposes `"{Year} {Name}"`**
  (`composeSetName()`) at save time — the Name FIELD is year-less, but the
  Docket, In Progress Sets, and the child-capture header all read
  `draft.setName` directly and don't separately show `draft.year` next to
  it, so the stored string stays the rich, year-prefixed label those
  screens already expect. A "Various"/unset year has nothing sensible to
  prefix, so it's left as just the Name in that case.
  `resumeSetDraftAtStep1()` uses the inverse (`typeNameFromDraft()`, via the
  draft's own real `year` field, not text-parsing) to correctly repopulate
  the now-year-less Name field regardless of when the draft was originally
  created.
- **Checklist deep-link (`applyAddSetContext()`) now also marks Name/Year
  touched** after pre-filling them, alongside its existing Category
  auto-fill — a deep-link from a specific known checklist slot is a
  stronger, more deliberate signal than a code lookup, so it shouldn't get
  silently overwritten by a product code entered afterward (Ray's explicit
  call). Its own banner sentence ("Adding the missing X") still shows the
  full dated name (more informative as a one-off message); only the Name
  FIELD itself gets the stripped type, via `dbSetTypeName()` against the
  checklist tile's own `{name, year}` shape.
- Verified headless (Playwright, no committed suite files — this project's
  established scratchpad-script convention): field order; datalist dedup
  (10 entries against the small `FAKE_DB_SETS` mockup, none year-prefixed);
  a product-code match auto-filling Name/Year/Category together; a manual
  Name edit surviving a subsequent different product-code match while Year
  (left untouched in that same test) still auto-filled independently — both
  correct per the per-field touched-flag design, not a bug; the non-blocking
  "not found" note; Category resolving from Name+Year both when Name is
  entered first and when Year changes after (recompute-on-either-field);
  the Various branch leaving Category blank for an annual-type name (no
  crash, no wrong guess); `composeSetName()`'s two branches; and
  `resumeSetDraftAtStep1()` correctly recovering a year-less Name from a
  synthetic composed-`setName` draft. Not verified: any real live-OneDrive
  click-through (product-code match against real `ItemNumber`/
  `ProductOption` data, the ~100-entry datalist against the real ~438-row
  DB_Sets sheet) — same "needs a real session" caveat as the rest of
  live-nav-data; Ray's own audit of the real Description column ("confirmed
  clean, no messy edge cases") is what this was built against, not an
  independent re-verification from this environment.


