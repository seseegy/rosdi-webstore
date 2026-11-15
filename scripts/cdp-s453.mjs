// Ukur runtime CDP batch s453.
// node scripts/cdp-s453.mjs <wsUrl> <width> <baseUrl> <outDir>
// Dijalankan via scripts/cdp-launch.sh.
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
const reload = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2500); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickSel = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 500) }); } };
const rectOf = (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; })()`);
const rectOfText = (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; const r=el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right)}; })()`);
const mouseTo = async (x, y) => { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(x), y: Math.round(y) }); await sleep(300); };
const hoverSel = async (sel) => { const r = await rectOf(sel); if (r === "NO-EL") return "NO-EL"; await mouseTo(r.x + r.w / 2, r.y + r.h / 2); return "ok"; };
const hoverText = async (sel, text) => { const r = await rectOfText(sel, text); if (r === "NO-EL") return "NO-EL"; await mouseTo(r.x + r.w / 2, r.y + r.h / 2); return "ok"; };
const cs = (sel, props) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const c = getComputedStyle(el); const o = {}; ${JSON.stringify(props)}.forEach(p => o[p] = c[p]); return o; })()`);
const csText = (sel, text, props) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; const c=getComputedStyle(el); const o={}; ${JSON.stringify(props)}.forEach(p=>o[p]=c[p]); return o; })()`);
const key = async (k, code, vk) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); await sleep(150); };
const tab = () => key("Tab", "Tab", 9);
const enter = () => key("Enter", "Enter", 13);
const space = () => key(" ", "Space", 32);
const activeEl = () => evalJs(`(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; return { tag: a.tagName, cls: (a.className||'').toString().slice(0,30), text: (a.textContent||'').trim().slice(0,30), aria: a.getAttribute('aria-label') || '', id: a.id || '', href: (a.getAttribute('href')||'').slice(0,40) }; })()`);
const typeText = async (text) => { await send("Input.insertText", { text }); await sleep(200); };
// Tab sampai predicate(activeEl) true, maks n kali; kembalikan jejak.
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
const fillMlbb = async () => { await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200); };
const applyPromo = async (code) => { await setInput('input[aria-label="Kode promo"]', code); await clickText(".btn", "Pakai"); await sleep(300); };
const summaryText = () => evalJs(`(() => { const s = document.querySelector('.summary'); if (!s) return 'NO-SUMMARY'; return s.innerText; })()`);
const buyNow = async () => evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); if(!b) return 'NO-BTN'; const dis=b.disabled; if(!dis) b.click(); return {disabled: dis}; })()`);

await setMetrics(WIDTH, 900, WIDTH < 500);
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

if (WIDTH === 390) {
  // ===== A2: PageLoading dengan chunk diperlambat (PLN belum pernah dimuat) =====
  await safe("A2", async () => {
    await send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 40 * 1024, uploadThroughput: 40 * 1024 });
    await evalJs(`location.hash = '#/pln'; 'ok'`);
    const samples = [];
    for (let i = 0; i < 30; i++) {
      const s = await evalJs(`(() => { const e = document.querySelector('.empty'); if (!e) return null; const c = getComputedStyle(e); return { text: e.textContent.slice(0,30), anim: c.animationName, dur: c.animationDuration, opacity: c.opacity }; })()`);
      samples.push(s);
      if (s && s.text.includes("Token PLN")) break;
      await sleep(250);
    }
    await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await sleep(1500);
    return { fallbackSamples: samples.filter(Boolean).slice(0, 5), loaded: await evalJs(`document.querySelector('h2') ? document.querySelector('h2').textContent : 'NO-H2'`) };
  });

  // ===== A1: chips auto-scroll =====
  await safe("A1", async () => {
    await goHash("#/");
    const before = await evalJs(`(() => { const c = document.querySelector('.chips'); if (!c) return 'NO-CHIPS'; const last = c.lastElementChild; const lr = last.getBoundingClientRect(); const cr = c.getBoundingClientRect(); return { scrollW: c.scrollWidth, clientW: c.clientWidth, scrollLeft: c.scrollLeft, lastRight: Math.round(lr.right), chipsRight: Math.round(cr.right), lastText: last.textContent.trim() }; })()`);
    await clickText(".chip", "Voucher");
    await sleep(300);
    const after = await evalJs(`(() => { const c = document.querySelector('.chips'); const last = c.lastElementChild; const lr = last.getBoundingClientRect(); const cr = c.getBoundingClientRect(); return { scrollLeft: c.scrollLeft, lastRight: Math.round(lr.right), chipsRight: Math.round(cr.right), active: last.classList.contains('on') }; })()`);
    await clickText(".chip", "Semua");
    return { before, after };
  });

  // ===== A3: hover Lacak (Cek), Cek Nama (PLN), Pakai (MLBB), Tutup (modal) =====
  await safe("A3", async () => {
    const out = {};
    await goHash("#/cek");
    out.cekBtnBefore = await csText(".btn", "Cek", ["backgroundColor"]);
    await hoverText(".btn", "Cek");
    out.cekBtnAfter = await csText(".btn", "Cek", ["backgroundColor"]);
    await goHash("#/pln");
    await setInput("#idpel", "543210987654");
    out.cekNamaBefore = await csText(".btn", "Cek Nama", ["backgroundColor"]);
    await hoverText(".btn", "Cek Nama");
    out.cekNamaAfter = await csText(".btn", "Cek Nama", ["backgroundColor"]);
    await goHash("#/game/mobile-legends");
    await fillMlbb();
    await clickText(".nom", "172 Diamonds");
    await setInput('input[aria-label="Kode promo"]', "ROSDI10");
    out.pakaiBefore = await csText(".btn", "Pakai", ["backgroundColor"]);
    await hoverText(".btn", "Pakai");
    out.pakaiAfter = await csText(".btn", "Pakai", ["backgroundColor"]);
    await goHash("#/");
    await clickText(".flink", "Syarat & Ketentuan");
    await sleep(500);
    out.tutupBefore = await cs(".modal .btn.big", ["backgroundColor"]);
    await hoverSel(".modal .btn.big");
    out.tutupAfter = await cs(".modal .btn.big", ["backgroundColor"]);
    await clickText(".modal .btn.big", "Tutup");
    return out;
  });

  // ===== A4: Beli disabled->enabled (transisi bg) =====
  await safe("A4", async () => {
    await goHash("#/game/mobile-legends");
    await fillMlbb();
    await clickText(".nom", "172 Diamonds");
    const before = await cs(".summary .btn.big", ["backgroundColor", "transition"]);
    const disabledBefore = await evalJs(`document.querySelector('.summary .btn.big').disabled`);
    await clickText(".pay", "QRIS");
    const t0 = await cs(".summary .btn.big", ["backgroundColor"]);
    await sleep(60);
    const t60 = await cs(".summary .btn.big", ["backgroundColor"]);
    await sleep(60);
    const t120 = await cs(".summary .btn.big", ["backgroundColor"]);
    await sleep(150);
    const t270 = await cs(".summary .btn.big", ["backgroundColor"]);
    return { disabledBefore, before, t0, t60, t120, t270, disabledAfter: await evalJs(`document.querySelector('.summary .btn.big').disabled`) };
  });

  // ===== A5: transisi border .input.err =====
  await safe("A5", async () => {
    await goHash("#/game/mobile-legends");
    const before = await cs("#uid", ["borderColor", "transition"]);
    await setInput("#uid", "123");
    const t0 = await cs("#uid", ["borderColor"]);
    await sleep(50);
    const t50 = await cs("#uid", ["borderColor"]);
    await sleep(50);
    const t100 = await cs("#uid", ["borderColor"]);
    await sleep(120);
    const t220 = await cs("#uid", ["borderColor"]);
    const hasErr = await evalJs(`document.querySelector('#uid').classList.contains('err')`);
    return { before, t0, t50, t100, t220, hasErr };
  });

  // ===== A6: footer pay-chips hover =====
  await safe("A6", async () => {
    await goHash("#/");
    const before = await csText(".pay-chips span", "QRIS", ["color", "backgroundColor"]);
    await hoverText(".pay-chips span", "QRIS");
    const after = await csText(".pay-chips span", "QRIS", ["color", "backgroundColor"]);
    return { before, after, transition: await csText(".pay-chips span", "QRIS", ["transition"]) };
  });

  // ===== A7: Cara Top Up =====
  await safe("A7", async () => {
    await goHash("#/");
    await evalJs(`window.scrollTo(0, 0); 'ok'`);
    await clickText(".flink", "Cara Top Up");
    await sleep(1500);
    return await evalJs(`(() => { const s = document.querySelector('#cara-topup'); const r = s.getBoundingClientRect(); return { scrollY: Math.round(window.scrollY), sectionTop: Math.round(r.top), sectionVisible: r.top >= 0 && r.top < window.innerHeight, sectionClass: s.className, sectionStyle: s.getAttribute('style') || '', hasHighlight: s.classList.contains('hl') || s.classList.contains('highlight') || getComputedStyle(s).outlineStyle !== 'none' }; })()`);
  });

  // ===== A8: hero button :active =====
  await safe("A8", async () => {
    await goHash("#/");
    await evalJs(`window.scrollTo(0, 0); 'ok'`);
    const r = await rectOfText(".hero .btn", "Mulai top up");
    const before = await csText(".hero .btn", "Mulai top up", ["transform", "transition"]);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2), button: "left", clickCount: 1 });
    await sleep(60);
    const pressed = await csText(".hero .btn", "Mulai top up", ["transform"]);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2), button: "left", clickCount: 1 });
    await sleep(200);
    return { before, pressed, transitionRule: before };
  });

  // ===== A10: footer link hover + crumb back hover + "Lihat semua" =====
  await safe("A10", async () => {
    await goHash("#/");
    const flinkBefore = await csText(".flink", "Syarat & Ketentuan", ["color"]);
    await hoverText(".flink", "Syarat & Ketentuan");
    const flinkAfter = await csText(".flink", "Syarat & Ketentuan", ["color"]);
    await goHash("#/game/mobile-legends");
    const backBefore = await cs(".crumb .back", ["color", "borderColor"]);
    await hoverSel(".crumb .back");
    const backAfter = await cs(".crumb .back", ["color", "borderColor"]);
    const lihatSemua = await evalJs(`[...document.querySelectorAll('a,button')].some(e => e.textContent.includes('Lihat semua'))`);
    return { flinkBefore, flinkAfter, backBefore, backAfter, lihatSemua };
  });

  // ===== F51: baris diskon di UI =====
  await safe("F51", async () => {
    await goHash("#/game/mobile-legends");
    await fillMlbb();
    await clickText(".nom", "172 Diamonds");
    await applyPromo("ROSDI10");
    const s = await summaryText();
    return { summary: s, hasDiscRow: s.includes("Diskon"), discText: s.split("\n").filter((l) => /Diskon|ROSDI10|−|−Rp|Rp-/.test(l)) };
  });

  // ===== F52: 4 permukaan — Genshin 60 GC + ROSDI10 =====
  await safe("F52", async () => {
    await goHash("#/game/genshin-impact");
    await setInput("#uid", "800123456");
    await clickText(".nom", "60 Genesis Crystal");
    await applyPromo("ROSDI10");
    await clickText(".pay", "QRIS");
    const s = await summaryText();
    const payRow = await csText(".pay", "QRIS", ["color"]);
    const payRowText = await evalJs(`(() => { const p=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('QRIS')); return p ? p.textContent.replace(/\\s+/g,' ').trim() : 'NO-PAY'; })()`);
    const mb = await evalJs(`(() => { const m = document.querySelector('.mobile-bar'); if (!m) return 'NO-MB'; const r = m.getBoundingClientRect(); return { visible: r.height > 0, text: m.innerText.replace(/\\n/g, ' | ') }; })()`);
    const bought = await buyNow();
    await sleep(1200);
    const success = await evalJs(`(() => { const s = document.querySelector('.success-in'); if (!s) return 'NO-SUCCESS:' + location.hash; return s.innerText; })()`);
    return { summary: s, payRow, payRowText, mobileBar: mb, bought, success };
  });

  // ===== F53: 5 permukaan — qty 10 x 2195 DM + ROSDI10 =====
  await safe("F53", async () => {
    await goHash("#/game/mobile-legends");
    await fillMlbb();
    await clickText(".nom", "2195 Diamonds");
    for (let i = 0; i < 9; i++) { await clickSel('button[aria-label="Tambah"]'); await sleep(60); }
    await applyPromo("ROSDI10");
    await clickText(".pay", "QRIS");
    const s = await summaryText();
    const payRowText = await evalJs(`(() => { const p=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('QRIS')); return p ? p.textContent.replace(/\\s+/g,' ').trim() : 'NO-PAY'; })()`);
    const mb = await evalJs(`(() => { const m = document.querySelector('.mobile-bar'); const r = m.getBoundingClientRect(); return { visible: r.height > 0, text: m.innerText.replace(/\\n/g, ' | ') }; })()`);
    const bought = await buyNow();
    await sleep(1200);
    const ref = await evalJs(`location.hash`);
    const success = await evalJs(`(() => { const s = document.querySelector('.success-in'); if (!s) return 'NO-SUCCESS:' + location.hash; return s.innerText; })()`);
    await goHash("#/cek");
    const hist = await evalJs(`(() => { const rows = [...document.querySelectorAll('.hist-in button.sum-row')]; if (!rows.length) return 'NO-HIST'; return rows[0].innerText; })()`);
    return { summary: s, payRowText, mobileBar: mb, bought, ref, success, firstHistoryRow: hist };
  });

  // ===== F54: GAMER5 cap — qty 10 x 2195 DM =====
  await safe("F54", async () => {
    await goHash("#/game/mobile-legends");
    await fillMlbb();
    await clickText(".nom", "2195 Diamonds");
    for (let i = 0; i < 9; i++) { await clickSel('button[aria-label="Tambah"]'); await sleep(60); }
    await applyPromo("GAMER5");
    await clickText(".pay", "QRIS");
    const s = await summaryText();
    const payRowText = await evalJs(`(() => { const p=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('QRIS')); return p ? p.textContent.replace(/\\s+/g,' ').trim() : 'NO-PAY'; })()`);
    const mb = await evalJs(`(() => { const m = document.querySelector('.mobile-bar'); return m.innerText.replace(/\\n/g, ' | '); })()`);
    return { summary: s, payRowText, mobileBar: mb };
  });

  // ===== F55: PLN 1jt via Pulsa Telkomsel =====
  await safe("F55", async () => {
    await goHash("#/pln");
    await setInput("#idpel", "543210987654");
    await clickText(".btn", "Cek Nama");
    await sleep(800);
    const note = await evalJs(`(() => { const n = document.querySelector('.note.good'); return n ? n.textContent : 'NO-NOTE'; })()`);
    await clickText(".nom", "Token 1.000.000");
    await clickText(".pay", "Pulsa Telkomsel");
    const s = await summaryText();
    return { note, summary: s };
  });

  // ===== F56: PSN 100k + ROSDI10 =====
  await safe("F56", async () => {
    await goHash("#/voucher/playstation");
    await setInput("#vemail", "nama@mail.com");
    await clickText(".nom", "PSN IDR 100.000");
    await applyPromo("ROSDI10");
    await clickText(".pay", "QRIS");
    return { summary: await summaryText() };
  });

  // ===== F57: pulsa 100rb DANA + GAMER5 =====
  await safe("F57", async () => {
    await goHash("#/pulsa/telkomsel");
    await setInput("#hp", "081234567890");
    await clickText(".nom", "Pulsa 100.000");
    await applyPromo("GAMER5");
    await clickText(".pay", "DANA");
    const s = await summaryText();
    const payRowText = await evalJs(`(() => { const p=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('DANA')); return p ? p.textContent.replace(/\\s+/g,' ').trim() : 'NO-PAY'; })()`);
    return { summary: s, payRowText };
  });

  // ===== F58: Success pulsa — baris Harga + biaya =====
  await safe("F58", async () => {
    await goHash("#/pulsa/telkomsel");
    await setInput("#hp", "081234567890");
    await clickText(".nom", "Pulsa 5.000");
    await clickText(".pay", "Pulsa Telkomsel");
    const bought = await buyNow();
    await sleep(1200);
    const success = await evalJs(`(() => { const s = document.querySelector('.success-in'); if (!s) return 'NO-SUCCESS:' + location.hash; return s.innerText; })()`);
    return { bought, success };
  });

  // ===== H77/78/79: focus-visible (Tab nyata) =====
  await safe("H77-79", async () => {
    await goHash("#/");
    await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
    const theme = await tabUntil((a) => a.aria === "Ganti tema");
    const themeOutline = theme.found ? await cs('button[aria-label="Ganti tema"]', ["outlineWidth", "outlineStyle", "outlineColor"]) : "NOT-FOUND";
    const masuk = await tabUntil((a) => a.text === "Masuk");
    const masukOutline = masuk.found ? await csText("header.site .btn", "Masuk", ["outlineWidth", "outlineStyle", "outlineColor"]) : "NOT-FOUND";
    await goHash("#/game/mobile-legends");
    await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
    const back = await tabUntil((a) => a.aria === "Kembali");
    const backOutline = back.found ? await cs(".crumb .back", ["outlineWidth", "outlineStyle", "outlineColor"]) : "NOT-FOUND";
    return { theme, themeOutline, masuk, masukOutline, back, backOutline };
  });

  // ===== H80: urutan Tab di halaman Pulsa =====
  await safe("H80", async () => {
    await goHash("#/pulsa/telkomsel");
    await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
    const seq = [];
    for (let i = 0; i < 40; i++) {
      const a = await activeEl();
      seq.push(a === "BODY" ? "BODY" : (a.id || a.aria || a.text || a.tag));
      if (a !== "BODY" && (a.text || "").startsWith("Beli")) break;
      await tab();
    }
    return { sequence: seq };
  });

  // ===== J91-94: tombol Beli terblokir =====
  await safe("J91-94", async () => {
    const out = {};
    await goHash("#/game/mobile-legends");
    out.j91_empty = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { disabled: b.disabled, text: b.textContent.trim(), note: (([...document.querySelectorAll('.summary .note')].find(n=>/lengkapi|perbaikan/.test(n.textContent)))||{textContent:'-'}).textContent }; })()`);
    await fillMlbb();
    await clickText(".nom", "172 Diamonds");
    out.j92_noMethod = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { disabled: b.disabled, note: (([...document.querySelectorAll('.summary .note')].find(n=>/lengkapi|perbaikan/.test(n.textContent)))||{textContent:'-'}).textContent }; })()`);
    await clickText(".pay", "QRIS");
    out.j92_withMethod = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { disabled: b.disabled, note: (([...document.querySelectorAll('.summary .note')].find(n=>/lengkapi|perbaikan/.test(n.textContent)))||{textContent:'-'}).textContent }; })()`);
    // 93: voucher tanpa metode
    await goHash("#/voucher/google-play");
    await setInput("#vemail", "nama@mail.com");
    await clickText(".nom", "Google Play IDR 20.000");
    out.j93_voucherNoMethod = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { disabled: b.disabled, note: (([...document.querySelectorAll('.summary .note')].find(n=>/lengkapi|perbaikan/.test(n.textContent)))||{textContent:'-'}).textContent }; })()`);
    // 94: pulsa — HP kosong, nominal + metode dipilih
    await goHash("#/pulsa/telkomsel");
    await clickText(".nom", "Pulsa 5.000");
    await clickText(".pay", "QRIS");
    out.j94_hpEmpty = await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); return { disabled: b.disabled, note: (([...document.querySelectorAll('.summary .note')].find(n=>/lengkapi|perbaikan/.test(n.textContent)))||{textContent:'-'}).textContent, hpErr: !!document.querySelector('.err-msg') }; })()`);
    return out;
  });

  // ===== J99: checkout penuh hanya keyboard =====
  await safe("J99", async () => {
    await goHash("#/");
    await evalJs(`document.activeElement.blur(); window.scrollTo(0,0); 'ok'`);
    const toCard = await tabUntil((a) => (a.href || "").includes("#/game/mobile-legends"), 80);
    let stepped = { toCard };
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
      const toBuy = await tabUntil((a) => (a.text || "").startsWith("Beli"), 40);
      stepped.toBuy = toBuy;
      if (toBuy.found) { await enter(); await sleep(1500); }
      stepped.finalHash = await evalJs(`location.hash`);
      stepped.successShown = await evalJs(`!!document.querySelector('.success-in')`);
    }
    return stepped;
  });

  // ===== J98: draf hilang saat reload =====
  await safe("J98", async () => {
    await goHash("#/game/mobile-legends");
    await setInput("#uid", "12345678");
    await setInput("#zone", "1234");
    const before = await evalJs(`({ uid: document.querySelector('#uid').value, zone: document.querySelector('#zone').value, lsKeys: Object.keys(localStorage) })`);
    await reload("#/game/mobile-legends");
    const after = await evalJs(`({ uid: document.querySelector('#uid').value, zone: document.querySelector('#zone').value, lsKeys: Object.keys(localStorage) })`);
    return { before, after };
  });
}

