// Verifikasi ulang kunci scroll modal (ide 58) setelah perbaikan:
// kunci di documentElement, bukan body.
// Penggunaan: node scripts/cdp-s431c.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
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
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`location.hash = '#/'; 'ok'`);
await sleep(1200);
await evalJs(`window.scrollTo(0, 500); 'ok'`);
await sleep(600);
await evalJs(`(() => { const b = [...document.querySelectorAll('.header-actions .btn')].find((e) => e.textContent.trim() === 'Masuk'); b?.focus(); b?.click(); return 'ok'; })()`);
await sleep(400);
const R = await evalJs(`(async () => { const y0 = window.scrollY; window.scrollTo(0, 900); await new Promise((r) => setTimeout(r, 600)); const y1 = window.scrollY; document.querySelector('.modal-veil')?.click(); await new Promise((r) => setTimeout(r, 300)); window.scrollTo(0, 900); await new Promise((r) => setTimeout(r, 600)); const y2 = window.scrollY; return { modalOpen: true, yBefore: y0, yAfterAttemptLocked: y1, locked: y1 === y0, htmlOverflow: getComputedStyle(document.documentElement).overflow, yAfterCloseAndScroll: y2, unlocked: y2 > y1 }; })()`);
writeFileSync(`${outDir}/s431c-${width}.json`, JSON.stringify({ 58: R }, null, 2));
console.log("SELESAI scroll-lock lebar", width, JSON.stringify(R));
process.exit(0);
