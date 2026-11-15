// Re-uji E47 (email+WA di Sukses) + I88 (warna .note.good) — skrip kecil terpisah.
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
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(text)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickContains = async (sel, text) => evalJs(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]; const el = els.find((e) => e.textContent.includes(${JSON.stringify(text)})); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// E47
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678");
await setInput("#zone", "1234");
await clickContains(".nom", "172 Diamonds");
await clickContains(".pay", "QRIS");
await setInput("#email", "bukti@email.com");
await setInput("#wa", "081234567890");
await sleep(200);
rec("47buy", await evalJs(`(() => { const b = [...document.querySelectorAll('button.btn')].find((x) => x.textContent.trim() === 'Beli Sekarang'); return { disabled: b ? b.disabled : 'NO-BTN' }; })()`));
await clickText("button.btn", "Beli Sekarang");
await sleep(1500);
rec("47hash", await evalJs(`location.hash`));
rec("47rows", await evalJs(`[...document.querySelectorAll('.sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim())`));

// I88: pulsa page, note.good warna terhitung
await goHash("#/pulsa");
await setInput("#hp", "081234567890");
await sleep(500);
rec("88", await evalJs(`(() => { const el = document.querySelector('.note.good'); if (!el) return { found: false }; return { text: el.textContent, color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }; })()`));
rec("88var", await evalJs(`getComputedStyle(document.documentElement).getPropertyValue('--green').trim()`));

writeFileSync(`${outDir}/cdp-s432c.json`, JSON.stringify(R, null, 1));
ws.close();
console.log(JSON.stringify({ keys: Object.keys(R) }));
