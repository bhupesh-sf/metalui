#!/usr/bin/env bash
# Runs the web benchmarks on a shared machine without letting it disturb them:
# renderer pinned to its own cores, host load recorded before and after, run marked
# invalid when something else was busy. Usage: bench/run.sh [cores]  (default 4-7)
set -euo pipefail
cd "$(dirname "$0")/.."

CORES="${1:-4-7}"
MAX_LOAD="${BENCH_MAX_LOAD:-1.5}"   # 1-minute load average above which the run is not trusted
OUT=bench/results
mkdir -p "$OUT"

load() { cut -d' ' -f1 /proc/loadavg; }
before=$(load)

# Fingerprint: enough to say exactly where the numbers came from.
node -e '
const os = require("os"), cp = require("child_process");
const sh = (c) => { try { return cp.execSync(c, { encoding: "utf8" }).trim(); } catch { return null; } };
console.log(JSON.stringify({
  sha: sh("git rev-parse HEAD"), startedAt: new Date().toISOString(),
  host: os.hostname(), cpu: os.cpus()[0].model, cpus: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30),
  hypervisor: sh("lscpu | grep -i \"Hypervisor vendor\" | cut -d: -f2"), kernel: os.release(),
  node: process.version, playwright: require("@playwright/test/package.json").version,
}, null, 2));' > "$OUT/env.json"

taskset -c "$CORES" env BENCH_PAGES="${BENCH_PAGES:-all}" npx playwright test -c bench/playwright.config.ts
after=$(load)

node -e '
const fs = require("fs"); const [b, a, max] = process.argv.slice(1).map(Number);
const env = JSON.parse(fs.readFileSync("bench/results/env.json", "utf8"));
Object.assign(env, { loadBefore: b, loadAfter: a, maxLoad: max, valid: b <= max && a <= max });
fs.writeFileSync("bench/results/env.json", JSON.stringify(env, null, 2) + "\n");
console.log(env.valid ? "run valid" : `run INVALID: host load ${b} -> ${a} exceeded ${max}`);' "$before" "$after" "$MAX_LOAD"
