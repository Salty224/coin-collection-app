# Browse Edit Write Layer — Live Run Checklist (Ray)

Manual verification for the Browse Edit write layer, run against the **copy**
workbook at `CoinCollection/_Testing/CoinCollection (AI) COPY.xlsx`. Nothing
here touches the real `CoinCollection (AI).xlsx` — `WRITE_TARGET` stays
`"copy"` throughout, and this is the app's first code that writes *into* a
workbook at all, so the copy is the whole safety net.

All app-side logic is already verified headless (206 automated assertions
across two viewports, driven by a mock Graph client). This checklist exists to
confirm the **real Graph Excel API** behaves the way the mock did on your
account — the mock cannot prove that Graph accepts these exact range/batch
calls, only that our logic around them is right.

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

1. **Confirm the copy workbook is current** — you said you'd check this right
   before the run. It needs the restored `SpotValue`/`Total` formulas and the
   current schema (Photos / Receipts / Containers / LastModified). This
   matters more than usual: several steps below verify that formulas survive
   a write, which proves nothing against a copy that has no formulas.
   Quick check in Excel: click `All!U2` and `All!Z2` — the formula bar should
   show a formula, not a number.
2. Confirm the Entra redirect URI `http://localhost:8791/app.html` exists (it
   should, from the reference-image and Add Set rounds).
3. On the branch `claude/browse-edit-write-layer`, in `app.html` set:
   `const ENABLE_BROWSE_EDIT_WRITE = true;`
   Leave `const WRITE_TARGET = "copy";` **exactly as-is**.
   Leave `ENABLE_SET_WRITE_LAYER` alone — this feature has its own flag now
   and doesn't need Add Set's.
4. From the repo root: `python3 -m http.server 8791`
5. Open `http://localhost:8791/app.html`.
6. **Pick a throwaway test coin** and note its CollectionID, plus its current
   Year / Grade / Cost / Remarks / Container from the copy workbook. Ideally
   pick one that already has a Container set (so Part E has something to
   show) — e.g. anything with `Container = "Coin Slab Box 1"`.

> **Expected on first Edit open:** the page will bounce to a Microsoft
> sign-in and come back to the **Dashboard**, not to the form. That's the
> normal MSAL redirect flow (a full page load, so app state resets) — not a
> bug. Just navigate back to the coin and open Edit again; from then on it's
> silent for the rest of the session.

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

## E. Container-derived Storage Location

23. Reopen **Edit** → **Storage** accordion, on a coin whose `Container` is
    set to a real container name.
24. **Verify:** *Storage Location* is shown as a read-only value (same flat
    muted style as Fun Fact), with the note *"Set by this coin's container —
    change it on the container, not here."* The editable text box is gone.
25. **Verify** the value shown matches that container's `StorageLocation` in
    the **Containers** tab — not necessarily the row's own
    `All.StorageLocation` cell. On today's data those agree for all 314
    containerized rows, so this will look identical either way; that's
    expected, see step 27 for the real proof.
26. Clear the **Container** field. **Verify:** the editable Storage Location
    input reappears immediately.
27. **The real test of the join** (optional but worth doing once): in the copy
    workbook's **Containers** tab, change one container's `StorageLocation` to
    something obviously fake (e.g. `ZZZ TEST LOCATION`), save, then reload the
    app and open a coin in that container. **Verify:** Browse detail's Storage
    accordion shows `ZZZ TEST LOCATION` **without** that coin's own
    `All.StorageLocation` cell having changed. That's the whole point of the
    Containers tab working. Put the container's real value back afterwards.

---

## F. Concurrent-edit hard block

This is the safety net, and the one thing worth deliberately breaking.

28. Open **Edit** on your test coin and type something into **Notes** — but
    **don't save yet**.
29. Leave the form open. In Excel (or Copilot), change **any** field on that
    same row — pick one you are *not* editing, e.g. `Seller_Link` or
    `Designation`. Save the workbook.
30. Back in the app, tap **Save Changes**.
31. **Verify:**
    - A *"Not saved — record changed"* dialog appears, naming the field
      **the other editor changed** (not the one you were editing) with its
      was/now values.
    - There is **only an OK button** — no "save anyway", no merge option.
    - **The workbook row is untouched** — your Notes text did *not* land.
    - After tapping OK you're **still on the Edit form**, and your typed
      Notes text is **still there**.
32. Tap Back, reopen Edit on the same coin, retype/confirm your Notes, save.
33. **Verify:** it saves cleanly this time, and `Remarks` on that row now holds
    your text.

---

## G. Phone pass (only if you set up port forwarding — see the top)

34. With port forwarding active, open `http://localhost:8791/app.html` in
    **Samsung Internet** on the S25.
35. Re-run **B (9–11)**, **D (17–21)** and **F (28–31)** — those are the three
    places with new UI: the read-only fields, and the two dialogs.
36. **Verify specifically on the phone:**
    - The read-only Fun Fact / Storage Location blocks don't look like input
      boxes you'd try to type in.
    - Both dialogs fit the screen without horizontal scrolling, and their
      buttons are comfortably tappable.
    - Long values in the conflict dialog (a full Remarks sentence) wrap
      rather than overflowing.
    These are exactly the class of thing this environment is worst at
    catching — the headless checks passed at 412×915, but that isn't Samsung
    Internet.

---

## H. Afterwards

37. **Set `ENABLE_BROWSE_EDIT_WRITE` back to `false`** before pushing
    anything. The flag must never reach the live site as `true` while
    `app.html` has no production redirect URI.
38. If you want the copy workbook back to a clean state, either restore your
    test coin's original values by hand or re-copy the workbook.
39. Report back what passed and anything that didn't. Most useful to me:
    - The exact toast or dialog text you saw when something was wrong.
    - Any red errors in the browser console (F12 → Console) — the first live
      Graph call is where an unexpected API-shape problem would surface, and
      the error text tells me exactly which call and why.
    - Whether `Total`/`SpotValue` survived every write (step 14).

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
