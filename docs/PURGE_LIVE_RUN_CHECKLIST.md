# Former Holdings + Purge — Live Run Checklist (Ray)

Manual verification for the Ledger **Former Holdings** sub-catalog and the
**Purge** action, run against the **copy** workbook at
`CoinCollection/_Testing/`. `WRITE_TARGET` stays `"copy"` throughout, so
nothing here can touch the real `CoinCollection (AI).xlsx`, the real
`CoinCollection/CoinPhotos/`, or the real `CoinCollection/CoinReceipts/`.

> ## READ THIS FIRST — this is the one irreversible checklist
>
> Every other live-run checklist in this folder tests a write that can be
> undone by editing a cell back. **Purge deletes files from OneDrive
> permanently.** `deleteItem()` is not new (the promotion move has always
> used it), but every existing use deletes a source only *after* a verified
> copy exists somewhere else. This one deletes bytes with nothing to recover
> from.
>
> **Before starting: confirm `CoinCollection/_Testing/CoinPhotos/` contains
> only test copies you are willing to lose.** If any file there is the only
> copy of something, copy it out first. The app cannot tell the difference.

All app-side logic is verified headless — 127 automated assertions
(`tests/verify_former_holdings_purge.js`), plus every other suite:
**1850 total, zero failures, zero page errors**, driven by a mock Graph
client. Several of those assertions are backed by negative controls that
were run against the real `app.html` and confirmed to fail. This checklist
exists to confirm the **real Graph API** behaves the way the mock did on
your account — the mock proves our logic is right, not that Graph accepts
these exact calls.

**Follow-up build, same branch, still held: a photo's crop and its
`_original` are now independently selectable — two checkboxes, not one
bundled one — and every checkbox starts UNCHECKED (a reversal of the
original "all checked by default" design). Deleting only one of a photo's
two files clears just that field on its Photos row and leaves the row in
place, referencing the surviving file; only checking BOTH of a photo's
current files removes the row. Continue is disabled with nothing checked.
Part D below reflects this.**

**Second follow-up, same branch, still held: a coin with ZERO stored
photos of any kind now offers a real "mark purged" dialog instead of the
old dead end.** It never deletes a file or touches a Photos row — it just
writes `All.Purged="Y"` directly, the same way a normal full purge's last
step already does. A **legacy-only** coin (has a photo, just one this app
can't act on) is completely unaffected and keeps its own unchanged dead
end. New Part D2 below.

## Setup

1. Serve the repo locally: `python3 -m http.server 8791` from the repo root,
   then open `http://localhost:8791/app.html`. (Live GitHub Pages also works
   now that a production redirect URI is registered, but local is easier to
   revert if something goes wrong.)
2. Confirm in `app.html` that `WRITE_TARGET` is `"copy"`. Every write flag,
   `ENABLE_PURGE_WRITE` included, derives from it.
3. **The `Purged` column must exist on the `All` sheet of the copy
   workbook.** Add it if it isn't there — `writePurgedCell()` throws
   "The All sheet has no Purged column." rather than guessing a position.
   Header text must be exactly `Purged`; position doesn't matter (the header
   map is resolved at run time).
4. Have at least one coin in the copy workbook whose `Status` is `Sold`,
   `Gifted`, `Returned` or `Spent`, with **two or more** photos on the
   `Photos` tab. If none exists, set one up via Edit Coin → Status.
5. Note which files that coin has in `_Testing/CoinPhotos/` before you start.
   You'll be checking exactly these.
6. Also have (or set up) a **second** exited coin with **zero** photos —
   no `Photos` rows, and no legacy `Obverse`/`Reverse` value on `All`
   either. This is for Part D2 below.

---

## Part A — Former Holdings renders as a sub-catalog

- [ ] **A1** Open the Ledger drawer. The section is titled **Former
      Holdings**. There is no "Exit History" heading anywhere on the page.
- [ ] **A2** Every record whose Status is one of the four exit values is
      listed — including any Set bundle and any Roll, not just plain coins.
