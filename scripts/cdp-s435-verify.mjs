// Verifikasi perbaikan s435 (ide 65/85/34/36) — read-only kecuali order lokal.
// Penggunaan: node scripts/cdp-s435-verify.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, _widthArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const R = {};
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const to = setTimeout(() => { pending.delete(id); reject(new Error("TIMEOUT " + method)); }, 25000);
    pending.set(id, { resolve: (v) => { clearTimeout(to); resolve(v); }, reject: (e) => { clearTimeout(to); reject(e); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
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
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(900); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickNom = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.nom')]; const el = els.find((e) => e.querySelector('.n-name')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickPay = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.pay')]; const el = els.find((e) => e.querySelector('.p-name2')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { R[id] = await fn(); console.log("verify:", id, "OK"); } catch (e) { R[id] = { ERROR: String(e).slice(0, 300) }; console.log("verify:", id, "ERROR", String(e).slice(0, 120)); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2000);
await evalJs(`localStorage.clear(); 'ok'`);

// 65: klik Beli sinkron 2x (pola yang dulu menghasilkan 2 order)
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678"); await setInput("#zone", "1234");
await clickNom("172 Diamonds");
await clickPay("QRIS"); await sleep(200);
await safe("buy65sync", async () => {
  const before = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  await evalJs(`(() => { const btns = [...document.querySelectorAll('.mobile-bar .btn, .summary .btn.big')].filter((x) => x.textContent.trim() === 'Beli Sekarang' && !x.disabled); if (!btns.length) return 'NO-ENABLED-BTN'; btns[0].click(); btns[0].click(); return 'clicked-x2'; })()`);
  await sleep(1200);
  const after = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  return { before, after, hash: await evalJs(`location.hash`) };
});
// 85: pesan error promo menyebut kode yang dimasukkan
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678"); await setInput("#zone", "1234");
await setInput(".step input[aria-label='Kode promo']", "SALAH99");
await evalJs(`document.querySelector('.step form .btn')?.click(); 'ok'`);
await sleep(300);
await safe("promo85", async () => evalJs(`document.querySelector('.note.bad')?.textContent?.trim() || 'NO-MSG'`));
// 34: aria-live pada nilai qty
await safe("qty34", async () => evalJs(`(() => { const b = document.querySelector('.qty b'); return b ? b.getAttribute('aria-live') : 'NO-QTY'; })()`));
// 36: aria-live pada tombol Salin (halaman Sukses dari order buy65sync)
await safe("copy36", async () => evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => x.textContent.trim() === 'Salin'); return b ? b.getAttribute('aria-live') : 'NO-BTN'; })()`));
writeFileSync(`${outDir}/s435-verify-w390.json`, JSON.stringify(R, null, 1));
console.log("VERIFY W390 OK");
try { ws.close(); } catch { /* abaikan */ }
process.exit(0);
