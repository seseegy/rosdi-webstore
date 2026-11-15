// Ukur CDP s463. Berjalan via scripts/cdp-launch-s463.sh.
// Penggunaan: node scripts/cdp-s463.mjs <wsUrl> <width> <baseUrl> <outDir> [mode]
// mode: main | widths | zooms390 | zooms1280
import { mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir, modeArg] = process.argv.slice(2);
const WIDTH = +wArg;
const MODE = modeArg || "main";
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; console.log(id, JSON.stringify(data)); };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const setMetrics = async (w, h = 844, mobile = w < 900) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const navFull = async (url) => { await evalJs(`location.assign(${JSON.stringify(url)}); 'ok'`); await sleep(2200); };
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, text) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
const pressEnter = async () => { await keyEvent("keyDown", "Enter", "Enter", 13, "\r"); await keyEvent("keyUp", "Enter", "Enter", 13); await sleep(350); };
const pressTab = async () => { await keyEvent("keyDown", "Tab", "Tab", 9); await keyEvent("keyUp", "Tab", "Tab", 9); await sleep(120); };
const pressEscape = async () => { await keyEvent("keyDown", "Escape", "Escape", 27); await keyEvent("keyUp", "Escape", "Escape", 27); await sleep(300); };
const OVERFLOW_JS = `(() => {
  const vw = window.innerWidth;
  const bad = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) {
      const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 40);
      bad.push({ tag: el.tagName, cls, txt: (el.textContent || '').trim().slice(0, 40), left: +r.left.toFixed(1), right: +r.right.toFixed(1) });
    }
  });
  return { innerWidth: vw, scrollWidth: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > vw, pelanggar: bad.slice(0, 12), jumlahPelanggar: bad.length };
})()`;
// Tekan-dan-tahan di tengah elemen, baca :active + transform saat ditekan, lalu lepas.
const pressAndRead = async (selJs) => {
  const c = await evalJs(`(() => { const el = (${selJs}); if (!el) return null; el.scrollIntoView({ behavior: 'instant', block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!c) return { ditemukan: false };
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: c.x, y: c.y, button: "left", clickCount: 1 });
  await sleep(90);
  const st = await evalJs(`(() => { const el = (${selJs}); const cs = getComputedStyle(el); return { active: el.matches(':active'), transform: cs.transform, tag: el.tagName, cls: (el.className || '').toString().slice(0, 30) }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: c.x, y: c.y, button: "left", clickCount: 1 });
  await sleep(250);
  return { ditemukan: true, ...st };
};
const focusBorder = async (selJs) => evalJs(`(() => {
  const el = (${selJs}); if (!el) return null;
  const before = getComputedStyle(el).borderColor;
  const tr = getComputedStyle(el).transition;
  el.focus();
  return new Promise((res) => setTimeout(() => {
    const cs = getComputedStyle(el);
    res({ sebelum: before, sesudah: cs.borderColor, outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, transition: tr, berubah: before !== cs.borderColor });
  }, 250));
})()`);
const outlineOf = async (selJs) => evalJs(`(() => { const el = (${selJs}); if (!el) return null; const cs = getComputedStyle(el); return { focusVisible: el.matches(':focus-visible'), outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, offset: cs.outlineOffset }; })()`);
// Tab-walk sampai activeElement cocok dengan predikat (dicek di page), kembalikan info fokus.
const tabWalkTo = async (testJs, maxTabs = 60) => {
  for (let i = 0; i < maxTabs; i++) {
    const hit = await evalJs(`(() => { const a = document.activeElement; if (!a) return null; const ok = (${testJs})(a); return ok ? { t: (a.textContent || a.value || '').trim().slice(0, 30), tag: a.tagName, cls: (a.className || '').toString().slice(0, 30) } : null; })()`);
    if (hit) return { tabKe: i, ...hit, ...(await outlineOf("document.activeElement")) };
    await pressTab();
  }
  return { tabKe: null };
};

if (MODE === "main") {
  await setMetrics(390, 844, true);
  await nav("#/");
  // A1: tombol Masuk header
  await safe("A1-masuk-header", () => pressAndRead(`[...document.querySelectorAll('header .btn')].find(b => b.textContent.trim() === 'Masuk')`));
  // A2: kartu trust pertama
  await safe("A2-trust-card", () => pressAndRead(`document.querySelector('.trust .card')`));
  // A3: kartu flash pertama
  await safe("A3-flash-card", () => pressAndRead(`document.querySelector('#katalog .card')`));
  // A4: tombol di dalam modal Masuk — buka modal dulu, daftar tombolnya
  await safe("A4-modal-tombol", async () => {
    await evalJs(`(() => { const b = [...document.querySelectorAll('header .btn')].find(x => x.textContent.trim() === 'Masuk'); b.click(); return 'ok'; })()`);
    await sleep(500);
    const info = await evalJs(`(() => [...document.querySelectorAll('.modal button')].map(b => ({ teks: b.textContent.trim(), cls: b.className })) )()`);
    const st = await pressAndRead(`[...document.querySelectorAll('.modal button')].find(b => b.textContent.includes('Siap'))`);
    await pressEscape();
    return { tombolModal: info, tekanSiap: st };
  });
  // A5-A10: transisi border saat fokus (satu halaman per input)
  await nav("#/pulsa/telkomsel");
  await safe("A5-fokus-hp", () => focusBorder(`document.querySelector('#hp')`));
  await nav("#/pln");
  await safe("A6-fokus-pln", () => focusBorder(`document.querySelector('#idpel')`));
  await nav("#/game/mobile-legends");
  await safe("A7-fokus-promo", () => focusBorder(`document.querySelector('input[aria-label="Kode promo"]')`));
  await safe("A9-fokus-zone", () => focusBorder(`document.querySelector('#zone')`));
  await safe("A10-fokus-email", () => focusBorder(`document.querySelector('#email')`));
  await nav("#/cek");
  await safe("A8-fokus-order", () => focusBorder(`document.querySelector('input[aria-label="Nomor transaksi"]')`));
  // F69/F70: kartu non-interaktif — tabIndex + atribut
  await nav("#/");
  await safe("F69-cara-topup-div", () => evalJs(`(() => { const el = document.querySelector('#cara-topup .card'); return { tag: el.tagName, tabIndex: el.tabIndex, punyaTabindexAttr: el.hasAttribute('tabindex'), role: el.getAttribute('role'), bisaDifokus: el.tabIndex >= 0 }; })()`));
  await safe("F70-trust-div", () => evalJs(`(() => { const el = document.querySelector('.trust .card'); return { tag: el.tagName, tabIndex: el.tabIndex, punyaTabindexAttr: el.hasAttribute('tabindex'), role: el.getAttribute('role'), bisaDifokus: el.tabIndex >= 0 }; })()`));
  // F71: Enter di tab game
  await nav("#/game/mobile-legends");
  await safe("F71-enter-tab", async () => {
    const before = await evalJs(`[...document.querySelectorAll('.tab')].find(t => t.classList.contains('on'))?.textContent`);
    await evalJs(`(() => { const t = [...document.querySelectorAll('.tab')].find(x => x.textContent.trim() === 'Weekly Pass'); t.focus(); return 'ok'; })()`);
    await pressEnter();
    const after = await evalJs(`[...document.querySelectorAll('.tab')].find(t => t.classList.contains('on'))?.textContent`);
    const item0 = await evalJs(`document.querySelector('.nom .n-name')?.textContent`);
    return { sebelum: before, sesudah: after, itemPertama: item0 };
  });
  // F72: focus-visible input promo via Tab-walk
  await safe("F72-focusvisible-promo", () => tabWalkTo(`(a) => a.getAttribute && a.getAttribute('aria-label') === 'Kode promo'`));
  // F73: focus-visible tombol stepper via Tab-walk
  await safe("F73-focusvisible-stepper", () => tabWalkTo(`(a) => a.getAttribute && (a.getAttribute('aria-label') === 'Tambah' || a.getAttribute('aria-label') === 'Kurangi')`));
  // F74: Enter di chip kategori
  await nav("#/");
  await safe("F74-enter-chip", async () => {
    const before = await evalJs(`[...document.querySelectorAll('.chip')].find(c => c.classList.contains('on'))?.textContent`);
    await evalJs(`(() => { const c = [...document.querySelectorAll('.chip')].find(x => x.textContent.trim() === 'Pulsa'); c.focus(); return 'ok'; })()`);
    await pressEnter();
    const after = await evalJs(`[...document.querySelectorAll('.chip')].find(c => c.classList.contains('on'))?.textContent`);
    return { sebelum: before, sesudah: after };
  });
  // H spot-check: deep link ber-query diabaikan
  await safe("H88-tab-pln", async () => { await navFull(baseUrl + "?tab=pln"); return { hash: await evalJs(`location.hash`), hero: await evalJs(`!!document.querySelector('.hero h1')`), h1: await evalJs(`document.querySelector('h1')?.textContent`) }; });
  await safe("H95-qty-3", async () => { await navFull(baseUrl + "?qty=3#/game/mobile-legends"); return { qty: await evalJs(`document.querySelector('.qty b')?.textContent`), hash: await evalJs(`location.hash`) }; });
  await safe("H89-operator-byu", async () => { await navFull(baseUrl + "?operator=byu#/pulsa"); return { judul: await evalJs(`document.querySelector('h1, h2')?.textContent`), hash: await evalJs(`location.hash`) }; });
}

if (MODE === "widths") {
  await setMetrics(WIDTH, 844, WIDTH < 900);
  if (WIDTH === 470) {
    await nav("#/");
    await safe("G83-lebar470", () => evalJs(`(() => { const g = document.querySelector('.grid.c4'); const cs = g ? getComputedStyle(g) : null; const cards = [...document.querySelectorAll('.grid.c4 .card')].slice(0, 4).map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), terpotongKanan: r.right > window.innerWidth + 0.5 }; }); return { kolomGame: cs ? cs.gridTemplateColumns.split(' ').length : null, cards, overflow: (${OVERFLOW_JS}) }; })()`));
  } else if (WIDTH === 680) {
    await nav("#/game/mobile-legends");
    await safe("G84-lebar680", () => evalJs(`(() => { const main = document.querySelector('main'); const aside = document.querySelector('aside'); const steps = document.querySelector('.steps, .checkout, main .wrap'); const r1 = document.querySelector('.step')?.getBoundingClientRect(); const rA = aside?.getBoundingClientRect(); const layout = aside && r1 ? (Math.abs(rA.top - r1.top) < 5 ? 'berdampingan' : 'menumpuk') : 'aside-tidak-ditemukan'; return { layout, lebarAside: rA ? Math.round(rA.width) : null, atasAside: rA ? Math.round(rA.top) : null, atasStep1: r1 ? Math.round(r1.top) : null, overflow: (${OVERFLOW_JS}) }; })()`));
  } else if (WIDTH === 980) {
    await nav("#/");
    await safe("G85-lebar980", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); return { lebarWrap: Math.round(r.width), innerWidth: window.innerWidth, overflow: (${OVERFLOW_JS}) }; })()`));
  }
}

if (MODE === "zooms390") {
  await setMetrics(390, 844, true);
  for (const z of [130, 160, 180]) {
    await nav("#/");
    await evalJs(`document.documentElement.style.zoom = '${z}%'; 'ok'`);
    await sleep(600);
    await safe(`G80-82-zoom${z}-beranda`, () => evalJs(`(() => { const g = document.querySelector('.grid.c4'); const cs = g ? getComputedStyle(g) : null; const harga = [...document.querySelectorAll('.grid.c4 .p-from')].slice(0, 6).map((e) => ({ teks: e.textContent, terpotong: e.scrollWidth > e.clientWidth + 1 })); return { zoom: ${z}, kolomGame: cs ? cs.gridTemplateColumns.split(' ').length : null, harga, overflow: (${OVERFLOW_JS}) }; })()`));
    await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
  }
  // G81: zoom 160% grid nominal (halaman game)
  await nav("#/game/mobile-legends");
  await evalJs(`document.documentElement.style.zoom = '160%'; 'ok'`);
  await sleep(600);
  await safe("G81-zoom160-nom", () => evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cs = g ? getComputedStyle(g) : null; const harga = [...document.querySelectorAll('.nom .n-price')].slice(0, 6).map((e) => ({ teks: e.textContent.trim().slice(0, 24), terpotong: e.scrollWidth > e.clientWidth + 1 })); return { zoom: 160, kolomNom: cs ? cs.gridTemplateColumns.split(' ').length : null, harga, overflow: (${OVERFLOW_JS}) }; })()`));
  await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
}

