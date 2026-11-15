// Probe verifikasi s445e (agent lanjutan): verifikasi segar perbaikan agent
// pertama batch s445 (ide 2,4,7,8,9,76) + spot-check perilaku pasca-perbaikan
// (ide 31,41,43). Satu run per lebar; metrik diubah di dalam skrip bila perlu.
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
const PARTIAL = `${outDir}/cdp-s445e-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 1200) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => {
  await evalJs(`location.hash = '${hash}'; 'ok'`);
  await sleep(1200);
  // pastikan hash benar-benar diterapkan (hindari kontaminasi tab bersama)
  for (let i = 0; i < 5; i++) {
    const h = await evalJs(`location.hash`);
    if (h === hash) return;
    await evalJs(`location.hash = '${hash}'; 'ok'`);
    await sleep(800);
  }
};
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const mouseMove = async (x, y) => {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" });
  await sleep(350);
};

await evalJs(`localStorage.clear(); 'ok'`);

// v2 — ide 2: fade tepi kanan chips (390)
await probe("v_ide2_chips_fade", async () => {
  await nav("#/");
  return await evalJs(`(() => { const c = document.querySelector('.chips'); if (!c) return 'NO-CHIPS'; const cs = getComputedStyle(c); return { scrollWidth: c.scrollWidth, clientWidth: c.clientWidth, bisaScroll: c.scrollWidth > c.clientWidth, maskImage: cs.maskImage || cs.webkitMaskImage, adaFade: (cs.maskImage || cs.webkitMaskImage || 'none') !== 'none' }; })()`);
});

// v4 — ide 4: hover kartu trust (1280)
await probe("v_ide4_trust_hover", async () => {
  if (WIDTH < 900) return { skip: "butuh 1280" };
  await nav("#/");
  const pos = await evalJs(`(() => { const el = document.querySelector('.trust .card'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!pos) return { trust: "NO-CARD" };
  const before = await evalJs(`(() => { const el = document.querySelector('.trust .card'); const cs = getComputedStyle(el); return { transform: cs.transform, borderColor: cs.borderColor }; })()`);
  await mouseMove(pos.x, pos.y);
  const during = await evalJs(`(() => { const el = document.querySelector('.trust .card'); const cs = getComputedStyle(el); return { hoverMatch: el.matches(':hover'), transform: cs.transform, borderColor: cs.borderColor }; })()`);
  return { before, during };
});

// v9 — ide 9: mobile-bar saat resize 1280 -> 800
await probe("v_ide9_mobilebar", async () => {
  if (WIDTH < 900) return { skip: "butuh 1280" };
  await nav("#/game/mobile-legends");
  const di1280 = await evalJs(`(() => { const el = document.querySelector('.mobile-bar'); if (!el) return 'NO-BAR'; const cs = getComputedStyle(el); return { display: cs.display, animationName: cs.animationName }; })()`);
  await send("Emulation.setDeviceMetricsOverride", { width: 800, height: 900, deviceScaleFactor: 1, mobile: true });
  await sleep(900);
  const di800 = await evalJs(`(() => { const el = document.querySelector('.mobile-bar'); if (!el) return 'NO-BAR'; const cs = getComputedStyle(el); return { display: cs.display, animationName: cs.animationName, tinggi: Math.round(el.getBoundingClientRect().height) }; })()`);
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900 });
  return { di1280, di800 };
});

// v7 — ide 7: animasi .was saat item flash dipilih
await probe("v_ide7_was", async () => {
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('Weekly Diamond Pass')); if (b) b.click(); return 'ok'; })()`);
  await sleep(400);
  return await evalJs(`(() => [...document.querySelectorAll('.was')].slice(0, 3).map((w) => { const cs = getComputedStyle(w); return { teks: w.textContent.trim(), animationName: cs.animationName, opacity: cs.opacity }; }))()`);
});

// v8 — ide 8: progress bar di bawah fold (viewport 400)
await probe("v_ide8_progress_viewport", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 400, deviceScaleFactor: 1, mobile: true });
  await nav("#/");
  await sleep(600);
  const r = await evalJs(`(() => { const sec = document.querySelector('#katalog'); const bar = document.querySelector('.progress i'); if (!sec || !bar) return { sec: !!sec, bar: !!bar }; const cs = getComputedStyle(bar); const rect = sec.getBoundingClientRect(); return { flashTop: Math.round(rect.top), viewportH: 400, flashDiBawahFold: rect.top >= 400, transform: cs.transform, animationName: cs.animationName, animationTimeline: cs.animationTimeline || '(tak didukung getComputedStyle)' }; })()`);
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900 });
  return r;
});

// v31 — ide 31: ketik spasi di UID huruf demi huruf
await probe("v_ide31_uid_spasi", async () => {
  await nav("#/game/mobile-legends");
  const target = "1234 5678";
  let last = null;
  for (let i = 1; i <= target.length; i++) {
    await setInput("#uid", target.slice(0, i));
    await sleep(150);
    last = await evalJs(`(() => ({ value: document.querySelector('#uid')?.value, uidErr: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()).filter((t) => t.includes('User ID')) }))()`);
  }
  return { akhir: last };
});

// v41 — ide 41: tempel NBSP di UID
await probe("v_ide41_uid_nbsp", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "1234 5678");
  await setInput("#zone", "1234");
  await sleep(300);
  return await evalJs(`(() => { const v = document.querySelector('#uid')?.value || ''; return { value: v, charCodes: [...v].map((c) => c.charCodeAt(0)), uidErr: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()).filter((t) => t.includes('User ID')) }; })()`);
});

// v43 — ide 43: Riot ID "Nama # TAG"
await probe("v_ide43_riot_spasi", async () => {
  await nav("#/game/valorant");
  await setInput("#riot", "Nama # TAG");
  await sleep(300);
  const pre = await evalJs(`(() => ({ riotErr: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()).filter((t) => t.includes('Riot')) }))()`);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('475 Points') || x.textContent.includes('Points')); if (b) b.click(); return 'ok'; })()`);
  await sleep(400);
  const target = await evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')]; const t = rows.find((r) => r.textContent.includes('Tujuan')); return t ? t.textContent.trim() : rows.map((r) => r.textContent.trim()).join(' | '); })()`);
  return { ...pre, target };
});

// v76 — ide 76: fokus ke hasil Cek
await probe("v_ide76_fokus_cek", async () => {
  await nav("#/cek");
  await setInput("input[aria-label='Nomor transaksi']", "RSD-DEMO1234");
  await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Cek'); if (b) b.click(); return 'ok'; })()`);
  await sleep(500);
  return await evalJs(`(() => { const a = document.activeElement; const res = document.querySelector('.cek-result'); return { activeTag: a?.tagName, activeCls: a?.className || '', hasilMuncul: !!res, hasilPunyaFokus: a === res }; })()`);
});

writeFileSync(`${outDir}/cdp-s445e-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
