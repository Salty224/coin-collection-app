# Add Set — Live Copy-Workbook Run Checklist (Ray)

This is the manual verification to run **once** before Add Set is trusted, and
before `WRITE_TARGET` is ever flipped to `"live"`. Everything below runs against
a **copy** of the workbook and a `_Testing/` Staging folder — it never touches
the real `CoinCollection (AI).xlsx`.

All app-side logic is already verified headless (57 automated assertions via a
mock Graph client). This checklist is specifically to confirm the **real Graph
API** behaves the same on your account/OneDrive as the mock did.

---

## A. One-time setup (you do these)

1. **Create the test copy of the workbook** in OneDrive at exactly:
   `CoinCollection/_Testing/CoinCollection (AI) COPY.xlsx`
   (copy your real workbook there — real data is fine and expected; the point
   is to test against real data in a throwaway location). The app will **not**
   create this for you.
2. In the Entra app registration, add the redirect URI
   `http://localhost:8791/app.html` if it isn't already there (it may be, from
   the reference-image testing round).
3. In `app.html`, set `const ENABLE_SET_WRITE_LAYER = true;`
   Leave `const WRITE_TARGET = "copy";` **as-is** (do NOT set "live" yet).
4. From the repo root run: `python3 -m http.server 8791`
5. Open `http://localhost:8791/app.html` and sign in when prompted (the first
   write will trigger a Microsoft sign-in redirect and come back).

> If anything below misbehaves, set `ENABLE_SET_WRITE_LAYER` back to `false`
> and report what you saw — nothing is committed to the real workbook regardless.

---

## B. Reservation + Step 1 (creates a real Draft)

6. Dashboard → **Add Set** tile.
7. Enter a set name (e.g. "TEST — 1999 Mint Set"), leave product code blank,
   expected count `3`. Tap **Reserve ID & start capturing coins**.
8. **Verify:** a toast shows `Reserved AY-#####` and you land on the coin step.
   The reserved number should be **one higher than the current max CollectionID
   in the COPY workbook's All sheet** (open the copy in Excel to confirm the
   number is right — this proves the live All read worked).
9. **Verify in OneDrive:** `CoinCollection/_Testing/Staging/AY-#####/set.json`
   now exists, and its `status` is `"Draft"`, `gsid` is `""`, and `researchNote`
   mentions "GSID pending".

## C. Children + resume

10. Capture coin 1 (pick a denomination, optionally a photo), tap **Save this
    coin & add another**. Verify the progress advances to "Coin 2 of 3" and the
    form clears.
11. Capture coin 2. Then tap **Pause — leave as Draft, finish later**.
12. **Verify:** you land on **In Progress Sets** and the set is listed as
    "2 of 3 coins captured". Close the browser tab entirely, reopen
    `http://localhost:8791/app.html`, go to **In Progress Sets** — the draft is
    still there (proves durability across sessions).
13. Tap the draft to resume; verify it reopens at "Coin 3 of 3". Capture coin 3.
14. **Verify in OneDrive:** `set.json` now has 3 children with ids
    `AY-#####-A/-B/-C`, each with `originSetId` = the parent id. If you added
    child photos, confirm `AY-#####-A_obverse.jpg` etc. exist in the same
    Staging folder.

## D. Mark complete

15. Tap **Done — mark set complete (pending research)**.
16. **Verify in OneDrive:** `set.json` `status` is now
    `"Complete — pending research"` and `confirmedChildCount` is set. Confirm the
    set no longer appears in **In Progress Sets**.

## E. Promotion file-move (simulate the external reconciliation step)

17. In OneDrive, hand-edit that `set.json` and change `status` to `"Promoted"`
    (this is standing in for what Copilot/reconciliation will do). Leave
    `filesMovedOnPromotion` as `false`.
18. Reload `http://localhost:8791/app.html` (the move runs at launch).
19. **Verify in OneDrive:** the child/receipt/whole-set photos have **moved**
    out of the Staging folder into `CoinCollection/_Testing/CoinPhotos/` and
    `.../CoinReceipts/` with the final names (`{childId}_obverse.jpg`,
    `{parent}_receipt.jpg`, `{parent}_set.jpg`). The Staging folder should no
    longer contain those photos, and `set.json` `filesMovedOnPromotion` is now
    `true`.
20. Reload once more and confirm nothing changes (idempotent — no duplicate
    copies, no errors).

## F. Failure-safety spot check (optional but recommended)

21. Set up another Promoted draft, but before reloading, delete ONE of its
    destination folders' write permission (or just confirm the general
    behavior): the contract is **copy → verify → only then delete original**,
    so if a copy can't be verified the source photo stays put and the draft
    stays `Promoted` for a retry. You verified this exact path headless; this
    step is only if you want to see it live.

---

## G. What "confirmed working" means

Add Set is confirmed when: B8–B9, C12–C14, D16, and E19–E20 all check out on
your real OneDrive against the copy workbook, with no photos ever lost and the
reserved IDs matching the copy's actual All high-water mark.

## H. Going live (separate, later, explicit)

Only after G passes clean and you explicitly decide to:
- Set `WRITE_TARGET = "live"` in `app.html`.
- Register a **production** redirect URI (bare `.../app.html`) in Entra and
  switch the write MSAL `redirectUri` off localhost.
- Re-confirm B8–B9 once against the real workbook's All sheet before relying
  on it.

Until then, leave `WRITE_TARGET = "copy"` and `ENABLE_SET_WRITE_LAYER = false`
on anything deployed.
