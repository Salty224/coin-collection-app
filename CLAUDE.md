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

## Merge policy (standing rule)
Auto-merge feature branches to main at the end of a task by default — don't wait
for Ray to explicitly ask each time. **Exception:** large/architectural/
cross-cutting work (e.g. the CollectionID-reservation system) stays held on its
branch — wait for Ray's explicit go-ahead before merging that class of work, same
as before this policy existed.

## Clarifying-question format (standing rule)
Never use an interactive multiple-choice question tool/prompt on Ray. Always ask
clarifying questions as plain, copy-pasteable text in the chat response instead —
he discusses them with Claude (chat) separately and brings back answers to all of
them at once, which an interactive per-question picker doesn't allow for.

## Regression suites are COMMITTED (locked in — supersedes the scratchpad convention)
`verify_*.js` suites live in **`tests/`, in the repo**, and are run with
`npm test`. This **supersedes the long-standing "scripts live in per-session
scratchpads" convention** referenced throughout this file — every earlier
mention of that convention is history, not current practice.

**Why it changed.** A suite that cannot be re-run is not a regression suite;
it is a one-time acceptance check. It validates the session that wrote it and
protects nothing afterward. The cost was real, repeated, and documented here
several times over: the photo-gallery-crop branch could not re-run anything
and substituted a nav smoke check; there is still a tracked item to *rebuild*
a suite already written once (self-sized at 60–100 assertions,
half-a-day-to-a-day); assertion counts climbing 653 → 685 → 748 were
discarded wholesale at session boundaries. The Add Coin Phase 1 build hit it
again — ~750 assertions of prior coverage unavailable — and still found three
real bugs, with no way to know what the lost coverage would have caught in
the same code.

**This does not weaken the no-build/self-contained posture.** That rule is
about the SHIPPED artifact: `app.html` must stand alone in a browser with no
network dependencies. Test tooling is dev-time, never served, and
`node_modules/` is gitignored. GitHub Pages ignores `tests/` and
`package.json` entirely.

**Honest scope: the value accrues to coding sessions, not to Ray.** His
workflow is ZIP → Notepad → `python3 -m http.server`; he is not expected to
run `npm test` and nothing asks him to.

**Layout:**
- `tests/harness.js` — browser resolution, page setup, the `ok()` assertion
  helper, automatic page/console error collection, and `defineSuite()`.
- `tests/verify_*.js` — one file per feature area. Auto-discovered; adding one
  needs no registration step.
- `tests/run-all.js` — `npm test`. Runs every suite, prints one total, exits
  non-zero on any failure or uncaught page error (verified in both the
  aggregated and standalone paths).

**Two rules worth keeping:**
- **Never hardcode a browser path in a suite.** Playwright's default
  resolution cannot be relied on — the installed version pins a build number
  that may not be what a sandbox pre-installed (verified: default launch
  failed looking for build 1234 while `/opt/pw-browsers` held 1194). The
  harness resolves it in one place: `CHROMIUM_PATH`, then the newest
  `chromium-*` under `PLAYWRIGHT_BROWSERS_PATH`, then a system Chrome, then
  Playwright's own default.
- **A stale suite is worse than none** — it gets either spuriously failed and
  ignored, or quietly weakened to pass. This project's existing discipline
  (assertions "updated to follow a real design change, not weakened") is the
  standard to hold.

**Only the Add Coin Phase 1 suite is committed so far** (69 assertions).
Retro-rebuilding the older suites remains the separate tracked item it
already was — but it now has somewhere permanent to land, so it can be
chipped at incrementally instead of needing one big rebuild.

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
- `manifest.json` + `icons/` — PWA install support for `app.html` only (not
  `index.html`/`stage.html`). See "Installable app (PWA)" below.

## Installable app (PWA) — locked in
`app.html` links a `manifest.json` (`display: "standalone"`, dark
background/theme color matching the app's own `--bg`/`--gold` tokens) plus
`icons/icon-{192,512}.png` (tight-fit) and `icons/icon-maskable-{192,512}.png`
(content kept within Android's ~80% maskable safe zone) so it can be
"installed" via Android's home-screen add flow — this is what actually
removes the browser's own address bar/nav chrome; nothing about how the
app is loaded/hosted changed otherwise.
- **Per-device, not automatic.** Standalone/no-chrome display only applies
  when the app is launched from a home-screen icon added via Chrome/Samsung
  Internet's "Add to Home screen" (or "Install app") menu action — opening
  `app.html` in a normal browser tab or from a bookmark always shows the
  usual browser chrome, manifest present or not. Ray has to do this once per
  device (phone, tablet) to see the effect; there's no way to force it from
  the page itself.
- **Icons are self-generated placeholders** — a simple gold coin-disc
  monogram ("SC"), rendered once via a local Playwright screenshot script
  (not committed — one-off tooling, not app code) rather than pulling in an
  image library or external asset. Matches the app's own coin-disc/drawer-fob
  gold gradient treatment. Fine as a real icon, not just a stand-in — but if
  Ray ever wants a different icon (e.g. an actual coin photo or a redesigned
  mark), just swap the four PNGs in `icons/` and nothing else needs to change.
- **`start_url`/`scope` are relative (`./app.html`, `./`)**, so this works
  correctly regardless of whether the repo is served from the GitHub Pages
  root or a subpath — no hardcoded domain.
- **`index.html`/`stage.html` are NOT covered by this manifest** — a home
  screen icon installed from `app.html` only ever launches `app.html`
  standalone; those two pages still open in a normal browser tab/chrome if
  visited directly. Extending this to them would be a separate, deliberate
  decision, not a default.
- **No service worker** — this is manifest/icons only, for the standalone
  display mode. No offline caching, no background sync, nothing that would
  need reasoning about stale-content/update behavior. If offline support is
  ever wanted, that's a distinct, larger feature decision, not implied by
  this one.

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

### Auth: ONE shared MSAL instance (locked in — hard rule)
**`app.html` has exactly one `PublicClientApplication` (`graphMsalInstance`)
and exactly one `handleRedirectPromise()` call. Never add a second of
either.** All Graph features — reference images, live nav data, the Add Set
write layer, the Browse Edit write layer — share it.

**Why this is a rule and not a preference.** There used to be three separate
instances, one per feature, each with a comment justifying the split as
"don't couple independently-flagged features." That reasoning was wrong
about how MSAL works. All three used the same clientId, authority,
redirectUri and `cacheLocation: "localStorage"`, and **MSAL keys its browser
storage by clientId** — so they were never isolated. They shared one token
cache, one `interaction_in_progress` guard, one PKCE verifier and one
request-state entry, and they overwrote each other's.

With one flag on it worked fine. With **two or more on it failed
completely** — Microsoft's generic "We can't sign you in right now", the
page reloading repeatedly, sign-in never completing, surviving a full
restart and a storage clear (nothing about it was stale state). Two
mechanisms, both real:
- every instance called `handleRedirectPromise()` at load, racing to consume
  the single redirect response in the URL hash — the first cleared the hash
  and the temp cache, the rest failed state validation and cleared more
  state on the way out;
- two features independently called `acquireTokenRedirect()` moments apart
  (live-nav's fetch fires from the first Catalog render, the write layer's
  from Edit's snapshot load), each stamping over the other's stored request
  state, so whatever came back from Microsoft matched nothing in storage.

**This is exactly the config the Browse Edit live run needs** (live nav data
for real Catalog/DB_Coins reads + the write layer), so it was fully
blocking. It survived every earlier pass because every earlier pass had
exactly one flag on.

**How feature isolation actually works now** — in the flags and the token
getters, not in duplicate auth instances:
- `getReferenceImageToken()` / `getLiveNavToken()` / `getWriteToken()` each
  check their OWN flag first and return `null` when off, so a disabled
  feature still cannot touch Graph. That check is now the real enforcement,
  since the instance no longer carries that meaning.
- `acquireGraphToken()` is the single serialized acquisition point: one
  in-flight request shared by all callers, and **at most one redirect per
  page load** (`graphRedirectStarted`). This matters beyond the multi-feature
  case — `ensureLiveNavDataFetch()` alone fires four parallel sheet reads,
  which previously meant four independent redirect attempts.
- `GRAPH_SCOPES` is one set for the one instance: `Files.ReadWrite` when a
  write feature is enabled, otherwise `Files.Read`. Requesting *different*
  scope sets per feature against one shared cache is itself a bug — MSAL
  only serves a cached token whose scopes cover the request, so mismatched
  sets cause silent-acquisition misses and extra interactive prompts.
- Every flag now lives in one block immediately above the instance, because
  it's constructed at load time from them (a `const` referenced before its
  declaration is a TDZ error).

**Honest note on scope narrowing:** the old per-feature `Files.Read`
instances were described as giving read-only features a narrower scope. That
was already illusory — they shared one clientId-keyed cache, so a
`Files.ReadWrite` token obtained by the write layer was sitting in the same
storage the "read-only" instances read from. The enforcement that actually
holds is in code (`fetchReferenceImageBlob()` hardcodes `method: "GET"`,
etc.), not in the scope string.

Regression-guarded by `verify_msal_single_instance.js` (22 assertions),
which injects a fake `msal` global — the real one can't load in the
sandbox — and asserts instance count, redirect-handler count, one redirect
across six concurrent token requests, shared silent acquisition, and that
nothing is constructed at all with every flag off.

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
  The shared MSAL instance also isn't constructed at all while EVERY
  real-Graph flag is off, not just left unused (superseded detail: this
  used to be a `referenceImageMsalInstance` of its own — see "Auth: ONE
  shared MSAL instance" above for why per-feature instances were retired).
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
- **MSAL bootstrap adapted from index.html's** — **superseded**: this feature
  no longer has an instance of its own, it shares the app's single
  `graphMsalInstance` (see "Auth: ONE shared MSAL instance" above). Same
  `clientId`/`authority`,
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
  never becomes defined, `graphMsalInstance` is `null` instead of
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
  CoinReceipts/           named {CollectionID}_receipt.pdf, or timestamp-named for
                           batch receipts not yet tied to a coin — always a PDF now,
                           see "Receipt photos auto-convert to PDF" below
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
  **Superseded:** Browse Edit now writes the workbook, and Add Coin's Phase 1
  layer writes Staging drafts + photos. This crop-commit naming is still
  unimplemented, but it is now Add Coin **Phase 2**'s to implement, not a
  wholly unbuilt write layer's.
  When that write layer gets built, this naming/renaming/fallback logic is what
  it needs to implement — not a separate future feature on top of it.

### Receipt photos auto-convert to PDF (locked in)
Every Receipt slot in the app — Add Coin, Browse Edit, Wishlist, Edit Set,
Batch Receipt, and Add Set's receipt slot, all six — auto-wraps a captured or
picked image (jpg/png) into a single-page PDF before it's treated as "the file
to store." **Naming convention updated**: `CoinReceipts/{CollectionID}_receipt.jpg`
is now `..._receipt.pdf` (see "OneDrive folder structure" above) — this
supersedes every earlier `_receipt.jpg` reference in this file.
- **Page size = the photo's own pixel dimensions, no forced US-Letter page, no
  re-flow.** A tall phone photo gets a tall page; a wide one gets a wide page.
- **Losslessly wrapped, not re-compressed.** A JPEG's original bytes are
  embedded byte-for-byte via the PDF's native `/DCTDecode` filter — zero
  re-encoding, so quality is bit-identical to the captured photo. A PNG has no
  equivalent native PDF filter, so it's decoded to raw pixels and re-packed via
  `/FlateDecode` (lossless deflate, via the browser's built-in
  `CompressionStream` — no library); inflating it reproduces the exact same
  pixels, the same lossless relationship a `.png` already has to its own raw
  data. EXIF rotation (JPEG only) is honored via the PDF page's own `/Rotate`
  entry rather than baking a rotation into the pixels, so the embedded bytes
  stay identical to the source while still displaying right-side-up. Only the
  four pure-rotation EXIF values are mapped; the four mirrored values (rare
  from a real camera) are left unrotated — a known, accepted limitation, same
  "not worth the tradeoff for a case that basically never happens" call as the
  no-dedicated-combined-image-splitter-tool decision elsewhere in this file.
- **If the picked file is already a PDF, it passes through completely
  unchanged** — no re-wrap, byte-for-byte the original file, just renamed to
  the standard `..._receipt.pdf` convention. Every Receipt slot's Library
  file input now accepts `application/pdf` alongside images so a PDF is
  actually selectable there (Camera inputs stay image-only, unchanged — a
  camera capture is inherently a photo, never a PDF).
- **No PDF library** — a minimal valid single-page/single-image PDF (a
  handful of objects + an xref table) is hand-written directly, matching this
  project's established self-contained/no-external-CDN posture (see the
  self-hosted-fonts and jsdelivr-not-default-MSAL-CDN notes above) rather than
  pulling in something like pdf-lib from a CDN for what's a small, well-
  defined file-format subset.
- **The on-screen preview is unaffected — still a live photo thumbnail**,
  exactly as before; the PDF wrap is a storage-format change, not a UI
  change. The one exception is the already-a-PDF pass-through case, where
  there's no image to preview at all — that slot shows a small "📄 filename
  attached" indicator instead (reusing the existing placeholder-icon element
  where one exists, or a small note appended into the photo-box where it
  doesn't, e.g. Add Set's plainer boxes) rather than leaving the box looking
  blank/broken.
- **Add Set's receipt slot is the one real end-to-end wire-up** — it already
  has a real write layer (`ENABLE_SET_WRITE_LAYER`), so its captured/picked
  file is prepared into a PDF Blob immediately and that's what actually
  uploads via `uploadDraftPhoto()`/`graph().uploadFile()` (Blob-safe already —
  confirmed `uploadFile(path, fileOrBlob)` never assumed a real `File`). The
  promotion file-move step (`plannedPromotionMoves()`) now derives the
  destination extension from the Staging filename itself instead of a
  hardcoded `.jpg`, so it stays correct regardless of what actually got
  stored there. **Add Set's whole-set photo (`wireAddSetPhotoSlot("whole", ...)`)
  is explicitly NOT a receipt and is untouched** — still a plain image, no
  PDF wrap; only the `"receipt"` key opts in (`isReceipt` param).
- **The other five slots (Add Coin, Browse Edit, Wishlist, Edit Set, Batch
  Receipt) have no real write layer yet — every Save there is still a stub**,
  per the hard constraint above. For these, the prepared PDF is stored in a
  new `receiptFiles` registry (keyed by the slot's preview element ID),
  ready-but-unconsumed — the same "build for a future consumer" posture the
  Add Set draft/reservation system already established. Nothing currently
  reads `receiptFiles`; whichever write layer eventually lands for these
  flows is what should consume it, at which point no further conversion work
  is needed — the PDF is already sitting there prepared.
- **A conversion failure never blocks the live preview or the capture
  itself** — wrapped in try/catch, same "a secondary feature can't take down
  the primary flow" posture as the reference-image MSAL-load-failure
  handling. Add Set's receipt slot falls back to storing the raw photo
  (renamed `receipt.jpg`) rather than losing the capture entirely if the
  wrap throws; the other five just leave `receiptFiles` unset for that slot.
- **Not verified against a real device/browser beyond this environment's
  Chromium** — `CompressionStream` (used for the PNG path) needs Chrome
  80+/Safari 16.4+/Firefox 113+; confirmed present in this environment's
  headless Chromium, but Samsung Internet's exact support window wasn't
  independently confirmed. Worth a real-device check, same "cannot verify
  from this environment" caveat as the Web Share API note elsewhere in this
  file — if it's ever missing on a real device, the try/catch means it fails
  quietly (no receiptFiles entry, or the Add Set raw-photo fallback) rather
  than breaking capture.

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
- **The All-sheet flat photo/receipt columns are still populated and still
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
  single line (`Micro S` over `FB`).
  **Reversed: Coins-tab grid-mini cards previously dropped the series/type
  name (denomination code only), since it didn't fit legibly at that much
  smaller scale and was truncating hard.** Restored, per Ray's explicit
  request, using the exact same `renderTypeDenomCorner()` the full flip-frame
  already uses (not a separate mini-scale implementation) — its last-word
  shortening fallback (e.g. "Walking Liberty" → "Liberty" when the full name
  doesn't fit) is what actually fixes the original truncation problem, so the
  restoration doesn't reintroduce it. Verified in a real browser across
  several coins, including one that needed the shortening fallback. Rolls
  (no longer rendered as `.coin-card` at all, see "Rolls tab" below) and Set
  children's mini-flips (`renderSetChildFlips()`) are unaffected — this only
  touches the Coins tab's own grid cards (`renderBrowseGrid()`).
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

### Saved-coin flip corners: Variety + Designation added (BUILT and merged to main)
**Merge status correction:** every section below through "Browse Edit save
toast: field count excludes admin-only columns" plus the header-row/Medal
follow-up (5 sections total) previously read "held on branch
`claude/browse-detail-flip-card-updates`, NOT merged" — that reflected the
plan, not the outcome. Ray reviewed all of it live on `stage.html` across
two rounds of testing and gave explicit merge go-ahead; the branch was
merged to `main` (commit `8b1c48d`). **`main` is now the source of truth
for this whole feature**, same standing as every other merged-after-holding
branch in this file. `stage.html` was restored to the real "Add New Coin"
staging form immediately after (commit `1aab7d1`) — the temporary app.html
swap used for live testing is gone; it was never a permanent part of this
feature, just the testing mechanism.

`applyFlipCorners()` (Spotlight + Browse detail's shared saved-coin renderer
— **not** Add Coin's live-entry corners, a separate function/mapping, see
below) gained two fields it never showed before, both via the existing
`coin` object with no new data plumbing:
- **Top-left (Year+MintMark) gained Variety as a second stacked line**,
  using the same `renderCornerLines()`/`.corner-line` mechanism the
  top-right (Type/Denom) corner already uses — omitted entirely when blank,
  same rule every corner value here already follows. Verified for a Roll
  too (including the mixed-date `"Various"` roll) — a Roll's `coin.variety`
  is usually blank and correctly renders as a single line; a populated one
  renders as a second line with no special-casing needed.
- **Bottom-left (Grade) gained Designation, concatenated with NO space**
  (`MS-67FB`, not `MS-67 FB`) — deliberately a different join style from
  Add Coin's own live-entry bottom-right corner (`flipObverseBR`), which
  stacks Variety/Designation as two separate lines. That's a different
  corner with a different pairing rule; it was only ever a reference for
  "check blank before joining," not for its stacking mechanism. Designation
  blank → Grade alone, no trailing artifact; Grade blank + a (rare)
  standalone Designation → Designation alone.
- **This intentionally diverges saved-coin corners from Add Coin's
  live-entry corner mapping described above** (Add Coin: Variety+
  Designation both live in the bottom-right corner, stacked). Worth knowing
  for a future session: the two flip-corner systems are NOT mirrors of each
  other field-for-field — Add Coin's live preview and the saved-coin display
  (Spotlight/Browse detail) have always been separate functions with
  separate corner assignments, and this change widens that gap rather than
  narrowing it. Deliberate, not an oversight — Ray's spec named the exact
  corners and join style for the saved-coin case.

### Horizontal hairline on the coin-disc — root cause found and fixed (BUILT, merged to main)
A report of "a visible horizontal hairline bisecting the circle" on the
flip-card coin graphic was root-caused via pixel-level screenshot diffing
(not guessed) rather than patched blind, per the explicit instruction that
prompted this pass. **Two completely different things were initially
conflated and had to be separated:**
- **The actual, confirmed cause — Dashboard Spotlight only**: `.display-
  case-glass::after` (a deliberate "muntin bar" decoration meant to make the
  display case read as glazed, not a photo) sits at `top: 50%` of
  `.display-case-glass` — which is also almost exactly where the Spotlight
  coin disc's own vertical center falls, since the disc is centered within
  `.flip-frame`, itself centered within `.spotlight`, itself inside that
  same box. As a generated `::after` with `z-index: auto`, it painted AFTER
  (visually on top of) `.spotlight` in their shared stacking context — both
  are positioned descendants of `.display-case-glass`, and `::after` is last
  in paint order — so the bar was drawing a faint white line directly across
  the coin, not just the surrounding glass margins. Confirmed by removing
  the fallback year-number text entirely and finding the seam persisted
  (independent of text) at every x-column across the disc's full width, at
  exactly `y = 50%` — then confirmed the fix by isolating the CSS in a
  standalone test page and pixel-diffing before/after.
- **The fix: `z-index: -1` on `.display-case-glass::after`**, nothing else
  changed (same size/opacity/position). This drops the bar into the
  negative-z-index paint layer, below the (non-positioned) opaque coin-disc,
  so it's naturally occluded wherever the coin covers it while still reading
  as a glazed-case divider in the visible glass margins beside the coin —
  exactly the original visual intent, just no longer drawn across the coin
  itself.
- **Browse detail was never actually affected by this bug at all** — its
  `.flip-frame` has no `.display-case-glass` ancestor (that class only wraps
  Spotlight), confirmed by the same text-removal pixel test coming back
  completely clean there with zero seam at any point. What can *look* like a
  faint horizontal line on Browse detail's disc is the ordinary fallback
  `coin.year` placeholder text itself (e.g. "1877") — dark serif digits,
  vertically centered by the disc's own flexbox layout, which can read as a
  thin dark smudge at a glance depending on rendering/distance. That's
  intentional placeholder content (see "Series-level reference images"
  above — the bare year-number disc is the accepted fallback until a real
  photo or reference image exists), not a CSS defect, and nothing about it
  was changed by this fix.

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

### Browse detail: CollectionID display above Overview (BUILT, merged to main — superseded placement, see the header-row consolidation follow-up below)
A standalone, centered `AY-#####` line (`.detail-collectionid`) now sits
directly above the Overview accordion in Browse detail's info panel — same
typographic weight as the accordion section headers below it (13px/600,
`var(--text)`) minus their interactive button chrome (no border/background/
hover, since this isn't clickable). Built inside `renderDetailAccordions()`
itself (the one function that owns/clears/rebuilds `#detailAccordions` on
every render) as the first element appended, ahead of the Overview
accordion — applies identically to individual coins and Set-bundle rows,
since every owned row has a CollectionID.

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

### Tap-to-flip (superseded — see "Coin-flip interaction redesign" below)
Every flip-frame a saved coin rendered in used to carry a small dedicated ⟲
icon (`.flip-toggle-btn`, bottom-center of the frame, via a shared
`attachFlipToggle()` helper) that flipped that one card between obverse/
reverse in place. **This entire mechanism — the icon, `attachFlipToggle()`,
and its CSS — is gone**, replaced by three separate, context-specific
treatments (auto-cycle, a global per-view toggle, or whole-card tap/swipe/
click) with no icon anywhere. Kept here only for history; see the current
design below.

### Coin-flip interaction redesign (locked in)
Replaces the single flip-icon pattern above everywhere it existed, with
three different treatments depending on where a coin renders — a small
icon made sense as one generic mechanism, but reading real usage patterns
per view (an unattended auto-rotating card, a dense grid of many cards, one
focused detail card) called for three different interactions instead of one
compromise. `attachFlipToggle()` had exactly three callers before this
(Browse grid cards, Browse detail's single flip, Set child mini-flips) —
all three are gone; a new shared `wireSideToggle()` helper replaces two of
them (see below).
- **Dashboard Spotlight**: no manual flip control at all anymore. Auto-cycle
  only — obverse → pause → reverse → pause → advance to the next coin,
  paced by `SPOTLIGHT_DWELL_MS` (13000ms, ~2x the original hardcoded
  6500ms; a named, tunable constant since the exact pacing is meant to be
  tuned after seeing it live, not guessed here). **Swipe left/right on the
  card manually advances to the next/previous coin** — same touchstart/
  touchend + 50px-threshold convention the Album page-flip book already
  uses — resetting the new coin to its own obverse and restarting the
  auto-advance timer from zero (fast-forwards to a fresh cycle rather than
  fighting the auto-play). **Tap-to-navigate into Browse detail is
  unchanged** and coexists with swipe via a `spotlightSwiped` guard flag: a
  real swipe sets it briefly so the `click` event most touch browsers still
  dispatch after a drag-like touch sequence doesn't also open the coin's
  detail view for that same gesture.
- **Catalog (Coins/Medal tab)**: cards show one side only, no per-card flip
  — a single global **Obverse/Reverse toggle** (`catalogSide`, two
  `.filter-chip` buttons in the toolbar, `#browseSideToggle`) flips every
  visible card at once, applied in `renderBrowseGrid()`. **Hidden on the
  Rolls and Sets tabs** — checked against the actual code before building
  this: neither tab renders any coin-disc/flip surface today (Rolls and
  Sets both render plain icon+text list rows, `renderRollsGrid`/
  `renderSetsGrid`), so the toggle would be inert there. This mirrors the
  Grid/List view toggle's own existing precedent, which already hides
  itself on those same two tabs for the identical reason (confirmed with
  Ray before building, not assumed). **Resets to Obverse on external
  Catalog entry** (`resetBrowseFilters()`), same "not persisted across
  navigation" rule every other Catalog filter already follows — switching
  between Coins/Rolls/Sets tabs internally does NOT reset it (also
  consistent with every other Catalog filter).
- **Individual coin/roll/childless-Set detail view** (`showBrowseDetail()`'s
  single-flip branch): the entire flip-frame is the trigger, no icon.
  Exactly one gesture is bound per device, decided once at startup via
  `IS_COARSE_POINTER` (`matchMedia("(pointer: coarse)")`, same "check once,
  device capability doesn't change mid-session" posture
  `prefers-reduced-motion` already uses elsewhere in this file) —
  deliberately either/or, not both at once, since binding both risks a real
  device firing a touch-derived `click` AND a separate touch handler for
  one interaction. **Coarse (touch)**: a single `touchend` handler covers
  BOTH tap and swipe as the same action (flip) — no distance threshold
  needed since they're not distinguished here, unlike Spotlight. A
  mostly-vertical drag (`|deltaY| > 20 && |deltaY| > |deltaX|`) is treated
  as an attempted page scroll through the card and does NOT flip — a
  defensive addition beyond the literal spec, to stop an incidental
  vertical scroll gesture that happens to start on the card from misfiring
  a flip. **Fine (mouse/trackpad)**: a plain `click` flips it. Resets to
  Obverse every time `showBrowseDetail()` renders this branch, so opening
  any detail view always starts on the front.
- **A multi-child Set's own detail view** (the OTHER `showBrowseDetail()`
  branch, when `setChildrenFor(coin).length > 0`): resolves a real
  ambiguity flagged before building — this view's child mini-flip cards are
  simultaneously "a detail view" (item 3's territory) and "a grid of cards
  that each navigate elsewhere on tap" (item 2's territory), and item 3's
  literal whole-card-flips-on-tap rule would have broken the existing
  tap-to-open-a-child's-own-detail-view navigation. **Resolved (Ray's
  call): no per-card flip capability at all — instead a global Obverse/
  Reverse toggle** (`setChildrenSide`, `#browseDetailChildSideToggle`, same
  `wireSideToggle()` mechanism as Catalog's) that flips every child
  mini-card in that Set together, at once. Tapping a child card still
  navigates to that child's own full detail view, completely unchanged.
  Also resets to Obverse every time this branch renders.
- **`wireSideToggle(obvBtnId, revBtnId, setSide, onChange)`** is the one
  shared mechanism behind BOTH global toggles above (Catalog's and the
  Set-children view's) — wired once per pair of buttons, returns an
  `activate(side)` function so the caller can also sync the chip UI when
  the state is reset from elsewhere (external Catalog entry; a fresh
  `showBrowseDetail()` render). Reuses `.filter-chip`/`.filter-chip.active`
  styling directly rather than inventing a new button style, for visual
  consistency with the Year/Commemorative chips already in the same
  Catalog toolbar.
- **Deliberately NOT added to individual Album slot cells** — unchanged
  from the prior design: Albums already has its own, different mechanism
  for viewing a coin's reverse (the page-flip book turns to a dedicated
  Reverse page for the whole slot group — see "Albums: page-flip book"
  below); a filled slot's own coin is still reachable there (tap it → its
  Browse detail view), which now uses the new whole-card gesture like any
  other coin's detail view.
- Verified headless (Playwright, touch and mouse device contexts): no
  `.flip-toggle-btn`/icon renders anywhere; Spotlight's swipe advances the
  index and resets to obverse, and a swipe correctly suppresses the
  following click-to-navigate while a plain tap still navigates; the
  Catalog toggle flips all visible cards, is hidden on Rolls/Sets and
  visible again on Coins, persists across an internal tab switch, and
  resets on external re-entry; the single-detail flip-frame responds to tap
  AND swipe on a coarse-pointer context and to click on a fine-pointer
  context, a vertical drag does NOT flip, and it resets to obverse on
  re-entry; the Set-children toggle flips every child card together with no
  per-card icon, and tapping a child card still navigates to its own detail
  view. Full nav smoke-check (Docket/Catalog/Albums/Sets/Dashboard) confirms
  nothing else regressed.

### Photo Gallery, two-stage crop pipeline & Manage Photos (BUILT, held on branch `claude/photo-gallery-crop`, NOT merged)
A general per-record **photo gallery** replacing the old rigid "obverse/
reverse/additional" fixed slots, a **two-stage crop pipeline** (rectangular
background crop → derived circle crop), a **sub-group photo tier** for Sets,
and a dedicated **Manage Photos** screen for add/replace on any record at any
status. Architectural/cross-cutting, so per the merge policy it's **held on
its branch pending Ray's explicit go-ahead** — reviewed as one whole, not
piecemeal, even though it landed as several commits.
- **Scope is still mockup** — like every other coin-side Save, nothing here
  writes OneDrive. Captured photos live as in-browser blob URLs in
  `galleryStore` for the session (gone on reload); the naming/storage
  convention is documented for the future write layer, exactly as the
  crop-commit naming already is. The two crop TOOLS are real and work
  in-browser. The one exception is Add Set's own already-gated
  (`ENABLE_SET_WRITE_LAYER`) whole-set/receipt path — see the OGP coupling
  note below, which was deliberately preserved rather than broken.

#### Data model
- **One flat typed array per coin/Set**: `gallery: [{ type, url, rawUrl?,
  circleUrl?, caption, subGroupId?, filename, rawFilename? }]`, no fixed
  slots. `GALLERY_TYPES` is the controlled vocabulary; each type carries
  `suffix` / `flipSource` / `retainRaw` / `aspect` / `repeatable` / `tier` /
  `scope`. Accessors: `galleryFor(id)` (lazily deep-clones the
  `FAKE_GALLERIES` sparse seed so capture/remove never mutate the seed),
  `addGalleryEntry` (single-instance types replace in place; only
  `repeatable` types accumulate), `removeGalleryEntry`,
  `galleryEntriesForSubGroup`, `removeSubGroupPhotos`.
- **Revised taxonomy (supersedes the first build's type list):**
  - `obverse` / `reverse` — the coin's own flip sources. Square-locked,
    `retainRaw: true`, `scope: "coin"`. The only types that run Stage 2.
  - `slab_obverse` / `slab_reverse` — a **true front/back pair**, not the
    earlier single `slab_combined`. Free aspect, no raw retention.
  - `ogp_obverse` / `ogp_reverse` — packaging. **The earlier separate "OGP"
    and "whole-set" types were merged into this one pair**; valid on coin
    rows as well as Sets (`scope: "both"`), since a Mint-boxed single coin
    has packaging too.
  - `coa` — open-ended (`repeatable`), each entry carrying its own free-text
    `caption` label, so a multi-page certificate is N entries, not a fixed
    two.
  - `reference` — open-ended, coin-scoped. New this round: a reference/
    comparison shot (an auction listing photo, a Red Book page, a
    look-alike) kept alongside the coin without pretending to be the coin.
  - `subgroup_obverse` / `subgroup_reverse` — the new **sub-group tier**
    (`tier: "subgroup"`), a front/back pair per sub-group of a Set.
  - `other` — open-ended catch-all (the retired fixed "Additional Photo"
    slot's role).
- **Sub-group tier, and the implicit default.** A Set captured with named
  sub-groups (e.g. Philadelphia / Denver) gets one obverse/reverse pair per
  sub-group. A **flat Set with no sub-groups still gets exactly one pair**,
  stored against a `DEFAULT_SUBGROUP_ID` sentinel — that's what the UI shows
  as the plain "Whole set — front & back" block. Filenames namespace only a
  *named* sub-group (`{id}_{sg}_obverse.png`); the implicit default adds no
  namespace (`{id}_obverse.png`), so a flat Set's whole-set photo keeps the
  filename it always had.
  - **The whole-set pair and sub-groups are two independent optional
    things, not alternatives.** An early version of this tier hid the
    whole-set pair once any sub-group existed — that was wrong (Ray's
    correction from a live tablet test) and is fixed: a Set can have both.
  - **Sub-group IDs are stable (`data-sg-id`)**, generated once and never
    derived from the sub-group's name or index, so renaming or reordering
    sub-groups never re-points existing photos.
  - **Deleting a sub-group removes ONLY that sub-group's own obverse/
    reverse pair** — never Set-level photos (OGP/COA/other), and
    **structurally cannot cascade to the photos of coins captured under
    it**: a child coin's photos live in its own gallery keyed by the
    child's CollectionID, not in the parent Set's array `removeSubGroupPhotos()`
    touches. Explicitly required by Ray, explicitly asserted in the suite.
- **No filename collision between tiers.** A coin's flip sources are
  `scope: "coin"`, so a Set row can never produce `{id}_obverse_cropped.png`
  from a coin flip AND `{id}_obverse.png` from its default sub-group pair
  meaning two different things — the coin flip always carries the
  `_cropped`/`_original` suffix, the sub-group pair never does.

#### Crop pipeline
- **Stage 1 background crop (`openBgCrop`/`initBgCrop`)** — hand-rolled
  canvas + pointer events (no library, per the no-CDN posture). Draggable/
  resizable crop box (8 handles; edge handles hidden when square-locked),
  aspect-lock toggle (square default for flip sources, free for everything
  else), EXIF-oriented first via the existing `loadOrientedImageCanvas`,
  bakes the selected region to a blob via an `onComplete` callback.
- **Rotation in Stage 1 (added after a live tablet test found it missing).**
  Two 90° quick-rotate buttons (`#bgCropRotateLeftBtn`/`#bgCropRotateRightBtn`)
  plus a ±45° `#bgCropStraighten` slider, mirroring the circle adjuster's
  own controls. **Implemented by re-baking the source into a new upright
  canvas (`bakeRotatedWorkCanvas`), not by CSS-transforming the preview** —
  a transform would leave the crop box's math fighting a rotated coordinate
  space; re-baking keeps the box axis-aligned and the crop arithmetic
  unchanged. `refreshBgCropSource()` rebuilds the work canvas, stage size,
  and box on every rotation change.
  - **The final crop reads `bgCropState.workCanvas`, never the `<img>`.**
    A latent race was found and fixed here: the preview `<img>`'s `src` is
    set asynchronously from a data URL, so cropping immediately after a
    rotation could read a blank or stale image.
- **Stage 2 circle** reuses the EXISTING `openPhotoAdjust` circle adjuster,
  generalized to a callback mode (`openPhotoAdjust(source, { onComplete })`)
  alongside its legacy positional-target-ID mode — the legacy Add Coin/
  Browse Edit slot writes are unchanged. The circle is **re-derived at
  display time**, never a stored asset; `runCropPipeline(file, type,
  collectionId, onEntry, subGroupId)` chains raw → Stage 1 → (flip sources
  only) Stage 2, producing the gallery entry.
- **Overlay stacking.** `#bgCropOverlay` and `#photoAdjustOverlay` sit at
  `z-index: 210`, above the sub-group/type sheets at `200`. Both were `200`
  originally and the sheet, being later in the DOM, covered the crop tool
  and swallowed its clicks — it read as "the app froze." Caught here before
  it reached a device; keep any future sheet below 210.

#### Capture UI
- **`buildPhotoPairSlot(opts)` is the one shared pair-slot renderer** (face,
  label, 📷 / 🖼️ / 🗑️ actions) used by OGP, whole-set/sub-group, and slab
  blocks. It exists because the same defect — a single file input with no
  camera route — was found independently in three places. **Samsung
  Internet skips the native chooser dialog**, so every capture surface needs
  a real paired 📷 Camera (`capture="environment"`) and 🖼️ Library input,
  not one combined button. `initGalleryCapture`'s own widget had the same
  defect and was fixed the same way.
- **Progressive disclosure, mobile-first: nothing defaults expanded.** Every
  photo group is a collapsed accordion; per-row chips open a focused sheet
  rather than expanding inline. This applies to Add Coin, Add Set Step 1 and
  Step 2, and Manage Photos alike.
- **Add Set Step 2 (per-coin card)** gained the coin's slab pair and
  reference photos as their own collapsed accordions, so a slabbed child is
  captured fully without leaving the set-capture flow.
- **A child coin reads through to its parent Set's COA**
  (`renderParentCoaReadThrough(hostEl, parentId, parentName)`) — resolved
  **live** from the parent's gallery at render time; nothing is copied onto
  the child. Because the link is `originSetId`, it keeps working after
  promotion, which was the explicit requirement.

#### Manage Photos screen
A dedicated `view-managephotos` for adding/replacing photos on **any record
at any status** — the original capture flows are no longer the only way in.
`openManagePhotos(ctx)` / `renderManagePhotos()`, with `ctx = { id, name,
meta, kind:"coin"|"set", draft?, backTo, parentSetId?, parentSetName?,
originSetId? }`.
- **Coin records**: obverse & reverse, slab pair, reference photos, other,
  plus the parent-Set COA read-through when the coin is a Set child.
- **Set records**: OGP pair, whole-set pair, sub-group pairs, COA, other,
  and a **"Coins in this Set"** list that drills into each child's own
  Manage Photos screen and back.
- **Sections are collapsed accordions and open sections survive a
  re-render** (adding or removing a photo re-renders; the section you were
  working in stays open).
- **Three entry points**: (1) a "📷 Manage photos" button on Browse detail —
  **for both coins and Sets**; (2) a per-row 📷 Photos button on In Progress
  Sets, passing the draft; (3) Docket photo-gap rows, which now route here
  instead of to Edit Coin / a Step 1 resume. **The Docket tracks gap kind by
  construction** (four distinct row-building sites, no shared branch), so
  this routing carries no mis-route risk for future non-photo gap types —
  confirmed by reading the code, not assumed.
- **`activateViewOnly(viewId)`** was added for the Back path: the Browse-
  detail entry's `backTo` originally called `showBrowseDetail(coin)` alone,
  which only re-renders inside `#view-browse` and never changes the active
  view — Back left the user stranded on Manage Photos. Using
  `navigate("browse")` would have worked but would also fire
  `resetBrowseFilters()`, silently clearing the user's filters.
  `activateViewOnly()` swaps the active view without navigate()'s
  section-level side effects. **Use it for any future screen opened on top
  of a sub-view the user was already inside.**

#### Add Set: purchase info + storage
Add Set Step 1 gained the fields Add Coin already had — Cost
(`#addSetCost`), Shipping (`#addSetShippingCost`), Seller/Vendor
(`#addSetVendor`), Purchase Date (`#addSetPurchaseDate`), Storage Location
(`#addSetStorageLocation`), Container (`#addSetContainer`) — using **Edit
Set's existing field set and labels** rather than inventing new ones, so the
two Set forms agree. Same drill-down pattern as Add Coin (a Purchase Info
row opening `#addSetPurchaseView`, not an inline accordion).
- **Receipt capture lives inside the Purchase Info drill-down**, matching
  Add Coin — it was briefly placed in the Set photos/documents accordion and
  was **moved, not duplicated**, on Ray's call. Add Coin's placeholder-icon
  markup was deliberately NOT copied across: `wireAddSetPhotoSlot` passes a
  `null` placeholderId, so the icon would have been stuck permanently
  visible.
- **The real (gated) write path was preserved when the legacy whole-set slot
  was retired**: capturing OGP front mirrors its blob into
  `addSetPhotoFiles["whole"]`, so `draft.wholeSetPhoto`, the Staging upload,
  `plannedPromotionMoves()`, and the Docket's whole-set gap check all keep
  working unchanged. Ray explicitly confirmed OGP-front is the right
  semantic match for the old whole-set photo.

#### Known legacy data, NOT fixed here (separate future cleanup)
Both flagged by Ray, both deliberately out of scope for this feature:
- **Some existing coins' `Obverse`/`Reverse` columns already hold slab
  photos**, not raw coin photos — confirmed by inspecting the real
  CoinPhotos folder. A pre-existing data overload, not something this build
  touches. Those files should be renamed/re-pointed into the new
  `slab_obverse`/`slab_reverse` types in a future database cleanup pass.
- **Five real coins carry a `{CollectionID}_combined.jpg` in the Photo3
  column.** The first version of this feature deliberately named its type's
  suffix `_combined` to match them; the revised taxonomy replaced that with
  a true `slab_obverse`/`slab_reverse` pair, so those five files are now
  unmapped and want the same cleanup pass — split into a front/back pair, or
  re-filed as `other`.

#### Verification
Verified headless (Playwright, `verify_gallery_full.js`) — **92 assertions,
all passing, across two device contexts** (412×915 touch phone, 1024×768
touch tablet), zero page/console errors:
- Taxonomy and schema: slab as a true pair, no `slab_combined`, OGP merged,
  sub-group tier present, flip sources exactly obverse/reverse, raw retained
  only for flip sources, COA/reference/other open-ended, aspect locks.
- Filename derivation: `_cropped`/`_original` for flip sources, open-ended
  types indexing from 1, named sub-group namespacing, implicit default
  adding none, and no coin-flip/sub-group collision.
- Gallery accessors: empty start, single-instance replace, open-ended
  accumulate, remove-one, and `FAKE_GALLERIES` seed never mutated.
- **Sub-group delete scope**: removes only its own pair, leaves Set-level
  photos intact, never touches a child coin's gallery.
- End-to-end capture with a real non-square PNG upload: Stage 1 opens, has
  both quick-rotate buttons and the straighten slider, and sits at z-index
  ≥ 210.
- Add Set purchase/storage fields all present; all Add Set accordions
  collapsed by default.
- Manage Photos from all three entry points, for coins and Sets; sections
  open collapsed; camera+library present in the COA block; Back returns to
  Browse (the bug above) and to the Docket.
- Parent-COA read-through visible on a child with nothing copied onto it.
- Nav regression smoke across all 14 top-level routes; no page-level
  horizontal overflow.
Phone and tablet screenshots reviewed for both a coin and a Set record.
- **Ray also confirmed on a real tablet**: crop-box drag, resize handles
  (including coin-photo square-lock), rotation, and the straighten slider.
- **Not verified**: Samsung Internet specifically (only this environment's
  Chromium and Ray's tablet); any real OneDrive write (mockup — none
  exists). **Note the recurring lesson from the cabinet-nav passes**: this
  environment is weakest at catching real-device spacing/rendering issues,
  so a final phone pass on Ray's S25 is worth doing before merge.
- **Prior committed regression suites could not be re-run** — the project's
  `verify_*.js` scripts live in per-session scratchpads by convention and
  none survived into this session. The nav smoke check above is a
  substitute, not an equivalent; if a full regression matters before merge,
  those suites need rebuilding.
- **Merged to main on Ray's real-device sign-off** — both a tablet and a
  Samsung Internet phone pass came back clean, including the crop pipeline
  itself: a photo cropped through Stage 1/Stage 2 updates the slot/thumbnail
  immediately in-session. (Not seeing it again after leaving/reloading is
  the expected mockup limitation until the write layer exists — not a bug.)
  Ray explicitly accepted the 92-assertion suite above as sufficient
  coverage for this merge rather than holding for the fuller rebuild below.

**Tracked follow-up (not started): rebuild the fuller regression suite.**
Sized as its own task, not a quick pass — real gaps beyond what
`verify_gallery_full.js` covers today, some needing substantive rewriting
(not just re-running) since the taxonomy changed underneath them
(`slab_combined` → a true pair, OGP merge):
- The crop pipeline actually completing end-to-end — today's suite opens
  Stage 1 and checks its controls exist, but doesn't drive a capture all the
  way through Stage 2 to a finished entry with `url`/`rawUrl`/`circleUrl`
  and a live slot-preview update.
- The "View all photos (N)" viewer button + viewer overlay on coin detail.
- The Set detail thumbnail strip rendering real thumbs.
- The scope-filtered picker (coin scope = 5 types, excluding flip sources +
  whole-set).
- The capture widget wired into every flow it touches (Add Coin, Browse
  Edit), not just Add Set.
- Sub-group add/rename/reorder in the Add Set UI, confirming stable IDs
  survive a rename.
- Bug 1/Bug 2's original specific repros (Pause/resume photo persistence,
  the rotation race) — verified when built, but the repro scripts
  themselves didn't survive into later sessions.
Rough sizing given when asked: on the order of 60–100 additional
assertions, roughly half-day-to-day scale, not mechanical re-scaffolding.

### Photo touchpoint consolidation (BUILT and merged to main)
**Merged following Ray's real-device sign-off** — both rounds (Obverse/
Reverse capture, Stage 1/2 crop, rotate/straighten, the Adjust button; then
separately the Receipt-as-Photos-pill fold-in) confirmed working on Ray's
own hardware, same real-device-verification bar the photo-gallery-crop
branch was held to before its own merge. `claude/browse-detail-photo-
consolidation` has no commits of its own that aren't now in main's
history — main is the source of truth for this feature going forward, same
standing note as every other merged-after-holding branch in this file.

Browse detail (both Coin and Set) used to scatter photo access across four
places — a "View all photos (N)" pill / gallery strip above the flip card, a
standalone "📷 Manage photos" button next to Edit, Edit Coin's own separate
Obverse/Reverse toggle+capture block, and both Edit forms' own flat "add
photo, pick a type" picker. Consolidated to one real photo-editing surface
per record, at Ray's explicit request (Option A — replace, not add
alongside): "leaving Edit Coin's toggle and Manage Photos both able to touch
the same slab photo isn't real consolidation, it's just co-located
duplication."
- **Top image area is flip-card only, no controls layered on it** — the
  coin's "View all photos" pill and the Set's gallery strip (both sat above/
  below the flip) are removed entirely, not just hidden.
- **"Manage photos" is no longer a standalone button.** Edit is the single
  entry point for changing anything about a record, including photos.
- **Edit Coin and Edit Set now embed the real Manage-Photos section list**
  (`renderManagePhotosInto(hostId, ctx, options)`, generalized from the
  standalone screen's original `renderManagePhotos()` — see below) directly
  in the form, in place of their old simpler widgets:
  - Edit Coin: the old dedicated Obverse/Reverse toggle+frame+adjust block
    and the flat gallery picker are both gone. Obverse/Reverse is now one of
    the embedded sections (`🪙 Coin — obverse & reverse`), alongside Slab,
    Reference, Other, and (for a Set child) the parent-Set COA read-through
    — exactly the standalone screen's coin-branch section list.
  - Edit Set: the flat gallery picker is gone, replaced by the same
    Set-branch section list (OGP, Whole set, Sub-groups, COA, Other, and
    "Coins in this Set").
  - `initBrowseEdit()`/`initBrowseEditSet()` no longer wire the removed
    widgets; `showBrowseEditView(coin)`/`showBrowseEditSetView(coin)` call
    `renderManagePhotosInto()` fresh each time Edit opens for that coin.
- **`renderManagePhotosInto(hostId, ctx, options)` replaces the old
  hardcoded `renderManagePhotos()`** as the real section-list renderer —
  retargetable to any host element/ctx, which is what lets the exact same
  code serve three places (standalone Manage Photos, embedded Edit Coin,
  embedded Edit Set) instead of forking it. `renderManagePhotos()` is now a
  thin wrapper (`renderManagePhotosInto("managePhotosSections",
  managePhotosCtx, {...})`) preserving the standalone screen's original
  behavior — **still the reachable target for the other two Manage Photos
  entry points that this task did NOT touch** (the In Progress Sets
  per-row 📷 Photos button, and Docket photo-gap rows both still call
  `openManagePhotos()` exactly as before). `managePairBlock()`/
  `manageOpenEndedBlock()` now take a `render` callback (threaded through
  from `renderManagePhotosInto()`) instead of calling the old function name
  directly, so a photo add/remove/caption-edit re-renders whichever host
  it's actually in.
- **`buildManagePhotosCtx(coin)`** is the one place that builds the `{ id,
  name, meta, kind, originSetId, parentSetId, parentSetName }` shape
  `renderManagePhotosInto()` expects — extracted from the old standalone
  button's click handler (now removed) so Edit Coin/Edit Set build it the
  same way.
- **"Coins in this Set" (inside Edit Set's embedded photos) still drills a
  child coin into the STANDALONE Manage Photos screen, not that child's own
  Edit Coin.** Considered routing it straight to the child's Edit Coin
  instead (truer to "single source of truth"), but `showBrowseEditView()`'s
  gallery target is keyed off the module-level `currentBrowseCoin` (an
  existing invariant every other caller relies on — Edit is only ever
  reached today from Browse Detail's own Edit button, which always passes
  `currentBrowseCoin`), and reassigning that global mid-flow to jump into a
  child's Edit Coin — then correctly back out to the parent's Edit Set,
  without breaking that invariant for every other caller — is real
  navigation-state surgery, not a mechanical rename. Flagged as
  out-of-scope-for-this-pass rather than guessed at; kept the existing
  standalone-screen drill-down behavior instead, fixed only to return
  correctly to an EMBEDDED Edit Set (see `returnHere`/`onReturnHere` below)
  rather than always falling back to the standalone screen's own re-open.
- **`onReturnHere` (an option on `renderManagePhotosInto`) is how the "Coins
  in this Set" row's Back gets to WHATEVER is hosting that render** — the
  standalone screen's own wrapper defaults it to `() => openManagePhotos(
  managePhotosCtx)` (identical to the prior behavior); Edit Set's embedded
  call passes `() => returnToEditSetView()` instead. **`returnToEditSetView()`
  is a new helper that restores Edit Set's visibility WITHOUT re-running
  `showBrowseEditSetView()`** — re-running it would re-populate every field
  from the coin record and silently discard anything Ray had typed but not
  yet "saved" (there's no real save yet either way — see below — but the
  in-progress form state itself shouldn't vanish just from a photo
  drill-down and back). Verified directly: typing into Storage Location,
  drilling into a child's photos, and returning preserves the typed value.
- **Additional Photos (bottom of the detail page) absorbs "view all
  photos"** — its old data source, a pre-gallery-system `FAKE_COIN_DETAILS
  .additionalPhotos` demo field (superseded, same as every other fixed-slot
  precursor to the real gallery system — only 2 demo rows ever had it),
  is replaced with the real gallery (`galleryFor(coin.id)`, filtered to
  exclude the coin's own obverse/reverse flip-source entries so it doesn't
  just repeat the flip card). Each thumbnail opens the same full-screen
  viewer (`openGalleryViewer`) the removed pill/strip used to open. Applies
  identically to coins and Sets — a Set's gallery never contains obverse/
  reverse entries, so the filter is a no-op there.
- **Real bug found and fixed while testing this (pre-existing, not
  introduced by this task): sections whose title contains an `&amp;` HTML
  entity never preserved their open/collapsed state across a re-render.**
  `appendManageSection()`'s open-state check compares against
  `header.textContent`, which the browser always returns HTML-decoded (a
  real `&`), while the two affected section titles ("🪙 Coin — obverse &
  reverse", "🖼️ Whole set — front & back") were being checked against the
  literal, still-entity-encoded string `"...&amp;..."` — a check that could
  never match. Net effect: those two sections silently collapsed on EVERY
  re-render, including the one that fires right after a photo is captured
  — so capturing an obverse photo, for example, would immediately snap the
  section shut. This existed in the original standalone Manage Photos
  screen too (not introduced here) but was never caught, because nothing
  before this drove a real capture end-to-end through it — this is exactly
  the gap the still-open "rebuild the fuller regression suite" item above
  already flagged ("today's suite opens Stage 1... but doesn't drive a
  capture all the way through Stage 2 to a finished entry"). Fixed by
  comparing against the decoded string instead; both affected `open:` checks
  updated. Caught and fixed via headless end-to-end capture testing this
  session, not by inspection.
- **`buildPhotoPairSlot()` gained a real "Adjust" (⤢) capability it never
  had before**, closing what would otherwise have been a genuine regression
  for Edit Coin's obverse/reverse: the OLD dedicated toggle block (removed
  by this task) always let Ray reopen the crop adjuster on the same already-
  captured photo without retaking it; the shared pair-slot component this
  task now routes obverse/reverse through (previously only used for OGP/
  slab/whole-set/sub-group pairs, none of which retain a raw original) had
  no equivalent — camera/library (retake) and remove were the only actions.
  Fixed by adding an Adjust button, shown only when the type retains a raw
  original AND a photo already exists (`def.retainRaw && entry.rawUrl`) —
  true only for obverse/reverse among every current caller of this shared
  component, confirmed by checking all four call sites, so the other three
  (sub-group pairs, Add Set's OGP pair, Add Set Step 2's child slab pair)
  are completely unaffected. Clicking it re-fetches a real Blob from the
  stored raw `blob:` URL (`fetch(rawUrl).then(r => r.blob())` — a `blob:`
  URL's underlying Blob is exactly what `fetch()` returns for it, and
  `runCropPipeline`/`loadOrientedImageCanvas` already work from any Blob,
  not just a `File`) and reruns the full two-stage pipeline from scratch on
  it, same as the old dedicated block did. This also means the STANDALONE
  Manage Photos screen's own obverse/reverse section gains this capability
  for the first time too (it never had it before this task) — a net
  improvement, not just parity.
- **Scope is still mockup, unchanged by this task** — Edit's Save button
  remains the existing placeholder stub (`"Placeholder only — edits to
  {id} aren't saved yet."`); nothing here adds or changes any OneDrive
  write behavior. This was a pure UI/navigation consolidation.
- **Held on its own branch, not auto-merged, per Ray's explicit instruction**
  — this touches Obverse/Reverse capture, the most-used photo control in the
  app, so it needs a real-device pass (crop, rotate, save) on Ray's own
  hardware before merging, same standing as the photo-gallery-crop branch's
  own real-device sign-off before it merged.
- **Verified headless** (Playwright, scratchpad scripts — not committed,
  same "scripts live in per-session scratchpads" convention as the rest of
  this project's regression history): top-area pill/strip/button all
  removed from the DOM for both a coin (AY-00001) and a Set (AY-00022);
  Additional Photos renders real gallery thumbnails and opens the viewer;
  Edit Coin's embedded Photos section shows Obverse/Reverse + Slab +
  Reference + Other, with the old toggle/gallery elements gone from the DOM;
  Edit Set's embedded Photos section shows OGP + Whole set + COA + Coins-in-
  this-Set, with the old gallery element gone; a full real capture through
  both crop stages (Stage 1 background crop → Stage 2 circle) produces a
  gallery entry with a working Adjust button, and Adjust correctly reopens
  Stage 1 on the same photo and replaces the entry in place (no duplicate);
  drilling from Edit Set into a child's photos and back preserves an
  unsaved field and returns to Edit Set (not Browse detail); the standalone
  Manage Photos screen (entry points #2/#3's target) still opens correctly
  with all its sections and independently-open-able accordions; a full
  8-route nav smoke test plus a 360px overflow check both came back clean.
  Zero page/console errors (aside from the pre-existing, unrelated MSAL
  jsdelivr CDN block this sandboxed environment always shows). **Real-device
  pass since confirmed by Ray** — Obverse/Reverse capture, crop, rotate, and
  the Adjust button all verified working on his own hardware; see the
  merge-status correction at the top of this section.
- **Note for the still-open "rebuild the fuller photo-gallery regression
  suite" tracked item above**: its "View all photos (N) viewer button" line
  is now stale (that button no longer exists — Additional Photos is the
  viewer entry point instead); worth rewording when that suite is actually
  rebuilt rather than treated as a still-accurate target.

**Follow-up (same branch, merged with everything above): Receipt folded
into the Photos area as its own pill, both forms.** Receipt used to sit as a bare, un-collapsed
photo-box lower in each form (after Container on Edit Coin; right after the
Purchase Details fields on Edit Set) — now it's a same-styled accordion
("🧾 Receipt", collapsed by default) positioned directly under the Photos
section, alongside Obverse/Reverse/Slab/Reference/Other (Edit Coin) and
OGP/Whole set/Sub-groups/COA/Other (Edit Set). No duplicate capture path
remains — the old bare photo-box is removed from both forms, not just
hidden.
- **Deliberately NOT folded into `renderManagePhotosInto()`'s own section
  list — a separate, sibling static accordion instead.** Receipt was never
  part of the gallery/crop-pipeline system (`galleryFor`/`GALLERY_TYPES`) to
  begin with; it's the distinct PDF-auto-wrap mechanism (`receiptFiles`
  registry, `prepareReceiptFile()`, see "Receipt photos auto-convert to
  PDF") — no cropping, no `runCropPipeline`. And `renderManagePhotosInto()`
  is SHARED with the standalone Manage Photos screen (the In Progress Sets
  and Docket entry points), which has no Receipt concept at all and must
  stay untouched. Folding Receipt into that shared function would have
  leaked a Receipt pill into those two unrelated entry points; keeping it
  as a separate, hand-built accordion (`wireStaticAccordionToggle()`, a
  small new shared toggle helper — the same open/collapse visual behavior
  `appendAccordion()`/`appendManageSection()` give their own dynamically-
  built accordions, but for a STATIC, already-in-HTML one instead) avoids
  that entirely.
- Wired once in `initBrowseEdit()`/`initBrowseEditSet()` (alongside the
  existing, unchanged `wireMockPhotoSlot()` receipt call), not rebuilt on
  every `showBrowseEditView()`/`showBrowseEditSetView()` re-render — Receipt
  state lives in `receiptFiles`, not the gallery array, so it doesn't need
  the same rebuild-on-every-photo-change cycle the Manage-Photos sections
  do. The underlying capture mechanism (camera/library → EXIF-oriented
  preview → lossless PDF wrap, or byte-for-byte pass-through for an
  already-PDF pick) is completely unchanged — this task only moved where
  the widget sits, not how it works.
- **Pre-existing, unrelated-to-this-task quirk, unchanged by this move**:
  the receipt preview isn't reset when Edit opens for a different coin
  (nothing ever explicitly cleared `browseEditReceiptPreview` between
  coins) — but since Edit's Save is still a stub and `receiptFiles` was
  already documented as "ready-but-unconsumed" (no real write layer reads
  it for Edit Coin/Edit Set), this has no functional consequence today, the
  same as before this move. Not fixed here — out of scope, flagging so a
  future real-write-layer pass knows to check it.
- Verified headless (19 new assertions): accordion exists and sits directly
  after the Photos host in both forms, starts collapsed, opens on click, no
  leftover Receipt widget in the old spot in either form, a real
  image-to-PDF capture still populates `receiptFiles` correctly in both
  forms, and the standalone Manage Photos screen confirmed to have NO
  Receipt section (scope boundary holds). All prior suites for this branch
  (73 assertions across 4 scripts) re-run clean alongside it, and the full
  set re-ran clean again against the merged main tree post-merge.

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
  (`resolveCoinAlbumLink`), Set-by-`setId` (`resolveCoinSetLink`), and
  parent-Set-by-`originSetId` (`resolveChildParentSet`). `renderDetailLinkage()`
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
  `resolveCoinSetLink()` (Issue-3's `setId` chip) — different field, different
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
  **Default display order is Year then Mint Mark** (`sortCoinsTabRows()`,
  applied after every filter combination, not the underlying array's own
  insertion order) — mint mark ties break on the same canonical order as
  the Mint Mark dropdown (blank/Philadelphia, D, S, CC, O, W;
  `MINT_MARK_ORDER`/`mintMarkSortIndex()`), not alphabetically. Two rows
  sharing both Year and MintMark keep their relative array order (a stable
  sort), rather than introducing a third arbitrary tiebreak field.
- **Sets tab**: Category pills — `All`, `Proof Set` / `Mint Set` / `Silver
  Proof Set`, **`Commemorative`, then `Other` last** (fixed pill-order bug:
  `Other` and `Commemorative` were swapped; `Other` must always render last
  since it's the catch-all bucket, `Commemorative` sits second-to-last — no
  other reordering). **Unlike the Coins tab, this
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
- **Rolls tab**: RollID-populated rows, no filter pills (low row count), tap
  into the same `showBrowseDetail()` view as Coins, since every roll row
  carries one normal Denomination. **Superseded twice**: originally reused
  `renderBrowseGrid()`'s coin-disc grid; then restyled to a stacked-coin
  visual (`.coin-roll-stack`); now a plain `album-card`-style list with a
  sort control — see "Rolls tab: list view + sort control" below for the
  current, locked-in design.
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

### Medal tab (locked in, supersedes the Medal chip mentioned above)
Browse is now **five** tabs — `Coins | Sets | Albums | Medals | Rolls`
(`BROWSE_TABS`) — Medal promoted from a Denomination-style chip inside the
Coins tab's filter row to its own top-level tab, one path to it, not both.
Nav placement only, per Ray's explicit framing: medals aren't numismatically
coins even though they share the CoinID pattern — no underlying data/schema
change (Denomination="Medal" is still exactly what it was). **Superseded:
tab label pluralized "Medal" → "Medals" (to match Coins/Rolls/Sets/Albums)
and reordered to Coins/Sets/Albums/Medals/Rolls** — label text and array
order only; the internal tab key stays `"medal"` (singular) throughout,
`medalTabBaseRows()`/`applyMedalTabFilters()` and everything else below is
unchanged.
- **`coinsTabBaseRows()` now also excludes `denom==="Medal"`** (alongside the
  existing Set-bundle/Roll exclusions) and a new `medalTabBaseRows()`
  (`FAKE_COINS.filter(c => c.denom==="Medal")`) feeds a new
  `applyMedalTabFilters()` — same "a row never appears in more than one tab"
  rule the Rolls/Sets split already established.
- **Reuses Coins' exact card treatment** (`renderBrowseGrid`, same
  `.coin-card`/flip-frame-mini look, same Grid/List toggle, same Value-hidden-
  on-grid CSS rule — extended to `[data-tab="medal"]` alongside
  `[data-tab="coins"]` so a medal's grid card looks exactly as it did when it
  was still inside the Coins tab).
- **Metal filter + Commemorative toggle stay available on the Medal tab** — a
  medal can still be gold/silver and can still be Category="Commemorative",
  so those axes are still meaningful and still AND-combine, same as before
  the tab split. **Only the Denomination pill row hides** (`#browseFilters`,
  toggled in `showBrowseTab()`) — there's nothing to choose there anymore,
  the tab itself already scopes to Denomination="Medal". Both tabs share the
  same `#browseCoinsHeader` container; only the inner pill row's visibility
  differs per tab.
- **Year + Missing Photos toolbar filters apply unchanged** (shared across
  Coins/Rolls/Sets already, now Medal too — no new logic needed, the shared
  toolbar row was already tab-agnostic).
- **No nav entry or Dashboard tile** — same standing as Rolls (not Sets/
  Albums, which are full persistent nav items): reachable only by tapping
  the tab after already being in Browse. `resetBrowseFilters()`/external-
  entry-resets-to-Coins-tab behavior is unaffected — Medal introduces no new
  persisted filter state of its own.
- Verified headless (14 assertions): tab order/labels, Medal chip gone from
  the Denomination row, `coinsTabBaseRows()` excludes Medal, Medal tab card
  count matches `medalTabBaseRows()` exactly, Metal/Commemorative header
  stays visible while the Denomination row hides, Year filter ANDs correctly
  against the Medal tab, and switching back to Coins restores the
  Denomination row.

### Rolls tab: list view + sort control (locked in, supersedes the coin-stack visual below)
The Rolls tab no longer renders its own coin-disc grid at all — it's a
plain list of **`case album-card` rows, styled identically to the Albums
picker list** (`renderRollsGrid()`): a 🪙 icon, the roll's name + a
`{yearMint} · {denom} · $value` meta line, and a chevron, tapping into the
same Browse detail view as before. This replaces the earlier
`.coin-roll-stack`/`.roll-edge` edge-on stack visual (see below) entirely —
that CSS and markup are gone, not just hidden. Reuses the `sets-mode` CSS
class for the full-width stacked layout (same class the Sets tab already
uses for its own `album-card` rows — generic despite the name, see its CSS
comment). Since there's no coin-disc grid anymore, the Grid/List view
toggle is hidden for this tab too (same as Sets) — a list of icon rows has
no grid mode to switch into.
- **New sort control** (`#rollsSortSelect`, a plain `<select>` above the
  list, right-aligned) — no sort control existed anywhere else in the app
  to match, so this establishes the pattern rather than reusing one: Year
  (Newest/Oldest First), Denomination (canonical `STATS_DENOM_ORDER`, not
  alphabetical), Value (High to Low), Name (A-Z). Persists across tab
  switches within a session (`rollsSortKey`), same as the Coins tab's own
  `browseViewMode`.
- **The mixed-date "Various" roll is handled explicitly in the year sort**
  (`rollYearNumber()`/`compareRollYear()`) — a non-numeric year always sorts
  to the bottom regardless of direction, rather than producing `NaN`
  comparison noise. Verified via headless browser against the real
  `AY-00026` demo row (see below).
- Composition/Specifications behavior, the `applyFlipCorners()` corner-label
  fix, and everything else about a Roll's own Browse **detail** view are
  unchanged by this — only the Rolls **tab's list rendering** changed.

#### Superseded: the coin-stack visual (`.coin-roll-stack`)
A roll is ~20 coins, not one — the Rolls tab's grid cards used to read as a
short stack of coins viewed edge-on (`.coin-roll-stack`, 3 decorative
`.roll-edge` circles peeking out below/behind, negative z-index scoped via
`isolation: isolate` so they stay behind both the disc and the tap-to-flip
button instead of escaping past it and painting behind the whole card's own
background, invisibly). Only the top layer was a real `.coin-disc` — same
reference-image/placeholder/tap-to-flip treatment as any other coin's disc,
just with muted stacked edges beneath it. **Gone as of the list-view
redesign above** — kept here only for history.
- **Generic/mixed-date roll**: `coin.year` carries the literal string
  `"Various"` (mint left blank) for a roll that isn't one specific date —
  **no new flag/schema field**, confirmed safe by auditing every place
  `year` is read in the file (corner labels, grid captions, sr-only text,
  DB_Coins-match comparisons): all of them either concatenate it into a
  string or explicitly cast with `String()` already, none do numeric
  arithmetic on it, so `"Various"` renders correctly everywhere with zero
  other code changes. Demo row: `AY-00026`, "Roll of 20 Silver Dollars
  (mixed dates)".
- **Composition is promoted to an always-visible key fact for Rolls only**
  (`isRollRow()`, gated purely on a populated `RollID`) — melt/junk-silver
  value hinges on it, unlike a normal coin, where Composition still lives
  only inside the collapsed Specifications accordion. The Specifications
  accordion itself is skipped entirely for Rolls (per "Rolls need much less
  detail than an individual coin" — Weight/Diameter/Edge/etc. describe one
  coin, not a roll of ~20, and aren't meaningful without an aggregation this
  app doesn't do). **A Roll's Composition/`FAKE_METAL_CONTENT` entry holds
  the AGGREGATE oz for the whole roll, not one coin** (e.g. the 1921 Morgan
  Dollar Roll's 15.468 oz = 0.7734 oz/coin × 20) — showing a single coin's
  figure would understate real melt value by ~20x and defeat the point of
  surfacing it prominently at all.
- **Corner-label fix, applies to Rolls specifically**: `applyFlipCorners()`'s
  top-right corner used to always run `seriesLabel()`/`renderTypeDenomCorner()`
  (which assume `coin.name` is shaped like `"{Series} {Denomination word}"`,
  e.g. "Morgan Dollar") — a Roll's name is a full descriptive sentence
  ("Roll of 20 Silver Dollars (mixed dates)"), so stripping a denom-word
  suffix did nothing useful, and the "shorten to last word if it doesn't fit"
  fallback (meant for an overlong series name) picked whatever token
  happened to be last, garbling into things like "dates)" or "coins)$1" —
  caught via direct browser testing, not just code review, before this
  shipped. Fixed: a Roll's top-right corner shows just the denomination
  code, same exception Browse's grid-mini cards already use for every card
  — the full descriptive name is already the page's own title above the
  flip, so nothing is lost.

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

### Year filter (locked in — Coins, Rolls, Sets; not Albums)
A `Year` trigger chip (`#browseYearFilterBtn`) sits in a shared toolbar row
(`#browseToolbarRow`) directly above the grid/list — **one shared
button/popup covers all three tabs** rather than duplicating it per tab,
since `#view-browse` never renders anything but those three (Albums is a
straight `navigate()` redirect, see "Browse: navigation restructure" — the
toolbar is simply always present whenever this view shows content at all,
which naturally excludes Albums with no extra visibility logic needed).
**Superseded: originally its own lone row directly under the tab row** —
Ray's real-device feedback was that a single pill sitting alone in its own
row read as visually odd/unbalanced. Moved into the same toolbar row that
already held the Grid/List view toggle (`.browse-toolbar`, restyled
`justify-content: space-between` so Year anchors left and the toggle
anchors right) — the toolbar itself now stays visible on Rolls/Sets too
(previously hidden there entirely, since only Coins needed the view
toggle); only the `.view-toggle` sub-element hides per tab now, not the
whole row, so Year keeps working everywhere it needs to.
- **Free-text Begin/End Year inputs in a popup, not preset range pills** —
  tapping the chip opens `#yearFilterOverlay`, reusing the exact same
  photo-adjust overlay/panel chrome as Grading Help (same "centered
  case-styled panel over a dimmed backdrop" shape, different content).
  Begin Year alone filters to that exact year; Begin+End filters an
  inclusive range (`yearRowTest()`). Clearing both via the Clear button
  removes the filter entirely.
- **Validation, deliberately minimal**: End Year before Begin Year is
  rejected via a toast, popup stays open, filter state unchanged — no
  other validation (no min/max year bounds, no format enforcement beyond
  `<input type="number">`).
- **ANDs with every other active filter on that tab** — same combining
  pattern as Denomination/Metal/Commemorative on Coins and Category on
  Sets (`applyCoinsTabFilters()`/`applyRollsTabFilters()`/
  `applySetsTabFilters()` each add `.filter(yearRowTest)` to their existing
  chain). Verified: Year + a Denomination chip together narrow to the
  intersection, not either alone.
- **A row with no single real year is excluded whenever the filter is
  active** — the mixed-date "Various" Roll (`AY-00026`, see "Rolls tab:
  list view + sort control") has no specific year to test against a
  Begin/End bound, so it drops out of the result set the moment any Year
  filter is set, same reasoning `rollYearNumber()` already uses for Rolls
  sorting. It reappears once the filter is cleared.
- **Button label reflects the active filter** (`updateYearFilterButtonUI()`):
  plain "Year" when inactive, `Year: 1916` for a single year, `Year: 1900–1950`
  for a range — same "chip shows its own state" convention the Rolls sort
  select and Commemorative toggle already use.
- Switching tabs does not clear the filter — Year state (`yearFilterBegin`/
  `yearFilterEnd`) is shared/global across Coins/Rolls/Sets, same persistence
  model as `browseViewMode`/`rollsSortKey`. **Entering Browse from outside it
  does clear it** — see "Browse filters: reset on external entry" below.

### Browse filters: reset on external entry (locked in)
**Bug fix:** every Browse filter axis (Denomination/Medal chips, Metal
pills, Commemorative toggle, Set Category pills, Year range) was persisting
indefinitely across the whole session — leaving Browse to the Dashboard and
coming back later via the bottom nav still showed whatever filters had been
left active, with no way to tell from the UI that a filter was silently
narrowing the list.
- **The fix distinguishes two different kinds of "entering Browse," and
  only one of them resets**, per `resetBrowseFilters()`:
  - **Switching between Browse's own Coins/Rolls/Sets/Albums tabs**
    (`showBrowseTab()`, called by the in-page tab row) **must keep every
    active filter as-is** — this already worked correctly and is
    unchanged. Confirmed: setting Year + Denomination + Metal, then
    switching Coins → Rolls → Sets → back to Coins, leaves all three
    untouched at every step.
  - **Entering Browse from outside it** (the bottom/side nav Browse icon,
    the bottom/side nav Sets icon, the Dashboard's Browse tile, the
    Dashboard's Sets tile, or any other external link that lands on
    Browse) **resets every filter axis to baseline** (All / All Metals /
    no Year filter / Commemorative off / Sets Category back to All).
  - The dividing line is `navigate()` vs. `showBrowseTab()` — `navigate()`
    is the only place any code outside Browse itself can land on it (every
    external entry point funnels through it, confirmed by grep: no other
    call site ever toggles `#view-browse` active or calls
    `showBrowseGrid()`/`showBrowseTab()` directly), so `resetBrowseFilters()`
    is called from inside `navigate()`'s `"browse"`/`"sets"` branches, right
    before `showBrowseTab()` runs — never from inside `showBrowseTab()`
    itself, which is also the internal sub-tab-switch path and must not
    reset anything.
  - This also covers the Spotlight click-through and an Albums filled-slot
    tap, both of which call `navigate("browse")` before `showBrowseDetail()`
    to jump straight to a coin's detail view (see "App structure" and
    "Albums" above) — filters reset there too, consistently, even though
    the grid itself isn't what's immediately visible.
- **Deliberately does not touch `browseViewMode` (grid/list) or
  `rollsSortKey` (Rolls sort order)** — those are display preferences, not
  filters, and weren't part of this fix; they still persist across an
  external Browse re-entry, unchanged.

### Sets tab: completeness checklist (locked in)
The Sets tab's three **Lineage** pills now double as an at-a-glance
completeness checklist — "which years of the annual Proof Set / Uncirculated
Coin Set / Silver Proof Set do I own vs. not" — instead of filtering owned
rows. Owned years render as a normal lit tile; unowned years use the same
hollow/grayed language as an empty album die-cut hole. Built to a 6-answer
spec (A–F below). Verified headless (21 assertions, `verify_checklist.js`) +
on-device-style screenshot; prior suites (badge/hub regression) re-run clean.
- **Two kinds of pill coexist on the one single-select Sets category row**
  (`BROWSE_SET_CATEGORY_CHIPS`): **Lineage pills** carry a `lineage`
  (`Proof Set` / `Uncirculated Coin Set` / `Silver Proof Set`) and switch the
  tab into **checklist mode** (`renderSetChecklist()`); **list pills**
  (`All` / `Commemorative` / `Other`) carry a `test` and keep the original
  owned-Set-rows list behaviour **completely untouched** (Q3/decision C).
  `activeSetCategoryChip` drives the branch in `applySetsTabFilters()`.
- **Two new DB_Sets fields drive it**: `Lineage` (`Proof Set` /
  `Uncirculated Coin Set` / `Silver Proof Set`, or blank for
  commemorative/one-off) and `SetScope` (`Complete` / `Component` /
  `Premium` / `Commemorative`). `Complete` = the standard top-level annual
  product; `Component` = a subset (quarters-only); `Premium` = a deluxe
  variant (Prestige/Premier); `Commemorative` = out of scope for this feature
  entirely (blank Lineage, never enters the checklist).
- **The checklist universe is DB_Sets, not the owned rows** (decision E):
  `renderSetChecklist(lineage, scope)` iterates `FAKE_DB_SETS` rows matching
  the active lineage+scope, sorted by year. A tile is **owned** when an owned
  `Denomination="Multiple"` row's `setId` matches the DB_Sets row's `setId`
  (`ownedSetForSetId()`). **SetID linkage for owned rows isn't populated yet**
  (separate data task) — so every tile renders unowned today, matching the
  live site. That's expected, **not a bug**. Ownership rendering was verified
  by temporarily linking a row in-test, never seeded into shipped data.
- **Years with no product get NO tile** (decision D) — the checklist only
  renders DB_Sets rows that exist, so a year nothing was issued in simply has
  no row (e.g. Silver Proof only from 1992 → no hollow tiles before it). This
  falls out of the model for free; there's no calendar-range-with-gaps logic.
- **1965-67 Special Mint Set is one DB_Sets row carrying BOTH lineages**
  (comma-separated `"Proof Set,Uncirculated Coin Set"`, decision D) — it
  replaced both products those years. `dbSetLineageIncludes()` comma-splits
  and tests membership, so the same SMS tile (same `setId`) shows under both
  the Proof Set and Uncirculated Coin Set checklists.
- **Pill rename (decision C): "Mint Set" → "Uncirculated Coin Set"** to match
  the new Lineage vocabulary and the Mint's own current term. Only the pill
  **label** changed — the underlying `category` DATA value stays `"Mint Set"`,
  so `SET_NAMED_CATEGORIES` (used only by the `Other` list-mode catch-all) is
  unchanged.
  **Superseded (Ray's follow-up): pill order + labels changed again**, left
  to right: `All / Uncirculated Sets / Proof Sets / Silver Proof Sets /
  Commemorative Sets / Other`. Still label-text-only — `lineage`/`test` on
  each `BROWSE_SET_CATEGORY_CHIPS` entry (the real Lineage/category values
  driving the checklist and list filters) are unchanged; only the reordering
  of the array and the displayed strings changed. "Uncirculated Sets" still
  drives `lineage: "Uncirculated Coin Set"` from the decision above — two
  separate label passes on the same underlying value.
- **Complete/Component/Premium sub-filter** (`#setScopeSelect`) reuses the
  Rolls-sort `.rolls-sort-row` `<select>` styling (decision B1), right-aligned
  under the pill row. Shown **only in checklist mode** (hidden for
  All/Commemorative/Other). Default = `Complete` (decision E);
  `setChecklistScope` persists across tab switches, reset to `Complete` on
  external Browse entry (`resetBrowseFilters()`), same model as the other
  Browse filters.
- **Grid layout is a mode class on the shared `#browseGrid`**
  (`.coin-grid.checklist-mode`), same approach as `.sets-mode`/`.list-view`
  — every other render path (`renderBrowseGrid`/`renderSetsGrid`/
  `renderRollsGrid`) clears `checklist-mode`, and the checklist clears the
  other two, so switching tabs never leaves a stale layout.
- **Empty-tile tap → Add Set deep-link (decision A2)** — reuses the album
  empty-hole tap **pattern** (context object → `navigate` → apply-context),
  NOT the same function (the album deep-links Add Coin; this deep-links Add
  Set). `setChecklistContext = {year, lineage, setId, name}` is carried into
  Add Set: `applyAddSetContext()` shows a 🧩 banner and pre-composes
  `#addSetName` from the DB_Sets row's name (e.g. "1972 United States Proof
  Set"); SetID/lineage still ride **invisibly** onto the draft — no visible
  SetID field exists. **Superseded in part: a visible Year field WAS later
  added to Add Set Step 1** (see "Structured Year field + child-coin
  pre-fill" below) — `applyAddSetContext()` now pre-fills that real field
  from the checklist tile's year instead of passing it through the
  side-channel this note originally described; SetID/lineage are unaffected
  and still invisible. Context is cleared when leaving Add Set (a `navigate`
  leaving-guard mirroring the Add Coin one). `buildSetDraft()` gained `year`
  + `lineage` fields; a checklist `setId` (a real intended SetID from
  DB_Sets) wins over the product code, and the research note records the
  checklist linkage instead of "SetID unconfirmed". A plain (non-checklist)
  Add Set is unchanged — blank year/lineage, no banner.
- **Owned-tile tap → that Set's Browse detail** (dormant until SetID linkage
  lands), Back returning to the checklist — same as a Sets-tab card.
- **`FAKE_DB_SETS` reseeded** from a 2-row product-code stub into a
  representative span (built by a small IIFE, `buildFakeDbSets()`), covering
  all three lineages × Complete, plus Component (quarters-only) and Premium
  (Prestige/Premier) examples, the SMS dual-lineage rows, and deliberate gaps
  (Silver Proof starts 1992; Uncirculated Coin Set has no Premium rows, so its
  Premium scope shows the empty-state message). The two original demo product
  codes (`1999RG`, `2021RC`) are preserved on their real rows so the Add Set
  product-code match note still works. Not exhaustive — a representative
  stand-in, same convention as every other sparse `FAKE_*` lookup.

**Decisions made during the build not covered by A–F (flagged, not guessed):**
- **The checklist honors the shared Year filter but ignores the Missing
  Photos toggle** (**CONFIRMED by Ray**: stays Year-only by design — Missing
  Photos remains a Browse-only filter chip, no nag/flag logic added to the
  checklist; a missing photo is obvious from Browse and gets corrected there,
  no mandatory tracking needed on the checklist itself). Year filtering a
  year-indexed completeness grid is natural and consistent with "ANDs with
  everything" (`yearRowTest` applied to each DB_Sets row's year); Missing
  Photos is an owned-row photo audit with no meaning for reference tiles.
- **`OGPPhoto` (the new packaging-photo column on All) was left out entirely**
  (decision F) — announced for a later task, nothing in the checklist needs
  it.

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
  the start rather than something that needed updating in several places.

### CollectionID-reservation system — Promotion / Rejection (locked in)
The reservation *engine* (`getNextCollectionId()` scanning `FAKE_COINS` +
`FAKE_STAGING` together, reserve-on-Staging-save, the confidence-driven
Save-to-Database/Save-to-Staging button pair, Variety match/no-match
routing, and the shared ambiguous-Designation "pick one" picker) was already
built in a prior session. This round added the two remaining reservation
rules — **Promotion** and **Rejection** — plus the minimal review surface
that triggers them. Still mockup-only: everything operates on the in-memory
`FAKE_COINS`/`FAKE_STAGING` arrays; **no OneDrive/Graph write calls were
added** (that's still a separate future task).
- **Staging Review** is a new **dashboard-only** destination (same standing
  as Needs Attention — a Dashboard "Go To" tile with a live count badge,
  `#view-staging`, `renderStagingList()`), **not** a persistent nav item. It
  lists each staged row with its already-reserved CollectionID and two
  actions.
- **Promote** (`promoteStagedCoin()`) moves the row Staging → All (`FAKE_COINS`)
  with the reserved **CollectionID carried forward unchanged** — never
  re-reserved or re-validated (it was decided at Staging entry). Staging-only
  fields (`stagedDate`, `remarks`) are stripped so the promoted row matches an
  All-sheet record's shape.
- **Reject** (`rejectStagedCoin()`) deletes the Staging row, freeing its
  CollectionID. **Monotonic `max+1`, permanent gaps allowed (Ray's explicit
  Q2 call):** only the **highest** reserved ID actually becomes reusable when
  rejected (next reservation reuses it); a rejected **mid-sequence** ID stays
  a permanent gap and is deliberately **never** handed back out — reusing a
  gap ID is the exact bug class behind two real prior collisions (2019-W
  Lincoln Cent CoinID, Morgan/Peace mislink), and a mid-range ID may already
  be referenced by a photo/receipt. The reject toast states which case
  happened. This preserves the AY-00470 reservation/release precedent (that
  was a top-most release) without extending it to gap reclamation.
- **Reused vs. newly written**: reused unchanged — `getNextCollectionId()`,
  `isConfidentMatch()`/`isVarietyRecognized()`, `validVarietiesForCurrentCoin()`/
  `refreshVarietyOptions()`, `renderAmbiguousMatchList()`,
  `checkDesignationReresolution()`, `saveAddCoinForm()`, the button pair and
  banners. Newly written — the `#view-staging` markup, `renderStagingList()`,
  `promoteStagedCoin()`, `rejectStagedCoin()`, `updateStagingBadge()`, the
  `collectionIdNumber()`/`highestReservedIdNumber()` helpers, the Staging
  Review dashboard tile + `.staging-*` CSS, and a badge refresh on
  save-to-Staging.
- **Conformance check (all 12 original task rules verified, headless-browser
  driven, 23/23 assertions passing):** format `AY-#####` zero-padded (r1);
  next-ID scans both arrays (r2); reserve at Staging save (r3); promote
  carries ID forward, no re-reserve (r4); reject frees the ID, top-most
  reusable / mid gap permanent (r5); confidence-gated button pair, Staging
  always available (r6); confidence reuses the existing green-checkmark logic
  (r7); unspecified Designation doesn't block a direct write (r8); 2+
  Designation candidates always surface the shared picker, never
  auto-resolve (r9); Variety filtered to Year+MintMark+Denomination (r10);
  unrecognized Variety routes to Staging regardless of typed-vs-clicked (r11);
  Error field never affects eligibility (r12). No deviations found; nothing
  needed re-derivation.
- **Assumptions made**: (a) the reserved CollectionID is treated as the row's
  identity key for both promote (findIndex by `id`) and reject — safe since
  IDs are unique by construction; (b) Staging Review lists newest-first
  (matches the Needs Attention list's ordering); (c) since `FAKE_STAGING`
  starts empty on load, the Staging list/badge are only exercised once a coin
  is actually saved to Staging in-session — no seed staging data was added.

**"Add Set to database" — now BUILT (held on branch `claude/add-set-reservation`,
awaiting Ray's review + explicit go-ahead before merge).** This was previously
filed here as a deliberately-out-of-scope future item; it's now implemented as
the app's first real OneDrive write layer. See the dedicated section
"Add Set + real write layer" below for the full design. Note it is a SEPARATE,
real reservation module from the coin-side in-memory mockup in this section —
the two coexist by design and were NOT unified (Q8): the coin-side mockup here
(monotonic `max+1`, app-driven Promotion/Rejection over `FAKE_*` arrays) is
untouched; the new Set-side module reserves against the LIVE workbook and uses
an external-reconciliation Promoted model.

On Staging rejection, a deleted Staging row's CollectionID becomes available
again for the next `getNextCollectionId()` call only under the monotonic
`max+1` rule above (top-most only), same spirit as the AY-00470
reservation/release precedent from ProjectPlan history.

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

### Add Set + real write layer (BUILT and merged to main)
The app's first real OneDrive **write** layer, plus a new **Add Set** capture
flow that uses it and a durable **CollectionID reservation** module. Built to
a 3-part spec; all 12 clarifying answers are baked in. Verified entirely
headless via a mock Graph client (77 assertions); the real live-against-a-copy
run is Ray's to execute (see the numbered checklist committed alongside,
`docs/ADD_SET_LIVE_RUN_CHECKLIST.md`).
**Merge status correction:** this was previously flagged in this file as
"held on branch `claude/add-set-reservation`, NOT merged" — that was stale.
It was actually merged to main in an earlier session, and every subsequent
round of work (Needs Attention hub, Sets checklist, Medal tab, receipt-to-PDF,
this Bug 3 fix, etc.) has been built directly on top of it in main.
`claude/add-set-reservation` has no commits of its own that aren't already in
main's history — **main is now the source of truth for all Add Set/write-layer
work, full stop**; the branch name is kept here only as a historical pointer
to where this feature originated, not as a place future work should land.

**Two bugs found during Ray's live copy-workbook run, both fixed and
re-verified headless (checklist itself passed — B8-B9/C12-C14/D16/E19-E20 all
confirmed against real OneDrive data; these were refinements on top, not
architecture changes):**
- **Bug 1 — Pause used to discard whatever was typed but not yet formally
  saved.** Fixed via a new `partialChild` field on the draft (distinct from a
  real `children[]` entry — never counted as captured, never gets a
  CollectionID). The Pause handler reads the current form fields
  (`readChildFormValues()`, identity fields — see Bug 3 below for photos,
  which are handled separately) and persists them before navigating away;
  `renderChildStep()` restores them into the form on resume
  (`restoreChildFormValues()`) and clears `partialChild` the moment it's
  consumed, so a stale partial can't reappear after being shown once. A real
  save (`addChildToSetDraft()`) always clears any leftover `partialChild`
  too, since a formal save supersedes it. Pausing a genuinely blank form
  leaves `partialChild` as `null` rather than persisting an empty object.
  **Superseded in part by Bug 3 below**: this original fix explicitly
  excluded photos ("in-memory Files can't round-trip through a JSON draft,
  so they're deliberately not part of this") — that exclusion is what Bug 3
  fixes; the text-field persistence described here is otherwise unchanged.
- **Bug 2 — no way to correct `expectedChildCount` after Step 1, and hitting
  it produced a nonsensical "Coin 4 of 3."** Fixed two ways: (a) an inline
  "Expected count [Update]" control now sits on the child-capture screen
  itself, editing the flat `expectedChildCount` for an ungrouped set or the
  **currently-active sub-group's** own `expectedCount` for a sub-grouped one
  (`adjustExpectedCount()` — mutates the actual object inside `draft.subGroups`,
  not a copy, so the persisted write is correct); (b) once captured count
  reaches or exceeds what's expected, the progress line stops trying to show
  a fill-in-the-blank "Coin N of M" and instead reads "You've captured N
  coins — add another, or mark this set complete?" — for a sub-grouped set
  this triggers once **every** sub-group is full (`allSubGroupsFull()`), not
  per-group, since there's no single sensible "next group" left to name at
  that point. `currentSubGroupForNextChild()` now returns `null` (not a
  last-group fallback) once all groups are full, which is what
  `allSubGroupsFull()`'s equivalent condition relies on.
- 20 new headless assertions cover both: unsaved-then-paused fields
  surviving a resume and then being formally saved correctly, a blank pause
  not leaving a junk partial, adjusting count mid-capture on both flat and
  sub-grouped sets, and the graceful overflow message at exactly-met and
  past-met counts for both set shapes.
- **Bug 3 — a captured-but-not-yet-saved child photo didn't survive Pause.**
  Found during review of the Bug 1 fix (photos were explicitly excluded from
  `partialChild`), confirmed by design rather than a live reproduction, and
  fixed the same session. A photo is now uploaded to this draft's real
  Staging folder (`setDraftFolder()`, i.e. `CoinCollection/Staging/
  {CollectionID}/` under whichever `WRITE_TARGET` is active — same `"copy"`
  gating as every other Add Set write, unchanged) **the moment Pause is
  tapped**, not deferred to a formal Save — using the exact same
  `{childId}_obverse.jpg`/`_reverse.jpg` filenames `saveCurrentChild()`
  itself uses, since `nextChildCollectionId()` is stable for as long as one
  child-capture form stays open. Only the resulting **filename reference**
  is written into `partialChild.photos` — never the photo bytes — keeping
  the JSON draft small. `renderChildStep()` now also calls a new
  `restorePartialChildPhotos()` on resume, which fetches those bytes back
  from Staging and repopulates both the live preview and `addSetPhotoFiles`,
  so `saveCurrentChild()`'s existing upload call transparently re-uses the
  already-staged photo — no special-casing needed there, and Ray never has
  to re-take a photo that already exists in Staging. Guarded against a race
  where a fresh capture lands while the async restore is still in flight
  (checked both before the fetch starts and again right after it resolves,
  so the slower-to-arrive restored photo can never clobber a newer one Ray
  just took). A second Pause correctly overwrites the Staging file if the
  photo was re-taken, and falls back to the already-referenced filename
  (rather than uploading blank) if resume's restore hasn't finished landing
  yet when Ray pauses again. 23 new headless assertions (mock Graph client):
  photo persists byte-for-byte across Pause → resume, the reference is
  cleared once the child is formally saved (with the saved child's own
  record carrying the same unchanged photo bytes) and correctly replaced if
  the photo is re-taken instead, a Pause with no photo taken behaves exactly
  as before (blank `photos.obverse`/`reverse`, nothing uploaded), a fully
  empty Pause still stores `partialChild = null`, and the mid-restore race
  guard. Verified working for sub-grouped sets too (a separate ad-hoc check,
  not part of the saved suite files). The 6 existing suite files (77
  assertions) re-run clean alongside — 105/105 total across everything run
  this session, zero regressions.

**Structured Year field + child-coin pre-fill (BUILT, locked in).** Add Set
Step 1 had no structured Year — only free-text Set name/description — so
child-coin capture had nothing to pre-fill from and Year had to be retyped
by hand on every coin, even for a single-year set. Fixed per Ray's explicit
scoping (not open for further design questions): every catalogued Mint
product is tied to exactly one year; only a personal/custom grouping can
span multiple years — so Year is a required **either/or**, never a third
"blank" state.
- **New Step 1 field**: a number input (`#addSetYear`) plus a `Various`
  checkbox (`#addSetYearVarious`, reusing the existing `.grade-range-toggle`
  class rather than inventing a new one). Checking Various disables and
  blanks the number input, so the two states can't both hold a stale value.
  `readAddSetYear()` returns a specific number, the literal string
  `"Various"` (same convention the Rolls tab already uses for a mixed-date
  roll's own `year` field — reused, not reinvented), or `null` if genuinely
  neither was chosen — `startSetCapture()` blocks submission on `null` via
  the same `showToast()` validation pattern as the existing "give the set a
  name" check.
- **`draft.year` is no longer checklist-only.** It already existed as a
  draft field (populated only via the Sets-checklist deep-link, see that
  section below) — now `startSetCapture()` always sources it from
  `readAddSetYear()` regardless of entry path, so a checklist deep-link and
  a plain Add Set entry both end up going through the same real form field.
  `applyAddSetContext()` now pre-fills `#addSetYear` with the checklist
  tile's year (always a specific number, Various left unchecked) instead of
  passing it through a side-channel — genuinely simplifies that code path,
  not just adds to it.
- **Child pre-fill lives in `clearChildForm()`** (`prefillChildYear()`):
  a freshly-opened child form (first coin, or right after a save) pre-fills
  `#addSetChildYear` from `currentSetDraft.year` whenever that's a specific
  number; `"Various"` or a missing/legacy value (a draft written before this
  feature existed) leaves it blank, exactly as before. Applies identically
  regardless of sub-groups — sub-groups split by mint mark, not year, and
  this doesn't branch on `subGroups` at all. **Deliberately NOT applied**
  when resuming a Paused `partialChild` — `restoreChildFormValues()` is
  untouched, since a restored partial represents exactly what Ray had
  already typed/cleared, which must win over the Step 1 default. Still just
  a normal editable value either way — a per-coin override is respected and
  isn't sticky (the next child gets the Step 1 pre-fill again, not the
  override).
- Verified headless (19 new assertions, `verify_addset_year.js`): the
  required either/or block, the Various checkbox's disable/blank behavior,
  pre-fill on a specific-year set (including re-applying for a second child,
  not a one-shot), no pre-fill on a Various set, pre-fill applying
  identically across both sub-groups of a sub-grouped set (including after
  rolling from one sub-group to the next), a per-coin override being
  respected and not sticking to later coins, the checklist deep-link
  pre-filling the new field correctly, and a legacy no-year draft degrading
  gracefully. Two existing suites (`verify_addset_receipt_pdf.js`,
  `verify_bug3_photo_pause.js`) needed a Year value added to their own Step 1
  calls now that it's required — updated, not weakened; one of those
  (`verify_bug3_photo_pause.js`'s empty-pause test) switched to Various
  specifically, since a specific-year draft's child form is no longer
  trivially empty by design. All 8 suites (119 assertions total) re-run
  clean, zero regressions.

**"Track coins individually within this set?" toggle + CollectionID `-Set`
suffix retirement (BUILT, locked in).** Resolves the July 18 ProjectPlan item
"CollectionID Parent-Child Convention for Sets." Two parts, shipped together
since the second is really the consequence of the first.
- **New Step 1 toggle** (`#addSetTrackIndividually`): whether this Set
  captures a per-coin breakdown (Step 2, as already built) or completes as
  one **single set-level record** — same shape as an existing bare-ID owned
  Set row in the workbook (e.g. `AY-00542`), no `-A/-B/-C` children ever
  expected. **Default is driven by the new Category field**
  (`#addSetCategory`, also new this round — Step 1 had no Category selector
  before): `Mint Set` / `Proof Set` / `Silver Proof Set` default **NO**
  (`defaultTrackIndividually()`); `Commemorative` / `Silver Eagle` /
  `Reverse Proof Set` / `Prestige Set` / `Legacy Collection` /
  `Assembled Set` / `Best of the Mint Set` default **YES**; blank or any
  other value (including `Other`) defaults **NO** — expressed as a single
  membership test against the YES set, so there's no way for a category to
  fall through neither bucket. **Always overridable in either direction** —
  two independent "touched" flags (`addSetCategoryTouched`,
  `addSetTrackIndividuallyTouched`), each reset only on a fresh Step 1 entry
  (`showAddSetStep1()`), make sure auto-fill (Category from a product-code
  match or a checklist deep-link; the toggle from Category) only ever
  applies *before* Ray's own choice, never silently overwrites it after.
- **Category auto-fills from two existing signals**, both already computing
  a category-shaped value before this round: a matched product code
  (`matchDbSetsByProductCode()`, already showing `m.category` in the match
  note) now also sets the dropdown; a Sets-checklist deep-link's `lineage`
  now maps onto Category too (`categoryFromLineage()` — "Uncirculated Coin
  Set" lineage → `"Mint Set"` category, same label/value split the
  completeness-checklist pill rename already established). Both paths are
  standard-issue-only by construction, so they always land on a default-NO
  category — correct, not a coincidence.
- **Unchecked → Step 2 is genuinely skipped, not just hidden.**
  `startSetCapture()` branches: Expected Count and Sub-groups are read as
  empty/zero regardless of what's still sitting in those (now-hidden)
  fields (`#addSetIndividualTrackingFields`, shown/hidden by
  `updateAddSetTrackIndividuallyVisibility()`, which also relabels the
  Start button — "Reserve ID & start capturing coins" vs. "Reserve ID &
  save set"); `renderChildStep()` is never called; the draft is written
  with `status` set directly to `SET_STATUS.COMPLETE` (the same terminal
  status Step 2's own "Done" button reaches via `markSetDraftComplete`) and
  `confirmedChildCount: 0` (never `null`, so a downstream reader can't
  mistake this for "Step 2 started but never finished"); Ray lands back on
  the Dashboard, since there's nothing left to do. A `trackIndividually:
  false` flag is stored on the draft itself, and the research note gains an
  explicit "Not tracked individually — single set-level record, no child
  coins expected" line — both purely for the reconciliation team's benefit,
  so an empty `children[]` on a `Complete` draft reads as "by design," not
  "capture stalled partway." Falls out of existing hub/dashboard logic for
  free: never appears in "In Progress Sets" (never enters `Draft` status),
  correctly appears under the Needs Attention hub's "Waiting on Copilot
  research" section like any other `Complete` draft, and the promotion
  file-move loop already tolerates an empty `children[]` (it always did —
  confirmed by re-reading `plannedPromotionMoves()`, which iterates
  `draft.children || []`).
- **`-Set`/`-SET` CollectionID suffix retired going forward.** Grepped the
  whole file: nothing in the reservation module, the Add Set write layer, or
  any `FAKE_*` demo data actually generates, parses, or depends on that
  suffix — `reservationIdNumber()`/`collectionIdNumber()` (two separate but
  structurally identical helpers, coin-side mockup and Add Set write layer)
  both strip only the `AY-` prefix and `parseInt` the rest, which silently
  ignores *any* suffix, `-Set` or otherwise, without special-casing it. Every
  real parent ID `reserveNextCollectionId()` produces is already a plain
  `AY-#####` — confirmed nothing needed to change there. Child linkage was
  already `originSetId`-based, never suffix-parsed (`setChildrenFor()`,
  `isSetRow()` — keyed on `denom === "Multiple"`, not the ID string). One
  stale comment (in the old Browse-restructure `FAKE_COINS` seed data)
  speculatively described a future `AY-#####-Set/-A/-B` suffix scheme that
  was never actually built that way — corrected in place to point at the
  real `originSetId` mechanism and the retirement decision, so a future
  session doesn't mistake it for a still-open design question.
- **Nothing else in the codebase assumes every Set gets an `-A/-B/-C`
  child** — this was checked directly, not assumed: `markSetDraftComplete()`
  never required `children.length > 0`; the promotion move-planner already
  handled zero children gracefully (needed anyway for the childless-backlog
  case the older coin-side `FAKE_SET_CHILDREN` mockup already exercised);
  the Needs Attention hub's Draft/Complete branching keys purely on
  `status`, never on children count. The only real gap was the missing
  *path* to reach a childless Complete draft at all (Step 2 was previously
  mandatory) — that's exactly what this toggle closes.
- Verified headless (39 new assertions, `verify_addset_track_individually.js`):
  every named category's default in both directions, blank/`Other`
  defaulting NO, a manual override in either direction surviving a
  subsequent Category change, the tracked path behaving exactly as before
  (Step 2 runs, `status` stays `Draft`), the not-tracked path's full draft
  shape (`status`, `children`, `expectedChildCount`, `confirmedChildCount`,
  the research-note line, Step 2 never activating, landing on Dashboard,
  absence from In Progress Sets), the Expected-Count/Sub-groups section's
  show/hide plus confirmation that a stray value typed before switching to
  NO never reaches the saved draft, and both auto-fill paths (checklist
  deep-link, product-code match) correctly setting Category and thus the
  default. All 9 suites (158 assertions total) re-run clean, zero
  regressions.

**Scope boundary — what the app writes (Q1=b / Q3):** the app NEVER writes the
Excel workbook. Its only writes are (i) Staging **drafts as JSON files** in
OneDrive folders, (ii) photo uploads to those folders, (iii) promotion-time
photo **file moves**, (iv) nothing else. Moving confirmed data into the real
All/DB_Sets/DB_Coins rows and setting `Status="Promoted"` is the EXTERNAL
manual/Copilot reconciliation step — the app only ever READS that status.

**Safety posture (all gates default to the safe state):**
- `ENABLE_SET_WRITE_LAYER = false` (localhost-dev only until a production
  redirect URI exists — Q6). When false, `getWriteToken()` returns null and
  NEVER fires an auth redirect, so on the live GitHub Pages site tapping Add
  Set's Save degrades to a friendly "localhost-dev only" toast instead of a
  broken sign-in navigation. Exactly mirrors the `ENABLE_REFERENCE_IMAGES`
  precedent.
- `WRITE_TARGET = "copy"` (Q5) → every path resolves under
  `CoinCollection/_Testing/` (`WRITE_PATHS`), so nothing can touch the real
  workbook/Staging. Flipping to `"live"` is a manual, Ray-only, one-line
  change and STILL only writes Staging folders + photos, never the workbook.
- The real workbook is never duplicated by the app — **Ray creates the test
  copy himself** at `CoinCollection/_Testing/CoinCollection (AI) COPY.xlsx`.

**Graph client abstraction (`RealGraphClient` / `createMockGraphClient` /
`graph()` / `__setGraphClientForTest`):** all reservation/draft/promotion
logic depends on a swappable `graph()` client, never on `fetch()` directly,
so a `MockGraphClient` (in-memory path→entry store + seeded workbook columns)
drives the whole flow headlessly with no OneDrive (Q12). `RealGraphClient`
adapts stage.html's proven `Files.ReadWrite` PUT pattern and adds
`getFileBytes`/`getItemMeta`/`listChildren`/`deleteItem`/`readWorkbookColumn`.

**Reservation module (`reserveNextCollectionId`, standalone/reusable per
Part 1 — Add Coin migrates to it LATER, not this round, Q11 — **superseded:
that migration is done, see "Add Coin write layer — Phase 1" below**):**
- Next parent ID = `max(All!CollectionID, open Staging draft parent IDs) + 1`,
  zero-padded `AY-#####`. The All read is the one unavoidable live-workbook
  touch and is **read-only** (Graph workbook `usedRange`, Q2=a); a counter
  file is the documented fallback if that proves slow/lock-prone.
- Reserving a parent implicitly reserves its whole `-A/-B/-C…` child namespace
  (`childSuffix()` is bijective base-26, correct past Z). The claim becomes
  durable the instant Step 1 writes the Draft (a real Staging file, so it
  survives close/reopen and other devices — Part 1 #3).
- Abandoned Draft reservations are left sitting indefinitely — no auto-expiry
  (Part 1 #4).

**Add Set flow (`view-addset` Step 1 → `view-addset-children` Step 2):**
- **Step 1** (set-level basics): name, optional Mint product code (live
  `matchDbSetsByProductCode()` against a sparse `FAKE_DB_SETS` stand-in →
  prefill note), self-declared expected child count, optional dynamic
  **sub-groups** (name + per-group count), optional whole-set + receipt
  photos. Submitting reserves the ID and writes the Draft IMMEDIATELY (does
  not require any children yet). GSID is stored **empty = pending** (Q9) with
  a `researchNote` spelling out what's unresolved (GSID + product-code
  confirmation), same shape as the NGC/PCGS research queues.
- **Step 2** (children one at a time): reuses the app's photo-slot + field
  widgets (NOT a forked form) but captures **identity + grade + photos only**
  — no DB_Coins confidence/routing, no per-child Save-to-DB-vs-Staging choice
  (Q7). Each child gets an app-assigned `-A/-B/-C` id and an `originSetId`
  pointing at the parent, appended into the parent's `set.json` (embedded, for
  reliable association) and persisted on each save. Sub-grouped sets show a
  per-group "coin N of M" and auto-advance to the next unfilled group.
- **Status field** (drives resume + the promotion loop): `Draft` (resume
  state) → `Complete — pending research` (Ray marks capture done; may confirm
  a final count differing from the declared expected) → `Promoted` (set
  EXTERNALLY by reconciliation; the app only reads it). The app never sets
  `Promoted` itself.
- **Resume** via a Dashboard-only **"In Progress Sets"** tile with a count
  badge (Q10): lists `Draft` drafts newest-first, tap to resume Step 2 at the
  right coin/sub-group. Same dashboard-tile pattern as Staging Review / Needs
  Attention.

**Promotion file-move loop (`processPromotedSetDrafts`, Part 3 step 3, runs at
launch):** for each `Promoted` draft not yet moved (`filesMovedOnPromotion`
flag), relocate its photos from the Staging folder to the final convention
(`CoinPhotos/{childId}_obverse.jpg` etc., `CoinReceipts/{parent}_receipt.pdf`,
whole-set → `CoinPhotos/{parent}_set.jpg`). **Every move is strictly
copy-then-verify-then-delete-original (Q4) — a failed/unverifiable copy always
leaves the source intact**, the draft stays `Promoted` (flag not set), and the
next launch retries; per-move idempotent (dest-exists + source-gone = already
moved). No whole-workbook backup this round (Q4) — the app never writes the
workbook, so there's nothing to protect; that logic is shelved until Add
Coin/reconciliation writes Excel directly.

**Reused vs. newly written:** REUSED — stage.html's PUT pattern (adapted into
`RealGraphClient`), the photo-capture File-per-slot idiom, `loadOrientedImageCanvas`,
`DENOM_LABELS`, the dashboard-tile/badge pattern, the coin-side `collectionIdNumber`
concept. NEW — the entire write layer + mock, the reservation/draft/promotion
modules, the three views + `initAddSet` controller, `FAKE_DB_SETS`, and the two
dashboard tiles. The coin-side in-memory reservation/Staging-Review mockup is
completely untouched (Q8).

**Step 1 field reorder + product-code-driven auto-populate + year-less Name
(small-fixes follow-up, locked in).** Product code moved to be the FIRST
field (most reliable identifier when Ray buys directly from the Mint — should
drive the fields below it, not be a late optional aside), followed by Name,
Year, Category — same order top to bottom now.
- **`matchDbSetsByProductCode()` is now live-data-aware** — previously
  `FAKE_DB_SETS`-only (explicitly out of scope when live-nav-data was built).
  Now reads through `activeDbSets()` and checks THREE possible fields per
  row: the two real, confirmed DB_Sets columns (`ItemNumber`, `ProductOption`
  — via `mapWorkbookRowToDbSet`, live data only) or `FAKE_DB_SETS`'s own
  single mock `productCode` field (demo data only, unchanged) — whichever is
  populated on that row. Today's demo codes (`1999RG`, `2021RC`) keep
  matching unchanged; a live row becomes matchable once
  `ENABLE_LIVE_NAV_DATA` is on. `mapWorkbookRowToDbSet()` gained `itemNumber`/
  `productOption` fields; the old unconfirmed `productCode` guess field was
  dropped from the live mapper (real column names superseded it).
  **Bug caught and fixed while widening this**: the product-code match path
  used to set Category directly from a matched row's raw `.category` field
  (`= String(colVal(row, "Lineage"))` on a live row) instead of running it
  through `categoryFromLineage()` — harmless on demo data (whose `productCode`
  rows already store a pre-translated category string) but would have set
  Category to `"Uncirculated Coin Set"` on a real match, a value with no
  matching `<option>` in the dropdown (silently resets to blank). Now uses
  `categoryFromLineage(m.lineage)`, consistent with every other auto-fill
  path on this form.
- **A miss is non-blocking** (expected for a brand-new, not-yet-catalogued
  Mint product) — Ray can keep entering everything by hand; the note reads
  "Not found in catalog — may be a new release, continue entering manually."
- **On a match: Name, Year, AND Category all auto-fill**, each independently
  gated by its own touched flag (`addSetNameTouched`/`addSetYearTouched`,
  new — same mechanism `addSetCategoryTouched` already established: set only
  by that field's own genuine `input`/`change` listener, never by a
  programmatic auto-fill `.value =` set, which never dispatches an event).
  A manual edit to any one of the three always wins over a later
  product-code match touching that same field — the other two can still
  auto-fill independently.
- **Name field is now year-less — holds a set TYPE, never one entry per
  year** (`dbSetTypeName()`): strips a DB_Sets row's own leading year off its
  Description using the row's real, separately-confirmed `Year` column —
  not a blind regex over the text — so a row with no such leading-year
  prefix (a rare non-annual product) passes through unchanged
  (`dbSetTypeName(s) === s.name` for those). The Name datalist
  (`populateAddSetNameOptions()`) now dedupes on this type name instead of
  the raw dated Description — supersedes the original one-entry-per-year
  list (~438 raw rows against real data, too granular to scan) with a
  deduplicated set-type list (~100 entries against real data, per Ray's own
  audit — "United States Mint Proof Set", "United States Mint Uncirculated
  Coin Set", "Best of the Mint Set," etc.). Free text still always works.
- **Category auto-fill logic changed to match (item 4)**, since Name no
  longer carries the year: `updateAddSetCategoryFromNameYear()`, called on
  every genuine Name or Year/Various change. When Year is a specific number,
  matches STRUCTURALLY — `s.year === yearValue && dbSetTypeName(s) ===
  typedName` — against every DB_Sets row, rather than reconstructing and
  re-matching a `"{Year} {Name}"` string; functionally identical for the
  normal case (every annual product's Description literally is
  `"{Year} {Type}"`) but avoids any assumption about exact spacing/
  punctuation in the real Description text. When Year is "Various"/unset,
  only a genuinely year-less Description (the rare non-annual product) can
  match a bare Name directly — never guesses which year's row an annual
  product's own type name should resolve to. Still exact-match only, no
  fuzzy matching (Ray's standing call).
- **Stored/displayed `draft.setName` recomposes `"{Year} {Name}"`**
  (`composeSetName()`) at save time — the Name FIELD is year-less, but the
  Docket, In Progress Sets, and the child-capture header all read
  `draft.setName` directly and don't separately show `draft.year` next to
  it, so the stored string stays the rich, year-prefixed label those
  screens already expect. A "Various"/unset year has nothing sensible to
  prefix, so it's left as just the Name in that case.
  `resumeSetDraftAtStep1()` uses the inverse (`typeNameFromDraft()`, via the
  draft's own real `year` field, not text-parsing) to correctly repopulate
  the now-year-less Name field regardless of when the draft was originally
  created.
- **Checklist deep-link (`applyAddSetContext()`) now also marks Name/Year
  touched** after pre-filling them, alongside its existing Category
  auto-fill — a deep-link from a specific known checklist slot is a
  stronger, more deliberate signal than a code lookup, so it shouldn't get
  silently overwritten by a product code entered afterward (Ray's explicit
  call). Its own banner sentence ("Adding the missing X") still shows the
  full dated name (more informative as a one-off message); only the Name
  FIELD itself gets the stripped type, via `dbSetTypeName()` against the
  checklist tile's own `{name, year}` shape.
- Verified headless (Playwright, no committed suite files — this project's
  established scratchpad-script convention): field order; datalist dedup
  (10 entries against the small `FAKE_DB_SETS` mockup, none year-prefixed);
  a product-code match auto-filling Name/Year/Category together; a manual
  Name edit surviving a subsequent different product-code match while Year
  (left untouched in that same test) still auto-filled independently — both
  correct per the per-field touched-flag design, not a bug; the non-blocking
  "not found" note; Category resolving from Name+Year both when Name is
  entered first and when Year changes after (recompute-on-either-field);
  the Various branch leaving Category blank for an annual-type name (no
  crash, no wrong guess); `composeSetName()`'s two branches; and
  `resumeSetDraftAtStep1()` correctly recovering a year-less Name from a
  synthetic composed-`setName` draft. Not verified: any real live-OneDrive
  click-through (product-code match against real `ItemNumber`/
  `ProductOption` data, the ~100-entry datalist against the real ~438-row
  DB_Sets sheet) — same "needs a real session" caveat as the rest of
  live-nav-data; Ray's own audit of the real Description column ("confirmed
  clean, no messy edge cases") is what this was built against, not an
  independent re-verification from this environment.

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

### Needs Attention hub (BUILT and merged to main). Supersedes the old flat
"Needs Attention queue" below, which is kept only for history.
The Dashboard's "Needs Attention" tile is now a consolidated hub
(`renderNeedsAttentionHub()`) replacing Staging Review and In Progress Sets as
**separate dashboard tiles** — both of those screens (and their internal
promote/reject / resume logic) are **completely untouched**; they just lost
their own front door and are reached via a link/row from inside the hub
instead (`navigate("staging")` / `navigate("inprogresssets")`, both pre-
existing). Their Back buttons now return to the hub (`needsdbcoins`) rather
than skipping past it to the Dashboard, since the hub is their only entry
point now.

Two sections, split by **why** something is stuck, not what kind of record it
is:
- **"Needs your action"** — things only Ray can finish or decide:
  - An aggregate row, **"N Set(s) in progress"**, if any Set draft has
    `status="Draft"` — taps through to the untouched In Progress Sets screen.
    Status alone decides this (not `researchNote` content) — every new Set
    draft carries a "GSID pending" note by design (see "Add Set" above), so
    using that to classify would wrongly route every in-progress Draft into
    the research section below.
  - An aggregate row, **"N coin(s) awaiting your decision"**, if any
    coin-side `FAKE_STAGING` row has a confident DB_Coins match (nothing left
    to resolve but Promote/Reject) — taps through to the untouched Staging
    Review screen.
  - **Dismissible photo gaps** — one row per otherwise-complete record
    missing a photo (`coinMissingPhoto()`, see Missing Photos below),
    each with its own **Dismiss** button, permanent, no snooze/resurface
    (Q1). **Rolls never get a gap row here** (Q5b) even though they still
    show up in the standing Missing Photos audit filter.
    - **Coin-side dismissals are ephemeral** (`dismissedCoinPhotoGaps`, an
      in-memory `Set` of CollectionIDs) — resets on reload, consistent with
      the rest of the still-unwritten Add Coin/coin-Staging path (Q2). This
      was a deliberate choice, not an oversight: building real persistence
      for Add Coin's mockup was explicitly out of scope for this task.
    - **Set-side dismissals are real** — a new `dismissedGaps: []` array on
      the Set draft itself (`dismissSetDraftGap()`), persisted via the same
      write layer Add Set already has (Q2). Checked on `Draft` and
      `Complete — pending research` drafts (missing `wholeSetPhoto`); a
      `Promoted` draft is done/externally-reconciled and out of scope here.
- **"Waiting on Copilot research"** — anything stuck for a *research* reason,
  each row paired with the "Open workbook in Excel" link (see below):
  - Coin-side `FAKE_STAGING` rows with **no** DB_Coins match
    (`findDbCoinsMatch()`, factored out of the Add Coin form's own
    `checkDbCoinsMatch()` so both use the identical denom+year+mint+variety
    rule rather than two copies of it).
  - The original flat `FAKE_NEEDS_QUEUE` backlog (already-saved coins with no
    DB_Coins match) — unchanged data/push logic, just relocated into this
    section instead of its own flat list.
  - Set drafts with `status="Complete — pending research"` — matches the
    original spec's literal wording (Sets/Coins with that status), extended
    to coins via the "no DB_Coins match" heuristic above since coins have no
    literal status field of their own.
- **Dashboard/Docket badge = a total across BOTH sections** (Ray's call,
  Aug 11). Reasoning: a research item still needs Ray to hand it to Copilot
  and then reconcile the result, so it IS his action — just a different kind
  — and an item sitting in the Docket uncounted reads as "nothing to do
  here" when there genuinely is. **This is the third and current state of a
  decision that has flipped twice**: originally a sum (inherited from the
  flat-queue badge), then narrowed to "Needs your action" only when the hub
  split actionable from research-bound ("the badge should only reflect
  things Ray can actually resolve himself"), and now back to a sum on the
  reasoning above. Implemented as `actionRows.length + researchRows.length`
  in `renderNeedsAttentionHub()`, feeding both `#needsAttentionBadge` and
  `updateDocketFob()`.

**"Open workbook in Excel" link (Task 2, plain link only — the `ms-excel:`
desktop-preferred variant was explicitly marked a nice-to-have and NOT
built).** `RealGraphClient.getWorkbookWebUrl()` does a single read-only GET
on the workbook's own Graph metadata (whichever workbook `WRITE_TARGET`
currently points at — the `_Testing` copy or eventually live) and returns its
`webUrl`; `getCachedWorkbookWebUrl()` fetches this **once per session** and
caches it (a test-only `__resetWorkbookWebUrlCacheForTest()` seam exists
since the cache would otherwise outlive a test's mock-client swap). Shares
the SAME gated write-layer MSAL instance Add Set already uses
(`ENABLE_SET_WRITE_LAYER`/`getWriteToken()`) rather than standing up a third
auth instance — so this link is subject to the identical safety posture:
disabled/localhost-only until the same production-redirect-URI prerequisite
is met, degrading to one explanatory note ("Workbook link unavailable...")
instead of a broken link when unavailable. **Not verified against a real
OneDrive session** — Ray's live-run needs to confirm the link actually lands
in an *editable* Excel session for the file owner, not a read-only preview
(see the open items list at the end of this section).

**Missing Photos — a standing, always-available Browse filter (Q6), separate
from the hub above.** A new `browseMissingPhotoOnly` boolean toggle chip
shares the Year filter's toolbar row on Coins/Rolls/Sets (same ANDs-with-
everything-else pattern, same reset-on-external-Browse-entry). `coinMissingPhoto(coin)`
is the single shared predicate both this filter and the hub's dismissible
gaps use: **missing = BOTH obverse and reverse absent** for an ordinary
coin/Roll (Q5a — either one present means "not missing"); a Set-bundle row
(`denom==="Multiple"`) only ever has one representative photo, so only that
one flag is checked. **Rolls are included here** (Q5b — "informationally," in
Ray's words) even though they're excluded from the hub's nag list; this
filter never looks at hub dismissal state at all, by design — it's a pure
audit, not a to-do list.
- **New sparse demo fields, `hasObversePhoto`/`hasReversePhoto`, on a handful
  of `FAKE_COINS` rows only** (AY-00001, AY-00003 both true; AY-00004
  obverse-only, deliberately exercising the "one photo present = not
  missing" rule) — same sparse-lookup convention as `FAKE_METAL_CONTENT`/
  `FAKE_COIN_DETAILS` elsewhere in this file. **This is a real, flagged
  interpretive call, not a neutral default**: since no coin in this mockup
  has ever had a real persisted photo (see "What NOT to build"), the
  *honest* answer today is that every non-Roll owned row is "missing" —
  which would flood the hub with ~20 dismissible rows at once (confirmed via
  screenshot during build). Marking a few rows as "has a photo" keeps the
  hub demo readable, matching how every other sparse `FAKE_*` lookup in this
  file already handles "not all data exists yet," but it's worth Ray's
  explicit sign-off rather than assuming it's the right call long-term —
  whichever real OneDrive CoinPhotos-presence check eventually replaces this
  should preserve the same two-flag *meaning*, not this literal field.

**Add Set's Dashboard icon changed to 🧩** (from 📦, which collided with the
Sets browse tile — Q7, Ray's "your judgment, just keep it distinct"). 🧩 was
already free (previously In Progress Sets', which lost its own tile in this
same change).

**Reused vs. newly written:** REUSED — `writeSetDraft`/`readSetDraft`
unchanged, the existing Staging Review and In Progress Sets screens
completely untouched internally, the `.wish-item`/`.staging-btn` CSS (no new
classes needed), the Year filter's toolbar-sharing pattern (mirrored exactly
for Missing Photos), `checkDbCoinsMatch()`'s matching rule (extracted into
`findDbCoinsMatch()`, called by both the live form and the hub). NEW —
`renderNeedsAttentionHub()` and its two-section render logic,
`dismissedCoinPhotoGaps` / `dismissSetDraftGap()` / `dismissedGaps` on the
draft schema, `coinMissingPhoto()`, `getWorkbookWebUrl()` /
`getCachedWorkbookWebUrl()`, the Missing Photos toggle, and the sparse photo
demo fields.

**Open items needing Ray's live confirmation or sign-off (flagged, not
resolved by headless testing):**
1. Does the "Open workbook in Excel" link actually land in an *editable*
   Excel Online session for the file owner, not a read-only preview? Same
   "needs a real click-through" caveat as the original Task 2 investigation.
   **Still open** — needs Ray's own live click-through, not resolvable from
   this environment.
Item 2 (sparse `hasObversePhoto`/`hasReversePhoto` demo fields) is
**CONFIRMED by Ray**: approved as-is — confined to the `FAKE_COINS` demo
layer, no real-data impact, resolves itself once real photo data lands at
go-live. Item 3 (badge semantics) is resolved — see "Dashboard badge"
above. Both removed from this list.
Verified entirely headless (36 new assertions across two suites — hub
sections/dismissal/badge math, and the Missing Photos filter/webUrl
degradation), plus the full 189-assertion prior suite re-run clean — 225/225
total, zero regressions; badge math re-verified again post-merge against the
merged tree after the "action-only" change. No live OneDrive session was
available this session
(Ray offline) — items 1 above specifically needs his own click-through,
consistent with how the original write-layer work also had a Ray-only live
step.

### Docket research queue: durable + resolvable (BUILT and merged to main)
**Merge status correction:** this section previously read "held on branch
`claude/docket-identity-matching`, NOT merged — awaiting Ray's go-ahead."
The full live-test checklist (Parts A–G plus E2) passed against the real
`_Testing` copy workbook — see `docs/DOCKET_LIVE_RUN_CHECKLIST.md`'s own
"Live-test status: COMPLETE" note for the full run, including the two bugs
found and fixed along the way (the designation/gradeSource Re-check gap,
and the reload double-render race) and Part F's clarified non-bug. Ray
gave explicit merge go-ahead and the branch was merged to `main`. **`main`
is now the source of truth for this feature**, same standing as every
other merged-after-holding branch in this file. The local-only
dev-flags-override mechanism and the Add Coin banner-wording fix that
landed on the same branch are part of this merge too — see their own notes
below.

First piece of the Docket identity-matching work. The "Waiting on Copilot
research" queue was `FAKE_NEEDS_QUEUE` and nothing else — a plain in-memory
array, seeded with two demo rows, appended to by Add Coin's save and Browse
Edit's CoinID re-link, **append-only with no code path that could ever
remove an entry**, and gone on reload. So a coin stayed flagged for the life
of the page even after Copilot added the DB_Coins row that resolved it.
This adds a durable store, a Re-check action, and a dismiss-with-reason.

**Gate: `ENABLE_DOCKET_WRITE = false`** — its own flag, same
localhost-dev-only posture as every other real-Graph flag, and added to
`WRITE_LAYER_ENABLED` (it writes a Staging file AND, on a confirmed
Re-check, one CoinID cell). With it off, everything behaves exactly as
before on `FAKE_NEEDS_QUEUE` — that's what keeps the shipped build working
unchanged, and it's asserted.

**Which "Staging" this writes to — a real discrepancy with the request's
own wording, resolved deliberately.** The task said "write to the Staging
**sheet** via the existing real Staging write path." Those are two
different things in this project and only one of them exists:
- the Staging **SHEET** (the Excel tab mirroring All's columns) is still
  entirely `FAKE_STAGING`, in memory. **There is no real write path to it,
  and none to any sheet but All.** The workbook write layer only ever
  PATCHes targeted ranges on an *existing* All row located by CollectionID
  — it has no append-a-new-row capability for any sheet. Writing the queue
  there would mean building that from scratch: new architecture, not "use
  the existing path."
- the Staging **FOLDER** (`{stagingBase}/…`, JSON files) is the app's real,
  already-shipping Staging write path (`writeSetDraft`/`readSetDraft`/
  `listSetDrafts` → `graph().uploadJson`/`getJson`).
Went with the folder, since that's the only thing the phrase accurately
describes, and Ray explicitly delegated the storage shape ("use your
judgment... new rows vs. a structured block"). **If he actually wanted rows
on the Staging sheet, that's a separate and much larger piece of work** —
it needs a sheet-append capability the write layer has never had.

**Storage shape**: ONE document at `{stagingBase}/_Docket/docket.json`
(`type: "docket-queue"`, `version: 1`, `entries: []`), not a file per
entry — the queue is tens of entries at most, one file gives
read-modify-write in a single round trip plus a natural home for a schema
version, and it keeps the Staging folder from filling with single-record
files `listSetDrafts()` has to walk past. **Safe alongside set drafts**:
`listSetDrafts()` `getJson()`s `{base}/{child}/set.json` for every child
and drops anything that isn't `type === "set"`, so a `_Docket` folder
holding `docket.json` yields null there and is skipped — asserted, not
assumed.

**Entries are closed, never deleted.** `status` is `open`/`resolved`/
`dismissed`; only `open` renders. A resolve records `resolvedCoinId` +
`resolvedDate`, a dismissal records `dismissedReason` + `dismissedDate`.
Item 3 explicitly required a dismissal to record WHY ("not just filter from
view"), and the same reasoning applies to a resolve — which CoinID it
landed on is exactly what someone reconciling later needs.

**One operations layer over both storage modes** (`docketOpenEntries` /
`appendDocketEntry` / `closeDocketEntry` → `docketResolveEntry` /
`docketDismissEntry`). Every caller goes through these rather than touching
either store, so the durable path and the flag-off mockup path can't drift.
The two stores are deliberately **not merged** when the durable one is
live — `FAKE_NEEDS_QUEUE`'s two seeded rows are mockup demo data, so in
durable mode the file alone is the source of truth. `appendDocketEntry`
returns `{entry, durable}` so a flag-on write that didn't reach OneDrive
still records in memory *and* says so, rather than silently dropping a flag.

**Re-check** (`docketRecheckEntry`) re-runs the *same* `dbCoinsCandidatesFor()`
matching against whatever DB_Coins is currently loaded, using the entry's
own stored attribute shape:
- **0 candidates** → entry stays queued, toast says nothing new was found.
- **1 candidate** → a confirmation dialog naming the CoinID/PCGS#/GSID/
  Mintage. **Never auto-applied** — asserted that nothing is written and
  the entry stays open until Confirm is actually clicked.
- **2+ candidates** → the shared ambiguous picker. The existing picker
  MARKUP (`#designationAmbiguousPanel`) lives inside the Edit Coin form so
  it can't be reused from the Docket view, but `renderAmbiguousMatchList()`
  itself is container-agnostic and IS reused, so both surfaces render
  candidates identically. The deliberate pick is the confirmation — same
  rule `checkDesignationReresolution()` already follows.
- Resolving writes the CoinID via **`writeCoinIdCell()`**, the one narrow
  audited CoinID write path Browse Edit's re-link already uses — not
  through the general allow-list machinery, which would weaken the
  "an unlisted column has no code path to a PATCH" guarantee.
- **A coin with no All row yet is handled, not treated as failure**: a
  coin saved to Staging holds a reserved CollectionID but has no All row
  until reconciliation promotes it, so `findAllSheetRowNumber()` returns
  null → the resolution is still recorded on the entry, with a note saying
  so, and no write is attempted.

**Dismiss-with-reason** reuses `showWriteGuard()`, which gained three
**backward-compatible** optional button hooks: `keepOpenUnless` (refuse to
close — a blank reason keeps the dialog open), `onInvalid`, and `collect`
(read body state BEFORE teardown, since `onClick` runs after the dialog
closes). Buttons that declare none behave exactly as before — the conflict
and identity-overwrite dialogs are untouched and their 358-assertion suite
re-runs clean.

**One necessary fix to Add Coin's push site**: it pushed the flag BEFORE
`getNextCollectionId()`, so every entry it created carried **no
CollectionID at all** — fine for a display-only backlog, useless for a
Re-check that needs to know which row to write to. Reordered so the ID is
reserved first (safe: `getNextCollectionId()` is a pure max+1 scan that
doesn't depend on the push). Add Coin has no Finish input, so those entries
carry a blank finish — handled correctly downstream, since
`dbCoinsCandidatesFor()` only narrows by finish when one is present.
Browse Edit's `flagCoinIdNeedsRelink()` now passes `finish` too, from the
same source `identityShape` uses.

**Verified headless — 63 new assertions (`verify_docket_queue.js`), all
passing**, plus all 14 prior suites re-run clean (748 total, zero
failures): the flag ships false and never touches Graph when off; seeded
entries get stable ids across repeated reads; the durable file lands at the
right `_Testing`-scoped path with the right type/version/shape; entries
survive a cache drop; `listSetDrafts()` is unaffected; all three Re-check
branches including "not auto-applied" and "Cancel writes nothing"; the
chosen candidate (not the first) is what gets recorded on an ambiguous
pick; overlay/list teardown; blank-reason dismissal refused with the
validation message and nothing recorded; a real reason recorded durably
with the entry retained; Re-check/Dismiss rendering on exactly the
queue-backed research rows and never on action rows; dismissal still
working in-memory with the flag off; and Add Coin's entry now carrying its
CollectionID. **Not verified: any real device or any real OneDrive
session** — this is a new write path and needs a live run before it's
trusted (see the testing note in the branch's own report).

**Real gap found and fixed while merging this branch onto
`claude/matcher-designation-hardening`.** Bringing the merged matcher
(Designation-aware, with the cert-protection guard from that branch's own
live-test fix) onto this branch was clean at the git level, but exposed a
real functional gap: **`buildDocketEntry()`'s field whitelist didn't
include `designation`/`gradeSource`, and `flagCoinIdNeedsRelink()` never
passed them in the first place** — so `docketRecheckEntry()` re-derived
candidates as if a coin's Designation were always blank and its GradeSource
were always non-service, regardless of the coin's real current values.
Reproduced directly: a synthetic entry shaped exactly like the real
`AY-00207` case (Designation `FB`, GradeSource `PCGS`) silently narrowed to
the plain (wrong) catalog row on Re-check instead of surfacing the
ambiguous picker — the exact class of bug the cert-protection guard exists
to prevent on the live Browse Edit Save path, just reachable through a
different door (Re-check) that the guard's own fix never touched.
- **Fixed**: `designation`/`gradeSource` added to `buildDocketEntry()`'s
  entry shape (defaulting to `""` for callers that don't have them, e.g.
  Add Coin's `no-db-coins-match` push — same safe-default treatment `finish`
  already got); `flagCoinIdNeedsRelink()`'s doc comment and its
  `appendDocketEntry()` call now forward `identityShape.designation`/
  `.gradeSource`; and — the actual bug, not just an oversight in the
  function signature — **`performBrowseEditWrite()`'s own call site**
  (which builds its own inline object rather than passing the save
  handler's `identityShape` through) needed the same two fields added
  directly, or the fix upstream would never have had anything to forward.
  `docketRecheckEntry()` now includes both in the shape it passes to
  `dbCoinsCandidatesFor()`. Same field names as `identityShape` throughout
  — no new shape invented.
- **Verified headless** (12 new assertions, `verify_docket_designation_fix.js`,
  not committed per this project's scratchpad-script convention): the
  schema keeps both fields when supplied and defaults them to `""` when
  not; an end-to-end repro through the real functions
  (`flagCoinIdNeedsRelink` → in-memory queue → `docketRecheckEntry`) for an
  `AY-00207`-shaped entry now correctly surfaces the ambiguous picker
  (`docketMatchOverlay`) instead of the single-match confirm dialog
  (`writeGuardOverlay`); a Seller-sourced control case (no real cert) still
  narrows to one match as before, confirming the fix isn't over-broad; and
  a source-level guard on the specific `performBrowseEditWrite()` call site
  so a future edit can't silently drop the two fields again without a test
  catching it. Full syntax/nav/console-error smoke re-run clean alongside
  it.
- **Live-verified since**: Part E2 of `docs/DOCKET_LIVE_RUN_CHECKLIST.md`
  passed against the real `_Testing` copy. Positive case (`AY-00522`,
  Designation=FB/GradeSource=PCGS, identity edited to a zero-match state):
  `docket.json` captured both fields correctly, and Re-check surfaced the
  ambiguous picker (blank-Designation + FB test rows) — no silent narrow.
  Control case (`AY-00518`, Designation=FB/GradeSource blank): Re-check
  resolved cleanly to a single "One match found," confirming the fix
  doesn't over-trigger for a non-certified coin. One operational-only
  finding, not a code bug: `DB_Coins` is fetched once per page load, so a
  DB_Coins row added directly in Excel needs a hard reload
  (`Ctrl+Shift+R`) before Re-check will see it — otherwise it looks
  exactly like a genuine matching failure. Documented in the checklist's
  setup section and Known Limitations, not just noted here.
- **Add Coin's `no-db-coins-match` push was deliberately left unchanged** —
  it doesn't currently pass `designation`/`gradeSource` even though the
  form has both fields available (`buildCoinRecordFromForm()` already reads
  them). Not part of the reported finding or Ray's fix request, so left
  alone rather than assumed; worth a look if a similar gap ever surfaces on
  that entry kind.

**Checklist Part B rewritten — Add Coin's Save is still a placeholder,
confirmed live.** Attempting Part B live surfaced that Add Coin's "Save to
Database" only toasts *"Placeholder only — ... Nothing written to OneDrive
yet"* — it can't create a real Docket entry, per Add Coin's own documented
scope ("Add Coin: the core workflow" — its direct-write/reconciliation step
is separate, larger, not-yet-built work, unaffected by this branch).
`docs/DOCKET_LIVE_RUN_CHECKLIST.md`'s Part B now creates the test entry via
Browse Edit's identity-edit path instead (same mechanism Parts D/E/E2
already used) — same underlying `docket.json` write/fob/reload-persistence
behavior, just triggered through a path that's actually live. **The
original Add-Coin-based steps are kept, marked blocked, not deleted** —
restore them once Add Coin's own write layer lands.
- **A real messaging bug found in the same attempt, fixed regardless of
  the scope question above**: Add Coin's form could show "No matching
  DB_Coins entry... needs a catalog entry added later" (`dbNoMatchBanner`)
  and then, further down the same form, "Matched with enough confidence
  for a direct save." (`saveConfidentBanner`) for the same coin —
  contradicting each other. Not a logic bug: confidence
  (`isConfidentMatch()`) is deliberately driven purely by Variety
  recognition, independent of DB_Coins match status (a DB_Coins miss never
  blocks a direct save on its own — see "Direct-write vs. Staging" above),
  so both banners can legitimately be true at once. The bug was only the
  word **"Matched,"** which falsely implied a catalog match. Reworded to
  "No unrecognized Variety flagged — ready for a direct save. (A missing
  DB_Coins catalog entry, if noted above, won't block this on its own.)" —
  same logic, no behavior change, just an honest claim. Verified headless
  (7 assertions, `verify_addcoin_banner_wording.js`, not committed per this
  project's scratchpad convention).

**Real double-render bug found live (Part B's reload-persistence step),
root-caused and fixed, not a browser-cache issue.** Every entry under
"Waiting on Copilot research" rendered TWICE after a plain `F5` reload —
`docket.json` itself was confirmed correct (right entry count, unique
`entryId`s, no duplicates), so this was a render-only bug. Two candidate
explanations were investigated: a genuine double-render/double-subscription
bug, or the same stale-JS-before-a-real-reload browser-cache issue hit
twice already that session. **Confirmed the former, not the latter** —
reproduced directly, headless, by firing two overlapping
`renderNeedsAttentionHub()` calls against a delayed mock Graph client (4
rows instead of 2 before the fix).
- **Root cause**: `renderNeedsAttentionHub()` is called both unconditionally
  at page-load init (`INIT` section) AND every time `navigate("needsdbcoins")`
  runs (opening the Docket drawer) — see that function's own comment. It
  clears its containers synchronously up front but only appends rows after
  several real Graph reads (`listSetDrafts`/`docketOpenEntries`/
  `getCachedWorkbookWebUrl`, all awaited). If the page-load call is still
  in flight when the user opens Docket — plausible right after a reload,
  since that's exactly when the app's own MSAL/Graph round trip is
  slowest — both calls independently clear-then-append, and whichever
  finishes LAST stacks its rows on top of the other's instead of onto a
  clean container.
- **Fixed** with a render-generation token (`needsAttentionRenderToken`,
  bumped at the start of every call): a staleness check sits right after
  the function's last `await` and before any DOM mutation — if a NEWER call
  started (and so already bumped the token) while this call's awaits were
  in flight, this call bails out entirely, touching nothing (not the row
  containers, not the badge/fob). Only the most-recently-STARTED call is
  ever allowed to render, regardless of which one's awaits happen to
  resolve first.
- **Verified headless** (12 new assertions across two scripts, not
  committed per this project's convention): the exact overlap scenario
  (older/slower call + newer/faster call) leaves exactly the newer call's
  rows with zero trace of the older call's, including the badge/fob count
  matching the winning call's own totals rather than a stale or summed
  value; a single, non-overlapping call afterward still renders normally.
  Full syntax check and a 9-route nav smoke re-run clean alongside it.
- **Live-reconfirmed since**: a fresh entry (`AY-00520`) created, then
  Docket opened immediately with realistic timing — no duplication.
  Followed by a plain `F5` reload — still no duplication, every entry
  showing exactly once. The fix holds under real conditions, not just the
  headless repro. Nothing further blocking on this branch from that
  session's testing.

**Full live-test checklist now COMPLETE — Parts A–G plus E2, all passed
against the real `_Testing` copy.** `docs/DOCKET_LIVE_RUN_CHECKLIST.md`
carries the full run's status at the top. One clarification from Part F:
the blank-reason validation message was briefly misread from a screenshot
as missing — re-checked directly and it's present and correct; no code
change needed. Test data left in `docket.json` (6 entries: 5 dismissed, 2
resolved) was cleaned up by Ray directly in OneDrive afterward, by choice
— nothing in this repo needed to change for that.

**Merged to main following Ray's explicit go-ahead** — see the merge-status
correction at the top of this section.

### Needs Attention queue (superseded by the hub above — kept for history)
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
Container, and can attach additional photos/receipts to an existing coin at any time.
**Widened by the Browse Edit write layer below** — the real allow-list is now
that list plus Year, MintMark, Denomination, Variety, Description, Value,
Cost, Shipping, Seller_Link, PurchaseDate, Remarks, Reviewed and
LastModified; see `ALL_WRITABLE_COLUMNS` for the authoritative version. The
"no research or judgment" boundary below is unchanged.
**One narrow exception on top of the allow-list**: CoinID is re-derived and
written automatically — never by hand, never through the general allow-list
mechanism — whenever an edit actually changes Year/MintMark/Denomination/
Variety, so the row's DB_Coins catalog link doesn't silently go stale. See
"Browse Edit real write layer" → the CoinID re-linking bug-fix note below for
the full mechanism.
**Container is a real, separate All-sheet column from StorageLocation** (not a
schema change — it already exists in the workbook) — Edit Coin exposes both as two
independent fields, same as Edit Set below. App CANNOT do anything requiring
research or judgment (new PCGS# lookups, album slot matching, restructuring, cost
allocation) — those stay chat + Copilot tasks. This is the exact scope of the Edit
button on Browse's coin detail view (see "Browse detail view" above) — it doesn't
expose any field beyond this list. A Set-bundle row (`Denomination="Multiple"`)
gets a different, separate Edit Set form instead (Storage Location, Container,
Value, Purchase Details — Storage Location and Container are two separate inputs
there too, **superseding** an earlier single blended "Storage / Container" field) —
see "Browse detail view" above; coin-membership editing for a Set is explicitly out
of scope, parking-lot item.

**Location detail-view section (new)**: a "Location" accordion (same collapsed-by-
default pattern as Purchase Details/Set Details/Notes & Facts) shows Storage
Location + Container for both individual coins and Sets, hidden when neither has
data. This is **additive, not a move** — Storage Location still also shows in the
always-visible key facts row above the accordions (Value/Cert/Storage), unchanged;
Container only ever appears in the new Location section.

Every app-made write (add or edit) sets a **Reviewed** column on All to
blank/unchecked. A human sets it checked after glancing at it.

### Matcher hardening: Designation in dbCoinsCandidatesFor() (BUILT and merged to main)
**Merge status correction:** this section previously read "held on branch
`claude/matcher-designation-hardening`, NOT merged — awaiting Ray's go-ahead
+ live pass." The live pass has since run clean: §B2 of
`docs/MATCHER_DESIGNATION_LIVE_RUN_CHECKLIST.md` was confirmed against the
real `_Testing` copy workbook — editing `AY-00207` (PCGS-certified, cert
#4906, non-FB) from blank to FB Designation correctly surfaced the ambiguous
picker (both `C-1916-D-10C-01` plain and `C-1916-D-10C-02` FB shown, nothing
written, backed out cleanly) instead of the old silent narrow — confirming
the cert-protection guard works as designed. Issue 2 (Cancel not reverting
the Edit form's displayed fields) was separately confirmed as expected
behavior, not a bug — see the session-log note below. Ray gave explicit
merge go-ahead and the branch was merged to `main`. **`main` is now the
source of truth for this feature**, same standing as every other
merged-after-holding branch in this file.

Built off `main` (NOT the paused `claude/docket-identity-matching` branch —
kept strictly separate at Ray's explicit instruction). Adds
`DB_Coins.Designation` to the DB_Coins match so the FB-catalog expansion
stops flooding the ambiguous picker, plus full-attribute re-link validation
and a new save-time confirm.
- **Workbook verified fresh, not from prior docs (2026-08-17 upload):**
  DB_Coins is now **34 columns**, `AH = Designation`, `AG = Mint`. Note
  there are TWO mint columns now — `MintMark` (H, the abbreviation `S`/`D`/
  blank) and a new `Mint` (AG, the full name `San Francisco`/`Denver`/
  `Philadelphia`). **The matcher reads `MintMark` (H)** to match
  `All.MintMark`; the new full-name `Mint` column is not used by any match
  logic and must not be. Designation is populated on **only 78 rows**, all
  `FB`, all Mercury Dimes, each a Business-Strike duplicate of a pre-existing
  plain sibling — so Finish can't separate them, and 73 owned dimes that used
  to resolve to exactly one candidate now resolve to 2+.
- **`mapWorkbookRowToDbCoin()` now reads the real Designation column** (was
  hardcoded `""` from back when DB_Coins had no such column). FAKE_DB_COINS
  already carried its own designation values (the 1909-S RD/BN mock pair), so
  the mock path is unaffected — only a live-fetched row's exposure changed.
- **Designation narrowing tier in `dbCoinsCandidatesFor()`, option C
  (blank-as-value) — DELIBERATELY STRONGER than the Finish tier, confirmed
  with Ray.** Unlike Finish (where a blank owned value must NOT narrow,
  because `All.Finish` carries values DB_Coins lacks like "Circulated"), a
  blank `All.Designation` genuinely means "not FB" and so SHOULD select the
  plain (blank) catalog row and drop the FB one; an FB owned coin selects FB
  and drops plain. Still soft: if no candidate matches the owned Designation
  it falls back to the full set (never zero, never a Docket flood). Verified
  against the real sheet: this is the ONLY semantic that actually fixes the
  collision (73 owned dimes → 2; the literal "narrow only when both non-blank
  and differ" reading fixes nothing because one side of every FB/plain pair
  is always blank). Non-dimes are untouched (no non-dime DB_Coins row carries
  a Designation).
  - **KNOWN, ACCEPTED TRADEOFF (Ray signed off):** an owned Mercury dime
    that is physically Full Bands but not yet recorded FB in `All.Designation`
    now silently resolves to the plain catalog row instead of surfacing the
    picker. Logged as a ParkingLot item (see the session-log entry below) —
    a physical FB-check pass, same shape as the deferred copper-color pass.
  - **Cert-protection guard, added after Ray's live-test pass found a real
    gap in the tier above.** Live-testing on `AY-00207` (SerNo
    `4906.06/33115202`, GradeSource `PCGS`) surfaced that the blank-as-value
    rule assumes `All.Designation` is the best available signal — true for a
    Seller/Owner estimate, but wrong the moment a coin carries a REAL
    certification: AY-00207's own cert decodes (via the existing
    `parsePcgsLabel()`) to PCGS# 4906, which is DB_Coins' plain row, yet a
    manually-typed Designation=FB edit would have silently re-linked it to
    the FB row — writing a Designation that contradicts the cert already on
    file. **`isServiceGradeSource(gradeSource)`** (new) checks whether a
    GradeSource resolves to a `Lookup_Graders` row with `Type="Service"`
    (PCGS/NGC/ANACS/ICG/CAC confirmed today) rather than a hardcoded grader
    list, so it stays correct if that table ever changes. When true, the
    Designation tier's blank-as-value narrowing is withheld entirely —
    `candidates` falls through unnarrowed, so the ambiguous picker fires
    instead and a human decides, same as before the Designation tier
    existed. "Seller"/"Owner"/"AI-est"/blank all resolve non-Service and are
    unaffected — those 55 (of 73) collision coins still get the blank-as-
    value narrowing, since there's nothing independently verifiable to check
    it against.
    - **Deliberately denomination/field-agnostic, not Mercury-dime- or
      Designation-specific (Ray's explicit correction to the first pass of
      this fix, which was scoped to PCGS-only).** The guard runs inside
      `dbCoinsCandidatesFor()` itself, ahead of the Designation tier, for
      EVERY call regardless of denomination — so it protects Jefferson
      Nickel FS / Standing Liberty FH the moment those get backfilled, with
      no second fix needed, even though only dimes exercise it today.
    - **`Lookup_Graders` is now read live** (`mapWorkbookRowToGrader()`,
      `LIVE_LOOKUP_GRADERS`/`activeLookupGraders()`, fetched alongside
      All/DB_Sets/DB_Coins/Lookup_MetalContent in `ensureLiveNavDataFetch()`)
      — confirmed real headers: `Grader`, `Full Name`, `Cert Lookup Base
      URL`, `Type`. `FAKE_LOOKUP_GRADERS` gained a matching `type: "Service"`
      field on all 5 mock rows so the mock path behaves identically before a
      live session loads the real table. `getGraderBaseUrl()`/
      `buildCertLookupUrl()` (the pre-existing cert-link-building code,
      unrelated to this fix) were deliberately left reading
      `FAKE_LOOKUP_GRADERS` directly, out of scope here.
    - **`identityShape` (Browse Edit's save handler) gained a `gradeSource`
      field**, sourced from the form's own current `GradeSource` value (same
      pattern as `designation`) — this is what lets the guard see whether
      the coin being saved is Service-graded. `checkDesignationReresolution()`'s
      other caller (`coin` objects, which already carry `gradeSource` via
      `mapWorkbookRowToCoin`/`FAKE_COINS`) needed no change.
    - **Still just a guard, not the derivation itself** — nothing here
      decodes the cert or picks the "correct" row automatically. The
      separate, deferred cert-derived-resolution enhancement (using
      `parsePcgsLabel()`'s SPEC against DB_Coins.PCGS# as an authoritative
      match) remains its own future ParkingLot item, per Ray's explicit
      confirmation this stays a later, separate task.
- **`Designation` added to `COINID_TRIGGER_FIELDS`** (was excluded). Now that
  Designation is a real match input, a Designation change can genuinely
  change which DB_Coins row (and CoinID) a coin resolves to, so it must
  trigger the CoinID re-link write. Before, a Designation-only edit ran the
  full re-resolution and then silently DISCARDED the answer (it was in
  `DB_COINS_RESOLUTION_FIELDS` but not the CoinID-write gate). The two sets
  have now converged — `DB_COINS_RESOLUTION_FIELDS === COINID_TRIGGER_FIELDS`
  (kept as a separate name only for readability at its call site).
- **New "Confirm catalog re-link" dialog (`showCoinIdChangeDialog`) — item 3,
  built as the GENERAL option (b), not Designation-specific.** Fires whenever
  re-resolution lands on a single, different, non-blank CoinID than what's
  already on the row, for ANY identity field — the missing confirmation that
  let the original AY-00008 Year-change bug silently re-point a row's catalog
  link. Composed as the INNER gate after the existing identity-overwrite
  dialog (on an identity edit the user confirms the field change first, then
  its catalog-link consequence). Deliberately NOT fired when: the CoinID is
  being filled from blank (completing, not overwriting — mirrors the
  identity-overwrite dialog's own hadValue rule); the re-link clears to blank
  (a genuine no-match already routes to Docket with its own toast); or the
  user already chose the row via the 2+ ambiguous picker (`viaPicker`
  threaded through `checkDesignationReresolution`'s callback so the pick
  isn't redundantly re-confirmed).
- **Cancel on this dialog (or the identity-overwrite dialog before it) does
  NOT revert the Edit form's own displayed field values — confirmed as
  correct, not a bug (Ray, 2026-08-18).** Nothing is written to the
  workbook either way (that's the actual guarantee these dialogs make), but
  a field the user typed into stays showing what they typed until they
  either save again or use the Back button's existing "unsaved edits"
  Keep-editing/Discard prompt. This is consistent with every other guard
  dialog in Browse Edit (the write-conflict dialog's own doc comment says
  the same thing) — Cancel means "don't save this," not "undo what I
  typed." Don't revisit this as an open item.
- **Scope boundaries held:** Thread B (link audit / further backfill),
  copper-color RD/RB/BN designations, and Add Coin's lack of a Finish input
  are all explicitly out of scope, untouched. (The workbook's own ParkingLot
  already carries a "Thread B worklist" row noting this Designation-only fix
  won't catch the commemorative wrong-link class — consistent with that
  boundary.)
- **Verified headless — 47 assertions (`verify_designation_matcher.js`, up
  from the original 34), all passing**, plus the full 651-assertion main
  branch's own regression suite re-run clean (698 total). The suite covers:
  the mapper reading Designation; every branch of the blank-as-value tier
  (plain, FB, soft fallback, non-dime no-op, Finish still narrowing,
  blank-Finish still not narrowing, the 2-blank-row picker-preserved case,
  the FAKE RD/BN pair); the `COINID_TRIGGER_FIELDS` change and set
  convergence; the confirm dialog end-to-end (fires on a Designation-only
  re-link, writes nothing until confirmed, Cancel writes nothing, Confirm
  writes both Designation and the new CoinID, no dialog on a Grade-only or
  blank-fill save, and the 2+ picker path suppressing the redundant
  confirm); and the new **13 cert-protection assertions**: `isServiceGradeSource()`
  against all 5 FAKE_LOOKUP_GRADERS services and against Seller/Owner/
  AI-est/blank/unknown, the same function reading through a swapped-in LIVE
  `Lookup_Graders` table (proving it isn't hardcoded), the guard withholding
  narrowing for PCGS- and NGC-sourced dimes while leaving a Seller-sourced
  dime unaffected, the identical guard protecting a synthetic non-dime
  Jefferson Nickel FS pair (denomination-agnostic proof), and an end-to-end
  Save-button repro of the exact AY-00207 live-test finding (PCGS
  GradeSource + a Designation edit now surfaces the ambiguous picker instead
  of the single-candidate re-link dialog, with nothing written until a
  choice is made). **Three existing `verify_browse_edit_write.js`
  assertions were updated** (in the original pass, unaffected by this
  follow-up) to click through the confirm dialog — they asserted the old
  silent-re-link behavior, so this follows the real design change, not a
  weakening. **Live-verified since**: `docs/MATCHER_DESIGNATION_LIVE_RUN_CHECKLIST.md`
  §B2 (`AY-00207`) confirmed the cert-protection guard against the real
  `_Testing` copy workbook — see the merge-status correction at the top of
  this section.
- **Regression baseline note:** this branch is off `main`, which does NOT
  contain the Docket Part 1 durable-queue work (that's on the paused
  `claude/docket-identity-matching` branch). So the baseline here is the
  685-assertion main suite, not the 748 that includes the 63 Docket-only
  assertions. The zero-candidate path reuses `flagCoinIdNeedsRelink()` as it
  exists on main (in-memory `FAKE_NEEDS_QUEUE`); it's forward-compatible —
  the Docket branch already rewired that same function to route durably, so
  whichever merges second inherits the other's behavior.

### Browse Edit real write layer (BUILT and merged to main)
**Merge status correction:** this section previously read "held on branch
`claude/browse-edit-write-layer`, NOT merged — awaiting Ray's real-device
pass" — that reflected the plan, not the outcome. The full checklist (Parts
B, C, D, D2, E, F) has since passed live-device verification against the
`_Testing` copy workbook, including the MSAL single-instance fix, the
workbook read/write path unification (Bugs A/B), and the picker/conflict-loop
fix (Part F) all holding up under real use, not just headless suites. Ray
gave explicit merge go-ahead and `claude/browse-edit-write-layer` was merged
to `main` (commit `05718e0`). **`main` is now the source of truth for this
feature**, same standing as every other merged-after-holding branch in this
file. `ENABLE_BROWSE_EDIT_WRITE` and `ENABLE_LIVE_NAV_DATA` ship `false` on
main as usual — dev-only until a production redirect URI exists for a real
push to production. A batch of smaller, non-blocking display/UX findings
from the final live-device round (flip-card layout, CollectionID placement,
a couple of staleness gaps) was explicitly deferred by Ray to a separate
follow-up task — not started here, not implied by this merge.

The app's first write **into the workbook itself**, and the pattern every
other form's write layer should follow. (The Add Set write layer writes
Staging JSON + photo files and deliberately never touches the workbook — a
different thing entirely.) **Scope is Browse Edit's Save button only** — Add
Coin, Edit Set, Wishlist and Batch Receipt all still have exactly the stub
Saves they had before, untouched. **Partly superseded: Add Coin now has its
own Phase 1 write layer** (Staging drafts + photos — see "Add Coin write
layer — Phase 1" below); Edit Set, Wishlist and Batch Receipt are still
stubs.

**Gate (`ENABLE_BROWSE_EDIT_WRITE = false`, localhost-dev only)** — its own
flag, deliberately NOT riding `ENABLE_SET_WRITE_LAYER`, since the two write
completely different things and must be independently enable-able (same
"don't couple independently-flagged features" rule the reference-image and
live-nav readers already follow). A new `WRITE_LAYER_ENABLED = ENABLE_SET_WRITE_LAYER
|| ENABLE_BROWSE_EDIT_WRITE` is what now gates constructing the write-capable
MSAL instance (renamed `setWriteMsalInstance` → `writeMsalInstance`, since it
serves both features) — with both flags off there is no write-capable auth
instance on the page at all, so nothing can redirect or write.
`WRITE_TARGET = "copy"` is unchanged, so writes land in the `_Testing` copy
workbook until Ray flips it.

**Column allow-list, enforced structurally rather than by convention.**
`ALL_WRITABLE_COLUMNS` = Year, MintMark, Denomination, Variety, Description,
Value, Cost, Shipping, Seller_Link, PurchaseDate, StorageLocation, Container,
Grade, GradeSource, Designation, **SerNo**, Remarks, **Reviewed**,
LastModified. `ALL_NEVER_WRITE_COLUMNS` = SpotValue, Total, CollectionID,
CoinID, SetID, OriginSetID, CertLink. `buildRowCellEdits()` derives its ranges
from the allow-list alone, so an unlisted column has **no code path to a
PATCH** — verified by asserting that Total/SpotValue/CollectionID/Status
together produce zero edits.
- **Column POSITIONS are resolved from the sheet's own header row at run
  time** (`ensureAllHeaderMap`, cached per session), never hardcoded — a
  future Copilot-side column insertion can't silently redirect a write into
  the wrong column.
- **Why multiple targeted range PATCHes and not one row-wide write:** the
  writable columns are **not contiguous** — the two formula columns sit
  between them (Total at U, SpotValue at Z). A Graph range PATCH must supply
  a value for every cell in its rectangle, so any range spanning U or Z would
  overwrite a live formula with a literal and destroy it — the exact silent
  data loss this workbook already suffered once (see below). Adjacent
  writable columns merge into one range; a run stops dead at a formula
  column. Sent as one `$batch` request chained with `dependsOn`, so it's one
  round trip and strictly ordered. **Graph offers no transactional
  multi-range workbook write** — the ordering is what matters instead:
  LastModified is queued last, so it can only be stamped if every data write
  ahead of it succeeded.

**Row targeting: CollectionID matched fresh at write time**, never a row
index remembered from when the form opened (`findAllSheetRowNumber()`, via
the `AllCoins` table's own CollectionID column). Verified by shuffling rows
in the mock grid between reads and confirming the same id resolves to its new
position. A CollectionID that's no longer on the sheet returns `not-found`
rather than writing to a guessed row. (CollectionID was confirmed unique
across all 542 rows, so this is a safe key.)

**Conflict detection (concurrent-edit hard block).** Opening Edit Coin
snapshots every allow-listed column's live value (`loadBrowseEditSnapshot`).
On Save the row is re-read fresh and compared field by field; **any**
difference — whether or not the user's edit touches that field — blocks the
save entirely. No write, no partial write, no merge, no "save anyway" option.
The dialog names each changed field with its was/now values; the form keeps
everything typed into it and the user stays on it.
- **`LastModified` and `Reviewed` are excluded from the comparison** — this
  layer writes both on every save, so comparing them would make a second
  save from the same open form report a false conflict about its own
  previous write.
- Blank-ish values (`null`/`undefined`/`""`) all compare equal, and numbers
  compare numerically, so `620` vs `"620"` isn't a phantom conflict.
- After a successful save the snapshot is **re-baselined** to what's now on
  the row, so a second save from the same open form compares correctly.

**Identity-overwrite confirmation** — `detectIdentityOverwrites(current,
next, fields)`, deliberately built as a **shared, reusable helper taking its
field list as a parameter** (Q8): Browse Edit passes `IDENTITY_COLUMNS`
(Year, MintMark, Denomination, Variety, Description); **Edit Set will call
the same function with its own (Year, Description) list when its write layer
is scoped** — do not fork it. Fires only on a real overwrite of an
already-populated field; **filling a blank field never asks**. Separate
concern from conflict detection: nothing is wrong, it's the user's own edit
being read back because it replaces catalogued data.

**Both guards share one dialog shell** (`#writeGuardOverlay` /
`showWriteGuard()`) with a per-call button row, since they're identical in
presentation but different in kind (one can only be acknowledged, the other
is a real Cancel/Confirm choice). Reuses the photo-adjuster overlay chrome,
same as Grading Help and the Year filter. Date values render as dates in
these messages, not raw Excel serials.

**Dates: real date values, date-only, no time component** (Q2 — this
overrode the task spec's own "timestamp" wording, per the workbook's standing
rule, which exists because 44 ValueDate cells once had to be repaired after
being pasted in as ISO/Zulu text). Written as Excel serial numbers with an
explicit `yyyy-mm-dd` number format applied on every write — **note the
`LastModified` column currently carries a leftover `yyyy-mm-dd hh:mm` format
from when it was created expecting a timestamp**, so setting the format
explicitly is what stops a date-only value rendering as a misleading
"... 00:00". Serials are built from bare Y/M/D parts, never by parsing a full
timestamp, so nothing can shift a date across a day boundary by timezone;
`excelSerialToday()` uses the user's LOCAL calendar day.

**Field mapping decisions (Ray's answers):**
- **Notes → `All.Remarks`** (Q1). There is no `Notes` column on All — it
  exists only on DB_Coins/Wishlist. The textarea **loads prefilled with the
  row's existing Remarks**, so an edit extends rather than silently clobbers
  text Copilot put there (18 real rows carry "Physical receipt in binder —
  not yet digitized.").
- **Fun Fact is now READ-ONLY in Edit Coin** (Q1) — it's a DB_Coins catalog
  fact about the coin TYPE with no All-sheet column to write to, so a
  per-coin edit surface for it was wrong. Displayed via `catalogFunFactFor()`
  (DB_Coins FunFact, falling back to the `FAKE_COIN_DETAILS` demo value so
  the mockup still shows something). **This supersedes the accordion-redesign
  addendum's "Notes & Fun Fact are now editable"** — Notes still is, Fun Fact
  isn't.
- **`SerNo` added to the allow-list; `CertLink` stays out** (Q4).
- **`Reviewed` is blanked on EVERY successful save**, changed or not (Q6) —
  an app-written row is by definition not human-reviewed yet, so it must not
  stay checked just because this edit didn't touch it.
- **`Total` is never written** (Q3) — it's a live formula
  (`=AllCoins[[#This Row],[Cost]]+AllCoins[[#This Row],[Shipping]]`), so
  Excel recalculates it the instant Cost or Shipping changes and the write
  layer must do nothing for it to stay correct.
- Identity-overwrite confirmation alone is sufficient for a Denomination
  change (Q7) — no extra handling. The Receipt pill in Edit Coin stays
  exactly as inert as it was; Save writes nothing for it (Q10).

**Containers read-layer join (built alongside).** A containerized record's
displayed Storage Location now resolves through the **Containers** tab
(`ContainerName -> StorageLocation`) instead of its own flat
`All.StorageLocation` — `resolveStorageLocation(record)`, wired into Browse
detail's Storage accordion. **Identical logic for a plain coin, a Set, and a
child coin — no record-type branching and explicitly no parent/child
inheritance**: a child carries its own Container like any other row, and a
child with a blank Container falls back to its OWN flat StorageLocation
rather than inheriting its parent Set's container. Blank/unknown Container
falls back to the flat value, so nothing ever renders blank because the
lookup is missing or still loading.
- **Edit Coin hides the StorageLocation input entirely when the location is
  container-derived** (Q5, approved as an intentional UI change), showing the
  derived value read-only with a short explanation. Leaving it live would let
  a save write a per-coin location disagreeing with its container's — exactly
  the drift the Containers tab exists to eliminate. A derived value is also
  **omitted from the write set entirely**, not written back. Clearing
  Container immediately hands the editable input back.
- **This does NOT extend to Photos or Receipts** — those still read the old
  flat All columns in this build; that migration is explicitly separate work.
- **Expect this to look like a no-op on current data**: all 314 rows with a
  Container already agree with the Containers tab, with zero orphan container
  names, so nothing displays differently today. It only diverges once a
  container is actually moved. That's the correct outcome, not a sign it
  isn't wired.
- New `.readonly-field` class for both this and Fun Fact — deliberately
  borderless/flat/muted with a left rule, **not** styled like an input (a
  first pass that looked like an input was caught in a screenshot and
  changed). Same "no global `.hidden` rule in this file" trap as before —
  `.readonly-field.hidden`, `#browseEditStorageLocation.hidden` and
  `.placeholder-note.hidden` are all load-bearing scoped rules.

**Test seams:** `__setBrowseEditWriteEnabledForTest()` overrides the gate
(kept as a separate override variable so the shipped `const` stays genuinely
immutable and no app code can flip it), plus
`__resetAllHeaderMapForTest()`, `__setContainersForTest()`,
`__setBrowseEditSnapshotForTest()`/`__getBrowseEditSnapshotForTest()`. The
mock Graph client gained a real 2-D sheet grid (`seed.sheets`, exposed as
`_grids`) plus `readWorkbookRange`/`readTableColumn`/`patchWorkbookRanges`,
so a test can mutate a cell between form-open and Save to simulate a
concurrent Copilot edit and then assert nothing was written.

**Verified headless — 206 assertions across both required viewports**
(`verify_browse_edit_write.js`, 103 × 2), zero page/console errors: allow-list
and never-write list contents and disjointness; header-map position
resolution against the real 49-column layout; row re-resolution after rows
shift; the row read never even exposing formula/identity columns; Excel
serial round-trips and whole-day stamping; conflict detection including
third-party edits, self-stamped-column exclusion and no phantom
blank/numeric conflicts; identity overwrite vs. blank-fill vs. non-identity
vs. Edit Set's own field list; edit ranges merging adjacent columns while
never touching U or Z, and date columns carrying their own format; a full
`saveCoinRowToWorkbook()` cycle (clean save, hard block writing nothing,
not-found, and a no-change save still stamping LastModified/Reviewed); the
Containers join across coin/Set/child; the detail view showing the derived
location; the read-only Fun Fact and derived-storage UI including clearing
Container; both guard dialogs; and a **full end-to-end run through the real
Save button** — snapshot load, Notes prefilled from Remarks, a plain save
writing real cells with both formula cells untouched, an identity edit
asking first and writing nothing on Cancel, a concurrent edit blocking a
real Save click with the typed text preserved, and a reopen-and-retry
landing. Plus: with the gate off, `ENABLE_BROWSE_EDIT_WRITE === false`, no
write-capable MSAL instance exists, a save returns `disabled` and writes
nothing, and Save still does the old session-only in-memory update. All 9
prior suites re-run clean alongside it — **479 assertions total, zero
failures**. `verify_addendum.js`'s "Fun Fact is an editable textarea"
assertion was updated to assert the new read-only behavior, following a real
design decision rather than weakening the suite.

**Two bugs found during Ray's live copy-workbook run, both fixed and
re-verified headless (checklist itself passed — B8-B9/C12-C14/D16/E19-E20 all
confirmed against real OneDrive data; these were refinements on top, not
architecture changes):**
- **Bug 1 — Edit Coin's Mint Mark field could load blank for a real "P" coin.**
  AY-00193 (a 2017-P Lincoln Shield Cent, workbook `MintMark = "P"`) loaded
  with Mint Mark blank in Edit Coin — setting a `<select>`'s `.value` to an
  option that doesn't exist silently falls back to no selection, and the
  dropdown only ever offered blank/D/S/CC/O/W. This then correctly tripped
  the identity-overwrite dialog on an unrelated save (`MintMark: P →
  (blank)`) — the identity-check logic itself was working correctly off of
  what the form had wrongly loaded; the bug was upstream of it. **Root cause
  confirmed against the real workbook**: 25 real rows carry a plain `"P"` —
  modern Philadelphia issues sometimes mark it explicitly even though
  historical Philadelphia coins carry no mint mark at all. Fixed by adding
  `"P — Philadelphia (explicit)"` as a real, separate option from the
  default blank in BOTH Add Coin's and Edit Coin's Mint Mark dropdowns (kept
  in sync, per the existing "Edit Coin reuses Add Coin's dropdown options"
  rule), and adding `"P"` to `MINT_MARK_ORDER` (right after blank) so the
  Coins tab's Year-then-MintMark sort treats it correctly instead of sorting
  it to the very end as an unrecognized value.
- **Bug 2 — CoinID wasn't recomputed when Year/MintMark/Denomination changed,
  silently linking to the wrong catalog data.** Reproduced live: AY-00008
  (`CoinID C-1919-S-1C-01`) had its Year edited to 1920 and saved
  successfully — CoinID stayed `C-1919-S-1C-01` instead of becoming
  `C-1920-S-1C-01`, even though DB_Coins has a real, DIFFERENT row for
  1920-S with its own Mintage. Since SpotValue's formula and any
  Mintage/Composition/FunFact display key off CoinID, the row would have
  silently shown 1919-S's catalog data on a coin now displayed as 1920-S —
  no error, nothing visibly wrong. **Fixed with a new, narrow, single-purpose
  module** (`resolveCoinIdForEdit`/`writeCoinIdCell`/`flagCoinIdNeedsRelink`),
  deliberately NOT added to `ALL_WRITABLE_COLUMNS` — CoinID has no general
  code path to a PATCH, only this one dedicated, explicitly-audited write,
  fired only from `performBrowseEditWrite()` after the main row save has
  already succeeded:
  - Triggers only when Year, MintMark, Denomination, or Variety actually
    changed (`coinIdInputsChanged()`, compared against the live snapshot).
  - Reuses the SAME DB_Coins candidate lookup Designation re-resolution
    already used (`dbCoinsCandidatesFor()`, factored out so both share one
    "which DB_Coins row matches?" implementation) — a real fix in its own
    right, since the Designation re-check was previously being run against
    the coin's STALE pre-edit identity (`{...coin, designation}`) rather
    than the new form values, meaning a genuine identity edit never actually
    got re-checked against what it was being changed TO. Both now run off
    one `identityShape` built from the actual submitted form values.
  - A unique DB_Coins match → writes the real CoinID and reports it in the
    save toast ("CoinID updated to C-...").
  - Zero matches → **clears CoinID to blank** (an already-supported "pending
    research" state elsewhere in the app, e.g. Add Coin's own DB_Coins-miss
    path) rather than leaving the stale, now-wrong value in place, and
    pushes the coin into the SAME `FAKE_NEEDS_QUEUE`/Needs Attention
    "Waiting on Copilot research" pipeline Add Coin already uses for a
    brand-new unmatched entry (`flagCoinIdNeedsRelink()`) — reusing that
    existing pattern rather than building a parallel one, per the explicit
    request. A `kind: "coinid-relink"` marker gives it its own wording in
    the hub ("Identity edited, no DB_Coins match — CoinID cleared, needs a
    catalog entry") so it doesn't read as a brand-new find.
  - 2+ candidates → the existing shared ambiguous-picker UI surfaces exactly
    as it already did for Designation; by the time the save callback fires,
    ambiguity has already been resolved into a real pick or a genuine miss,
    so the CoinID logic itself only ever sees "matched" or "didn't."
  - A write failure on this follow-up step (main row already saved
    successfully) degrades to a toast rather than losing the rest of the
    save.
- **Bug 3 — Notes briefly flashed unrelated mock content before settling to
  the real value.** On AY-00001 (real `Remarks` blank), Edit Coin's Notes
  field showed "Bought at auction, still in the original PCGS holder." for
  about half a second before correctly clearing — that text matched no real
  row; it was `FAKE_COIN_DETAILS`'s demo fallback rendering because the
  initial synchronous form-populate ran before `loadBrowseEditSnapshot()`'s
  async fetch resolved (fire-and-forget, not awaited). Functionally harmless
  (the eventual Save always wrote the real value), but confusing and
  plausible enough to be mistaken for real data. **Fixed**: with the write
  layer on, the mock `details.notes` fallback is never used at all — Notes
  starts genuinely blank with a "Loading current notes…" placeholder instead,
  filled in for real once the snapshot resolves. The write-layer-OFF
  (mockup) path is unchanged and still uses the mock value immediately,
  since there's no real fetch coming to correct it there.
- **Polish item**: the Storage Location read-only note reworded from "Set by
  this coin's container — change it on the container, not here." to "Set by
  the Containers tab — change it there, not here." — the old wording read
  ambiguously between "container" as a concept and as the literal tab name.
- **Checklist gap**: `docs/BROWSE_EDIT_LIVE_RUN_CHECKLIST.md` didn't mention
  `ENABLE_LIVE_NAV_DATA` needing to be on too, so Catalog only showed the
  ~17-item hardcoded demo set during the live pass instead of real workbook
  data. Added to the checklist's setup steps, plus a note that first open may
  now trigger sign-in redirects from BOTH separate MSAL instances (live-nav
  read, write-layer read/write), not just one.
- 40 new headless assertions (`verify_browse_edit_write.js`, 246 total now,
  123 × 2 viewports) cover all three bugs: the "P" option existing and
  loading correctly in both dropdowns plus its `MINT_MARK_ORDER` position;
  Notes never showing mock content while loading (with a distinguishing
  placeholder) vs. the unchanged write-layer-off behavior; and CoinID
  re-linking end-to-end through the real Save button — a real match writing
  the new CoinID and updating the in-memory record, a genuine miss clearing
  CoinID and flagging Needs Attention with the correct identity, and a
  non-identity save (Value only) leaving CoinID completely untouched with no
  confirmation dialog at all. All prior suites re-run clean alongside —
  **519 assertions total across the whole app, zero failures** (since grown
  to 563 by the Part-D2 fixes below).

**Four more findings from Ray's Part-D2 live pass, all resolved. Two were
serious and share ONE root cause worth remembering.**

**ROOT CAUSE (Bugs A + B) — the app was READING one workbook and WRITING
another.** `ENABLE_LIVE_NAV_DATA`'s reader hardcoded
`LIVE_NAV_WORKBOOK_PATH = "CoinCollection/CoinCollection (AI).xlsx"` (real
production) on the reasoning, recorded in this file, that "a read-only GET
can't corrupt anything, so it doesn't need the `_Testing` copy convention."
That reasoning was sound **only while nothing wrote**. It stopped being true
the moment Browse Edit could write, and the two features were built in
separate rounds so nothing forced a re-check.
- **Bug A (silent wrong data on screen):** Catalog, Browse detail and Edit
  Coin all displayed/pre-filled from PRODUCTION, while the write layer's
  conflict snapshot and its actual writes went to the `_Testing` COPY. On
  AY-00008 the copy said Year=1920/Variety="Type 69" while production still
  said 1919/blank — so both screens showed 1919-S with Variety blank. Ray's
  diagnosis that a shared upstream source was at fault was exactly right;
  it just wasn't a CoinID parse (nothing anywhere derives displayed identity
  from CoinID) — it was the wrong file.
- **Bug B (real data loss):** because the form pre-filled from production
  and the save diffed against the copy, a save that only intentionally
  touched Year submitted `Variety: "Type 69" → (blank)` as a side effect.
  The identity-confirmation dialog worked perfectly — it caught and named
  the change — but it read as routine, and confirming destroyed real data.
- **Fix, two layers, both deliberate:**
  1. **One workbook for the whole app.** `LIVE_NAV_WORKBOOK_PATH` is gone,
     replaced by `liveNavWorkbookPath()` returning `writePaths().workbook`.
     **Standing rule going forward: any new read path reads
     `writePaths().workbook`. Never reintroduce a separate read target — a
     read/write split is not a safety measure here, it IS the bug.**
  2. **The form now pre-fills from the SNAPSHOT, not the in-memory record**
     (`applySnapshotToEditForm()`, called when the snapshot lands). This is
     the structural fix: the form's baseline and the diff's baseline are now
     the same object by construction, so an untouched field cannot produce a
     change even if some display source diverges again. **If a new writable
     field is added to Edit Coin, it belongs in that function too.**
     A `browseEditTouchedFields` set (one delegated listener on the edit
     view) means a late-arriving snapshot re-bases only fields the user
     hasn't typed in — their own edits are never clobbered.
- **Also fixed, same class, wider than the earlier "P" bug:**
  `setSelectValuePreservingUnknown()` injects a real `<option>` for any
  workbook value a dropdown doesn't already list, instead of silently
  leaving the select on no selection (which then reads back as "user blanked
  it"). This matters beyond `"P"` — the real MintMark column also carries
  `"P/D"` (26 rows), `"P/D/S"`, `"P/S"`, `"None/D"`, `"P/W"` and others.

**Bug C — CoinID re-linking matched against the 12-row MOCK catalog.**
`dbCoinsCandidatesFor()`/`findDbCoinsMatch()` read `FAKE_DB_COINS` directly,
so AY-00008's edited identity (1920-S 1C) was reported "no match" and had
its CoinID cleared — even though DB_Coins row 335 is exactly
`C-1920-S-1C-01`, confirmed both in the workbook and independently by
Copilot. **Fixed:** `ensureLiveNavDataFetch()` already fetched DB_Coins for
the Metal-filter join and then *discarded* it (an explicit "neither sheet
gets its own LIVE_* cache" note — now superseded); it's cached as
`LIVE_DB_COINS` with an `activeDbCoins()` accessor, and both match functions
read through it. `mapWorkbookRowToDbCoin()` maps the real, confirmed
DB_Coins headers. Two notes worth carrying:
- **DB_Coins has no `Designation` column** — live rows get `""`. The
  ambiguous-match picker still works, since it triggers on 2+ rows sharing
  the base Year+MintMark+Denom+Variety key, which real data produces on its
  own.
- **`Mintage` and `PCGS#` are only partially populated**, so the Add Coin
  match banner now omits each when absent rather than calling
  `.toLocaleString()` on null and throwing.
- **Still on the mock, deliberately out of scope:** `slotMintage()`
  (Albums — Ray's earlier explicit call that Albums isn't wired to live
  data), `validVarietiesForCurrentCoin()` and the PCGS label decoder (both
  Add Coin, whose Save is still a stub). Worth doing when Add Coin's own
  write layer lands.

**Verified headless — 50 new assertions (296 total in
`verify_browse_edit_write.js`, 148 × 2 viewports; 569 across all 10 suites,
zero failures).** The Bug B coverage is a direct reproduction of the live
scenario: a workbook row saying 1920/"Type 69" behind an in-memory record
saying 1919/blank, then typing only Year and saving — asserting the form
re-bases onto the workbook values, that NO identity dialog fires, and that
the real Variety survives. Plus: read and write paths resolve to the same
file; an unlisted `"P/D"` round-trips through a select; a user-typed field
survives a late snapshot while untouched fields still re-base; the exact
1920-S identity matches `C-1920-S-1C-01` once the live catalog is loaded
and the full re-link succeeds end-to-end without flagging research; a null
Mintage doesn't throw; and the Docket badge counts both sections, equals
every visible row, and decrements back when an item is removed.

**Bug D — was working as designed, then Ray changed the design.** The fob
had counted the "Needs your action" section only, never research — his own
earlier call. Reported as intended rather than silently "fixed"; he then
decided research items SHOULD count, since handing something to Copilot and
reconciling the result is still his action. **Now a total across both
sections** — see "Needs Attention hub" → Dashboard badge above for the full
history of this decision (it has flipped twice) and the implementation.

**Part-F live pass: an unresolvable save loop that lost typed input.** On
AY-00680-C (1945-D Mercury Dime), editing only Grade and Notes produced:
duplicate-catalog picker on every save → pick → conflict block → OK →
picker again, forever, with typed Notes eventually lost. Five distinct
causes, three of them mine from the previous rounds.
- **The duplicate is REAL, not a spurious match.** DB_Coins rows 939 and
  3742 are both 1945-D 10C Mercury Dime Business Strike, blank Variety,
  differing only in CoinID / GSID (4623 vs 4624) / PCGS# (5058 vs 5059).
  And it is not rare: on the real catalog, **577 base keys
  (Denom+Year+Mint+Variety) have 2+ rows, covering 1,629 rows — ~43% of
  DB_Coins.**
- **The picker fired on EVERY save, not just identity edits.**
  `checkDesignationReresolution()` ran unconditionally. Invisible against
  the 12-row mock; against the real catalog it means any save on any coin
  with duplicate catalog rows pops a "pick one" list for no reason. Fixed
  with `resolveDbCoinsForSave()`, which runs the resolution only when
  Year/MintMark/Denomination/Variety/**Designation** actually changed
  against the snapshot. Designation stays a trigger — that was the
  mechanism's original purpose.
- **`Finish` was missing from the candidate match.** It's real specimen
  data on BOTH sheets (`All.Finish` populated on all 542 rows), so a Proof
  and a Business Strike of the same date were being treated as one match.
  Adding it cuts ambiguity from 577 groups/1,629 rows to **227
  groups/771 rows**. **Soft, never a hard filter** — `All.Finish` carries
  values DB_Coins doesn't (`Circulated` on 139 rows, `Various` on 6), so a
  strict filter would turn a good match into zero for ~145 rows and wrongly
  clear their CoinID. An empty narrowed set falls back to the full one.
- **The picker's options were visually identical**, confirmed in practice —
  both rendered "1945-D 10C · Mercury Dime · Business Strike". Now the
  CoinID leads (it's the value the pick actually writes) with PCGS# / GSID /
  Mintage beneath, which is what makes a candidate checkable against PCGS or
  the Red Book before committing.
- **The conflict block had no exit.** The snapshot stayed at its
  pre-conflict values, so the next save re-detected the identical conflict
  forever; the only escape was backing out, which silently discarded
  everything typed. Now `resolveConflictAndRebaseline()` adopts the
  acknowledged values as the new baseline and refreshes only fields the user
  has NOT touched, so a second save compares clean and lands. The dialog
  also now names any conflicted field the user is *also* editing ("your
  value will replace it if you save again"), which is the informed-consent
  half of that.
- **Two further bugs found while reproducing it, both mine:**
  (a) `applySnapshotToEditForm()`/`showBrowseEditView()` dispatch a real
  `input` event on the cert field to refresh its link button — and the
  delegated touched-field listener could not tell that from typing, so
  **SerNo was marked user-touched the instant the form opened, never
  re-based, and a stale in-memory SerNo got written over a row whose real
  SerNo was blank.** Fixed with `withProgrammaticFormUpdate()`, which
  suppresses touch-recording during app-driven population.
  (b) `showWriteGuard()` left its buttons in the DOM with live handlers
  after the overlay hid, so a stray later click could re-run a **stale**
  acknowledgement and silently roll the snapshot backwards. Buttons are now
  torn down on close.
- **Saving during the baseline read** used to fall through to the
  session-only path and toast "updated for this session only" — during a
  live write run that reads as success while writing nothing. Now it says
  "Still loading … try Save again in a moment" and nudges a retry.
- **Backing out with unsaved edits now warns first** (Keep editing /
  Discard). This is the actual mechanism by which the live typed Notes were
  lost: the conflict dialog promises the edits are still in the form, which
  is true right up until you back out — and backing out is the natural
  thing to try when a save won't go through.
- **Browse detail no longer disagrees with Edit.** Edit re-fetches its row
  every open; Browse renders from `LIVE_COINS`, fetched once per session and
  never refreshed, so the two showed different values for the same coin.
  Rather than give Browse its own re-fetch, `applySnapshotToRecord()` feeds
  the read Edit already performs back onto the shared record, so Browse
  agrees for free.
- Verified headless (+62 assertions, 358 total in the suite): the real
  duplicate pair reproduced end-to-end, no picker on a Grade+Notes save,
  picker still fires on a Designation change, Finish narrowing including the
  `Circulated` fallback, distinguishable picker rows, the conflict loop now
  exiting on the second save with edits landed, SerNo never written from
  stale memory, the shared record refreshing, the mid-load toast, and the
  back-out warning.

**Superseded — real live-device passes against real OneDrive have since
happened; this paragraph originally described a mock-only state before any
of them.** Three live passes ran against the `_Testing` copy workbook, each
finding and fixing real bugs before the next: Parts B–F (Mint Mark/CoinID/
Notes-flash bugs), Part-D2 (the read/write-target mismatch — Bugs A/B — plus
the DB_Coins mock-catalog bug, Bug C), and a final full B–F re-run (per this
section's own earlier instruction that the read/write-target fix invalidated
prior passes) which surfaced the two-MSAL-instance sign-in failure and the
Part-F picker/conflict save loop, both fixed and re-verified live. Ray
confirmed the full checklist (B, C, D, D2, E, F) passed against `_Testing`
with no data-loss or write-safety issues remaining open, and the branch was
merged to main on that basis — see the merge-status correction at the top of
this section. `docs/BROWSE_EDIT_LIVE_RUN_CHECKLIST.md` remains the
step-by-step this was run against, for reference on how a future live pass
(e.g. once a production redirect URI exists) should be structured.
- **The write pass can only run where a local server can run.** The only
  Entra redirect URI registered for `app.html` is
  `http://localhost:8791/app.html`, so the functional verification happens
  in a desktop browser against `python3 -m http.server 8791`. A phone
  pointed at the live GitHub Pages site cannot do this pass at all. To get
  a real Samsung Internet pass on the new UI, use USB port forwarding
  (`chrome://inspect` → Port forwarding, device 8791 → localhost:8791) so
  the phone's origin is still exactly `localhost:8791` and matches the
  registered URI. Registering a production redirect URI would remove this
  constraint but would also make the live site write-capable — a separate
  decision, deliberately not taken as a side effect of this feature.
- **First Edit open in a fresh session bounces to Microsoft sign-in and
  returns to the Dashboard, not the form** (a full page load, so app state
  resets). Expected MSAL redirect behavior, same as the reference-image
  feature's own first fetch — not a bug; reopen the coin and it's silent
  from then on.

### Add Coin write layer — Phase 1 (BUILT, held on branch `claude/add-coin-write-path-fs2rf8`, NOT merged)
Add Coin's Save was the last pure placeholder in the app ("Nothing written to
OneDrive yet"), and the actual blocker on logging a new physical coin in-app.
This is **Phase 1 of a deliberately phased build** — architectural/cross-cutting,
so per the merge policy it's held pending Ray's explicit go-ahead, same standing
as Thread A and the original Docket build.

**The phasing, and why.** Scoped as three branches rather than one:
- **Phase 1 (this build)** — Staging drafts only. Reservation unified, real
  `coin.json` drafts with photos, real Staging Review, matcher integration.
  Zero new Graph primitives; everything reuses Add Set's proven draft pattern.
- **Phase 2** — the real direct-write path into `All`.
- **Phase 3** — nothing further; photo capture already lands in Phase 1.

Phase 1 first defers the one genuinely novel capability while delivering
durable value, and matches the project's own risk posture: it has written
Staging JSON safely for months and has **never created a workbook row**.

**The Phase 2 approach is decided, and it is NOT the obvious one.** The
obvious call — `POST /workbook/tables('AllCoins')/rows/add` with a values
array — is wrong here: that array must supply a value for every one of the
49 columns, **including the two live formula columns** (`Total` at U,
`SpotValue` at Z). That's the same "a rectangle write must fill every cell"
hazard `buildRowCellEdits()` exists to prevent, and this workbook has already
lost all 1,084 formula cells once. It would also mean a second write
mechanism able to address never-write columns, breaking the "an unlisted
column has no code path to a PATCH" guarantee.
- **Instead: append a BLANK row, then reuse `saveCoinRowToWorkbook()`
  unchanged.** Reading it closely, it already handles creation correctly with
  no modification — `detectRowConflicts()` opens with `if (!snapshot) return []`,
  so a `null` snapshot against a fresh blank row skips the conflict check,
  counts every populated field as changed, and stamps `Reviewed`/`LastModified`
  (both correct for an app-created row). Formula columns are untouched because
  they aren't on the allow-list. **The only genuinely new primitive Phase 2
  needs is "append a blank row and tell me its row number."**
- **Accepted tradeoff: it is not atomic.** A blank add that lands followed by
  a failed PATCH leaves an orphan row. Deliberate: an orphan row carrying a
  CollectionID and a blank `Reviewed` is visible and recoverable, whereas a
  clobbered formula is silent and catastrophic.
- **Phase 2 will also need `Finish` added to `ALL_WRITABLE_COLUMNS`** — it's
  captured now (below) but is currently read-only context
  (`ALL_CONTEXT_COLUMNS`), so a new row can't yet carry it. Deliberately NOT
  added in Phase 1, since that would make it editable in Browse Edit too — a
  scope change nobody asked for.

**Gate: `ENABLE_ADDCOIN_WRITE = false`**, its own flag for the same reason
every other one is (it writes a different thing again), folded into
`WRITE_LAYER_ENABLED`. `WRITE_TARGET` stays `"copy"`. With the flag off the
shipped build behaves **exactly** as before — asserted, not assumed: a save
makes zero Graph calls, still pushes to `FAKE_STAGING`, and both interim
notices stay hidden.

**Reservation unified — the mock authority is retired.** `readMaxReservedIdFromStaging()`
used to call `listSetDrafts()`, which drops anything without `type === "set"`.
Once Add Coin writes `coin.json` drafts, **every coin reservation would have
been invisible to it and the two features would have collided in the same
`AY-#####` namespace.** It now reads the Staging **folder names** instead:
- One authority across every draft kind — the folder name is the CollectionID
  by construction for both `setDraftFolder()` and `coinDraftFolder()`, so
  this covers set drafts, coin drafts, and any future kind with no per-kind
  maintenance.
- One Graph call instead of one per draft.
- **Fails in the safe direction**: a folder whose JSON was deleted or is
  unreadable still counts as reserved, so a part-cleaned-up folder can never
  hand its id to a different coin. Non-draft folders (`_Docket`) parse to NaN
  and are skipped.
- `getNextCollectionId()` is renamed `getNextCollectionIdInMemory()` and is
  now **the flag-off fallback only**, reached solely through
  `reserveCoinCollectionId()`. The two never run in the same session — the
  flag picks one — so there is no window in which two authorities coexist.
  This resolves the Add Set write layer's own deferred Q11 ("Add Coin
  migrates to it LATER").

**Coin drafts: `{stagingBase}/{CollectionID}/coin.json` + that coin's photos
as siblings.** Per-coin FOLDER rather than the Docket's one-document shape,
because of photos: the Docket queue is pure metadata, a coin draft carries
real image bytes, and a folder named for the CollectionID is exactly where
Add Set already puts a Set's photos. Safe alongside set drafts structurally —
each lister drops anything without its own `type` marker, so neither can ever
see the other's drafts.

**Photos are captured for real, and the temp-id problem is fixed.** Add Coin's
gallery is keyed by `ADDCOIN_GALLERY_ID` (`"__addcoin_draft__"`) because no
CollectionID exists until save, so every filename in it is built against that
temp id. `uploadCoinDraftPhotos()` re-derives each filename against the real
reserved id before uploading — the reconciliation the gallery module's own
comment always said a real write layer would need. Uploads the cropped image
plus, for flip sources, the untouched `_original` (per the crop-commit
convention); raw bytes come back via `fetch(rawUrl)`, the same trick the
Adjust button uses. Receipts upload as `{CollectionID}_receipt.pdf` from the
existing `receiptFiles` registry — the "ready-but-unconsumed" registry finally
has a consumer. **A single file failing never loses the capture**: each upload
is caught individually, the draft still lands, and its research note says what
didn't upload. The in-progress gallery is cleared after a real save, or the
next coin would re-upload the previous coin's photos under its own id.

**The silent first-candidate bug — the most important fix here.**
`findDbCoinsMatch()` returns `dbCoinsCandidatesFor(record)[0]`, and Add Coin's
banner and save both ran off it. On the real ~3,753-row catalog a base key
routinely has several rows (227 ambiguous groups even after the Finish tier),
so this silently picked one. Harmless while the save was a mockup that wrote
no CoinID anywhere; **the moment a save records a CoinID it becomes a silent
wrong-link — exactly the failure behind this project's two historical mislink
incidents.**
- `findDbCoinsMatch()` is now documented as answering "is there a match at
  all", never "which row is it", and is left returning `[0]` for that
  boolean-ish use.
- New `resolveAddCoinCatalogMatch()` resolves at save time: 0 → CoinID pending
  + Docket entry; 1 → linked; **2+ → the shared ambiguous picker, always, per
  the firm rule.** Nothing is reserved or written until the user picks;
  cancelling writes nothing and keeps everything typed.
- New `addCoinIdentityShape()` is the Add Coin counterpart of Browse Edit's
  `identityShape`, so the live banner and the save-time resolution can never
  match on different keys. It carries `gradeSource`, which **engages Thread
  A's cert-protection guard on Add Coin too**.
- The banner is now honest about multiplicity ("2 catalog entries match this
  coin — you'll be asked to pick when you save") instead of claiming a match.
- `matchedHow` (`single`/`picked`/`none`) is recorded on the draft, because
  reconciliation needs to know whether a link was a human judgement or an
  unambiguous catalog hit.

**Finish input added to Add Coin** (Business Strike / Proof / Reverse Proof /
SMS / Specimen / Circulated). Add Coin had none, so `shape.finish` was always
blank and **the Finish tier never ran at all** — new entries resolved on a
strictly weaker key than edited ones, and a Proof vs. a Business Strike of the
same date were indistinguishable. Verified: the pair goes 2 candidates → 1
with Finish set, and an All-only value (`Circulated`, absent from DB_Coins)
still falls back softly rather than to zero. A matched catalog row also
carries its Finish onto the form. Optional — blank never blocks a save.

**Staging Review is real, and labelled as interim.** Reads durable drafts when
the flag is on; the action is labelled **"Mark ready"**, not "Promote", and an
interim banner states plainly that the app does not write the workbook yet and
Copilot moves the row across. Reject deletes the whole draft folder (JSON +
photos). The monotonic max+1 gap rule needs no separate bookkeeping on the real
path: the reservation scan reads folder names, so a deleted folder simply stops
being counted and a mid-sequence rejection leaves the max untouched. **Add
Coin carries the same interim notice**, because in Phase 1 "Save to Database"
writes a draft like the other option — `savedVia` records which was chosen.
- **`#stagingBadge` no longer exists** (retired when the Needs Attention hub
  absorbed Staging Review's dashboard tile); `updateStagingBadge()` is
  vestigial but harmless and was left wired.

**Two real integration gaps found while testing, both fixed:**
- **The Docket couldn't see real drafts.** `renderNeedsAttentionHub()` read
  only `FAKE_STAGING`, so once staged coins became durable drafts every one of
  them would have been **invisible in the Docket** — the same class of gap as
  the reservation one. It now reads coin drafts when the flag is on; a draft's
  own field names are already the shape `findDbCoinsMatch()` wants. A draft
  marked ready is no longer Ray's to decide on, so it renders in the research
  section as "waiting on the All-sheet row". A second bug fell out of this: the
  research-row label read `c.name`, which exists on a `FAKE_STAGING` row but
  **not** on a draft (it has `description`) — so real drafts rendered with no
  name at all.
- **The mock Graph client's `deleteItem()` wasn't faithful.** It deleted only
  the exact key, while Graph's DELETE on a folder is recursive — so a test
  could not see that rejecting a draft also removes its photos. Fixed to sweep
  descendants; a file path has none, so it's a no-op there.

**Commemorative / `Description` blind spot — assessed, and deliberately NOT
folded into the matcher.** Four owned coins are mis-linked because their
correct and incorrect candidate rows differ only in `Description`. The
recommendation went the opposite way from where it started, on evidence:
- **The picker already renders `row.description`**, so those candidates are
  already distinguishable to a human. The commemorative exposure was never
  that the matcher can't narrow — it was that `findDbCoinsMatch()` never
  reached the picker. **Fixing that (above) closes the hole for new coins**;
  a Description tier would only *suppress* the prompt.
- Suppressing it would contradict the project's own firm rule ("2+ always
  reach a human"), whose sole exception (the Designation tier) had a crisp
  verified semantic and *still* needed the cert-protection guard bolted on
  after live testing. `Description` has no such semantic: free text,
  user-editable on the `All` side, auto-filled from Ref_Denominations — a
  *different source* than `DB_Coins.Description`.
- The four existing mis-links are themselves evidence that Description-based
  identity for commemoratives is fragile.
- Cost of not narrowing: one picker prompt on a rare event (~22 individual
  commemorative rows of 542).
- Benefit: **zero change to `dbCoinsCandidatesFor()`'s tier logic**, so Thread
  A's live-tested behaviour for Browse Edit and Docket isn't re-opened.
- Browse Edit was already safe here — its `checkDesignationReresolution()`
  path already sends 2+ to the picker.
- **If picker frequency ever becomes annoying, the follow-on is to surface
  Description more prominently, not to auto-resolve on it.**

**A real defect in that reasoning, caught by screenshot and fixed.** The
premise above only holds if the Description is actually *readable*, and
`.form-row .fr-summary` carried `white-space: nowrap` + `text-overflow:
ellipsis` — so a differentiator late in the string would be truncated away,
recreating the Part-F "both options look identical" bug by another route.
`renderAmbiguousMatchList()` now tags its rows `.ambiguous-match`, which opts
them out of the one-line ellipsis. Fixed at the shared renderer, so Browse
Edit and the Docket get it too. Presentation only — no matching logic changed.

**Verified headless — 69 assertions (`tests/verify_addcoin_phase1.js`), all
passing, zero page errors**, driven by the mock Graph client. **Correction to
an earlier version of this line:** it claimed the whole suite ran at both
412x915 and 1024x768; it did not — the assertions ran at 412x915 only, and
only the screenshots covered both. That is now true rather than aspirational:
the logic assertions (Graph writes, draft shape, matcher resolution) are
viewport-independent and run once at 412x915, and the three genuinely
layout-sensitive checks — picker candidate count, picker truncation, and
horizontal overflow — are additionally re-run at 1024x768. Coverage:
flag-off inertness (no Graph call, in-memory path intact, nothing written);
the reservation seeing a coin draft that `listSetDrafts()` cannot, `_Docket`
never counting, and each lister ignoring the other's drafts; a full real save
writing `coin.json` at the reserved id with photos uploaded **under the real
CollectionID** and no `__addcoin_draft__` filename leaking; ambiguity opening
the picker with **nothing written before the pick**, the **second** candidate
(not the first) being what gets recorded, cancel writing nothing while keeping
the typed entry; Finish narrowing including the soft All-only fallback;
promote marking ready **without** creating an All row, and reject removing the
draft and its photos; the Docket showing both an unmatched draft and a
handed-off one; the picker not truncating a late differentiator; "Save to
Database" writing a draft in Phase 1 with `savedVia: "direct"`; and a 12-route
nav smoke with no horizontal overflow.
- **Prior committed regression suites could not be re-run** — under the
  convention in force at the time, the `verify_*.js` scripts lived in
  per-session scratchpads and none survived into this session. The nav smoke
  check is a substitute, not an equivalent (same caveat the
  photo-gallery-crop branch carried). **This is what prompted the convention
  change below**, so it should be the last time this caveat is needed.
- **Not verified: any real device, and any real OneDrive session.** This is a
  new write path and needs a live run against `_Testing` before it's trusted —
  see `docs/ADD_COIN_LIVE_RUN_CHECKLIST.md`.

**Four review decisions confirmed by Ray (2026-08-23), recorded so a future
session doesn't reopen them:**
- **"Save to Database" keeps its wording in Phase 1.** The interim banner
  already states that both options write a Staging draft; relabelling the
  button now would only mean relabelling it again at Phase 2 for no real
  benefit.
- **A draft marked ready STAYS VISIBLE in the Docket's research section**
  while it waits on the real `All` row. The Docket's job is "what still needs
  attention," and hiding a genuinely-pending draft would create a silent gap.
  (This had been flagged as my own call rather than a specified behaviour —
  it is now confirmed as intended.)
- **`Finish` stays out of `ALL_WRITABLE_COLUMNS` until Phase 2** — correct not
  to widen Browse Edit's editable scope as a side effect of an Add Coin build.
- **Album assignment / post-save slot-fill is a backlog item, not a phase.**
  UX polish on a working save, no urgency — logged as ParkingLot Row 3 in the
  session log below.

### Add Coin Phase 1: live-run bug-fix pass (BUILT, same branch, still held)
Ray's own full manual live run against `_Testing` (Parts A–H) found the write
path itself — reservation, the ambiguous-picker data integrity, photo/receipt
handling, network-failure honesty — clean. Everything below is real bugs and
UX findings from that same run, all fixed on this branch, still held for the
same explicit-go-ahead reason as the rest of Phase 1.

**Q3 — real `Ref_Denominations` data loaded, replacing the ~28-row hand-picked
stand-in.** 85 rows, pulled straight from the live workbook and loaded
verbatim (Ray's call), filtered to only the six denom codes Add Coin's own
dropdown supports (a literal filter on the sheet's real `Denomination` column,
not a numismatic judgment call — Silver/Gold/Platinum/Palladium Eagles, Half
Cents, Commemoratives, etc. get no autofill, same as they already didn't).
This is what actually root-caused bug #3 below — the OLD mock's single `$1`
row spanned 1979–2026 as one entry (`"Anthony / Sacagawea / Presidential"`),
so any year in that span resolved to all three names joined together. The
real sheet has each series as its own row with its own real range; 1982 now
resolves to Susan B. Anthony alone (confirmed against this exact data by Ray
before it was loaded). **Real data legitimately has 2+ rows matching the same
denom+year** in two different ways — a genuine transition year (Barber/Mercury
both cover 1916) and the modern era's concurrent dollar-coin proliferation
(Presidential/Native American/American Innovation all ran 2018–2020) — both
handled the same way as the DB_Coins matcher's own firm rule: never guess,
always ask.

**#2/#3 — Description auto-fill: clears on no match, offers a picklist on
2+.** `maybeAutoFillDescription()` used to no-op on zero candidates, leaving
whatever series name was already on screen — a stale answer that reads as
current. Now: 0 candidates clears the field; 1 autofills as before; 2+ leaves
it blank and shows a small inline picker (`#descriptionAmbiguousPanel`) rather
than silently taking the first match — the same failure class the
concatenation bug was, just moved from string-joining to first-of-N. Nothing
is written to Description until the user picks or types their own value.

**#4 — PCGS label decode was hardcoded to the 12-row mock, ignoring
`ENABLE_LIVE_NAV_DATA` entirely.** `handlePcgsLabelApply()` filtered
`FAKE_DB_COINS` directly; reproduced live with a real PCGS# (4908, a real
1916-S Mercury dime) reporting "not found." Now reads `activeDbCoins()`, the
same source every other matcher in the file already uses. **Found and fixed
the same gap in `validVarietiesForCurrentCoin()` alongside it** — CLAUDE.md
had already flagged this one as "worth doing when Add Coin's own write layer
lands" (it drives `isVarietyRecognized()`, which decides the direct-write-vs-
Staging routing — a real coin's variety was being judged against the mock).
`slotMintage()` (Albums) stays on the mock — separate, deliberate, unrelated
call from Ray.

**#7 — investigated in depth; not what it looked like, and not what Ray's own
correction guessed either.** Ray's follow-up note walked the finding back to
"probably the DB_Coins-once-per-load caching behaviour, drop it unless
cleanly reproduced." A clean, deterministic repro was already in hand
(save → Mark ready → open Docket) and it does NOT reproduce a missing entry —
but it surfaced a real, different bug: **the same coin rendered as two
independent, disagreeing records** — once via the draft's own live status
(`stagedHandedOff`, "ready for reconciliation") and once via a separate,
static Docket entry (`appendDocketEntry`'s pre-existing "no-db-coins-match"
push, which fired unconditionally on every save regardless of destination).
Root cause: Phase 1 made BOTH "Save to Database" and "Save to Staging" write
the same kind of coin.json draft, and the draft's own presence in the hub
already represents "needs a catalog entry" — so the old separate push became
pure duplication the moment that happened, and the two records could disagree
once the draft's own status moved on (Draft → Ready) with no way to update or
retract the earlier static entry. **Fixed by removing the redundant push
entirely on the real path** — the draft is the single source of truth there;
the flag-off mock path is unchanged, since a `FAKE_COINS`-destined mock save
has no draft-based representation to duplicate.

**#8 — Docket research rows never showed CollectionID for a staged coin with
no match**, unlike `docketEntryLabel()` (used a few lines below in the same
render for real Docket entries), which already did. Different label-building
code path, same missing field — now shown consistently.

**#9 — Reject was the only way back from "Marked ready," and Reject is
permanent (deletes the draft + photos).** Marking ready a beat too early is
an easy, ungated mistake in Phase 1 (there's no reconciliation check to catch
it). New `revertCoinDraftToDraft()`/`revertStagedCoinToDraft()` — Staging
Review now shows **"Revert to Draft"** in place of the old disabled "Ready"
button, touching only `status`; the CollectionID, photos, and every captured
field are untouched, so a revert is exactly as safe as the mark-ready it
undoes.

**#1 — Add Coin didn't reset between visits.** Reopening it via plain nav
(not a save, not an album/wishlist deep-link) showed whatever was left from a
prior unsaved session — every field, the photo thumbnails, all of it. New
`resetAddCoinForm()`, called unconditionally at the top of `navigate()`'s
`"addcoin"` branch, resets every field, photo slot, gallery entry, and match/
picker state. **The one real subtlety**: an album/wishlist deep-link sets its
context variable and calls `navigate("addcoin")`, then calls
`applyAlbumContext()`/`applyWishlistContext()` **right after** `navigate()`
returns — so the reset had to clear the two banners' visibility without
nulling the `albumContext`/`wishlistContext` variables themselves, or it would
null out a deep-link's own pending context from under it. Verified directly:
a plain re-entry starts fully blank, and a deep-link straight after still
prefills correctly. `resetAddCoinAfterSave()` now calls this same function
instead of its own narrower clear, so a second coin entered in the same
session also starts clean — a second, smaller fix in its own right.

**#12/#14/Q4 — picking an ambiguous-match candidate used to save immediately,
with no way to reconsider, and the live banner could disagree with the
picker.** Both are really one root cause: the banner and the save-time
resolution were two independently-updated pieces of state that could drift.
Fixed with one consolidated source of truth, `currentAddCoinMatchState()`:
- Picking a candidate now **resolves and stops** — it updates
  `addCoinResolvedPick` (the pick plus a snapshot of the exact identity it
  was picked for), refreshes the live banner to show it immediately (closing
  the #14 desync), toasts "press Save again to continue," and returns. **It
  does not save.**
- The **next** Save click re-derives match state, finds the still-valid
  resolved pick (identity unchanged), and proceeds straight to save with no
  picker shown a second time.
- **Any relevant field changing invalidates the pick** — the snapshot no
  longer matches, so a fresh identity re-derives candidates normally rather
  than silently reusing a stale choice.
- Verified end-to-end: nothing written between the pick and the second Save
  click; the banner shows the CHOSEN candidate (picked the second option
  deliberately, so "still shows the first" couldn't pass by accident); the
  second Save click writes the remembered pick without re-opening the picker.

**#11 — the picker's "Cancel — don't save yet" had no visual weight**
(`background:none; border:none`, blending into the page). Given a real
bordered/background button matching the candidate cards it sits beside.

**#13 — the DB_Coins match banners sat ABOVE Finish**, even though Finish is
one of the fields the match is actually computed from — recording it, then
watching the banner react, is the order that makes sense. Finish moved above
the banners.

**#15 — `Circulated` was selectable as an Add Coin Finish option**,
contradicting the Aug 17 session's established rule that Circulated is a
wear-state/condition, not a strike method (tolerated only in 139 legacy `All`
rows, never generated going forward). Removed from the dropdown; the
matcher's own soft-fallback tolerance for an All-only Finish value is
unchanged — a legacy `Circulated` row still matches correctly, it just can't
be newly created from this form.

**#6/Q2 — GradeSource baked into the coin's own flip-card label, even for a
non-certified estimate** (e.g. "VF-30 Seller"). Ray's resolution: keep it on
the graphic **only when it's a real third-party grading service** (PCGS/NGC/
ICG/etc., via the existing `isServiceGradeSource()`) — a raw/Seller/Owner/
AI-est-sourced grade shows Grade alone. **Scoped correctly after checking
both render paths**: this only ever applied to Add Coin's own live-entry
corner (`updateFlipLabels()`) — the SAVED-coin flip corner
(`applyFlipCorners()`, Spotlight/Browse detail) was already Grade+Designation
only and has never put GradeSource on the graphic at all; `gradeWithSourceText()`
(Overview/detail text, "MS-64 (PCGS)") is the separate display that already
shows GradeSource unconditionally, exactly as Q2 asked it to keep doing. One
edit, correctly scoped — not the two-surface change originally assumed before
checking the code.

**#5 — couldn't drag-reposition inside the circular crop guide.** Root-caused,
not guess-patched: for a perfectly SQUARE source (exactly what Stage 1's
background crop hands the adjuster for a flip source), `recomputePhotoAdjustBaseScale()`'s
"cover" fit gives **zero pixels of overscan at exactly 100% zoom** — there is
nothing to drag into, by the math; the clamp itself (`clampPhotoAdjustOffsets()`,
"can't pan past its own edges") is correct and untouched. Fixed by defaulting
the adjuster to a small above-100% starting zoom (110%) so a real ~12px of pan
headroom always exists without forcing a zoom action first; the slider's own
100–300% range and every other control are unchanged.

**#16 — Staging Review flattened "needs a decision" and "already handled"
into one list**, with a Draft row (needs Mark ready/Reject) visually
identical to a Ready row (nothing left to decide). Split into two labeled
sections, same section-label convention used elsewhere in this app — "Needs
a decision" first, "Marked ready — waiting on reconciliation" second, newest
first within each. The mock build never shows the second section (a
`FAKE_STAGING` row has no Ready status to begin with).

**#17 — Docket labels read "Description · Year-Mint," backwards from how a
coin is normally referenced** ("1916-D Mercury Dime," not "Mercury Dime
1916-D"). Year-Mint now leads in all three label-building sites
(`docketEntryLabel()`, the staged-no-match row, the handed-off-draft row) —
kept consistent across all of them, not just the one Ray happened to see.

**#10/#18 — toasts disappeared before they could reliably be read**, and
identity fields (Year especially) showed the browser's own autocomplete
suggestions. Toast duration now scales with message length (`1800 + 40ms/char`,
clamped 2600–7000ms) instead of one fixed 2600ms for every toast — a short
toast stays snappy, a real save confirmation or error message gets the time
it needs. `autocomplete="off"` added to Year, Description, Vendor, Storage
Location, Container, Cert/Type Number, and the PCGS Label field.

**A real bug in the fix itself, caught by screenshot, not by the test
suite.** The new `#descriptionAmbiguousPanel` and `#addCoinMatchAmbiguousPanel`
were built with `class="case hidden"`, copying two PRE-EXISTING elements'
visual look — but **this file has no generic `.hidden` rule**; every
`.hidden` is scoped to its own component (documented in CLAUDE.md already,
after being hit before). The two elements this was copied from
(`#pcgsLabelAmbiguousPanel`, `#designationAmbiguousPanel`) have their own
ID-scoped `.hidden` rules; the two new ones didn't, so `classList.contains("hidden")`
read `true` while the panel stayed fully visible and laid out on the page —
visible in a screenshot, invisible to `classList`-only assertions. **This
exposed a real gap in the committed suite itself**: every assertion checking
these panels checked `classList` state, never actual rendered visibility,
which is exactly what let this slip through 133 passing assertions. Fixed
both: added the two missing scoped rules, and added a dedicated
`getComputedStyle().display` check (confirmed to actually fail without the
CSS fix, not just pass trivially) so this class of bug can't hide behind a
green suite again.

**19 — logged, not built.** Cert/serial duplicate-check suggestion recorded
as ParkingLot Row 4 in the session log below — idea only, no design work.

**Verified headless — 137 assertions across two suites (`addcoin-phase1`:
73, `addcoin-bugfixes`: 64), all passing, zero page errors**, at 412×915 with
the three genuinely layout-sensitive checks re-run at 1024×768. Every fix
above has its own committed assertion(s); the visibility-gap fix additionally
includes a negative-control check (confirmed to fail with the bug
reintroduced). Screenshots reviewed at both viewports for the ambiguous
picker (open and post-pick states) and Staging Review's two-section split —
no horizontal overflow either width.

**Not verified: any real device, any real OneDrive session against these
specific fixes.** `docs/ADD_COIN_LIVE_RUN_CHECKLIST.md` covers the original
Phase 1 build; a second pass against these fixes specifically hasn't run yet.

### Add Coin Phase 1: second live-run retest pass (BUILT, same branch, still held)
Ray retested the first bug-fix pass live against `_Testing` and confirmed
most of it working; this round covers the new findings from that retest.
Six items fixed; one (#2) investigated and confirmed working-as-designed
rather than changed; the structural Docket/Staging-Review IA redesign Ray
flagged as a separate idea is deliberately **not** part of this round — it
stays its own future Opus-tier proposal, held for explicit go-ahead, per
Ray's own framing when he sent this retest.

- **#1 — PCGS label decode is now authoritative, not just a starting
  point.** A decoded label already identifies exactly one DB_Coins row via
  its own SPEC/PCGS# lookup — stronger evidence than the general denom+
  year+mint+variety+finish+designation matcher, which can still legitimately
  see 2+ candidates for that same identity on real data (real base-key
  duplicates are common — see the Part-F live-pass note above, ~43% of
  DB_Coins). Before this fix, decoding a label filled the form correctly but
  Save still re-derived candidates from scratch and could pop the ambiguous
  picker for a coin that had just been unambiguously decoded.
  `resolvePcgsLabelMatch()` now sets `addCoinResolvedPick` (the same
  "remembered pick" mechanism a manual picker choice already uses, Q4) the
  moment it resolves, so Save takes the already-resolved shortcut with no
  picker shown. Still invalidated by any later identity-field edit, exactly
  like a manual pick.
- **#2 — Finish's soft fallback is deliberate, hardened behavior, not a
  bug.** Ray's report described Finish "not narrowing" the match in some
  case. Read the matcher directly rather than changing it: `dbCoinsCandidatesFor()`'s
  Finish tier is a SOFT narrow — if the recorded Finish matches zero
  candidates (e.g. an All-only value like `Circulated` that DB_Coins simply
  doesn't carry), it falls back to the FULL candidate set rather than to
  zero. This is exactly the Part-F live-pass fix from the Browse Edit write
  layer (documented above): a strict filter would turn a good match into a
  false miss and wrongly clear/deny a CoinID link for real rows. Making
  Finish narrow strictly would reintroduce that exact regression. No code
  change here — flagging it as intentional so a future session doesn't
  "fix" it back into the bug it was built to avoid.
- **#4 — the ambiguous picker now offers "None of these — save as
  unmatched."** Previously the 2+ picker forced a choice among the listed
  candidates with no way to say none of them are actually right — a real
  gap when the catalog rows shown are all wrong for a genuinely new
  variety. Clicking it resolves exactly like a real 0-candidate miss:
  CoinID left pending, routed to Docket research, same as any other
  unmatched save. Sits alongside the existing Cancel button; both are torn
  down/reset the same way (`addCoinMatchNoneHandler`, same discipline
  `addCoinMatchCancelHandler` already uses).
- **#5 — the series (Description) ambiguous picker is now persistent/
  reconsiderable, not one-shot.** It used to hide itself the instant a
  series was picked — reconsidering meant re-touching Year/Denom to
  re-trigger the whole lookup from scratch. It now stays open as long as
  the same genuine multi-series ambiguity exists, so changing your mind is
  just picking a different option from the same dropdown. It still closes
  the normal way once the ambiguity itself resolves (0/1 candidates on a
  later Year/Denom change) or the user types directly into Description (a
  real manual override).
- **#6 — the Dashboard's "N coins awaiting your decision" tile undercounted
  relative to what Staging Review's own "Needs a decision" section actually
  shows.** Root cause: the tile counted only Draft-status coins WITH a
  DB_Coins match (`stagingActionable`), while Staging Review's own
  Draft-vs-Ready split (added in the prior round) shows every Draft-status
  coin under "Needs a decision" regardless of match — a real status-alone
  signal is what actually gates that screen (Mark ready/Reject apply either
  way), same as `draftSets`' own count above has no confidence axis at all.
  Fixed by counting all Draft-status coins for the real-draft path
  (`addCoinWriteEnabled()`), matching Staging Review exactly. **An unmatched
  Draft coin now counts in this aggregate tile AND still gets its own
  individual "Staged, no DB_Coins match" research row** (unchanged,
  `stagingResearch` — bug #8's territory from the first retest round) —
  deliberately NOT collapsed into one or the other, since "needs a
  decision" and "no catalog entry yet" are two independently-true facts
  about the same coin, not two sources disagreeing about its status the way
  the original #7 bug was. The match-based split is kept as-is for the
  flag-off mock path (`FAKE_STAGING` predates Phase 1's real drafts and has
  no Ready status of its own) — this only changes real-draft behavior.
- **#7 (this round) — helper-text spacing overlapped the field above it.**
  Five `.placeholder-note` elements (the PCGS-grader note, the manual
  Cert/Type Number note, and the notes under Variety, Finish, and Error)
  carried an inline `margin:-8px 0 16px;` override — a negative top margin
  large enough to overlap the `<select>`/`<input>` directly above, which
  itself has no bottom margin of its own. Changed to `margin:4px 0 16px;`
  (a small positive gap) on all five; verified via screenshot at both
  viewports that the note text now sits clear of the field's own border.
- **#9 — Reject had no confirmation, despite being permanent on the real
  path.** Reject deletes a draft's entire Staging folder — JSON and every
  captured photo/receipt — with no undo, unlike the Revert-to-Draft escape
  hatch the prior round added for an over-eager "Mark ready." `rejectStagedCoin()`
  now opens the shared `showWriteGuard()` dialog first (same shell Browse
  Edit's own guard dialogs use), naming what's actually at stake; the real
  deletion moved to a new `performRejectStagedCoin()`, called only from the
  dialog's Reject button. The flag-off mock path gets the same confirmation
  shell with mockup-appropriate wording (nothing is actually written either
  way, so the message says so).
- **#11 — fast/repeated tapping on action buttons could visibly
  text-select their own label.** Added `user-select: none` to `.save-btn`
  and `.staging-btn` (Save/Mark ready/Reject/the picker's Cancel/None) —
  chrome, not editable content, so nothing about text inputs, textareas, or
  Notes/Description fields was touched. Deliberately NOT applied to the
  ambiguous-picker candidate cards themselves (`.ambiguous-match`) — their
  text (CoinID/PCGS#/Mintage) is exactly what Ray might want to select and
  copy to cross-check against PCGS/the Red Book before picking.
- **Flagged for Ray's decision, not built this round** (real tension with
  established rules, per this project's "investigate, don't guess" standing
  instruction):
  - **#3 (series-picker narrowing DB_Coins candidates)** — would mean
    letting `Description`/series-name text narrow a DB_Coins match, which
    runs directly against the Add Coin Phase 1 "commemorative/Description
    blind spot" assessment above (deliberately NOT folded into
    `dbCoinsCandidatesFor()`, since `All.Description` and
    `DB_Coins.Description` are different sources with no guaranteed
    correspondence, and the project's own firm rule is "2+ always reaches a
    human"). Needs Ray's explicit call before any code changes here.
  - **#8 (denomination dropdown breadth)** — CLAUDE.md already carries a
    standing deferral for exactly this class of gap ("half dimes/three-cent
    pieces will need their own Denomination code... deal with it when the
    first one is catalogued" — see "Browse filters" above); widening Add
    Coin's dropdown is a scope decision for Ray, not an assumed default.
  - **#12–#16 (open design questions from the retest)** — discussion only,
    no code without further direction, consistent with every other
    "needs Ray's explicit decision" item in this file.
  - The structural **Docket/Staging-Review IA redesign** Ray separately
    proposed is explicitly out of scope for this round, per his own
    framing — stays a distinct, larger, Opus-tier effort held for go-ahead.
- **Verified headless — 9 new assertions added to `verify_addcoin_bugfixes.js`**
  (R1/R4/R6/R9), all passing, alongside every prior assertion from both
  committed Add Coin suites re-run clean (148 total across the two suites,
  zero failures) — R1 covers the PCGS-decode-authoritative fix directly
  against a synthetic real base-key duplicate; R4 covers the "None of
  these" button existing, the panel genuinely visible before it's clicked,
  and its resolution matching a real 0-match outcome; R6 covers the
  Dashboard tile counting both a matched and an unmatched Draft coin while
  the unmatched one still separately appears in research; R9 covers the
  full reject-confirmation round trip (dialog shown, nothing deleted on
  open, Cancel leaves the draft untouched, confirming actually deletes it).
  Three existing assertions (3.5, VIS.4 in `addcoin-bugfixes`) were updated
  to assert the panel STAYS open after a pick, following the #5 design
  change rather than weakening the suite; two direct-logic tests (21.2 in
  `addcoin-bugfixes`, F6 in `addcoin-phase1`) were updated to call the new
  `performRejectStagedCoin()` directly, since they test the reservation/
  deletion logic itself rather than the new confirmation dialog. Screenshots
  reviewed at both viewports for the description picker's new spacing, the
  ambiguous picker's new "None of these" button, and the reject
  confirmation dialog — no horizontal overflow at either width.
- **Not verified: any real device, any real OneDrive session against these
  specific fixes** — same standing caveat as the first bug-fix round.

### Add Coin Phase 1: batch 3 (BUILT, same branch, still held)
Six items built, one flagged as a real conflict with existing documented
research rather than guessed at. Same posture as every prior round: the
structural Docket/Staging-Review IA redesign stays untouched, separate,
Opus-tier, held for its own go-ahead.

- **#2 — Finish tier now distinguishes "this value isn't a real DB_Coins
  category" from "this value is real, it just genuinely has zero matches
  for this coin."** The prior soft-fallback rule (never narrow to zero on a
  Finish mismatch) was built to protect All-only wear-state values like
  `Circulated`/`Various`, which DB_Coins never carries at all — narrowing
  strictly there would falsely miss real rows. But it was also silently
  swallowing the OPPOSITE case: a real DB_Coins Finish category (e.g.
  `Proof`) that simply has no row for this exact date, which the Finish
  field's own tooltip already promised would narrow the match. New
  `knownDbCoinsFinishValues()` (memoized against the active catalog array's
  identity, so it's not recomputed on every keystroke) answers "does
  DB_Coins use this Finish value ANYWHERE in the catalog." The tier now: a
  Finish match among candidates narrows normally (unchanged); a Finish with
  zero matches among candidates but a KNOWN DB_Coins category narrows to
  zero (new — a real signal); a Finish that's not a DB_Coins category at
  all keeps the original soft fallback to the full set (unchanged,
  Circulated/Various still protected). Tooltip updated to say so
  explicitly. Since every option in Add Coin's own Finish dropdown
  (Business Strike/Proof/Reverse Proof/SMS/Specimen) is itself a real
  DB_Coins category, this makes the field behave exactly as its tooltip
  always claimed for anything enterable there — the old silent-fallback
  behavior only really mattered for Browse Edit's All-only legacy values,
  which are unaffected.
- **#3 — the series (Description) picker now narrows DB_Coins candidates,
  scoped narrowly to stay consistent with the standing rule it's an
  exception to.** The project's firm rule (see "Commemorative / Description
  blind spot" above) is that free-typed `All.Description` must never narrow
  the matcher, since it and `DB_Coins.Description` are different sources
  with no guaranteed correspondence. Ray's framing for this item is real
  and different: the SERIES PICKER's own value is a controlled, enumerated
  selection (one of Ref_Denominations' own candidates for the exact
  Year+Denomination on the form), not free text — so the concern the
  standing rule guards against doesn't apply to it specifically.
  `addCoinIdentityShape()` now checks whether the current Description value
  is EXACTLY one of `lookupDescriptionCandidates(denom, year)`'s own series
  names before passing it through as `shape.description`; a manually-typed
  override that doesn't match any real candidate is left blank in the
  shape, same as before. `dbCoinsCandidatesFor()` gained a new soft tier
  reading `shape.description` — **only Add Coin ever populates this field**;
  Browse Edit and the Docket build their own identity shapes without it, so
  they are completely unaffected (verified directly: `dbCoinsCandidatesFor()`
  with no `description` key at all is a true no-op for this tier). Still
  soft — a real spelling/formatting mismatch between Ref_Denominations and
  DB_Coins' own Description text (a known, documented risk) falls back to
  the full candidate set rather than a false miss.
- **#8 — Denomination dropdown now derives from Ref_Denominations instead
  of a separately hand-maintained list.** Root cause of the gap: the Phase
  1 Q3 load had filtered Ref_Denominations DOWN to only the six codes the
  dropdown already had, backwards from what should drive what. Fixed
  properly: **all 187 rows** are now evaluated, mapped through a new
  `DENOM_NAME_TO_CODE` table, with `FAKE_DENOMINATIONS` now holding 130 of
  them (the rest are a real, flagged scope boundary — see below). Five
  denom codes that never existed before are now real, working values
  throughout the app — `0.5C` (Half Cent), `2C` (Two Cent), `3C` (Three
  Cent), `20C` (Twenty Cent), `H5C` (Half Dime, deliberately not reusing
  `5C` — already flagged in this file as a needed-eventually decision under
  "Browse filters") — plus `Medal` picked up as a low-risk side effect
  (it's a real Ref_Denominations row and was already a real Denomination
  value elsewhere in the app; Add Coin's own dropdown had simply never
  offered it). New `DENOM_CODE_INFO` (label + order) and
  `populateAddCoinDenominationDropdown()` GENERATE the `<select>`'s options
  at init from whatever codes are actually present in `FAKE_DENOMINATIONS`
  — the HTML now holds only the blank option, so the dropdown and the
  reference data can never silently drift apart again the way the original
  six-code hardcoded list did. `DENOM_SCALE` (disc sizing — all five new
  codes floor to 0.70, the same legibility floor Dime already uses, since
  all five real diameters compute below it), `STATS_DENOM_ORDER`, and
  `DENOM_LABELS` were extended to match, so Stats & Value and the Rolls
  sort behave correctly the moment a coin of one of these denominations
  exists (none do yet in the demo data).
  - **A "Commemorative X"/"Error X" row in the source sheet is NOT a new
    denomination** — it's really an ordinary Dollar/Half Dollar/Quarter/
    Cent/Nickel row describing a commemorative or error variety, so it's
    folded onto that denomination's own existing code rather than invented
    as something new. This keeps the app's Denomination vocabulary exactly
    what the naming-conventions section already documents it as — a short,
    controlled set of codes — rather than letting a reference sheet's own
    descriptive bucketing leak into it.
  - **Superseded by "Add Coin Phase 1: gold/bullion denomination codes"
    below** — Ray resolved the code scheme; this whole bullet is history.
  - Deliberately still excluded, flagged rather than guessed at: the
    gold/bullion tier (Half Eagle, Quarter Eagle, Eagle, Double Eagle,
    Three Dollar, Gold Dollar, Gold Buffalo, Commemorative Gold,
    Commemorative $5 Gold, First Spouse $10, American Gold/Silver/
    Platinum/Palladium Eagle bullion, and "Special" — 57 rows). Ray's own
    ask named "the gold/bullion denominations" as a group; a face-value-
    based code scheme genuinely doesn't work cleanly here — a classic Half
    Eagle and a modern bullion coin can share a face value with nothing
    else in common, and a bullion Silver/Gold Eagle's legal-tender face
    value has no relationship to how it's actually tracked or valued (same
    reasoning this file already recorded for why Silver Eagles were kept
    out of the Dollar code, back when Ref_Denominations was first loaded).
    Assigning real codes here is Ray's numismatic judgment call, not a
    mechanical column-to-dropdown mapping — flagged in chat rather than
    guessed. Once he picks a scheme, it's a `DENOM_NAME_TO_CODE` addition
    and the array grows to the full 187 rows; no other code changes needed.
  - **Edit Coin's own Denomination dropdown is unchanged** — still its
    original small static list (the six original codes + Medal, minus
    Multiple), scoped to editing an already-owned coin, where a
    newly-addable reference denomination isn't relevant until a coin of
    that type is actually saved.
- **#10 — a shared, reusable loading indicator for slower async section
  transitions**, visually matching the splash screen's own language (same
  `@keyframes splashSpin` coin-flip spin, at section scale instead of
  full-screen). New `showSectionLoading(containerId, text)` /
  `hideSectionLoading(containerId)` — creates/reuses one `.section-loading`
  element as the container's first child; a repeat call updates its text in
  place rather than stacking a second one. Wired into the two real,
  Graph-backed renders where the container is genuinely empty/stale until
  the fetch resolves: `renderStagingList()` (Staging Review) and
  `renderNeedsAttentionHub()` (the Docket).
  - **Deliberately NOT wired into `ensureLiveNavDataFetch()` (Catalog/Sets'
    first live-data load)** — tried first, then reverted on a real finding:
    `showBrowseTab()` calls `ensureLiveNavDataFetch()` and then immediately
    renders `FAKE_*`-backed cards SYNCHRONOUSLY in the same tick, by
    existing design (that function's own comment: "never blocks"). An
    indicator inserted there gets wiped out by that synchronous render
    before a human could ever see it — confirmed directly in a headless
    reproduction (a monkey-patched, artificially-slowed fetch still never
    showed the indicator, because the synchronous grid re-render — not the
    fetch itself — was what cleared it). This call site's whole point is
    showing something immediately and swapping in real data invisibly
    later, which is the opposite of what a loading indicator is for — so
    it was left out rather than shipped inert.
- **#13 — NGC/ANACS label decode: a real conflict with this file's own
  prior research, flagged rather than built.** This file's "ANACS/ICG/CAC
  label format" section already states, as a CLOSED finding: "NGC is
  confirmed to have no equivalent decodable identity number — its cert
  number is an invoice/sequence ID only, with grade as separate printed
  text." Verified this is still current, not stale — [NGC's own
  documentation](https://www.ngccoin.com/certlookup/) confirms the
  certification number is "the invoice number of the submission and the
  sequence of each coin in that order," which carries no encoded
  denomination/date/mint identity the way PCGS's `SPEC.GRADE/CERT` format
  does; decoding coin identity from an NGC cert number requires a live
  lookup against NGC's own database, which is a live-API integration this
  project has already ruled out elsewhere (see "External data sources" —
  the PCGS OAuth-credentials decision applies here too). Building a "decode"
  function against a number that carries no encoded identity would mean
  either faking a parser that decodes nothing real, or quietly building a
  live NGC API call this project's own rules already say not to. Neither
  is right to do without Ray's explicit steer, so nothing was built — see
  the open question in the chat reply for what to ask him. ANACS is in the
  same unconfirmed-format state this file already documented before this
  batch (0 coins graded by it in the collection, "waits until a coin
  graded by one of them is actually acquired") and wasn't independently
  investigated further this round, per Ray's own "ANACS... at your
  discretion" framing — deferred alongside NGC rather than guessed at
  separately.
- **#14 — Browse detail's Overview cert link now falls back to a live-
  computed URL, root-caused and fixed as asked.** `certDisplayHtml()`
  previously showed a real link ONLY when `CertLink` was already populated
  on the row, and fell to plain text otherwise — even when GradeSource and
  a cert number were both on file and a link was fully computable. Fixed to
  prefer the stored `CertLink` when present (never overriding a curated
  link already on file) and fall back to the exact same
  `buildCertLookupUrl(gradeSource, cert)` Add Coin and Browse Edit already
  use for their own cert-link buttons — one shared resolver, not a second
  implementation. Still renders plain text when neither a stored link nor a
  computable one exists (no GradeSource on file, or that GradeSource has no
  base URL yet in `Lookup_Graders`) — no throw, no broken link.
  `getGraderBaseUrl()` itself still reads `FAKE_LOOKUP_GRADERS` directly
  rather than the live table — a pre-existing, separately-flagged
  limitation this task didn't touch (out of scope; the five real services'
  codes are the same either way, so this doesn't block the fix working
  correctly against live coins today).
- **#15 — Catalog gained a grading-service filter**, same multi-select/OR
  chip pattern Metal already uses (ANDs with Denomination/Metal/
  Commemorative/Year/Search, same as every other Catalog filter axis). New
  `BROWSE_GRADING_SERVICE_CHIPS` (All + one chip per `FAKE_LOOKUP_GRADERS`
  entry + an "Ungraded/Other" catch-all for Seller/Owner/AI-est/blank),
  `browseSelectedGradingServiceKeys`, `browseGradingServiceTest()`. Built
  from the static grader list (not `activeLookupGraders()`) — same
  precedent Add Coin's own Grader dropdown and `buildGradeSourceOptions()`
  already follow; the per-coin test is a plain string comparison against
  `coin.gradeSource`, which works identically against live or mock data, so
  this only affects which CHIPS render, never matching correctness. Lives
  inside `#browseCoinsHeader` alongside Denomination/Metal, so it shows/
  hides with the Coins/Medal tab exactly like those two already do, no new
  visibility logic needed; resets to All on external Browse entry via the
  same `resetBrowseFilters()`/`updateMetalChipsUI()` mechanism Metal
  already uses (that helper was already fully generic by container ID).
  Interpreted as a FILTER, not a sort control — this project's own history
  has moved consistently away from sort dropdowns toward filter pills
  (Rolls' own sort-to-pills conversion is the clearest precedent), so a
  new pill row was the design-consistent reading of "sort/filter by
  grading service," flagged here as a real interpretive call.
- **Verified headless — 32 new assertions (`tests/verify_batch3.js`), all
  passing, zero page errors**, alongside all prior suites re-run clean
  (180 total across 3 suites). Covers: the Finish tier's three-way split
  (real match, real-zero-match, unrecognized-fallback) with a synthetic
  cross-denomination catalog; the series-picker narrowing a real pair down
  to one candidate, a non-matching typed value NOT narrowing, and the tier
  being a genuine no-op with no `description` key at all; the five new
  denom codes present as dropdown options plus DENOM_SCALE/STATS_DENOM_ORDER/
  DENOM_LABELS coverage, and confirming no gold/bullion code leaked in; the
  loading indicator's DOM mechanics (first-child insertion, real computed-
  style visibility, reuse-not-duplicate on a repeat call, text update, clean
  removal) plus a real Staging-Review integration test (an artificially
  slowed mock `listChildren()` call proving the indicator is genuinely
  visible mid-fetch and gone after); the cert-link fallback's four cases
  (stored link wins, live-computed link appears, no-GradeSource stays
  plain, a GradeSource with no base URL stays plain) with no throw; and the
  grading-service filter's chip rendering, real narrowing against
  `FAKE_COINS`, ANDing with Metal, and reset-on-external-entry. Screenshots
  reviewed at both viewports for the new Denomination dropdown, the
  Grading Service filter row, and the Docket's loading indicator — no
  horizontal overflow either width.
- **Not verified: any real device, any real OneDrive session against these
  specific fixes** — same standing caveat as every prior Add Coin round.

### Add Coin Phase 1: gold/bullion denomination codes (BUILT, same branch, still held)
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

### Add Coin Phase 1: Category narrows the DB_Coins matcher (BUILT, same branch, still held)
Closes the scope gap flagged immediately above, same session, on Ray's
explicit "fix now" call. `dbCoinsCandidatesFor()` gains a Category tier,
following the exact pattern the Finish tier already established
(`knownDbCoinsFinishValues()`), applied to the same real problem: several
Bullion-tier entries deliberately SHARE one plain Denomination — `$1` is
Peace Dollar, Morgan Dollar, Gold Dollar, AND American Silver Eagle; `$50`
is a classic commemorative, American Buffalo, Gold Eagle 1oz, AND Platinum
Eagle 1/2oz — so the base Denom+Year+Mint+Variety key alone can't tell
them apart, and without this fix a Silver Eagle would match/mismatch
against DB_Coins on the same key as an ordinary Dollar.

- **DB_Coins has no Category column of its own** — confirmed via source,
  `mapWorkbookRowToDbCoin()` maps no such field, and this task did not add
  one (a real DB_Coins Category column, if it existed, would need a
  workbook-side change, out of scope for an app-only session). The 487-row
  American Silver/Gold/Platinum Eagle figure Ray confirmed is presumably
  identifiable via `DB_Coins.Description` text (the field that already
  names the coin TYPE — "American Silver Eagle," etc.), not a dedicated
  category field.
- **New `BULLION_CATEGORY_MATCH_HINTS`** — a keyword list per
  `BULLION_TIER_OPTIONS` category, matched against `DB_Coins.Description`
  via substring containment.

**Superseded, same session — real wording confirmed, three categories
promoted to a hard filter.** The paragraph above originally said this tier
stayed soft-only across the board because the real DB_Coins Description
wording was unconfirmed. Ray checked it directly against the live workbook
and reported back real strings: `"American Silver Eagle Dollar"`,
`"American Silver Eagle Burnished Dollar"`, `"Silver Eagle Dollar"`,
`"American Gold Eagle"`, `"Palladium Eagle Dollar"`, and
`"American Buffalo Silver Dollar"` (flagged as a likely mislabeled catalog
entry — the real American Buffalo program is gold-only, no silver Buffalo
bullion issue exists; a workbook data issue for Ray to fix directly, not a
matcher problem). He also checked known false-positive risks — `"Bald
Eagle Recovery"` (a commemorative), `"Flying Eagle Cent"` (a classic 1850s
cent), `"Buffalo Nickel"`, and a Marine Corps commemorative containing
`"American Eagle"` — confirming none of them contain the full two-word
phrases `"SILVER EAGLE"`/`"GOLD EAGLE"`/`"PALLADIUM EAGLE"`, only the
individual words in a different order/context.

- **New `BULLION_CATEGORY_HARD_CATEGORIES`** (`Silver Eagle`,
  `Palladium Eagle`, `Gold Eagle`) — only these three get the real
  hard-zero-narrow the Finish tier already gives a recognized value: a hit
  narrows normally, a genuine miss (the hint matches nothing among THIS
  coin's candidates) narrows to zero, a real signal. Every other category
  stays soft-only exactly as before — either its real wording is still
  unconfirmed (all six classic pre-1933 gold categories: zero DB_Coins rows
  exist for any of them yet, so their hints are untested, not wrong,
  pending an actual coin of that type being catalogued; Platinum Eagle's
  own wording also wasn't among what Ray checked), or the hint word itself
  carries a known collision risk (`"Commemorative"` alone would match Bald
  Eagle Recovery, which IS a commemorative).
- **Two hints were themselves fixed by this pass, not just promoted**:
  `"Palladium Eagle"` was a bare `["PALLADIUM"]` and `"Gold Buffalo"` was a
  bare `["BUFFALO"]` — both single-word, both exactly the collision-risk
  pattern this tier's own design rule warns against (`"Buffalo"` alone
  would false-positive against every real Buffalo Nickel row). Fixed to
  `["PALLADIUM EAGLE"]` (matching the confirmed real wording) and
  `["AMERICAN BUFFALO"]` (a safer two-word phrase; Gold Buffalo itself
  stays soft-only since no confirmed real Gold Buffalo row exists yet —
  only the mislabeled silver anomaly above). **Every hint in this map is
  now a full two-word-or-longer phrase — never collapse one back to a
  single word.**
- **A soft category's hint can still narrow on a coincidental match** — this
  is a known, accepted, and now explicitly tested tradeoff, distinct from
  the hard-zero-on-a-genuine-miss case this pass protects against. `"Bald
  Eagle Recovery Half Dollar"` genuinely contains the bare `"EAGLE"`
  substring, so a soft `"Eagle"` category pick against a candidate set
  including it WILL narrow to that one row — staying soft only prevents a
  wrong hint from clearing everything to zero, it doesn't prevent an
  occasional false-positive narrow on an untested single-word-risk hint.
  This is why every hint promoted to `BULLION_CATEGORY_HARD_CATEGORIES` had
  to be independently checked against every known false-positive risk
  first, not just have real wording confirmed.
- **`addCoinIdentityShape()` gained a `category` field**, sourced from
  `addCoinBullionCategory` (blank for every everyday/classic pick, exactly
  like the Description tier's `isControlledDescription` gate) — the same
  "only Add Coin ever populates this field" pattern the Description tier
  already established, so Browse Edit and the Docket (which build their
  own identity shapes and never set `category`) are completely unaffected.
  `addCoinIdentityShapeKey()` includes it too, so a Category change (e.g.
  toggling Bullion off, or picking a different bullion type) correctly
  invalidates a stale `addCoinResolvedPick`, same as every other
  identity-affecting field.
- **No new call sites needed** — `checkDbCoinsMatch()` (the live banner)
  and `resolveAddCoinCatalogMatch()` (the save-time resolution) both
  already route through `currentAddCoinMatchState()` -> `addCoinIdentityShape()`,
  so both picked up the new tier automatically once the shape carried
  `category`.
- Verified headless (5 assertions in the original pass, this round adds 8
  more — 13 total for this feature, 202 across all 3 suites, zero
  failures): a real Category match narrows a synthetic Silver-Eagle-vs-
  commemorative-Dollar pair to the correct row; a soft category with zero
  hits among the current candidates soft-falls-back to the full set; the
  tier is a true no-op with no `category` field at all (Browse Edit/
  Docket's shape, and any ordinary non-bullion Add Coin entry); end-to-end
  through the real UI, picking "American Silver Eagle" from the actual
  Bullion dropdown correctly sets `addCoinIdentityShape().category` and the
  real matcher narrows to the matching DB_Coins row; this round's own real
  confirmed wording (`"American Silver Eagle Dollar"`/`"...Burnished
  Dollar"`) narrowing correctly and excluding a Morgan Dollar row; a
  CONFIRMED category (Silver Eagle) genuinely absent from a coin's
  candidates now hard-zero-narrowing; the fixed Palladium Eagle hint
  narrowing on the real confirmed phrase; Gold Eagle's real wording
  narrowing correctly and excluding American Buffalo Gold; the unconfirmed
  "Eagle" category NOT hard-zeroing on a genuine miss; the known, accepted
  false-positive-narrow tradeoff for a soft category documented as a
  passing assertion rather than left implicit; and the fixed Gold Buffalo
  hint not falsely matching a plain Buffalo Nickel row while still
  soft-falling-back on its own genuine (unconfirmed-category) miss.
- **Not verified: the real DB_Coins Description wording for the six
  classic pre-1933 gold categories or Platinum Eagle (all still soft-only,
  zero or unchecked real rows), and no real device/OneDrive session** —
  same standing caveat as every prior round in this feature. Promote any
  of them to `BULLION_CATEGORY_HARD_CATEGORIES` only once a real row's
  wording is confirmed AND checked against the same false-positive list
  above.

### Add Coin Phase 1: batch 4 (BUILT, same branch, still held)
Three findings from Ray's live spot-check of batch 3's Category-narrowing
fix against the real `_Testing` copy (2017 American Silver Eagle, blank
Finish, correctly narrowed to 2 genuine candidates; Finish=Proof resolved
to one — confirming the fix itself works).

- **#1 — Bullion toggle relocated.** Moved from directly above the
  Denomination field to below the main data-entry window (after Notes,
  before the collapsed Purchase Details/Storage rows) — it's a mode switch
  for the Denomination field, not a field of its own, and reads better as
  a standalone control after the identification fields than interrupting
  them. No behavior change — same element id, same listener, same
  `populateAddCoinDenominationDropdown()` call.
  **Superseded by batch 6 below — corrected back to directly above
  Denomination** after Ray saw it live; kept here only for history.
- **#2 — series picker not Category-aware, a real bug.** After picking
  "American Silver Eagle" via the Bullion toggle, editing Year afterward
  re-triggered the classic denom+year series lookup against the shared
  `"$1"` code (which legitimately spans Peace/Morgan/Presidential/Native
  American dollars) and popped the classic-dollar ambiguous picker for a
  coin whose identity Category had already fully resolved — the exact same
  class of gap the DB_Coins matcher's own Category tier (batch 3) fixed,
  just on the Description auto-fill function instead. Root cause: the
  denomination change handler's own bullion branch correctly sets
  Description and skips the lookup, but `maybeAutoFillDescription()` is
  ALSO called from the Year field's own input listener with no Category
  awareness at all. **Fixed at the function itself, not the call site** —
  `maybeAutoFillDescription()` now returns immediately when
  `addCoinBullionCategory` is set, so every caller (present or future) is
  protected the same way, not just the one call site that happened to
  trigger this repro.
- **#3 — Finish dropdown didn't match real DB_Coins values.** Confirmed
  against the real catalog: missing `Burnished` (48 rows, confirmed
  against a real `C-2017-W-$1-03` case), `Satin Finish` (88 rows),
  `Enhanced Reverse Proof` (2 rows), `Enhanced Uncirculated` (2 rows — a
  distinct, real West Point 75th Anniversary product name, kept as its own
  option, never conflated with plain "Uncirculated"). `Specimen` removed —
  matches zero real rows. Fixed the same way the Denomination dropdown was
  fixed: options now reflect the real, confirmed catalog rather than a
  hand-guessed list.
  - **Explicitly NOT added: plain `Uncirculated` (172 rows).** Same class
    of issue as the already-confirmed `Circulated` case (139 rows,
    "Browse Edit real write layer" above) at larger scale — a
    condition-vs-finish data mix-up in the catalog itself, a future
    data-cleanup project, not a dropdown gap. Both stay excluded from the
    dropdown; the matcher's existing soft-fallback-to-full-list behavior
    (`dbCoinsCandidatesFor()`'s Finish tier) already covers a blank Finish
    for those rows, unchanged.
  - `FINISH_GRADE_PREFIX` (the PCGS-label-decode grade-prefix table) was
    deliberately left untouched — it defaults unrecognized Finish values to
    `"MS"`, a safe fallback, and none of the four new values were reported
    as needing a specific prefix. Out of scope for this pass; flag if a
    real coin with one of these Finishes is ever decoded from a PCGS label
    and needs a different prefix.
- Verified headless — new suite `tests/verify_batch4.js` (22 assertions,
  all passing): the toggle's new DOM position (after Notes, before
  Purchase Details, no longer immediately above Denomination); the series
  picker never firing after a Bullion pick, including after an explicit
  Year edit and a direct `maybeAutoFillDescription()` call; a control case
  confirming a genuine classic multi-series year still shows the picker
  (the fix is scoped to Bullion picks only, not a blanket suppression); all
  8 confirmed Finish values present, `Specimen`/`Uncirculated`/`Circulated`
  all absent, exactly 9 options total; and `Enhanced Uncirculated`
  narrowing the Finish tier correctly without being conflated with
  Business Strike. Screenshots reviewed at both viewports (a real Bullion
  pick with the toggle checked) confirming the new layout and no overflow/
  collision. All 3 prior suites (202 assertions) re-run clean alongside it
  — 224 total, zero failures.
- **Not verified: any real device, any real OneDrive session against these
  specific fixes** — same standing caveat as every prior round in this
  feature.

### Add Coin Phase 1: batch 6 (BUILT, same branch, still held)
Two findings from Ray's live-device review of batch 4's changes.

- **#1 — Bullion toggle placement, corrected.** Batch 4's move (checkbox +
  note down near Notes, before Purchase Details) read wrong in hand — the
  checkbox determines how Denomination/Category get captured together, so
  it needs to sit next to that field, not disconnected from it near the
  bottom of the identification block. **Moved back to directly above
  Denomination**, exactly its pre-batch-4 position. No behavior change —
  same element id, same listener, same
  `populateAddCoinDenominationDropdown()` call; markup position only, both
  times.
  **Superseded by batch 7 below — corrected again, per Ray's explicit,
  twice-repeated instruction**, to sit UNDERNEATH the Denomination dropdown
  itself rather than sandwiched between the label and the dropdown. This
  round's placement was a reasonable-looking guess at "the original spot"
  that turned out not to be what Ray meant — kept here only for history.
- **#2 — Grading Service section header: kept, not dropped.** Investigated
  rather than guessed: the "GRADING SERVICE (OPTIONAL)" header currently
  reads as sitting above a single field (Grader) because the section's
  other real content — the PCGS Label # block, the non-PCGS grader note,
  and the Cert/Type Number row — is conditionally hidden (`display:none`)
  until a Grader is actually picked. So at rest it *looks* like a
  one-field section, but it already isn't one — those three blocks are
  real, already-built content under this same header, not "planned soon"
  fields that would need to arrive first to justify it. Dropping the
  header (option b) would either leave the PCGS Label block/Cert-Type-
  Number row with no header of their own once revealed, or require
  re-adding one at that point anyway — so option (a) was the clear fit.
  **No code change** — the header stays exactly as it is.
  **Superseded by batch 7 below — Ray corrected this call too.** His actual
  objection wasn't about whether more fields exist under the hood; it's
  that the header visually reads as though Denomination/Year/etc. below it
  all fall under "Grading Service," which is genuinely confusing regardless
  of what's conditionally hidden. He also named a larger goal (matching
  Edit Coin's page structure) that this task's own analysis should have
  surfaced as a real, decidable factor rather than reasoning about the
  header in isolation.
- Verified headless: `tests/verify_batch4.js`'s own toggle-position
  assertions were rewritten to check the corrected (original) placement,
  following the real design change rather than weakening the suite (batch
  4's now-superseded assertions are gone, not left conflicting). 223
  assertions across all 4 suites, zero failures. Screenshots reviewed at
  both viewports confirming the toggle sits directly under the
  Denomination label with no overflow.
- **Not verified: any real device against this specific correction** —
  same standing caveat as every prior round in this feature; this round
  itself was a direct response to Ray's own device review, so the loop is
  already closer than usual.

### Add Coin Phase 1: batch 7 (BUILT, same branch, still held)
Ray corrected both of batch 6's calls directly, after explicitly asking to
be consulted before either was touched again — this round is exactly what
he confirmed, not a further guess.

- **#1 — Bullion toggle: the ACTUAL original/intended spot.** Every prior
  placement (original build, batch 3, batch 6) put the checkbox BETWEEN the
  "Denomination" `<label>` and the `<select>` itself. Ray's ask, stated
  twice, was for it to sit AFTER the dropdown — `<label>Denomination</label>
  <select>...</select>` first, THEN the checkbox + its explanatory note,
  THEN Year. No behavior change, markup position only.
- **#2 — "GRADING SERVICE (OPTIONAL)" bold section-label removed, `Grader`
  renamed to `Grading Service`.** Ray's confirmed direction is his own
  option (b) from the batch-6 question, in full — not just the header
  removal: drop the bold header, AND rename the field's own label from
  "Grader" to "Grading Service," styled the same plain way any other field
  label is (`<label>Grading Service</label>`, no special styling) — one
  clearly-labeled field instead of two mismatched headers. **Position is
  UNCHANGED** — still the first real field in the form, ahead of
  Denomination, since a grader needs to be picked before the PCGS
  label-decode flow can run. Only the element id (`addCoinGrader`) and
  every function that reads it are untouched — this is a visible label
  text change only, same "rename is label-only" pattern as every other
  pure relabel in this file. A real restructure to match Edit Coin's
  accordion-section layout (with Grading Service pulled into its own
  bounded card) is Ray's stated bigger goal — logged as ParkingLot Row 5
  above, explicitly scoped as a SEPARATE future task, not started here.
  **Since BUILT** — see "Add Coin: accordion restructure" below; ParkingLot
  Row 5 is resolved.
- Verified headless: `tests/verify_batch4.js`'s toggle-position assertions
  rewritten again for the corrected (AFTER-the-dropdown) placement, plus
  three assertions confirming no `.section-label` element anywhere in Add
  Coin still reads "Grading Service," that the field's own label text is
  now genuinely "Grading Service" (not left as "Grader"), and that its
  position ahead of Denomination is unchanged. 227 assertions across all 4
  suites, zero failures. Screenshots reviewed at both viewports (phone +
  tablet) — "Grading Service" sits plain near the top with no bold header
  above it, Denomination dropdown is immediately followed by the Bullion
  checkbox and its note, no overflow at either width.
- **Not verified: any real device against this specific correction** —
  same standing caveat as every round in this feature. **This time the
  placement was confirmed in writing by Ray before building**, not guessed
  — if it's still wrong, that's new information from an actual device, not
  a repeat of the same back-and-forth.

### Docket: three collapsible sections (BUILT, same branch, still held)
The Docket opened onto one long flat list of everything needing action —
undigestible in practice. Replaced with three collapsed-by-default
accordion sections, each with its own item count in the header:
**Staging**, **Awaiting Copilot Research**, **Other / Requires Photos**.

**Presentation only — the classification logic is untouched.** The same
signals decide the same things (`SET_STATUS`, `COIN_DRAFT_STATUS`,
`findDbCoinsMatch`, `coinMissingPhoto`); what changed is which bucket each
row is presented in, and that rows are now per-item instead of aggregated.

- **Accordion-in-place, not three routes** (Ray's confirmed call). This is
  the app's established grouping pattern everywhere else — Browse detail,
  Edit Coin and Edit Set are all accordion stacks — and a separate page is
  reserved for a destination with its own actions and back-target. Staging
  Review already IS such a destination and **a Staging row still drills
  through to it on tap**, so the existing precedent is preserved rather
  than duplicated. Three more routes would have meant three more nav-back
  targets for no gain. Wired once at init via `wireStaticAccordionToggle()`
  (static markup — only the section CONTENTS re-render).
- **Counts are per-coin, and the badge number goes UP.** Confirmed with Ray
  as a deliberate, visible change: staged coins used to collapse into a
  single "N coins awaiting your decision" row that contributed **1** to the
  fob regardless of N, so the Docket under-reported real work. Every coin
  now counts as itself, and the three header counts sum to the fob exactly,
  by construction.
- **In-progress Set drafts fold into Staging**, not a fourth section — a
  Set draft lives in the same OneDrive Staging folder as a coin draft, so
  it belongs there. Tapping one still goes to In Progress Sets.
- **An unmatched staged coin is listed in Staging ONLY, never also in
  Research.** The old layout showed it twice (an aggregate action row plus
  its own research row); with real per-item rows in both sections that
  becomes the same coin appearing and being counted twice — exactly the
  redundancy this redesign exists to remove. Its unmatched state is
  surfaced inline on its own row instead, with Re-check right there. Same
  reasoning that removed the redundant Docket push on save (live-run
  finding #7: "the draft's own presence in the hub already represents
  'needs a catalog entry'"). Research therefore holds only what is
  genuinely waiting on someone else: drafts marked ready, real Docket queue
  entries, and Complete-pending-research Sets.
- **The old flat containers are gone, not hidden** — `needsActionContainer`
  / `needsResearchContainer` / their empty+workbook notes are replaced by
  `docketStaging*` / `docketResearch*` / `docketOther*`. `needsAttentionBadge`
  keeps its id (it is the drawer fob, not a section).
- New `.docket-count` pill styling — deliberately quiet, and NOT the fob's
  brass-tag treatment: the fob is the cabinet's own hardware, these are
  counts inside a list. It tints gold while its section is expanded.

**Mark-ready signal — soft/advisory, not a hard gate (Ray's confirmed
call).** Most coins land in Staging precisely because they couldn't be
confidently mapped to a CoinID at capture, so a resolved CoinID is the
natural "ready to promote" signal. A draft with no `coinId` now shows a
flag on its Staging Review row plus a **Re-check** button; **Mark ready
stays enabled**. Deliberately not hard-blocked: a genuinely new variety may
have no DB_Coins row at all and never will until Copilot adds one, so
hard-gating on CoinID would strand that coin in Staging permanently.
- **New `recheckCoinDraftMatch(draft)`** — the coin-draft counterpart of
  `docketRecheckEntry()`, sharing its exact three-outcome contract (0 = say
  so and touch nothing; 1 = confirm dialog, never auto-applied; 2+ = the
  shared ambiguous picker, where the deliberate pick IS the confirmation —
  the firm project rule, per two historical mislinks). Reachable from both
  the Docket's Staging rows and Staging Review's own rows.
- **`description` is deliberately NOT passed into the re-check shape.** The
  Description tier in `dbCoinsCandidatesFor()` is documented as firing ONLY
  for Add Coin's controlled series-picker value; a draft's stored
  description may be free-typed, and `All.Description` /
  `DB_Coins.Description` are different sources with no guaranteed
  correspondence. `category` IS passed — it can only ever have come from
  the controlled Bullion-tier dropdown, so it carries the guarantee the
  Description tier needs and free text doesn't.
- **`matchedHow` gains a fourth value, `"recheck"`**, alongside
  single/picked/none — reconciliation needs to know a link was established
  AFTER capture by a later catalog addition rather than at capture time.
  Verified safe: nothing in the app branches on the old three values.

**Verified headless — new suite `tests/verify_docket_sections.js` (30
assertions), all passing; 258 across all 5 suites, zero failures.** Covers:
the three sections' exact order and labels, all collapsed by default,
expand/collapse with `aria-expanded`, the old containers genuinely removed;
the three counts summing to the badge AND each matching its own rendered
row count; per-coin rows rather than an aggregate line; a resolved draft
showing its CoinID and an unresolved one flagged inline; an unmatched coin
NOT duplicated into Research; a marked-ready draft moving to Research and
out of Staging; photo gaps confined to Other with their Dismiss action
intact; a Staging row still drilling through to Staging Review; the
soft-not-hard Mark-ready gate (button enabled, flagged, Re-check offered);
Re-check writing nothing on zero candidates and nothing until confirmed on
one; and the resolved CoinID plus `"recheck"` provenance landing on the
draft. Four prior assertions were rewritten to follow the real design
change rather than weakened — the superseded aggregate-row and
deliberate-duplication claims (`R6`), and three container-id reads.
Screenshots reviewed at both viewports, no overflow at either width.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round in this feature.

### Add Coin: accordion restructure (BUILT, same branch, still held)
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
that trap. **It does not apply**: Add Coin's own `updateFlipLabels()` sets
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

### U.S. Mint Item Number: naming standardized across DB_Coins/DB_Sets (BUILT, same branch, still held)
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

### Add Coin: Identification section — Mint Item Number + GSID matching (BUILT, same branch, still held)
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

### Add Coin Identification: a matched ID now carries Category too (BUILT, same branch, still held)
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

### Staging Review: workbook + per-coin folder links (BUILT, same branch, still held)
Live-testing item 3 of Ray's 4-item batch: the Docket's Research section
already shows an "Open workbook in Excel" link, but Staging Review — the
other real screen he reviews pending drafts from — had no equivalent, and
he also wanted a direct link to a coin's own OneDrive Staging folder (to
check its uploaded photos without hunting for it by hand).

- **The workbook link renders ONCE, near the top of the page — not
  repeated per row (Ray's explicit call).** It's the exact same link
  regardless of which coin is being reviewed, unlike the Docket's Research
  rows, which repeat it per-row because each row there can drift out of
  view independently in a longer, ungrouped list. Reuses
  `getCachedWorkbookWebUrl()` completely as-is (no new fetch logic, no
  second cache) — same one-shot-per-session caching the Docket already
  relies on. Degrades to the same "Workbook link unavailable right now
  (write layer disabled, or not signed in)" note as the Docket when
  `null` comes back, rather than a broken link.
- **The coin's own OneDrive Staging folder link is per-row, since it
  genuinely differs per draft.** New `RealGraphClient.getFolderWebUrl(path)`
  mirrors `getWorkbookWebUrl()`'s exact pattern (a plain read-only Graph
  item-metadata GET, `null` on a 404) but takes any path — used here with
  `coinDraftFolder(collectionId)`. New `getCachedFolderWebUrl(collectionId)`
  caches per-CollectionID in a `Map` for the session (same
  undefined/null-are-both-falsy convention as the workbook cache, just
  keyed since there are many folders instead of one workbook). This is a
  genuinely new, dedicated method — not an overload of `getItemMeta()`,
  which carries different (null-if-never-uploaded) semantics elsewhere in
  this file.
- **Both links are computed once per `renderStagingList()` render, before
  any row markup is built** — the page-level link via one
  `getCachedWorkbookWebUrl()` call, the per-row links via one
  `Promise.all()` over every REAL (non-mock) draft's own
  `getCachedFolderWebUrl()` — rather than each row kicking off its own
  independent fetch. Both fetches respect the existing
  `stagingRenderToken` staleness guard (a newer render superseding a
  slower in-flight one bails out before touching the DOM), same pattern
  `renderNeedsAttentionHub()` already established.
- **Mock (flag-off) `FAKE_STAGING` rows show neither link** — there's no
  real Staging folder for a mock row to link to, and no real workbook
  write layer backing the page-level link either; this is unchanged from
  every other real-Graph feature's flag-off behavior in this file.
- Verified headless — new suite `tests/verify_staging_workbook_links.js`
  (10 assertions, all passing; 339 across all 10 suites, zero failures):
  the page-level link renders exactly once in the whole `#view-staging`
  DOM (not once per row); two real drafts each get their own,
  genuinely-different folder link, correctly derived from their own
  CollectionID's Staging folder path; the flag-off mock path shows
  neither link with no crash; an unavailable workbook link (mock seeded
  `workbookWebUrl: null`) degrades to the explanatory note; and a nav/
  overflow smoke check. Screenshots reviewed at both viewports (phone +
  tablet) — the workbook link sits directly under the interim banner,
  each row's folder link sits inline with its other detail lines, no
  overflow at either width.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round in this feature; this is a new Graph
  read path (`getFolderWebUrl`) and needs a live click-through to confirm
  it actually lands on the coin's own Staging subfolder in an editable
  OneDrive session, same "needs a real click-through" caveat the workbook
  link itself already carries.

### Docket: Research row tags (BUILT, same branch, still held)
Live-testing item 4 of Ray's 4-item batch: Staging vs. Awaiting Copilot
Research read as nearly identical in live testing — apart from the
Set-in-progress case, both sections just show a coin/Set name and a status
line. Ray gave explicit latitude to either rename the Research section or
visually distinguish the row kinds within it.

- **Kept as one Research section, three sections total — a small per-row
  tag distinguishes row kinds instead of a rename or a fourth section.**
  Reasoning: the section's real name ("Awaiting Copilot Research") is
  still accurate for every row in it — a Handed-Off draft genuinely IS
  waiting on Copilot's reconciliation pass, same as a genuine no-catalog-
  match entry is waiting on Copilot's research. Renaming the section would
  have meant picking a name that's honest for only one of the two row
  kinds. A fourth section would also have meant a fourth badge count to
  track down, when the actual ask is just "let me tell these apart at a
  glance" — which a tag solves directly.
- **Two kinds, matching the exact classification already implicit in the
  three research push sites**: **"Handed Off"** = a coin draft already
  marked ready (`stagedHandedOff`, `COIN_DRAFT_STATUS.READY`) or a Set
  draft with `status = "Complete — pending research"` (`completeSets`) —
  finished capture, waiting on someone else to act, nothing left for Ray
  to decide. **"Research"** = a real Docket queue entry from
  `docketOpenEntries()` (including a `kind: "coinid-relink"` entry) —
  genuinely no catalog match yet, needs Copilot's actual research.
- **Rendered by one shared `appendDocketRows()`**, not duplicated per push
  site — each research row object now carries its own `kind: "handoff"`
  or `kind: "research"` field; `appendDocketRows()` renders a small
  `.docket-tag` pill (`Handed Off` / `Research`) at the top of any row
  that has one, so Staging and Other rows (which never set `kind`) are
  completely unaffected with no extra opt-in check needed.
- **New `.docket-tag` CSS** — same "quiet inline pill, not the drawer
  fob's brass-tag treatment" posture `.docket-count` already established:
  `.docket-tag-handoff` reads muted/neutral (waiting, nothing urgent from
  Ray); `.docket-tag-research` picks up the gold accent (a real Copilot
  research item).
- Verified headless — new suite `tests/verify_docket_row_tags.js` (11
  assertions, all passing; 350 across all 11 suites, zero failures): the
  section count/order is still exactly three (no rename, no split); a
  real seeded Docket queue entry tags "Research" with the research CSS
  class; a coin draft marked ready tags "Handed Off"; a Complete Set
  draft also tags "Handed Off"; Staging/Other rows never carry the tag at
  all; and a nav/overflow smoke check with Research expanded. Screenshots
  reviewed at both viewports — the tag sits cleanly above each row's
  title with clear visual contrast between the two kinds, no overflow at
  either width.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round in this feature.

### Composition: a real matcher input + flip-card display (BUILT, same branch, still held)
Two related pieces from Copilot's composition research (2026-08-29) plus a
live-testing observation that the flip card's bottom-right corner was unused.

**The bug being fixed.** `DB_Coins.Composition` is a real, populated column
that `mapWorkbookRowToDbCoin()` **never read at all** — it was listed in that
function's own header comment and then not mapped, so the matcher was
structurally blind to it. Copilot found **109 true Clad/Silver Proof pairs**
in the catalog, **99 of which collide on the matcher's own
Year+Denom+MintMark+Variety key** with the SAME Finish ("Proof") and the SAME
Description. For those, Composition is the only field that tells the two rows
apart — so a Silver Proof coin could silently link to the Clad catalog row,
taking its CoinID, Mintage and PCGS# with it (and, since SpotValue's formula
chains through CoinID, its spot value too) with nothing visibly wrong on
screen. That is the same silent-mislink class as this project's two
historical incidents. (Copilot also found and already fixed 2 real catalog
gaps; those were workbook-side and needed nothing here.)

**1. Composition narrows `dbCoinsCandidatesFor()` — the one HARD tier.**
- **Hard, deliberately** (Ray's Q4): a supplied Composition matching no
  candidate returns **zero — No Match**, never a soft fall back to a
  different-composition row. Every other tier is soft or
  conditionally-hard; this one is not, because a soft fallback here IS the
  bug.
- **Not guarded by `candidates.length > 1`** — the only tier that isn't, and
  it matters. Every other tier is a *disambiguator*, earning its keep only
  when there's something to disambiguate. This is a *correctness check on the
  match itself*: if exactly one candidate exists and its Composition
  contradicts the supplied one, that lone candidate is still the wrong row,
  and "there was only one option" is not a reason to accept it.
- **Runs first**, immediately after the base filter, ahead of the
  Description/Category/Finish/Designation tiers — Composition is part of the
  identity key here, not a heuristic. Everything downstream is `length > 1`
  guarded, so a Composition narrow to 0 or 1 correctly short-circuits them.
- **`normComposition()`** — string-normalize ONLY (Q2): `normField()`'s
  trim+uppercase, plus collapsing internal whitespace and `,;/` separators so
  the sheet's hand-entered variants compare equal. It deliberately does
  **not** canonicalize across wordings — `.999 Fine Silver` and
  `99.9% Silver` stay distinct, and it never buckets to the
  Silver/Clad/Gold MetalCategory (bucketing would merge two genuinely
  different coins back into one match, the very bug this fixes).
- **Nothing feeds it yet, and that's intended** (Q1). There is no producer for
  `shape.composition`: Add Coin deliberately has no Composition input
  (Specifications is catalog data, not hand-entered — the accordion redesign
  excluded it on purpose), **All has no Composition column**, and an ID lookup
  (PCGS/Mint Item Number/GSID) already resolves to one authoritative row
  without re-running the matcher. Built now as the correct forward-looking
  contract, same posture as Category being captured on the draft ahead of
  `ALL_WRITABLE_COLUMNS`. **Until a producer exists, the reachable behavior is
  the Ambiguous path, not the No-Match one.**
- **FOR WHOEVER ADDS THAT PRODUCER (Ray's explicit flag, Phase 2):** verify
  DB_Coins' Composition wording is actually clean for whatever it will match
  against BEFORE relying on it — the same diligence the Category hard-zero
  tier required, where each hint had to be confirmed against real wording and
  checked against known false positives first. A hard tier fed by
  inconsistent data creates false Docket misses.
- **Composition unknown + candidates differing only by it => Ambiguous**, with
  **no silent preference of any kind** (Q3) — not even a plausible one like
  "prefer clad for a business strike". This needed no routing code: 2+
  candidates already means the shared picker. What it needed was making
  Composition *visible* there.

**Confirmed scope of the fix against Copilot's own three cases** (checked
before assuming Composition resolves everything):
- **The 109 Clad/Silver Proof pairs** — Composition alone fully resolves.
- **1982-D/S 50C Washington commemorative vs. Kennedy half** — Composition
  alone *also* fully resolves it (the Washington commem is 90% silver, the
  1982 Kennedy is clad, at both D and S). Description would separate them too,
  but isn't needed.
- **1999-P $1, multiple silver dollar programs vs. Susan B. Anthony** —
  Composition does **NOT** fully resolve this one. It splits SBA (clad) away
  from the two commemoratives, but **Dolley Madison and Yellowstone are both
  90% silver** at the same year/mint/denom/variety, and both exist in Proof
  and Uncirculated so Finish doesn't separate them either. Description is
  their only true differentiator.
  **Deliberate call (confirmed): that residual pair stays a PICKER case, not
  a new auto-narrowing Description tier.** Three reasons: the standing firm
  rule is "2+ always reaches a human"; the existing Description tier is
  gated to Ref_Denominations' controlled series vocabulary, which is not
  guaranteed to carry commemorative program names for `$1`+1999 so it likely
  wouldn't fire anyway; and CLAUDE.md's own "Commemorative / Description
  blind spot" assessment already concluded that if picker frequency becomes
  annoying the fix is to *surface Description more prominently, not
  auto-resolve on it* — which the picker already does. **Do not reopen this
  as "Composition didn't fix 1999-P."** It isn't meant to; the picker is the
  answer there, by design.

**Composition surfaced in the candidate displays.** Added to
`renderAmbiguousMatchList()` **and** to both single-candidate Re-check confirm
dialogs (the Docket's `docketRecheckEntry()` and `recheckCoinDraftMatch()`) —
all three are "what am I about to link this coin to" displays and were
inconsistent otherwise. **Composition LEADS the detail line, ahead of
PCGS#/GSID/Mintage**: on those 99 colliding pairs every other displayed fact
is byte-identical between the two candidates, so burying the one
differentiator behind three catalog reference numbers would recreate the
Part-F "both options look identical" bug by another route.

**2. Composition on the saved coin's flip card, bottom-right corner.**
- **That corner did not exist.** `applyFlipCorners()` wrote TL/TR/BL/SR only —
  there was no `browseDetailBR`/`spotlightBR` span at all, so the corner was
  empty by absence, not by choice. Both spans are new.
- **Browse detail AND Spotlight**, which share `applyFlipCorners()` — one
  render path, both get it.
- **Add Coin is deliberately EXCLUDED** (Ray's explicit scoping, correcting
  the original ask): `updateFlipLabels()` is a different function with a
  different corner mapping, its `flipObverseBR` already carries
  Variety+Designation as two stacked lines, composition often isn't known
  until an Identification match resolves, and this corner has a documented
  real-device clipping history that a third stacked line would be poking at.
  A regression assertion pins Add Coin's BR to Variety/Designation only.
- **Precious metal only** — gold/silver/platinum/palladium. A clad quarter or
  zinc cent has a composition, but it isn't worth a corner of the coin's own
  graphic; purity is what matters for a coin held for its metal.
- **Detection reads the composition STRING, not `metalCategoryFor()`** (Q6),
  because **Lookup_MetalContent buckets Palladium under "Other"** (a
  documented, intentional call there) — so a palladium coin is structurally
  invisible to the category path, and palladium is one of the four metals
  this covers. `metalCategoryFor()` is the fallback, used only when there is
  no composition string: a live coin can have a MetalCategory (via the
  MetalContentType join) while its DB_Coins Composition cell is blank, and
  showing the bare metal name is strictly more informative than nothing and
  never wrong — it omits the purity rather than inventing one.
  **Note the correction worth remembering: the Specifications panel does NOT
  use `metalCategoryFor()`** — it uses `compositionTextFor()` →
  `FAKE_METAL_CONTENT` (ounce-based, demo rows only). Those are two different
  mechanisms and were conflated in the original ask.
- **Displayed as fineness/percentage, the stored value.** Karat is
  deliberately not used: it's a gold-only convention with no meaning for
  silver, platinum or palladium, so it could not be applied consistently.
- **Excluded: Sets** (`Denomination="Multiple"` — several different coins, no
  single composition). **Included: Rolls** (a roll is one denomination
  throughout, and melt value is exactly why composition is already promoted
  for rolls elsewhere in this file).
- **A coin whose CoinID never resolved shows nothing, silently** (Q5,
  confirmed — no fallback wanted). Composition lives only on DB_Coins, joined
  onto a live coin by `coin.coinId` in `ensureLiveNavDataFetch()` alongside
  the existing `metalCategory` join.
- **Composition rides into the `.sr-only` summary too** — the visible corner
  spans are all `aria-hidden`, so a fact appearing only in a corner would
  otherwise be invisible to a screen reader (the locked-in rule for this
  card).

**A real overflow bug found and fixed during the build, by screenshot, not by
measurement.** Composition is the longest thing any corner carries. At the
shared 27px, realistic values run **145–192px** (`.999 Fine Silver` 145,
`99.95% Platinum` 157, `.9995 Fine Palladium` 192, `90% Silver, 10% Copper`
219) against this box's 50%-of-frame cap of **140px** — and because
`.flip-label` is `white-space: nowrap` with **no `overflow: hidden`** (removed
deliberately, see its CSS comment) and is anchored by `right`, the excess
spills **RIGHTWARD past the frame's own edge and gets visually cut**. 4 of 8
realistic strings overflowed. Fixed two ways, both measured:
- **`#browseDetailBR, #spotlightBR { font-size: 22px; }`** — scoped by ID, so
  it can never reach Add Coin's own BR corners, which must stay at 27px.
  Composition is genuinely secondary to the identity/grade values in the other
  three corners, so it takes a smaller size rather than a wider box: this
  brings every realistic value inside the *existing* cap with **no geometry
  change at all**, so it cannot collide with the coin disc or with the Grade
  label sharing its row. 22px is deliberately clear of the 20px that drew
  Ray's original "too small to read on phone" report.
- **`compositionLabelCandidates()` + `setFittedCornerText()`** — the same
  `scrollWidth`/`clientWidth` measured shortening `renderTypeDenomCorner()`
  uses, which that CSS comment already names as the thing that actually
  prevents unbounded corner overflow. The chain only ever **reduces**, never
  rewords or recalculates a purity: stored value verbatim → precious-metal
  terms only (`90% Silver, 10% Copper` → `90% Silver`, dropping a balance
  metal this corner exists to say nothing about) → without the filler word
  "Fine" (`.9995 Fine Palladium` → `.9995 Palladium`). A value that already
  fits is shown untouched.
- **Worth remembering:** a corner label's BOX always overlaps the disc's box —
  the disc is a circle and the labels sit in the empty corners around it — so
  a box-intersection test is meaningless here and a first version of the
  suite failed on exactly that bad assertion. What actually matters is that
  the text stays inside its own box, inside the frame, and in the same
  vertical band as the label opposite it.

**Verified headless — new committed suite `tests/verify_composition.js`, 74
assertions, all passing; 424 across all 12 suites, zero failures, zero page
errors.** No prior assertion needed changing — nothing in this pass altered
existing behavior. Coverage: the mapper reading Composition; every
`normComposition()` rule including the deliberate non-canonicalization;
the hard tier's five branches (each composition resolving to its own row,
normalized matching, the No-Match case, and the single-candidate
contradiction); the tier being a true no-op with no/blank `composition` so
Browse Edit and the Docket are unaffected; the ambiguous path returning 2
candidates that are identical on every other displayed field; the picker
rendering both compositions, the two cards no longer being textually
identical, and Composition leading the detail line; precious-metal detection
including palladium and the confirmation that the category path could not
have caught it; Set/Roll/unresolved-CoinID handling and the category
fallback; the BR spans existing and rendering on Browse detail and Spotlight;
the sr-only summary; **Add Coin's BR pinned to Variety+Designation** (scope
guard); the reduction chain in isolation including purity never being
altered; and layout at both viewports with the measured worst-case strings.
**Both halves have verified negative controls** — neutering the hard tier
fails 5 assertions, and neutering the fitting *in `applyFlipCorners()`
specifically* fails 3 more. That second control was added after a first
version of the suite passed with the fitting removed, because it called
`setFittedCornerText()` directly instead of going through the real render
path — the same "green suite hiding a real bug" trap this file has recorded
before. Screenshots reviewed at both viewports for all four worst-case
strings.
- **Not verified: any real device, any real OneDrive session** — same
  standing caveat as every round on this branch. In particular the real
  DB_Coins Composition wording has not been independently checked from this
  environment; the demo values seeded on `FAKE_METAL_CONTENT` and the
  1999-S Clad/Silver pair seeded in `FAKE_DB_COINS` are representative
  stand-ins so both halves are exercisable with `ENABLE_LIVE_NAV_DATA` off.

### CACBean UI, Value field rounding, composition corner restacked (BUILT, same branch, still held)
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

### CACBean visibility fix, read-only Overview row, $ on Purchase/Shipping, Catalog composition, collision-based sizing (BUILT, same branch, still held)
Batch of small, independent fixes/polish from live testing. Eight items
total; items 1-6 below are built. Item 7 (reverse-flip investigation) needed
no code — see its own note. Item 8 (Mint Mark "None (Other)") is a separate,
still-open item pending a data-population check — see the end of this
section.

**1. Real bug fix: CAC Bean checkboxes were hidden specifically for PCGS in
Add Coin.** `#certTypeNumberRow` — holding BOTH the manual Cert/Type Number
input and the CAC checkboxes — only shows when `grader && grader !== "PCGS"`,
correct for the cert input (PCGS's cert is auto-decoded from the label, no
manual entry needed) but backwards for CAC, which almost exclusively
stickers PCGS/NGC coins. The checkboxes were nested inside that same
conditional block, so they were hidden exactly when PCGS was picked. Fixed
by pulling `.cac-bean-group` out into its own row (`#cacBeanRow`), gated on
`grader` truthy alone (in `applyGraderDependentVisibility()`) — shown for
ANY grader, hidden only when Grader is blank (a raw/ungraded coin can't
carry a CAC bean). Browse Edit's own checkboxes were already unconditional
and needed no fix.

**2. "CAC Bean" caption added to the checkbox pair, both forms.** An
internal `.cac-bean-heading` span inside `.cac-bean-group` itself (not a
block-level `<label>` above it) — deliberately, so the same markup works
correctly whether the group is its own standalone row (Add Coin, forced by
item 1's fix) or still inline inside Browse Edit's `.cert-badge-row`
alongside the cert input and lookup-link icon, where a block-level label
would have misread as labeling the whole row rather than just the
checkboxes. Browse Edit's row structure is otherwise completely untouched —
no structural symmetry was required between the two forms, only the visible
caption.

**3. CACBean now read-only in Browse detail's Overview — a deliberate
reversal of the earlier "edit-surface only" scope call, not an oversight.**
`overviewRows.push(["CAC Bean", coin.cacBean])`, same pattern as Grade/
Designation just above it: a plain fact row, omitted entirely when blank,
scoped to individual coins only (a Set bundle has no CAC status of its own).

**4. `$` prefix extended to Purchase Price and Shipping Cost, every form
instance of both fields** — the same `.currency-input-row`/`.currency-prefix`
treatment Value already had. Ten fields across five forms (Browse Edit, Edit
Set, Wishlist, Add Coin, Add Set). **Visual only, no rounding** — unlike
Value, none of these ten fields are ever populated from a computed source
(confirmed in an earlier round and re-confirmed here with a direct test:
`roundToCents()`'s call sites are completely untouched by this item), so
they still populate verbatim, exactly as typed/stored.

**5. Composition wired into the Catalog grid-mini flip card.**
`renderBrowseGrid()` is a genuinely separate render path from
`applyFlipCorners()` (Browse detail/Spotlight), which is why it never
inherited Composition automatically when that was first built — confirmed
via source before assuming it was a shared path. A new BR span added to the
card markup, wired to the exact same `setCompositionCornerText()` /
`preciousMetalCompositionFor()` the full flip-frame uses — same rule
(precious metal only), same stacking mechanism, at whatever size cascades to
it (14px, the existing grid-mini corner font). The retired `.set-child-grid`
mini-flips (dead CSS, confirmed via grep — no JS references it, consistent
with CLAUDE.md's own "RETIRED" note for that surface) were correctly left
untouched.

**6. Composition font-size: collision-based, per-instance — supersedes the
blanket smaller size.** The prior round's `#browseDetailBR, #spotlightBR {
font-size: 22px; }` shrank EVERY coin's composition text uniformly,
regardless of whether that specific coin's actual value needed it. Removed
entirely. `setCompositionCornerText()` now: reads the corner's own natural
size fresh from computed style (27px full flip-frame, 14px Catalog
grid-mini — no context-specific hardcoding, one function serves both);
renders at that natural size first; measures `scrollWidth > clientWidth`
(the same measurement already used everywhere else in this corner system —
`compositionLabelCandidates`, `renderTypeDenomCorner`'s shortening — per
Ray's explicit confirmation this is what "per-instance overflow" meant, not
new BL-vs-BR box-overlap machinery); and only if it doesn't fit, steps down
through `COMPOSITION_SHRINK_STEPS = [1, 0.82, 0.67]` (fractions of the
natural size), re-rendering and re-measuring at each step, stopping the
moment it fits.
- **Real, measured result, not assumed: every realistic single-metal
  composition now fits at the FULL natural size once stacked** — the
  two-line layout from the prior round already solved the width problem for
  the common case; the blanket 22px shrink was penalizing legibility for
  coins that never needed it. Verified directly: "90% Silver", ".9995 Fine
  Palladium", "99.95% Platinum", and "40% Silver" all render at 27px with no
  shrink applied.
- **A genuine side effect, also measured**: the bimetallic single-line
  fallback's own previously-documented "~20px overflow, known accepted gap"
  (from the composition-restack round) is now CLOSED for the demonstrated
  case — "50% Gold, 50% Silver" fits at 18.09px (the 67% step) on the real
  flip-frame. This mechanism was built for item 6, not for that case
  specifically, but resolves it as a side effect. Only a genuinely extreme
  two-metal string (long alloy names on both sides) can still outrun the
  smallest step — confirmed directly by forcing one; it degrades to the
  smallest step and stops, no infinite loop, same "known, accepted gap for
  an extreme case" posture as everywhere else in this file.
- **`el.style.fontSize` is cleared FIRST**, before measuring the natural
  size — `browseDetailBR`/`spotlightBR`/each Catalog card's own BR span are
  real DOM elements reused across many different coins as Ray browses/
  flips, so a previous coin's shrink must never leak into the next coin's
  render or its "natural size" measurement. Verified directly: rendering an
  extreme value then a short one back-to-back on the same reused element
  returns cleanly to full size for the second coin.

**Verified headless — both existing suites extended, not forked**:
`tests/verify_cacbean_and_value_rounding.js` (50 assertions, was 38) gained
items 1-4's coverage — the real bug repro (visible for PCGS specifically,
still hidden with no grader, still visible for NGC), the caption on both
forms, the Overview row for Gold/Green/blank-omitted, and all ten currency
fields wrapped with a verified-verbatim (non-rounded) populate. One real
test-ordering bug was found and fixed while writing this: the "blank
CACBean" Overview check originally reused AY-00002, which an EARLIER
assertion in the same suite (session-only save path) had already mutated to
`cacBean:"Gold"` via `applyEditsToRecord()` — switched to AY-00004
(untouched anywhere else in the file). `tests/verify_composition.js` (88
assertions, was 79) gained items 5-6 — the Catalog grid-mini BR span
existing and stacking a silver coin's composition correctly while staying
empty for clad, and the full collision-based-sizing mechanism: natural-size-
by-default across every realistic value, genuine per-instance shrink for an
extreme value, correct reset on a reused element, and the mini-card's own
14px natural size confirmed unaffected by any full-flip-frame-specific
logic. Both new mechanisms (item 1's visibility fix, item 6's shrink loop)
have verified negative controls — reintroducing the old PCGS-hiding
condition fails the exact repro assertion; neutering the shrink loop fails
the two assertions that depend on it. 488 assertions across 13 suites, zero
failures, zero page errors. Screenshots reviewed at phone width for every
new UI piece (Add Coin's CAC row under PCGS, Browse Edit's captioned inline
group, the Overview CAC Bean row, Browse Edit's $-prefixed Purchase Details,
the Catalog grid showing "90% / Silver" on several cards, and Add Set's own
$-prefixed Purchase Details drill-down) — no overflow, no collision.
- **Not verified: any real device, any real OneDrive session.** Same
  standing caveat as every round on this branch.

**Item 7 — reverse-flip on a saved coin: investigated, NOT a code bug, no
fix built.** Repro was AY-00001, Browse detail/Spotlight, four consecutive
flip captures all showing the same content. Driven directly and logged:
`browseDetailSide`/`spotlightSide` genuinely alternate every toggle, the
`.reverse-face` CSS class genuinely toggles, and the disc's radial-gradient
highlight genuinely shifts (`circle at 35% 30%` obverse vs `circle at 65%
30%` reverse) — the state machine and its wiring both work exactly as
coded. Two things combine to make it look like nothing happens: (a)
`applyFlipCorners()` takes no side parameter and renders once, unconditionally
— by design, per this file's own "corner labels stay the same on both faces
since they describe the coin, not which face is showing"; (b) since no coin
in this mockup has a real captured photo, the ONLY visual difference between
faces is that gradient shift, which is genuinely subtle and easy to read as
"no change" in a screenshot comparison. Reported back as a real, working
mechanism producing a UX gap worth a future decision, not a bug — no fix
proposed or built, per the explicit "ask, don't guess" instruction for this
item.

**Item 8 — Mint Mark "— none (Other) —": BUILT.** Was flagged STILL OPEN,
blocked on confirming `DB_Coins.Mint` was populated/reliable enough on
blank-MintMark rows to disambiguate on — Ray confirmed via Copilot that all
236 real blank-MintMark rows now carry a value, unblocking the real
disambiguation-picker path (not the plain fallback). See "Mint Mark 'None
(Other)': real DB_Coins.Mint disambiguation" below for the full build.

### TR corner (type/series name): graceful degradation, not destructive truncation (BUILT, same branch, still held)
Real bug: `renderTypeDenomCorner()`'s overflow fallback used to shorten an
overlong type name to its LAST WORD when it didn't fit on one line —
reasonable when Description values were short place/series names, but wrong
for a real per-design identity with fixed suffix text attached. Worst case,
confirmed real data: **"Martha Washington First Spouse Gold $10"** doesn't
end in any `DENOM_NAME_SUFFIXES` word (`"$10"` isn't one), so nothing
strips, it overflows, and the old fallback reduced it to literally `"$10"`
— total loss of which spouse the coin actually is.

- **Fix is a genuine two-tier fallback, shrink first, wrap only as the last
  resort — measured into that order, not guessed.** `renderTypeDenomCorner()`
  now: (1) runs the type+denom pair through `shrinkCornerToFit()` — the same
  collision-based per-instance mechanism Composition's BR corner already
  uses (see above), generalized out of `setCompositionCornerText()` into a
  shared helper (`CORNER_SHRINK_STEPS = [1, 0.82, 0.67]`); (2) only if the
  type line STILL overflows at the smallest shrink step does it fall to a
  new `wrapTextToTwoLines(text, measureEl)` — a real, measured greedy word
  wrap (grows line 1 word-by-word against `scrollWidth`/`clientWidth`, never
  splits a single word, never guesses from a character count) — producing a
  genuine 3-line corner (two type lines + the denom code) via the existing
  `renderCornerLines()`/`.corner-line` stacking mechanism TL already uses.
- **The order was arrived at by measurement, not assumption, after the
  first version got it backwards.** A first pass tried wrap-before-shrink
  (attempt the two-line wrap at full size, shrink only if that still didn't
  fit) — direct geometry measurement caught that this made the ORIGINAL
  motivating case ("Lincoln Memorial", which a small shrink alone fully
  resolves) grow to 3 unshrunk lines instead of shrinking to 2, measured
  28px TALLER for no reason — unnecessary vertical creep toward the coin
  disc, exactly the risk this corner system has fought before (see the
  "Coin-flip corner labels" clipping history above). Rebuilt shrink-first;
  re-measured to confirm "Lincoln Memorial" now resolves via the 82% shrink
  step alone, 2 lines, height at or below the untouched baseline.
- **Real-data verification, both named worst cases:**
  "Martha Washington First Spouse Gold $10" (no suffix strips, 401px
  unclamped against a 139px box) now wraps to `["Martha Washington", "First
  Spouse Gold $10"]` + the `"$10"` denom line, shrunk to the smallest step,
  full identity intact, fits with no overflow. "Washington Crossing the
  Delaware Quarter" (suffix `"Quarter"` correctly stripped by
  `seriesLabel()`, but the remaining "Washington Crossing the Delaware"
  still overflows on its own, 326px) wraps identically rather than
  collapsing to one trailing word. Both landed at the same 3-line, same
  shrink-step outcome — confirmed via screenshot, not just measurement, on
  the real flip-card UI (1889-CC obverse, "Martha Washington" / "First
  Spouse Gold $10" / "$10" all fully legible, no truncation, no clipping).
- **Denom rides along on whatever line count results** — it never wraps or
  shrinks independently of the type line(s) it's stacked with, same rule
  the original design already followed.
- **Every stale code comment referencing the old last-word mechanism was
  found and corrected** (`grep`'d, not left to drift) — the Catalog
  grid-mini `.flip-label` CSS comment (×2 locations), the historical
  "Medal" `DENOM_NAME_SUFFIXES` note, the Rolls corner-treatment comment
  (its underlying reasoning for excluding Rolls still holds independently
  of the old garbling behavior it originally cited), and
  `renderBrowseGrid()`'s own comment.
- Verified headless — 8 new assertions added to `tests/verify_composition.js`
  (block Q, 96 assertions in that suite now; 496 across all 13 suites, zero
  failures): the First Spouse case (full identity preserved across 3 wrapped
  lines, never truncated to `"$10"`, fits); the ATB/quarter case (suffix
  correctly stripped, remainder wraps rather than truncating to one word,
  fits); a regression guard confirming "Lincoln Memorial" still resolves via
  shrink ALONE (2 lines, not 3, no taller than the untouched baseline); and
  the untouched-baseline case ("Morgan Dollar" → `seriesLabel()` strips
  "Dollar" to "Morgan", always fit, stays at natural 27px, no shrink, no
  wrap). **Verified negative control**: temporarily reintroduced the exact
  old last-word-truncation behavior and confirmed all 4 new assertions fail
  with the exact reported symptom (`["$10","$10"]` for First Spouse), then
  restored the real fix and re-confirmed all pass — proves the new coverage
  actually catches this class of regression, not just documents intent.
- **Not verified: any real device.** Screenshots reviewed in this
  environment's headless Chromium only, same standing caveat as every round
  on this branch.

### Mint Mark "None (Other)": real DB_Coins.Mint disambiguation (BUILT, same branch, still held)
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
  BEFORE `refreshVarietyOptions()`/`checkDbCoinsMatch()`/`updateFlipLabels()`
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

### Reverse face gets real content; Sets lose the flip card entirely (BUILT, same branch, still held)
Two related fixes to the saved-coin flip card (Spotlight + Browse detail,
`applyFlipCorners()`), following the Option 3 design exploration above.

**1. Reverse face now has its own distinct corners.** Real bug, confirmed
by reading the code before fixing it: `applyFlipCorners()` wrote the same
TL/TR/BL/BR regardless of which face was showing, and — worse, found while
tracing the render path — Browse detail's own flip toggle
(`toggleBrowseDetailSide()`) never even re-invoked it at all, only the disc
image/gradient. Spotlight already re-called `applyFlipCorners()` every
auto-cycle, so it genuinely showed identical corners both faces, as
originally reported; Browse detail was actually worse — frozen on whichever
corners were set at open, forever, regardless of flips.
- **`applyFlipCorners(prefix, coin, side)` now takes a side** (defaults to
  `"obverse"`); `side === "reverse"` branches to a completely separate
  function, `applyReverseFlipCorners()`, before any obverse-only rendering
  runs. Both real callers now pass their own current side
  (`renderSpotlight()` → `spotlightSide`; `showBrowseDetail()`'s initial
  call → the freshly-reset `"obverse"`), and `toggleBrowseDetailSide()` now
  ALSO calls `applyFlipCorners()` after flipping — the fix for the real
  mechanical bug above, not just new content.
- **No obverse identity content is repeated on reverse** (confirmed,
  overturning this session's own earlier exploration-round proposal, which
  had kept Year-Mint at TL as an "orientation anchor"): the coin's own name
  is already the page's own title above the flip card, same reasoning
  Rolls' own TR-corner exception already relies on.
- **Final reverse corner map**: TL = the Obverse-side half of a parsed
  Error split, or the WHOLE Error string when it doesn't parse cleanly —
  blank if `coin.error` is blank. TR = unused, always. BL = the
  Reverse-side half of a split — blank when TL already carries the whole
  unparsed string, blank when there's no error at all. BR = Cost, stacked
  "Cost" / "$N" (same two-line `renderCornerLines()` stacking Composition's
  own BR corner already uses) — blank when `coin.cost` is falsy. **Value is
  deliberately NOT shown** — it's already always-visible in Browse detail's
  Overview accordion (open by default); Cost has no other visible home on a
  saved coin's screen until Purchase Details is expanded, so the flip card
  is the more useful place for it. **A coin with neither Cost nor Error
  renders a completely blank reverse — confirmed intentional, not a bug to
  guard against.**
- **`splitErrorBySide(text)`** — the informal "Obv. X, Rev. Y" dealer
  convention (there's no official industry standard for two different
  errors on two different sides: PCGS/NGC's own DDO/DDR-style codes already
  bake the side into the single-error case, but nothing covers this one).
  Forgiving on wording (`Obv`/`Obverse`/`Obv.`, optional colon) and
  separator (comma or semicolon); Obv-before-Rev order only (confirmed —
  no Rev-first branch). Requires BOTH halves present; anything else — a
  single unprefixed error, a bare abbreviation like DDO/DDR, only one side
  prefixed, genuinely unstructured text — returns `null` so the caller
  falls back to showing the whole string, unmangled, never guessing.
  **Each captured half keeps its own "Obv."/"Rev." prefix verbatim, not
  stripped** — a real design correction made while building, not part of
  the original mockup: TL and BL are stacked on the same (left) edge now,
  not the top-row left/right pairing the exploration-round screenshots
  used, so there's no positional cue left saying which corner is which
  side. The prefix itself is what still says so at a glance.
- **`renderErrorCornerText(el, text, allowWide)`** — the same "shrink first,
  wrap only as a last resort" graceful degradation `renderTypeDenomCorner()`
  established for TR, reused rather than reinvented. `allowWide` (TL on the
  reverse face only) toggles a new scoped `.corner-wide` CSS class
  (`max-width: 90%`, up from the standard 50%) — TL is allowed to use TR's
  own horizontal territory before ever shrinking, since TR carries nothing
  on this face; every other corner stays at the standard width. **Real,
  measured finding from the exploration round carried through into the
  build**: even the "clean split" example (`"Obv. Die Polish Lines"` alone)
  measured 192px against the old 139px (50%) box — already overflowing
  before any of this — confirming the wide treatment isn't optional
  polish, it's required for realistic Error text at any box width.
- **Real bug caught by the committed suite itself, not by inspection**: TL
  is a persistent DOM element shared between the reverse render (which can
  add `.corner-wide`) and the obverse render (which never did anything
  about that class) — flipping reverse → obverse left the obverse's own TL
  silently widened, a leak from one face's render into the other's. Fixed
  by having the obverse path explicitly `classList.remove("corner-wide")`
  on TL before rendering, unconditionally, regardless of whether it was
  already narrow. This is exactly the kind of bug this project's own
  "write real assertions, not just documentation of intent" discipline
  exists to catch — found because a genuine before/after/before flip
  sequence was asserted, not just a single-direction render.
- **The sr-only summary is face-aware too** — reverse gets its own text
  (the Error split/fallback plus Cost, tagged "reverse" at the end) instead
  of the obverse's grade/composition/value summary, so a screen reader
  isn't left with stale obverse-face text once the visible corners have
  changed.
- **`coin.error` is new plumbing** — `mapWorkbookRowToCoin()` now reads
  `All.Error` (it never did before this), and two `FAKE_COINS` rows were
  seeded for exercisability: AY-00001 (`"Obv. Die Polish Lines, Rev. Die
  Crack"`, the clean-split case) and AY-00003 (`"Off-Center Strike, approx.
  5%"`, the unparseable-fallback case). Every other row stays sparse/blank,
  same convention as every other optional field in this mockup.
- **Correction to this session's own exploration-round speculation**: that
  round guessed closing this would also close ParkingLot Row 6 (BL's own
  lack of overflow protection) "as a byproduct." **That was wrong, and is
  corrected here rather than silently carried forward.** Row 6 is
  specifically about the OBVERSE's BL corner (Grade+Designation), which
  this task never touches — obverse corners are completely unchanged.
  BL/TL on the REVERSE face do get real shrink/wrap protection now, but
  that's the same DOM element at a DIFFERENT time showing DIFFERENT
  content; it does nothing for the obverse's own Grade+Designation
  overflow risk. **Row 6 remains open, unaffected by this pass.**

**2. A Set's own detail view is a plain static image — no flip card at
all.** `showBrowseDetail()` now branches on `isSetRow(coin)` before doing
any flip-related work:
- **Reuses the SAME `#browseDetailFlipFrame`/`#browseDetailDisc` elements**
  rather than building a parallel element — sizing and the existing
  own-photo/reference-image/placeholder priority chain in
  `applyDiscContent()` stay byte-identical to every other coin, since
  `browseDetailSide` is simply fixed at `"obverse"` and never toggled for a
  Set. This already resolves correctly to the Set's own real whole-set/OGP
  photo when one exists (`setFlipPhotoUrl()`, built in an earlier pass), or
  the existing generic placeholder when it doesn't — no new photo logic
  needed.
- **All four corner spans are explicitly cleared** (`classList.remove
  ("corner-wide")` + blanked, matching the same defensive pattern the
  reverse-face helpers use) rather than relying on `applyFlipCorners()`
  simply not being called — a persistent-element leak guard, same class of
  bug the `.corner-wide` fix above just caught. The sr-only span is
  cleared too, and the combined-photo badge is defensively hidden (a Set's
  `id` is never realistically in `COMBINED_PHOTO_COIN_IDS`, but this stays
  correct regardless of a stale prior render).
- **No tap/swipe/click response** — `toggleBrowseDetailSide()` now
  early-returns when `!currentBrowseCoin || isSetRow(currentBrowseCoin)`,
  so the frame's already-wired click/touch listeners genuinely do nothing
  for a Set (verified via a real dispatched click event, not just by
  calling the toggle function directly).
- **Both childless and multi-child Sets are in scope, confirmed
  identical** — verified against AY-00018 (childless) and AY-00022 (3 real
  children).
- **Individual coins are completely untouched**, including a Set's own
  children reached via the "Coins in this Set" accordion — `setChildrenFor()`
  returns ordinary coin-shaped rows (a real `denom`, never `"Multiple"`),
  so `isSetRow()` is false for every child and the normal flip path applies
  unchanged. Verified directly, not just asserted by construction.
- **Spotlight was checked, not assumed safe**: `spotlightCoins` is
  hardcoded to `FAKE_COINS.slice(0, 5)` — a fixed array literal, never
  wired to live/filtered data — and none of the first five rows is a Set.
  **Confirmed coins-only by construction, not by convention**; no guard was
  added there, consistent with this project's standing "don't build ahead
  of a scenario that can't currently occur" discipline (same posture as
  the DB_Coins scope rule, ANACS/ICG/CAC research). If `spotlightCoins` is
  ever wired to a live/filtered source that could include a Set, this
  needs revisiting.
- **A real side effect, confirmed rather than just claimed**: this
  eliminates the long-name corner-fitting problem for Sets entirely, since
  Set names (often the longest in the catalog) never reach any corner-
  rendering code any more — there's nothing left to fit.

**Verified headless — new committed suite
`tests/verify_reverse_face_and_set_flip.js` (38 assertions), all passing;
561 across all 15 suites, zero failures.** Covers: `splitErrorBySide()` in
isolation (every forgiving wording variant, every case that must return
null including reversed order); obverse corners completely unaffected even
for a coin carrying Error+Cost data; the clean-split reverse render
(prefix kept, TR unused, BR stacked, TL genuinely fits its widened box —
real `scrollWidth`/`clientWidth` measurement, not just "doesn't look
clipped"); the unstructured fallback (whole string in TL, BL blank); Error
with no Cost and Cost with no Error, independently; the fully-blank
reverse case; flipping reverse → obverse → confirming the real leak bug
above, both that obverse content is restored AND `.corner-wide` is
cleared; Spotlight getting the same reverse-specific content Browse detail
does; the sr-only summary differing correctly per face;
`mapWorkbookRowToCoin()` reading the real `Error` column; a childless AND
a multi-child Set both showing zero corner text with the badge/SR
defensively cleared; a real dispatched click on a Set's frame confirmed to
do nothing; an ordinary coin's detail view confirmed unaffected in both
directions; a Set's own children confirmed to never be `isSetRow()`
themselves; and a nav/overflow smoke check. **Verified negative control**:
temporarily removed the TR-clearing line and over-widened the split regex
to accept reversed order — 7 assertions failed with exactly the wrong-
content symptoms, then both were restored and every assertion re-confirmed
passing.
- **Not verified: any real device.** Screenshots reviewed in this
  environment's headless Chromium at both required viewports (a tablet
  geometry spot-check confirmed the same TL fit with zero page overflow) —
  same standing caveat as every round on this branch.

### Add Coin Phase 2 + live-device retest batch (BUILT, same branch, still held)
The first real-device pass this branch has had. CAC Bean, Mint Mark "None
(Other)" and the reverse-face flip content all came back clean. Seven items
came out of it; all seven are built here.

**1. THE CRITICAL ONE — Add Coin's write path dead-ended after hand-off.**
Ray built a coin, saved to Staging, marked it Ready, and found nothing
further to do — the coin sat in "Awaiting Copilot Research" even though its
CoinID had resolved cleanly. Confirmed by reading the code rather than
guessing: `markCoinDraftReady()` set a status and rewrote the draft JSON,
full stop. Its own comment said so outright ("PHASE 1 INTERIM — deliberately
does NOT touch the All sheet"). **No coin, matched or not, had any path into
All**, and match status had never been consulted at that point. The Graph
client had no append-row primitive at all.

- **`addTableRow()` — the one genuinely new primitive.** Appends a
  GENUINELY BLANK row. Graph's `rows/add` does accept a values array and
  using it is the obvious-looking approach; it is also wrong here, because
  that array must supply a value for every column **including the two live
  formula columns** (Total at U, SpotValue at Z) — the exact
  fill-every-cell hazard that cost this workbook all 1,084 of its formula
  cells once. Appending blank lets Excel fill calculated columns from the
  table's own `calculatedColumnFormula`, and every real value then lands
  through the existing allow-list-filtered `saveCoinRowToWorkbook()` with
  no new write surface. **Accepted, deliberate tradeoff: not atomic.** A
  blank add followed by a failed PATCH leaves an orphan row — visible,
  recoverable, and carrying a blank `Reviewed`; a clobbered formula would
  be silent and catastrophic.
- **`writeNewRowKeyCells()` (Q1, confirmed as the permanent mechanism).**
  CollectionID and CoinID are on `ALL_NEVER_WRITE_COLUMNS`, correctly, for
  EDITING. A newly CREATED row is the one genuine exception. Rather than
  loosen the allow-list — which would weaken the "an unlisted column has no
  code path to a general PATCH" guarantee every other write rests on — this
  follows `writeCoinIdCell()`'s precedent: a separate, narrow,
  explicitly-audited path that can write nothing but those two columns.
  **`ALL_NEVER_WRITE_COLUMNS` is untouched.**
- **`createAllSheetRow()` re-resolves by CollectionID** before a single
  data value is written, rather than trusting arithmetic on Graph's
  data-body index — rule 1 of this layer is "a row is located by
  CollectionID at write time, never by a remembered or derived position",
  and this honours it at creation too.
- **`saveCoinRowToWorkbook()` gained `opts.gate`** so Add Coin's own flag
  authorizes its write. Hard-wiring it to `browseEditWriteEnabled()` would
  have meant Add Coin's promote silently requiring Browse Edit's flag —
  exactly the coupling this file's standing rule forbids.
- **Category, Finish and CACBean added to `ALL_WRITABLE_COLUMNS` (Q2,
  confirmed).** All three were captured on the draft carrying a standing
  "needs an allow-list entry before Phase 2" note; without them promotion
  would silently drop three real captured values. **Confirmed side effect,
  accepted deliberately: they are now editable in Browse Edit too.** Finish
  also moved OUT of `ALL_CONTEXT_COLUMNS`, since listing it in both would
  read the same column twice.
- **KNOWN GAP, flagged rather than silently widened: `Error` is still not
  written.** The draft captures `errorDesc`, All has a real Error column,
  and item 5 below makes it visible on Overview — but CLAUDE.md records
  Error as "entry-time only, never persisted", and Q2 named exactly three
  columns. Promotion therefore drops it. One line in
  `ALL_WRITABLE_COLUMNS` plus one in `coinDraftToAllValues()` if wanted;
  deliberately not taken unilaterally.

**Q4's model, implemented as Ray specified** (his correction to my proposed
"clean match skips Staging" boundary): Staging is a genuine working area for
EVERY coin regardless of match status.
- **No new status enum and no migration** — where a READY draft is listed
  derives from whether it has a CoinID. READY + CoinID stays in **Staging**
  with **Promote** offered right there (and in Staging Review, where Mark
  ready was pressed). READY without one moves to **Research** with
  **Re-check / Force Add / Dismiss**.
- **Force Add** writes the coin with CoinID and SetID genuinely blank, sets
  `forceAdded`, and **deliberately keeps the card** in Research as "written
  to the All sheet with no CoinID" until Re-check resolves it or the user
  Dismisses.
- **Dismiss requires a reason**, on the same reasoning `promptDocketDismiss()`
  already enforces, and sets status PROMOTED (the row genuinely IS on the
  sheet) with the reason kept on the draft as the audit trail.
- **Two deliberate divergences, confirmed with Ray, recorded so neither
  looks like an oversight later**: the app now sets `PROMOTED` ITSELF for
  coins (the Set-side rule that only external reconciliation may set it
  exists because the app never wrote a Set's row — here the app IS what
  wrote it), and **a force-added row is a real, unlinked All row** —
  visible in Catalog, counted in Ledger — until Re-check closes the gap.

**Q4.1 — attaching a CoinID to an already-written row: the mechanism
already existed.** `applyDocketResolution()` has done exactly this since the
Docket work: `findAllSheetRowNumber()` then `writeCoinIdCell()`. The gap was
reach, not capability — it was wired only to Docket **queue entries**, while
the coin-draft Re-check path wrote the draft JSON alone (correct, until Force
Add made a row exist). `applyCoinDraftMatch()` now also writes the cell when
`allRowWritten` is set, reusing that same audited path — no new write
surface, and no re-entry of the coin's data.

**Q4.2 — two data models, one already-shared renderer.** Worth knowing
before touching this area again: the Research section is fed by three
independent sources. A "no DB_Coins match" card like "1943-S Lincoln Wheat
Steel" is a **Docket queue entry** (`_Docket/docket.json`, keyed `entryId`,
identity fields only, can originate from Browse Edit's re-link as well as
Add Coin). A per-coin "Handed Off" card is a **coin draft**
(`Staging/{ID}/coin.json`, keyed `collectionID`, carrying the whole capture
— photos, cost, grade, cert). Different files, different keys, different
lifecycles. **`appendDocketRows()` is already generic though**, taking
per-row callbacks, so Promote/Force Add were two more optional callbacks
plus two buttons — the records need reconciling, the card rendering does
not. Note also that the per-coin Handed Off card previously had **neither**
Re-check nor Dismiss (Re-check lived on the per-coin *Draft* row and on the
Docket-entry card; Dismiss only on the latter), so this added four actions
to it, not two.

**Q3 — photo relocation is fully app-driven**, confirmed by reading
`movePromotedSetFiles()`: `getItemMeta` → `getFileBytes` → `uploadBytes` →
`getItemMeta` (verify) → `deleteItem`, all the app's own Graph calls, with a
failed or unverifiable copy always leaving the source intact.
`plannedCoinPromotionMoves()`/`movePromotedCoinFiles()` mirror it exactly.
One refinement over the Set path: because the app itself promotes a coin, the
move runs **immediately after the write** rather than only at launch;
`processPromotedCoinDrafts()` still runs at launch to resume anything that
failed or was interrupted.

**2. Sets: the flip-card removal was genuinely incomplete.** The prior pass
cleared the corner TEXT and neutered the flip gesture but left
`#browseDetailFlipFrame` and its interactive `.coin-disc` rendering — Ray was
right that this wasn't the removal that was asked for. The frame is now
hidden outright and a genuinely separate `#browseDetailSetPhoto` element
takes its place: square, static, no interaction, no corner labels, showing
the real whole-set/OGP photo via `setFlipPhotoUrl()`'s existing priority or a
plain 📦 placeholder. Individual coins — including a Set's own children
reached through "Coins in this Set" — are untouched.
- **Year now rides in the page title** (`detailTitleText()`): "1957 United
  States Proof Set", per Ray's Q5 correction. Skipped when the name already
  starts with the year, and for a Roll's literal `"Various"`.
- **Edit Set gained a "Link a coin to this Set" accordion** (Q6:
  session-only). Candidates are owned coins that are neither Sets nor
  already claimed by one; linking mutates the same in-memory
  `FAKE_SET_CHILDREN` model the read side uses, so it round-trips visibly
  everywhere. **Deliberately not persisted**: real linkage is
  `All.OriginSetID` on the CHILD's row, and OriginSetID is on
  `ALL_NEVER_WRITE_COLUMNS` — a second never-write exception on a different
  row than the one being edited, held for its own later pass. "Back"
  collapses the control and returns to the plain list.

**3. Long-name corner text overlapping the coin — root cause was that
nothing ever checked.** Reproduced against the reported AY-00463-B and it
was worse than reported: BOTH the wrapped second line and the third line
intersected the disc (91px and 72px from its centre against a 105px radius).
The fit test only ever asked "does the text fit its own box"; the box is
anchored 10px from the frame corner and grows DOWNWARD as lines are added,
straight into the disc's band, and no amount of box-fitting can see that. So
this was a **predicate** fix, not the tolerance/spacing nudge it looked
like:
- **`cornerClearsDisc()`** measures each rendered line against the disc's
  actual circle (nearest-point-to-centre against the radius — a bounding-box
  test would report the corners as hits exactly where corner labels live),
  and `cornerFits()` now requires both.
- **`.corner-line` boxes hug their own text** (`width: fit-content`) so the
  measurement is honest — a short line stacked under a long one used to
  inherit the long one's width and report reaching much further across the
  card than its ink did. **`max-width: 100%` is not optional there**: these
  lines are `nowrap`, which makes min-content equal max-content, so
  `fit-content` resolves to max-content and overflows the parent instead of
  being clamped — without the cap the overflow test that drives wrapping
  silently never fired.
- **The two-line wrap is now balanced, not greedy.** Greedy turned the First
  Spouse name into "Martha" / "Washington First Spouse Gold $10", whose
  second line was nearly as wide as the unwrapped original, so wrapping
  bought almost nothing. Choosing the split that minimises the WIDER line is
  what actually earns font size back.
- **Shrink prefers a comfortable floor before wrapping** (`CORNER_COMFORTABLE_FRACTION`
  = 0.82), then re-shrinks the wrapped layout from natural size, then falls
  back to the full range on a single line for a one-word value that has
  nothing to wrap. Two extra shrink steps were added (0.56, 0.48) because
  with clearance enforced a three-line corner genuinely needs them.
- Measured outcomes: "Morgan" untouched at 27px; "Lincoln Memorial" still
  resolves by shrink ALONE at 22.14px without gaining a third line (last
  round's regression guard still holds); the ATB quarter wraps at 15.12px;
  First Spouse wraps at 12.96px — all four now clearing the coin.
- **A real side effect worth knowing**: the BR composition corner now
  shrinks for "99.95% Platinum", because measurement showed its first line
  sat 94.1px from the disc centre against a 105px radius at full size — it
  was genuinely overlapping and nothing could see it. A prior assertion that
  claimed "no shrink applied" was asserting that bug.

**4. Dimes + Silver hiding a real silver dime — NOT a stale cache.** The
filter and the flip card read two DIFFERENT joins: `metalCategory` comes
from a four-hop chain (`All.CoinID → DB_Coins.CoinID → MetalContentType →
Lookup_MetalContent.CoinType → MetalCategory`), `composition` from a two-hop
one (`All.CoinID → DB_Coins.Composition`). The reported coin had Composition
populated and MetalContentType blank, so the filter saw a blank category
(bucketed "Other") while the card saw real silver. The workbook-side fix is
to populate MetalContentType; the app should not silently disagree with
itself meanwhile, so **`metalCategoryFor()` now derives from the composition
string** via `metalCategoryFromComposition()` when the primary join yields
nothing. Compound terms are tested first so "Copper-Nickel Clad" lands on
Clad, not Copper; Bronze/Brass bucket under Copper exactly as
Lookup_MetalContent does. **Also fixed the genuine staleness half**:
`refreshLiveCoinsAfterWrite()` clears the once-per-session memo so a
just-promoted coin is immediately browsable and filterable without a reload.

**5-7. The three smaller items.**
- **Error on the Overview** — a plain fact row, coin-only, omitted when
  blank. It was previously reachable ONLY by flipping the card, so invisible
  to anyone who never did.
- **Purchase Details finally populates for real coins.** The Seller and
  Purchase Date rows already existed — they read `FAKE_COIN_DETAILS`, which
  is empty for every live coin, because `mapWorkbookRowToCoin()` never read
  `Seller_Link`, `Shipping` or `PurchaseDate` back even though Browse Edit
  has been able to WRITE all three since the write layer landed. The rows
  existed; the data never reached them. Now mapped (dates converted from
  Excel serials to ISO), with the coin's own values winning over the demo
  lookup.
- **Prev/next stepping at the detail level.** The list is captured at
  grid-render time (`browseStepIds`), so it is exactly what the user is
  looking at — same filters, same sort, same order — rather than re-derived
  later from filter state that an external Browse entry may since have
  reset. Stored by id, not object reference, since a live refresh rebuilds
  `LIVE_COINS` wholesale. A coin reached outside any list (a "Belongs to"
  chip) falls back to CollectionID order; a **Set child gets no arrows at
  all**, since it lives in its own nested lookup and stepping into an
  unrelated top-level coin would be a jump, not a step. Arrows hide at each
  end rather than wrapping.

**Verified headless — new committed suite
`tests/verify_phase2_and_retest_batch.js` (70 assertions); 633 across all 16
suites, zero failures.** Covers: the blank-row primitive and the untouched
formula cells through a full create-and-populate cycle; the allow-list/
never-write invariants; a clean-match promotion end to end with Add Coin's
own flag authorizing it while Browse Edit's is OFF; Promote refusing an
unmatched draft while writing nothing, and Force Add writing the same coin
with a genuinely blank CoinID; **Q4.1 end to end** — a force-added row
getting its CoinID from a later Re-check with nothing else disturbed;
Dismiss refusing a blank reason and keeping a real one; the photo move's
copy-verify-delete and its completion flag; total inertness with the flag
off; the Docket's Staging-vs-Research split by CoinID with the right actions
on each; both Set shapes losing the frame AND the disc while an ordinary
coin keeps both; the title's year rules; the session-only linking round trip
including its no-double-claim and no-Sets-as-children rules; all four
measured corner cases clearing the disc; the balanced wrap; the
composition-derived metal categories and the reported filter bug; the Error
row; the three newly-mapped purchase columns and the Total they produce; and
stepping through a filtered list, an unfiltered fallback, and a child's
correct absence of arrows.
**Verified negative control**: disc clearance removed from the fit
predicate, the composition-derived category removed, the Set frame restored,
and Promote's no-match guard disabled — 7 assertions failed with exactly the
reported symptoms (`clears: false` on both long-name cases, the metal filter
blind again, the Set frame back), then all four were restored and every
assertion re-confirmed.
- **`WRITE_TARGET` stays `"copy"` throughout — untouched.**
- **Not verified: any real device, and no real OneDrive session against the
  Phase 2 write.** This is a genuinely new write path (the first thing in
  this app that CREATES an All-sheet row) and needs a live run against
  `_Testing` before it is trusted.

## Quick-capture notes → ParkingLot
Floating capture button anywhere in the app (typed or phone dictation). Auto-captures
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

### Cabinet navigation redesign (BUILT, held on branch `claude/cabinet-navigation`, NOT merged — awaiting Ray's live-device review)
The entire persistent-nav model above is **retired** in favor of a
Dashboard-graphic-driven model. This is architectural/cross-cutting work, so
per the merge policy it's held on its branch until Ray's explicit go-ahead
(he wants to live-tune the wood tone / hardware color / handle style /
display-case shape together first). The old "Superseded: six-item side/bottom
nav" note above is now itself fully superseded — kept only for history.
- **No persistent sidebar/bottom nav anywhere** (mobile + desktop) — all of
  `.side-nav`/`.bottom-nav`/`.nav-btn`/`.topbar`/`.brand-*` markup and CSS
  removed, plus `NAV_ITEMS`/`buildNavButtons`. Navigation happens entirely
  through a new Dashboard **wood cabinet graphic**: a face-on display case up
  top (holding the existing Spotlight carousel, coin viewed portrait/face-on)
  over **seven drawers**, built by `initCabinet()` from `CABINET_DRAWERS` in
  fixed order: 1. **Catalog** (→ browse), 2. **Albums**, 3. **Sets**,
  4. **Wishlist**, 5. **Ledger** (→ stats), 6. **Acquisitions**, 7. **Docket**
  (→ needsdbcoins, carries the live count fob). Drawer labels are Caveat
  (handwritten, echoing the coin-flip labels); the count is a hanging
  brass **fob** (`.drawer-fob`, NOT a flat circular badge), reusing the
  existing `#needsAttentionBadge` element id so `renderNeedsAttentionHub()`'s
  count logic drives it unchanged — **but the text is now a plain number
  (`19`), not the old parenthesized `(19)`** (the fob reads as a physical tag).
  `updateDocketFob(count)` toggles the fob's `.hidden` by count.
- **Exactly two controls on every non-Dashboard screen** (`.nav-chrome`,
  sticky top): **Back** (`#navBackBtn`) = up one level, and **Return to
  Dashboard** (`#navHomeBtn`) = hard reset to the top. No long-press /
  quick-jump; max two taps to reach anything. Chrome is hidden only on the
  Dashboard (`navigate()` toggles `#navChrome.hidden` on `viewId ===
  "dashboard"`). In-view `.back-link` buttons are hidden via CSS
  (`.back-link:not(#yearPickerBackBtn)`) — the chrome's Back delegates to
  them via `navBackHandler`; the year-picker widget's own back button stays.
- **Shallow up-one-level Back model, NOT a history stack** (Ray's Q2):
  `navBackHandler` is a mutable module-level fn ref, (re)set at every screen /
  sub-screen transition via `setNavBack()`. `navigate()` seeds it from
  `SECTION_BACK_TARGET` (addcoin/addset/batchreceipt → acquisitions;
  staging/inprogresssets → needsdbcoins; everything else → dashboard), and
  each `show*` sub-screen overrides it afterward (Browse detail → grid, album
  book → albums list, wishlist detail → grid, etc.). The Spotlight
  click-through and Albums filled-slot tap keep their per-origin
  `browseDetailBackHandler`.
- **Acquisitions is a 3-choice hub** (Q1) — new `view-acquisitions` with three
  `.acq-choice` rows (`#acqAddCoinBtn`/`#acqAddSetBtn`/`#acqBatchReceiptBtn`)
  → addcoin/addset/batchreceipt. The Sets-checklist empty-tile deep-link into
  Add Set stays as an additional path, unchanged.
- **Drawer tap plays a ~260ms open animation before navigating**
  (`.drawer.opening` / `@keyframes drawerOpen`), **respecting
  `prefers-reduced-motion: reduce`** (instant cut, no delay) — checked once in
  `initCabinet()`.
- **Browse's internal structure is completely untouched** — Coins/Rolls/Sets/
  Albums tabs, Coins default, all filters. `navigate("sets")` still just lands
  on `#view-browse` with the Sets tab active (no view element of its own).
- **Aesthetic is a deliberate FIRST PASS, not locked** — warm honey-oak wood
  (`.wood`, layered CSS gradients w/ `--grain-dir`, same no-image-assets craft
  as the Album leather texture), brass/copper drawer plates + finger-pulls
  (pull above the label), face-on glass case. Ray will live-tune wood tone,
  hardware color, handle style, and case shape together. **Needs a real-device
  check** (Samsung Internet): wood/brass rendering, drawer-animation feel +
  reduce-motion behavior, display-case shape. Verified headless only
  (`verify_cabinet_nav.js`, 41 assertions × normal + reduce-motion contexts +
  an instant-cut timing check — drawer order/labels/fob, chrome show/hide,
  all 7 routes, shallow Back per section + sub-screen, Return to Dashboard,
  Acquisitions hub → 3 destinations + back, Spotlight click-through, Docket
  fob count/visibility). All prior regression suites re-run clean (the
  `(N)`→`N` fob change required updating `verify_badge.js`/`verify_regression.js`
  expectations, not an app fix).

**Refinement pass (BUILT, same branch, still held) — 13 polish items from
Ray's live phone/tablet review, no structural/routing changes:**
- **Wood darkened** a step further, closer to the deeper of his two
  reference photos (`--wood-hi/mid/lo` pulled down and desaturated a touch).
- **Rectangular grid artifacting on the drawer wood, fixed.** Root cause: the
  ray-fleck layer ran PERPENDICULAR to the grain-line layer, both hard-edged
  repeating-linear-gradients at similar periods, blended `multiply` — two
  perpendicular hard-edged patterns at comparable periods interference-beat
  into a visible crosshatch, and `multiply` darkened every crossing into a
  visible grid node. Fixed by softening the fleck layer to a smooth,
  low-opacity highlight-only pattern on a longer, non-matching period,
  blended `normal` instead of `multiply`; the cathedral-figure layer's
  stops were also switched from hard px-range steps to single-position
  stops so bands interpolate instead of snapping.
  - **Rely on `background-blend-mode: normal` here, not `multiply`, for any
    future wood-texture layer** — `multiply` against a perpendicular
    hard-edged pattern is exactly what produced the grid; a future addition
    that reintroduces multiply-blended perpendicular hard-edged layers will
    likely reproduce it.
- **Per-drawer wood variation is real now, not a panned copy of one tile** —
  the old fix only shifted `background-position` (same tile, different
  window onto it, so it still read as one repeated texture). Each of the 7
  drawers now gets its own `--wood-hi/mid/lo` tint plus (on most) a small
  `--grain-dir` angle offset via explicit `nth-child(1)`–`nth-child(7)`
  rules, so the stack reads as seven distinct boards.
- **Display case narrowed** (`.cabinet-case-glass { max-width: min(80%,
  260px); margin: 0 auto; }`) — reads as a distinct glazed window set into
  a wider wood face, not a pane stretched to the drawers' own width.
- **Spotlight carousel dots removed entirely** (HTML element, CSS rules, and
  the JS that built/toggled them) — auto-rotate only, no manual dot
  navigation, per Ray's call. The manual flip button (⟲) is unrelated and
  stays — it's not a "dot," it's the existing tap-to-flip control.
- **Auto-flip rate slowed** 4000ms → 6500ms (`resetSpotlightTimer()`) — the
  old rate was too fast to actually read a coin's obverse before it flipped.
- **Corner-label text bumped** 25px → 27px, `max-width` widened 47% → 50%
  for headroom given the larger text. This corner has a real prior clipping
  history (see "Coin-flip corner labels" above) that was never reproduced
  in this environment — **flagged for Ray's own device confirmation**, not
  verified here beyond "renders without visible clipping in this sandbox."
- **Drawer label text bumped** 24px → 30px, color darkened `#3a2a10` →
  `#1c1203` with a paired highlight/shadow (`text-shadow`) for an engraved-
  label look — the old color read too close to the mid-brass plate tone on
  a real screen. **Plate itself grew** (`min-width` 150px → 168px, padding
  15px/18px/9px → 18px/22px/11px) to comfortably fit the larger text; it's
  a flex child sized by its own content plus these values, not a fixed box,
  so it grows automatically with the label.
- **Drawer open animation now actually travels** (`translateY(0)` →
  `translateY(13px)` in the `drawerOpen` keyframe) — the original only
  animated `box-shadow` with `transform: translateX(0)` at every keyframe,
  i.e. zero real motion, which is exactly why it barely read as "opening."
  Duration bumped 260ms → 320ms as a side effect of the travel actually
  needing time to read, not the primary fix; the JS `setTimeout` before
  `navigate()` fires was updated to match.
- **New closing animation** (`drawerClose` keyframe, the exact reverse
  travel/shadow) plays on the originating drawer whenever Back or Return to
  Dashboard lands back on the Dashboard from inside that drawer's own
  section — tracked via a new `lastDrawerView` module-level variable, set
  inside `navigate()` whenever it's called with a `CABINET_DRAWERS`-mapped
  viewId (direct) or a `SECTION_BACK_TARGET`-mapped child viewId (e.g.
  `addcoin` → `acquisitions`), and consumed/cleared inside `navigate()`'s
  own `"dashboard"` branch. Deep sub-navigation within a section (Browse
  detail, an Add Coin subview, etc.) never calls the top-level `navigate()`
  at all, so `lastDrawerView` naturally survives untouched all the way back
  out to whichever drawer was actually opened, however many in-section
  Back-taps it takes to get there. Respects `prefers-reduced-motion`
  exactly like the open animation — the JS checks it before ever adding the
  `.closing` class, so a reduced-motion session never sees the class at all
  (not just a CSS-suppressed animation on an added-but-inert class).
- **Docket fob's hanging ring** moved closer to the tag body (`top: -7px` →
  `top: -4px` on `.drawer-fob::before`, slightly smaller) — it read as
  floating detached above the tag rather than an integrated part of it.
- Verified headless: all 9 prior regression suites + `verify_cabinet_nav.js`
  re-run clean (no assertion changes needed — this pass was pure CSS/JS
  polish, no routing/structural change). The animation-travel and
  closing-animation logic were additionally spot-checked directly (mid-
  animation screenshot showing real drawer displacement + cast-shadow
  change; `lastDrawerView`/`.closing` class lifecycle asserted programmatically,
  including the sub-flow → parent-drawer mapping case). **Still needs Ray's
  real-device pass** — this round was reacting to his phone/tablet review,
  but the fixes themselves (wood grid, contrast, animation feel) were only
  re-verified in this environment's headless Chromium, not back on his S25.

**Second refinement pass (BUILT, same branch, still held) — 7 items, single
throughline: the cabinet read as a flat block with drawer-fronts painted on,
not a real piece of furniture with depth.**
- **Real cabinet frame added (`.cabinet-frame-inner`)** — `.cabinet` itself
  (already `.wood`-textured) is now padded on three sides (`padding: 15px
  15px 0` — both sides + top; bottom stays flush since `.cabinet-base`
  already reads as the plinth), and that raw padding IS the visible frame:
  vertical side stiles down both edges, a top rail above the display case,
  per the honey-oak reference photo. Everything else (case, drawers, base)
  now lives inside `.cabinet-frame-inner`, inset into that frame rather than
  spanning its outer edge-to-edge width. A groove shadow marks where the
  case/drawers meet the stiles — **applied directly to `.cabinet-case` and
  `.cabinet-drawers`, not to `.cabinet-frame-inner` itself** (a real bug
  caught before shipping: those two are the opaque, full-width elements
  that actually paint there — an inset shadow declared on the wrapper
  would sit behind its own children's backgrounds and never be visible at
  all, since block children span 100% of their parent by default).
- **Display case narrowing simplified, NOT doubled.** A previous pass had
  already narrowed `.cabinet-case-glass` on its own (`max-width: min(80%,
  260px)`) before this frame existed. Once the frame started contributing
  its own width reduction too, the two narrowing steps compounded on a
  ~360px-wide phone enough to shrink the flip-frame to ~215px — at which
  point the two top corner labels (a longer Type/Denom pair, e.g. "1889-CC"
  / "Morgan") visually collided into each other. **Caught via screenshot at
  360px, not just computed** — confirmed as a real regression this pass
  introduced, not a pre-existing gap. Fixed by treating the frame as what
  satisfies "case narrower than the full cabinet width" and pulling the
  glass's own separate narrowing back to a light touch on top of it
  (`max-width: 94%`, down from `min(80%, 260px)`) — re-verified at 360px
  with zero corner-label overflow and no horizontal page scroll, and the
  coin/carousel content itself was never resized either time.
- **Drawer separation is now real, not just a 1px line.** `.drawer` gets a
  4px `margin-bottom` (was a flush `border-bottom`) so the parent
  `.cabinet-drawers`' own background shows through as a visible gap between
  every drawer front. `.cabinet-drawers` sets its own notably darker
  `--wood-hi/mid/lo` (a recessed "housing" tone, darker than any individual
  drawer face's own tint) so that gap reads as a genuine shadowed recess
  behind lighter drawer fronts, not just a thin seam. `.drawer-face` also
  picked up a real outer drop shadow (`0 2px 4px rgba(0,0,0,0.45)`, on top
  of its existing inset grooves) now that it has a recess to actually cast
  it into, plus a subtle `border-radius: 2px` so each panel reads as a
  distinct physical box.
- **Open/close travel now plays against that same recess** — no new markup
  or literal 3D side panels; because the recess is already established at
  rest, a drawer sliding 13px down into (or out of) that dark gap during
  the existing open/close keyframes reads as pulling out of a real cavity
  rather than sliding across a flat surface. The keyframes also ramp in a
  side inset shadow at the open state (`inset 6px 0 8px -6px`/`inset -6px 0
  8px -6px rgba(0,0,0,0.4)`, absent at rest) as a further hint of the
  drawer's own side catching shadow as it pulls toward the viewer.
- **Animation easing switched from an ease-out-leaning curve
  (`cubic-bezier(0.22, 0.61, 0.36, 1)`) to a symmetric ease-in-out
  (`cubic-bezier(0.65, 0, 0.35, 1)`)** on both `drawerOpen` and
  `drawerClose` — durations (320ms/300ms) are unchanged, only the velocity
  shape; the old curve had real motion (per the first refinement pass) but
  still felt abrupt at the start.
- **Wood grain given irregular flow, not just tonal variation (which the
  first pass already covered).** A second grain-line `repeating-linear-
  gradient` layer runs at a shallow independent angle offset
  (`--grain-dir + 4deg`) and a different period than the first, so within
  a single drawer the lines gently cross rather than running perfectly
  parallel. Per-drawer `--grain-dir` offsets were also widened (±1–3deg,
  up from ±1–2deg) for more variety across the stack. Two small "knot"
  accents (a dark radial core with fading concentric rings, approximating
  growth rings) were added sparingly — only on drawers 3 and 6, as `::before`
  pseudo-elements layered behind the brass plate — since real quarter-sawn
  oak isn't covered in them; every drawer having one would read as a
  pattern, not wood. **Deliberately did NOT reach for an SVG turbulence/
  displacement filter for true curved grain** — that would be a real
  technique change from the established "layered CSS gradients only, same
  posture as the Album leather" approach, and this project's own history
  already flags SVG-filter-class effects as a cross-device rendering risk
  (Samsung Internet support can be flaky) that can't be verified from this
  environment. This pass is a CSS-gradient-only approximation; a true
  wavy-grain pass would be a deliberate follow-up decision, not a default.
- **Docket fob's hanging ring removed entirely** (not just repositioned —
  Ray's explicit call this round) and the badge itself moved from hanging
  above the plate's top-right corner to sitting beside the plate at roughly
  label height (`top: 58%; right: -10px; transform: translateY(-50%)`,
  down from `top: -13px; right: 12px`). Shape simplified from the teardrop/
  escutcheon (`border-radius: 15px.../20px...`) to a plain rounded badge
  (`border-radius: 8px`) now that there's no ring for it to visually hang
  from.
- **Real-device-check flags carried over from the first pass, both still
  open, neither resolved by anything in this round**: whether the drawer
  travel distance feels like enough in hand (now 13px, unchanged — the new
  recess/gap treatment should make the same distance read more
  convincingly as "pulling out," but the felt distance itself wasn't
  touched), and whether the 27px corner-label text is safe from the
  clipping issue that's bitten this corner before (unchanged this round;
  the 360px overlap bug found and fixed above was a DIFFERENT problem —
  two labels colliding with each other from a too-narrow frame — not the
  single-label edge-clipping history this flag refers to). Both need Ray's
  own S25/tablet confirmation; neither is reproducible from this
  environment.
- Verified headless: all 10 prior suites (9 regression + `verify_cabinet_nav.js`)
  re-run clean, no assertion changes needed. Additionally spot-checked
  directly: a mid-open-animation screenshot showing the drawer visibly
  displaced into the new recess with a deeper cast shadow; the 360px
  corner-label collision bug reproduced via screenshot, then re-verified
  fixed via both a `scrollWidth`/`clientWidth` overflow check (zero
  overflowing labels, was one before) and a follow-up screenshot; a
  360px-viewport horizontal-overflow check (`document.body.scrollWidth <=
  window.innerWidth`, holds both before and after the case-glass fix).

**Third refinement pass (BUILT, same branch, still held) — 6 items,
including one real structural change (display case decoupled from the
cabinet frame).**
- **Display case is now a genuinely separate object, not part of the
  frame.** Previously `.cabinet-case`/`.cabinet-case-glass` lived INSIDE
  `.cabinet`/`.cabinet-frame-inner` (the same frame the drawers sit in) —
  Ray's explicit call this round was that this is conceptually wrong: a
  display case resting on a cabinet's top surface is a separate piece of
  furniture, not a merged structural element. `.display-case`/
  `.display-case-glass` are now siblings of `.cabinet` in `.cabinet-stage`,
  positioned before it in source order with `margin: 0 auto -7px` (the
  negative bottom margin pulls it down to visually overlap/rest on
  `.cabinet-top-cap` rather than floating above it with a gap) and a higher
  paint order (via `position: relative` with no competing z-index on the
  cap) so it reads as sitting in front of/on top of the cap, not behind it.
  `.cabinet-frame-inner` was removed entirely — with the case gone, it had
  only one remaining child (`.cabinet-drawers`) and added nothing.
- **Real beveled top cap + base, each wider than the frame.** `.cabinet`
  itself is now narrower than the full stage (`max-width: 90%`) specifically
  so `.cabinet-top-cap` and `.cabinet-base-cap` — new standalone sibling
  elements, `max-width: 96%` — have visible room to protrude past its
  stiles on both sides, matching the reference cabinet photo's real
  lipped-top/protruding-base construction (previously `.cabinet-top`/
  `.cabinet-base` were the same width as the frame they sat inside, so nothing
  ever read as a distinct cap). This is the concrete case of "narrower
  drawers are an acceptable tradeoff for correct proportions" Ray
  pre-authorized this round.
- **A real regression, caught and fixed before shipping (not by Ray):**
  moving the display case out to its own object introduced a THIRD stacked
  padding layer (`.display-case` → `.display-case-glass` → `.spotlight`,
  where the previous nested-in-the-frame layout only had two:
  `.cabinet-case` → `.cabinet-case-glass`). On a 360px phone this compounded
  enough to shrink the flip-frame to ~157px and collide the two top corner
  labels again ("1889-CC" running into "Morgan") — caught via direct
  measurement (`getBoundingClientRect()` gap between the TL/TR corner
  boxes came back negative) plus a screenshot, not assumed. Fixed by
  trimming the redundant padding at all three layers (`.display-case`
  10px→8px, `.display-case-glass` 10px→8px, `.spotlight`'s horizontal
  padding 16px→4px — `.spotlight`'s own padding predates the dedicated
  case/glass wrapper and is now mostly redundant with theirs) and adding a
  `min-width: 256px` floor on `.display-case` itself as a hard backstop —
  re-verified at 360px with a positive 32px gap between the two corner
  boxes (was −14px) and zero page-level horizontal overflow.
- **Wood knots removed entirely** (`.drawer:nth-child(3)/(6) .drawer-face::before`
  and their radial-gradient rules deleted) — Ray's call that they read as a
  rendering flaw, not real wood. The second, independently-angled grain-line
  layer from the prior pass (the actual "irregular flow" mechanism) is
  unchanged and stays.
- **Brass placards shrunk to fit their text.** `.drawer-plate` padding
  `18px 22px 11px` → `10px 15px 6px`, `min-width` `168px` → `118px`,
  `max-width` `80%` → `78%`. Label font-size is unchanged (30px, from the
  first refinement pass — a real readability fix, not revisited).
- **Docket fob pushed further right**, now clearly separated from the
  (now-smaller) plate rather than touching/overlapping its edge —
  `right: -10px` → `right: -34px` on `.drawer-fob`. Verified via
  `getBoundingClientRect()` that the fob's right edge stays well inside the
  drawer's own bounds (no clipping) at 412px.
- **Open questions carried over from prior passes, still unresolved,
  still need Ray's own S25/tablet check** — nothing in this round touched
  either: (1) whether the 13px drawer-open travel distance feels like
  enough in hand; (2) whether the 27px corner-label text is safe from the
  single-label edge-clipping history that's bitten this corner before
  (distinct from the two-labels-colliding bug this round fixed).
- **New, this round**: the display case's visual "resting on the cap"
  effect (the −7px overlap + paint-order layering) hasn't been checked on
  a real device either — it's a CSS-only illusion (no real 3D), and while
  it reads correctly in this environment's headless Chromium at every
  viewport tested (360px/412px), whether it convincingly reads as "an
  object sitting on a surface" rather than "two shapes overlapping" is a
  genuinely subjective call worth Ray's own eyes.
- Verified headless: all 10 prior suites re-run clean, no assertion changes
  needed (this pass changed the DOM structure around the display case —
  `.cabinet-frame-inner` removed, `.cabinet-case`/`.cabinet-case-glass`
  renamed to `.display-case`/`.display-case-glass` and relocated — but
  `verify_cabinet_nav.js` and every other suite target IDs/behavior, not
  these specific class names, so nothing needed updating). Additionally
  spot-checked directly: the corner-label collision bug reproduced via
  `getBoundingClientRect()` measurement before the fix, re-verified fixed
  after; a fresh 412px full-dashboard screenshot confirms the display case
  reads as a distinct object sitting on the cap, with visible top-cap/
  base-cap protrusion past the drawer stiles on both sides.

**Fourth refinement pass (BUILT, same branch, still held) — 4 items,
including one real root-cause bug fix (not a cosmetic patch).**
- **Display case given real molded depth** — `.display-case` now carries
  four concentric inset box-shadow rings (alternating light/dark) that read
  as a carved step-molding profile, plus a `::before` brass pinstripe inset
  just past them, approximating the reference photo's molded frame/brass
  trim detail. Padding grew `8px 8px 13px` → `13px 13px 18px` to give the
  rings room to read clearly without crowding the glass. Explicitly NOT
  adopting that reference photo's downward-viewing angle — construction/
  detailing only, per Ray's own framing.
- **Placards are now one uniform fixed size** (`.drawer-plate { width:
  214px; }`, replacing the previous pass's `min-width`/`max-width` shrink-
  to-content approach) — sized to fit "Acquisitions" (the longest label)
  comfortably; shorter labels sit centered with real visible margin, not
  hugging their own text. This directly reverses the previous pass's
  per-plate sizing on Ray's explicit instruction — the two rounds wanted
  different things (that round: less empty margin around each label; this
  round: one consistent plate size across all seven), not a contradiction.
- **Top/bottom bevel now faceted, not a smooth slope** — `.cabinet-top-cap`/
  `.cabinet-base-cap` switched from a two-stop soft gradient to a 5-band
  hard-stop gradient (each band a flat color with a sharp edge to the
  next), reading as a stepped/carved molding profile rather than a simple
  rounded bevel. Heights grew slightly (20px→26px top, 18px→22px base) to
  give the extra bands room.
- **Root-caused the recurring dark grain band, not just patched around
  it.** Ray's report: a darker band appeared at the same relative spot
  (near the top) on 5 of 7 drawers, with only Catalog and Sets looking
  clean — his own suggested fixes were "make it rarer" or "vary its
  position." Direct visual diagnosis (a full-stack high-res screenshot of
  all seven drawers side by side) pointed at neither of the per-drawer
  background-position/grain-angle variables — those already varied
  per-drawer and didn't correlate with which drawers showed the band.
  The actual cause: `.drawer-face`'s box-shadow carried a third value,
  `inset 0 26px 30px rgba(0,0,0,0.10)`, applied IDENTICALLY to every
  drawer regardless of its own tone/phase — a large-blur positive-offset
  inset shadow that washes the top portion of a box dark by design. On
  drawers where this happened to compound with an already-darker base tone
  or grain phase, it read as an obvious repeating band; on Catalog/Sets it
  didn't stand out as much, which is why only those two looked "clean" —
  not because their own wood recipe was different, but because they had
  less to compound with. Removed entirely (from the resting state AND both
  keyframes' 0%/100% endpoints, so the animation doesn't flash a different
  shadow than the resting state) — the drawer-separation cue it was meant
  to add is already covered by the real 4px gap + darker recess housing
  from an earlier pass. Verified via a fresh full-stack screenshot: no
  drawer shows the band anymore, not just the previously-clean two.
- **Re-verified the 360px corner-label safety margin after this round's
  padding increases** (the display-case molding needed more room) — gap
  between the two top corner boxes: 32px → 22px (padding grew, floor
  stayed the same), still solidly positive, zero page overflow. Worth
  knowing this margin is shrinking round over round as the case gains
  detail — if a future pass adds more case padding, re-check this specific
  measurement rather than assuming it still holds.
- **Open questions carried over, still unresolved, still need Ray's own
  S25/tablet check**: the 13px drawer-open travel distance; the 27px
  corner-label text's single-label edge-clipping history; whether the
  display case's "resting on the cap" effect reads convincingly on a real
  screen (all three untouched this round).
- Verified headless: all 10 prior suites re-run clean, no assertion changes
  needed. Additionally spot-checked directly: before/after full-drawer-stack
  screenshots proving the dark-band diagnosis and fix; a case zoom-in
  screenshot confirming the molding rings + brass pinstripe render visibly;
  a 360px measurement re-confirming the corner-label gap stays positive.

**Fifth refinement pass (BUILT, same branch, still held) — 4 items,
including one approach reversal (display case) Ray called outright rather
than asking for another tuning pass.**
- **Display case abandoned "resting on the cabinet top" entirely, now hung
  like a picture frame above it.** Four straight rounds (molding rings,
  brass pinstripe, negative-margin overlap + z-index paint-order tricks)
  never convincingly sold "sitting on a surface" — Ray's call this round
  was to stop tuning that approach and drop it. `.display-case` no longer
  overlaps `.cabinet-top-cap` (`margin: 0 auto -7px` → `margin: 0 auto
  16px`, negative-overlap flipped to a real positive gap) and the
  elaborate 4-ring inset-shadow molding + separate brass-pinstripe
  `::before` are both gone — a hanging frame doesn't need surface-contact
  cues it no longer makes contact with. `z-index: 2` (only ever needed for
  the paint-order-over-the-cap trick) is gone too.
- **Case frame now uses the real `.wood` texture, not an approximating
  flat gradient.** `.display-case` carries the `.wood` class directly (see
  the HTML) instead of its own hand-matched `linear-gradient` background —
  same class, same `--wood-hi/mid/lo` values `.cabinet` itself uses, so
  the frame's wood is now genuinely the same recipe as the cabinet body,
  not a close approximation of it. `.display-case-glass`'s existing brass
  border is untouched and is the only "trim" the case has now — sufficient
  for a picture frame, no separate accent layer needed.
- **Top/bottom bevel: fixed a real directional bug, not just re-styled
  it.** The base cap used to shade top-to-bottom in the SAME direction as
  the top cap (light→dark going down) — which reads as the base sloping
  UP into the frame above it, backwards from a real flared foot/plinth
  that slopes AWAY and down. Both caps are now a genuine two-tier hard-
  stop facet (was a 5-band gradient) with DELIBERATELY OPPOSITE
  direction: top cap bright at its own outer/top surface, darkening
  toward the frame below; base cap dark near the frame above it,
  brightening toward its own outer/bottom edge. `.cabinet-base-cap`'s
  `border-radius` was also flipped (`3px 3px 8px 8px` → `8px 8px 3px
  3px`) so the rounding sits near the frame (where a foot flares out of
  the body) and the sharp edge sits at the true bottom (a flat contact
  edge, like a real plinth meeting the ground) rather than the reverse.
- **Placards shrunk back to the tighter of the two sizes this feature has
  used.** Two rounds ago introduced individually shrink-wrapped plates
  (~118px floor, "Acquisitions" itself rendering ≈152px under that
  padding); the round after that kept "one uniform size" but picked a
  more generous 214px. This round keeps "one uniform size" but reverts to
  measuring what "Acquisitions" actually needed under the ORIGINAL
  shrink-wrap padding — 122px of text + 15px/side padding ≈ 152px,
  rounded to a `width: 154px` floor-to-ceiling fixed size, applied to all
  seven. Confirmed via `scrollWidth`/`clientWidth` that "Acquisitions"
  still renders with zero text clipping at this size — it looks visually
  tight against the plate edges now, which is the correct, intended
  effect this round (not a bug to loosen back up).
- **360px corner-label safety margin actually IMPROVED this round** (28px
  gap, up from 22px last round) — the display case lost its heavy padding
  along with the abandoned molding, which gave back some of the width the
  molding had been eating into. Re-verified via the same
  `getBoundingClientRect()` measurement used in prior rounds, plus a
  zero-horizontal-overflow check at 360px.
- **Open questions carried over, still unresolved, still need Ray's own
  S25/tablet check**: the 13px drawer-open travel distance; the 27px
  corner-label text's single-label edge-clipping history (untouched this
  round). The "resting on the cap" open question from prior rounds is
  RESOLVED by this round's approach change — there's no longer a
  surface-contact illusion to verify, so that flag is dropped, not carried
  forward. **New, worth Ray's eyes**: whether the hung-picture-frame gap
  reads clearly as "hanging above" on a real screen — verified only in
  this environment's headless Chromium at 360px/412px.
- Verified headless: all 10 prior suites re-run clean, no assertion changes
  needed. Additionally spot-checked directly: zoomed screenshots of both
  caps confirming the two-tier facets read as opposite-direction slopes;
  a zoomed Acquisitions-plate screenshot plus a text-overflow measurement
  confirming the tighter size has zero real clipping despite looking
  visually tight; a 360px full-dashboard screenshot and overflow check.

**Sixth refinement pass (BUILT, same branch, still held) — 4 mechanical
fixes, no conceptual changes, reviewed live on phone and tablet.**
- **Display case hugs its content.** `.spotlight .flip-frame` gets a
  Spotlight-only `height: 234px` override (was inheriting the shared
  `.flip-frame`'s 280px, sized generously for Browse detail's own layout,
  not for this tighter hanging-frame context); `.spotlight`'s own vertical
  padding dropped `22px/14px` → `8px/8px`. Case height 374px → 294px.
  `.display-case`/`.display-case-glass`'s own padding (the frame's actual
  material thickness) is untouched — only the empty space around the
  coin/labels was trimmed, not the frame itself.
- **Drawers compressed** so all seven fit within a reasonable scroll
  (scrolling to reach lower drawers is expected/fine — the goal was
  trimming excess height, not eliminating scroll). `.drawer-face` vertical
  padding `16px` → `9px`, `min-height` `62px` → `46px`, `.drawer-plate`
  vertical padding `10px/6px` → `8px/5px`. Per-drawer height 81.5px →
  64.5px; full dashboard stage height (title + case + all 7 drawers)
  1102px → 795px combined with the case trim above.
- **Scroll-into-view on Back/Return to Dashboard, before the close
  animation plays, not after.** Previously `navigate()` always did a flat
  `window.scrollTo({top:0})` regardless of context — fine for entering a
  new section, but landing back on the Dashboard after scrolling deep into
  a section (or after the drawer-height compression above made the stack
  taller than one screen) could leave the closing drawer off-screen,
  animating invisibly. `navigate()`'s dashboard branch now calls
  `scrollIntoView({block:"center", behavior:"auto"})` on the relevant
  element FIRST, synchronously before adding `.closing` — instant, not
  smooth, deliberately: an animated scroll has no reliable "done" callback
  to key the close animation's start off of, so instant scroll removes the
  timing guesswork entirely rather than guessing a smooth-scroll duration.
  The final unconditional `scrollTo(top:0)` at the end of `navigate()` is
  now skipped whenever this targeted scroll already ran (`didTargetedScroll`),
  so it can't immediately undo the scroll-into-view a moment later.
- **Spotlight-tap exception, via a new dedicated flag, not reused from
  `lastDrawerView`.** The Spotlight coin tap calls `navigate("browse")` to
  show that coin's detail view — structurally indistinguishable from the
  Catalog drawer opening the same view, since both are `navigate("browse")`
  calls. A new `spotlightOriginated` flag is set immediately before that
  one call (Spotlight tap handler only), consumed the moment `navigate()`
  reads it (cleared same-call, so it can never leak into a later, normal
  navigation), and flips a stickier `scrollToCaseOnDashboard` flag instead
  of `lastDrawerView` — so a later Back/Home from that path scrolls to
  `.display-case` and skips the (nonexistent) drawer-close animation
  entirely, while a normal Catalog-drawer-originated visit to the same
  Browse view still closes Catalog correctly. Verified headless in both
  directions, plus with reduce-motion (scroll still happens; the `.closing`
  class is correctly never added).
- **Docket badge number recentered.** Measured first, not guessed:
  `getBoundingClientRect()` on the number's own text range showed the box
  was ALREADY perfectly centered (equal gaps all four sides) — the
  perceived "sits up-and-left" was Caveat's own rightward italic slant
  putting a numeral's visual ink off-center within an otherwise-correct
  box, not a flexbox bug. Fixed with `line-height: 1` (removes a small
  vertical mismatch between the font's line box and its glyph metrics)
  plus a small `letter-spacing`/`padding-left` compensation for the slant,
  rather than fighting the alignment properties that were already right.
- **Open questions carried over, still need Ray's own S25/tablet check**:
  the 13px drawer-open travel distance; the 27px corner-label text's
  single-label edge-clipping history (both untouched this round). **New,
  worth Ray's eyes**: the instant (non-smooth) scroll-into-view behavior on
  Back/Return to Dashboard — reads correctly in headless Chromium, but
  scroll snapping without any animation can feel more or less jarring on a
  real touchscreen than in a desktop browser; worth confirming it doesn't
  feel abrupt in hand. If it does, the fix would be a capped-duration smooth
  scroll instead, not a revert.
- Verified headless: all 10 prior suites re-run clean, no assertion changes
  needed. Additionally spot-checked directly: before/after case and drawer
  height measurements; a zoomed fob screenshot before/after the centering
  fix; two dedicated scroll-behavior scripts (drawer-close-scrolls-into-view
  from an arbitrary scroll position, Spotlight-tap-scrolls-to-case-instead)
  covering both normal and reduce-motion contexts; a 360px full-dashboard
  screenshot and overflow check.
- **Follow-up, same round: real vertical seam within several drawer faces,
  root-caused and fixed.** Ray's flag ("some grain on left side of drawers
  do not align") pointed at a genuine rendering artifact, confirmed by a
  zoomed screenshot of the drawer stack's left edge — grain lines visibly
  discontinuous partway across several drawer faces (Albums, Wishlist,
  Ledger, Acquisitions, Docket; Catalog and Sets looked clean). Diagnosed,
  not guessed: forced `--grain-dir` to `0deg` on every drawer via a
  browser-evaluated style override and re-screenshotted the same crop —
  the seam disappeared completely, isolating the cause to the per-drawer
  `--grain-dir` angle variation (±1–3deg off horizontal) a prior pass added
  for grain-direction variety. A `repeating-linear-gradient` painted at a
  shallow non-cardinal angle across a box much wider than tall has to tile
  diagonally, and at these box dimensions/DPI the tile boundary itself
  becomes a visible seam — a real limitation of that technique at this
  aspect ratio, not a fixable styling tweak. Removed the per-drawer
  `--grain-dir` overrides entirely; all drawer faces now share the
  horizontal `0deg` `.cabinet-drawers` already sets, leaving the per-drawer
  `--wood-hi/mid/lo` tint + `background-position` shift (unaffected, kept
  as-is) to carry "distinct board" on their own. Re-verified via the same
  zoomed left-edge crop post-fix: grain lines now run continuous and
  unbroken across every drawer face. `.wood`'s own internal 4deg/6deg-offset
  layers (used by the stiles, recess housing, and display case) were left
  untouched — those contexts are tall-and-narrow or moderate boxes with a
  near-vertical base grain-dir, which didn't show this artifact in the same
  screenshots, so there was nothing there to fix.

**Second follow-up, real S25 screenshot from Ray — two more issues, both
fixed, one a real regression from this round's own height trim.**
- **Corner labels overlapping the coin — a real regression, caught on
  Ray's actual phone, never reproduced in this environment's headless
  screenshots.** This round's `.spotlight .flip-frame { height: 234px }`
  (trimming dead space above/below the coin) only left 12px between the
  frame's own top/bottom edge — where corner labels anchor at `top: 10px`
  — and the 210px disc's own edge. A single-line corner (e.g. "1909-S")
  is already taller than that; a two-line corner (Type+Denom, e.g.
  "Lincoln" over "1C") is roughly 55-60px, guaranteeing overlap with the
  coin, exactly what Ray's screenshot showed. **Reverted to the shared
  280px** every other flip-frame use (Browse detail, etc.) already relies
  on with no such report against it — restores the full 35px clearance on
  each side, evidence-based rather than picking a new arbitrary smaller
  number that risks reproducing the same bug. The case is taller again as
  a direct, necessary tradeoff (stage height 903px → 950px — still well
  below the pre-this-feature 1102px baseline, since the drawer compression
  and the case's other padding trims are untouched). **This specific
  "flip-frame height vs. corner-label clearance" relationship is now
  flagged directly in the CSS comment** so a future pass doesn't
  re-attempt the same trim blind.
- **Docket badge still off-center — because the "fix" two rounds ago was
  itself wrong, not because centering was still broken.** That round's
  `letter-spacing`/`padding-left` nudge was a guessed compensation for
  Caveat's italic slant, eyeballed against this environment's own font
  rendering. On Ray's real device it pushed the number further right, not
  toward center (`padding-left` inside a `justify-content: center` box
  shifts the visible content right within the box, exactly matching his
  "shifted right" report). Removed both properties, kept only
  `line-height: 1` (a real, non-speculative fix — a line-box/glyph-metric
  mismatch, not guesswork). Re-verified via measurement across four
  different digit counts (5/19/20/100) — all come back with equal
  left/right gaps to well under a pixel, confirming plain flexbox
  centering was correct all along and needed no manual compensation.
  **Lesson for future passes**: don't hand-tune a "visual" nudge for a
  font-rendering perception (slant, glyph weight) based on this
  environment's own Chromium — font hinting/rendering varies enough across
  engines that a guessed compensation can just as easily overcorrect on a
  different device, as it did here.
- Verified headless: all 10 prior suites re-run clean. Directly
  re-measured: corner-label-to-disc clearance (35px each side, restored to
  match the safe 280px default) and fob text centering across four digit
  counts (all equal-gap). A 360px overflow/screenshot check and a full
  412px dashboard screenshot both re-confirm no regressions elsewhere.
  **Both bugs here were real-device-only** — neither reproduced in this
  environment's headless Chromium at any viewport tested, which is exactly
  why they slipped through the previous round's own headless verification;
  worth remembering next time a change trims spacing or hand-tunes a
  visual alignment; that class of change is the one this environment is
  least able to catch on its own.

**Third follow-up: wayfinding chrome button relabel + prominence (Ray's
explicit request, cosmetic/labeling only, no behavior change).**
- **"← Back" → "Back"** — arrow glyph removed, text unchanged otherwise.
- **"Return to Dashboard ⌂" → "Close Drawer"** — house glyph also dropped
  (not explicitly requested, but kept alongside the arrow removal above for
  visual consistency between the two buttons, and because a house icon no
  longer fit the new label). **The underlying behavior is completely
  unchanged** — this button is still `navigate("dashboard")`, a hard reset
  to the top from anywhere, same as documented everywhere else in this
  section (Acquisitions, a Spotlight-originated detail view, etc.) — "Close
  Drawer" is accurate when the current screen came from opening one of the
  seven drawers (the common case), but is a label of convenience, not a
  literal description, on paths that didn't originate from a drawer (e.g.
  the Spotlight click-through case, which scrolls to the display case
  instead of a drawer on this same button). Flagging this as a real,
  deliberate wording tradeoff Ray asked for, not an oversight — if it reads
  confusingly on a non-drawer path in practice, the fix would be a
  conditional label rather than reverting the rename.
- **Both buttons now share one unified, more prominent style** — both were
  already the same `.nav-chrome button` base rule (only `.home-btn` added
  `font-weight: 600` before), so making Back "more prominent to match"
  meant strengthening the shared rule itself, not diverging the two: solid
  gold-tinted gradient background (was `--bg-elevated` flat), brighter
  border (`--case-border-bright`, was the dimmer default), bumped
  `font-weight` 600→700 and padding/font-size up a notch. `.home-btn`'s own
  now-redundant `font-weight: 600` override was removed since the shared
  rule already sets 700.
- Applied identically to the interactive preview artifact (same relabel +
  styling), rebuilt and republished at the same URL. Verified headless:
  both buttons render with matching computed `font-weight`/`border-color`
  after the change (were previously visually mismatched, Back plain and
  Close Drawer bold), zero page errors, all 10 regression suites re-run
  clean (label-text assertions elsewhere in the suite target `.back-link`
  buttons — the hidden per-screen ones, unaffected by this — not the nav
  chrome pair, so nothing needed updating).

**Fourth follow-up: Dashboard title removed, Ledger heading relabeled,
Sets pills shortened + wrapped (Ray's explicit request, no merge yet —
this branch is now `main`, since the cabinet nav merge already landed).**
- **`.cabinet-title` ("Salty's Cabinet" `<h1>` above the display case) is
  deleted entirely**, markup and CSS both — Ray's ask was specifically to
  let the display case + drawer stack fit within a phone screen without
  vertical panning, and the title was the one full-width element not
  already trimmed by the earlier drawer/case height passes. The page
  `<title>` tag and the splash screen's own "Salty's Cabinet" `<h1>`
  (`.splash-title`, a different element) are both untouched — this only
  removed the Dashboard-level heading.
- **Ledger page's own `<h2>` heading, "Stats & Value" → "Ledger"** — matches
  the drawer's own label; the underlying view id (`view-stats`), function
  names, and every internal "Stats & Value" comment/reference are
  unchanged, this is a visible-heading-text-only change (same pattern as
  every other pure relabel in this file).
- **Sets tab category pills shortened** — `BROWSE_SET_CATEGORY_CHIPS`
  labels "Uncirculated Sets"/"Proof Sets"/"Silver Proof Sets"/
  "Commemorative Sets" → "Uncirculated"/"Proof"/"Silver Proof"/
  "Commemorative" (the word "Sets" dropped from each, since the row itself
  is already titled "Sets" via the tab — repeating it on every pill was
  redundant). `lineage`/`test` values driving the checklist/list logic are
  completely unchanged, label text only.
- **Even after shortening, six pills still didn't reliably fit one line on
  a phone width** (measured: 509px of content in a 380px row at 412px
  viewport) — every other `.filter-row` in the app scrolls horizontally
  when it overflows, but Ray specifically asked for no side-scrolling here.
  Rather than shrink padding/font further (fragile, and still not
  guaranteed to fit every phone), added a scoped
  `#browseSetsCategoryFilters { flex-wrap: wrap; overflow-x: visible; }`
  override so just this row wraps to a second line instead — every other
  `.filter-row` (Denomination, Metal, Commemorative toggle, etc.) keeps its
  existing horizontal-scroll behavior unchanged, since only this one ID is
  targeted.
- Four scratchpad regression scripts (`verify_checklist.js`,
  `verify_addset_track_individually.js`, `verify_addset_year.js`,
  `verify_visual.js`) matched Sets pills by their old exact label text
  (`"Proof Sets"`, `"Uncirculated Sets"`, etc.) — updated to the new short
  labels, not weakened; same "test scripts follow a real rename" pattern
  as every prior label change in this file. All 10 suites re-run clean
  after the update. Verified headless: cabinet-stage height (891.5px) now
  fits inside a 412×915 viewport with zero vertical overflow; the Sets
  pill row's `scrollWidth`/`clientWidth` are equal (was 509/380, genuinely
  overflowing) with zero page-level horizontal overflow; Ledger heading
  reads "Ledger". Not yet checked on Ray's own device.

**Fifth follow-up: Browse tab row retired, filters restructured (Ray's
explicit request — primary navigation is at the cabinet level now, so the
in-page top-level tab row is redundant).** This supersedes the whole
"Browse: navigation restructure"/"Medal tab"/"Missing Photos filter"
apparatus at the UI level (the underlying data model and tab-switching
plumbing are untouched — see the retain-plumbing note below).
- **Top-level Browse tab row (Coins/Sets/Albums/Medals/Rolls) removed from
  the UI entirely.** `#browseTabRow` is kept in the DOM but hidden and never
  populated; `BROWSE_TABS`/`activeBrowseTab`/`showBrowseTab()` are all
  retained as internal plumbing (Ray's "retain plumbing as you see fit").
  Sets and Albums are each reachable via their own cabinet drawer, so
  nothing is lost; Coins is the Catalog drawer; Medals and Rolls are
  relocated (below).
- **Page heading "Coins" → "Catalog"** (matches the Catalog drawer label).
  `showBrowseTab()` sets the title to "Catalog" for the coins tab.
- **Medal is a Denomination chip again, last in the row** — reverses the
  "Medals is its own top-level tab" phase (which itself had reversed an
  even-earlier "Medal is a Denomination chip" phase; we're back to that).
  Ray's framing: "treat it like a denomination." `coinsTabBaseRows()` now
  INCLUDES `denom==="Medal"` rows (was excluding them), a `{key:"Medal",
  label:"Medals"}` chip is appended to `BROWSE_FILTER_CHIPS`, and it
  OR-combines with the other denomination chips and ANDs with Metal/
  Commemorative exactly like any denomination. The medal-tab code path
  (`medalTabBaseRows`/`applyMedalTabFilters`, the `activeBrowseTab==="medal"`
  branch) is now dead-but-harmless (unreachable, since the tab row is gone)
  — left in place rather than ripped out, per retain-plumbing.
- **Bottom toolbar row is now Year / Commemorative / Rolls.** Commemorative
  moved out of its own `#browseCommemorativeRow` (deleted) into the toolbar
  as a static button (`#browseCommemorativeFilterBtn`); Rolls is a NEW nav
  pill (`#browseRollsFilterBtn`) — not a filter, it switches to the unique
  Rolls list page (`showBrowseTab("rolls")`) and sets Back to return to the
  Catalog grid (`setNavBack(() => showBrowseTab("coins"))`) so it isn't a
  one-way trip (Rolls has no cabinet drawer of its own — reachable only from
  here). Both the Commemorative and Rolls chips are Catalog-only (hidden on
  Sets/Rolls via `.filter-chip.hidden`, a new global rule); the Year chip
  stays on every tab.
- **"Missing Photos" Browse filter retired entirely.** Ray's call: missing-
  photo tracking already lives in the Docket (the Needs Attention hub lists
  each otherwise-complete record missing a photo as a dismissible row —
  `coinMissingPhoto()`, unchanged), so the standing Browse filter is
  redundant. The `#browseMissingPhotoFilterBtn` button, its listener, and
  its reset line are removed; `browseMissingPhotoOnly` stays declared
  (always `false`) so the `!browseMissingPhotoOnly || coinMissingPhoto(c)`
  terms in the various `apply*Filters()` functions stay harmless no-ops
  rather than needing every one edited. `coinMissingPhoto()` itself is kept
  (still used by the Docket).
- **Sets page: tab row + Missing Photos gone; category pills + scope
  dropdown + Year kept.** The category/lineage pill row (All/Uncirculated/
  Proof/Silver Proof/Commemorative/Other) and the Complete/Component/Premium
  scope dropdown are the Sets page's own filters (Ray: "those are
  effectively filtering the sets like metal or denominations do for coins")
  — untouched. Year stays (a real filter). The completeness-checklist
  feature is fully intact.
- **Catalog grid coin-flip corner-label font bumped 11px → 14px** (Ray's
  request) — `.coin-card .flip-frame-mini .flip-label`. The JS last-word
  shortening (`renderTypeDenomCorner`, measured via `scrollWidth`/
  `clientWidth`) still guards the one long field (series/type name). One
  single-word type name ("Washington") spills ~3px past its box into the
  empty corner space at the new size — not a clip (flip-labels have no
  `overflow:hidden`, per the corner-label history above) and not colliding
  with the coin; within accepted tolerance. `.set-child-grid`'s mini-flips
  are a separate rule, unchanged (Ray specified the Catalog page).
- **`verify_medal_tab.js` rewritten** to assert the new design (Medal as a
  Denomination chip, tab row gone, toolbar = Year/Commemorative/Rolls,
  Missing Photos gone, Rolls-pill→page→Back-to-Catalog) rather than the
  retired medal-as-tab behavior — following a real design change, not
  weakened. All 10 suites re-run clean.
- **Not yet checked on Ray's own device** — verified headless (412×915):
  Catalog title, Medals chip present + narrows to medal rows, Commemorative
  ANDs with Medals, Rolls pill→Rolls page→Back→Catalog, Sets page pills
  intact with no Missing Photos, zero horizontal overflow, bigger flip font
  renders without clipping.

**Sixth follow-up: Rolls page filter pills, Metal pill relabel/reorder
(Ray's explicit request).**
- **Rolls page sort dropdown removed, replaced with filter pills.** The old
  `#rollsSortSelect` (Year/Denomination/Value/Name sort) is gone. In its
  place, the Rolls page now has its own **Denomination pill row**
  (`#rollsFilters` — All/Cents/Nickels/Dimes/Quarters/Halves/Dollars, NO
  Medals chip since a roll is never a medal) and **Metal pill row**
  (`#rollsMetalFilters` — same 7-category set as Catalog), mirroring the
  Catalog page. Denomination multi-selects (OR); Metal is single-select;
  both AND with the shared Year filter. Independent state
  (`rollsSelectedDenomKeys`/`rollsMetalTest`) kept SEPARATE from the Catalog
  page's own filter state so switching between the two pages never
  cross-wires filters. `sortRollRows()` still runs with a fixed default
  order (`rollsSortKey = "year-desc"`, no longer user-changeable) so the
  list has a stable order; the variable/function are retained, just the UI
  control is gone. Reset in `resetBrowseFilters()` alongside the Catalog
  filters.
- **Metal pill "All Metals" → "All"** (Catalog and Rolls both — same shared
  `BROWSE_METAL_CHIPS`) — the metal names that follow already make the row's
  purpose clear, so the shorter label is enough.
- **Metal order: Platinum now before Gold** — `METAL_CATEGORIES` reordered
  to `["Platinum","Gold","Silver","Copper","Zinc","Clad","Other"]` (rarest/
  most-valuable first, Ray's call). `METAL_CATEGORY_INFO` is keyed by label,
  so the reorder doesn't affect the per-pill hover/tap constituent info.
- Verified headless (412×915): Rolls page has no sort dropdown, shows both
  pill rows, filters correctly (3 demo rolls → Quarters=1, Silver=3, Gold=0
  with the empty-state message), zero horizontal overflow; Catalog metal row
  reads All/Platinum/Gold/Silver/Copper/Zinc/Clad/Other. All 10 regression
  suites re-run clean (no test referenced the old label or dropdown).

**Seventh follow-up: Metal filter multi-select + per-page Year filter (Ray's
explicit request).**
- **Metal filter is now multi-select** (Catalog + Rolls), OR-combining
  exactly like Denomination — superseding the long-standing "Metal is
  single-select" lock-in noted throughout the Metal-filter sections above.
  Both pages hold a `Set` of selected category keys
  (`browseSelectedMetalKeys` / `rollsSelectedMetalKeys`, empty = "All") and
  `browseMetalTest()`/`rollsMetalTest()` became functions that OR the
  selected chips' tests. "All" clears the set; tapping a category toggles it.
  The whole metal group still ANDs with Denomination/Commemorative/Year. The
  constituent-composition toast now fires only when a chip is being turned
  ON (not off). `updateMetalChipsUI(containerId, selectedKeys)` is a shared
  helper for both rows' active-state rendering.
- **Year filter is now per-page** — it no longer carries over between the
  Catalog and Rolls pages (Ray's call). Superseded the earlier "Year state
  is shared/global across Coins/Rolls/Sets" model. Replaced the two global
  `yearFilterBegin`/`yearFilterEnd` vars with a per-tab store
  (`yearFilterByTab[activeBrowseTab] = {begin,end}`); `currentYearFilter()`
  returns the active tab's own state, and `yearRowTest()`, the Year overlay
  (open/apply/clear), and `updateYearFilterButtonUI()` all read/write through
  it. `showBrowseTab()` refreshes the Year button on every tab switch so it
  reflects the newly-active tab's own year. Sets keeps its own independent
  year too (falls out of the per-tab model for free). `resetBrowseFilters()`
  (external Browse entry) clears every tab's year. NOTE: the input element
  IDs `#yearFilterBegin`/`#yearFilterEnd` are unrelated (the overlay's number
  inputs) and unchanged — only the JS state vars were replaced.
- Verified headless: Catalog Silver+Copper both active → grid = silver-OR-
  copper rows (11, matching the predicate); Catalog Year=1916 while Rolls
  shows no year, Rolls Year=1964 → 1 roll, returning to Catalog still shows
  1916; external Browse entry clears both. All 10 regression suites clean.

**Eighth follow-up: Catalog search, result count, Rolls-as-icon (Ray's
explicit request).**
- **Catalog search box** (`#browseSearchInput`, inside `#browseCoinsHeader`
  so it's Catalog-only, hidden on Sets/Rolls automatically). Live-filters as
  you type via `browseSearchTest()` — case-insensitive substring against
  CollectionID, name/series, year, denomination, mint mark, variety, and
  grade. ANDs with the pill filters (added as another term in
  `applyCoinsTabFilters()`). Cleared by `resetBrowseFilters()` (external
  Browse entry). Search is Catalog-only for now (Rolls has few rows and no
  search; Sets has its own category model) — an easy add elsewhere later if
  wanted.
- **Result count** ("Showing X of Y", `#browseResultCount`) above the grid —
  `setBrowseResultCount(shown, total)` where total is that tab's full base
  row-set. Updated in `applyCoinsTabFilters()` and `applyRollsTabFilters()`;
  **hidden on the Sets tab** (its checklist/list split makes a single owned-
  count misleading — toggled in `showBrowseTab()`).
- **Rolls is now an icon button, not a text pill** — Ray's call: a dedicated
  cabinet drawer felt like too much for a rarely-visited, low-count section,
  so it's a small 🪙 icon (the app's established roll glyph) styled like the
  grid/list view-toggle icons, sitting just left of them in the toolbar's
  right group. Same id (`#browseRollsFilterBtn`), same behavior as the old
  pill (Catalog-only via `showCatalogTools`; switches to the unique Rolls
  page; Back → Catalog). `title`/`aria-label` "Rolls" cover the
  discoverability gap of an icon with no text. Needed a new
  `.view-toggle-btn.hidden { display:none }` rule so it hides on Sets/Rolls
  like the old `.filter-chip` did. The toolbar left group is now just
  Year + Commemorative.
- `verify_medal_tab.js` updated: the old "toolbar shows Year/Commemorative/
  Rolls chips" assertion is now "Year/Commemorative chips + Rolls is a
  separate icon button," plus new assertions for the search box and result
  count. All 10 suites clean (17/17 in that suite).
- Verified headless (412×915): search by name ("morgan"→1) and by ID
  ("AY-00003"→1), search ANDs with a denomination pill, count tracks
  ("Showing X of 17"), Rolls icon renders + navigates + hides on the Rolls
  page, count hidden on Sets, zero horizontal overflow.

**Ninth follow-up: plain Rolls glyph, search box repositioned, Back-button
bug fix (Ray's explicit request + a real bug he found).**
- **Rolls icon glyph: 🪙 → ◉** — the emoji rendered in full color regardless
  of button styling, standing out from the monochrome ▦/☰ view-toggle icons
  next to it. `◉` (Geometric Shapes block, no default emoji presentation)
  renders in the button's own `currentColor` like the other two, so all
  three now read as one consistent icon set. `title`/`aria-label` "Rolls"
  unchanged — still the only textual cue, since the icon itself is now
  fully abstract.
- **Search box moved onto the title row, right-justified, smaller.** Pulled
  `#browseSearchInput` out of `#browseCoinsHeader` (its own row above the
  Denomination pills) into a new `.browse-header-row` flex container shared
  with `#browseTitle` — `justify-content: space-between` puts the title left
  and search right. Width capped narrow (`flex: 0 1 130px`, was full-width),
  padding/font-size reduced (`6px 10px`/12px, was `10px 14px`/14px).
  Placeholder shortened "Search by ID, year, or name…" → "Search…" to fit
  the narrower box (the fuller description moved to `aria-label` only, so
  screen readers still get it). Since the input no longer lives inside
  `#browseCoinsHeader`, its show/hide is now set directly in
  `showBrowseTab()` (`.hidden` class, new `.browse-search.hidden` rule) —
  same Catalog/Medal-only condition as before, just applied to the element
  directly instead of inheriting from its old parent's display toggle.
- **Real bug, found and fixed: Back stopped working after Rolls → Catalog.**
  Ray's report: navigate Catalog → Rolls (via the icon) → Back (correctly
  returns to Catalog) → Back again — expected the Dashboard, got nothing.
  Root cause: the Rolls icon's click handler did
  `setNavBack(() => showBrowseTab("coins"))` and never re-armed `navBack`
  afterward — so once back on Catalog, `navBack` was STILL "go to coins,"
  and tapping Back again just re-ran that (already there, so it looked like
  Back had silently stopped working) instead of falling through to
  `navigate("dashboard")`, which is what Catalog-as-section-root should do
  (same rule `showBrowseGrid()`'s own `setNavBack` already documents).
  Fixed: the handler now re-arms `navBack` to the Dashboard the moment it
  lands back on Catalog — `setNavBack(() => { showBrowseTab("coins");
  setNavBack(() => navigate("dashboard")); })`. A new regression assertion
  in `verify_medal_tab.js` covers the exact repro (Catalog → Rolls → Back →
  Back → must reach Dashboard) so this can't silently regress again.
- Verified headless: Rolls glyph reads `◉`; search box sits on the title row
  (same top offset as `#browseTitle`, right-aligned, 130px wide) and still
  filters correctly from its new position; the full Catalog→Rolls→Back→Back
  sequence now reaches the Dashboard on the second tap (was stuck on
  Catalog). All 10 suites re-run clean (18/18 in `verify_medal_tab.js`).

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
- **Bug fix, merged directly to main (small/isolated, no branch held):
  wide-viewport disc clipping in spread (two-page) mode.** Ray's real-device
  report: the last disc in a row (e.g. "1911-D" on Lincoln Cents) got cut off
  at the page's right edge at desktop widths — confirmed fine at tablet
  (1024×768) and phone (412×915). Root cause was in `albumPageContentWidth()`:
  its spread-mode branch computed available width as `(containerWidth - gap)
  / 2` with **no cap at `PAGE_MAX_WIDTH` (460px)**, while `.album-page` itself
  always carries a real CSS `max-width: 460px` — spread mode included (the
  non-spread branch already applied this same cap; spread's never did). Past
  roughly 936px container width, that half-width exceeds 460px, so the CSS
  silently capped the page's rendered width while this function kept
  reporting the larger, uncapped figure as "available." `computeAlbumGridLayout()`
  then sized columns/discs for space that didn't actually exist — and since a
  `.coin-disc` is a fixed-pixel element (`width: var(--slot-disc-size)`) that
  doesn't shrink to fit a narrower real cell, the overflow showed up exactly
  as reported: the last disc in a row spilling past the page's true edge
  instead of wrapping. Confirmed via direct measurement before the fix: at a
  1440px viewport the function assumed 488px of page content width while the
  CSS-capped page really only had 422px — a 66px overshoot. **Fixed at the
  actual root cause** (both branches now apply the same `Math.min(PAGE_MAX_WIDTH,
  …)` the non-spread branch always had), not by adding `overflow:hidden` or
  similar — a disc-hiding workaround was explicitly ruled out. Verified via a
  broad viewport sweep (412 through 2560px, including the exact 936px
  boundary where the bug first turns on) confirming no disc or grid ever
  overflows its own page and no page-level horizontal scroll appears at any
  width; the three specifically-required widths (412/1024/1440) all
  re-screenshotted clean. All prior regression suites re-run clean alongside
  it — this was a pure layout-math fix, no markup/behavior otherwise changed.

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
- **Key-date variety line (new)**: a key-date slot (`slot.keyDate`) that
  also carries a real `variety` (e.g. 1909/1909-S Lincoln Cent → `VDB`)
  prints that variety directly under the date/mintmark caption
  (`.slot-variety`), same as a real folder calls out the one date in a run
  that actually needs distinguishing. **Independent of the dropped
  `.slot-meta` line above** — that line was about not repeating the
  series/description text, not about hiding a distinguishing variety, so
  this isn't a reversal of that decision. Ordinary (non-key-date) slots are
  unaffected — still just the plain date/mintmark, nothing added. Uses the
  existing `slotVariety()` helper, not new data.
- **Key-date marker (superseded, twice)**: originally a gold glowing-star
  treatment, then restyled to a small navy printed star + ring to fit the
  printed-folder look. Ray didn't like the navy version in practice — the
  star/marker read as sitting inside the coin circle rather than clearly
  outside it. Now: **gold** ring around the disc (back to gold, not navy) +
  a **larger** gold star anchored just outside the circle's top-right edge.
  The "inside the circle" complaint turned out to be a real positioning bug,
  not just a color preference — `.key-date-badge` used to position itself
  relative to the whole `.slot-cell` (label + meta text included), so at real
  computed column widths there often wasn't enough spare cell width for the
  badge's offset to actually clear the disc. Fixed by wrapping just the disc
  in `.slot-disc-wrap` (sized to the disc alone) and anchoring the badge to
  *that*, so it always sits a fixed, disc-relative distance outside the
  circle's edge regardless of column count/disc size.
- **Reference photos were for color/material only, not the page-turn
  mechanic (important correction)**: real Littleton folders physically
  unfold accordion/fan-style flat on a table — that look was mistakenly
  carried over into an early version of the page-turn *animation* itself
  (see the binder-ring page-turn note above for the fix). The reference
  photos only ever governed the cream/navy/die-cut *look*, never the
  interaction/motion.

### Live nav data (read-only) — BUILT and merged to main
Real, GET-only Graph API reads now power the Catalog/Medal/Rolls tabs and the
Sets tab (both list mode and the completeness checklist) — instead of
`FAKE_COINS`/`FAKE_DB_SETS` — when enabled. **Display-only: no write path is
touched or added.**
**Merge status correction:** this section previously read "held on branch
`claude/live-nav-data`, NOT merged" — that was stale doc text, not a stale
git state. Ray ran the full live click-through checklist himself against the
real OneDrive `_Testing` copy workbook (auth, Catalog/Rolls/Sets rendering
real data correctly, clean fallback to demo data on flag-off) and it was
merged to main that same session; only this section's header text hadn't
been updated to say so. Same standing as every other "held pending review"
item once Ray actually signs off — **main is the source of truth for this
feature**, same as the Add Set write layer's own merge-status correction
below.

**Sheets/ranges read:** the `All`, `DB_Sets`, `DB_Coins` and
`Lookup_MetalContent` sheets, in full (`usedRange(valuesOnly=true)`), from
**whichever workbook `WRITE_TARGET` points at** — `liveNavWorkbookPath()`,
which returns `writePaths().workbook`.

**Superseded, and this is the important part:** this used to read the **live
production workbook** unconditionally, on the reasoning that "a read-only
GET can't corrupt anything, so it doesn't need the `_Testing` copy
convention." That was true while nothing wrote. Once the Browse Edit write
layer landed, reading production while writing to the `_Testing` copy caused
real, silent data loss on Ray's live pass — the Edit form pre-filled from
one file and diffed against another, so an untouched field got submitted as
a change. See "Browse Edit real write layer" → Bugs A/B for the full
account. **Standing rule: reads and writes target the same workbook, always.
Any new read path uses `writePaths().workbook`. Do not reintroduce a
separate read target for "safety" — that split is what caused the bug.**
(The Reference Images feature reading `CoinCollection/ReferenceImages/`
directly is genuinely different and unaffected: it reads image FILES, not
the workbook, and nothing writes those.)

**Safety posture:** `ENABLE_LIVE_NAV_DATA` (default `false`, localhost-dev
only, same re-enable steps as `ENABLE_REFERENCE_IMAGES`), same
`http://localhost:8791/app.html` redirect URI as every other real-Graph
feature in this file (no production URI exists yet for any of them).
`getLiveNavToken()` returns `null` immediately when the flag is off, and
otherwise defers to the app's ONE shared MSAL instance — **superseded: this
feature used to construct its own `liveNavMsalInstance` with a narrow
`Files.Read` scope**, described here as deliberate isolation from the write
layer. That isolation was never real (all instances shared one clientId and
therefore one MSAL storage namespace) and it broke sign-in outright once two
features were enabled together — see "Auth: one shared MSAL instance" below.
Called lazily off the first Browse render that wants it (`showBrowseTab()`
calls `ensureLiveNavDataFetch()` at its top), never from an explicit Sign In
button.

**Blast radius — the exact list of call sites swapped, and nothing else:**
`coinsTabBaseRows()`, `medalTabBaseRows()`, `applyRollsTabFilters()`,
`applySetsTabFilters()`'s list-mode branch, `renderSetChecklist()`, and
`ownedSetForSetId()` — each changed from reading `FAKE_COINS`/`FAKE_DB_SETS`
directly to reading through two new accessor functions, `activeCoins()`/
`activeDbSets()`, which return the live-fetched array once loaded or fall
back to the `FAKE_*` array otherwise. This is the ONLY mechanism — no other
`FAKE_COINS`/`FAKE_DB_SETS` reference in the file was touched. Explicitly
UNCHANGED and still 100% on demo data: Browse detail's own supplementary
lookups (`FAKE_COIN_DETAILS`/`FAKE_METAL_CONTENT`/`FAKE_SET_CHILDREN`/
`FAKE_SET_FACTS` — Purchase Details, Specifications, Notes & Facts, child-Set
flips), Albums, Wishlist, Ledger/Stats, Spotlight/Dashboard, every Add Coin/
Add Set flow, and `matchDbSetsByProductCode()` (Add Set's own DB_Sets lookup).
A side effect worth knowing, not a bug: tapping into a live coin's Browse
detail view will correctly show its own real core fields (from the live row
itself) but its accordions will render empty/hidden for that CollectionID
(no `FAKE_COIN_DETAILS` entry exists for a real ID) — that's the *existing*
"hidden when blank" behavior working correctly, not a new failure mode.

**Row-shape mapping (`mapWorkbookRowToCoin`/`mapWorkbookRowToDbSet`):** each
raw sheet row (a plain object keyed by its own header-row text) is mapped
into the exact same field shape `FAKE_COINS`/`FAKE_DB_SETS` rows already use,
so every existing nav function (`browseFilterTest`, `metalCategoryFor`,
`browseSearchTest`, `sortCoinsTabRows`, `dbSetLineageIncludes`, etc.) keeps
working completely unchanged against either source — the row *shape* is the
real contract, not which array it came from. `colVal(row, ...candidates)` is
a defensive header lookup: some fields have a CONFIRMED exact real column
name (`CollectionID`, `Denomination`, `Year`, `MintMark`, `SerNo` — "Workbook
naming conventions" above); others this feature also wants have NOT been
confirmed against the real sheet by this task (a single display-name column,
a live estimated-value column, `OriginSetID`) — those try a short list of
reasonable candidate spellings, falling back to blank/0 rather than throwing
when none match.

**Column names — CONFIRMED against the real workbook (Ray, direct column
check, not guessed), superseding the original guesses this feature shipped
with:**
- **All sheet, `name`**: `Description` — confirmed correct as originally
  built, no separate name column exists.
- **All sheet, `value`**: `Value` first, `SpotValue` as fallback. **There is
  no `EstValue` column** — that was a wrong guess, dropped from the
  candidate list entirely (a row with only `EstValue` populated now
  correctly defaults to 0, verified directly).
- **All sheet, `originSetId`**: `OriginSetID` **does exist** — column 47,
  appended at the end of the sheet. `colVal()`'s lookup is already an
  exact, case-sensitive property match by construction, so no code change
  was needed here — confirmed correct as originally built. The "might be
  missing/misspelled" caveat this section used to carry no longer applies.
- **DB_Sets sheet, `name`**: `Description` (not `Name`/`SetName`, which
  don't exist as headers on this sheet — `mapWorkbookRowToDbSet` originally
  guessed those and was **corrected** to `Description` first, with
  `Name`/`SetName` kept only as harmless extra fallback candidates). Full
  confirmed current DB_Sets headers, for reference: `SetID`, `GSID`,
  `ProductOption`, `ItemNumber`, `Year`, `MintMark`, `Description`,
  `Variety`, `Coins`, `FaceValue`, `Composition`, `Key/Notable`, `Mintage`,
  `Notes`, `MfgProductID`, `ContainerName`, `Lineage`, `SetScope`.
- **DB_Sets sheet has no `Category` column at all** — `category` always
  derives from `Lineage` now (previously an "in case it exists" guess with
  a `Category`-first fallback; simplified to a permanent fact about this
  sheet, not a guess anymore). `productCode` still has no confirmed real
  equivalent (`ProductOption`/`ItemNumber` are the closest real columns,
  unconfirmed) — left as a harmless miss since nothing in this branch's
  swapped call sites reads it; `matchDbSetsByProductCode()` (Add Set's own
  lookup) reads `FAKE_DB_SETS` directly and is untouched/out of scope.

**Still-open, real, pre-existing data gaps (not column-naming bugs — these
were already known, not something this task fixes):**
- **`SetID` linkage is sparse (~28/386 real rows) and DB_Sets-side SetID
  linkage for the checklist "isn't populated yet" at all** — per the "Sets
  tab: completeness checklist" section below, every checklist tile will
  likely still show unowned/hollow against live data, exactly like the demo
  data does today. A separate future data-reconciliation project, already
  tracked elsewhere in this file/ParkingLot.
- **Photo-presence is approximated from filename-column truthiness**
  (`hasObversePhoto`/`hasReversePhoto` from whether `Obverse`/`Reverse` are
  populated), not a real "does a file actually exist at this path" check —
  same class of approximation the app already makes elsewhere.
- **A blank/malformed row never throws.** A stray fully-blank sheet row (no
  `CollectionID`) maps to an empty `id` and is filtered out
  (`ensureLiveNavDataFetch` drops any mapped coin with no `id`, and any
  mapped DB_Sets row with no `Lineage`); every other field defaults to `""`/
  `0`/`false` rather than `undefined`/`NaN`, verified directly (see below).

**New, flagged but NOT acted on:** the live workbook now also has a
standalone **"Sets" tab** (`Status`, `Year`, `Variety`, `Description`,
`Lineage`, `SetID`, `FilledBy`) that didn't exist when this branch was
built. Nothing in this feature reads it — deliberately untouched per Ray's
explicit instruction ("don't touch anything for it now"). Worth keeping in
mind once real data is actually live: this new tab may turn out to be a
better/more-populated source for the Sets completeness checklist's ownership
signal than the sparse `All.SetID` linkage described above — but that's a
separate scoping decision for a future task, not assumed or acted on here.

**Verified headless** (`verify_live_nav_data.js`, 28 assertions, all pass;
full 11-suite regression re-run clean alongside it): the feature is
completely inert by default (no dormant MSAL instance, `getLiveNavToken()`
never redirects, `ensureLiveNavDataFetch()` is a no-op, `activeCoins()`/
`activeDbSets()` return the `FAKE_*` arrays); `colVal()`'s candidate
fallback; `mapWorkbookRowToCoin()`/`mapWorkbookRowToDbSet()` against a
normal row, a "Various"-year Roll row (stays a string, never `NaN`), a fully
blank optional-fields row (no throw, sane defaults), the confirmed
`Value`→`SpotValue` fallback order, confirmation that a lone `EstValue`
value is correctly ignored (defaults to 0), the confirmed exact-header
`OriginSetID` read, and a no-`CollectionID` row (empty, filterable `id`); a
dual-lineage (comma-separated) DB_Sets row mapped via the confirmed
`Description`-based name still works with `dbSetLineageIncludes()`; and —
the real end-to-end check — setting `LIVE_COINS`/`LIVE_DB_SETS` directly
(standing in for a real fetch resolving, since the actual Graph/MSAL network
calls can't be exercised from this environment) and confirming
`coinsTabBaseRows()`, `medalTabBaseRows()`, the Rolls page's actual rendered
grid, and `ownedSetForSetId()` all genuinely read through the live data,
then confirming the fallback correctly restores once the live data is
cleared. **No live OneDrive session was available this session** — the
column names above were confirmed by Ray reading the real workbook directly
(not by this environment fetching it), so the remaining unverified piece is
the actual Graph/MSAL network flow itself (first-load sign-in redirect,
real response shape) — same "needs a real click-through" caveat already
attached to every other real-Graph feature in this file (Reference Images,
the Add Set write layer, the workbook web-link).

**Extended (small-fixes batch): real Metal filter via a DB_Coins/
Lookup_MetalContent join.** The Catalog/Rolls Metal pills previously did
nothing real — `metalCategoryFor()` only ever read the sparse, hand-authored
`FAKE_METAL_CONTENT` mockup lookup by CollectionID, with zero connection to
any real workbook column, for either demo or live coins. Root cause
confirmed against the real workbook (Ray): there's no direct Composition
field on `All`, and `DB_Coins.Composition` itself is too granular/messy to
filter on directly (22 distinct raw values — `"90% Silver"`, `"90% Silver,
10% Copper"`, `"35% Silver"`, `".999 Fine Silver"`, etc.). The real,
pre-bucketed join already exists in the workbook: `All.CoinID ->
DB_Coins.CoinID -> DB_Coins.MetalContentType -> Lookup_MetalContent.CoinType
-> Lookup_MetalContent.MetalCategory` (exactly 7 clean values: Silver, Gold,
Platinum, Copper, Clad, Zinc, Other — Palladium is deliberately bucketed
under Other per an existing note in `Lookup_MetalContent`, not a gap).
- `ensureLiveNavDataFetch()` now also reads `DB_Coins` and
  `Lookup_MetalContent` (four sheets fetched in parallel: `All`, `DB_Sets`,
  `DB_Coins`, `Lookup_MetalContent`) — same `Files.Read` scope, same
  `ENABLE_LIVE_NAV_DATA` gate, still `false`/localhost-only by default (no
  production redirect URI exists for this feature, unchanged). Built under
  the existing gate rather than held for separate review — it's an
  incremental extension of an already-reviewed/merged read pattern, not new
  architecture, and stays exposure-free in production either way.
- Both new sheets were originally used only to build two lookup maps
  (`CoinID -> MetalContentType`, `MetalContentType (as CoinType) ->
  MetalCategory`) at fetch time and then discarded, with no `LIVE_*` cache
  or `activeX()` accessor of their own. **`DB_Coins` is superseded** — it's
  now cached as `LIVE_DB_COINS` behind `activeDbCoins()`, because every
  DB_Coins match in the app (`findDbCoinsMatch`, `dbCoinsCandidatesFor`,
  and so the Browse Edit CoinID re-link) was silently running against the
  12-row `FAKE_DB_COINS` mock. See "Browse Edit real write layer" → Bug C.
  `Lookup_MetalContent` is unchanged and still map-only.
  `mapWorkbookRowToCoin()` also gained a `coinId` field (`All.CoinID`, same
  confirmed-header convention as
  `CollectionID`/`Denomination`/`Year`/`MintMark`/`SerNo`) as the join key.
- `metalCategoryFor(coin)` now checks `coin.metalCategory` first (set only
  on live-fetched coins) before falling back to the `FAKE_METAL_CONTENT`
  mockup — so demo-mode behavior is completely unchanged, and a live coin's
  Metal pill filtering is now real.
- A coin with no `MetalContentType` match (or a broken link anywhere in the
  chain) gets a blank `metalCategory` — the existing Metal filter's "Other"
  pill test already treats blank the same as an explicit `"Other"`
  (`!m || m === "Other"`), so this falls under Other automatically. Confirmed
  with Ray as the expected behavior — no new fallback logic was needed.
- Not verified against a real OneDrive session this task (no live session
  available) — same "needs a real click-through" caveat as the rest of this
  feature. `DB_Coins.CoinID`/`MetalContentType` and
  `Lookup_MetalContent.CoinType`/`MetalCategory` column names were given
  directly by Ray as confirmed against the real workbook, not independently
  re-verified from this environment.

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

## Session log — carried-forward state (not app architecture, tracked here for continuity)

### ParkingLot entries to transfer (4 rows, as of 2026-08-23)
**Needs adding to the workbook's ParkingLot sheet — logged here because this
coding session has no write access to the live OneDrive workbook.** Recorded
verbatim in ParkingLot's own column shape (Item/Title, Category, Priority,
Date, Description, Status), same shape as the existing "Copper color
designations (RD/RB/BN)" future-pass row. Row 1 supersedes the earlier
2026-08-17 version of this same entry with Ray's own canonical wording
(same underlying item, not a new one — don't add both).

**Row 1:**
- **Item/Title:** `Physical FB check pass on owned Mercury dimes`
- **Category:** `Data`  · **Priority:** `Medium`  · **Date:** `2026-08-17`
- **Status:** `Open`
- **Description:** `Matcher narrowing treats a blank All.Designation as meaning "not Full Bands" for Mercury dimes, which is correct for resolving CoinID links but doesn't confirm the physical coin actually lacks Full Bands. Owned Mercury dimes not yet inspected should get a coin-by-coin physical FB check, same shape as the deferred copper-color (RD/RB/BN) pass. Not urgent, not blocking any current work.`

**Row 2:**
- **Item/Title:** `Catalog grid/list view drops distinguishing catalog fields`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-22`
- **Status:** `Open`
- **Description:** `Catalog's grid and list views don't surface fields that distinguish otherwise-identical-looking catalog entries. Confirmed for two cases: Designation (FB Mercury dimes show bare Grade, e.g. "MS-64" instead of "MS-64FB") and Variety (1909 VDB vs non-VDB Wheat cents both show plain "1909 Wheat 1C" with no way to tell them apart). Individual Browse detail's flip card handles both fields correctly — only Catalog's grid/list views are missing them. Not blocking, cosmetic/data-clarity issue only.`

**Row 3:**
- **Item/Title:** `Add Coin album assignment is captured but never acted on`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-23`
- **Status:** `Open`
- **Description:** `Add Coin's "Assign to Album" selection is now recorded on the Phase 1 Staging coin draft (assignAlbum), but nothing consumes it — no slot is filled, and the separately-specced post-save Albums matching flow (offer to fill a matching open slot; surface both coins on an already-filled slot; never auto-fill silently) is still unbuilt. Deliberately NOT scoped into any Add Coin write-layer phase: it is UX polish on a save that already works, not core to logging a coin. Pick up whenever. See CLAUDE.md "Post-save Albums matching" for the behaviour already agreed.`

**Row 4:**
- **Item/Title:** `Cert/serial duplicate check against owned coins`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-23`
- **Status:** `Open`
- **Description:** `Feature suggestion from the Add Coin Phase 1 live-run session, not a bug: nothing today cross-checks a PCGS/NGC cert number entered on a new coin against SerNo on already-owned coins to flag a likely duplicate entry (a coin re-added by mistake, or a cert typo colliding with a real existing coin). Could live in Add Coin's live matcher (a warning banner alongside the DB_Coins match banner) or as a save-time check. No design work done yet — flagging the idea, not scoping the build.`

**Row 5:**
- **Item/Title:** `Restructure Add Coin's field layout to match Edit Coin's accordion sections`
- **Category:** `App`  · **Priority:** `Medium`  · **Date:** `2026-08-23`
- **Status:** `Resolved`  · **Resolved Date:** `2026-08-24`
- **Resolution:** `BUILT — see CLAUDE.md "Add Coin: accordion restructure". Add Coin is now Grading & Certification + Overview / Photos / Notes & Facts / Purchase Details / Storage, matching Edit Coin. Specifications deliberately omitted (Ray's call). Held on claude/add-coin-write-path-fs2rf8 pending his go-ahead + a live retest pass. If this row was never transferred to the workbook in the first place, skip it rather than adding-then-closing it.`
- **Description:** `Ray's explicit ask (Add Coin batch 7 review): Add Coin should look nearly identical in structure to the Edit Coin / Browse detail page (see "Detail/Edit accordion redesign" — RECORD_SECTIONS: Overview, Photos, Specifications, Notes & Facts, Purchase Details, Storage), rather than its current one long flat form. Grading Service specifically should become its own clearly-bounded section (a real card/accordion, not just a text label) since it functionally drives the PCGS Label #/Cert-Type-Number fields beneath it, and should stay positioned near the top since a grader needs to be picked before the label-decode flow can run. This is a real, deliberate restructure — needs its own scoping pass (which fields land in which section, whether Purchase Details/Storage's existing drill-down pattern is kept or folded into the new accordion shape) before building, not a quick follow-on to the batch-7 header removal. Explicitly deferred, not started.`

**Row 6:**
- **Item/Title:** `Saved-coin flip card: BL (Grade+Designation) corner has no overflow protection`
- **Category:** `App`  · **Priority:** `Low`  · **Date:** `2026-08-30`
- **Status:** `Open`
- **Description:** `Found while measuring the composition-corner restack (see CLAUDE.md "CACBean UI, Value field rounding, composition corner restacked"): applyFlipCorners()'s BL corner (Grade+Designation, concatenated with no space) is plain textContent with no shortening logic at all — unlike TR (renderTypeDenomCorner()'s last-word-drop) and now BR (the composition split/reduction chain). A long free-typed "Details"-graded value (e.g. a PCGS Genuine-holder note like "XF Details - Improperly Cleaned") measured a genuine overlap with an unreduced BR value at 360px width before the BR restack (-9px gap); the restack fixed the specific collision by shrinking BR, not by giving BL any protection of its own, so a sufficiently long BL string could still in principle run close to whatever's in BR. Ray's explicit call: flag it, don't fix it here — out of scope for the composition-corner task. Would need its own scoping pass (truncate? shorten to last word like TR? something else for a Grade+Designation string specifically) if ever picked up.`

### 17Jul2026 (chat session, reported after the CollectionID-reservation merge)
- **Workbook snapshot as of Copilot's morning briefing**: `All` sheet 532 rows,
  max CollectionID `AY-00663`, 16 rows still missing a CollectionID (blocked on
  the set-restructure). `DB_Coins` 3,760 rows, 0 duplicate CoinIDs. Albums 419
  slots across 6 albums (Roosevelt Dimes 1946-1964 at 12/48 filled).
  `PCGS_Duplicate_Queue` essentially resolved (197 items closed). ~79 open
  ParkingLot items. **Treat as a point-in-time snapshot, not current fact** —
  re-check before relying on any of these numbers, same caution CLAUDE.md
  already gives for any pulled copy of DB_Coins.
- **Two stale Copilot findings caught and sent back for re-verification**
  (not new gaps): (1) SpotValue formula — already built and deployed 7/13 on
  `All!Z`, Copilot's briefing proposed it as new work; (2) Albums "17 orphan
  CoinID references" — investigated 7/13, did not reproduce (0 orphan refs
  confirmed then). Don't accept either as a real open item without a fresh
  count.
- **Copilot task list in flight** (sequenced, one research thread at a time):
  re-verify the two stale items above; status-check NGC certification
  research (~93/366 as of last check) and the 3-row OGP Value paste
  (unconfirmed as of 7/16 evening); compile the 59 letter-only-grade rows
  with context (data-gathering only, no conversion decision yet); then
  research the Jamestown/Lincoln Bicentennial/Bald Eagle Recovery
  product-code pairs against PCGS CoinFacts.
- **Explicitly held back / blocked, not forgotten**: GSID Phase 2 (blocked on
  Ray photographing Lincoln Memorial/Wheat/Shield Cent + American Silver
  Eagle Red Book pages); the 158-set restructuring (blocked on Ray choosing a
  priority order — Proof Sets / Silver Proof Sets / Mint Sets / a specific
  year range); American Women Quarters Proof Set identification (needs Ray to
  check his own physical box/certificate); ANACS/ICG/CAC label research
  (parked, no urgency, unchanged from the ANACS/ICG/CAC note above).
- **This session's app-side work** (CollectionID-reservation Promotion/
  Rejection) is documented in full under "CollectionID-reservation system —
  Promotion / Rejection" above; this log entry is only the workbook/Copilot
  side of the same session, which doesn't otherwise touch app.html.
- No direct workbook edits were made by Claude (chat) this session — all
  app-side work went through Claude Code (merged to main, see above); all
  workbook-side work is Copilot's, per the task list above. No new checkpoint
  upload was needed yet — one is recommended once Copilot's current task
  list is confirmed complete.

## Full design history
For the complete session-by-session reasoning behind these decisions, see the
project's Claude.ai knowledge base (Project: "Coin Collection"), particularly
`coin-collection-session-10Jul2026-app-design.md`. This file is the working
summary; that one has the "why."
