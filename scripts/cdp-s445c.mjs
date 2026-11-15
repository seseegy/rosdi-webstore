// Probe CDP s445 F+J (v2): ide 51-56 (harga & pembayaran), 91-96 (tagihan/indeks/by.U).
// Dijalankan per lebar oleh scripts/cdp-launch.sh. Tinggi viewport via env CDP_H (default 900).
// v2 vs v1: nav memakai polling (hash + selektor siap, retry 3x) — v1 gagal
// intermiten dengan sleep tetap 1100ms; setInput memakai JSON.stringify untuk
// selektor (v1 pecah SyntaxError pada selektor ber-quote: input[aria-label='Kode promo']);
// tiap probe beli diawali reload penuh agar state komponen (qty) tidak bocor.
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
const PARTIAL = `${outDir}/cdp-s445c-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 500) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
// Navigasi robust: tunggu hash cocok DAN selektor siap; ulangi set hash bila macet.
const nav = async (hash, readySel) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`);
    for (let i = 0; i < 32; i++) {
      await sleep(250);
      const ok = await evalJs(`(() => location.hash === ${JSON.stringify(hash)}${readySel ? ` && !!document.querySelector(${JSON.stringify(readySel)})` : ""})()`);
      if (ok) return true;
    }
  }
  return false;
};
const reload = async (readySel) => {
  await evalJs(`location.reload(); 'ok'`);
  for (let i = 0; i < 32; i++) {
    await sleep(250);
    const ok = await evalJs(`(() => !!document.querySelector(${JSON.stringify(readySel || "header.site")}))()`);
    if (ok) return true;
  }
  return false;
};
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
const clickNomByName = async (name) => evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.querySelector('.n-name')?.textContent.trim() === ${JSON.stringify(name)}); if (!b) return 'NO-NOM'; b.click(); return 'clicked'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);
await reload(".wrap");
await nav("#/", ".hero");

