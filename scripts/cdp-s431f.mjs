// Verifikasi akhir s431: urutan heading (77), target scroll CTA hero (7),
// tautan Cara Top Up footer (6) — setelah perbaikan h2 + scroll-margin.
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
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const R = {};
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
// 77: urutan heading per halaman
const headings = async () => evalJs(`(() => { const hs = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => h.tagName.toLowerCase() + ':' + h.textContent.trim().slice(0, 28)); const levels = hs.map((h) => parseInt(h[1], 10)); let jumps = []; for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i-1] + 1) jumps.push(hs[i-1] + ' -> ' + hs[i]); return { h1Count: document.querySelectorAll('h1').length, headings: hs, jumps }; })()`);
await goHash("#/");
R["77-home"] = await headings();
await goHash("#/game/mobile-legends");
R["77-game"] = await headings();
await goHash("#/cek");
R["77-cek"] = await headings();
await evalJs(`(() => { const mk = (o) => ({ ref: o.ref, kind: o.kind, product: o.product, item: o.item, qty: 1, target: o.target, base: o.base, fee: o.fee, disc: 0, total: o.total, method: o.method, time: Date.now(), status: o.status, email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([mk({ ref: 'RSD-T1', kind: 'game', product: 'Mobile Legends', item: '86 Diamonds', target: '12345678 (1234)', base: 21580, fee: 0, total: 21580, method: 'QRIS', status: 'Diproses' })])); return 'ok'; })()`);
await goHash("#/sukses/RSD-T1");
R["77-sukses"] = await headings();
await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);
// 7: CTA hero
await goHash("#/");
await evalJs(`(() => { document.querySelector('.hero .btn')?.click(); return 'ok'; })()`);
await sleep(1200);
R[7] = await evalJs(`(() => { const k = document.getElementById('katalog'); const r = k?.getBoundingClientRect(); const hdr = document.querySelector('header.site')?.getBoundingClientRect(); return { katalogTop: r ? +r.top.toFixed(1) : null, headerBottom: hdr ? +hdr.bottom.toFixed(1) : null, headingVisible: r ? r.top >= (hdr?.bottom || 0) - 1 : null }; })()`);
// 6: Cara Top Up dari halaman produk
await goHash("#/game/mobile-legends");
await evalJs(`(() => { const b = [...document.querySelectorAll('footer .flink')].find((e) => e.textContent.trim() === 'Cara Top Up'); b?.click(); return 'ok'; })()`);
await sleep(1200);
R[6] = await evalJs(`(() => { const el = document.getElementById('cara-topup'); const r = el?.getBoundingClientRect(); const hdr = document.querySelector('header.site')?.getBoundingClientRect(); return { hash: location.hash, caraTop: r ? +r.top.toFixed(1) : null, headerBottom: hdr ? +hdr.bottom.toFixed(1) : null, headingVisible: r ? r.top >= (hdr?.bottom || 0) - 1 : null }; })()`);
writeFileSync(`${outDir}/s431f-${width}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI final lebar", width, JSON.stringify(R).slice(0, 400));
process.exit(0);
