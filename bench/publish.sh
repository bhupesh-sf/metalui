#!/usr/bin/env bash
# Publishes the last run: bench/results -> summary.json + runs/<sha>.json + history.jsonl on the orphan
# bench-results branch, which the /performance page reads. Only the benchmark machine runs this.
#   bench/publish.sh          commit and push
#   bench/publish.sh --dry    build the commit in a scratch clone and show it; push nothing
set -euo pipefail
cd "$(dirname "$0")/.."

DRY=0; [ "${1:-}" = "--dry" ] && DRY=1
node scripts/bench-summary.mjs
SUMMARY=bench/results/summary.json
SHA=$(node -p "require('./$SUMMARY').sha")
VALID=$(node -p "require('./$SUMMARY').valid")
STAMP=$(node -p "require('./$SUMMARY').startedAt.replace(/[:.]/g, '-')")

ORIGIN=$(git remote get-url origin)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
if git ls-remote --exit-code --heads "$ORIGIN" bench-results >/dev/null 2>&1; then
  git clone -q --branch bench-results --single-branch "$ORIGIN" "$WORK/r"
else
  git init -q -b bench-results "$WORK/r"
  git -C "$WORK/r" remote add origin "$ORIGIN"
fi

R="$WORK/r"
mkdir -p "$R/runs"
cp "$SUMMARY" "$R/summary.json"
cp "$SUMMARY" "$R/runs/$STAMP-${SHA:0:8}.json"
node -e '
const fs = require("fs"); const s = require("./'"$SUMMARY"'");
const line = { sha: s.sha, startedAt: s.startedAt, valid: s.valid, pages: s.idle.pages, atRest: s.idle.atRest, host: s.host.name, bundleGzip: s.bundle?.package.gzip ?? null, buttonGzip: s.bundle?.singleImport?.Button?.gzip ?? null };
fs.appendFileSync(process.argv[1], JSON.stringify(line) + "\n");' "$R/history.jsonl"
cat > "$R/README.md" <<'MD'
# bench-results

Written only by `bench/publish.sh` on the benchmark machine. `summary.json` is the latest run; `runs/` keeps each one; `history.jsonl` has one line per run. Read by https://metalui.dev/performance. Do not edit by hand.
MD

git -C "$R" add -A
git -C "$R" -c user.name="MetalUI bench" -c user.email="bench@metalui.dev" commit -q -m "bench: ${SHA:0:8} (valid=$VALID)"
if [ "$DRY" = 1 ]; then
  git -C "$R" show --stat --format='%s' HEAD
  echo "dry run: nothing pushed"
else
  git -C "$R" push -q origin bench-results
  echo "published ${SHA:0:8} (valid=$VALID)"
fi
