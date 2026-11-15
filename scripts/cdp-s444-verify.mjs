// Verifikasi perbaikan s444: aside sticky (ide 80), animasi disc/qty/nom/
// timeline/cek-result (ide 1/3/6/7/8), peringatan fee>item (ide 29),
// empty-state Cek (ide 19/35), petunjuk salah ketik (ide 97), garansi di
// Sukses (ide 96), + cek mobile-bar di max scroll 390x900 (ide 79).
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

const [wsUrl, widthArg, , outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
const HEIGHT = parseInt(process.env.CDP_H || "900", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH, height: HEIGHT };
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
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const PARTIAL = `${outDir}/cdp-s444v-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

if (WIDTH === 390) {
  await probe("perbaikan_animasi", async () => {
    await nav("#/game/mobile-legends");
    await setInput("#uid", "12345678");
    await setInput("#zone", "1234");
    await sleep(200);
    await evalJs(`(() => { document.querySelectorAll('.nom')[6].click(); return 'ok'; })()`);
    await sleep(120);
    const nomAnim = await evalJs(`(() => getComputedStyle(document.querySelector('.nom.on')).animationName)()`);
    await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`);
    await sleep(120);
    const qtyAnim = await evalJs(`(() => { const b = document.querySelector('.qty b'); return { qty: b.textContent, anim: getComputedStyle(b).animationName }; })()`);
    await evalJs(`(() => { const inp = [...document.querySelectorAll('.step input')].find((i) => (i.placeholder || '').toLowerCase().includes('kode promo')); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(inp, 'ROSDI10'); inp.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
    await sleep(120);
    await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
    await sleep(250);
    const disc = await evalJs(`(() => { const d = document.querySelector('.sum-row.disc'); return d ? { text: d.textContent.replace(/\\s+/g, ' ').trim(), anim: getComputedStyle(d).animationName } : 'NO-DISC-ROW'; })()`);
    return { nomAnim, qtyAnim, disc };
  });
  await probe("perbaikan_fee_warning", async () => {
    await nav("#/game/free-fire");
    await setInput("#uid", "12345678");
    await sleep(200);
    await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
    await sleep(200);
    await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('BCA Virtual Account')).click(); return 'ok'; })()`);
    await sleep(250);
    return await evalJs(`(() => { const notes = [...document.querySelectorAll('.note')].map((n) => n.textContent.trim()); return { adaPeringatan: notes.some((t) => t.includes('lebih besar dari harga item')), teks: notes.find((t) => t.includes('lebih besar')) || '(tidak ada)' }; })()`);
  });
  await probe("perbaikan_cek_kosong", async () => {
    await evalJs(`localStorage.clear(); 'ok'`);
    await nav("#/cek");
    const empty = await evalJs(`(() => { const h = [...document.querySelectorAll('h2')].map((x) => x.textContent.trim()); const note = [...document.querySelectorAll('.step .note')].map((n) => n.textContent.trim()).find((t) => t.includes('Belum ada transaksi')); return { h2: h, emptyNote: note || '(tidak ada)' }; })()`);
    await setInput(".step .input", "RSD-SALAH123");
    await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Cek').click(); return 'ok'; })()`);
    await sleep(400);
    const notFound = await evalJs(`(() => document.querySelector('.note.bad')?.textContent.trim() || 'NO-MSG')()`);
    await setInput(".step .input", "RSD-DEMO1234");
    await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Cek').click(); return 'ok'; })()`);
    await sleep(500);
    const hasil = await evalJs(`(() => { const tl = document.querySelector('.timeline'); const res = document.querySelector('.cek-result'); return tl ? { liAnim: getComputedStyle(tl.querySelector('li')).animationName, resultAnim: res ? getComputedStyle(res).animationName : 'NO-CEK-RESULT' } : 'NO-TIMELINE'; })()`);
    return { ...empty, notFound, hasil };
  });
  await probe("perbaikan_sukses_garansi", async () => {
    await nav("#/game/mobile-legends");
    await setInput("#uid", "12345678");
    await setInput("#zone", "1234");
    await sleep(200);
    await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
    await sleep(150);
    await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('QRIS')).click(); return 'ok'; })()`);
    await sleep(150);
    await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
    await sleep(600);
    return await evalJs(`(() => { const notes = [...document.querySelectorAll('.note')].map((n) => n.textContent.trim()); return { adaGaransi: notes.some((t) => t.startsWith('Garansi:')), teks: notes.find((t) => t.startsWith('Garansi:')) || '(tidak ada)', h1: document.querySelector('h1')?.textContent }; })()`);
  });
  await probe("mobilebar_maxscroll_390", async () => {
    await nav("#/game/mobile-legends");
    await evalJs(`window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); 'ok'`);
    await sleep(500);
    return await evalJs(`(() => { const bar = document.querySelector('.mobile-bar'); const br = bar.getBoundingClientRect(); return { scrollY: Math.round(window.scrollY), maxScroll: Math.round(document.documentElement.scrollHeight - window.innerHeight), barTop: Math.round(br.top), barBottom: Math.round(br.bottom), barTerlihat: br.bottom > 0 && br.top < window.innerHeight }; })()`);
  });
}
if (WIDTH === 1280) {
  await probe("aside_sticky_setelah_perbaikan", async () => {
    await nav("#/game/mobile-legends");
    const top0 = await evalJs(`(() => Math.round(document.querySelector('.summary').getBoundingClientRect().top))()`);
    await evalJs(`window.scrollTo({ top: 500, behavior: 'instant' }); 'ok'`);
    await sleep(500);
    const top500 = await evalJs(`(() => { const r = document.querySelector('.summary').getBoundingClientRect(); return { top: Math.round(r.top), scrollY: Math.round(window.scrollY) }; })()`);
    await evalJs(`window.scrollTo({ top: 1400, behavior: 'instant' }); 'ok'`);
    await sleep(500);
    const top1400 = await evalJs(`(() => { const r = document.querySelector('.summary').getBoundingClientRect(); const steps = [...document.querySelectorAll('.step')].map((s) => s.getBoundingClientRect()); const overlap = steps.some((s) => !(r.right <= s.left || r.left >= s.right || r.bottom <= s.top || r.top >= s.bottom)); return { top: Math.round(r.top), bottom: Math.round(r.bottom), scrollY: Math.round(window.scrollY), overlapDenganLangkah: overlap }; })()`);
    return { top0, top500, top1400 };
  });
}

writeFileSync(`${outDir}/cdp-s444v-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
