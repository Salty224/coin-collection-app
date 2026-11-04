# Reference: WRITE_LAYER (moved out of CLAUDE.md in the (am) slimming, 4 Nov 2026)

Read this file when: touching any write into the All sheet: Browse Edit's Save, the column allow-list, the conflict check, new-row creation (claim a blank row), Promote / Force Add row writing, "Owned" at creation, Set attach / detach (OriginSetID), or the dates the app writes.
Back to [CLAUDE.md](../../CLAUDE.md). Sections below are verbatim from CLAUDE.md as it was at commit `a7fcb20`; the original line numbers are in [docs/INDEX.md](../INDEX.md).

## Editing existing coins (bounded)
App CAN write directly to: Grade, GradeSource, SerNo, Designation, Storage Location,
Container, and can attach additional photos/receipts to an existing coin at any time.
**Widened by the Browse Edit write layer below** — the real allow-list is now
that list plus Year, MintMark, Denomination, Variety, Description, Category,
Finish, Error, Value, Cost, Shipping, Seller_Link, PurchaseDate, CACBean,
Remarks, Reviewed, LastModified, (see "Status vocabulary simplification +
Sell/Remove action") Status, SaleDate, SalePrice, Buyer, Platform, and
Purged (see "Former Holdings sub-catalog + Purge"); see
`ALL_WRITABLE_COLUMNS` for the authoritative version. The "no research or
judgment" boundary below is unchanged.
**Being on that list is NOT the same as being editable in Browse Edit** —
worth knowing before assuming a field has a UI. `CACBean` genuinely is
editable (a real checkbox pair). **`Category`, `Finish` and `Error` are
not**: `readBrowseEditForm()` never collects any of the three from a form
input. They are allow-listed so that a value arriving by another route —
Add Coin's own Phase 2 promotion write — isn't silently dropped. Adding a
real Browse Edit input for any of them is separate, undone work.
**One narrow exception on top of the allow-list**: CoinID is re-derived and
written automatically — never by hand, never through the general allow-list
mechanism — whenever an edit actually changes Year/MintMark/Denomination/
Variety, so the row's DB_Coins catalog link doesn't silently go stale. See
"Browse Edit real write layer" → the CoinID re-linking bug-fix note below for
the full mechanism.
**Container is a real, separate All-sheet column from StorageLocation** (not a
schema change — it already exists in the workbook) — Edit Coin exposes both as two
independent fields, same as Edit Set below. App CANNOT do anything requiring
research or judgment (new PCGS# lookups, album slot matching, restructuring, cost
allocation) — those stay chat + Copilot tasks. This is the exact scope of the Edit
button on Browse's coin detail view (see "Browse detail view" above) — it doesn't
expose any field beyond this list. A Set-bundle row (`Denomination="Multiple"`)
gets a different, separate Edit Set form instead (Storage Location, Container,
Value, Purchase Details — Storage Location and Container are two separate inputs
there too, **superseding** an earlier single blended "Storage / Container" field) —
see "Browse detail view" above; coin-membership editing for a Set is explicitly out
of scope, parking-lot item.

**Location detail-view section (new)**: a "Location" accordion (same collapsed-by-
default pattern as Purchase Details/Set Details/Notes & Facts) shows Storage
Location + Container for both individual coins and Sets, hidden when neither has
data. This is **additive, not a move** — Storage Location still also shows in the
always-visible key facts row above the accordions (Value/Cert/Storage), unchanged;
Container only ever appears in the new Location section.

Every app-made write (add or edit) sets a **Reviewed** column on All to
blank/unchecked. A human sets it checked after glancing at it.

### Browse Edit real write layer (BUILT and merged to main)
(Corrected 4 Nov 2026 in the (am) slimming: "ENABLE_BROWSE_EDIT_WRITE and ENABLE_LIVE_NAV_DATA ship `false` on main" is stale: every write flag has been plain `true` since 17 Oct 2026, and the build decides the data target. See "The build decides its data target" in CLAUDE.md.)*
**Merge status correction:** this section previously read "held on branch
`claude/browse-edit-write-layer`, NOT merged — awaiting Ray's real-device
pass" — that reflected the plan, not the outcome. The full checklist (Parts
B, C, D, D2, E, F) has since passed live-device verification against the
`_Testing` copy workbook, including the MSAL single-instance fix, the
workbook read/write path unification (Bugs A/B), and the picker/conflict-loop
fix (Part F) all holding up under real use, not just headless suites. Ray
gave explicit merge go-ahead and `claude/browse-edit-write-layer` was merged
to `main` (commit `05718e0`). **`main` is now the source of truth for this
feature**, same standing as every other merged-after-holding branch in this
file. `ENABLE_BROWSE_EDIT_WRITE` and `ENABLE_LIVE_NAV_DATA` ship `false` on
main as usual — dev-only until a production redirect URI exists for a real
push to production. A batch of smaller, non-blocking display/UX findings
from the final live-device round (flip-card layout, CollectionID placement,
a couple of staleness gaps) was explicitly deferred by Ray to a separate
follow-up task — not started here, not implied by this merge.

