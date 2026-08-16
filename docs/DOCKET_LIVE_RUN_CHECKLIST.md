# Docket Research Queue — Live Run Checklist (Ray)

Manual verification for the Docket durable queue / Re-check / Dismiss-with-reason
work, run against the **copy** workbook and its Staging folder at
`CoinCollection/_Testing/`. Nothing here touches the real
`CoinCollection (AI).xlsx` or the real `CoinCollection/Staging/` folder —
`WRITE_TARGET` stays `"copy"` throughout.

All app-side logic is already verified headless (63 new automated assertions,
plus the 685 from prior rounds — 748 total, all passing, driven by a mock
Graph client). This checklist exists to confirm the **real Graph API** behaves
the way the mock did on your account — the mock cannot prove Graph accepts
these exact `uploadJson`/`getJson` calls against a real OneDrive, only that our
logic around them is right.

---

## Read this first: where this pass can actually happen

Same constraint as the Browse Edit write layer, because it's the same
underlying cause: the only Entra redirect URI registered for `app.html` is
`http://localhost:8791/app.html`.

- **This has to run on your PC, in a desktop browser**, from a local server.
- **A phone/tablet pointed at the live GitHub Pages site cannot do this pass
  at all.** `ENABLE_DOCKET_WRITE` ships `false` and must never be pushed as
  `true` — even if it were, there's no production redirect URI, so sign-in
  would fail.
- **If you want a phone pass too** (Samsung Internet rendering of the Re-check/
  Dismiss dialogs), use USB port-forwarding the same way as the Browse Edit
  checklist: enable USB debugging, `chrome://inspect` → *Port forwarding*,
  map device port `8791` to your PC's `localhost:8791`. The phone then loads
  `http://localhost:8791/app.html` and the origin matches the registered
  redirect URI. Part H below is the phone-specific list.

---

## A. Setup

1. On the branch `claude/docket-identity-matching`, in `app.html` set:
   `const ENABLE_DOCKET_WRITE = true;`
   Leave `const WRITE_TARGET = "copy";` **exactly as-is**.
2. **Also set `const ENABLE_LIVE_NAV_DATA = true;`.** Re-check matches
   against `DB_Coins` — with this flag off, it matches against a 12-row
   mock and will report "still no DB_Coins match" for almost everything
   real. This is the same flag/reasoning the Browse Edit checklist uses.
3. Leave `ENABLE_BROWSE_EDIT_WRITE` and `ENABLE_SET_WRITE_LAYER` at whatever
   you want for this session — they're independent flags and don't need to
   be on for this pass. Turning `ENABLE_BROWSE_EDIT_WRITE` on too is only
   useful if you specifically want to confirm that flagging path as well
   (editing an existing coin's identity into something uncatalogued, via
   Browse → Edit) — every step below uses Add Coin's flagging path instead,
   which needs nothing extra.
4. From the repo root: `python3 -m http.server 8791`
5. Open `http://localhost:8791/app.html`.
6. **Confirm the copy's Staging folder is what you expect.** In OneDrive,
   check whether `CoinCollection/_Testing/Staging/_Docket/docket.json`
   already exists from an earlier test session. If it does and you want a
   clean start, delete it (or rename it) before beginning — the app treats a
   missing file as "no entries yet," so deleting it is a safe reset, not
   something that needs restoring afterward the way the workbook copy does.
