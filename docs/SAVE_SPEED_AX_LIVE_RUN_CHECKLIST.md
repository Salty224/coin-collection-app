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
