// Sisa s460: H85-H92 (deep link hash-query + request jaringan) dan
// G77-G80/G81/G82/G84 (grid di lebar/zoom yang belum terukur).
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = +wArg;
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
const setMetrics = async (w, h = 844, mobile = w < 900) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const halamanApa = `(() => {
  const h1 = document.querySelector('main h1')?.textContent?.trim() || null;
  const adaGame = !!document.querySelector('#uid, #riot');
  const adaBeranda = !!document.querySelector('.hero, #katalog');
  return { h1, adaGame, adaBeranda, hash: location.hash, title: document.title };
})()`;

if (WIDTH === 390) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);

  // ---------- H85-H90: deep link dgn query di dalam hash ----------
  await nav("#/game/mobile-legends?tab=xyz");
  await safe("H85-tab-xyz", () => evalJs(halamanApa));
  await nav("#/pulsa?operator=xyz");
  await safe("H86-operator-xyz", () => evalJs(halamanApa));
  await nav("#/game/genshin-impact?server=");
  await safe("H87-server-kosong", () => evalJs(halamanApa));
  await nav("#/game/mobile-legends?promo=");
  await safe("H88-promo-kosong", () => evalJs(halamanApa));
  await nav("#/game/mobile-legends?qty=1");
  await safe("H89-qty-1", async () => {
    const h = await evalJs(halamanApa);
    const q = await evalJs(`(() => { const b = document.querySelector('.qty b'); const minus = document.querySelector('.qty button[aria-label="Kurangi"]'); return b ? { qty: b.textContent, minusDisabled: minus.disabled } : 'TIDAK-ADA-STEPPER'; })()`);
    return { ...h, stepper: q };
  });
  await nav("#/game/mobile-legends?nominal=");
  await safe("H90-nominal-kosong", async () => {
    const h = await evalJs(halamanApa);
    const n = await evalJs(`(() => ({ nominalTerpilih: !!document.querySelector('.nom.on') }))()`);
    return { ...h, ...n };
  });
  // kontrol: tanpa query — halaman game normal?
  await nav("#/game/mobile-legends");
  await safe("H-kontrol-tanpa-query", () => evalJs(halamanApa));

  // ---------- H91: request jaringan halaman Voucher ----------
  await evalJs(`performance.clearResourceTimings(); 'ok'`);
  await nav("#/voucher/google-play");
  await sleep(1500);
  await safe("H91-request-voucher", () => evalJs(`(() => {
    const rs = performance.getEntriesByType('resource');
    const byName = {};
    for (const r of rs) byName[r.name] = (byName[r.name] || 0) + 1;
    const dup = Object.entries(byName).filter(([, c]) => c > 1).map(([n, c]) => ({ url: n.split('/').slice(-1)[0], kali: c }));
    return { jumlahRequest: rs.length, duplikat: dup, jenis: [...new Set(rs.map((r) => r.initiatorType))], daftar: rs.map((r) => r.name.split('/').slice(-1)[0] + ' (' + r.initiatorType + ')') };
  })()`));

  // ---------- H92: request jaringan halaman Tagihan ----------
  await evalJs(`performance.clearResourceTimings(); 'ok'`);
  await nav("#/tagihan/pln-pascabayar");
  await sleep(1500);
  await safe("H92-request-tagihan", () => evalJs(`(() => {
    const rs = performance.getEntriesByType('resource');
    const byName = {};
    for (const r of rs) byName[r.name] = (byName[r.name] || 0) + 1;
    const dup = Object.entries(byName).filter(([, c]) => c > 1).map(([n, c]) => ({ url: n.split('/').slice(-1)[0], kali: c }));
    return { jumlahRequest: rs.length, duplikat: dup, jenis: [...new Set(rs.map((r) => r.initiatorType))], daftar: rs.map((r) => r.name.split('/').slice(-1)[0] + ' (' + r.initiatorType + ')') };
  })()`));

  // ---------- G80: zoom 25% grid Beranda ----------
  await nav("#/");
  await evalJs(`(() => { document.documentElement.style.zoom = '0.25'; return 'ok'; })()`);
  await sleep(600);
  await safe("G80-zoom25-beranda", () => evalJs(`(() => {
    const g = document.querySelector('.grid.c4');
    const cs = getComputedStyle(g);
    const cards = [...document.querySelectorAll('.grid.c4 a.card')];
    const trunc = cards.map((c) => { const p = c.querySelector('.p-from'); return p ? p.scrollWidth > p.clientWidth + 0.5 : null; });
    return { kolom: cs.gridTemplateColumns.split(' ').length, templateColumns: cs.gridTemplateColumns, jumlahKartu: cards.length, hargaTerpotong: trunc.filter(Boolean).length, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
  await evalJs(`(() => { document.documentElement.style.zoom = ''; return 'ok'; })()`);
  await sleep(400);

  // ---------- G81: zoom 75% grid nominal ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(() => { document.documentElement.style.zoom = '0.75'; return 'ok'; })()`);
  await sleep(600);
  await safe("G81-zoom75-nominal", () => evalJs(`(() => {
    const g = document.querySelector('.nom-grid');
    const cs = getComputedStyle(g);
    const noms = [...document.querySelectorAll('.nom')];
    const trunc = noms.map((n) => { const p = n.querySelector('.n-price'); const nm = n.querySelector('.n-name'); return { harga: p ? p.scrollWidth > p.clientWidth + 0.5 : null, nama: nm ? nm.scrollWidth > nm.clientWidth + 0.5 : null }; });
    return { kolom: cs.gridTemplateColumns.split(' ').length, templateColumns: cs.gridTemplateColumns, jumlahNominal: noms.length, hargaTerpotong: trunc.filter((t) => t.harga).length, namaTerpotong: trunc.filter((t) => t.nama).length, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
  await evalJs(`(() => { document.documentElement.style.zoom = ''; return 'ok'; })()`);
  await sleep(400);
} else if (WIDTH === 418) {
  await setMetrics(418);
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await sleep(400);
  await safe("G77-grid-nominal-418", () => evalJs(`(() => {
    const g = document.querySelector('.nom-grid');
    const cs = getComputedStyle(g);
    const noms = [...document.querySelectorAll('.nom')].map((n) => { const r = n.getBoundingClientRect(); return { x: +r.x.toFixed(0), w: +r.width.toFixed(0), kananTerpotong: r.right > window.innerWidth + 0.5 }; });
    return { kolom: cs.gridTemplateColumns.split(' ').length, templateColumns: cs.gridTemplateColumns, jumlahNominal: noms.length, kartuTerpotong: noms.filter((n) => n.kananTerpotong).length, contohKartu: noms.slice(0, 4), overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
} else if (WIDTH === 420) {
  await setMetrics(420);
  await nav("#/");
  await sleep(600);
  await safe("G78-grid-game-420", () => evalJs(`(() => {
    const g = document.querySelector('.grid.c4');
    const cs = getComputedStyle(g);
    const cards = [...document.querySelectorAll('.grid.c4 a.card')].map((c) => { const r = c.getBoundingClientRect(); return { x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0) }; });
    const rows = {};
    for (const c of cards) rows[c.y] = (rows[c.y] || 0) + 1;
    const lastRowCount = rows[Math.max(...Object.keys(rows).map(Number))];
    return { kolom: cs.gridTemplateColumns.split(' ').length, templateColumns: cs.gridTemplateColumns, jumlahKartu: cards.length, kartuPerBaris: rows, kartuBarisTerakhir: lastRowCount, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
} else if (WIDTH === 1000) {
  await setMetrics(1000, 800, false);
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(500);
  await safe("G79-checkout-1000", () => evalJs(`(() => {
    const flow = document.querySelector('.flow');
    const aside = document.querySelector('.flow aside');
    const main = document.querySelector('.flow > div');
    if (!flow) return 'TIDAK-ADA-FLOW';
    const fr = flow.getBoundingClientRect(); const ar = aside?.getBoundingClientRect(); const mr = main?.getBoundingClientRect();
    const cs = getComputedStyle(flow);
    return { display: cs.display, gridTemplateColumns: cs.gridTemplateColumns, berdampingan: ar ? Math.abs(ar.top - mr.top) < 5 : null, asideX: ar?.x, mainX: mr?.x, asideW: ar?.width, mainW: mr?.width, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
} else if (WIDTH === 1024) {
  await setMetrics(1024, 768, false);
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  try { await send("Emulation.setPageScaleFactor", { pageScaleFactor: 1.5 }); await sleep(600); } catch (e) { await evalJs(`(() => { document.documentElement.style.zoom = '1.5'; return 'ok'; })()`); await sleep(600); }
  await safe("G84-grid-nominal-1024-zoom150", () => evalJs(`(() => {
    const g = document.querySelector('.nom-grid');
    const cs = getComputedStyle(g);
    const noms = [...document.querySelectorAll('.nom')];
    const trunc = noms.map((n) => { const p = n.querySelector('.n-price'); const nm = n.querySelector('.n-name'); return { harga: p ? p.scrollWidth > p.clientWidth + 0.5 : null, nama: nm ? nm.scrollWidth > nm.clientWidth + 0.5 : null }; });
    return { kolom: cs.gridTemplateColumns.split(' ').length, templateColumns: cs.gridTemplateColumns, jumlahNominal: noms.length, hargaTerpotong: trunc.filter((t) => t.harga).length, namaTerpotong: trunc.filter((t) => t.nama).length, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
} else if (WIDTH === 240) {
  await setMetrics(240);
  await nav("#/");
  await sleep(600);
  await safe("G82-grid-beranda-240", () => evalJs(`(() => {
    const g = document.querySelector('.grid.c4');
    const cs = getComputedStyle(g);
    const cards = [...document.querySelectorAll('.grid.c4 a.card')].map((c) => { const r = c.getBoundingClientRect(); return { x: +r.x.toFixed(0), w: +r.width.toFixed(0), kananTerpotong: r.right > window.innerWidth + 0.5 }; });
    const header = (() => { const ha = document.querySelector('.header-actions'); const r = ha?.getBoundingClientRect(); const logo = document.querySelector('header .logo')?.getBoundingClientRect(); const tema = document.querySelector('button[aria-label="Ganti tema"]')?.getBoundingClientRect(); return { headerActionsKanan: r ? +r.right.toFixed(1) : null, logoW: logo ? +logo.width.toFixed(0) : null, temaX: tema ? +tema.x.toFixed(0) : null }; })();
    return { kolom: cs.gridTemplateColumns.split(' ').length, templateColumns: cs.gridTemplateColumns, jumlahKartu: cards.length, kartuTerpotong: cards.filter((c) => c.kananTerpotong).length, contohKartu: cards.slice(0, 3), header, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
}

writeFileSync(outDir + "/cdp-s460e-" + WIDTH + ".json", JSON.stringify(R, null, 1));
console.log("SELESAI-CDPE-" + WIDTH);
ws.close();
process.exit(0);
