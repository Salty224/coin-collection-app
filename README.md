# coin-collection-app

## Real-Graph feature flags

`app.html`'s real-Graph feature flags (`ENABLE_REFERENCE_IMAGES`,
`ENABLE_LIVE_NAV_DATA`, `ENABLE_SET_WRITE_LAYER`, `ENABLE_BROWSE_EDIT_WRITE`,
`ENABLE_DOCKET_WRITE`, `ENABLE_ADDCOIN_WRITE`) ship on by default — Ray is
the only user of this app, so there's no local/production split to gate
them behind anymore. `WRITE_TARGET` (`"copy"` | `"live"`) is the real
safety boundary instead: with it at `"copy"` (the shipped default), every
write-capable flag among the six is fully on but every write still resolves
under `CoinCollection/_Testing/`, never the real workbook. See CLAUDE.md's
"Real-Graph flags always on; WRITE_TARGET is the actual safety boundary"
for the full design, including why flipping `WRITE_TARGET` to `"live"`
turns every write-capable flag back off at that same instant rather than
opening the real workbook immediately.

This app previously had a local-only `dev-flags.local.js` override
mechanism for testing these flags individually without hand-editing
`app.html` — retired along with the always-off defaults it existed to
work around; there's nothing to configure locally anymore.

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
