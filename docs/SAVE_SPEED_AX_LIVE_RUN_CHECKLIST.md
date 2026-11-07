# (ax) Save speed, Stage 1: TEST run checklist

Branch `claude/save-speed-ax`. Write-up: docs/ref/WRITE_LAYER.md "Save speed (ax), Stage 1". Plan and answers: docs/BACKLOG.md (ax).

Stage 1 changes what a save READS (the three reads run together) and adds diagnostics. It does not change what a save writes. Phone (S25, Chrome) unless marked.

1. Deploy `claude/save-speed-ax` to TEST. The TEST bar shows the branch.
2. LastModified first (Ray's Q6). Open any coin, Edit Coin, change one field (e.g. Notes), Save. Docket > About: the line "LastModified written (…, AY-… row N): 46xxx.xxxxx = YYYY-MM-DD hh:mm:ss" is there. Tap "Read it back". Report the whole "Read back …" line: the value as Graph sent it, "read minus written N s", the text and the format. Expected: the value has the seconds (read minus written 0 s, or a tiny fraction), the text shows hh:mm only (the cell format hides seconds).
3. The same save's Save steps (About > Save steps), screenshot. Expected:
   - "header re-read", "row lookup" and "row re-read for the conflict check (in parallel, at the row Edit Coin opened)" all start at about the same "+0.0 s" offset;
   - no "parallel row read not used" line;
   - "saved-copy delete before the write: open X s, delete Y s, <result>";
   - "text-date check", "token (…)", "$batch 1 of 1: 3 range writes (includes LastModified)", "$batch 1 of 1: reading the answer";
   - "main thread: longest stall (heartbeat late)", "main thread: … long tasks …", "background work during the save: …".
4. Three timed saves, Save steps screenshot after each (Q1: this is what finds the missing ~5 s):
   a. the first save after a fresh launch (swipe the app away, reopen, wait for the Dashboard, then save);
   b. a different coin about a minute later;
   c. leave the app for 5+ minutes, come back, save straight away.
5. The overall "Last save" line: compare its seconds with the 6 Nov TEST (about 13.5 s for an Edit Coin save). Expected: about 3 s less from the reads.
6. Row moved (optional, desktop): open a coin in Edit Coin; in Excel insert a blank row ABOVE that coin's row on _Testing All; back in the app, change a field and Save. Expected: saved on the coin's own (now lower) row; Save steps shows "parallel row read not used: the row moved (now row N); read again". Delete the blank row afterwards.
7. A real conflict is still refused: open a coin in Edit Coin; change its Grade in Excel; wait 3 minutes; Save a different field in the app. Expected: "changed since you opened" naming Grade; nothing written.
8. Promote still works: promote one ready Staging draft on TEST (or Save to Database a clean match). Expected: the row appears as before; its Save steps show "header re-read" and "row lookup" starting together and "row re-read for the conflict check" after them.

Report: step 2's line (first), step 3-4 screenshots, and anything that looks different from the expected text.

Results: not run yet.

Results of the Stage 1 round (Build 108, `f8d231c`, 7 Nov 2026): steps 2-5 and 7 passed; step 6 wrote to the wrong row (stale reads after an Excel row insert; Ray's decision: append-only rule + 5-minute habit, no code guard); step 8 Promote's key read-back falsely failed (fixed in 2a). Details: docs/BACKLOG.md (ax).

## 2a: TEST steps (branch `claude/save-speed-ax`, after the 2a commit)

Have _Testing open in Excel in a browser tab for steps 2-6 (the delay seems more likely then); don't change anything in it unless a step says so.

1. Deploy `claude/save-speed-ax` to TEST. The Build line shows the new commit.
2. Second save on the same form: open a coin in Edit Coin, change Notes, Save. Without leaving the form, change Cost and Save again within a minute. Expected: both save. Docket > About > Save steps for the second save may show "the row read still shows this app's earlier save" (only when Excel was behind).
3. Re-open during the delay: save a coin's Notes, go back to its details, open Edit Coin again at once, change Cost, Save. Expected: saved; Save steps may show "the form was opened while Excel still showed this app's earlier save".
4. A real change is still caught: open a coin in Edit Coin; in Excel change its Grade; wait 5 minutes; in the app change Cost and Save. Expected: refused, naming Grade; nothing written.
5. Promote: promote one ready Staging draft. Expected: it promotes, OR the message "Wrote the keys for AY-… to row N (Graph confirmed the write), but Excel isn't showing them yet…". If you get the message: tap Promote again at once: the same message, and Excel shows the id on row N only (no second row). Wait 2-3 minutes, Promote again: it completes; one row, filled in.
6. Two photos in one save: Edit Coin on a TEST coin, add two photos (e.g. Holder front and Holder back), Save. After a few minutes, the Photos tab in Excel has two new rows with different PhotoIDs and the two file names.
7. Save steps for the other writes: (a) Mark as promoted on a draft that offers it (if one is listed): About > "Last save" says "Mark as promoted AY-…". (b) Any of Set attach / detach, a Docket Re-check that links a CoinID, or Ledger > Update prices: "Last save" says "Write outside a timed save: …", "written".
8. One plain save as in Stage 1 step 3: the three reads still start together (no "not used" line).

Report: what each step showed (screenshots of Save steps for 2, 3 and 5), and anything that differs from the expected text.

2a results: Ray gave the merge go-ahead on 7 Nov 2026 with steps 6-8 not run on TEST (covered by `verify_save_lag_ax`). Merged to main by fast-forward (`db8673e`).
