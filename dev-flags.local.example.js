// TEMPLATE — copy this file to "dev-flags.local.js" (same folder as
// app.html) to enable local dev-flag overrides. See README.md's "Local
// dev-flag overrides" section for the full picture.
//
// dev-flags.local.js (the COPY, not this template) is listed in
// .gitignore and is NEVER committed or shipped — app.html's <script
// src="dev-flags.local.js"> tag simply 404s harmlessly on GitHub Pages
// and on any checkout that doesn't have the file, and every flag then
// resolves to its literal hardcoded default in app.html exactly as if
// this mechanism didn't exist. This is a LOCAL convenience only; it can
// never make production less safe.
//
// This template file itself IS committed (so the shape/spelling is
// always here to copy from), but it sets nothing — window.__DEV_FLAGS__
// is only assigned once you uncomment lines in your own local copy.
//
// Reminder: if you re-download/extract a fresh branch ZIP into a NEW
// folder, this file (the real, gitignored one) won't be there — it isn't
// part of the branch content, deliberately. Copy your local
// dev-flags.local.js into the new folder again, or recreate it from this
// template.

window.__DEV_FLAGS__ = {
  // Uncomment only the flags you actually need for this session. Leave
  // everything else commented out — an absent key just falls back to
  // app.html's own hardcoded default, same as if this file didn't exist.

  // ENABLE_REFERENCE_IMAGES: true,
  // ENABLE_LIVE_NAV_DATA: true,
  // ENABLE_SET_WRITE_LAYER: true,
  // ENABLE_BROWSE_EDIT_WRITE: true,
  // ENABLE_DOCKET_WRITE: true,

  // "copy" | "live" — leave as "copy" unless you specifically mean to
  // write the real production workbook. See CLAUDE.md's WRITE_TARGET note.
  // WRITE_TARGET: "copy",
};
