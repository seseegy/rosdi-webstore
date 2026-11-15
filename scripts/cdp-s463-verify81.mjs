// Verifikasi G81 s463: detail lebar .n-price di zoom 160% vs 100%.
import { mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rec = (id, data) => console.log(id, JSON.stringify(data));
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`);
await sleep(2200);
const measure = () => evalJs(`(() => {
  const g = document.querySelector('.nom-grid');
  const cs = g ? getComputedStyle(g) : null;
  const rows = [...document.querySelectorAll('.nom')].slice(0, 6).map((nom) => {
    const p = nom.querySelector('.n-price');
    const r = nom.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    return { nama: nom.querySelector('.n-name')?.textContent, harga: p.textContent.trim().slice(0, 20), kartuW: Math.round(r.width), hargaClientW: p.clientWidth, hargaScrollW: p.scrollWidth, hargaRectW: Math.round(pr.width), terpotong: p.scrollWidth > p.clientWidth + 1 };
  });
  return { innerWidth: window.innerWidth, kolomNom: cs ? cs.gridTemplateColumns.split(' ').length : null, rows };
})()`);
rec("G81-zoom100", await measure());
await evalJs(`document.documentElement.style.zoom = '160%'; 'ok'`);
await sleep(600);
rec("G81-zoom160", await measure());
await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
console.log("SELESAI");
process.exit(0);
