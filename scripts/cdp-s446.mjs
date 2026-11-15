// Probe CDP s446: validasi B, Sukses C, PLN D, tema E, keyboard F, lebar I.
// Dijalankan per lebar oleh scripts/cdp-launch.sh. Tinggi viewport via env CDP_H.
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
const PARTIAL = `${outDir}/cdp-s446-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = '${hash}'; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const notes = async () => evalJs(`[...document.querySelectorAll('.note')].map((n) => (n.className.includes('bad') ? 'BAD: ' : n.className.includes('good') ? 'GOOD: ' : '') + n.textContent.trim().replace(/\\s+/g, ' '))`);
const keyDown = async (key, code, vk) => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
};
const clickBtn = async (sel) => evalJs(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return 'NO-EL'; if (b.disabled) return 'DISABLED'; b.click(); return 'clicked'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

// ---- B: validasi pulsa / game / voucher ----
await probe("validasi", async () => {
  const out = {};
  await nav("#/pulsa/telkomsel");
  await setInput("#hp", "0812abc456"); await sleep(250);
  out.hpHuruf = { notes: await notes(), beliDisabled: await evalJs(`[...document.querySelectorAll('.btn.big, .mobile-bar .btn')].map((b) => b.disabled)`) };
  await setInput("#hp", "081234567"); await sleep(250);
  out.hp9digit = { notes: await notes() };
  await setInput("#hp", "+6281234567890"); await sleep(250);
  out.hpPlus62 = { notes: await notes(), target: await evalJs(`document.querySelector('.summary .sum-row:nth-child(3) b')?.textContent || null`) };

  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678901234567890"); await sleep(250);
  out.uid20 = { notes: await notes(), beliDisabled: await evalJs(`document.querySelector('.summary .btn.big')?.disabled`) };
  await setInput("#uid", "12345678"); await setInput("#zone", "12 34"); await sleep(250);
  out.zoneSpasi = { notes: await notes() };
  await setInput("#zone", "-123"); await sleep(250);
  out.zoneNeg123 = { notes: await notes() };
  await setInput("#zone", "-1234"); await sleep(250);
  out.zoneNeg1234 = { notes: await notes(), target: await evalJs(`[...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan'))?.textContent || null`) };

  await nav("#/game/valorant");
  await setInput("#riot", "Nama Panjang#TAG"); await sleep(250);
  out.riotSpasiDalam = { notes: await notes(), target: await evalJs(`[...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan'))?.textContent || null`) };

  await nav("#/voucher/google-play");
  for (const em of [".nama@mail.com", "123@mail.com"]) {
    await setInput("#vemail", em); await sleep(250);
    out["email_" + em] = { notes: await notes() };
  }
  return out;
});

// ---- B14/D36: PLN newline + spasi ujung ----
await probe("pln_paste", async () => {
  const out = {};
  await nav("#/pln");
  await setInput("#idpel", "543210987654\n"); await sleep(250);
  out.newline = { notes: await notes(), cekDisabled: await evalJs(`[...document.querySelectorAll('.btn')].find((b) => b.textContent.includes('Cek'))?.disabled`) };
  await setInput("#idpel", "543210987654 "); await sleep(250);
  out.spasiUjung = { notes: await notes() };
  return out;
});

