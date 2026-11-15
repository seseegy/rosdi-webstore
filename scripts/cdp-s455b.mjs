// Probe CDP s455 bagian I: responsif lebar baru + zoom + rotasi modal.
// Dijalankan lewat scripts/cdp-launch.sh (vite preview + Chrome headless lokal).
import { mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rec = (id, data) => console.log(id, JSON.stringify(data));
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; });
const setWidth = async (w, h = 844, dsf = 1) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dsf, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const overflow = `(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1 }))()`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

// I81: 300px Beranda
await setWidth(300);
await nav("#/");
await safe("I81-300-beranda", () => evalJs(`(() => { const h = document.querySelector('.header-in').getBoundingClientRect(); const cards = [...document.querySelectorAll('.grid.c4 .card')].map((c) => Math.round(c.getBoundingClientRect().right)); return { overflow: ${overflow}, headerRight: Math.round(h.right), headerW: Math.round(h.width), cardRights: cards.slice(0, 4), logoVisible: !!document.querySelector('.logo'), masukVisible: [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Masuk') }; })()`));

// I82: 380px grid game
await setWidth(380);
await nav("#/");
await safe("I82-380-grid", () => evalJs(`(() => { const cards = [...document.querySelectorAll('.grid.c4 .card')]; const cols = new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))); return { overflow: ${overflow}, cols: [...cols], maxRight: Math.max(...cards.map((c) => Math.round(c.getBoundingClientRect().right))), cardW: Math.round(cards[0].getBoundingClientRect().width) }; })()`));

// I83: 500px Cek
await setWidth(500);
await nav("#/cek");
await safe("I83-500-cek", () => evalJs(`(() => { const inp = document.querySelector('form .input'); const btn = document.querySelector('form .btn'); const r1 = inp.getBoundingClientRect(); const r2 = btn.getBoundingClientRect(); return { overflow: ${overflow}, input: [Math.round(r1.left), Math.round(r1.right)], btn: [Math.round(r2.left), Math.round(r2.right)] }; })()`));

// I84: 620px header
await setWidth(620);
await nav("#/");
await safe("I84-620-header", () => evalJs(`(() => { const navEl = document.querySelector('nav.main'); const h = document.querySelector('.header-in').getBoundingClientRect(); return { overflow: ${overflow}, navDisplay: getComputedStyle(navEl).display, headerRight: Math.round(h.right), iw: window.innerWidth }; })()`));

// I85: 899px mobile-bar + aside
await setWidth(899, 900);
await nav("#/game/mobile-legends");
await safe("I85-899", () => evalJs(`(() => { const mb = document.querySelector('.mobile-bar'); const aside = document.querySelector('aside .summary'); return { overflow: ${overflow}, mbDisplay: getComputedStyle(mb).display, asideDisplay: aside ? getComputedStyle(aside).display : 'TIDAK-ADA', asideH: aside ? Math.round(aside.getBoundingClientRect().height) : 0 }; })()`));

// I86: 901px aside + mobile-bar
await setWidth(901, 900);
await nav("#/game/mobile-legends");
await safe("I86-901", () => evalJs(`(() => { const mb = document.querySelector('.mobile-bar'); const aside = document.querySelector('aside .summary'); return { overflow: ${overflow}, mbDisplay: getComputedStyle(mb).display, asideDisplay: aside ? getComputedStyle(aside).display : 'TIDAK-ADA' }; })()`));

// I87: 561px baris UID + Zone
await setWidth(561);
await nav("#/game/mobile-legends");
await safe("I87-561-row2", () => evalJs(`(() => { const row = document.querySelector('.row2'); const uid = document.querySelector('#uid').getBoundingClientRect(); const zone = document.querySelector('#zone').getBoundingClientRect(); return { overflow: ${overflow}, gridCols: getComputedStyle(row).gridTemplateColumns, uidW: Math.round(uid.width), zoneTop: Math.round(zone.top), uidTop: Math.round(uid.top), sameRow: Math.abs(uid.top - zone.top) < 5 }; })()`));

// I88: 1200px grid game
await setWidth(1200, 900);
await nav("#/");
await safe("I88-1200-grid", () => evalJs(`(() => { const cards = [...document.querySelectorAll('.grid.c4 .card')]; const gaps = []; for (let i = 1; i < cards.length; i++) { const a = cards[i - 1].getBoundingClientRect(); const b = cards[i].getBoundingClientRect(); if (Math.abs(a.top - b.top) < 5) gaps.push(Math.round(b.left - a.right)); } return { overflow: ${overflow}, cardW: Math.round(cards[0].getBoundingClientRect().width), colGaps: gaps.slice(0, 3), cols: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))).size }; })()`));

// I89: zoom 225% di 1280px (lebar CSS efektif ~569px, dsf 2.25)
await setWidth(569, 844, 2.25);
await nav("#/game/mobile-legends");
await safe("I89-zoom225", () => evalJs(`(() => { const btn = document.querySelector('.mobile-bar .btn'); const r = btn ? btn.getBoundingClientRect() : null; const mb = document.querySelector('.mobile-bar'); return { overflow: ${overflow}, dsf: window.devicePixelRatio, mbDisplay: mb ? getComputedStyle(mb).display : 'TIDAK-ADA', beliRect: r ? [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right)] : null, viewportH: window.innerHeight }; })()`));

// I90: rotasi saat modal S&K terbuka (portrait -> landscape)
await setWidth(390, 844);
await nav("#/");
await evalJs(`(() => { const b = [...document.querySelectorAll('footer button.flink')].find((x) => x.textContent.trim() === 'Syarat & Ketentuan'); b.click(); return 'ok'; })()`);
await sleep(500);
await safe("I90-modal-portrait", () => evalJs(`(() => { const m = document.querySelector('.modal'); if (!m) return 'MODAL-TIDAK-TERBUKA'; const r = m.getBoundingClientRect(); return { open: true, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vw: window.innerWidth, vh: window.innerHeight, overflow: ${overflow} }; })()`));
await setWidth(844, 390);
await sleep(500);
await safe("I90-modal-landscape", () => evalJs(`(() => { const m = document.querySelector('.modal'); if (!m) return 'MODAL-TERTUTUP-SETELAH-ROTASI'; const r = m.getBoundingClientRect(); const tutup = [...document.querySelectorAll('.modal .btn')].some((b) => b.textContent.trim() === 'Tutup'); return { open: true, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vw: window.innerWidth, vh: window.innerHeight, modalFitsWidth: r.right <= window.innerWidth + 1, tutupAda: tutup, overflow: ${overflow}, modalScrollH: m.scrollHeight, modalClientH: m.clientHeight }; })()`));

console.log("SELESAI-S455B");
process.exit(0);
