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
- Ray's answers to this plan's Q1-Q9 (14 Nov 2026): every recommended answer, with one change: B7 and A19's check move to right after Build 3 (B7 needs A1's paging), and the later builds are renumbered. The builds below are in that final order; the answers are listed at the end.

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

Device TEST (short checklist written with the build): a save with the signal cut mid-upload (A2); Reject on a coin already on All (A4); the save log and Copy (B1); a normal Add Coin and Promote.

### Build 4: B7 the read-only consistency check, with A19 (M; plan first)

Moved here by Ray (14 Nov 2026): it needs only Build 3's paging, and it shows existing damage before the later builds change anything.

B7: one Docket screen, GET only, run on Ray's tap: Photos rows whose file is missing; files in CoinPhotos / CoinReceipts with no row; one file on two rows; duplicate PhotoIDs ((u)); coins on All whose photos are still in Staging; drafts whose id is on All; two Receipts rows for one coin; Photos / Receipts rows whose CollectionID is not on All (A19); unexpected folder names in Staging (A12). A Copy button. It never fixes anything.
- It lists CoinPhotos and CoinReceipts with Build 3's paged `listChildren()`; a listing that fails part-way is reported as "could not check", never as a clean result.
- Plan first: where it sits on the Docket, how long a full pass takes on LIVE's folders, and the wording of each line.

A19: no code beyond B7's check. One Copilot_Rules line for Ray to add: never delete the newest row of All without its Photos and Receipts rows.

### Build 5: Promote / photo save: A3, A5, B3, B4, plus A14, A18, (bv) (M to L; device TEST)

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

### Build 6: small fixes pack: A9, A10, A15, A17, A20 (S each; M together)

- A9: a failed CoinID re-link files the Docket entry `flagCoinIdNeedsRelink` writes, so it is not a toast only.
- A10: Edit Set's fields that are not saved become read-only, with one line saying so, until (r) is built.
- A15: updates to an existing Photos / Receipts row write only the cells that change (as `replaceFileCells` does). Needed before (ag) or any new column on either tab.
- A17: a shared receipt's "all coins" update goes in one `$batch`; a part-landed batch reports what landed.
- A20: an Edit save refuses when All holds the same CollectionID twice, naming both rows.

### Build 7: writes that cannot hang or mislead: A7, A8, A6 first part (M; plan first)

- A7: one shared deadline for uploads and workbook writes. A timeout reports "may have been saved", never "not saved". Takes in backlog (ap) 1.5 with 2.4.
- A8: when a workbook write gets no answer, re-read the row and report what is there.
- A6 first part: no resume / version check starts while a save is running; it runs when the save ends.
- Plan first: it touches every write call.

### Build 8: Staging housekeeping: B5, A13 first part (M; plan first)

B5:
- Drafts are read a few at a time, each folder once per refresh (today the coin pass and the Set pass each fetch from every folder).
- Finished folders move to one place, `CoinCollection/StagingDone/{CollectionID}` beside Staging (and under `_Testing` for TEST), one Graph move per folder (Build 5's helper). Finished means: Promoted, files moved, every record written. A Force Added coin still awaiting research is not finished.
- The move runs at launch only, and only for an id that a fresh All read shows, so the reservation never depends on a folder that has left Staging.
- Supersedes the Staging part of (aa), which said delete; Ray chose move (14 Nov 2026).
- Build 4's check learns the done place (a draft there whose coin is not on All is reported).

A13 first part: Docket and draft JSON uploads send `If-Match` with the file's eTag; a mismatch re-reads and re-applies once. The rest of A13 stays with (bp).

### Build 9: A11 wrong-row detector, and A6 second part (M; plan first; TEST decides)

- A11: a GET of the target row as the first request of the same `$batch` as the write; afterwards check that row held this CollectionID; if not, show loudly the exact values just overwritten. Whether a GET inside a batch can itself be stale is the open (bi) question, so a TEST comes before any promise.
- A6 second part ("may this save write" decided once per save) touches invariant 17. Recommended: decide after B1's save log has run on LIVE for a while and shows whether mid-save refusals happen at all.

## Where every finding lands

Part A: A1 Build 3 · A2 Build 3 · A3 Build 5 · A4 Build 3 (its launch-retry part Build 5) · A5 Build 5 · A6 Build 7 (second part Build 9) · A7 Build 7 · A8 Build 7 · A9 Build 6 · A10 Build 6 · A11 Build 9 · A12 Build 3 · A13 Build 8 (the rest stays (bp)) · A14 Build 5 · A15 Build 6 · A16 Build 3 · A17 Build 6 · A18 Build 5 · A19 Build 4 · A20 Build 6.
Part B: B1 Build 3 · B2 Build 1 · B3 Build 5 · B4 Build 5 · B5 Build 8 · B6 Build 2 · B7 Build 4 · B10 Build 1 · B8 backlog (bz) · B9 backlog (ca). (bv) Build 5; (bw) is met by B1.

## Ray's answers to Q1-Q9 (14 Nov 2026)

- Q1. The review file and this plan go on main, docs only. Done in the commit that recorded these answers.
- Q2. Yes: Build 2's suites pass at merge by listing today's known failures (the KNOWN list), and each fix deletes its entries.
- Q3. `stage.html` becomes a plain notice page: a few lines saying the form was retired, with a link to the app; no sign-in, no script.
- Q4. Yes: Save to Database stops at the draft while a photo or the receipt has not uploaded.
- Q5. Yes: B1's save log is memory only for now.
- Q6. Yes: in B3 the Photos tab's header and table are read once at the start of a Save and used for all of that Save's photos. This narrows "re-read at the start of every write" (invariant 3) to "once per Save" for the Photos tab only; the build that does it records the rule in CLAUDE.md.
- Q7. Yes: the done place is `CoinCollection/StagingDone/`, beside Staging.
- Q8. Changed by Ray: B7 and A19's check come right after Build 3. Final order: 1 B2 + B10; 2 B6; 3 A1, A4, A2, A12, B1, A16; 4 B7 + A19; 5 A3, A5, B3, B4, A14, A18, (bv); 6 A9, A10, A15, A17, A20; 7 A7, A8, A6 first part; 8 B5, A13 first part; 9 A11, A6 second part.
- Q9. Yes: A6's second part waits for B1's evidence from LIVE.

## Not verified

- Graph's page size and order for a folder's children (A1), and what a Graph move does when the name is taken on a personal OneDrive (B4): the Microsoft documentation site could not be reached from this session. A1's fix does not depend on either number; B4 is settled by its device TEST.
- The parallel runner's time (about 4 to 5 minutes) is an estimate from 822 s on 4 cores, not a measurement.
- Nothing here was run: no suite, no probe, no device.
