// Round-2 CDP batch s449: ulangi probe yang gagal/inkonklusif di run 390.
// Perbaikan vs run 1:
// - fresh(): muat ulang BENAR (reload bila hash sama — assign ke hash yang sama
//   tidak navigasi & state React dipertahankan, itu sumber beberapa hasil aneh).
// - keyEnter(): keyDown Enter membawa text "\r" (pola cdp-s446-verify2) + verifikasi fokus.
// - Setiap probe mencatat location.hash + h1 agar halaman yang diukur jelas.
// - waitFor(): tunggu elemen muncul (chunk lazy) sebelum mengukur.
// Penggunaan: node scripts/cdp-s449b.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg, 10);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; console.log(id, JSON.stringify(data)); };

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
await send("Network.enable");
const setMetrics = (w, h, mobile) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 500) }); } };
const where = async () => evalJs(`(() => { const h1 = document.querySelector('h1'); return { hash: location.hash, h1: h1 ? h1.textContent : null }; })()`);
const waitFor = async (sel, timeoutMs = 6000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await evalJs(`!!document.querySelector(${JSON.stringify(sel)})`)) return true;
    await sleep(200);
  }
  return false;
};
// Muat ulang BENAR ke hash target (state React segar).
const fresh = async (hash) => {
  const cur = await evalJs(`location.hash`);
  if (cur === hash) { await evalJs(`location.reload()`); await sleep(2800); }
  else { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2400); }
  await waitFor("#konten", 6000);
};
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const focusEl = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.focus(); return document.activeElement === el ? 'focused' : 'NOT-FOCUSED'; })()`);
const keyEnter = async () => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
};
const fillMlbb = async () => { await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200); };
const buyFlow = async (nominalText, payText) => {
  await clickText(".nom", nominalText); await sleep(250);
  await clickText(".pay", payText); await sleep(250);
  const r = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); if(!b) return 'NO-BTN'; const dis=b.disabled; b.click(); return {disabled: dis}; })()`);
  await waitFor(".big-check, .empty", 6000);
  return r;
};

