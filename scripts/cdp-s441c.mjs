// Verifikasi perbaikan s441: tempel UID ber-zero-width kini lolos validasi,
// catatan riwayat "tidak ikut pindah" tampil di Cek.
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
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);
await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
await sleep(1500);
R.zw_uid = await evalJs(`(() => {
  const el = document.querySelector('#uid');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, '1234\\u200b5678');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'set';
})()`);
await sleep(400);
R.zw_uid_after = await evalJs(`(() => {
  const err = document.querySelector('.note.bad');
  const summary = [...document.querySelectorAll('.sum-row')].find((e) => e.textContent.startsWith('Tujuan'));
  return { errNote: err ? err.textContent : null, tujuan: summary ? summary.textContent : null };
})()`);
await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-V441', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '', token: '' }])); 'ok'`);
await evalJs(`location.hash = '#/cek'; 'ok'`);
await sleep(1200);
R.history_note = await evalJs(`(() => {
  const notes = [...document.querySelectorAll('.step .note')].map((e) => e.textContent);
  return { notes };
})()`);
writeFileSync(`${outDir}/cdp-s441c.json`, JSON.stringify(R, null, 1));
console.log("SELESAI");
