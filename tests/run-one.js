// Child process for the parallel runner (tests/run-all.js, B2, Build 1).
//
// Runs ONE suite file in its own Node process (so suites cannot share
// module state, timers or a browser) and hands the result back to the
// parent over the IPC channel. Not a suite itself: the runner discovers only
// tests/verify_*.js, so this file is never picked up as one.
//
//   (spawned by run-all.js)  node tests/run-one.js verify_x.js
//
// The result object is exactly what runSuite() returns, so the parent
// prints it with the same printResult() the serial run uses.

const path = require("path");
const { runSuite } = require("./harness");

(async () => {
  const f = process.argv[2];
  let r;
  try {
    const mod = require(path.join(__dirname, f));
    if (typeof mod.suite !== "function") {
      r = { name: f, pass: 0, fail: 1, errors: [],
        failures: ["does not export { name, suite } — cannot be aggregated"] };
    } else {
      r = await runSuite(mod.name || f, mod.suite);
    }
  } catch (e) {
    r = { name: f, pass: 0, fail: 1, errors: [],
      failures: ["SUITE THREW on load: " + (e && e.stack || e)] };
  }
  process.send({ result: r }, () => process.exit(0));
})();
