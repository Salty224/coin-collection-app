# Browse Edit Write Layer — Live Run Checklist (Ray)

Manual verification for the Browse Edit write layer, run against the **copy**
workbook at `CoinCollection/_Testing/CoinCollection (AI) COPY.xlsx`. Nothing
here touches the real `CoinCollection (AI).xlsx` — `WRITE_TARGET` stays
`"copy"` throughout, and this is the app's first code that writes *into* a
workbook at all, so the copy is the whole safety net.

All app-side logic is already verified headless (358 automated assertions
across two viewports, driven by a mock Graph client). This checklist exists to
confirm the **real Graph Excel API** behaves the way the mock did on your
account — the mock cannot prove that Graph accepts these exact range/batch
calls, only that our logic around them is right.

> **Round 2.** Your first live pass (Parts B–F, all exercised) confirmed the
> core write layer — formulas survived, conflict detection blocked correctly,
> identity confirmation worked, the Containers join worked — and found 3 real
> bugs, all now fixed:
> 1. **Mint Mark could load blank for a real "P" coin** (Philadelphia
>    explicitly marked, e.g. 2017-P Lincoln Shield Cent) — "P" is now a real
>    dropdown option in both Add Coin and Edit Coin. Worth specifically
>    re-checking on whatever coin you originally hit this on.
> 2. **CoinID wasn't recomputed when Year/MintMark/Denomination changed** —
>    an identity edit could silently leave a coin's catalog link pointing at
>    the wrong DB_Coins row. Fixed with its own narrow, explicit write path
>    (never routed through the general column allow-list): a real match
>    writes the new CoinID, no match clears it and flags the coin into Needs
>    Attention rather than leaving something wrong in place. **New — worth
>    specifically exercising this round**: edit a coin's Year or Mint Mark
>    into a combination you know exists in DB_Coins (CoinID should update)
>    and separately into one you know doesn't (CoinID should clear and the
>    coin should show up under Needs Attention → Waiting on Copilot research).
> 3. **Notes briefly flashed unrelated placeholder text** before settling to
>    the real value — fixed, it now starts blank with a "Loading current
>    notes…" placeholder instead of ever showing another coin's mock text.
>
> Plus the polish item (Storage Location note reworded) and this checklist's
> own `ENABLE_LIVE_NAV_DATA` gap, both addressed below/inline.

> **Round 3 — re-run EVERYTHING, not just D2.** Your Part-D2 pass found four
> more issues. Two of them shared one root cause that changes which workbook
> every screen reads, so the Round-2 results no longer describe this build —
> please re-run **all of B through F**, not only the new steps.
> 1. **The app was reading production and writing to the `_Testing` copy.**
>    Catalog/Browse detail/Edit Coin pre-filled from
>    `CoinCollection (AI).xlsx` while the write layer's snapshot and writes
>    went to the copy — which is why AY-00008 showed 1919-S/blank when the
>    copy said 1920-S/"Type 69". Fixed: reads now come from whatever
>    `WRITE_TARGET` points at, so with `"copy"` **everything you see is the
>    `_Testing` copy**. Expect Catalog to now reflect the copy's data, not
>    production's — that's the fix working, and worth confirming early.
> 2. **The Edit form now pre-fills from the live workbook row**, not the
>    in-memory display record, so a field you never touched can no longer be
>    submitted as a change (the "Type 69 → blank" data loss). Watch for
>    fields settling to their real values a moment after the form opens —
>    that's intentional. Anything you've already typed is left alone.
> 3. **DB_Coins matching now uses the real ~3,753-row catalog** instead of a
>    12-row mock, which is why the 1920-S re-link failed. Part D2's match
>    case should now succeed.
> 4. **The Docket badge now counts BOTH sections**, per your call — a
>    research item needs you to hand it to Copilot and reconcile the result,
>    so it counts as your action too. (It wasn't originally a bug: the badge
>    was deliberately action-only. You changed the design.) Worth a quick
>    confirm during the pass: flag a coin into research via Part D2 step 26
>    and check the fob goes UP by one.
>
> 5. **Sign-in with both flags on was completely broken** (found on your
>    attempt to start this round, not by me): three separate MSAL instances
>    shared one clientId and therefore one storage namespace, so they raced
>    on the redirect and corrupted each other's auth state. Fixed by
>    collapsing to one shared instance with one serialized token
>    acquisition. **Expect exactly one sign-in prompt now**, not two.
>
> 6. **The Part-F save loop is fixed** (picker on every save → conflict →
>    OK → picker again, forever, eventually losing typed Notes). Five
>    causes; the ones that change what you'll see:
>    - The duplicate-catalog picker now fires **only** when you actually
>      change Year / MintMark / Denomination / Variety / Designation. A
>      Grade-only or Notes-only save never raises it.
>    - When it does fire, the options are now distinguishable — CoinID
>      first, then PCGS# / GSID / Mintage. (Your 1945-D pair is PCGS# 5058
>      vs 5059, GSID 4623 vs 4624.) The duplicate is real, by the way: 577
>      base keys in DB_Coins have 2+ rows.
>    - `Finish` now narrows candidates, so a Proof and a Business Strike of
>      the same date stop colliding.
>    - **The conflict block now has an exit.** Clicking OK adopts the
>      current values as the new baseline and refreshes only the fields you
>      haven't edited — so saving again actually works. The dialog also
>      flags any conflicted field you're also editing.
>    - Backing out with unsaved edits now warns first.
>
> One consequence worth planning around: **AY-00008 in `_Testing` is
> currently CoinID-blank and Variety-blank** from the last pass. That's a
> fine starting state for re-testing the re-link (step 23 onward), but note
> its Variety no longer has a value to preserve — if you want to re-test the
> "untouched field survives" behavior specifically, set a Variety on some
> row by hand in Excel first, then edit a DIFFERENT field on that row.

