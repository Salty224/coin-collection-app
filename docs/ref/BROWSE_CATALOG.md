# Reference: BROWSE_CATALOG (moved out of CLAUDE.md)

Read this file when: touching Catalog, the Sets tab or checklist, Rolls, Browse filters, or the live-nav-data read path.
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

## Catalog: Finish tag on list rows + Finish filter (Oct 2026, merged to main, built on `claude/catalog-finish-filter-and-list-tag`, tip `4f6577b`)
Merged to `main`. Suite: `tests/verify_catalog_finish_filter.js` (30).
- **List-view tag**: `catalogListFinishTagHtml(coin)` appends a small muted
  `.finish-tag` (" · Proof") to the `.name` line of a Catalog list row. Hidden
  for blank and for `DEFAULT_FINISHES_HIDDEN_ON_PAGE` (Business Strike,
  Uncirculated), so no stray separator. Full value, escaped, ellipsis via
  inline-block (no abbreviation exists in the app). **Rendered only when
  `browseViewMode === "list"`**; the grid/list toggle buttons now call
  `applyActiveBrowseTabFilters()` so the tag appears/disappears. That keeps
  grid cards free of Finish text (`verify_finish_display` G1 unchanged).
  The Medals list shares `renderBrowseGrid()` and gets the tag too.
- **Finish filter**: `#browseFinishFilters` in `#browseCoinsHeader`,
  `BROWSE_FINISH_CHIPS` / `browseSelectedFinishKeys` / `browseFinishTest()`,
  multi-select OR via `chipRowTest()`, ANDed in `applyCoinsTabFilters()`,
  cleared in `resetBrowseFilters()`. Pills All / Strike / Proof / Rev. Proof /
  Special, each with a full-name title + aria-label; tighter chip padding on
  this row only so it fits one line at 360px.
  `CATALOG_FINISH_GROUPS` (matched trimmed, case-insensitive,
  `catalogFinishGroupKey()`): Strike = Business Strike, Uncirculated; Proof =
  Proof, Matte Proof; Rev. Proof = Reverse Proof, Enhanced Reverse Proof;
  Special = Burnished, Enhanced Uncirculated, Satin Finish, SMS, Specimen,
  Matte. Blank or anything else (e.g. "Various") shows only under All.
  **Hardcoded on purpose: the app does not load Lookup_Finishes.**
- **Search**: `coinMatchesSearchQuery()` now also matches `coin.finish`. That
  helper is shared, so Ledger's Find a Coin and Former Holdings search match
  Finish too.
- **Left alone**: no sort control (default Year then Mint Mark), grid cards,
  the Medal tab's own dead filter path (`applyMedalTabFilters`), Rolls/Sets.
- **Not verified**: the real mix of All.Finish values, any real device.


### Browse: Grid/List toggle (locked in)
A small icon toggle (grid icon / list icon) next to the filter row switches the
coin listing between the existing card grid and a plain list-row layout. Both
reuse the exact same card markup — list mode is a CSS rearrangement rather than
a separate render path, so the two stay in sync automatically. List mode drops
the coin thumbnail entirely (reclaims row width) and enlarges Year+MintMark so
it reads as the dominant, immediately-scannable element per row, with the coin
name and CollectionID secondary. The chosen mode persists across filter changes
within a Browse session.
- **Superseded: grid mode now uses a `.flip-frame-mini`** — a scaled-down
  version of the Dashboard/Browse-detail flip-frame (case background, corner
  labels overlaid on the disc: top-left Year+MintMark, top-right denomination
  code only, bottom-left Grade) instead of the earlier plain disc-then-text
  card, so a coin reads as the same coin whether it's spotlighted or browsed.
  The old plain name/meta/grade-badge text block still exists in the DOM
  (used by list mode, unchanged) but is hidden in grid mode now that the
  corner labels cover the same information.
- **Real-device fix: explicit 2-column layout at phone widths.** `.coin-grid`
  relied on `grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))` to
  size itself, which on at least one real Android device (Ray, Samsung S25)
  was collapsing to a single column — full-width stacked cards — despite the
  viewport comfortably fitting two 150px+ columns in every reproduction
  attempt here. A `@media (max-width: 480px)` rule now forces
  `grid-template-columns: repeat(2, 1fr)` directly at phone widths rather
  than trusting `auto-fill`'s computed count there; `auto-fill` is untouched
  above that width, where it was already producing 3+ columns without issue.


### Browse: navigation restructure (locked in, supersedes "Browse filters" above)
Browse is now **four tabs: Coins | Rolls | Sets | Albums**, not one filter
row mixing Denomination with Sets/Medals/Commemoratives. `showBrowseTab()`
switches between them; `activeBrowseTab` only ever holds `coins`/`rolls`/
`sets` — **the Albums tab has no content of its own inside Browse at all, it
immediately calls `navigate("albums")`** and lands on the real, standalone
Albums page (same page reachable from its own nav item) rather than
rendering anything inline.
- **Root cause of the old bug, and the real signal that replaced it
  (confirmed against the workbook):** `SetID` is NOT a reliable "is this a
  Set" signal — 135 of 136 Set-category rows currently have a blank `SetID`
  (a known backlog, unrelated to this restructure, not something to fix
  here). The reliable signal is **Denomination="Multiple" combined with
  Category** being one of `Proof Set` / `Mint Set` / `Silver Proof Set` /
  `Reverse Proof Set` / `Legacy Collection` / `Prestige Set` / `Quarters Set`
  / `Educational Set` (and similar future values).
- **A Set is now one owned All-sheet row, period** — Denomination="Multiple"
  bought/logged as a single bundled purchase — not an aggregation of
  separately-catalogued member coins. This retires the old `FAKE_SETS`
  entity-with-member-coinIds model entirely (`renderSetsPicker`,
  `showBrowseSetsPickerMode`, `showSetDetail`, the `isSets` chip special-case,
  and their DOM — all removed, not just hidden). The parent/child CollectionID
  suffix system (`AY-#####-Set` / `-A` / `-B`, acquisition/provenance lineage
  under "ID schemes") was out of scope for *this restructure* — but child
  coins are now surfaced read-only on the Set detail view via the separate
  `originSetId` join (see "Multi-coin Set display" above). Still out of scope:
  breaking a bundle out into standalone owned child *rows* (children remain
  nested-only, not independently browsable/counted), and any in-app creation
  of that structure.
