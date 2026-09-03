# Add Coin write layer — Phase 1 live-run checklist

**Live-test status: NOT STARTED.** Everything below is unverified against a
real OneDrive session. Phase 1 was verified headlessly only (66 assertions,
mock Graph client) — see CLAUDE.md, "Add Coin write layer — Phase 1".

Same shape as `docs/BROWSE_EDIT_LIVE_RUN_CHECKLIST.md` and
`docs/DOCKET_LIVE_RUN_CHECKLIST.md`. Work top to bottom; stop and report at
the first failure rather than pressing on.

---

## What Phase 1 does and does NOT do

**Read this first, or Part D will look like a bug.**

- Phase 1 writes **Staging drafts only** — `coin.json` plus that coin's photos,
  under `CoinCollection/_Testing/Staging/{CollectionID}/`.
- It creates **no `All`-sheet row**, for either save option. "Save to Database"
  and "Save to Staging" both write a draft; which one you chose is recorded on
  the draft as `savedVia`.
- Staging Review's action is therefore **"Mark ready"**, not "Promote" — it
  flags the draft for Copilot reconciliation to move the row across.
- Both screens show an interim banner saying exactly this. If you don't see
  those banners, the flag isn't on and you're testing the mockup path.

---

## Setup

1. `dev-flags.local.js` in the repo root (copy from
   `dev-flags.local.example.js`) with **all** of:
   ```js
   window.__DEV_FLAGS__ = {
     ENABLE_ADDCOIN_WRITE: true,
     ENABLE_LIVE_NAV_DATA: true,   // else DB_Coins is the 12-row mock and
                                   // almost nothing matches
     ENABLE_BROWSE_EDIT_WRITE: true, // else Edit Coin silently stays on its
                                   // session-only stub -- see below
     WRITE_TARGET: "copy",         // leave as "copy"
   };
   ```
   **`ENABLE_BROWSE_EDIT_WRITE` matters too, and this checklist used to omit
   it.** It is a SEPARATE flag from `ENABLE_ADDCOIN_WRITE`. With it off, Add
   Coin and Promote write for real while **Edit Coin silently falls back to
   its session-only stub**: the save toasts "for this session only", nothing
   reaches the workbook, and NEITHER the identity-overwrite nor the
   CoinID-change confirmation fires (both gates live on the write path,
   downstream of that fallback). It looks exactly like a broken save. This
   cost a whole live round once — don't repeat it.

   **`ENABLE_LIVE_NAV_DATA` matters.** Without it the matcher runs against the
   12-row `FAKE_DB_COINS` mock, so every real coin reports "no DB_Coins match"
   and Parts C/D test nothing. This is the same gap that made the first Browse
   Edit live pass misleading.
2. `python3 -m http.server 8791` from the repo root.
3. Open `http://localhost:8791/app.html` — **not** the GitHub Pages site. The
   only redirect URI registered for `app.html` is
   `http://localhost:8791/app.html`.
4. Confirm `CoinCollection/_Testing/` holds `CoinCollection (AI) COPY.xlsx`,
   `Staging/`, `CoinPhotos/`, `CoinReceipts/`.
5. First load will bounce to Microsoft sign-in and return to the Dashboard,
   not to where you were. Expected (MSAL redirect), not a bug.

**Known gotcha, carried over from the Docket run:** DB_Coins is fetched once
per page load. If you add a DB_Coins row in Excel mid-session, hard-reload
(`Ctrl+Shift+R`) before expecting the matcher to see it — otherwise it looks
like a matching failure.

---

## Part A — Inertness (do this first)

Temporarily set `ENABLE_ADDCOIN_WRITE: false`, reload.

- [ ] A1 Add Coin shows **no** interim banner.
- [ ] A2 Saving a coin toasts "Placeholder only — … Nothing written to OneDrive
      yet." and nothing appears under `_Testing/Staging/`.
- [ ] A3 Staging Review shows the "Placeholder only" note, **not** the interim
      banner, and its action reads "Promote".

Set the flag back to `true` and reload before continuing.

---

## Part B — Reservation

- [ ] B1 Note the highest `AY-#####` on the COPY workbook's `All` sheet, and
      the highest-numbered folder under `_Testing/Staging/`.
- [ ] B2 Save any coin to Staging. The reserved id is **max of those two, + 1**
      — not max(All)+1. This is the unification; if it ignores an existing
      Staging folder, stop and report.
- [ ] B3 Confirm a folder named for that id now exists under
      `_Testing/Staging/` containing `coin.json`.
- [ ] B4 An existing Add **Set** draft folder still counts toward the max
      (create one if none exists), and vice versa — the two features must not
      collide in the same namespace.

