// Follow-up 3 CDP s453 — TANPA localStorage.clear() (order harus bertahan).
// 1) A8/A10/A3-Pakai dengan tunggu scroll halus selesai (html scroll-behavior:smooth).
// 2) J99 diagnostik: jejak Tab lengkap dari #zone + uji focus() langsung pada .nom/.pay.
// 3) Buy ulang F52, F53, F58 + baca Success (.step.success-in) + histori segera.
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
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1500); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickSel = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 500) }); } };
const rectOfText = (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; const r=el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right)}; })()`);
const scrollToText = (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.scrollIntoView({block:'center'}); return 'ok'; })()`);
const mouseTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(x), y: Math.round(y) }); await sleep(300); };
const csText = (sel, text, props) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; const c=getComputedStyle(el); const o={}; ${JSON.stringify(props)}.forEach(p=>o[p]=c[p]); return o; })()`);
const key = async (k, code, vk) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); await sleep(150); };
const tab = () => key("Tab", "Tab", 9);
const enter = () => key("Enter", "Enter", 13);
const space = () => key(" ", "Space", 32);
const activeEl = () => evalJs(`(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; return { tag: a.tagName, cls: (a.className||'').toString().slice(0,30), text: (a.textContent||'').trim().slice(0,50), aria: a.getAttribute('aria-label') || '', id: a.id || '', href: (a.getAttribute('href')||'').slice(0,40) }; })()`);
const typeText = async (text) => { await send("Input.insertText", { text }); await sleep(200); };
const waitScrollDone = async () => { for (let i = 0; i < 10; i++) { const y1 = await evalJs(`window.scrollY`); await sleep(200); const y2 = await evalJs(`window.scrollY`); if (y1 === y2) return y2; } return await evalJs(`window.scrollY`); };
const applyPromo = async (code) => { await setInput('input[aria-label="Kode promo"]', code); await clickText(".btn", "Pakai"); await sleep(300); };
const summaryText = () => evalJs(`(() => { const s = document.querySelector('.summary'); if (!s) return 'NO-SUMMARY'; return s.innerText; })()`);
const buyNow = async () => evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); if(!b) return 'NO-BTN'; const dis=b.disabled; if(!dis) b.click(); return {disabled: dis}; })()`);
const successText = () => evalJs(`(() => { const s = document.querySelector('.step.success-in'); if (!s) { const e = document.querySelector('.empty'); return e ? 'EMPTY: ' + e.textContent : 'NO-SUCCESS-CARD'; } return s.innerText; })()`);

await setMetrics(WIDTH, 900, WIDTH < 500);
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);

