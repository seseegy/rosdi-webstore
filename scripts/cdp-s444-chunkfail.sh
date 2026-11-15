#!/usr/bin/env bash
# Uji ide 32 s444 dengan profil Chrome SEGAR (chunk GamePage benar-benar
# diunduh lewat jaringan dan digagalkan Fetch). Jangan pakai profil QA
# bersama — cache-nya bisa menyajikan chunk tanpa jaringan.
# Penggunaan: bash scripts/cdp-s444-chunkfail.sh
set -u
cd "$(dirname "$0")/.."
GOAL="$HOME/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files"
POLICY="$GOAL/qa-320-s72/webgl-policy.txt"
PROFILE="/tmp/cdp-s444-fresh-profile"
OUTDIR="hidden_files/qa-periodic-s444/cdp-s444"
mkdir -p "$OUTDIR"
rm -rf "$PROFILE"
cp "$GOAL/qa-320-s72/go.html" /tmp/go.html
SHA=$(sha256sum "$POLICY" | awk '{print $1}')
/opt/meta-chromium/chrome --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  --hatch-validate-webgl-allowed-domains --version || exit 1
nohup node node_modules/vite/bin/vite.js preview --port 4173 --host 127.0.0.1 >"$OUTDIR/preview-chunkfail.log" 2>&1 &
PREVIEW_PID=$!
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4173/ && break; sleep 1; done
nohup /opt/meta-chromium/chrome --headless=new --no-sandbox --disable-gpu \
  --disable-features=LocalNetworkAccessChecks \
  --remote-debugging-port=9222 --user-data-dir="$PROFILE" \
  --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  file:///tmp/go.html >"$OUTDIR/chrome-chunkfail.log" 2>&1 &
CHROME_PID=$!
cleanup() {
  kill "$CHROME_PID" 2>/dev/null
  kill "$PREVIEW_PID" 2>/dev/null
}
trap cleanup EXIT
for _ in $(seq 1 30); do curl -s http://127.0.0.1:9222/json/list >/dev/null 2>&1 && break; sleep 1; done
WS=$(curl -s http://127.0.0.1:9222/json/list | python3 -c "import sys,json; d=json.load(sys.stdin); print([t for t in d if t.get('type')=='page'][0]['webSocketDebuggerUrl'])")
echo "WS=$WS PREVIEW_PID=$PREVIEW_PID CHROME_PID=$CHROME_PID"
node scripts/cdp-s444-chunkfail.mjs "$WS" 390 "http://127.0.0.1:4173/" "$OUTDIR" || echo "CHUNKFAIL GAGAL"
echo "SELESAI"
