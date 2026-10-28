# Reference: DOCKET_STAGING (moved out of CLAUDE.md)

Read this file when: touching the Docket, the Needs Attention hub, Staging Review, or their Re-check / Force Add / Dismiss buttons.
Rules that stayed in CLAUDE.md (not in this file): "Phase 2 promote: duplicate-row bug" (continuation in docs/HISTORY.md), "Item 5 — Force Add's orphan blank row", "CollectionID-reservation system — Promotion / Rejection", and "docket.json handling".
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

### Needs Attention hub (BUILT and merged to main). Supersedes the old flat
"Needs Attention queue" below, which is kept only for history.
The Dashboard's "Needs Attention" tile is now a consolidated hub
(`renderNeedsAttentionHub()`) replacing Staging Review and In Progress Sets as
**separate dashboard tiles** — both of those screens (and their internal
promote/reject / resume logic) are **completely untouched**; they just lost
their own front door and are reached via a link/row from inside the hub
instead (`navigate("staging")` / `navigate("inprogresssets")`, both pre-
existing). Their Back buttons now return to the hub (`needsdbcoins`) rather
than skipping past it to the Dashboard, since the hub is their only entry
point now.

Two sections, split by **why** something is stuck, not what kind of record it
is:
- **"Needs your action"** — things only Ray can finish or decide:
  - An aggregate row, **"N Set(s) in progress"**, if any Set draft has
    `status="Draft"` — taps through to the untouched In Progress Sets screen.
    Status alone decides this (not `researchNote` content) — every new Set
    draft carries a "GSID pending" note by design (see "Add Set" above), so
    using that to classify would wrongly route every in-progress Draft into
    the research section below.
  - An aggregate row, **"N coin(s) awaiting your decision"**, if any
    coin-side `FAKE_STAGING` row has a confident DB_Coins match (nothing left
    to resolve but Promote/Reject) — taps through to the untouched Staging
    Review screen.
  - **Dismissible photo gaps** — one row per otherwise-complete record
    missing a photo (`coinMissingPhoto()`, see Missing Photos below),
    each with its own **Dismiss** button, permanent, no snooze/resurface
    (Q1). **Rolls never get a gap row here** (Q5b) even though they still
    show up in the standing Missing Photos audit filter.
    - **Coin-side dismissals are ephemeral** (`dismissedCoinPhotoGaps`, an
      in-memory `Set` of CollectionIDs) — resets on reload, consistent with
      the rest of the still-unwritten Add Coin/coin-Staging path (Q2). This
      was a deliberate choice, not an oversight: building real persistence
      for Add Coin's mockup was explicitly out of scope for this task.
    - **Set-side dismissals are real** — a new `dismissedGaps: []` array on
      the Set draft itself (`dismissSetDraftGap()`), persisted via the same
      write layer Add Set already has (Q2). Checked on `Draft` and
      `Complete — pending research` drafts (missing `wholeSetPhoto`); a
      `Promoted` draft is done/externally-reconciled and out of scope here.
- **"Waiting on Copilot research"** — anything stuck for a *research* reason,
  each row paired with the "Open workbook in Excel" link (see below):
  - Coin-side `FAKE_STAGING` rows with **no** DB_Coins match
    (`findDbCoinsMatch()`, factored out of the Add Coin form's own
    `checkDbCoinsMatch()` so both use the identical denom+year+mint+variety
    rule rather than two copies of it).
  - The original flat `FAKE_NEEDS_QUEUE` backlog (already-saved coins with no
    DB_Coins match) — unchanged data/push logic, just relocated into this
    section instead of its own flat list.
  - Set drafts with `status="Complete — pending research"` — matches the
    original spec's literal wording (Sets/Coins with that status), extended
    to coins via the "no DB_Coins match" heuristic above since coins have no
    literal status field of their own.
