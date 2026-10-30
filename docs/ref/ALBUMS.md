# Reference: ALBUMS (moved out of CLAUDE.md)

Read this file when: touching Albums (list, page-flip book, slots, key dates, Mintage text, image prefetch, Best of view).
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

### Albums: page flip can no longer get stuck (`tests/verify_album_book_flip.js`)
Ray's PC report: in spread mode (>=900 px) a flip snapped back and the
arrows died, in every album opened afterwards too. Cause: a photo landing during
the 0.65 s turn redrew the book at the old page, the turning leaf was removed,
its `transitionend` never fired and `albumTurnInProgress` stayed true. Fix:
- each turn has a token and finishes once, on the leaf's own `transform`
  transitionend or a fallback timer (`ALBUM_TURN_FALLBACK_MS`);
- `renderAlbumBook()` and `openAlbumAtPage()` call `cancelAlbumTurn()` first;
- photo-arrival redraws skip while a turn is running (the turn's own finish
  redraws with the photo cached).
**Anything that redraws the book mid-turn must go through these, not around them.**


### Albums: "Best of" view (`tests/verify_album_best_of.js`)
A "Best of" checkbox plus a "?" legend button in the sticky top bar (between
Back and Close Drawer; shown only while a book is open). It sits there, not above the book,
because anything above the book eats its row budget (the tablet page dropped
from 5 rows to 4). The bar stays 60 px and one line at 360 px.
- **VIEW ONLY.** Writes nothing, never changes FilledBy or the slot objects
  (pages hold references to them). Off on every open from the list; kept only
  for the round trip to a coin's detail page and back. A toggle during a page
  turn applies when the turn ends.
- **One reader:** `effectiveSlotCoinId(slot)` returns `slot.filledBy` when off.
  Routed through it: slot render (photo, filled/empty, markers), photo
  prefetch, the photo-arrival redraw check, slot tap, prev/next step list, and
  the cover's "x / y filled" (which counts shown-as-filled slots when on).
  Left physical: the album list card count, key-date star and ring, label,
  variety, mintage, the Belongs to Album chip, the Assign to Album list.
- **Rules** (`computeAlbumBestOf(album, owned, all, catalog)`, pure):
  - Owned coins only, exited coins excluded.
  - Eligible: the slot's own CoinID, or for a PLAIN slot, a designated coin.
    The slot's DB_Coins row has a blank Designation; the coin's row has any
    non-blank one (FB, FS, FBL, RD, BN, RB...); both rows match on Year,
    MintMark, Description, Denomination, Variety and Finish. One-way: a
    designated slot takes only its own CoinID.
  - Designation comes from DB_Coins (`activeDbCoins()`), never All.Designation.
  - Best = highest `GradeNum`; any GradeNum beats none. On equal GradeNum, third-party (Lookup_Graders
    Type "Service", compared trimmed and case-insensitive, Best-of only)
    beats Owner/Seller/AI-est/blank.
  - A full tie keeps the album's coin. Outside coins that tie: lowest
    CollectionID.
  - Each coin is used once per album; own-CoinID groups are decided first.
  - An exited album coin can be replaced. A mismatched-CoinID album coin stays
    the incumbent and is compared normally.
- `All.GradeNum` is a workbook formula, mapped READ ONLY as `coin.gradeNum`
  (blank or text = ungraded) and on no write list.
- Markers at the disc's top-left: ▲ better owned coin than the album's, ◆ an owned
  coin for a slot the album leaves empty (tapping it opens that coin, not Add Coin).
- The "?" button opens a small popover (tap; closes on an outside tap or Esc;
  never touches page-turn state) listing ▲, ◆, filled ★ = Key date, outline
  ☆ = Semi-key date. No tooltips are relied on (tablets have no hover).
- **Key-date star moved** from the disc corner to the end of the date label
  (affects Best-of off too): filled ★ for Key Date, outline ☆ for Semi-Key
  (`keyDateKindOf()`; `buildAlbumKeyDateIndex` returns CoinID -> "key" | "semi").
  **Star rule changed in task (g), 30 Oct 2026 (Ray):** filled = Key Date and Key
  Variety, outline = Semi-Key Date, NO star for anything else. The old "any other
  non-blank KeyDate value gets a filled star" rule is gone ("other" is no longer a
  kind). Real `DB_Coins.KeyDate` values on 30 Oct: Key Date 41, Semi-Key Date 56,
  One-Year Design 29, One-Year Dual Date 6, Key Variety 2, rest blank; One-Year
  Design and One-Year Dual Date therefore lose their star. Matching stays
  normalised (letters only, lower case: "key", "keydate", "keyvariety" filled,
  anything starting "semikey" outline). The gold ring follows the star, because
  the slot's `keyDate` flag is true only for key / semi. The "?" legend reads
  "Key date or key variety" / "Semi-key date". Tests: `verify_value_fallback_melt` J, K;
  `verify_album_best_of` H3, H4. Not checked against the real workbook beyond the counts above.

**Test baseline after this work (main a06b976):** `npm test` = 2900 passed,
0 failed, 0 page errors, 64 suites.


### Albums: page-flip book (locked in, supersedes the device-tiered/deferred notes below)
Opening an album no longer shows one flat scrolling list of all its slots.
It's a page-flip book, page sequence: **cover** (icon, name, fill progress) →
**history/facts page** (a short blurb per album, Red-Book-style — set origin,
notable design changes, etc.; a static `history` string per `FAKE_ALBUMS`
entry today) → then the slots in fixed-size groups (6 per group), each group
shown as **obverse**, then **reverse** of that same group, before the next
group's obverse starts. (Obverse/reverse here just toggles the placeholder
disc's mockup styling — see Spotlight auto-rotate below — there's no real
per-slot photo yet.)
- **Screen width decides one page at a time vs. a two-page spread** — under
  900px width shows a single page; at/above it shows two pages side by side
  with a book-spine visual seam between them, matching how many pages
  actually exist (the last odd page shows alone even in spread mode).
- **Physically accurate book model, not just a generic pager (locked in,
  refines the initial page-flip build)**: the cover (page index 0) is a
  standalone sheet-front — **closed, only the cover is ever visible**, even at
  spread width; it's never paired with the page behind it, same as a real
  closed book. Opening it reveals the **back of the cover — the History &
  Facts page** — which in a two-page spread sits on the **left**, paired with
  the **first coin group's Obverse on the right**. Past that, spread pairing
  continues in twos starting at page index 1: (1,2), (3,4), (5,6)... —
  computed by `computeVisibleIndices()`, not a naive `[i, i+1]` pairing (which
  would have wrongly spread the cover with History on first open).
- **Reverse pages mirror in reversed left-right order only — row order top-to-
  bottom stays fixed.** `.book-slot-grid` uses a **fixed column count per
  breakpoint tier** (3 across single-page, 6 across spread), not the
  responsive `auto-fill` it originally shipped with — a real album page has a
  fixed number of slots per row, and fixing the count is what lets
  `reverseWithinRows()` chunk a page's 6 slots into actual rows and reverse
  each row's contents independently. (An earlier version reversed the whole
  flat 6-item array, which also swapped which row's coins landed on top vs.
  bottom — since a page's row boundaries can't be known from a responsive
  `auto-fill` column count, fixing the count per tier was the fix, not a CSS
  mirroring trick.) At the spread tier's 6-across single row, there's only one
  row to begin with, so the reversal is trivially row-order-safe there.
- **Navigation**: prev/next arrow buttons, plus swipe (touchstart/touchend,
  ~50px threshold) on the page area. In single-page mode these step by one
  page at a time; in spread mode they step by whole pairs
  (`nextAlbumPageIndex()`/`prevAlbumPageIndex()`), always landing back on a
  valid pair boundary (or on the lone cover) rather than an arbitrary index.
- **Rigid, binder-ring page-turn animation (locked in, spread mode only)**: a
  real page turn — pages pivot around a fixed central vertical axis (the
  spine), like a ring binder or book, never an accordion/fan-unfold with a
  growing gap between panels. `turnAlbumPage(direction)` gives only the slot
  whose content is actually changing a `.book-turn-slot` wrapper containing,
  stacked via **z-index** (not DOM order — this is what makes both directions
  work correctly without swapping markup order): the newly-revealed static
  page underneath (a different leaf, already sitting there per the existing
  leaf-pairing model — never rotates), and `.leaf-turn` on top (`perspective`
  on `.book-pages`, `transform: rotateY()`, `backface-visibility: hidden`),
  front face = what was showing in that slot, back face = what settles there.
  Its `transform-origin` is fixed at the spine (the shared edge between the
  two slots), so it sweeps in true 3D onto the *other* slot's own rectangle —
  it never floats apart from it. The sibling slot (not changing) renders
  plain, static, non-rotating content. **Superseded:** an earlier version
  placed the leaf in the wrong starting slot (the one it was turning *into*
  rather than *out of*) with no z-index guarantee over its sibling — this
  produced an accordion/fan-unfold look (panels separating with a growing
  gap) instead of a binder-ring turn; both the starting-slot placement and
  the z-index are what actually fix it, confirmed via direct measurement that
  the gap between the two slot boxes stays constant (the normal `.book-pages`
  gap) throughout the animation in both directions, never growing.
  **Single-page mode never animates at all** — tapping next/prev there is an
  instant content swap, no rotation, no transition; too narrow to show a
  spine. **The lone-cover ↔ first-spread boundary is also an instant swap**,
  not animated — it's a genuine page-*count* change (1 page becoming 2 or
  vice versa), not a same-shape turn, and a closed book's cover has no real
  left/right side to hand off between, so attempting to animate it produced a
  duplicated-cover artifact; every ordinary 2-page ↔ 2-page turn still gets
  the full animation. Buttons disable for the ~0.65s duration
  (`albumTurnInProgress`) so a real click can't land mid-turn; the real DOM
  (with all click handlers rebound) only replaces the transient animation
  markup once `transitionend` fires. Direct-open (tapping a slot elsewhere in
  the app) still calls `renderAlbumBook()` straight, no animation.