// ---- D31-34,37,40: Cek Nama lanjutan ----
await probe("pln_ceknama", async () => {
  const out = {};
  await nav("#/pln");
  await setInput("#idpel", "543210987654"); await sleep(200);
  await clickBtn(".step .btn"); await sleep(300);
  out.setelahCek = { notes: await notes() };
  // 32: tekan dua kali cepat
  await clickBtn(".step .btn"); await clickBtn(".step .btn"); await sleep(300);
  out.cekDuaKali = { notes: await notes() };
  // 31: ubah ID setelah cek
  await setInput("#idpel", "123456789012"); await sleep(250);
  out.idDiubah = { notes: await notes() };
  // 40: kosongkan ID setelah cek
  await clickBtn(".step .btn"); await sleep(300);
  await setInput("#idpel", ""); await sleep(250);
  out.idDikosongkan = { notes: await notes() };
  // 33: semua nol
  await setInput("#idpel", "000000000000"); await sleep(200);
  await clickBtn(".step .btn"); await sleep(300);
  out.semuaNol = { notes: await notes() };
  // 37: pilih token lalu ubah ID
  await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('Token 50.000')); if (b) b.click(); return 'ok'; })()`);
  await sleep(200);
  out.tokenTerpilih = await evalJs(`[...document.querySelectorAll('.nom.on')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim())`);
  await setInput("#idpel", "999999999999"); await sleep(250);
  out.tokenSetelahIdDiubah = await evalJs(`[...document.querySelectorAll('.nom.on')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim())`);
  // 34: deterministik — cek ID sama dua kali (tutup-buka halaman)
  await nav("#/"); await nav("#/pln");
  await setInput("#idpel", "543210987654"); await sleep(200);
  await clickBtn(".step .btn"); await sleep(300);
  out.cekUlangSama = { notes: await notes() };
  return out;
});

// ---- C: alur beli MLBB 3 Diamonds + Sukses vs ringkasan ----
await probe("beli_sukses", async () => {
  const out = {};
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('3 Diamonds')); if (b) b.click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); if (b) b.click(); return 'ok'; })()`);
  await sleep(200);
  out.ringkasan = await evalJs(`[...document.querySelectorAll('.summary .sum-row, .summary .sum-total')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim())`);
  await setInput("#email", ""); await setInput("#wa", "");
  await sleep(200);
  await clickBtn(".summary .btn.big"); await sleep(1200);
  out.hash = await evalJs(`location.hash`);
  out.sukses = await evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row, .sum-total')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()); const teks = document.body.innerText; return { rows, adaEmail: teks.includes('Bukti dikirim'), adaWA: /WhatsApp/.test(teks) }; })()`);
  out.ref = await evalJs(`(location.hash.match(/sukses\\/(.+)/) || [])[1] || null`);
  return out;
});

// ---- C21-23: Sukses tanpa kontak / email saja / WA saja (baca baris dari order terakhir) ----
await probe("sukses_kontak", async () => {
  const mkOrder = async (email, wa) => {
    await nav("#/game/mobile-legends");
    await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(150);
    await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('5 Diamonds')); if (b) b.click(); return 'ok'; })()`);
    await sleep(150);
    await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); if (b) b.click(); return 'ok'; })()`);
    await sleep(150);
    await setInput("#email", email); await setInput("#wa", wa); await sleep(150);
    await clickBtn(".summary .btn.big"); await sleep(1000);
    return evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()); return { hash: location.hash, rows }; })()`);
  };
  return {
    tanpaKontak: await mkOrder("", ""),
    emailSaja: await mkOrder("a@b.com", ""),
    waSaja: await mkOrder("", "081234567890"),
  };
});

// ---- C26/27/28: Sukses PLN + voucher ----
await probe("sukses_pln_voucher", async () => {
  const out = {};
  await nav("#/pln");
  await setInput("#idpel", "543210987654"); await sleep(200);
  await clickBtn(".step .btn"); await sleep(300);
  out.namaDiLangkah1 = await notes();
  await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('Token 50.000')); if (b) b.click(); return 'ok'; })()`);
  await sleep(150);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); if (b) b.click(); return 'ok'; })()`);
  await sleep(150);
  await clickBtn(".summary .btn.big"); await sleep(1000);
  out.suksesPln = await evalJs(`(() => ({ rows: [...document.querySelectorAll('.sum-row, .sum-total')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()), adaNama: document.body.innerText.includes('Nama pelanggan') }))()`);
  await nav("#/voucher/google-play");
  await setInput("#vemail", "nama.panjang.sekali.tester12345@emailcontohpanjang.com"); await sleep(200);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('Saldo 50.000')); if (b) b.click(); return 'ok'; })()`);
  await sleep(150);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); if (b) b.click(); return 'ok'; })()`);
  await sleep(150);
  await clickBtn(".summary .btn.big"); await sleep(1000);
  out.suksesVoucher = await evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()); const emailRow = rows.find((r) => r.includes('emailcontohpanjang')); const el = [...document.querySelectorAll('b')].find((b) => b.textContent.includes('emailcontohpanjang')); const overflow = el ? { scrollW: el.scrollWidth, clientW: el.clientWidth, rect: el.getBoundingClientRect().width } : null; return { rows, adaTombolBuka: !!([...document.querySelectorAll('a,button')].find((b) => /Buka (Steam|Play Store)/.test(b.textContent))), emailOverflow: overflow }; })()`);
  return out;
});

