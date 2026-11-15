// Ukur CDP s466. Berjalan via scripts/cdp-launch-isolated.sh (profil+port sendiri).
// Penggunaan: node scripts/cdp-s466.mjs <wsUrl> <width> <baseUrl> <outDir>
import { mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; console.log(id, JSON.stringify(data)); };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const requests = [];
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } else if (msg.method === "Network.requestWillBeSent") { requests.push({ url: msg.params.request.url, type: msg.params.type }); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const setMetrics = async (w, h = 844, mobile = w < 900) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2000); };
const navFull = async (url) => { await evalJs(`location.assign(${JSON.stringify(url)}); 'ok'`); await sleep(2200); };
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, text) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
const pressKey = async (key, code, vk) => { await keyEvent("keyDown", key, code, vk); await keyEvent("keyUp", key, code, vk); await sleep(300); };
const pressEnter = async () => { await keyEvent("keyDown", "Enter", "Enter", 13, "\r"); await keyEvent("keyUp", "Enter", "Enter", 13); await sleep(400); };
const pressSpace = async () => { await keyEvent("keyDown", " ", "Space", 32, " "); await keyEvent("keyUp", " ", "Space", 32); await sleep(400); };
const pressTab = async () => { await keyEvent("keyDown", "Tab", "Tab", 9); await keyEvent("keyUp", "Tab", "Tab", 9); await sleep(120); };
const setInputVal = async (sel, v) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickSel = async (selJs) => evalJs(`(() => { const el = (${selJs}); if (!el) return 'TIDAK ADA'; el.scrollIntoView({ behavior: 'instant', block: 'center' }); el.click(); return 'ok'; })()`);
const animInfo = (selJs) => evalJs(`(() => { const el = (${selJs}); if (!el) return { ditemukan: false }; const anims = el.getAnimations().map((a) => ({ nama: a.animationName || a.id || '?', durasi: a.effect ? a.effect.getComputedTiming().duration : null, playState: a.playState })); const cs = getComputedStyle(el); return { ditemukan: true, animasiAktif: anims, animationName: cs.animationName, animationDuration: cs.animationDuration }; })()`);
const OVERFLOW_JS = `(() => { const vw = window.innerWidth; const bad = []; document.querySelectorAll('body *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) { const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 40); bad.push({ tag: el.tagName, cls, txt: (el.textContent || '').trim().slice(0, 40), left: +r.left.toFixed(1), right: +r.right.toFixed(1) }); } }); return { innerWidth: vw, scrollWidth: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > vw, pelanggar: bad.slice(0, 12), jumlahPelanggar: bad.length }; })()`;
const gridInfo = async (containerSel, cardSel) => evalJs(`(() => { const c = document.querySelector(${JSON.stringify(containerSel)}); if (!c) return { ditemukan: false }; const cols = getComputedStyle(c).gridTemplateColumns.split(' ').filter(Boolean).length; const cards = [...document.querySelectorAll(${JSON.stringify(cardSel)})]; const vw = window.innerWidth; const clipped = cards.filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 0.5 || r.left < -0.5; }).map((el) => ({ txt: (el.textContent || '').trim().slice(0, 30), right: +el.getBoundingClientRect().right.toFixed(1) })); const prices = [...document.querySelectorAll('.n-price')].map((el) => ({ txt: el.textContent.trim().slice(0, 24), terpotong: el.scrollWidth > el.clientWidth + 1, sw: el.scrollWidth, cw: el.clientWidth })); return { kolom: cols, jumlahKartu: cards.length, kartuTerpotong: clipped, jumlahHargaTerpotong: prices.filter((p) => p.terpotong).length, hargaTerpotong: prices.filter((p) => p.terpotong).slice(0, 6) }; })()`);
const checkoutLayout = async () => evalJs(`(() => { const flow = document.querySelector('.flow'); const aside = document.querySelector('aside'); const step0 = document.querySelector('.step'); if (!flow || !aside) return { ditemukan: false }; const fr = flow.getBoundingClientRect(); const ar = aside.getBoundingClientRect(); const sr = step0 ? step0.getBoundingClientRect() : null; return { flowLebar: +fr.width.toFixed(1), asideTop: +ar.top.toFixed(1), asideLeft: +ar.left.toFixed(1), step0Top: sr ? +sr.top.toFixed(1) : null, step0Bottom: sr ? +sr.bottom.toFixed(1) : null, menumpuk: sr ? ar.top > sr.bottom - 1 : null, gridTemplateColumns: getComputedStyle(flow).gridTemplateColumns }; })()`);

