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
// totals are not the baseline. With no arguments the run is the full one.
//
// Parallel (B2, Build 1, Nov 2026): suites run JOBS at a time (default 4,
// never more than the machine's cores), each in its own child process
// (tests/run-one.js), so suites cannot share module state or a browser.
// Each suite's output is buffered and printed in file order, so the timing
// lines, the PASS / FAIL lines and the TOTAL line read exactly as a serial
// run's. Suites on RUN_ALONE run after the pool, one at a time, nothing
// else running.
//   npm test -- --serial        today's serial run, in this one process
//   TEST_JOBS=1 npm test        the same
//   TEST_JOBS=2 npm test        two at a time
// Filters and --list work the same in every mode.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { fork } = require("child_process");
const { runSuite, printResult } = require("./harness");

// Suites that wobble when other suites share the machine. Each runs alone,
// after the pool, with the reason beside it. Never loosen an assertion or
// raise a timeout instead of listing a suite here.
const RUN_ALONE = {
  "verify_crop_from_upload.js":
    "D4 / D5 failed under load (crop review 14 Nov 2026, twice; Build 1 parallel run 2 of 3, 15 Nov 2026: " +
    "13.0 s instead of ~3.3 s, so a 10 s wait ceiling in its flow() helper ran out); passes alone",
};

const DEFAULT_JOBS = 4;

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
  const badFlags = args.filter(a => a.startsWith("-") && a !== "--list" && a !== "--serial");
  if (badFlags.length) {
    console.error("Unknown option(s): " + badFlags.join(" ") + "\nUsage: npm test -- [--list] [--serial] [word ...]");
    process.exit(2);
  }
  let jobs = DEFAULT_JOBS;
  if (process.env.TEST_JOBS !== undefined && process.env.TEST_JOBS !== "") {
    jobs = Number(process.env.TEST_JOBS);
    if (!Number.isInteger(jobs) || jobs < 1) {
      console.error("TEST_JOBS must be a whole number of 1 or more (got " + JSON.stringify(process.env.TEST_JOBS) + ")");
      process.exit(2);
    }
  } else {
    jobs = Math.max(1, Math.min(DEFAULT_JOBS, os.cpus().length));
  }
  if (args.includes("--serial")) jobs = 1;
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

  const runStart = Date.now();
  const results = jobs === 1 ? await runSerial(files) : await runParallel(files, jobs);
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
  console.log(`TIME: ${totalSeconds.toFixed(0)}s (${(totalSeconds / 60).toFixed(1)} min) wall, ` +
    (jobs === 1 ? "serial" : `${jobs} at a time`) + "; slowest 5:");
  results.filter(r => r.seconds !== undefined)
    .sort((a, b) => b.seconds - a.seconds).slice(0, 5)
    .forEach(r => console.log(`  ${r.seconds.toFixed(1).padStart(7)}s  ${r.name}`));
  process.exit(fail === 0 && errs === 0 ? 0 : 1);
})();

// Serial: the pre-B2 loop, unchanged, in this one process.
async function runSerial(files) {
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
    // Timing only: a duration is recorded and printed as each suite finishes.
    // It changes no check and no suite behaviour.
    const suiteStart = Date.now();
    const r = await runSuite(mod.name || f, mod.suite);
    r.seconds = (Date.now() - suiteStart) / 1000;
    console.log(`  ${r.seconds.toFixed(1).padStart(7)}s  ${f}`);
    results.push(r);
  }
  return results;
}

// One suite in its own child process. Resolves with runSuite()'s result
// plus the child's buffered output; a child that dies without a result is
// a suite failure, never a silent skip.
function runChild(f) {
  return new Promise(resolve => {
    const start = Date.now();
    let out = "";
    let result = null;
    const child = fork(path.join(__dirname, "run-one.js"), [f], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
    child.stdout.on("data", d => { out += d; });
    child.stderr.on("data", d => { out += d; });
    child.on("message", m => { if (m && m.result) result = m.result; });
    child.on("exit", (code, signal) => {
      const r = result || { name: f, pass: 0, fail: 1, errors: [],
        failures: [`child process ended without a result (exit ${code}${signal ? ", signal " + signal : ""})` +
          (out ? ": " + out.trim().split("\n").slice(-3).join(" | ") : "")] };
      r.seconds = (Date.now() - start) / 1000;
      resolve({ r, out });
    });
  });
}

// Pool of `jobs` children, then RUN_ALONE suites one at a time. Output is
// printed in file order as soon as every earlier suite has finished.
async function runParallel(files, jobs) {
  const pooled = files.filter(f => !RUN_ALONE[f]);
  const alone = files.filter(f => RUN_ALONE[f]);
  console.log(`PARALLEL: ${jobs} at a time (TEST_JOBS=1 or --serial for one at a time)` +
    (alone.length ? `; run alone after: ${alone.join(", ")}` : "") + "\n");
  const done = new Array(files.length);
  let printed = 0;
  const flush = () => {
    while (printed < files.length && done[printed]) {
      const { r, out } = done[printed];
      if (out) process.stdout.write(out);
      console.log(`  ${r.seconds.toFixed(1).padStart(7)}s  ${files[printed]}`);
      printed++;
    }
  };
  let next = 0;
  const worker = async () => {
    while (next < pooled.length) {
      const f = pooled[next++];
      done[files.indexOf(f)] = await runChild(f);
      flush();
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, pooled.length) }, worker));
  for (const f of alone) {
    done[files.indexOf(f)] = await runChild(f);
    flush();
  }
  return done.map(d => d.r);
}
