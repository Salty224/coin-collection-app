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
const KNOWN = [
  ["A3", "fail deleteItem Staging/AY-00706/AY-00706_obverse_cropped.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +4 in Staging/{id}; files -3 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "fail deleteItem Staging/AY-00706/AY-00706_obverse_original.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +3 in Staging/{id}; files -2 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "fail deleteItem Staging/AY-00706/AY-00706_receipt.pdf: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +1 in Staging/{id}; changed coin.json"],
  ["A3", "fail deleteItem Staging/AY-00706/AY-00706_reference_01.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +2 in Staging/{id}; files -1 from CoinReceipts; changed coin.json"],
  ["A3", "fail patchWorkbookRanges Photos!A#:H# #2: C4 reported saved, but vs a clean run: Photos +0/-1"],
  ["A3", "fail patchWorkbookRanges Photos!A#:H# #2: C5 after retry, vs a clean run: Photos +0/-1"],
  ["A3", "fail patchWorkbookRanges Photos!A#:H#: C4 reported saved, but vs a clean run: Photos +0/-1"],
  ["A3", "fail patchWorkbookRanges Photos!A#:H#: C5 after retry, vs a clean run: Photos +0/-1"],
  ["A3", "fail patchWorkbookRanges Receipts!A#:D#: C4 reported saved, but vs a clean run: Receipts +0/-1"],
  ["A3", "fail patchWorkbookRanges Receipts!A#:D#: C5 after retry, vs a clean run: Receipts +0/-1"],
  ["A3", "fail uploadBytes CoinPhotos/AY-00706_obverse_cropped.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +4 in Staging/{id}; files -4 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "fail uploadBytes CoinPhotos/AY-00706_obverse_original.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +3 in Staging/{id}; files -3 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "fail uploadBytes CoinPhotos/AY-00706_reference_01.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +2 in Staging/{id}; files -2 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "fail uploadBytes CoinReceipts/AY-00706_receipt.pdf: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +1 in Staging/{id}; files -1 from CoinReceipts; changed coin.json"],
  ["A3", "fail uploadJson Staging/AY-00706/coin.json #2: C4 reported saved, but vs a clean run: changed coin.json"],
  ["A5", "fail uploadJson Staging/AY-00706/coin.json #2: C5 after retry, vs a clean run: Photos +1/-0"],
  ["A5", "fail uploadJson Staging/AY-00706/coin.json #2: after retry C2 Photos has AY-00706_reference_01.jpg on 2 rows"],
  ["A3", "lost deleteItem Staging/AY-00706/AY-00706_obverse_cropped.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +3 in Staging/{id}; files -3 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "lost deleteItem Staging/AY-00706/AY-00706_obverse_original.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +2 in Staging/{id}; files -2 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "lost deleteItem Staging/AY-00706/AY-00706_receipt.pdf: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; changed coin.json"],
  ["A3", "lost deleteItem Staging/AY-00706/AY-00706_reference_01.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +1 in Staging/{id}; files -1 from CoinReceipts; changed coin.json"],
  ["A3", "lost uploadBytes CoinPhotos/AY-00706_obverse_cropped.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +4 in Staging/{id}; files -3 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "lost uploadBytes CoinPhotos/AY-00706_obverse_original.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +3 in Staging/{id}; files -2 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "lost uploadBytes CoinPhotos/AY-00706_reference_01.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +2 in Staging/{id}; files -1 from CoinReceipts; changed coin.json"],
  ["A3", "lost uploadBytes CoinReceipts/AY-00706_receipt.pdf: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +1 in Staging/{id}; changed coin.json"]
];

module.exports = defineSuite("fi-promote", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  const r = await sweepFlow(page, appReady, DRAFT_FLOW, { flowArg: { mode: "promote", ALL_HEADERS } });
  ok("clean run: done, no violations, the retry changes nothing", r.cleanProblems.length === 0, r.cleanProblems);
  ok("the flow makes write requests to sweep (" + r.K + ": " + r.calls.join(" | ") + ")", r.K >= 1, r.calls);
  assertKnown(ok, "fi-promote", r, KNOWN);
}, module);
