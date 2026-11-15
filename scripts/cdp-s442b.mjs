// Probe perbaikan s442b: chip filter bersih, mulai-Rp, ganti harga, skema lama,
// kontras light, inisial SR, peringatan pembelian besar, font/LCP profil segar.
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, _widthArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const R = {};
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
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const probe = async (key, fn) => { try { R[key] = await fn(); } catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; } console.log("PROBE-DONE", key); };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// font + LCP bersih (profil segar, tanpa cache): resource lengkap + document.fonts
await probe("fonts_lcp_clean", () => evalJs(`(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const lcp = performance.getEntriesByType('largest-contentful-paint');
  const res = performance.getEntriesByType('resource').map((r) => ({ name: r.name, type: r.initiatorType, size: Math.round(r.transferSize || 0), dur: Math.round(r.duration) }));
  const fonts = [...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.status);
  const woff2 = res.filter((r) => r.name.includes('woff2') || r.name.includes('font'));
  return {
    domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadEvent: nav ? Math.round(nav.loadEventEnd) : null,
    lcpMs: lcp.length ? Math.round(lcp[lcp.length - 1].startTime) : null,
    lcpEl: lcp.length ? (lcp[lcp.length - 1].element ? lcp[lcp.length - 1].element.tagName + '.' + String(lcp[lcp.length - 1].element.className).slice(0, 40) : null) : null,
    reqCount: res.length,
    resources: res,
    fontsLoaded: fonts,
    woff2Count: woff2.length,
    woff2: woff2,
  };
})()`));

// chip filter dengan pencarian dikosongkan dulu
await probe("chip_filter_clean", async () => {
  await evalJs(`(() => { const inp = document.querySelector('.searchbar input'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(inp, ''); inp.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  await sleep(300);
  const gridBefore = await evalJs(`(() => { const g = document.querySelector('.grid.c4'); const cs = getComputedStyle(g); return { transitionProperty: cs.transitionProperty, transitionDuration: cs.transitionDuration, animationName: cs.animationName }; })()`);
  await evalJs(`(() => { const chips = [...document.querySelectorAll('.chips .chip')]; chips.find((x) => x.textContent === 'Pulsa').click(); return 'ok'; })()`);
  await sleep(300);
  const after = await evalJs(`(() => {
    const cards = [...document.querySelectorAll('.grid a.card')].map((c) => c.querySelector('.p-name')?.textContent);
    return { cards, pulsaCard: cards.some((c) => c && c.includes('Pulsa')) };
  })()`);
  await evalJs(`(() => { const chips = [...document.querySelectorAll('.chips .chip')]; chips.find((x) => x.textContent === 'Semua').click(); return 'ok'; })()`);
  await sleep(200);
  return { gridStyle: gridBefore, after };
});
await probe("mulai_rp_clean", () => evalJs(`(() => {
  const card = [...document.querySelectorAll('.grid.c4 a.card')].find((e) => (e.querySelector('.p-name')?.textContent || '') === 'Mobile Legends');
  const secHead = [...document.querySelectorAll('.sec-head .more')].map((e) => e.textContent);
  return { cardFrom: card ? card.querySelector('.p-from')?.textContent : 'NO-CARD', secHead, feeMention: card ? /biaya|fee/i.test(card.textContent) : null };
})()`));
await probe("sr_game_initials_clean", () => evalJs(`(() => {
  const cards = [...document.querySelectorAll('.grid.c4 a.card')].slice(0, 3).map((c) => ({ tile: c.querySelector('.tile')?.textContent, tileAria: c.querySelector('.tile')?.getAttribute('aria-label'), name: c.querySelector('.p-name')?.textContent }));
  return cards;
})()`));

// ganti harga: reset ke tab Diamonds dulu
await probe("price_change_clean", async () => {
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  await evalJs(`(() => { const tabs = [...document.querySelectorAll('.tab')]; tabs[0].click(); return 'ok'; })()`);
  await sleep(300);
  const read = () => evalJs(`[...document.querySelectorAll('.pay .p-price')].map((e) => e.childNodes[0].textContent.trim()).join('|')`);
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; noms[0].click(); return 'ok'; })()`);
  await sleep(200);
  const before = await read();
  const style = await evalJs(`(() => { const p = document.querySelector('.pay .p-price'); const cs = getComputedStyle(p); return { transitionProperty: cs.transitionProperty, transitionDuration: cs.transitionDuration, animationName: cs.animationName }; })()`);
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; noms[7].click(); return 'ok'; })()`);
  await sleep(100);
  const mid = await read();
  await sleep(400);
  const after = await read();
  return { before, mid100ms: mid, after500ms: after, payStyle: style };
});

// skema lama — ekspresi diperbaiki
await probe("cek_old_schema_clean", async () => {
  await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-OLD001', product: 'Mobile Legends', item: '86 Diamonds' }])); location.hash = '#/cek'; 'ok'`);
  await sleep(1200);
  const hist = await evalJs(`(() => { const rows = [...document.querySelectorAll('.step button.sum-row')].map((e) => e.textContent); return { rows: rows, count: rows.length }; })()`);
  await evalJs(`(() => { const row = document.querySelector('.step button.sum-row'); if (row) row.click(); return 'ok'; })()`);
  await sleep(1000);
  const suk = await evalJs(`(() => { const t = document.body.innerText; return { text: t.slice(0, 300), hasNaN: t.indexOf('NaN') >= 0, hasUndefined: t.indexOf('undefined') >= 0, h1: document.querySelector('h1') ? document.querySelector('h1').textContent : null }; })()`);
  await evalJs(`localStorage.clear(); 'ok'`);
  return { history: hist, sukses: suk };
});

