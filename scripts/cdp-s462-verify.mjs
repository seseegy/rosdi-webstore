// Verifikasi perbaikan s462 (A5/A6/A7/A8) via CDP.
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
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const mousePressAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await sleep(90); };
const mouseReleaseAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); await sleep(200); };
const mouseMoveTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }); await sleep(250); };
const centerOf = async (js) => evalJs(`(() => { const el = (${js}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
const waitApp = async () => { for (let i = 0; i < 30; i++) { const ok = await evalJs(`(location.hostname === '127.0.0.1' && !!document.querySelector('main#konten')) ? 'ok' : 'no'`).catch(() => 'no'); if (ok === 'ok') return true; await sleep(300); } return false; };

await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await nav("#/");
await waitApp();
await evalJs(`localStorage.clear(); document.documentElement.style.scrollBehavior = 'auto'; 'ok'`);

// A5 (diperbaiki): tekan kartu Cara Top Up -> scale 0.99
await safe("A5-perbaikan-active-cara-topup", async () => {
  await evalJs(`(() => { document.querySelector('#cara-topup .card')?.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await sleep(300);
  const pos = await centerOf(`document.querySelector('#cara-topup .card')`);
  await mousePressAt(pos.x, pos.y);
  const during = await evalJs(`(() => { const el = document.querySelector('#cara-topup .card'); const cs = getComputedStyle(el); return { transform: cs.transform, active: el.matches(':active') }; })()`);
  await mouseReleaseAt(pos.x, pos.y);
  return { titikTekan: pos, saatDitekan: during };
});

// A8 (diperbaiki): fokus pencarian -> border biru + transisi
await safe("A8-perbaikan-transisi-pencarian", async () => {
  await evalJs(`(() => { document.querySelector('main').scrollIntoView(); document.querySelector('.searchbar input').focus(); return 'ok'; })()`);
  await sleep(300);
  return await evalJs(`(() => { const f = document.querySelector('.searchbar .field'); const cs = getComputedStyle(f); return { border: cs.borderColor, transition: cs.transition, outline: cs.outlineStyle + ' ' + cs.outlineColor }; })()`);
});

// A6 (diperbaiki): hover .nom -> terangkat
await safe("A6-perbaikan-hover-nom-terangkat", async () => {
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { document.querySelector('.nom-grid .nom')?.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await sleep(300);
  const pos = await centerOf(`document.querySelector('.nom-grid .nom')`);
  const sebelum = await evalJs(`(() => { const el = document.querySelector('.nom-grid .nom'); const cs = getComputedStyle(el); return { transform: cs.transform, border: cs.borderColor }; })()`);
  await mouseMoveTo(pos.x, pos.y);
  const saat = await evalJs(`(() => { const el = document.querySelector('.nom-grid .nom'); const cs = getComputedStyle(el); return { transform: cs.transform, border: cs.borderColor }; })()`);
  return { sebelum, saatHover: saat };
});

// A7 (diperbaiki): klik nominal -> <b> mobile-bar beranimasi qty-pop
await safe("A7-perbaikan-animasi-total-mobilebar", async () => {
  const bSebelum = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .mb-total b'); return b ? { teks: b.textContent, anim: getComputedStyle(b).animationName } : null; })()`);
  const pos = await centerOf(`document.querySelectorAll('.nom-grid .nom')[1]`);
  await mousePressAt(pos.x, pos.y); await mouseReleaseAt(pos.x, pos.y);
  await sleep(60);
  const bSesudah = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .mb-total b'); return b ? { teks: b.textContent, anim: getComputedStyle(b).animationName } : null; })()`);
  return { sebelum: bSebelum, sesudahKlik: bSesudah };
});

writeFileSync(`${outDir}/results-verify-fixes-390.json`, JSON.stringify(R, null, 1));
console.log("SELESAI verifikasi perbaikan 390", Object.keys(R).length, "pengukuran");
process.exit(0);
