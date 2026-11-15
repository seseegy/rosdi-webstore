// Probe diagnostik s443d (390px): animasi progress mid-flight (ide 1),
// cincin fokus pencarian pasca-perbaikan (ide 73), dan diagnosis error
// probe Cek yang berulang (ide 71/75/76) — tiap baca diisolasi.
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

const [wsUrl, widthArg, , outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH };
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
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: true });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const PARTIAL = `${outDir}/cdp-s443d-partial-${WIDTH}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
await evalJs(`localStorage.clear(); 'ok'`);

// 1) progress mid-flight: pindah dulu ke halaman lain agar Home me-mount ulang
await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
await sleep(1200);
await probe("progress_midflight", async () => {
  await evalJs(`location.hash = '#/'; 'ok'`);
  await sleep(80);
  const t80 = await evalJs(`(() => { const b = document.querySelector('.progress i'); if (!b) return 'NO-EL'; const cs = getComputedStyle(b); return { anim: cs.animationName, dur: cs.animationDuration, transform: cs.transform }; })()`);
  await sleep(250);
  const t330 = await evalJs(`(() => { const b = document.querySelector('.progress i'); const cs = getComputedStyle(b); return { transform: cs.transform }; })()`);
  await sleep(500);
  const t830 = await evalJs(`(() => { const b = document.querySelector('.progress i'); const cs = getComputedStyle(b); return { transform: cs.transform }; })()`);
  return { t80, t330, t830 };
});

// 2) cincin fokus pencarian: Tab sampai input search, baca outline input + field
await probe("search_focus_ring", async () => {
  await evalJs(`document.activeElement?.blur(); window.scrollTo(0,0); 'ok'`);
  await sleep(200);
  let found = null;
  for (let i = 0; i < 12; i++) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await sleep(110);
    const a = await evalJs(`(() => { const el = document.activeElement; if (!el) return null; return { tag: el.tagName, cls: (el.className || '').toString().slice(0, 20), placeholder: el.getAttribute('placeholder') || '', inField: !!el.closest('.searchbar') }; })()`);
    if (a && a.inField) { found = a; break; }
  }
  if (!found) return { found: false };
  const ring = await evalJs(`(() => { const inp = document.activeElement; const field = inp.closest('.field'); const ci = getComputedStyle(inp); const cf = getComputedStyle(field); return { inputOutline: ci.outlineStyle + ' ' + ci.outlineWidth + ' ' + ci.outlineColor, fieldOutline: cf.outlineStyle + ' ' + cf.outlineWidth + ' ' + cf.outlineColor }; })()`);
  return { found, ...ring };
});

// 3) diagnosis Cek: tiap langkah diisolasi
await probe("cek_diag", async () => {
  await evalJs(`location.hash = '#/cek'; 'ok'`);
  await sleep(1200);
  const heads = await evalJs(`[...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ':' + h.textContent.trim().slice(0, 30))`);
  const inp = await evalJs(`(() => { const el = document.querySelector('.step .input'); return el ? 'FOUND' : 'NO-INPUT'; })()`);
  await evalJs(`(() => { const el = document.querySelector('.step .input'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, 'RSD-DEMO1234'); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
  await sleep(200);
  const btnFound = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Cek'); return b ? 'FOUND' : 'NO-BTN'; })()`);
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Cek').click(); return 'ok'; })()`);
  await sleep(800);
  const tlExists = await evalJs(`(() => { const tl = document.querySelector('.timeline'); return tl ? 'YES:' + tl.querySelectorAll('li').length + 'li' : 'NO-TIMELINE'; })()`);
  const bodyTxt = await evalJs(`document.body.innerText.replace(/\\s+/g, ' ').slice(0, 600)`);
  const statusSmall = await evalJs(`(() => { const s = [...document.querySelectorAll('.timeline small')].find((e) => e.textContent.trim() === 'Selesai'); if (!s) return 'NO-STATUS-SMALL'; const cs = getComputedStyle(s); return { color: cs.color, fontWeight: cs.fontWeight, bg: cs.backgroundColor }; })()`);
  const rows = await evalJs(`[...document.querySelectorAll('.sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim().slice(0, 44))`);
  const liveRegions = await evalJs(`[...document.querySelectorAll('[aria-live]')].map((e) => e.tagName + '.' + (e.className || '') + '=' + e.getAttribute('aria-live'))`);
  return { heads, inp, btnFound, tlExists, statusSmall, rows, liveRegions, bodyTxt };
});

writeFileSync(`${outDir}/cdp-s443d-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH);
try { ws.close(); } catch {}
process.exit(0);
