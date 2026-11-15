#!/usr/bin/env bash
# Launcher terisolasi s445e: vite preview :4174 + Chrome :9333 + profil /tmp
# (hindari tab/profil bersama agent marathon lain di :4173/:9222).
set -u
cd "$(dirname "$0")/.."
OUTDIR="hidden_files/qa-periodic-s445/cdp-s445e"
mkdir -p "$OUTDIR"
printf '<!doctype html><title>go</title><script>location.href="http://127.0.0.1:4174/";</script>' > /tmp/go-s445e.html
nohup node node_modules/vite/bin/vite.js preview --port 4174 --host 127.0.0.1 >"$OUTDIR/preview.log" 2>&1 &
PREVIEW_PID=$!
for _ in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:4174/ && break; sleep 1; done
rm -rf /tmp/chrome-s445e-profile
GOAL="$HOME/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files"
POLICY="$GOAL/qa-320-s72/webgl-policy.txt"
SHA=$(sha256sum "$POLICY" | awk '{print $1}')
/opt/meta-chromium/chrome --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  --hatch-validate-webgl-allowed-domains --version || exit 1
nohup /opt/meta-chromium/chrome --headless=new --no-sandbox --disable-gpu \
  --disable-features=LocalNetworkAccessChecks \
  --hatch-webgl-allowed-domains-file="$POLICY" \
  --hatch-webgl-allowed-domains-sha256="$SHA" \
  --remote-debugging-port=9333 --user-data-dir=/tmp/chrome-s445e-profile \
  file:///tmp/go-s445e.html >"$OUTDIR/chrome.log" 2>&1 &
CHROME_PID=$!
cleanup() { kill "$CHROME_PID" 2>/dev/null; kill "$PREVIEW_PID" 2>/dev/null; }
trap cleanup EXIT
for _ in $(seq 1 30); do curl -s http://127.0.0.1:9333/json/list >/dev/null 2>&1 && break; sleep 1; done
WS=$(curl -s http://127.0.0.1:9333/json/list | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const l=JSON.parse(s);const p=l.find(t=>t.type==='page');console.log(p.webSocketDebuggerUrl)})")
echo "WS=$WS"
node scripts/cdp-s445e.mjs "$WS" 390 http://127.0.0.1:4174/ "$OUTDIR"
node scripts/cdp-s445e.mjs "$WS" 1280 http://127.0.0.1:4174/ "$OUTDIR"
echo "DONE"
