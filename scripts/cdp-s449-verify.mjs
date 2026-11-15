// Verifikasi perbaikan s449 (ide 39, 45, 60, 96, 4, 8) di runtime CDP.
// Penggunaan: node scripts/cdp-s449-verify.mjs <wsUrl> <width> <baseUrl> <outDir>
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

await setMetrics(WIDTH, 900, WIDTH < 500);
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// 8: fade-in muat awal (baca segera setelah muat ulang)
await safe("fix8-page-in", async () => {
  await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
  await sleep(300);
  return evalJs(`(() => { const m=document.querySelector('main#konten'); const s=getComputedStyle(m); return {anim: s.animationName, animDur: s.animationDuration, opacity: s.opacity}; })()`);
});

// 4: badge beranimasi saat ganti tab
await safe("fix4-badge-in", async () => {
  await fresh("#/game/mobile-legends");
  await clickText(".tab", "Weekly Pass"); await sleep(400);
  return evalJs(`(() => { const b=[...document.querySelectorAll('.nom .badge')].find(e=>e.textContent.includes('Flash')); if(!b) return {found:false}; const s=getComputedStyle(b); return {found:true, anim: s.animationName, animDur: s.animationDuration}; })()`);
});

// 39: HP "62..." tanpa + diterima di Pulsa (dan "+62..." tetap diterima)
await safe("fix39-hp-62", async () => {
  const out = {};
  for (const num of ["6281234567890", "+6281234567890"]) {
    await fresh("#/pulsa/telkomsel");
    await setInput("#hp", num); await sleep(300);
    out[num] = await evalJs(`(() => { const good=[...document.querySelectorAll('.note.good')].map(e=>e.textContent); const bad=[...document.querySelectorAll('.note.bad')].map(e=>e.textContent); const err=document.querySelector('#hp.err'); return {detected: good, bad, hasErrClass: !!err}; })()`);
    await clickText(".nom", "Pulsa 50.000"); await sleep(200);
    await clickText(".pay", "QRIS"); await sleep(200);
    out[num].beliDisabled = await evalJs(`document.querySelector('.summary .btn.big').disabled`);
  }
  return out;
});

// 45: email titik akhir ditolak (peringatan muncul) di Voucher + CheckoutShell
await safe("fix45-email-dot", async () => {
  const out = {};
  await fresh("#/voucher/google-play");
  await setInput("#email", "nama@mail.com."); await sleep(300);
  out.voucherBad = await evalJs(`(() => { const warns=[...document.querySelectorAll('.note.bad')].map(e=>e.textContent); return {warns}; })()`);
  await setInput("#email", "nama@mail.com"); await sleep(300);
  out.voucherGood = await evalJs(`(() => { const warns=[...document.querySelectorAll('.note.bad')].map(e=>e.textContent); return {warns}; })()`);
  await fresh("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200);
  await setInput("#email", "nama@mail.com."); await sleep(300);
  out.shellBad = await evalJs(`(() => { const warns=[...document.querySelectorAll('.note')].map(e=>e.textContent).filter(t=>t.includes('email')); return {warns}; })()`);
  await setInput("#email", "nama@mail.com"); await sleep(300);
  out.shellGood = await evalJs(`(() => { const warns=[...document.querySelectorAll('.note')].map(e=>e.textContent).filter(t=>t.includes('email')); return {warns}; })()`);
  return out;
});

// 60: catatan lintas-operator vs operator sama
await safe("fix60-cross-op-note", async () => {
  const out = {};
  await fresh("#/pulsa/telkomsel");
  await setInput("#hp", "081234567890"); await sleep(200);
  await clickText(".nom", "Pulsa 50.000"); await sleep(200);
  await clickText(".pay", "Pulsa Telkomsel"); await sleep(300);
  out.same = await evalJs(`(() => { const notes=[...document.querySelectorAll('.step .note')].map(e=>e.textContent).filter(t=>t.includes('pulsa dengan pulsa') || t.includes('membayar dengan pulsa')); return {notes}; })()`);
  await clickText(".pay", "Pulsa XL"); await sleep(300);
  out.cross = await evalJs(`(() => { const notes=[...document.querySelectorAll('.step .note')].map(e=>e.textContent).filter(t=>t.includes('pulsa dengan pulsa') || t.includes('membayar dengan pulsa')); return {notes}; })()`);
  return out;
});

// 96: token tampil di hasil Cek
await safe("fix96-token-cek", async () => {
  await fresh("#/pln");
  await setInput("#idpel", "543210987654"); await sleep(200);
  await clickText(".step .btn", "Cek Nama"); await sleep(300);
  await clickText(".nom", "Token 20.000"); await sleep(200);
  await clickText(".pay", "QRIS"); await sleep(200);
  await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); b.click(); return 'ok'; })()`);
  await waitFor(".big-check", 8000);
  const ref = await evalJs(`(location.hash.match(/sukses\\/(.+)/)||[])[1] || null`);
  const token = await evalJs(`(() => { const os=JSON.parse(localStorage.getItem('rosdi_orders')||'[]'); const o=os.find(x=>x.ref===${JSON.stringify(ref)}); return o ? o.token : null; })()`);
  await evalJs(`location.assign(${JSON.stringify(baseUrl + '#/cek/' + ref)}); 'ok'`);
  await sleep(1500);
  const inDom = await evalJs(`(() => { const r=document.querySelector('.cek-result'); if(!r) return {result:false}; const t=${JSON.stringify(token)}; return {result:true, tokenShown: t ? r.textContent.includes(t.slice(0,9)) : null, tokenRow: [...r.querySelectorAll('.sum-row')].map(e=>e.textContent).find(t=>t.includes('token')) || null}; })()`);
  return { ref, tokenPrefix: token ? token.slice(0, 9) : null, inDom };
});

writeFileSync(`${outDir}/cdp-s449-verify-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).length, "probes");
process.exit(0);
