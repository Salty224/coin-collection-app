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

**Since then:** merging this branch onto `claude/matcher-designation-hardening`
surfaced a real gap (Docket entries didn't carry `designation`/`gradeSource`,
so Re-check couldn't see them) — fixed and re-verified headless (12 new
assertions, not committed per this project's scratchpad-script convention).
**Part E2 below is what confirms that fix live**, same role §B2 played for
the matcher branch's own checklist.

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

   **Operational note, confirmed during the live Part E2 pass: `DB_Coins`
   is fetched once per page load (`ensureLiveNavDataFetch()`), not
   re-read on each Re-check.** Any step below that has you add a row
   directly in Excel and then immediately tap Re-check needs a **hard
   reload of the page first** (`Ctrl+Shift+R`, not just navigating back to
   Docket) — otherwise Re-check runs against the catalog snapshot from
   when the page loaded, before your edit, and looks exactly like a
   genuine "still no match"/wrong-candidate failure when it's actually
   just stale in-memory data. This affects Parts D, E, and E2 alike
   (anywhere the steps say "add a row... then Re-check").
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
   needs to be genuinely uncatalogued at flag time). **Part B/C's identity
   is now reached via a Browse Edit identity edit, not Add Coin** — see the
   note at the start of Part B — so have a real (or throwaway) owned coin
   ready to edit into that identity, rather than typing it fresh into Add
   Coin.

> **Expected on first open: ONE sign-in, once**, same as every other
> real-Graph feature in this app now that everything shares one MSAL
> instance — a full page load that lands back on the Dashboard, not wherever
> you were. Navigate back and continue.

> If anything misbehaves, set `ENABLE_DOCKET_WRITE` back to `false`.
> Nothing can reach the real workbook regardless of what goes wrong here —
> this feature's only writes are the Docket JSON file and, on a confirmed
> Re-check, one CoinID cell (via the same narrow path Browse Edit uses).

---

## B. Creating a durable entry — via Browse Edit, not Add Coin — BLOCKED (rewritten)

**Add Coin cannot be used for this section — confirmed live.** Attempting
the original version of this part (below), Add Coin's Save to Database
turned out to still be a placeholder: it only toasts *"Placeholder only —
AY-00027 saved to Database. Nothing written to OneDrive yet"* and never
writes anything, so it can't create a real Docket entry today. This
matches CLAUDE.md's own documented state of Add Coin (see "Add Coin: the
core workflow" — the direct-write/reconciliation step described there is a
separate, larger, not-yet-built scope; nothing about the Docket branch
changes that).

**Rewritten to use Browse Edit's identity-edit path instead** — the same
mechanism Parts D, E, and E2 already used successfully this session (edit
an identity field on a real coin to a value with zero DB_Coins candidates;
the save clears CoinID and creates a Docket entry). This exercises the
identical underlying `docket.json` write / fob-increment /
reload-persistence behavior this section was always meant to verify —
just triggered through a path that's actually live, rather than one still
gated on a future write layer.

8. Navigate to **Docket** (bottom drawer). Note the fob number before you
   start.
9. Go to **Browse → Edit** on a real coin (or a throwaway coin you don't
   mind editing back afterward). Edit an identity field — Year is the
   simplest — to a value with **no** matching `DB_Coins` row for that
   Denom/Mint/Variety (the same "genuinely uncatalogued" identity idea
   Setup step 7 already has you prepare). Tap **Save Changes**.
10. **Verify:** the save succeeds, and — since the new identity has zero
    DB_Coins candidates — the result reads *"No DB_Coins match for the new
    identity — CoinID cleared and flagged to Needs Attention."* Navigate
    back to **Docket**.
11. **Verify:** a new row appears under **Waiting on Copilot research**,
    labeled with the coin's CollectionID and its (now-edited) identity. The
    fob number went up by one from step 8.
12. **In OneDrive**, confirm
    `CoinCollection/_Testing/Staging/_Docket/docket.json` now exists (or was
    updated, if it already existed) and contains an entry with:
    - `status: "open"`
    - `collectionId` matching the coin you edited (**not blank**)
    - `kind: "coinid-relink"` — **not** `"no-db-coins-match"`, since this
      path flags an already-owned coin whose edit went uncatalogued, not a
      brand-new unmatched find. Both kinds render identically in the
      Docket list and Re-check treats them the same way (see CLAUDE.md).
    - a real `entryId`
