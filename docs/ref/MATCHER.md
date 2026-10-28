# Reference: MATCHER (moved out of CLAUDE.md)

Read this file when: touching dbCoinsCandidatesFor(), CoinID matching or re-link, Re-check, or the Description, Category, Composition, Designation or Finish tiers.
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

### Matcher hardening: Designation in dbCoinsCandidatesFor() (BUILT and merged to main)
**Merge status correction:** this section previously read "held on branch
`claude/matcher-designation-hardening`, NOT merged — awaiting Ray's go-ahead
+ live pass." The live pass has since run clean: §B2 of
`docs/MATCHER_DESIGNATION_LIVE_RUN_CHECKLIST.md` was confirmed against the
real `_Testing` copy workbook — editing `AY-00207` (PCGS-certified, cert
#4906, non-FB) from blank to FB Designation correctly surfaced the ambiguous
picker (both `C-1916-D-10C-01` plain and `C-1916-D-10C-02` FB shown, nothing
written, backed out cleanly) instead of the old silent narrow — confirming
the cert-protection guard works as designed. Issue 2 (Cancel not reverting
the Edit form's displayed fields) was separately confirmed as expected
behavior, not a bug — see the session-log note below. Ray gave explicit
merge go-ahead and the branch was merged to `main`. **`main` is now the
source of truth for this feature**, same standing as every other
merged-after-holding branch in this file.

Built off `main` (NOT the paused `claude/docket-identity-matching` branch —
kept strictly separate at Ray's explicit instruction). Adds
`DB_Coins.Designation` to the DB_Coins match so the FB-catalog expansion
stops flooding the ambiguous picker, plus full-attribute re-link validation
and a new save-time confirm.
- **Workbook verified fresh, not from prior docs (2026-08-17 upload):**
  DB_Coins is now **34 columns**, `AH = Designation`, `AG = Mint`. Note
  there are TWO mint columns now — `MintMark` (H, the abbreviation `S`/`D`/
  blank) and a new `Mint` (AG, the full name `San Francisco`/`Denver`/
  `Philadelphia`). **The matcher reads `MintMark` (H)** to match
  `All.MintMark`; the new full-name `Mint` column is not used by any match
  logic and must not be. Designation is populated on **only 78 rows**, all
  `FB`, all Mercury Dimes, each a Business-Strike duplicate of a pre-existing
  plain sibling — so Finish can't separate them, and 73 owned dimes that used
  to resolve to exactly one candidate now resolve to 2+.
- **`mapWorkbookRowToDbCoin()` now reads the real Designation column** (was
  hardcoded `""` from back when DB_Coins had no such column). FAKE_DB_COINS
  already carried its own designation values (the 1909-S RD/BN mock pair), so
  the mock path is unaffected — only a live-fetched row's exposure changed.
- **Designation narrowing tier in `dbCoinsCandidatesFor()`, option C
  (blank-as-value) — DELIBERATELY STRONGER than the Finish tier, confirmed
  with Ray.** Unlike Finish (where a blank owned value must NOT narrow,
  because `All.Finish` carries values DB_Coins lacks like "Circulated"), a
  blank `All.Designation` genuinely means "not FB" and so SHOULD select the
  plain (blank) catalog row and drop the FB one; an FB owned coin selects FB
  and drops plain. Still soft: if no candidate matches the owned Designation
  it falls back to the full set (never zero, never a Docket flood). Verified
  against the real sheet: this is the ONLY semantic that actually fixes the
  collision (73 owned dimes → 2; the literal "narrow only when both non-blank
  and differ" reading fixes nothing because one side of every FB/plain pair
  is always blank). Non-dimes are untouched (no non-dime DB_Coins row carries
  a Designation).
  - **KNOWN, ACCEPTED TRADEOFF (Ray signed off):** an owned Mercury dime
    that is physically Full Bands but not yet recorded FB in `All.Designation`
    now silently resolves to the plain catalog row instead of surfacing the
    picker. Logged as a ParkingLot item (see the session-log entry below) —
    a physical FB-check pass, same shape as the deferred copper-color pass.
  - **Cert-protection guard, added after Ray's live-test pass found a real
    gap in the tier above.** Live-testing on `AY-00207` (SerNo
    `4906.06/33115202`, GradeSource `PCGS`) surfaced that the blank-as-value
    rule assumes `All.Designation` is the best available signal — true for a
    Seller/Owner estimate, but wrong the moment a coin carries a REAL
    certification: AY-00207's own cert decodes (via the existing
    `parsePcgsLabel()`) to PCGS# 4906, which is DB_Coins' plain row, yet a
    manually-typed Designation=FB edit would have silently re-linked it to
    the FB row — writing a Designation that contradicts the cert already on
    file. **`isServiceGradeSource(gradeSource)`** (new) checks whether a
    GradeSource resolves to a `Lookup_Graders` row with `Type="Service"`
    (PCGS/NGC/ANACS/ICG/CAC confirmed today) rather than a hardcoded grader
    list, so it stays correct if that table ever changes. When true, the
    Designation tier's blank-as-value narrowing is withheld entirely —
    `candidates` falls through unnarrowed, so the ambiguous picker fires
    instead and a human decides, same as before the Designation tier
    existed. "Seller"/"Owner"/"AI-est"/blank all resolve non-Service and are
    unaffected — those 55 (of 73) collision coins still get the blank-as-
    value narrowing, since there's nothing independently verifiable to check
    it against.
    - **Deliberately denomination/field-agnostic, not Mercury-dime- or
      Designation-specific (Ray's explicit correction to the first pass of
      this fix, which was scoped to PCGS-only).** The guard runs inside
      `dbCoinsCandidatesFor()` itself, ahead of the Designation tier, for
      EVERY call regardless of denomination — so it protects Jefferson
      Nickel FS / Standing Liberty FH the moment those get backfilled, with
      no second fix needed, even though only dimes exercise it today.
    - **`Lookup_Graders` is now read live** (`mapWorkbookRowToGrader()`,
      `LIVE_LOOKUP_GRADERS`/`activeLookupGraders()`, fetched alongside
      All/DB_Sets/DB_Coins/Lookup_MetalContent in `ensureLiveNavDataFetch()`)
      — confirmed real headers: `Grader`, `Full Name`, `Cert Lookup Base
      URL`, `Type`. `FAKE_LOOKUP_GRADERS` gained a matching `type: "Service"`
      field on all 5 mock rows so the mock path behaves identically before a
      live session loads the real table. `getGraderBaseUrl()`/
      `buildCertLookupUrl()` (the pre-existing cert-link-building code,
      unrelated to this fix) were deliberately left reading
      `FAKE_LOOKUP_GRADERS` directly, out of scope here.
    - **`identityShape` (Browse Edit's save handler) gained a `gradeSource`
      field**, sourced from the form's own current `GradeSource` value (same
      pattern as `designation`) — this is what lets the guard see whether
      the coin being saved is Service-graded. `checkDesignationReresolution()`'s
      other caller (`coin` objects, which already carry `gradeSource` via
      `mapWorkbookRowToCoin`/`FAKE_COINS`) needed no change.
    - **Still just a guard, not the derivation itself** — nothing here
      decodes the cert or picks the "correct" row automatically. The
      separate, deferred cert-derived-resolution enhancement (using
      `parsePcgsLabel()`'s SPEC against DB_Coins.PCGS# as an authoritative
      match) remains its own future ParkingLot item, per Ray's explicit
      confirmation this stays a later, separate task.
- **`Designation` added to `COINID_TRIGGER_FIELDS`** (was excluded). Now that
  Designation is a real match input, a Designation change can genuinely
  change which DB_Coins row (and CoinID) a coin resolves to, so it must
  trigger the CoinID re-link write. Before, a Designation-only edit ran the
  full re-resolution and then silently DISCARDED the answer (it was in
  `DB_COINS_RESOLUTION_FIELDS` but not the CoinID-write gate). The two sets
  have now converged — `DB_COINS_RESOLUTION_FIELDS === COINID_TRIGGER_FIELDS`
  (kept as a separate name only for readability at its call site).
- **New "Confirm catalog re-link" dialog (`showCoinIdChangeDialog`) — item 3,
  built as the GENERAL option (b), not Designation-specific.** Fires whenever
  re-resolution lands on a single, different, non-blank CoinID than what's
  already on the row, for ANY identity field — the missing confirmation that
  let the original AY-00008 Year-change bug silently re-point a row's catalog
  link. Composed as the INNER gate after the existing identity-overwrite
  dialog (on an identity edit the user confirms the field change first, then
  its catalog-link consequence). Deliberately NOT fired when: the CoinID is
  being filled from blank (completing, not overwriting — mirrors the
  identity-overwrite dialog's own hadValue rule); the re-link clears to blank
  (a genuine no-match already routes to Docket with its own toast); or the
  user already chose the row via the 2+ ambiguous picker (`viaPicker`
  threaded through `checkDesignationReresolution`'s callback so the pick
  isn't redundantly re-confirmed).
- **Cancel on this dialog (or the identity-overwrite dialog before it) does
  NOT revert the Edit form's own displayed field values — confirmed as
  correct, not a bug (Ray, 2026-08-18).** Nothing is written to the
  workbook either way (that's the actual guarantee these dialogs make), but
  a field the user typed into stays showing what they typed until they
  either save again or use the Back button's existing "unsaved edits"
  Keep-editing/Discard prompt. This is consistent with every other guard
  dialog in Browse Edit (the write-conflict dialog's own doc comment says
  the same thing) — Cancel means "don't save this," not "undo what I
  typed." Don't revisit this as an open item.
- **Scope boundaries held:** Thread B (link audit / further backfill),
  copper-color RD/RB/BN designations, and Add Coin's lack of a Finish input
  are all explicitly out of scope, untouched. (The workbook's own ParkingLot
  already carries a "Thread B worklist" row noting this Designation-only fix
  won't catch the commemorative wrong-link class — consistent with that
  boundary.)
- **Verified headless — 47 assertions (`verify_designation_matcher.js`, up
  from the original 34), all passing**, plus the full 651-assertion main
  branch's own regression suite re-run clean (698 total). The suite covers:
  the mapper reading Designation; every branch of the blank-as-value tier
  (plain, FB, soft fallback, non-dime no-op, Finish still narrowing,
  blank-Finish still not narrowing, the 2-blank-row picker-preserved case,
  the FAKE RD/BN pair); the `COINID_TRIGGER_FIELDS` change and set
  convergence; the confirm dialog end-to-end (fires on a Designation-only
  re-link, writes nothing until confirmed, Cancel writes nothing, Confirm
  writes both Designation and the new CoinID, no dialog on a Grade-only or
  blank-fill save, and the 2+ picker path suppressing the redundant
  confirm); and the new **13 cert-protection assertions**: `isServiceGradeSource()`
  against all 5 FAKE_LOOKUP_GRADERS services and against Seller/Owner/
  AI-est/blank/unknown, the same function reading through a swapped-in LIVE
  `Lookup_Graders` table (proving it isn't hardcoded), the guard withholding
  narrowing for PCGS- and NGC-sourced dimes while leaving a Seller-sourced
  dime unaffected, the identical guard protecting a synthetic non-dime
  Jefferson Nickel FS pair (denomination-agnostic proof), and an end-to-end
  Save-button repro of the exact AY-00207 live-test finding (PCGS
  GradeSource + a Designation edit now surfaces the ambiguous picker instead
  of the single-candidate re-link dialog, with nothing written until a
  choice is made). **Three existing `verify_browse_edit_write.js`
  assertions were updated** (in the original pass, unaffected by this
  follow-up) to click through the confirm dialog — they asserted the old
  silent-re-link behavior, so this follows the real design change, not a
  weakening. **Live-verified since**: `docs/MATCHER_DESIGNATION_LIVE_RUN_CHECKLIST.md`
  §B2 (`AY-00207`) confirmed the cert-protection guard against the real
  `_Testing` copy workbook — see the merge-status correction at the top of
  this section.
- **Regression baseline note:** this branch is off `main`, which does NOT
  contain the Docket Part 1 durable-queue work (that's on the paused
  `claude/docket-identity-matching` branch). So the baseline here is the
  685-assertion main suite, not the 748 that includes the 63 Docket-only
  assertions. The zero-candidate path reuses `flagCoinIdNeedsRelink()` as it
  exists on main (in-memory `FAKE_NEEDS_QUEUE`); it's forward-compatible —
  the Docket branch already rewired that same function to route durably, so
  whichever merges second inherits the other's behavior.


### Add Coin Phase 1: batch 3 (BUILT and merged to main)
Six items built, one flagged as a real conflict with existing documented
research rather than guessed at. Same posture as every prior round: the
structural Docket/Staging-Review IA redesign stays untouched, separate,
Opus-tier, held for its own go-ahead.

- **#2 — Finish tier now distinguishes "this value isn't a real DB_Coins
  category" from "this value is real, it just genuinely has zero matches
  for this coin."** The prior soft-fallback rule (never narrow to zero on a
  Finish mismatch) was built to protect All-only wear-state values like
  `Circulated`/`Various`, which DB_Coins never carries at all — narrowing
  strictly there would falsely miss real rows. But it was also silently
  swallowing the OPPOSITE case: a real DB_Coins Finish category (e.g.
  `Proof`) that simply has no row for this exact date, which the Finish
  field's own tooltip already promised would narrow the match. New
  `knownDbCoinsFinishValues()` (memoized against the active catalog array's
  identity, so it's not recomputed on every keystroke) answers "does
  DB_Coins use this Finish value ANYWHERE in the catalog." The tier now: a
  Finish match among candidates narrows normally (unchanged); a Finish with
  zero matches among candidates but a KNOWN DB_Coins category narrows to
  zero (new — a real signal); a Finish that's not a DB_Coins category at
  all keeps the original soft fallback to the full set (unchanged,
  Circulated/Various still protected). Tooltip updated to say so
  explicitly. Since every option in Add Coin's own Finish dropdown
  (Business Strike/Proof/Reverse Proof/SMS/Specimen) is itself a real
  DB_Coins category, this makes the field behave exactly as its tooltip
  always claimed for anything enterable there — the old silent-fallback
  behavior only really mattered for Browse Edit's All-only legacy values,
  which are unaffected.
- **#3 — the series (Description) picker now narrows DB_Coins candidates,
  scoped narrowly to stay consistent with the standing rule it's an
  exception to.** The project's firm rule (see "Commemorative / Description
  blind spot" above) is that free-typed `All.Description` must never narrow
  the matcher, since it and `DB_Coins.Description` are different sources
  with no guaranteed correspondence. Ray's framing for this item is real
  and different: the SERIES PICKER's own value is a controlled, enumerated
  selection (one of Ref_Denominations' own candidates for the exact
  Year+Denomination on the form), not free text — so the concern the
  standing rule guards against doesn't apply to it specifically.
  `addCoinIdentityShape()` now checks whether the current Description value
  is EXACTLY one of `lookupDescriptionCandidates(denom, year)`'s own series
  names before passing it through as `shape.description`; a manually-typed
  override that doesn't match any real candidate is left blank in the
  shape, same as before. `dbCoinsCandidatesFor()` gained a new soft tier
  reading `shape.description` — **only Add Coin ever populates this field**;
  Browse Edit and the Docket build their own identity shapes without it, so
  they are completely unaffected (verified directly: `dbCoinsCandidatesFor()`
  with no `description` key at all is a true no-op for this tier). Still
  soft — a real spelling/formatting mismatch between Ref_Denominations and
  DB_Coins' own Description text (a known, documented risk) falls back to
  the full candidate set rather than a false miss.
- **#8 — Denomination dropdown now derives from Ref_Denominations instead
  of a separately hand-maintained list.** Root cause of the gap: the Phase
  1 Q3 load had filtered Ref_Denominations DOWN to only the six codes the
  dropdown already had, backwards from what should drive what. Fixed
  properly: **all 187 rows** are now evaluated, mapped through a new
  `DENOM_NAME_TO_CODE` table, with `FAKE_DENOMINATIONS` now holding 130 of
  them (the rest are a real, flagged scope boundary — see below). Five
  denom codes that never existed before are now real, working values
  throughout the app — `0.5C` (Half Cent), `2C` (Two Cent), `3C` (Three
  Cent), `20C` (Twenty Cent), `H5C` (Half Dime, deliberately not reusing
  `5C` — already flagged in this file as a needed-eventually decision under
  "Browse filters") — plus `Medal` picked up as a low-risk side effect
  (it's a real Ref_Denominations row and was already a real Denomination
  value elsewhere in the app; Add Coin's own dropdown had simply never
  offered it). New `DENOM_CODE_INFO` (label + order) and
  `populateAddCoinDenominationDropdown()` GENERATE the `<select>`'s options
  at init from whatever codes are actually present in `FAKE_DENOMINATIONS`
  — the HTML now holds only the blank option, so the dropdown and the
  reference data can never silently drift apart again the way the original
  six-code hardcoded list did. `DENOM_SCALE` (disc sizing — all five new
  codes floor to 0.70, the same legibility floor Dime already uses, since
  all five real diameters compute below it), `STATS_DENOM_ORDER`, and
  `DENOM_LABELS` were extended to match, so Stats & Value and the Rolls
  sort behave correctly the moment a coin of one of these denominations
  exists (none do yet in the demo data).
  - **A "Commemorative X"/"Error X" row in the source sheet is NOT a new
    denomination** — it's really an ordinary Dollar/Half Dollar/Quarter/
    Cent/Nickel row describing a commemorative or error variety, so it's
    folded onto that denomination's own existing code rather than invented
    as something new. This keeps the app's Denomination vocabulary exactly
    what the naming-conventions section already documents it as — a short,
    controlled set of codes — rather than letting a reference sheet's own
    descriptive bucketing leak into it.
  - **Superseded by "Add Coin Phase 1: gold/bullion denomination codes"
    below** — Ray resolved the code scheme; this whole bullet is history.
  - Deliberately still excluded, flagged rather than guessed at: the
    gold/bullion tier (Half Eagle, Quarter Eagle, Eagle, Double Eagle,
    Three Dollar, Gold Dollar, Gold Buffalo, Commemorative Gold,
    Commemorative $5 Gold, First Spouse $10, American Gold/Silver/
    Platinum/Palladium Eagle bullion, and "Special" — 57 rows). Ray's own
    ask named "the gold/bullion denominations" as a group; a face-value-
    based code scheme genuinely doesn't work cleanly here — a classic Half
    Eagle and a modern bullion coin can share a face value with nothing
    else in common, and a bullion Silver/Gold Eagle's legal-tender face
    value has no relationship to how it's actually tracked or valued (same
    reasoning this file already recorded for why Silver Eagles were kept
    out of the Dollar code, back when Ref_Denominations was first loaded).
    Assigning real codes here is Ray's numismatic judgment call, not a
    mechanical column-to-dropdown mapping — flagged in chat rather than
    guessed. Once he picks a scheme, it's a `DENOM_NAME_TO_CODE` addition
    and the array grows to the full 187 rows; no other code changes needed.
  - **Edit Coin's own Denomination dropdown is unchanged** — still its
    original small static list (the six original codes + Medal, minus
    Multiple), scoped to editing an already-owned coin, where a
    newly-addable reference denomination isn't relevant until a coin of
    that type is actually saved.
- **#10 — a shared, reusable loading indicator for slower async section
  transitions**, visually matching the splash screen's own language (same
  `@keyframes splashSpin` coin-flip spin, at section scale instead of
  full-screen). New `showSectionLoading(containerId, text)` /
  `hideSectionLoading(containerId)` — creates/reuses one `.section-loading`
  element as the container's first child; a repeat call updates its text in
  place rather than stacking a second one. Wired into the two real,
  Graph-backed renders where the container is genuinely empty/stale until
  the fetch resolves: `renderStagingList()` (Staging Review) and
  `renderNeedsAttentionHub()` (the Docket).
  - **Deliberately NOT wired into `ensureLiveNavDataFetch()` (Catalog/Sets'
    first live-data load)** — tried first, then reverted on a real finding:
    `showBrowseTab()` calls `ensureLiveNavDataFetch()` and then immediately
    renders `FAKE_*`-backed cards SYNCHRONOUSLY in the same tick, by
    existing design (that function's own comment: "never blocks"). An
    indicator inserted there gets wiped out by that synchronous render
    before a human could ever see it — confirmed directly in a headless
    reproduction (a monkey-patched, artificially-slowed fetch still never
    showed the indicator, because the synchronous grid re-render — not the
    fetch itself — was what cleared it). This call site's whole point is
    showing something immediately and swapping in real data invisibly
    later, which is the opposite of what a loading indicator is for — so
    it was left out rather than shipped inert.
- **#13 — NGC/ANACS label decode: a real conflict with this file's own
  prior research, flagged rather than built.** This file's "ANACS/ICG/CAC
  label format" section already states, as a CLOSED finding: "NGC is
  confirmed to have no equivalent decodable identity number — its cert
  number is an invoice/sequence ID only, with grade as separate printed
  text." Verified this is still current, not stale — [NGC's own
  documentation](https://www.ngccoin.com/certlookup/) confirms the
  certification number is "the invoice number of the submission and the
  sequence of each coin in that order," which carries no encoded
  denomination/date/mint identity the way PCGS's `SPEC.GRADE/CERT` format
  does; decoding coin identity from an NGC cert number requires a live
  lookup against NGC's own database, which is a live-API integration this
  project has already ruled out elsewhere (see "External data sources" —
  the PCGS OAuth-credentials decision applies here too). Building a "decode"
  function against a number that carries no encoded identity would mean
  either faking a parser that decodes nothing real, or quietly building a
  live NGC API call this project's own rules already say not to. Neither
  is right to do without Ray's explicit steer, so nothing was built — see
  the open question in the chat reply for what to ask him. ANACS is in the
  same unconfirmed-format state this file already documented before this
  batch (0 coins graded by it in the collection, "waits until a coin
  graded by one of them is actually acquired") and wasn't independently
  investigated further this round, per Ray's own "ANACS... at your
  discretion" framing — deferred alongside NGC rather than guessed at
  separately.
- **#14 — Browse detail's Overview cert link now falls back to a live-
  computed URL, root-caused and fixed as asked.** `certDisplayHtml()`
  previously showed a real link ONLY when `CertLink` was already populated
  on the row, and fell to plain text otherwise — even when GradeSource and
  a cert number were both on file and a link was fully computable. Fixed to
  prefer the stored `CertLink` when present (never overriding a curated
  link already on file) and fall back to the exact same
  `buildCertLookupUrl(gradeSource, cert)` Add Coin and Browse Edit already
  use for their own cert-link buttons — one shared resolver, not a second
  implementation. Still renders plain text when neither a stored link nor a
  computable one exists (no GradeSource on file, or that GradeSource has no
  base URL yet in `Lookup_Graders`) — no throw, no broken link.
  `getGraderBaseUrl()` itself still reads `FAKE_LOOKUP_GRADERS` directly
  rather than the live table — a pre-existing, separately-flagged
  limitation this task didn't touch (out of scope; the five real services'
  codes are the same either way, so this doesn't block the fix working
  correctly against live coins today).
- **#15 — Catalog gained a grading-service filter**, same multi-select/OR
  chip pattern Metal already uses (ANDs with Denomination/Metal/
  Commemorative/Year/Search, same as every other Catalog filter axis). New
  `BROWSE_GRADING_SERVICE_CHIPS` (All + one chip per `FAKE_LOOKUP_GRADERS`
  entry + an "Ungraded/Other" catch-all for Seller/Owner/AI-est/blank),
  `browseSelectedGradingServiceKeys`, `browseGradingServiceTest()`. Built
  from the static grader list (not `activeLookupGraders()`) — same
  precedent Add Coin's own Grader dropdown and `buildGradeSourceOptions()`
  already follow; the per-coin test is a plain string comparison against
  `coin.gradeSource`, which works identically against live or mock data, so
  this only affects which CHIPS render, never matching correctness. Lives
  inside `#browseCoinsHeader` alongside Denomination/Metal, so it shows/
  hides with the Coins/Medal tab exactly like those two already do, no new
  visibility logic needed; resets to All on external Browse entry via the
  same `resetBrowseFilters()`/`updateMetalChipsUI()` mechanism Metal
  already uses (that helper was already fully generic by container ID).
  Interpreted as a FILTER, not a sort control — this project's own history
  has moved consistently away from sort dropdowns toward filter pills
  (Rolls' own sort-to-pills conversion is the clearest precedent), so a
  new pill row was the design-consistent reading of "sort/filter by
  grading service," flagged here as a real interpretive call.
- **Verified headless — 32 new assertions (`tests/verify_batch3.js`), all
  passing, zero page errors**, alongside all prior suites re-run clean
  (180 total across 3 suites). Covers: the Finish tier's three-way split
  (real match, real-zero-match, unrecognized-fallback) with a synthetic
  cross-denomination catalog; the series-picker narrowing a real pair down
  to one candidate, a non-matching typed value NOT narrowing, and the tier
  being a genuine no-op with no `description` key at all; the five new
  denom codes present as dropdown options plus DENOM_SCALE/STATS_DENOM_ORDER/
  DENOM_LABELS coverage, and confirming no gold/bullion code leaked in; the
  loading indicator's DOM mechanics (first-child insertion, real computed-
  style visibility, reuse-not-duplicate on a repeat call, text update, clean
  removal) plus a real Staging-Review integration test (an artificially
  slowed mock `listChildren()` call proving the indicator is genuinely
  visible mid-fetch and gone after); the cert-link fallback's four cases
  (stored link wins, live-computed link appears, no-GradeSource stays
  plain, a GradeSource with no base URL stays plain) with no throw; and the
  grading-service filter's chip rendering, real narrowing against
  `FAKE_COINS`, ANDing with Metal, and reset-on-external-entry. Screenshots
  reviewed at both viewports for the new Denomination dropdown, the
  Grading Service filter row, and the Docket's loading indicator — no
  horizontal overflow either width.
- **Not verified: any real device, any real OneDrive session against these
  specific fixes** — same standing caveat as every prior Add Coin round.


### Add Coin Phase 1: Category narrows the DB_Coins matcher (BUILT and merged to main)
Closes the scope gap flagged immediately above, same session, on Ray's
explicit "fix now" call. `dbCoinsCandidatesFor()` gains a Category tier,
following the exact pattern the Finish tier already established
(`knownDbCoinsFinishValues()`), applied to the same real problem: several
Bullion-tier entries deliberately SHARE one plain Denomination — `$1` is
Peace Dollar, Morgan Dollar, Gold Dollar, AND American Silver Eagle; `$50`
is a classic commemorative, American Buffalo, Gold Eagle 1oz, AND Platinum
Eagle 1/2oz — so the base Denom+Year+Mint+Variety key alone can't tell
them apart, and without this fix a Silver Eagle would match/mismatch
against DB_Coins on the same key as an ordinary Dollar.

- **DB_Coins has no Category column of its own** — confirmed via source,
  `mapWorkbookRowToDbCoin()` maps no such field, and this task did not add
  one (a real DB_Coins Category column, if it existed, would need a
  workbook-side change, out of scope for an app-only session). The 487-row
  American Silver/Gold/Platinum Eagle figure Ray confirmed is presumably
  identifiable via `DB_Coins.Description` text (the field that already
  names the coin TYPE — "American Silver Eagle," etc.), not a dedicated
  category field.
- **New `BULLION_CATEGORY_MATCH_HINTS`** — a keyword list per
  `BULLION_TIER_OPTIONS` category, matched against `DB_Coins.Description`
  via substring containment.

**Superseded, same session — real wording confirmed, three categories
promoted to a hard filter.** The paragraph above originally said this tier
stayed soft-only across the board because the real DB_Coins Description
wording was unconfirmed. Ray checked it directly against the live workbook
and reported back real strings: `"American Silver Eagle Dollar"`,
`"American Silver Eagle Burnished Dollar"`, `"Silver Eagle Dollar"`,
`"American Gold Eagle"`, `"Palladium Eagle Dollar"`, and
`"American Buffalo Silver Dollar"` (flagged as a likely mislabeled catalog
entry — the real American Buffalo program is gold-only, no silver Buffalo
bullion issue exists; a workbook data issue for Ray to fix directly, not a
matcher problem). He also checked known false-positive risks — `"Bald
Eagle Recovery"` (a commemorative), `"Flying Eagle Cent"` (a classic 1850s
cent), `"Buffalo Nickel"`, and a Marine Corps commemorative containing
`"American Eagle"` — confirming none of them contain the full two-word
phrases `"SILVER EAGLE"`/`"GOLD EAGLE"`/`"PALLADIUM EAGLE"`, only the
individual words in a different order/context.

- **New `BULLION_CATEGORY_HARD_CATEGORIES`** (`Silver Eagle`,
  `Palladium Eagle`, `Gold Eagle`) — only these three get the real
  hard-zero-narrow the Finish tier already gives a recognized value: a hit
  narrows normally, a genuine miss (the hint matches nothing among THIS
  coin's candidates) narrows to zero, a real signal. Every other category
  stays soft-only exactly as before — either its real wording is still
  unconfirmed (all six classic pre-1933 gold categories: zero DB_Coins rows
  exist for any of them yet, so their hints are untested, not wrong,
  pending an actual coin of that type being catalogued; Platinum Eagle's
  own wording also wasn't among what Ray checked), or the hint word itself
  carries a known collision risk (`"Commemorative"` alone would match Bald
  Eagle Recovery, which IS a commemorative).
- **Two hints were themselves fixed by this pass, not just promoted**:
  `"Palladium Eagle"` was a bare `["PALLADIUM"]` and `"Gold Buffalo"` was a
  bare `["BUFFALO"]` — both single-word, both exactly the collision-risk
  pattern this tier's own design rule warns against (`"Buffalo"` alone
  would false-positive against every real Buffalo Nickel row). Fixed to
  `["PALLADIUM EAGLE"]` (matching the confirmed real wording) and
  `["AMERICAN BUFFALO"]` (a safer two-word phrase; Gold Buffalo itself
  stays soft-only since no confirmed real Gold Buffalo row exists yet —
  only the mislabeled silver anomaly above). **Every hint in this map is
  now a full two-word-or-longer phrase — never collapse one back to a
  single word.**
- **A soft category's hint can still narrow on a coincidental match** — this
  is a known, accepted, and now explicitly tested tradeoff, distinct from
  the hard-zero-on-a-genuine-miss case this pass protects against. `"Bald
  Eagle Recovery Half Dollar"` genuinely contains the bare `"EAGLE"`
  substring, so a soft `"Eagle"` category pick against a candidate set
  including it WILL narrow to that one row — staying soft only prevents a
  wrong hint from clearing everything to zero, it doesn't prevent an
  occasional false-positive narrow on an untested single-word-risk hint.
  This is why every hint promoted to `BULLION_CATEGORY_HARD_CATEGORIES` had
  to be independently checked against every known false-positive risk
  first, not just have real wording confirmed.
- **`addCoinIdentityShape()` gained a `category` field**, sourced from
  `addCoinBullionCategory` (blank for every everyday/classic pick, exactly
  like the Description tier's `isControlledDescription` gate) — the same
  "only Add Coin ever populates this field" pattern the Description tier
  already established, so Browse Edit and the Docket (which build their
  own identity shapes and never set `category`) are completely unaffected.
  `addCoinIdentityShapeKey()` includes it too, so a Category change (e.g.
  toggling Bullion off, or picking a different bullion type) correctly
  invalidates a stale `addCoinResolvedPick`, same as every other
  identity-affecting field.
- **No new call sites needed** — `checkDbCoinsMatch()` (the live banner)
  and `resolveAddCoinCatalogMatch()` (the save-time resolution) both
  already route through `currentAddCoinMatchState()` -> `addCoinIdentityShape()`,
  so both picked up the new tier automatically once the shape carried
  `category`.
- Verified headless (5 assertions in the original pass, this round adds 8
  more — 13 total for this feature, 202 across all 3 suites, zero
  failures): a real Category match narrows a synthetic Silver-Eagle-vs-
  commemorative-Dollar pair to the correct row; a soft category with zero
  hits among the current candidates soft-falls-back to the full set; the
  tier is a true no-op with no `category` field at all (Browse Edit/
  Docket's shape, and any ordinary non-bullion Add Coin entry); end-to-end
  through the real UI, picking "American Silver Eagle" from the actual
  Bullion dropdown correctly sets `addCoinIdentityShape().category` and the
  real matcher narrows to the matching DB_Coins row; this round's own real
  confirmed wording (`"American Silver Eagle Dollar"`/`"...Burnished
  Dollar"`) narrowing correctly and excluding a Morgan Dollar row; a
  CONFIRMED category (Silver Eagle) genuinely absent from a coin's
  candidates now hard-zero-narrowing; the fixed Palladium Eagle hint
  narrowing on the real confirmed phrase; Gold Eagle's real wording
  narrowing correctly and excluding American Buffalo Gold; the unconfirmed
  "Eagle" category NOT hard-zeroing on a genuine miss; the known, accepted
  false-positive-narrow tradeoff for a soft category documented as a
  passing assertion rather than left implicit; and the fixed Gold Buffalo
  hint not falsely matching a plain Buffalo Nickel row while still
  soft-falling-back on its own genuine (unconfirmed-category) miss.
- **Not verified: the real DB_Coins Description wording for the six
  classic pre-1933 gold categories or Platinum Eagle (all still soft-only,
  zero or unchecked real rows), and no real device/OneDrive session** —
  same standing caveat as every prior round in this feature. Promote any
  of them to `BULLION_CATEGORY_HARD_CATEGORIES` only once a real row's
  wording is confirmed AND checked against the same false-positive list
  above.


### Composition: a real matcher input + flip-card display (BUILT and merged to main)
Two related pieces from Copilot's composition research (2026-08-29) plus a
live-testing observation that the flip card's bottom-right corner was unused.

**The bug being fixed.** `DB_Coins.Composition` is a real, populated column
that `mapWorkbookRowToDbCoin()` **never read at all** — it was listed in that
function's own header comment and then not mapped, so the matcher was
structurally blind to it. Copilot found **109 true Clad/Silver Proof pairs**
in the catalog, **99 of which collide on the matcher's own
Year+Denom+MintMark+Variety key** with the SAME Finish ("Proof") and the SAME
Description. For those, Composition is the only field that tells the two rows
apart — so a Silver Proof coin could silently link to the Clad catalog row,
taking its CoinID, Mintage and PCGS# with it (and, since SpotValue's formula
chains through CoinID, its spot value too) with nothing visibly wrong on
screen. That is the same silent-mislink class as this project's two
historical incidents. (Copilot also found and already fixed 2 real catalog
gaps; those were workbook-side and needed nothing here.)

**1. Composition narrows `dbCoinsCandidatesFor()` — the one HARD tier.**
- **Hard, deliberately** (Ray's Q4): a supplied Composition matching no
  candidate returns **zero — No Match**, never a soft fall back to a
  different-composition row. Every other tier is soft or
  conditionally-hard; this one is not, because a soft fallback here IS the
  bug.
- **Not guarded by `candidates.length > 1`** — the only tier that isn't, and
  it matters. Every other tier is a *disambiguator*, earning its keep only
  when there's something to disambiguate. This is a *correctness check on the
  match itself*: if exactly one candidate exists and its Composition
  contradicts the supplied one, that lone candidate is still the wrong row,
  and "there was only one option" is not a reason to accept it.
- **Runs first**, immediately after the base filter, ahead of the
  Description/Category/Finish/Designation tiers — Composition is part of the
  identity key here, not a heuristic. Everything downstream is `length > 1`
  guarded, so a Composition narrow to 0 or 1 correctly short-circuits them.
- **`normComposition()`** — string-normalize ONLY (Q2): `normField()`'s
  trim+uppercase, plus collapsing internal whitespace and `,;/` separators so
  the sheet's hand-entered variants compare equal. It deliberately does
  **not** canonicalize across wordings — `.999 Fine Silver` and
  `99.9% Silver` stay distinct, and it never buckets to the
  Silver/Clad/Gold MetalCategory (bucketing would merge two genuinely
  different coins back into one match, the very bug this fixes).
- **Nothing feeds it yet, and that's intended** (Q1). There is no producer for
  `shape.composition`: Add Coin deliberately has no Composition input
  (Specifications is catalog data, not hand-entered — the accordion redesign
  excluded it on purpose), **All has no Composition column**, and an ID lookup
  (PCGS/Mint Item Number/GSID) already resolves to one authoritative row
  without re-running the matcher. Built now as the correct forward-looking
  contract, same posture as Category being captured on the draft ahead of
  `ALL_WRITABLE_COLUMNS`. **Until a producer exists, the reachable behavior is
  the Ambiguous path, not the No-Match one.**
- **FOR WHOEVER ADDS THAT PRODUCER (Ray's explicit flag, Phase 2):** verify
  DB_Coins' Composition wording is actually clean for whatever it will match
  against BEFORE relying on it — the same diligence the Category hard-zero
  tier required, where each hint had to be confirmed against real wording and
  checked against known false positives first. A hard tier fed by
  inconsistent data creates false Docket misses.
- **Composition unknown + candidates differing only by it => Ambiguous**, with
  **no silent preference of any kind** (Q3) — not even a plausible one like
  "prefer clad for a business strike". This needed no routing code: 2+
  candidates already means the shared picker. What it needed was making
  Composition *visible* there.

**Confirmed scope of the fix against Copilot's own three cases** (checked
before assuming Composition resolves everything):
- **The 109 Clad/Silver Proof pairs** — Composition alone fully resolves.
- **1982-D/S 50C Washington commemorative vs. Kennedy half** — Composition
  alone *also* fully resolves it (the Washington commem is 90% silver, the
  1982 Kennedy is clad, at both D and S). Description would separate them too,
  but isn't needed.
- **1999-P $1, multiple silver dollar programs vs. Susan B. Anthony** —
  Composition does **NOT** fully resolve this one. It splits SBA (clad) away
  from the two commemoratives, but **Dolley Madison and Yellowstone are both
  90% silver** at the same year/mint/denom/variety, and both exist in Proof
  and Uncirculated so Finish doesn't separate them either. Description is
  their only true differentiator.
  **Deliberate call (confirmed): that residual pair stays a PICKER case, not
  a new auto-narrowing Description tier.** Three reasons: the standing firm
  rule is "2+ always reaches a human"; the existing Description tier is
  gated to Ref_Denominations' controlled series vocabulary, which is not
  guaranteed to carry commemorative program names for `$1`+1999 so it likely
  wouldn't fire anyway; and CLAUDE.md's own "Commemorative / Description
  blind spot" assessment already concluded that if picker frequency becomes
  annoying the fix is to *surface Description more prominently, not
  auto-resolve on it* — which the picker already does. **Do not reopen this
  as "Composition didn't fix 1999-P."** It isn't meant to; the picker is the
  answer there, by design.

**Composition surfaced in the candidate displays.** Added to
`renderAmbiguousMatchList()` **and** to both single-candidate Re-check confirm
dialogs (the Docket's `docketRecheckEntry()` and `recheckCoinDraftMatch()`) —
all three are "what am I about to link this coin to" displays and were
inconsistent otherwise. **Composition LEADS the detail line, ahead of
PCGS#/GSID/Mintage**: on those 99 colliding pairs every other displayed fact
is byte-identical between the two candidates, so burying the one
differentiator behind three catalog reference numbers would recreate the
Part-F "both options look identical" bug by another route.

**2. Composition on the saved coin's flip card, bottom-right corner.**
- **That corner did not exist.** `applyFlipCorners()` wrote TL/TR/BL/SR only —
  there was no `browseDetailBR`/`spotlightBR` span at all, so the corner was
  empty by absence, not by choice. Both spans are new.
- **Browse detail AND Spotlight**, which share `applyFlipCorners()` — one
  render path, both get it.
- **Add Coin is deliberately EXCLUDED** (Ray's explicit scoping, correcting
  the original ask): `updateFlipLabels()` (*(removed 23 Oct 2026, commit 6 `c6f0ba0`)*) was a different function with a
  different corner mapping, its `flipObverseBR` already carries
  Variety+Designation as two stacked lines, composition often isn't known
  until an Identification match resolves, and this corner has a documented
  real-device clipping history that a third stacked line would be poking at.
  A regression assertion pins Add Coin's BR to Variety/Designation only.
- **Precious metal only** — gold/silver/platinum/palladium. A clad quarter or
  zinc cent has a composition, but it isn't worth a corner of the coin's own
  graphic; purity is what matters for a coin held for its metal.
- **Detection reads the composition STRING, not `metalCategoryFor()`** (Q6),
  because **Lookup_MetalContent buckets Palladium under "Other"** (a
  documented, intentional call there) — so a palladium coin is structurally
  invisible to the category path, and palladium is one of the four metals
  this covers. `metalCategoryFor()` is the fallback, used only when there is
  no composition string: a live coin can have a MetalCategory (via the
  MetalContentType join) while its DB_Coins Composition cell is blank, and
  showing the bare metal name is strictly more informative than nothing and
  never wrong — it omits the purity rather than inventing one.
  **Note the correction worth remembering: the Specifications panel does NOT
  use `metalCategoryFor()`** — it uses `compositionTextFor()` →
  `FAKE_METAL_CONTENT` (ounce-based, demo rows only). Those are two different
  mechanisms and were conflated in the original ask.
- **Displayed as fineness/percentage, the stored value.** Karat is
  deliberately not used: it's a gold-only convention with no meaning for
  silver, platinum or palladium, so it could not be applied consistently.
- **Excluded: Sets** (`Denomination="Multiple"` — several different coins, no
  single composition). **Included: Rolls** (a roll is one denomination
  throughout, and melt value is exactly why composition is already promoted
  for rolls elsewhere in this file).
- **A coin whose CoinID never resolved shows nothing, silently** (Q5,
  confirmed — no fallback wanted). Composition lives only on DB_Coins, joined
  onto a live coin by `coin.coinId` in `ensureLiveNavDataFetch()` alongside
  the existing `metalCategory` join.
- **Composition rides into the `.sr-only` summary too** — the visible corner
  spans are all `aria-hidden`, so a fact appearing only in a corner would
  otherwise be invisible to a screen reader (the locked-in rule for this
  card).

**A real overflow bug found and fixed during the build, by screenshot, not by
measurement.** Composition is the longest thing any corner carries. At the
shared 27px, realistic values run **145–192px** (`.999 Fine Silver` 145,
`99.95% Platinum` 157, `.9995 Fine Palladium` 192, `90% Silver, 10% Copper`
219) against this box's 50%-of-frame cap of **140px** — and because
`.flip-label` is `white-space: nowrap` with **no `overflow: hidden`** (removed
deliberately, see its CSS comment) and is anchored by `right`, the excess
spills **RIGHTWARD past the frame's own edge and gets visually cut**. 4 of 8
realistic strings overflowed. Fixed two ways, both measured:
- **`#browseDetailBR, #spotlightBR { font-size: 22px; }`** — scoped by ID, so
  it can never reach Add Coin's own BR corners, which must stay at 27px.
  Composition is genuinely secondary to the identity/grade values in the other
  three corners, so it takes a smaller size rather than a wider box: this
  brings every realistic value inside the *existing* cap with **no geometry
  change at all**, so it cannot collide with the coin disc or with the Grade
  label sharing its row. 22px is deliberately clear of the 20px that drew
  Ray's original "too small to read on phone" report.
- **`compositionLabelCandidates()` + `setFittedCornerText()`** — the same
  `scrollWidth`/`clientWidth` measured shortening `renderTypeDenomCorner()`
  uses, which that CSS comment already names as the thing that actually
  prevents unbounded corner overflow. The chain only ever **reduces**, never
  rewords or recalculates a purity: stored value verbatim → precious-metal
  terms only (`90% Silver, 10% Copper` → `90% Silver`, dropping a balance
  metal this corner exists to say nothing about) → without the filler word
  "Fine" (`.9995 Fine Palladium` → `.9995 Palladium`). A value that already
  fits is shown untouched.
- **Worth remembering:** a corner label's BOX always overlaps the disc's box —
  the disc is a circle and the labels sit in the empty corners around it — so
  a box-intersection test is meaningless here and a first version of the
  suite failed on exactly that bad assertion. What actually matters is that
  the text stays inside its own box, inside the frame, and in the same
  vertical band as the label opposite it.

**Verified headless — new committed suite `tests/verify_composition.js`, 74
assertions, all passing; 424 across all 12 suites, zero failures, zero page
errors.** No prior assertion needed changing — nothing in this pass altered
existing behavior. Coverage: the mapper reading Composition; every
`normComposition()` rule including the deliberate non-canonicalization;
the hard tier's five branches (each composition resolving to its own row,
normalized matching, the No-Match case, and the single-candidate
contradiction); the tier being a true no-op with no/blank `composition` so
Browse Edit and the Docket are unaffected; the ambiguous path returning 2
candidates that are identical on every other displayed field; the picker
rendering both compositions, the two cards no longer being textually
identical, and Composition leading the detail line; precious-metal detection
including palladium and the confirmation that the category path could not
have caught it; Set/Roll/unresolved-CoinID handling and the category
fallback; the BR spans existing and rendering on Browse detail and Spotlight;
the sr-only summary; **Add Coin's BR pinned to Variety+Designation** (scope
guard); the reduction chain in isolation including purity never being
altered; and layout at both viewports with the measured worst-case strings.
**Both halves have verified negative controls** — neutering the hard tier
fails 5 assertions, and neutering the fitting *in `applyFlipCorners()`
specifically* fails 3 more. That second control was added after a first
version of the suite passed with the fitting removed, because it called
`setFittedCornerText()` directly instead of going through the real render
path — the same "green suite hiding a real bug" trap this file has recorded
before. Screenshots reviewed at both viewports for all four worst-case
strings.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round on this branch. In particular the real
  DB_Coins Composition wording has not been independently checked from this
  environment; the demo values seeded on `FAKE_METAL_CONTENT` and the
  1999-S Clad/Silver pair seeded in `FAKE_DB_COINS` are representative
  stand-ins so both halves are exercisable with `ENABLE_LIVE_NAV_DATA` off.


### Finish conflict on a single match, real direct-write for a clean match, visible Promote loading state (BUILT and merged to main)
**Merge status correction:** this section previously read "held on branch
`claude/code-primer-u8uv1d`, live-device testing required before merge,
especially FEATURE B, per Ray's own explicit instruction." Ray ran that
live pass himself — including the FEATURE B direct-write path specifically
— confirmed working, and gave explicit merge go-ahead ("all was tested and
good"). The branch was merged to `main` (fast-forward, no conflicts) with
the full 1723-assertion suite re-run clean on the merged tree. **`main` is
now the source of truth for FIX A/FEATURE B/FEATURE C**, same standing as
every other merged-after-holding branch in this file.

Three items from Ray's live Add Coin testing, the second building directly
on the first's now-trustworthy signal.

**FIX A — the single-candidate path skipped the Finish check entirely.**
`dbCoinsCandidatesFor()`'s Finish-narrowing tier was gated by `candidates
.length > 1` — so once the base Denom+Year+Mint+Variety key resolved to
exactly ONE candidate, Finish was never consulted at all, and a real
mismatch was silently accepted. **Confirmed root cause of a real 2025
Reverse Proof cent silently matching a Business-Strike-only catalog row.**
Every other tier in this function (Composition, Description, Category,
Designation) either runs unconditionally or is a genuine disambiguator
that only earns its keep with 2+ candidates — Finish was the one tier that
skipped its own correctness check on exactly the case (a lone, wrong
candidate) where a check matters most.
- **Fixed by restructuring the outer gate from `candidates.length > 1` to
  a plain `normField(shape.finish || "")` check**, with the multi- and
  single-candidate cases handled as two internal branches rather than one
  now-wider condition — the multi-candidate branch is copied verbatim,
  untouched in behavior. The new single-candidate branch follows the exact
  same recognized-vs-unrecognized rule the multi-candidate branch already
  established: only a real, **known** DB_Coins Finish value
  (`knownDbCoinsFinishValues()`) that actively **disagrees** with the sole
  candidate's own Finish routes to No Match (zero candidates); a blank or
  unrecognized/All-only Finish value (Circulated, Various — never a real
  DB_Coins category) never manufactures a false miss, same protection the
  multi-candidate branch already gives those values.
- **No change to any other tier, and no change to the multi-candidate
  Finish logic itself** — this is purely closing the one case that tier
  never reached.

**FEATURE B — the real direct-write path for a clean, unambiguous match.**
Until now, both Add Coin save buttons wrote only a Staging draft; a
separate, manual Promote click (Staging Review or the Docket) was always
required to reach `All`. Now: when a coin resolves to exactly one
unambiguous DB_Coins match (`match.how !== "none"` — either a lone
candidate, now Finish-checked thanks to Fix A, or a candidate the user
deliberately picked from the ambiguous list), **"Save to Database" writes
the Staging draft AND immediately reuses `promoteCoinDraft()`'s own real
write path in the same click** — no separate trip to Promote needed. An
ambiguous, conflicting, or unmatched coin keeps "Save to Database"
unavailable (`display:none`, same mechanism as before); "Save to Staging"
is completely unaffected and always available regardless of match quality.
- **`match.how !== "none"` IS the "no Finish/Composition conflict" signal
  — there is no separate flag to check.** Fix A already folds a real
  Finish disagreement into `dbCoinsCandidatesFor()`'s own resolution: a
  lone candidate whose Finish contradicts the recorded one now resolves to
  zero candidates, i.e. `match.how === "none"`, before `completeAddCoinSave()`
  ever sees it. Composition has no producer on Add Coin at all today (see
  `dbCoinsCandidatesFor()`'s own comment — "Add Coin deliberately has no
  Composition input... the reachable behavior is the Ambiguous path, not
  this one") — its hard tier never narrows anything from this form, so
  there is nothing further to check for it either. Both halves of "no
  Finish/Composition conflict" are already true by construction once
  `match.how !== "none"`.
- **Reuses `promoteCoinDraft()` directly — not a second copy of its write
  path.** `completeAddCoinSave()` writes the draft (with photos/receipt)
  exactly as before, then, for `destination === "database"` with a
  resolved match and the write layer on, calls `promoteCoinDraft(collectionId)`
  — the SAME function Staging Review's and the Docket's own Promote
  buttons call, including its own toast, the real photo move
  (`movePromotedCoinFiles()`), and the live-data cache refresh
  (`refreshLiveCoinsAfterWrite()`). Nothing about `promoteCoinDraftToAllSheetUnlocked()`
  or its lock (`coinPromoteInFlight`) needed touching — a save-triggered
  promote and a manual one are now genuinely the same code path with two
  entry points.
- **The check is real, not redundant with the button's own visibility.**
  `updateSaveConfidenceUI()` only SHOWS the button once the match looks
  resolved at RENDER time, but `resolveAddCoinCatalogMatch()` re-resolves
  fresh at SAVE time — an identity edit between a render and the click (or
  clicking "None of these" inside the very picker this click just opened)
  can still land in `completeAddCoinSave()` with a genuinely unresolved
  match despite the button having been visible. `destination === "database"
  && match.how !== "none"` is checked again at that point, and a mismatch
  falls straight through to the ordinary Staging-only save below it —
  verified directly (a synthetic `match.how: "none"` passed to a
  `"database"` save writes nothing to `All` and never calls
  `promoteCoinDraft()`).
- **The static "No unrecognized Variety flagged — ready for a direct save"
  message is gone**, replaced with real logic in `updateSaveConfidenceUI()`:
  - **Confident** (`#saveConfidentMsg`, now populated dynamically): with
    the write layer on, "Resolved to a single, clean DB_Coins match — Save
    to Database writes this coin straight to the All sheet in one step."
    With it off, the original mockup-appropriate wording is kept ("ready
    for a direct save").
  - **Not confident** now distinguishes THREE reasons, not two — Variety
    unrecognized (unchanged wording), a genuinely unresolved 2+ ambiguous
    match (new: "N catalog entries match this coin, and none is picked
    yet — Save to Database is unavailable until you resolve which one...
    Save to Staging in the meantime"), and a genuine zero-candidate miss
    (unchanged wording, "No single DB_Coins entry resolved..."). Before
    this fix the ambiguous and zero-candidate cases shared one message
    that was actively misleading for the ambiguous case (claiming "there's
    no catalog row to link it to" when there are 2+).
- **Both interim banners updated again**, since FIX 1's own rewording
  ("both options write to the same Staging draft... neither adds an
  All-sheet row directly") is no longer universally true. `addCoinInterimBanner`
  now states the real behavior: a clean match writes straight into All in
  the same step; anything else falls back to a Staging-only save.
  `stagingInterimBanner` gained one clause noting that a cleanly-matched
  coin won't show up there at all anymore, since it already wrote straight
  to `All` from Add Coin.

**FEATURE C — a visible loading indicator during a real write.** Clicking
Promote used to just gray the button and swap its text to "Promoting…" —
not obvious enough on a write that can take several real seconds (this is
literally what caused the AY-00706 double-submit incident this project has
already fixed once). Reuses the splash screen's own spinning-coin
motif — the identical `splashSpin` keyframes `showSectionLoading()`/
`hideSectionLoading()` already reuse at section scale — rather than
inventing a third loading style.
- **New `.btn-spin-disc` CSS** — a small inline-block 🪙 glyph, `splashSpin`
  animation, sized for button text (13px, `vertical-align: -1px`).
- **`runWithButtonPending()` (the ONE shared helper every real-write action
  button in the app already goes through — Promote, Force Add, Mark ready,
  Re-check, Reject, Revert to Draft, Dismiss, on both Staging Review and
  the Docket) now injects it** alongside the pending label:
  `<span class="btn-spin-disc" aria-hidden="true">🪙</span><span>Promoting…</span>`,
  in place of a bare `textContent` swap. Capture/restore switched from
  `textContent` to `innerHTML` accordingly (`originalHtml`, not
  `originalLabel`) — lossless for every real caller, since every existing
  button label is plain text. One change here covers every button already
  wired through this helper, with no per-button edits needed.
- **Add Coin's own Save button gets the identical treatment**, inlined at
  its own two call sites (the "Saving…" label at the top of
  `completeAddCoinSave()`, and its `finally` restore) rather than routed
  through `runWithButtonPending()` — that function's own "call first, then
  decide" shape doesn't fit a save that's already inside its own
  `try/finally`, so this is the same visual output via the same CSS class,
  applied directly.

**Verified headless — new committed suite
`tests/verify_finish_conflict_and_direct_write.js` (31 assertions), all
passing; 1723 across all 41 suites, zero failures, zero page errors.**
Covers: FIX A's single-candidate branch in all four states (a real
recognized disagreement zeroing out, agreement staying at 1, a blank
Finish never narrowing, an unrecognized/All-only Finish never manufacturing
a miss) plus a sanity check that the pre-existing multi-candidate branch is
untouched; FEATURE B's readiness banners at the UI level for a clean match,
a Finish-conflict "single" candidate (FIX A engaged, reading exactly like a
genuine miss), an unresolved ambiguous match (its own new wording,
distinct from a genuine miss), and a genuine zero-candidate miss (original
wording preserved); a full end-to-end save-to-database through the real
mock Graph client — the coin lands directly in `All` with both keys and
its other captured data, the draft ends `Promoted` (never sitting in
Staging Review's "Needs a decision" list), and `promoteCoinDraft()` is
confirmed CALLED (not a parallel write) via a wrapped spy; the identical
clean match through Save to Staging confirmed to NOT auto-promote (no
`promoteCoinDraft()` call, the All sheet untouched, the draft written as an
ordinary awaiting-Promote Staging draft); the defensive `match.how ===
"none"` fallback for a database-destination save invoked directly with an
unresolved match (no throw, no promote attempt, nothing written); and
FEATURE C's spinning disc genuinely absent before, present with the
correct label during, and cleaned up after a real gated Add Coin save.
**Two verified negative controls**: FIX A's own NEG block reconstructs the
exact pre-fix rule (Finish only ever checked when `candidates.length > 1`)
against the identical fixture and confirms it WOULD have silently accepted
the mismatched row (`oldRuleResult === 1`) while the real, currently-shipping
function correctly reports zero — proving the positive assertions exercise
a genuine fix, not a restatement of already-passing behavior; and
`verify_promote_race.js`'s own pre-existing "pending-state helper" block
(H1/H4) was updated (not weakened) from an exact-equality `textContent`
check to a substring check plus a dedicated `.btn-spin-disc`
presence/absence assertion, following FEATURE C's real design change — the
button's `textContent` now genuinely includes the (aria-hidden) coin glyph
alongside the label during the pending state, and a bare substring match
alone wouldn't prove the actual new element exists, which the added
`hasSpinDisc` check does directly.
- **Not verified: any real device, any real OneDrive session.** Per the
  task's own explicit instruction, this needs a live pass before merge —
  especially FEATURE B: confirm a genuinely clean match (single
  unambiguous DB_Coins row, Finish agreeing) writes straight to All with
  Save to Database and no separate Promote step is needed; confirm a real
  Finish mismatch or a genuinely ambiguous match correctly makes Save to
  Database unavailable rather than writing the wrong row; and confirm Save
  to Staging still works unconditionally regardless of match quality. Held
  on `claude/code-primer-u8uv1d`, not merged to `main`, until that pass
  comes back clean.


### Description consistency gate + Category lone-candidate fix (BUILT and merged to main; built on `claude/brave-wozniak-6fobpg`, tip `b6d82de`, landed via rebase; the code is on `main`)
Ray's live repro: Year 2026 / no mint / `$1` / Business Strike with
**"Trump"** typed into Description silently auto-matched `C-2026--$1-01` —
a different real 2026 dollar — behind a green "Matched DB_Coins" banner
with no picker. He ran it twice; the first run he promoted deliberately, so
a mismatched row sits in `_Testing` (disposable, no cleanup needed). Core
identity-matching territory, so it was held for Ray's explicit merge
go-ahead, same standing as Thread A and the Docket build; **since merged to
`main`**.

**Investigated before building, and the investigation changed the fix.**
Two independent causes, both confirmed by driving the real form headlessly
rather than by reading the code:
1. `addCoinIdentityShape()` blanks a **free-typed** Description before the
   matcher sees it — only Ref_Denominations' controlled series values pass
   through (the standing "Commemorative / Description blind spot" rule).
   Working as designed. For `$1`/2026 the controlled vocabulary is exactly
   `Various Issues` / `Native American` / `American Innovation` — **none of
   which is a Trump dollar**, so the picker offered no honest option either.
2. **Even a controlled Description could not have stopped it.** Verified
   directly: substituting a real controlled series still returned the same
   single candidate. The Description tier is `candidates.length > 1`-guarded
   and soft. **A tier guarded by `length > 1` can never validate a LONE
   candidate** — structurally the identical blind spot FIX A closed for
   Finish (2026-09-08).

**Measured: which tiers can reject a lone wrong candidate.** Composition →
yes (hard, unguarded — but no producer exists, so unreachable). Finish →
yes, since FIX A. Designation → no, soft by design. **Description → no.
Category → no.** So fixing Description alone would have left the same class
of bug one tier down; both are fixed here.

**Part A — the Description gate is a CONFIDENCE gate, not a matcher tier.**
It lives beside `isVarietyRecognized()` and `dbCoinsCandidatesFor()` is
untouched by it. The asymmetry that makes this safe, and that the standing
rule does not forbid: **using loosely-corresponding text to REJECT a match
is safe where using it to SELECT one is not** — rejecting never picks a
row, it only declines to trust one silently.
- **Token overlap, never string equality.** Equality would have been a fix
  worse than the bug: Ref_Denominations is program-level (`Washington ATB`
  covers 2010-2021) while DB_Coins carries the per-design name (`Grand
  Canyon Quarter`) — `applyMatchedDescriptionToForm()` exists *because* they
  differ — so equality would refuse every State Quarter, ATB and First
  Spouse. Sharing one identity-bearing word is the test.
- **`DESCRIPTION_GENERIC_TOKENS` is deliberately tight** and must stay so:
  every word added makes a false refusal likelier. It strips denomination
  nouns, the country and connectives, and pure-numeric tokens (Year is
  already the matcher's own base key). **Never add an identity-bearing word
  to it** — `EAGLE` stays (it is all that survives "Quarter Eagle"), and so
  do `GOLD`/`SILVER`. Stripping `DOLLAR` is what stops "Trump Dollar"
  agreeing with "American Silver Eagle Dollar" on that word alone.
- **Fail-safe throughout**, same posture as every soft tier: blank
  Description, a controlled series value, a row with no Description, or a
  typed value with no identity-bearing token left all return "consistent".
- **A deliberate pick from the 2+ picker is exempt.** That is the one place
  this app already forces a human to look, the candidate list renders each
  row's Description, and they chose anyway — refusing afterwards would be
  second-guessing the strongest signal in the system.
- **KNOWN, ACCEPTED LIMIT, asserted rather than left implicit**: one shared
  word is the threshold, so "Gold Eagle" vs "American Silver Eagle Dollar"
  passes this gate (they share `EAGLE`). It does not need to catch that —
  a Bullion-tier pick carries a Category, and the Category tier rejects
  exactly that pair. This gate is the backstop for free-typed text, not a
  second matcher.

**Part B — the CoinID is withheld, not just the button (this is the actual
fix).** Withholding direct-write alone would have been a delay, not a fix:
Promote is offered on any draft whose CoinID resolved, so a conflicted coin
saved to Staging would still carry the contested link and could be promoted
into All a step later — reproducing the exact harm (a row reading "Trump"
whose CoinID pulls another coin's Mintage, PCGS# and, through the SpotValue
formula chain, its spot value). `resolveAddCoinCatalogMatch()` now resolves
a conflict as `how: "none"` with **no CoinID attached**. `"none"` rather
than a new value on purpose — every existing consumer then does the right
thing with no changes: CoinID pending, draft lands in the Docket's research
section, Promote correctly unavailable, Force Add still there as the
deliberate override. A `descriptionConflict` marker rides along so
`buildCoinDraft()`'s research note says a link was **withheld** (naming the
row) rather than claiming no catalog row exists — different problems,
different fixes.

**Part C — the green banner is suppressed, not just the button** (Ray's
call): a confident-looking banner beside a row we have privately decided
not to trust is worse than an honest unresolved state, because the
Staging-unmatched review meant to catch it would sit behind a banner that
looks fine. Its own `#dbDescriptionConflictBanner`, not a reuse of
`dbNoMatchBanner` — "no catalog entry exists" and "one exists but probably
is not this coin" need a human to do different things. It **names the row
and its CoinID** so the disagreement is checkable, and the contested row's
name is deliberately NOT written over what the user typed (that would erase
the very disagreement being reported). Two live recovery paths, both
asserted: clear the Description, or correct it to one that agrees.

**A real gap found while building, not in the original scope.** Typing into
Description did not re-run `checkDbCoinsMatch()` — its listener only reset
the autofill flags. So the first version of this fix left the green banner
and the Save button showing whatever the last Year/Denom/Mint/Variety/Finish
change computed, going stale the instant only the Description changed —
which is the repro itself. Description is now a real input to the match
*evaluation* (though still not to `dbCoinsCandidatesFor()` when free-typed),
so its listener calls `checkDbCoinsMatch()`, same rule the Finish/
Designation/GradeSource listeners already follow for their own tiers.

**Part D — Category's identical `length > 1` gap, closed.** Mirrors FIX A.
The body already handled both cases correctly (a hit keeps the row; a miss
zeroes a hard category and falls through for a soft one), so unlike FIX A
this needed no branch split — only the guard removed. Still gated on
`shape.category` being set, which only a Bullion-tier pick ever does.
**Blank Category is deliberately still NOT treated as a value** ("this is
not a bullion coin") — most real rows legitimately have none, DB_Coins has
no Category column at all, and defining that blank is a flagged open
question, explicitly out of scope.

**BLAST RADIUS (as originally built — Re-check is SUPERSEDED, see the
follow-up section below).** `buildBrowseEditIdentityShape()` carries neither
`description` nor `category` (asserted), and `docketRecheckEntry()` carries
neither — both still completely unaffected. The one exception flagged at the
time: `recheckCoinDraftMatch()` (the coin-draft Re-check) is the only
non-Add-Coin caller that passes `category`, so a draft carrying a confirmed
hard Category gets "still nothing found" instead of a lone disagreeing
candidate offered for confirmation. Same safe direction, only reachable for a
Category that came from the controlled Bullion dropdown, and Re-check never
auto-applied anyway. **Ray's live test then showed the Description half of
this "zero radius" was a hole, not a boundary** — the gate not reaching
Re-check meant a withheld CoinID could be re-attached in one tap. Fixed in
the follow-up; block L's L3 is now L3a/L3b and asserts the opposite of what
it originally did.

**Verified headless — new committed suite
`tests/verify_description_conflict_gate.js` (62 assertions).** Covers the
token helpers in isolation including every fail-safe; the exemptions; the
reported repro end-to-end through the real UI (green banner suppressed,
conflict banner shown and naming the row, direct write withheld, the fourth
not-confident reason, the typed value not overwritten); **the
false-positive guard** (a free-typed "Grand Canyon" against "Grand Canyon
Quarter" is accepted, green banner and direct write intact); the deliberate
pick exemption; the save path withholding the CoinID with an agreeing
control still resolving normally; the draft's distinct research note; the
Category tier's four states; the blast-radius assertions; the two recovery
paths; and a nav/overflow smoke. **Two negative controls**, each
reproducing the pre-fix rule verbatim against the identical fixture and
confirming it WOULD have accepted the coin — proving the assertions
exercise real fixes rather than already-passing behaviour.
- **One assertion was corrected during the build rather than the code**:
  A8 originally claimed "Gold Eagle" and "American Silver Eagle Dollar"
  disagree. They share `EAGLE` — the test was wrong, not the gate. It now
  asserts the real behaviour and names it as the accepted limit, with A8b
  pinning `GOLD`/`SILVER` as tokens that must never be stripped.
- **Not verified: any real device, any real OneDrive session.**
- **Still unanswered, and worth Ray checking directly**: what
  `C-2026--$1-01` actually is, and whether the real 2026 Trump `$1`
  (regular P + July 4th Privy, 250,000) exists in DB_Coins at all. If it
  does not, every 2026-P `$1` entered lands on whatever row *is* at `-01`.
  Neither is checkable from a coding session.

**ANSWERED by Ray's live pass (2026-10-03), so the question above is
closed:** `C-2026--$1-01` is the **American Silver Eagle Dollar** (Business
Strike, West Point). Both real Trump rows DO exist in the copy —
`C-2026-P-$1-07` and `C-2026--$1-04` (July 4th Privy, blank mint). A blank
Variety excludes `-04`, which is exactly why Test 1 produced a lone `-01`.
So the collision class is real and ordinary, not a missing-catalog-row
artifact: a blank-mint blank-Variety 2026 `$1` legitimately resolves to the
Silver Eagle row, and the gate is what stops that being silently accepted.

**Live-test results on `d3439a4` (Ray, 2026-10-03) — all seven passed.**
The reported repro (lone `C-2026--$1-01`, red banner, CoinID withheld, draft
in Staging with "CoinID pending", no Promote); a blank-mint Enhanced
Uncirculated "Trump" refusing on the lone Morgan row, with clearing the
Description or typing "Morgan" recovering live; `P`/Uncirculated/"FIFA World
Cup" staying green; the real Trump Privy with Variety "July 4th Privy"
staying green; `P`/Business Strike/"Trump" producing a picker whose Trump
row resolves cleanly with no conflict message; Category rejecting a lone
non-Eagle row and accepting a lone Eagle row; and the banner re-running live
as the Description is typed.


### Re-check applied the gate too; three note strings corrected (BUILT and merged to main; built on `claude/brave-wozniak-6fobpg`, tip `b6d82de`, landed via rebase; the code is on `main`)
Live finding on `d3439a4`, from the same pass: staged draft `AY-00724`
(Description "Trump", CoinID deliberately withheld for `C-2026--$1-01`)
offered, on ONE tap of **Re-check**, *"One match found: DB_Coins now has a
match"* with a **Link CoinID** button and no warning at all. Three commits,
deliberately separable.

**Why the gate didn't run — structural, not a missed condition.** The gate is
three layers and only the bottom one was reusable: the pure comparison
(`descriptionsShareIdentity()`), the wrapper
(`isDescriptionConsistentWithMatch()`, which read `#description`/
`#denomination`/`#year` straight out of the DOM), and the wiring
(`currentAddCoinMatchState().descriptionConflict`, read by
`isConfidentMatch()`/`checkDbCoinsMatch()`/`updateSaveConfidenceUI()`/
`resolveAddCoinCatalogMatch()`). `recheckCoinDraftMatch()` goes straight to
`dbCoinsCandidatesFor()` and touched neither of the upper two, and the
wrapper could not be called from a draft at all. **Not academic:**
`applyCoinDraftMatch()` writes the CoinID onto a real All row via
`writeCoinIdCell()` when the draft is force-added, and flips it to
`PROMOTED`. `AY-00724` wasn't, so it stopped at the JSON — the same tap on a
force-added draft reaches the sheet.

**Commit 1 — the gate reaches a stored draft.**
- `descriptionConsistentWith(typedDescription, denomCode, year, row)` is the
  pure core; `isDescriptionConsistentWithMatch(row)` is now a thin
  form-reading wrapper over it, byte-identical in behaviour for every Add
  Coin caller (the original 62 assertions re-ran unchanged as the proof).
  `lookupDescriptionCandidates()` was already pure, so the
  controlled-vocabulary exemption works identically from a draft.
- `coinDraftWithheldRow(draft, candidates)` answers the same question of a
  draft, returning the conflicting row or `null`.
- **The MATCHER IS STILL UNTOUCHED.** `dbCoinsCandidatesFor()` still receives
  no `description` from any caller, so nothing there can select or narrow on
  free text — the gate runs AFTER it, as a confidence check on the result.
  That distinction is the whole reason the standing "Commemorative /
  Description blind spot" rule isn't being broken: using loosely-corresponding
  text to REJECT a match is safe where using it to SELECT one is not.
- **The conflicting outcome is a REFRAMED dialog, not a refusal** (Ray's
  call, option b of three). Title "One possible match — may not be this
  coin"; the body names both Descriptions and says the CoinID was withheld at
  capture; **Cancel is first and carries the primary styling**; the write is
  demoted to "Link anyway". Reasoning: a human asked the question, Re-check
  never auto-applies anything, and the row may genuinely be right with a
  Description that merely reads oddly — the gate's job is to stop a SILENT
  link, not to forbid an informed one. The deliberate click is the
  confirmation, the same rule the 2+ picker already works by. Treating it as
  zero candidates (option a) would have made such a coin permanently
  unlinkable from here; blocking outright (option c) would have forced an
  Edit-and-re-save for a row that may be correct.
  - **Worth knowing about "default":** `showWriteGuard()` has no focus or
    keyboard-default concept at all — `primary` is purely the gold styling,
    and buttons render in array order. Cancel-first-and-primary is therefore
    the strongest default that shell expresses. Autofocusing the primary
    button was considered and **rejected**: `primary` is the DESTRUCTIVE
    action in several other guard dialogs (Reject, Force Add, Dismiss), so
    making Enter activate it would be actively dangerous there.
- **The 2+ ambiguous branch is deliberately NOT gated** — the picker renders
  each candidate's own Description, so choosing from it IS the confirmation.
  Same exemption the Add Coin path makes.
- **NO stored "withheld" flag, deliberately.** `matchedHow` is `"none"` for
  both a withheld link and a genuine gap, so a `descriptionWithheld` field
  looks tempting. It would go stale in both directions: Phase A's draft
  editor (`beginCoinDraftEdit`) can change the Description after capture, so
  a flag written once would keep claiming a conflict that has since been
  corrected, or miss one newly introduced. The draft already carries every
  input the rule needs, so recomputing is strictly better than a second
  source of truth. `researchNote` stays as the human-readable audit line.

**Commit 2 — three note strings said "no DB_Coins match" for a WITHHELD
link.** A row does exist; it was distrusted. The Research-section note went
further and told the user to *"research the catalog gap"* — sending them to
fix something that isn't wrong. Corrected at all three sites (Docket Staging
section, Docket Research section, Staging Review's pending note), each
reading one shared signal, `coinDraftWithheldRowFor()`, and naming the
conflicting row. A genuine gap keeps its original wording verbatim, and
**Mark ready stays enabled either way** — a wording fix, not a new hard gate.
- `coinDraftMatchShape(draft)` was factored out of `recheckCoinDraftMatch()`
  so the notes and the dialog ask the matcher the identical question; two
  inline copies would be free to drift, and notes contradicting the dialog is
  the exact bug class being fixed.
- **Recomputed per render, not cached**: one matcher scan per unresolved
  draft, the same order of work the hub already does per row
  (`findDbCoinsMatch()` for mock rows, `coinMissingPhoto()` for every coin)
  against a handful of drafts. Caching it would reintroduce precisely the
  staleness the recompute exists to avoid.

**Commit 3 — Force Add's route named correctly (copy only, no new button).**
Two messages promised an unmatched coin "can be linked or Force Added from
there" / "or Force Add it unlinked", meaning Staging Review. **It can't be:**
Force Add renders at exactly ONE call site, the Docket's Research rows,
reached only once a draft is `READY` with no CoinID (`stagedHandedOff`). Ray
went looking for a button that was never on that card. Deliberately a copy
fix: Mark ready is a real decision point ("capture is done") and Force Add
writes a real All row, so offering it on a Draft-status card would let a
half-captured coin reach the sheet in one tap from a card that
simultaneously says the CoinID is pending. The existing route is one extra
tap and non-destructive both ways (Revert to Draft undoes Mark ready).
Source-text guards now pin Force Add to that one site, so a future change
can't quietly move it.

**`docketRecheckEntry()` — a KNOWN, DELIBERATE GAP, left alone (Ray's
call).** It has the identical structural bypass and does carry a description
(`entry.desc`, set by `flagCoinIdNeedsRelink()`), so extending the gate there
would be mechanically easy. Not done, on purpose: that value is
`All.Description` — a **curated** per-specimen value on an already-owned coin
— not a free-typed Add Coin entry, and the standing blind-spot rule is
specifically about those two being different sources. On the real path the
only producer of these entries is Browse Edit's identity-edit re-link (Add
Coin's own docket push is mock-path-only). Revisit only with a deliberate
decision, not as an obvious extension.

**Verified headless — the suite grew 62 → 90 assertions** (`+13` block M,
`+10` block N, `+5` block O); full `npm test` re-run clean.
- Block M drives the REAL `recheckCoinDraftMatch()` against a draft shaped
  exactly like `AY-00724`: the reframed dialog and title, "now has a match"
  absent, both Descriptions and the withheld reason present in the body,
  Cancel first and primary, Cancel writing absolutely nothing, "Link anyway"
  still performing the real link, an AGREEING draft keeping the original
  dialog verbatim, the 2+ picker still ungated, and a genuine gap still just
  toasting.
- Block N drives the real `renderStagingList()`/`renderNeedsAttentionHub()`
  for all three note sites, in both the withheld and genuine-gap states, plus
  the shared signal's four cases in isolation.
- Block O covers both corrected messages and the Force Add source guards.
- **Negative controls, each applied to the real `app.html`, run, and
  reverted**: disabling the Re-check gate fails exactly M1–M6 **by name**
  and reproduces the reported "One match found" symptom; forcing
  `coinDraftWithheldRowFor()` to always report "genuine gap" fails exactly
  N1/N4/N5/N7 while every unchanged-wording assertion correctly still passes.
- **Three test-quality fixes worth recording, all found by running the
  controls rather than by inspection.** (1) `__clickGuard` originally
  THREW on a missing button, so the first control aborted the evaluate and
  took 8 later assertions down with it — a control must fail by name, not by
  crashing; the same lesson this file has already recorded twice. (2) M5
  ("Cancel writes nothing") passed under the control, because it is true of
  the pre-fix dialog too — the classic assertion whose broken case also
  returns the passing value; it now also asserts it cancelled the REFRAMED
  dialog, which is what makes it discriminate. (3) The draft fixture
  originally used plausible-looking `type: "coin-draft"` / `status: "Draft"`
  instead of the app's real `COIN_DRAFT_TYPE` (`"coin"`) and full status
  strings. Block M passed anyway, because `recheckCoinDraftMatch()` is handed
  the object directly — **block N is what caught it**, since
  `listCoinDrafts()` filters on the real type and the section splits branch on
  the exact status strings, so the fixture was silently invisible to both.
- **One existing fixture followed the real design change rather than being
  weakened**: `verify_docket_sections` block H seeded `description: "Now
  Matchable"` against a `"Lincoln Wheat Cent"` catalog row, which the gate now
  correctly treats as withheld — so that block was getting the reframed dialog
  instead of the ordinary confirm path it exists to test. Its description now
  corresponds to the row. Loosening its button matcher instead would have made
  it stop distinguishing the two dialogs at all.
- **Not verified: any real device, any real OneDrive session.**