- **`category` is a new, single-valued All-sheet field** (confirmed against
  the workbook — a row is never simultaneously Category="Proof Set" AND
  Category="Commemorative") that **replaces two old fields**: the coin-level
  `setType` tag (a coin's own "which package" tag — retired, since Sets are
  bundle rows now, not a tag on an individual coin) and the `commemorative`
  boolean (Commemorative is just one possible Category value, on both
  individual coins — 22 real rows, single Denomination — and Set-bundle rows
  — 4 real rows, Denomination="Multiple").
- **`Denomination="Medal"` replaces the old `itemType` field entirely** — the
  real workbook has no `itemType` column; a standalone medal (never bundled
  inside a Set) carries Denomination="Medal" directly. Every place that used
  to read `coin.itemType === "medal"` (the Coins-tab Medals chip, the Stats &
  Value tile's coins-vs-medals breakdown) now reads `coin.denom === "Medal"`
  instead.
- **`RollID` is a new, distinct All-sheet column** (confirmed against the
  workbook, separate from `DB_Rolls`, which stays a product-reference table
  only, still not part of the main coin data) — an owned row with a populated
  `RollID` belongs to the Rolls tab. Rows with RollID carry a normal single
  Denomination each (not "Multiple") — a roll is still fundamentally
  one-denomination, unlike a Set bundle.
- **Coins tab**: unchanged Denomination pills (`Cents`/`Nickels`/`Dimes`/
  `Quarters`/`Halves`/`Dollars`) plus a new **Medal pill**, all multi-select/
  OR-combinable exactly like before (`BROWSE_FILTER_CHIPS`,
  `browseSelectedFilterKeys`) — this row's base row-set explicitly excludes
  Denomination="Multiple" (Sets) and RollID-populated (Rolls) rows, so a row
  never double-shows across tabs. Metal stays its own single-select row,
  unchanged. **Commemorative is now an independent boolean toggle**, not part
  of the Denomination OR-group — Category and Denomination are different
  fields, so "Dollars + Commemorative" is a real, meaningful AND (all three
  axes — Denomination/Medal, Metal, Commemorative — AND together;
  `applyCoinsTabFilters()`).
  **Default display order is Year then Mint Mark** (`sortCoinsTabRows()`,
  applied after every filter combination, not the underlying array's own
  insertion order) — mint mark ties break on the same canonical order as
  the Mint Mark dropdown (blank/Philadelphia, D, S, CC, O, W;
  `MINT_MARK_ORDER`/`mintMarkSortIndex()`), not alphabetically. Two rows
  sharing both Year and MintMark keep their relative array order (a stable
  sort), rather than introducing a third arbitrary tiebreak field.
- **Sets tab**: Category pills — `All`, `Proof Set` / `Mint Set` / `Silver
  Proof Set`, **`Commemorative`, then `Other` last** (fixed pill-order bug:
  `Other` and `Commemorative` were swapped; `Other` must always render last
  since it's the catch-all bucket, `Commemorative` sits second-to-last — no
  other reordering). **Unlike the Coins tab, this
  whole row is single-select, not multi-select** — Category is the exact
  same single-valued field the pills read, so a row can never match two of
  them at once (`BROWSE_SET_CATEGORY_CHIPS`, same single-select interaction
  pattern as Metal). `Other` = any Set-category row not matching one of the
  three named pills or Commemorative (`Reverse Proof Set`/`Legacy
  Collection`/`Prestige Set`/`Quarters Set`/`Educational Set`/future values
  all land here; it deliberately excludes Commemorative-category rows, which
  are only reachable via their own pill). No Denomination filter on this tab
  — nearly all Set rows are Denomination="Multiple," so it wouldn't produce a
  meaningful split; deliberate, not an oversight. Cards reuse the existing
  box-icon `.album-card` style (`renderSetsGrid`) rather than the coin-disc
  treatment — a Denomination="Multiple" row has no single coin to render as a
  disc — and there's no Grid/List toggle (hidden while this tab is active).
  Tapping a card opens the same Browse detail view a Coins-tab card would;
  this row IS just an owned item now, nothing set-specific about its detail
  view.
- **Rolls tab**: RollID-populated rows, no filter pills (low row count), tap
  into the same `showBrowseDetail()` view as Coins, since every roll row
  carries one normal Denomination. **Superseded twice**: originally reused
  `renderBrowseGrid()`'s coin-disc grid; then restyled to a stacked-coin
  visual (`.coin-roll-stack`); now a plain `album-card`-style list with a
  sort control — see "Rolls tab: list view + sort control" below for the
  current, locked-in design.
- **Nav**: `Sets` is a full 6th persistent nav item, same standing as Albums
  — see "App structure" above. `Rolls` deliberately got no nav entry or
  Dashboard tile at all — reachable only by tapping its tab after already
  being in Browse.
- **Albums got an additive Denomination filter, nothing else changed there.**
  Each album already carries its own top-level `denom` field (every album is
  inherently single-denomination) — the new filter row just reads that
  existing field (`albumsFilterTest`), no new derivation logic was needed.
  Same multi-select-OR interaction as the Coins tab's Denomination row.
- **Explicitly out of scope for this restructure**: no in-app "Add Set" /
  "Add Roll" creation flow — display and filtering only, same boundary as
  Coins/Albums today. Real creation is hard-blocked on the CollectionID-
  reservation system and the OneDrive write layer, neither of which exist
  yet (see "Add Coin: the core workflow").


### Medal tab (locked in, supersedes the Medal chip mentioned above)
Browse is now **five** tabs — `Coins | Sets | Albums | Medals | Rolls`
(`BROWSE_TABS`) — Medal promoted from a Denomination-style chip inside the
Coins tab's filter row to its own top-level tab, one path to it, not both.
Nav placement only, per Ray's explicit framing: medals aren't numismatically
coins even though they share the CoinID pattern — no underlying data/schema
change (Denomination="Medal" is still exactly what it was). **Superseded:
tab label pluralized "Medal" → "Medals" (to match Coins/Rolls/Sets/Albums)
and reordered to Coins/Sets/Albums/Medals/Rolls** — label text and array
order only; the internal tab key stays `"medal"` (singular) throughout,
`medalTabBaseRows()`/`applyMedalTabFilters()` and everything else below is
unchanged.
- **`coinsTabBaseRows()` now also excludes `denom==="Medal"`** (alongside the
  existing Set-bundle/Roll exclusions) and a new `medalTabBaseRows()`
  (`FAKE_COINS.filter(c => c.denom==="Medal")`) feeds a new
  `applyMedalTabFilters()` — same "a row never appears in more than one tab"
  rule the Rolls/Sets split already established.
- **Reuses Coins' exact card treatment** (`renderBrowseGrid`, same
  `.coin-card`/flip-frame-mini look, same Grid/List toggle, same Value-hidden-
  on-grid CSS rule — extended to `[data-tab="medal"]` alongside
  `[data-tab="coins"]` so a medal's grid card looks exactly as it did when it
  was still inside the Coins tab).
