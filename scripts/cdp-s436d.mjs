// Verifikasi maxLength promo via jalur ketik asli (Input.insertText).
// Penggunaan: node scripts/cdp-s436d.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, _widthArg, baseUrl, outDir] = process.argv.slice(2);
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
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/voucher/google-play")})`);
await sleep(3000);
await evalJs(`(() => { document.querySelector(".step input[aria-label='Kode promo']")?.focus(); return 'ok'; })()`);
await sleep(300);
await send("Input.insertText", { text: "x".repeat(50) });
await sleep(300);
const len = await evalJs(`document.querySelector(".step input[aria-label='Kode promo']")?.value.length`);
const R = { typed50Len: len };
writeFileSync(`${outDir}/cdp-s436d-390.json`, JSON.stringify(R, null, 1));
console.log("DONE", JSON.stringify(R));
ws.close();
process.exit(0);
