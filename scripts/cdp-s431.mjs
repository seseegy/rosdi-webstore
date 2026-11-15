// Ukur runtime CDP batch s431: ide 1-16, 25-32, 41-54, 55-65, 69-74, 75-80, 92-95.
// Penggunaan: node scripts/cdp-s431.mjs <wsUrl> <width> <baseUrl> <outDir>
// Satu tarikan browser dipakai untuk puluhan ide sekaligus.
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
await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 560 });

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const click = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(text)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);

// ---- 92: chunk lazy — resource yang terunduh di Beranda
rec(92, await evalJs(`(() => { const rs = performance.getEntriesByType('resource').map((r) => r.name.split('/').pop()); return { initialJs: rs.filter((n) => n.endsWith('.js')), hasGamePage: rs.some((n) => /GamePage/.test(n)), hasCheckoutShell: rs.some((n) => /CheckoutShell/.test(n)) }; })()`));
// ---- 94: title/lang/meta
rec(94, await evalJs(`({ title: document.title, lang: document.documentElement.lang, meta: document.querySelector('meta[name=description]')?.content || null })`));
// ---- 1: deep link MLBB langsung
await goHash("#/game/mobile-legends");
rec(1, await evalJs(`({ h1: document.querySelector('.crumb h1')?.textContent, steps: document.querySelectorAll('.step').length, hasEmpty: !!document.querySelector('.empty'), summaryVisible: !!document.querySelector('.summary') })`));
// ---- 2: rute tak dikenal
await goHash("#/game/xyz-tak-ada");
rec(2, await evalJs(`({ hero: !!document.querySelector('.hero'), h1: document.querySelector('h1')?.textContent, text404: /tidak ditemukan/i.test(document.body.innerText), hash: location.hash })`));
// ---- 3: scroll restoration
await goHash("#/");
await evalJs(`window.scrollTo(0, 800); 'ok'`);
await sleep(300);
await evalJs(`document.querySelector('.grid.c4 a.card')?.click(); 'ok'`);
await sleep(1200);
const scrollBefore = await evalJs(`window.scrollY`);
await click(".crumb .back");
await sleep(800);
rec(3, { scrollBefore, scrollAfterBack: await evalJs(`window.scrollY`) });
// ---- 7: CTA hero (di Beranda)
await goHash("#/");
await click(".hero .btn");
await sleep(900);
rec(7, await evalJs(`(() => { const k = document.getElementById('katalog'); const r = k?.getBoundingClientRect(); const hdr = document.querySelector('header.site')?.getBoundingClientRect(); return { katalogTop: r ? +r.top.toFixed(1) : null, headerBottom: hdr ? +hdr.bottom.toFixed(1) : null, scrollY: window.scrollY }; })()`));
// ---- 5: "Lihat semua" ada?
rec(5, await evalJs(`({ adaLihatSemua: /Lihat semua/.test(document.body.innerText), moreText: document.querySelector('.sec-head .more')?.textContent || null })`));
// ---- 9-16: pencarian
const searchState = async () => evalJs(`(() => {
  const cards = [...document.querySelectorAll('.grid a.card')].map((c) => c.querySelector('.p-name')?.textContent);
  const flash = [...document.querySelectorAll('.grid.c2 a.card')].map((c) => c.textContent.replace(/\\s+/g, ' ').trim().slice(0, 40));
  return { gameCards: cards, flash, nothing: !!document.querySelector('.empty') && /Tidak ada produk/.test(document.querySelector('.empty')?.textContent || ''), sections: [...document.querySelectorAll('section.block h2')].map((h) => h.textContent) };
})()`);
await setInput(".searchbar input", "MLBB"); await sleep(300);
rec(9, await searchState());
await setInput(".searchbar input", "mlbb "); await sleep(300);
rec(10, await searchState());
await setInput(".searchbar input", "pulsa"); await sleep(300);
rec(11, await searchState());
await setInput(".searchbar input", "dana"); await sleep(300);
rec(12, await searchState());
await clickText(".chip", "Top Up Game"); await sleep(200);
await setInput(".searchbar input", "pulsa"); await sleep(300);
rec(13, await searchState());
await setInput(".searchbar input", ""); await sleep(300);
rec(14, await searchState());
await setInput(".searchbar input", "telkomsel"); await sleep(300);
rec(15, await searchState());
await setInput(".searchbar input", "voucher"); await sleep(300);
const vSearch = await searchState();
await setInput(".searchbar input", "steam"); await sleep(300);
const sSearch = await searchState();
rec(16, { voucher: vSearch, steam: sSearch });
await setInput(".searchbar input", ""); await sleep(200);
// ---- 6: footer Cara Top Up dari halaman produk
await goHash("#/game/mobile-legends");
await evalJs(`(() => { const b = [...document.querySelectorAll('footer .flink')].find((e) => e.textContent.trim() === 'Cara Top Up'); b?.click(); return 'ok'; })()`);
await sleep(900);
rec(6, await evalJs(`(() => { const el = document.getElementById('cara-topup'); const r = el?.getBoundingClientRect(); return { hash: location.hash, caraTop: r ? +r.top.toFixed(1) : null, headerH: document.querySelector('header.site')?.getBoundingClientRect().height }; })()`));
// ---- 4: logo dari Cek Transaksi (dengan pencarian terisi dulu)
await goHash("#/");
await setInput(".searchbar input", "mlbb"); await sleep(200);
await goHash("#/cek");
await click(".logo"); await sleep(800);
rec(4, await evalJs(`({ hash: location.hash, searchVal: document.querySelector('.searchbar input')?.value ?? 'NO-INPUT' })`));

