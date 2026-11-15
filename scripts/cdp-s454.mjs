// Probe CDP s454: animasi (A1-A10), a11y (H71/H77/H78/H80), harga permukaan (F51/54/55),
// hapus riwayat (A6/J98), Salin (J100), responsif (I81-90).
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
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const setWidth = async (w, h = 844) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const overflow = `(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1 }))()`;

// ---------- F51: Voucher GP 5.000 + ROSDI10 via QRIS (total Rp4.950 di 4 permukaan) ----------
await setWidth(390);
await nav("#/voucher/google-play");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#vemail'), 'nama@email.com'); return 'email-ok'; })()`);
await evalJs(`(${clickText})('.nom', 'Saldo 5.000')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'promo-diketik'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await evalJs(`(${clickText})('.pay', 'QRIS')`);
await sleep(300);
rec("51-summary", await evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); const total = document.querySelector('.sum-total b')?.textContent; const mb = document.querySelector('.mb-total b')?.textContent; const qris = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('QRIS'))?.querySelector('.p-price')?.textContent; return { total, mb, qris, discRow: rows.find((r) => r.startsWith('Diskon')) || null }; })()`));
rec("51-buy", await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return location.hash; })()`));
await sleep(1200);
rec("51-sukses", await evalJs(`(() => ({ hash: location.hash, total: document.querySelector('.sum-total b')?.textContent, rincian: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()).find((t) => t.startsWith('Harga + biaya')) || null }))()`));
// H71 + J100 di halaman Sukses yang sama
rec("71-salin-aria", await evalJs(`(() => [...document.querySelectorAll('button')].filter((b) => /Salin/.test(b.textContent)).map((b) => ({ text: b.textContent.trim(), ariaLabel: b.getAttribute('aria-label') })))()`));
rec("100-salin-klik", await evalJs(`(async () => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return 'TIDAK-ADA tombol Salin'; b.click(); await new Promise((r) => setTimeout(r, 300)); return b.textContent.trim(); })()`));
rec("8-hover-sukses", await evalJs(`(() => { const out = {}; for (const t of ['Belanja Lagi', 'Cek Transaksi']) { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t); if (!b) { out[t] = 'TIDAK-ADA'; continue; } const r = b.getBoundingClientRect(); out[t] = { before: getComputedStyle(b).backgroundColor, borderBefore: getComputedStyle(b).borderColor, cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) }; } return out; })()`));
for (const t of ["Belanja Lagi", "Cek Transaksi"]) {
  const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(t)}); if (!b) return null; const r = b.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]; })()`);
  if (pos) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pos[0], y: pos[1] });
    await sleep(250);
    rec("8-hover-" + t, await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(t)}); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, border: cs.borderColor, color: cs.color }; })()`));
  } else rec("8-hover-" + t, "TIDAK-ADA");
}

// ---------- F54: Valorant 11000 Points + GAMER5 via QRIS (cap Rp5.000, total Rp1.194.000) ----------
await setWidth(1280, 900);
await nav("#/game/valorant");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#riot'), 'Nama#TAG12'); return 'riot-ok'; })()`);
await evalJs(`(${clickText})('.nom', '11000 Points')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'GAMER5'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await evalJs(`(${clickText})('.pay', 'QRIS')`);
await sleep(300);
rec("54-summary", await evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); return { total: document.querySelector('.sum-total b')?.textContent, discRow: rows.find((r) => r.startsWith('Diskon')) || null, feeRow: rows.find((r) => r.startsWith('Biaya')) || null }; })()`));
rec("54-buy", await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`));
await sleep(1200);
rec("54-sukses", await evalJs(`(() => ({ total: document.querySelector('.sum-total b')?.textContent, rincian: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()).find((t) => t.startsWith('Harga + biaya')) || null }))()`));

// ---------- F55: Weekly Diamond Pass flash + ROSDI10 via QRIS (total Rp25.110) ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'uid-ok'; })()`);
await evalJs(`(${clickText})('.tab', 'Weekly Pass')`);
await sleep(300);
await evalJs(`(${clickText})('.nom', 'Weekly Diamond Pass')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await evalJs(`(${clickText})('.pay', 'QRIS')`);
await sleep(300);
rec("55-summary", await evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); return { total: document.querySelector('.sum-total b')?.textContent, discRow: rows.find((r) => r.startsWith('Diskon')) || null, hargaRow: rows.find((r) => r.startsWith('Harga')) || null }; })()`));

