// Verifikasi perbaikan s437 (lebar 390): kontras border input, font 16px,
// harga satuan, qty+satuan di Sukses, aria-hidden, atribut Riot ID, footer.
// Penggunaan: node scripts/cdp-s437c.mjs <wsUrl> <width> <baseUrl> <outDir>
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
await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: true });

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1400); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const click = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);
await evalJs(`window.__lum = (rgb) => { const m = rgb.match(/\\d+(\\.\\d+)?/g).map(Number); const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
window.__ratio = (a, b) => { const l1 = window.__lum(a), l2 = window.__lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); }; 'ok'`);

// --- Home: font input pencarian + tinggi tautan footer ---
await safe("v_home", async () => evalJs(`(() => {
  const cs = (el, p) => getComputedStyle(el)[p];
  const si = document.querySelector('.searchbar input');
  const fl = [...document.querySelectorAll('footer a, footer button.flink')].map(el => Math.round(el.getBoundingClientRect().height));
  return { searchFontSize: cs(si, 'fontSize'), searchFieldBorder: cs(document.querySelector('.searchbar .field'), 'borderColor'), footerLinkHeights: fl, footerMin: Math.min(...fl) };
})()`));
// --- Game MLBB: kontras border + font input, harga satuan qty 2 ---
await goHash("#/game/mobile-legends");
await safe("v_input_light", async () => evalJs(`(() => {
  const cs = (el, p) => getComputedStyle(el)[p];
  const inp = document.querySelector('#uid');
  return { fontSize: cs(inp, 'fontSize'), borderRatio: window.__ratio(cs(inp, 'borderColor'), cs(inp, 'backgroundColor')), borderRaw: cs(inp, 'borderColor') };
})()`));
await safe("v_unitprice", async () => {
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[6].click(); return 'ok'; })()`);
  await evalJs(`(() => { document.querySelectorAll('.qty button')[1].click(); return 'ok'; })()`);
  await sleep(300);
  await evalJs(`(() => { document.querySelectorAll('.qty button')[1].click(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => ({ qty: document.querySelector('.qty b')?.innerText, hargaRow: [...document.querySelectorAll('.sum-row')].map(r => r.innerText.replace(/\\n/g, ' | ')).find(r => r.startsWith('Harga')) }))()`);
});
await safe("v_guarantee", async () => evalJs(`(() => ({ hidden: document.querySelector('.guarantee span')?.getAttribute('aria-hidden') }))()`));
// --- Beli -> Sukses: qty + harga satuan ---
await safe("v_success", async () => {
  await evalJs(`(() => { document.querySelectorAll('.pay')[0].click(); return 'ok'; })()`);
  await sleep(300);
  await click(".summary .btn.big");
  await sleep(1500);
  return evalJs(`(() => ({ rows: [...document.querySelectorAll('.sum-row, .sum-total')].map(r => r.innerText.replace(/\\n/g, ' | ')), bigCheckHidden: document.querySelector('.big-check')?.getAttribute('aria-hidden') }))()`);
});
// --- Valorant: atribut Riot ID ---
await goHash("#/game/valorant");
await safe("v_riot", async () => evalJs(`(() => { const el = document.querySelector('#riot'); return el ? { ac: el.getAttribute('autocapitalize'), acr: el.getAttribute('autocorrect'), sc: el.getAttribute('spellcheck') } : 'NO-RIOT'; })()`));
// --- Dark: kontras border input ---
await safe("v_input_dark", async () => {
  await click("button[aria-label='Ganti tema']");
  await sleep(400);
  return evalJs(`(() => { const cs = (el, p) => getComputedStyle(el)[p]; const inp = document.querySelector('#riot'); return { theme: document.documentElement.dataset.theme, fontSize: cs(inp, 'fontSize'), borderRatio: window.__ratio(cs(inp, 'borderColor'), cs(inp, 'backgroundColor')) }; })()`);
});
// --- 320 reflow pasca font 16px ---
await safe("v_reflow320", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
  await sleep(600);
  await goHash("#/game/mobile-legends");
  const r = await evalJs(`(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, overflowEls: [...document.querySelectorAll('body *')].filter(el => el.scrollWidth > 321 && !['HTML','BODY'].includes(el.tagName)).slice(0, 5).map(el => el.className?.toString().slice(0, 40)) }))()`);
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: true });
  return r;
});

writeFileSync(`${outDir}/cdp-s437c-${width}.json`, JSON.stringify(R, null, 2));
console.log("DONE", width, Object.keys(R).length, "blok");
process.exit(0);