---

## Part C — A clean single-match save

Pick a coin you know has exactly one DB_Coins row.

- [ ] C1 As Year/Denomination/Mint fill in, the green "Matched DB_Coins — C-…"
      banner appears.
- [ ] C2 Capture an obverse photo through both crop stages.
- [ ] C3 Attach a receipt (photo or PDF).
- [ ] C4 Save to Staging. Toast names the CollectionID, the file count, and the
      CoinID.
- [ ] C5 In OneDrive, the draft folder contains: `coin.json`,
      `{id}_obverse_cropped.png`, `{id}_obverse_original.png`,
      `{id}_receipt.pdf`.
- [ ] C6 **No filename anywhere contains `__addcoin_draft__`.** That's the
      temp-id reconciliation; if you see it, stop and report.
- [ ] C7 `coin.json` carries the right `coinId`, `matchedHow: "single"`,
      `finish`, purchase fields, and `remarks`.
- [ ] C8 Enter a second coin in the same session — it must **not** re-upload
      the first coin's photos.

---

## Part D — Ambiguity (the important one)

Pick a coin whose base key has 2+ DB_Coins rows. Good candidates: a Mercury
dime, or one of the known commemorative pairs.

- [ ] D1 The amber "N catalog entries match this coin" banner appears — **not**
      the green single-match banner.
- [ ] D2 Press Save. A picker opens listing every candidate.
- [ ] D3 **Each candidate is readable and distinguishable** — in particular the
      Description is not cut off with an ellipsis. This is the fix that
      justifies not auto-resolving commemoratives; if a row is truncated so you
      can't tell two candidates apart, stop and report.
- [ ] D4 **Before picking**, check OneDrive: no new folder, no `coin.json`.
      Nothing may be reserved or written until you choose.
- [ ] D5 Press "Cancel — don't save yet". Nothing written; the form still holds
      everything you typed.
- [ ] D6 Save again, pick a candidate. The draft's `coinId` is **the one you
      picked**, `matchedHow` is `"picked"`, and the research note flags the
      ambiguity.

---

## Part E — Finish

- [ ] E1 On a date with both a Proof and a Business Strike catalog row, leave
      Finish blank → the ambiguous banner appears.
- [ ] E2 Set Finish to match the coin → it narrows to a single match.
- [ ] E3 Set Finish to `Circulated` (a value `All` has but DB_Coins doesn't) →
      it must fall back to the full candidate list, **never** to "no match".
- [ ] E4 Decode a PCGS label → Finish is filled in from the matched row.

---

## Part F — Staging Review

- [ ] F1 Interim banner visible; action reads "Mark ready".
- [ ] F2 Each row shows status, CoinID (or "CoinID pending"), and a file count.
- [ ] F3 "Mark ready" → status becomes `Ready for reconciliation` in
      `coin.json`, the button becomes a greyed-out "Ready", and **no row is
      added to the COPY workbook's `All` sheet**. Confirm that last part
      directly in Excel.
- [ ] F4 Reject a draft → its whole folder disappears, photos included.
- [ ] F5 Reject the highest-numbered draft, then save a new coin — the id is
      reused. Reject a mid-sequence one and confirm that id is **never** handed
      out again.

---

## Part G — Docket integration

- [ ] G1 Save a coin with no DB_Coins match → it appears in the Docket's
      "Waiting on Copilot research" section, **with its description**, not a
      blank name.
- [ ] G2 A draft marked ready appears as "… ready for reconciliation — waiting
      on the All-sheet row".
- [ ] G3 Reload the page — both survive (they're durable files, not memory).
- [ ] G4 Open the Docket twice in quick succession after a reload — entries
      must appear **once**, not doubled (the render-token guard).

---

## Part H — Failure behaviour

- [ ] H1 Kill your network mid-save. The toast reports the failure honestly and
      says nothing was written; the form keeps your entry.
- [ ] H2 Restore the network and save again — it lands cleanly.

---

## Cleanup

Delete any test drafts from `_Testing/Staging/` when done. Nothing in the repo
needs changing. **Set `ENABLE_ADDCOIN_WRITE` back to `false`** (or just delete
`dev-flags.local.js`) before committing anything.

---

## Known limitations (not bugs)

- No `All`-sheet row is ever created — that's Phase 2.
- `Finish` is captured on the draft but is not yet a writable `All` column;
  Phase 2 adds it to `ALL_WRITABLE_COLUMNS`.
- Album assignment is recorded on the draft but nothing acts on it yet.
- Post-save Albums matching (offer to fill a slot) is still unbuilt.
