# Reference: PLATFORM (moved out of CLAUDE.md in the (am) slimming, 4 Nov 2026)

Read this file when: touching sign-in / MSAL, Graph reads, startup and splash gating, docket.json, the deploy workflow (rollout, testing notes), the PWA, the OneDrive folder layout, receipt-less file conventions, or the test harness rules.
Back to [CLAUDE.md](../../CLAUDE.md). Sections below are verbatim from CLAUDE.md as it was at commit `a7fcb20`; the original line numbers are in [docs/INDEX.md](../INDEX.md).

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
  `stage.html` → its own `.../stage.html`; `app.html` → **both**
  `http://localhost:8791/app.html` (local dev) **and**
  `https://salty224.github.io/coin-collection-app/app.html` (production —
  confirmed registered; superseded the earlier "no production redirect URI
  exists yet" note). `app.html`'s own `redirectUri` is derived at runtime
  from `window.location.origin + window.location.pathname` rather than
  hardcoded to either one — see "Real-Graph flags always on; WRITE_TARGET
  is the actual safety boundary" below for why a single hardcoded path
  can't cover both (the two launch modes have different paths, not just
  different origins).

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
- **SUPERSEDED — enabled by default now** (`const ENABLE_REFERENCE_IMAGES = true`).
  See "Real-Graph flags always on; WRITE_TARGET is the actual safety
  boundary" below for why and what changed (a dynamic `redirectUri` plus a
  now-registered production Entra redirect URI). The paragraph below is
  kept as history — it's still the accurate account of the incident that
  originally justified disabling this, and the guard-rail mechanism it
  describes (the two real choke points) is unchanged. The 7/15 localhost testing
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
  **Superseded — no re-enable step needed anymore**, since the flag ships
  `true`. To test locally: run a local server on port 8791 from the repo
  root (e.g. `python3 -m http.server 8791`) and load
  `http://localhost:8791/app.html` — the first coin render needing an image
  will redirect to a real Microsoft sign-in and back, using the already-
  registered localhost redirect URI. Nothing needs setting back before
  merging/deploying; the same flag value is correct in both places now.
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
(Corrected 4 Nov 2026 in the (am) slimming: "This whole feature depends on the Graph API write layer being built first — none of it functions until that exists" and "every Save button in the app is currently a stub" are stale: the write layers are built (see docs/ref/WRITE_LAYER.md and ADD_COIN_WRITE.md).)*
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
     `_reverse_original.jpg`) — **never deleted**. **One documented
     exception, Ray-approved: Purge deletes it too** (see "Former Holdings
     sub-catalog + Purge"). This rule exists to protect re-cropping an
     OWNED coin, which cannot apply to an exited one — and the raw is
     usually the larger file, so leaving it would orphan the bigger half.
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

## Startup connection, docket.json, and the no-demo-data rule (04 Oct 2026)
(Corrected 4 Nov 2026 in the (am) slimming: the "NEXT branch's scope — the remaining demo data in a live session" list is not a branch; it is backlog item (ap) 2.3.)*
Built on `claude/dreamy-turing-2vyo06` (commits `018c29d`..`9a4d70c`, plus this
documentation commit), live-tested by Ray on desktop Chrome (normal load, a
request-blocked load reaching the 25-second error screen, the request count,
and Retry loading in place), and fast-forwarded to `main` on his go-ahead.
The regression suite for all of it is `tests/verify_startup_connection.js`.

### Startup connection behavior
- **Timings** (named constants, retunable in one line): per-request timeout
  `SPLASH_REQUEST_TIMEOUT_MS` = 12 s on each of the nine sheet reads and the
  Docket read; overall splash wait `SPLASH_DATA_TIMEOUT_MS` = 25 s before
  "Couldn't connect"; `SPLASH_SLOW_NOTICE_MS` = 5 s before the status reads
  "Still connecting…"; Docket grace `SPLASH_DOCKET_GRACE_MS` = 2 s. The 25 s
  must stay above 2 × 12 s so one request that times out still leaves room for
  a fresh attempt. Tests shorten these via `__setSplashTimingsForTest()`; the
  backoff scales with a shortened overall wait so they stay fast.
- **Root cause of the original "Couldn't connect, Retry doesn't help"**:
  nothing had a timeout, and `ensureLiveNavDataFetch()` / `loadDocketQueue()`
  hand every caller the same in-flight promise, so one Graph request that
  never answered held every later attempt, Retry included, until a reload.
  `withRequestTimeout()` now puts token + request + body under one
  AbortController deadline; a timeout is an ordinary failure and failures are
  never cached, so the next attempt is a fresh request.
- **Retry** aborts every in-flight startup read (`abortStartupRequests()`),
  drops both shared in-flight promises, bumps their generation counters
  (`liveNavFetchGeneration`, `docketQueueGeneration`,
  `liveNavOptionalGeneration`) and starts fresh. A superseded fetch settling
  later touches nothing. Already-loaded data is never cleared.
- **Late data clears the error box**: an attempt still in flight when the
  error shows is honoured, and the 400 ms check keeps looking for arrived data
  (without sending anything), so the splash clears on its own.
- **Backoff**: the 400 ms check only SENDS a fresh set of reads when nothing
  is in flight, the backoff since the last send has elapsed, and fewer than
  `SPLASH_MAX_ATTEMPTS` (6) have gone out. `SPLASH_BACKOFF_MS` = 2 / 4 / 8 s
  (last repeats), measured from each send. A fast-failing network now sends 5
  attempts / ~50 requests in the 25 s window instead of 62 / ~620 (Ray
  measured 626 before the fix). Retry starts at once with a new schedule. A
  429/503 Retry-After is honoured (`noteRetryAfter()`); it is inert if Graph
  doesn't expose that header to the browser (not verified).
- **Missing non-essential sheets** (Photos, Receipts, Albums, Wishlist) no
  longer block startup and no longer stay missing: once core data is loaded,
  the next `ensureLiveNavDataFetch()` call (the next navigation) refetches
  ONLY the missing ones in the background (`refetchMissingLiveNavSheets()`),
  with the same 12 s deadline, and merges them in. Core sheets (All, DB_Sets,
  DB_Coins, Lookup_MetalContent, Lookup_Graders) are unchanged.
- **Docket fast-fail**: once core data has loaded and the 2 s grace has
  passed, a failed Docket read counts as ready and the splash clears. The
  failure is never cached. The drawer fob and the Research count show **"?"**
  (unknown), never "0"; the hub re-renders on its own when a later read
  succeeds (`docketCountUnknown`).
- `getJson()` reads the body as bytes first and throws a distinct
  `EmptyBodyError` (status + byte length) for an empty body; the Docket read
  logs `Docket queue read: HTTP <status>, <n> bytes` and shows it in the
  splash's diagnostic detail.

### docket.json handling (`{stagingBase}/_Docket/docket.json`)
- **Valid empty content**: `{"type":"docket-queue","version":1,"entries":[]}`
  (the app also writes `updatedDate`; on read only `type` and `entries` are
  checked).
- **Missing file (404)** = empty queue (first run); the first add creates it.
- **0-byte file** = a failure: count shows "?", adds are kept in memory only
  (Browse Edit toasts "couldn't save it to the Docket file"), and the app
  **never repairs it**. Ray's case (04 Oct 2026, `_Testing` COPY): the file had
  been emptied by hand in OneDrive. No app code path can write an empty file
  (the only writer, `saveDocketQueue()`, always sends a stringified queue).
  Fix by deleting the file or replacing it with the valid empty content above.
  Possible later improvement (not built): on an empty body, check the item's
  `size` via Graph metadata — 0 means genuinely empty (treat as an empty
  queue), >0 means a dropped transfer (keep treating as a failure).
- **Known risk (backlog)**: a file that parses but has the wrong `type` (e.g.
  `{}`) is read as an empty queue, and the next add **overwrites** it.

### Standing rule: no demo or filler data in a live session (Ray)
The app runs on real data (today the `_Testing` folder / COPY workbook). In a
live session NO demo or filler data is shown unless it stands in for a
feature that is not built yet. `liveDataMode()` classifies the session:
`"live"` (MSAL loaded and an account signed in), `"offline"` (MSAL never loaded
or live data off — the offline mockup, demo data by design), `"signed-out"`
(MSAL loaded, no account yet; transient before the sign-in redirect; left
showing the mockup). **Albums comply**: in a live session `activeAlbums()` is
empty until real albums load, the Albums screen shows "Albums are still
loading…" / "Couldn't load albums; will try again when you reopen this
screen", and the Belongs-to chip, the book and Add Coin's "Assign to Album"
show nothing meanwhile. `FAKE_ALBUMS` and the offline mockup are untouched.

**NEXT branch's scope — the remaining demo data in a live session:**
- (a) Placeholders for unbuilt features: Wishlist screen (`FAKE_WISHLIST`; no
  live Wishlist screen read), Grading Help (`FAKE_GRADING_HELP` *(removed Oct 2026; it could never match)*; guidance not
  written), pending-coin banner (`FAKE_PENDING_COIN`, null; reconciliation not
  built), Add Coin Error dropdown (`FAKE_LOOKUP_ERRORS`, 8 of 42; no live
  Lookup_Errors read) *(fixed Oct 2026, held: see "Add Coin Error dropdown:
  real Lookup_Errors list")*.
- (b) Built features that fall back to demo data: the `activeCoins()` /
  `activeDbSets()` / `activeDbCoins()` / `activeLookupGraders()` fallbacks
  before core data loads or when it fails; **`FAKE_COIN_DETAILS`** (Seller,
  Purchase Date, Receipt, Notes, Fun Fact fill blanks on real coins whose IDs
  collide — `renderBrowseDetailPanel`/`renderDetailAccordions`,
  `catalogFunFactFor`, `showBrowseEditViewInner`); **`FAKE_GALLERIES`**
  (`galleryFor()` seeds demo photo entries by ID); **`FAKE_SET_FACTS`** (Set
  Details facts by ID); **`resolveCoinSetLink()` *(removed Oct 2026)*** (it always searched
  `FAKE_COINS`; gone with the SetID chip, so no longer a demo-data path); `FAKE_SET_CHILDREN` (second tier of `setChildrenFor()`);
  `FAKE_METAL_CONTENT` (before live coins load); `FAKE_LOOKUP_GRADERS` read
  directly by the grader lists (a static copy of the real table).
  `FAKE_GRADES` and `FAKE_DENOMINATIONS` are static copies of real reference
  tables, not filler.
- **Ray's live finding**: real coin AY-00001 shows a demo Fun Fact, demo
  "yours" Notes and demo gallery entries, while the workbook has blanks there.

### Live-test technique
Chrome DevTools request blocking is now under **"Request conditions"** and
needs a valid URL pattern such as `https://graph.microsoft.com/*`. A bare
`*graph.microsoft.com*` pattern is invalid and blocks nothing.

### Backlog found during this work (not built)
- An open album book can mix two albums after a live album-list refresh that
  changes positions (the book holds a list position, not the album itself).
- Add Coin's "Assign to Album" selection resets when Albums/Wishlist arrive late.
  *(Fixed by `0a74901`, Oct 2026: `populateAssignAlbumOptions` keeps the current
  choice across a rebuild.)*
- The Docket screen does not re-render when Photos arrive late.
- A full-screen photo viewer opened from a demo gallery entry with no image
  gets stuck: Escape and scrolling don't close it.
- Navigation fetches (Catalog, Albums, Ledger) do not back off after a failure.

## The build decides its data target: rollout order, testing notes, known effects (continuation)

**Rollout order (agreed, all five steps completed 17 Oct 2026).** (1) merge the app branch while Pages is still on
the branch source — that deploy is unstamped, so it runs as TEST exactly as
before; (2) Ray switches Pages to "GitHub Actions"; (3) merge the workflow
branch (no push trigger, so nothing deploys); (4) Ray deploys a feature
branch first (stamped, still TEST) to prove the stamping; (5) Ray deploys
`main` → LIVE.

**Testing notes.** The raw `app.html` is unstamped, so every suite runs as
copy, exactly as before. `tests/verify_build_decides_target.js` proves the
LIVE case by serving a stamped temp copy at the real Pages URL through
Playwright request interception, with every outside request (Graph,
Microsoft sign-in, the MSAL CDN) aborted.

**Known effects, accepted.** (a) TEST builds only: at 1024×768 an open album
needs about 8px of scroll, because the album row budget leaves 16px spare and
the bar takes 24px; LIVE is unchanged. `verify_album_book_layout.js` F1–F8
measure with the bar hidden for that reason. (b) Going LIVE turns on every
writer against the real workbook at once; the deferred bugs (silent file
overwrite on slab/reference/receipt captures, the receipt re-capture message,
extra-column blanking on Photos/Receipts row replace) are still unfixed on
`main`. *(The photo overwrite and the Photos-row replace blanking are fixed on
`claude/photos-wait-for-save`, merged to `main` 27 Oct 2026: see "Replace
never overwrites a photo file" and C1's in-place Replace. Receipts are not:
backlog (t). Past LIVE overwrites: backlog (v).)*
(c) The Staging ID-reader fix was dropped: Ray moved his hand-made Staging
folders into a separate "Manual Staging" folder, so Staging holds only the
app's own folders and `_Docket`.

## Regression suites are COMMITTED (locked in — supersedes the scratchpad convention)
(Corrected 4 Nov 2026 in the (am) slimming: "Only the Add Coin Phase 1 suite is committed so far (69 assertions)" is stale: 89 suites, 4681 assertions pass at `bfe52cc`.)*
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
about the SHIPPED artifact: no outside dependencies; repo files beside
app.html are allowed (`vendor/pdfjs/` is the first — see "Receipt PDFs:
pdf.js on demand"). Test tooling is dev-time and `node_modules/` is
gitignored. **Correction:** GitHub Pages does NOT ignore `tests/`,
`docs/`, `package.json` or this file — the deploy workflow uploads the whole
checkout, so they are publicly served. Harmless, but don't put anything
private in the repo on the assumption that it isn't. (MSAL still loads from
the jsdelivr CDN — the one existing outside dependency, see Azure / Entra.)

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

**Three rules worth keeping:**
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
- **Every new suite uses the shared check helper and starts with a must-fail
  self-check (standing rule, Ray, 26 Oct 2026).** The harness gives each
  suite `check(label, cond, data)` (label first; a non-string label is
  itself a failure) and `selfCheck(fn)`. A new suite's first line is
  `const ok = check; selfCheck(ok);`: one deliberately false check that must
  fail (counted as a pass only if it did) and one true check that must pass.
  Reversed check arguments have made a brand-new suite pass everything
  twice; with the self-check such a suite fails by name instead.

**Test speed (an), built 6 Nov 2026 on `claude/test-speed-an`, merged to main by fast-forward to `1eefde8` (code last at `938f30f`) after Ray's one-minute TEST check passed; on LIVE in `8622d7d` (Ray deployed main, 6 Nov 2026)** (plan, Ray's answers Q1-Q8 and the frozen scope: docs/BACKLOG.md (an)). Nothing in a suite's assertions changed; only waits and the harness.
- **Run suites by name.** `npm test -- <word ...>` runs the suites whose file name (without `verify_` and `.js`) or suite name contains any word (any case); `npm test -- --list` prints the names; an unknown word or option exits 2. A filtered run prints "FILTERED RUN: N of 92 suites ... Not the baseline"; the 92-suite totals are only for a plain `npm test`. (`tests/run-all.js`.)
- **The ready flag.** app.html's INIT block wraps each startup promise it launches (`renderNeedsAttentionHub`, `updateStagingBadge`, `refreshCoinDraftCache`, `updateInProgressSetsBadge`, `processPromotedSetDrafts`, `processPromotedCoinDrafts`) in `trackStartup()` and raises `window.__appReady` from `Promise.allSettled`, so it waits for ALL of them, a rejected one included. A wrapper signals when its promise settles and then rethrows the reason, so an unhandled startup rejection is still a page error. Nothing in the app reads the flag; it changes nothing the user sees or does. It means "the startup work launched at INIT has settled", not "data loaded" or "splash gone". Proved by `node tests/controls/ready_flag_control.js` (not a suite, not run by `npm test`): one startup promise rejects at once while another is pending; the flag stays unset until the pending one settles, the rejection still reaches the page, and a deliberately naive variant (`Promise.all(...).finally`) is caught.
- **In suites.** `openApp` waits for the flag (10 s ceiling; a miss is a recorded suite failure) instead of a fixed 600 ms. After your own `page.goto` of the app call `appReady(page)`. `openApp(viewport, { blank: true })` returns a page with the collectors and no navigation, for a suite that serves a stamped copy (deploy-workflow, build-decides-target load it once, not twice). The build-info.json check is fire-and-forget with no completion signal, so those two suites keep a short 300 ms look after `appReady`.
- **The crop "Stage 2" idiom.** After tapping `bgCropUseBtn`, do NOT wait a fixed time for the circle adjuster: the pipeline decides in the same task that hides the crop overlay (`runCropPipeline` `onComplete` calls `openPhotoAdjust` only when `def.flipSource`, and `openPhotoAdjust` un-hides its overlay before its first `await`). So wait for `bgCropOverlay` to be hidden, then look at `photoAdjustOverlay` (image-chooser, addcoin-shared-photos, guided-crop, save-only-when-changed, staging-edit-photos, staging-replace-keeps-old). The adjuster's `photoAdjustState` is set later, in the image's `onload`, so wait for that too before clicking Use (crop-from-upload).
- **Rules for new waits.** Wait on the condition with a generous ceiling (10 s); never size a timed wait for a thing that may not happen. verify_crop_from_upload and the staging-replace-keeps-old waits use 10 s ceilings (the old 2 s / 600 ms / 3 s and 4 s budgets are what ran out under load).
- **D9** in deploy-workflow compared `appSrc.split("\n")[i]` inside a filter callback (quadratic, about 90 s); the lines are split once now.
- **Part 3 (one shared Chromium) was dropped**: it saves about 18 s of 957 s, and `browser.newPage()` already isolates each page in its own context.
- **Measured**, full `npm test` on the `b0e02d6` code: 957 s before and 640 s after (both 4804 / 0 / 0 / 92); per-suite times and what was left alone are in BACKLOG (an). Every one of the 92 per-suite pass counts is identical after each part. To compare a run with the baseline, save the `PASS` / `FAIL` lines of two runs (`grep '^PASS\|^FAIL' | sed 's/^[A-Z]*  //' | sort`) and `diff` them.

**Only the Add Coin Phase 1 suite is committed so far** (69 assertions).
Retro-rebuilding the older suites remains the separate tracked item it
already was — but it now has somewhere permanent to land, so it can be
chipped at incrementally instead of needing one big rebuild.

## Device cache (ao), Stage 1: load report and workbook version probe (6 Nov 2026, branch `claude/device-cache-ao`; MERGED to main 7 Nov 2026)
Plan, Ray's answers and the stop-or-continue rule: docs/BACKLOG.md (ao). Stage 1 is READ-ONLY: nothing is cached, nothing is blocked, nothing is written. It exists to measure what the launch costs on the S25 and whether the workbook's OneDrive version moves promptly after an edit; Ray decides from the numbers whether Stages 2-3 are built. Do NOT start Stage 2 until Ray says so.
- **Per-sheet measurement.** `fetchWorkbookSheetRows()` records `ms` (from sending the request to having the whole body; the token wait is excluded) and `bytes` (the body's UTF-8 length, via `readJsonBodyMeasured()`; uncompressed JSON, because the browser can't see the gzipped size of a cross-origin Graph response) in its `liveNavDataDiagnostics` "ok" entry. The splash's diagnostic text is unchanged (it prints bytes only with an HTTP status, which "ok" entries don't carry).
- **Launch read report.** `ensureLiveNavDataFetch()` passes the 11 results, in `FULL_READ_SHEETS` order, to `noteFullReadReport()` once per read that was not superseded by Retry (inside a try, so the report can never stop the load). The LAUNCH read is the first one in which the five core sheets all arrived; earlier failed reads are counted ("; 1 failed attempt before it"); a read with no token at all (mid sign-in) is ignored. A forced read (`refreshLiveCoinsAfterWrite()`) is "refresh after a save" and gets its own line; the launch line is kept. Wall time is from the start of the 11 parallel reads to the last answer, token included.
- **Version probe.** `fetchWorkbookVersion()`: GET `/me/drive/root:/{writePaths().workbook}?$select=id,eTag,cTag,size,lastModifiedDateTime` (a OneDrive item lookup, not an Excel request; `getLiveNavToken()`, the 12 s request deadline, `cache: "no-store"`). `checkWorkbookVersion()` keeps up to 20 checks (`workbookVersionChecks`) and marks each field CHANGED / same against the previous successful check; taps while one is out share it. The Docket's first visit after the launch read checks once on its own, and only in a live session (`onDocketShownForLoadReport()`, called from `navigateNow`'s Docket branch); after that only the button checks.
- **On screen.** `#docketLoadReport`, just ABOVE the Docket's Build line (the Build line stays the last thing on the screen: build-decides-target L3), same small gray text: "Launch read (HH:MM:SS): 11 of 11 sheets, 2.9 MB, 4.2 s (slowest All 3.8 s)"; "Last full read, refresh after a save (…)" when there is one; a "Per sheet" list (size, seconds, rows, or "not read (kind)"); "Workbook version: HH:MM:SS · last changed 6 Nov 14:32:05 · eTag …(last 6) · cTag …(last 6) · size 1,843,201 · 0.3 s" with CHANGED / same after each field from the second check on; a "Check again" button ("Checking…" while out); "Version checks this session (N)", newest first. Hidden, with nothing requested, in the offline mockup (`liveDataMode()` not "live" and no report). Shown in TEST and LIVE builds alike. `renderLoadReport()` keeps an open list open across redraws.
- **Left alone on purpose:** `LIVE_NAV_DATA_SHEETS` (the splash's diagnostic list, still nine sheets: backlog (av)); the splash; every write path; the deadlines. The report uses its own `FULL_READ_SHEETS`.
- **Tests.** `tests/verify_load_report_ao.js` (29 checks; shared check helper, must-fail self-check): UTF-8 bytes, not characters (a body holding "Café"); per-sheet time; the launch report (order, counts, total bytes = sum, slowest, the "not read" sheet, the line's exact shape); refresh after a save; no-token ignored, failed attempt counted, Retry-superseded reports nothing; Docket placement and per-sheet list; exactly one automatic version check, its exact URL (no `/workbook/` segment); CHANGED / same; the check list; HTTP error and timeout; only GETs sent; hidden and silent in the mockup. Negative controls (run by hand, 6 Nov 2026): against main's app.html the suite fails (the seams don't exist); bytes counted as characters turns L2 red; dropping the no-token rule turns L10 and L12 red; an automatic check outside live sessions turns L27 red.
- **Not verified:** everything on a real device (that is what TEST steps 1-3 are for); the real shape of OneDrive personal eTag / cTag values (the screen shows the last 6 characters; CHANGED / same compares whole values); whether `lastModifiedDateTime`, eTag and cTag move together after an Excel for the web, Copilot or app edit, and how fast.
- **TEST steps 1-3 (from the (ao) checklist).** 1. Open the TEST build normally, open the Docket: note the "Launch read" line (MB, seconds, slowest) and open "Per sheet". Repeat on two or three cold launches (swipe the app away first). 2. Note the "Workbook version" line. Change one cell of a _Testing coin in Excel (by hand or Copilot). Tap "Check again" at about 10 s, 30 s, 60 s and 5 min; note when eTag, cTag, size and "last changed" say CHANGED. 3. Same as 2, but the change is a Save in the app (Edit Coin on a _Testing coin, change one field, Save). An Edit Coin save does not re-read the sheets, so the Launch read line stays as it was; a Promote or a spot-price update does re-read and adds a "Last full read, refresh after a save" line.

## Device cache (ao), Stages 2-3: read-only gate, saved copy, offline view (7 Nov 2026, branch `claude/device-cache-ao`; MERGED to main 7 Nov 2026)
Ray's decisions after Stage 1 (continue; Q3 = A; the Stage 2 diagnostics additions): docs/BACKLOG.md (ao). TEST checklist: docs/DEVICE_CACHE_AO_LIVE_RUN_CHECKLIST.md.

**Invariant 17 (CLAUDE.md): the device's saved copy is display-only.** It is read in exactly one place, a live launch (`launchFromSavedCopy()` -> `applyLiveNavSheetRows()`). Nothing in the write layer reads it: header maps (`ensureAllHeaderMap`, `ensureSheetHeaderMap` via `readTableHeaderRow`), row lookups (`findAllSheetRowNumber`), the Edit snapshot and the conflict re-read (`readAllRowWritableValues`, `readAllRowForWrite`), id minting and the spot-price update all stay fresh workbook reads through `graph()`, exactly as (al) requires. No write starts while the session is offline, can't reach OneDrive, or shows a saved copy that has not been checked (`workbookWritesAllowed()`), and every workbook write deletes the copy before its first request. Honest limit (unchanged from the plan): once the version check says the copy equals the workbook, the copy fills the same in-memory LIVE_* arrays that some write DECISIONS read today (the CoinID matcher's catalog, leftover-draft detection), i.e. exactly as fresh as a launch read.

**Stage 2: session state and the gate.**
- `workbookSession`: `source` ("none" / "workbook" / "saved-copy"), `verified`, `dataAt`, `dataVersion`, `connection` ("ok" / "offline" / "unreachable") with `connectionReason`, `updating`, `checking` / `checkingSince`, `ownWriteSinceData`, `lastCheckAt`.
- The gate: `graph()` returns `gatedGraphClient(activeGraphClient)`, a Proxy built once per client (the mock gets the same gate). The write methods in `GATED_GRAPH_METHODS` (`putContent`, `uploadFile`, `uploadBytes`, `uploadJson`, `deleteItem`, `patchWorkbookRanges`, `addTableRow`) reject with a `ReadOnlyError` (`reason` offline / unreachable / unchecked, message = the approved Save text) while `workbookWritesAllowed()` says no; they are called on the client itself, so an upload helper's own `this.putContent()` is not checked twice. The workbook writes (`WORKBOOK_WRITE_GRAPH_METHODS`) set `ownWriteSinceData` and await `invalidateWorkbookCacheBeforeWrite()` first. Reads pass through (timed while a save runs). **Superseded by Ray's Q2 (7 Nov 2026): the gate is an ALLOW-LIST.** `workbookWritesAllowed()` allows a write only when `workbookSessionChecked()` (verified === true and source "workbook" or "saved-copy") AND the connection is "ok" AND `navigator.onLine` is not false; every other state refuses, the reason only picking the message: offline, unreachable, unchecked, "not-read" (no workbook read yet this session: "Nothing was saved: the app hasn't read the workbook yet. …" / toast "Read-only until the workbook has been read") and "unknown" (any state not foreseen: "Read-only: nothing was saved. …" / "Read-only"). Consequences: in a live session nothing can write before the launch read lands (nothing legitimately does; the startup file moves already wait); the offline demo mockup (no MSAL, no workbook read) now refuses every Save with the "not-read" message (it could never reach OneDrive anyway). Test harness: `waitForAppReady()` (openApp and appReady) puts each page in the state a finished full read leaves (`__setWorkbookSessionForTest({ source: "workbook", verified: true, connection: "ok" })`), because the sandbox never reads a real workbook; session-gate-ao and device-cache-ao set their own states. session-gate-ao G9-G12 prove the allow-list (a not-read session refuses whatever its flag says; `verified: 1` is not `true`; an unknown source or connection refuses); control: the old deny-list turns G10-G12 red.
- Connection: `setConnectionTrouble()` (live sessions only) on the window `offline` event, a failed version check, a failed full read, and an MSAL network failure; `checkSessionAgainstWorkbook(trigger)` on the `online` event, on resume (`visibilitychange`, at most once a minute: `RESUME_CHECK_MIN_GAP_MS`), every 30 s while read-only (`CONNECTION_RETRY_MS`), on Retry and at a saved-copy launch. Same version: nothing re-read (a saved copy becomes checked). Different: `refreshSessionFromWorkbook()` re-reads in the background (`ensureLiveNavDataFetch({ force: true })`, whose redraw already leaves an open album book alone); toasts "Back online · data is current", "Back online · updated from the workbook", "Updated from the workbook" (none after the app's own write).
- A full read's version: `fetchWorkbookVersion()` goes out WITH the sheet reads (no added wait) and is kept as `dataVersion` only when the workbook was last changed more than 2 minutes before the read began (`fullReadVersionTrusted`, `VERSION_MODIFIED_MARGIN_MS`): a change during the read could be in the version but not in the data; the margin also covers a slightly wrong device clock. (The plan said "version before and after the read"; this is equivalent for safety and adds no latency. A lagging version is always the safe direction: an older version for newer data means the next check disagrees and re-reads.)
- Read-only UI: a `#sessionBar` row in the top strip (gray while a saved copy is being checked / updated, amber `.is-trouble` when OneDrive can't be reached; wraps to two lines on a phone; Retry when unreachable). `body.session-read-only` dims `READ_ONLY_SAVE_SELECTORS` and `READ_ONLY_ENTRY_SELECTORS` (Edit, Add Coin / Add Set / Batch Receipt entries, Docket and Staging `.staging-btn` actions incl. Purge, link a coin, spot update, every Save); a capture-phase click listener stops a tap before the feature's handler with `READ_ONLY_SAVE_MESSAGES` / `READ_ONLY_ENTRY_MESSAGES`. Photo and receipt pickers inside an open form are NOT blocked (they write nothing until Save, which is). A form open when the connection drops stays open with everything kept.
- MSAL: `acquireGraphToken()` asks `tokenFailureAction()`; offline or an MSAL network error (`isMsalNetworkError`) never counts towards and never starts a sign-in redirect. Online, today's rules are unchanged.
- Startup draft file moves (`processPromotedSetDrafts`, `processPromotedCoinDrafts`) wait for `whenWritesAllowed()` (a live launch settled and writes allowed; up to 60 s, else skipped this launch); immediate outside a live session.
- Diagnostics (Ray's additions): the launch report keeps every failed attempt before the launch read with its duration and reason (`sheetFailureReason`: timeout / auth (no token) / HTTP nnn / empty body / the error; `noteAbandonedFullRead` for one Retry abandoned) and the launch total; in a live session an all-no-token read is an auth failure and is kept. Save timing: `withEditSaveLock(fn, label)` (Edit Coin, Edit Coin photos / labels, Edit Set photos / labels, Manage Photos), `promoteCoinDraft` and `completeAddCoinSave` run inside `withSaveTiming()`; `saveCoinRowToWorkbook` marks "header re-read", "row lookup", "row re-read for the conflict check", "build the cell edits", "write (N ranges, LastModified last)"; every `graph()` call inside is recorded ("Graph readTableColumn AllCoins CollectionID" …) and each `$batch` POST ("$batch 1 of 2: 20 range writes", "(includes LastModified)"). The Docket shows "Last save (HH:MM:SS, label): N s, outcome, N steps" and a "Save steps" list (+offset name: duration). A `$batch` is one HTTP request, so the PATCHes inside it can't be timed one by one from the browser.

**Stage 3: the saved copy.**
- Store: IndexedDB database `salty-cabinet-cache-{target}` (`workbookCacheDbName`), object store `copy`, key `workbook`, one record: `formatVersion` (`WORKBOOK_CACHE_FORMAT` 1), `target`, `workbookPath`, `buildCommit` (`BUILD_STAMP.commit` or "unstamped"), `accountId` (MSAL homeAccountId), `dataAt`, `readStartedAt`, `savedAt`, `version` {id, eTag, cTag, size, lastModifiedDateTime}, `sheets` (the 11 sheets' raw used-range values, header row included; `sheetRawValues` WeakMap from `fetchWorkbookSheetRows`). Every IndexedDB call has a deadline (`open` 1.5 s) and never throws (`idbWithDeadline`, `idbOpenCache`, `idbCacheGet` / `Put` / `Delete`, `idbDropDatabase`); trouble = no copy = today's launch.
- Saved by `saveWorkbookCacheAfterRead()` from `onFullReadLanded()` only when all 11 sheets arrived, the version is trusted and no app write happened since. Usable only in a live session with MSAL (`workbookCacheUsable()`), so the offline mockup and the test sandbox never touch it unless a test asks.
- Launch (`ensureLiveNavDataFetch`, first non-forced read; `savedCopyLaunchTried`): `loadWorkbookCacheRecord()` drops the other target's database (Q8) and deletes a record with the wrong format, target, workbook, build, account, version or sheets (`workbookCacheRecordProblem`); then `launchFromSavedCopy()` asks the version, the splash waiting up to 3 s (`WORKBOOK_CACHE_DEFAULT_TIMINGS.splash`, Q6). The copy is applied through the same `applyLiveNavSheetRows()` / `rowsFromSheetValues()` as a full read. `settleSavedCopyVersion()`: a match (`savedCopyMatches`: same id, eTag, cTag, size AND not changed in the last 10 minutes, `WORKBOOK_CACHE_RECENT_EDIT_MS`, Q4) makes it checked with no sheet reads; a difference shows "updating from the workbook…" and starts the background re-read after the launch's own promise has finished (started inside it, it would be handed that same in-flight promise and read nothing: found by D7); a failure leaves it read-only with the retry running. "checking with the workbook…" appears only once a check has taken 1.5 s, counted from its start.
- Clearing: other target at launch; bad records; both targets when MSAL has no account (`wipeWorkbookCachesIfSignedOut`, at load, after the redirect is handled); this target's copy before every workbook write (`deleteWorkbookCacheForWrite`; a failure there never stops the write). A header change is a content change, so the version disagrees; the mapping always runs on raw values.
- Docket: `#docketDataLine` above the load report ("Data: checked with the workbook HH:MM (saved copy matched)" / "Data: read from the workbook HH:MM" / "Data: saved copy from Sat 7 Nov 00:15 · not checked") with "Refresh from workbook" (`refreshFromWorkbookNow`: a full read now; toast "Read from the workbook" or "Couldn't read the workbook; nothing changed on screen"); the report adds "Saved copy at launch (HH:MM:SS): matched the workbook in 0.5 s; no sheet reads" / "workbook changed; re-read" / "workbook changed in the last 10 minutes; re-read" / "version check failed (…)" / "saved copy not used (account), deleted", and "Launch read: none (the saved copy was used)".
- Left alone on purpose: no service worker (a cold launch with no network gets the browser's offline page: backlog (at)); images, docket.json, Staging and Ref_SpotPrices are not cached ((as); Q7); `liveDataMode()` "offline" (the demo mockup) is unrelated to the new offline state; `LIVE_NAV_DATA_SHEETS` ((av)).

**$batch / workbook session investigation (Ray's addition 3; investigated only, nothing built).** Findings: (1) Ray's numbers show a fixed 2-3 s per Excel request whatever its size, and the 11 launch reads already run in parallel, so a launch costs about one slow request, not eleven. (2) A Graph JSON `$batch` (max 20 requests) is one HTTP POST, but Graph runs each Excel request inside it separately and answers only when the slowest is done: it removes per-request HTTP overhead (small over HTTP/2), not the Excel wait, and it would make one slow or failed sheet hold back all the others (today an optional sheet never blocks startup). Expected gain small, risk real: not recommended for the launch. (3) A workbook session (`POST …/workbook/createSession`, then a `workbook-session-id` header) keeps the workbook open on Microsoft's side; Microsoft's guidance is that sessions make a series of calls more efficient than sessionless ones. But creating one is itself a serial Excel request before the reads, so for 11 parallel reads it may save nothing or cost time; unmeasured. (4) With Stage 3, a launch whose version matches makes no Excel request at all (only the 0.4-0.7 s version lookup), so the launch is already solved for the common case. (5) The save is the better target: Edit Coin's save is a chain of SERIAL Excel requests (header re-read, row lookup, row re-read, the `$batch` write), so 4-5 x 2-3 s explains 12-15 s; the new "Save steps" list will confirm it on the phone. Recommendation: build nothing for the launch; after Ray's TEST shows the save steps, decide between (aw) a measured, read-only TEST probe of a workbook session and (ax) running the header re-read and the row lookup in parallel inside a save (both in docs/BACKLOG.md, Ray's decision).

**Tests.** `tests/verify_session_gate_ao.js` (41) and `tests/verify_device_cache_ao.js` (38), shared check helper and must-fail self-check each; `tests/verify_load_report_ao.js` updated for the new wording (failed-attempt reasons, the extra version request of a live full read). Negative controls, run by hand (7 Nov 2026), each turned the named checks red: Stage 2 suite against Stage 1's app.html (throws: the seams don't exist); gate removed (`graph()` returns the raw client): G3-G8, T2; MSAL offline rule removed: M1, M2; version always trusted: C10, C11; resume not throttled: C7; taps not intercepted: U4, U5. Stage 3 suite against Stage 2's app.html (throws); an unchecked copy not gated: D8; the header map built from the copy: D18-D20; the other target's database kept: D21; no delete before a write: D24, D25; an untrusted version saved: D23; the 10-minute rule removed: D16.

**Not verified:** all of it on a real device (TEST checklist); IndexedDB in Chrome on the S25 (Ray's browser; corrected 7 Nov 2026, the earlier docs said Samsung Internet), installed app vs a tab, and eviction; the real shape of OneDrive personal eTag / cTag (equality only is used); `navigator.onLine` and the online / offline events on the S25; MSAL's actual error codes when the S25 is offline (matched by code and by message); whether a Graph workbook session would speed reads or saves.

## Device cache (ao): Ray's TEST round 1 and the fixes (7 Nov 2026, `2772a02` + `406fed8`; MERGED to main 7 Nov 2026 after TEST round 2 passed)
Ray's TEST of `000ce08` (S25, Chrome): steps 4, 5 (saved copy matched in 1.2 s, no sheet reads), 6 and 8 passed. Bugs B1-B4 and three display decisions, all built here. **This section supersedes the Stage 2-3 text above where they differ** (the 2-minute margin, the gray "checking…" / "updating…" rows, the toast wording, the report's place on the Docket).
- **B1, Excel's content lags its file version.** Step 7: an Excel for the web edit at 20:16:10; a check at 20:16:50 saw the new version, but the re-read returned the old content (twice more on later returns); a full read at 20:19:32 got the new content. So content lag > 40 s and < about 3.5 min, while the version itself moved within 10 s (Stage 1). Fixes: `VERSION_MODIFIED_MARGIN_MS` is 10 minutes (was 2): a read's version is trusted, and a saved copy kept, only if the workbook was last changed 10+ minutes before the read began, matching the launch rule `WORKBOOK_CACHE_RECENT_EDIT_MS`. "Updated" is shown only when the re-read changed the data: `dataFingerprints` (per sheet, `hashSheetValues`, FNV-1a over every cell) are taken at every full read and at a saved-copy launch, and `refreshSessionFromWorkbook()` returns `{ ok, changed }`. Measuring it: a content-lag probe in Docket > About (`startLagProbe` / `stopLagProbe`, every 15 s for up to 15 minutes reads the version and the All sheet, GETs only; "version changed by …; content changed by …: content lag at most N s after the last-changed time"). **Risk if content lag can exceed 10 minutes:** a read made 10+ minutes after a change could still hold the old content under the new version; it would be trusted, saved as the device copy and matched on later launches, so the old content would show as checked until the workbook changes again or Ray taps Refresh. Writes are not affected by the copy (invariant 17), but every Graph read of the workbook, the write layer's own fresh reads included, would see the same old content during such a lag (that is Excel / Graph behaviour, not the cache's): the conflict check then refuses (safe direction). The probe tells us how long the lag really is. **Measured (TEST round 2, 7 Nov 2026): Excel for the web saves in TWO stages.** An edit at 04:57:01 changed the version by 04:57:11 while the content stayed old for 7 samples; a second version change at 04:59:10 came together with the new content (content lag 129.6 s); an earlier case, 04:46:27 -> 04:48:29, matched. So a read between the two stages carries the first-stage version tag, and the next check sees the second version and re-reads: the design already covers it, and the 10 minutes stay (Ray; Q3 not needed). The app's own Graph save changed the version ONCE (05:06:03), no second stage: Graph writes land in one stage.
- **B2, stale data after an app save.** Two causes. (1) A real bug, also on main: Edit Coin wrote Notes into the record's `details.notes`, but Details shows `coin.remarks` first, so Details kept the old Notes after a save until something re-read the row. Now the form's record carries `remarks`, and after a successful save the record takes the row as the save left it (`applySnapshotToRecord(coin, result.values)`), as does the listed copy if a background re-read replaced the coin list meanwhile. (2) Excel's lag: a read made soon after the save (a background re-read, or Edit Coin opening) returned the old row. For 10 minutes after a save (`RECENT_WRITE_SHOW_MS`), `withRecentWrites()` shows the written value wherever a read still shows the value that field had BEFORE the save (`recentRowWrites`, filled by `saveCoinRowToWorkbook` through `finishCoinRowSave()`, which every return of the writer passes through, from `result.before` / `result.written`; the writer keeps its own name, invariant 2); a different value (somebody else's change) is shown as read; once a read shows everything written, the entry goes. Edge, accepted for now: if somebody sets a field back to exactly its OLD value within 10 minutes of the app's save, the app keeps showing the app's value until a read shows it or the 10 minutes pass (display only; a later save's conflict check still reads the row fresh). Test seam: `__setGraphClientForTest()` clears `recentRowWrites` (a test installing a fresh mock workbook resets rows to their old values, which is exactly this edge: the full suite caught it in six suites). Applied in `applyLiveNavSheetRows` (full reads, the saved copy) and in `loadBrowseEditSnapshot` (the form and the record); DISPLAY ONLY: `browseEditSnapshot` (the conflict baseline) keeps the raw read, so the conflict check is unchanged. Remaining, deliberately not changed: a second save of the SAME coin while Excel's content is changing over (old content at open, new content at save, or the reverse) can still be refused as "changed since you opened Edit Coin": a false alarm in the safe direction (nothing written). A fix would teach the conflict check that a difference explained only by our own recent write is not a conflict; that changes invariant 4, so it is Ray's call (BACKLOG (ao)). Test: `tests/verify_save_shows_written_values.js` (W0-W6, a mock whose reads lag behind its writes); on main and on `000ce08` W2 (Details at once), W3 (re-opened form) and W4 (a re-read while Excel lags) fail; all pass here. W3's "Save highlighted" part did not reproduce in the mock (the button was not lit on main either); the values did.
- **B3, the save's outcome.** `noteSaveOutcome()` (the first outcome wins, except that a later problem replaces "saved") from `saveCoinRowToWorkbook` (`saveRowOutcomeText`: "saved", "refused (changed in the workbook: Remarks)", "refused (read-only: Offline)", "refused (missing-column: …)", "partly saved (…)") and `savePhotosAndLabels` ("saved" / "partly saved (…)"); `withSaveTiming` otherwise says "refused (reason)" for `{ ok: false }`, "failed (…)" for a throw, and "finished (no outcome reported)" rather than claiming success.
- **B4.** The saved-copy launch's own version check is recorded (`recordWorkbookVersionCheck(v, "launch")`), so the version line reads "Workbook version: HH:MM:SS (launch) · …" instead of "not checked yet".
- **Display (Ray).** No "checking…" / "updating…" rows (only Offline and Can't reach OneDrive); toasts "Updated" (was "Updated from the workbook"), "Back online" (was "· data is current"), and "Back online · updated" when the re-read changed the data (not in Ray's list: a small extension, flagged). All diagnostics (data line, Refresh, saved copy at launch, launch read, per sheet, last save, save steps, workbook version, Check again, version checks, the content-lag probe) are in one collapsed Docket section "About" (`#docketAboutAccordion`), after the three work sections; the Build line stays last, outside it. The Docket suites now list About as the fourth, last section.
- **Tests and controls.** session-gate-ao 49 (C3 same content = "Back online" only, C3b changed = "Back online · updated", C4 no toast for same content, C11 10 minutes, T6-T8 outcomes), device-cache-ao 39 (D6b), load-report-ao 33 (About; L28-L31 the probe), save-shows-written-values 9. Negative controls (by hand, 7 Nov): overlay off: W3, W4, W6 red; the record not updated after a save: W2; every re-read counted as changed: C3, C4; margin back to 2 minutes: C11; the launch check not recorded: D6b; outcomes not noted: T6, T7.

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


## Cross-area rules stated in CLAUDE.md (E-numbered; header lines moved here in the (am) slimming)

CLAUDE.md states each of these as one line. These are the original rule statements; the excerpt each Source names is in that section.

E4: test-quality trap: an assertion whose broken case also returns the passing value proves nothing. Source: [docs/HISTORY.md](../HISTORY.md), section "Photo / receipt write layer — Photos & Receipts tabs (BUILT and merged to main)" (original lines 11212-11219).