// ---- C30: waktu Sukses vs timeline Cek ----
await probe("waktu_paritas", async () => {
  const ref = await evalJs(`(location.hash.match(/sukses\\/(.+)/) || [])[1] || null`);
  const suksesWaktu = await evalJs(`[...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Waktu'))?.textContent.replace(/\\s+/g, ' ').trim()`);
  await nav("#/cek");
  await setInput(".step .input", ref || ""); await sleep(200);
  await clickBtn(".step .btn"); await sleep(500);
  const cekWaktu = await evalJs(`(() => { const li = [...document.querySelectorAll('.timeline li')].map((l) => l.textContent.replace(/\\s+/g, ' ').trim()); return li; })()`);
  return { ref, suksesWaktu, cekWaktu };
});

// ---- E: tema di Cek/Sukses + fokus/scroll/pencarian ----
await probe("tema", async () => {
  const out = {};
  out.toastAda = await evalJs(`!!document.querySelector('.toast')`);
  await nav("#/cek");
  out.tombolTemaCek = await evalJs(`!!document.querySelector('.icon-btn[aria-label="Ganti tema"]')`);
  await evalJs(`window.scrollTo(0, 300); 'ok'`); await sleep(200);
  const scrollBefore = await evalJs(`window.scrollY`);
  await evalJs(`document.querySelector('.icon-btn[aria-label="Ganti tema"]').focus(); 'ok'`);
  await clickBtn(".icon-btn[aria-label='Ganti tema']"); await sleep(400);
  out.gantiTemaCek = { tema: await evalJs(`document.documentElement.dataset.theme`), scrollSesudah: await evalJs(`window.scrollY`), scrollSebelum: scrollBefore, fokus: await evalJs(`document.activeElement?.className || document.activeElement?.tagName`) };
  await nav("#/cek/RSD-DEMO1234");
  await clickBtn(".step .btn"); await sleep(400);
  out.hasilCekTema = await evalJs(`document.documentElement.dataset.theme`);
  await nav("#/");
  await setInput(".searchbar input", "mlbb"); await sleep(200);
  await clickBtn(".icon-btn[aria-label='Ganti tema']"); await sleep(300);
  out.pencarianSetelahTema = await evalJs(`document.querySelector('.searchbar input').value`);
  out.temaSetelahPindah = await evalJs(`document.documentElement.dataset.theme`);
  await nav("#/cek");
  out.temaDiCek = await evalJs(`document.documentElement.dataset.theme`);
  return out;
});

// ---- F: keyboard ----
await probe("keyboard", async () => {
  const out = {};
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await evalJs(`document.querySelector('#zone').focus(); 'ok'`);
  await keyDown("Enter", "Enter", 13); await sleep(200);
  out.enterZone = { aktif: await evalJs(`document.activeElement?.id || document.activeElement?.tagName`), hash: await evalJs(`location.hash`) };
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(150);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((x) => x.textContent.includes('3 Diamonds')); if (b) b.click(); return 'ok'; })()`);
  await sleep(150);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); if (b) b.click(); return 'ok'; })()`);
  await sleep(150);
  await evalJs(`document.querySelector('#email').focus(); 'ok'`);
  await keyDown("Enter", "Enter", 13); await sleep(200);
  out.enterEmail = { aktif: await evalJs(`document.activeElement?.id || document.activeElement?.tagName`), hash: await evalJs(`location.hash`) };
  await nav("#/cek");
  await setInput(".step .input", "RSD-DEMO1234"); await sleep(150);
  await keyDown("Enter", "Enter", 13); await sleep(400);
  out.enterCek = { hasilMuncul: await evalJs(`!!document.querySelector('.cek-result')`) };
  // Tab dari pencarian
  await nav("#/");
  await evalJs(`document.querySelector('.searchbar input').focus(); 'ok'`);
  await keyDown("Tab", "Tab", 9); await sleep(200);
  out.tabDariPencarian = await evalJs(`(() => { const a = document.activeElement; return { tag: a?.tagName, teks: (a?.textContent || '').trim().slice(0, 30), kelas: a?.className }; })()`);
  // Skip link: Tab pertama dari body
  await evalJs(`document.activeElement?.blur(); document.body.focus(); 'ok'`);
  await keyDown("Tab", "Tab", 9); await sleep(200);
  out.skipLink = await evalJs(`(() => { const a = document.activeElement; const sl = document.querySelector('.skip-link'); const cs = getComputedStyle(sl); return { aktifSkip: a === sl, left: cs.left, visible: cs.left === '0px' }; })()`);
  // Urutan Tab mobile-bar: DOM order tombol Beli
  out.urutanBeli = await evalJs(`[...document.querySelectorAll('button')].map((b, i) => ({ i, teks: b.textContent.trim().slice(0, 20), bar: !!b.closest('.mobile-bar'), summary: !!b.closest('.summary') })).filter((x) => x.teks === 'Beli Sekarang')`);
  // Escape di dropdown server Genshin (native select)
  await nav("#/game/genshin-impact");
  await evalJs(`document.querySelector('#server').focus(); 'ok'`);
  await keyDown("Escape", "Escape", 27); await sleep(200);
  out.escapeServer = { aktif: await evalJs(`document.activeElement?.id || document.activeElement?.tagName`) };
  return out;
});

