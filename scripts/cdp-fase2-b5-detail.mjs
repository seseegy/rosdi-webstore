// Probe B5 fokus: kartu MLBB mana yang masih overflow di zoom 190%.
import { mkdirSync, writeFileSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const results = {};
const rec = (id, data) => { results[id] = data; console.log(id, JSON.stringify(data)); };
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
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`);
await sleep(1500);
await evalJs(`document.documentElement.style.zoom = '190%'; 'ok'`);
await sleep(600);
const detail = await evalJs(`(() => {
  const out = [];
  document.querySelectorAll('.nom').forEach((card, i) => {
    const cr = card.getBoundingClientRect();
    const price = card.querySelector('.n-price');
    const name = card.querySelector('.n-name');
    const range = document.createRange(); range.selectNodeContents(price);
    const tr = range.getBoundingClientRect();
    const cs = getComputedStyle(price);
    const pr = price.getBoundingClientRect();
    out.push({ i, nama: name ? name.textContent.trim() : '?', teks: price.textContent.trim(), keluar: +(tr.right - cr.right).toFixed(1), kartuLebar: +cr.width.toFixed(1), hargaLebar: +pr.width.toFixed(1), hargaScrollW: price.scrollWidth, hargaClientW: price.clientWidth, wrap: cs.overflowWrap, ws: cs.whiteSpace, tinggiHarga: +pr.height.toFixed(1) });
  });
  return out;
})()`);
rec("MLBB-190-detail", detail);
writeFileSync(outDir + "/fase2-b5-detail.json", JSON.stringify(results, null, 2));
console.log("SELESAI");
process.exit(0);
