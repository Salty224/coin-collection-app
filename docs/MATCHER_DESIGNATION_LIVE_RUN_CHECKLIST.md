# Designation Matcher Hardening — Live Run Checklist (Ray)

Manual verification for the `claude/matcher-designation-hardening` branch,
run against the **copy** workbook at
`CoinCollection/_Testing/CoinCollection (AI) COPY.xlsx`. `WRITE_TARGET` stays
`"copy"` throughout — nothing here can touch the real workbook.

All app-side logic is already verified headless (47 assertions in
`verify_designation_matcher.js`, up from the original 34, plus the full
651-assertion main branch baseline re-run clean = 698 total). This checklist confirms
the **real Graph reads + the real DB_Coins catalog** behave the way the mock
did — the mock can't prove the matcher narrows correctly against the real
3,833-row DB_Coins, only that the logic around it is right.

> **What this branch changed, in one paragraph.** `DB_Coins.Designation`
> (column AH, 78 FB Mercury Dime rows) is now part of the DB_Coins match. A
> blank `All.Designation` is treated as "not FB" and selects the plain
> catalog row; an `FB` value selects the FB row. A Designation change now
> also re-links CoinID, and any identity edit that lands on a *different*
> CoinID routes through a new **"Confirm catalog re-link"** dialog instead of
> applying silently. See CLAUDE.md → "Matcher hardening" for the full design.
>
> **Update (2026-08-18), from the first live-test pass:** the blank-as-value
> rule above is now WITHHELD whenever the coin's own `GradeSource` resolves
> to a real certification service (`Lookup_Graders.Type = "Service"` —
> PCGS/NGC/ANACS/ICG/CAC) — a real gap the first pass found on `AY-00207`
> (its cert data contradicts what the narrowing tier would have silently
> written). For a Service-graded coin, an edit that would otherwise narrow
> now correctly falls back to the **ambiguous picker** instead, same as
> before this feature existed. Seller/Owner/AI-est-sourced coins are
> unaffected — see §B below, updated for this.

---

## Read this first: where this pass can happen

Same constraint as the Browse Edit write layer — the only Entra redirect URI
for `app.html` is `http://localhost:8791/app.html`:

- **This runs on your PC, desktop browser, local server.** A phone on the
  live GitHub Pages site can't do it (no production redirect URI; the flags
  ship `false`).
- Nothing here writes the real workbook regardless of what goes wrong —
  `WRITE_TARGET` is `"copy"`, and the only writes are the edited row's own
  cells plus the single CoinID cell (the same narrow paths the Browse Edit
  write layer already uses).

---

## A. Setup

1. On branch `claude/matcher-designation-hardening`, in `app.html` set BOTH:
   - `const ENABLE_BROWSE_EDIT_WRITE = true;`  (so saves actually write and
     the re-link dialog fires against a real write)
   - `const ENABLE_LIVE_NAV_DATA = true;`  (so the matcher runs against the
     REAL DB_Coins — with it off it matches the 12-row mock and none of the
     coins below resolve)
   Leave `const WRITE_TARGET = "copy";` exactly as-is.
2. Confirm the `_Testing` copy is current — specifically that its `DB_Coins`
   tab has the 34-column layout with `Designation` at column AH and the 78
   FB rows. Quick check: `DB_Coins!AH1` should read `Designation`, and a
   filter on that column should show 78 `FB` values, all Mercury Dimes.
   **Also confirm the two mint columns**: `MintMark` (H, the abbreviation)
   and the newer `Mint` (AG, full name). The matcher reads **`MintMark` (H)**
   — the full-name `Mint` column is not used by any match and shouldn't be.
   **Also confirm `Lookup_Graders`** has a `Type` column with PCGS/NGC/
   ANACS/ICG/CAC all reading `Service` — the cert-protection guard (§B2)
   reads this live; if it's missing/misnamed the guard silently falls back
   to "not a service" for everyone and §B2 would incorrectly behave like §B.
