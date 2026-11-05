# Reference: ADD_COIN_WRITE (moved out of CLAUDE.md in the (am) slimming, 4 Nov 2026)

Read this file when: touching Add Coin's Save, Staging coin drafts, Promote / Mark ready, CollectionID reservation, the direct-write vs Staging choice, or post-save Albums matching.
Back to [CLAUDE.md](../../CLAUDE.md). Sections below are verbatim from CLAUDE.md as it was at commit `a7fcb20`; the original line numbers are in [docs/INDEX.md](../INDEX.md).

## Add Coin: the core workflow
1. Camera/library capture (existing pattern: separate 📷 Camera and 🖼️ Library
   buttons per photo slot — required for Samsung Internet, which skips the native
   chooser dialog).
2. Review/confirm screen before save.
3. **Direct write attempt**: assign next CollectionID, write row to the All table via
   the Graph Excel API, save photos into CoinPhotos named with that CollectionID —
   all in one step. CollectionID is only ever assigned at the exact moment the Excel
   write also succeeds — never assigned speculatively.
4. **Fallback**: if the write fails (workbook locked elsewhere, etc.), fall back to
   the existing Staging folder pattern instead — timestamp folder, generic photo
   names, blank collectionID. Nothing lost.
5. **Reconciliation** (assign ID → write Excel row → rename/move photos out of
   Staging into CoinPhotos/CoinReceipts → delete staging folder) is one shared
   function — runs instantly on save in the normal case, or later via a "pending
   coin" retry banner on the dashboard, which checks the Staging folder on load.
6. Batch orders / multi-coin receipts are explicitly OUT of scope for the app —
   that stays a Claude-chat + Copilot-paste workflow. The app's only role there is
   the "Batch receipt" capture action below.

### Post-save Albums matching (future requirement, not started — blocked on the write layer like everything else above)
When a coin is saved (via the flow above, not the reverse "tapped an open Album
slot" flow that already exists), the app should check Albums for a matching
open slot — Year + MintMark + Denomination + MajorVariety — and **offer** to
fill it; never auto-fill silently. Three cases:
- **Matching slot is open** → offer to fill it; Ray accepts or declines.
- **Matching slot is already filled by a different coin** → do NOT auto-replace.
  Surface both coins to Ray so he can make a manual "upgrade" decision (e.g. he
  found a nicer example of the same date/mint and wants to swap which coin sits
  in the album, moving the other one out).
- **No matching slot, or Ray doesn't want it in an album at all** (some coins
  are intentionally kept out — e.g. routed to a display Container instead, even
  when a slot exists) — this is a **choice Ray makes at save time**, not an
  assumption the app makes either way. Never assume "yes, fill it" and never
  assume "no, it doesn't go in an album" — always ask when a match exists.

### Direct-write vs. Staging (locked in)
A second Excel tab, **Staging**, mirrors All's exact columns plus one
addition, `StagedDate`. It's a genuinely separate array/tab from All (not a
status flag within All) so normal All/Browse browsing is never cluttered
with in-progress entries — `FAKE_STAGING` in the mockup, kept apart from
`FAKE_COINS` the same way.

**Confidence is driven purely by Variety recognition** (`isConfidentMatch()`
→ `isVarietyRecognized()`, see "Error and Variety" above) — a DB_Coins *miss*
(no catalog row at all for that Year+MintMark+Denom) is a separate,
pre-existing concern (the warning banner + Needs Attention queue above) and
does **not** by itself block a direct save; only a manually-typed Variety
that doesn't match the current filtered dropdown options does. Designation
is never part of the confidence check either (see below) — these three
checks are independent, even though an unrecognized Variety and a DB_Coins
miss often happen to coincide in practice.

**Save options**, presented together in Add Coin:
- **Save to Database** — primary/default, shown only when confident. Assigns
  a CollectionID and writes (in the mockup, pushes) directly into All.
