// Probe CDP s445 bagian B–E: pencarian (ide 11–30) + validasi (ide 31–50).
// Meniru scripts/cdp-s444.mjs. Dijalankan per lebar oleh scripts/cdp-launch.sh.
// Tinggi viewport via env CDP_H (default 900).
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
// Tunggu dokumen benar-benar halaman app (bukan about:blank sesaat setelah
// Chrome start) sebelum menyentuh localStorage — kalau tidak, SecurityError.
for (let i = 0; i < 20; i++) {
  const href = await send("Runtime.evaluate", { expression: "location.href", returnByValue: true }).then((r) => r.result.value).catch(() => "");
  if (typeof href === "string" && href.includes("127.0.0.1")) break;
  await sleep(500);
}
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const PARTIAL = `${outDir}/cdp-s445b-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = '${hash}'; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll('${sel}')].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
// Ketik huruf demi huruf (ide 31): fokus lalu Input.insertText per karakter.
const typeText = async (sel, text) => {
  await evalJs(`(() => { const el = document.querySelector('${sel}'); if (!el) return 'NO-EL'; el.focus(); return 'focused'; })()`);
  for (const ch of text) { await send("Input.insertText", { text: ch }); await sleep(60); }
  return "typed";
};
const notes = async () => evalJs(`[...document.querySelectorAll('.note')].map((n) => (n.className.includes('bad') ? 'BAD: ' : n.className.includes('good') ? 'GOOD: ' : '') + n.textContent.trim().replace(/\\s+/g, ' '))`);

const diag = await evalJs(`(() => { try { return { href: location.href, title: document.title, ls: typeof localStorage !== 'undefined' ? 'ada' : 'tak-ada', bodyLen: document.body ? document.body.innerHTML.length : -1 }; } catch (e) { return { href: location.href, ERROR: String(e).slice(0, 200) }; } })()`);
console.log("DIAG-AWAL", JSON.stringify(diag));
await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

// ---- B & C: pencarian 11–30 ----
await probe("pencarian_b_c", async () => {
  const queries = ["dompet", "listrik", "isi saldo", "internet", "membership", "robux", "valorant", "tagihan", "gopay", "ovo", "google play", "86", "?", "a", "mlbb  game", "Mobile Legends", "free fire", "cek", "lacak", "refund", "garansi", "indomaret", "alfamart", "psn", "playstation"];
  const out = {};
  for (const q of queries) {
    await nav("#/");
    await setInput(".searchbar input", q);
    await sleep(300);
    out[q] = await evalJs(`(() => {
      const games = [...document.querySelectorAll('.grid.c4 .card .p-name')].map((e) => e.textContent.trim());
      const cats = [...document.querySelectorAll('.grid.c3 .card .p-name')].map((e) => e.textContent.trim());
      const flash = [...document.querySelectorAll('.grid.c2 .card')].map((c) => c.textContent.replace(/\\s+/g, ' ').trim().slice(0, 40));
      const empty = document.querySelector('.empty')?.textContent.trim() || null;
      return { games, cats, flash, empty };
    })()`);
  }
  return out;
});

// ---- D31: ketik "1234 5678" huruf demi huruf di UID MLBB ----
await probe("uid_ketik_spasi", async () => {
  await nav("#/game/mobile-legends");
  await typeText("#uid", "1234 5678");
  await sleep(200);
  const akhir = await evalJs(`(() => ({ value: document.querySelector('#uid').value, notes: [...document.querySelectorAll('.note')].map((n) => n.textContent.trim()) }))()`);
  // Rekam juga keadaan transient: ketik ulang dari kosong, baca note tiap 2 karakter.
  await evalJs(`(() => { const el = document.querySelector('#uid'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ''); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  const jejak = [];
  for (const ch of "1234 5") {
    await send("Input.insertText", { text: ch });
    await sleep(80);
    jejak.push(await evalJs(`(() => ({ v: document.querySelector('#uid').value, bad: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) }))()`));
  }
  return { akhir, jejak };
});

// ---- D32/33/34: email voucher ----
await probe("email_voucher", async () => {
  await nav("#/voucher/google-play");
  const out = {};
  for (const em of ["nama@email", "nama..x@mail.com", "nama @mail.com", "nama@mail.com"]) {
    await setInput("#vemail", em);
    await sleep(250);
    out[em] = await evalJs(`(() => ({ bad: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()), value: document.querySelector('#vemail').value }))()`);
  }
  return out;
});

// ---- D35/36: kode promo ----
await probe("promo_kode", async () => {
  await nav("#/game/mobile-legends");
  const out = {};
  for (const code of ["ROSDI-10", "R", "ROSDI10"]) {
    await setInput(".step input[aria-label='Kode promo']", code);
    await sleep(150);
    await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
    await sleep(300);
    out[code] = await evalJs(`(() => { const n = [...document.querySelectorAll('.note')].find((x) => /Kode /.test(x.textContent)); return n ? n.textContent.trim() : 'NO-MSG'; })()`);
    // Bersihkan promo aktif sebelum kode berikutnya
    await evalJs(`(() => { const h = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Hapus'); if (h) h.click(); return 'ok'; })()`);
    await sleep(150);
  }
  return out;
});

