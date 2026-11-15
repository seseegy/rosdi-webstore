// Verifikasi perbaikan s445 ide 54 (catatan fee >= 25% dari harga item).
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, widthArg, , outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH };
const ws = new WebSocket(wsUrl);
let nextId = 1; const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH < 900 });
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const nav = async (hash, readySel) => {
  for (let a = 0; a < 3; a++) {
    await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`);
    for (let i = 0; i < 32; i++) { await sleep(250); if (await evalJs(`(() => location.hash === ${JSON.stringify(hash)} && !!document.querySelector(${JSON.stringify(readySel)}))()`)) return true; }
  }
  return false;
};
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
const clickNom = async (name) => evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.querySelector('.n-name')?.textContent.trim() === ${JSON.stringify(name)}); if (!b) return 'NO-NOM'; b.click(); return 'clicked'; })()`);
const feeNote = async () => evalJs(`(() => [...document.querySelectorAll('.note')].map((n) => n.textContent.trim()).filter((t) => /Biaya pembayaran/.test(t)))()`);
await evalJs(`localStorage.clear(); 'ok'`);
await evalJs(`location.reload(); 'ok'`); await sleep(1500);

// Kasus 1 (ide 54): FF 5 Diamonds Rp1.000 + GoPay fee Rp250 = 25% -> catatan baru muncul
await nav("#/game/free-fire", ".nom-grid");
await clickNom("5 Diamonds"); await sleep(200);
await clickText(".pay", "GoPay"); await sleep(200);
R.kasus1_ff1000_gopay = { note: await feeNote() };
// Kasus 2 (regresi s444): item sama + BCA VA fee Rp2.500 > base -> catatan lama tetap muncul
await clickText(".pay", "BCA Virtual Account"); await sleep(200);
R.kasus2_ff1000_bca = { note: await feeNote() };
// Kasus 3 (negatif): MLBB 172 Diamonds Rp43.500 + GoPay fee Rp250 = 0,6% -> TIDAK ada catatan
await nav("#/game/mobile-legends", ".nom-grid");
await setInput("#uid", "12345678"); await setInput("#zone", "1234");
await clickNom("172 Diamonds"); await sleep(200);
await clickText(".pay", "GoPay"); await sleep(200);
R.kasus3_mlbb43500_gopay = { note: await feeNote() };
// Kasus 4 (negatif): MLBB 172 Diamonds + QRIS fee 0 -> TIDAK ada catatan
await clickText(".pay", "QRIS"); await sleep(200);
R.kasus4_mlbb43500_qris = { note: await feeNote() };
writeFileSync(`${outDir}/cdp-s445c-verify54-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI-VERIFY54", WIDTH);
try { ws.close(); } catch {}
process.exit(0);
