// Suplemen s445d: ulangi ide 62 (setInput s444 pecah pada selector berisi
// kutip tunggal: aria-label='Kode promo') + ide 69 bersih (riwayat
// dikendalikan: #/cek -> #/ -> buka S&K -> history.back()).
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

const [wsUrl, widthArg, _baseUrl, outDir] = process.argv.slice(2);
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
const PARTIAL = `${outDir}/cdp-s445d-fix-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = '${hash}'; 'ok'`); await sleep(1100); };
// setInput diperbaiki: selector ikut JSON.stringify agar kutip di dalam
// selector (aria-label='...') tidak memecah string JS.
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll('${sel}')].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
const state = () => evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent || 'NO-H1', uid: document.querySelector('#uid')?.value ?? 'NO-UID', zone: document.querySelector('#zone')?.value ?? 'NO-ZONE', nomTerpilih: document.querySelector('.nom.on .n-name')?.textContent?.trim() || 'TIDAK-ADA', payTerpilih: document.querySelector('.pay.on')?.textContent?.trim().slice(0, 30) || 'TIDAK-ADA', promoAktif: !!document.querySelector('.sum-row.disc'), promoTeks: document.querySelector('.sum-row.disc')?.textContent?.replace(/\\s+/g, ' ').trim() || null }))()`);

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

await probe("ide62_draf_cek_kembali", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  await evalJs(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('706 Diamonds')); if (!n) return 'NO-NOM-706'; n.click(); return 'ok'; })()`);
  await sleep(200);
  const promoSet = await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); if (!b) return 'NO-PAKAI'; b.click(); return 'ok'; })()`);
  await sleep(300);
  const payKlik = await clickText(".pay", "QRIS");
  await sleep(200);
  const draf = await state();
  await nav("#/cek");
  await sleep(300);
  await evalJs(`history.back(); 'ok'`);
  await sleep(1100);
  const viaBack = await state();
  // crumb ‹ di halaman produk -> go("#/"), lalu masuk lagi ke produk
  const crumbKlik = await evalJs(`(() => { const b = document.querySelector('.crumb .back'); if (!b) return 'NO-CRUMB'; b.click(); return 'ok'; })()`);
  await sleep(900);
  const setelahCrumb = await state();
  await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.getAttribute('href') === '#/game/mobile-legends'); if (!a) return 'NO-CARD'; a.click(); return 'ok'; })()`);
  await sleep(1100);
  const masukLagi = await state();
  return { promoSet, payKlik, draf, viaBack, crumbKlik, setelahCrumb, masukLagi };
});

await probe("ide69_back_saat_modal_bersih", async () => {
  // kendalikan riwayat: #/cek -> #/ (dua entri), buka S&K di #/, lalu back
  await nav("#/cek");
  await nav("#/");
  await evalJs(`(() => { [...document.querySelectorAll('footer .flink')].find((b) => b.textContent.trim() === 'Syarat & Ketentuan').click(); return 'ok'; })()`);
  await sleep(400);
  const sebelum = await evalJs(`(() => ({ hash: location.hash, modalTerbuka: document.querySelectorAll('.modal-veil').length, judul: document.querySelector('.modal h3')?.textContent, overflow: document.documentElement.style.overflow }))()`);
  await evalJs(`history.back(); 'ok'`);
  await sleep(1100);
  const sesudah = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, modalTerbuka: document.querySelectorAll('.modal-veil').length, judul: document.querySelector('.modal h3')?.textContent || null, overflow: document.documentElement.style.overflow }))()`);
  return { sebelum, sesudah };
});

writeFileSync(`${outDir}/cdp-s445d-fix-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
