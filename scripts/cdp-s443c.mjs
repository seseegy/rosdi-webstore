// Probe susulan s443 (lanjutan): menutup celah data agent pertama —
// nav transition @1366 (ide 2), Cek a11y DEMO_REF (ide 71/75/76),
// ekor Tab-walk game (ide 72), Tab-walk Beranda chip+footer (ide 73),
// kontak bertahan saat ganti nominal (ide 34), verifikasi perbaikan
// CSS s443: reduced-motion (ide 10), animasi progress (ide 1),
// kontras ikon cari (ide 74). Pola cdp-s443.mjs (WebSocket CDP + partial JSONL).
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
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH < 900 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const setInput = async (sel, val) => evalJs(`(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return 'NO-EL';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(val)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'set';
})()`);
const PARTIAL = `${outDir}/cdp-s443c-partial-${WIDTH}.jsonl`;
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT-45s:" + label)), ms))]);
const probe = async (key, fn) => {
  try { R[key] = await withTimeout(fn(), 45000, key); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const goHash = async (h) => { await evalJs(`location.hash = ${JSON.stringify(h)}; 'ok'`); await sleep(1400); };
await evalJs(`localStorage.clear(); 'ok'`);

if (WIDTH === 1366) {
  // ide 2: transisi nav aktif (nav hanya tampil >= ~620px)
  await goHash("#/");
  await probe("nav_transition", async () => {
    const a = await evalJs(`(() => { const l = document.querySelector('nav.main a'); if (!l) return 'NO-NAV'; const cs = getComputedStyle(l); return { transition: cs.transition, transitionDuration: cs.transitionDuration, count: document.querySelectorAll('nav.main a').length }; })()`);
    // pindah ke Cek lalu ukur lagi link aktifnya
    await evalJs(`(() => { [...document.querySelectorAll('nav.main a')].find((x) => x.textContent.includes('Cek')).click(); return 'ok'; })()`);
    await sleep(800);
    const b = await evalJs(`(() => { const l = document.querySelector('nav.main a.on'); if (!l) return 'NO-ON'; const cs = getComputedStyle(l); return { text: l.textContent.trim(), transitionDuration: cs.transitionDuration }; })()`);
    return { home: a, cek: b, hash: await evalJs(`location.hash`) };
  });
  // ide 72 ekor: Tab-walk penuh halaman game sampai tombol Beli (lanjut dari 22)
  await goHash("#/game/mobile-legends");
  await probe("tabwalk_game_full", async () => {
    await evalJs(`document.activeElement?.blur(); window.scrollTo(0,0); 'ok'`);
    await sleep(200);
    const seq = [];
    for (let i = 0; i < 45; i++) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await sleep(110);
      const a = await evalJs(`(() => { const el = document.activeElement; if (!el || el === document.body) return 'BODY'; const cs = getComputedStyle(el); return { tag: el.tagName, cls: (el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 22), text: (el.textContent || '').trim().slice(0, 26), outline: cs.outlineStyle + ' ' + cs.outlineWidth, aria: el.getAttribute('aria-label') || el.getAttribute('aria-pressed') || '' }; })()`);
      seq.push(a);
      if (a === "BODY") break;
      if (typeof a === "object" && a.text && a.text.includes("Beli Sekarang")) break;
    }
    return seq;
  });
}

// ---- lebar berapa pun: perbaikan CSS + Cek + kontak + Tab-walk Beranda ----
await goHash("#/");
await probe("fix_progress_anim", () => evalJs(`(() => {
  const bar = document.querySelector('.progress i');
  if (!bar) return 'NO-EL';
  const cs = getComputedStyle(bar);
  const t0 = cs.transform;
  return new Promise((res) => setTimeout(() => { const cs2 = getComputedStyle(bar); res({ animationName: cs.animationName, animationDuration: cs.animationDuration, transformAtLoad: t0, transformAfter300ms: cs2.transform }); }, 300));
})()`));
await probe("fix_mag_contrast", async () => {
  const lum = `(hex) => { const c = hex.replace('#', ''); const f = (i) => { const v = parseInt(c.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4); }`;
  const ratio = `(a, b) => { const l1 = (${lum})(a), l2 = (${lum})(b); return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2); }`;
  const light = await evalJs(`(() => { const mag = document.querySelector('.searchbar .mag'); const rgb2hex = (rgb) => { const m = rgb.match(/\\d+/g); if (!m) return null; return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join(''); }; const cs = getComputedStyle(mag); const col = rgb2hex(cs.color); const bg = rgb2hex(getComputedStyle(mag.closest('.field')).backgroundColor); return { theme: document.documentElement.dataset.theme || 'light', color: col, bg, ratio: (${ratio})(col, bg) }; })()`);
  // ganti ke dark lalu ukur lagi
  await evalJs(`(() => { document.querySelector('.icon-btn').click(); return 'ok'; })()`);
  await sleep(500);
  const dark = await evalJs(`(() => { const mag = document.querySelector('.searchbar .mag'); const rgb2hex = (rgb) => { const m = rgb.match(/\\d+/g); if (!m) return null; return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join(''); }; const cs = getComputedStyle(mag); const col = rgb2hex(cs.color); const bg = rgb2hex(getComputedStyle(mag.closest('.field')).backgroundColor); return { theme: document.documentElement.dataset.theme || 'dark', color: col, bg, ratio: (${ratio})(col, bg) }; })()`);
  await evalJs(`(() => { document.querySelector('.icon-btn').click(); return 'ok'; })()`);
  await sleep(400);
  return { light, dark };
});
await probe("fix_reduced_motion", async () => {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await sleep(400);
  const r = await evalJs(`(() => {
    const els = { nom: document.querySelector('.nom') || document.querySelector('.chip'), chip: document.querySelector('.chip'), btn: document.querySelector('.btn'), progress: document.querySelector('.progress i') };
    const out = {};
    for (const [k, el] of Object.entries(els)) { if (el) { const cs = getComputedStyle(el); out[k] = { transitionDuration: cs.transitionDuration, animationName: cs.animationName }; } }
    return out;
  })()`);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  return r;
});
// ide 34 live: isi kontak, ganti kartu nominal, baca lagi
await goHash("#/game/mobile-legends");
await probe("contact_nom_change", async () => {
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  await setInput("#email", "test@email.com");
  await setInput("#wa", "081234567890");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[3].click(); return 'ok'; })()`);
  await sleep(200);
  return evalJs(`(() => ({ email: document.querySelector('#email').value, wa: document.querySelector('#wa').value, sel: document.querySelector('.nom.on .n-name')?.textContent }))()`);
});
// ide 71/75/76: halaman Cek via DEMO_REF (tanpa klik riwayat — itulah yang
// membuat probe s443 pertama melempar Uncaught di semua lebar)
await goHash("#/cek");
await probe("cek_page_a11y2", async () => {
  const heads = await evalJs(`[...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ':' + h.textContent.trim().slice(0, 30))`);
  await setInput(".step .input", "RSD-DEMO1234");
  await sleep(200);
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((b) => b.textContent.trim() === 'Cek').click(); return 'ok'; })()`);
  await sleep(800);
  const page = await evalJs(`(() => {
    const small = [...document.querySelectorAll('.timeline small')].find((e) => e.textContent.trim() === 'Selesai');
    const cs = small ? getComputedStyle(small) : null;
    const body = getComputedStyle(document.body);
    const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim().slice(0, 40));
    const tl = document.querySelector('.timeline');
    const order = tl ? [...tl.parentElement.children].map((c) => (c.className || c.tagName) + ':' + (c.textContent || '').replace(/\\s+/g, ' ').slice(0, 34)) : null;
    const tlItems = tl ? [...tl.querySelectorAll('li')].map((li) => li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 44)) : null;
    return { found: !!small, statusColor: cs ? cs.color : null, statusFontWeight: cs ? cs.fontWeight : null, bodyColor: body.color, rows, resultDomOrder: order, timelineItems: tlItems, liveRegions: [...document.querySelectorAll('[aria-live]')].map((e) => e.tagName + '.' + (e.className || '') + '=' + e.getAttribute('aria-live')) };
  })()`);
  return { heads, ...page }; /* s443d: `heads` sempat dirujuk di dalam string page-side (ReferenceError) — itulah penyebab ERROR probe Cek s443/s443b. */
});
// ide 73: Tab-walk Beranda — chip kategori + tautan footer
await goHash("#/");
await probe("tabwalk_home", async () => {
  await evalJs(`document.activeElement?.blur(); window.scrollTo(0,0); 'ok'`);
  await sleep(200);
  const seq = [];
  for (let i = 0; i < 60; i++) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await sleep(100);
    const a = await evalJs(`(() => { const el = document.activeElement; if (!el || el === document.body) return 'BODY'; const cs = getComputedStyle(el); return { tag: el.tagName, cls: (el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 22), text: (el.textContent || '').trim().slice(0, 26), outline: cs.outlineStyle + ' ' + cs.outlineWidth }; })()`);
    seq.push(a);
    if (a === "BODY") break;
  }
  return seq;
});

writeFileSync(`${outDir}/cdp-s443c-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH);
try { ws.close(); } catch {}
process.exit(0);
