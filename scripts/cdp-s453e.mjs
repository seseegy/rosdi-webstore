// Disambiguasi s453 J99: apakah Enter gagal di SEMUA <button> (artefak CDP)
// atau hanya di tombol Beli (temuan aplikasi)?
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, _widthArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; console.log(id, JSON.stringify(data)); };

const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
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
await send("Network.enable");
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1500); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const key = async (k, code, vk, extra = {}) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, ...extra }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, ...extra }); await sleep(150); };
const enter = () => key("Enter", "Enter", 13);
const enterText = () => key("Enter", "Enter", 13, { text: "\r" });

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);

try {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  // 1) Enter pada kartu nominal (belum dipilih): fokus 86 Diamonds, Enter
  const nomEnter = await evalJs(`(() => { const n=[...document.querySelectorAll('.nom')].find(e=>e.textContent.includes('86 Diamonds')); n.focus(); return { focused: document.activeElement===n, wasOn: n.classList.contains('on') }; })()`);
  await enter();
  await sleep(300);
  const nomAfterEnter = await evalJs(`(() => { const n=[...document.querySelectorAll('.nom')].find(e=>e.textContent.includes('86 Diamonds')); return { nowOn: n.classList.contains('on') }; })()`);
  // 2) Enter pada tombol Pakai (promo terisi)
  await setInput('input[aria-label="Kode promo"]', "ROSDI10");
  const pakaiFocus = await evalJs(`(() => { const b=[...document.querySelectorAll('.btn')].find(e=>e.textContent.trim()==='Pakai'); b.focus(); return { focused: document.activeElement===b, disabled: b.disabled }; })()`);
  await enter();
  await sleep(500);
  const promoAfterEnter = await evalJs(`(() => { const s=document.querySelector('.summary'); return s ? s.innerText.includes('Diskon') : 'NO-SUMMARY'; })()`);
  // 3) Enter pada tombol Beli (form lengkap)
  await clickText(".pay", "QRIS");
  await sleep(200);
  const beliFocus = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); b.focus(); return { focused: document.activeElement===b, disabled: b.disabled }; })()`);
  await enter();
  await sleep(1200);
  const afterEnter = await evalJs(`({ hash: location.hash, success: !!document.querySelector('.step.success-in') })`);
  // 4) Enter dengan text:"\r" pada tombol Beli (jika masih di halaman game)
  let afterEnterText = null;
  if (!afterEnter.success) {
    const b2 = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); if(!b) return 'NO-BTN'; b.focus(); return { focused: document.activeElement===b, disabled: b.disabled }; })()`);
    await enterText();
    await sleep(1200);
    afterEnterText = { b2, result: await evalJs(`({ hash: location.hash, success: !!document.querySelector('.step.success-in') })`) };
  }
  rec("J99f", { nomEnter, nomAfterEnter, pakaiFocus, promoAfterEnter, beliFocus, afterEnter, afterEnterText });
} catch (e) {
  rec("J99f", { ERROR: String(e).slice(0, 500) });
}

writeFileSync(`${outDir}/s453-cdpe-390.json`, JSON.stringify({ width: 390, ...R }, null, 2));
ws.close();
console.log("DONE 390");
