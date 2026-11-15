// Probe CDP batch s438 seksi J: state berubah di tengah jalan (ide 91–100).
// Penggunaan: bash scripts/cdp-launch.sh scripts/cdp-s438.mjs hidden_files/qa-periodic-s438/cdp-s438 390
// (pola sama seperti cdp-s437.mjs: node <skrip> <wsUrl> <width> <baseUrl> <outDir>)
import { writeFileSync, mkdirSync } from "node:fs";

const [_wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg || "390", 10);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; };

const ws = new WebSocket(_wsUrl);
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
await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width <= 560 });

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1400); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---------- 91: hapus localStorage di layar Sukses ----------
await safe("j91", async () => {
  await evalJs(`(() => { const o = { ref: 'RSD-TEST91', kind: 'game', product: 'Mobile Legends', item: '86 Diamonds', qty: 1, target: '12345678 (1234)', base: 21580, fee: 0, disc: 0, total: 21580, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '', token: null }; localStorage.setItem('rosdi_orders', JSON.stringify([o])); return 'seeded'; })()`);
  await goHash("#/sukses/RSD-TEST91");
  const before = await evalJs(`document.body.innerText.includes('RSD-TEST91')`);
  await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);
  await sleep(300);
  const afterDelete = await evalJs(`document.body.innerText.includes('RSD-TEST91')`);
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2500);
  const afterReload = await evalJs(`document.body.innerText.slice(0, 200)`);
  return { shownBefore: before, stillShownAfterDelete: afterDelete, afterReload };
});

