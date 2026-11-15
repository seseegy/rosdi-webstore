// Probe CDP s456: animasi (A1,3,4,5,6,9,10), a11y (H72,73,75,76,79,80),
// responsif (I81-90), state/rute (J91-97,99,100), pencarian (B/C spot-check),
// font 200% (I88). Dijalankan lewat scripts/cdp-launch.sh per lebar.
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
const navFull = async (url) => { await evalJs(`location.assign(${JSON.stringify(url)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, modifiers = 0) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
const pressKey = async (key, code, vk, modifiers = 0) => { await keyEvent("keyDown", key, code, vk, modifiers); await keyEvent("keyUp", key, code, vk, modifiers); await sleep(120); };
const activeEl = () => evalJs(`(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; const r = a.getBoundingClientRect(); return { tag: a.tagName, id: a.id || '', text: (a.textContent || '').trim().slice(0, 28), y: Math.round(r.top + window.scrollY), x: Math.round(r.left) }; })()`);
// Observer CLS + INP (dipasang sebelum muat dokumen pertama).
await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__cls=0; window.__inp=[]; new PerformanceObserver((l)=>{for(const e of l.getEntries()){if(!e.hadRecentInput)window.__cls+=e.value;}}).observe({type:'layout-shift',buffered:true}); new PerformanceObserver((l)=>{for(const e of l.getEntries()){if(e.interactionId)window.__inp.push({name:e.name,dur:Math.round(e.duration)});}}).observe({type:'event',buffered:true,durationThreshold:16});` });

