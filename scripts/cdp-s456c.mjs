// Probe CDP s456 run-3 (width 390): verifikasi order J97 (disc/total tersimpan),
// J100 INP, I88 luber. Perbaikan: reload penuh dulu agar script
// addScriptToEvaluateOnNewDocument jalan (profil Chrome dipakai ulang).
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
await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__cls=0; window.__inp=[]; new PerformanceObserver((l)=>{for(const e of l.getEntries()){if(!e.hadRecentInput)window.__cls+=e.value;}}).observe({type:'layout-shift',buffered:true}); new PerformanceObserver((l)=>{for(const e of l.getEntries()){if(e.interactionId)window.__inp.push({name:e.name,dur:Math.round(e.duration)});}}).observe({type:'event',buffered:true,durationThreshold:16});` });
await setMetrics(390);
// Reload penuh agar observer terpasang (navigasi hash tidak memuat dokumen baru).
await evalJs(`location.reload(); 'ok'`);
await sleep(3000);
rec("observer-check", await evalJs(`({ clsDefined: typeof window.__cls !== 'undefined', inpDefined: typeof window.__inp !== 'undefined', url: location.href })`));

// ---------- J97 verifikasi: 2 order ROSDI10 tersimpan (terbaru dulu) ----------
await safe("J97-verify-orders", () => evalJs(`(() => { const os = JSON.parse(localStorage.getItem('rosdi_orders') || '[]'); return os.slice(0, 4).map((o) => ({ ref: o.ref, item: o.item, disc: o.disc, total: o.total, method: o.method })); })()`));

// ---------- J100: INP klik Beli ----------
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
rec("J100-inp", { entriesBaru: await evalJs(`window.__inp.slice(${inpBefore})`), hash: await evalJs(`location.hash`), orderBaru: await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]; return o ? { ref: o.ref, total: o.total } : null; })()`) });

// ---------- I88: luber harga .pay pada font 200% ----------
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
await sleep(300);
await safe("I88-luber", () => evalJs(`(() => { const els = [...document.querySelectorAll('body *')]; for (const el of els) { const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize); if (fs > 0) el.style.fontSize = (fs * 2) + 'px'; } const pays = [...document.querySelectorAll('.pay')].map((p) => { const pr = p.getBoundingClientRect(); const price = p.querySelector('.p-price'); const r2 = price?.getBoundingClientRect(); const name = p.querySelector('.p-name2'); const r3 = name?.getBoundingClientRect(); return { name: name?.textContent, priceLuberPx: r2 ? Math.round(r2.right - pr.right) : null, namaLuberBawahPx: r3 ? Math.round(r3.bottom - pr.bottom) : null, sw: p.scrollWidth, cw: p.clientWidth }; }); const noms = [...document.querySelectorAll('.nom')].filter((e) => e.scrollHeight > e.clientHeight + 2).length; const btns = [...document.querySelectorAll('.btn')].filter((e) => e.scrollWidth > e.clientWidth + 2).length; const mb = document.querySelector('.mobile-bar'); const mbClip = mb ? { sw: mb.scrollWidth, cw: mb.clientWidth, sh: mb.scrollHeight, ch: mb.clientHeight } : null; return { pays, nomClipped: noms, btnClipped: btns, mobileBar: mbClip }; })()`));

writeFileSync(`${outDir}/cdp-s456-run3-390.json`, JSON.stringify(R, null, 1));
console.log("SELESAI-RUN3-390");
process.exit(0);