13. Reload the page (`F5`). **Verify:** the entry is still there under
    Waiting on Copilot research, with the same text — confirming it's read
    back from the file, not just held in memory from the save.

    **Real bug found and fixed at this exact step, root-caused not
    guessed.** A first live attempt at this step showed every entry
    rendering TWICE after the reload, with `docket.json` itself confirmed
    correct (right entry count, unique `entryId`s, no duplicates) — a
    render-only bug. Root cause: `renderNeedsAttentionHub()` is called both
    unconditionally at page-load init AND every time the Docket drawer is
    opened, but it clears its containers up front and only appends rows
    after several real Graph reads (`await`s) — so if the page-load call is
    still in flight when you open Docket (very plausible right after a
    reload, since that's exactly when the app's own MSAL/Graph round trip
    is slowest), both calls independently clear-then-append and whichever
    finishes LAST stacks its rows on top of the other's instead of onto a
    clean container. **Fixed** with a render-generation token
    (`needsAttentionRenderToken`): only the most-recently-STARTED call is
    ever allowed to clear/write the DOM or update the badge — an older,
    now-superseded call detects it's stale (its token no longer matches)
    and discards its own result entirely, touching nothing. Reproduced
    headless via two overlapping calls against a delayed mock Graph client
    (4 rows instead of 2 before the fix, exactly 2 after) — not
    reproducible from a single call, which is why it slipped through every
    earlier headless suite.

    > **Live-reconfirmed.** A fresh entry (`AY-00520`) created, then Docket
    > opened immediately afterward with no artificial delay (realistic
    > timing) — no duplication. Followed by a plain `F5` reload — still no
    > duplication, every entry showing exactly once. Fix holds under real
    > conditions, not just the headless repro.
13a. **Restore the coin**: reopen Browse → Edit and set the identity field
     back to its original value, then Save. (This doesn't clear the Docket
     entry you just created — that's fine and expected; leave it for
     Part F's Dismiss-with-reason, or for a later Re-check once you've
     added a matching `DB_Coins` row, same as Part D.)

**Also found, while attempting the original Add-Coin version below — a
real messaging bug, now fixed regardless of the scope question above:**
Add Coin's form could show *"No matching DB_Coins entry... needs a
catalog entry added later"* (`dbNoMatchBanner`) and then, further down the
same form, *"Matched with enough confidence for a direct save."*
(`saveConfidentBanner`) for the same coin — directly contradicting each
other. Root cause: confidence (`isConfidentMatch()`) is driven purely by
Variety recognition and is deliberately independent of whether DB_Coins
matched at all (see CLAUDE.md "Direct-write vs. Staging" — a DB_Coins miss
never blocks a direct save on its own), so the two banners can legitimately
be true at once — the bug was only in the word **"Matched,"** which
falsely implied a catalog match had happened. Fixed by rewording the
confident banner to *"No unrecognized Variety flagged — ready for a direct
save. (A missing DB_Coins catalog entry, if noted above, won't block this
on its own.)"* — same underlying logic, no behavior change, just no longer
claims something that isn't true. Verified headless (7 assertions,
`verify_addcoin_banner_wording.js`, not committed per this project's
scratchpad convention): the exact coexistence scenario (uncatalogued
denom/year, blank/recognized Variety) now shows both banners with text
that no longer contradicts.

**Blocked, not deleted — the original Add-Coin-based version of this
section, to restore once Add Coin's own direct-write/reconciliation layer
exists** (see CLAUDE.md "Add Coin: the core workflow" for that scope):

> 9. Go to **Acquisitions → Add New Coin**. Fill in Denomination/Year/Mint/
>    Description using the "no `DB_Coins` row" identity from Setup step 7.
>    Tap **Save to Database** (or Staging — either path flags the same way).
> 10. **Verify:** a toast confirms the save. Navigate back to **Docket**.
> 11. **Verify:** a new row appears under **Waiting on Copilot research**,
>     labeled with your test coin's CollectionID, description, and today's
>     date. The fob number went up by one.
> 12. **In OneDrive**, confirm `docket.json` contains an entry with
>     `status: "open"`, a real (not blank) `collectionId`,
>     `kind: "no-db-coins-match"`, and a real `entryId`.
> 13. Reload the page (`F5`). **Verify:** the entry is still there, read
>     back from the file rather than held in memory.

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

