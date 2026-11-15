// Probe CDP s459: A1-10 animasi, B/C spot-check live, D1-12 total UI, E58/59 lebar
// kartu kode + E63 sukses live, F65-76 kontras/keyboard, G77-84 responsif,
// H85-92 deep link/jaringan/riwayat, I99 live. Cabang per lebar.
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
const reload = async () => { await send("Page.reload", { ignoreCache: true }); await sleep(2500); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const clickPay = async (name) => evalJs(`(() => { const el = [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'TIDAK-ADA:' + ${JSON.stringify(name)}; el.click(); return 'klik:' + ${JSON.stringify(name)}; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, modifiers = 0) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
const pressKey = async (key, code, vk, modifiers = 0) => { await keyEvent("keyDown", key, code, vk, modifiers); await keyEvent("keyUp", key, code, vk, modifiers); await sleep(150); };
const rectOf = async (js) => evalJs(`(() => { const el = ${js}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
const mouseMoveTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }); await sleep(150); };
const mousePressAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await sleep(80); };
const mouseReleaseAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); await sleep(150); };
const applyPromo = async (code) => evalJs(`(async () => { const setV = ${setVal}; const input = document.querySelector('input[aria-label="Kode promo"]'); if (!input) return 'TIDAK-ADA-INPUT'; setV(input, ${JSON.stringify(code)}); const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Pakai'); if (!b) return 'TIDAK-ADA-PAKAI'; b.click(); await new Promise((r) => setTimeout(r, 300)); return document.querySelector('.note.good')?.textContent.trim() || document.querySelector('.note.bad')?.textContent.trim() || 'TANPA-NOTE'; })()`);
const dFlow = async (id, route, setupJs, nomName, promo, payName, want) => {
  await nav(route);
  await evalJs(setupJs);
  await evalJs(`(${clickText})('.nom', ${JSON.stringify(nomName)})`);
  await sleep(300);
  const promoNote = await applyPromo(promo);
  await clickPay(payName);
  await sleep(300);
  const aside = await evalJs(`document.querySelector('.sum-total b')?.textContent.trim()`);
  const bar = await evalJs(`document.querySelector('.mobile-bar b')?.textContent.trim()`);
  rec(id, { aside, bar, want, asideOk: aside === want, barOk: bar === want, promoNote });
};
// Kontras: baca warna teks + latar efektif (naik ke ancestor sampai tak transparan).
const CONTRAST_JS = `(() => {
  window.__lum = (rgb) => { const m = rgb.match(/\\d+(\\.\\d+)?/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  window.__ratio = (fg, bg) => { const l1 = window.__lum(fg), l2 = window.__lum(bg); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
  window.__bgEff = (el) => { let n = el; while (n) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; n = n.parentElement; } return 'rgb(255, 255, 255)'; };
  window.__cx = (el) => { if (!el) return null; const cs = getComputedStyle(el); const fg = cs.color; const bgOwn = cs.backgroundColor; const bg = (bgOwn && bgOwn !== 'rgba(0, 0, 0, 0)' && bgOwn !== 'transparent') ? bgOwn : window.__bgEff(el); return { fg, bg, ratio: window.__ratio(fg, bg), fontSize: cs.fontSize, fontWeight: cs.fontWeight }; };
  return 'ok';
})()`;
const gridInfo = (sel) => evalJs(`(() => { const g = document.querySelector(${JSON.stringify(sel)}); if (!g) return null; const kids = [...g.children].filter((e) => e.offsetParent !== null); const xs = [...new Set(kids.map((e) => Math.round(e.getBoundingClientRect().left)))]; const ws = [...new Set(kids.map((e) => Math.round(e.getBoundingClientRect().width)))]; const maxRight = kids.length ? Math.max(...kids.map((e) => Math.round(e.getBoundingClientRect().right))) : 0; return { anak: kids.length, kolom: xs.length, lebarAnak: ws, maxRight, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, terpotong: maxRight > window.innerWidth }; })()`);

