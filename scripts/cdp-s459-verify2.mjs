// Verifikasi terisolasi s459 ronde 2 (lebar 390): A3/A9 (scroll smooth → ukur ulang
// setelah settle), F73 (pilih nominal dulu — baris .pay hanya render bila item
// dipilih), I96 (fresh load #/cek/<ref> agar mount ulang). Snapshot dist-s459-fixed.
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
const reload = async () => { await send("Page.reload", { ignoreCache: true }); await sleep(2500); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, modifiers = 0) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
const pressKey = async (key, code, vk, modifiers = 0) => { await keyEvent("keyDown", key, code, vk, modifiers); await keyEvent("keyUp", key, code, vk, modifiers); await sleep(150); };
const mouseMoveTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }); await sleep(150); };
const mousePressAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await sleep(80); };
const mouseReleaseAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); await sleep(150); };
// Scroll halus (index.css:62 html{scroll-behavior:smooth}) — scrollIntoView lalu
// TUNGGU settle, BARU ukur ulang rect. Ukur sebelum settle = posisi pra-scroll.
const scrollToEl = async (jsFind) => {
  await evalJs(`(() => { const el = ${jsFind}; if (!el) return 'TIDAK-ADA'; el.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await sleep(800);
  return evalJs(`(() => { const el = ${jsFind}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), top: Math.round(r.top) }; })()`);
};

if (WIDTH === 390) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);

  // ---------- A3 ronde 2 ----------
  await safe("A3-hover-ewallet-v3", async () => {
    const pos = await scrollToEl(`[...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay'))`);
    if (!pos) return "TIDAK-ADA-KARTU-GOPAY";
    const before = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); return getComputedStyle(a).borderColor; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const after = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); const cs = getComputedStyle(a); return { borderColor: cs.borderColor, transform: cs.transform }; })()`);
    return { posisi: pos, borderSebelum: before, borderSesudahHover: after };
  });

  // ---------- A9 ronde 2 (pasca-perbaikan) ----------
  await nav("#/");
  await safe("A9-press-kartu-game-v3", async () => {
    const pos = await scrollToEl(`[...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('Mobile Legends'))`);
    if (!pos) return "TIDAK-ADA-KARTU";
    await mousePressAt(pos.x, pos.y);
    const t = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('Mobile Legends')); return { transform: getComputedStyle(a).transform, borderColor: getComputedStyle(a).borderColor }; })()`);
    await mouseReleaseAt(pos.x, pos.y);
    return { posisi: pos, saatDitekan: t };
  });

  // ---------- F73 ronde 2: pilih nominal dulu ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await sleep(300);
  await safe("F73-space-pay-v3", async () => {
    const ada = await evalJs(`(() => { const p = document.querySelector('.pay'); if (!p) return 'TIDAK-ADA-PAY'; p.focus(); return 'fokus:' + (document.activeElement === p); })()`);
    if (ada !== 'fokus:true') return ada;
    await sleep(200);
    await pressKey(" ", "Space", 32);
    await sleep(300);
    return evalJs(`(() => ({ metodeTerpilih: document.querySelector('.pay.on .p-name2')?.textContent.trim() || null, ariaPressed: document.querySelector('.pay.on')?.getAttribute('aria-pressed') || null }))()`);
  });

  // ---------- I96 ronde 2: fresh load deep link ----------
  await evalJs(`(() => { const o = { ref: 'RSD-S459I96', kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '', token: null }; localStorage.setItem('rosdi_orders', JSON.stringify([o])); return 'seeded'; })()`);
  await nav("#/cek/RSD-S459I96");
  await reload();
  await safe("I96-timeline-cek-v3", () => evalJs(`(() => { const items = [...document.querySelectorAll('.timeline li')].map((li) => li.textContent.trim()); return { itemTimeline: items }; })()`));
}

writeFileSync(outDir + "/cdp-s459-verify2-" + WIDTH + ".json", JSON.stringify(R, null, 1));
console.log("SELESAI-VERIFY2-" + WIDTH);
