// Uji ulang CDP s464 F76: pilih nominal dulu agar baris .pay muncul.
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
const keyEvent = async (type, key, code, vk, text) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
const pressEnter = async () => { await keyEvent("keyDown", "Enter", "Enter", 13, "\r"); await keyEvent("keyUp", "Enter", "Enter", 13); await sleep(350); };
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(400);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`);
await sleep(2200);
await safe("F76-enter-metode", async () => {
  const pilih = await evalJs(`(() => { const n = document.querySelector('.nom'); if (!n) return 'TIDAK ADA .nom'; n.click(); return n.textContent.trim().slice(0, 30); })()`);
  await sleep(600);
  const diag = await evalJs(`(() => { const all = [...document.querySelectorAll('.pay')]; return { jumlahPay: all.length, jumlahOn: all.filter(x => x.classList.contains('on')).length, jumlahDisabled: all.filter(x => x.disabled).length, kandidat: all.filter(x => !x.classList.contains('on') && !x.disabled).length }; })()`);
  const sebelum = await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find(x => !x.classList.contains('on') && !x.disabled); return b ? { teks: b.textContent.trim().slice(0, 24), pressed: b.getAttribute('aria-pressed') } : null; })()`);
  const fokus = await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find(x => !x.classList.contains('on') && !x.disabled); if (!b) return 'TIDAK ADA KANDIDAT'; b.focus(); return document.activeElement === b ? 'ok' : 'FOKUS GAGAL'; })()`);
  await sleep(200);
  await pressEnter();
  const sesudah = await evalJs(`(() => { const b = [...document.querySelectorAll('.pay')].find(x => x.getAttribute('aria-pressed') === 'true'); return b ? { teks: b.textContent.trim().slice(0, 24), pressed: b.getAttribute('aria-pressed') } : null; })()`);
  return { nominalDipilih: pilih, diag, sebelum, fokus, sesudah, terpilih: !!(sebelum && sesudah && sesudah.teks === sebelum.teks) };
});
console.log("SELESAI-F76");
process.exit(0);
