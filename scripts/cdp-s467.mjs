// Ukur CDP s467. Berjalan via scripts/cdp-launch-s467.sh.
// Penggunaan: node scripts/cdp-s467.mjs <wsUrl> <width> <baseUrl> <outDir> [mode]
import { mkdirSync, writeFileSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir, modeArg] = process.argv.slice(2);
const WIDTH = +wArg;
const MODE = modeArg || "main";
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
const gridInfo = async (containerSel, cardSel) => evalJs(`(() => {
  const c = document.querySelector(${JSON.stringify(containerSel)}); if (!c) return { ditemukan: false };
  const cols = getComputedStyle(c).gridTemplateColumns.split(' ').filter(Boolean).length;
  const cards = [...document.querySelectorAll(${JSON.stringify(cardSel)})];
  const vw = window.innerWidth;
  const clipped = cards.filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 0.5 || r.left < -0.5; }).map((el) => ({ txt: (el.textContent || '').trim().slice(0, 30), right: +el.getBoundingClientRect().right.toFixed(1) }));
  const prices = [...document.querySelectorAll('.n-price')].map((el) => ({ txt: el.textContent.trim().slice(0, 24), terpotong: el.scrollWidth > el.clientWidth + 1, sw: el.scrollWidth, cw: el.clientWidth }));
  return { kolom: cols, jumlahKartu: cards.length, kartuTerpotong: clipped, jumlahHargaTerpotong: prices.filter((p) => p.terpotong).length, hargaTerpotong: prices.filter((p) => p.terpotong).slice(0, 6) };
})()`);
const checkoutLayout = async () => evalJs(`(() => {
  const flow = document.querySelector('.flow'); const aside = document.querySelector('aside'); const step0 = document.querySelector('.step');
  if (!flow || !aside) return { ditemukan: false };
  const fr = flow.getBoundingClientRect(); const ar = aside.getBoundingClientRect(); const sr = step0 ? step0.getBoundingClientRect() : null;
  return { flowLebar: +fr.width.toFixed(1), asideTop: +ar.top.toFixed(1), asideLeft: +ar.left.toFixed(1), step0Top: sr ? +sr.top.toFixed(1) : null, step0Bottom: sr ? +sr.bottom.toFixed(1) : null, menumpuk: sr ? ar.top > sr.bottom - 1 : null, gridTemplateColumns: getComputedStyle(flow).gridTemplateColumns };
})()`);
const tabWalkTo = async (testFnJs, maxTabs = 90) => {
  for (let i = 0; i < maxTabs; i++) {
    const hit = await evalJs(`(() => { const el = document.activeElement; if (!el) return null; const test = (${testFnJs}); if (!test(el)) return null; const cs = getComputedStyle(el); return { tabKe: ${i}, tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), teks: (el.textContent || '').trim().slice(0, 40), outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, outlineOffset: cs.outlineOffset, focusVisible: el.matches(':focus-visible') }; })()`);
    if (hit) return { ditemukan: true, ...hit };
    await pressTab();
  }
  const last = await evalJs(`(() => { const el = document.activeElement; return el ? el.tagName + '.' + (el.className || '').toString().slice(0, 50) + ' :: ' + (el.textContent || '').trim().slice(0, 30) : null; })()`);
  return { ditemukan: false, aktifTerakhir: last };
};
// Kontras dari warna computed (rgb) — verifikasi runtime atas hitungan token
const contrastOf = async (fgJs, bgJs) => evalJs(`(() => {
  const fg = (${fgJs}); const bg = (${bgJs});
  const parse = (s) => { const m = s.match(/(\\d+(?:\\.\\d+)?)/g); return m ? m.slice(0, 3).map(Number) : null; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const a = parse(fg), b = parse(bg); if (!a || !b) return { fg, bg, rasio: null };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return { fg, bg, rasio: Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100 };
})()`);