- [ ] **A3** Rows are ordered by Year (then Mint Mark), not in sheet order.
- [ ] **A4** A "Showing X of Y" count appears above the list.
- [ ] **A5** No **Owned** coin appears. (An "At PCGS" row, if you have one,
      also correctly does not appear — it isn't an exit status.)

## Part B — Filters

- [ ] **B1** The five chip rows render: record kind (All/Coins/Sets/Rolls),
      exit reason (All/Sold/Gifted/Returned/Spent), Denomination, Metal,
      Grading Service — plus a Year button and a search box.
- [ ] **B2** **Coins** hides Sets and Rolls; **Sets** shows only bundles;
      **Rolls** only rolls.
- [ ] **B3** Exit reason multi-selects: tapping Sold then Gifted shows both.
- [ ] **B4** A Denomination chip narrows — and confirm a Set bundle
      correctly disappears under it (a bundle is `Multiple`, so no
      denomination chip can match it — this is exactly why the kind row
      exists).
- [ ] **B5** Two axes AND together (e.g. Sold + Dimes).
- [ ] **B6** Search narrows by ID and by name.
- [ ] **B7** Set a Year filter here, then open Catalog — **Catalog's own Year
      filter is still unset.** The two pages keep separate year state.
- [ ] **B8** A filter combination matching nothing shows "No former holdings
      match these filters", not a blank area.

## Part C — Open by CollectionID

- [ ] **C1** Type an **Owned** coin's ID and press Open (or Enter) — its
      detail page opens.
- [ ] **C2** Type an **exited** coin's ID — it opens too. This surface
      deliberately does not filter by status.
- [ ] **C3** Type a nonsense ID (`AY-99999`) — a toast says no record was
      found and you stay on Ledger.
- [ ] **C4** Lower case works (`ay-00123`).

## Part D — The Purge dialog, WITHOUT confirming

**Nothing in Part D deletes anything. Do not press "Delete permanently" yet.**

- [ ] **D1** Tap **Purge** on a Former Holdings row. A dialog opens titled
      "Purge photos for AY-…".
- [ ] **D2** Every checkbox starts **UNCHECKED**. A photo that retained an
      `_original` raw shows **two independent rows** — "Photo" and
      "Original" — under its own type label (e.g. "Obverse"); a photo with
      only one file left shows one row.
- [ ] **D3** **Continue is disabled** with nothing checked. Check exactly one
      file — Continue becomes enabled. Uncheck it — Continue disables again.
- [ ] **D4** Each row shows its own real filename.
- [ ] **D5** Check just the **crop** of a two-file photo (leave its original
      unchecked), press **Continue**. The confirmation names **exactly** that
      one file, and does **not** name the original or any other photo's
      files.
- [ ] **D6** The confirmation says the deletion **cannot be undone**, and
      states what is kept: the coin's record, any receipts, and every
      unselected file.
- [ ] **D7** Press **Cancel**. Check `_Testing/CoinPhotos/` — **every file is
      still there**, and the `Photos` tab is unchanged.
- [ ] **D8** If you have a coin whose only photo is recorded in the old flat
      `All.Obverse`/`Reverse` columns with no `Photos` row: tapping Purge on
      it says "Nothing to purge" and explains why. (Skip if you have none.)

## Part D2 — The zero-photo coin: "mark purged" instead of a dead end

Use the coin from setup step 6 — exited, with **zero** stored photos and
**no** legacy `Obverse`/`Reverse` value either.

- [ ] **D2-1** Tap **Purge**. A real dialog opens, titled "Mark AY-… purged?"
      — **not** the old flat "Nothing to purge" message.
- [ ] **D2-2** It states there's nothing to delete, and offers **two real
      buttons**: Cancel and "Yes, mark purged" — not a single OK.
- [ ] **D2-3** Press **Cancel**. `All.Purged` for that row is still blank,
      and the coin is still listed in Former Holdings.
- [ ] **D2-4** Re-open Purge on the SAME coin, press **Yes, mark purged**.
      A toast reports the coin is now fully purged.
- [ ] **D2-5** On the `All` tab: `Purged` is now **`Y`**, `LastModified` is
      stamped, and `Reviewed` is **unchanged** (same as a normal full purge —
      no photo attribute changed, so nothing was re-reviewed).
- [ ] **D2-6** The coin drops out of Former Holdings, but **Open by
      CollectionID still finds it**.
- [ ] **D2-7** Confirm the coin from setup step 4 (the legacy-only one, if
      you have it) is **unaffected** — tapping Purge on it still shows the
      old, single-OK "Nothing to purge" message, never the new Yes/Cancel
      choice. This distinction — zero photos vs. "has a photo, just one this
      app can't act on" — is the whole point of D2 existing separately from
      D8.

## Part E — A PARTIAL purge (the reversible-ish one; do this first)

Pick a coin with a photo that has **both** a crop and a surviving
`_original` raw.

- [ ] **E1** Purge → check **only the crop's checkbox** (leave the original
      unchecked) → Continue → **Delete permanently**.
- [ ] **E2** A toast reports how many files were deleted (should be 1).
- [ ] **E3** In `_Testing/CoinPhotos/`: the crop file is **gone**. The
      **original file is still there.**
- [ ] **E4** On the `Photos` tab: that photo's row is **still there** —
      `Filename` is now **blank**, `OriginalFilename` is **completely
      unchanged**. This is the row surviving because it still references the
      surviving file — it is NOT detached.
