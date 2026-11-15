// Probe CDP s444 lanjutan — (1) baris diskon ROSDI10 (ide 1, pencocokan
// placeholder case-insensitive), (2) stepper +3 dengan jeda (apakah klik
// sinkron berturut-turut menaikkan qty), (3) aside sticky di 1280x900
// (ide 80), (4) split-screen 390x400 ulang (ide 79).
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
const PARTIAL = `${outDir}/cdp-s444c-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

if (WIDTH === 390 && HEIGHT === 900) {
  await probe("disc_row", async () => {
    await nav("#/game/mobile-legends");
    await setInput("#uid", "12345678");
    await setInput("#zone", "1234");
    await sleep(200);
    await evalJs(`(() => { document.querySelectorAll('.nom')[6].click(); return 'ok'; })()`);
    await sleep(200);
    const found = await evalJs(`(() => { const inp = [...document.querySelectorAll('.step input')].find((i) => (i.placeholder || '').toLowerCase().includes('kode promo')); if (!inp) return 'NO-PROMO-INPUT'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(inp, 'ROSDI10'); inp.dispatchEvent(new Event('input', { bubbles: true })); return 'set:' + inp.placeholder.slice(0, 30); })()`);
    await sleep(150);
    await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
    await sleep(300);
    const disc = await evalJs(`(() => { const d = document.querySelector('.sum-row.disc'); if (!d) return 'NO-DISC-ROW'; const cs = getComputedStyle(d); const csB = getComputedStyle(d.querySelector('b')); return { text: d.textContent.replace(/\\s+/g, ' ').trim(), animationName: cs.animationName + '/' + csB.animationName, transition: cs.transition.slice(0, 60), total: document.querySelector('.sum-total b')?.textContent, msg: document.querySelector('.note.good')?.textContent || '' }; })()`);
    return { found, disc };
  });
  await probe("stepper_jeda", async () => {
    await nav("#/game/mobile-legends");
    await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
    await sleep(200);
    const seq = [];
    seq.push(await evalJs(`document.querySelector('.qty b').textContent`));
    for (let i = 0; i < 3; i++) {
      await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`);
      await sleep(250);
      seq.push(await evalJs(`document.querySelector('.qty b').textContent`));
    }
    // lalu 3 klik sinkron tanpa jeda (seperti probe sebelumnya)
    await evalJs(`(() => { const p = document.querySelector('.qty .plus'); p.click(); p.click(); p.click(); return 'ok'; })()`);
    await sleep(300);
    seq.push(await evalJs(`document.querySelector('.qty b').textContent`));
    return { urutanQty: seq };
  });
}
if (WIDTH === 1280 && HEIGHT === 900) {
  await probe("aside_sticky", async () => {
    await nav("#/game/mobile-legends");
    const top0 = await evalJs(`(() => { const s = document.querySelector('.summary'); const r = s.getBoundingClientRect(); const aside = s.parentElement.getBoundingClientRect(); const cs = getComputedStyle(s); return { top: Math.round(r.top), position: cs.position, topCss: cs.top, asideH: Math.round(aside.height), summaryH: Math.round(r.height) }; })()`);
    await evalJs(`window.scrollTo(0, 500); 'ok'`);
    await sleep(600);
    const top500 = await evalJs(`(() => { const s = document.querySelector('.summary'); const r = s.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), scrollY: Math.round(window.scrollY) }; })()`);
    await evalJs(`window.scrollTo(0, 1500); 'ok'`);
    await sleep(600);
    const top1500 = await evalJs(`(() => { const s = document.querySelector('.summary'); const r = s.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), scrollY: Math.round(window.scrollY) }; })()`);
    return { top0, top500, top1500 };
  });
}
if (WIDTH === 390 && HEIGHT === 400) {
  await probe("split_screen_390x400b", async () => {
    await nav("#/game/mobile-legends");
    await evalJs(`window.scrollTo(0, document.documentElement.scrollHeight); 'ok'`);
    await sleep(600);
    const a = await evalJs(`(() => { const bar = document.querySelector('.mobile-bar'); const br = bar.getBoundingClientRect(); const footer = document.querySelector('footer.site'); const fr = footer.getBoundingClientRect(); return { scrollY: Math.round(window.scrollY), maxScroll: Math.round(document.documentElement.scrollHeight - window.innerHeight), barTop: Math.round(br.top), barBottom: Math.round(br.bottom), barTerlihat: br.bottom > 0 && br.top < window.innerHeight, footerTop: Math.round(fr.top), footerBottom: Math.round(fr.bottom), footerTerlihatPenuh: fr.bottom <= br.top }; })()`);
    // gulir sedikit ke atas agar footer terlihat di atas bar
    await evalJs(`window.scrollTo(0, document.documentElement.scrollHeight - 500); 'ok'`);
    await sleep(400);
    const b = await evalJs(`(() => { const bar = document.querySelector('.mobile-bar'); const br = bar.getBoundingClientRect(); const btn = [...document.querySelectorAll('.mobile-bar .btn')][0].getBoundingClientRect(); return { barTop: Math.round(br.top), btnTop: Math.round(btn.top), btnBottom: Math.round(btn.bottom), btnTerlihat: btn.bottom <= window.innerHeight && btn.top >= 0 }; })()`);
    return { diBawahSekali: a, sedikitKeAtas: b };
  });
}

writeFileSync(`${outDir}/cdp-s444c-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