if (WIDTH === 390) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);
  await evalJs(CONTRAST_JS);

  // ---------- A7: countdown <10 detik (mock Date -> 23:59:55) ----------
  await safe("A7-countdown-10s", async () => {
    await evalJs(`(() => { const RealDate = Date; const base = new RealDate(); base.setHours(23, 59, 55, 0); const baseMs = base.getTime(); const loadMs = RealDate.now(); function MockDate(...a) { return a.length ? new RealDate(...a) : new RealDate(baseMs + (RealDate.now() - loadMs)); } MockDate.now = () => baseMs + (RealDate.now() - loadMs); MockDate.parse = RealDate.parse; MockDate.UTC = RealDate.UTC; MockDate.prototype = RealDate.prototype; window.Date = MockDate; return 'mocked'; })()`);
    await sleep(1800);
    const r = await evalJs(`(() => { const c = document.querySelector('.count-chip'); if (!c) return null; const cs = getComputedStyle(c); return { teks: c.textContent.trim(), kelas: c.className, warna: cs.color, bg: cs.backgroundColor, animasi: c.getAnimations().map((a) => a.animationName) }; })()`);
    await reload(); // dokumen segar: mock Date hilang
    await evalJs(CONTRAST_JS);
    return r;
  });

  // ---------- A1: active tombol Beli di mobile-bar ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await clickPay("QRIS");
  await sleep(300);
  await safe("A1-beli-mobilebar-active", async () => {
    const r = await rectOf(`document.querySelector('.mobile-bar .btn')`);
    if (!r) return "TIDAK-ADA-TOMBOL";
    await mousePressAt(r.x + r.w / 2, r.y + r.h / 2);
    const t = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn'); return { transform: getComputedStyle(b).transform, disabled: b.disabled }; })()`);
    await mouseReleaseAt(r.x + r.w / 2, r.y + r.h / 2);
    return { tombol: r, saatDitekan: t };
  });

  // ---------- A3: hover kartu e-wallet Beranda ----------
  await nav("#/");
  await safe("A3-hover-ewallet", async () => {
    const pos = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); if (!a) return null; const r = a.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-KARTU-GOPAY";
    const before = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); return getComputedStyle(a).borderColor; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const after = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); const cs = getComputedStyle(a); return { borderColor: cs.borderColor, transform: cs.transform }; })()`);
    return { borderSebelum: before, borderSesudahHover: after };
  });

  // ---------- A4: klik chip pembayaran footer ----------
  await safe("A4-klik-chip-footer", async () => {
    await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
    await sleep(400);
    const info = await evalJs(`(() => { const s = document.querySelector('.pay-chips span'); if (!s) return null; const cs = getComputedStyle(s); return { teks: s.textContent, cursor: cs.cursor, tag: s.tagName, bisaFokus: s.tabIndex >= 0 }; })()`);
    const hash0 = await evalJs(`location.hash`);
    await evalJs(`(() => { document.querySelector('.pay-chips span').click(); return 'ok'; })()`);
    await sleep(300);
    const hash1 = await evalJs(`location.hash`);
    return { chip: info, hashSebelum: hash0, hashSesudahKlik: hash1, navigasiTerjadi: hash0 !== hash1 };
  });

  // ---------- A5: transisi border hijau UID valid ----------
  await nav("#/game/mobile-legends");
  await safe("A5-border-hijau-uid", () => evalJs(`(async () => {
    const setV = ${setVal}; const el = document.querySelector('#uid');
    const transisi = getComputedStyle(el).transition;
    setV(el, '12345678');
    const saat0 = getComputedStyle(el).borderColor;
    await new Promise((r) => setTimeout(r, 250));
    const saat250 = getComputedStyle(el).borderColor;
    return { transisi, kelas: el.className, borderSaatKetik: saat0, borderSesudah250ms: saat250 };
  })()`));

  // ---------- A6: nilai Biaya saat ganti metode ----------
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await clickPay("QRIS");
  await sleep(300);
  await safe("A6-biaya-ganti-metode", async () => {
    const baca = () => evalJs(`(() => { const row = [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Biaya pembayaran')); const b = row?.querySelector('b'); return { nilai: b?.textContent.trim(), animasi: b ? b.getAnimations().map((a) => a.animationName) : [], animasiRow: row ? row.getAnimations().map((a) => a.animationName) : [] }; })()`);
    const qris = await baca();
    await clickPay("BCA Virtual Account");
    await sleep(300);
    const bca = await baca();
    return { qris, bca };
  });

  // ---------- A2: pesan tidak ditemukan di Cek ----------
  await nav("#/cek");
  await safe("A2-pesan-tidak-ditemukan", () => evalJs(`(async () => {
    const setV = ${setVal}; setV(document.querySelector('input[aria-label="Nomor transaksi"]'), 'RSD-TIDAKADA123');
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek').click();
    await new Promise((r) => setTimeout(r, 500));
    const n = [...document.querySelectorAll('.note.bad')].find((x) => /tidak ditemukan/.test(x.textContent));
    return { pesanAda: !!n, teks: n?.textContent.trim().slice(0, 80) || null, animName: n ? getComputedStyle(n).animationName : null, animasiBerjalan: n ? n.getAnimations().map((a) => a.animationName) : [] };
  })()`));

  // ---------- A8: tombol di modal Masuk ----------
  await nav("#/");
  await safe("A8-modal-masuk", async () => {
    await evalJs(`(${clickText})('.btn', 'Masuk')`);
    await sleep(400);
    const m = await evalJs(`(() => { const d = document.querySelector('.modal'); if (!d) return null; const btns = [...d.querySelectorAll('button')].map((b) => b.textContent.trim()); return { judul: d.querySelector('h3')?.textContent, tombol: btns, isi: d.querySelector('p')?.textContent.trim().slice(0, 90) }; })()`);
    if (!m) return "MODAL-TIDAK-MUNCUL";
    await evalJs(`(() => { [...document.querySelectorAll('.modal button')].find((b) => /lanjut belanja/.test(b.textContent)).click(); return 'ok'; })()`);
    await sleep(300);
    const masihAda = await evalJs(`!!document.querySelector('.modal')`);
    return { modal: m, tertutupSetelahKlik: !masihAda };
  });

  // ---------- A9: press kartu game Beranda ----------
  await nav("#/");
  await safe("A9-press-kartu-game", async () => {
    const pos = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('Mobile Legends')); if (!a) return null; const r = a.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-KARTU";
    await mousePressAt(pos.x, pos.y);
    const t = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('Mobile Legends')); return { transform: getComputedStyle(a).transform, borderColor: getComputedStyle(a).borderColor }; })()`);
    await mouseReleaseAt(pos.x, pos.y);
    await sleep(600);
    return { saatDitekan: t, hashSesudah: await evalJs(`location.hash`) };
  });

  // ---------- A10: press baris riwayat Cek ----------
  await nav("#/cek");
  await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-TEST000' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1, 2].map(mk))); return 'seeded'; })()`);
  await reload();
  await nav("#/cek");
  await safe("A10-press-baris-riwayat", async () => {
    const pos = await evalJs(`(() => { const b = document.querySelector('button.sum-row'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-BARIS";
    const baca = () => evalJs(`(() => { const b = document.querySelector('button.sum-row'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, transform: cs.transform }; })()`);
    const normal = await baca();
    await mouseMoveTo(pos.x, pos.y);
    const hover = await baca();
    await mousePressAt(pos.x, pos.y);
    const ditekan = await baca();
    await mouseReleaseAt(pos.x, pos.y);
    return { normal, hover, saatDitekan: ditekan };
  });

  // ---------- B live spot-check ----------
  const searchLive = async (q) => {
    await nav("#/");
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('.searchbar input'); setV(el, ${JSON.stringify(q)}); return 'ok'; })()`);
    await sleep(400);
    return evalJs(`(() => ({ kartu: document.querySelectorAll('a.card').length, empty: document.querySelector('.empty')?.textContent.trim().slice(0, 80) || null }))()`);
  };
  await safe("B11-live-ff1000", () => searchLive("ff 1000"));
  await safe("B15-live-axis10000", () => searchLive("axis 10000"));
  await safe("B20-live-spotify", () => searchLive("spotify"));
  await safe("B22-live-beli-pulsa", () => searchLive("beli pulsa"));

  // ---------- C live spot-check ----------
  await nav("#/game/mobile-legends");
  await safe("C26-live-uid21", () => evalJs(`(async () => { const setV = ${setVal}; const el = document.querySelector('#uid'); setV(el, '123456789012345678901'); await new Promise((r) => setTimeout(r, 200)); return { nilaiTampil: el.value, panjang: el.value.length, kelas: el.className, error: document.querySelector('#uid-err')?.textContent.trim() || null }; })()`));
  await safe("C29-live-zone16", () => evalJs(`(async () => { const setV = ${setVal}; const el = document.querySelector('#zone'); setV(el, '1234567890123456'); await new Promise((r) => setTimeout(r, 200)); return { nilaiTampil: el.value, panjang: el.value.length, kelas: el.className, error: document.querySelector('#zone-err')?.textContent.trim() || null }; })()`));
  await safe("C34-live-wa5", () => evalJs(`(async () => { const setV = ${setVal}; const el = document.querySelector('#wa'); setV(el, '08123'); await new Promise((r) => setTimeout(r, 200)); const notes = [...document.querySelectorAll('.note')].filter((n) => /WhatsApp/i.test(n.textContent)); return { peringatan: notes.map((n) => n.textContent.trim().slice(0, 90)), tombolBeliDisabled: document.querySelector('.summary .btn.big')?.disabled }; })()`));
  await nav("#/game/valorant");
  await safe("C37-live-riot11", () => evalJs(`(async () => { const setV = ${setVal}; const el = document.querySelector('#riot'); setV(el, 'NamaSatuDua#TAG12'); await new Promise((r) => setTimeout(r, 200)); return { kelas: el.className, error: document.querySelector('#riot-err')?.textContent.trim() || null }; })()`));

  // ---------- D1-12: total UI ----------
  const S = (js) => js;
  await dFlow("D41", "#/game/valorant", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#riot'), 'Nama#TAG12'); return 'ok'; })()`), "475 Points", "GAMER5", "QRIS", "Rp56.050");
  await dFlow("D42", "#/data/telkomsel", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`), "Internet Sakti 5GB", "GAMER5", "QRIS", "Rp17.100");
  await dFlow("D43", "#/voucher/steam-wallet", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#vemail'), 'nama@email.com'); return 'ok'; })()`), "Steam Wallet 45.000", "ROSDI10", "QRIS", "Rp42.570");
  await dFlow("D44", "#/data/byu", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '085112345678'); return 'ok'; })()`), "Kuota by.U 5GB", "ROSDI10", "GoPay", "Rp18.250");
  await dFlow("D45", "#/game/arena-of-valor", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`), "40 Voucher", "ROSDI10", "Pulsa Telkomsel", "Rp14.550");
  await dFlow("D46", "#/game/delta-force", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`), "60 Delta Coins", "GAMER5", "Alfamart", "Rp16.750");
  await dFlow("D47", "#/game/wild-rift", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#riot'), 'Nama#TAG12'); return 'ok'; })()`), "475 Wild Cores", "GAMER5", "BCA Virtual Account", "Rp77.550");
  await dFlow("D48", "#/game/mobile-legends", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`), "3 Diamonds", "GAMER5", "Pulsa Telkomsel", "Rp1.684");
  // Pembelian nyata D48 -> halaman Sukses (E63 + H90)
  await safe("E63-H90-sukses", async () => {
    await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
    await sleep(1500);
    const hash = await evalJs(`location.hash`);
    await reload();
    const teks = await evalJs(`(() => { const main = document.querySelector('main#konten'); return { hash: location.hash, judul: document.querySelector('h1, h2')?.textContent, labelTotal: document.querySelector('.sum-total span')?.textContent.trim(), nilaiTotal: document.querySelector('.sum-total b')?.textContent.trim(), teksKunci: ['Pesanan diterima', 'Nomor transaksi', 'Produk', 'Tujuan', 'Pembayaran', 'Bukti dikirim ke', 'Harga + biaya', 'Total dibayar', 'Cek Transaksi', 'Belanja Lagi'].map((t) => ({ t, ada: main.textContent.includes(t) })) }; })()`);
    const net = await evalJs(`(() => { const res = performance.getEntriesByType('resource').map((e) => e.name); const dups = res.filter((u, i) => res.indexOf(u) !== i); return { jumlah: res.length, duplikat: [...new Set(dups)], daftar: res.map((u) => u.replace(/^https?:\\/\\/[^/]+/, '')) }; })()`);
    return { hashSesudahBeli: hash, sukses: teks, jaringan: net };
  });
  await dFlow("D49", "#/game/pubg-mobile", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`), "325 UC", "ROSDI10", "QRIS", "Rp64.800");
  await dFlow("D50", "#/game/honor-of-kings", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`), "240 Token", "GAMER5", "DANA", "Rp20.675");
  await dFlow("D51", "#/emoney/ovo", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`), "Saldo 20.000", "ROSDI10", "BCA Virtual Account", "Rp20.943");
  await dFlow("D52", "#/game/genshin-impact", S(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`), "60 Genesis Crystal", "GAMER5", "QRIS", "Rp11.875");

  // ---------- F65-70 kontras LIGHT ----------
  const cxRead = async (label, js) => { await evalJs(CONTRAST_JS); const v = await evalJs(`(() => { const el = ${js}; return el ? window.__cx(el) : null; })()`); rec(label, v); };
  await nav("#/pln");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
  await sleep(300);
  await cxRead("F65-cekNama-light", `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek Nama')`);
  await nav("#/sukses/RSD-DEMO1234");
  await cxRead("F66-salin-light", `[...document.querySelectorAll('.btn.ghost')].find((b) => b.textContent.trim() === 'Salin')`);
  await nav("#/game/mobile-legends");
  await cxRead("F67-hintlink-light", `document.querySelector('.hint-link')`);
  await nav("#/");
  await cxRead("F68-more-light", `document.querySelector('.sec-head .more')`);
  await nav("#/voucher/steam-wallet");
  await cxRead("F69-note-voucher-light", `document.querySelector('.note')`);
  await nav("#/data/telkomsel");
  await cxRead("F70-nmeta-light", `document.querySelector('.n-meta')`);
  // F68b: tombol "Lihat semua" di Cek (butuh >5 order)
  await nav("#/cek");
  await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-TEST000' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1,2,3,4,5,6,7].map(mk))); return 'seeded'; })()`);
  await reload();
  await nav("#/cek");
  await cxRead("F68b-lihatSemua-light", `[...document.querySelectorAll('button')].find((b) => /Lihat semua/.test(b.textContent))`);

  // ---------- F65-70 kontras DARK ----------
  await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ganti tema').click(); return 'ok'; })()`);
  await sleep(500);
  await nav("#/pln");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
  await sleep(300);
  await cxRead("F65-cekNama-dark", `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek Nama')`);
  await nav("#/sukses/RSD-DEMO1234");
  await cxRead("F66-salin-dark", `[...document.querySelectorAll('.btn.ghost')].find((b) => b.textContent.trim() === 'Salin')`);
  await nav("#/game/mobile-legends");
  await cxRead("F67-hintlink-dark", `document.querySelector('.hint-link')`);
  await nav("#/");
  await cxRead("F68-more-dark", `document.querySelector('.sec-head .more')`);
  await nav("#/voucher/steam-wallet");
  await cxRead("F69-note-voucher-dark", `document.querySelector('.note')`);
  await nav("#/data/telkomsel");
  await cxRead("F70-nmeta-dark", `document.querySelector('.n-meta')`);
  await nav("#/cek");
  await cxRead("F68b-lihatSemua-dark", `[...document.querySelectorAll('button')].find((b) => /Lihat semua/.test(b.textContent))`);
  // kembali ke Light
  await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ganti tema').click(); return 'ok'; })()`);
  await sleep(400);

  // ---------- F71-76 keyboard ----------
  await nav("#/emoney/dana");
  await safe("F71-enter-hp-emoney", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#hp'); setV(el, '081234567890'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName, fokusKeNominal: document.activeElement?.classList?.contains('nom') }))()`);
  });
  await nav("#/game/valorant");
  await safe("F72-enter-riot", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#riot'); setV(el, 'Nama#TAG12'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.id || document.activeElement?.tagName, fokusKeNominal: document.activeElement?.classList?.contains('nom') }))()`);
  });
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await safe("F73-space-pay", async () => {
    await evalJs(`(() => { document.querySelector('.pay').focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey(" ", "Space", 32);
    await sleep(200);
    return evalJs(`(() => ({ metodeTerpilih: document.querySelector('.pay.on .p-name2')?.textContent.trim() || null }))()`);
  });
  await nav("#/cek");
  await safe("F74-space-riwayat", async () => {
    await evalJs(`(() => { const b = document.querySelector('button.sum-row'); if (b) b.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey(" ", "Space", 32);
    await sleep(600);
    return evalJs(`(() => ({ hash: location.hash }))()`);
  });
  await nav("#/");
  await safe("F75-enter-flash", async () => {
    await evalJs(`(() => { const a = document.querySelector('#katalog a.card'); if (a) a.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    await sleep(600);
    return evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent }))()`);
  });
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await safe("F76-pakai-focus-visible", async () => {
    await evalJs(`(() => { document.querySelector('input[aria-label="Kode promo"]').focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Tab", "Tab", 9);
    await sleep(200);
    return evalJs(`(() => { const el = document.activeElement; if (!el) return null; const cs = getComputedStyle(el); return { teks: el.textContent.trim(), focusVisible: el.matches(':focus-visible'), outline: cs.outline, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor }; })()`);
  });

  // ---------- H85-89 deep link ----------
  await safe("H85-metode-qris-kecil", async () => {
    await navFull(baseUrl + "?metode=qris#/game/mobile-legends");
    return evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, metodeTerpilih: document.querySelector('.pay.on .p-name2')?.textContent.trim() || null }))()`);
  });
  await safe("H86-uid", async () => {
    await navFull(baseUrl + "?uid=12345678#/game/mobile-legends");
    return evalJs(`(() => ({ hash: location.hash, uidTerisi: document.querySelector('#uid')?.value || '' }))()`);
  });
  await safe("H87-zone", async () => {
    await navFull(baseUrl + "?zone=1234#/game/mobile-legends");
    return evalJs(`(() => ({ hash: location.hash, zoneTerisi: document.querySelector('#zone')?.value || '' }))()`);
  });
  await safe("H88-game-param", async () => {
    await navFull(baseUrl + "?game=mobile-legends#/game/mobile-legends");
    return evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, halamanRusak: !document.querySelector('h1') }))()`);
  });
  await safe("H89-qty10-metode", async () => {
    await navFull(baseUrl + "?qty=10&metode=QRIS#/game/mobile-legends");
    return evalJs(`(() => ({ hash: location.hash, qtyTampil: document.querySelector('.qty b')?.textContent || null, metodeTerpilih: document.querySelector('.pay.on .p-name2')?.textContent.trim() || null }))()`);
  });

  // ---------- H91 jaringan Pulsa ----------
  await nav("#/pulsa/telkomsel");
  await reload();
  await safe("H91-net-pulsa", () => evalJs(`(() => { const res = performance.getEntriesByType('resource').map((e) => e.name); const dups = res.filter((u, i) => res.indexOf(u) !== i); return { jumlah: res.length, duplikat: [...new Set(dups)], daftar: res.map((u) => u.replace(/^https?:\\/\\/[^/]+/, '')) }; })()`));

  // ---------- H92 hapus semua riwayat + refresh ----------
  await nav("#/cek");
  await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-TEST000' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1,2,3].map(mk))); return 'seeded'; })()`);
  await reload();
  await nav("#/cek");
  await safe("H92-hapus-semua-refresh", async () => {
    const sebelum = await evalJs(`(() => ({ baris: document.querySelectorAll('button.sum-row').length, adaJudulRiwayat: !!([...document.querySelectorAll('h2')].find((h) => /Transaksi terakhir/.test(h.textContent))) }))()`);
    await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);
    await reload();
    await nav("#/cek");
    const sesudah = await evalJs(`(() => ({ baris: document.querySelectorAll('button.sum-row').length, adaJudulRiwayat: !!([...document.querySelectorAll('h2')].find((h) => /Transaksi terakhir/.test(h.textContent))), teksHalaman: document.querySelector('main#konten').textContent.slice(0, 200) }))()`);
    return { sebelum, sesudah };
  });

  // ---------- I99 live: judul Langkah 2 E-Wallet ----------
  await nav("#/emoney/dana");
  await safe("I99-judul-langkah2-emoney", () => evalJs(`(() => { const heads = [...document.querySelectorAll('.step-head h2')].map((h) => h.textContent.trim()); return { judulLangkah: heads }; })()`));
}