- **Column count and disc size are computed, not fixed (locked in)**: the
  goal is fitting as many coins per row as the available space allows at
  each breakpoint while keeping the coin image and its caption legible — not
  matching any particular target count or physical folder reference (an
  earlier pass tried to reason from real Littleton folders' actual coin-per-
  row count; that framing was wrong and is dropped). `computeAlbumGridLayout()`
  finds the largest column count that keeps each disc at or above a
  legibility floor (currently 52px), then sizes discs to fill the row exactly
  (capped at a comfortable maximum, 64px) — both applied via CSS custom
  properties (`--slot-columns`, `--slot-gap`, `--slot-disc-size`,
  `--slot-disc-font`) on the grid element. `albumPageContentWidth()` derives
  the real available width from one live measurement
  (`#albumsDetailContainer`, which persists across re-renders) plus fixed,
  file-owned CSS constants (book-pages gap, page padding/border, page
  max-width) — one verified measurement plus known local constants, rather
  than stacking multiple unverified assumptions the way the original
  hardcoded 6-column/64px layout did (confirmed via measurement to overflow
  by ~51px at that fixed size). Verified via direct measurement to produce
  zero overflow from a 360px phone through a 1920px desktop viewport.
- **Coins-per-page is computed, not fixed (locked in)**: same "fill the
  space available, don't push to a new page unnecessarily" principle as
  columns, extended to the whole page rather than just one row.
  `computeAlbumChunkSize()` derives rows from real available vertical space
  (`computeAlbumPageRows()` — one live measurement of `#albumsDetailContainer`'s
  position plus fixed, file-owned constants for the page padding/border, the
  page-side-label line, and the book-nav controls, same one-measurement-plus-
  known-constants approach as the width side) and multiplies by the computed
  column count, replacing the old fixed `ALBUM_PAGE_CHUNK = 6`. This is
  computed once, when an album is opened (`openAlbumAtPage()` now shows the
  detail container *before* measuring it, since `computeAlbumChunkSize()`
  needs real layout to read from) — not re-computed on every resize, matching
  how the rest of the book's pagination is already decided once at open time;
  resizing after opening can leave a page sized for a since-changed viewport,
  an accepted minor cosmetic tradeoff rather than a live-reflowing pagination
  engine. A small album (e.g. 8 slots) that fits entirely within one page's
  computed capacity now gets exactly one Obverse/Reverse page pair instead of
  being split across two pairs just because 8 > a fixed 6.
- **Trailing blank page + back cover (locked in)**: `buildAlbumPages()` now
  always appends a `blank` page after the last Reverse page, followed by a
  `back-cover` page. From index 1 onward, pages always come in twos (History+
  Obverse, Reverse+Obverse, ...) — without a trailing blank, the final
  Reverse page had nothing to pair with and rendered alone at full single-
  page width even in spread mode, visibly larger than every properly-paired
  half-width page before it. One blank page always restores the even count
  regardless of how many coin-group pairs an album has. The back cover is
  standalone (never paired), reusing the front cover's exact styling
  (`.album-page-cover`) — same "closed, no real left/right side" treatment,
  so the length-mismatch transition into and out of it is correctly an
  instant swap via the existing `oldIndices.length !== newIndices.length`
  check, no changes needed there. The blank page is framework for future
  additional content (a placeholder note says so today) — its real job right
  now is the pairing fix, not a real feature yet.
- **Reverse-side coin order only mirrors Obverse in spread (two-page) mode**:
  `reverseWithinRows()` is still correct and still runs, but only when
  `spread` is true — in single-page mode, Obverse and Reverse are never seen
  side by side (you flip forward to Reverse as its own separate screen), so
  there's nothing for a mirrored order to actually demonstrate; Reverse just
  keeps the same left-to-right order as Obverse there. In spread mode the
  mirroring still matters: the left (Reverse) page of a two-page spread
  should read as the mirror of the no-longer-visible Obverse side of those
  same coins, since a real sheet flips left-right when turned over.
- **Superseded:** the earlier device-tiered plan (phone = plain scrollable
  list; tablet = circular slot grid; desktop = grid with real photos inline)
  is gone — the book's fixed-size-page grid layout is now used at every
  width, since a bounded 6-slot page is legible at any size and the old
  "simple list on phone" mode doesn't fit a paginated-book metaphor. The
  animated-page-flip-deferred and cover/history-page-deferred notes that used
  to live here are done, not deferred, as of this feature. The very first
  version of this feature paired pages naively (`[i, i+1]`) regardless of
  content — that's superseded by the sheet-accurate pairing above.
- **Bug fix, merged directly to main (small/isolated, no branch held):
  wide-viewport disc clipping in spread (two-page) mode.** Ray's real-device
  report: the last disc in a row (e.g. "1911-D" on Lincoln Cents) got cut off
  at the page's right edge at desktop widths — confirmed fine at tablet
  (1024×768) and phone (412×915). Root cause was in `albumPageContentWidth()`:
  its spread-mode branch computed available width as `(containerWidth - gap)
  / 2` with **no cap at `PAGE_MAX_WIDTH` (460px)**, while `.album-page` itself
  always carries a real CSS `max-width: 460px` — spread mode included (the
  non-spread branch already applied this same cap; spread's never did). Past
  roughly 936px container width, that half-width exceeds 460px, so the CSS
  silently capped the page's rendered width while this function kept
  reporting the larger, uncapped figure as "available." `computeAlbumGridLayout()`
  then sized columns/discs for space that didn't actually exist — and since a
  `.coin-disc` is a fixed-pixel element (`width: var(--slot-disc-size)`) that
  doesn't shrink to fit a narrower real cell, the overflow showed up exactly
  as reported: the last disc in a row spilling past the page's true edge
  instead of wrapping. Confirmed via direct measurement before the fix: at a
  1440px viewport the function assumed 488px of page content width while the
  CSS-capped page really only had 422px — a 66px overshoot. **Fixed at the
  actual root cause** (both branches now apply the same `Math.min(PAGE_MAX_WIDTH,
  …)` the non-spread branch always had), not by adding `overflow:hidden` or
  similar — a disc-hiding workaround was explicitly ruled out. Verified via a
  broad viewport sweep (412 through 2560px, including the exact 936px
  boundary where the bug first turns on) confirming no disc or grid ever
  overflows its own page and no page-level horizontal scroll appears at any
  width; the three specifically-required widths (412/1024/1440) all
  re-screenshotted clean. All prior regression suites re-run clean alongside
  it — this was a pure layout-math fix, no markup/behavior otherwise changed.


### Littleton folder visual style (locked in)
Every album currently gets a distinct cosmetic treatment from the rest of the
app's dark UI — cream/tan cardboard interior pages with navy printed folder
typography and die-cut circular holes, plus a visually distinct darker-brown/
copper cover — instead of the dark disc/case look used elsewhere in the app.
- **Which albums get it**: an album-level `folderStyle` field
  (`"littleton"` today for every `FAKE_ALBUMS` entry) drives whether the
  look applies, scoped via `.littleton` page and `.littleton-slot` cell
  modifier classes (never a base-class change) so nothing here touches any
  other view in the app. **Superseded:** this was originally gated on a
  populated DB_Sets `MfgProductID` (Numis-style/non-manufactured albums would
  stay dark-UI) — Ray's call is now to apply the look to every album
  regardless of `MfgProductID`, until told otherwise. `folderStyle` stays a
  real per-album field either way (not hardcoded away) in case a future album
  ever needs a different look again. `mfgProductId` (e.g. `"LCF19"`) is still
  stored per album where it's actually known, purely as future metadata (e.g.
  eventual per-product individualization) — it doesn't drive any visual
  difference today.
