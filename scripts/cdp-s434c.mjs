// Follow-up s434: WR step1 (rute benar), jumlah baris metode, harga nominal baris bermeta.
// Penggunaan: node scripts/cdp-s434c.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync } from "node:fs";

const [_wsUrl, widthArg, _baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1; const pending = new Map();
    const api = {
      send: (method, params = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); }),
      evalJs: async (expression) => {
        const r = await api.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error("eval failed: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
        return r.result.value;
      },
    };
    ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result); } };
    ws.onopen = () => resolve(api); ws.onerror = reject;
  });
}
const out = { width: WIDTH };
const listPages = () => fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const findAppPage = async () => {
  let prevUrl = null, prevId = null, stable = 0;
  for (let i = 0; i < 60; i++) {
    const list = await listPages();
    const t = list.find((x) => x.type === "page" && x.url.startsWith("http://127.0.0.1:4173"));
    if (t && t.url === prevUrl && t.id === prevId) { stable++; if (stable >= 2) return t; }
    else stable = 0;
    if (t) { prevUrl = t.url; prevId = t.id; }
    await sleep(500);
  }
  throw new Error("halaman app tidak ditemukan/stabil");
};
const target = await findAppPage();
const main = await connect(target.webSocketDebuggerUrl);
await main.send("Page.enable");
await main.send("Runtime.enable");
await main.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: WIDTH < 900 });
const ev = (expr) => main.evalJs(expr);
const go = async (hash) => {
  await ev(`location.hash = ${JSON.stringify(hash)}`);
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try { const r = await main.send("Runtime.evaluate", { expression: "document.getElementById('root')?.children.length || 0", returnByValue: true }); if (r.result && r.result.value > 0) break; } catch {}
  }
  await sleep(600);
};
await ev(`localStorage.clear()`);

// WR dengan rute benar
await go("#/game/wild-rift");
out.wr = await ev(`(() => {
  const h2 = document.querySelector('.step h2')?.innerText;
  const riot = !!document.querySelector('#riot');
  const note = [...document.querySelectorAll('.note')].map((n) => n.innerText).find((t) => t.includes('Riot ID'));
  return { h2, riot, note: note?.slice(0, 120) };
})()`);
// Valorant juga
await go("#/game/valorant");
out.valorant = await ev(`(() => ({ h2: document.querySelector('.step h2')?.innerText, riot: !!document.querySelector('#riot') }))()`);
// Baris metode: pilih nominal dulu, hitung 13 baris + Danamon disabled
await go("#/game/mobile-legends");
await ev(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.innerText.includes('172 Diamonds')); if (n) n.click(); return !!n; })()`);
await sleep(300);
out.payRows = await ev(`(() => {
  const rows = [...document.querySelectorAll('.pay')];
  return { total: rows.length,
    disabled: rows.filter((r) => r.disabled).map((r) => r.innerText.split('\\n')[0]),
    groups: [...document.querySelectorAll('.pay-group')].map((g) => g.innerText),
    marks: rows.map((r) => r.querySelector('.pm')?.innerText) };
})()`);
// nomAlign baris bermeta: 86 Diamonds (meta) vs 172 (meta) vs 257 (tanpa meta) — sebaris di 390? grid 2 kolom: 86|172, 257|344
out.nomAlignMeta = await ev(`(() => {
  const noms = [...document.querySelectorAll('.nom')];
  const pick = (name) => noms.find((n) => n.querySelector('.n-name')?.innerText === name);
  const row = (el) => el ? { name: el.querySelector('.n-name')?.innerText, hasMeta: !!el.querySelector('.n-meta'),
    priceY: Math.round(el.querySelector('.n-price').getBoundingClientRect().y),
    cardTop: Math.round(el.getBoundingClientRect().top), cardBottom: Math.round(el.getBoundingClientRect().bottom) } : null;
  return { row86_172: [row(pick('86 Diamonds')), row(pick('172 Diamonds'))],
    row257_344: [row(pick('257 Diamonds')), row(pick('344 Diamonds'))] };
})()`);
// Hint Beli awal di halaman game (teks persis)
out.hintInitial = await ev(`(() => {
  const notes = [...document.querySelectorAll('.summary .note')].map((n) => n.innerText);
  return notes.find((t) => t.startsWith('Untuk membeli')) || null;
})()`);

writeFileSync(`${outDir}/s434-followup-${WIDTH}.json`, JSON.stringify(out, null, 2));
console.log("CDP-C DONE", WIDTH, JSON.stringify(out).slice(0, 500));
process.exit(0);
