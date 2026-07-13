# Execution plan — prepared end of 2026-07-13 session

**STATUS: Ray has NOT yet given the go-ahead to start implementation.** All
clarifying questions below have been answered (two full Q&A rounds completed),
and this plan is implementation-ready — but the standing instruction from the
prior session was "hold off on beginning implementation... Ray will confirm
go-ahead." **Confirm with Ray before writing any code from this file.** Once
confirmed, this file's job is done — delete it (its content should migrate
into CLAUDE.md as each item is actually built, per this project's normal
documentation practice, not live on permanently as a second source of truth).

This file exists because the prior session ran up against its token budget
after a full round of spec-gathering (10 parts from Ray, two rounds of
clarifying Q&A) and stopped short of implementing anything, to avoid landing
a half-finished batch right at a context cutoff. Everything below is fully
decided — there should be no need to re-ask Ray anything covered here.

## Sequencing note — read this first

The *previous* round (before this 10-part batch) ended with Ray's explicit
priority call: **build the Graph API write layer next, stop UI polish.**
This 10-part batch then arrived on top of that instruction. Reading the two
together: Part 7 (Staging tab, direct-write-vs-Staging logic, CollectionID
reservation) is the closest thing to "the write layer" — though note it's
still a **mockup simulation** (no real Graph API calls exist yet; this repo
has no backend and the hard constraint is Graph API only, called directly
from static JS — see CLAUDE.md's "Add Coin: the core workflow" and "Hard
constraints"). Parts 1/2 are pure bug fixes on already-built UI (not new
polish, safe regardless of the "stop UI polish" instruction). Parts 3/4/5/6/8/10
are genuinely new feature/UI work that arrived *after* the "write layer next"
instruction.

**Recommended order** (but flag this tension to Ray in the new session before
just proceeding on it):
1. Tier 0 bug fixes (small, fully diagnosed, low risk) — Parts 1 & 2 below.
2. Part 7 (Staging/direct-write/CollectionID) — matches the standing "write
   layer next" priority most closely of everything in this batch.
3. Part 4 (Error/Variety dropdowns) — feeds directly into Part 7's
   Staging-routing decision, so it makes sense right after.
4. Part 3 (Metal filter) — self-contained, no dependencies on the above.
5. Part 6 (Reference images) — needs Ray's asset sourcing/approval loop
   regardless, so framework-first here doesn't block on anything.
6. Part 5 (Sharing) — self-contained.
7. Part 8 (Grading help) — framework only; content is explicitly a separate
   research task per Ray's own spec.
8. Part 10 (Splash screen) — framework only, lowest interdependency, fine last.

Working environment reminder: local server via
`python3 -m http.server 8791` from the repo root, Playwright via
`playwright-core` + `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
scratchpad test scripts go in the harness-provided scratchpad dir (NOT
persisted across sessions/containers — only this repo's committed files
survive). Test thoroughly before each commit, matching this project's
established rhythm: implement → Playwright-verify → update CLAUDE.md → commit
→ push → republish the Artifact preview (fixed URL:
`https://claude.ai/code/artifact/97d06ef6-9f68-4c65-8b6b-2b2f0bc4a0f8`, strip
`<!DOCTYPE>/<html>/<head>...</head>/<body>/</body></html>` wrapper via awk,
and for the Artifact copy specifically — NOT the real app.html — inline the
four `fonts/*.woff2` files as base64 `data:` URIs since the Artifact sandbox
can't resolve the sibling `fonts/` directory; see how the previous session
did this before publishing).

---

## Tier 0 — Bug fixes (Part 1 + Part 2's Cert field)

### 1. Album page reverse-order also flips rows top-to-bottom (Part 1, Bug 1)

**Root cause (confirmed):** `.book-slot-grid` (app.html ~line 485) uses
`grid-template-columns: repeat(auto-fill, minmax(90px, 1fr))` — a responsive,
not-fixed column count. `renderAlbumPageContent()` (~line 2749) does
`[...page.slots].reverse()` on the full flat 6-item chunk for `side ===
"reverse"` pages. Reversing a flat array that's actually laid out as multiple
rows swaps row *contents* top-to-bottom in addition to flipping left-right
within a row — e.g. `[row1: A,B,C, row2: D,E,F]` reversed → `[F,E,D,C,B,A]` =
`row1: F,E,D, row2: C,B,A`. Only the left-right flip is wanted; row order must
stay put.

