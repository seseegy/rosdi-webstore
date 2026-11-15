// Probe CDP s444 terpisah — ide 32: chunk lazy gagal dimuat (offline).
// Dijalankan dengan profil Chrome SEGAR (bukan profil QA bersama) agar chunk
// GamePage benar-benar diunduh lewat jaringan dan bisa digagalkan Fetch.
// Jalankan: bash scripts/cdp-s444-chunkfail.sh
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, , , outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === "Fetch.requestPaused") {
    ws.send(JSON.stringify({ id: nextId++, method: "Fetch.failRequest", params: { requestId: msg.params.requestId, errorReason: "Failed" } }));
    return;
  }
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
await evalJs(`localStorage.clear(); 'ok'`);
await send("Fetch.enable", { patterns: [{ urlPattern: "*GamePage*", requestStage: "Request" }] });
await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
await sleep(2000);
const body = await evalJs(`document.body.innerText.replace(/\\s+/g, ' ').slice(0, 400)`);
const hasRetry = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /muat ulang/i.test(x.textContent)); return b ? b.textContent.trim() : 'TIDAK-ADA-TOMBOL'; })()`);
await send("Fetch.disable");
// Setelah Fetch dimatikan, muat ulang halaman game: chunk harus bisa dimuat normal.
await evalJs(`location.reload(); 'ok'`);
await sleep(2000);
const afterReload = await evalJs(`(() => ({ h1: document.querySelector('h1')?.textContent || 'NO-H1', hash: location.hash }))()`);
const R = { chunk_fail_body: body, tombol: hasRetry, setelah_muat_ulang: afterReload };
writeFileSync(`${outDir}/cdp-s444-chunkfail.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
try { ws.close(); } catch {}
process.exit(0);
