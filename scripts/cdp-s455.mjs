// Probe CDP s455: animasi (A1-A10), harga end-to-end (F51/57/59/60),
// a11y (H71-H80), responsif (I81-90), state/rute (J96/98/99/100).
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
const setWidth = async (w, h = 844) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

// Seed 7 order riwayat untuk Cek (A3/H71/J96) — via localStorage langsung.
await setWidth(390);
await nav("#/cek");
await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-TEST000' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1,2,3,4,5,6,7].map(mk))); return localStorage.getItem('rosdi_orders').length; })()`);

// ---------- A1: stagger kartu nominal ----------
await nav("#/game/mobile-legends");
await safe("A1-stagger", () => evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; const cs = noms.slice(0, 4).map((n) => ({ anim: getComputedStyle(n).animationName, delay: getComputedStyle(n).animationDelay, dur: getComputedStyle(n).animationDuration })); return { count: noms.length, first4: cs, gridAnim: getComputedStyle(document.querySelector('.nom-grid')).animationName }; })()`));

// ---------- A2: harga nominal saat ganti Server (Genshin) ----------
await nav("#/game/genshin-impact");
await safe("A2-server", () => evalJs(`(async () => { const before = [...document.querySelectorAll('.n-price')].map((e) => e.textContent.trim()); const sel = document.querySelector('#server'); const setSel = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setSel.call(sel, 'Amerika'); sel.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 400)); const after = [...document.querySelectorAll('.n-price')].map((e) => e.textContent.trim()); const anims = [...document.querySelectorAll('.n-price')].slice(0, 2).map((e) => getComputedStyle(e).animationName); return { server: sel.value, same: JSON.stringify(before) === JSON.stringify(after), before: before.slice(0, 2), after: after.slice(0, 2), priceAnim: anims }; })()`));

// ---------- A3: tombol Salin di Cek ----------
await nav("#/cek/RSD-TEST0001");
await safe("A3-salin-cek", () => evalJs(`(() => { const btns = [...document.querySelectorAll('button')].map((b) => b.textContent.trim()); return { salinButtons: btns.filter((t) => /Salin/.test(t)), allButtons: btns, resultHasCopy: !!document.querySelector('.cek-result button') }; })()`));

// ---------- A4: "Lihat semua" game (Beranda) + collapse riwayat (Cek) ----------
await nav("#/");
await safe("A4-home-lihat-semua", () => evalJs(`(() => ({ buttons: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /Lihat semua/.test(t)), links: [...document.querySelectorAll('a')].map((a) => a.textContent.trim()).filter((t) => /Lihat semua/.test(t)) }))()`));
await nav("#/cek");
await safe("A4-cek-collapse", () => evalJs(`(async () => { const btn = [...document.querySelectorAll('button')].find((b) => /Lihat semua/.test(b.textContent)); if (!btn) return 'TIDAK-ADA'; btn.click(); await new Promise((r) => setTimeout(r, 400)); const rowsOpen = document.querySelectorAll('.hist-in .sum-row').length; const animOpen = getComputedStyle(document.querySelector('.hist-in')).animationName; btn.click(); await new Promise((r) => setTimeout(r, 400)); const rowsClosed = document.querySelectorAll('.hist-in .sum-row').length; return { rowsOpen, rowsClosed, sectionAnim: animOpen, runningAfterClose: document.querySelector('.hist-in').getAnimations().map((a) => a.animationName) }; })()`));

// ---------- A5: shake pesan promo gagal ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'SALAH123'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await safe("A5-shake-promo", () => evalJs(`(() => { const n = document.querySelector('.note.bad'); if (!n) return 'TIDAK-ADA note.bad'; const cs = getComputedStyle(n); return { text: n.textContent.trim().slice(0, 60), anim: cs.animationName, transform: cs.transform, running: n.getAnimations().map((a) => a.animationName) }; })()`));

// ---------- A6: progress bar flash vs waktu ----------
await nav("#/");
await safe("A6-flash-progress", () => evalJs(`(async () => { const bar = document.querySelector('.progress i'); if (!bar) return 'TIDAK-ADA'; const w1 = bar.style.width; const c1 = document.querySelector('.count-chip')?.textContent; await new Promise((r) => setTimeout(r, 3000)); const w2 = bar.style.width; const c2 = document.querySelector('.count-chip')?.textContent; return { widthT0: w1, widthT3: w2, changed: w1 !== w2, countT0: c1, countT3: c2 }; })()`));

// ---------- A7: kartu nominal dipilih ----------
await nav("#/game/mobile-legends");
await safe("A7-nom-dipilih", () => evalJs(`(() => { const nom = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('86 Diamonds')); nom.click(); const cs = getComputedStyle(nom); return { anim: cs.animationName, dur: cs.animationDuration, running: nom.getAnimations().map((a) => a.animationName), cls: nom.className }; })()`));

// ---------- A8: skeleton ganti tab ----------
await safe("A8-skeleton-tab", () => evalJs(`(async () => { const before = document.querySelectorAll('.nom').length; const tab = [...document.querySelectorAll('.tab')].find((t) => t.textContent.trim() === 'Weekly Pass'); tab.click(); await new Promise((r) => setTimeout(r, 50)); const mid = { noms: document.querySelectorAll('.nom').length, skeleton: document.querySelectorAll('[class*=skeleton], [class*=Skeleton], [aria-busy=true]').length }; await new Promise((r) => setTimeout(r, 400)); const after = { noms: document.querySelectorAll('.nom').length }; return { before, mid, after }; })()`));

// ---------- A9: baris Biaya layanan ----------
await safe("A9-biaya-row", () => evalJs(`(async () => { const row = () => { const r = [...document.querySelectorAll('.sum-row')].find((x) => x.textContent.startsWith('Biaya pembayaran')); return r ? { text: r.textContent.trim(), anim: getComputedStyle(r).animationName } : null; }; const before = row(); const pay = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('BCA Virtual')); pay.click(); await new Promise((r) => setTimeout(r, 300)); const after = row(); return { before, after }; })()`));

// ---------- A10: pergantian catatan operator ----------
await nav("#/pulsa/telkomsel");
await safe("A10-catatan-operator", () => evalJs(`(async () => { const setV = ${setVal}; const inp = document.querySelector('#hp'); setV(inp, '081234567890'); await new Promise((r) => setTimeout(r, 400)); const n1 = document.querySelector('.note.good'); const t1 = n1?.textContent; const anim1 = n1 ? n1.getAnimations().map((a) => a.animationName) : []; setV(inp, '085612345678'); await new Promise((r) => setTimeout(r, 400)); const n2 = document.querySelector('.note.good'); const t2 = n2?.textContent; const anim2 = n2 ? n2.getAnimations().map((a) => a.animationName) : []; const sameNode = n1 === n2; return { t1, t2, animAfterFirst: anim1, animAfterChange: anim2, sameNode }; })()`));

// ---------- F51: FF 5 Diamonds + GAMER5 via QRIS (total Rp950) ----------
await nav("#/game/free-fire");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '5 Diamonds')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'GAMER5'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await evalJs(`(${clickText})('.pay', 'QRIS')`);
await sleep(300);
await safe("F51", () => evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); return { total: document.querySelector('.sum-total b')?.textContent, mb: document.querySelector('.mb-total b')?.textContent, discRow: rows.find((r) => r.startsWith('Diskon')) || null, qris: [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('QRIS'))?.querySelector('.p-price')?.textContent }; })()`));
await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
await sleep(1200);
await safe("F51-sukses", () => evalJs(`(() => ({ hash: location.hash, total: document.querySelector('.sum-total b')?.textContent, rincian: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()).find((t) => t.startsWith('Harga + biaya')) || null }))()`));

