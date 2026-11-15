// Probe CDP s446 bagian 2: skip-link (59), urutan Tab Cek (57), urutan Beli (56),
// lebar Blessing desktop (83), layout per lebar (96/97/98/99), landscape Cek (95),
// warna badge flash Light/Dark (49).
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
const PARTIAL = `${outDir}/cdp-s446b-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = '${hash}'; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const keyDown = async (key, code, vk) => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
};
const clickBtn = async (sel) => evalJs(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return 'NO-EL'; if (b.disabled) return 'DISABLED'; b.click(); return 'clicked'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

if (WIDTH === 390) {
  // 59: skip link — Tab pertama setelah load segar
  await probe("skip_link", async () => {
    await nav("#/");
    await evalJs(`document.querySelector('.searchbar input').blur(); 'ok'`);
    await sleep(200);
    const sebelum = await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, kelas: a?.className }; })()`);
    await keyDown("Tab", "Tab", 9); await sleep(300);
    const sesudah = await evalJs(`(() => { const a = document.activeElement; const sl = document.querySelector('.skip-link'); const cs = getComputedStyle(sl); return { aktifSkip: a === sl, tag: a?.tagName, kelas: (a?.className || '').toString().slice(0, 40), left: cs.left, rect: sl.getBoundingClientRect().width }; })()`);
    return { sebelum, sesudah };
  });

  // 57: urutan Tab di kartu hasil Cek
  await probe("tab_cek", async () => {
    await nav("#/cek");
    await setInput(".step .input", "RSD-DEMO1234"); await sleep(150);
    await clickBtn(".step .btn"); await sleep(500);
    const fokusAwal = await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, kelas: (a?.className || '').toString().slice(0, 40) }; })()`);
    const urutan = [];
    for (let i = 0; i < 4; i++) {
      await keyDown("Tab", "Tab", 9); await sleep(200);
      urutan.push(await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, teks: (a?.textContent || '').trim().slice(0, 40), kelas: (a?.className || '').toString().slice(0, 30) }; })()`));
    }
    return { fokusAwal, urutan };
  });

  // 56: urutan DOM tombol Beli (summary vs mobile-bar)
  await probe("urutan_beli", async () => {
    await nav("#/game/mobile-legends");
    return evalJs(`[...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Beli Sekarang').map((b) => ({ diMobileBar: !!b.closest('.mobile-bar'), diSummary: !!b.closest('.summary'), disabled: b.disabled }))`);
  });

  // 49: warna badge flash Light vs Dark
  await probe("badge_flash", async () => {
    const baca = async () => evalJs(`(() => { const b = document.querySelector('.grid.c2 .badge'); if (!b) return null; const cs = getComputedStyle(b); return { bg: cs.backgroundColor, color: cs.color, teks: b.textContent }; })()`);
    await nav("#/");
    const light = await baca();
    await evalJs(`document.documentElement.dataset.theme = 'dark'; 'ok'`); await sleep(200);
    const dark = await baca();
    return { light, dark };
  });
}

if (WIDTH === 1280) {
  // 83: Blessing of the Welkin Moon di grid 3 kolom desktop
  await probe("blessing_desktop", async () => {
    await nav("#/game/genshin-impact");
    await sleep(300);
    // pindah ke tab Blessing
    await evalJs(`(() => { const b = [...document.querySelectorAll('.tab')].find((x) => x.textContent.trim() === 'Blessing'); if (b) b.click(); return 'ok'; })()`);
    await sleep(300);
    return evalJs(`(() => { const c = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('Blessing of the Welkin Moon')); if (!c) return 'TIDAK-ADA'; const nm = c.querySelector('.n-name'); const cs = getComputedStyle(nm); return { cardW: c.getBoundingClientRect().width, namaScroll: nm.scrollWidth, namaClient: nm.clientWidth, tinggi: nm.getBoundingClientRect().height, lineHeight: cs.lineHeight, baris: Math.round(nm.getBoundingClientRect().height / parseFloat(cs.lineHeight)) }; })()`);
  });
}

// 96/97/98/99/95: layout per lebar — kolom grid, flow, mobile-bar, overflow-x
await probe("layout_lebar", async () => {
  await nav("#/game/mobile-legends");
  await sleep(300);
  await evalJs(`(() => { location.hash = '#/'; return 'ok'; })()`);
  await sleep(900);
  return evalJs(`(() => {
    const cols = (sel) => { const el = document.querySelector(sel); if (!el) return null; return getComputedStyle(el).gridTemplateColumns.split(' ').length; };
    const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    const nomOverflow = [...document.querySelectorAll('.nom')].filter((n) => n.scrollWidth > n.clientWidth + 1).length;
    const cardOverflow = [...document.querySelectorAll('.card')].filter((n) => n.scrollWidth > n.clientWidth + 1).length;
    return { innerW: window.innerWidth, gridC4: cols('.grid.c4'), gridC3: cols('.grid.c3'), docOverflow, docScrollW: document.documentElement.scrollWidth, cardOverflow, nomOverflow };
  })()`);
});

if (WIDTH === 800) {
  // 95: landscape HP di Cek — kartu hasil + timeline di viewport pendek
  await probe("cek_landscape", async () => {
    await nav("#/cek");
    await setInput(".step .input", "RSD-DEMO1234"); await sleep(150);
    await clickBtn(".step .btn"); await sleep(500);
    return evalJs(`(() => { const res = document.querySelector('.cek-result'); const tl = document.querySelector('.timeline'); return { innerH: window.innerHeight, resultH: res ? Math.round(res.getBoundingClientRect().height) : null, timelineH: tl ? Math.round(tl.getBoundingClientRect().height) : null, docScrollH: document.documentElement.scrollHeight, butuhScroll: document.documentElement.scrollHeight > window.innerHeight }; })()`);
  });
}

writeFileSync(`${outDir}/cdp-s446b-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI", WIDTH);
process.exit(0);
