// Probe CDP s458 responsif: G77 (396), G78 (410), G79 (720), G80 (960), G81 (1240), G82 (2048), G83 zoom 67%.
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
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

if (WIDTH === 396) {
  await setMetrics(396);
  await nav("#/game/genshin-impact");
  await safe("G77-396-genshin", () => evalJs(`(() => {
    const noms = [...document.querySelectorAll('.nom')];
    const terpotong = noms.filter((n) => n.scrollWidth > n.clientWidth + 1).map((n) => n.querySelector('.n-name')?.textContent);
    return { kolom: getComputedStyle(document.querySelector('.nom-grid')).gridTemplateColumns.split(' ').length,
      kartuTerpotong: terpotong, docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
}
if (WIDTH === 410) {
  await setMetrics(410);
  await nav("#/");
  await safe("G78-410-game", () => evalJs(`(() => {
    const cards = [...document.querySelectorAll('.grid.c4 .card')];
    const ws = cards.map((c) => Math.round(c.offsetWidth));
    const last = cards[cards.length - 1].getBoundingClientRect();
    const first = cards[0].getBoundingClientRect();
    return { jumlahKartu: cards.length, kolom: getComputedStyle(document.querySelector('.grid.c4')).gridTemplateColumns.split(' ').length,
      lebarKartuUnik: [...new Set(ws)], lebarKartuTerakhir: Math.round(last.width), lebarKartuPertama: Math.round(first.width),
      barisTerakhirSatuKartu: cards.length % 2 === 1, docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
  })()`));
}
if (WIDTH === 720) {
  await setMetrics(720);
  await nav("#/game/mobile-legends");
  await safe("G79-720-checkout", () => evalJs(`(() => {
    const flow = getComputedStyle(document.querySelector('.flow'));
    const aside = document.querySelector('aside .summary').getBoundingClientRect();
    const steps = document.querySelector('.flow > div').getBoundingClientRect();
    return { flowTemplate: flow.gridTemplateColumns, menumpuk: aside.top > steps.bottom - 1,
      docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
}
if (WIDTH === 960) {
  await setMetrics(960);
  await nav("#/");
  await safe("G80-960-wrap", () => evalJs(`(() => {
    const w = document.querySelector('.wrap');
    return { wrapW: Math.round(w.offsetWidth), wrapOffsetLeft: Math.round(w.getBoundingClientRect().left),
      docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`));
}
if (WIDTH === 1240) {
  await setMetrics(1240);
  await nav("#/game/mobile-legends");
  await safe("G81-1240-nom", () => evalJs(`(() => {
    const noms = [...document.querySelectorAll('.nom')];
    const ws = [...new Set(noms.map((n) => Math.round(n.offsetWidth)))];
    return { kolom: getComputedStyle(document.querySelector('.nom-grid')).gridTemplateColumns.split(' ').length,
      lebarKartuUnik: ws, semuaSamaLebar: ws.length === 1, docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
  })()`));
}
if (WIDTH === 1280) {
  await setMetrics(1280);
  await nav("#/game/mobile-legends");
  await safe("G83-zoom67", async () => {
    await evalJs(`document.documentElement.style.zoom = '67%'; 'ok'`);
    await sleep(500);
    return evalJs(`(() => {
      const noms = [...document.querySelectorAll('.nom')];
      const hargaTerpotong = noms.filter((n) => { const p = n.querySelector('.n-price'); return p && p.scrollWidth > p.clientWidth + 1; }).map((n) => n.querySelector('.n-name')?.textContent);
      return { kolom: getComputedStyle(document.querySelector('.nom-grid')).gridTemplateColumns.split(' ').length,
        hargaTerpotong, docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
    })()`);
  });
}
if (WIDTH === 2048) {
  await setMetrics(2048, 1200, false);
  await nav("#/");
  await safe("G82-2048-wrap", () => evalJs(`(() => {
    const w = document.querySelector('.wrap');
    const r = w.getBoundingClientRect();
    return { wrapW: Math.round(r.width), wrapLeft: Math.round(r.left), wrapRightDariKanan: Math.round(window.innerWidth - r.right),
      terpusat: Math.abs(r.left - (window.innerWidth - r.right)) <= 1, melebar: Math.round(r.width) > 1120 };
  })()`));
}
writeFileSync(outDir + "/cdp-s458-" + WIDTH + ".json", JSON.stringify(R, null, 1));
console.log("SELESAI-CDP-" + WIDTH);
process.exit(0);