// ide 53: flash vs tab Weekly Diamond Pass
await probe("flash_vs_tab_wdp", async () => {
  const flash = await evalJs(`(() => { const c = [...document.querySelectorAll('.grid.c2 .card')].find((x) => x.textContent.includes('Weekly Diamond Pass')); if (!c) return 'NO-FLASH-CARD'; return { harga: c.textContent.match(/Rp[\\d.]+/g), badge: c.querySelector('.badge')?.textContent.trim() }; })()`);
  await nav("#/game/mobile-legends", ".nom-grid");
  await clickText(".tab", "Weekly Pass");
  await sleep(400);
  const tab = await evalJs(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.querySelector('.n-name')?.textContent.trim() === 'Weekly Diamond Pass'); if (!n) return 'NO-TAB-NOM'; return { harga: n.querySelector('.n-price')?.textContent.replace(/\\s+/g, ' ').trim(), badge: n.querySelector('.badge')?.textContent.trim() || '(tanpa badge)' }; })()`);
  return { flash, tab };
});

// ide 52: markup Steam vs Google Play di UI
await probe("markup_voucher_ui", async () => {
  const out = {};
  for (const [slug, label] of [["google-play", "GP"], ["steam-wallet", "Steam"]]) {
    await nav("#/voucher/" + slug, ".nom-grid");
    out[label] = await evalJs(`(() => ({ items: [...document.querySelectorAll('.nom .n-name')].map((el, i) => el.textContent.trim() + ' = ' + document.querySelectorAll('.nom .n-price')[i]?.textContent.trim()), adaPenjelasanMarkup: /markup|selisih|lebih murah|lebih mahal/i.test(document.body.innerText) }))()`);
  }
  await nav("#/", ".hero");
  out.kartuBeranda = await evalJs(`(() => [...document.querySelectorAll('.grid.c3 .card')].filter((c) => /Voucher/.test(c.textContent)).map((c) => c.textContent.replace(/\\s+/g, ' ').trim()))()`);
  return out;
});

// ide 54: item termurah Rp1.000 + fee e-wallet Rp250
await probe("fee_item_termurah", async () => {
  await nav("#/game/free-fire", ".nom-grid");
  await clickNomByName("5 Diamonds");
  await sleep(200);
  await clickText(".pay", "GoPay");
  await sleep(200);
  return await evalJs(`(() => { const payRow = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('GoPay')); const notes = [...document.querySelectorAll('.note')].map((n) => n.textContent.trim()); return { ringkasan: { harga: document.querySelectorAll('.sum-row')[4]?.textContent.replace(/\\s+/g, ' ').trim(), fee: document.querySelectorAll('.sum-row')[5]?.textContent.replace(/\\s+/g, ' ').trim(), total: document.querySelector('.sum-total b')?.textContent }, barisGoPay: payRow?.querySelector('.p-price')?.textContent.replace(/\\s+/g, ' ').trim(), adaPenjelasanProporsi: notes.some((t) => /25%|seperempat|proporsi/i.test(t)), notes: notes.filter((t) => /biaya|fee|Rp250/i.test(t)) }; })()`);
});

// ide 51: order terbesar qty 10 x 2195 Diamonds via pulsa + ROSDI10 — 4 permukaan
await probe("order_terbesar_51", async () => {
  await reload(".wrap");
  await nav("#/game/mobile-legends", ".nom-grid");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await clickNomByName("2195 Diamonds");
  await sleep(200);
  for (let i = 0; i < 9; i++) { await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`); await sleep(60); }
  const promoSet = await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
  await sleep(300);
  await clickText(".pay", "Pulsa Telkomsel");
  await sleep(300);
  const sebelum = await evalJs(`(() => { const payRow = document.querySelector('.pay.on .p-price'); const bar = document.querySelector('.mobile-bar'); const bcs = bar ? getComputedStyle(bar) : null; return { qty: document.querySelector('.qty b')?.textContent, promoSet: ${JSON.stringify(promoSet)}, ringkasanTotal: document.querySelector('.sum-total b')?.textContent, barisDiskon: document.querySelector('.sum-row.disc')?.textContent.replace(/\\s+/g, ' ').trim() || 'NO-DISC', barisMetode: payRow?.textContent.replace(/\\s+/g, ' ').trim(), mobileBarDisplay: bcs?.display || 'NO-BAR', mobileBarTotal: document.querySelector('.mb-total b')?.textContent || 'NO-BAR' }; })()`);
  const nBefore = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
  await sleep(800);
  const sesudah = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]; return { hash: location.hash, ref: o?.ref, totalTersimpan: o?.total, suksesTotal: document.querySelector('.sum-total b')?.textContent || 'NO-SUKSES-TOTAL', suksesBaris: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()) }; })()`);
  return { ...sebelum, ordersBefore: nBefore, ...sesudah };
});

// ide 55 + 56: order GoPay 172 Diamonds qty 1 — Cek vs Sukses vs riwayat
await probe("cek_vs_sukses_gopay", async () => {
  await reload(".wrap");
  await nav("#/game/mobile-legends", ".nom-grid");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await clickNomByName("172 Diamonds");
  await sleep(200);
  const qtyAwal = await evalJs(`document.querySelector('.qty b')?.textContent`);
  await clickText(".pay", "GoPay");
  await sleep(200);
  await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
  await sleep(800);
  const sukses = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]; return { ref: o?.ref, qty: o?.qty, totalTersimpan: o?.total, suksesTotal: document.querySelector('.sum-total b')?.textContent, suksesBarisHargaBiaya: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()).find((t) => t.startsWith('Harga + biaya')) }; })()`);
  const ref = sukses.ref;
  await nav("#/cek", ".step");
  await setInput(".step .input", ref);
  await clickText(".step .btn", "Cek");
  await sleep(600);
  const cek = await evalJs(`(() => { const r = document.querySelector('.cek-result'); if (!r) return 'NO-RESULT'; return { barisPembayaran: [...r.querySelectorAll('.sum-row')].map((x) => x.textContent.replace(/\\s+/g, ' ').trim()).find((t) => t.startsWith('Pembayaran')), barisProduk: [...r.querySelectorAll('.sum-row')].map((x) => x.textContent.replace(/\\s+/g, ' ').trim()).find((t) => t.startsWith('Produk')) }; })()`);
  const riwayat = await evalJs(`(() => { const rows = [...document.querySelectorAll('.step button.sum-row')]; const row = rows.find((b) => b.textContent.includes(${JSON.stringify(ref)})); return row ? { teks: row.textContent.replace(/\\s+/g, ' ').trim(), totalDiBaris: row.querySelector('b')?.textContent.trim() } : 'NO-ROW'; })()`);
  return { qtyAwal, sukses, cek, riwayat };
});

// ide 91: discoverability 7 kategori tagihan dari Beranda
await probe("tagihan_discoverability", async () => {
  await nav("#/", ".hero");
  const kartu = await evalJs(`(() => { const c = [...document.querySelectorAll('a.card')].find((x) => x.getAttribute('href') === '#/tagihan'); return c ? { href: c.getAttribute('href'), teks: c.textContent.replace(/\\s+/g, ' ').trim() } : 'NO-CARD'; })()`);
  await evalJs(`(() => { [...document.querySelectorAll('a.card')].find((x) => x.getAttribute('href') === '#/tagihan').click(); return 'ok'; })()`);
  const ok = await nav("#/tagihan", ".grid.c3 .card");
  const index = await evalJs(`(() => ({ h1: document.querySelector('h1')?.textContent, jumlahKartu: document.querySelectorAll('.grid.c3 .card').length, navOk: ${JSON.stringify(ok)}, kartu: [...document.querySelectorAll('.grid.c3 .card')].map((c) => ({ nama: c.querySelector('.p-name')?.textContent.trim(), href: c.getAttribute('href'), dari: c.querySelector('.p-from')?.textContent.trim() })) }))()`);
  return { kartuBeranda: kartu, index };
});

