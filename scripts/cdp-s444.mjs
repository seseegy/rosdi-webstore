// Probe CDP s444: perilaku runtime untuk ide 1-10, 12, 14-20, 26-27, 31-32,
// 39-40, 45-49, 56-59, 71-80, 97. Satu skrip, dijalankan per lebar oleh
// scripts/cdp-launch.sh. Tinggi viewport via env CDP_H (default 900).
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
  if (msg.method === "Fetch.requestPaused") {
    // ide 32: gagalkan chunk GamePage
    ws.send(JSON.stringify({ id: nextId++, method: "Fetch.failRequest", params: { requestId: msg.params.requestId, errorReason: "Failed" } }));
    return;
  }
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
const PARTIAL = `${outDir}/cdp-s444-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = '${hash}'; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector('${sel}'); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll('${sel}')].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
const cssRules = async () => evalJs(`(() => { let out = []; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) out.push(r.cssText); } catch (e) {} } return out.join('\\n'); })()`);

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

// (ide 32 diuji terpisah di scripts/cdp-s444-chunkfail.mjs dengan profil
// Chrome segar — chunk yang sekali gagal dimuat akan di-cache React.lazy
// sehingga tidak boleh gagal di tengah run utama.)

// ide 19/35 + 97 + 14: Cek saat storage kosong + nomor salah
await probe("cek_kosong_salah", async () => {
  await nav("#/cek");
  const histH2 = await evalJs(`(() => { const h = [...document.querySelectorAll('h2')].map((x) => x.textContent.trim()); return { h2: h, hasHist: h.some((t) => t.includes('Transaksi terakhir')), crumbSub: document.querySelector('.crumb p')?.textContent || '' }; })()`);
  const searchInput = await evalJs(`(() => { const step = [...document.querySelectorAll('.step')].find((s) => s.textContent.includes('Transaksi terakhir')); if (!step) return 'NO-HIST-SECTION'; return [...step.querySelectorAll('input')].length + ' input di seksi riwayat'; })()`);
  await setInput(".step .input", "RSD-SALAH123");
  await clickText(".step .btn", "Cek");
  await sleep(500);
  const notFound = await evalJs(`(() => { const n = document.querySelector('.note.bad'); return n ? n.textContent.trim() : 'NO-MSG'; })()`);
  return { ...histH2, searchInput, notFound };
});

// ide 31: slug game tidak ada
await probe("slug_tak_ada", async () => {
  await nav("#/game/game-tidak-ada");
  return await evalJs(`(() => ({ h1: document.querySelector('.hero h1')?.textContent || document.querySelector('h1')?.textContent || 'NO-H1', ada404: /tidak ditemukan/i.test(document.body.innerText), hash: location.hash }))()`);
});

// ide 4: gulir ke atas saat pindah route
await probe("scroll_pindah_route", async () => {
  await nav("#/");
  await evalJs(`window.scrollTo(0, 0); document.querySelector('#katalog')?.scrollIntoView(); 'ok'`);
  await sleep(700);
  const before = await evalJs(`Math.round(window.scrollY)`);
  await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.getAttribute('href') === '#/game/mobile-legends'); a.click(); return 'ok'; })()`);
  const samples = [];
  for (let i = 0; i < 6; i++) { await sleep(90); samples.push(await evalJs(`Math.round(window.scrollY)`)); }
  await sleep(600);
  const akhir = await evalJs(`Math.round(window.scrollY)`);
  return { scrollY_sebelum: before, sampel_setelah_klik: samples, akhir };
});