await setMetrics(WIDTH, 900, WIDTH < 500);
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---- anim2: Beli ditekan (scroll ke tombol dulu agar koordinat masuk viewport) ----
await safe("anim2b-beli-press", async () => {
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "172 Diamonds"); await sleep(200);
  await clickText(".pay", "QRIS"); await sleep(200);
  const scrolled = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); if(!b) return 'NO-BTN'; b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2, inView: r.top >= 0 && r.bottom <= window.innerHeight}; })()`);
  await sleep(300);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: scrolled.x, y: scrolled.y, button: "left", clickCount: 1 });
  await sleep(120);
  const during = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); const s=getComputedStyle(b); return {transform: s.transform, active: b.matches(':active')}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 5, y: 5, button: "left", clickCount: 1 });
  await sleep(300);
  return { scrolled, during, stayedOnGame: (await where()).hash.startsWith("#/game/") };
});

// ---- anim3: toast Salin (tunggu Sukses render dulu, dump tombol) ----
await safe("anim3b-toast", async () => {
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  await buyFlow("172 Diamonds", "QRIS");
  const w = await where();
  const buttonsBefore = await evalJs(`[...document.querySelectorAll('button')].map(e=>e.textContent.trim()).slice(0,12)`);
  const clickRes = await clickText(".btn.ghost", "Salin");
  await sleep(300);
  const atClick = await evalJs(`(() => { const t=document.querySelector('.toast'); const b=[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Disalin')); return {toast: !!t, btnText: b ? b.textContent : null}; })()`);
  await sleep(2300);
  const after = await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Salin'); return {backToSalin: !!b}; })()`);
  return { where: w, buttonsBefore, clickRes, atClick, after };
});

// ---- anim5: promo + .was (fresh benar, pastikan nominal terpilih) ----
await safe("anim5b-promo-was", async () => {
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  const nomClick = await clickText(".nom", "172 Diamonds"); await sleep(250);
  const nomOn = await evalJs(`[...document.querySelectorAll('.nom.on')].map(e=>e.textContent.replace(/\\s+/g,' ').trim()).slice(0,2)`);
  const setRes = await setInput(".step input[aria-label='Kode promo']", "ROSDI10"); await sleep(150);
  const pakaiClick = await clickText(".step .btn", "Pakai"); await sleep(400);
  return { where: await where(), nomClick, nomOn, setRes, pakaiClick,
    res: await evalJs(`(() => { const d=document.querySelector('.sum-row.disc'); const wasInSummary=document.querySelector('.summary .was'); const msg=document.querySelector('.note.good'); return {discRow: !!d, discAnim: d ? getComputedStyle(d).animationName : null, wasInSummary: !!wasInSummary, discText: d ? d.textContent : null, promoMsg: msg ? msg.textContent : null}; })()`) };
});

// ---- anim9: chip (diagnostik lengkap) ----
await safe("anim9b-chip", async () => {
  await fresh("#/");
  const before = await evalJs(`[...document.querySelectorAll('.chip')].map(e=>({t: e.textContent.trim(), on: e.classList.contains('on')}))`);
  const clickRes = await clickText(".chip", "Top Up Game"); await sleep(400);
  const after = await evalJs(`[...document.querySelectorAll('.chip')].map(e=>({t: e.textContent.trim(), on: e.classList.contains('on')}))`);
  const trans = await evalJs(`(() => { const c=[...document.querySelectorAll('.chip')].find(e=>e.classList.contains('on')); if(!c) return null; const s=getComputedStyle(c); return {transProp: s.transitionProperty, transDur: s.transitionDuration, bg: s.backgroundColor}; })()`);
  return { where: await where(), before, clickRes, after, trans };
});

// ---- anim10: server select Genshin (fresh + waitFor) ----
await safe("anim10b-server-select", async () => {
  await fresh("#/game/genshin-impact");
  const ok = await waitFor("#server", 6000);
  return { where: await where(), serverFound: ok,
    res: await evalJs(`(() => { const s=document.querySelector('#server'); if(!s) return {found:false}; return {found:true, tag: s.tagName, options: [...s.options].map(o=>o.value)}; })()`) };
});

// ---- harga54: fee warning (fresh benar + catat halaman + state item/pay) ----
await safe("harga54b-fee-warning", async () => {
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  const nomClick = await clickText(".nom", "3 Diamonds"); await sleep(250);
  const payClick = await clickText(".pay", "BCA Virtual Account"); await sleep(300);
  return { where: await where(), nomClick, payClick,
    state: await evalJs(`(() => { const item=[...document.querySelectorAll('.nom.on')].map(e=>e.textContent.replace(/\\s+/g,' ').trim().slice(0,30)); const pay=[...document.querySelectorAll('.pay.on')].map(e=>e.textContent.replace(/\\s+/g,' ').trim().slice(0,30)); return {item, pay}; })()`),
    stepNotes: await evalJs(`[...document.querySelectorAll('.step .note')].map(e=>e.textContent)`),
    summaryNotes: await evalJs(`[...document.querySelectorAll('.summary .note')].map(e=>e.textContent)`) };
});

// ---- harga56-57: default segar (fresh benar) ----
await safe("harga56-57b-default", async () => {
  await fresh("#/game/mobile-legends");
  return { where: await where(),
    res: await evalJs(`(() => { const on=[...document.querySelectorAll('.pay.on')].length; const b=document.querySelector('.summary .btn.big'); const note=[...document.querySelectorAll('.summary .note')].map(e=>e.textContent).find(t=>t.includes('Untuk membeli')); const itemOn=[...document.querySelectorAll('.nom.on')].length; return {paySelected: on, itemSelected: itemOn, beliDisabled: b.disabled, note: note || null}; })()`) };
});

// ---- nav61-63: route tak dikenal (sintaks diperbaiki) ----
await safe("nav61-63b", async () => {
  const r = {};
  await fresh("#/xyz");
  r.xyz = await evalJs(`(() => { const h1 = document.querySelector('h1'); return { h1: h1 ? h1.textContent : null, hero: !!document.querySelector('.hero') }; })()`);
  await fresh("#/game/xyz");
  r.gameXyz = await evalJs(`(() => { const h1 = document.querySelector('h1'); return { h1: h1 ? h1.textContent : null, hero: !!document.querySelector('.hero') }; })()`);
  await fresh("#/pulsa/xyz");
  r.pulsaXyz = await evalJs(`(() => { const h1 = document.querySelector('h1'); return { h1: h1 ? h1.textContent : null }; })()`);
  return r;
});

// ---- nav64: localStorage rusak ----
await safe("nav64b-corrupt-storage", async () => {
  await evalJs(`localStorage.setItem('rosdi_orders', 'bukan-json{{{'); 'ok'`);
  await fresh("#/cek");
  return evalJs(`(() => { const konten = !!document.querySelector('#konten'); return { crashed: !konten, emptyState: document.body.innerText.includes('Belum ada transaksi'), bodyStart: document.body.innerText.slice(0, 120) }; })()`);
});

// ---- nav65: dua tab (diagnostik tab 2) ----
await safe("nav65b-two-tabs", async () => {
  await evalJs(`localStorage.clear(); 'ok'`);
  const listRes = await fetch("http://127.0.0.1:9222/json/new?url=" + encodeURIComponent(baseUrl + "#/cek"), { method: "PUT" }).then((r) => r.json()).catch((e) => ({ ERROR: String(e) }));
  const tab2 = listRes && listRes.webSocketDebuggerUrl ? listRes.webSocketDebuggerUrl : null;
  if (!tab2) return { tab2: null, listRes };
  const ws2 = new WebSocket(tab2);
  let id2 = 1000; const pend2 = new Map();
  const send2 = (method, params = {}) => new Promise((resolve, reject) => { const id = id2++; pend2.set(id, { resolve, reject }); ws2.send(JSON.stringify({ id, method, params })); });
  ws2.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend2.has(m.id)) { const { resolve, reject } = pend2.get(m.id); pend2.delete(m.id); if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); } };
  await new Promise((res, rej) => { ws2.onopen = res; ws2.onerror = rej; });
  await send2("Page.enable"); await send2("Runtime.enable");
  const eval2 = (expression) => send2("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error("tab2 eval fail: " + JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; });
  await sleep(3000);
  const tab2state = await eval2(`(() => { return { href: location.href, title: document.title, konten: !!document.querySelector('#konten'), bodyLen: document.body.innerText.length, emptyState: document.body.innerText.includes('Belum ada transaksi'), h1: document.querySelector('h1') ? document.querySelector('h1').textContent : null }; })()`);
  // Buat order di tab 1
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  await buyFlow("3 Diamonds", "QRIS");
  await sleep(1500);
  const after = await eval2(`(() => { const rows=[...document.querySelectorAll('button.sum-row')].length; return { histRows: rows, hasRef: /RSD-/.test(document.body.innerText), emptyStill: document.body.innerText.includes('Belum ada transaksi'), ordersInStorage: JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length }; })()`);
  ws2.close();
  return { tab2state, after };
});

