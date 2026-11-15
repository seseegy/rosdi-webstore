// Verifikasi ulang terfokus batch s431 (build FINAL): perbaikan ide
// 9/10/15/16 (pencarian alias), 25 (UID angka), 26 (note Zone wajib),
// 29 (+62), 46 (stepper disabled), 48 (salin token), 54 (riwayat klik),
// 57b (fokus kembali), 58 (kunci scroll), 79 (Enter promo), 69 (grid 768).
// Penggunaan: node scripts/cdp-s431b.mjs <wsUrl> <width> <baseUrl> <outDir>
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

// ---- 69: grid Beranda pada lebar ini (pastikan di Beranda, query kosong)
await goHash("#/");
rec(69, await evalJs(`(() => {
  const de = document.documentElement;
  const g4 = document.querySelector('.grid.c4');
  const g3 = document.querySelector('.grid.c3');
  const cards = g4 ? [...g4.querySelectorAll('a.card')].map((c) => { const r = c.getBoundingClientRect(); return Math.round(r.width) + '@' + Math.round(r.left); }) : [];
  const cut = g4 ? [...g4.querySelectorAll('a.card')].some((c) => { const r = c.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }) : null;
  return { scrollW: de.scrollWidth, innerW: window.innerWidth, hOverflow: de.scrollWidth > window.innerWidth,
    c4cols: g4 ? getComputedStyle(g4).gridTemplateColumns.split(' ').length : null, c3cols: g3 ? getComputedStyle(g3).gridTemplateColumns.split(' ').length : null,
    cardWidths: cards, anyCardCut: cut };
})()`));
// ---- 9/10/15/16: pencarian dengan chip "Semua" (reset eksplisit tiap uji)
const searchState = async () => evalJs(`(() => {
  const names = [...document.querySelectorAll('.grid a.card .p-name')].map((e) => e.textContent);
  return { names, nothing: !!document.querySelector('.empty') && /Tidak ada produk/.test(document.querySelector('.empty')?.textContent || '') };
})()`);
await clickText(".chip", "Semua"); await sleep(200);
await setInput(".searchbar input", "MLBB"); await sleep(300);
rec(9, await searchState());
await setInput(".searchbar input", "mlbb "); await sleep(300);
rec(10, await searchState());
await setInput(".searchbar input", "telkomsel"); await sleep(300);
rec(15, await searchState());
await setInput(".searchbar input", "voucher"); await sleep(300);
rec("16a", await searchState());
await setInput(".searchbar input", "steam"); await sleep(300);
rec("16b", await searchState());
await setInput(".searchbar input", "hok"); await sleep(300);
rec("9b", await searchState());
await setInput(".searchbar input", ""); await sleep(200);
// ---- 25/26: UID huruf + Zone kosong
await goHash("#/game/mobile-legends");
await setInput("#uid", "abc123"); await sleep(200);
rec(25, await evalJs(`({ uidErr: !!document.querySelector('#uid.err'), badNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) })`));
await setInput("#uid", "12345678"); await setInput("#zone", ""); await sleep(200);
rec(26, await evalJs(`({ badNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) })`));
// ---- 29: +62
await goHash("#/pulsa/telkomsel");
await setInput("#hp", "+6281234567890"); await sleep(300);
rec(29, await evalJs(`({ goodNote: document.querySelector('.note.good')?.textContent || null, badNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()), targetRow: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.startsWith('Tujuan'))?.textContent || null })`));
// ---- 46: stepper disabled di batas
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('86 Diamonds')); b?.click(); return 'ok'; })()`);
await sleep(300);
rec("46a", await evalJs(`({ qty: document.querySelector('.qty b')?.textContent, minusDisabled: document.querySelector('.qty button')?.disabled, plusDisabled: document.querySelector('.qty .plus')?.disabled })`));
for (let i = 0; i < 9; i++) { await click(".qty .plus"); await sleep(60); }
rec("46b", await evalJs(`({ qty: document.querySelector('.qty b')?.textContent, plusDisabled: document.querySelector('.qty .plus')?.disabled, minusDisabled: document.querySelector('.qty button')?.disabled })`));
// ---- 79: Enter di kolom promo — synthetic keydown tidak memicu submit
// form (hanya trusted event yang menjalankan default action browser),
// jadi verifikasi lewat struktur form + requestSubmit() yang nyata.
await setInput(".step input[aria-label='Kode promo']", "ROSDI10"); await sleep(200);
rec(79, await evalJs(`(() => { const input = document.querySelector(".step input[aria-label='Kode promo']"); const form = input?.form; const btn = form?.querySelector('button[type=submit]'); return { hasForm: !!form, submitBtnType: btn?.type || null, promoAppliedByEnter: 0 }; })()`));
await evalJs(`(() => { const input = document.querySelector(".step input[aria-label='Kode promo']"); input?.form?.requestSubmit(); return 'ok'; })()`);
await sleep(400);
rec("79b", await evalJs(`({ promoAppliedBySubmit: document.querySelectorAll('.sum-row.disc').length, promoMsg: document.querySelector('.step .note.good, .step .note.bad')?.textContent || null })`));
// ---- 57b/58: fokus kembali + kunci scroll (modal Masuk).
// Fokuskan dulu tombol pemicu (klik programatik tidak memindahkan fokus).
await goHash("#/");
await evalJs(`window.scrollTo(0, 500); 'ok'`); await sleep(400);
await evalJs(`(() => { const b = document.querySelector('.header-actions .btn'); b?.focus(); b?.click(); return 'ok'; })()`);
await sleep(400);
rec(58, await evalJs(`(async () => { const y0 = window.scrollY; window.scrollTo(0, 900); await new Promise((r) => setTimeout(r, 400)); return { yBefore: y0, yAfterAttempt: window.scrollY, bodyOverflow: getComputedStyle(document.body).overflow }; })()`));
await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); 'ok'`);
await sleep(300);
rec("57b", await evalJs(`({ modalClosed: !document.querySelector('.modal'), activeAfterClose: document.activeElement?.tagName + '.' + (document.activeElement?.className || '') + ':' + (document.activeElement?.textContent || '').trim().slice(0, 20) })`));
// ---- 48/54: seed order, salin token + riwayat klik
await evalJs(`(() => {
  const mk = (o) => ({ ref: o.ref, kind: o.kind, product: o.product, item: o.item, qty: 1, target: o.target, base: o.base, fee: o.fee, disc: 0, total: o.total, method: o.method, time: Date.now(), status: o.status, email: o.email || '', wa: '', token: o.token || null });
  localStorage.setItem('rosdi_orders', JSON.stringify([
    mk({ ref: 'RSD-TESTPLN1', kind: 'pln', product: 'Token PLN', item: 'Token 100.000', target: '543210987654', base: 102500, fee: 0, total: 102500, method: 'QRIS', status: 'Diproses', token: '1234 5678 9012 3456 7890' }),
  ]));
  return 'ok';
})()`);
await goHash("#/sukses/RSD-TESTPLN1");
rec(48, await evalJs(`({ tokenCopyBtn: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /salin/i.test(t)) })`));
await goHash("#/cek");
rec(54, await evalJs(`(async () => { const step = [...document.querySelectorAll('.step')].find((s) => s.textContent.includes('Transaksi terakhir')); const row = step?.querySelector('.sum-row'); if (!row) return { hasRows: false }; row.click(); await new Promise((r) => setTimeout(r, 500)); return { tag: row.tagName, hashAfterClick: location.hash, navigatedToSukses: location.hash === '#/sukses/RSD-TESTPLN1' }; })()`));
// ---- 73: zoom 200% di halaman produk (kartu nominal + ringkasan)
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200);
await evalJs(`document.documentElement.style.zoom = '2'; 'ok'`);
await sleep(400);
rec(73, await evalJs(`(() => { const de = document.documentElement; const nom = document.querySelector('.nom'); const sum = document.querySelector('.summary'); const sr = sum?.getBoundingClientRect(); return { scrollW: de.scrollWidth, innerW: window.innerWidth, hOverflow: de.scrollWidth > window.innerWidth + 1, nomW: nom ? Math.round(nom.getBoundingClientRect().width) : null, summaryRight: sr ? Math.round(sr.right) : null, summaryOverlaps: sr ? sr.right > window.innerWidth + 1 : null }; })()`));
await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);

writeFileSync(`${outDir}/s431b-${width}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI re-verify lebar", width, "—", Object.keys(R).length, "ide tercatat");
process.exit(0);