**Decided fix (Ray, this round):** switch to a **fixed column count per
existing breakpoint tier** (not CSS-only mirroring) — matches how a real
physical album page has fixed slots, and makes JS row-chunking reliable.
Numbers are our call; pick something that divides cleanly into
`ALBUM_PAGE_CHUNK = 6` and reads clean at each tier:
- Single-page mode (< 900px, existing `isAlbumSpreadWidth()` breakpoint):
  **3 columns** → 2 rows of 3.
- Two-page spread mode (≥ 900px): **6 columns** → a single row of 6 (which,
  incidentally, makes the reversal trivially correct at that tier since
  there's only one row — no row-order risk there at all).

**Implementation approach:**
- Change `.book-slot-grid`'s `grid-template-columns` from `repeat(auto-fill,
  minmax(90px, 1fr))` to something breakpoint-driven — either two CSS rules
  gated by the same `900px` media query already used elsewhere (search for
  the existing `@media (min-width: 900px)` block, e.g. near the old
  Albums/slot-cell rules), or a CSS variable toggled via a class the JS
  already applies based on `isAlbumSpreadWidth()`. Prefer reusing the same
  `spread` boolean already computed in `renderAlbumBook()` — e.g. add a class
  like `book-slot-grid-spread` there.
- In `renderAlbumPageContent()`, replace the flat `.reverse()` with a
  row-aware version: chunk `page.slots` into rows of the *actual* column
  count for the current mode (3 or 6), reverse each row's contents
  independently, then reassemble preserving row order. Something like:
  ```js
  function reverseWithinRows(slots, columns) {
    const rows = [];
    for (let i = 0; i < slots.length; i += columns) rows.push(slots.slice(i, i + columns));
    return rows.flatMap(row => [...row].reverse());
  }
  ```
  Call with `columns = spread ? 6 : 3` (the same `spread` value already
  available in `renderAlbumBook()` — thread it through to
  `renderAlbumPageContent(page, album, spread)` since that function doesn't
  currently receive it).
- **Test:** verify Obverse group order stays row-major top-to-bottom, and the
  Reverse page's row 1 is the reverse of Obverse's row 1 (not row 2's
  content). Re-run something like the existing `shot54-book-physics.js`
  pattern from the previous session (check scratchpad — it won't have
  persisted across a container restart, so likely needs rewriting) at both
  narrow and spread widths.

### 2. Coin flip font too small on phone (Part 1, Bug 2)

Both Dashboard Spotlight and Browse detail flips use the shared `.flip-label`
rule (app.html ~line 819, `font-size: 20px`). No ambiguity — just increase it.
Suggest trying **24–26px** and eyeballing a screenshot at a phone viewport
(the flip-frame is a fixed 280px square regardless of device, so there's
headroom). Watch for: the `.corner-line` divs (two-line stacking, added last
round) needing proportionally adjusted `line-height`/spacing so two stacked
lines still fit comfortably in the corner without visually crowding the coin
disc — screenshot-check both the plain single-line corners (TL year-mint, BL
grade) and the two-line corners (TR type/denom) after the change. Also bump
the grid-mini variant (`.coin-card .flip-frame-mini .flip-label`, ~line 331,
currently `11px`) proportionally if it looks too small relative to the main
flip after this change, though Ray's report was specifically about the main
Dashboard/Browse-detail flip, not the Browse grid cards.

### 3. Corner label truncates on Android phone specifically (Part 1, Bug 3)

**Diagnosis (confirmed via testing, approved by Ray to proceed on):** Android
mobile browsers (Samsung Internet included) apply text-autosizing that can
inflate rendered font size beyond the declared CSS value on narrow viewports
— a behavior desktop browsers don't have at all, which is why this didn't
reproduce in Playwright/desktop-engine testing at any width (320–412px
tested) and why it's specifically phone-only per Ray's report. There is
currently no `text-size-adjust` CSS anywhere in the app.

**Fix (approved, three layers):**
1. Add `text-size-adjust: 100%` (with `-webkit-text-size-adjust: 100%` for
   older WebKit-based coverage) — global reset, e.g. on `html, body` alongside
   the existing base rule (~line 29 area), or specifically on `.flip-label`
   at minimum. Global is probably safer/more consistent.
2. Loosen `.flip-label`'s `max-width: 42%` (~line 827) — Ray granted explicit
   permission to use more of the corner's real estate. Try something like
   `46–48%` and re-check that TL/BL corners don't visually collide with a
   large-denomination coin disc at the largest scale (`$1`, 210px disc in a
   280px frame — see `DENOM_SCALE`/`sizeCoinElement` from earlier work).
3. Only if text still doesn't comfortably fit after 1+2: grow the overall
   flip-frame slightly (currently a fixed 280px square, `.flip-frame` at
   app.html line 805). Ray confirmed the 2"×2" real-flip proportion is a
   *target*, not an exact constraint — "close enough and consistent across
   all coins" matters more than exact real-world scale.
- **Cannot fully verify without Ray's real device** — after implementing,
  say so explicitly rather than claiming the fix is confirmed; this remains
  the acknowledged testing-gap limitation from earlier in the project.

### 4. Receipt photo capture rotates sideways — EXIF orientation ignored (Part 1, Bug 4)

**Confirmed via code read:** the receipt slot (`wireMockPhotoSlot`, no
`frameId` branch, app.html ~line 3300–3311) does
`preview.src = URL.createObjectURL(file)` on a plain `<img id="receiptPreview">`
— zero EXIF handling, fully dependent on default browser behavior.

**Also flag/fix preemptively (Ray approved this in the same pass):** the
Obverse/Reverse/Additional photo path goes through a canvas-based
crop/adjuster (`openPhotoAdjust`, search for it) — canvas `drawImage()` never
auto-applies EXIF orientation regardless of browser, so this path likely has
latent risk of the same bug even though it hasn't been reported yet (probably
because the manual rotate buttons happen to mask it when a user notices).
Same root cause, same fix pattern, worth doing together per Ray's note.

**Fix approach:** read/apply EXIF orientation explicitly rather than relying
on implicit browser behavior — e.g. `createImageBitmap(file, {imageOrientation:
'from-image'})` (modern, concise, explicitly requests EXIF-aware decoding) to
get a correctly-oriented bitmap, then draw that (via canvas, for both the
plain receipt preview and the crop/adjuster path) instead of drawing the raw
file. Check actual browser support for `imageOrientation` in the `createImageBitmap`
options across the target browser set (Samsung Internet, Chrome) before
committing to this exact API — fall back to manual EXIF-tag parsing +
rotation transform if support is shaky.

### 5. Cert/Type Number field doesn't hide when Grader is blank (Part 2 status-check gap)

**Confirmed via code read:** `gradeSourceRow` correctly toggles `display:none`
whenever Grader has any value (app.html ~line 3692). `certTypeNumber`
(~line 1408) has no equivalent — it's always visible even when Grader is
"— none / not slabbed —".

**Decided fix:** hide it entirely when Grader is blank, exactly mirroring
`gradeSourceRow`'s existing toggle. Find the same `addCoinGrader` change
listener (~line 3686–3692) and add a parallel line, e.g. wrap the
`<label>Cert / Type Number</label>` + `#certTypeNumber` + its placeholder-note
`<p>` in a container div with an id (mirroring `gradeSourceRow`'s pattern) so
one line can toggle all three, or toggle each element's `style.display`
individually if a wrapper isn't warranted. Re-verify the PCGS-decode path
still works (decoding still needs to populate `certTypeNumber` even though
it's now hidden until Grader is set — but Grader *is* set to "PCGS" as part of
that same flow, so the field will already be visible by the time decode
happens; just confirm the sequencing holds).

---

## Tier 1 — New features building on confirmed data-model decisions

### 6. Direct-write vs. Staging logic + CollectionID reservation (Part 7)

This is the biggest, most foundational item in the batch, and it's still a
**mockup simulation** (no real Graph API write layer exists — see CLAUDE.md's
hard constraints). Build it as an in-memory simulation matching this
project's existing "every Save is a stub" mockup pattern, but with real
*decision logic* driving which stub path gets shown.

**Confirmed matching standard (not new, extend the existing soft-match):**
`checkDbCoinsMatch()` (app.html ~line 3468) currently matches on
Denom+Year+MintMark+Variety. Part 7 confirms Year+MintMark+Denomination+
Description+Variety is the full standard — Description is likely redundant
with Denom+Year in practice (Description auto-fills from those), but worth
double-checking the exact matching function includes it explicitly per spec
rather than relying on implication.

**Designation handling (decided):**
- Unspecified Designation at entry time does NOT block a direct write —
  default to linking the base/parent (non-designated) CoinID.
- A later edit that adds/confirms Designation should trigger a CoinID
  re-resolution against DB_Coins for that Designation-specific row.
- **If that re-resolution has multiple possible matches: ALWAYS surface the
  same "pick one" ambiguous-match UI Add Coin already has for PCGS labels
  (`showPcgsLabelAmbiguous()`/`pcgsLabelAmbiguousPanel`, search for it) —
  never auto-resolve silently, even with high confidence.** This is a firm
  rule per Ray (traces back to real historical data bugs in this project:
  the 2019-W Lincoln Cent CoinID collision, a Morgan/Peace mislink). Reuse the
  same ambiguous-match UI pattern/component rather than building a new one.
- Note: Designation editing currently lives in Browse Edit's bounded field
  list (CLAUDE.md "Editing existing coins": Grade, GradeSource, SerNo,
  Designation, Storage Location) but there's no existing mechanism connecting
  a Designation edit to re-running DB_Coins match logic — this is genuinely
  new wiring, not extending something partially built.

**Variety handling (decided, ties to Part 4 below):** an unrecognized/manually
typed Variety not among the filtered dropdown's valid options for that
Year+MintMark+Denom routes to Staging instead of direct write. **Confirmed
precise check:** compare the *resulting* Variety value against the valid
filtered list — not whether the user clicked vs. typed. Typing text that
happens to exactly match a valid option still qualifies for direct write.

**Save options UI (decided):**
- "Save to Database" — primary/default when the app has matched with
  sufficient confidence (per the rules above). Writes (simulated) directly to
  an in-memory "All" mock array, including photos to their final naming
  convention.
- "Save to Staging" — ALWAYS available as a manual override regardless of
  confidence; when the app is NOT confident, it's the *only* option shown.
- Ray believes the existing Remarks/Notes field already supports free text
  for explaining why something's in Staging. **Checked: Add Coin's Notes
  field (app.html ~line 1485) is a plain `<textarea>` with no `id` attribute
  at all** — it's not currently wired to any JS/save logic (can't be read
  programmatically without one). It will need an `id` added regardless of
  this feature, since Staging needs to actually capture and store that text
  in the mock Staging row.

