// Failure injection (B6, Build 2): promote of a Staging coin draft (Obverse
// cropped + original, a Reference, a receipt). Every write request in turn
// fails, or lands with its answer lost; then the same button again and a
// relaunch. Flow: tests/fi_draft_flows.js; method: tests/fi_lib.js.

const { defineSuite } = require("./harness");
const { sweepFlow, assertKnown } = require("./fi_lib");
const { DRAFT_FLOW, ALL_HEADERS } = require("./fi_draft_flows");

// Violations the sweep finds today, each tagged with its review finding.
// The list only shrinks: a build that fixes one deletes its line.
// A4 (Reject would delete the only copies of a coin already on All) was
// fixed in Build 3 (Reject checks All itself); its 3 lines were deleted.
// Fixed in Build 5 and deleted: A3 (23 lines) and A5 (2 lines).
const KNOWN = [
];

module.exports = defineSuite("fi-promote", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  const r = await sweepFlow(page, appReady, DRAFT_FLOW, { flowArg: { mode: "promote", ALL_HEADERS } });
  ok("clean run: done, no violations, the retry changes nothing", r.cleanProblems.length === 0, r.cleanProblems);
  ok("the flow makes write requests to sweep (" + r.K + ": " + r.calls.join(" | ") + ")", r.K >= 1, r.calls);
  assertKnown(ok, "fi-promote", r, KNOWN);
}, module);
