// Probe CDP s445 bagian G (ide 61-70): navigasi & state.
// Pola meniru scripts/cdp-s444.mjs: WebSocket CDP, evalJs, nav, setInput,
// clickText, probe+partial jsonl. Dijalankan per lebar oleh cdp-launch.sh:
//   bash scripts/cdp-launch.sh scripts/cdp-s445d.mjs hidden_files/qa-periodic-s445/cdp-s445d 390 1280
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

const [wsUrl, widthArg, _baseUrl, outDir] = process.argv.slice(2);
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
const PARTIAL = `${outDir}/cdp-s445d-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = '${hash}'; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector('${sel}'); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll('${sel}')].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
const state = () => evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent || 'NO-H1', q: document.querySelector('.searchbar input')?.value ?? 'NO-SEARCH', uid: document.querySelector('#uid')?.value ?? 'NO-UID', zone: document.querySelector('#zone')?.value ?? 'NO-ZONE', nomTerpilih: document.querySelector('.nom.on .n-name')?.textContent?.trim() || 'TIDAK-ADA', payTerpilih: document.querySelector('.pay.on')?.textContent?.trim().slice(0, 30) || 'TIDAK-ADA', promoAktif: !!document.querySelector('.sum-row.disc'), scrollY: Math.round(window.scrollY) }))()`);

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

// ide 61: isi pencarian, ke Cek, klik nav Beranda — apakah query reset?
await probe("ide61_nav_beranda_reset_cari", async () => {
  await setInput(".searchbar input", "mlbb");
  await sleep(300);
  const sebelum = await evalJs(`document.querySelector('.searchbar input').value`);
  await nav("#/cek");
  await sleep(300);
  await evalJs(`(() => { const a = [...document.querySelectorAll('nav.main a')].find((x) => x.textContent.trim() === 'Beranda'); a.click(); return 'ok'; })()`);
  await sleep(900);
  const sesudah = await state();
  return { qSebelum: sebelum, hashSetelahKlikNav: sesudah.hash, qSesudah: sesudah.q, h1: sesudah.h1 };
});

// ide 62: draf checkout -> Cek -> kembali (history.back + crumb) — bertahan?
await probe("ide62_draf_cek_kembali", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  await evalJs(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('706 Diamonds')); n.click(); return 'ok'; })()`);
  await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
  await sleep(300);
  await clickText(".pay", "QRIS");
  await sleep(200);
  const draf = await state();
  await nav("#/cek");
  await sleep(300);
  // kembali via history.back() (setara tombol back browser)
  await evalJs(`history.back(); 'ok'`);
  await sleep(1100);
  const viaBack = await state();
  // kembali ke Cek lalu pulang via crumb produk: crumb ‹ di halaman produk
  // mengarah ke "#/" (bukan history) — cek dari halaman produk.
  await nav("#/cek");
  await sleep(300);
  await evalJs(`history.back(); 'ok'`);
  await sleep(1100);
  const crumbAda = await evalJs(`(() => { const b = document.querySelector('.crumb .back'); return b ? { label: b.getAttribute('aria-label'), tujuan: 'go(#/) per CheckoutShell.jsx:177' } : 'NO-CRUMB-BACK'; })()`);
  await evalJs(`(() => { document.querySelector('.crumb .back').click(); return 'ok'; })()`);
  await sleep(900);
  const setelahCrumb = await state();
  // masuk lagi ke produk dari Beranda
  await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.getAttribute('href') === '#/game/mobile-legends'); a.click(); return 'ok'; })()`);
  await sleep(1100);
  const masukLagi = await state();
  return { draf, viaHistoryBack: viaBack, crumbAda, setelahCrumb, masukLagi };
});

// ide 63: deep link ?tab=weekly
await probe("ide63_deeplink_tab", async () => {
  await nav("#/game/mobile-legends?tab=weekly");
  return await evalJs(`(() => { const tabs = [...document.querySelectorAll('.tabs button, [role=tab]')].map((b) => ({ teks: b.textContent.trim(), aktif: b.className.includes('on') || b.getAttribute('aria-selected') === 'true' })); const chipAktif = [...document.querySelectorAll('.chip')].map((c) => ({ teks: c.textContent.trim(), on: c.className.includes('on') })).filter((c) => c.on); return { hash: location.hash, h1: document.querySelector('h1')?.textContent, tabs, chipAktif, nomPertama: document.querySelector('.nom .n-name')?.textContent?.trim() || 'NO-NOM' }; })()`);
});

// ide 64: trailing slash
await probe("ide64_trailing_slash", async () => {
  await nav("#/game/mobile-legends/");
  const s = await state();
  return { ...s, jatuhKeBeranda: s.h1 === "Top up, harga final sejak awal" };
});

// ide 65: path huruf besar
await probe("ide65_path_huruf_besar", async () => {
  await nav("#/GAME/MOBILE-LEGENDS");
  const s = await state();
  return { ...s, jatuhKeBeranda: s.h1 === "Top up, harga final sejak awal" };
});

