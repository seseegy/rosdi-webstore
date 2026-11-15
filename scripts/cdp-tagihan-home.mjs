// cdp-tagihan-home.mjs — Tahap 4: verifikasi integrasi Beranda (kartu +
// chip Tagihan, pencarian, judul seksi, hero) via CDP.
// Penggunaan: node scripts/cdp-tagihan-home.mjs <wsUrl> <width> <baseUrl> <outDir>
// Menulis <outDir>/home-tagihan-<width>.png + home-<width>.json.
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
if (!wsUrl || !widthArg || !baseUrl || !outDir) {
  console.error("usage: cdp-tagihan-home.mjs <wsUrl> <width> <baseUrl> <outDir>");
  process.exit(2);
}
const WIDTH = +widthArg;
mkdirSync(outDir, { recursive: true });

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
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: true,
});
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true }).then((r) => r.result.value);
const shot = async (name) => {
  const s = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(s.data, "base64"));
};

const OFFENDERS_JS = `(() => {
  const vw = window.innerWidth;
  const bad = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5) && !el.closest(".chips")) {
      bad.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || "").trim().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right) });
    }
  });
  return { vw, scrollWidth: document.documentElement.scrollWidth, offenders: bad.slice(0, 20), offenderCount: bad.length };
})()`;
const SET_INPUT_JS = (sel, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`;

await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl + "#/")})` });
await sleep(2000);
const home = await evalJs(`(() => {
  const h2s = [...document.querySelectorAll(".sec-head h2")].map((h) => h.textContent);
  const chips = [...document.querySelectorAll(".chip")].map((c) => c.textContent);
  const card = [...document.querySelectorAll("a.card")].find((c) => c.querySelector(".p-name")?.textContent === "Tagihan Pascabayar");
  return {
    hero: document.querySelector(".hero p")?.textContent || null,
    h2s,
    chips,
    tagihanCard: card ? {
      href: card.getAttribute("href"),
      name: card.querySelector(".p-name")?.textContent || null,
      sub: card.querySelector(".p-sub")?.textContent || null,
      from: card.querySelector(".p-from")?.textContent || null,
      tile: card.querySelector(".tile")?.textContent || null,
    } : null,
  };
})()`);
// Cari "bpjs": kartu Tagihan harus tampil; cari "zzz": empty-state.
await evalJs(SET_INPUT_JS(".searchbar input", "bpjs"));
await sleep(500);
const searchBpjs = await evalJs(`(() => ({
  tagihanVisible: [...document.querySelectorAll("a.card")].some((c) => c.querySelector(".p-name")?.textContent === "Tagihan Pascabayar"),
  emptyVisible: !!document.querySelector(".empty"),
}))()`);
await evalJs(SET_INPUT_JS(".searchbar input", "zzz"));
await sleep(500);
const searchZzz = await evalJs(`(() => ({
  tagihanVisible: [...document.querySelectorAll("a.card")].some((c) => c.querySelector(".p-name")?.textContent === "Tagihan Pascabayar"),
  emptyVisible: !!document.querySelector(".empty"),
  emptyText: document.querySelector(".empty")?.textContent || null,
}))()`);
await evalJs(SET_INPUT_JS(".searchbar input", ""));
await sleep(500);
const ov = await evalJs(OFFENDERS_JS);
await evalJs(`(() => { document.getElementById("katalog")?.scrollIntoView(); return true; })()`);
await sleep(400);
await shot(`home-tagihan-${WIDTH}`);
const out = { width: WIDTH, home, searchBpjs, searchZzz, ...ov };
writeFileSync(`${outDir}/home-${WIDTH}.json`, JSON.stringify(out, null, 2));
console.log("HOME-TAGIHAN", JSON.stringify(out));
ws.close();
console.log("DONE");
