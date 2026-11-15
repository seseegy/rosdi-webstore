// Probe CDP s456 run-4 (width 390): J97 ulang dgn pembacaan benar + I88 ulang
// dgn penggandaan font DUA-PASS (kumpulkan dulu, baru terapkan — pass
// satu-pass run-1 menggandakan 4x elemen ber-font inherited).
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
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
const payClick = `(name) => { const el = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes(name) && !p.disabled); if (!el) return 'TIDAK-ADA-PAY:' + name; el.click(); return 'klik-pay:' + name; }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__inp=[]; new PerformanceObserver((l)=>{for(const e of l.getEntries()){if(e.interactionId)window.__inp.push({name:e.name,dur:Math.round(e.duration)});}}).observe({type:'event',buffered:true,durationThreshold:16});` });
await setMetrics(390);
await evalJs(`location.reload(); 'ok'`);
await sleep(3000);

// ---------- J97 ulang (benar): 2 order ROSDI10, baca ringkasan + order tersimpan ----------
const orderWithPromo = async (tag) => {
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await evalJs(`(${payClick})('QRIS')`);
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.btn', 'Pakai')`);
  await sleep(400);
  const summary = await evalJs(`(() => { const row = document.querySelector('.sum-row.disc b'); const tot = document.querySelector('.sum-total b'); return { discRow: row?.textContent || null, total: tot?.textContent || null }; })()`);
  const beli = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn') || document.querySelector('.summary .btn.big'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: b.disabled }; })()`);
  if (!beli.disabled) {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: beli.x, y: beli.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: beli.x, y: beli.y, button: "left", clickCount: 1 });
  }
  await sleep(1500);
  const stored = await evalJs(`(() => { const m = location.hash.match(/#\\/sukses\\/(.+)/); if (!m) return { hash: location.hash, stored: null }; const o = (JSON.parse(localStorage.getItem('rosdi_orders') || '[]')).find((x) => x.ref === m[1]); return { hash: location.hash, stored: o ? { ref: o.ref, item: o.item, disc: o.disc, total: o.total, method: o.method } : 'TIDAK-TEMEUKAN-DI-STORAGE' }; })()`);
  return { tag, summary, stored };
};
rec("J97-run4-order-1", await orderWithPromo("order1"));
rec("J97-run4-order-2", await orderWithPromo("order2"));

// ---------- I88 ulang: penggandaan font DUA-PASS ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
await sleep(300);
await safe("I88-dua-pass", () => evalJs(`(() => {
  const pairs = [...document.querySelectorAll('body *')].map((el) => [el, parseFloat(getComputedStyle(el).fontSize)]);
  for (const [el, fs] of pairs) { if (fs > 0) el.style.fontSize = (fs * 2) + 'px'; }
  const payH = [...document.querySelectorAll('.pay')].slice(0, 3).map((p) => Math.round(p.getBoundingClientRect().height));
  const clipped = [];
  for (const el of document.querySelectorAll('.nom, .btn, .mobile-bar, .pay, .qty, .summary')) {
    if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) clipped.push({ cls: el.className.toString().slice(0, 24), txt: (el.textContent || '').trim().slice(0, 22), sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth });
  }
  const priceSpill = [...document.querySelectorAll('.pay')].map((p) => { const pr = p.getBoundingClientRect(); const r2 = p.querySelector('.p-price')?.getBoundingClientRect(); return r2 ? Math.round(r2.right - pr.right) : null; });
  return { payHeights3: payH, hOverflow: document.documentElement.scrollWidth > window.innerWidth, clippedCount: clipped.length, clipped: clipped.slice(0, 12), priceSpillPx: priceSpill };
})()`));

writeFileSync(`${outDir}/cdp-s456-run4-390.json`, JSON.stringify(R, null, 1));
console.log("SELESAI-RUN4-390");
process.exit(0);
