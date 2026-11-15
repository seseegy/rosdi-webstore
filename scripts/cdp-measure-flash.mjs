// Ukur geometri kartu flash sale di lebar tertentu via CDP.
// Dipakai Siklus 72: sinkron Figma mobile dengan badge-wrap Siklus 71 —
// butuh posisi badge/kartu/nama yang sebenarnya di render kode, bukan tebakan.
// Penggunaan: node scripts/cdp-measure-flash.mjs <wsUrl> <width> <outPrefix>
// Menulis <outPrefix>.json + <outPrefix>.png (screenshot viewport atas).
import { writeFileSync } from "node:fs";

const [wsUrl, widthArg, outPrefix] = process.argv.slice(2);
if (!wsUrl || !widthArg || !outPrefix) {
  console.error("usage: cdp-measure-flash.mjs <wsUrl> <width> <outPrefix>");
  process.exit(2);
}
const width = Number(widthArg);
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
  width, height: 1000, deviceScaleFactor: 1, mobile: true,
});
await send("Runtime.evaluate", {
  expression: `location.assign("http://127.0.0.1:4173/")`,
});
await sleep(2500);

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true }).then((r) => r.result.value);

const m = await evalJs(`(() => {
  const r = (el) => { const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const cards = [...document.querySelectorAll("#katalog .grid.c2 > a.card")];
  return { innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
    cards: cards.map((c) => {
      const row = c.children[0];
      const tile = row.querySelector(".tile");
      const nameDiv = row.querySelector("div:not(.tile)");
      const badge = row.querySelector(".badge");
      const priceRow = c.children[1];
      const prog = c.querySelector(".progress");
      const sold = c.querySelectorAll(".p-sub")[1];
      const cr = r(c);
      const rel = (el) => el ? { ...r(el), rx: +(r(el).x - cr.x).toFixed(1), ry: +(r(el).y - cr.y).toFixed(1) } : null;
      return { card: cr, row: rel(row), tile: rel(tile),
        name: nameDiv ? { ...rel(nameDiv), text: nameDiv.textContent.trim().slice(0, 30),
          nameH: nameDiv.children[0] ? +nameDiv.children[0].getBoundingClientRect().height.toFixed(1) : null } : null,
        badge: rel(badge), priceRow: rel(priceRow), progress: rel(prog), sold: rel(sold) };
    }) };
})()`);
writeFileSync(`${outPrefix}.json`, JSON.stringify(m, null, 2));
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(`${outPrefix}.png`, Buffer.from(shot.data, "base64"));
console.log(JSON.stringify(m, null, 2));
process.exit(0);
