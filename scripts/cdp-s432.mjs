// Ukur runtime CDP batch s432: H71-H80 (lebar), A1/A8/A19, D39/D40, E41-E50,
// F51-F60, G61/G62, I82/I89. Satu tarikan browser dipakai puluhan ide.
// Penggunaan: node scripts/cdp-s432.mjs <wsUrl> <width> <baseUrl> <outDir>
// (dipanggil cdp-launch.sh per lebar; fase runtime hanya di lebar 390).
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; };

const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable");
await send("Runtime.enable");
const setMetrics = (w, h) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w <= 560 });
await setMetrics(width, 1000);

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const click = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(text)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickContains = async (sel, text) => evalJs(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]; const el = els.find((e) => e.textContent.includes(${JSON.stringify(text)})); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const shot = async (name) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(s.data, "base64")); };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);

// ============ FASE 1: lebar (semua lebar) ============
const cs = async (sel, prop) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; return getComputedStyle(el).${prop}; })()`);
rec("H-width", await evalJs(`({ vw: window.innerWidth, scrollW: document.documentElement.scrollWidth, h1: document.querySelector('h1')?.textContent })`));
// H71: nav di 620 vs 621
rec(71, { width, navDisplay: await cs("nav.main", "display") });
// H72: .row2 — ukur di halaman game (perlu navigasi dulu)
await goHash("#/game/mobile-legends");
rec(72, { width, row2Cols: await cs(".row2", "gridTemplateColumns"), row2Count: await evalJs(`document.querySelectorAll('.row2').length`) });
// H73: trust strip — kembali ke Beranda
await goHash("#/");
rec(73, { width, trustCols: await cs(".trust", "gridTemplateColumns") });
// H74: grid nominal 2 kolom + badge di 360 (halaman game)
rec(74, await evalJs(`(() => { return { vw: window.innerWidth }; })()`));
await goHash("#/game/mobile-legends");
rec(74, await evalJs(`(() => {
  const grid = document.querySelector('.nom-grid');
  const cs = getComputedStyle(grid);
  const badges = [...document.querySelectorAll('.nom .badge')].map((b) => {
    const r = b.getBoundingClientRect(); const card = b.closest('.nom').getBoundingClientRect();
    return { overCardRight: Math.round(r.right - card.right), overVp: Math.round(r.right - window.innerWidth) };
  });
  return { vw: window.innerWidth, nomCols: cs.gridTemplateColumns.split(' ').length, badges };
})()`));
// H75: grid Beranda di 430
await goHash("#/");
rec(75, { width, gameGridCols: await evalJs(`(() => { const g = document.querySelector('.grid.c4'); return g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : null; })()`), utilGridCols: await evalJs(`(() => { const g = document.querySelector('.grid.c3'); return g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : null; })()`) });
// H76: mobile-bar + aside di 900/901
await goHash("#/game/mobile-legends");
rec(76, { width, mobileBarDisplay: await cs(".mobile-bar", "display"), asideVisible: await evalJs(`(() => { const a = document.querySelector('aside .summary'); if (!a) return false; const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`), flowCols: await cs(".flow", "gridTemplateColumns") });
// H79: lebar .wrap di 1280
rec(79, { width, wrapW: await evalJs(`(() => { const w = document.querySelector('.wrap'); return w ? Math.round(w.getBoundingClientRect().width) : null; })()`), wrapMaxW: await cs(".wrap", "maxWidth") });
// H80: 1024x768 landscape — flow 2 kolom?
rec(80, { width, flowCols: await cs(".flow", "gridTemplateColumns"), asideSticky: await cs(".summary", "position") });
await shot(`s432-w${width}`);

// ============ FASE 2: runtime (hanya lebar 390) ============
if (width === 390) {
  await evalJs(`localStorage.clear(); 'ok'`);
  await goHash("#/");

  // ---- A1/A8: penomoran langkah + tombol Beli di tiap halaman produk
  const routes = [
    ["game-mlbb", "#/game/mobile-legends"], ["pulsa", "#/pulsa/telkomsel"], ["data", "#/data/telkomsel"],
    ["pln", "#/pln"], ["emoney", "#/emoney/dana"], ["voucher", "#/voucher/google-play"], ["tagihan", "#/tagihan/pln-pascabayar"],
  ];
  const stepsInfo = {};
  for (const [key, hash] of routes) {
    await goHash(hash);
    stepsInfo[key] = await evalJs(`(() => ({
      stepNums: [...document.querySelectorAll('.step-num')].map((e) => e.textContent.trim()),
      stepTitles: [...document.querySelectorAll('.step-head h2')].map((e) => e.textContent.trim()),
      buyButtons: [...document.querySelectorAll('button')].filter((b) => /Beli Sekarang/.test(b.textContent)).map((b) => ({ text: b.textContent.trim(), disabled: b.disabled, visible: b.getBoundingClientRect().width > 0 })),
    }))()`);
  }
  rec(1, stepsInfo);
  rec(8, Object.fromEntries(Object.entries(stepsInfo).map(([k, v]) => [k, v.buyButtons])));

  // ---- A19: nama item panjang membungkus rapi? (Genshin Blessing, MLBB Weekly Pass)
  await goHash("#/game/genshin-impact");
  await clickText(".tab", "Blessing");
  await sleep(400);
  rec(19, await evalJs(`(() => {
    const noms = [...document.querySelectorAll('.nom')].map((n) => {
      const name = n.querySelector('.n-name'); const price = n.querySelector('.n-price');
      const nr = name.getBoundingClientRect(); const cr = n.getBoundingClientRect(); const pr = price.getBoundingClientRect();
      return { name: name.textContent, nameH: Math.round(nr.height), nameLines: Math.round(nr.height / parseFloat(getComputedStyle(name).lineHeight)), cardW: Math.round(cr.width), priceOverflowsCard: pr.right > cr.right + 1, priceTwoLines: pr.height > 22 };
    });
    return { tab: 'Blessing', noms };
  })()`));
  await goHash("#/game/mobile-legends");
  await clickText(".tab", "Weekly Pass");
  await sleep(400);
  rec("19b", await evalJs(`(() => [...document.querySelectorAll('.nom')].map((n) => {
    const name = n.querySelector('.n-name'); const price = n.querySelector('.n-price');
    const nr = name.getBoundingClientRect(); const cr = n.getBoundingClientRect(); const pr = price.getBoundingClientRect();
    return { name: name.textContent, nameH: Math.round(nr.height), nameLines: Math.round(nr.height / parseFloat(getComputedStyle(name).lineHeight)), priceOverflowsCard: pr.right > cr.right + 1 };
  }))()`));

  // ---- E41/E42/E50: UID + Zone
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "0");
  rec("41a", await evalJs(`({ err0: !!document.querySelector('.note.bad')?.textContent, errText: document.querySelector('.note.bad')?.textContent || null })`));
  await setInput("#uid", "0000");
  rec("41b", await evalJs(`({ err0000: !!document.querySelector('.note.bad'), errText: document.querySelector('.note.bad')?.textContent || null })`));
  await setInput("#uid", "000000");
  rec("41c", await evalJs(`({ err000000: !!document.querySelector('.note.bad'), note: document.querySelector('.note.bad')?.textContent || null })`));
  await setInput("#uid", "12345");
  const errBefore = await evalJs(`document.querySelector('.note.bad')?.textContent || null`);
  await setInput("#uid", "12345678");
  const errAfter = await evalJs(`document.querySelector('.note.bad')?.textContent || null`);
  rec(50, { errBeforeFix: errBefore, errAfterFix: errAfter });
  await setInput("#zone", "0123");
  await clickContains(".nom", "172 Diamonds");
  rec(42, await evalJs(`({ tujuan: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan'))?.querySelector('b')?.textContent })`));

  // ---- E43/E44: PLN
  await goHash("#/pln");
  await setInput("#idpel", "1234567890123");
  rec(43, await evalJs(`({ err13: document.querySelector('.note.bad')?.textContent || null, cekDisabled: document.querySelector('.step .btn')?.disabled })`));
  await setInput("#idpel", "12345678901");
  rec("43b", await evalJs(`({ err11: document.querySelector('.note.bad')?.textContent || null, cekDisabled: [...document.querySelectorAll('.step .btn')].find((b) => b.textContent === 'Cek Nama')?.disabled })`));
  await setInput("#idpel", "54321ABCDEF6");
  rec(44, await evalJs(`({ errHuruf: document.querySelector('.note.bad')?.textContent || null, cekDisabled: [...document.querySelectorAll('.step .btn')].find((b) => b.textContent === 'Cek Nama')?.disabled })`));

  // ---- E45: email huruf besar voucher
  await goHash("#/voucher/google-play");
  await setInput("#vemail", "NAMA@EMAIL.COM");
  await clickContains(".nom", "Saldo 50.000");
  rec(45, await evalJs(`({ err: document.querySelector('.note.bad')?.textContent || null, tujuan: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan'))?.querySelector('b')?.textContent })`));

  // ---- E46: nomor HP 10/14 digit
  await goHash("#/pulsa/telkomsel");
  await setInput("#hp", "0812345678");
  rec("46a", await evalJs(`({ err10: document.querySelector('.note.bad')?.textContent || null, valid10: !document.querySelector('.note.bad') })`));
  await setInput("#hp", "08123456789012");
  rec("46b", await evalJs(`({ err14: document.querySelector('.note.bad')?.textContent || null })`));

  // ---- E49: promo spasi ujung
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await clickContains(".nom", "172 Diamonds");
  await setInput('input[aria-label="Kode promo"]', "ROSDI10 ");
  await clickText(".step .btn", "Pakai");
  await sleep(400);
  rec(49, await evalJs(`({ promoMsg: document.querySelector('.note.good, .note.bad')?.textContent || null, discRow: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Diskon'))?.textContent || null })`));

  // ---- D40: qty 3 + ROSDI10 + GoPay — ringkasan vs mobile-bar vs baris metode
  await clickText(".qty .plus", "+");
  await clickText(".qty .plus", "+");
  await sleep(300);
  await clickContains(".pay", "GoPay");
  await sleep(300);
  rec(40, await evalJs(`(() => {
    const total = [...document.querySelectorAll('.sum-total b')].map((b) => b.textContent);
    const mb = document.querySelector('.mb-total b')?.textContent;
    const gopayRow = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('GoPay'));
    const rowPrice = gopayRow?.querySelector('.p-price')?.childNodes[0]?.textContent?.trim();
    const harga = [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.startsWith('Harga'))?.querySelector('b')?.textContent;
    const disc = [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Diskon'))?.querySelector('b')?.textContent;
    return { total, mobileBar: mb, gopayRowPrice: rowPrice, harga, disc };
  })()`));
  // I82: penanda terpilih non-warna di nominal terpilih
  rec(82, await evalJs(`(() => {
    const sel = document.querySelector('.nom.on');
    if (!sel) return { noSelection: true };
    const cs = getComputedStyle(sel);
    const unsel = document.querySelector('.nom:not(.on)');
    const cs2 = getComputedStyle(unsel);
    return { selBorderW: cs.borderWidth, unselBorderW: cs2.borderWidth, selHasCheck: /✓|Dipilih/.test(sel.textContent), selBg: cs.backgroundColor, unselBg: cs2.backgroundColor };
  })()`));
  // I89: tombol Beli disabled — di halaman baru tanpa pilihan
  await goHash("#/game/free-fire");
  rec(89, await evalJs(`(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /Beli Sekarang/.test(b.textContent));
    return btns.map((b) => ({ disabled: b.disabled, bg: getComputedStyle(b).backgroundColor, color: getComputedStyle(b).color, ariaDisabled: b.getAttribute('aria-disabled') }));
  })()`));

  // ---- D39 + F51/F52: beli MLBB (ROSDI10+GoPay masih aktif? tidak — halaman baru, ulangi alur beli sederhana)
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await clickContains(".nom", "172 Diamonds");
  await clickContains(".pay", "GoPay");
  await sleep(300);
  rec(39, await evalJs(`(() => {
    const total = document.querySelector('.sum-total b')?.textContent;
    const mb = document.querySelector('.mb-total b')?.textContent;
    const row = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('GoPay'))?.querySelector('.p-price')?.childNodes[0]?.textContent?.trim();
    return { summaryTotal: total, mobileBar: mb, gopayRow: row };
  })()`));
  await clickText("button.btn", "Beli Sekarang");
  await sleep(1500);
  rec("39sukses", await evalJs(`(() => {
    const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim());
    const total = document.querySelector('.sum-total b')?.textContent;
    return { hash: location.hash, rows, total };
  })()`));
  // F51: refresh di Sukses
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2500);
  rec(51, await evalJs(`({ hash: location.hash, h1: document.querySelector('h1')?.textContent, refShown: document.querySelector('.sum-row b')?.textContent, empty: !!document.querySelector('.empty') })`));
  // F52: back dari Sukses
  await evalJs(`history.back(); 'ok'`);
  await sleep(1500);
  rec(52, await evalJs(`({ hash: location.hash, h1: document.querySelector('.crumb h1')?.textContent || document.querySelector('h1')?.textContent, uidValue: document.querySelector('#uid')?.value ?? null, ordersInStorage: JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length })`));

  // ---- F53/F54/F55/F56: Cek Transaksi
  await goHash("#/cek");
  rec(53, await evalJs(`(() => {
    const rows = [...document.querySelectorAll('.step button.sum-row')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim());
    const stored = JSON.parse(localStorage.getItem('rosdi_orders') || '[]');
    return { listRows: rows, newestRef: stored[0]?.ref, listFirstRef: rows[0]?.slice(0, 20) };
  })()`));
  await setInput('input[aria-label="Nomor transaksi"]', "");
  await clickText(".step .btn", "Lacak");
  await sleep(400);
  rec(55, await evalJs(`({ msgEmpty: document.querySelector('.note.bad')?.textContent || null })`));
  await setInput('input[aria-label="Nomor transaksi"]', "RSD-TIDAKADA");
  await clickText(".step .btn", "Lacak");
  await sleep(400);
  rec(54, await evalJs(`({ msgNotFound: document.querySelector('.note.bad')?.textContent || null })`));
  const newestRef = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]?.ref`);
  await setInput('input[aria-label="Nomor transaksi"]', newestRef);
  await clickText(".step .btn", "Lacak");
  await sleep(400);
  rec(56, await evalJs(`(() => {
    const timeline = [...document.querySelectorAll('.timeline li')].map((li) => li.textContent.replace(/\\s+/g, ' ').trim());
    const btns = [...document.querySelectorAll('.step button')].map((b) => b.textContent.trim());
    return { timeline, buttonsInResult: btns, hasBeliLagi: /Beli Lagi/i.test(document.body.innerText), timeShown: document.querySelector('.timeline small')?.textContent };
  })()`));
  rec(60, { newestRef, timeNow: new Date().toLocaleString("id-ID") });

  // ---- F57 + F59/F58: PLN sukses (token berkelompok) + voucher sukses (kode?)
  await goHash("#/pln");
  await setInput("#idpel", "543210987654");
  await clickText(".step .btn", "Cek Nama");
  await sleep(400);
  await clickContains(".nom", "Token 100.000");
  await clickContains(".pay", "QRIS");
  await sleep(300);
  await clickText("button.btn", "Beli Sekarang");
  await sleep(1500);
  rec(57, await evalJs(`(() => {
    const box = document.querySelector('.token-box')?.textContent;
    return { tokenBox: box, groups: box ? box.trim().split(/\\s+/) : null, hasCopyToken: [...document.querySelectorAll('button')].some((b) => /Salin token/.test(b.textContent)) };
  })()`));
  await goHash("#/voucher/google-play");
  await setInput("#vemail", "NAMA@EMAIL.COM");
  await clickContains(".nom", "Saldo 50.000");
  await clickContains(".pay", "QRIS");
  await sleep(300);
  await clickText("button.btn", "Beli Sekarang");
  await sleep(1500);
  rec(58, await evalJs(`(() => ({
    hasVoucherCodeShown: /kode voucher[:\\s]*[A-Z0-9-]{4,}/i.test(document.body.innerText) && !/Kode voucher dikirim/.test(document.body.innerText),
    redeemNote: [...document.querySelectorAll('.note')].map((n) => n.textContent).find((t) => /Kode voucher dikirim/.test(t)) || null,
    buttons: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()),
    tujuan: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan'))?.querySelector('b')?.textContent,
  }))()`));
  rec(59, await evalJs(`({ redeemNote: [...document.querySelectorAll('.note')].map((n) => n.textContent).find((t) => /Kode voucher dikirim/.test(t)) || null })`));

  // ---- G61: ganti tema di tengah modal Masuk
  await goHash("#/");
  await clickText(".header-actions .btn", "Masuk");
  await sleep(500);
  const modalBgLight = await evalJs(`getComputedStyle(document.querySelector('.modal')).backgroundColor`);
  await click(".icon-btn");
  await sleep(400);
  const modalBgDark = await evalJs(`getComputedStyle(document.querySelector('.modal')).backgroundColor`);
  const themeAfter = await evalJs(`document.documentElement.dataset.theme`);
  rec(61, { modalBgLight, modalBgDark, themeAfter, modalStillOpen: await evalJs(`!!document.querySelector('.modal')`) });
  await clickText(".modal .btn", "Siap, lanjut belanja");
  await sleep(300);
  // G62: ganti tema di tengah checkout — pilihan tetap?
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await clickContains(".nom", "172 Diamonds");
  await clickContains(".pay", "QRIS");
  await sleep(300);
  await click(".icon-btn");
  await sleep(400);
  rec(62, await evalJs(`(() => ({
    theme: document.documentElement.dataset.theme,
    nomStillOn: document.querySelector('.nom.on')?.textContent?.includes('172 Diamonds') || false,
    payStillOn: document.querySelector('.pay.on')?.textContent?.includes('QRIS') || false,
    uidStill: document.querySelector('#uid')?.value,
  }))()`));
  // G63: tombol tema di balik veil — coba klik (harus terhalang)
  await clickText(".header-actions .btn", "Masuk");
  await sleep(400);
  rec(63, await evalJs(`(() => {
    const btn = document.querySelector('.icon-btn');
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { topElementAtThemeBtn: el?.className || el?.tagName, themeBefore: document.documentElement.dataset.theme };
  })()`));
  await evalJs(`document.querySelector('.icon-btn').click(); 'ok'`);
  await sleep(300);
  rec("63b", await evalJs(`({ themeAfterClickBehindVeil: document.documentElement.dataset.theme, modalStillOpen: !!document.querySelector('.modal') })`));
  await evalJs(`document.querySelector('.modal-veil').click(); 'ok'`);
  await sleep(300);

  // ---- H77: tinggi viewport 500 di Sukses
  await setMetrics(390, 500);
  await goHash("#/sukses/" + newestRef);
  await sleep(1200);
  rec(77, await evalJs(`(() => {
    const btns = [...document.querySelectorAll('.step button')].map((b) => { const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), visibleIn500: r.bottom <= 500 }; });
    return { scrollH: document.documentElement.scrollHeight, innerH: window.innerHeight, buttons: btns };
  })()`));
  await setMetrics(390, 1000);
  await shot("s432-390-sukses");
}

writeFileSync(`${outDir}/cdp-s432-w${width}.json`, JSON.stringify(R, null, 1));
ws.close();
console.log(JSON.stringify({ width, keys: Object.keys(R) }));