// ---- Seed orders (profil CDP terisolasi; 7 baris agar toggle "Lihat semua" muncul) ----
await setMetrics(390, 844, true);
await nav("#/");
await evalJs(`(() => { const mk = (ref, extra) => ({ ref, product: 'Mobile Legends', item: '86 Diamonds', qty: 1, target: '12345678 (1234)', base: 21580, fee: 0, disc: 0, total: 21580, method: 'QRIS', time: Date.now() - 86400000, status: 'Diproses', email: '', wa: '', token: null, ...extra });
const orders = [1,2,3,4,5,6,7].map((i) => mk('RSD-TEST' + String(i).padStart(4, '0'), { time: Date.now() - i * 86400000 }));
localStorage.setItem('rosdi_orders', JSON.stringify(orders)); return JSON.parse(localStorage.getItem('rosdi_orders')).length; })()`);

// ================= A. Animasi =================
// A1/A3/A4/A5: skeleton saat muat pertama (sampling 120ms setelah navigasi)
const skeletonCheck = async (id, hash, kartuSel) => {
  await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`);
  await sleep(120);
  const awal = await evalJs(`({ skeleton: !!document.querySelector('.skeleton, [class*="skeleton"], .placeholder, [aria-busy="true"]'), kartu: document.querySelectorAll(${JSON.stringify(kartuSel)}).length })`);
  await sleep(1500);
  const akhir = await evalJs(`({ kartu: document.querySelectorAll(${JSON.stringify(kartuSel)}).length })`);
  rec(id, { awal, akhir });
};
await skeletonCheck("A1-skeleton-paket-data", "#/data/telkomsel", ".nom");
await skeletonCheck("A3-skeleton-tagihan", "#/tagihan/pdam", ".nom");
await skeletonCheck("A4-skeleton-voucher", "#/voucher/google-play", ".nom");
await skeletonCheck("A5-skeleton-ewallet", "#/emoney/dana", ".nom");

// A2: animasi pesan error nomor order salah di Cek Transaksi
await nav("#/cek");
await setInputVal('input[aria-label="Nomor transaksi"]', "RSD-SALAH123");
await clickSel(`document.querySelector('form button[type="submit"]')`);
await sleep(150);
await safe("A2-error-order", async () => ({ animasi: await animInfo(`document.querySelector('.note.bad')`), teks: await evalJs(`document.querySelector('.note.bad')?.textContent?.slice(0, 80)`) }));

// A6: qty diketik manual? + animasi Total aside vs mobile-bar saat qty diubah
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('172 Diamonds'))`);
await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('QRIS'))`);
await sleep(300);
await safe("A6-qty-manual", async () => {
  const adaInputQty = await evalJs(`!!document.querySelector('.qty input')`);
  const totalAsideSblm = await evalJs(`document.querySelector('.sum-total b')?.textContent`);
  const totalMbSblm = await evalJs(`document.querySelector('.mb-total b')?.textContent`);
  await evalJs(`document.querySelector('button[aria-label="Tambah"]').click(); 'ok'`);
  await sleep(80);
  const animAside = await animInfo(`document.querySelector('.sum-total b')`);
  const animMb = await animInfo(`document.querySelector('.mb-total b')`);
  const totalAsideSesudah = await evalJs(`document.querySelector('.sum-total b')?.textContent`);
  const totalMbSesudah = await evalJs(`document.querySelector('.mb-total b')?.textContent`);
  return { adaInputQty, totalAsideSblm, totalAsideSesudah, animasiAside: animAside, totalMbSblm, totalMbSesudah, animasiMb: animMb };
});

// A7: beli sungguhan → halaman Sukses (skeleton?)
await safe("A7-sukses", async () => {
  await nav("#/game/mobile-legends");
  await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
  await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('3 Diamonds'))`);
  await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('QRIS'))`);
  await sleep(300);
  await clickSel(`document.querySelector('.mobile-bar .btn')`);
  await sleep(1200);
  const hash = await evalJs(`location.hash`);
  await sleep(120);
  const cek = await evalJs(`({ skeleton: !!document.querySelector('.skeleton, [class*="skeleton"], .placeholder, [aria-busy="true"]'), kartuSukses: !!document.querySelector('.step.success-in'), animasi: (() => { const el = document.querySelector('.step.success-in'); if (!el) return null; return { animasiAktif: el.getAnimations().map((a) => a.animationName), css: getComputedStyle(el).animationName }; })() })`);
  return { hashSesudahBeli: hash, ...cek };
});

// A8: animasi pesan error email voucher tidak valid
await nav("#/voucher/google-play");
await setInputVal("#vemail", "tanpa-at");
await sleep(150);
await safe("A8-error-email-voucher", async () => ({ animasi: await animInfo(`document.querySelector('.note.bad')`), teks: await evalJs(`document.querySelector('.note.bad')?.textContent?.slice(0, 80)`) }));

// A9: animasi pesan error HP E-Wallet tidak valid
await nav("#/emoney/dana");
await setInputVal("#hp", "123");
await sleep(150);
await safe("A9-error-hp-ewallet", async () => ({ animasi: await animInfo(`document.querySelector('.note.bad')`), teks: await evalJs(`document.querySelector('.note.bad')?.textContent?.slice(0, 80)`) }));

// A10: animasi pesan error ID Tagihan tidak valid
await nav("#/tagihan/pdam");
await setInputVal("#billid", "abc");
await sleep(150);
await safe("A10-error-id-tagihan", async () => ({ animasi: await animInfo(`document.querySelector('.note.bad')`), teks: await evalJs(`document.querySelector('.note.bad')?.textContent?.slice(0, 80)`) }));

// ================= D. Harga di UI (39-45) =================
const ukurTriple = async (id, gameId, itemName, promo, payName, target) => {
  await nav(`#/game/${gameId}`);
  if (target.uid) await setInputVal("#uid", target.uid);
  if (target.zone) await setInputVal("#zone", target.zone);
  if (target.riot) await setInputVal("#riot", target.riot);
  await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes(${JSON.stringify(itemName)}))`);
  await setInputVal('input[aria-label="Kode promo"]', promo);
  await clickSel(`document.querySelector('.promo-btn[type="submit"]')`);
  await sleep(300);
  await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes(${JSON.stringify(payName)}))`);
  await sleep(300);
  await safe(id, async () => ({
    totalAside: await evalJs(`document.querySelector('.sum-total b')?.textContent`),
    totalMb: await evalJs(`document.querySelector('.mb-total b')?.textContent`),
    hargaBarisMetode: await evalJs(`[...document.querySelectorAll('.pay.on')].map((p) => p.querySelector('.p-price')?.textContent?.trim())`),
    disc: await evalJs(`document.querySelector('.sum-row.disc b')?.textContent`),
  }));
};
await ukurTriple("D39-mlbb-514-rosdi10-qris", "mobile-legends", "514 Diamonds", "ROSDI10", "QRIS", { uid: "12345678", zone: "1234" });
await ukurTriple("D40-codm-800-gamer5-qris", "cod-mobile", "800 CP", "GAMER5", "QRIS", { uid: "12345678" });
await ukurTriple("D41-valorant-5350-rosdi10-bca", "valorant", "5350 Points", "ROSDI10", "BCA Virtual Account", { riot: "NamaKamu#TAG12" });
await ukurTriple("D42-wildrift-3275-gamer5-dana", "wild-rift", "3275 Wild Cores", "GAMER5", "DANA", { riot: "NamaKamu#TAG12" });
await ukurTriple("D43-aov-950-rosdi10-gopay", "arena-of-valor", "950 Voucher", "ROSDI10", "GoPay", { uid: "12345678" });
await ukurTriple("D44-valorant-3650-gamer5-gopay", "valorant", "3650 Points", "GAMER5", "GoPay", { riot: "NamaKamu#TAG12" });
await ukurTriple("D45-hok-800-rosdi10-dana", "honor-of-kings", "800 Token", "ROSDI10", "DANA", { uid: "12345678" });

