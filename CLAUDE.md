# Salty's Cabinet — coin collection app

Personal coin collection app for Ray Ayres ("Salty"). Static site on GitHub Pages,
no backend server. Talks directly to OneDrive (Ray's personal Microsoft account) via
Microsoft Graph API, and the Excel workbook there is the authoritative data store.

## Current state (rewritten at the end of every task; read this first)
- main: last code commit `960634d` (Staging photo replace keeps the old file `7b56955`, ✕ on a Replace pick is an undo `4589b46`, failed-save cleanup `960634d`; merged 30 Oct 2026 by fast-forward of `ccr-06105bea-fexby9`, with docs-only commits after it). Main's head is the docs commit that last rewrote this block (`git log -1`). LIVE still runs `928d7a9`'s code (deployed by Ray 27 Oct 2026, splash `d08c82e`): NOT deployed by any merge since, including this one. Ray runs the deploy workflow for `main`.
- Open branch: `claude/value-fallback-melt-label` (task (g), built 30 Oct 2026 from main `0bc280a`; code commit `f0c9a7b`, docs commit after it; pushed to origin; HELD for Ray's merge go-ahead, NOT merged, NOT deployed). Display only. Targeted suites pass (new `verify_value_fallback_melt` 70; `verify_ledger_value_by_metal` 29 and `verify_album_best_of` 55 updated on purpose). Full run: 4195 / 0 / 0 / 80. Older branches still on origin for Ray to delete: `ccr-06105bea-fexby9` (deleting it failed 30 Oct, git proxy), `claude/slim-claude-md`, `claude/receipts-never-overwrite`, `claude/photos-wait-for-save`.
- Layout of this file since the slimming: standing rules, current state, backlog, architecture and write-layer design stay here; build history of merged work is in `docs/HISTORY.md`; area detail is in `docs/ref/*.md` (see "Where to look" below); `docs/INDEX.md` maps every moved heading to its new file and its old line range (CLAUDE.md at `21bcd95`).
- Baseline: main is 4125 passed, 0 failed, 0 page errors, 79 suites (30 Oct 2026, on `960634d`). On the (g) branch (code `4c9aa10`, full `npm test` 30 Oct 2026): 4195 passed, 0 failed, 0 page errors, 80 suites.
- Next task, in Ray's order: merge decision on (g); then (r) Edit Set saving, then split out child coins, then partial sales; (e) C4 Add Set / Wishlist onto the shared chooser; (p) retire the All-sheet fallback, then (q) the old OGP mapping. Backlog from 30 Oct: (z) Save changes only when something changed; (aa) Keep or Delete prompt on every Replace ((s) folded in). Older: (x) Edit Coin receipts like Add Coin; (y) Staging edit receipt slot on the shared chooser. (u) is a data fix outside the app; (v) is a note only.
- Waiting on Ray: deploy of `main` to LIVE (his call; the Staging-edit changes above are TEST-only until he runs the workflow); he checks LIVE's Photos tab for duplicate PhotoIDs (u) before any Replace on LIVE; he may delete the leftover `cropped_04` file on AY-00756 by hand.
- Stale text, left unedited on purpose: the "Current status (Oct 2026)" section says `claude/in-app-pdf-viewer-options` is NOT an ancestor of `main`. `git branch -a` on 28 Oct 2026 shows no such branch (only `main` and `claude/modest-johnson-ywojkx` locally and on origin), and `loadPdfjs()` is in `app.html`. Treat the pdf.js work as landed. Also: pointers in kept text that name a section now in `docs/` (about 40, listed in the slimming report) were not edited; use `docs/INDEX.md`.
- Not verified on a real device: Samsung Internet in a browser tab; Graph's `@microsoft.graph.conflictBehavior=fail` (409) on a real upload (the AY-00756 retest hit one on the tablet, so it is now seen in real use, but not yet re-tested after the cleanup fix); the Staging folder link is verified on PC and tablet (29 Oct).

## Where to look (read the file BEFORE working in that area)
This file keeps what every session needs: standing rules, current state, backlog, and the architecture and write-layer design. Everything else is in `docs/`, linked by plain path (not @-imports), so nothing loads unless you read it. Line numbers in `docs/INDEX.md` and in the "Source:" pointers below refer to this file as it was at commit `21bcd95`.
- When touching photos, crop, receipts, the image chooser, Manage Photos, photo labels, Replace, Save-wait behaviour, or reference images: read [docs/ref/PHOTOS.md](docs/ref/PHOTOS.md) first.
  Rules that stayed in CLAUDE.md: "Photos wait for Save" (C1-C3, "C2: the leave guard", "Replace never overwrites a photo file"), "Receipts never overwrite", "Photo / receipt write layer", "Receipt photos auto-convert to PDF", and the chooser rule E2 (under "Rules extracted from moved sections"). The continuations of the Save-wait, leave guard, Replace, Receipts and write-layer sections are in docs/HISTORY.md.
- When touching the Add Coin or Edit Coin forms, the Identification section (Grader, PCGS label, Mint Item Number, GSID), denomination or Finish dropdowns, CACBean, Value fields, or Staging-draft editing: read [docs/ref/ADD_COIN.md](docs/ref/ADD_COIN.md) first.
  Rules that stayed in CLAUDE.md: "Add Coin write layer — Phase 1" and "Browse Edit real write layer" (their continuations are in docs/HISTORY.md), and "Add Coin Phase 2 + live-device retest batch".
- When touching Add Set (Step 1/2, Set drafts, sub-groups, Set promotion): read [docs/ref/ADD_SET.md](docs/ref/ADD_SET.md) first.
  Rules that stayed in CLAUDE.md: the design head of "Add Set + real write layer"; its continuation is in docs/ref/ADD_SET.md.
- When touching dbCoinsCandidatesFor(), CoinID matching or re-link, Re-check, or the Description, Category, Composition, Designation or Finish tiers: read [docs/ref/MATCHER.md](docs/ref/MATCHER.md) first.
- When touching Catalog, the Sets tab or checklist, Rolls, Browse filters, or the live-nav-data read path: read [docs/ref/BROWSE_CATALOG.md](docs/ref/BROWSE_CATALOG.md) first.
- When touching the Browse detail page, the Edit Coin / Edit Set layout, Overview and accordions, Spotlight, Specifications, sharing, Set child linkage, or the Value floor and formatCurrency: read [docs/ref/BROWSE_DETAIL.md](docs/ref/BROWSE_DETAIL.md) first.
  Rules that stayed in CLAUDE.md: "Belongs to: Set membership from OriginSetID only" and "Set attach / detach: the real OriginSetID write layer" (continuation in docs/HISTORY.md).
- When touching flip-card or mini-card corner labels, corner fitting, composition or variety text, SMS, or the reverse face: read [docs/ref/FLIP_CARD.md](docs/ref/FLIP_CARD.md) first.
- When touching Albums (list, page-flip book, slots, key dates, Mintage text, image prefetch, Best of view): read [docs/ref/ALBUMS.md](docs/ref/ALBUMS.md) first.
- When touching the Dashboard cabinet, drawers, Back and Close Drawer, device Back / the history guard, the splash screen, or startup gating: read [docs/ref/NAV_DASHBOARD.md](docs/ref/NAV_DASHBOARD.md) first.
  Rules that stayed in CLAUDE.md: "Startup connection, docket.json, and the no-demo-data rule" (startup timings, Retry, Docket fast-fail).
- When touching the Docket, the Needs Attention hub, Staging Review, or their Re-check / Force Add / Dismiss buttons: read [docs/ref/DOCKET_STAGING.md](docs/ref/DOCKET_STAGING.md) first.
  Rules that stayed in CLAUDE.md: "Phase 2 promote: duplicate-row bug" (continuation in docs/HISTORY.md), "Item 5 — Force Add's orphan blank row", "CollectionID-reservation system — Promotion / Rejection", and "docket.json handling".
- When touching Former Holdings, Purge, or the Show Purged toggle: read [docs/ref/FORMER_HOLDINGS.md](docs/ref/FORMER_HOLDINGS.md) first.
  Rules that stayed in CLAUDE.md: the design head of "Former Holdings sub-catalog + Purge"; its continuation is in docs/ref/FORMER_HOLDINGS.md.
- When touching Ledger, Stats, spot prices, Status and Sell/Remove, or Wishlist: read [docs/ref/LEDGER.md](docs/ref/LEDGER.md) first.
- To find where a heading from the old file went: [docs/INDEX.md](docs/INDEX.md).
- Section names quoted elsewhere in this file ("see ...", "above", "below") may now live in a docs/ file: look the heading up in [docs/INDEX.md](docs/INDEX.md).
- Only when you need the story behind a feature (test lists, negative controls, bug-fix rounds, superseded designs): [docs/HISTORY.md](docs/HISTORY.md).
- When Ray runs a live pass: the checklists `docs/*_LIVE_RUN_CHECKLIST.md`.

## Standard end-of-work pattern (standing rule, Oct 2026) — read this first
**1. With every branch, before reporting it done.** The branch's last commit
adds or updates its section in this file: what it does, the function and
constant names, what was left alone on purpose, and what is not verified.
Docs reach `main` in the same merge as the code. Every branch report ends with
one line: "CLAUDE.md updated in <commit>", or "no CLAUDE.md change needed
because <reason>".
See also "History goes to docs/HISTORY.md" below; where they differ, the later rule wins.

**2. When Ray says "end session"** (or at a natural stopping point):
- a. Check that this file matches `main`: every merged branch has a section;
  nothing describes removed code as current (grep for the names of functions
  known to be removed, e.g. `resolveCoinSetLink` — mentions must be marked
  *(removed …)* or describe current behaviour); the baseline line below is
  current.
- b. Commit any fix as ONE docs-only commit, push it to `main` (Ray's standing
  permission for docs only), and confirm `origin/main` matches local.
- c. Report in a few lines: the new `main` hash, the suite baseline, branches
  merged but still on origin (never delete them), and anything unfinished.
- d. Do NOT write or update the primers or session notes; the coordinating
  Claude does that.
- e. If a session is about to be compacted or closed and part 2 has not been
  done, do it first.

**3. Every report to Ray is copy-paste ready (standing rule, Oct 2026).**
Plans, branch reports, merge reports and answers to questions all go in ONE
fenced plain-text code block that Ray can paste straight to chat-Claude:
plain text inside (no markdown tables, no bold), short numbered sections,
questions as Q1/Q2... each with the recommendation in brackets, and the
"CLAUDE.md updated in <commit>" / "no CLAUDE.md change needed because ..."
line inside the block. At most one short sentence outside it. Don't wait to
be asked for the copy-paste version.

**4. Keep "Current state" current (standing rule, Ray, 27 Oct 2026).** At the
end of EVERY task, before the report, rewrite (do not append to) the "Current
state" block at the very top of this file, under 25 lines: main's hash and
what LIVE runs (hash, if known); the baseline (passed / failed / page errors /
suites) and the commit it ran on; the open branch, if any (name, tip, held or
merged, what is waiting, e.g. Ray's tablet test); the next task and the
backlog letters after it, in order; open questions waiting for Ray; anything
unverified on a real device. A commit cannot name its own hash, so the block
names the last code commit and says main's head is the docs commit that
rewrote it; the report gives the exact head. **A session may end at any
time: never leave work only in the conversation.** Anything a new session
would need goes in this file before the report. New sessions may start from
a short primer such as "Read CLAUDE.md, starting with Current state. Report
the model and effort line, main's hash and whether origin matches, then wait
for the task" (any wording, possibly with the task included): answer exactly
that, then wait.

**Docs-only commits** (this file only, no code) may go straight to `main` with
Ray's go-ahead. **Code never does**: code goes through a branch and Ray's merge
go-ahead.

**Baseline:** last code commit on `main` is `f14cb97` (receipts never
overwrite, on top of `928d7a9`'s photos-wait-for-save work; merged 28 Oct 2026
by fast-forward of `claude/receipts-never-overwrite`; later commits are
docs-only); `npm test` = 4088 passed, 0 failed, 0 page errors, 78 suites (run
on the branch, 28 Oct 2026; 4125 / 0 / 0 / 79 at `960634d`, merged 30 Oct 2026). **Not deployed by the merge**: LIVE gets it
only when Ray runs the deploy workflow for `main`.

## Session working rules (standing rules, added 28 Oct 2026)
1. **Never read app.html whole.** Search first (grep), then view only the line ranges you need.
2. **When running npm test, report only the totals and any failures, not the full output.**
3. **History goes to docs/HISTORY.md.** When a branch merges, move its build history into docs/HISTORY.md and keep only its rules and a one-line summary in CLAUDE.md, so the file doesn't grow back.

## Rules extracted from moved sections (copies, kept here because they apply beyond one area)
Each excerpt is a line-for-line copy. The original still sits in the file named in its Source line; line numbers are CLAUDE.md at `21bcd95`.

E1: there is NO global `.hidden` rule in app.html. Source: [docs/ref/BROWSE_DETAIL.md](docs/ref/BROWSE_DETAIL.md), section "Detail/Edit accordion redesign (BUILT and merged to main)" (original lines 4526-4533).
- **`class="hidden"` on a plain div does nothing in this file.** There is NO
  global `.hidden` rule — every `.hidden` is scoped to its own component
  (`.detail-row.hidden`, `.accordion-body.hidden`, …). The new Belongs-to
  wrapper in both Edit forms relied on a bare `class="hidden"` and so rendered
  an empty "BELONGS TO" heading on any record with no linkage. Caught in a
  screenshot, fixed with a scoped `.edit-linkage-wrap.hidden` rule, and a
  regression assertion added. **Worth remembering for any future
  hide-by-class work in this file.**

E2: the image chooser uses three separate inputs because Samsung Internet skips the native chooser. Source: [docs/ref/PHOTOS.md](docs/ref/PHOTOS.md), section "Unified image chooser — stages C1 + C2 (Oct 2026, merged to main 22 Oct 2026 by fast-forward to `38b0207`, built on `claude/unified-image-chooser`)" (original lines 1599-1610).
- **The chooser** (`#imageSourceChooser`, `openImageSourceChooser({ onFile,
  guard, title })`, `closeImageSourceChooser()`): a bottom sheet on a phone,
  a centred card at 700px and wider, z-index 205 (above the 200 sheets,
  below the crop overlays at 210). Three SEPARATE shared inputs
  (`imageChooserCameraInput` image/* + capture=environment,
  `imageChooserLibraryInput` image/*, `imageChooserFilesInput`
  image/*,application/pdf = `FILES_PICKER_ACCEPT`, no capture): never one
  combined input, because Samsung Internet skips the native chooser. A
  source tap closes the sheet before the OS picker opens; the request rides
  on the input (`_chooserRequest`) until its change event, so cancelling the
  OS picker leaves the screen as it was. Cancel, a backdrop tap and Esc
  close it. **No Android back-gesture handling in v1** (Ray's call).

E3: reads and writes target the same workbook, always. Source: [docs/ref/BROWSE_CATALOG.md](docs/ref/BROWSE_CATALOG.md), section "Live nav data (read-only) — BUILT and merged to main" (original lines 14712-14725).
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

E4: test-quality trap: an assertion whose broken case also returns the passing value proves nothing. Source: [docs/HISTORY.md](docs/HISTORY.md), section "Photo / receipt write layer — Photos & Receipts tabs (BUILT and merged to main)" (original lines 11212-11219).
- **Two assertions were strengthened after a control failed to fire**:
  `Q6`/`Q7` matched the FIRST Reference row, which is the OLD one when a
  spurious row is added, so both passed against broken code; they now match
  on the row carrying the new filename. And `Q9` was added to isolate
  `writePhotoRow()`'s own Label fallback, which the JS-side caption
  carry-forward was masking. Same trap as `G3`/`F2` last round — assume it
  applies to any assertion whose broken case also returns the passing
  value.

E5: anything that redraws the Album book mid-turn must go through the turn helpers. Source: [docs/ref/ALBUMS.md](docs/ref/ALBUMS.md), section "Albums: page flip can no longer get stuck (`tests/verify_album_book_flip.js`)" (original lines 2041-2050).
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

E6: do not hand-tune a visual nudge for a font-rendering perception. Source: [docs/ref/NAV_DASHBOARD.md](docs/ref/NAV_DASHBOARD.md), section "Cabinet navigation redesign (BUILT and merged to main; built on `claude/cabinet-navigation`, whose tip is not an ancestor of `main` — landed via rebase; the code is on `main`)" (original lines 13972-13976).
  **Lesson for future passes**: don't hand-tune a "visual" nudge for a
  font-rendering perception (slant, glyph weight) based on this
  environment's own Chromium — font hinting/rendering varies enough across
  engines that a guessed compensation can just as easily overcorrect on a
  different device, as it did here.

E8: DESCRIPTION_GENERIC_TOKENS must stay tight; never add an identity-bearing word. Source: [docs/ref/MATCHER.md](docs/ref/MATCHER.md), section "Description consistency gate + Category lone-candidate fix (BUILT and merged to main; built on `claude/brave-wozniak-6fobpg`, tip `b6d82de`, landed via rebase; the code is on `main`)" (original lines 16816-16822).
- **`DESCRIPTION_GENERIC_TOKENS` is deliberately tight** and must stay so:
  every word added makes a false refusal likelier. It strips denomination
  nouns, the country and connectives, and pure-numeric tokens (Year is
  already the matcher's own base key). **Never add an identity-bearing word
  to it** — `EAGLE` stays (it is all that survives "Quarter Eagle"), and so
  do `GOLD`/`SILVER`. Stripping `DOLLAR` is what stops "Trump Dollar"
  agreeing with "American Silver Eagle Dollar" on that word alone.

E9: every category hint is a phrase of two or more words; never collapse one to a single word. Source: [docs/ref/MATCHER.md](docs/ref/MATCHER.md), section "Add Coin Phase 1: Category narrows the DB_Coins matcher (BUILT and merged to main)" (original lines 8516-8526).
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

E11: only the CERT part of a label may reach a cert-lookup URL. Source: [docs/ref/ADD_COIN.md](docs/ref/ADD_COIN.md), section "Grader dropdown + grader-agnostic cert linking (locked in)" (original lines 6191-6200).
3. Cert lookup is resolved via `Lookup_Graders[GradeSource].Cert Lookup Base
   URL` — **grader-agnostic**, not hardcoded per service. Adding a new
   confirmed grader to `Lookup_Graders` (a base URL) is the only change needed
   to light up its lookup link; no code change per grading service. The link
   only activates if that GradeSource actually has a base URL on file (today:
   PCGS and NGC do, ANACS/ICG/CAC don't — see the research note). **Only the
   CERT portion of a decoded label is ever valid input to this resolver** —
   SPEC and GRADE must never reach a lookup URL; the resolver defensively
   strips anything before a stray `/` as a second line of defense on top of
   the parser already isolating CERT correctly.

E12: Grading Help: hard copyright constraint. Source: [docs/ref/ADD_COIN.md](docs/ref/ADD_COIN.md), section "Grading Help button (framework only, locked in)" (original lines 6302-6305).
shows the plain "no grading guidance on file yet" message plus the links. **Hard copyright constraint**: this must never reproduce ANA's
grading-guide text or PCGS's Photograde images — the modal only ever
summarizes-and-links to their own public reference pages (PCGS PhotoGrade,
NGC Grading Standards), the same hotlink-only posture as the rest of PCGS

E13: Mint Mark "Other" never writes a persisted value. Source: [docs/ref/ADD_COIN.md](docs/ref/ADD_COIN.md), section "Mint Mark "None (Other)": real DB_Coins.Mint disambiguation (BUILT and merged to main)" (original lines 9939-9946).
- **"Other" never writes a persisted MintMark value of its own** (Q2,
  confirmed) — its option value is a one-shot sentinel (`__OTHER_MINT__`),
  normalized straight back to `""` the instant the `change` handler fires,
  BEFORE `refreshVarietyOptions()`/`checkDbCoinsMatch()`/`updateFlipLabels()` *(removed 23 Oct 2026, commit 6 `c6f0ba0`)*
  or any other reader of `#mintMark.value` runs. It's purely a UI trigger
  for the one-time lookup below; the draft's MintMark stays blank, exactly
  like an ordinary Philadelphia coin — verified directly (a saved draft
  through this path carries `mint: ""`).

E14: the full-name Mint column must never replace MintMark in the primary join key. Source: [docs/ref/ADD_COIN.md](docs/ref/ADD_COIN.md), section "Mint Mark "None (Other)": real DB_Coins.Mint disambiguation (BUILT and merged to main)" (original lines 9947-9953).
- **`mapWorkbookRowToDbCoin()` now reads `DB_Coins.Mint` into a new
  `mintFull` field**, kept completely separate from `mint` (the abbreviation
  the base matcher's join key already uses). This is a NEW, narrow lookup —
  used only by `handleMintMarkOtherApply()` — and does not touch the
  existing hard constraint that the full-name `Mint` column must never
  substitute into the primary MintMark join key; `dbCoinsCandidatesFor()`
  itself is completely unchanged.

E15: Edit Coin never auto-fills over curated identity fields. Source: [docs/ref/ADD_COIN.md](docs/ref/ADD_COIN.md), section "Workbook-alignment batch (BUILT and merged to main)" (original lines 10769-10775).
- **Deliberately narrower than Add Coin's.** Add Coin fills a whole new
  coin's identity from the matched row because there is nothing to lose. Edit
  Coin must not: Description/Variety/Finish/Denomination/Year on an existing
  row are curated, and this form's standing rule is that it never auto-fills
  over them. So the only field it writes is Mint Mark — which the shared
  sentinel has already normalized to blank — and the visible outcome is a
  banner plus a catalog link.

E17: setId and originSetId are different relationships; never cross-wire them. Source: [docs/ref/BROWSE_DETAIL.md](docs/ref/BROWSE_DETAIL.md), section "Browse detail view (locked in)" (original lines 4880-4892).
- **Child linkage — `originSetId`, a NEW field kept fully separate from
  Issue-3's `setId`.** These are two different relationships and must never
  cross-wire: `setId` (S-XXYY-TT-##) is Issue-3's "an individual owned coin
  *belongs to* this Set" chip linkage (`resolveCoinSetLink()` *(removed Oct 2026)*, matched against
  a bundle's own `setId`; that chip no longer exists, and SetID is now treated as the
  issue catalog, not membership); `originSetId` (demo `OS-YYYY-XXX-##`) is "these
  child coins are physically *inside* this Set bundle." A parent bundle and
  all its children share one `originSetId`. **The `-Set`/`-A`/`-B` CollectionID
  suffix pattern (see "ID schemes") stays the human-readable provenance
  lineage but is NOT the code join key** — the join is the explicit
  `originSetId` field, deliberately, to avoid brittle CollectionID-string
  parsing. Children have `originSetId` but no `setId`, so they never trigger
  the Issue-3 "belongs to" chip.

E19: a blank mint mark is a double dash in real CoinIDs. Source: [docs/ref/ALBUMS.md](docs/ref/ALBUMS.md), section "Albums: live-wiring, read-only (BUILT and merged to main)" (original lines 14929-14940).
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

E21: the coin's own display images are Obverse / Reverse; Front / Back is only for the Holder. Source: [docs/ref/PHOTOS.md](docs/ref/PHOTOS.md), section "Add Coin uses Edit Coin's photo section (Oct 2026, merged to main 23 Oct 2026 by fast-forward, built on `claude/addcoin-shared-photos`)" (original lines 233-238).
  footer). **Rule (Ray, 22 Oct, T1): the coin's own display images are
  Obverse / Reverse; Front / Back is only for the Holder** (and for the
  other non-coin pairs: Package, whole set, sub-group). The coin pair's
  slots read "Obverse"/"Reverse" (`managePairBlock` picks by `flipSource`).
  Commit 1 first shipped "🪙 Front & back" and "Front (obverse)"/"Back
  (reverse)"; corrected after T1.

## The build decides its data target (Oct 2026) — read this first
**Supersedes every earlier statement that `WRITE_TARGET` is a hand-set
constant that "only Ray flips".** Built on `claude/build-decides-target`
(app) and `claude/build-decides-target-deploy-workflow` (workflow), merged
to `main` as two fast-forwards on Ray's go-ahead (`aa55f55`, then `1119003`).
**DONE and LIVE (17 Oct 2026):** Pages source is "GitHub Actions"; Ray ran
the workflow (runs #1-#3, all success) and `main` is deployed stamped, so the
live site writes the REAL workbook and `CoinCollection/CoinPhotos`/
`CoinReceipts`. Ray confirmed a real photo and receipt read/write against the
live database. Every future change reaches the live site only when Ray runs
the workflow for `main`.

**The rule.** `WRITE_TARGET` is derived at load from an inline build stamp
(`BUILD_STAMP`, the one placeholder line `const BUILD_STAMP = null;` marked
for the workflow) by `isLiveBuild()`. It is `"live"` (the real workbook and
the real `CoinCollection/CoinPhotos`, `CoinReceipts`, `Staging`) ONLY when
all of these hold; anything else, including any error while checking, is
`"copy"` (`CoinCollection/_Testing/`):
- the stamp is a real object (not the placeholder, not a string);
- its branch is exactly `"main"` (not `main-fix`, a tag, `refs/heads/main`);
- its commit is 40 lowercase hex characters;
- the page is served over https from `salty224.github.io` under
  `/coin-collection-app/` (not localhost, `file://`, a download, another
  path).
The stamp is inline (not fetched) so it exists synchronously before the
write flags, `WRITE_LAYER_ENABLED`, the MSAL instance and `WRITE_PATHS` are
built, and so it can never disagree with the code it shipped with. **Nothing
in the code is flipped to go live** — deploying `main` through the workflow
is what does it.

**Every write flag is on in both targets** (`ENABLE_SET_WRITE_LAYER`,
`ENABLE_BROWSE_EDIT_WRITE`, `ENABLE_DOCKET_WRITE`, `ENABLE_ADDCOIN_WRITE`,
`ENABLE_SET_LINK_WRITE`, `ENABLE_PURGE_WRITE` are plain `true`; they used to
be `(WRITE_TARGET === "copy")`, which switched every writer OFF under
"live"). Each flag still gates its own feature. The on-screen messages that
say "WRITE_TARGET is live and this hasn't been re-enabled yet" are now
unreachable and were deliberately left alone.

**What the user sees.**
- **TEST bar**: a thin (24px) blue bar fixed at the very top, above the
  splash, reading `TEST · {branch}` (`TEST · unstamped` with no stamp), shown
  ONLY when the target is the copy. Nothing at all when live. Its height is
  published as `--top-strip-h`, which pads the body, moves the sticky
  `.nav-chrome` down, pads the photo overlays, and is subtracted from
  `#app`'s `min-height: 100vh` (without that, every screen scrolled by 24px).
- **Build line**: small gray `Build {N} · {D Mon} · {short commit}` (date in
  UTC) directly under "Connecting to OneDrive…" on the splash and at the
  very bottom of the Docket screen, centred, in both modes; `Build
  unstamped` with no stamp.
- **Newer-build row**: a stamped, served build fetches `build-info.json`
  (written by the workflow beside `app.html`) uncached once at startup; if
  its commit differs from the page's own stamp, an amber row "A newer build
  is deployed — reload" appears under (or instead of) the TEST bar. Does
  nothing when unstamped, opened from a file, or when the file is missing or
  malformed.

**Deploy routine (after the workflow merge).** Pages source is "GitHub
Actions". There is no push trigger: nothing deploys until Ray runs the
workflow. Actions → "Deploy to GitHub Pages" → Run workflow → leave "Use
workflow from" on `main` → type the branch to deploy (no default since
Oct 2026: the box starts blank and a blank run fails before checkout, so
LIVE is never a pre-filled value accepted by accident) → Run workflow. The workflow checks out that branch, stamps branch, commit,
`github.run_number` and the UTC date into the placeholder line (the build
fails if the line isn't found exactly once), writes `build-info.json`, and
deploys. `main` → LIVE; any other branch → TEST with its name in the bar.

**Rollout order (agreed, all five steps completed 17 Oct 2026).** (1) merge the app branch while Pages is still on
the branch source — that deploy is unstamped, so it runs as TEST exactly as
before; (2) Ray switches Pages to "GitHub Actions"; (3) merge the workflow
branch (no push trigger, so nothing deploys); (4) Ray deploys a feature
branch first (stamped, still TEST) to prove the stamping; (5) Ray deploys
`main` → LIVE.

**Testing notes.** The raw `app.html` is unstamped, so every suite runs as
copy, exactly as before. `tests/verify_build_decides_target.js` proves the
LIVE case by serving a stamped temp copy at the real Pages URL through
Playwright request interception, with every outside request (Graph,
Microsoft sign-in, the MSAL CDN) aborted.

**Known effects, accepted.** (a) TEST builds only: at 1024×768 an open album
needs about 8px of scroll, because the album row budget leaves 16px spare and
the bar takes 24px; LIVE is unchanged. `verify_album_book_layout.js` F1–F8
measure with the bar hidden for that reason. (b) Going LIVE turns on every
writer against the real workbook at once; the deferred bugs (silent file
overwrite on slab/reference/receipt captures, the receipt re-capture message,
extra-column blanking on Photos/Receipts row replace) are still unfixed on
`main`. *(The photo overwrite and the Photos-row replace blanking are fixed on
`claude/photos-wait-for-save`, merged to `main` 27 Oct 2026: see "Replace
never overwrites a photo file" and C1's in-place Replace. Receipts are not:
backlog (t). Past LIVE overwrites: backlog (v).)*
(c) The Staging ID-reader fix was dropped: Ray moved his hand-made Staging
folders into a separate "Manual Staging" folder, so Staging holds only the
app's own folders and `_Docket`.

## Photos wait for Save (Oct 2026, merged to main 27 Oct 2026 by fast-forward to `928d7a9`, built on `claude/photos-wait-for-save`)
**Merged on Ray's go-ahead (27 Oct 2026)** after his tablet retests (below).
C1-C3, rounds 2-3 and the Replace / PhotoID fix are all on `main`; the branch
stays on origin as history. The "held" wording in the sub-section headers
below records the state while each was being tested.
Backlog items l, m, n, o. Plan answered by Ray 24 Oct 2026 (Q1-Q11). Built in
stages. **C1 is built and passed Ray's tablet test of `c5a8b29`** (steps 1-9,
11-13; step 10, the workbook check, deferred to a computer session; step 14,
airplane mode, skipped, so the partial-failure path is device-unverified).
**C2 passed Ray's tablet test of `79b4f90`** (all 15 steps). **The C2
follow-ups and C3 (open-ended Package/OGP) are built, held for Ray's
tablet test** (see "C2 follow-ups" and "C3: open-ended Package / OGP"
below); C4 is this file. **Ray's tablet test of `0a0cbd1` passed except a
second Back in a row leaving the app; that, the Dashboard exit toast, the
Mint Mark display and Tap to label are fixed in round 2, held for his
retest** (see "Round 2 after Ray's tablet test of `0a0cbd1`"). **His retest
of `6eaef11` passed everything except Tap to label (field focused, no
keyboard); round 3 re-focuses the field, held for his retest** (see "Round
3 after Ray's tablet retest of `6eaef11`"). **His tablet test of `826e2d4`
found a Replace writing over the old photo file (a must-fix before merge,
on main too) and a duplicate PhotoID; both fixed, held for his retest** (see
"Replace never overwrites a photo file; PhotoIDs minted inside the lock").
Branch cut from `main` `34dc28b`. Suites: `tests/verify_photos_wait_for_save.js`
(35), `tests/verify_leave_guard.js` (37), `tests/verify_device_back_everywhere.js`
(49 since round 2), `tests/verify_ogp_open_ended.js` (40),
`tests/verify_tablet_retest_0a0cbd1.js` (17 since round 3),
`tests/verify_replace_never_overwrites.js` (35).
- **The rule (C1).** On a saved record (an owned coin or Set, write layer on:
  `photoCommitTargetId`) Add, Replace, Recrop, Crop from another photo and ✕
  are held in memory and written only by Save Changes (Edit Coin, Edit Set)
  or Save (Manage Photos). Nothing writes on tap-away, a redraw,
  visibilitychange or pagehide. Draft mode (Add Coin, the Staging-draft
  edit) is unchanged; its S3 golden is unchanged.
- **Where it changed: one choke point.** `addGalleryEntryAndCommit` (every
  add/Replace/Recrop/crop-from-another goes through it) now places the entry
  `pendingSave` instead of writing (`placePendingAdd`; a single-instance slot
  that still holds a photo becomes a Replace of it). `opts.immediate` keeps
  the old write for any caller that needs it (none today).
  `replaceGalleryEntryAndCommit` records `pendingReplaces` (the saved photo it
  replaces; replacing a pick that was never saved points past it).
- **✕** (`confirmRemovePendingPhoto`, called from `confirmRemoveGalleryPhoto`
  for a saved record): a saved photo is marked `pendingRemove` and hidden, but
  stays IN the list, because taken out the next redraw would hydrate it back
  from the Photos index. A pick that was never saved just goes; a pick that
  replaced a saved photo is UNDONE (29 Oct 2026, was "takes that photo with
  it"): see "✕ on a Replace pick is an undo" below. A legacyOnly photo still
  gets the old "can't remove this one" dialog. Hidden from the screen via
  `visibleGalleryFor`, `manageCount`, the pair slot lookup, the open-ended
  loop and `cropSourceEntriesFor`.
- **Save** (`savePhotosAndLabels` -> `savePendingPhotos`, then
  `savePhotoLabels`). Order: adds and replaces one at a time in screen order
  (each uploads its crop, then its `_original`, THEN writes its Photos row, so
  a row never points at a missing file); removals last (row blanked, file
  never deleted); labels last, one cell each. Edit Coin: the coin row (with
  its conflict check), then the CoinID re-link, then photos, then labels; a
  conflict or a failed field save writes no photos. With no field changed the
  coin row is not touched (`performBrowseEditLabelsOnly`, now photos and
  labels). Edit Set writes photos and labels; its fields stay session-only.
- **Partial failure.** A failed photo stays `pendingSave` with `uploadError`,
  dimmed, "Not saved — tap Save again", no ↻ (Save is the retry). Each file
  that uploaded is remembered (`entry.uploadedNames`), so the next Save sends
  only what is missing; a photo whose row landed is never re-sent. A removal
  whose write fails stays `pendingRemove`. The toast names the files
  (`photoSaveFailureText`); the form stays open (`photoEditsAllSaved`).
- **A new photo's row is created with its typed label** (Ray's Q1), so its
  label needs no second write and counts as a photo change, not a label
  (`unsavedPhotoLabelEntries` skips pending entries). This reverses the old
  "a brand-new photo's row starts with a blank Label".
- **In-place Replace writes ONLY Filename and OriginalFilename** (Ray's Q3),
  each a single cell, re-checked against PhotoID and CollectionID just before
  (`replaceFileCells` inside `writePhotoRow`). PhotoType, SubGroupID, Label
  and DateAdded are left as they are. New rows still use `writeRecordRow`
  (claim a blank row); detach still blanks the whole row on purpose. Label
  writes stay single-cell (`writePhotoLabel`). The replaced file stays on disk
  (the later `_Replaced` folder item would move it after the row write;
  *superseded by backlog (s), the "Keep the old photo?" choice*).
  *(Not true for fixed-name types until 27 Oct 2026: their Replace uploaded
  over the old file. Fixed: see "Replace never overwrites a photo file".)*
- **Repeatable filenames** are chosen at Save: a pick's provisional name no
  longer counts in `nextFreeRepeatableFilename` / `coinPhotoNameKnown`, so a
  discarded pick never uses up a number.
- **Progress and lock.** The Save button shows the spinning coin and "Saving
  photo 2 of 3…", "Removing 1 photo…", "Saving labels…"
  (`pendingButtonProgress`); each tile shows "Saving…" as it goes
  (`photoHostRenders` / `repaintPhotoHost`). While a Save runs
  (`withEditSaveLock`, `editSaveInFlight`) Back and Close Drawer toast "Still
  saving — wait for it to finish" and the active view takes no taps
  (`body.edit-save-locked`) (Ray's Q5).
- **Manage Photos** has ONE "Save" (`saveManagePhotos`; the element keeps the
  id `managePhotosSaveLabelsBtn`), shown while a photo or label is unsaved.
  Footer: "Photos and labels save to OneDrive when you tap Save." Edit Set's
  footer: "Photos and their labels save to OneDrive when you tap Save
  Changes."
- **Discard** (`discardPendingPhotos`, wrapped with labels in
  `discardUnsavedPhotoEdits`): picks go, replaced photos come back in their own
  place, ✕'d photos come back. Back's "Discard unsaved edits?" counts photos
  ("1 field, 1 photo label and 2 photos"). *(C1 left `navigate()` discarding
  silently; since C2 it asks first, see below.)*
  Opening Edit Coin or Edit Set discards that record's leftovers.
- **Known effect, accepted:** ↻ no longer appears on a saved record (Save is
  the retry). `retryGalleryPhotoCommit` and the ↻ markup are kept for a
  committed failure, which nothing produces today.
### C2: the leave guard (built on the same branch, HELD for Ray's device test; merged to main 27 Oct 2026)
Backlog l and o, Ray's Q4 and Q6, plus his four tidy-ups from the C1 test.
- **One check, one dialog, every way off an editing screen.**
  `activeEditScreen()` says which editing screen is up ("editcoin",
  "editset", "managephotos", "addcoin" — a new coin or a Staging-draft
  edit); `unsavedEditsForView()` says what is unsaved there (fields, photo
  labels, photos, a receipt on Add Coin) and how to discard it;
  `guardLeaveEditScreen(leave, onKeep)` runs `leave` at once when nothing is
  unsaved, else shows `showDiscardEditsDialog`. Title "Discard unsaved
  edits?"; body "You've changed {count} on {ID} and haven't saved.
  Discard leaves this screen and loses those changes. Keep editing stays
  here so you can save." ({ID} is "this new coin" on a new Add Coin.)
  Buttons Keep editing / Discard. The old `confirmLeaveWithUnsavedEdits` is
  gone.
- **Where it runs.** `navigate(viewId)` is now the guard around
  `navigateNow(viewId)` and returns whether it left (`beginCoinDraftEdit`
  checks it). That covers Close Drawer and every other route. The in-form
  and chrome Back of Edit Coin / Edit Set / Manage Photos, Edit Set's "Coins
  in this Set" row, and `openManagePhotos` (wrapping `openManagePhotosNow`,
  so a Set's Manage Photos opening a coin's asks first) all go through it.
  While a Save runs nothing leaves: `navigate()` toasts "Still saving —
  wait for it to finish" and returns false.
- **What counts.** Edit Coin: `browseEditTouchedFields` (file inputs no
  longer count: the receipt saves on pick, Q10). Edit Set: fields that
  differ from the form as opened (`editSetChangedFieldCount`, Q4; they are
  session-only but still count). Both plus unsaved labels and pending photos.
  Manage Photos: labels and photos. Add Coin: `addCoinTouchedFields` (a
  delegated listener on `#view-addcoin` that records only trusted user events
  and skips file inputs, so an album or Wishlist deep-link prefill and a
  Staging draft being loaded never count), photo picks
  (`addCoinUnsavedPhotoCount`: entries not `stagingStored`, plus Staging
  photos ✕'d), and a picked or removed receipt (`addCoinUnsavedReceipt`).
  Add Coin's Discard is `resetAddCoinForm()` + `clearCoinDraftEditContext()`.
- **Device Back (Q6).** *(Widened to every screen by the C2 follow-ups
  below: the entry now stays on top everywhere and nothing steps back over
  it except Leave.)* Opening an editing screen pushes ONE history entry
  `{coinLeaveGuard: token}` (`armLeaveGuard`); `setNavBack` (run on every
  screen change) queues `syncLeaveGuard`, which arms or disarms, so redraws
  never stack a second entry. The popstate handler (`onLeaveGuardPop`) runs
  the same check: nothing unsaved -> the in-app Back (`navBackHandler`);
  something unsaved -> the dialog; Keep editing pushes the entry back;
  Discard runs the in-app Back. Leaving any other way (Save that leaves,
  in-app Back, Close Drawer, navigate) steps back over the entry
  (`disarmLeaveGuard`, the pop it causes is expected and ignored). The photo
  viewer keeps its own entry on top; Back there closes only the viewer (the
  pop lands on our entry, which stays). While a dialog or a Save is up, Back
  re-arms and changes nothing; with the image chooser open it closes the
  chooser; with the crop tool open it cancels the crop (as its Cancel does). Each entry has its own token, so one left behind by a reload is
  never mistaken for ours.
- **Tidy-ups (Ray, C1 test).** (1) The status line ("Not saved yet",
  "Saving…", "Not saved — tap Save again") sits under the Replace button on
  every tile type (open-ended tiles had it above the label line). (2) Remove
  dialog for a saved photo: "This {Reference photo} will be removed when you
  tap Save. Until then nothing changes, and Discard brings it back. The
  photo file itself is never deleted." plus the legacy All-columns note when
  it applies; a never-saved pick: "This {…} hasn't been saved yet, so taking
  it off writes nothing." (3) The Discard dialog above. (4) One Save toast
  wording on every editing screen, `photoSaveHeadline`: "Saved {ID} — 1 photo
  added." / "— 1 photo removed." / "— 1 label updated." (Edit Set's labels-
  only toast used to be "1 photo label saved to the workbook."). Edit Coin's
  fields toast keeps "Saved {ID} to the workbook (N fields updated, …)".
- **Edge case pinned (Ray, C1 test):** a label changed and then ✕ on the
  same photo: Save writes the removal only; the toast says "Saved {ID} — 1
  photo removed."; the row ends fully blank; no Label cell is written
  (`unsavedPhotoLabelEntries` skips `pendingRemove`). Test E1.
### Replace never overwrites a photo file; PhotoIDs minted inside the lock (same branch, HELD for Ray's retest; merged to main 27 Oct 2026)
Ray's tablet test of `826e2d4` (27 Oct 2026). **Must-fix before merge:**
AY-00724's Holder back was replaced; row PH-00038 kept Filename
`AY-00724_slab_reverse.jpg` (DateAdded 3 Oct, correctly kept) and the new
picture was uploaded OVER the old file in TEST's CoinPhotos.
- **Also on main / LIVE, not new on this branch.** Every fixed-name type
  (Obverse, Reverse, Holder front/back, a Set's whole-set and sub-group
  pairs, the old Package pair) uploaded under its one convention name with a
  plain PUT (Graph's default is replace), so Replace and Recrop wrote over
  the previous `{ID}_slab_reverse.jpg` / `_obverse_cropped.jpg` /
  `_obverse_original.jpg`. On main this happened on capture; here at Save.
  It is the "silent file overwrite on slab/reference/receipt captures" item
  in "Known effects, accepted". Numbered types were already safe
  (`nextFreeRepeatableFilename`), and Crop from another photo
  (`freeFlipCropFilename`, `_cropped_02`).
- **Fix 1, names chosen at Save for fixed-name types too**
  (`freeSingleFilenames`, called from `commitGalleryPhoto`): the plain name
  when it's free, else `_02`, `_03`… (`{ID}_slab_reverse_02.jpg`); a flip
  source's crop and original take ONE number
  (`_obverse_cropped_02.jpg` + `_obverse_original_02.jpg`). "Free" is the
  existing `coinPhotoNameIsFree` (no Photos row, no gallery entry, no file
  in CoinPhotos), so a stray file with no row is never written over either.
  The row's Filename/OriginalFilename cells are then patched as before
  (`replaceFileCells`); the old file stays in CoinPhotos untouched.
- **Fix 2, the upload itself refuses to overwrite** (`NO_OVERWRITE`,
  `uploadFile(path, blob, opts)` / `uploadBytes`): the real client adds
  `?@microsoft.graph.conflictBehavior=fail`, so a name taken between the
  check and the upload fails with 409 (`uploadError`, `err.conflict`)
  instead of replacing. The photo stays "Not saved — tap Save again", its
  name is cleared (`filenameResolved = false`), and the next Save picks a
  free one. The mock client honours the option too.
- **Recrop from the original** (`adjustStoredPhoto` when `src.fromRaw`, and
  the in-session Recrop of a saved photo): the original is already in
  CoinPhotos, so the new entry carries `rawStored` and the row keeps pointing
  at that file; only the new crop is uploaded (no second copy, nothing
  written over). A Recrop from the saved photo (no original on file) uploads
  the source bytes as a new free `_original_NN`, as before minus the
  overwrite.
- **Every upload path, checked** (what each does now):
  - Save on Edit Coin / Edit Set / Manage Photos (`commitGalleryPhoto`):
    free names + `NO_OVERWRITE`.
  - Add Coin's new draft (`uploadCoinDraftPhotos`, a fresh Staging folder):
    `NO_OVERWRITE`.
  - Staging-draft edit (`uploadStagingEditFiles` / `stagingEditNamesFor`): a
    fixed-name Replace used to overwrite the draft's own file in place; now
    it takes `_02` (crop and original together), uploads with
    `NO_OVERWRITE` (a file that already landed on an earlier attempt isn't
    re-sent, `entry.stagingLanded`), and the old file is deleted only after
    coin.json lists the new one (`finishStagingEditFiles`, unchanged).
  - Promotion moves, coin and Set (`moveFileWithoutOverwrite`, shared): a
    destination already holding the SAME bytes is the copy from an
    interrupted earlier run, so the move finishes; anything else there is
    refused ("nothing overwritten, source kept"); an empty destination is
    copied with `NO_OVERWRITE`. Before, a file at the destination was simply
    written over.
  - Crop from another photo: already free-named; now also `NO_OVERWRITE`.
  - **Not changed, reported:** receipts (`commitReceiptCapture`: a new
    filename not on the Receipts tab still uploads with replace, and a
    photographed re-capture `{ID}_receipt.pdf` that IS on the tab skips the
    upload, keeping the old file), Add Set (`uploadDraftPhoto`: fixed child
    names; a second Pause re-uploads over its own Staging file by design),
    Staging-edit receipts, and JSON drafts (`uploadJson`, rewritten on
    purpose).
- **Numbered names read back:** `rawNameForCropped` / `croppedNameForRaw`
  pair `_cropped_02` with `_original_02` (used by `storedRawFilenameFor`,
  `stagingPhotoGroups`, `recordPromotedCoinRecords`);
  `stagingPhotoTypeFromFilename` accepts `_02` on fixed-name types.
- **PH-00129 on two rows (AY-00212 Slab_Obverse and Slab_Reverse, 18 Oct,
  before this branch): the app wrote both, and the cause is fixed.**
  `writePhotoRow` minted the id (`nextPhotoId`) BEFORE `writeRecordRow` took
  the Photos table's lock. On main a pick commits at once, so a Holder front
  and back picked back to back both read the same highest id; the lock then
  gave them different rows. Reproduced by the control below (both got
  PH-00041). Now: the id is minted INSIDE the lock (`writeRecordRow`'s
  `mintId`), and never at or below one this session already gave out
  (`lastMintedIds`, per graph client), because a column read straight after
  a write can lag. Receipts the same (`writeReceiptRow(…, null)` mints inside
  the lock; promotion and `commitReceiptCapture` no longer mint first). On
  this branch a Save commits photos one at a time, so the race couldn't
  recur within one Save; the lagging read could. Main and LIVE still have
  it. The workbook row is Ray's to fix; nothing here writes it.
## Receipts never overwrite (Oct 2026, merged to main 28 Oct 2026 by fast-forward, built on `claude/receipts-never-overwrite`)
**Merged on Ray's go-ahead (28 Oct 2026)** after his tablet retest of `e4cfa79` passed (Staging replace keeps every old file; toast says the original was kept). Last fix before merge `f14cb97`: the Staging-edit Save changes toast capitalises its first word ("Receipt saved to Staging (the old file is kept there)."; P22b follows). The branch stays on origin. The "held" wording below records the state while it was tested.
Backlog (t), Ray's own Q1 on the "Replace never overwrites a photo file" fix
above. Same `NO_OVERWRITE` / free-name approach, extended to the one place
receipts still worked the old, unsafe way.
- **What was broken.** `commitReceiptCapture()` (Edit Coin / Edit Set /
  Manage Photos' receipt slot) treated ANY filename match on the Receipts
  tab as "this is the same document" and skipped the upload — correct for
  the intended multi-coin sharing (RC-00001 genuinely covers three real
  coins), wrong the moment two UNRELATED documents happen to share a name
  (two sellers' own `invoice.pdf`): the second coin's row would point at the
  FIRST seller's file, and nothing would ever upload for the second. A
  re-photographed `{ID}_receipt.pdf` hit the identical bug from the other
  side: since that fixed name is always this coin's own, the "dedupe" always
  found this coin's own existing row and skipped the real upload entirely —
  Replace did nothing at all. The Staging-draft-edit receipt branch
  (`uploadStagingEditFiles()`) had the second half of that same bug:
  replacing a receipt mid-edit uploaded straight over the old Staging file.
- **The fix.** Which of the two readings applies is now decided by BYTES
  (`sameFileBytes()`, the same check `moveFileWithoutOverwrite()` already
  uses for the identical ambiguity on a promotion move), never by the
  filename alone. A byte-fetch failure is treated as "different" (Ray's Q2)
  — a spurious extra file is cheap and visible; silently reusing the wrong
  ReceiptID is not. New `freeReceiptFilename()`/`receiptFilenameIsFree()`
  mirror the photo free-name helpers exactly (checked against both the
  Receipts table's own Filename column and a live `getItemMeta` against
  CoinReceipts, so a stray file with no row is caught too). Every receipt
  PUT (`commitReceiptCapture`, the Staging-edit branch, and a brand-new Add
  Coin draft's own first upload) now passes `NO_OVERWRITE`.
- **The new invariant (Ray's addition): one ReceiptID must never point at
  two different files.** Before a replace keeps this coin's own existing
  ReceiptID, `receiptIdUsedByOtherCoin()` checks whether any OTHER coin's
  row still carries it. If one does, this coin's row gets a freshly-minted
  id instead, and the other coin's row and file are left completely
  untouched — covers both phrasings: a re-photographed fixed-name receipt
  whose row happens to share an id, and a coin on a genuinely shared
  receipt (e.g. `invoice.pdf` on two coins) picking something new.
- **Add Set's own `uploadDraftPhoto()` is deliberately UNCHANGED** — still
  the same "a second Pause re-uploads over its own Staging file by design"
  behavior this file already documents; out of scope for this branch.
- **Blank-row claiming (the new standing rule above), audited for this
  branch specifically**: `writeReceiptRow()`'s new-row path already went
  through the shared `writeRecordRow()` helper, which already claims a
  blank row first — confirmed with a dedicated test (a Receipts table
  seeded with real rows plus trailing blanks; both `commitReceiptCapture()`
  and the Staging/promotion path's own `recordPromotedCoinRecords()` claim
  the next blank row, never appending). No code change was needed here —
  only the explicit, Receipts-specific test coverage, which didn't exist
  before (only Photos' had its own row-number assertion).
## ✕ on a Replace pick is an undo (29 Oct 2026, merged to main 30 Oct 2026 by fast-forward, built on `ccr-06105bea-fexby9`)
Ray's change to Q3, everywhere photos are edited. ✕ on a pick that REPLACED a
saved/stored photo removes the pick and puts the previous photo back in its
slot, as if the Replace never happened. Nothing is deleted, uploaded or written.
To delete the old photo too, ✕ on it is a separate step. Plain ✕ on a stored
photo and ✕ on a never-saved Add are unchanged.
- **Owned records** (Edit Coin, Edit Set, Manage Photos): `confirmRemovePendingPhoto`
  — a pick with `pendingReplaces` (set by `replaceGalleryEntryAndCommit` /
  `placePendingAdd`, so Replace, Recrop and Crop from another photo all
  count) restores `pendingReplaces` with `pendingRemove = false` (it used to
  be marked to come off at Save). Replace twice then ✕ restores the ORIGINAL
  saved photo (`pendingReplaces` already points past an unsaved pick).
- **Staging draft edit:** see the next section.
- **Dialog** (`confirmUndoReplaceDialog`, shared): title "Put the previous photo
  back?"; body "This {photo} replaced the one that was here. Removing it puts
  the previous photo back in its place, as if you had never replaced it.
  Nothing is deleted. To delete the previous photo as well, tap ✕ on it
  afterwards."; buttons Cancel / Put it back.
- Tests: `verify_photos_wait_for_save` W15-W16b (8 new; 43 total). Negative
  control with the undo removed: W15, W15b, W15c, W15f, W16, W16b fail (6).
- Not verified on a real device.

## Staging photo replace keeps the old file (Oct 2026, merged to main 30 Oct 2026 by fast-forward, built on `ccr-06105bea-fexby9`, code `7b56955`)
Backlog (w), Ray 28 Oct 2026. The Staging-draft edit (draft mode) only; owned
records (C1, "Replace never overwrites a photo file") are untouched.
- **Rule: a Replace, Recrop or Crop from another photo in a Staging draft
  edit keeps every old file.** Only ✕ after its confirm deletes. The only
  delete path is `finishStagingEditFiles()`, fed by `mergeStagingEditFiles()`'s
  `dropped`; `dropped` now leaves out the files a Replace stood in for.
- **How:** `draftPlaceGalleryEntry()` sets `newEntry.stagingReplaces` (the
  replaced stored files, carried through a chain of picks);
  `mergeStagingEditFiles()` builds `replacedFiles` from uploaded entries and
  returns `photosReplaced`. coin.json lists only the new files; the old ones
  stay in the folder, unlisted, so the next edit shows one slot and the free-name
  scan (`stagingTakenNames`) never reuses them. Names were already free
  (`stagingEditNamesFor`, `NO_OVERWRITE`): unchanged.
- **✕ on a pick that replaced a stored photo is an UNDO** (Ray, 29 Oct 2026,
  reversing the first build, which deleted the old files): the pick goes and
  the ORIGINAL stored entry comes back in its slot, through a chain of picks
  (`newEntry.stagingReplacedEntry`, set in `draftPlaceGalleryEntry`).
  Nothing is deleted or uploaded and coin.json is unchanged. ✕ on the
  restored photo is the ordinary stored-photo remove (deleted at Save
  changes). Crop from another photo into Obverse/Reverse counts as a Replace.
- **Promotion:** moves only what coin.json lists; kept old files stay in the
  Staging folder (no new field). A future Docket file cleanup can compute
  candidates as folder children minus coin.json's photos, receipt and itself.
  Reject deletes the whole folder; its dialog now says so.
- **Left alone on purpose:** Recrop still writes a second `_original_02`
  (reusing the old original would break the name pairing in
  `stagingPhotoGroups` / `recordPromotedCoinRecords`); Add Set's
  `uploadDraftPhoto`; (y) the Staging receipt slot.
- Tests: `verify_staging_replace_keeps_old` (21, A-M plus H2-H4);
  `verify_staging_edit_photos` P12, P13, Q10 follow the design. Negative
  controls: with the keep exclusion removed, A-F, M, P12, P13 and Q10 fail and
  the ✕ cases still pass; with the undo removed, H-H4 fail (4).
- Not verified on a real device. Crop from another photo is tested through
  `saveDraftCropFromUpload()` directly, not the crop UI.
### A failed Staging-edit save cleans up its own half-pair (30 Oct 2026, merged to main 30 Oct 2026 with the section above, code `960634d`)
Ray's tablet retest on `5d23349`, draft AY-00756. An Add's first Save wrote
`obverse_cropped_04`, then `obverse_original_04` was refused (409: OneDrive can
refuse a recently deleted name even though a lookup says it is free). Ray
re-saved: the retry took `_05` for both and wrote the crop again, leaving an
orphan `cropped_04`, `cropped_05`, `original_05`, and no `original_04`.
Cause: `uploadStagingEditFiles()` cleared the chosen names on a conflict but
left the half that had already landed. **Undo + Save was NOT at fault**
(reproduced: it uploads and deletes nothing).
- **Rule:** when a Staging-edit save fails partway, the failing entry's own
  landed files (`entry.stagingLanded`, uploaded by this attempt) are deleted
  before the failure is reported, so the re-save writes a matching pair. Only
  that entry's own files: never one already in the folder, never another
  entry's (a Reference that landed earlier in the same attempt stays and is
  not re-sent). The pick is still in memory, nothing is lost. No auto-retry.
- A cleanup delete that fails leaves a harmless orphan and the failure toast
  says so in one clause ("N partly uploaded file(s) couldn't be cleaned up
  from Staging (names) — harmless, and not part of the draft").
- A name OneDrive refused is remembered (`entry.stagingBadNames`) and skipped
  when the names are re-chosen, so the re-save takes the next number rather
  than hitting the same refusal again.
- Tests: `verify_staging_replace_keeps_old` N1-N4 (8 new; 29 total): the exact
  409-on-original_04 sequence, cleanup scope, a failed cleanup, and Add, Save,
  reopen, Replace, X, Put it back, Save uploading nothing. Negative control
  (the pre-fix app): N1, N1c, N1d, N2, N2b, N3 fail (6); N4 passes both ways,
  as the diagnosis said it would.
- Not verified on a real device.
## Current status (Oct 2026) — read this first
- `main` is the source of truth for everything in this file. Every branch
  section that once read "HELD" has since been merged (each header now says
  so). The one exception: `claude/in-app-pdf-viewer-options` (Receipt PDFs,
  pdf.js) is NOT an ancestor of `main`, though `loadPdfjs()` is present in
  `main`'s `app.html`; how it landed is unverified (likely squashed or
  cherry-picked). Check before treating that section as current.
- The live site writes the REAL workbook once Ray deploys `main` through the
  workflow (see "The build decides its data target"). Nothing reaches the
  live site until he runs it.
- Baseline: 4125 passed, 0 failed, 0 page errors, 79 suites (30 Oct 2026, on `960634d`; code on main is identical, later commits are docs-only). One earlier full run showed 4 failures in `verify_crop_from_upload` (C3a/C3/C7/C9): a timing flake under load, 48/48 alone twice and clean on the rerun.
- Still open, by choice: the `AllCoins` table's ref runs ~987 rows past its
  data (left as-is); a real Graph workbook session ("option 3") stays in
  reserve for read-after-write lag; the deferred write bugs listed under
  "Known effects, accepted" in "The build decides its data target".
- Backlog: see "Open backlog (Oct 2026)" directly below.

## Open backlog (Oct 2026) — recorded only, not built
- (a) A newly promoted coin does not appear in the Catalog until the app is
  restarted. Plan only first, before any build.
- (b) The "Mark ready" toast still says the app doesn't write the All sheet
  ("Copilot moves the row across"); out of date since Promote and the direct
  write landed. *(Fixed; on main since 24 Oct 2026.)*
- (c) The Add Coin gallery has no per-photo Replace button. *(Closed 23 Oct 2026, on main: Add Coin uses Edit Coin's
  section, which has Replace.)*
- (d) A new obverse, reverse or receipt picked during a Staging edit shows
  its remove (✕) button only after the screen is redrawn. *(Photos closed 23 Oct 2026, on main; the receipt is unchanged.)*
- (e) Unified image chooser: C1 (coin screens) and C2 (Set screens) are on
  `main` (22 Oct 2026). Add Coin and the Staging-draft edit use Edit
  Coin's photo section, merged 23 Oct 2026 (closes (c) and (d)). Left:
  C4 (Add Set, Wishlist), C5 receipts only with his go-ahead.
  HEIC picked through Files is unverified on a real phone.
- (f) The Catalog Finish filter groups (`CATALOG_FINISH_GROUPS`) are fixed in
  code; the app does not load `Lookup_Finishes`.
- (g) *(Done: built 30 Oct 2026 on `claude/value-fallback-melt-label`, HELD for Ray's
  merge go-ahead; see docs/ref/LEDGER.md "Value fallback: melt is labelled" and the star
  rule in docs/ref/ALBUMS.md.)* Melt is labelled "melt" with the spot-price date (melt below face counts as face, not melt) on
  detail, share and Ledger; the Ledger keeps Valued, Melt and face-only apart; Sets get a
  Variety line (default "Standard"); album star: filled = Key Date / Key Variety, outline
  = Semi-Key Date, none otherwise. Display only.
- (h) Graded/reholdered coins: capture design (cost basis, grader, cert,
  slab photos, location). Questions-first.
- (i) The in-app image viewer's back gesture is unverified on a real
  phone/tablet.
- (j) Deferred receipt / Edit Coin bugs: a receipt file is left without a
  row if the Receipts append fails; the receipt index picks first-row versus
  last-row inconsistently; Edit Coin still shows a stale "Session-only"
  note; the receipt viewer can show an old copy after a same-name
  replacement.
- (k) Deploy workflow: upgrade its actions to Node 24 versions.
- (l) *(Done: C2 of "Photos wait for Save", merged to main 27 Oct 2026.)* Close Drawer / navigate should warn on any unsaved edit (all fields,
  Edit Coin and the other edit screens), not only Back. Today `navigate()`
  leaves silently and the edits (photo labels included) are discarded.
  Next branch, plan first (Ray, 23 Oct): the same "Discard unsaved edits?"
  dialog as Back.
- (m) *(Done: C1 of "Photos wait for Save", merged to main 27 Oct 2026.)* Photos on the
  edit screens wait for Save, the same as Add Coin's draft mode, instead of
  saving on capture; Discard undoes them; Manage Photos gets ONE Save button
  for photos and labels together (replacing "Save labels").
- (o) *(Done: C2 of "Photos wait for Save", merged to main 27 Oct 2026.)* Same next branch as (l) and (m) (Ray, 24 Oct): Close Drawer on Add
  Coin must warn before throwing away a half-entered coin. Today
  `navigate("addcoin")` resets the form (`resetAddCoinForm()`) and leaving
  by any route discards whatever was typed or picked, with no warning.
- (n) *(Done: C3, "C3: open-ended Package / OGP", merged to main 27 Oct
  2026.)* Package/OGP becomes open-ended
  (any number of photos, each labelled, e.g. Closed / Open) instead of a
  Front/Back pair. Needs a plan for the existing Front/Back Package photos
  (PhotoType `OGP_Obverse`/`OGP_Reverse`, Add Set's whole-set mirror, the
  Set's flip-photo fallback `setFlipPhotoUrl`).
- (p) Its own small branch, after C3 (Ray, 24 Oct): retire the All-sheet
  photo fallback. The app still reads the old flat All columns (Obverse,
  Obverse_Original, Reverse, Reverse_Original, Photo3, Photo4, OGPPhoto) when
  a record has no Photos row (`legacyStoredRowsFor`, `storedPhotoFilename`'s
  fallback, `legacyFallbackFilenameFor`), and the Remove dialog's note "this
  coin also has a photo recorded in the old All sheet columns". The 3 Oct
  workbook copy shows all 41 filenames in those columns also have Photos
  rows, so the fallback looks unneeded. Recheck against the CURRENT workbook
  first. The All columns themselves stay as history (never cleared).
- (q) After C4 (Ray's Q2, 26 Oct): once C4 moves Add Set onto the open-ended
  Package list, and a workbook check shows no OGP_Obverse / OGP_Reverse
  Photos rows remain (some DO exist on TEST today — AY-00463, 22 Oct — so
  they need moving to OGP first, or the mapping stays), retire the old-style OGP read mapping (`PACKAGE_TYPES`'
  `ogp_obverse`/`ogp_reverse`, `packageEntriesInOrder`'s Front/Back order,
  `packageDisplayLabel`, `packageSide` on Replace, `setFlipPhotoUrl`'s
  OGP_Reverse lookup).
- (r) The Edit Set saving and split build (queued, not started; 3rd in
  Ray's 27 Oct order). Order inside it: Edit Set saving (ALL fields, with a
  concurrent-edit conflict check like Edit Coin's snapshot), then splitting
  out child coins, then partial sales (selling part of a Set). Two items
  for it (Ray, 26 Oct): (1) "Coins in this Set" shows the Set's coin count
  and lists its coins, probably from DB_SetComposition; each line is replaced
  by Ray's own child coin once that coin has been split out. (2) Set notes:
  Edit Set's Notes box reads and writes the session-only details lookup, not
  the Set's All.Remarks (which its page shows), so it opens empty and its
  Save never reaches the page; and a Set's "Fun Fact" is always blank live
  (it looks in DB_Coins). Proposed labels, pending Ray: "My notes" (editable,
  All.Remarks) on coins and Sets; "Catalogue notes" (read-only: DB_Coins.Notes
  for a coin, DB_Sets.Notes for a Set); "Fun Fact" (read-only: DB_Coins.FunFact
  for a coin; for a Set, DB_Sets.KeyNotable or History, Ray to choose, since
  DB_Sets has no Fun Fact column). See "Round 2 after Ray's tablet test of
  `0a0cbd1`" for every column read today. **Ray's answer (26 Oct, round 3):
  yes to these labels, built in this build. A Set's Fun Fact display is
  hidden entirely (Set page and Edit Set, demo data included) until a real
  source exists.**
- (s) *(Folded into (aa) below, Ray 30 Oct 2026: do not plan it separately.)*
  "Keep the old photo?" on Replace of a fixed-name slot (Ray, 27 Oct;
  replaces the earlier `_Replaced` folder item). Applies to Obverse, Reverse,
  Holder front/back and a Set's whole-set / sub-group pairs. On Replace the
  user picks Keep as Reference / Keep as Other / Don't keep; like every
  other photo edit, nothing happens until Save. At Save the old file is
  moved out of the way FIRST: renamed to the chosen type's next numbered
  name with its own new Photos row, or (Don't keep) deleted to the OneDrive
  recycle bin. The new photo then takes the plain convention name: uploaded
  under a temporary name first, then renamed, so a failure never leaves a
  row pointing at a missing file. Guard against a cached old picture
  showing under the reused name (the session photo cache is keyed by
  filename). Plan first; until then Replace keeps today's free `_02` names.
- (t) *(Done: merged to main 28 Oct 2026, see "Receipts never overwrite".)*
  Receipts never overwrite (Ray, 27 Oct, his Q1 on the Replace fix), its
  own small branch. Today `commitReceiptCapture` uploads a new filename not
  on the Receipts tab with replace, and a photographed re-capture
  `{ID}_receipt.pdf` that IS on the tab skips the upload and keeps the old
  file. Same `NO_OVERWRITE` / free-name approach as photos.
- (u) Data fix, outside the app (Ray / Copilot): PhotoID PH-00129 is on two
  rows on TEST (AY-00212 Slab_Obverse and Slab_Reverse, 18 Oct). Also check
  LIVE's Photos tab for duplicate PhotoIDs: `main` / LIVE could mint them
  (id minted before the table lock, no session floor) until the 27 Oct
  merge. Nothing in the app writes this fix.
- (w) *(Done: merged to main 30 Oct 2026, code `7b56955` plus the undo `4589b46` and the failed-save cleanup `960634d`; see "Staging photo replace keeps the old file".)* Staging photo
  replace used to delete the old file; it now keeps it, like receipts.
- (x) Edit Coin receipts should match Add Coin (Ray, 28 Oct, his Q1/Q2 from
  the receipts retest, both already on `main` before the 28 Oct merge): the
  receipt slot moves into Purchase Details, waits for Save like photos do,
  shows the stored receipt (`prepareReceiptSlotForRecord()` only clears the
  slot today), and the coin's detail screen refreshes after a receipt save
  (`LIVE_RECEIPTS` is fetched once per session and `commitReceiptCapture()`
  never updates it; photos have `syncStoredPhotoIndexUpsert`, receipts have
  no equivalent). Backlog only, not built.
- (y) The Staging-edit receipt slot needs the shared chooser (Ray, 28 Oct):
  it still has the old camera / gallery / ✕ icons, with no preview, no
  Replace and no Files button. Backlog only, not built.
- (z) Save changes only when something changed (Ray, 30 Oct 2026, found in
  his tablet retest). Save is enabled after a Replace even when an undo
  (✕ -> "Put it back") has returned the form to exactly its loaded state, and
  the leave guard (the "Discard unsaved edits?" dialog) likely still counts
  that Replace too. Fix both together: Save, and the leave guard, should
  count only real differences from what was loaded. Applies to every edit
  form: Edit Coin, Edit Set, Manage Photos and the Staging-draft edit.
  Backlog only, not built.
- (aa) Keep or Delete prompt on every Replace (Ray, 30 Oct 2026; agreed
  design, to be planned later as ONE task; (s) is folded into it). Not built.
  - Scope: every Replace of a photo or a receipt, owned records and Staging
    drafts alike. The user chooses Keep or Delete for the old file.
  - Kept files go to ONE "Replaced" folder (not left beside the live files).
    Cleaning that folder up is done by the user through the OneDrive folder
    link (the Staging Review link pattern, verified on PC and tablet).
  - Staging folders: delete the draft's whole Staging folder as the very LAST
    step of a fully successful promotion, and add a clause saying so to the
    Promote dialog. Check Force Add separately: it writes a row without a
    CoinID and keeps the card, so it may need a different rule.
  - Check whether `_Docket` / `docket.json` is still used before relying on
    the Staging folder layout in this task.
  - One-time cleanup of the old promoted Staging folders already on OneDrive
    (the ones left behind by every promotion so far).
  - Plan first, questions first; it touches Replace, promotion and cleanup.
- (v) Note only, no action (Ray, 27 Oct): on LIVE, a Replace or Recrop of a
  fixed-name photo before the 27 Oct merge uploaded over the old file
  (`{ID}_slab_reverse.jpg`, `_obverse_cropped.jpg`, `_obverse_original.jpg`
  …). The overwritten pictures exist only in OneDrive's version history for
  those files.

## Startup connection, docket.json, and the no-demo-data rule (04 Oct 2026)
Built on `claude/dreamy-turing-2vyo06` (commits `018c29d`..`9a4d70c`, plus this
documentation commit), live-tested by Ray on desktop Chrome (normal load, a
request-blocked load reaching the 25-second error screen, the request count,
and Retry loading in place), and fast-forwarded to `main` on his go-ahead.
The regression suite for all of it is `tests/verify_startup_connection.js`.

### Startup connection behavior
- **Timings** (named constants, retunable in one line): per-request timeout
  `SPLASH_REQUEST_TIMEOUT_MS` = 12 s on each of the nine sheet reads and the
  Docket read; overall splash wait `SPLASH_DATA_TIMEOUT_MS` = 25 s before
  "Couldn't connect"; `SPLASH_SLOW_NOTICE_MS` = 5 s before the status reads
  "Still connecting…"; Docket grace `SPLASH_DOCKET_GRACE_MS` = 2 s. The 25 s
  must stay above 2 × 12 s so one request that times out still leaves room for
  a fresh attempt. Tests shorten these via `__setSplashTimingsForTest()`; the
  backoff scales with a shortened overall wait so they stay fast.
- **Root cause of the original "Couldn't connect, Retry doesn't help"**:
  nothing had a timeout, and `ensureLiveNavDataFetch()` / `loadDocketQueue()`
  hand every caller the same in-flight promise, so one Graph request that
  never answered held every later attempt, Retry included, until a reload.
  `withRequestTimeout()` now puts token + request + body under one
  AbortController deadline; a timeout is an ordinary failure and failures are
  never cached, so the next attempt is a fresh request.
- **Retry** aborts every in-flight startup read (`abortStartupRequests()`),
  drops both shared in-flight promises, bumps their generation counters
  (`liveNavFetchGeneration`, `docketQueueGeneration`,
  `liveNavOptionalGeneration`) and starts fresh. A superseded fetch settling
  later touches nothing. Already-loaded data is never cleared.
- **Late data clears the error box**: an attempt still in flight when the
  error shows is honoured, and the 400 ms check keeps looking for arrived data
  (without sending anything), so the splash clears on its own.
- **Backoff**: the 400 ms check only SENDS a fresh set of reads when nothing
  is in flight, the backoff since the last send has elapsed, and fewer than
  `SPLASH_MAX_ATTEMPTS` (6) have gone out. `SPLASH_BACKOFF_MS` = 2 / 4 / 8 s
  (last repeats), measured from each send. A fast-failing network now sends 5
  attempts / ~50 requests in the 25 s window instead of 62 / ~620 (Ray
  measured 626 before the fix). Retry starts at once with a new schedule. A
  429/503 Retry-After is honoured (`noteRetryAfter()`); it is inert if Graph
  doesn't expose that header to the browser (not verified).
- **Missing non-essential sheets** (Photos, Receipts, Albums, Wishlist) no
  longer block startup and no longer stay missing: once core data is loaded,
  the next `ensureLiveNavDataFetch()` call (the next navigation) refetches
  ONLY the missing ones in the background (`refetchMissingLiveNavSheets()`),
  with the same 12 s deadline, and merges them in. Core sheets (All, DB_Sets,
  DB_Coins, Lookup_MetalContent, Lookup_Graders) are unchanged.
- **Docket fast-fail**: once core data has loaded and the 2 s grace has
  passed, a failed Docket read counts as ready and the splash clears. The
  failure is never cached. The drawer fob and the Research count show **"?"**
  (unknown), never "0"; the hub re-renders on its own when a later read
  succeeds (`docketCountUnknown`).
- `getJson()` reads the body as bytes first and throws a distinct
  `EmptyBodyError` (status + byte length) for an empty body; the Docket read
  logs `Docket queue read: HTTP <status>, <n> bytes` and shows it in the
  splash's diagnostic detail.

### docket.json handling (`{stagingBase}/_Docket/docket.json`)
- **Valid empty content**: `{"type":"docket-queue","version":1,"entries":[]}`
  (the app also writes `updatedDate`; on read only `type` and `entries` are
  checked).
- **Missing file (404)** = empty queue (first run); the first add creates it.
- **0-byte file** = a failure: count shows "?", adds are kept in memory only
  (Browse Edit toasts "couldn't save it to the Docket file"), and the app
  **never repairs it**. Ray's case (04 Oct 2026, `_Testing` COPY): the file had
  been emptied by hand in OneDrive. No app code path can write an empty file
  (the only writer, `saveDocketQueue()`, always sends a stringified queue).
  Fix by deleting the file or replacing it with the valid empty content above.
  Possible later improvement (not built): on an empty body, check the item's
  `size` via Graph metadata — 0 means genuinely empty (treat as an empty
  queue), >0 means a dropped transfer (keep treating as a failure).
- **Known risk (backlog)**: a file that parses but has the wrong `type` (e.g.
  `{}`) is read as an empty queue, and the next add **overwrites** it.

### Standing rule: no demo or filler data in a live session (Ray)
The app runs on real data (today the `_Testing` folder / COPY workbook). In a
live session NO demo or filler data is shown unless it stands in for a
feature that is not built yet. `liveDataMode()` classifies the session:
`"live"` (MSAL loaded and an account signed in), `"offline"` (MSAL never loaded
or live data off — the offline mockup, demo data by design), `"signed-out"`
(MSAL loaded, no account yet; transient before the sign-in redirect; left
showing the mockup). **Albums comply**: in a live session `activeAlbums()` is
empty until real albums load, the Albums screen shows "Albums are still
loading…" / "Couldn't load albums; will try again when you reopen this
screen", and the Belongs-to chip, the book and Add Coin's "Assign to Album"
show nothing meanwhile. `FAKE_ALBUMS` and the offline mockup are untouched.

**NEXT branch's scope — the remaining demo data in a live session:**
- (a) Placeholders for unbuilt features: Wishlist screen (`FAKE_WISHLIST`; no
  live Wishlist screen read), Grading Help (`FAKE_GRADING_HELP` *(removed Oct 2026; it could never match)*; guidance not
  written), pending-coin banner (`FAKE_PENDING_COIN`, null; reconciliation not
  built), Add Coin Error dropdown (`FAKE_LOOKUP_ERRORS`, 8 of 42; no live
  Lookup_Errors read) *(fixed Oct 2026, held: see "Add Coin Error dropdown:
  real Lookup_Errors list")*.
- (b) Built features that fall back to demo data: the `activeCoins()` /
  `activeDbSets()` / `activeDbCoins()` / `activeLookupGraders()` fallbacks
  before core data loads or when it fails; **`FAKE_COIN_DETAILS`** (Seller,
  Purchase Date, Receipt, Notes, Fun Fact fill blanks on real coins whose IDs
  collide — `renderBrowseDetailPanel`/`renderDetailAccordions`,
  `catalogFunFactFor`, `showBrowseEditViewInner`); **`FAKE_GALLERIES`**
  (`galleryFor()` seeds demo photo entries by ID); **`FAKE_SET_FACTS`** (Set
  Details facts by ID); **`resolveCoinSetLink()` *(removed Oct 2026)*** (it always searched
  `FAKE_COINS`; gone with the SetID chip, so no longer a demo-data path); `FAKE_SET_CHILDREN` (second tier of `setChildrenFor()`);
  `FAKE_METAL_CONTENT` (before live coins load); `FAKE_LOOKUP_GRADERS` read
  directly by the grader lists (a static copy of the real table).
  `FAKE_GRADES` and `FAKE_DENOMINATIONS` are static copies of real reference
  tables, not filler.
- **Ray's live finding**: real coin AY-00001 shows a demo Fun Fact, demo
  "yours" Notes and demo gallery entries, while the workbook has blanks there.

### Live-test technique
Chrome DevTools request blocking is now under **"Request conditions"** and
needs a valid URL pattern such as `https://graph.microsoft.com/*`. A bare
`*graph.microsoft.com*` pattern is invalid and blocks nothing.

### Backlog found during this work (not built)
- An open album book can mix two albums after a live album-list refresh that
  changes positions (the book holds a list position, not the album itself).
- Add Coin's "Assign to Album" selection resets when Albums/Wishlist arrive late.
  *(Fixed by `0a74901`, Oct 2026: `populateAssignAlbumOptions` keeps the current
  choice across a rebuild.)*
- The Docket screen does not re-render when Photos arrive late.
- A full-screen photo viewer opened from a demo gallery entry with no image
  gets stuck: Escape and scrolling don't close it.
- Navigation fetches (Catalog, Albums, Ledger) do not back off after a failure.

## Belongs to: Set membership from OriginSetID only (Oct 2026, merged to main)
Built on `claude/belongs-to-origin-set-only` (`04ae654`..`79fdc97`), merged to
`main`. Suite: `tests/verify_belongs_to_origin_set.js` (22).
**Supersedes every mention of `resolveCoinSetLink()` *(removed Oct 2026)* / the SetID "belongs to"
chip elsewhere in this file — that function is REMOVED.** Those mentions are
tagged *(removed Oct 2026)* and are history only.
- **Rule (Ray's):** `SetID` is the catalog id of the product a coin was issued
  in, NOT membership. Membership comes only from the child's `OriginSetID`
  (= the parent Set's CollectionID). Matching SetID produced three live bugs:
  AY-00463-B showed its Set twice; standalone AY-00706 linked to AY-00463; and
  twin owned Sets sharing a SetID (AY-00463/AY-00741, AY-00611/AY-00711)
  linked to each other.
- **Now:** at most ONE Set chip, from OriginSetID (`resolveChildParentSet`).
  A Set row never gets a Set chip from SetID.
- **Plain-text remark, not a link** (`setIssueRemarkFor`, `.linkage-remark`):
  a coin (not a Set) whose SetID names a set it isn't in shows "Issued in
  <set> (purchased separately)". Skipped when the SetID kind (`setIdKind`,
  read from the `S-YYYY-XX-##` prefix) is **AL** (album) or **AS** (assembled
  set), and when the OriginSetID parent carries that same SetID. Name comes
  from DB_Sets, then an owned Set row, else the SetID itself
  (`setNameForSetId`). A coin can have the chip AND the remark (in one Set,
  issued in another).
- Same renderer (`renderLinkageChipsInto`) on Browse detail, Edit Coin and
  Edit Set.
- **Unchanged:** the Sets completeness checklist still finds ownership by
  SetID (`ownedSetForSetId`) — out of scope.
- **Known, not fixed (out of scope):** a sold child still lists under its
  parent's Contents; Stats counts a Set plus its children; the checklist opens
  only the first of twin Sets sharing a SetID.

## Maintenance
Update this file only when something changes that a future session would actually
need to know to avoid re-doing work or making a wrong assumption — a new
architectural decision, a schema/naming convention change, a scope boundary, or a
change to how a feature is supposed to work. Don't update it for routine task
completions (a bug fix, a component built to existing spec, a screen finished per
existing spec) — just do the work. If unsure whether something rises to that bar,
ask before updating rather than updating by default.

## "end session" means: update this file first (standing rule)
**SUPERSEDED by "Standard end-of-work pattern" at the top of this file.** In
particular, the docs fix now goes to `main` as one docs-only commit (not "the
current branch"), and pending next steps / session notes are NOT written here:
the coordinating Claude keeps those.

## End-of-task reporting (standing rule)
When finishing any task (bug fix, feature, batch), give Ray a copy-paste-able
plain-text summary block (one fenced code block; see rule 3 of "Standard
end-of-work pattern" at the top of this file): what changed, how it was verified, and — critically —
any open questions or concerns worth a second look (an ambiguous instruction,
a tradeoff made without explicit sign-off, a side effect on something else,
an unresolved item carried over from a prior task) so the two of you can
deliberate before anything moves further. Don't skip the questions section
just because nothing came up — say so explicitly rather than omitting it.
This applies on top of, not instead of, the CLAUDE.md update rule below.

## Merge policy (standing rule)
Auto-merge feature branches to main at the end of a task by default — don't wait
for Ray to explicitly ask each time. **Exception:** large/architectural/
cross-cutting work (e.g. the CollectionID-reservation system) stays held on its
branch — wait for Ray's explicit go-ahead before merging that class of work, same
as before this policy existed.

## Clarifying-question format (standing rule)
Never use an interactive multiple-choice question tool/prompt on Ray. Always ask
clarifying questions as plain, copy-pasteable text in the chat response instead —
he discusses them with Claude (chat) separately and brings back answers to all of
them at once, which an interactive per-question picker doesn't allow for.

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

## Regression suites are COMMITTED (locked in — supersedes the scratchpad convention)
`verify_*.js` suites live in **`tests/`, in the repo**, and are run with
`npm test`. This **supersedes the long-standing "scripts live in per-session
scratchpads" convention** referenced throughout this file — every earlier
mention of that convention is history, not current practice.

**Why it changed.** A suite that cannot be re-run is not a regression suite;
it is a one-time acceptance check. It validates the session that wrote it and
protects nothing afterward. The cost was real, repeated, and documented here
several times over: the photo-gallery-crop branch could not re-run anything
and substituted a nav smoke check; there is still a tracked item to *rebuild*
a suite already written once (self-sized at 60–100 assertions,
half-a-day-to-a-day); assertion counts climbing 653 → 685 → 748 were
discarded wholesale at session boundaries. The Add Coin Phase 1 build hit it
again — ~750 assertions of prior coverage unavailable — and still found three
real bugs, with no way to know what the lost coverage would have caught in
the same code.

**This does not weaken the no-build/self-contained posture.** That rule is
about the SHIPPED artifact: no outside dependencies; repo files beside
app.html are allowed (`vendor/pdfjs/` is the first — see "Receipt PDFs:
pdf.js on demand"). Test tooling is dev-time and `node_modules/` is
gitignored. **Correction:** GitHub Pages does NOT ignore `tests/`,
`docs/`, `package.json` or this file — the deploy workflow uploads the whole
checkout, so they are publicly served. Harmless, but don't put anything
private in the repo on the assumption that it isn't. (MSAL still loads from
the jsdelivr CDN — the one existing outside dependency, see Azure / Entra.)

**Honest scope: the value accrues to coding sessions, not to Ray.** His
workflow is ZIP → Notepad → `python3 -m http.server`; he is not expected to
run `npm test` and nothing asks him to.

**Layout:**
- `tests/harness.js` — browser resolution, page setup, the `ok()` assertion
  helper, automatic page/console error collection, and `defineSuite()`.
- `tests/verify_*.js` — one file per feature area. Auto-discovered; adding one
  needs no registration step.
- `tests/run-all.js` — `npm test`. Runs every suite, prints one total, exits
  non-zero on any failure or uncaught page error (verified in both the
  aggregated and standalone paths).

**Three rules worth keeping:**
- **Never hardcode a browser path in a suite.** Playwright's default
  resolution cannot be relied on — the installed version pins a build number
  that may not be what a sandbox pre-installed (verified: default launch
  failed looking for build 1234 while `/opt/pw-browsers` held 1194). The
  harness resolves it in one place: `CHROMIUM_PATH`, then the newest
  `chromium-*` under `PLAYWRIGHT_BROWSERS_PATH`, then a system Chrome, then
  Playwright's own default.
- **A stale suite is worse than none** — it gets either spuriously failed and
  ignored, or quietly weakened to pass. This project's existing discipline
  (assertions "updated to follow a real design change, not weakened") is the
  standard to hold.
- **Every new suite uses the shared check helper and starts with a must-fail
  self-check (standing rule, Ray, 26 Oct 2026).** The harness gives each
  suite `check(label, cond, data)` (label first; a non-string label is
  itself a failure) and `selfCheck(fn)`. A new suite's first line is
  `const ok = check; selfCheck(ok);`: one deliberately false check that must
  fail (counted as a pass only if it did) and one true check that must pass.
  Reversed check arguments have made a brand-new suite pass everything
  twice; with the self-check such a suite fails by name instead.

**Only the Add Coin Phase 1 suite is committed so far** (69 assertions).
Retro-rebuilding the older suites remains the separate tracked item it
already was — but it now has somewhere permanent to land, so it can be
chipped at incrementally instead of needing one big rebuild.

## Hard constraints
- Free tier only. No paid Azure resources, no third-party automation platforms.
- No backend server — static HTML/JS + Microsoft Graph API only.
- Excel workbook in OneDrive stays the source of truth, co-managed with Microsoft
  Copilot in separate Excel sessions between coding sessions.
- Mobile-first — Ray mainly uses a Samsung S25 on Samsung Internet, which has real
  browser quirks (see below). Desktop/tablet also matter, especially for Albums.

## Current live files
- `salty224.github.io/coin-collection-app/` — GitHub Pages root
- `index.html` — original connection test page (sign in / read / write test)
- `stage.html` — working "Add New Coin" staging form (photo capture → OneDrive
  Staging folder). Confirmed working end-to-end. **Do not break this.**
- `fonts/` — self-hosted Cormorant Garamond (600/700) and Caveat (600/700)
  woff2 files, latin subset only. **Locked in: fonts are self-hosted, not
  loaded from the Google Fonts CDN** — the CDN request was seen to render
  differently across devices (Android tablet vs. PC), most likely a
  CDN-blocking/content-blocker issue on one device and not the other (same
  category as `alcdn.msauth.net` being blocked for MSAL — see below), causing
  a silent fallback to a system font on just that device. Self-hosting removes
  the network dependency entirely so rendering is consistent regardless of
  what a given device blocks. If a font ever needs a new weight/family, fetch
  the woff2 from Google Fonts' CSS API once and commit it here rather than
  re-adding a CDN `<link>`.
- `manifest.json` + `icons/` — PWA install support for `app.html` only (not
  `index.html`/`stage.html`). See "Installable app (PWA)" below.

## Installable app (PWA) — locked in
`app.html` links a `manifest.json` (`display: "standalone"`, dark
background/theme color matching the app's own `--bg`/`--gold` tokens) plus
`icons/icon-{192,512}.png` (tight-fit) and `icons/icon-maskable-{192,512}.png`
(content kept within Android's ~80% maskable safe zone) so it can be
"installed" via Android's home-screen add flow — this is what actually
removes the browser's own address bar/nav chrome; nothing about how the
app is loaded/hosted changed otherwise.
- **Per-device, not automatic.** Standalone/no-chrome display only applies
  when the app is launched from a home-screen icon added via Chrome/Samsung
  Internet's "Add to Home screen" (or "Install app") menu action — opening
  `app.html` in a normal browser tab or from a bookmark always shows the
  usual browser chrome, manifest present or not. Ray has to do this once per
  device (phone, tablet) to see the effect; there's no way to force it from
  the page itself.
- **Icons are self-generated placeholders** — a simple gold coin-disc
  monogram ("SC"), rendered once via a local Playwright screenshot script
  (not committed — one-off tooling, not app code) rather than pulling in an
  image library or external asset. Matches the app's own coin-disc/drawer-fob
  gold gradient treatment. Fine as a real icon, not just a stand-in — but if
  Ray ever wants a different icon (e.g. an actual coin photo or a redesigned
  mark), just swap the four PNGs in `icons/` and nothing else needs to change.
- **`start_url`/`scope` are relative (`./app.html`, `./`)**, so this works
  correctly regardless of whether the repo is served from the GitHub Pages
  root or a subpath — no hardcoded domain.
- **`index.html`/`stage.html` are NOT covered by this manifest** — a home
  screen icon installed from `app.html` only ever launches `app.html`
  standalone; those two pages still open in a normal browser tab/chrome if
  visited directly. Extending this to them would be a separate, deliberate
  decision, not a default.
- **No service worker** — this is manifest/icons only, for the standalone
  display mode. No offline caching, no background sync, nothing that would
  need reasoning about stale-content/update behavior. If offline support is
  ever wanted, that's a distinct, larger feature decision, not implied by
  this one.

## Azure / Entra config
- Client ID: `bf9aaf28-a5e1-4eed-a006-15f03146693b`
- Tenant: `consumers` (personal Microsoft accounts only)
- Authority: `https://login.microsoftonline.com/consumers`
- MSAL: use `loginRedirect`, not popup (popup breaks on mobile after a canceled
  attempt). Load MSAL from jsdelivr CDN, not the default Microsoft CDN
  (`alcdn.msauth.net` is silently blocked by a browser extension Ray has).
- Redirect URIs must be registered per page/route in Entra. Registered so far:
  `index.html` → bare `https://salty224.github.io/coin-collection-app/`;
  `stage.html` → its own `.../stage.html`; `app.html` → **both**
  `http://localhost:8791/app.html` (local dev) **and**
  `https://salty224.github.io/coin-collection-app/app.html` (production —
  confirmed registered; superseded the earlier "no production redirect URI
  exists yet" note). `app.html`'s own `redirectUri` is derived at runtime
  from `window.location.origin + window.location.pathname` rather than
  hardcoded to either one — see "Real-Graph flags always on; WRITE_TARGET
  is the actual safety boundary" below for why a single hardcoded path
  can't cover both (the two launch modes have different paths, not just
  different origins).

### Auth: ONE shared MSAL instance (locked in — hard rule)
**`app.html` has exactly one `PublicClientApplication` (`graphMsalInstance`)
and exactly one `handleRedirectPromise()` call. Never add a second of
either.** All Graph features — reference images, live nav data, the Add Set
write layer, the Browse Edit write layer — share it.

**Why this is a rule and not a preference.** There used to be three separate
instances, one per feature, each with a comment justifying the split as
"don't couple independently-flagged features." That reasoning was wrong
about how MSAL works. All three used the same clientId, authority,
redirectUri and `cacheLocation: "localStorage"`, and **MSAL keys its browser
storage by clientId** — so they were never isolated. They shared one token
cache, one `interaction_in_progress` guard, one PKCE verifier and one
request-state entry, and they overwrote each other's.

With one flag on it worked fine. With **two or more on it failed
completely** — Microsoft's generic "We can't sign you in right now", the
page reloading repeatedly, sign-in never completing, surviving a full
restart and a storage clear (nothing about it was stale state). Two
mechanisms, both real:
- every instance called `handleRedirectPromise()` at load, racing to consume
  the single redirect response in the URL hash — the first cleared the hash
  and the temp cache, the rest failed state validation and cleared more
  state on the way out;
- two features independently called `acquireTokenRedirect()` moments apart
  (live-nav's fetch fires from the first Catalog render, the write layer's
  from Edit's snapshot load), each stamping over the other's stored request
  state, so whatever came back from Microsoft matched nothing in storage.

**This is exactly the config the Browse Edit live run needs** (live nav data
for real Catalog/DB_Coins reads + the write layer), so it was fully
blocking. It survived every earlier pass because every earlier pass had
exactly one flag on.

**How feature isolation actually works now** — in the flags and the token
getters, not in duplicate auth instances:
- `getReferenceImageToken()` / `getLiveNavToken()` / `getWriteToken()` each
  check their OWN flag first and return `null` when off, so a disabled
  feature still cannot touch Graph. That check is now the real enforcement,
  since the instance no longer carries that meaning.
- `acquireGraphToken()` is the single serialized acquisition point: one
  in-flight request shared by all callers, and **at most one redirect per
  page load** (`graphRedirectStarted`). This matters beyond the multi-feature
  case — `ensureLiveNavDataFetch()` alone fires four parallel sheet reads,
  which previously meant four independent redirect attempts.
- `GRAPH_SCOPES` is one set for the one instance: `Files.ReadWrite` when a
  write feature is enabled, otherwise `Files.Read`. Requesting *different*
  scope sets per feature against one shared cache is itself a bug — MSAL
  only serves a cached token whose scopes cover the request, so mismatched
  sets cause silent-acquisition misses and extra interactive prompts.
- Every flag now lives in one block immediately above the instance, because
  it's constructed at load time from them (a `const` referenced before its
  declaration is a TDZ error).

**Honest note on scope narrowing:** the old per-feature `Files.Read`
instances were described as giving read-only features a narrower scope. That
was already illusory — they shared one clientId-keyed cache, so a
`Files.ReadWrite` token obtained by the write layer was sitting in the same
storage the "read-only" instances read from. The enforcement that actually
holds is in code (`fetchReferenceImageBlob()` hardcodes `method: "GET"`,
etc.), not in the scope string.

Regression-guarded by `verify_msal_single_instance.js` (22 assertions),
which injects a fake `msal` global — the real one can't load in the
sandbox — and asserts instance count, redirect-handler count, one redirect
across six concurrent token requests, shared silent acquisition, and that
nothing is constructed at all with every flag off.

## Real Graph API reads (locked in — first real network/auth code in app.html)
`app.html` was pure `FAKE_*` in-memory mockup data until the Reference Images
feature below needed to check Ray's actual OneDrive — this is still the
**only** real Graph code in the file; every Save button remains a stub (see
"What NOT to build" / hard constraints — nothing here writes anything).
- **SUPERSEDED — enabled by default now** (`const ENABLE_REFERENCE_IMAGES = true`).
  See "Real-Graph flags always on; WRITE_TARGET is the actual safety
  boundary" below for why and what changed (a dynamic `redirectUri` plus a
  now-registered production Entra redirect URI). The paragraph below is
  kept as history — it's still the accurate account of the incident that
  originally justified disabling this, and the guard-rail mechanism it
  describes (the two real choke points) is unchanged. The 7/15 localhost testing
  session hardcoded `redirectUri: "http://localhost:8791/app.html"` for local
  dev — there's no production redirect URI registered in Entra for `app.html`
  yet (see "Azure / Entra config" above). On the live GitHub Pages site this
  surfaced as **Albums appearing to hang/re-auth on load**: every coin render
  with no cached reference image (i.e. every render, since no real
  `ReferenceImages` files exist on OneDrive yet) called `hasReferenceImage()`
  → `ensureReferenceImageFetch()` → `getReferenceImageToken()`, found no
  cached MSAL account, and fell back to `acquireTokenRedirect()` — a real
  full-page navigation toward Microsoft sign-in with a `redirect_uri` Entra
  never registered for production. Albums hit this hardest (most coin discs
  per screen via `renderSlotCell()`), but Spotlight/Browse were equally
  exposed. The flag is checked at the two real choke points —
  `hasReferenceImage()` returns `false` immediately, and `ensureReferenceImageFetch()`
  (every caller's real entry point to a Graph/MSAL call) returns
  `Promise.resolve(null)` immediately — so no caller, present or future, can
  reintroduce this by skipping a check at its own call site.
  The shared MSAL instance also isn't constructed at all while EVERY
  real-Graph flag is off, not just left unused (superseded detail: this
  used to be a `referenceImageMsalInstance` of its own — see "Auth: ONE
  shared MSAL instance" above for why per-feature instances were retired).
  **Superseded — no re-enable step needed anymore**, since the flag ships
  `true`. To test locally: run a local server on port 8791 from the repo
  root (e.g. `python3 -m http.server 8791`) and load
  `http://localhost:8791/app.html` — the first coin render needing an image
  will redirect to a real Microsoft sign-in and back, using the already-
  registered localhost redirect URI. Nothing needs setting back before
  merging/deploying; the same flag value is correct in both places now.
- **Read-only, enforced in code, not just by scope.** `fetchReferenceImageBlob()`
  is the only function that calls `fetch()` against Graph for this feature; it
  hardcodes `method: "GET"` and requests the narrower `Files.Read` scope (not
  `Files.ReadWrite`, unlike index.html/stage.html, which need write for their
  own purposes).
- **Path is a hardcoded `CoinCollection/ReferenceImages/` prefix** — no
  dynamic/user-influenced path segment beyond the already-sanitized series key
  ever reaches the Graph call, and this never touches `CoinCollection
  (AI).xlsx` or any other OneDrive path. Graph itself has no folder-scoped
  permissions — `Files.Read` grants read access to the whole drive — so this
  boundary is enforced entirely by the calling code, not by anything Graph or
  Entra can restrict on its own.
- **MSAL bootstrap adapted from index.html's** — **superseded**: this feature
  no longer has an instance of its own, it shares the app's single
  `graphMsalInstance` (see "Auth: ONE shared MSAL instance" above). Same
  `clientId`/`authority`,
  `cacheLocation: "localStorage"` (MSAL's own token cache — the same narrow,
  intentional exception to the no-localStorage rule as the other two pages).
  `redirectUri` is `http://localhost:8791/app.html` — **local dev testing
  only**, registered in Entra as its own exact URI alongside index.html's and
  stage.html's (Microsoft's SPA platform config allows plain `http://` on
  `localhost`, no HTTPS needed). There's no explicit "Sign In" button on this
  page (unlike index.html) — `getReferenceImageToken()` tries
  `acquireTokenSilent` first and falls back to `acquireTokenRedirect` exactly
  like index.html's `getToken()`, but it's triggered lazily by the first coin
  render that needs an image rather than a click. Practically: the first time
  `app.html` loads locally with no cached session, the very first coin disc
  that needs a reference image will trigger a real full-page redirect to
  Microsoft sign-in; after Ray signs in, the redirect returns to
  `app.html` and normal rendering continues, retrying the fetch for real.
- **The whole feature degrades gracefully if MSAL itself never loads.** The
  jsdelivr `<script>` tag is a real external request, and this project has
  already hit exactly this class of failure once (`alcdn.msauth.net` silently
  blocked by a browser extension — see Azure/Entra config above). If `msal`
  never becomes defined, `graphMsalInstance` is `null` instead of
  throwing, and every function that needs it (`getReferenceImageToken()`,
  etc.) short-circuits to "no image available" rather than throwing — this
  was verified to matter: an earlier version threw uncaught at the top of the
  script when `msal` was undefined, which broke the *entire* app (all
  navigation, all still-fake functionality) since it happened before the rest
  of the script's function definitions ran. This one read-only feature must
  never be able to take the rest of the mockup down with it.
- **Image delivery: raw bytes → in-page blob URL, not
  `@microsoft.graph.downloadUrl`** — the download URL Graph returns expires in
  ~1hr, which would silently break a longer-running session; a blob URL
  (`URL.createObjectURL`) lasts the whole page lifetime instead.
- **Caching: in-memory only, keyed `{sanitizedSeriesName}_{obverse|reverse}`**
  (`referenceImageCache`) — never localStorage/sessionStorage (see "What NOT
  to build"), cleared on reload, fetched at most once per series+side per
  session. **Only a real answer from Graph (200 or 404) gets cached** — a
  fetch attempt that fails because there's no token yet (not signed in, mid
  sign-in-redirect) is deliberately left uncached so it retries for real once
  Ray actually signs in, rather than getting stuck showing the placeholder
  forever for whatever series happened to render first.
- **404 = "no reference image on file yet," same as the old boolean-false
  path** — not an error, not surfaced to the user any differently than before.
- **Lazy — fetches on first render of a given series, not eager on load.**
  `hasReferenceImage(coin, side)` (default side `"obverse"`) is the trigger
  point: a cache hit returns synchronously; a cache miss kicks off the real
  fetch in the background and returns `false` for that call. Splash screen is
  untouched by this — still the same simulated `SPLASH_SIMULATED_DELAY_MS`
  timer as before; that redesign is explicitly deferred until more of the
  real data-layer Graph calls exist.
- **Live self-update vs. picks-up-on-next-render, depending on call site.**
  `applyDiscContent()` (Spotlight, Browse grid cards, Browse detail) holds a
  real DOM element reference, so on a cache miss it attaches a one-time
  callback that swaps in the real image in place once the fetch resolves
  (checking `document.contains(discEl)` first) — no page-wide re-render
  mechanism needed. Albums' `renderSlotCell()` is string-templated
  (`innerHTML`), so it can only reflect whatever's already cached at render
  time — a slot whose image was still loading when the album page rendered
  shows the fallback until the album is re-rendered/reopened, same
  computed-once-at-open-time tradeoff as the album page's own chunk-size
  sizing. This is a known, accepted minor gap, not a bug to chase.
- **Real image replaces the old 🪙 stand-in glyph** (`applyRealReferenceImage()`
  sets `background-image` + `background-size: cover` directly on the disc
  element, inline, which wins over the `.coin-disc.reference-image` class's
  CSS `background` shorthand for that one property) — the class's muted
  ring/box-shadow styling still applies around it.
- **Storage convention changed — flat folder, no obverse/reverse
  subfolders**: `CoinCollection/ReferenceImages/{sanitizedSeriesName}_obverse.png`
  and `.../{sanitizedSeriesName}_reverse.png` (e.g. `Lincoln_Wheat_obverse.png`),
  superseding the earlier subfoldered `.../ReferenceImages/obverse/...` /
  `.../reverse/...` layout described in the original spec — see "Series-level
  reference images" below, which is the section this feature's fetch logic
  actually implements against.

## OneDrive folder structure
```
CoinCollection/
  CoinPhotos/            named {CollectionID}_obverse.jpg, _reverse.jpg, and (only if a
                           3rd/4th image is actually needed — slab label closeup, box,
                           etc.) _photo3.jpg, _photo4.jpg. Flat — no subfolder by
                           year/series/anything else.
  CoinReceipts/           named {CollectionID}_receipt.pdf, or timestamp-named for
                           batch receipts not yet tied to a coin — always a PDF now,
                           see "Receipt photos auto-convert to PDF" below
  Staging/{YYYYMMDD-HHMMSS}/   fallback landing zone when a direct Excel write fails
                                 — data.json + generic-named photos, collectionID left
                                 blank until reconciled
  CoinCollection (AI).xlsx
```
- **Upload naming** (Ray's side — no suffix typing, just what the app captures):
  `{CollectionID}_obverse.jpg` / `_reverse.jpg` / `_combined.jpg`.
- **Combined obverse+reverse in one image** (some PCGS TrueView shots, some seller
  photos): file the raw upload as `{CollectionID}_combined.jpg` in the Photo3 slot
  (Photo4 if Photo3 is already taken by something else) — supersedes the same-day
  decision that filed it as `_obverse.jpg`; don't build against that older version.
- **Crop commit (final, locked in) — automatic renaming, Ray never types a
  filename himself**: once the crop tool runs (on a normal obverse/reverse upload,
  or on a combined image — see below), the app:
  1. Preserves the untouched input as `{CollectionID}_obverse_original.jpg` (or
     `_reverse_original.jpg`) — **never deleted**. **One documented
     exception, Ray-approved: Purge deletes it too** (see "Former Holdings
     sub-catalog + Purge"). This rule exists to protect re-cropping an
     OWNED coin, which cannot apply to an exited one — and the raw is
     usually the larger file, so leaving it would orphan the bigger half.
  2. Writes the baked/cropped result as `{CollectionID}_obverse_cropped.jpg` (or
     `_reverse_cropped.jpg`).
- **No dedicated splitter tool for combined images.** Cropping a `_combined.jpg`
  into separate obverse/reverse files is just the existing single-photo crop tool
  run twice against the same `_combined.jpg` source — once framing the obverse
  region, once the reverse region. Output: `_combined_original.jpg` (preserved),
  `_obverse_cropped.jpg`, `_reverse_cropped.jpg`. Once both cropped files exist,
  update Obverse/Reverse per the display rule below and clear the "combined, not
  yet cropped" Remarks note.
- **Display rule (locked in): Obverse/Reverse should never be blank once a photo
  has been uploaded for that slot.**
  - Immediately on upload, before any crop exists: point to the `_original` file
    (shows the raw/uncropped photo — not ideal in the circular frame, but better
    than no photo at all).
  - Once the crop tool runs and a `_cropped` file exists: the column
    automatically switches to point there instead. Cropped always wins once it
    exists.
  - If a crop is ever deleted/reset: falls back to `_original` again rather than
    going blank.
- **New All-sheet columns: `Obverse_Original` and `Reverse_Original`**, positioned
  directly after `Obverse` and `Reverse`. They always hold the original filename
  regardless of crop state (so Ray can locate/re-crop an original later without
  hunting OneDrive by hand); `Obverse`/`Reverse` hold whichever filename is
  currently *displayed* (original or cropped, per the rule above).
- **This whole feature depends on the Graph API write layer being built first —
  none of it functions until that exists.** Confirmed: every Save button in the
  app is currently a stub (Add Coin, Browse Edit, Wishlist, Batch Receipt all just
  toast "nothing saved yet") — no OneDrive writes happen anywhere in the app yet.
  **Superseded:** Browse Edit now writes the workbook, and Add Coin's Phase 1
  layer writes Staging drafts + photos. This crop-commit naming is still
  unimplemented, but it is now Add Coin **Phase 2**'s to implement, not a
  wholly unbuilt write layer's.
  When that write layer gets built, this naming/renaming/fallback logic is what
  it needs to implement — not a separate future feature on top of it.

### Receipt photos auto-convert to PDF (locked in)
Every Receipt slot in the app — Add Coin, Browse Edit, Wishlist, Edit Set,
Batch Receipt, and Add Set's receipt slot, all six — auto-wraps a captured or
picked image (jpg/png) into a single-page PDF before it's treated as "the file
to store." **Naming convention updated**: `CoinReceipts/{CollectionID}_receipt.jpg`
is now `..._receipt.pdf` (see "OneDrive folder structure" above) — this
supersedes every earlier `_receipt.jpg` reference in this file.
- **Page size = the photo's own pixel dimensions, no forced US-Letter page, no
  re-flow.** A tall phone photo gets a tall page; a wide one gets a wide page.
- **Losslessly wrapped, not re-compressed.** A JPEG's original bytes are
  embedded byte-for-byte via the PDF's native `/DCTDecode` filter — zero
  re-encoding, so quality is bit-identical to the captured photo. A PNG has no
  equivalent native PDF filter, so it's decoded to raw pixels and re-packed via
  `/FlateDecode` (lossless deflate, via the browser's built-in
  `CompressionStream` — no library); inflating it reproduces the exact same
  pixels, the same lossless relationship a `.png` already has to its own raw
  data. EXIF rotation (JPEG only) is honored via the PDF page's own `/Rotate`
  entry rather than baking a rotation into the pixels, so the embedded bytes
  stay identical to the source while still displaying right-side-up. Only the
  four pure-rotation EXIF values are mapped; the four mirrored values (rare
  from a real camera) are left unrotated — a known, accepted limitation, same
  "not worth the tradeoff for a case that basically never happens" call as the
  no-dedicated-combined-image-splitter-tool decision elsewhere in this file.
- **If the picked file is already a PDF, it passes through completely
  unchanged** — no re-wrap, byte-for-byte the original file, just renamed to
  the standard `..._receipt.pdf` convention. Every Receipt slot's Library
  file input now accepts `application/pdf` alongside images so a PDF is
  actually selectable there (Camera inputs stay image-only, unchanged — a
  camera capture is inherently a photo, never a PDF).
- **No PDF library** — a minimal valid single-page/single-image PDF (a
  handful of objects + an xref table) is hand-written directly, matching this
  project's established self-contained/no-external-CDN posture (see the
  self-hosted-fonts and jsdelivr-not-default-MSAL-CDN notes above) rather than
  pulling in something like pdf-lib from a CDN for what's a small, well-
  defined file-format subset.
- **The on-screen preview is unaffected — still a live photo thumbnail**,
  exactly as before; the PDF wrap is a storage-format change, not a UI
  change. The one exception is the already-a-PDF pass-through case, where
  there's no image to preview at all — that slot shows a small "📄 filename
  attached" indicator instead (reusing the existing placeholder-icon element
  where one exists, or a small note appended into the photo-box where it
  doesn't, e.g. Add Set's plainer boxes) rather than leaving the box looking
  blank/broken.
- **Add Set's receipt slot is the one real end-to-end wire-up** — it already
  has a real write layer (`ENABLE_SET_WRITE_LAYER`), so its captured/picked
  file is prepared into a PDF Blob immediately and that's what actually
  uploads via `uploadDraftPhoto()`/`graph().uploadFile()` (Blob-safe already —
  confirmed `uploadFile(path, fileOrBlob)` never assumed a real `File`). The
  promotion file-move step (`plannedPromotionMoves()`) now derives the
  destination extension from the Staging filename itself instead of a
  hardcoded `.jpg`, so it stays correct regardless of what actually got
  stored there. **Add Set's whole-set photo (`wireAddSetPhotoSlot("whole", ...)`)
  is explicitly NOT a receipt and is untouched** — still a plain image, no
  PDF wrap; only the `"receipt"` key opts in (`isReceipt` param).
- **The other five slots (Add Coin, Browse Edit, Wishlist, Edit Set, Batch
  Receipt) have no real write layer yet — every Save there is still a stub**,
  per the hard constraint above. For these, the prepared PDF is stored in a
  new `receiptFiles` registry (keyed by the slot's preview element ID),
  ready-but-unconsumed — the same "build for a future consumer" posture the
  Add Set draft/reservation system already established. Nothing currently
  reads `receiptFiles`; whichever write layer eventually lands for these
  flows is what should consume it, at which point no further conversion work
  is needed — the PDF is already sitting there prepared.
- **A conversion failure never blocks the live preview or the capture
  itself** — wrapped in try/catch, same "a secondary feature can't take down
  the primary flow" posture as the reference-image MSAL-load-failure
  handling. Add Set's receipt slot falls back to storing the raw photo
  (renamed `receipt.jpg`) rather than losing the capture entirely if the
  wrap throws; the other five just leave `receiptFiles` unset for that slot.
- **Not verified against a real device/browser beyond this environment's
  Chromium** — `CompressionStream` (used for the PNG path) needs Chrome
  80+/Safari 16.4+/Firefox 113+; confirmed present in this environment's
  headless Chromium, but Samsung Internet's exact support window wasn't
  independently confirmed. Worth a real-device check, same "cannot verify
  from this environment" caveat as the Web Share API note elsewhere in this
  file — if it's ever missing on a real device, the try/catch means it fails
  quietly (no receiptFiles entry, or the Add Set raw-photo fallback) rather
  than breaking capture.

## ID schemes (locked in)
- CollectionID: `AY-#####` (5-digit). Child rows get `-A`/`-B`/etc., joined to
  their parent via the explicit `originSetId` field, never by parsing the
  parent ID string. **Superseded — the `-Set` suffix on parent rows is
  retired going forward** (resolved July 18 ProjectPlan item, "CollectionID
  Parent-Child Convention for Sets"): a new parent Set ID is always a plain
  `AY-#####`, whether or not it ever gets children, whether or not it's
  tracked coin-by-coin at all (see "Track coins individually" toggle under
  "Add Set + real write layer"). Confirmed nothing in the app depends on the
  `-Set` suffix being present — grepped the reservation module, the Add Set
  write layer, and every `FAKE_*` demo array; `reservationIdNumber()`/
  `collectionIdNumber()` already strip only the `AY-` prefix and ignore any
  suffix via `parseInt`, and child linkage was already `originSetId`-based,
  never suffix-parsed. Existing historical rows that already carry a
  `-Set` suffix are untouched by this — this only governs what the app
  itself generates going forward.
- CoinID: custom `C-YYYY-M-DDD-##`. Meant to be unique per DB_Coins row (one row
  per coin type/variant), but **this has only been audited for the ~326 DB_Coins
  rows tied to currently-owned coins, not all ~3,753 rows** — a real duplicate-
  CoinID row was already found and fixed once (2019-W Lincoln Cent Proof vs.
  Reverse Proof shared `C-2019-W-1C-01` until split). Don't assume CoinID
  uniqueness holds across the full DB_Coins table until the wider audit is done;
  don't build caching/indexing logic on that assumption without a way to detect
  a collision. (This is a different situation from `PCGS_Duplicate_Queue` below —
  that's an *expected, handled* collision on a different column, PCGS#.)
- SetID: custom `S-XXYY-TT-##`. **Distinct from `OriginSetID`** (the multi-coin
  Set-display join field, see "Multi-coin Set display") — SetID is Issue-3's
  "an individual coin *belongs to* a Set" chip linkage; OriginSetID is "these
  child coins are physically *inside* this Set bundle." Two different
  relationships, deliberately separate fields. **The parent/child `-Set`/`-A`
  suffix above is the human-readable provenance lineage, but the code join for
  child coins is the explicit `OriginSetID` field, not string-parsing the
  suffix.**
- SerNo (on All sheet): the PCGS/NGC **cert number alone** (not combined with the
  type/PCGS# — those are separate values; see PCGS Label Auto-Populate below for how
  a scanned label splits into its parts).

## Workbook naming conventions
- **Column headers have no spaces**, across DB_Coins, DB_Sets, All, and Albums —
  e.g. `MintMark`, `SerNo`, `CertLink`. Match this exactly when reading/writing via
  the Graph Excel API; a header with a space is stale.
- **Denomination values are short codes**, not full words: Cent → `1C`, Nickel →
  `5C`, Dime → `10C`, Quarter → `25C`, Half Dollar → `50C`, Dollar → `$1`. Any
  denomination dropdown/display in the app should use (or map to/from) these codes.

## Workbook sheets that matter
**Verified against the real workbook 2026-08-10** (during the Browse Edit
write-layer build). The counts and column facts in this section are as of
that date — the workbook is co-managed with Copilot between sessions, so
re-verify before relying on any of it for a write.
- **All** — owned coin records, backed by the table **`AllCoins`** (the table
  name matters: the Graph Excel API addresses it by name). **542 data rows,
  49 columns (A–AW)**, CollectionID unique across every row (zero
  duplicates — safe as a write key). **24 of those rows are real `-A`/`-B`
  child rows** living on All like any other row, not just the app's own
  nested `FAKE_SET_CHILDREN` demo model.
  - **`SpotValue` (Z) and `Total` (U) are LIVE FORMULAS** —
    `Total = Cost + Shipping`; SpotValue is a nested-VLOOKUP chain through
    DB_Coins → Lookup_MetalContent → Ref_SpotPrices. **Superseded:** this
    file previously said SpotValue was "not live yet — formula pending" and
    elsewhere that it had been deployed 7/13; neither described the actual
    state. **Both columns had been silently flattened to static values
    workbook-wide (all 1,084 cells), almost certainly by a Copilot "refresh
    formatting" pass** — a real data-loss failure, not a design gap: Total
    would have gone stale the instant Cost/Shipping changed and SpotValue
    would never have reflected updated spot prices again. Both were restored
    via targeted XML surgery, verified byte-for-byte against the original
    except those cells. **The naive restore-from-backup would have been
    WRONG** — DB_Coins and Lookup_MetalContent had gained columns since the
    backup, so the old formula pointed at the wrong DB_Coins column and
    omitted Copper/Nickel; the correct current formula was recovered from
    the `AllCoins` table's own `calculatedColumnFormula` metadata, which the
    flattening never touched. **Treat "a Copilot formatting pass can silently
    flatten formulas" as a known failure mode of this workbook**, and never
    let app code write a literal into a formula column.
  - **There is no `Notes` or `FunFact` column on All** — `Remarks` (AG) is
    the only free-text column. Notes/FunFact exist on DB_Coins (and Notes on
    Wishlist). Don't assume a per-specimen home for either.
  - `LastModified` (AW) exists, is blank on every row, and is stamped by the
    APP only — Copilot writes and manual Excel edits deliberately do not
    populate it. It is "last app touch," not an audit trail.
  - `Reviewed` (AS) exists and is blank on every row.
  - `Seller_Link` (V) holds seller NAMES far more often than URLs (7 of 233
    populated values are `http…`), despite the column name.
- **Photos** (new) — one row per photo, replacing the old fixed
  Obverse/Reverse/Photo3/Photo4/OGPPhoto columns on All: `PhotoID` (PH-#####),
  `CollectionID`, `PhotoType`, `SubGroupID`, `Filename`, `Label`, `DateAdded`.
  PhotoTypes in use: Obverse, Reverse, Slab_Obverse, Slab_Reverse, Reference
  (**capitalized** — the app's own `GALLERY_TYPES` uses lowercase, a mapping
  to resolve whenever photo reads migrate).
- **Receipts** (new) — `ReceiptID` (RC-#####), `CollectionID`, `Filename`,
  `DateAdded`. One row per (receipt × coin), so a multi-coin receipt is
  several rows sharing a ReceiptID and Filename. Cost/Shipping/PurchaseDate/
  Seller_Link deliberately stay on All as the single source of truth.
- **Containers** (new) — `ContainerName`, `StorageLocation`, `Notes`,
  `DateAdded`. One row per physical container, holding its current location,
  so moving a container is one edit here rather than an update to every coin
  row referencing it. `ContainerName` matches `All.Container` text exactly
  (the name IS the key — no separate ID). Currently 11 containers, and the
  data is clean: all 314 rows with a Container agree with it, zero orphans.
  The read-layer join that makes this actually cascade is BUILT — see
  "Browse Edit real write layer" below.
- **The All-sheet flat photo/receipt columns are still populated and still
  what the app reads** (Obverse, Obverse_Original, Reverse, Reverse_Original,
  Photo3, Photo4, Receipt, OGPPhoto). They're deliberately left in place
  until the app's photo/receipt reads move to the Photos/Receipts tabs, at
  which point they should be cleared to avoid two sources of truth. That
  migration is a known, still-unstarted piece of work — the Browse Edit
  write layer explicitly did NOT do it.
- **DB_Coins** — ~3,753 reference coin types. Add rows opportunistically when a gap
  is hit during other research — never proactively expand into an exhaustive catalog.
  Has Mintage (partially populated) and a **FunFact** column (confirmed present —
  this is the source Edit Coin's read-only Fun Fact display reads). Co-managed
  with Copilot outside app sessions (GSID population, PCGS# corrections, structural
  fixes have happened this way) — **treat any previously-pulled copy of DB_Coins as
  possibly stale**; re-pull before relying on it for anything beyond a quick mockup.
- **DB_Sets** — reference sets, including all albums (Type=AL).
- **Sets** (new, table `Sets_Status`) — `Status`, `Year`, `Variety`,
  `Description`, `Lineage`, `SetID`, `FilledBy`. Nothing in the app reads it
  yet (deliberately, per Ray). Worth revisiting as a possibly better
  ownership signal for the Sets completeness checklist than the sparse
  `All.SetID` linkage — a separate scoping decision, not assumed.
- **Albums** (formerly AlbumSlots) — restructured; actual live columns are
  `Status`, `Year`, `MintMark`, `Description`, `AlbumName`, `AlbumID`, `CoinID`,
  `FilledBy` (plain CollectionID, blank = open hole/want-list). There is no
  SlotLabel/SlotCriteria/SlotYear/SlotMint — Year/MintMark are used directly, and
  **CoinID is what actually disambiguates two slots that share the same
  Year+MintMark** (e.g. a plain date vs. its VDB-type variety) — don't assume
  Year+MintMark alone is a unique key for a slot.
- **Wishlist** (new) — freestanding want-list items not tied to any album:
  Description, Notes, Target Price, Date Added.
- **DB_Rolls** (new) — separate table, not part of the main coin data. Not needed
  for the app shell yet. Don't confuse this with **RollID**, a distinct All-sheet
  column on owned rows that the Rolls tab is actually built against — see
  "Browse: navigation restructure" below.
- **ProjectPlan** and **ParkingLot** — the authoritative source of decisions and open
  items, date-stamped with row/column references. ParkingLot Status is now three
  states: Open / In progress / Resolved (+ Resolved Date). Default review filter
  shows Open + In progress only.

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

### Add Set + real write layer (BUILT and merged to main)
The app's first real OneDrive **write** layer, plus a new **Add Set** capture
flow that uses it and a durable **CollectionID reservation** module. Built to
a 3-part spec; all 12 clarifying answers are baked in. Verified entirely
headless via a mock Graph client (77 assertions); the real live-against-a-copy
run is Ray's to execute (see the numbered checklist committed alongside,
`docs/ADD_SET_LIVE_RUN_CHECKLIST.md`).
**Merge status correction:** this was previously flagged in this file as
"held on branch `claude/add-set-reservation`, NOT merged" — that was stale.
It was actually merged to main in an earlier session, and every subsequent
round of work (Needs Attention hub, Sets checklist, Medal tab, receipt-to-PDF,
this Bug 3 fix, etc.) has been built directly on top of it in main.
`claude/add-set-reservation` has no commits of its own that aren't already in
main's history — **main is now the source of truth for all Add Set/write-layer
work, full stop**; the branch name is kept here only as a historical pointer
to where this feature originated, not as a place future work should land.

**Two bugs found during Ray's live copy-workbook run, both fixed and
re-verified headless (checklist itself passed — B8-B9/C12-C14/D16/E19-E20 all
confirmed against real OneDrive data; these were refinements on top, not
architecture changes):**
- **Bug 1 — Pause used to discard whatever was typed but not yet formally
  saved.** Fixed via a new `partialChild` field on the draft (distinct from a
  real `children[]` entry — never counted as captured, never gets a
  CollectionID). The Pause handler reads the current form fields
  (`readChildFormValues()`, identity fields — see Bug 3 below for photos,
  which are handled separately) and persists them before navigating away;
  `renderChildStep()` restores them into the form on resume
  (`restoreChildFormValues()`) and clears `partialChild` the moment it's
  consumed, so a stale partial can't reappear after being shown once. A real
  save (`addChildToSetDraft()`) always clears any leftover `partialChild`
  too, since a formal save supersedes it. Pausing a genuinely blank form
  leaves `partialChild` as `null` rather than persisting an empty object.
  **Superseded in part by Bug 3 below**: this original fix explicitly
  excluded photos ("in-memory Files can't round-trip through a JSON draft,
  so they're deliberately not part of this") — that exclusion is what Bug 3
  fixes; the text-field persistence described here is otherwise unchanged.
- **Bug 2 — no way to correct `expectedChildCount` after Step 1, and hitting
  it produced a nonsensical "Coin 4 of 3."** Fixed two ways: (a) an inline
  "Expected count [Update]" control now sits on the child-capture screen
  itself, editing the flat `expectedChildCount` for an ungrouped set or the
  **currently-active sub-group's** own `expectedCount` for a sub-grouped one
  (`adjustExpectedCount()` — mutates the actual object inside `draft.subGroups`,
  not a copy, so the persisted write is correct); (b) once captured count
  reaches or exceeds what's expected, the progress line stops trying to show
  a fill-in-the-blank "Coin N of M" and instead reads "You've captured N
  coins — add another, or mark this set complete?" — for a sub-grouped set
  this triggers once **every** sub-group is full (`allSubGroupsFull()`), not
  per-group, since there's no single sensible "next group" left to name at
  that point. `currentSubGroupForNextChild()` now returns `null` (not a
  last-group fallback) once all groups are full, which is what
  `allSubGroupsFull()`'s equivalent condition relies on.
- 20 new headless assertions cover both: unsaved-then-paused fields
  surviving a resume and then being formally saved correctly, a blank pause
  not leaving a junk partial, adjusting count mid-capture on both flat and
  sub-grouped sets, and the graceful overflow message at exactly-met and
  past-met counts for both set shapes.
- **Bug 3 — a captured-but-not-yet-saved child photo didn't survive Pause.**
  Found during review of the Bug 1 fix (photos were explicitly excluded from
  `partialChild`), confirmed by design rather than a live reproduction, and
  fixed the same session. A photo is now uploaded to this draft's real
  Staging folder (`setDraftFolder()`, i.e. `CoinCollection/Staging/
  {CollectionID}/` under whichever `WRITE_TARGET` is active — same `"copy"`
  gating as every other Add Set write, unchanged) **the moment Pause is
  tapped**, not deferred to a formal Save — using the exact same
  `{childId}_obverse.jpg`/`_reverse.jpg` filenames `saveCurrentChild()`
  itself uses, since `nextChildCollectionId()` is stable for as long as one
  child-capture form stays open. Only the resulting **filename reference**
  is written into `partialChild.photos` — never the photo bytes — keeping
  the JSON draft small. `renderChildStep()` now also calls a new
  `restorePartialChildPhotos()` on resume, which fetches those bytes back
  from Staging and repopulates both the live preview and `addSetPhotoFiles`,
  so `saveCurrentChild()`'s existing upload call transparently re-uses the
  already-staged photo — no special-casing needed there, and Ray never has
  to re-take a photo that already exists in Staging. Guarded against a race
  where a fresh capture lands while the async restore is still in flight
  (checked both before the fetch starts and again right after it resolves,
  so the slower-to-arrive restored photo can never clobber a newer one Ray
  just took). A second Pause correctly overwrites the Staging file if the
  photo was re-taken, and falls back to the already-referenced filename
  (rather than uploading blank) if resume's restore hasn't finished landing
  yet when Ray pauses again. 23 new headless assertions (mock Graph client):
  photo persists byte-for-byte across Pause → resume, the reference is
  cleared once the child is formally saved (with the saved child's own
  record carrying the same unchanged photo bytes) and correctly replaced if
  the photo is re-taken instead, a Pause with no photo taken behaves exactly
  as before (blank `photos.obverse`/`reverse`, nothing uploaded), a fully
  empty Pause still stores `partialChild = null`, and the mid-restore race
  guard. Verified working for sub-grouped sets too (a separate ad-hoc check,
  not part of the saved suite files). The 6 existing suite files (77
  assertions) re-run clean alongside — 105/105 total across everything run
  this session, zero regressions.

**Structured Year field + child-coin pre-fill (BUILT, locked in).** Add Set
Step 1 had no structured Year — only free-text Set name/description — so
child-coin capture had nothing to pre-fill from and Year had to be retyped
by hand on every coin, even for a single-year set. Fixed per Ray's explicit
scoping (not open for further design questions): every catalogued Mint
product is tied to exactly one year; only a personal/custom grouping can
span multiple years — so Year is a required **either/or**, never a third
"blank" state.
- **New Step 1 field**: a number input (`#addSetYear`) plus a `Various`
  checkbox (`#addSetYearVarious`, reusing the existing `.grade-range-toggle`
  class rather than inventing a new one). Checking Various disables and
  blanks the number input, so the two states can't both hold a stale value.
  `readAddSetYear()` returns a specific number, the literal string
  `"Various"` (same convention the Rolls tab already uses for a mixed-date
  roll's own `year` field — reused, not reinvented), or `null` if genuinely
  neither was chosen — `startSetCapture()` blocks submission on `null` via
  the same `showToast()` validation pattern as the existing "give the set a
  name" check.
- **`draft.year` is no longer checklist-only.** It already existed as a
  draft field (populated only via the Sets-checklist deep-link, see that
  section below) — now `startSetCapture()` always sources it from
  `readAddSetYear()` regardless of entry path, so a checklist deep-link and
  a plain Add Set entry both end up going through the same real form field.
  `applyAddSetContext()` now pre-fills `#addSetYear` with the checklist
  tile's year (always a specific number, Various left unchecked) instead of
  passing it through a side-channel — genuinely simplifies that code path,
  not just adds to it.
- **Child pre-fill lives in `clearChildForm()`** (`prefillChildYear()`):
  a freshly-opened child form (first coin, or right after a save) pre-fills
  `#addSetChildYear` from `currentSetDraft.year` whenever that's a specific
  number; `"Various"` or a missing/legacy value (a draft written before this
  feature existed) leaves it blank, exactly as before. Applies identically
  regardless of sub-groups — sub-groups split by mint mark, not year, and
  this doesn't branch on `subGroups` at all. **Deliberately NOT applied**
  when resuming a Paused `partialChild` — `restoreChildFormValues()` is
  untouched, since a restored partial represents exactly what Ray had
  already typed/cleared, which must win over the Step 1 default. Still just
  a normal editable value either way — a per-coin override is respected and
  isn't sticky (the next child gets the Step 1 pre-fill again, not the
  override).
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

### Add Coin write layer — Phase 1 (BUILT and merged to main)
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

### Photo / receipt write layer — Photos & Receipts tabs (BUILT and merged to main)
Ray reviewed this whole feature (the write layer itself plus every
live-device follow-up round below — Replace, Adjust's fallback, circle
framing, Trash confirmation, and the gallery viewer fix) and gave explicit
go-ahead to merge as-is, no changes. `claude/photo-receipt-write-layer` has
no commits of its own that aren't now in main's history — **main is the
source of truth for this whole feature**, same standing as every other
merged-after-holding branch in this file.

The gallery/crop UI has produced real Blobs and real filenames since it was
built and then dropped them into an in-memory store, so **every capture
outside Add Coin's own Staging flow vanished on reload**. And **nothing in
the app had ever written a row to the Photos or Receipts tab** — so even
the files Add Coin genuinely did upload landed in CoinPhotos/CoinReceipts
with nothing in the workbook pointing at them. This connects the
already-proven `graph().uploadFile()` plumbing to the newer UI and adds the
workbook half.

**Audit first — what was real vs. stub, read from the code (this corrects
several assumptions a reader would draw from this file's own history):**
- **REAL already**: Add Coin's photos (`uploadCoinDraftPhotos()`) and
  receipt (`uploadCoinDraftReceipt()`) into the Staging draft folder, moved
  to CoinPhotos/CoinReceipts on promotion; Add Set's whole-set photo and
  receipt via `uploadDraftPhoto()`.
- **STUB**: Edit Coin / Edit Set / the standalone Manage Photos screen, for
  photos AND receipt — `buildPhotoPairSlot()`/`manageOpenEndedBlock()`/
  `initGalleryCapture()` all called `addGalleryEntry()` and nothing else.
  Wishlist (all four slots) and Batch Receipt. Add Set's own gallery
  (OGP/COA/other/sub-group) except the single OGP-front → `addSetPhotoFiles
  ["whole"]` mirror.
- **`receiptFiles` had exactly ONE consumer** (Add Coin's). Browse Edit's,
  Edit Set's, Wishlist's and Batch Receipt's entries were written and never
  read by anything.
- **The read side was thinner than "repoint" implies.** `All.Obverse`/
  `Reverse` were read ONLY as booleans (`hasObversePhoto`/`hasReversePhoto`,
  consumed only by `coinMissingPhoto()`); `All.Receipt` was not read at all
  (the detail page's Receipt row read the `FAKE_COIN_DETAILS` demo lookup);
  and **no coin's own stored photo was ever displayed anywhere** —
  `applyDiscContent()` went from a just-captured session blob straight to
  the SERIES reference image. So Task 3 wasn't a repoint, it was building
  that display path.

**Workbook facts this was built against (read directly from the 2026-09-05
upload, not assumed):**
- **Photos and Receipts are real named Excel tables**, so `addTableRow()`
  can target them: `Photos` `A1:G1030` (PhotoID, CollectionID, PhotoType,
  SubGroupID, Filename, Label, DateAdded) holding **29** data rows;
  `Receipts` `A1:D1073` (ReceiptID, CollectionID, Filename, DateAdded)
  holding **85**.
- **BOTH overrun their data exactly the way `AllCoins` does** — ~1000 and
  ~987 blank rows sit inside their refs — so appending would drop new rows
  a thousand rows past everything else. This is the same bug class
  `createAllSheetRow()`'s claim-a-blank-row fix exists to prevent, and one
  Receipts row (RC-00009 / AY-00706) is already sitting at row 1073 as
  evidence of what appending does here.
- PhotoTypes in real use: Obverse, Reverse, Slab_Obverse, Slab_Reverse,
  Reference. All filenames `.jpg`. Repeatable naming is
  `AY-00207_reference_01.jpg`.
- `All.Receipt` (103 rows) vs Receipts (85): the 18-row difference is
  entirely the literal string **"Binder"** — a placeholder meaning the
  paper receipt hasn't been scanned, **not a filename**.
- `All.Obverse` (5 rows) vs Photos Obverse (4): `AY-00706` carries
  `AY-00706_slab_obverse.jpg` in its **Obverse** column with no Photos row
  — hand-entered, following the documented legacy overload pattern. So
  unlike receipts, the two photo sources do NOT fully agree, which is
  exactly why the legacy fallback is kept.

**Two naming conventions corrected against that data:**
- **`.jpg`, not `.png`.** Both crop stages bake through `canvas.toBlob(...,
  "image/jpeg", 0.92)`, so every file this layer has ever named has been
  JPEG bytes wearing a `.png` name. `GALLERY_FILE_EXT` is now `.jpg`.
  Files already uploaded to `_Testing/CoinPhotos` under the old names are
  orphans (no Photos row will point at one) — Ray's to delete by hand
  whenever convenient, not this task's.
- **Repeatable types use the full type word + a zero-padded 2-digit index**
  (`AY-00207_reference_01.jpg`), matching the sheet rather than inventing a
  second convention beside it. `reference`'s suffix went `_ref` →
  `_reference` and `other`'s `_photo` → `_other` (zero real files behind
  either).

**PhotoType vocabulary** (`GALLERY_TYPE_TO_PHOTOTYPE`, both directions):
the five real values matched exactly, plus `OGP_Obverse`, `OGP_Reverse`,
`COA`, `SubGroup_Obverse`, `SubGroup_Reverse`, `Other` in the same
Title_Case_With_Underscores shape. Ray may have Copilot record these 11 in
a `Lookup_PhotoTypes` tab; nothing here is built against one. *(A 12th,
"OGP", comes with open-ended Package / OGP; see C3 under "Photos wait for
Save".)*

**The write layer.** New Photos/Receipts module: header maps resolved from
the sheet's own header row at run time (`ensureSheetHeaderMap()`, cached
per sheet), id minting by max+1 over the table's own ID column, a
per-table creation lock, and **blank-row claiming** rather than appending.
- **`createAllSheetRow()` is deliberately NOT generalised.** It carries
  AllCoins-specific semantics this doesn't need — a key pair written
  through a narrow audited path, two live formula columns that must never
  fall inside a range, a duplicate-aware two-half verify, the promote lock
  — and it is the one write path that has been through three live runs.
  This copies its SHAPE, not its code. Photos/Receipts have no formula
  columns and contiguous columns, so a row here is one plain range PATCH.
- **"Blank" means every column empty**, not just the id — same rule and
  same reason as the All-sheet version.
- `DateAdded` goes through `excelSerialToday()` with an explicit
  `yyyy-mm-dd` number format, never ISO text.

**When a capture commits, and why the line falls there.**
- **A record that already exists on the All sheet** (Edit Coin, Edit Set,
  the standalone Manage Photos screen on an owned coin/Set) uploads to
  CoinPhotos and writes/replaces its Photos row **immediately on capture**.
  Immediate rather than on Save because the standalone screen has no Save
  button at all. `photoCommitTargetId()` is the gate; the ownership check
  (`activeCoins()` / `FAKE_SET_CHILDREN`) is the enforcement, the
  `AY-#####` regex only a cheap early-out.
- **Draft-backed flows are unchanged.** Add Coin and Add Set capture
  against records with no All row yet; writing straight to CoinPhotos would
  put a coin's photos in their final home before the coin exists and strand
  them if the draft were rejected. Those get their rows **at promotion**,
  once the files have verifiably landed —
  `recordPromotedCoinRecords()` / `recordPromotedSetRecords()`.
- **A single-instance type REPLACES its row** (one row per CollectionID +
  PhotoType + SubGroupID) so a re-capture can't accumulate near-duplicates
  a "show all photos" read would render twice; repeatable types add.

**A failure is loud and loses nothing.** This is a phone flow on a
possibly-flaky connection, and silently dropping a capture would recreate
the exact "photo vanished" problem the whole layer exists to fix. On
failure the entry stays in the gallery **with its Blob intact**, the tile
shows "Not saved — tap ↻" (`.photo-upload-state.failed`) alongside a real
retry control, and a toast names the file and the error. The retry
re-sends without re-capturing anything.

**Removing a photo detaches the ROW and never deletes the file.** Two
reasons, both pre-existing rules rather than preferences: the `_original`
raw is locked in as never-deleted by the crop-commit convention, and this
write layer deliberately has no delete primitive — claim-a-blank-row was
chosen for AllCoins specifically to avoid needing one. A blanked row simply
returns to the claimable pool, which is the same mechanism from the other
side.

**Receipts de-duplicate on filename — and one decision is what makes that
reachable at all.** A Receipts row is one (receipt × coin) pair and one
ReceiptID legitimately spans several rows (RC-00001 already covers three
coins) because Ray's normal pattern is several coins on one receipt. So
before minting anything, `commitReceiptCapture()` looks for an identical
Filename already on the tab and reuses that ReceiptID **and skips the
upload**. For that to ever fire, **an already-PDF pick keeps the picked
file's own name** (`sourceWasPdf`) rather than being renamed to
`{CollectionID}_receipt.pdf` — which is also the shape the real data
already has (`FindersKeepers_2026-06-27_receipt.pdf`). A **photographed**
receipt is inherently per-coin (and a camera's own filename is
meaningless), so it keeps `{CollectionID}_receipt.pdf`. Re-attaching to a
coin that already has one replaces that coin's row.
- **An "attach an existing receipt" picker was NOT built** — flagged to Ray
  as the better-still option rather than assumed. The filename dedupe is
  the minimum fix and is in.

**The read side.** Photos and Receipts are fetched alongside All/DB_Sets/
DB_Coins/Lookup_MetalContent/Lookup_Graders in `ensureLiveNavDataFetch()`
and indexed by CollectionID (`LIVE_PHOTOS`/`LIVE_RECEIPTS`; a null response
leaves the previous index in place rather than blanking the display).
- **`storedPhotoFilename()` reads the Photos tab first and the legacy flat
  `All.Obverse`/`Reverse` only as a FALLBACK** — which is what stops
  `AY-00706` (recorded only the old way) losing its photo. **The flat
  columns are never written and never cleared by this app**, per the
  explicit scope boundary; clearing them waits on a real-device
  confirmation that the repointed reads work.
- **A coin's own stored photo now displays**, via a new `CoinPhotos` fetch
  tier modelled on `fetchReferenceImageBlob()` (GET-only, raw bytes → a
  same-session blob URL, one real request per filename, and the same
  attempted/not-attempted rule so a no-token failure retries after sign-in
  instead of caching "no photo" forever). Wired as a tier in
  `applyDiscContent()` **ahead of the series reference image** — an actual
  photograph of this coin beats a generic picture of its series — and into
  `renderSlotCell()` (Albums), which inherits that surface's existing
  picks-up-on-next-render tradeoff since it is string-templated.
- **`coinMissingPhoto()` reads the Photos tab first too**, so a coin whose
  photos all came through the new layer doesn't keep nagging in the Docket
  just because the retired flat column was never backfilled.
- **The Receipt row on Browse detail reads the Receipts tab**, renders the
  filename immediately and upgrades itself to a real OneDrive link once
  that file's webUrl resolves. The old version linked a path that had never
  resolved to anything (a confirmed 404 — "a real link in markup only").
  **"Binder" and anything else without a file extension is never treated as
  a filename** (`looksLikeReceiptFilename()`); it renders as
  `Binder (not scanned)`, never as a link that could only break.

**A latent bug found and fixed on the way.**
`plannedCoinPromotionMoves()` iterated `draft.photos` as if it held bare
strings, but `uploadCoinDraftPhotos()` stores `{type, filename, caption}`
objects — so it concatenated an object straight into a path and would have
produced `.../[object Object]`. Never hit live only because the one live
promote run didn't exercise photos. Both shapes are accepted now.

**Out of scope, deliberately, all confirmed with Ray:**
- **Wishlist and Batch Receipt are untouched.** Neither has a CollectionID
  to key a row on (a wishlist item isn't owned; a batch receipt is
  explicitly "not yet tied to a coin"), and an untracked orphan file is
  worse than no file.
- No bulk backfill/migration script; the Containers tab; and no clearing of
  the legacy flat columns.

### Former Holdings sub-catalog + Purge (BUILT and merged to main; built on `claude/vigilant-cerf-maworr`, tip `12079cf`, landed via rebase; the code is on `main`)
The app's first genuinely **DESTRUCTIVE** write. Architectural and
irreversible, so it was held for Ray's explicit merge go-ahead and his own
run of the delete path against `_Testing`; **since merged to `main`** (the
branch tip is an ancestor of `main`). See
`docs/PURGE_LIVE_RUN_CHECKLIST.md`.

**One premise correction worth carrying forward: `deleteItem()` is NOT new.**
It has always existed and is already used on real OneDrive files — the
promotion move does `getItemMeta → getFileBytes → uploadBytes → verify →
deleteItem(source)`. What is new is deleting bytes with **nothing to recover
from**: every prior use deletes a source only after a verified copy exists
elsewhere. Don't re-litigate this as "the first delete primitive"; the risk
is the destructiveness, not the API.

**Part 1 — "Exit History" is now "Former Holdings", a real sub-catalog.**
Scope is the exact inverse of `ownedCoins()`: `formerHoldings()` =
`activeCoins()` filtered to `isExitStatus(status)` minus anything fully
purged. **No new schema was needed for the list** — Set bundles and Rolls
already live in the same `All` sheet with the same `Status` column, so all
three record kinds come through one filter. Sorted by Year then MintMark via
the same `sortCoinsTabRows()` Catalog uses, not left in sheet order.
- **Five filter chip rows**, all multi-select/OR, all ANDing together, plus
  a Year button and a free-text search: **record kind** (All/Coins/Sets/
  Rolls), **exit reason** (All + the four `EXIT_STATUSES`), then
  Denomination, Metal and Grading Service **reusing Catalog's own chip
  DEFINITIONS** (`BROWSE_FILTER_CHIPS`/`BROWSE_METAL_CHIPS`/
  `BROWSE_GRADING_SERVICE_CHIPS`) so the two pages can never disagree about
  what "Silver" or "Dimes" means — but each with its **own selection Set**,
  so filtering one page never narrows the other.
- **The record-kind row is load-bearing, not decoration.** Catalog splits
  coins/Sets/Rolls across tabs with different filter sets; this list mixes
  them. A Set bundle is `Denomination="Multiple"`, which **no Denomination
  chip can ever match** — so without the kind row, selecting any
  denomination would make Sets and Rolls silently unreachable rather than
  merely unfiltered. Asserted in both directions.
- **Exit reason is a chip row, not a sort or grouped headers** (Ray's call):
  it matches every other filter axis in the app and needs no new
  interaction pattern.
- **`chipRowTest(chips, selectedKeys, coin)`** is one shared OR-test,
  extracted because `browseFilterTest`/`browseMetalTest`/
  `browseGradingServiceTest` are byte-identical in shape and this page needs
  five more — writing it a sixth through tenth time by hand is exactly how
  two of them drift.
- **Former Holdings keeps its own Year state** (`formerYearFilter`), on the
  same per-page principle as the Browse tabs. The ONE shared
  `#yearFilterOverlay` now serves both: whichever Year button opens it
  claims it via `yearFilterTarget`, and Apply/Clear write back to that
  page's own state (`activeYearFilterState()`/
  `updateActiveYearFilterButtonUI()`/`applyAfterYearFilterChange()`).
  `yearRowTest()` delegates to a new `yearRowTestAgainst(coin, yf)` so every
  existing call site is byte-identical in behaviour.

**Part 2 — the `Purged` flag.** A new `All` column, `Y`/blank, separate from
`Status` (Status says *why* it left; Purged is a later, optional action on
top of an already-exited coin).
- **Read from the flag, NOT derived live from the Photos row count on every
  render.** Two real reasons: a coin that never had any photos would read as
  fully purged the instant it exited and would **silently vanish from Former
  Holdings without anyone ever purging it**; and live derivation would make
  a list's contents shift as the Photos index arrives.
- **Derived at WRITE time** (`finalisePurgedFlag()`) — written once, at the
  moment a purge leaves zero photos behind. A partial purge simply leaves it
  blank, which is exactly the "still visible" state, with **no third value**
  needed.
- Written by **`writePurgedCell()`**, a narrow single-purpose audited path
  following `writeCoinIdCell()`/`writeOriginSetIdCell()`'s precedent — it is
  never hand-edited and has exactly one producer. Its
  `ALL_WRITABLE_COLUMNS` entry exists only so the general machinery can't
  silently drop it if it ever arrives another way (same treatment as
  Category/Finish/Error/FaceValue). **`LastModified` is stamped; `Reviewed`
  is deliberately NOT blanked** — same divergence and same reasoning as the
  Set-linkage write: deleting photos changes no attribute a human reviewed.

**Part 3 — Purge itself.** Gated on its own `ENABLE_PURGE_WRITE`
(`WRITE_TARGET === "copy"`, folded into `WRITE_LAYER_ENABLED`) so turning it
off never requires also turning off Edit Coin's ordinary field writes, and
enabling those never silently enables permanent deletion.
- **Reachable only from Former Holdings**, and the `formerHoldings()` base
  set is what structurally guarantees it can never appear on an Owned coin.
- **Two-stage dialog.** Stage 1 lists every photo's files, independently
  checkable — see the follow-up build below for the final crop/original
  design, which supersedes the original "one bundled checkbox per photo,
  all checked by default" description. Stage 2 **names the exact files**,
  states plainly that it cannot be undone, and states what is KEPT.
- **NEVER touched, under any circumstance:** the `All` row, the
  CollectionID, and **Receipts**. One receipt routinely covers several coins
  (RC-00001 already spans three), so deleting it from a single coin's action
  would destroy another coin's record of its own purchase. True record
  deletion is a manual database action outside the app; this never offers
  it.
- **ROW-THEN-FILE order, per photo.** If the row detach fails, nothing is
  deleted for that photo. If a file delete fails after the row is gone,
  we've lost a pointer to a file that still exists — visible, recoverable,
  reported by name. The reverse risks a row pointing at bytes that no longer
  exist, which is the worse failure. **This is the one design choice nothing
  else in the suite discriminates**, so it has its own dedicated assertion
  block (J6–J9) that fails the row detach and proves zero files were
  deleted.
- **Per-photo, not all-or-nothing**: one failure never abandons the rest,
  and every outcome is reported by filename. `deleteItem()` already treats
  404 as success, so the file half of a re-run is idempotent.
- Per-CollectionID lock (`coinPurgeInFlight`, same shape as
  `coinPromoteInFlight`) so a double-tap coalesces rather than
  double-deleting.

**Three boundary decisions, all confirmed with Ray before building:**
- **The `_original` raw IS deleted too** — a deliberate, explicit exception
  to the crop-commit convention's "never deleted" rule. That rule protects
  re-cropping an **owned** coin, which by definition cannot apply to an
  exited one, and the raw is usually the larger file, so leaving it would
  orphan the bigger half and defeat the point. Both filenames are named in
  the confirmation.
- **A LEGACY-ONLY photo is refused** — one recorded solely in the old flat
  `All.Obverse`/`Reverse` columns with no Photos row (5 real rows are like
  this, AY-00706 among them). This app never writes those columns, so
  deleting the file would leave them pointing at bytes that no longer exist.
  Consequence, working as intended: **such a coin can never reach
  fully-purged** until that's fixed workbook-side. Shown greyed with the
  reason rather than silently omitted.
  - **Worth knowing: this guard is defence in depth, and the outcome alone
    cannot prove it exists.** A legacy-only photo has no Photos row, so the
    row-must-exist rule catches it a step later and produces an identical
    `deleted=0/skipped=1` result. Removing the explicit guard passed the
    first version of the suite. The **skip REASON** is what discriminates,
    and is what's asserted now. **Eighth time this project has hit the
    "green suite hiding a real bug" trap; the tell is always the same — an
    assertion whose broken case also returns the passing value.**
- **A fully-purged coin stays reachable ONLY by direct CollectionID
  lookup** — and **that mechanism did not exist as a user-facing surface**.
  Confirmed by grep: Catalog search and Ledger's "Find a Coin" both read
  `ownedCoins()`, so exited coins were already invisible to both, purged or
  not. As originally specified, a purged coin would have become completely
  unreachable in the app. So a small **"Open by CollectionID"** input was
  built into Ledger (`openLedgerCoinById()` *(removed, Purge follow-up 3)*), reading **raw
  `activeCoins()`** — the one surface that must never filter, matching the
  existing precedent that direct single-coin lookups are never
  ownership-filtered.

**Two fixes beyond the literal ask, both flagged rather than assumed:**
- **`browseStepListFallback()` now reads `ownedCoins()`, not raw
  `activeCoins()`** — prev/next could step from an owned coin straight into
  a Sold/Gifted/Returned/Spent one, the same leak class Catalog/Stats/
  Spotlight already closed. Ray asked for this while I was in there.
  Former Holdings rows set their own step context, so the arrows walk that
  list; a coin opened by CollectionID is in no list and correctly gets no
  arrows.
- **Real pre-existing bug fixed: Ledger's "Find a Coin" box has rendered as
  an unstyled WHITE input on this dark page since it was built.** The
  generic input rule lists `text`/`number`/`date`/`textarea`/`select` and
  **not `search`**. Fixed with a shared `.ledger-search` class rather than
  widening that rule, because an `input[type=search]` type selector (0,1,1)
  would out-specify Catalog's own `.browse-search` class (0,1,0) and
  restyle its box too. Asserted on **computed style**, not on the class
  attribute — the class being present proves nothing if the rule doesn't
  apply.

## Quick-capture notes → ParkingLot
Floating capture button anywhere in the app (typed or phone dictation). Auto-captures
Floating capture button anywhere in the app (typed or phone dictation). Auto-captures
timestamp, current screen, and CollectionID if one was being viewed. Writes a new
ParkingLot row (same lock/fallback pattern as coin writes): Source, Screen, Related
CollectionID, Status (Open), plus the note text.

## Batch receipt capture
Separate dashboard action from Add Coin. Photographs a receipt, saves to
CoinReceipts with a timestamp name, auto-generates a ParkingLot note pointing at that
exact file. The app cannot reach back into OneDrive on Claude's behalf later — the
photo still has to be manually brought into a chat to actually process it. The note's
job is just making sure nothing gets lost or forgotten, not eliminating that step.

## External data sources — what's safe to hotlink vs. not
- GreatCollections, PCGS, and similar sites generally block cross-origin image
  fetching — don't build automated image pulls from them. Manual save-then-Library-
  upload is the supported path (already works, no new feature needed).
- PCGS has a public REST API but only via OAuth password grant, which would require
  the app to handle Ray's raw PCGS credentials in public client-side code — not
  building this. Use plain hotlink buttons to PCGS's own cert/pop-report/account
  pages instead (Ray logs in directly on PCGS's site, never through this app).
- OneDrive/MSAL uses a proper redirect-based OAuth flow, which is why it's safe —
  Ray's password never touches this app's code. This is NOT true of most other
  services; don't assume another service's login can work the same way without
  checking whether they support a redirect/authorization-code flow first.

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

## App structure
Single-page app shell, one MSAL redirect URI, internal navigation: Dashboard /
Browse / Albums / Sets / Wishlist / Add Coin. Name: "Salty's Cabinet." Batch
Receipt, Stats & Value, and Needs Attention are dashboard-only destinations,
not persistent nav items. **Superseded: the persistent bottom/side nav is now
six items, not five** — `Sets` was added as a full persistent nav entry (see
"Browse: navigation restructure" below), same standing as Albums; the
Dashboard's "Go To" tile grid is generated from the same nav-item list, so
Sets automatically got a Dashboard tile too, the same way Albums always has.
Rolls, by contrast, deliberately got neither a nav entry nor a Dashboard
tile — it's reachable only via its own tab inside Browse.

## What NOT to build
- AI photo pre-fill from receipts/coin photos — shelved permanently. Redundant with
  free chat-based photo analysis Ray already gets through his Pro subscription.
- Batch order entry UI in the app — stays a chat + Copilot workflow.
- Live PCGS account login — see External data sources above.
- localStorage/sessionStorage for anything that matters — use OneDrive as the
  actual store; the app should be re-derivable from OneDrive state at any time.

## Session log — carried-forward state (not app architecture, tracked here for continuity)

### ParkingLot entries to transfer (4 rows, as of 2026-08-23)
**Needs adding to the workbook's ParkingLot sheet — logged here because this
coding session has no write access to the live OneDrive workbook.** Recorded
verbatim in ParkingLot's own column shape (Item/Title, Category, Priority,
Date, Description, Status), same shape as the existing "Copper color
designations (RD/RB/BN)" future-pass row. Row 1 supersedes the earlier
2026-08-17 version of this same entry with Ray's own canonical wording
(same underlying item, not a new one — don't add both).

**Row 1:**
- **Item/Title:** `Physical FB check pass on owned Mercury dimes`
- **Category:** `Data`  · **Priority:** `Medium`  · **Date:** `2026-08-17`
- **Status:** `Open`
- **Description:** `Matcher narrowing treats a blank All.Designation as meaning "not Full Bands" for Mercury dimes, which is correct for resolving CoinID links but doesn't confirm the physical coin actually lacks Full Bands. Owned Mercury dimes not yet inspected should get a coin-by-coin physical FB check, same shape as the deferred copper-color (RD/RB/BN) pass. Not urgent, not blocking any current work.`

**Row 2:**
- **Item/Title:** `Catalog grid/list view drops distinguishing catalog fields`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-22`
- **Status:** `Resolved`  · **Resolved Date:** `2026-09-03`
- **Resolution:** `BUILT — see CLAUDE.md "Catalog grid: Variety + Designation on the mini flip card". renderBrowseGrid()'s TL/BL now go through the same fitted renderers TR/BR use, so a VDB cent is distinguishable from a plain one in the grid. Also fixed a second bug found while wiring it: cornerClearsDisc() could never match .flip-frame-mini, so disc-clearance was a silent no-op on every Catalog card. Held on claude/add-coin-write-path-fs2rf8. NOTE: this does NOT close Row 6 (the FULL flip card's BL still has no overflow protection).`
- **Description:** `Catalog's grid and list views don't surface fields that distinguish otherwise-identical-looking catalog entries. Confirmed for two cases: Designation (FB Mercury dimes show bare Grade, e.g. "MS-64" instead of "MS-64FB") and Variety (1909 VDB vs non-VDB Wheat cents both show plain "1909 Wheat 1C" with no way to tell them apart). Individual Browse detail's flip card handles both fields correctly — only Catalog's grid/list views are missing them. Not blocking, cosmetic/data-clarity issue only.`

**Row 3:**
- **Item/Title:** `Add Coin album assignment is captured but never acted on`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-23`
- **Status:** `Open`
- **Description:** `Add Coin's "Assign to Album" selection is now recorded on the Phase 1 Staging coin draft (assignAlbum), but nothing consumes it — no slot is filled, and the separately-specced post-save Albums matching flow (offer to fill a matching open slot; surface both coins on an already-filled slot; never auto-fill silently) is still unbuilt. Deliberately NOT scoped into any Add Coin write-layer phase: it is UX polish on a save that already works, not core to logging a coin. Pick up whenever. See CLAUDE.md "Post-save Albums matching" for the behaviour already agreed.`

**Row 4:**
- **Item/Title:** `Cert/serial duplicate check against owned coins`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-23`
- **Status:** `Open`
- **Description:** `Feature suggestion from the Add Coin Phase 1 live-run session, not a bug: nothing today cross-checks a PCGS/NGC cert number entered on a new coin against SerNo on already-owned coins to flag a likely duplicate entry (a coin re-added by mistake, or a cert typo colliding with a real existing coin). Could live in Add Coin's live matcher (a warning banner alongside the DB_Coins match banner) or as a save-time check. No design work done yet — flagging the idea, not scoping the build.`

**Row 5:**
- **Item/Title:** `Restructure Add Coin's field layout to match Edit Coin's accordion sections`
- **Category:** `App`  · **Priority:** `Medium`  · **Date:** `2026-08-23`
- **Status:** `Resolved`  · **Resolved Date:** `2026-08-24`
- **Resolution:** `BUILT — see CLAUDE.md "Add Coin: accordion restructure". Add Coin is now Grading & Certification + Overview / Photos / Notes & Facts / Purchase Details / Storage, matching Edit Coin. Specifications deliberately omitted (Ray's call). Held on claude/add-coin-write-path-fs2rf8 pending his go-ahead + a live retest pass. If this row was never transferred to the workbook in the first place, skip it rather than adding-then-closing it.`
- **Description:** `Ray's explicit ask (Add Coin batch 7 review): Add Coin should look nearly identical in structure to the Edit Coin / Browse detail page (see "Detail/Edit accordion redesign" — RECORD_SECTIONS: Overview, Photos, Specifications, Notes & Facts, Purchase Details, Storage), rather than its current one long flat form. Grading Service specifically should become its own clearly-bounded section (a real card/accordion, not just a text label) since it functionally drives the PCGS Label #/Cert-Type-Number fields beneath it, and should stay positioned near the top since a grader needs to be picked before the label-decode flow can run. This is a real, deliberate restructure — needs its own scoping pass (which fields land in which section, whether Purchase Details/Storage's existing drill-down pattern is kept or folded into the new accordion shape) before building, not a quick follow-on to the batch-7 header removal. Explicitly deferred, not started.`

**Row 6:**
- **Item/Title:** `Saved-coin flip card: BL (Grade+Designation) corner has no overflow protection`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-30`
- **Status:** `Resolved`  · **Resolved Date:** `2026-09-03`
- **Resolution:** `BUILT — see CLAUDE.md "Flip card: TL and BL are fitted (1787 Fugio Cent)". applyFlipCorners()'s BL now goes through the shared renderFittedCornerLines(), alongside TL which had the identical defect and caused a real-device collision on the Fugio Cent. Measured: "XF Details - Improperly Cleaned" was 295px of ink in a 139px box, 88.7px into the BR corner and 26px past the frame. Ordinary grades unchanged at 27px. Held on claude/add-coin-write-path-fs2rf8.`
- **Description:** `Found while measuring the composition-corner restack (see CLAUDE.md "CACBean UI, Value field rounding, composition corner restacked"): applyFlipCorners()'s BL corner (Grade+Designation, concatenated with no space) is plain textContent with no shortening logic at all — unlike TR (renderTypeDenomCorner()'s last-word-drop) and now BR (the composition split/reduction chain). A long free-typed "Details"-graded value (e.g. a PCGS Genuine-holder note like "XF Details - Improperly Cleaned") measured a genuine overlap with an unreduced BR value at 360px width before the BR restack (-9px gap); the restack fixed the specific collision by shrinking BR, not by giving BL any protection of its own, so a sufficiently long BL string could still in principle run close to whatever's in BR. Ray's explicit call: flag it, don't fix it here — out of scope for the composition-corner task. Would need its own scoping pass (truncate? shorten to last word like TR? something else for a Grade+Designation string specifically) if ever picked up.`

## Full design history
For the complete session-by-session reasoning behind these decisions, see the
project's Claude.ai knowledge base (Project: "Coin Collection"), particularly
`coin-collection-session-10Jul2026-app-design.md`. This file is the working
summary; that one has the "why."
