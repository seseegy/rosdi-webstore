// Mini-probe penutup Siklus 431 (13c chip+pencarian, 44b total PLN 1jt).
// Penggunaan: WS=<wsUrl> node scripts/cdp-s431h.mjs <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const wsUrl = process.env.WS;
const [widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
mkdirSync(outDir, { recursive: true });
const R = {};
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
await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 560 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
// 13c: chip "Top Up Game" + cari "pulsa" -> irisan = kosong
await evalJs(`(() => { const b = [...document.querySelectorAll('.chip')].find((e) => e.textContent.trim() === 'Top Up Game'); if (b) b.click(); return !!b; })()`);
await sleep(300);
await setInput('input[aria-label="Cari produk"]', "pulsa");
await sleep(500);
R["13c"] = await evalJs(`({ sections: [...document.querySelectorAll('h2')].map((h) => h.textContent), nothing: !!document.querySelector('.empty'), emptyText: document.querySelector('.empty')?.textContent || null })`);
// 44b: PLN Token 1.000.000 + QRIS -> total maks PLN (qty selalu 1)
await goHash("#/pln");
await setInput("#idpel", "543210987654");
await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === 'Cek Nama'); if (b) b.click(); return !!b; })()`);
await sleep(500);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('Token 1.000.000')); if (b) b.click(); return !!b; })()`);
await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('QRIS')); if (b) b.click(); return !!b; })()`);
await sleep(400);
R["44b"] = await evalJs(`(() => { const t = document.querySelector('.sum-total b'); const mb = document.querySelector('.mb-total b'); return { qtyStepper: !!document.querySelector('.qty'), total: t?.textContent, totalScrollW: t?.scrollWidth, totalClientW: t?.clientWidth, mbTotal: mb?.textContent || null, mbScrollW: mb?.scrollWidth, mbClientW: mb?.clientWidth }; })()`);
writeFileSync(`${outDir}/s431h-${width}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI s431h", JSON.stringify(R));
process.exit(0);
