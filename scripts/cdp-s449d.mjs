// Round-4 CDP batch s449 (mikro): anim2 desktop time-series + nav65 iframe.
// Penggunaan: node scripts/cdp-s449d.mjs <wsUrl> <width> <baseUrl> <outDir>
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
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 500) }); } };
const waitFor = async (sel, timeoutMs = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await evalJs(`!!document.querySelector(${JSON.stringify(sel)})`)) return true;
    await sleep(200);
  }
  return false;
};
const fresh = async (hash) => {
  const cur = await evalJs(`location.hash`);
  if (cur === hash) { await evalJs(`location.reload()`); await sleep(2800); }
  else { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2400); }
  await waitFor("#konten", 6000);
};
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const fillMlbb = async () => { await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200); };

await setMetrics(WIDTH, 900, WIDTH < 500);
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---- anim2 time-series: transform selama tekan ----
await safe("anim2d-press-series", async () => {
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "172 Diamonds"); await sleep(200);
  await clickText(".pay", "QRIS"); await sleep(200);
  const reducedMotion = await evalJs(`matchMedia('(prefers-reduced-motion: reduce)').matches`);
  await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); b.scrollIntoView({block:'center', behavior:'instant'}); return 'ok'; })()`);
  await sleep(600);
  const rect = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); const r=b.getBoundingClientRect(); const at=document.elementFromPoint(r.x + r.width/2, r.y + r.height/2); return {x: r.x + r.width/2, y: r.y + r.height/2, inView: r.top >= 0 && r.bottom <= window.innerHeight, hitEl: at ? (at.tagName + '.' + (at.className||'').toString().slice(0,40)) : null, hitIsBtn: at === b || b.contains(at)}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  const series = [];
  for (const t of [50, 150, 300, 500]) {
    await sleep(t === 50 ? 50 : t - series[series.length - 1].t);
    const v = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); const s=getComputedStyle(b); return {transform: s.transform, active: b.matches(':active')}; })()`);
    series.push({ t, ...v });
  }
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 5, y: 5, button: "left", clickCount: 1 });
  await sleep(300);
  const after = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); return {transform: getComputedStyle(b).transform, active: b.matches(':active')}; })()`);
  return { reducedMotion, rect, series, after, stayedOnGame: (await evalJs(`location.hash`)).startsWith("#/game/") };
});

// ---- nav65 iframe: storage event NYATA antar-dokumen (tanpa tab baru) ----
await safe("nav65d-iframe-storage", async () => {
  await evalJs(`localStorage.clear(); 'ok'`);
  await fresh("#/");
  // iframe Cek di Beranda
  await evalJs(`(() => { const f=document.createElement('iframe'); f.id='cek-frame'; f.src=${JSON.stringify(baseUrl + '#/cek')}; f.style.cssText='position:fixed;left:0;top:0;width:390px;height:600px;z-index:9999;background:#fff'; document.body.appendChild(f); return 'ok'; })()`);
  await sleep(3000);
  const frameBefore = await evalJs(`(() => { const f=document.getElementById('cek-frame'); if(!f || !f.contentDocument) return 'NO-FRAME'; const d=f.contentDocument; return {konten: !!d.querySelector('#konten'), emptyState: d.body.innerText.includes('Belum ada transaksi'), h1: d.querySelector('h1') ? d.querySelector('h1').textContent : null}; })()`);
  // Buat order di dokumen UTAMA (menulis localStorage -> event storage NYATA ke iframe)
  await evalJs(`(() => { const o={ref:'RSD-IFRAME001', product:'Mobile Legends', item:'3 Diamonds', target:'12345678 (1234)', method:'QRIS', total:1650, status:'Diproses', time: Date.now()}; const arr=JSON.parse(localStorage.getItem('rosdi_orders')||'[]'); arr.unshift(o); localStorage.setItem('rosdi_orders', JSON.stringify(arr)); return 'ok'; })()`);
  await sleep(1200);
  const frameAfter = await evalJs(`(() => { const f=document.getElementById('cek-frame'); const d=f.contentDocument; const rows=[...d.querySelectorAll('button.sum-row')].length; return {histRows: rows, hasRef: d.body.innerText.includes('RSD-IFRAME001'), emptyStill: d.body.innerText.includes('Belum ada transaksi')}; })()`);
  await evalJs(`document.getElementById('cek-frame').remove(); 'ok'`);
  return { frameBefore, frameAfter };
});

writeFileSync(`${outDir}/cdp-s449d-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).length, "probes");
process.exit(0);