- **Metal filter + Commemorative toggle stay available on the Medal tab** — a
  medal can still be gold/silver and can still be Category="Commemorative",
  so those axes are still meaningful and still AND-combine, same as before
  the tab split. **Only the Denomination pill row hides** (`#browseFilters`,
  toggled in `showBrowseTab()`) — there's nothing to choose there anymore,
  the tab itself already scopes to Denomination="Medal". Both tabs share the
  same `#browseCoinsHeader` container; only the inner pill row's visibility
  differs per tab.
- **Year + Missing Photos toolbar filters apply unchanged** (shared across
  Coins/Rolls/Sets already, now Medal too — no new logic needed, the shared
  toolbar row was already tab-agnostic).
- **No nav entry or Dashboard tile** — same standing as Rolls (not Sets/
  Albums, which are full persistent nav items): reachable only by tapping
  the tab after already being in Browse. `resetBrowseFilters()`/external-
  entry-resets-to-Coins-tab behavior is unaffected — Medal introduces no new
  persisted filter state of its own.
- Verified headless (14 assertions): tab order/labels, Medal chip gone from
  the Denomination row, `coinsTabBaseRows()` excludes Medal, Medal tab card
  count matches `medalTabBaseRows()` exactly, Metal/Commemorative header
  stays visible while the Denomination row hides, Year filter ANDs correctly
  against the Medal tab, and switching back to Coins restores the
  Denomination row.


### Rolls tab: list view + sort control (locked in, supersedes the coin-stack visual below)
The Rolls tab no longer renders its own coin-disc grid at all — it's a
plain list of **`case album-card` rows, styled identically to the Albums
picker list** (`renderRollsGrid()`): a 🪙 icon, the roll's name + a
`{yearMint} · {denom} · $value` meta line, and a chevron, tapping into the
same Browse detail view as before. This replaces the earlier
`.coin-roll-stack`/`.roll-edge` edge-on stack visual (see below) entirely —
that CSS and markup are gone, not just hidden. Reuses the `sets-mode` CSS
class for the full-width stacked layout (same class the Sets tab already
uses for its own `album-card` rows — generic despite the name, see its CSS
comment). Since there's no coin-disc grid anymore, the Grid/List view
toggle is hidden for this tab too (same as Sets) — a list of icon rows has
no grid mode to switch into.
- **New sort control** (`#rollsSortSelect`, a plain `<select>` above the
  list, right-aligned) — no sort control existed anywhere else in the app
  to match, so this establishes the pattern rather than reusing one: Year
  (Newest/Oldest First), Denomination (canonical `STATS_DENOM_ORDER`, not
  alphabetical), Value (High to Low), Name (A-Z). Persists across tab
  switches within a session (`rollsSortKey`), same as the Coins tab's own
  `browseViewMode`.
- **The mixed-date "Various" roll is handled explicitly in the year sort**
  (`rollYearNumber()`/`compareRollYear()`) — a non-numeric year always sorts
  to the bottom regardless of direction, rather than producing `NaN`
  comparison noise. Verified via headless browser against the real
  `AY-00026` demo row (see below).
- Composition/Specifications behavior, the `applyFlipCorners()` corner-label
  fix, and everything else about a Roll's own Browse **detail** view are
  unchanged by this — only the Rolls **tab's list rendering** changed.

#### Superseded: the coin-stack visual (`.coin-roll-stack`)
A roll is ~20 coins, not one — the Rolls tab's grid cards used to read as a
short stack of coins viewed edge-on (`.coin-roll-stack`, 3 decorative
`.roll-edge` circles peeking out below/behind, negative z-index scoped via
`isolation: isolate` so they stay behind both the disc and the tap-to-flip
button instead of escaping past it and painting behind the whole card's own
background, invisibly). Only the top layer was a real `.coin-disc` — same
reference-image/placeholder/tap-to-flip treatment as any other coin's disc,
just with muted stacked edges beneath it. **Gone as of the list-view
redesign above** — kept here only for history.
- **Generic/mixed-date roll**: `coin.year` carries the literal string
  `"Various"` (mint left blank) for a roll that isn't one specific date —
  **no new flag/schema field**, confirmed safe by auditing every place
  `year` is read in the file (corner labels, grid captions, sr-only text,
  DB_Coins-match comparisons): all of them either concatenate it into a
  string or explicitly cast with `String()` already, none do numeric
  arithmetic on it, so `"Various"` renders correctly everywhere with zero
  other code changes. Demo row: `AY-00026`, "Roll of 20 Silver Dollars
  (mixed dates)".
