// Follow-up CDP s453: ulangi pengukuran yang selector-nya salah di run pertama
// (A3 Cek/Pakai, A6, A8, A9, A10-flink, F52/53/58-success, F53-histori,
// H78 Masuk, H80-lengkap, I81, I83-c3, I86, I88, J98 reload asli, J99).
// PENTING: JANGAN clear localStorage — order run pertama dibutuhkan untuk Success.
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg, 10);
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
const setMetrics = (w, h, mobile) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 500) }); } };
const rectOf = (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; })()`);
const rectOfText = (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; const r=el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right)}; })()`);
const scrollToText = (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.scrollIntoView({block:'center'}); return 'ok'; })()`);
const mouseTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(x), y: Math.round(y) }); await sleep(300); };
const hoverText = async (sel, text) => { const r = await rectOfText(sel, text); if (r === "NO-EL") return "NO-EL"; await mouseTo(r.x + r.w / 2, r.y + r.h / 2); return "ok"; };
const cs = (sel, props) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const c = getComputedStyle(el); const o = {}; ${JSON.stringify(props)}.forEach(p => o[p] = c[p]); return o; })()`);
const csText = (sel, text, props) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; const c=getComputedStyle(el); const o={}; ${JSON.stringify(props)}.forEach(p=>o[p]=c[p]); return o; })()`);
const key = async (k, code, vk) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); await sleep(150); };
const tab = () => key("Tab", "Tab", 9);
const enter = () => key("Enter", "Enter", 13);
const space = () => key(" ", "Space", 32);
const activeEl = () => evalJs(`(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; return { tag: a.tagName, cls: (a.className||'').toString().slice(0,30), text: (a.textContent||'').trim().slice(0,30), aria: a.getAttribute('aria-label') || '', id: a.id || '', href: (a.getAttribute('href')||'').slice(0,40) }; })()`);
const typeText = async (text) => { await send("Input.insertText", { text }); await sleep(200); };
const tabUntil = async (pred, max = 70) => {
  const trace = [];
  for (let i = 0; i < max; i++) {
    const a = await activeEl();
    trace.push(a === "BODY" ? "BODY" : (a.id || a.aria || a.text || a.tag));
    if (a !== "BODY" && pred(a)) return { found: true, tabs: i, trace: trace.slice(-6) };
    await tab();
  }
  return { found: false, tabs: max, trace: trace.slice(-8) };
};
const overflow = async () => evalJs(`({ docW: document.documentElement.scrollWidth, winW: window.innerWidth, hOverflow: document.documentElement.scrollWidth > window.innerWidth })`);

await setMetrics(WIDTH, 900, WIDTH < 500);
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);

if (WIDTH === 360) {
  await safe("I81b", async () => {
    await goHash("#/cek/RSD-DEMO1234");
    const card = await rectOf(".cek-result");
    const ov = await overflow();
    const cardText = await evalJs(`(() => { const c = document.querySelector('.cek-result'); return c ? c.innerText.slice(0, 200) : 'NO-CARD'; })()`);
    return { card, overflow: ov, cardText };
  });
}

if (WIDTH === 390) {
  // A3 ulang: tombol Cek (selector benar) + Pakai (scroll dulu)
  await safe("A3b", async () => {
    const out = {};
    await goHash("#/cek");
    await scrollToText(".btn", "Cek");
    await sleep(400);
    out.cekBefore = await csText(".btn", "Cek", ["backgroundColor"]);
    await hoverText(".btn", "Cek");
    out.cekAfter = await csText(".btn", "Cek", ["backgroundColor"]);
    out.cekHoverMatch = await evalJs(`!!document.querySelector('.btn:hover')`);
    await goHash("#/game/mobile-legends");
    await setInput("#uid", "12345678");
    await setInput("#zone", "1234");
    await clickText(".nom", "172 Diamonds");
    await setInput('input[aria-label="Kode promo"]', "ROSDI10");
    await scrollToText(".btn", "Pakai");
    await sleep(400);
    out.pakaiBefore = await csText(".btn", "Pakai", ["backgroundColor"]);
    await hoverText(".btn", "Pakai");
    out.pakaiAfter = await csText(".btn", "Pakai", ["backgroundColor"]);
    out.pakaiHoverMatch = await evalJs(`(() => { const b=[...document.querySelectorAll('.btn')].find(e=>e.textContent.trim()==='Pakai'); return b ? b.matches(':hover') : 'NO-BTN'; })()`);
    return out;
  });

  // A6 ulang: .pay-chips span
  await safe("A6b", async () => {
    await goHash("#/");
    await scrollToText(".pay-chips span", "QRIS");
    await sleep(400);
    const before = await csText(".pay-chips span", "QRIS", ["color", "backgroundColor"]);
    await hoverText(".pay-chips span", "QRIS");
    const after = await csText(".pay-chips span", "QRIS", ["color", "backgroundColor"]);
    return { before, after, transition: await csText(".pay-chips span", "QRIS", ["transition"]) };
  });

  // A8 ulang: :active hero — cek selector :active + transform saat ditekan
  await safe("A8b", async () => {
    await goHash("#/");
    await evalJs(`window.scrollTo(0, 0); 'ok'`);
    const r = await rectOfText(".hero .btn", "Mulai top up");
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2), button: "left", clickCount: 1 });
    await sleep(80);
    const activeMatch = await evalJs(`(() => { const b=[...document.querySelectorAll('.hero .btn')].find(e=>e.textContent.includes('Mulai top up')); return b ? { active: b.matches(':active'), transform: getComputedStyle(b).transform } : 'NO-BTN'; })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2), button: "left", clickCount: 1 });
    await sleep(200);
    return { rect: r, activeMatch };
  });

  // A10 ulang: flink hover (scroll dulu)
  await safe("A10b", async () => {
    await goHash("#/");
    await scrollToText(".flink", "Syarat & Ketentuan");
    await sleep(400);
    const before = await csText(".flink", "Syarat & Ketentuan", ["color"]);
    await hoverText(".flink", "Syarat & Ketentuan");
    const after = await csText(".flink", "Syarat & Ketentuan", ["color"]);
    const hoverMatch = await evalJs(`(() => { const b=[...document.querySelectorAll('.flink')].find(e=>e.textContent.includes('Syarat')); return b ? b.matches(':hover') : 'NO-BTN'; })()`);
    return { before, after, hoverMatch };
  });

  // F52/53/58 Success via navigasi langsung ke ref run pertama
  await safe("F-success", async () => {
    const stored = await evalJs(`(() => { try { return JSON.parse(localStorage.getItem('rosdi_orders') || '[]').map(o => o.ref); } catch (e) { return 'ERR'; } })()`);
    const read = async (ref) => {
      await goHash("#/sukses/" + ref);
      return await evalJs(`(() => { const s = document.querySelector('.step.success-in'); if (!s) { const e = document.querySelector('.empty'); return e ? 'EMPTY: ' + e.textContent : 'NO-SUCCESS-CARD'; } return s.innerText; })()`);
    };
    return {
      stored,
      f52_genshin: await read("RSD-ERTRHC93HL9G"),
      f53_mlbb10x: await read("RSD-ERTU9X85EZCG"),
      f58_pulsa: await read("RSD-ERU39M9679BB"),
    };
  });

  // F53 histori: baris pertama riwayat di Cek
  await safe("F53-hist", async () => {
    await goHash("#/cek");
    return await evalJs(`(() => { const rows = [...document.querySelectorAll('.hist-in .sum-row')]; if (!rows.length) return 'NO-HIST-ROWS'; return rows.slice(0, 2).map(r => r.innerText.replace(/\\n/g, ' | ')); })()`);
  });

  // H78 ulang: outline tombol Masuk (class .btn, bukan .btn.ghost)
  await safe("H78b", async () => {
    await goHash("#/");
    await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
    const masuk = await tabUntil((a) => a.text === "Masuk");
    const outline = masuk.found ? await csText(".btn", "Masuk", ["outlineWidth", "outlineStyle", "outlineColor"]) : "NOT-FOUND";
    return { masuk, outline };
  });

  // H80 lengkap: form lengkap lalu Tab dari promo -> Pakai -> Beli
  await safe("H80b", async () => {
    await goHash("#/pulsa/telkomsel");
    await setInput("#hp", "081234567890");
    await clickText(".nom", "Pulsa 5.000");
    await clickText(".pay", "QRIS");
    await setInput('input[aria-label="Kode promo"]', "");
    const promo = await tabUntil((a) => a.aria === "Kode promo", 40);
    const seq = [];
    for (let i = 0; i < 8; i++) {
      await tab();
      const a = await activeEl();
      seq.push(a === "BODY" ? "BODY" : (a.id || a.aria || a.text || a.tag));
      if (a !== "BODY" && a.text === "Beli") break;
    }
    return { promo, afterPromo: seq };
  });

  // J98 ulang: reload ASLI via location.reload()
  await safe("J98b", async () => {
    await goHash("#/game/mobile-legends");
    await setInput("#uid", "12345678");
    await setInput("#zone", "1234");
    const before = await evalJs(`({ uid: document.querySelector('#uid').value, zone: document.querySelector('#zone').value, lsKeys: Object.keys(localStorage) })`);
    await evalJs(`location.reload(); 'ok'`);
    await sleep(2500);
    const after = await evalJs(`({ uid: document.querySelector('#uid').value, zone: document.querySelector('#zone').value, hash: location.hash, lsKeys: Object.keys(localStorage) })`);
    return { before, after };
  });

  // J99 ulang: perbaikan bug location (pakai evalJs)
  await safe("J99b", async () => {
    await goHash("#/");
    await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
    const toCard = await tabUntil((a) => (a.href || "").includes("#/game/mobile-legends"), 80);
    const stepped = { toCard };
    if (toCard.found) {
      await enter();
      await sleep(1500);
      stepped.onGamePage = await evalJs(`location.hash`);
      const toUid = await tabUntil((a) => a.id === "uid", 30);
      stepped.toUid = toUid;
      if (toUid.found) { await typeText("12345678"); }
      const toZone = await tabUntil((a) => a.id === "zone", 10);
      stepped.toZone = toZone;
      if (toZone.found) { await typeText("1234"); }
      const toNom = await tabUntil((a) => (a.text || "") === "172 Diamonds", 30);
      stepped.toNom = toNom;
      if (toNom.found) { await space(); await sleep(300); }
      const toPay = await tabUntil((a) => (a.text || "").includes("QRIS"), 40);
      stepped.toPay = toPay;
      if (toPay.found) { await space(); await sleep(300); }
      const toBuy = await tabUntil((a) => a.text === "Beli", 40);
      stepped.toBuy = toBuy;
      if (toBuy.found) { await enter(); await sleep(1500); }
      stepped.finalHash = await evalJs(`location.hash`);
      stepped.successShown = await evalJs(`!!document.querySelector('.step.success-in')`);
      stepped.successText = await evalJs(`(() => { const s = document.querySelector('.step.success-in'); return s ? s.innerText.slice(0, 300) : 'NO-SUCCESS'; })()`);
    }
    return stepped;
  });
}

