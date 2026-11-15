// Probe s451c: verifikasi akhir ide 26 — apakah .summary benar-benar menempel
// saat scroll dalam di 390px (bandingkan tinggi aside vs summary).
import { mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rec = (id, data) => console.log(id, JSON.stringify(data));
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) { reject(new Error(JSON.stringify(msg.error))); } else { resolve(msg.result); } } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`);
await sleep(2500);
rec("26-geometry", await evalJs(`(() => { const s = document.querySelector('.summary'); const a = s.closest('aside'); const sr = s.getBoundingClientRect(); const ar = a.getBoundingClientRect(); return { summaryH: Math.round(sr.height), asideH: Math.round(ar.height), travel: Math.round(ar.height - sr.height), docH: document.body.scrollHeight }; })()`));
await evalJs(`window.scrollTo(0, 2900); 'ok'`);
await sleep(500);
rec("26-scroll2900", await evalJs(`(() => { const s = document.querySelector('.summary'); const r = s.getBoundingClientRect(); return { top: Math.round(r.top), scrollY: Math.round(window.scrollY) }; })()`));
await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
await sleep(500);
rec("26-scrollBottom", await evalJs(`(() => { const s = document.querySelector('.summary'); const r = s.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), scrollY: Math.round(window.scrollY) }; })()`));
console.log("DONE"); process.exit(0);