3. From the repo root: `python3 -m http.server 8791`
4. Open `http://localhost:8791/app.html`.

> **Expected on first open: ONE sign-in, once** (shared MSAL instance) — a
> full page load landing back on the Dashboard. Navigate back and continue.
> If anything misbehaves, set both flags back to `false`.

**Test coins used below (verified against the current copy):**
- `AY-00518` — 1920-D Mercury Dime, `Designation` blank, `GradeSource`
  blank (raw, no cert on file), `CoinID = C-1920-D-10C-01` (the plain row).
  Base key: plain `C-1920-D-10C-01` + FB `C-1920-D-10C-02`. **The clean
  blank↔FB demonstrator — swapped in for the original `AY-00207` pick,
  which turned out to be PCGS-certified and now belongs in §B2 instead
  (see the note below).**
- `AY-00680-C` — 1945-D Mercury Dime, `Designation = FB`, `GradeSource`
  blank (raw), `CoinID = C-1945-D-10C-02` (the FB row — already correctly
  linked). Base key: plain `C-1945-D-10C-01` + FB `C-1945-D-10C-02`. **The
  clean FB demonstrator** — this is the coin Ray actually substituted
  in-session for the original `AY-00240` pick (also certified, same
  reason).
- `AY-00207` — 1916-D Mercury Dime, blank Designation, **`GradeSource =
  PCGS`, `SerNo = 4906.06/33115202`** (a real cert). Base key: plain
  `C-1916-D-10C-01` + FB `C-1916-D-10C-02` — same shape as `AY-00518`, but
  Service-graded. **Now the cert-protection demonstrator (§B2)**, not the
  plain blank↔FB one — this is the coin that first surfaced the guard's
  absence during Ray's live-test pass.
- `AY-00208` — 1916-S Mercury Dime, blank Designation. Base key has **two
  plain rows** (`-01`, `-02`) plus the FB `-03`. Used only to confirm the
  picker *legitimately still appears* here (see §E).

---

## B. Blank-Designation dime: FB narrowing + the re-link confirm (`AY-00518`)

5. Catalog → find `AY-00518` (1920-D Mercury Dime) → **Edit**. (Sign-in
   redirect the first time; reopen.)
6. In the **Overview** accordion, set **Designation** to `FB`. Change nothing
   else. Tap **Save Changes**.
7. **Verify:** a dialog titled **"Confirm catalog re-link"** appears, reading
   `CoinID: C-1920-D-10C-01 → C-1920-D-10C-02`. **The ambiguous "pick one"
   list must NOT appear** — the designation tier narrowed the two catalog
   rows to the single FB row, so there's nothing to pick. (Before this
   branch, this edit would have popped the plain-vs-FB picker.)
8. Tap **Cancel**. **Verify in the copy workbook:** `AY-00518`'s row is
   **unchanged** — `Designation` still blank, `CoinID` still
   `C-1920-D-10C-01`. Nothing was written (the whole save is gated behind the
   confirm).
9. Save again, this time tap **Confirm**. **Verify in the copy workbook:**
   `AY-00518` now has `Designation = FB` **and** `CoinID = C-1920-D-10C-02`.
   Both landed.
10. **Restore it** (so the copy isn't left changed and to test the reverse
    direction): reopen Edit, set **Designation** back to blank, Save,
    **Confirm** the re-link. **Verify:** the dialog read
    `CoinID: C-1920-D-10C-02 → C-1920-D-10C-01`, and the row is back to blank
    Designation / `C-1920-D-10C-01`. This is the blank-as-value rule
    selecting the plain row.

---

## B2. Cert-protected dime: the picker fires instead of narrowing (`AY-00207`) — NEW

This is the guard added in response to the first live-test pass — confirms
the exact `AY-00207` finding from that session is now fixed.

10a. Catalog → find `AY-00207` (1916-D Mercury Dime, `GradeSource = PCGS`,
     `SerNo = 4906.06/33115202`) → **Edit**.
