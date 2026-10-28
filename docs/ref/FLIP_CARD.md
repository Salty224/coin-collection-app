# Reference: FLIP_CARD (moved out of CLAUDE.md)

Read this file when: touching flip-card or mini-card corner labels, corner fitting, composition or variety text, SMS, or the reverse face.
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

## Coin detail, Finish and flip-card text (04 Oct 2026)
Built on `claude/coin-detail-real-data-finish`, live-tested by Ray on the branch
build, fast-forwarded to `main` on his go-ahead.

- **No demo data on real coins in a live session.** When `liveDataMode()` is
  `"live"`, real coins never show `FAKE_*` data (coin details, galleries, Set
  facts/children, Set links, specs, the combined-photo badge), and
  `activeCoins()`/`activeDbSets()`/`activeDbCoins()` are empty until real data
  loads. The offline mockup keeps all demo data. `activeLookupGraders()` keeps
  its demo copy by design (a copy of a real reference table; the
  cert-protection guard needs it).
- **Finish on Browse detail.** A line under the page title showing only the
  value (no label), in the title's serif font at 20px/600, its left edge
  aligned to the title TEXT (indented past the prev arrow when it shows;
  `syncDetailFinishIndent()`). Beside the flip card at 600px and wider, in flow
  under the title on a phone. Business Strike, Uncirculated and blank show
  nothing there (`DEFAULT_FINISHES_HIDDEN_ON_PAGE`). The Overview row (after
  Variety, before Grade) always shows Finish when present, defaults included.
- **Flip-card text is display-only.** On the flip card only (Browse detail,
  Spotlight, Catalog mini card, front and back; Add Coin's preview uses the same
  helpers):
  - `FLIP_TEXT_ABBREVIATIONS`: Anniversary -> Ann.; U.S./US/United States
    Marine Corps and U.S./US Marines -> USMC. Whole word, case-insensitive,
    applied inside `renderFittedCornerLines()`.
  - `dropTrailingDenomToken()`: a description whose last word equals the
    card's denomination line drops that word ("... Proof Silver $1" over "$1").
  - Grade and Designation are joined with one space ("VG-8 BN";
    `gradeDesignationCornerText()`).
  - `clampFlipCorners()` is the overflow safety net: after a card renders, any
    corner past the card edge, overflowing its box, on the coin, or touching
    another corner is re-fitted at a floor (never under 9px), wrapped, then
    word-truncated with an ellipsis. Corners that already fit are untouched.
  - `cornerClearsDisc()` measures against the coin's target size (its inline
    width), since `.coin-disc` animates when the denomination changes.
  - Stored data and every non-flip surface (title, Overview, Catalog text,
    Albums, Edit, search, the flip card's screen-reader summary) keep the full
    text. Add Coin's preview draws no Description (its top-right is the
    denomination only) and does not treat its photo circle as a disc to clear.
- **Photo viewer overlay** scrolls, and closes with Escape or a backdrop tap.
  This fixes the stuck-viewer backlog item in the section above.
- **Known, not fixed:** Edit Set fills Seller, Purchase Date and Shipping only
  from the details lookup, not from the Set's own row, so a real Set's real
  values don't show there.


### Coin-flip corner labels (locked in)
Text overlays in the open corner space around a coin's circular photo/disc,
styled like a collector's handwriting on a 2x2 flip (Caveat font, straight
horizontal — no rotation) — so the digital record and the physical flip carry
the same info in the same positions. This applies in two places, both using
the same corner mapping:
- **Add Coin (live entry)** *(removed 23 Oct 2026, commit 6 `c6f0ba0`; only
  saved-coin views have corner labels now)*: labels update live as the top-level fields are
  filled in. The underlying form fields stay the actual source of truth —
  this overlay never replaces them.
- **Saved-coin views (Dashboard Spotlight, Browse detail)**: once a coin is
  saved, its info is presented ON the photo as corner labels **instead of** a
  text block underneath — the photo is the display. A screen-reader-only
  summary (`.sr-only`, visually hidden) carries the same info as plain text
  so it isn't lost for accessibility; the visible corner spans are
  `aria-hidden`. **Superseded:** Browse's grid used to fall back to plain
  disc+text (labels "wouldn't be legible at that size") — it now gets the
  same flip-frame corner-label treatment too, at a smaller scale
  (`.flip-frame-mini`, 11px labels); see "Browse: Grid/List toggle" below for
  what that changed.
