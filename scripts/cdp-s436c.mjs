// Verifikasi perbaikan s436: UID tempel ber-spasi, promo maxLength,
// placeholder Cek format baru.
// Penggunaan: node scripts/cdp-s436c.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, _widthArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const R = {};
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
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

await goHash("#/game/mobile-legends");
R.uidPaste = await (async () => {
  await setInput("#uid", "1234 5678");
  await setInput("#zone", "12 34");
  await sleep(300);
  return evalJs(`(() => {
    const errs = [...document.querySelectorAll('.note.bad')].map((n) => n.textContent);
    return { uidVal: document.querySelector('#uid')?.value, zoneVal: document.querySelector('#zone')?.value, errs };
  })()`);
})();
R.uidBuy = await (async () => {
  await evalJs(`(() => { document.querySelectorAll('.nom')[0]?.click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.pay')[0]?.click(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => {
    const rows = [...document.querySelectorAll('.summary .sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim());
    const b = [...document.querySelectorAll('.summary .btn.big')].find((x) => x.textContent.includes('Beli'));
    return { rows, buyDisabled: b ? b.disabled : null };
  })()`);
})();
await goHash("#/voucher/google-play");
R.promoMax = await (async () => {
  await setInput(".step input[aria-label='Kode promo']", "x".repeat(50));
  await sleep(200);
  return evalJs(`(() => ({ len: document.querySelector(".step input[aria-label='Kode promo']")?.value.length, maxLength: document.querySelector(".step input[aria-label='Kode promo']")?.maxLength }))()`);
})();
await goHash("#/cek");
R.cekPlaceholder = await evalJs(`document.querySelector('.step .input')?.placeholder || null`);

writeFileSync(`${outDir}/cdp-s436c-390.json`, JSON.stringify(R, null, 1));
console.log("DONE", JSON.stringify(R));
ws.close();
process.exit(0);