// ---- A8c: hero :active, scroll halus ditunggu sampai diam ----
await safe("A8c", async () => {
  await goHash("#/");
  await evalJs(`window.scrollTo(0, 0); 'ok'`);
  await waitScrollDone();
  const r = await rectOfText(".hero .btn", "Mulai top up");
  const inView = r.y >= 0 && r.y < 900;
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2), button: "left", clickCount: 1 });
  await sleep(80);
  const pressed = await evalJs(`(() => { const b=[...document.querySelectorAll('.hero .btn')].find(e=>e.textContent.includes('Mulai top up')); const el = document.elementFromPoint(${Math.round(r.x + r.w / 2)}, ${Math.round(r.y + r.h / 2)}); return b ? { active: b.matches(':active'), transform: getComputedStyle(b).transform, underMouse: el ? (el.tagName + '.' + (el.className||'').toString().slice(0,20) + ' "' + (el.textContent||'').trim().slice(0,20) + '"') : 'NONE' } : 'NO-BTN'; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2), button: "left", clickCount: 1 });
  await sleep(200);
  return { rect: r, inView, pressed };
});

// ---- A10c: flink hover, scroll ditunggu ----
await safe("A10c", async () => {
  await goHash("#/");
  await scrollToText(".flink", "Syarat & Ketentuan");
  await waitScrollDone();
  const r = await rectOfText(".flink", "Syarat & Ketentuan");
  const inView = r.y >= 0 && r.y < 900;
  const before = await csText(".flink", "Syarat & Ketentuan", ["color"]);
  await mouseTo(r.x + r.w / 2, r.y + r.h / 2);
  const after = await csText(".flink", "Syarat & Ketentuan", ["color"]);
  const hoverMatch = await evalJs(`(() => { const b=[...document.querySelectorAll('.flink')].find(e=>e.textContent.includes('Syarat')); return b ? b.matches(':hover') : 'NO-BTN'; })()`);
  return { rect: r, inView, before, after, hoverMatch };
});

// ---- A3c: Pakai hover, scroll ditunggu ----
await safe("A3c", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await clickText(".nom", "172 Diamonds");
  await setInput('input[aria-label="Kode promo"]', "ROSDI10");
  await scrollToText(".btn", "Pakai");
  await waitScrollDone();
  const r = await rectOfText(".btn", "Pakai");
  const inView = r.y >= 0 && r.y < 900;
  const before = await csText(".btn", "Pakai", ["backgroundColor"]);
  await mouseTo(r.x + r.w / 2, r.y + r.h / 2);
  const after = await csText(".btn", "Pakai", ["backgroundColor"]);
  const hoverMatch = await evalJs(`(() => { const b=[...document.querySelectorAll('.btn')].find(e=>e.textContent.trim()==='Pakai'); return b ? { hover: b.matches(':hover'), disabled: b.disabled } : 'NO-BTN'; })()`);
  return { rect: r, inView, before, after, hoverMatch };
});

// ---- J99c diagnostik: jejak Tab penuh dari #zone + focus() langsung ----
await safe("J99c", async () => {
  await goHash("#/game/mobile-legends");
  await evalJs(`document.querySelector('#uid').focus(); 'ok'`);
  await typeText("12345678");
  await tab();
  const atZone = await activeEl();
  await typeText("1234");
  // jejak 45 Tab dari zone
  const seq = [];
  for (let i = 0; i < 45; i++) {
    await tab();
    const a = await activeEl();
    seq.push(a === "BODY" ? "BODY" : (a.id || a.aria || (a.text || "").slice(0, 24) || a.tag));
  }
  // uji focus() langsung pada .nom ke-8 (172 Diamonds) dan .pay QRIS
  const focusTest = await evalJs(`(() => { const noms=[...document.querySelectorAll('.nom')]; const pays=[...document.querySelectorAll('.pay')]; const out={}; const n8=noms[7]; if(n8){ n8.focus(); out.nom8={ tag: n8.tagName, text: n8.textContent.trim().slice(0,30), focused: document.activeElement===n8 }; } const q=pays.find(p=>p.textContent.includes('QRIS')); if(q){ q.focus(); out.payQris={ tag: q.tagName, text: q.textContent.trim().slice(0,30), focused: document.activeElement===q }; } out.nomCount=noms.length; out.payCount=pays.length; return out; })()`);
  return { atZone, seq, focusTest };
});

// ---- J99d: checkout keyboard penuh dengan predikat includes ----
await safe("J99d", async () => {
  await goHash("#/");
  await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
  await waitScrollDone();
  const tabUntil = async (pred, max = 80) => {
    for (let i = 0; i < max; i++) {
      const a = await activeEl();
      if (a !== "BODY" && pred(a)) return { found: true, tabs: i };
      await tab();
    }
    return { found: false, tabs: max };
  };
  const toCard = await tabUntil((a) => (a.href || "").includes("#/game/mobile-legends"));
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
    const toNom = await tabUntil((a) => (a.text || "").includes("172 Diamonds"), 40);
    stepped.toNom = toNom;
    if (toNom.found) { await space(); await sleep(300); stepped.nomSelected = await evalJs(`(() => { const n=[...document.querySelectorAll('.nom')].find(e=>e.textContent.includes('172 Diamonds')); return n ? n.classList.contains('on') : 'NO-NOM'; })()`); }
    const toPay = await tabUntil((a) => (a.text || "").includes("QRIS"), 40);
    stepped.toPay = toPay;
    if (toPay.found) { await space(); await sleep(300); stepped.paySelected = await evalJs(`(() => { const p=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('QRIS')); return p ? p.classList.contains('on') : 'NO-PAY'; })()`); }
    const toBuy = await tabUntil((a) => a.text === "Beli" || (a.text || "").includes("Beli Sekarang"), 40);
    stepped.toBuy = toBuy;
    if (toBuy.found) { await enter(); await sleep(1500); }
    stepped.finalHash = await evalJs(`location.hash`);
    stepped.successShown = await evalJs(`!!document.querySelector('.step.success-in')`);
    stepped.successText = await successText();
  }
  return stepped;
});

// ---- F52c: Genshin 60 GC + ROSDI10, baca Success langsung ----
await safe("F52c", async () => {
  await goHash("#/game/genshin-impact");
  await setInput("#uid", "800123456");
  await clickText(".nom", "60 Genesis Crystal");
  await applyPromo("ROSDI10");
  await clickText(".pay", "QRIS");
  const s = await summaryText();
  const bought = await buyNow();
  await sleep(1200);
  return { summary: s, bought, success: await successText(), hash: await evalJs(`location.hash`) };
});

// ---- F53c: qty 10 x 2195 + ROSDI10, baca Success + histori ----
await safe("F53c", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await clickText(".nom", "2195 Diamonds");
  for (let i = 0; i < 9; i++) { await clickSel('button[aria-label="Tambah"]'); await sleep(60); }
  await applyPromo("ROSDI10");
  await clickText(".pay", "QRIS");
  const s = await summaryText();
  const bought = await buyNow();
  await sleep(1200);
  const success = await successText();
  const ref = await evalJs(`location.hash`);
  await goHash("#/cek");
  const hist = await evalJs(`(() => { const rows = [...document.querySelectorAll('.hist-in .sum-row')]; if (!rows.length) return 'NO-HIST-ROWS'; return rows.slice(0, 2).map(r => r.innerText.replace(/\\n/g, ' | ')); })()`);
  return { summary: s, bought, ref, success, firstHistoryRows: hist };
});

// ---- F58c: pulsa 5rb via pulsa-tsel, baca Success ----
await safe("F58c", async () => {
  await goHash("#/pulsa/telkomsel");
  await setInput("#hp", "081234567890");
  await clickText(".nom", "Pulsa 5.000");
  await clickText(".pay", "Pulsa Telkomsel");
  const bought = await buyNow();
  await sleep(1200);
  return { bought, success: await successText(), hash: await evalJs(`location.hash`) };
});

writeFileSync(`${outDir}/s453-cdpc-390.json`, JSON.stringify({ width: WIDTH, ...R }, null, 2));
ws.close();
console.log("DONE", WIDTH);