if (WIDTH === 415) {
  await setMetrics(415);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);
  await safe("G77-grid-voucher-415", () => gridInfo(".grid.c3"));
  await safe("G77-kartu-voucher-415", () => evalJs(`(() => { const cards = [...document.querySelectorAll('a.card')].filter((a) => /Google Play|Steam|PlayStation/.test(a.textContent)); return { jumlah: cards.length, kanan: cards.map((c) => Math.round(c.getBoundingClientRect().right)), lebar: cards.map((c) => Math.round(c.getBoundingClientRect().width)) }; })()`));
}
if (WIDTH === 425) {
  await setMetrics(425);
  await nav("#/data/telkomsel");
  await safe("G78-grid-data-425", () => gridInfo(".nom-grid"));
}
if (WIDTH === 432) {
  await setMetrics(432);
  await nav("#/game/mobile-legends");
  await safe("G79-grid-nominal-432", () => gridInfo(".nom-grid"));
}
if (WIDTH === 1080) {
  await setMetrics(1080, 900, false);
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await clickPay("QRIS");
  await sleep(300);
  await safe("G80-checkout-1080", () => evalJs(`(() => { const f = document.querySelector('.flow'); const cs = getComputedStyle(f); const aside = document.querySelector('.summary'); const ar = aside?.getBoundingClientRect(); const fr = f?.getBoundingClientRect(); return { kolomFlow: cs.gridTemplateColumns, asideTerlihat: !!aside, asideLebar: ar ? Math.round(ar.width) : null, flowLebar: fr ? Math.round(fr.width) : null, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth }; })()`));
}
if (WIDTH === 1152) {
  await setMetrics(1152, 900, false);
  await nav("#/game/mobile-legends");
  await safe("G81-grid-nominal-1152", () => gridInfo(".nom-grid"));
  await safe("G81-lebar-nom-1152", () => evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; const ws = noms.map((n) => Math.round(n.getBoundingClientRect().width)); return { jumlah: noms.length, lebar: [...new Set(ws)], semuaSama: new Set(ws).size === 1 }; })()`));
}
if (WIDTH === 1280) {
  await setMetrics(1280, 900, false);
  await nav("#/pulsa/telkomsel");
  await safe("E58-lebar-nom-pulsa-kode", () => evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; const ws = noms.map((n) => Math.round(n.getBoundingClientRect().width)); const hs = noms.map((n) => Math.round(n.getBoundingClientRect().height)); return { jumlah: noms.length, lebar: [...new Set(ws)], tinggi: [...new Set(hs)], semuaLebarSama: new Set(ws).size === 1 }; })()`));
  await nav("#/pln");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.btn', 'Cek Nama')`);
  await sleep(400);
  await safe("E59-lebar-nom-pln-kode", () => evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; const ws = noms.map((n) => Math.round(n.getBoundingClientRect().width)); const hs = noms.map((n) => Math.round(n.getBoundingClientRect().height)); return { jumlah: noms.length, lebar: [...new Set(ws)], tinggi: [...new Set(hs)], semuaLebarSama: new Set(ws).size === 1 }; })()`));
  await safe("G82-wrap-1280", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); return { lebarWrap: Math.round(r.width), kiri: Math.round(r.left), kanan: Math.round(window.innerWidth - r.right) }; })()`));
  // G84: zoom 33% di Beranda
  await nav("#/");
  await safe("G84-zoom33", async () => {
    await evalJs(`document.documentElement.style.zoom = '33%'; 'ok'`);
    await sleep(600);
    const r = await evalJs(`(() => { const g = document.querySelector('.grid.c4'); const kids = [...g.children]; const xs = [...new Set(kids.map((e) => Math.round(e.getBoundingClientRect().left)))]; const pfrom = [...document.querySelectorAll('.p-from')].map((e) => ({ teks: e.textContent.trim(), meluber: e.scrollWidth > e.clientWidth })); return { kolomC4: xs.length, hargaMeluber: pfrom.filter((p) => p.meluber), jumlahHarga: pfrom.length, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth }; })()`);
    await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
    return r;
  });
}
if (WIDTH === 1360) {
  await setMetrics(1360, 900, false);
  await nav("#/");
  await safe("G82-wrap-1360", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); return { lebarWrap: Math.round(r.width), kiri: Math.round(r.left), kanan: Math.round(window.innerWidth - r.right), terpusat: Math.abs(r.left - (window.innerWidth - r.right)) <= 1 }; })()`));
}
if (WIDTH === 3840) {
  await setMetrics(3840, 1200, false);
  await nav("#/");
  await safe("G83-wrap-3840", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); return { lebarWrap: Math.round(r.width), kiri: Math.round(r.left), kanan: Math.round(window.innerWidth - r.right), terpusat: Math.abs(r.left - (window.innerWidth - r.right)) <= 1 }; })()`));
}

writeFileSync(outDir + "/cdp-s459-" + WIDTH + ".json", JSON.stringify(R, null, 1));
console.log("SELESAI-CDP-" + WIDTH);
ws.close();
process.exit(0);