if (WIDTH === 390) {
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);
  // Seed 7 order riwayat untuk Cek (pola s455).
  await nav("#/cek");
  await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-TEST000' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1,2,3,4,5,6,7].map(mk))); return 'seeded'; })()`);

  // ---------- A1: UID salah -> Beli disabled? error terlihat? scroll? ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), 'abc'); return 'ok'; })()`);
  await sleep(300);
  await safe("A1-scroll-error", () => evalJs(`(() => { const beli = document.querySelector('.summary .btn.big'); const note = document.querySelector('.note.bad'); const r = note ? note.getBoundingClientRect() : null; return { beliDisabled: beli ? beli.disabled : 'TIDAK-ADA', noteText: note ? note.textContent.trim().slice(0, 50) : 'TIDAK-ADA', noteAnim: note ? getComputedStyle(note).animationName : null, noteInViewport: r ? (r.top >= 0 && r.bottom <= window.innerHeight) : null, scrollY: Math.round(window.scrollY) }; })()`));

  // ---------- A3: Pakai — ukur ms sampai note + spinner/disabled ----------
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await sleep(300);
  await safe("A3-pakai-loading", () => evalJs(`(async () => { const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pakai'); const input = document.querySelector('input[aria-label="Kode promo"]'); const setV = ${setVal}; setV(input, 'ROSDI10'); const t0 = performance.now(); btn.click(); let noteAt = null; for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 10)); const n = document.querySelector('.note.good'); if (n) { noteAt = Math.round(performance.now() - t0); break; } } const btnAfter = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Hapus'); return { msToNote: noteAt, spinnerSelamaProses: !!document.querySelector('.spinner, [class*="spin"], [class*="loading"]'), btnDisabledDuring: btn.disabled, noteText: document.querySelector('.note.good')?.textContent.trim().slice(0, 60), hapusMuncul: !!btnAfter, hapusAnim: btnAfter ? getComputedStyle(btnAfter).animationName : null, pakaiAnim: getComputedStyle(btn).animationName }; })()`));

  // ---------- A5: baris Diskon — animasi muncul + hilang instan? ----------
  await safe("A5-diskon-hilang", () => evalJs(`(() => { const row = document.querySelector('.sum-row.disc'); const before = row ? { anim: getComputedStyle(row).animationName, dur: getComputedStyle(row).animationDuration } : 'TIDAK-ADA'; const hapus = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Hapus'); if (!hapus) return { before, hapus: 'TIDAK-ADA' }; hapus.click(); const after = document.querySelector('.sum-row.disc'); return { before, rowLangsungHilang: after === null }; })()`));

  // ---------- A9: Pakai->Hapus — animasi swap? (terapkan lagi, baca animasi tombol) ----------
  await safe("A9-pakai-hapus-swap", () => evalJs(`(async () => { const input = document.querySelector('input[aria-label="Kode promo"]'); const setV = ${setVal}; setV(input, 'ROSDI10'); const pakai = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pakai'); pakai.click(); await new Promise((r) => setTimeout(r, 300)); const hapus = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Hapus'); const cs = hapus ? getComputedStyle(hapus) : null; return { hapusAda: !!hapus, animName: cs?.animationName, animDur: cs?.animationDuration, transition: cs?.transition, runningAnims: hapus ? hapus.getAnimations().map((a) => a.animationName) : [] }; })()`));

  // ---------- A10: baris Biaya — BCA VA -> QRIS (baris tetap, nilai berubah?) ----------
  await safe("A10-biaya-hilang", () => evalJs(`(async () => { const rowOf = () => [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.trim().startsWith('Biaya pembayaran')); const bca = [...document.querySelectorAll('.pay')].find((p) => /BCA/.test(p.textContent)); bca.click(); await new Promise((r) => setTimeout(r, 300)); const vBca = rowOf()?.querySelector('b')?.textContent; const rowElBca = rowOf(); const qris = [...document.querySelectorAll('.pay')].find((p) => /QRIS/.test(p.textContent)); qris.click(); await new Promise((r) => setTimeout(r, 300)); const vQris = rowOf()?.querySelector('b')?.textContent; return { rowAdaSaatBCA: !!rowElBca, nilaiBCA: vBca, rowAdaSaatQRIS: !!rowOf(), nilaiQRIS: vQris, rowElemenSama: rowElBca === rowOf() }; })()`));

  // ---------- A6: ganti operator — mismatch + navigasi (kartu tidak bertukar di tempat) ----------
  await nav("#/pulsa/telkomsel");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`);
  await sleep(300);
  await safe("A6-ganti-operator", () => evalJs(`(async () => { const before = [...document.querySelectorAll('.nom .n-name')].map((e) => e.textContent.trim()); const noteGood = document.querySelector('.note.good')?.textContent.trim(); const setV = ${setVal}; setV(document.querySelector('#hp'), '081546789012'); await new Promise((r) => setTimeout(r, 400)); const mismatch = document.querySelector('.note.bad'); const after = [...document.querySelectorAll('.nom .n-name')].map((e) => e.textContent.trim()); const nomAnim = [...document.querySelectorAll('.nom')].slice(0, 2).map((e) => getComputedStyle(e).animationName); const link = mismatch?.querySelector('a'); let navResult = null; if (link) { link.click(); await new Promise((r) => setTimeout(r, 800)); navResult = { hash: location.hash, title: document.querySelector('h1')?.textContent, mainAnim: getComputedStyle(document.querySelector('main#konten')).animationName }; } return { beforeCount: before.length, noteGood, mismatchText: mismatch?.textContent.trim().slice(0, 70), mismatchAnim: mismatch ? getComputedStyle(mismatch).animationName : null, kartuTetapSama: JSON.stringify(before) === JSON.stringify(after), nomAnim, navResult }; })()`));

  // ---------- A4: Lacak — ukur ms sampai hasil + spinner ----------
  await nav("#/cek");
  await safe("A4-lacak-loading", () => evalJs(`(async () => { const input = document.querySelector('input[aria-label="Nomor transaksi"]'); const setV = ${setVal}; setV(input, 'RSD-DEMO1234'); const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Lacak'); const t0 = performance.now(); btn.click(); let ms = null; for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 10)); if (document.querySelector('.cek-result')) { ms = Math.round(performance.now() - t0); break; } } return { msToResult: ms, spinner: !!document.querySelector('.spinner, [class*="spin"], [class*="loading"]'), btnDisabledDuring: btn.disabled }; })()`));

  // ---------- B/C spot-check UI: 15, 16, 24 ----------
  await nav("#/");
  for (const [id, q] of [["B15", "kuota telkomsel"], ["B16", "voucher playstation"], ["B24", "mlbb?"]]) {
    await safe(id + "-ui", () => evalJs(`(async () => { const input = document.querySelector('.searchbar input'); const setV = ${setVal}; setV(input, ${JSON.stringify(q)}); await new Promise((r) => setTimeout(r, 400)); const empty = document.querySelector('.empty'); const cards = document.querySelectorAll('a.card, button.card').length; return { emptyText: empty ? empty.textContent.trim().slice(0, 60) : null, cards }; })()`));
  }

  // ---------- H72: rotasi saat dropdown Server terbuka (Genshin, select native) ----------
  await nav("#/game/genshin-impact");
  await safe("H72-rotasi-server", () => evalJs(`(async () => { const sel = document.querySelector('#server'); if (!sel) return 'TIDAK-ADA-SELECT'; sel.focus(); const before = sel.value; return { valueBefore: before, focused: document.activeElement === sel }; })()`));
  await keyEvent("keyDown", "ArrowDown", "ArrowDown", 40, 1); // Alt+ArrowDown = buka dropdown native
  await sleep(300);
  await setMetrics(844, 390, true);
  await safe("H72-setelah-rotasi", () => evalJs(`(() => { const sel = document.querySelector('#server'); const r = sel.getBoundingClientRect(); return { valueAfter: sel.value, stillFocused: document.activeElement === sel, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }, hOverflow: document.documentElement.scrollWidth > window.innerWidth }; })()`));
  await setMetrics(390);

  // ---------- H73: panah di riwayat Cek ----------
  await nav("#/cek");
  await safe("H73-panah-riwayat", () => evalJs(`(async () => { const rows = [...document.querySelectorAll('.hist-in .sum-row')]; if (!rows.length) return 'TIDAK-ADA-BARIS'; rows[0].focus(); const first = document.activeElement; await new Promise((r) => setTimeout(r, 100)); return { rows: rows.length, focusedRow: first === rows[0] }; })()`));
  const h73a = await activeEl();
  await pressKey("ArrowDown", "ArrowDown", 40);
  const h73b = await activeEl();
  rec("H73-panah-hasil", { before: h73a, afterArrowDown: h73b, focusPindah: JSON.stringify(h73a) !== JSON.stringify(h73b) });

  // ---------- H75: Space pada Beli ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '5 Diamonds')`);
  await evalJs(`(${clickText})('.pay', 'QRIS')`);
  await sleep(300);
  await safe("H75-space-beli", () => evalJs(`(async () => { const beli = document.querySelector('.mobile-bar .btn') || document.querySelector('.summary .btn.big'); if (!beli) return 'TIDAK-ADA-BELI'; beli.focus(); const before = location.hash; return { focused: document.activeElement === beli, disabled: beli.disabled, hashBefore: before }; })()`));
  await keyEvent("keyDown", " ", "Space", 32);
  await sleep(100);
  await keyEvent("keyUp", " ", "Space", 32);
  await sleep(1500);
  rec("H75-space-hasil", await evalJs(`(() => ({ hashAfter: location.hash, sukses: location.hash.startsWith('#/sukses'), lastOrder: JSON.parse(localStorage.getItem('rosdi_orders') || '[]').slice(-1)[0]?.ref || null }))()`));

  // ---------- H76: urutan Tab di halaman Tagihan ----------
  await nav("#/tagihan/pln-pascabayar");
  await evalJs(`(() => { document.activeElement?.blur(); window.scrollTo(0, 0); return 'ok'; })()`);
  const tabSeq = [];
  for (let i = 0; i < 16; i++) { await pressKey("Tab", "Tab", 9); tabSeq.push(await activeEl()); }
  rec("H76-tab-tagihan", { seq: tabSeq });

  // ---------- H79: Shift+Tab dari elemen pertama ----------
  await evalJs(`(() => { const first = document.querySelector('.skip-link') || document.querySelector('a, button'); first?.focus(); return 'ok'; })()`);
  const h79a = await activeEl();
  await keyEvent("keyDown", "Tab", "Tab", 9, 8); // Shift=8
  await keyEvent("keyUp", "Tab", "Tab", 9, 8);
  await sleep(150);
  const h79b = await activeEl();
  rec("H79-shift-tab", { firstEl: h79a, afterShiftTab: h79b, wrapKeAkhir: h79b !== "BODY" && JSON.stringify(h79b) !== JSON.stringify(h79a) });

  // ---------- H80: user-select harga nominal ----------
  await nav("#/game/mobile-legends");
  await safe("H80-user-select", () => evalJs(`(() => { const p = document.querySelector('.n-price'); const cs = p ? getComputedStyle(p) : null; return { userSelect: cs?.userSelect, webkitUserSelect: cs?.webkitUserSelect }; })()`));

  // ---------- J91-96: deep link query (diabaikan?) ----------
  const dl = async (id, url, check) => { await navFull(url); await safe(id, check); };
  await dl("J91-tab-unknown", baseUrl + "?tab=unknowntab#/game/mobile-legends", () => evalJs(`(() => ({ h1: document.querySelector('h1')?.textContent, tabOn: document.querySelector('.tab.on')?.textContent, noms: document.querySelectorAll('.nom').length }))()`));
  await dl("J92-server-unknown", baseUrl + "?server=unknown#/game/genshin-impact", () => evalJs(`(() => ({ server: document.querySelector('#server')?.value, h1: document.querySelector('h1')?.textContent }))()`));
  await dl("J93-nominal-99999", baseUrl + "?nominal=99999#/game/mobile-legends", () => evalJs(`(() => ({ selected: document.querySelectorAll('.nom.on').length, h1: document.querySelector('h1')?.textContent }))()`));
  await dl("J94-qty-0", baseUrl + "?qty=0#/game/mobile-legends", () => evalJs(`(() => { const n = [...document.querySelectorAll('.nom')][0]; n?.click(); return new Promise((r) => setTimeout(() => r({ qtyText: document.querySelector('.qty b')?.textContent }), 300)); })()`));
  await dl("J95-qty-999", baseUrl + "?qty=999#/game/mobile-legends", () => evalJs(`(() => { const n = [...document.querySelectorAll('.nom')][0]; n?.click(); return new Promise((r) => setTimeout(() => r({ qtyText: document.querySelector('.qty b')?.textContent }), 300)); })()`));
  await dl("J96-qty-abc", baseUrl + "?qty=abc#/game/mobile-legends", () => evalJs(`(() => { const n = [...document.querySelectorAll('.nom')][0]; n?.click(); return new Promise((r) => setTimeout(() => r({ qtyText: document.querySelector('.qty b')?.textContent }), 300)); })()`));

  // ---------- J97: promo dipakai 2x ----------
  const orderWithPromo = async (tag) => {
    await nav("#/game/mobile-legends");
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
    await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
    await evalJs(`(${clickText})('.pay', 'QRIS')`);
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
    await evalJs(`(${clickText})('.btn', 'Pakai')`);
    await sleep(400);
    const t = await evalJs(`(() => { const row = document.querySelector('.sum-row.disc b'); const tot = document.querySelector('.sum-total b'); return { disc: row?.textContent, total: tot?.textContent }; })()`);
    const beli = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn') || document.querySelector('.summary .btn.big'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: b.disabled }; })()`);
    if (!beli.disabled) {
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: beli.x, y: beli.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: beli.x, y: beli.y, button: "left", clickCount: 1 });
    }
    await sleep(1500);
    const after = await evalJs(`(() => ({ hash: location.hash, ref: JSON.parse(localStorage.getItem('rosdi_orders') || '[]').slice(-1)[0]?.ref || null }))()`);
    return { tag, ...t, ...after };
  };
  rec("J97-order-1", await orderWithPromo("order1"));
  rec("J97-order-2", await orderWithPromo("order2"));

  // ---------- J99: CLS halaman produk ----------
  await evalJs(`window.__cls = 0; 'ok'`);
  await nav("#/game/mobile-legends");
  await sleep(3000);
  rec("J99-cls-mlbb", { cls: await evalJs(`+window.__cls.toFixed(4)`) });

  // ---------- J100: INP klik Beli (input terpercaya via mouse CDP) ----------
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await evalJs(`(${clickText})('.pay', 'QRIS')`);
  await sleep(300);
  const inpBefore = await evalJs(`window.__inp.length`);
  const beli2 = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn') || document.querySelector('.summary .btn.big'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: b.disabled }; })()`);
  const t0 = Date.now();
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: beli2.x, y: beli2.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: beli2.x, y: beli2.y, button: "left", clickCount: 1 });
  await sleep(2000);
  rec("J100-inp-beli", { clickMsWall: Date.now() - t0, entriesBaru: await evalJs(`window.__inp.slice(${inpBefore})`), hash: await evalJs(`location.hash`) });

  // ---------- I88: font sistem 200% (emulasi: gandakan computed font-size semua elemen) ----------
  await nav("#/game/mobile-legends");
  await safe("I88-font-200", () => evalJs(`(() => { const els = [...document.querySelectorAll('body *')]; for (const el of els) { const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize); if (fs > 0) el.style.fontSize = (fs * 2) + 'px'; } const clipped = []; for (const el of document.querySelectorAll('.nom, .btn, .mobile-bar, .pay, .qty')) { if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) clipped.push({ cls: el.className.toString().slice(0, 30), txt: (el.textContent || '').trim().slice(0, 24), sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth }); } return { hOverflow: document.documentElement.scrollWidth > window.innerWidth, clippedCount: clipped.length, clipped: clipped.slice(0, 10) }; })()`));
}

