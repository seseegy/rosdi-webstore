// Uji ulang CDP s464: F76, F78, A9 (perbaiki bug regex + guard).
import { mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir, modeArg] = process.argv.slice(2);
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
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const setMetrics = async (w, h = 844, mobile = w < 900) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, text) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
const pressEnter = async () => { await keyEvent("keyDown", "Enter", "Enter", 13, "\r"); await keyEvent("keyUp", "Enter", "Enter", 13); await sleep(350); };
const pressAndReadColor = async (selJs) => {
  const c = await evalJs(`(() => { const el = (${selJs}); if (!el) return null; el.scrollIntoView({ behavior: 'instant', block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!c) return { ditemukan: false };
  const sebelum = await evalJs(`(() => { const el = (${selJs}); const cs = getComputedStyle(el); return { color: cs.color, active: el.matches(':active') }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1 });
  await sleep(90);
  const saat = await evalJs(`(() => { const el = (${selJs}); const cs = getComputedStyle(el); return { color: cs.color, active: el.matches(':active'), transform: cs.transform }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1 });
  await sleep(250);
  return { ditemukan: true, sebelum, saat, warnaBerubah: sebelum.color !== saat.color };
};
const setInputVal = async (sel, v) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);

await setMetrics(390, 844, true);
// A9: tautan footer — warna saat ditekan (logo + tautan produk biasa)
await nav("#/");
await safe("A9-footer-logo", () => pressAndReadColor(`document.querySelector('footer.site a.logo')`));
await nav("#/");
await safe("A9-footer-produk", () => pressAndReadColor(`document.querySelector('footer.site a[href="#/game/mobile-legends"]')`));
// F76: Enter di baris metode bayar MLBB (dengan guard + diagnostik jumlah .pay)
await nav("#/game/mobile-legends");
await safe("F76-enter-metode", async () => {
  const diag = await evalJs(`(() => { const all = [...document.querySelectorAll('.pay')]; return { jumlahPay: all.length, jumlahOn: all.filter(x => x.classList.contains('on')).length, jumlahDisabled: all.filter(x => x.disabled).length, kandidat: all.filter(x => !x.classList.contains('on') && !x.disabled).length }; })()`);
  const sebelum = await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find(x => !x.classList.contains('on') && !x.disabled); return b ? { teks: b.textContent.trim().slice(0, 24), pressed: b.getAttribute('aria-pressed') } : null; })()`);
  const fokus = await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find(x => !x.classList.contains('on') && !x.disabled); if (!b) return 'TIDAK ADA KANDIDAT'; b.focus(); return 'ok'; })()`);
  await sleep(200);
  await pressEnter();
  const sesudah = await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find(x => x.getAttribute('aria-pressed') === 'true'); return b ? { teks: b.textContent.trim().slice(0, 24), pressed: b.getAttribute('aria-pressed') } : null; })()`);
  return { diag, sebelum, fokus, sesudah, terpilih: !!(sebelum && sesudah && sesudah.teks === sebelum.teks) };
});
// F78: Enter di tombol "Cek Nama" PLN (tanpa regex di template literal)
await nav("#/pln");
await setInputVal('#idpel', "123456789012");
await safe("F78-enter-cek-nama", async () => {
  const teksSebelum = await evalJs(`document.querySelector('form button[type="submit"]')?.textContent`);
  const fokus = await evalJs(`(() => { const b = document.querySelector('form button[type="submit"]'); if (!b) return 'TIDAK ADA'; b.focus(); return 'ok'; })()`);
  await pressEnter();
  await sleep(1500);
  const teksSesudah = await evalJs(`document.querySelector('form button[type="submit"]')?.textContent`);
  const info = await evalJs(`(() => { const t = document.body.innerText; const i = t.indexOf('Nama pelanggan'); return { adaNama: i >= 0, cuplikan: i >= 0 ? t.slice(i, i + 90) : null, adaCekUlang: t.includes('Cek Ulang') }; })()`);
  return { teksSebelum, fokus, teksSesudah, ...info, terpicu: teksSebelum !== teksSesudah || info.adaNama };
});
console.log("SELESAI-RETEST");
process.exit(0);
