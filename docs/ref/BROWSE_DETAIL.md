# Reference: BROWSE_DETAIL (moved out of CLAUDE.md)

Read this file when: touching the Browse detail page, the Edit Coin / Edit Set layout, Overview and accordions, Spotlight, Specifications, sharing, Set child linkage, or the Value floor and formatCurrency.
Back to [CLAUDE.md](../../CLAUDE.md). Line numbers in this file's pointers refer to CLAUDE.md as it was at commit `21bcd95`, before it was slimmed (see [docs/INDEX.md](../INDEX.md)).

### Browse detail: Fun Fact now live-DB_Coins-sourced (BUILT, merged to main)
Browse detail's read-only Fun Fact display (`renderDetailAccordions()`'s
Notes & Facts section) previously read only `FAKE_COIN_DETAILS[coin.id]
.funFact` — a sparse mockup lookup by CollectionID that never consulted
DB_Coins, unlike Edit Coin's own Fun Fact display (`catalogFunFactFor()`,
see "Browse Edit real write layer" → field mapping decisions above), which
could show a *different* value for the same coin. Now both call the exact
same `catalogFunFactFor(coin)` — the live DB_Coins soft-match (Denom+Year+
Mint+Variety, softly narrowed by Finish when ambiguous), falling back to
`FAKE_COIN_DETAILS` only when no DB_Coins match is found. Safe for a
Set-bundle row too: `catalogFunFactFor()`'s underlying `findDbCoinsMatch()`
requires denom+year and never matches `Denomination="Multiple"` against any
real DB_Coins row, so a Set degrades to the same `FAKE_COIN_DETAILS`
fallback it already used — verified directly, no throw. Display/read-only
change only; nothing about DB_Coins matching itself, CoinID re-linking, or
the write layer was touched.


### Browse Edit save toast: field count excludes admin-only columns (BUILT, merged to main)
The "Saved AY-##### to the workbook (N fields updated)" toast was counting
`LastModified` and `Reviewed` toward N even though `saveCoinRowToWorkbook()`
writes both **unconditionally on every successful save**, regardless of
what the user actually edited (`Reviewed` is blanked every save since an
app-written row is by definition unreviewed; `LastModified` is stamped every
save) — so a one-field edit (e.g. Grade only) reported "3 fields updated,"
and a genuine no-change save (Ray hits Save without editing anything) still
reported "2 fields updated," both overstating what actually changed.
- **New `ADMIN_ONLY_SAVE_FIELDS = ["LastModified", "Reviewed"]`** — traced
  directly against `saveCoinRowToWorkbook()`'s own code, not guessed: these
  two are the *only* fields ever added to its `changed` object outside the
  genuine fresh-vs-next diff loop. CoinID re-linking (`writeCoinIdCell()`,
  fired only when Year/MintMark/Denomination/Variety actually changed) is a
  separate write entirely — it bypasses `buildRowCellEdits()`/
  `ALL_WRITABLE_COLUMNS` and was already never counted in `result.written`,
  so it needed no listing here and required no change.
- **Display-only fix, scoped to the toast's count alone** — `result.written`
  itself (the real, complete list of columns actually patched) is
  untouched, and so is every actual write. `performBrowseEditWrite()` now
  filters `ADMIN_ONLY_SAVE_FIELDS` out of `result.written` only when
  computing the toast's displayed count. A genuine no-change save now
  honestly reports "(0 fields updated)" instead of the old misleading
  "(2 fields updated)" — a truthful count was judged better than a
  special-cased "nothing changed" message, since 0 is itself accurate.
- No changes to write-layer conflict detection, CoinID matching, or DB_Coins
  schema, per the explicit scope boundary for this task.

**First round, merged as part of the whole feature (see the merge-status
correction at the top of this section)** — all five items above
(Variety/Designation on the flip corners, the hairline root-cause fix, Fun
Fact's live sourcing, the CollectionID display, and the toast field-count
fix) landed together on `claude/browse-detail-flip-card-updates`. Verified
headless (Playwright, scratchpad scripts — not committed, same convention
as the rest of this project's regression history): Designation/Grade
concatenation and its blank-field edge cases on both Spotlight and Browse
detail; Variety as a second TL line including the Roll and blank-Variety
cases; the muntin-bar `z-index:-1` fix confirmed via computed style and a
clean pixel scan across the coin's full width; Fun Fact's
live-match-wins-over-fallback behavior and the no-throw Set-bundle case; the
CollectionID display's text/centering/font-weight/position for both a coin
and a Set; and the toast's field count for both a one-field save and a
genuine no-change save. All 11 prior regression suites (653 assertions)
re-run clean alongside the 19 new assertions across the two new scripts.

**Second round, same branch, merged together with the first — 2 more items
from Ray's stage.html round.**
- **Header row layout: Share/CollectionID/Edit consolidated onto one row.**
  Previously scattered across three separate spots — Share floated next to
  the title above the flip card; CollectionID (added earlier this branch)
  rendered as its own centered block above the Overview accordion; Edit sat
  alone, right-aligned, in the row directly below the flip card. Ray's
  explicit ask: move CollectionID up to share Edit's row, with Share
  relocated there too — far left, CollectionID centered in the middle, Edit
  far right, all on one row. The title (`#browseDetailName`) is now alone on
  its own line, no longer paired with Share.
  - **`#browseDetailCollectionId` is now static markup** (a `<span>` inside
    the action row), not an element `renderDetailAccordions()` builds and
    prepends into `#detailAccordions` on every render — it lives outside
    that container now (which the function still clears/rebuilds every
    call), so building it the old way would have gotten it wiped
    immediately. `renderDetailAccordions()` now just sets its `textContent`.
  - **Centering a middle item between two differently-sized buttons
    (a bare icon vs. an icon+label) needs `flex:1` on the middle item, not
    `justify-content:space-between`** — the latter only centers a middle
    child when flanked by equal-width siblings, which Share/Edit aren't.
    `.detail-collectionid`'s CSS was updated accordingly (`flex:1` added,
    the old block-context `margin` removed as no longer relevant inline).
  - Applies identically to Set-bundle rows (verified) — same shared header
    markup this whole page already uses for both record types.
- **"Medal" duplication on the flip card's top-right corner — root-caused,
  not guess-patched, per this pass's explicit instruction.** Confirmed via
  live reproduction before touching anything: `DENOM_NAME_SUFFIXES` (the
  list `seriesLabel()` strips a trailing denomination WORD from — "Mercury
  Dime" → "Mercury", so the top line doesn't repeat the coded denomination
  line below it) never included `"Medal"`. Every other denomination's own
  coded value (`1C`, `5C`, `10C`, `25C`, `50C`, `$1`) is a different string
  from its spelled-out word, so an unstripped name never visually collided
  with the code line — but Medal's own `denom` value IS the literal word
  `"Medal"`, and this collection's medals are named `"{Description} Medal"`
  (`AY-00015` "Lincoln Bicentennial Medal", `AY-00016` "US Mint Inaugural
  Medal"), so the unstripped top line repeated the bottom line verbatim.
  **A second layer compounded it**, confirmed live: the corner's own
  last-word-shortening overflow fallback (`renderTypeDenomCorner`, meant for
  an overlong series name) then collapsed the too-long unstripped top line
  down to ITS OWN last word — which, for an unstripped medal name, is
  always `"Medal"` too — producing an even more literal `"Medal"` /
  `"Medal"` than the plain unstripped two-line overflow alone would have.
  Fixed by adding `"Medal"` to `DENOM_NAME_SUFFIXES` — resolves both layers
  at once: the type line becomes `"Lincoln Bicentennial"` (shorter, usually
  fits without the fallback ever triggering), and even if a future medal's
  name still needs shortening, the fallback then picks THAT string's own
  last word, never `"Medal"` again, since `"Medal"` is no longer part of
  what's being measured/shortened. One-line, single-source-of-truth fix —
  `seriesLabel()`/`renderTypeDenomCorner()` are shared by Spotlight, Browse
  detail, AND Browse's grid-mini cards, so this is fixed everywhere at once,
  not per-surface. Rolls were never at risk (`applyFlipCorners()` already
  skips `renderTypeDenomCorner()` entirely for a Roll, denom-code-only).
- Verified headless (14 new assertions): Share/CollectionID/Edit render on
  one row in the correct left-to-right order for both a coin and a Set-bundle
  row, the old CollectionID block is gone from `#detailAccordions`, the title
  is immediately followed by the flip-frame (confirming Share was actually
  relocated, not just visually coincidental), Share's click handler still
  fires after the move, `seriesLabel()` now strips "Medal" for both demo
  medals while an ordinary coin's own suffix-stripping (`"Dollar"`) is
  unaffected, both medals' TR corner shows `"Medal"` exactly once (checked
  by counting corner-line elements, not just eyeballing text), and the fix
  applies identically on Spotlight (the other `applyFlipCorners()`
  consumer). One prior suite (`verify_funfact_and_toast.js`) had 3
  assertions following the CollectionID element's real relocation (querying
  `#browseDetailCollectionId` instead of the old
  `#detailAccordions .detail-collectionid`) — updated to match the design
  change, not weakened. All prior suites re-run clean alongside these.
- **Both rounds confirmed by Ray on `stage.html`** (the temporary-swap
  live-testing pattern this project uses for `app.html` builds — see "Real
  Graph API reads" and the Add Set write layer's own live-run notes above
  for the same convention) — this is what closes the "not verified: any
  real device" gap every earlier headless-only pass in this section
  carried. Full regression suite (685 assertions across 14 suites) re-run
  clean immediately before the merge, per Ray's explicit instruction.


