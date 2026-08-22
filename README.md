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
