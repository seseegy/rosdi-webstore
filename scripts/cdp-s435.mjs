// Ukur runtime CDP batch s435: ide 11-30, 32-40, 51-70 (runtime), 18-20.
// Penggunaan: node scripts/cdp-s435.mjs <wsUrl> <width> <baseUrl> <outDir>
// Satu tarikan browser dipakai untuk puluhan ide sekaligus.
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; };

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
const setMetrics = (w, h, mobile) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
await setMetrics(width, 1000, width <= 560);

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1200); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const click = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickNom = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.nom')]; const el = els.find((e) => e.querySelector('.n-name')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickPay = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.pay')]; const el = els.find((e) => e.querySelector('.p-name2')?.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const clickTab = async (name) => evalJs(`(() => { const els = [...document.querySelectorAll('.tab')]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(name)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const summary = () => evalJs(`(() => { const rows = [...document.querySelectorAll('.summary .sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()); const total = document.querySelector('.sum-total b')?.textContent || null; const mb = document.querySelector('.mobile-bar .mb-total'); const mbName = mb?.querySelector('span')?.textContent || null; const mbTotal = mb?.querySelector('b')?.textContent || null; const mbB = mb?.querySelector('b'); return { rows, total, mbName, mbTotal, mbOverflow: mbB ? { scrollW: mbB.scrollWidth, clientW: mbB.clientWidth, text: mbB.textContent } : null, mbSpanOverflow: mb?.querySelector('span') ? { scrollW: mb.querySelector('span').scrollWidth, clientW: mb.querySelector('span').clientWidth } : null }; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---- animasi: transisi terhitung (ide 21-30) di Beranda
await safe("anim", async () => evalJs(`(() => {
  const cs = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { transition: s.transition, transitionDuration: s.transitionDuration, animation: s.animationName }; };
  return {
    body: cs('body'), sumTotalB: cs('.sum-total b'), nomGrid: cs('.nom-grid'),
    progressI: cs('.progress i'), chip: cs('.chip'), countChip: cs('.count-chip'),
    btn: cs('.btn'), html: getComputedStyle(document.documentElement).scrollBehavior,
  };
})()`));
await safe("countdown", async () => {
  const a = await evalJs(`document.querySelector('.count-chip')?.textContent || null`);
  await sleep(1100);
  const b = await evalJs(`document.querySelector('.count-chip')?.textContent || null`);
  return { t0: a, t1: b, changed: a !== b, cls: await evalJs(`document.querySelector('.count-chip')?.className || null`) };
});
// progress bar langsung penuh? (29)
await safe("progress29", async () => evalJs(`(() => { const i = document.querySelector('.progress i'); if (!i) return null; const w = i.style.width; const cw = i.getBoundingClientRect().width; const pw = i.parentElement.getBoundingClientRect().width; return { styleWidth: w, pct: +(100 * cw / pw).toFixed(1), transition: getComputedStyle(i).transition }; })()`));
// ---- 30: chip aktif pindah instan?
await safe("chip30", async () => {
  const before = await evalJs(`document.querySelector('.chip.on')?.textContent`);
  await click(`.chip:nth-child(2)`); await sleep(150);
  const after = await evalJs(`document.querySelector('.chip.on')?.textContent`);
  return { before, after, chipTransition: await evalJs(`getComputedStyle(document.querySelector('.chip')).transition`) };
});
await click(`.chip:nth-child(1)`); await sleep(150);

// ---- 14/15/32/33/34/35: MLBB segar, ringkasan kosong + semantik
await goHash("#/game/mobile-legends");
await safe("empty1415", summary);
await safe("a11y32333435", async () => evalJs(`(() => {
  const pays = [...document.querySelectorAll('.pay')].map((p) => ({ role: p.getAttribute('role'), pressed: p.getAttribute('aria-pressed') }));
  const tabs = [...document.querySelectorAll('.tab')].map((t) => ({ role: t.getAttribute('role'), pressed: t.getAttribute('aria-pressed'), selected: t.getAttribute('aria-selected') }));
  const qb = [...document.querySelectorAll('.qty button')].map((b) => ({ label: b.getAttribute('aria-label'), disabled: b.disabled }));
  const qv = document.querySelector('.qty b');
  const uid = document.querySelector('#uid');
  const flash = document.querySelector('.count-chip');
  return {
    nPay: pays.length, paySample: pays[0], tabSample: tabs[0], nTabs: tabs.length,
    qtyButtons: qb, qtyValueLive: qv?.getAttribute('aria-live') || null,
    uidInvalid: uid?.getAttribute('aria-invalid') || null, uidDescribedBy: uid?.getAttribute('aria-describedby') || null,
    flashAriaHidden: flash?.getAttribute('aria-hidden') || null, flashLive: flash?.getAttribute('aria-live') || null,
    tabsRole: document.querySelector('.tabs')?.getAttribute('role') || null,
  };
})()`));
// ---- 39: kartu game satu tab stop?
await goHash("#/");
await safe("card39", async () => evalJs(`(() => { const card = document.querySelector('.grid.c4 a.card'); if (!card) return null; const focusables = card.querySelectorAll('a, button, input, [tabindex]'); return { tag: card.tagName, href: card.getAttribute('href'), focusablesInside: focusables.length }; })()`));
// ---- 37/38: progress + timeline butuh Cek; progress di Beranda
await safe("progress38", async () => evalJs(`(() => { const p = document.querySelector('.progress'); return p ? { role: p.getAttribute('role'), valuenow: p.getAttribute('aria-valuenow'), label: p.getAttribute('aria-label') } : null; })()`));

// ---- lebar: struktur grid + overflow (51-57) — dijalankan di tiap lebar
await safe("layout", async () => evalJs(`(() => {
  const cols = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { template: s.gridTemplateColumns, gap: s.columnGap, n: el.children.length }; };
  const hero = document.querySelector('.hero')?.getBoundingClientRect();
  const wrap = document.querySelector('.wrap')?.getBoundingClientRect();
  const foot = document.querySelector('.foot-in') ? getComputedStyle(document.querySelector('.foot-in')).gridTemplateColumns : null;
  return {
    scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
    hOverflow: document.documentElement.scrollWidth > window.innerWidth,
    gameGrid: cols('.grid.c4'), utilGrid: cols('.grid.c3'), flashGrid: cols('.grid.c2'),
    flow: cols('.flow'), nomGrid: cols('.nom-grid'), trust: cols('.trust'),
    heroW: hero ? +hero.width.toFixed(1) : null, wrapW: wrap ? +wrap.width.toFixed(1) : null,
    footCols: foot, h1Size: document.querySelector('.hero h1') ? +getComputedStyle(document.querySelector('.hero h1')).fontSize.replace('px', '') : null,
  };
})()`));

if (width <= 900) {
  // ---- 11: total terbesar yang BISA dicapai (MLBB qty 10 + pulsa + ROSDI10)
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickNom("2195 Diamonds");
  for (let i = 0; i < 9; i++) await click(".qty .plus");
  await clickPay("Pulsa Telkomsel");
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await click(".step form .btn");
  await sleep(300);
  await safe("maxTotal11", summary);
  await safe("qty63", async () => evalJs(`(() => ({ qty: document.querySelector('.qty b')?.textContent, plusDisabled: document.querySelector('.qty .plus')?.disabled, total: document.querySelector('.sum-total b')?.textContent }))()`));
  // ---- 19: flash WDP + ROSDI10 (was vs diskon)
  await goHash("#/game/mobile-legends");
  await clickTab("Weekly Pass"); await sleep(200);
  await clickNom("Weekly Diamond Pass");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await click(".step form .btn"); await sleep(300);
  await safe("flash19", summary);
  // ---- 13: nama terpanjang di mobile-bar 320
  await clickTab("Blessing"); await sleep(200);
  await clickNom("Blessing of the Welkin Moon"); await sleep(200);
  await safe("blessing13", summary);
  // ---- 22: UID stabil saat ganti tab
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickTab("Weekly Pass"); await sleep(200);
  await safe("tab22", async () => evalJs(`({ uid: document.querySelector('#uid')?.value, zone: document.querySelector('#zone')?.value, selectedNom: document.querySelector('.nom.on')?.textContent?.trim() || null })`));
  await clickTab("Diamonds"); await sleep(200);
  await safe("tab22b", async () => evalJs(`({ uid: document.querySelector('#uid')?.value, selectedNom: document.querySelector('.nom.on')?.textContent?.trim() || null })`));
  // ---- 61: klik nominal 5x cepat
  await safe("race61", async () => {
    await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; [0, 5, 2, 9, 13].forEach((i) => noms[i]?.click()); return 'ok'; })()`);
    await sleep(200);
    return evalJs(`(() => ({ selected: document.querySelector('.nom.on .n-name')?.textContent, total: document.querySelector('.sum-total b')?.textContent }))()`);
  });
  // ---- 62: tab bolak-balik
  await safe("race62", async () => {
    await clickTab("Weekly Pass"); await sleep(150);
    await clickNom("Weekly Diamond Pass"); await sleep(150);
    await clickTab("Diamonds"); await sleep(150);
    await clickTab("Weekly Pass"); await sleep(150);
    return evalJs(`(() => ({ selected: document.querySelector('.nom.on .n-name')?.textContent || null, tab: document.querySelector('.tab.on')?.textContent }))()`);
  });
  // ---- 63: stepper + 10x cepat (qty sudah 1 di tab baru? reset via reload hash)
  await goHash("#/game/mobile-legends");
  await safe("race63", async () => {
    await evalJs(`(() => { const p = document.querySelector('.qty .plus'); for (let i = 0; i < 12; i++) p.click(); return 'ok'; })()`);
    await sleep(200);
    return evalJs(`(() => ({ qty: document.querySelector('.qty b')?.textContent, plusDisabled: document.querySelector('.qty .plus')?.disabled }))()`);
  });
  // ---- 64: Pakai promo 3x cepat
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickNom("172 Diamonds");
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await safe("race64", async () => {
    await evalJs(`(() => { const f = document.querySelector('.step form'); for (let i = 0; i < 3; i++) f.requestSubmit(); return 'ok'; })()`);
    await sleep(300);
    return evalJs(`(() => ({ discRows: document.querySelectorAll('.sum-row.disc').length, discText: document.querySelector('.sum-row.disc')?.textContent?.replace(/\\s+/g, ' ').trim(), total: document.querySelector('.sum-total b')?.textContent, msg: [...document.querySelectorAll('.note.good')].map((n) => n.textContent.trim()) }))()`);
  });
  // ---- 68: promo ganti + salah
  await safe("race68", async () => {
    await setInput(".step input[aria-label='Kode promo']", "GAMER5");
    await click(".step form .btn"); await sleep(200);
    const afterGamer = await evalJs(`(() => ({ disc: document.querySelector('.sum-row.disc')?.textContent?.replace(/\\s+/g, ' ').trim(), msg: document.querySelector('.note.good, .note.bad')?.textContent?.trim() }))()`);
    await setInput(".step input[aria-label='Kode promo']", "SALAH99");
    await click(".step form .btn"); await sleep(200);
    const afterBad = await evalJs(`(() => ({ discRows: document.querySelectorAll('.sum-row.disc').length, msg: document.querySelector('.note.bad')?.textContent?.trim() }))()`);
    return { afterGamer, afterBad };
  });
  // ---- 69: metode bertahan saat nominal berubah
  await safe("race69", async () => {
    await clickPay("QRIS"); await sleep(150);
    await clickNom("86 Diamonds"); await sleep(150);
    await clickNom("172 Diamonds"); await sleep(150);
    return evalJs(`(() => ({ payOn: document.querySelector('.pay.on .p-name2')?.textContent, total: document.querySelector('.sum-total b')?.textContent }))()`);
  });
  // ---- 20: Biaya Rp0 vs tanpa biaya (QRIS terpilih)
  await safe("fee20", async () => evalJs(`(() => { const payRow = document.querySelector('.pay.on .p-fee')?.textContent; const biayaRow = [...document.querySelectorAll('.summary .sum-row')].find((r) => r.textContent.includes('Biaya pembayaran')); return { payFeeLabel: payRow, summaryBiaya: biayaRow?.textContent?.replace(/\\s+/g, ' ').trim() }; })()`));
  // ---- 65: double-tap buy -> 1 order; 18: total Sukses vs mobile-bar
  await safe("buy65", async () => {
    const before = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
    const mbTotal = await evalJs(`document.querySelector('.mobile-bar .mb-total b')?.textContent`);
    await evalJs(`(() => { const b = [...document.querySelectorAll('.btn')].find((x) => x.textContent.trim() === 'Beli Sekarang' && !x.disabled); b.click(); b.click(); return 'ok'; })()`);
    await sleep(1200);
    const after = await evalJs(`JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length`);
    const hash = await evalJs(`location.hash`);
    const suksesTotal = await evalJs(`document.querySelector('.sum-total b')?.textContent || null`);
    const suksesH1 = await evalJs(`document.querySelector('h1')?.textContent || null`);
    return { before, after, hash, mbTotalBeforeBuy: mbTotal, suksesTotal, suksesH1 };
  });
  // ---- 27: penanda Disalin (di Sukses)
  await safe("copy27", async () => {
    const t0 = await evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return 'NO-BTN'; b.click(); return document.querySelector('.btn.ghost')?.textContent?.trim(); })()`);
    await sleep(1000);
    const t1 = await evalJs(`[...document.querySelectorAll('.btn.ghost')].find((x) => /Disalin/.test(x.textContent))?.textContent?.trim() || [...document.querySelectorAll('.btn.ghost')].map((x) => x.textContent.trim()).join('|')`);
    await sleep(1500);
    const t2 = await evalJs(`[...document.querySelectorAll('.btn.ghost')].map((x) => x.textContent.trim()).join('|')`);
    return { t0, t1s: t1, t2_5s: t2 };
  });
  // ---- 36: toast disalin aria-live?
  await safe("copy36", async () => evalJs(`(() => { const b = [...document.querySelectorAll('.btn.ghost')].find((x) => /Salin/.test(x.textContent)); return b ? { live: b.getAttribute('aria-live'), role: b.getAttribute('role') } : null; })()`));
  // ---- 66: tema 5x cepat
  await safe("theme66", async () => {
    await evalJs(`(() => { const b = document.querySelector('[aria-label="Ganti tema"]'); for (let i = 0; i < 5; i++) b.click(); return 'ok'; })()`);
    await sleep(300);
    return evalJs(`({ theme: document.documentElement.dataset.theme, bodyBg: getComputedStyle(document.body).backgroundColor, btnBg: getComputedStyle(document.querySelector('.btn')).backgroundColor })`);
  });
  // ---- 67: modal buka-tutup cepat
  await safe("modal67", async () => {
    await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Masuk'); for (let i = 0; i < 3; i++) { b.click(); } return 'ok'; })()`);
    await sleep(300);
    const open = await evalJs(`document.querySelectorAll('.modal-veil').length`);
    await evalJs(`(() => { const v = document.querySelector('.modal-veil'); v?.click(); return 'ok'; })()`);
    await sleep(300);
    const closed = await evalJs(`document.querySelectorAll('.modal-veil').length`);
    return { openVeils: open, afterCloseVeils: closed };
  });
  // ---- 25: animasi modal buka/tutup
  await safe("modal25", async () => {
    await evalJs(`(() => { [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Masuk')?.click(); return 'ok'; })()`);
    await sleep(200);
    const t = await evalJs(`(() => { const v = document.querySelector('.modal-veil'); const m = document.querySelector('.modal'); return { veilTransition: v ? getComputedStyle(v).transition : null, modalTransition: m ? getComputedStyle(m).transition : null, modalAnimation: m ? getComputedStyle(m).animationName : null }; })()`);
    await evalJs(`(() => { document.querySelector('.modal-veil')?.click(); return 'ok'; })()`);
    await sleep(200);
    const gone = await evalJs(`document.querySelectorAll('.modal-veil').length`);
    return { ...t, veilsAfterClose: gone };
  });
  // ---- 28: error menggeser layout?
  await goHash("#/game/mobile-legends");
  await safe("shift28", async () => {
    const before = await evalJs(`(() => { const s2 = document.querySelectorAll('.step')[1]; return s2 ? +s2.getBoundingClientRect().top.toFixed(1) : null; })()`);
    await setInput("#uid", "abc"); await sleep(200);
    const after = await evalJs(`(() => { const s2 = document.querySelectorAll('.step')[1]; return s2 ? +s2.getBoundingClientRect().top.toFixed(1) : null; })()`);
    const errShown = await evalJs(`[...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim())`);
    return { step2TopBefore: before, step2TopAfter: after, shifted: before !== after, errShown };
  });
  // ---- 70: scroll cepat + klik kartu
  await goHash("#/");
  await safe("scroll70", async () => {
    await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
    await sleep(400);
    const clicked = await evalJs(`(() => { const cards = [...document.querySelectorAll('.grid.c4 a.card')]; const c = cards[cards.length - 1]; const name = c.querySelector('.p-name')?.textContent; c.click(); return name; })()`);
    await sleep(1000);
    const hash = await evalJs(`location.hash`);
    return { clicked, hash };
  });
  // ---- 12: e-money max yang bisa dicapai (qty tidak ada) di 390
  if (width === 390) {
    await goHash("#/emoney/dana");
    await setInput("#hp", "081234567890");
    await clickNom("Saldo 500.000");
    await clickPay("Pulsa Telkomsel");
    await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
    await click(".step form .btn"); await sleep(300);
    await safe("emoney12", summary);
  }
  // ---- 58: landscape 360 tinggi — input vs mobile-bar
  await setMetrics(width, 360, true);
  await goHash("#/game/mobile-legends");
  await safe("landscape58", async () => {
    await evalJs(`document.querySelector('#uid')?.focus(); 'ok'`);
    await sleep(300);
    return evalJs(`(() => { const uid = document.querySelector('#uid')?.getBoundingClientRect(); const bar = document.querySelector('.mobile-bar')?.getBoundingClientRect(); const zone = document.querySelector('#zone')?.getBoundingClientRect(); return { uidBottom: uid ? +uid.bottom.toFixed(1) : null, zoneBottom: zone ? +zone.bottom.toFixed(1) : null, barTop: bar ? +bar.top.toFixed(1) : null, vh: window.innerHeight, uidCoveredByBar: uid && bar ? uid.bottom > bar.top : null }; })()`);
  });
  await setMetrics(width, 1000, width <= 560);
} else {
  // ---- desktop: 59 Cek di tinggi 700; 60 zoom 125%
  if (width === 1280) {
    await setMetrics(1280, 700, false);
    await goHash("#/cek");
    await safe("cek59", async () => evalJs(`({ scrollH: document.documentElement.scrollHeight, vh: window.innerHeight, needsScroll: document.documentElement.scrollHeight > window.innerHeight })`));
    await safe("zoom60", async () => {
      await send("Emulation.setPageScaleFactor", { pageScaleFactor: 1.25 });
      await goHash("#/game/mobile-legends");
      await sleep(600);
      const r = await evalJs(`(() => { const f = document.querySelector('.flow'); const s = f ? getComputedStyle(f) : null; return { flowCols: s?.gridTemplateColumns, innerW: window.innerWidth, scrollW: document.documentElement.scrollWidth, hOverflow: document.documentElement.scrollWidth > window.innerWidth }; })()`);
      await send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
      return r;
    });
    await setMetrics(1280, 1000, false);
  }
  // ---- 37: timeline Cek terstruktur
  await goHash("#/cek");
  await setInput(".step input", "RSD-DEMO1234");
  await click(".step .btn");
  await sleep(400);
  await safe("timeline37", async () => evalJs(`(() => { const tl = document.querySelector('.timeline'); if (!tl) return null; return { tag: tl.tagName, items: [...tl.children].map((li) => ({ tag: li.tagName, cls: li.className, text: li.textContent.replace(/\\s+/g, ' ').trim() })) }; })()`));
  // ---- 40: h1 Sukses — butuh order; pakai demo? Sukses butuh ref; buat order via buy di lebar desktop tidak ada mobile-bar tapi aside ada
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678"); await setInput("#zone", "1234");
  await clickNom("172 Diamonds"); await clickPay("QRIS");
  await safe("buyDesktop", async () => {
    await evalJs(`(() => { const b = document.querySelector('.summary .btn.big'); b?.click(); return 'ok'; })()`);
    await sleep(1200);
    return evalJs(`({ hash: location.hash, h1: document.querySelector('h1')?.textContent, total: document.querySelector('.sum-total b')?.textContent })`);
  });
}

writeFileSync(`${outDir}/s435-w${width}.json`, JSON.stringify(R, null, 1));
console.log(`W${width} OK — ${Object.keys(R).length} checks -> ${outDir}/s435-w${width}.json`);
