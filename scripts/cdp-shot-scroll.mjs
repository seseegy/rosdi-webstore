// cdp-shot-scroll.mjs — screenshot satu bagian halaman setelah scroll.
// Penggunaan: node scripts/cdp-shot-scroll.mjs <wsUrl> <width> <url> <cssSelector> <outPrefix>
// Menulis <outPrefix>.png. Navigasi lewat location.assign (pola Siklus 71).
import { writeFileSync } from "node:fs";

const [wsUrl, widthArg, url, selector, outPrefix] = process.argv.slice(2);
if (!wsUrl || !widthArg || !url || !selector || !outPrefix) {
  console.error("usage: cdp-shot-scroll.mjs <wsUrl> <width> <url> <cssSelector> <outPrefix>");
  process.exit(2);
}
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
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: +widthArg,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: true,
});
await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(url)})` });
await sleep(2500);
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true }).then((r) => r.result.value);
const y = await evalJs(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return -1;
  const r = el.getBoundingClientRect();
  window.scrollTo(0, window.scrollY + r.top - 8);
  return Math.round(window.scrollY + r.top - 8);
})()`);
console.log("scrolled to", y);
await sleep(400);
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(outPrefix + ".png", Buffer.from(shot.data, "base64"));
ws.close();
console.log("DONE", outPrefix + ".png");
