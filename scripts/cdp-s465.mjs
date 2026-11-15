// Ukur CDP s465. Berjalan via scripts/cdp-launch-s465.sh.
// Penggunaan: node scripts/cdp-s465.mjs <wsUrl> <widthAtauZoom> <baseUrl> <outDir> [mode]
// mode: main | widths | zooms390 | rotation
import { mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir, modeArg] = process.argv.slice(2);
const WIDTH = +wArg;
const MODE = modeArg || "main";
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
const navFull = async (url) => { await evalJs(`location.assign(${JSON.stringify(url)}); 'ok'`); await sleep(2500); };
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, text) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
const pressEnter = async () => { await keyEvent("keyDown", "Enter", "Enter", 13, "\r"); await keyEvent("keyUp", "Enter", "Enter", 13); await sleep(350); };
const pressTab = async () => { await keyEvent("keyDown", "Tab", "Tab", 9); await keyEvent("keyUp", "Tab", "Tab", 9); await sleep(120); };
const pressKey = async (key, code, vk) => { await keyEvent("keyDown", key, code, vk); await keyEvent("keyUp", key, code, vk); await sleep(300); };
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
// Tab-walk nyata (keyboard) sampai elemen target aktif; baca outline + :focus-visible.
const tabWalkTo = async (testFnJs, maxTabs = 80) => evalJs(`(async () => {
  const test = (${testFnJs});
  for (let i = 0; i < ${maxTabs}; i++) {
    const el = document.activeElement;
    if (el && test(el)) {
      const cs = getComputedStyle(el);
      return { ditemukan: true, tabKe: i, tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), teks: (el.textContent || '').trim().slice(0, 40), outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, outlineOffset: cs.outlineOffset, focusVisible: el.matches(':focus-visible') };
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 60));
    // Tab sungguhan via CDP lebih andal daripada event sintetis: laporkan bila tidak maju
    if (i === 0) { /* placeholder */ }
  }
  return { ditemukan: false, aktifTerakhir: document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className || '').toString().slice(0, 40) : null };
})()`);
const tabWalkToCDP = async (testFnJs, maxTabs = 90) => {
  for (let i = 0; i < maxTabs; i++) {
    const hit = await evalJs(`(() => { const el = document.activeElement; if (!el) return null; const test = (${testFnJs}); if (!test(el)) return null; const cs = getComputedStyle(el); return { tabKe: ${i}, tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), teks: (el.textContent || '').trim().slice(0, 40), outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, outlineOffset: cs.outlineOffset, focusVisible: el.matches(':focus-visible') }; })()`);
    if (hit) return { ditemukan: true, ...hit };
    await pressTab();
  }
  const last = await evalJs(`(() => { const el = document.activeElement; return el ? el.tagName + '.' + (el.className || '').toString().slice(0, 50) + ' :: ' + (el.textContent || '').trim().slice(0, 30) : null; })()`);
  return { ditemukan: false, aktifTerakhir: last };
};

