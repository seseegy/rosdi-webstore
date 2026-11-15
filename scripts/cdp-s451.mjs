// Probe runtime CDP batch s451: ide 4 (trap modal), 8 (fokus ganti tab),
// 15 (LCP), 26 (sticky ringkasan 390px), 28 (countdown), 61 (angka Arab),
// 76 (double-click Beli), 97 (shortcut /), 89 (safe-area), 31/33/39/40 (validasi runtime).
// Penggunaan: node scripts/cdp-s451.mjs <wsUrl> <width> <baseUrl> <outDir>
import { mkdirSync } from "node:fs";

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
// Input.dispatchKeyEvent dipakai tanpa Input.enable (domain tidak ada di build ini).
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1200); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickEl = async (js) => evalJs(`(() => { ${js} })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 400) }); } };
const key = async (type, k, code, keyCode) => send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });

const width = Number(process.argv[3]) || 390;
await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: width <= 560 });
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---- 15: LCP Beranda ----
await safe("15-lcp", async () => evalJs(`(() => { const es = performance.getEntriesByType('largest-contentful-paint'); if (!es.length) return { lcp: null, note: 'no LCP entry yet' }; const e = es[es.length - 1]; return { lcpMs: Math.round(e.startTime), element: e.element ? e.element.tagName + '.' + (e.element.className || '') : null, url: (e.url || '').slice(-40) }; })()`));

// ---- 97: shortcut / ----
await safe("97-slash", async () => {
  await evalJs(`document.activeElement && document.activeElement.blur(); 'ok'`);
  await key("keyDown", "/", "Slash", 191); await key("keyUp", "/", "Slash", 191);
  await sleep(200);
  return evalJs(`(() => { const a = document.activeElement; return { active: a ? (a.tagName + '#' + (a.id || '') + ' aria=' + (a.getAttribute('aria-label') || '')) : 'BODY', searchFocused: a && a.closest ? !!a.closest('.searchbar') : false }; })()`);
});

// ---- 61: angka Arab di pencarian ----
await safe("61-arabic", async () => {
  await setInput(".searchbar input", "١٢٣٤");
  await sleep(300);
  return evalJs(`(() => { const inp = document.querySelector('.searchbar input'); const empty = document.querySelector('.empty'); return { value: inp.value, valueLen: inp.value.length, emptyShown: !!empty, emptyText: empty ? empty.textContent.slice(0, 60) : null }; })()`);
});
await setInput(".searchbar input", "");

// ---- 4: trap modal Masuk ----
await safe("04-modal-trap", async () => {
  await clickEl(`const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Masuk'); b&&b.click(); 'ok'`);
  await sleep(400);
  const focusables = await evalJs(`(() => { const m = document.querySelector('.modal'); if (!m) return { modal: false }; const els = [...m.querySelectorAll('button, [href], input, [tabindex]')].filter(e => !e.disabled); return { modal: true, n: els.length, firstActive: document.activeElement === m }; })()`);
  // Tab 6x dari dalam modal
  let escaped = false;
  for (let i = 0; i < 6; i++) {
    await key("keyDown", "Tab", "Tab", 9); await key("keyUp", "Tab", "Tab", 9);
    await sleep(120);
    const inside = await evalJs(`(() => { const m = document.querySelector('.modal'); return m ? m.contains(document.activeElement) : false; })()`);
    if (!inside) { escaped = true; break; }
  }
  await key("keyDown", "Escape", "Escape", 27); await key("keyUp", "Escape", "Escape", 27);
  await sleep(300);
  return { ...focusables, escapedAfterTab: escaped, modalClosedByEsc: await evalJs(`!document.querySelector('.modal')`) };
});

// ---- 8: fokus setelah ganti tab nominal game ----
await safe("08-focus-tab", async () => {
  await goHash("#/game/mobile-legends");
  const before = await evalJs(`document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className||'') : 'BODY'`);
  await clickEl(`const t=[...document.querySelectorAll('.tab')].find(e=>e.textContent.trim()==='Weekly Pass'); t&&t.click(); 'ok'`);
  await sleep(300);
  const after = await evalJs(`(() => { const a = document.activeElement; return { tag: a.tagName, cls: String(a.className).slice(0,40), text: (a.textContent||'').trim().slice(0,30), headingFocused: a.tagName === 'H2' }; })()`);
  return { before, after };
});