// kontras light — ekspresi diperbaiki
await probe("contrast_light_clean", async () => {
  await evalJs(`location.hash = '#/'; 'ok'`);
  await sleep(1200);
  return evalJs(`(() => {
    const g = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : 'NO-EL'; };
    return {
      badgeColor: g('.badge', 'color'), badgeBg: g('.badge', 'backgroundColor'),
      wasColor: g('.was', 'color'), wasBg: g('.was', 'backgroundColor'),
      copyrightColor: g('.copyright', 'color'),
      statusTagNote: 'Danamon tidak ada di Beranda — cek di halaman produk',
    };
  })()`);
});
await probe("status_tag_contrast", async () => {
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; noms[0].click(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => {
    const tag = document.querySelector('.status-tag');
    if (!tag) return 'NO-TAG';
    const cs = getComputedStyle(tag);
    return { text: tag.textContent, color: cs.color, bg: cs.backgroundColor, opacity: getComputedStyle(tag.closest('.pay')).opacity };
  })()`);
});

// peringatan pembelian besar — nota mana yang cocok
await probe("large_warning_which_note", async () => {
  await evalJs(`location.hash = '#/pln'; 'ok'`);
  await sleep(1200);
  await evalJs(`(() => { const el = document.querySelector('#idpel'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, '12345678901'); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  await evalJs(`(() => { document.querySelector('.step .btn').click(); return 'ok'; })()`);
  await sleep(300);
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; noms[noms.length - 1].click(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => {
    const notes = [...document.querySelectorAll('.note')].map((e) => e.textContent);
    const total = document.querySelector('.sum-total b') ? document.querySelector('.sum-total b').textContent : null;
    return { total, notes };
  })()`);
});

// SR urutan kartu nominal ber-badge+meta (86 Diamonds)
await probe("sr_nom_badge_order", async () => {
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  return evalJs(`(() => {
    const nom = [...document.querySelectorAll('.nom')].find((n) => (n.textContent || '').indexOf('86 Diamonds') >= 0);
    if (!nom) return 'NO-NOM';
    return { domOrder: [...nom.children].map((c) => c.className + ':' + c.textContent.slice(0, 18)) };
  })()`);
});

writeFileSync(`${outDir}/cdp-s442b.json`, JSON.stringify(R, null, 1));
console.log("SELESAI-B");
process.exit(0);
