// Ukur CDP s460 (lebar 390: A1-A10, F65-F76, D48/D51 spot, G82/G83;
// lebar lain: G77-G81/G84 overflow). Berjalan via scripts/cdp-launch.sh.
// Penggunaan: node scripts/cdp-s460.mjs <wsUrl> <width> <baseUrl> <outDir>
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
const keyEvent = async (type, key, code, vk) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
const pressKey = async (key, code, vk) => { await keyEvent("keyDown", key, code, vk); await keyEvent("keyUp", key, code, vk); await sleep(180); };
const mouseMoveTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }); await sleep(180); };
const mousePressAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await sleep(90); };
const mouseReleaseAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); await sleep(180); };
const CONTRAST_JS = `(() => {
  window.__lum = (rgb) => { const m = rgb.match(/\\d+(\\.\\d+)?/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  window.__ratio = (fg, bg) => { const l1 = window.__lum(fg), l2 = window.__lum(bg); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
  window.__bgEff = (el) => { let n = el; while (n) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; n = n.parentElement; } return 'rgb(255, 255, 255)'; };
  window.__cx = (el) => { if (!el) return null; const cs = getComputedStyle(el); const fg = cs.color; const bgOwn = cs.backgroundColor; const bg = (bgOwn && bgOwn !== 'rgba(0, 0, 0, 0)' && bgOwn !== 'transparent') ? bgOwn : window.__bgEff(el); return { fg, bg, ratio: window.__ratio(fg, bg), fontSize: cs.fontSize, fontWeight: cs.fontWeight }; };
  return 'ok';
})()`;
const OVERFLOW_JS = `(() => {
  const vw = window.innerWidth;
  const bad = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) {
      const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 40);
      bad.push({ tag: el.tagName, cls, txt: (el.textContent || '').trim().slice(0, 40), left: +r.left.toFixed(1), right: +r.right.toFixed(1) });
    }
  });
  return { innerWidth: vw, scrollWidth: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > vw, pelanggar: bad.slice(0, 12), jumlahPelanggar: bad.length };
})()`;