if (MODE === "main") {
  await setMetrics(390, 844, true);
  await nav("#/");
  // Seed 7 order agar toggle "Lihat semua" muncul (F65).
  await evalJs(`(() => { const o = (i) => ({ ref: 'RSD-TEST' + String(i).padStart(4, '0'), product: 'Mobile Legends', item: '86 Diamonds', qty: 1, method: 'QRIS', time: Date.now() - i * 86400000, total: 21580, status: 'Sukses' }); localStorage.setItem('rosdi_orders', JSON.stringify([1, 2, 3, 4, 5, 6, 7].map(o))); return JSON.parse(localStorage.getItem('rosdi_orders')).length; })()`);

  // ---- A1: animasi pesan error Zone ID ----
  await nav("#/game/mobile-legends");
  await setInputVal("#uid", "12345678");
  await setInputVal("#zone", "12");
  await sleep(400);
  await safe("A1-zone-err", () => animInfo(`document.querySelector('#zone-err')`));
  await safe("A1-zone-err-teks", () => evalJs(`document.querySelector('#zone-err')?.textContent`));

  // ---- A2: animasi pesan error nomor HP ----
  await nav("#/pulsa/telkomsel");
  await setInputVal("#hp", "08123");
  await sleep(400);
  await safe("A2-hp-err", () => animInfo(`[...document.querySelectorAll('.note.bad')].find(n => n.textContent.includes('Nomor HP harus'))`));

  // ---- A3: animasi pesan error email voucher ----
  await nav("#/voucher/google-play");
  await setInputVal("#vemail", "tanpa-at");
  await sleep(400);
  await safe("A3-email-err", () => animInfo(`[...document.querySelectorAll('.note.bad')].find(n => n.textContent.includes('Format email'))`));

  // ---- A4: animasi angka Total mobile-bar saat ganti metode ----
  await nav("#/game/mobile-legends");
  await setInputVal("#uid", "12345678");
  await setInputVal("#zone", "1234");
  await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('172 Diamonds'))`);
  await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('QRIS'))`);
  await sleep(300);
  const mbSebelum = await evalJs(`document.querySelector('.mb-total b')?.textContent`);
  await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('BCA Virtual Account'))`);
  await sleep(80);
  await safe("A4-mb-total-anim", () => animInfo(`document.querySelector('.mb-total b')`));
  await safe("A4-mb-total-teks", () => evalJs(`({ sebelum: ${JSON.stringify(mbSebelum)}, sesudah: document.querySelector('.mb-total b')?.textContent })`));

  // ---- A5/A6: animasi angka Total + harga item ringkasan saat qty diubah (desktop agar aside terlihat) ----
  await setMetrics(1280, 900, false);
  await nav("#/game/mobile-legends");
  await setInputVal("#uid", "12345678");
  await setInputVal("#zone", "1234");
  await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('172 Diamonds'))`);
  await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('QRIS'))`);
  await sleep(300);
  await evalJs(`document.querySelector('button[aria-label="Tambah"]').click(); 'ok'`);
  await sleep(80);
  await safe("A5-sum-total-anim", () => animInfo(`document.querySelector('.sum-total b')`));
  await safe("A6-harga-item-anim", () => evalJs(`(() => { const row = [...document.querySelectorAll('.sum-row')].find(r => r.textContent.trim().startsWith('Harga')); if (!row) return { ditemukan: false }; const b = row.querySelector('b'); const anims = b.getAnimations().map((a) => a.animationName || '?'); return { ditemukan: true, teks: b.textContent, animasiAktif: anims, animationName: getComputedStyle(b).animationName }; })()`));
  await safe("A5-teks-total", () => evalJs(`document.querySelector('.sum-total b')?.textContent`));
  await setMetrics(390, 844, true);

  // ---- A7: skeleton saat ganti operator pulsa ----
  await nav("#/pulsa/telkomsel");
  await setInputVal("#hp", "081234567890");
  await sleep(400);
  const gridTsel = await evalJs(`document.querySelectorAll('.nom').length`);
  await safe("A7-ganti-operator", async () => {
    await setInputVal("#hp", "085612345678");
    const sampel = [];
    for (let i = 0; i < 6; i++) {
      await sleep(50);
      sampel.push(await evalJs(`(() => { const grid = document.querySelector('.nom-grid'); const noms = document.querySelectorAll('.nom').length; const skeleton = !!document.querySelector('.skeleton, [class*="skeleton"], .loading'); return { t: ${i} * 50, jumlahNom: noms, skeleton, gridKosong: grid ? grid.children.length === 0 : null }; })()`));
    }
    await sleep(400);
    const akhir = await evalJs(`(() => { const pertama = document.querySelector('.nom .n-name')?.textContent; return { jumlahNom: document.querySelectorAll('.nom').length, pertama }; })()`);
    return { jumlahNomTelkomsel: gridTsel, sampel, akhir };
  });

  // ---- A8: border hijau email voucher saat valid ----
  await nav("#/voucher/google-play");
  await setInputVal("#vemail", "nama@mail.com");
  await sleep(300);
  await safe("A8-vemail-ok", () => evalJs(`(() => { const el = document.querySelector('#vemail'); const cs = getComputedStyle(el); return { kelas: el.className, punyaOk: el.classList.contains('ok'), borderColor: cs.borderColor }; })()`));

  // ---- A9: animasi tombol Pakai -> Hapus saat promo diterapkan ----
  await nav("#/game/mobile-legends");
  await setInputVal('input[aria-label="Kode promo"]', "ROSDI10");
  await clickSel(`document.querySelector('.promo-btn[type="submit"]')`);
  await sleep(120);
  await safe("A9-hapus-anim", () => animInfo(`[...document.querySelectorAll('.promo-btn')].find(b => b.textContent.trim() === 'Hapus')`));
  await safe("A9-pesan-promo", () => evalJs(`[...document.querySelectorAll('.note')].find(n => n.textContent.includes('Kode ROSDI10'))?.textContent`));

  // ---- A10: denyut tombol Beli mobile-bar saat total berubah ----
  await nav("#/game/mobile-legends");
  await setInputVal("#uid", "12345678");
  await setInputVal("#zone", "1234");
  await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('172 Diamonds'))`);
  await sleep(200);
  await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('706 Diamonds'))`);
  await sleep(80);
  await safe("A10-btn-beli-anim", () => animInfo(`document.querySelector('.mobile-bar .btn')`));

  // ---- B spot: query gagal ----
  await nav("#/");
  await setInputVal('.searchbar input', "steam 120000");
  await sleep(400);
  await safe("B20-steam120000", () => evalJs(`({ emptyTampil: !!document.querySelector('.empty'), teksEmpty: document.querySelector('.empty')?.textContent?.slice(0, 80), kartuGame: document.querySelectorAll('.grid.c4 .card').length })`));
  await setInputVal('.searchbar input', "byu 10000");
  await sleep(400);
  await safe("B11-byu10000", () => evalJs(`({ emptyTampil: !!document.querySelector('.empty'), teksEmpty: document.querySelector('.empty')?.textContent?.slice(0, 80) })`));

  // ---- C spot ----
  await nav("#/game/mobile-legends");
  await setInputVal("#zone", "12345678901234567890123456789012");
  await sleep(300);
  await safe("C21-zone32", () => evalJs(`({ nilaiInput: document.querySelector('#zone').value, panjang: document.querySelector('#zone').value.length, errTampil: !!document.querySelector('#zone-err'), errTeks: document.querySelector('#zone-err')?.textContent })`));
  await nav("#/cek");
  await setInputVal('input[aria-label="Nomor transaksi"]', "RSDDEMO1234");
  await clickSel(`document.querySelector('form button[type="submit"]')`);
  await sleep(500);
  await safe("C30-order-tanpa-strip", () => evalJs(`({ notFoundTampil: !!([...document.querySelectorAll('.note.bad')].find(n => n.textContent.includes('tidak ditemukan'))), hasilTampil: !!document.querySelector('.cek-result') })`));
  await nav("#/game/mobile-legends");
  await setInputVal("#uid", "12345678");
  await setInputVal("#zone", "1234");
  await setInputVal("#email", "a".repeat(66) + "@mail.com");
  await sleep(300);
  await safe("C27-email66", () => evalJs(`({ peringatanTampil: !!([...document.querySelectorAll('.note')].find(n => n.textContent.includes('Format email sepertinya'))), kelasInput: document.querySelector('#email').className })`));
  await setInputVal('input[aria-label="Kode promo"]', "ROSDI10 ");
  await clickSel(`document.querySelector('.promo-btn[type="submit"]')`);
  await sleep(400);
  await safe("C34-promo-spasi", () => evalJs(`({ pesan: [...document.querySelectorAll('.note')].find(n => n.textContent.includes('Kode ROSDI10'))?.textContent, hapusTampil: !!([...document.querySelectorAll('.promo-btn')].find(b => b.textContent.trim() === 'Hapus')) })`));

  // ---- D spot: total UI OMG + ROSDI10 + QRIS = Rp34.200 ----
  await nav("#/data/telkomsel");
  await setInputVal("#hp", "081234567890");
  await sleep(300);
  await clickSel(`[...document.querySelectorAll('.nom')].find(n => n.textContent.includes('OMG! Nonton 10GB'))`);
  await setInputVal('input[aria-label="Kode promo"]', "ROSDI10");
  await clickSel(`document.querySelector('.promo-btn[type="submit"]')`);
  await sleep(300);
  await clickSel(`[...document.querySelectorAll('.pay')].find(p => p.textContent.includes('QRIS'))`);
  await sleep(400);
  await safe("D39-ui-total", () => evalJs(`(() => { const total = document.querySelector('.sum-total b')?.textContent; const disc = [...document.querySelectorAll('.sum-row.disc b')].map((b) => b.textContent); const qris = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('QRIS'))?.querySelector('.p-price')?.textContent; return { totalRingkasan: total, diskon: disc, hargaBarisQRIS: qris }; })()`));

  // ---- F61: Enter di stepper + ----
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { document.querySelector('button[aria-label="Tambah"]').focus(); return 'ok'; })()`);
  await sleep(200);
  const qtySebelum = await evalJs(`document.querySelector('.qty b')?.textContent`);
  await pressEnter();
  await safe("F61-enter-stepper", () => evalJs(`({ qtySebelum: ${JSON.stringify(qtySebelum)}, qtySesudah: document.querySelector('.qty b')?.textContent })`));

  // ---- F62: ArrowRight di tab game ----
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const t = [...document.querySelectorAll('.tab')].find(x => x.textContent.trim() === 'Diamonds'); t.focus(); return 'ok'; })()`);
  await sleep(200);
  const tabSebelum = await evalJs(`[...document.querySelectorAll('.tab')].find(t => t.classList.contains('on'))?.textContent`);
  const fokusSebelum = await evalJs(`document.activeElement?.textContent`);
  await pressKey("ArrowRight", "ArrowRight", 39);
  await safe("F62-arrow-tab", () => evalJs(`({ tabSebelum: ${JSON.stringify(tabSebelum)}, tabSesudah: [...document.querySelectorAll('.tab')].find(t => t.classList.contains('on'))?.textContent, fokusSesudah: document.activeElement?.textContent, fokusTetap: document.activeElement?.textContent === ${JSON.stringify(fokusSebelum)} })`));

  // ---- F63/F64: Arrow + Home/End di grid nominal ----
  await evalJs(`(() => { document.querySelector('.nom').focus(); return 'ok'; })()`);
  await sleep(200);
  const nomFokusSebelum = await evalJs(`document.activeElement?.querySelector('.n-name')?.textContent`);
  await pressKey("ArrowRight", "ArrowRight", 39);
  const nomSetelahArrow = await evalJs(`document.activeElement?.querySelector('.n-name')?.textContent`);
  await pressKey("Home", "Home", 36);
  const nomSetelahHome = await evalJs(`document.activeElement?.querySelector('.n-name')?.textContent`);
  await pressKey("End", "End", 35);
  const nomSetelahEnd = await evalJs(`document.activeElement?.querySelector('.n-name')?.textContent`);
  rec("F63-arrow-grid", { fokusSebelum: nomFokusSebelum, fokusSetelahArrow: nomSetelahArrow, berpindah: nomFokusSebelum !== nomSetelahArrow });
  rec("F64-home-end-grid", { fokusSetelahArrow: nomSetelahArrow, fokusSetelahHome: nomSetelahHome, fokusSetelahEnd: nomSetelahEnd, homeMelompat: nomSetelahHome !== nomSetelahArrow, endMelompat: nomSetelahEnd !== nomSetelahHome });

  // ---- F65: focus-visible toggle "Lihat semua" (Tab nyata) ----
  await nav("#/cek");
  await sleep(300);
  await safe("F65-lihat-semua-focus", () => tabWalkToCDP(`(el) => el.tagName === 'BUTTON' && el.textContent.includes('Lihat semua')`));

  // ---- F66: focus-visible input UID ----
  await nav("#/game/mobile-legends");
  await safe("F66-uid-focus", () => tabWalkToCDP(`(el) => el.id === 'uid'`));

  // ---- F67: focus-visible input HP ----
  await nav("#/pulsa/telkomsel");
  await safe("F67-hp-focus", () => tabWalkToCDP(`(el) => el.id === 'hp'`));

  // ---- F68: focus-visible tombol Masuk di modal Masuk ----
  await nav("#/");
  await clickSel(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Masuk')`);
  await sleep(500);
  await safe("F68-masuk-modal-focus", () => tabWalkToCDP(`(el) => el.tagName === 'BUTTON' && el.textContent.includes('Siap, lanjut belanja')`));
  await pressKey("Escape", "Escape", 27);
  await sleep(300);

  // ---- F69: focus-visible tombol Tutup modal S&K ----
  await nav("#/");
  await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find(x => x.textContent.includes('Syarat')); b.scrollIntoView({ behavior: 'instant', block: 'center' }); b.click(); return 'ok'; })()`);
  await sleep(500);
  await safe("F69-tutup-modal-focus", () => tabWalkToCDP(`(el) => el.tagName === 'BUTTON' && el.textContent.trim() === 'Tutup'`));

  // ---- H89-97: deep link query ----
  await setMetrics(1280, 900, false);
  for (const [id, q] of [["H89", "?tab=promo"], ["H90", "?tab=cek"], ["H91", "?tab=sukses"], ["H92", "?tab=home"], ["H93", "?metode=mandiri"], ["H94", "?metode=bri"], ["H95", "?metode=alfamart"], ["H96", "?metode=telkomsel"], ["H97", "?uid=abc"]]) {
    await safe(id, async () => {
      await navFull(baseUrl + q);
      return evalJs(`({ hash: location.hash, heroTampil: !!document.querySelector('.hero'), judulTab: document.title, h1: document.querySelector('h1')?.textContent?.slice(0, 40), halamanRusak: document.body.innerText.includes('Gagal memuat') })`);
    });
  }
  await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);
}

if (MODE === "widths") {
  const W = WIDTH;
  await setMetrics(W, 844, W < 900);
  if (W === 445) { await nav("#/"); await safe("G77-grid-445", () => gridInfo('.grid.c4', '.grid.c4 .card')); await safe("G77-overflow-445", () => evalJs(OVERFLOW_JS)); }
  if (W === 495) { await nav("#/game/mobile-legends"); await safe("G78-nom-495", () => gridInfo('.nom-grid', '.nom')); await safe("G78-overflow-495", () => evalJs(OVERFLOW_JS)); }
  if (W === 590) { await nav("#/game/mobile-legends"); await safe("G79-checkout-590", checkoutLayout); await safe("G79-overflow-590", () => evalJs(OVERFLOW_JS)); }
  if (W === 650) { await nav("#/game/mobile-legends"); await safe("G80-checkout-650", checkoutLayout); await safe("G80-overflow-650", () => evalJs(OVERFLOW_JS)); }
  if (W === 710) { await nav("#/"); await safe("G81-overflow-710", () => evalJs(OVERFLOW_JS)); await safe("G81-wrap-710", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w ? w.getBoundingClientRect() : null; return { innerWidth: window.innerWidth, wrapLebar: r ? +r.width.toFixed(1) : null, wrapKiri: r ? +r.left.toFixed(1) : null, wrapKanan: r ? +r.right.toFixed(1) : null }; })()`)); }
  if (W === 790) { await nav("#/"); await safe("G82-overflow-790", () => evalJs(OVERFLOW_JS)); await safe("G82-wrap-790", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w ? w.getBoundingClientRect() : null; return { innerWidth: window.innerWidth, wrapLebar: r ? +r.width.toFixed(1) : null, wrapKiri: r ? +r.left.toFixed(1) : null, wrapKanan: r ? +r.right.toFixed(1) : null }; })()`)); }
  if (W === 930) { await nav("#/"); await safe("G83-overflow-930", () => evalJs(OVERFLOW_JS)); await safe("G83-wrap-930", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w ? w.getBoundingClientRect() : null; return { innerWidth: window.innerWidth, wrapLebar: r ? +r.width.toFixed(1) : null, wrapKiri: r ? +r.left.toFixed(1) : null, wrapKanan: r ? +r.right.toFixed(1) : null }; })()`)); }
  if (W === 1130) { await nav("#/"); await safe("G84-overflow-1130", () => evalJs(OVERFLOW_JS)); await safe("G84-wrap-1130", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w ? w.getBoundingClientRect() : null; return { innerWidth: window.innerWidth, wrapLebar: r ? +r.width.toFixed(1) : null, wrapKiri: r ? +r.left.toFixed(1) : null, wrapKanan: r ? +r.right.toFixed(1) : null }; })()`)); }
}

if (MODE === "zooms390") {
  const Z = WIDTH;
  await setMetrics(390, 844, true);
  await nav("#/");
  await evalJs(`document.documentElement.style.zoom = '${Z}%'; 'ok'`);
  await sleep(600);
  if (Z === 165) { await safe("G85-grid-z165", () => gridInfo('.grid.c4', '.grid.c4 .card')); await safe("G85-overflow-z165", () => evalJs(OVERFLOW_JS)); }
  if (Z === 190) { await nav("#/game/mobile-legends"); await safe("G86-nom-z190", () => gridInfo('.nom-grid', '.nom')); await safe("G86-overflow-z190", () => evalJs(OVERFLOW_JS)); }
}

if (MODE === "g86b") {
  // Zoom 190%: apakah teks harga benar-benar keluar dari kartu nominal?
  await setMetrics(390, 844, true);
  await nav("#/game/mobile-legends");
  await evalJs(`document.documentElement.style.zoom = '190%'; 'ok'`);
  await sleep(600);
  await safe("G86b-harga-vs-kartu", () => evalJs(`(() => {
    const out = [];
    document.querySelectorAll('.nom').forEach((card, i) => {
      const cr = card.getBoundingClientRect();
      const price = card.querySelector('.n-price');
      const pr = price.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(price);
      const tr = range.getBoundingClientRect();
      out.push({ i, kartu: { l: +cr.left.toFixed(1), r: +cr.right.toFixed(1), w: +cr.width.toFixed(1) }, hargaBox: { w: +pr.width.toFixed(1), sw: price.scrollWidth, cw: price.clientWidth }, teksHarga: { l: +tr.left.toFixed(1), r: +tr.right.toFixed(1), w: +tr.width.toFixed(1) }, teksKeluarKartu: +(tr.right - cr.right).toFixed(1), teks: price.textContent.trim().slice(0, 12) });
    });
    return { jumlah: out.length, keluarKartu: out.filter((o) => o.teksKeluarKartu > 0.5).length, maksKeluar: Math.max(...out.map((o) => o.teksKeluarKartu)), contoh: out.slice(0, 3) };
  })()`));
}

if (MODE === "rotation") {
  const WHICH = WIDTH; // 87 = modal Masuk, 88 = modal Refund
  await setMetrics(390, 844, true);
  await nav("#/");
  if (WHICH === 87) {
    await clickSel(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Masuk')`);
  } else {
    await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find(x => x.textContent.includes('Kebijakan Pengembalian')); b.scrollIntoView({ behavior: 'instant', block: 'center' }); b.click(); return 'ok'; })()`);
  }
  await sleep(600);
  const sebelum = await evalJs(`(() => { const m = document.querySelector('.modal'); if (!m) return { modal: false }; const r = m.getBoundingClientRect(); const btn = [...document.querySelectorAll('.modal .btn')].map((b) => { const br = b.getBoundingClientRect(); return { teks: b.textContent.trim().slice(0, 30), terlihat: br.top >= 0 && br.bottom <= window.innerHeight && br.left >= 0 && br.right <= window.innerWidth }; }); return { modal: true, rect: { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1) }, vw: window.innerWidth, vh: window.innerHeight, tombol: btn }; })()`);
  rec(WHICH === 87 ? "G87-modal-portrait" : "G88-modal-portrait", sebelum);
  // putar ke landscape
  await setMetrics(844, 390, true);
  await sleep(600);
  await safe(WHICH === 87 ? "G87-modal-landscape" : "G88-modal-landscape", () => evalJs(`(() => { const m = document.querySelector('.modal'); if (!m) return { modal: false }; const r = m.getBoundingClientRect(); const btn = [...document.querySelectorAll('.modal .btn')].map((b) => { const br = b.getBoundingClientRect(); return { teks: b.textContent.trim().slice(0, 30), terlihat: br.top >= 0 && br.bottom <= window.innerHeight && br.left >= 0 && br.right <= window.innerWidth, top: +br.top.toFixed(1), bottom: +br.bottom.toFixed(1) }; }); const veil = document.querySelector('.modal-veil'); const vr = veil ? veil.getBoundingClientRect() : null; return { modal: true, rect: { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, vw: window.innerWidth, vh: window.innerHeight, terpotong: r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth, tombol: btn, veilH: vr ? +vr.height.toFixed(1) : null }; })()`));
}
console.log("SELESAI-MODE", MODE);
process.exit(0);
