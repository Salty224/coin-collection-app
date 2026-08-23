# coin-collection-app

## Local dev-flag overrides

`app.html` has a handful of real-Graph feature flags that ship `false`
(or `"copy"` for `WRITE_TARGET`) in committed source, on purpose — see
CLAUDE.md for why each one is gated this way:

- `ENABLE_REFERENCE_IMAGES`
- `ENABLE_LIVE_NAV_DATA`
- `ENABLE_SET_WRITE_LAYER`
- `ENABLE_BROWSE_EDIT_WRITE`
- `ENABLE_DOCKET_WRITE`
- `WRITE_TARGET` (`"copy"` | `"live"`)

Testing any of these locally used to mean hand-editing `app.html` in
Notepad after every fresh branch ZIP download, then remembering to set it
back before committing. **You can skip that now:**

1. Copy `dev-flags.local.example.js` to `dev-flags.local.js`, in the same
   folder as `app.html`.
2. Uncomment whichever flags you want to override, save.
3. Load `app.html` from your local server as usual — no edits to
   `app.html` itself needed.

`dev-flags.local.js` is listed in `.gitignore` and is **never committed or
shipped**. `app.html` loads it via a plain `<script src="dev-flags.local.js">`
tag that simply 404s harmlessly when the file isn't there (production on
GitHub Pages, or any checkout that hasn't had the file placed in it) —
every flag then falls back to its exact hardcoded default in `app.html`,
same as if this mechanism didn't exist at all. This is a **local
convenience only**; it can loosen defaults on your own machine, never on
production.

**One thing to know**: this only persists across a fresh branch download
if you keep re-extracting into the *same* local folder. If you extract a
new branch ZIP into a brand-new folder, `dev-flags.local.js` won't be
there (it's gitignored, so it's never part of the ZIP) — copy it over
from your old folder, or redo steps 1–2 above.

## Regression suites

Headless Playwright suites live in `tests/` and are **committed**. They were
previously written into per-session scratchpads and discarded, which meant a
suite could only ever validate the session that wrote it — see CLAUDE.md for
the repeated cost of that.

```sh
npm install     # once — pulls Playwright (dev-only)
npm test        # runs every tests/verify_*.js, prints one total
```

A single suite can also be run on its own:

```sh
node tests/verify_addcoin_phase1.js
```

Both paths exit non-zero on any failed assertion or uncaught page error.

**This does not change what ships.** `app.html` still has no build step and no
runtime dependencies, and is served as-is by GitHub Pages — see CLAUDE.md's
self-contained/no-CDN posture. `package.json` exists only for the test
tooling, and `node_modules/` is gitignored. Nothing in `tests/` is ever served.

### Writing a suite

Use `defineSuite` so the file is both aggregatable by `run-all.js` and
directly runnable:

```js
const { defineSuite } = require("./harness");

module.exports = defineSuite("my-feature", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);
  ok(await page.evaluate(() => SOME_FLAG === false), "flag ships off");
}, module);
```

The harness resolves a Chromium binary itself (`CHROMIUM_PATH`, then the
newest `chromium-*` under `PLAYWRIGHT_BROWSERS_PATH`, then a system Chrome,
then Playwright's own default) — **don't hardcode a browser path in a suite**,
since the pinned build number differs between environments. It also collects
page and console errors automatically, so a suite cannot pass while the page
is throwing.

Suites drive real app code through the test seams already in `app.html`
(`__setGraphClientForTest`, `__setAddCoinWriteEnabledForTest`,
`__setLiveDbCoinsForTest`, …) against the in-memory mock Graph client, so no
OneDrive session is involved and no real file is ever touched. Live
verification is a separate, manual pass — see the checklists in `docs/`.
