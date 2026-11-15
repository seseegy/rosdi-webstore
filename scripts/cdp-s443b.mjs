// Probe susulan live s443b (390): promo case/spasi scoped, promo min, persistensi
// pay/promo, a11y Cek/Sukses, diagnosis cross-tab, transisi nav.
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH };
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
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH < 900 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const setInput = async (sel, val) => evalJs(`(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return 'NO-EL';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(val)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'set';
})()`);
const PARTIAL = `${outDir}/cdp-s443b-partial-${WIDTH}.jsonl`;
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT-45s:" + label)), ms))]);
const probe = async (key, fn) => {
  try { R[key] = await withTimeout(fn(), 45000, key); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const goHash = async (h) => { await evalJs(`location.hash = ${JSON.stringify(h)}; 'ok'`); await sleep(1400); };

// ---------- transisi nav aktif (ide 2) ----------
await probe("nav_transition", () => evalJs(`(() => {
  const a = document.querySelector('nav.main a');
  if (!a) return 'NO-NAV';
  const cs = getComputedStyle(a);
  return { transition: cs.transition, transitionDuration: cs.transitionDuration, onBg: getComputedStyle(document.querySelector('nav.main a.on')).backgroundColor, display: cs.display };
})()`));

// ---------- promo case/spasi scoped ke langkah promo (ide 27/28) ----------
await goHash("#/game/mobile-legends");
await probe("promo_case_space2", async () => {
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  const promoNote = () => evalJs(`(() => { const steps = document.querySelectorAll('.step'); const last = steps[steps.length - 1]; const n = last.querySelector('.note.good, .note.bad'); return n ? n.textContent : null; })()`);
  const tryCode = async (code) => {
    await setInput(".step input[aria-label='Kode promo']", code);
    await sleep(200);
    await evalJs(`(() => { document.querySelector('.step form').requestSubmit(); return 'ok'; })()`);
    await sleep(300);
    return { note: await promoNote(), disc: await evalJs(`document.querySelector('.sum-row.disc b')?.textContent || null`) };
  };
  const lower = await tryCode("rosdi10");
  const spaced = await tryCode("ROSDI 10");
  const upper = await tryCode("ROSDI10");
  return { lower, spaced, upper };
});

// ---------- promo item termurah Rp1.650 (ide 51) ----------
await probe("promo_min2", async () => {
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`(() => { document.querySelector('.step form').requestSubmit(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => ({ item: document.querySelector('.nom.on .n-name')?.textContent, price: document.querySelector('.nom.on .n-price')?.textContent, disc: document.querySelector('.sum-row.disc b')?.textContent || null, total: document.querySelector('.sum-total b')?.textContent }))()`);
});

// ---------- persistensi pay + promo antar tab (ide 32/33) ----------
await probe("pay_promo_persist2", async () => {
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('GoPay')).click(); return 'ok'; })()`);
  await sleep(200);
  const before = await evalJs(`(() => ({ pay: document.querySelector('.pay.on .p-name2')?.textContent, disc: document.querySelector('.sum-row.disc b')?.textContent || null }))()`);
  await evalJs(`(() => { [...document.querySelectorAll('.tab')].find((x) => x.textContent.includes('Weekly')).click(); return 'ok'; })()`);
  await sleep(300);
  const weeklyNoItem = await evalJs(`(() => ({ pay: document.querySelector('.pay.on .p-name2')?.textContent || 'NONE', disc: document.querySelector('.sum-row.disc b')?.textContent || null }))()`);
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`); // Weekly Diamond Pass
  await sleep(300);
  const weeklyWithItem = await evalJs(`(() => ({ pay: document.querySelector('.pay.on .p-name2')?.textContent || 'NONE', disc: document.querySelector('.sum-row.disc b')?.textContent || null, total: document.querySelector('.sum-total b')?.textContent }))()`);
  await evalJs(`(() => { [...document.querySelectorAll('.tab')].find((x) => x.textContent.includes('Diamonds')).click(); return 'ok'; })()`);
  await sleep(300);
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(300);
  const back = await evalJs(`(() => ({ pay: document.querySelector('.pay.on .p-name2')?.textContent || 'NONE', disc: document.querySelector('.sum-row.disc b')?.textContent || null, total: document.querySelector('.sum-total b')?.textContent }))()`);
  return { before, weeklyNoItem, weeklyWithItem, back };
});

