// Ukur runtime CDP batch s449 (lanjutan): ide 1-10, 54-72, 76-80, 93, 96-100.
// Penggunaan: node scripts/cdp-s449.mjs <wsUrl> <width> <baseUrl> <outDir>
// Dijalankan via scripts/cdp-launch.sh (Chrome headless + vite preview).
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
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1200); };
const reload = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(2200); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickText = async (sel, text) => evalJs(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})]; const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)})); if(!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 500) }); } };
const fillMlbb = async () => {
  await setInput("#uid", "12345678"); await setInput("#zone", "1234"); await sleep(200);
};
const buyFlow = async (nominalText, payText) => {
  await clickText(".nom", nominalText); await sleep(250);
  await clickText(".pay", payText); await sleep(250);
  const r = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); if(!b) return 'NO-BTN'; const dis=b.disabled; b.click(); return {disabled: dis}; })()`);
  await sleep(1200);
  return r;
};

await setMetrics(WIDTH, 900, WIDTH < 500);
await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

if (WIDTH === 640) {
  // ---- 80: zoom 200% ~ viewport 640 pada 1280 ----
  await safe("zoom80-mlbb", async () => {
    await goHash("#/game/mobile-legends");
    return evalJs(`(() => {
      const docEl = document.documentElement;
      const noms = [...document.querySelectorAll('.nom')].map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
      let overlap = 0;
      for (let i = 0; i < noms.length; i++) for (let j = i + 1; j < noms.length; j++) {
        const a = noms[i], b = noms[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap++;
      }
      const beli = document.querySelector('.summary .btn.big');
      const br = beli ? beli.getBoundingClientRect() : null;
      return { scrollW: docEl.scrollWidth, innerW: window.innerWidth, hOverflow: docEl.scrollWidth > window.innerWidth, nomCount: noms.length, overlapPairs: overlap, beliVisible: br ? (br.width > 0 && br.right <= window.innerWidth + 1) : null };
    })()`);
  });
  writeFileSync(`${outDir}/cdp-s449-${WIDTH}.json`, JSON.stringify(R, null, 1));
  process.exit(0);
}

// ================= 100: checkout offline (HARUS pertama: chunk InfoPages belum dimuat) =================
await safe("offline100", async () => {
  await send("Network.clearBrowserCache");
  await reload("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "172 Diamonds"); await sleep(250);
  await clickText(".pay", "QRIS"); await sleep(250);
  await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  const before = await evalJs(`location.hash`);
  await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); b.click(); return b.disabled; })()`);
  await sleep(2500);
  const after = await evalJs(`(() => { const eb = document.querySelector('.empty'); return { hash: location.hash, sukses: !!document.querySelector('.big-check'), errBoundary: eb ? eb.textContent.slice(0, 80) : null, bodyText: document.body.innerText.slice(0, 200) }; })()`);
  await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  return { before, after };
});