if (WIDTH === 1180) {
  await setMetrics(1180, 844, false);
  await nav("#/");
  await safe("I81-1180-beranda", () => evalJs(`(() => { const hero = document.querySelector('.hero').getBoundingClientRect(); const grid = document.querySelector('.grid.c4'); const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null; return { hOverflow: document.documentElement.scrollWidth > window.innerWidth, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, heroW: Math.round(hero.width), gridCols: cols, wrapW: Math.round(document.querySelector('.wrap').getBoundingClientRect().width) }; })()`));
  // I90: landscape 1180x820 halaman produk MLBB.
  await setMetrics(1180, 820, false);
  await nav("#/game/mobile-legends");
  await safe("I90-landscape-1180x820", () => evalJs(`(() => { const sum = document.querySelector('.summary'); const mb = document.querySelector('.mobile-bar'); const r = sum?.getBoundingClientRect(); return { hOverflow: document.documentElement.scrollWidth > window.innerWidth, summaryVisible: r ? (r.width > 0 && r.height > 0) : false, summaryTop: r ? Math.round(r.top) : null, mobileBarDisplay: mb ? getComputedStyle(mb).display : 'TIDAK-ADA', flowCols: getComputedStyle(document.querySelector('.flow')).gridTemplateColumns }; })()`));
}

