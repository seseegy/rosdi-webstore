// Verifikasi perbaikan s433 via CDP (ringkas, pola cdp-s433.mjs).
// Penggunaan: node scripts/cdp-s433-verify.mjs <wsUrl> <width> <baseUrl> <outDir>
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
        if (r.exceptionDetails) throw new Error("eval failed: " + JSON.stringify(r.exceptionDetails).slice(0, 300));
        return r.result.value;
      },
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

const out = { width: WIDTH };
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

const go = async (hash) => {
  await main.evalJs(`location.assign(${JSON.stringify(baseUrl + hash)})`);
  await sleep(2500);
};

// Judul per rute (ide 61) + theme-color (ide 67)
await go("");
out.titles = { home: await main.evalJs("document.title") };
await go("#/game/mobile-legends");
out.titles.game = await main.evalJs("document.title");
await go("#/cek");
out.titles.cek = await main.evalJs("document.title");
await go("#/sukses/RSD-DEMO1234");
out.titles.sukses = await main.evalJs("document.title");
out.themeColor = await main.evalJs(`document.querySelector('meta[name="theme-color"]')?.content || null`);

// Pencarian (ide 76/77/78) — kembali ke Beranda dulu
await go("");
out.search = {};
for (const q of ["diamond", "freefire", "aov", "top up"]) {
  out.search[q] = await main.evalJs(`(() => {
    const inp = document.querySelector('.searchbar input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, ${JSON.stringify(q)});
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise((res) => setTimeout(() => {
      const cards = [...document.querySelectorAll('a.card')].map((a) => a.innerText.split('\\n')[0]);
      res({ cards, emptyShown: !!document.querySelector('.empty') });
    }, 300));
  })()`);
}

// Tombol Pakai disabled saat kosong + Lacak->Cek (ide 5, 15)
await go("#/game/mobile-legends");
out.pakaiDisabledEmpty = await main.evalJs(`(() => {
  const btns = [...document.querySelectorAll('button')].filter((b) => b.innerText.trim() === 'Pakai');
  return btns.length ? btns[0].disabled : 'tombol-tidak-ketemu';
})()`);
await go("#/cek");
out.cekButton = await main.evalJs(`(() => {
  const btns = [...document.querySelectorAll('button')].map((b) => b.innerText.trim());
  return btns.filter((t) => t === 'Cek' || t === 'Lacak');
})()`);

// Chunk gagal -> ErrorBoundary (ide 43)
try {
  const created = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then((r) => r.json());
  const ws2 = new WebSocket(created.webSocketDebuggerUrl);
  let id2 = 1;
  const pend2 = new Map();
  const send2 = (method, params = {}) => new Promise((res, rej) => { const id = id2++; pend2.set(id, { res, rej }); ws2.send(JSON.stringify({ id, method, params })); });
  ws2.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pend2.has(msg.id)) {
      const { res, rej } = pend2.get(msg.id);
      pend2.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
    }
    if (msg.method === "Fetch.requestPaused") send2("Fetch.failRequest", { requestId: msg.params.requestId, errorReason: "Failed" }).catch(() => {});
  };
  await new Promise((res, rej) => { ws2.onopen = res; ws2.onerror = rej; });
  await send2("Page.enable");
  await send2("Runtime.enable");
  await send2("Fetch.enable", { patterns: [{ urlPattern: "*GamePage*", requestStage: "Request" }] });
  await send2("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")})` });
  await sleep(4000);
  const r = await send2("Runtime.evaluate", { expression: `(() => ({ bodyText: document.body.innerText.slice(0, 200) }))()`, returnByValue: true });
  out.chunkFail = r.result.value;
  ws2.close();
  await fetch(`http://127.0.0.1:9222/json/close/${created.id}`).catch(() => {});
} catch (e) {
  out.chunkFail = { error: String(e).slice(0, 300) };
}

// localStorage dinonaktifkan -> aplikasi tetap tampil (ide 45)
try {
  const created = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then((r) => r.json());
  const ws3 = new WebSocket(created.webSocketDebuggerUrl);
  let id3 = 1;
  const pend3 = new Map();
  const send3 = (method, params = {}) => new Promise((res, rej) => { const id = id3++; pend3.set(id, { res, rej }); ws3.send(JSON.stringify({ id, method, params })); });
  ws3.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pend3.has(msg.id)) {
      const { res, rej } = pend3.get(msg.id);
      pend3.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
    }
  };
  await new Promise((res, rej) => { ws3.onopen = res; ws3.onerror = rej; });
  await send3("Page.enable");
  await send3("Runtime.enable");
  await send3("Page.addScriptToEvaluateOnNewDocument", { source: `Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage dinonaktifkan'); } });` });
  await send3("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl)})` });
  await sleep(4000);
  const r = await send3("Runtime.evaluate", { expression: `(() => ({ bodyText: document.body.innerText.slice(0, 120), rootChildren: document.getElementById('root')?.children.length ?? -1 }))()`, returnByValue: true });
  out.storageDisabled = r.result.value;
  ws3.close();
  await fetch(`http://127.0.0.1:9222/json/close/${created.id}`).catch(() => {});
} catch (e) {
  out.storageDisabled = { error: String(e).slice(0, 300) };
}

writeFileSync(`${outDir}/s433-verify.json`, JSON.stringify(out, null, 2));
console.log("VERIFY DONE", JSON.stringify(out));
process.exit(0);