// ---------- Cek/Sukses a11y (ide 71/75/76/79) ----------
await probe("cek_a11y2", async () => {
  const refs = await evalJs(`(() => { try { const l = JSON.parse(localStorage.getItem('rosdi_orders') || '[]'); return l.map((o) => o.ref); } catch { return []; } })()`);
  if (!refs.length) return { ERROR: "NO-ORDERS-IN-STORAGE", refs };
  const ref = refs[0];
  await goHash("#/cek");
  await setInput(".step .input", ref);
  await sleep(200);
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((b) => b.textContent.trim() === 'Cek').click(); return 'ok'; })()`);
  await sleep(600);
  const res = await evalJs(`(() => {
    const heads = [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ':' + h.textContent.trim().slice(0, 30));
    const found = !!document.querySelector('.timeline');
    const tl = document.querySelector('.timeline');
    let order = null;
    if (tl) {
      const container = tl.closest('.step');
      order = [...container.children].map((c) => (c.className || c.tagName) + ':' + (c.textContent || '').slice(0, 40));
    }
    const statusEls = [...document.querySelectorAll('.step *')].filter((e) => e.children.length === 0 && e.textContent.trim() === 'Diproses');
    const st = statusEls[0];
    const liveOnStatus = statusEls.map((e) => e.closest('[aria-live]')?.getAttribute('aria-live') || null);
    return { heads, found, refShown: document.body.innerText.includes(ref), domOrder: order, statusCount: statusEls.length, statusColor: st ? getComputedStyle(st).color : null, statusBg: st ? getComputedStyle(st).backgroundColor : null, statusClass: st ? st.className : null, liveOnStatus, allLive: [...document.querySelectorAll('[aria-live]')].map((e) => e.tagName + '.' + (e.className || '') + '=' + e.getAttribute('aria-live')) };
  })()`);
  await goHash("#/sukses/" + ref);
  const suc = await evalJs(`(() => ({ heads: [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ':' + h.textContent.trim().slice(0, 30)), hasDuration: /hari/.test(document.body.innerText), hasTarif: /VA/.test(document.body.innerText), rows: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent).join(' || ') }))()`);
  return { ref, res, suc };
});

// ---------- diagnosis cross-tab (ide 37) ----------
await probe("cross_tab_diag", async () => {
  const origin = wsUrl.replace(/^ws/, "http").replace(/\/devtools\/page\/.*$/, "");
  const res = await fetch(origin + "/json/new", { method: "PUT" });
  const tab = await res.json();
  const ws2 = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res2, rej) => { ws2.onopen = res2; ws2.onerror = () => rej(new Error("TAB2-WS")); });
  let nid = 1; const pend = new Map();
  ws2.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
  const send2 = (method, params = {}) => new Promise((resolve) => { const i = nid++; pend.set(i, resolve); ws2.send(JSON.stringify({ id: i, method, params })); });
  const ev2 = (expression) => send2("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
  await send2("Page.enable");
  await send2("Runtime.enable");
  await send2("Page.navigate", { url: baseUrl + "#/cek" });
  await sleep(5000);
  const t2state = await ev2(`(() => ({ url: location.href, orders: (() => { try { return JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length; } catch { return 'ERR'; } })(), histBtns: document.querySelectorAll('.step button.sum-row').length, h1: document.querySelector('h1')?.textContent }))()`);
  // buat order baru di tab utama
  await goHash("#/game/free-fire");
  await setInput("#uid", "11223344");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[1].click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')).click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
  await sleep(1500);
  const newRef = await evalJs(`location.hash`);
  await sleep(1000);
  const t2after = await ev2(`(() => ({ orders: (() => { try { return JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length; } catch { return 'ERR'; } })(), histBtns: document.querySelectorAll('.step button.sum-row').length }))()`);
  await ev2(`location.reload(); 'x'`);
  await sleep(5000);
  const t2reloaded = await ev2(`(() => ({ orders: (() => { try { return JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length; } catch { return 'ERR'; } })(), histBtns: document.querySelectorAll('.step button.sum-row').length }))()`);
  try { ws2.close(); } catch {}
  try { await fetch(origin + "/json/close/" + tab.id); } catch {}
  return { t2state, newRef, t2after, t2reloaded };
});

writeFileSync(`${outDir}/cdp-s443b-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH);
try { ws.close(); } catch {}
process.exit(0);
