// Probe CDP s456 lanjutan (width 390): ulangi A4/A5/H75/H76/J97/J100 yang
// gagal karena label tombol ("Cek" bukan "Lacak") & klik pay ("QR" prefix).
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
const keyEvent = async (type, key, code, vk, modifiers = 0) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
const pressKey = async (key, code, vk, modifiers = 0) => { await keyEvent("keyDown", key, code, vk, modifiers); await keyEvent("keyUp", key, code, vk, modifiers); await sleep(120); };
const activeEl = () => evalJs(`(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; const r = a.getBoundingClientRect(); return { tag: a.tagName, id: a.id || '', text: (a.textContent || '').trim().slice(0, 30), y: Math.round(r.top + window.scrollY) }; })()`);
await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__cls=0; window.__inp=[]; new PerformanceObserver((l)=>{for(const e of l.getEntries()){if(!e.hadRecentInput)window.__cls+=e.value;}}).observe({type:'layout-shift',buffered:true}); new PerformanceObserver((l)=>{for(const e of l.getEntries()){if(e.interactionId)window.__inp.push({name:e.name,dur:Math.round(e.duration)});}}).observe({type:'event',buffered:true,durationThreshold:16});` });
await setMetrics(390);
await nav("#/");
await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/cek");
await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-TEST000' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1,2,3,4,5,6,7].map(mk))); return 'seeded'; })()`);

// ---------- A4 ulang: tombol "Cek" (bukan "Lacak") ----------
await safe("A4-lacak-ulang", () => evalJs(`(async () => { const input = document.querySelector('input[aria-label="Nomor transaksi"]'); const setV = ${setVal}; setV(input, 'RSD-DEMO1234'); const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek'); if (!btn) return 'TIDAK-ADA-CEK'; const t0 = performance.now(); btn.click(); let ms = null; for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 10)); if (document.querySelector('.cek-result')) { ms = Math.round(performance.now() - t0); break; } } return { msToResult: ms, spinner: !!document.querySelector('.spinner, [class*="spin"], [class*="loading"]'), btnDisabledDuring: btn.disabled, resultAda: !!document.querySelector('.cek-result') }; })()`));

// ---------- A5 ulang: Hapus -> tunggu 400ms, cek baris Diskon ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Pakai')`);
await sleep(400);
await safe("A5-diskon-ulang", () => evalJs(`(async () => { const before = !!document.querySelector('.sum-row.disc'); const hapus = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Hapus'); hapus.click(); await new Promise((r) => setTimeout(r, 400)); const after400 = !!document.querySelector('.sum-row.disc'); return { rowAdaSebelum: before, rowAda400msSetelahHapus: after400 }; })()`));

// ---------- A6 ulang: animasi note mismatch ----------
await nav("#/pulsa/telkomsel");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081546789012'); return 'ok'; })()`);
await sleep(400);
await safe("A6-mismatch-anim", () => evalJs(`(() => { const m = [...document.querySelectorAll('.note.bad')].find((n) => /terdeteksi sebagai/.test(n.textContent)); if (!m) return 'TIDAK-ADA'; return { text: m.textContent.trim().slice(0, 60), animName: getComputedStyle(m).animationName, animDur: getComputedStyle(m).animationDuration }; })()`));

// ---------- H75 ulang: Space pada Beli (pay QRIS diklik benar) ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '5 Diamonds')`);
await evalJs(`(${payClick})('QRIS')`);
await sleep(300);
await safe("H75-space-ulang", () => evalJs(`(() => { const beli = document.querySelector('.mobile-bar .btn') || document.querySelector('.summary .btn.big'); if (!beli) return 'TIDAK-ADA-BELI'; beli.focus(); return { focused: document.activeElement === beli, disabled: beli.disabled }; })()`));
await keyEvent("keyDown", " ", "Space", 32);
await sleep(100);
await keyEvent("keyUp", " ", "Space", 32);
await sleep(1500);
rec("H75-space-hasil", await evalJs(`(() => ({ hashAfter: location.hash, sukses: location.hash.startsWith('#/sukses'), lastOrder: JSON.parse(localStorage.getItem('rosdi_orders') || '[]').slice(-1)[0] || null }))()`));

