// Verifikasi s466 ide 43 pasca-perbaikan: warna ::placeholder kolom pencarian.
import { mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evalJs(`location.assign(${JSON.stringify(baseUrl + '#/')}); 'ok'`);
await sleep(2500);
for (const tema of ["light", "dark"]) {
  await evalJs(`document.documentElement.dataset.theme = ${JSON.stringify(tema)}; 'ok'`);
  await sleep(400);
  const r = await evalJs(`(() => { const el = document.querySelector('.searchbar input'); const cs = getComputedStyle(el, '::placeholder'); const bg = getComputedStyle(el).backgroundColor; return { tema: ${JSON.stringify(tema)}, placeholderColor: cs.color, inputBg: bg, fontSize: getComputedStyle(el).fontSize }; })()`);
  console.log("PLACEHOLDER-" + tema.toUpperCase(), JSON.stringify(r));
}
console.log("SELESAI-VERIFY43");
process.exit(0);