// ---- 26: sticky ringkasan mobile 390 ----
await safe("26-sticky-390", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickEl(`const el=[...document.querySelectorAll('.nom')].find(e=>e.textContent.includes('172 Diamonds')); el&&el.click(); 'ok'`);
  await sleep(300);
  const top0 = await evalJs(`(() => { const s = document.querySelector('.summary'); const r = s.getBoundingClientRect(); const cs = getComputedStyle(s); return { top: Math.round(r.top), position: cs.position, stickyTop: cs.top }; })()`);
  await evalJs(`window.scrollTo(0, 800); 'ok'`);
  await sleep(400);
  const top1 = await evalJs(`(() => { const s = document.querySelector('.summary'); const r = s.getBoundingClientRect(); return { top: Math.round(r.top), scrollY: Math.round(window.scrollY) }; })()`);
  const mb = await evalJs(`(() => { const m = document.querySelector('.mobile-bar'); if (!m) return null; const cs = getComputedStyle(m); const r = m.getBoundingClientRect(); return { display: cs.display, bottom: Math.round(r.bottom), vh: window.innerHeight, paddingBottom: cs.paddingBottom }; })()`);
  return { top0, top1, mobileBar: mb };
});

// ---- 28: countdown flash ----
await safe("28-countdown", async () => {
  await goHash("#/");
  await sleep(300);
  return evalJs(`(() => { const c = document.querySelector('.count-chip'); if (!c) return { chip: false }; const cs = getComputedStyle(c); return { text: c.textContent, animationName: cs.animationName, cls: c.className }; })()`);
});

// ---- 89: safe-area mobile-bar ----
await safe("89-safearea", async () => evalJs(`(() => { const m = document.querySelector('.mobile-bar'); if (!m) return { bar: false }; const cs = getComputedStyle(m); return { paddingBottom: cs.paddingBottom, hasEnv: cs.paddingBottom.includes('env') || document.styleSheets.length >= 0, raw: cs.cssText.slice(0, 0) }; })()`));

// ---- 76: double-click Beli ----
await safe("76-doublebuy", async () => {
  await goHash("#/game/mobile-legends");
  await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickEl(`const el=[...document.querySelectorAll('.nom')].find(e=>e.textContent.includes('172 Diamonds')); el&&el.click(); 'ok'`);
  await sleep(200);
  await clickEl(`const el=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('QRIS')); el&&el.click(); 'ok'`);
  await sleep(200);
  const before = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  // dua klik sinkron berurutan dalam satu task JS
  await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); b.click(); b.click(); return 'clicked2x'; })()`);
  await sleep(600);
  const after = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  return { before, after, hash: await evalJs(`location.hash`) };
});

// ---- 31: email + alias di voucher ----
await safe("31-email-plus", async () => {
  await goHash("#/voucher/steam-wallet");
  await setInput("#vemail", "nama+rosdi@mail.com");
  await sleep(300);
  return evalJs(`(() => { const inp = document.querySelector('#vemail'); const bad = document.querySelector('.note.bad'); const btn = document.querySelector('.summary .btn.big'); return { errShown: !!bad, errText: bad ? bad.textContent : null, buyDisabled: btn ? btn.disabled : null, cls: inp.className }; })()`);
});

// ---- 33: Riot ID unicode (Valorant) ----
await safe("33-riot-unicode", async () => {
  await goHash("#/game/valorant");
  await setInput("#riot", "नामा#TAG");
  await sleep(300);
  return evalJs(`(() => { const inp = document.querySelector('#riot'); const bad = [...document.querySelectorAll('.note.bad')].map(n => n.textContent); const btn = document.querySelector('.summary .btn.big'); return { cls: inp.className, errShown: bad.length > 0, errText: bad[0] || null, buyDisabled: btn ? btn.disabled : null }; })()`);
});

// ---- 39: PLN 99999999999 ----
await safe("39-pln-999", async () => {
  await goHash("#/pln");
  await setInput("#idpel", "99999999999");
  await sleep(300);
  return evalJs(`(() => { const inp = document.querySelector('#idpel'); const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Cek Nama')); return { cls: inp.className, cekDisabled: btn ? btn.disabled : null }; })()`);
});

// ---- 40: Zone 001234 + 00001234 ----
await safe("40-zone-zeros", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "001234");
  await sleep(300);
  const a = await evalJs(`(() => { const z = document.querySelector('#zone'); const sum = document.querySelector('.summary'); return { cls: z.className, target: [...sum.querySelectorAll('.sum-row')].find(r => r.textContent.includes('Tujuan'))?.textContent || null }; })()`);
  await setInput("#zone", "00001234");
  await sleep(300);
  const b = await evalJs(`(() => { const z = document.querySelector('#zone'); return { cls: z.className }; })()`);
  return { zone001234: a, zone00001234: b };
});

console.log("DONE", JSON.stringify(R, null, 1).slice(0, 200));
process.exit(0);
