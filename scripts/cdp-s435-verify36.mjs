// Verifikasi ide 36 saja: aria-live tombol Salin di halaman Sukses.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  const to = setTimeout(() => { pending.delete(id); reject(new Error("TIMEOUT " + method)); }, 25000);
  pending.set(id, { resolve: (v) => { clearTimeout(to); resolve(v); }, reject: (e) => { clearTimeout(to); reject(e); } });
  ws.send(JSON.stringify({ id, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; });
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2000);
await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-TEST36A', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '' }])); 'ok'`);
await evalJs(`location.hash = '#/sukses/RSD-TEST36A'; 'ok'`);
await sleep(1200);
const R = await evalJs(`(() => {
  const b = [...document.querySelectorAll('.btn.ghost')].find((x) => x.textContent.trim() === 'Salin');
  if (!b) return { salin: 'NO-BTN' };
  b.click();
  return { salinLive: b.getAttribute('aria-live'), textAfterClick: b.textContent.trim() };
})()`);
await sleep(300);
R.textAfter300ms = await evalJs(`[...document.querySelectorAll('.btn.ghost')].find((x) => /Salin/.test(x.textContent))?.textContent.trim()`);
writeFileSync(`${outDir}/s435-verify36-w390.json`, JSON.stringify(R, null, 1));
console.log("VERIFY36 OK", JSON.stringify(R));
try { ws.close(); } catch { /* abaikan */ }
process.exit(0);
