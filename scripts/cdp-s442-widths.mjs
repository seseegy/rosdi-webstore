// Probe live s442 lebar: 91 (jendela mengambang), 96 (riwayat 360px),
// 97 (grid 700px), 98 (layout 1100px), 99 (aside 1280 vs 1440), 100 (mobile-bar vs keyboard).
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH };
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
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const probe = async (key, fn) => { try { R[key] = await fn(); } catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; } };

const HEIGHT = WIDTH <= 500 ? 400 : 900; // 91: jendela mengambang kecil utk lebar kecil
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900 });
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);

await probe("overflow_home", () => evalJs(`({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth })`));
await probe("grid_cols_home", async () => {
  const cols = await evalJs(`(() => { const g = document.querySelector('.grid.c4'); if (!g) return 'NO-GRID'; return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, cardW: Math.round(g.querySelector('.card')?.getBoundingClientRect().width || 0) }; })()`);
  return cols;
});
await probe("flow_layout", async () => {
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1500);
  return evalJs(`(() => {
    const flow = document.querySelector('.flow');
    const aside = document.querySelector('.summary');
    const ar = aside?.getBoundingClientRect();
    return { flowCols: getComputedStyle(flow).gridTemplateColumns, asideW: ar ? Math.round(ar.width) : null, asideTop: ar ? Math.round(ar.top + scrollY) : null, hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  })()`);
});
await probe("history_360", async () => {
  if (WIDTH !== 360) return "skip-bukan-360";
  await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([
    { ref: 'RSD-W360AAAA', product: 'Mobile Legends', item: '2195 Diamonds', qty: 1, target: '12345678 (1234)', base: 548000, fee: 2500, disc: 10000, total: 540500, method: 'BCA Virtual Account', time: Date.now(), status: 'Diproses', email: '', wa: '', token: null },
    { ref: 'RSD-W360BBBB', product: 'Token PLN', item: 'Token 1.000.000', qty: 1, target: '12345678901', base: 1002500, fee: 0, disc: 0, total: 1002500, method: 'QRIS', time: Date.now(), status: 'Selesai', email: '', wa: '', token: '1234 5678 9012 3456 7890' }
  ])); location.hash = '#/cek'; 'ok'`);
  await sleep(1200);
  return evalJs(`(() => {
    const rows = [...document.querySelectorAll('.step button.sum-row')].map((b) => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), scrollW: b.scrollWidth, clientW: b.clientWidth, clipped: b.scrollWidth > b.clientWidth + 1, text: b.textContent.replace(/\\s+/g, ' ').slice(0, 90) }; });
    return { rows, pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  })()`);
});
await probe("floating_window", async () => {
  if (WIDTH > 500) return "skip-bukan-jendela-kecil";
  // simulasi jendela mengambang: viewport kecil 480x400 sudah diset; uji interaksi dasar
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  return evalJs(`(() => {
    const uid = document.querySelector('#uid');
    const nom = document.querySelector('.nom');
    const bar = document.querySelector('.mobile-bar');
    return {
      uidVisible: !!uid && uid.getBoundingClientRect().width > 0,
      nomClickable: !!nom,
      barVisible: bar ? Math.round(bar.getBoundingClientRect().bottom) <= innerHeight + 1 : 'NO-BAR',
      hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      viewport: innerWidth + 'x' + innerHeight,
    };
  })()`);
});
await probe("mobile_bar_keyboard", async () => {
  if (WIDTH > 500) return "skip-bukan-mobile";
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  await evalJs(`(() => { document.querySelector('#uid').focus(); return 'ok'; })()`);
  await sleep(300);
  // keyboard virtual mengecilkan viewport visual: simulasikan tinggi 400
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 400, deviceScaleFactor: 1, mobile: true });
  await sleep(400);
  const r = await evalJs(`(() => { const bar = document.querySelector('.mobile-bar'); const br = bar.getBoundingClientRect(); const uid = document.querySelector('#uid').getBoundingClientRect(); return { barBottom: Math.round(br.bottom), viewportH: innerHeight, barVisible: br.bottom <= innerHeight + 1 && br.top >= 0, uidBottom: Math.round(uid.bottom), uidVisible: uid.bottom <= innerHeight }; })()`);
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: true });
  return r;
});

writeFileSync(`${outDir}/cdp-s442-w${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI w" + WIDTH);
process.exit(0);
