// Probe terakhir s445a: ide 10 saja — active state tombol "Pakai" dengan mouse
// sungguhan. Perbaikan vs percobaan sebelumnya: html memakai
// scroll-behavior:smooth (index.css:62) sehingga getBoundingClientRect harus
// dibaca SETELAH animasi scroll selesai, bukan langsung setelah scrollIntoView.
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

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
const PARTIAL = `${outDir}/cdp-s445a-fixup3-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 1200) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = '${hash}'; 'ok'`); await sleep(1200); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);
await probe("ide10_pakai_active", async () => {
  await nav("#/");
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await sleep(200);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); b.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await sleep(900); // tunggu smooth scroll (index.css:62) selesai
  const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); const r = b.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), disabled: b.disabled, dalamViewport: r.top >= 0 && r.bottom <= window.innerHeight }; })()`);
  const idle = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); const cs = getComputedStyle(b); return { transform: cs.transform, transitionDuration: cs.transitionDuration }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pos.x, y: pos.y, button: "none" });
  await sleep(200);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
  await sleep(150);
  const pressed = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); const cs = getComputedStyle(b); return { transform: cs.transform, activeMatch: b.matches(':active'), hoverMatch: b.matches(':hover') }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
  await sleep(400);
  const setelah = await evalJs(`(() => { const m = document.querySelector('.note.good'); return m ? m.textContent.trim() : 'NO-MSG'; })()`);
  return { pos, idle, pressed, setelah };
});

writeFileSync(`${outDir}/cdp-s445a-fixup3-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
