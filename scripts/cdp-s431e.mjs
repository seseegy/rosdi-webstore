// Verifikasi kunci scroll modal (ide 58) dengan wheel ASLI via CDP
// (window.scrollTo programatik menembus overflow:hidden — bukan uji sah;
// wheel pengguna yang harus tertahan).
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
const wheel = async (n) => {
  for (let i = 0; i < n; i++) {
    await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 195, y: 500, deltaX: 0, deltaY: 300 });
    await sleep(120);
  }
};
const R = await evalJs(`(async () => { window.scrollTo(0, 500); await new Promise((r) => setTimeout(r, 600)); return window.scrollY; })()`);
const y0 = R;
// kontrol: wheel tanpa modal — harus menggeser
await wheel(3);
await sleep(400);
const yNoModal = await evalJs(`window.scrollY`);
// buka modal, lalu wheel lagi
await evalJs(`(() => { const b = [...document.querySelectorAll('.header-actions .btn')].find((e) => e.textContent.trim() === 'Masuk'); b?.focus(); b?.click(); return 'ok'; })()`);
await sleep(500);
const modalOpen = await evalJs(`!!document.querySelector('.modal[role=dialog]')`);
const yAtOpen = await evalJs(`window.scrollY`);
await wheel(3);
await sleep(400);
const yWithModal = await evalJs(`window.scrollY`);
// tutup modal, wheel lagi — harus menggeser kembali
await evalJs(`(() => { document.querySelector('.modal-veil')?.click(); return 'ok'; })()`);
await sleep(400);
await wheel(3);
await sleep(400);
const yAfterClose = await evalJs(`window.scrollY`);
const out = { y0, yNoModal, modalOpen, yAtOpen, yWithModal, locked: yWithModal === yAtOpen, yAfterClose, unlockedAgain: yAfterClose > yWithModal };
writeFileSync(`${outDir}/s431e-${width}.json`, JSON.stringify({ 58: out }, null, 2));
console.log("WHEEL-LOCK", JSON.stringify(out));
process.exit(0);
