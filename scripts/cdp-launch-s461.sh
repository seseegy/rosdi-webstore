#!/usr/bin/env bash
# Launcher CDP s461 (port sendiri agar tidak bentrok agent s459/s460):
# vite preview :4175 + Chrome headless :9224, profil sendiri.
# Penggunaan: bash scripts/cdp-launch-s461.sh <skrip-ukur.mjs> <outDir> <width...> [mode]
# Mode zoom diteruskan sebagai argumen ke-5 skrip ukur (untuk WIDTH 1280/390).
set -u
cd "$(dirname "$0")/.."
GOAL="$HOME/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files"
POLICY="$GOAL/qa-320-s72/webgl-policy.txt"
PROFILE="$PWD/hidden_files/cdp-s461/chrome-profile"
MEASURE="$1"; OUTDIR="$2"; shift 2
MODE="${CDP_MODE:-main}"
mkdir -p "$OUTDIR" "$PROFILE"
cp "$GOAL/qa-320-s72/go.html" /tmp/go.html
SHA=$(sha256sum "$POLICY" | awk '{print $1}')
/opt/meta-chromium/chrome --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  --hatch-validate-webgl-allowed-domains --version || exit 1
nohup node node_modules/vite/bin/vite.js preview --port 4175 --host 127.0.0.1 >"$OUTDIR/preview.log" 2>&1 &
PREVIEW_PID=$!
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4175/ && break; sleep 1; done
nohup /opt/meta-chromium/chrome --headless=new --no-sandbox --disable-gpu \
  --disable-features=LocalNetworkAccessChecks \
  --remote-debugging-port=9224 --user-data-dir="$PROFILE" \
  --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  file:///tmp/go.html >"$OUTDIR/chrome.log" 2>&1 &
CHROME_PID=$!
cleanup() {
  kill "$CHROME_PID" 2>/dev/null
  kill "$PREVIEW_PID" 2>/dev/null
}
trap cleanup EXIT
for _ in $(seq 1 30); do curl -s http://127.0.0.1:9224/json/list >/dev/null 2>&1 && break; sleep 1; done
WS=$(curl -s http://127.0.0.1:9224/json/list | python3 -c "import sys,json; d=json.load(sys.stdin); print([t for t in d if t.get('type')=='page'][0]['webSocketDebuggerUrl'])")
echo "WS=$WS PREVIEW_PID=$PREVIEW_PID CHROME_PID=$CHROME_PID"
for W in "$@"; do
  echo "=== LEBAR $W MODE $MODE ==="
  node "$MEASURE" "$WS" "$W" "http://127.0.0.1:4175/" "$OUTDIR" "$MODE" || echo "UKUR $W GAGAL"
done
echo "SELESAI"
