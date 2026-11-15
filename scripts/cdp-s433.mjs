// CDP runtime batch s433: ide 41,42,43,44,47,48,49,76,77,78 (+ judul tab 61).
// Penggunaan: node scripts/cdp-s433.mjs <wsUrl> <width> <baseUrl> <outDir>
// Menulis s433-runtime.json + screenshot s433-*.png ke outDir.
import { writeFileSync } from "node:fs";

const [_wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const api = {
      send: (method, params = {}) => new Promise((res, rej) => {
        const id = nextId++;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      evalJs: async (expression) => {
        const r = await api.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error("eval failed: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
        return r.result.value;
      },
      close: () => ws.close(),
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    };
    ws.onopen = () => resolve(api);
    ws.onerror = reject;
  });
}

const out = { width: WIDTH, phases: {} };
// Tunggu redirect go.html selesai: target page harus sudah di 127.0.0.1:4173
// sebelum connect — kalau tidak, send awal kena -32000 "target navigated".
let listRes = null;
for (let i = 0; i < 40; i++) {
  listRes = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
  if (listRes.some((t) => t.type === "page" && t.url.includes("127.0.0.1:4173"))) break;
  await sleep(500);
}
const pageTarget = listRes.find((t) => t.type === "page" && t.url.includes("127.0.0.1:4173")) || listRes.find((t) => t.type === "page");
const main = await connect(pageTarget.webSocketDebuggerUrl);
await main.send("Page.enable");
await main.send("Runtime.enable");
await main.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: true });

const shot = async (name) => {
  const r = await main.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.data, "base64"));
};

// FASE 1 — muat Beranda normal (judul tab, hero, font)
await main.evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(3000);
out.phases.loadHome = await main.evalJs(`(() => ({
  title: document.title,
  rootChildren: document.getElementById('root').children.length,
  bodyText: document.body.innerText.slice(0, 120),
  h1: document.querySelector('.hero h1')?.innerText || null,
  h1Height: document.querySelector('.hero h1')?.offsetHeight || null,
  heroH: document.querySelector('.hero')?.offsetHeight || null,
  fontsLoaded: document.fonts ? [...document.fonts].map(f => f.family + ':' + f.status) : [],
  overflowX: document.documentElement.scrollWidth > ${WIDTH},
}))()`);
await shot("s433-home");

// FASE 2 — pencarian (ide 76,77,78)
const queries = ["mobile legend", "mlb", "freefire", "gensin", "ff", "pubg", "gi", "hok", "valo", "aov", "top up", "topup", "diamond", "token", "zzz"];
out.phases.search = {};
for (const q of queries) {
  const r = await main.evalJs(`(() => {
    const inp = document.querySelector('.searchbar input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, ${JSON.stringify(q)});
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise((res) => setTimeout(() => {
      const cards = [...document.querySelectorAll('a.card')].map((a) => a.innerText.split('\\n')[0]);
      const empty = document.querySelector('.empty')?.innerText || null;
      const sections = [...document.querySelectorAll('section.block h2')].map((h) => h.innerText);
      res({ cards, empty, sections });
    }, 300));
  })()`);
  out.phases.search[q] = r;
}
await main.evalJs(`(() => { const inp = document.querySelector('.searchbar input'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(inp, ''); inp.dispatchEvent(new Event('input', { bubbles: true })); })()`);

// FASE 3 — back/forward + form hilang (ide 49)
out.phases.backForward = await main.evalJs(`(async () => {
  const inp = document.querySelector('.searchbar input');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, 'mlbb');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const before = inp.value;
  document.querySelector('a.card[href="#/game/mobile-legends"]').click();
  await new Promise((r) => setTimeout(r, 1500));
  const onGame = location.hash;
  const uidBefore = document.querySelector('#uid') ? 'uid-ada' : 'uid-tidak-ada';
  const uidEl = document.querySelector('#uid');
  if (uidEl) { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(uidEl, '12345678'); uidEl.dispatchEvent(new Event('input', { bubbles: true })); }
  await new Promise((r) => setTimeout(r, 200));
  history.back();
  await new Promise((r) => setTimeout(r, 1500));
  const afterBack = { hash: location.hash, searchValue: document.querySelector('.searchbar input')?.value ?? null, searchBefore: before };
  history.forward();
  await new Promise((r) => setTimeout(r, 1500));
  const afterFwd = { hash: location.hash, uidValue: document.querySelector('#uid')?.value ?? null };
  return { onGame, uidBefore, afterBack, afterFwd };
})()`);

