// Verifikasi perbaikan s458 + re-probe A6/C39/F75/G82 (lebar 390, lalu 2048).
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
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, modifiers = 0) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
const pressKey = async (key, code, vk, modifiers = 0) => { await keyEvent("keyDown", key, code, vk, modifiers); await keyEvent("keyUp", key, code, vk, modifiers); await sleep(150); };
const rectOf = async (js) => evalJs(`(() => { const el = ${js}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);

if (WIDTH === 390) {
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); document.documentElement.style.zoom = ''; 'ok'`);

  // A3-fix: stagger kartu Flash Sale.
  await safe("V-A3-flash", () => evalJs(`(() => [...document.querySelectorAll('#katalog .card')].map((c) => ({ animName: getComputedStyle(c).animationName, delay: getComputedStyle(c).animationDelay, dur: getComputedStyle(c).animationDuration }))()`));

  // A7-fix: modal S&K entrance.
  await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
  await sleep(400);
  await evalJs(`(${clickText})('.flink', 'Syarat & Ketentuan')`);
  await sleep(150);
  await safe("V-A7-modal-sk", () => evalJs(`(() => { const m = document.querySelector('.modal'); return { animName: m ? getComputedStyle(m).animationName : null, animasi: m ? m.getAnimations().map((a) => ({ name: a.animationName, state: a.playState })) : [] }; })()`));
  await pressKey("Escape", "Escape", 27);
  await sleep(300);

  // A8-fix: modal Masuk entrance.
  await evalJs(`(${clickText})('.btn', 'Masuk')`);
  await sleep(150);
  await safe("V-A8-modal-masuk", () => evalJs(`(() => { const m = document.querySelector('.modal'); return { animName: m ? getComputedStyle(m).animationName : null, animasi: m ? m.getAnimations().map((a) => ({ name: a.animationName, state: a.playState })) : [] }; })()`));
  await pressKey("Escape", "Escape", 27);

  // A6 re-probe (proper): scroll tombol ke viewport dulu.
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await evalJs(`(() => { const el = [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === 'QRIS'); el.click(); return 'ok'; })()`);
  await sleep(300);
  await safe("V-A6-beli-active", async () => {
    await evalJs(`document.querySelector('.summary .btn.big').scrollIntoView({ block: 'center' }); 'ok'`);
    await sleep(400);
    const r = await rectOf(`document.querySelector('.summary .btn.big')`);
    if (!r) return "TIDAK-ADA-TOMBOL";
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x + r.w / 2, y: r.y + r.h / 2, button: "left", clickCount: 1 });
    await sleep(80);
    const t = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { transform: getComputedStyle(b).transform, disabled: b.disabled }; })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x + r.w / 2, y: r.y + r.h / 2, button: "left", clickCount: 1 });
    return t;
  });

  // C39 re-probe (proper): baca SEMUA .note.bad.
  await safe("V-C39-diskon10", () => evalJs(`(async () => {
    const setV = ${setVal}; const input = document.querySelector('input[aria-label="Kode promo"]'); setV(input, 'DISKON10');
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pakai').click();
    await new Promise((r) => setTimeout(r, 300));
    return [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim());
  })()`));

  // F71-fix: Enter di HP -> fokus kartu nominal pertama.
  await nav("#/pulsa/telkomsel");
  await safe("V-F71-enter-hp", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#hp'); setV(el, '081234567890'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.className || document.activeElement?.tagName, teksFokus: (document.activeElement?.textContent || '').trim().slice(0, 30) }))()`);
  });

  // F72-fix: Enter di PLN -> Cek Nama terpicu.
  await nav("#/pln");
  await safe("V-F72-enter-pln", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#idpel'); setV(el, '543210987654'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    await sleep(400);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.id || document.activeElement?.tagName, cekNamaTerpicu: !!document.querySelector('.note.good'), teksNote: document.querySelector('.note.good')?.textContent.trim().slice(0, 60) || null, tombol: [...document.querySelectorAll('button')].find((b) => /Cek/.test(b.textContent))?.textContent.trim() }))()`);
  });
  // F72: klik Cek Nama tetap jalan (regresi form) + D51 total tetap benar.
  await safe("V-F72-klik-dan-D51", async () => {
    await evalJs(`(${clickText})('.nom', 'Token 1.000.000')`);
    await evalJs(`(async () => { const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), 'ROSDI10'); [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pakai').click(); await new Promise((r) => setTimeout(r, 300)); return 'ok'; })()`);
    await evalJs(`(() => { const el = [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === 'BCA Virtual Account'); el.click(); return 'ok'; })()`);
    await sleep(200);
    return evalJs(`(() => ({ aside: document.querySelector('.sum-total b')?.textContent.trim(), want: 'Rp995.000' }))()`);
  });

  // F73-fix: Enter di WA -> fokus kolom Kode Promo.
  await nav("#/game/mobile-legends");
  await safe("V-F73-enter-wa", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#wa'); setV(el, '081234567890'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.getAttribute('aria-label') || document.activeElement?.id || document.activeElement?.tagName }))()`);
  });

  // I99-fix: mobile-bar menampilkan qty.
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '172 Diamonds')`);
  await evalJs(`(() => { [...document.querySelectorAll('.qty button')].find((b) => b.getAttribute('aria-label') === 'Tambah').click(); return 'ok'; })()`);
  await sleep(300);
  await safe("V-I99-qty2", () => evalJs(`(() => ({ aside: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.trim().startsWith('Item'))?.textContent.trim(), mobileBarNama: document.querySelector('.mobile-bar .mb-total span')?.textContent.trim(), mobileBarTotal: document.querySelector('.mobile-bar b')?.textContent.trim() }))()`));

  // E65-fix: catatan e-wallet tampil di halaman DANA.
  await nav("#/emoney/dana");
  await safe("V-E65-note", () => evalJs(`(() => {
    const notes = [...document.querySelectorAll('.note')].map((n) => n.textContent.trim());
    return { adaCatatanSaldoMasuk: notes.some((t) => t.startsWith('Saldo masuk ke nomor DANA')), catatan: notes };
  })()`));

  // F68-70-fix: tombol di Dark kini --blue-strong; hero tetap putih; logo-mark + plus ikut.
  await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ganti tema').click(); return 'ok'; })()`);
  await sleep(500);
  await safe("V-F-btn-dark", () => evalJs(`(() => {
    const cs = (el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color }; };
    const btn = document.querySelector('.btn');
    const heroBtn = document.querySelector('.hero .btn');
    const logo = document.querySelector('.logo-mark');
    return { theme: document.documentElement.dataset.theme, tombolBiasa: cs(btn), tombolHero: heroBtn ? cs(heroBtn) : null, logoMark: logo ? cs(logo) : null };
  })()`));
  // tombol Tutup S&K di Dark.
  await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
  await sleep(300);
  await evalJs(`(${clickText})('.flink', 'Syarat & Ketentuan')`);
  await sleep(200);
  await safe("V-F68-tutup-dark", () => evalJs(`(() => { const b = [...document.querySelectorAll('.modal .btn')].find((x) => x.textContent.trim() === 'Tutup'); const s = b ? getComputedStyle(b) : null; return { ada: !!b, bg: s?.backgroundColor, color: s?.color }; })()`));
  await pressKey("Escape", "Escape", 27);
  // tautan mismatch di Dark kini --blue-text.
  await nav("#/pulsa/telkomsel");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081546789012'); return 'ok'; })()`);
  await sleep(400);
  await safe("V-mismatch-dark", () => evalJs(`(() => { const a = document.querySelector('.note.bad a'); const s = a ? getComputedStyle(a) : null; return { ada: !!a, teks: a?.textContent.trim(), color: s?.color }; })()`));
  // kembali ke Light.
  await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ganti tema').click(); return 'ok'; })()`);
  await sleep(400);

  // F75 re-probe: Space dari tengah halaman.
  await nav("#/");
  await safe("V-F75-space", async () => {
    await evalJs(`(() => { window.scrollTo(0, 600); const el = [...document.querySelectorAll('a.card')].find((a) => a.textContent.includes('Mobile Legends')); el.focus(); return 'ok'; })()`);
    await sleep(300);
    const y0 = await evalJs(`Math.round(window.scrollY)`);
    await pressKey(" ", "Space", 32);
    const y1 = await evalJs(`Math.round(window.scrollY)`);
    const hash0 = await evalJs(`location.hash`);
    return { scrollSebelum: y0, scrollSesudah: y1, hashSesudahSpace: hash0 };
  });
}
if (WIDTH === 2048) {
  await setMetrics(2048, 1200, false);
  await nav("#/");
  await safe("V-G82-2048", () => evalJs(`(() => {
    const w = document.querySelector('main .wrap');
    const r = w.getBoundingClientRect();
    return { zoom: document.documentElement.style.zoom || '(none)', wrapW: Math.round(r.width), wrapLeft: Math.round(r.left), wrapRightDariKanan: Math.round(window.innerWidth - r.right), terpusat: Math.abs(r.left - (window.innerWidth - r.right)) <= 1, innerW: window.innerWidth };
  })()`));
}
writeFileSync(outDir + "/cdp-s458-verify-" + WIDTH + ".json", JSON.stringify(R, null, 1));
console.log("SELESAI-VERIFY-" + WIDTH);
process.exit(0);
