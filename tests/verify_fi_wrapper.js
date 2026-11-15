// Failure injection (B6, Build 2): the wrapper's own negative controls.
//   W1 with injection switched off (kind "none": every request counted,
//      none faulted) a sweep of a real flow (Promote) reports nothing;
//   W2 a toy flow with ONE seeded bug (it swallows the error of its second
//      write and still says "saved") reports exactly that one violation;
//   W3 the same toy flow without the bug reports nothing.
// If the wrapper never injected, or the checks never fired, W2 fails; if
// they fired on a correct flow, W1 / W3 fail. See tests/fi_lib.js.

const { defineSuite } = require("./harness");
const { sweepFlow } = require("./fi_lib");
const { DRAFT_FLOW, ALL_HEADERS } = require("./fi_draft_flows");

const TOY = (seeded) => {
  const dir = () => writePaths().stagingBase + "/AY-09999";
  window.__flow = {
    sheets: [],
    async setup() {
      const mock = createMockGraphClient({});
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true);
      return mock;
    },
    async run() {
      await graph().uploadJson(dir() + "/a.json", { a: 1 });
      try { await graph().uploadJson(dir() + "/b.json", { b: 2 }); }
      catch (e) { if (!seeded) throw e; } // the seeded bug: swallowed
      await graph().uploadJson(dir() + "/c.json", { c: 3 });
      return { said: "saved", text: "saved" };
    },
    async retry() {
      for (const k of ["a", "b", "c"]) await graph().uploadJson(dir() + "/" + k + ".json", { [k]: { a: 1, b: 2, c: 3 }[k] });
    }
  };
};

module.exports = defineSuite("fi-wrapper", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);

  const off = await sweepFlow(page, appReady, DRAFT_FLOW, { flowArg: { mode: "promote", ALL_HEADERS }, kinds: ["none"] });
  ok("W1 injection off: a Promote sweep over all " + off.K + " write requests reports no violations",
    off.K > 10 && off.runs.length === off.K && off.violations.length === 0 && off.cleanProblems.length === 0, off.violations.concat(off.cleanProblems));

  const seeded = await sweepFlow(page, appReady, TOY, { flowArg: true });
  const want = ["fail uploadJson Staging/AY-09999/b.json: C4 reported saved, but vs a clean run: files -1 from Staging/{id}"];
  ok("W2 one seeded fault: the sweep reports exactly that one violation",
    JSON.stringify(seeded.violations) === JSON.stringify(want), { got: seeded.violations, want });

  const clean = await sweepFlow(page, appReady, TOY, { flowArg: false });
  ok("W3 the same toy flow without the bug reports nothing (" + clean.runs.length + " faulted runs)",
    clean.K === 3 && clean.runs.length === 6 && clean.violations.length === 0, clean.violations);
}, module);