// ---------- F57: MLBB 172 DM + ROSDI10 via BCA VA (total Rp41.650) ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '172 Diamonds')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await evalJs(`(${clickText})('.pay', 'BCA Virtual')`);
await sleep(300);
await safe("F57", () => evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); return { total: document.querySelector('.sum-total b')?.textContent, mb: document.querySelector('.mb-total b')?.textContent, discRow: rows.find((r) => r.startsWith('Diskon')) || null, bca: [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('BCA Virtual'))?.querySelector('.p-price')?.textContent }; })()`));
await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
await sleep(1200);
await safe("F57-sukses", () => evalJs(`(() => ({ hash: location.hash, total: document.querySelector('.sum-total b')?.textContent, rincian: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()).find((t) => t.startsWith('Harga + biaya')) || null }))()`));

// ---------- F59: Weekly Pass flash + GAMER5 (total Rp26.505) ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.tab', 'Weekly Pass')`);
await sleep(300);
await evalJs(`(${clickText})('.nom', 'Weekly Diamond Pass')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'GAMER5'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await evalJs(`(${clickText})('.pay', 'QRIS')`);
await sleep(300);
await safe("F59", () => evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); return { total: document.querySelector('.sum-total b')?.textContent, discRow: rows.find((r) => r.startsWith('Diskon')) || null, hargaRow: rows.find((r) => r.startsWith('Harga')) || null }; })()`));

