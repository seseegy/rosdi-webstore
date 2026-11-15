// Diagnostik s458: F72 Enter-submit (dengan text \r), A6 :active, A3 stagger, hero Dark.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, _wArg, baseUrl, outDir] = process.argv.slice(2);
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
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const pressEnter = async (withText) => {
  const p = { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  if (withText) p.text = "\r";
  await send("Input.dispatchKeyEvent", p);
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await sleep(400);
};
const rectOf = async (js) => evalJs(`(() => { const el = ${js}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);

await setMetrics(390);
await nav("#/");
await evalJs(`localStorage.clear(); 'ok'`);

// A3 (sintaks diperbaiki).
await safe("D-A3-flash", () => evalJs(`[...document.querySelectorAll('#katalog .card')].map((c) => ({ animName: getComputedStyle(c).animationName, delay: getComputedStyle(c).animationDelay, dur: getComputedStyle(c).animationDuration, animasi: c.getAnimations().map((a) => a.animationName) }))`));

// F72-diag: struktur form + Enter dengan text \r.
await nav("#/pln");
await safe("D-F72-diag", async () => {
  const pre = await evalJs(`(() => {
    const inp = document.querySelector('#idpel');
    const setV = ${setVal}; setV(inp, '543210987654');
    const form = inp.form;
    const btn = [...document.querySelectorAll('button')].find((b) => /Cek/.test(b.textContent));
    window.__submitted = 0;
    form?.addEventListener('submit', () => { window.__submitted++; });
    inp.focus();
    return { formAda: !!form, tombolDisabled: btn?.disabled, tombolType: btn?.type };
  })()`);
  await sleep(300);
  await pressEnter(true);
  const post = await evalJs(`(() => ({ submitted: window.__submitted, cekNamaTerpicu: !!document.querySelector('.note.good'), teksNote: document.querySelector('.note.good')?.textContent.trim().slice(0, 60) || null }))()`);
  return { ...pre, ...post };
});

// A6-diag: :active + elementFromPoint + buttons:1.
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
await evalJs(`(() => { const el = [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === 'QRIS'); el.click(); return 'ok'; })()`);
await sleep(300);
await safe("D-A6-active", async () => {
  await evalJs(`document.querySelector('.summary .btn.big').scrollIntoView({ block: 'center' }); 'ok'`);
  await sleep(400);
  const r = await rectOf(`document.querySelector('.summary .btn.big')`);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const atPoint = await evalJs(`(() => { const el = document.elementFromPoint(${cx}, ${cy}); return el ? (el.className + '|' + (el.textContent || '').trim().slice(0, 20)) : 'null'; })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: cx, y: cy, button: "left", buttons: 1, clickCount: 1 });
  await sleep(150);
  const t = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { matchesActive: b.matches(':active'), transform: getComputedStyle(b).transform }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: cx, y: cy, button: "left", buttons: 0, clickCount: 1 });
  return { rect: r, elementFromPoint: atPoint, ...t };
});

// Hero Dark: tombol hero harus tetap putih.
await nav("#/");
await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ganti tema').click(); return 'ok'; })()`);
await sleep(500);
await safe("D-hero-dark", () => evalJs(`(() => {
  const cs = (el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color }; };
  return { theme: document.documentElement.dataset.theme, tombolHero: cs(document.querySelector('.hero .btn')), tombolBiasa: cs(document.querySelector('header .btn')) };
})()`));
writeFileSync(outDir + "/cdp-s458-verify2.json", JSON.stringify(R, null, 1));
console.log("SELESAI-VERIFY2");
process.exit(0);