// ---- Seed orders ----
await setMetrics(390, 844, true);
await nav("#/");
await evalJs(`(() => { const mk = (ref, extra) => ({ ref, product: 'Mobile Legends', item: '86 Diamonds', qty: 1, target: '12345678 (1234)', base: 21580, fee: 0, disc: 0, total: 21580, method: 'QRIS', time: Date.now() - 86400000, status: 'Diproses', email: '', wa: '', token: null, ...extra });
const orders = [1,2,3,4,5,6,7].map((i) => mk('RSD-TEST' + String(i).padStart(4, '0'), { time: Date.now() - i * 86400000 }));
orders.unshift(mk('RSD-1234567890ABCDEF', { product: 'Token PLN', item: 'Token 100.000', target: '543210987654', total: 102500, base: 102500, token: '1234 5678 9012 3456 7890', kind: 'pln' }));
orders.unshift(mk('RSD-VOUCHER16CHAR01', { product: 'Voucher Google Play', item: 'Saldo 100.000', target: 'nama@mail.com', total: 110000, base: 110000, kind: 'voucher' }));
orders.unshift(mk('RSD-GENSHIN-EUROPA1', { product: 'Genshin Impact', item: '330 Genesis Crystal', target: '87654321 · Server Eropa', total: 62000, base: 62000, kind: 'game' }));
localStorage.setItem('rosdi_orders', JSON.stringify(orders)); return JSON.parse(localStorage.getItem('rosdi_orders')).length; })()`);

// ---- A1/A12: hint UID & Zone statis, tanpa animasi saat fokus ----
await nav("#/game/mobile-legends");
await safe("A1-hint-uid", () => evalJs(`(() => { const notes = [...document.querySelectorAll('.note')].map((n) => n.textContent); const hint = notes.find((t) => t.includes('Contoh penulisan')); const uid = document.querySelector('#uid'); uid.focus(); const el = [...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Contoh penulisan')); return { hintAdaSebelumFokus: !!hint, hintTeks: hint?.slice(0, 80), animasi: el ? getComputedStyle(el).animationName : null, animasiAktif: el ? el.getAnimations().map((a) => a.animationName) : [] }; })()`));
await safe("A12-hint-zone", () => evalJs(`(() => { const zone = document.querySelector('#zone'); zone.focus(); const el = [...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Zone ID ditulis')); return { ada: !!el, animasi: el ? getComputedStyle(el).animationName : null }; })()`));

// ---- A2: skeleton kartu game Beranda saat muat ----
await safe("A2-skeleton-beranda", async () => { await evalJs(`location.assign(${JSON.stringify(baseUrl + '#/')}); 'ok'`); await sleep(120); const awal = await evalJs(`({ skeleton: !!document.querySelector('.skeleton, [class*="skeleton"], .placeholder, [aria-busy="true"]'), kartuGame: document.querySelectorAll('.grid.c4 .card').length })`); await sleep(1500); const akhir = await evalJs(`({ kartuGame: document.querySelectorAll('.grid.c4 .card').length })`); return { awal, akhir }; });

// ---- A3: Total mobile-bar saat qty diubah ----
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('172 Diamonds'))`);
await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('QRIS'))`);
await sleep(300);
const mbSebelum = await evalJs(`document.querySelector('.mb-total b')?.textContent`);
await evalJs(`document.querySelector('button[aria-label="Tambah"]').click(); 'ok'`);
await sleep(80);
await safe("A3-mb-total-qty", () => animInfo(`document.querySelector('.mb-total b')`));
await safe("A3-mb-total-teks", () => evalJs(`({ sebelum: ${JSON.stringify(mbSebelum)}, sesudah: document.querySelector('.mb-total b')?.textContent, qty: document.querySelector('.qty b')?.textContent })`));

// ---- A4: skeleton riwayat Cek ----
await safe("A4-skeleton-cek", async () => { await evalJs(`location.assign(${JSON.stringify(baseUrl + '#/cek')}); 'ok'`); await sleep(120); const awal = await evalJs(`({ skeleton: !!document.querySelector('.skeleton, [class*="skeleton"]'), barisRiwayat: document.querySelectorAll('button.sum-row').length, animasiHist: getComputedStyle(document.querySelector('.hist-in') || document.body).animationName })`); await sleep(1500); const akhir = await evalJs(`({ barisRiwayat: document.querySelectorAll('button.sum-row').length })`); return { awal, akhir }; });

