// Single entry point for every regression suite: `npm test`.
//
// This is the piece that makes "re-run all prior suites" a one-line action
// instead of an archaeology exercise. Every suite in tests/ named
// verify_*.js is discovered automatically, so adding one needs no
// registration step here.

const fs = require("fs");
const path = require("path");
const { runSuite, printResult } = require("./harness");

(async () => {
  const files = fs.readdirSync(__dirname)
    .filter(f => /^verify_.*\.js$/.test(f))
    .sort();

  if (!files.length) {
    console.log("No suites found in tests/.");
    process.exit(1);
  }

  const results = [];
  for (const f of files) {
    const mod = require(path.join(__dirname, f));
    if (typeof mod.suite !== "function") {
      // A suite run directly via main() exits the process, which would stop
      // this runner dead. Suites must export { name, suite } to be
      // aggregatable — say so loudly rather than silently skipping.
      results.push({ name: f, pass: 0, fail: 1, errors: [],
        failures: ["does not export { name, suite } — cannot be aggregated"] });
      continue;
    }
    results.push(await runSuite(mod.name || f, mod.suite));
  }

  console.log("");
  results.forEach(printResult);

  const pass = results.reduce((n, r) => n + r.pass, 0);
  const fail = results.reduce((n, r) => n + r.fail, 0);
  const errs = results.reduce((n, r) => n + r.errors.length, 0);
  console.log("\n" + "-".repeat(58));
  console.log(`TOTAL: ${pass} passed, ${fail} failed, ${errs} page error(s), across ${results.length} suite(s)`);
  process.exit(fail === 0 && errs === 0 ? 0 : 1);
})();
