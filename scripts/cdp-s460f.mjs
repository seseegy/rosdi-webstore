// H91/H92 ulang (cold load): reload penuh dgn ignoreCache di tiap halaman,
// lalu baca resource timings — kunjungan ulang hash-only sebelumnya 0 request
// karena chunk sudah di memori modul.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; console.log(id, JSON.stringify(data)); };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const baca = `(() => {
  const rs = performance.getEntriesByType('resource');
  const byName = {};
  for (const r of rs) byName[r.name] = (byName[r.name] || 0) + 1;
  const dup = Object.entries(byName).filter(([, c]) => c > 1).map(([n, c]) => ({ url: n.split('/').slice(-1)[0], kali: c }));
  return { jumlahRequest: rs.length, duplikat: dup, daftar: rs.map((r) => r.name.split('/').slice(-1)[0] + ' (' + r.initiatorType + ', ' + Math.round(r.duration) + 'ms)') };
})()`;
const reload = async () => { await send("Page.reload", { ignoreCache: true }); await sleep(3000); };

// Voucher cold load
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/voucher/google-play")}); 'ok'`);
await sleep(2200);
await reload();
rec("H91-request-voucher-cold", await evalJs(baca));

// Tagihan cold load
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/tagihan/pln-pascabayar")}); 'ok'`);
await sleep(2200);
await reload();
rec("H92-request-tagihan-cold", await evalJs(baca));

writeFileSync(outDir + "/cdp-s460f-390.json", JSON.stringify(R, null, 1));
console.log("SELESAI-CDPF-390");
ws.close();
process.exit(0);
