# Reference: LEDGER (moved out of CLAUDE.md)

Read this file when: touching Ledger, Stats, spot prices, Status and Sell/Remove, or Wishlist.
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

## Ledger, spot prices, Wishlist, albums: Oct 2026 work (all merged to main, a06b976)
All of this is on `main` at `a06b976`, merged on Ray's go-ahead. It reaches the
live site only when Ray runs the deploy workflow for `main`.


### Wishlist "in work" (`tests/verify_wishlist_in_work.js`)
The Wishlist screen has no live read, so it showed `FAKE_WISHLIST` demo coins
in every mode. It now shows a plain "Wishlist: in work." note; the Share
button is hidden; the nav entry stays. Display only.


### Ledger: value by metal (`tests/verify_ledger_value_by_metal.js`)
- Valued = `All.Value` ONLY (`coin.recordedValue`); melt = `All.SpotValue`
  ONLY (`coin.meltValue`); each null when blank. A blank Value is "no recorded
  value", never melt. *(Since task (g), 30 Oct 2026: `coin.value` no longer
  falls back to SpotValue, and the By Metal label "Recorded" reads "Valued".
  See "Value fallback: melt is labelled" below.)*
- Each coin's whole value goes in its main metal bucket ("Other" for none);
  fine ounces come from DB_Coins via the CoinID specs join. Owned coins only.
  Gold bullion denominations are included.


