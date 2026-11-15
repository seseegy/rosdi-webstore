// Verifikasi ulang s446 ide 53 & 57 dengan fokus benar (probe sebelumnya
// tidak memfokuskan input sebelum Enter, dan hasil Cek tidak tampil).
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
const focusEl = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.focus(); return document.activeElement === el ? 'focused' : 'NOT-FOCUSED'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/cek");
// 53: fokus ke input dulu, lalu Enter
await setInput(".step .input", "RSD-DEMO1234");
R.fokusInput = await focusEl(".step .input");
await sleep(150);
await keyDown("Enter", "Enter", 13); await sleep(600);
R.enterCek = { hasilMuncul: await evalJs(`!!document.querySelector('.cek-result')`), fokus: await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, kelas: (a?.className || '').toString().slice(0, 30) }; })()`) };
// 57: dari kartu hasil, Tab berikutnya
const urutan = [];
for (let i = 0; i < 3; i++) { await keyDown("Tab", "Tab", 9); await sleep(250); urutan.push(await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, teks: (a?.textContent || '').trim().slice(0, 40), kelas: (a?.className || '').toString().slice(0, 30) }; })()`)); }
R.tabDariHasil = urutan;
// 57b: outline kartu hasil terlihat saat fokus
R.outlineHasil = await evalJs(`(() => { const el = document.querySelector('.cek-result'); if (!el) return null; el.focus(); const cs = getComputedStyle(el); return { outline: cs.outline, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor }; })()`);
writeFileSync(`${outDir}/cdp-s446-verify2-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI", WIDTH);
process.exit(0);
