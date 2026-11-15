// Perbaikan ukur CDP batch s435: ide 13, 20, 21, 64, 65, 68, 69, 18, 27, 36 + 12.
// Perbedaan vs cdp-s435.mjs: reset tab ke Diamonds sebelum pilih nominal,
// timeout 25 detik per panggilan CDP agar tidak menggantung.
// Penggunaan: node scripts/cdp-s435-fixup.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
mkdirSync(outDir, { recursive: true });
const R = {};
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const to = setTimeout(() => { pending.delete(id); reject(new Error("TIMEOUT " + method)); }, 25000);
    pending.set(id, { resolve: (v) => { clearTimeout(to); resolve(v); }, reject: (e) => { clearTimeout(to); reject(e); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 560 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(900); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickNom = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.nom')]; const el = els.find((e) => e.querySelector('.n-name')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickPay = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.pay')]; const el = els.find((e) => e.querySelector('.p-name2')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickTab = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.tab')]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const summary = () => evalJs(`(() => { const rows = [...document.querySelectorAll('.summary .sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()); const total = document.querySelector('.sum-total b')?.textContent || null; const mb = document.querySelector('.mobile-bar .mb-total'); const mbName = mb?.querySelector('span')?.textContent || null; const mbTotal = mb?.querySelector('b')?.textContent || null; const mbB = mb?.querySelector('b'); const mbSpan = mb?.querySelector('span'); return { rows, total, mbName, mbTotal, mbOverflow: mbB ? { scrollW: mbB.scrollWidth, clientW: mbB.clientWidth } : null, mbSpanOverflow: mbSpan ? { scrollW: mbSpan.scrollWidth, clientW: mbSpan.clientWidth, text: mbSpan.textContent } : null }; })()`);
const safe = async (id, fn) => { try { R[id] = await fn(); console.log("fixup:", id, "OK"); } catch (e) { R[id] = { ERROR: String(e).slice(0, 300) }; console.log("fixup:", id, "ERROR", String(e).slice(0, 120)); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2000);
await evalJs(`localStorage.clear(); 'ok'`);

if (width === 320) {
  // ---- 13: Blessing of the Welkin Moon di mobile-bar 320
  await goHash("#/game/genshin-impact");
  await setInput("#uid", "12345678");
  await clickTab("Blessing"); await sleep(200);
  await clickNom("Blessing of the Welkin Moon"); await sleep(200);
  await safe("blessing13", summary);
  // ---- 21: transisi angka total di halaman produk
  await safe("anim21", async () => evalJs(`(() => { const cs = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { transition: s.transition, duration: s.transitionDuration }; }; return { sumTotalB: cs('.sum-total b'), mbTotalB: cs('.mobile-bar .mb-total b'), nomGrid: cs('.nom-grid'), qtyB: cs('.qty b'), body: cs('body') }; })()`));
}

if (width === 390) {
  // ---- 64/68/69/20: reset tab Diamonds dulu (pelajaran run sebelumnya)
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickTab("Diamonds"); await sleep(200);
  await clickNom("172 Diamonds"); await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await safe("race64", async () => {
    await evalJs(`(() => { const f = document.querySelector('.step form'); for (let i = 0; i < 3; i++) f.requestSubmit(); return 'ok'; })()`);
    await sleep(300);
    return evalJs(`(() => ({ discRows: document.querySelectorAll('.sum-row.disc').length, discText: document.querySelector('.sum-row.disc')?.textContent?.replace(/\\s+/g, ' ').trim(), total: document.querySelector('.sum-total b')?.textContent, msg: document.querySelector('.note.good')?.textContent?.trim() }))()`);
  });
  await safe("race68", async () => {
    await setInput(".step input[aria-label='Kode promo']", "GAMER5");
    await evalJs(`document.querySelector('.step form .btn')?.click(); 'ok'`);
    await sleep(200);
    const afterGamer = await evalJs(`(() => ({ disc: document.querySelector('.sum-row.disc')?.textContent?.replace(/\\s+/g, ' ').trim(), msg: document.querySelector('.note.good')?.textContent?.trim() }))()`);
    await setInput(".step input[aria-label='Kode promo']", "SALAH99");
    await evalJs(`document.querySelector('.step form .btn')?.click(); 'ok'`);
    await sleep(200);
    const afterBad = await evalJs(`(() => ({ discRows: document.querySelectorAll('.sum-row.disc').length, msg: document.querySelector('.note.bad')?.textContent?.trim() }))()`);
    return { afterGamer, afterBad };
  });
  await safe("race69", async () => {
    await clickPay("QRIS"); await sleep(150);
    await clickNom("86 Diamonds"); await sleep(150);
    await clickNom("172 Diamonds"); await sleep(150);
    return evalJs(`(() => ({ payOn: document.querySelector('.pay.on .p-name2')?.textContent, total: document.querySelector('.sum-total b')?.textContent }))()`);
  });
  await safe("fee20", async () => evalJs(`(() => { const payRow = document.querySelector('.pay.on .p-fee')?.textContent; const biayaRow = [...document.querySelectorAll('.summary .sum-row')].find((r) => r.textContent.includes('Biaya pembayaran')); return { payFeeLabel: payRow, summaryBiaya: biayaRow?.textContent?.replace(/\\s+/g, ' ').trim(), total: document.querySelector('.sum-total b')?.textContent }; })()`));
  // ---- 65 + 18: beli qty 3 + ROSDI10 + GoPay, lalu bandingkan total Sukses
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickTab("Diamonds"); await sleep(200);
  await clickNom("172 Diamonds");
  await evalJs(`(() => { const p = document.querySelector('.qty .plus'); p.click(); p.click(); return 'ok'; })()`);
  await clickPay("GoPay"); await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`document.querySelector('.step form .btn')?.click(); 'ok'`);
  await sleep(300);
  await safe("buy65", async () => {
    const before = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
    const mbTotal = await evalJs(`document.querySelector('.mobile-bar .mb-total b')?.textContent`);
    const sumTotal = await evalJs(`document.querySelector('.sum-total b')?.textContent`);
    await evalJs(`(() => { const btns = [...document.querySelectorAll('.mobile-bar .btn, .summary .btn.big')].filter((x) => x.textContent.trim() === 'Beli Sekarang' && !x.disabled); if (!btns.length) return 'NO-ENABLED-BTN'; btns[0].click(); btns[0].click(); return 'clicked'; })()`);
    await sleep(1200);
    const after = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
    const hash = await evalJs(`location.hash`);
    const suksesTotal = await evalJs(`document.querySelector('.sum-total b')?.textContent || null`);
    const h1 = await evalJs(`document.querySelector('h1')?.textContent || null`);
    return { before, after, hash, mbTotalBeforeBuy: mbTotal, sumTotalBeforeBuy: sumTotal, suksesTotal, h1 };
  });
  await safe("copy27", async () => {
    const t0 = await evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
    await sleep(300);
    const t03 = await evalJs(`[...document.querySelectorAll('.btn.ghost')].map((x) => x.textContent.trim()).join('|')`);
    await sleep(1000);
    const t13 = await evalJs(`[...document.querySelectorAll('.btn.ghost')].map((x) => x.textContent.trim()).join('|')`);
    await sleep(1500);
    const t28 = await evalJs(`[...document.querySelectorAll('.btn.ghost')].map((x) => x.textContent.trim()).join('|')`);
    const live = await evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => /Salin/.test(x.textContent)); return b ? { live: b.getAttribute('aria-live'), role: b.getAttribute('role') } : null; })()`);
    return { t0, t03, t13, t28, live };
  });
  // ---- 12: e-money max yang bisa dicapai (tanpa qty) di 390
  await goHash("#/emoney/dana");
  await setInput("#hp", "081234567890");
  await clickNom("Saldo 500.000");
  await clickPay("Pulsa Telkomsel");
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`document.querySelector('.step form .btn')?.click(); 'ok'`);
  await sleep(300);
  await safe("emoney12", summary);
}
writeFileSync(`${outDir}/s435-fixup-w${width}.json`, JSON.stringify(R, null, 1));
console.log(`FIXUP W${width} OK`);
