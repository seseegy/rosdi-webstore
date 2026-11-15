// Verifikasi ide 57 dengan riwayat berisi order: Tab dari kartu hasil harus
// mendarat di baris riwayat pertama (DOM order), bukan melompat ke header.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, widthArg, , outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
const HEIGHT = parseInt(process.env.CDP_H || "900", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH, height: HEIGHT };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: true });
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const nav = async (h) => { await evalJs(`location.hash = '${h}'; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const keyDown = async (key, code, vk) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk, text: key === "Enter" ? "\r" : undefined }); await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk }); };
await evalJs(`(() => { const arr = [{ ref: 'RSD-AAA001', product: 'Mobile Legends', item: '86 Diamonds', target: '12345678 (1234)', method: 'QRIS', total: 21580, status: 'Selesai', time: Date.now() - 3600000 }, { ref: 'RSD-AAA002', product: 'Free Fire', item: '70 Diamonds', target: '87654321', method: 'DANA', total: 9450, status: 'Diproses', time: Date.now() - 7200000 }]; localStorage.setItem('rosdi_orders', JSON.stringify(arr)); return 'seeded'; })()`);
await nav("#/cek");
await setInput(".step .input", "RSD-DEMO1234");
await evalJs(`document.querySelector('.step .input').focus(); 'ok'`);
await keyDown("Enter", "Enter", 13); await sleep(600);
R.hasilMuncul = await evalJs(`!!document.querySelector('.cek-result')`);
R.fokusAwal = await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, kelas: (a?.className || '').toString().slice(0, 30) }; })()`);
const urutan = [];
for (let i = 0; i < 4; i++) { await keyDown("Tab", "Tab", 9); await sleep(250); urutan.push(await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, teks: (a?.textContent || '').trim().slice(0, 44), kelas: (a?.className || '').toString().slice(0, 30) }; })()`)); }
R.tabDariHasil = urutan;
writeFileSync(`${outDir}/cdp-s446-verify3-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI", WIDTH);
process.exit(0);
