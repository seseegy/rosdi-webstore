// Diagnostik + ulangi f6/f9/f8/f3(s445a-fixup) yang hasilnya aneh.
// Hipotesis yang diuji: nav() berbasis location.hash kadang tidak memicu
// hashchange (mis. hash sudah sama -> tidak ada remount) sehingga state lama
// bertahan; nav() di sini memverifikasi hash + keberadaan elemen kunci.
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
    if (r.exceptionDetails) throw new Error("EVAL-EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 1200));
    return r.result.value;
  });
const PARTIAL = `${outDir}/cdp-s445a-fixup2-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 1200) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
// nav dengan verifikasi: bila hash belum berubah, paksa via href + reload state
const nav = async (hash) => {
  await evalJs(`location.hash = '${hash}'; 'ok'`);
  await sleep(1200);
  const cur = await evalJs(`location.hash`);
  if (cur !== hash) {
    await evalJs(`location.href = location.pathname + location.search + '${hash}'; 'ok'`);
    await sleep(1500);
  }
  return await evalJs(`location.hash`);
};
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set:' + el.value; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);

// d1: diagnostik navigasi
await probe("d1_nav_diag", async () => {
  const h1 = await nav("#/");
  const s1 = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, katalog: document.querySelectorAll('#katalog .card').length }))()`);
  const h2 = await nav("#/game/mobile-legends");
  const s2 = await evalJs(`(() => ({ hash: location.hash, uidAda: !!document.querySelector('#uid'), tabAktif: document.querySelector('.tab.on')?.textContent, nomCount: document.querySelectorAll('.nom').length }))()`);
  const h3 = await nav("#/");
  const s3 = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, katalog: document.querySelectorAll('#katalog .card').length }))()`);
  return { setelahNavHome1: { hashSet: h1, ...s1 }, setelahNavMLBB: { hashSet: h2, ...s2 }, setelahNavHome2: { hashSet: h3, ...s3 } };
});

// d2: ide 10 — Pakai dengan scrollIntoView dulu (viewport 900, tombol di bawah fold)
await probe("d2_ide10_pakai", async () => {
  await nav("#/game/mobile-legends");
  const rUid = await setInput("#uid", "12345678");
  const rZone = await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await sleep(200);
  const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); if (!b) return 'NO-BTN'; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), disabled: b.disabled, viewportH: window.innerHeight }; })()`);
  await sleep(400);
  const idle = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); const cs = getComputedStyle(b); return { transform: cs.transform, transitionDuration: cs.transitionDuration }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
  await sleep(150);
  const pressed = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); const cs = getComputedStyle(b); return { transform: cs.transform, activeMatch: b.matches(':active'), hoverMatch: b.matches(':hover') }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
  await sleep(400);
  const setelah = await evalJs(`(() => { const m = document.querySelector('.note.good'); return m ? m.textContent.trim() : 'NO-MSG'; })()`);
  return { rUid, rZone, pos, idle, pressed, setelah };
});

// d3: ide 3 — alur beli lengkap dengan diagnostik tiap langkah
await probe("d3_ide3_beli_salin", async () => {
  await nav("#/");
  await nav("#/game/mobile-legends");
  const sUid = await setInput("#uid", "12345678");
  const sZone = await setInput("#zone", "1234");
  const sNom = await evalJs(`(() => { const n = document.querySelectorAll('.nom')[0]; if (!n) return 'NO-NOM'; n.click(); return 'clicked:' + n.textContent.trim().slice(0, 20); })()`);
  await sleep(200);
  const sPay = await clickText(".pay", "QRIS");
  await sleep(200);
  const pra = await evalJs(`(() => { const b = document.querySelector('.btn.big'); return { adaBtn: !!b, disabled: b?.disabled, hash: location.hash, orders: JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length }; })()`);
  await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
  await sleep(800);
  const pasca = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]'); return { hash: location.hash, orders: o.length, ref: o[0]?.ref || 'NO-ORDER' }; })()`);
  if (pasca.ref === "NO-ORDER") return { sUid, sZone, sNom, sPay, pra, pasca };
  await nav("#/sukses/" + pasca.ref);
  await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return 'NO-BTN'; b.click(); b.click(); return 'clicked-2x'; })()`);
  await sleep(150);
  const langsung = await evalJs(`(() => ({ toastCount: document.querySelectorAll('.toast').length,
    labelSalin: [...document.querySelectorAll('button')].find((x) => /Disalin|Salin/.test(x.textContent))?.textContent.trim() }))()`);
  await sleep(2200);
  const setelah2detik = await evalJs(`(() => ({ toastCount: document.querySelectorAll('.toast').length,
    labelSalin: [...document.querySelectorAll('button')].find((x) => /Disalin|Salin/.test(x.textContent))?.textContent.trim() }))()`);
  return { sUid, sZone, sNom, sPay, pra, pasca, langsung, setelah2detik };
});

// d4: ide 77 — fokus dulu, dengan diagnostik bila #uid null
await probe("d4_ide77_fokus", async () => {
  await nav("#/");
  await nav("#/game/mobile-legends");
  const diag = await evalJs(`(() => ({ hash: location.hash, uidAda: !!document.querySelector('#uid'), h1: document.querySelector('h1')?.textContent }))()`);
  if (!diag.uidAda) return { diag, note: 'UID-TIDAK-ADA, navigasi gagal?' };
  await evalJs(`(() => { document.querySelector('#uid').focus(); return 'ok'; })()`);
  await setInput("#uid", "12");
  await sleep(300);
  const a = await evalJs(`(() => ({ activeId: document.activeElement?.id || document.activeElement?.tagName,
    err: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()),
    uidErrClass: document.querySelector('#uid')?.classList.contains('err') }))()`);
  await setInput("#uid", "12345678");
  await sleep(300);
  const b = await evalJs(`(() => ({ activeId: document.activeElement?.id || document.activeElement?.tagName,
    err: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) }))()`);
  return { diag, uidSalah: a, zoneKosong: b };
});

// d5: ide 73 — badge flash di Beranda (verifikasi nav)
await probe("d5_ide73_badge", async () => {
  await nav("#/");
  return await evalJs(`(() => ({ hash: location.hash, jumlahKartuFlash: document.querySelectorAll('#katalog .card').length,
    badges: [...document.querySelectorAll('#katalog .badge')].map((b) => ({ html: b.outerHTML, ariaLabel: b.getAttribute('aria-label') || '(tidak ada)' })),
    teksKartu: [...document.querySelectorAll('#katalog .card')].map((c) => c.innerText.replace(/\\n/g, ' | ')) }))()`);
});

writeFileSync(`${outDir}/cdp-s445a-fixup2-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
