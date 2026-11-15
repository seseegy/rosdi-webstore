// Uji ulang CDP s464 G87b: seberapa parah potongan harga nominal di zoom 100/140/145%.
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
const rec = (id, data) => console.log(id, JSON.stringify(data));
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; });
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };
const measure = async () => evalJs(`(() => {
  const out = [];
  for (const el of document.querySelectorAll('.n-price')) {
    const nom = el.closest('.nom');
    const cs = getComputedStyle(el);
    const was = el.querySelector('.was');
    const csWas = was ? getComputedStyle(was) : null;
    const r = el.getBoundingClientRect(); const nr = nom.getBoundingClientRect();
    out.push({ txt: el.textContent.trim().slice(0, 34), cw: el.clientWidth, sw: el.scrollWidth, terpotong: el.scrollWidth > el.clientWidth + 1, whiteSpace: cs.whiteSpace, overflow: cs.overflow, meluberKartu: +(r.right - nr.right).toFixed(1), adaWas: !!was, wasWhiteSpace: csWas ? csWas.whiteSpace : null });
  }
  return out;
})()`);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`);
await sleep(2200);
await safe("G87b-z100", measure);
await evalJs(`document.documentElement.style.zoom = '140%'; 'ok'`); await sleep(600);
await safe("G87b-z140", measure);
await evalJs(`document.documentElement.style.zoom = '145%'; 'ok'`); await sleep(600);
await safe("G87b-z145", measure);
console.log("SELESAI-G87b");
process.exit(0);