- **Composition is promoted to an always-visible key fact for Rolls only**
  (`isRollRow()`, gated purely on a populated `RollID`) — melt/junk-silver
  value hinges on it, unlike a normal coin, where Composition still lives
  only inside the collapsed Specifications accordion. The Specifications
  accordion itself is skipped entirely for Rolls (per "Rolls need much less
  detail than an individual coin" — Weight/Diameter/Edge/etc. describe one
  coin, not a roll of ~20, and aren't meaningful without an aggregation this
  app doesn't do). **A Roll's Composition/`FAKE_METAL_CONTENT` entry holds
  the AGGREGATE oz for the whole roll, not one coin** (e.g. the 1921 Morgan
  Dollar Roll's 15.468 oz = 0.7734 oz/coin × 20) — showing a single coin's
  figure would understate real melt value by ~20x and defeat the point of
  surfacing it prominently at all.
- **Corner-label fix, applies to Rolls specifically**: `applyFlipCorners()`'s
  top-right corner used to always run `seriesLabel()`/`renderTypeDenomCorner()`
  (which assume `coin.name` is shaped like `"{Series} {Denomination word}"`,
  e.g. "Morgan Dollar") — a Roll's name is a full descriptive sentence
  ("Roll of 20 Silver Dollars (mixed dates)"), so stripping a denom-word
  suffix did nothing useful, and the "shorten to last word if it doesn't fit"
  fallback (meant for an overlong series name) picked whatever token
  happened to be last, garbling into things like "dates)" or "coins)$1" —
  caught via direct browser testing, not just code review, before this
  shipped. Fixed: a Roll's top-right corner shows just the denomination
  code, same exception Browse's grid-mini cards already use for every card
  — the full descriptive name is already the page's own title above the
  flip, so nothing is lost.


### Metal filter: expanded to 7 categories (locked in, supersedes the pill set above)
The Metal filter pills now read a new, real field —
`Lookup_MetalContent.MetalCategory`, one of exactly 7 values: `Gold` /
`Silver` / `Platinum` / `Copper` / `Zinc` / `Clad` / `Other`
(`metalCategoryFor()`, still sourced from `FAKE_METAL_CONTENT` — same sparse
lookup, same CollectionID key, no new data structure) — instead of the old
precious-metals-only Oz-qualification rule.
- **A different, coexisting concept from Composition, not a replacement for
  it.** The Oz-based fields (`goldOz`/`silverOz`/etc.) and their "any nonzero
  content" qualification rule are untouched and still drive the detail
  panel's Composition row (and the new Specifications accordion — see
  "Browse detail view" above). MetalCategory is a single categorical bucket
  per coin covering **every** coin, not just precious-metal ones (a modern
  clad quarter gets `Clad`, not blank) — a different column doing a
  different job on the same row.
- **Still single-select** — combinable OR/AND filter behavior across axes
  (Denomination/Metal/Commemorative/etc. all combining freely) is a real,
  separate, not-yet-built spec item; explicitly out of scope here, not an
  oversight.
- **"Other" matches EITHER an explicit `Other` OR a blank/unset
  MetalCategory** — most rows will show blank/Other interchangeably until a
  separate research pass backfills the real column, and a genuinely unset
  category has to land somewhere or it becomes unreachable via any pill.
- **Supplementary info per pill, hover or tap** — each pill carries a native
  `title` attribute (free desktop hover) listing that bucket's constituent
  compositions (`METAL_CATEGORY_INFO`, a static reference object, not
  per-coin data), e.g. Silver → "90% Silver, 99.9% Silver, 40% Silver, 35%
  Silver (War Nickel)." Hover doesn't reach touch devices, so tapping a pill
  (which already selects it as the active filter) also fires the existing
  `showToast()` with the same text — reusing the toast mechanism already
  established elsewhere in this app for exactly this "brief, non-blocking
  supplementary info" role, rather than a new popover component.
- **Sparse by design, same as everything else in this mockup** — only coins
  with a real, known composition got an explicit MetalCategory assigned
  (mostly Silver, a couple of Copper/Clad examples); Gold/Platinum/Zinc have
  zero demo coins today since none of this collection's placeholder rows are
  actually gold/platinum/zinc coins — left genuinely absent rather than
  faked, same as the "most rows blank until research" expectation.


### Year filter (locked in — Coins, Rolls, Sets; not Albums)
A `Year` trigger chip (`#browseYearFilterBtn`) sits in a shared toolbar row
(`#browseToolbarRow`) directly above the grid/list — **one shared
button/popup covers all three tabs** rather than duplicating it per tab,
since `#view-browse` never renders anything but those three (Albums is a
straight `navigate()` redirect, see "Browse: navigation restructure" — the
toolbar is simply always present whenever this view shows content at all,
which naturally excludes Albums with no extra visibility logic needed).
**Superseded: originally its own lone row directly under the tab row** —
Ray's real-device feedback was that a single pill sitting alone in its own
row read as visually odd/unbalanced. Moved into the same toolbar row that
already held the Grid/List view toggle (`.browse-toolbar`, restyled
`justify-content: space-between` so Year anchors left and the toggle
anchors right) — the toolbar itself now stays visible on Rolls/Sets too
(previously hidden there entirely, since only Coins needed the view
toggle); only the `.view-toggle` sub-element hides per tab now, not the
whole row, so Year keeps working everywhere it needs to.
- **Free-text Begin/End Year inputs in a popup, not preset range pills** —
  tapping the chip opens `#yearFilterOverlay`, reusing the exact same
  photo-adjust overlay/panel chrome as Grading Help (same "centered
  case-styled panel over a dimmed backdrop" shape, different content).
  Begin Year alone filters to that exact year; Begin+End filters an
  inclusive range (`yearRowTest()`). Clearing both via the Clear button
  removes the filter entirely.
- **Validation, deliberately minimal**: End Year before Begin Year is
  rejected via a toast, popup stays open, filter state unchanged — no
  other validation (no min/max year bounds, no format enforcement beyond
  `<input type="number">`).
- **ANDs with every other active filter on that tab** — same combining
  pattern as Denomination/Metal/Commemorative on Coins and Category on
  Sets (`applyCoinsTabFilters()`/`applyRollsTabFilters()`/
  `applySetsTabFilters()` each add `.filter(yearRowTest)` to their existing
  chain). Verified: Year + a Denomination chip together narrow to the
  intersection, not either alone.
- **A row with no single real year is excluded whenever the filter is
  active** — the mixed-date "Various" Roll (`AY-00026`, see "Rolls tab:
  list view + sort control") has no specific year to test against a
  Begin/End bound, so it drops out of the result set the moment any Year
  filter is set, same reasoning `rollYearNumber()` already uses for Rolls
  sorting. It reappears once the filter is cleared.
- **Button label reflects the active filter** (`updateYearFilterButtonUI()`):
  plain "Year" when inactive, `Year: 1916` for a single year, `Year: 1900–1950`
  for a range — same "chip shows its own state" convention the Rolls sort
  select and Commemorative toggle already use.
- Switching tabs does not clear the filter — Year state (`yearFilterBegin`/
  `yearFilterEnd`) is shared/global across Coins/Rolls/Sets, same persistence
  model as `browseViewMode`/`rollsSortKey`. **Entering Browse from outside it
  does clear it** — see "Browse filters: reset on external entry" below.


### Browse filters: reset on external entry (locked in)
**Bug fix:** every Browse filter axis (Denomination/Medal chips, Metal
pills, Commemorative toggle, Set Category pills, Year range) was persisting
indefinitely across the whole session — leaving Browse to the Dashboard and
coming back later via the bottom nav still showed whatever filters had been
left active, with no way to tell from the UI that a filter was silently
narrowing the list.
- **The fix distinguishes two different kinds of "entering Browse," and
  only one of them resets**, per `resetBrowseFilters()`:
  - **Switching between Browse's own Coins/Rolls/Sets/Albums tabs**
    (`showBrowseTab()`, called by the in-page tab row) **must keep every
    active filter as-is** — this already worked correctly and is
    unchanged. Confirmed: setting Year + Denomination + Metal, then
    switching Coins → Rolls → Sets → back to Coins, leaves all three
    untouched at every step.
  - **Entering Browse from outside it** (the bottom/side nav Browse icon,
    the bottom/side nav Sets icon, the Dashboard's Browse tile, the
    Dashboard's Sets tile, or any other external link that lands on
    Browse) **resets every filter axis to baseline** (All / All Metals /
    no Year filter / Commemorative off / Sets Category back to All).
  - The dividing line is `navigate()` vs. `showBrowseTab()` — `navigate()`
    is the only place any code outside Browse itself can land on it (every
    external entry point funnels through it, confirmed by grep: no other
    call site ever toggles `#view-browse` active or calls
    `showBrowseGrid()`/`showBrowseTab()` directly), so `resetBrowseFilters()`
    is called from inside `navigate()`'s `"browse"`/`"sets"` branches, right
    before `showBrowseTab()` runs — never from inside `showBrowseTab()`
    itself, which is also the internal sub-tab-switch path and must not
    reset anything.
  - This also covers the Spotlight click-through and an Albums filled-slot
    tap, both of which call `navigate("browse")` before `showBrowseDetail()`
    to jump straight to a coin's detail view (see "App structure" and
    "Albums" above) — filters reset there too, consistently, even though
    the grid itself isn't what's immediately visible.
- **Deliberately does not touch `browseViewMode` (grid/list) or
  `rollsSortKey` (Rolls sort order)** — those are display preferences, not
  filters, and weren't part of this fix; they still persist across an
  external Browse re-entry, unchanged.


### Sets tab: list-mode cards now show Year (BUILT and merged to main)
Real bug from Ray's live-device review: the Sets tab's own "All" pill (list
mode — the branch of `applySetsTabFilters()` that does NOT switch into the
completeness checklist) rendered several real owned rows visually
identical — six rows all reading "United States Proof Set / Proof Set ·
$155" etc., differing only in price — because `renderSetsGrid()`'s card
title was bare `coin.name`, with no Year anywhere on the card, even though
each row carries a distinct real Year (1955, 1956, 1957…). The completeness
checklist's own tiles were never affected — `renderSetChecklist()` already
prints `row.year` on every tile — and neither was drill-in, which already
shows Year in the page title (`detailTitleText()`, "1957 United States
Proof Set"). Only the list-level card was missing it.

**Confirmed before touching display logic, per the explicit instruction**:
this list is **not** on `FAKE_SETS` — that entity/picker model (named sets
with member CollectionIDs, a separate "Sets" filter chip) was retired
outright by the Browse navigation restructure and no longer exists anywhere
in the file. It also isn't DB_Sets-backed (that's the checklist's own
`activeDbSets()` path, a different branch of the same function) — the list
reads **owned All-sheet rows** (`Denomination="Multiple"`) via
`activeCoins()`, which was already correctly live-data-aware (falls back to
`FAKE_COINS` only when no live session is loaded). So the bug was purely a
missing field on the card, not a stale-data-source problem.

**Fix: reuse `detailTitleText(coin)`**, the exact same year-prefixing
helper drill-in already uses, rather than inventing a second rule that
could drift from it — skips prefixing when the name already starts with
its own year (e.g. "2021 Silver Proof Set" stays as-is, never doubled to
"2021 2021 Silver Proof Set"), and leaves a Roll's literal "Various" year
unprefixed (irrelevant here, since Rolls never reach this card, but the
shared helper's rule carries over for free). Output routed through
`escapeHtmlText()` since this card is built via `innerHTML` (unlike
drill-in's own `textContent` set, which needed no escaping) — a small,
strictly-safer addition alongside the fix, not a claim the old raw
`${coin.name}` was exploitable in practice.

Verified headless — new committed suite `tests/verify_sets_list_year.js`
(10 assertions): confirms `FAKE_SETS` is genuinely absent from the source
and the list branch reads `activeCoins()`; three synthetic rows sharing an
undated Description ("United States Proof Set") at 1955/1956/1957 render as
three genuinely distinct card titles; a name that already starts with its
own year isn't doubled; and a nav/overflow smoke check. One verified
negative control: the pre-fix bare-`coin.name` card reproduces the exact
reported symptom (all three rows rendering identically). All prior suites
re-run clean alongside it (1267 total across 29 suites).
- **Not verified: any real device.** Screenshot reviewed at 412px only.


### Sets tab: completeness checklist (locked in)
The Sets tab's three **Lineage** pills now double as an at-a-glance
completeness checklist — "which years of the annual Proof Set / Uncirculated
Coin Set / Silver Proof Set do I own vs. not" — instead of filtering owned
rows. Owned years render as a normal lit tile; unowned years use the same
hollow/grayed language as an empty album die-cut hole. Built to a 6-answer
spec (A–F below). Verified headless (21 assertions, `verify_checklist.js`) +
on-device-style screenshot; prior suites (badge/hub regression) re-run clean.
- **Two kinds of pill coexist on the one single-select Sets category row**
  (`BROWSE_SET_CATEGORY_CHIPS`): **Lineage pills** carry a `lineage`
  (`Proof Set` / `Uncirculated Coin Set` / `Silver Proof Set`) and switch the
  tab into **checklist mode** (`renderSetChecklist()`); **list pills**
  (`All` / `Commemorative` / `Other`) carry a `test` and keep the original
  owned-Set-rows list behaviour **completely untouched** (Q3/decision C).
  `activeSetCategoryChip` drives the branch in `applySetsTabFilters()`.
- **Two new DB_Sets fields drive it**: `Lineage` (`Proof Set` /
  `Uncirculated Coin Set` / `Silver Proof Set`, or blank for
  commemorative/one-off) and `SetScope` (`Complete` / `Component` /
  `Premium` / `Commemorative`). `Complete` = the standard top-level annual
  product; `Component` = a subset (quarters-only); `Premium` = a deluxe
  variant (Prestige/Premier); `Commemorative` = out of scope for this feature
  entirely (blank Lineage, never enters the checklist).
- **The checklist universe is DB_Sets, not the owned rows** (decision E):
  `renderSetChecklist(lineage, scope)` iterates `FAKE_DB_SETS` rows matching
  the active lineage+scope, sorted by year. A tile is **owned** when an owned
  `Denomination="Multiple"` row's `setId` matches the DB_Sets row's `setId`
  (`ownedSetForSetId()`). **SetID linkage for owned rows isn't populated yet**
  (separate data task) — so every tile renders unowned today, matching the
  live site. That's expected, **not a bug**. Ownership rendering was verified
  by temporarily linking a row in-test, never seeded into shipped data.
- **Years with no product get NO tile** (decision D) — the checklist only
  renders DB_Sets rows that exist, so a year nothing was issued in simply has
  no row (e.g. Silver Proof only from 1992 → no hollow tiles before it). This
  falls out of the model for free; there's no calendar-range-with-gaps logic.
- **1965-67 Special Mint Set is one DB_Sets row carrying BOTH lineages**
  (comma-separated `"Proof Set,Uncirculated Coin Set"`, decision D) — it
  replaced both products those years. `dbSetLineageIncludes()` comma-splits
  and tests membership, so the same SMS tile (same `setId`) shows under both
  the Proof Set and Uncirculated Coin Set checklists.
- **Pill rename (decision C): "Mint Set" → "Uncirculated Coin Set"** to match
  the new Lineage vocabulary and the Mint's own current term. Only the pill
  **label** changed — the underlying `category` DATA value stays `"Mint Set"`,
  so `SET_NAMED_CATEGORIES` (used only by the `Other` list-mode catch-all) is
  unchanged.
  **Superseded (Ray's follow-up): pill order + labels changed again**, left
  to right: `All / Uncirculated Sets / Proof Sets / Silver Proof Sets /
  Commemorative Sets / Other`. Still label-text-only — `lineage`/`test` on
  each `BROWSE_SET_CATEGORY_CHIPS` entry (the real Lineage/category values
  driving the checklist and list filters) are unchanged; only the reordering
  of the array and the displayed strings changed. "Uncirculated Sets" still
  drives `lineage: "Uncirculated Coin Set"` from the decision above — two
  separate label passes on the same underlying value.
- **Complete/Component/Premium sub-filter** (`#setScopeSelect`) reuses the
  Rolls-sort `.rolls-sort-row` `<select>` styling (decision B1), right-aligned
  under the pill row. Shown **only in checklist mode** (hidden for
  All/Commemorative/Other). Default = `Complete` (decision E);
  `setChecklistScope` persists across tab switches, reset to `Complete` on
  external Browse entry (`resetBrowseFilters()`), same model as the other
  Browse filters.
- **Grid layout is a mode class on the shared `#browseGrid`**
  (`.coin-grid.checklist-mode`), same approach as `.sets-mode`/`.list-view`
  — every other render path (`renderBrowseGrid`/`renderSetsGrid`/
  `renderRollsGrid`) clears `checklist-mode`, and the checklist clears the
  other two, so switching tabs never leaves a stale layout.
- **Empty-tile tap → Add Set deep-link (decision A2)** — reuses the album
  empty-hole tap **pattern** (context object → `navigate` → apply-context),
  NOT the same function (the album deep-links Add Coin; this deep-links Add
  Set). `setChecklistContext = {year, lineage, setId, name}` is carried into
  Add Set: `applyAddSetContext()` shows a 🧩 banner and pre-composes
  `#addSetName` from the DB_Sets row's name (e.g. "1972 United States Proof
  Set"); SetID/lineage still ride **invisibly** onto the draft — no visible
  SetID field exists. **Superseded in part: a visible Year field WAS later
  added to Add Set Step 1** (see "Structured Year field + child-coin
  pre-fill" below) — `applyAddSetContext()` now pre-fills that real field
  from the checklist tile's year instead of passing it through the
  side-channel this note originally described; SetID/lineage are unaffected
  and still invisible. Context is cleared when leaving Add Set (a `navigate`
  leaving-guard mirroring the Add Coin one). `buildSetDraft()` gained `year`
  + `lineage` fields; a checklist `setId` (a real intended SetID from
  DB_Sets) wins over the product code, and the research note records the
  checklist linkage instead of "SetID unconfirmed". A plain (non-checklist)
  Add Set is unchanged — blank year/lineage, no banner.
- **Owned-tile tap → that Set's Browse detail** (dormant until SetID linkage
  lands), Back returning to the checklist — same as a Sets-tab card.
- **`FAKE_DB_SETS` reseeded** from a 2-row product-code stub into a
  representative span (built by a small IIFE, `buildFakeDbSets()`), covering
  all three lineages × Complete, plus Component (quarters-only) and Premium
  (Prestige/Premier) examples, the SMS dual-lineage rows, and deliberate gaps
  (Silver Proof starts 1992; Uncirculated Coin Set has no Premium rows, so its
  Premium scope shows the empty-state message). The two original demo product
  codes (`1999RG`, `2021RC`) are preserved on their real rows so the Add Set
  product-code match note still works. Not exhaustive — a representative
  stand-in, same convention as every other sparse `FAKE_*` lookup.

**Decisions made during the build not covered by A–F (flagged, not guessed):**
- **The checklist honors the shared Year filter but ignores the Missing
  Photos toggle** (**CONFIRMED by Ray**: stays Year-only by design — Missing
  Photos remains a Browse-only filter chip, no nag/flag logic added to the
  checklist; a missing photo is obvious from Browse and gets corrected there,
  no mandatory tracking needed on the checklist itself). Year filtering a
  year-indexed completeness grid is natural and consistent with "ANDs with
  everything" (`yearRowTest` applied to each DB_Sets row's year); Missing
  Photos is an owned-row photo audit with no meaning for reference tiles.
- **`OGPPhoto` (the new packaging-photo column on All) was left out entirely**
  (decision F) — announced for a later task, nothing in the checklist needs
  it.


### Live nav data (read-only) — BUILT and merged to main
Real, GET-only Graph API reads now power the Catalog/Medal/Rolls tabs and the
Sets tab (both list mode and the completeness checklist) — instead of
`FAKE_COINS`/`FAKE_DB_SETS` — when enabled. **Display-only: no write path is
touched or added.**
**Merge status correction:** this section previously read "held on branch
`claude/live-nav-data`, NOT merged" — that was stale doc text, not a stale
git state. Ray ran the full live click-through checklist himself against the
real OneDrive `_Testing` copy workbook (auth, Catalog/Rolls/Sets rendering
real data correctly, clean fallback to demo data on flag-off) and it was
merged to main that same session; only this section's header text hadn't
been updated to say so. Same standing as every other "held pending review"
item once Ray actually signs off — **main is the source of truth for this
feature**, same as the Add Set write layer's own merge-status correction
below.

**Sheets/ranges read:** the `All`, `DB_Sets`, `DB_Coins` and
`Lookup_MetalContent` sheets, in full (`usedRange(valuesOnly=true)`), from
**whichever workbook `WRITE_TARGET` points at** — `liveNavWorkbookPath()`,
which returns `writePaths().workbook`.

**Superseded, and this is the important part:** this used to read the **live
production workbook** unconditionally, on the reasoning that "a read-only
GET can't corrupt anything, so it doesn't need the `_Testing` copy
convention." That was true while nothing wrote. Once the Browse Edit write
layer landed, reading production while writing to the `_Testing` copy caused
real, silent data loss on Ray's live pass — the Edit form pre-filled from
one file and diffed against another, so an untouched field got submitted as
a change. See "Browse Edit real write layer" → Bugs A/B for the full
account. **Standing rule: reads and writes target the same workbook, always.
Any new read path uses `writePaths().workbook`. Do not reintroduce a
separate read target for "safety" — that split is what caused the bug.**
(The Reference Images feature reading `CoinCollection/ReferenceImages/`
directly is genuinely different and unaffected: it reads image FILES, not
the workbook, and nothing writes those.)

**Safety posture:** `ENABLE_LIVE_NAV_DATA` (default `false`, localhost-dev
only, same re-enable steps as `ENABLE_REFERENCE_IMAGES`), same
`http://localhost:8791/app.html` redirect URI as every other real-Graph
feature in this file (no production URI exists yet for any of them).
`getLiveNavToken()` returns `null` immediately when the flag is off, and
otherwise defers to the app's ONE shared MSAL instance — **superseded: this
feature used to construct its own `liveNavMsalInstance` with a narrow
`Files.Read` scope**, described here as deliberate isolation from the write
layer. That isolation was never real (all instances shared one clientId and
therefore one MSAL storage namespace) and it broke sign-in outright once two
features were enabled together — see "Auth: one shared MSAL instance" below.
Called lazily off the first Browse render that wants it (`showBrowseTab()`
calls `ensureLiveNavDataFetch()` at its top), never from an explicit Sign In
button.

**Blast radius — the exact list of call sites swapped, and nothing else:**
`coinsTabBaseRows()`, `medalTabBaseRows()`, `applyRollsTabFilters()`,
`applySetsTabFilters()`'s list-mode branch, `renderSetChecklist()`, and
`ownedSetForSetId()` — each changed from reading `FAKE_COINS`/`FAKE_DB_SETS`
directly to reading through two new accessor functions, `activeCoins()`/
`activeDbSets()`, which return the live-fetched array once loaded or fall
back to the `FAKE_*` array otherwise. This is the ONLY mechanism — no other
`FAKE_COINS`/`FAKE_DB_SETS` reference in the file was touched. Explicitly
UNCHANGED and still 100% on demo data: Browse detail's own supplementary
lookups (`FAKE_COIN_DETAILS`/`FAKE_METAL_CONTENT`/`FAKE_SET_CHILDREN`/
`FAKE_SET_FACTS` — Purchase Details, Specifications, Notes & Facts, child-Set
flips), Albums, Wishlist, Ledger/Stats, Spotlight/Dashboard, every Add Coin/
Add Set flow, and `matchDbSetsByProductCode()` (Add Set's own DB_Sets lookup).
A side effect worth knowing, not a bug: tapping into a live coin's Browse
detail view will correctly show its own real core fields (from the live row
itself) but its accordions will render empty/hidden for that CollectionID
(no `FAKE_COIN_DETAILS` entry exists for a real ID) — that's the *existing*
"hidden when blank" behavior working correctly, not a new failure mode.

**Row-shape mapping (`mapWorkbookRowToCoin`/`mapWorkbookRowToDbSet`):** each
raw sheet row (a plain object keyed by its own header-row text) is mapped
into the exact same field shape `FAKE_COINS`/`FAKE_DB_SETS` rows already use,
so every existing nav function (`browseFilterTest`, `metalCategoryFor`,
`browseSearchTest`, `sortCoinsTabRows`, `dbSetLineageIncludes`, etc.) keeps
working completely unchanged against either source — the row *shape* is the
real contract, not which array it came from. `colVal(row, ...candidates)` is
a defensive header lookup: some fields have a CONFIRMED exact real column
name (`CollectionID`, `Denomination`, `Year`, `MintMark`, `SerNo` — "Workbook
naming conventions" above); others this feature also wants have NOT been
confirmed against the real sheet by this task (a single display-name column,
a live estimated-value column, `OriginSetID`) — those try a short list of
reasonable candidate spellings, falling back to blank/0 rather than throwing
when none match.

**Column names — CONFIRMED against the real workbook (Ray, direct column
check, not guessed), superseding the original guesses this feature shipped
with:**
- **All sheet, `name`**: `Description` — confirmed correct as originally
  built, no separate name column exists.
- **All sheet, `value`**: `Value` first, `SpotValue` as fallback. **There is
  no `EstValue` column** — that was a wrong guess, dropped from the
  candidate list entirely (a row with only `EstValue` populated now
  correctly defaults to 0, verified directly).
- **All sheet, `originSetId`**: `OriginSetID` **does exist** — column 47,
  appended at the end of the sheet. `colVal()`'s lookup is already an
  exact, case-sensitive property match by construction, so no code change
  was needed here — confirmed correct as originally built. The "might be
  missing/misspelled" caveat this section used to carry no longer applies.
- **DB_Sets sheet, `name`**: `Description` (not `Name`/`SetName`, which
  don't exist as headers on this sheet — `mapWorkbookRowToDbSet` originally
  guessed those and was **corrected** to `Description` first, with
  `Name`/`SetName` kept only as harmless extra fallback candidates). Full
  confirmed current DB_Sets headers, for reference: `SetID`, `GSID`,
  `ProductOption`, `ItemNumber`, `Year`, `MintMark`, `Description`,
  `Variety`, `Coins`, `FaceValue`, `Composition`, `Key/Notable`, `Mintage`,
  `Notes`, `MfgProductID`, `ContainerName`, `Lineage`, `SetScope`.
- **DB_Sets sheet has no `Category` column at all** — `category` always
  derives from `Lineage` now (previously an "in case it exists" guess with
  a `Category`-first fallback; simplified to a permanent fact about this
  sheet, not a guess anymore). `productCode` still has no confirmed real
  equivalent (`ProductOption`/`ItemNumber` are the closest real columns,
  unconfirmed) — left as a harmless miss since nothing in this branch's
  swapped call sites reads it; `matchDbSetsByProductCode()` (Add Set's own
  lookup) reads `FAKE_DB_SETS` directly and is untouched/out of scope.

**Still-open, real, pre-existing data gaps (not column-naming bugs — these
were already known, not something this task fixes):**
- **`SetID` linkage is sparse (~28/386 real rows) and DB_Sets-side SetID
  linkage for the checklist "isn't populated yet" at all** — per the "Sets
  tab: completeness checklist" section below, every checklist tile will
  likely still show unowned/hollow against live data, exactly like the demo
  data does today. A separate future data-reconciliation project, already
  tracked elsewhere in this file/ParkingLot.
- **Photo-presence is approximated from filename-column truthiness**
  (`hasObversePhoto`/`hasReversePhoto` from whether `Obverse`/`Reverse` are
  populated), not a real "does a file actually exist at this path" check —
  same class of approximation the app already makes elsewhere.
- **A blank/malformed row never throws.** A stray fully-blank sheet row (no
  `CollectionID`) maps to an empty `id` and is filtered out
  (`ensureLiveNavDataFetch` drops any mapped coin with no `id`, and any
  mapped DB_Sets row with no `Lineage`); every other field defaults to `""`/
  `0`/`false` rather than `undefined`/`NaN`, verified directly (see below).

**New, flagged but NOT acted on:** the live workbook now also has a
standalone **"Sets" tab** (`Status`, `Year`, `Variety`, `Description`,
`Lineage`, `SetID`, `FilledBy`) that didn't exist when this branch was
built. Nothing in this feature reads it — deliberately untouched per Ray's
explicit instruction ("don't touch anything for it now"). Worth keeping in
mind once real data is actually live: this new tab may turn out to be a
better/more-populated source for the Sets completeness checklist's ownership
signal than the sparse `All.SetID` linkage described above — but that's a
separate scoping decision for a future task, not assumed or acted on here.

**Verified headless** (`verify_live_nav_data.js`, 28 assertions, all pass;
full 11-suite regression re-run clean alongside it): the feature is
completely inert by default (no dormant MSAL instance, `getLiveNavToken()`
never redirects, `ensureLiveNavDataFetch()` is a no-op, `activeCoins()`/
`activeDbSets()` return the `FAKE_*` arrays); `colVal()`'s candidate
fallback; `mapWorkbookRowToCoin()`/`mapWorkbookRowToDbSet()` against a
normal row, a "Various"-year Roll row (stays a string, never `NaN`), a fully
blank optional-fields row (no throw, sane defaults), the confirmed
`Value`→`SpotValue` fallback order, confirmation that a lone `EstValue`
value is correctly ignored (defaults to 0), the confirmed exact-header
`OriginSetID` read, and a no-`CollectionID` row (empty, filterable `id`); a
dual-lineage (comma-separated) DB_Sets row mapped via the confirmed
`Description`-based name still works with `dbSetLineageIncludes()`; and —
the real end-to-end check — setting `LIVE_COINS`/`LIVE_DB_SETS` directly
(standing in for a real fetch resolving, since the actual Graph/MSAL network
calls can't be exercised from this environment) and confirming
`coinsTabBaseRows()`, `medalTabBaseRows()`, the Rolls page's actual rendered
grid, and `ownedSetForSetId()` all genuinely read through the live data,
then confirming the fallback correctly restores once the live data is
cleared. **No live OneDrive session was available this session** — the
column names above were confirmed by Ray reading the real workbook directly
(not by this environment fetching it), so the remaining unverified piece is
the actual Graph/MSAL network flow itself (first-load sign-in redirect,
real response shape) — same "needs a real click-through" caveat already
attached to every other real-Graph feature in this file (Reference Images,
the Add Set write layer, the workbook web-link).

**Extended (small-fixes batch): real Metal filter via a DB_Coins/
Lookup_MetalContent join.** The Catalog/Rolls Metal pills previously did
nothing real — `metalCategoryFor()` only ever read the sparse, hand-authored
`FAKE_METAL_CONTENT` mockup lookup by CollectionID, with zero connection to
any real workbook column, for either demo or live coins. Root cause
confirmed against the real workbook (Ray): there's no direct Composition
field on `All`, and `DB_Coins.Composition` itself is too granular/messy to
filter on directly (22 distinct raw values — `"90% Silver"`, `"90% Silver,
10% Copper"`, `"35% Silver"`, `".999 Fine Silver"`, etc.). The real,
pre-bucketed join already exists in the workbook: `All.CoinID ->
DB_Coins.CoinID -> DB_Coins.MetalContentType -> Lookup_MetalContent.CoinType
-> Lookup_MetalContent.MetalCategory` (exactly 7 clean values: Silver, Gold,
Platinum, Copper, Clad, Zinc, Other — Palladium is deliberately bucketed
under Other per an existing note in `Lookup_MetalContent`, not a gap).
- `ensureLiveNavDataFetch()` now also reads `DB_Coins` and
  `Lookup_MetalContent` (four sheets fetched in parallel: `All`, `DB_Sets`,
  `DB_Coins`, `Lookup_MetalContent`) — same `Files.Read` scope, same
  `ENABLE_LIVE_NAV_DATA` gate, still `false`/localhost-only by default (no
  production redirect URI exists for this feature, unchanged). Built under
  the existing gate rather than held for separate review — it's an
  incremental extension of an already-reviewed/merged read pattern, not new
  architecture, and stays exposure-free in production either way.
- Both new sheets were originally used only to build two lookup maps
  (`CoinID -> MetalContentType`, `MetalContentType (as CoinType) ->
  MetalCategory`) at fetch time and then discarded, with no `LIVE_*` cache
  or `activeX()` accessor of their own. **`DB_Coins` is superseded** — it's
  now cached as `LIVE_DB_COINS` behind `activeDbCoins()`, because every
  DB_Coins match in the app (`findDbCoinsMatch`, `dbCoinsCandidatesFor`,
  and so the Browse Edit CoinID re-link) was silently running against the
  12-row `FAKE_DB_COINS` mock. See "Browse Edit real write layer" → Bug C.
  `Lookup_MetalContent` is unchanged and still map-only.
  `mapWorkbookRowToCoin()` also gained a `coinId` field (`All.CoinID`, same
  confirmed-header convention as
  `CollectionID`/`Denomination`/`Year`/`MintMark`/`SerNo`) as the join key.
- `metalCategoryFor(coin)` now checks `coin.metalCategory` first (set only
  on live-fetched coins) before falling back to the `FAKE_METAL_CONTENT`
  mockup — so demo-mode behavior is completely unchanged, and a live coin's
  Metal pill filtering is now real.
- A coin with no `MetalContentType` match (or a broken link anywhere in the
  chain) gets a blank `metalCategory` — the existing Metal filter's "Other"
  pill test already treats blank the same as an explicit `"Other"`
  (`!m || m === "Other"`), so this falls under Other automatically. Confirmed
  with Ray as the expected behavior — no new fallback logic was needed.
- Not verified against a real OneDrive session this task (no live session
  available) — same "needs a real click-through" caveat as the rest of this
  feature. `DB_Coins.CoinID`/`MetalContentType` and
  `Lookup_MetalContent.CoinType`/`MetalCategory` column names were given
  directly by Ray as confirmed against the real workbook, not independently
  re-verified from this environment.