if (WIDTH === 390) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);
  await evalJs(CONTRAST_JS);

  // ---------- A1: stepper "-" di qty 1 ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(400);
  await safe("A1-stepper-minus-qty1", () => evalJs(`(() => { const b = document.querySelector('.qty button[aria-label="Kurangi"]'); if (!b) return 'TIDAK-ADA'; const cs = getComputedStyle(b); const qty = document.querySelector('.qty b')?.textContent; b.click(); return { disabled: b.disabled, opacity: cs.opacity, cursor: cs.cursor, qtySebelum: qty, qtySesudahKlik: document.querySelector('.qty b')?.textContent, animasi: cs.animationName, transisi: cs.transitionProperty }; })()`));

  // ---------- A2: border hijau email Detail Kontak (pasca-perbaikan) ----------
  await safe("A2-email-ok-border", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#email'), 'nama@email.com'); return 'ok'; })()`);
    await sleep(300);
    return evalJs(`(() => { const el = document.querySelector('#email'); const cs = getComputedStyle(el); return { kelas: el.className, borderColor: cs.borderColor, adaOk: el.classList.contains('ok') }; })()`);
  });

  // ---------- A3: press "Belanja Lagi" di Sukses ----------
  await evalJs(`(() => { const o = { ref: 'RSD-S460A3', kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Selesai', email: '', wa: '', token: null }; localStorage.setItem('rosdi_orders', JSON.stringify([o])); return 'seeded'; })()`);
  await nav("#/sukses/RSD-S460A3");
  await safe("A3-belanja-lagi-press", async () => {
    const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Belanja Lagi'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA";
    await sleep(300);
    // gerakkan mouse dulu (tanpa ini :active sintetis kadang tidak menempel)
    await mouseMoveTo(pos.x, pos.y);
    await mousePressAt(pos.x, pos.y);
    const t = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Belanja Lagi'); return { transform: getComputedStyle(b).transform, active: b.matches(':active') }; })()`);
    await mouseReleaseAt(pos.x, pos.y);
    return { saatDitekan: t };
  });

  // ---------- A4: pencarian dikosongkan -> kartu kembali tanpa animasi? ----------
  // #katalog = seksi flash (2 kartu) — BUKAN kartu game; yang diukur di sini
  // kartu game (.grid.c4) + kategori (.grid.c3).
  await nav("#/");
  await safe("A4-search-clear-animasi", async () => {
    const hitung = () => evalJs(`(() => ({ game: document.querySelectorAll('.grid.c4 a.card').length, kategori: document.querySelectorAll('.grid.c3 a.card').length }))()`);
    await evalJs(`(() => { const setV = ${setVal}; const s = document.querySelector('input[type="search"], input[placeholder*="Cari"]'); setV(s, 'mlbb'); return 'ok'; })()`);
    await sleep(500);
    const saatCari = await hitung();
    await evalJs(`(() => { const setV = ${setVal}; const s = document.querySelector('input[type="search"], input[placeholder*="Cari"]'); setV(s, ''); return 'ok'; })()`);
    await sleep(500);
    const sesudahClear = await hitung();
    const anim = await evalJs(`(() => { const c = document.querySelector('.grid.c4 a.card'); const cs = getComputedStyle(c); return { animationName: cs.animationName, animationDuration: cs.animationDuration, transitionProperty: cs.transitionProperty }; })()`);
    return { kartuSaatCariMlbb: saatCari, kartuSesudahClear: sesudahClear, animasiKartuGame: anim };
  });

  // ---------- A5: hover logo (pasca-perbaikan) ----------
  await nav("#/");
  await safe("A5-logo-hover", async () => {
    const pos = await evalJs(`(() => { const a = document.querySelector('header .logo'); if (!a) return null; const r = a.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-LOGO";
    const sebelum = await evalJs(`(() => { const a = document.querySelector('header .logo'); return { opacity: getComputedStyle(a).opacity }; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const sesudah = await evalJs(`(() => { const a = document.querySelector('header .logo'); return { opacity: getComputedStyle(a).opacity, hover: a.matches(':hover') }; })()`);
    return { sebelum, sesudah };
  });

  // ---------- A6: hover tombol tema ----------
  await safe("A6-tema-hover", async () => {
    const pos = await evalJs(`(() => { const b = document.querySelector('button[aria-label="Ganti tema"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA";
    const sebelum = await evalJs(`(() => { const b = document.querySelector('button[aria-label="Ganti tema"]'); const cs = getComputedStyle(b); return { borderColor: cs.borderColor, color: cs.color }; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const sesudah = await evalJs(`(() => { const b = document.querySelector('button[aria-label="Ganti tema"]'); const cs = getComputedStyle(b); return { borderColor: cs.borderColor, color: cs.color, hover: b.matches(':hover') }; })()`);
    return { sebelum, sesudah };
  });

  // ---------- A7: hover "Salin" di Sukses ----------
  await nav("#/sukses/RSD-S460A3");
  await safe("A7-salin-hover", async () => {
    const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-SALIN";
    const sebelum = await evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => x.textContent.trim() === 'Salin'); const cs = getComputedStyle(b); return { borderColor: cs.borderColor, color: cs.color }; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const sesudah = await evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => x.textContent.trim() === 'Salin'); const cs = getComputedStyle(b); return { borderColor: cs.borderColor, color: cs.color, hover: b.matches(':hover') }; })()`);
    return { sebelum, sesudah };
  });

  // ---------- A8: hover "Beli" mobile-bar ----------
  await nav("#/game/mobile-legends");
  // klik nominal dulu, TUNGGU re-render React, baru klik metode — klik
  // berurutan sinkron gagal karena .pay belum dirender saat query jalan.
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(500);
  await evalJs(`(() => { const p = document.querySelectorAll('.pay')[0]; if (p) p.click(); return p ? 'ok' : 'TIDAK-ADA-PAY'; })()`);
  await sleep(400);
  await safe("A8-mobilebar-beli-hover", async () => {
    const pos = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), disabled: b.disabled }; })()`);
    if (!pos) return "TIDAK-ADA";
    const sebelum = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn'); return { background: getComputedStyle(b).backgroundColor }; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const sesudah = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn'); return { background: getComputedStyle(b).backgroundColor, hover: b.matches(':hover') }; })()`);
    return { posisi: pos, sebelum, sesudah };
  });

  // ---------- A9: hover baris riwayat ----------
  await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-S460A9' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Selesai', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1, 2].map(mk))); return 'seeded'; })()`);
  await nav("#/cek");
  await safe("A9-riwayat-hover", async () => {
    const pos = await evalJs(`(() => { const b = document.querySelector('button.sum-row'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-BARIS";
    await sleep(300);
    const sebelum = await evalJs(`(() => { const b = document.querySelector('button.sum-row'); return { bg: getComputedStyle(b).backgroundColor }; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const sesudah = await evalJs(`(() => { const b = document.querySelector('button.sum-row'); return { bg: getComputedStyle(b).backgroundColor, hover: b.matches(':hover') }; })()`);
    return { sebelum, sesudah };
  });

  // ---------- A10: border hijau promo aktif (pasca-perbaikan) ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(300);
  await safe("A10-promo-ok-border", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
    await evalJs(`(() => { [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
    await sleep(400);
    return evalJs(`(() => { const el = document.querySelector('input[aria-label="Kode promo"]'); const cs = getComputedStyle(el); const msg = document.querySelector('.note.good')?.textContent; return { kelas: el.className, borderColor: cs.borderColor, adaOk: el.classList.contains('ok'), pesan: msg || null }; })()`);
  });

  // ---------- F65-F70: kontras (light lalu dark) ----------
  await nav("#/");
  await safe("F65-masuk-light", () => evalJs(`(() => { const b = [...document.querySelectorAll('header button.btn')].find((x) => x.textContent.trim() === 'Masuk'); return window.__cx(b); })()`));
  await safe("F66-hero-sub-light", () => evalJs(`(() => window.__cx(document.querySelector('.hero p')))()`));
  await safe("F67-trust-desc-light", () => evalJs(`(() => { const s = document.querySelector('.trust .card span:last-child, .trust span'); return window.__cx(s); })()`));
  await safe("F68-footer-h2-light", () => evalJs(`(() => window.__cx(document.querySelector('footer.site h2')))()`));
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(300);
  await safe("F69-mobilebar-beli-light", () => evalJs(`(() => window.__cx(document.querySelector('.mobile-bar .btn')))()`));
  await nav("#/pulsa");
  await safe("F70-tab-aktif-light", () => evalJs(`(() => window.__cx(document.querySelector('.tab.on')))()`));
  // dark
  await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]')?.click(); return 'ok'; })()`);
  await sleep(500);
  await nav("#/");
  await safe("F65-masuk-dark", () => evalJs(`(() => { const b = [...document.querySelectorAll('header button.btn')].find((x) => x.textContent.trim() === 'Masuk'); return window.__cx(b); })()`));
  await safe("F66-hero-sub-dark", () => evalJs(`(() => window.__cx(document.querySelector('.hero p')))()`));
  await safe("F67-trust-desc-dark", () => evalJs(`(() => { const s = document.querySelector('.trust .card span:last-child, .trust span'); return window.__cx(s); })()`));
  await safe("F68-footer-h2-dark", () => evalJs(`(() => window.__cx(document.querySelector('footer.site h2')))()`));
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(300);
  await safe("F69-mobilebar-beli-dark", () => evalJs(`(() => window.__cx(document.querySelector('.mobile-bar .btn')))()`));
  await nav("#/pulsa");
  await safe("F70-tab-aktif-dark", () => evalJs(`(() => window.__cx(document.querySelector('.tab.on')))()`));
  await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]')?.click(); return 'ok'; })()`);
  await sleep(400);

  // ---------- F71: Enter di #billid (pasca-perbaikan) ----------
  await nav("#/tagihan/pln-pascabayar");
  await safe("F71-enter-billid", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#billid'); setV(el, '543210987654'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    await sleep(400);
    return evalJs(`(() => ({ rincianMuncul: !!document.querySelector('.note.good'), tombol: document.querySelector('#billid')?.closest('div').parentElement.querySelector('.btn')?.textContent || document.querySelectorAll('.btn')[0]?.textContent }))()`);
  });

  // ---------- F72: Enter di #vemail (pasca-perbaikan) ----------
  await nav("#/voucher/google-play");
  await safe("F72-enter-vemail", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#vemail'); setV(el, 'nama@email.com'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    await sleep(300);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.className || document.activeElement?.tagName, fokusKeNominal: document.activeElement?.classList?.contains('nom') }))()`);
  });

  // ---------- F73: Space di kartu flash ----------
  await nav("#/");
  await safe("F73-space-flash-card", async () => {
    const fokus = await evalJs(`(() => { const a = document.querySelector('#katalog a.card'); if (!a) return 'TIDAK-ADA'; a.scrollIntoView({ block: 'center' }); a.focus(); return { fokus: document.activeElement === a, href: a.getAttribute('href') }; })()`);
    if (fokus === 'TIDAK-ADA') return fokus;
    await sleep(200);
    const y0 = await evalJs(`window.scrollY`);
    const hash0 = await evalJs(`location.hash`);
    await pressKey(" ", "Space", 32);
    await sleep(400);
    const y1 = await evalJs(`window.scrollY`);
    const hash1 = await evalJs(`location.hash`);
    return { ...fokus, scrollYSebelum: y0, scrollYSesudah: y1, hashSebelum: hash0, hashSesudah: hash1, teraktivasi: hash0 !== hash1 };
  });

  // ---------- F74: Space di .nom ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await safe("F74-space-nom", async () => {
    const fokus = await evalJs(`(() => { const n = document.querySelector('.nom'); if (!n) return 'TIDAK-ADA'; n.focus(); return { fokus: document.activeElement === n }; })()`);
    if (fokus === 'TIDAK-ADA') return fokus;
    await sleep(200);
    await pressKey(" ", "Space", 32);
    await sleep(300);
    return evalJs(`(() => ({ nominalTerpilih: !!document.querySelector('.nom.on'), namaTerpilih: document.querySelector('.nom.on .n-name')?.textContent || null }))()`);
  });

  // ---------- F75: focus-visible kartu flash via Tab ----------
  await nav("#/");
  await safe("F75-flash-focus-visible", async () => {
    await evalJs(`(() => { document.querySelector('.skip-link')?.focus(); return 'ok'; })()`);
    await sleep(200);
    let ketemu = null;
    for (let i = 0; i < 16; i++) {
      await pressKey("Tab", "Tab", 9);
      const s = await evalJs(`(() => { const el = document.activeElement; if (!el) return null; return { tag: el.tagName, cls: (el.className || '').toString().slice(0, 30), teks: (el.textContent || '').trim().slice(0, 30), isFlash: el.matches && el.matches('#katalog a.card'), focusVisible: el.matches(':focus-visible'), outline: getComputedStyle(el).outline, outlineWidth: getComputedStyle(el).outlineWidth }; })()`);
      if (s && s.isFlash) { ketemu = s; break; }
    }
    return ketemu || "TIDAK-KETEMU-DALAM-16-TAB";
  });

  // ---------- F76: urutan Tab halaman Cek ----------
  await nav("#/cek");
  await safe("F76-tab-cek", async () => {
    await evalJs(`(() => { document.querySelector('.skip-link')?.focus(); return 'ok'; })()`);
    await sleep(200);
    const stops = [];
    for (let i = 0; i < 10; i++) {
      await pressKey("Tab", "Tab", 9);
      stops.push(await evalJs(`(() => { const el = document.activeElement; if (!el) return null; return { tag: el.tagName, cls: (el.className || '').toString().slice(0, 28), teks: (el.textContent || '').trim().slice(0, 28), aria: el.getAttribute('aria-label') || null }; })()`));
    }
    return { stops };
  });

  // ---------- D48 runtime: DANA 50.000 + ROSDI10 + QRIS = 45983 ----------
  await nav("#/emoney/dana");
  await safe("D48-runtime", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`);
    await sleep(300);
    await evalJs(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('Saldo 50.000')); n.click(); return 'ok'; })()`);
    await sleep(300);
    await evalJs(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); p.click(); return 'ok'; })()`);
    await sleep(300);
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
    await sleep(400);
    return evalJs(`(() => ({ totalRingkasan: document.querySelector('.sum-total b')?.textContent, totalMobileBar: document.querySelector('.mb-total b')?.textContent, hargaQRIS: [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS'))?.querySelector('.p-price')?.textContent }))()`);
  });

  // ---------- D51 runtime: MLBB 706 Diamonds + ROSDI10 + QRIS = 165500 ----------
  await nav("#/game/mobile-legends");
  await safe("D51-runtime", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
    await sleep(300);
    await evalJs(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('706 Diamonds')); n.click(); return 'ok'; })()`);
    await sleep(300);
    await evalJs(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); p.click(); return 'ok'; })()`);
    await sleep(300);
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
    await sleep(400);
    return evalJs(`(() => ({ totalRingkasan: document.querySelector('.sum-total b')?.textContent, totalMobileBar: document.querySelector('.mb-total b')?.textContent, hargaQRIS: [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS'))?.querySelector('.p-price')?.textContent }))()`);
  });

  // ---------- G82: font besar (zoom 125% sbg pendekatan) di 390 ----------
  await nav("#/");
  await evalJs(`(() => { document.documentElement.style.zoom = '1.25'; return 'ok'; })()`);
  await sleep(600);
  await safe("G82-font-besar-390", async () => {
    const o = await evalJs(OVERFLOW_JS);
    const grid = await evalJs(`(() => { const g = document.querySelector('.nom-grid'); if (!g) return null; const cs = getComputedStyle(g); return { kolom: cs.gridTemplateColumns.split(' ').length, templateColumns: cs.gridTemplateColumns }; })()`);
    return { ...o, gridDiBeranda: grid };
  });
  await evalJs(`(() => { document.documentElement.style.zoom = ''; return 'ok'; })()`);
  await sleep(400);

  // ---------- G83: grid nominal di 390 ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await sleep(300);
  await safe("G83-grid-390", async () => {
    const o = await evalJs(OVERFLOW_JS);
    const grid = await evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cs = getComputedStyle(g); const noms = [...document.querySelectorAll('.nom')].map((n) => { const r = n.getBoundingClientRect(); return { x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0) }; }); return { kolom: cs.gridTemplateColumns.split(' ').length, templateColumns: cs.gridTemplateColumns, kartuPertama: noms.slice(0, 4) }; })()`);
    return { ...o, grid };
  });
} else {
  // ---------- G77-G81, G84: pengukuran overflow per lebar ----------
  const h = WIDTH === 1024 ? 768 : 844;
  await setMetrics(WIDTH, h);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);
  if (WIDTH === 1024) {
    try { await send("Emulation.setPageScaleFactor", { pageScaleFactor: 1.5 }); await sleep(600); } catch (e) { await evalJs(`(() => { document.documentElement.style.zoom = '1.5'; return 'ok'; })()`); await sleep(600); }
  }
  await safe("G-overflow-" + WIDTH, () => evalJs(OVERFLOW_JS));
  if (WIDTH === 1024) {
    await safe("G80-zoom-info", () => evalJs(`(() => ({ zoom: document.documentElement.style.zoom || 'pageScaleFactor-1.5', innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }))()`));
  }
  if (WIDTH === 320) {
    await safe("G84-kartu-game-320", async () => {
      const r = await evalJs(`(() => { const cards = [...document.querySelectorAll('#katalog a.card')].slice(0, 6).map((c) => { const nama = c.querySelector('.p-name'); const sub = c.querySelector('.p-sub'); const terpotong = (el) => el ? el.scrollWidth > el.clientWidth + 0.5 : null; return { nama: nama?.textContent, namaTerpotong: terpotong(nama), subTerpotong: terpotong(sub), namaScrollW: nama?.scrollWidth, namaClientW: nama?.clientWidth }; }); return { cards, gridKolom: getComputedStyle(document.querySelector('#katalog .grid')).gridTemplateColumns }; })()`);
      return r;
    });
  }
  if (WIDTH === 240) {
    await nav("#/game/mobile-legends");
    await sleep(600);
    await safe("G81-game-240", () => evalJs(OVERFLOW_JS));
  }
}

writeFileSync(outDir + "/cdp-s460-" + WIDTH + ".json", JSON.stringify(R, null, 1));
console.log("SELESAI-CDP-" + WIDTH);
ws.close();
process.exit(0);