// FASE 4 — modal Masuk + refresh (ide 48): navigasi TIDAK BOLEH di dalam
// evaluate yang di-await (konteks hancur -> -32000); pakai Page.reload.
const modalBefore = await main.evalJs(`(() => {
  const btns = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Masuk');
  btns.click();
  return new Promise((res) => setTimeout(() => res({ openBefore: !!document.querySelector('.modal') }), 400));
})()`);
await main.send("Page.reload", { ignoreCache: false });
await sleep(2500);
const modalAfter = await main.evalJs(`(() => ({ openAfterReload: !!document.querySelector('.modal'), hashAfter: location.hash }))()`);
out.phases.modalRefresh = { ...modalBefore, ...modalAfter };

// FASE 5 — localStorage: order di tab ini muncul setelah reload (ide 47, proxy 2 tab)
await main.evalJs(`(() => {
  const order = { ref: 'RSD-TEST99', kind: 'game', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '', token: null };
  localStorage.setItem('rosdi_orders', JSON.stringify([order]));
  return true;
})()`);
await main.evalJs(`location.assign(${JSON.stringify(baseUrl + '#/cek')})`);
await sleep(2000);
out.phases.storage = await main.evalJs(`(() => {
  const rows = [...document.querySelectorAll('.step button.sum-row')].map((b) => b.innerText.replace(/\\n/g, ' | '));
  return { historyRows: rows, theme: localStorage.getItem('rosdi_theme') };
})()`);

// FASE 6 — chunk lazy gagal (ide 43): target baru, blokir chunk GamePage
try {
  const created = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then((r) => r.json());
  const t2 = await connect(created.webSocketDebuggerUrl);
  await t2.send("Page.enable");
  await t2.send("Runtime.enable");
  await t2.send("Fetch.enable", { patterns: [{ urlPattern: "*GamePage*", requestStage: "Request" }] });
  // tangkap event Fetch.requestPaused — pasang handler mentah via koneksi baru
  t2.close();
  const ws2 = new WebSocket(created.webSocketDebuggerUrl);
  let id2 = 1; const pend2 = new Map();
  const send2 = (method, params = {}) => new Promise((res, rej) => { const id = id2++; pend2.set(id, { res, rej }); ws2.send(JSON.stringify({ id, method, params })); });
  ws2.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pend2.has(msg.id)) { const { res, rej } = pend2.get(msg.id); pend2.delete(msg.id); if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result); }
    if (msg.method === "Fetch.requestPaused") send2("Fetch.failRequest", { requestId: msg.params.requestId, errorReason: "Failed" }).catch(() => {});
  };
  await new Promise((res, rej) => { ws2.onopen = res; ws2.onerror = rej; });
  await send2("Page.enable"); await send2("Runtime.enable");
  await send2("Fetch.enable", { patterns: [{ urlPattern: "*GamePage*", requestStage: "Request" }] });
  await send2("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")})` });
  await sleep(4000);
  const r = await send2("Runtime.evaluate", { expression: `(() => ({ bodyText: document.body.innerText.slice(0, 200), rootHtml: document.getElementById('root').innerHTML.slice(0, 300) }))()`, returnByValue: true });
  out.phases.chunkFail = r.result.value;
  ws2.close();
  await fetch(`http://127.0.0.1:9222/json/close/${created.id}`).catch(() => {});
} catch (e) {
  out.phases.chunkFail = { error: String(e).slice(0, 300) };
}

