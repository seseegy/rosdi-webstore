// Susulan CDP s461b: ulangi F65 (sintaks diperbaiki), F74 (cek "disalin"),
// F75 (log tiap Tab), A6 (elementFromPoint saat hover).
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
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
const pressSpace = async () => { await keyEvent("keyDown", " ", "Space", 32); await keyEvent("keyUp", " ", "Space", 32); await sleep(300); };
const pressTab = async () => { await keyEvent("keyDown", "Tab", "Tab", 9); await keyEvent("keyUp", "Tab", "Tab", 9); await sleep(180); };
const mouseMoveTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }); await sleep(200); };
const tabToLog = async (label, maxTabs = 20) => {
  const jejak = [];
  for (let i = 0; i < maxTabs; i++) {
    const cur = await evalJs(`(() => { const a = document.activeElement; return a ? (a.textContent || '').trim().slice(0, 30) + '|' + a.tagName + '|' + (a.className || '').toString().slice(0, 20) : 'none'; })()`);
    jejak.push(cur);
    if (cur && cur.startsWith(label)) return { tabKe: i, aktif: cur, jejak };
    await pressTab();
  }
  return { tabKe: null, aktif: jejak[jejak.length - 1], jejak };
};

await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);

// F65 ulang: Space di Cek Nama
await nav("#/pln");
await safe("F65-space-cek-nama-ulang", async () => {
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
  await sleep(300);
  const tab = await tabToLog("Cek Nama");
  await pressSpace();
  await sleep(400);
  const hasil = await evalJs(`(() => { const g = document.querySelector('.note.good'); return { catatanBaik: !!g, teksCatatan: g ? g.textContent.slice(0, 80) : null, cekUlang: [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Cek Ulang') }; })()`);
  return { tab: { tabKe: tab.tabKe, aktif: tab.aktif }, hasil };
});

// F74 ulang: Space di Salin token Sukses — cek teks "disalin"
await nav("#/sukses/RSD-S461A7");
await safe("F74-space-salin-ulang", async () => {
  const tab = await tabToLog("Salin token");
  const sebelum = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /Salin token/.test(x.textContent)); return b ? b.textContent.trim() : null; })()`);
  await pressSpace();
  await sleep(400);
  const sesudah = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /disalin|Salin token/i.test(x.textContent)); return b ? b.textContent.trim() : null; })()`);
  return { tab: { tabKe: tab.tabKe, aktif: tab.aktif }, sebelum, sesudah, tersalin: /disalin/i.test(sesudah || "") };
});

// F75 ulang: Space di Masuk — log tiap Tab
await nav("#/");
await safe("F75-space-masuk-ulang", async () => {
  const tab = await tabToLog("Masuk");
  await pressSpace();
  await sleep(400);
  const hasil = await evalJs(`(() => { const m = document.querySelector('.modal'); return { modalTerbuka: !!m, judulModal: m ? m.querySelector('h3')?.textContent : null, tombolModal: m ? [...m.querySelectorAll('button')].map((b) => b.textContent.trim()) : [] }; })()`);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.modal button')].find((x) => x.textContent.includes('Siap')); if (b) b.click(); return 'ok'; })()`);
  await sleep(300);
  return { tab, hasil };
});

// A6 ulang: hover kartu Cara Top Up + elementFromPoint
await safe("A6-cara-topup-hover-ulang", async () => {
  await evalJs(`(() => { document.getElementById('cara-topup')?.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await sleep(400);
  const pos = await evalJs(`(() => { const c = document.querySelector('#cara-topup .card'); const r = c.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }; })()`);
  await mouseMoveTo(pos.x, pos.y);
  const after = await evalJs(`(() => { const c = document.querySelector('#cara-topup .card'); const cs = getComputedStyle(c); const el = document.elementFromPoint(${pos.x}, ${pos.y}); return { border: cs.borderColor, transform: cs.transform, hover: c.matches(':hover'), diAtas: el ? (el.tagName + '.' + (el.className || '').toString().slice(0, 30)) : null }; })()`);
  return { pos, sesudahHover: after };
});

writeFileSync(outDir + "/cdp-s461b.json", JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).length, "ukuran");
process.exit(0);
