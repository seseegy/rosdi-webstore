// Uji ulang CDP s464 G79/G83/G82/G86/G87 — selector grid game yang benar (.grid.c4 seksi Top Up Game).
const [wsUrl, wArg, baseUrl, outDir, modeArg] = process.argv.slice(2);
const MODE = modeArg || "grid";
const rec = (id, data) => console.log(id, JSON.stringify(data));
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
const OVERFLOW_JS = `(() => {
  const vw = window.innerWidth;
  const bad = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) {
      const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 40);
      bad.push({ tag: el.tagName, cls, txt: (el.textContent || '').trim().slice(0, 40), left: +r.left.toFixed(1), right: +r.right.toFixed(1) });
    }
  });
  return { innerWidth: vw, scrollWidth: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > vw, pelanggar: bad.slice(0, 12), jumlahPelanggar: bad.length };
})()`;
const gameGridInfo = async () => evalJs(`(() => {
  const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent.trim() === 'Top Up Game');
  if (!h2) return { ditemukan: false };
  const sec = h2.closest('section'); const g = sec.querySelector('.grid');
  const cols = getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length;
  const cards = [...sec.querySelectorAll('.card')];
  const vw = window.innerWidth;
  const clipped = cards.filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 0.5 || r.left < -0.5; }).map((el) => ({ txt: (el.textContent || '').trim().slice(0, 30), left: +el.getBoundingClientRect().left.toFixed(1), right: +el.getBoundingClientRect().right.toFixed(1) }));
  const froms = [...sec.querySelectorAll('.p-from')].map((el) => ({ txt: el.textContent.trim(), terpotong: el.scrollWidth > el.clientWidth + 1, sw: el.scrollWidth, cw: el.clientWidth }));
  return { kolom: cols, jumlahKartu: cards.length, kartuTerpotong: clipped, hargaTerpotong: froms.filter((p) => p.terpotong), lebarGrid: +g.getBoundingClientRect().width.toFixed(1) };
})()`);
const nomGridInfo = async () => evalJs(`(() => {
  const c = document.querySelector('.nom-grid'); if (!c) return { ditemukan: false };
  const cols = getComputedStyle(c).gridTemplateColumns.split(' ').filter(Boolean).length;
  const noms = [...document.querySelectorAll('.nom')];
  const vw = window.innerWidth;
  const clipped = noms.filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 0.5 || r.left < -0.5; }).map((el) => ({ txt: (el.textContent || '').trim().slice(0, 30), right: +el.getBoundingClientRect().right.toFixed(1) }));
  const prices = [...document.querySelectorAll('.n-price')].map((el) => ({ txt: el.textContent.trim().slice(0, 24), terpotong: el.scrollWidth > el.clientWidth + 1 }));
  return { kolom: cols, jumlahNominal: noms.length, nominalTerpotong: clipped, jumlahHargaTerpotong: prices.filter((p) => p.terpotong).length, hargaTerpotong: prices.filter((p) => p.terpotong).slice(0, 6) };
})()`);

if (MODE === "grid") {
  await setMetrics(490, 844, true);
  await nav("#/");
  await safe("G79-gamegrid-490", gameGridInfo);
  await safe("G79-overflow-490b", () => evalJs(OVERFLOW_JS));
  await setMetrics(330, 844, true);
  await nav("#/");
  await safe("G83-gamegrid-330", gameGridInfo);
  await safe("G83-overflow-330b", () => evalJs(OVERFLOW_JS));
}
if (MODE === "zooms") {
  await setMetrics(390, 844, true);
  await nav("#/");
  await evalJs(`document.documentElement.style.zoom = '135%'; 'ok'`); await sleep(600);
  await safe("G82-gamegrid-z135", gameGridInfo);
  await safe("G82-overflow-z135", () => evalJs(OVERFLOW_JS));
  await evalJs(`document.documentElement.style.zoom = '115%'; 'ok'`); await sleep(600);
  await safe("G86-gamegrid-z115", gameGridInfo);
  await safe("G86-overflow-z115", () => evalJs(OVERFLOW_JS));
  await nav("#/game/mobile-legends");
  await evalJs(`document.documentElement.style.zoom = '145%'; 'ok'`); await sleep(600);
  await safe("G87-nom-z145", nomGridInfo);
  await safe("G87-overflow-z145", () => evalJs(OVERFLOW_JS));
}
console.log("SELESAI-G");
process.exit(0);
