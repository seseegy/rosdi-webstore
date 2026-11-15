// Cek visual 320px via CDP terhadap Chrome headless lokal.
// Dipakai Siklus 71: Chrome terkelola butuh kebijakan WebGL (file + sha256)
// dan hanya bertahan hidup bila dijalankan dengan --remote-debugging-port.
// Penggunaan: node scripts/cdp-320-check.mjs <wsUrl> <url> <outPrefix>
// Menulis <outPrefix>.png + <outPrefix>.json (ukuran + elemen meluber).
import { writeFileSync } from "node:fs";

const [wsUrl, url, outPrefix] = process.argv.slice(2);
if (!wsUrl || !url || !outPrefix) {
  console.error("usage: cdp-320-check.mjs <wsUrl> <url> <outPrefix>");
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
  width: 320,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: true,
});
// Navigasi lewat location.assign dari halaman itu sendiri (bukan Page.navigate
// via CDP): navigasi CDP dianggap berasal dari halaman publik (DevTools
// frontend) sehingga kena ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS;
// dari origin lokal (file:// lalu 127.0.0.1) navigasi lokal→lokal diizinkan.
await send("Runtime.evaluate", {
  expression: `location.assign(${JSON.stringify(url)})`,
});
await sleep(2500); // biarkan React render + font

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true }).then((r) => r.result.value);

const metrics = await evalJs(`(() => {
  const de = document.documentElement;
  const vw = window.innerWidth;
  const bad = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" && r.right <= vw + 0.5) return;
      bad.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined ? "" : el.className || "").toString().slice(0, 40),
        text: (el.textContent || "").trim().slice(0, 40),
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
      });
    }
  });
  return {
    innerWidth: vw,
    scrollWidth: de.scrollWidth,
    scrollHeight: de.scrollHeight,
    bodyScrollWidth: document.body.scrollWidth,
    hasHOverflow: de.scrollWidth > vw + 0.5,
    offenders: bad.slice(0, 25),
    offenderCount: bad.length,
    title: document.title,
    h1: (document.querySelector("h1") || {}).textContent || null,
  };
})()`);

const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(outPrefix + ".png", Buffer.from(shot.data, "base64"));
writeFileSync(outPrefix + ".json", JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));
ws.close();
