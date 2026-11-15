// Ukur CDP s464. Berjalan via scripts/cdp-launch-s464.sh.
// Penggunaan: node scripts/cdp-s464.mjs <wsUrl> <widthAtauZoom> <baseUrl> <outDir> [mode]
// mode: main | widths | zooms390
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
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, text) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
const pressEnter = async () => { await keyEvent("keyDown", "Enter", "Enter", 13, "\r"); await keyEvent("keyUp", "Enter", "Enter", 13); await sleep(350); };
const pressSpace = async () => { await keyEvent("keyDown", " ", "Space", 32, " "); await keyEvent("keyUp", " ", "Space", 32); await sleep(350); };
const pressTab = async () => { await keyEvent("keyDown", "Tab", "Tab", 9); await keyEvent("keyUp", "Tab", "Tab", 9); await sleep(120); };
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
const pressAndRead = async (selJs) => {
  const c = await evalJs(`(() => { const el = (${selJs}); if (!el) return null; el.scrollIntoView({ behavior: 'instant', block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!c) return { ditemukan: false };
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1 });
  await sleep(90);
  const st = await evalJs(`(() => { const el = (${selJs}); const cs = getComputedStyle(el); return { active: el.matches(':active'), transform: cs.transform, tag: el.tagName, cls: (el.className || '').toString().slice(0, 40) }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1 });
  await sleep(250);
  return { ditemukan: true, ...st };
};
const focusBorder = async (selJs) => evalJs(`(() => {
  const el = (${selJs}); if (!el) return null;
  const before = getComputedStyle(el).borderColor;
  const tr = getComputedStyle(el).transition;
  el.focus();
  return new Promise((res) => setTimeout(() => {
    const cs = getComputedStyle(el);
    res({ sebelum: before, sesudah: cs.borderColor, outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, transition: tr, berubah: before !== cs.borderColor });
  }, 250));
})()`);
const setInputVal = async (sel, v) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const enterOn = async (selJs) => {
  const before = await evalJs(`location.hash`);
  await evalJs(`(() => { const el = (${selJs}); if (!el) return 'TIDAK ADA'; el.scrollIntoView({ behavior: 'instant', block: 'center' }); el.focus(); return 'ok'; })()`);
  await sleep(200);
  await pressEnter();
  await sleep(600);
  const after = await evalJs(`location.hash`);
  return { hashSebelum: before, hashSesudah: after, berpindah: before !== after };
};
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

if (MODE === "main") {
  await setMetrics(390, 844, true);
  // Seed 7 order riwayat agar toggle "Lihat semua" muncul (A8).
  await nav("#/");
  await evalJs(`(() => { const o = (i) => ({ ref: 'RSD-TEST' + String(i).padStart(4, '0'), product: 'Mobile Legends', item: '86 Diamonds', qty: 1, method: 'QRIS', time: Date.now() - i * 86400000, total: 21580, status: 'Sukses' }); localStorage.setItem('rosdi_orders', JSON.stringify([1, 2, 3, 4, 5, 6, 7].map(o))); return JSON.parse(localStorage.getItem('rosdi_orders')).length; })()`);
  // A1: tombol "Pakai" (isi promo dulu agar tidak disabled)
  await nav("#/game/mobile-legends");
  await setInputVal('input[aria-label="Kode promo"]', "ROSDI10");
  await safe("A1-pakai", () => pressAndRead(`document.querySelector('.promo-btn')`));
  // A2: tombol "Cek Nama" (isi ID PLN valid dulu)
  await nav("#/pln");
  await setInputVal('#idpel', "123456789012");
  await safe("A2-cek-nama", () => pressAndRead(`document.querySelector('form button[type="submit"]')`));
  // A3: stepper -/+ (naikkan qty dulu agar Kurangi aktif)
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { document.querySelector('button[aria-label="Tambah"]').click(); return 'ok'; })()`);
  await safe("A3-stepper-plus", () => pressAndRead(`document.querySelector('button[aria-label="Tambah"]')`));
  await safe("A3-stepper-minus", () => pressAndRead(`document.querySelector('button[aria-label="Kurangi"]')`));
  // A4-A7: kartu kategori Beranda
  await nav("#/");
  await safe("A4-kartu-data", () => pressAndRead(`document.querySelector('a.card[href="#/data"]')`));
  await nav("#/");
  await safe("A5-kartu-voucher", () => pressAndRead(`document.querySelector('a.card[href^="#/voucher/"]')`));
  await nav("#/");
  await safe("A6-kartu-ewallet", () => pressAndRead(`document.querySelector('a.card[href^="#/emoney/"]')`));
  await nav("#/");
  await safe("A7-kartu-pulsa", () => pressAndRead(`document.querySelector('a.card[href="#/pulsa"]')`));
  // A8: toggle "Lihat semua" riwayat
  await nav("#/cek");
  await safe("A8-lihat-semua", () => pressAndRead(`[...document.querySelectorAll('button.btn.ghost')].find(b => b.textContent.includes('Lihat semua'))`));
  // A9: tautan footer
  await nav("#/");
  await safe("A9-footer-link", () => pressAndRead(`document.querySelector('footer.site a')`));
  // A10: transisi border fokus Riot ID
  await nav("#/game/valorant");
  await safe("A10-fokus-riot", () => focusBorder(`document.querySelector('#riot')`));
  // F67: transisi border fokus WA
  await nav("#/game/mobile-legends");
  await safe("F67-fokus-wa", () => focusBorder(`document.querySelector('#wa')`));
  // F68: angka stepper — elemennya <b>, bukan input?
  await safe("F68-stepper-angka", () => evalJs(`(() => {
    const b = document.querySelector('.qty b'); if (!b) return { ditemukan: false };
    const cs = getComputedStyle(b); b.focus && b.focus();
    return { tag: b.tagName, teks: b.textContent, tabIndex: b.tabIndex, punyaTabindexAttr: b.hasAttribute('tabindex'), border: cs.borderWidth + ' ' + cs.borderStyle + ' ' + cs.borderColor, transition: cs.transition, aktifSetelahFocus: document.activeElement === b, adalahInput: b.tagName === 'INPUT' };
  })()`));
  // F71-F75: Enter di kartu kategori Beranda
  await nav("#/");
  await safe("F71-enter-data", () => enterOn(`document.querySelector('a.card[href="#/data"]')`));
  await nav("#/");
  await safe("F72-enter-voucher", () => enterOn(`document.querySelector('a.card[href^="#/voucher/"]')`));
  await nav("#/");
  await safe("F73-enter-tagihan", () => enterOn(`document.querySelector('a.card[href="#/tagihan"]')`));
  await nav("#/");
  await safe("F74-enter-pulsa", () => enterOn(`document.querySelector('a.card[href="#/pulsa"]')`));
  await nav("#/");
  await safe("F75-enter-ewallet", () => enterOn(`document.querySelector('a.card[href^="#/emoney/"]')`));
  // F76: Enter di baris metode bayar MLBB
  await nav("#/game/mobile-legends");
  await safe("F76-enter-metode", async () => {
    const sebelum = await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find(x => !x.classList.contains('on') && !x.disabled); return b ? { teks: b.textContent.trim().slice(0, 20), pressed: b.getAttribute('aria-pressed') } : null; })()`);
    await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find(x => !x.classList.contains('on') && !x.disabled); b.focus(); return 'ok'; })()`);
    await pressEnter();
    const sesudah = await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find(x => x.getAttribute('aria-pressed') === 'true'); return b ? { teks: b.textContent.trim().slice(0, 20), pressed: b.getAttribute('aria-pressed') } : null; })()`);
    return { sebelum, sesudah, terpilih: sebelum && sesudah && sesudah.teks === sebelum.teks };
  });
  // F77: Space di tab game MLBB
  await safe("F77-space-tab", async () => {
    const sebelum = await evalJs(`[...document.querySelectorAll('.tab')].find(t => t.classList.contains('on'))?.textContent`);
    await evalJs(`(() => { const t = [...document.querySelectorAll('.tab')].find(x => x.textContent.trim() === 'Weekly Pass'); t.focus(); return 'ok'; })()`);
    await pressSpace();
    const sesudah = await evalJs(`[...document.querySelectorAll('.tab')].find(t => t.classList.contains('on'))?.textContent`);
    const item0 = await evalJs(`document.querySelector('.nom .n-name')?.textContent`);
    return { sebelum, sesudah, itemPertama: item0, berpindah: sebelum !== sesudah };
  });
  // F78: Enter di tombol "Cek Nama" PLN
  await nav("#/pln");
  await setInputVal('#idpel', "123456789012");
  await safe("F78-enter-cek-nama", async () => {
    const teksSebelum = await evalJs(`document.querySelector('form button[type="submit"]')?.textContent`);
    await evalJs(`(() => { document.querySelector('form button[type="submit"]').focus(); return 'ok'; })()`);
    await pressEnter();
    await sleep(1200);
    const teksSesudah = await evalJs(`document.querySelector('form button[type="submit"]')?.textContent`);
    const nama = await evalJs(`(() => { const t = document.body.innerText; const m = t.match(/Nama pelanggan[^\n]*/); return m ? m[0].slice(0, 80) : null; })()`);
    return { teksSebelum, teksSesudah, nama, terpicu: teksSebelum !== teksSesudah || !!nama };
  });
  // Bersihkan seed riwayat (jangan tinggalkan data uji di profil CDP — profil memang sekali pakai).
  await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);
}

