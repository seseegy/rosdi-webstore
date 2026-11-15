// Tes penentu ide 8: fresh load 390x400, ukur transform bar SETELAH 3 detik
// tanpa scroll sama sekali. Bila view() bekerja -> scaleX(0) selamanya
// sampai di-scroll; bila fallback time-based -> scaleX(1) setelah 0,6 dtk.
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, , outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
mkdirSync(outDir, { recursive: true });
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
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 400, deviceScaleFactor: 1, mobile: true });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error("EVAL-EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 1200));
    return r.result.value;
  });
await evalJs(`localStorage.clear(); 'ok'`);
await evalJs(`location.hash = '#/'; 'ok'`);
await sleep(3000);
const read = () => evalJs(`(() => { const bar = document.querySelector('.progress i'); const sec = document.querySelector('#katalog'); const cs = getComputedStyle(bar); return { scrollY: Math.round(scrollY), flashTop: Math.round(sec.getBoundingClientRect().top), transform: cs.transform, timeline: cs.animationTimeline, rangeStart: cs.animationRangeStart, rangeEnd: cs.animationRangeEnd, fill: cs.animationFillMode, duration: cs.animationDuration }; })()`);
const t3 = await read();
await evalJs(`window.scrollTo(0, 600); 'ok'`);
await sleep(800);
const tScroll = await read();
const R = { width: WIDTH, t3detik_tanpa_scroll: t3, setelah_scroll_600: tScroll };
writeFileSync(`${outDir}/cdp-s445e3-390x400.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
try { ws.close(); } catch {}
process.exit(0);
