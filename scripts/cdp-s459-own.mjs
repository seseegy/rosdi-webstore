// Pengukuran CDP s459 (ditulis sendiri untuk audit ini): A1/A3/A7/A9/A10,
// B/C spot-check live, D spot-check total UI, F65-70 kontras live, F71-76
// keyboard, G77-84 responsif, H85-92 deep link/jaringan/riwayat, I99.
// Dipanggil per lebar oleh scripts/cdp-launch.sh:
//   node scripts/cdp-s459-own.mjs <wsUrl> <width> <baseUrl> <outDir>
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
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; });
const setMetrics = async (w, h = 844, mobile = w < 900) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const reload = async () => { await send("Page.reload", { ignoreCache: true }); await sleep(2500); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEv = async (type, key, code, vk) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
const pressKey = async (key, code, vk) => { await keyEv("keyDown", key, code, vk); await keyEv("keyUp", key, code, vk); await sleep(150); };
const mouse = async (type, x, y, button = "left") => send("Input.dispatchMouseEvent", { type, x, y, button, clickCount: 1 });
const rectOf = async (js) => evalJs(`(() => { const el = ${js}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
const seedOrders = async (n) => evalJs(`(() => { const mk = (i) => ({ ref: 'RSD-TEST000' + i, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - i * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify(Array.from({length: ${n}}, (_, i) => mk(i + 1)))); return 'seeded'; })()`);
const gridInfo = (sel) => evalJs(`(() => { const g = document.querySelector(${JSON.stringify(sel)}); if (!g) return null; const kids = [...g.children].filter((e) => e.offsetParent !== null); const xs = [...new Set(kids.map((e) => Math.round(e.getBoundingClientRect().left)))]; const ws = [...new Set(kids.map((e) => Math.round(e.getBoundingClientRect().width)))]; const maxRight = kids.length ? Math.max(...kids.map((e) => Math.round(e.getBoundingClientRect().right))) : 0; return { anak: kids.length, kolom: xs.length, lebarAnak: ws, maxRight, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, terpotong: maxRight > window.innerWidth }; })()`);
const lum = `window.__lum = (rgb) => { const m = rgb.match(/\\d+(\\.\\d+)?/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); }; window.__ratio = (fg, bg) => { const l1 = window.__lum(fg), l2 = window.__lum(bg); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; }; window.__bgEff = (el) => { let n = el; while (n) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; n = n.parentElement; } return 'rgb(255, 255, 255)'; }; window.__cx = (el) => { if (!el) return null; const cs = getComputedStyle(el); const fg = cs.color; const bgOwn = cs.backgroundColor; const bg = (bgOwn && bgOwn !== 'rgba(0, 0, 0, 0)' && bgOwn !== 'transparent') ? bgOwn : window.__bgEff(el); return { fg, bg, ratio: window.__ratio(fg, bg) }; }; 'ok';`;

if (WIDTH === 390) {
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);
  await evalJs(lum);

  // A7: countdown <10 detik — mock Date ke 23:59:55, tunggu 2 tick
  await safe("A7-countdown-10s", async () => {
    await evalJs(`(() => { const RD = Date; const base = new RD(); base.setHours(23, 59, 55, 0); const b = base.getTime(); const l = RD.now(); function MD(...a) { return a.length ? new RD(...a) : new RD(b + (RD.now() - l)); } MD.now = () => b + (RD.now() - l); MD.parse = RD.parse; MD.UTC = RD.UTC; MD.prototype = RD.prototype; window.Date = MD; return 'mocked'; })()`);
    await sleep(2200);
    const r = await evalJs(`(() => { const c = document.querySelector('.count-chip'); if (!c) return null; const cs = getComputedStyle(c); return { teks: c.textContent.trim(), warna: cs.color, bg: cs.backgroundColor, fontWeight: cs.fontWeight, animasi: c.getAnimations().map((a) => a.animationName) }; })()`);
    await reload();
    await evalJs(lum);
    return r;
  });

  // A1: :active tombol Beli di mobile-bar
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(() => { [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('3 Diamonds')).click(); return 'ok'; })()`);
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === 'QRIS').click(); return 'ok'; })()`);
  await sleep(300);
  await safe("A1-beli-mobilebar-active", async () => {
    const r = await rectOf(`document.querySelector('.mobile-bar .btn')`);
    if (!r) return "TIDAK-ADA-TOMBOL";
    await mouse("mousePressed", r.x + r.w / 2, r.y + r.h / 2);
    const t = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn'); return { transform: getComputedStyle(b).transform, aktif: b.matches(':active') }; })()`);
    await mouse("mouseReleased", r.x + r.w / 2, r.y + r.h / 2);
    return { tombol: r, saatDitekan: t };
  });

  // A3: hover kartu e-wallet GoPay di Beranda
  await nav("#/");
  await safe("A3-hover-ewallet", async () => {
    const pos = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); if (!a) return null; const r = a.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-KARTU-GOPAY";
    const before = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); return getComputedStyle(a).borderColor; })()`);
    await mouse("mouseMoved", pos.x, pos.y, "none");
    await sleep(200);
    const after = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); const cs = getComputedStyle(a); return { borderColor: cs.borderColor, transform: cs.transform }; })()`);
    return { borderSebelum: before, sesudahHover: after };
  });

  // A4: klik chip pembayaran footer (span statis?)
  await safe("A4-klik-chip-footer", async () => {
    await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
    await sleep(400);
    const info = await evalJs(`(() => { const s = document.querySelector('.pay-chips span'); if (!s) return null; const cs = getComputedStyle(s); return { teks: s.textContent, cursor: cs.cursor, tag: s.tagName, bisaFokus: s.tabIndex >= 0 }; })()`);
    const h0 = await evalJs(`location.hash`);
    await evalJs(`(() => { document.querySelector('.pay-chips span').click(); return 'ok'; })()`);
    await sleep(300);
    const h1 = await evalJs(`location.hash`);
    return { chip: info, hashSebelum: h0, hashSesudahKlik: h1, navigasiTerjadi: h0 !== h1 };
  });

  // A5: transisi border hijau saat UID valid
  await nav("#/game/mobile-legends");
  await safe("A5-border-hijau-uid", () => evalJs(`(async () => { const setV = ${setVal}; const el = document.querySelector('#uid'); const transisi = getComputedStyle(el).transition; setV(el, '12345678'); const b0 = getComputedStyle(el).borderColor; await new Promise((r) => setTimeout(r, 250)); const b1 = getComputedStyle(el).borderColor; return { transisi, kelas: el.className, borderSaatKetik: b0, borderSesudah250ms: b1 }; })()`));

  // A6: nilai Biaya saat ganti metode (animasi?)
  await evalJs(`(() => { [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('3 Diamonds')).click(); return 'ok'; })()`);
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === 'QRIS').click(); return 'ok'; })()`);
  await sleep(300);
  await safe("A6-biaya-ganti-metode", async () => {
    const baca = () => evalJs(`(() => { const row = [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Biaya pembayaran')); const b = row?.querySelector('b'); return { nilai: b?.textContent.trim(), animasiB: b ? b.getAnimations().map((a) => a.animationName) : [], animasiRow: row ? row.getAnimations().map((a) => a.animationName) : [] }; })()`);
    const qris = await baca();
    await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === 'BCA Virtual Account').click(); return 'ok'; })()`);
    await sleep(300);
    return { qris, bca: await baca() };
  });

  // A2: pesan tidak ditemukan di Cek — animasi?
  await nav("#/cek");
  await safe("A2-pesan-tidak-ditemukan", () => evalJs(`(async () => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Nomor transaksi"]'), 'RSD-TIDAKADA123'); [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek').click(); await new Promise((r) => setTimeout(r, 500)); const n = [...document.querySelectorAll('.note.bad')].find((x) => /tidak ditemukan/.test(x.textContent)); return { pesanAda: !!n, animName: n ? getComputedStyle(n).animationName : null, animasiBerjalan: n ? n.getAnimations().map((a) => a.animationName) : [] }; })()`));

  // A8: tombol di modal Masuk
  await nav("#/");
  await safe("A8-modal-masuk", async () => {
    await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Masuk').click(); return 'ok'; })()`);
    await sleep(400);
    const m = await evalJs(`(() => { const d = document.querySelector('.modal'); if (!d) return null; return { judul: d.querySelector('h3')?.textContent, tombol: [...d.querySelectorAll('button')].map((b) => b.textContent.trim()), isi: d.querySelector('p')?.textContent.trim().slice(0, 100) }; })()`);
    if (!m) return "MODAL-TIDAK-MUNCUL";
    await evalJs(`(() => { [...document.querySelectorAll('.modal button')].find((b) => /lanjut belanja/.test(b.textContent)).click(); return 'ok'; })()`);
    await sleep(300);
    return { modal: m, tertutupSetelahKlik: !(await evalJs(`!!document.querySelector('.modal')`)) };
  });

  // A9: press kartu game Beranda
  await nav("#/");
  await safe("A9-press-kartu-game", async () => {
    const pos = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('Mobile Legends')); if (!a) return null; const r = a.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-KARTU";
    await mouse("mousePressed", pos.x, pos.y);
    const t = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('Mobile Legends')); return { transform: getComputedStyle(a).transform, aktif: a.matches(':active') }; })()`);
    await mouse("mouseReleased", pos.x, pos.y);
    await sleep(600);
    return { saatDitekan: t, hashSesudah: await evalJs(`location.hash`) };
  });

  // A10: press baris riwayat Cek
  await seedOrders(2);
  await nav("#/cek");
  await safe("A10-press-baris-riwayat", async () => {
    const pos = await evalJs(`(() => { const b = document.querySelector('button.sum-row'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-BARIS";
    const baca = () => evalJs(`(() => { const b = document.querySelector('button.sum-row'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, transform: cs.transform }; })()`);
    const normal = await baca();
    await mouse("mouseMoved", pos.x, pos.y, "none");
    const hover = await baca();
    await mouse("mousePressed", pos.x, pos.y);
    const ditekan = await baca();
    await mouse("mouseReleased", pos.x, pos.y);
    return { normal, hover, saatDitekan: ditekan };
  });

  // B live spot-check
  const searchLive = async (q) => {
    await nav("#/");
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('.searchbar input'), ${JSON.stringify(q)}); return 'ok'; })()`);
    await sleep(400);
    return evalJs(`(() => ({ kartu: document.querySelectorAll('a.card').length, empty: document.querySelector('.empty')?.textContent.trim().slice(0, 80) || null }))()`);
  };
  await safe("B11-live-ff1000", () => searchLive("ff 1000"));
  await safe("B15-live-axis10000", () => searchLive("axis 10000"));
  await safe("B20-live-spotify", () => searchLive("spotify"));
  await safe("B22-live-beli-pulsa", () => searchLive("beli pulsa"));

  // C live spot-check
  await nav("#/game/mobile-legends");
  await safe("C26-live-uid21", () => evalJs(`(async () => { const setV = ${setVal}; const el = document.querySelector('#uid'); setV(el, '123456789012345678901'); await new Promise((r) => setTimeout(r, 200)); return { nilaiTampil: el.value, panjang: el.value.length, kelas: el.className, error: document.querySelector('#uid-err')?.textContent.trim() || null }; })()`));
  await safe("C29-live-zone16", () => evalJs(`(async () => { const setV = ${setVal}; const el = document.querySelector('#zone'); setV(el, '1234567890123456'); await new Promise((r) => setTimeout(r, 200)); return { nilaiTampil: el.value, panjang: el.value.length, kelas: el.className, error: document.querySelector('#zone-err')?.textContent.trim() || null }; })()`));
  await safe("C34-live-wa5", () => evalJs(`(async () => { const setV = ${setVal}; setV(document.querySelector('#wa'), '08123'); await new Promise((r) => setTimeout(r, 200)); const notes = [...document.querySelectorAll('.note')].filter((n) => /WhatsApp/i.test(n.textContent)); return { peringatan: notes.map((n) => n.textContent.trim().slice(0, 90)), tombolBeliDisabled: document.querySelector('.summary .btn.big')?.disabled }; })()`));
  await nav("#/game/valorant");
  await safe("C37-live-riot11", () => evalJs(`(async () => { const setV = ${setVal}; const el = document.querySelector('#riot'); setV(el, 'NamaSatuDua#TAG12'); await new Promise((r) => setTimeout(r, 200)); return { kelas: el.className, error: document.querySelector('#riot-err')?.textContent.trim() || null }; })()`));

  // D spot-check total UI (D41 + D48) + E63/H90 via pembelian D48
  const dFlow = async (id, route, setupJs, nomName, promo, payName, want) => {
    await nav(route);
    await evalJs(setupJs);
    await evalJs(`(() => { [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes(${JSON.stringify(nomName)}))?.click(); return 'ok'; })()`);
    await sleep(300);
    await evalJs(`(async () => { const setV = ${setVal}; const inp = document.querySelector('input[aria-label="Kode promo"]'); setV(inp, ${JSON.stringify(promo)}); [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Pakai').click(); await new Promise((r) => setTimeout(r, 300)); return 'ok'; })()`);
    await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === ${JSON.stringify(payName)})?.click(); return 'ok'; })()`);
    await sleep(300);
    const aside = await evalJs(`document.querySelector('.sum-total b')?.textContent.trim()`);
    const bar = await evalJs(`document.querySelector('.mobile-bar b')?.textContent.trim()`);
    rec(id, { aside, bar, want, asideOk: aside === want, barOk: bar === want });
  };
  await dFlow("D41", "#/game/valorant", `(() => { const setV = ${setVal}; setV(document.querySelector('#riot'), 'Nama#TAG12'); return 'ok'; })()`, "475 Points", "GAMER5", "QRIS", "Rp56.050");
  await dFlow("D48", "#/game/mobile-legends", `(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`, "3 Diamonds", "GAMER5", "Pulsa Telkomsel", "Rp1.684");
  // Beli D48 -> Sukses: cek teks halaman + jaringan (E63 + H90)
  await safe("E63-H90-sukses", async () => {
    await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
    await sleep(1500);
    const hash = await evalJs(`location.hash`);
    await reload();
    const teks = await evalJs(`(() => { const main = document.querySelector('main#konten'); return { judul: document.querySelector('h1')?.textContent, kunci: ['Pesanan diterima', 'Nomor transaksi', 'Waktu', 'Produk', 'Tujuan', 'Pembayaran', 'Harga + biaya', 'Total', 'Garansi', 'Salin', 'Cek Transaksi', 'Belanja Lagi'].map((t) => ({ t, ada: main.textContent.includes(t) })) }; })()`);
    const net = await evalJs(`(() => { const res = performance.getEntriesByType('resource').map((e) => e.name); const dups = res.filter((u, i) => res.indexOf(u) !== i); return { jumlah: res.length, duplikat: [...new Set(dups)], daftar: res.map((u) => u.replace(/^https?:\\/\\/[^/]+/, '')) }; })()`);
    return { hashSesudahBeli: hash, sukses: teks, jaringan: net };
  });

  // F65-70 kontras LIGHT (PLN + Sukses demo) lalu DARK
  const cx = async (label, js) => { const v = await evalJs(`(() => { const el = ${js}; return el ? window.__cx(el) : null; })()`); rec(label, v); };
  await nav("#/pln");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
  await sleep(300);
  await cx("F65-cekNama-light", `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek Nama')`);
  await evalJs(`(() => { localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-SALIN1', kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '', token: null }])); return 'ok'; })()`);
  await nav("#/sukses/RSD-SALIN1");
  await sleep(800);
  await cx("F66-salin-light", `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Salin')`);
  await nav("#/game/mobile-legends");
  await cx("F67-link-userid-light", `document.querySelector('.hint-link')`);
  await nav("#/");
  await cx("F68-lihat-semua-light", `document.querySelector('.sec-head .more')`);
  await evalJs(`(() => { localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-VOUCHER1', kind: 'voucher', product: 'Voucher Google Play', item: 'Saldo 50.000', qty: 1, target: 'nama@email.com', base: 55000, fee: 0, disc: 0, total: 55000, method: 'QRIS', time: Date.now(), status: 'Selesai', email: 'nama@email.com', wa: '', token: null }])); return 'ok'; })()`);
  await nav("#/sukses/RSD-VOUCHER1");
  await sleep(800);
  await cx("F69-catatan-sukses-light", `[...document.querySelectorAll('.note')].find((n) => /Kode voucher dikirim/.test(n.textContent))`);
  await nav("#/data/telkomsel");
  await sleep(800);
  await cx("F70-meta-paket-light", `document.querySelector('.nom .n-meta')`);
  await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]').click(); return 'ok'; })()`);
  await sleep(500);
  await nav("#/pln");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
  await sleep(300);
  await cx("F65-cekNama-dark", `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek Nama')`);
  await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]').click(); return 'ok'; })()`);
  await sleep(400);

  // F71-76 keyboard
  await nav("#/emoney/dana");
  await safe("F71-enter-hp-emoney", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); document.querySelector('#hp').focus(); return 'ok'; })()`);
    await pressKey("Enter", "Enter", 13);
    return { fokusSesudah: await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, kelas: a?.className, teks: a?.textContent?.trim().slice(0, 30) }; })()`) };
  });
  await nav("#/game/valorant");
  await safe("F72-enter-riot", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#riot'), 'Nama#TAG12'); document.querySelector('#riot').focus(); return 'ok'; })()`);
    await pressKey("Enter", "Enter", 13);
    return { fokusSesudah: await evalJs(`(() => { const a = document.activeElement; return { id: a?.id, tag: a?.tagName }; })()`), hash: await evalJs(`location.hash`) };
  });
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(() => { [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('3 Diamonds')).click(); return 'ok'; })()`);
  await sleep(300);
  await safe("F73-space-pay", async () => {
    await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === 'QRIS').focus(); return 'ok'; })()`);
    await pressKey(" ", "Space", 32);
    return { terpilih: await evalJs(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.querySelector('.p-name2')?.textContent.trim() === 'QRIS'); return { kelasOn: p.classList.contains('on'), ariaPressed: p.getAttribute('aria-pressed') }; })()`) };
  });
  await seedOrders(2);
  await nav("#/cek");
  await safe("F74-space-riwayat", async () => {
    await evalJs(`(() => { document.querySelector('button.sum-row').focus(); return 'ok'; })()`);
    const h0 = await evalJs(`location.hash`);
    await pressKey(" ", "Space", 32);
    await sleep(500);
    return { hashSebelum: h0, hashSesudah: await evalJs(`location.hash`) };
  });
  await nav("#/");
  await safe("F75-enter-flash", async () => {
    await evalJs(`(() => { document.querySelector('#katalog .card').focus(); return 'ok'; })()`);
    const h0 = await evalJs(`location.hash`);
    await pressKey("Enter", "Enter", 13);
    await sleep(600);
    return { hashSebelum: h0, hashSesudah: await evalJs(`location.hash`) };
  });
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await safe("F76-pakai-focus-visible", async () => {
    const o = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Pakai'); if (!b) return null; b.focus({ focusVisible: true }); const cs = getComputedStyle(b); return { outline: cs.outline, outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor }; })()`);
    return o;
  });

  // H85-89 deep link (query string sebelum hash — bentuk baku deep link)
  await safe("H85-metode-qris-kecil", async () => { await evalJs(`location.assign(${JSON.stringify(baseUrl + "?metode=qris#/game/mobile-legends")}); 'ok'`); await sleep(2200); return { hash: await evalJs(`location.hash`), payTerpilih: await evalJs(`document.querySelector('.pay.on .p-name2')?.textContent.trim() || null`) }; });
  await safe("H86-uid", async () => { await evalJs(`location.assign(${JSON.stringify(baseUrl + "?uid=12345678#/game/mobile-legends")}); 'ok'`); await sleep(2200); return { uid: await evalJs(`document.querySelector('#uid')?.value || null`) }; });
  await safe("H87-zone", async () => { await evalJs(`location.assign(${JSON.stringify(baseUrl + "?zone=1234#/game/mobile-legends")}); 'ok'`); await sleep(2200); return { zone: await evalJs(`document.querySelector('#zone')?.value || null`) }; });
  await safe("H88-game-param", async () => { await evalJs(`location.assign(${JSON.stringify(baseUrl + "?game=mobile-legends#/")}); 'ok'`); await sleep(2200); return { hash: await evalJs(`location.hash`), h1: await evalJs(`document.querySelector('h1')?.textContent || null`) }; });
  await safe("H89-qty10-metode", async () => { await evalJs(`location.assign(${JSON.stringify(baseUrl + "?qty=10&metode=QRIS#/game/mobile-legends")}); 'ok'`); await sleep(2200); return { hash: await evalJs(`location.hash`), uid: await evalJs(`document.querySelector('#uid')?.value || null`), payTerpilih: await evalJs(`document.querySelector('.pay.on .p-name2')?.textContent.trim() || null`) }; });

  // H91 jaringan Pulsa
  await nav("#/pulsa/telkomsel");
  await reload();
  await safe("H91-net-pulsa", () => evalJs(`(() => { const res = performance.getEntriesByType('resource').map((e) => e.name); const dups = res.filter((u, i) => res.indexOf(u) !== i); return { jumlah: res.length, duplikat: [...new Set(dups)], daftar: res.map((u) => u.replace(/^https?:\\/\\/[^/]+/, '')) }; })()`));

  // H92: hapus semua riwayat (via storage — tidak ada tombol hapus di UI) + refresh
  await seedOrders(3);
  await nav("#/cek");
  await safe("H92-hapus-semua-refresh", async () => {
    const sebelum = await evalJs(`document.querySelectorAll('button.sum-row').length`);
    await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);
    await reload();
    await nav("#/cek");
    const sesudah = await evalJs(`({ baris: document.querySelectorAll('button.sum-row').length, emptyState: document.querySelector('.step .note')?.textContent.trim().slice(0, 90) || null })`);
    return { barisSebelum: sebelum, sesudah };
  });

  // I99: judul Langkah 2 E-Wallet
  await nav("#/emoney/dana");
  await safe("I99-judul-langkah2-emoney", () => evalJs(`(() => ({ judulLangkah: [...document.querySelectorAll('.step-head h2')].map((h) => h.textContent.trim()) }))()`));
}