// ---- 25-32: validasi GamePage MLBB
await goHash("#/game/mobile-legends");
await setInput("#uid", "abc123"); await sleep(200);
rec(25, await evalJs(`({ uidVal: document.querySelector('#uid')?.value, uidErr: !!document.querySelector('#uid.err'), badNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()), buyDisabled: document.querySelector('.summary .btn.big')?.disabled })`));
await setInput("#uid", "12345678"); await setInput("#zone", ""); await sleep(200);
rec(26, await evalJs(`({ badNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()), buyDisabled: document.querySelector('.summary .btn.big')?.disabled })`));
await setInput("#uid", "ab"); await setInput("#zone", "12"); await sleep(200);
rec(32, await evalJs(`({ badNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) })`));
// ---- 27-28: Genshin
await goHash("#/game/genshin-impact");
rec(27, await evalJs(`({ hasZoneInput: !!document.querySelector('#zone'), serverDefault: document.querySelector('#server')?.value, serverOptions: [...document.querySelectorAll('#server option')].map((o) => o.value) })`));
await setInput("#uid", "12345678"); await sleep(200);
await evalJs(`(() => { const s = document.querySelector('#server'); const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setter.call(s, 'Eropa'); s.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`);
await sleep(300);
rec(28, await evalJs(`({ targetRow: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.startsWith('Tujuan'))?.textContent })`));
// ---- 29-30: nomor HP +62 & spasi
await goHash("#/pulsa/telkomsel");
await setInput("#hp", "+6281234567890"); await sleep(300);
rec(29, await evalJs(`({ badNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) })`));
await setInput("#hp", "0812 3456 7890"); await sleep(300);
rec(30, await evalJs(`({ goodNote: document.querySelector('.note.good')?.textContent || null, badNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) })`));
// ---- 31: email voucher +tag
await goHash("#/voucher/google-play");
await setInput("#vemail", "nama+tag@mail.co.id"); await sleep(300);
rec(31, await evalJs(`({ ok: !document.querySelector('#vemail.err'), targetRow: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.startsWith('Tujuan'))?.textContent })`));