// ---------- F60: Sukses order e-wallet (DANA 50.000 via QRIS) ----------
await nav("#/emoney/dana");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', 'Saldo 50.000')`);
await evalJs(`(${clickText})('.pay', 'QRIS')`);
await sleep(300);
await safe("F60-sebelum", () => evalJs(`(() => ({ total: document.querySelector('.sum-total b')?.textContent, canBuy: !document.querySelector('.summary .btn.big').disabled }))()`));
await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
await sleep(1200);
await safe("F60-sukses", () => evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); return { hash: location.hash, total: document.querySelector('.sum-total b')?.textContent, rincian: rows.find((t) => t.startsWith('Harga + biaya')) || null, produk: rows.find((t) => t.startsWith('Produk')) || null }; })()`));

// ---------- H71: aria Lihat semua (Cek) ----------
await nav("#/cek");
await safe("H71", () => evalJs(`(() => { const btn = [...document.querySelectorAll('button')].find((b) => /Lihat semua/.test(b.textContent)); if (!btn) return 'TIDAK-ADA'; return { text: btn.textContent.trim(), ariaLabel: btn.getAttribute('aria-label'), ariaExpanded: btn.getAttribute('aria-expanded') }; })()`));

// ---------- H72: aria-required input wajib ----------
await nav("#/game/mobile-legends");
await safe("H72-mlbb", () => evalJs(`(() => ['#uid', '#zone'].map((s) => { const el = document.querySelector(s); return el ? { id: s, required: el.hasAttribute('required'), ariaRequired: el.getAttribute('aria-required') } : { id: s, missing: true }; }))()`));
await nav("#/pulsa/telkomsel");
await safe("H72-pulsa", () => evalJs(`(() => { const el = document.querySelector('#hp'); return el ? { required: el.hasAttribute('required'), ariaRequired: el.getAttribute('aria-required') } : 'TIDAK-ADA'; })()`));
await nav("#/pln");
await safe("H72-pln", () => evalJs(`(() => { const el = document.querySelector('#idpel'); return el ? { required: el.hasAttribute('required'), ariaRequired: el.getAttribute('aria-required') } : 'TIDAK-ADA'; })()`));
await nav("#/voucher/google-play");
await safe("H72-voucher", () => evalJs(`(() => { const el = document.querySelector('#vemail'); return el ? { required: el.hasAttribute('required'), ariaRequired: el.getAttribute('aria-required') } : 'TIDAK-ADA'; })()`));

// ---------- H73: aria-label tombol stepper ----------
await nav("#/game/mobile-legends");
await safe("H73-stepper", () => evalJs(`(() => [...document.querySelectorAll('.qty button')].map((b) => ({ text: b.textContent.trim(), ariaLabel: b.getAttribute('aria-label'), disabled: b.disabled })))()`));

// ---------- H74: teks "Berhasil" di Cek + Sukses ----------
await nav("#/cek/RSD-DEMO1234");
await safe("H74-cek", () => evalJs(`(() => ({ hasBerhasil: document.body.textContent.includes('Berhasil'), statusTexts: [...document.querySelectorAll('.cek-result .sum-row, .timeline li')].map((e) => e.textContent.trim()) }))()`));
await nav("#/sukses/RSD-TEST0001");
await safe("H74-sukses", () => evalJs(`(() => ({ hasBerhasil: document.body.textContent.includes('Berhasil'), heading: document.querySelector('h1')?.textContent, statusLine: document.querySelector('.step p')?.textContent?.slice(0, 120) }))()`));

// ---------- H75/H76: kontras (light) ----------
const contrast = `((fg, bg) => { const lum = (c) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.substr(i, 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; const rgb = (s) => { const m = s.match(/\\d+/g); return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join(''); }; const L1 = lum(rgb(fg)), L2 = lum(rgb(bg)); return ((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2); })`;
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'SALAH123'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await safe("H75-promo-error-light", () => evalJs(`(() => { const n = document.querySelector('.note.bad'); if (!n) return 'TIDAK-ADA'; const cs = getComputedStyle(n); const bg = getComputedStyle(n.closest('.step') || document.body).backgroundColor; return { color: cs.color, bg, ratio: (${contrast})(cs.color, bg) }; })()`));
await safe("H76-crumb-light", () => evalJs(`(() => { const b = document.querySelector('.crumb .back'); const cs = getComputedStyle(b); const bg = getComputedStyle(b.closest('.wrap') || document.body).backgroundColor; return { text: b.textContent.trim(), ariaLabel: b.getAttribute('aria-label'), color: cs.color, bg, ratio: (${contrast})(cs.color, 'rgb(255, 255, 255)') }; })()`));
// Tema gelap
await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]').click(); return 'ok'; })()`);
await sleep(500);
await safe("H75-promo-error-dark", () => evalJs(`(() => { const n = document.querySelector('.note.bad'); if (!n) return 'TIDAK-ADA'; const cs = getComputedStyle(n); const bg = getComputedStyle(n.closest('.step') || document.body).backgroundColor; return { color: cs.color, bg, ratio: (${contrast})(cs.color, bg) }; })()`));
await safe("H76-crumb-dark", () => evalJs(`(() => { const b = document.querySelector('.crumb .back'); const cs = getComputedStyle(b); return { color: cs.color, ratio: (${contrast})(cs.color, 'rgb(19, 31, 54)') }; })()`));
await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]').click(); return 'ok'; })()`);
await sleep(400);