// ================= A. Animasi 1-10 =================
await safe("anim1-ceknama", async () => {
  await reload("#/pln");
  await setInput("#idpel", "543210987654"); await sleep(200);
  await clickText(".step .btn", "Cek Nama"); await sleep(400);
  return evalJs(`(() => { const n=document.querySelector('.note.good'); if(!n) return {found:false}; const s=getComputedStyle(n); return {found:true, text: n.textContent.slice(0,60), anim: s.animationName, animDur: s.animationDuration}; })()`);
});
await safe("anim2-beli-press", async () => {
  await reload("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "172 Diamonds"); await sleep(200);
  await clickText(".pay", "QRIS"); await sleep(200);
  const rect = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); const r=b.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await sleep(120);
  const during = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); const s=getComputedStyle(b); return {transform: s.transform, active: b.matches(':active')}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 5, y: 5, button: "left", clickCount: 1 });
  await sleep(300);
  const stayed = await evalJs(`location.hash`);
  return { during, stayedOnGame: stayed.startsWith("#/game/") };
});
await safe("anim3-toast", async () => {
  // Sukses dari pembelian MLBB (offline100 sudah membuat order, tapi butuh Sukses fresh)
  await reload("#/game/mobile-legends");
  await fillMlbb();
  await buyFlow("172 Diamonds", "QRIS");
  const onSukses = await evalJs(`location.hash.startsWith('#/sukses/')`);
  await clickText(".btn.ghost", "Salin"); await sleep(300);
  const atClick = await evalJs(`(() => { const t=document.querySelector('.toast'); const b=[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Disalin')); return {toast: !!t, btnText: b ? b.textContent : null}; })()`);
  await sleep(2300);
  const after = await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Salin'); return {backToSalin: !!b}; })()`);
  return { onSukses, atClick, after };
});
await safe("anim4-badge-tab", async () => {
  await reload("#/game/mobile-legends");
  await clickText(".tab", "Weekly Pass"); await sleep(400);
  return evalJs(`(() => { const b=[...document.querySelectorAll('.nom .badge')].find(e=>e.textContent.includes('Flash')); if(!b) return {found:false}; const s=getComputedStyle(b); return {found:true, text: b.textContent, anim: s.animationName, animDur: s.animationDuration}; })()`);
});
await safe("anim5-promo-was", async () => {
  await reload("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "172 Diamonds"); await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10"); await sleep(150);
  await clickText(".step .btn", "Pakai"); await sleep(400);
  return evalJs(`(() => { const d=document.querySelector('.sum-row.disc'); const wasInSummary=document.querySelector('.summary .was'); return {discRow: !!d, discAnim: d ? getComputedStyle(d).animationName : null, wasInSummary: !!wasInSummary, discText: d ? d.textContent : null}; })()`);
});
await safe("anim6-input-focus", async () => {
  await reload("#/game/mobile-legends");
  const before = await evalJs(`(() => { const el=document.querySelector('#uid'); const s=getComputedStyle(el); return {transProp: s.transitionProperty, transDur: s.transitionDuration, border: s.borderColor}; })()`);
  await evalJs(`document.querySelector('#uid').focus(); 'ok'`); await sleep(250);
  const after = await evalJs(`(() => { const el=document.querySelector('#uid'); const s=getComputedStyle(el); return {border: s.borderColor, outline: s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor}; })()`);
  return { before, after };
});
await safe("anim7-page-transition", async () => {
  await reload("#/");
  await sleep(500);
  const homeAnim = await evalJs(`(() => { const m=document.querySelector('main#konten'); const s=getComputedStyle(m); return {anim: s.animationName, trans: s.transitionProperty}; })()`);
  await goHash("#/game/mobile-legends");
  const gameAnim = await evalJs(`(() => { const m=document.querySelector('main#konten'); const s=getComputedStyle(m); return {anim: s.animationName, trans: s.transitionProperty}; })()`);
  return { homeAnim, gameAnim };
});
await safe("anim8-first-load", async () => {
  await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
  await sleep(300);
  return evalJs(`(() => { const h=document.querySelector('.hero'); const hs=getComputedStyle(h); const w=document.querySelector('.wrap'); const ws=getComputedStyle(w); return {heroAnim: hs.animationName, heroOpacity: hs.opacity, wrapAnim: ws.animationName}; })()`);
});
await safe("anim9-chip", async () => {
  await reload("#/");
  await clickText(".chip", "Top Up Game"); await sleep(300);
  return evalJs(`(() => { const c=[...document.querySelectorAll('.chip')].find(e=>e.classList.contains('on')); if(!c) return {found:false}; const s=getComputedStyle(c); return {found:true, text: c.textContent, transProp: s.transitionProperty, transDur: s.transitionDuration, bg: s.backgroundColor}; })()`);
});
await safe("anim10-server-select", async () => {
  await goHash("#/game/genshin-impact");
  return evalJs(`(() => { const s=document.querySelector('#server'); if(!s) return {found:false}; return {found:true, tag: s.tagName, options: [...s.options].map(o=>o.value)}; })()`);
});