// ide 92: label Langkah 1 tiap kategori tagihan
await probe("tagihan_label_langkah1", async () => {
  const out = {};
  for (const id of ["pln-pascabayar", "pdam", "bpjs-kesehatan", "telkom", "tv-kabel", "multifinance", "pbb"]) {
    const ok = await nav("#/tagihan/" + id, "label.flabel");
    out[id] = await evalJs(`(() => { const steps = [...document.querySelectorAll('.step-head h2')].map((h) => h.textContent.trim()); const label = document.querySelector('label.flabel')?.textContent.trim(); const ph = document.querySelector('#billid')?.placeholder; const btn = [...document.querySelectorAll('.step .btn')].find((b) => /Cek Tagihan/.test(b.textContent))?.textContent.trim(); return { navOk: ${JSON.stringify(ok)}, judulLangkah1: steps[0] || 'NO-H2', label: label || 'NO-LABEL', placeholder: ph || 'NO-PH', tombol: btn || 'NO-BTN' }; })()`);
  }
  return out;
});

// ide 93 + 94: verifikasi + sukses tagihan (PDAM)
await probe("tagihan_verifikasi_sukses", async () => {
  await reload(".wrap");
  await nav("#/tagihan/pdam", "label.flabel");
  await setInput("#billid", "1234567890");
  await sleep(200);
  const tombolAwal = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => /Cek Tagihan/.test(x.textContent)); return b ? b.textContent.trim() + ' disabled=' + b.disabled : 'NO-BTN'; })()`);
  await clickText(".step .btn", "Cek Tagihan");
  await sleep(400);
  const rincian = await evalJs(`(() => { const rows = [...document.querySelectorAll('.step .sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()); return { tombolSesudah: [...document.querySelectorAll('.step .btn')].find((x) => /Cek (Tagihan|Ulang)/.test(x.textContent))?.textContent.trim(), rows, namaPelanggan: rows.find((t) => t.startsWith('Nama pelanggan')) }; })()`);
  const namaTerverifikasi = rincian.namaPelanggan || null;
  await clickNomByName("Tagihan Oktober 2026");
  await sleep(200);
  await clickText(".pay", "QRIS");
  await sleep(200);
  await evalJs(`(() => { document.querySelector('.summary .btn.big').click(); return 'ok'; })()`);
  await sleep(800);
  const sukses = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]; const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()); return { ref: o?.ref, kind: o?.kind, rows, adaNamaPelanggan: /Nama pelanggan/i.test(document.body.innerText), adaPeriode: /Oktober 2026/.test(document.body.innerText), adaNomorTagihan: document.body.innerText.includes('1234567890') }; })()`);
  return { tombolAwal, rincian, namaTerverifikasi, sukses };
});

// ide 95: regresi "Belum ada harga" di Indeks operator
await probe("indeks_operator_harga", async () => {
  const out = {};
  for (const mode of ["pulsa", "data"]) {
    await nav("#/" + mode, ".grid.c3 .card");
    out[mode] = await evalJs(`(() => ({ adaInfinity: /Infinity/.test(document.body.innerText), adaBelumAdaHarga: /Belum ada harga/.test(document.body.innerText), kartu: [...document.querySelectorAll('.grid.c3 .card')].map((c) => ({ nama: c.querySelector('.p-name')?.textContent.trim(), dari: c.querySelector('.p-from')?.textContent.trim() })) }))()`);
  }
  return out;
});

// ide 96: slug by.U
await probe("slug_byu", async () => {
  await nav("#/pulsa", ".grid.c3 .card");
  const kartu = await evalJs(`(() => { const c = [...document.querySelectorAll('.grid.c3 .card')].find((x) => x.querySelector('.p-name')?.textContent.trim() === 'by.U'); return c ? { href: c.getAttribute('href'), dari: c.querySelector('.p-from')?.textContent.trim() } : 'NO-CARD'; })()`);
  await nav("#/pulsa/byu", ".nom-grid");
  const pulsa = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, jumlahNominal: document.querySelectorAll('.nom').length }))()`);
  await nav("#/data/byu", ".nom-grid");
  const data = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, jumlahPaket: document.querySelectorAll('.nom').length }))()`);
  await nav("#/", ".hero");
  const beranda = await evalJs(`(() => { const c = [...document.querySelectorAll('a.card')].find((x) => x.getAttribute('href') === '#/pulsa'); return c ? c.textContent.replace(/\\s+/g, ' ').trim() : 'NO-CARD'; })()`);
  return { kartuIndeks: kartu, pulsa, data, kartuBerandaPulsa: beranda };
});

writeFileSync(`${outDir}/cdp-s445c-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