// ide 2/9/10: aturan CSS hover/active + chip
await probe("css_hover_active", async () => {
  const css = await cssRules();
  const hoverRules = (css.match(/[^{]+:hover\s*\{[^}]*\}/g) || []).length;
  const hasHoverMedia = /@media\s*\(hover/.test(css);
  const btnActive = /\.btn:active\s*\{[^}]*transform/.test(css);
  const chipOn = /\.chip\.on\s*\{[^}]*\}/.exec(css)?.[0] || "";
  const nomOn = /\.nom\.on\s*\{[^}]*\}/.exec(css)?.[0] || "";
  const discRule = /\.sum-row\.disc[^{]*\{[^}]*\}/.exec(css)?.[0] || "";
  return { hoverRules, hasHoverMedia, btnActive, chipOn, nomOn, discRule, hasKeyframes: (css.match(/@keyframes/g) || []).length };
});

// ide 1/3/6/27 + alur beli (dipakai juga ide 39/40/72)
await probe("alir_beli_mlbb", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  // ide 6: klik kartu nominal, baca animasi kartu terpilih
  await evalJs(`(() => { document.querySelectorAll('.nom')[6].click(); return 'ok'; })()`);
  await sleep(150);
  const nomAnim = await evalJs(`(() => { const el = document.querySelector('.nom.on'); const cs = getComputedStyle(el); return { animationName: cs.animationName, transition: cs.transition.slice(0, 80) }; })()`);
  // ide 3: stepper 1 -> 2
  await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`);
  await sleep(150);
  const qtyAnim = await evalJs(`(() => { const b = document.querySelector('.qty b'); const cs = getComputedStyle(b); return { qty: b.textContent, animationName: cs.animationName }; })()`);
  // ide 27: sinkron mobile-bar vs aside saat qty 5
  await evalJs(`(() => { const p = document.querySelector('.qty .plus'); p.click(); p.click(); p.click(); return 'ok'; })()`);
  await sleep(200);
  const totals = await evalJs(`(() => ({ aside: document.querySelector('.sum-total b')?.textContent, mobileBar: document.querySelector('.mb-total b')?.textContent, qty: document.querySelector('.qty b')?.textContent }))()`);
  // ide 1: terapkan ROSDI10, baca animasi baris diskon
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
  await sleep(300);
  const disc = await evalJs(`(() => { const d = document.querySelector('.sum-row.disc'); if (!d) return 'NO-DISC-ROW'; const cs = getComputedStyle(d); return { text: d.textContent.replace(/\\s+/g, ' ').trim(), animationName: cs.animationName, transition: cs.transition.slice(0, 60) }; })()`);
  // pilih QRIS lalu beli 2x cepat (ide 39)
  await clickText(".pay", "QRIS");
  await sleep(200);
  const before = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  await evalJs(`(() => { const b = document.querySelector('.btn.big'); b.click(); b.click(); return 'ok'; })()`);
  await sleep(600);
  const after = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  const ref = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]; return o ? o.ref : 'NO-ORDER'; })()`);
  const onSuccess = await evalJs(`location.hash`);
  return { nomAnim, qtyAnim, totals, disc, doubleClick: { before, after }, ref, hashSetelahBeli: onSuccess };
});

// ide 40: refresh tepat setelah beli — order tetap 1
await probe("refresh_setelah_beli", async () => {
  const ref = R.alir_beli_mlbb?.ref;
  await evalJs(`location.reload(); 'ok'`);
  await sleep(1800);
  const n = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  return { ref, ordersSetelahReload: n, hash: await evalJs(`location.hash`) };
});

// ide 72: halaman Sukses 390 — muat tanpa scroll horizontal
await probe("sukses_layout", async () => {
  const ref = R.alir_beli_mlbb?.ref;
  if (!ref || ref === "NO-ORDER") return "SKIP-NO-ORDER";
  await nav("#/sukses/" + ref);
  return await evalJs(`(() => { const doc = document.documentElement; const salin = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Salin'); const r = salin?.getBoundingClientRect(); return { scrollW: doc.scrollWidth, innerW: window.innerWidth, overflowX: doc.scrollWidth > window.innerWidth, salinDalamViewport: r ? (r.right <= window.innerWidth && r.left >= 0) : 'NO-BTN', h1: document.querySelector('h1')?.textContent }; })()`);
});