// ================= F. Aksesibilitas =================
// F63: aria-expanded toggle "Lihat semua" di Cek
await nav("#/cek");
await safe("F63-aria-expanded", async () => {
  const btn = `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Lihat semua'))`;
  const sblm = await evalJs(`(() => { const b = (${btn}); return b ? { ada: true, expanded: b.getAttribute('aria-expanded'), teks: b.textContent.trim().slice(0, 40) } : { ada: false }; })()`);
  await clickSel(btn);
  await sleep(300);
  const sesudah = await evalJs(`(() => { const b = (${btn}); return b ? { expanded: b.getAttribute('aria-expanded'), baris: document.querySelectorAll('button.sum-row').length } : { ada: false }; })()`);
  return { sblm, sesudah };
});
// F64: ArrowUp/Down di daftar metode bayar
await nav("#/game/mobile-legends");
await setInputVal("#uid", "12345678"); await setInputVal("#zone", "1234");
await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('86 Diamonds'))`);
await safe("F64-arrow-metode", async () => {
  await evalJs(`document.querySelectorAll('.pay')[2]?.focus(); 'ok'`);
  const sblm = await evalJs(`[...document.querySelectorAll('.pay')].indexOf(document.activeElement)`);
  await pressKey("ArrowDown", "ArrowDown", 40);
  const bawah = await evalJs(`[...document.querySelectorAll('.pay')].indexOf(document.activeElement)`);
  await pressKey("ArrowUp", "ArrowUp", 38);
  const atas = await evalJs(`[...document.querySelectorAll('.pay')].indexOf(document.activeElement)`);
  return { fokusAwal: sblm, sesudahArrowDown: bawah, sesudahArrowUp: atas };
});
// F65/66: Enter + Space pada tombol "Hapus" promo
await safe("F65-enter-hapus-promo", async () => {
  await setInputVal('input[aria-label="Kode promo"]', "ROSDI10");
  await clickSel(`document.querySelector('.promo-btn[type="submit"]')`);
  await sleep(300);
  const aktif1 = await evalJs(`!!document.querySelector('.sum-row.disc')`);
  await evalJs(`[...document.querySelectorAll('.promo-btn')].find((b) => b.textContent.trim() === 'Hapus')?.focus(); 'ok'`);
  await pressEnter();
  const setelahEnter = await evalJs(`({ adaDisc: !!document.querySelector('.sum-row.disc'), adaHapus: !!([...document.querySelectorAll('.promo-btn')].find((b) => b.textContent.trim() === 'Hapus')) })`);
  return { promoAktifSebelum: aktif1, setelahEnter };
});
await safe("F66-space-hapus-promo", async () => {
  await setInputVal('input[aria-label="Kode promo"]', "GAMER5");
  await clickSel(`document.querySelector('.promo-btn[type="submit"]')`);
  await sleep(300);
  const aktif1 = await evalJs(`!!document.querySelector('.sum-row.disc')`);
  await evalJs(`[...document.querySelectorAll('.promo-btn')].find((b) => b.textContent.trim() === 'Hapus')?.focus(); 'ok'`);
  await pressSpace();
  const setelahSpace = await evalJs(`({ adaDisc: !!document.querySelector('.sum-row.disc'), adaHapus: !!([...document.querySelectorAll('.promo-btn')].find((b) => b.textContent.trim() === 'Hapus')) })`);
  return { promoAktifSebelum: aktif1, setelahSpace };
});
// F67/68/69: tab-walk focus-visible (Zone, email, server)
await nav("#/game/mobile-legends");
await safe("F67-focus-zone", () => tabWalkTo(`(el) => el.id === 'zone'`));
await safe("F68-focus-email", () => tabWalkTo(`(el) => el.id === 'email'`));
await nav("#/game/genshin-impact");
await safe("F69-focus-server", () => tabWalkTo(`(el) => el.id === 'server'`));
// F74: Enter pada "Lihat semua" riwayat
await nav("#/cek");
await safe("F74-enter-lihat-semua", async () => {
  await evalJs(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Lihat semua'))?.focus(); 'ok'`);
  const sblm = await evalJs(`document.querySelectorAll('button.sum-row').length`);
  await pressEnter();
  const sesudah = await evalJs(`({ baris: document.querySelectorAll('button.sum-row').length, expanded: [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Lihat semua') || b.textContent.includes('lebih sedikit'))?.getAttribute('aria-expanded') })`);
  return { barisSebelum: sblm, sesudah };
});
// F76: Home/End pada chip kategori
await nav("#/");
await safe("F76-homeend-chip", async () => {
  await evalJs(`document.querySelectorAll('.chip')[2]?.focus(); 'ok'`);
  const sblm = await evalJs(`[...document.querySelectorAll('.chip')].indexOf(document.activeElement)`);
  await pressKey("End", "End", 35);
  const sesudahEnd = await evalJs(`[...document.querySelectorAll('.chip')].indexOf(document.activeElement)`);
  await pressKey("Home", "Home", 36);
  const sesudahHome = await evalJs(`[...document.querySelectorAll('.chip')].indexOf(document.activeElement)`);
  return { fokusAwal: sblm, sesudahEnd, sesudahHome };
});
// F62/70/71/72/73/75: kontras runtime (placeholder + meta)
await nav("#/cek");
await safe("F62-kontras-placeholder-order", () => contrastOf(`getComputedStyle(document.querySelector('input[aria-label="Nomor transaksi"]'), '::placeholder').color`, `getComputedStyle(document.querySelector('input[aria-label="Nomor transaksi"]')).backgroundColor`));
await nav("#/game/mobile-legends");
await safe("F70-kontras-placeholder-email", () => contrastOf(`getComputedStyle(document.querySelector('#email'), '::placeholder').color`, `getComputedStyle(document.querySelector('#email')).backgroundColor`));
await safe("F71-kontras-placeholder-uid", () => contrastOf(`getComputedStyle(document.querySelector('#uid'), '::placeholder').color`, `getComputedStyle(document.querySelector('#uid')).backgroundColor`));
await safe("F61-kontras-tagline-valorant", async () => {
  await nav("#/");
  return contrastOf(`getComputedStyle([...document.querySelectorAll('.p-sub')].find((e) => e.textContent.includes('Via Riot ID'))).color`, `getComputedStyle([...document.querySelectorAll('.p-sub')].find((e) => e.textContent.includes('Via Riot ID')).closest('.card')).backgroundColor`);
});
await safe("F72-kontras-meta-ditumpuk", async () => {
  await nav("#/game/mobile-legends");
  await clickSel(`[...document.querySelectorAll('.tab')].find(t => t.textContent.includes('Weekly Pass'))`);
  await sleep(300);
  return contrastOf(`getComputedStyle([...document.querySelectorAll('.n-meta')].find((e) => e.textContent.includes('Ditumpuk 2 minggu'))).color`, `getComputedStyle([...document.querySelectorAll('.n-meta')].find((e) => e.textContent.includes('Ditumpuk 2 minggu')).closest('.nom')).backgroundColor`);
});
await safe("F73-kontras-meta-welkin", async () => {
  await nav("#/game/genshin-impact");
  await clickSel(`[...document.querySelectorAll('.tab')].find(t => t.textContent.includes('Blessing'))`);
  await sleep(300);
  return contrastOf(`getComputedStyle([...document.querySelectorAll('.n-meta')].find((e) => e.textContent.includes('90 GC/hari'))).color`, `getComputedStyle([...document.querySelectorAll('.n-meta')].find((e) => e.textContent.includes('90 GC/hari')).closest('.nom')).backgroundColor`);
});
await safe("F75-kontras-meta-twilight", async () => {
  await nav("#/game/mobile-legends");
  await clickSel(`[...document.querySelectorAll('.tab')].find(t => t.textContent.includes('Weekly Pass'))`);
  await sleep(300);
  return contrastOf(`getComputedStyle([...document.querySelectorAll('.n-meta')].find((e) => e.textContent.includes('Skin epic'))).color`, `getComputedStyle([...document.querySelectorAll('.n-meta')].find((e) => e.textContent.includes('Skin epic')).closest('.nom')).backgroundColor`);
});

