# Build plan for the November 2026 review (plan only, no code)

Written 14 Nov 2026 (docs only); on main since Ray's answers the same day. It turns Ray's decisions on the whole-app review into builds. The review itself is `docs/REVIEW_2026-11.md` (on main since the same commit; first written on branch `claude/app-review-2026-11` at `8720413`); finding numbers (A1-A20, B1-B10) are the review's. Code facts below were read in `app.html` at `85940b2` (main's code). Nothing was run; no code changed.

## Ray's decisions (14 Nov 2026)

- Part A: fix all 20 findings, grouped into builds.
- Q1: fewer than 5 folders in Staging on LIVE and on _Testing. A1 is not urgent; it goes in the first data-safety build.
- Q2: PH-00267's DateAdded shows a normal date. The date-format write did not cause (bw); the cause is still unknown; B1 is how it is caught next time.
- Q3: `stage.html` is not wanted: retire it (A12).
- A4: explain first exactly which files Reject deletes (below).
- Part B doing: B1, B2, B3, B4, B5 (both parts, including moving finished Staging folders to one "done" place), B6, B7, B10. Backlog, not now: B8 (now (bz)), B9 (now (ca)).
- Agreed order: 1. B2 + B10; 2. B6; 3. data-safety build 1 (A1, A4, A2, A12, B1, plus small Part A fixes that fit); then Promote / photo save (A3, A5, B3, B4; TEST on a device for B4's 409 case).
- Ray's answers to this plan's Q1-Q9 (14 Nov 2026): every recommended answer, with one change: B7 and A19's check move to right after Build 3 (B7 needs A1's paging), and the later builds are renumbered. The answers are listed at the end.
- Ray's answers to Part C, the crop review (14 Nov 2026): one crop-fixes build after Build 5 with C1 to C10 and tests T1 to T7; honour any trim that shows on screen (C6); white behind a see-through PNG (C8); an untouched Holder's camera data stays as it is (C11, no change). Ray takes 50 MP photos at times and has done holder, trim, Use Crop, Obverse / Reverse at 50 MP on the S25 (2 x 2 flips) without problems, so C2 and C4 are included but not urgent. The builds below are in the final order, renumbered to include it: ten builds.
- The two "plan first" builds have full plans at the end of this file: Build 8 (deadlines) and Build 10 (wrong row). Ray's answers to their questions (14 Nov 2026): Build 8, all four accepted as proposed; Build 10, QW1 to QW6 accepted as proposed, QW7 deferred until Stage 1's result is in. They are listed after the two plans.

## A4 explained: what Reject deletes after a Promote whose status write failed

**Answer: Staging only. Nothing in CoinPhotos or CoinReceipts is touched, and in this state nothing is there to touch: the Staging copies are the only copies.**

How the state arises (`promoteCoinDraft` -> `finishCoinDraftWrite`):
1. `promoteCoinDraftToAllSheet` writes the All row. It is real from this point.
2. `finishCoinDraftWrite` writes `coin.json` with `status: Promoted, allRowWritten: true`. It tries twice; a second failure throws.
3. The file move (`movePromotedCoinFiles`) is the line AFTER that write, so when the write throws the move never starts. Every photo (cropped files and kept originals), the receipt, and any older file kept after a Staging-edit Replace are still in `Staging/{CollectionID}/`. No Photos or Receipts row exists.
4. The refresh of the loaded All rows and the Staging redraw are also after the throw, so in the same session Staging Review still lists the draft as an ordinary draft, with Reject. (After a relaunch the loaded rows normally include the coin and the card shows only "Mark as promoted"; a launch from the saved copy, or a read that lags, may not.)