// ide 5: Cek Nama PLN
await probe("cek_nama_pln", async () => {
  await nav("#/pln");
  await setInput("#idpel", "12345678901");
  await sleep(200);
  const before = await evalJs(`(() => { const b = [...document.querySelectorAll('.btn')].find((x) => /Cek Nama/.test(x.textContent)); return b ? b.textContent.trim() : 'NO-BTN'; })()`);
  await clickText(".btn", "Cek Nama");
  await sleep(300);
  const after = await evalJs(`(() => { const b = [...document.querySelectorAll('.btn')].find((x) => /Cek (Nama|Ulang)/.test(x.textContent)); const note = document.querySelector('.note.good'); return { label: b ? b.textContent.trim() : 'NO-BTN', note: note ? note.textContent.slice(0, 80) : 'NO-NOTE' }; })()`);
  return { before, ...after };
});

// ide 7/8: timeline + kartu hasil Cek
await probe("cek_timeline_anim", async () => {
  await nav("#/cek");
  await setInput(".step .input", "RSD-DEMO1234");
  await clickText(".step .btn", "Cek");
  await sleep(600);
  return await evalJs(`(() => { const tl = document.querySelector('.timeline'); if (!tl) return 'NO-TIMELINE'; const li = tl.querySelectorAll('li'); const cs = getComputedStyle(li[0]); const parent = tl.parentElement; const pcs = getComputedStyle(parent); return { liCount: li.length, liAnim: cs.animationName, liTransition: cs.transition.slice(0, 60), parentAnim: pcs.animationName, parentClass: parent.className || '(tanpa class)' }; })()`);
});

// ide 45-48: fokus keyboard (elemen tombol + outline)
await probe("fokus_keyboard", async () => {
  await nav("#/");
  const chips = await evalJs(`(() => { const c = document.querySelector('.chip'); if (!c) return 'NO-CHIP'; c.focus(); const cs = getComputedStyle(c); return { tag: c.tagName, outline: cs.outlineStyle + ' ' + cs.outlineWidth, activeIsChip: document.activeElement === c }; })()`);
  await nav("#/game/mobile-legends");
  const nom = await evalJs(`(() => { const n = document.querySelector('.nom'); n.focus(); const cs = getComputedStyle(n); const key = (() => { n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return document.querySelector('.nom.on') ? 'ENTER-MEMILIH?' : 'enter-tidak-memilih'; })(); return { tag: n.tagName, outline: cs.outlineStyle + ' ' + cs.outlineWidth, key }; })()`);
  const pay = await evalJs(`(() => { const p = document.querySelector('.pay'); if (!p) return 'NO-PAY'; p.focus(); const cs = getComputedStyle(p); return { tag: p.tagName, outline: cs.outlineStyle + ' ' + cs.outlineWidth }; })()`);
  const qty = await evalJs(`(() => { const btns = [...document.querySelectorAll('.qty button')]; if (!btns.length) return 'NO-QTY'; btns[1].focus(); const cs = getComputedStyle(btns[1]); const order = [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || b.textContent.trim().slice(0, 12)).filter((t) => /Tambah|Kurangi|Beli/.test(t)); return { tags: btns.map((b) => b.tagName).join(','), outline: cs.outlineStyle + ' ' + cs.outlineWidth, urutanRelevan: order.slice(0, 6) }; })()`);
  return { chips, nom, pay, qty };
});

// ide 49: DOM kartu flash sale
await probe("flash_sr_dom", async () => {
  await nav("#/");
  return await evalJs(`(() => { const card = document.querySelector('.grid.c2 .card'); if (!card) return 'NO-CARD'; const priceDiv = [...card.querySelectorAll('div')].find((d) => /Rp9\\.450|Rp\\d/.test(d.textContent) && d.querySelector('.was')); return { html: priceDiv ? priceDiv.outerHTML.slice(0, 300) : 'NO-PRICE-DIV', ariaLabel: priceDiv?.getAttribute('aria-label') || '(tidak ada)', wasAriaHidden: priceDiv?.querySelector('.was')?.getAttribute('aria-hidden') || '(tidak ada)' }; })()`);
});

