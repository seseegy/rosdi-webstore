// Verifikasi susulan batch s432 (ide H80, G64, G68, G69, B11, E47, F55, I81, I82, I84, I88)
// setelah perbaikan kode. Penggunaan: node scripts/cdp-s432b.mjs <wsUrl> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
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
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(text)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickContains = async (sel, text) => evalJs(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]; const el = els.find((e) => e.textContent.includes(${JSON.stringify(text)})); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);

// ---- H80: 1024x768 landscape
await setMetrics(1024, 768);
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await goHash("#/game/mobile-legends");
rec(80, await evalJs(`(() => {
  const flow = getComputedStyle(document.querySelector('.flow')).gridTemplateColumns;
  const sum = document.querySelector('.summary');
  const r = sum.getBoundingClientRect();
  return { flowCols: flow, summaryTop: Math.round(r.top), summaryBottom: Math.round(r.bottom), summaryH: Math.round(r.height), viewportH: window.innerHeight, scrollW: document.documentElement.scrollWidth, vw: window.innerWidth };
})()`));

// ---- G64: tema tersimpan Light vs OS Dark
await evalJs(`localStorage.setItem('rosdi_theme', 'light'); 'ok'`);
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
await evalJs(`location.reload(); 'ok'`);
await sleep(2500);
rec(64, await evalJs(`({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem('rosdi_theme') })`));
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

// ---- B11: game satu tab (PUBG) — jumlah tombol tab
await setMetrics(390, 1000);
await goHash("#/game/pubg-mobile");
rec(11, await evalJs(`({ tabButtons: document.querySelectorAll('.tab').length, tabLabels: [...document.querySelectorAll('.tab')].map((t) => t.textContent.trim()) })`));
await goHash("#/game/valorant");
rec("11b", await evalJs(`({ tabButtons: document.querySelectorAll('.tab').length })`));

// ---- I81/I82/I84/I88: perbaikan a11y
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678");
await setInput("#zone", "1234");
await clickContains(".nom", "172 Diamonds");
await clickContains(".pay", "QRIS");
await sleep(300);
rec(81, await evalJs(`({ sumTotalLive: document.querySelector('.sum-total')?.getAttribute('aria-live'), mbLive: document.querySelector('.mb-total')?.getAttribute('aria-live') })`));
rec(82, await evalJs(`(() => {
  const sel = document.querySelector('.nom.on'); const unsel = document.querySelector('.nom:not(.on)');
  const paySel = document.querySelector('.pay.on'); const payUnsel = document.querySelector('.pay:not(.on)');
  const tabSel = document.querySelector('.tab.on'); const tabUnsel = document.querySelector('.tab:not(.on)');
  return {
    nomOnBorder: getComputedStyle(sel).borderWidth, nomOffBorder: getComputedStyle(unsel).borderWidth,
    payOnBorder: getComputedStyle(paySel).borderWidth, payOffBorder: getComputedStyle(payUnsel).borderWidth,
    tabOnWeight: getComputedStyle(tabSel).fontWeight, tabOffWeight: getComputedStyle(tabUnsel).fontWeight,
  };
})()`));
rec(84, await evalJs(`(() => {
  const a = document.querySelector('.skip-link');
  if (!a) return { exists: false };
  a.focus();
  const r = a.getBoundingClientRect();
  return { exists: true, href: a.getAttribute('href'), text: a.textContent, leftWhenFocused: Math.round(r.left), targetExists: !!document.querySelector('#konten') };
})()`));
rec(88, await evalJs(`(() => {
  const el = [...document.querySelectorAll('.note')].find((n) => n.classList.contains('good'));
  if (!el) return { noGoodNoteOnPage: true };
  return { greenNoteColor: getComputedStyle(el).color };
})()`));

// ---- G68: Escape saat fokus di input promo + modal terbuka
await goHash("#/");
await clickText(".header-actions .btn", "Masuk");
await sleep(400);
await goHash("#/game/mobile-legends");
await sleep(300);
// modal Masuk masih terbuka? (Header state bertahan karena App tidak remount saat hashchange)
rec("68setup", await evalJs(`({ modalOpen: !!document.querySelector('.modal') })`));
await evalJs(`(() => { const inp = document.querySelector('input[aria-label="Kode promo"]'); if (inp) inp.focus(); return document.activeElement?.getAttribute('aria-label'); })()`);
await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); 'ok'`);
await sleep(300);
rec(68, await evalJs(`({ modalOpenAfterEsc: !!document.querySelector('.modal'), focusAfter: document.activeElement?.tagName })`));

// ---- G69: buka-tutup-buka modal Masuk
await clickText(".header-actions .btn", "Masuk");
await sleep(400);
const firstOpen = await evalJs(`document.querySelector('.modal h3')?.textContent`);
await clickText(".modal .btn", "Siap, lanjut belanja");
await sleep(300);
await clickText(".header-actions .btn", "Masuk");
await sleep(400);
rec(69, await evalJs(`({ firstTitle: ${JSON.stringify(firstOpen)}, secondTitle: document.querySelector('.modal h3')?.textContent, modalOpen: !!document.querySelector('.modal'), inputsInModal: document.querySelectorAll('.modal input').length })`));
await clickText(".modal .btn", "Siap, lanjut belanja");
await sleep(300);

// ---- E47: email + WA keduanya terisi -> Sukses tampil keduanya
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678");
await setInput("#zone", "1234");
await clickContains(".nom", "172 Diamonds");
await clickContains(".pay", "QRIS");
await setInput("#email", "bukti@email.com");
await setInput("#wa", "081234567890");
await sleep(200);
await clickText("button.btn", "Beli Sekarang");
await sleep(1500);
rec(47, await evalJs(`(() => ({
  hash: location.hash,
  rows: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()),
})())`));

// ---- F55: Lacak dengan input kosong (setelah perbaikan)
await goHash("#/cek");
await setInput('input[aria-label="Nomor transaksi"]', "");
await clickText(".step .btn", "Lacak");
await sleep(400);
rec(55, await evalJs(`({ msgEmpty: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent), foundNull: !!document.querySelector('.note.bad') })`));

writeFileSync(`${outDir}/cdp-s432b.json`, JSON.stringify(R, null, 1));
ws.close();
console.log(JSON.stringify({ keys: Object.keys(R) }));
