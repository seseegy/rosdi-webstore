#!/usr/bin/env bash
# Launcher CDP TERISOLASI s459: server statis snapshot dist + Chrome profil segar,
# port HTTP & debug berbeda — agar tidak bentrok dengan sesi agent duplikat
# (yang memakai profil + port launcher standar 4173/9222).
# Penggunaan: bash scripts/cdp-launch-isolated.sh <profilDir> <rootDir> <httpPort> <dbgPort> <skrip-ukur.mjs> <outDir> <width...>
# Skrip ukur dipanggil: node <skrip> <wsUrl> <width> http://127.0.0.1:<httpPort>/ <outDir>
set -u
cd "$(dirname "$0")/.."
GOAL="$HOME/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files"
POLICY="$GOAL/qa-320-s72/webgl-policy.txt"
PROFILE="$1"; ROOTDIR="$2"; HTTPPORT="$3"; DBGPORT="$4"; MEASURE="$5"; OUTDIR="$6"; shift 6
mkdir -p "$OUTDIR" "$PROFILE"
SHA=$(sha256sum "$POLICY" | awk '{print $1}')
/opt/meta-chromium/chrome --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  --hatch-validate-webgl-allowed-domains --version || exit 1
nohup python3 -m http.server "$HTTPPORT" --directory "$ROOTDIR" --bind 127.0.0.1 >"$OUTDIR/http.log" 2>&1 &
HTTP_PID=$!
for _ in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$HTTPPORT/" && break; sleep 1; done
# go.html redirect (seperti launcher standar): navigasi langsung dari baris
# perintah ke 127.0.0.1 kena blok LNA ("127.0.0.1 is blocked") meski flag
# LocalNetworkAccessChecks dimatikan — redirect dari file:// yang lolos.
printf '<!doctype html><title>go</title><script>location.href="http://127.0.0.1:%s/";</script>' "$HTTPPORT" > "/tmp/go-isolated-$HTTPPORT.html"
nohup /opt/meta-chromium/chrome --headless=new --no-sandbox --disable-gpu \
  --disable-features=LocalNetworkAccessChecks \
  --remote-debugging-port="$DBGPORT" --user-data-dir="$PROFILE" \
  --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  "file:///tmp/go-isolated-$HTTPPORT.html" >"$OUTDIR/chrome.log" 2>&1 &
CHROME_PID=$!
cleanup() {
  kill "$CHROME_PID" 2>/dev/null
  kill "$HTTP_PID" 2>/dev/null
}
trap cleanup EXIT
for _ in $(seq 1 30); do curl -s "http://127.0.0.1:$DBGPORT/json/list" >/dev/null 2>&1 && break; sleep 1; done
WS=$(curl -s "http://127.0.0.1:$DBGPORT/json/list" | python3 -c "import sys,json; d=json.load(sys.stdin); ps=[t for t in d if t.get('type')=='page' and '127.0.0.1:$HTTPPORT' in t.get('url','')]; print((ps or [t for t in d if t.get('type')=='page'])[0]['webSocketDebuggerUrl'])")
echo "WS=$WS HTTP_PID=$HTTP_PID CHROME_PID=$CHROME_PID"
for W in "$@"; do
  echo "=== LEBAR $W ==="
  node "$MEASURE" "$WS" "$W" "http://127.0.0.1:$HTTPPORT/" "$OUTDIR" || echo "UKUR $W GAGAL"
done
echo "SELESAI"