// ide 26: badge flash vs diskon aktual
await probe("flash_badge", async () => {
  await nav("#/");
  return await evalJs(`(() => [...document.querySelectorAll('.grid.c2 .card')].map((c) => { const badge = c.querySelector('.badge')?.textContent.trim(); const m = c.textContent.match(/Rp([\\d.]+)\\s*Rp([\\d.]+)/); const price = m ? parseInt(m[1].replace(/\\./g, '')) : null; const was = m ? parseInt(m[2].replace(/\\./g, '')) : null; return { nama: c.querySelector('div div')?.textContent?.trim() || c.textContent.slice(0, 30), badge, price, was, diskonAktual: was ? ((was - price) / was * 100).toFixed(2) + '%' : null }; }))()`);
});

// ide 56: nama game terpanjang di kartu Beranda
await probe("nama_game_panjang", async () => {
  await nav("#/");
  return await evalJs(`(() => [...document.querySelectorAll('.grid.c4 .card .p-name')].map((el) => { const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight); return { nama: el.textContent, h: Math.round(el.offsetHeight), lines: Math.round(el.offsetHeight / lh), scrollW: el.scrollWidth, clientW: el.clientWidth }; }))()`);
});

// ide 57: nama paket data terpanjang
await probe("nama_paket_data", async () => {
  await nav("#/data/telkomsel");
  return await evalJs(`(() => [...document.querySelectorAll('.nom .n-name')].map((el) => { const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight); return { nama: el.textContent, lines: Math.round(el.offsetHeight / lh) }; }).filter((x) => x.lines > 1))()`);
});

// ide 58: nama metode bayar terpanjang
await probe("nama_metode", async () => {
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  return await evalJs(`(() => [...document.querySelectorAll('.pay .p-name2')].map((el) => { const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight); return { nama: el.textContent, lines: Math.round(el.offsetHeight / lh), scrollW: el.scrollWidth, clientW: el.clientWidth }; }).filter((x) => x.nama.includes('Virtual Account')))()`);
});

// ide 59: teks garansi aside
await probe("garansi_aside", async () => {
  await nav("#/game/mobile-legends");
  return await evalJs(`(() => { const g = document.querySelector('.guarantee'); if (!g) return 'NO-GUARANTEE'; return { h: Math.round(g.offsetHeight), scrollH: g.scrollHeight, clientH: g.clientHeight, terpotong: g.scrollHeight > g.clientHeight + 1, teks: g.textContent.trim().slice(0, 90) }; })()`);
});