// ---- A5: ikon panah "Lihat semua" ----
await nav("#/cek");
await safe("A5-lihat-semua", () => evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Lihat semua')); if (!b) return { ditemukan: false }; return { teks: b.textContent.trim(), adaSvg: !!b.querySelector('svg'), adaPanah: /[▾▴▼▲⌄˄]/.test(b.textContent), ariaExpanded: b.getAttribute('aria-expanded'), animasi: getComputedStyle(b).animationName }; })()`));

// ---- A6: tombol Salin di Sukses ----
await nav("#/sukses/RSD-1234567890ABCDEF");
await safe("A6-salin-token", async () => { const sblm = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Salin token')); return b ? { teks: b.textContent, adaSvg: !!b.querySelector('svg'), animasi: getComputedStyle(b).animationName } : { ditemukan: false }; })()`); await clickSel(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Salin token'))`); await sleep(120); const anim = await animInfo(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('disalin'))`); const sesudah = await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('disalin'))?.textContent`); return { sblm, anim, sesudah }; });

// ---- A7: centang promo ----
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await setInputVal('input[aria-label="Kode promo"]', "ROSDI10");
await clickSel(`document.querySelector('.promo-btn[type="submit"]')`);
await sleep(120);
await safe("A7-promo-centang", () => evalJs(`(() => { const msg = [...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Kode ROSDI10')); if (!msg) return { ditemukan: false }; return { teks: msg.textContent, kelas: msg.className, adaIkonCentang: /✓/.test(msg.textContent), animasi: getComputedStyle(msg).animationName, animasiAktif: msg.getAnimations().map((a) => a.animationName) }; })()`));

// ---- A8: skeleton saat ganti game ----
await safe("A8-ganti-game", async () => { const sampel = []; for (let i = 0; i < 6; i++) { await sleep(50); sampel.push(await evalJs(`({ jumlahNom: document.querySelectorAll('.nom').length, skeleton: !!document.querySelector('.skeleton, [class*="skeleton"]') })`)); } await evalJs(`location.assign(${JSON.stringify(baseUrl + '#/game/free-fire')}); 'ok'`); await sleep(60); for (let i = 0; i < 6; i++) { await sleep(50); sampel.push(await evalJs(`({ fase: 'sesudah-nav', jumlahNom: document.querySelectorAll('.nom').length, skeleton: !!document.querySelector('.skeleton, [class*="skeleton"]') })`)); } await sleep(800); const akhir = await evalJs(`({ jumlahNom: document.querySelectorAll('.nom').length, pertama: document.querySelector('.nom .n-name')?.textContent })`); return { sampel, akhir }; });

// ---- A9/A10/A11: animasi pesan error PLN / Riot / WA ----
await nav("#/pln");
await setInputVal("#idpel", "123");
await sleep(300);
await safe("A9-err-pln", () => animInfo(`[...document.querySelectorAll('.note.bad')].find(n => n.textContent.includes('ID pelanggan PLN'))`));
await nav("#/game/valorant");
await setInputVal("#riot", "tanpa-tag");
await sleep(300);
await safe("A10-err-riot", () => animInfo(`[...document.querySelectorAll('.note.bad')].find(n => n.textContent.includes('Riot ID harus'))`));
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await setInputVal("#wa", "08123");
await sleep(300);
await safe("A11-err-wa", () => evalJs(`(() => { const el = [...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Nomor WhatsApp sepertinya')); if (!el) return { ditemukan: false }; return { kelas: el.className, animasi: getComputedStyle(el).animationName, animasiAktif: el.getAnimations().map((a) => a.animationName) }; })()`));

// ---- B spot: query pencarian di UI nyata ----
await nav("#/");
for (const [id, q] of [["B17-ovo500000", "ovo 500000"], ["B19-twilight128", "twilight pass 128"]]) {
  await setInputVal('.searchbar input', q);
  await sleep(400);
  await safe(id, () => evalJs(`({ emptyTampil: !!document.querySelector('.empty'), teksEmpty: document.querySelector('.empty')?.textContent?.slice(0, 80), kartuGame: document.querySelectorAll('.grid.c4 .card').length, kartuLain: document.querySelectorAll('.grid.c3 .card').length })`));
}

// ---- C21-28: validasi di UI ----
await nav("#/game/mobile-legends");
await setInputVal("#zone", "123456789012345678901234567890123");
await sleep(300);
await safe("C21-zone33", () => evalJs(`({ nilaiInput: document.querySelector('#zone').value, panjang: document.querySelector('#zone').value.length, errTampil: !!document.querySelector('#zone-err'), errTeks: document.querySelector('#zone-err')?.textContent })`));
await nav("#/pulsa/telkomsel");
await setInputVal("#hp", "0812345678901234567890123456789012345");
await sleep(300);
await safe("C22-hp37", () => evalJs(`({ panjang: document.querySelector('#hp').value.length, errTampil: !!([...document.querySelectorAll('.note.bad')].find((n) => n.textContent.includes('Nomor HP harus'))), kelasInput: document.querySelector('#hp').className })`));
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await setInputVal("#wa", "0812345678901234567890123456789012");
await sleep(300);
await safe("C23-wa34", () => evalJs(`({ peringatanTampil: !!([...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Nomor WhatsApp sepertinya'))), kelasPeringatan: [...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Nomor WhatsApp sepertinya'))?.className })`));
await nav("#/pln");
await setInputVal("#idpel", "543210987654321098765432109876543210");
await sleep(300);
await safe("C24-pln36", () => evalJs(`({ nilaiInput: document.querySelector('#idpel').value, panjang: document.querySelector('#idpel').value.length, errTampil: !!([...document.querySelectorAll('.note.bad')].find((n) => n.textContent.includes('ID pelanggan PLN'))), tombolCekDisabled: document.querySelector('button[type="submit"]')?.disabled })`));
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await setInputVal("#email", "a".repeat(61) + "@mail.com");
await sleep(300);
await safe("C25-email61", () => evalJs(`({ peringatanTampil: !!([...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Format email sepertinya'))), kelasInput: document.querySelector('#email').className })`));
await setInputVal("#email", "a".repeat(67) + "@mail.com");
await sleep(300);
await safe("C26-email67", () => evalJs(`({ peringatanTampil: !!([...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Format email sepertinya'))), kelasInput: document.querySelector('#email').className })`));
await setInputVal("#email", "nama@" + "d".repeat(63) + ".com");
await sleep(300);
await safe("C27-domain63", () => evalJs(`({ peringatanTampil: !!([...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Format email sepertinya'))), kelasInput: document.querySelector('#email').className })`));
await nav("#/cek");
await setInputVal('input[aria-label="Nomor transaksi"]', "RSD-A1B2C3");
await clickSel(`document.querySelector('form button[type="submit"]')`);
await sleep(500);
await safe("C28-order-campur", () => evalJs(`({ notFoundTampil: !!([...document.querySelectorAll('.note.bad')].find((n) => n.textContent.includes('tidak ditemukan'))), hasilTampil: !!document.querySelector('.cek-result'), hash: location.hash })`));

// ---- D29-35: total UI vs hitungan ----
const bacaTotal = async () => evalJs(`(() => { const total = document.querySelector('.sum-total b')?.textContent; const mb = document.querySelector('.mb-total b')?.textContent; const disc = [...document.querySelectorAll('.sum-row.disc b')].map((b) => b.textContent); const payRows = [...document.querySelectorAll('.pay')].map((p) => ({ nama: p.querySelector('.p-name2')?.textContent, harga: p.querySelector('.p-price')?.textContent?.replace(/\\s+/g, ' ').trim() })); return { totalRingkasan: total, totalMobileBar: mb, diskon: disc, payRows: payRows.filter((r) => r.nama) }; })()`);
const alurGame = async (nominal, promo, payNama) => { await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes(${JSON.stringify(nominal)}))`); if (promo) { await setInputVal('input[aria-label="Kode promo"]', promo); await clickSel(`document.querySelector('.promo-btn[type="submit"]')`); await sleep(300); } await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes(${JSON.stringify(payNama)}))`); await sleep(400); };
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await alurGame("59 Diamonds", "ROSDI10", "QRIS");
await safe("D29-ui", bacaTotal);
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await alurGame("257 Diamonds", "GAMER5", "DANA");
await safe("D30-ui", bacaTotal);
await nav("#/voucher/steam-wallet");
await setInputVal("#vemail", "nama@mail.com");
await alurGame("Steam Wallet 400.000", "ROSDI10", "BCA Virtual Account");
await safe("D31-ui", bacaTotal);
await nav("#/data/telkomsel");
await setInputVal("#hp", "081234567890");
await alurGame("Internet Sakti 30GB", "GAMER5", "GoPay");
await safe("D32-ui", bacaTotal);
await nav("#/data/xl");
await setInputVal("#hp", "081812345678");
await alurGame("Xtra Combo 10GB", "ROSDI10", "QRIS");
await safe("D33-ui", bacaTotal);
await nav("#/data/indosat");
await setInputVal("#hp", "081512345678");
await alurGame("Freedom Internet 16GB", "GAMER5", "QRIS");
await safe("D34-ui", bacaTotal);
await nav("#/data/byu");
await setInputVal("#hp", "085112345678");
await alurGame("Kuota by.U 100GB", "ROSDI10", "DANA");
await safe("D35-ui", bacaTotal);

// ---- F44/46/47: keyboard di halaman Sukses ----
await nav("#/sukses/RSD-1234567890ABCDEF");
await safe("F44-enter-belanja-lagi", async () => { await evalJs(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Belanja Lagi'))?.focus(); 'ok'`); const sblm = await evalJs(`location.hash`); await pressEnter(); const sesudah = await evalJs(`location.hash`); return { sebelum: sblm, sesudah, pindah: sblm !== sesudah }; });
await nav("#/sukses/RSD-1234567890ABCDEF");
await safe("F46-enter-salin", async () => { await evalJs(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Salin token'))?.focus(); 'ok'`); await pressEnter(); await sleep(300); const teks = await evalJs(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('disalin'))?.textContent || [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Salin token'))?.textContent`); return { teksSesudah: teks }; });
await nav("#/sukses/RSD-1234567890ABCDEF");
await safe("F47-space-belanja-lagi", async () => { await evalJs(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Belanja Lagi'))?.focus(); 'ok'`); const sblm = await evalJs(`location.hash`); await pressSpace(); const sesudah = await evalJs(`location.hash`); return { sebelum: sblm, sesudah, pindah: sblm !== sesudah }; });

// ---- F45: ArrowUp/Down di grid nominal ----
await nav("#/game/mobile-legends");
await safe("F45-arrow-grid", async () => { await evalJs(`document.querySelectorAll('.nom')[4]?.focus(); 'ok'`); const sblm = await evalJs(`[...document.querySelectorAll('.nom')].indexOf(document.activeElement)`); await pressKey("ArrowDown", "ArrowDown", 40); const sesudahBawah = await evalJs(`[...document.querySelectorAll('.nom')].indexOf(document.activeElement)`); await pressKey("ArrowUp", "ArrowUp", 38); const sesudahAtas = await evalJs(`[...document.querySelectorAll('.nom')].indexOf(document.activeElement)`); return { fokusAwal: sblm, sesudahArrowDown: sesudahBawah, sesudahArrowUp: sesudahAtas }; });

// ---- F48: Home/End di tab game ----
await safe("F48-homeend-tab", async () => { await evalJs(`document.querySelectorAll('.tab')[1]?.focus(); 'ok'`); const sblm = await evalJs(`[...document.querySelectorAll('.tab')].indexOf(document.activeElement)`); await pressKey("End", "End", 35); const sesudahEnd = await evalJs(`[...document.querySelectorAll('.tab')].indexOf(document.activeElement)`); await pressKey("Home", "Home", 36); const sesudahHome = await evalJs(`[...document.querySelectorAll('.tab')].indexOf(document.activeElement)`); return { fokusAwal: sblm, sesudahEnd, sesudahHome }; });

// ---- F49: Tab-walk ke input nomor order ----
await nav("#/cek");
await safe("F49-focus-order", async () => { for (let i = 0; i < 90; i++) { const hit = await evalJs(`(() => { const el = document.activeElement; if (!el || el.getAttribute('aria-label') !== 'Nomor transaksi') return null; const cs = getComputedStyle(el); return { tabKe: ${i}, tag: el.tagName, outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, outlineOffset: cs.outlineOffset, focusVisible: el.matches(':focus-visible') }; })()`); if (hit) return { ditemukan: true, ...hit }; await pressTab(); } return { ditemukan: false, aktifTerakhir: await evalJs(`document.activeElement ? document.activeElement.tagName + ' :: ' + (document.activeElement.textContent || '').trim().slice(0, 30) : null`) }; });

// ---- G50: rotasi di halaman Sukses ----
await nav("#/sukses/RSD-1234567890ABCDEF");
await setMetrics(390, 844, true);
await sleep(600);
const suksesPotret = await evalJs(`(() => { const c = document.querySelector('.step.success-in'); const r = c.getBoundingClientRect(); return { lebar: +r.width.toFixed(1), kanan: +r.right.toFixed(1), viewport: window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth }; })()`);
await setMetrics(844, 390, true);
await sleep(600);
const suksesLanskap = await evalJs(`(() => { const c = document.querySelector('.step.success-in'); const r = c.getBoundingClientRect(); return { lebar: +r.width.toFixed(1), kanan: +r.right.toFixed(1), viewport: window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth, tombolTerlihat: [...document.querySelectorAll('.step.success-in button')].map((b) => { const x = b.getBoundingClientRect(); return { teks: b.textContent.trim().slice(0, 20), dalamViewport: x.right <= window.innerWidth + 0.5 && x.left >= -0.5 }; }) }; })()`);
rec("G50-rotasi-sukses", { potret: suksesPotret, lanskap: suksesLanskap });
await setMetrics(390, 844, true);

// ---- G51-60: lebar viewport ----
const ukurLebar = async (id, w, halaman, mode) => { await setMetrics(w, 844, w < 900); await nav(halaman); await sleep(600); if (mode === "game") await safe(id, () => gridInfo(".grid.c4", ".grid.c4 .card")); else if (mode === "nom") await safe(id, () => gridInfo(".nom-grid", ".nom")); else if (mode === "checkout") await safe(id, async () => ({ layout: await checkoutLayout(), overflow: await evalJs(OVERFLOW_JS) })); };
await ukurLebar("G51-335-beranda", 335, "#/", "game");
await ukurLebar("G52-355-beranda", 355, "#/", "game");
await ukurLebar("G53-385-nominal", 385, "#/game/mobile-legends", "nom");
await ukurLebar("G54-395-nominal", 395, "#/game/mobile-legends", "nom");
await ukurLebar("G55-405-beranda", 405, "#/", "game");
await ukurLebar("G56-435-beranda", 435, "#/", "game");
await ukurLebar("G57-455-nominal", 455, "#/game/mobile-legends", "nom");
await ukurLebar("G58-465-checkout", 465, "#/game/mobile-legends", "checkout");
await ukurLebar("G59-485-checkout", 485, "#/game/mobile-legends", "checkout");
await ukurLebar("G60-505-beranda", 505, "#/", "game");

// ---- G61-64: zoom (layout viewport menyusut: lebar CSS = 390/zoom) ----
const ukurZoom = async (id, z, halaman, mode) => { const w = Math.round(390 / (z / 100)); const h = Math.round(844 / (z / 100)); await setMetrics(w, h, true); await nav(halaman); await sleep(600); if (mode === "game") await safe(id, async () => ({ lebarCss: w, ...(await gridInfo(".grid.c4", ".grid.c4 .card")) })); else await safe(id, async () => ({ lebarCss: w, ...(await gridInfo(".nom-grid", ".nom")) })); };
await ukurZoom("G61-zoom155-beranda", 155, "#/", "game");
await ukurZoom("G62-zoom170-nominal", 170, "#/game/mobile-legends", "nom");
await ukurZoom("G63-zoom185-beranda", 185, "#/", "game");
await ukurZoom("G64-zoom195-nominal", 195, "#/game/mobile-legends", "nom");
await setMetrics(390, 844, true);

// ---- H65-74: deep link query (sebelum hash — App hanya baca hash) ----
const cekDeepLink = async (id, url, baca) => { await navFull(url); await safe(id, baca); };
await cekDeepLink("H65-zone-abcd", baseUrl + "?zone=abcd#/game/mobile-legends", () => evalJs(`({ zone: document.querySelector('#zone')?.value, errTampil: !!document.querySelector('#zone-err') })`));
await cekDeepLink("H66-nominal-abc", baseUrl + "?nominal=abc#/game/mobile-legends", () => evalJs(`({ nominalTerpilih: document.querySelectorAll('.nom.on').length, halamanJalan: !!document.querySelector('.nom-grid') })`));
await cekDeepLink("H67-nominal-neg", baseUrl + "?nominal=-100#/game/mobile-legends", () => evalJs(`({ nominalTerpilih: document.querySelectorAll('.nom.on').length, halamanJalan: !!document.querySelector('.nom-grid') })`));
await cekDeepLink("H68-qty6", baseUrl + "?qty=6#/game/mobile-legends", () => evalJs(`({ qty: document.querySelector('.qty b')?.textContent })`));
await cekDeepLink("H69-qty7", baseUrl + "?qty=7#/game/mobile-legends", () => evalJs(`({ qty: document.querySelector('.qty b')?.textContent })`));
await cekDeepLink("H70-qty8", baseUrl + "?qty=8#/game/mobile-legends", () => evalJs(`({ qty: document.querySelector('.qty b')?.textContent })`));
await cekDeepLink("H71-qty9", baseUrl + "?qty=9#/game/mobile-legends", () => evalJs(`({ qty: document.querySelector('.qty b')?.textContent })`));
await cekDeepLink("H73-tab-operator", baseUrl + "?tab=pulsa&operator=xl#/pulsa", () => evalJs(`({ judul: document.querySelector('.crumb h1')?.textContent, kartuOperator: document.querySelectorAll('.grid .card').length })`));
await cekDeepLink("H74-promo-metode", baseUrl + "?promo=ROSDI10&metode=QRIS#/game/mobile-legends", () => evalJs(`({ promoAktif: !!document.querySelector('.sum-row.disc'), metodeTerpilih: document.querySelectorAll('.pay.on').length })`));

// ---- H72: jumlah request saat muat Paket Data ----
await safe("H72-request-data", async () => { requests.length = 0; await evalJs(`location.hash = '#/data'; location.reload(); 'ok'`); await sleep(3500); const byType = {}; const domains = new Set(); for (const r of requests) { byType[r.type || 'lain'] = (byType[r.type || 'lain'] || 0) + 1; try { domains.add(new URL(r.url).host); } catch {} } return { total: requests.length, byType, domains: [...domains], contohLuar: requests.filter((r) => !r.url.includes('127.0.0.1')).map((r) => r.url).slice(0, 8) }; });

// ---- H97: request saat ganti tab game ----
await nav("#/game/mobile-legends");
await sleep(500);
await safe("H97-request-ganti-tab", async () => { requests.length = 0; await clickSel(`[...document.querySelectorAll('.tab')].find(t => t.textContent.includes('Weekly Pass'))`); await sleep(800); const sesudah = requests.length; await clickSel(`[...document.querySelectorAll('.tab')].find(t => t.textContent.includes('Diamonds'))`); await sleep(800); return { requestSaatGantiTabKeWeekly: sesudah, totalDuaKaliGanti: requests.length, contoh: requests.map((r) => r.url).slice(0, 5) }; });

// ---- J78-88: what-if pengguna & alur ----
await safe("J78-ganti-game-tengah-checkout", async () => { await nav("#/game/mobile-legends"); await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234"); await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('86 Diamonds'))`); await evalJs(`location.assign(${JSON.stringify(baseUrl + '#/game/free-fire')}); 'ok'`); await sleep(1500); return await evalJs(`({ uid: document.querySelector('#uid')?.value, nominalTerpilih: document.querySelectorAll('.nom.on').length, judul: document.querySelector('.crumb h1')?.textContent })`); });
await safe("J79-beli-dua-kali", async () => { const beli = async () => { await nav("#/game/mobile-legends"); await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234"); await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('86 Diamonds'))`); await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('QRIS'))`); await sleep(300); await clickSel(`document.querySelector('.mobile-bar .btn')`); await sleep(800); return await evalJs(`location.hash`); }; const h1 = await beli(); const h2 = await beli(); const orders = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders')).slice(0, 4).map((o) => o.ref)`); return { hash1: h1, hash2: h2, refBerbeda: h1 !== h2, orderTerdepan: orders, jumlahOrder: await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders')).length`) }; });
await safe("J80-promo-hapus-pakai-lagi", async () => { await nav("#/game/mobile-legends"); await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234"); await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('86 Diamonds'))`); await setInputVal('input[aria-label="Kode promo"]', "ROSDI10"); await clickSel(`document.querySelector('.promo-btn[type="submit"]')`); await sleep(300); const disc1 = await evalJs(`document.querySelector('.sum-row.disc b')?.textContent`); await clickSel(`[...document.querySelectorAll('.promo-btn')].find(b => b.textContent.trim() === 'Hapus')`); await sleep(200); const setelahHapus = await evalJs(`({ adaDisc: !!document.querySelector('.sum-row.disc'), adaHapus: !!([...document.querySelectorAll('.promo-btn')].find((b) => b.textContent.trim() === 'Hapus')) })`); await setInputVal('input[aria-label="Kode promo"]', "ROSDI10"); await clickSel(`document.querySelector('.promo-btn[type="submit"]')`); await sleep(300); const disc2 = await evalJs(`document.querySelector('.sum-row.disc b')?.textContent`); const pesan = await evalJs(`[...document.querySelectorAll('.note')].find((n) => n.textContent.includes('Kode ROSDI10'))?.textContent`); return { disc1, setelahHapus, disc2, pesan, diterapkanLagi: disc1 === disc2 && !!disc2 }; });
await safe("J81-ganti-metode-setelah-promo", async () => { await nav("#/game/mobile-legends"); await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234"); await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('172 Diamonds'))`); await setInputVal('input[aria-label="Kode promo"]', "ROSDI10"); await clickSel(`document.querySelector('.promo-btn[type="submit"]')`); await sleep(200); await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('QRIS'))`); await sleep(300); const qris = await evalJs(`({ disc: document.querySelector('.sum-row.disc b')?.textContent, total: document.querySelector('.sum-total b')?.textContent })`); await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('BCA Virtual Account'))`); await sleep(300); const bca = await evalJs(`({ disc: document.querySelector('.sum-row.disc b')?.textContent, total: document.querySelector('.sum-total b')?.textContent })`); return { qris, bca, discTetap: qris.disc === bca.disc }; });
await safe("J82-qty-lalu-ganti-nominal", async () => { await nav("#/game/mobile-legends"); await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234"); await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('86 Diamonds'))`); for (let i = 0; i < 9; i++) await evalJs(`document.querySelector('button[aria-label="Tambah"]').click(); 'ok'`); await sleep(200); const qtySblm = await evalJs(`document.querySelector('.qty b')?.textContent`); await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('172 Diamonds'))`); await sleep(300); const qtySesudah = await evalJs(`document.querySelector('.qty b')?.textContent`); return { qtySebelumGantiNominal: qtySblm, qtySesudahGantiNominal: qtySesudah }; });
await safe("J83-modal-masuk-tutup", async () => { await nav("#/game/mobile-legends"); await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('86 Diamonds'))`); await sleep(200); await clickSel(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Masuk')`); await sleep(400); const modalAda = await evalJs(`!!document.querySelector('.modal')`); await clickSel(`[...document.querySelectorAll('.modal button')].find(b => b.textContent.includes('Siap'))`); await sleep(300); const nominal = await evalJs(`document.querySelectorAll('.nom.on').length`); return { modalAda, nominalTetapTerpilih: nominal }; });
await safe("J84-hapus-nomor-hp-total", async () => { await nav("#/pulsa/telkomsel"); await setInputVal("#hp", "081234567890"); await sleep(300); const sblm = await evalJs(`({ deteksi: [...document.querySelectorAll('.note.good')].find((n) => n.textContent.includes('Operator terdeteksi'))?.textContent, jumlahNom: document.querySelectorAll('.nom').length })`); await setInputVal("#hp", ""); await sleep(300); const sesudah = await evalJs(`({ deteksi: !!([...document.querySelectorAll('.note.good')].find((n) => n.textContent.includes('Operator terdeteksi'))), jumlahNom: document.querySelectorAll('.nom').length, catatan: [...document.querySelectorAll('.note')].map((n) => n.textContent.slice(0, 50)) })`); return { sblm, sesudah }; });
await safe("J85-cek-dua-kali", async () => { await nav("#/cek"); await setInputVal('input[aria-label="Nomor transaksi"]', "RSD-TEST0001"); await evalJs(`(() => { const b = document.querySelector('form button[type="submit"]'); b.click(); b.click(); return 'ok'; })()`); await sleep(600); return await evalJs(`({ jumlahHasil: document.querySelectorAll('.cek-result').length, refTampil: document.querySelector('.cek-result')?.textContent?.includes('RSD-TEST0001'), fokusKeHasil: document.activeElement?.classList?.contains('cek-result') })`); });
await safe("J86-email-antar-halaman", async () => { await nav("#/game/mobile-legends"); await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234"); await setInputVal("#email", "nama@mail.com"); await sleep(200); await nav("#/pulsa/telkomsel"); await sleep(800); return await evalJs(`({ emailDiPulsa: document.querySelector('#email')?.value, waDiPulsa: document.querySelector('#wa')?.value })`); });
await safe("J87-server-di-riwayat", async () => { await nav("#/cek"); await sleep(800); return await evalJs(`(() => { const baris = [...document.querySelectorAll('button.sum-row')].find((b) => b.textContent.includes('RSD-GENSHIN-EUROPA1')); if (!baris) return { barisDitemukan: false }; const teks = baris.textContent; return { barisDitemukan: true, teksBaris: teks.slice(0, 120), serverDiBaris: teks.includes('Eropa'), uidDiBaris: teks.includes('87654321') }; })()`); });
await safe("J87b-server-di-detail-cek", async () => { await setInputVal('input[aria-label="Nomor transaksi"]', "RSD-GENSHIN-EUROPA1"); await clickSel(`document.querySelector('form button[type="submit"]')`); await sleep(600); return await evalJs(`(() => { const hasil = document.querySelector('.cek-result'); if (!hasil) return { hasil: false }; const tujuan = [...hasil.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan')); return { tujuanTampil: tujuan?.textContent, serverDiDetail: tujuan?.textContent.includes('Eropa') }; })()`); });
await safe("J88-pindah-operator-lewat-indeks", async () => { await nav("#/pulsa/telkomsel"); await setInputVal("#hp", "081234567890"); await sleep(300); await evalJs(`location.assign(${JSON.stringify(baseUrl + '#/pulsa/indosat')}); 'ok'`); await sleep(1500); return await evalJs(`({ hpDiIndosat: document.querySelector('#hp')?.value, judul: document.querySelector('.crumb h1')?.textContent, adaCatatanMismatch: !!([...document.querySelectorAll('.note.bad')].find((n) => n.textContent.includes('terdeteksi sebagai')))})`); });

// ---- K89-94: teks ekstrem ----
await setMetrics(335, 844, true);
await nav("#/data/byu");
await sleep(800);
await safe("K89-meta-panjang-335", () => evalJs(`(() => { const kartu = [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('Unlimited by.U 30 Hari')); if (!kartu) return { ditemukan: false }; const meta = kartu.querySelector('.n-meta'); const r = meta.getBoundingClientRect(); return { metaTeks: meta.textContent, baris: Math.round(r.height / parseFloat(getComputedStyle(meta).lineHeight)), meluber: meta.scrollWidth > meta.clientWidth + 1, overflowHalaman: document.documentElement.scrollWidth > window.innerWidth }; })()`));
await setMetrics(390, 844, true);
await nav("#/cek");
await sleep(800);
await safe("K90-nomor-order-20kar", () => evalJs(`(() => { const baris = [...document.querySelectorAll('button.sum-row')].find((b) => b.textContent.includes('RSD-1234567890ABCDEF')); if (!baris) return { ditemukan: false }; const span = baris.querySelector('span'); const r = span.getBoundingClientRect(); return { ref: 'RSD-1234567890ABCDEF', panjang: 20, spanLebar: +r.width.toFixed(1), spanKanan: +r.right.toFixed(1), viewport: window.innerWidth, meluber: span.scrollWidth > span.clientWidth + 1, barisOverflow: document.documentElement.scrollWidth > window.innerWidth }; })()`));
await setMetrics(335, 844, true);
await nav("#/sukses/RSD-1234567890ABCDEF");
await sleep(800);
await safe("K91-token-335", () => evalJs(`(() => { const t = document.querySelector('.token-box'); if (!t) return { ditemukan: false }; return { token: t.textContent, clientWidth: t.clientWidth, scrollWidth: t.scrollWidth, meluber: t.scrollWidth > t.clientWidth + 1, overflowHalaman: document.documentElement.scrollWidth > window.innerWidth }; })()`));
await setMetrics(1280, 900, false);
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('86 Diamonds'))`);
await setInputVal("#email", "a".repeat(54) + "@mail.com");
await sleep(300);
await safe("K92-email-64-di-ringkasan", () => evalJs(`(() => { const aside = document.querySelector('aside'); const teksAside = aside ? aside.textContent : ''; return { email64: 'a'.repeat(54) + '@mail.com', emailTampilDiRingkasan: teksAside.includes('a'.repeat(54)), adaBarisEmail: [...document.querySelectorAll('.sum-row')].some((r) => r.textContent.includes('Bukti') || r.textContent.includes('Email')), barisRingkasan: [...document.querySelectorAll('aside .sum-row span')].map((s) => s.textContent) }; })()`));
await setMetrics(390, 844, true);
await nav("#/sukses/RSD-VOUCHER16CHAR01");
await sleep(800);
await safe("K93-kode-voucher-16kar", () => evalJs(`(() => { const teks = document.body.innerText; return { kodeVoucherTampil: /[A-Z0-9]{16}/.test(teks.replace(/RSD-VOUCHER16CHAR01/g, '')), catatanKode: [...document.querySelectorAll('.note')].map((n) => n.textContent).find((t) => t.includes('voucher')), adaKode16: teks.includes('VOUCHER') }; })()`));
await nav("#/");
await sleep(800);
await safe("K94-judul-modal-390", async () => { await evalJs(`[...document.querySelectorAll('footer .flink')].find((b) => b.textContent.includes('Kebijakan Pengembalian'))?.click(); 'ok'`); await sleep(500); return await evalJs(`(() => { const h = document.querySelector('.modal h3'); if (!h) return { ditemukan: false }; const r = h.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(h).lineHeight); return { judulAktual: h.textContent, baris: Math.round(r.height / lh), lebarJudul: +r.width.toFixed(1), viewport: window.innerWidth, meluber: h.scrollWidth > h.clientWidth + 1 }; })()`); });

console.log("SELESAI-S466");
process.exit(0);
