// Probe Fase Perbaikan 2 — baseline & verifikasi B1 (skeleton) + B5 (zoom/reflow).
// Pakai: bash scripts/cdp-launch-isolated.sh /tmp/cdp-fase2-prof dist 4795 9295 scripts/cdp-fase2-probe.mjs hidden_files/cdp-fase2 390
import { mkdirSync, writeFileSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const results = {};
const rec = (id, data) => { results[id] = data; console.log(id, JSON.stringify(data)); };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; });
const setMetrics = async (w, h = 844) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(1500); };

// --- B1: skeleton saat lazy chunk dimuat (navigasi dingin) ---
await setMetrics(390);
await nav("#/");
// ukur fallback Suspense: navigasi ke rute lazy, sampel 120ms setelah klik
const b1 = await evalJs(`(async () => {
  const out = {};
  const go = (h) => { location.hash = h; };
  for (const [key, hash] of [["pulsa","#/pulsa"],["game","#/game/mobile-legends"],["cek","#/cek"],["sukses","#/sukses/RSD-DEMO1234"]]) {
    go(hash);
    await new Promise(r => setTimeout(r, 120));
    out[key] = {
      skeleton: !!document.querySelector('.skel, [data-skeleton], .skeleton'),
      memuatText: document.body.innerText.includes('Memuat halaman'),
      cards: document.querySelectorAll('.card, .nom, .step').length,
    };
    await new Promise(r => setTimeout(r, 1500));
  }
  return out;
})()`);
rec("B1-skeleton-120ms", b1);

// --- B5: header overflow di lebar sempit + zoom CSS ---
const headerOverflow = async () => evalJs(`(() => {
  const h = document.querySelector('.header-actions');
  const btn = [...document.querySelectorAll('header.site .btn')].find(b => b.textContent.trim() === 'Masuk');
  const hr = h ? h.getBoundingClientRect() : null;
  const br = btn ? btn.getBoundingClientRect() : null;
  const logo = document.querySelector('.logo');
  const lr = logo ? logo.getBoundingClientRect() : null;
  return { innerWidth: window.innerWidth, headerActionsRight: hr ? +hr.right.toFixed(1) : null, masukRight: br ? +br.right.toFixed(1) : null, masukVisible: br ? +(Math.min(br.right, window.innerWidth) - Math.max(br.left, 0)).toFixed(1) : null, masukWidth: br ? +br.width.toFixed(1) : null, logoRight: lr ? +lr.right.toFixed(1) : null, docScrollW: document.documentElement.scrollWidth };
})()`);
await setMetrics(390);
await nav("#/");
for (const z of [100, 165, 180, 190]) {
  await evalJs(`document.documentElement.style.zoom = '${z}%'; 'ok'`);
  await sleep(500);
  rec(`B5-header-zoom${z}`, await headerOverflow());
  await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
}
for (const w of [240, 280]) {
  await setMetrics(w);
  await sleep(500);
  rec(`B5-header-w${w}`, await headerOverflow());
}
await setMetrics(390);

// --- B5: harga nominal vs kartu di zoom 190% (mode g86b s465) ---
await nav("#/game/mobile-legends");
await evalJs(`document.documentElement.style.zoom = '190%'; 'ok'`);
await sleep(600);
const prices = await evalJs(`(() => {
  const out = [];
  document.querySelectorAll('.nom').forEach((card, i) => {
    const cr = card.getBoundingClientRect();
    const price = card.querySelector('.n-price');
    const range = document.createRange(); range.selectNodeContents(price);
    const tr = range.getBoundingClientRect();
    out.push({ i, keluar: +(tr.right - cr.right).toFixed(1), teks: price.textContent.trim().slice(0, 14) });
  });
  return { jumlah: out.length, keluar: out.filter(o => o.keluar > 0.5).length, maks: Math.max(...out.map(o => o.keluar)), contoh: out.slice(0, 3) };
})()`);
rec("B5-harga-zoom190", prices);
await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
// harga di zoom 160% Valorant (s463-4)
await nav("#/game/valorant");
await evalJs(`document.documentElement.style.zoom = '160%'; 'ok'`);
await sleep(600);
const pricesV = await evalJs(`(() => {
  const out = [];
  document.querySelectorAll('.nom').forEach((card, i) => {
    const cr = card.getBoundingClientRect();
    const price = card.querySelector('.n-price');
    const range = document.createRange(); range.selectNodeContents(price);
    const tr = range.getBoundingClientRect();
    out.push({ i, keluar: +(tr.right - cr.right).toFixed(1), teks: price.textContent.trim().slice(0, 16) });
  });
  return { jumlah: out.length, keluar: out.filter(o => o.keluar > 0.5).length, maks: Math.max(...out.map(o => o.keluar)) };
})()`);
rec("B5-harga-valorant-zoom160", pricesV);
await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);

writeFileSync(outDir + "/fase2-probe.json", JSON.stringify(results, null, 2));
console.log("SELESAI");
process.exit(0);
