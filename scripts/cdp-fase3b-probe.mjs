// Probe Fase 3b — susulan: M (HP border, rute operator), N (select Genshin),
// D (hover e-wallet, scroll dulu), I (stagger grid via remount pencarian),
// P (reduced-motion), Q (chip footer).
import { mkdirSync, writeFileSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rec = (id, data) => { console.log(id, JSON.stringify(data)); };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; });
const setMetrics = async (w, h = 844) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(1500); };
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.data, "base64")); return name; };
const setInput = async (selector, value) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'no-el'; const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
const mouseTo = async (selector) => {
  const r = await evalJs(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  if (!r) return null;
  await sleep(150);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(r.x), y: Math.round(r.y), button: "none" });
  await sleep(80);
  return r;
};

await setMetrics(390);

// ===== M. s461-1 border hijau HP valid (rute operator!) =====
await nav("#/pulsa/telkomsel");
rec("M-route-check", await evalJs(`(() => ({ hp: !!document.querySelector('#hp'), h1: document.querySelector('h1')?.textContent }))()`));
await setInput("#hp", "081234567890");
await sleep(300);
rec("M-hp-ok", await evalJs(`(() => { const el = document.querySelector('#hp'); const cs = getComputedStyle(el); return { cls: el.className, border: cs.borderColor, transition: cs.transitionDuration + ' ' + cs.transitionProperty }; })()`));
await setInput("#hp", "08123");
await sleep(300);
rec("M-hp-err", await evalJs(`(() => { const el = document.querySelector('#hp'); return { cls: el.className, border: getComputedStyle(el).borderColor }; })()`));

// ===== N. s457-3 select Server Genshin pakai token field =====
await nav("#/game/genshin-impact");
rec("N-server-select", await evalJs(`(() => { const s = document.querySelector('#server'); if (!s) return null; const cs = getComputedStyle(s); return { bg: cs.backgroundColor, border: cs.borderColor, value: s.value, options: [...s.options].map((o) => o.text) }; })()`));

// ===== D. s459-3 hover e-wallet (scroll dulu ke kartu) =====
await nav("#/");
await mouseTo(".grid.c3 .card[href='#/emoney/dana']");
const d1 = await evalJs(`(() => { const c = document.querySelector(".grid.c3 .card[href='#/emoney/dana']"); return c ? getComputedStyle(c).borderColor : null; })()`);
await sleep(75);
const d2 = await evalJs(`(() => { const c = document.querySelector(".grid.c3 .card[href='#/emoney/dana']"); return c ? getComputedStyle(c).borderColor : null; })()`);
await sleep(200);
const d3 = await evalJs(`(() => { const c = document.querySelector(".grid.c3 .card[href='#/emoney/dana']"); return c ? getComputedStyle(c).borderColor : null; })()`);
rec("D-ewallet-hover-border", { t0: d1, t75: d2, t275: d3 });
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 10, y: 10, button: "none" });

// ===== I. s466-2 stagger grid via remount pencarian (tanpa navigasi) =====
await setInput(".searchbar input", "zzzzzz");
await sleep(400);
await setInput(".searchbar input", "");
const gridTrace = [];
for (let i = 0; i < 8; i++) {
  gridTrace.push(await evalJs(`(() => [...document.querySelectorAll('.grid .card')].slice(0, 6).map((el) => +(+getComputedStyle(el).opacity).toFixed(2)))()`));
  await sleep(90);
}
rec("I-grid-stagger-remount", gridTrace);
await shot("I-grid-stagger-mid");

// ===== P. reduced-motion =====
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`); await sleep(1200);
rec("P-reduced-motion", await evalJs(`(() => { const card = document.querySelector('.grid .card'); const nom = document.querySelector('.nom-grid .nom'); const sold = document.querySelector('.sold-num'); return { homeCardAnim: card ? getComputedStyle(card).animationName : 'no-home', nomAnim: nom ? getComputedStyle(nom).animationName : null, nomOpacity: nom ? +(+getComputedStyle(nom).opacity).toFixed(2) : null }; })()`));
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/")}); 'ok'`); await sleep(1200);
rec("P-reduced-motion-home", await evalJs(`(() => { const card = document.querySelector('.grid .card'); const sold = document.querySelector('.sold-num'); return { cardAnim: card ? getComputedStyle(card).animationName : null, soldAfter: sold ? getComputedStyle(sold, '::after').content : null, soldVal: sold ? getComputedStyle(sold).getPropertyValue('--sold').trim() : null }; })()`));
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });

// ===== Q. s459-4 chip footer display-only =====
rec("Q-footer-chips", await evalJs(`(() => { const chips = [...document.querySelectorAll('.pay-chips span')]; return { count: chips.length, allSpan: chips.every((c) => c.tagName === 'SPAN'), anyFocusable: chips.some((c) => c.tabIndex >= 0) }; })()`));

console.log("FASE3B-PROBE-SELESAI");
