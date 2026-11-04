# Reference: WORKBOOK (moved out of CLAUDE.md in the (am) slimming, 4 Nov 2026)

Read this file when: touching workbook sheets or columns, ID schemes (CollectionID, CoinID, SetID, OriginSetID), header naming, or deciding whether a column exists.
Back to [CLAUDE.md](../../CLAUDE.md). Sections below are verbatim from CLAUDE.md as it was at commit `a7fcb20`; the original line numbers are in [docs/INDEX.md](../INDEX.md).

## ID schemes (locked in)
- CollectionID: `AY-#####` (5-digit). Child rows get `-A`/`-B`/etc., joined to
  their parent via the explicit `originSetId` field, never by parsing the
  parent ID string. **Superseded — the `-Set` suffix on parent rows is
  retired going forward** (resolved July 18 ProjectPlan item, "CollectionID
  Parent-Child Convention for Sets"): a new parent Set ID is always a plain
  `AY-#####`, whether or not it ever gets children, whether or not it's
  tracked coin-by-coin at all (see "Track coins individually" toggle under
  "Add Set + real write layer"). Confirmed nothing in the app depends on the
  `-Set` suffix being present — grepped the reservation module, the Add Set
  write layer, and every `FAKE_*` demo array; `reservationIdNumber()`/
  `collectionIdNumber()` already strip only the `AY-` prefix and ignore any
  suffix via `parseInt`, and child linkage was already `originSetId`-based,
  never suffix-parsed. Existing historical rows that already carry a
  `-Set` suffix are untouched by this — this only governs what the app
  itself generates going forward.
- CoinID: custom `C-YYYY-M-DDD-##`. Meant to be unique per DB_Coins row (one row
  per coin type/variant), but **this has only been audited for the ~326 DB_Coins
  rows tied to currently-owned coins, not all ~3,753 rows** — a real duplicate-
  CoinID row was already found and fixed once (2019-W Lincoln Cent Proof vs.
  Reverse Proof shared `C-2019-W-1C-01` until split). Don't assume CoinID
  uniqueness holds across the full DB_Coins table until the wider audit is done;
  don't build caching/indexing logic on that assumption without a way to detect
  a collision. (This is a different situation from `PCGS_Duplicate_Queue` below —
  that's an *expected, handled* collision on a different column, PCGS#.)
- SetID: custom `S-XXYY-TT-##`. **Distinct from `OriginSetID`** (the multi-coin
  Set-display join field, see "Multi-coin Set display") — SetID is Issue-3's
  "an individual coin *belongs to* a Set" chip linkage; OriginSetID is "these
  child coins are physically *inside* this Set bundle." Two different
  relationships, deliberately separate fields. **The parent/child `-Set`/`-A`
  suffix above is the human-readable provenance lineage, but the code join for
  child coins is the explicit `OriginSetID` field, not string-parsing the
  suffix.**
- SerNo (on All sheet): the PCGS/NGC **cert number alone** (not combined with the
  type/PCGS# — those are separate values; see PCGS Label Auto-Populate below for how
  a scanned label splits into its parts).

## Workbook naming conventions
- **Column headers have no spaces**, across DB_Coins, DB_Sets, All, and Albums —
  e.g. `MintMark`, `SerNo`, `CertLink`. Match this exactly when reading/writing via
  the Graph Excel API; a header with a space is stale.
- **Denomination values are short codes**, not full words: Cent → `1C`, Nickel →
  `5C`, Dime → `10C`, Quarter → `25C`, Half Dollar → `50C`, Dollar → `$1`. Any
  denomination dropdown/display in the app should use (or map to/from) these codes.

## Workbook sheets that matter
(Corrected 4 Nov 2026 in the (am) slimming: the row and column counts in this section (542 rows, A-AW, Photos 29 rows, Receipts 85) date from 10 Aug 2026; All is about 1,555 rows now. The flat photo / receipt column bullet is superseded by alignment Build 1. For current facts see the 4 Nov section below.)*
**Verified against the real workbook 2026-08-10** (during the Browse Edit
write-layer build). The counts and column facts in this section are as of
that date — the workbook is co-managed with Copilot between sessions, so
re-verify before relying on any of it for a write.
- **All** — owned coin records, backed by the table **`AllCoins`** (the table
  name matters: the Graph Excel API addresses it by name). **542 data rows,
  49 columns (A–AW)**, CollectionID unique across every row (zero
  duplicates — safe as a write key). **24 of those rows are real `-A`/`-B`
  child rows** living on All like any other row, not just the app's own
  nested `FAKE_SET_CHILDREN` demo model.
  - **`SpotValue` (Z) and `Total` (U) are LIVE FORMULAS** —
    `Total = Cost + Shipping`; SpotValue is a nested-VLOOKUP chain through
    DB_Coins → Lookup_MetalContent → Ref_SpotPrices. **Superseded:** this
    file previously said SpotValue was "not live yet — formula pending" and
    elsewhere that it had been deployed 7/13; neither described the actual
    state. **Both columns had been silently flattened to static values
    workbook-wide (all 1,084 cells), almost certainly by a Copilot "refresh
    formatting" pass** — a real data-loss failure, not a design gap: Total
    would have gone stale the instant Cost/Shipping changed and SpotValue
    would never have reflected updated spot prices again. Both were restored
    via targeted XML surgery, verified byte-for-byte against the original
    except those cells. **The naive restore-from-backup would have been
    WRONG** — DB_Coins and Lookup_MetalContent had gained columns since the
    backup, so the old formula pointed at the wrong DB_Coins column and
    omitted Copper/Nickel; the correct current formula was recovered from
    the `AllCoins` table's own `calculatedColumnFormula` metadata, which the
    flattening never touched. **Treat "a Copilot formatting pass can silently
    flatten formulas" as a known failure mode of this workbook**, and never
    let app code write a literal into a formula column.
  - **There is no `Notes` or `FunFact` column on All** — `Remarks` (AG) is
    the only free-text column. Notes/FunFact exist on DB_Coins (and Notes on
    Wishlist). Don't assume a per-specimen home for either.
  - `LastModified` (AW) exists, is blank on every row, and is stamped by the
    APP only — Copilot writes and manual Excel edits deliberately do not
    populate it. It is "last app touch," not an audit trail.
  - `Reviewed` (AS) exists and is blank on every row.
  - `Seller_Link` (V) holds seller NAMES far more often than URLs (7 of 233
    populated values are `http…`), despite the column name.
- **Photos** (new) — one row per photo, replacing the old fixed
  Obverse/Reverse/Photo3/Photo4/OGPPhoto columns on All: `PhotoID` (PH-#####),
  `CollectionID`, `PhotoType`, `SubGroupID`, `Filename`, `Label`, `DateAdded`.
  PhotoTypes in use: Obverse, Reverse, Slab_Obverse, Slab_Reverse, Reference
  (**capitalized** — the app's own `GALLERY_TYPES` uses lowercase, a mapping
  to resolve whenever photo reads migrate).
- **Receipts** (new) — `ReceiptID` (RC-#####), `CollectionID`, `Filename`,
  `DateAdded`. One row per (receipt × coin), so a multi-coin receipt is
  several rows sharing a ReceiptID and Filename. Cost/Shipping/PurchaseDate/
  Seller_Link deliberately stay on All as the single source of truth.
- **Containers** (new) — `ContainerName`, `StorageLocation`, `Notes`,
  `DateAdded`. One row per physical container, holding its current location,
  so moving a container is one edit here rather than an update to every coin
  row referencing it. `ContainerName` matches `All.Container` text exactly
  (the name IS the key — no separate ID). Currently 11 containers, and the
  data is clean: all 314 rows with a Container agree with it, zero orphans.
  The read-layer join that makes this actually cascade is BUILT — see
  "Browse Edit real write layer" below.
- *(Superseded by the receipts and photos alignment, Build 1: the app no longer reads these columns at all; the Photos / Receipts tabs are the only record, the columns are never written, and Copilot turns them into formulas and renames them after Build 1 is LIVE.)* **The All-sheet flat photo/receipt columns are still populated and still
  what the app reads** (Obverse, Obverse_Original, Reverse, Reverse_Original,
  Photo3, Photo4, Receipt, OGPPhoto). They're deliberately left in place
  until the app's photo/receipt reads move to the Photos/Receipts tabs, at
  which point they should be cleared to avoid two sources of truth. That
  migration is a known, still-unstarted piece of work — the Browse Edit
  write layer explicitly did NOT do it.
- **DB_Coins** — ~3,753 reference coin types. Add rows opportunistically when a gap
  is hit during other research — never proactively expand into an exhaustive catalog.
  Has Mintage (partially populated) and a **FunFact** column (confirmed present —
  this is the source Edit Coin's read-only Fun Fact display reads). Co-managed
  with Copilot outside app sessions (GSID population, PCGS# corrections, structural
  fixes have happened this way) — **treat any previously-pulled copy of DB_Coins as
  possibly stale**; re-pull before relying on it for anything beyond a quick mockup.
- **DB_Sets** — reference sets, including all albums (Type=AL).
- **Sets** (new, table `Sets_Status`) — `Status`, `Year`, `Variety`,
  `Description`, `Lineage`, `SetID`, `FilledBy`. Nothing in the app reads it
  yet (deliberately, per Ray). Worth revisiting as a possibly better
  ownership signal for the Sets completeness checklist than the sparse
  `All.SetID` linkage — a separate scoping decision, not assumed.
- **Albums** (formerly AlbumSlots) — restructured; actual live columns are
  `Status`, `Year`, `MintMark`, `Description`, `AlbumName`, `AlbumID`, `CoinID`,
  `FilledBy` (plain CollectionID, blank = open hole/want-list). There is no
  SlotLabel/SlotCriteria/SlotYear/SlotMint — Year/MintMark are used directly, and
  **CoinID is what actually disambiguates two slots that share the same
  Year+MintMark** (e.g. a plain date vs. its VDB-type variety) — don't assume
  Year+MintMark alone is a unique key for a slot.
- **Wishlist** (new) — freestanding want-list items not tied to any album:
  Description, Notes, Target Price, Date Added.
- **DB_Rolls** (new) — separate table, not part of the main coin data. Not needed
  for the app shell yet. Don't confuse this with **RollID**, a distinct All-sheet
  column on owned rows that the Rolls tab is actually built against — see
  "Browse: navigation restructure" below.
- **ProjectPlan** and **ParkingLot** — the authoritative source of decisions and open
  items, date-stamped with row/column references. ParkingLot Status is now three
  states: Open / In progress / Resolved (+ Resolved Date). Default review filter
  shows Open + In progress only.

## Workbook facts from the coordinator's check (4 Nov 2026; corrections to the 3 Nov review's Part 5)
(Corrected 4 Nov 2026 in the (am) slimming: the recheck of ItemNumber / MfgProductID (DB_Sets), Type (Lookup_Graders) and TotalWeight (Lookup_MetalContent) is closed: the coordinator confirmed on 4 Nov 2026 that all four columns exist.)*
- **Formulas on All:** Total, SpotValue and GradeNum are table calculatedColumns; Receipt, Obverse, Reverse, Holder_Front, Holder_Back, References, COA_Photos, OGP_Photos, Other_Photos are formulas too (not calculatedColumns), and so is Albums.Status. Formula detection (backlog (al), 5.C) cannot rely on `calculatedColumnFormula` alone: read the range's `formulas`.
- **Columns the app reads that do NOT exist:** Photos has no OriginalFilename (the app reads AND writes it: `buildPhotoIndex`, `writePhotoRow`'s `replaceFileCells`, via the header map, so the write is silently skipped: an `_original` file is recorded nowhere; the F6 case). Wishlist headers are TargetPrice and DateAdded (no spaces). The review placed ItemNumber / MfgProductID / Type / TotalWeight on the wrong sheets: the app reads ItemNumber, ProductOption, MfgProductID, ContainerName from **DB_Sets**, Type from **Lookup_Graders**, TotalWeight from **Lookup_MetalContent**; to recheck on those sheets. DB_Coins has no Category; DB_Sets has no Type, Name or SetName (the app reads `Description` first, then Name, SetName). DB_Coins Year / Denomination / Variety ARE read (`mapWorkbookRowToDbCoin`), and `buildLiveAlbums` reads Variety.
- Ref_SpotPrices has instruction text in rows 9-11: harmless only while it is read as the table (the update reads the used range; recheck when that code is next touched).
