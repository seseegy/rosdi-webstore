// Diagnosis kunci scroll modal (ide 58): ukur SAAT modal terbuka, tanpa menutup.
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
await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 560 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
const R = await evalJs(`(async () => {
  const out = {};
  out.scrollingElement = document.scrollingElement?.tagName;
  out.bodyScrollH = document.body.scrollHeight;
  out.docScrollH = document.documentElement.scrollHeight;
  window.scrollTo(0, 500);
  await new Promise((r) => setTimeout(r, 600));
  out.yBeforeClick = window.scrollY;
  const b = [...document.querySelectorAll('.header-actions .btn')].find((e) => e.textContent.trim() === 'Masuk');
  out.btnFound = !!b;
  b?.focus(); b?.click();
  await new Promise((r) => setTimeout(r, 500));
  out.modalOpen = !!document.querySelector('.modal[role=dialog]');
  out.inlineOverflow = document.documentElement.style.overflow;
  out.computedOverflow = getComputedStyle(document.documentElement).overflow;
  out.yAtOpen = window.scrollY;
  window.scrollTo(0, 900);
  await new Promise((r) => setTimeout(r, 700));
  out.yAfterAttempt = window.scrollY;
  out.bodyOverflowInline = document.body.style.overflow;
  // coba scroll via documentElement langsung
  document.documentElement.scrollTop = 200;
  await new Promise((r) => setTimeout(r, 300));
  out.yAfterDocElScrollTop = window.scrollY;
  return out;
})()`);
writeFileSync(`${outDir}/s431d-${width}.json`, JSON.stringify({ 58: R }, null, 2));
console.log("DIAGNOSIS", JSON.stringify(R));
process.exit(0);
