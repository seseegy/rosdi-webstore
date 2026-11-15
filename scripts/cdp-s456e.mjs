// Verifikasi perbaikan s456 (width 390): H71 meta, H78 aria-live,
// A9 animasi Hapus, F57 UI end-to-end (ringkasan + mobile-bar + Sukses).
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
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
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const payClick = `(name) => { const el = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes(name) && !p.disabled); if (!el) return 'TIDAK-ADA-PAY:' + name; el.click(); return 'klik-pay:' + name; }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
await setMetrics(390);
await nav("#/");
await evalJs(`localStorage.clear(); 'ok'`);

// H71: meta format-detection tersaji?
rec("H71-meta", await evalJs(`(() => { const m = document.querySelector('meta[name="format-detection"]'); return m ? m.content : 'TIDAK-ADA'; })()`));

// H78: aria-live pada hasil Cek Nama PLN.
await nav("#/pln");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Cek Nama')`);
await sleep(400);
rec("H78-aria-live", await evalJs(`(() => { const n = document.querySelector('.note.good'); return n ? { text: n.textContent.trim().slice(0, 40), ariaLive: n.getAttribute('aria-live') } : 'TIDAK-ADA-NOTE'; })()`));

// A9: tombol Hapus kini beranimasi?
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
rec("A9-hapus-anim", await evalJs(`(() => { const h = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Hapus'); const p = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pakai'); return { hapusAnim: h ? getComputedStyle(h).animationName : null, hapusRunning: h ? h.getAnimations().map((a) => a.animationName) : [], pakaiAda: !!p }; })()`));

// F57 UI: PLN Token 100.000 + GAMER5 + GoPay -> disc 5000, total 97750 (ringkasan, mobile-bar, Sukses).
await nav("#/pln");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Cek Nama')`);
await sleep(400);
await evalJs(`(${clickText})('.nom', 'Token 100.000')`);
await evalJs(`(${payClick})('GoPay')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'GAMER5'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(400);
rec("F57-ringkasan", await evalJs(`(() => { const disc = document.querySelector('.sum-row.disc b')?.textContent; const total = document.querySelector('.sum-total b')?.textContent; const mb = document.querySelector('.mobile-bar .mb-total b')?.textContent; return { disc, total, mobileBar: mb }; })()`));
const beli = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn') || document.querySelector('.summary .btn.big'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: b.disabled }; })()`);
if (!beli.disabled) {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: beli.x, y: beli.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: beli.x, y: beli.y, button: "left", clickCount: 1 });
}
await sleep(2000);
rec("F57-sukses", await evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); const token = document.querySelector('.token-box')?.textContent.trim(); return { hash: location.hash, rows: rows.filter((t) => /Total|Diskon|Biaya/.test(t)), tokenAda: !!token }; })()`));

writeFileSync(`${outDir}/cdp-s456-verify-390.json`, JSON.stringify(R, null, 1));
console.log("SELESAI-VERIFY-390");
process.exit(0);
