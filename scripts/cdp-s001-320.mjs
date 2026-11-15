// Ukur CDP batch s001: semua rute utama pada lebar 320px (dan 390px sebagai
// pembanding) — elemen meluber, tinggi target sentuh, screenshot per rute.
// Penggunaan: node scripts/cdp-s001-320.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
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
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: true });

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });

const ROUTES = [
  ["home", ""],
  ["game-mlbb", "#/game/mobile-legends"],
  ["game-valorant", "#/game/valorant"],
  ["pulsa-telkomsel", "#/pulsa/telkomsel"],
  ["pln", "#/pln"],
  ["emoney-dana", "#/emoney/dana"],
  ["voucher-steam", "#/voucher/steam-wallet"],
  ["cek", "#/cek"],
  ["sukses-kosong", "#/sukses/RSD-DEMO1234"],
];

const results = {};
await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl)})` });
await sleep(2500);
for (const [name, hash] of ROUTES) {
  await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`);
  await sleep(1200);
  const m = await evalJs(`(() => {
    const de = document.documentElement;
    const vw = window.innerWidth;
    const bad = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed") return;
        bad.push({ tag: el.tagName.toLowerCase(), cls: (el.className || "").toString().slice(0, 40), text: (el.textContent || "").trim().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) });
      }
    });
    const size = (sel) => [...document.querySelectorAll(sel)].slice(0, 12).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || "").trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; });
    const firstChip = document.querySelector(".chips .chip");
    const chipsEl = document.querySelector(".chips");
    return {
      vw, scrollW: de.scrollWidth, scrollH: de.scrollHeight, hasHOverflow: de.scrollWidth > vw + 0.5,
      offenderCount: bad.length, offenders: bad.slice(0, 15),
      h1: (document.querySelector("h1") || {}).textContent || null,
      nom: size(".nom"), chips: size(".chips .chip"), tabs: size(".tab"),
      payRows: size(".pay").slice(0, 3),
      chipsScroll: chipsEl ? { scrollW: chipsEl.scrollWidth, clientW: chipsEl.clientWidth, firstChipRight: firstChip ? Math.round(firstChip.getBoundingClientRect().right) : null } : null,
      headerH: document.querySelector("header.site") ? Math.round(document.querySelector("header.site").getBoundingClientRect().height) : null,
      mobileBar: document.querySelector(".mobile-bar") ? { visible: getComputedStyle(document.querySelector(".mobile-bar")).display, h: Math.round(document.querySelector(".mobile-bar").getBoundingClientRect().height) } : null,
    };
  })()`);
  results[name] = m;
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${name}-${width}.png`, Buffer.from(shot.data, "base64"));
}
writeFileSync(`${outDir}/metrics-${width}.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
ws.close();
