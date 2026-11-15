#!/usr/bin/env bash
# Luncurkan vite preview + Chrome headless lokal (pola Siklus 71/112/113),
# jalankan skrip ukur CDP yang diberikan per lebar, lalu matikan keduanya
# by PID (jangan pernah pkill by pola — pernah membunuh shell sendiri).
# Penggunaan: bash scripts/cdp-launch.sh <skrip-ukur.mjs> <outDir> <width...>
# Skrip ukur dipanggil: node <skrip> <wsUrl> <width> http://127.0.0.1:4173/ <outDir>
set -u
cd "$(dirname "$0")/.."
GOAL="$HOME/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files"
POLICY="$GOAL/qa-320-s72/webgl-policy.txt"
PROFILE="$GOAL/qa-320-s72/chrome-profile"
MEASURE="$1"; OUTDIR="$2"; shift 2
mkdir -p "$OUTDIR"
cp "$GOAL/qa-320-s72/go.html" /tmp/go.html
SHA=$(sha256sum "$POLICY" | awk '{print $1}')
/opt/meta-chromium/chrome --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  --hatch-validate-webgl-allowed-domains --version || exit 1
nohup node node_modules/vite/bin/vite.js preview --port 4173 --host 127.0.0.1 >"$OUTDIR/preview.log" 2>&1 &
PREVIEW_PID=$!
# Tunggu preview benar-benar menjawab SEBELUM Chrome diluncurkan: bila
# redirect go.html jalan saat vite belum bind, Chrome menampilkan halaman
# error dan navigasi berikutnya dari halaman error itu kena blok LNA.
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4173/ && break; sleep 1; done
# --disable-features=LocalNetworkAccessChecks: tanpa ini, redirect file://
# go.html ke 127.0.0.1 diblokir LNA ("127.0.0.1 is blocked") — go.html saja
# tidak cukup bila flag ini tidak ada (pelajaran Siklus 114).
nohup /opt/meta-chromium/chrome --headless=new --no-sandbox --disable-gpu \
  --disable-features=LocalNetworkAccessChecks \
  --remote-debugging-port=9222 --user-data-dir="$PROFILE" \
  --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  file:///tmp/go.html >"$OUTDIR/chrome.log" 2>&1 &
CHROME_PID=$!
cleanup() {
  kill "$CHROME_PID" 2>/dev/null
  kill "$PREVIEW_PID" 2>/dev/null
}
trap cleanup EXIT
for _ in $(seq 1 30); do curl -s http://127.0.0.1:9222/json/list >/dev/null 2>&1 && break; sleep 1; done
WS=$(curl -s http://127.0.0.1:9222/json/list | python3 -c "import sys,json; d=json.load(sys.stdin); print([t for t in d if t.get('type')=='page'][0]['webSocketDebuggerUrl'])")
echo "WS=$WS PREVIEW_PID=$PREVIEW_PID CHROME_PID=$CHROME_PID"
for W in "$@"; do
  echo "=== LEBAR $W ==="
  node "$MEASURE" "$WS" "$W" "http://127.0.0.1:4173/" "$OUTDIR" || echo "UKUR $W GAGAL"
done
echo "SELESAI"