**Staging tab mechanics (new Excel tab, mirror in mock data):**
- On entry to Staging (automatic or manual), immediately assign and reserve a
  real CollectionID (`AY-#####`) — do not defer this. Any photos taken during
  staging use this ID from the first photo (no renaming needed later if
  promoted).
- **CollectionID "next available" check must consider BOTH All and Staging
  together.** Confirmed via this session's investigation: **there is no
  existing "next available CollectionID" logic anywhere in the codebase
  today** (CollectionIDs only exist as hardcoded mock values in `FAKE_COINS`)
  — this is entirely new logic to design once, cleanly, not something that
  needs updating in multiple places. Build one function,
  e.g. `getNextCollectionId()`, that scans both a `FAKE_COINS`-equivalent
  "All" array and a new `FAKE_STAGING` array together.
- On promotion: move the row from Staging to All (same column/field
  structure, direct copy in the mock).
- On rejection: delete the row from Staging; its CollectionID becomes
  available again for the next entry (matches existing precedent noted in
  Ray's spec — AY-00470 reservation/release pattern from ProjectPlan history,
  no code precedent exists for this in the app itself, it's a data-log
  precedent only).
- Staging is a separate array/tab from All (not a status flag within All) so
  normal Browse/All browsing is never cluttered with in-progress entries —
  mirror that separation in the mock data structures too (don't just add a
  `status: "staging"` flag to `FAKE_COINS` entries).

