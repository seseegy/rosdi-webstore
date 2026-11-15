// Kontrol s460: apakah Enter (CDP pressKey yang sama) men-submit form PlnPage
// dan form Cek yang sudah terverifikasi di siklus lama? Bandingkan dgn BillPages.
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
const setMetrics = async (w, h = 844, mobile = w < 900) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, extra = {}) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...extra });
const pressKey = async (key, code, vk) => { await keyEvent("keyDown", key, code, vk); await keyEvent("keyUp", key, code, vk); await sleep(180); };

await setMetrics(390);
await nav("#/");
await evalJs(`localStorage.clear(); 'ok'`);

// Kontrol 1: PlnPage Enter (terverifikasi s458)
await nav("#/pln");
await safe("KONTROL-pln-enter", async () => {
  await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#idpel'); setV(el, '543210987654'); el.focus(); return 'ok'; })()`);
  await sleep(400);
  const s0 = await evalJs(`(() => ({ nilai: document.querySelector('#idpel').value, tombolDisabled: [...document.querySelectorAll('.btn')].find((x) => /Cek Nama|Cek Ulang/.test(x.textContent))?.disabled, fokus: document.activeElement === document.querySelector('#idpel') }))()`);
  await pressKey("Enter", "Enter", 13);
  await sleep(500);
  const s1 = await evalJs(`(() => ({ rincianMuncul: !!document.querySelector('.note.good'), tombol: [...document.querySelectorAll('.btn')].find((x) => /Cek Nama|Cek Ulang/.test(x.textContent))?.textContent.trim() }))()`);
  return { sebelumEnter: s0, sesudahEnter: s1 };
});

// Kontrol 2: form Cek Enter (terverifikasi s446) — isi RSD-DEMO1234 lalu Enter
await nav("#/cek");
await safe("KONTROL-cek-enter", async () => {
  await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('input[aria-label="Nomor transaksi"]'); setV(el, 'RSD-DEMO1234'); el.focus(); return 'ok'; })()`);
  await sleep(400);
  const s0 = await evalJs(`(() => ({ nilai: document.querySelector('input[aria-label="Nomor transaksi"]').value, fokus: document.activeElement === document.querySelector('input[aria-label="Nomor transaksi"]') }))()`);
  await pressKey("Enter", "Enter", 13);
  await sleep(500);
  const s1 = await evalJs(`(() => ({ hasilMuncul: !!document.querySelector('.cek-result'), hash: location.hash }))()`);
  return { sebelumEnter: s0, sesudahEnter: s1 };
});

// Uji ulang BillPages dgn rawKeyDown + text (varian event)
await nav("#/tagihan/pln-pascabayar");
await safe("F71c-enter-billid-rawKeyDown", async () => {
  await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#billid'); setV(el, '543210987654'); el.focus(); return 'ok'; })()`);
  await sleep(400);
  await keyEvent("rawKeyDown", "Enter", "Enter", 13);
  await keyEvent("keyUp", "Enter", "Enter", 13);
  await sleep(500);
  return evalJs(`(() => ({ rincianMuncul: !!document.querySelector('.note.good'), tombol: [...document.querySelectorAll('.btn')].find((x) => /Cek Tagihan|Cek Ulang/.test(x.textContent))?.textContent.trim() }))()`);
});

writeFileSync(outDir + "/cdp-s460c-390.json", JSON.stringify(R, null, 1));
console.log("SELESAI-CDPC-390");
ws.close();
process.exit(0);
