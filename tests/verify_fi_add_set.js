// Failure injection (B6, Build 2): Add Set's start (Step 1, a Set not
// tracked coin by coin): reserve a CollectionID, upload the whole-set photo
// and the receipt into Staging/{id}/, write set.json. Every write request in
// turn fails, or lands with its answer lost; then the same button again
// while the form still holds the Set. See tests/fi_lib.js.

const { defineSuite } = require("./harness");
const { sweepFlow, assertKnown } = require("./fi_lib");

const FLOW = () => {
  const tagged = (tag, size, type) => {
    const a = new Uint8Array(size); for (let i = 0; i < size; i++) a[i] = (tag.charCodeAt(i % tag.length) * 5 + i) & 255;
    const b = new Blob([a], { type: type || "image/jpeg" }); b.__fiTag = tag; return b;
  };
  window.__flow = {
    sheets: ["All"],
    // firstWriteToken (A1, Build 3): a random value per new draft, like a time stamp.
    jsonDropKeys: ["createdDate", "updatedDate", "lastSaved", "savedAt", "updatedAt", "modifiedDate", "startedDate", "dateStarted", "firstWriteToken"],
    async setup() {
      const mock = createMockGraphClient({
        workbookColumns: { "All::CollectionID": ["AY-00500"] },
        sheets: { All: [["CollectionID", "Description"], ["AY-00500", "A coin"]] }
      });
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true);
      __setDocketWriteEnabledForTest(false);
      __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
      if (!window.__fiToastHooked) {
        window.__fiToastHooked = true;
        const orig = window.showToast;
        window.showToast = function (msg, ...rest) { window.__fiToasts = (window.__fiToasts || []).concat([String(msg)]); return orig.call(this, msg, ...rest); };
      }
      window.__fiToasts = [];
      navigate("addset");
      document.getElementById("addSetName").value = "Proof Set";
      document.getElementById("addSetYear").value = "1957";
      document.getElementById("addSetTrackIndividually").checked = false;
      updateAddSetTrackIndividuallyVisibility();
      addSetPhotoFiles.whole = tagged("whole", 800);
      addSetPhotoFiles.receipt = tagged("rcpt", 500, "application/pdf");
      addSetPhotoFilenames.receipt = "receipt.pdf";
      return mock;
    },
    async run() {
      window.__fiToasts = [];
      await startSetCapture();
      const text = (window.__fiToasts || []).join(" / ");
      window.__fiLastSaid = /^Reserved /.test(text) ? "saved" : "failed";
      return { said: window.__fiLastSaid, text };
    },
    // The same button again after a start that said it failed (the form
    // still holds the Set). Since Build 3 (A16) a failed start can leave its
    // draft in Staging (set.json is written first), so "no draft yet" no
    // longer tells a failed start; what the start said does.
    async retry() {
      if (window.__fiLastSaid === "failed" && document.getElementById("addSetName").value.trim()) await this.run();
    },
    // C1: the whole-set photo and the receipt are still picked, or landed.
    async picksLost(mock) {
      const held = new Set([addSetPhotoFiles.whole, addSetPhotoFiles.receipt].filter(Boolean).map(b => b.__fiTag));
      const landed = new Set();
      for (const [, e] of mock._store.entries()) if (e && e.value && e.value.__fiTag) landed.add(e.value.__fiTag);
      return ["whole", "rcpt"].filter(t => !held.has(t) && !landed.has(t)).map(t => "the " + t + " pick is neither on the form nor saved");
    }
  };
};

// Violations the sweep finds today, each tagged with its review finding.
// A16 (a start that failed after its first upload stranded the half-written
// Staging/{id}/ folder, and the same button again reserved the NEXT id) was
// fixed in Build 3: its 4 lines were deleted (set.json is written first,
// with no-overwrite and a token, and the same button finishes the same id).
// The list only shrinks: a build that fixes one deletes its line.
const KNOWN = [];

module.exports = defineSuite("fi-add-set", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  const r = await sweepFlow(page, appReady, FLOW, {});
  ok("clean run: saved, no violations, the retry changes nothing", r.cleanProblems.length === 0, r.cleanProblems);
  ok("the flow makes write requests to sweep (" + r.K + ": " + r.calls.join(" | ") + ")", r.K >= 3, r.calls);
  assertKnown(ok, "fi-add-set", r, KNOWN);
}, module);