if (WIDTH === 415) {
  await setMetrics(415);
  await nav("#/");
  await safe("G77-grid-voucher-415", () => gridInfo(".grid.c3"));
  await safe("G77-kartu-voucher-415", () => evalJs(`(() => { const cards = [...document.querySelectorAll('a.card')].filter((a) => /Google Play|Steam|PlayStation/.test(a.textContent)); return { jumlah: cards.length, kanan: cards.map((c) => Math.round(c.getBoundingClientRect().right)), lebar: cards.map((c) => Math.round(c.getBoundingClientRect().width)) }; })()`));
}
if (WIDTH === 425) {
  await setMetrics(425);
  await nav("#/data");
  await safe("G78-grid-data-425", () => gridInfo(".grid.c3"));
}
if (WIDTH === 432) {
  await setMetrics(432);
  await nav("#/game/mobile-legends");
  await safe("G79-grid-nominal-432", () => gridInfo(".nom-grid"));
}
if (WIDTH === 1080) {
  await setMetrics(1080, 900, false);
  await nav("#/game/mobile-legends");
  await safe("G80-checkout-1080", () => evalJs(`(() => { const f = document.querySelector('.flow'); const cs = getComputedStyle(f); const aside = document.querySelector('.summary'); const ar = aside?.getBoundingClientRect(); return { kolomFlow: cs.gridTemplateColumns, asideTerlihat: !!aside, asideLebar: ar ? Math.round(ar.width) : null, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth }; })()`));
}
if (WIDTH === 1152) {
  await setMetrics(1152, 900, false);
  await nav("#/game/mobile-legends");
  await safe("G81-grid-nominal-1152", () => gridInfo(".nom-grid"));
  await safe("G81-lebar-nom-1152", () => evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; const ws = noms.map((n) => Math.round(n.getBoundingClientRect().width)); return { jumlah: noms.length, lebar: [...new Set(ws)], semuaSama: new Set(ws).size === 1 }; })()`));
}
if (WIDTH === 1360) {
  await setMetrics(1360, 900, false);
  await nav("#/");
  await safe("G82-wrap-1360", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); return { lebarWrap: Math.round(r.width), kiri: Math.round(r.left), kanan: Math.round(window.innerWidth - r.right), terpusat: Math.abs(r.left - (window.innerWidth - r.right)) <= 1 }; })()`));
  // G84: zoom 33% di lebar yang sama
  await safe("G84-zoom33", async () => {
    await send("Emulation.setPageScaleFactor", { pageScaleFactor: 0.33 });
    await sleep(800);
    const g = await gridInfo(".grid.c4");
    const harga = await evalJs(`(() => { const els = [...document.querySelectorAll('.p-from')]; return { jumlah: els.length, meluber: els.filter((e) => e.scrollWidth > e.clientWidth + 1).length, contoh: els.slice(0, 3).map((e) => ({ teks: e.textContent.trim(), sw: e.scrollWidth, cw: e.clientWidth })) }; })()`);
    return { gridGame: g, harga };
  });
}
if (WIDTH === 3840) {
  await setMetrics(3840, 1200, false);
  await nav("#/");
  await safe("G83-wrap-3840", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); return { lebarWrap: Math.round(r.width), kiri: Math.round(r.left), kanan: Math.round(window.innerWidth - r.right), terpusat: Math.abs(r.left - (window.innerWidth - r.right)) <= 1 }; })()`));
}

writeFileSync(`${outDir}/cdp-s459-own-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI-" + WIDTH);
