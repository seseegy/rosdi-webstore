// Probe CDP s455c (perbaikan): pay-click via .p-name2 (teks baris diawali
// mark), A7/A9/A10 ulang, buy end-to-end F51/F57/F60, kontras H75/H76
// dengan tema eksplisit, panah Server H79 via key event nyata, J98 ulang.
import { mkdirSync } from "node:fs";
const [wsUrl, , baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rec = (id, data) => console.log(id, JSON.stringify(data));
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; });
const setWidth = async (w, h = 844) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const clickPay = `(name) => { const el = [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === name); if (!el) return 'TIDAK-ADA:' + name; el.click(); return 'klik:' + name; }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await setWidth(390);
// Bersihkan tema tersimpan agar pengukuran kontras deterministik (light dulu).
await nav("#/");
await evalJs(`(() => { localStorage.removeItem('rosdi_theme'); return 'ok'; })()`);

// ---------- A7 ulang: klik nominal, tunggu, baca kelas + animasi ----------
await nav("#/game/mobile-legends");
await safe("A7-redo", () => evalJs(`(async () => { const nom = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('86 Diamonds')); nom.click(); await new Promise((r) => setTimeout(r, 120)); const cs = getComputedStyle(nom); return { cls: nom.className, anim: cs.animationName, running: nom.getAnimations().map((a) => a.animationName), transform: cs.transform }; })()`));

// ---------- A9 ulang: baris Biaya sebelum/sesudah pilih BCA VA ----------
await safe("A9-redo", () => evalJs(`(async () => { const row = () => { const r = [...document.querySelectorAll('.sum-row')].find((x) => x.textContent.startsWith('Biaya pembayaran')); return r ? { text: r.textContent.trim(), anim: getComputedStyle(r).animationName, running: r.getAnimations().map((a) => a.animationName) } : null; }; const before = row(); const clickPay = ${clickPay}; clickPay('BCA Virtual Account'); await new Promise((r) => setTimeout(r, 150)); const after = row(); return { before, after }; })()`));

// ---------- A10 ulang: Telkomsel -> Indosat di halaman Pulsa Telkomsel ----------
await nav("#/pulsa/telkomsel");
await safe("A10-redo", () => evalJs(`(async () => { const setV = ${setVal}; const inp = document.querySelector('#hp'); setV(inp, '081234567890'); await new Promise((r) => setTimeout(r, 400)); const good1 = document.querySelector('.note.good')?.textContent; setV(inp, '085612345678'); await new Promise((r) => setTimeout(r, 80)); const bad = document.querySelector('.note.bad'); const badNow = bad ? { text: bad.textContent.slice(0, 80), anim: getComputedStyle(bad).animationName, running: bad.getAnimations().map((a) => a.animationName) } : null; const goodAfter = document.querySelector('.note.good')?.textContent || null; return { good1, goodAfter, badNow }; })()`));

// ---------- A4 ulang: animasi collapse riwayat (ukur segera setelah klik tutup) ----------
await nav("#/cek");
await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-TEST000' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1,2,3,4,5,6,7].map(mk))); return 'ok'; })()`);
await nav("#/cek");
await safe("A4-redo", () => evalJs(`(async () => { const btn = [...document.querySelectorAll('button')].find((b) => /Lihat semua/.test(b.textContent)); btn.click(); await new Promise((r) => setTimeout(r, 400)); const open = document.querySelectorAll('.hist-in .sum-row').length; btn.click(); await new Promise((r) => setTimeout(r, 60)); const sec = document.querySelector('.hist-in'); const closed = document.querySelectorAll('.hist-in .sum-row').length; return { open, closed, runningRightAfterClose: sec.getAnimations().map((a) => ({ name: a.animationName, state: a.playState })), sectionTransition: getComputedStyle(sec).transitionProperty }; })()`));

// ---------- F51 buy end-to-end (QRIS) ----------
await nav("#/game/free-fire");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '5 Diamonds')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'GAMER5'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await safe("F51-pay", () => evalJs(`(${clickPay})('QRIS')`));
await sleep(300);
await safe("F51-summary", () => evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); return { total: document.querySelector('.sum-total b')?.textContent, mb: document.querySelector('.mb-total b')?.textContent, discRow: rows.find((r) => r.startsWith('Diskon')) || null, payOn: document.querySelector('.pay.on .p-name2')?.textContent }; })()`));
await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
await sleep(1200);
await safe("F51-sukses", () => evalJs(`(() => ({ hash: location.hash, total: document.querySelector('.sum-total b')?.textContent, rincian: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()).find((t) => t.startsWith('Harga + biaya')) || null }))()`));

// ---------- F57 buy end-to-end (BCA VA) ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '172 Diamonds')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(300);
await safe("F57-pay", () => evalJs(`(${clickPay})('BCA Virtual Account')`));
await sleep(300);
await safe("F57-summary", () => evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); return { total: document.querySelector('.sum-total b')?.textContent, mb: document.querySelector('.mb-total b')?.textContent, discRow: rows.find((r) => r.startsWith('Diskon')) || null, bca: [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === 'BCA Virtual Account')?.querySelector('.p-price')?.textContent, payOn: document.querySelector('.pay.on .p-name2')?.textContent }; })()`));
await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
await sleep(1200);
await safe("F57-sukses", () => evalJs(`(() => ({ hash: location.hash, total: document.querySelector('.sum-total b')?.textContent, rincian: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()).find((t) => t.startsWith('Harga + biaya')) || null }))()`));