// ---- I81/84/86: lebar kartu nominal 390px ----
await probe("lebar_nominal", async () => {
  const ukur = async (hash, cari) => {
    await nav(hash);
    await sleep(300);
    return evalJs(`(() => { const cards = [...document.querySelectorAll('.nom')].filter((c) => c.textContent.includes(${JSON.stringify(cari)})); return cards.map((c) => { const nm = c.querySelector('.n-name'); const pr = c.querySelector('.n-price'); const cs = getComputedStyle(c); return { teks: c.textContent.replace(/\\s+/g, ' ').trim().slice(0, 60), cardW: c.getBoundingClientRect().width, namaScroll: nm.scrollWidth, namaClient: nm.clientWidth, hargaScroll: pr.scrollWidth, hargaClient: pr.clientWidth }; }); })()`);
  };
  return {
    mlbb2195: await ukur("#/game/mobile-legends", "2195 Diamonds"),
    psn400: await ukur("#/voucher/playstation", "PSN IDR 400.000"),
    voucherIdx: await evalJs(`(() => { location.hash = '#/'; return 'nav'; })()`),
  };
});
await probe("lebar_voucher_idx", async () => {
  await nav("#/");
  await sleep(300);
  return evalJs(`(() => { const card = [...document.querySelectorAll('.grid.c3 .card')].find((c) => c.textContent.includes('PlayStation Network')); if (!card) return 'TIDAK-ADA'; const nm = card.querySelector('.p-name'); return { cardW: card.getBoundingClientRect().width, namaScroll: nm.scrollWidth, namaClient: nm.clientWidth, tinggiNama: nm.getBoundingClientRect().height, baris: Math.round(nm.getBoundingClientRect().height / parseFloat(getComputedStyle(nm).lineHeight)) }; })()`);
});

// ---- J91: 100 order di riwayat ----
await probe("riwayat_100", async () => {
  await evalJs(`(() => { const arr = []; for (let i = 0; i < 100; i++) arr.push({ ref: 'RSD-TEST' + String(i).padStart(3, '0'), product: 'Mobile Legends', item: '86 Diamonds', target: '12345678 (1234)', method: 'QRIS', total: 21580, status: i % 2 ? 'Selesai' : 'Diproses', time: Date.now() - i * 60000 }); localStorage.setItem('rosdi_orders', JSON.stringify(arr)); return 'seeded'; })()`);
  const t0 = Date.now();
  await nav("#/cek");
  const out = await evalJs(`(() => { const rows = document.querySelectorAll('.step .sum-row'); return { barisTampil: rows.length, adaTombolLihatSemua: !!([...document.querySelectorAll('button')].find((b) => b.textContent.includes('Lihat semua'))) }; })()`);
  return { ...out, ms: Date.now() - t0 };
});

writeFileSync(`${outDir}/cdp-s446-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI", WIDTH);
process.exit(0);
