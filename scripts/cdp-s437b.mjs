// Follow-up CDP batch s437b (lebar 390 saja): email panjang di Sukses,
// aria-hidden glif ✓, ukuran chip/input pencarian, label PLN.
// Penggunaan: node scripts/cdp-s437b.mjs <wsUrl> <width> <baseUrl> <outDir>
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

// --- Home: ukuran chip & input pencarian ---
await safe("b2_targets_home", async () => evalJs(`(() => {
  const m = (sel) => [...document.querySelectorAll(sel)].map(el => { const r = el.getBoundingClientRect(); return { t: (el.innerText || '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; });
  return { chips: m('.chip'), searchInput: m('.searchbar input'), searchField: m('.searchbar .field'), tabMin: null };
})()`));
// --- Game: glif ✓ guarantee + label zone/server ---
await goHash("#/game/mobile-legends");
await safe("b2_guarantee", async () => evalJs(`(() => {
  const g = document.querySelector('.guarantee span');
  return { guaranteeSpanText: g?.innerText, guaranteeSpanHidden: g?.getAttribute('aria-hidden'), guaranteeHTML: document.querySelector('.guarantee')?.innerHTML.slice(0, 120) };
})()`));
await safe("b2_labels", async () => evalJs(`(() => {
  const out = {};
  for (const f of ['zone', 'server']) { const l = document.querySelector('label[for=' + f + ']'); if (!l) { out[f] = 'NO-LABEL'; continue; } l.click(); out[f] = document.activeElement?.id || document.activeElement?.tagName; }
  return out;
})()`));
// --- Beli dgn email 200 karakter -> Sukses: baris email meluber? ---
await safe("b2_email_long_success", async () => {
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  const longMail = "a".repeat(190) + "@email.com";
  await setInput("#email", longMail);
  await evalJs(`(() => { document.querySelectorAll('.pay')[0].click(); return 'ok'; })()`);
  await sleep(300);
  await click(".summary .btn.big");
  await sleep(1500);
  return evalJs(`(() => {
    const row = [...document.querySelectorAll('.sum-row')].find(r => r.innerText.startsWith('Bukti dikirim ke'));
    if (!row) return { rowFound: false };
    const b = row.querySelector('b');
    const r = b.getBoundingClientRect();
    const wrap = document.querySelector('.wrap').getBoundingClientRect();
    return { rowFound: true, textLen: b.innerText.length, bWidth: Math.round(r.width), wrapRight: Math.round(wrap.right), bRight: Math.round(r.right), overflowsWrap: r.right > wrap.right + 1, scrollWvsClientW: b.scrollWidth + ' vs ' + b.clientWidth, rowScrollH: row.scrollHeight, rowClientH: row.clientHeight };
  })()`);
});
// --- Sukses: big-check aria-hidden ---
await safe("b2_bigcheck", async () => evalJs(`(() => {
  const bc = document.querySelector('.big-check');
  return { text: bc?.innerText, ariaHidden: bc?.getAttribute('aria-hidden'), role: bc?.getAttribute('role') };
})()`));
// --- PLN: klik label idpel ---
await goHash("#/pln");
await safe("b2_label_pln", async () => evalJs(`(() => { const l = document.querySelector('label[for=idpel]'); if (!l) return 'NO-LABEL'; l.click(); return { activeId: document.activeElement?.id }; })()`));

writeFileSync(`${outDir}/cdp-s437b-${width}.json`, JSON.stringify(R, null, 2));
console.log("DONE", width, Object.keys(R).length, "blok");
process.exit(0);
