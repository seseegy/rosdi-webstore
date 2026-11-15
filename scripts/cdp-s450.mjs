// Ukur runtime CDP batch s450: ide 75 (zoom 300%), 76 (forced-colors),
// 1-2 (animasi masuk Sukses/token), 6-8 (hover kartu), 4 (indikator UID valid).
// Penggunaan: node scripts/cdp-s450.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
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
const setMetrics = (w, h, mobile) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1200); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickEl = async (js) => evalJs(`(() => { ${js} })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 400) }); } };

await setMetrics(1280, 900, false);
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---- 1: transisi produk -> Sukses (animasi di step Sukses?) ----
await safe("anim1-sukses", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickEl(`const el=[...document.querySelectorAll('.nom')].find(e=>e.textContent.includes('172 Diamonds')); el&&el.click(); 'ok'`);
  await sleep(200);
  await clickEl(`const el=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('QRIS')); el&&el.click(); 'ok'`);
  await sleep(200);
  await clickEl(`const el=document.querySelector('.summary .btn.big'); el&&el.click(); 'ok'`);
  await sleep(900);
  return evalJs(`(() => { const step=document.querySelector('.step'); if(!step) return {sukses:false}; const s=getComputedStyle(step); const wrap=document.querySelector('.wrap'); const ws=wrap?getComputedStyle(wrap):null; return {sukses: !!document.querySelector('.big-check'), stepAnim: s.animationName, stepTrans: s.transitionDuration, wrapAnim: ws?ws.animationName:null}; })()`);
});
// ---- 2: token PLN di Sukses ----
await safe("anim2-token", async () => {
  await goHash("#/pln");
  await setInput("#idpel", "543210987654"); await sleep(200);
  await clickEl(`const el=[...document.querySelectorAll('.step .btn')].find(e=>e.textContent.includes('Cek Nama')); el&&el.click(); 'ok'`);
  await sleep(300);
  await clickEl(`const el=[...document.querySelectorAll('.nom')].find(e=>e.textContent.includes('Token 20.000')); el&&el.click(); 'ok'`);
  await sleep(200);
  await clickEl(`const el=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('QRIS')); el&&el.click(); 'ok'`);
  await sleep(200);
  await clickEl(`const el=document.querySelector('.summary .btn.big'); el&&el.click(); 'ok'`);
  await sleep(900);
  return evalJs(`(() => { const tb=document.querySelector('.token-box'); if(!tb) return {token:false}; const s=getComputedStyle(tb); return {token: tb.textContent.trim(), anim: s.animationName, trans: s.transitionDuration}; })()`);
});
// ---- 4: indikator UID valid (kelas input saat valid) ----
await safe("ind4-uid-valid", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "123"); await sleep(150);
  const invalidCls = await evalJs(`document.querySelector('#uid').className`);
  await setInput("#uid", "12345678"); await sleep(150);
  const validCls = await evalJs(`document.querySelector('#uid').className`);
  const validBorder = await evalJs(`getComputedStyle(document.querySelector('#uid')).borderColor`);
  await evalJs(`(() => { const el=document.querySelector('#uid'); el.value='123'; el.dispatchEvent(new Event('input',{bubbles:true})); return 'x'; })()`);
  await sleep(150);
  const invalidBorder2 = await evalJs(`getComputedStyle(document.querySelector('#uid')).borderColor`);
  return { invalidCls, validCls, validBorder, invalidBorder: invalidBorder2 };
});
// ---- 6: hover kartu paket data (PhonePage Data) ----
await safe("hover6-data", async () => {
  await goHash("#/data/telkomsel");
  const before = await evalJs(`(() => { const el=document.querySelector('.nom'); if(!el) return null; const s=getComputedStyle(el); return {border: s.borderColor, transform: s.transform, shadow: s.boxShadow}; })()`);
  const rect = await evalJs(`(() => { const el=document.querySelector('.nom'); const r=el.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
  await sleep(300);
  const after = await evalJs(`(() => { const el=document.querySelector('.nom'); const s=getComputedStyle(el); return {border: s.borderColor, transform: s.transform, shadow: s.boxShadow, hover: el.matches(':hover')}; })()`);
  return { before, after };
});
// ---- 7: hover kartu voucher (Beranda) ----
await safe("hover7-voucher", async () => {
  await goHash("#/");
  const before = await evalJs(`(() => { const el=[...document.querySelectorAll('a.card')].find(e=>e.textContent.includes('Voucher Google Play')); if(!el) return null; const s=getComputedStyle(el); return {border: s.borderColor, transform: s.transform}; })()`);
  const rect = await evalJs(`(() => { const el=[...document.querySelectorAll('a.card')].find(e=>e.textContent.includes('Voucher Google Play')); const r=el.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
  await sleep(300);
  const after = await evalJs(`(() => { const el=[...document.querySelectorAll('a.card')].find(e=>e.textContent.includes('Voucher Google Play')); const s=getComputedStyle(el); return {border: s.borderColor, transform: s.transform, hover: el.matches(':hover')}; })()`);
  return { before, after };
});
// ---- 8: hover kartu Tagihan (BillIndex) ----
await safe("hover8-tagihan", async () => {
  await goHash("#/tagihan");
  const before = await evalJs(`(() => { const el=[...document.querySelectorAll('a.card')].find(e=>e.textContent.includes('PDAM')); if(!el) return null; const s=getComputedStyle(el); return {border: s.borderColor, transform: s.transform}; })()`);
  const rect = await evalJs(`(() => { const el=[...document.querySelectorAll('a.card')].find(e=>e.textContent.includes('PDAM')); const r=el.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
  await sleep(300);
  const after = await evalJs(`(() => { const el=[...document.querySelectorAll('a.card')].find(e=>e.textContent.includes('PDAM')); const s=getComputedStyle(el); return {border: s.borderColor, transform: s.transform, hover: el.matches(':hover')}; })()`);
  return { before, after };
});
// ---- 75: zoom 300% ~ viewport 427px pada 1280 ----
await safe("zoom75-427", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: 427, height: 900, deviceScaleFactor: 1, mobile: true });
  await goHash("#/game/mobile-legends");
  return evalJs(`(() => {
    const de = document.documentElement;
    const over = [];
    document.querySelectorAll('.nom, .pay, .step, .crumb h1, .summary').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1) over.push(el.className + ' sw=' + el.scrollWidth + ' cw=' + el.clientWidth);
    });
    const gridCols = getComputedStyle(document.querySelector('.nom-grid')).gridTemplateColumns.split(' ').length;
    return { innerW: window.innerWidth, docScrollW: de.scrollWidth, bodyScrollW: document.body.scrollWidth, horizOverflow: de.scrollWidth > window.innerWidth, nomCols: gridCols, overflowEls: over.slice(0, 10) };
  })()`);
});
// ---- 76: forced-colors ----
await safe("forced76", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
  await goHash("#/");
  await sleep(400);
  const home = await evalJs(`(() => {
    const g = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { color: s.color, bg: s.backgroundColor, border: s.borderColor }; };
    return { body: g('body'), hero: g('.hero'), heroH1: g('.hero h1'), card: g('a.card'), tile: g('.tile'), badge: g('.badge'), btn: g('.hero .btn'), progressI: g('.progress i'), progressTrack: g('.progress'), chipOn: g('.chip.on') };
  })()`);
  await goHash("#/game/mobile-legends");
  await sleep(300);
  const mlbb = await evalJs(`(() => {
    const g = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { color: s.color, bg: s.backgroundColor, border: s.borderColor }; };
    return { nom: g('.nom'), nomOn: g('.nom.on'), pay: g('.pay'), input: g('.input'), stepNum: g('.step-num'), summaryTotal: g('.sum-total b') };
  })()`);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "none" }] });
  return { home, mlbb, forcedActive: await evalJs(`matchMedia('(forced-colors: active)').matches`) };
});

writeFileSync(outDir + "/cdp-s450.json", JSON.stringify(R, null, 1));
console.log("saved", outDir + "/cdp-s450.json");
process.exit(0);
