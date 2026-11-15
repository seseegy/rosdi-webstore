// Ukur CDP s461 (lebar 390: A1-A10, F65/F66/F74-F76, H85-92;
// lebar lain: G77-G82; zoom: G83/G84). Berjalan via scripts/cdp-launch-s461.sh.
// Penggunaan: node scripts/cdp-s461.mjs <wsUrl> <width> <baseUrl> <outDir> [mode]
// mode: main | zoom60 | zoom140 (zoom hanya bermakna di WIDTH 1280/390).
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
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
const pressKey = async (key, code, vk) => { await keyEvent("keyDown", key, code, vk); await keyEvent("keyUp", key, code, vk); await sleep(180); };
const pressSpace = async () => { await keyEvent("keyDown", " ", "Space", 32); await keyEvent("keyUp", " ", "Space", 32); await sleep(300); };
const pressTab = async () => { await pressKey("Tab", "Tab", 9); };
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
const gridCols = `(sel) => { const g = document.querySelector(sel); if (!g) return null; const cs = getComputedStyle(g); return { kolom: cs.gridTemplateColumns.split(' ').length, template: cs.gridTemplateColumns }; }`;
const tabTo = async (label, maxTabs = 20) => {
  for (let i = 0; i < maxTabs; i++) {
    const cur = await evalJs(`(() => { const a = document.activeElement; return a ? (a.textContent || '').trim().slice(0, 40) + '|' + (a.tagName) + '|' + (a.className || '').toString().slice(0, 30) : 'none'; })()`);
    if (cur && cur.startsWith(label)) return { tabKe: i, aktif: cur };
    await pressTab();
  }
  return { tabKe: null, aktif: await evalJs(`(() => { const a = document.activeElement; return a ? (a.textContent || '').trim().slice(0, 40) : 'none'; })()`) };
};

