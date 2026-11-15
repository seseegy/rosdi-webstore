// Debug B2 — apakah Enter/Space memilih nominal (CDP key event tepercaya)?
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
const press = async (key, code, vk, text) => {
  const p = { type: "keyDown", key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 0 };
  if (text) p.text = text;
  await send("Input.dispatchKeyEvent", p);
  await sleep(100);
  await send("Input.dispatchKeyEvent", { ...p, type: "keyUp" });
  await sleep(200);
};
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`);
await sleep(1500);
console.log("nomCount", await evalJs(`document.querySelectorAll(".nom-grid .nom").length`));
await evalJs(`document.querySelector(".nom-grid .nom").focus(); 'ok'`);
console.log("focus0", await evalJs(`document.activeElement.textContent.trim().slice(0,30)`));
await press("Enter", "Enter", 13, "\r");
console.log("afterEnter on=", await evalJs(`document.querySelector(".nom-grid .nom.on")?.textContent?.trim().slice(0, 30) || null`), "aside=", await evalJs(`!!document.querySelector(".aside .sum-row, .aside")`));
await evalJs(`document.querySelectorAll(".nom-grid .nom")[1].focus(); 'ok'`);
await press(" ", "Space", 32);
console.log("afterSpace on=", await evalJs(`document.querySelector(".nom-grid .nom.on")?.textContent?.trim().slice(0, 30) || null`));
// Uji kontrol: tombol <button> polos di halaman yang sama — apakah Enter CDP memicu click?
console.log("plainBtn", await evalJs(`(() => {
  const b = document.createElement("button");
  b.textContent = "uji";
  b.addEventListener("click", () => { b.dataset.clicked = "1"; });
  document.body.appendChild(b);
  b.focus();
  return 'ok';
})()`));
await press("Enter", "Enter", 13, "\r");
console.log("plainBtnClicked", await evalJs(`document.querySelector("button[data-clicked]") ? "ya" : "tidak"`));
console.log("SELESAI");
process.exit(0);