### 7. Error and Variety fields — different dropdown patterns (Part 4)

**These are NOT the same pattern — don't build one generic component for both.**

**Error field:**
- Dropdown sourced from a new `FAKE_LOOKUP_ERRORS` mock array (Ray's real
  sheet has 42 rows — mock doesn't need all 42, a representative ~6-8 is
  plenty for the mockup) + manual free-text override for anything uncovered.
- Applies to ANY coin regardless of type/series — **do not filter this
  dropdown** by the coin being entered.
- An unusual/manually-typed Error does NOT affect direct-write eligibility
  (Part 7) — Error is incidental to the specimen, not identity-defining. A
  coin can have a clean CoinID match AND a manually-typed unusual Error.

**Variety field (currently a plain `<input type="text" id="variety">` — this
whole dropdown is net-new, not extending existing UI):**
- Dropdown is **context-sensitive** — filtered to only the varieties that
  exist for the exact Year+MintMark+Denomination already entered, pulled from
  `FAKE_DB_COINS`/a new `FAKE_LOOKUP_VARIETIES`-equivalent (not the full
  unfiltered list). E.g. a 1909 cent entry should offer VDB; a 1920 quarter
  entry should not.
- Manual free-text override still available.
- **Ties directly into Part 7's Staging-routing check** — see the confirmed
  precise logic above (resulting value vs. filtered list, not
  clicked-vs-typed).

