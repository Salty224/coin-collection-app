# Reference: NAV_DASHBOARD (moved out of CLAUDE.md)

Read this file when: touching the Dashboard cabinet, drawers, Back and Close Drawer, device Back / the history guard, the splash screen, or startup gating.
Rules that stayed in CLAUDE.md (not in this file): "Startup connection, docket.json, and the no-demo-data rule" (startup timings, Retry, Docket fast-fail).
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

### Round 2 after Ray's tablet test of `0a0cbd1` (same branch, HELD for his retest; merged to main 27 Oct 2026)
Passed on the tablet: steps 1-4, 8-10, 14-20, 22, 23 (step 20 with and
without a whole-set front). Skipped: 7 (same pattern as 5 and 6), 21 (no
OGP_Obverse rows in the workbook). Failed, all one bug: ONE device Back
always worked, a SECOND Back in a row left the app (step 5 coin -> grid ->
out; step 6 album -> list -> out; step 11 Dashboard prompt -> Back -> out;
step 13 Edit Coin "Discard unsaved edits?" open -> Back -> out, the edits
lost silently). Answers: Q1 yes, add the fallback (the first Back after a
fresh open leaves); Q2 wait for C4 (backlog q).
- **Why it happened (Chrome's history manipulation intervention).** On Back,
  Chrome skips any history entry the page added another entry on top of
  without a user tap since it arrived there. The one-entry guard put its
  entry back INSIDE the Back handler (never a tap), so the entry under it was
  marked skippable and the next Back jumped straight past it out of the app.
  A tap clears the marks, which is why one Back always worked. Headless
  Chromium doesn't apply the rule to script-driven Backs, so no suite saw it.
- **The fix: a short stack, entries added only on a tap.** `LEAVE_GUARD_DEPTH`
  = 5. Each entry is `{coinLeaveGuard: <this load's token>, d: n}`
  (`guardDepthOf`, `leaveGuard.depth`). `onLeaveGuardGesture` (capture-phase
  `pointerup` and `keydown`, trusted only) adds one entry per tap up to the
  depth: the moment Chrome won't skip it. It also ends the exit window and a
  leave in progress (touching the app = staying). A caught Back just steps
  down the stack and adds NOTHING while an entry of ours is left; only when
  none is left (the stack used up, or the moment after opening) does
  `armLeaveGuard()` add one without a tap, and the next tap adds a proper
  one (Q1's fallback). Screen changes (`setNavBack` -> `queueLeaveGuardSync`)
  add nothing while ours is on top. A pop that lands on an entry numbered no
  lower than where we were (the photo viewer's own pop, or forward) is not a
  Back. An entry left by a reload is still reused in place (`replaceState`),
  numbered one above whatever of ours lies under it.
- **Dashboard exit (Ray's change 1).** The "Leave Salty's Cabinet?" Stay /
  Leave dialog (`askLeaveApp`) is gone. Back on the Dashboard
  (`startDashboardExit`) toasts `DASHBOARD_EXIT_TEXT` "Press Back again to
  exit" and steps down to the page's own entry (`history.go(-d)`, an
  expected pop), so the very next Back is the device's own and leaves: two
  presses in all. After `DASHBOARD_EXIT_WINDOW_MS` (2000) an entry goes back
  on (`cancelDashboardExit`, the timer); a tap does it sooner. If that second
  Back lands on an older entry of ours (left by a reload) the app walks out
  past it (`leaveApp`). The window.close() + "Press Back once more" fallback
  is kept only for that walk and the splash.
- **Known and untestable here:** after the 2-second window, a Back with no tap
  in between may leave at once on Chrome (the entry put back by the timer had
  no tap); any tap restores the toast. Freshly opened, the first Back leaves
  until the first tap (Q1, as Ray observed). A run of more than 4 Backs with
  no tap in between can reach the bottom of the stack and leave. Whether
  `history.go()` itself is subject to Chrome's skip rule is unverified (the
  intervention is documented for the browser's Back, not the page's own
  go(); if it were, the Dashboard's first Back would leave).
- **The viewer's late pop.** Closing the photo viewer (label Done) hides it
  and calls `history.back()`; that pop arrives a moment later. A redraw in
  between used to reuse the viewer's entry for ours, so the late pop looked
  like a real Back and left Edit Coin (caught by `verify_photo_label_save`
  D5/D6 on the first full run). `armLeaveGuard` now does nothing while
  `mediaViewerExpectPop` is set; the pop lands on our entry.
- **Mint Mark "— none (Other) —" (Ray's change 2).** Picking it showed
  "— none (Philadelphia) —": the option carried a sentinel value
  (`__OTHER_MINT__`) that the change handler reset to "", which selects the
  first "" option, Philadelphia; on Add Coin `applyDbCoinsRowToForm` set ""
  again after a match. Now the option's value IS "" and it is marked
  `data-mint-other`; `mintMarkOtherSelected(sel)` tells the two apart,
  `selectMintMarkOther(sel)` selects it (Add Coin re-selects it after the
  lookup fills the form). Every reader of `.value` still sees "" or a real
  code. On BOTH screens that have the dropdown (Add Coin `#mintMark`, used by
  the Staging-draft edit too, and Edit Coin `#browseEditMintMark`), a coin or
  draft already linked to an unmarked non-Philadelphia catalog row opens on
  "— none (Other) —" (`showMintMarkOtherForCoinId`,
  `dbCoinIsUnmarkedNonPhiladelphia`; display only). `MINT_MARK_OTHER_SENTINEL`
  is gone. What each option writes to All.MintMark: "— none (Philadelphia) —"
  -> blank; "— none (Other) —" -> blank (the lookup's resolved row sets the
  CoinID: Add Coin fills the form from it, Edit Coin makes it the save's
  CoinID re-link); "P — Philadelphia (explicit)" -> P; D -> D; S -> S;
  CC -> CC; O -> O; W -> W. A value the list lacks (e.g. "P/D") is kept by
  `setSelectValuePreservingUnknown` and written back unchanged.
- **"Tap to label" (Ray's change 3).** The label line under a tile calls
  `openGalleryPhotoInViewer(entry, { label: { …, focus: true } })`;
  `showMediaViewerLabel` focuses `#mediaViewerLabelInput` inside the same
  tap (so the phone raises its keyboard) with the caret at the end. A tap on
  the photo itself opens the viewer without focusing the field.
- **Set notes: report only, no fix here (for the Edit Set saving build,
  backlog r).** Columns: coin page "Notes yours" = All.Remarks
  (`coin.remarks`), demo lookup as fallback; Edit Coin "Notes editable" =
  All.Remarks (snapshot-driven, writes it); coin page / Edit Coin "Fun Fact"
  = DB_Coins.FunFact (`catalogFunFactFor`); "Catalog Notes" =
  DB_Coins.Notes (`catalogNotesFor`). Set page "Notes yours" = the Set row's
  own All.Remarks (same code as a coin). Edit Set's Notes box = the
  session-only details lookup (`coinDetailsFor(id).notes`, FAKE_COIN_DETAILS
  in demo, `sessionCoinDetails` live), NOT All.Remarks: that is why
  AY-00463's box opens empty, and an Edit Set Save writes it to the session
  only (the page keeps showing All.Remarks, which wins). Not caused by C2:
  the same line is on `main`. Set "Fun Fact" (page and Edit Set) =
  `catalogFunFactFor`, whose DB_Coins match never matches Denomination
  "Multiple", so live it is always blank (demo shows FAKE_COIN_DETAILS). No
  Set screen reads DB_Sets.Notes, DB_Sets.KeyNotable or (except an album's
  History page) DB_Sets.History.
- **Tests:** `verify_device_back_everywhere.js` 33 -> 49: SELF; C1-C5 under
  an EMULATED Chrome skip rule (`__chrome`: every pushState records whether
  a tap credited it, a history move clears the credit, a tap clears the
  marks, the device Back skips marked entries; Ray's steps 5, 6, 11, 13 and
  the fresh-open case); D1-D3 rewritten for the toast (the prompt is gone,
  checked in the source); S1 rewritten (entries only on taps, none on a
  caught Back while ours are left). New `verify_tablet_retest_0a0cbd1.js`
  (12): SELF; M1-M3 Mint Mark on Add Coin, Edit Coin and a draft; T1 the
  label focus. `verify_addcoin_mintmark_other` and
  `verify_workbook_alignment` select the option the way a user does
  (`selectMintMarkOther`) and check the option list by its marker.
  `verify_leave_guard` unchanged and passing.
- **Shared check helper (harness):** `check(label, cond, data)` and
  `selfCheck(fn)`, see the standing rule under "Regression suites are
  COMMITTED".
- **Negative controls** (real app.html, restored by checksum, each failing by
  name): the old design (entry put back inside the Back handler, taps add
  nothing) fails C1b, C2b, C3b, C1c, C1d, C3c, S1a-c: Ray's exact failures;
  no entry added on a tap: the same 9; the Dashboard not stepping down:
  C4b, D1b; "Other" reset to "" on pick (the old jump to Philadelphia):
  M1a, M1c, M2a; forms not showing Other for an already-linked coin: M2b,
  M3; Tap to label not focusing: T1a; re-arming while the viewer's step back
  is pending: photo-label-save D5, D6. The self-check itself was proved on a
  probe suite: a reversed raw `ok` and a reversed `check` both fail it.
- `npm test` on round 2 (`40c7f5a`): 3989 passed, 0 failed, 0 page errors,
  76 suites (3961 + 16 in device-back-everywhere + 12 in the new suite).
- **Not verified:** any real device (the whole point of the Back fix is
  Chrome's real rule, emulated here); Samsung Internet; the installed app.
  *(27 Oct 2026, Ray's tablet: device Back in the installed app passed: two
  Backs in a row, Back in dialogs, the Dashboard exit toast. Samsung
  Internet in a browser tab is still unverified.)*


### Cabinet navigation redesign (BUILT and merged to main; built on `claude/cabinet-navigation`, whose tip is not an ancestor of `main` — landed via rebase; the code is on `main`)
The entire persistent-nav model above is **retired** in favor of a
Dashboard-graphic-driven model. This is architectural/cross-cutting work, so
per the merge policy it's held on its branch until Ray's explicit go-ahead
(he wants to live-tune the wood tone / hardware color / handle style /
display-case shape together first). The old "Superseded: six-item side/bottom
nav" note above is now itself fully superseded — kept only for history.
- **No persistent sidebar/bottom nav anywhere** (mobile + desktop) — all of
  `.side-nav`/`.bottom-nav`/`.nav-btn`/`.topbar`/`.brand-*` markup and CSS
  removed, plus `NAV_ITEMS`/`buildNavButtons`. Navigation happens entirely
  through a new Dashboard **wood cabinet graphic**: a face-on display case up
  top (holding the existing Spotlight carousel, coin viewed portrait/face-on)
  over **seven drawers**, built by `initCabinet()` from `CABINET_DRAWERS` in
  fixed order: 1. **Catalog** (→ browse), 2. **Albums**, 3. **Sets**,
  4. **Wishlist**, 5. **Ledger** (→ stats), 6. **Acquisitions**, 7. **Docket**
  (→ needsdbcoins, carries the live count fob). Drawer labels are Caveat
  (handwritten, echoing the coin-flip labels); the count is a hanging
  brass **fob** (`.drawer-fob`, NOT a flat circular badge), reusing the
  existing `#needsAttentionBadge` element id so `renderNeedsAttentionHub()`'s
  count logic drives it unchanged — **but the text is now a plain number
  (`19`), not the old parenthesized `(19)`** (the fob reads as a physical tag).
  `updateDocketFob(count)` toggles the fob's `.hidden` by count.
- **Exactly two controls on every non-Dashboard screen** (`.nav-chrome`,
  sticky top): **Back** (`#navBackBtn`) = up one level, and **Return to
  Dashboard** (`#navHomeBtn`) = hard reset to the top. No long-press /
  quick-jump; max two taps to reach anything. Chrome is hidden only on the
  Dashboard (`navigate()` toggles `#navChrome.hidden` on `viewId ===
  "dashboard"`). In-view `.back-link` buttons are hidden via CSS
  (`.back-link:not(#yearPickerBackBtn)`) — the chrome's Back delegates to
  them via `navBackHandler`; the year-picker widget's own back button stays.
- **Shallow up-one-level Back model, NOT a history stack** (Ray's Q2):
  `navBackHandler` is a mutable module-level fn ref, (re)set at every screen /
  sub-screen transition via `setNavBack()`. `navigate()` seeds it from
  `SECTION_BACK_TARGET` (addcoin/addset/batchreceipt → acquisitions;
  staging/inprogresssets → needsdbcoins; everything else → dashboard), and
  each `show*` sub-screen overrides it afterward (Browse detail → grid, album
  book → albums list, wishlist detail → grid, etc.). The Spotlight
  click-through and Albums filled-slot tap keep their per-origin
  `browseDetailBackHandler`.
- **Acquisitions is a 3-choice hub** (Q1) — new `view-acquisitions` with three
  `.acq-choice` rows (`#acqAddCoinBtn`/`#acqAddSetBtn`/`#acqBatchReceiptBtn`)
  → addcoin/addset/batchreceipt. The Sets-checklist empty-tile deep-link into
  Add Set stays as an additional path, unchanged.
- **Drawer tap plays a ~260ms open animation before navigating**
  (`.drawer.opening` / `@keyframes drawerOpen`), **respecting
  `prefers-reduced-motion: reduce`** (instant cut, no delay) — checked once in
  `initCabinet()`.
- **Browse's internal structure is completely untouched** — Coins/Rolls/Sets/
  Albums tabs, Coins default, all filters. `navigate("sets")` still just lands
  on `#view-browse` with the Sets tab active (no view element of its own).
- **Aesthetic is a deliberate FIRST PASS, not locked** — warm honey-oak wood
  (`.wood`, layered CSS gradients w/ `--grain-dir`, same no-image-assets craft
  as the Album leather texture), brass/copper drawer plates + finger-pulls
  (pull above the label), face-on glass case. Ray will live-tune wood tone,
  hardware color, handle style, and case shape together. **Needs a real-device
  check** (Samsung Internet): wood/brass rendering, drawer-animation feel +
  reduce-motion behavior, display-case shape. Verified headless only
  (`verify_cabinet_nav.js`, 41 assertions × normal + reduce-motion contexts +
  an instant-cut timing check — drawer order/labels/fob, chrome show/hide,
  all 7 routes, shallow Back per section + sub-screen, Return to Dashboard,
  Acquisitions hub → 3 destinations + back, Spotlight click-through, Docket
  fob count/visibility). All prior regression suites re-run clean (the
  `(N)`→`N` fob change required updating `verify_badge.js`/`verify_regression.js`
  expectations, not an app fix).

**Refinement pass (BUILT, same branch, still held) — 13 polish items from
Ray's live phone/tablet review, no structural/routing changes:**
- **Wood darkened** a step further, closer to the deeper of his two
  reference photos (`--wood-hi/mid/lo` pulled down and desaturated a touch).
- **Rectangular grid artifacting on the drawer wood, fixed.** Root cause: the
  ray-fleck layer ran PERPENDICULAR to the grain-line layer, both hard-edged
  repeating-linear-gradients at similar periods, blended `multiply` — two
  perpendicular hard-edged patterns at comparable periods interference-beat
  into a visible crosshatch, and `multiply` darkened every crossing into a
  visible grid node. Fixed by softening the fleck layer to a smooth,
  low-opacity highlight-only pattern on a longer, non-matching period,
  blended `normal` instead of `multiply`; the cathedral-figure layer's
  stops were also switched from hard px-range steps to single-position
  stops so bands interpolate instead of snapping.
  - **Rely on `background-blend-mode: normal` here, not `multiply`, for any
    future wood-texture layer** — `multiply` against a perpendicular
    hard-edged pattern is exactly what produced the grid; a future addition
    that reintroduces multiply-blended perpendicular hard-edged layers will
    likely reproduce it.
- **Per-drawer wood variation is real now, not a panned copy of one tile** —
  the old fix only shifted `background-position` (same tile, different
  window onto it, so it still read as one repeated texture). Each of the 7
  drawers now gets its own `--wood-hi/mid/lo` tint plus (on most) a small
  `--grain-dir` angle offset via explicit `nth-child(1)`–`nth-child(7)`
  rules, so the stack reads as seven distinct boards.
- **Display case narrowed** (`.cabinet-case-glass { max-width: min(80%,
  260px); margin: 0 auto; }`) — reads as a distinct glazed window set into
  a wider wood face, not a pane stretched to the drawers' own width.
- **Spotlight carousel dots removed entirely** (HTML element, CSS rules, and
  the JS that built/toggled them) — auto-rotate only, no manual dot
  navigation, per Ray's call. The manual flip button (⟲) is unrelated and
  stays — it's not a "dot," it's the existing tap-to-flip control.
- **Auto-flip rate slowed** 4000ms → 6500ms (`resetSpotlightTimer()`) — the
  old rate was too fast to actually read a coin's obverse before it flipped.
- **Corner-label text bumped** 25px → 27px, `max-width` widened 47% → 50%
  for headroom given the larger text. This corner has a real prior clipping
  history (see "Coin-flip corner labels" above) that was never reproduced
  in this environment — **flagged for Ray's own device confirmation**, not
  verified here beyond "renders without visible clipping in this sandbox."
- **Drawer label text bumped** 24px → 30px, color darkened `#3a2a10` →
  `#1c1203` with a paired highlight/shadow (`text-shadow`) for an engraved-
  label look — the old color read too close to the mid-brass plate tone on
  a real screen. **Plate itself grew** (`min-width` 150px → 168px, padding
  15px/18px/9px → 18px/22px/11px) to comfortably fit the larger text; it's
  a flex child sized by its own content plus these values, not a fixed box,
  so it grows automatically with the label.
- **Drawer open animation now actually travels** (`translateY(0)` →
  `translateY(13px)` in the `drawerOpen` keyframe) — the original only
  animated `box-shadow` with `transform: translateX(0)` at every keyframe,
  i.e. zero real motion, which is exactly why it barely read as "opening."
  Duration bumped 260ms → 320ms as a side effect of the travel actually
  needing time to read, not the primary fix; the JS `setTimeout` before
  `navigate()` fires was updated to match.
- **New closing animation** (`drawerClose` keyframe, the exact reverse
  travel/shadow) plays on the originating drawer whenever Back or Return to
  Dashboard lands back on the Dashboard from inside that drawer's own
  section — tracked via a new `lastDrawerView` module-level variable, set
  inside `navigate()` whenever it's called with a `CABINET_DRAWERS`-mapped
  viewId (direct) or a `SECTION_BACK_TARGET`-mapped child viewId (e.g.
  `addcoin` → `acquisitions`), and consumed/cleared inside `navigate()`'s
  own `"dashboard"` branch. Deep sub-navigation within a section (Browse
  detail, an Add Coin subview, etc.) never calls the top-level `navigate()`
  at all, so `lastDrawerView` naturally survives untouched all the way back
  out to whichever drawer was actually opened, however many in-section
  Back-taps it takes to get there. Respects `prefers-reduced-motion`
  exactly like the open animation — the JS checks it before ever adding the
  `.closing` class, so a reduced-motion session never sees the class at all
  (not just a CSS-suppressed animation on an added-but-inert class).
- **Docket fob's hanging ring** moved closer to the tag body (`top: -7px` →
  `top: -4px` on `.drawer-fob::before`, slightly smaller) — it read as
  floating detached above the tag rather than an integrated part of it.
- Verified headless: all 9 prior regression suites + `verify_cabinet_nav.js`
  re-run clean (no assertion changes needed — this pass was pure CSS/JS
  polish, no routing/structural change). The animation-travel and
  closing-animation logic were additionally spot-checked directly (mid-
  animation screenshot showing real drawer displacement + cast-shadow
  change; `lastDrawerView`/`.closing` class lifecycle asserted programmatically,
  including the sub-flow → parent-drawer mapping case). **Still needs Ray's
  real-device pass** — this round was reacting to his phone/tablet review,
  but the fixes themselves (wood grid, contrast, animation feel) were only
  re-verified in this environment's headless Chromium, not back on his S25.

**Second refinement pass (BUILT, same branch, still held) — 7 items, single
throughline: the cabinet read as a flat block with drawer-fronts painted on,
not a real piece of furniture with depth.**
- **Real cabinet frame added (`.cabinet-frame-inner`)** — `.cabinet` itself
  (already `.wood`-textured) is now padded on three sides (`padding: 15px
  15px 0` — both sides + top; bottom stays flush since `.cabinet-base`
  already reads as the plinth), and that raw padding IS the visible frame:
  vertical side stiles down both edges, a top rail above the display case,
  per the honey-oak reference photo. Everything else (case, drawers, base)
  now lives inside `.cabinet-frame-inner`, inset into that frame rather than
  spanning its outer edge-to-edge width. A groove shadow marks where the
  case/drawers meet the stiles — **applied directly to `.cabinet-case` and
  `.cabinet-drawers`, not to `.cabinet-frame-inner` itself** (a real bug
  caught before shipping: those two are the opaque, full-width elements
  that actually paint there — an inset shadow declared on the wrapper
  would sit behind its own children's backgrounds and never be visible at
  all, since block children span 100% of their parent by default).
- **Display case narrowing simplified, NOT doubled.** A previous pass had
  already narrowed `.cabinet-case-glass` on its own (`max-width: min(80%,
  260px)`) before this frame existed. Once the frame started contributing
  its own width reduction too, the two narrowing steps compounded on a
  ~360px-wide phone enough to shrink the flip-frame to ~215px — at which
  point the two top corner labels (a longer Type/Denom pair, e.g. "1889-CC"
  / "Morgan") visually collided into each other. **Caught via screenshot at
  360px, not just computed** — confirmed as a real regression this pass
  introduced, not a pre-existing gap. Fixed by treating the frame as what
  satisfies "case narrower than the full cabinet width" and pulling the
  glass's own separate narrowing back to a light touch on top of it
  (`max-width: 94%`, down from `min(80%, 260px)`) — re-verified at 360px
  with zero corner-label overflow and no horizontal page scroll, and the
  coin/carousel content itself was never resized either time.
- **Drawer separation is now real, not just a 1px line.** `.drawer` gets a
  4px `margin-bottom` (was a flush `border-bottom`) so the parent
  `.cabinet-drawers`' own background shows through as a visible gap between
  every drawer front. `.cabinet-drawers` sets its own notably darker
  `--wood-hi/mid/lo` (a recessed "housing" tone, darker than any individual
  drawer face's own tint) so that gap reads as a genuine shadowed recess
  behind lighter drawer fronts, not just a thin seam. `.drawer-face` also
  picked up a real outer drop shadow (`0 2px 4px rgba(0,0,0,0.45)`, on top
  of its existing inset grooves) now that it has a recess to actually cast
  it into, plus a subtle `border-radius: 2px` so each panel reads as a
  distinct physical box.
- **Open/close travel now plays against that same recess** — no new markup
  or literal 3D side panels; because the recess is already established at
  rest, a drawer sliding 13px down into (or out of) that dark gap during
  the existing open/close keyframes reads as pulling out of a real cavity
  rather than sliding across a flat surface. The keyframes also ramp in a
  side inset shadow at the open state (`inset 6px 0 8px -6px`/`inset -6px 0
  8px -6px rgba(0,0,0,0.4)`, absent at rest) as a further hint of the
  drawer's own side catching shadow as it pulls toward the viewer.
- **Animation easing switched from an ease-out-leaning curve
  (`cubic-bezier(0.22, 0.61, 0.36, 1)`) to a symmetric ease-in-out
  (`cubic-bezier(0.65, 0, 0.35, 1)`)** on both `drawerOpen` and
  `drawerClose` — durations (320ms/300ms) are unchanged, only the velocity
  shape; the old curve had real motion (per the first refinement pass) but
  still felt abrupt at the start.
- **Wood grain given irregular flow, not just tonal variation (which the
  first pass already covered).** A second grain-line `repeating-linear-
  gradient` layer runs at a shallow independent angle offset
  (`--grain-dir + 4deg`) and a different period than the first, so within
  a single drawer the lines gently cross rather than running perfectly
  parallel. Per-drawer `--grain-dir` offsets were also widened (±1–3deg,
  up from ±1–2deg) for more variety across the stack. Two small "knot"
  accents (a dark radial core with fading concentric rings, approximating
  growth rings) were added sparingly — only on drawers 3 and 6, as `::before`
  pseudo-elements layered behind the brass plate — since real quarter-sawn
  oak isn't covered in them; every drawer having one would read as a
  pattern, not wood. **Deliberately did NOT reach for an SVG turbulence/
  displacement filter for true curved grain** — that would be a real
  technique change from the established "layered CSS gradients only, same
  posture as the Album leather" approach, and this project's own history
  already flags SVG-filter-class effects as a cross-device rendering risk
  (Samsung Internet support can be flaky) that can't be verified from this
  environment. This pass is a CSS-gradient-only approximation; a true
  wavy-grain pass would be a deliberate follow-up decision, not a default.
- **Docket fob's hanging ring removed entirely** (not just repositioned —
  Ray's explicit call this round) and the badge itself moved from hanging
  above the plate's top-right corner to sitting beside the plate at roughly
  label height (`top: 58%; right: -10px; transform: translateY(-50%)`,
  down from `top: -13px; right: 12px`). Shape simplified from the teardrop/
  escutcheon (`border-radius: 15px.../20px...`) to a plain rounded badge
  (`border-radius: 8px`) now that there's no ring for it to visually hang
  from.
- **Real-device-check flags carried over from the first pass, both still
  open, neither resolved by anything in this round**: whether the drawer
  travel distance feels like enough in hand (now 13px, unchanged — the new
  recess/gap treatment should make the same distance read more
  convincingly as "pulling out," but the felt distance itself wasn't
  touched), and whether the 27px corner-label text is safe from the
  clipping issue that's bitten this corner before (unchanged this round;
  the 360px overlap bug found and fixed above was a DIFFERENT problem —
  two labels colliding with each other from a too-narrow frame — not the
  single-label edge-clipping history this flag refers to). Both need Ray's
  own S25/tablet confirmation; neither is reproducible from this
  environment.
- Verified headless: all 10 prior suites (9 regression + `verify_cabinet_nav.js`)
  re-run clean, no assertion changes needed. Additionally spot-checked
  directly: a mid-open-animation screenshot showing the drawer visibly
  displaced into the new recess with a deeper cast shadow; the 360px
  corner-label collision bug reproduced via screenshot, then re-verified
  fixed via both a `scrollWidth`/`clientWidth` overflow check (zero
  overflowing labels, was one before) and a follow-up screenshot; a
  360px-viewport horizontal-overflow check (`document.body.scrollWidth <=
  window.innerWidth`, holds both before and after the case-glass fix).

**Third refinement pass (BUILT, same branch, still held) — 6 items,
including one real structural change (display case decoupled from the
cabinet frame).**
- **Display case is now a genuinely separate object, not part of the
  frame.** Previously `.cabinet-case`/`.cabinet-case-glass` lived INSIDE
  `.cabinet`/`.cabinet-frame-inner` (the same frame the drawers sit in) —
  Ray's explicit call this round was that this is conceptually wrong: a
  display case resting on a cabinet's top surface is a separate piece of
  furniture, not a merged structural element. `.display-case`/
  `.display-case-glass` are now siblings of `.cabinet` in `.cabinet-stage`,
  positioned before it in source order with `margin: 0 auto -7px` (the
  negative bottom margin pulls it down to visually overlap/rest on
  `.cabinet-top-cap` rather than floating above it with a gap) and a higher
  paint order (via `position: relative` with no competing z-index on the
  cap) so it reads as sitting in front of/on top of the cap, not behind it.
  `.cabinet-frame-inner` was removed entirely — with the case gone, it had
  only one remaining child (`.cabinet-drawers`) and added nothing.
- **Real beveled top cap + base, each wider than the frame.** `.cabinet`
  itself is now narrower than the full stage (`max-width: 90%`) specifically
  so `.cabinet-top-cap` and `.cabinet-base-cap` — new standalone sibling
  elements, `max-width: 96%` — have visible room to protrude past its
  stiles on both sides, matching the reference cabinet photo's real
  lipped-top/protruding-base construction (previously `.cabinet-top`/
  `.cabinet-base` were the same width as the frame they sat inside, so nothing
  ever read as a distinct cap). This is the concrete case of "narrower
  drawers are an acceptable tradeoff for correct proportions" Ray
  pre-authorized this round.
- **A real regression, caught and fixed before shipping (not by Ray):**
  moving the display case out to its own object introduced a THIRD stacked
  padding layer (`.display-case` → `.display-case-glass` → `.spotlight`,
  where the previous nested-in-the-frame layout only had two:
  `.cabinet-case` → `.cabinet-case-glass`). On a 360px phone this compounded
  enough to shrink the flip-frame to ~157px and collide the two top corner
  labels again ("1889-CC" running into "Morgan") — caught via direct
  measurement (`getBoundingClientRect()` gap between the TL/TR corner
  boxes came back negative) plus a screenshot, not assumed. Fixed by
  trimming the redundant padding at all three layers (`.display-case`
  10px→8px, `.display-case-glass` 10px→8px, `.spotlight`'s horizontal
  padding 16px→4px — `.spotlight`'s own padding predates the dedicated
  case/glass wrapper and is now mostly redundant with theirs) and adding a
  `min-width: 256px` floor on `.display-case` itself as a hard backstop —
  re-verified at 360px with a positive 32px gap between the two corner
  boxes (was −14px) and zero page-level horizontal overflow.
- **Wood knots removed entirely** (`.drawer:nth-child(3)/(6) .drawer-face::before`
  and their radial-gradient rules deleted) — Ray's call that they read as a
  rendering flaw, not real wood. The second, independently-angled grain-line
  layer from the prior pass (the actual "irregular flow" mechanism) is
  unchanged and stays.
- **Brass placards shrunk to fit their text.** `.drawer-plate` padding
  `18px 22px 11px` → `10px 15px 6px`, `min-width` `168px` → `118px`,
  `max-width` `80%` → `78%`. Label font-size is unchanged (30px, from the
  first refinement pass — a real readability fix, not revisited).
- **Docket fob pushed further right**, now clearly separated from the
  (now-smaller) plate rather than touching/overlapping its edge —
  `right: -10px` → `right: -34px` on `.drawer-fob`. Verified via
  `getBoundingClientRect()` that the fob's right edge stays well inside the
  drawer's own bounds (no clipping) at 412px.
- **Open questions carried over from prior passes, still unresolved,
  still need Ray's own S25/tablet check** — nothing in this round touched
  either: (1) whether the 13px drawer-open travel distance feels like
  enough in hand; (2) whether the 27px corner-label text is safe from the
  single-label edge-clipping history that's bitten this corner before
  (distinct from the two-labels-colliding bug this round fixed).
- **New, this round**: the display case's visual "resting on the cap"
  effect (the −7px overlap + paint-order layering) hasn't been checked on
  a real device either — it's a CSS-only illusion (no real 3D), and while
  it reads correctly in this environment's headless Chromium at every
  viewport tested (360px/412px), whether it convincingly reads as "an
  object sitting on a surface" rather than "two shapes overlapping" is a
  genuinely subjective call worth Ray's own eyes.
- Verified headless: all 10 prior suites re-run clean, no assertion changes
  needed (this pass changed the DOM structure around the display case —
  `.cabinet-frame-inner` removed, `.cabinet-case`/`.cabinet-case-glass`
  renamed to `.display-case`/`.display-case-glass` and relocated — but
  `verify_cabinet_nav.js` and every other suite target IDs/behavior, not
  these specific class names, so nothing needed updating). Additionally
  spot-checked directly: the corner-label collision bug reproduced via
  `getBoundingClientRect()` measurement before the fix, re-verified fixed
  after; a fresh 412px full-dashboard screenshot confirms the display case
  reads as a distinct object sitting on the cap, with visible top-cap/
  base-cap protrusion past the drawer stiles on both sides.

**Fourth refinement pass (BUILT, same branch, still held) — 4 items,
including one real root-cause bug fix (not a cosmetic patch).**
- **Display case given real molded depth** — `.display-case` now carries
  four concentric inset box-shadow rings (alternating light/dark) that read
  as a carved step-molding profile, plus a `::before` brass pinstripe inset
  just past them, approximating the reference photo's molded frame/brass
  trim detail. Padding grew `8px 8px 13px` → `13px 13px 18px` to give the
  rings room to read clearly without crowding the glass. Explicitly NOT
  adopting that reference photo's downward-viewing angle — construction/
  detailing only, per Ray's own framing.
- **Placards are now one uniform fixed size** (`.drawer-plate { width:
  214px; }`, replacing the previous pass's `min-width`/`max-width` shrink-
  to-content approach) — sized to fit "Acquisitions" (the longest label)
  comfortably; shorter labels sit centered with real visible margin, not
  hugging their own text. This directly reverses the previous pass's
  per-plate sizing on Ray's explicit instruction — the two rounds wanted
  different things (that round: less empty margin around each label; this
  round: one consistent plate size across all seven), not a contradiction.
- **Top/bottom bevel now faceted, not a smooth slope** — `.cabinet-top-cap`/
  `.cabinet-base-cap` switched from a two-stop soft gradient to a 5-band
  hard-stop gradient (each band a flat color with a sharp edge to the
  next), reading as a stepped/carved molding profile rather than a simple
  rounded bevel. Heights grew slightly (20px→26px top, 18px→22px base) to
  give the extra bands room.
- **Root-caused the recurring dark grain band, not just patched around
  it.** Ray's report: a darker band appeared at the same relative spot
  (near the top) on 5 of 7 drawers, with only Catalog and Sets looking
  clean — his own suggested fixes were "make it rarer" or "vary its
  position." Direct visual diagnosis (a full-stack high-res screenshot of
  all seven drawers side by side) pointed at neither of the per-drawer
  background-position/grain-angle variables — those already varied
  per-drawer and didn't correlate with which drawers showed the band.
  The actual cause: `.drawer-face`'s box-shadow carried a third value,
  `inset 0 26px 30px rgba(0,0,0,0.10)`, applied IDENTICALLY to every
  drawer regardless of its own tone/phase — a large-blur positive-offset
  inset shadow that washes the top portion of a box dark by design. On
  drawers where this happened to compound with an already-darker base tone
  or grain phase, it read as an obvious repeating band; on Catalog/Sets it
  didn't stand out as much, which is why only those two looked "clean" —
  not because their own wood recipe was different, but because they had
  less to compound with. Removed entirely (from the resting state AND both
  keyframes' 0%/100% endpoints, so the animation doesn't flash a different
  shadow than the resting state) — the drawer-separation cue it was meant
  to add is already covered by the real 4px gap + darker recess housing
  from an earlier pass. Verified via a fresh full-stack screenshot: no
  drawer shows the band anymore, not just the previously-clean two.
- **Re-verified the 360px corner-label safety margin after this round's
  padding increases** (the display-case molding needed more room) — gap
  between the two top corner boxes: 32px → 22px (padding grew, floor
  stayed the same), still solidly positive, zero page overflow. Worth
  knowing this margin is shrinking round over round as the case gains
  detail — if a future pass adds more case padding, re-check this specific
  measurement rather than assuming it still holds.
- **Open questions carried over, still unresolved, still need Ray's own
  S25/tablet check**: the 13px drawer-open travel distance; the 27px
  corner-label text's single-label edge-clipping history; whether the
  display case's "resting on the cap" effect reads convincingly on a real
  screen (all three untouched this round).
- Verified headless: all 10 prior suites re-run clean, no assertion changes
  needed. Additionally spot-checked directly: before/after full-drawer-stack
  screenshots proving the dark-band diagnosis and fix; a case zoom-in
  screenshot confirming the molding rings + brass pinstripe render visibly;
  a 360px measurement re-confirming the corner-label gap stays positive.

**Fifth refinement pass (BUILT, same branch, still held) — 4 items,
including one approach reversal (display case) Ray called outright rather
than asking for another tuning pass.**
- **Display case abandoned "resting on the cabinet top" entirely, now hung
  like a picture frame above it.** Four straight rounds (molding rings,
  brass pinstripe, negative-margin overlap + z-index paint-order tricks)
  never convincingly sold "sitting on a surface" — Ray's call this round
  was to stop tuning that approach and drop it. `.display-case` no longer
  overlaps `.cabinet-top-cap` (`margin: 0 auto -7px` → `margin: 0 auto
  16px`, negative-overlap flipped to a real positive gap) and the
  elaborate 4-ring inset-shadow molding + separate brass-pinstripe
  `::before` are both gone — a hanging frame doesn't need surface-contact
  cues it no longer makes contact with. `z-index: 2` (only ever needed for
  the paint-order-over-the-cap trick) is gone too.
- **Case frame now uses the real `.wood` texture, not an approximating
  flat gradient.** `.display-case` carries the `.wood` class directly (see
  the HTML) instead of its own hand-matched `linear-gradient` background —
  same class, same `--wood-hi/mid/lo` values `.cabinet` itself uses, so
  the frame's wood is now genuinely the same recipe as the cabinet body,
  not a close approximation of it. `.display-case-glass`'s existing brass
  border is untouched and is the only "trim" the case has now — sufficient
  for a picture frame, no separate accent layer needed.
- **Top/bottom bevel: fixed a real directional bug, not just re-styled
  it.** The base cap used to shade top-to-bottom in the SAME direction as
  the top cap (light→dark going down) — which reads as the base sloping
  UP into the frame above it, backwards from a real flared foot/plinth
  that slopes AWAY and down. Both caps are now a genuine two-tier hard-
  stop facet (was a 5-band gradient) with DELIBERATELY OPPOSITE
  direction: top cap bright at its own outer/top surface, darkening
  toward the frame below; base cap dark near the frame above it,
  brightening toward its own outer/bottom edge. `.cabinet-base-cap`'s
  `border-radius` was also flipped (`3px 3px 8px 8px` → `8px 8px 3px
  3px`) so the rounding sits near the frame (where a foot flares out of
  the body) and the sharp edge sits at the true bottom (a flat contact
  edge, like a real plinth meeting the ground) rather than the reverse.
- **Placards shrunk back to the tighter of the two sizes this feature has
  used.** Two rounds ago introduced individually shrink-wrapped plates
  (~118px floor, "Acquisitions" itself rendering ≈152px under that
  padding); the round after that kept "one uniform size" but picked a
  more generous 214px. This round keeps "one uniform size" but reverts to
  measuring what "Acquisitions" actually needed under the ORIGINAL
  shrink-wrap padding — 122px of text + 15px/side padding ≈ 152px,
  rounded to a `width: 154px` floor-to-ceiling fixed size, applied to all
  seven. Confirmed via `scrollWidth`/`clientWidth` that "Acquisitions"
  still renders with zero text clipping at this size — it looks visually
  tight against the plate edges now, which is the correct, intended
  effect this round (not a bug to loosen back up).
- **360px corner-label safety margin actually IMPROVED this round** (28px
  gap, up from 22px last round) — the display case lost its heavy padding
  along with the abandoned molding, which gave back some of the width the
  molding had been eating into. Re-verified via the same
  `getBoundingClientRect()` measurement used in prior rounds, plus a
  zero-horizontal-overflow check at 360px.
- **Open questions carried over, still unresolved, still need Ray's own
  S25/tablet check**: the 13px drawer-open travel distance; the 27px
  corner-label text's single-label edge-clipping history (untouched this
  round). The "resting on the cap" open question from prior rounds is
  RESOLVED by this round's approach change — there's no longer a
  surface-contact illusion to verify, so that flag is dropped, not carried
  forward. **New, worth Ray's eyes**: whether the hung-picture-frame gap
  reads clearly as "hanging above" on a real screen — verified only in
  this environment's headless Chromium at 360px/412px.
- Verified headless: all 10 prior suites re-run clean, no assertion changes
  needed. Additionally spot-checked directly: zoomed screenshots of both
  caps confirming the two-tier facets read as opposite-direction slopes;
  a zoomed Acquisitions-plate screenshot plus a text-overflow measurement
  confirming the tighter size has zero real clipping despite looking
  visually tight; a 360px full-dashboard screenshot and overflow check.

**Sixth refinement pass (BUILT, same branch, still held) — 4 mechanical
fixes, no conceptual changes, reviewed live on phone and tablet.**
- **Display case hugs its content.** `.spotlight .flip-frame` gets a
  Spotlight-only `height: 234px` override (was inheriting the shared
  `.flip-frame`'s 280px, sized generously for Browse detail's own layout,
  not for this tighter hanging-frame context); `.spotlight`'s own vertical
  padding dropped `22px/14px` → `8px/8px`. Case height 374px → 294px.
  `.display-case`/`.display-case-glass`'s own padding (the frame's actual
  material thickness) is untouched — only the empty space around the
  coin/labels was trimmed, not the frame itself.
- **Drawers compressed** so all seven fit within a reasonable scroll
  (scrolling to reach lower drawers is expected/fine — the goal was
  trimming excess height, not eliminating scroll). `.drawer-face` vertical
  padding `16px` → `9px`, `min-height` `62px` → `46px`, `.drawer-plate`
  vertical padding `10px/6px` → `8px/5px`. Per-drawer height 81.5px →
  64.5px; full dashboard stage height (title + case + all 7 drawers)
  1102px → 795px combined with the case trim above.
- **Scroll-into-view on Back/Return to Dashboard, before the close
  animation plays, not after.** Previously `navigate()` always did a flat
  `window.scrollTo({top:0})` regardless of context — fine for entering a
  new section, but landing back on the Dashboard after scrolling deep into
  a section (or after the drawer-height compression above made the stack
  taller than one screen) could leave the closing drawer off-screen,
  animating invisibly. `navigate()`'s dashboard branch now calls
  `scrollIntoView({block:"center", behavior:"auto"})` on the relevant
  element FIRST, synchronously before adding `.closing` — instant, not
  smooth, deliberately: an animated scroll has no reliable "done" callback
  to key the close animation's start off of, so instant scroll removes the
  timing guesswork entirely rather than guessing a smooth-scroll duration.
  The final unconditional `scrollTo(top:0)` at the end of `navigate()` is
  now skipped whenever this targeted scroll already ran (`didTargetedScroll`),
  so it can't immediately undo the scroll-into-view a moment later.
- **Spotlight-tap exception, via a new dedicated flag, not reused from
  `lastDrawerView`.** The Spotlight coin tap calls `navigate("browse")` to
  show that coin's detail view — structurally indistinguishable from the
  Catalog drawer opening the same view, since both are `navigate("browse")`
  calls. A new `spotlightOriginated` flag is set immediately before that
  one call (Spotlight tap handler only), consumed the moment `navigate()`
  reads it (cleared same-call, so it can never leak into a later, normal
  navigation), and flips a stickier `scrollToCaseOnDashboard` flag instead
  of `lastDrawerView` — so a later Back/Home from that path scrolls to
  `.display-case` and skips the (nonexistent) drawer-close animation
  entirely, while a normal Catalog-drawer-originated visit to the same
  Browse view still closes Catalog correctly. Verified headless in both
  directions, plus with reduce-motion (scroll still happens; the `.closing`
  class is correctly never added).
- **Docket badge number recentered.** Measured first, not guessed:
  `getBoundingClientRect()` on the number's own text range showed the box
  was ALREADY perfectly centered (equal gaps all four sides) — the
  perceived "sits up-and-left" was Caveat's own rightward italic slant
  putting a numeral's visual ink off-center within an otherwise-correct
  box, not a flexbox bug. Fixed with `line-height: 1` (removes a small
  vertical mismatch between the font's line box and its glyph metrics)
  plus a small `letter-spacing`/`padding-left` compensation for the slant,
  rather than fighting the alignment properties that were already right.
- **Open questions carried over, still need Ray's own S25/tablet check**:
  the 13px drawer-open travel distance; the 27px corner-label text's
  single-label edge-clipping history (both untouched this round). **New,
  worth Ray's eyes**: the instant (non-smooth) scroll-into-view behavior on
  Back/Return to Dashboard — reads correctly in headless Chromium, but
  scroll snapping without any animation can feel more or less jarring on a
  real touchscreen than in a desktop browser; worth confirming it doesn't
  feel abrupt in hand. If it does, the fix would be a capped-duration smooth
  scroll instead, not a revert.
- Verified headless: all 10 prior suites re-run clean, no assertion changes
  needed. Additionally spot-checked directly: before/after case and drawer
  height measurements; a zoomed fob screenshot before/after the centering
  fix; two dedicated scroll-behavior scripts (drawer-close-scrolls-into-view
  from an arbitrary scroll position, Spotlight-tap-scrolls-to-case-instead)
  covering both normal and reduce-motion contexts; a 360px full-dashboard
  screenshot and overflow check.
- **Follow-up, same round: real vertical seam within several drawer faces,
  root-caused and fixed.** Ray's flag ("some grain on left side of drawers
  do not align") pointed at a genuine rendering artifact, confirmed by a
  zoomed screenshot of the drawer stack's left edge — grain lines visibly
  discontinuous partway across several drawer faces (Albums, Wishlist,
  Ledger, Acquisitions, Docket; Catalog and Sets looked clean). Diagnosed,
  not guessed: forced `--grain-dir` to `0deg` on every drawer via a
  browser-evaluated style override and re-screenshotted the same crop —
  the seam disappeared completely, isolating the cause to the per-drawer
  `--grain-dir` angle variation (±1–3deg off horizontal) a prior pass added
  for grain-direction variety. A `repeating-linear-gradient` painted at a
  shallow non-cardinal angle across a box much wider than tall has to tile
  diagonally, and at these box dimensions/DPI the tile boundary itself
  becomes a visible seam — a real limitation of that technique at this
  aspect ratio, not a fixable styling tweak. Removed the per-drawer
  `--grain-dir` overrides entirely; all drawer faces now share the
  horizontal `0deg` `.cabinet-drawers` already sets, leaving the per-drawer
  `--wood-hi/mid/lo` tint + `background-position` shift (unaffected, kept
  as-is) to carry "distinct board" on their own. Re-verified via the same
  zoomed left-edge crop post-fix: grain lines now run continuous and
  unbroken across every drawer face. `.wood`'s own internal 4deg/6deg-offset
  layers (used by the stiles, recess housing, and display case) were left
  untouched — those contexts are tall-and-narrow or moderate boxes with a
  near-vertical base grain-dir, which didn't show this artifact in the same
  screenshots, so there was nothing there to fix.

**Second follow-up, real S25 screenshot from Ray — two more issues, both
fixed, one a real regression from this round's own height trim.**
- **Corner labels overlapping the coin — a real regression, caught on
  Ray's actual phone, never reproduced in this environment's headless
  screenshots.** This round's `.spotlight .flip-frame { height: 234px }`
  (trimming dead space above/below the coin) only left 12px between the
  frame's own top/bottom edge — where corner labels anchor at `top: 10px`
  — and the 210px disc's own edge. A single-line corner (e.g. "1909-S")
  is already taller than that; a two-line corner (Type+Denom, e.g.
  "Lincoln" over "1C") is roughly 55-60px, guaranteeing overlap with the
  coin, exactly what Ray's screenshot showed. **Reverted to the shared
  280px** every other flip-frame use (Browse detail, etc.) already relies
  on with no such report against it — restores the full 35px clearance on
  each side, evidence-based rather than picking a new arbitrary smaller
  number that risks reproducing the same bug. The case is taller again as
  a direct, necessary tradeoff (stage height 903px → 950px — still well
  below the pre-this-feature 1102px baseline, since the drawer compression
  and the case's other padding trims are untouched). **This specific
  "flip-frame height vs. corner-label clearance" relationship is now
  flagged directly in the CSS comment** so a future pass doesn't
  re-attempt the same trim blind.
- **Docket badge still off-center — because the "fix" two rounds ago was
  itself wrong, not because centering was still broken.** That round's
  `letter-spacing`/`padding-left` nudge was a guessed compensation for
  Caveat's italic slant, eyeballed against this environment's own font
  rendering. On Ray's real device it pushed the number further right, not
  toward center (`padding-left` inside a `justify-content: center` box
  shifts the visible content right within the box, exactly matching his
  "shifted right" report). Removed both properties, kept only
  `line-height: 1` (a real, non-speculative fix — a line-box/glyph-metric
  mismatch, not guesswork). Re-verified via measurement across four
  different digit counts (5/19/20/100) — all come back with equal
  left/right gaps to well under a pixel, confirming plain flexbox
  centering was correct all along and needed no manual compensation.
  **Lesson for future passes**: don't hand-tune a "visual" nudge for a
  font-rendering perception (slant, glyph weight) based on this
  environment's own Chromium — font hinting/rendering varies enough across
  engines that a guessed compensation can just as easily overcorrect on a
  different device, as it did here.
- Verified headless: all 10 prior suites re-run clean. Directly
  re-measured: corner-label-to-disc clearance (35px each side, restored to
  match the safe 280px default) and fob text centering across four digit
  counts (all equal-gap). A 360px overflow/screenshot check and a full
  412px dashboard screenshot both re-confirm no regressions elsewhere.
  **Both bugs here were real-device-only** — neither reproduced in this
  environment's headless Chromium at any viewport tested, which is exactly
  why they slipped through the previous round's own headless verification;
  worth remembering next time a change trims spacing or hand-tunes a
  visual alignment; that class of change is the one this environment is
  least able to catch on its own.

**Third follow-up: wayfinding chrome button relabel + prominence (Ray's
explicit request, cosmetic/labeling only, no behavior change).**
- **"← Back" → "Back"** — arrow glyph removed, text unchanged otherwise.
- **"Return to Dashboard ⌂" → "Close Drawer"** — house glyph also dropped
  (not explicitly requested, but kept alongside the arrow removal above for
  visual consistency between the two buttons, and because a house icon no
  longer fit the new label). **The underlying behavior is completely
  unchanged** — this button is still `navigate("dashboard")`, a hard reset
  to the top from anywhere, same as documented everywhere else in this
  section (Acquisitions, a Spotlight-originated detail view, etc.) — "Close
  Drawer" is accurate when the current screen came from opening one of the
  seven drawers (the common case), but is a label of convenience, not a
  literal description, on paths that didn't originate from a drawer (e.g.
  the Spotlight click-through case, which scrolls to the display case
  instead of a drawer on this same button). Flagging this as a real,
  deliberate wording tradeoff Ray asked for, not an oversight — if it reads
  confusingly on a non-drawer path in practice, the fix would be a
  conditional label rather than reverting the rename.
- **Both buttons now share one unified, more prominent style** — both were
  already the same `.nav-chrome button` base rule (only `.home-btn` added
  `font-weight: 600` before), so making Back "more prominent to match"
  meant strengthening the shared rule itself, not diverging the two: solid
  gold-tinted gradient background (was `--bg-elevated` flat), brighter
  border (`--case-border-bright`, was the dimmer default), bumped
  `font-weight` 600→700 and padding/font-size up a notch. `.home-btn`'s own
  now-redundant `font-weight: 600` override was removed since the shared
  rule already sets 700.
- Applied identically to the interactive preview artifact (same relabel +
  styling), rebuilt and republished at the same URL. Verified headless:
  both buttons render with matching computed `font-weight`/`border-color`
  after the change (were previously visually mismatched, Back plain and
  Close Drawer bold), zero page errors, all 10 regression suites re-run
  clean (label-text assertions elsewhere in the suite target `.back-link`
  buttons — the hidden per-screen ones, unaffected by this — not the nav
  chrome pair, so nothing needed updating).

**Fourth follow-up: Dashboard title removed, Ledger heading relabeled,
Sets pills shortened + wrapped (Ray's explicit request, no merge yet —
this branch is now `main`, since the cabinet nav merge already landed).**
- **`.cabinet-title` ("Salty's Cabinet" `<h1>` above the display case) is
  deleted entirely**, markup and CSS both — Ray's ask was specifically to
  let the display case + drawer stack fit within a phone screen without
  vertical panning, and the title was the one full-width element not
  already trimmed by the earlier drawer/case height passes. The page
  `<title>` tag and the splash screen's own "Salty's Cabinet" `<h1>`
  (`.splash-title`, a different element) are both untouched — this only
  removed the Dashboard-level heading.
- **Ledger page's own `<h2>` heading, "Stats & Value" → "Ledger"** — matches
  the drawer's own label; the underlying view id (`view-stats`), function
  names, and every internal "Stats & Value" comment/reference are
  unchanged, this is a visible-heading-text-only change (same pattern as
  every other pure relabel in this file).
- **Sets tab category pills shortened** — `BROWSE_SET_CATEGORY_CHIPS`
  labels "Uncirculated Sets"/"Proof Sets"/"Silver Proof Sets"/
  "Commemorative Sets" → "Uncirculated"/"Proof"/"Silver Proof"/
  "Commemorative" (the word "Sets" dropped from each, since the row itself
  is already titled "Sets" via the tab — repeating it on every pill was
  redundant). `lineage`/`test` values driving the checklist/list logic are
  completely unchanged, label text only.
- **Even after shortening, six pills still didn't reliably fit one line on
  a phone width** (measured: 509px of content in a 380px row at 412px
  viewport) — every other `.filter-row` in the app scrolls horizontally
  when it overflows, but Ray specifically asked for no side-scrolling here.
  Rather than shrink padding/font further (fragile, and still not
  guaranteed to fit every phone), added a scoped
  `#browseSetsCategoryFilters { flex-wrap: wrap; overflow-x: visible; }`
  override so just this row wraps to a second line instead — every other
  `.filter-row` (Denomination, Metal, Commemorative toggle, etc.) keeps its
  existing horizontal-scroll behavior unchanged, since only this one ID is
  targeted.
- Four scratchpad regression scripts (`verify_checklist.js`,
  `verify_addset_track_individually.js`, `verify_addset_year.js`,
  `verify_visual.js`) matched Sets pills by their old exact label text
  (`"Proof Sets"`, `"Uncirculated Sets"`, etc.) — updated to the new short
  labels, not weakened; same "test scripts follow a real rename" pattern
  as every prior label change in this file. All 10 suites re-run clean
  after the update. Verified headless: cabinet-stage height (891.5px) now
  fits inside a 412×915 viewport with zero vertical overflow; the Sets
  pill row's `scrollWidth`/`clientWidth` are equal (was 509/380, genuinely
  overflowing) with zero page-level horizontal overflow; Ledger heading
  reads "Ledger". Not yet checked on Ray's own device.

**Fifth follow-up: Browse tab row retired, filters restructured (Ray's
explicit request — primary navigation is at the cabinet level now, so the
in-page top-level tab row is redundant).** This supersedes the whole
"Browse: navigation restructure"/"Medal tab"/"Missing Photos filter"
apparatus at the UI level (the underlying data model and tab-switching
plumbing are untouched — see the retain-plumbing note below).
- **Top-level Browse tab row (Coins/Sets/Albums/Medals/Rolls) removed from
  the UI entirely.** `#browseTabRow` is kept in the DOM but hidden and never
  populated; `BROWSE_TABS`/`activeBrowseTab`/`showBrowseTab()` are all
  retained as internal plumbing (Ray's "retain plumbing as you see fit").
  Sets and Albums are each reachable via their own cabinet drawer, so
  nothing is lost; Coins is the Catalog drawer; Medals and Rolls are
  relocated (below).
- **Page heading "Coins" → "Catalog"** (matches the Catalog drawer label).
  `showBrowseTab()` sets the title to "Catalog" for the coins tab.
- **Medal is a Denomination chip again, last in the row** — reverses the
  "Medals is its own top-level tab" phase (which itself had reversed an
  even-earlier "Medal is a Denomination chip" phase; we're back to that).
  Ray's framing: "treat it like a denomination." `coinsTabBaseRows()` now
  INCLUDES `denom==="Medal"` rows (was excluding them), a `{key:"Medal",
  label:"Medals"}` chip is appended to `BROWSE_FILTER_CHIPS`, and it
  OR-combines with the other denomination chips and ANDs with Metal/
  Commemorative exactly like any denomination. The medal-tab code path
  (`medalTabBaseRows`/`applyMedalTabFilters`, the `activeBrowseTab==="medal"`
  branch) is now dead-but-harmless (unreachable, since the tab row is gone)
  — left in place rather than ripped out, per retain-plumbing.
- **Bottom toolbar row is now Year / Commemorative / Rolls.** Commemorative
  moved out of its own `#browseCommemorativeRow` (deleted) into the toolbar
  as a static button (`#browseCommemorativeFilterBtn`); Rolls is a NEW nav
  pill (`#browseRollsFilterBtn`) — not a filter, it switches to the unique
  Rolls list page (`showBrowseTab("rolls")`) and sets Back to return to the
  Catalog grid (`setNavBack(() => showBrowseTab("coins"))`) so it isn't a
  one-way trip (Rolls has no cabinet drawer of its own — reachable only from
  here). Both the Commemorative and Rolls chips are Catalog-only (hidden on
  Sets/Rolls via `.filter-chip.hidden`, a new global rule); the Year chip
  stays on every tab.
- **"Missing Photos" Browse filter retired entirely.** Ray's call: missing-
  photo tracking already lives in the Docket (the Needs Attention hub lists
  each otherwise-complete record missing a photo as a dismissible row —
  `coinMissingPhoto()`, unchanged), so the standing Browse filter is
  redundant. The `#browseMissingPhotoFilterBtn` button, its listener, and
  its reset line are removed; `browseMissingPhotoOnly` stays declared
  (always `false`) so the `!browseMissingPhotoOnly || coinMissingPhoto(c)`
  terms in the various `apply*Filters()` functions stay harmless no-ops
  rather than needing every one edited. `coinMissingPhoto()` itself is kept
  (still used by the Docket).
- **Sets page: tab row + Missing Photos gone; category pills + scope
  dropdown + Year kept.** The category/lineage pill row (All/Uncirculated/
  Proof/Silver Proof/Commemorative/Other) and the Complete/Component/Premium
  scope dropdown are the Sets page's own filters (Ray: "those are
  effectively filtering the sets like metal or denominations do for coins")
  — untouched. Year stays (a real filter). The completeness-checklist
  feature is fully intact.
- **Catalog grid coin-flip corner-label font bumped 11px → 14px** (Ray's
  request) — `.coin-card .flip-frame-mini .flip-label`. The JS last-word
  shortening (`renderTypeDenomCorner`, measured via `scrollWidth`/
  `clientWidth`) still guards the one long field (series/type name). One
  single-word type name ("Washington") spills ~3px past its box into the
  empty corner space at the new size — not a clip (flip-labels have no
  `overflow:hidden`, per the corner-label history above) and not colliding
  with the coin; within accepted tolerance. `.set-child-grid`'s mini-flips
  are a separate rule, unchanged (Ray specified the Catalog page).
- **`verify_medal_tab.js` rewritten** to assert the new design (Medal as a
  Denomination chip, tab row gone, toolbar = Year/Commemorative/Rolls,
  Missing Photos gone, Rolls-pill→page→Back-to-Catalog) rather than the
  retired medal-as-tab behavior — following a real design change, not
  weakened. All 10 suites re-run clean.
- **Not yet checked on Ray's own device** — verified headless (412×915):
  Catalog title, Medals chip present + narrows to medal rows, Commemorative
  ANDs with Medals, Rolls pill→Rolls page→Back→Catalog, Sets page pills
  intact with no Missing Photos, zero horizontal overflow, bigger flip font
  renders without clipping.

**Sixth follow-up: Rolls page filter pills, Metal pill relabel/reorder
(Ray's explicit request).**
- **Rolls page sort dropdown removed, replaced with filter pills.** The old
  `#rollsSortSelect` (Year/Denomination/Value/Name sort) is gone. In its
  place, the Rolls page now has its own **Denomination pill row**
  (`#rollsFilters` — All/Cents/Nickels/Dimes/Quarters/Halves/Dollars, NO
  Medals chip since a roll is never a medal) and **Metal pill row**
  (`#rollsMetalFilters` — same 7-category set as Catalog), mirroring the
  Catalog page. Denomination multi-selects (OR); Metal is single-select;
  both AND with the shared Year filter. Independent state
  (`rollsSelectedDenomKeys`/`rollsMetalTest`) kept SEPARATE from the Catalog
  page's own filter state so switching between the two pages never
  cross-wires filters. `sortRollRows()` still runs with a fixed default
  order (`rollsSortKey = "year-desc"`, no longer user-changeable) so the
  list has a stable order; the variable/function are retained, just the UI
  control is gone. Reset in `resetBrowseFilters()` alongside the Catalog
  filters.
- **Metal pill "All Metals" → "All"** (Catalog and Rolls both — same shared
  `BROWSE_METAL_CHIPS`) — the metal names that follow already make the row's
  purpose clear, so the shorter label is enough.
- **Metal order: Platinum now before Gold** — `METAL_CATEGORIES` reordered
  to `["Platinum","Gold","Silver","Copper","Zinc","Clad","Other"]` (rarest/
  most-valuable first, Ray's call). `METAL_CATEGORY_INFO` is keyed by label,
  so the reorder doesn't affect the per-pill hover/tap constituent info.
- Verified headless (412×915): Rolls page has no sort dropdown, shows both
  pill rows, filters correctly (3 demo rolls → Quarters=1, Silver=3, Gold=0
  with the empty-state message), zero horizontal overflow; Catalog metal row
  reads All/Platinum/Gold/Silver/Copper/Zinc/Clad/Other. All 10 regression
  suites re-run clean (no test referenced the old label or dropdown).

**Seventh follow-up: Metal filter multi-select + per-page Year filter (Ray's
explicit request).**
- **Metal filter is now multi-select** (Catalog + Rolls), OR-combining
  exactly like Denomination — superseding the long-standing "Metal is
  single-select" lock-in noted throughout the Metal-filter sections above.
  Both pages hold a `Set` of selected category keys
  (`browseSelectedMetalKeys` / `rollsSelectedMetalKeys`, empty = "All") and
  `browseMetalTest()`/`rollsMetalTest()` became functions that OR the
  selected chips' tests. "All" clears the set; tapping a category toggles it.
  The whole metal group still ANDs with Denomination/Commemorative/Year. The
  constituent-composition toast now fires only when a chip is being turned
  ON (not off). `updateMetalChipsUI(containerId, selectedKeys)` is a shared
  helper for both rows' active-state rendering.
- **Year filter is now per-page** — it no longer carries over between the
  Catalog and Rolls pages (Ray's call). Superseded the earlier "Year state
  is shared/global across Coins/Rolls/Sets" model. Replaced the two global
  `yearFilterBegin`/`yearFilterEnd` vars with a per-tab store
  (`yearFilterByTab[activeBrowseTab] = {begin,end}`); `currentYearFilter()`
  returns the active tab's own state, and `yearRowTest()`, the Year overlay
  (open/apply/clear), and `updateYearFilterButtonUI()` all read/write through
  it. `showBrowseTab()` refreshes the Year button on every tab switch so it
  reflects the newly-active tab's own year. Sets keeps its own independent
  year too (falls out of the per-tab model for free). `resetBrowseFilters()`
  (external Browse entry) clears every tab's year. NOTE: the input element
  IDs `#yearFilterBegin`/`#yearFilterEnd` are unrelated (the overlay's number
  inputs) and unchanged — only the JS state vars were replaced.
- Verified headless: Catalog Silver+Copper both active → grid = silver-OR-
  copper rows (11, matching the predicate); Catalog Year=1916 while Rolls
  shows no year, Rolls Year=1964 → 1 roll, returning to Catalog still shows
  1916; external Browse entry clears both. All 10 regression suites clean.

**Eighth follow-up: Catalog search, result count, Rolls-as-icon (Ray's
explicit request).**
- **Catalog search box** (`#browseSearchInput`, inside `#browseCoinsHeader`
  so it's Catalog-only, hidden on Sets/Rolls automatically). Live-filters as
  you type via `browseSearchTest()` — case-insensitive substring against
  CollectionID, name/series, year, denomination, mint mark, variety, and
  grade. ANDs with the pill filters (added as another term in
  `applyCoinsTabFilters()`). Cleared by `resetBrowseFilters()` (external
  Browse entry). Search is Catalog-only for now (Rolls has few rows and no
  search; Sets has its own category model) — an easy add elsewhere later if
  wanted.
- **Result count** ("Showing X of Y", `#browseResultCount`) above the grid —
  `setBrowseResultCount(shown, total)` where total is that tab's full base
  row-set. Updated in `applyCoinsTabFilters()` and `applyRollsTabFilters()`;
  **hidden on the Sets tab** (its checklist/list split makes a single owned-
  count misleading — toggled in `showBrowseTab()`).
- **Rolls is now an icon button, not a text pill** — Ray's call: a dedicated
  cabinet drawer felt like too much for a rarely-visited, low-count section,
  so it's a small 🪙 icon (the app's established roll glyph) styled like the
  grid/list view-toggle icons, sitting just left of them in the toolbar's
  right group. Same id (`#browseRollsFilterBtn`), same behavior as the old
  pill (Catalog-only via `showCatalogTools`; switches to the unique Rolls
  page; Back → Catalog). `title`/`aria-label` "Rolls" cover the
  discoverability gap of an icon with no text. Needed a new
  `.view-toggle-btn.hidden { display:none }` rule so it hides on Sets/Rolls
  like the old `.filter-chip` did. The toolbar left group is now just
  Year + Commemorative.
- `verify_medal_tab.js` updated: the old "toolbar shows Year/Commemorative/
  Rolls chips" assertion is now "Year/Commemorative chips + Rolls is a
  separate icon button," plus new assertions for the search box and result
  count. All 10 suites clean (17/17 in that suite).
- Verified headless (412×915): search by name ("morgan"→1) and by ID
  ("AY-00003"→1), search ANDs with a denomination pill, count tracks
  ("Showing X of 17"), Rolls icon renders + navigates + hides on the Rolls
  page, count hidden on Sets, zero horizontal overflow.

**Ninth follow-up: plain Rolls glyph, search box repositioned, Back-button
bug fix (Ray's explicit request + a real bug he found).**
- **Rolls icon glyph: 🪙 → ◉** — the emoji rendered in full color regardless
  of button styling, standing out from the monochrome ▦/☰ view-toggle icons
  next to it. `◉` (Geometric Shapes block, no default emoji presentation)
  renders in the button's own `currentColor` like the other two, so all
  three now read as one consistent icon set. `title`/`aria-label` "Rolls"
  unchanged — still the only textual cue, since the icon itself is now
  fully abstract.
- **Search box moved onto the title row, right-justified, smaller.** Pulled
  `#browseSearchInput` out of `#browseCoinsHeader` (its own row above the
  Denomination pills) into a new `.browse-header-row` flex container shared
  with `#browseTitle` — `justify-content: space-between` puts the title left
  and search right. Width capped narrow (`flex: 0 1 130px`, was full-width),
  padding/font-size reduced (`6px 10px`/12px, was `10px 14px`/14px).
  Placeholder shortened "Search by ID, year, or name…" → "Search…" to fit
  the narrower box (the fuller description moved to `aria-label` only, so
  screen readers still get it). Since the input no longer lives inside
  `#browseCoinsHeader`, its show/hide is now set directly in
  `showBrowseTab()` (`.hidden` class, new `.browse-search.hidden` rule) —
  same Catalog/Medal-only condition as before, just applied to the element
  directly instead of inheriting from its old parent's display toggle.
- **Real bug, found and fixed: Back stopped working after Rolls → Catalog.**
  Ray's report: navigate Catalog → Rolls (via the icon) → Back (correctly
  returns to Catalog) → Back again — expected the Dashboard, got nothing.
  Root cause: the Rolls icon's click handler did
  `setNavBack(() => showBrowseTab("coins"))` and never re-armed `navBack`
  afterward — so once back on Catalog, `navBack` was STILL "go to coins,"
  and tapping Back again just re-ran that (already there, so it looked like
  Back had silently stopped working) instead of falling through to
  `navigate("dashboard")`, which is what Catalog-as-section-root should do
  (same rule `showBrowseGrid()`'s own `setNavBack` already documents).
  Fixed: the handler now re-arms `navBack` to the Dashboard the moment it
  lands back on Catalog — `setNavBack(() => { showBrowseTab("coins");
  setNavBack(() => navigate("dashboard")); })`. A new regression assertion
  in `verify_medal_tab.js` covers the exact repro (Catalog → Rolls → Back →
  Back → must reach Dashboard) so this can't silently regress again.
- Verified headless: Rolls glyph reads `◉`; search box sits on the title row
  (same top offset as `#browseTitle`, right-aligned, 130px wide) and still
  filters correctly from its new position; the full Catalog→Rolls→Back→Back
  sequence now reaches the Dashboard on the second tap (was stuck on
  Catalog). All 10 suites re-run clean (18/18 in `verify_medal_tab.js`).


### Initial splash screen (BUILT and merged to main — real data-readiness gating)
On load, a full-screen branded splash (`#splashScreen`) covers the app —
"Salty's Cabinet" title, a spinning coin disc, and a "Connecting to
OneDrive…" status line — while `ensureLiveNavDataFetch()` (the same real
`Promise.all` — All/DB_Sets/DB_Coins/Lookup_MetalContent/Lookup_Graders,
plus Photos/Receipts/Albums/Wishlist — every other live surface in this app
already waits on) is genuinely in flight, then fades out to reveal the
Dashboard underneath. The rest of the app has already rendered underneath by
the time this runs, since it's wired in right after `navigate("dashboard")`
in the normal synchronous init sequence — that call already kicks off the
exact same fetch, so `runSplashConnect()`'s own `ensureLiveNavDataFetch()`
call is a dedup'd no-op that just races the ALREADY-in-flight promise, not a
second fetch.
- **Superseded: this used to be a bare `SPLASH_SIMULATED_DELAY_MS` (1.4s)
  timer, completely decoupled from real data** — there was no live
  connection to gate on yet at the time this was built. `runSplashConnect()`
  now hides the splash **as soon as `ensureLiveNavDataFetch()` resolves**
  (never waiting out the full ceiling if it's faster), with a fixed **5s
  timeout** (`SPLASH_DATA_TIMEOUT_MS`, **may be refined after live
  testing**) as the safety net if it hasn't. `ensureLiveNavDataFetch()`
  always resolves — it never rejects (its own `.catch()` returns `false`) —
  so "resolves" is the real gate, not "succeeds": a `false` answer (e.g. no
  signed-in session yet, the same "no answer yet, will retry" case every
  other Graph-token consumer in this file already treats as normal) still
  hides the splash, exactly like every other real-Graph feature in this app
  degrades gracefully rather than erroring on a missing token.
- **Error state, now genuinely reachable, not just a dev toggle.** If the
  fetch hasn't resolved within the 5s ceiling, the splash falls back to its
  existing "⚠️ Couldn't connect" card with a real Retry button — clicking
  Retry re-calls `ensureLiveNavDataFetch()` (which, per the dedup rule
  above, either returns the still-pending original promise or starts a
  genuinely fresh one if that one already settled false) and races it
  against a fresh 5s timer. A `settled` guard means a fetch that finally
  resolves AFTER the timeout already showed the error box does NOT silently
  hide it again out from under the user — the error state is sticky until
  an explicit Retry (or the page reloads).
- **The error text is still generic, deliberately** — it doesn't yet
  distinguish sign-in-expired vs. offline vs. workbook-locked-elsewhere;
  building that per-cause diagnostic is separate, still-open work. What
  changed here is that the RETRY MECHANISM is now real (a genuine second
  attempt against live data), not that the message itself got smarter.
- **`?splashError=1` still exists, unchanged in spirit** — a dev-only URL
  toggle that forces the error path on demand for testing/demoing it,
  deliberately NOT real-data-gated (so it shows the same thing regardless of
  actual connection state), on its own short fixed demo delay
  (`SPLASH_ERROR_DEMO_DELAY_MS`, 1.4s — kept separate from the real 5s
  ceiling so the two can be tuned independently).
- **Verified headless** (`tests/verify_splash_and_album_prefetch.js`,
  Part 1 blocks A–E): the splash has already hidden itself well inside the
  ceiling in this environment's normal (fast, no-MSAL) fetch resolution;
  hides exactly when a stubbed fetch resolves, not before and not on a
  fixed timer, including a `false` outcome; the error box appears at
  ~5000ms (not before, not much after) when the fetch never resolves, with
  the splash overlay itself staying up; a late resolution after the timeout
  does NOT silently hide an already-shown error box; and `?splashError=1` +
  Retry still work. Full write-up with the Part 2 (album-open prefetch)
  work below.

Dashboard still has no summary stat cards on the front itself (Total Coins /
Est. Value inline were tried and dropped early on — not useful up front). That's
a different decision from having a **dedicated, opt-in Stats & Value tab**
reachable via a tile (see below) — the tab is fine, front-loading its numbers
onto the Dashboard directly is what was rejected.

Dashboard composition: pending-coin banner (only when one exists), Spotlight,
then a single flat **"Go To" tile grid** — Browse, Albums, Wishlist, Add Coin,
Stats & Value, Batch Receipt, Needs Attention, all as equal tiles. There used to
be a separate "Quick Actions" section below the Go-To grid for Batch
Receipt/Needs Attention — that's gone; everything reachable from the Dashboard
now lives in one grid rather than two visually separate tiers. Needs Attention
carries a live count badge on its tile, same as before.

**Spotlight auto-rotates a coin's own obverse then reverse before advancing to
the next coin** — not straight from coin to coin every tick as before. Same
placeholder disc (no real photos yet), visually distinguished by a mirrored
highlight position (`.reverse-face`) so it reads as "the coin turned over"
rather than a different coin; corner labels (Year-Mint/Series+Denom/Grade)
stay the same on both faces since they describe the coin, not which face is
showing. Clicking a dot jumps straight to that coin's obverse.

**The Spotlight flip-frame itself is click-through** — tapping the
currently-displayed coin (read live off `spotlightIndex` at click time, not a
value captured once at init, since the carousel keeps rotating) opens that
coin's Browse detail view, same `showBrowseDetail()` destination as clicking
a coin from Browse. Back returns to the Dashboard (`browseDetailBackHandler`
set to a Dashboard-specific closure before navigating), not Browse's own
grid — same per-origin back-handler pattern Albums' filled-slot tap already
uses.

Wishlist mirrors Browse's grid-then-detail shape: tapping an item opens a detail
view with an editable Notes field (for things like "found one, negotiating
price"), plus Purchase Info and Photos drill-down sections for once Ray's
actually bought it. This does **not** promote/convert a Wishlist item into an
owned coin with a CollectionID — that's a separate, unbuilt feature; the detail
view just lets a want-list entry carry richer information while it's still a
want-list entry.

A **"🔎 Found it — Add to Collection" button** on the Wishlist detail view jumps
to Add Coin and prepopulates Denomination/Year/MintMark/Variety from the
Wishlist item's structured fields (`denom`/`year`/`mint`/`variety` — Wishlist
rows need these alongside the existing free-text `desc`/`notes` display
string). Description is left to the existing auto-fill mechanism rather than
parsed out of `desc`, since `desc` is a full display string ("1916-D Mercury
Dime"), not a clean series name. This still doesn't convert or remove the
Wishlist item — same non-promotion boundary as above; it just saves retyping
what the want-list entry already knew.


### Splash: the Docket queue can no longer block the whole app (BUILT and merged to main)
The actual regression behind "Couldn't connect," Retry-does-nothing —
found by direct investigation of the one substantial thing this branch's
splash flow adds that `main` doesn't have at all: `docketQueueReady()`/
`loadDocketQueue()` (the Docket-badge gap fix, see that section above).

**Root cause.** That fix folded `docketQueueReady()` into the SAME hard
`Promise.all([ensureLiveNavDataFetch(), docketQueueReady()])` gate
`ensureLiveNavDataFetch()` already had, reasoning "both are genuinely part
of is-the-app-ready, so one unified gate is simpler than racing two
independent timers." **That reasoning was wrong, and is what this fix
corrects.** The Docket badge (a fob count) is comparatively low-stakes —
nothing Catalog, Browse, Add Coin, or any other real feature depends on
it — but folding it into the hard gate meant a persistently failing or
hung `_Docket/docket.json` request could block the ENTIRE APP behind the
splash forever. Two concrete ways that request can fail this way, either
one fully explaining the symptom without requiring a device log to
confirm: (a) a genuinely hung `fetch()` — this codebase has no
`AbortController`/timeout anywhere, so a request that never gets a
response never resolves `loadDocketQueue()`'s promise, which means
`Promise.all(...)` itself never resolves, which means `attempt()`'s own
`.then()` never fires to schedule a retry — the whole loop silently stalls
on its very first attempt until the unrelated outer 5s timer fires; or (b)
a deterministic parse/shape failure against Ray's REAL `_Docket/docket.json`
content (this project has real precedent for exactly this class of bug —
see "The AllCoins table is 987 rows longer than its data" and the
SpotValue/Total formula-flattening incident elsewhere in this file) —
`res.json()` throwing on malformed JSON is caught and returns `null`
cleanly (not a hang), but since the SAME broken file is read identically
on every retry, `docketQueueReady()` returns `false` on every single
attempt within the window, exhausting the full 5s just as surely as a
genuine hang would, and Retry repeats the identical failure forever since
nothing about clicking it changes what's wrong with that one file. Either
mechanism produces the exact reported symptom and the exact reason Retry
never helps; both are fixed by the same change.

**Fix: give the Docket half its own, shorter, non-blocking grace
period — `SPLASH_DOCKET_GRACE_MS` (2000ms) — raced against the real
`docketQueueReady()` call, via a new `docketQueueReadyWithGrace()`.**
Whichever settles first wins; the timeout side always resolves `true`
("proceed without it"), never `false`. `Promise.all([ensureLiveNavDataFetch(),
docketQueueReadyWithGrace()])` now only ever waits on the Docket half for
up to 2s — after that, the splash's hide/retry decision depends on
`ensureLiveNavDataFetch()` (the app's actual real data) alone, exactly
the same "additive, must never block the rest of the app" rule
`ensureLiveNavDataFetch()` itself already applies to Photos/Receipts/
Albums.
- **The real fetch is NOT aborted or cancelled** — `loadDocketQueue()`
  keeps running in the background exactly as before (it already has its
  own in-flight dedup, so racing it costs nothing extra); if it does
  eventually resolve, `LIVE_DOCKET_QUEUE` gets populated for real and
  `updateDocketFob()`'s own existing mechanism — already fired once at
  launch via `renderNeedsAttentionHub()`, completely independent of the
  splash — shows the real count whenever/if that lands, same as it always
  has.
- **The common/working case is unaffected in practice.** A normal Graph
  GET is typically well under 1s, comfortably inside the 2s grace window,
  so the Docket badge stays synchronized with the cabinet appearing —
  preserving the whole point of the original Docket-badge-gap fix — for
  every ordinary boot. Only a genuinely broken/hung request now degrades
  gracefully instead of blocking forever.
- **2000ms was chosen, not derived**: long enough that a normal request
  lands inside it in the ordinary case: short enough that a broken one
  can't meaningfully delay the app, and comfortably inside the outer 5s
  ceiling with room for at least one more retry if `ensureLiveNavDataFetch()`
  itself is still the slow half. Worth revisiting after a live pass if it
  turns out too tight or too generous.
- **`docketQueueReady()` itself is untouched** — same function, same
  "feature off = immediately ready" / "empty first-run docket = a real,
  cacheable, non-null answer" rules as before. Only how the splash's
  `attempt()` USES its result changed.

**The diagnostic-detail work from the same dispatch is kept, per the
task's own instruction — still useful for confirming the next live-device
pass, even though it wasn't what surfaced this particular root cause**
(that came from direct code investigation prompted by the A/B test, not
from a captured error string). `#splashErrorDetail` (a `<pre>`, small
monospace text under the existing friendly message, never replacing it)
shows a real technical dump whenever the error box appears:
- **`liveNavDataDiagnostics`** (keyed by sheet name: `All`, `DB_Sets`,
  `DB_Coins`, `Lookup_MetalContent`, `Lookup_Graders`, `Photos`,
  `Receipts`, `Albums`, `Wishlist`) — each entry is `pending` (set at the
  very top of `fetchWorkbookSheetRows()`, before anything is awaited, so a
  request that never resolves at all shows up honestly as "still in
  flight" instead of silently keeping a stale success from an earlier,
  faster attempt), `no-token`, `http-error` (with the real status code),
  `exception` (with the real caught message), or `ok` (with the real row
  count).
- **`liveNavDataProcessingError`** — set only when every individual sheet
  fetch already succeeded but the `Promise.all(...).then(...)` processing
  block in `ensureLiveNavDataFetch()` (the mapping/join logic building
  `LIVE_COINS` etc.) then throws. This is the "got data back but it was
  malformed" case the diagnostic task specifically asked to distinguish —
  an unexpected real-data shape choking a mapper function, e.g. Cleared at
  the top of every genuinely new fetch attempt.
- **`docketQueueDiagnostic`** — the same shape for the single
  `_Docket/docket.json` fetch, with an added `disabled` kind for the
  (expected, not-a-failure) case where the write layer itself is off.
  `RealGraphClient.getJson()` throws one of exactly three distinguishable
  message shapes (`"Write layer unavailable."` / `"GET json ... failed:
  <status>"` / a raw network exception) — parsed into the same
  `no-token`/`http-error`/`exception` vocabulary rather than re-deriving a
  second token check.
- **`buildSplashDiagnosticText()`** builds the headline classification —
  distinguishing exactly the three cases the diagnostic task asked for
  ("never got a token at all" / "got a token but the request(s) failed" /
  "got data back but it was malformed"), plus a fourth signal worth having
  ("at least one request is still pending/hung") — followed by the
  per-sheet + Docket-queue dump. `ENABLE_LIVE_NAV_DATA` being off is
  checked too, though it can't be exercised at runtime (a hardcoded `const
  true` by design, per "Real-Graph flags always on") — covered by a
  source-text guard instead of a live override.
- The `?splashError=1` dev-only demo toggle gets its own honest detail
  text ("no real fetch was attempted") rather than showing a stale or
  misleading dump, since that path never runs a real fetch at all.

**Verified headless — new committed suite
`tests/verify_splash_docket_regression.js` (26 assertions), all passing;
1480 across all 35 suites, zero failures, zero page errors.** Covers: the
grace constant's sanity (positive, shorter than the outer ceiling, a
reasonable share of the 5s budget); **the actual fix, driven through the
real `runSplashConnect()`** with `ensureLiveNavDataFetch()` stubbed to
succeed immediately and `loadDocketQueue()` stubbed to never resolve (the
worst case) — confirming the splash genuinely hides well inside the grace
window rather than sitting blocked for the full 5s, with the error box
never shown; a **negative control** reproducing the exact pre-fix hard-gate
formula against the identical stubbed functions, confirming that formula
genuinely never resolves within the same window (proving the positive
assertions exercise a real fix, not a tautology, and reproducing the exact
reported hang); every `describeDiagnosticEntry()` shape; `buildSplashDiagnosticText()`'s
headline classification for all three requested cases plus the pending/hang
signal, each verified against its own real per-sheet dump; the
`ENABLE_LIVE_NAV_DATA` source-text guard; the `?splashError=1` demo path's
honest "nothing real was attempted" text, driven end-to-end; and a nav/
overflow smoke check. New test-only setter seams
(`__setLiveNavDataDiagnosticsForTest`, `__setLiveNavDataProcessingErrorForTest`,
`__setDocketQueueDiagnosticForTest`) mirror the existing getters, since
these diagnostics live in module-scoped `let`/`const` bindings a test can't
reach any other way.
- **Not verified: any real device.** This directly addresses a confirmed
  live-blocking issue, so — per the standing rule for exactly this class of
  fix — it needs Ray's own live-device pass before merge, same as every
  other item still held on this branch. Worth specifically confirming: (1)
  the app genuinely becomes usable now even if the Docket badge itself
  stays at a stale/zero count for a beat; (2) whether `docket.json`'s real
  content or the folder path turns out to be the deeper issue, in which
  case the diagnostic detail text (still shown if the OVERALL 5s ceiling is
  ever hit for some other reason) is what would confirm which of the two
  hypothesized mechanisms (hang vs. malformed content) it actually was.