if (WIDTH === 412) {
  await safe("I83b", async () => {
    await goHash("#/");
    const grids = await evalJs(`(() => { return [...document.querySelectorAll('.grid')].map(g => { const cs=[...g.querySelectorAll('.card')]; const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length; const maxR = cs.length ? Math.round(Math.max(...cs.map(e=>e.getBoundingClientRect().right))) : 0; return { cls: g.className, cols, cards: cs.length, maxRight: maxR }; }); })()`);
    return { grids, overflow: await overflow() };
  });
}

if (WIDTH === 540) {
  await safe("I86b", async () => {
    await goHash("#/");
    const ov = await overflow();
    const header = await rectOf(".header-in");
    const nav = await cs("nav.main", ["display"]);
    const masuk = await rectOfText(".btn", "Masuk");
    const logo = await rectOf(".logo");
    return { overflow: ov, headerIn: header, navMainDisplay: nav, masukBtn: masuk, logo };
  });
}

if (WIDTH === 640) {
  await safe("I88b", async () => {
    await goHash("#/cek/RSD-DEMO1234");
    const card = await rectOf(".cek-result");
    const ov = await overflow();
    const cardText = await evalJs(`(() => { const c = document.querySelector('.cek-result'); return c ? c.innerText.slice(0, 200) : 'NO-CARD'; })()`);
    return { card, overflow: ov, cardText };
  });
}

if (WIDTH === 1280) {
  await safe("A9b", async () => {
    await goHash("#/");
    await scrollToText(".card", "Pulsa Reguler");
    await sleep(400);
    const before = await csText(".card", "Pulsa Reguler", ["borderColor"]);
    await hoverText(".card", "Pulsa Reguler");
    const after = await csText(".card", "Pulsa Reguler", ["borderColor"]);
    const hoverMatch = await evalJs(`(() => { const b=[...document.querySelectorAll('.card')].find(e=>e.textContent.includes('Pulsa Reguler')); return b ? b.matches(':hover') : 'NO-CARD'; })()`);
    return { before, after, hoverMatch };
  });
}

writeFileSync(`${outDir}/s453-cdpb-${WIDTH}.json`, JSON.stringify({ width: WIDTH, ...R }, null, 2));
ws.close();
console.log("DONE", WIDTH);