// ---------- H77: focus-visible tombol Sukses ----------
await nav("#/sukses/RSD-TEST0001");
await safe("H77-focus-sukses", () => evalJs(`(async () => { const out = {}; for (const t of ['Belanja Lagi', 'Cek Transaksi']) { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t); if (!b) { out[t] = 'TIDAK-ADA'; continue; } b.focus(); await new Promise((r) => setTimeout(r, 120)); const cs = getComputedStyle(b); out[t] = { outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, activeEl: document.activeElement === b }; } out.unduhStruk = [...document.querySelectorAll('button')].some((b) => /Unduh struk/.test(b.textContent)) ? 'ADA' : 'TIDAK-ADA'; return out; })()`));

// ---------- H78: urutan Tab halaman E-Wallet (via CDP Input.dispatchKeyEvent) ----------
await nav("#/emoney/dana");
await evalJs(`(() => { const a = document.querySelector('a.logo'); a.focus(); return 'ok'; })()`);
const tabSeq = [];
for (let i = 0; i < 16; i++) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await sleep(120);
  tabSeq.push(await evalJs(`(() => { const el = document.activeElement; if (!el || el === document.body) return 'BODY'; return (el.tagName + ':' + (el.getAttribute('aria-label') || el.textContent.trim().slice(0, 28) || el.id || el.className)); })()`));
}
rec("H78-tab-emoney", tabSeq);

