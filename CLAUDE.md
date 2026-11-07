# Salty's Cabinet — coin collection app

Personal coin collection app for Ray Ayres ("Salty"). Static site on GitHub Pages,
no backend server. Talks directly to OneDrive (Ray's personal Microsoft account) via
Microsoft Graph API, and the Excel workbook there is the authoritative data store.

## Current state (rewritten at the end of every task; read this first)
- main = `57a66ce` (docs: Ray's answers to the (ao) plan, (au) raised; 6 Nov 2026). Last code commit on main `938f30f` ((an) test speed). LIVE = `8622d7d` (Ray deployed main, 6 Nov): (al) and (an) are ON LIVE; main's later commits are docs only. A merge never deploys; what is deployed is known only from Ray's screen (Build line) or his word.
- OPEN BRANCH `claude/device-cache-ao`, HELD (cross-cutting; never merge without Ray's explicit go-ahead): (ao) Stages 1-3 built. Code: Stage 1 `9a3c12b`, Stage 2 `fc5478d`, Stage 3 `fa280b7`, Ray's Q2 allow-list gate `9fdac27` (writes only when the session is checked AND online; every other state refuses; the test harness marks each page "read from the workbook"); tip = the docs commit that rewrote this block (`git log -1 claude/device-cache-ao`). Stage 1: per-sheet time / MB of the launch read and the workbook version on the Docket (Ray's S25 results in docs/BACKLOG.md (ao)). Stage 2: `workbookSession`, the read-only gate on every `graph()` write method (`ReadOnlyError`), offline / can't-reach rows and toasts, online / resume / 30 s checks, no MSAL redirect for lack of network, failed-attempt detail and per-step save timing on the Docket. Stage 3: the IndexedDB saved copy (invariant 17, display-only), launch from it (no sheet reads when the version matches), clearing rules, Docket data line and "Refresh from workbook". Write-up docs/ref/PLATFORM.md "Device cache (ao), Stage 1" and "…, Stages 2-3" (with the `$batch` / workbook-session findings); departures from the plan listed in BACKLOG (ao).
- WAITING ON RAY: redeploy `claude/device-cache-ao` as TEST and run docs/DEVICE_CACHE_AO_LIVE_RUN_CHECKLIST.md steps 4-12 (step 10: screenshot of "Save steps", the 12-15 s breakdown, which decides (aw) / (ax)); then his merge go-ahead (fast-forward). His answers of 7 Nov (Q1 wording approved, Q2 allow-list, Q3-Q5 accepted) are in BACKLOG (ao); the new "not-read" / "unknown" refusal messages are not yet approved wording. At merge: regenerate docs/CODEMAP.md, build log to docs/HISTORY.md, one-line summary under "Merged work", invariant 17 drops its "not on main yet".
- Baseline: full `npm test` on the branch at `9fdac27` (7 Nov 2026): 4916 passed, 0 failed, 0 page errors, 95 suites, 660 s; = main's 4804 / 0 / 0 / 92 + load-report-ao 29 + session-gate-ao 45 + device-cache-ao 38, every other suite line identical. Before Q2 (`fa280b7`): 4912. Main itself: 4804 / 0 / 0 / 92 at `938f30f`.
- Next: Ray's TEST of steps 4-12 and his decisions; then (au) (top of BACKLOG: MSAL script failing to load shows a signed-in user the demo mockup; next small branch, plan first); (aw) / (ax) after the save-steps screenshot (Ray's call); then the unordered backlog below.
- Waiting on Ray (other): deleting `claude/write-safety-al`, `ccr-08b7397e-dv1kxb`, `claude/test-speed-an` and `ccr-41e0c57e-taks0s` from origin (merged / session branches; the git proxy blocks deleting, never delete branches here; never push a ccr- session branch again, commit only on descriptive branches, Ray 6 Nov); his device check of the interim receipt file naming; a real-device look at (z); the Ledger tiles, Sets card Variety line and melt / face labels on LIVE; LIVE's Photos tab for duplicate PhotoIDs (u) before any Replace on LIVE; the leftover `cropped_04` on AY-00756 if he wants.
- Branches on origin: `main`, `claude/device-cache-ao` (open, held) and the four above.
- Workbook: facts below and docs/ref/WORKBOOK.md. _Testing: All.ValueDate is AD, LastModified AZ. LIVE workbook pass DONE (Copilot, 31 Oct 2026); Copilot 4 Nov: Lookup_Categories protected, "Matte" in Lookup_Finishes A14, ParkingLot dates real. All.SpotValue has its formula in 1,552 of 1,555 rows. ParkingLot rows 1, 3, 4 of the old block are ParkingLot 286, 302, 303.
- Not verified on LIVE / a real device: (ao) Stages 2-3 on a device (IndexedDB in Chrome on the S25, installed app vs a tab, eviction, `navigator.onLine` and the online / offline events, MSAL's real offline error codes); whether a Graph workbook session would help ((aw)); (an)'s ready flag on LIVE (invisible by design); the write-safety work on LIVE beyond its _Testing checks; F8 by hand; a real `$batch` over 20 (F5) and a real part-landed batch (F2), suite-only; the date branch on LIVE; the album cover coin on LIVE; Build B's Set Details tile, arrow keys on a desktop, the tablet layout; Build 1 and Build 2 on LIVE beyond their TEST checks; the interim receipt file naming; the drift rows against the real formulas; (z); Samsung Internet in a browser tab; Graph's conflictBehavior=fail (409) on a real upload.
- Finding things: moved headings are in docs/INDEX.md; function -> line ranges in docs/CODEMAP.md (generated at `1eefde8`; on the branch app.html is ~1,000 lines longer, the new code sits after `fetchWorkbookSheetRows` (~L6550) and `applyLiveNavSheetRows` was extracted from `ensureLiveNavDataFetch`; regenerate at merge). The pdf.js work has landed (`loadPdfjs()`, `vendor/pdfjs/`).

## Where to look (read the file BEFORE working in that area)
This file keeps what every session needs: standing rules, current state, the write-layer invariants, the one-line backlog and the build rules. Everything else is in `docs/`, linked by plain path (not @-imports), so nothing loads unless you read it. A heading that moved is found in [docs/INDEX.md](docs/INDEX.md) (line numbers there refer to this file at commit `21bcd95` or `a7fcb20`, as marked). **Never read app.html whole**: grep, or look up the function in [docs/CODEMAP.md](docs/CODEMAP.md).
- Photos, crop, the image chooser, Manage Photos, photo labels, Replace, reference images: [docs/ref/PHOTOS.md](docs/ref/PHOTOS.md).
- How photos and receipts SAVE (Save-wait C1-C3, leave guard, Replace never overwrites, receipts never overwrite / wait for Save, Binder, remove and shared Replace, receipt naming, Photos and Receipts tab writes, receipt-to-PDF, "save only when changed"): [docs/ref/SAVE_AND_RECEIPTS.md](docs/ref/SAVE_AND_RECEIPTS.md).
- Add Coin or Edit Coin forms, Identification (Grader, PCGS label, Mint Item Number, GSID), denomination / Finish dropdowns, CACBean, Value fields, Staging-draft editing: [docs/ref/ADD_COIN.md](docs/ref/ADD_COIN.md).
- Add Coin's Save, Staging coin drafts, Promote / Mark ready, CollectionID reservation, direct-write vs Staging: [docs/ref/ADD_COIN_WRITE.md](docs/ref/ADD_COIN_WRITE.md).
- Any write into the All sheet (Browse Edit Save, allow-list, conflict check, claiming a blank row, Promote / Force Add rows, "Owned", Set attach / detach, dates): [docs/ref/WRITE_LAYER.md](docs/ref/WRITE_LAYER.md).
- Add Set (Step 1/2, Set drafts, sub-groups, promotion): [docs/ref/ADD_SET.md](docs/ref/ADD_SET.md).
- `dbCoinsCandidatesFor()`, CoinID matching or re-link, Re-check, the Description / Category / Composition / Designation / Finish tiers: [docs/ref/MATCHER.md](docs/ref/MATCHER.md).
- Catalog, Sets tab or checklist, Rolls, Browse filters, the live-nav read path: [docs/ref/BROWSE_CATALOG.md](docs/ref/BROWSE_CATALOG.md).
- Browse detail, Edit Coin / Edit Set layout, accordions, Spotlight, sharing, Set child linkage ("Belongs to"), Value floor, `formatCurrency`: [docs/ref/BROWSE_DETAIL.md](docs/ref/BROWSE_DETAIL.md).
- Flip-card or mini-card corner labels, corner fitting, composition or variety text, SMS, the reverse face: [docs/ref/FLIP_CARD.md](docs/ref/FLIP_CARD.md).
- Albums (list, page-flip book, slots, key dates, Mintage text, image prefetch, Best of): [docs/ref/ALBUMS.md](docs/ref/ALBUMS.md).
- Dashboard cabinet, drawers, Back and Close Drawer, device Back / history guard, splash, startup gating: [docs/ref/NAV_DASHBOARD.md](docs/ref/NAV_DASHBOARD.md).
- Docket, Needs Attention, Staging Review, Re-check / Force Add / Dismiss: [docs/ref/DOCKET_STAGING.md](docs/ref/DOCKET_STAGING.md).
- Former Holdings, Purge, Show Purged: [docs/ref/FORMER_HOLDINGS.md](docs/ref/FORMER_HOLDINGS.md).
- Ledger, Stats, spot prices, Status and Sell/Remove, Wishlist: [docs/ref/LEDGER.md](docs/ref/LEDGER.md).
- Sign-in / MSAL, Graph reads, startup and docket.json detail, deploy rollout, PWA, OneDrive folder layout, test-harness rules: [docs/ref/PLATFORM.md](docs/ref/PLATFORM.md).
- Workbook sheets and columns, ID schemes, naming, "does this column exist?": [docs/ref/WORKBOOK.md](docs/ref/WORKBOOK.md).
- Choosing the next task, any backlog item, the ParkingLot rows: [docs/BACKLOG.md](docs/BACKLOG.md).
- The story behind a feature (test lists, negative controls, bug-fix rounds, superseded designs): [docs/HISTORY.md](docs/HISTORY.md). When Ray runs a live pass: `docs/*_LIVE_RUN_CHECKLIST.md`.
- Section names quoted in app.html comments, in docs, or in this file ("see ...") may now live in a docs/ file: look the heading up in [docs/INDEX.md](docs/INDEX.md).

## Standard end-of-work pattern (standing rule, Oct 2026) — read this first
**1. With every branch, before reporting it done.** The branch's last commit
adds or updates its write-up in the matching `docs/` file (what it does, the
function and constant names, what was left alone on purpose, and what is not
verified) and leaves a one-line summary in this file (rule 5).
Docs reach `main` in the same merge as the code. Every branch report ends with
one line: "CLAUDE.md updated in <commit>", or "no CLAUDE.md change needed
because <reason>".
See also "History goes to docs/HISTORY.md" below; where they differ, the later rule wins.

**2. When Ray says "end session"** (or at a natural stopping point):
- a. Check that this file matches `main`: every merged branch has a one-line summary here and its write-up in docs/;
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

**5. At each code merge, in the same docs commit:** regenerate docs/CODEMAP.md; move the full write-up of the merged work to the matching docs/ file and leave a one-line summary in CLAUDE.md; report CLAUDE.md's size (wc -c) in the merge report. CLAUDE.md stays under about 45 KB.

**Docs-only commits** (CLAUDE.md and docs/ only, no code) may go straight to `main` with
Ray's go-ahead. **Code never does**: code goes through a branch and Ray's merge
go-ahead.

**Baseline:** see "Current state" at the top of this file (the one place it
is kept). A merge never deploys: LIVE gets it only when Ray runs the deploy
workflow for `main`.

## Session working rules (standing rules, added 28 Oct 2026)
1. **Never read app.html whole.** Search first (grep), then view only the line ranges you need.
2. **When running npm test, report only the totals and any failures, not the full output.**
3. **History goes to docs/HISTORY.md.** When a branch merges, move its build history into docs/HISTORY.md and keep only its rules and a one-line summary in CLAUDE.md, so the file doesn't grow back.

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

## Maintenance
Update this file only when something changes that a future session would actually
need to know to avoid re-doing work or making a wrong assumption — a new
architectural decision, a schema/naming convention change, a scope boundary, or a
change to how a feature is supposed to work. Don't update it for routine task
completions (a bug fix, a component built to existing spec, a screen finished per
existing spec) — just do the work. If unsure whether something rises to that bar,
ask before updating rather than updating by default.

## Regression suites are COMMITTED (locked in — supersedes the scratchpad convention)
Full text and history: [docs/ref/PLATFORM.md](docs/ref/PLATFORM.md). Rules:
- Suites are `tests/verify_*.js`, committed, auto-discovered, run with `npm test` (`tests/run-all.js`: per-suite time, one total, slowest five; non-zero exit on any failure or uncaught page error). GitHub Pages serves the whole checkout, so put nothing private in the repo.
- **Never hardcode a browser path in a suite**; `tests/harness.js` resolves it (`CHROMIUM_PATH`, newest `chromium-*` under `PLAYWRIGHT_BROWSERS_PATH`, system Chrome, Playwright's default).
- **A stale suite is worse than none**: update an assertion to follow a real design change, never weaken it.
- **Every new suite uses the shared check helper and starts with a must-fail self-check** (Ray, 26 Oct 2026): `const ok = check; selfCheck(ok);` (one deliberately false check that must fail, one true check that must pass); `check(label, cond, data)` takes the label first.
- Test-quality trap (E4 below): an assertion whose broken case also returns the passing value proves nothing; run a negative control.

## Hard constraints
- Free tier only. No paid Azure resources, no third-party automation platforms.
- No backend server — static HTML/JS + Microsoft Graph API only.
- Excel workbook in OneDrive stays the source of truth, co-managed with Microsoft
  Copilot in separate Excel sessions between coding sessions.
- Mobile-first — Ray uses Chrome on a Samsung S25 (corrected 7 Nov 2026; older docs and E2 say Samsung
  Internet, whose quirks shaped earlier work). Desktop/tablet also matter, especially for Albums.

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

## Platform and auth rules (detail: [docs/ref/PLATFORM.md](docs/ref/PLATFORM.md))
- **Azure/Entra:** client ID `bf9aaf28-a5e1-4eed-a006-15f03146693b`, tenant `consumers` (personal accounts only), authority `https://login.microsoftonline.com/consumers`. Use `loginRedirect`, never popup. Load MSAL from the jsdelivr CDN, not `alcdn.msauth.net` (a browser extension of Ray's blocks it). Redirect URIs are registered per page: `index.html` (bare Pages root), `stage.html`, and `app.html` for both `http://localhost:8791/app.html` and the Pages URL; `app.html` derives `redirectUri` from `window.location` at runtime.
- **ONE shared MSAL instance (`graphMsalInstance`) and ONE `handleRedirectPromise()` call. Never add a second of either** (two instances share one clientId-keyed cache and fail sign-in outright). Feature isolation is each feature's own flag inside its token getter; `acquireGraphToken()` is the single serialized acquisition (at most one redirect per page load); `GRAPH_SCOPES` is one set.
- Images are read GET-only into in-memory blob URLs (`fetch` bytes, not the expiring downloadUrl); caches are in-memory, never localStorage / sessionStorage for anything that matters (OneDrive is the store; MSAL's own token cache is the one exception; on the (ao) branch, the IndexedDB saved copy is a second, display-only one: invariant 17).
- **Startup:** every sheet read has a 12 s deadline, the splash waits 25 s, Retry aborts and restarts the reads, failures are never cached, missing non-essential sheets (Photos, Receipts, Albums, Wishlist) refetch in the background. **docket.json:** missing = empty queue; a 0-byte file is a failure the app never repairs (count shows "?"); a file with the wrong `type` reads as empty and the next add overwrites it (known risk).
- **No demo or filler data in a live session** (`liveDataMode()`): demo data only stands in for unbuilt features. Remaining demo fallbacks are backlog (ap) 2.3.
- Fonts are self-hosted (`fonts/`), never a CDN. The PWA manifest and icons cover `app.html` only; there is no service worker. `stage.html` is the working Add New Coin staging form: do not break it.

## Write-layer invariants (the rules every write must keep; full write-ups in the docs/ files named in "Where to look")
1. **Allow-list.** `ALL_WRITABLE_COLUMNS` is the only way to a PATCH of the All sheet; `ALL_NEVER_WRITE_COLUMNS` (SpotValue, Total, CollectionID, CoinID, SetID, OriginSetID, CertLink, the media columns) have no code path. Formula columns (Total, SpotValue, GradeNum, Receipt and the other media columns, Albums.Status) are never written; a range PATCH must fill every cell, so a range stops at a formula column. A column a write needs but the header lacks refuses the whole write (F6: any non-blank value, and always Reviewed / LastModified; `PHOTOS_OPTIONAL_COLUMNS` excepted), and a cell holding a formula is never written (5.C; `readAllRowForWrite`, `assertNoFormulaCells`).
2. **Narrow audited writers** for the never-write columns, one column each: `writeCoinIdCell`, `writeNewRowKeyCells`, `writeOriginSetIdCell`, `writePurgedCell`. All writes to All happen in exactly six functions: `saveCoinRowToWorkbook`, `writeCoinIdCell`, `writeNewRowKeyCells`, `createAllSheetRow`, `writeOriginSetIdCell`, `writePurgedCell`. Do not add a seventh or widen the allow-list for convenience.
3. **Positions and rows are resolved at write time:** columns from the TABLE's own header row (`readTableHeaderRow`), re-read at the start of every write (`ensureAllHeaderMap({ fresh: true })`, `ensureSheetHeaderMap(sheet, { fresh: true })`; a table whose header is not on sheet row 1 is refused), rows by CollectionID read fresh (`findAllSheetRowNumber`), never a remembered index. DB_Sets, DB_Coins, Containers, Albums, Wishlist and every Lookup_* sheet are never written.
4. **Concurrent edits block.** Opening Edit Coin snapshots the row; Save re-reads and any difference blocks the whole save (LastModified and Reviewed excluded); no partial write, no merge. Overwriting a populated identity field asks first (`detectIdentityOverwrites`). A Set attach / detach instead checks its single cell fresh just before writing.
5. **Every app save blanks Reviewed and stamps LastModified last** (its own range, the last edit: F1) (Set link and Purge stamp LastModified but do not blank Reviewed). Photo-only and receipt-only saves stamp neither. LastModified is a local date-time; every other date column is a whole day.
6. **Dates go through `toWorkbookDate()`**: a whole Excel serial plus `numberFormat` in the same request, never text. `assertNoTextDatesInEdits` refuses any Date object or ISO date-time string. A new date column is added to `WORKBOOK_DATE_COLUMNS`.
7. **New rows claim the first blank row inside the table's lock, never append** (All, Photos, Receipts; the whole row must be blank). Ids (PhotoID, ReceiptID) are minted INSIDE the lock and never at or below one this session gave out (`lastMintedIds`). `addTableRow()` has exactly two callers: `createAllSheetRow()` and `writeRecordRow()`. A new All row reads the column first, writes keys only to a verified-empty row, verifies exactly one row carries the id, and is stamped Status "Owned".
8. **Locks coalesce a double tap** into one write: `coinPromoteInFlight`, `setLinkInFlight`, `coinPurgeInFlight`, `withAllRowCreationLock`, `withEditSaveLock`.
9. **Files are never overwritten.** Uploads use `NO_OVERWRITE` (`conflictBehavior=fail`; a 409 means pick a free name), names are chosen at Save (`freeSingleFilenames`, `nextFreeRepeatableFilename`, `freeReceiptFilename`), and a move onto an occupied name proceeds only when the bytes are identical (`moveFileWithoutOverwrite`). Whether a receipt is "the same document" is decided by BYTES (`sameFileBytes`), never by file name; one ReceiptID never points at two files. Replace, Recrop and remove never delete a file; remove detaches the row only. Only Purge (after a verified row detach) and a Staging-edit ✕ after its confirm delete.
10. **Photos and receipts on a saved record wait for Save** (Edit Coin, Edit Set, Manage Photos): nothing writes on pick, redraw, `visibilitychange` or `pagehide`. Save order: fields (conflict check), CoinID re-link, photo adds / replaces, removals, labels, receipt. A failed item stays pending (the pick is kept, never lost); a field conflict writes nothing else. ✕ on a Replace pick is an undo.
11. **Save only when something changed:** a form is dirty only while it differs from what it loaded, in the shape Save would write; a clean Save writes nothing. The leave guard asks `unsavedEditsForView()` afresh every time, never the button.
12. **The Photos and Receipts tabs are the only record** of a record's photos and receipt. The app never reads or writes the All media columns; a coin's receipt is its FIRST Receipts row (2+ rows are refused and flagged on the Docket); "Binder" is a Receipts row, not a file.
13. **Reads and writes target the same workbook** (`writePaths().workbook`; E3). `WRITE_TARGET` is derived from the build stamp ("The build decides its data target"); every write flag is plain `true`.
14. **Failure is loud and loses nothing:** non-optimistic (memory changes only after the write is confirmed), per-item results named by file, an orphan or blank row is recoverable and a clobbered formula is not. Purge detaches the row BEFORE deleting its file. Never blank a half-written row: a part-landed batch (`$batch` is split at `GRAPH_BATCH_LIMIT` 20) returns reason "partial" naming what did and did not land (`batchWriteError`, `partialSaveResult`).
15. **Set membership comes only from the child's `OriginSetID`** (the parent's CollectionID; a real parent row carries none). SetID is the issue-catalog id, never membership: at most one Set chip (`resolveChildParentSet`); "Issued in ..." is plain text (`setIssueRemarkFor`).
16. **Staging:** a coin draft is `Staging/{CollectionID}/coin.json` plus its photos; the reservation scans Staging folder names (monotonic max+1; a rejected mid-sequence id stays a permanent gap, only the top id is reusable); Promote carries the id forward and sets Promoted itself; only Ray's tap changes a draft's state.
17. **The device's saved copy of the workbook is display-only ((ao), IndexedDB `salty-cabinet-cache-{target}`).** Read in one place only, a live launch (`launchFromSavedCopy()`); never by a header map, row lookup, snapshot, conflict check, id minting or any `graph()` read. Writes are an ALLOW-LIST: only when the session is checked (a full read from the workbook this session, or a saved copy whose version matched) AND online; every other state refuses, including one added later (`workbookWritesAllowed()`; the `graph()` wrapper refuses every write method with a `ReadOnlyError`; tests fail if a client grows an ungated write method or an unknown state is allowed). Every workbook write deletes the copy before its first request. TEST and LIVE copies live in separate databases and never mix. Not on main yet (branch `claude/device-cache-ao`, held).

## Cross-area rules E1-E21 (one line each; the original header line and excerpt sit at the end of the named ref file, under "Cross-area rules stated in CLAUDE.md")
- **E1** There is NO global `.hidden` rule in app.html: `class="hidden"` on a plain div does nothing. Scope every hide rule to its component (`.detail-row.hidden`) and test it. [BROWSE_DETAIL.md]
- **E2** The image chooser uses three separate inputs (camera `image/*` + capture, library `image/*`, files `image/*,application/pdf`); never one combined input, because Samsung Internet skips the native chooser. [PHOTOS.md]
- **E3** Reads and writes target the same workbook, always: any new read path uses `writePaths().workbook`; never add a separate read target "for safety" (it caused silent data loss). [BROWSE_CATALOG.md]
- **E4** An assertion whose broken case also returns the passing value proves nothing: match on what only correct code produces and run a negative control. [PLATFORM.md; excerpt in HISTORY.md]
- **E5** Anything that redraws the Album book mid-turn goes through the turn helpers (`cancelAlbumTurn()` first, via `renderAlbumBook()` / `openAlbumAtPage()`), never around them. [ALBUMS.md]
- **E6** Do not hand-tune a visual nudge for a font-rendering perception (slant, weight) from this environment's Chromium; it can overcorrect on other devices. [NAV_DASHBOARD.md]
- **E8** `DESCRIPTION_GENERIC_TOKENS` stays tight; never add an identity-bearing word (`EAGLE`, `GOLD`, `SILVER` stay; `DOLLAR` is stripped). [MATCHER.md]
- **E9** Every category hint is a phrase of two or more words; never collapse one to a single word. [MATCHER.md]
- **E11** Only the CERT part of a decoded label may reach a cert-lookup URL (never SPEC or GRADE); the base URL comes from `Lookup_Graders`, grader-agnostic. [ADD_COIN.md]
- **E12** Grading Help must never reproduce ANA's grading text or PCGS's Photograde images; summarise and link only. [ADD_COIN.md]
- **E13** Mint Mark "Other" never writes a value: the `__OTHER_MINT__` sentinel is normalised to "" the instant `change` fires, before anything reads `#mintMark.value`. [ADD_COIN.md]
- **E14** The full-name `DB_Coins.Mint` column (`mintFull`) never replaces MintMark in the primary join key; `dbCoinsCandidatesFor()` is unchanged by it. [ADD_COIN.md]
- **E15** Edit Coin never auto-fills curated fields (Description, Variety, Finish, Denomination, Year); from the Mint Mark Other lookup it writes only Mint Mark. [ADD_COIN.md]
- **E17** `setId` and `originSetId` are different relationships; never cross-wire them. `originSetId` (the child is physically inside the Set) is the join; the `-A` / `-B` CollectionID suffix is provenance, not a join key. [BROWSE_DETAIL.md]
- **E19** A blank mint mark is a double dash in real CoinIDs (`C-1909--1C-03`); `denomFromCoinId()` splits by index so both forms work; never derive a mint mark from a CoinID or a denomination from `DB_Sets.FaceValue`. [ALBUMS.md]
- **E21** The coin's own display images are Obverse / Reverse; Front / Back is only for the Holder and the other non-coin pairs (Package, whole set, sub-group). [PHOTOS.md]
(All paths above are in `docs/ref/`. E7, E10, E16, E18 and E20 were never assigned.)

## Data model quick facts (full text: [docs/ref/WORKBOOK.md](docs/ref/WORKBOOK.md))
- **IDs:** CollectionID `AY-#####` (children `-A` / `-B`, joined by `originSetId`; the `-Set` suffix is retired); CoinID `C-YYYY-M-DDD-##` (unique per DB_Coins row, audited only for owned coins); SetID `S-XXYY-TT-##` (issue catalog id); SerNo is the cert number alone.
- **Headers have no spaces** (`MintMark`, `SerNo`, `CertLink`). Denominations are short codes: `1C 5C 10C 25C 50C $1`.
- **Sheets:** (Lookup_Categories column A is READ for Add Coin's Category dropdown; never written.) All (table `AllCoins`; owned coins, the `-A` / `-B` children and Set bundles), Photos, Receipts, Containers, DB_Coins, DB_Sets, Sets, Albums, Wishlist, DB_Rolls, ProjectPlan, ParkingLot, Lookup_* and Ref_*.
- **Workbook facts (coordinator's check, 4 Nov 2026; full list in WORKBOOK.md):** Total, SpotValue and GradeNum are table calculatedColumns; Receipt, Obverse, Reverse, Holder_Front, Holder_Back, References, COA_Photos, OGP_Photos, Other_Photos and Albums.Status are formulas too, so formula detection must read the range's `formulas`, not only `calculatedColumnFormula`. Photos has no OriginalFilename column; the app writes it only when the header has it (`PHOTOS_OPTIONAL_COLUMNS`; not an F6 case). DB_Coins has no Category; DB_Sets has no Type, Name or SetName (the app reads Description first). Wishlist headers are TargetPrice and DateAdded.
- **Files:** `app.html` (the app), `index.html` (connection test), `stage.html` (working staging form), `fonts/`, `manifest.json` + `icons/`, `vendor/pdfjs/`. OneDrive: `CoinCollection/` with CoinPhotos, CoinReceipts, ReferenceImages, Staging/{CollectionID}/ and `_Docket/`, and `_Testing/` as the copy target.
- Receipt photos auto-wrap to a single-page PDF (lossless; a picked PDF passes through unchanged).

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

## Merged work: rules and one-line summaries (write-ups: the file named at the end of each line)
- **Photos wait for Save, C1-C3** (main 27 Oct, `928d7a9`): Add, Replace, Recrop, ✕ on a saved record are held in memory and written only by Save Changes / Save, one at a time in screen order; the leave guard (`navigate()` wraps `navigateNow()`; `guardLeaveEditScreen`; one device-Back history entry) asks before discarding; Package / OGP is open-ended; Replace never overwrites a file (names chosen at Save). [SAVE_AND_RECEIPTS.md]
- **Receipts never overwrite** (28 Oct): same-document decided by bytes; byte-fetch failure counts as different; one ReceiptID never points at two files. [SAVE_AND_RECEIPTS.md]
- **✕ on a Replace pick is an undo** (30 Oct): the pick goes, the previous photo comes back; deleting the old one is a separate ✕. [SAVE_AND_RECEIPTS.md]
- **Staging photo replace keeps the old file** (30 Oct): only ✕ after its confirm deletes; a failed Staging-edit save deletes its own half-pair. [SAVE_AND_RECEIPTS.md]
- **Save only when something changed** (z, 31 Oct, `014be60`): see invariant 11; `refreshEditSaveState()`, `.save-btn.is-clean`. [SAVE_AND_RECEIPTS.md]
- **Receipts wait for Save** (x, 31 Oct, `da1c19e`): `holdPendingReceipt()`, `pendingReceipts[id]`, Save writes the receipt last (`savePendingReceipt`). [SAVE_AND_RECEIPTS.md]
- **Receipts and photos alignment, Build 1** (31 Oct, `6a21b60`): invariant 12; Docket rows for 2+ receipts and for drift; Binder button only while the slot is empty (`BINDER_RECEIPT_TEXT`). [SAVE_AND_RECEIPTS.md]
- **Build 2** (31 Oct, `28e5d5d`; on LIVE in `d61f1dd`): ✕ on a stored receipt always asks and only makes the removal pending (never deletes a file); a Replace of a shared receipt asks "Replace on all N coins" / "This coin only"; INTERIM naming: a picked PDF keeps its name, a photo on 2+ coins is `{ReceiptID}_receipt.pdf`, any other photo `{CollectionID}_receipt.pdf` (Edit Coin / Edit Set only; Add Coin, Staging edit and Add Set keep `{CollectionID}_receipt.pdf` until Batch Receipt). [SAVE_AND_RECEIPTS.md]
- **Guided Obverse / Reverse crop, Build A** (1 Nov, `e0aa7a3`; on LIVE in `d61f1dd`): a Holder front / back / Reference added in a session offers to crop the Obverse / Reverse from it (Add Coin, Staging edit and Edit Coin only; never Manage Photos or Edit Set); the crop is an ordinary pending entry; the source is the pending picture's own bytes (1400 px limit accepted). [PHOTOS.md]
- **Details photo viewer next / previous, Build B** (2 Nov, `24d3e72`; on LIVE in `d61f1dd`): steps through the page's photos in page order, never wraps, never includes receipts; edit-screen viewers have no next / previous; if zoom / pan is ever added, swipe must become "only when not zoomed". [PHOTOS.md]
- **Dates are real Excel dates** (4 Nov, `7b75c4e`): invariants 5 and 6; Docket row "Date stored as text"; Staging / Docket JSON dates use the local day. [WRITE_LAYER.md]
- **Finish / Category required, draft cleanup** (5 Nov 2026, merged `7c3c82c`, on LIVE in `8c58b00`): Save to Database and Promote need a Finish AND a Category (Lookup_Categories column A, read only; "Use <Finish> (from the catalog)"; Force Add excepted; `COIN_DEFAULT_CATEGORY`); a leftover draft of a coin already on All shows one action, "Mark as promoted" (never automatic); **Promote NEVER overwrites a row already on All**: identical = nothing written, blank cells filled (LastModified stamped), a differing cell = nothing written and the draft stays open. [ADD_COIN_WRITE.md, DOCKET_STAGING.md]
- **Write safety (al)** (6 Nov 2026, merged `9033fa5`, on LIVE in `f779287`): invariants 1, 3, 5 and 14 (missing column refused F6, headers re-read at every write, formula cells never written, LastModified last, `$batch` split at 20, part-landed saves named); F8 Mark as promoted on the Docket. [WRITE_LAYER.md]
- **Test speed (an)** (6 Nov 2026, merged `1eefde8`, Ray's TEST check passed, on LIVE in `8622d7d`): `npm test -- <word...>` / `--list`; app `window.__appReady` after ALL startup promises settle (`trackStartup()` + `Promise.allSettled`; rejections stay page errors; nothing in the app reads it); `openApp` waits for it, `appReady(page)`, `openApp(vp, { blank: true })`; crop Stage 2 = wait for `bgCropOverlay` hidden, then look; no assertion changed; control `node tests/controls/ready_flag_control.js` (by hand). [PLATFORM.md]
- **Belongs to** (Oct): invariant 15. **Earlier work** (Add Set, Browse Edit write layer, Add Coin Phase 1 / 2, Promote duplicate-row fix, Item 5, "Owned" at creation, Set attach / detach, Photos and Receipts tabs, Former Holdings + Purge): rules are in the invariants; write-ups in WRITE_LAYER.md, ADD_COIN_WRITE.md, ADD_SET.md, FORMER_HOLDINGS.md, SAVE_AND_RECEIPTS.md.

## Open backlog (one line each; full text: [docs/BACKLOG.md](docs/BACKLOG.md))
Open, not built:
- (au) FIRST, next small branch after (ao) Stage 1: if the MSAL script fails to load, a signed-in user sees the demo mockup (fake data shown as real).
- (a) a newly promoted coin is not in the Catalog until restart (plan first). (d) a Staging-edit receipt's ✕ appears only after a redraw. (e) image chooser left: C4 (Add Set, Wishlist), C5 receipts; HEIC via Files unverified. (f) Catalog Finish groups are fixed in code. (h) graded / reholdered capture design (cost part is (ag)). (i) viewer back gesture unverified on a device. (j) residual receipt bugs, mostly closed by (x) and Builds 1-2. (k) deploy workflow actions to Node 24.
- (q) retire the old OGP read mapping after C4 and a workbook check. (r) Edit Set saving and split build (all fields with a conflict check, split out child coins, partial sales; "My notes" / "Catalogue notes" labels; a Set's Fun Fact hidden). (u) data fix outside the app: PH-00129 on two TEST rows; check LIVE's Photos tab for duplicate PhotoIDs. (v) note only: pre-27 Oct LIVE Replace overwrote files.
- (x) rest: move the Edit Coin / Edit Set receipt slot into Purchase Details. (y) the Staging-edit receipt slot needs the shared chooser and a top-right ✕. (aa) Keep or Delete prompt on every Replace, one "Replaced" folder, Staging folder cleanup ((s) folded in). (ab) apply the (z) rule to later forms. (ac) Ledger By Denomination lists six denominations only. (ad) should Total spent / Net include Shipping (pair with (ag)). (ae) SerNo leading-zeros compare differs from `cellsEqual`. (ag) grading cost and grading receipt (ReceiptType, GradingCost). (ah) Sets list sort / filter like Coins. (ak) optional: keep the raw for Holder / Reference.
- (aq) F4 clearer Save to Database failure toast. (ar) the Finish dropdown is fixed in code (Lookup_Finishes never read). (ao) device cache (Stages 1-3 built on `claude/device-cache-ao`, held; waiting on Ray's TEST steps 4-12 and merge go-ahead). (aw) workbook session probe. (ax) save: header re-read and row lookup in parallel. (as) offline photos / receipts. (at) cold offline launch needs a service worker. (av) PLATFORM.md says nine startup sheet reads (11). (ap) unscheduled review items. Batch Receipt design (draft, nothing built); remove a shared receipt from ALL its coins; a general busy indicator; receipt photo cropping; standardising receipt file names. Data note: All.SpotValue has its formula in 1,552 of 1,555 rows. ParkingLot rows 1, 3, 4 of the old block are in the workbook (ParkingLot 286, 302, 303).
Done: (b) (c) (g) (l) (m) (n) (o) (p) (t) (w) (z) (af) (ai) (aj) (al) (am) (an).

## Full design history
For the complete session-by-session reasoning behind these decisions, see the
project's Claude.ai knowledge base (Project: "Coin Collection"), particularly
`coin-collection-session-10Jul2026-app-design.md`. This file is the working
summary; that one has the "why."
