// Ukur layout CDP batch s435 (cepat, tanpa interaksi berat): ide 51-60.
// Penggunaan: node scripts/cdp-s435-layout.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
mkdirSync(outDir, { recursive: true });
const R = {};
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const to = setTimeout(() => { pending.delete(id); reject(new Error("TIMEOUT " + method)); }, 25000);
    pending.set(id, { resolve: (v) => { clearTimeout(to); resolve(v); }, reject: (e) => { clearTimeout(to); reject(e); } });
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
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(900); };
const layoutSig = () => evalJs(`(() => {
  const cols = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { template: s.gridTemplateColumns, gap: s.columnGap, n: el.children.length }; };
  const hero = document.querySelector('.hero')?.getBoundingClientRect();
  const wrap = document.querySelector('.wrap')?.getBoundingClientRect();
  const foot = document.querySelector('.foot-in') ? getComputedStyle(document.querySelector('.foot-in')).gridTemplateColumns : null;
  const mb = document.querySelector('.mobile-bar');
  return {
    scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
    hOverflow: document.documentElement.scrollWidth > window.innerWidth,
    gameGrid: cols('.grid.c4'), utilGrid: cols('.grid.c3'), flashGrid: cols('.grid.c2'),
    trust: cols('.trust'), heroW: hero ? +hero.width.toFixed(1) : null,
    wrapW: wrap ? +wrap.width.toFixed(1) : null, footCols: foot,
    h1Size: document.querySelector('.hero h1') ? +getComputedStyle(document.querySelector('.hero h1')).fontSize.replace('px', '') : null,
    mobileBarVisible: mb ? getComputedStyle(mb).display !== 'none' : null,
  };
})()`);
const prodSig = () => evalJs(`(() => {
  const cols = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { template: s.gridTemplateColumns, gap: s.columnGap, n: el.children.length }; };
  return {
    scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
    hOverflow: document.documentElement.scrollWidth > window.innerWidth,
    flow: cols('.flow'), nomGrid: cols('.nom-grid'),
    asideW: document.querySelector('.summary')?.getBoundingClientRect().width ?? null,
    mobileBarVisible: (() => { const mb = document.querySelector('.mobile-bar'); return mb ? getComputedStyle(mb).display !== 'none' : null; })(),
  };
})()`);

console.log("layout: navigating", width);
await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 560 });
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2000);
R.home = await layoutSig();
console.log("layout: home done", width);
await goHash("#/game/mobile-legends");
R.product = await prodSig();
console.log("layout: product done", width);
if (width === 360 || width === 375) {
  // 57: bandingkan 360 vs 375 — tanda tangan layout dicatat di kedua file
  R.compareNote = "bandingkan home.gameGrid + product.flow dengan lebar pasangannya";
}
if (width === 1280) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 700, deviceScaleFactor: 1, mobile: false });
  await goHash("#/cek");
  R.cek59 = await evalJs(`({ scrollH: document.documentElement.scrollHeight, vh: window.innerHeight, needsScroll: document.documentElement.scrollHeight > window.innerHeight })`);
  console.log("layout: cek59 done");
  await send("Emulation.setPageScaleFactor", { pageScaleFactor: 1.25 });
  await goHash("#/game/mobile-legends");
  await sleep(600);
  R.zoom60 = await evalJs(`(() => { const f = document.querySelector('.flow'); const s = f ? getComputedStyle(f) : null; return { flowCols: s?.gridTemplateColumns, innerW: window.innerWidth, scrollW: document.documentElement.scrollWidth, hOverflow: document.documentElement.scrollWidth > window.innerWidth }; })()`);
  await send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  console.log("layout: zoom60 done");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  // 37: timeline Cek terstruktur
  await goHash("#/cek");
  await evalJs(`(() => { const el = document.querySelector('.step input'); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, 'RSD-DEMO1234'); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  await evalJs(`document.querySelector('.step .btn')?.click(); 'ok'`);
  await sleep(400);
  R.timeline37 = await evalJs(`(() => { const tl = document.querySelector('.timeline'); if (!tl) return null; return { tag: tl.tagName, items: [...tl.children].map((li) => ({ tag: li.tagName, cls: li.className, text: li.textContent.replace(/\\s+/g, ' ').trim() })) }; })()`);
  // 40: h1 Sukses via pembelian desktop
  await goHash("#/game/mobile-legends");
  await evalJs(`(() => { const set = (sel, v) => { const el = document.querySelector(sel); if (!el) return; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }; set('#uid', '12345678'); set('#zone', '1234'); return 'ok'; })()`);
  await evalJs(`(() => { const n = [...document.querySelectorAll('.nom')].find((e) => e.querySelector('.n-name')?.textContent.trim() === '172 Diamonds'); n?.click(); const p = [...document.querySelectorAll('.pay')].find((e) => e.querySelector('.p-name2')?.textContent.trim() === 'QRIS'); p?.click(); return 'ok'; })()`);
  await sleep(300);
  R.buyDesktop = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); if (!b || b.disabled) return { disabled: b?.disabled ?? 'NO-BTN' }; b.click(); return 'clicked'; })()`);
  await sleep(1200);
  R.sukses40 = await evalJs(`({ hash: location.hash, h1: document.querySelector('h1')?.textContent, total: document.querySelector('.sum-total b')?.textContent, hasGuarantee: /Garansi|garansi/.test(document.body.innerText) })`);
  console.log("layout: desktop extras done");
}
writeFileSync(`${outDir}/s435-layout-w${width}.json`, JSON.stringify(R, null, 1));
console.log(`LAYOUT W${width} OK`);
