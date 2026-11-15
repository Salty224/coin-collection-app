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
    jsonDropKeys: ["createdDate", "updatedDate", "lastSaved", "savedAt", "updatedAt", "modifiedDate", "startedDate", "dateStarted"],
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
      return { said: /^Reserved /.test(text) ? "saved" : /Couldn't save/.test(text) ? "failed" : "failed", text };
    },
    // The same button again while the form still holds the Set (a failed
    // start leaves it filled).
    async retry() {
      const sets = await listSetDrafts().catch(() => []);
      if (!sets.length && document.getElementById("addSetName").value.trim()) await this.run();
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

// Violations the sweep finds today, each tagged with its review finding:
// A16 a start that fails after its first upload strands the half-written
//     Staging/{id}/ folder; the same button again reserves the NEXT id.
// The list only shrinks: a build that fixes one deletes its line.
const KNOWN = [
  ["A16", "fail uploadFile Staging/AY-00501/receipt.pdf: C5 after retry, vs a clean run: files +3 in Staging/{id}; files -2 from Staging/{id}"],
  ["A16", "fail uploadJson Staging/AY-00501/set.json: C5 after retry, vs a clean run: files +3 in Staging/{id}; files -1 from Staging/{id}"],
  ["A16", "lost uploadFile Staging/AY-00501/receipt.pdf: C5 after retry, vs a clean run: files +3 in Staging/{id}; files -1 from Staging/{id}"],
  ["A16", "lost uploadFile Staging/AY-00501/set.jpg: C5 after retry, vs a clean run: files +3 in Staging/{id}; files -2 from Staging/{id}"]
];

module.exports = defineSuite("fi-add-set", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  const r = await sweepFlow(page, appReady, FLOW, {});
  ok("clean run: saved, no violations, the retry changes nothing", r.cleanProblems.length === 0, r.cleanProblems);
  ok("the flow makes write requests to sweep (" + r.K + ": " + r.calls.join(" | ") + ")", r.K >= 3, r.calls);
  assertKnown(ok, "fi-add-set", r, KNOWN);
}, module);
