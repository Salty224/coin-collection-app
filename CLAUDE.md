# Salty's Cabinet — coin collection app

Personal coin collection app for Ray Ayres ("Salty"). Static site on GitHub Pages,
no backend server. Talks directly to OneDrive (Ray's personal Microsoft account) via
Microsoft Graph API, and the Excel workbook there is the authoritative data store.

## Current state (rewritten at the end of every task; read this first)
- main = the (bk) merge docs commit of 8 Nov 2026 (`git log -1 main`); last code commit `296d8c4` ((bk) Workbook session; `ea60360` before the rebase onto main). LIVE: see the next line. A merge never deploys: what is deployed is known only from Ray's screen (Build line), his word, or the deploy run.
- LIVE = Build 114 · 8 Nov · `f1d07f0` (deploy run #114, 8 Nov 2026 23:26 UTC, success; started by the merge session on Ray's go-ahead): (bk) is ON LIVE. Later main commits are docs only until the next code merge. Ray confirms the splash Build line.
- No open feature branch. (bk) MERGED 8 Nov (Ray's TEST passed: c1 X / Y, c2 V, (a), (b); (d)/(e) not run cleanly; details docs/BACKLOG.md (bk)). Write-up docs/ref/WRITE_LAYER.md "Workbook session (bk)"; invariant 18.
- (bf) Promote auto-finish is ARCHIVED, NOT MERGED: branch `claude/promote-auto-finish-bf` at `6416106` (code `d47ca51`); the tag push was refused (HTTP 403), so Ray creates `archive/promote-auto-finish-bf` by hand before deleting the branch.
- Baseline: full `npm test` at `913adb3` (on main: the (bk) branch's docs commit after the rebase, the parent of the merge docs commit `f1d07f0`; app.html and tests/ are the same as on main's head) (8 Nov 2026, (bk) merge gate): 5019 passed, 0 failed, 0 page errors, 100 suites, 642 s. The full run is the merge gate only (Session working rule 3). To compare a run, diff the sorted `PASS` / `FAIL` lines.
- Origin branches to delete (Ray deletes; never delete branches here): `claude/workbook-session-bk` (merged), `claude/save-speed-ax` (merged), `claude/save-speed-plan-0lt5f5`; `claude/promote-auto-finish-bf` only after its tag exists. Never push a ccr- branch.
- Ray's standing decisions (7 Nov): Copilot_Rules append-only (never insert, delete or sort rows inside All, Photos, Receipts); wait ~5 minutes after any Excel / Copilot edit before saving in the app. Graph reads can lag writes by minutes; on main the app covers only its own recent writes (A4, C', Part 3); known gap (bi) after an Excel row insert / delete / sort is NOT covered in code. (bk) known risk left open (F): a save less than ~1 min after an Excel for the web insert.
- Next: image work first (Ray, 8 Nov 2026; the coordinator brings the task). The (bk) follow-up (remove (ax)'s lag exceptions, close (bf); plan first) WAITS until Ray says; then (bl) Add Coin rework + Category stage 1 (plan first, the coordinator brings the design); (au); (ba); (ay) value rule (Ray undecided); (az); (bn); then the unordered backlog, incl. (bb), (bc)/(bm), (bd), (be), (bh), (bi), (bj), (bo), (bp), (bq) 30-min check re-reads after own saves, (br) workbook Staging tab unused (retirement candidate). Recorded only: start the session when a form becomes dirty after 4 min idle.
- Workbook 7 Nov (Copilot, LIVE, ParkingLot 308): Lookup_Categories.AppliesTo added; nothing reads it yet ((bc), (bl)). LastModified keeps whole seconds. Excel for the web saves in TWO stages (version, then content ~2 min later); Graph writes land in one stage; the 10-minute rules stay.
- Waiting on Ray (other): _Testing leftovers (AY-00002 Grade F; Remarks test13-test16 on AY-00001-00004; AY-00760 test row); device check of the interim receipt naming; (z) on a device; Ledger tiles, Sets Variety line, melt / face labels on LIVE; LIVE Photos duplicate PhotoIDs (u) before any Replace on LIVE; `cropped_04` on AY-00756; what a PCGS NFC tag holds ((bo)).
- Found 8 Nov (read only, not changed): Add Coin's Finish note still says "Optional — leaving it blank never blocks a save", but Save to Database and Promote require Finish since 5 Nov; a (bl) item.
- Workbook: docs/ref/WORKBOOK.md. LIVE All lost "Column1" (former AE) on 7 Nov, so LIVE letters from AE on moved one left (LastModified AY); _Testing keeps it until its next refresh (ValueDate AD, LastModified AZ). All.SpotValue has its formula in 1,552 of 1,555 rows.
- Not verified on a real device / LIVE: the list is in docs/BACKLOG.md "Unverified on a real device / LIVE" (moved 9 Nov 2026); add to it there.
- Finding things: docs/INDEX.md (moved headings), docs/CODEMAP.md (regenerated at `296d8c4`, with a (bk) section).

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
verified) and leaves its one-line summary in docs/HISTORY.md "Merged-work one-line summaries" and any new standing rule in this file (rule 5).
Docs reach `main` in the same merge as the code. Every branch report ends with
one line: "CLAUDE.md updated in <commit>", or "no CLAUDE.md change needed
because <reason>".
See also "History goes to docs/HISTORY.md" below; where they differ, the later rule wins.

**2. When Ray says "end session"** (or at a natural stopping point):
- a. Check that this file matches `main`: every merged branch has a one-line summary in docs/HISTORY.md "Merged-work one-line summaries", its write-up in docs/ and its rules here;
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
Every report says what changed, how it was verified, and the open questions or concerns worth a second look (an ambiguous instruction, a tradeoff made without sign-off, a side effect, an item carried over); if there are none, say so rather than leaving the section out.
Every report (build, plan, docs) also ends with a required section (Ray, 7 Nov 2026):
TIME SPENT (wall clock, this round): the total, start of work to report; broken down into
reading / planning, coding, affected-suite runs (count, total time), negative controls (count,
total time), full npm test (count, total time), docs (CLAUDE.md, BACKLOG, CODEMAP, other), and
anything else over 2 minutes; then one line: the biggest cost this round and whether it was avoidable.

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

**5. At each code merge, in the same docs commit:** regenerate docs/CODEMAP.md; move the full write-up of the merged work to the matching docs/ file and leave a one-line summary in docs/HISTORY.md "Merged-work one-line summaries" and any new standing rule in CLAUDE.md; report CLAUDE.md's size (wc -c) in every report, as information only.

**6. Usefulness over size (Ray, 9 Nov 2026; replaces the old "under about 45 KB" limit).** CLAUDE.md holds what every session needs to start cold and work safely: current state, standing rules, data-safety rules and pointers into docs/. History, merged write-ups and detail read only when a task touches that area go in docs/, with CLAUDE.md saying where.

**Docs-only commits** (CLAUDE.md and docs/ only, no code) may go straight to `main` with
Ray's go-ahead. **Code never does**: code goes through a branch and Ray's merge
go-ahead.

**Baseline:** see "Current state" at the top of this file (the one place it
is kept). A merge never deploys: LIVE gets it only when Ray runs the deploy
workflow for `main`.

## Session working rules (standing rules, added 28 Oct 2026)
1. **Never read app.html whole.** Search first (grep), then view only the line ranges you need.
2. **When running npm test, report only the totals and any failures, not the full output.**
3. **The full npm test runs ONCE, as the merge gate** (Ray, 8 Nov 2026): not before TEST. While iterating, run only the affected suites (`npm test -- <word...>`) and their negative controls.
4. **Test drafts and fixtures copy status values and other constants from the code** (`COIN_DRAFT_STATUS.READY`, never a hand-typed "Ready"; the (bf) slip, 8 Nov 2026: the real value is "Ready for reconciliation", and the Docket listed nothing).
5. **History goes to docs/HISTORY.md.** When a branch merges, move its build history into docs/HISTORY.md and keep only its rules in CLAUDE.md (its one-line summary goes to docs/HISTORY.md "Merged-work one-line summaries").

## Merge policy (standing rule; Ray, 9 Nov 2026)
Every code merge waits for Ray's explicit go-ahead; nothing is auto-merged. Docs-only commits may go to `main` with his go-ahead.

## Clarifying-question format (standing rule)
Never use an interactive multiple-choice question tool/prompt on Ray. Always ask
clarifying questions as plain, copy-pasteable text in the chat response instead —
he discusses them with Claude (chat) separately and brings back answers to all of
them at once, which an interactive per-question picker doesn't allow for.

## Regression suites (committed in `tests/`)
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

## The build decides its data target (Oct 2026; LIVE since 17 Oct 2026)
`WRITE_TARGET` is never hand-set: `isLiveBuild()` derives it at load from the inline `BUILD_STAMP` (the one placeholder line `const BUILD_STAMP = null;`, stamped by the deploy workflow). It is `"live"` (the real workbook and `CoinCollection/CoinPhotos`, `CoinReceipts`, `Staging`) ONLY when the stamp is a real object, its branch is exactly `"main"`, its commit is 40 lowercase hex, and the page is served over https from `salty224.github.io` under `/coin-collection-app/`; anything else, any error included, is `"copy"` (`CoinCollection/_Testing/`). Nothing in the code is flipped to go live; every write flag is plain `true` in both targets. On screen: the blue `TEST · {branch}` bar (copy only; `--top-strip-h`), the gray Build line (splash, Docket bottom), the amber "A newer build is deployed — reload" row (`build-info.json`). Deploy: Actions → "Deploy to GitHub Pages" → Run workflow from `main` → type the branch (the box starts blank; a blank run fails) → `main` = LIVE, any other branch = TEST. No push trigger. Full text (moved 7 Nov 2026): [docs/ref/PLATFORM.md](docs/ref/PLATFORM.md) "The build decides its data target: the rule".

## Platform and auth rules (detail: [docs/ref/PLATFORM.md](docs/ref/PLATFORM.md))
- **Azure/Entra:** client ID `bf9aaf28-a5e1-4eed-a006-15f03146693b`, tenant `consumers` (personal accounts only), authority `https://login.microsoftonline.com/consumers`. Use `loginRedirect`, never popup. Load MSAL from the jsdelivr CDN, not `alcdn.msauth.net` (a browser extension of Ray's blocks it). Redirect URIs are registered per page: `index.html` (bare Pages root), `stage.html`, and `app.html` for both `http://localhost:8791/app.html` and the Pages URL; `app.html` derives `redirectUri` from `window.location` at runtime.
- **ONE shared MSAL instance (`graphMsalInstance`) and ONE `handleRedirectPromise()` call. Never add a second of either** (two instances share one clientId-keyed cache and fail sign-in outright). Feature isolation is each feature's own flag inside its token getter; `acquireGraphToken()` is the single serialized acquisition (at most one redirect per page load); `GRAPH_SCOPES` is one set.
- Images are read GET-only into in-memory blob URLs (`fetch` bytes, not the expiring downloadUrl); caches are in-memory, never localStorage / sessionStorage for anything that matters (OneDrive is the store; MSAL's own token cache is the one exception; since (ao), the IndexedDB saved copy is a second, display-only one: invariant 17).
- **Startup:** every sheet read has a 12 s deadline, the splash waits 25 s, Retry aborts and restarts the reads, failures are never cached, missing non-essential sheets (Photos, Receipts, Albums, Wishlist) refetch in the background. **docket.json:** missing = empty queue; a 0-byte file is a failure the app never repairs (count shows "?"); a file with the wrong `type` reads as empty and the next add overwrites it (known risk).
- **No demo or filler data in a live session** (`liveDataMode()`): demo data only stands in for unbuilt features. Remaining demo fallbacks are backlog (ap) 2.3.
- Fonts are self-hosted (`fonts/`), never a CDN. The PWA manifest and icons cover `app.html` only; there is no service worker. `stage.html` is the working Add New Coin staging form: do not break it.

## Write-layer invariants (the rules every write must keep; full write-ups in the docs/ files named in "Where to look")
1. **Allow-list.** `ALL_WRITABLE_COLUMNS` is the only way to a PATCH of the All sheet; `ALL_NEVER_WRITE_COLUMNS` (SpotValue, Total, CollectionID, CoinID, SetID, OriginSetID, CertLink, the media columns) have no code path. Formula columns (Total, SpotValue, GradeNum, Receipt and the other media columns, Albums.Status) are never written; a range PATCH must fill every cell, so a range stops at a formula column. A column a write needs but the header lacks refuses the whole write (F6: any non-blank value, and always Reviewed / LastModified; `PHOTOS_OPTIONAL_COLUMNS` excepted), and a cell holding a formula is never written (5.C; `readAllRowForWrite`, `assertNoFormulaCells`).
2. **Narrow audited writers** for the never-write columns, one column each: `writeCoinIdCell`, `writeNewRowKeyCells`, `writeOriginSetIdCell`, `writePurgedCell`. All writes to All happen in exactly six functions: `saveCoinRowToWorkbook`, `writeCoinIdCell`, `writeNewRowKeyCells`, `createAllSheetRow`, `writeOriginSetIdCell`, `writePurgedCell`. Do not add a seventh or widen the allow-list for convenience.
3. **Positions and rows are resolved at write time:** columns from the TABLE's own header row (`readTableHeaderRow`), re-read at the start of every write (`ensureAllHeaderMap({ fresh: true })`, `ensureSheetHeaderMap(sheet, { fresh: true })`; a table whose header is not on sheet row 1 is refused), rows by CollectionID read fresh (`findAllSheetRowNumber`), never a remembered index. Known gap (bi): for minutes after an Excel row insert / delete / sort, reads can be stale while writes go by address, so a save can hit the wrong row; no code check catches it (Copilot_Rules row 38 + a ~5-minute wait). Since (ax) these reads run at the same time (`readAllRowForSave`): Edit Coin's row read at its open-time row is used only after this save's fresh lookup, fresh header and the row's CollectionID confirm it, else the row is read again; that serial re-read refuses a row holding another CollectionID (reason "row-moved"). DB_Sets, DB_Coins, Containers, Albums, Wishlist and every Lookup_* sheet are never written.
4. **Concurrent edits block.** Opening Edit Coin snapshots the row; Save re-reads and any difference blocks the whole save (LastModified and Reviewed excluded); no partial write, no merge. One exception ((ax) Part 3): a read that is EXACTLY one of this app's own earlier row states from its saves of that coin in the last 10 minutes (every written column, LastModified to the whole second; `ownRowStates`) is Excel's delay, and is compared, and the write set worked out, with the app's latest written values. (bk) QA4: that exception applies only when the read and the app's last write of that coin did NOT go through the same Excel session (same generation, both with a session); in the same session it is compared as read. Overwriting a populated identity field asks first (`detectIdentityOverwrites`). A Set attach / detach instead checks its single cell fresh just before writing.
5. **Every app save blanks Reviewed and stamps LastModified last** (its own range, the last edit: F1) (Set link and Purge stamp LastModified but do not blank Reviewed). Photo-only and receipt-only saves stamp neither. LastModified is a local date-time; every other date column is a whole day.
6. **Dates go through `toWorkbookDate()`**: a whole Excel serial plus `numberFormat` in the same request, never text. `assertNoTextDatesInEdits` refuses any Date object or ISO date-time string. A new date column is added to `WORKBOOK_DATE_COLUMNS`.
7. **New rows claim the first blank row inside the table's lock, never append** (All, Photos, Receipts; the whole row must be blank). Ids (PhotoID, ReceiptID) are minted INSIDE the lock and never at or below one this session gave out (`lastMintedIds`). `addTableRow()` has exactly two callers: `createAllSheetRow()` and `writeRecordRow()`. A new All row reads the column first, writes keys only to a verified-empty row, verifies exactly one row carries the id, and is stamped Status "Owned". A row this session claimed is never claimed again in the session (`claimedRows`; a row it blanked itself returns to the pool); a key write Graph confirmed but no read shows yet stops the Promote with "not showing yet", and a retry refuses until a read shows it (`KEYS_NOT_VISIBLE_YET`), never claiming a second row.
8. **Locks coalesce a double tap** into one write: `coinPromoteInFlight`, `setLinkInFlight`, `coinPurgeInFlight`, `withAllRowCreationLock`, `withEditSaveLock`.
9. **Files are never overwritten.** Uploads use `NO_OVERWRITE` (`conflictBehavior=fail`; a 409 means pick a free name), names are chosen at Save (`freeSingleFilenames`, `nextFreeRepeatableFilename`, `freeReceiptFilename`), and a move onto an occupied name proceeds only when the bytes are identical (`moveFileWithoutOverwrite`). Whether a receipt is "the same document" is decided by BYTES (`sameFileBytes`), never by file name; one ReceiptID never points at two files. Replace, Recrop and remove never delete a file; remove detaches the row only. Only Purge (after a verified row detach) and a Staging-edit ✕ after its confirm delete.
10. **Photos and receipts on a saved record wait for Save** (Edit Coin, Edit Set, Manage Photos): nothing writes on pick, redraw, `visibilitychange` or `pagehide`. Save order: fields (conflict check), CoinID re-link, photo adds / replaces, removals, labels, receipt. A failed item stays pending (the pick is kept, never lost); a field conflict writes nothing else. ✕ on a Replace pick is an undo.
11. **Save only when something changed:** a form is dirty only while it differs from what it loaded, in the shape Save would write; a clean Save writes nothing. The leave guard asks `unsavedEditsForView()` afresh every time, never the button.
12. **The Photos and Receipts tabs are the only record** of a record's photos and receipt. The app never reads or writes the All media columns; a coin's receipt is its FIRST Receipts row (2+ rows are refused and flagged on the Docket); "Binder" is a Receipts row, not a file.
13. **Reads and writes target the same workbook** (`writePaths().workbook`; E3). `WRITE_TARGET` is derived from the build stamp ("The build decides its data target"); every write flag is plain `true`.
14. **Failure is loud and loses nothing:** non-optimistic (memory changes only after the write is confirmed), per-item results named by file, an orphan or blank row is recoverable and a clobbered formula is not. Purge detaches the row BEFORE deleting its file. Never blank a half-written row: a part-landed batch (`$batch` is split at `GRAPH_BATCH_LIMIT` 20) returns reason "partial" naming what did and did not land (`batchWriteError`, `partialSaveResult`).
15. **Set membership comes only from the child's `OriginSetID`** (the parent's CollectionID; a real parent row carries none). SetID is the issue-catalog id, never membership: at most one Set chip (`resolveChildParentSet`); "Issued in ..." is plain text (`setIssueRemarkFor`).
16. **Staging:** a coin draft is `Staging/{CollectionID}/coin.json` plus its photos; the reservation scans Staging folder names (monotonic max+1; a rejected mid-sequence id stays a permanent gap, only the top id is reusable); Promote carries the id forward and sets Promoted itself; only Ray's tap changes a draft's state.
17. **The device's saved copy of the workbook is display-only ((ao), IndexedDB `salty-cabinet-cache-{target}`).** Read in one place only, a live launch (`launchFromSavedCopy()`); never by a header map, row lookup, snapshot, conflict check, id minting or any `graph()` read. Writes are an ALLOW-LIST: only when the session is checked (a full read from the workbook this session, or a saved copy whose version matched) AND online; every other state refuses, including one added later (`workbookWritesAllowed()`; the `graph()` wrapper refuses every write method with a `ReadOnlyError`; tests fail if a client grows an ungated write method or an unknown state is allowed). Every workbook write deletes the copy before its first request. TEST and LIVE copies live in separate databases and never mix.
18. **One Excel workbook session for every workbook request ((bk)).** Every `/workbook/` request goes through `excelWorkbookFetch()` (the `workbook-session-id` header; every `$batch` sub-request carries it in `patchWorkbookRanges`); never a bare `fetch` to the workbook API (session-bk K1). Every workbook write runs inside a write step (`runWorkbookStep`): the session is made / reused / renewed only at a step's start, the step records its generation, and the `graph()` gate refuses a write under another generation (`SESSION_CHANGED`, nothing sent; the step reads again once, then refuses). Promote is one step; Edit Coin's CoinID re-link keeps the field save's generation. A session failure never blocks a save (no session = the old path); a write is never re-sent after a session rejection. Memory only, keyed by workbook path + account. Write-up: docs/ref/WRITE_LAYER.md "Workbook session (bk)".

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
- **Sheets:** (Lookup_Categories column A is READ for Add Coin's Category dropdown and, since (ar), Lookup_Finishes column A for its Finish dropdown; neither is ever written.) All (table `AllCoins`; owned coins, the `-A` / `-B` children and Set bundles), Photos, Receipts, Containers, DB_Coins, DB_Sets, Sets, Albums, Wishlist, DB_Rolls, ProjectPlan, ParkingLot, Lookup_* and Ref_*.
- **Workbook facts (coordinator's check, 4 Nov 2026; full list in WORKBOOK.md):** Total, SpotValue and GradeNum are table calculatedColumns; Receipt, Obverse, Reverse, Holder_Front, Holder_Back, References, COA_Photos, OGP_Photos, Other_Photos and Albums.Status are formulas too, so formula detection must read the range's `formulas`, not only `calculatedColumnFormula`. Photos has no OriginalFilename column; the app writes it only when the header has it (`PHOTOS_OPTIONAL_COLUMNS`; not an F6 case). DB_Coins has no Category; DB_Sets has no Type, Name or SetName (the app reads Description first). Wishlist headers are TargetPrice and DateAdded.
- **Files:** `app.html` (the app), `index.html` (connection test), `stage.html` (working staging form), `fonts/`, `manifest.json` + `icons/`, `vendor/pdfjs/`. OneDrive: `CoinCollection/` with CoinPhotos, CoinReceipts, ReferenceImages, Staging/{CollectionID}/ and `_Docket/`, and `_Testing/` as the copy target.
- Receipt photos auto-wrap to a single-page PDF (lossless; a picked PDF passes through unchanged).

## App structure
Single-page app "Salty's Cabinet", one MSAL redirect URI, internal navigation. Persistent nav, six items: Dashboard, Browse, Albums, Sets, Wishlist, Add Coin (the Dashboard's "Go To" tiles come from the same list). Batch Receipt, Stats & Value and Needs Attention are Dashboard-only destinations. Rolls has no nav entry or tile: only its own tab inside Browse.

## What NOT to build
- AI photo pre-fill from receipts/coin photos — shelved permanently. Redundant with
  free chat-based photo analysis Ray already gets through his Pro subscription.
- Batch order entry UI in the app — stays a chat + Copilot workflow.
- Live PCGS account login (docs/ref/PLATFORM.md "External data sources").
- localStorage/sessionStorage for anything that matters — use OneDrive as the
  actual store; the app should be re-derivable from OneDrive state at any time.

## Rules from merged work not covered by an invariant (the one-line summaries of merged work: docs/HISTORY.md "Merged-work one-line summaries")
- Save to Database and Promote need Finish and Category (Force Add excepted; `COIN_DEFAULT_CATEGORY`); a leftover draft of a coin already on All offers only "Mark as promoted"; Promote never overwrites a row already on All. [ADD_COIN_WRITE.md, DOCKET_STAGING.md]
- Guided Obverse / Reverse crop is offered on Add Coin, the Staging-draft edit and Edit Coin only, never on Manage Photos or Edit Set, and only from the pick itself. [PHOTOS.md]
- The Details photo viewer never lists receipts; it stops at both ends; if photo zoom is ever added, swipe works only when not zoomed. [PHOTOS.md]
- Finish list: Lookup_Finishes column A in sheet order, never "Various"; a value the list lacks stays as "— existing value". [ADD_COIN.md]

## Backlog
The open items, one line each, and the done list: [docs/BACKLOG.md](docs/BACKLOG.md) "Index (moved from CLAUDE.md 9 Nov 2026)". The order of the next tasks is in "Current state" above.

## Full design history
For the complete session-by-session reasoning behind these decisions, see the
project's Claude.ai knowledge base (Project: "Coin Collection"), particularly
`coin-collection-session-10Jul2026-app-design.md`. This file is the working
summary; that one has the "why."
