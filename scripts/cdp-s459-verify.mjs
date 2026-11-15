// Verifikasi terisolasi s459 (lebar 390): cek yang terkontaminasi agent duplikat di run
// 390 standar (A3, F66, F73, F76, H92, I99) + verifikasi pasca-perbaikan
// (A9, A10, F72, I96). Berjalan di snapshot dist-s459-fixed, profil Chrome segar.
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
const reload = async () => { await send("Page.reload", { ignoreCache: true }); await sleep(2500); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, modifiers = 0) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
const pressKey = async (key, code, vk, modifiers = 0) => { await keyEvent("keyDown", key, code, vk, modifiers); await keyEvent("keyUp", key, code, vk, modifiers); await sleep(150); };
const mouseMoveTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }); await sleep(150); };
const mousePressAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }); await sleep(80); };
const mouseReleaseAt = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }); await sleep(150); };
const CONTRAST_JS = `(() => {
  window.__lum = (rgb) => { const m = rgb.match(/\\d+(\\.\\d+)?/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  window.__ratio = (fg, bg) => { const l1 = window.__lum(fg), l2 = window.__lum(bg); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
  window.__bgEff = (el) => { let n = el; while (n) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; n = n.parentElement; } return 'rgb(255, 255, 255)'; };
  window.__cx = (el) => { if (!el) return null; const cs = getComputedStyle(el); const fg = cs.color; const bgOwn = cs.backgroundColor; const bg = (bgOwn && bgOwn !== 'rgba(0, 0, 0, 0)' && bgOwn !== 'transparent') ? bgOwn : window.__bgEff(el); return { fg, bg, ratio: window.__ratio(fg, bg), fontSize: cs.fontSize, fontWeight: cs.fontWeight }; };
  return 'ok';
})()`;

