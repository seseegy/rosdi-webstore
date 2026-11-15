// Verifikasi cepat perbaikan s465 A8 (VoucherPage .ok).
import { mkdirSync } from "node:fs";
const [wsUrl, , baseUrl] = process.argv.slice(2);
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/voucher/google-play")}); 'ok'`);
await sleep(2200);
const r = await evalJs(`(async () => {
  const set = (sel, v) => { const el = document.querySelector(sel); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  set('#vemail', 'nama@mail.com');
  await new Promise((r) => setTimeout(r, 400));
  const el = document.querySelector('#vemail');
  const cs = getComputedStyle(el);
  const valid = { kelas: el.className, punyaOk: el.classList.contains('ok'), borderColor: cs.borderColor };
  set('#vemail', 'tanpa-at');
  await new Promise((r) => setTimeout(r, 400));
  const cs2 = getComputedStyle(el);
  return { valid, invalid: { kelas: el.className, punyaErr: el.classList.contains('err'), borderColor: cs2.borderColor } };
})()`);
console.log("A8-verify", JSON.stringify(r));
process.exit(0);
