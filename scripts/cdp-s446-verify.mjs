// Verifikasi perbaikan s446: minus di depan (19), email titik-depan (15),
// Enter Cek (53), Tab dari hasil Cek (57), storage sync (92), peringatan PLN (39).
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
const keyDown = async (key, code, vk) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk }); await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk }); };
const notes = async () => evalJs(`[...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim())`);

await evalJs(`localStorage.clear(); 'ok'`);
// 19: minus di depan Zone/UID/PLN ditolak; strip di dalam tetap diterima
await nav("#/game/mobile-legends");
await setInput("#uid", "12345678");
await setInput("#zone", "-1234"); await sleep(250);
R.zoneMinus = { bad: await notes(), target: await evalJs(`[...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan'))?.textContent || null`) };
await setInput("#zone", "12-34"); await sleep(250);
R.zoneStripDalam = { bad: await notes(), target: await evalJs(`[...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan'))?.textContent || null`) };
await setInput("#uid", "-123456"); await setInput("#zone", "1234"); await sleep(250);
R.uidMinus = { bad: await notes() };
await nav("#/pln");
await setInput("#idpel", "-543210987654"); await sleep(250);
R.plnMinus = { bad: await notes(), cekDisabled: await evalJs(`[...document.querySelectorAll('.btn')].find((b) => b.textContent.includes('Cek'))?.disabled`) };
// 15: email titik-depan ditolak di voucher + kontak checkout
await nav("#/voucher/google-play");
await setInput("#vemail", ".nama@mail.com"); await sleep(250);
R.emailTitikDepan = { bad: await notes() };
await setInput("#vemail", "nama@mail.com"); await sleep(250);
R.emailNormal = { bad: await notes() };
// 53: Enter di kolom Cek = klik Lacak
await nav("#/cek");
await setInput(".step .input", "RSD-DEMO1234"); await sleep(150);
await keyDown("Enter", "Enter", 13); await sleep(500);
R.enterCek = { hasilMuncul: await evalJs(`!!document.querySelector('.cek-result')`) };
// 57: Tab dari kartu hasil -> bukan logo header lagi
const urutan = [];
for (let i = 0; i < 3; i++) { await keyDown("Tab", "Tab", 9); await sleep(200); urutan.push(await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, teks: (a?.textContent || '').trim().slice(0, 40), kelas: (a?.className || '').toString().slice(0, 30) }; })()`)); }
R.tabDariHasil = urutan;
// 92: storage event memperbarui riwayat tanpa refresh (event sintetis)
R.storageSync = await evalJs(`(() => { const sebelum = document.querySelectorAll('.step .sum-row').length; const arr = [{ ref: 'RSD-SYNC001', product: 'Mobile Legends', item: '86 Diamonds', target: '12345678 (1234)', method: 'QRIS', total: 21580, status: 'Selesai', time: Date.now() }]; localStorage.setItem('rosdi_orders', JSON.stringify(arr)); window.dispatchEvent(new StorageEvent('storage', { key: 'rosdi_orders' })); return new Promise((res) => setTimeout(() => res({ sebelum, sesudah: document.querySelectorAll('.step .sum-row').length, adaRef: document.body.innerText.includes('RSD-SYNC001') }), 400)); })()`);
await sleep(500);
// 39: peringatan token di aside PLN
await nav("#/pln");
await setInput("#idpel", "543210987654"); await sleep(200);
await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.includes('Cek')); if (b) b.click(); return 'ok'; })()`); await sleep(300);
R.peringatanPlnAside = await evalJs(`(() => { const notes = [...document.querySelectorAll('.summary .note')].map((n) => n.textContent.replace(/\\s+/g, ' ').trim()); return { ada: notes.some((n) => n.includes('tidak bisa dibatalkan')), notes }; })()`);
writeFileSync(`${outDir}/cdp-s446-verify-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI", WIDTH);
process.exit(0);