// ---- 33-40: pembayaran (spot runtime di E-Money DANA)
await goHash("#/emoney/dana");
await setInput("#hp", "081234567890"); await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('Saldo 100.000')); b?.click(); return 'ok'; })()`);
await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('Pulsa Telkomsel')); b?.click(); return 'ok'; })()`);
await sleep(300);
rec(33, await evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); const total = document.querySelector('.sum-total b')?.textContent; const payRow = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('Pulsa Telkomsel'))?.querySelector('.p-price')?.textContent; return { rows, total, payRow }; })()`));
rec(36, await evalJs(`({ danamonDisabled: [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('Danamon'))?.disabled, danamonText: [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('Danamon'))?.textContent.replace(/\\s+/g, ' ').trim() })`));
await setInput(".step input[aria-label='Kode promo']", "rosdi10"); await sleep(200);
await clickText(".step .btn", "Pakai"); await sleep(300);
rec(39, await evalJs(`({ promoMsg: document.querySelector('.step .note.good, .step .note.bad')?.textContent || null, discRow: [...document.querySelectorAll('.sum-row.disc')].map((r) => r.textContent.trim()) })`));
rec(38, await evalJs(`({ discRows: document.querySelectorAll('.sum-row.disc').length })`));
// promo tanpa aktif: cek baris diskon hilang setelah reload halaman
await goHash("#/emoney/dana"); await sleep(300);
rec("38b", await evalJs(`({ discRows: document.querySelectorAll('.sum-row.disc').length })`));

// ---- 41-46: ringkasan & mobile bar (MLBB, qty 10, item termahal)
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('2195 Diamonds')); b?.click(); return 'ok'; })()`);
await sleep(300);
for (let i = 0; i < 9; i++) { await click(".qty .plus"); await sleep(60); }
rec(46, await evalJs(`({ qty: document.querySelector('.qty b')?.textContent, plusDisabled: document.querySelector('.qty .plus')?.disabled ?? null, minusDisabled: document.querySelector('.qty button')?.disabled ?? null })`));
await click(".qty .plus"); await sleep(200);
rec("46b", await evalJs(`({ qtyAfterExtraPlus: document.querySelector('.qty b')?.textContent })`));
rec(44, await evalJs(`(() => { const t = document.querySelector('.sum-total b'); const mb = document.querySelector('.mb-total b'); return { total: t?.textContent, totalScrollW: t?.scrollWidth, totalClientW: t?.clientWidth, mbTotal: mb?.textContent, mbScrollW: mb?.scrollWidth, mbClientW: mb?.clientWidth, viewport: window.innerWidth }; })()`));
rec(41, await evalJs(`({ labels: [...document.querySelectorAll('.sum-row')].map((r) => r.querySelector('span')?.textContent) })`));
await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('QRIS')); b?.click(); return 'ok'; })()`);
await sleep(300);
rec(45, await evalJs(`({ mbTotal: document.querySelector('.mb-total b')?.textContent, mbItem: document.querySelector('.mb-total span')?.textContent })`));
await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('GoPay')); b?.click(); return 'ok'; })()`);
await sleep(300);
rec("45b", await evalJs(`({ mbTotalAfterMethod: document.querySelector('.mb-total b')?.textContent, sumTotal: document.querySelector('.sum-total b')?.textContent })`));
// minus di qty 1
for (let i = 0; i < 9; i++) { await click(".qty button"); await sleep(60); }
rec("46c", await evalJs(`({ qty: document.querySelector('.qty b')?.textContent, minusDisabled: document.querySelector('.qty button')?.disabled ?? null })`));
await click(".qty button"); await sleep(200);
rec("46d", await evalJs(`({ qtyAfterExtraMinus: document.querySelector('.qty b')?.textContent })`));
// ---- 43: nama item panjang di ringkasan (Genshin Blessing)
await goHash("#/game/genshin-impact");
await setInput("#uid", "12345678"); await sleep(200);
await clickText(".tab", "Blessing"); await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('Blessing of the Welkin Moon')); b?.click(); return 'ok'; })()`);
await sleep(300);
rec(43, await evalJs(`(() => { const row = [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.startsWith('Item')); const b = row?.querySelector('b'); return { itemText: b?.textContent, scrollW: b?.scrollWidth, clientW: b?.clientWidth, asideW: document.querySelector('.summary')?.getBoundingClientRect().width }; })()`));
// ---- 61: tab switch mempertahankan UID
await goHash("#/game/mobile-legends");
await setInput("#uid", "87654321"); await setInput("#zone", "4321"); await sleep(200);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('86 Diamonds')); b?.click(); return 'ok'; })()`);
await sleep(200);
await clickText(".tab", "Weekly Pass"); await sleep(300);
rec(61, await evalJs(`({ uidKept: document.querySelector('#uid')?.value, zoneKept: document.querySelector('#zone')?.value, itemRow: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.startsWith('Item'))?.textContent })`));
// ---- 62: ganti nominal setelah metode dipilih
await clickText(".tab", "Diamonds"); await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('172 Diamonds')); b?.click(); return 'ok'; })()`);
await sleep(200);
await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('BCA Virtual')); b?.click(); return 'ok'; })()`);
await sleep(200);
const before = await evalJs(`[...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('BCA Virtual'))?.querySelector('.p-price')?.textContent`);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('86 Diamonds')); b?.click(); return 'ok'; })()`);
await sleep(300);
rec(62, await evalJs(`({ bcaBefore: ${JSON.stringify(before)}, bcaAfter: [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('BCA Virtual'))?.querySelector('.p-price')?.textContent, sumTotal: document.querySelector('.sum-total b')?.textContent })`));
// ---- 8: refresh di tengah checkout
await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('QRIS')); b?.click(); return 'ok'; })()`);
await sleep(300);
await evalJs(`location.reload()`); await sleep(2500);
rec(8, await evalJs(`({ uidAfterReload: document.querySelector('#uid')?.value ?? 'NO-INPUT', itemSelected: !!document.querySelector('.nom.on'), paySelected: !!document.querySelector('.pay.on'), explainer: /ulang|hilang|draf/i.test(document.body.innerText) })`));
// ---- 79: Enter di kolom promo
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('86 Diamonds')); b?.click(); return 'ok'; })()`);
await sleep(200);
await setInput(".step input[aria-label='Kode promo']", "ROSDI10"); await sleep(200);
await evalJs(`(() => { const el = document.querySelector(".step input[aria-label='Kode promo']"); el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true })); return 'ok'; })()`);
await sleep(400);
rec(79, await evalJs(`({ promoAppliedByEnter: document.querySelectorAll('.sum-row.disc').length, promoMsg: document.querySelector('.step .note.good, .step .note.bad')?.textContent || null })`));

// ---- 47-54: sukses & cek (seed order lokal)
await evalJs(`(() => {
  const mk = (o) => ({ ref: o.ref, kind: o.kind, product: o.product, item: o.item, qty: 1, target: o.target, base: o.base, fee: o.fee, disc: 0, total: o.total, method: o.method, time: Date.now(), status: o.status, email: o.email || '', wa: '', token: o.token || null });
  const orders = [
    mk({ ref: 'RSD-TESTPLN1', kind: 'pln', product: 'Token PLN', item: 'Token 100.000', target: '543210987654', base: 102500, fee: 0, total: 102500, method: 'QRIS', status: 'Diproses', token: '1234 5678 9012 3456 7890' }),
    mk({ ref: 'RSD-TESTVCH1', kind: 'voucher', product: 'Voucher Google Play', item: 'Saldo 50.000', target: 'nama@email.com', base: 55000, fee: 0, total: 55000, method: 'QRIS', status: 'Selesai', email: 'nama@email.com' }),
    mk({ ref: 'RSD-TESTPLS1', kind: 'pulsa', product: 'Telkomsel', item: 'Pulsa 50.000', target: '081234567890', base: 51907, fee: 0, total: 51907, method: 'QRIS', status: 'Diproses' }),
  ];
  localStorage.setItem('rosdi_orders', JSON.stringify(orders));
  return 'ok';
})()`);
await goHash("#/sukses");
rec(47, await evalJs(`({ emptyShown: !!document.querySelector('.empty') && /tidak ditemukan/i.test(document.querySelector('.empty')?.textContent || ''), h1: document.querySelector('h1,h2')?.textContent })`));
await goHash("#/sukses/RSD-TESTPLN1");
rec(48, await evalJs(`({ tokenBox: document.querySelector('.token-box')?.textContent, tokenDigits: (document.querySelector('.token-box')?.textContent || '').replace(/\\D/g, '').length, tokenCopyBtn: !!([...document.querySelectorAll('button')].find((b) => /salin/i.test(b.textContent) && b.closest('.step')?.textContent.includes('token PLN'))), meterNote: /meteran/.test(document.body.innerText) })`));
await goHash("#/sukses/RSD-TESTVCH1");
rec(49, await evalJs(`({ voucherCodeShown: /kode voucher\\s*:?\\s*[A-Z0-9]{4,}/i.test(document.body.innerText), redeemNote: /Kode voucher dikirim ke/.test(document.body.innerText), emailShown: /nama@email\\.com/.test(document.body.innerText), copyBtns: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()) })`));
await goHash("#/sukses/RSD-TESTPLS1");
rec(50, await evalJs(`({ subtitle: document.querySelector('.step p')?.textContent, targetRow: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.startsWith('Tujuan'))?.textContent })`));
// ---- 52-54: cek transaksi
await goHash("#/cek");
await setInput(".step input[aria-label='Nomor transaksi']", "rsd-demo1234"); await sleep(200);
await clickText(".step .btn", "Lacak"); await sleep(400);
rec(52, await evalJs(`({ found: !!document.querySelector('.timeline'), product: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.startsWith('Produk'))?.textContent })`));
rec(53, await evalJs(`({ timelineClasses: [...document.querySelectorAll('.timeline li')].map((li) => li.className + ':' + li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 40)) })`));
await setInput(".step input[aria-label='Nomor transaksi']", "RSD-TESTPLN1"); await sleep(200);
await clickText(".step .btn", "Lacak"); await sleep(400);
rec("53b", await evalJs(`({ timelineClasses: [...document.querySelectorAll('.timeline li')].map((li) => li.className + ':' + li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 40)) })`));
rec(54, await evalJs(`(async () => { const row = document.querySelectorAll('.step .sum-row')[0]; if (!row) return { hasRows: false }; const before = location.hash; row.click(); await new Promise((r) => setTimeout(r, 300)); return { hasRows: true, tag: row.tagName, clickable: row.tagName === 'A' || row.tagName === 'BUTTON' || row.style.cursor === 'pointer' || !!row.onclick, hashAfterClick: location.hash, hashChanged: location.hash !== before }; })()`));
// ---- 95: format tanggal timeline
rec(95, await evalJs(`({ dateText: document.querySelector('.timeline small')?.textContent })`));

// ---- 55-58: modal Masuk & fokus
await goHash("#/");
await clickText(".header-actions .btn", "Masuk"); await sleep(400);
rec(55, await evalJs(`({ modalOpen: !!document.querySelector('.modal[role=dialog]'), modalText: document.querySelector('.modal p')?.textContent.slice(0, 80), closeBtn: document.querySelector('.modal .btn')?.textContent })`));
rec(57, await evalJs(`({ activeInsideModal: document.querySelector('.modal')?.contains(document.activeElement) })`));
await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); 'ok'`);
await sleep(300);
rec("57b", await evalJs(`({ modalClosedByEsc: !document.querySelector('.modal'), activeAfterClose: document.activeElement?.tagName + '.' + (document.activeElement?.className || '') })`));
await clickText(".header-actions .btn", "Masuk"); await sleep(300);
await evalJs(`window.scrollTo(0, 600); 'ok'`);
await sleep(200);
rec(58, await evalJs(`({ scrollYWithModal: window.scrollY, bodyOverflow: getComputedStyle(document.body).overflow })`));
await evalJs(`(() => { document.querySelector('.modal-veil')?.click(); return 'ok'; })()`);
await sleep(300);
rec(56, await evalJs(`({ closedByVeil: !document.querySelector('.modal') })`));
// ---- 60: modal di viewport pendek 600px
await send("Emulation.setDeviceMetricsOverride", { width, height: 600, deviceScaleFactor: 1, mobile: width <= 560 });
await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('footer .flink')].find((e) => e.textContent.trim() === 'Syarat & Ketentuan'); b?.click(); return 'ok'; })()`);
await sleep(400);
rec(60, await evalJs(`(() => { const m = document.querySelector('.modal'); if (!m) return { modal: false }; const r = m.getBoundingClientRect(); const btn = [...m.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Tutup'); const br = btn?.getBoundingClientRect(); return { modalTop: +r.top.toFixed(1), modalBottom: +r.bottom.toFixed(1), viewportH: window.innerHeight, tutupBottom: br ? +br.bottom.toFixed(1) : null, tutupVisible: br ? br.bottom <= window.innerHeight && br.top >= 0 : null }; })()`));
await evalJs(`(() => { document.querySelector('.modal .btn')?.click(); return 'ok'; })()`);
await sleep(300);
await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 560 });

// ---- 63-65: tema
await click(".icon-btn"); await sleep(300);
rec(65, await evalJs(`({ themeNow: document.documentElement.dataset.theme, ariaLabel: document.querySelector('.icon-btn')?.getAttribute('aria-label'), iconIsSun: !!document.querySelector('.icon-btn svg circle') })`));
await evalJs(`location.reload()`); await sleep(2500);
rec(63, await evalJs(`({ themeAfterReload: document.documentElement.dataset.theme, stored: localStorage.getItem('rosdi_theme') })`));
await evalJs(`localStorage.removeItem('rosdi_theme'); location.reload()`); await sleep(2500);
rec(64, await evalJs(`({ themeFirstVisit: document.documentElement.dataset.theme, prefersDark: matchMedia('(prefers-color-scheme: dark)').matches })`));
// ---- 93: localStorage order korup
await evalJs(`localStorage.setItem('rosdi_orders', '{corrupt,,,'); location.reload()`); await sleep(2500);
rec(93, await evalJs(`({ appRenders: !!document.querySelector('#root')?.children.length, homeVisible: !!document.querySelector('.hero') })`));
await goHash("#/cek");
rec("93b", await evalJs(`({ historySection: /Transaksi terakhir/.test(document.body.innerText), crashed: document.body.innerText.includes('Error') })`));
await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);

