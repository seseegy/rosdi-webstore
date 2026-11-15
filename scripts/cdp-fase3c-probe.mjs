// Probe Fase 3c — fokus: hover kartu e-wallet DANA (scroll instant, bukan smooth).
import { mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/")}); 'ok'`);
await sleep(1500);
const r = await evalJs(`(() => { const el = document.querySelector(".grid.c3 .card[href='#/emoney/dana']"); if (!el) return null; el.scrollIntoView({ behavior: 'instant', block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, top: b.top, inView: b.top >= 0 && b.bottom <= window.innerHeight }; })()`);
console.log("D-target", JSON.stringify(r));
if (r) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(r.x), y: Math.round(r.y), button: "none" });
  const b0 = await evalJs(`getComputedStyle(document.querySelector(".grid.c3 .card[href='#/emoney/dana']")).borderColor`);
  await sleep(75);
  const b1 = await evalJs(`getComputedStyle(document.querySelector(".grid.c3 .card[href='#/emoney/dana']")).borderColor`);
  await sleep(200);
  const b2 = await evalJs(`getComputedStyle(document.querySelector(".grid.c3 .card[href='#/emoney/dana']")).borderColor`);
  const hov = await evalJs(`(() => { const c = document.querySelector(".grid.c3 .card[href='#/emoney/dana']"); return c ? c.matches(':hover') : null; })()`);
  console.log("D-ewallet-hover-border", JSON.stringify({ t0: b0, t75: b1, t275: b2, matchesHover: hov }));
}
console.log("FASE3C-SELESAI");
process.exit(0);