// ---------- F60 buy end-to-end (emoney DANA via QRIS) ----------
await nav("#/emoney/dana");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', 'Saldo 50.000')`);
await safe("F60-pay", () => evalJs(`(${clickPay})('QRIS')`));
await sleep(300);
await safe("F60-summary", () => evalJs(`(() => ({ total: document.querySelector('.sum-total b')?.textContent, payOn: document.querySelector('.pay.on .p-name2')?.textContent }))()`));
await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
await sleep(1200);
await safe("F60-sukses", () => evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim()); return { hash: location.hash, total: document.querySelector('.sum-total b')?.textContent, rincian: rows.find((t) => t.startsWith('Harga + biaya')) || null, produk: rows.find((t) => t.startsWith('Produk')) || null, tujuan: rows.find((t) => t.startsWith('Tujuan')) || null }; })()`));

// ---------- H75/H76 kontras dengan tema eksplisit ----------
const contrast = `((fg, bg) => { const lum = (c) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.substr(i, 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; const rgb = (s) => { const m = s.match(/\\d+/g); return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join(''); }; const L1 = lum(rgb(fg)), L2 = lum(rgb(bg)); return ((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2); })`;
for (const theme of ["light", "dark"]) {
  await evalJs(`(() => { localStorage.setItem('rosdi_theme', ${JSON.stringify(theme)}); return 'ok'; })()`);
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'SALAH123'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.btn', 'Pakai')`);
  await sleep(300);
  await safe("H75-" + theme, () => evalJs(`(() => { const n = document.querySelector('.note.bad'); if (!n) return 'TIDAK-ADA'; const cs = getComputedStyle(n); const bg = getComputedStyle(document.body).backgroundColor; const stepBg = getComputedStyle(n.closest('.step')).backgroundColor; return { theme: document.documentElement.dataset.theme, color: cs.color, bodyBg: bg, stepBg, ratioVsStep: (${contrast})(cs.color, stepBg), ratioVsBody: (${contrast})(cs.color, bg) }; })()`));
  await safe("H76-" + theme, () => evalJs(`(() => { const b = document.querySelector('.crumb .back'); const cs = getComputedStyle(b); const bg = getComputedStyle(document.body).backgroundColor; return { theme: document.documentElement.dataset.theme, text: b.textContent.trim(), color: cs.color, bodyBg: bg, ratio: (${contrast})(cs.color, bg) }; })()`));
}

// ---------- H79 ulang: panah bawah nyata via CDP pada select terfokus ----------
await nav("#/game/genshin-impact");
await safe("H79-redo", () => evalJs(`(() => { const sel = document.querySelector('#server'); sel.focus(); return { focused: document.activeElement === sel, value: sel.value }; })()`));
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 });
await sleep(200);
await safe("H79-after-down", () => evalJs(`(() => { const sel = document.querySelector('#server'); return { value: sel.value, idx: sel.selectedIndex }; })()`));
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 });
await sleep(200);
await safe("H79-after-down2", () => evalJs(`(() => { const sel = document.querySelector('#server'); return { value: sel.value, idx: sel.selectedIndex }; })()`));

// ---------- J98 ulang: GoPay via .p-name2, lalu ganti Server ----------
await nav("#/game/genshin-impact");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '60 Genesis Crystal')`);
await safe("J98-pay", () => evalJs(`(${clickPay})('GoPay')`));
await sleep(300);
await safe("J98-redo", () => evalJs(`(async () => { const before = document.querySelector('.pay.on .p-name2')?.textContent; const sel = document.querySelector('#server'); const setSel = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setSel.call(sel, 'Amerika'); sel.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 400)); const after = document.querySelector('.pay.on .p-name2')?.textContent; return { before, after, same: before === after && !!before, server: sel.value, nomStill: document.querySelector('.nom.on')?.textContent?.slice(0, 30) }; })()`));

console.log("SELESAI-S455C");
process.exit(0);