- **Dashboard/Docket badge = a total across BOTH sections** (Ray's call,
  Aug 11). Reasoning: a research item still needs Ray to hand it to Copilot
  and then reconcile the result, so it IS his action — just a different kind
  — and an item sitting in the Docket uncounted reads as "nothing to do
  here" when there genuinely is. **This is the third and current state of a
  decision that has flipped twice**: originally a sum (inherited from the
  flat-queue badge), then narrowed to "Needs your action" only when the hub
  split actionable from research-bound ("the badge should only reflect
  things Ray can actually resolve himself"), and now back to a sum on the
  reasoning above. Implemented as `actionRows.length + researchRows.length`
  in `renderNeedsAttentionHub()`, feeding both `#needsAttentionBadge` and
  `updateDocketFob()`.

**"Open workbook in Excel" link (Task 2, plain link only — the `ms-excel:`
desktop-preferred variant was explicitly marked a nice-to-have and NOT
built).** `RealGraphClient.getWorkbookWebUrl()` does a single read-only GET
on the workbook's own Graph metadata (whichever workbook `WRITE_TARGET`
currently points at — the `_Testing` copy or eventually live) and returns its
`webUrl`; `getCachedWorkbookWebUrl()` fetches this **once per session** and
caches it (a test-only `__resetWorkbookWebUrlCacheForTest()` seam exists
since the cache would otherwise outlive a test's mock-client swap). Shares
the SAME gated write-layer MSAL instance Add Set already uses
(`ENABLE_SET_WRITE_LAYER`/`getWriteToken()`) rather than standing up a third
auth instance — so this link is subject to the identical safety posture:
disabled/localhost-only until the same production-redirect-URI prerequisite
is met, degrading to one explanatory note ("Workbook link unavailable...")
instead of a broken link when unavailable. **Not verified against a real
OneDrive session** — Ray's live-run needs to confirm the link actually lands
in an *editable* Excel session for the file owner, not a read-only preview
(see the open items list at the end of this section).

**Missing Photos — a standing, always-available Browse filter (Q6), separate
from the hub above.** A new `browseMissingPhotoOnly` boolean toggle chip
shares the Year filter's toolbar row on Coins/Rolls/Sets (same ANDs-with-
everything-else pattern, same reset-on-external-Browse-entry). `coinMissingPhoto(coin)`
is the single shared predicate both this filter and the hub's dismissible
gaps use: **missing = BOTH obverse and reverse absent** for an ordinary
coin/Roll (Q5a — either one present means "not missing"); a Set-bundle row
(`denom==="Multiple"`) only ever has one representative photo, so only that
one flag is checked. **Rolls are included here** (Q5b — "informationally," in
Ray's words) even though they're excluded from the hub's nag list; this
filter never looks at hub dismissal state at all, by design — it's a pure
audit, not a to-do list.
- **New sparse demo fields, `hasObversePhoto`/`hasReversePhoto`, on a handful
  of `FAKE_COINS` rows only** (AY-00001, AY-00003 both true; AY-00004
  obverse-only, deliberately exercising the "one photo present = not
  missing" rule) — same sparse-lookup convention as `FAKE_METAL_CONTENT`/
  `FAKE_COIN_DETAILS` elsewhere in this file. **This is a real, flagged
  interpretive call, not a neutral default**: since no coin in this mockup
  has ever had a real persisted photo (see "What NOT to build"), the
  *honest* answer today is that every non-Roll owned row is "missing" —
  which would flood the hub with ~20 dismissible rows at once (confirmed via
  screenshot during build). Marking a few rows as "has a photo" keeps the
  hub demo readable, matching how every other sparse `FAKE_*` lookup in this
  file already handles "not all data exists yet," but it's worth Ray's
  explicit sign-off rather than assuming it's the right call long-term —
  whichever real OneDrive CoinPhotos-presence check eventually replaces this
  should preserve the same two-flag *meaning*, not this literal field.

**Add Set's Dashboard icon changed to 🧩** (from 📦, which collided with the
Sets browse tile — Q7, Ray's "your judgment, just keep it distinct"). 🧩 was
already free (previously In Progress Sets', which lost its own tile in this
same change).

**Reused vs. newly written:** REUSED — `writeSetDraft`/`readSetDraft`
unchanged, the existing Staging Review and In Progress Sets screens
completely untouched internally, the `.wish-item`/`.staging-btn` CSS (no new
classes needed), the Year filter's toolbar-sharing pattern (mirrored exactly
for Missing Photos), `checkDbCoinsMatch()`'s matching rule (extracted into
`findDbCoinsMatch()`, called by both the live form and the hub). NEW —
`renderNeedsAttentionHub()` and its two-section render logic,
`dismissedCoinPhotoGaps` / `dismissSetDraftGap()` / `dismissedGaps` on the
draft schema, `coinMissingPhoto()`, `getWorkbookWebUrl()` /
`getCachedWorkbookWebUrl()`, the Missing Photos toggle, and the sparse photo
demo fields.

**Open items needing Ray's live confirmation or sign-off (flagged, not
resolved by headless testing):**
1. Does the "Open workbook in Excel" link actually land in an *editable*
   Excel Online session for the file owner, not a read-only preview? Same
   "needs a real click-through" caveat as the original Task 2 investigation.
   **Still open** — needs Ray's own live click-through, not resolvable from
   this environment.
Item 2 (sparse `hasObversePhoto`/`hasReversePhoto` demo fields) is
**CONFIRMED by Ray**: approved as-is — confined to the `FAKE_COINS` demo
layer, no real-data impact, resolves itself once real photo data lands at
go-live. Item 3 (badge semantics) is resolved — see "Dashboard badge"
above. Both removed from this list.
Verified entirely headless (36 new assertions across two suites — hub
sections/dismissal/badge math, and the Missing Photos filter/webUrl
degradation), plus the full 189-assertion prior suite re-run clean — 225/225
total, zero regressions; badge math re-verified again post-merge against the
merged tree after the "action-only" change. No live OneDrive session was
available this session
(Ray offline) — items 1 above specifically needs his own click-through,
consistent with how the original write-layer work also had a Ray-only live
step.