- [ ] **E5** Repeat, this time checking **only the original's checkbox** for
      a different two-file photo (or the same one, if it still has both — it
      won't, after E1; pick another). Confirm the mirror image: the original
      file is gone, the crop survives, `OriginalFilename` is blank on the
      row while `Filename` is untouched.
- [ ] **E6** On the `All` tab: the coin's row still exists, its
      **CollectionID is unchanged**, and `Purged` is **still blank** (a
      partial purge does not set it).
- [ ] **E7** `LastModified` is **not** stamped for a partial purge (the flag
      write is what stamps it, and it didn't happen). `Reviewed` is unchanged
      either way.
- [ ] **E8** **The coin is still listed in Former Holdings** — a partial
      purge leaves it visible.
- [ ] **E9** **RECEIPTS: on the `Receipts` tab, every row is untouched, and
      the receipt file is still in `_Testing/CoinReceipts/`.** If this coin's
      receipt shares a `ReceiptID` with another coin, confirm that other
      coin's row is also intact. This is the single most important check in
      this document.
- [ ] **E10** Reopen Purge on the SAME coin/photo from E1 (now down to just
      the surviving original). It should offer exactly one checkbox for it.
      Check it, delete it. **This time the row itself should disappear**
      from the `Photos` tab — only checking BOTH of a photo's remaining
      files (here, the one file left) removes the row.

## Part F — A FULL purge

Pick a coin whose photos you're ready to fully remove (Part E may already
have left one down to nothing).

- [ ] **F1** Purge → check EVERY box (every crop and every original) →
      Continue → Delete permanently.
- [ ] **F2** The toast says the coin **is now fully purged and will only be
      reachable by CollectionID**.
- [ ] **F3** `All.Purged` is now **`Y`** for that row, and `LastModified` is
      stamped.
- [ ] **F4** `Reviewed` is **unchanged** — deleting photos changes no
      attribute a human reviewed.
- [ ] **F5** The `All` row and its CollectionID still exist. Cost, Value,
      Remarks, Status, sale fields — all unchanged.
- [ ] **F6** **The coin has dropped out of Former Holdings.**
- [ ] **F7** It is also absent from Catalog and from Ledger's "Find a Coin"
      (it already was, being exit-status — confirm it hasn't reappeared).
- [ ] **F8** **Open by CollectionID still finds it** and opens its detail
      page. This is the only way back to it, and it must work.
- [ ] **F9** Receipts still untouched.

## Part G — Prev/next no longer leaks

- [ ] **G1** Open an **Owned** coin's detail page from Catalog and step
      through with the prev/next arrows. You should never land on a Sold/
      Gifted/Returned/Spent coin.
- [ ] **G2** Tap a row inside Former Holdings — the arrows there walk the
      Former Holdings list, not the whole catalog.
- [ ] **G3** A coin opened via Open-by-CollectionID that is exited or purged
      gets **no arrows** (it isn't part of any list).

## Part H — Failure behaviour (optional, and worth doing)

- [ ] **H1** Turn off wifi, then try a purge. It should report a failure by
      **filename** rather than appearing to succeed. Turn wifi back on and
      check what actually happened on the sheet — a photo whose row was
      detached but whose file survived is the documented, accepted partial
      state, and the toast should have named it.
- [ ] **H2** Double-tap **Purge** quickly. The button goes pending with a
      spinning coin, and the coin's files are deleted **once**, not twice.

---

## Known limitations to expect (not bugs)

- **A legacy-only photo can never be purged**, so a coin carrying one can
  never reach `Purged = Y`. This app never writes `All.Obverse`/`Reverse`,
  so deleting the file would leave those columns pointing at nothing.
  Fixing such a coin is a workbook-side job.
- **If a row detach succeeds but its file delete then fails**, a later re-run
  finds no row for that filename and skips it rather than deleting on stale
  information — so that one file stays behind. The summary names it at the
  time. Delete it by hand if you want it gone.
- **`Purged` follows the ROWS, not the files.** If every Photos row was
  detached but one file delete failed, the coin still reads as fully purged.
  That is the deliberate consequence of row-then-file order, which exists so
  a failure can never leave a row pointing at bytes that no longer exist.
- **The five chip rows scroll horizontally on a phone**, same as Catalog's
  own filter rows. Worth saying if it feels cramped in hand — the Sets tab
  wraps instead, and this could too.

## What is NEVER touched, by design

The `All` row · the CollectionID · **Receipts (file or rows)** · any
unchecked photo · any legacy-only photo · `All.Obverse`/`All.Reverse` ·
`Reviewed`. True record deletion is a manual database action, outside the
app — it is never offered.