What Reject then does (`performRejectStagedCoin`): it reads `coin.json` fresh, sees `allRowWritten` false, and calls `deleteCoinDraft`, which is ONE Graph request: `DELETE` on the folder `Staging/{CollectionID}`. Graph removes the folder and everything in it. It goes to the OneDrive recycle bin (recoverable there for a limited time; Microsoft's stated period was not checked here).

After that: the coin is on All (with its CoinID), has no photos, no receipt, no rows on the Photos / Receipts tabs, and no draft.

The same state, by the same code, after: Force Add whose status write failed; Mark as promoted whose status write failed; and a draft whose coin was put on All in Excel (by hand or Copilot) in a session whose loaded rows do not show it yet.

Can Reject ever delete from CoinPhotos / CoinReceipts, or run while files are half-moved? No. The move starts only after `allRowWritten: true` is safely in `coin.json`, and Reject reads that file fresh and refuses when the flag is set.

Fix (Build 3):
- Reject refuses when ANY of these holds: a fresh read of All's CollectionID column shows the id; that read fails (cannot tell, so nothing is deleted); this session wrote that id's All row (a new in-memory set, which covers Graph's read lag); the draft's own flag. The refusal says to use Mark as promoted.
- When the status write fails, still refresh the loaded rows and redraw, so the card changes to "Already on the All sheet: Mark as promoted" at once.
- Correct the toast. Today it ends "photos retry at next launch", which is untrue in this state. New wording: the coin is on All, its photos are still in Staging, tap Mark as promoted to finish.
- Build 5 widens the launch retry to `allRowWritten && !filesMovedOnPromotion` whatever the status (today a Force Added coin is never retried). It waits for A5's row-reuse fix so a retry cannot duplicate rows.

## The builds

Sizes as in the review: S a few hours with tests, M about a day, L more. Every code build: a branch, affected suites plus negative controls while iterating, the full `npm test` once as the merge gate, docs in the same branch, Ray's go-ahead to merge.

Full test runs (Ray, 15 Nov 2026, after Build 1, which ran it seven times): ONE full `npm test` per round, as the gate, unless the build's acceptance here needs more; a build that needs more says so up front, in its plan or at the start of the round, with the count and why.

### Build 1: B2 parallel test runner + B10 split BACKLOG.md (S + S; no app code)

B2:
- `tests/run-all.js` runs suites N at a time (default 4; this machine has 4 cores), each suite in its own child process so suites cannot share state. `--serial` (or `TEST_JOBS=1`) keeps today's behaviour. Filters and `--list` unchanged.
- Output is buffered per suite and printed in file order, so the PASS / FAIL lines and the TOTAL line keep today's format.
- Accept when: sorted PASS / FAIL lines of a parallel run equal a serial run's exactly (5179 / 0 / 0, 102 suites), three parallel runs in a row agree, and the wall time is reported (expected about 4 to 5 minutes from 822 s).
- A suite that wobbles under load goes on a short named "run alone" list with the reason written beside it; no assertion is loosened and no timeout is raised to hide it.
- Hazards checked now: only `verify_pdf_receipt_viewer` opens a port and it asks for a free one; temp files use `mkdtemp`. One suite writes a golden file only on request.
- Seen during the crop review (14 Nov 2026): with four suite runs sharing this machine, `crop_from_upload` D4 and D5 failed twice and passed when run alone. Expect it to be the first suite on the "run alone" list, or fix its wait.

B10:
- Move the full text of finished items out of docs/BACKLOG.md into docs/HISTORY.md (the (bs) Build 3 plan and fix-round plan, (af), (al), (ar), (ao), (ax) Stage 1 + 2a, (bk) plans and answers, any other done item), leaving one line each with where it went. Still-open parts stay ((ax) 2b, (bk) F and the follow-up).
- Add this plan's builds to the Index, and (bz), (ca).
- Accept when: every line removed from BACKLOG.md is found word for word in HISTORY.md (checked by script, result in the report); docs/INDEX.md lists the moved headings; a grep of app.html comments, CLAUDE.md and docs/ for "BACKLOG" finds no pointer left dangling. Target: under about 40 KB from 150 KB.

### Build 2: B6 failure-injection suites (M; tests only)

- One shared in-page wrapper round the mock Graph client: "request N fails (nothing applied)" and "request N is applied but its answer is lost", for any method or writes only.
- Flows: Add Coin first save (Staging and Save to Database), Promote, Force Add, Mark as promoted, Reject, Edit Coin with photos, Manage Photos, receipts (own and shared), Purge, Add Set start.
- For each flow: run clean and count the requests K; then for every N from 1 to K, both kinds; after each, check four things: no pick lost, no row duplicated, nothing deleted that is still referenced, the message matches what landed. Then Save again / retry / relaunch and check the end state equals the clean run's.
- The sweep will hit findings not fixed yet (A2, A3, A4, A5, A8, A14 at least). They are recorded as a KNOWN list, each entry tagged with its finding, and the suite asserts the violations found equal that list EXACTLY: a new violation fails, and a fixed one fails until its entry is deleted. So each later build must delete its entries, and that deletion is the fix's negative control. The list only shrinks.
- One suite file per flow so the parallel runner spreads them. Must-fail self-check in each. Negative control for the wrapper itself: with injection switched off the sweep must report no violations, and with one seeded fault it must report exactly that one.
- No fixed real-time waits in the new suites (Ray, 15 Nov 2026, after Build 1): every wait is on a condition, with a generous ceiling, never a sleep sized for a thing to happen; crop_from_upload showed that fixed waits fail under the parallel runner.
- Also in Build 2, test-only (Ray, 15 Nov 2026, Build 1 Q2 and Q3):
  - Fix `verify_crop_from_upload`'s wait (D4 / D5 failed under load: a 10 s ceiling in its `flow()` helper ran out when the suite took 13.0 s instead of about 3.3 s) and delete its entry from `RUN_ALONE` in `tests/run-all.js`. Deleting the entry is the fix's negative control: three parallel full runs in a row with it back in the pool must stay 0 failed.
  - Find out why `verify_crop_basics` takes about 190 s in some runs and about 40 s in others (both runners; it always passes; the slow case looks like a wait running to its ceiling) and fix it in the suite only, never by loosening an assertion. When slow it adds about 30 s to the parallel gate.

Build 2 result (15 Nov 2026, branch `claude/build2-failure-tests`, MERGED 15 Nov 2026 by fast-forward to `daafae4` on Ray's go-ahead; tests only, app.html unchanged; write-up docs/ref/PLATFORM.md "Failure injection (B6, Build 2)" and "Image encodes and idle time (Build 2)"):
- 11 failure suites (`tests/verify_fi_*.js`), 196 KNOWN lines. Which build deletes which: Build 3 deletes A2 (30), A4 (8), A16 (4); Build 5 deletes A3 (105), A5 (24), A14 (3); Build 7 deletes A17 (4); Build 8 deletes A8 (7). Each build runs `FI_PRINT=1 npm test -- fi_` before and after its fix; the lines its finding owns must be gone, and no new line may appear.
- Seen in the sweep, inside A2 (no new finding): in Save to Database, a failed or lost final draft write says "nothing was written" (A8's wording) while the draft's files landed, and Save again reserves a NEW id and promotes it, so the coin gets a second row on All under another CollectionID. Build 3's A2 fix (switch to the draft-edit mode for the same id) covers it; Build 3's TEST should include it.
- NEW findings (not in the review; none loses data; not fixed in Build 2, which is tests only):
  - N1 Receipt upload whose answer is lost: `landedName` is set only when the upload's answer arrives, so Save again picks the next free name (`_03`) and uploads a second copy; the `_02` copy is left with no row. The review's "receipts are idempotent on retry" holds only when the answer arrives. Fix: on retry with no `landedName`, check whether the name tried last time now holds the same bytes (`sameFileBytes`) and adopt it, as A14's fix does for photos. S; with A14 (Build 5).
  - N2 Purge: a file delete that fails AFTER its row was detached leaves the file in CoinPhotos with no row, and Purge again cannot see it (Purge lists rows). Fix: name the file in the result ("removed from the record, still in OneDrive: …") and keep it on a session list that Purge again deletes (after a fresh check that no row names it). S.
  - N3 Purge: the Purged flag write fails, yet Purge reports success; the flag stays blank. Fix: report the flag's failure, and let Purge again with nothing left to delete write the flag only. S.
  - N4 Purge: the detach's row write lands but its answer is lost (or its second PATCH fails): the files are rightly kept, but Purge again skips the photo because its row is gone, so its files and the flag are never finished. Fix: on retry, a photo whose row is already gone still has its files deleted when a fresh read shows no Photos row names them. S.
  - Placed (Ray, 15 Nov 2026, Build 2 Q2): N1 in Build 5 with A14; N2, N3, N4 in Build 7 with A17. Those builds delete the N lines from the fi_ KNOWN lists as their negative control.
- Read-failure sweeps (every method, not only writes): not now (Ray, Build 2 Q3); revisit after Build 5 (backlog (cd)).

### Build 3: data-safety build 1: A1, A4, A2, A12, B1, plus A16 (M to L; device TEST)

A1:
- `listChildren()` follows `@odata.nextLink` to the end and asks for `$top=999`. A listing that fails part-way throws: a partial list is never returned, so the reservation refuses instead of guessing.
- A NEW draft's first `coin.json` / `set.json` is written with `conflictBehavior=fail`. On 409 the app reads what is there: if it is this same save's own draft (a random token stored in the draft), carry on (the lost-answer case); otherwise stop: "that id is already in use in Staging; nothing was overwritten; Save again".
- Suite: the real client against a stubbed `fetch` serving 250 folders in pages. Negative control: without the paging loop the newest id is missed and the check fails.

A12:
- Staging folder names count for the reservation only when they match `^AY-\d{5}$` exactly. All's own column keeps accepting child suffixes (`AY-00012-A`).
- Retire `stage.html`: it becomes a plain notice page (the form was retired; a link to the app; no sign-in, no script; Ray's Q3); `verify_files_picker` follows (38 pinned inputs become 30); CLAUDE.md and PLATFORM.md lines updated. Ray removes the `stage.html` redirect URI in Entra when convenient (nothing depends on it).

A4: as "Fix (Build 3)" above.

A2:
- After a first save in which any photo or the receipt failed to upload, the form is NOT reset. It switches to the existing Staging-draft edit mode for that id, with the landed files marked landed and the failed picks (and their crops) still in place; Save retries only those (`uploadStagingEditFiles`).
- Save to Database with a failed file stops at the draft and says so; it does not put the coin on All without its photo. (Ray's Q4: yes.)
- The simpler "just don't reset the form" is not safe on its own: Save again would reserve a second id and write a second draft.

A16 (small, same code as A1's first-write change): Add Set writes `set.json` before its photos, and `uploadDraftPhoto` stops overwriting (a free name, as elsewhere).

B1:
- The failure toast carries the reason (`entry.uploadError`, the step that failed), not only the file name.
- Docket > About keeps the last 10 saves' steps (today only the last), newest first, with a Copy button. Memory only.

Device TEST (short checklist written with the build): a save with the signal cut mid-upload (A2); Reject on a coin already on All (A4); the save log and Copy (B1); a normal Add Coin and Promote; and (Ray, 15 Nov 2026, Build 2 Q4) the Save to Database double-row case: a Save to Database whose final draft write fails (signal cut after the photos land), then Save again, must NOT reserve a new id or put a second row for the coin on All.

Small, recorded after Build 1 (Ray, 15 Nov 2026): the app.html comment near line 6828 that points to "docs/BACKLOG.md (ao)" is changed to point to docs/HISTORY.md "Moved from BACKLOG.md (B10, 15 Nov 2026)" (ao) (B10 moved that text; Build 1 left app.html alone).

Build 3 result (15 Nov 2026, branch `claude/build3-data-safety`, code `2fb62fd`; HELD for Ray's device TEST and merge go-ahead; write-up docs/ref/ADD_COIN_WRITE.md "Build 3 of the November 2026 review"):
- Done as planned: A1 (paging, no partial list; a new draft's first write no-overwrite with a token), A12 (exact AY-##### names; stage.html a notice page; verify_files_picker 38 -> 30 inputs), A2 (the edit of the same id; Save to Database stops at the draft; the double-row case closed), A16, A4 (Reject's three refusals; refresh on a failed status write; the toast), B1 (reasons in the toasts; the last 10 saves with Copy), and the (ao) comment now pointing at docs/HISTORY.md.
- Choices made in the build (in the report's questions): after Save again finishes a Save to Database first save it promotes, as the first save would have; a first write whose outcome is unknown keeps its id and token for Save again (`addCoinPendingFirstWrite`), which the plan did not spell out but the double-row case needs; a name a first save sent with no answer is checked by bytes before it is sent again (Staging only; A14 for CoinPhotos stays in Build 5).
- KNOWN lines deleted: A2 30, A4 8, A16 4 (as planned), and 6 A8 lines in verify_fi_addcoin that A2's change rewords ("nothing was written" after a failed or lost draft write while files had landed). 196 -> 148. Negative controls: each fix put back in turn brought its lines back (A4: 8; A2 edit mode: 17 + 17; A2 same id: the 2 "lost coin.json" lines; A16: 7).
- New suite `tests/verify_build3_data_safety.js` (20 checks; P1-P3 A1 on the real client with a stubbed fetch of 250 folders in pages, N1 A12, W1-W4 the first write, D1-D2 A2 and the double-row case, R1-R4 A4, B1-B2); its negative control (paging off, the old name parse, the session set off, the log kept at 1, no-overwrite off) failed 8 checks.
- Gate: TWO full runs (one was planned). Run 1 at `2fb62fd`: 5260 passed, 1 failed (the new suite's B1: the copied log and the compared log were made in different milliseconds, and the log's first line carries the time), 114 suites, 288 s. Test fixed in `d86c6ed` (compare without that clock; negative control: a truncated copy still fails). Run 2 at `d86c6ed`: 5261 passed, 0 failed, 0 page errors, 114 suites, 280 s; sorted PASS / FAIL lines equal run 1's except that suite. 50 affected suites before the gate: 2347 / 0 / 0 in 114 s.
- Ray's answers to the Build 3 report (15 Nov 2026, all as recommended): Q1 the 6 A8 lines go with A2 (Build 8 keeps A8's last line, in verify_fi_edit_coin); Q2 keep: Save again after a Save to Database first save promotes once every file is in; Q3 TEST step 7's hand-typed AY-y row on _Testing All is a _Testing leftover; Q4 the "promoted from Staging Review while the form still holds failed picks" case is a backlog line only (BACKLOG (ce)), no fix now; Q5 Ray removes the stage.html redirect URI in Entra after the merge, when convenient (an open action for him, in CLAUDE.md Current state). LIVE at the time: Build 127 · `79e9bf4` (Builds 1 and 2 deployed).
- Ray's device TEST (15 Nov 2026, Build 129 · `051c29a`, S25, _Testing; steps 1-11): every Build 3 fix passed (A2 retry and the same id, the double-row case, Reject's refusal at row 628, Reject of an ordinary draft, the next id, the stage.html notice, the save log's Copy). BLOCKER B-1: an Add Set start with a "Whole set" photo saved only set.json (AY-00764). Cause: Add Set saved only the Package / OGP front (set.jpg); every other photo of its photo section was dropped, on main too (not A16). Fixed in `67a9cc8` with F-1 to F-6 (save log for Add Set; "not finished" and "promoted" outcomes; the Save again label; long toasts up to 25 s; the file count; the tile's "Save again"); write-ups docs/ref/ADD_SET.md "Add Set saves every photo (B-1)" and docs/ref/ADD_COIN_WRITE.md "TEST round fixes". Notes: N-a (the Mark as promoted card appeared after a second refresh: the (bi) read lag), N-b (a Complete Set's card has no actions: existing design; backlog (cf)). Gate for the round: one full run at `67a9cc8`: 5268 passed, 0 failed, 0 page errors, 114 suites, 253 s.
- Ray's repeat TEST (16 Nov 2026, Build 131 · `bc9b260`, S25, _Testing): steps 2 (5 Set photos, "with 5 files", all 6 files in Staging), 3 (Whole set front only, "with 1 file"), 4 (save log), 5 (tracked Set, coin saved, log entry) and 9 ("with 3 files") PASSED; step 6 (optional) and steps 7-8 (Airplane mode) SKIPPED, not failed (covered headless by L1 / L3 / L4 and the first TEST's steps 4-5). Answers: Q1 hold Add Set on LIVE until merged and deployed, then Ray checks LIVE Set drafts for missing photos and re-takes them; Q2 "longer only"; Q3 Whole set front; Q4 keep the Pause message; Q5 Ray deletes _Testing/Staging/AY-00764 by hand. MERGED 16 Nov 2026 by fast-forward to `bc9b260` on Ray's go-ahead.


### Build 4: B7 the read-only consistency check, with A19 (M; plan first)

Moved here by Ray (14 Nov 2026): it needs only Build 3's paging, and it shows existing damage before the later builds change anything.

B7: one Docket screen, GET only, run on Ray's tap: Photos rows whose file is missing; files in CoinPhotos / CoinReceipts with no row; one file on two rows; duplicate PhotoIDs ((u)); coins on All whose photos are still in Staging; drafts whose id is on All; two Receipts rows for one coin; Photos / Receipts rows whose CollectionID is not on All (A19); unexpected folder names in Staging (A12). A Copy button. It never fixes anything.
- It lists CoinPhotos and CoinReceipts with Build 3's paged `listChildren()`; a listing that fails part-way is reported as "could not check", never as a clean result.
- Plan first: where it sits on the Docket, how long a full pass takes on LIVE's folders, and the wording of each line.

A19: no code beyond B7's check. One Copilot_Rules line for Ray to add: never delete the newest row of All without its Photos and Receipts rows.

A19's workbook side is DONE (15 Nov 2026): Copilot added the rule to Copilot_Rules in the LIVE workbook. After Copilot reorganised that sheet the rule is Copilot_Rules **rule A12** (sheet row 16), next to Copilot_Rules **rule A11** (sheet row 15, the append-only rule for All / Photos / Receipts). Those are Copilot_Rules IDs, NOT the review's findings A11 (wrong-row detector, Build 10) and A12 (Staging folder names, Build 3). In these docs a Copilot_Rules rule is always written "Copilot_Rules rule A12", never a bare "A12".

#### Build 4 full plan (16 Nov 2026; plan only, no code; read in `app.html` at `67a9cc8`, main `21f5bd3`, LIVE Build 132)

**What it is.** A button on the Docket that reads OneDrive and the workbook, compares them, and lists what does not line up. It sends GET requests only, never fixes anything, never saves its result anywhere (memory only, gone on reload), and runs only when Ray taps it. Its job is to show damage that the findings fixed in later builds (and old builds, (v), (u)) may already have left, before those builds change anything.

**1. Where it sits (Q1).** A new collapsed accordion on the Docket, "Check files and rows", between "Other / Requires Photos" and "About". Inside: one line saying what it does ("Reads the photo and receipt folders, the Photos, Receipts and All tabs and Staging, and lists anything that doesn't line up. Changes nothing."), a "Run the check" button, and after a run the result with a "Copy the result" button. Its findings are NOT counted in the Docket's fob or in the three section counts: it is a report on demand, not a to-do list, and the fob must not change because a check was run.

**2. What it reads (fresh, GET only; never the loaded indexes or the device's saved copy).**
- All: the CollectionID column (`readTableColumn`, 1 request).
- Photos and Receipts: every row, with sheet row numbers, through the existing `readRecordRows` path with the header read fresh (`ensureSheetHeaderMap(sheet, { fresh: true })`): 3 requests each.
- CoinPhotos and CoinReceipts: Build 3's paged `listChildren()` (1 request per 999 names).
- Staging: `listChildren(stagingBase)`, then for each `AY-#####` folder its own listing and its `coin.json` or `set.json` (2 to 3 requests per folder; Staging holds fewer than 5 folders, Ray, 14 Nov).
- Expected total today: about 12 requests plus 2 to 3 per Staging folder. No new Graph client method: it uses only read methods the client already has, so the session gate's "no ungated write method" tests stay as they are.
- No Excel workbook session is made or renewed (sessions are made only at a write step's start, invariant 18); the reads use the existing session header if one exists, as any read does.
- The device's saved copy is never read and never deleted (a read does not delete it; invariant 17).
- Each request has a 60 s ceiling (Build 8's agreed figure for a small request; Build 8 later replaces it with the shared deadline). A part whose read fails or runs out of time says "Could not check: <reason>". It is never shown as "none found", and the summary then says "Incomplete".

**3. How long a full pass takes on LIVE.** Not measured (no LIVE access here). Estimate: about 12 to 25 requests; the CoinPhotos listing is the only one that grows with the collection, at one request per 999 files with names only. On a good connection a few seconds; on mobile data perhaps 10 to 20 s. The comparisons are in memory and take well under a second for thousands of rows (tested at 3,000 files and 1,500 rows, K13). Every run shows its own time and request count in its first line, so the device TEST and the first LIVE run measure it.

**4. What it checks, and the wording of each line.** File names are compared without regard to letter case (OneDrive names are case-insensitive, so such a file still opens). Each section shows its count; "None found." when empty; at most 20 lines on screen per section, then "and N more (all of them are in Copy)".
- First line: "Checked 16 Nov 14:02 · TEST (_Testing) | LIVE · 4.1 s · 14 reads · Nothing was changed." Then "No problems found." or "N to look at." or "Incomplete: some parts could not be checked (below)."
- 4.1 Photos rows whose file is missing. "PH-00267 · AY-00012 · Obverse · AY-00012_obverse_cropped.jpg is not in CoinPhotos (Photos row 45)." A row with a blank Filename is listed here as "has no file name".
- 4.2 Receipts rows whose file is missing (Binder rows skipped: they have no file). "RC-00030 · AY-00092 · AY-00092_receipt.pdf is not in CoinReceipts (Receipts row 12)."
- 4.3 Rows whose CollectionID is not on All (A19). "PH-00301 · AY-00770 (Photos row 300): AY-00770 is not on All." Plus, when the id is at or above the next id the app would hand out (max of All and Staging, plus 1; computed from the reads above, no extra request): "This id has not been handed out yet: the coin that gets it will show this photo." Below it: "This id will not be handed out again." Same for Receipts rows.
- 4.4 One file on two rows. Photos: "AY-00012_obverse_cropped.jpg is on Photos rows 45 (PH-00267) and 112 (PH-00301)." Receipts: one file under two or more ReceiptIDs; and one ReceiptID naming two or more files (invariant 9: one ReceiptID never points at two files). One ReceiptID and one file on several coins' rows is a shared receipt, by design, and is NOT listed.
- 4.5 Duplicate PhotoIDs ((u)). "PH-00129 is on Photos rows 130 and 131."
- 4.6 Coins with two or more Receipts rows. Already a Docket row for owned coins; here every All id is included (Former Holdings too). "AY-00092 has 2 Receipts rows (rows 12, 40)."
- 4.7 Files in CoinPhotos with no Photos row, in three groups:
  - "No row, and AY-00770 is not on All" (a deleted row or a save that never finished).
  - "No row; the coin is on All" (a save that wrote the file but not its row, A3 / A5's damage; a photo removed in the app also looks like this, because remove keeps the file, invariant 9). When the coin has a row of the same kind (the name without its trailing `_NN` matches), the line adds "same kind as <file on its row>: probably an older copy kept after a Replace or Recrop".
  - "Name has no CollectionID" (anything not starting `AY-#####_`).
  - Counted only, not listed (Q2): kept originals beside their crop. `X_original[_NN].<any ending>` whose `X_cropped[_NN].<any ending>` is on a row (`croppedNameForRaw`; any ending so that it still works after Build 6's C9 names a PNG original `.png` beside a `.jpg` crop). One line: "Kept originals beside their crop: 312 (expected)." A kept original whose crop has no row is listed with that crop in the groups above.
- 4.8 Files in CoinReceipts with no Receipts row: the same groups; a name starting `RC-#####_` is matched to the Receipts tab's ReceiptIDs instead ("RC-00031_receipt.pdf: no Receipts row carries RC-00031"); seller-date names and picked names go to "Name has no CollectionID".
- 4.9 Staging.
  - Unexpected folder names (review A12): anything not exactly `AY-#####` and not the Docket's own `_Docket`. "20261114-213000 is not a draft folder name; the app ignores it."
  - An `AY-#####` folder with neither coin.json nor set.json: "AY-00764 holds no draft file (N files); its id stays reserved."
  - A draft whose id is on All but whose draft is not closed (coin.json not Promoted and no `allRowWritten`; set.json not Promoted): "AY-00762 is on All but its draft is still open: use Mark as promoted."
  - A coin on All whose photos are still in Staging (its folder holds files other than coin.json / set.json): "AY-00762 is on All; 3 files are still in Staging/AY-00762 (photos not moved)."
- What it does NOT check (said in one line under the result): whether a file is the right picture; files overwritten by Replace before 27 Oct on LIVE ((v): undetectable); the All media columns (already Docket rows, drift); Albums; empty (0-byte) files (Q7).

**5. Refusals and double taps.**
- While a save is running (`activeSaveTiming` set) the button says "A save is running: run the check when it has finished." and sends nothing. If a save starts during the check, the result says "A save ran during this check, so some lines may be out of date: run it again."
- A second tap while it runs does nothing (one run in flight, `consistencyCheckInFlight`; the button reads "Checking…").
- Signed out, or no live data (`liveDataMode()` not live): "Sign in and load the workbook first." Offline: it runs and each part says "Could not check: offline" (it never uses the saved copy instead).
- The check reads whatever Graph answers. After an Excel or Copilot edit, reads can lag for minutes ((bi)), so the screen says under the result: "Ran less than 10 minutes after an Excel edit? Run it again later before acting on a line." (The app cannot know when Excel was edited, so this line always shows.)

**6. Copy.** "Copy the result" copies the same text as the screen, every line of every section (no 20-line cap), plain text, with the build line first. The result is kept in memory until the next run or reload.

**7. Where in the code (new, one block; no existing function changes behaviour).**
- `runConsistencyCheck()`: the reads (section 2) through a read-only view of the client, `consistencyReadClient()`, which exposes only the read methods the check needs and throws on any other name, so a write cannot be added to the check by accident.
- `compareConsistency(data)`: pure, no Graph, returns the sections; the suite drives it directly with built data as well as end to end.
- `consistencyResultText(result)` (screen and Copy share it), `renderConsistencyCheck()`, `copyConsistencyResult()`.
- Reused, not changed: `listChildren`, `readRecordRows`, `ensureSheetHeaderMap`, `readTableColumn`, `getJson`, `stagingFolderIdNumber` / `STAGING_DRAFT_FOLDER_RE`, `croppedNameForRaw`, `isBinderReceiptName`, `COIN_DRAFT_STATUS`, `SET_STATUS`, `writePaths()`.
- Markup: one `.detail-accordion` (`#docketCheckAccordion`, `#docketCheckRunBtn`, `#docketCheckResult`, `#docketCheckCopyBtn`), styles scoped to it (E1).

**8. Tests: new suite `tests/verify_build4_consistency_check.js`** (must-fail self-check first; mock client seeded with All ids, Photos / Receipts rows, CoinPhotos / CoinReceipts files and Staging folders; draft fixtures copy `COIN_DRAFT_STATUS` / `SET_STATUS` from the code, working rule 4).
- K1 A clean collection: every section "None found.", "No problems found.", "Nothing was changed."
- K2 One case of each damage kind in 4.1 to 4.9, seeded one at a time: exactly one line in its own section, matched on its ids, file and row number (E4: text only correct code produces), and nothing in any other section.
- K3 Kept originals: `_original.jpg` beside `_cropped.jpg`, `_original_02.jpg` beside `_cropped_02.jpg`, and `_original.png` beside `_cropped.jpg` are counted, never listed; an original whose crop has no row is listed.
- K4 Receipts: a shared receipt (one ReceiptID and file on three coins) gives no line; Binder rows give no "missing file"; one ReceiptID naming two files gives a 4.4 line; two rows for a Former Holdings coin give a 4.6 line.
- K5 A19: a Photos row for an id above max(All, Staging) says "has not been handed out yet"; an id below it (a rejected gap) says "will not be handed out again"; a Staging max above All's max is honoured; a child id (`AY-00012-A`) on All gives no line.
- K6 Staging: "2026 old" and a 15-digit name are unexpected; `_Docket` is not; an empty `AY-` folder; an open draft whose id is on All; a promoted coin whose folder still holds a photo; a Set draft whose parent is on All.
- K7 Paging, on the real client with a stubbed fetch (as Build 3's P1 to P3): 2,500 files in CoinPhotos served in 3 pages; a no-row file on page 3 is found; a failure on page 2 shows "Could not check" for 4.1, 4.7 and 4.4's file part, never "None found".
- K8 Read failures: each of the check's requests fails in turn (a sweep, the fi_ wrapper's "request N fails"; then "no answer" with the ceiling shortened through a test seam): the affected parts say "Could not check", the others still report, the summary says "Incomplete".
- K9 Read-only proof: a whole run through a spy on the client records no method in `GATED_GRAPH_METHODS` (or any upload / delete / patch / move / batch); the Excel session generation is unchanged; the saved copy is not deleted.
- K10 Refused while a save is running (no request sent); a save started mid-check gives the "run it again" line; a double tap runs once.
- K11 Copy equals the screen text line for line once the screen's "and N more" caps are lifted (compared without the clock, Build 3's B1 lesson).
- K12 UI: the accordion sits between "Other / Requires Photos" and About; the fob and the three section counts are unchanged by a run with findings; no horizontal scroll at 384 px with a 200-character file name.
- K13 Size: 3,000 files and 1,500 rows compare in under 1 s in the suite's browser.

**9. Negative controls** (each put in, the named checks must fail, then taken out):
- Paging off (first page only): K7 fails.
- Original pairing off: K3 fails (originals listed).
- Shared-receipt rule off (each coin's row counted as another "file on two rows"): K4 fails.
- "Could not check" collapsed into an empty list: K7 and K8 fail.
- A `deleteItem` or `uploadJson` call added to the check: K9 fails (and the read-only view throws).
- The next id from All only (Staging ignored): K5 fails.
- The save-running refusal off: K10 fails.
- Case-sensitive name compare: K2's mixed-case case fails.

**10. Existing suites to run while iterating** (affected): `docket` (sections, row tags, missing photos), `splash_docket`, `load_report`, `session_gate`, `device_cache`, `build3`, `fi_`. The full `npm test` ONCE, as the merge gate (expected 115 suites).

**11. KNOWN lines in the fi_ suites.** None deleted: B7 and A19 own no lines (the 148 left belong to A3, A5, A14, A17, A8, N1 to N4). `FI_PRINT=1 npm test -- fi_` before and after must print the same 148 lines: the check adds no writes and runs only on a tap, so no flow's request count changes.

**12. Device TEST (TEST build, S25, _Testing).**
1. Docket > Check files and rows > Run the check. Expect a result with its time and reads in the first line and "Nothing was changed". Note the time.
2. Paste the Copy into chat. Each line is reviewed with chat-Claude against what you know of _Testing (expected: PH-00129 on two rows, (u); the Build 3 TEST leftovers).
3. In OneDrive, put any photo into `_Testing/CoinPhotos` named `AY-09999_obverse_cropped.jpg`. Run again: it is listed under "No row, and AY-09999 is not on All". Delete the file afterwards.
4. Run, and switch on Airplane mode at once. Expect "Could not check: …" in the parts not read and "Incomplete" at the top, never "No problems found". Airplane mode off, Run again: complete.
5. Tap Run twice quickly: one run.
6. While a Save of a test coin is running (Edit Coin, a photo added), open the Docket and tap Run: refused with the "A save is running" line. (Optional: hard to time on a phone; covered headless by K10.)
7. After the merge and the LIVE deploy (Q3): run it once on LIVE and paste the Copy. It changes nothing; it also answers (u) (duplicate PhotoIDs on LIVE) and part of the B-1 check of LIVE Set drafts.

**13. Docs with the build.** Write-up: docs/ref/DOCKET_STAGING.md "Consistency check (B7, Build 4)"; HISTORY one-line; CODEMAP section; CLAUDE.md: one rule line ("The consistency check is GET only, on a tap, never fixes and never saves its result; a part it could not read says so, never 'none found'") and Current state; BACKLOG: Build 4 done, (u) updated after the LIVE run.

**14. Size and risks.** M (about a day, with tests). No data risk: GET only, proved by K9 and its negative control. Risks: noise (expected leftovers on LIVE could run to hundreds of lines: the groups and the counted-only originals keep them apart, Q2); a long CoinPhotos listing on mobile data (measured by step 1 and the LIVE run); reads lagging after an Excel edit giving false lines (the note in 5).

**15. Questions for Ray (Build 4 plan)**
- Q1. The check is its own collapsed Docket accordion "Check files and rows", above About, and its findings never change the Docket counts. [Recommended: yes.]
- Q2. Expected leftovers (kept originals beside their crop) are counted only; older copies after a Replace and files of removed photos are listed in the "coin is on All" group with the "same kind as" hint, not hidden. [Recommended: yes.]
- Q3. After the merge and the LIVE deploy, run it once on LIVE and paste the Copy (TEST step 7). It is GET only; it also answers (u) on LIVE. [Recommended: yes, as part of the build's acceptance.]
- Q4. Copilot_Rules references: CLAUDE.md invariant 3 and BACKLOG (bi) said "Copilot_Rules row 38" for the append-only rule; this docs commit changes them to "Copilot_Rules rule A11 (sheet row 15)" from your message. WORKBOOK.md quotes Copilot_Rules A6 (Lookup_Categories) and A14, and an app.html comment quotes A7 (LastModified); the reorganisation may have renumbered them. [Recommended: ask Copilot for the current Copilot_Rules list (ID, row, one line each) and paste it once; the docs are fixed in a docs-only commit; the app.html comment is fixed in Build 4's branch.]
- Q5. Build 9 moves finished folders to `StagingDone/`, out of the reservation's sight; A19 then rests on All alone (and on Copilot_Rules rule A12). [Recommended: record now in Build 9 that the reservation also counts `StagingDone` folder names (max of All, Staging, StagingDone).]
- Q6. 60 s ceiling per read in the check. [Recommended: yes; Build 8 replaces it with the shared deadline.]
- Q7. Empty (0-byte) files are not checked: it would need sizes in `listChildren`, which the reservation also uses. [Recommended: leave out; a backlog line.]

### Build 5: Promote / photo save: A3, A5, B3, B4, plus A14, A18, (bv) (M to L; device TEST)

Also (Ray, 15 Nov 2026, Build 2 Q2): N1 (a receipt upload whose answer is lost; fix: adopt the earlier file when its bytes match, as A14). Delete its KNOWN line in verify_fi_receipts.

A5 first, because A3 and the wider launch retry depend on it:
- Before claiming a row for a repeatable photo, look for a row with the same CollectionID and Filename and reuse it.
- The row and its date format go in one request (first check why `patchRecordRow` sends the format separately; All's writers already send value and format together).

A3:
- `filesMovedOnPromotion` is set only when every Photos / Receipts row was written. Otherwise the draft is left for the launch retry, and the toast and the Docket say which records are missing. Same change in `movePromotedSetFiles`.
- The launch retry covers `allRowWritten && !filesMovedOnPromotion` whatever the status.
- A refused move (a different file already at that name) is shown on the Docket with the file names instead of retrying silently for ever.

B3: one read of the Photos table per Save; ids minted and rows claimed for all of the Save's photos inside one lock; one write per row. The lock, the blank-row claim, `lastMintedIds` and `claimedRows` stay. A suite asserts the request count for a four-photo Save.

B4:
- Promote moves each file with Graph's move (one small request) instead of download and re-upload.
- Before the move, look at the destination. Taken: go to today's compare path (identical bytes finish the move; a different file is refused, source kept). Free: move with `conflictBehavior=fail`.
- After a move with no answer, look at both ends before deciding anything.
- A18: after any move or copy, the destination's size must equal the source's.
- Not verified (the Microsoft documentation site is not reachable from this environment): what a move onto a taken name does on a personal OneDrive. The device TEST decides: put a different file of the same name in `_Testing/CoinPhotos`, promote, expect a refusal with both files unchanged. If Graph renames or overwrites instead, B4 ships only with the look-first step proven sufficient, or is dropped.

A14: a 409 on a photo upload compares bytes and adopts the file when identical (as receipts do). (bv): "replaced" is said only when a file was uploaded in this Save.

Device TEST: the 409 case above; a four-photo Save timed before and after; a Promote on mobile data.

### Build 6: crop fixes: C1 to C10, tests T1 to T7 (M; device TEST)

Added by Ray (14 Nov 2026) from Part C of the review. Display and pixel code only: nothing here writes to the workbook, and the (ak) rules stay (trim-only types are never downscaled; an untouched JPEG keeps its own bytes; Obverse / Reverse at 1400 px, JPEG 0.92, one encode, cut from the original).

- C1: with no fine angle (a total turn of 0, 90, 180 or 270 degrees) the crop is rounded to whole original pixels and copied: whole-pixel placement, no scaling. With a fine angle a resample stays (it cannot be avoided). Test (T4): a one-pixel checkerboard trimmed at an awkward box position stays 100% black and white; a whole-photo 90-degree turn of 4000 x 2252 is an exact turn. Negative control: without the rounding both fail.
- C2: the width and height known from opening the crop screen are reused, so the "over 60 MP" guard no longer decodes the full photo just to measure it; the display copy is made with a resized decode. Test: the count and size of decodes for a 50 MP Obverse and a 63 MP Holder (today 3 full, and 2 full + 1 resized).
- C3: the circle's encode result is checked before the screen closes; on failure the circle screen stays open with the same message Stage 1 uses. Test (T7): the encode forced to return nothing.
- C4: a result that is all black from a picture that is not black is refused with a message; nothing is added. Test: drawing forced to do nothing.
- C5: the guard never scales up. Test (T7): 7800 x 7800 stays 7800 x 7800.
- C6 (Ray: honour any trim that shows): the "untouched" tolerance drops from half a display pixel to rounding noise only. Tests (T6): a 2 px drag at 4x view zoom is saved as a trim; a box never moved, a turn of the phone, and an angle taken to a value and back to 0 still keep the original bytes.
- C7: after a fine turn in Stage 1, the margin handed to the circle stops at the photo itself, not at the empty corners of its outer rectangle. Test: the Part C case (10 degrees, a box near the edge, zoomed out) has no black in the circle.
- C8 (Ray: white): a picture with see-through areas is painted on white before it is encoded. Test: a half-transparent PNG Reference.
- C9: the kept original of a non-JPEG Obverse / Reverse takes the ending of what it is (.png, .webp). Everything that pairs a crop with its original by name learns the other endings; files already stored are not renamed. The riskiest small item here, because names are shared with Replace, Recrop and Purge: those suites run with it.
- C10: `runCropPipeline` catches a failed open and shows the existing "couldn't be cropped" message; the camera path gets the same file test as the library path. Test: a file that will not decode.
- T1: the two JPEG quality settings are pinned by tests (negative control: 0.5 must fail). T2: the Staging-draft edit's save uploads the full picture (negative control: the tile copy must fail). T3: crop-from-an-uploaded-photo on a draft reads the full picture. T5: a photo with a camera turn (EXIF orientation 6) runs through the crop suites: untouched, trimmed, Obverse and its kept original.
- Left alone: C11 (an untouched Holder keeps the camera's data; Ray, 14 Nov 2026).
- Device TEST: a trimmed and a turned Holder at 50 MP; an Obverse and a Reverse cut from a 50 MP holder; a PNG Reference; Use still on screen without scrolling (the (bs) rule). Added by Ray (14 Nov 2026) for C9, because the kept original's name is shared with Replace, Recrop and Purge: on a coin whose kept original has a different file ending from its display copy (a PNG pick: `_original.png` beside `_cropped.jpg`), do a Replace, a Recrop and a Purge, and check each finds, keeps or removes the right files.

### Build 7: small fixes pack: A9, A10, A15, A17, A20 (S each; M together)

Also (Ray, 15 Nov 2026, Build 2 Q2): N2, N3, N4 (Purge leftovers; fixes in "Build 2 result" under Build 2). Delete their KNOWN lines in verify_fi_purge.

- A9: a failed CoinID re-link files the Docket entry `flagCoinIdNeedsRelink` writes, so it is not a toast only.
- A10: Edit Set's fields that are not saved become read-only, with one line saying so, until (r) is built.
- A15: updates to an existing Photos / Receipts row write only the cells that change (as `replaceFileCells` does). Needed before (ag) or any new column on either tab.
- A17: a shared receipt's "all coins" update goes in one `$batch`; a part-landed batch reports what landed.
- A20: an Edit save refuses when All holds the same CollectionID twice, naming both rows.

### Build 8: writes that cannot hang or mislead: A7, A8, A6 first part (M to L; device TEST)

- A7: one shared deadline for every request the app sends through its Graph layer. A write with no answer is reported as "may have been saved", never "not saved". Takes in backlog (ap) 1.5 with 2.4.
- A8: when a workbook write gets no answer, the row is read back and the report says what is there.
- A6 first part: no resume / version check starts while a save is running; it runs when the save ends.
- Full plan: "Full plan, Build 8" below. Ray accepted it as proposed (QD1 to QD4, 14 Nov 2026).

### Build 9: Staging housekeeping: B5, A13 first part (M; plan first)

B5:
- Drafts are read a few at a time, each folder once per refresh (today the coin pass and the Set pass each fetch from every folder).
- Finished folders move to one place, `CoinCollection/StagingDone/{CollectionID}` beside Staging (and under `_Testing` for TEST), one Graph move per folder (Build 5's helper). Finished means: Promoted, files moved, every record written. A Force Added coin still awaiting research is not finished.
- The move runs at launch only, and only for an id that a fresh All read shows, so the reservation never depends on a folder that has left Staging.
- Supersedes the Staging part of (aa), which said delete; Ray chose move (14 Nov 2026).
- Build 4's check learns the done place (a draft there whose coin is not on All is reported).

A13 first part: Docket and draft JSON uploads send `If-Match` with the file's eTag; a mismatch re-reads and re-applies once. The rest of A13 stays with (bp).

### Build 10: A11 wrong-row detector, and A6 second part (S probe, then M; a TEST decides each part)

- A11 in two stages: a read-only probe first (does a read placed inside the write's own batch see the rows the write will hit?), and the guard itself only if the probe says it can be trusted.
- A6 second part ("may this save write" decided once per save) is built only if the save log shows mid-save refusals after Build 8.
- Full plan: "Full plan, Build 10" below. Ray accepted it as proposed (QW1 to QW6, 14 Nov 2026); QW7 is deferred until Stage 1's result is in.

## Where every finding lands

Part A: A1 Build 3 · A2 Build 3 · A3 Build 5 · A4 Build 3 (its launch-retry part Build 5) · A5 Build 5 · A6 Build 8 (second part Build 10) · A7 Build 8 · A8 Build 8 · A9 Build 7 · A10 Build 7 · A11 Build 10 · A12 Build 3 · A13 Build 9 (the rest stays (bp)) · A14 Build 5 · A15 Build 7 · A16 Build 3 · A17 Build 7 · A18 Build 5 · A19 Build 4 · A20 Build 7.
Part B: B1 Build 3 · B2 Build 1 · B3 Build 5 · B4 Build 5 · B5 Build 9 · B6 Build 2 · B7 Build 4 · B10 Build 1 · B8 backlog (bz) · B9 backlog (ca). (bv) Build 5; (bw) is met by B1.
Part C: C1 to C10 and tests T1 to T7 Build 6 · C11 no change (Ray).

## Ray's answers to Q1-Q9 (14 Nov 2026)

- Q1. The review file and this plan go on main, docs only. Done in the commit that recorded these answers.
- Q2. Yes: Build 2's suites pass at merge by listing today's known failures (the KNOWN list), and each fix deletes its entries.
- Q3. `stage.html` becomes a plain notice page: a few lines saying the form was retired, with a link to the app; no sign-in, no script.
- Q4. Yes: Save to Database stops at the draft while a photo or the receipt has not uploaded.
- Q5. Yes: B1's save log is memory only for now.
- Q6. Yes: in B3 the Photos tab's header and table are read once at the start of a Save and used for all of that Save's photos. This narrows "re-read at the start of every write" (invariant 3) to "once per Save" for the Photos tab only; the build that does it records the rule in CLAUDE.md.
- Q7. Yes: the done place is `CoinCollection/StagingDone/`, beside Staging.
- Q8. Changed by Ray: B7 and A19's check come right after Build 3. Final order, with the crop-fixes build Ray added the same day: 1 B2 + B10; 2 B6; 3 A1, A4, A2, A12, B1, A16; 4 B7 + A19; 5 A3, A5, B3, B4, A14, A18, (bv); 6 crop fixes C1 to C10 + T1 to T7; 7 A9, A10, A15, A17, A20; 8 A7, A8, A6 first part; 9 B5, A13 first part; 10 A11, A6 second part.
- Q9. Yes: A6's second part waits for B1's evidence from LIVE.

## Ray's answers to Part C (14 Nov 2026)

- QC1. He takes 50 MP photos at times, to crop an Obverse / Reverse from them, and has done holder, trim, Use Crop, Obverse / Reverse at 50 MP with 2 x 2 flips on the S25 without problems. C2 and C4 are included, not urgent.
- QC2 / QC3. One crop-fixes build after Build 5: C1, C2, C3, C4, C5, C6, C7, C8, C9, C10 and tests T1 to T7 (Build 6).
- QC4. Yes: any trim that shows on screen is honoured. QC5. Yes: white behind a see-through PNG. QC6. Yes: an untouched Holder's camera data stays as it is.

# Full plan, Build 8: writes that cannot hang or mislead (A7, A8, A6 first part)

Written 14 Nov 2026, plan only. Code facts are from `app.html` at `85940b2`. It comes after Build 5 on purpose: Build 5 makes a repeated photo-row write and a repeated upload safe (A5, A14), and this build relies on that when it says "tap Save again".

## The model: the spot-price update

The spot-price update (`spotWithTimeout`, `commitSpotPriceUpdateInStep`, `checkSpotPriceWorkbook` behind the "Check what's in the workbook" button) already does what this build needs everywhere else:
1. every request has one deadline (60 s);
2. a write that got no answer is never called "not written": it is "may have written";
3. the app then reads back and judges each cell by what it holds now;
4. because a read can lag a write, it reads again a few times before giving up, and never writes again on its own;
5. after "may have written" there is no blind retry: the next step looks first.

This build applies those five rules to every save.

## What is wrong today

- A7. `putContent` (uploads), `excelWorkbookFetch` (every workbook request), the `$batch` POST in `patchWorkbookRanges`, `deleteItem`, `getItemMeta`, `getFileBytes` and `listChildren` are plain `fetch` calls with no deadline. A request that never answers leaves Save spinning under the save lock ("Still saving, wait for it to finish") until the app is closed. Only the launch reads (12 s, `withRequestTimeout`), the Docket queue read and the spot-price update have a deadline.
- A8. When the `$batch` POST gets no answer, `batchWriteError` writes "Nothing was saved", because nothing was confirmed. The batch may have been applied. `saveCoinRowToWorkbook` returns reason "error", nothing is recorded as the app's own write, and the next Save reports a conflict that lists the values Ray just typed.
- A6 first part. `maybeCheckOnResume()` starts a version check whenever the app becomes visible again (for example on return from the camera), with no "a save is running" test. If that check times out it sets the connection to "unreachable" and the save's next request is refused part-way; if it finds a new version it starts a full re-read, which can drop the Excel session and get the save's next write refused as SESSION_CHANGED.

## What changes

### 1. One deadline, in the one place every Graph call already passes through
- `graph()` hands out a wrapper (`gatedGraphClient`) that every client method call goes through, real client and test mock alike. The deadline goes there, so no call site can forget it and the mock gets it too (the tests need that).
- When the deadline passes, the call rejects with a `TimeoutError` (the same name the spot-price code already tests for) that carries the method and what it was doing.
- The real client's requests also carry an abort signal, so a timed-out request is actually cancelled on the phone (a 12 MB upload must not keep sending behind a retry). This covers the token wait, the request and reading the answer's body, as `withRequestTimeout` does for the launch reads. It is the "one shared fetch helper" of backlog (ap) 2.4.
- The deadlines, each a constant with a test seam:
  - a workbook request (read, write, `$batch`, add a table row): 60 s, the spot-price figure;
  - a small file request (a draft's JSON, the Docket file, a folder listing, a file's details, a delete, a move): 60 s;
  - a photo or receipt upload or download: by size, at least 60 s, allowing for 20 KB a second, at most 10 minutes (a 12 MB Holder gets 10 minutes; a 300 KB Obverse gets 60 s). An upload that goes through an upload session gets this per piece. Ray (QD1): yes, and the 10-minute cap stays (uploads are normally done at home on a good connection); T4 is the backstop.
- The launch reads keep their own 12 s. Picture reads for tiles and the viewer do not go through `graph()` and are not changed.
- Each timeout is a line in the save's steps (B1's log): what was waiting, for how long.

### 2. What a timeout or a lost answer means, by what was being done
The rule: only a request that could not have changed anything may be reported as "not saved".

- A READ timed out, and this save has sent no write yet: "Not saved: the workbook did not answer (the header read). Nothing was sent. Your changes are still on this screen." The lock is released; Save again starts from the top.
- A WRITE timed out, or its answer was lost (the request threw after it was sent): the result is UNKNOWN until read back.
  - An All-sheet field save (`saveCoinRowToWorkbook`): read the row back once more (`readAllRowForWrite`, its own deadline) and judge each written column as `partialSaveResult` already does:
    - every column holds the new value: the save is reported as saved ("the workbook did not answer, but a read just now shows your changes"), and recorded as the app's own write exactly as a confirmed save is (`noteOwnRowState`, `noteRecentRowWrite`);
    - some hold it: today's "only part of this save reached the workbook" result, unchanged;
    - none holds it, and the read went through the same Excel session as the write: "Not saved: the workbook did not answer, and a read just now shows the old values." Still worded as a read, not a promise;
    - the read-back failed or timed out too, or there was no session: "May have been saved. Your changes are still on this screen. Wait a minute, then tap Save: the app checks what arrived before it writes anything."
  - In the "may have been saved" and "not saved after no answer" cases the app remembers what it tried to write. On the next Save, a row that now holds exactly those values is the app's own save arriving, not someone else's edit: it is not reported as a conflict, and only what still differs is written. This uses the existing own-write record (`ownRowStates`, invariant 4's exception), extended from "a save Graph confirmed" to "a save whose answer was lost". The 10-minute limit and the same-session rule of (bk) QA4 stay. Ray (QD3): yes, cell for cell: every cell the save tried to write must hold exactly the value it tried to write. This is an agreed extension of invariant 4's exception; the build that ships it adds it to invariant 4's text in CLAUDE.md.
  - The `$batch` with several chunks: ranges confirmed before the silent chunk are "saved"; the silent chunk's are "may have been saved" until the read-back decides; later chunks are "not sent". `batchWriteError` and `partialSaveResult` gain that third list. The case "the answer arrived but its body could not be read" is treated the same way (today it falls through as a plain error).
  - A Photos or Receipts row write: the photo or receipt stays pending with "May have been saved: tap Save again". Save again is safe after Build 5 (a row with the same coin and file name is reused).
  - An upload: "May have uploaded: tap Save again". Save again is safe after Build 5 (a 409 on identical bytes adopts the file).
  - Promote's key write (`writeNewRowKeyCells`): treated exactly as "Graph confirmed it but no read shows it yet" is today (`KEYS_NOT_VISIBLE_YET`, invariant 7): the row counts as claimed, Promote stops, a retry looks first and never claims a second row, and after 10 minutes without the id showing the write is taken as lost. No new rule.
  - A delete (Reject, Purge's file, a Staging-edit remove): "may have been deleted"; a retry is safe because a file already gone counts as done.
  - A draft's JSON or the Docket file: unchanged (the same content sent again is harmless; `finishCoinDraftWrite` already tries twice).
- Nothing is ever sent again automatically after a workbook write with no answer (invariant 18's "never re-sent" stays, and now covers a timeout).

### 3. The wording
- "Nothing was saved" is used only where nothing was sent.
- One shared set of sentences for the three states (saved by read-back / may have been saved / not saved, nothing sent), used by Edit Coin, Edit Set's photo and receipt saves, Manage Photos, Add Coin's save, Promote, Force Add, Mark as promoted, Set attach / detach, Purge and the Docket re-link.
- The save lock always ends: the longest a save can now run is the sum of its deadlines.

### 4. A6 first part: no check starts during a save
- "A save is running" is `activeSaveTiming` (set by `withSaveTiming`, which already wraps Edit saves, Add Coin's save, Promote and Mark as promoted, and by the gate for a write outside a timed save). The build first lists every save path and puts any that is missing under it.
- `maybeCheckOnResume()`, the `online` event and the 30-second retry timer: when a save is running they note that a check is owed and do nothing else; `endSaveTiming()` runs the owed check when the save ends.
- A save that starts while a check (or the re-read it triggered) is already running waits for it first, with a limit, shown as a save step.
- The `offline` event is not deferred: going offline still refuses the next request at once, with today's message.
- Invariant 17 is unchanged: every write is still asked "may I?" per request, and a save still starts only when the session is checked and online. Deferring a new version check does not weaken a save's own protection, which is its fresh reads and the conflict check (invariants 3 and 4); the version check exists to keep the screen's data current.

## Where (functions)

`gatedGraphClient` / `timeGraphCall` (the deadline); `RealGraphClient` methods, `excelWorkbookFetch`, the `$batch` POST, `putContentInSession` (the abort signal); `patchWorkbookRanges`, `batchWriteError`, `partialSaveResult` (the unknown chunk and the read-back); `saveCoinRowToWorkbook`'s catch, `finishCoinRowSave`, `noteOwnRowState` / `ownRowStatesFor` (the attempted state); `writeNewRowKeyCells`, `createAllSheetRow`, `keysNotVisibleRows` (Promote); `commitGalleryPhoto`, `savePendingPhotos`, `photoSaveFailureText`, `commitReceiptCaptureInStep` (photo and receipt wording); `maybeCheckOnResume`, `wireConnectionWatch`, `scheduleConnectionRetry`, `endSaveTiming`, `checkSessionAgainstWorkbook` (A6). The spot-price code is left as it is; its suite must pass unchanged.

## Tests

New suite `tests/verify_write_deadlines.js` (shared check helper, must-fail self-check; deadlines shortened through the test seams; a mock wrapper with three behaviours for one chosen request: never answers; applies the write and never answers; applies the write and throws).
- D1. Edit Coin, the `$batch` is applied and never answers: reported saved by read-back; the next Save writes nothing and shows no conflict. Negative control: without the read-back it says "Nothing was saved" and the next Save lists Ray's own values as a conflict (today's A8).
- D2. The same, not applied, with a session: "not saved … a read just now shows the old values"; the form is still dirty; Save again writes once.
- D3. The same, and the read-back times out too: "may have been saved"; then (a) the row holds the new values: the next Save reports no conflict and writes nothing more; (b) the row holds the old values: the next Save writes normally, once.
- D4. Two chunks, the second silent: the message names saved, may-have-been-saved and not-sent columns; LastModified is not claimed as stamped unless the read-back shows it.
- D5. A read (the header re-read) never answers: "not saved, nothing was sent" at the deadline; the lock is released; Save again works.
- D6. A photo upload never answers: the pick stays pending with "may have uploaded"; Save again ends with one file and one row.
- D7. A Photos row write is applied and never answers: Save again reuses the row: one row.
- D8. Promote's key write is applied and never answers: Promote again adopts that row; not applied: a retry claims no second row inside the 10 minutes.
- D9. The real client against a `fetch` that never resolves: each method rejects with a TimeoutError at its deadline AND the request's signal is aborted; a body that never finishes is covered too.
- D10. A source check, like session-bk K1: no `fetch(` in the real client, `excelWorkbookFetch` or the batch writer without the signal; no client method reachable without the deadline.
- D11. The size rule for uploads (a pure function): 300 KB, 2.5 MB, 12 MB, 60 MB.
- D12. A6: the app becomes visible during a save: no version check starts (count the calls), and exactly one runs after the save ends; going offline during a save still refuses the next write with the offline message; a save started during a check waits for it. Negative control: without the deferral the mid-save check starts.
- D13. The phrase "Nothing was saved" appears in a result only when the write log of that flow is empty (asserted across D1 to D8).
- The spot-price suite, session-bk, save-speed-ax, write-safety-al and device-cache-ao run unchanged as affected suites.

B6 (the failure-injection suites of Build 2):
- This build adds a third kind of fault to the shared wrapper, "request N never answers", beside "fails" and "the answer is lost". It cannot exist before this build: without deadlines it would hang the suite.
- It is swept over every flow B6 covers. Three checks are added to B6's four: the flow ends (inside the sum of its deadlines); the lock is released; and "the message matches what landed" now includes "never says not saved when the write was applied".
- KNOWN entries this build must delete: every "answer lost on a workbook write: message says nothing was saved" entry (A8) for Edit Coin, Promote, Force Add, Mark as promoted, Set attach / detach and Purge; and any "next Save shows a conflict on its own values" entry.
- Negative controls recorded with the build: deadline removed (the hang test must fail by its own guard, not hang the runner); read-back removed (D1); deferral removed (D12).

## What Ray checks on TEST (S25, _Testing)

- T1. Ordinary saves feel the same: an Edit Coin field save, a save with two photos, a Promote. About's save steps show no new waits.
- T2. Edit Coin, change Grade, tap Save, and switch on airplane mode straight away. Expect a "may have been saved" or "not saved, nothing was sent" message (never "Nothing was saved" unless nothing was sent), the form still showing the change, and the Save button free again. Airplane mode off, wait a minute, Save: no conflict naming his own change; the row in Excel holds the new Grade once.
- T3. The same with a photo save (airplane mode during the upload): the photo stays "tap Save again"; after Save again there is one file and one Photos row.
- T4. A 50 MP Holder saved on mobile data with a weak signal: the upload is not cut off; the save steps show its time against its allowance.
- T5. Start a save with three photos, switch to another app for ten seconds, come back: the save finishes; About shows the version check ran after the save, not during it.
- T6. A spot-price update still works as before.
- T7 (if it can be arranged): Wi-Fi that is connected but has no internet, during a save: after about a minute the save ends with a message instead of spinning.

## Size and risks

Size: M to L. The deadline and the signal touch every real client method; the result handling touches the All save path and the photo and receipt messages; the tests are the larger half.

Risks:
- A deadline cuts off a slow upload that was still moving. Guard: the size rule, and T4. If T4 fails the allowance is raised, not removed.
- "Not saved" after a read-back, and the write lands later. Guard: that wording is used only for a read through the same session; and the next Save looks before it writes, so the worst case is the same values written once more.
- Counting a row that already held the same values as "saved". Harmless: it holds what was wanted.
- The own-write exception grows (a write whose answer was lost). Agreed by Ray (QD3, 14 Nov 2026); the build adds the line to invariant 4.
- The abort signal is new plumbing in every real client method. Guard: D9, D10 and the full run.
- Depends on Build 5 for safe repeats of rows and uploads. If the order ever changes, D6 and D7 fail and say why.

# Full plan, Build 10: wrong-row writes (A11) and A6 second part

Written 14 Nov 2026, plan only. This build is the least certain of the ten: its main part rests on something only a TEST on the real workbook can show. So it is planned in stages with a stop after the first.

## What A11 is about

- Every write to All goes by sheet address after a lookup: find the row that holds this CollectionID, then write to "row N". Known gap (bi): for minutes after a row is inserted, deleted or sorted in Excel, a READ through Graph can show the sheet as it was, while a WRITE lands on the sheet as it is. A save can then go to the wrong row, and nothing notices.
- Since (bk), every request of a save goes through one Excel session, and Ray's TEST (a) of 8 Nov passed at 3 minutes after an insert. What is still open: a save with no session (creating one failed, so the save went the old way); and risk F, a save under about a minute after an Excel for the web edit, which no session can see yet.
- The review's idea: put a read of the target row inside the same `$batch` as the write, as its first request. It runs in the same place and order as the writes, so it should show the row the writes are about to hit. After the batch, check that row held this coin. This does not prevent a wrong write; it turns a silent one into a loud one with the overwritten values in hand.

## What is not known, and why there is a Stage 1

- Not known: whether a read inside a batch sees what the batch's writes hit, in the minutes when an ordinary read is stale. If it is as stale as an ordinary read, the guard is worthless for (bi). If it is current, the guard works.
- Also not known: whether, with a session, there is any stale window left at all. If there is none, the guard only matters for saves without a session.
- The guard cannot cover risk F. In that window the edit has not reached the workbook service, so the read and the write agree with each other and both are wrong together. F stays a matter of the 5-minute habit.

## Stage 1: a read-only probe (S)

- A TEST-build-only tool in Docket > About, "Row check probe". Ray names a test coin. Each tap makes three reads of "what does the row I would write to hold?" and shows them side by side with the time:
  1. the save's own way (the column lookup, then the row read);
  2. a single read through the Excel session;
  3. a read placed inside a `$batch`, as the guard would place it (a batch with that one GET, nothing else).
  A switch runs the same three without a session. A Copy button. It writes nothing: no PATCH anywhere in it.
- Ray's TEST (tablet or PC with Excel for the web beside the app, _Testing): insert a blank row above the test coin in Excel; tap the probe at about 10 s, 30 s, 60 s and 3 min; note what Excel itself shows. Then the same with "no session". About 15 minutes.
- What the result decides:
  - the in-batch read is current while another is stale: the guard works; Stage 2 goes ahead.
  - all three are always current with a session, and stale only without one: Stage 2 goes ahead for the saves without a session, or the simpler answer is taken instead: refuse to save without a session (a question for Ray then).
  - the in-batch read is stale too: Stage 2 is dropped. A11 is closed as "cannot be detected this way", (bi) stays a rules-and-wait gap, and the write-up says so.
- Tests for the probe: it sends no write of any kind (the J pattern of the photo suites: any non-GET request fails the check, the batch POST carrying only a GET excepted and its body checked); it is absent from a LIVE build.

## Stage 2: the guard (M), only if Stage 1 says yes

### What changes
- `patchWorkbookRanges` takes a guard: the target row's address and what its key cell must hold (this coin's CollectionID; or "the whole row blank" for a new row's key write). The first request of the first chunk is a GET of that row's values and formulas, with the session header; every PATCH already depends on the request before it, so the GET runs first. One more sub-request, no extra round trip. A chunk holds 19 writes instead of 20.
- After the batch answers, the key cell the GET returned is compared with what was expected.
  - The same: nothing changes.
  - Different: the writes have gone to a row that held something else. The result is a new reason, "wrong-row", carrying the row number, what the row held, and for every written cell its value and formula before and the value written.
- All five places that write All by address pass a guard, built by one helper: `saveCoinRowToWorkbook`, `writeCoinIdCell`, `writeNewRowKeyCells` (and through it `createAllSheetRow`), `writeOriginSetIdCell`, `writePurgedCell`. A write to All without a guard is refused in code, the way a column off the allow-list is.
- Photos and Receipts row writes get the same guard through the same helper: an update is guarded by its PhotoID / ReceiptID cell, a claim by "the whole row blank".
- When "wrong-row" comes back (one shared handler):
  1. the save stops: no CoinID re-link, no photo rows, no receipt, no second batch (Promote's data write never follows a key write that hit a wrong row);
  2. a dialog that must be answered, not a toast: which row, which coin it belongs to, and each cell: "Grade was MS65, now MS66". A Copy button;
  3. the same details are filed on the Docket, so they survive closing the app;
  4. nothing is put back automatically. Ray repairs the row in Excel from the list (Ray, QW2: yes; a "put the old values back" button is a backlog note, (cb), to consider after the TEST);
  5. every workbook write is refused until a full re-read has finished and 10 minutes have passed (the standing 10-minute rule), with a message saying why (Ray, QW3: yes, both conditions).
- Model: the spot-price update's "read back, judge each cell, report per cell, and count All's formulas before and after as a guard". The dialog's list is that per-cell judgement, for a row instead of a price.

### Tests
New suite `tests/verify_row_guard.js` (shared check helper, must-fail self-check). The mock client learns one new behaviour: ordinary reads can be served from the sheet as it was before a row was inserted, while a batch (its GET and its PATCHes) sees the sheet as it is.
- G1. An ordinary Edit Coin save: one batch POST as today; its first request is the GET, with the session header; every PATCH depends on it; the result is as before.
- G2. Stale lookup, Edit Coin save: the result is "wrong-row"; the dialog lists exactly the cells overwritten, each with its old value (and formula) and the new one; nothing else was written after the batch; a Docket entry exists; the next Save is refused until the re-read and the wait. Negative control: without the guard the same case reports "saved" (today's silent wrong-row write).
- G3. Stale blank-row read at Promote: the key write lands on a row that held a coin: "wrong-row" with that coin's old keys; no data write follows.
- G4. Each of the five All writers, and the Photos / Receipts writers, sends a guard (behaviour and a source check); a write to All without one is refused and nothing is sent.
- G5. 25 edits: two chunks, the limit of 20 requests respected, the guard in the first.
- G6. The guard's own GET fails: nothing is written (the chain stops), and the message says so.
- G7. No session: the guard is still sent and a mismatch is still reported.
- G8. The guard's GET reads formulas as well as values, and a formula cell that was overwritten shows its formula text in the list.
- G9. The TEST-only switch (below) does nothing on a LIVE build.
- Affected suites run unchanged: write-safety-al, save-speed-ax, session-bk, the Promote and Purge suites, photo-receipt-write.

B6:
- A new fault for the shared wrapper: "ordinary reads are one inserted row behind". Swept over Edit Coin save, Promote (keys, then data), Force Add, Mark as promoted's blank-cell fill, the CoinID re-link, Set attach / detach, Purge's flag, and a Photos row update. For each, B6's checks "nothing overwritten that is still referenced" and "the message matches what landed" must hold in one of two ways: nothing was written, or "wrong-row" was raised and names every overwritten cell.
- If Build 2 or a later build has already recorded these as KNOWN entries (tagged A11 / (bi)), this build deletes them. If not, this build adds the fault and records "today: silent" as its negative control.
- The "fails" and "answer lost" faults are run again over the same flows with the guard in the batch: Build 8's read-back and messages must still be right with one more request in the batch.

### What Ray checks on TEST (_Testing only)
- T1. Ordinary saves and a Promote behave as before; the save steps show the batch one request larger and no slower in any way he can feel.
- T2. The guard firing for real. A wrong-row write cannot be staged safely by hand, so a TEST build has a switch in About: "aim the next save at the row below (TEST only)". With it on, an Edit Coin save of a test coin writes to its neighbour. Expect: the dialog, naming the neighbour and each cell's old and new value; the Docket entry; saves refused for 10 minutes. Ray compares the dialog's old values with Excel's version history, and repairs the neighbour by hand from the list. The switch turns itself off after one save and does not exist on a LIVE build (QW4).
- T3. After the 10 minutes and a refresh, saving works again.
- T4. Stage 1's insert-a-row steps once more with the real guard in place, saving at 3 minutes: saved to the right row, no alarm (no false alarm is as important as a true one).

### Size and risks
Size: Stage 1 S; Stage 2 M.
- The premise may be false. Guard: Stage 1, and the build stops there if so.
- It detects; it does not prevent. A wrong write still happens; what changes is that Ray knows at once and has the old values.
- It does not cover risk F.
- A false alarm would block saving for 10 minutes and send Ray to check a row that is fine. Guard: Stage 1 measures whether the in-batch read can be wrong; T4.
- One more request in every All write. Expected cost: none Ray can feel; measured in T1.
- The TEST-only switch writes to a wrong row on purpose. Guard: _Testing only by the build-stamp rule, one save, a suite check (G9).

## A6 second part: built only on evidence

- Today the gate asks "may this write go?" before every request, so a save can be refused part-way when the connection state changes mid-save. Build 8 removes the known cause (a check started during a save). What may remain: a check that was already running when the save began and fails after it; and connection trouble raised by one of the save's own requests.
- The evidence (Ray's Q9): B1's save log marks a refusal that came after the save's first request ("refused mid-save: unreachable"). If Ray meets a failed save whose log shows that line, in normal use after Build 8 is on LIVE, this part is built. If four weeks of normal use pass without one, it is closed and recorded as closed.
- If built (M, with its own short plan then):
  - a save takes a permit when it starts (the same test as today: session checked, online). While that save runs, its requests are refused only for going offline and for a session change (invariant 18, unchanged). "Unreachable", "unchecked" and "unknown" arising mid-save no longer stop the rest of that save; they still stop the next save from starting.
  - the permit belongs to one save and ends with it (and after the sum of its deadlines at the latest).
  - invariant 17's wording changes from "every write is checked" to "every save is checked when it starts; a save that has started is stopped only by going offline or a session change". Ray signs that off then.
  - tests: a mid-save change to unreachable lets the save finish; going offline mid-save still refuses; a new save while unreachable sends nothing; the permit does not carry to the next save; the device-cache suite's "an unknown state refuses" still holds at a save's start.
  - risk: it loosens a gate. The argument for it: a save stopped half-way (file uploaded, row not written) is worse than a save allowed to finish what it started.

# Ray's answers to the two full plans (14 Nov 2026)

Every question is answered; nothing here is waiting on Ray except QW7, which he deferred on purpose.

Build 8 (deadlines): all accepted as proposed.
- QD1. Yes. 60 s for a workbook or small file request; a photo by size, 60 s to 10 minutes at 20 KB a second. The 10-minute cap stays (uploads are normally done at home on a good connection). T4 stays as the backstop.
- QD2. Yes. After a write with no answer, the row is read back; the values present means it is reported saved.
- QD3. Yes. The next Save treats "the row holds exactly what I tried to write", cell for cell, as its own save, not as someone else's change. This extends invariant 4's exception from "a save Graph confirmed" to "a save whose answer was lost"; Build 8 adds it to invariant 4's text when it ships.
- QD4. Yes. The deadline covers reads as well as writes.

Build 10 (wrong row): accepted as proposed, one deferred.
- QW1. Yes. Two stages. Stage 1 is the read-only probe. Stage 2 is built only if the in-batch read is current while another read is stale.
- QW2. Yes. Show the overwritten values, file them on the Docket, repair by hand; no automatic undo. Backlog note (cb): consider a "put the old values back" button after the TEST.
- QW3. Yes. After a wrong-row write, saving is refused until a full re-read has finished AND 10 minutes have passed.
- QW4. Yes. The TEST-only "aim the next save at the row below" switch: one save, _Testing only, never on LIVE.
- QW5. Yes. Photos and Receipts row writes are guarded in the same build (Stage 2 only).
- QW6. Yes. A6's second part is built only if a LIVE save log shows "refused mid-save" after Build 8; it is closed after four weeks without one.
- QW7. DEFERRED. Decide when Stage 1's result is in; leaning yes (refuse to save without a session, instead of the guard, if only saves without a session are at risk). It would change invariant 18's "a session failure never blocks a save", so it needs its own sign-off then.

Build 6 addition (Ray, same day): C9's TEST gains a Replace, a Recrop and a Purge on a coin whose kept original has a different file ending from its display copy (written into Build 6 above).

## Not verified

- Graph's page size and order for a folder's children (A1), and what a Graph move does when the name is taken on a personal OneDrive (B4): the Microsoft documentation site could not be reached from this session. A1's fix does not depend on either number; B4 is settled by its device TEST.
- The parallel runner's time (about 4 to 5 minutes) is an estimate from 822 s on 4 cores, not a measurement.
- Nothing here was run: no suite, no probe, no device.
- The two full plans (Builds 8 and 10) were written from the code; nothing was run for them. Build 10's premise, that a read placed inside a batch sees the rows the batch's writes hit, is unverified by design: its Stage 1 exists to test it. The deadline figures in Build 8 (60 s; 20 KB a second for uploads) are proposals, not measurements.