// ---- nav68: metode bertahan ganti tab (pilih nominal lagi di tab baru, baru cek .pay.on) ----
await safe("nav68b-pay-tab", async () => {
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "3 Diamonds"); await sleep(200);
  await clickText(".pay", "GoPay"); await sleep(200);
  const payBefore = await evalJs(`[...document.querySelectorAll('.pay.on')].map(e=>e.textContent.replace(/\\s+/g,' ').trim().slice(0,20))`);
  await clickText(".tab", "Weekly Pass"); await sleep(300);
  const tabOn = await evalJs(`[...document.querySelectorAll('.tab.on')].map(e=>e.textContent.trim())`);
  const payHidden = await evalJs(`document.querySelectorAll('.pay').length`);
  await clickText(".nom", "Weekly Diamond Pass"); await sleep(300);
  const payAfter = await evalJs(`[...document.querySelectorAll('.pay.on')].map(e=>e.textContent.replace(/\\s+/g,' ').trim().slice(0,20))`);
  return { payBefore, tabOn, payButtonsWhileNoItem: payHidden, payAfter };
});

// ---- nav70: Enter di promo (text \r + verifikasi fokus) ----
await safe("nav70b-enter-promo", async () => {
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "3 Diamonds"); await sleep(200);
  const setRes = await setInput(".step input[aria-label='Kode promo']", "ROSDI10"); await sleep(150);
  const focusRes = await focusEl(".step input[aria-label='Kode promo']");
  await keyEnter();
  await sleep(500);
  return { setRes, focusRes,
    res: await evalJs(`(() => { const m=document.querySelector('.note.good'); const d=document.querySelector('.sum-row.disc'); return {applied: !!d, discText: d ? d.textContent : null, msg: m ? m.textContent : null}; })()`) };
});

// ---- a11y72: Enter di Cek (text \r + verifikasi fokus + kontrol klik tombol) ----
await safe("a11y72b-enter-cek", async () => {
  await fresh("#/cek");
  const setRes = await setInput(".step input", "RSD-DEMO1234"); await sleep(150);
  const valAfterSet = await evalJs(`document.querySelector('.step input').value`);
  const focusRes = await focusEl(".step input");
  await keyEnter();
  await sleep(800);
  const afterEnter = await evalJs(`(() => { const r=document.querySelector('.cek-result'); return {resultShown: !!r, text: r ? r.textContent.slice(0,80) : null}; })()`);
  let afterClick = null;
  if (!afterEnter.resultShown) {
    const clickRes = await clickText(".step .btn", "Cek"); await sleep(600);
    afterClick = { clickRes, res: await evalJs(`(() => { const r=document.querySelector('.cek-result'); return {resultShown: !!r, text: r ? r.textContent.slice(0,80) : null}; })()`) };
  }
  return { setRes, valAfterSet, focusRes, afterEnter, afterClick };
});

// ---- a11y77: landmark (sintaks diperbaiki) ----
await safe("a11y77b-landmarks", async () => {
  await fresh("#/");
  return evalJs(`(() => { return { header: !!document.querySelector('header'), nav: !!document.querySelector('nav'), main: !!document.querySelector('main#konten'), footer: !!document.querySelector('footer'), skipLink: !!document.querySelector('.skip-link') }; })()`);
});

writeFileSync(`${outDir}/cdp-s449b-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).length, "probes");
process.exit(0);
