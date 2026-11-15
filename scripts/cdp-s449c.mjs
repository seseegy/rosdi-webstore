// Round-3 CDP batch s449: sisa yang belum tuntas — anim2 (tekan Beli),
// anim3 (toast Salin), nav65 (dua tab).
// Penggunaan: node scripts/cdp-s449c.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg, 10);
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
const setMetrics = (w, h, mobile) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 500) }); } };
const waitFor = async (sel, timeoutMs = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await evalJs(`!!document.querySelector(${JSON.stringify(sel)})`)) return true;
    await sleep(200);
  }
  return false;
};
const fresh = async (hash) => {
  const cur = await evalJs(`location.hash`);
  if (cur === hash) { await evalJs(`location.reload()`); await sleep(2800); }
  else { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2400); }
  await waitFor("#konten", 6000);
};
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const fillMlbb = async () => { await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200); };
const pressAndRead = async (sel) => {
  const scrolled = await evalJs(`(() => { const b=document.querySelector(${JSON.stringify(sel)}); if(!b) return 'NO-BTN'; b.scrollIntoView({block:'center', behavior:'instant'}); return 'ok'; })()`);
  await sleep(600);
  const rect = await evalJs(`(() => { const b=document.querySelector(${JSON.stringify(sel)}); const r=b.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2, inView: r.top >= 0 && r.bottom <= window.innerHeight, w: Math.round(r.width), h: Math.round(r.height)}; })()`);
  if (rect === "NO-BTN" || !rect.inView) return { scrolled, rect, during: null };
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await sleep(120);
  const during = await evalJs(`(() => { const b=document.querySelector(${JSON.stringify(sel)}); const s=getComputedStyle(b); return {transform: s.transform, active: b.matches(':active')}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 5, y: 5, button: "left", clickCount: 1 });
  await sleep(300);
  return { scrolled, rect, during, stayedOnGame: (await evalJs(`location.hash`)).startsWith("#/game/") };
};

await setMetrics(WIDTH, 900, WIDTH < 500);
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---- anim2: tekan Beli (ringkasan + mobile-bar bila ada) ----
await safe("anim2c-beli-press", async () => {
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "172 Diamonds"); await sleep(200);
  await clickText(".pay", "QRIS"); await sleep(200);
  const summary = await pressAndRead(".summary .btn.big");
  const mobileBar = WIDTH < 500 ? await pressAndRead(".mobile-bar .btn") : null;
  return { summary, mobileBar };
});

// ---- anim3: toast Salin (tunggu .big-check, bukan .empty) ----
await safe("anim3c-toast", async () => {
  await fresh("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "172 Diamonds"); await sleep(200);
  await clickText(".pay", "QRIS"); await sleep(200);
  await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); b.click(); return 'ok'; })()`);
  const rendered = await waitFor(".big-check", 8000);
  const onSukses = await evalJs(`location.hash.startsWith('#/sukses/')`);
  const clickRes = await clickText(".btn.ghost", "Salin");
  await sleep(300);
  const atClick = await evalJs(`(() => { const t=document.querySelector('.toast'); const b=[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Disalin')); return {toast: !!t, btnText: b ? b.textContent : null}; })()`);
  await sleep(2300);
  const after = await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Salin'); return {backToSalin: !!b}; })()`);
  return { rendered, onSukses, clickRes, atClick, after };
});

// ---- nav65: dua tab (coba /json/new + window.open; fallback event sintetis) ----
await safe("nav65c-two-tabs", async () => {
  await evalJs(`localStorage.clear(); 'ok'`);
  const out = {};
  // Percobaan 1: /json/new, lalu periksa URL target sebelum eval.
  const created = await fetch("http://127.0.0.1:9222/json/new?url=" + encodeURIComponent(baseUrl + "#/cek"), { method: "PUT" }).then((r) => r.json()).catch((e) => ({ ERROR: String(e) }));
  await sleep(3000);
  const list = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json()).catch(() => []);
  const mainId = wsUrl.split("/").pop();
  const other = list.filter((t) => t.type === "page" && t.id !== mainId);
  out.created = created && created.id ? created.id : created;
  out.targets = other.map((t) => ({ id: t.id, url: t.url }));
  const tab2info = other.find((t) => t.url && t.url.includes("127.0.0.1:4173"));
  if (tab2info && tab2info.webSocketDebuggerUrl) {
    const ws2 = new WebSocket(tab2info.webSocketDebuggerUrl);
    let id2 = 1000; const pend2 = new Map();
    const send2 = (method, params = {}) => new Promise((resolve, reject) => { const id = id2++; pend2.set(id, { resolve, reject }); ws2.send(JSON.stringify({ id, method, params })); });
    ws2.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend2.has(m.id)) { const { resolve, reject } = pend2.get(m.id); pend2.delete(m.id); if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); } };
    await new Promise((res, rej) => { ws2.onopen = res; ws2.onerror = rej; });
    await send2("Page.enable"); await send2("Runtime.enable");
    const eval2 = (expression) => send2("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error("tab2 eval fail: " + JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; });
    await sleep(2000);
    out.tab2before = await eval2(`(() => { return { href: location.href, konten: !!document.querySelector('#konten'), emptyState: document.body.innerText.includes('Belum ada transaksi') }; })()`);
    // Buat order di tab 1
    await fresh("#/game/mobile-legends");
    await fillMlbb();
    await clickText(".nom", "3 Diamonds"); await sleep(200);
    await clickText(".pay", "QRIS"); await sleep(200);
    await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); b.click(); return 'ok'; })()`);
    await waitFor(".big-check", 8000);
    await sleep(1500);
    out.tab2after = await eval2(`(() => { const rows=[...document.querySelectorAll('button.sum-row')].length; return { histRows: rows, hasRef: /RSD-/.test(document.body.innerText), emptyStill: document.body.innerText.includes('Belum ada transaksi') }; })()`);
    ws2.close();
    return out;
  }
  // Fallback: event storage sintetis di halaman Cek (menguji listener yang sama).
  out.fallback = "json/new target tidak bisa dipakai";
  await fresh("#/cek");
  const before = await evalJs(`document.body.innerText.includes('Belum ada transaksi')`);
  await evalJs(`(() => { const o={ref:'RSD-SYNTH001', product:'Mobile Legends', item:'3 Diamonds', target:'12345678 (1234)', method:'QRIS', total:1650, status:'Diproses', time: Date.now()}; const arr=JSON.parse(localStorage.getItem('rosdi_orders')||'[]'); arr.unshift(o); localStorage.setItem('rosdi_orders', JSON.stringify(arr)); window.dispatchEvent(new StorageEvent('storage', {key:'rosdi_orders'})); return 'ok'; })()`);
  await sleep(800);
  const after = await evalJs(`(() => { const rows=[...document.querySelectorAll('button.sum-row')].length; return {histRows: rows, hasRef: document.body.innerText.includes('RSD-SYNTH001'), emptyStill: document.body.innerText.includes('Belum ada transaksi')}; })()`);
  out.synthetic = { before, after };
  return out;
});

writeFileSync(`${outDir}/cdp-s449c-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).length, "probes");
process.exit(0);