### Value fallback: melt is labelled (task (g), 30 Oct 2026, `tests/verify_value_fallback_melt.js`)
Display only; nothing here writes to the workbook. Built on `claude/value-fallback-melt-label`
(Ray's plan answers, 30 Oct). A blank `All.Value` used to show `All.SpotValue` as if it were
value on about twelve screens (`coin.value` = Value, falling back to SpotValue).
- **`coinValueFigure(coin)`** is the one place that decides what a coin's figure is:
  `{ amount, basis }`.
  - `"valued"`: a recorded `All.Value` (a recorded 0 counts). Amount = max(Value, face),
    and the basis STAYS "valued" when the floor lifts it (Ray: a coin is never worth less
    than face).
  - `"melt"`: no recorded Value and `meltValue > 0` and `meltValue >= face` (melt equal to
    face stays "melt"). `meltValue` is the workbook's own `All.SpotValue` formula exactly as
    read; **the app never calculates melt**, and the amount is `meltValue` unchanged.
  - `"face"`: no recorded Value and no usable melt, but a face value: SpotValue blank, 0, or
    above 0 but BELOW face (Ray, 30 Oct 2026, a later change in the same task: melt below
    face is face, not melt; 94 owned coins on 30 Oct, mostly cents, melt about $0.83 against
    face about $3.82). Such a coin shows "$0.01 face" / "Face value" with no spot date, is on
    the face-only Ledger line, and is NOT in the Melt total, its count, or Net. The Melt tile
    therefore holds only coins whose melt is at or above face.
  - `"none"`: nothing.
  - Demo rows carry neither `recordedValue` nor `meltValue`, so their `value` counts as valued.
  - `coin.value` itself (`mapWorkbookRowToCoin`) is now recorded-only (0 when blank), so a call
    site that was missed can never show melt as value.
- **Wording** (`compactValueText`): "$12.40" / "$12.40 melt" / "$0.01 face"; nothing at all for
  "none", except the Catalog grid card, which shows italic "No value" (`.no-value`) instead of
  "$0.00". Compact surfaces carry no date: Catalog grid card, Sets card, Rolls card, Set child
  rows (`buildSetChildRow`), Ledger Find a Coin. Detail Overview: label "Melt value", figure
  "$12.40 · spot 2026-10-28" (just "$12.40" until the date is known); "Face value" for face;
  "Value" for valued. The "Value source" row shows only for valued. Share text and the
  screen-reader line say "melt value" (`valueSentenceText`); the share text adds
  "(spot prices <date>)", the screen-reader line does not.
- **Spot date** (`meltSpotDateSerial`): the OLDEST `Ref_SpotPrices.LastUpdated` among the metals
  the coin holds (`specs` oz > 0; all six when it has no specs); null while the rows are not
  loaded or a needed metal has no date. Only the DATE is read from Ref_SpotPrices, never a price
  (test C5 changes a price and asserts the melt figure does not move). The rows used to load only
  when the Ledger opened; the detail page now calls `ensureSpotPricesForMeltLabels()` for a melt
  coin and re-renders when they land (D1). `renderSpotPrices()` also calls
  `refreshLedgerValueTiles()` so the Melt tile fills its date when the rows arrive late (F1).
- **Ledger tiles** (`ledgerValueTotals`, `renderLedgerValueTiles`): Valued total (id
  `statTotalValue`) with "N coins with a recorded value"; Melt total (`statTotalMelt`) with "M
  coins with melt only · oldest spot price <date>"; Net gain/loss "(valued coins)" = Valued minus
  the cost of those SAME coins ("N coins, cost $X"); Total spent still counts every owned coin.
  Face-only coins are in neither total nor Net: a line (`statFaceLine`) says "27 coins at face
  only · $53.79" (live count and sum), plus "N coins with no value or face value" for basis
  "none" (e.g. a Set with no figure). By Denomination rows: "n · $valued + $melt melt" with a
  two-tone bar (valued solid, melt lighter). By Metal: "Recorded" renamed "Valued"; its figures
  are unchanged (they compare the two columns coin by coin).
- **Edit forms**: the Value box on Edit Coin and Edit Set now opens with the recorded value only
  (`editPrefillRecordedValue`); a melt-only coin opens blank. Edit Set has no snapshot, so the old
  prefill would have let backlog (r)'s "save all fields" write melt into `All.Value`.
- Rolls "value-desc" sort uses the figure's amount.
- **Set Variety line** (`setVarietyText`): `All.Variety` on a Set row, "Standard" when blank or
  whitespace; Sets only. Sets card third line "Variety: Standard"; Set detail Overview "Variety"
  row after Description. Display only: "Standard" is never written. Edit Set still has no Variety
  input (that belongs to backlog (r)).
- Not verified on a real device or against the real workbook (only the 30 Oct counts Ray gave:
  346 blank Values among 624 owned rows, 319 with SpotValue > 0 about $14,016, 27 with neither,
  $53.79 face, $18,395 cost).
- Still true, not fixed: Stats counts a Set plus its children, so a Set's figure and its
  children's can both be in the totals.


### Ledger: spot prices (`tests/verify_ledger_spot_prices.js`)
Reads `Ref_SpotPrices` (read path: `loadSpotPrices()` -> `fetchWorkbookSheetRows()`)
and shows only the six metal rows (Gold, Silver, Platinum, Palladium, Copper,
Nickel), not the sheet's blank and instruction rows.


### Ledger: "Update prices" panel (`tests/verify_spot_price_update.js`)
A manual editor for `Ref_SpotPrices`. Gated by `ENABLE_SPOT_PRICE_WRITE`
(folded into `WRITE_LAYER_ENABLED`), and writes only under the current
`WRITE_TARGET`.
- **Writes only three cells per changed metal:** PricePerTroyOz, LastUpdated
  (a real Excel date with a date number format) and Source, through
  `patchWorkbookRanges` (one `$batch` per metal), never `patchRecordRow`.
- All six metals editable, each range-checked (`SPOT_PRICE_RANGES`: Silver
  10-200, Gold 1000-10000, Platinum 400-5000, Palladium 300-5000, Copper
  0.10-3.00, Nickel 0.10-5.00). A change over 50% needs a tick. Source starts blank and is required when a
  price changed. A plain StackerScan link sits above the inputs (no fetching).
- **Before writing:** re-reads the sheet; refuses if any price changed since
  the panel opened (a cell already holding the intended value doesn't count);
  refuses a formula in a target cell or a missing header/row; skips metals
  already fully written.
- **After writing:** reads back and judges each metal (written / partly written / not
  written, against its pre-write values). Counts All.SpotValue / All.Total
  formulas before and after. Then reloads coin data; the "Reloading coin
  data..." line resolves to "Coin data reloaded." (or a failure note).
- **Patient read-back:** reads and writes are separate sessionless Graph calls
  (no workbook session anywhere in the app), so a read straight after a
  successful batch can lag (seen live: new price, old date and Source). For a
  metal whose write call succeeded but whose read-back doesn't match yet, it
  re-reads up to three more times (about 1, 2 and 4 s; `SPOT_PRICE_PATIENCE_DELAYS_MS`)
  and NEVER writes again during those re-reads. A metal whose write call failed or
  timed out gets no re-reads.
- 60 s deadline per request (`SPOT_PRICE_REQUEST_TIMEOUT_MS`). After an attempt
  that may have written, the only way on is "Check what's in the workbook"
  (reads only); "Try again" then writes only what is missing. Success shows a
  Done button.
- Writing / Verifying / Checking stages use the app's spinning-coin loader
  (`showSectionLoading`) with "this can take up to a minute, please keep this
  page open", and show no buttons.
- A real Graph **workbook session** (createSession, persistChanges) would remove
  the read lag. It is still held in reserve (the "option 3" below), not built.


### Stats & Value (locked in)
A dedicated Dashboard tile/tab, not front-loaded cards on the Dashboard itself
(see "App structure" above for that distinction). Shows: total item count (with
a coins-vs-medals breakdown), total spent, total estimated value, net gain/loss,
and a by-Denomination breakdown (count + value, one row per denomination with a
proportional bar). Depends on a new **Cost** field on the All sheet (purchase
price) alongside the existing estimated-value field — needed for the spent/value/
net-gain numbers to mean anything; today's Cost values are placeholder data, not
pulled from the workbook.


### Status vocabulary simplification + Sell/Remove action (BUILT and merged to main)
`All.Status` is now a real, plumbed field for the first time — it was
previously read/written nowhere in `app.html` at all, despite already being
a real column (confirmed against the live workbook: 1518 blank rows, 21
already carrying the literal string `"Owned"`, 4 carrying `"At PCGS"`).
Simplified vocabulary going forward: exactly five app-selectable values —
**Owned, Sold, Gifted, Returned, Spent**. `"Retained"` is being removed from
`Lookup_Statuses` entirely and never existed as an app option. `"At PCGS"`
is a real, still-current value (moving to a still-undecided storage-related
field is a separate, explicitly out-of-scope task) — never offered as a
pick, but an existing `"At PCGS"` row displays correctly and is left
completely untouched, same as every other real, pre-existing value this
app doesn't itself generate.

**Sell/Remove is not a new action screen — it's Status becoming a real
field on the coin/set's own Edit page, reusing Browse Edit's existing
write path.** Picking one of the four exit values reveals four existing
All columns beneath it — `SaleDate`, `Buyer`, `SalePrice`, `Platform` —
reused generically across all four reasons rather than as Sold-only
fields (Gifted defaults `SalePrice` to 0, since a token payment can still
be recorded; Returned/Spent leave all four optional). Any reason-specific
detail beyond these four belongs in the existing Remarks field — no new
columns.

**Coins and Rolls (both via Edit Coin) get the real write; Sets stay
session-only.** Edit Set has no real write layer at all — its Save button
is still the original session-only stub — and building one is a
materially bigger, separate task, deliberately not bundled into this one
(confirmed with Ray before building). Sell/Remove on a Set writes onto the
in-memory record only, with the same "not saved to OneDrive" toast Edit
Set's Save has always shown.

- **`Status`, `SaleDate`, `SalePrice`, `Buyer`, `Platform` added to
  `ALL_WRITABLE_COLUMNS`** (confirmed exact real header names/positions by
  reading the live workbook directly: `Status` at AI, `SaleDate`/
  `SalePrice`/`Buyer`/`Platform` at AP–AS). `SaleDate` added to
  `buildRowCellEdits()`'s `isDateCol()` list, same explicit `yyyy-mm-dd`
  format as every other date column in this layer. `CONFLICT_FIELD_TO_INPUT`
  gained all five, so a concurrent-edit conflict on any of them is named
  correctly in the guard dialog.
- **The one real bug risk, designed around rather than discovered
  afterward.** The Status `<select>` displays `"Owned"` for a blank cell
  (blank already means Owned — `Lookup_Statuses`' own description says so
  outright), but the write layer only sends a column to Excel when the
  form's value differs from the freshly-read live cell. If the display
  value were always sent, an untouched blank row would get the literal
  string `"Owned"` **written** the next time ANY unrelated field on the
  same form was saved — silently touching hundreds of real rows over
  time, purely as a side effect of the display choice. Fixed by including
  `Status` in the outgoing write **only when the user has genuinely
  interacted with the select this session** — reusing the exact same
  delegated `browseEditTouchedFields` tracking every other Browse Edit
  field already relies on, not a new mechanism. Verified with a genuine
  negative control: artificially marking the select "touched" without a
  real pick (reproducing what the naive unconditional-inclusion version
  would have done for every blank row) reliably stamps the literal
  `"Owned"` onto the same save that the real code leaves untouched —
  confirming the gate is what's actually preventing it, not a coincidence
  of the test's own setup.
- **An explicit pick, including picking Owned back, IS a real write** —
  matches CACBean's own established "explicit user choice is a real
  write, not an omission" rule (`""`/both-boxes-unchecked already writes
  for real there). Reverting a coin from an exit status back to Owned does
  **not** clear `SaleDate`/`Buyer`/`SalePrice`/`Platform` (Ray's explicit
  call — preserve a "previously sold, reacquired" trail rather than
  silently erasing it). This falls out for free from how the four fields
  are read: unlike `Status`, they're never gated on touched-state or on
  whether the reveal block is currently visible — read and written exactly
  like Purchase Details' own `Cost`/`Shipping`/`Vendor`/`PurchaseDate`,
  which are never gated on that accordion being open either. If the user
  doesn't touch them, they simply write back whatever was already there
  (no diff, no data loss).
- **`setSelectValuePreservingUnknown()` is what makes an existing `"At
  PCGS"` row display correctly** instead of silently falling back to no
  selection — the exact MintMark `"P"` bug class this project has hit
  before. Reused, not reinvented.
- **Add Coin gets the plain 5-value picker only, no reveal** (Ray's
  explicit scoping) — logging a coin that's already left the collection
  at add-time is rare enough that "add it, then immediately edit/sell it"
  is the accepted path. Defaults to Owned on reset. The draft's own field
  is named **`allStatus`, deliberately not `status`** — a coin draft
  already has its own `status` field meaning the DRAFT'S workflow state
  (`COIN_DRAFT_STATUS.DRAFT`/`READY`/`PROMOTED`/…), a completely different
  concept on the same object; naming collision would have been a real,
  silent landmine. `coinDraftToAllValues()` writes **blank** for the Owned
  default (matching the real workbook's own convention — 1518 of 1543 rows
  are blank, not a literal `"Owned"` string) and the real literal string
  only for a genuine exit-status pick.
- **Ledger gained two real sections — it had none before this.** Read the
  code before assuming otherwise: `renderStats()` was pure aggregate stat
  tiles (total items/spent/value/net + a denomination bar breakdown), zero
  coin-level list or search of any kind. Added:
  - **"Find a Coin"** — a plain flat search (reusing Catalog's own search
    predicate, factored out as `coinMatchesSearchQuery()` so the two never
    duplicate logic), scoped to still-Owned rows only (an exited coin
    never appears here, even if its name/ID matches — this list exists to
    find something to act on). Deliberately no filter-chip parity with
    Catalog — Ray's explicit call: this is a means to one coin, not a
    browsing surface. Capped at 25 results so a broad query can't dump
    hundreds of rows.
  - **"Exit History"** — every coin/Set/Roll carrying one of the four exit
    statuses, one combined list with the Status (and Sale Price, including
    a real `$0` for Gifted — shown, never omitted) inline per row — not
    split by reason (Ray's call; splitting later is easy if it turns out
    to matter). **SUPERSEDED — this is now "Former Holdings", a real
    filterable/sortable sub-catalog with a Purge action, and it excludes
    anything fully purged.** See "Former Holdings sub-catalog + Purge".
  - Both reuse the existing `.wish-item` row styling; tapping a row opens
    that coin's Browse detail view (where the real Edit/Sell-Remove action
    lives), Back returning to Ledger via the same per-origin
    `browseDetailBackHandler` pattern Spotlight's click-through and Albums'
    filled-slot tap already use — not a new navigation mechanism.
  - **Deliberately does NOT touch the existing stat tiles' own totals** —
    those still count every row regardless of Status, unchanged. Filtering
    the Dashboard/Catalog's own numbers by ownership is the separate,
    already-deferred "Owned-default Catalog filter chip" item and was not
    silently pulled into this task.