// ---------- H76 ulang: alur lengkap Tagihan (ID -> Cek Tagihan -> pilih item -> Tab) ----------
await nav("#/tagihan/pln-pascabayar");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#billid'), '543210987654'); return 'ok'; })()`);
await evalJs(`(${clickText})('.btn', 'Cek Tagihan')`);
await sleep(400);
await evalJs(`(${clickText})('.nom', 'Tagihan')`);
await sleep(300);
await evalJs(`(() => { document.activeElement?.blur(); window.scrollTo(0, 0); return 'ok'; })()`);
const tabSeq = [];
for (let i = 0; i < 22; i++) { await pressKey("Tab", "Tab", 9); tabSeq.push(await activeEl()); }
rec("H76-tab-lengkap", { seq: tabSeq });

// ---------- J97 ulang: promo 2x (pay QRIS benar) ----------
const orderWithPromo = async (tag) => {
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await evalJs(`(${payClick})('QRIS')`);
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.btn', 'Pakai')`);
  await sleep(400);
  const t = await evalJs(`(() => { const row = document.querySelector('.sum-row.disc b'); const tot = document.querySelector('.sum-total b'); const payOn = document.querySelector('.pay.on .p-name2')?.textContent; return { disc: row?.textContent, total: tot?.textContent, payOn }; })()`);
  const beli = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn') || document.querySelector('.summary .btn.big'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: b.disabled }; })()`);
  if (!beli.disabled) {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: beli.x, y: beli.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: beli.x, y: beli.y, button: "left", clickCount: 1 });
  }
  await sleep(1500);
  const after = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]').slice(-1)[0]; return { hash: location.hash, ref: o?.ref || null, disc: o?.disc, total: o?.total }; })()`);
  return { tag, ...t, ...after };
};
rec("J97-order-1-ulang", await orderWithPromo("order1"));
rec("J97-order-2-ulang", await orderWithPromo("order2"));

// ---------- J100 ulang: INP klik Beli ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
await evalJs(`(${payClick})('QRIS')`);
await sleep(300);
const inpBefore = await evalJs(`window.__inp.length`);
const beli2 = await evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn') || document.querySelector('.summary .btn.big'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: b.disabled }; })()`);
await send("Input.dispatchMouseEvent", { type: "mousePressed", x: beli2.x, y: beli2.y, button: "left", clickCount: 1 });
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: beli2.x, y: beli2.y, button: "left", clickCount: 1 });
await sleep(2000);
rec("J100-inp-ulang", { entriesBaru: await evalJs(`window.__inp.slice(${inpBefore})`), hash: await evalJs(`location.hash`), lastOrder: await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').slice(-1)[0]?.ref || null`) });

// ---------- I88 verifikasi: apakah harga .pay meluber keluar border kartu? ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
await sleep(300);
await safe("I88-luber", () => evalJs(`(() => { const els = [...document.querySelectorAll('body *')]; for (const el of els) { const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize); if (fs > 0) el.style.fontSize = (fs * 2) + 'px'; } const pays = [...document.querySelectorAll('.pay')].map((p) => { const pr = p.getBoundingClientRect(); const price = p.querySelector('.p-price'); const r2 = price?.getBoundingClientRect(); const name = p.querySelector('.p-name2'); const r3 = name?.getBoundingClientRect(); return { name: name?.textContent, priceRightVsRowRight: r2 ? Math.round(r2.right - pr.right) : null, nameBottomVsRowBottom: r3 ? Math.round(r3.bottom - pr.bottom) : null }; }); const noms = [...document.querySelectorAll('.nom')].filter((e) => e.scrollHeight > e.clientHeight + 2).length; const btns = [...document.querySelectorAll('.btn')].filter((e) => e.scrollWidth > e.clientWidth + 2).length; const mb = document.querySelector('.mobile-bar'); const mbClip = mb ? (mb.scrollWidth > mb.clientWidth + 2 || mb.scrollHeight > mb.clientHeight + 2) : null; return { pays, nomClipped: noms, btnClipped: btns, mobileBarClipped: mbClip }; })()`));

writeFileSync(`${outDir}/cdp-s456-followup-390.json`, JSON.stringify(R, null, 1));
console.log("SELESAI-FOLLOWUP-390");
process.exit(0);