7. **Have 3 throwaway identities ready**, each an uncatalogued Denomination/
   Year/MintMark/Variety combination you're confident has **no** `DB_Coins`
   row (a made-up mint-mark, or a variety you know isn't catalogued) — one
   for Part B/C, and one each for Parts D and E (Parts D/E each add their
   own matching `DB_Coins` row afterward, so their starting identity just
   needs to be genuinely uncatalogued at flag time).

> **Expected on first open: ONE sign-in, once**, same as every other
> real-Graph feature in this app now that everything shares one MSAL
> instance — a full page load that lands back on the Dashboard, not wherever
> you were. Navigate back and continue.

> If anything misbehaves, set `ENABLE_DOCKET_WRITE` back to `false`.
> Nothing can reach the real workbook regardless of what goes wrong here —
> this feature's only writes are the Docket JSON file and, on a confirmed
> Re-check, one CoinID cell (via the same narrow path Browse Edit uses).

---

## B. Creating a durable entry

8. Navigate to **Docket** (bottom drawer). Note the fob number before you
   start.
9. Go to **Acquisitions → Add New Coin**. Fill in Denomination/Year/Mint/
   Description using the "no `DB_Coins` row" identity from step 7. Tap
   **Save to Database** (or Staging — either path flags the same way).
10. **Verify:** a toast confirms the save. Navigate back to **Docket**.
11. **Verify:** a new row appears under **Waiting on Copilot research**,
    labeled with your test coin's CollectionID, description, and today's
    date. The fob number went up by one from step 8.
12. **In OneDrive**, confirm
    `CoinCollection/_Testing/Staging/_Docket/docket.json` now exists (or was
    updated, if it already existed) and contains an entry with:
    - `status: "open"`
    - `collectionId` matching the coin you just saved (**not blank** — this
      is the fix from this round; previously Add Coin's flag never carried
      an ID at all)
    - `kind: "no-db-coins-match"`
    - a real `entryId`
13. Reload the page (`F5`). **Verify:** the entry is still there under
    Waiting on Copilot research, with the same text — confirming it's read
    back from the file, not just held in memory from the save.

---

## C. Re-check — zero candidates

14. On the entry from Part B (still pointing at an uncatalogued identity),
    tap **Re-check**.
15. **Verify:** a toast reads *"Still no DB_Coins match for [description] ·
    [year]-[mint] — leaving it queued."* The entry is unchanged — still
    `open`, still visible under Waiting on Copilot research.

---

## D. Re-check — exactly one candidate (confirm, not auto-apply)

This is really testing the exact real-world scenario the whole feature exists
for: a coin got flagged because `DB_Coins` had no row for it, then Copilot
adds that row later, then Re-check should find it. The cleanest way to
reproduce that live is to add the matching row yourself, directly in the
copy workbook — that's a faithful stand-in for "Copilot added it since," not
a shortcut around the real behavior.

16. In the **copy workbook's `DB_Coins` tab**, add one new row matching your
    Part-B test entry's Denomination/Year/MintMark/Variety exactly (a
    `CoinID`, `PCGS#`, `GSID`, `Mintage` of your choosing — anything
    recognizable, e.g. `CoinID = C-TEST-9001`). Save the workbook.
17. Back in the app, on the Part-B entry in **Docket**, tap **Re-check**.
18. **Verify:** a confirmation dialog titled **"One match found"** appears,
    naming `C-TEST-9001` plus the PCGS#/GSID/Mintage you gave it.
19. Tap **Cancel**. **Verify:** the dialog closes, the entry is still `open`
    in the Docket list, and the coin's `CoinID` cell in the workbook is
    **unchanged**. (Check the cell directly in Excel if you want to be sure —
    this is the "never auto-applied" guarantee, worth confirming for real.)
20. Tap **Re-check** again, then **Link & resolve** this time.
21. **Verify:**
    - A toast reads *"Resolved [CollectionID] → C-TEST-9001, CoinID written
      to the workbook."*
    - The entry **disappears** from Waiting on Copilot research (the Docket
      fob goes down by one).
    - In the workbook, your test coin's `CoinID` cell now holds
      `C-TEST-9001`.
    - In `docket.json`, that entry's `status` is now `"resolved"`, with
      `resolvedCoinId` and `resolvedDate` populated. **The entry is still in
      the file** — it's closed, not deleted; that's deliberate (an audit
      trail for whoever reconciles later).
22. Afterward, delete the `C-TEST-9001` row from `DB_Coins` and clear the
    `CoinID` cell you just wrote, so the copy workbook doesn't carry test
    data forward.

---

## E. Re-check — two or more candidates (the shared ambiguous picker)

Same idea as Part D, but add **two** rows this round.

23. Flag a fresh entry (Part B again, any uncatalogued identity you haven't
    used yet).
24. In the **copy workbook's `DB_Coins` tab**, add **two** rows both matching
    that entry's identity exactly, differing only in `CoinID`/`PCGS#`/`GSID`
    (e.g. `C-TEST-9002` and `C-TEST-9003`). Save the workbook.
25. In **Docket**, tap **Re-check** on that entry.
26. **Verify:** instead of the "One match found" dialog, a different overlay
    titled **"Pick the matching catalog entry"** opens, listing **both**
    candidates — each showing its own CoinID first, then PCGS#/GSID/Mintage
    as the differentiators.
27. Tap **Cancel** (the plain Cancel button at the bottom of this overlay,
    not a card). **Verify:** nothing resolved — entry still open, CoinID
    cell untouched.
28. Tap **Re-check** again, then tap the **second** candidate's card this
    time (`C-TEST-9003`, not the first one listed — worth deliberately
    picking the non-default one).
29. **Verify:** the toast, the workbook `CoinID` cell, and `docket.json`'s
    `resolvedCoinId` all show `C-TEST-9003` — the one you actually clicked,
    not whichever one happened to render first.
30. Afterward, delete both test rows from `DB_Coins` and clear the `CoinID`
    cell you wrote.

---

## F. Dismiss-with-reason

31. Flag one more throwaway entry (Part B again, any uncatalogued identity).
32. Tap **Dismiss** on it.
33. **Verify:** a dialog titled **"Dismiss without a match"** opens, naming
    the entry, with a required **Reason** textarea.
34. Leave the textarea blank and tap **Dismiss**. **Verify:** the dialog does
    **not** close — a validation message appears under the textarea, and
    nothing is recorded (`docket.json` unchanged).
