// Follow-up CDP s441b: hover kartu game (scroll dulu), Danamon disabled live,
// peringatan order lama — hanya di dalam kartu Cek (bukan seluruh body).
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
await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width <= 560 });

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1500); };
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// Hover kartu game — scroll ke kartu dulu agar masuk viewport
await safe("hover3b", async () => {
  await evalJs(`(() => { const el = document.querySelector('.grid.c4 a.card'); el.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await sleep(400);
  const before = await evalJs(`(() => { const el = document.querySelector('.grid.c4 a.card'); const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { transform: s.transform, borderColor: s.borderColor, boxShadow: s.boxShadow, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }; })()`);
  const box = before.rect;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x + box.w / 2, y: box.y + box.h / 2 });
  await sleep(400);
  const after = await evalJs(`(() => { const el = document.querySelector('.grid.c4 a.card'); const s = getComputedStyle(el); return { transform: s.transform, borderColor: s.borderColor, boxShadow: s.boxShadow, hoverMatches: el.matches(':hover') }; })()`);
  return { before, after };
});

// Danamon disabled live — pilih nominal dulu agar baris metode tampil
await safe("danamon76b", async () => {
  await goHash("#/game/mobile-legends");
  await evalJs(`(() => { const el = document.querySelector('#uid'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, '12345678'); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  await evalJs(`(() => { const el = document.querySelector('#zone'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, '1234'); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  await sleep(300);
  await evalJs(`(() => { document.querySelector('.nom-grid .nom').click(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => {
    const dana = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('Danamon'));
    const bca = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('BCA Virtual Account'));
    if (!dana) return { noDanamon: true };
    const ds = getComputedStyle(dana), bs = getComputedStyle(bca);
    return {
      disabled: dana.disabled, ariaDisabled: dana.getAttribute('aria-disabled'),
      opacity: ds.opacity, bcaOpacity: bs.opacity,
      danaText: dana.textContent.slice(0, 90),
      clicked: (() => { dana.click(); return dana.classList.contains('on'); })(),
    };
  })()`);
});

// Order lama — peringatan hanya di dalam kartu hasil Cek (bukan body/trust/footer)
await safe("oldorder28b", async () => {
  await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-OLD441', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - 3*86400000, status: 'Diproses', email: '', wa: '', token: '' }])); 'ok'`);
  await goHash("#/cek");
  await evalJs(`(() => { const el = document.querySelector("input[aria-label='Nomor transaksi']"); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, 'RSD-OLD441'); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  await evalJs(`(() => { document.querySelector('.step .btn').click(); return 'ok'; })()`);
  await sleep(500);
  return evalJs(`(() => {
    const card = document.querySelector('.step');
    const t = card ? card.innerText : '';
    return {
      cardText: t.slice(0, 400),
      hasWarningInCard: /lewat|24 jam|bermasalah|hubungi|terlambat|macet|kendala|coba lagi/i.test(t),
      hasActionInCard: /coba lagi|hubungi|bantuan|klaim/i.test(t),
    };
  })()`);
});

writeFileSync(`${outDir}/cdp-s441b.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", Object.keys(R).length, "checks");