if (MODE === "zooms1280") {
  await setMetrics(1280, 900, false);
  for (const z of [90, 105]) {
    await nav("#/");
    await evalJs(`document.documentElement.style.zoom = '${z}%'; 'ok'`);
    await sleep(600);
    await safe(`G86-87-zoom${z}-beranda`, () => evalJs(`(() => { const g = document.querySelector('.grid.c4'); const cs = g ? getComputedStyle(g) : null; const harga = [...document.querySelectorAll('.grid.c4 .p-from')].slice(0, 6).map((e) => ({ teks: e.textContent, terpotong: e.scrollWidth > e.clientWidth + 1 })); return { zoom: ${z}, kolomGame: cs ? cs.gridTemplateColumns.split(' ').length : null, harga, overflow: (${OVERFLOW_JS}) }; })()`));
    await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
  }
  // G87: zoom 105% grid nominal (halaman game, 1280)
  await nav("#/game/mobile-legends");
  await evalJs(`document.documentElement.style.zoom = '105%'; 'ok'`);
  await sleep(600);
  await safe("G87-zoom105-nom", () => evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cs = g ? getComputedStyle(g) : null; const harga = [...document.querySelectorAll('.nom .n-price')].slice(0, 6).map((e) => ({ teks: e.textContent.trim().slice(0, 24), terpotong: e.scrollWidth > e.clientWidth + 1 })); return { zoom: 105, kolomNom: cs ? cs.gridTemplateColumns.split(' ').length : null, harga, overflow: (${OVERFLOW_JS}) }; })()`));
  await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
}

console.log("SELESAI " + MODE + " " + WIDTH);
process.exit(0);
