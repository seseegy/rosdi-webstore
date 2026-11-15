// Probe CDP s454b — ulangi alur beli dengan pemilihan metode yang benar
// (s454a gagal memilih metode: teks baris .pay diawali mark "QR", bukan nama).
import { mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rec = (id, data) => console.log(id, JSON.stringify(data));
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const setWidth = async (w, h = 844) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const clickPay = `(name) => { const el = [...document.querySelectorAll('.pay')].find((e) => e.querySelector('.p-name2')?.textContent.trim() === name); if (!el) return 'TIDAK-ADA:' + name; el.click(); return 'klik-pay:' + name; }`;

// ---------- F51 ulang: Voucher GP 5.000 + ROSDI10 via QRIS ----------
await setWidth(390);
await nav("#/voucher/google-play");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#vemail'), 'nama@email.com'); return 'ok'; })()`);
rec("51b-nom", await evalJs(`(${clickText})('.nom', 'Saldo 5.000')`));
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
rec("51b-pakai", await evalJs(`(${clickText})('.btn', 'Pakai')`));
await sleep(300);
rec("51b-pay", await evalJs(`(${clickPay})('QRIS')`));
await sleep(300);
rec("51b-summary", await evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); const btn = document.querySelector('.summary .btn.big'); return { total: document.querySelector('.sum-total b')?.textContent, mb: document.querySelector('.mb-total b')?.textContent, discRow: rows.find((r) => r.startsWith('Diskon')) || null, beliDisabled: btn.disabled }; })()`));
rec("51b-buy", await evalJs(`(() => { const btn = document.querySelector('.summary .btn.big'); const before = btn.textContent.trim(); btn.click(); return { before, afterSync: btn.textContent.trim(), hash: location.hash }; })()`));
await sleep(1500);
rec("51b-sukses", await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, total: document.querySelector('.sum-total b')?.textContent, rincian: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()).find((t) => t.startsWith('Harga + biaya')) || null }))()`));
// H71 + J100 di Sukses
rec("71b-salin-aria", await evalJs(`(() => [...document.querySelectorAll('button')].filter((b) => /Salin/.test(b.textContent)).map((b) => ({ text: b.textContent.trim(), ariaLabel: b.getAttribute('aria-label') })))()`));
rec("100b-salin-klik", await evalJs(`(async () => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return 'TIDAK-ADA tombol Salin'; b.click(); await new Promise((r) => setTimeout(r, 300)); return b.textContent.trim(); })()`));
// A8 hover dua tombol aksi Sukses (dengan mouse sungguhan)
for (const t of ["Belanja Lagi", "Cek Transaksi"]) {
  const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(t)}); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), before: { bg: getComputedStyle(b).backgroundColor, border: getComputedStyle(b).borderColor, color: getComputedStyle(b).color } }; })()`);
  if (!pos) { rec("8b-hover-" + t, "TIDAK-ADA"); continue; }
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pos.x, y: pos.y });
  await sleep(300);
  rec("8b-hover-" + t, await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(t)}); const cs = getComputedStyle(b); return { before: ${JSON.stringify(pos.before)}, after: { bg: cs.backgroundColor, border: cs.borderColor, color: cs.color } }; })()`));
}

// ---------- A3 + A2 ulang: MLBB stepper + submit ----------
await setWidth(1280, 900);
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
rec("3b-nom", await evalJs(`(${clickText})('.nom', '172 Diamonds')`));
rec("3b-pay", await evalJs(`(${clickPay})('QRIS')`));
await sleep(300);
rec("3b-stepper", await evalJs(`(() => { const b = document.querySelector('.qty b'); const before = b; const plus = document.querySelector('.qty button.plus'); plus.click(); const nb = document.querySelector('.qty b'); const anims = nb.getAnimations().map((a) => a.animationName); return { qtyBefore: '1', qtyAfter: nb.textContent, nodeReplaced: before !== nb, animName: getComputedStyle(nb).animationName, runningAnims: anims }; })()`));
await sleep(300);
rec("3b-total-qty2", await evalJs(`(() => ({ total: document.querySelector('.sum-total b')?.textContent, hargaRow: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()).find((r) => r.startsWith('Harga')) || null }))()`));
rec("2b-submit", await evalJs(`(() => { const btn = document.querySelector('.summary .btn.big'); const before = { text: btn.textContent.trim(), disabled: btn.disabled }; btn.click(); return { before, afterSync: { text: btn.textContent.trim(), disabled: btn.disabled }, hash: location.hash }; })()`));
await sleep(1500);
rec("2b-after-nav", await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, total: document.querySelector('.sum-total b')?.textContent }))()`));

console.log("DONE");
process.exit(0);