// ---- 69-74: layout per lebar
rec("layout", await evalJs(`(() => {
  const de = document.documentElement;
  const grid = document.querySelector('.grid.c4');
  const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null;
  const cards = [...document.querySelectorAll('.grid.c4 a.card')].map((c) => Math.round(c.getBoundingClientRect().width));
  return { scrollW: de.scrollWidth, innerW: window.innerWidth, hOverflow: de.scrollWidth > window.innerWidth, gridC4Cols: cols, cardWidths: cards.slice(0, 4) };
})()`));
if (width === 1024) {
  await goHash("#/game/mobile-legends");
  rec(70, await evalJs(`(() => { const f = document.querySelector('.flow'); const cs = getComputedStyle(f); const aside = document.querySelector('.summary'); const ar = aside?.getBoundingClientRect(); return { flowCols: cs.gridTemplateColumns, asideTop: ar ? +ar.top.toFixed(1) : null, asideSticky: cs.position, summaryPosition: getComputedStyle(aside).position }; })()`));
}
if (width === 1440) {
  rec(71, await evalJs(`(() => { const w = document.querySelector('.wrap'); const fw = document.querySelector('footer .wrap'); return { wrapLeft: Math.round(w.getBoundingClientRect().left), wrapW: Math.round(w.getBoundingClientRect().width), footerWrapLeft: Math.round(fw.getBoundingClientRect().left) }; })()`));
  // 73: zoom 200% proxy
  await evalJs(`document.documentElement.style.zoom = '2'; 'ok'`);
  await sleep(400);
  rec(73, await evalJs(`(() => { const de = document.documentElement; const nom = document.querySelector('.nom'); return { scrollW: de.scrollWidth, innerW: window.innerWidth, hOverflow: de.scrollWidth > window.innerWidth + 1, sampleNomW: nom ? Math.round(nom.getBoundingClientRect().width) : null }; })()`));
  await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
  // 72: landscape 700x400
  await send("Emulation.setDeviceMetricsOverride", { width: 700, height: 400, deviceScaleFactor: 1, mobile: true });
  await goHash("#/");
  rec(72, await evalJs(`(() => { const hdr = document.querySelector('header.site').getBoundingClientRect(); const hero = document.querySelector('.hero').getBoundingClientRect(); const bar = document.querySelector('.mobile-bar'); const br = bar?.getBoundingClientRect(); return { headerBottom: +hdr.bottom.toFixed(1), heroTop: +hero.top.toFixed(1), heroBottom: +hero.bottom.toFixed(1), mobileBarTop: br ? +br.top.toFixed(1) : null, viewportH: window.innerHeight, overlap: hero.top < hdr.bottom }; })()`));
  await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  // 74: viewport pendek 600px, halaman produk desktop
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 600, deviceScaleFactor: 1, mobile: false });
  await goHash("#/game/mobile-legends");
  rec(74, await evalJs(`(() => { const s = document.querySelector('.summary'); const r = s?.getBoundingClientRect(); const btn = s?.querySelector('.btn.big'); const b = btn?.getBoundingClientRect(); return { summaryH: r ? Math.round(r.height) : null, summaryTop: r ? +r.top.toFixed(1) : null, buyBtnBottom: b ? +b.bottom.toFixed(1) : null, viewportH: window.innerHeight, buyVisible: b ? b.bottom <= window.innerHeight : null }; })()`));
  await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
}
// ---- 75-80: a11y
await goHash("#/game/mobile-legends");
rec(75, await evalJs(`({ uidInputMode: document.querySelector('#uid')?.getAttribute('inputmode'), zoneInputMode: document.querySelector('#zone')?.getAttribute('inputmode') })`));
await goHash("#/pln");
rec("75b", await evalJs(`({ idpelInputMode: document.querySelector('#idpel')?.getAttribute('inputmode') })`));
await goHash("#/pulsa/telkomsel");
rec("75c", await evalJs(`({ hpInputMode: document.querySelector('#hp')?.getAttribute('inputmode'), hpAutocomplete: document.querySelector('#hp')?.getAttribute('autocomplete') })`));
await goHash("#/game/mobile-legends");
rec(76, await evalJs(`({ emailAutocomplete: document.querySelector('#email')?.getAttribute('autocomplete'), waAutocomplete: document.querySelector('#wa')?.getAttribute('autocomplete'), emailType: document.querySelector('#email')?.type })`));
rec(77, await evalJs(`(() => { const hs = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => h.tagName.toLowerCase() + ':' + h.textContent.trim().slice(0, 30)); return { h1Count: document.querySelectorAll('h1').length, headings: hs }; })()`));
rec(78, await evalJs(`({ header: !!document.querySelector('header'), nav: !!document.querySelector('nav'), navLabel: document.querySelector('nav')?.getAttribute('aria-label'), main: !!document.querySelector('main'), footer: !!document.querySelector('footer') })`));
rec(80, await evalJs(`(() => { const rules = []; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) { if (r.selectorText && r.selectorText.includes(':focus-visible')) rules.push(r.selectorText + ' {' + r.style.cssText + '}'); } } catch (e) {} } return { focusVisibleRules: rules }; })()`));
// Tab-order focus outline (keyboard Tab via CDP)
try {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await sleep(300);
  rec("80b", await evalJs(`(() => { const a = document.activeElement; const cs = a ? getComputedStyle(a) : null; return { active: a?.tagName + '.' + (a?.className || ''), outline: cs ? cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor : null }; })()`));
} catch (e) { rec("80b", { error: String(e).slice(0, 200) }); }
// ---- 92b: chunk GamePage terunduh setelah navigasi
rec("92b", await evalJs(`(() => { const rs = performance.getEntriesByType('resource').map((r) => r.name.split('/').pop()); return { hasGamePage: rs.some((n) => /GamePage/.test(n)), hasCheckoutShell: rs.some((n) => /CheckoutShell/.test(n)), jsCount: rs.filter((n) => n.endsWith('.js')).length }; })()`));
// ---- 100: countdown
await goHash("#/");
rec(100, await evalJs(`({ countdownText: document.querySelector('.count-chip')?.textContent })`));

writeFileSync(`${outDir}/s431-${width}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI lebar", width, "—", Object.keys(R).length, "ide tercatat");
process.exit(0);
