// Verifikasi perbaikan s442: guard skema lama (ide 39) + urutan DOM badge (ide 79).
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
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result.value;
  });

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2000);
await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-OLD001', product: 'Mobile Legends', item: '86 Diamonds' }])); location.hash = '#/cek'; 'ok'`);
await sleep(1200);
R.old_history = await evalJs(`(() => { const rows = [...document.querySelectorAll('.step button.sum-row')].map((e) => e.textContent); return { rows, hasNaN: rows.some((t) => t.includes('NaN')), hasUndefined: rows.some((t) => t.includes('undefined')) }; })()`);
await evalJs(`(() => { const row = document.querySelector('.step button.sum-row'); if (row) row.click(); return 'ok'; })()`);
await sleep(1000);
R.old_sukses = await evalJs(`(() => { const t = document.body.innerText; return { hasNaN: t.includes('NaN'), hasUndefined: t.includes('undefined'), hasInvalidDate: t.includes('Invalid Date'), totalLine: [...document.querySelectorAll('.sum-total')].map((e) => e.textContent), waktuLine: [...document.querySelectorAll('.sum-row')].find((e) => e.textContent.startsWith('Waktu'))?.textContent }; })()`);
// order baru tetap tampil benar (regresi)
await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-NEW001', product: 'Mobile Legends', item: '172 Diamonds', qty: 2, target: '12345678 (1234)', base: 87000, fee: 0, disc: 8700, total: 78300, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '', token: null }])); location.hash = '#/sukses/RSD-NEW001'; 'ok'`);
await sleep(1200);
R.new_sukses = await evalJs(`(() => { const t = document.body.innerText; return { hasNaN: t.includes('NaN'), total: document.querySelector('.sum-total b')?.textContent, hargaBiaya: [...document.querySelectorAll('.sum-row')].find((e) => e.textContent.startsWith('Harga + biaya'))?.textContent }; })()`);
// urutan DOM badge + posisi visual badge 172 Diamonds
await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
await sleep(1200);
R.badge_order = await evalJs(`(() => {
  const nom = [...document.querySelectorAll('.nom')].find((n) => (n.textContent || '').includes('172 Diamonds'));
  const badge = nom.querySelector('.badge');
  const br = badge.getBoundingClientRect(), nr = nom.getBoundingClientRect();
  return { domOrder: [...nom.children].map((c) => c.className), badgeText: badge.textContent, badgeTopVsCardTop: Math.round(br.top - nr.top), badgeRightVsCardRight: Math.round(nr.right - br.right), badgeVisible: br.width > 0 };
})()`);
await evalJs(`localStorage.clear(); 'ok'`);
writeFileSync(`${outDir}/cdp-s442-verify.json`, JSON.stringify(R, null, 1));
console.log("SELESAI-VERIFY");
process.exit(0);
