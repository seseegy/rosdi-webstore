// CDP s434b — pengukuran per lebar (ide 7, 24, 29 + hero 320/1280).
// Penggunaan: node scripts/cdp-s434b.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync } from "node:fs";

const [_wsUrl, widthArg, _baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "320", 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const api = {
      send: (method, params = {}) => new Promise((res, rej) => {
        const id = nextId++;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      evalJs: async (expression) => {
        const r = await api.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error("eval failed: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
        return r.result.value;
      },
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    };
    ws.onopen = () => resolve(api);
    ws.onerror = reject;
  });
}

const out = { width: WIDTH };
const listPages = () => fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const findAppPage = async () => {
  // Tunggu redirect go.html selesai DAN url stabil (2 poll berurutan sama).
  let prevUrl = null, prevId = null, stable = 0;
  for (let i = 0; i < 60; i++) {
    const list = await listPages();
    const t = list.find((x) => x.type === "page" && x.url.startsWith("http://127.0.0.1:4173"));
    if (t && t.url === prevUrl && t.id === prevId) { stable++; if (stable >= 2) return t; }
    else stable = 0;
    if (t) { prevUrl = t.url; prevId = t.id; }
    await sleep(500);
  }
  throw new Error("halaman app tidak ditemukan/stabil");
};
let main;
const connectMain = async () => {
  const target = await findAppPage();
  main = await connect(target.webSocketDebuggerUrl);
  await main.send("Page.enable");
  await main.send("Runtime.enable");
  await main.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: WIDTH < 900 });
  return main;
};
await connectMain();
const evalJsSafe = async (expression) => {
  const once = async () => {
    const r = await main.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval failed: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  };
  try { return await once(); }
  catch (e) {
    if (!String(e.message || e).includes("-32000") && !String(e.message || e).includes("navigated")) throw e;
    await sleep(1500);
    await connectMain();
    return await once();
  }
};
const ev = evalJsSafe;
const go = async (hash) => {
  // Navigasi HASH saja (tanpa reload penuh): reload penuh dari halaman app
  // kena blok LNA (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS), sedangkan
  // perubahan hash me-render ulang rute tanpa memuat ulang dokumen.
  await ev(`location.hash = ${JSON.stringify(hash)}`);
  // Tunggu React mount/render rute (root terisi) sebelum eval apa pun.
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const r = await main.send("Runtime.evaluate", { expression: "document.getElementById('root')?.children.length || 0", returnByValue: true });
      if (r.result && r.result.value > 0) break;
    } catch { /* coba lagi */ }
  }
  await sleep(600);
};
await ev(`localStorage.clear()`);

await go("");
// Hero per lebar
out.hero = await ev(`(() => {
  const h1 = document.querySelector('.hero h1');
  const p = document.querySelector('.hero p');
  const btn = document.querySelector('.hero .btn');
  const r = (el) => { const b = el.getBoundingClientRect(); return { y: Math.round(b.y), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
  return { h1: r(h1), sub: r(p), cta: r(btn), overlapSubCta: p.getBoundingClientRect().bottom > btn.getBoundingClientRect().top,
    h1Lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) };
})()`);
// Trust: kolom + kesejajaran ikon-judul + baris deskripsi
out.trust = await ev(`(() => {
  const cards = [...document.querySelectorAll('.trust .card')];
  const cs = getComputedStyle(document.querySelector('.trust'));
  return { columns: cs.gridTemplateColumns.split(' ').length,
    cards: cards.map((c) => {
      const ic = c.querySelector('.ic').getBoundingClientRect();
      const b = c.querySelector('b').getBoundingClientRect();
      const span = c.querySelector('span:not(.ic)');
      const lines = span ? Math.round(span.getBoundingClientRect().height / parseFloat(getComputedStyle(span).lineHeight)) : null;
      return { title: c.querySelector('b')?.innerText, iconTop: Math.round(ic.top), titleTop: Math.round(b.top),
        alignedTop: Math.round(ic.top) === Math.round(b.top), descLines: lines, cardH: Math.round(c.getBoundingClientRect().height) };
    }) };
})()`);
// Ide 7: mobile-bar total item flash di lebar kecil
await go("#/game/mobile-legends");
await ev(`(() => { const t = [...document.querySelectorAll('.tab')].find((x) => x.innerText.trim() === 'Weekly Pass'); if (t) t.click(); return !!t; })()`);
await sleep(300);
await ev(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.innerText.includes('Weekly Diamond Pass')); if (n) n.click(); return !!n; })()`);
await sleep(300);
await ev(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.innerText.includes('QRIS')); if (p) p.click(); return !!p; })()`);
await sleep(300);
out.flashMobileBar = await ev(`(() => {
  const mb = document.querySelector('.mobile-bar');
  const vis = mb ? getComputedStyle(mb).display : 'no-el';
  const mbText = mb ? mb.innerText.replace(/\\n/g, ' | ') : null;
  const sumTotal = document.querySelector('.sum-total')?.innerText.replace(/\\n/g, ' ');
  const sumHarga = [...document.querySelectorAll('.summary .sum-row')].find((r) => r.innerText.startsWith('Harga'))?.innerText.replace(/\\n/g, ' ');
  return { display: vis, mbText, sumTotal, sumHarga };
})()`);

writeFileSync(`${outDir}/s434-width-${WIDTH}.json`, JSON.stringify(out, null, 2));
console.log("CDP-B DONE", WIDTH, JSON.stringify(out).slice(0, 500));
process.exit(0);
