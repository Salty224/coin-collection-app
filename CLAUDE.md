# Salty's Cabinet — coin collection app

Personal coin collection app for Ray Ayres ("Salty"). Static site on GitHub Pages,
no backend server. Talks directly to OneDrive (Ray's personal Microsoft account) via
Microsoft Graph API, and the Excel workbook there is the authoritative data store.

## Maintenance
Update this file only when something changes that a future session would actually
need to know to avoid re-doing work or making a wrong assumption — a new
architectural decision, a schema/naming convention change, a scope boundary, or a
change to how a feature is supposed to work. Don't update it for routine task
completions (a bug fix, a component built to existing spec, a screen finished per
existing spec) — just do the work. If unsure whether something rises to that bar,
ask before updating rather than updating by default.

## End-of-task reporting (standing rule)
When finishing any task (bug fix, feature, batch), give Ray a copy-paste-able
plain-text summary block: what changed, how it was verified, and — critically —
any open questions or concerns worth a second look (an ambiguous instruction,
a tradeoff made without explicit sign-off, a side effect on something else,
an unresolved item carried over from a prior task) so the two of you can
deliberate before anything moves further. Don't skip the questions section
just because nothing came up — say so explicitly rather than omitting it.
This applies on top of, not instead of, the CLAUDE.md update rule below.

## Hard constraints
- Free tier only. No paid Azure resources, no third-party automation platforms.
- No backend server — static HTML/JS + Microsoft Graph API only.
- Excel workbook in OneDrive stays the source of truth, co-managed with Microsoft
  Copilot in separate Excel sessions between coding sessions.
- Mobile-first — Ray mainly uses a Samsung S25 on Samsung Internet, which has real
  browser quirks (see below). Desktop/tablet also matter, especially for Albums.

## Current live files
- `salty224.github.io/coin-collection-app/` — GitHub Pages root
- `index.html` — original connection test page (sign in / read / write test)
- `stage.html` — working "Add New Coin" staging form (photo capture → OneDrive
  Staging folder). Confirmed working end-to-end. **Do not break this.**
- `fonts/` — self-hosted Cormorant Garamond (600/700) and Caveat (600/700)
  woff2 files, latin subset only. **Locked in: fonts are self-hosted, not
  loaded from the Google Fonts CDN** — the CDN request was seen to render
  differently across devices (Android tablet vs. PC), most likely a
  CDN-blocking/content-blocker issue on one device and not the other (same
  category as `alcdn.msauth.net` being blocked for MSAL — see below), causing
  a silent fallback to a system font on just that device. Self-hosting removes
  the network dependency entirely so rendering is consistent regardless of
  what a given device blocks. If a font ever needs a new weight/family, fetch
  the woff2 from Google Fonts' CSS API once and commit it here rather than
  re-adding a CDN `<link>`.

## Azure / Entra config
- Client ID: `bf9aaf28-a5e1-4eed-a006-15f03146693b`
- Tenant: `consumers` (personal Microsoft accounts only)
- Authority: `https://login.microsoftonline.com/consumers`
- MSAL: use `loginRedirect`, not popup (popup breaks on mobile after a canceled
  attempt). Load MSAL from jsdelivr CDN, not the default Microsoft CDN
  (`alcdn.msauth.net` is silently blocked by a browser extension Ray has).
- Redirect URIs must be registered per page/route in Entra. Registered so far:
  `index.html` → bare `https://salty224.github.io/coin-collection-app/`;
  `stage.html` → its own `.../stage.html`; `app.html` → local dev only,
  `http://localhost:8791/app.html` (see "Real Graph API reads" below) — no
  production redirect URI for `app.html` exists yet, that's a separate future
  step once this app is actually deployed/tested beyond local dev.

## Real Graph API reads (locked in — first real network/auth code in app.html)
`app.html` was pure `FAKE_*` in-memory mockup data until the Reference Images
feature below needed to check Ray's actual OneDrive — this is still the
**only** real Graph code in the file; every Save button remains a stub (see
"What NOT to build" / hard constraints — nothing here writes anything).
- **DISABLED BY DEFAULT IN PRODUCTION** (`const ENABLE_REFERENCE_IMAGES = false`,
  set right above the MSAL bootstrap in app.html). The 7/15 localhost testing
  session hardcoded `redirectUri: "http://localhost:8791/app.html"` for local
  dev — there's no production redirect URI registered in Entra for `app.html`
  yet (see "Azure / Entra config" above). On the live GitHub Pages site this
  surfaced as **Albums appearing to hang/re-auth on load**: every coin render
  with no cached reference image (i.e. every render, since no real
  `ReferenceImages` files exist on OneDrive yet) called `hasReferenceImage()`
  → `ensureReferenceImageFetch()` → `getReferenceImageToken()`, found no
  cached MSAL account, and fell back to `acquireTokenRedirect()` — a real
  full-page navigation toward Microsoft sign-in with a `redirect_uri` Entra
  never registered for production. Albums hit this hardest (most coin discs
  per screen via `renderSlotCell()`), but Spotlight/Browse were equally
  exposed. The flag is checked at the two real choke points —
  `hasReferenceImage()` returns `false` immediately, and `ensureReferenceImageFetch()`
  (every caller's real entry point to a Graph/MSAL call) returns
  `Promise.resolve(null)` immediately — so no caller, present or future, can
  reintroduce this by skipping a check at its own call site.
  `referenceImageMsalInstance` also isn't constructed at all while the flag
  is off, not just left unused.
  **To re-enable for local testing:** set `ENABLE_REFERENCE_IMAGES = true`,
  run a local server on port 8791 from the repo root (e.g.
  `python3 -m http.server 8791`), add `http://localhost:8791/app.html` as a
  redirect URI in the Entra app registration if it isn't there already, then
  load `http://localhost:8791/app.html` — the first coin render needing an
  image will redirect to a real Microsoft sign-in and back. **Set it back to
  `false` before merging/deploying again** until a real production redirect
  URI exists and this has a non-localhost-only story.
- **Read-only, enforced in code, not just by scope.** `fetchReferenceImageBlob()`
  is the only function that calls `fetch()` against Graph for this feature; it
  hardcodes `method: "GET"` and requests the narrower `Files.Read` scope (not
  `Files.ReadWrite`, unlike index.html/stage.html, which need write for their
  own purposes).
- **Path is a hardcoded `CoinCollection/ReferenceImages/` prefix** — no
  dynamic/user-influenced path segment beyond the already-sanitized series key
  ever reaches the Graph call, and this never touches `CoinCollection
  (AI).xlsx` or any other OneDrive path. Graph itself has no folder-scoped
  permissions — `Files.Read` grants read access to the whole drive — so this
  boundary is enforced entirely by the calling code, not by anything Graph or
  Entra can restrict on its own.
- **MSAL bootstrap adapted from index.html's**, own `PublicClientApplication`
  instance (`referenceImageMsalInstance`), same `clientId`/`authority`,
  `cacheLocation: "localStorage"` (MSAL's own token cache — the same narrow,
  intentional exception to the no-localStorage rule as the other two pages).
  `redirectUri` is `http://localhost:8791/app.html` — **local dev testing
  only**, registered in Entra as its own exact URI alongside index.html's and
  stage.html's (Microsoft's SPA platform config allows plain `http://` on
  `localhost`, no HTTPS needed). There's no explicit "Sign In" button on this
  page (unlike index.html) — `getReferenceImageToken()` tries
  `acquireTokenSilent` first and falls back to `acquireTokenRedirect` exactly
  like index.html's `getToken()`, but it's triggered lazily by the first coin
  render that needs an image rather than a click. Practically: the first time
  `app.html` loads locally with no cached session, the very first coin disc
  that needs a reference image will trigger a real full-page redirect to
  Microsoft sign-in; after Ray signs in, the redirect returns to
  `app.html` and normal rendering continues, retrying the fetch for real.
- **The whole feature degrades gracefully if MSAL itself never loads.** The
  jsdelivr `<script>` tag is a real external request, and this project has
  already hit exactly this class of failure once (`alcdn.msauth.net` silently
  blocked by a browser extension — see Azure/Entra config above). If `msal`
  never becomes defined, `referenceImageMsalInstance` is `null` instead of
  throwing, and every function that needs it (`getReferenceImageToken()`,
  etc.) short-circuits to "no image available" rather than throwing — this
  was verified to matter: an earlier version threw uncaught at the top of the
  script when `msal` was undefined, which broke the *entire* app (all
  navigation, all still-fake functionality) since it happened before the rest
  of the script's function definitions ran. This one read-only feature must
  never be able to take the rest of the mockup down with it.
- **Image delivery: raw bytes → in-page blob URL, not
  `@microsoft.graph.downloadUrl`** — the download URL Graph returns expires in
  ~1hr, which would silently break a longer-running session; a blob URL
  (`URL.createObjectURL`) lasts the whole page lifetime instead.
- **Caching: in-memory only, keyed `{sanitizedSeriesName}_{obverse|reverse}`**
  (`referenceImageCache`) — never localStorage/sessionStorage (see "What NOT
  to build"), cleared on reload, fetched at most once per series+side per
  session. **Only a real answer from Graph (200 or 404) gets cached** — a
  fetch attempt that fails because there's no token yet (not signed in, mid
  sign-in-redirect) is deliberately left uncached so it retries for real once
  Ray actually signs in, rather than getting stuck showing the placeholder
  forever for whatever series happened to render first.
- **404 = "no reference image on file yet," same as the old boolean-false
  path** — not an error, not surfaced to the user any differently than before.
- **Lazy — fetches on first render of a given series, not eager on load.**
  `hasReferenceImage(coin, side)` (default side `"obverse"`) is the trigger
  point: a cache hit returns synchronously; a cache miss kicks off the real
  fetch in the background and returns `false` for that call. Splash screen is
  untouched by this — still the same simulated `SPLASH_SIMULATED_DELAY_MS`
  timer as before; that redesign is explicitly deferred until more of the
  real data-layer Graph calls exist.
- **Live self-update vs. picks-up-on-next-render, depending on call site.**
  `applyDiscContent()` (Spotlight, Browse grid cards, Browse detail) holds a
  real DOM element reference, so on a cache miss it attaches a one-time
  callback that swaps in the real image in place once the fetch resolves
  (checking `document.contains(discEl)` first) — no page-wide re-render
  mechanism needed. Albums' `renderSlotCell()` is string-templated
  (`innerHTML`), so it can only reflect whatever's already cached at render
  time — a slot whose image was still loading when the album page rendered
  shows the fallback until the album is re-rendered/reopened, same
  computed-once-at-open-time tradeoff as the album page's own chunk-size
  sizing. This is a known, accepted minor gap, not a bug to chase.
- **Real image replaces the old 🪙 stand-in glyph** (`applyRealReferenceImage()`
  sets `background-image` + `background-size: cover` directly on the disc
  element, inline, which wins over the `.coin-disc.reference-image` class's
  CSS `background` shorthand for that one property) — the class's muted
  ring/box-shadow styling still applies around it.
- **Storage convention changed — flat folder, no obverse/reverse
  subfolders**: `CoinCollection/ReferenceImages/{sanitizedSeriesName}_obverse.png`
  and `.../{sanitizedSeriesName}_reverse.png` (e.g. `Lincoln_Wheat_obverse.png`),
  superseding the earlier subfoldered `.../ReferenceImages/obverse/...` /
  `.../reverse/...` layout described in the original spec — see "Series-level
  reference images" below, which is the section this feature's fetch logic
  actually implements against.

## OneDrive folder structure
```
CoinCollection/
  CoinPhotos/            named {CollectionID}_obverse.jpg, _reverse.jpg, and (only if a
                           3rd/4th image is actually needed — slab label closeup, box,
                           etc.) _photo3.jpg, _photo4.jpg. Flat — no subfolder by
                           year/series/anything else.
  CoinReceipts/           named {CollectionID}_receipt.jpg, or timestamp-named for
                           batch receipts not yet tied to a coin
  Staging/{YYYYMMDD-HHMMSS}/   fallback landing zone when a direct Excel write fails
                                 — data.json + generic-named photos, collectionID left
                                 blank until reconciled
  CoinCollection (AI).xlsx
```
- **Upload naming** (Ray's side — no suffix typing, just what the app captures):
  `{CollectionID}_obverse.jpg` / `_reverse.jpg` / `_combined.jpg`.
- **Combined obverse+reverse in one image** (some PCGS TrueView shots, some seller
  photos): file the raw upload as `{CollectionID}_combined.jpg` in the Photo3 slot
  (Photo4 if Photo3 is already taken by something else) — supersedes the same-day
  decision that filed it as `_obverse.jpg`; don't build against that older version.
- **Crop commit (final, locked in) — automatic renaming, Ray never types a
  filename himself**: once the crop tool runs (on a normal obverse/reverse upload,
  or on a combined image — see below), the app:
  1. Preserves the untouched input as `{CollectionID}_obverse_original.jpg` (or
     `_reverse_original.jpg`) — **never deleted**.
  2. Writes the baked/cropped result as `{CollectionID}_obverse_cropped.jpg` (or
     `_reverse_cropped.jpg`).
- **No dedicated splitter tool for combined images.** Cropping a `_combined.jpg`
  into separate obverse/reverse files is just the existing single-photo crop tool
  run twice against the same `_combined.jpg` source — once framing the obverse
  region, once the reverse region. Output: `_combined_original.jpg` (preserved),
  `_obverse_cropped.jpg`, `_reverse_cropped.jpg`. Once both cropped files exist,
  update Obverse/Reverse per the display rule below and clear the "combined, not
  yet cropped" Remarks note.
- **Display rule (locked in): Obverse/Reverse should never be blank once a photo
  has been uploaded for that slot.**
  - Immediately on upload, before any crop exists: point to the `_original` file
    (shows the raw/uncropped photo — not ideal in the circular frame, but better
    than no photo at all).
  - Once the crop tool runs and a `_cropped` file exists: the column
    automatically switches to point there instead. Cropped always wins once it
    exists.
  - If a crop is ever deleted/reset: falls back to `_original` again rather than
    going blank.
- **New All-sheet columns: `Obverse_Original` and `Reverse_Original`**, positioned
  directly after `Obverse` and `Reverse`. They always hold the original filename
  regardless of crop state (so Ray can locate/re-crop an original later without
  hunting OneDrive by hand); `Obverse`/`Reverse` hold whichever filename is
  currently *displayed* (original or cropped, per the rule above).
- **This whole feature depends on the Graph API write layer being built first —
  none of it functions until that exists.** Confirmed: every Save button in the
  app is currently a stub (Add Coin, Browse Edit, Wishlist, Batch Receipt all just
  toast "nothing saved yet") — no OneDrive writes happen anywhere in the app yet.
  When that write layer gets built, this naming/renaming/fallback logic is what
  it needs to implement — not a separate future feature on top of it.

## ID schemes (locked in)
- CollectionID: `AY-#####` (5-digit). Parent rows get `-Set` suffix; child rows get
  `-A`/`-B`/etc. **This suffix pattern is reserved exclusively for
  acquisition/provenance lineage — never repurpose it for anything else.**
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
- **All** — owned coin records, ~480 rows. Authoritative for what Ray owns. Has a
  new **SpotValue** column (not live yet — formula pending).
- **DB_Coins** — ~3,753 reference coin types. Add rows opportunistically when a gap
  is hit during other research — never proactively expand into an exhaustive catalog.
  Has Mintage (partially populated) and will get a new FunFact column. Co-managed
  with Copilot outside app sessions (GSID population, PCGS# corrections, structural
  fixes have happened this way) — **treat any previously-pulled copy of DB_Coins as
  possibly stale**; re-pull before relying on it for anything beyond a quick mockup.
- **DB_Sets** — reference sets, including all albums (Type=AL).
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

## Add Coin: the core workflow
1. Camera/library capture (existing pattern: separate 📷 Camera and 🖼️ Library
   buttons per photo slot — required for Samsung Internet, which skips the native
   chooser dialog).
2. Review/confirm screen before save.
3. **Direct write attempt**: assign next CollectionID, write row to the All table via
   the Graph Excel API, save photos into CoinPhotos named with that CollectionID —
   all in one step. CollectionID is only ever assigned at the exact moment the Excel
   write also succeeds — never assigned speculatively.
4. **Fallback**: if the write fails (workbook locked elsewhere, etc.), fall back to
   the existing Staging folder pattern instead — timestamp folder, generic photo
   names, blank collectionID. Nothing lost.
5. **Reconciliation** (assign ID → write Excel row → rename/move photos out of
   Staging into CoinPhotos/CoinReceipts → delete staging folder) is one shared
   function — runs instantly on save in the normal case, or later via a "pending
   coin" retry banner on the dashboard, which checks the Staging folder on load.
6. Batch orders / multi-coin receipts are explicitly OUT of scope for the app —
   that stays a Claude-chat + Copilot-paste workflow. The app's only role there is
   the "Batch receipt" capture action below.

### Post-save Albums matching (future requirement, not started — blocked on the write layer like everything else above)
When a coin is saved (via the flow above, not the reverse "tapped an open Album
slot" flow that already exists), the app should check Albums for a matching
open slot — Year + MintMark + Denomination + MajorVariety — and **offer** to
fill it; never auto-fill silently. Three cases:
- **Matching slot is open** → offer to fill it; Ray accepts or declines.
- **Matching slot is already filled by a different coin** → do NOT auto-replace.
  Surface both coins to Ray so he can make a manual "upgrade" decision (e.g. he
  found a nicer example of the same date/mint and wants to swap which coin sits
  in the album, moving the other one out).
- **No matching slot, or Ray doesn't want it in an album at all** (some coins
  are intentionally kept out — e.g. routed to a display Container instead, even
  when a slot exists) — this is a **choice Ray makes at save time**, not an
  assumption the app makes either way. Never assume "yes, fill it" and never
  assume "no, it doesn't go in an album" — always ask when a match exists.

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
- **Secondary, collapsed by default — Storage & Album**: Storage Location, Assign
  to Album (which album + which open slot), Additional photo.
- **Interaction pattern for the two secondary sections is drill-down, not an
  inline accordion**: tapping "Purchase Info" or "Storage & Album" replaces the
  top-level fields with just that section's fields (a back link returns to the
  top level). Once filled in and closed, the row shows a one-line summary of
  what was entered (e.g. "$45.00 · eBay seller") instead of the raw fields, so
  the top level stays short.
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
  the app (Add Coin, Browse Edit, Wishlist, Batch Receipt all currently just
  toast "nothing saved yet"): no real OneDrive/Graph API write layer exists
  anywhere yet. Once that write layer gets built, the crop-commit/original-
  preservation/display-fallback behavior is fully spec'd — see the crop
  commit / display rule under "OneDrive folder structure" above — not an open
  question anymore.
- **Splitting a combined image into two files uses the existing single-photo
  crop tool, unchanged — no dedicated splitter tool.** Run it twice against the
  same `_combined.jpg` source (once for the obverse region, once for reverse);
  see "OneDrive folder structure" above for the resulting filenames and the
  Obverse/Reverse update that follows.
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

### Coin-flip corner labels (locked in)
Text overlays in the open corner space around a coin's circular photo/disc,
styled like a collector's handwriting on a 2x2 flip (Caveat font, straight
horizontal — no rotation) — so the digital record and the physical flip carry
the same info in the same positions. This applies in two places, both using
the same corner mapping:
- **Add Coin (live entry)**: labels update live as the top-level fields are
  filled in. The underlying form fields stay the actual source of truth —
  this overlay never replaces them.