### Detail/Edit accordion redesign (BUILT and merged to main)
Browse detail (Coin AND Set) and Edit Coin / Edit Set are now one unified
accordion structure. Detail is **flip card + Edit button + accordions only** —
every bare key-facts row that used to float above the fold is gone, folded
into a section. Coin and Set pages are structurally identical wherever a
section applies to both, and each Edit form mirrors that record's own detail
page section-for-section. **UI/structure only — no OneDrive write layer was
added** (see the Save note below).

**Locked section order (`RECORD_SECTIONS`, one constant both sides read so
they can't drift):**
- Coin: `Overview, Photos, Specifications, Notes & Facts, Purchase Details, Storage`
- Set: `Overview, Photos, Coins in this Set, Notes & Facts, Purchase Details, Storage`

Position 3 is the only difference — Specifications is coin-only (a bundle has
no single composition/weight/diameter), Coins in this Set is Set-only.
**Overview defaults OPEN, everything else collapsed** — with the key facts
moved inside it, an all-collapsed page would show nothing but the flip card.

- **New Overview accordion** carries what used to be bare rows plus the
  identity fields: Year(+MintMark), Denomination, Variety, Grade, Designation
  (coin) / Year, Description (Set); Cert + link; **Value** (moved here — see
  below); and the "Belongs to" linkage chips.
- **Value moved out of the old key-facts area into Overview** for both Coin
  and Set. **Purchase Details is NOT renamed** and stays scoped purely to the
  transaction (Cost, Shipping, Seller, Purchase Date, Receipt).
- **All three linkage chips moved into Overview together** — Album
  (`resolveCoinAlbumLink`), Set-by-`setId` (`resolveCoinSetLink` *(removed Oct 2026)*), and
  parent-Set-by-`originSetId` (`resolveChildParentSet`). *(Now two: the
  Set-by-SetID chip is removed; see "Belongs to: Set membership from OriginSetID only".)* `renderDetailLinkage()`
  became `renderLinkageChipsInto(hostEl, coin)` (retargetable, returns a chip
  count) so detail and both Edit forms render the identical chips.
- **Album chip gained a slot sub-line.** `resolveCoinAlbumLink()` now also
  returns the MATCHED SLOT, so the chip shows e.g. `1909 slot` as small text
  under the album name. Deliberately keeps the existing two-line pill visual
  rather than switching to a different literal label format. **First match
  wins, one chip** — a coin can legitimately fill more than one slot (demo:
  `AY-00004` fills two Lincoln Cents slots); resolving multi-slot membership
  properly is explicitly out of scope for this pass.
- **GradeSource display bug fixed.** GradeSource has been set-able via Edit
  Coin for a long time but was never displayed anywhere on a saved coin (the
  flip corner shows `coin.grade` alone; the combined format only existed on
  Add Coin's live-entry preview). Overview now shows `MS-64 (PCGS)` via
  `gradeWithSourceText()`.
- **Child mini-flip grid + its shared Obverse/Reverse toggle are RETIRED**
  (Ray's explicit confirmation). A multi-child Set used to hide its own flip
  card and render a grid of child mini-flips in its place; now every Set shows
  the same single generic "Multiple" flip a childless Set always did. That's
  what makes Coin and Set structurally identical. `renderSetChildFlips()`,
  `setChildrenSide`, `setChildSideUI`, `applyBrowseDetailChildSide()` and the
  toggle markup are all gone. `setChildrenFor()` is very much still used — it
  feeds the new accordion.
- **New "Coins in this Set" accordion (Set only)** — identity list ONLY: name,
  identity (`year-mint · denom · variety`), grade, value. **Explicitly no
  photos at this level**; a child's photos are reachable only by drilling into
  that child's own detail page. Tapping a row opens the child's detail view
  with Back returning to the parent Set (the same per-origin back-handler
  pattern the retired flip cards used). `buildSetChildRow()` is shared by
  detail and Edit Set so the two lists are literally the same code.
  - **This supersedes and REMOVES the narrower "Coins in this Set" row that
    used to live inside Edit Set's Photos section** (which drilled straight
    into a child's Manage Photos). `renderManagePhotosInto()` gained a
    `showSetChildren` option, and Edit Set passes `false` — one path to a
    child, not two. **The STANDALONE Manage Photos screen (In Progress Sets /
    Docket entry points) still shows that row and is unaffected** — it's the
    default.
  - Consequence: **`returnToEditSetView()` is now dead and was removed.** It
    existed only so the Edit-Set→child-photos→back round trip could preserve
    unsaved form state; that path no longer exists (the new accordion
    navigates away to a detail page instead). `onReturnHere` itself stays —
    the standalone screen's own wrapper still uses it.
- **Specifications stays READ-ONLY even inside Edit Coin** — catalog-derived
  facts about the coin TYPE, not this specimen. Zero edit inputs, asserted.
  **Rolls now get the Specifications section too**: Composition used to be
  promoted to an always-visible key fact for Rolls only (melt value hinges on
  it) and that bare row is gone, so skipping the section would have silently
  lost the field. A roll's other spec fields simply have no data and hide
  themselves.
- **Set Details facts (coin count, face value, mintage) folded into Notes &
  Facts** rather than staying a separate accordion — the locked order has no
  separate Set Details entry.

**Field editability — closing the parity gap (Edit Coin):** Year, MintMark,
Denomination, Description, Variety (none of which had ANY edit surface before
— they only ever appeared on flip corners), Value, Cost, Shipping,
Seller/Vendor, Purchase Date. Edit Set additionally gained editable **Year and
Description** so both Overviews have editable identity fields (Ray's call on
the parallelism question).
- Denomination dropdown = the six standard codes + `Medal`, excluding
  `Multiple` (a `Multiple` row is a Set bundle and routes to Edit Set, so it
  can never be the value there).
- MintMark reuses Add Coin's existing dropdown options.
- **Variety is a plain text input** — deliberately NOT Add Coin's
  context-filtered dropdown, whose filtering exists to drive entry-time
  confidence/Staging routing that has no meaning for an already-saved coin.
- **No Description auto-fill in Edit Coin** — Add Coin auto-fills from
  Year+Denomination; doing that here would silently overwrite a curated
  Description on an existing catalogued coin.
- Year is a plain input (no decade drill-down picker).
- Read-only by design, no inputs added: Specifications fields, Album/Set
  linkage chips, Error (entry-time only, never persisted), Category (Sets-tab
  grid card only).
- **Notes / Fun Fact — superseded by the addendum below: they ARE editable
  now.** They were left read-only in the first pass because they appeared on
  neither the editability list nor the read-only list; Ray confirmed
  afterwards.

**Save is still a stub, but now a SESSION-ONLY one (Ray's explicit call).**
`applyEditsToRecord()` writes the edited values onto the in-memory
`FAKE_COINS` row and `FAKE_COIN_DETAILS` entry (created on demand), then
returns to the detail page so the edit round-trips visibly. **Zero OneDrive
writes; everything resets on reload** — the same posture the crop tool's
session-only blob URLs already have. This exists specifically so a real-device
review isn't testing against something that looks broken by design (edit,
save, go back, see the old value). Field homes follow the existing split
exactly: identity/grade/value/cost/storage on the row itself,
shippingCost/vendor/purchaseDate in `FAKE_COIN_DETAILS`. `numOrUndefined()`
keeps a blanked numeric field from writing `NaN` over a good value. The
Designation re-resolution check is unchanged — an ambiguous DB_Coins match
still surfaces the shared "pick one" list rather than auto-resolving.

**Edit forms are STATIC markup, not JS-generated.** Their accordion shells and
fields live in HTML so the complex widgets (grade dropdown + Other, cert badge
+ link button, grading-help, designation ambiguous panel, the Manage-Photos
host, the Receipt pill) keep stable IDs and stay wired once at init rather
than being rebuilt per render. Structural parity with detail is guaranteed by
both sides reading `RECORD_SECTIONS`, and by the read-only sections
(Specifications, Notes & Facts, Coins in this Set) rendering through the same
shared helpers detail uses (`specificationRows()`, `notesAndFactsHtml()`,
`buildSetChildRow()`, `detailRowsHtml()`). `wireStaticAccordionToggle()`
(added by the Aug 9 receipt work) now wires every section accordion in both
forms.

**Naming cleanup (Add Coin):** "Purchase Info" → "Purchase Details" (matching
the accordion name), "Storage & Album" → "Storage". **Rename only** — every
field including Assign to Album and Additional photo stays exactly as it was;
no functional removal. Browse/Edit's "Location" → "Storage" is the same
accordion rename covered above.
**Resolved (merged directly to main): Wishlist and Add Set followed.** The gap
flagged here — those two still saying "Purchase Info," inconsistent with Add
Coin/Browse/Edit — was a real follow-up, not left open. Same rename, same
"label only" boundary: Wishlist's detail-view row, its Purchase drill-down
heading, and its save-toast wording; Add Set's Step 1 row and its own
Purchase drill-down heading. Every element id (`wishlistPurchaseRow`,
`addSetPurchaseInfoRow`/`addSetPurchaseInfoSummary`/`addSetPurchaseView`, etc.)
is untouched — confirmed via headless assertion, not just by construction —
and no field/behavior changed. Two pre-existing, general (not Wishlist/Add-
Set-specific) code comments describing the old pre-accordion-redesign Browse
detail panel and the `FAKE_COIN_DETAILS` lookup still say "Purchase Info" —
left alone as out of this rename's scope (comments, not a rendered label);
harmless if a future session updates them in passing. Verified headless (12
new assertions) plus all 7 prior suites re-run clean alongside it — 256
assertions total, zero failures.

**Two real bugs found and fixed during this build** (neither pre-existing
behavior anyone had hit):
- **`class="hidden"` on a plain div does nothing in this file.** There is NO
  global `.hidden` rule — every `.hidden` is scoped to its own component
  (`.detail-row.hidden`, `.accordion-body.hidden`, …). The new Belongs-to
  wrapper in both Edit forms relied on a bare `class="hidden"` and so rendered
  an empty "BELONGS TO" heading on any record with no linkage. Caught in a
  screenshot, fixed with a scoped `.edit-linkage-wrap.hidden` rule, and a
  regression assertion added. **Worth remembering for any future
  hide-by-class work in this file.**
- **`.detail-row` had no `gap`**, which only became visible once Overview
  started carrying genuinely long values (a Set's Description is a full
  product name) — the wrapping value butted straight against its own label.
  Added `gap: 12px`, `flex-shrink: 0` on the label and right-aligned the
  value. Verified at 12px with no page overflow.

**Verified headless — 150 assertions, all passing, zero page/console errors**
(aside from the pre-existing MSAL jsdelivr CDN block this sandbox always
shows). New suite `verify_accordion_redesign.js` runs its 50 assertions at
BOTH required viewports (412×915 phone, 1024×768 tablet) = 100, covering:
exact section order for all four screens; every bare key-facts row and the
linkage block gone from the DOM; Overview open / rest collapsed on both detail
and Edit; Overview carrying Value/Cert/Denomination and `MS-64 (PCGS)`; the
album chip's slot sub-line; child grid + side toggle gone with the single flip
card shown instead; Coins-in-this-Set showing 3 identity rows with zero
discs/flip-frames and real grade+value, drilling through to a child and Back
returning to the parent; every new Edit Coin field present and correctly
prefilled from both data sources; the Denomination option set; Specifications
having zero inputs inside Edit; linkage chips read-only in Edit AND genuinely
hidden when absent; a real save round-tripping onto the detail page; Edit Set's
Year/Description prefill; the old Coins-in-this-Set row gone from Edit Set's
Photos while the standalone screen keeps it; the Add Coin renames with Assign
to Album still intact; and no horizontal overflow. The four prior suites
(50 assertions) re-run clean alongside it — two needed updating to follow real
renames ("Additional Photos" → "Photos"; the superseded Edit-Set
photos-drill-down round trip), not weakening.
**Not verified: any real device.** Headless Chromium at the two required
viewport sizes is not Samsung Internet — that's the pass being held for.

**Merge status correction: merged to main via PR #2, without the real-device
sign-off this branch was explicitly being held for.** This section originally
read "held, NOT merged, awaiting Ray's real-device sign-off" — that was the
plan, but isn't what happened. `git push` prints GitHub's standard
create-a-PR link on every new-branch push regardless of intent; Ray opened
that link and merged the resulting PR directly on GitHub before any Samsung
Internet pass on this specific branch (unlike the photo-gallery-crop and
photo-consolidation branches before it, both of which were confirmed
device-tested first). Not something Claude Code did — no PR was opened or
merged from this session. Content-verified live on `main` (`RECORD_SECTIONS`
present, syntax-clean); nothing else about the build below needed correcting,
only this status line. A real-device check is still worth doing now, after
the fact, if it hasn't happened separately.

**Addendum (same branch as originally built, now folded into the main-branch
history above) — 2 items.**

**1. Notes & Fun Fact are now editable** in both Edit Coin and Edit Set,
inside the Notes & Facts accordion (read-only in the first pass was a
placeholder pending this decision, now confirmed). Both are `<textarea>`s
prefilled from `FAKE_COIN_DETAILS` and written back by the same session-only
in-memory Save the rest of this pass uses — no OneDrive write.
**Partly superseded by the Browse Edit write layer**: in EDIT COIN, Fun Fact
is now read-only (it's DB_Coins catalog data about the coin type, with no
All-sheet column to write to) and Notes maps to `All.Remarks`. Edit Set is
unchanged — both are still editable textareas there, still session-only,
pending its own write layer.
- **The Set-level facts group stays READ-ONLY** above the two textareas on
  Edit Set (Coins in Set is derived from the linked children; Face Value and
  Mintage are catalog figures — none of them specimen data). Extracted into
  `setDetailsFactsRows()` so the detail page and Edit Set's own facts block
  render identical rows.
- `notesAndFactsHtml()` still exists and is still what the DETAIL page uses;
  only the Edit side switched to real inputs.

**2. A Set's flip card now shows its own whole-set / OGP photo** instead of
the generic gold "Multiple" placeholder, falling back to the placeholder only
when no such photo exists.
- **Answering the "already wired or genuinely missing?" question directly:
  genuinely missing, but with a half-built foundation.** `galleryFlipEntry(
  collectionId, side)` already existed — written during the Aug 8 photo
  taxonomy build as future-facing infrastructure for the COIN case
  (obverse/reverse) — with **zero call sites**, so nothing could ever trigger
  it. For the SET case (whole-set/OGP) there was no helper and no wiring at
  all. `applyDiscContent()` only ever consulted the series reference-image
  lookup and then fell through to the year-text placeholder; `circleUrl` (the
  framed circle a capture produces) was only ever read by the Edit form's own
  slot preview, never by a flip card.
- **New `setFlipPhotoUrl(coin, side)`**, wired as tier 0 in
  `applyDiscContent()`: whole-set pair first (the set itself as received),
  then the OGP pair (its packaging exterior), then the existing behavior.
  Side-aware — obverse and reverse each look for their own half of the pair.
- **Only the IMPLICIT DEFAULT sub-group counts as "the whole set."** A named
  sub-group is one sealed pack inside the set (Philadelphia, Denver…), not
  the set, and must never stand in for the whole thing — asserted.
- **Gated on a real `url`.** The `FAKE_GALLERIES` seed uses `url: null` to
  mean "a real file would be here," which has nothing displayable, so seeded
  entries correctly fall through to the placeholder rather than painting a
  broken image. This is why `AY-00022` — which *has* ogp + whole-set entries
  — still shows the placeholder in the demo.
- **New `applyDiscOwnPhoto()` rather than reusing `applyRealReferenceImage()`**:
  the latter adds the `.reference-image` class (muted/dashed treatment) and a
  tooltip saying it is explicitly NOT a photo of this coin — both wrong for
  the record's own captured photo.
- **Applies to ALL Set rows, not just multi-child ones.** The request named
  the multi-child case (that's the one whose flip card just changed), but the
  same rule is obviously right for a childless Set with a photo, and scoping
  it to child-count would have been arbitrary. Flagged as a deliberate call.
- **Individual coins were deliberately NOT routed through this at the time**
  — that's `galleryFlipEntry()`'s territory, left unwired here since wiring
  it meant deciding whether a coin's own captured photo outranks its series
  reference image, a decision nobody had made yet. Asserted (at the time)
  that a coin's flip card was unchanged by this item. **Superseded by the
  coin-level flip photo priority follow-up below** — that decision has since
  been made (yes) and `galleryFlipEntry()` is now wired the same way.
- **`AY-00025` ("2026 Best-of-Mint 5-Coin Proof Set") state, since it was
  named as the record to verify against: it has NO gallery entries at all** —
  it isn't in `FAKE_GALLERIES`. So it correctly shows the placeholder until a
  photo is actually captured. To see this work on a device: open it → Edit →
  Photos → Whole set — front & back → capture. The headless suite drives
  exactly that path end-to-end.

**Verified headless — 50 new assertions across both required viewports**
(`verify_addendum.js`, 25 × 2): both textareas real and prefilled in each
form, edits saving in-memory and round-tripping visibly onto the detail page,
Set-level facts staying input-free; and for the flip card — `AY-00025`'s
no-photo baseline, seeded `url:null` entries correctly not counting, a real
capture through the actual Edit Set UI then appearing on the flip card with
the year text cleared, the correct tooltip and no `.reference-image` class,
reverse falling back to the placeholder when only a front exists, OGP used
when there's no whole-set photo, a named sub-group refusing to stand in, and
an individual coin left unaffected. **All 6 suites re-run clean together:
200 assertions, zero failures, zero page/console errors.**

**Follow-up (separate task, committed directly to main): coin-level flip
photo priority wired in too.** The decision the addendum above explicitly
left open — "wiring it would mean deciding whether a coin's own captured
photo outranks its series reference image" — is now made: **yes**, same
priority rule as the Set case. `galleryFlipEntry(coin.id, side)` is now a
new tier 0a in `applyDiscContent()`, ahead of the Set tier (`setFlipPhotoUrl`,
tier 0b) and the series reference-image fallback — the two tiers are
mutually exclusive by construction (`galleryFlipEntry` only ever matches
`"obverse"`/`"reverse"` gallery entries, which a Set row never has), so their
relative order doesn't matter in practice. Uses the same `applyDiscOwnPhoto()`
helper as the Set case, with its own tooltip ("Photo of this coin"). Resolved
independently per side — a coin with a real obverse photo but no reverse yet
still falls through to the reference image (or placeholder) for reverse on
its own.
- **`renderSlotCell()` (Albums' page-flip book) gets the identical priority
  chain**, keyed off the slot's own `filledBy` CollectionID — a filled slot's
  own coin's real photo now wins there too, ahead of the slot's series
  reference-image lookup. This surface is a string-templated render, not a
  live `applyDiscContent()` element reference, so it inherits the same
  "picks up a cache upgrade on next render/reopen, not live" tradeoff the
  reference-image tier already had there — unchanged by this addition.
- **Every other surface a coin's flip renders on (Browse grid, Browse
  detail, Spotlight) already routes through `applyDiscContent()`**, so no
  other call site needed touching — the Set-side multi-child mini-flip grid
  named in the original request no longer exists as its own surface either
  (superseded by the accordion redesign above, which collapsed a multi-child
  Set's display down to its own single flip card + a "Coins in this Set" list
  with no per-child discs at all — that list already shows real grade/value
  text, no photo tier to wire).
- Verified headless (`verify_coin_flip_photo_priority.js`, 17 assertions):
  `galleryFlipEntry`/`applyDiscOwnPhoto` behave as expected in isolation;
  `applyDiscContent()` obverse uses the seeded own photo (no
  `reference-image` class, correct tooltip) while reverse (no own photo
  seeded) does NOT inherit it; Browse grid, Browse detail, and Spotlight all
  show the own photo for the seeded coin; `renderSlotCell()` shows it on a
  filled slot's obverse and not on its un-seeded reverse; and an unrelated
  coin with no gallery entry never picks up another coin's photo. (Reference-
  image-tier assertions from the original addendum's own suite don't
  reproduce here the same way — `ENABLE_REFERENCE_IMAGES` is a hardcoded
  `false` in this environment, same as always, so proving the coin tier
  doesn't clobber the reference-image tier isn't directly testable
  end-to-end here; side-independence — reverse not inheriting obverse's own
  photo — is what's actually verified instead, which is the property this
  task cared about.) `verify_addendum.js`'s own now-superseded "coin
  unaffected" assertion was updated to assert the coin DOES now show its own
  photo, following this real design decision rather than weakening the
  suite. All 9 suites (verify_accordion_redesign, verify_addendum,
  verify_album_grid_overflow, verify_nav_smoke, verify_obverse_capture_adjust,
  verify_photo_consolidation, verify_purchase_details_rename,
  verify_standalone_manage_photos, verify_coin_flip_photo_priority) re-run
  clean together, zero failures, zero page/console errors.
- **Not verified: any real device** — same standing caveat as everything
  else in this feature area (headless Chromium only).

**Second addendum (same branch, now merged along with everything above):
Share repositioned.** Used to be
a standalone pill floating in the top action row above the flip card,
alongside Back. Moved to match Wishlist's own title/Share row layout
(`#view-wishlist`'s grid view — `<h2>` left, Share right, one flex row,
`justify-content: space-between`) — right-aligned next to the record's
title/heading instead of floating separately above the image. Applies to
both Coin and Set detail (one shared header, so one change covers both).
Back stays its own row above, unaffected (`.back-link` is hidden by CSS
regardless — the cabinet-nav chrome's own Back button is what's actually
visible/functional; unrelated pre-existing behavior, not touched here).
**No behavior change** — same `browseDetailShareBtn` id, same click handler,
same `shareContent()` call; markup position only. Verified headless (18
assertions, both viewports): title+Share share one flex row, Share sits
right of the title, Back sits above the row, no horizontal overflow with a
long two-line Set title (`AY-00022`), and Share still fires `shareContent()`
with the coin's info. All 6 prior suites re-run clean alongside it.


### Browse detail view (locked in)
Browse is a grid-then-detail pattern (same shape as Albums): tapping a grid card
opens a full detail view for that coin with the flip-label treatment above, plus
a back link. **Superseded: the standalone cert badge below the flip is gone** —
the cert number moved into the always-visible key-facts block instead (see
below), rather than living in its own pill between the flip and the panel.

A **full detail panel** is the one place all of a coin's data is viewable
(`renderBrowseDetailPanel()`). Structure (Issue 3 — the comprehensive
deep-dive, locked in and built):
- **Always-visible key facts**, one row each, each hiding itself when blank:
  Value, **Cert**, Storage (`setDetailRow()`). Identity is intentionally not
  repeated here — the flip corners already carry Year/Mint/Type. **Cert** is
  the cert number itself, hyperlinked using the coin's own `certLink` field
  directly (a stored URL, All/DB_Coins schema — **never** a URL constructed
  from the cert number the way the old badge did via `buildCertLookupUrl()`)
  when populated, plain text when there's a cert number but no `certLink` on
  file, row hidden entirely with no cert number at all. (NGC's own
  cert-lookup page may bot-check the visitor after the link opens — expected,
  outside the app's control, not something to fix.) `buildCertLookupUrl()`
  itself is unchanged and still used elsewhere (Browse Edit's link button,
  Add Coin's grading-help icon) — this only affects how the read-only detail
  view sources its link.
  **Superseded: Grade and Composition used to also live in this row.** Grade
  was a straight duplicate of the flip's own bottom-left corner — removed,
  no replacement needed. Composition's intentional-overlap-with-Specifications
  design (see below) was reconsidered and dropped too — it now lives only in
  Specifications; `compositionTextFor()` is unchanged and still shared, it
  just has one caller instead of two.
- **"Belongs to" linkage** — a section (always visible when any link exists,
  omitted entirely otherwise) with real clickable chips to the Album and/or
  Set the coin is part of. Album via `resolveCoinAlbumLink()` (scans
  `Albums.FilledBy` for this CollectionID → opens that album at its cover via
  `openAlbumFromLink()`, not a jump to the coin's exact slot page). Set via
  `resolveCoinSetLink()` *(removed Oct 2026)* (it matched the coin's own `setId` against a
  Denomination="Multiple" bundle row's OWN `setId` — **not** its
  CollectionID — excluding self, so a bundle viewed directly never links to
  itself → opens that bundle's own detail view through the same
  `showBrowseDetail()`). A coin can have an Album link, a Set link, both, or
  neither; all four cases render cleanly. Only one demo Set pair carries a
  `setId` today (Washington Quarter AY-00012 ↔ 2021 Silver Proof Set bundle
  AY-00018), matching how sparse real SetID population is (~28 of 386 rows) —
  most coins correctly show no Set link. *(Superseded Oct 2026: the Set link
  now comes only from the child's OriginSetID; see "Belongs to: Set membership from OriginSetID only".)*
- **Denser groups behind inline accordions** (`appendAccordion()`, a small
  disclosure component — inline expand/collapse on the same screen, default
  collapsed, NOT Add Coin's replace-the-screen drill-down), each omitted
  entirely when it has no data:
  - **Purchase Details** — **Total leads, with Cost and Shipping listed
    underneath it as the two components that sum to it** (superseded: this
    used to be Cost/Shipping/Total in that order) — then Seller, Purchase
    Date, Receipt. Cost from `coin.cost`, the rest from `FAKE_COIN_DETAILS`;
    Total shown only when both Cost and Shipping exist so it's a real sum.
    Each row still shows independently of the others. **Receipt is a real
    link, not plain "On file" text** (superseded) — `details.receipt` holds
    the actual stored path directly (`CoinReceipts/{CollectionID}_receipt.pdf`
    per the documented naming convention), used as the link's `href` exactly
    the same "stored value used directly" way `certLink` is, not constructed.
    Row hidden entirely when Receipt is blank, same as every other row here.
    **This is a real `<a href>` element, but the href never actually
    resolves to real content** — confirmed via a real click-through (404,
    both locally and on GitHub Pages): no file has ever existed at that
    path, and nothing backs it with a real OneDrive fetch (unlike reference
    images, which do). "Real link" describes the markup, not working
    behavior — don't read this as a functioning receipt viewer.
  - **Specifications** (new) — Composition, Weight, Diameter, Thickness, Edge,
    No. of Reeds. **Superseded: Composition used to also appear in the
    always-visible key-facts row above** ("intentional overlap," matching how
    the physical Red Book presents this data as its own dedicated table) —
    reconsidered and removed from there; Composition now lives only here.
    Weight/Thickness/Edge/ReedCount are new DB_Coins columns (Excel-side
    backfill in progress, mostly blank today by design) — ReedCount only ever
    applies to a reeded-edge coin. All sourced from the same
    `FAKE_METAL_CONTENT` sparse lookup (`compositionTextFor()`).
  - **Notes & Facts** (Fun Fact + Notes).
  - **Additional Photos** (thumbnail row).
  - No **Sale** group — no sold/deaccessioned concept exists in the data
    model, deliberately skipped (not even a placeholder).
Purchase/Fun Fact/Notes/Photos and the sparse `shippingCost`/`receipt`/specs
demo fields come from `FAKE_COIN_DETAILS`/`FAKE_METAL_CONTENT`, lookups by
CollectionID kept separate from `FAKE_COINS` rather than bloating every coin
row — sparsely populated today (a few coins have it filled in, most don't),
same pattern as `gradeSource`/`serNo`. Browse Edit is untouched by any of
this — it's purely the read-only viewing screen.

An **Edit** button lives inside the detail panel now (`#browseDetailPanel`,
the info box below the flip — **superseded: it used to sit in the top action
row next to Share**, above the flip; moved down into the box so Share is the
only thing left up top) and routes to one of two different forms depending
on the row's own `denom`, via `isSetRow(coin)` (`coin.denom === "Multiple"`,
the same signal used everywhere else a row needs to be told apart from an
individual coin):
- **An individual coin or Roll row** (any real single `denom`) → **Edit
  Coin**, covering exactly the bounded fields the app can safely write
  directly (see "Editing existing coins" below: Grade, GradeSource, Cert/Type
  Number, Designation, Storage Location) plus the ability to attach a photo
  to any Obverse/Reverse/Additional/Receipt slot that wasn't filled during
  Add Coin — reusing the same photo-slot/crop-adjuster module. In Edit mode
  the cert number is a compact pill-styled input (not a full-width labeled
  field) with a small link-icon button beside it, using `buildCertLookupUrl()`
  (grader-agnostic, unchanged) — a different, still-constructed-URL mechanism
  from the read-only detail view's stored-`certLink` approach above; the two
  were deliberately decoupled, not unified. Editing does **not** cover
  anything requiring research or judgment (album/slot re-matching, cost
  allocation, new catalog lookups) — that stays a chat + Copilot task, same
  boundary as before.
- **A Set-bundle row** (`Denomination="Multiple"`) → **Edit Set** (new,
  `showBrowseEditSetView()`/`initBrowseEditSet()`), a separate form — none of
  Edit Coin's Grade/GradeSource/Cert/Designation/photo-capture fields apply
  to a bundle. Covers Storage/Container, Value, and Purchase Details (Seller,
  Cost, Shipping, Purchase Date, Receipt — same photo-slot pattern as Edit
  Coin's Receipt field, no adjuster). Fields prefill from the same
  `coin.cost`/`FAKE_COIN_DETAILS` sources `renderDetailAccordions()` already
  reads, so the two stay consistent. **Coin-membership editing (adding/
  removing individual coins from a Set) is explicitly NOT part of this form**
  — out of scope for now, tracked as a parking-lot item, not even a
  placeholder UI exists for it. Same non-functional Save stub pattern as
  Edit Coin (no live OneDrive write layer exists for either form yet).
- **Bug fix, confirmed via screenshots**: tapping Edit on a Set used to
  always open Edit Coin regardless of row type (the shared `browseDetailView`
  had one Edit button with one hardcoded target) — this is what `isSetRow()`
  routing above fixes. **Checked Albums and Rolls for the same bug**: neither
  has it. An Album's filled slot always resolves to a real individual coin
  row (`FAKE_COINS.find(c => c.id === slot.filledBy)`), and Rolls rows are
  real single-`denom` coin-like rows too (`RollID` populated, never
  `denom === "Multiple"`) — Edit Coin is the objectively correct form for
  both, verified in a real browser (Lincoln Cents album slot → Edit Coin;
  a Rolls-tab row → Edit Coin; a Sets-tab row → Edit Set).
"Back" from either edit form returns to the coin/Set's Detail view, not the
grid.

#### Multi-coin Set display (SUPERSEDED — kept for the data model, not the display)
**The per-child mini-flip GRID this section describes no longer exists.**
`renderSetChildFlips()` is gone from `app.html` (only a comment marking where
it used to live remains), retired first by the "Detail/Edit accordion
redesign" — which replaced it with the identity-only "Coins in this Set"
accordion — and then further by "Reverse face gets real content; Sets lose
the flip card entirely", after which a Set has no flip card at all, just a
static photo. Read the layout/interaction parts below as history.

**What is still current and load-bearing** is everything about the DATA
model: the `originSetId` join, its deliberate separation from Issue-3's
`setId`, `setChildrenFor()`, and children being nested-only in
`FAKE_SET_CHILDREN` rather than added to `FAKE_COINS`. All of that survives
unchanged and still feeds the "Coins in this Set" accordion.

A Set-bundle row (`Denomination="Multiple"`) that has known component coins
renders each child's own coin-flip instead of the single generic
"Set / Multiple" flip. Built to fall back cleanly: a Set with no linked
children (the large majority — a real, intentional backlog, ~158 rows) keeps
today's single-flip display with zero visual change.
- **Child linkage — `originSetId`, a NEW field kept fully separate from
  Issue-3's `setId`.** These are two different relationships and must never
  cross-wire: `setId` (S-XXYY-TT-##) is Issue-3's "an individual owned coin
  *belongs to* this Set" chip linkage (`resolveCoinSetLink()` *(removed Oct 2026)*, matched against
  a bundle's own `setId`; that chip no longer exists, and SetID is now treated as the
  issue catalog, not membership); `originSetId` (demo `OS-YYYY-XXX-##`) is "these
  child coins are physically *inside* this Set bundle." A parent bundle and
  all its children share one `originSetId`. **The `-Set`/`-A`/`-B` CollectionID
  suffix pattern (see "ID schemes") stays the human-readable provenance
  lineage but is NOT the code join key** — the join is the explicit
  `originSetId` field, deliberately, to avoid brittle CollectionID-string
  parsing. Children have `originSetId` but no `setId`, so they never trigger
  the Issue-3 "belongs to" chip.
- **Children are nested-only** (`FAKE_SET_CHILDREN`, keyed by `originSetId` →
  array of coin-shaped child rows) — kept in a SEPARATE lookup from
  `FAKE_COINS`, NOT added to it. Every place that lists/aggregates owned rows
  (Coins/Rolls/Sets tabs, Stats & Value) iterates `FAKE_COINS`, so keeping
  children out of it auto-excludes them from all of those with zero filter
  changes — a 3-coin set counts as one owned item (the bundle), never four.
  Children never appear as standalone Browse rows. `setChildrenFor(coin)` is
  the single accessor; returns `[]` for non-Sets, Sets with no `originSetId`,
  and Sets whose breakdown isn't populated yet.
- **Layout: a responsive grid of `.flip-frame-mini`** (the same mini-flip the
  Browse grid cards use — `renderSetChildFlips()`), 2-up on phone, 3-up at
  ≥600px, each child in its own small `.case` box with year-mint / denom /
  grade corner labels + a caption of the child's **full name** (`child.name`,
  not `seriesLabel()` — avoids the "Statue of Liberty" vs. "Statue of Liberty
  Half Eagle" inconsistency where one child's denom word got stripped and
  another's didn't). `showBrowseDetail()` branches:
  set-with-children hides `#browseDetailFlipFrame` and populates
  `#browseDetailChildFlips`, skipping `applyFlipCorners()` entirely (it
  measures `#browseDetailDisc`, now in a `display:none` subtree — the exact
  stale-measurement case its own comment warns about); everything else keeps
  the single-flip path unchanged. Verified 2→5 children, phone + desktop, no
  cramping (a 5-coin set's last coin sitting alone on its row is normal grid
  flow, accepted).
- **Child flips are clickable** → open that child's own full detail view
  (`showBrowseDetail(child)`), with Back returning to the parent Set. The
  Set's own Back target is captured at click time and restored when returning,
  so the Set's Back still goes to the grid afterward — same per-origin
  back-handler pattern Albums' filled-slot tap uses. A child is an individual
  coin (real `denom`), so its Edit button correctly routes to Edit Coin.
- **A child's own detail view links back UP to its parent Set** — a "Belongs
  to → Set" chip in the linkage section (`resolveChildParentSet()`, matching
  the child's `originSetId` against the parent bundle row in `FAKE_COINS`),
  tapping it opens the parent Set's detail. This is the reverse of the
  multi-coin display and is deliberately kept SEPARATE from
  `resolveCoinSetLink()` *(removed Oct 2026)* (Issue-3's `setId` chip) — different field, different
  relationship, never merged. A Set bundle viewed directly (`isSetRow`)
  resolves `null` here so it never self-links; a normal coin with no
  `originSetId` also resolves `null`. Child detail views also render the
  normal coin Specifications accordion when the child carries a
  `FAKE_METAL_CONTENT` entry (demo: `AY-00022-B` silver dollar, `AY-00022-C`
  gold half eagle) — children are keyed by their own `-A`/`-B` CollectionID
  there, same as any owned row.
- **Expanded info box — a "Set Details" facts group** (`renderDetailAccordions()`,
  Set rows only): Coins in Set (DERIVED from `setChildrenFor().length`, not
  stored), Face Value, Mintage (from `FAKE_SET_FACTS`, a sparse lookup by the
  bundle's CollectionID). Deliberately NOT a coin's Specifications — a bundle
  has no single composition/weight/diameter (and has no `FAKE_METAL_CONTENT`
  entry, so the coin Specifications accordion renders nothing for a Set
  anyway). Each row hides when blank; the whole group is omitted for a Set
  with no facts and no children. No aggregate metal roll-ups (e.g. summed
  silver oz) for now — deferred.
- **Fun Facts fold into the existing "Notes & Facts" group**, not a separate
  accordion — a Set carrying a `funFact` in `FAKE_COIN_DETAILS` renders it
  through the exact same path a coin does, hidden entirely when absent. No
  real Set `FunFact` data exists in the workbook yet (a planned Excel schema
  change); the section is built to render only when present.
- **Demo data**: `AY-00022` (1986 Statue of Liberty 3-Coin Set) has three
  real children; `AY-00025` (a new 2026 Best-of-Mint 5-Coin Proof Set) has
  five, to stress-test layout. The other bundle rows (`AY-00018..21`) stay
  childless to prove the single-flip fallback. Only the two demo sets carry
  `originSetId`/`FAKE_SET_CHILDREN`/`FAKE_SET_FACTS`; a Set `funFact` is on
  `AY-00022` only.


### Live Spotlight + a real Specifications source (BUILT and merged to main)
Two live-device bugs from Ray's Docket review, unrelated to that round's
photo work but the same underlying shape as the Ledger/Stats fix below: a
display path that was never wired to live data and so kept reading a
demo-only lookup in a real session. **Both were confirmed by reproduction/
exact value match, not inferred.**

**Bug 1 — the Dashboard flip above the cabinet showed FAKE coins in a live
session.** Root cause was a single line: `const spotlightCoins =
FAKE_COINS.slice(0, 5)` — a module-level `const` evaluated once at load,
with no live path at any point. Replaced with `spotlightCoinList()` reading
`activeCoins()`, the same swap point every other live-data-aware nav
function already uses.
- **Sets are excluded, and that is load-bearing, not tidiness.** CLAUDE.md's
  own "Reverse face gets real content; Sets lose the flip card entirely"
  section records that Spotlight was safe *by construction* ("`spotlightCoins`
  is hardcoded to `FAKE_COINS.slice(0, 5)`… none of the first five rows is a
  Set… **if `spotlightCoins` is ever wired to a live/filtered source that
  could include a Set, this needs revisiting**"). This is that wiring. A
  `Denomination="Multiple"` row would render a flip card the Set redesign
  deliberately removed, so `spotlightCoinList()` filters `isSetRow()` out
  (and rows with no CollectionID, same rule `LIVE_COINS` itself applies).
- **The index is clamped** (`if (spotlightIndex >= coins.length) spotlightIndex = 0`)
  — a real fetch landing mid-rotation can shorten the list underneath the
  index, and `coins[undefined]` is the obvious way that breaks.
- **Two render triggers, both needed.** `navigate()`'s dashboard branch now
  calls `ensureLiveNavDataFetch(); renderSpotlight();` — the fetch only ever
  started from Catalog/Ledger before, so a session that opened neither would
  show demo coins above the cabinet indefinitely. And the fetch's own
  success path gained a `view-dashboard` re-render branch alongside the
  existing `view-browse`/`view-stats` ones, so a fetch that lands while the
  Dashboard is on screen is visible without a manual refresh.
- **Superseded — a same-day follow-up changed WHICH five, not the wiring
  above.** Ray's explicit correction: "first five in workbook order" is
  still the same five coins forever, every session — just no longer fake
  ones. `spotlightCoinList()` now picks **5 at random from the whole
  live/demo pool** (coins AND medals — only `isSetRow()` and blank-id rows
  are excluded, unchanged), rather than `.slice(0, SPOTLIGHT_COUNT)`.
  **Randomized ONCE PER SESSION, not on every re-render or auto-cycle** —
  the pick is keyed to the SOURCE array itself (`activeCoins()`'s own
  returned reference, `LIVE_COINS` or `FAKE_COINS`), not a filtered copy of
  it (`.filter()` always returns a new array, so keying off that would
  reshuffle on literally every call). This means the pick is stable across
  every ordinary re-render/auto-cycle in between — nothing there ever
  reassigns `LIVE_COINS`/`FAKE_COINS` — and re-rolls exactly once, on
  purpose, the moment the source genuinely changes: the live fetch landing
  after a session starts on demo data, or a post-write refresh
  (`refreshLiveCoinsAfterWrite()`) bringing a newly-promoted coin into the
  pool for the first time. **Worth knowing, not a bug**: the cache is a
  single slot, not a per-source history — flipping demo→live→demo (which
  real usage never does, since the fetch only ever resolves once and
  stays) reshuffles again on the way back to demo rather than restoring the
  original demo pick. `__resetSpotlightSelectionForTest()` is a new
  test-only seam standing in for a fresh page load.

**Bug 2 — AY-00002, Ray's real 1909 Lincoln Wheat CENT, showed
"Silver — 0.3617 oz", 12.5 g, 30.6 mm, Reeded under Specifications.**
Confirmed by exact value match rather than reasoning: every one of those
figures is `FAKE_METAL_CONTENT["AY-00002"]`, which is a **Walking Liberty
HALF**. `metalContentFor(coin)` looked its argument up in that mock by
CollectionID with no live path at all, so a real coin inherited a demo
coin's figures purely because their IDs collided. Any real coin whose
CollectionID happens to match a demo key hits this — AY-00002 is simply
the one Ray opened.
- **The fallback is now gated on demo MODE, not per coin**:
  `if (LIVE_COINS) return coin.specs || {}; return FAKE_METAL_CONTENT[coin.id] || {};`
  A per-coin fallback is exactly what allowed the borrowing; "are we in demo
  mode at all" is the only version that closes it. A live coin whose CoinID
  resolves to nothing gets `{}` — an empty Specifications panel, honest,
  rather than another coin's numbers.
- **`coin.specs` comes from the coin's own DB_Coins row**, joined on CoinID
  in `ensureLiveNavDataFetch()` alongside the existing metalCategory and
  composition joins: Composition, Weight, the four precious-metal Oz
  columns, Diameter, Thickness, Edge, ReedCount. `Lookup_MetalContent` (keyed
  by coin TYPE) **tops up only the fields DB_Coins leaves blank** — its Oz
  columns and TotalWeight are only partly backfilled — and never overrides a
  value DB_Coins actually has.
- **`buildCoinSpecsIndexes()` / `resolveCoinSpecs()` were extracted out of
  `ensureLiveNavDataFetch()` deliberately**, so the merge rule can be driven
  directly by a test instead of only through a Graph round trip this
  environment cannot make — the same reasoning that split
  `resolveStoredAdjustSource()` out of its own call site. Blank numeric cells
  become `null`, never `NaN` or `0`, so a blank column can't render as a real
  figure.

**One judgment call worth Ray's eyes, flagged rather than assumed.** Fixing
the wrong value left the Composition row **blank** for the cent — and
`compositionTextFor()` has always built its text from the four precious-metal
Oz fields alone, so every Bronze/Clad/Copper-Nickel coin has rendered a blank
Composition row since that function was written, demo rows included, even
though a real composition string sat in the same record. Since the reported
complaint is specifically about this row, it now leads with the stated
composition and appends the oz breakdown when there is one ("95% Copper, 5%
Tin and Zinc"; "90% Silver · Silver — 0.7734 oz"). The oz breakdown is never
dropped — melt value is the whole reason Composition is promoted to a key
fact for Rolls. This is a small display change beyond the literal bug and
also affects demo coins, so it is easy to revert on its own if Ray would
rather the row stay oz-only.

**Composition display change confirmed by Ray, as-is — no further changes
needed there.**

**Verified headless — `tests/verify_live_data_fixes.js` grew to 43
assertions (from the original 35) once the randomization follow-up landed;
1101 across 27 suites, zero failures, zero page errors.** Covers: the
demo-mode-only fallback and Ray's exact reported strings (the
"Silver — 0.3617 oz" and "12.5 g" the cent used to show, asserted gone); a
live coin with real specs showing its own figures; `buildCoinSpecsIndexes()`/
`resolveCoinSpecs()` including the top-up, the never-override rule, blank
cells becoming null, and an unmatched CoinID returning **null rather than
borrowing**; `spotlightCoinList()` reading live data, excluding Sets, blank
rows, and (explicitly, since the ask named it) confirming a Denomination=
"Medal" row IS a valid candidate; the index clamp; both render triggers; and
a source-text guard that the pre-fix `const` is genuinely gone. **The
randomization itself is verified with Math.random mocked to two different
fixed values**, each hand-traced through the real Fisher-Yates loop to an
exact, fully-predicted selection — proving genuine dependence on
`Math.random`, not incidental pool order — plus a session-stability check
(changing `Math.random` between two calls against the SAME source array has
zero effect on the result, since the pick is cached and never re-rolled).
- **Ten verified negative controls** (up from eight), each re-run and
  confirmed to fail exactly its own assertions: the per-coin
  `metalContentFor` fallback restored (fails 5, reproducing Ray's exact
  strings); `spotlightCoinList` reverted to `FAKE_COINS.slice(0,5)`; the
  Set-exclusion filter dropped (isolated separately, because the pre-fix
  demo list contains no Set either and so would have passed a naive
  control); the index clamp removed; the top-up allowed to override
  DB_Coins' own values; `navigate()`'s dashboard branch removed; the
  fetch's `view-dashboard` branch removed; the stated-composition display
  removed; **the shuffle mechanism reverted to a plain `.slice(0, N)`**
  (fails the two Math.random-seeded assertions, since a plain slice never
  reads `Math.random` at all); and **the source-identity caching guard
  removed** (reshuffles on every call — fails the session-stability
  assertion). A borrowing fallback inside `resolveCoinSpecs()` is
  additionally demonstrated inline (B8) to show B6 is load-bearing.
- **A real cross-suite regression found and fixed while verifying this**:
  `verify_reverse_face_and_set_flip.js`'s own Spotlight reverse-face check
  assumed `spotlightIndex = 0` always meant AY-00001 — true under the old
  fixed-first-five behavior, no longer guaranteed once the pick is random
  and drawn from the WHOLE pool (AY-00001 might not even be among the five
  picked). Fixed by pinning `spotlightCoinList()` to return just that one
  coin for the duration of that specific check (a test-only override,
  restored after) — that suite is about reverse-face corner content, not
  Spotlight's selection, so it has no business depending on which five got
  picked.
- **Not verified: any real device, any real OneDrive session.** The specs
  join itself can only be exercised through `buildCoinSpecsIndexes()`/
  `resolveCoinSpecs()` here — the real DB_Coins column names it reads
  (`Weight`, `Diameter`, `Thickness`, `Edge`, `ReedCount`, the four Oz
  columns) are the confirmed ones already used elsewhere in this file, but a
  live pass should confirm a real coin's Specifications panel end to end.
  The true `Math.random()` path (unmocked) is exercised by every other
  assertion in the suite and by the app itself; only the exact-outcome
  checks mock it, for determinism.


### Set/child linkage: live-data path added (BUILT, display-only)
Real bug from Ray breaking out 5 real children under a real 1967 SMS Set
for the first time (e.g. `AY-00555-A`, `OriginSetID` confirmed populated
pointing at the parent's own CollectionID): no "Coins in this Set" content
on the parent, no "Belongs to → Set" chip on the children. Investigated
first (see the prior session's report), fixed here on Ray's explicit
go-ahead.

**Root cause was NOT another missing-mapper gap like `Finish`** —
`mapWorkbookRowToCoin()` already reads `OriginSetID` correctly (confirmed
against the real workbook when that field was originally added). The real
cause is structural: `setChildrenFor()` (feeds "Coins in this Set") and
`resolveChildParentSet()` (feeds the child's "Belongs to → Set" chip) were
**100% demo-only** — they read `FAKE_SET_CHILDREN`/`FAKE_COINS` directly,
with no live-data path at all, confirmed by grepping the whole file for any
`activeSetChildren`/`LIVE_SET_CHILDREN`-style equivalent and finding none.
For any real Set this always returned `[]`/`null`, regardless of how
correctly `OriginSetID` was populated.

**A second, independent problem stacked on top: the matching logic itself
assumed a convention real data doesn't use.** The demo data (and the app's
own session-only "link a coin to this Set" feature) has the PARENT carry
its own `originSetId`, shared verbatim with its children — a derived
string like `"OS-1986-STL-01"` or `"OS-LOCAL-AY-00019"`. The real workbook
convention, confirmed against the app's own real Add Set write path
(`addChildToSetDraft()`: `originSetId: draft.collectionID`) and matching
exactly what Ray's real children show, is that a **child's own
`OriginSetID` IS the parent's CollectionID directly** — a real parent Set
row carries no `OriginSetID` of its own at all. So even a naive
`FAKE_COINS` → `activeCoins()` swap would have kept failing: the old guard
(`if (!coin.originSetId) return []` on the PARENT) never even reached a
lookup for a real Set, since a real parent's own `originSetId` is blank by
design.

**Fix: both functions now try two conventions, real/live first:**
- `setChildrenFor(coin)` — tier 1 searches the live pool for any row whose
  `originSetId` equals the parent's own `id` (the real convention); tier 2
  falls back to the old `FAKE_SET_CHILDREN[coin.originSetId]` lookup
  unchanged (demo data + the session-only linking feature, both of which
  use the shared-string convention). Real children live as ordinary rows
  in `activeCoins()` (unlike demo children, deliberately kept out of
  `FAKE_COINS`), so no separate live index was needed.
- `resolveChildParentSet(coin)` — same two-tier order: a live Set row whose
  own `id` equals the child's `originSetId`, falling back to the old
  shared-string search.
- **New `originSetIdKeysMatch(a, b)`** — trims before comparing (`colVal()`
  does no trimming of its own, and this environment has no live OneDrive
  session to directly inspect Ray's real cell content for stray whitespace,
  flagged as a real, unverified risk rather than assumed fine) and
  explicitly requires both sides to be non-blank after trimming — a real
  bug in the helper's first draft, caught by its own committed unit test:
  two blanks (or `null`/`undefined`) compared equal under a naive
  `String(a||"").trim() === String(b||"").trim()`, which would have
  matched any parentless coin against any childless Set had a future
  caller ever reached it without the surrounding guards already in place.
- **Read-only, as scoped** — neither function writes anything; no change
  to `ALL_NEVER_WRITE_COLUMNS` or any write path. `resolveCoinSetLink()` *(removed Oct 2026)*
  (the separate Issue-3 `setId` "belongs to" chip, a different field/
  relationship) had the same `FAKE_COINS`-only gap and was left untouched
  then; the function has since been removed (Oct 2026), so that gap no
  longer exists.

**Verified headless — new suite `tests/verify_set_child_linkage_live.js`
(27 assertions), all passing; 1568 across 38 suites, zero failures.**
Covers: `originSetIdKeysMatch()` in isolation including the two-blanks
case that caught the helper's own bug; a synthetic live Set + 5 real-shaped
children (mirroring Ray's exact AY-00555 scenario) resolved via the
live-data tier with no leakage from an unrelated Set's own children; the
pre-existing demo fallback (`AY-00022`, 3 children) and the session-only
linking feature's own shared-string convention both still working
unchanged; and — the real end-to-end check, not just the functions in
isolation — driving `showBrowseDetail()` for the real Set and confirming
the "Coins in this Set" accordion actually renders all 5 real children,
and separately for a real child confirming the "Belongs to → Set" chip
renders, names the real parent, and its click handler actually navigates
there. **Verified via negative control**: reverting both functions to
their exact pre-fix bodies reproduces the precise reported symptom (0
children found, chip absent, accordion never renders) while every
demo-data/control assertion keeps passing unchanged — confirming the
suite depends on the real fix, not a coincidence of the fixture.
- **Not verified: any real device, any real OneDrive session.** In
  particular, whether Ray's real `AY-00555`/`AY-00555-A..E` cells have any
  stray whitespace was flagged as a real risk and defended against
  (`originSetIdKeysMatch()`'s trim), but not independently confirmed from
  this environment — worth a live click-through to close out.
- **Task 2 (the "attribute coin to Set" picker) stays parked, untouched**,
  per Ray's explicit instruction — gated on the still-undecided Set
  write-layer scope question, not part of this dispatch. See the prior
  investigation report for its own findings (candidate list is real/live
  but excludes any coin already carrying an `OriginSetID`, including one
  already pointing at the very Set being edited; linking there is
  deliberately session-only, per `ALL_NEVER_WRITE_COLUMNS`).


### Sharing (locked in)
A generic `shareContent({title, text, mailtoSubject, files})` helper, built
once and reused by both a Wishlist-page **📤 Share** button (shares the
current full wishlist as one formatted list) and a Browse detail **📤**
icon button (shares that one coin's identity/grade/value line) — not two
separate implementations for what's the same underlying action.
- **Tries the Web Share API first** (`navigator.share`, with
  `navigator.canShare({files})` gating whether files get attached) — the
  only method that can include images alongside text, letting the user pick
  where to send it from their device's native share sheet. A user-cancelled
  share (`AbortError`) is treated as a no-op, not a failure — it does not
  fall through to the mailto fallback.
- **Falls back to a plain `mailto:` link** with formatted text when the Web
  Share API isn't available, with a toast noting photos aren't included that
  way.
- **`files` is real infrastructure, not wired to anything real yet** — no
  coin in this mockup has an actual persisted photo to attach (see "What NOT
  to build"), so neither call site passes any today; the plumbing is ready
  for whenever real photo persistence exists.
- **Cannot verify real Web Share Sheet behavior on Samsung Internet from
  this environment** — same acknowledged testing-gap as elsewhere in this
  project. Verified here: the correct branch executes and the correct
  `{title, text}` payload is built, using a mocked `navigator.share`; actual
  on-device share-sheet behavior needs Ray's own testing.
- **Wishlist's layout is untouched** — the Share button was added to the
  existing grid-view layout only; a separate Wishlist layout revision is
  still a future, not-yet-started round.

Albums is a picker first: a list of albums (name + fill-progress bar), tap one to
open it. **Tapping an open/want slot jumps straight into Add Coin**, with the
album + slot pre-filled — not just the "Assign to Album" field and context
banner, but the actual top-level identity fields too (Denomination, Year,
MintMark, Description, Variety — split off the slot's own `description` via
`splitDescriptionVariety()`), pulled from what that slot already defines. This
supersedes the earlier "found it, pending" toggle idea. **Tapping a filled
slot** opens that coin's Browse detail view (same Edit access as reaching it
through Browse) — Back returns to the same album, on the same page it was
opened from, not the albums list or Browse's grid.


### Splash: Docket badge gap closed; Value floored at face value + one shared currency formatter (BUILT and merged to main)
Two independent fixes from the same dispatch — a data-fetch gating gap
found on the same live-device pass as the three bugs immediately above, and
a display/formatting cleanup. Neither is architectural; held on the same
branch, same "awaiting live-device confirmation" standing as everything
else on it.

**Part A — the Docket badge still lagged ~3s after the cabinet appeared.**
Confirmed on the same real-device pass that verified the splash-gating fix
above: that fix waits on `ensureLiveNavDataFetch()` (All/DB_Sets/DB_Coins/
Lookup_MetalContent/Lookup_Graders/Photos/Receipts/Albums/Wishlist) before
hiding the splash — genuinely fixed the album-image gap it targeted — but
the Docket fob (`updateDocketFob()`, fed by `renderNeedsAttentionHub()`'s
own `stagingRows`/`researchRows`/`otherRows`) depends on a COMPLETELY
SEPARATE fetch, `loadDocketQueue()` (`_Docket/docket.json`), that the
splash gate never accounted for at all. The fob only ever gets its real
count once THAT fetch lands, well after the splash had already handed
control to the Dashboard.
- **`runSplashConnect()`'s `attempt()` now gates on BOTH fetches**, via
  `Promise.all([ensureLiveNavDataFetch(), docketQueueReady()])` — sharing
  the existing 5s ceiling/400ms retry loop rather than standing up a
  second independent timer, since both are genuinely part of the same
  "is the app's real data ready yet" question the splash already exists to
  answer.
- **New `docketQueueReady()`**: `true` immediately when
  `docketWriteEnabled()` is `false` (the write layer is off — same
  "nothing to wait for" logic `ensureLiveNavDataFetch()`'s own callers
  already apply to a disabled feature), otherwise `(await
  loadDocketQueue()) !== null`. `loadDocketQueue()` already distinguishes a
  genuine fetch failure (returns `null`) from a genuinely-empty-but-real
  result (`emptyDocketQueue()`, a real non-null object) — so **a
  genuinely-empty Staging/Docket session resolves `true` on the FIRST
  attempt, same as any other successful-but-empty fetch**, never waiting
  out the timeout for "no data" to mean something more. This mirrors
  `ensureLiveNavDataFetch()`'s own "resolve on genuine success, not just
  any resolution" principle exactly.
- **`loadDocketQueue()` gained its own in-flight dedup**
  (`docketQueueFetchPromise`), the same pattern
  `liveNavDataFetchPromise`/`graphTokenInFlight`/
  `referenceImageFetchesInFlight` already establish elsewhere in this
  file — not explicitly asked for, but directly necessary: the splash is
  now a SECOND caller of `loadDocketQueue()` alongside
  `renderNeedsAttentionHub()`'s own init-time call, and without dedup the
  two would race into two independent real Graph fetches at boot rather
  than sharing one in-flight promise the way every other multi-caller
  fetch in this app already does.
- **A real, non-obvious cross-cutting test-isolation bug found and fixed
  while verifying this, not a flaky test.** `addcoin-phase1`'s own
  flag-off Graph-call-isolation block (`A9`) installs a `graph()` spy via
  `__setGraphClientForTest()` and asserts nothing calls it. `graph()`
  resolves the CURRENT `activeGraphClient` dynamically at call time (not
  bound once at promise-chain start) — and unlike
  `ensureLiveNavDataFetch()` (a completely separate token/`fetch()`
  mechanism that never touches `graph()`), the splash's Docket retry loop
  DOES call `loadDocketQueue()` → `graph()` every ~400ms for up to 5s
  after every page load. A retry firing during that test's own window
  false-positived `touched = true` — root-caused by tracing `graph()`'s
  dynamic resolution semantics, then confirmed via a clean standalone
  re-run, not assumed flaky. **Fixed by isolating the test itself** — the
  A9 block now wraps with `__setDocketWriteEnabledForTest(false)` /
  `(null)`, using the existing test seam to precisely exclude this
  unrelated background activity from the window the test cares about,
  rather than weakening what the test asserts. `splash-and-album-prefetch.js`'s
  own Block B and GEN block needed the identical treatment for the inverse
  reason: both stub `ensureLiveNavDataFetch()` only, so once the gate
  requires BOTH fetches to succeed, the real (unstubbed)
  `loadDocketQueue()` — which always resolves `false` in this sandboxed
  no-MSAL environment — permanently blocked "success" regardless of the
  stubbed main fetch's own resolution, breaking both blocks' original,
  narrower intent (testing only the main-fetch retry/generation-guard
  behavior). Same fix, same seam, both restored to their original scope.

**Part B — Value floored at face value, one shared currency formatter
everywhere.** Two related display-only cleanup items; neither touches what
gets stored anywhere (workbook writes, Edit-form save logic are unchanged).
- **`mapWorkbookRowToCoin()` gained `coin.faceValue`**, read from a new
  `FaceValue` column via `colVal(row, "FaceValue")` — **this exact column
  name is NOT independently confirmed against the real workbook from this
  environment**, same caveat every other not-yet-device-confirmed column
  read in this file already carries; if it turns out to be named/shaped
  differently, `colVal()`'s own graceful-miss behavior (blank → `null`
  faceValue → the floor becomes a no-op) means nothing breaks, it just
  silently does nothing until the real name is confirmed and added as a
  candidate. **Worth Ray's direct confirmation before this is trusted.**
- **New `valueWithFaceFloor(value, faceValue)`**: `Math.max(value,
  faceValue)` when `faceValue` is a real positive finite number, otherwise
  returns `value` unchanged — so a coin with no `faceValue` on file (every
  coin in this mockup today, and any live row until the column is
  confirmed) displays exactly as it always has, no floor applied. Applied
  everywhere `coin.value` is DISPLAYED: the Catalog/Sets/Rolls grid cards,
  Browse detail's Overview "Value" row (presence guard now computes the
  floored value FIRST and gates on THAT, so a coin with a blank/zero
  stored Value but a real FaceValue still shows the row rather than hiding
  it), the reverse-face flip corner's obverse-side sr-only Value text, and
  `renderStats()`'s `totalValue`/`maxDenomValue`/per-group value sums —
  **floored per-coin, before summing**, not floored on the aggregate
  total, so a mixed batch of low-value coins each contributes its own real
  floor rather than the total being floored once at the end (which would
  under-correct a batch of many sub-face-value coins).
- **`SalePrice`/`Cost`/`Shipping`/`Total`/Wishlist prices are NOT
  floored** — the floor is specifically "a coin is never worth less than
  its own face value," which only makes sense for the coin's own
  estimated worth (`Value`), not a purchase-price or sale-price figure
  that can legitimately be anything (a below-face buy, a below-face sale,
  a $0 gift). Only formatting (below) applies to those.
- **New shared `formatCurrency(n)`** — always exactly two decimal places
  with thousands separators (`"$1,234.56"`, `"$0.00"`), via
  `.toLocaleString(undefined, {minimumFractionDigits:2,
  maximumFractionDigits:2})`, non-finite input defaulting to `0` rather
  than throwing/`NaN`-displaying. Replaces roughly 20 separate display
  sites that had each grown their own ad hoc formatting (`.toFixed(2)`
  strings with no thousands separator, `.toLocaleString()` with no
  decimal-place floor, or a bare template-literal `` `$${n}` `` with no
  rounding at all) across: Catalog/Sets/Rolls cards, Browse detail's Share
  button text, Overview's Value/Sale Price rows, Purchase Details' Total/
  Cost/Shipping rows, `buildSetChildRow()`'s child facts line, Wishlist's
  grid item price/share text/detail meta/purchase summary, Ledger's coin
  search and exit-history sale-price columns, Add Coin's live flip corner
  reverse-side price display, and Add Set's purchase-row summary.
- **`formatMoney()` (the old Ledger/Stats-only helper) is REMOVED
  entirely**, not just superseded — it rounded to whole dollars
  (`Math.round`, no cents at all), which is exactly the inconsistency this
  cleanup exists to close. All 4 of its call sites in `renderStats()` now
  use `formatCurrency()` instead, so Ledger's totals show cents like every
  other dollar figure in the app, for the first time.
- **Deliberately left UNCHANGED**: every `roundToCents()`-populated
  Edit-form `<input type="number">` value (`browseEditValue`,
  `editSetValue`, Add Coin's/Add Set's own value inputs) — a formatted
  `"$1,234.56"` STRING is not a valid value for a number input, so these
  correctly stay raw numbers; `roundToCents()` itself is untouched, still
  serving its original "round when populating a numeric form field" job,
  a genuinely different job from `formatCurrency()`'s "render as display
  text." Also unchanged: Mintage's own `.toLocaleString()` displays (not a
  currency value) and denomination code strings like `"$1"` (a label, not
  a computed figure).

**Verified headless — every affected suite's stale exact-string assertions
were updated to the new 2-decimal format, following a real, deliberate
design change, not weakened**: `verify_reverse_face_and_set_flip.js`
(`"$620"` → `"$620.00"`, `"Cost$800"` → `"Cost$800.00"`,
`"Cost$620"` → `"Cost$620.00"`), `verify_stats_live_data.js`
(`formatMoney()`'s old whole-dollar `"$12"`/`"$57"` → `formatCurrency()`'s
`"$12.34"`/`"$56.78"`, matching the test's own synthetic coin's exact
cost/value with no faceValue set, so the floor is confirmed a no-op there),
`verify_status_exit.js` (`"$690"` → `"$690.00"`, `"$0"` → `"$0.00"`).
`verify_addcoin_phase1.js`'s A9 block and
`verify_splash_and_album_prefetch.js`'s Block B / GEN block were fixed per
the test-isolation finding above, each restored to its original, narrower
intent rather than weakened to tolerate the new cross-cutting background
activity. **Full regression re-run clean: 1441 assertions across all 33
suites, zero failures, zero page errors** — this includes both Part A's
Docket-badge-gating fix and Part B's floor/formatting changes exercised
together, since every suite shares the same page load the splash fix now
gates.
- **Not verified: any real device.** Per the task's own explicit
  instruction, this needs a live-device pass confirming (Part A) no more
  gap between the cabinet appearing and the Docket badge populating with
  its real count, and (Part B) a real low-value coin (e.g. a cent whose
  stored Value is blank or sub-cent) displaying/counting at its
  1-cent floor, alongside a Stats total, both showing two decimal places
  — **and specifically whether `FaceValue` is in fact the real All-sheet
  column name**, which this environment cannot confirm on its own.