if (WIDTH === 390) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);
  await evalJs(CONTRAST_JS);

  // ---------- A3 ulang: hover kartu e-wallet (scroll ke kartu dulu) ----------
  await safe("A3-hover-ewallet-v2", async () => {
    const pos = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); if (!a) return null; a.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-KARTU-GOPAY";
    await sleep(300);
    const before = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); return getComputedStyle(a).borderColor; })()`);
    await mouseMoveTo(pos.x, pos.y);
    const after = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('GoPay')); const cs = getComputedStyle(a); return { borderColor: cs.borderColor, transform: cs.transform }; })()`);
    return { posisi: pos, borderSebelum: before, borderSesudahHover: after };
  });

  // ---------- A9 verifikasi pasca-perbaikan: press kartu game ----------
  await nav("#/");
  await safe("A9-press-kartu-game-v2", async () => {
    const pos = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('Mobile Legends')); if (!a) return null; a.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-KARTU";
    await sleep(300);
    await mousePressAt(pos.x, pos.y);
    const t = await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.textContent.includes('Mobile Legends')); return { transform: getComputedStyle(a).transform, borderColor: getComputedStyle(a).borderColor }; })()`);
    await mouseReleaseAt(pos.x, pos.y);
    return { saatDitekan: t };
  });

  // ---------- A10 verifikasi pasca-perbaikan: press baris riwayat ----------
  await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-S459V' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1, 2].map(mk))); return 'seeded'; })()`);
  await nav("#/cek");
  await safe("A10-press-baris-riwayat-v2", async () => {
    const pos = await evalJs(`(() => { const b = document.querySelector('button.sum-row'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`);
    if (!pos) return "TIDAK-ADA-BARIS";
    await sleep(300);
    const baca = () => evalJs(`(() => { const b = document.querySelector('button.sum-row'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, transform: cs.transform }; })()`);
    const normal = await baca();
    await mouseMoveTo(pos.x, pos.y);
    const hover = await baca();
    await mousePressAt(pos.x, pos.y);
    const ditekan = await baca();
    await mouseReleaseAt(pos.x, pos.y);
    return { normal, hover, saatDitekan: ditekan };
  });

  // ---------- F66 ulang: kontras tombol Salin (order seed + email) ----------
  await evalJs(`(() => { const o = { ref: 'RSD-S459F66', kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Selesai', email: 'nama@email.com', wa: '', token: null }; localStorage.setItem('rosdi_orders', JSON.stringify([o])); return 'seeded'; })()`);
  await nav("#/sukses/RSD-S459F66");
  await safe("F66-salin-light-v2", () => evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return null; return window.__cx(b); })()`));
  await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ganti tema').click(); return 'ok'; })()`);
  await sleep(500);
  await safe("F66-salin-dark-v2", () => evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return null; return window.__cx(b); })()`));
  await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ganti tema').click(); return 'ok'; })()`);
  await sleep(400);

  // ---------- F72 verifikasi pasca-perbaikan: Enter di Riot ID ----------
  await nav("#/game/valorant");
  await safe("F72-enter-riot-v2", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#riot'); setV(el, 'Nama#TAG12'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.id || document.activeElement?.tagName, fokusKeNominal: document.activeElement?.classList?.contains('nom') }))()`);
  });

  // ---------- F73 ulang: Space di baris metode ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await safe("F73-space-pay-v2", async () => {
    const ada = await evalJs(`(() => { const p = document.querySelector('.pay'); if (!p) return 'TIDAK-ADA-PAY'; p.focus(); return 'fokus:' + (document.activeElement === p); })()`);
    if (ada !== 'fokus:true') return ada;
    await sleep(200);
    await pressKey(" ", "Space", 32);
    await sleep(300);
    return evalJs(`(() => ({ metodeTerpilih: document.querySelector('.pay.on .p-name2')?.textContent.trim() || null }))()`);
  });

  // ---------- F76 ulang: Pakai focus-visible (promo terisi dulu) ----------
  await safe("F76-pakai-focus-visible-v2", async () => {
    const kosong = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Pakai'); return { pakaiDisabledSaatKosong: b ? b.disabled : null }; })()`);
    await evalJs(`(() => { const setV = ${setVal}; const input = document.querySelector('input[aria-label="Kode promo"]'); setV(input, 'ROSDI10'); input.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Tab", "Tab", 9);
    await sleep(200);
    const aktif = await evalJs(`(() => { const el = document.activeElement; if (!el) return null; const cs = getComputedStyle(el); return { teks: el.textContent.trim(), tag: el.tagName, focusVisible: el.matches(':focus-visible'), outline: cs.outline, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor }; })()`);
    return { ...kosong, sesudahTab: aktif };
  });

  // ---------- H92 ulang (terisolasi): hapus semua + refresh ----------
  await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-S459' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify(['A', 'B', 'C'].map(mk))); return 'seeded'; })()`);
  await nav("#/cek");
  await safe("H92-hapus-semua-refresh-v2", async () => {
    const sebelum = await evalJs(`(() => ({ baris: document.querySelectorAll('button.sum-row').length, adaJudulRiwayat: !!([...document.querySelectorAll('h2')].find((h) => /Transaksi terakhir/.test(h.textContent))) }))()`);
    await evalJs(`localStorage.removeItem('rosdi_orders'); 'ok'`);
    await reload();
    await nav("#/cek");
    const sesudah = await evalJs(`(() => ({ baris: document.querySelectorAll('button.sum-row').length, adaJudulRiwayat: !!([...document.querySelectorAll('h2')].find((h) => /Transaksi terakhir/.test(h.textContent))), adaTeksKosong: !!document.querySelector('main#konten').textContent.includes('belum ada') || !!document.querySelector('.empty') }))()`);
    return { sebelum, sesudah };
  });

  // ---------- I96 verifikasi pasca-perbaikan: label timeline Cek ----------
  await evalJs(`(() => { const o = { ref: 'RSD-S459I96', kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '', token: null }; localStorage.setItem('rosdi_orders', JSON.stringify([o])); return 'seeded'; })()`);
  await nav("#/cek/RSD-S459I96");
  await safe("I96-timeline-cek-v2", () => evalJs(`(() => { const items = [...document.querySelectorAll('.timeline li')].map((li) => li.textContent.trim()); return { itemTimeline: items }; })()`));

  // ---------- I99 ulang (terisolasi): judul langkah E-Wallet ----------
  await nav("#/emoney/dana");
  await safe("I99-judul-langkah2-emoney-v2", () => evalJs(`(() => { const heads = [...document.querySelectorAll('.step-head h2')].map((h) => h.textContent.trim()); return { judulLangkah: heads }; })()`));
}

writeFileSync(outDir + "/cdp-s459-verify-" + WIDTH + ".json", JSON.stringify(R, null, 1));
console.log("SELESAI-VERIFY-" + WIDTH);