// ---------- 92: hapus localStorage di tengah checkout ----------
await safe("j92", async () => {
  await evalJs(`localStorage.clear(); 'ok'`);
  await goHash("#/");
  await sleep(500);
  await evalJs(`(() => { document.querySelector('.header-actions .icon-btn').click(); return document.documentElement.dataset.theme; })()`);
  await sleep(300);
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[6].click(); return 'ok'; })()`);
  const before = await evalJs(`({ theme: document.documentElement.dataset.theme, uid: document.querySelector('#uid').value, itemRow: [...document.querySelectorAll('.sum-row')].map(r => r.innerText).find(r => r.startsWith('Item')) })`);
  await evalJs(`localStorage.clear(); 'ok'`);
  await sleep(300);
  const afterDelete = await evalJs(`({ theme: document.documentElement.dataset.theme, uid: document.querySelector('#uid')?.value, itemRow: [...document.querySelectorAll('.sum-row')].map(r => r.innerText).find(r => r.startsWith('Item')) })`);
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2500);
  const afterReload = await evalJs(`({ theme: document.documentElement.dataset.theme, uid: document.querySelector('#uid')?.value || null, storedTheme: localStorage.getItem('rosdi_theme') })`);
  return { before, afterDelete, afterReload };
});

// ---------- 93: refresh Beranda setelah mengetik pencarian ----------
await safe("j93", async () => {
  await goHash("#/");
  await setInput(".searchbar input", "mlbb");
  await sleep(300);
  const before = await evalJs(`document.querySelector('.searchbar input').value`);
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2500);
  const after = await evalJs(`document.querySelector('.searchbar input')?.value`);
  return { before, afterReload: after };
});

// ---------- 94: back browser dari Beranda ----------
await safe("j94", async () => {
  const before = await evalJs(`({ hash: location.hash, len: history.length })`);
  await evalJs(`history.back(); 'ok'`);
  await sleep(1500);
  const after = await evalJs(`({ hash: location.hash, url: location.href, bodyStart: document.body.innerText.slice(0, 120), title: document.title })`);
  return { before, after };
});

// ---------- 95: kartu game di tab baru ----------
await safe("j95", async () => {
  await goHash("#/");
  const dom = await evalJs(`(() => { const a = document.querySelector('.grid.c4 a.card'); return a ? { tag: a.tagName, href: a.getAttribute('href') } : null; })()`);
  const opened = await evalJs(`(() => { const w = window.open('#/game/free-fire', '_blank'); return w ? 'opened' : 'blocked'; })()`);
  await sleep(2500);
  return { dom, opened, note: "isi tab baru dicek terpisah bila window.open lolos" };
});

// ---------- 96: putar HP saat modal terbuka ----------
await safe("j96", async () => {
  await goHash("#/");
  await evalJs(`(() => { [...document.querySelectorAll('.header-actions .btn')].find(b => b.innerText.trim() === 'Masuk')?.click(); return 'ok'; })()`);
  await sleep(500);
  const portrait = await evalJs(`(() => { const m = document.querySelector('.modal'); const v = document.querySelector('.modal-veil'); if (!m || !v) return { open: false }; const r = m.getBoundingClientRect(); const vr = v.getBoundingClientRect(); return { open: true, modal: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, veil: { w: Math.round(vr.width), h: Math.round(vr.height) }, vw: innerWidth, vh: innerHeight }; })()`);
  await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
  await sleep(800);
  const landscape = await evalJs(`(() => { const m = document.querySelector('.modal'); const v = document.querySelector('.modal-veil'); if (!m || !v) return { open: false }; const r = m.getBoundingClientRect(); const vr = v.getBoundingClientRect(); return { open: true, modal: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, veil: { w: Math.round(vr.width), h: Math.round(vr.height) }, vw: innerWidth, vh: innerHeight, centeredX: Math.abs((r.x + r.width / 2) - innerWidth / 2) < 2, centeredY: Math.abs((r.y + r.height / 2) - innerHeight / 2) < 2 }; })()`);
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width <= 560 });
  await evalJs(`(() => { document.querySelector('.modal .btn.big')?.click(); return 'ok'; })()`);
  return { portrait, landscape };
});

// ---------- 97: ubah tema OS saat aplikasi terbuka ----------
await safe("j97", async () => {
  await evalJs(`localStorage.removeItem('rosdi_theme'); 'ok'`);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2500);
  const dark = await evalJs(`document.documentElement.dataset.theme`);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  await sleep(800);
  const afterSwitch = await evalJs(`document.documentElement.dataset.theme`);
  await send("Emulation.setEmulatedMedia", { features: [] });
  return { themeAfterReloadDarkOS: dark, themeAfterLiveSwitchToLight: afterSwitch };
});

// ---------- 99: race Pakai promo -> Beli Sekarang ----------
async function setupCheckout() {
  await evalJs(`localStorage.clear(); 'ok'`);
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[6].click(); return 'ok'; })()`); // 86 Diamonds Rp21.580
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find(b => b.innerText.includes('QRIS'))?.click(); return 'ok'; })()`);
  await sleep(400);
}
await safe("j99_same_task", async () => {
  await setupCheckout();
  const r = await evalJs(`(() => {
    const promo = document.querySelector('.step form .input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(promo, 'ROSDI10'); promo.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.step form .btn').click(); // Pakai (submit)
    document.querySelector('.summary .btn.big').click(); // Beli — tugas yang SAMA, tanpa jeda
    return { hash: location.hash, orders: JSON.parse(localStorage.getItem('rosdi_orders') || '[]').map(o => ({ ref: o.ref, disc: o.disc, total: o.total })) };
  })()`);
  await sleep(600);
  return r;
});
await safe("j99_delayed", async () => {
  await setupCheckout();
  await setInput(".step form .input", "ROSDI10");
  await evalJs(`(() => { document.querySelector('.step form .btn').click(); return 'ok'; })()`);
  await sleep(400);
  const msg = await evalJs(`document.querySelector('.step .note.good')?.innerText || document.querySelector('.step .note.bad')?.innerText || null`);
  await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
  await sleep(600);
  const order = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]`);
  return { promoMsg: msg, order: order ? { disc: order.disc, total: order.total, method: order.method } : null };
});

// ---------- 100: Beli lalu cepat ganti metode ----------
await safe("j100", async () => {
  await setupCheckout();
  const r = await evalJs(`(() => {
    document.querySelector('.summary .btn.big').click(); // Beli
    // coba ganti metode segera sesudah Beli ditekan
    const gopay = [...document.querySelectorAll('.pay')].find(b => b.innerText.includes('GoPay'));
    if (gopay) gopay.click();
    const orders = JSON.parse(localStorage.getItem('rosdi_orders') || '[]');
    return { hash: location.hash, orders: orders.map(o => ({ method: o.method, total: o.total })), stillOnCheckout: !!document.querySelector('.summary .btn.big') };
  })()`);
  await sleep(600);
  return r;
});

writeFileSync(`${outDir}/cdp-s438-${width}.json`, JSON.stringify(R, null, 2));
console.log("DONE", width, Object.keys(R).length, "blok");
process.exit(0);
