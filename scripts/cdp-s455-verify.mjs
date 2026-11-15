// Verifikasi perbaikan s455: aria-required (ide 72), aria-expanded (ide 71),
// regex email domain (ide 41/42).
import { mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
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
const setWidth = async (w, h = 844) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await setWidth(390);
// H72: aria-required di semua input wajib Langkah 1
await nav("#/game/mobile-legends");
await safe("V72-mlbb", () => evalJs(`(() => ['#uid', '#zone'].map((s) => ({ id: s, ariaRequired: document.querySelector(s)?.getAttribute('aria-required') })))()`));
await nav("#/game/valorant");
await safe("V72-riot", () => evalJs(`(() => ({ id: '#riot', ariaRequired: document.querySelector('#riot')?.getAttribute('aria-required') }))()`));
await nav("#/pulsa/telkomsel");
await safe("V72-hp", () => evalJs(`(() => ({ id: '#hp', ariaRequired: document.querySelector('#hp')?.getAttribute('aria-required') }))()`));
await nav("#/pln");
await safe("V72-pln", () => evalJs(`(() => ({ id: '#idpel', ariaRequired: document.querySelector('#idpel')?.getAttribute('aria-required') }))()`));
await nav("#/voucher/google-play");
await safe("V72-email", () => evalJs(`(() => ({ id: '#vemail', ariaRequired: document.querySelector('#vemail')?.getAttribute('aria-required') }))()`));
// E41/E42: email domain underscore / strip-awal ditolak; email normal diterima
await safe("V41-underscore", () => evalJs(`(async () => { const setV = ${setVal}; const inp = document.querySelector('#vemail'); setV(inp, 'nama@mail_com.com'); await new Promise((r) => setTimeout(r, 300)); return { errShown: !!document.querySelector('.note.bad'), buyDisabled: document.querySelector('.summary .btn.big').disabled }; })()`));
await safe("V42-hyphen", () => evalJs(`(async () => { const setV = ${setVal}; const inp = document.querySelector('#vemail'); setV(inp, 'nama@-mail.com'); await new Promise((r) => setTimeout(r, 300)); return { errShown: !!document.querySelector('.note.bad'), buyDisabled: document.querySelector('.summary .btn.big').disabled }; })()`));
await safe("V41-ok", () => evalJs(`(async () => { const setV = ${setVal}; const inp = document.querySelector('#vemail'); setV(inp, 'nama@email.com'); await new Promise((r) => setTimeout(r, 300)); return { errShown: !!document.querySelector('.note.bad') }; })()`));
// H71: aria-expanded toggle "Lihat semua" riwayat
await nav("#/cek");
await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-TEST000' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1,2,3,4,5,6,7].map(mk))); return 'ok'; })()`);
await nav("#/cek");
await safe("V71-expanded", () => evalJs(`(async () => { const btn = [...document.querySelectorAll('button')].find((b) => /Lihat semua/.test(b.textContent)); const before = btn.getAttribute('aria-expanded'); btn.click(); await new Promise((r) => setTimeout(r, 300)); const after = btn.getAttribute('aria-expanded'); return { before, after }; })()`));
console.log("SELESAI-S455V");
process.exit(0);