- **Saved-coin views (Dashboard Spotlight, Browse detail)**: once a coin is
  saved, its info is presented ON the photo as corner labels **instead of** a
  text block underneath — the photo is the display. A screen-reader-only
  summary (`.sr-only`, visually hidden) carries the same info as plain text
  so it isn't lost for accessibility; the visible corner spans are
  `aria-hidden`. **Superseded:** Browse's grid used to fall back to plain
  disc+text (labels "wouldn't be legible at that size") — it now gets the
  same flip-frame corner-label treatment too, at a smaller scale
  (`.flip-frame-mini`, 11px labels); see "Browse: Grid/List toggle" below for
  what that changed.
- **The flip-frame is capped at a fixed max size (280px square)**, not
  stretched to the container width, so the coin stays proportional to an
  actual 2x2 flip (coin centered, real margin around it) instead of looking
  tiny in an overly wide box on desktop. **The coin disc itself is sized to
  fill that flip proportionally to a real coin's share of a 2x2 flip** — a
  dollar (the largest denomination) fills ~75% of the frame width, scaling
  down by `DENOM_SCALE` for smaller denominations, floored at 70% for
  legibility as before. This applies everywhere the flip-frame is used
  (Spotlight, Browse detail, Add Coin's obverse/reverse frames) — base disc
  size is 210px within the 280px frame, up from an earlier, visually
  undersized 150px (120px on Spotlight, which was also inconsistent with the
  other two).
- **No "From the cabinet" eyebrow above the Spotlight flip-frame** — removed;
  it added a label above the coin that wasn't part of the flip-frame
  metaphor itself and wasn't needed.
- **Corner-label font bumped 20px → 25px** (too small to read on phone) and
  **max-width loosened 42% → 47%** of the frame (more crowding headroom before
  the shortening fallback needs to kick in at all) — both per Ray's real-device
  report. **`text-size-adjust: 100%` (with `-webkit-` prefix) is set globally
  on `html, body`** — mobile browsers (Samsung Internet included) can silently
  auto-boost rendered text size on narrow viewports past its declared
  font-size, which is exactly why corner-label truncation only ever showed up
  phone-side and never reproduced in desktop-engine viewport-width testing
  here; this locks rendered size to what's actually declared, everywhere.
- **Follow-up: slight right-side clipping on every corner (locked in)** — a
  second real-device report, after the fixes above, of text looking
  "slightly clipped" on the right edge in all four corners, including short
  single-line text (`1916-D`, `VG-8`) nowhere near `max-width`. Since
  `scrollWidth === clientWidth` in every reproduction attempt here (the
  shortening fallback never even triggers), this isn't genuine text overflow
  — the working theory is Caveat's cursive/italic glyphs (a trailing "y"
  swash, etc.) rendering ink slightly past their own measured advance width,
  or sub-pixel DPR rounding, either of which a flush `overflow: hidden` box
  clips immediately. Not reproducible in this environment's desktop
  Chromium — `.flip-label` carries `padding: 0 4px` as a safety buffer
  between text and the actual clip edge, without moving the label's anchored
  position (`top`/`left`/`right`/`bottom` are unchanged).
  **Second follow-up: left corners (TL/BL) confirmed fixed by the padding
  above; right corners (TR/BR) were still clipping.** Whatever's overshooting
  the box edge is evidently worse on the right-anchored/right-aligned side —
  `.flip-label.tr`/`.flip-label.br`'s `right` offset was pushed from `10px`
  to `18px` (on top of the existing padding) to give noticeably more
  clearance there specifically, rather than just adding more padding
  uniformly.
  **Third follow-up, resolved differently: still clipping on the right after
  both the padding and the extra offset.** Two rounds of "give it more room"
  didn't fix a problem that clearly isn't about room, so the padding/offset
  approach is abandoned — `.flip-label` and `.corner-line` had `overflow:
  hidden`/`text-overflow: ellipsis` removed entirely (back to the original
  `10px`/`10px` anchor offsets, no padding). The JS-side shortening
  (`renderTypeDenomCorner`, measured via `scrollWidth`/`clientWidth`, which
  doesn't depend on `overflow: hidden`) is what actually prevents unbounded
  overflow for the one field prone to being long (the series/type name); it's
  unaffected by this change and still verified working. Without a hard clip
  edge, any small real-device rendering overshoot now spills a few px into
  the surrounding empty corner space instead of visibly cutting off a
  character. Still not reproducible in this environment — confirm on-device
  before considering this fully closed. If it recurs, the next step is
  likely trying a different font for the corner labels rather than further
  box-model tuning, since two rounds of spacing fixes didn't hold.
- **Obverse is identification only — standard numismatic shorthand**:
  top-left Year+MintMark (`1945-S`); top-right **the series/type name and the
  coded denomination as two stacked, right-justified lines** (`Mercury` over
  `10C`, `Peace` over `$1`, `Franklin` over `50C`) — not one run-on line, and
  not the full spelled-out denomination. The series name is derived from
  `coin.name` by stripping a known denomination-word suffix (`seriesLabel()`
  — e.g. "Mercury Dime" → "Mercury", "Franklin Half Dollar" → "Franklin");
  bottom-left Grade+GradeSource (`MS-67 PCGS`); bottom-right Variety+
  Designation, **also as two stacked lines** rather than a comma-joined
  single line (`Micro S` over `FB`). **Exception: Browse's grid-mini cards**
  (see "Browse: Grid/List toggle" below) keep the top-right corner to just
  the denomination code, single line — the series name doesn't fit legibly
  at that much smaller scale and was truncating hard.
- **Two-line corner stacking is a general mechanism (`renderCornerLines()`),
  not a one-off for Type/Denom** — any corner combining two related values
  uses it, so the same crowding fix applies to Variety/Designation without a
  separate implementation. **The type/series line additionally shortens to
  its last word if the full name still doesn't fit even on its own line**
  (e.g. "Lincoln Memorial" → "Memorial") — measured against the actual
  rendered box (`scrollWidth` vs. `clientWidth`), not guessed from character
  count, so it only kicks in when genuinely needed. This measurement
  requires the element to already be visible/laid out — call sites that
  toggle visibility must do so *before* populating corner text, not after.
- **Reverse (Add Coin only — saved coins don't yet track Error/Price
  separately from the obverse display)**: only two conditional items —
  top-left Error, if set; bottom-right Purchase Price, if set (`$45.00`).
  Denomination/Grade shorthand are real ANA/Red Book conventions; this
  front/back split itself is **not** an official numismatic standard (none
  exists) — it's Ray's own preference, matching the price-sticker placement
  he sees at his local coin shop.

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
  `resolveCoinSetLink()` (matches the coin's own `setId` against a
  Denomination="Multiple" bundle row's OWN `setId` — **not** its
  CollectionID — excluding self, so a bundle viewed directly never links to
  itself → opens that bundle's own detail view through the same
  `showBrowseDetail()`). A coin can have an Album link, a Set link, both, or
  neither; all four cases render cleanly. Only one demo Set pair carries a
  `setId` today (Washington Quarter AY-00012 ↔ 2021 Silver Proof Set bundle
  AY-00018), matching how sparse real SetID population is (~28 of 386 rows) —
  most coins correctly show no Set link.
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
    the actual stored path directly (`CoinReceipts/{CollectionID}_receipt.jpg`
    per the documented naming convention), used as the link's `href` exactly
    the same "stored value used directly" way `certLink` is, not constructed.
    Row hidden entirely when Receipt is blank, same as every other row here.
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

#### Multi-coin Set display (locked in)
A Set-bundle row (`Denomination="Multiple"`) that has known component coins
renders each child's own coin-flip instead of the single generic
"Set / Multiple" flip. Built to fall back cleanly: a Set with no linked
children (the large majority — a real, intentional backlog, ~158 rows) keeps
today's single-flip display with zero visual change.
- **Child linkage — `originSetId`, a NEW field kept fully separate from
  Issue-3's `setId`.** These are two different relationships and must never
  cross-wire: `setId` (S-XXYY-TT-##) is Issue-3's "an individual owned coin
  *belongs to* this Set" chip linkage (`resolveCoinSetLink()`, matched against
  a bundle's own `setId`); `originSetId` (demo `OS-YYYY-XXX-##`) is "these
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
  grade corner labels + a series-name caption. `showBrowseDetail()` branches:
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

### Carried forward — not yet built (empty — all three Browse issues are done)
The three issues raised against the Browse restructure above are **all built,
committed, and browser-verified** — nothing is carried forward here anymore.
Kept as a heading only so a future session sees the queue is intentionally
empty rather than missing.
- **Issue 1 (Sets tab cards rendered side-by-side)** — fixed via
  `.coin-grid.sets-mode` (parallels `.list-view`'s own stacking rule, applied
  only while rendering the Sets tab, cleared by `renderBrowseGrid()` so it
  can't leak into Coins/Rolls).
- **Issue 2 (Value overlay on Coins-tab grid cards)** — fixed via
  `#browseGrid[data-tab="coins"]:not(.list-view) .coin-card .value {
  display:none }`, with `showBrowseTab()` setting `#browseGrid`'s `data-tab`
  attribute so Rolls (same `.coin-card`/`renderBrowseGrid()` path) and both
  tabs' list modes keep Value.
- **Issue 3 (comprehensive coin detail view + Album/Set linkage)** — built;
  see the expanded "Browse detail view" section above for the full mechanism
  (`renderBrowseDetailPanel()` restructured into always-visible key facts +
  a "Belongs to" Album/Set linkage section + inline `appendAccordion()`
  groups; `resolveCoinAlbumLink()`/`resolveCoinSetLink()`; sparse
  `setId`/`shippingCost`/`receipt` demo data). Verified in a real browser:
  Album linkage resolves via `Albums.FilledBy` (Lincoln Wheat Cent →
  Lincoln Cents album, opening at the cover), Set linkage resolves via `setId`
  and NOT CollectionID (Washington Quarter → 2021 Silver Proof Set bundle,
  which itself shows no self-link), the accordions collapse/expand, coins with
  no linkage omit the section cleanly, and Browse Edit is unaffected.

### Browse: Grid/List toggle (locked in)
A small icon toggle (grid icon / list icon) next to the filter row switches the
coin listing between the existing card grid and a plain list-row layout. Both
reuse the exact same card markup — list mode is a CSS rearrangement rather than
a separate render path, so the two stay in sync automatically. List mode drops
the coin thumbnail entirely (reclaims row width) and enlarges Year+MintMark so
it reads as the dominant, immediately-scannable element per row, with the coin
name and CollectionID secondary. The chosen mode persists across filter changes
within a Browse session.
- **Superseded: grid mode now uses a `.flip-frame-mini`** — a scaled-down
  version of the Dashboard/Browse-detail flip-frame (case background, corner
  labels overlaid on the disc: top-left Year+MintMark, top-right denomination
  code only, bottom-left Grade) instead of the earlier plain disc-then-text
  card, so a coin reads as the same coin whether it's spotlighted or browsed.
  The old plain name/meta/grade-badge text block still exists in the DOM
  (used by list mode, unchanged) but is hidden in grid mode now that the
  corner labels cover the same information.
- **Real-device fix: explicit 2-column layout at phone widths.** `.coin-grid`
  relied on `grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))` to
  size itself, which on at least one real Android device (Ray, Samsung S25)
  was collapsing to a single column — full-width stacked cards — despite the
  viewport comfortably fitting two 150px+ columns in every reproduction
  attempt here. A `@media (max-width: 480px)` rule now forces
  `grid-template-columns: repeat(2, 1fr)` directly at phone widths rather
  than trusting `auto-fill`'s computed count there; `auto-fill` is untouched
  above that width, where it was already producing 3+ columns without issue.

### Browse filters (locked in, superseded by "Browse: navigation restructure" below)
One filter row: `All / Cents / Nickels / Dimes / Quarters / Halves / Dollars`
(by Denomination), then a thin divider, then `Sets / Medals / Commemoratives`,
all multi-select/OR-combinable except "Sets," which was a separate exclusive
action replacing the coin grid with a picker of named **DB_Sets-style
entities** (`FAKE_SETS`, e.g. "2021 Silver Proof Set") each pointing at a list
of separately-owned member CollectionIDs — tapping a set showed just its
member coins. A coin's own `Set`/`Medals`/`Commemoratives` fields were tags
layered on an individually-catalogued coin, not mutually exclusive with each
other or Denomination (a coin could be both part of a Set and a
Commemorative, e.g. old AY-00014).
- **This whole model is gone as of the Browse navigation restructure below** —
  kept here only for history. The real bug that triggered the restructure:
  selecting "Sets" never un-highlighted "All," because Sets was never a peer
  value in the same underlying data as Denomination/Medals/Commemoratives —
  it was a different *kind* of thing (a navigation action) wearing a filter
  chip's clothes. Confirmed against the real workbook during the restructure:
  a coin's own Set-package tag isn't a reliable/real concept the way this
  section assumed — see below for what replaced it.
- Still true, unaffected by the restructure: half dimes / three-cent pieces
  will need their own Denomination code once catalogued (`5C` is already the
  modern nickel, so a half dime can't reuse it) — deal with it when the first
  one is catalogued.

### Browse: navigation restructure (locked in, supersedes "Browse filters" above)
Browse is now **four tabs: Coins | Rolls | Sets | Albums**, not one filter
row mixing Denomination with Sets/Medals/Commemoratives. `showBrowseTab()`
switches between them; `activeBrowseTab` only ever holds `coins`/`rolls`/
`sets` — **the Albums tab has no content of its own inside Browse at all, it
immediately calls `navigate("albums")`** and lands on the real, standalone
Albums page (same page reachable from its own nav item) rather than
rendering anything inline.
- **Root cause of the old bug, and the real signal that replaced it
  (confirmed against the workbook):** `SetID` is NOT a reliable "is this a
  Set" signal — 135 of 136 Set-category rows currently have a blank `SetID`
  (a known backlog, unrelated to this restructure, not something to fix
  here). The reliable signal is **Denomination="Multiple" combined with
  Category** being one of `Proof Set` / `Mint Set` / `Silver Proof Set` /
  `Reverse Proof Set` / `Legacy Collection` / `Prestige Set` / `Quarters Set`
  / `Educational Set` (and similar future values).
- **A Set is now one owned All-sheet row, period** — Denomination="Multiple"
  bought/logged as a single bundled purchase — not an aggregation of
  separately-catalogued member coins. This retires the old `FAKE_SETS`
  entity-with-member-coinIds model entirely (`renderSetsPicker`,
  `showBrowseSetsPickerMode`, `showSetDetail`, the `isSets` chip special-case,
  and their DOM — all removed, not just hidden). The parent/child CollectionID
  suffix system (`AY-#####-Set` / `-A` / `-B`, acquisition/provenance lineage
  under "ID schemes") was out of scope for *this restructure* — but child
  coins are now surfaced read-only on the Set detail view via the separate
  `originSetId` join (see "Multi-coin Set display" above). Still out of scope:
  breaking a bundle out into standalone owned child *rows* (children remain
  nested-only, not independently browsable/counted), and any in-app creation
  of that structure.
- **`category` is a new, single-valued All-sheet field** (confirmed against
  the workbook — a row is never simultaneously Category="Proof Set" AND
  Category="Commemorative") that **replaces two old fields**: the coin-level
  `setType` tag (a coin's own "which package" tag — retired, since Sets are
  bundle rows now, not a tag on an individual coin) and the `commemorative`
  boolean (Commemorative is just one possible Category value, on both
  individual coins — 22 real rows, single Denomination — and Set-bundle rows
  — 4 real rows, Denomination="Multiple").
- **`Denomination="Medal"` replaces the old `itemType` field entirely** — the
  real workbook has no `itemType` column; a standalone medal (never bundled
  inside a Set) carries Denomination="Medal" directly. Every place that used
  to read `coin.itemType === "medal"` (the Coins-tab Medals chip, the Stats &
  Value tile's coins-vs-medals breakdown) now reads `coin.denom === "Medal"`
  instead.
- **`RollID` is a new, distinct All-sheet column** (confirmed against the
  workbook, separate from `DB_Rolls`, which stays a product-reference table
  only, still not part of the main coin data) — an owned row with a populated
  `RollID` belongs to the Rolls tab. Rows with RollID carry a normal single
  Denomination each (not "Multiple") — a roll is still fundamentally
  one-denomination, unlike a Set bundle.
- **Coins tab**: unchanged Denomination pills (`Cents`/`Nickels`/`Dimes`/
  `Quarters`/`Halves`/`Dollars`) plus a new **Medal pill**, all multi-select/
  OR-combinable exactly like before (`BROWSE_FILTER_CHIPS`,
  `browseSelectedFilterKeys`) — this row's base row-set explicitly excludes
  Denomination="Multiple" (Sets) and RollID-populated (Rolls) rows, so a row
  never double-shows across tabs. Metal stays its own single-select row,
  unchanged. **Commemorative is now an independent boolean toggle**, not part
  of the Denomination OR-group — Category and Denomination are different
  fields, so "Dollars + Commemorative" is a real, meaningful AND (all three
  axes — Denomination/Medal, Metal, Commemorative — AND together;
  `applyCoinsTabFilters()`).
- **Sets tab**: Category pills — `Proof Set` / `Mint Set` / `Silver Proof
  Set` / `Other` / `Commemorative`, plus `All`. **Unlike the Coins tab, this
  whole row is single-select, not multi-select** — Category is the exact
  same single-valued field the pills read, so a row can never match two of
  them at once (`BROWSE_SET_CATEGORY_CHIPS`, same single-select interaction
  pattern as Metal). `Other` = any Set-category row not matching one of the
  three named pills or Commemorative (`Reverse Proof Set`/`Legacy
  Collection`/`Prestige Set`/`Quarters Set`/`Educational Set`/future values
  all land here; it deliberately excludes Commemorative-category rows, which
  are only reachable via their own pill). No Denomination filter on this tab
  — nearly all Set rows are Denomination="Multiple," so it wouldn't produce a
  meaningful split; deliberate, not an oversight. Cards reuse the existing
  box-icon `.album-card` style (`renderSetsGrid`) rather than the coin-disc
  treatment — a Denomination="Multiple" row has no single coin to render as a
  disc — and there's no Grid/List toggle (hidden while this tab is active).
  Tapping a card opens the same Browse detail view a Coins-tab card would;
  this row IS just an owned item now, nothing set-specific about its detail
  view.
- **Rolls tab**: plain list/grid of RollID-populated rows, no filter pills at
  all (low row count) — reuses the standard coin-disc card treatment exactly
  like Coins, since every roll row carries one normal Denomination.
- **Nav**: `Sets` is a full 6th persistent nav item, same standing as Albums
  — see "App structure" above. `Rolls` deliberately got no nav entry or
  Dashboard tile at all — reachable only by tapping its tab after already
  being in Browse.
- **Albums got an additive Denomination filter, nothing else changed there.**
  Each album already carries its own top-level `denom` field (every album is
  inherently single-denomination) — the new filter row just reads that
  existing field (`albumsFilterTest`), no new derivation logic was needed.
  Same multi-select-OR interaction as the Coins tab's Denomination row.
- **Explicitly out of scope for this restructure**: no in-app "Add Set" /
  "Add Roll" creation flow — display and filtering only, same boundary as
  Coins/Albums today. Real creation is hard-blocked on the CollectionID-
  reservation system and the OneDrive write layer, neither of which exist
  yet (see "Add Coin: the core workflow").

### Metal filter (locked in, pill set superseded below — mechanics still apply)
A second single-select chip row (`All Metals / Gold / Silver / Platinum /
Palladium`) sits directly below the Type row, filtering on precious-metal
content sourced from `Lookup_MetalContent`'s `SilverOz`/`GoldOz`/`PlatinumOz`/
`PalladiumOz` columns (`FAKE_METAL_CONTENT`, a sparse lookup by CollectionID
in the mockup — matches the `FAKE_COIN_DETAILS` pattern rather than adding
four mostly-zero fields to every coin row).
- **Qualification is ANY nonzero content, regardless of purity** — a 35%
  Silver War Nickel and a 90% Silver Morgan both qualify under "Silver."
- **Metal ANDs with Type** (superseded name for what the Coins tab now calls
  Denomination — `applyCoinsTabFilters()`, née `applyBrowseFilters()`, filters
  on `browseFilterTest(c) && browseMetalTest(c) && ...`, now with a third
  Commemorative-toggle term added by the Browse navigation restructure above);
  Metal alone (Type left on "All") shows every coin of that metal regardless
  of denomination/category.
- **This is its own independent single-select row, not a conversion of the
  Type row into multi-select.** The original spec for this feature described
  Type pills as OR-combinable ("tapping both Dollar and Half Dollar shows
  either") as if that already existed — it doesn't; Type is still explicitly
  single-select, "only one chip active at a time," per the section above.
  Converting Type to multi-select would be a real, separate interaction-model
  change to an already-locked-in pattern, not a side effect of adding a metal
  dimension, so it wasn't done here without a dedicated decision. Everything
  the feature actually needs (qualification rule, AND-combination with Type,
  Metal-alone browsing) works fully with Type staying single-select.
  **Superseded by the Type row's multi-select conversion above** — Metal
  stays single-select itself (unchanged), it just now ANDs against whatever
  combination of Type chips is active rather than a single one.
- **Composition detail lives in the coin detail panel, not the grid/list
  cards** — a new Composition row in `renderBrowseDetailPanel()`, e.g.
  "Silver — 0.7734 oz," hidden when a coin has no tracked metal content.
  Purity percentage isn't a separately tracked field in this mockup's data
  model (only Oz content) — the real `Lookup_MetalContent` table would carry
  that alongside the Oz figure.

### Metal filter: expanded to 7 categories (locked in, supersedes the pill set above)
The Metal filter pills now read a new, real field —
`Lookup_MetalContent.MetalCategory`, one of exactly 7 values: `Gold` /
`Silver` / `Platinum` / `Copper` / `Zinc` / `Clad` / `Other`
(`metalCategoryFor()`, still sourced from `FAKE_METAL_CONTENT` — same sparse
lookup, same CollectionID key, no new data structure) — instead of the old
precious-metals-only Oz-qualification rule.
- **A different, coexisting concept from Composition, not a replacement for
  it.** The Oz-based fields (`goldOz`/`silverOz`/etc.) and their "any nonzero
  content" qualification rule are untouched and still drive the detail
  panel's Composition row (and the new Specifications accordion — see
  "Browse detail view" above). MetalCategory is a single categorical bucket
  per coin covering **every** coin, not just precious-metal ones (a modern
  clad quarter gets `Clad`, not blank) — a different column doing a
  different job on the same row.
- **Still single-select** — combinable OR/AND filter behavior across axes
  (Denomination/Metal/Commemorative/etc. all combining freely) is a real,
  separate, not-yet-built spec item; explicitly out of scope here, not an
  oversight.
- **"Other" matches EITHER an explicit `Other` OR a blank/unset
  MetalCategory** — most rows will show blank/Other interchangeably until a
  separate research pass backfills the real column, and a genuinely unset
  category has to land somewhere or it becomes unreachable via any pill.
- **Supplementary info per pill, hover or tap** — each pill carries a native
  `title` attribute (free desktop hover) listing that bucket's constituent
  compositions (`METAL_CATEGORY_INFO`, a static reference object, not
  per-coin data), e.g. Silver → "90% Silver, 99.9% Silver, 40% Silver, 35%
  Silver (War Nickel)." Hover doesn't reach touch devices, so tapping a pill
  (which already selects it as the active filter) also fires the existing
  `showToast()` with the same text — reusing the toast mechanism already
  established elsewhere in this app for exactly this "brief, non-blocking
  supplementary info" role, rather than a new popover component.
- **Sparse by design, same as everything else in this mockup** — only coins
  with a real, known composition got an explicit MetalCategory assigned
  (mostly Silver, a couple of Copper/Clad examples); Gold/Platinum/Zinc have
  zero demo coins today since none of this collection's placeholder rows are
  actually gold/platinum/zinc coins — left genuinely absent rather than
  faked, same as the "most rows blank until research" expectation.

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

### Direct-write vs. Staging (locked in)
A second Excel tab, **Staging**, mirrors All's exact columns plus one
addition, `StagedDate`. It's a genuinely separate array/tab from All (not a
status flag within All) so normal All/Browse browsing is never cluttered
with in-progress entries — `FAKE_STAGING` in the mockup, kept apart from
`FAKE_COINS` the same way.

**Confidence is driven purely by Variety recognition** (`isConfidentMatch()`
→ `isVarietyRecognized()`, see "Error and Variety" above) — a DB_Coins *miss*
(no catalog row at all for that Year+MintMark+Denom) is a separate,
pre-existing concern (the warning banner + Needs Attention queue above) and
does **not** by itself block a direct save; only a manually-typed Variety
that doesn't match the current filtered dropdown options does. Designation
is never part of the confidence check either (see below) — these three
checks are independent, even though an unrecognized Variety and a DB_Coins
miss often happen to coincide in practice.

**Save options**, presented together in Add Coin:
- **Save to Database** — primary/default, shown only when confident. Assigns
  a CollectionID and writes (in the mockup, pushes) directly into All.
- **Save to Staging** — always available as a manual override even when
  confident (Ray may want a second look before it's final), and the *only*
  option shown when not confident.
- Both destinations reserve a CollectionID at the moment of that save (not
  deferred) via `getNextCollectionId()` — **this scans All and Staging
  together**; there was no "next available CollectionID" logic anywhere in
  the codebase before this, so it's one function checking both arrays from
  the start rather than something that needed updating in several places. On
  Staging rejection (not yet built — promotion/rejection UI is future work),
  a deleted Staging row's CollectionID becomes available again for the next
  `getNextCollectionId()` call, same as the AY-00470 reservation/release
  precedent from ProjectPlan history.

**Designation handling**: unspecified Designation at entry time does not
block a direct write — it defaults to linking the base/parent (non-designated)
CoinID. A **later edit** that adds/confirms Designation (Browse Edit's
bounded Designation field) re-checks DB_Coins for a Designation-specific row
via `checkDesignationReresolution()`. If 0 or 1 DB_Coins rows share the
coin's base Year+MintMark+Denom+Variety key, there's nothing ambiguous —
resolve straight through. **If 2+ rows share that base key, always surface
the same "pick one" UI used for PCGS label ambiguous matches
(`renderAmbiguousMatchList()`, factored out to be shared by both) — never
auto-resolve silently, even if one candidate's Designation happens to match
exactly.** This is a firm rule, not a preference: several real data bugs in
this project's history trace back to exactly this kind of silent/assumed
resolution (the 2019-W Lincoln Cent CoinID collision, a Morgan/Peace
mislink) — ambiguous matches always need a human's eyes. `FAKE_DB_COINS` now
carries a `designation` field per row, including a deliberate ambiguous pair
(1909-S plain Lincoln Wheat, RD vs. BN) kept as real test data for this
exact scenario rather than collapsed into one row.

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
second one. `FAKE_GRADING_HELP` is a sparse structural stand-in (currently
`Lincoln_Wheat` and `Morgan`, matching `FAKE_REFERENCE_IMAGES`'s placeholder
keys) holding clearly-labeled placeholder text, not real grading criteria — a
series with no entry shows a plain "no grading guidance on file yet" fallback
instead. **Hard copyright constraint**: this must never reproduce ANA's
grading-guide text or PCGS's Photograde images — the modal only ever
summarizes-and-links to their own public reference pages (PCGS PhotoGrade,
NGC Grading Standards), the same hotlink-only posture as the rest of PCGS
integration under "External data sources" below. Actually researching and
writing real per-series grading guidance is a separate, deferred task — same
boundary as DB_Coins scope and ANACS/ICG/CAC label research above.

### Needs Attention queue (locked in, renamed from "Needs DB_Coins Entry")
Framed as a general discrepancy-tracking hub — "where any discrepancy gets
identified, worked, and tracked" — not something narrowly scoped to DB_Coins
misses. The only concrete content today is still coins saved without a DB_Coins
match (flagged automatically, shown with a live count badge), and resolution is
unchanged: Claude research + Copilot adds the DB_Coins row. The broader framing
is intentional headroom for other discrepancy types later (nothing else feeds
this queue yet) — don't assume every row is a DB_Coins miss when extending this.

### Stats & Value (locked in)
A dedicated Dashboard tile/tab, not front-loaded cards on the Dashboard itself
(see "App structure" above for that distinction). Shows: total item count (with
a coins-vs-medals breakdown), total spent, total estimated value, net gain/loss,
and a by-Denomination breakdown (count + value, one row per denomination with a
proportional bar). Depends on a new **Cost** field on the All sheet (purchase
price) alongside the existing estimated-value field — needed for the spent/value/
net-gain numbers to mean anything; today's Cost values are placeholder data, not
pulled from the workbook.

## Editing existing coins (bounded)
App CAN write directly to: Grade, GradeSource, SerNo, Designation, Storage Location,
and can attach additional photos/receipts to an existing coin at any time. App CANNOT
do anything requiring research or judgment (new PCGS# lookups, album slot matching,
restructuring, cost allocation) — those stay chat + Copilot tasks. This is the exact
scope of the Edit button on Browse's coin detail view (see "Browse detail view"
above) — it doesn't expose any field beyond this list. A Set-bundle row
(`Denomination="Multiple"`) gets a different, separate Edit Set form instead
(Storage/Container, Value, Purchase Details) — see "Browse detail view" above;
coin-membership editing for a Set is explicitly out of scope, parking-lot item.

Every app-made write (add or edit) sets a **Reviewed** column on All to
blank/unchecked. A human sets it checked after glancing at it.

## Quick-capture notes → ParkingLot
Floating capture button anywhere in the app (typed or phone dictation). Auto-captures
timestamp, current screen, and CollectionID if one was being viewed. Writes a new
ParkingLot row (same lock/fallback pattern as coin writes): Source, Screen, Related
CollectionID, Status (Open), plus the note text.

## Batch receipt capture
Separate dashboard action from Add Coin. Photographs a receipt, saves to
CoinReceipts with a timestamp name, auto-generates a ParkingLot note pointing at that
exact file. The app cannot reach back into OneDrive on Claude's behalf later — the
photo still has to be manually brought into a chat to actually process it. The note's
job is just making sure nothing gets lost or forgotten, not eliminating that step.

## External data sources — what's safe to hotlink vs. not
- GreatCollections, PCGS, and similar sites generally block cross-origin image
  fetching — don't build automated image pulls from them. Manual save-then-Library-
  upload is the supported path (already works, no new feature needed).
- PCGS has a public REST API but only via OAuth password grant, which would require
  the app to handle Ray's raw PCGS credentials in public client-side code — not
  building this. Use plain hotlink buttons to PCGS's own cert/pop-report/account
  pages instead (Ray logs in directly on PCGS's site, never through this app).
- OneDrive/MSAL uses a proper redirect-based OAuth flow, which is why it's safe —
  Ray's password never touches this app's code. This is NOT true of most other
  services; don't assume another service's login can work the same way without
  checking whether they support a redirect/authorization-code flow first.

## App structure
Single-page app shell, one MSAL redirect URI, internal navigation: Dashboard /
Browse / Albums / Sets / Wishlist / Add Coin. Name: "Salty's Cabinet." Batch
Receipt, Stats & Value, and Needs Attention are dashboard-only destinations,
not persistent nav items. **Superseded: the persistent bottom/side nav is now
six items, not five** — `Sets` was added as a full persistent nav entry (see
"Browse: navigation restructure" below), same standing as Albums; the
Dashboard's "Go To" tile grid is generated from the same nav-item list, so
Sets automatically got a Dashboard tile too, the same way Albums always has.
Rolls, by contrast, deliberately got neither a nav entry nor a Dashboard
tile — it's reachable only via its own tab inside Browse.

### Initial splash screen (framework only, locked in)
On load, a full-screen branded splash (`#splashScreen`) covers the app —
"Salty's Cabinet" title, a spinning coin disc, and a "Connecting to
OneDrive…" status line — while a (currently simulated) connection is
established, then fades out to reveal the Dashboard underneath. There's no
real Graph API connection to wait on yet, so `runSplashConnect()` just runs a
timed delay (`SPLASH_SIMULATED_DELAY_MS`, 1.4s) rather than an actual health
check; the rest of the app has already rendered underneath by the time this
runs, since it's wired in after the normal synchronous init sequence — the
splash is purely a visual cover, not a gate blocking anything else from
initializing. **Error state**: shows a "Couldn't connect" card with
placeholder/minimal troubleshooting text and a Retry button — establishes
that this path exists and is handled, not that it's polished (real reasons —
sign-in expired, offline, workbook locked elsewhere, etc. — come once a real
connection exists to fail). Since nothing can actually fail yet, the error
path is only reachable via a dev-only `?splashError=1` URL param, not a real
trigger condition — remove this toggle once a real connection check replaces
the simulated delay.

Dashboard still has no summary stat cards on the front itself (Total Coins /
Est. Value inline were tried and dropped early on — not useful up front). That's
a different decision from having a **dedicated, opt-in Stats & Value tab**
reachable via a tile (see below) — the tab is fine, front-loading its numbers
onto the Dashboard directly is what was rejected.

Dashboard composition: pending-coin banner (only when one exists), Spotlight,
then a single flat **"Go To" tile grid** — Browse, Albums, Wishlist, Add Coin,
Stats & Value, Batch Receipt, Needs Attention, all as equal tiles. There used to
be a separate "Quick Actions" section below the Go-To grid for Batch
Receipt/Needs Attention — that's gone; everything reachable from the Dashboard
now lives in one grid rather than two visually separate tiers. Needs Attention
carries a live count badge on its tile, same as before.

**Spotlight auto-rotates a coin's own obverse then reverse before advancing to
the next coin** — not straight from coin to coin every tick as before. Same
placeholder disc (no real photos yet), visually distinguished by a mirrored
highlight position (`.reverse-face`) so it reads as "the coin turned over"
rather than a different coin; corner labels (Year-Mint/Series+Denom/Grade)
stay the same on both faces since they describe the coin, not which face is
showing. Clicking a dot jumps straight to that coin's obverse.

**The Spotlight flip-frame itself is click-through** — tapping the
currently-displayed coin (read live off `spotlightIndex` at click time, not a
value captured once at init, since the carousel keeps rotating) opens that
coin's Browse detail view, same `showBrowseDetail()` destination as clicking
a coin from Browse. Back returns to the Dashboard (`browseDetailBackHandler`
set to a Dashboard-specific closure before navigating), not Browse's own
grid — same per-origin back-handler pattern Albums' filled-slot tap already
uses.

Wishlist mirrors Browse's grid-then-detail shape: tapping an item opens a detail
view with an editable Notes field (for things like "found one, negotiating
price"), plus Purchase Info and Photos drill-down sections for once Ray's
actually bought it. This does **not** promote/convert a Wishlist item into an
owned coin with a CollectionID — that's a separate, unbuilt feature; the detail
view just lets a want-list entry carry richer information while it's still a
want-list entry.

A **"🔎 Found it — Add to Collection" button** on the Wishlist detail view jumps
to Add Coin and prepopulates Denomination/Year/MintMark/Variety from the
Wishlist item's structured fields (`denom`/`year`/`mint`/`variety` — Wishlist
rows need these alongside the existing free-text `desc`/`notes` display
string). Description is left to the existing auto-fill mechanism rather than
parsed out of `desc`, since `desc` is a full display string ("1916-D Mercury
Dime"), not a clean series name. This still doesn't convert or remove the
Wishlist item — same non-promotion boundary as above; it just saves retyping
what the want-list entry already knew.

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

### Albums: page-flip book (locked in, supersedes the device-tiered/deferred notes below)
Opening an album no longer shows one flat scrolling list of all its slots.
It's a page-flip book, page sequence: **cover** (icon, name, fill progress) →
**history/facts page** (a short blurb per album, Red-Book-style — set origin,
notable design changes, etc.; a static `history` string per `FAKE_ALBUMS`
entry today) → then the slots in fixed-size groups (6 per group), each group
shown as **obverse**, then **reverse** of that same group, before the next
group's obverse starts. (Obverse/reverse here just toggles the placeholder
disc's mockup styling — see Spotlight auto-rotate below — there's no real
per-slot photo yet.)
- **Screen width decides one page at a time vs. a two-page spread** — under
  900px width shows a single page; at/above it shows two pages side by side
  with a book-spine visual seam between them, matching how many pages
  actually exist (the last odd page shows alone even in spread mode).
- **Physically accurate book model, not just a generic pager (locked in,
  refines the initial page-flip build)**: the cover (page index 0) is a
  standalone sheet-front — **closed, only the cover is ever visible**, even at
  spread width; it's never paired with the page behind it, same as a real
  closed book. Opening it reveals the **back of the cover — the History &
  Facts page** — which in a two-page spread sits on the **left**, paired with
  the **first coin group's Obverse on the right**. Past that, spread pairing
  continues in twos starting at page index 1: (1,2), (3,4), (5,6)... —
  computed by `computeVisibleIndices()`, not a naive `[i, i+1]` pairing (which
  would have wrongly spread the cover with History on first open).
- **Reverse pages mirror in reversed left-right order only — row order top-to-
  bottom stays fixed.** `.book-slot-grid` uses a **fixed column count per
  breakpoint tier** (3 across single-page, 6 across spread), not the
  responsive `auto-fill` it originally shipped with — a real album page has a
  fixed number of slots per row, and fixing the count is what lets
  `reverseWithinRows()` chunk a page's 6 slots into actual rows and reverse
  each row's contents independently. (An earlier version reversed the whole
  flat 6-item array, which also swapped which row's coins landed on top vs.
  bottom — since a page's row boundaries can't be known from a responsive
  `auto-fill` column count, fixing the count per tier was the fix, not a CSS
  mirroring trick.) At the spread tier's 6-across single row, there's only one
  row to begin with, so the reversal is trivially row-order-safe there.
- **Navigation**: prev/next arrow buttons, plus swipe (touchstart/touchend,
  ~50px threshold) on the page area. In single-page mode these step by one
  page at a time; in spread mode they step by whole pairs
  (`nextAlbumPageIndex()`/`prevAlbumPageIndex()`), always landing back on a
  valid pair boundary (or on the lone cover) rather than an arbitrary index.
- **Rigid, binder-ring page-turn animation (locked in, spread mode only)**: a
  real page turn — pages pivot around a fixed central vertical axis (the
  spine), like a ring binder or book, never an accordion/fan-unfold with a
  growing gap between panels. `turnAlbumPage(direction)` gives only the slot
  whose content is actually changing a `.book-turn-slot` wrapper containing,
  stacked via **z-index** (not DOM order — this is what makes both directions
  work correctly without swapping markup order): the newly-revealed static
  page underneath (a different leaf, already sitting there per the existing
  leaf-pairing model — never rotates), and `.leaf-turn` on top (`perspective`
  on `.book-pages`, `transform: rotateY()`, `backface-visibility: hidden`),
  front face = what was showing in that slot, back face = what settles there.
  Its `transform-origin` is fixed at the spine (the shared edge between the
  two slots), so it sweeps in true 3D onto the *other* slot's own rectangle —
  it never floats apart from it. The sibling slot (not changing) renders
  plain, static, non-rotating content. **Superseded:** an earlier version
  placed the leaf in the wrong starting slot (the one it was turning *into*
  rather than *out of*) with no z-index guarantee over its sibling — this
  produced an accordion/fan-unfold look (panels separating with a growing
  gap) instead of a binder-ring turn; both the starting-slot placement and
  the z-index are what actually fix it, confirmed via direct measurement that
  the gap between the two slot boxes stays constant (the normal `.book-pages`
  gap) throughout the animation in both directions, never growing.
  **Single-page mode never animates at all** — tapping next/prev there is an
  instant content swap, no rotation, no transition; too narrow to show a
  spine. **The lone-cover ↔ first-spread boundary is also an instant swap**,
  not animated — it's a genuine page-*count* change (1 page becoming 2 or
  vice versa), not a same-shape turn, and a closed book's cover has no real
  left/right side to hand off between, so attempting to animate it produced a
  duplicated-cover artifact; every ordinary 2-page ↔ 2-page turn still gets
  the full animation. Buttons disable for the ~0.65s duration
  (`albumTurnInProgress`) so a real click can't land mid-turn; the real DOM
  (with all click handlers rebound) only replaces the transient animation
  markup once `transitionend` fires. Direct-open (tapping a slot elsewhere in
  the app) still calls `renderAlbumBook()` straight, no animation.
- **Column count and disc size are computed, not fixed (locked in)**: the
  goal is fitting as many coins per row as the available space allows at
  each breakpoint while keeping the coin image and its caption legible — not
  matching any particular target count or physical folder reference (an
  earlier pass tried to reason from real Littleton folders' actual coin-per-
  row count; that framing was wrong and is dropped). `computeAlbumGridLayout()`
  finds the largest column count that keeps each disc at or above a
  legibility floor (currently 52px), then sizes discs to fill the row exactly
  (capped at a comfortable maximum, 64px) — both applied via CSS custom
  properties (`--slot-columns`, `--slot-gap`, `--slot-disc-size`,
  `--slot-disc-font`) on the grid element. `albumPageContentWidth()` derives
  the real available width from one live measurement
  (`#albumsDetailContainer`, which persists across re-renders) plus fixed,
  file-owned CSS constants (book-pages gap, page padding/border, page
  max-width) — one verified measurement plus known local constants, rather
  than stacking multiple unverified assumptions the way the original
  hardcoded 6-column/64px layout did (confirmed via measurement to overflow
  by ~51px at that fixed size). Verified via direct measurement to produce
  zero overflow from a 360px phone through a 1920px desktop viewport.
- **Coins-per-page is computed, not fixed (locked in)**: same "fill the
  space available, don't push to a new page unnecessarily" principle as
  columns, extended to the whole page rather than just one row.
  `computeAlbumChunkSize()` derives rows from real available vertical space
  (`computeAlbumPageRows()` — one live measurement of `#albumsDetailContainer`'s
  position plus fixed, file-owned constants for the page padding/border, the
  page-side-label line, and the book-nav controls, same one-measurement-plus-
  known-constants approach as the width side) and multiplies by the computed
  column count, replacing the old fixed `ALBUM_PAGE_CHUNK = 6`. This is
  computed once, when an album is opened (`openAlbumAtPage()` now shows the
  detail container *before* measuring it, since `computeAlbumChunkSize()`
  needs real layout to read from) — not re-computed on every resize, matching
  how the rest of the book's pagination is already decided once at open time;
  resizing after opening can leave a page sized for a since-changed viewport,
  an accepted minor cosmetic tradeoff rather than a live-reflowing pagination
  engine. A small album (e.g. 8 slots) that fits entirely within one page's
  computed capacity now gets exactly one Obverse/Reverse page pair instead of
  being split across two pairs just because 8 > a fixed 6.
- **Trailing blank page + back cover (locked in)**: `buildAlbumPages()` now
  always appends a `blank` page after the last Reverse page, followed by a
  `back-cover` page. From index 1 onward, pages always come in twos (History+
  Obverse, Reverse+Obverse, ...) — without a trailing blank, the final
  Reverse page had nothing to pair with and rendered alone at full single-
  page width even in spread mode, visibly larger than every properly-paired
  half-width page before it. One blank page always restores the even count
  regardless of how many coin-group pairs an album has. The back cover is
  standalone (never paired), reusing the front cover's exact styling
  (`.album-page-cover`) — same "closed, no real left/right side" treatment,
  so the length-mismatch transition into and out of it is correctly an
  instant swap via the existing `oldIndices.length !== newIndices.length`
  check, no changes needed there. The blank page is framework for future
  additional content (a placeholder note says so today) — its real job right
  now is the pairing fix, not a real feature yet.
- **Reverse-side coin order only mirrors Obverse in spread (two-page) mode**:
  `reverseWithinRows()` is still correct and still runs, but only when
  `spread` is true — in single-page mode, Obverse and Reverse are never seen
  side by side (you flip forward to Reverse as its own separate screen), so
  there's nothing for a mirrored order to actually demonstrate; Reverse just
  keeps the same left-to-right order as Obverse there. In spread mode the
  mirroring still matters: the left (Reverse) page of a two-page spread
  should read as the mirror of the no-longer-visible Obverse side of those
  same coins, since a real sheet flips left-right when turned over.
- **Superseded:** the earlier device-tiered plan (phone = plain scrollable
  list; tablet = circular slot grid; desktop = grid with real photos inline)
  is gone — the book's fixed-size-page grid layout is now used at every
  width, since a bounded 6-slot page is legible at any size and the old
  "simple list on phone" mode doesn't fit a paginated-book metaphor. The
  animated-page-flip-deferred and cover/history-page-deferred notes that used
  to live here are done, not deferred, as of this feature. The very first
  version of this feature paired pages naively (`[i, i+1]`) regardless of
  content — that's superseded by the sheet-accurate pairing above.

### Littleton folder visual style (locked in)
Every album currently gets a distinct cosmetic treatment from the rest of the
app's dark UI — cream/tan cardboard interior pages with navy printed folder
typography and die-cut circular holes, plus a visually distinct darker-brown/
copper cover — instead of the dark disc/case look used elsewhere in the app.
- **Which albums get it**: an album-level `folderStyle` field
  (`"littleton"` today for every `FAKE_ALBUMS` entry) drives whether the
  look applies, scoped via `.littleton` page and `.littleton-slot` cell
  modifier classes (never a base-class change) so nothing here touches any
  other view in the app. **Superseded:** this was originally gated on a
  populated DB_Sets `MfgProductID` (Numis-style/non-manufactured albums would
  stay dark-UI) — Ray's call is now to apply the look to every album
  regardless of `MfgProductID`, until told otherwise. `folderStyle` stays a
  real per-album field either way (not hardcoded away) in case a future album
  ever needs a different look again. `mfgProductId` (e.g. `"LCF19"`) is still
  stored per album where it's actually known, purely as future metadata (e.g.
  eventual per-product individualization) — it doesn't drive any visual
  difference today.
- **Demo album**: `FAKE_ALBUMS`'s third entry ("Jefferson Nickels — Littleton
  Folder Vol. 3") is a generic placeholder — no real Littleton folder has been
  chosen yet (Ray's Volume 2 selection is still pending). Swap its name/date-
  range/`mfgProductId` for the real folder once chosen, same stand-in pattern
  as `FAKE_REFERENCE_IMAGES`/`FAKE_GRADING_HELP`.
- **Cover is visually distinct from the interior pages (locked in)**: darker
  brown background with copper-colored lettering, vs. the cream background
  and navy print on history/coin interior pages — a folder's outer cover is a
  different material in real life (heavier cardstock/leatherette) from its
  printed inside pages, and the two looks are meant to read as different
  surfaces, not one continuous skin.
- **Leather texture + gold filigree frame (locked in, Ray's request)**: two
  faint crosshatched `repeating-linear-gradient` layers under the base brown
  gradient approximate a tooled-leather grain; a gold outer border plus an
  inset `::before` frame line approximate a filigree border without needing
  real vector artwork; a small ❦ flourish glyph anchors the bottom edge. CSS
  approximation only — real ornate scrollwork would need actual SVG/image
  assets, which is a possible future upgrade if this doesn't read rich enough
  on a real device. Applies to both the front and back cover (they share the
  same `.album-page-cover.littleton` styling).
- **Back cover (locked in)**: the book now ends on a standalone back-cover
  page (same treatment as the front cover, reusing `.album-page-cover`) after
  a trailing blank page, rather than dead-ending on the blank page.
- **Die-cut holes** (`renderSlotCell()`, `.coin-disc.die-cut`): an **owned**
  slot always shows a coin glyph seated in the hole with a thin light inner
  ring where it meets the cardboard — never bare year text (unlike the old
  dark-UI look, which fell back to plain year text when no reference image
  existed). If there's a real photo or series reference image, it shows
  normally; if not (owned, photo pending), the same glyph shows
  **desaturated/faded** (`opacity`, `grayscale` filter) so it reads as "owned,
  waiting on a photo" rather than looking identical to a genuinely empty
  hole. An **unfilled** slot (`.die-cut-empty`) shows no coin, no placeholder
  icon at all, no "?" — just a plain shadowed punched hole, matching how an
  unfilled real folder slot actually looks.
- **Caption**: date + mintmark only under each hole (`.slot-label`) — the
  second `.slot-meta` description line is dropped entirely, matching real
  folder printing.
- **Key-date marker**: the gold glowing-star treatment is restyled to a
  small navy printed star + ring, fitting the printed-folder look rather than
  a glow.
- **Reference photos were for color/material only, not the page-turn
  mechanic (important correction)**: real Littleton folders physically
  unfold accordion/fan-style flat on a table — that look was mistakenly
  carried over into an early version of the page-turn *animation* itself
  (see the binder-ring page-turn note above for the fix). The reference
  photos only ever governed the cream/navy/die-cut *look*, never the
  interaction/motion.

### Series-level reference images (locked in — framework only, real assets still open)
Any owned coin with no real Obverse/Reverse photo of its own now falls back
to a **generic reference image for its series**, rather than the bare
placeholder disc, wherever a coin renders at photo size (Spotlight, Browse
detail, Browse grid, Albums' filled slots) — `applyDiscContent()`/
`renderSlotCell()` check owned-photo-first (never true in this mockup, since
no real photo persistence exists — see "What NOT to build"), then
reference-image-second, then the bare placeholder third.
- **One image per series, reused across every year/mintmark — no exceptions,
  not even for visually-distinct varieties** (e.g. 1909-S VDB reuses the
  plain Lincoln Wheat image). No date/mintmark is ever baked into the image
  — the flip's own corner text already covers that, and a dated image could
  visually contradict it for a coin of a different year. This was
  deliberately kept exception-free to avoid reopening the exact scope
  question it was meant to close; revisit only in a future round if needed.
- **SeriesName key = `DB_Coins.Description` exactly, sanitized for
  filesystem-safe characters** (`sanitizeSeriesName()`) — the canonical join
  key, not `seriesLabel()`'s display-only corner abbreviation, which can
  drift from it. **`Description` text is series-specific and must never be
  assumed or derived — only looked up.** There is no reliable shortcut (no
  "always/never includes the denomination word" rule, no consistent
  parenthetical-vs-plain pattern) — it's whatever text actually sits in that
  column for that series, confirmed against the real workbook, full stop.
  (Superseded: an earlier version of this note claimed Description "never
  includes the denomination word," generalizing from one example — a claimed
  "Buffalo Nickel" → "Buffalo (Indian Head)" contrast that was never actually
  verified against the workbook and turned out to be wrong; dropped rather
  than repeated here. Confirmed against the real workbook instead: Lincoln
  Wheat Cent, Morgan Dollar, Barber Quarter, Buffalo Nickel, and Washington
  Quarter (the classic pre-1999 series, distinct from the 2007 "State -
  Washington" quarter) all include the denomination word in their real
  Description. None of this is guessable from the coin's own
  `name`/denomination — `seriesLabel()`'s suffix-stripping is a display-only
  abbreviation, never a stand-in for a real Description lookup.) This matters
  doubly since Ray will sometimes name Canva-made fallback files by hand — one
  canonical source avoids the app and the uploaded files disagreeing.
  **Caveat:** this mockup's `FAKE_COINS` rows don't carry their own
  Description field the way the real All sheet will. `referenceSeriesKey()`
  used to paper over that gap by falling back to `seriesLabel()` — exactly
  the guessing this note now warns against, since `seriesLabel()` is a
  display-formatting function (see above) with no relationship to the real
  Description column. That fallback is removed: `referenceSeriesKey()`
  returns `null` for a coin with no real `description` value, and every
  caller (`hasReferenceImage()`, `applyDiscContent()`, `renderSlotCell()`)
  treats a `null` key as "no reference image" rather than fetching against a
  fabricated one. Practical effect in this mockup: since no `FAKE_COINS` row
  carries a real `description` today, no coin shows a reference image yet —
  that's correct, not a regression to fix, until `FAKE_COINS` (or the real
  All sheet) actually carries confirmed Description values per coin.
- **Storage convention (superseded — now wired to a real read, see "Real
  Graph API reads" above): flat folder, no obverse/reverse subfolders.**
  ```
  CoinCollection/ReferenceImages/{SeriesName}_obverse.png
  CoinCollection/ReferenceImages/{SeriesName}_reverse.png
  ```
  e.g. `Lincoln_Wheat_obverse.png`. This replaced an earlier draft convention
  that subfoldered by side (`.../obverse/...`, `.../reverse/...`) — that
  layout is dropped, don't build against it. `{SeriesName}` is exactly
  `sanitizeSeriesName()`'s output (alphanumeric + underscores, case
  preserved) — matches what the real fetch code constructs, so a file must be
  named with this exact casing to be found.
- **Real asset sourcing is a separate, still-open task, not resolved by this
  framework pass.** For modern currently-sold Mint products, attempt an
  official U.S. Mint product render first (federal work, not copyrighted) —
  hotlink/fetch restrictions still need verifying. For historical series (the
  majority of this collection), no official render exists — propose a
  candidate and get Ray's approval before treating it as final; if rejected,
  Ray provides a Canva-made replacement via the same folder/naming
  convention. Display logic is source-agnostic — doesn't matter whether an
  image came from the Mint, was AI-generated, or hand-made, as long as it's
  in the right place with the right name.
- **Superseded: the fallback used to be demonstrated via a `FAKE_REFERENCE_IMAGES`
  boolean stub** (Lincoln Wheat and Morgan hardcoded `true`, rendering a
  visually-distinguished stand-in — desaturated, dashed-ring disc, generic 🪙
  glyph instead of the year — so it couldn't be mistaken for real approved
  art). That stub is gone — see "Real Graph API reads" above. The app now
  checks Ray's actual `CoinCollection/ReferenceImages/` folder for real
  `{SeriesName}_{obverse|reverse}.png` files; a series shows the 🪙 glyph only
  while its check is still in flight or unresolved (no token yet), and the
  bare year-number disc once it's confirmed no file exists there — whether a
  given series shows a real photo now depends entirely on whether that file
  actually exists in OneDrive, not on any code stub.

## What NOT to build
- AI photo pre-fill from receipts/coin photos — shelved permanently. Redundant with
  free chat-based photo analysis Ray already gets through his Pro subscription.
- Batch order entry UI in the app — stays a chat + Copilot workflow.
- Live PCGS account login — see External data sources above.
- localStorage/sessionStorage for anything that matters — use OneDrive as the
  actual store; the app should be re-derivable from OneDrive state at any time.

## Full design history
For the complete session-by-session reasoning behind these decisions, see the
project's Claude.ai knowledge base (Project: "Coin Collection"), particularly
`coin-collection-session-10Jul2026-app-design.md`. This file is the working
summary; that one has the "why."