- **Browse detail's read-only Overview** gets a Status row (and the four
  exit facts) — applies to both a coin and a Set (a bundle can be sold/
  gifted too), omitted entirely for Owned/blank **and** for `"At PCGS"`
  (this section is specifically about the four-exit-status story, not
  every possible Status value). `SalePrice` uses `!= null`, not a truthy
  check, so Gifted's real `$0` renders rather than being hidden.
- **Two sparse `FAKE_COINS` demo rows seeded** (AY-00005: Sold; AY-00007:
  Gifted, `salePrice: 0`), same sparse-lookup convention as every other
  optional demo field in this file.
- **Verified headless — new committed suite `tests/verify_status_exit.js`
  (55 assertions), all passing; 1032 across all 24 suites, zero
  failures, zero page errors.** Covers: the exact five-option vocabulary
  everywhere (Add Coin, Edit Coin, Edit Set) with `"At PCGS"`/`"Retained"`
  confirmed absent; `statusSelectDisplayValue()`/`isExitStatus()` in
  isolation; a full real end-to-end mock-Graph-client save proving the
  central fix (blank stays blank across an unrelated save, an explicit
  pick writes for real, **with a genuine negative control** reproducing
  the bug when the touched-gate is bypassed); a real `"At PCGS"` row
  displaying correctly via an injected `<option>` and surviving an
  unrelated save untouched; the exit-fields reveal/hide and the
  no-auto-clear-on-revert behavior through a real save; Gifted's
  auto-default-to-0 (and that it never clobbers a typed value); Browse
  detail's read-only rows including the real `$0` case; Add Coin's
  `allStatus`/draft-`status` non-collision **(the blank-for-Owned write
  convention this originally covered is superseded — see the follow-up
  section immediately below)**; Edit Set's session-only path (real
  in-memory write, honest toast, no live write); and Ledger's search/
  exit-history behavior end-to-end including the row-click-to-detail-and-
  back round trip. No prior assertion was weakened — the one pre-existing
  count (`H4`, "all N date inputs share the calendar-picker-glyph fix")
  was updated from 7 to 9 to reflect the two new date inputs, following a
  real, deliberate design change.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every other real-Graph feature in this file.