// ide 12/15/16/17/18/20: pengguna baru vs lama
await probe("pengguna_baru_lama", async () => {
  await nav("#/");
  const headerBadge = await evalJs(`(() => { const h = document.querySelector('header.site'); return { teksHeader: h.innerText.replace(/\\s+/g, ' ').slice(0, 200), adaBadge: /\\b\\d\\b/.test(h.querySelector('nav')?.textContent || '') }; })()`);
  await nav("#/game/free-fire");
  const gantiGame = await evalJs(`(() => ({ adaTautanGantiGame: /ganti game/i.test(document.body.innerText), tombolKembali: !!document.querySelector('.crumb .back'), crumbTeks: document.querySelector('.crumb')?.innerText.replace(/\\s+/g, ' ').slice(0, 120) }))()`);
  // ide 17: tautan bantuan UID di 4 game
  const helpLinks = {};
  for (const [slug, label] of [["mobile-legends", "MLBB"], ["genshin-impact", "Genshin"], ["pubg-mobile", "PUBG"], ["honor-of-kings", "HOK"]]) {
    await nav("#/game/" + slug);
    helpLinks[label] = await evalJs(`(() => { const b = document.querySelector('.hint-link'); return b ? b.textContent.trim() : 'TIDAK-ADA'; })()`);
  }
  // ide 16: autofill kontak setelah 1 order
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(150);
  await evalJs(`(() => { const e = document.querySelector('#email'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(e, 'uji@contoh.id'); e.dispatchEvent(new Event('input', { bubbles: true })); const w = document.querySelector('#wa'); setter.call(w, '081234567890'); w.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  await clickText(".pay", "QRIS");
  await sleep(150);
  await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
  await sleep(500);
  await nav("#/game/free-fire");
  const kontak2 = await evalJs(`(() => ({ email: document.querySelector('#email')?.value || '(kosong)', wa: document.querySelector('#wa')?.value || '(kosong)' }))()`);
  // ide 18: nomor HP antar operator
  await nav("#/pulsa/telkomsel");
  await setInput("#hp", "081234567890");
  await sleep(200);
  await nav("#/pulsa/xl");
  const hp2 = await evalJs(`(() => ({ hp: document.querySelector('#hp')?.value || '(kosong)' }))()`);
  // ide 20: hitungan di chip kategori
  await nav("#/");
  const chips = await evalJs(`(() => [...document.querySelectorAll('.chip')].map((c) => c.textContent.trim()))()`);
  return { headerBadge, gantiGame, helpLinks, kontak2, hp2, chips };
});

// ---- probe khusus lebar ----
if (WIDTH === 390) {
  await probe("cek_timeline_390", async () => {
    await nav("#/cek");
    await setInput(".step .input", "RSD-DEMO1234");
    await clickText(".step .btn", "Cek");
    await sleep(600);
    return await evalJs(`(() => { const doc = document.documentElement; const tl = document.querySelector('.timeline'); const lis = [...tl.querySelectorAll('li')].map((li) => ({ teks: li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 60), scrollW: li.scrollWidth, clientW: li.clientWidth })); return { overflowX: doc.scrollWidth > window.innerWidth, scrollW: doc.scrollWidth, innerW: window.innerWidth, lis }; })()`);
  });
}
if (WIDTH === 320) {
  await probe("pulsa_grid_320", async () => {
    await nav("#/pulsa/telkomsel");
    return await evalJs(`(() => { const doc = document.documentElement; const grid = document.querySelector('.nom-grid'); const cs = getComputedStyle(grid); const cells = [...document.querySelectorAll('.nom')].slice(0, 3).map((c) => Math.round(c.getBoundingClientRect().width)); return { overflowX: doc.scrollWidth > window.innerWidth, kolom: cs.gridTemplateColumns.split(' ').length, lebarSel: cells, scrollW: doc.scrollWidth, innerW: window.innerWidth }; })()`);
  });
  await probe("modal_masuk_320", async () => {
    await nav("#/");
    await evalJs(`(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Masuk').click(); return 'ok'; })()`);
    await sleep(400);
    const r = await evalJs(`(() => { const m = document.querySelector('.modal'); if (!m) return 'NO-MODAL'; const b = m.getBoundingClientRect(); const adaTombolTutup = !!m.querySelector('[aria-label*="tutup" i], [aria-label*="close" i]') || [...m.querySelectorAll('button')].some((x) => x.textContent.trim() === '✕' || x.textContent.trim() === '×'); return { left: Math.round(b.left), right: Math.round(b.right), innerW: window.innerWidth, muat: b.left >= 0 && b.right <= window.innerWidth, adaTombolTutup, tombol: [...m.querySelectorAll('button')].map((x) => x.textContent.trim()) }; })()`);
    await evalJs(`(() => { document.querySelector('.modal .btn.big')?.click(); return 'ok'; })()`);
    return r;
  });
}
if (WIDTH === 360) {
  await probe("voucher_grid_360", async () => {
    await nav("#/voucher/google-play");
    return await evalJs(`(() => { const doc = document.documentElement; const grid = document.querySelector('.nom-grid'); const cs = getComputedStyle(grid); const prices = [...document.querySelectorAll('.nom .n-price')].map((el) => { const lcs = getComputedStyle(el); return { teks: el.textContent.trim().slice(0, 20), lines: Math.round(el.offsetHeight / parseFloat(lcs.lineHeight)) }; }); return { overflowX: doc.scrollWidth > window.innerWidth, kolom: cs.gridTemplateColumns.split(' ').length, prices }; })()`);
  });
}
if (WIDTH === 600) {
  await probe("beranda_600", async () => {
    await nav("#/");
    return await evalJs(`(() => { const grid = document.querySelector('.grid.c4'); const cs = getComputedStyle(grid); const chips = document.querySelector('.chips'); const ccs = getComputedStyle(chips); return { kolomGame: cs.gridTemplateColumns.split(' ').length, chipsSatuBaris: chips.scrollHeight <= chips.clientHeight + 2, chipsScrollH: chips.scrollHeight, chipsClientH: chips.clientHeight, overflowX: document.documentElement.scrollWidth > window.innerWidth }; })()`);
  });
}
if (WIDTH === 800) {
  await probe("produk_800", async () => {
    await nav("#/game/mobile-legends");
    return await evalJs(`(() => { const grid = document.querySelector('.nom-grid'); const flow = document.querySelector('.flow'); const gcs = getComputedStyle(grid); const fcs = getComputedStyle(flow); const summary = document.querySelector('.summary'); const sr = summary.getBoundingClientRect(); const steps = document.querySelector('.step').getBoundingClientRect(); return { kolomNominal: gcs.gridTemplateColumns.split(' ').length, kolomFlow: fcs.gridTemplateColumns.split(' ').length, asideDiBawah: sr.top > steps.bottom - 1, overflowX: document.documentElement.scrollWidth > window.innerWidth }; })()`);
  });
}
if (WIDTH === 1600) {
  await probe("beranda_1600", async () => {
    await nav("#/");
    return await evalJs(`(() => { const w = document.querySelector('.wrap'); const cs = getComputedStyle(w); const r = w.getBoundingClientRect(); return { lebarWrap: Math.round(r.width), maxWidth: cs.maxWidth, marginKiri: Math.round(r.left), overflowX: document.documentElement.scrollWidth > window.innerWidth }; })()`);
  });
}
if (WIDTH === 390 && HEIGHT === 400) {
  await probe("split_screen_390x400", async () => {
    await nav("#/game/mobile-legends");
    await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
    await sleep(500);
    return await evalJs(`(() => { const bar = document.querySelector('.mobile-bar'); const br = bar.getBoundingClientRect(); const header = document.querySelector('header.site').getBoundingClientRect(); const footer = document.querySelector('footer.site').getBoundingClientRect(); const maxScroll = document.documentElement.scrollHeight - window.innerHeight; return { tinggiMobileBar: Math.round(br.height), tinggiHeader: Math.round(header.height), viewport: window.innerHeight, maxScroll: Math.round(maxScroll), footerTerlihatDiBawah: footer.bottom - br.top, footerBottom: Math.round(footer.bottom), barTop: Math.round(br.top) }; })()`);
  });
}
if (WIDTH === 1280 && HEIGHT === 500) {
  await probe("desktop_pendek_1280x500", async () => {
    await nav("#/game/mobile-legends");
    await evalJs(`window.scrollTo(0, 600); 'ok'`);
    await sleep(600);
    return await evalJs(`(() => { const aside = document.querySelector('.summary'); const ar = aside.getBoundingClientRect(); const steps = [...document.querySelectorAll('.step')].map((s) => { const r = s.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; }); const overlap = steps.some((s) => !(ar.right <= s.left || ar.left >= s.right || ar.bottom <= s.top || ar.top >= s.bottom)); return { asideTop: Math.round(ar.top), asideBottom: Math.round(ar.bottom), viewport: window.innerHeight, overlapDenganLangkah: overlap }; })()`);
  });
}

writeFileSync(`${outDir}/cdp-s444-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
