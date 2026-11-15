// Probe CDP s446 bagian 3 (mini): .flow di 900px (97), back HP dari Sukses (93),
// voucher email kosong (24).
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, widthArg, , outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
const HEIGHT = parseInt(process.env.CDP_H || "900", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH, height: HEIGHT };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900 });
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const nav = async (h) => { await evalJs(`location.hash = '${h}'; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickBtn = async (sel) => evalJs(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return 'NO-EL'; if (b.disabled) return 'DISABLED'; b.click(); return 'clicked'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);
if (WIDTH === 900) {
  await nav("#/game/mobile-legends");
  R.flow900 = await evalJs(`(() => { const f = document.querySelector('.flow'); const cs = getComputedStyle(f); const mb = document.querySelector('.mobile-bar'); return { flowCols: cs.gridTemplateColumns, asideDisplay: getComputedStyle(document.querySelector('aside')).display, mobileBarDisplay: getComputedStyle(mb).display }; })()`);
}
if (WIDTH === 390) {
  // 93: beli lalu history.back() dari Sukses
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(150);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('3 Diamonds')); if (b) b.click(); return 'ok'; })()`); await sleep(150);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); if (b) b.click(); return 'ok'; })()`); await sleep(150);
  await clickBtn(".summary .btn.big"); await sleep(1000);
  R.suksesHash = await evalJs(`location.hash`);
  await evalJs(`history.back(); 'ok'`); await sleep(1200);
  R.setelahBack = await evalJs(`(() => ({ hash: location.hash, uid: document.querySelector('#uid')?.value ?? 'TIDAK-ADA-FIELD', itemTerpilih: document.querySelectorAll('.nom.on').length }))()`);
  // 24: voucher email kosong -> Beli disabled
  await nav("#/voucher/google-play");
  await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('Saldo 50.000')); if (b) b.click(); return 'ok'; })()`); await sleep(150);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); if (b) b.click(); return 'ok'; })()`); await sleep(150);
  R.voucherEmailKosong = await evalJs(`(() => ({ email: document.querySelector('#vemail').value, beliDisabled: document.querySelector('.summary .btn.big')?.disabled, catatan: [...document.querySelectorAll('.summary .note')].map((n) => n.textContent.replace(/\\s+/g, ' ').trim()).pop() }))()`);
}
writeFileSync(`${outDir}/cdp-s446c-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI", WIDTH);
process.exit(0);