// ---------- A3: stepper pop ----------
rec("3-stepper-pop", await evalJs(`(() => { const b = document.querySelector('.qty b'); const before = b; document.querySelector('.qty button.plus').click(); return { animName: getComputedStyle(document.querySelector('.qty b')).animationName, qty: document.querySelector('.qty b').textContent, nodeReplaced: before !== document.querySelector('.qty b') }; })()`));
// ---------- A4: baris Diskon sudah ada (dari F55) ----------
rec("4-disc-anim", await evalJs(`(() => { const d = document.querySelector('.sum-row.disc'); return d ? { animName: getComputedStyle(d).animationName, animDur: getComputedStyle(d).animationDuration } : 'TIDAK-ADA'; })()`));
// ---------- A5: transisi seleksi baris metode ----------
rec("5-pay-transition", await evalJs(`(() => { const p = document.querySelector('.pay'); const cs = getComputedStyle(p); return { transitionDuration: cs.transitionDuration, transitionProperty: cs.transitionProperty }; })()`));
// ---------- A2: loading submit (tombol tetap "Beli Sekarang", tanpa spinner) ----------
rec("2-submit-loading", await evalJs(`(() => { const btn = document.querySelector('.summary .btn.big'); const before = { text: btn.textContent.trim(), disabled: btn.disabled }; btn.click(); const after = { text: btn.textContent.trim(), disabled: btn.disabled, spinner: !!btn.querySelector('svg, .spinner') }; return { before, afterSync: after, hashAfterClick: location.hash }; })()`));
await sleep(1200);
rec("2-after-nav", await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent }))()`));

// ---------- A1: ganti Server Genshin — daftar nominal berubah? ----------
await nav("#/game/genshin-impact");
const genshinBefore = await evalJs(`(() => [...document.querySelectorAll('.nom .n-name')].map((e) => e.textContent.trim()))()`);
await evalJs(`(() => { const s = document.querySelector('#server'); const setV = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setV.call(s, 'Amerika'); s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()`);
await sleep(400);
const genshinAfter = await evalJs(`(() => [...document.querySelectorAll('.nom .n-name')].map((e) => e.textContent.trim()))()`);
rec("1-server-change", { before: genshinBefore, after: genshinAfter, same: JSON.stringify(genshinBefore) === JSON.stringify(genshinAfter),
  gridAnim: await evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cs = getComputedStyle(g); return { animationName: cs.animationName, transitionDuration: cs.transitionDuration }; })()`),
  targetText: await evalJs(`(() => [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()).find((t) => t.startsWith('Tujuan')) || null)()`),
});