const overflow = async () => evalJs(`({ docW: document.documentElement.scrollWidth, winW: window.innerWidth, hOverflow: document.documentElement.scrollWidth > window.innerWidth })`);
const gridCols = (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; return getComputedStyle(el).gridTemplateColumns.split(' ').length; })()`);

if (WIDTH === 360) {
  // I81: Cek (demo ref) di 360
  await safe("I81", async () => {
    await goHash("#/cek/RSD-DEMO1234");
    const card = await rectOf(".cek-result");
    const ov = await overflow();
    return { card, overflow: ov, histRows: await evalJs(`document.querySelectorAll('.hist-in button.sum-row').length`) };
  });
  // I82: modal S&K di 360
  await safe("I82", async () => {
    await goHash("#/");
    await clickText(".flink", "Syarat & Ketentuan");
    await sleep(600);
    const modal = await rectOf(".modal");
    const ov = await overflow();
    const tutup = await rectOf(".modal .btn.big");
    return { modal, overflow: ov, tutupBtn: tutup };
  });
}

if (WIDTH === 412) {
  // I83: Beranda grid game di 412
  await safe("I83", async () => {
    await goHash("#/");
    const cols = await gridCols(".grid.c4");
    const ov = await overflow();
    const first = await rectOf(".card");
    const last = await evalJs(`(() => { const cs=[...document.querySelectorAll('.grid .card')]; const r=cs[cs.length-1].getBoundingClientRect(); return { right: Math.round(r.right), count: cs.length }; })()`);
    return { gameGridCols: cols, overflow: ov, firstCard: first, lastCard: last };
  });
}

if (WIDTH === 430) {
  // I84: nom-grid MLBB di 430
  await safe("I84", async () => {
    await goHash("#/game/mobile-legends");
    const cols = await gridCols(".nom-grid");
    const ov = await overflow();
    const nom = await evalJs(`(() => { const n=[...document.querySelectorAll('.nom')]; return { count: n.length, maxRight: Math.round(Math.max(...n.map(e=>e.getBoundingClientRect().right))) }; })()`);
    return { nomGridCols: cols, overflow: ov, noms: nom };
  });
}

if (WIDTH === 480) {
  // I85: voucher Google Play di 480
  await safe("I85", async () => {
    await goHash("#/voucher/google-play");
    const cols = await gridCols(".nom-grid");
    const ov = await overflow();
    const nom = await evalJs(`(() => { const n=[...document.querySelectorAll('.nom')]; return { count: n.length, maxRight: Math.round(Math.max(...n.map(e=>e.getBoundingClientRect().right))) }; })()`);
    const input = await rectOf("#vemail");
    return { nomGridCols: cols, overflow: ov, noms: nom, emailInput: input };
  });
}

if (WIDTH === 540) {
  // I86: header di 540
  await safe("I86", async () => {
    await goHash("#/");
    const ov = await overflow();
    const header = await rectOf(".header-in");
    const masuk = await rectOfText("header.site .btn", "Masuk");
    const nav = await cs("nav.main", ["display"]);
    return { overflow: ov, headerIn: header, masukBtn: masuk, navDisplay: nav };
  });
}

if (WIDTH === 600) {
  // I87: row2 MLBB di 600
  await safe("I87", async () => {
    await goHash("#/game/mobile-legends");
    const row2 = await rectOf(".row2");
    const uid = await rectOf("#uid");
    const zone = await rectOf("#zone");
    const ov = await overflow();
    return { row2, uid, zone, overflow: ov };
  });
}

if (WIDTH === 640) {
  // I88: Cek di 640
  await safe("I88", async () => {
    await goHash("#/cek");
    const ov = await overflow();
    const card = await rectOf(".cek-result");
    const wrap = await evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); return { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) }; })()`);
    return { overflow: ov, resultCard: card, wrap };
  });
}