---

## Read this first: where the write pass can actually happen

The write layer needs a Microsoft sign-in, and the only redirect URI
registered in Entra for `app.html` is `http://localhost:8791/app.html`. That
has a practical consequence worth knowing before you plan the session:

- **The functional write verification (Parts B–F) has to run on a machine
  where you can run the local server** — i.e. your PC, in a desktop browser.
  That's where the real Graph calls get proven.
- **A phone/tablet browser pointed at the live GitHub Pages site cannot do
  this pass at all.** The flag ships `false` and must never be pushed as
  `true`, and even if it were, there's no production redirect URI, so
  sign-in would fail.
- **If you want the pass on the S25 specifically** (Samsung Internet
  rendering of the new read-only fields and the two dialogs), the clean way
  is USB port-forwarding: plug the phone in, enable USB debugging, and use
  Chrome's `chrome://inspect` → *Port forwarding* to map device port `8791`
  to your PC's `localhost:8791`. The phone then loads
  `http://localhost:8791/app.html` and the origin still matches the
  registered redirect URI exactly. Samsung Internet supports the same
  remote-debugging port forwarding. **Part G** below is the phone-specific
  list; skip it if you'd rather review desktop-only for now and do a
  layout-only phone pass later.

There's no way around this split short of registering a production redirect
URI for `app.html`, which is a separate decision with its own consequences
(it would make the live site capable of writing) — not something to do as a
side effect of this checklist.

---

## A. Setup

1. **Confirm the copy workbook is current** — it needs the restored
   `SpotValue`/`Total` formulas and the current schema (Photos / Receipts /
   Containers / LastModified). Quick check in Excel: click `All!U2` and
   `All!Z2` — the formula bar should show a formula, not a number.
   **This matters more than it did last round.** The app now READS from this
   same copy too (that was the fix for the read/write split), so the copy is
   no longer just the write target — it's the only data you'll see anywhere
   in the app. A stale copy now means stale Catalog listings, stale Edit
   pre-fills, and a `DB_Coins` catalog that may not contain the rows you're
   testing CoinID re-linking against.
2. Confirm the Entra redirect URI `http://localhost:8791/app.html` exists (it
   should, from the reference-image and Add Set rounds).
