// Re-probe penutup Siklus 431 (ide yang bukti probe sebelumnya bertentangan/tidak lengkap).
// Penggunaan: node scripts/cdp-s431g.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; };

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
await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 560 });

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(text)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);

// ---- 3b: scroll restoration dgn scroll nyata
await evalJs(`window.scrollTo(0, 1200); 'ok'`);
await sleep(400);
const yBefore = await evalJs(`window.scrollY`);
await evalJs(`(() => { const a = [...document.querySelectorAll('a.card')].find((e) => e.textContent.includes('Mobile Legends')); if (a) a.click(); return !!a; })()`);
await sleep(1300);
await evalJs(`(() => { const b = document.querySelector('.crumb .back'); if (b) b.click(); return !!b; })()`);
await sleep(800);
rec("3b", { yBefore, yAfterBack: await evalJs(`window.scrollY`) });

// ---- 13: chip Game + cari "pulsa"
await clickText(".chip, .cat-chip, button", "Game").catch(() => "no-chip");
rec("13", await evalJs(`(() => { const chips = [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /^(Semua|Game|Pulsa|Data|PLN|E-Wallet|Voucher)$/.test(t)); return { chips }; })()`));
await setInput('input[type="search"], input[placeholder*="Cari"]', "pulsa");
await sleep(500);
rec("13b", await evalJs(`({ sections: [...document.querySelectorAll('h2')].map((h) => h.textContent), nothing: !!document.querySelector('.empty') })`));

// ---- 29: +62 di halaman pulsa Telkomsel
await goHash("#/pulsa/telkomsel");
await setInput("#hp", "+6281234567890");
await sleep(400);
rec("29", await evalJs(`({ val: document.querySelector('#hp')?.value, goodNote: document.querySelector('.note.good')?.textContent || null, badNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent), targetRow: [...document.querySelectorAll('.sum-row')].find((r) => r.textContent.includes('Tujuan'))?.textContent || null })`));

// ---- 34+44: PLN Token 100.000, QRIS, qty 10
await goHash("#/pln");
await setInput("#idpel", "543210987654");
await sleep(300);
await clickText("button", "Cek Nama");
await sleep(500);
await clickText(".nom", "Token 100.000").catch(() => {});
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('Token 100.000')); if (b) b.click(); return !!b; })()`);
await sleep(400);
await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('QRIS')); if (b) b.click(); return !!b; })()`);
await sleep(400);
rec("34", await evalJs(`({ rows: [...document.querySelectorAll('.sum-row, .sum-total')].map((r) => r.textContent) })`));
for (let i = 0; i < 9; i++) { await evalJs(`(() => { const b = document.querySelector('.qty .plus'); if (b) b.click(); return !!b; })()`); await sleep(120); }
rec("44", await evalJs(`(() => { const t = document.querySelector('.sum-total b'); const mb = document.querySelector('.mb-total b'); const r = t?.getBoundingClientRect(); return { qty: document.querySelector('.qty b')?.textContent, total: t?.textContent, totalScrollW: t?.scrollWidth, totalClientW: t?.clientWidth, totalRight: r ? Math.round(r.right) : null, viewport: window.innerWidth, mbTotal: mb?.textContent || null }; })()`));

// ---- 52b: demo lowercase
await goHash("#/cek");
await setInput('input[aria-label="Nomor transaksi"]', "rsd-demo1234");
await sleep(300);
await clickText("button", "Lacak");
await sleep(600);
rec("52b", await evalJs(`({ found: !!document.querySelector('.step, .card')?.textContent.includes('Mobile Legends'), bodyHasDemo: document.body.innerText.includes('RSD-DEMO1234') })`));

// ---- 75: atribut inputmode
await goHash("#/game/mobile-legends");
rec("75", await evalJs(`({ uid: document.querySelector('#uid')?.getAttribute('inputmode'), zone: document.querySelector('#zone')?.getAttribute('inputmode') })`));
await goHash("#/pulsa/telkomsel");
rec("75b", await evalJs(`({ hp: document.querySelector('#hp')?.getAttribute('inputmode'), hpAuto: document.querySelector('#hp')?.getAttribute('autocomplete') })`));
await goHash("#/pln");
rec("75c", await evalJs(`({ idpel: document.querySelector('#idpel')?.getAttribute('inputmode') })`));

// ---- 38: tanpa promo, baris diskon harus 0
await goHash("#/game/mobile-legends");
await setInput("#uid", "12345678"); await setInput("#zone", "1234");
await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('172 Diamonds')); if (b) b.click(); return !!b; })()`);
await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('QRIS')); if (b) b.click(); return !!b; })()`);
await sleep(300);
rec("38", await evalJs(`({ discRows: document.querySelectorAll('.sum-row.disc').length })`));

// ---- 40: flash Weekly Diamond Pass + ROSDI10
await evalJs(`(() => { const t = [...document.querySelectorAll('.tab')].find((e) => e.textContent.trim() === 'Weekly Pass'); if (t) t.click(); return !!t; })()`);
await sleep(300);
await evalJs(`(() => { const b = [...document.querySelectorAll('.nom')].find((e) => e.textContent.includes('Weekly Diamond Pass')); if (b) b.click(); return !!b; })()`);
await sleep(300);
await setInput('input[aria-label="Kode promo"]', "ROSDI10");
await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === 'Pakai'); if (b) b.click(); return !!b; })()`);
await sleep(400);
rec("40", await evalJs(`({ rows: [...document.querySelectorAll('.sum-row, .sum-total')].map((r) => r.textContent), promoMsg: document.querySelector('.step .note.good')?.textContent || null })`));

// ---- 32: email kontak salah format di checkout (apakah ditandai?)
await setInput("#email", "bukan-email");
await sleep(300);
rec("32", await evalJs(`({ emailBadNotes: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent), buyDisabled: document.querySelector('.summary .btn.big')?.disabled })`));

writeFileSync(`${outDir}/s431g-${width}.json`, JSON.stringify(R, null, 2));
console.log("SELESAI s431g lebar", width, "—", Object.keys(R).length, "ide tercatat");
