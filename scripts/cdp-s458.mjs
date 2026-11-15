// Probe CDP s458 (lebar 390): animasi A1-10, validasi C live, harga D UI, a11y F71-76 + kontras tombol dark,
// deep link H85-90, jaringan H91-92, mikrokopi I99, zoom 500% (G84).
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
const navFull = async (url) => { await evalJs(`location.assign(${JSON.stringify(url)}); 'ok'`); await sleep(2200); };
const setVal = `(el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }`;
const clickText = `(sel, txt) => { const els = [...document.querySelectorAll(sel)]; const el = els.find((e) => e.textContent.trim().startsWith(txt)); if (!el) return 'TIDAK-ADA:' + txt; el.click(); return 'klik:' + txt; }`;
// clickText gagal untuk .pay: textContent diawali mark ("QR"+"QRIS") — cocokkan lewat .p-name2.
const clickPay = async (name) => evalJs(`(() => { const el = [...document.querySelectorAll('.pay')].find((p) => p.querySelector('.p-name2')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'TIDAK-ADA:' + ${JSON.stringify(name)}; el.click(); return 'klik:' + ${JSON.stringify(name)}; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const keyEvent = async (type, key, code, vk, modifiers = 0) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
const pressKey = async (key, code, vk, modifiers = 0) => { await keyEvent("keyDown", key, code, vk, modifiers); await keyEvent("keyUp", key, code, vk, modifiers); await sleep(150); };
const tapAt = async (x, y) => {
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(300);
};
const rectOf = async (js) => evalJs(`(() => { const el = ${js}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);

if (WIDTH === 390) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await setMetrics(390);
  await nav("#/");
  await evalJs(`localStorage.clear(); 'ok'`);
  // Seed 7 order riwayat untuk Cek.
  await nav("#/cek");
  await evalJs(`(() => { const mk = (n) => ({ ref: 'RSD-TEST000' + n, kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - n * 86400000, status: 'Diproses', email: '', wa: '', token: null }); localStorage.setItem('rosdi_orders', JSON.stringify([1,2,3,4,5,6,7].map(mk))); return 'seeded'; })()`);

  // ---------- A1: transisi rute Beranda -> Produk Game ----------
  await nav("#/");
  await evalJs(`window.__main = document.querySelector('main#konten'); 'ok'`);
  await safe("A1-transisi-rute", () => evalJs(`(async () => {
    const card = [...document.querySelectorAll('a.card')].find((a) => a.textContent.includes('Mobile Legends'));
    card.click();
    await new Promise((r) => setTimeout(r, 120));
    const main = document.querySelector('main#konten');
    const anims = main.getAnimations().map((a) => ({ name: a.animationName, state: a.playState, t: Math.round(a.currentTime || 0) }));
    return { hashSesudah: location.hash, h1: document.querySelector('h1')?.textContent,
      mainNodeSama: main === window.__main, animName: getComputedStyle(main).animationName,
      animasiSaatNavigasi: anims, opacityMain: getComputedStyle(main).opacity };
  })()`));

  // ---------- A2: badge Terlaris berpindah ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '172 Diamonds')`);
  await sleep(300);
  await safe("A2-badge-pindah", () => evalJs(`(async () => {
    const badgeOf = () => document.querySelector('.nom.on .badge');
    const first = badgeOf();
    const anim1 = first ? first.getAnimations().map((a) => ({ name: a.animationName, state: a.playState })) : null;
    (${clickText})('.nom', '706 Diamonds');
    await new Promise((r) => setTimeout(r, 120));
    const second = badgeOf();
    const anim2 = second ? second.getAnimations().map((a) => ({ name: a.animationName, state: a.playState, t: Math.round(a.currentTime) })) : null;
    return { badgePertama: first?.textContent, animPertama: anim1, badgeKedua: second?.textContent, animKedua: anim2, elemenBadgeBerbeda: first !== second };
  })()`));

  // ---------- A3: stagger kartu Flash Sale ----------
  await nav("#/");
  await safe("A3-flash-stagger", () => evalJs(`(() => {
    const cards = [...document.querySelectorAll('#katalog .card')];
    return cards.map((c) => ({ nama: c.querySelector('.p-name, div div')?.textContent?.slice(0, 30) || c.textContent.trim().slice(0, 24), animName: getComputedStyle(c).animationName, animasiBerjalan: c.getAnimations().map((a) => a.animationName), delay: getComputedStyle(c).animationDelay }));
  })()`));

  // ---------- A4 + A9: timeline stagger + kartu hasil Cek ----------
  await nav("#/cek");
  await safe("A4-timeline-stagger", () => evalJs(`(async () => {
    const setV = ${setVal}; setV(document.querySelector('input[aria-label="Nomor transaksi"]'), 'RSD-DEMO1234');
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek').click();
    await new Promise((r) => setTimeout(r, 600));
    const items = [...document.querySelectorAll('.timeline li')].map((li) => ({ animName: getComputedStyle(li).animationName, delay: getComputedStyle(li).animationDelay, animasi: li.getAnimations().map((a) => a.animationName) }));
    const res = document.querySelector('.cek-result');
    return { itemTimeline: items, kartuHasilAnim: res ? getComputedStyle(res).animationName : 'TIDAK-ADA', kartuHasilFokus: document.activeElement === res };
  })()`));

  // ---------- A5: sticky hover kartu nominal (sentuh) ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  const posA5 = await evalJs(`(() => {
    const noms = [...document.querySelectorAll('.nom')];
    const r1 = noms[0].getBoundingClientRect(); const r2 = noms[1].getBoundingClientRect();
    return { n: noms.length, r1: { x: r1.x + r1.width / 2, y: r1.y + r1.height / 2 }, r2: { x: r2.x + r2.width / 2, y: r2.y + r2.height / 2 } };
  })()`);
  await tapAt(posA5.r1.x, posA5.r1.y);
  await tapAt(posA5.r2.x, posA5.r2.y);
  await sleep(300);
  await safe("A5-sticky-hover", () => evalJs(`(() => {
    const noms = [...document.querySelectorAll('.nom')];
    const cs = getComputedStyle(noms[0]);
    return { kartuPertamaTerpilih: noms[0].classList.contains('on'), borderColor: cs.borderColor, borderWidth: cs.borderWidth, warnaBiru: 'rgb(37, 99, 235)', warnaLine: 'rgb(226, 232, 240)' };
  })()`));

  // ---------- A6: active state tombol Beli Sekarang ----------
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await clickPay("QRIS");
  await sleep(300);
  await safe("A6-beli-active", async () => {
    const r = await rectOf(`document.querySelector('.summary .btn.big')`);
    if (!r) return "TIDAK-ADA-TOMBOL";
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x + r.w / 2, y: r.y + r.h / 2, button: "left", clickCount: 1 });
    await sleep(80);
    const t = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { transform: getComputedStyle(b).transform, disabled: b.disabled }; })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x + r.w / 2, y: r.y + r.h / 2, button: "left", clickCount: 1 });
    return t;
  });

  // ---------- A7: modal S&K entrance ----------
  await nav("#/");
  await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
  await sleep(400);
  await evalJs(`(${clickText})('.flink', 'Syarat & Ketentuan')`);
  await sleep(400);
  await safe("A7-modal-sk", () => evalJs(`(() => {
    const m = document.querySelector('.modal'); const v = document.querySelector('.modal-veil');
    return { modalAda: !!m, modalAnim: m ? getComputedStyle(m).animationName : null, modalAnimasiBerjalan: m ? m.getAnimations().map((a) => a.animationName) : [], veilAnim: v ? getComputedStyle(v).animationName : null };
  })()`));
  await pressKey("Escape", "Escape", 27);

  // ---------- A8: modal Masuk entrance ----------
  await evalJs(`(${clickText})('.btn', 'Masuk')`);
  await sleep(400);
  await safe("A8-modal-masuk", () => evalJs(`(() => {
    const m = document.querySelector('.modal'); const v = document.querySelector('.modal-veil');
    return { modalAda: !!m, judul: m?.querySelector('h3')?.textContent, modalAnim: m ? getComputedStyle(m).animationName : null, modalAnimasiBerjalan: m ? m.getAnimations().map((a) => a.animationName) : [], veilAnim: v ? getComputedStyle(v).animationName : null };
  })()`));
  await pressKey("Escape", "Escape", 27);

  // ---------- A10: pesan sukses promo ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '3 Diamonds')`);
  await safe("A10-promo-sukses", () => evalJs(`(async () => {
    const setV = ${setVal}; const input = document.querySelector('input[aria-label="Kode promo"]'); setV(input, 'ROSDI10');
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pakai').click();
    await new Promise((r) => setTimeout(r, 300));
    const n = document.querySelector('.note.good');
    return { teks: n?.textContent.trim(), animName: n ? getComputedStyle(n).animationName : null, animasi: n ? n.getAnimations().map((a) => a.animationName) : [] };
  })()`));

  // ---------- C live spot-check ----------
  await safe("C26-uid17", () => evalJs(`(async () => {
    const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678901234567');
    await new Promise((r) => setTimeout(r, 200));
    const err = document.querySelector('#uid-err');
    return { kelasInput: document.querySelector('#uid').className, errorTampil: !!err, errorTeks: err?.textContent.trim() || null };
  })()`));
  await safe("C28-zone15", () => evalJs(`(async () => {
    const setV = ${setVal}; setV(document.querySelector('#zone'), '123456789012345');
    await new Promise((r) => setTimeout(r, 200));
    const err = document.querySelector('#zone-err');
    return { kelasInput: document.querySelector('#zone').className, errorTampil: !!err, errorTeks: err?.textContent.trim() || null };
  })()`));
  await safe("C31-wa18", () => evalJs(`(async () => {
    const setV = ${setVal}; setV(document.querySelector('#wa'), '08' + '1'.repeat(16));
    await new Promise((r) => setTimeout(r, 200));
    const notes = [...document.querySelectorAll('.note')].filter((n) => /WhatsApp/.test(n.textContent));
    return { peringatanTampil: notes.length > 0, teks: notes.map((n) => n.textContent.trim().slice(0, 80)) };
  })()`));
  await safe("C37-email65", () => evalJs(`(async () => {
    const setV = ${setVal}; setV(document.querySelector('#email'), 'a'.repeat(65) + '@mail.com');
    await new Promise((r) => setTimeout(r, 200));
    const notes = [...document.querySelectorAll('.note')].filter((n) => /email/i.test(n.textContent));
    return { peringatanTampil: notes.length > 0, teks: notes.map((n) => n.textContent.trim().slice(0, 80)) };
  })()`));
  await safe("C39-diskon10", () => evalJs(`(async () => {
    const setV = ${setVal}; const input = document.querySelector('input[aria-label="Kode promo"]'); setV(input, 'DISKON10');
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pakai').click();
    await new Promise((r) => setTimeout(r, 300));
    const n = document.querySelector('.note.bad');
    return { errorTampil: !!n, teks: n?.textContent.trim() || null };
  })()`));
  await nav("#/cek");
  await safe("C38-order-slash", () => evalJs(`(async () => {
    const setV = ${setVal}; setV(document.querySelector('input[aria-label="Nomor transaksi"]'), 'RSD/DEMO1234');
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cek').click();
    await new Promise((r) => setTimeout(r, 400));
    const n = document.querySelector('.note.bad');
    return { hash: location.hash, pesanTampil: !!n, teks: n?.textContent.trim().slice(0, 90) || null, hasilAda: !!document.querySelector('.cek-result') };
  })()`));

  // ---------- D UI spot-check ----------
  const applyPromo = async (code) => evalJs(`(async () => {
    const setV = ${setVal}; setV(document.querySelector('input[aria-label="Kode promo"]'), ${JSON.stringify(code)});
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pakai').click();
    await new Promise((r) => setTimeout(r, 300));
    return document.querySelector('.note.good')?.textContent.trim() || null;
  })()`);
  const totalAside = () => evalJs(`document.querySelector('.sum-total b')?.textContent.trim()`);
  const totalBar = () => evalJs(`document.querySelector('.mobile-bar b')?.textContent.trim()`);

  await nav("#/game/pubg-mobile");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '60 UC')`);
  await applyPromo("ROSDI10");
  await clickPay("BCA Virtual Account");
  await sleep(200);
  await safe("D41-ui", async () => ({ aside: await totalAside(), bar: await totalBar(), want: "Rp15.550" }));

  await nav("#/pulsa/telkomsel");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '081234567890'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', 'Pulsa 5.000')`);
  await applyPromo("ROSDI10");
  await clickPay("QRIS");
  await sleep(200);
  await safe("D45-ui", async () => ({ aside: await totalAside(), bar: await totalBar(), want: "Rp5.850" }));

  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '2195 Diamonds')`);
  await applyPromo("ROSDI10");
  await clickPay("BCA Virtual Account");
  await sleep(200);
  await safe("D49-ui", async () => ({ aside: await totalAside(), bar: await totalBar(), want: "Rp540.500" }));

  await nav("#/pln");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#idpel'), '543210987654'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.btn', 'Cek Nama')`);
  await sleep(300);
  await evalJs(`(${clickText})('.nom', 'Token 1.000.000')`);
  await applyPromo("ROSDI10");
  await clickPay("BCA Virtual Account");
  await sleep(200);
  await safe("D51-ui", async () => ({ aside: await totalAside(), bar: await totalBar(), want: "Rp995.000" }));

  await nav("#/data/byu");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#hp'), '085112345678'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', 'Kuota by.U 2GB')`);
  await applyPromo("ROSDI10");
  await clickPay("QRIS");
  await sleep(200);
  await safe("D52-ui", async () => ({ aside: await totalAside(), bar: await totalBar(), want: "Rp8.100" }));

  // ---------- I99: qty 2 di ringkasan + mobile-bar ----------
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { const setV = ${setVal}; setV(document.querySelector('#uid'), '12345678'); setV(document.querySelector('#zone'), '1234'); return 'ok'; })()`);
  await evalJs(`(${clickText})('.nom', '172 Diamonds')`);
  await evalJs(`(() => { [...document.querySelectorAll('.qty button')].find((b) => b.getAttribute('aria-label') === 'Tambah').click(); return 'ok'; })()`);
  await sleep(300);
  await safe("I99-qty2", () => evalJs(`(() => {
    const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.trim());
    const mb = document.querySelector('.mobile-bar .mb-total span')?.textContent.trim();
    const mbTotal = document.querySelector('.mobile-bar b')?.textContent.trim();
    return { barisItemAside: rows.find((t) => t.startsWith('Item')), hargaAside: rows.find((t) => t.startsWith('Harga')), mobileBarNama: mb, mobileBarTotal: mbTotal };
  })()`));

  // ---------- F71-76: keyboard ----------
  await nav("#/pulsa/telkomsel");
  await safe("F71-enter-hp", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#hp'); setV(el, '081234567890'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.id || document.activeElement?.tagName, nominalTerpilih: !!document.querySelector('.nom.on'), hash: location.hash }))()`);
  });
  await nav("#/pln");
  await safe("F72-enter-pln", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#idpel'); setV(el, '543210987654'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.id || document.activeElement?.tagName, cekNamaTerpicu: !!document.querySelector('.note.good'), tombolCekNama: [...document.querySelectorAll('button')].find((b) => /Cek/.test(b.textContent))?.textContent.trim() }))()`);
  });
  await nav("#/game/mobile-legends");
  await safe("F73-enter-wa", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('#wa'); setV(el, '081234567890'); el.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey("Enter", "Enter", 13);
    return evalJs(`(() => ({ fokusSesudah: document.activeElement?.id || document.activeElement?.tagName, fokusPindahKePromo: document.activeElement?.getAttribute('aria-label') === 'Kode promo' }))()`);
  });
  await nav("#/");
  await safe("F74-enter-search", async () => {
    await evalJs(`(() => { const setV = ${setVal}; const el = document.querySelector('.searchbar input'); setV(el, 'mlbb'); el.focus(); return 'ok'; })()`);
    await sleep(300);
    const before = await evalJs(`document.querySelectorAll('a.card').length`);
    await pressKey("Enter", "Enter", 13);
    return evalJs(`(() => ({ kartuSesudahKetik: ${before}, fokusSesudah: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName, hash: location.hash }))()`);
  });
  await safe("F75-space-kartu", async () => {
    await evalJs(`(() => { const el = [...document.querySelectorAll('a.card')].find((a) => a.textContent.includes('Mobile Legends')); el.focus(); window.scrollTo(0, 0); return 'ok'; })()`);
    await sleep(200);
    const y0 = await evalJs(`Math.round(window.scrollY)`);
    await pressKey(" ", "Space", 32);
    const y1 = await evalJs(`Math.round(window.scrollY)`);
    const hash0 = await evalJs(`location.hash`);
    await pressKey("Enter", "Enter", 13);
    await sleep(400);
    const hash1 = await evalJs(`location.hash`);
    return { scrollSebelumSpace: y0, scrollSesudahSpace: y1, hashSesudahSpace: hash0, hashSesudahEnter: hash1 };
  });
  await nav("#/");
  await safe("F76-space-chip", async () => {
    await evalJs(`(() => { const chip = [...document.querySelectorAll('.chip')].find((c) => c.textContent.trim() === 'Pulsa'); chip.focus(); return 'ok'; })()`);
    await sleep(200);
    await pressKey(" ", "Space", 32);
    await sleep(200);
    return evalJs(`(() => { const chip = [...document.querySelectorAll('.chip')].find((c) => c.textContent.trim() === 'Pulsa'); return { terpilih: chip.classList.contains('on'), ariaPressed: chip.getAttribute('aria-pressed') }; })()`);
  });

  // ---------- F68-70: kontras tombol di Light + Dark (computed style live) ----------
  await nav("#/");
  await safe("F-btn-light", () => evalJs(`(() => { const b = document.querySelector('.btn'); const cs = getComputedStyle(b); return { bg: cs.backgroundColor, color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight }; })()`));
  await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ganti tema').click(); return 'ok'; })()`);
  await sleep(500);
  await safe("F-btn-dark", () => evalJs(`(() => { const b = document.querySelector('.btn'); const cs = getComputedStyle(b); const root = getComputedStyle(document.documentElement); return { theme: document.documentElement.dataset.theme, bg: cs.backgroundColor, color: cs.color, tokenBlue: root.getPropertyValue('--blue').trim(), tokenBlueStrong: root.getPropertyValue('--blue-strong').trim() }; })()`));
  // tombol Tutup S&K + Lacak/Cek di Dark
  await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
  await sleep(300);
  await evalJs(`(${clickText})('.flink', 'Syarat & Ketentuan')`);
  await sleep(300);
  await safe("F68-tutup-dark", () => evalJs(`(() => { const b = [...document.querySelectorAll('.modal .btn')].find((x) => x.textContent.trim() === 'Tutup'); const cs = b ? getComputedStyle(b) : null; return { ada: !!b, bg: cs?.backgroundColor, color: cs?.color }; })()`));
  await pressKey("Escape", "Escape", 27);
  await nav("#/cek");
  await safe("F69-cek-dark", () => evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cek'); const cs = b ? getComputedStyle(b) : null; const adaLacak = [...document.querySelectorAll('button')].some((x) => x.textContent.trim() === 'Lacak'); return { adaTombolCek: !!b, adaTombolLacak: adaLacak, bg: cs?.backgroundColor, color: cs?.color }; })()`));
  // kembali ke Light
  await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ganti tema').click(); return 'ok'; })()`);
  await sleep(400);

  // ---------- H85-90: deep link (query SEBELUM hash + query DI DALAM hash) ----------
  await safe("H85-qty11", async () => {
    await navFull(baseUrl + "?qty=11#/game/mobile-legends");
    const a = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, qtyTampil: document.querySelector('.qty b')?.textContent || null }))()`);
    await navFull(baseUrl + "#/game/mobile-legends?qty=11");
    const b = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent }))()`);
    return { querySebelumHash: a, queryDalamHash: b };
  });
  await safe("H86-metode-danamon", async () => {
    await navFull(baseUrl + "?metode=danamon#/game/mobile-legends");
    const a = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, metodeTerpilih: document.querySelector('.pay.on')?.textContent.trim().slice(0, 30) || null, danamonDisabled: [...document.querySelectorAll('.pay')].find((p) => /Danamon/.test(p.textContent))?.disabled }))()`);
    await navFull(baseUrl + "#/game/mobile-legends?metode=danamon");
    const b = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent }))()`);
    return { querySebelumHash: a, queryDalamHash: b };
  });
  await safe("H87-metode-xyz", async () => {
    await navFull(baseUrl + "?metode=xyz#/game/mobile-legends");
    return evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, metodeTerpilih: document.querySelector('.pay.on')?.textContent.trim().slice(0, 30) || null, halamanRusak: !document.querySelector('h1') }))()`);
  });
  await safe("H88-promo-unknown", async () => {
    await navFull(baseUrl + "?promo=ROSDI99#/game/mobile-legends");
    return evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, promoAktif: !!document.querySelector('.sum-row.disc'), pesanPromo: document.querySelector('.note.good, .note.bad')?.textContent.trim() || null }))()`);
  });
  await safe("H89-email-invalid", async () => {
    await navFull(baseUrl + "?email=tanpa-at#/game/mobile-legends");
    return evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, emailTerisi: document.querySelector('#email')?.value || '' }))()`);
  });
  await safe("H90-wa-invalid", async () => {
    await navFull(baseUrl + "?wa=abc#/game/mobile-legends");
    return evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, waTerisi: document.querySelector('#wa')?.value || '' }))()`);
  });

  // ---------- H91-92: request jaringan ----------
  await safe("H91-net-game", async () => {
    await nav("#/game/mobile-legends");
    return evalJs(`(() => {
      const res = performance.getEntriesByType('resource').map((e) => e.name);
      const dups = res.filter((u, i) => res.indexOf(u) !== i);
      return { jumlah: res.length, duplikat: [...new Set(dups)], daftar: res.map((u) => u.replace(/^https?:\\/\\/[^/]+/, '')) };
    })()`);
  });
  await safe("H92-net-cek", async () => {
    await nav("#/cek");
    return evalJs(`(() => {
      const res = performance.getEntriesByType('resource').map((e) => e.name);
      const dups = res.filter((u, i) => res.indexOf(u) !== i);
      return { jumlah: res.length, duplikat: [...new Set(dups)], daftar: res.map((u) => u.replace(/^https?:\\/\\/[^/]+/, '')) };
    })()`);
  });

  // ---------- G84: zoom 500% header ----------
  await safe("G84-zoom500", async () => {
    await nav("#/");
    await evalJs(`document.documentElement.style.zoom = '500%'; 'ok'`);
    await sleep(500);
    return evalJs(`(() => {
      const kids = [...document.querySelectorAll('.header-in > *')].map((el) => { const r = el.getBoundingClientRect(); return { cls: el.className, x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right) }; });
      const logo = document.querySelector('.logo').getBoundingClientRect();
      const tema = document.querySelector('.icon-btn').getBoundingClientRect();
      const masuk = [...document.querySelectorAll('.btn')].find((b) => b.textContent.trim() === 'Masuk').getBoundingClientRect();
      const overlap = (a, b) => !(a.right <= b.left || b.right <= a.left);
      return { innerWidth: window.innerWidth, docScrollW: document.documentElement.scrollWidth, headerKids: kids,
        logoTemaOverlap: overlap(logo, tema), temaMasukOverlap: overlap(tema, masuk),
        masukRight: Math.round(masuk.right), masukTerpotong: masuk.right > window.innerWidth };
    })()`);
  });
}

writeFileSync(outDir + "/cdp-s458-390.json", JSON.stringify(R, null, 1));
console.log("SELESAI-CDP-390");