if (WIDTH === 1280) {
  // A9: category card hover di desktop
  await safe("A9", async () => {
    await goHash("#/");
    const before = await csText(".card", "Pulsa Reguler", ["borderColor"]);
    await hoverText(".card", "Pulsa Reguler");
    const after = await csText(".card", "Pulsa Reguler", ["borderColor"]);
    return { before, after };
  });
  // I89: nom-grid MLBB di 1280
  await safe("I89", async () => {
    await goHash("#/game/mobile-legends");
    const cols = await gridCols(".nom-grid");
    const ov = await overflow();
    const wrap = await evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); return { w: Math.round(r.width), left: Math.round(r.left) }; })()`);
    return { nomGridCols: cols, overflow: ov, wrap };
  });
}

if (WIDTH === 1536) {
  // I90: wrap 1120 terpusat di 1536
  await safe("I90", async () => {
    await goHash("#/");
    const ov = await overflow();
    const wrap = await evalJs(`(() => { const w = document.querySelector('.wrap'); const r = w.getBoundingClientRect(); const c = getComputedStyle(w); return { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), maxW: c.maxWidth, marginL: c.marginLeft, marginR: c.marginRight }; })()`);
    return { overflow: ov, wrap };
  });
}

writeFileSync(`${outDir}/s453-cdp-${WIDTH}.json`, JSON.stringify({ width: WIDTH, ...R }, null, 2));
ws.close();
console.log("DONE", WIDTH);
