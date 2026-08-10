# Browse Edit real write layer — prework notes (schema verification + open questions)

**Status:** Research/scoping only. No code written, no branch created. Picking
up in a future session once Ray has answered the questions below and the
in-progress database fixes are resolved.

**Source workbook checked against:** `CoinCollection_AI.xlsx` uploaded
2026-08-10 (filename on disk: `a80f4451-CoinCollection_AI.xlsx`). This is
**not necessarily the same copy** that will exist when implementation starts
— re-verify anything load-bearing (row counts, "zero duplicates," "zero
orphans") against whatever workbook is current at that time, especially since
Ray flagged that this review surfaced database errors currently being fixed.

## Original task spec (for reference)

Build the real OneDrive write layer for **Browse Edit** (editing an existing
coin record) — first form to get a real write, proving the pattern before
Add Coin / Edit Set / Wishlist / Batch Receipt. New feature branch, **do not
auto-merge** — hold for a real-device pass, same as recent architectural
work. Scope is Browse Edit's Save button only; every other form's Save stays
a stub.

**Core write mechanism:**
- Target the row by matching CollectionID at write-time via Graph API, never
  by a remembered row index/position.
- Each save is a small, atomic, single-row Graph API update — no long-lived
  editing session.
- On successful write, stamp `LastModified` with the current timestamp (a
  real date/time value, not text).

**Column allow-list** (Browse Edit may ONLY ever write these on `All`, never
anything else, especially never a formula column):
`Year, MintMark, Denomination, Variety, Description, Value, Cost, Shipping,
Seller_Link, PurchaseDate, StorageLocation, Container, Grade, GradeSource,
Designation, Remarks, LastModified` (+ Notes/FunFact if/where they exist as
columns — see Discrepancy 1, they don't).
**Never write, under any circumstance:** `SpotValue, Total, CollectionID,
CoinID, SetID, OriginSetID`, or anything not explicitly listed.

**Conflict detection (concurrent-edit safety net):** snapshot every
allow-listed column's value when the form opens. On Save, before writing,
re-read those same columns fresh and compare field-by-field. Any difference
→ hard block, show which field(s) changed and their current value, preserve
the user's in-progress form edits, no auto-merge. User must reload/reapply or
back out.

**Identity-field overwrite confirmation** (separate from conflict detection):
fires only when the user's edit changes `Year, MintMark, Denomination,
Variety, Description` from a non-blank existing value to a different value.
Filling a blank field never triggers it. Same rule applies to Edit Set's
Year/Description if reachable via a shared code path this branch touches —
otherwise note as a follow-up for Edit Set's own future write layer.

**Read-layer join (build alongside, same branch):** wherever a coin/Set/child
coin's StorageLocation displays, resolve via that row's own `Container` value
looked up in the new `Containers` tab (`ContainerName -> StorageLocation`) —
same lookup logic regardless of record type, no parent/child special-casing.
Blank Container → fall back to the row's own flat `StorageLocation` (loose
coin). Does **not** extend to Photos/Receipts reads this build — those stay
on the old flat `All` columns; that migration is explicitly out of scope
here.

**Auth:** confirm/extend write scope (`Files.ReadWrite`) on the existing MSAL
setup as needed — reads currently use a dedicated read-only instance; writes
need their own properly-scoped path.

## Schema verification findings (against the uploaded workbook)

**Confirmed correct / as CLAUDE.md documents:**
- Sheet `All`, backed by table **`AllCoins`** (table name not previously
  recorded anywhere in CLAUDE.md). 542 data rows, 49 columns (A–AW).
- **CollectionID is unique across all 542 rows — zero duplicates.**
  Write-by-CollectionID-match is safe to build on.
- Headers have no spaces; denomination short codes confirmed; `SerNo`,
  `CertLink`, `Obverse`/`Obverse_Original`/`Reverse`/`Reverse_Original`,
  `OriginSetID` (col AU) all present as documented.
- **`Containers`** tab: `ContainerName, StorageLocation, Notes, DateAdded` —
  11 rows, exactly as spec'd.
- **`Photos`** tab: `PhotoID, CollectionID, PhotoType, SubGroupID, Filename,
  Label, DateAdded`. PhotoTypes in use today: `Obverse, Reverse,
  Slab_Obverse, Slab_Reverse, Reference` (capitalized — the app's
  `GALLERY_TYPES` uses lowercase; a mapping to sort out whenever photo reads
  actually migrate, out of scope for this build).
- **`Receipts`** tab: `ReceiptID, CollectionID, Filename, DateAdded`. 71
  rows; ReceiptID repeats across coins by design (one multi-coin receipt =
  several rows sharing ReceiptID + Filename).
- `LastModified` exists — col **AW, the last column**. 0/542 populated
  today (blank on every existing row, as expected — it's stamped only when
  the app writes).

**Containers join — data is clean, join is safe to build:**
- Of 314 rows with a non-blank `Container`, **all 314 already agree** with
  the `Containers` tab's `StorageLocation` for that container — zero
  disagreements, zero orphan container names.
- Only 5 rows are "loose" (blank Container, non-blank flat StorageLocation:
  values `PCGS` and `Safe`) — these correctly fall through to the row's own
  flat value per the spec.
- 223 rows have both blank (no location info at all) — expected, no action.
- **Practical implication:** wiring the join will look like a no-op today
  (nothing currently displays differently), which is the *correct* outcome,
  not a sign the join isn't working — it only diverges from flat
  `StorageLocation` once a container is actually moved via the `Containers`
  tab in the future.

**24 real child rows exist on `All`** (`AY-00680-A` through `-E`,
`AY-00463-A/-B`, `AY-00464..469-A/-B/-C`, etc.) — CollectionIDs matching
`AY-#####-[A-Z]`. The app's current model treats children as nested-only
demo data (`FAKE_SET_CHILDREN`), never real `All` rows — but since they're
ordinary rows with normal values in every allow-listed column, the
Containers-join "same logic regardless of record type" requirement needs no
special-casing to handle them correctly.

## Discrepancies found — CLAUDE.md / spec vs. the real workbook

1. **`Notes` and `FunFact` do not exist as columns on `All`.** They exist
   only on `DB_Coins` (catalog-level, per coin *type*) and `Notes` on
   `Wishlist`. The closest real column on `All` is **`Remarks`** (61 of 542
   rows populated). This matters because Edit Coin today has editable
   **Notes** and **Fun Fact** textareas (`#browseEditNotes`,
   `#browseEditFunFact`) that currently write only to in-memory
   `FAKE_COIN_DETAILS` — they have no real column to land in as specified.
   See Q1.

2. **Zero formulas exist anywhere on the `All` sheet** — verified against
   the raw sheet XML directly, not just via openpyxl (only
   `PCGS_Duplicate_Queue` has any formula cells, unrelated to `All`).
   `SpotValue` (542/542 populated) and `Total` (534/542) are **static
   values**, not formulas. CLAUDE.md's 17Jul session log claims the
   SpotValue formula was "already built and deployed 7/13 on `All!Z`" — not
   true of this file. The allow-list's ban on writing both is still correct,
   but it has a real consequence: `Cost` and `Shipping` ARE writable, and
   nothing recomputes `Total` when they change. See Q3.

3. **The workbook's own standing rule conflicts with the spec's
   "timestamp" wording for LastModified.** ProjectPlan (~row 1658, session
   Aug 9) states: *"when writing a date into this workbook, always write it
   as a real date value, never as raw text — **and never include a
   time/timezone component**"* (this was a real bug fix — 44 ValueDate cells
   had literally held ISO/Zulu text strings). The task spec says stamp
   LastModified with "the current timestamp (a real date/time value)."
   `LastModified` is 100% empty and **has no number format applied at all**,
   so there's no existing convention on this specific column to defer to.
   See Q2.

4. **`SerNo` (Cert/Type Number) is missing from the allow-list** but is an
   editable field in today's Edit Coin form (`#browseEditCertTypeNumber`),
   and CLAUDE.md's "Editing existing coins (bounded)" section explicitly
   lists SerNo among what the app may write. See Q4.

5. **`Reviewed` (col AS) is 100% empty on every row** and is not in the
   allow-list, but CLAUDE.md carries a standing rule: "every app-made write
   (add or edit) sets a Reviewed column on All to blank/unchecked." See Q6.

6. Minor, no action needed for this task: `Seller_Link` holds seller
   *names* far more often than URLs (7 of 233 populated values are
   `http…`, despite the column name) — pre-existing data shape, not
   something to fix here. `Lookup_Locations` doesn't contain real values in
   use ("Bookcase Drawer", "Computer Room", "PCGS") — stale lookup table,
   but nothing in this build reads it.

## Relevant existing app.html patterns (for whoever picks this up)

- Existing gated write layer precedent: `ENABLE_SET_WRITE_LAYER = false`
  (`app.html` ~line 4145), `WRITE_TARGET = "copy"` (~line 4146) routing every
  path under `CoinCollection/_Testing/` via `WRITE_PATHS`/`writePaths()`.
  Dedicated `setWriteMsalInstance` (`Files.ReadWrite`, localhost-only
  redirect URI, separate from the read-only reference-image/live-nav MSAL
  instances so independently-flagged features don't couple) — `getWriteToken()`
  silent-then-redirect, never redirects when the instance is null. A
  `RealGraphClient` abstraction (`putContent`/`uploadFile`/`getJson`/
  `getFileBytes`/etc.) sits behind a swappable `graph()` accessor so a
  `MockGraphClient` can drive headless tests without touching OneDrive. This
  is almost certainly the pattern to extend/reuse for Browse Edit's own
  write, rather than building a fourth parallel mechanism — see Q9 on
  whether to literally share the same flag/target or use an independent one.
- Browse Edit form field IDs (current, for whoever wires the actual Save):
  `browseEditYear, browseEditMintMark, browseEditDenomination,
  browseEditDescription, browseEditVariety, browseEditGradeFrom/GradeOther,
  browseEditGradeSource, browseEditCertTypeNumber, browseEditCertLinkBtn,
  browseEditDesignation, browseEditValue, browseEditCost,
  browseEditShippingCost, browseEditVendor, browseEditPurchaseDate,
  browseEditStorageLocation, browseEditContainer, browseEditNotes,
  browseEditFunFact, browseEditSaveBtn`. Receipt capture UI exists
  (`browseEditReceiptAccordion` + camera/library inputs) feeding an inert
  `receiptFiles` registry — see Q10.
- Edit Set is a fully separate form/view (`browseEditSetView`,
  `browseEditSetSaveBtn`) with its own stub Save — confirmed NOT reachable
  via any code path this task would touch, per Q8.

## Open questions for Ray (unanswered as of this note)

**Q1 — Notes / Fun Fact have no column on `All`.** What should Save do with
them? Options: (a) map Edit Coin's Notes textarea to `All.Remarks`, make Fun
Fact read-only/removed from Edit Coin (it's a DB_Coins catalog fact about the
coin type, arguably never belonged in a per-specimen edit form); (b) leave
both session-only/in-memory as today, write neither; (c) add real
`Notes`/`FunFact` columns to `All` on the Copilot side first, then include
them. `Remarks` is in the allow-list today with no UI field pointing at it,
which suggests (a). Also: 18 rows currently carry an auto-appended "Physical
receipt in binder — not yet digitized." note in Remarks — if Notes maps to
Remarks, an edit could silently overwrite that unless handled (append vs.
overwrite).

**Q2 — LastModified: date-only or date+time?** The workbook's standing rule
says never write a time component into a date column; the task spec says
timestamp. Which wins for this column? If date+time, confirm the number
format to apply (column currently has none). If date-only, "last app touch"
loses within-day resolution — acceptable, just needs to be Ray's call.

**Q3 — `Total` goes stale the moment Cost or Shipping is edited**, since it's
a static value on the never-write list. Options: (a) leave it stale, flag
for a Copilot cleanup pass; (b) allow the write layer to also write
`Total = Cost + Shipping` as a documented, explicit exception to the
allow-list; (c) have Copilot convert `Total`/`SpotValue` into real formulas
first so they self-heal and the ban stays absolute with no exception needed.
Leaning (c) as the durable fix with (a) as a safe interim, but (b) is the
only option that keeps the number correct without a workbook change.

**Q4 — Should `SerNo` be added to the allow-list?** It's editable in the
form today and CLAUDE.md says the app may write it. If yes, does `CertLink`
stay read-only (it's a stored URL the form never exposes for editing)?

**Q5 — Editing `StorageLocation` on a coin that HAS a `Container`.** The
Containers tab exists specifically so location lives in one place. If the
read layer derives displayed location from Container, letting Edit Coin also
write the coin's own flat StorageLocation re-creates the exact drift the tab
was built to eliminate. Options: (a) disable/hide the StorageLocation input
whenever Container is non-blank, show the derived value read-only; (b) keep
it editable and write it anyway; (c) keep it editable but only actually write
it when Container is blank. Leaning (a) for model self-consistency, but it's
a visible UI change beyond a pure write layer, so flagging rather than
assuming.

**Q6 — Should the write layer explicitly clear `Reviewed`?** Not in the
allow-list; blank on every row today, so writing blank would be a no-op in
practice regardless. CLAUDE.md's standing rule says app writes should set it
unchecked — add it to the allow-list as a write-blank-only column, or treat
that rule as obsolete/drop it?

**Q7 — `Denomination` changes to/from `Multiple`.** Changing a row's
Denomination is in the allow-list, and Edit Coin's dropdown can set it to
`Medal`. Changing to/from `Multiple` would flip which Edit form the record
routes to (`isSetRow()` keys on exactly that) — `Multiple` isn't offered in
Edit Coin's own dropdown, so this specific transition can't be triggered from
that direction today, but confirming: is the identity-overwrite confirmation
(Denomination is already on that list) sufficient here, or does changing
Denomination need something extra?

**Q8 — Edit Set's identity fields (Year/Description).** Confirmed: Edit Set
is a fully separate form/Save (`showBrowseEditSetView()` /
`#browseEditSetSaveBtn`), not reachable via any shared code path this branch
would touch. Per the spec, this is a **documented follow-up for when Edit
Set gets its own write layer**, not implemented here. Confirm this reading,
or say if the shared identity-overwrite-confirmation helper should be built
now (generically) so Edit Set can just call it later when its own write
layer lands.

**Q9 — `WRITE_TARGET` for this build.** The existing Add Set write layer is
gated `ENABLE_SET_WRITE_LAYER = false` with `WRITE_TARGET = "copy"`
(everything under `CoinCollection/_Testing/`). Should Browse Edit's write
layer reuse that exact same flag + copy target for the first real-device
pass, or does it need its own independent flag (mirroring how
`ENABLE_REFERENCE_IMAGES` / `ENABLE_LIVE_NAV_DATA` / `ENABLE_SET_WRITE_LAYER`
are each deliberately separate, so independently-flagged features don't
couple)? Leaning toward reusing the existing gate + copy target for
simplicity, but note: the `_Testing` copy workbook needs to be a *current*
copy for schema to line up, since it predates the Photos/Receipts/
Containers/LastModified additions made this session.

**Q10 — Receipt capture inside Edit Coin.** The Receipt pill in Edit Coin
prepares a PDF into the `receiptFiles` registry today, but nothing consumes
it. Spec says Photos/Receipts reads stay on old flat columns and that
migration is out of scope for this build. Reading that as: Save writes
nothing for Receipt, the pill stays exactly as inert as it is today.
Confirming rather than assuming, since "Browse Edit's Save button" could
arguably be read to include it.

## Status / next steps

- Ray is currently resolving unspecified database errors this review
  surfaced (not itemized here — from a separate, still-in-progress
  conversation). **Re-verify the schema facts above against the corrected
  workbook before starting implementation** — don't treat this document's
  numbers (542 rows, "zero duplicates," "zero orphans," etc.) as still-valid
  facts without a fresh check, since the whole reason for the pause was
  errors being found.
- Ray will also answer Q1–Q10 above in a separate conversation.
- Next session should: (1) get the corrected/current workbook and re-run the
  same verification queries this document is based on, re-confirming nothing
  material changed; (2) get Ray's Q1–Q10 answers; (3) create the new feature
  branch; (4) implement per the original spec (reproduced in full near the
  top of this document) plus whatever Q1–Q10 answers modify; (5) hold on the
  branch for a real-device pass — do not auto-merge, per explicit
  instruction, unlike this project's usual small/isolated-change default.
