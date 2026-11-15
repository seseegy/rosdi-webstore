// Uji lompatan B2 — ArrowDown dari BRI (indeks 7) harus ke Alfamart (9),
// melewati Danamon (8, nonaktif "Lagi perbaikan").
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
const press = async (key, code, vk) => {
  const p = { type: "keyDown", key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 0 };
  await send("Input.dispatchKeyEvent", p);
  await sleep(100);
  await send("Input.dispatchKeyEvent", { ...p, type: "keyUp" });
  await sleep(150);
};
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`);
await sleep(1500);
await evalJs(`document.querySelector(".nom-grid .nom").click(); 'ok'`);
await sleep(300);
await evalJs(`document.querySelectorAll(".pay")[7].focus(); 'ok'`);
console.log("before", await evalJs(`document.activeElement.textContent.trim().slice(0, 30)`));
await press("ArrowDown", "ArrowDown", 40);
console.log("afterDown idx=", await evalJs(`Array.from(document.querySelectorAll(".pay")).indexOf(document.activeElement)`), await evalJs(`document.activeElement.textContent.trim().slice(0, 30)`));
await press("ArrowUp", "ArrowUp", 38);
console.log("afterUp idx=", await evalJs(`Array.from(document.querySelectorAll(".pay")).indexOf(document.activeElement)`), await evalJs(`document.activeElement.textContent.trim().slice(0, 30)`));
console.log("SELESAI");
process.exit(0);