// ---------- H79: panah keyboard dropdown Server ----------
await nav("#/game/genshin-impact");
await safe("H79-server-arrows", () => evalJs(`(() => { const sel = document.querySelector('#server'); sel.focus(); const before = sel.value; const opts = [...sel.options].map((o) => o.value); sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', { bubbles: true })); const afterSet = sel.value; const kd = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }); sel.dispatchEvent(kd); return { before, options: opts, afterProgrammaticSet: afterSet, nativeSelect: sel.tagName, keydownDefaultPrevented: kd.defaultPrevented }; })()`));

// ---------- H80: SR membaca baris diskon ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '172 Diamonds')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await safe("H80-disc-row", () => evalJs(`(() => { const row = document.querySelector('.sum-row.disc'); if (!row) return 'TIDAK-ADA'; return { textContent: row.textContent.trim(), ariaLive: row.getAttribute('aria-live'), role: row.getAttribute('role'), innerText: row.innerText }; })()`));

// ---------- J96: hapus semua riwayat ----------
await nav("#/cek");
await safe("J96-hapus-semua", () => evalJs(`(() => { const btns = [...document.querySelectorAll('button')].map((b) => b.textContent.trim()); return { hapusButtons: btns.filter((t) => /hapus/i.test(t)), count: btns.length }; })()`));

// ---------- J98: metode bertahan saat ganti Server ----------
await nav("#/game/genshin-impact");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '60 Genesis Crystal')`);
await evalJs(`(${clickText})('.pay', 'GoPay')`);
await sleep(300);
await safe("J98-metode-server", () => evalJs(`(async () => { const before = document.querySelector('.pay.on')?.textContent?.slice(0, 30); const sel = document.querySelector('#server'); const setSel = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setSel.call(sel, 'Amerika'); sel.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 400)); const after = document.querySelector('.pay.on')?.textContent?.slice(0, 30); const nomStill = document.querySelector('.nom.on')?.textContent?.slice(0, 30); return { before, after, same: before === after, server: sel.value, nomStill }; })()`));

// ---------- J99: konsistensi "Pulsa Reguler" ----------
await nav("#/pulsa");
await safe("J99a-indeks", () => evalJs(`(() => ({ h1: document.querySelector('h1')?.textContent, cardSub: [...document.querySelectorAll('.p-sub')].map((e) => e.textContent).find((t) => /nominal/.test(t)) }))()`));
await nav("#/pulsa/telkomsel");
await safe("J99b-halaman", () => evalJs(`(() => ({ h1: document.querySelector('h1')?.textContent, sub: document.querySelector('.crumb p')?.textContent }))()`));
await nav("#/");
await safe("J99c-beranda", () => evalJs(`(() => { const card = [...document.querySelectorAll('.card')].find((c) => c.textContent.includes('Pulsa Reguler')); return card ? { name: card.querySelector('.p-name')?.textContent, sub: card.querySelector('.p-sub')?.textContent } : 'TIDAK-ADA'; })()`));
await nav("#/pulsa/telkomsel");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`);
await safe("J99d-meta", () => evalJs(`(() => [...document.querySelectorAll('.nom .n-meta')].slice(0, 3).map((e) => e.textContent))()`));

// ---------- J100: label "Lacak" vs "Cek" ----------
await nav("#/cek");
await safe("J100a-cek", () => evalJs(`(() => ({ submitBtn: document.querySelector('form button[type=submit]')?.textContent.trim(), navCek: [...document.querySelectorAll('nav.main a')].map((a) => a.textContent.trim()), anyLacak: document.body.textContent.includes('Lacak'), lacakContexts: [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /Lacak/.test(e.textContent)).map((e) => e.textContent.trim()) }))()`));
await nav("#/sukses/RSD-TEST0001");
await safe("J100b-sukses", () => evalJs(`(() => [...document.querySelectorAll('button')].map((b) => b.textContent.trim()))()`));

console.log("SELESAI-S455");
process.exit(0);