35. Type a real reason (e.g. "Not a real variety — catalogued under the base
    date") and tap **Dismiss**.
36. **Verify:**
    - A toast confirms the dismissal.
    - The entry disappears from Waiting on Copilot research (fob goes down).
    - In `docket.json`, that entry's `status` is `"dismissed"`, with
      `dismissedReason` holding your exact text and `dismissedDate` set. The
      entry is still in the file.

---

## G. Flag off — confirm the shipped default still works

37. Set `ENABLE_DOCKET_WRITE` back to `false` (leave `ENABLE_LIVE_NAV_DATA`
    as you like). Reload the app.
38. Navigate to **Docket**. **Verify:** the two original seeded demo rows
    (Washington 1932-D, Lincoln Wheat 1943-S Steel) are visible under Waiting
    on Copilot research, each with a **Re-check** and **Dismiss** button.
39. Tap **Dismiss** on one, give it a reason, confirm. **Verify:** it
    disappears from the list (in-memory only — this is the pre-existing
    mockup behavior, unchanged; nothing here should touch OneDrive with the
    flag off).
40. Reload the page. **Verify:** the entry you dismissed in step 39 is **back**
    — this is expected and correct with the flag off (in-memory, resets on
    reload), not a regression. This is the contrast worth seeing directly:
    flag off behaves exactly as it did before this feature existed; flag on
    is what makes a dismissal durable.

---

## H. Phone pass (only if you set up port forwarding — see the top)

41. Set `ENABLE_DOCKET_WRITE = true` (and `ENABLE_LIVE_NAV_DATA = true`)
    again for this pass.
42. With port forwarding active, open `http://localhost:8791/app.html` in
    **Samsung Internet** on the S25.
43. Re-run **B (9–11)**, **D (18, 20–21)**, and **F (32–36)** — the places
    with new UI.
44. **Verify specifically on the phone:**
    - The Re-check/Dismiss button pair on a research row is comfortably
      tappable and doesn't crowd the row's own text (they're stacked in
      their own column, not squeezed side-by-side).
    - Both new overlays ("One match found" and "Pick the matching catalog
      entry") fit the screen without horizontal scrolling.
    - The Dismiss reason textarea is usable with the on-screen keyboard open
      (doesn't get hidden behind it).
    - Long candidate rows (a full description + variety + finish) wrap
      rather than overflowing in the ambiguous picker.

---

## I. Afterwards

45. **Set `ENABLE_DOCKET_WRITE` back to `false`** before pushing anything.
    Same reasoning as every other real-Graph flag: it must never reach the
    live site as `true` while `app.html` has no production redirect URI.
    (`ENABLE_LIVE_NAV_DATA` back to `false` too, if you changed it and don't
    want it on for other reasons.)
46. If you want a clean slate, delete
    `CoinCollection/_Testing/Staging/_Docket/docket.json` — the app treats a
    missing file as "no entries," so there's nothing to "restore" the way
    the workbook copy needs restoring.
47. Report back what passed and anything that didn't. Most useful to me:
    - The exact toast or dialog text you saw when something was wrong.
    - Any red errors in the browser console (F12 → Console).
    - The actual contents of `docket.json` if an entry's shape looked wrong.
    - For the ambiguous-picker case specifically: which candidate you
      clicked vs. which one actually got written.

---

## Known limitations of this pass — not bugs

- **The Staging *sheet* is untouched.** This writes to the Staging *folder*
  (a JSON file), not a new row on the Staging tab in Excel — there is no real
  write path to any sheet but All, and none that can append a new row at
  all. See CLAUDE.md for the full reasoning; you already confirmed this
  storage choice is fine.
- **Re-check only matches on what the entry itself stored at flag time**
  (Denom/Year/Mint/Variety/Finish) — it does not re-derive anything from the
  coin's CURRENT state if that's since changed. If you want to test against a
  different identity, the cleanest path is flagging a fresh entry with that
  identity (as the steps above do) rather than trying to edit an existing
  entry's stored fields by hand.
- **Add-Coin-created entries carry a blank `Finish`** (Add Coin has no Finish
  field at intake) and so may match slightly more broadly on Re-check than a
  Browse-Edit-created entry with a real Finish would. Confirmed as an
  accepted limitation, not something this pass needs to chase.
- **A coin still in Staging (not yet on the All sheet) can't have its CoinID
  written on resolve** — the resolution is recorded on the Docket entry
  regardless, with a note, for whoever reconciles it during promotion. Not
  something this checklist has a ready way to reproduce (it needs a
  Staging-only coin with a since-discovered catalog match); flagging so it
  isn't mistaken for a gap if you don't hit it.
- **The Docket fob math (both sections counted) is unchanged by this
  feature** — same behavior as before, just now backed by durable entries
  instead of in-memory ones.