if (MODE === "widths") {
  const W = WIDTH;
  await setMetrics(W, 844, W < 900);
  if (W === 490) { await nav("#/"); await safe("G79-grid-490", () => gridInfo('#katalog .grid', '#katalog .card')); await safe("G79-overflow-490", () => evalJs(OVERFLOW_JS)); }
  if (W === 580) { await nav("#/game/mobile-legends"); await safe("G80-checkout-580", checkoutLayout); await safe("G80-overflow-580", () => evalJs(OVERFLOW_JS)); }
  if (W === 760) { await nav("#/"); await safe("G81-overflow-760", () => evalJs(OVERFLOW_JS)); await safe("G81-wrap-760", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w ? w.getBoundingClientRect() : null; return { innerWidth: window.innerWidth, wrapLebar: r ? +r.width.toFixed(1) : null, wrapKiri: r ? +r.left.toFixed(1) : null, wrapKanan: r ? +r.right.toFixed(1) : null }; })()`)); }
  if (W === 330) { await nav("#/"); await safe("G83-grid-330", () => gridInfo('#katalog .grid', '#katalog .card')); await safe("G83-overflow-330", () => evalJs(OVERFLOW_JS)); }
  if (W === 365) { await nav("#/game/mobile-legends"); await safe("G84-nom-365", () => gridInfo('.nom-grid', '.nom')); await safe("G84-overflow-365", () => evalJs(OVERFLOW_JS)); }
  if (W === 550) { await nav("#/game/mobile-legends"); await safe("G85-checkout-550", checkoutLayout); await safe("G85-overflow-550", () => evalJs(OVERFLOW_JS)); }
}

if (MODE === "zooms390") {
  const Z = WIDTH; // argumen = persen zoom
  await setMetrics(390, 844, true);
  await nav("#/");
  await evalJs(`document.documentElement.style.zoom = '${Z}%'; 'ok'`);
  await sleep(600);
  if (Z === 135) { await safe("G82-grid-z135", () => gridInfo('#katalog .grid', '#katalog .card')); await safe("G82-overflow-z135", () => evalJs(OVERFLOW_JS)); }
  if (Z === 115) { await safe("G86-grid-z115", () => gridInfo('#katalog .grid', '#katalog .card')); await safe("G86-overflow-z115", () => evalJs(OVERFLOW_JS)); }
  if (Z === 145) { await nav("#/game/mobile-legends"); await safe("G87-nom-z145", () => gridInfo('.nom-grid', '.nom')); await safe("G87-overflow-z145", () => evalJs(OVERFLOW_JS)); }
}
console.log("SELESAI-MODE", MODE);
process.exit(0);
