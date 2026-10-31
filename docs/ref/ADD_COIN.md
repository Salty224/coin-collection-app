# Reference: ADD_COIN (moved out of CLAUDE.md)

Read this file when: touching the Add Coin or Edit Coin forms, the Identification section (Grader, PCGS label, Mint Item Number, GSID), denomination or Finish dropdowns, CACBean, Value fields, or Staging-draft editing.
Rules that stayed in CLAUDE.md (not in this file): "Add Coin write layer — Phase 1" and "Browse Edit real write layer" (their continuations are in docs/HISTORY.md), and "Add Coin Phase 2 + live-device retest batch".
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

## Add Coin Error dropdown: real Lookup_Errors list (Oct 2026, merged to main, built on `claude/add-coin-error-dropdown-real-values`, tip `98edd7f`)
Merged to `main`. Suite: `tests/verify_addcoin_error_list.js` (24).
- **Bug fixed:** the 8 `FAKE_LOOKUP_ERRORS` values were put into Add Coin's
  Error dropdown at page load in every session, live included, and a pick
  could reach `All.Error` on promotion.
- **Now:** `Lookup_Errors` is a 5th optional live-nav sheet
  (`LIVE_NAV_OPTIONAL_SHEETS`, same load/retry path as Albums; a failure
  never blocks startup). `buildLookupErrorList()` reads by the **"Error Type"**
  header, skips a row whose Category is blank or whose name starts with "═"
  (the sheet's section dividers), trims, drops blanks and duplicates; no
  header -> `null` (treated as a failed load). If the sheet has NO Category
  column at all, only the "═" check applies (Ray's call; otherwise every row
  would be skipped). `LIVE_LOOKUP_ERRORS`,
  `liveLookupErrorsLoadFailed`, `activeLookupErrors()` (real list; the 8 demo
  values only when `demoDataAllowed()`; else empty), `populateErrorOptions()`
  (called at start and when the sheet arrives).
- **What the user sees live:** the real list once loaded; until then only
  "— none —" and "Other" (free text); after a failed load, a small "Error
  list not loaded" note (`#errorListNote`, toggled by inline display, not a
  `.hidden` class). Offline mockup keeps the 8.
- **Left alone on purpose:** `#errorDesc` (the saved value) is never changed
  by a refill; a current pick the new list lacks moves to "Other" with its
  text kept. A saved Error not in the list still restores as "Other". No
  change to what gets written. Real value count expected ~36, not 42; nothing
  asserts a count against the real sheet.
- Same branch: `FAKE_GRADING_HELP` removed (it could never match — see the
  Grading Help section), and the series-key case note corrected.
- One existing assertion changed: `verify_startup_connection` J6 counts one
  startup's requests, 10 -> 11 (one more sheet).
- **Not verified:** the real sheet's headers/rows (built from Ray's 16 Aug
  description: "Error Type", Category, 5 "═══" dividers), any real device,
  real OneDrive, Samsung Internet.


### Add Coin field layout (locked in)
Top level is only what's needed to identify the coin and describe the specific
slab — everything else is one level down. Partial purchase data (e.g. a price with
no seller/shipping context) isn't useful on its own, so those fields stay bundled
together rather than mixed in at the top level.
- **Top level**: Obverse/Reverse photos (optional to fill, but the slots are always
  shown), Denomination (coded dropdown — see naming conventions), Year, Mint Mark,
  Description, Variety, Grade, GradeSource, Cert/Type Number (SerNo), Designation,
  Error, Notes.
- **Error** (new field) is distinct from Variety and Designation — it's for mint
  errors (off-center strike, broadstrike, wrong planchet, etc.), not cataloged
  varieties or grading-service qualifiers. Optional, usually blank.
- **Description vs. Variety are separate fields, matching the existing Excel
  columns** (not a schema change): Description is the series/design name (e.g.
  "Mercury (Winged Liberty)"); Variety is the true distinguishing feature (e.g.
  "Type 2", "Micro S", "Large Date"). Don't conflate them back into one field.