// ================= F. Harga 54-60 =================
await safe("harga54-fee-warning", async () => {
  await reload("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "3 Diamonds"); await sleep(200);
  await clickText(".pay", "BCA Virtual Account"); await sleep(300);
  return evalJs(`(() => { const notes=[...document.querySelectorAll('.step .note')].map(e=>e.textContent); return {notes}; })()`);
});
await safe("harga55-termurah", async () => {
  await reload("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "3 Diamonds"); await sleep(200);
  return evalJs(`(() => { const rows=[...document.querySelectorAll('.pay')].map(e=>e.textContent.replace(/\\s+/g,' ').trim().slice(0,80)); const termurah=[...document.querySelectorAll('.pay')].some(e=>/termurah/i.test(e.textContent)); return {rows, termurahMarker: termurah}; })()`);
});
await safe("harga56-57-default", async () => {
  await reload("#/game/mobile-legends");
  return evalJs(`(() => { const on=[...document.querySelectorAll('.pay.on')].length; const b=document.querySelector('.summary .btn.big'); const note=[...document.querySelectorAll('.summary .note')].map(e=>e.textContent).find(t=>t.includes('Untuk membeli')); return {paySelected: on, beliDisabled: b.disabled, note: note || null}; })()`);
});
await safe("harga58-danamon", async () => {
  await reload("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "3 Diamonds"); await sleep(200);
  return evalJs(`(() => { const d=[...document.querySelectorAll('.pay')].find(e=>e.textContent.includes('Danamon')); if(!d) return {found:false}; const before=[...document.querySelectorAll('.pay.on')].length; d.click(); return {found:true, disabled: d.disabled, tag: d.querySelector('.status-tag') ? d.querySelector('.status-tag').textContent : null, selectedAfterClick: [...document.querySelectorAll('.pay.on')].length, changed: before !== [...document.querySelectorAll('.pay.on')].length}; })()`);
});
await safe("harga59-60-pulsa-pay", async () => {
  const out = {};
  await reload("#/pulsa/telkomsel");
  await setInput("#hp", "081234567890"); await sleep(200);
  await clickText(".nom", "Pulsa 50.000"); await sleep(200);
  await clickText(".pay", "Pulsa Telkomsel"); await sleep(300);
  out.same = await evalJs(`(() => { const notes=[...document.querySelectorAll('.step .note')].map(e=>e.textContent); return {notes}; })()`);
  await clickText(".pay", "Pulsa XL"); await sleep(300);
  out.cross = await evalJs(`(() => { const notes=[...document.querySelectorAll('.step .note')].map(e=>e.textContent); const sel=[...document.querySelectorAll('.pay.on')].map(e=>e.textContent.slice(0,30)); return {notes, sel}; })()`);
  return out;
});

// ================= G. State & navigasi 61-70 =================
await safe("nav61-63", async () => {
  const r = {};
  await reload("#/xyz");
  r.xyz = await evalJs(`(() => ({h1: document.querySelector('h1') ? document.querySelector('h1').textContent : null, hero: !!document.querySelector('.hero')})()`);
  await goHash("#/game/xyz");
  r.gameXyz = await evalJs(`(() => ({h1: document.querySelector('h1') ? document.querySelector('h1').textContent : null, hero: !!document.querySelector('.hero')})()`);
  await goHash("#/pulsa/xyz");
  r.pulsaXyz = await evalJs(`(() => ({h1: document.querySelector('h1') ? document.querySelector('h1').textContent : null})()`);
  return r;
});
await safe("nav64-corrupt-storage", async () => {
  await evalJs(`localStorage.setItem('rosdi_orders', 'bukan-json{{{'); 'ok'`);
  await reload("#/cek");
  return evalJs(`(() => ({crashed: !document.querySelector('#konten'), emptyState: document.body.innerText.includes('Belum ada transaksi'), bodyStart: document.body.innerText.slice(0,120)})()`);
});
await safe("nav65-two-tabs", async () => {
  // Buka tab 2 di #/cek dulu (kosong), lalu buat order di tab 1.
  await evalJs(`localStorage.clear(); 'ok'`);
  const listRes = await fetch("http://127.0.0.1:9222/json/new?url=" + encodeURIComponent(baseUrl + "#/cek"), { method: "PUT" }).then((r) => r.json()).catch((e) => ({ ERROR: String(e) }));
  const tab2 = listRes && listRes.webSocketDebuggerUrl ? listRes.webSocketDebuggerUrl : null;
  if (!tab2) return { tab2: null, listRes };
  const ws2 = new WebSocket(tab2);
  let id2 = 1000; const pend2 = new Map();
  const send2 = (method, params = {}) => new Promise((resolve, reject) => { const id = id2++; pend2.set(id, { resolve, reject }); ws2.send(JSON.stringify({ id, method, params })); });
  ws2.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend2.has(m.id)) { const { resolve, reject } = pend2.get(m.id); pend2.delete(m.id); if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); } };
  await new Promise((res, rej) => { ws2.onopen = res; ws2.onerror = rej; });
  await send2("Page.enable"); await send2("Runtime.enable");
  const eval2 = (expression) => send2("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error("tab2 eval fail"); return r.result.value; });
  await sleep(2500);
  const before = await eval2(`document.body.innerText.includes('Belum ada transaksi')`);
  // Buat order di tab 1
  await goHash("#/game/mobile-legends");
  await fillMlbb();
  await buyFlow("3 Diamonds", "QRIS");
  await sleep(1500);
  const after = await eval2(`(() => { const rows=[...document.querySelectorAll('.sum-row')].map(e=>e.textContent); const hist=[...document.querySelectorAll('button.sum-row')].length; return {histRows: hist, hasRef: document.body.innerText.includes('RSD-'), emptyStill: document.body.innerText.includes('Belum ada transaksi')}; })()`);
  ws2.close();
  return { before, after };
});
await safe("nav66-68-persist", async () => {
  const out = {};
  await reload("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "172 Diamonds"); await sleep(200);
  await setInput("#email", "nama@mail.com"); await sleep(150);
  await clickText(".nom", "86 Diamonds"); await sleep(300);
  out.emailAfterNominal = await evalJs(`document.querySelector('#email').value`);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10"); await sleep(150);
  await clickText(".step .btn", "Pakai"); await sleep(300);
  const promoBefore = await evalJs(`(() => { const d=document.querySelector('.sum-row.disc'); return d ? d.textContent : null; })()`);
  await clickText(".nom", "3 Diamonds"); await sleep(300);
  out.promoAfterNominal = await evalJs(`(() => { const d=document.querySelector('.sum-row.disc'); return d ? d.textContent : null; })()`);
  out.promoBefore = promoBefore;
  await clickText(".pay", "GoPay"); await sleep(200);
  await clickText(".tab", "Weekly Pass"); await sleep(300);
  out.payAfterTab = await evalJs(`(() => { const on=[...document.querySelectorAll('.pay.on')].map(e=>e.textContent.slice(0,20)); return on; })()`);
  return out;
});
await safe("nav69-veil-sk", async () => {
  await reload("#/");
  await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`); await sleep(500);
  await clickText("footer.site button.flink", "Syarat & Ketentuan"); await sleep(400);
  const open = await evalJs(`!!document.querySelector('.modal-veil')`);
  const rect = await evalJs(`(() => { const v=document.querySelector('.modal-veil'); if(!v) return null; const r=v.getBoundingClientRect(); return {x: r.x + 10, y: r.y + 10}; })()`);
  if (rect) { await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 }); await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 }); }
  await sleep(400);
  const closed = await evalJs(`!document.querySelector('.modal-veil')`);
  return { open, closed };
});
await safe("nav70-enter-promo", async () => {
  await reload("#/game/mobile-legends");
  await fillMlbb();
  await clickText(".nom", "3 Diamonds"); await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10"); await sleep(150);
  await evalJs(`document.querySelector(".step input[aria-label='Kode promo']").focus(); 'ok'`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await sleep(400);
  return evalJs(`(() => { const m=document.querySelector('.note.good'); return {applied: !!document.querySelector('.sum-row.disc'), msg: m ? m.textContent : null}; })()`);
});

// ================= H. Aksesibilitas 71-72, 76-79 =================
await safe("a11y71-game-card-kbd", async () => {
  await reload("#/");
  await evalJs(`(() => { const a=[...document.querySelectorAll('a.card')].find(e=>e.textContent.includes('Mobile Legends')); a.focus(); return a.tagName; })()`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await sleep(1200);
  return evalJs(`location.hash`);
});
await safe("a11y72-enter-cek", async () => {
  await reload("#/cek");
  await setInput(".step input", "RSD-DEMO1234"); await sleep(150);
  await evalJs(`document.querySelector('.step input').focus(); 'ok'`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await sleep(800);
  return evalJs(`(() => { const r=document.querySelector('.cek-result'); return {resultShown: !!r, text: r ? r.textContent.slice(0,80) : null}; })()`);
});
await safe("a11y73-75-contrast", async () => {
  await reload("#/game/mobile-legends");
  const lum = (hex) => { const h = hex.replace("#", ""); const f = (i) => { const c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4); };
  const rgb2hex = (s) => { const m = s.match(/\d+/g); if (!m) return null; return "#" + m.slice(0, 3).map((v) => parseInt(v).toString(16).padStart(2, "0")).join(""); };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const read = async () => evalJs(`(() => { const np=document.querySelector('.nom .n-price'); const bd=document.querySelector('.nom .badge'); const cs=getComputedStyle(np); const bs=bd?getComputedStyle(bd):null; return {nPriceColor: cs.color, nPriceBg: getComputedStyle(np.closest('.nom')).backgroundColor, badgeColor: bs?bs.color:null, badgeBg: bs?bs.backgroundColor:null}; })()`);
  const light = await read();
  const toHex = (o) => ({ nPrice: [rgb2hex(o.nPriceColor), rgb2hex(o.nPriceBg)], badge: [rgb2hex(o.badgeColor), rgb2hex(o.badgeBg)] });
  const lh = toHex(light);
  // tema gelap
  await evalJs(`document.querySelector('.icon-btn').click(); 'ok'`); await sleep(500);
  const dark = await read();
  const dh = toHex(dark);
  await evalJs(`document.querySelector('.icon-btn').click(); 'ok'`); await sleep(300);
  // chip aktif di Beranda
  await goHash("#/");
  const chip = await evalJs(`(() => { const c=[...document.querySelectorAll('.chip')].find(e=>e.classList.contains('on')); const s=getComputedStyle(c); return {color: s.color, bg: s.backgroundColor}; })()`);
  const ch = [rgb2hex(chip.color), rgb2hex(chip.bg)];
  return {
    i73: { light: lh.nPrice, rLight: +ratio(lh.nPrice[0], lh.nPrice[1]).toFixed(2), dark: dh.nPrice, rDark: +ratio(dh.nPrice[0], dh.nPrice[1]).toFixed(2) },
    i74: { light: lh.badge, rLight: lh.badge[0] ? +ratio(lh.badge[0], lh.badge[1]).toFixed(2) : null, dark: dh.badge, rDark: dh.badge[0] ? +ratio(dh.badge[0], dh.badge[1]).toFixed(2) : null },
    i75: { chip: ch, r: +ratio(ch[0], ch[1]).toFixed(2) },
  };
});
await safe("a11y76-theme-label", async () => {
  await reload("#/");
  const before = await evalJs(`document.querySelector('.icon-btn').getAttribute('aria-label')`);
  await evalJs(`document.querySelector('.icon-btn').click(); 'ok'`); await sleep(400);
  const after = await evalJs(`document.querySelector('.icon-btn').getAttribute('aria-label')`);
  await evalJs(`document.querySelector('.icon-btn').click(); 'ok'`); await sleep(300);
  return { before, after };
});
await safe("a11y77-landmarks", async () => {
  return evalJs(`(() => ({header: !!document.querySelector('header'), nav: !!document.querySelector('nav'), main: !!document.querySelector('main#konten'), footer: !!document.querySelector('footer'), skipLink: !!document.querySelector('.skip-link')})()`);
});
await safe("a11y78-aria-current", async () => {
  return evalJs(`document.querySelectorAll('[aria-current]').length`);
});
await safe("a11y79-countdown-live", async () => {
  await reload("#/");
  return evalJs(`(() => { const c=document.querySelector('.count-chip'); if(!c) return {found:false}; return {found:true, ariaLive: c.getAttribute('aria-live'), text: c.textContent}; })()`);
});

// ================= J. Teknis 93, 96-99 =================
await safe("j93-fonts-blocked", async () => {
  await send("Network.setBlockedURLs", { urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"] });
  await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
  await sleep(3000);
  const r = await evalJs(`(() => { const h=document.querySelector('.hero h1'); const cs=getComputedStyle(document.body); return {fontsLoaded: document.fonts.size, interLoaded: document.fonts.check('16px Inter'), heroVisible: h ? h.offsetHeight > 0 : false, heroText: h ? h.textContent : null, bodyFont: cs.fontFamily.slice(0,60), scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth}; })()`);
  await send("Network.setBlockedURLs", { urls: [] });
  return r;
});
await safe("j96-token-from-cek", async () => {
  await reload("#/pln");
  await setInput("#idpel", "543210987654"); await sleep(200);
  await clickText(".step .btn", "Cek Nama"); await sleep(300);
  await clickText(".nom", "Token 20.000"); await sleep(200);
  await clickText(".pay", "QRIS"); await sleep(200);
  const bought = await evalJs(`(() => { const b=document.querySelector('.summary .btn.big'); if(b.disabled) return 'DISABLED'; b.click(); return 'ok'; })()`);
  await sleep(1200);
  const ref = await evalJs(`(location.hash.match(/sukses\\/(.+)/)||[])[1] || null`);
  const tokenInStorage = await evalJs(`(() => { const os=JSON.parse(localStorage.getItem('rosdi_orders')||'[]'); const o=os.find(x=>x.ref===${JSON.stringify(ref)}); return o ? o.token : null; })()`);
  await goHash("#/cek/" + ref);
  await sleep(800);
  const inDom = await evalJs(`(() => { const r=document.querySelector('.cek-result'); if(!r) return {result:false}; const t=${JSON.stringify(tokenInStorage)}; return {result:true, tokenShown: t ? r.textContent.includes(t.slice(0,9)) : null, text: r.textContent.slice(0,200)}; })()`);
  return { bought, ref, tokenInStorage: tokenInStorage ? tokenInStorage.slice(0, 8) + "..." : null, inDom };
});
await safe("j97-cek-by-contact", async () => {
  await reload("#/cek");
  return evalJs(`(() => { const inputs=[...document.querySelectorAll('#konten input')].map(e=>e.getAttribute('aria-label')||e.placeholder); return {inputs}; })()`);
});
await safe("j98-instant-claim", async () => {
  await reload("#/");
  const trust = await evalJs(`(() => { const t=[...document.querySelectorAll('.trust .card')].map(e=>e.textContent); return t; })()`);
  // status order terakhir (dari j96) — lacak lagi
  const orders = await evalJs(`(() => { const os=JSON.parse(localStorage.getItem('rosdi_orders')||'[]'); return os.length ? os[0].ref : null; })()`);
  let statusNow = null, statusLater = null;
  if (orders) {
    await goHash("#/cek/" + orders);
    await sleep(600);
    statusNow = await evalJs(`(() => { const r=document.querySelector('.cek-result'); return r ? r.textContent.match(/Diproses|Selesai/)?.[0] : null; })()`);
    await sleep(5000);
    statusLater = await evalJs(`(() => { const r=document.querySelector('.cek-result'); return r ? r.textContent.match(/Diproses|Selesai/)?.[0] : null; })()`);
  }
  return { trust, ref: orders, statusNow, statusLater };
});
await safe("j99-onboarding", async () => {
  await evalJs(`localStorage.clear(); 'ok'`);
  await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
  await sleep(2500);
  return evalJs(`(() => { const modal=!!document.querySelector('.modal-veil'); const guide=[...document.querySelectorAll('h1,h2')].map(e=>e.textContent).filter(t=>/selamat datang|panduan|mulai/i.test(t)); return {modal, guide, h1: document.querySelector('h1') ? document.querySelector('h1').textContent : null}; })()`);
});

writeFileSync(`${outDir}/cdp-s449-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).length, "probes");
process.exit(0);
