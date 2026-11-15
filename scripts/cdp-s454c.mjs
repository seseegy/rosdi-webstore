// Verifikasi perbaikan s454: veil fade-in (ide 10) + aria-label Salin (ide 71).
import { mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rec = (id, data) => console.log(id, JSON.stringify(data));
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/")}); 'ok'`);
await sleep(2200);
// ide 10: buka modal Masuk, baca animasi veil
await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Masuk').click(); return 'ok'; })()`);
await sleep(150);
rec("10b-veil", await evalJs(`(() => { const v = document.querySelector('.modal-veil'); if (!v) return 'TIDAK-ADA'; const cs = getComputedStyle(v); return { animName: cs.animationName, animDur: cs.animationDuration, running: v.getAnimations().map((a) => a.animationName) }; })()`));
// ide 71: halaman Sukses order yang dibuat run CDP sebelumnya
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/sukses/RSD-ESNPTA8385VO")}); 'ok'`);
await sleep(2200);
rec("71b-salin", await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, salin: [...document.querySelectorAll('button')].filter((b) => /Salin/.test(b.textContent)).map((b) => ({ text: b.textContent.trim(), ariaLabel: b.getAttribute('aria-label') })) }))()`));
console.log("DONE");
process.exit(0);