### Docket research queue: durable + resolvable (BUILT and merged to main)
**Merge status correction:** this section previously read "held on branch
`claude/docket-identity-matching`, NOT merged — awaiting Ray's go-ahead."
The full live-test checklist (Parts A–G plus E2) passed against the real
`_Testing` copy workbook — see `docs/DOCKET_LIVE_RUN_CHECKLIST.md`'s own
"Live-test status: COMPLETE" note for the full run, including the two bugs
found and fixed along the way (the designation/gradeSource Re-check gap,
and the reload double-render race) and Part F's clarified non-bug. Ray
gave explicit merge go-ahead and the branch was merged to `main`. **`main`
is now the source of truth for this feature**, same standing as every
other merged-after-holding branch in this file. The local-only
dev-flags-override mechanism and the Add Coin banner-wording fix that
landed on the same branch are part of this merge too — see their own notes
below.

First piece of the Docket identity-matching work. The "Waiting on Copilot
research" queue was `FAKE_NEEDS_QUEUE` and nothing else — a plain in-memory
array, seeded with two demo rows, appended to by Add Coin's save and Browse
Edit's CoinID re-link, **append-only with no code path that could ever
remove an entry**, and gone on reload. So a coin stayed flagged for the life
of the page even after Copilot added the DB_Coins row that resolved it.
This adds a durable store, a Re-check action, and a dismiss-with-reason.

**Gate: `ENABLE_DOCKET_WRITE = false`** — its own flag, same
localhost-dev-only posture as every other real-Graph flag, and added to
`WRITE_LAYER_ENABLED` (it writes a Staging file AND, on a confirmed
Re-check, one CoinID cell). With it off, everything behaves exactly as
before on `FAKE_NEEDS_QUEUE` — that's what keeps the shipped build working
unchanged, and it's asserted.

