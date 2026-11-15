// Verifikasi pasca-perbaikan s461: A1 (HP .ok) + A2 (PLN .ok) di build baru.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; console.log(id, JSON.stringify(data)); };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await nav("#/pulsa/telkomsel");
await safe("VERIFY-A1-hp-ok", async () => {
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`);
  await sleep(400);
  return evalJs(`(() => { const el = document.querySelector('#hp'); const cs = getComputedStyle(el); return { kelas: el.className, borderColor: cs.borderColor, adaOk: el.classList.contains('ok'), transisi: cs.transitionProperty + ' ' + cs.transitionDuration }; })()`);
});
// HP salah operator (mismatch) -> tidak .ok
await safe("VERIFY-A1b-hp-mismatch", async () => {
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081712345678'); return 'ok'; })()`);
  await sleep(400);
  return evalJs(`(() => { const el = document.querySelector('#hp'); return { kelas: el.className, adaOk: el.classList.contains('ok'), adaErr: el.classList.contains('err') }; })()`);
});
await nav("#/pln");
await safe("VERIFY-A2-pln-ok", async () => {
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
  await sleep(300);
  const sebelum = await evalJs(`(() => { const el = document.querySelector('#idpel'); return { kelas: el.className, adaOk: el.classList.contains('ok') }; })()`);
  await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek Nama')?.click(); return 'ok'; })()`);
  await sleep(400);
  const sesudah = await evalJs(`(() => { const el = document.querySelector('#idpel'); const cs = getComputedStyle(el); return { kelas: el.className, borderColor: cs.borderColor, adaOk: el.classList.contains('ok'), transisi: cs.transitionProperty + ' ' + cs.transitionDuration }; })()`);
  return { sebelumCek: sebelum, sesudahCek: sesudah };
});
writeFileSync(outDir + "/cdp-s461-verify.json", JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).length, "ukuran");
process.exit(0);
