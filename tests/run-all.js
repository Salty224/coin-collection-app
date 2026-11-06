// Single entry point for every regression suite: `npm test`.
//
// This is the piece that makes "re-run all prior suites" a one-line action
// instead of an archaeology exercise. Every suite in tests/ named
// verify_*.js is discovered automatically, so adding one needs no
// registration step here.
//
// Running a few suites by name (a development shortcut, never a baseline):
//   npm test -- image-chooser deploy      suites whose file name (without
//                                         "verify_" and ".js") or suite name
//                                         contains any of the words, any case
//   npm test -- --list                    print every suite name and stop
// A word that matches nothing is an error (non-zero exit), never a quiet
// empty run. A filtered run prints "FILTERED RUN: N of M suites" and its
// totals are not the 92-suite baseline. With no arguments the run is the
// full one, exactly as before.

const fs = require("fs");
const path = require("path");
const { runSuite, printResult } = require("./harness");

const stemOf = f => f.replace(/^verify_/, "").replace(/\.js$/, "");

(async () => {
  const allFiles = fs.readdirSync(__dirname)
    .filter(f => /^verify_.*\.js$/.test(f))
    .sort();

  if (!allFiles.length) {
    console.log("No suites found in tests/.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const badFlags = args.filter(a => a.startsWith("-") && a !== "--list");
  if (badFlags.length) {
    console.error("Unknown option(s): " + badFlags.join(" ") + "\nUsage: npm test -- [--list] [word ...]");
    process.exit(2);
  }
  const wantList = args.includes("--list");
  const words = args.filter(a => !a.startsWith("-")).map(a => a.toLowerCase());

  let files = allFiles;
  if (wantList || words.length) {
    // Suite names live in the modules, so the filter loads them (the full,
    // unfiltered run keeps loading each one just before it runs).
    const info = allFiles.map(f => {
      const mod = require(path.join(__dirname, f));
      return { file: f, stem: stemOf(f), suiteName: (mod && mod.name) || "" };
    });
    const hit = (i, w) => i.stem.toLowerCase().includes(w) || i.suiteName.toLowerCase().includes(w);
    if (wantList) {
      info.forEach(i => console.log(i.stem + (i.suiteName && i.suiteName !== i.stem ? "   (suite: " + i.suiteName + ")" : "")));
      console.log("\n" + info.length + " suites");
      process.exit(0);
    }
    const unmatched = words.filter(w => !info.some(i => hit(i, w)));
    if (unmatched.length) {
      console.error("No suite matches: " + unmatched.join(", ") + "\nTry: npm test -- --list");
      process.exit(2);
    }
    files = info.filter(i => words.some(w => hit(i, w))).map(i => i.file);
    console.log(`FILTERED RUN: ${files.length} of ${allFiles.length} suites (${words.join(", ")}). Not the baseline.\n`);
  }

  const results = [];
  const runStart = Date.now();
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
    // Timing only: a duration is recorded and printed as each suite finishes.
    // It changes no check and no suite behaviour.
    const suiteStart = Date.now();
    const r = await runSuite(mod.name || f, mod.suite);
    r.seconds = (Date.now() - suiteStart) / 1000;
    console.log(`  ${r.seconds.toFixed(1).padStart(7)}s  ${f}`);
    results.push(r);
  }
  const totalSeconds = (Date.now() - runStart) / 1000;

  console.log("");
  results.forEach(printResult);

  const pass = results.reduce((n, r) => n + r.pass, 0);
  const fail = results.reduce((n, r) => n + r.fail, 0);
  const errs = results.reduce((n, r) => n + r.errors.length, 0);
  console.log("\n" + "-".repeat(58));
  console.log(`TOTAL: ${pass} passed, ${fail} failed, ${errs} page error(s), across ${results.length} suite(s)`);
  if (files.length !== allFiles.length) {
    console.log(`FILTERED RUN: ${files.length} of ${allFiles.length} suites. Not the baseline (the baseline is the full run).`);
  }
  console.log(`TIME: ${totalSeconds.toFixed(0)}s (${(totalSeconds / 60).toFixed(1)} min) wall; slowest 5:`);
  results.filter(r => r.seconds !== undefined)
    .sort((a, b) => b.seconds - a.seconds).slice(0, 5)
    .forEach(r => console.log(`  ${r.seconds.toFixed(1).padStart(7)}s  ${r.name}`));
  process.exit(fail === 0 && errs === 0 ? 0 : 1);
})();
