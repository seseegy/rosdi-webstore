// Retest CDP s462 (susulan): A5/A10 dengan scroll instan + verifikasi titik tekan,
// F73 Enter dengan text "\r" + kontrol tombol Masuk.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = +wArg;
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
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, text) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text !== undefined ? { text } : {}) });
const pressEnterText = async () => { await keyEvent("keyDown", "Enter", "Enter", 13, "\r"); await sleep(300); await keyEvent("keyUp", "Enter", "Enter", 13); await sleep(300); };
const mousePressAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await sleep(90); };
const mouseReleaseAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); await sleep(200); };
const mouseMoveTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }); await sleep(200); };
const waitApp = async () => {
  for (let i = 0; i < 30; i++) {
    const ok = await evalJs(`(location.hostname === '127.0.0.1' && !!document.querySelector('main#konten')) ? 'ok' : 'no'`).catch(() => 'no');
    if (ok === 'ok') return true;
    await sleep(300);
  }
  return false;
};
const centerOf = async (js) => evalJs(`(() => { const el = (${js}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);

await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await setMetrics(390);
await nav("#/");
await waitApp();
await evalJs(`localStorage.clear(); document.documentElement.style.scrollBehavior = 'auto'; 'ok'`);

// A10 ulang: scroll instan + pastikan titik tekan berada di dalam kartu
await safe("A10-ulang-active-kartu-game", async () => {
  await evalJs(`(() => { document.querySelector('.grid.c4 .card')?.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await sleep(300);
  const pos = await centerOf(`document.querySelector('.grid.c4 .card')`);
  const hit = await evalJs(`(() => { const el = document.elementFromPoint(${pos.x}, ${pos.y}); return el ? el.tagName + '.' + (el.className || '').toString().slice(0, 20) + ' | dalamKartu=' + !!el.closest('.grid.c4 .card') : 'null'; })()`);
  const before = await evalJs(`(() => { const el = document.querySelector('.grid.c4 .card'); const cs = getComputedStyle(el); return { transform: cs.transform }; })()`);
  await mousePressAt(pos.x, pos.y);
  const during = await evalJs(`(() => { const el = document.querySelector('.grid.c4 .card'); const cs = getComputedStyle(el); return { transform: cs.transform, active: el.matches(':active') }; })()`);
  await mouseReleaseAt(pos.x, pos.y);
  await sleep(300);
  return { titikTekan: pos, elemenDiTitik: hit, sebelum: before, saatDitekan: during, hashSesudah: await evalJs(`location.hash`) };
});

// A5 ulang: scroll instan + pastikan titik tekan berada di dalam kartu
await safe("A5-ulang-active-cara-topup", async () => {
  await nav("#/");
  await evalJs(`(() => { document.querySelector('#cara-topup .card')?.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await sleep(300);
  const pos = await centerOf(`document.querySelector('#cara-topup .card')`);
  const hit = await evalJs(`(() => { const el = document.elementFromPoint(${pos.x}, ${pos.y}); return el ? el.tagName + '.' + (el.className || '').toString().slice(0, 20) + ' | dalamKartu=' + !!el.closest('#cara-topup .card') : 'null'; })()`);
  const before = await evalJs(`(() => { const el = document.querySelector('#cara-topup .card'); const cs = getComputedStyle(el); return { transform: cs.transform }; })()`);
  await mousePressAt(pos.x, pos.y);
  const during = await evalJs(`(() => { const el = document.querySelector('#cara-topup .card'); const cs = getComputedStyle(el); return { transform: cs.transform, active: el.matches(':active') }; })()`);
  await mouseReleaseAt(pos.x, pos.y);
  return { titikTekan: pos, elemenDiTitik: hit, sebelum: before, saatDitekan: during };
});

// F73 ulang: Enter dengan text "\r" + kontrol tombol Masuk
await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ref:'RSD-TEST462A',kind:'game',product:'Mobile Legends',item:'172 Diamonds',qty:1,target:'12345678 (1234)',base:43500,fee:0,disc:0,total:43500,method:'QRIS',time:Date.now(),status:'Diproses',email:'',wa:'',token:null}])); 'ok'`);
await nav("#/sukses/RSD-TEST462A");
await safe("F73-ulang-enter-dengan-text", async () => {
  await evalJs(`(() => { window.__klikBelanja = 0; const b = [...document.querySelectorAll('.step button')].find((x) => x.textContent.trim() === 'Belanja Lagi'); b.addEventListener('click', () => window.__klikBelanja++); b.focus(); return 'ok'; })()`);
  const fokus = await evalJs(`(() => { const a = document.activeElement; return a ? (a.textContent || '').trim().slice(0, 30) + '|' + a.tagName : 'none'; })()`);
  await pressEnterText();
  const hasil = await evalJs(`(() => ({ klik: window.__klikBelanja, hash: location.hash }))()`);
  return { fokus, hasil };
});
await safe("F73-kontrol-enter-tombol-masuk", async () => {
  await nav("#/sukses/RSD-TEST462A");
  await evalJs(`(() => { const b = [...document.querySelectorAll('header.site button')].find((x) => x.textContent.trim() === 'Masuk'); b.focus(); return 'ok'; })()`);
  const fokus = await evalJs(`(() => { const a = document.activeElement; return a ? (a.textContent || '').trim().slice(0, 30) + '|' + a.tagName : 'none'; })()`);
  await pressEnterText();
  const hasil = await evalJs(`(() => ({ modalMasukTerbuka: !!document.querySelector('.modal'), hash: location.hash }))()`);
  return { fokus, hasil };
});

writeFileSync(`${outDir}/results-retest-390.json`, JSON.stringify(R, null, 1));
console.log("SELESAI retest 390", Object.keys(R).length, "pengukuran");
process.exit(0);
