// CDP batch s001 (lanjutan): seed 1 order lalu ukur halaman Sukses asli + Genshin 320px.
// Penggunaan: node scripts/cdp-s001-success.mjs <wsUrl> <width> <baseUrl> <outDir>
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

await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl)})` });
await sleep(2500);
// Seed order PLN (punya token 20 digit) + voucher Steam
await evalJs(`localStorage.setItem("rosdi_orders", JSON.stringify([
  { ref: "RSD-TEST01", kind: "pln", product: "Token PLN", item: "Token 50.000", qty: 1, target: "54321098765", base: 52500, fee: 250, disc: 0, total: 52750, method: "QRIS", time: Date.now(), status: "Diproses", email: "", wa: "", token: "1234 5678 9012 3456 7890" },
  { ref: "RSD-TEST02", kind: "voucher", product: "Steam Wallet IDR", item: "Steam Wallet 60.000", qty: 1, target: "a@b.co", base: 63000, fee: 0, disc: 0, total: 63000, method: "QRIS", time: Date.now(), status: "Diproses", email: "a@b.co", wa: "", token: null }
])); 'seeded'`);

const measure = () => evalJs(`(() => {
  const de = document.documentElement;
  const vw = window.innerWidth;
  const bad = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") return;
      bad.push({ tag: el.tagName.toLowerCase(), cls: (el.className || "").toString().slice(0, 30), text: (el.textContent || "").trim().slice(0, 40), right: Math.round(r.right) });
    }
  });
  const btns = [...document.querySelectorAll(".step button")].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 20), top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
  const footer = document.querySelector("footer.site");
  const fr = footer ? footer.getBoundingClientRect() : null;
  return { vw, scrollW: de.scrollWidth, scrollH: de.scrollHeight, hasHOverflow: de.scrollWidth > vw + 0.5, offenders: bad.slice(0, 10), offenderCount: bad.length, buttons: btns, footerTop: fr ? Math.round(fr.top + window.scrollY) : null, innerH: window.innerHeight };
})()`);

const results = {};
for (const [name, hash] of [["sukses-pln", "#/sukses/RSD-TEST01"], ["sukses-voucher", "#/sukses/RSD-TEST02"], ["game-genshin", "#/game/genshin-impact"], ["game-valorant-long", "#/game/valorant"]]) {
  await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`);
  await sleep(1200);
  results[name] = await measure();
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${name}-${width}.png`, Buffer.from(shot.data, "base64"));
}
writeFileSync(`${outDir}/metrics-success-${width}.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
ws.close();
