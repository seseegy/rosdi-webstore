// Probe terakhir s453 J99: verifikasi state sebelum Enter pada tombol Beli.
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
const key = async (k, code, vk) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); await sleep(150); };
const tab = () => key("Tab", "Tab", 9);
const enter = () => key("Enter", "Enter", 13);
const space = () => key(" ", "Space", 32);
const activeEl = () => evalJs(`(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; return { tag: a.tagName, cls: (a.className||'').toString().slice(0,30), text: (a.textContent||'').trim().slice(0,40), id: a.id || '', href: (a.getAttribute('href')||'').slice(0,40) }; })()`);
const typeText = async (text) => { await send("Input.insertText", { text }); await sleep(200); };
const tabUntil = async (pred, max = 80) => {
  for (let i = 0; i < max; i++) {
    const a = await activeEl();
    if (a !== "BODY" && pred(a)) return { found: true, tabs: i, el: a };
    await tab();
  }
  return { found: false, tabs: max };
};

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);

try {
  await goHash("#/");
  await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
  await sleep(1000);
  const toCard = await tabUntil((a) => (a.href || "").includes("#/game/mobile-legends"));
  await enter();
  await sleep(1500);
  const toUid = await tabUntil((a) => a.id === "uid", 30);
  await typeText("12345678");
  const uidVal = await evalJs(`({ value: document.querySelector('#uid').value, cls: document.querySelector('#uid').className })`);
  const toZone = await tabUntil((a) => a.id === "zone", 10);
  await typeText("1234");
  const zoneVal = await evalJs(`({ value: document.querySelector('#zone').value, cls: document.querySelector('#zone').className })`);
  const toNom = await tabUntil((a) => (a.text || "").includes("172 Diamonds"), 40);
  await space();
  await sleep(300);
  const toPay = await tabUntil((a) => (a.text || "").includes("QRIS"), 40);
  await space();
  await sleep(300);
  const toBuy = await tabUntil((a) => (a.text || "").includes("Beli Sekarang"), 40);
  const buyState = await evalJs(`(() => { const bs=[...document.querySelectorAll('.summary .btn.big, .mobile-bar .btn')]; return bs.map(b => ({ text: b.textContent.trim(), disabled: b.disabled, cls: b.className })); })()`);
  const focusedBuy = await activeEl();
  await enter();
  await sleep(1500);
  const afterEnter = await evalJs(`({ hash: location.hash, success: !!document.querySelector('.step.success-in') })`);
  // Jika Enter gagal, coba Space pada tombol yang sama (fokus masih di sana?)
  let afterSpace = null;
  if (!afterEnter.success) {
    const stillFocused = await activeEl();
    await space();
    await sleep(1500);
    afterSpace = { stillFocused, result: await evalJs(`({ hash: location.hash, success: !!document.querySelector('.step.success-in') })`) };
  }
  rec("J99e", { toCard, toUid, uidVal, toZone, zoneVal, toNom, toPay, toBuy, buyState, focusedBuy, afterEnter, afterSpace });
} catch (e) {
  rec("J99e", { ERROR: String(e).slice(0, 500) });
}

writeFileSync(`${outDir}/s453-cdpd-390.json`, JSON.stringify({ width: 390, ...R }, null, 2));
ws.close();
console.log("DONE 390");
