// Verifikasi visual G81: apakah teks harga keluar dari KARTU di zoom 160% (MLBB + Valorant).
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
const check = (game) => evalJs(`(() => {
  const noms = [...document.querySelectorAll('.nom')];
  return noms.map((nom) => {
    const p = nom.querySelector('.n-price');
    const cr = nom.getBoundingClientRect();
    // lebar teks sebenarnya via Range (visual px, memperhitungkan zoom)
    const range = document.createRange();
    range.selectNodeContents(p);
    const tr = range.getBoundingClientRect();
    return { nama: nom.querySelector('.n-name')?.textContent, harga: p.textContent.trim().replace(/\\s+/g, ' ').slice(0, 30), kartuKiri: Math.round(cr.left), kartuKanan: Math.round(cr.right), teksKiri: Math.round(tr.left), teksKanan: Math.round(tr.right), keluarKartuKanan: Math.round(tr.right - cr.right), keluarKartuKiri: Math.round(cr.left - tr.left) };
  });
})()`);
for (const game of ["mobile-legends", "valorant"]) {
  await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/" + game)}); 'ok'`);
  await sleep(2200);
  await evalJs(`document.documentElement.style.zoom = '160%'; 'ok'`);
  await sleep(600);
  rec("G81-visual-" + game, await check(game));
  await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
}
console.log("SELESAI");
process.exit(0);