// ================= G. Responsif =================
const ukurLebar = async (id, w, halaman, mode) => { await setMetrics(w, 844, w < 900); await nav(halaman); await sleep(600); if (mode === "game") await safe(id, () => gridInfo(".grid.c4", ".grid.c4 .card")); else if (mode === "nom") await safe(id, () => gridInfo(".nom-grid", ".nom")); else if (mode === "checkout") await safe(id, async () => ({ layout: await checkoutLayout(), overflow: await evalJs(OVERFLOW_JS) })); };
await ukurLebar("G77-340-beranda", 340, "#/", "game");
await ukurLebar("G78-345-beranda", 345, "#/", "game");
await ukurLebar("G79-475-nominal", 475, "#/game/mobile-legends", "nom");
await ukurLebar("G80-515-nominal", 515, "#/game/mobile-legends", "nom");
await ukurLebar("G81-525-checkout", 525, "#/game/mobile-legends", "checkout");
await ukurLebar("G82-535-checkout", 535, "#/game/mobile-legends", "checkout");
await ukurLebar("G87-545-beranda", 545, "#/", "game");
const ukurZoom = async (id, z, halaman, mode) => { const w = Math.round(390 / (z / 100)); const h = Math.round(844 / (z / 100)); await setMetrics(w, h, true); await nav(halaman); await sleep(600); if (mode === "game") await safe(id, async () => ({ lebarCss: w, ...(await gridInfo(".grid.c4", ".grid.c4 .card")) })); else await safe(id, async () => ({ lebarCss: w, ...(await gridInfo(".nom-grid", ".nom")) })); };
await ukurZoom("G83-zoom205-beranda", 205, "#/", "game");
await ukurZoom("G84-zoom210-nominal", 210, "#/game/mobile-legends", "nom");
await ukurZoom("G85-zoom220-beranda", 220, "#/", "game");
await ukurZoom("G86-zoom230-nominal", 230, "#/game/mobile-legends", "nom");
await setMetrics(390, 844, true);
// G88: rotasi di halaman Paket Data
await nav("#/data/telkomsel");
await sleep(600);
await safe("G88-rotasi-paket-data", async () => {
  const potret = await evalJs(`(() => { const kartu = document.querySelectorAll('.nom'); const beli = document.querySelector('.mobile-bar .btn'); const r = beli ? beli.getBoundingClientRect() : null; return { lebar: window.innerWidth, kartu: kartu.length, overflowX: document.documentElement.scrollWidth > window.innerWidth, beliDalamViewport: r ? (r.right <= window.innerWidth + 0.5 && r.left >= -0.5) : null }; })()`);
  await setMetrics(844, 390, true);
  await sleep(600);
  const lanskap = await evalJs(`(() => { const kartu = document.querySelectorAll('.nom'); const beli = document.querySelector('.mobile-bar .btn'); const r = beli ? beli.getBoundingClientRect() : null; return { lebar: window.innerWidth, kartu: kartu.length, overflowX: document.documentElement.scrollWidth > window.innerWidth, beliDalamViewport: r ? (r.right <= window.innerWidth + 0.5 && r.left >= -0.5) : null, beliRect: r ? { left: +r.left.toFixed(1), right: +r.right.toFixed(1), top: +r.top.toFixed(1) } : null }; })()`);
  await setMetrics(390, 844, true);
  return { potret, lanskap };
});

