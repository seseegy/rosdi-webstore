// Diagnostik s445e-2: ide 4 (hover trust, scroll dulu ke kartu) + ide 8
// (progress bar di 3 posisi scroll, viewport 400).
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, , outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
const HEIGHT = parseInt(process.env.CDP_H || "900", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH, height: HEIGHT };
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
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error("EVAL-EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 1200));
    return r.result.value;
  });
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 1200) }; }
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => {
  await evalJs(`location.hash = '${hash}'; 'ok'`);
  await sleep(1200);
};
const mouseMove = async (x, y) => {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" });
  await sleep(400);
};
await evalJs(`localStorage.clear(); 'ok'`);

await probe("d_ide4_trust_hover", async () => {
  if (WIDTH < 900) return { skip: "butuh 1280" };
  await nav("#/");
  await evalJs(`(() => { document.querySelector('.trust .card')?.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await sleep(1200); // scroll-behavior:smooth
  const pos = await evalJs(`(() => { const el = document.querySelector('.trust .card'); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), top: Math.round(r.top), vh: innerHeight }; })()`);
  const before = await evalJs(`(() => { const el = document.querySelector('.trust .card'); const cs = getComputedStyle(el); return { transform: cs.transform, borderColor: cs.borderColor }; })()`);
  await mouseMove(pos.x, pos.y);
  const during = await evalJs(`(() => { const el = document.querySelector('.trust .card'); const cs = getComputedStyle(el); return { hoverMatch: el.matches(':hover'), transform: cs.transform, borderColor: cs.borderColor }; })()`);
  return { pos, before, during };
});

await probe("d_ide8_progress_scroll", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 400, deviceScaleFactor: 1, mobile: true });
  await nav("#/");
  await sleep(500);
  const read = () => evalJs(`(() => { const bar = document.querySelector('.progress i'); const sec = document.querySelector('#katalog'); const cs = getComputedStyle(bar); return { scrollY: Math.round(scrollY), flashTop: Math.round(sec.getBoundingClientRect().top), transform: cs.transform, timeline: cs.animationTimeline, range: cs.animationRangeStart + ' .. ' + cs.animationRangeEnd }; })()`);
  const diAtas = await read();
  await evalJs(`window.scrollTo(0, 300); 'ok'`);
  await sleep(600);
  const diTengah = await read();
  await evalJs(`(() => { document.querySelector('#katalog')?.scrollIntoView({ block: 'start' }); return 'ok'; })()`);
  await sleep(900);
  const masukView = await read();
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900 });
  return { diAtas, diTengah, masukView };
});

writeFileSync(`${outDir}/cdp-s445e2-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
