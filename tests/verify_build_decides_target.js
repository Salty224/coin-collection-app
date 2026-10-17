// The build decides its own data target (branch claude/build-decides-target).
//
// Ray's rule: a build stamped by the deploy workflow as branch "main", with a
// real 40-hex commit, served from https://salty224.github.io/coin-collection-app/
// reads and writes the REAL workbook and folders. Anything else — the raw
// file, localhost, file://, a tag, "main-fix", an unreadable stamp — is the
// _Testing copy. Nothing in the code to flip.
//
// Every page in this suite that could be LIVE has its Microsoft/Graph/CDN
// requests aborted, so nothing here can reach OneDrive or sign-in.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { defineSuite } = require("./harness");

const APP_PATH = path.resolve(__dirname, "..", "app.html");
const APP_SRC = () => fs.readFileSync(APP_PATH, "utf8");

const WRITE_FLAGS = ["ENABLE_SET_WRITE_LAYER", "ENABLE_BROWSE_EDIT_WRITE", "ENABLE_DOCKET_WRITE",
  "ENABLE_ADDCOIN_WRITE", "ENABLE_SET_LINK_WRITE", "ENABLE_PURGE_WRITE"];

module.exports = defineSuite("build-decides-target", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================================================================
  // COMMIT 1 — every write flag is on regardless of target
  // ================================================================
  const W = await page.evaluate((names) => {
    const vals = {};
    names.forEach(n => { vals[n] = eval(n); }); // eslint-disable-line no-eval
    return { vals, layer: WRITE_LAYER_ENABLED };
  }, WRITE_FLAGS);
  ok(WRITE_FLAGS.every(n => W.vals[n] === true), "W1 all six write flags are true on the loaded page");
  ok(W.layer === true, "W2 WRITE_LAYER_ENABLED is true");
  const src = APP_SRC();
  ok(WRITE_FLAGS.every(n => src.split("const " + n + " = true;").length - 1 === 1),
    "W3 each write flag is defined as plain `true` in app.html (not from WRITE_TARGET)");
  ok(!/const ENABLE_[A-Z_]+ = \(WRITE_TARGET/.test(src),
    "W4 no flag is derived from WRITE_TARGET any more");
}, module);