if (WIDTH === 1680) {
  await setMetrics(1680, 900, false);
  await nav("#/");
  await safe("I82-1680-beranda", () => evalJs(`(() => { const wrap = document.querySelector('.wrap').getBoundingClientRect(); return { hOverflow: document.documentElement.scrollWidth > window.innerWidth, wrapW: Math.round(wrap.width), marginKiri: Math.round(wrap.left), marginKanan: Math.round(window.innerWidth - wrap.right), heroW: Math.round(document.querySelector('.hero').getBoundingClientRect().width) }; })()`));
}

if (WIDTH === 2560) {
  await setMetrics(2560, 1080, false);
  await nav("#/");
  await safe("I83-2560-beranda", () => evalJs(`(() => { const wrap = document.querySelector('.wrap').getBoundingClientRect(); return { hOverflow: document.documentElement.scrollWidth > window.innerWidth, wrapW: Math.round(wrap.width), marginKiri: Math.round(wrap.left), heroW: Math.round(document.querySelector('.hero').getBoundingClientRect().width) }; })()`));
  // I87: zoom 50% ~ lebar layout 2560 pada 1280 — halaman produk, tombol Beli.
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await sleep(300);
  await safe("I87-zoom50-beli", () => evalJs(`(() => { const beli = document.querySelector('.summary .btn.big'); const r = beli?.getBoundingClientRect(); beli?.scrollIntoView({ block: 'center' }); const r2 = beli?.getBoundingClientRect(); return { hOverflow: document.documentElement.scrollWidth > window.innerWidth, beliAda: !!beli, beliDisabled: beli?.disabled, beliRect: r2 ? { x: Math.round(r2.x), y: Math.round(r2.y), w: Math.round(r2.width), h: Math.round(r2.height) } : null, inViewport: r2 ? (r2.top >= 0 && r2.bottom <= window.innerHeight) : null }; })()`));
}