## E2. Re-check — cert-protected identity edit (the picker fires, not a silent narrow) — CONFIRMED LIVE

Found while merging this branch onto the Designation-matcher hardening
branch (`claude/matcher-designation-hardening`, itself confirmed live via
its own checklist's §B2 against `AY-00207`): `flagCoinIdNeedsRelink()` and
`buildDocketEntry()` didn't carry the coin's `Designation`/`GradeSource`
onto the durable entry, so a later **Re-check** re-derived candidates as if
both were blank — silently bypassing the cert-protection guard that
already protects this exact identity edit on the live Browse Edit **Save**
path (per §B2). Fixed (`designation`/`gradeSource` added to the entry
schema, `flagCoinIdNeedsRelink()`'s caller, and the fields
`docketRecheckEntry()` passes into `dbCoinsCandidatesFor()`) and re-verified
headless — this section is what proves it live, on the real workbook,
the same way §B2 did for Save.

> **Result: PASSED, against the real `_Testing` copy.** Positive case run
> against `AY-00522` (Designation=FB, GradeSource=PCGS, identity edited to
> a zero-match state): `docket.json` correctly captured both fields, and
> Re-check correctly surfaced the ambiguous picker (a blank-Designation
> test row alongside the FB one) — no silent narrow. Control case run
> against `AY-00518` (Designation=FB, GradeSource blank): Re-check
> correctly resolved to a single clean "One match found," no picker — the
> fix doesn't over-trigger for a non-certified coin. One operational
> gotcha hit along the way (not a code bug): see the hard-reload note in
> Part A's setup section, added because of exactly this run.

30a. Flag a fresh entry the same way Part E does, but this time via **Browse
     → Edit** on a real or throwaway coin, not Add Coin — set its
     **Designation** field to `FB` and its **GradeSource** dropdown to
     **PCGS** before saving, and edit an identity field (e.g. Year) to a
     value with **no** matching `DB_Coins` row, so the save clears CoinID
     and flags a `coinid-relink` entry (same "zero match" flag path Part D's
     own scenario description explains). Note the entry's identity
     (Denom/Year/Mint/Variety) from the Docket list.
30b. **In OneDrive**, open `docket.json` and confirm the new entry's
     `designation` field reads `"FB"` and its `gradeSource` field reads
     `"PCGS"` — **this is the actual fix**, so confirm it landed in the
     file before going further, not just in the running page.
30c. In the **copy workbook's `DB_Coins` tab**, add **two** rows matching
     that entry's identity exactly — one with a **blank** `Designation`
     (e.g. `CoinID = C-TEST-9004`) and one with `Designation = FB`
     (e.g. `CoinID = C-TEST-9005`), same shape as the real
     `AY-00207`/1916-D Mercury Dime plain-vs-FB pair. Save the workbook.
30d. In **Docket**, tap **Re-check** on the entry from 30a.
30e. **Verify: the ambiguous picker ("Pick the matching catalog entry")
     opens, listing BOTH `C-TEST-9004` and `C-TEST-9005`.** This is the bug
     check — **before this fix**, Re-check would have silently narrowed to
     the single blank-`Designation` row (`C-TEST-9004`, the WRONG one for
     an FB-certified coin) and shown "One match found" instead, with
     nothing warning you the coin was actually FB/PCGS-certified.
30f. Tap **Cancel**. Delete both test `DB_Coins` rows afterward.

**Control, same step 30a–30d shape but confirming the fix isn't
over-broad:** repeat with GradeSource left as **Seller** (or blank) instead
of PCGS, everything else identical. **Verify:** Re-check still narrows to a
**single** match (the FB row, since a non-service-graded coin's own
Designation is real signal to narrow on) and shows "One match found" —
the picker should NOT fire here. If it does, the fix over-triggered and
needs another look before Part 1 testing resumes.

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
- **`DB_Coins` is fetched once per page load, not re-read per Re-check
  click** — confirmed during the live Part E2 pass. Adding a row directly
  in Excel and immediately tapping Re-check in an already-open tab will
  not see it; a hard reload (`Ctrl+Shift+R`) is required first. This looks
  exactly like a genuine matching failure if you don't know to expect it —
  see the note added to Part A's setup section. Not a Docket-specific
  quirk (the same live-nav-data fetch-once behavior applies wherever
  `ENABLE_LIVE_NAV_DATA` is used), just newly relevant here.
