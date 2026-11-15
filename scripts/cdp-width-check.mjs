// cdp-width-check.mjs — ukur overflow badge flash + screenshot pada lebar tertentu.
// Dipakai Siklus 71 untuk cek visual 320/360/390px via CDP.
// Penggunaan: node scripts/cdp-width-check.mjs <wsUrl> <width> <url> <outPrefix>
// Menulis <outPrefix>.png + mencetak JSON { vw, badges[], scrollW }.
// Navigasi lewat location.assign dari halaman itu sendiri (bukan Page.navigate
// via CDP): navigasi CDP dianggap berasal dari halaman publik (DevTools
// frontend) sehingga kena ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS;
// dari origin lokal navigasi lokal→lokal diizinkan. Tab harus sudah berada
// di origin lokal (lihat file:///tmp/go.html yang me-redirect ke preview).
import { writeFileSync } from "node:fs";

const [wsUrl, widthArg, url, outPrefix] = process.argv.slice(2);
if (!wsUrl || !widthArg || !url || !outPrefix) {
  console.error("usage: cdp-width-check.mjs <wsUrl> <width> <url> <outPrefix>");
  process.exit(2);
}

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
  width: +widthArg,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: true,
});
await send("Runtime.evaluate", {
  expression: `location.assign(${JSON.stringify(url)})`,
});
await sleep(2500);

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true }).then((r) => r.result.value);

const metrics = await evalJs(`(() => {
  const vw = window.innerWidth;
  const badges = [...document.querySelectorAll(".badge")].map((b) => {
    const r = b.getBoundingClientRect();
    const card = b.closest("a.card").getBoundingClientRect();
    return {
      badgeR: Math.round(r.right),
      cardR: Math.round(card.right),
      overCard: Math.round(r.right - card.right),
      overVp: Math.round(r.right - vw),
    };
  });
  return { vw, badges, scrollW: document.documentElement.scrollWidth };
})()`);
console.log(JSON.stringify(metrics));

const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(outPrefix + ".png", Buffer.from(shot.data, "base64"));
ws.close();