// ================= H. State & teknis =================
// H89-96: deep link — dua bentuk URL per ide (query di location.search; query di dalam hash)
const cekDeepLink = async (id, q) => {
  const a = await (async () => { await navFull(baseUrl + "?" + q); return evalJs(`({ judul: document.querySelector('.crumb h1')?.textContent || document.querySelector('h1')?.textContent, hash: location.hash, search: location.search })`); })();
  const b = await (async () => { await navFull(baseUrl + "#/?" + q); return evalJs(`({ judul: document.querySelector('.crumb h1')?.textContent || document.querySelector('h1')?.textContent, hash: location.hash })`); })();
  rec(id, { bentukSearch: a, bentukHash: b });
};
await cekDeepLink("H89-tab-pulsa-operator-telkomsel", "tab=pulsa&operator=telkomsel");
await cekDeepLink("H90-tab-game-mlbb", "tab=game&game=mlbb");
await cekDeepLink("H91-qty10-nominal50000", "qty=10&nominal=50000");
await cekDeepLink("H92-promo-gamer5-metode-dana", "promo=GAMER5&metode=DANA");
await cekDeepLink("H93-tab-game-valorant", "tab=game&game=valorant");
await cekDeepLink("H94-qty12", "qty=12");
await cekDeepLink("H95-qty20", "qty=20");
await cekDeepLink("H96-promo-rosdi10-kecil", "promo=rosdi10");
// H97: request jaringan saat ganti operator pulsa
await nav("#/pulsa/telkomsel");
await sleep(500);
await safe("H97-request-ganti-operator", async () => {
  requests.length = 0;
  await setInputVal("#hp", "081234567890");
  await sleep(500);
  const saatKetik = requests.length;
  await evalJs(`location.assign(${JSON.stringify(baseUrl + '#/pulsa/indosat')}); 'ok'`);
  await sleep(1500);
  return { requestSaatKetik: saatKetik, requestSaatGantiOperator: requests.length, contoh: requests.map((r) => r.url).slice(0, 5) };
});

