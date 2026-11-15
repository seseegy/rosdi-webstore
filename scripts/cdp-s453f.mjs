// Micro-probe terakhir s453 (tanpa clear localStorage):
// F54-buy (GAMER5 + Success), H77-79 Dark, J91 UID "123", J92 email voucher
// tak valid, J93 semua note ringkasan saat metode belum dipilih.
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, _widthArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; console.log(id, JSON.stringify(data)); };

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
await send("Network.enable");
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1500); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickSel = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 500) }); } };
const cs = (sel, props) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const c = getComputedStyle(el); const o = {}; ${JSON.stringify(props)}.forEach(p => o[p] = c[p]); return o; })()`);
const csText = (sel, text, props) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; const c=getComputedStyle(el); const o={}; ${JSON.stringify(props)}.forEach(p=>o[p]=c[p]); return o; })()`);
const key = async (k, code, vk) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); await sleep(150); };
const tab = () => key("Tab", "Tab", 9);
const activeEl = () => evalJs(`(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; return { tag: a.tagName, cls: (a.className||'').toString().slice(0,30), text: (a.textContent||'').trim().slice(0,30), aria: a.getAttribute('aria-label') || '', id: a.id || '' }; })()`);
const tabUntil = async (pred, max = 70) => {
  for (let i = 0; i < max; i++) {
    const a = await activeEl();
    if (a !== "BODY" && pred(a)) return { found: true, tabs: i };
    await tab();
  }
  return { found: false, tabs: max };
};
const summaryNotes = () => evalJs(`(() => { const s = document.querySelector('.summary'); if (!s) return 'NO-SUMMARY'; return [...s.querySelectorAll('.note')].map(n => n.textContent.trim()); })()`);
const errMsgs = () => evalJs(`[...document.querySelectorAll('.err-msg')].map(e => e.textContent.trim())`);
const buyNow = async () => evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); if(!b) return 'NO-BTN'; const dis=b.disabled; if(!dis) b.click(); return {disabled: dis}; })()`);
const successText = () => evalJs(`(() => { const s = document.querySelector('.step.success-in'); if (!s) return 'NO-SUCCESS-CARD'; return s.innerText; })()`);

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);

// H77-79 Dark: alihkan tema ke Dark, ukur outline tiga tombol via Tab
await safe("H-dark", async () => {
  await goHash("#/");
  await clickSel('button[aria-label="Ganti tema"]');
  await sleep(500);
  const themeNow = await evalJs(`document.documentElement.getAttribute('data-theme') || document.body.className || getComputedStyle(document.documentElement).getPropertyValue('--bg')`);
  await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
  const theme = await tabUntil((a) => a.aria === "Ganti tema");
  const themeOutline = theme.found ? await cs('button[aria-label="Ganti tema"]', ["outlineWidth", "outlineStyle", "outlineColor"]) : "NOT-FOUND";
  const masuk = await tabUntil((a) => a.text === "Masuk");
  const masukOutline = masuk.found ? await csText(".btn", "Masuk", ["outlineWidth", "outlineStyle", "outlineColor"]) : "NOT-FOUND";
  await goHash("#/game/mobile-legends");
  await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
  const back = await tabUntil((a) => a.aria === "Kembali");
  const backOutline = back.found ? await cs(".crumb .back", ["outlineWidth", "outlineStyle", "outlineColor"]) : "NOT-FOUND";
  return { themeNow, theme, themeOutline, masuk, masukOutline, back, backOutline };
});

// J91: UID "123" — pesan error field + tombol Beli + note ringkasan
await safe("J91b", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "123");
  await setInput("#zone", "1234");
  await clickText(".nom", "172 Diamonds");
  await clickText(".pay", "QRIS");
  const btn = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { disabled: b.disabled, text: b.textContent.trim() }; })()`);
  return { btn, errMsgs: await errMsgs(), notes: await summaryNotes() };
});

// J92: email voucher "namamail.com" — diblokir + pesan error?
await safe("J92b", async () => {
  await goHash("#/voucher/google-play");
  await setInput("#vemail", "namamail.com");
  await clickText(".nom", "Google Play IDR 20.000");
  await clickText(".pay", "QRIS");
  const btn = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { disabled: b.disabled, text: b.textContent.trim() }; })()`);
  return { btn, errMsgs: await errMsgs(), notes: await summaryNotes() };
});

// J93: nominal dipilih, metode belum — semua note ringkasan
await safe("J93b", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await clickText(".nom", "172 Diamonds");
  const btn = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { disabled: b.disabled }; })()`);
  return { btn, notes: await summaryNotes() };
});

// F54-buy: qty 10 x 2195 + GAMER5, beli, baca Sukses
await safe("F54buy", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await clickText(".nom", "2195 Diamonds");
  for (let i = 0; i < 9; i++) { await clickSel('button[aria-label="Tambah"]'); await sleep(60); }
  await setInput('input[aria-label="Kode promo"]', "GAMER5");
  await clickText(".btn", "Pakai");
  await sleep(300);
  await clickText(".pay", "QRIS");
  const s = await evalJs(`(() => { const el = document.querySelector('.summary'); return el ? el.innerText : 'NO-SUMMARY'; })()`);
  const bought = await buyNow();
  await sleep(1200);
  return { summary: s, bought, success: await successText(), hash: await evalJs(`location.hash`) };
});

writeFileSync(`${outDir}/s453-cdpf-390.json`, JSON.stringify({ width: 390, ...R }, null, 2));
ws.close();
console.log("DONE 390");