// ---- D37/38 + E43: Riot ID Valorant ----
await probe("riot_id", async () => {
  await nav("#/game/valorant");
  const out = {};
  for (const r of ["#TAG", "Nama#TAG#X", "Nama # TAG", "NamaKamu#TAG12"]) {
    await setInput("#riot", r);
    await sleep(250);
    out[r] = await evalJs(`(() => ({ bad: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()), value: document.querySelector('#riot').value }))()`);
  }
  return out;
});

// ---- D39/40: Zone ID ----
await probe("zone_id", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  const out = {};
  for (const z of ["12a4", "1234567890", "1234"]) {
    await setInput("#zone", z);
    await sleep(250);
    out[z] = await evalJs(`(() => ({ bad: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) }))()`);
  }
  return out;
});

// ---- E41: tempel UID dengan NBSP ----
await probe("uid_nbsp", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "1234 5678");
  await setInput("#zone", "1234");
  await sleep(250);
  return await evalJs(`(() => ({ value: document.querySelector('#uid').value, charCodes: [...document.querySelector('#uid').value].map((c) => c.charCodeAt(0)), bad: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()), tujuan: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan'))?.textContent.replace(/\\s+/g, ' ').trim() }))()`);
});

// ---- E42: tempel ID PLN bertitik (+ kontrol spasi) ----
await probe("pln_titik", async () => {
  await nav("#/pln");
  const out = {};
  for (const v of ["5432.1098.7654", "5432 1098 7654", "543210987654"]) {
    await setInput("#idpel", v);
    await sleep(250);
    out[v] = await evalJs(`(() => ({ bad: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()), cekNamaDisabled: [...document.querySelectorAll('.btn')].find((b) => /Cek Nama/.test(b.textContent))?.disabled }))()`);
  }
  return out;
});

// ---- E44: nomor HP nol ganda ----
await probe("hp_nol_ganda", async () => {
  await nav("#/pulsa/telkomsel");
  await setInput("#hp", "0081234567890");
  await sleep(250);
  const n = await notes();
  await setInput("#hp", "081234567890");
  await sleep(250);
  const kontrol = await notes();
  return { nolGanda: n, kontrol };
});

// ---- E50: nomor transaksi berspasi (SEBELUM order baru dibuat) ----
await probe("cek_spasi", async () => {
  await nav("#/cek");
  const out = {};
  for (const r of ["RSD- DEMO1234", "RSD-DEMO1234", " rsd-demo1234 "]) {
    await setInput(".step .input", r);
    await sleep(150);
    await clickText(".step .btn", "Cek");
    await sleep(400);
    out[r] = await evalJs(`(() => ({ bad: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim().slice(0, 120)), found: !!document.querySelector('.cek-result'), foundRef: document.querySelector('.cek-result .sum-row b')?.textContent || null }))()`);
  }
  return out;
});

// ---- E45: beli dengan WA +62 + email tanpa TLD di Detail Kontak ----
await probe("beli_wa_plus62", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(150);
  await clickText(".pay", "QRIS");
  await sleep(150);
  await setInput("#email", "nama@email");
  await setInput("#wa", "+6281234567890");
  await sleep(200);
  const kontakNotes = await notes();
  const beliDisabled = await evalJs(`document.querySelector('.btn.big').disabled`);
  await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
  await sleep(600);
  const order = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]; return o ? { ref: o.ref, email: o.email, wa: o.wa, target: o.target } : 'NO-ORDER'; })()`);
  return { kontakNotes, beliDisabled, hash: await evalJs(`location.hash`), order };
});

// ---- E46: beli dengan WA 8 digit ----
await probe("beli_wa_8digit", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(150);
  await clickText(".pay", "QRIS");
  await sleep(150);
  await setInput("#email", "uji@contoh.id");
  await setInput("#wa", "08123456");
  await sleep(200);
  const kontakNotes = await notes();
  const beliDisabled = await evalJs(`document.querySelector('.btn.big').disabled`);
  await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
  await sleep(600);
  const order = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]; return o ? { ref: o.ref, email: o.email, wa: o.wa } : 'NO-ORDER'; })()`);
  return { kontakNotes, beliDisabled, hash: await evalJs(`location.hash`), order };
});

// ---- E47/48/49: stepper — tidak ada input ketik? ----
await probe("stepper", async () => {
  await nav("#/game/mobile-legends");
  const info = await evalJs(`(() => { const b = document.querySelector('.qty b'); const plus = document.querySelector('.qty .plus'); const minus = document.querySelector('.qty button:not(.plus)'); return { qtyTag: b?.tagName, qtyIsInput: b?.tagName === 'INPUT', plusTag: plus?.tagName, qtyAwal: b?.textContent, qtyInputDiStep: !!document.querySelector('.step input[type=number], .qty input') }; })()`);
  for (let i = 0; i < 12; i++) { await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`); await sleep(80); }
  const akhir = await evalJs(`(() => ({ qty: document.querySelector('.qty b')?.textContent, plusDisabled: document.querySelector('.qty .plus')?.disabled, total: document.querySelector('.sum-total b')?.textContent }))()`);
  return { info, akhir };
});

writeFileSync(`${outDir}/cdp-s445b-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
