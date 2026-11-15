// Probe CDP lanjutan batch s435: lebar F (51-60), a11y produk D (31-40 redo),
// tagline 93, Cek 700px (59), keyboard virtual (16), PLN maks riil (11-redo).
// Penggunaan: node scripts/cdp-s435b.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
mkdirSync(outDir, { recursive: true });
const R = {};
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const to = setTimeout(() => { pending.delete(id); reject(new Error("TIMEOUT " + method)); }, 25000);
    pending.set(id, { resolve: (v) => { clearTimeout(to); resolve(v); }, reject: (e) => { clearTimeout(to); reject(e); } });
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
const setSize = (w, h) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w <= 560 });
await setSize(width, 1000);
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(900); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const clickNom = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.nom')]; const el = els.find((e) => e.querySelector('.n-name')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickPay = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.pay')]; const el = els.find((e) => e.querySelector('.p-name2')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickTab = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.tab')]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { R[id] = await fn(); console.log("s435b:", id, "OK"); } catch (e) { R[id] = { ERROR: String(e).slice(0, 300) }; console.log("s435b:", id, "ERROR", String(e).slice(0, 120)); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2000);
await evalJs(`localStorage.clear(); 'ok'`);

// ---------- Lebar F ----------
if ([375, 393, 414, 834, 1024, 1280, 1440, 2560, 360].includes(width)) {
  await safe("layout" + width, async () => {
    const home = await evalJs(`(() => {
      const g = document.querySelector('.grid.c4');
      const cs = g ? getComputedStyle(g) : null;
      const cards = [...document.querySelectorAll('.grid.c4 .card')].slice(0, 4).map((c) => { const r = c.getBoundingClientRect(); return { w: Math.round(r.width), x: Math.round(r.x) }; });
      const hero = document.querySelector('.hero')?.getBoundingClientRect();
      const wrap = document.querySelector('.wrap')?.getBoundingClientRect();
      const foot = document.querySelector('.foot-in') ? getComputedStyle(document.querySelector('.foot-in')).gridTemplateColumns : null;
      return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, hOverflow: document.documentElement.scrollWidth > window.innerWidth, gameGridTemplate: cs?.gridTemplateColumns, gameGridGap: cs?.gap, cards, heroW: hero ? Math.round(hero.width) : null, wrapW: wrap ? Math.round(wrap.width) : null, footCols: foot };
    })()`);
    await goHash("#/game/mobile-legends");
    await setInput("#uid", "12345678"); await setInput("#zone", "1234");
    const prod = await evalJs(`(() => {
      const flow = document.querySelector('.flow') ? getComputedStyle(document.querySelector('.flow')).gridTemplateColumns : null;
      const nom = document.querySelector('.nom-grid') ? getComputedStyle(document.querySelector('.nom-grid')).gridTemplateColumns : null;
      const aside = document.querySelector('.summary')?.getBoundingClientRect();
      const bar = document.querySelector('.mobile-bar')?.getBoundingClientRect();
      return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, hOverflow: document.documentElement.scrollWidth > window.innerWidth, flowCols: flow, nomGrid: nom, asideW: aside ? Math.round(aside.width) : null, asideX: aside ? Math.round(aside.x) : null, barVisible: !!bar && bar.height > 0 };
    })()`);
    return { home, prod };
  });
}

// ---------- 390: a11y produk, tagline 93, Cek 700, keyboard 16 ----------
if (width === 390) {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await safe("a11yProd", async () => evalJs(`(() => {
    const payBtns = [...document.querySelectorAll('.pay')];
    const tabs = [...document.querySelectorAll('.tab')];
    const flash = document.querySelector('.count-chip');
    const prog = document.querySelector('.progress');
    const uid = document.querySelector('#uid');
    const qtyBtns = [...document.querySelectorAll('.qty button')].map((b) => ({ label: b.getAttribute('aria-label'), disabled: b.disabled }));
    const qtyB = document.querySelector('.qty b');
    const tl = document.querySelector('.timeline');
    return {
      nPay: payBtns.length,
      paySample: payBtns[0] ? { role: payBtns[0].getAttribute('role'), pressed: payBtns[0].getAttribute('aria-pressed'), tag: payBtns[0].tagName } : null,
      payGroup: document.querySelector('.pay-group')?.parentElement?.tagName || null,
      tabsRole: document.querySelector('.tabs')?.getAttribute('role'),
      tabSample: tabs[0] ? { role: tabs[0].getAttribute('role'), pressed: tabs[0].getAttribute('aria-pressed'), selected: tabs[0].getAttribute('aria-selected'), controls: tabs[0].getAttribute('aria-controls') } : null,
      nTabs: tabs.length,
      qtyBtns,
      qtyLive: qtyB?.getAttribute('aria-live'),
      qtyParentLive: qtyB?.parentElement?.getAttribute('aria-live'),
      uidDescribedBy: uid?.getAttribute('aria-describedby'),
      uidInvalid: uid?.getAttribute('aria-invalid'),
      flashAriaHidden: flash?.getAttribute('aria-hidden'),
      flashLive: flash?.getAttribute('aria-live'),
      flashParentLive: flash?.parentElement?.getAttribute('aria-live'),
      progressRole: prog?.getAttribute('role'),
      progressValuenow: prog?.getAttribute('aria-valuenow'),
      timelineTag: tl?.tagName || null,
    };
  })()`));
  // 93: tagline membungkus -> harga tidak rata (kode, 390px)
  await goHash("#/");
  await sleep(600);
  await safe("tagline93", async () => evalJs(`(() => {
    const grid = document.querySelector('.grid.c4');
    if (!grid) return 'NO-GRID';
    const cards = [...grid.querySelectorAll('.card')];
    const rows = {};
    for (const c of cards) {
      const name = c.querySelector('.p-name')?.textContent?.trim();
      const sub = c.querySelector('.p-sub');
      const from = c.querySelector('.p-from');
      const r = c.getBoundingClientRect();
      const key = Math.round(r.top);
      (rows[key] = rows[key] || []).push({ name, subH: sub ? Math.round(sub.getBoundingClientRect().height) : null, fromY: from ? Math.round(from.getBoundingClientRect().top) : null });
    }
    return Object.entries(rows).map(([top, cs]) => ({ top: +top, cards: cs }));
  })()`));
  // 22: crossfade tab (computed transition nom-grid + isi)
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await safe("tab22b", async () => {
    const before = await evalJs(`(() => { const g = document.querySelector('.nom-grid'); const s = getComputedStyle(g); return { transition: s.transition, duration: s.transitionDuration, nNoms: document.querySelectorAll('.nom').length, firstNom: document.querySelector('.nom .n-name')?.textContent }; })()`);
    await clickTab("Weekly Pass"); await sleep(150);
    const after = await evalJs(`(() => ({ nNoms: document.querySelectorAll('.nom').length, firstNom: document.querySelector('.nom .n-name')?.textContent, uid: document.querySelector('#uid')?.value }))()`);
    return { before, after };
  });
  // 16: simulasi keyboard virtual — viewport 390x360, fokus UID
  await safe("keyboard16", async () => {
    await setSize(390, 360); await sleep(400);
    await evalJs(`document.querySelector('#uid')?.focus(); 'ok'`);
    await sleep(300);
    return evalJs(`(() => {
      const uid = document.querySelector('#uid')?.getBoundingClientRect();
      const zone = document.querySelector('#zone')?.getBoundingClientRect();
      const bar = document.querySelector('.mobile-bar')?.getBoundingClientRect();
      const vh = window.innerHeight;
      const covers = (r) => r && bar ? (r.bottom > bar.top && r.top < bar.bottom) : false;
      return { vh, uid: uid ? { top: Math.round(uid.top), bottom: Math.round(uid.bottom) } : null, zone: zone ? { top: Math.round(zone.top), bottom: Math.round(zone.bottom) } : null, barTop: bar ? Math.round(bar.top) : null, uidCoveredByBar: covers(uid), zoneCoveredByBar: covers(zone), uidBelowViewport: uid ? uid.bottom > vh : null };
    })()`);
  });
  await setSize(390, 1000); await sleep(300);
  // 59: Cek Transaksi di tinggi 700px
  await safe("cek700", async () => {
    await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-TEST59A', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '' }])); 'ok'`);
    await setSize(1280, 700); await sleep(400);
    await goHash("#/cek");
    await setInput("input[aria-label='Nomor transaksi']", "RSD-TEST59A");
    await evalJs(`[...document.querySelectorAll('.btn')].find((b) => b.textContent.trim() === 'Cek')?.click(); 'ok'`);
    await sleep(400);
    const r = await evalJs(`(() => {
      const card = document.querySelector('.step')?.getBoundingClientRect();
      const hist = [...document.querySelectorAll('.step')][1]?.getBoundingClientRect();
      return { vh: window.innerHeight, docH: document.documentElement.scrollHeight, needsScroll: document.documentElement.scrollHeight > window.innerHeight, cardBottom: card ? Math.round(card.bottom) : null, histTop: hist ? Math.round(hist.top) : null, histBottom: hist ? Math.round(hist.bottom) : null };
    })()`);
    await setSize(390, 1000);
    return r;
  });
  // 65-realistis: klik Beli, jeda 120 ms (task terpisah), klik lagi — apakah guard menahan?
  await safe("buy65real", async () => {
    await evalJs(`localStorage.clear(); 'ok'`);
    await goHash("#/game/mobile-legends");
    await setInput("#uid", "12345678"); await setInput("#zone", "1234");
    await clickTab("Diamonds"); await sleep(200);
    await clickNom("172 Diamonds");
    await clickPay("QRIS"); await sleep(200);
    const before = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
    await evalJs(`(() => { const b = [...document.querySelectorAll('.mobile-bar .btn, .summary .btn.big')].find((x) => x.textContent.trim() === 'Beli Sekarang' && !x.disabled); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
    await sleep(120);
    const second = await evalJs(`(() => { const b = [...document.querySelectorAll('.mobile-bar .btn, .summary .btn.big')].find((x) => x.textContent.trim() === 'Beli Sekarang' && !x.disabled); if (!b) return 'NO-BTN-SECONDTAP'; b.click(); return 'clicked-again'; })()`);
    await sleep(800);
    const after = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
    return { before, second, after, hash: await evalJs(`location.hash`) };
  });
  // 24: countdown — computed style + tidak ada animasi/pulse
  await goHash("#/");
  await safe("countdown24", async () => evalJs(`(() => {
    const el = document.querySelector('.count-chip');
    if (!el) return 'NO-CHIP';
    const s = getComputedStyle(el);
    const t0 = el.textContent;
    return { cls: el.className, animation: s.animation, transition: s.transition, text0: t0 };
  })()`));
  await sleep(1100);
  await safe("countdown24b", async () => evalJs(`(() => {
    const el = document.querySelector('.count-chip');
    const s = getComputedStyle(el);
    return { text1: el?.textContent, color: s.color, animation: s.animation };
  })()`));
}

// ---------- 320: PLN maks riil (11-redo) ----------
if (width === 320) {
  await goHash("#/pln");
  await setInput("#idpel", "512345678901");
  await evalJs(`[...document.querySelectorAll('.btn')].find((b) => b.textContent.trim() === 'Cek Nama')?.click(); 'ok'`);
  await sleep(300);
  await clickNom("Token 1.000.000"); await sleep(200);
  await clickPay("QRIS"); await sleep(200);
  await safe("plnMax11", async () => evalJs(`(() => {
    const rows = [...document.querySelectorAll('.summary .sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim());
    const total = document.querySelector('.sum-total b')?.textContent || null;
    const mb = document.querySelector('.mobile-bar .mb-total');
    const mbB = mb?.querySelector('b');
    const mbSpan = mb?.querySelector('span');
    const qtyStepper = !!document.querySelector('.qty');
    return { rows, total, qtyStepper, mbName: mbSpan?.textContent || null, mbTotal: mbB?.textContent || null, mbOverflow: mbB ? { scrollW: mbB.scrollWidth, clientW: mbB.clientWidth } : null, mbSpanOverflow: mbSpan ? { scrollW: mbSpan.scrollWidth, clientW: mbSpan.clientWidth, text: mbSpan.textContent } : null };
  })()`));
}
writeFileSync(`${outDir}/s435b-w${width}.json`, JSON.stringify(R, null, 1));
console.log(`S435B W${width} OK`);
try { ws.close(); } catch { /* abaikan */ }
process.exit(0);