if (WIDTH === 390 && MODE === "main") {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);

  // ---------- A1: HP valid -> border hijau? ----------
  await nav("#/pulsa/telkomsel");
  await safe("A1-hp-valid-border", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`);
    await sleep(400);
    return evalJs(`(() => { const el = document.querySelector('#hp'); const cs = getComputedStyle(el); const note = document.querySelector('.note.good')?.textContent || null; return { kelas: el.className, borderColor: cs.borderColor, adaOk: el.classList.contains('ok'), catatanBaik: note }; })()`);
  });

  // ---------- A2: PLN Cek Nama valid -> border hijau? ----------
  await nav("#/pln");
  await safe("A2-pln-cek-border", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
    await sleep(300);
    const before = await evalJs(`(() => { const el = document.querySelector('#idpel'); return { kelas: el.className, border: getComputedStyle(el).borderColor }; })()`);
    await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek Nama')?.click(); return 'ok'; })()`);
    await sleep(400);
    const after = await evalJs(`(() => { const el = document.querySelector('#idpel'); const cs = getComputedStyle(el); const note = document.querySelector('.note.good')?.textContent || null; return { kelas: el.className, borderColor: cs.borderColor, adaOk: el.classList.contains('ok'), catatanBaik: note }; })()`);
    return { sebelumCek: before, sesudahCek: after };
  });

  // ---------- A3: Riot ID valid -> border hijau + transisi? ----------
  await nav("#/game/valorant");
  await safe("A3-riot-valid-border", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#riot'), 'Nama#TAG12'); return 'ok'; })()`);
    await sleep(400);
    return evalJs(`(() => { const el = document.querySelector('#riot'); const cs = getComputedStyle(el); return { kelas: el.className, borderColor: cs.borderColor, adaOk: el.classList.contains('ok'), transisi: cs.transitionProperty + ' ' + cs.transitionDuration }; })()`);
  });

  // ---------- A9: Zone valid -> border hijau + transisi? ----------
  await nav("#/game/mobile-legends");
  await safe("A9-zone-valid-border", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
    await sleep(400);
    return evalJs(`(() => { const el = document.querySelector('#zone'); const cs = getComputedStyle(el); return { kelas: el.className, borderColor: cs.borderColor, adaOk: el.classList.contains('ok'), transisi: cs.transitionProperty + ' ' + cs.transitionDuration }; })()`);
  });

  // ---------- A10: WA valid di Detail Kontak -> border hijau? ----------
  await safe("A10-wa-valid-border", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#wa'), '081234567890'); return 'ok'; })()`);
    await sleep(400);
    return evalJs(`(() => { const el = document.querySelector('#wa'); const cs = getComputedStyle(el); return { kelas: el.className, borderColor: cs.borderColor, adaOk: el.classList.contains('ok'), adaPeringatan: !!document.querySelector('.note') }; })()`);
  });

  // ---------- A8: apakah ada input manual qty? ----------
  await safe("A8-qty-input-ada", () => evalJs(`(() => { const q = document.querySelector('.qty'); return { adaQty: !!q, adaInput: !!document.querySelector('.qty input'), isiB: document.querySelector('.qty b')?.textContent, animasiB: document.querySelector('.qty b') ? getComputedStyle(document.querySelector('.qty b')).animationName : null }; })()`));

  // ---------- A4: active tombol Tutup modal S&K ----------
  await nav("#/");
  await safe("A4-tutup-active", async () => {
    await evalJs(`(() => { [...document.querySelectorAll('footer.site button.flink')].find((b) => b.textContent.includes('Syarat'))?.click(); return 'ok'; })()`);
    await sleep(500);
    const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('.modal button')].find((x) => x.textContent.trim() === 'Tutup'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA";
    await mousePressAt(pos.x, pos.y);
    const t = await evalJs(`(() => { const b = [...document.querySelectorAll('.modal button')].find((x) => x.textContent.trim() === 'Tutup'); return { transform: getComputedStyle(b).transform, kelas: b.className }; })()`);
    await mouseReleaseAt(pos.x, pos.y);
    await evalJs(`(() => { [...document.querySelectorAll('.modal button')].find((x) => x.textContent.trim() === 'Tutup')?.click(); return 'ok'; })()`);
    await sleep(300);
    return { saatDitekan: t };
  });

  // ---------- A5: hover tombol Masuk header ----------
  await safe("A5-masuk-hover", async () => {
    const before = await evalJs(`(() => { const b = [...document.querySelectorAll('header.site button')].find((x) => x.textContent.trim() === 'Masuk'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, transform: cs.transform }; })()`);
    const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('header.site button')].find((x) => x.textContent.trim() === 'Masuk'); const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const after = await evalJs(`(() => { const b = [...document.querySelectorAll('header.site button')].find((x) => x.textContent.trim() === 'Masuk'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, transform: cs.transform, hover: b.matches(':hover') }; })()`);
    return { sebelum: before, sesudahHover: after };
  });

  // ---------- A6: hover kartu Cara Top Up ----------
  await safe("A6-cara-topup-hover", async () => {
    await evalJs(`(() => { document.getElementById('cara-topup')?.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
    await sleep(400);
    const before = await evalJs(`(() => { const c = document.querySelector('#cara-topup .card'); const cs = getComputedStyle(c); return { border: cs.borderColor, transform: cs.transform }; })()`);
    const pos = await evalJs(`(() => { const c = document.querySelector('#cara-topup .card'); const r = c.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const after = await evalJs(`(() => { const c = document.querySelector('#cara-topup .card'); const cs = getComputedStyle(c); return { border: cs.borderColor, transform: cs.transform, hover: c.matches(':hover') }; })()`);
    return { sebelum: before, sesudahHover: after };
  });

  // ---------- A7: tombol Salin di kartu hasil Cek? ----------
  await evalJs(`(() => { const o = { ref: 'RSD-S461A7', kind: 'pln', product: 'Token PLN', item: 'Token 20.000', qty: 1, target: '543210987654', base: 22500, fee: 0, disc: 0, total: 22500, method: 'QRIS', time: Date.now(), status: 'Selesai', email: '', wa: '', token: '1234 5678 9012 3456 7890' }; localStorage.setItem('rosdi_orders', JSON.stringify([o])); return 'seeded'; })()`);
  await nav("#/cek/RSD-S461A7");
  await safe("A7-salin-di-cek", () => evalJs(`(() => { const res = document.querySelector('.cek-result'); if (!res) return 'TIDAK-ADA-HASIL'; const btns = [...res.querySelectorAll('button')].map((b) => b.textContent.trim()); return { tombolDiHasil: btns, adaSalin: btns.some((t) => /salin/i.test(t)), teksHasil: res.textContent.slice(0, 200) }; })()`));

  // ---------- F65: Space di tombol Cek Nama ----------
  await nav("#/pln");
  await safe("F65-space-cek-nama", async () => {
    await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
    await sleep(300);
    const tab = await tabTo("Cek Nama");
    await pressSpace();
    await sleep(400);
    const hasil = await evalJs(`(() => ({ catatanBaik: !!document.querySelector('.note.good'), teksCatatan: document.querySelector('.note.good')?.textContent?.slice(0, 80) || null, tombolJadi: document.querySelector('.modal button, form button[type=submit]')?.textContent || null, cekUlang: [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Cek Ulang') })()`);
    return { tab, hasil };
  });

  // ---------- F66: focus-visible tombol Cek Nama (pasca-F65 tombol jadi "Cek Ulang") ----------
  await safe("F66-focus-visible-cek-nama", async () => {
    const tab = await tabTo("Cek Ulang");
    const st = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cek Nama' || x.textContent.trim() === 'Cek Ulang'); if (!b) return null; const cs = getComputedStyle(b); return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, fokus: document.activeElement === b }; })()`);
    return { tab, gaya: st };
  });

  // ---------- F74: Space di tombol Salin (Sukses, token PLN) ----------
  await nav("#/sukses/RSD-S461A7");
  await safe("F74-space-salin-sukses", async () => {
    const tab = await tabTo("Salin token");
    await pressSpace();
    await sleep(400);
    const hasil = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /Salin token/.test(x.textContent)); return { teksTombol: b?.textContent?.trim(), tersalin: /disalin/i.test(b?.textContent || '') }; })()`);
    return { tab, hasil };
  });

  // ---------- F75: Space di tombol Masuk (header) + label tombol modal ----------
  await nav("#/");
  await safe("F75-space-masuk", async () => {
    const tab = await tabTo("Masuk");
    await pressSpace();
    await sleep(400);
    const hasil = await evalJs(`(() => { const m = document.querySelector('.modal'); return { modalTerbuka: !!m, judulModal: m?.querySelector('h3')?.textContent || null, tombolModal: m ? [...m.querySelectorAll('button')].map((b) => b.textContent.trim()) : [] }; })()`);
    await evalJs(`(() => { const b = [...document.querySelectorAll('.modal button')].find((x) => x.textContent.includes('Siap')); b?.click(); return 'ok'; })()`);
    await sleep(300);
    return { tab, hasil };
  });

  // ---------- F76: Space di chip pembayaran footer ----------
  await safe("F76-space-chip-footer", async () => {
    const info = await evalJs(`(() => { const chips = [...document.querySelectorAll('.pay-chips span')]; return { jumlah: chips.length, tag: chips[0]?.tagName, tabIndex: chips[0]?.tabIndex, role: chips[0]?.getAttribute('role'), bisaKlik: typeof chips[0]?.onclick }; })()`);
    // Tab sampai 40x: apakah chip pernah jadi activeElement?
    let pernahFokus = false;
    for (let i = 0; i < 40; i++) {
      const a = await evalJs(`(() => { const el = document.activeElement; return el && el.closest && el.closest('.pay-chips') ? (el.textContent || '').trim() : null; })()`);
      if (a) { pernahFokus = a; break; }
      await pressTab();
    }
    return { ...info, pernahFokusChip: pernahFokus };
  });

  // ---------- H85-H92: deep link (query sebelum hash) ----------
  const dl = async (id, url, cek) => {
    await evalJs(`location.assign(${JSON.stringify(url)}); 'ok'`);
    await sleep(2200);
    await safe(id, cek);
  };
  await dl("H85-metode-gopay-kecil", baseUrl + "?metode=gopay#/game/mobile-legends", () => evalJs(`(() => ({ payTerpilih: document.querySelector('.pay.on')?.textContent?.slice(0, 30) || null, judul: document.querySelector('h1')?.textContent || null, uid: document.querySelector('#uid')?.value || '' }))()`));
  await dl("H86-promo-gamer5-kecil", baseUrl + "?promo=gamer5#/game/mobile-legends", () => evalJs(`(() => ({ barisDiskon: !!document.querySelector('.sum-row.disc'), pesanPromo: document.querySelector('.note.good')?.textContent || null, promoInput: document.querySelector('input[aria-label="Kode promo"]')?.value || '' }))()`));
  await dl("H87-server-asia-kecil", baseUrl + "?server=asia#/game/genshin-impact", () => evalJs(`(() => ({ server: document.querySelector('#server')?.value || null, opsi: [...document.querySelectorAll('#server option')].map((o) => o.value) }))()`));
  await dl("H88-uid-kosong", baseUrl + "?uid=#/game/mobile-legends", () => evalJs(`(() => ({ uid: document.querySelector('#uid')?.value, adaError: !!document.querySelector('.note.bad'), judul: document.querySelector('h1')?.textContent || null }))()`));
  await dl("H89-zone-kosong", baseUrl + "?zone=#/game/mobile-legends", () => evalJs(`(() => ({ zone: document.querySelector('#zone')?.value, adaError: !!document.querySelector('.note.bad'), judul: document.querySelector('h1')?.textContent || null }))()`));
  await dl("H90-nominal-0", baseUrl + "?nominal=0#/game/mobile-legends", () => evalJs(`(() => ({ nominalTerpilih: !!document.querySelector('.nom.on'), judul: document.querySelector('h1')?.textContent || null, adaError: !!document.querySelector('.note.bad') }))()`));
  await dl("H91-qty-2", baseUrl + "?qty=2#/game/mobile-legends", () => evalJs(`(() => ({ qty: document.querySelector('.qty b')?.textContent, nominalTerpilih: !!document.querySelector('.nom.on') }))()`));
  await dl("H92-tab-game", baseUrl + "?tab=game#/game/mobile-legends", () => evalJs(`(() => ({ tabAktif: document.querySelector('.tab.on')?.textContent?.trim() || null, judul: document.querySelector('h1')?.textContent || null }))()`));
  // bentuk hash-embedded (tambahan): query menempel di hash -> rute pecah?
  await dl("H88b-uid-di-hash", baseUrl + "#/game/mobile-legends?uid=12345678", () => evalJs(`(() => ({ judul: document.querySelector('h1')?.textContent || null, adaHero: !!document.querySelector('.hero'), uidInput: !!document.querySelector('#uid') }))()`));
}

// ---------- G: lebar ----------
if (WIDTH === 370) {
  await setMetrics(370);
  await nav("#/game/mobile-legends");
  await safe("G77-lebar370-nom", () => evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cs = g ? getComputedStyle(g) : null; const karts = [...document.querySelectorAll('.nom')].map((n) => { const r = n.getBoundingClientRect(); return { w: Math.round(r.width), right: Math.round(r.right), terpotong: r.right > 370 + 0.5 }; }); return { kolom: cs ? cs.gridTemplateColumns.split(' ').length : null, kartu: karts.slice(0, 6), overflow: (${OVERFLOW_JS}) }; })()`));
}
if (WIDTH === 450) {
  await setMetrics(450);
  await nav("#/");
  await safe("G78-lebar450-game", () => evalJs(`(() => { const sec = [...document.querySelectorAll('section.block')].find((s) => s.querySelector('h2')?.textContent === 'Top Up Game'); const g = sec?.querySelector('.grid.c4'); const cs = g ? getComputedStyle(g) : null; const karts = [...(sec?.querySelectorAll('.card') || [])].map((n) => { const r = n.getBoundingClientRect(); return { w: Math.round(r.width), right: Math.round(r.right), terpotong: r.right > 450 + 0.5 }; }); return { kolom: cs ? cs.gridTemplateColumns.split(' ').length : null, kartu: karts.slice(0, 4) }; })()`));
}
if (WIDTH === 740) {
  await setMetrics(740);
  await nav("#/game/mobile-legends");
  await safe("G79-lebar740-checkout", () => evalJs(`(() => { const f = document.querySelector('.flow'); const cs = f ? getComputedStyle(f) : null; const aside = document.querySelector('aside'); const ar = aside?.getBoundingClientRect(); const langkah = document.querySelector('.step')?.getBoundingClientRect(); return { flowTemplate: cs?.gridTemplateColumns, asideY: ar ? Math.round(ar.y) : null, langkahY: langkah ? Math.round(langkah.y) : null, berdampingan: ar && langkah ? Math.abs(ar.y - langkah.y) < 5 : null, overflow: (${OVERFLOW_JS}) }; })()`));
}
if (WIDTH === 940) {
  await setMetrics(940);
  await nav("#/");
  await safe("G80-lebar940", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w?.getBoundingClientRect(); return { wrapW: r ? Math.round(r.width) : null, marginKiri: r ? Math.round(r.left) : null, overflow: (${OVERFLOW_JS}) }; })()`));
}
if (WIDTH === 1040) {
  await setMetrics(1040);
  await nav("#/game/mobile-legends");
  await safe("G81-lebar1040-nom", () => evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cs = g ? getComputedStyle(g) : null; const karts = [...document.querySelectorAll('.nom')].map((n) => Math.round(n.getBoundingClientRect().width)); return { kolom: cs ? cs.gridTemplateColumns.split(' ').length : null, lebarKartu: karts, semuaSama: new Set(karts).size === 1 }; })()`));
}
if (WIDTH === 1300) {
  await setMetrics(1300);
  await nav("#/");
  await safe("G82-lebar1300", () => evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w?.getBoundingClientRect(); return { wrapW: r ? Math.round(r.width) : null, marginKiri: r ? Math.round(r.left) : null, marginKanan: r ? Math.round(window.innerWidth - r.right) : null, overflow: (${OVERFLOW_JS}) }; })()`));
}
if (MODE === "zoom60" && WIDTH === 1280) {
  await setMetrics(1280);
  await nav("#/");
  await evalJs(`document.documentElement.style.zoom = '60%'; 'ok'`);
  await sleep(600);
  await safe("G83-zoom60", () => evalJs(`(() => { const g = document.querySelector('.grid.c4'); const cs = g ? getComputedStyle(g) : null; const harga = [...document.querySelectorAll('.p-from')].slice(0, 6).map((e) => ({ teks: e.textContent, terpotong: e.scrollWidth > e.clientWidth + 1, w: Math.round(e.getBoundingClientRect().width) })); return { innerWidth: window.innerWidth, kolomGame: cs ? cs.gridTemplateColumns.split(' ').length : null, harga, overflow: (${OVERFLOW_JS}) }; })()`));
}
if (MODE === "zoom140" && WIDTH === 390) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  await nav("#/game/mobile-legends");
  await evalJs(`document.documentElement.style.zoom = '140%'; 'ok'`);
  await sleep(600);
  await safe("G84-zoom140", () => evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cs = g ? getComputedStyle(g) : null; const harga = [...document.querySelectorAll('.nom .n-price')].slice(0, 6).map((e) => ({ teks: e.textContent.trim().slice(0, 20), terpotong: e.scrollWidth > e.clientWidth + 1 })); return { innerWidth: window.innerWidth, kolomNom: cs ? cs.gridTemplateColumns.split(' ').length : null, harga, overflow: (${OVERFLOW_JS}) }; })()`));
}

writeFileSync(outDir + "/cdp-s461.json", JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).length, "ukuran");
process.exit(0);