if (WIDTH === 1164) { // ~zoom 110% pada 1280
  await setMetrics(1164, 844, false);
  await nav("#/");
  await safe("I84-zoom110", () => evalJs(`(() => ({ hOverflow: document.documentElement.scrollWidth > window.innerWidth, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, clipped: [...document.querySelectorAll('.hero h1, .sec-head h2')].filter((e) => e.scrollWidth > e.clientWidth + 1).length }))()`));
}
if (WIDTH === 1422) { // ~zoom 90% pada 1280
  await setMetrics(1422, 844, false);
  await nav("#/");
  await safe("I85-zoom90", () => evalJs(`(() => ({ hOverflow: document.documentElement.scrollWidth > window.innerWidth, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, wrapW: Math.round(document.querySelector('.wrap').getBoundingClientRect().width) }))()`));
}
if (WIDTH === 1600) { // ~zoom 80% pada 1280
  await setMetrics(1600, 900, false);
  await nav("#/");
  await safe("I86-zoom80", () => evalJs(`(() => ({ hOverflow: document.documentElement.scrollWidth > window.innerWidth, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, wrapW: Math.round(document.querySelector('.wrap').getBoundingClientRect().width) }))()`));
}
if (WIDTH === 360) { // ~display size Besar Android (lebar CSS menyusut dari 390)
  await setMetrics(360, 800, true);
  await nav("#/");
  await safe("I89-display-besar-beranda", () => evalJs(`(() => ({ hOverflow: document.documentElement.scrollWidth > window.innerWidth, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, heroH1clip: document.querySelector('.hero h1').scrollWidth > document.querySelector('.hero h1').clientWidth + 1 }))()`));
  await nav("#/game/mobile-legends");
  await safe("I89-display-besar-produk", () => evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; const clipped = noms.filter((e) => e.scrollWidth > e.clientWidth + 1).length; return { hOverflow: document.documentElement.scrollWidth > window.innerWidth, nomClipped: clipped, nomCols: getComputedStyle(document.querySelector('.nom-grid')).gridTemplateColumns.split(' ').length }; })()`));
}

writeFileSync(`${outDir}/cdp-s456-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI-" + WIDTH);
process.exit(0);
