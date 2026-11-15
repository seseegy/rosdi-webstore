// Probe CDP s444 perbaikan — ulangi alur beli (selektor promo diperbaiki:
// setInput/clickText kini memakai JSON.stringify untuk selektor) + probe
// tinggi 390x400 (ide 79) dan 1280x500 (ide 80). Dijalankan via cdp-launch.sh.
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
const PARTIAL = `${outDir}/cdp-s444b-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

await probe("alir_beli_mlbb", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[6].click(); return 'ok'; })()`);
  await sleep(150);
  const nomAnim = await evalJs(`(() => { const el = document.querySelector('.nom.on'); const cs = getComputedStyle(el); return { animationName: cs.animationName, transition: cs.transition.slice(0, 80) }; })()`);
  await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`);
  await sleep(150);
  const qtyAnim = await evalJs(`(() => { const b = document.querySelector('.qty b'); const cs = getComputedStyle(b); return { qty: b.textContent, animationName: cs.animationName }; })()`);
  await evalJs(`(() => { const p = document.querySelector('.qty .plus'); p.click(); p.click(); p.click(); return 'ok'; })()`);
  await sleep(200);
  const totals = await evalJs(`(() => ({ aside: document.querySelector('.sum-total b')?.textContent, mobileBar: document.querySelector('.mb-total b')?.textContent, qty: document.querySelector('.qty b')?.textContent, asideItem: document.querySelector('.sum-total')?.previousElementSibling?.textContent || '' }))()`);
  // promo: cari input berdasarkan placeholder (tanpa selektor ber-quote)
  await evalJs(`(() => { const inp = [...document.querySelectorAll('.step input')].find((i) => (i.placeholder || '').includes('Kode promo')); if (!inp) return 'NO-PROMO-INPUT'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(inp, 'ROSDI10'); inp.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
  await sleep(150);
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
  await sleep(300);
  const disc = await evalJs(`(() => { const d = document.querySelector('.sum-row.disc'); if (!d) return 'NO-DISC-ROW'; const cs = getComputedStyle(d); return { text: d.textContent.replace(/\\s+/g, ' ').trim(), animationName: cs.animationName, transition: cs.transition.slice(0, 60), total: document.querySelector('.sum-total b')?.textContent }; })()`);
  await clickText(".pay", "QRIS");
  await sleep(200);
  const before = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  await evalJs(`(() => { const b = document.querySelector('.btn.big'); b.click(); b.click(); return 'ok'; })()`);
  await sleep(600);
  const after = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  const ref = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]; return o ? o.ref : 'NO-ORDER'; })()`);
  return { nomAnim, qtyAnim, totals, disc, doubleClick: { before, after }, ref, hashSetelahBeli: await evalJs(`location.hash`) };
});

await probe("refresh_setelah_beli", async () => {
  const ref = R.alir_beli_mlbb?.ref;
  await evalJs(`location.reload(); 'ok'`);
  await sleep(1800);
  const n = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
  return { ref, ordersSetelahReload: n, hash: await evalJs(`location.hash`) };
});

await probe("sukses_layout", async () => {
  const ref = R.alir_beli_mlbb?.ref;
  if (!ref || ref === "NO-ORDER") return "SKIP-NO-ORDER";
  await nav("#/sukses/" + ref);
  return await evalJs(`(() => { const doc = document.documentElement; const salin = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Salin'); const r = salin?.getBoundingClientRect(); return { scrollW: doc.scrollWidth, innerW: window.innerWidth, overflowX: doc.scrollWidth > window.innerWidth, salinDalamViewport: r ? (r.right <= window.innerWidth && r.left >= 0) : 'NO-BTN', h1: document.querySelector('h1')?.textContent }; })()`);
});

await probe("fokus_pay", async () => {
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(250);
  return await evalJs(`(() => { const p = document.querySelector('.pay'); if (!p) return 'NO-PAY'; p.focus(); const cs = getComputedStyle(p); return { tag: p.tagName, outline: cs.outlineStyle + ' ' + cs.outlineWidth, activeIsPay: document.activeElement === p, disabled: p.disabled }; })()`);
});

await probe("nama_metode_h", async () => {
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(250);
  return await evalJs(`(() => [...document.querySelectorAll('.pay .p-name2')].map((el) => ({ nama: el.textContent, h: Math.round(el.offsetHeight), scrollW: el.scrollWidth, clientW: el.clientWidth })).filter((x) => x.nama.includes('Virtual Account')))()`);
});

await probe("voucher_harga_h", async () => {
  await nav("#/voucher/google-play");
  return await evalJs(`(() => [...document.querySelectorAll('.nom .n-price')].map((el) => ({ teks: el.textContent.trim().slice(0, 20), h: Math.round(el.offsetHeight) })))()`);
});

if (WIDTH === 390 && HEIGHT === 400) {
  await probe("split_screen_390x400", async () => {
    await nav("#/game/mobile-legends");
    await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
    await sleep(500);
    return await evalJs(`(() => { const bar = document.querySelector('.mobile-bar'); const br = bar.getBoundingClientRect(); const header = document.querySelector('header.site').getBoundingClientRect(); const footer = document.querySelector('footer.site'); const fr = footer.getBoundingClientRect(); const maxScroll = document.documentElement.scrollHeight - window.innerHeight; const scrollYNow = Math.round(window.scrollY); return { tinggiMobileBar: Math.round(br.height), tinggiHeader: Math.round(header.height), viewport: window.innerHeight, maxScroll: Math.round(maxScroll), scrollYNow, footerBottom: Math.round(fr.bottom), barTop: Math.round(br.top), footerTertutupBar: fr.bottom > br.top && fr.top < br.bottom }; })()`);
  });
}
if (WIDTH === 1280 && HEIGHT === 500) {
  await probe("desktop_pendek_1280x500", async () => {
    await nav("#/game/mobile-legends");
    await evalJs(`window.scrollTo(0, 600); 'ok'`);
    await sleep(600);
    return await evalJs(`(() => { const aside = document.querySelector('.summary'); const ar = aside.getBoundingClientRect(); const steps = [...document.querySelectorAll('.step')].map((s) => { const r = s.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; }); const overlap = steps.some((s) => !(ar.right <= s.left || ar.left >= s.right || ar.bottom <= s.top || ar.top >= s.bottom)); return { asideTop: Math.round(ar.top), asideBottom: Math.round(ar.bottom), asideH: Math.round(ar.height), viewport: window.innerHeight, overlapDenganLangkah: overlap }; })()`);
  });
}

writeFileSync(`${outDir}/cdp-s444b-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