// FASE 7 — font Inter diblokir (ide 44): target baru, blokir fonts.googleapis/gstatic
try {
  const created = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then((r) => r.json());
  const ws3 = new WebSocket(created.webSocketDebuggerUrl);
  let id3 = 1; const pend3 = new Map();
  const send3 = (method, params = {}) => new Promise((res, rej) => { const id = id3++; pend3.set(id, { res, rej }); ws3.send(JSON.stringify({ id, method, params })); });
  ws3.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pend3.has(msg.id)) { const { res, rej } = pend3.get(msg.id); pend3.delete(msg.id); if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result); }
    if (msg.method === "Fetch.requestPaused") send3("Fetch.failRequest", { requestId: msg.params.requestId, errorReason: "Failed" }).catch(() => {});
  };
  await new Promise((res, rej) => { ws3.onopen = res; ws3.onerror = rej; });
  await send3("Page.enable"); await send3("Runtime.enable");
  await send3("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: true });
  await send3("Fetch.enable", { patterns: [{ urlPattern: "*fonts.googleapis.com*", requestStage: "Request" }, { urlPattern: "*fonts.gstatic.com*", requestStage: "Request" }] });
  await send3("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl)})` });
  await sleep(4000);
  const r = await send3("Runtime.evaluate", { expression: `(() => ({ h1: document.querySelector('.hero h1')?.innerText || null, h1Height: document.querySelector('.hero h1')?.offsetHeight, heroH: document.querySelector('.hero')?.offsetHeight, fontFamily: getComputedStyle(document.body).fontFamily, overflowX: document.documentElement.scrollWidth > ${WIDTH}, interLoaded: [...document.fonts].some((f) => f.family === 'Inter' && f.status === 'loaded') }))()`, returnByValue: true });
  out.phases.fontBlocked = r.result.value;
  const shot3 = await send3("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/s433-home-nofont.png`, Buffer.from(shot3.data, "base64"));
  ws3.close();
  await fetch(`http://127.0.0.1:9222/json/close/${created.id}`).catch(() => {});
} catch (e) {
  out.phases.fontBlocked = { error: String(e).slice(0, 300) };
}

// FASE 8 — offline kunjungan pertama (ide 41): target baru, cache disabled, offline
try {
  const created = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then((r) => r.json());
  const ws4 = new WebSocket(created.webSocketDebuggerUrl);
  let id4 = 1; const pend4 = new Map();
  const send4 = (method, params = {}) => new Promise((res, rej) => { const id = id4++; pend4.set(id, { res, rej }); ws4.send(JSON.stringify({ id, method, params })); });
  ws4.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pend4.has(msg.id)) { const { res, rej } = pend4.get(msg.id); pend4.delete(msg.id); if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result); }
  };
  await new Promise((res, rej) => { ws4.onopen = res; ws4.onerror = rej; });
  await send4("Page.enable"); await send4("Runtime.enable");
  await send4("Network.enable");
  await send4("Network.setCacheDisabled", { cacheDisabled: true });
  await send4("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: true });
  await send4("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send4("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl)})` });
  await sleep(4000);
  const r = await send4("Runtime.evaluate", { expression: `(() => ({ bodyText: document.body.innerText.slice(0, 200), rootHtml: (document.getElementById('root')?.innerHTML || '').slice(0, 200) }))()`, returnByValue: true });
  out.phases.offlineFirstLoad = r.result.value;
  const shot4 = await send4("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/s433-offline.png`, Buffer.from(shot4.data, "base64"));
  ws4.close();
  await fetch(`http://127.0.0.1:9222/json/close/${created.id}`).catch(() => {});
} catch (e) {
  out.phases.offlineFirstLoad = { error: String(e).slice(0, 300) };
}

// FASE 9 — localStorage dilempar (ide 45): target baru, localStorage dimatikan sebelum app
try {
  const created = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then((r) => r.json());
  const ws5 = new WebSocket(created.webSocketDebuggerUrl);
  let id5 = 1; const pend5 = new Map();
  const send5 = (method, params = {}) => new Promise((res, rej) => { const id = id5++; pend5.set(id, { res, rej }); ws5.send(JSON.stringify({ id, method, params })); });
  ws5.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pend5.has(msg.id)) { const { res, rej } = pend5.get(msg.id); pend5.delete(msg.id); if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result); }
  };
  await new Promise((res, rej) => { ws5.onopen = res; ws5.onerror = rej; });
  await send5("Page.enable"); await send5("Runtime.enable");
  await send5("Page.addScriptToEvaluateOnNewDocument", { source: `Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage dinonaktifkan'); } });` });
  await send5("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl)})` });
  await sleep(4000);
  const r = await send5("Runtime.evaluate", { expression: `(() => ({ bodyText: document.body.innerText.slice(0, 200), rootChildren: document.getElementById('root')?.children.length ?? -1 }))()`, returnByValue: true });
  out.phases.storageDisabled = r.result.value;
  ws5.close();
  await fetch(`http://127.0.0.1:9222/json/close/${created.id}`).catch(() => {});
} catch (e) {
  out.phases.storageDisabled = { error: String(e).slice(0, 300) };
}

writeFileSync(`${outDir}/s433-runtime.json`, JSON.stringify(out, null, 2));
console.log("DONE", JSON.stringify(out.phases.loadHome));
process.exit(0);
