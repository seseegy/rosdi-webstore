// Probe fokus s451b: ulangi item yang gagal di cdp-s451 (15, 26, 31, 33, 61, 76, 89)
// dengan waitFor eksplisit + navigasi penuh per tes.
import { mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rec = (id, data) => console.log(id, JSON.stringify(data));
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
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
    if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
  }
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable");
await send("Runtime.enable");
const evalJs = (expression) => send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
});
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const waitFor = async (sel, ms = 8000) => evalJs(`new Promise((res) => { const t0 = Date.now(); const iv = setInterval(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (el || Date.now() - t0 > ${ms}) { clearInterval(iv); res(el ? 'OK:' + location.hash : 'TIMEOUT:' + location.hash); } }, 150); })`);
const nav = async (hash) => {
  await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`);
  await sleep(1800);
};
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickEl = async (js) => evalJs(`(() => { ${js} })()`);

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

// ---- 15: LCP via PerformanceObserver + navigasi segar ----
await safe("15-lcp", async () => {
  await evalJs(`window.__lcp = null; new PerformanceObserver((l) => { const es = l.getEntries(); window.__lcp = es[es.length-1]; }).observe({ type: 'largest-contentful-paint', buffered: true }); 'ok'`);
  await nav("#/");
  await sleep(2500);
  return evalJs(`(() => { const e = window.__lcp; if (!e) return { lcp: null }; return { lcpMs: Math.round(e.startTime), element: e.element ? e.element.tagName + '.' + String(e.element.className).slice(0,30) : null }; })()`);
});

// ---- 61: angka Arab di pencarian ----
await safe("61-arabic", async () => {
  await nav("#/");
  const w = await waitFor(".searchbar input");
  await setInput(".searchbar input", "١٢٣٤");
  await sleep(300);
  return { wait: w, ...(await evalJs(`(() => { const inp = document.querySelector('.searchbar input'); const empty = document.querySelector('.empty'); return { value: inp ? inp.value : null, emptyShown: !!empty, emptyText: empty ? empty.textContent.slice(0,70) : null }; })()`)) };
});

// ---- 26: sticky ringkasan 390 ----
await safe("26-sticky-390", async () => {
  await nav("#/game/mobile-legends");
  const w = await waitFor(".summary");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickEl(`const el=[...document.querySelectorAll('.nom')].find(e=>e.textContent.includes('172 Diamonds')); el&&el.click(); 'ok'`);
  await sleep(300);
  const top0 = await evalJs(`(() => { const s = document.querySelector('.summary'); if (!s) return { summary: false }; const r = s.getBoundingClientRect(); const cs = getComputedStyle(s); return { top: Math.round(r.top), position: cs.position, stickyTop: cs.top }; })()`);
  await evalJs(`window.scrollTo(0, 900); 'ok'`);
  await sleep(500);
  const top1 = await evalJs(`(() => { const s = document.querySelector('.summary'); if (!s) return { summary: false }; const r = s.getBoundingClientRect(); return { top: Math.round(r.top), scrollY: Math.round(window.scrollY) }; })()`);
  const mb = await evalJs(`(() => { const m = document.querySelector('.mobile-bar'); if (!m) return { bar: false }; const cs = getComputedStyle(m); const r = m.getBoundingClientRect(); return { display: cs.display, bottom: Math.round(r.bottom), vh: window.innerHeight, paddingBottom: cs.paddingBottom }; })()`);
  return { wait: w, top0, top1, mobileBar: mb };
});

// ---- 89: safe-area (di halaman produk, mobile-bar ada) ----
await safe("89-safearea", async () => evalJs(`(() => { const m = document.querySelector('.mobile-bar'); if (!m) return { bar: false }; const cs = getComputedStyle(m); return { display: cs.display, paddingBottom: cs.paddingBottom }; })()`));

// ---- 76: double-click Beli (halaman segar) ----
await safe("76-doublebuy", async () => {
  await nav("#/game/mobile-legends");
  await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);
  await waitFor(".summary");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickEl(`const el=[...document.querySelectorAll('.nom')].find(e=>e.textContent.includes('172 Diamonds')); el&&el.click(); 'ok'`);
  await sleep(200);
  await clickEl(`const el=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('QRIS')); el&&el.click(); 'ok'`);
  await sleep(200);
  const before = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  const btnState = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return b ? { disabled: b.disabled, text: b.textContent } : null; })()`);
  await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); b.click(); b.click(); return 'clicked2x'; })()`);
  await sleep(700);
  const after = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  return { before, btnState, after, hash: await evalJs(`location.hash`) };
});

// ---- 31: email + alias di voucher ----
await safe("31-email-plus", async () => {
  await nav("#/voucher/steam-wallet");
  const w = await waitFor("#vemail");
  await setInput("#vemail", "nama+rosdi@mail.com");
  await sleep(300);
  return { wait: w, ...(await evalJs(`(() => { const inp = document.querySelector('#vemail'); const bad = document.querySelector('.note.bad'); const btn = document.querySelector('.summary .btn.big'); return { errShown: !!bad, errText: bad ? bad.textContent : null, buyDisabled: btn ? btn.disabled : null, cls: inp ? inp.className : null }; })()`)) };
});

// ---- 33: Riot ID unicode (Valorant) ----
await safe("33-riot-unicode", async () => {
  await nav("#/game/valorant");
  const w = await waitFor("#riot");
  await setInput("#riot", "नामा#TAG");
  await sleep(300);
  return { wait: w, ...(await evalJs(`(() => { const inp = document.querySelector('#riot'); const bad = [...document.querySelectorAll('.note.bad')].map(n => n.textContent); const btn = document.querySelector('.summary .btn.big'); return { cls: inp ? inp.className : null, errShown: bad.length > 0, errText: bad[0] || null, buyDisabled: btn ? btn.disabled : null }; })()`)) };
});
console.log("DONE");
process.exit(0);