10b. In the **Overview** accordion, set **Designation** to `FB`. Leave
     GradeSource as PCGS (it's already on the row). Tap **Save Changes**.
10c. **Verify: the ambiguous "pick one" list appears** (`designationAmbiguousPanel`),
     listing both the plain (`C-1916-D-10C-01`) and FB (`C-1916-D-10C-02`)
     rows. **The single-candidate "Confirm catalog re-link" dialog must NOT
     appear** — a Service GradeSource withholds the blank-as-value
     narrowing, so this now behaves exactly like `AY-00208` in §E (real,
     surfaced ambiguity) instead of silently resolving.
10d. **Verify in the copy workbook:** nothing was written — `AY-00207`'s
     `Designation` and `CoinID` are both unchanged, since the picker requires
     an explicit choice and none has been made yet.
10e. Back out of the picker without choosing (there's no data-safe "correct"
     choice to make here without actually reading the coin's holder — that's
     the point). Confirm the row is still untouched.

---

## C. FB dime: blank selects plain, FB selects FB (`AY-00680-C`)

11. Catalog → `AY-00680-C` (1945-D Mercury Dime, already `Designation = FB`) →
    **Edit**.
12. Set **Designation** to blank. Save. **Verify:** the re-link dialog reads
    `CoinID: C-1945-D-10C-02 → C-1945-D-10C-01` (FB row → plain row). Tap
    **Confirm**. Check the copy: `Designation` blank, `CoinID =
    C-1945-D-10C-01`.
13. **Restore:** reopen Edit, set **Designation** back to `FB`, Save,
    **Confirm**. Dialog reads `C-1945-D-10C-01 → C-1945-D-10C-02`; row back to
    `FB` / `C-1945-D-10C-02`.
14. **Sanity — no spurious dialog when nothing re-links:** reopen `AY-00680-C`
    (now `FB` again), change only its **Grade** (e.g. to a neighbouring MS
    value), Save. **Verify:** NO "Confirm catalog re-link" dialog, and
    `CoinID` in the copy is untouched. Then set Grade back and save.

---

## D. The general re-link confirm on an identity edit — non-destructive (any coin)

This is the original AY-00008 class (a Year/Mint edit silently re-pointing
CoinID). We only need to see the dialogs, so **Cancel** — nothing is written.

15. Open **Edit** on any coin whose Year+Mint has a different, real DB_Coins
    row at a neighbouring value (a 1945-D dime works: change Mint to `S`).
    Change the identity field. Save.
16. **Verify the two dialogs appear in sequence:** first **"Confirm identity
    change"** (the field overwrite), then after confirming it, **"Confirm
    catalog re-link"** (the CoinID X→Y consequence). Tap **Cancel** on the
    re-link dialog.
17. **Verify:** the copy workbook row is **completely unchanged** — neither
    the identity field nor CoinID was written (Cancel aborts the whole save).
    This is the confirmation that was missing when a Year edit used to
    silently corrupt a row's catalog link.

---

## E. Genuinely-still-ambiguous case — NOT a bug (`AY-00208`) — read, optional to repro

This is a heads-up, not a required action: some dates have **two plain
catalog rows** (1916-S and 1916-P both do), and Designation can't separate
*those* — so the picker legitimately still appears for them.

18. Understand the expectation: for `AY-00208` (1916-S, blank Designation),
    the base key has catalog rows `-01` (plain), `-02` (plain) and `-03`
    (FB). A blank Designation narrows away the FB row but keeps **both plain
    rows**, so any identity-resolving save still surfaces the ambiguous "pick
    one" list. **That residual picker is correct** — it's real plain-vs-plain
    ambiguity (two die pairings/varieties), which this branch deliberately
    does not touch. Only the plain-vs-FB collision was removed.
19. (Optional) If you want to see it: on `AY-00208`, set **Designation** to
    `FB` and Save — it narrows to the single FB row and you get the re-link
    confirm (no picker), same as §B. To see the residual plain-vs-plain
    picker instead, you'd need an identity-changing save while Designation
    stays blank; not worth doing destructively here. **Cancel** / back out
    without writing either way.

---

## F. Non-dime unaffected

20. Open **Edit** on any non-dime (e.g. a Morgan Dollar or a Lincoln Cent),
    change an identity field to a value with a real DB_Coins match, Save,
    and confirm the dialogs behave exactly as they did before this branch
    (identity confirm, then re-link confirm if the CoinID differs). **Verify:**
    no Designation-related weirdness — no non-dime DB_Coins row carries a
    Designation, so the new tier is a no-op there. Cancel or restore.

---

## G. Afterwards

21. **Set both `ENABLE_BROWSE_EDIT_WRITE` and `ENABLE_LIVE_NAV_DATA` back to
    `false`** before pushing anything. Neither may reach the live site as
    `true` while `app.html` has no production redirect URI.
22. Confirm any test coin you changed is back to its original values
    (§B/§C round-trip back on their own if you followed the restore steps;
    §D/§E/§F were Cancel-only and wrote nothing).
23. Report back what passed and anything that didn't. Most useful to me:
    - The exact dialog title/text when something looked wrong.
    - For any re-link: the `CoinID: X → Y` the dialog showed vs. what the
      copy workbook's `CoinID` actually read afterward.
    - Any red console errors (F12 → Console) — the first live catalog match
      is where an unexpected column-name/data-shape problem would surface.
    - Whether the plain-vs-FB **picker is gone** for the raw, uncertified
      cases (`AY-00518` §B, `AY-00680-C` §C) while it **correctly reappears**
      for the cert-protected case (`AY-00207` §B2) and the genuinely-still-
      ambiguous case (`AY-00208` §E).

---

## Known limitations of this pass — not bugs

- **Blank-Designation FB dimes resolve to the plain row — but ONLY when
  there's no real certification on file to check it against.** An owned,
  uncertified (Seller/Owner/blank GradeSource) Mercury dime that's physically
  Full Bands but not yet recorded `FB` in `All.Designation` silently resolves
  to the plain catalog row instead of surfacing the picker. Deliberate,
  accepted (it's what stops the 78 FB rows from flooding the Docket for the
  ~55 owned dimes with no other signal to check against). Logged as a
  ParkingLot item — "Physical FB check pass on owned Mercury dimes" (Data /
  Medium). See CLAUDE.md session log. **A PCGS/NGC/ANACS/ICG/CAC-certified
  dime is explicitly NOT subject to this** as of the cert-protection guard —
  see §B2 — it gets the ambiguous picker instead, so a human decides rather
  than the app writing a Designation that could contradict the coin's actual
  holder.
- **The cert-protection guard is a WITHHOLD, not a DERIVE.** It stops the
  Designation tier from narrowing when a real cert exists; it does not read
  the cert (SPEC/PCGS#) and pick the correct row automatically. That
  cert-derived-resolution enhancement is a separate, deliberately deferred
  ParkingLot item — Ray's explicit call to keep this pass to "don't let a
  softer signal override a cert" rather than building the decode/lookup path
  too.
- **Dates with multiple plain catalog rows still show the picker** (1916-S,
  1916-P, etc.). Designation only resolves the plain-vs-FB split; real
  plain-vs-plain ambiguity is untouched and correctly still asks. (§E.)
- **Out of scope, untouched:** Thread B (link audit / further backfill),
  copper-color RD/RB/BN designations, and Add Coin's lack of a Finish input.
  The workbook's own ParkingLot "Thread B worklist" row already notes this
  Designation-only fix won't catch the commemorative wrong-link class.
- **Add-Coin-created research entries carry a blank Finish** and so match
  slightly more broadly — a pre-existing, accepted limitation, unrelated to
  this branch.
