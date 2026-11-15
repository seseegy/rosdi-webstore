// Retest s463 A2/A3 + kontrol kartu game (metode elementFromPoint ala s462).
import { mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rec = (id, data) => console.log(id, JSON.stringify(data));
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/")}); 'ok'`);
await sleep(2200);
const probe = async (id, selJs) => {
  // scroll instan, tunggu, hitung titik dari elementFromPoint
  const pt = await evalJs(`(() => {
    const el = (${selJs}); if (!el) return null;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    return new Promise((res) => setTimeout(() => {
      const r = el.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
      const top = document.elementFromPoint(cx, cy);
      res({ x: cx, y: cy, topTag: top ? top.tagName : null, topCls: top ? (top.className || '').toString().slice(0, 30) : null, topText: top ? (top.textContent || '').trim().slice(0, 30) : null });
    }, 400));
  })()`);
  if (!pt) { rec(id, { ditemukan: false }); return; }
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
  await sleep(120);
  const st = await evalJs(`(() => {
    const el = (${selJs});
    const top = document.elementFromPoint(${pt.x}, ${pt.y});
    const cs = getComputedStyle(el);
    const csTop = top ? getComputedStyle(top) : null;
    return { cardActive: el.matches(':active'), cardHover: el.matches(':hover'), cardTransform: cs.transform, topActive: top ? top.matches(':active') : null, topTransform: csTop ? csTop.transform : null, topIsCard: top === el, topInsideCard: top ? el.contains(top) : false };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
  await sleep(300);
  rec(id, { ...pt, ...st });
};
await probe("A2-retest-trust", `document.querySelector('.trust .card')`);
await probe("A3-retest-flash", `document.querySelector('#katalog .card')`);
await probe("CTRL-game-card", `document.querySelector('.grid.c4 .card')`);
console.log("SELESAI retest");
process.exit(0);