3. On the branch `claude/browse-edit-write-layer`, in `app.html` set:
   `const ENABLE_BROWSE_EDIT_WRITE = true;`
   Leave `const WRITE_TARGET = "copy";` **exactly as-is**.
   Leave `ENABLE_SET_WRITE_LAYER` alone — this feature has its own flag now
   and doesn't need Add Set's.
   **Also set `const ENABLE_LIVE_NAV_DATA = true;`** (a separate, older flag,
   further up the file). Without it, Catalog only shows the small ~17-item
   hardcoded demo set instead of real workbook data. **As of this round it's
   no longer merely cosmetic**: that same reader now also loads the real
   `DB_Coins` catalog, which is what CoinID re-linking matches against — with
   it off, Part D2 matches against a 12-row mock and will report "no match"
   for almost any real coin. Both flags need to be on.
4. From the repo root: `python3 -m http.server 8791`
5. Open `http://localhost:8791/app.html`.
6. **Pick a throwaway test coin** and note its CollectionID, plus its current
   Year / Grade / Cost / Remarks / Container from the copy workbook. Ideally
   pick one that already has a Container set (so Part E has something to
   show) — e.g. anything with `Container = "Coin Slab Box 1"`.

> **Expected on first open: ONE sign-in, once.** The whole app now shares a
> single MSAL instance, so the Microsoft redirect fires once, on whichever
> screen first needs Graph, and covers every feature from then on. It's a
> full page load that lands back on the **Dashboard**, not wherever you were
> — normal MSAL redirect behavior, not a bug. Navigate back and continue.
>
> **This supersedes the "possibly TWICE, that's expected" note from the
> previous round, which was wrong.** Two instances didn't redirect twice
> harmlessly — they corrupted each other's stored auth state and sign-in
> could never complete with both flags on ("We can't sign you in right now",
> repeated reloads). If you see anything resembling that again, stop and
> report it; it should now be impossible by construction.

> If anything misbehaves, set `ENABLE_BROWSE_EDIT_WRITE` back to `false`.
> Nothing can reach the real workbook regardless of what goes wrong.

---

## B. First open — the read side

7. Catalog → your test coin → **Edit**. (Sign-in redirect happens here the
   first time; come back and reopen.)
8. Open the **Notes & Facts** accordion.
9. **Verify:** *Fun Fact* is a flat, muted, borderless block with a thin left
   rule — **not** a box you can type in. Tap it; nothing should focus.
10. **Verify:** *Notes* is a normal textarea and is **prefilled with whatever
    that row's `Remarks` cell already contains** (blank if the cell is blank).
    This is the single most important read to confirm — it's what stops an
    edit from silently wiping Copilot's text. If you picked a coin carrying
    "Physical receipt in binder — not yet digitized.", that exact sentence
    should be sitting in the box.
11. **Verify:** the note under **Save Changes** reads *"Saves directly to the
    copy workbook on OneDrive…"* — not the old "Session-only" wording. If it
    still says session-only, the flag didn't take.

---

## C. A plain (non-identity) save

12. Change **Grade** to something clearly different (e.g. `MS-63`). Change
    nothing else. Tap **Save Changes**.
13. **Verify:** no confirmation dialog appears. A toast reads *"Saved
    AY-##### to the workbook (N fields updated)."* and you land back on the
    detail view showing the new grade.
14. **Verify in the copy workbook** (reopen/refresh it in Excel):
    - `Grade` on that row is the new value.
    - `LastModified` on that row is **today's date, with no time component** —
      it should read like `2026-08-10`, not `2026-08-10 00:00`.
    - `Reviewed` on that row is blank.
    - **`Total` (col U) and `SpotValue` (col Z) still show FORMULAS in the
      formula bar, not numbers.** This is the single most important
      verification in the whole checklist — it's the failure mode the whole
      range-splitting design exists to prevent.
15. Change **Purchase Price** (Cost) to a different number and save again.
16. **Verify:** `Total` **recalculates by itself** to Cost + Shipping. The app
    writes nothing to it; Excel does the work. If Total went stale or turned
    into a literal, stop and tell me.

---

## D. Identity-overwrite confirmation

17. Reopen **Edit** on the same coin. Change **Year** to a different year.
    Tap **Save Changes**.
18. **Verify:** a *"Confirm identity change"* dialog appears naming the field
    and both values (e.g. `Year: 1889 → 1893`). Tap **Cancel**.