**Which "Staging" this writes to — a real discrepancy with the request's
own wording, resolved deliberately.** The task said "write to the Staging
**sheet** via the existing real Staging write path." Those are two
different things in this project and only one of them exists:
- the Staging **SHEET** (the Excel tab mirroring All's columns) is still
  entirely `FAKE_STAGING`, in memory. **There is no real write path to it,
  and none to any sheet but All.** The workbook write layer only ever
  PATCHes targeted ranges on an *existing* All row located by CollectionID
  — it has no append-a-new-row capability for any sheet. Writing the queue
  there would mean building that from scratch: new architecture, not "use
  the existing path."
- the Staging **FOLDER** (`{stagingBase}/…`, JSON files) is the app's real,
  already-shipping Staging write path (`writeSetDraft`/`readSetDraft`/
  `listSetDrafts` → `graph().uploadJson`/`getJson`).
Went with the folder, since that's the only thing the phrase accurately
describes, and Ray explicitly delegated the storage shape ("use your
judgment... new rows vs. a structured block"). **If he actually wanted rows
on the Staging sheet, that's a separate and much larger piece of work** —
it needs a sheet-append capability the write layer has never had.

**Storage shape**: ONE document at `{stagingBase}/_Docket/docket.json`
(`type: "docket-queue"`, `version: 1`, `entries: []`), not a file per
entry — the queue is tens of entries at most, one file gives
read-modify-write in a single round trip plus a natural home for a schema
version, and it keeps the Staging folder from filling with single-record
files `listSetDrafts()` has to walk past. **Safe alongside set drafts**:
`listSetDrafts()` `getJson()`s `{base}/{child}/set.json` for every child
and drops anything that isn't `type === "set"`, so a `_Docket` folder
holding `docket.json` yields null there and is skipped — asserted, not
assumed.

**Entries are closed, never deleted.** `status` is `open`/`resolved`/
`dismissed`; only `open` renders. A resolve records `resolvedCoinId` +
`resolvedDate`, a dismissal records `dismissedReason` + `dismissedDate`.
Item 3 explicitly required a dismissal to record WHY ("not just filter from
view"), and the same reasoning applies to a resolve — which CoinID it
landed on is exactly what someone reconciling later needs.

**One operations layer over both storage modes** (`docketOpenEntries` /
`appendDocketEntry` / `closeDocketEntry` → `docketResolveEntry` /
`docketDismissEntry`). Every caller goes through these rather than touching
either store, so the durable path and the flag-off mockup path can't drift.
The two stores are deliberately **not merged** when the durable one is
live — `FAKE_NEEDS_QUEUE`'s two seeded rows are mockup demo data, so in
durable mode the file alone is the source of truth. `appendDocketEntry`
returns `{entry, durable}` so a flag-on write that didn't reach OneDrive
still records in memory *and* says so, rather than silently dropping a flag.

**Re-check** (`docketRecheckEntry`) re-runs the *same* `dbCoinsCandidatesFor()`
matching against whatever DB_Coins is currently loaded, using the entry's
own stored attribute shape:
- **0 candidates** → entry stays queued, toast says nothing new was found.
- **1 candidate** → a confirmation dialog naming the CoinID/PCGS#/GSID/
  Mintage. **Never auto-applied** — asserted that nothing is written and
  the entry stays open until Confirm is actually clicked.
- **2+ candidates** → the shared ambiguous picker. The existing picker
  MARKUP (`#designationAmbiguousPanel`) lives inside the Edit Coin form so
  it can't be reused from the Docket view, but `renderAmbiguousMatchList()`
  itself is container-agnostic and IS reused, so both surfaces render
  candidates identically. The deliberate pick is the confirmation — same
  rule `checkDesignationReresolution()` already follows.
- Resolving writes the CoinID via **`writeCoinIdCell()`**, the one narrow
  audited CoinID write path Browse Edit's re-link already uses — not
  through the general allow-list machinery, which would weaken the
  "an unlisted column has no code path to a PATCH" guarantee.
- **A coin with no All row yet is handled, not treated as failure**: a
  coin saved to Staging holds a reserved CollectionID but has no All row
  until reconciliation promotes it, so `findAllSheetRowNumber()` returns
  null → the resolution is still recorded on the entry, with a note saying
  so, and no write is attempted.

**Dismiss-with-reason** reuses `showWriteGuard()`, which gained three
**backward-compatible** optional button hooks: `keepOpenUnless` (refuse to
close — a blank reason keeps the dialog open), `onInvalid`, and `collect`
(read body state BEFORE teardown, since `onClick` runs after the dialog
closes). Buttons that declare none behave exactly as before — the conflict
and identity-overwrite dialogs are untouched and their 358-assertion suite
re-runs clean.

**One necessary fix to Add Coin's push site**: it pushed the flag BEFORE
`getNextCollectionId()`, so every entry it created carried **no
CollectionID at all** — fine for a display-only backlog, useless for a
Re-check that needs to know which row to write to. Reordered so the ID is
reserved first (safe: `getNextCollectionId()` is a pure max+1 scan that
doesn't depend on the push). Add Coin has no Finish input, so those entries
carry a blank finish — handled correctly downstream, since
`dbCoinsCandidatesFor()` only narrows by finish when one is present.
Browse Edit's `flagCoinIdNeedsRelink()` now passes `finish` too, from the
same source `identityShape` uses.

**Verified headless — 63 new assertions (`verify_docket_queue.js`), all
passing**, plus all 14 prior suites re-run clean (748 total, zero
failures): the flag ships false and never touches Graph when off; seeded
entries get stable ids across repeated reads; the durable file lands at the
right `_Testing`-scoped path with the right type/version/shape; entries
survive a cache drop; `listSetDrafts()` is unaffected; all three Re-check
branches including "not auto-applied" and "Cancel writes nothing"; the
chosen candidate (not the first) is what gets recorded on an ambiguous
pick; overlay/list teardown; blank-reason dismissal refused with the
validation message and nothing recorded; a real reason recorded durably
with the entry retained; Re-check/Dismiss rendering on exactly the
queue-backed research rows and never on action rows; dismissal still
working in-memory with the flag off; and Add Coin's entry now carrying its
CollectionID. **Not verified: any real device or any real OneDrive
session** — this is a new write path and needs a live run before it's
trusted (see the testing note in the branch's own report).

**Real gap found and fixed while merging this branch onto
`claude/matcher-designation-hardening`.** Bringing the merged matcher
(Designation-aware, with the cert-protection guard from that branch's own
live-test fix) onto this branch was clean at the git level, but exposed a
real functional gap: **`buildDocketEntry()`'s field whitelist didn't
include `designation`/`gradeSource`, and `flagCoinIdNeedsRelink()` never
passed them in the first place** — so `docketRecheckEntry()` re-derived
candidates as if a coin's Designation were always blank and its GradeSource
were always non-service, regardless of the coin's real current values.
Reproduced directly: a synthetic entry shaped exactly like the real
`AY-00207` case (Designation `FB`, GradeSource `PCGS`) silently narrowed to
the plain (wrong) catalog row on Re-check instead of surfacing the
ambiguous picker — the exact class of bug the cert-protection guard exists
to prevent on the live Browse Edit Save path, just reachable through a
different door (Re-check) that the guard's own fix never touched.
- **Fixed**: `designation`/`gradeSource` added to `buildDocketEntry()`'s
  entry shape (defaulting to `""` for callers that don't have them, e.g.
  Add Coin's `no-db-coins-match` push — same safe-default treatment `finish`
  already got); `flagCoinIdNeedsRelink()`'s doc comment and its
  `appendDocketEntry()` call now forward `identityShape.designation`/
  `.gradeSource`; and — the actual bug, not just an oversight in the
  function signature — **`performBrowseEditWrite()`'s own call site**
  (which builds its own inline object rather than passing the save
  handler's `identityShape` through) needed the same two fields added
  directly, or the fix upstream would never have had anything to forward.
  `docketRecheckEntry()` now includes both in the shape it passes to
  `dbCoinsCandidatesFor()`. Same field names as `identityShape` throughout
  — no new shape invented.
- **Verified headless** (12 new assertions, `verify_docket_designation_fix.js`,
  not committed per this project's scratchpad-script convention): the
  schema keeps both fields when supplied and defaults them to `""` when
  not; an end-to-end repro through the real functions
  (`flagCoinIdNeedsRelink` → in-memory queue → `docketRecheckEntry`) for an
  `AY-00207`-shaped entry now correctly surfaces the ambiguous picker
  (`docketMatchOverlay`) instead of the single-match confirm dialog
  (`writeGuardOverlay`); a Seller-sourced control case (no real cert) still
  narrows to one match as before, confirming the fix isn't over-broad; and
  a source-level guard on the specific `performBrowseEditWrite()` call site
  so a future edit can't silently drop the two fields again without a test
  catching it. Full syntax/nav/console-error smoke re-run clean alongside
  it.
- **Live-verified since**: Part E2 of `docs/DOCKET_LIVE_RUN_CHECKLIST.md`
  passed against the real `_Testing` copy. Positive case (`AY-00522`,
  Designation=FB/GradeSource=PCGS, identity edited to a zero-match state):
  `docket.json` captured both fields correctly, and Re-check surfaced the
  ambiguous picker (blank-Designation + FB test rows) — no silent narrow.
  Control case (`AY-00518`, Designation=FB/GradeSource blank): Re-check
  resolved cleanly to a single "One match found," confirming the fix
  doesn't over-trigger for a non-certified coin. One operational-only
  finding, not a code bug: `DB_Coins` is fetched once per page load, so a
  DB_Coins row added directly in Excel needs a hard reload
  (`Ctrl+Shift+R`) before Re-check will see it — otherwise it looks
  exactly like a genuine matching failure. Documented in the checklist's
  setup section and Known Limitations, not just noted here.
- **Add Coin's `no-db-coins-match` push was deliberately left unchanged** —
  it doesn't currently pass `designation`/`gradeSource` even though the
  form has both fields available (`buildCoinRecordFromForm()` already reads
  them). Not part of the reported finding or Ray's fix request, so left
  alone rather than assumed; worth a look if a similar gap ever surfaces on
  that entry kind.

**Checklist Part B rewritten — Add Coin's Save is still a placeholder,
confirmed live.** Attempting Part B live surfaced that Add Coin's "Save to
Database" only toasts *"Placeholder only — ... Nothing written to OneDrive
yet"* — it can't create a real Docket entry, per Add Coin's own documented
scope ("Add Coin: the core workflow" — its direct-write/reconciliation step
is separate, larger, not-yet-built work, unaffected by this branch).
`docs/DOCKET_LIVE_RUN_CHECKLIST.md`'s Part B now creates the test entry via
Browse Edit's identity-edit path instead (same mechanism Parts D/E/E2
already used) — same underlying `docket.json` write/fob/reload-persistence
behavior, just triggered through a path that's actually live. **The
original Add-Coin-based steps are kept, marked blocked, not deleted** —
restore them once Add Coin's own write layer lands.
- **A real messaging bug found in the same attempt, fixed regardless of
  the scope question above**: Add Coin's form could show "No matching
  DB_Coins entry... needs a catalog entry added later" (`dbNoMatchBanner`)
  and then, further down the same form, "Matched with enough confidence
  for a direct save." (`saveConfidentBanner`) for the same coin —
  contradicting each other. Not a logic bug: confidence
  (`isConfidentMatch()`) is deliberately driven purely by Variety
  recognition, independent of DB_Coins match status (a DB_Coins miss never
  blocks a direct save on its own — see "Direct-write vs. Staging" above),
  so both banners can legitimately be true at once. The bug was only the
  word **"Matched,"** which falsely implied a catalog match. Reworded to
  "No unrecognized Variety flagged — ready for a direct save. (A missing
  DB_Coins catalog entry, if noted above, won't block this on its own.)" —
  same logic, no behavior change, just an honest claim. Verified headless
  (7 assertions, `verify_addcoin_banner_wording.js`, not committed per this
  project's scratchpad convention).

**Real double-render bug found live (Part B's reload-persistence step),
root-caused and fixed, not a browser-cache issue.** Every entry under
"Waiting on Copilot research" rendered TWICE after a plain `F5` reload —
`docket.json` itself was confirmed correct (right entry count, unique
`entryId`s, no duplicates), so this was a render-only bug. Two candidate
explanations were investigated: a genuine double-render/double-subscription
bug, or the same stale-JS-before-a-real-reload browser-cache issue hit
twice already that session. **Confirmed the former, not the latter** —
reproduced directly, headless, by firing two overlapping
`renderNeedsAttentionHub()` calls against a delayed mock Graph client (4
rows instead of 2 before the fix).
- **Root cause**: `renderNeedsAttentionHub()` is called both unconditionally
  at page-load init (`INIT` section) AND every time `navigate("needsdbcoins")`
  runs (opening the Docket drawer) — see that function's own comment. It
  clears its containers synchronously up front but only appends rows after
  several real Graph reads (`listSetDrafts`/`docketOpenEntries`/
  `getCachedWorkbookWebUrl`, all awaited). If the page-load call is still
  in flight when the user opens Docket — plausible right after a reload,
  since that's exactly when the app's own MSAL/Graph round trip is
  slowest — both calls independently clear-then-append, and whichever
  finishes LAST stacks its rows on top of the other's instead of onto a
  clean container.
- **Fixed** with a render-generation token (`needsAttentionRenderToken`,
  bumped at the start of every call): a staleness check sits right after
  the function's last `await` and before any DOM mutation — if a NEWER call
  started (and so already bumped the token) while this call's awaits were
  in flight, this call bails out entirely, touching nothing (not the row
  containers, not the badge/fob). Only the most-recently-STARTED call is
  ever allowed to render, regardless of which one's awaits happen to
  resolve first.
- **Verified headless** (12 new assertions across two scripts, not
  committed per this project's convention): the exact overlap scenario
  (older/slower call + newer/faster call) leaves exactly the newer call's
  rows with zero trace of the older call's, including the badge/fob count
  matching the winning call's own totals rather than a stale or summed
  value; a single, non-overlapping call afterward still renders normally.
  Full syntax check and a 9-route nav smoke re-run clean alongside it.
- **Live-reconfirmed since**: a fresh entry (`AY-00520`) created, then
  Docket opened immediately with realistic timing — no duplication.
  Followed by a plain `F5` reload — still no duplication, every entry
  showing exactly once. The fix holds under real conditions, not just the
  headless repro. Nothing further blocking on this branch from that
  session's testing.

**Full live-test checklist now COMPLETE — Parts A–G plus E2, all passed
against the real `_Testing` copy.** `docs/DOCKET_LIVE_RUN_CHECKLIST.md`
carries the full run's status at the top. One clarification from Part F:
the blank-reason validation message was briefly misread from a screenshot
as missing — re-checked directly and it's present and correct; no code
change needed. Test data left in `docket.json` (6 entries: 5 dismissed, 2
resolved) was cleaned up by Ray directly in OneDrive afterward, by choice
— nothing in this repo needed to change for that.

**Merged to main following Ray's explicit go-ahead** — see the merge-status
correction at the top of this section.


### Docket: three collapsible sections (BUILT and merged to main)
The Docket opened onto one long flat list of everything needing action —
undigestible in practice. Replaced with three collapsed-by-default
accordion sections, each with its own item count in the header:
**Staging**, **Awaiting Copilot Research**, **Other / Requires Photos**.

**Presentation only — the classification logic is untouched.** The same
signals decide the same things (`SET_STATUS`, `COIN_DRAFT_STATUS`,
`findDbCoinsMatch`, `coinMissingPhoto`); what changed is which bucket each
row is presented in, and that rows are now per-item instead of aggregated.

- **Accordion-in-place, not three routes** (Ray's confirmed call). This is
  the app's established grouping pattern everywhere else — Browse detail,
  Edit Coin and Edit Set are all accordion stacks — and a separate page is
  reserved for a destination with its own actions and back-target. Staging
  Review already IS such a destination and **a Staging row still drills
  through to it on tap**, so the existing precedent is preserved rather
  than duplicated. Three more routes would have meant three more nav-back
  targets for no gain. Wired once at init via `wireStaticAccordionToggle()`
  (static markup — only the section CONTENTS re-render).
- **Counts are per-coin, and the badge number goes UP.** Confirmed with Ray
  as a deliberate, visible change: staged coins used to collapse into a
  single "N coins awaiting your decision" row that contributed **1** to the
  fob regardless of N, so the Docket under-reported real work. Every coin
  now counts as itself, and the three header counts sum to the fob exactly,
  by construction.
- **In-progress Set drafts fold into Staging**, not a fourth section — a
  Set draft lives in the same OneDrive Staging folder as a coin draft, so
  it belongs there. Tapping one still goes to In Progress Sets.
- **An unmatched staged coin is listed in Staging ONLY, never also in
  Research.** The old layout showed it twice (an aggregate action row plus
  its own research row); with real per-item rows in both sections that
  becomes the same coin appearing and being counted twice — exactly the
  redundancy this redesign exists to remove. Its unmatched state is
  surfaced inline on its own row instead, with Re-check right there. Same
  reasoning that removed the redundant Docket push on save (live-run
  finding #7: "the draft's own presence in the hub already represents
  'needs a catalog entry'"). Research therefore holds only what is
  genuinely waiting on someone else: drafts marked ready, real Docket queue
  entries, and Complete-pending-research Sets.
- **The old flat containers are gone, not hidden** — `needsActionContainer`
  / `needsResearchContainer` / their empty+workbook notes are replaced by
  `docketStaging*` / `docketResearch*` / `docketOther*`. `needsAttentionBadge`
  keeps its id (it is the drawer fob, not a section).
- New `.docket-count` pill styling — deliberately quiet, and NOT the fob's
  brass-tag treatment: the fob is the cabinet's own hardware, these are
  counts inside a list. It tints gold while its section is expanded.

**Mark-ready signal — soft/advisory, not a hard gate (Ray's confirmed
call).** Most coins land in Staging precisely because they couldn't be
confidently mapped to a CoinID at capture, so a resolved CoinID is the
natural "ready to promote" signal. A draft with no `coinId` now shows a
flag on its Staging Review row plus a **Re-check** button; **Mark ready
stays enabled**. Deliberately not hard-blocked: a genuinely new variety may
have no DB_Coins row at all and never will until Copilot adds one, so
hard-gating on CoinID would strand that coin in Staging permanently.
- **New `recheckCoinDraftMatch(draft)`** — the coin-draft counterpart of
  `docketRecheckEntry()`, sharing its exact three-outcome contract (0 = say
  so and touch nothing; 1 = confirm dialog, never auto-applied; 2+ = the
  shared ambiguous picker, where the deliberate pick IS the confirmation —
  the firm project rule, per two historical mislinks). Reachable from both
  the Docket's Staging rows and Staging Review's own rows.
- **`description` is deliberately NOT passed into the re-check shape.** The
  Description tier in `dbCoinsCandidatesFor()` is documented as firing ONLY
  for Add Coin's controlled series-picker value; a draft's stored
  description may be free-typed, and `All.Description` /
  `DB_Coins.Description` are different sources with no guaranteed
  correspondence. `category` IS passed — it can only ever have come from
  the controlled Bullion-tier dropdown, so it carries the guarantee the
  Description tier needs and free text doesn't.
- **`matchedHow` gains a fourth value, `"recheck"`**, alongside
  single/picked/none — reconciliation needs to know a link was established
  AFTER capture by a later catalog addition rather than at capture time.
  Verified safe: nothing in the app branches on the old three values.

**Verified headless — new suite `tests/verify_docket_sections.js` (30
assertions), all passing; 258 across all 5 suites, zero failures.** Covers:
the three sections' exact order and labels, all collapsed by default,
expand/collapse with `aria-expanded`, the old containers genuinely removed;
the three counts summing to the badge AND each matching its own rendered
row count; per-coin rows rather than an aggregate line; a resolved draft
showing its CoinID and an unresolved one flagged inline; an unmatched coin
NOT duplicated into Research; a marked-ready draft moving to Research and
out of Staging; photo gaps confined to Other with their Dismiss action
intact; a Staging row still drilling through to Staging Review; the
soft-not-hard Mark-ready gate (button enabled, flagged, Re-check offered);
Re-check writing nothing on zero candidates and nothing until confirmed on
one; and the resolved CoinID plus `"recheck"` provenance landing on the
draft. Four prior assertions were rewritten to follow the real design
change rather than weakened — the superseded aggregate-row and
deliberate-duplication claims (`R6`), and three container-id reads.
Screenshots reviewed at both viewports, no overflow at either width.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round in this feature.


### Staging Review: workbook + per-coin folder links (BUILT and merged to main)
Live-testing item 3 of Ray's 4-item batch: the Docket's Research section
already shows an "Open workbook in Excel" link, but Staging Review — the
other real screen he reviews pending drafts from — had no equivalent, and
he also wanted a direct link to a coin's own OneDrive Staging folder (to
check its uploaded photos without hunting for it by hand).

- **The workbook link renders ONCE, near the top of the page — not
  repeated per row (Ray's explicit call).** It's the exact same link
  regardless of which coin is being reviewed, unlike the Docket's Research
  rows, which repeat it per-row because each row there can drift out of
  view independently in a longer, ungrouped list. Reuses
  `getCachedWorkbookWebUrl()` completely as-is (no new fetch logic, no
  second cache) — same one-shot-per-session caching the Docket already
  relies on. Degrades to the same "Workbook link unavailable right now
  (write layer disabled, or not signed in)" note as the Docket when
  `null` comes back, rather than a broken link.
- **The coin's own OneDrive Staging folder link is per-row, since it
  genuinely differs per draft.** New `RealGraphClient.getFolderWebUrl(path)`
  mirrors `getWorkbookWebUrl()`'s exact pattern (a plain read-only Graph
  item-metadata GET, `null` on a 404) but takes any path — used here with
  `coinDraftFolder(collectionId)`. New `getCachedFolderWebUrl(collectionId)`
  caches per-CollectionID in a `Map` for the session (same
  undefined/null-are-both-falsy convention as the workbook cache, just
  keyed since there are many folders instead of one workbook). This is a
  genuinely new, dedicated method — not an overload of `getItemMeta()`,
  which carries different (null-if-never-uploaded) semantics elsewhere in
  this file.
- **Both links are computed once per `renderStagingList()` render, before
  any row markup is built** — the page-level link via one
  `getCachedWorkbookWebUrl()` call, the per-row links via one
  `Promise.all()` over every REAL (non-mock) draft's own
  `getCachedFolderWebUrl()` — rather than each row kicking off its own
  independent fetch. Both fetches respect the existing
  `stagingRenderToken` staleness guard (a newer render superseding a
  slower in-flight one bails out before touching the DOM), same pattern
  `renderNeedsAttentionHub()` already established.
- **Mock (flag-off) `FAKE_STAGING` rows show neither link** — there's no
  real Staging folder for a mock row to link to, and no real workbook
  write layer backing the page-level link either; this is unchanged from
  every other real-Graph feature's flag-off behavior in this file.
- Verified headless — new suite `tests/verify_staging_workbook_links.js`
  (10 assertions, all passing; 339 across all 10 suites, zero failures):
  the page-level link renders exactly once in the whole `#view-staging`
  DOM (not once per row); two real drafts each get their own,
  genuinely-different folder link, correctly derived from their own
  CollectionID's Staging folder path; the flag-off mock path shows
  neither link with no crash; an unavailable workbook link (mock seeded
  `workbookWebUrl: null`) degrades to the explanatory note; and a nav/
  overflow smoke check. Screenshots reviewed at both viewports (phone +
  tablet) — the workbook link sits directly under the interim banner,
  each row's folder link sits inline with its other detail lines, no
  overflow at either width.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round in this feature; this is a new Graph
  read path (`getFolderWebUrl`) and needs a live click-through to confirm
  it actually lands on the coin's own Staging subfolder in an editable
  OneDrive session, same "needs a real click-through" caveat the workbook
  link itself already carries.


### Docket: Research row tags (BUILT and merged to main)
Live-testing item 4 of Ray's 4-item batch: Staging vs. Awaiting Copilot
Research read as nearly identical in live testing — apart from the
Set-in-progress case, both sections just show a coin/Set name and a status
line. Ray gave explicit latitude to either rename the Research section or
visually distinguish the row kinds within it.

- **Kept as one Research section, three sections total — a small per-row
  tag distinguishes row kinds instead of a rename or a fourth section.**
  Reasoning: the section's real name ("Awaiting Copilot Research") is
  still accurate for every row in it — a Handed-Off draft genuinely IS
  waiting on Copilot's reconciliation pass, same as a genuine no-catalog-
  match entry is waiting on Copilot's research. Renaming the section would
  have meant picking a name that's honest for only one of the two row
  kinds. A fourth section would also have meant a fourth badge count to
  track down, when the actual ask is just "let me tell these apart at a
  glance" — which a tag solves directly.
- **Two kinds, matching the exact classification already implicit in the
  three research push sites**: **"Handed Off"** = a coin draft already
  marked ready (`stagedHandedOff`, `COIN_DRAFT_STATUS.READY`) or a Set
  draft with `status = "Complete — pending research"` (`completeSets`) —
  finished capture, waiting on someone else to act, nothing left for Ray
  to decide. **"Research"** = a real Docket queue entry from
  `docketOpenEntries()` (including a `kind: "coinid-relink"` entry) —
  genuinely no catalog match yet, needs Copilot's actual research.
- **Rendered by one shared `appendDocketRows()`**, not duplicated per push
  site — each research row object now carries its own `kind: "handoff"`
  or `kind: "research"` field; `appendDocketRows()` renders a small
  `.docket-tag` pill (`Handed Off` / `Research`) at the top of any row
  that has one, so Staging and Other rows (which never set `kind`) are
  completely unaffected with no extra opt-in check needed.
- **New `.docket-tag` CSS** — same "quiet inline pill, not the drawer
  fob's brass-tag treatment" posture `.docket-count` already established:
  `.docket-tag-handoff` reads muted/neutral (waiting, nothing urgent from
  Ray); `.docket-tag-research` picks up the gold accent (a real Copilot
  research item).
- Verified headless — new suite `tests/verify_docket_row_tags.js` (11
  assertions, all passing; 350 across all 11 suites, zero failures): the
  section count/order is still exactly three (no rename, no split); a
  real seeded Docket queue entry tags "Research" with the research CSS
  class; a coin draft marked ready tags "Handed Off"; a Complete Set
  draft also tags "Handed Off"; Staging/Other rows never carry the tag at
  all; and a nav/overflow smoke check with Research expanded. Screenshots
  reviewed at both viewports — the tag sits cleanly above each row's
  title with clear visual contrast between the two kinds, no overflow at
  either width.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round in this feature.