- **Demo album**: `FAKE_ALBUMS`'s third entry ("Jefferson Nickels — Littleton
  Folder Vol. 3") is a generic placeholder — no real Littleton folder has been
  chosen yet (Ray's Volume 2 selection is still pending). Swap its name/date-
  range/`mfgProductId` for the real folder once chosen, same stand-in pattern
  as `FAKE_REFERENCE_IMAGES`/`FAKE_GRADING_HELP` *(both removed)*.
- **Cover is visually distinct from the interior pages (locked in)**: darker
  brown background with copper-colored lettering, vs. the cream background
  and navy print on history/coin interior pages — a folder's outer cover is a
  different material in real life (heavier cardstock/leatherette) from its
  printed inside pages, and the two looks are meant to read as different
  surfaces, not one continuous skin.
- **Leather texture + gold filigree frame (locked in, Ray's request)**: two
  faint crosshatched `repeating-linear-gradient` layers under the base brown
  gradient approximate a tooled-leather grain; a gold outer border plus an
  inset `::before` frame line approximate a filigree border without needing
  real vector artwork; a small ❦ flourish glyph anchors the bottom edge. CSS
  approximation only — real ornate scrollwork would need actual SVG/image
  assets, which is a possible future upgrade if this doesn't read rich enough
  on a real device. Applies to both the front and back cover (they share the
  same `.album-page-cover.littleton` styling).
- **Back cover (locked in)**: the book now ends on a standalone back-cover
  page (same treatment as the front cover, reusing `.album-page-cover`) after
  a trailing blank page, rather than dead-ending on the blank page.
- **Die-cut holes** (`renderSlotCell()`, `.coin-disc.die-cut`): an **owned**
  slot always shows a coin glyph seated in the hole with a thin light inner
  ring where it meets the cardboard — never bare year text (unlike the old
  dark-UI look, which fell back to plain year text when no reference image
  existed). If there's a real photo or series reference image, it shows
  normally; if not (owned, photo pending), the same glyph shows
  **desaturated/faded** (`opacity`, `grayscale` filter) so it reads as "owned,
  waiting on a photo" rather than looking identical to a genuinely empty
  hole. An **unfilled** slot (`.die-cut-empty`) shows no coin, no placeholder
  icon at all, no "?" — just a plain shadowed punched hole, matching how an
  unfilled real folder slot actually looks.
- **Caption**: date + mintmark only under each hole (`.slot-label`) — the
  second `.slot-meta` description line is dropped entirely, matching real
  folder printing.
- **Key-date variety line (new)**: a key-date slot (`slot.keyDate`) that
  also carries a real `variety` (e.g. 1909/1909-S Lincoln Cent → `VDB`)
  prints that variety directly under the date/mintmark caption
  (`.slot-variety`), same as a real folder calls out the one date in a run
  that actually needs distinguishing. **Independent of the dropped
  `.slot-meta` line above** — that line was about not repeating the
  series/description text, not about hiding a distinguishing variety, so
  this isn't a reversal of that decision. Ordinary (non-key-date) slots are
  unaffected — still just the plain date/mintmark, nothing added. Uses the
  existing `slotVariety()` helper, not new data.
- **Key-date marker (superseded, twice)**: originally a gold glowing-star
  treatment, then restyled to a small navy printed star + ring to fit the
  printed-folder look. Ray didn't like the navy version in practice — the
  star/marker read as sitting inside the coin circle rather than clearly
  outside it. Now: **gold** ring around the disc (back to gold, not navy) +
  a **larger** gold star anchored just outside the circle's top-right edge.
  The "inside the circle" complaint turned out to be a real positioning bug,
  not just a color preference — `.key-date-badge` used to position itself
  relative to the whole `.slot-cell` (label + meta text included), so at real
  computed column widths there often wasn't enough spare cell width for the
  badge's offset to actually clear the disc. Fixed by wrapping just the disc
  in `.slot-disc-wrap` (sized to the disc alone) and anchoring the badge to
  *that*, so it always sits a fixed, disc-relative distance outside the
  circle's edge regardless of column count/disc size.
- **Reference photos were for color/material only, not the page-turn
  mechanic (important correction)**: real Littleton folders physically
  unfold accordion/fan-style flat on a table — that look was mistakenly
  carried over into an early version of the page-turn *animation* itself
  (see the binder-ring page-turn note above for the fix). The reference
  photos only ever governed the cream/navy/die-cut *look*, never the
  interaction/motion.


### Albums: live-wiring, read-only (BUILT and merged to main)
`FAKE_ALBUMS` is swapped for real Albums-sheet + DB_Sets(Album-type) +
Wishlist data, following the exact same `ensureLiveNavDataFetch()`/
`fetchWorkbookSheetRows()`/`activeX()` accessor pattern the "Live nav data"
section above already established for Catalog/Sets/Metal. **Read-only — no
write capability of any kind.** The Browse Edit write layer's own scope
still doesn't cover Albums; that stays a separate, later task.

- **A live album is identified by SetID, not any Type/Category column** —
  confirmed against the real workbook, DB_Sets has no such column. The
  pattern is fixed: `S-YYYY-AL-##` (`ALBUM_SETID_RE`). One live album per
  matching DB_Sets row, with its slots pulled from the Albums sheet's own
  rows sharing that same value in its `AlbumID` column.
- **`Status` is a calculated Albums-sheet column and is deliberately never
  read.** `FilledBy<>""` is the exact same signal it's computed from — the
  mapper reads `FilledBy` directly, same as every other live mapper in this
  file reads a real column rather than re-deriving a formula's output.
- **`denom` is derived from a slot's own CoinID, never from DB_Sets.FaceValue**
  (confirmed inconsistent across real rows by Ray) — `denomFromCoinId()`
  takes a CoinID's third dash-delimited segment
  (`C-YYYY-MINT-DENOM-##`). **CRITICAL, and worth remembering**: the real
  workbook encodes a blank mint mark as a double dash (`C-1909--1C-03`)
  while `FAKE_ALBUMS`' own mock data uses a literal `"M"` placeholder
  (`C-1909-M-1C-01`) — both conventions parse identically under plain
  index-based splitting (mint mark is always segment 2, denom always
  segment 3, regardless of what sits in segment 2), so `denomFromCoinId()`
  never needs to special-case either one. It is also never used to derive a
  mint mark — that's always its own real column (`Albums.MintMark`), read
  directly.
- **`want` (open-slot Wishlist match) is wired end-to-end but genuinely
  inert today** — the real Wishlist sheet has no rows populating its
  `AlbumID`/`SlotCoinID` columns yet, so `buildAlbumWantIndex()`'s Set is
  always empty in practice. Forward-facing wiring, not dead code: the
  moment a real Wishlist row exists, the open slot it names picks up
  `want: true` with no further app change needed. Nothing in the UI
  currently branches on this field (no ★-for-wanted display exists) — this
  pass only makes the DATA available, matching the task's explicit scope
  (no new slot-eligibility/display logic).
- **`mapWorkbookRowToDbSet()` extended** with `mfgProductId`/`containerName`/
  `coinsCount` (from `MfgProductID`/`ContainerName`/`Coins`) — harmless for
  every other DB_Sets row (Proof/Mint/Silver Proof sets simply carry them
  unused). `containerName`/`coinsCount` aren't consumed anywhere yet
  (pulled per the task's own instruction, as future metadata for a
  Container-display or slot-count-validation pass); `mfgProductId` is the
  one already-wired field, same "future per-album metadata" posture the
  `FAKE_ALBUMS` mock already established for it.
- **A DB_Sets Album-type row with zero matching Albums-sheet rows is
  skipped**, not rendered — `renderAlbumsList()`'s own fill-percentage math
  divides by `slots.length`, so an album with nothing behind it would
  render `NaN%` rather than being a real, useful "0/0" entry.
- **`LIVE_ALBUMS` is additive, not part of the five-core-sheet
  all-or-nothing gate** (`allRows`/`dbSetsRows`/`dbCoinsRows`/
  `metalContentRows`/`gradersRows`) — same treatment Photos/Receipts
  already get. An Albums-sheet or Wishlist-sheet hiccup must not block
  Catalog/Sets/Metal from loading, and vice versa. `dbSetsRows` is always
  available by the time Albums is built regardless (it's one of the five
  gated sheets, so the function has already returned `false` otherwise) —
  Albums doesn't need its own separate gate on that one.
- **Consumers swapped from `FAKE_ALBUMS` to a new `activeAlbums()`
  accessor** (`LIVE_ALBUMS || FAKE_ALBUMS`, same convention as
  `activeCoins()`/`activeDbSets()`/`activeDbCoins()`): `renderAlbumsList()`,
  the "Assign to Album" Add Coin dropdown (see below),
  `resolveCoinAlbumLink()` (the Browse detail "Belongs to Album" linkage
  chip), and the whole book-rendering chain — `showAlbumDetail()`/
  `openAlbumAtPage()`/`buildAlbumPages()`/`turnAlbumPage()`/
  `renderAlbumBook()`.
- **A real, load-bearing fix inside the book-rendering chain, beyond the
  literal `FAKE_ALBUMS` swap**: the filled-slot tap handler inside
  `renderAlbumBook()` resolved the tapped coin via `FAKE_COINS.find(...)`
  directly — a live album's `filledBy` values are real CollectionIDs that
  only exist in `LIVE_COINS`, so tapping any filled slot in a live album
  would have silently done nothing (the existing `if (!coin) return;` guard
  swallows it). Swapped to `activeCoins()`. Verified via a real negative
  control: reverting this one line back to `FAKE_COINS` fails exactly the
  two assertions covering it, reproducing the dead-tap symptom.
- **The "Assign to Album" dropdown-population logic was extracted out of
  `initAlbums()` into its own `populateAssignAlbumOptions()`** —
  `initAlbums()` only ever runs once, at page-load init, before any live
  fetch could possibly have resolved, so leaving the dropdown-building
  inline would have meant it stayed on `FAKE_ALBUMS`' demo slots for the
  rest of the session even in a live one. The new function is called both
  from `initAlbums()` (unchanged behavior at boot) and again from
  `ensureLiveNavDataFetch()`'s own success callback once real Albums data
  actually lands, clearing and rebuilding the dynamic `<option>`s each time
  (the static "— not part of an album —" placeholder survives).
- **`showAlbumsList()` now re-renders the list on every entry**, not just
  once at init — previously `renderAlbumsList()` was called only from
  `initAlbums()` and the denomination filter-chip handler, so a fetch that
  had already resolved during an earlier Catalog/Ledger visit would leave
  the Albums list stuck on `FAKE_ALBUMS`' demo data until the fetch's own
  completion callback happened to fire while Albums was *already* the
  active view. `navigate()`'s `"albums"` branch now also calls
  `ensureLiveNavDataFetch()` first, mirroring the Dashboard branch's
  established "never blocks" pattern.
- **An already-open BOOK is deliberately left showing whatever it opened
  with if the fetch lands mid-view** — rebuilding `currentAlbumPages` out
  from under an open book risks landing on a different album at the same
  array index (live and demo album counts/order don't correspond). Only
  the Albums LIST screen re-renders when the fetch's own completion
  callback fires; the book picks up fresh data on next open, same
  "computed/cached once at open time, refreshed next reopen" tradeoff this
  feature already accepts elsewhere (the reference-image tier's own
  string-templated `renderSlotCell()`).
- **`slotMintage()` also switched from `FAKE_DB_COINS` to `activeDbCoins()`
  — flagged explicitly as a small, deliberate extension beyond the literal
  `FAKE_ALBUMS` consumer list this task named.** Its own code comment
  scoped it to the mock specifically because "Albums isn't wired to live
  data yet" — a reason this exact task removes. Left on the mock, every
  real album would have silently shown no mintage at all (a live slot's
  real CoinID never matches any of the 12 `FAKE_DB_COINS` rows); the fix is
  a one-line, obviously-correct follow-on, not a new judgment call, so it
  was made directly rather than deferred.
- **Key-date star badge (addendum, same branch/session) wired to real
  `DB_Coins.KeyDate`.** The `.slot-cell.key-date`/`.key-date-badge` (★)
  mechanism already existed — built for and only ever exercised by
  `FAKE_ALBUMS`' own hand-set `keyDate: true` flags — so this is purely a
  new real data source feeding an existing display, no CSS/visual change.
  `buildAlbumKeyDateIndex(dbCoinsRows)` builds a `Set` of every CoinID whose
  `KeyDate` cell is non-blank, joined into `groupAlbumSlotsByAlbumId()` the
  same way composition/specs are already joined from DB_Coins elsewhere in
  `ensureLiveNavDataFetch()`; `buildLiveAlbums()` gained a fourth
  `dbCoinsRows` parameter to thread it through.
  - *(Superseded by task (g), 30 Oct 2026: only Key Date / Key Variety / Semi-Key
    Date get a star now; see the star rule near the top of this file.)*
  - **Any non-blank value counts, not an exact-match list.** Confirmed real
    values are `"Key Date"`/`"Semi-Key Date"` plus casing variants
    (`"Semi-Key"`/`"KEY"`) — rather than hardcoding those four strings (one
    future data-entry variant away from silently missing a real key date),
    the check is a plain non-blank test after trimming. The column has no
    other populated meaning, so this is the correct rule, not just a
    convenient shortcut.
  - **Key vs. Semi-Key is deliberately NOT visually distinguished** — same
    single boolean, same badge for both, per Ray's explicit scope call (the
    existing CSS has no variant for it, and building one wasn't asked for).
    Not flagged as needing a decision — building a real visual variant would
    have been a genuine design choice, not something "trivial once in
    there," so it was left alone exactly as scoped rather than guessed at.
  - Applies regardless of whether the slot is filled — key-date-ness is a
    property of the slot's own coin TYPE/position, not of ownership, same
    reasoning `slotMintage()` already uses for showing regardless of fill
    state.
- **Deliberately out of scope, per the task's explicit instructions**: any
  write capability (adding/swapping a coin into a slot — Browse Edit's own
  write layer doesn't cover Albums either); per-album curated icon/history
  content beyond the shared 🪙 placeholder and the existing "no history
  notes on file yet" fallback text; and slot-eligibility validation
  (CoinID-to-FilledBy consistency checking) — a known, already-tracked gap,
  not this task's to fix.

**Verified headless — new committed suite `tests/verify_albums_live_data.js`
(67 assertions, up from 52 once the key-date addendum landed), all passing,
zero page errors; 1343 across all 31 suites, zero failures.** Covers:
`denomFromCoinId()` against both the mock's `"-M-"`
convention and the real double-dash convention (proving they parse
identically), a dollar-denom code, and malformed/blank/null input;
`buildLiveAlbums()` end-to-end from synthetic raw sheet rows — the correct
album count, an AL-pattern row with no matching slots correctly excluded, a
non-Album DB_Sets row never leaking in, and every field (name/denom/icon/
folderStyle/mfgProductId/containerName/coinsCount/history/slots) landing
correctly; the mapped slot shape including `filledBy: null` (not `""`) for
an open slot and the `want` flag in all three states (open+matched,
open+unmatched, filled-so-never-true); `activeAlbums()`'s fallback/override
behavior; `renderAlbumsList()` and `populateAssignAlbumOptions()` genuinely
reading live data (real name, real fill count, real open slots offered, a
filled slot never offered); the full book-rendering chain end-to-end
through real clicks — a live album's cover name, a slot's real label,
`slotMintage()` resolving through `activeDbCoins()`; tapping a FILLED live
slot correctly resolving via `activeCoins()` and opening Browse detail for
the live coin (a live-only CollectionID that provably does not exist in
`FAKE_COINS`); tapping an OPEN live slot prefilling Add Coin's Denomination/
Year/MintMark from the live album's own derived data; `resolveCoinAlbumLink()`
resolving a live coin's album; the `mapWorkbookRowToDbSet()` extension
staying harmless for an ordinary non-Album row; `navigate("albums")` priming
the fetch; and a nav/overflow smoke check. **Two negative controls verified
against the real app code itself** (not just the suite's own in-page
simulations) — reverting `renderAlbumsList()`'s `activeAlbums()` back to
`FAKE_ALBUMS` fails the three assertions that depend on it (and no others),
and reverting the filled-slot tap handler's `activeCoins()` back to
`FAKE_COINS` fails exactly the two assertions covering that path — both
reverts were applied to the real file, run, and undone, not just described.

**Key-date addendum coverage (15 new assertions):** `buildAlbumKeyDateIndex()`
against all four confirmed real values (`"Key Date"`/`"Semi-Key Date"`/
`"Semi-Key"`/`"KEY"`) plus a blank cell, a row missing the `KeyDate` column
entirely, a whitespace-only cell, a `null` `dbCoinsRows` array, and a CoinID
with no matching row — all resolving correctly with no throw;
`buildLiveAlbums()` end-to-end confirming a Semi-Key-Date coin's slot gets
`keyDate:true` while a matched-but-blank-KeyDate slot and a no-DB_Coins-match
slot both get `keyDate:false` (not `true` from mere presence, and not
`undefined`/a throw); a real render check — the pre-existing `.key-date`
class and `★` badge genuinely appear on a live key-date slot and genuinely
don't on an ordinary one, proving the existing mechanism lights up for real
data rather than just the field being set correctly in isolation. **One more
negative control verified against the real app code**: reverting
`groupAlbumSlotsByAlbumId()` to not set `keyDate` at all reproduces the
pre-fix state and fails exactly the two assertions that depend on it — this
one applied via an in-page function-reassignment (the same technique the
`renderStats`/`renderAlbumsList` negative controls elsewhere in this file
already rely on, confirmed to work) rather than editing the file, plus a
second, separate real-file revert (`buildLiveAlbums()`'s own
`keyDateIndex` forced to an always-empty `Set`) run and undone directly
against `app.html` for extra rigor, which failed the identical two
assertions.
- **Not verified: any real device, any real OneDrive session.** This task's
  own instructions call for a live-device pass against the real 6 albums
  (Wheat Cents, Lincoln 1930-58, Memorial Cents, Lincoln 1999-2025, Mercury
  Dimes, Roosevelt Dimes) with their actual real fill counts before this
  merges — held on its branch for exactly that reason, not auto-merged
  despite being a small, well-scoped extension of an already-merged
  pattern. Three things worth Ray's eyes specifically during that pass,
  beyond "does it crash": whether `denom` derivation is correct for every
  real album (each should read a clean, single denomination code); whether
  any real Albums-sheet row's `AlbumID` fails to match any DB_Sets Album-type
  row's `SetID` (a slot that would then be silently dropped — the
  sparse-linkage class of gap this file already documents elsewhere for
  `SetID`, not something this task built a safety net for); and whether the
  real key-date stars land on the coins Ray actually expects (this
  environment's own confirmation is limited to synthetic fixtures, not the
  real `DB_Coins.KeyDate` population across all 6 albums' actual slots).

**History text (addendum, same branch/session) wired to real
`DB_Sets.History`.** A Copilot pass added a real `History` column to
DB_Sets, populated today on exactly the 6 album rows
(`S-1909-AL-01`/`S-1916-AL-01`/`S-1930-AL-01`/`S-1946-AL-01`/`S-1959-AL-01`/
`S-1999-AL-01`). The history page's own display logic
(`renderAlbumPageContent()`'s `album.history || "No history notes on file
for this set yet."`) already existed and needed no change — it was built
during the original page-flip-book feature specifically anticipating a
future real source, and this is that source arriving.
- **`mapWorkbookRowToDbSet()` gained `history: String(colVal(row,
  "History"))`**, read unconditionally on every DB_Sets row (not just Album
  rows) — cheap, and matches how every other field on this mapper is read
  regardless of which rows actually populate it (same as `mfgProductId`/
  `containerName`/`coinsCount`). A row with no `History` cell maps to `""`
  — falsy, so it falls straight through to the existing fallback with no
  extra branching.
- **`buildLiveAlbums()` now sets `history: mapped.history`** on the
  constructed album object, replacing the "deliberately left unset" comment
  that was there while no real source existed. This is the only other
  change — the display path was already correct.
- **Verified headless — 9 new assertions (block P, `verify_albums_live_data.js`),
  all passing; 76 in that suite, 1367 across all 32 suites, zero
  failures.** Covers `mapWorkbookRowToDbSet()` reading a populated History
  cell verbatim and a missing one as `""` (not `undefined`); a populated
  `DB_Sets.History` carrying through `buildLiveAlbums()` onto `album.history`
  while an unpopulated album's stays `""`; and — the real end-to-end
  check — driving the actual `renderAlbumPageContent()` history page for
  both a populated and an unpopulated album, confirming the real text
  displays for the populated one and the existing fallback still displays,
  unchanged, for the unpopulated one. **Negative control**: reverting
  `buildLiveAlbums()` to omit `history` (the pre-fix state) reproduces the
  fallback even for the album with real History data, and the real text is
  confirmed absent — proving the positive assertions depend on the actual
  wiring, not a coincidental pass. One pre-existing assertion (`B12`, which
  had asserted `history === undefined` as the deliberate pre-fix state) was
  updated to assert the new real value (`""` for this fixture's un-historied
  row), following the real design change rather than being weakened.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as the rest of this feature; specifically, whether the
  real History text for all 6 named album rows displays as expected (line
  breaks, length, any markup) on Ray's own device hasn't been checked from
  this environment.

**Albums list sort order (addendum, same branch/session): Denomination,
then Year.** The list view (`renderAlbumsList()`) previously rendered
`activeAlbums()` in plain array/insertion order — for live data, whatever
order `DB_Sets` rows happen to come back in; for the demo path, whatever
order `FAKE_ALBUMS` is declared in. Now sorted **Denomination (smallest
face value to largest) then Year (oldest to newest) within a
denomination**, applied identically to both the live and `FAKE_ALBUMS`
paths since both go through the one `renderAlbumsList()` function.
- **`ALBUMS_DENOM_CODES` changed from a `Set` to an ARRAY**
  (`["1C","5C","10C","25C","50C","$1"]`) — its own index order is now the
  real sort key (`albumsDenomSortIndex()`), not alphabetical (`"$1"` would
  sort before `"10C"` alphabetically; it must not, and doesn't — verified
  directly). `albumsFilterTest()`'s one existing consumer (`.has()` for the
  "Other" catch-all pill) switched to `.includes()` — same values, same
  behavior, no functional change there.
- **An unrecognized/mixed denom sorts AFTER every named code**, not
  before — `indexOf()`'s own `-1` would otherwise put it first, backwards
  for a catch-all bucket.
- **`album.year` is new — it didn't exist on the album object shape at
  all before this.** `mapWorkbookRowToDbSet()` already read a real `year`
  field (used elsewhere for DB_Sets rows), but `buildLiveAlbums()` never
  carried it onto the constructed album object, and `FAKE_ALBUMS`' three
  demo entries had no album-level year field either (only each slot's own
  `year`). Fixed on both sides: `buildLiveAlbums()` now sets `year:
  mapped.year`; each `FAKE_ALBUMS` entry got a literal `year` matching its
  own earliest slot (1909/1878/1971) — the same "the year the
  folder/product starts" convention a real DB_Sets row's own Year would
  represent.
- **`albumYearSortValue()`** treats a blank/null/non-numeric year as
  `Infinity` (sorts to the end of its own denomination group) rather than
  producing `NaN`-driven sort noise — same rule `rollYearNumber()`/
  `compareRollYear()` already established for the Rolls tab's own year
  sort.
- **The click-to-open handler's index survives the reorder correctly.**
  `showAlbumDetail(index)`/`openAlbumAtPage(index, ...)` index into
  `activeAlbums()` directly (and `currentAlbumIndex` persists that same
  index for the book's own next/prev navigation) — so `renderAlbumsList()`
  pairs each album with its ORIGINAL `activeAlbums()` index before
  filtering/sorting (`.map((album, index) => ({album, index}))`), and the
  click handler still closes over that original index, not the album's
  position in the sorted/rendered list. Verified directly: clicking the
  3rd rendered (sorted) card opens the correct album even though it isn't
  `activeAlbums()[2]` in the underlying (scrambled) data order.
- **Verified headless — 20 new assertions (block Q, `verify_albums_live_data.js`),
  all passing; 88 in that suite, 1379 across all 32 suites, zero
  failures.** Covers `albumsDenomSortIndex()`/`albumYearSortValue()` in
  isolation (array-order-not-alphabetical, unknown-denom-sorts-last,
  blank/null-year-sorts-last); the exact 6-real-album order named in the
  task, built from DELIBERATELY SCRAMBLED input (never the expected
  output order, so a pass can only mean the sort genuinely ran) — all
  four `1C` albums oldest-to-newest, then both `10C` albums
  oldest-to-newest; the click-index-preservation case above; the
  `FAKE_ALBUMS` demo path sorting identically (`1C` → `5C` → `$1`, with
  `$1`'s own 1878 — the numerically smallest year of the three —
  correctly NOT winning over its larger denomination code, proving Year
  is only ever the secondary key). **Negative control**: a reproduction of
  the pre-fix plain-`forEach`-no-sort body against the same scrambled
  fixture reproduces the raw input order, confirmed genuinely different
  from the expected sorted order — proving the positive assertions depend
  on the real sort, not a coincidence of fixture ordering. Also spot-checked
  directly in a real headless browser session (not just the suite): a
  fresh `navigate("albums")` on the demo path renders `Lincoln Cents` →
  `Jefferson Nickels` → `Morgan Dollars`, matching `1C → 5C → $1`.
- **Not verified: any real device, any real OneDrive session, or the
  actual sort order against all 6 real albums live** — same standing
  caveat as the rest of this feature; the exact names/years used in the
  headless fixture were given directly rather than pulled from a real
  session.


### Albums book layout: cover sizing + page-flip clip fix (BUILT and merged to main)
Three display bugs from Ray's live-device pass against the real Mercury
Dimes album (63/82 filled). Two are real, confirmed, fixed CSS/JS bugs; the
third was investigated and diagnosed as **not a code bug** — see below.
All three were invisible against `FAKE_ALBUMS`' own 8-slot mocks, which
never had enough content to expose either real bug's actual condition.

**Root-caused by reproduction, not guessed at.** Neither the real coin
photo nor the real workbook is reachable from this environment, so a
synthetic live album (97 slots across 1916–1952, not evenly divisible —
deliberately, since the real album's own slot count doesn't divide evenly
into whatever chunk size the viewport computes either) was built via
`buildLiveAlbums()` and driven through the real render/animation code with
direct `getBoundingClientRect()` measurement and screenshots, both before
and after each fix, at both phone and tablet width.

**Bug 1 — a coin photo renders undersized inside its own disc (Albums slot
AND Browse detail's own flip card): diagnosed as NOT a code bug.**
- `background-size: cover` (used identically by `applyDiscOwnPhoto()`,
  Browse detail's own disc-fill function, and Albums' `renderSlotCell()`
  inline style) **cannot leave a visible CSS-level gap** — cover always
  fills its whole container by definition, cropping overflow if the source
  image's aspect ratio doesn't match. Confirmed directly: a synthetic
  "padded" source image (a bright coin circle occupying only ~62% of its
  own square canvas, with a differently-colored margin baked into the
  actual pixels) rendered through `.coin-disc`'s real `background-size:
  cover` reproduces Ray's exact reported symptom — a visibly smaller coin
  with a ring of margin around it — even though the CSS itself is doing
  exactly what it's supposed to.
- This matches CLAUDE.md's own already-documented, already-shipped
  "Circle framing" fix (see "Photo / receipt write layer" above): before
  that fix, a captured photo's Stage 2 bake stored the coin at ~0.80 of
  the circle guide's diameter rather than 1.00, with the rest of the frame
  filled by real background material — baked into the file's own pixels,
  not a layout property. That section's own words: **"Photos already
  stored from before this fix keep their old framing until re-adjusted —
  the framing was never recorded, so there is nothing to recover
  retroactively."**
- `resolveStoredAdjustSource()` (the Adjust/⤢ button's own source picker)
  was re-read to rule out a regression there specifically, since Ray
  reported the gap persisting "even after re-saving/fixing the photo in
  Edit": it already prefers a resolvable raw and explicitly falls back to
  re-cropping the DISPLAYED (already-cropped) file when no raw exists —
  with its own user-facing toast saying so ("No original on file —
  adjusting the stored photo itself, which re-crops it"). Working exactly
  as documented, not a bug: if this coin's stored photo has no resolvable
  `_original`/`OriginalFilename` (a legacy capture, or one from before
  original-retention existed), re-adjusting from that same already-damaged
  source re-crops the SAME padding into the new output — no amount of
  re-saving through Adjust can recover detail that was never retained.
- **No fix was written for this** — there's no code bug to fix, only a
  legacy-data condition this project has already named and accepted
  elsewhere. **Flagged back to Ray rather than guessed at**: did the
  "re-saving" he did use the Adjust (⤢) button, or a full fresh Camera/
  Library recapture? And does this specific coin's photo predate the
  circle-framing-fix merge? If it was a genuine fresh recapture (not an
  Adjust re-crop of the same damaged source) and the gap still appeared,
  that would be new information pointing at an actual bug — worth a
  follow-up look, but not something to guess a fix for blind.

**Bug 2 — the album cover renders visibly smaller than interior pages.**
Root cause, confirmed by measurement: `.album-page` (the shared class
EVERY page type uses — cover, history, coins, blank, back-cover) carried a
bare `min-height: 360px`. A coins page naturally grows past that floor
because its own content (a real slot grid, sized via
`computeAlbumPageRows()` to roughly fill the actual viewport) needs the
room; the cover's content (an icon, a name, one progress line) never does,
so it always sat at exactly 360px while a real coins page routinely
measured 600px+. The cover is also never paired with a taller sibling —
`renderAlbumBook()`'s own comment already says so ("the cover… is a
standalone sheet-front") — so unlike History (which DOES pair with a
coins page and gets stretched to match it via `.book-pages`'
`align-items: stretch`, confirmed still working correctly, unaffected by
this fix), the cover never got a free ride from flex stretch either.
Nothing had ever told it how tall a book page "should" be.

- **Fix: `computeAlbumPageMinHeight(spread)`** reconstructs the exact same
  available-space budget `computeAlbumPageRows()` already computes (rows ×
  rowHeight) and adds back the page's own reserved chrome (padding,
  border, the coins page's side-label row) to get a real outer page
  height. `renderAlbumBook()` sets it as `--page-min-height` on
  `#albumsDetailContainer` on every render (CSS custom properties
  cascade/inherit, so this applies correctly regardless of whether it's
  set before or after the page markup is built, and covers
  `turnAlbumPage()`'s own mid-animation markup too, which renders inside
  that same container without going through `renderAlbumBook()` itself).
  `.album-page`'s CSS changed from a bare `min-height: 360px` to
  `min-height: var(--page-min-height, 360px)` — every page type,
  cover included, now targets one consistent computed height, with 360px
  kept only as a safety fallback for a context where the var was never
  set.
- Measured directly, both widths: phone (412px, non-spread) — cover 710px,
  History 710px, first coins page 710px, all matching exactly. Tablet
  (1024px, spread) — cover 630px alone, History+Obverse pair 630px/630px,
  all matching.

**Bug 3 — the bottom of a page appears to clip during the flip animation.**
Root cause, confirmed by measurement AND screenshot: during a turn,
`.book-turn-slot` (the wrapper for whichever side is animating) IS
correctly stretched to match its still-visible sibling's real height, via
the same `.book-pages` `align-items: stretch` mechanism — confirmed
directly (606px, matching the sibling). But `.static-under` (the plain,
in-flow child holding the page that's about to be revealed underneath the
turning leaf) had no height rule of its own, so it sat at its OWN natural
content height instead — genuinely shorter than the stretched parent
whenever the revealed page holds fewer rows than the page still showing
(the book's own final, partially-filled pages are the most common case,
but any two consecutive coins pages with different row counts can trigger
it). The revealed page's own coin content was never wrong — it rendered
completely and correctly, just inside a box that stopped short of its
sibling's height, which reads as "the page's own bottom edge/background
clips" even though nothing is actually being overflow-clipped
(`.book-turn-slot`/`.leaf-turn` are both `overflow: visible`). Screenshot
evidence: mid-flip, the revealed page's cream-colored background stopped
three rows short of its sibling's, with a large black gap below it where
the box should have extended to match.
- **Fix**: `.book-turn-slot .static-under { height: 100%; }` (filling the
  already-correctly-stretched parent, mirroring what `.leaf-face`'s own
  `inset: 0` already does automatically for the turning leaf itself), plus
  extending the existing `.leaf-face > .album-page { height: 100% }` rule
  to also cover `.static-under > .album-page` — the SAME class of gap one
  level down: the box wrapper stretching correctly is not enough if its
  own child `.album-page` isn't also told to fill it.
- **Real, useful interaction found while writing the negative control, not
  a second bug**: with Bug 2's fix also in place, EVERY `.album-page`
  (short or tall) already gets floored to `--page-min-height`, which
  independently makes a short revealed page's own child at least as tall
  as a full one — meaning Bug 2's fix alone, in most real scenarios,
  already prevents Bug 3's symptom from showing, even without Bug 3's own
  fix. Confirmed by testing Bug 3's fix in isolation (Bug 2's fix left
  active): no reproduction. Both fixes are kept anyway, deliberately — the
  min-height floor is a coincidental side effect for this case, not an
  architectural guarantee (a page could in principle still need more room
  than the precomputed floor, or the two could drift out of sync in a
  future change), while `.static-under`'s own `height: 100%` is the
  actually-correct, direct fix for what the box is supposed to do
  regardless of any other page's min-height. Both are real, independently
  justified fixes, not redundant work — the interaction is documented so a
  future session doesn't "simplify" one away and reintroduce a
  narrower-but-real version of Bug 3.

**Verified headless — new committed suite `tests/verify_album_book_layout.js`
(15 assertions), all passing, zero page errors; 1358 across all 32 suites,
zero failures.** Drives a real 97-slot synthetic live album through the
actual render/animation code (not a hand-rolled simulation) at both
required viewports: cover/History/coins-page heights matching exactly at
phone width (non-spread) and tablet width (spread); a real dispatched
click triggering the actual 650ms CSS transition, measured mid-animation,
confirming `.static-under`/`.book-turn-slot`/the turning leaf all now
match; and a `computeVisibleIndices()`/`nextAlbumPageIndex()`-driven search
(mirroring `turnAlbumPage()`'s own real logic) that finds the actual
mismatched transition point rather than assuming a fixed page offset,
since where the mismatch falls depends on live viewport math, not a fixed
layout. **Two negative controls, via temporary `<style>` overrides
reproducing the exact pre-fix rules** (not achievable via the usual
function-reassignment technique, since both bugs are pure CSS): forcing
the bare `min-height: 360px` back reproduces the undersized cover exactly
(360px); forcing `.static-under`'s height back to `auto` — together with
the bare `min-height: 360px` (needed to isolate Bug 3's own contribution
from Bug 2's fix, per the interaction noted above) — reproduces the exact
reported clip. Screenshots reviewed at both viewports for the fixed cover,
the fixed mid-flip transition, and Bug 1's synthetic-padded-image
reproduction.
- **Not verified: any real device, Ray's own real coin photo, or the real
  workbook's actual Mercury Dimes data.** This pass used a synthetic
  live-data fixture throughout, per the same standing caveat as the rest
  of this feature. Bug 1 in particular needs Ray's own answer (Adjust vs.
  fresh recapture; whether the photo predates the circle-framing fix)
  before any further action is warranted there.

**Row cap: max 5 rows per page (addendum, same branch/session).** Ray's
follow-up real-device report: a full album page on tablet and PC required
vertical scrolling to see in full — the page itself was taller than the
viewport. `computeAlbumPageRows()`'s own "fill available space" calculation
is correct on narrower/shorter viewports where fewer than 5 rows fit (it's
still the ACTIVE constraint there — a phone at 412×915 computes 5 rows
uncapped for the same reason, only slightly under the cap), but on a tall
viewport it kept growing past what a single screen shows.
- **One-line fix**: `return Math.min(5, Math.max(1, Math.floor(available /
  rowHeight)));` — clamps the existing calculation rather than replacing it.
- **Nothing else needed changing, confirmed by reading the call graph
  first, not assumed.** `computeAlbumChunkSize()` (coins per page = rows ×
  columns) and `computeAlbumPageMinHeight()` (the `--page-min-height` CSS
  variable driving both bug fixes from the section above) both derive
  entirely from `computeAlbumPageRows()`'s own return value — capping rows
  here automatically shrinks the page's own computed min-height and
  increases page count for any album that previously computed more than 5
  rows, with no separate change needed at either call site.
- **The two CSS fixes above (the `--page-min-height` floor and
  `.static-under`'s `height: 100%`) were re-verified, not just assumed
  still correct** — both are generic mechanisms that adapt to whatever
  `computeAlbumPageRows()` returns, and the existing committed suite
  (`tests/verify_album_book_layout.js`, blocks A–D) re-passed unchanged
  against the capped value with no edits needed to those blocks.
- **Real-measured, not assumed: where the cap actually bites.** For the
  committed 97-slot fixture, tablet (1024×768) naturally computes exactly
  5 rows even UNCAPPED — its width (6 columns in spread mode) makes it
  land right at the boundary on its own, so the cap is present-but-inert
  there. PC (1920×1080, the same fixture) computes **8 rows uncapped**,
  clamped to 5 — this is where the fix is actually load-bearing. Both are
  covered by dedicated assertions (see below) rather than assuming tablet
  alone proves the fix.
- **Verified headless — 8 new assertions (block F,
  `tests/verify_album_book_layout.js`), all passing; 26 in that suite, 1390
  across all 32 suites, zero failures.** Covers: `computeAlbumPageRows()`
  returning at most 5 at both tablet and PC width; every rendered coins
  page (not just the formula in isolation) showing at most 5 rows of real
  slot content at both widths; a real coins page's bottom edge fitting
  within the viewport height with no scrolling needed, at both widths; no
  vertical page overflow with a real 97-slot album open, at both widths;
  and negative controls confirming the pre-cap formula is genuinely >5 at
  PC width (proving the fix is doing real work, not passing by
  coincidence) while correctly documenting that tablet's own uncapped
  value already happens to be 5 for this fixture. Screenshots reviewed
  directly (a separate synthetic 82-slot Mercury-Dimes-shaped fixture,
  closer to the real album's real slot count than the committed suite's
  97-slot one) at both tablet and PC width, mid-book: exactly 5 rows per
  page, comfortable clearance below the page, no scrollbar.
- **Not verified: any real device.** Same standing caveat as the rest of
  this feature — this fix directly targets Ray's own tablet/PC report, so
  his confirmation on those exact devices is the one that actually closes
  this out, not a headless viewport simulation.

**Merged to main.** Ray reviewed the whole Albums live-wiring feature —
live data (Albums/DB_Sets/Wishlist wiring), the key-date badge, the
History-text wiring, the list's Denomination-then-Year sort, the two
cover-sizing/page-flip-clip bug fixes, and this row cap — and authorized
merging `claude/code-primer-u8uv1d` to `main` once this fix was verified.
`claude/code-primer-u8uv1d` has no commits of its own that aren't now in
main's history — **main is the source of truth for the whole Albums
live-wiring feature going forward**, same standing as every other
merged-after-holding branch in this file. Both this section's own header
and "Albums book layout: cover sizing + page-flip clip fix" above are
updated to reflect it, rather than left reading "held" once it no longer
is.


### Albums: bounded image prefetch on open (BUILT and merged to main)
Companion to the splash-screen gating above, same task/session. Opening an
album (`showAlbumDetail()`/`openAlbumAtPage()`) used to reveal the book
instantly, before any of its slot images had a fair chance to load —
correct for pages beyond the first (they already progressively fill in as
their own fetches resolve — see `renderSlotCell()`'s own comment: "picks up
the cached image on the album's next render/reopen"), but the very first
reveal would show text-only/placeholder discs for a beat even when the
images were about to arrive within a moment. Now `openAlbumAtPage()` waits
(bounded, 5s) for the page(s) about to be shown to have a real shot at their
own images before ever painting the book.

- **`prefetchAlbumSlotImages(pages)`** kicks off (and returns a `Promise.all`
  for) every real image fetch a set of pages' own slots might still need —
  reusing `renderSlotCell()`'s own tiered priority (session-captured own
  photo > stored Photos-tab photo > series reference image) rather than
  reimplementing it, so a slot resolved here is served straight from cache
  the instant `renderSlotCell()` actually runs. Non-coins pages (cover/
  history/blank/back-cover) have no `.slots` and are a no-op; an unfilled/
  "want" slot has nothing to fetch.
- **Scoped to whichever page(s) are about to be VISIBLE, not a hardcoded
  "first coins page" — this is the one real design decision this task
  made rather than a literal spec-following.** `openAlbumAtPage(index,
  pageIndex)` is called from three places: a fresh open always lands on
  the cover (`pageIndex` 0 — no slots, a near-instant no-op); a Sets-
  checklist-style deep-link (`openAlbumFromLink`) also always opens at 0;
  but the filled-slot click handler's own `browseDetailBackHandler`
  reopens at **whatever coins page the user was actually on** when they
  tapped into a coin's Browse detail view (`openAlbumAtPage(albumIndex,
  pageAtClick)`) — exactly the page that needs its images ready on return,
  not the album's first chunk. `computeVisibleIndices(pageIndex, spread,
  totalPages)` — the SAME function `renderAlbumBook()` itself uses to
  decide what's on screen — is what `openAlbumAtPage()` now prefetches
  against, so one mechanism correctly serves every caller. Spread (tablet/
  desktop) mode shows two pages at once, so both are prefetched together,
  not just one of the pair.
- **The shared spinning-coin loading indicator** (`showSectionLoading`/
  `hideSectionLoading`, the same "retest #10" mechanism Staging Review and
  the Docket already use) covers `#albumsDetailContainer` while the
  prefetch/timeout race is in flight — the container is cleared first
  (`innerHTML = ""`) so no stale prior album's content shows behind it,
  then `renderAlbumBook()` replaces it wholesale once the race settles, the
  same way every other real Graph-backed section transition in this app
  already reads while its own fetch is pending.
- **Fixed 5s ceiling** (`ALBUM_OPEN_IMAGE_TIMEOUT_MS`, **may be refined
  after live testing**, same as the splash's own ceiling above) —
  `Promise.race([prefetchAlbumSlotImages(visiblePages), timeout])`. Unlike
  the splash's text-data ceiling, images hitting this one is EXPECTED and
  fine: revealing the book with whatever's ready is the exact same
  progressive-fill fallback the app already has for every page beyond the
  first, so failing open here is a no-op, not a regression — no special-
  casing needed between the "resolved" and "timed out" paths, both just
  call the same `renderAlbumBook()`.
- **Staleness guard** (`albumOpenToken`, bumped on every `openAlbumAtPage()`
  call, same pattern `stagingRenderToken`/`needsAttentionRenderToken`
  already use elsewhere) — if a second open supersedes a first one before
  its own prefetch/timeout settles (Back tapped mid-wait, then a different
  album opened), the stale call recognizes itself via the token mismatch
  and skips rendering entirely rather than painting over whatever the
  newer call already showed. **A real bug this guard prevents, caught
  while building the committed test for it, not guessed at**: without it,
  a slow/never-resolving stale prefetch that finishes AFTER a later,
  faster open would call `renderAlbumBook()` against whatever
  `currentAlbumIndex`/`LIVE_ALBUMS` happen to be at that later moment —
  which, in a test that has since reset the live override, is `undefined`,
  throwing inside `renderAlbumPageContent()` (`Cannot read properties of
  undefined (reading 'folderStyle')`). Real app usage has the identical
  shape (Back, then open a different album, while the first album's
  images were still loading) even though nothing here reset `LIVE_ALBUMS`
  mid-session in practice — the guard closes the general case, not just
  the test's own trigger.
- **`showAlbumDetail()`/`openAlbumAtPage()`/`openAlbumFromLink()` now
  return the underlying Promise** instead of firing-and-forgetting
  internally — every real caller in the app still ignores the return value
  (unchanged behavior), but this is what let the existing test suites
  (`verify_albums_live_data.js`, `verify_album_book_layout.js`) `await`
  the real reveal instead of reading DOM state that's still mid-loading-
  spinner. Every pre-existing `showAlbumDetail(...)`/`openAlbumAtPage(...)`
  call site across both suites was updated to `await` it — including one
  (`verify_albums_live_data.js`'s Denomination/Year-sort click-index test)
  that triggered the open indirectly via a real `.click()` on a rendered
  album card rather than calling the function directly, which needed an
  explicit short wait after the click rather than an `await` on a return
  value the DOM event system doesn't expose.
- **Verified headless** (`tests/verify_splash_and_album_prefetch.js`, Part 2
  blocks F–L, 15 assertions; 27 total in that suite; 1417 across all 33
  suites, zero failures, zero page errors): the three open functions return
  a real Promise; the loading indicator shows while a stubbed prefetch is
  pending and the real book is NOT revealed yet, then the reverse once it
  resolves; a hung prefetch still reveals the book at ~5000ms with whatever
  was ready; the scoping decision itself — a fresh open triggers zero
  reference-image fetches (the cover has no slots), while reopening
  directly at a later coins page fetches exactly THAT page's own series
  and never the album's first chunk, **with a negative control simulating
  the rejected "always prefetch chunk 0" design** and confirming it would
  have fetched the wrong series for a reopen at a later page; the
  staleness guard, driven through two real overlapping `openAlbumAtPage()`
  calls (not just asserted in isolation) — the newer open renders correctly
  and the stale one resolving later does not overwrite it;
  `prefetchAlbumSlotImages()` never throws for a non-coins page, an
  unfilled slot, real filled slots, or a null/empty pages argument; and a
  nav/overflow smoke check.
- **Not verified: any real device, any real OneDrive session.** In
  particular, both 5s ceilings (splash and this one) are the values named
  in the task and may need retuning once Ray sees real network timing on
  his own connection — flagged as an explicit, expected follow-up, not a
  gap in this pass.


### Albums: variety-label bug fix, rounded Mintage, "Included" for shared figures (BUILT and merged to main)
Three related Albums-book-view fixes/additions, all previously scoped with
Ray. Held on the same branch, same "awaiting live-device confirmation"
standing as everything else on it.

**1. BUG — the variety label was accidentally coupled to key-date
status.** `renderSlotCell()`'s `.slot-variety` line — "VDB" under a 1909-S
Lincoln cent, "Micro S" under a 1945-S — used to render only when
`slot.keyDate && slotVariety(slot)` were BOTH true, gating a variety's
visibility on a completely unrelated fact about the same coin. Real
example this hid: a "Doubled Die" or "Micro S" variety on a date the
workbook doesn't (or shouldn't) flag as a key/semi-key date never showed
its variety label at all, even though the slot genuinely has one. **Fixed
by dropping the `slot.keyDate` half of the condition entirely** — the line
now shows whenever `slotVariety(slot)` is truthy, full stop. **The
key-date star badge itself (`.key-date-badge`, the separate `<span>` a few
lines below) is completely untouched** — same correctly-working mechanism,
it only ever shared this one gating condition by coincidence, not by
design.

**2. NEW — rounded Mintage display, Albums book view ONLY.** Mimics Ray's
physical Littleton folders, which print a rounded figure for a large
mintage rather than the full digit string:
- `>= 1,000,000` → one decimal place + `" Million"` (175,090,000 → `"175.1
  Million"`; the boundary itself, exactly 1,000,000, belongs to this
  branch too — `"1.0 Million"`, not `"1,000,000"`).
- `< 1,000,000` → the exact figure, comma-formatted, completely unchanged.
- **Scoped to `renderSlotCell()`'s one call site alone** — every other
  mintage display in the app (Browse detail, Catalog's candidate pickers,
  Set Details facts, the ambiguous-match picker) reads through its own
  separate `.toLocaleString()` call, confirmed via source search before
  touching anything, and keeps showing the exact researched figure
  unchanged.
- **New `formatAlbumMintage(mintage)`** does the rounding/formatting;
  `slotMintage(slot)` (already the one function resolving a slot's Mintage
  via its CoinID, through `activeDbCoins()`) now returns a small shape —
  `null` when there's genuinely nothing to show (no catalog match, or a
  match with neither a real Mintage nor the Inclusive flag below), or
  `{ inclusive: false, value: <number> }` / `{ inclusive: true, value: null
  }` otherwise — rather than a bare number, so `formatAlbumMintage()` has
  what it needs without re-querying the catalog a second time.

**3. NEW — `DB_Coins.MintageInclusive="Y"` displays as the plain word
"Included," replacing the number entirely.** A new, real workbook column
(Copilot-populated, 94 rows flagged `"Y"`, positioned next to Mintage —
cosmetic reordering only, `colVal()` reads by header name so this needed
no code change on its own) marking a CoinID whose Mintage figure is
**copied from its parent date/mint** rather than a genuinely distinct,
separately-published total — die varieties/designations the Mint never
tallied on their own (1945-S Micro S, 1942/41 overdates, Mercury FB
designations, 1982 cent variants), as opposed to something like 1909 VDB,
which has its own real distinct total.
- **`mapWorkbookRowToDbCoin()` gained `mintageInclusive`**, read via
  `colVal(row, "MintageInclusive")` like every other real DB_Coins field —
  a blank cell or a row with no such column at all both map cleanly to
  `""`, never a throw.
- **The inclusive flag is checked FIRST and wins outright**, independent
  of whatever numeric Mintage value also happens to be stored alongside it
  (Copilot's real backfill populates both columns — the number isn't
  erased, just masked for display) — `slotMintage()` never derives
  "inclusive" from the number's own magnitude, only from the flag itself.
  **Self-explanatory on its own, no asterisk or footnote** — matches the
  underlying reality that the figure is borrowed rather than owned, per
  Ray's explicit spec.
- **Independent of the variety label and the key-date star** — a
  MintageInclusive coin's own variety ("Micro S") and key-date status (if
  any) render exactly as they would for any other slot; only the Mintage
  line itself changes.

**Demo data**: `FAKE_ALBUMS`' Lincoln Cents album gained two new slots —
a non-key-date "Doubled Die" variety (1912-D, a representative stand-in,
not a claim about a real coin/mintage) demonstrating fix #1, and the real
named example from the spec, 1945-S Micro S, demonstrating fix #3 — each
with a matching new `FAKE_DB_COINS` row. The existing 1909-M Lincoln slot
(mintage 1,825,000) already demonstrated fix #2 without needing new data,
so the committed suite's own end-to-end fixture is what actually exercises
the worked 175,090,000 → "175.1 Million" example from the task.

**Verified headless — new committed suite
`tests/verify_albums_variety_mintage.js` (25 assertions), all passing;
1505 across all 36 suites, zero failures, zero page errors.** Uses its own
small, precisely-sized live fixture (6 slots, all confirmed to land on one
coins page at phone width) rather than the evolving `FAKE_ALBUMS` demo
album, so every assertion reads from one render with no page-hunting.
Covers: **the bug fix**, driven through the real render path — a key-date
slot with a variety still shows both (unchanged), the Doubled Die slot
(confirmed genuinely NOT flagged key-date) now shows its variety (the
actual fix), a slot with no variety still shows none either way — **plus a
negative control** reproducing the exact old `slot.keyDate &&
slotVariety(slot)` gate inline against the identical slot, confirming it
would have hidden the variety, proving the fix is real and not a
tautology; **Million-rounding**, end-to-end through the real render — the
large-mintage slot rounds to the exact worked example, the small-mintage
slot stays exact, a no-catalog-match slot still shows no line at all;
**"Included"**, end-to-end — the flagged slot's Mintage line reads exactly
`"Included"` while its Variety line still independently shows `"Micro
S"`, plus a negative control confirming an ordinary large-mintage slot
with no flag formats as the rounded number, not `"Included"`;
`formatAlbumMintage()`/`slotMintage()` in isolation, including the
1,000,000 boundary, the inclusive-flag-wins-over-value rule, a
no-catalog-match `null`, and an inclusive row with no numeric mintage at
all still reporting `inclusive:true`; and `mapWorkbookRowToDbCoin()`
reading a real `"Y"`, a blank cell, and a row with no such column present.
A nav/overflow smoke check closes it out.
- **Not verified: any real device.** Per the task's own instruction, needs
  a live-device pass spot-checking exactly the three named cases: a
  variety that's NOT a key date, a large-mintage coin, and a
  MintageInclusive=Y coin like 1945-S Micro S — plus confirming Ray's
  updated database copy (94 flagged rows, `MintageInclusive` repositioned
  next to `Mintage`) reads correctly against this build, which this
  environment has no way to confirm on its own.

**Follow-up (same branch, merged together with everything above): two
small display corrections from Ray's live-device pass on the build
above.**
1. **The `"Mintage "` label prefix is gone** — the slot's mintage line now
   shows just the value (`formatAlbumMintage(mintage)` alone), e.g.
   `"175.1 Million"` / `"500,000"` / `"Included"`, no header word. Matches
   a real folder, which just prints the number under the date with nothing
   labeling it.
2. **Render order swapped: variety now renders ABOVE mintage**, not below —
   `renderSlotCell()`'s markup now emits `varietyLine` before `mintageLine`
   (was the reverse). Both `.slot-variety`/`.slot-mintage`'s own small
   negative `margin-top` offsets are generic (pull toward whichever element
   immediately precedes them), so the swap needed no CSS change — confirmed
   via screenshot, no overlap or visual regression at either order.

Both are display-only, markup-position/text changes — `slotMintage()`/
`formatAlbumMintage()`'s own logic (Million-rounding, the "Included"
rule) is completely unchanged. `verify_albums_variety_mintage.js`'s
`B1`/`B2`/`C1` assertions and `verify_albums_live_data.js`'s `G3` were
updated to the new label-less strings, following the real design change
rather than weakened.


### Browse detail stepping: an Album-opened coin steps through its own slot order (BUILT and merged to main)
The prev/next arrows' list-capture mechanism (`setBrowseStepContext()`, see
"Prev/next stepping at the detail level" above) had exactly three callers —
`renderBrowseGrid()`, `renderSetsGrid()`, `renderRollsGrid()` — so a coin
opened from an Album's filled slot never called it, and fell through to
`browseStepListFallback()`'s plain CollectionID sort instead. Stepping
through an album this way had no relationship to how the coins are actually
laid out on the page the user tapped in from.

- **Fix: the album slot-cell click handler now calls
  `setBrowseStepContext()`** with the album's own FILLED slots, in their
  existing slot order — `album.slots.filter(s => s.filledBy).map(s =>
  activeCoins().find(c => c.id === s.filledBy)).filter(Boolean)` — not the
  whole album including open/unfilled slots, which have no coin to step to.
  An open slot sitting between two filled ones is simply skipped rather than
  breaking the chain, since it's filtered out before the id list is ever
  built.
- **A real ordering bug found while testing this, not assumed correct on
  first write**: the obvious placement — calling `setBrowseStepContext()`
  BEFORE `navigate("browse")` — silently did nothing, because `navigate()`'s
  own `"browse"` branch renders the Catalog grid internally
  (`showBrowseTab("coins")` → `renderBrowseGrid()`), which calls
  `setBrowseStepContext()` itself with the full catalog and overwrote the
  album-scoped context before `showBrowseDetail(coin)` ever ran. Caught
  directly by a failing test, not by inspection. Fixed by moving the call to
  AFTER `navigate("browse")` and before `showBrowseDetail(coin)` — the same
  ordering every other in-app navigation that also needs step context after
  entering Browse would need to follow.
- **No change to the stepping mechanism itself** — `browseStepList()`,
  `browseStepNeighbour()`, `updateBrowseStepButtons()` are all untouched.
  This is purely a new SOURCE of the ordered id list, confirmed by the same
  existing "not in the list → no arrows" / "at either end → that arrow
  hides" behaviors holding unchanged for this new context.

**Verified headless — 5 new assertions added to
`tests/verify_phase2_and_retest_batch.js`** (R8–R12, plus a negative
control; 78 assertions in that suite now, 1441 across all 33 suites, zero
failures), using a synthetic live album (`buildLiveAlbums()`) with its
filled slots deliberately OUT of CollectionID order (AY-00003, AY-00001,
AY-00002) and one open/unfilled slot sitting between the first two filled
ones, so the test can tell "real slot order" apart from "coincidentally
already sorted": tapping the album's first filled slot opens its own coin
with Previous hidden; Next steps AY-00003 → AY-00001 → AY-00002 (not
CollectionID order, which would go AY-00003 → AY-00004) with the open slot
skipped rather than breaking the chain; Next hides at the album's last
filled slot; and Previous steps back through the same order. **Verified
negative control**: with no step context set at all (simulating the
pre-fix handler), Next from AY-00003 falls through to plain CollectionID
order (AY-00004) — confirming the positive assertions depend on the real
fix, not a coincidence of the demo data's own ordering.
- **Not verified: any real device.**