### 8. Metal-content filter (Part 3)

- Add a **Metal filter** (Gold/Silver/Platinum/Palladium) alongside the
  existing Type filter pills (`browseFilters`, search `FAKE_COINS.filter
  (browseFilterTest)` / the filter-chip-building code) — a dropdown or
  separate pill group, not four more full-width tabs.
- **Qualification rule:** ANY nonzero content of that metal qualifies,
  regardless of purity — a 35% Silver War Nickel and a 90% Silver Morgan both
  qualify under "Silver."
- **Combination logic (important, don't collapse into the existing
  single-select chip pattern):**
  - Multiple Type pills OR together (existing behavior already supports this
    for Sets/Medals/Commemoratives per CLAUDE.md — confirm exact current
    mechanism before assuming, since the Denomination chips are currently
    single-select per CLAUDE.md's "Browse filters" section, "only one chip
    active at a time" — Part 3 wants Type pills to be OR-combinable
    (multi-select), which may itself be a change to the existing
    single-select interaction, not just an additive Metal filter. **Flag this
    to Ray if it's ambiguous when you get there** — Part 3 doesn't explicitly
    say "make Type pills multi-select now," it assumes OR-combination as if
    it already exists. Verify against CLAUDE.md's explicit "single-select,
    only one chip active at a time" line before assuming this needs no
    change.
  - Metal selection ANDs with Type selection.
  - Metal alone (no Type selected) shows all coins of that metal, any type.
- Composition detail (40% vs 90% Silver) doesn't need to show on Browse
  grid/list cards — sufficient that it's visible in the coin detail panel
  (already built last round, `renderBrowseDetailPanel()` — add a Composition
  row there, sourced from mock metal-content fields).
- **Mock data note:** `FAKE_COINS`/`FAKE_DB_COINS` currently have zero
  metal-content fields — need to add mock `silverOz`/`goldOz`/`platinumOz`/
  `palladiumOz`-style fields (matching Ray's real `Lookup_MetalContent`
  column names) to a representative subset of coins for the filter to have
  anything to demo against. The real workbook's full 353-coin population (per
  Ray's 7/13 ProjectPlan note) obviously isn't available to the mockup —
  that's a real-data fact for later, not something to fake at full scale.

### 9. Generic sharing — Wishlist + individual coin (Part 5)

- Build once, generically — a `shareContent(content)` helper usable from both
  Wishlist (share current wishlist contents) and Browse detail (share one
  coin's description + images), not two separate implementations.
- **Try Web Share API first** (`navigator.share`, ideally
  `navigator.canShare` with files for image support) — only method that can
  include images alongside text.
- **Fallback:** plain `mailto:` link with formatted text (descriptions,
  target prices) if Share Sheet isn't reliably available — note in the UI
  that images aren't included via this path.
- **Cannot verify Web Share API behavior on Samsung Internet from this
  environment** — same acknowledged testing-gap as always; implement per spec
  and say so explicitly rather than claiming it's confirmed working on-device.
- **Do NOT touch Wishlist's layout** in this pass — Ray explicitly said a
  separate layout revision is coming in a future round; only add the Share
  button/behavior to the current layout.

### 10. Series-level reference images (Part 6)

- **One generic image per SERIES**, reused across all years/mintmarks within
  that series — never per-CoinID, never per-date, **no variety-level
  exceptions either (confirmed this round — even visually-distinct varieties
  like 1909-S VDB reuse the plain series image; revisit only in a later
  round, not now)**. Verified compatible with the actual mock data: checked
  `FAKE_DB_COINS` and confirmed `description` doesn't vary by `variety` within
  a series (e.g. both the 1909-S plain and 1909-S VDB rows share
  `description: "Lincoln Wheat"` with variety as a separate field) — so
  keying by Description alone naturally stays series-level, no accidental
  per-variety images.
- **SeriesName key = `DB_Coins.Description` exactly, sanitized for
  filesystem-safe characters** (confirmed this round — canonical join key,
  not the display-only `seriesLabel()` abbreviation used for corner labels,
  which could drift independently and matters extra since Ray will sometimes
  name Canva-made fallback files by hand).
- No date/mintmark baked into the image — the flip's existing text corners
  already communicate specifics; an image with a visible date could
  contradict the flip's text for a different year.
- **Sourcing (not something to fully execute solo):**
  - Modern currently-sold Mint products (Silver/Gold Eagles, ATB quarters,
    current commemoratives): attempt official U.S. Mint product renders
    first (federal works, not copyrighted) — verify hotlink/fetch
    restrictions before building automated pulls (CLAUDE.md's "External data
    sources" section already documents general hotlinking caution for other
    sites — Mint-specific verification is new).
  - Historical/out-of-production series (the majority of this collection):
    no official current render exists. **Propose a candidate image and get
    Ray's approval before treating it as final** — don't auto-finalize
    anything unreviewed. If rejected, Ray provides a Canva-made replacement
    via the same folder/naming convention; display logic must be
    source-agnostic (doesn't care whether an image came from the Mint, was
    AI-generated, or hand-made, as long as it's in the right place with the
    right name).
- **File convention:** transparent background, lowercase `.png`.
- **Storage (OneDrive, not yet buildable against real OneDrive — mock the
  folder-path convention in code, real files come later):**
  ```
  CoinCollection/ReferenceImages/obverse/{SeriesName}_obverse.png
  CoinCollection/ReferenceImages/reverse/{SeriesName}_reverse.png
  ```
- **Display logic:** any owned coin with no actual Obverse/Reverse photo
  falls back to its series' reference image automatically. In the mockup,
  since there's no real OneDrive fetch layer, this likely means: add a mock
  `referenceImages` lookup keyed by sanitized Description, and have the
  Obverse/Reverse display logic (Browse detail, Albums, Spotlight, Add Coin
  preview) check owned-photo-first, reference-image-second, before falling
  back to the current placeholder disc.

### 11. Contextual grading help button (Part 8 — framework only)

- Add a "Help" button attached to the Grade field in Add Coin / Edit Coin.
- Tapping it surfaces grading criteria **specific to the coin type currently
  being entered** (keyed by series, presumably reusing the same
  Description/SeriesName concept as Part 6 for consistency) — not generic
  info.
- **Copyright constraint (important, not optional):** ANA's official grading
  guide and PCGS's Photograde images are copyrighted — cannot be reproduced
  or embedded. Content must be original researched-and-written text, or
  external links out to ANA/PCGS by reference — never scraped/copied
  text/images.
- **This spec item is button location + behavior only.** The actual
  series-by-series grading content is explicitly a separate research task
  (similar informal work already exists per Ray's note on Mercury dime
  grading notes from an earlier session) — don't attempt to research and
  write grading criteria for every series in the same pass as building the
  button/lookup mechanism; stub the content with a placeholder per series and
  note the research task as still open.

### 12. Initial splash screen (Part 10 — framework only)

- On first load: simple branded splash ("Salty's Cabinet," some rotation-style
  animation) while the app "establishes its OneDrive connection and pulls
  initial data."
- Auto-transition to Dashboard once ready.
- **Error state:** if connection fails, show a clear "error connecting"
  message with placeholder/minimal troubleshooting text — establish that this
  path exists and is handled, not that it's polished.
- Since there's no real OneDrive connection to wait on yet, simulate with a
  timed delay (and maybe a way to toggle/force the error state for testing —
  e.g. a URL param or dev-only toggle) so both the success and failure paths
  are actually demonstrable, not just the happy path.
- Framework-level only — visual design can be refined later per Ray's own
  framing.

---

## Part 9 — no action needed

Documented decision only: Ray confirmed keeping the current separate,
explicit Camera/Library buttons (not consolidating into one dropdown) — this
was a deliberate fix for a real Samsung Internet bug (combined pickers can
silently skip the camera option). Nothing to build; just don't "simplify"
this pattern if it comes up again in a future review.