// ide 66: nomor di path /cek/RSD-...
await probe("ide66_cek_nomor_path", async () => {
  await nav("#/cek/RSD-DEMO1234");
  return await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, inputCek: document.querySelector('.step .input')?.value ?? 'NO-INPUT', adaHasil: !!document.querySelector('.cek-result') }))()`);
});

// ide 67: anchor #cara-top-up, fresh load (reload penuh)
await probe("ide67_anchor_fresh_load", async () => {
  await evalJs(`location.hash = '#cara-top-up'; 'ok'`);
  await sleep(600);
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2000);
  return await evalJs(`(() => { const targetSalah = document.getElementById('cara-top-up'); const targetBenar = document.getElementById('cara-topup'); const r = targetBenar?.getBoundingClientRect(); return { hash: location.hash, adaId_cara_top_up: !!targetSalah, adaId_cara_topup: !!targetBenar, scrollY: Math.round(window.scrollY), seksiTop: r ? Math.round(r.top) : null, h1: document.querySelector('h1')?.textContent }; })()`);
});

// ide 68: dua modal bertumpuk — S&K lalu Masuk
await probe("ide68_dua_modal", async () => {
  await nav("#/");
  await evalJs(`(() => { [...document.querySelectorAll('footer .flink')].find((b) => b.textContent.trim() === 'Syarat & Ketentuan').click(); return 'ok'; })()`);
  await sleep(400);
  const setelahSK = await evalJs(`(() => ({ veil: document.querySelectorAll('.modal-veil').length, judul: [...document.querySelectorAll('.modal h3')].map((h) => h.textContent) }))()`);
  await evalJs(`(() => { [...document.querySelectorAll('header .header-actions button')].find((b) => b.textContent.trim() === 'Masuk').click(); return 'ok'; })()`);
  await sleep(400);
  const setelahMasuk = await evalJs(`(() => { const veils = [...document.querySelectorAll('.modal-veil')]; const judul = [...document.querySelectorAll('.modal h3')].map((h) => h.textContent); const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2); const diTengah = el?.closest('.modal')?.querySelector('h3')?.textContent || el?.className || el?.tagName; const z = veils.map((v) => getComputedStyle(v).zIndex); const rects = veils.map((v) => { const r = v.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }); return { veil: veils.length, judul, zIndex: z, rects, elemenDiTengah: diTengah, bodyOverflow: document.documentElement.style.overflow }; })()`);
  // tutup keduanya: Escape menutup yang mana?
  await evalJs(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 'ok'; })()`);
  await sleep(400);
  const setelahEsc = await evalJs(`(() => ({ veil: document.querySelectorAll('.modal-veil').length, judul: [...document.querySelectorAll('.modal h3')].map((h) => h.textContent) }))()`);
  // bersihkan: klik tombol Tutup / Siap yang tersisa
  await evalJs(`(() => { const b = [...document.querySelectorAll('.modal .btn')].find((x) => /Tutup|Siap/.test(x.textContent)); b?.click(); return 'ok'; })()`);
  await sleep(300);
  const bersih = await evalJs(`document.querySelectorAll('.modal-veil').length`);
  return { setelahSK, setelahMasuk, setelahEsc, veilSetelahTutupSatu: bersih };
});

// ide 69: back browser saat modal S&K terbuka (history.back() = padanan
// gestur back HP; gestur fisik tidak bisa diuji di headless — batasan dicatat)
await probe("ide69_back_saat_modal", async () => {
  await nav("#/");
  await evalJs(`(() => { [...document.querySelectorAll('footer .flink')].find((b) => b.textContent.trim() === 'Syarat & Ketentuan').click(); return 'ok'; })()`);
  await sleep(400);
  const sebelum = await evalJs(`(() => ({ hash: location.hash, modalTerbuka: document.querySelectorAll('.modal-veil').length, judul: document.querySelector('.modal h3')?.textContent }))()`);
  const lenSebelum = await evalJs(`history.length`);
  await evalJs(`history.back(); 'ok'`);
  await sleep(1100);
  const sesudah = await evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, modalTerbuka: document.querySelectorAll('.modal-veil').length, overflow: document.documentElement.style.overflow }))()`);
  return { sebelum, historyLengthSebelum: lenSebelum, sesudah, catatan: "history.back() dipakai sebagai padanan gestur back Android; gestur fisik tidak dapat diuji di Chrome headless" };
});

// ide 70: bolak-balik Beranda<->produk 10x lalu back
await probe("ide70_bolak_balik_10x_back", async () => {
  await nav("#/");
  for (let i = 0; i < 10; i++) {
    await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((x) => x.getAttribute('href') === '#/game/mobile-legends'); a.click(); return 'ok'; })()`);
    await sleep(500);
    await evalJs(`(() => { document.querySelector('.crumb .back').click(); return 'ok'; })()`);
    await sleep(500);
  }
  const hashSetelah10x = await evalJs(`location.hash`);
  const lenSetelah = await evalJs(`history.length`);
  const jejak = [];
  for (let i = 0; i < 4; i++) {
    await evalJs(`history.back(); 'ok'`);
    await sleep(700);
    jejak.push(await evalJs(`location.hash + ' | h1=' + (document.querySelector('h1')?.textContent || '?')`));
  }
  return { hashSetelah10x, historyLength: lenSetelah, empatBackBerkutut: jejak };
});

writeFileSync(`${outDir}/cdp-s445d-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
