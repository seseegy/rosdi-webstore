// Re-verifikasi s453 J91/J92 dengan selector benar (.note.bad) + nama item benar.
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, _widthArg, baseUrl, outDir] = process.argv.slice(2);
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
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1500); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 500) }); } };
const badNotes = () => evalJs(`[...document.querySelectorAll('.note.bad')].map(e => e.textContent.trim())`);
const summaryNotes = () => evalJs(`(() => { const s = document.querySelector('.summary'); if (!s) return 'NO-SUMMARY'; return [...s.querySelectorAll('.note')].map(n => n.textContent.trim()); })()`);
const buyState = () => evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return b ? { disabled: b.disabled } : 'NO-BTN'; })()`);

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);

await safe("J91c", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "123");
  await setInput("#zone", "1234");
  await clickText(".nom", "172 Diamonds");
  await clickText(".pay", "QRIS");
  return { page: await evalJs(`document.querySelector('h1,h2') ? document.querySelector('h1,h2').textContent : '?'`), buy: await buyState(), badNotes: await badNotes(), notes: await summaryNotes() };
});

await safe("J92c", async () => {
  await goHash("#/voucher/google-play");
  await sleep(500);
  const page = await evalJs(`(() => { const h = document.querySelector('h1'); return h ? h.textContent : 'NO-H1'; })()`);
  const emailSet = await setInput("#vemail", "namamail.com");
  const nomClick = await clickText(".nom", "Saldo 20.000");
  const payClick = await clickText(".pay", "QRIS");
  await sleep(300);
  return { page, emailSet, nomClick, payClick, buy: await buyState(), badNotes: await badNotes(), notes: await summaryNotes() };
});

writeFileSync(`${outDir}/s453-cdpg-390.json`, JSON.stringify({ width: 390, ...R }, null, 2));
ws.close();
console.log("DONE 390");