// ---------- A10: veil modal masuk — fade-in? ----------
await setWidth(390);
await nav("#/");
await evalJs(`(${clickText})('button', 'Masuk')`);
await sleep(300);
rec("10-veil", await evalJs(`(() => { const v = document.querySelector('.modal-veil'); if (!v) return 'TIDAK-ADA modal'; const cs = getComputedStyle(v); const m = document.querySelector('.modal'); const mcs = getComputedStyle(m); return { veilAnim: cs.animationName, veilDur: cs.animationDuration, modalAnim: mcs.animationName, role: m.getAttribute('role'), ariaModal: m.getAttribute('aria-modal') }; })()`));
await evalJs(`(() => { document.querySelector('.modal .btn.big').click(); return 'tutup'; })()`);
await sleep(300);
// ---------- H77: countdown live region? ----------
rec("77-countdown", await evalJs(`(() => { const c = document.querySelector('.count-chip'); return c ? { ariaLive: c.getAttribute('aria-live'), ariaHidden: c.getAttribute('aria-hidden'), role: c.getAttribute('role'), text: c.textContent } : 'TIDAK-ADA'; })()`));
// ---------- H78: fokus ke heading saat navigasi? ----------
rec("78-focus-nav", await evalJs(`(() => { location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); return 'nav'; })()`));
await sleep(1500);
rec("78-focus-nav-result", await evalJs(`(() => ({ active: document.activeElement === document.body ? 'BODY' : document.activeElement.tagName + '.' + (document.activeElement.className || ''), h1: document.querySelector('h1')?.textContent }))()`));
// ---------- A6/J98/J72: tombol hapus riwayat di Cek? ----------
await nav("#/cek");
rec("6-98-72-hapus", await evalJs(`(() => { const btns = [...document.querySelectorAll('button')].map((b) => ({ t: b.textContent.trim().slice(0, 40), al: b.getAttribute('aria-label') })); const hapus = btns.filter((b) => /hapus/i.test(b.t) || /hapus/i.test(b.al || '')); return { jumlahTombol: btns.length, tombolHapus: hapus, barisRiwayat: document.querySelectorAll('.hist-in button.sum-row').length }; })()`));
// ---------- H80: focus-visible tombol Cek ----------
rec("80-focus-cek", await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cek'); if (!b) return 'TIDAK-ADA tombol Cek'; b.focus(); const cs = getComputedStyle(b); return { text: b.textContent.trim(), outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor }; })()`));

// ---------- I: responsif lebar baru ----------
// 81: 350px Beranda
await setWidth(350);
await nav("#/");
rec("81-w350", await evalJs(`(() => { const g = document.querySelector('.grid.c4'); const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length; const header = document.querySelector('.header-in'); return { ...${overflow}, gridCols: cols, headerW: Math.round(header.getBoundingClientRect().width) }; })()`));
// 82: 400px MLBB grid nominal
await setWidth(400);
await nav("#/game/mobile-legends");
rec("82-w400", await evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length; const cards = [...document.querySelectorAll('.nom')].map((c) => Math.round(c.getBoundingClientRect().right)); return { ...${overflow}, gridCols: cols, maxCardRight: Math.max(...cards), iw: window.innerWidth }; })()`));
// 83: 460px Voucher GP
await setWidth(460);
await nav("#/voucher/google-play");
rec("83-w460", await evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length; const cards = [...document.querySelectorAll('.nom')].map((c) => Math.round(c.getBoundingClientRect().right)); return { ...${overflow}, gridCols: cols, maxCardRight: Math.max(...cards) }; })()`));
// 84: 520px Cek
await setWidth(520);
await nav("#/cek");
rec("84-w520", await evalJs(`(() => { const form = document.querySelector('form'); const r = form.getBoundingClientRect(); return { ...${overflow}, formRight: Math.round(r.right), formLeft: Math.round(r.left) }; })()`));
// 85: 560px MLBB .row2
await setWidth(560);
await nav("#/game/mobile-legends");
rec("85-w560", await evalJs(`(() => { const r = document.querySelector('.row2'); const cs = getComputedStyle(r); return { ...${overflow}, row2Cols: cs.gridTemplateColumns, uidW: Math.round(document.querySelector('#uid').getBoundingClientRect().width) }; })()`));
// 86: 700px MLBB grid nominal
await setWidth(700);
await nav("#/game/mobile-legends");
rec("86-w700", await evalJs(`(() => { const g = document.querySelector('.nom-grid'); return { ...${overflow}, gridCols: getComputedStyle(g).gridTemplateColumns.split(' ').length }; })()`));
// 87: 880px mobile-bar + aside
await setWidth(880);
await nav("#/game/mobile-legends");
rec("87-w880", await evalJs(`(() => { const mb = document.querySelector('.mobile-bar'); const aside = document.querySelector('aside .summary'); const mcs = getComputedStyle(mb); const acs = getComputedStyle(aside); return { ...${overflow}, mobileBarDisplay: mcs.display, asideDisplay: acs.display, asideVisible: aside.getBoundingClientRect().height > 0 }; })()`));
// 88: 1100px Beranda
await setWidth(1100);
await nav("#/");
rec("88-w1100", await evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); return { ...${overflow}, wrapW: Math.round(r.width), marginL: Math.round(r.left), marginR: Math.round(window.innerWidth - r.right) }; })()`));
// 89: 1400px Beranda grid game
await setWidth(1400);
await nav("#/");
rec("89-w1400", await evalJs(`(() => { const g = document.querySelector('.grid.c4'); return { ...${overflow}, gridCols: getComputedStyle(g).gridTemplateColumns.split(' ').length, cardW: Math.round(document.querySelector('.grid.c4 .card').getBoundingClientRect().width) }; })()`));
// 90: zoom 250% proxy = lebar CSS 512px di 1280
await setWidth(512, 800);
await nav("#/game/mobile-legends");
rec("90-zoom250", await evalJs(`(() => { const mb = document.querySelector('.mobile-bar'); return { ...${overflow}, mobileBarDisplay: getComputedStyle(mb).display, beliVisible: (() => { const b = document.querySelector('.mobile-bar .btn'); const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })() }; })()`));

console.log("DONE");
process.exit(0);