- **Save to Staging** — always available as a manual override even when
  confident (Ray may want a second look before it's final), and the *only*
  option shown when not confident.
- Both destinations reserve a CollectionID at the moment of that save (not
  deferred) via `getNextCollectionId()` — **this scans All and Staging
  together**; there was no "next available CollectionID" logic anywhere in
  the codebase before this, so it's one function checking both arrays from
  the start rather than something that needed updating in several places.

### CollectionID-reservation system — Promotion / Rejection (locked in)
The reservation *engine* (`getNextCollectionId()` scanning `FAKE_COINS` +
`FAKE_STAGING` together, reserve-on-Staging-save, the confidence-driven
Save-to-Database/Save-to-Staging button pair, Variety match/no-match
routing, and the shared ambiguous-Designation "pick one" picker) was already
built in a prior session. This round added the two remaining reservation
rules — **Promotion** and **Rejection** — plus the minimal review surface
that triggers them. Still mockup-only: everything operates on the in-memory
`FAKE_COINS`/`FAKE_STAGING` arrays; **no OneDrive/Graph write calls were
added** (that's still a separate future task).
- **Staging Review** is a new **dashboard-only** destination (same standing
  as Needs Attention — a Dashboard "Go To" tile with a live count badge,
  `#view-staging`, `renderStagingList()`), **not** a persistent nav item. It
  lists each staged row with its already-reserved CollectionID and two
  actions.
- **Promote** (`promoteStagedCoin()`) moves the row Staging → All (`FAKE_COINS`)
  with the reserved **CollectionID carried forward unchanged** — never
  re-reserved or re-validated (it was decided at Staging entry). Staging-only
  fields (`stagedDate`, `remarks`) are stripped so the promoted row matches an
  All-sheet record's shape.
- **Reject** (`rejectStagedCoin()`) deletes the Staging row, freeing its
  CollectionID. **Monotonic `max+1`, permanent gaps allowed (Ray's explicit
  Q2 call):** only the **highest** reserved ID actually becomes reusable when
  rejected (next reservation reuses it); a rejected **mid-sequence** ID stays
  a permanent gap and is deliberately **never** handed back out — reusing a
  gap ID is the exact bug class behind two real prior collisions (2019-W
  Lincoln Cent CoinID, Morgan/Peace mislink), and a mid-range ID may already
  be referenced by a photo/receipt. The reject toast states which case
  happened. This preserves the AY-00470 reservation/release precedent (that
  was a top-most release) without extending it to gap reclamation.
- **Reused vs. newly written**: reused unchanged — `getNextCollectionId()`,
  `isConfidentMatch()`/`isVarietyRecognized()`, `validVarietiesForCurrentCoin()`/
  `refreshVarietyOptions()`, `renderAmbiguousMatchList()`,
  `checkDesignationReresolution()`, `saveAddCoinForm()`, the button pair and
  banners. Newly written — the `#view-staging` markup, `renderStagingList()`,
  `promoteStagedCoin()`, `rejectStagedCoin()`, `updateStagingBadge()`, the
  `collectionIdNumber()`/`highestReservedIdNumber()` helpers, the Staging
  Review dashboard tile + `.staging-*` CSS, and a badge refresh on
  save-to-Staging.
- **Conformance check (all 12 original task rules verified, headless-browser
  driven, 23/23 assertions passing):** format `AY-#####` zero-padded (r1);
  next-ID scans both arrays (r2); reserve at Staging save (r3); promote
  carries ID forward, no re-reserve (r4); reject frees the ID, top-most
  reusable / mid gap permanent (r5); confidence-gated button pair, Staging
  always available (r6); confidence reuses the existing green-checkmark logic
  (r7); unspecified Designation doesn't block a direct write (r8); 2+
  Designation candidates always surface the shared picker, never
  auto-resolve (r9); Variety filtered to Year+MintMark+Denomination (r10);
  unrecognized Variety routes to Staging regardless of typed-vs-clicked (r11);
  Error field never affects eligibility (r12). No deviations found; nothing
  needed re-derivation.
- **Assumptions made**: (a) the reserved CollectionID is treated as the row's
  identity key for both promote (findIndex by `id`) and reject — safe since
  IDs are unique by construction; (b) Staging Review lists newest-first
  (matches the Needs Attention list's ordering); (c) since `FAKE_STAGING`
  starts empty on load, the Staging list/badge are only exercised once a coin
  is actually saved to Staging in-session — no seed staging data was added.

**"Add Set to database" — now BUILT (held on branch `claude/add-set-reservation`,
awaiting Ray's review + explicit go-ahead before merge).** This was previously
filed here as a deliberately-out-of-scope future item; it's now implemented as
the app's first real OneDrive write layer. See the dedicated section
"Add Set + real write layer" below for the full design. Note it is a SEPARATE,
real reservation module from the coin-side in-memory mockup in this section —
the two coexist by design and were NOT unified (Q8): the coin-side mockup here
(monotonic `max+1`, app-driven Promotion/Rejection over `FAKE_*` arrays) is
untouched; the new Set-side module reserves against the LIVE workbook and uses
an external-reconciliation Promoted model.

On Staging rejection, a deleted Staging row's CollectionID becomes available
again for the next `getNextCollectionId()` call only under the monotonic
`max+1` rule above (top-most only), same spirit as the AY-00470
reservation/release precedent from ProjectPlan history.

**Designation handling**: unspecified Designation at entry time does not
block a direct write — it defaults to linking the base/parent (non-designated)
CoinID. A **later edit** that adds/confirms Designation (Browse Edit's
bounded Designation field) re-checks DB_Coins for a Designation-specific row
via `checkDesignationReresolution()`. If 0 or 1 DB_Coins rows share the
coin's base Year+MintMark+Denom+Variety key, there's nothing ambiguous —
resolve straight through. **If 2+ rows share that base key, always surface
the same "pick one" UI used for PCGS label ambiguous matches
(`renderAmbiguousMatchList()`, factored out to be shared by both) — never
auto-resolve silently, even if one candidate's Designation happens to match
exactly.** This is a firm rule, not a preference: several real data bugs in
this project's history trace back to exactly this kind of silent/assumed
resolution (the 2019-W Lincoln Cent CoinID collision, a Morgan/Peace
mislink) — ambiguous matches always need a human's eyes. `FAKE_DB_COINS` now
carries a `designation` field per row, including a deliberate ambiguous pair
(1909-S plain Lincoln Wheat, RD vs. BN) kept as real test data for this
exact scenario rather than collapsed into one row.

### Add Coin write layer — Phase 1 (BUILT and merged to main)
(Corrected 4 Nov 2026 in the (am) slimming: "the gate is `WRITE_TARGET === "copy"`" and the future tense for Phase 2 are stale: every write flag is plain `true` and Phase 2 is built. See "Add Coin Phase 2 + live-device retest batch" below.)*
Add Coin's Save was the last pure placeholder in the app ("Nothing written to
OneDrive yet"), and the actual blocker on logging a new physical coin in-app.
This is **Phase 1 of a deliberately phased build** — architectural/cross-cutting,
so per the merge policy it's held pending Ray's explicit go-ahead, same standing
as Thread A and the original Docket build.

**SUPERSEDED IN PART — Phase 2 IS BUILT.** Everything below still describes
Phase 1 accurately and is worth keeping for its reasoning, but it was written
while Phase 2 was still ahead, and reads throughout in the future tense
("Phase 2 will also need `Finish` added to `ALL_WRITABLE_COLUMNS`" — already
done, along with Category, Error and CACBean). For what actually shipped, see
**"Add Coin Phase 2 + live-device retest batch"** and **"Phase 2 promote:
duplicate-row bug"** below. The predicted Phase 2 design — append a blank row,
then reuse `saveCoinRowToWorkbook()` unchanged — is what was in fact built,
so the reasoning here held up; only the tense is wrong.

**The phasing, and why.** Scoped as three branches rather than one:
- **Phase 1 (this build)** — Staging drafts only. Reservation unified, real
  `coin.json` drafts with photos, real Staging Review, matcher integration.
  Zero new Graph primitives; everything reuses Add Set's proven draft pattern.
- **Phase 2 (since BUILT)** — the real direct-write path into `All`.
- **Phase 3** — nothing further; photo capture already lands in Phase 1.
  (A later, separately-scoped **Phase A** added editing a coin while it sits
  in Staging; its own **Phase B** — add/remove a photo mid-edit — is now
  built, see "Editing a Staging draft: photos, receipt and research note
  (Phase B)". Those letters are a different, later track, not this numbered plan.)

Phase 1 first defers the one genuinely novel capability while delivering
durable value, and matches the project's own risk posture: it has written
Staging JSON safely for months and has **never created a workbook row**.

**The Phase 2 approach is decided, and it is NOT the obvious one.** The
obvious call — `POST /workbook/tables('AllCoins')/rows/add` with a values
array — is wrong here: that array must supply a value for every one of the
49 columns, **including the two live formula columns** (`Total` at U,
`SpotValue` at Z). That's the same "a rectangle write must fill every cell"
hazard `buildRowCellEdits()` exists to prevent, and this workbook has already
lost all 1,084 formula cells once. It would also mean a second write
mechanism able to address never-write columns, breaking the "an unlisted
column has no code path to a PATCH" guarantee.
- **Instead: append a BLANK row, then reuse `saveCoinRowToWorkbook()`
  unchanged.** Reading it closely, it already handles creation correctly with
  no modification — `detectRowConflicts()` opens with `if (!snapshot) return []`,
  so a `null` snapshot against a fresh blank row skips the conflict check,
  counts every populated field as changed, and stamps `Reviewed`/`LastModified`
  (both correct for an app-created row). Formula columns are untouched because
  they aren't on the allow-list. **The only genuinely new primitive Phase 2
  needs is "append a blank row and tell me its row number."**
- **Accepted tradeoff: it is not atomic.** A blank add that lands followed by
  a failed PATCH leaves an orphan row. Deliberate: an orphan row carrying a
  CollectionID and a blank `Reviewed` is visible and recoverable, whereas a
  clobbered formula is silent and catastrophic.
- **Phase 2 will also need `Finish` added to `ALL_WRITABLE_COLUMNS`** — it's
  captured now (below) but is currently read-only context
  (`ALL_CONTEXT_COLUMNS`), so a new row can't yet carry it. Deliberately NOT
  added in Phase 1, since that would make it editable in Browse Edit too — a
  scope change nobody asked for.

**Gate: `ENABLE_ADDCOIN_WRITE`**, its own flag for the same reason
every other one is (it writes a different thing again), folded into
`WRITE_LAYER_ENABLED`. **Superseded:** now `(WRITE_TARGET === "copy")`
rather than a bare `false` — true in the shipped default, since
`WRITE_TARGET` itself is the real safety boundary now (see "Real-Graph
flags always on..." below). With the flag off (`WRITE_TARGET` at `"live"`
and this one not yet re-enabled) the build behaves **exactly** as it used
to with the flag hardcoded false — asserted, not assumed: a save makes
zero Graph calls, still pushes to `FAKE_STAGING`, and both interim
notices stay hidden.

**Reservation unified — the mock authority is retired.** `readMaxReservedIdFromStaging()`
used to call `listSetDrafts()`, which drops anything without `type === "set"`.
Once Add Coin writes `coin.json` drafts, **every coin reservation would have
been invisible to it and the two features would have collided in the same
`AY-#####` namespace.** It now reads the Staging **folder names** instead:
- One authority across every draft kind — the folder name is the CollectionID
  by construction for both `setDraftFolder()` and `coinDraftFolder()`, so
  this covers set drafts, coin drafts, and any future kind with no per-kind
  maintenance.
- One Graph call instead of one per draft.
- **Fails in the safe direction**: a folder whose JSON was deleted or is
  unreadable still counts as reserved, so a part-cleaned-up folder can never
  hand its id to a different coin. Non-draft folders (`_Docket`) parse to NaN
  and are skipped.
- `getNextCollectionId()` is renamed `getNextCollectionIdInMemory()` and is
  now **the flag-off fallback only**, reached solely through
  `reserveCoinCollectionId()`. The two never run in the same session — the
  flag picks one — so there is no window in which two authorities coexist.
  This resolves the Add Set write layer's own deferred Q11 ("Add Coin
  migrates to it LATER").

**Coin drafts: `{stagingBase}/{CollectionID}/coin.json` + that coin's photos
as siblings.** Per-coin FOLDER rather than the Docket's one-document shape,
because of photos: the Docket queue is pure metadata, a coin draft carries
real image bytes, and a folder named for the CollectionID is exactly where
Add Set already puts a Set's photos. Safe alongside set drafts structurally —
each lister drops anything without its own `type` marker, so neither can ever
see the other's drafts.

**Photos are captured for real, and the temp-id problem is fixed.** Add Coin's
gallery is keyed by `ADDCOIN_GALLERY_ID` (`"__addcoin_draft__"`) because no
CollectionID exists until save, so every filename in it is built against that
temp id. `uploadCoinDraftPhotos()` re-derives each filename against the real
reserved id before uploading — the reconciliation the gallery module's own
comment always said a real write layer would need. Uploads the cropped image
plus, for flip sources, the untouched `_original` (per the crop-commit
convention); raw bytes come back via `fetch(rawUrl)`, the same trick the
Adjust button uses. Receipts upload as `{CollectionID}_receipt.pdf` from the
existing `receiptFiles` registry — the "ready-but-unconsumed" registry finally
has a consumer. **A single file failing never loses the capture**: each upload
is caught individually, the draft still lands, and its research note says what
didn't upload. The in-progress gallery is cleared after a real save, or the
next coin would re-upload the previous coin's photos under its own id.

**The silent first-candidate bug — the most important fix here.**
`findDbCoinsMatch()` returns `dbCoinsCandidatesFor(record)[0]`, and Add Coin's
banner and save both ran off it. On the real ~3,753-row catalog a base key
routinely has several rows (227 ambiguous groups even after the Finish tier),
so this silently picked one. Harmless while the save was a mockup that wrote
no CoinID anywhere; **the moment a save records a CoinID it becomes a silent
wrong-link — exactly the failure behind this project's two historical mislink
incidents.**
- `findDbCoinsMatch()` is now documented as answering "is there a match at
  all", never "which row is it", and is left returning `[0]` for that
  boolean-ish use.
- New `resolveAddCoinCatalogMatch()` resolves at save time: 0 → CoinID pending
  + Docket entry; 1 → linked; **2+ → the shared ambiguous picker, always, per
  the firm rule.** Nothing is reserved or written until the user picks;
  cancelling writes nothing and keeps everything typed.
- New `addCoinIdentityShape()` is the Add Coin counterpart of Browse Edit's
  `identityShape`, so the live banner and the save-time resolution can never
  match on different keys. It carries `gradeSource`, which **engages Thread
  A's cert-protection guard on Add Coin too**.
- The banner is now honest about multiplicity ("2 catalog entries match this
  coin — you'll be asked to pick when you save") instead of claiming a match.
- `matchedHow` (`single`/`picked`/`none`) is recorded on the draft, because
  reconciliation needs to know whether a link was a human judgement or an
  unambiguous catalog hit.

**Finish input added to Add Coin** (Business Strike / Proof / Reverse Proof /
SMS / Specimen / Circulated). Add Coin had none, so `shape.finish` was always
blank and **the Finish tier never ran at all** — new entries resolved on a
strictly weaker key than edited ones, and a Proof vs. a Business Strike of the
same date were indistinguishable. Verified: the pair goes 2 candidates → 1
with Finish set, and an All-only value (`Circulated`, absent from DB_Coins)
still falls back softly rather than to zero. A matched catalog row also
carries its Finish onto the form. Optional — blank never blocks a save.

**Staging Review is real, and labelled as interim.** Reads durable drafts when
the flag is on; the action is labelled **"Mark ready"**, not "Promote", and an
interim banner states plainly that the app does not write the workbook yet and
Copilot moves the row across. Reject deletes the whole draft folder (JSON +
photos). The monotonic max+1 gap rule needs no separate bookkeeping on the real
path: the reservation scan reads folder names, so a deleted folder simply stops
being counted and a mid-sequence rejection leaves the max untouched. **Add
Coin carries the same interim notice**, because in Phase 1 "Save to Database"
writes a draft like the other option — `savedVia` records which was chosen.
- **`#stagingBadge` no longer exists** (retired when the Needs Attention hub
  absorbed Staging Review's dashboard tile); `updateStagingBadge()` is
  vestigial but harmless and was left wired.

**Two real integration gaps found while testing, both fixed:**
- **The Docket couldn't see real drafts.** `renderNeedsAttentionHub()` read
  only `FAKE_STAGING`, so once staged coins became durable drafts every one of
  them would have been **invisible in the Docket** — the same class of gap as
  the reservation one. It now reads coin drafts when the flag is on; a draft's
  own field names are already the shape `findDbCoinsMatch()` wants. A draft
  marked ready is no longer Ray's to decide on, so it renders in the research
  section as "waiting on the All-sheet row". A second bug fell out of this: the
  research-row label read `c.name`, which exists on a `FAKE_STAGING` row but
  **not** on a draft (it has `description`) — so real drafts rendered with no
  name at all.
- **The mock Graph client's `deleteItem()` wasn't faithful.** It deleted only
  the exact key, while Graph's DELETE on a folder is recursive — so a test
  could not see that rejecting a draft also removes its photos. Fixed to sweep
  descendants; a file path has none, so it's a no-op there.

**Commemorative / `Description` blind spot — assessed, and deliberately NOT
folded into the matcher.** Four owned coins are mis-linked because their
correct and incorrect candidate rows differ only in `Description`. The
recommendation went the opposite way from where it started, on evidence:
- **The picker already renders `row.description`**, so those candidates are
  already distinguishable to a human. The commemorative exposure was never
  that the matcher can't narrow — it was that `findDbCoinsMatch()` never
  reached the picker. **Fixing that (above) closes the hole for new coins**;
  a Description tier would only *suppress* the prompt.
- Suppressing it would contradict the project's own firm rule ("2+ always
  reach a human"), whose sole exception (the Designation tier) had a crisp
  verified semantic and *still* needed the cert-protection guard bolted on
  after live testing. `Description` has no such semantic: free text,
  user-editable on the `All` side, auto-filled from Ref_Denominations — a
  *different source* than `DB_Coins.Description`.
- The four existing mis-links are themselves evidence that Description-based
  identity for commemoratives is fragile.
- Cost of not narrowing: one picker prompt on a rare event (~22 individual
  commemorative rows of 542).
- Benefit: **zero change to `dbCoinsCandidatesFor()`'s tier logic**, so Thread
  A's live-tested behaviour for Browse Edit and Docket isn't re-opened.
- Browse Edit was already safe here — its `checkDesignationReresolution()`
  path already sends 2+ to the picker.
- **If picker frequency ever becomes annoying, the follow-on is to surface
  Description more prominently, not to auto-resolve on it.**

**A real defect in that reasoning, caught by screenshot and fixed.** The
premise above only holds if the Description is actually *readable*, and
`.form-row .fr-summary` carried `white-space: nowrap` + `text-overflow:
ellipsis` — so a differentiator late in the string would be truncated away,
recreating the Part-F "both options look identical" bug by another route.
`renderAmbiguousMatchList()` now tags its rows `.ambiguous-match`, which opts
them out of the one-line ellipsis. Fixed at the shared renderer, so Browse
Edit and the Docket get it too. Presentation only — no matching logic changed.

### Add Coin Phase 2 + live-device retest batch (BUILT and merged to main)
The first real-device pass this branch has had. CAC Bean, Mint Mark "None
(Other)" and the reverse-face flip content all came back clean. Seven items
came out of it; all seven are built here.

**1. THE CRITICAL ONE — Add Coin's write path dead-ended after hand-off.**
Ray built a coin, saved to Staging, marked it Ready, and found nothing
further to do — the coin sat in "Awaiting Copilot Research" even though its
CoinID had resolved cleanly. Confirmed by reading the code rather than
guessing: `markCoinDraftReady()` set a status and rewrote the draft JSON,
full stop. Its own comment said so outright ("PHASE 1 INTERIM — deliberately
does NOT touch the All sheet"). **No coin, matched or not, had any path into
All**, and match status had never been consulted at that point. The Graph
client had no append-row primitive at all.

- **`addTableRow()` — the one genuinely new primitive.** Appends a
  GENUINELY BLANK row. Graph's `rows/add` does accept a values array and
  using it is the obvious-looking approach; it is also wrong here, because
  that array must supply a value for every column **including the two live
  formula columns** (Total at U, SpotValue at Z) — the exact
  fill-every-cell hazard that cost this workbook all 1,084 of its formula
  cells once. Appending blank lets Excel fill calculated columns from the
  table's own `calculatedColumnFormula`, and every real value then lands
  through the existing allow-list-filtered `saveCoinRowToWorkbook()` with
  no new write surface. **Accepted, deliberate tradeoff: not atomic.** A
  blank add followed by a failed PATCH leaves an orphan row — visible,
  recoverable, and carrying a blank `Reviewed`; a clobbered formula would
  be silent and catastrophic.
- **`writeNewRowKeyCells()` (Q1, confirmed as the permanent mechanism).**
  CollectionID and CoinID are on `ALL_NEVER_WRITE_COLUMNS`, correctly, for
  EDITING. A newly CREATED row is the one genuine exception. Rather than
  loosen the allow-list — which would weaken the "an unlisted column has no
  code path to a general PATCH" guarantee every other write rests on — this
  follows `writeCoinIdCell()`'s precedent: a separate, narrow,
  explicitly-audited path that can write nothing but those two columns.
  **`ALL_NEVER_WRITE_COLUMNS` is untouched.**
- **`createAllSheetRow()` re-resolves by CollectionID** before a single
  data value is written, rather than trusting arithmetic on Graph's
  data-body index — rule 1 of this layer is "a row is located by
  CollectionID at write time, never by a remembered or derived position",
  and this honours it at creation too.
- **`saveCoinRowToWorkbook()` gained `opts.gate`** so Add Coin's own flag
  authorizes its write. Hard-wiring it to `browseEditWriteEnabled()` would
  have meant Add Coin's promote silently requiring Browse Edit's flag —
  exactly the coupling this file's standing rule forbids.
- **Category, Finish and CACBean added to `ALL_WRITABLE_COLUMNS` (Q2,
  confirmed).** All three were captured on the draft carrying a standing
  "needs an allow-list entry before Phase 2" note; without them promotion
  would silently drop three real captured values. Finish also moved OUT of
  `ALL_CONTEXT_COLUMNS`, since listing it in both would read the same column
  twice. **Correction to this section's original claim: being on the
  allow-list does NOT by itself make a field editable in Browse Edit.**
  CACBean genuinely is — it has real dual-checkbox wiring in
  `readBrowseEditForm()`. Category and Finish are NOT — `readBrowseEditForm()`
  never collects either from any form input, so the allow-list entry only
  means the general PATCH machinery could write them if a value arrived some
  other way (which it now does, via Add Coin's own promotion write); no
  Browse Edit UI exists to set either one. Found while adding Error, below,
  and worth knowing before assuming any of the three is user-editable there.
- **`Error` added to `ALL_WRITABLE_COLUMNS` too (2026-08-30 follow-up,
  Ray's explicit authorization) — the KNOWN GAP this section originally
  flagged is now closed.** Same treatment as Category/Finish/CACBean:
  `coinDraftToAllValues()` now maps `draft.errorDesc` onto `Error`, so a
  captured Error description survives promotion instead of being silently
  dropped. Same caveat as Category/Finish immediately above — no Browse Edit
  UI input exists for Error either, so it isn't independently editable
  there; the allow-list entry only means the general PATCH machinery can
  carry it through when a value arrives via Add Coin's own write. Verified
  headless (`tests/verify_phase2_and_retest_batch.js`, B2b/C4b): the
  allow-list membership and a full promotion end-to-end with a real
  `errorDesc` landing correctly in the Error column, both with a verified
  negative control. All 635 assertions across 16 suites re-run clean.

**Q4's model, implemented as Ray specified** (his correction to my proposed
"clean match skips Staging" boundary): Staging is a genuine working area for
EVERY coin regardless of match status.
- **No new status enum and no migration** — where a READY draft is listed
  derives from whether it has a CoinID. READY + CoinID stays in **Staging**
  with **Promote** offered right there (and in Staging Review, where Mark
  ready was pressed). READY without one moves to **Research** with
  **Re-check / Force Add / Dismiss**.
- **Force Add** writes the coin with CoinID and SetID genuinely blank, sets
  `forceAdded`, and **deliberately keeps the card** in Research as "written
  to the All sheet with no CoinID" until Re-check resolves it or the user
  Dismisses.
- **Dismiss requires a reason**, on the same reasoning `promptDocketDismiss()`
  already enforces, and sets status PROMOTED (the row genuinely IS on the
  sheet) with the reason kept on the draft as the audit trail.
- **Two deliberate divergences, confirmed with Ray, recorded so neither
  looks like an oversight later**: the app now sets `PROMOTED` ITSELF for
  coins (the Set-side rule that only external reconciliation may set it
  exists because the app never wrote a Set's row — here the app IS what
  wrote it), and **a force-added row is a real, unlinked All row** —
  visible in Catalog, counted in Ledger — until Re-check closes the gap.

**Q4.1 — attaching a CoinID to an already-written row: the mechanism
already existed.** `applyDocketResolution()` has done exactly this since the
Docket work: `findAllSheetRowNumber()` then `writeCoinIdCell()`. The gap was
reach, not capability — it was wired only to Docket **queue entries**, while
the coin-draft Re-check path wrote the draft JSON alone (correct, until Force
Add made a row exist). `applyCoinDraftMatch()` now also writes the cell when
`allRowWritten` is set, reusing that same audited path — no new write
surface, and no re-entry of the coin's data.

**Q4.2 — two data models, one already-shared renderer.** Worth knowing
before touching this area again: the Research section is fed by three
independent sources. A "no DB_Coins match" card like "1943-S Lincoln Wheat
Steel" is a **Docket queue entry** (`_Docket/docket.json`, keyed `entryId`,
identity fields only, can originate from Browse Edit's re-link as well as
Add Coin). A per-coin "Handed Off" card is a **coin draft**
(`Staging/{ID}/coin.json`, keyed `collectionID`, carrying the whole capture
— photos, cost, grade, cert). Different files, different keys, different
lifecycles. **`appendDocketRows()` is already generic though**, taking
per-row callbacks, so Promote/Force Add were two more optional callbacks
plus two buttons — the records need reconciling, the card rendering does
not. Note also that the per-coin Handed Off card previously had **neither**
Re-check nor Dismiss (Re-check lived on the per-coin *Draft* row and on the
Docket-entry card; Dismiss only on the latter), so this added four actions
to it, not two.

**Q3 — photo relocation is fully app-driven**, confirmed by reading
`movePromotedSetFiles()`: `getItemMeta` → `getFileBytes` → `uploadBytes` →
`getItemMeta` (verify) → `deleteItem`, all the app's own Graph calls, with a
failed or unverifiable copy always leaving the source intact.
`plannedCoinPromotionMoves()`/`movePromotedCoinFiles()` mirror it exactly.
One refinement over the Set path: because the app itself promotes a coin, the
move runs **immediately after the write** rather than only at launch;
`processPromotedCoinDrafts()` still runs at launch to resume anything that
failed or was interrupted.

**2. Sets: the flip-card removal was genuinely incomplete.** The prior pass
cleared the corner TEXT and neutered the flip gesture but left
`#browseDetailFlipFrame` and its interactive `.coin-disc` rendering — Ray was
right that this wasn't the removal that was asked for. The frame is now
hidden outright and a genuinely separate `#browseDetailSetPhoto` element
takes its place: square, static, no interaction, no corner labels, showing
the real whole-set/OGP photo via `setFlipPhotoUrl()`'s existing priority or a
plain 📦 placeholder. Individual coins — including a Set's own children
reached through "Coins in this Set" — are untouched.
- **Year now rides in the page title** (`detailTitleText()`): "1957 United
  States Proof Set", per Ray's Q5 correction. Skipped when the name already
  starts with the year, and for a Roll's literal `"Various"`.
- **Edit Set gained a "Link a coin to this Set" accordion** (Q6:
  session-only). Candidates are owned coins that are neither Sets nor
  already claimed by one; linking mutates the same in-memory
  `FAKE_SET_CHILDREN` model the read side uses, so it round-trips visibly
  everywhere. **Deliberately not persisted**: real linkage is
  `All.OriginSetID` on the CHILD's row, and OriginSetID is on
  `ALL_NEVER_WRITE_COLUMNS` — a second never-write exception on a different
  row than the one being edited, held for its own later pass. "Back"
  collapses the control and returns to the plain list.

**3. Long-name corner text overlapping the coin — root cause was that
nothing ever checked.** Reproduced against the reported AY-00463-B and it
was worse than reported: BOTH the wrapped second line and the third line
intersected the disc (91px and 72px from its centre against a 105px radius).
The fit test only ever asked "does the text fit its own box"; the box is
anchored 10px from the frame corner and grows DOWNWARD as lines are added,
straight into the disc's band, and no amount of box-fitting can see that. So
this was a **predicate** fix, not the tolerance/spacing nudge it looked
like:
- **`cornerClearsDisc()`** measures each rendered line against the disc's
  actual circle (nearest-point-to-centre against the radius — a bounding-box
  test would report the corners as hits exactly where corner labels live),
  and `cornerFits()` now requires both.
- **`.corner-line` boxes hug their own text** (`width: fit-content`) so the
  measurement is honest — a short line stacked under a long one used to
  inherit the long one's width and report reaching much further across the
  card than its ink did. **`max-width: 100%` is not optional there**: these
  lines are `nowrap`, which makes min-content equal max-content, so
  `fit-content` resolves to max-content and overflows the parent instead of
  being clamped — without the cap the overflow test that drives wrapping
  silently never fired.
- **The two-line wrap is now balanced, not greedy.** Greedy turned the First
  Spouse name into "Martha" / "Washington First Spouse Gold $10", whose
  second line was nearly as wide as the unwrapped original, so wrapping
  bought almost nothing. Choosing the split that minimises the WIDER line is
  what actually earns font size back.
- **Shrink prefers a comfortable floor before wrapping** (`CORNER_COMFORTABLE_FRACTION`
  = 0.82), then re-shrinks the wrapped layout from natural size, then falls
  back to the full range on a single line for a one-word value that has
  nothing to wrap. Two extra shrink steps were added (0.56, 0.48) because
  with clearance enforced a three-line corner genuinely needs them.
- Measured outcomes: "Morgan" untouched at 27px; "Lincoln Memorial" still
  resolves by shrink ALONE at 22.14px without gaining a third line (last
  round's regression guard still holds); the ATB quarter wraps at 15.12px;
  First Spouse wraps at 12.96px — all four now clearing the coin.
- **A real side effect worth knowing**: the BR composition corner now
  shrinks for "99.95% Platinum", because measurement showed its first line
  sat 94.1px from the disc centre against a 105px radius at full size — it
  was genuinely overlapping and nothing could see it. A prior assertion that
  claimed "no shrink applied" was asserting that bug.

**4. Dimes + Silver hiding a real silver dime — NOT a stale cache.** The
filter and the flip card read two DIFFERENT joins: `metalCategory` comes
from a four-hop chain (`All.CoinID → DB_Coins.CoinID → MetalContentType →
Lookup_MetalContent.CoinType → MetalCategory`), `composition` from a two-hop
one (`All.CoinID → DB_Coins.Composition`). The reported coin had Composition
populated and MetalContentType blank, so the filter saw a blank category
(bucketed "Other") while the card saw real silver. The workbook-side fix is
to populate MetalContentType; the app should not silently disagree with
itself meanwhile, so **`metalCategoryFor()` now derives from the composition
string** via `metalCategoryFromComposition()` when the primary join yields
nothing. Compound terms are tested first so "Copper-Nickel Clad" lands on
Clad, not Copper; Bronze/Brass bucket under Copper exactly as
Lookup_MetalContent does. **Also fixed the genuine staleness half**:
`refreshLiveCoinsAfterWrite()` clears the once-per-session memo so a
just-promoted coin is immediately browsable and filterable without a reload.

**5-7. The three smaller items.**
- **Error on the Overview** — a plain fact row, coin-only, omitted when
  blank. It was previously reachable ONLY by flipping the card, so invisible
  to anyone who never did.
- **Purchase Details finally populates for real coins.** The Seller and
  Purchase Date rows already existed — they read `FAKE_COIN_DETAILS`, which
  is empty for every live coin, because `mapWorkbookRowToCoin()` never read
  `Seller_Link`, `Shipping` or `PurchaseDate` back even though Browse Edit
  has been able to WRITE all three since the write layer landed. The rows
  existed; the data never reached them. Now mapped (dates converted from
  Excel serials to ISO), with the coin's own values winning over the demo
  lookup.
- **Prev/next stepping at the detail level.** The list is captured at
  grid-render time (`browseStepIds`), so it is exactly what the user is
  looking at — same filters, same sort, same order — rather than re-derived
  later from filter state that an external Browse entry may since have
  reset. Stored by id, not object reference, since a live refresh rebuilds
  `LIVE_COINS` wholesale. A coin reached outside any list (a "Belongs to"
  chip) falls back to CollectionID order; a **Set child gets no arrows at
  all**, since it lives in its own nested lookup and stepping into an
  unrelated top-level coin would be a jump, not a step. Arrows hide at each
  end rather than wrapping.

**Verified headless — new committed suite
`tests/verify_phase2_and_retest_batch.js` (70 assertions); 633 across all 16
suites, zero failures.** Covers: the blank-row primitive and the untouched
formula cells through a full create-and-populate cycle; the allow-list/
never-write invariants; a clean-match promotion end to end with Add Coin's
own flag authorizing it while Browse Edit's is OFF; Promote refusing an
unmatched draft while writing nothing, and Force Add writing the same coin
with a genuinely blank CoinID; **Q4.1 end to end** — a force-added row
getting its CoinID from a later Re-check with nothing else disturbed;
Dismiss refusing a blank reason and keeping a real one; the photo move's
copy-verify-delete and its completion flag; total inertness with the flag
off; the Docket's Staging-vs-Research split by CoinID with the right actions
on each; both Set shapes losing the frame AND the disc while an ordinary
coin keeps both; the title's year rules; the session-only linking round trip
including its no-double-claim and no-Sets-as-children rules; all four
measured corner cases clearing the disc; the balanced wrap; the
composition-derived metal categories and the reported filter bug; the Error
row; the three newly-mapped purchase columns and the Total they produce; and
stepping through a filtered list, an unfiltered fallback, and a child's
correct absence of arrows.
**Verified negative control**: disc clearance removed from the fit
predicate, the composition-derived category removed, the Set frame restored,
and Promote's no-match guard disabled — 7 assertions failed with exactly the
reported symptoms (`clears: false` on both long-name cases, the metal filter
blind again, the Set frame back), then all four were restored and every
assertion re-confirmed.
- **`WRITE_TARGET` stays `"copy"` throughout — untouched.**
- **Superseded: the Phase 2 write HAS since had a real `_Testing` run, and
  it found a duplicate-row bug.** See the section immediately below.

## Finish / Category gate and idempotent Promote (BUILT on `claude/addcoin-finish-required-and-draft-cleanup`, 5 Nov 2026; held for Ray's TEST, NOT merged)

Why: AY-00760 (2026 Lincoln Shield Cent) reached the All sheet with Finish and Category blank although its one catalog row says Business Strike. A single matching row made the form "confident" while Finish was blank (`dbCoinsCandidatesFor()` skips the Finish tier for a blank Finish), and a live match fills only Description. DB_Coins has no Category column, so nothing could fill it.

**The gate (G1-G4).**
- G1 `isConfidentMatch()` = `addCoinMatchResolved()` (the old catalog test, unchanged) AND a Finish AND a Category (`addCoinDirectSaveGaps()`). Save to Staging never needs either. The not-confident banner names what is missing and the catalog's own Finish (`addCoinGateMessage()`, e.g. "Pick a Finish and a Category to save straight to the database — the catalog entry says Business Strike. Save to Staging stays available.").
- G2 Two explicit one-tap buttons, never a silent fill: "Use <Finish> (from the catalog)" (`#addCoinUseCatalogFinishBtn`; offered only while the catalog resolved, Finish is blank and the catalog Finish is a Finish dropdown option; `addCoinCatalogFinish()`), and a "Coin" button beside the Category dropdown (`#addCoinCategoryCoinBtn`). Both are recorded as user edits (`markAddCoinUserEdit`) so a Staging edit's Save and the leave guard see them.
- G3 `completeAddCoinSave()`: promotes only when the form being saved has Finish AND Category (`wantsDirect`, `gateBlocked`); otherwise the draft is written as `savedVia: "staging"` and the toast says "It was NOT written to the All sheet: Finish and Category are needed first".
- G4 `promoteCoinDraftToAllSheetUnlocked()` refuses a non-force Promote when the draft lacks either (`coinDraftPromoteGaps()`, reason `needs-finish-category`). **Force Add is the exception** (`force: true` skips the check; blank Finish / Category still writes). Staging Review and the Docket show "Needs Finish and Category — Edit" in place of Promote (Edit and Revert stay); no one-tap fill on the list rows.

**Category control.** `#addCoinCategory` (dropdown) + `#addCoinCategoryCoinBtn`, next to Finish; `refreshAddCoinCategoryUI()` draws it. State: `addCoinPlainCategory`; `addCoinCategoryValue()` = bullion Category, else the plain one. `readAddCoinFormForDraft()` carries it. The plain Category is NEVER passed to the matcher (`addCoinIdentityShape()` reads the bullion Category only), so choosing one cannot change which catalog row matches. A bullion pick and a dropdown Category can never both be set: bullion clears the plain one and locks the dropdown ("Set by the Bullion pick above"). `applyCoinDraftToForm()` restores a stored Category as bullion only when a `BULLION_TIER_OPTIONS` entry matches denom AND category; "Coin" or any dropdown value restores as plain.
- **Lookup_Categories (read only, new read).** Column A, header excluded (`buildLookupCategoryList()`: trimmed, deduped, blanks and ═ dividers dropped); an optional sheet beside Lookup_Errors (`LIVE_NAV_OPTIONAL_SHEETS`, `LIVE_LOOKUP_CATEGORIES`, `activeLookupCategories()`). The app never writes it and never adds a value to it. If nothing in the list fits, the coin goes to Staging until the value is added to the sheet.
- **If the sheet cannot be read** (live session): the dropdown holds only "— not recorded —", a note says "Category list unavailable right now — the Coin button still works", and the Coin button works (the value shows in the dropdown even though the list lacks it). If the list loaded but has no "Coin", the button is off with a note. Nothing else breaks.
- `COIN_DEFAULT_CATEGORY = "Coin"` is the one place the literal lives. `ALL_WRITABLE_COLUMNS` already had Category and Finish: no allow-list change, no new All writer.

**Idempotent Promote (S4).** `promoteCoinDraftToAllSheetUnlocked()`: if the first `findAllSheetRowNumber` finds nothing, it waits `PROMOTE_RELOOK_MS` (1500 ms; test seam `__setPromoteRelookMsForTest`, which `tests/harness.js openApp` sets to 0 unless `realPromoteRelook`) and looks again before creating. A row found on the second look, or the lone row named by `createAllSheetRow`'s tripwire (the error now carries `code: "ALL_ROW_EXISTS"` and `rows`; its message and throw are unchanged), is adopted. **Adoption never overwrites (Ray, 5 Nov 2026).** `allRowHoldsCoinDraft()` compares the adopted row to the draft with the conflict check's own comparison. Identical: nothing is written and the result is `{ ok, adopted: true, written: [] }` (the caller marks the draft Promoted and moves files by the usual rules). ANY difference (including a blank CoinID on the sheet against the draft's): nothing is written to All, the draft is left unchanged (not Promoted, files not moved), the result is `{ ok: false, reason: "row-differs", differs }`, and the toast lists each field as "Column: on the sheet <value>, in the draft <value>" followed by "Fix the row or the draft, or use Mark as promoted." (date columns shown as dates, blanks as "(blank)"; Force Add skips the CoinID comparison because it writes CoinID blank). A different non-blank CoinID is refused outright, and two rows with the id remain a hard error. **Adoption only:** a row Promote finds on its FIRST look still goes through the older "row already exists" path, which writes the draft's populated fields over the row with no conflict check (see the next paragraph).

**Known, deliberately not changed (reported to Ray 5 Nov 2026): the first-look "row already exists" path can overwrite hand edits.** `promoteCoinDraftToAllSheetUnlocked()` writes the CoinID cell and then `saveCoinRowToWorkbook(id, values, null)` (snapshot null: every populated draft field counts as changed, no conflict check). Callers: `promoteCoinDraftToAllSheet` is called by `promoteCoinDraft` (Staging Review's Promote, the Docket Staging section's Promote, and `completeAddCoinSave`'s direct save, where the id is freshly reserved so no row exists yet) and by `forceAddCoinDraft` (`force: true`). The reachable case is a Force Added coin (row on All, CoinID blank) that Re-check later links: the Docket's Staging section then offers Promote, which writes the draft's values over the row, so a populated field edited in Excel in between (a scratch run: Cost 99 edited, draft 3, result 3) is replaced; fields the draft leaves blank are never touched. A retry after a failed bookkeeping step also rewrites the same values and stamps LastModified. This costs every Promote of a NEW coin about 1.5 s.

**Bookkeeping (S1).** `finishCoinDraftWrite()`: a failed coin.json re-read falls back to the in-memory draft; the Promoted + allRowWritten write comes first and is retried once (`__setFinishWriteRetryMsForTest`); a second failure is reported ("is on the All sheet, but tidying up afterwards failed"); the live-coins refresh and redraws are best-effort. Draft-side parts (S2, S3): see DOCKET_STAGING.md.

**Tests.** `tests/verify_addcoin_finish_category_gate.js` (44 incl. self-check: form gate A, save-time belt B, Promote gate and Force Add exception C, Category control / Lookup_Categories / bullion exclusion D, Staging-edit restore and save E) and `tests/verify_draft_cleanup.js` (26). Negative controls, each FAILS on main: A1 (one catalog row + blank Finish is not confident), C1 (a blank Finish / Category draft is refused), S-a (re-read throws, the draft still ends Promoted), S-d1 (a column read that lags once no longer ends in "already appears on the All sheet", Ray's exact error). Existing suites changed to follow the design (set a Finish / Category, never weakened): see HISTORY.md.

**Not verified:** a real device; the real Lookup_Categories sheet (the mock list only); the 1.5 s wait on a real workbook; Mark as promoted on a real leftover draft (AY-00760's on _Testing is the natural check); `PROMOTE_RELOOK_MS` against a real lag.