- **The flip-frame is capped at a fixed max size (280px square)**, not
  stretched to the container width, so the coin stays proportional to an
  actual 2x2 flip (coin centered, real margin around it) instead of looking
  tiny in an overly wide box on desktop. **The coin disc itself is sized to
  fill that flip proportionally to a real coin's share of a 2x2 flip** — a
  dollar (the largest denomination) fills ~75% of the frame width, scaling
  down by `DENOM_SCALE` for smaller denominations, floored at 70% for
  legibility as before. This applies everywhere the flip-frame is used
  (Spotlight, Browse detail, Add Coin's obverse/reverse frames) — base disc
  size is 210px within the 280px frame, up from an earlier, visually
  undersized 150px (120px on Spotlight, which was also inconsistent with the
  other two).
- **No "From the cabinet" eyebrow above the Spotlight flip-frame** — removed;
  it added a label above the coin that wasn't part of the flip-frame
  metaphor itself and wasn't needed.
- **Corner-label font bumped 20px → 25px** (too small to read on phone) and
  **max-width loosened 42% → 47%** of the frame (more crowding headroom before
  the shortening fallback needs to kick in at all) — both per Ray's real-device
  report. **`text-size-adjust: 100%` (with `-webkit-` prefix) is set globally
  on `html, body`** — mobile browsers (Samsung Internet included) can silently
  auto-boost rendered text size on narrow viewports past its declared
  font-size, which is exactly why corner-label truncation only ever showed up
  phone-side and never reproduced in desktop-engine viewport-width testing
  here; this locks rendered size to what's actually declared, everywhere.
- **Follow-up: slight right-side clipping on every corner (locked in)** — a
  second real-device report, after the fixes above, of text looking
  "slightly clipped" on the right edge in all four corners, including short
  single-line text (`1916-D`, `VG-8`) nowhere near `max-width`. Since
  `scrollWidth === clientWidth` in every reproduction attempt here (the
  shortening fallback never even triggers), this isn't genuine text overflow
  — the working theory is Caveat's cursive/italic glyphs (a trailing "y"
  swash, etc.) rendering ink slightly past their own measured advance width,
  or sub-pixel DPR rounding, either of which a flush `overflow: hidden` box
  clips immediately. Not reproducible in this environment's desktop
  Chromium — `.flip-label` carries `padding: 0 4px` as a safety buffer
  between text and the actual clip edge, without moving the label's anchored
  position (`top`/`left`/`right`/`bottom` are unchanged).
  **Second follow-up: left corners (TL/BL) confirmed fixed by the padding
  above; right corners (TR/BR) were still clipping.** Whatever's overshooting
  the box edge is evidently worse on the right-anchored/right-aligned side —
  `.flip-label.tr`/`.flip-label.br`'s `right` offset was pushed from `10px`
  to `18px` (on top of the existing padding) to give noticeably more
  clearance there specifically, rather than just adding more padding
  uniformly.
  **Third follow-up, resolved differently: still clipping on the right after
  both the padding and the extra offset.** Two rounds of "give it more room"
  didn't fix a problem that clearly isn't about room, so the padding/offset
  approach is abandoned — `.flip-label` and `.corner-line` had `overflow:
  hidden`/`text-overflow: ellipsis` removed entirely (back to the original
  `10px`/`10px` anchor offsets, no padding). The JS-side shortening
  (`renderTypeDenomCorner`, measured via `scrollWidth`/`clientWidth`, which
  doesn't depend on `overflow: hidden`) is what actually prevents unbounded
  overflow for the one field prone to being long (the series/type name); it's
  unaffected by this change and still verified working. Without a hard clip
  edge, any small real-device rendering overshoot now spills a few px into
  the surrounding empty corner space instead of visibly cutting off a
  character. Still not reproducible in this environment — confirm on-device
  before considering this fully closed. If it recurs, the next step is
  likely trying a different font for the corner labels rather than further
  box-model tuning, since two rounds of spacing fixes didn't hold.
- **Obverse is identification only — standard numismatic shorthand**:
  top-left Year+MintMark (`1945-S`); top-right **the series/type name and the
  coded denomination as two stacked, right-justified lines** (`Mercury` over
  `10C`, `Peace` over `$1`, `Franklin` over `50C`) — not one run-on line, and
  not the full spelled-out denomination. The series name is derived from
  `coin.name` by stripping a known denomination-word suffix (`seriesLabel()`
  — e.g. "Mercury Dime" → "Mercury", "Franklin Half Dollar" → "Franklin");
  bottom-left Grade+GradeSource (`MS-67 PCGS`); bottom-right Variety+
  Designation, **also as two stacked lines** rather than a comma-joined
  single line (`Micro S` over `FB`).
  **Reversed: Coins-tab grid-mini cards previously dropped the series/type
  name (denomination code only), since it didn't fit legibly at that much
  smaller scale and was truncating hard.** Restored, per Ray's explicit
  request, using the exact same `renderTypeDenomCorner()` the full flip-frame
  already uses (not a separate mini-scale implementation) — its last-word
  shortening fallback (e.g. "Walking Liberty" → "Liberty" when the full name
  doesn't fit) is what actually fixes the original truncation problem, so the
  restoration doesn't reintroduce it. Verified in a real browser across
  several coins, including one that needed the shortening fallback. Rolls
  (no longer rendered as `.coin-card` at all, see "Rolls tab" below) and Set
  children's mini-flips (`renderSetChildFlips()` *(removed)*) are unaffected — this only
  touches the Coins tab's own grid cards (`renderBrowseGrid()`).
- **Two-line corner stacking is a general mechanism (`renderCornerLines()`),
  not a one-off for Type/Denom** — any corner combining two related values
  uses it, so the same crowding fix applies to Variety/Designation without a
  separate implementation. **The type/series line additionally shortens to
  its last word if the full name still doesn't fit even on its own line**
  (e.g. "Lincoln Memorial" → "Memorial") — measured against the actual
  rendered box (`scrollWidth` vs. `clientWidth`), not guessed from character
  count, so it only kicks in when genuinely needed. This measurement
  requires the element to already be visible/laid out — call sites that
  toggle visibility must do so *before* populating corner text, not after.
- **Reverse (Add Coin only — saved coins don't yet track Error/Price
  separately from the obverse display)**: only two conditional items —
  top-left Error, if set; bottom-right Purchase Price, if set (`$45.00`).
  Denomination/Grade shorthand are real ANA/Red Book conventions; this
  front/back split itself is **not** an official numismatic standard (none
  exists) — it's Ray's own preference, matching the price-sticker placement
  he sees at his local coin shop.


### Saved-coin flip corners: Variety + Designation added (BUILT and merged to main)
**Merge status correction:** every section below through "Browse Edit save
toast: field count excludes admin-only columns" plus the header-row/Medal
follow-up (5 sections total) previously read "held on branch
`claude/browse-detail-flip-card-updates`, NOT merged" — that reflected the
plan, not the outcome. Ray reviewed all of it live on `stage.html` across
two rounds of testing and gave explicit merge go-ahead; the branch was
merged to `main` (commit `8b1c48d`). **`main` is now the source of truth
for this whole feature**, same standing as every other merged-after-holding
branch in this file. `stage.html` was restored to the real "Add New Coin"
staging form immediately after (commit `1aab7d1`) — the temporary app.html
swap used for live testing is gone; it was never a permanent part of this
feature, just the testing mechanism.

`applyFlipCorners()` (Spotlight + Browse detail's shared saved-coin renderer
— **not** Add Coin's live-entry corners, a separate function/mapping, see
below) gained two fields it never showed before, both via the existing
`coin` object with no new data plumbing:
- **Top-left (Year+MintMark) gained Variety as a second stacked line**,
  using the same `renderCornerLines()`/`.corner-line` mechanism the
  top-right (Type/Denom) corner already uses — omitted entirely when blank,
  same rule every corner value here already follows. Verified for a Roll
  too (including the mixed-date `"Various"` roll) — a Roll's `coin.variety`
  is usually blank and correctly renders as a single line; a populated one
  renders as a second line with no special-casing needed.
- **Bottom-left (Grade) gained Designation, concatenated with NO space**
  (`MS-67FB`, not `MS-67 FB`) — deliberately a different join style from
  Add Coin's own live-entry bottom-right corner (`flipObverseBR`), which
  stacks Variety/Designation as two separate lines. That's a different
  corner with a different pairing rule; it was only ever a reference for
  "check blank before joining," not for its stacking mechanism. Designation
  blank → Grade alone, no trailing artifact; Grade blank + a (rare)
  standalone Designation → Designation alone.
- **This intentionally diverges saved-coin corners from Add Coin's
  live-entry corner mapping described above** (Add Coin: Variety+
  Designation both live in the bottom-right corner, stacked). Worth knowing
  for a future session: the two flip-corner systems are NOT mirrors of each
  other field-for-field — Add Coin's live preview and the saved-coin display
  (Spotlight/Browse detail) have always been separate functions with
  separate corner assignments, and this change widens that gap rather than
  narrowing it. Deliberate, not an oversight — Ray's spec named the exact
  corners and join style for the saved-coin case.


### Coin-flip interaction redesign (locked in)
Replaces the single flip-icon pattern above everywhere it existed, with
three different treatments depending on where a coin renders — a small
icon made sense as one generic mechanism, but reading real usage patterns
per view (an unattended auto-rotating card, a dense grid of many cards, one
focused detail card) called for three different interactions instead of one
compromise. `attachFlipToggle()` had exactly three callers before this
(Browse grid cards, Browse detail's single flip, Set child mini-flips) —
all three are gone; a new shared `wireSideToggle()` helper replaces two of
them (see below).
- **Dashboard Spotlight**: no manual flip control at all anymore. Auto-cycle
  only — obverse → pause → reverse → pause → advance to the next coin,
  paced by `SPOTLIGHT_DWELL_MS` (13000ms, ~2x the original hardcoded
  6500ms; a named, tunable constant since the exact pacing is meant to be
  tuned after seeing it live, not guessed here). **Swipe left/right on the
  card manually advances to the next/previous coin** — same touchstart/
  touchend + 50px-threshold convention the Album page-flip book already
  uses — resetting the new coin to its own obverse and restarting the
  auto-advance timer from zero (fast-forwards to a fresh cycle rather than
  fighting the auto-play). **Tap-to-navigate into Browse detail is
  unchanged** and coexists with swipe via a `spotlightSwiped` guard flag: a
  real swipe sets it briefly so the `click` event most touch browsers still
  dispatch after a drag-like touch sequence doesn't also open the coin's
  detail view for that same gesture.
- **Catalog (Coins/Medal tab)**: cards show one side only, no per-card flip
  — a single global **Obverse/Reverse toggle** (`catalogSide`, two
  `.filter-chip` buttons in the toolbar, `#browseSideToggle`) flips every
  visible card at once, applied in `renderBrowseGrid()`. **Hidden on the
  Rolls and Sets tabs** — checked against the actual code before building
  this: neither tab renders any coin-disc/flip surface today (Rolls and
  Sets both render plain icon+text list rows, `renderRollsGrid`/
  `renderSetsGrid`), so the toggle would be inert there. This mirrors the
  Grid/List view toggle's own existing precedent, which already hides
  itself on those same two tabs for the identical reason (confirmed with
  Ray before building, not assumed). **Resets to Obverse on external
  Catalog entry** (`resetBrowseFilters()`), same "not persisted across
  navigation" rule every other Catalog filter already follows — switching
  between Coins/Rolls/Sets tabs internally does NOT reset it (also
  consistent with every other Catalog filter).
- **Individual coin/roll/childless-Set detail view** (`showBrowseDetail()`'s
  single-flip branch): the entire flip-frame is the trigger, no icon.
  Exactly one gesture is bound per device, decided once at startup via
  `IS_COARSE_POINTER` (`matchMedia("(pointer: coarse)")`, same "check once,
  device capability doesn't change mid-session" posture
  `prefers-reduced-motion` already uses elsewhere in this file) —
  deliberately either/or, not both at once, since binding both risks a real
  device firing a touch-derived `click` AND a separate touch handler for
  one interaction. **Coarse (touch)**: a single `touchend` handler covers
  BOTH tap and swipe as the same action (flip) — no distance threshold
  needed since they're not distinguished here, unlike Spotlight. A
  mostly-vertical drag (`|deltaY| > 20 && |deltaY| > |deltaX|`) is treated
  as an attempted page scroll through the card and does NOT flip — a
  defensive addition beyond the literal spec, to stop an incidental
  vertical scroll gesture that happens to start on the card from misfiring
  a flip. **Fine (mouse/trackpad)**: a plain `click` flips it. Resets to
  Obverse every time `showBrowseDetail()` renders this branch, so opening
  any detail view always starts on the front.
- **A multi-child Set's own detail view** (the OTHER `showBrowseDetail()`
  branch, when `setChildrenFor(coin).length > 0`): resolves a real
  ambiguity flagged before building — this view's child mini-flip cards are
  simultaneously "a detail view" (item 3's territory) and "a grid of cards
  that each navigate elsewhere on tap" (item 2's territory), and item 3's
  literal whole-card-flips-on-tap rule would have broken the existing
  tap-to-open-a-child's-own-detail-view navigation. **Resolved (Ray's
  call): no per-card flip capability at all — instead a global Obverse/
  Reverse toggle** (`setChildrenSide`, `#browseDetailChildSideToggle`, same
  `wireSideToggle()` mechanism as Catalog's) that flips every child
  mini-card in that Set together, at once. Tapping a child card still
  navigates to that child's own full detail view, completely unchanged.
  Also resets to Obverse every time this branch renders.
- **`wireSideToggle(obvBtnId, revBtnId, setSide, onChange)`** is the one
  shared mechanism behind BOTH global toggles above (Catalog's and the
  Set-children view's) — wired once per pair of buttons, returns an
  `activate(side)` function so the caller can also sync the chip UI when
  the state is reset from elsewhere (external Catalog entry; a fresh
  `showBrowseDetail()` render). Reuses `.filter-chip`/`.filter-chip.active`
  styling directly rather than inventing a new button style, for visual
  consistency with the Year/Commemorative chips already in the same
  Catalog toolbar.
- **Deliberately NOT added to individual Album slot cells** — unchanged
  from the prior design: Albums already has its own, different mechanism
  for viewing a coin's reverse (the page-flip book turns to a dedicated
  Reverse page for the whole slot group — see "Albums: page-flip book"
  below); a filled slot's own coin is still reachable there (tap it → its
  Browse detail view), which now uses the new whole-card gesture like any
  other coin's detail view.
- Verified headless (Playwright, touch and mouse device contexts): no
  `.flip-toggle-btn`/icon renders anywhere; Spotlight's swipe advances the
  index and resets to obverse, and a swipe correctly suppresses the
  following click-to-navigate while a plain tap still navigates; the
  Catalog toggle flips all visible cards, is hidden on Rolls/Sets and
  visible again on Coins, persists across an internal tab switch, and
  resets on external re-entry; the single-detail flip-frame responds to tap
  AND swipe on a coarse-pointer context and to click on a fine-pointer
  context, a vertical drag does NOT flip, and it resets to obverse on
  re-entry; the Set-children toggle flips every child card together with no
  per-card icon, and tapping a child card still navigates to its own detail
  view. Full nav smoke-check (Docket/Catalog/Albums/Sets/Dashboard) confirms
  nothing else regressed.


### TR corner (type/series name): graceful degradation, not destructive truncation (BUILT and merged to main)
Real bug: `renderTypeDenomCorner()`'s overflow fallback used to shorten an
overlong type name to its LAST WORD when it didn't fit on one line —
reasonable when Description values were short place/series names, but wrong
for a real per-design identity with fixed suffix text attached. Worst case,
confirmed real data: **"Martha Washington First Spouse Gold $10"** doesn't
end in any `DENOM_NAME_SUFFIXES` word (`"$10"` isn't one), so nothing
strips, it overflows, and the old fallback reduced it to literally `"$10"`
— total loss of which spouse the coin actually is.

- **Fix is a genuine two-tier fallback, shrink first, wrap only as the last
  resort — measured into that order, not guessed.** `renderTypeDenomCorner()`
  now: (1) runs the type+denom pair through `shrinkCornerToFit()` — the same
  collision-based per-instance mechanism Composition's BR corner already
  uses (see above), generalized out of `setCompositionCornerText()` into a
  shared helper (`CORNER_SHRINK_STEPS = [1, 0.82, 0.67]`); (2) only if the
  type line STILL overflows at the smallest shrink step does it fall to a
  new `wrapTextToTwoLines(text, measureEl)` — a real, measured greedy word
  wrap (grows line 1 word-by-word against `scrollWidth`/`clientWidth`, never
  splits a single word, never guesses from a character count) — producing a
  genuine 3-line corner (two type lines + the denom code) via the existing
  `renderCornerLines()`/`.corner-line` stacking mechanism TL already uses.
- **The order was arrived at by measurement, not assumption, after the
  first version got it backwards.** A first pass tried wrap-before-shrink
  (attempt the two-line wrap at full size, shrink only if that still didn't
  fit) — direct geometry measurement caught that this made the ORIGINAL
  motivating case ("Lincoln Memorial", which a small shrink alone fully
  resolves) grow to 3 unshrunk lines instead of shrinking to 2, measured
  28px TALLER for no reason — unnecessary vertical creep toward the coin
  disc, exactly the risk this corner system has fought before (see the
  "Coin-flip corner labels" clipping history above). Rebuilt shrink-first;
  re-measured to confirm "Lincoln Memorial" now resolves via the 82% shrink
  step alone, 2 lines, height at or below the untouched baseline.
- **Real-data verification, both named worst cases:**
  "Martha Washington First Spouse Gold $10" (no suffix strips, 401px
  unclamped against a 139px box) now wraps to `["Martha Washington", "First
  Spouse Gold $10"]` + the `"$10"` denom line, shrunk to the smallest step,
  full identity intact, fits with no overflow. "Washington Crossing the
  Delaware Quarter" (suffix `"Quarter"` correctly stripped by
  `seriesLabel()`, but the remaining "Washington Crossing the Delaware"
  still overflows on its own, 326px) wraps identically rather than
  collapsing to one trailing word. Both landed at the same 3-line, same
  shrink-step outcome — confirmed via screenshot, not just measurement, on
  the real flip-card UI (1889-CC obverse, "Martha Washington" / "First
  Spouse Gold $10" / "$10" all fully legible, no truncation, no clipping).
- **Denom rides along on whatever line count results** — it never wraps or
  shrinks independently of the type line(s) it's stacked with, same rule
  the original design already followed.
- **Every stale code comment referencing the old last-word mechanism was
  found and corrected** (`grep`'d, not left to drift) — the Catalog
  grid-mini `.flip-label` CSS comment (×2 locations), the historical
  "Medal" `DENOM_NAME_SUFFIXES` note, the Rolls corner-treatment comment
  (its underlying reasoning for excluding Rolls still holds independently
  of the old garbling behavior it originally cited), and
  `renderBrowseGrid()`'s own comment.
- Verified headless — 8 new assertions added to `tests/verify_composition.js`
  (block Q, 96 assertions in that suite now; 496 across all 13 suites, zero
  failures): the First Spouse case (full identity preserved across 3 wrapped
  lines, never truncated to `"$10"`, fits); the ATB/quarter case (suffix
  correctly stripped, remainder wraps rather than truncating to one word,
  fits); a regression guard confirming "Lincoln Memorial" still resolves via
  shrink ALONE (2 lines, not 3, no taller than the untouched baseline); and
  the untouched-baseline case ("Morgan Dollar" → `seriesLabel()` strips
  "Dollar" to "Morgan", always fit, stays at natural 27px, no shrink, no
  wrap). **Verified negative control**: temporarily reintroduced the exact
  old last-word-truncation behavior and confirmed all 4 new assertions fail
  with the exact reported symptom (`["$10","$10"]` for First Spouse), then
  restored the real fix and re-confirmed all pass — proves the new coverage
  actually catches this class of regression, not just documents intent.
- **Not verified: any real device.** Screenshots reviewed in this
  environment's headless Chromium only, same standing caveat as every round
  on this branch.


### Reverse face gets real content; Sets lose the flip card entirely (BUILT and merged to main)
Two related fixes to the saved-coin flip card (Spotlight + Browse detail,
`applyFlipCorners()`), following the Option 3 design exploration above.

**1. Reverse face now has its own distinct corners.** Real bug, confirmed
by reading the code before fixing it: `applyFlipCorners()` wrote the same
TL/TR/BL/BR regardless of which face was showing, and — worse, found while
tracing the render path — Browse detail's own flip toggle
(`toggleBrowseDetailSide()`) never even re-invoked it at all, only the disc
image/gradient. Spotlight already re-called `applyFlipCorners()` every
auto-cycle, so it genuinely showed identical corners both faces, as
originally reported; Browse detail was actually worse — frozen on whichever
corners were set at open, forever, regardless of flips.
- **`applyFlipCorners(prefix, coin, side)` now takes a side** (defaults to
  `"obverse"`); `side === "reverse"` branches to a completely separate
  function, `applyReverseFlipCorners()`, before any obverse-only rendering
  runs. Both real callers now pass their own current side
  (`renderSpotlight()` → `spotlightSide`; `showBrowseDetail()`'s initial
  call → the freshly-reset `"obverse"`), and `toggleBrowseDetailSide()` now
  ALSO calls `applyFlipCorners()` after flipping — the fix for the real
  mechanical bug above, not just new content.
- **No obverse identity content is repeated on reverse** (confirmed,
  overturning this session's own earlier exploration-round proposal, which
  had kept Year-Mint at TL as an "orientation anchor"): the coin's own name
  is already the page's own title above the flip card, same reasoning
  Rolls' own TR-corner exception already relies on.
- **Final reverse corner map**: TL = the Obverse-side half of a parsed
  Error split, or the WHOLE Error string when it doesn't parse cleanly —
  blank if `coin.error` is blank. TR = unused, always. BL = the
  Reverse-side half of a split — blank when TL already carries the whole
  unparsed string, blank when there's no error at all. BR = Cost, stacked
  "Cost" / "$N" (same two-line `renderCornerLines()` stacking Composition's
  own BR corner already uses) — blank when `coin.cost` is falsy. **Value is
  deliberately NOT shown** — it's already always-visible in Browse detail's
  Overview accordion (open by default); Cost has no other visible home on a
  saved coin's screen until Purchase Details is expanded, so the flip card
  is the more useful place for it. **A coin with neither Cost nor Error
  renders a completely blank reverse — confirmed intentional, not a bug to
  guard against.**
- **`splitErrorBySide(text)`** — the informal "Obv. X, Rev. Y" dealer
  convention (there's no official industry standard for two different
  errors on two different sides: PCGS/NGC's own DDO/DDR-style codes already
  bake the side into the single-error case, but nothing covers this one).
  Forgiving on wording (`Obv`/`Obverse`/`Obv.`, optional colon) and
  separator (comma or semicolon); Obv-before-Rev order only (confirmed —
  no Rev-first branch). Requires BOTH halves present; anything else — a
  single unprefixed error, a bare abbreviation like DDO/DDR, only one side
  prefixed, genuinely unstructured text — returns `null` so the caller
  falls back to showing the whole string, unmangled, never guessing.
  **Each captured half keeps its own "Obv."/"Rev." prefix verbatim, not
  stripped** — a real design correction made while building, not part of
  the original mockup: TL and BL are stacked on the same (left) edge now,
  not the top-row left/right pairing the exploration-round screenshots
  used, so there's no positional cue left saying which corner is which
  side. The prefix itself is what still says so at a glance.
- **`renderErrorCornerText(el, text, allowWide)`** — the same "shrink first,
  wrap only as a last resort" graceful degradation `renderTypeDenomCorner()`
  established for TR, reused rather than reinvented. `allowWide` (TL on the
  reverse face only) toggles a new scoped `.corner-wide` CSS class
  (`max-width: 90%`, up from the standard 50%) — TL is allowed to use TR's
  own horizontal territory before ever shrinking, since TR carries nothing
  on this face; every other corner stays at the standard width. **Real,
  measured finding from the exploration round carried through into the
  build**: even the "clean split" example (`"Obv. Die Polish Lines"` alone)
  measured 192px against the old 139px (50%) box — already overflowing
  before any of this — confirming the wide treatment isn't optional
  polish, it's required for realistic Error text at any box width.
- **Real bug caught by the committed suite itself, not by inspection**: TL
  is a persistent DOM element shared between the reverse render (which can
  add `.corner-wide`) and the obverse render (which never did anything
  about that class) — flipping reverse → obverse left the obverse's own TL
  silently widened, a leak from one face's render into the other's. Fixed
  by having the obverse path explicitly `classList.remove("corner-wide")`
  on TL before rendering, unconditionally, regardless of whether it was
  already narrow. This is exactly the kind of bug this project's own
  "write real assertions, not just documentation of intent" discipline
  exists to catch — found because a genuine before/after/before flip
  sequence was asserted, not just a single-direction render.
- **The sr-only summary is face-aware too** — reverse gets its own text
  (the Error split/fallback plus Cost, tagged "reverse" at the end) instead
  of the obverse's grade/composition/value summary, so a screen reader
  isn't left with stale obverse-face text once the visible corners have
  changed.
- **`coin.error` is new plumbing** — `mapWorkbookRowToCoin()` now reads
  `All.Error` (it never did before this), and two `FAKE_COINS` rows were
  seeded for exercisability: AY-00001 (`"Obv. Die Polish Lines, Rev. Die
  Crack"`, the clean-split case) and AY-00003 (`"Off-Center Strike, approx.
  5%"`, the unparseable-fallback case). Every other row stays sparse/blank,
  same convention as every other optional field in this mockup.
- **Correction to this session's own exploration-round speculation**: that
  round guessed closing this would also close ParkingLot Row 6 (BL's own
  lack of overflow protection) "as a byproduct." **That was wrong, and is
  corrected here rather than silently carried forward.** Row 6 is
  specifically about the OBVERSE's BL corner (Grade+Designation), which
  this task never touches — obverse corners are completely unchanged.
  BL/TL on the REVERSE face do get real shrink/wrap protection now, but
  that's the same DOM element at a DIFFERENT time showing DIFFERENT
  content; it does nothing for the obverse's own Grade+Designation
  overflow risk. **Row 6 remains open, unaffected by this pass.**

**2. A Set's own detail view is a plain static image — no flip card at
all.** `showBrowseDetail()` now branches on `isSetRow(coin)` before doing
any flip-related work:
- **Reuses the SAME `#browseDetailFlipFrame`/`#browseDetailDisc` elements**
  rather than building a parallel element — sizing and the existing
  own-photo/reference-image/placeholder priority chain in
  `applyDiscContent()` stay byte-identical to every other coin, since
  `browseDetailSide` is simply fixed at `"obverse"` and never toggled for a
  Set. This already resolves correctly to the Set's own real whole-set/OGP
  photo when one exists (`setFlipPhotoUrl()`, built in an earlier pass), or
  the existing generic placeholder when it doesn't — no new photo logic
  needed.
- **All four corner spans are explicitly cleared** (`classList.remove
  ("corner-wide")` + blanked, matching the same defensive pattern the
  reverse-face helpers use) rather than relying on `applyFlipCorners()`
  simply not being called — a persistent-element leak guard, same class of
  bug the `.corner-wide` fix above just caught. The sr-only span is
  cleared too, and the combined-photo badge is defensively hidden (a Set's
  `id` is never realistically in `COMBINED_PHOTO_COIN_IDS`, but this stays
  correct regardless of a stale prior render).
- **No tap/swipe/click response** — `toggleBrowseDetailSide()` now
  early-returns when `!currentBrowseCoin || isSetRow(currentBrowseCoin)`,
  so the frame's already-wired click/touch listeners genuinely do nothing
  for a Set (verified via a real dispatched click event, not just by
  calling the toggle function directly).
- **Both childless and multi-child Sets are in scope, confirmed
  identical** — verified against AY-00018 (childless) and AY-00022 (3 real
  children).
- **Individual coins are completely untouched**, including a Set's own
  children reached via the "Coins in this Set" accordion — `setChildrenFor()`
  returns ordinary coin-shaped rows (a real `denom`, never `"Multiple"`),
  so `isSetRow()` is false for every child and the normal flip path applies
  unchanged. Verified directly, not just asserted by construction.
- **Spotlight was checked, not assumed safe**: `spotlightCoins` is
  hardcoded to `FAKE_COINS.slice(0, 5)` — a fixed array literal, never
  wired to live/filtered data — and none of the first five rows is a Set.
  **Confirmed coins-only by construction, not by convention**; no guard was
  added there, consistent with this project's standing "don't build ahead
  of a scenario that can't currently occur" discipline (same posture as
  the DB_Coins scope rule, ANACS/ICG/CAC research). If `spotlightCoins` is
  ever wired to a live/filtered source that could include a Set, this
  needs revisiting. **That wiring has since happened — see "Live Spotlight
  + a real Specifications source" above.** `spotlightCoinList()` now reads
  `activeCoins()` and filters `isSetRow()` out explicitly, which is the
  revisit this note called for; the guard is real now rather than
  structural.
- **A real side effect, confirmed rather than just claimed**: this
  eliminates the long-name corner-fitting problem for Sets entirely, since
  Set names (often the longest in the catalog) never reach any corner-
  rendering code any more — there's nothing left to fit.

**Verified headless — new committed suite
`tests/verify_reverse_face_and_set_flip.js` (38 assertions), all passing;
561 across all 15 suites, zero failures.** Covers: `splitErrorBySide()` in
isolation (every forgiving wording variant, every case that must return
null including reversed order); obverse corners completely unaffected even
for a coin carrying Error+Cost data; the clean-split reverse render
(prefix kept, TR unused, BR stacked, TL genuinely fits its widened box —
real `scrollWidth`/`clientWidth` measurement, not just "doesn't look
clipped"); the unstructured fallback (whole string in TL, BL blank); Error
with no Cost and Cost with no Error, independently; the fully-blank
reverse case; flipping reverse → obverse → confirming the real leak bug
above, both that obverse content is restored AND `.corner-wide` is
cleared; Spotlight getting the same reverse-specific content Browse detail
does; the sr-only summary differing correctly per face;
`mapWorkbookRowToCoin()` reading the real `Error` column; a childless AND
a multi-child Set both showing zero corner text with the badge/SR
defensively cleared; a real dispatched click on a Set's frame confirmed to
do nothing; an ordinary coin's detail view confirmed unaffected in both
directions; a Set's own children confirmed to never be `isSetRow()`
themselves; and a nav/overflow smoke check. **Verified negative control**:
temporarily removed the TR-clearing line and over-widened the split regex
to accept reversed order — 7 assertions failed with exactly the wrong-
content symptoms, then both were restored and every assertion re-confirmed
passing.
- **Not verified: any real device.** Screenshots reviewed in this
  environment's headless Chromium at both required viewports (a tablet
  geometry spot-check confirmed the same TL fit with zero page overflow) —
  same standing caveat as every round on this branch.


### Catalog grid: Variety + Designation on the mini flip card (BUILT and merged to main)
Resolves ParkingLot Row 2. Confirmed on a real device before building: a
1909 VDB cent and a plain 1909 rendered **identically** in the Catalog grid,
while the same coin's own detail page showed VDB correctly.

**Root cause.** `renderBrowseGrid()` built its TL and BL corners by plain
string interpolation straight into the card's `innerHTML`
(`<span class="flip-label tl">${yearMint}</span>`, BL likewise from
`coin.grade`). Variety and Designation were simply never included. TR and BR
had been migrated to the fitted renderers in earlier rounds
(`renderTypeDenomCorner()`, `setCompositionCornerText()`); TL and BL never
were.

**Why it could not just be string-appended.** A second stacked line grows the
corner's box DOWNWARD into the coin disc's band. That is precisely what
`cornerClearsDisc()` exists to catch and what a box-width check cannot see —
measured earlier at 412px, a two-line TL fits its own box while its bottom
edge sits past the disc's bounding-box top.

**New `setStackedCornerText(el, lines)` *(removed later; see the Catalog grid follow-up)*** — one or two stacked lines through
`shrinkCornerToFit()` + `renderCornerLines()`, the same machinery TR/BR use.
Blank lines are dropped, so no Variety renders a single line and no
Grade/Designation renders nothing at all (not an empty box).
- **TL** = Year-Mint over Variety, matching `applyFlipCorners()`'s own TL.
- **BL** = Grade and Designation concatenated with NO space (`MS-65RD`),
  deliberately the same join style that card uses — not Add Coin's own
  two-line stacking, which is a different corner with a different pairing.
- Both run after `appendChild` and after `sizeCoinElement()`, since the fit
  test measures against real layout and the disc's real size.
- Values go through `escapeHtmlText()`. `applyFlipCorners()` passes its own
  raw; this is the safer default for new code, not a claim the old path is
  wrong.

**A second, deeper bug found while wiring this: the disc-clearance test was a
silent no-op on every Catalog card.** `.flip-frame-mini` is a SEPARATE class,
not a modifier of `.flip-frame`, so `cornerClearsDisc()`'s
`el.closest(".flip-frame")` returned null on a mini card and the whole test
short-circuited to `true`. **TR and BR therefore never had clearance
protection here either — only box-width fitting**, since the round that added
clearance. Selector widened to `.flip-frame, .flip-frame-mini`.
- **Measured impact of switching it on: none for ordinary coins.** Every
  realistic value still renders at the natural 14px — enabling a real
  clearance test did not cause blanket shrinking, which was the risk worth
  checking. Asserted (D2).
- It does now bite where it should: `"Doubled Die Obverse"` shrinks 14px →
  7.84px and clears the disc by 10.5px, with the full variety text preserved
  rather than truncated.

**Known, accepted limit (measured, not assumed).** A very long free-typed
Grade — `"XF Details - Improperly Cleaned"` — reaches the smallest shrink
step (6.72px), clears the disc and stays inside the frame, but still
overflows its own box width. `shrinkCornerToFit()` stops there by design
rather than shrinking indefinitely; same posture as every other
"not worth chasing further" gap in this file. At that size it is small
either way.

**ParkingLot Row 6 is NOT closed by this.** That row is about the FULL flip
card's BL (Grade+Designation), which `applyFlipCorners()` still writes with
plain `textContent` and no fitting. This gives the CATALOG GRID's BL that
protection; the full card is untouched. `setStackedCornerText()` *(removed later)* is now
available if Row 6 is ever picked up, but wiring it into `applyFlipCorners()`
would change the appearance of the main flip card and was not asked for.

**Verified headless — new committed suite
`tests/verify_catalog_grid_corners.js` (34 assertions, both viewports); 901
across 22 suites, zero failures.** No FAKE_COINS row carries a Variety at
all, so the live-data seam (`__setLiveCoinsForTest`) is what exercises the
real render path. Covers: the VDB cent's two-line TL and `MS-65RD` BL; the
two 1909-S cents no longer being indistinguishable (the reported symptom);
single-line TL with no Variety; Grade alone with no Designation; an empty BL
with neither; a long Variety kept in full, shrunk, disc-clear and inside the
frame; and TR unchanged at its natural size.
- **Two negative controls, both confirmed to fail.** Restoring the original
  string-appending TL/BL fails 14 assertions including the
  indistinguishable-cards one. Narrowing the clearance selector back fails C4.
- **C4 exists because a first version of that block passed against the broken
  selector.** Asserting `cornerClearsDisc()` is TRUE proves nothing — the
  no-op returned true as well. The only assertion that discriminates parks a
  corner ON the disc (still fitting its own box) and requires a `false`. Same
  "green suite hiding a real bug" trap this file has recorded twice before;
  assume it applies to any assertion whose broken case also returns the
  passing value.
- **Not verified: any real device.** Screenshots reviewed at both viewports.


### Flip card: TL and BL are fitted (1787 Fugio Cent)
Real-device report: on the Fugio's detail card the TL Variety text crossed
straight through the TR corner. `applyFlipCorners()` wrote TL with a raw
`renderCornerLines()` — **no fitting at all** — so "Newman 15-H, Pointed Rays,
4 Cinq., R-4" rendered as one nowrap line **390px of ink inside a 139px box**,
and since `.flip-label` deliberately carries no `overflow: hidden` (see its
CSS comment) the ink spilled across the card.

**Answering the question directly: it is the same gap as ParkingLot Row 6, not
a distinct TL/TR problem, and box-fitting IS sufficient — no mutual collision
check is needed.** Measured, including a deliberate worst case (long Variety
AND a long type name, so both corners are at maximum width): TL/TR ink overlap
is **0px** once both corners fit their own boxes.
- **`renderFittedCornerLines(el, lines, wrapIndex)` extracted.**
  `renderTypeDenomCorner()` and `renderErrorCornerText()` were already the
  same three-pass shape (the latter's comment said so) and TL needed a third,
  so the shape is now in one place and all three delegate to it. `wrapIndex`
  names the one line allowed to wrap; position is tracked by original index,
  not by matching text, so duplicate line strings can't select the wrong one.
- TL passes `[yearMint, variety]` with the Variety as the wrappable line
  (Year-Mint is always short). The Fugio now wraps to three lines at 15.12px,
  full Variety preserved, inside the frame, clear of the disc.
- **ParkingLot Row 6 closed in the same round.** BL was the same defect one
  corner down — measured on the same card: "XF Details - Improperly Cleaned"
  is 295px of ink in a 139px box, running **88.7px into the BR composition
  corner and 26px past the frame's right edge**. Now fitted too. Ordinary
  grades ("MS-64", "MS-65RD") measure unchanged at the natural 27px, so this
  only engages when a value genuinely doesn't fit. **This went beyond the
  literal ask** (which named TL/TR) — flagged rather than assumed, on the
  grounds that it is the identical bug in the identical function with a
  measured collision and a one-line fix.

**Verified headless — new committed suite `tests/verify_retest_round2.js`
(40 assertions, flip-card checks at both viewports); 941 across 23 suites,
zero failures. Six negative controls, each confirmed to fail exactly its own
assertions**: Fix A reverted (A1/A5/A6/A7), Fix B reverted (B1/B2/B4/B5),
the Save-to-Database rule reverted (C2/C3), Edit routing reverted (D1), the
TL fit reverted (E1–E5), the BL fit reverted (E7/E8).
- **E3 initially passed against the broken code and was strengthened.**
  Overlap has to be measured on INK, not on boxes: a `.corner-line` is nowrap
  with `max-width:100%`, so its BOX is clamped to the parent while the text
  spills visibly past it — a box-rect test reports 0 overlap for exactly the
  case being tested. Now computed from `scrollWidth` per line, right-anchored
  corners measured from their right edge. Third time this session a green
  assertion hid a real bug; the test was fixed, not the claim.
- **Not verified: any real device, any real OneDrive session.**


### Catalog grid: the SAME Fugio collision, one card size down (BUILT and merged to main)
The full detail card came back clean on Ray's device after the fix above —
and the **Catalog grid still collided on the same coin**. Root-caused before
touching anything, and the previous round's own "0px worst-case overlap"
measurement is what pointed at it: that was taken at the full card's ~139px
corner box. **The grid's `.flip-label` box is ~34-38px** (frame 120px,
`max-width: 46%`), roughly a quarter of it.

**Root cause: the grid's TL was on a different, weaker renderer.** The grid's
own TR already used `renderTypeDenomCorner()` (shrink + wrap) and the full
card's TL had just been moved onto `renderFittedCornerLines()`. The grid's TL
and BL were still on `setStackedCornerText()` — **shrink only, no wrap**. So
at grid width the Fugio's Variety bottomed out at the smallest shrink step on
ONE unwrapped line: 6.72px, `scrollWidth` 97 against `clientWidth` 55, with
**21px of ink running into the TR corner**. Both grid corners are now on
`renderFittedCornerLines()` and `setStackedCornerText()` is retired — it has
no callers left.

**Answering the question Ray raised directly: box-fitting IS sufficient at
grid width; no mutual TL/TR clearance check is needed.** Measured, not
assumed, including a deliberate worst case (long Variety AND long type name,
so both corners sit at maximum width simultaneously): once each corner fits
its own box, **ink overlap is 0px** — 42px of clearance on the Fugio, 17px on
the worst case, at both viewports. A mutual check would have been real extra
machinery for a collision that stops existing once the fit is honest.

**Comma-segment truncation, grid only.** Wrapping alone still leaves a very
long Variety small: `CORNER_SHRINK_STEPS` bottoms out at 0.48 of natural,
which at the grid's 14px is 6.72px — present but not readable, which is worse
than showing less of it clearly. `renderGridIdentityCorner()` therefore
re-renders with only the Variety's **first comma segment plus an ellipsis**
when the full string lands below `GRID_VARIETY_MIN_FRACTION` (0.67, i.e.
9.38px). Comma segments are how these strings are actually written — the
leading one is the identifying attribution, the rest are qualifiers — so this
reduces along a real boundary rather than clipping mid-phrase.
- Measured: the Fugio goes **6.72px on one clipped line -> 11.48px** showing
  `1787-S` / `Newman` / `15-H…`.
- **Nothing is lost**: the coin's own detail page still shows the complete
  string, asserted.
- **Only fires when it actually helps.** No comma to reduce along (`Doubled
  Die Obverse`) -> full string kept, wrapped, 9.38px. Already legible (`VDB`)
  -> untouched at natural 14px. And if the shortened string lands at the
  *same* size, the full one is kept — more information for the same
  readability.

**Escaping moved into `renderCornerLines()`, and this was a real hazard, not
tidying.** The grid was the one call site that pre-escaped with
`escapeHtmlText()`; every other caller passed raw. Routing the grid's TL
through the wrapping fitter made that unsafe — `wrapTextToTwoLines()` splits
on whitespace, so an already-escaped `&amp;` could be sliced into `&am` +
`p;` across a line break. One escape, applied to the final text inside
`renderCornerLines()`, is both correct and consistent; the grid call site now
passes raw like everything else.

**Verified headless — `tests/verify_catalog_grid_corners.js` grew from 34 to
70 assertions (both viewports); 977 across 23 suites, zero failures.** New
blocks: E measures the Fugio and the worst case **at the grid's real
dimensions**, on INK rather than boxes (`scrollWidth` per line, right-anchored
corners measured from their right edge — a box-rect test reports 0 for exactly
the broken case); F covers the truncation in all four states plus the detail
page keeping the full string; G covers the escaping in both directions.
- **Two verified negative controls.** Reverting the grid TL to the retired
  shrink-only renderer fails 8 assertions per viewport and reproduces the
  reported symptom exactly — `E2: 21px` of ink overlap. Removing the escape
  from `renderCornerLines()` fails G1/G3, with `<Repunched>` silently parsed
  as markup and disappearing.
- **One prior assertion followed the design change, not weakened**: `B1` had
  pinned the long-Variety TL at exactly 2 lines, which was a property of
  shrink-only rendering; it now asserts the full string survives at whatever
  line count the fit lands on. Its `keptFullVariety` check also had to stop
  reading `textContent` — that concatenates `.corner-line` children with no
  separator, so a wrapped "Doubled Die Obverse" reads as "DoubledDie
  Obverse". Lines are joined with a space now.
- **Not verified: any real device.** Screenshots reviewed at both viewports.


### SMS finish indicator on the flip card (BUILT and merged to main)
Surfaces `Finish === "SMS"` (Special Mint Set, 1965-67 issues) as a
trailing **" (SMS)"** flag appended to the existing Grade+Designation
corner (`MS-65 (SMS)`, `MS-67FB (SMS)` when a Designation is present, or
`(SMS)` alone with neither Grade nor Designation set — no leading space).
Scoped to the exact literal Finish value `"SMS"` only — **not** a general
"show any non-default Finish" rule (Proof/Satin Finish/Burnished etc. are
explicitly out of scope). Applies across every denomination that can
appear in an SMS set (cent through half dollar) since it keys purely on
`coin.finish`, with no denomination branch — SMS coins carry no mint mark
despite all being struck at San Francisco, which is part of why SMS
specifically gets this treatment. Placed on the grade corner rather than
the Type/Denom corner because it explains a certification-relevant fact
about the specimen (why it might eventually be graded Specimen rather than
Mint State by a service like PCGS) — it belongs next to the field it's
explaining, same reasoning GradeSource sits next to Grade elsewhere.

**Pre-build investigation (Ray's three questions) found one real gap and
confirmed one real risk was already handled:**
1. **`Finish` was NOT mapped onto a live coin object at all.**
   `mapWorkbookRowToDbCoin()` (the DB_Coins catalog mapper) already read
   `Finish`; the ALL-sheet coin mapper, `mapWorkbookRowToCoin()`, never
   did — same class of gap as Seller_Link/Shipping/PurchaseDate/Remarks/
   ValueSource before those were fixed ("the rows existed; the data never
   reached them"). Added `finish: String(colVal(row, "Finish"))` there.
2. **Grade+Designation is genuinely built on TWO separate render paths**,
   confirmed by reading the code rather than assumed — `applyFlipCorners()`
   (shared by Browse detail + Spotlight, one function) and
   `renderBrowseGrid()`'s own inline Catalog-grid corner build (see
   "Catalog grid: Variety + Designation on the mini flip card" above for
   why that one is a genuinely separate path, not shared code). New
   `gradeDesignationCornerText(coin)` factors the shared text-building rule
   out so the two call sites can't independently drift on this one rule;
   both are wired and independently verified, not assumed from one passing.
3. **Overflow/collision risk was tested directly, not assumed away.** The
   existing fitted-corner pipeline (`renderFittedCornerLines()` — shrink,
   then wrap, then re-shrink; `cornerFits()`/`cornerClearsDisc()` checking
   both box-width and real disc clearance) already covers a longer string
   with no new mechanism needed — confirmed clean at both viewports,
   including the worst already-documented BL case ("XF Details -
   Improperly Cleaned") with " (SMS)" appended, on both the full flip card
   and the Catalog grid's narrower card (the surface with the least room).

**Verified headless — new suite `tests/verify_sms_finish_flag.js` (36
assertions), all passing; 1013 across 24 suites, zero failures.** Covers
the pure formatting function (including the blank-Grade-and-Designation
"(SMS) alone, no leading space" case, and non-SMS Finish values correctly
showing no flag); the live-mapper fix; all three real render paths across
four denominations (nickel/cent/quarter/half dollar) plus a Business-Strike
control; and the overflow/disc-clearance checks at both viewports.
**Verified via negative control**: temporarily neutering the SMS
comparison fails 16 assertions across every surface with exactly the
expected symptom (flag missing), confirming the suite actually exercises
the fix rather than passing vacuously.
- **Not verified: any real device, any real OneDrive session.** Same
  standing caveat as every round in this file — `Finish` reading real
  `All.Finish` values on a live coin hasn't been click-through-confirmed
  from this environment.