- **Error and Variety are both dropdown + manual-override, but NOT the same
  pattern (locked in) — don't build one generic component for both.** Error's
  dropdown (`Lookup_Errors`) is **unfiltered** — an error can apply to any
  coin regardless of type/series, so the list never narrows based on what's
  being entered, and an unusual/manually-typed Error never affects whether
  the coin qualifies for a direct database write (see "Direct-write vs.
  Staging" below) — it's incidental to the specimen, not identity-defining.
  Variety's dropdown is **context-sensitive** — filtered live to only the
  varieties that actually exist in DB_Coins for the exact Year+MintMark+
  Denomination already entered (`validVarietiesForCurrentCoin()`, refreshed
  on every Denom/Year/Mint change via `refreshVarietyOptions()`) — a 1909
  cent entry offers VDB, a 1920 quarter doesn't. Variety IS
  identity-defining: an unrecognized/manually-typed value here (checked by
  `isVarietyRecognized()` — the *resulting* value against the current
  filtered list, not whether it was clicked vs. typed, so manually typing
  text that happens to exactly match a valid option still counts as
  recognized) routes the coin to Staging instead of a direct write. Both
  fields keep a hidden input (`#variety`, `#errorDesc`) as the actual
  source-of-truth value — every existing function that reads/writes them by
  ID (DB_Coins match, flip-label corners, Album/Wishlist prepopulation, PCGS
  label decode, the save payload) is unaffected by the dropdown UI sitting on
  top; only the two rebuilt call sites (`applyDbCoinsRowToForm`,
  `applyAlbumContext`/`applyWishlistContext`) also call
  `refreshVarietyOptions()` after setting the hidden value, so the visible
  select/override reflects it correctly.
- **GradeSource** is a dropdown sourced from `Lookup_Graders` (`PCGS`, `NGC`,
  `ANACS`, `ICG`, `CAC` — whatever's in that table) plus three fixed
  non-certified options: `Seller` (taking the seller's word for it), `Owner`
  (own best estimate), `AI-est` (AI-assisted estimate). No separate
  "raw/ungraded" value — leave Grade blank for that. **Superseded decision:**
  GradeSource used to be a separately-hardcoded shorter list (PCGS/NGC only,
  explicitly "a different list" from the certification-service options) — that
  split was removed so picking a Grader (see PCGS Label Auto-Populate below)
  can set GradeSource directly without the two lists disagreeing on what's
  valid.
- **Secondary, collapsed by default — Purchase Info**: Purchase Price, Shipping
  Cost, Purchase Date, Vendor/Seller, Receipt photo.
- **Secondary, collapsed by default — Storage & Album**: Storage Location,
  Container, Assign to Album (which album + which open slot), Additional photo.
- **Interaction pattern for the two secondary sections is drill-down, not an
  inline accordion**: tapping "Purchase Info" or "Storage & Album" replaces the
  top-level fields with just that section's fields (a back link returns to the
  top level). Once filled in and closed, the row shows a one-line summary of
  what was entered (e.g. "$45.00 · eBay seller") instead of the raw fields, so
  the top level stays short.
  **SUPERSEDED — Ray explicitly overturned this.** Both sections are inline
  accordions now, like every other section on the form; the drill-down cards
  and their one-line summary rows are gone, along with
  `showAddCoinSubview()` and `updateFormRowSummaries()`. See "Add Coin:
  accordion restructure" below. Add Set still uses the drill-down pattern —
  it was deliberately NOT converted alongside Add Coin.
- **Coin photo previews (Obverse/Reverse/Additional — not Receipt) render
  circular**, matching the Spotlight/Browse coin discs so they read as a coin
  rather than a square photo.
- **EXIF orientation is applied explicitly, everywhere a captured photo gets
  decoded (locked in)** — a phone camera photo's pixel data is often stored
  sensor-native with an EXIF Orientation tag telling viewers how to rotate it;
  a plain `<img>` generally honors that by default, but canvas `drawImage()`
  never does regardless of browser, and this app's default handling had
  already proven inconsistent in practice (Receipt photos rotating sideways
  on save/display). `loadOrientedImageCanvas(file)` decodes any captured File
  via `createImageBitmap(file, {imageOrientation: "from-image"})` and bakes
  the correction into a same-orientation canvas immediately — used for both
  the plain Receipt preview and as the very first step before the crop
  adjuster ever sees a photo (so the adjuster's live preview and its final
  canvas bake both work from already-correct pixels, with no dependency on
  `drawImage()` ever honoring EXIF on its own).
- **Manual pan/zoom/rotate crop adjuster (locked in)**: picking/taking a photo for
  a circular slot opens an adjuster — drag to reposition, slider to zoom
  (100–300%), bounded so the photo can't be panned past its own edges. Two 90°
  quick-rotate buttons handle a sideways/upside-down capture; a separate
  "Straighten" slider (±45°) handles a fine tilt correction on top of that. "Use
  Photo" bakes the result (pan + zoom + rotation) into an actual cropped image
  (canvas, fixed output resolution) rather than keeping a live CSS crop, so it
  displays correctly regardless of frame size (Obverse/Reverse resize with
  Denomination). A small "adjust crop" icon button next to Camera/Library reopens
  the adjuster on the same original photo afterward — not a one-shot,
  first-pick-only thing. Reopening always resets to the original framing
  (doesn't resume the last adjustment, including rotation). This is still manual,
  user-driven placement, not smart edge detection — real auto-detection/AI
  cropping is out of scope (see "What NOT to build").
- **The baked crop is display-only right now — nothing is written back to
  OneDrive.** The "Use Photo" canvas bake produces a real cropped image, but it
  only ever becomes a browser-local Blob URL, live in that one page load; it
  isn't saved to localStorage (deliberately — see "What NOT to build") or
  uploaded anywhere. Reload the page, or open the same coin on another device,
  and the crop is gone — this is true whether the adjustment happens during Add
  Coin or later via Browse Edit's "reopen adjuster." This isn't a gap specific
  to the crop tool — it's the same underlying gap as every other Save button in
  the app (Wishlist and Batch Receipt still just toast "nothing saved yet";
  **superseded for Browse Edit and Add Coin**, which now have real write
  layers — though Add Coin's Phase 1 stores captured photos in its Staging
  draft rather than applying this crop-commit naming, which is Phase 2's
  job). Once that write layer gets built, the crop-commit/original-
  preservation/display-fallback behavior is fully spec'd — see the crop
  commit / display rule under "OneDrive folder structure" above — not an open
  question anymore.
- **Splitting a combined image into two files uses the existing single-photo
  crop tool, unchanged — no dedicated splitter tool.** Run it twice against the
  same `_combined.jpg` source (once for the obverse region, once for reverse);
  see "OneDrive folder structure" above for the resulting filenames and the
  Obverse/Reverse update that follows.
- *(Superseded 23 Oct 2026: Add Coin's preview card, toggle and live corner
  labels were removed in commit 6 `c6f0ba0`; Add Coin uses Edit Coin's photo
  section. The bullets below about Add Coin's preview are history.)*
- **Obverse/Reverse show one at a time via a small toggle**, not stacked and
  not side by side — a dot on each toggle button lights up once that side has
  a photo. This keeps the bigger circle/bigger corner-label text (legible
  without glasses) without the page getting long from showing both full-size
  cards at once. Camera/Library controls are small quiet icon-only circles
  below the photo, not full-width labeled buttons — the coin is the focal
  point, the controls aren't.
- **Coin discs/photos scale by denomination** — proportional to real coin
  diameters (a dime is genuinely smaller than a cent, which is smaller than a
  nickel/quarter/half/dollar), floored at 70% of max size so nothing goes
  illegibly tiny on a phone. Applies everywhere a coin renders at a readable
  size: Browse grid, Spotlight, Browse detail, and Add Coin's obverse/reverse
  frames (which resize live as Denomination changes).
- **Mint Mark is a dropdown** (blank/Philadelphia, D, S, CC, O, W), not free
  text.
- **Year has an optional decade-drill-down picker** alongside the plain text
  field — tap a decade (1790s-2020s), then a year within it, so picking a
  year is never one giant scrolling list. Typing the year directly still
  works exactly as before; the picker is additive.


### Grade picker (locked in)
Grade is a dropdown built from Lookup_Grades (Circulated / Mint State / Proof &
Specimen / Details & Problem Grades groups), not free text. Two extra modes on top
of a plain single pick:
- **Range/combine**: a checkbox reveals a second "to" grade dropdown (standard
  grades only, no Details/Problem/Other); picking two combines them into one
  value, e.g. Good (`G-4`) + Very Good (`VG-8`) → `G-4-VG-8`.
- **Other**: reveals free text for edge cases the standard list doesn't cover.
- **Standard: all numeric coin grades use a hyphen between the letter prefix and
  the number** (`MS-63`, not `MS63` or `MS 63`; `VF-20`, not `VF20`) — this
  applies to the Grade field everywhere in the app and to the PCGS Label
  Auto-Populate parser below. Designation (FB, RD/RB/BN, CAM/DCAM) is a separate
  field and is never appended to the Grade string.


### Description auto-fill (locked in)
Once Year + Denomination are both entered, Description auto-fills from
Ref_Denominations (year range → series name per denomination), e.g. 1920 + Dime
→ "Mercury (Winged Liberty)". Stays editable — once the user types into
Description directly, later Year/Denomination edits stop overwriting it (won't
clobber a manual correction for transition years/edge cases).


### DB_Coins soft match (locked in)
Once Year + Denomination are filled in (Mint Mark and Variety are used in the
match key as-is, including blank — most DB_Coins rows have no notable variety),
soft-check against DB_Coins:
- **Match** → auto-pull and show CoinID, PCGS#, Mintage.
- **No match** → do NOT hard-block. Show a clear, non-blocking warning ("No
  matching DB_Coins entry — coin will still be added, but needs a catalog entry
  added later") and let the coin proceed to get its **CollectionID** immediately.
  DB_Coins isn't meant to be exhaustive, so blocking would sometimes be wrong,
  not just annoying.
- **CoinID vs. CollectionID are different IDs and follow different rules.**
  CollectionID (ownership tracking, `AY-#####`) is still assigned only at
  successful Excel write, per the core workflow above — a DB_Coins miss doesn't
  change that. CoinID (the DB_Coins reference key) is what's allowed to stay
  blank/pending on a miss.


### Grader dropdown + grader-agnostic cert linking (locked in)
A **Grader** dropdown (Add Coin, above the label-entry field; sourced from
`Lookup_Graders` — `PCGS`/`NGC`/`ANACS`/`ICG`/`CAC`) sits above the PCGS Label
field and drives three things when picked:
1. Sets **GradeSource** to match (see GradeSource note above — same list now).
   **Once Grader is set, the separate GradeSource dropdown further down the
   form hides** — it would just be asking the same question a second time.
   It only reappears if Grader is cleared back to blank (the manual/non-slab
   path: Seller, Owner, AI-est, or a grader picked without going through the
   label-entry flow at all).
2. Decides whether the label-entry field shows at all: only `PCGS` has a
   confirmed auto-decode format, so picking `PCGS` reveals the "PCGS Label #"
   field; picking any other grader hides it and shows a plain note instead
   ("no auto-decode for this grader yet — enter manually below"), per the
   ANACS/ICG/CAC research note further down.
3. Cert lookup is resolved via `Lookup_Graders[GradeSource].Cert Lookup Base
   URL` — **grader-agnostic**, not hardcoded per service. Adding a new
   confirmed grader to `Lookup_Graders` (a base URL) is the only change needed
   to light up its lookup link; no code change per grading service. The link
   only activates if that GradeSource actually has a base URL on file (today:
   PCGS and NGC do, ANACS/ICG/CAC don't — see the research note). **Only the
   CERT portion of a decoded label is ever valid input to this resolver** —
   SPEC and GRADE must never reach a lookup URL; the resolver defensively
   strips anything before a stray `/` as a second line of defense on top of
   the parser already isolating CERT correctly.
4. **Cert/Type Number sits right below the Grader picker** (moved out from
   its old spot further down the form, past Denomination/Year/Grade) — so
   "who graded this" and "what's the cert number" read as one cohesive step,
   whether the number arrives via PCGS label decode or manual entry for a
   grader with no auto-decode. No behavior changed, just position — same
   field ID, same fill logic.
5. **Cert/Type Number is hidden whenever Grader is blank OR `PCGS`** — a
   non-slabbed coin has no cert number to report at all (mirrors
   GradeSource's own toggle), and for PCGS specifically the number is what's
   about to be decoded out of the PCGS Label # field directly above, so
   showing an empty manual box right next to it would just ask for the same
   number twice. `resolvePcgsLabelMatch()` still sets `#certTypeNumber`'s
   value programmatically once decoded, even while its row stays hidden — the
   field remains the real source of truth for `SerNo` on save, it's just not
   presented for redundant manual entry. **Superseded:** an earlier version
   of this toggle showed the row for any non-blank Grader, including PCGS;
   corrected once it was clear PCGS coins never need it filled by hand. Only
   a grader with no confirmed auto-decode (NGC, ANACS, ICG, CAC) still shows
   the manual box. Both toggles (plus the PCGS-label-block/no-decode-note
   pair) are driven by one shared `applyGraderDependentVisibility(grader)`
   function, called both from the Grader dropdown's `change` handler and
   explicitly from the PCGS label-decode path (`resolvePcgsLabelMatch`) — the
   decode path sets `addCoinGrader.value` programmatically, which never fires
   a native `change` event on its own, so it has to trigger the same
   visibility logic itself rather than relying on the dropdown's listener.

**Add Coin does not show a cert-lookup link at all** — it only captures and
stores the CERT number (Cert/Type Number is a plain input, no link). The
lookup link belongs solely to *viewing* a saved coin afterward — Browse
detail's read-only badge (Grade + GradeSource + cert number folds into one
pill; the whole badge is a link when a URL resolves) and Browse Edit's compact
cert-badge input (small link-icon button beside it, same resolver). **A filled
Album slot now opens that same Browse detail view** (see "Albums" below), so
grade/cert info is reachable from Albums too, just not rendered inline on the
slot itself.


### PCGS Label Auto-Populate (locked in)
A "PCGS Label #" field (Add Coin, shown only when Grader = `PCGS`, above
Denomination) accepts a scanned/typed PCGS label number in the format
`SPEC.GRADE/CERT` (e.g. `4905.65/12345678`):
- **SPEC** (before the decimal) matches `DB_Coins.PCGS#`.
- **GRADE** (2 digits after the decimal) is the numeric Sheldon grade, 1–70.
- **CERT** (after the slash) is the cert number → becomes `SerNo`, and also
  fills the Cert/Type Number field directly (not left blank for manual re-entry).

Resolution against `DB_Coins.PCGS#`:
- **Zero matches** → leave fields blank, show a non-blocking "PCGS# not found in
  DB_Coins" warning (add manually / research later).
- **Exactly one match** → auto-fill Year, MintMark, Denomination, Description,
  Variety, CoinID, GSID (if populated) onto the All-sheet entry from that row.
- **Multiple matches** (a known `PCGS_Duplicate_Queue` collision) → do NOT
  auto-fill. Show all matching DB_Coins rows (Year/MintMark/Variety/Finish/
  Description) and require the user to tap one before anything is filled. This is
  expected, ordinary behavior for entries still in `PCGS_Duplicate_Queue`, not an
  error state — the app doesn't require that queue to be clean first.

Once a row is resolved: numeric GRADE + that row's `DB_Coins.Finish` convert to the
adjectival Grade via the standard ANA/Sheldon table (`PO-1, FR-2, AG-3, G-4, G-6,
VG-8, VG-10, F-12, F-15, VF-20, VF-25, VF-30, VF-35, XF-40, XF-45, AU-50, AU-53,
AU-55, AU-58`, then 60–70 prefixed by Finish: `Business Strike`→`MS-`,
`Proof`/`Reverse Proof`→`PR-`, `SMS`/`Specimen`→`SP-`). Per the Grade picker's
hyphen standard above, the prefix and number are always joined with a hyphen
(`MS-65`, not `MS65`). GradeSource is set to `PCGS` automatically (it's a
certified grade, not an estimate). SerNo is set to CERT — Add Coin stops there;
it does not build or show a cert-lookup link (see the Grader dropdown section
above). Once the coin is saved, Browse detail/Edit generate that link on demand
via the same grader-agnostic `Lookup_Graders` resolver (`https://www.pcgs.com/
cert/{CERT}` today, since that's PCGS's base URL on file) — same hotlink-only
approach as the rest of PCGS integration (see External data sources below),
not an API call. Everything else (CollectionID, Cost, PurchaseDate, Vendor,
StorageLocation, etc.) stays manual — this only fills what the label itself
certifies.


### ANACS/ICG/CAC label format (deferred, not started)
PCGS's label format (`SPEC.GRADE/CERT`) is confirmed and spec'd for auto-decode
above. NGC is confirmed to have **no equivalent decodable identity number** —
its cert number is an invoice/sequence ID only, with grade as separate printed
text — so NGC gets normal manual entry (Grade and Cert Number typed as separate
fields), same as any non-decoding grader; this is closed, not worth
re-researching. ANACS, ICG, and CAC/CACG label structures remain **unconfirmed**.
The collection currently has 0 coins graded by any of these three, so there's no
active functional gap — per the standing DB_Coins scope rule (don't research
ahead of need), this waits until a coin graded by one of them is actually
acquired. The cert-lookup link still works for any of these once
`Lookup_Graders` gets a confirmed base URL for it, independent of whether
auto-decode is ever built.


### Grading Help button (framework only, locked in)
A ❓ icon button sits next to the Grade label in both Add Coin and Browse Edit
(`#gradeHelpBtn`, `#browseEditGradeHelpBtn`) and opens a shared modal
(`#gradingHelpOverlay`, reusing the photo-adjuster's overlay/panel chrome since
it's the same "centered case-styled panel over a dimmed backdrop" shape). This
spec item is **framework/location only** — it establishes the button placement
and the per-series lookup/modal mechanism, not the underlying researched
grading content. Series is identified the same way as the reference-image
fallback above (`referenceSeriesKey()` — Add Coin reads it live off the
Description field; Browse Edit reads it off the coin being edited), so both
features share one series-identification mechanism rather than inventing a
second one. `FAKE_GRADING_HELP` *(removed Oct 2026)* was a sparse stand-in
keyed `Lincoln_Wheat` / `Morgan`; because `sanitizeSeriesName()` lowercases,
those keys could never match, so it never showed anywhere. Every series now
shows the plain "no grading guidance on file yet" message plus the links. **Hard copyright constraint**: this must never reproduce ANA's
grading-guide text or PCGS's Photograde images — the modal only ever
summarizes-and-links to their own public reference pages (PCGS PhotoGrade,
NGC Grading Standards), the same hotlink-only posture as the rest of PCGS
integration under "External data sources" below. Actually researching and
writing real per-series grading guidance is a separate, deferred task — same
boundary as DB_Coins scope and ANACS/ICG/CAC label research above.


### Add Coin Phase 1: gold/bullion denomination codes (BUILT and merged to main)
**Superseded once already, same session — the version below is the
corrected, final design.** The first pass built a dedicated denom-code
family (`G$1`, `G$2.5`, `AGE-1OZ`, `APE-1OZ`, etc.) reasoning purely from
face-value collision risk. Ray corrected this on review: the real workbook
already has 49 Silver Eagle rows plus Morgan/Peace Dollar rows that solve
this exact problem by keeping Denomination PLAIN (the real legal-tender
face value, e.g. `$1`) and using a separate **Category** column as the
distinguishing type (`Silver Eagle`). Inventing a new denomination-code
vocabulary was solving an already-solved problem, and solving it in a way
that didn't match how the collection is actually catalogued. Everything
below is the corrected design; the `G$`/`AGE-`/`APE-` code family is gone
from the app entirely, not just superseded in prose.

**No new Denomination codes at all.** `DENOM_CODE_INFO` (the everyday
dropdown) is back to exactly its pre-gold-tier 12 entries. The gold/bullion
tier is a completely separate structure, `BULLION_TIER_OPTIONS`, of
`{label, denom, category}` triples — `denom` is always a real, plain
face value (`$1`, `$2.5`, `$3`, `$5`, `$10`, `$20`, `$25`, `$50`, `$100`),
never a fabricated code.

- **Several entries deliberately SHARE the same `denom`** — exactly
  matching the real workbook's own pattern, not a bug to fix: Gold Dollar,
  American Silver Eagle, and the classic circulating Dollar are all `$1`;
  Gold Eagle 1 oz, Platinum Eagle 1/2 oz, and American Buffalo are all
  `$50`. **Category is what actually disambiguates them** — Category
  `"Silver Eagle"` vs. blank (an ordinary Dollar) vs. `"Gold Dollar"`, all
  under the identical `$1` Denomination.
- **Gold/Platinum Eagle sizes are real, distinct face values, not a
  size-coded vocabulary**: Gold Eagle 1 oz/1-2 oz/1-4 oz/1-10 oz are
  genuinely `$50`/`$25`/`$10`/`$5`; Platinum Eagle's four sizes are
  `$100`/`$50`/`$25`/`$10`. All four Gold Eagle rows share ONE Category
  (`"Gold Eagle"`) — Denomination alone (the real face value) is what
  tells the sizes apart, exactly like the real workbook would. The
  dropdown LABEL spells out the size for the user ("American Gold Eagle —
  1 oz ($50)"); nothing downstream needs a size baked into a code.
- Classic pre-1933 gold (Gold Dollar, Quarter Eagle, Three Dollar, Half
  Eagle, Eagle, Double Eagle), the two commemorative-gold buckets, First
  Spouse $10, American Buffalo, and American Palladium Eagle each get one
  `BULLION_TIER_OPTIONS` entry with their own real plain face value.
  Classic Commemorative Gold's real span across two face values ($2.50 and
  $50, Panama-Pacific era) is handled as two entries under one Category
  name rather than picking one arbitrarily; its one genuinely mixed source
  row (`"Various $1 and $2.50"`) is folded into the $2.50 entry as a
  reasonable simplification, not treated as a third split.
- `Special` (8 rows) stays excluded, unchanged — still a genuine catch-all
  across several already-mapped denominations, nothing coherent to derive
  a single type from.

**Bullion toggle still exists, same UX goal, corrected mechanism.**
`#addCoinBullionToggle` still filters the Denomination dropdown between
"classic" (`DENOM_CODE_INFO`, everyday circulating denominations only) and
"bullion" (`BULLION_TIER_OPTIONS`, which now includes the classic gold
tier too, not just the modern bullion programs — grouped together under
one toggle since neither is an everyday circulating denomination).
- **Picking a bullion-tier option sets Denomination AND Category in one
  action** — the user never fills out two fields. Each `<option>`'s
  `value` is still the plain `denom` (so `#denomination`'s own value is
  always a real face value, exactly like the classic case); the option's
  `category` rides along in a `dataset.category` attribute. The
  denomination `change` handler reads it into a new module-level
  `addCoinBullionCategory` (blank for every everyday pick, matching how a
  regular coin has no Category on the real workbook either), which
  `readAddCoinFormForDraft()`/`buildCoinDraft()` now carry through onto the
  Staging draft as a real `category` field.
- **Description auto-fill is suppressed for a bullion-tier pick, and set
  directly from the option's own label instead.** This is a real,
  necessary consequence of the shared-`denom` design: `maybeAutoFillDescription()`
  is keyed only by denom+year (via `lookupDescriptionCandidates()`/
  `FAKE_DENOMINATIONS`), with no awareness of Category — so running it
  unchanged for, say, a `$50` Gold Eagle pick would show mixed, wrong
  candidates drawn from every OTHER `$50` bullion/gold type active in
  overlapping years (Platinum Eagle 1/2 oz, American Buffalo, and a
  Panama-Pacific $50 commemorative all also use `$50`). Since a
  bullion-tier pick already fully identifies the coin (denom + category
  together), Description is simply set to the option's label
  (stripping the trailing "($50)"-style face-value parenthetical, since
  Description is a name, not a value) — this is exactly why
  `BULLION_TIER_OPTIONS` rows are deliberately NOT added to
  `FAKE_DENOMINATIONS` at all, unlike the everyday denominations.
- Toggling Bullion off (or resetting the form) clears
  `addCoinBullionCategory` back to blank, so a stale bullion Category can
  never survive onto an unrelated everyday pick.

**`Category` is a real, deliberate new capture on the Add Coin draft —
flagged explicitly, not folded in silently, per Ray's own instruction.**
`category` is added to `readAddCoinFormForDraft()`'s shape and
`buildCoinDraft()`'s stored fields, matching the real workbook's own
Category column. **`ALL_WRITABLE_COLUMNS` (the write-guard list Browse
Edit's live-workbook PATCH is built from) is confirmed via source to have
no `Category` entry today, and this task deliberately does NOT add one.**
Add Coin Phase 1 only ever writes a Staging JSON draft (no
`ALL_WRITABLE_COLUMNS` involvement at all), so nothing requires the change
yet — same standing precedent as Finish, which was captured on the Add
Coin draft well before it was added to the allow-list. **Phase 2's real
direct-write path will need `Category` added to `ALL_WRITABLE_COLUMNS`
before a picked Category can actually persist to the real All sheet** —
that is real future work, not implied or started by this change.

**Scope gap flagged above — now CLOSED, same session, follow-up build.**
The gap this section originally left open ("`dbCoinsCandidatesFor()` has NO
Category awareness... worth Ray's explicit call before building") was
raised back to Ray immediately and he confirmed it should be fixed now
rather than deferred — real data made it concrete, not theoretical:
DB_Coins carries 487 rows for American Silver/Gold/Platinum Eagle coins
alone, and 49 real Silver Eagles are already in the collection. See "Add
Coin Phase 1: Category narrows the DB_Coins matcher" below for the fix.

**Verified headless — `tests/verify_batch3.js` rewritten for the corrected
design (42 assertions in that suite now, 190 across all 3 suites, zero
failures)**: the everyday dropdown has exactly its original 12 options (no
new code vocabulary leaked in); the Bullion view includes all four
Platinum Eagle sizes, Buffalo, and Palladium Eagle, with no everyday code
among its values; toggling resets the current selection; picking "Half
Eagle" sets Denomination to the plain `$5` and Category to `"Half Eagle"`
with Description set from the label directly (not the denom+year lookup);
picking "American Silver Eagle" writes the SAME `$1` Denomination the
classic Dollar uses, distinguished only by Category; all four Gold Eagle
sizes are four genuinely distinct face values sharing one Category; and
toggling back to classic clears the picked Category. Screenshots reviewed
at both viewports for the corrected toggle label/note and a real
Silver-Eagle pick — no overflow, no layout collision.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every prior round in this feature.


### Add Coin: accordion restructure (BUILT and merged to main)
Add Coin was one long flat form; Edit Coin / Browse detail are accordion
stacks. Since most of what Add Coin captures is exactly what Edit Coin
later edits, the two now read as the same screen. Resolves ParkingLot
Row 5.

**Section order** — `Grading & Certification`, then the RECORD_SECTIONS
order minus Specifications: `Overview`, `Photos`, `Notes & Facts`,
`Purchase Details`, `Storage`. Overview defaults open, everything else
collapsed, matching Edit Coin exactly.

- **Specifications is omitted ENTIRELY — not even read-only** (Ray's call).
  Composition/weight/diameter belong in DB_Coins, populated by Copilot
  research or offline work straight into the database; Add Coin should
  neither capture nor display them. This deliberately diverges from Edit
  Coin's own section list, which does show them read-only.
- **`Grading & Certification` is an extra section with no Edit Coin
  equivalent, positioned FIRST** — ahead of Denomination, because a grader
  must be picked before the PCGS label-decode flow can run and that decode
  auto-fills the identity fields below it. It bundles the grader select,
  the PCGS Label # block and the Cert/Type Number row (the latter two
  conditionally shown, unchanged). It sits outside the RECORD_SECTIONS
  order on purpose: it's entry-time machinery, not a record section.
  - **Header wording is a real call worth knowing about.** Batch 7 removed
    a bold "GRADING SERVICE (OPTIONAL)" label sitting on a near-synonymous
    "Grader" field, and renamed the field to "Grading Service". Making it a
    bounded section needs a header again, and reusing "Grading Service"
    would recreate exactly the duplication Ray rejected. So the header
    names the GROUP — **"Grading & Certification"** — and the field keeps
    its batch-7 "Grading Service" label. Different words at different
    levels, structurally identical to "Overview" → "Year".
  - Collapsed by default despite being first: most coins aren't slabbed, so
    a short form is the common case and a PCGS entry is one tap away. Worth
    Ray's eyes on a device — it's the one default that trades a tap in the
    slabbed flow for brevity in the unslabbed one.
- **Purchase Details and Storage are inline accordions now**, overturning
  the locked-in "drill-down, not an inline accordion" note (Ray explicitly
  overturned it; see that note, now marked superseded). `showAddCoinSubview()`,
  the two subview cards, their Back/Done buttons, the two summary rows and
  `updateFormRowSummaries()` are all retired. **Add Set was deliberately
  NOT converted** — it still drill-downs; that would be its own scoped
  change, and its comment referencing Add Coin's retired pair was corrected
  so a future session doesn't follow a dead pointer.
- **The match-count indicator moved into Overview**, directly beneath the
  identity fields that produce it (`dbMatchBanner`/`dbNoMatchBanner`/
  `dbAmbiguousBanner`), instead of sitting adrift near the save buttons.
  Change an identity field, watch the count react.
- **Save controls stay OUTSIDE every accordion** — they act on the whole
  form, and burying the primary action inside a collapsible section would
  hide it.
- **Add-Coin-only fields placed per Ray**: Error and Finish into Overview,
  Assign to Album stays in Storage. Notes & Facts holds Notes alone — Fun
  Fact is DB_Coins catalog data about the coin TYPE (read-only even in Edit
  Coin), so there is nothing for Add Coin to capture there.
- **New `ADD_COIN_SECTIONS`** — one `[headerId, bodyId, openByDefault]`
  table driving both the init-time wiring and the reset-to-default in
  `resetAddCoinForm()`, so the two can't drift. Sections now reset to their
  defaults on re-entry, same rule live-run bug #1 established for the
  fields themselves (leaving Purchase Details hanging open from the
  previous coin is the same class of leftover, just structural).

**A hazard checked rather than assumed.** CLAUDE.md warns that
`renderTypeDenomCorner()`'s `scrollWidth`/`clientWidth` shortening "requires
the element to already be visible/laid out — call sites that toggle
visibility must do so BEFORE populating corner text". The flip labels now
live inside a collapsed-by-default Photos section, which looks like exactly
that trap. **It does not apply**: Add Coin's own `updateFlipLabels()` *(removed 23 Oct 2026, commit 6 `c6f0ba0`)* set
`textContent` directly and never calls `renderTypeDenomCorner()` — only the
SAVED-coin renderer (`applyFlipCorners()`, Spotlight/Browse detail) does.
Verified live, not reasoned about, and pinned by two assertions so a future
change can't quietly introduce the dependency.

**The whole restructure was low-risk for one specific reason: every field
kept its element id.** The markup moved into accordion wrappers; no JS that
reads a field by id needed touching. That is why 258 pre-existing assertions
passed unchanged against the new layout.

**Verified headless — new suite `tests/verify_addcoin_accordion.js` (29
assertions), all passing; 287 across all 6 suites, zero failures.** Covers:
exact section order with Grading first and no Specifications; the
Overview-open/rest-collapsed defaults; the subview cards, summary rows and
both retired functions genuinely gone from the DOM/global scope; every
field landing in its intended section; the match banners in Overview and
the save buttons outside every accordion; Grading still preceding
Denomination and batch 7's Bullion-toggle placement surviving; expand/
collapse with `aria-expanded` and reset-to-default on re-entry; flip labels
populating correctly while Photos is collapsed AND unchanged once expanded;
a real save collecting fields out of collapsed sections, through both the
in-memory row and the durable-draft reader; and no horizontal overflow with
every section expanded, at both viewports. Screenshots reviewed at both
viewports.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round in this feature. Ray has not seen the
  inline Purchase/Storage sections in hand yet and has said he'll flag them
  if they don't feel right.


### U.S. Mint Item Number: naming standardized across DB_Coins/DB_Sets (BUILT and merged to main)
`DB_Coins.USMint#` — a real column, confirmed by Ray, that carries the
Mint's own catalog identifier for a specific coin PRODUCT — was not read by
`mapWorkbookRowToDbCoin()` at all before this. Per Ray's explicit direction,
standardized to the same naming DB_Sets already uses for the identical
concept (`ItemNumber`), and to the term the Mint's own catalog uses ("Item
Number"), rather than inventing a third name for the same thing.

- **Exposed internally as `itemNumber`** on the mapped DB_Coins row shape —
  matching `DB_Sets`' own `itemNumber` field name exactly, so the two read
  as siblings in code (a Mint product identifier), not as two differently-
  named things that happen to mean the same thing.
- **`colVal()`'s candidate list covers the real header (`USMint#`) plus
  the standardized name (`ItemNumber`/`Item Number`)** — this keeps working
  whichever the workbook column ends up named after Ray's own standardization
  pass on the sheet itself (not done by this app-only session; workbook
  header renames are Ray/Copilot's territory, same boundary as every other
  schema change in this file).
- **Add Set's own field label renamed** from "Mint product code (if known)"
  to **"U.S. Mint Item Number (if known)"** — label-only, matching the term
  now used consistently on both sides; element id (`addSetProductCode`) and
  every function reading it are untouched, same "rename is label-only"
  pattern as every other pure relabel in this file.
- **`FAKE_DB_COINS` gained a sparse `itemNumber` field** (blank on the one
  seeded row so far), matching the sparse-field convention every other
  optional DB_Coins attribute (`gsid`, `pcgs`) already follows in the mock.

**Deliberately NOT done in this pass, flagged rather than assumed:**
Add Coin has no capture field for this yet, and DB_Coins.itemNumber is not
wired into any matcher tier (`dbCoinsCandidatesFor()` doesn't read it). This
was purely the naming/mapping standardization Ray asked for as a first
step — see the open questions in the session log for what a real Add Coin
capture field + matching wiring would need to decide (single field vs. the
two-part `ItemNumber`/`ProductOption` structure DB_Sets uses; where it lives
on the Add Coin form; whether it should also fold into the Docket research
note for an unmatched coin).
**Since BUILT** — see "Add Coin: Identification section — Mint Item Number +
GSID matching" below; every open question there was resolved and a real
capture field now exists for both.

Verified headless — new suite `tests/verify_usmint_itemnumber.js` (5
assertions): the real column reads correctly, both fallback candidate
names work, a row with none of the three maps to a blank string rather
than throwing, and the Add Set label reads the standardized text. 292
assertions across all 7 suites, zero failures.
- **Not verified: any real device, any real OneDrive session, or the real
  DB_Coins column's exact current name** — Ray confirmed the column exists
  and is called `USMint#` today; whether/when he renames it on the sheet
  itself is his call, and the fallback candidates exist specifically so
  this code doesn't care either way.


### Add Coin: Identification section — Mint Item Number + GSID matching (BUILT and merged to main)
Extends the existing PCGS-label-decode pattern with two more independent
identification paths, since a growing share of Ray's purchases come
directly from the Mint (a product often not yet in DB_Coins at all) and
DB_Coins.GSID was already a real column with no entry point of its own.

- **"Grading & Certification" renamed to "Identification."** It's no
  longer just about a graded slab — it hosts every authoritative external
  ID that can decode a coin's identity (Mint Item Number, PCGS label,
  GSID). Header text/id (`addCoinGradingHeader`) otherwise unchanged, same
  "different words at different levels" pattern batch 7 already
  established for "Grading Service" vs. this section's own header.
- **Field order inside the section**: U.S. Mint Item Number FIRST (ahead of
  Grader — Ray's own point that Mint purchases are his common case and
  often the only identifier on hand pre-catalogue), then the existing
  Grader/PCGS block unchanged, then GSID LAST (a Greysheet catalog ID,
  unrelated to any grading service, so it sits independent of that block
  rather than nested inside it).
- **One shared `handleIdentifierLookup()`, not two near-duplicate
  handlers** — Mint Item Number and GSID are structurally identical
  lookups (no parsing step, unlike PCGS's `SPEC.GRADE/CERT` format), so one
  parameterized function drives both `handleMintItemNumberApply()`/
  `handleGsidApply()`. Match is case-insensitive/trimmed via `normField()`
  (the same "forgiving" comparison every other identity match in this file
  already uses) against `activeDbCoins()` — live catalog when loaded,
  `FAKE_DB_COINS` otherwise, same source PCGS/Finish/Category already read.
  Fires on blur (`change`) and Enter — no Decode button, since there's
  nothing to parse the way PCGS's label format needs one.
  - **0 matches** → a non-blocking "not found" banner (expected to be the
    common case for a genuinely new Mint release); the typed value is
    still captured onto the draft either way.
  - **1 match** → `applyIdentifierDbCoinsMatch()` autofills identity
    fields (denom/year/mint/description/variety/finish) and makes the pick
    authoritative for Save, reusing the exact "remembered pick" mechanism
    PCGS decode uses (Q4) — so Save doesn't re-open the ambiguous picker
    for an identity that already resolved unambiguously.
  - **2+ matches** (two DB_Coins rows sharing an Item Number/GSID would
    itself be a catalog issue, but handled anyway) → the same shared
    `renderAmbiguousMatchList()` every other 2+ case in this app uses —
    never auto-resolve, always a human pick.
  - **Deliberately NOT the same function PCGS decode uses**
    (`resolvePcgsLabelMatch`), which also forces Grader/GradeSource to
    `"PCGS"`. Neither a Mint product number nor a Greysheet ID implies PCGS
    certification, so a match via either of these two fields autofills
    identity only — Grader/GradeSource are untouched. Verified directly
    (assertions B3/C2).
- **Two real, persisted draft fields, `itemNumber` and `gsid`** — captured
  regardless of match outcome (same "capture it either way" posture every
  other identity field on this draft already has). `readAddCoinFormForDraft()`
  also captures `pcgsLabelRaw` (the full, unparsed PCGS Label # field text)
  purely for the research note below — Add Coin has only ever persisted the
  CERT portion of a decoded label (`serNo`), so without this a slabbed
  coin whose PCGS# came back with no DB_Coins match would leave nothing
  of the actual label for Copilot to work from.
- **The Docket research note now lists every captured-but-unresolved ID**,
  not just a generic "no match" line — Mint Item Number, GSID, and the raw
  PCGS label text (if entered) all appear when present, since any ONE of
  them is what lets Copilot create the right catalog row. Checked only in
  the no-match branch: a coin that DID resolve (by any path) has nothing
  left to hand to reconciliation, even if some other field it also carried
  happened not to match anything — a genuine disagreement between two
  resolved IDs is the separate, deliberately deferred conflict-detection
  item (see below).
- **`researchNote` is now actually surfaced in the UI — a real, separate
  gap this task found and fixed.** It was already computed and written to
  every draft, but nothing displayed it: neither the Docket's Staging rows
  nor Staging Review's own row list ever read `draft.researchNote` back.
  Now shown as its own line in both places — the Docket's Staging row
  (`renderNeedsAttentionHub()`) and Staging Review's row list
  (`coinDraftToStagingRow()`/`buildStagingRowEl()`), reusing the existing
  `.staging-pending-flag` styling.
- **A real bug caught by screenshot before shipping, not left for a later
  pass to find** — the exact same trap this file has hit before (no
  generic `.hidden` rule; every `.hidden` is scoped to its own component).
  The two new ambiguous panels (`mintItemAmbiguousPanel`,
  `gsidAmbiguousPanel`) were built with `class="case hidden"` copying the
  existing PCGS/Description panels' look, but needed their own
  `#id.hidden` rule same as those — without it, `classList.contains
  ("hidden")` read `true` while the panels stayed fully visible at rest.
  Fixed with two scoped rules; the committed suite checks the real
  computed style (`getComputedStyle().display`), not just `classList`, so
  this class of bug can't hide behind a green suite again.
- **Deliberately deferred, not built here (Ray's explicit call)**: if two
  or more of PCGS#/Mint Item Number/GSID are entered and resolve to
  DIFFERENT DB_Coins rows, nothing detects or surfaces that conflict yet —
  each lookup is independent, and whichever one is filled in/re-triggered
  last simply overwrites `addCoinResolvedPick`. This project has a real
  history of PCGS#/GSID mismatches turning out to be genuine catalog bugs
  (see the Designation-matcher cert-protection guard elsewhere in this
  file), so a silent overwrite is a known, accepted gap for now, not an
  oversight — scoping the actual disagreement-resolution UI is explicitly
  held for a follow-up once Ray has seen the first four pieces live.

**Verified headless — new suite `tests/verify_addcoin_identification.js`
(22 assertions), all passing; 314 across all 8 suites, zero failures.**
Covers: the section rename and exact field order; a Mint Item Number match
autofilling identity with no Grader/GradeSource side effect, and a genuine
miss touching nothing; the same for GSID (including case-insensitive
matching); the resolved pick actually being what Save commits; the raw
captures (`itemNumber`/`gsid`/`pcgsLabelRaw`) being read off the form and
persisted onto the draft regardless of match outcome; the research note
listing all three captured-but-unresolved IDs together, and NOT appearing
at all for a coin that did resolve; `researchNote` genuinely rendering in
both the Docket and Staging Review; `resetAddCoinForm()` clearing both new
fields and their banners; the two ambiguous panels' GENUINE hidden state
(computed style, not just class); and a full nav smoke with no overflow.
Screenshots reviewed at both viewports, before and after the visibility
fix.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round in this feature. `FAKE_DB_COINS` gained a
  real `itemNumber` ("21RJ") on the existing Mercury Dime demo row, reusing
  its already-real `gsid` ("GS-1044") on the neighboring VDB Lincoln row
  rather than inventing new demo rows.


### Add Coin Identification: a matched ID now carries Category too (BUILT and merged to main)
Live-testing finding: matching a coin via Mint Item Number, GSID, or a PCGS
label decode all autofilled identity fields (denom/year/mint/description/
variety/finish) through the one shared `applyDbCoinsRowToForm()`, but none
of them ever set Category or checked the Bullion toggle — so matching a real
bullion coin (e.g. a 2017 American Silver Eagle) left the form showing a
bare `$1` classic Dollar with Bullion unchecked, even though the matched
DB_Coins row unambiguously names it a Silver Eagle. Confirmed live by Ray.

- **DB_Coins has no Category column** (confirmed via source, unchanged from
  the batch-3/Category-tier work) — so Category is inferred from the
  matched row's own `description`, using the EXACT SAME
  `BULLION_CATEGORY_MATCH_HINTS` table `dbCoinsCandidatesFor()`'s Category
  tier already reads, just run in the opposite direction: there,
  category → narrow candidates; here, `inferBullionCategoryFromDescription()`
  does description → category.
- **Longest-matching-hint wins, not first-match-in-iteration-order** — the
  same trap the hints table's own comment already warns about for a single
  bare word, just re-encountered at the table level instead of within one
  hint list. The generic `"Eagle"` category's own hint (`"EAGLE"`) is a
  substring of `"American Silver Eagle Dollar"` and sits earlier in the
  object than `"Silver Eagle"`'s own more specific `"SILVER EAGLE"` hint —
  a naive first-match scan would incorrectly infer plain `"Eagle"`. Picking
  the longest matching hint across every category (not the first one found)
  is what actually gets this right; confirmed as the correct approach
  before building, not discovered by a failing test.
- **Fixed once, inside `applyDbCoinsRowToForm()` itself** — a new
  `applyInferredBullionCategoryToForm(row)` runs first thing inside it, so
  all three callers (PCGS decode via `resolvePcgsLabelMatch`, Mint Item
  Number and GSID via the shared `applyIdentifierDbCoinsMatch`) are fixed
  uniformly, with no per-caller duplication.
- **Never dispatches a `"change"` event on `#denomination`** when
  programmatically selecting the matching `BULLION_TIER_OPTIONS` entry —
  that handler's own bullion branch sets Description from the OPTION's
  generic label text, which would clobber the real, more specific DB_Coins
  `row.description` this function is called right alongside setting.
  Instead the matching `<option>` (matched on both `value === row.denom`
  AND `dataset.category === category`) is selected directly and
  `addCoinBullionCategory` is set by hand.
- **A non-bullion match explicitly restores classic mode** — unchecks the
  toggle, repopulates the classic dropdown, clears `addCoinBullionCategory`
  — so a bullion match earlier in the same form session (a Mint Item Number
  match, then a different, unrelated GSID/PCGS match to a plain coin) can't
  leave a stale bullion selection behind.
- Verified headless — new suite `tests/verify_addcoin_category_autofill.js`
  (15 assertions, all passing; 329 across all 9 suites, zero failures):
  `inferBullionCategoryFromDescription()` in isolation (the longest-hint
  case against a synthetic "American Silver Eagle Dollar" description, a
  Gold Eagle case, a plain Morgan Dollar inferring nothing, blank/undefined
  never throwing); a Mint Item Number match against a synthetic Silver
  Eagle row checking the toggle, landing on the correct `$1`/`"Silver
  Eagle"` option, and Description staying the real DB_Coins text (not the
  option's own generic label); the identical outcome via GSID and via a
  PCGS label decode (confirming the one-shared-function fix covers all
  three); a subsequent plain-coin match correctly un-checking the toggle
  and clearing Category with no stale carry-over; and a nav/overflow smoke
  check. Full 9-suite regression re-run clean alongside it.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round in this feature.


### CACBean UI, Value field rounding, composition corner restacked (BUILT and merged to main)
Three items from Ray's live-testing session, one directly following the
Composition matcher/flip-card work.

**1. CACBean UI (Add Coin + Edit Coin).** `All!CACBean` is a real, new
single-cell column Copilot added — data-validated on the real sheet
(`All!R2:R1543`) to exactly `Green`/`Gold`/blank, confirmed by Ray reading
the workbook directly. Two checkboxes, positioned to the right of the
Cert/Type Number field in both forms, mutually exclusive despite being two
separate elements.
- **`wireMutuallyExclusiveCheckboxes(aId, bId)`** — one shared helper, not
  two near-duplicates: checking one clears the other via a plain `change`
  listener (no event dispatched on the programmatic clear, so it can't
  double-count as user input). Unchecking the currently-checked box directly
  leaves both unchecked — the blank state, not a forced fallback.
  `cacBeanValueFrom(greenId, goldId)`/`applyCacBeanToCheckboxes(...)` are the
  two halves of the value <-> checkbox-pair conversion, shared by both forms.
- **Add Coin and Edit Coin have genuinely different write situations —
  confirmed by reading the code before building, not assumed identical.**
  Add Coin (Phase 1) has ZERO write path to All; everything is a Staging
  draft. Edit Coin (Browse Edit) has a REAL, flag-gated write path
  (`ALL_WRITABLE_COLUMNS`, `buildRowCellEdits()`, the live snapshot
  re-base). The two builds reflect that:
  - **Add Coin**: `cacBeanValueFrom("cacGreen", "cacGold")` feeds
    `readAddCoinFormForDraft()` -> `buildCoinDraft()`, captured on the
    Staging draft the same "capture it either way" posture as
    Category/itemNumber/gsid — flagged in both the code comment and here
    that it needs an `ALL_WRITABLE_COLUMNS` entry before Phase 2 can
    promote it onto a real row. `resetAddCoinForm()` clears both checkboxes.
  - **Edit Coin**: `"CACBean"` added to `ALL_WRITABLE_COLUMNS` — the same
    structurally-enforced allow-list every other real Browse Edit field
    goes through, so it's automatically covered by `detectRowConflicts()`
    with no extra code. **Not** an identity field (no overwrite-confirmation
    dialog for a CAC status change, same as Designation). The checkbox pair
    threads through the same dual-id pattern the Grade dropdown/"Other" pair
    already established: `CONFLICT_FIELD_TO_INPUT` maps to the Green id,
    `conflictFieldIsUserEdited()` ORs in the Gold id; `applySnapshotToEditFormInner()`
    only re-bases the pair when NEITHER has been touched;
    `applySnapshotToRecord()`/`mapWorkbookRowToCoin()`/`showBrowseEditViewInner()`
    all carry `cacBean` the same way every other field does. **`""` (both
    boxes unchecked) is a real, written value** — the same "clearing a field
    is a genuine write, not a dropped key" rule Designation/Container already
    follow — verified via a real save through the mock Graph client
    end-to-end, not just asserted in isolation.
- **`FAKE_COINS` seeded sparsely** (AY-00001: `"Gold"`, AY-00003: `"Green"`)
  for exercisability, same convention every other sparse demo field in this
  file already follows.
- Verified headless — new committed suite
  `tests/verify_cacbean_and_value_rounding.js`: mutual exclusivity on both
  forms (with a real negative-control regression — the first pass on Edit
  Coin's own check started from both-unchecked, which would have silently
  passed even with exclusivity broken; fixed to start from Gold genuinely
  checked so the assertion actually exercises the clear); the blank-state
  case; the draft capture; `ALL_WRITABLE_COLUMNS`/never-write/identity-list
  membership; prefill from three seeded states (Gold/Green/blank); the
  touched-field OR-check in both directions; the session-only apply path;
  and a full end-to-end run through the REAL Save button via
  `createMockGraphClient` — the live snapshot re-base pre-filling from the
  workbook cell (not the in-memory stub), a real Gold save landing in the
  mock grid, and a real clear-to-blank save landing too. **Not verified: any
  real device, any real OneDrive session.**

**2. Value field currency formatting.** `browseEditValue` had TWO
populate sites feeding it a raw, unrounded computed value with no
formatting of its own (a plain `<input type="number">` just stringifies
the exact float) — the initial `coin.value` populate AND the live snapshot
re-base (`values.Value`, straight off the Graph cell). `editSetValue` had
the identical bug at its own single populate site. Checked every other
currency `<input type="number">` in the app (Cost/Shipping/Purchase Price
across every form) — **none of them are ever fed a computed value**; always
either blank-on-reset or literally typed/persisted-verbatim, so the fix is
scoped to the two Value fields alone, not applied defensively everywhere.
- **`roundToCents(v)`** — rounds to the nearest cent for POPULATING a field
  programmatically; null/undefined/blank/non-finite pass through as `""`,
  same convention every other populate-from-workbook helper already uses. A
  user's own typed entry is never touched — populate-time only, verified
  directly (typing `12.3456789` into the field leaves it exactly that).
- **`$` prefix**: `.currency-input-row` (flex wrapper) + `.currency-prefix`
  (the `$` label) — a number input can't show one inline. Applied
  identically to `browseEditValue` and `editSetValue`; deliberately NOT
  applied to Cost/Shipping/Purchase Price fields anywhere, per the narrower
  scope above.
- Verified headless (same committed suite as CACBean, above — one session,
  one suite): `roundToCents()` in isolation including the exact reported bug
  value (`0.039914798` -> `0.04`); both populate sites for `browseEditValue`
  (the initial `coin.value` site AND the live snapshot re-base, via a real
  mock-Graph-client end-to-end save) each independently regression-guarded
  (a negative control reverting either site fails its own assertion);
  `editSetValue`'s own site; the `$` wrapper present on both fields; a
  user's own typed value surviving untouched; and a scope check confirming
  Cost was NOT given the same treatment.

**3. Composition corner restacked — two lines, not one (supersedes the
single-line-with-reduction layout from the Composition build immediately
prior).** Prompted by a real, MEASURED collision risk, not a guess: a long
free-typed "Details"-graded value in the BL corner (which has **no**
overflow protection of its own, unlike TR and now BR) genuinely overlapped
an unreduced composition in BR at 360px width (`-9px` gap, reproduced
directly before touching any code). The two-line layout — fineness
right-justified on its own line, metal name below, same
`renderCornerLines()` mechanism TL/TR already use — measured 42-70px wide
against the old single-line-with-reduction's 98-139px, turning that exact
collision into a comfortable 49-77px gap.
- **`splitCompositionForStacking(text)`** — splits the precious-metal-only
  reduced candidate (stage 2 of `compositionLabelCandidates()`, so a balance
  metal is never part of the split) into `[value, metal]` via
  `/^([.\d][.\d,%]*)\s*(?:Fine\s+)?(.+)$/i`. "Fine" is always dropped for
  the split — unconditionally, not just when needed to fit — since it isn't
  part of either the fineness value or the metal name the two lines exist
  to show.
- **A composition naming 2+ precious metals** (comma-separated — no coin in
  this collection is bimetallic today) has no single value/metal pair to
  stack. Confirmed with Ray (Q5): falls back to the joined string as ONE
  line rather than inventing a layout for zero real rows.
  **KNOWN, ACCEPTED GAP, found and left deliberately, not silently**: that
  joined fallback line has no further reduction beyond what
  `compositionLabelCandidates()` already does (which keeps both metals
  rather than dropping either), so a genuinely long two-metal string can
  overflow its box — measured directly (`"50% Gold, 50% Silver"` overflows
  by ~20px at phone width). Same "not worth the tradeoff for a case that
  basically never happens" call as several other documented gaps in this
  file (the mirrored-EXIF-rotation gap, the deferred copper-color pass) —
  building real shrink logic for a coin type nothing in this collection has
  would be exactly the unrequested layout work Ray said not to do here.
- **`setCompositionCornerText(el, text)`** is what `applyFlipCorners()`
  actually calls now — stacks when the split is clean, falls through to the
  existing `setFittedCornerText()` (single-line, measured) otherwise.
  `setFittedCornerText()`/`compositionLabelCandidates()` themselves are
  UNCHANGED — still exactly what the fallback path and (independently)
  every other corner's own reduction logic already relied on.
- **Item 6 flag, confirmed out of scope for this pass (Ray's explicit
  call):** BL's own total lack of overflow protection is a real,
  pre-existing gap this measurement surfaced — a sufficiently long
  free-typed Grade+Designation string has no shortening of its own the way
  TR (word-drop) and now BR (the stack/reduction chain) do. Not fixed here;
  logged as ParkingLot Row 6 in the session log below.
- Verified headless (composition suite, `tests/verify_composition.js`,
  rewritten in place following this real design change — not weakened;
  every assertion that checked single-line `.textContent` now checks the
  two `.corner-line` children instead, since a stacked corner's
  `.textContent` concatenates both lines with no separator): the split in
  isolation (a long value, a balance-metal value, an already-short value,
  the bimetallic fallback with its own known-gap noted rather than silently
  passed); the real render path through `applyFlipCorners()` (not just the
  splitter called directly — the same "green suite hiding a real bug" trap
  this file has hit before); Browse detail AND Spotlight both stacking
  identically; and a **new, dedicated N-block reproducing the exact
  real-measured collision case at 360px** (the same BL/BR pairing that
  motivated this whole item) and confirming it no longer overlaps — proof
  the fix addresses the actual motivating scenario, not just the unit-level
  splitting logic. 79 assertions total in the suite (was 74), zero
  failures. **Not verified: any real device.**


### Mint Mark "None (Other)": real DB_Coins.Mint disambiguation (BUILT and merged to main)
Closes item 8 from the earlier batch, unblocked once Ray confirmed via
Copilot that `DB_Coins.Mint` (the FULL facility name — "San Francisco",
"Denver", "Philadelphia" — distinct from `MintMark`, the abbreviation) is
now backfilled on all 236 real blank-MintMark rows. Built the real
DB_Coins-backed disambiguation picker (Q1–Q4 confirmed), not the plain
"— none —" fallback.

- **A new "— none (Other) —" option** sits right after "— none
  (Philadelphia) —" in Add Coin's Mint Mark dropdown, above the real codes
  (P/D/S/CC/O/W, all unchanged). **Scoped to Add Coin only** (Q1) — same
  footprint as the Mint Item Number/GSID lookups this is modeled on; Edit
  Coin's identical dropdown is untouched, a separate future build if wanted.
- **"Other" never writes a persisted MintMark value of its own** (Q2,
  confirmed) — its option value is a one-shot sentinel (`__OTHER_MINT__`),
  normalized straight back to `""` the instant the `change` handler fires,
  BEFORE `refreshVarietyOptions()`/`checkDbCoinsMatch()`/`updateFlipLabels()` *(removed 23 Oct 2026, commit 6 `c6f0ba0`)*
  or any other reader of `#mintMark.value` runs. It's purely a UI trigger
  for the one-time lookup below; the draft's MintMark stays blank, exactly
  like an ordinary Philadelphia coin — verified directly (a saved draft
  through this path carries `mint: ""`).
- **`mapWorkbookRowToDbCoin()` now reads `DB_Coins.Mint` into a new
  `mintFull` field**, kept completely separate from `mint` (the abbreviation
  the base matcher's join key already uses). This is a NEW, narrow lookup —
  used only by `handleMintMarkOtherApply()` — and does not touch the
  existing hard constraint that the full-name `Mint` column must never
  substitute into the primary MintMark join key; `dbCoinsCandidatesFor()`
  itself is completely unchanged.
- **`handleMintMarkOtherApply()` is deliberately its own function, not
  routed through the shared `handleIdentifierLookup()`** (Mint Item Number/
  GSID's helper) — this is a filtered SEARCH keyed on Year+Denomination
  (MintMark blank, Mint populated and not Philadelphia), not a single
  scalar field-equality match, and it has a third outcome
  (`handleIdentifierLookup` and its two callers have only two). Requires
  Year AND Denomination already entered (a toast asks for them otherwise,
  Q-implied by the search key) — variety, if already typed, is a SOFT
  narrow only (Q4, confirmed), same pattern the Finish/Category tiers in
  `dbCoinsCandidatesFor()` already use: can only reduce ambiguity, never
  produce a false miss.
- **Philadelphia rows are explicitly excluded from the candidate set**, even
  when `Mint` is populated and literally says "Philadelphia" — those are
  the ordinary Philadelphia case the ✱plain✱ blank option already covers,
  not what "Other" exists to disambiguate. Verified directly against a
  seeded blank-MintMark/Mint="Philadelphia" row: correctly reports
  not-found rather than a false match.
- **"Multiple Facilities" (Copilot's new value for an anonymous bullion
  Eagle documented as struck at more than one facility with no
  distinguishing mark) is a real DB_Coins.Mint value like any other — the
  disambiguation logic branches on it, not a separate flag anywhere.**
  Three outcomes (Q3, confirmed):
  - **Sole match, real facility** → applies directly (same single-match
    banner every other lookup uses), naming the actual mint.
  - **Sole match, Multiple Facilities** → applies directly too (nothing to
    disambiguate), but with its OWN distinct wording — "Struck at multiple
    facilities — mint not individually identifiable for this issue" —
    never worded as if "Multiple Facilities" were a place name.
  - **2+ total candidates, in any mix** → the shared ambiguous picker shows
    ONLY the real-facility candidates in its normal list; if a
    Multiple-Facilities row also exists for this Year+Denomination, it's
    offered as its own separate, clearly-labeled card below the list
    (`#mintMarkOtherMultipleFacilitiesOption`) — reachable, but never mixed
    in as if it were just another named mint. Verified for a real 1-real+
    1-MF mix ($1 2001): the picker's list shows exactly the one real
    candidate (West Point), the MF card renders separately, and clicking it
    applies the MF row's own CoinID with the MF wording, not the real
    candidate's.
  - A single Multiple-Facilities DB_Coins row is the expected shape; two or
    more sharing one Year+Denomination (presumably a Variety split) is
    treated pragmatically — the first is used rather than building a second
    nested picker for data this sparse, flagged in a code comment rather
    than silently assumed correct.
- **Resolved pick uses the same "remembered pick" mechanism** every other
  lookup in this section already relies on (`applyIdentifierDbCoinsMatch`),
  so it sticks through Save with no picker re-shown, and correctly
  invalidates if a relevant identity field changes afterward — no new
  mechanism needed.
- **A real, useful side effect, not a separate change**: since a matched
  Silver Eagle row's Description contains "American Silver Eagle Dollar",
  applying it also correctly flips the existing Bullion toggle and infers
  Category via `applyInferredBullionCategoryToForm()` (unchanged, already
  built) — confirmed via screenshot, not assumed.
- **Same recurring `.hidden`-scoping trap this file has hit before, caught
  before shipping this time**: the two new elements
  (`#mintMarkOtherAmbiguousPanel`, `#mintMarkOtherMultipleFacilitiesOption`)
  needed their own `#id.hidden { display:none }` CSS rules, same as every
  other panel built this way in this section — added alongside the markup,
  verified via real computed style, not just `classList`.
- **Six new synthetic `FAKE_DB_COINS` rows** cover every branch (a sole
  real match, a real 2-way ambiguity, a Variety-narrowable ambiguity, a
  sole Multiple-Facilities match, a mixed real+MF ambiguity, and a
  blank-mint Philadelphia row proving the exclusion) — flagged in a comment
  as representative test data, not claims about real historical mintages.
- Verified headless — new committed suite
  `tests/verify_addcoin_mintmark_other.js` (27 assertions, all passing;
  523 across all 14 suites, zero failures): the dropdown option and its
  position; the missing-prerequisites case firing nothing; a single
  real-facility match; a real 2-way ambiguity (picking the SECOND candidate,
  not the first, to prove it's a genuine unforced choice); the Variety soft
  narrow in both directions (narrows when typed, stays ambiguous when
  blank); the sole Multiple-Facilities outcome and its distinct wording; the
  mixed real+MF case (real candidate alone in the list, MF offered
  separately, clicking MF applies the MF row specifically); the Philadelphia
  exclusion; a genuine no-data miss; the resolved pick surviving Save with a
  blank persisted MintMark; `resetAddCoinForm()` clearing every new element;
  `mapWorkbookRowToDbCoin()` reading the real column into `mintFull`
  (including the blank-Mint case not throwing); the genuine-hidden-state
  check for both new elements; and a nav/overflow smoke check.
  **Verified negative control**: temporarily removed the Philadelphia
  exclusion and the MF/real split, confirmed 5 assertions fail with the
  exact wrong-outcome symptoms, then restored the real fix and re-confirmed
  all pass.
- **Not verified: any real device, any real OneDrive session.** Same
  standing caveat as every round on this branch — `DB_Coins.Mint`'s real
  population was confirmed by Ray via Copilot, not independently verified
  from this environment.


### Editing a coin in Staging — Phase A (BUILT and merged to main)
Mark Ready used to be a one-way blind commit: nothing could reopen what had
been captured, unlike an in-progress Set draft, which `resumeSetDraftAtStep1()`
has always been able to resume. This is the coin-side equivalent.

**Phase A scope, deliberately: FIELDS only.** Photos and the receipt are
carried forward untouched, so an edit can never lose a captured file.
**Superseded by Phase B (Oct 2026), now built** — see "Editing a Staging
draft: photos, receipt and research note (Phase B)" near the top of this file.
The reason given here for holding it ("needs a delete-from-OneDrive capability
nothing in this flow has") was wrong: `graph().deleteItem()` already existed
(Reject, the promotion move and Purge all use it).

- **`applyCoinDraftToForm(draft)` is the exact inverse of
  `readAddCoinFormForDraft()`** — every field that reads, this writes back,
  including the derived UI state that is stored nowhere: which dropdown
  option is selected, whether an "Other" override box is showing, and which
  Grader-dependent rows are visible. Runs AFTER `resetAddCoinForm()`, never
  instead of it, the same way `applyAlbumContext()` does — `navigate("addcoin")`
  always resets first (live-run bug #1).
- **Ordering that matters, not incidental:** the Bullion toggle is restored
  FIRST because it regenerates the Denomination dropdown; a bullion draft's
  `denom` is a plain face value shared with other types, so the option is
  matched on **denom AND `dataset.category` together**, never the face value
  alone. Grader is set before the fields whose rows it shows/hides.
- **`gradeFieldsFromValue()` reverses `resolveGrade()`'s three collapsed
  states.** The range case is the trap: `"G-4-VG-8"` has hyphens inside BOTH
  halves, so the split point cannot be guessed from the string — every
  candidate split is tested against the real option list instead. A value
  matching no option at all is the "Other" free-text path, so a Details grade
  (`"XF Details - Improperly Cleaned"`) restores correctly rather than
  becoming a bogus range.
- **`addCoinResolvedPick` is restored in the SAME shape a live pick uses**
  (`{row, forShape, candidateCount}`), keyed to the identity now on the form —
  so an unrelated edit (a typo in Notes) doesn't re-open the ambiguous picker
  for a coin whose catalog row was already chosen, while editing
  Year/Mint/Denom correctly invalidates it. The row is **looked up** in
  `activeDbCoins()`, not synthesised: if DB_Coins no longer carries that
  CoinID, there is nothing honest to restore, so the pick is dropped and the
  matcher speaks for itself.
- **THE ONE THAT MATTERS — an edit reuses the draft's own CollectionID.**
  `completeAddCoinSave()` unconditionally called `reserveCoinCollectionId()`;
  editing through it unchanged would burn a fresh id and write a second draft
  folder, orphaning the first along with its photos. Now
  `editingCoinDraftId || await reserveCoinCollectionId()`.
- **`saveCoinDraftEdit()` overlays onto the STORED draft rather than writing
  `buildCoinDraft()`'s output wholesale.** `buildCoinDraft()` produces a NEW
  draft, so using it directly would silently reset four things an edit must
  never touch: `status` (a Ready draft would drop back to Draft), `photos`/
  `receiptPhoto` (returned empty, orphaning every captured file),
  `createdDate`, and the Phase 2 bookkeeping (`allRowWritten`/`forceAdded`/
  `filesMovedOnPromotion` — a force-added coin already on the All sheet must
  stay marked as such). It IS re-run for the research note, so an edit that
  closes a catalog gap clears the note instead of leaving a stale one.
- **The edit binding is dropped inside `navigate()`'s addcoin branch.**
  Without it, leaving an edit part-way and entering Add Coin fresh would save
  the NEW coin over the draft being edited — on a form that looks blank.
  `beginCoinDraftEdit()` re-establishes the binding immediately after its own
  `navigate()` call, so this never clears a live edit.
- **Entry point: an Edit button on Staging Review rows**, offered on Draft and
  Ready drafts and never on a `PROMOTED` one (whose row belongs to the All
  sheet — Browse Edit owns it from then on). `beginCoinDraftEdit()` re-checks
  status against the freshly-read draft too, so a stale render can't get past
  the button's own condition.
- **A real defect caught by screenshot, not by the suite:** "Save to Database"
  stayed visible next to "Save changes" while editing, implying a second,
  different outcome that does not exist (both route to `saveCoinDraftEdit()`).
  `updateSaveConfidenceUI()` now takes an edit-mode branch that hides it along
  with the capture-destination notices, which answer a question nobody is
  asking mid-edit. Two assertions added so it can't come back.

**Verified headless — new committed suite `tests/verify_staging_edit.js`
(37 assertions), all passing; 705 across 18 suites, zero failures.** Covers
every captured field round-tripping; the CollectionID reuse asserted by
recording the paths the save actually writes (a folder count alone does NOT
prove it — `saveCoinDraftEdit()` refuses outright when handed a draft that
doesn't exist, so a wrongly-reserved id fails to write at all rather than
leaving a visible second folder); photos and receipt carried forward; all
four pieces of preserved bookkeeping on a Ready + force-added draft; the
PROMOTED and not-found refusals; the binding not leaking into a fresh
capture; all four grade shapes including the double-hyphen range; the
variety and Error "Other" overrides; a bullion draft landing on the option
matching denom AND category; which statuses get an Edit button and the
button actually opening the editor; inertness with the write layer off; and
no horizontal overflow at both viewports. **Verified negative control:**
reserving a new id fails B1/B2/B4/B5/C4; writing `buildCoinDraft()` output
wholesale fails B3/B4/C1/C2/C3; dropping the binding reset fails E2.
- **Not verified: any real device or real OneDrive session.**


### Workbook-alignment batch (BUILT and merged to main)
Four corrections made after reading the REAL `CoinCollection (AI).xlsx`
(uploaded 2026-09-02) rather than reasoning from the 12-row mock. Three of
the four reverse or correct earlier decisions that were made on wrong
assumptions about the data — worth knowing, because in each case the app was
confidently doing the wrong thing and the tests were asserting it.

**1. A resolved DB_Coins row's Description is written onto Add Coin's form.**
- **The data settles the question the earlier investigation had to leave
  open.** `DB_Coins.Description` already carries the real per-design name —
  `"Delaware State Quarter"`, `"Grand Canyon Quarter"`, `"Martha Washington
  First Spouse Gold $10"` — with `Variety` genuinely blank, so several
  designs share one base key and the existing ambiguous picker already
  surfaces them correctly. `Ref_Denominations` cannot compete: for Quarters
  it is program-level only (one row for `"Washington State (1st Design)"`
  covering 1999-2008, one for `"Washington ATB"` covering 2010-2021), and for
  First Spouse it names the first four 2007 spouses individually and then
  lumps 2008-2016 into a single `"Various"` row.
- **Two write points, matching Ray's spec**: the single-unambiguous-candidate
  branch of `checkDbCoinsMatch()`, and the pick handler in
  `resolveAddCoinCatalogMatch()`. Ref_Denominations' program-level auto-fill
  is untouched and still runs as the before-DB_Coins-can-narrow fallback.
- **`applyMatchedDescriptionToForm()` never fights a value the user typed**,
  and that is the only case it declines. A value it wrote earlier IS
  replaceable — a genuinely different catalog row winning later is the point,
  and locking it would strand the first match's name on a subsequently-edited
  identity. That is why `descriptionFromDbCoinsRow` is a separate flag rather
  than reusing `descriptionAutoFilled = false`: the existing flag means "don't
  let the coarse refill touch this", which is still wanted, but on its own it
  would also block the finer source from correcting itself.
- **THE SUBTLE ONE — order is load-bearing in the pick handler.**
  `addCoinIdentityShape()` passes Description to the matcher *only when it is
  one of Ref_Denominations' own controlled series values*, so replacing a
  controlled series name with a per-design catalog name drops
  `shape.description` back to `""` and therefore CHANGES the shape key. Keying
  the pick to the pre-write `state.key` — the obvious way to write it — makes
  `currentAddCoinMatchState()` judge the pick stale on the very next call and
  silently discard the choice the user just made. The pick is keyed AFTER the
  write instead.
  **The first version of the test did not catch this**: it used 25C/1999,
  which has SEVERAL Ref_Denominations series, so the field is cleared and
  `shape.description` is `""` both before and after — the key never moves and
  a pre-write key survives by luck. The committed assertion uses **10C/1950**,
  which has exactly one series (`"Roosevelt Silver"`), and a negative control
  confirms it fails when the keying is reverted.

**2. Edit Coin gains the Mint Mark "— none (Other) —" lookup.**
- **Deliberately narrower than Add Coin's.** Add Coin fills a whole new
  coin's identity from the matched row because there is nothing to lose. Edit
  Coin must not: Description/Variety/Finish/Denomination/Year on an existing
  row are curated, and this form's standing rule is that it never auto-fills
  over them. So the only field it writes is Mint Mark — which the shared
  sentinel has already normalized to blank — and the visible outcome is a
  banner plus a catalog link.
- **The resolved row is AUTHORITATIVE for the save-time CoinID re-link**
  (Ray's confirmed call), consumed by `resolveDbCoinsForSave()`. It has to be
  to be worth anything: the general matcher keys on the ABBREVIATION, which is
  blank for an ordinary Philadelphia coin and for an unmarked Denver/San
  Francisco/West Point one alike, so re-deriving from scratch would discard
  the one piece of information the user just supplied and reintroduce the
  exact ambiguity the lookup exists to settle.
- **Flagged `viaPicker`**, which suppresses the CoinID-change confirm — the
  user already saw and accepted that exact CoinID in the applied banner, so
  re-asking is the redundancy that rule exists to avoid. The
  identity-overwrite dialog still fires independently for the MintMark change
  itself, which is the gate that matters.
- **Self-invalidating** via a shape key, mirroring Add Coin's remembered pick,
  so a later Year/Denomination/Variety edit discards it rather than linking
  the coin to a row for a different identity. Also cleared whenever Edit opens
  for another coin.
- **`mintMarkOtherCandidates()`** extracts the shared QUERY (blank MintMark +
  populated non-Philadelphia Mint, soft Variety narrow, Multiple-Facilities
  split) as a pure function, so both forms ask the same question while
  differing completely in what they do with the answer. Validated at real
  scale: 188 blank-MintMark/West Point rows, 17 San Francisco, 23 Multiple
  Facilities.
- **A real defect found while testing it, affecting the PRE-EXISTING Add Coin
  picker too**: the shared `renderAmbiguousMatchList()` never displayed the
  mint facility, so a Denver card and a West Point card rendered as identical
  text — in the one picker whose entire question is *which mint*. That is the
  Part-F "both options look identical" failure by another route. `mintFull`
  now leads the detail line in all three candidate displays (the picker and
  both Re-check confirm dialogs).

**3. Denomination codes corrected against the real `Lookup_DenomCodes`.**
The app had invented codes that the workbook does not use:
- Half Cent is **`H1C`**, not `0.5C`.
- Half Dime is **`H10C`**, not `H5C`.
- Three Cent is **two** codes, **`3CS`** (silver trime, 1851-1873) and
  **`3CN`** (nickel, 1865-1889), not one merged `3C`. Their year ranges
  overlap 1865-1873, which is the concrete reason one code could never have
  served both.
- **`5oz`** (Five-Ounce Silver, ATB/commemorative, 2010-present) added; it was
  missing entirely.
None are in use by any currently-owned coin, so this is a correctness fix for
whenever the first one is catalogued. `5oz` deliberately does not appear in
the Add Coin dropdown yet: that dropdown is DERIVED from `FAKE_DENOMINATIONS`,
and `Ref_Denominations` has no matching series row — the derivation still
holding is itself asserted.

**4. Finish dropdown corrected against real `DB_Coins.Finish` values.**
Two of these reverse earlier decisions that the data does not support:
- **`Specimen` restored** — removed on the stated grounds of matching zero
  real rows. It matches **9**.
- **`Uncirculated` restored** — excluded as a "condition-vs-finish data
  mix-up". It is **211 real rows** and one of `Lookup_Finishes`' own 11
  defined values ("Mint state, no wear", typical use "Mint sets"). The
  genuinely suspect All-sheet values were `Circulated` and `Various`, which is
  a separate matter.
- **`Matte` added** (3 rows, all modern silver medals) and **`Matte Proof`**
  (Lookup_Finishes' historic 1908-1916 gold value). These are two different
  finishes, NOT a spelling variant of each other — worth stating plainly,
  since the reconciliation question was posed that way.
- **`FINISH_GRADE_PREFIX` gained all three.** `Matte Proof` maps to `PR`;
  without it the generic `|| "MS"` fallback would have decoded a 65 as MS-65
  on a proof.
- **`Circulated`: nothing to simplify, and it should not be removed.**
  Re-checked in the uploaded workbook: `Circulated` (once 139 rows) is now
  absent from `All.Finish` entirely, evidently cleaned up workbook-side.
  `Various` remains (6 rows). But the Finish tier's soft fallback is
  **data-driven, not a `Circulated` special case** — there is no such literal
  anywhere in `dbCoinsCandidatesFor()`; it keys on "is this value known
  anywhere in DB_Coins", so a value that stops occurring simply stops reaching
  it. Deleting the fallback would break `Various` today and any future
  All-only value tomorrow. Only the stale row count in the comment was fixed.

**Verified headless — new suite `tests/verify_workbook_alignment.js` (63
assertions); 771 across 19 suites, zero failures.** Covers all four items
end-to-end, including the Bullion path for First Spouse (`$10` is not in the
classic dropdown at all, so it is reached through the Bullion toggle, whose
generic label the catalog row then correctly replaces). **Four verified
negative controls**, each failing exactly the assertions that claim to catch
it: reverting the pick keying (1.7d), removing the write-back (1.1/1.2d/1.9),
removing the authoritative short-circuit (2.11/2.12/2.14), and a
scope-violating identity fill onto Edit Coin's own fields (2.6/2.6b). Two of
these were written twice — the first attempt at each passed against the
broken code, which is exactly why they were run rather than assumed.
**Seven existing assertions in `verify_batch3.js`/`verify_batch4.js` were
reversed** to follow the confirmed data (they asserted the invented denom
codes and the wrongly-excluded Finish values) — following a real correction,
not weakening.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round on this branch.


### Value / ValueSource / ValueDate on Add Coin
Ray wants value provenance capturable at entry, not only on a later edit.
Three fields at the end of Add Coin's Overview, mirroring the Edit Coin
fields added in the same round: `#addCoinValue` (number, $ prefix),
`#addCoinValueSource` (free text — the real column carries page-level
detail like "Red Book 2027, p. 386" that a dropdown would discard), and
`#addCoinValueDate` (date).
- All three are captured by `readAddCoinFormForDraft()`, stored on the
  draft by `buildCoinDraft()`, and mapped by `coinDraftToAllValues()` — so
  unlike `category`/`cacBean`, which carried a pending-ALL_WRITABLE_COLUMNS
  caveat when they were added, these three write for real on promotion
  (all three columns went onto the allow-list earlier in the same round).
- **`ValueDate` goes through `excelSerialFromISODate()` and `isDateCol()`**
  like every other date in this layer, never as a raw string — that column
  has prior history of being corrupted by ISO/Zulu text pasted straight in.
- **An untouched Value/ValueDate is omitted entirely** rather than written
  as 0 or a bogus serial (same rule Cost/Shipping/PurchaseDate follow);
  ValueSource writes `""`, a real clearable value, like the other string
  columns.
- Cleared by `resetAddCoinForm()` and restored by `applyCoinDraftToForm()`,
  so a plain re-entry starts clean and a Staging-draft edit round-trips.

**Verified headless — `tests/verify_retest_batch2.js` grew to 83
assertions; 867 across 21 suites, zero failures.** Item 5's block was
rewritten from pinning the old behaviour to asserting the fix: no append
when a blank exists, the first blank claimed, a tripwire failure leaving
the sheet completely unchanged, a blank-keyed-but-populated row skipped
with its data intact, formula-only rows still counting as blank, the
append fallback still working when the table is full, and two concurrent
creations claiming different rows. **Four negative controls, each confirmed
to fail exactly its own assertions**: append-before-checks restored (I1/I2/
I6), the whole-row guard removed (I8), the creation lock removed (I14, via
the predicted clobber), and the Add Coin value mapping removed (K7/K8/K10/
K14).
- **Not verified: any real device, any real OneDrive session.** This is a
  change to the row-creation write path and wants a live `_Testing` run
  before it is trusted — in particular confirming that a new coin now lands
  around row 558 rather than 1545.


### Three confirmed bugs from Ray's Add Coin → Promote → Catalog/Ledger live-device test (BUILT and merged to main)
**Merge status correction:** this section previously read "held on branch
`claude/code-primer-u8uv1d`, live-device testing required before merge, per
Ray's own explicit instruction for Fix 2 and Fix 3." Ray ran that live pass
himself — confirmed working — and gave explicit merge go-ahead ("all was
tested and good"). The branch was merged to `main` (fast-forward, no
conflicts) with the full 1723-assertion suite re-run clean on the merged
tree. **`main` is now the source of truth for all three fixes**, same
standing as every other merged-after-holding branch in this file.

Three separate, unrelated fixes reported together from one live pass.

**FIX 1 — stale banner wording.** `addCoinInterimBanner`/`stagingInterimBanner`
still said "Copilot reconciliation moves the row across" — true when the
banner was first written, no longer true once the real in-app Promote path
(`promoteCoinDraftToAllSheet()` and friends, see "Phase 2 promote:
duplicate-row bug" above) landed. Reworded both banners: dropped the
Copilot claim and the stale "(Phase 1)"/"Phase 2's direct-write path lands"
numbered-phase framing (Phase 2 already shipped), and now say plainly that
a real in-app Promote step (offered on Staging Review and the Docket once
a draft's CoinID resolves) is what moves the draft into All — no Copilot
step required. **Kept, verbatim in spirit**: Add Coin's own banner still
states that `Save to Database` writes to the same Staging draft on OneDrive
as `Save to Staging` — that claim was and still is true, and removing it
was explicitly out of scope. Text-only change; no behavior touched.

**FIX 2 — FaceValue never written on promotion (real bug, root cause of the
$0.00 Value symptom).** `coinDraftToAllValues()` — the function that maps a
Staging draft's fields onto the row written to All when a coin is Promoted
— never included `FaceValue` in its output at all; it was simply absent
from the mapping. Since `valueWithFaceFloor()` (the Value-floor feature,
see "Splash: close Docket badge gap; Value floored at face value") depends
entirely on `All.FaceValue` being populated to have anything to floor
against, every newly-promoted coin silently got no floor and could display
$0.00 instead of at least its own denomination's real legal-tender value.
- **No numeric face-value column exists anywhere in the workbook to read
  from** — checked directly, not assumed: neither `Lookup_Denominations`
  nor `Lookup_DenomCodes` carries a dollar-amount column. So this needed a
  small, explicit, hardcoded mapping (`DENOM_CODE_FACE_VALUE` +
  `faceValueForDenomCode()`) from denomination CODE to real dollar value,
  cross-checked against this file's own `DENOM_CODE_INFO`/
  `BULLION_TIER_OPTIONS` (the actual codes this app generates, already
  confirmed against the real `Lookup_DenomCodes` table by the
  workbook-alignment batch — `H1C`/`H10C`/`3CS`/`3CN` in particular).
- **Table-first, not regex-first — deliberately, to avoid the exact trap
  the task named.** A blind numeric-extraction regex over every code would
  wrongly pull `1` out of `H1C` or `3` out of `3CS`; the fixed sub-dollar
  codes (`H1C`=0.005, `1C`=0.01, `2C`=0.02, `3CS`=0.03, `3CN`=0.03,
  `H10C`=0.05 — its own historical denomination, not half of `10C`,
  `5C`=0.05, `10C`=0.10, `20C`=0.20, `25C`=0.25, `50C`=0.50) are matched
  against an explicit table FIRST; only a code genuinely SHAPED like a
  dollar amount (`/^\$\d+(\.\d+)?$/`) falls through to being parsed
  directly as its own face value — `$1`, `$2.5`, `$3`, `$5`, `$10`, `$20`,
  `$25`, `$50`, `$100`, and any future `$N` code, covering the classic gold
  and modern bullion tiers at once with no per-code table entry (a bullion
  pick's own `denom` is already the real plain face value, per
  `BULLION_TIER_OPTIONS`'s design — so a Silver Eagle picked via the
  Bullion toggle correctly gets `FaceValue=1`, a $50 Gold Eagle gets
  `FaceValue=50`, distinct from its market value, exactly the distinction
  the floor feature exists to protect).
- **`5oz` and `Medal`** (the two `DENOM_CODE_INFO` codes with no real
  face value) resolve to `null` — `5oz` isn't a face value at all, `Medal`
  has none — same "nothing to floor against" fallback `valueWithFaceFloor()`
  already handles gracefully. Checked every code currently in
  `DENOM_CODE_INFO`/`BULLION_TIER_OPTIONS` against the reference table;
  nothing uncovered was found, so there was nothing to check with Ray.
- **`FaceValue` added to `ALL_WRITABLE_COLUMNS`** (same treatment as
  Category/Finish/Error before it — allow-listed so the promotion write
  isn't silently dropped, but there's no Browse Edit UI input for it
  either; it's derived at promotion time, never hand-typed). Not on
  `ALL_NEVER_WRITE_COLUMNS` — it's a plain column, not a live formula.

**FIX 3 — Catalog (and, once audited, several other surfaces) never
excluded exited coins.** Confirmed: `EXIT_STATUSES`/`isExitStatus()` were
already used correctly by Ledger's own Exit History and coin search, but
nothing else in the app checked Status at all — a Sold/Gifted/Returned/
Spent coin displayed in Catalog exactly like an owned one, and the same
gap turned out to exist independently everywhere else "the current
collection" is treated as a list/grid.
- **One new shared helper, `ownedCoins()`** (`activeCoins()` filtered to
  `!isExitStatus(c.status)`), placed right next to `EXIT_STATUSES`/
  `isExitStatus()` since it's their direct consumer. `activeCoins()` itself
  is completely untouched — it stays the raw, unfiltered source, since
  Ledger's own Exit History and every direct single-coin CollectionID
  lookup still need every row, exit-status included.
- **Audited every real `activeCoins()` call site in the file** (not
  guessed at) and swapped each LIST/GRID "current collection" consumer to
  `ownedCoins()`: `coinsTabBaseRows()`/`medalTabBaseRows()` (Catalog),
  `applySetsTabFilters()`'s list-mode branch and `ownedSetForSetId()` (Sets
  — the latter also closes the completeness checklist's own "owned" tile,
  which would otherwise have lit up for a Gifted Set bundle),
  `applyRollsTabFilters()` (Rolls), `renderStats()` (Stats — `all` stays
  raw for Exit History, a new `owned` derived variable feeds every total/
  breakdown figure and the item count), `spotlightCoinList()` (Spotlight —
  filtered at the `pool` stage rather than swapping in `ownedCoins()`'s own
  return value, since that function's caching is deliberately keyed to
  `activeCoins()`'s own source-array identity and `ownedCoins()` always
  returns a fresh array that would defeat the cache), and
  `renderLedgerCoinSearch()` (Search — was already independently filtering
  with `!isExitStatus`, simplified to read through the new shared helper
  instead of duplicating the check).
- **Left deliberately untouched, per the task's own explicit boundary**:
  `renderLedgerExitHistory()` (still reads the raw, unfiltered `all` —
  it specifically wants exited coins); every direct single-coin
  CollectionID lookup (`legacyStoredRowsFor` *(removed, alignment Build 1)*, `photoCommitTargetId`,
  the album filled-slot tap, `applyDocketResolution`, etc. — all still
  read `activeCoins()` raw, so a coin that's left the collection is still
  individually viewable, e.g. tapped into directly from Exit History);
  `setChildrenFor()`/`resolveChildParentSet()`/`resolveCoinSetLink()` *(removed Oct 2026)* (a
  Set's own child-linkage resolution — not named in the task, and genuinely
  different in kind from a general browsing list); and the Docket's own
  "Other / Requires Photos" missing-photo audit (also not named in the
  task — left alone rather than assumed in scope).

**Verified headless — new committed suite
`tests/verify_promote_catalog_fixes.js` (59 assertions), all passing.**
Covers: both banners' actual text (the Copilot claim and stale phase
framing gone, the still-true Save-to-Database/Save-to-Staging claim
intact, both mentioning Promote); `faceValueForDenomCode()` against every
value in the task's own reference table plus the `$N` bullion codes,
`5oz`/`Medal`/blank/unknown all resolving to `null`, and a direct negative
control proving a naive numeric-extraction regex WOULD get the prefixed/
suffixed codes wrong (confirming the table-first approach is load-bearing);
`coinDraftToAllValues()` actually carrying `FaceValue` for a classic coin,
a bullion pick (Silver Eagle sharing `$1` with an ordinary Dollar, a $50
Gold Eagle), and correctly omitting the key entirely for an unmatched
code; `ALL_WRITABLE_COLUMNS`/`ALL_NEVER_WRITE_COLUMNS` membership; a full
end-to-end Promote through the mock Graph client writing `FaceValue=0.01`
for a real low-value Cent draft and `valueWithFaceFloor()` then correctly
showing `$0.01` instead of `$0.00` — **with a negative control** that
strips `FaceValue` from the mapping (reproducing the old code exactly) and
confirms the identical scenario leaves the cell blank and the display at
the unfloored `$0`; `ownedCoins()` excluding all four exit statuses while
keeping Owned/blank/`"At PCGS"`; Catalog's Coins and Medal base rows,
Rolls' base set, Sets' list mode, and `ownedSetForSetId()` each excluding
an exit-status row end-to-end through the real render path (not just the
underlying filter functions in isolation, for Rolls/Sets); Stats'
totals/item-count excluding a Sold coin's value while Exit History still
shows it; Ledger's own coin search excluding a Returned coin with an
otherwise-identical name; Spotlight never surfacing a Sold coin even when
doing so would complete a valid 5-of-6 selection — **with a negative
control** reverting the pool filter to its pre-fix shape and confirming
the Sold coin becomes eligible again; and a direct-lookup sanity check
that `activeCoins()` itself still resolves an exited coin's full record
unfiltered. One pre-existing suite (`verify_sets_list_year.js`) needed
updating, not weakening — its own source-text assertion literally matched
the old `activeCoins().filter(...)` pattern in the Sets list-mode branch;
updated to match the new `ownedCoins().filter(...)` pattern plus a new
assertion confirming `ownedCoins()` itself still wraps `activeCoins()`, so
the underlying "live coins when loaded, demo fallback otherwise" guarantee
that suite cares about is unaffected. Full `npm test` regression re-run
clean: 1691 assertions across all 40 suites, zero failures, zero page
errors.
- **Not verified: any real device, any real OneDrive session** — per the
  task's own explicit instruction, Fix 2 and Fix 3 both need a live pass
  before merge: confirm a freshly promoted low-value coin shows its real
  face value (not $0.00), and confirm a coin marked Returned disappears
  from Catalog/Stats/Spotlight while still showing correctly in Ledger's
  Exit History and still openable directly. Held on
  `claude/code-primer-u8uv1d`, not merged to `main`, until that pass comes
  back clean.
- **Open question for Ray, not guessed at**: the exact `All` column name
  for FaceValue is `FaceValue` — this matches the read side's own existing
  `colVal(row, "FaceValue")` (built in an earlier round, itself flagged as
  "not independently confirmed against the real workbook from this
  environment"). This fix assumes that column name is correct; if the live
  pass shows FaceValue not landing/reading correctly, check the real
  column name first before assuming the mapping logic is wrong.


