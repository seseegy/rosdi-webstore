// Tindak lanjut s460 (lebar 390, kecuali G84b di 320): F67b deskripsi trust yang
// benar, F69b Beli aktif, F70b tab aktif, F71b diagnosis Enter billid,
// A3b :active paksa, G82b grid nominal zoom 125%, G84b kartu game 320.
import { writeFileSync, mkdirSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = +wArg;
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
const CONTRAST_JS = `(() => {
  window.__lum = (rgb) => { const m = rgb.match(/\\d+(\\.\\d+)?/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  window.__ratio = (fg, bg) => { const l1 = window.__lum(fg), l2 = window.__lum(bg); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
  window.__bgEff = (el) => { let n = el; while (n) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; n = n.parentElement; } return 'rgb(255, 255, 255)'; };
  window.__cx = (el) => { if (!el) return null; const cs = getComputedStyle(el); const fg = cs.color; const bgOwn = cs.backgroundColor; const bg = (bgOwn && bgOwn !== 'rgba(0, 0, 0, 0)' && bgOwn !== 'transparent') ? bgOwn : window.__bgEff(el); return { teks: (el.textContent || '').trim().slice(0, 40), fg, bg, ratio: window.__ratio(fg, bg), fontSize: cs.fontSize }; };
  return 'ok';
})()`;

await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await setMetrics(WIDTH);
await nav("#/");
await evalJs(`localStorage.clear(); 'ok'`);
await evalJs(CONTRAST_JS);

// F67b: deskripsi trust — selektor benar: span di dalam div setelah <b>
await safe("F67b-trust-desc-light", () => evalJs(`(() => { const el = document.querySelector('.trust .card div span'); return window.__cx(el); })()`));
// F69b + F70b butuh halaman produk; siapkan MLBB (UID+zone+nominal+QRIS)
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
await sleep(500);
await evalJs(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); if (p) p.click(); return 'ok'; })()`);
await sleep(400);
await safe("F69b-mobilebar-beli-AKTIF-light", () => evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn'); return { disabled: b.disabled, ...window.__cx(b) }; })()`));
await safe("F70b-tab-aktif-mlbb-light", () => evalJs(`(() => { const t = document.querySelector('.tab.on'); if (!t) return 'TIDAK-ADA-TAB-DI-MLBB'; return window.__cx(t); })()`));
// dark
await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]')?.click(); return 'ok'; })()`);
await sleep(500);
await nav("#/");
await safe("F67b-trust-desc-dark", () => evalJs(`(() => { const el = document.querySelector('.trust .card div span'); return window.__cx(el); })()`));
await nav("#/game/mobile-legends");
await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
await sleep(500);
await evalJs(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); if (p) p.click(); return 'ok'; })()`);
await sleep(400);
await safe("F69b-mobilebar-beli-AKTIF-dark", () => evalJs(`(() => { const b = document.querySelector('.mobile-bar .btn'); return { disabled: b.disabled, ...window.__cx(b) }; })()`));
await safe("F70b-tab-aktif-mlbb-dark", () => evalJs(`(() => { const t = document.querySelector('.tab.on'); if (!t) return 'TIDAK-ADA-TAB-DI-MLBB'; return window.__cx(t); })()`));
await evalJs(`(() => { document.querySelector('button[aria-label="Ganti tema"]')?.click(); return 'ok'; })()`);
await sleep(400);

// F71b: diagnosis Enter di #billid — baca state dulu, Enter, baca lagi
await nav("#/tagihan/pln-pascabayar");
await safe("F71b-enter-billid-diagnosis", async () => {
  const sebelum = await evalJs(`(() => { const el = document.querySelector('#billid'); const btn = [...document.querySelectorAll('.btn')].find((x) => /Cek Tagihan|Cek Ulang/.test(x.textContent)); const form = el ? el.closest('form') : null; return { adaInput: !!el, adaForm: !!form, nilaiInput: el ? el.value : null, tombolDisabled: btn ? btn.disabled : null, tombolTeks: btn ? btn.textContent.trim() : null }; })()`);
  await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#billid'); setV(el, '543210987654'); el.focus(); return 'ok'; })()`);
  await sleep(400);
  const sesudahIsi = await evalJs(`(() => { const el = document.querySelector('#billid'); const btn = [...document.querySelectorAll('.btn')].find((x) => /Cek Tagihan|Cek Ulang/.test(x.textContent)); return { nilaiInput: el.value, tombolDisabled: btn.disabled, tombolTeks: btn.textContent.trim(), fokusDiInput: document.activeElement === el }; })()`);
  await pressKey("Enter", "Enter", 13);
  await sleep(500);
  const sesudahEnter = await evalJs(`(() => ({ rincianMuncul: !!document.querySelector('.note.good'), teksRincian: document.querySelector('.note.good')?.textContent?.slice(0, 60) || null, tombolTeks: [...document.querySelectorAll('.btn')].find((x) => /Cek Tagihan|Cek Ulang/.test(x.textContent))?.textContent.trim() }))()`);
  // kontrol: klik tombol langsung (apakah check() sendiri jalan?)
  await evalJs(`(() => { const btn = [...document.querySelectorAll('.btn')].find((x) => /Cek Tagihan|Cek Ulang/.test(x.textContent)); if (btn && !btn.disabled) btn.click(); return 'ok'; })()`);
  await sleep(500);
  const sesudahKlik = await evalJs(`(() => ({ rincianMuncul: !!document.querySelector('.note.good'), tombolTeks: [...document.querySelectorAll('.btn')].find((x) => /Cek Tagihan|Cek Ulang/.test(x.textContent))?.textContent.trim() }))()`);
  return { sebelum, sesudahIsi, sesudahEnter, sesudahKlik };
});