// ================= B. Pencarian (verifikasi runtime 2 query) =================
await nav("#/");
await safe("B11-runtime-saldo-250000", async () => { await setInputVal('.searchbar input', "saldo 250000"); await sleep(400); return await evalJs(`({ emptyState: !!document.querySelector('.empty'), kartuGame: document.querySelectorAll('.grid.c4 .card').length })`); });
await safe("B18-runtime-blessing-62000", async () => { await setInputVal('.searchbar input', "blessing 62000"); await sleep(400); return await evalJs(`({ emptyState: !!document.querySelector('.empty'), kartuGame: document.querySelectorAll('.grid.c4 .card').length })`); });

// ================= C. Validasi (verifikasi runtime sampel) =================
await nav("#/game/mobile-legends");
await safe("C37-runtime-uid-23", async () => { const v = await setInputVal("#uid", "12345678901234567890123"); await sleep(200); return { nilaiTampil: v, panjangTampil: v?.length, kelas: await evalJs(`document.querySelector('#uid')?.className`), errTampil: await evalJs(`!!document.querySelector('#uid-err')`) }; });
await nav("#/pln");
await safe("C24-runtime-pln-37", async () => { const v = await setInputVal("#idpel", "5432109876543210987654321098765432109"); await sleep(200); return { nilaiTampil: v, panjangTampil: v?.length, kelas: await evalJs(`document.querySelector('#idpel')?.className`), tombolDisabled: await evalJs(`document.querySelector('#idpel')?.closest('form')?.querySelector('button[type="submit"]')?.disabled`) }; });

writeFileSync(outDir + "/cdp-s467.json", JSON.stringify(R, null, 2));
console.log("SELESAI-S467");
process.exit(0);