The app's first write **into the workbook itself**, and the pattern every
other form's write layer should follow. (The Add Set write layer writes
Staging JSON + photo files and deliberately never touches the workbook — a
different thing entirely.) **Scope is Browse Edit's Save button only** — Add
Coin, Edit Set, Wishlist and Batch Receipt all still have exactly the stub
Saves they had before, untouched. **Partly superseded: Add Coin now has its
own Phase 1 write layer** (Staging drafts + photos — see "Add Coin write
layer — Phase 1" below); Edit Set, Wishlist and Batch Receipt are still
stubs.

**Gate (`ENABLE_BROWSE_EDIT_WRITE`, now `(WRITE_TARGET === "copy")` —
superseded, see "Real-Graph flags always on..." below)** — its own
flag, deliberately NOT riding `ENABLE_SET_WRITE_LAYER`, since the two write
completely different things and must be independently enable-able (same
"don't couple independently-flagged features" rule the reference-image and
live-nav readers already follow). A new `WRITE_LAYER_ENABLED = ENABLE_SET_WRITE_LAYER
|| ENABLE_BROWSE_EDIT_WRITE` is what now gates constructing the write-capable
MSAL instance (renamed `setWriteMsalInstance` → `writeMsalInstance`, since it
serves both features) — with both flags off there is no write-capable auth
instance on the page at all, so nothing can redirect or write.
`WRITE_TARGET = "copy"` is unchanged, so writes land in the `_Testing` copy
workbook until Ray flips it.

**Column allow-list, enforced structurally rather than by convention.**
`ALL_WRITABLE_COLUMNS` = Year, MintMark, Denomination, Variety, Description,
Value, Cost, Shipping, Seller_Link, PurchaseDate, StorageLocation, Container,
Grade, GradeSource, Designation, **SerNo**, Remarks, **Reviewed**,
LastModified. `ALL_NEVER_WRITE_COLUMNS` = SpotValue, Total, CollectionID,
CoinID, SetID, OriginSetID, CertLink. `buildRowCellEdits()` derives its ranges
from the allow-list alone, so an unlisted column has **no code path to a
PATCH** — verified by asserting that Total/SpotValue/CollectionID/Status
together produce zero edits.
- **Column POSITIONS are resolved from the sheet's own header row at run
  time** (`ensureAllHeaderMap`, cached per session), never hardcoded — a
  future Copilot-side column insertion can't silently redirect a write into
  the wrong column.
- **Why multiple targeted range PATCHes and not one row-wide write:** the
  writable columns are **not contiguous** — the two formula columns sit
  between them (Total at U, SpotValue at Z). A Graph range PATCH must supply
  a value for every cell in its rectangle, so any range spanning U or Z would
  overwrite a live formula with a literal and destroy it — the exact silent
  data loss this workbook already suffered once (see below). Adjacent
  writable columns merge into one range; a run stops dead at a formula
  column. Sent as one `$batch` request chained with `dependsOn`, so it's one
  round trip and strictly ordered. **Graph offers no transactional
  multi-range workbook write** — the ordering is what matters instead:
  LastModified is queued last, so it can only be stamped if every data write
  ahead of it succeeded.

**Row targeting: CollectionID matched fresh at write time**, never a row
index remembered from when the form opened (`findAllSheetRowNumber()`, via
the `AllCoins` table's own CollectionID column). Verified by shuffling rows
in the mock grid between reads and confirming the same id resolves to its new
position. A CollectionID that's no longer on the sheet returns `not-found`
rather than writing to a guessed row. (CollectionID was confirmed unique
across all 542 rows, so this is a safe key.)

**Conflict detection (concurrent-edit hard block).** Opening Edit Coin
snapshots every allow-listed column's live value (`loadBrowseEditSnapshot`).
On Save the row is re-read fresh and compared field by field; **any**
difference — whether or not the user's edit touches that field — blocks the
save entirely. No write, no partial write, no merge, no "save anyway" option.
The dialog names each changed field with its was/now values; the form keeps
everything typed into it and the user stays on it.
- **`LastModified` and `Reviewed` are excluded from the comparison** — this
  layer writes both on every save, so comparing them would make a second
  save from the same open form report a false conflict about its own
  previous write.
- Blank-ish values (`null`/`undefined`/`""`) all compare equal, and numbers
  compare numerically, so `620` vs `"620"` isn't a phantom conflict.
- After a successful save the snapshot is **re-baselined** to what's now on
  the row, so a second save from the same open form compares correctly.

**Identity-overwrite confirmation** — `detectIdentityOverwrites(current,
next, fields)`, deliberately built as a **shared, reusable helper taking its
field list as a parameter** (Q8): Browse Edit passes `IDENTITY_COLUMNS`
(Year, MintMark, Denomination, Variety, Description); **Edit Set will call
the same function with its own (Year, Description) list when its write layer
is scoped** — do not fork it. Fires only on a real overwrite of an
already-populated field; **filling a blank field never asks**. Separate
concern from conflict detection: nothing is wrong, it's the user's own edit
being read back because it replaces catalogued data.

**Both guards share one dialog shell** (`#writeGuardOverlay` /
`showWriteGuard()`) with a per-call button row, since they're identical in
presentation but different in kind (one can only be acknowledged, the other
is a real Cancel/Confirm choice). Reuses the photo-adjuster overlay chrome,
same as Grading Help and the Year filter. Date values render as dates in
these messages, not raw Excel serials.

**Dates: real date values, date-only, no time component** (Q2 — this
overrode the task spec's own "timestamp" wording, per the workbook's standing
rule, which exists because 44 ValueDate cells once had to be repaired after
being pasted in as ISO/Zulu text). Written as Excel serial numbers with an
explicit `yyyy-mm-dd` number format applied on every write — **note the
`LastModified` column currently carries a leftover `yyyy-mm-dd hh:mm` format
from when it was created expecting a timestamp**, so setting the format
explicitly is what stops a date-only value rendering as a misleading
"... 00:00". Serials are built from bare Y/M/D parts, never by parsing a full
timestamp, so nothing can shift a date across a day boundary by timezone;
`excelSerialToday()` uses the user's LOCAL calendar day.

**Field mapping decisions (Ray's answers):**
- **Notes → `All.Remarks`** (Q1). There is no `Notes` column on All — it
  exists only on DB_Coins/Wishlist. The textarea **loads prefilled with the
  row's existing Remarks**, so an edit extends rather than silently clobbers
  text Copilot put there (18 real rows carry "Physical receipt in binder —
  not yet digitized.").
- **Fun Fact is now READ-ONLY in Edit Coin** (Q1) — it's a DB_Coins catalog
  fact about the coin TYPE with no All-sheet column to write to, so a
  per-coin edit surface for it was wrong. Displayed via `catalogFunFactFor()`
  (DB_Coins FunFact, falling back to the `FAKE_COIN_DETAILS` demo value so
  the mockup still shows something). **This supersedes the accordion-redesign
  addendum's "Notes & Fun Fact are now editable"** — Notes still is, Fun Fact
  isn't.
- **`SerNo` added to the allow-list; `CertLink` stays out** (Q4).
- **`Reviewed` is blanked on EVERY successful save**, changed or not (Q6) —
  an app-written row is by definition not human-reviewed yet, so it must not
  stay checked just because this edit didn't touch it.
- **`Total` is never written** (Q3) — it's a live formula
  (`=AllCoins[[#This Row],[Cost]]+AllCoins[[#This Row],[Shipping]]`), so
  Excel recalculates it the instant Cost or Shipping changes and the write
  layer must do nothing for it to stay correct.
- Identity-overwrite confirmation alone is sufficient for a Denomination
  change (Q7) — no extra handling. The Receipt pill in Edit Coin stays
  exactly as inert as it was; Save writes nothing for it (Q10).

**Containers read-layer join (built alongside).** A containerized record's
displayed Storage Location now resolves through the **Containers** tab
(`ContainerName -> StorageLocation`) instead of its own flat
`All.StorageLocation` — `resolveStorageLocation(record)`, wired into Browse
detail's Storage accordion. **Identical logic for a plain coin, a Set, and a
child coin — no record-type branching and explicitly no parent/child
inheritance**: a child carries its own Container like any other row, and a
child with a blank Container falls back to its OWN flat StorageLocation
rather than inheriting its parent Set's container. Blank/unknown Container
falls back to the flat value, so nothing ever renders blank because the
lookup is missing or still loading.
- **Edit Coin hides the StorageLocation input entirely when the location is
  container-derived** (Q5, approved as an intentional UI change), showing the
  derived value read-only with a short explanation. Leaving it live would let
  a save write a per-coin location disagreeing with its container's — exactly
  the drift the Containers tab exists to eliminate. A derived value is also
  **omitted from the write set entirely**, not written back. Clearing
  Container immediately hands the editable input back.
- **This does NOT extend to Photos or Receipts** — those still read the old
  flat All columns in this build; that migration is explicitly separate work.
- **Expect this to look like a no-op on current data**: all 314 rows with a
  Container already agree with the Containers tab, with zero orphan container
  names, so nothing displays differently today. It only diverges once a
  container is actually moved. That's the correct outcome, not a sign it
  isn't wired.
- New `.readonly-field` class for both this and Fun Fact — deliberately
  borderless/flat/muted with a left rule, **not** styled like an input (a
  first pass that looked like an input was caught in a screenshot and
  changed). Same "no global `.hidden` rule in this file" trap as before —
  `.readonly-field.hidden`, `#browseEditStorageLocation.hidden` and
  `.placeholder-note.hidden` are all load-bearing scoped rules.

**Test seams:** `__setBrowseEditWriteEnabledForTest()` overrides the gate
(kept as a separate override variable so the shipped `const` stays genuinely
immutable and no app code can flip it), plus
`__resetAllHeaderMapForTest()`, `__setContainersForTest()`,
`__setBrowseEditSnapshotForTest()`/`__getBrowseEditSnapshotForTest()`. The
mock Graph client gained a real 2-D sheet grid (`seed.sheets`, exposed as
`_grids`) plus `readWorkbookRange`/`readTableColumn`/`patchWorkbookRanges`,
so a test can mutate a cell between form-open and Save to simulate a
concurrent Copilot edit and then assert nothing was written.

### Phase 2 promote: duplicate-row bug (BUILT and merged to main)
The first live `_Testing` Promote (AY-00706, `C-1943-S-1C-01`) wrote **two
rows**: one holding the full coin, one holding nothing but CollectionID and
CoinID. **Both calls reported success and nothing in the app could tell.**
Ray's own hypothesis — a double-submission caused by Promote giving no
feedback — was correct, and reproducing it turned up a **second, worse
defect in the same function that needs no user error at all**.

**Root cause 1 — check-then-act.** `promoteCoinDraftToAllSheet()` already
checked `findAllSheetRowNumber()` before appending, so "add a check" was not
the fix: two submissions both read the column before either had written its
keys, both concluded no row existed, and both appended. Call 2 then
re-resolved by CollectionID, got call 1's row (first match wins), abandoned
its own row and wrote its data into call 1's — leaving row N complete and
row N+1 holding only its keys. Reproduced headlessly against the mock client
with real per-call latency; the artifact matched the live one exactly.

**Root cause 2 — the write target was arithmetic on a stale read.**
`createAllSheetRow()` computed `provisionalRow = before.length + 1` from a
read taken BEFORE the append. **Any** row appended in between — a second
promote, or Copilot working in Excel, which this workbook is explicitly
co-managed with — shifted the real new row down, so the key write landed on
**a different coin's row**, overwriting its CollectionID and CoinID;
`saveCoinRowToWorkbook()` would then write the rest over the top. Verified
directly with a single promote plus one external append: the neighbouring
coin's identity was destroyed and the genuinely-appended row left blank. The
old verify could not catch it — it looked the id up and found it exactly
where it had just been written, unable to tell "found my new row" from
"found the row I just clobbered."

**Why there was no feedback.** `promoteCoinDraft()` did toast on success —
but only after `finishCoinDraftWrite()`, which runs the photo move,
`refreshLiveCoinsAfterWrite()` (a full re-fetch of All + DB_Coins + DB_Sets +
Lookup_MetalContent) and two re-renders. On the real workbook that is easily
ten-plus seconds of total silence after the click. Add Coin's own Save has
had `btn.disabled` + `"Saving…"` since Phase 1; Promote never got it.

**The fix — four parts, all confirmed by Ray before building:**
- **A per-CollectionID in-flight lock** (`coinPromoteInFlight`), wrapping a
  renamed `promoteCoinDraftToAllSheetUnlocked()`. A lock rather than a
  disabled button because Promote renders on **two** surfaces (the Docket's
  Staging section and Staging Review) plus Force Add, so no single button's
  state can speak for the coin. A second call **coalesces onto the first**
  rather than being rejected — the honest outcome of a double-submit is
  "that coin got promoted", not an error — and the result carries
  `coalesced: true` so `promoteCoinDraft()`/`forceAddCoinDraft()` skip
  re-running the post-write chain (which would otherwise move photos twice
  and toast twice for one coin). force vs. non-force cannot collide through
  the UI: Promote only renders when the draft has a CoinID and Force Add
  only when it does not.
- **`createAllSheetRow()` rebuilt around three ordered guarantees**: the
  column is read AFTER the append, never before; the write target comes from
  **Graph's own reported index** for the row it just created (0-based within
  the table's data body, so sheet row = `index + 2` given the header at
  sheet row 1 — the same mapping `findAllSheetRowNumber()` already relies
  on), falling back to the table's last row; and — **the guarantee that
  actually matters** — the chosen row's CollectionID cell must be genuinely
  EMPTY before anything is written to it. However wrong an index ever got,
  this layer can no longer write a key over a populated one; it refuses and
  reports. Confirmed with Ray: on this workbook an appended row always lands
  at the literal last row of the table, from this app and from Copilot
  alike, so the two candidates normally agree. Cost is unchanged — read,
  append, patch, read either way. A tripwire also fires if the CollectionID
  turns up on the sheet underneath the write.
- **`findAllSheetRowNumbersFor()` / `collectionIdRowsInColumn()`** — a
  duplicate-aware verify used by the create path only, asserting **exactly
  one** row carries the id and that it is the row just claimed.
  **`findAllSheetRowNumber()` is deliberately left byte-for-byte untouched**
  (first-match, what Browse Edit's every save depends on), and the scan is
  duplicated rather than shared so a future change to this verify can't
  alter that hot path.
- **Real Promote feedback** — a shared `runWithButtonPending(btn, label, fn)`
  (disable + relabel immediately, restore in a `finally` **only if the button
  is still `isConnected`**, since these rows are routinely re-rendered out
  from under the click by the very operation finishing), wired into both
  Promote surfaces; and the success toast **moved ahead of** the slow
  follow-up chain, with that chain now wrapped so a bookkeeping failure
  produces its own honest follow-up toast instead of an unhandled rejection
  behind a success message. `forceAddCoinDraft()` got the same treatment for
  consistency — same function shape, same slow chain.

**Worth knowing: the fixes are defence in depth, not four independent
patches.** Removing the lock alone no longer reproduces a duplicate *data*
row — the blank-cell guard and the tripwire catch it — it just leaves a
stray blank row and a spurious error. The lock is what makes a double-submit
clean rather than merely non-destructive.

**Cleanup of the live artifact:** Ray deleted sheet row 1545 himself in
Excel (whole row, not cleared cells) after confirming 1544 was the complete
one. A receipt attached during that same test transferred correctly from
Staging to CoinReceipts; **photos were not exercised in that pass**.

### Item 5 — Force Add's orphan blank row (FIXED: claim, don't append)
**Superseded the "investigated, deliberately NOT fixed" state above.** Ray
picked option 2. `createAllSheetRow()` now **claims a blank row the table
already has** and only appends when there genuinely isn't one.

**The bug, restated.** The previous version always appended FIRST and only
then decided whether it could claim the result, so every failure path ran
AFTER the append and left that row behind — its own error text said so ("A
blank row was appended and can be deleted"). Reproduced end-to-end: call A
promotes and writes its row; call B's `findAllSheetRowNumber()` probe is
stale, so it appends, then hits the already-on-the-sheet tripwire and
strands its append. Full correct data + one blank orphan + one error,
exactly as reported live. **Not the old duplicate-row bug resurfacing** —
that fix was about the correctness of the CLAIMED row and it holds; what it
never added was cleanup of its own append.

**Why claiming rather than cleanup.** Nothing is created until the keys are
written, so a failure anywhere above leaves the sheet exactly as it was —
the orphan mechanism is removed at the source instead of compensated for
afterwards. It also needs no new row-delete primitive (none exists;
`deleteItem` is for OneDrive files, and deleting a row on a Copilot-shared
workbook is itself destructive). And it is free here: the table is
A1:AY1544 while data ends at 557, so 987 blank rows are already inside it.

**Three guards, none of them optional:**
- **The column is read FIRST, before anything is created.** This ordering
  IS the fix.
- **`allSheetRowIsBlank(row)` — the WHOLE row must be empty, not just its
  CollectionID.** A row can have a blank key and still hold real data (part
  entered, or an id cleared by hand); attaching a new coin to someone
  else's half-filled row would be worse than any orphan.
  `ALL_NEVER_WRITE_FORMULA_COLUMNS` (`SpotValue`, `Total`) is excluded
  deliberately — both evaluate to something on EVERY row in the table,
  blank ones included, so counting them would make no row ever claimable.
  Named once so it can't drift from the never-write list.
- **A session-wide `withAllRowCreationLock()`.** Appending was inherently
  unique; claiming is not, and the promote lock is keyed per CollectionID
  so it does NOT cover two different coins promoted at once — both would
  read, both see the same first blank row, both write keys to it. Verified
  by negative control: without the lock the concurrent case throws "the
  sheet now reports it at row (none)". Does nothing about Copilot editing
  in Excel; the whole-row check and the verify cover that, worst case with
  a clean failure rather than a clobber.
- The append path is **kept as the fallback** for when no blank row is
  left. It carries the old orphan risk, but is now the rare path.
- `BLANK_ROW_CLAIM_ATTEMPTS = 5` bounds how many blank-keyed rows get the
  whole-row check before falling back, since each is its own read.

**Visible behaviour change worth knowing: new coins now land immediately
after the real data (~row 558) instead of past all 987 blanks at ~1545.**

**Explicitly held in reserve, not built (Ray's call): option 3, a real
Graph workbook session for the create sequence.** That is the structurally
complete fix for the broader "no workbook session, so read-after-write
isn't guaranteed consistent" issue (verified: zero occurrences of
`workbook-session-id`; every read and write is its own transaction).
Revisit only if the same consistency class shows up elsewhere in the write
layer. **The table's ref/bounds are deliberately left as-is** — shrinking
it to its real 557-row extent is a manual structural edit to a live,
Copilot-shared workbook for a cosmetic reason, and unnecessary now the app
claims existing blanks. Row 1544/1545's stray blank from the earlier
incident is left alone; no cleanup was part of this.

### The AllCoins table is 987 rows longer than its data (workbook finding)
Found while root-causing item 5, verified directly against the real
production workbook: the `AllCoins` table's ref is **A1:AY1544** (header at
row 1, so 1,543 data rows) but **the last row carrying a CollectionID is
557**. Rows 558–1544 — **987 of them** — are already inside the table and
completely blank. No interior blanks; they are all trailing.

**Consequences, all confirmed by reproduction:**
- `addTableRow()` appends **past** all 987, so every coin the app creates
  lands around row 1545 rather than ~558. This is why the AY-00706 duplicate
  incident and this round's Force Add both involve "row 1545" — that number
  is not a coincidence, it is where the table currently ends.
- A newly appended blank row is visually indistinguishable from the 987
  already there, which makes "is there an orphan row?" genuinely hard to
  answer by eye — and makes it ambiguous whether a blank row Ray notices was
  created by the app at all.
- The append is arguably unnecessary: there are already 987 blank rows inside
  the table that the write layer could claim instead. **Not acted on** —
  changing which row a new coin claims is a real behavioural change with
  Copilot co-editing the same file, and it is Ray's call, not an
  implementation detail.

**This is a workbook-side condition, not an app bug**, and the app should not
silently "fix" it. Flagged for Ray to decide (shrink the table ref to its
real data, or leave it and have the app claim existing blanks).

### New rows stamp a literal "Owned" at creation (BUILT and merged to main)
**Supersedes this section's own "blank-for-Owned write convention" note
above.** Copilot backfilled every existing All row (556 total: 535 were
blank, 21 already said `"Owned"`) to a real, literal `"Owned"`. Going
forward, every code path that creates a brand-new row matches that —
`coinDraftToAllValues()` now writes `draft.allStatus || "Owned"` instead
of blanking the default case.

- **All of Add Coin's real write, Force Add, and Promote turn out to be
  ONE shared code path, not three.** `createAllSheetRow()`/
  `writeNewRowKeyCells()` claim or append the blank row and write only its
  key cells (CollectionID/CoinID, per the narrow-audit design already
  documented above); both Promote and Force Add reach that through the
  same `promoteCoinDraftToAllSheetUnlocked()`, which then writes every
  other field — Status included — via this one `coinDraftToAllValues()`
  call. One fix, confirmed to cover all three named paths.
- **Add Set's write layer has no code path that creates an All row at
  all** — confirmed by direct search, not assumed. Per its own section
  above, the app's writes there are Staging JSON + photo files only;
  moving data into a real All row is still the external/manual
  reconciliation step. There is nothing to change there today — flagged
  back rather than silently building a new write mechanism to cover it,
  which would have been real, unrequested architecture for what this
  task called a "small, routine change."
- **Does NOT touch Sell/Remove's own protection on Edit Coin** (Status is
  only written there when the user has genuinely touched the select this
  session) — that guards against stamping `"Owned"` onto an EXISTING
  blank/legacy row during an unrelated edit. This task is the row's
  one-time creation, a different moment, and the two don't conflict:
  creation always writes a real value now; editing an existing row still
  never writes one it wasn't asked to.
- A genuine exit-status pick at add-time (`draft.allStatus` already one of
  the four exit values) still writes its own literal string, never
  overridden to `"Owned"` — unaffected by this change, verified directly.
- A legacy draft with no `allStatus` field at all (written before that
  field existed) now defaults to `"Owned"` too, rather than a blank cell.
- **Verified headless — new committed suite
  `tests/verify_status_owned_on_create.js` (11 assertions), all passing;
  1043 across all 25 suites, zero failures, zero page errors.** Drives
  the real create-row path end-to-end via the mock Graph client (not just
  a unit check on the mapper) for Promote, Force Add, a genuine
  exit-status pick, and a legacy no-`allStatus` draft — each confirmed by
  reading the actual written row, not just the function's return value.
  Includes a negative control proving the old formula really did produce
  blank for the identical input the new one turns into `"Owned"`.
  `tests/verify_status_exit.js`'s own `H6` (which had asserted the now-
  superseded blank-for-Owned behavior) was updated to assert the literal
  `"Owned"`, following the real design change rather than being weakened.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every other real-Graph feature in this file.

### Set attach / detach: the real OriginSetID write layer (BUILT and merged to main; built on `claude/add-coin-write-path-fs2rf8`, tip `3767eb4`, landed via rebase; the code is on `main`)
The app's **first cross-row-target write**: initiated from a Set's Edit
form, but landing on a DIFFERENT row entirely (the coin's). Architectural
per the standing rule, so it was held for Ray's explicit merge go-ahead;
**since merged to `main`**.

**What existed before (confirmed directly, not assumed).** Attach was
session-only (`linkCoinToSet()` mutating `FAKE_SET_CHILDREN`), and **detach
did not exist at all — not even session-only**: `FAKE_SET_CHILDREN` was
only ever pushed to (no splice/delete anywhere), `originSetId` was only
ever assigned and never cleared, `buildSetChildRow()` rendered icon + name
+ meta + chevron with no remove control, and Edit Set's markup had exactly
two buttons ("Link coin", "Back"). Every `detach` hit in the file belonged
to the unrelated photo system. **Edit Set also has no write layer of its
own at all** — its Save is still session-only (`applyEditsToRecord`), which
is why attach/detach had to be immediate self-contained actions rather than
part of a form Save (same reasoning as the photo-commit path, which commits
on capture because its host screen has no Save button).

**The write primitive.** `writeOriginSetIdCell(rowNumber, originSetId)` —
one narrow, single-purpose, explicitly-audited path following
`writeCoinIdCell()`'s established precedent exactly. **`OriginSetID` stays
on `ALL_NEVER_WRITE_COLUMNS` and is NOT added to `ALL_WRITABLE_COLUMNS`** —
the general PATCH machinery still has no code path to it, which is the
whole point of the precedent (asserted, both directions). Attach and detach
are the **same primitive with different values** (the parent's CollectionID,
or `""`), so the audited write surface stays at exactly one function.

**Deliberately NOT a two-row write.** The real convention — confirmed
against the app's own `addChildToSetDraft()` (`originSetId:
draft.collectionID`) and against Ray's real hand-built 1967 SMS set — is
that linkage lives **entirely on the child**; a real parent Set row carries
no OriginSetID of its own. So despite the "cross-row" framing there is no
second row to keep in step and **no cross-row atomicity problem to solve**:
this is a single-row, one-or-two-cell PATCH that either lands or doesn't.
The cross-row aspect is only *which* row, handled by resolving
`findAllSheetRowNumber(childId)` fresh at write time (rule 1 of this layer)
plus a read-back verify.

**Conflict detection — a deliberate divergence from the whole-row snapshot
convention** (Ray's confirmed call). `saveCoinRowToWorkbook()`'s model
assumes a form OPENED against the row being written, so it can snapshot a
baseline at open time and diff every allow-listed column at save. None of
that holds here: the row written isn't the row being edited, Edit Set
snapshots nothing, and there is no form-open moment for the child (it comes
from a dropdown). `OriginSetID` isn't even in
`readAllRowWritableValues()`'s read set (`ALL_WRITABLE_COLUMNS` +
`ALL_CONTEXT_COLUMNS`), so the existing machinery is blind to it regardless.
Instead: a **field-scoped fresh read immediately before writing** —
attach requires the cell to be genuinely blank; detach requires it to still
name the parent being detached from; either mismatch refuses, reports what
the cell actually says, and writes nothing. Stronger than the general check
for the case that matters (something re-parented this coin since the picker
was built), deliberately weaker on unrelated fields (a concurrent Grade edit
has no bearing on Set membership).

**`LastModified` is stamped; `Reviewed` is deliberately NOT blanked.** This
is the one place this layer diverges from the blanket *"Reviewed is blanked
on EVERY successful save"* rule (Ray's explicit call): Reviewed means a
human has eyeballed this coin's own attributes, and re-parenting changes
none of them. `LastModified` is stamped because it is documented as "last
app touch" and the app did touch the row.

**`originSetCellEquals()` vs `originSetIdKeysMatch()` — two similar-looking
helpers, two genuinely different jobs; don't collapse them.** The new one
compares a cell's literal CONTENT to an expected literal, where
**blank-vs-blank IS a match** (an unattached coin's cell really is `""`).
The existing one answers "do these identify the same Set?", where two blanks
must NEVER match or every parentless coin links to every childless Set.
Both directions asserted.

**Per-child in-flight lock** (`setLinkInFlight`, same shape as
`coinPromoteInFlight`): a double-tap coalesces onto the first write rather
than erroring, and produces exactly ONE workbook write. Keyed per child, so
two different coins never block each other.

**UI.**
- **Detach control is opt-in per call site** (`buildSetChildRow(child,
  parentSet, onBeforeNavigate, onDetach)`, threaded through
  `renderSetChildRowsInto()`). Only Edit Set passes it, so the read-only
  surfaces that share the renderer (Browse detail's own accordion, the
  Manage Photos drill-down) are **structurally unable** to render a
  destructive control. `stopPropagation()` is load-bearing — the row is
  already a navigate-into-the-child click target.
- **Offered only when the write layer is on.** Flag off, there is nothing
  real to undo (the session-only link was never persisted), so no control
  renders and the picker's note says linking is session-only.
- **Confirmation is asymmetric.** Attach has none (additive, reversible,
  already a deliberate two-step through the picker). Detach confirms via
  `showWriteGuard()`, worded **more strongly than the photo-detach dialog**:
  that one could truthfully say the stored file survives, whereas here the
  OriginSetID value is genuinely destroyed and nothing else records which
  Set the coin came out of. The dialog notes a suffixed child id
  (`AY-00555-A`) still encodes its parent — but only when that's actually
  true of that coin — and states that **the CollectionID is never rewritten,
  Set membership or not** (it is a never-write key regardless).
- **Non-optimistic throughout**: in-memory state changes only after the
  write is confirmed, per the photo-detach fix's own precedent. On success
  the record is mutated **directly** rather than calling
  `refreshLiveCoinsAfterWrite()` — the exact delta is already known.

**`ensureOriginSetId()` is hard-guarded, not left to incidental
branching** (Ray's explicit call): it **throws** if reached while
`ENABLE_SET_LINK_WRITE` is on, since a real parent's OriginSetID must stay
blank always. Its `OS-LOCAL-…` demo behaviour is otherwise completely
unchanged for demo mode / flag-off / the existing suites.

## New rows always claim a blank row (standing rule, Ray, 27 Oct 2026)
Every write that creates a new row, on any table (All, Photos, Receipts,
DB_Sets, DB_Coins — and any future one), claims the first blank row directly
below the last row that already has an id, inside the same lock that writes
it — the same read-before-create pattern `createAllSheetRow()` established
for All. **Never a plain append to the end of the table**: every real table
the app writes to can carry trailing blank rows (`All`/`Photos`/`Receipts`
all do), and appending past them is exactly the bug `createAllSheetRow()`'s
own fix was written to close (see "Phase 2 promote: duplicate-row bug").
- **Audited 27 Oct 2026, on `claude/receipts-never-overwrite`: every
  row-creating write path in the app already does this.** `addTableRow()` —
  the only Graph primitive that can literally append — has exactly two call
  sites in the whole file: `createAllSheetRow()` (All) and `writeRecordRow()`
  (the shared helper behind both `writePhotoRow()` and `writeReceiptRow()`,
  i.e. Photos and Receipts), and both already scan for a claimable blank row
  first, falling back to append-and-verify only when none exists. There is
  no plain-append path left anywhere to fix.
- **"Staging" has no row-creating write path at all** — a coin or Set draft
  is a JSON file in a OneDrive folder (`coinDraftFolder()`/`setDraftFolder()`),
  never an Excel row, so this rule has nothing to apply to there directly;
  its eventual Receipts/Photos/All row, written once at promotion, is
  covered by the same rule as any other write to those tables (confirmed:
  `recordPromotedCoinRecords()`'s own Receipts write goes through the same
  `writeRecordRow()`).
- **DB_Sets and DB_Coins are never written by the app at all** (Copilot/
  manual-managed reference tables, read-only) — nothing to audit there
  either, but named in the rule so a future write to them starts right.
  Same for Containers, Albums, Wishlist, every Lookup_* table and the Sets
  tab — checked directly (no table-name constant or write call exists for
  any of them).
- A future sheet the app starts writing (a real ParkingLot write, say —
  today's is a placeholder toast, nothing is written) follows this rule from
  its first commit: reuse `writeRecordRow()` (or `createAllSheetRow()`'s own
  shape if the sheet has columns a general write must never touch, the way
  All's two live formula columns can't be) rather than reaching for
  `addTableRow()` directly.

## Dates the app writes are real Excel dates (built 4 Nov 2026 on `claude/date-writes-real-dates`, code `9b0fb7a` + `bfe52cc`, merged to main 4 Nov 2026 by fast-forward to `7b75c4e` on Ray's go-ahead after his TEST checks passed)
Ray's go-ahead 4 Nov 2026 (Q1-Q6). LIVE All.ValueDate on AY-00759 held the TEXT "2026-10-27T04:00:00.000Z"; Copilot wrote it (Office.js sends a JS Date as ISO text). The app's own paths already sent serials (since Aug 2026), but nothing at the choke points stopped a Date or ISO text, the reads showed a text date as blank, and a Photos / Receipts row rewrite dropped a text DateAdded.
- **Standing rule: every date the app writes goes through `toWorkbookDate()` and is sent as a whole Excel SERIAL NUMBER (never a "yyyy-mm-dd" string: Excel parses a string by locale and keeps it as text in a "@" cell), the user's LOCAL calendar day, with numberFormat `WORKBOOK_DATE_FORMAT` ("yyyy-mm-dd") in the same request.** `WORKBOOK_DATE_COLUMNS` = All: PurchaseDate, ValueDate, SaleDate, LastModified; Photos: DateAdded; Receipts: DateAdded; Ref_SpotPrices: LastUpdated (`isWorkbookDateColumn`). A new date column the app writes is added there.
- `toWorkbookDate(v)`: a serial (number or digits as text, floored), "YYYY-MM-DD" (optionally followed by a space and a time), an ISO date-time or a Date object (the LOCAL calendar day of that instant: "2026-10-28T02:00:00.000Z" is 27 Oct in New York), blank / null / undefined -> "". Anything else, an impossible day, zero or NaN THROWS ("Not a date: …"), so a Save refuses with a message instead of writing text. `workbookDateToday()` (local; `excelSerialToday()` now calls it), `localISODateToday()`, `workbookDateToISO(v)` (the read side: a serial or text -> "YYYY-MM-DD" or "", never throws), `isTextDateCell(v)` (a non-blank string), `columnLettersToIndex`.
- **Choke points:** `buildRowCellEdits` (All; every Edit Coin save, promote / Force Add, `saveCoinRowToWorkbook`'s LastModified) converts each date column; `patchRecordRow` (Photos / Receipts, so `writeRecordRow`, `writeReceiptRow`, `buildPhotoRowPatch` rewrites, Replace on all, Binder) converts each date column and sends value + format together; `writeOriginSetIdCell` / `writePurgedCell` stamp `workbookDateToday()`; `planSpotPriceWrite` sends `toWorkbookDate(dateSerial)` and never keeps a Text ("@") format (falls back to yyyy-mm-dd).
- **Final refusal:** `assertNoTextDatesInEdits(sheet, edits)` runs first in `patchWorkbookRanges` of BOTH the real client (before any token or request) and the mock: any Date object or any cell that is entirely an ISO date-time string (`ISO_DATE_TIME_RE`, anchored, so free text that merely contains one is allowed) refuses the whole batch: "Refused to write a date as text: All!I2 would get "…". Nothing was written."
- **A row rewrite keeps or repairs a text DateAdded** (R3): `buildPhotoRowPatch` re-sends the row's own DateAdded as read; `patchRecordRow` turns a serial or ISO text into a real date, and keeps unreadable text exactly as it was (never blanked, never guessed). It used to be `Number(text)` = NaN (sent as JSON null).
- **Read side:** `mapWorkbookRowToCoin` (purchaseDate, valueDate, saleDate), Edit Coin's form fill (`applySnapshotToEditFormInner`, the snapshot path too), `guardValueText` (every All date column; ValueDate / SaleDate showed serials; a text date shows "2026-10-27 (stored as text: "…")"), `spotPriceDateSerial`. `spotCellDate` stays strict on purpose: only a real number "already holds" a date, so a text LastUpdated gets rewritten.
- **Edit Coin repairs a text date on any save.** `saveCoinRowToWorkbook` diffs the whole form against the fresh row; the form now shows a text date as its date, which differs from the text cell, so the next Save of that coin (any field) writes it as a real date. A cleared date box is still never written (the form drops null; unchanged, pre-existing).
- **Docket row "Date stored as text"** (Other section, `.docket-text-date`, `textDateRowsFor(coin)`): one row per cell, for All date columns (`coin.textDates`, from `textDateCellsFromRow`) and Photos / Receipts DateAdded (`LIVE_TAB_TEXT_DATES`, built in `applyLiveNavOptionalRows` by `buildTabTextDates`). "AY-00759 · All.ValueDate holds “…”, not a real date (reads as 2026-10-27). Fix it in Excel." No Dismiss; a tap opens the coin; it clears once the cell holds a real date (next load). Tab rows skip a coin whose photos / receipt this session rewrote (`mediaChangedThisSession`), like the drift rows.
- **Staging / Docket JSON dates use the local day** (`localISODateToday()`: promotedDate, forceAddedDate, dismissedDate, resolvedDate, dateFlagged, stagedDate) instead of `toISOString().slice(0, 10)`, which was the UTC day (a day ahead after 8 pm in New York). Full timestamps (createdDate, updatedDate, editedDate) stay ISO instants on purpose; none reaches the workbook. stage.html is unchanged.
- **LastModified is a local DATE-TIME (Ray, 31 Oct / 4 Nov 2026; `bfe52cc`).** `WORKBOOK_DATETIME_COLUMNS` = All: LastModified (it stays in `WORKBOOK_DATE_COLUMNS` too, so a text value is still read and flagged). Written as the local day serial plus the local time as a fraction of a day (`workbookDateTimeNow()`, `localDateTimeSerial`, `toWorkbookDateTime`: a serial keeps its fraction, a Date / ISO date-time keeps its LOCAL time, "YYYY-MM-DD" alone is midnight, junk throws) with `WORKBOOK_DATETIME_FORMAT` "yyyy-mm-dd hh:mm" in the same request. The three stamps (`saveCoinRowToWorkbook`, `writeOriginSetIdCell`, `writePurgedCell`) use it; `buildRowCellEdits` keeps a date-time in its own range (runs break on a different format). Every other date column stays a whole day. Photo-only and receipt-only saves still do NOT stamp it (Ray, Q4). Old midnight values stay. `excelSerialToISODateTime` reads one back ("2026-11-04 23:30"; date alone at midnight); the conflict dialog shows LastModified with its time.
- **Docket wording (`bfe52cc`, `textDateFixText`):** an All date row ends "Fix it in Excel, or open the coin in Edit Coin and save any change: the app writes it back as a real date." (`TEXT_DATE_FIX_ALL`); a Photos / Receipts DateAdded row keeps "Fix it in Excel." (`TEXT_DATE_FIX_TAB`; no Edit Coin save rewrites those rows).
- **Test harness (test-only):** `openApp(viewport, { timezoneId, fixedTime })` emulates the device time zone and fixes `Date.now()` (`page.clock.setFixedTime`; timers keep running).
- **Left alone on purpose:** Copilot's own writes (the coordinator gives Copilot its note); the cleared-date-box quirk above; date cells the app never writes (DB_*, Wishlist, ParkingLot); old text dates are not bulk-fixed by the app (the Docket lists them).
- **Verified:** Ray's TEST checks passed (4 Nov 2026): Edit Coin dates, the text-date Docket row and its fix-on-save, Add Coin ValueDate, LastModified date + time on two saves, a photo-only save leaving LastModified alone. Not checked on LIVE yet (Ray deploys). Tests, negative controls and the TEST-check lists: docs/HISTORY.md "Dates the app writes are real Excel dates".
