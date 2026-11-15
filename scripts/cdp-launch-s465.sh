#!/usr/bin/env bash
# Launcher CDP s465 (port sendiri agar tidak bentrok agent s464):
# vite preview :4179 + Chrome headless :9229, profil sendiri.
# Penggunaan: bash scripts/cdp-launch-s465.sh <skrip-ukur.mjs> <outDir> <width...> [mode]
set -u
cd "$(dirname "$0")/.."
GOAL="$HOME/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files"
POLICY="$GOAL/qa-320-s72/webgl-policy.txt"
PROFILE="$PWD/hidden_files/cdp-s465/chrome-profile"
MEASURE="$1"; OUTDIR="$2"; shift 2
MODE="${CDP_MODE:-main}"
mkdir -p "$OUTDIR" "$PROFILE"
cp "$GOAL/qa-320-s72/go.html" /tmp/go-s465.html
sed -i "s/4173/4179/" /tmp/go-s465.html
SHA=$(sha256sum "$POLICY" | awk '{print $1}')
/opt/meta-chromium/chrome --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  --hatch-validate-webgl-allowed-domains --version || exit 1
nohup node node_modules/vite/bin/vite.js preview --port 4179 --host 127.0.0.1 >"$OUTDIR/preview.log" 2>&1 &
PREVIEW_PID=$!
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4179/ && break; sleep 1; done
nohup /opt/meta-chromium/chrome --headless=new --no-sandbox --disable-gpu \
  --disable-features=LocalNetworkAccessChecks \
  --remote-debugging-port=9229 --user-data-dir="$PROFILE" \
  --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  file:///tmp/go-s465.html >"$OUTDIR/chrome.log" 2>&1 &
CHROME_PID=$!
cleanup() {
  kill "$CHROME_PID" 2>/dev/null
  kill "$PREVIEW_PID" 2>/dev/null
}
trap cleanup EXIT
for _ in $(seq 1 30); do curl -s http://127.0.0.1:9229/json/list >/dev/null 2>&1 && break; sleep 1; done
WS=$(curl -s http://127.0.0.1:9229/json/list | python3 -c "import sys,json; d=json.load(sys.stdin); print([t for t in d if t.get('type')=='page'][0]['webSocketDebuggerUrl'])")
echo "WS=$WS PREVIEW_PID=$PREVIEW_PID CHROME_PID=$CHROME_PID"
for W in "$@"; do
  echo "=== LEBAR $W MODE $MODE ==="
  node "$MEASURE" "$WS" "$W" "http://127.0.0.1:4179/" "$OUTDIR" "$MODE" || echo "UKUR $W GAGAL"
done
echo "SELESAI"