19. **Verify:** the workbook row is **unchanged**, and the form still shows
    the year you typed (your edit isn't thrown away).
20. Tap **Save Changes** again, this time tap **Confirm**.
21. **Verify:** the row now has the new Year, and `LastModified` is stamped.
22. Now clear a **blank** identity field instead — e.g. if `Variety` is empty,
    type something into it and save. **Verify: no confirmation appears.**
    Filling a blank is completing the record, not overwriting it.

---

## D2. CoinID re-linking (new this round — the fix for Bug 2)

This is the one genuinely new piece of behavior since your last pass, so
it's worth deliberately exercising both directions.

23. Pick a coin whose Year+MintMark+Denomination you can look up in
    `DB_Coins` — ideally one where you also know a NEIGHBORING combination
    that DOES exist (e.g. the same coin at a different, real mint mark).
    Open **Edit**, change **Mint Mark** to that neighboring value that you
    know has a real `DB_Coins` row, save (confirm the identity dialog if it
    asks — only fires when overwriting an already-populated field, same as
    Part D).
24. **Verify:** the toast now includes *"CoinID updated to C-....."* — check
    the workbook: `CoinID` on that row changed to match the new identity, and
    `Mintage`/`FunFact`/`Composition` wherever they're displayed (Browse
    detail's Specifications / Notes & Facts accordions) now show the
    NEIGHBORING coin's catalog data, not the original one's.
25. Now edit the **same coin's** identity into something you're confident has
    **no** `DB_Coins` row at all (a made-up mint mark combination, or a
    variety you know isn't catalogued). Save (confirm if asked).
26. **Verify:** the toast reads *"No DB_Coins match for the new identity —
    CoinID cleared and flagged to Needs Attention."* Check the workbook:
    `CoinID` on that row is now **blank**, not left at its old (now wrong)
    value. Then check Docket → Needs Attention → **Waiting on Copilot
    research**: this coin should appear there with a note like "Identity
    edited, no DB_Coins match — CoinID cleared, needs a catalog entry."
    **Also note the Docket drawer's fob number before and after this step —
    it should go UP by one** (the badge now counts research items too).
27. Undo your test edits on this coin (put Mint Mark/Year back) so it isn't
    left in a confusing state in the copy workbook.
28. **Also verify the negative case**: open Edit on a DIFFERENT coin, change
    only **Grade** or **Value** (nothing identity-related), save. **Verify:**
    `CoinID` on that row is completely untouched — check it in Excel before
    and after if you want to be certain.

---

## E. Container-derived Storage Location

29. Reopen **Edit** → **Storage** accordion, on a coin whose `Container` is
    set to a real container name.
30. **Verify:** *Storage Location* is shown as a read-only value (same flat
    muted style as Fun Fact), with the note *"Set by the Containers tab —
    change it there, not here."* (reworded this round for clarity). The
    editable text box is gone.
31. **Verify** the value shown matches that container's `StorageLocation` in
    the **Containers** tab — not necessarily the row's own
    `All.StorageLocation` cell. On today's data those agree for all 314
    containerized rows, so this will look identical either way; that's
    expected, see step 33 for the real proof.
32. Clear the **Container** field. **Verify:** the editable Storage Location
    input reappears immediately.
33. **The real test of the join** (optional but worth doing once): in the copy
    workbook's **Containers** tab, change one container's `StorageLocation` to
    something obviously fake (e.g. `ZZZ TEST LOCATION`), save, then reload the
    app and open a coin in that container. **Verify:** Browse detail's Storage
    accordion shows `ZZZ TEST LOCATION` **without** that coin's own
    `All.StorageLocation` cell having changed. That's the whole point of the
    Containers tab working. Put the container's real value back afterwards.

---

## F. Concurrent-edit hard block

This is the safety net, and the one thing worth deliberately breaking.

34. Open **Edit** on your test coin and type something into **Notes** — but
    **don't save yet**.
35. Leave the form open. In Excel (or Copilot), change **any** field on that
    same row — pick one you are *not* editing, e.g. `Seller_Link` or
    `Designation`. Save the workbook.
36. Back in the app, tap **Save Changes**.
37. **Verify:**
    - A *"Not saved — record changed"* dialog appears, naming the field
      **the other editor changed** (not the one you were editing) with its
      was/now values.
    - There is **only an OK button** — no "save anyway", no merge option.
    - **The workbook row is untouched** — your Notes text did *not* land.
    - After tapping OK you're **still on the Edit form**, and your typed
      Notes text is **still there**.
38. Tap Back, reopen Edit on the same coin, retype/confirm your Notes, save.
39. **Verify:** it saves cleanly this time, and `Remarks` on that row now holds
    your text.

---

## G. Phone pass (only if you set up port forwarding — see the top)

40. With port forwarding active, open `http://localhost:8791/app.html` in
    **Samsung Internet** on the S25.
41. Re-run **B (9–11)**, **D (17–21)**, **D2 (24, 26)** and **F (36–37)** —
    those are the places with new UI: the read-only fields, and the two
    dialogs.
42. **Verify specifically on the phone:**
    - The read-only Fun Fact / Storage Location blocks don't look like input
      boxes you'd try to type in.
    - Both dialogs fit the screen without horizontal scrolling, and their
      buttons are comfortably tappable.
    - Long values in the conflict dialog (a full Remarks sentence) wrap
      rather than overflowing.
    - The Mint Mark dropdown's new "P — Philadelphia (explicit)" option
      renders and is selectable without any layout weirdness.
    These are exactly the class of thing this environment is worst at
    catching — the headless checks passed at 412×915, but that isn't Samsung
    Internet.

---

## H. Afterwards

43. **Set `ENABLE_BROWSE_EDIT_WRITE` back to `false`** before pushing
    anything. The flag must never reach the live site as `true` while
    `app.html` has no production redirect URI. (`ENABLE_LIVE_NAV_DATA` should
    also go back to `false` if you changed it, same reasoning.)
44. If you want the copy workbook back to a clean state, either restore your
    test coin's original values by hand or re-copy the workbook.
45. Report back what passed and anything that didn't. Most useful to me:
    - The exact toast or dialog text you saw when something was wrong.
    - Any red errors in the browser console (F12 → Console) — the first live
      Graph call is where an unexpected API-shape problem would surface, and
      the error text tells me exactly which call and why.
    - Whether `Total`/`SpotValue` survived every write (step 14).
    - For CoinID re-linking specifically: the exact toast text, and what
      `CoinID` actually read in the workbook afterward.

---

## Known limitations of this pass — not bugs

- **Nothing writes to Photos / Receipts.** Those still read the old flat
  `All` columns; that migration is deliberately out of scope. The Receipt
  pill in Edit Coin is as inert as it was.
- **Edit Set, Add Coin, Wishlist and Batch Receipt still have stub Saves.**
  Only Browse Edit's Save is real. Edit Set's Fun Fact is still an editable
  textarea; that resolves when Edit Set gets its own write layer.
- **`Total` / `SpotValue` recalculation may lag** in a workbook that's open in
  another window while Graph writes to it — Excel Online recalcs on its own
  schedule. If a number looks stale, close and reopen the file before
  concluding anything went wrong.
- **Conflict detection ignores `LastModified` and `Reviewed`** by design, so
  a third-party edit that touched *only* those two columns wouldn't block a
  save. Approved as reasoned — noted here so the behavior isn't a surprise.
- **CoinID re-linking only triggers on Year/MintMark/Denomination/Variety.**
  Editing anything else (Grade, Cost, Storage, ...) never touches CoinID,
  even on the same save. If a coin's CoinID looks wrong for a reason OTHER
  than one of those four fields having just been edited, that's a
  pre-existing data issue, not something this feature would have caught or
  caused.
- **CoinID's own conflict detection is narrower than everything else's.**
  The general conflict check compares every allow-listed column against a
  live re-read before writing; CoinID isn't on that list (it has its own
  dedicated write path), so a third party changing CoinID itself between
  form-open and Save — a genuinely unusual thing to edit by hand — isn't
  something this layer would detect as a conflict. Worth knowing, not
  expected to matter in practice.
