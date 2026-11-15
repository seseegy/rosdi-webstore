// Ukur CDP s462. Berjalan via scripts/cdp-launch-s462.sh.
// Penggunaan: node scripts/cdp-s462.mjs <wsUrl> <width> <baseUrl> <outDir> [mode]
// mode: main | zooms1280 | zooms390
import { writeFileSync, mkdirSync } from "node:fs";
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
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
const pressKey = async (key, code, vk) => { await keyEvent("keyDown", key, code, vk); await keyEvent("keyUp", key, code, vk); await sleep(180); };
const pressSpace = async () => { await keyEvent("keyDown", " ", "Space", 32); await keyEvent("keyUp", " ", "Space", 32); await sleep(300); };
const pressEnter = async () => { await keyEvent("keyDown", "Enter", "Enter", 13); await keyEvent("keyUp", "Enter", "Enter", 13); await sleep(300); };
const pressTab = async () => { await pressKey("Tab", "Tab", 9); };
const pressArrow = async (dir) => { const vk = dir === "up" ? 38 : 40; const code = dir === "up" ? "ArrowUp" : "ArrowDown"; await keyEvent("keyDown", code, code, vk); await keyEvent("keyUp", code, code, vk); await sleep(250); };
const mouseMoveTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }); await sleep(200); };
const mousePressAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await sleep(90); };
const mouseReleaseAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); await sleep(200); };
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
const centerOf = async (js) => evalJs(`(() => { const el = (${js}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
const tabTo = async (label, maxTabs = 25) => {
  for (let i = 0; i < maxTabs; i++) {
    const cur = await evalJs(`(() => { const a = document.activeElement; return a ? (a.textContent || '').trim().slice(0, 40) + '|' + (a.tagName) + '|' + (a.className || '').toString().slice(0, 30) : 'none'; })()`);
    if (cur && cur.startsWith(label)) return { tabKe: i, aktif: cur };
    await pressTab();
  }
  return { tabKe: null, aktif: await evalJs(`(() => { const a = document.activeElement; return a ? (a.textContent || '').trim().slice(0, 40) : 'none'; })()`) };
};
const tabWalk = async (maxTabs = 40) => {
  const seen = [];
  for (let i = 0; i < maxTabs; i++) {
    const cur = await evalJs(`(() => { const a = document.activeElement; if (!a) return 'none'; const inCara = !!a.closest('#cara-topup'); const inTrust = !!a.closest('.trust'); const inChips = !!a.closest('.pay-chips'); return { t: (a.textContent || '').trim().slice(0, 30), tag: a.tagName, cls: (a.className || '').toString().slice(0, 25), inCara, inTrust, inChips }; })()`);
    seen.push(cur);
    await pressTab();
  }
  return seen;
};
const netCount = () => evalJs(`(() => { const res = performance.getEntriesByType('resource').map((e) => e.name); const dups = res.filter((u, i) => res.indexOf(u) !== i); return { jumlah: res.length, duplikat: [...new Set(dups)], daftar: res.map((u) => u.replace(/^https?:\\/\\/[^/]+/, '')) }; })()`);
// s462: pastikan dokumen sudah di origin preview (bukan file:// go.html / error page)
// sebelum menyentuh localStorage — kalau tidak, SecurityError menghentikan run.
const waitApp = async () => {
  for (let i = 0; i < 30; i++) {
    const ok = await evalJs(`(location.hostname === '127.0.0.1' && !!document.querySelector('main#konten')) ? 'ok' : 'no'`).catch(() => 'no');
    if (ok === 'ok') return true;
    await sleep(300);
  }
  return false;
};

if (WIDTH === 390 && MODE === "main") {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  await nav("#/");
  await waitApp();
  await evalJs(`localStorage.clear(); 'ok'`);

  // ---------- A1: hover kartu flash ----------
  await safe("A1-hover-flash", async () => {
    const before = await evalJs(`(() => { const el = document.querySelector('#katalog .card'); const cs = getComputedStyle(el); return { border: cs.borderColor, transform: cs.transform, transition: cs.transitionProperty }; })()`);
    const pos = await centerOf(`document.querySelector('#katalog .card')`);
    await mouseMoveTo(pos.x, pos.y);
    const after = await evalJs(`(() => { const el = document.querySelector('#katalog .card'); const cs = getComputedStyle(el); return { border: cs.borderColor, transform: cs.transform, hover: el.matches(':hover') }; })()`);
    return { sebelum: before, sesudah: after };
  });

  // ---------- A3: animasi kartu hasil pencarian ----------
  await safe("A3-animasi-hasil-cari", async () => {
    await evalJs(`(${setVal})(document.querySelector('.searchbar input'), 'mlbb'); 'ok'`);
    await sleep(400);
    return evalJs(`(() => { const cards = [...document.querySelectorAll('.grid.c4 .card')]; const cs = cards[0] ? getComputedStyle(cards[0]) : null; return { jumlahKartu: cards.length, kartuPertama: cards[0]?.textContent?.trim().slice(0, 30), animasi: cs ? cs.animationName + ' ' + cs.animationDuration : null, adaKatalog: !!document.querySelector('#katalog') }; })()`);
  });
  await evalJs(`(${setVal})(document.querySelector('.searchbar input'), ''); 'ok'`);
  await sleep(300);

  // ---------- A4: entrance modal Refund ----------
  await safe("A4-entrance-modal-refund", async () => {
    await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.textContent.trim() === 'Kebijakan Pengembalian'); b.click(); return 'ok'; })()`);
    await sleep(150);
    const r = await evalJs(`(() => { const m = document.querySelector('.modal'); const v = document.querySelector('.modal-veil'); if (!m) return { adaModal: false }; const cs = getComputedStyle(m); const cv = getComputedStyle(v); return { adaModal: true, judul: m.querySelector('h3')?.textContent, modalAnimasi: cs.animationName + ' ' + cs.animationDuration, veilAnimasi: cv.animationName + ' ' + cv.animationDuration }; })()`);
    await evalJs(`(() => { const b = [...document.querySelectorAll('.modal button')].find((x) => x.textContent.trim() === 'Tutup'); b?.click(); return 'ok'; })()`);
    await sleep(300);
    return r;
  });

  // ---------- A5: :active kartu Cara Top Up ----------
  await safe("A5-active-cara-topup", async () => {
    await evalJs(`(() => { document.querySelector('#cara-topup .card')?.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
    await sleep(400);
    const before = await evalJs(`(() => { const el = document.querySelector('#cara-topup .card'); const cs = getComputedStyle(el); return { border: cs.borderColor, transform: cs.transform, tag: el.tagName, bisaFokus: el.tabIndex >= 0 }; })()`);
    const pos = await centerOf(`document.querySelector('#cara-topup .card')`);
    await mousePressAt(pos.x, pos.y);
    const during = await evalJs(`(() => { const el = document.querySelector('#cara-topup .card'); const cs = getComputedStyle(el); return { border: cs.borderColor, transform: cs.transform, active: el.matches(':active') }; })()`);
    await mouseReleaseAt(pos.x, pos.y);
    return { sebelum: before, saatDitekan: during };
  });

  // ---------- A10: :active kartu game ----------
  await safe("A10-active-kartu-game", async () => {
    await evalJs(`(() => { document.querySelector('.grid.c4 .card')?.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
    await sleep(400);
    const before = await evalJs(`(() => { const el = document.querySelector('.grid.c4 .card'); const cs = getComputedStyle(el); return { border: cs.borderColor, transform: cs.transform }; })()`);
    const pos = await centerOf(`document.querySelector('.grid.c4 .card')`);
    await mousePressAt(pos.x, pos.y);
    const during = await evalJs(`(() => { const el = document.querySelector('.grid.c4 .card'); const cs = getComputedStyle(el); return { border: cs.borderColor, transform: cs.transform, active: el.matches(':active') }; })()`);
    await mouseReleaseAt(pos.x, pos.y);
    return { sebelum: before, saatDitekan: during };
  });

  // ---------- A8: transisi border kolom pencarian saat fokus ----------
  await safe("A8-fokus-pencarian", async () => {
    const before = await evalJs(`(() => { const f = document.querySelector('.searchbar .field'); const cs = getComputedStyle(f); return { border: cs.borderColor, transition: cs.transitionProperty + ' ' + cs.transitionDuration, outline: cs.outlineWidth + ' ' + cs.outlineStyle }; })()`);
    await evalJs(`(() => { document.querySelector('.searchbar input').focus(); return 'ok'; })()`);
    await sleep(250);
    const after = await evalJs(`(() => { const f = document.querySelector('.searchbar .field'); const cs = getComputedStyle(f); return { border: cs.borderColor, outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, focusWithin: f.matches(':focus-within') }; })()`);
    await evalJs(`(() => { document.activeElement?.blur(); return 'ok'; })()`);
    return { sebelum: before, sesudah: after };
  });

  // ---------- F65/F66/F68: tab walk ----------
  await safe("F65-66-68-tab-walk", async () => {
    await evalJs(`(() => { document.querySelector('.logo')?.focus(); return 'ok'; })()`);
    const seen = await tabWalk(40);
    const inCara = seen.filter((s) => s.inCara);
    const inTrust = seen.filter((s) => s.inTrust);
    const inChips = seen.filter((s) => s.inChips);
    return { totalTab: seen.length, pernahCaraTopup: inCara, pernahTrust: inTrust, pernahChipFooter: inChips };
  });

  // ---------- A6/A7: halaman MLBB ----------
  await nav("#/game/mobile-legends");
  await safe("A6-hover-nom", async () => {
    const before = await evalJs(`(() => { const el = document.querySelector('.nom'); const cs = getComputedStyle(el); return { border: cs.borderColor, transform: cs.transform }; })()`);
    const pos = await centerOf(`document.querySelector('.nom')`);
    await mouseMoveTo(pos.x, pos.y);
    const after = await evalJs(`(() => { const el = document.querySelector('.nom'); const cs = getComputedStyle(el); return { border: cs.borderColor, transform: cs.transform, hover: el.matches(':hover') }; })()`);
    return { sebelum: before, sesudah: after };
  });
  await safe("A7-animasi-total-mobilebar", async () => {
    const r1 = await evalJs(`(() => { const b = document.querySelector('.mb-total b'); const cs = b ? getComputedStyle(b) : null; return { total: b?.textContent, animasi: cs ? cs.animationName + ' ' + cs.animationDuration : null }; })()`);
    await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; const t = noms.find((n) => n.textContent.includes('706 Diamonds')); t?.click(); return 'ok'; })()`);
    await sleep(400);
    const r2 = await evalJs(`(() => { const b = document.querySelector('.mb-total b'); const cs = b ? getComputedStyle(b) : null; return { total: b?.textContent, animasi: cs ? cs.animationName + ' ' + cs.animationDuration : null }; })()`);
    return { sebelumGanti: r1, sesudahGanti: r2 };
  });
  await safe("F74-arrow-stepper", async () => {
    await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; noms[0]?.click(); return 'ok'; })()`);
    await sleep(200);
    // naikkan qty ke 2 dulu agar ArrowDown punya efek bila ditangani
    await evalJs(`(() => { document.querySelector('.qty button.plus')?.click(); return 'ok'; })()`);
    await sleep(200);
    await evalJs(`(() => { document.querySelector('.qty button.plus')?.focus(); return 'ok'; })()`);
    const fokus = await evalJs(`(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.textContent) + '|' + a.tagName : 'none'; })()`);
    const before = await evalJs(`(() => document.querySelector('.qty b')?.textContent)()`);
    await pressArrow("up");
    const afterUp = await evalJs(`(() => document.querySelector('.qty b')?.textContent)()`);
    await pressArrow("down");
    const afterDown = await evalJs(`(() => document.querySelector('.qty b')?.textContent)()`);
    await pressArrow("down");
    const afterDown2 = await evalJs(`(() => document.querySelector('.qty b')?.textContent)()`);
    return { fokusTombolPlus: fokus, qtySebelum: before, qtySetelahArrowUp: afterUp, qtySetelahArrowDown: afterDown, qtySetelahArrowDown2: afterDown2 };
  });

  // ---------- F75/F76: warna badge FF ----------
  await nav("#/game/free-fire");
  await safe("F75-76-badge-ff", async () => {
    const light = await evalJs(`(() => { const b = [...document.querySelectorAll('.nom .badge')].find((x) => x.textContent.trim() === '-10%'); const cs = b ? getComputedStyle(b) : null; const flash = [...document.querySelectorAll('.nom .badge')].find((x) => x.textContent.trim() === 'Flash sale'); return { badge10: b ? { bg: cs.backgroundColor, color: cs.color } : null, adaFlashSaleDiFF: !!flash }; })()`);
    await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]')?.click(); return 'ok'; })()`);
    await sleep(400);
    const dark = await evalJs(`(() => { const b = [...document.querySelectorAll('.nom .badge')].find((x) => x.textContent.trim() === '-10%'); const cs = b ? getComputedStyle(b) : null; return { tema: document.documentElement.dataset.theme, badge10: b ? { bg: cs.backgroundColor, color: cs.color } : null }; })()`);
    await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]')?.click(); return 'ok'; })()`);
    await sleep(300);
    return { light, dark };
  });
  await safe("F76-badge-flash-mlbb", async () => {
    await nav("#/game/mobile-legends");
    // badge "Flash sale" ada di tab Weekly Pass, bukan tab default Diamonds
    await evalJs(`(() => { const t = [...document.querySelectorAll('.tab')].find((x) => x.textContent.trim() === 'Weekly Pass'); t?.click(); return 'ok'; })()`);
    await sleep(400);
    const tabAktif = await evalJs(`(() => document.querySelector('.tab.on')?.textContent?.trim() || null)()`);
    const light = await evalJs(`(() => { const b = [...document.querySelectorAll('.nom .badge')].find((x) => x.textContent.trim() === 'Flash sale'); const cs = b ? getComputedStyle(b) : null; return { badgeFlash: b ? { bg: cs.backgroundColor, color: cs.color } : null }; })()`);
    await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]')?.click(); return 'ok'; })()`);
    await sleep(400);
    const dark = await evalJs(`(() => { const b = [...document.querySelectorAll('.nom .badge')].find((x) => x.textContent.trim() === 'Flash sale'); const cs = b ? getComputedStyle(b) : null; return { tema: document.documentElement.dataset.theme, badgeFlash: b ? { bg: cs.backgroundColor, color: cs.color } : null }; })()`);
    await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]')?.click(); return 'ok'; })()`);
    await sleep(300);
    return { tabAktif, light, dark };
  });

  // ---------- A2/A9 + F67/F73: halaman Sukses ----------
  await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ref:'RSD-TEST462A',kind:'game',product:'Mobile Legends',item:'172 Diamonds',qty:1,target:'12345678 (1234)',base:43500,fee:0,disc:0,total:43500,method:'QRIS',time:Date.now(),status:'Diproses',email:'',wa:'',token:null}])); 'ok'`);
  await nav("#/sukses/RSD-TEST462A");
  await safe("A2-hover-belanja-lagi", async () => {
    const before = await evalJs(`(() => { const b = [...document.querySelectorAll('.step button')].find((x) => x.textContent.trim() === 'Belanja Lagi'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, transform: cs.transform }; })()`);
    const pos = await centerOf(`[...document.querySelectorAll('.step button')].find((x) => x.textContent.trim() === 'Belanja Lagi')`);
    await mouseMoveTo(pos.x, pos.y);
    const after = await evalJs(`(() => { const b = [...document.querySelectorAll('.step button')].find((x) => x.textContent.trim() === 'Belanja Lagi'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, transform: cs.transform, hover: b.matches(':hover') }; })()`);
    return { sebelum: before, sesudah: after };
  });
  await safe("A9-active-cek-transaksi", async () => {
    const pos = await centerOf(`[...document.querySelectorAll('.step button')].find((x) => x.textContent.trim() === 'Cek Transaksi')`);
    await mousePressAt(pos.x, pos.y);
    const during = await evalJs(`(() => { const b = [...document.querySelectorAll('.step button')].find((x) => x.textContent.trim() === 'Cek Transaksi'); const cs = getComputedStyle(b); return { transform: cs.transform, active: b.matches(':active') }; })()`);
    await mouseReleaseAt(pos.x, pos.y);
    await sleep(300);
    return { saatDitekan: during, hashSesudahLepas: await evalJs(`location.hash`) };
  });
  await nav("#/sukses/RSD-TEST462A");
  await safe("F67-space-belanja-lagi", async () => {
    const f = await tabTo("Belanja Lagi");
    await pressSpace();
    return { fokus: f, hashSesudahSpace: await evalJs(`location.hash`), judul: await evalJs(`document.querySelector('h1')?.textContent`) };
  });
  await nav("#/sukses/RSD-TEST462A");
  await safe("F73-enter-belanja-lagi", async () => {
    const f = await tabTo("Belanja Lagi");
    // pasang penghitung klik agar bisa membedakan "Enter tidak memicu klik"
    // dari artefak pengukuran: klik via mouse harus menambah hitungan.
    await evalJs(`(() => { window.__klikBelanja = 0; const b = [...document.querySelectorAll('.step button')].find((x) => x.textContent.trim() === 'Belanja Lagi'); b.addEventListener('click', () => window.__klikBelanja++); return 'ok'; })()`);
    await keyEvent("keyDown", "Enter", "Enter", 13);
    await sleep(300);
    const afterDown = await evalJs(`(() => ({ klik: window.__klikBelanja, hash: location.hash }))()`);
    await keyEvent("keyUp", "Enter", "Enter", 13);
    await sleep(300);
    const afterUp = await evalJs(`(() => ({ klik: window.__klikBelanja, hash: location.hash, judul: document.querySelector('h1')?.textContent }))()`);
    return { fokus: f, sesudahKeyDown: afterDown, sesudahKeyUp: afterUp };
  });

  // ---------- H85-H91: deep link (dua bentuk URL) ----------
  const dl = async (id, url, fn) => { await safe(id, async () => { await navFull(url); return fn(); }); };
  const judulH1 = `(() => ({ hash: location.hash, search: location.search, h1: document.querySelector('h1')?.textContent || null, tabAktif: document.querySelector('.tab.on')?.textContent?.trim() || null, server: document.querySelector('#server')?.value || null }))()`;
  await dl("H85-tab-pulsa-dalam-hash", baseUrl + "#/game/mobile-legends?tab=pulsa", () => evalJs(judulH1));
  await dl("H85b-tab-pulsa-sebelum-hash", baseUrl + "?tab=pulsa#/game/mobile-legends", () => evalJs(judulH1));
  await dl("H88-tab-data-dalam-hash", baseUrl + "#/game/mobile-legends?tab=data", () => evalJs(judulH1));
  await dl("H88b-tab-data-sebelum-hash", baseUrl + "?tab=data#/game/mobile-legends", () => evalJs(judulH1));
  await dl("H89-tab-ewallet-dalam-hash", baseUrl + "#/game/mobile-legends?tab=ewallet", () => evalJs(judulH1));
  await dl("H89b-tab-ewallet-sebelum-hash", baseUrl + "?tab=ewallet#/game/mobile-legends", () => evalJs(judulH1));
  await dl("H86-operator-xl-dalam-hash", baseUrl + "#/pulsa?operator=xl", () => evalJs(judulH1));
  await dl("H86b-operator-xl-sebelum-hash", baseUrl + "?operator=xl#/pulsa", () => evalJs(judulH1));
  await dl("H90-operator-indosat-dalam-hash", baseUrl + "#/pulsa?operator=indosat", () => evalJs(judulH1));
  await dl("H90b-operator-indosat-sebelum-hash", baseUrl + "?operator=indosat#/pulsa", () => evalJs(judulH1));
  await dl("H91-server-eropa-dalam-hash", baseUrl + "#/game/genshin-impact?server=eropa", () => evalJs(judulH1));
  await dl("H91b-server-eropa-sebelum-hash", baseUrl + "?server=eropa#/game/genshin-impact", () => evalJs(judulH1));

  // ---------- H87/H92: jumlah request jaringan ----------
  await nav("#/emoney/dana");
  await safe("H87-net-ewallet", netCount);
  await nav("#/pln");
  await safe("H92-net-pln", netCount);
}

if (WIDTH === 1020 && MODE === "main") {
  await setMetrics(1020, 900, false);
  await nav("#/game/mobile-legends");
  await waitApp();
  await safe("G77-lebar1020-checkout", () => evalJs(`(() => { const f = document.querySelector('.flow'); const cs = f ? getComputedStyle(f) : null; const aside = document.querySelector('aside'); const ar = aside?.getBoundingClientRect(); const langkah = document.querySelector('.step')?.getBoundingClientRect(); const sum = document.querySelector('.summary')?.getBoundingClientRect(); return { flowTemplate: cs?.gridTemplateColumns, asideY: ar ? Math.round(ar.y) : null, langkahY: langkah ? Math.round(langkah.y) : null, berdampingan: ar && langkah ? Math.abs(ar.y - langkah.y) < 5 : null, asideW: ar ? Math.round(ar.width) : null, summaryW: sum ? Math.round(sum.width) : null, overflow: (${OVERFLOW_JS}) }; })()`));
}

if (MODE === "zooms1280" && WIDTH === 1280) {
  await setMetrics(1280, 900, false);
  for (const z of [45, 55, 85, 120]) {
    await nav("#/");
    await evalJs(`document.documentElement.style.zoom = '${z}%'; 'ok'`);
    await sleep(600);
    await safe(`G-zoom${z}-beranda`, () => evalJs(`(() => { const g = document.querySelector('.grid.c4'); const cs = g ? getComputedStyle(g) : null; const harga = [...document.querySelectorAll('.p-from')].slice(0, 6).map((e) => ({ teks: e.textContent, terpotong: e.scrollWidth > e.clientWidth + 1, w: Math.round(e.getBoundingClientRect().width) })); return { zoom: ${z}, innerWidth: window.innerWidth, kolomGame: cs ? cs.gridTemplateColumns.split(' ').length : null, harga, overflow: (${OVERFLOW_JS}) }; })()`));
    await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
  }
}

if (MODE === "zooms390" && WIDTH === 390) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  for (const z of [65, 70, 95]) {
    await nav("#/game/mobile-legends");
    await evalJs(`document.documentElement.style.zoom = '${z}%'; 'ok'`);
    await sleep(600);
    await safe(`G-zoom${z}-nom`, () => evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cs = g ? getComputedStyle(g) : null; const harga = [...document.querySelectorAll('.nom .n-price')].slice(0, 6).map((e) => ({ teks: e.textContent.trim().slice(0, 24), terpotong: e.scrollWidth > e.clientWidth + 1 })); return { zoom: ${z}, innerWidth: window.innerWidth, kolomNom: cs ? cs.gridTemplateColumns.split(' ').length : null, harga, overflow: (${OVERFLOW_JS}) }; })()`));
    await evalJs(`document.documentElement.style.zoom = ''; 'ok'`);
  }
}

writeFileSync(`${outDir}/results-${WIDTH}-${MODE}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, MODE, Object.keys(R).length, "pengukuran");
process.exit(0);