// A3b: paksa :active pada "Belanja Lagi" via CSS.forcePseudoState
await evalJs(`(() => { const o = { ref: 'RSD-S460A3B', kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Selesai', email: '', wa: '', token: null }; localStorage.setItem('rosdi_orders', JSON.stringify([o])); return 'seeded'; })()`);
await nav("#/sukses/RSD-S460A3B");
await safe("A3b-belanja-lagi-active-paksa", async () => {
  const r = await send("CSS.enable");
  const id = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Belanja Lagi'); if (!b) return null; if (!b.id) b.id = 'belanja-lagi-probe'; return b.id; })()`);
  if (!id) return "TIDAK-ADA";
  // cari nodeId lewat DOM domain
  await send("DOM.enable");
  const doc = await send("DOM.getDocument", { depth: -1 });
  const findNode = async (node, targetId) => {
    if (node.attributes) { for (let i = 0; i < node.attributes.length; i += 2) { if (node.attributes[i] === 'id' && node.attributes[i + 1] === targetId) return node.nodeId; } }
    if (node.children) { for (const c of node.children) { const f = await findNode(c, targetId); if (f) return f; } }
    if (node.contentDocument) { const f = await findNode(node.contentDocument, targetId); if (f) return f; }
    return null;
  };
  const nodeId = await findNode(doc.root, id);
  if (!nodeId) return "NODEID-TIDAK-KETEMU";
  await send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] });
  await sleep(200);
  const t = await evalJs(`(() => { const b = document.getElementById('belanja-lagi-probe'); return { transform: getComputedStyle(b).transform, active: b.matches(':active') }; })()`);
  await send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
  return { saatActiveDipaksa: t };
});

// G82b: grid nominal di zoom 125% (halaman produk)
await nav("#/game/mobile-legends");
await evalJs(`(() => { document.documentElement.style.zoom = '1.25'; return 'ok'; })()`);
await sleep(600);
await safe("G82b-grid-zoom125", async () => {
  const o = await evalJs(`(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth }))()`);
  const grid = await evalJs(`(() => { const g = document.querySelector('.nom-grid'); if (!g) return null; const cs = getComputedStyle(g); const noms = [...document.querySelectorAll('.nom')].slice(0, 4).map((n) => { const r = n.getBoundingClientRect(); return { x: +r.x.toFixed(0), w: +r.width.toFixed(0) }; }); return { kolom: cs.gridTemplateColumns.split(' ').length, templateColumns: cs.gridTemplateColumns, kartuPertama: noms }; })()`);
  return { ...o, grid };
});
await evalJs(`(() => { document.documentElement.style.zoom = ''; return 'ok'; })()`);
await sleep(400);

// G84b: kartu GAME di 320 (bukan flash) — truncation nama/sub semua game
if (WIDTH === 320) {
  await setMetrics(320);
  await nav("#/");
  await sleep(600);
  await safe("G84b-kartu-game-320", () => evalJs(`(() => {
    const cards = [...document.querySelectorAll('.grid.c4 a.card')].map((c) => {
      const nama = c.querySelector('.p-name'); const sub = c.querySelector('.p-sub');
      const trunc = (el) => el ? { sw: el.scrollWidth, cw: el.clientWidth, terpotong: el.scrollWidth > el.clientWidth + 0.5, teks: el.textContent } : null;
      return { nama: trunc(nama), sub: trunc(sub) };
    });
    return { jumlahKartuGame: cards.length, gridKolom: getComputedStyle(document.querySelector('.grid.c4')).gridTemplateColumns, cards };
  })()`));
}

writeFileSync(outDir + "/cdp-s460b-" + WIDTH + ".json", JSON.stringify(R, null, 1));
console.log("SELESAI-CDPB-" + WIDTH);
ws.close();
process.exit(0);
