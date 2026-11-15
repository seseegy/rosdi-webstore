// Ukur runtime CDP batch s441: animasi (CSS/computed), perilaku tempel/input
// ekstrem, pencarian, loading tombol, login, order lama, triple-combo harga,
// CLS/INP, prefetch, console produksi, a11y, keyboard journey.
// Penggunaan: node scripts/cdp-s441.mjs <wsUrl> <width> <baseUrl> <outDir>
import { writeFileSync, mkdirSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const width = parseInt(widthArg, 10);
mkdirSync(outDir, { recursive: true });
const R = {};
const rec = (id, data) => { R[id] = data; };

const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const consoleMsgs = [];
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
  } else if (msg.method === "Runtime.consoleAPICalled") {
    consoleMsgs.push({ type: msg.params.type, args: (msg.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(" ").slice(0, 300) });
  } else if (msg.method === "Runtime.exceptionThrown") {
    consoleMsgs.push({ type: "EXCEPTION", args: JSON.stringify(msg.params.exceptionDetails).slice(0, 300) });
  } else if (msg.method === "Fetch.requestPaused") {
    // Blokir Google Fonts (ide 36): gagalkan request font, lanjutkan lainnya.
    const u = msg.params.request.url;
    if (u.includes("fonts.googleapis.com") || u.includes("fonts.gstatic.com")) {
      send("Fetch.failRequest", { requestId: msg.params.requestId, errorReason: "BlockedByClient" });
    } else {
      send("Fetch.continueRequest", { requestId: msg.params.requestId });
    }
  }
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width <= 560 });
await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1500); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const click = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---------- 61 CLS Beranda ----------
await safe("cls61", async () => {
  await evalJs(`window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__cls += e.value; } }).observe({ type: 'layout-shift', buffered: true }); 'ok'`);
  await sleep(3000);
  return { cls: await evalJs(`+window.__cls.toFixed(4)`) };
});

// ---------- Animasi dari CSS terhitung (ide 1-10) ----------
await safe("anim_css", async () => evalJs(`(() => {
  const cs = (sel, prop) => { const el = document.querySelector(sel); if (!el) return 'NO-EL'; const s = getComputedStyle(el); return prop ? s[prop] : { transition: s.transition, animation: s.animation, transform: s.transform }; };
  const keyframes = [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules].filter((r) => r.type === CSSRule.KEYFRAMES_RULE).map((r) => r.name); } catch { return []; } });
  return {
    keyframes,
    chipsScrollSnap: cs('.chips', 'scrollSnapType'),
    chipsScrollSnapAlign: (() => { const el = document.querySelector('.chip'); return el ? getComputedStyle(el).scrollSnapAlign : 'NO-EL'; })(),
    heroBtnAnimation: cs('.hero .btn', 'animation'),
    toastDefinedInCss: !!document.querySelector('.toast'),
    toastElements: document.querySelectorAll('.toast').length,
    inputErrTransition: cs('.input.err', 'transition'),
    nomTransition: cs('.nom', 'transition'),
    cardHoverTransform: (() => { const el = document.querySelector('a.card'); if (!el) return 'NO-EL'; return getComputedStyle(el).transform; })(),
  };
})()`));

// ---------- Hover kartu game (ide 3) ----------
await safe("hover3", async () => {
  const box = await evalJs(`(() => { const el = document.querySelector('.grid.c4 a.card'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  if (!box) return "NO-CARD";
  const before = await evalJs(`(() => { const el = document.querySelector('.grid.c4 a.card'); const s = getComputedStyle(el); return { transform: s.transform, borderColor: s.borderColor, boxShadow: s.boxShadow }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  await sleep(400);
  const after = await evalJs(`(() => { const el = document.querySelector('.grid.c4 a.card'); const s = getComputedStyle(el); return { transform: s.transform, borderColor: s.borderColor, boxShadow: s.boxShadow }; })()`);
  return { before, after };
});

// ---------- Prefetch saat hover (ide 62) ----------
await safe("prefetch62", async () => {
  const before = await evalJs(`performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /GamePage|CheckoutShell/.test(n))`);
  const box = await evalJs(`(() => { const el = document.querySelector('.grid.c4 a.card'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  if (box) { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y }); }
  await sleep(1500);
  const after = await evalJs(`performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /GamePage|CheckoutShell/.test(n))`);
  return { before, afterHover: after };
});

// ---------- Pencarian ekstrem (ide 15-18) ----------
await safe("search15_emoji", async () => {
  await setInput(".searchbar input", "🎮");
  await sleep(400);
  return evalJs(`({ empty: !!document.querySelector('.empty'), emptyText: document.querySelector('.empty')?.textContent || null, cards: document.querySelectorAll('a.card').length })`);
});
await safe("search16_long", async () => {
  await setInput(".searchbar input", "a".repeat(100));
  await sleep(400);
  return evalJs(`(() => { const inp = document.querySelector('.searchbar input'); return { empty: !!document.querySelector('.empty'), docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, inputScrollW: inp.scrollWidth, inputClientW: inp.clientWidth, inputMaxLength: inp.maxLength }; })()`);
});
await safe("search17_spaces", async () => {
  await setInput(".searchbar input", "   ");
  await sleep(400);
  return evalJs(`({ empty: !!document.querySelector('.empty'), gameCards: document.querySelectorAll('.grid.c4 a.card').length })`);
});
await safe("search18_special", async () => {
  await setInput(".searchbar input", "###");
  await sleep(400);
  return evalJs(`({ empty: !!document.querySelector('.empty'), emptyText: document.querySelector('.empty')?.textContent || null })`);
});
await setInput(".searchbar input", "");
await sleep(300);

// ---------- Tempel ke UID / promo (ide 11-14) ----------
await goHash("#/game/mobile-legends");
await safe("paste11_rtl", async () => {
  const v = await setInput("#uid", "١٢٣٤٥٦");
  await sleep(300);
  return evalJs(`({ value: ${JSON.stringify(v)}, errNote: document.querySelector('.note.bad')?.textContent || null, inputDir: getComputedStyle(document.querySelector('#uid')).direction })`);
});
await safe("paste12_zerowidth", async () => {
  await setInput("#uid", "1234\u200b5678");
  await sleep(300);
  return evalJs(`({ valueShown: document.querySelector('#uid').value, valueLen: document.querySelector('#uid').value.length, hasZW: document.querySelector('#uid').value.includes('\\u200b'), errNote: document.querySelector('.note.bad')?.textContent || null })`);
});
await safe("paste14_fullwidth", async () => {
  await setInput("#uid", "１２３４５６");
  await sleep(300);
  return evalJs(`({ value: document.querySelector('#uid').value, errNote: document.querySelector('.note.bad')?.textContent || null })`);
});
await safe("paste13_newline_promo", async () => {
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(300);
  const v = await setInput("input[aria-label='Kode promo']", "ROSDI10\n");
  await sleep(300);
  await click("form button[type='submit']");
  await sleep(400);
  return evalJs(`({ promoInputValue: ${JSON.stringify(v)}, promoMsg: document.querySelector('.note.good, .note.bad')?.textContent || null })`);
});

// ---------- INP klik nominal (ide 70) + pilih nominal ----------
await safe("inp70", async () => {
  const t0 = Date.now();
  await click(".nom-grid .nom:nth-child(2)");
  await sleep(100);
  const t1 = await evalJs(`(() => { const el = document.querySelector('.nom-grid .nom:nth-child(2)'); return { selected: el.classList.contains('on'), ariaPressed: el.getAttribute('aria-pressed') }; })()`);
  return { msApprox: Date.now() - t0, ...t1 };
});

// ---------- Fee bilangan bulat (ide 55) + urutan grup (ide 51) + Termurah (ide 52) ----------
await safe("fees55_51_52", async () => evalJs(`(() => {
  const fees = [...document.querySelectorAll('.p-fee')].map((e) => e.textContent);
  const groups = [...document.querySelectorAll('.pay-group')].map((e) => e.textContent);
  const qris = [...document.querySelectorAll('.pay')].find((e) => e.textContent.includes('QRIS'));
  return { fees: fees.slice(0, 14), groups, qrisText: qris ? qris.textContent : null, hasDecimal: fees.some((f) => /,\\d/.test(f)) };
})()`));

// ---------- Qty 10 linear (ide 54) ----------
await safe("qty54", async () => {
  await click(".nom-grid .nom:nth-child(7)"); // 86 Diamonds Rp21.580
  await sleep(200);
  for (let i = 0; i < 9; i++) { await click("button[aria-label='Tambah']"); await sleep(60); }
  await sleep(300);
  return evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((e) => e.textContent); const total = document.querySelector('.sum-total b')?.textContent; return { rows, total, expectedBase: 'Rp215.800' }; })()`);
});

// ---------- Triple combo (ide 56) ----------
await safe("triple56", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  // 706 Diamonds = nominal ke-12 (index 11) di tab Diamonds
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom-grid .nom')]; const el = noms.find((n) => n.textContent.includes('706 Diamonds')); el.click(); return 'ok'; })()`);
  await sleep(200);
  for (let i = 0; i < 9; i++) { await click("button[aria-label='Tambah']"); await sleep(50); }
  await sleep(200);
  await setInput("input[aria-label='Kode promo']", "ROSDI10");
  await click("form button[type='submit']");
  await sleep(300);
  await evalJs(`(() => { const pays = [...document.querySelectorAll('.pay')]; const el = pays.find((p) => p.textContent.includes('Pulsa Telkomsel')); el.click(); return 'ok'; })()`);
  await sleep(300);
  const sums = await evalJs(`(() => {
    const rows = [...document.querySelectorAll('.sum-row')].map((e) => e.textContent);
    const total = document.querySelector('.sum-total b')?.textContent;
    const payRow = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('Pulsa Telkomsel'))?.querySelector('.p-price')?.textContent;
    const mbTotal = document.querySelector('.mobile-bar .mb-total b')?.textContent;
    return { rows, total, payRow, mbTotal };
  })()`);
  return { ...sums, expected: { base: 1755000, disc: 10000, fee: 122850, total: 1867850 } };
});

// ---------- Beli: teks loading (ide 22) + order tersimpan sinkron (ide 30) ----------
await safe("buy22_30", async () => {
  const before = await evalJs(`(() => { const btns = [...document.querySelectorAll('.summary .btn.big, .mobile-bar .btn')]; return btns.map((b) => ({ text: b.textContent, disabled: b.disabled })); })()`);
  const ordersBefore = await evalJs(`(JSON.parse(localStorage.getItem('rosdi_orders') || '[]')).length`);
  await click(".summary .btn.big");
  await sleep(300);
  const after = await evalJs(`({ hash: location.hash, ordersAfter: (JSON.parse(localStorage.getItem('rosdi_orders') || '[]')).length, suksesWaktu: document.querySelector('.sum-row b')?.textContent || null })`);
  return { before, ordersBefore, ...after };
});

// ---------- Tanggal Sukses (ide 29) ----------
await safe("date29", async () => evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map((e) => e.textContent); return { rows: rows.filter((r) => /Waktu/.test(r)), today: new Date().toLocaleDateString('id-ID') }; })()`));

// ---------- Order minimum (ide 59): beli Rp1.650 ----------
await safe("min59", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom-grid .nom')]; const el = noms.find((n) => n.textContent.includes('3 Diamonds')); el.click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { const pays = [...document.querySelectorAll('.pay')]; const el = pays.find((p) => p.textContent.includes('QRIS')); el.click(); return 'ok'; })()`);
  await sleep(200);
  await click(".summary .btn.big");
  await sleep(600);
  return evalJs(`({ hash: location.hash, isSukses: location.hash.startsWith('#/sukses/'), total: document.querySelector('.sum-total b')?.textContent || null })`);
});

// ---------- Order lama Diproses (ide 23, 28) ----------
await safe("oldorder23_28", async () => {
  await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-OLD441', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now() - 3*86400000, status: 'Diproses', email: '', wa: '', token: '' }])); 'ok'`);
  await goHash("#/cek");
  await setInput("input[aria-label='Nomor transaksi']", "RSD-OLD441");
  await click(".step .btn");
  await sleep(500);
  return evalJs(`(() => { const txt = document.body.innerText; return { timeline: [...document.querySelectorAll('.timeline li')].map((e) => e.textContent), hasWarning: /lewat|24 jam|bermasalah|hubungi|terlambat|macet/i.test(txt), fullTextHas24: /1x24/.test(txt) }; })()`);
});

// ---------- Cek Nama loading (ide 21) ----------
await safe("ceknama21", async () => {
  await goHash("#/pln");
  await setInput("#idpel", "51234567890");
  await sleep(300);
  const btnBefore = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.includes('Cek Nama')); return b ? { text: b.textContent, disabled: b.disabled } : null; })()`);
  await click(".step .btn");
  await sleep(150);
  const btnAfter = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => /Cek (Nama|Ulang)/.test(x.textContent)); return b ? { text: b.textContent, disabled: b.disabled } : null; })()`);
  const note = await evalJs(`document.querySelector('.note.good')?.textContent || null`);
  return { btnBefore, btnAfter, note };
});

// ---------- Login mock bertahan? (ide 25) ----------
await safe("login25", async () => {
  await goHash("#/");
  await click(".header-actions .btn");
  await sleep(400);
  const modalOpen = await evalJs(`!!document.querySelector('[role="dialog"]')`);
  const focusInModal = await evalJs(`(() => { const m = document.querySelector('[role="dialog"]'); return m ? m.contains(document.activeElement) : false; })()`);
  await click(".modal .btn.big");
  await sleep(300);
  const headerBtnBefore = await evalJs(`document.querySelector('.header-actions .btn')?.textContent`);
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2500);
  const headerBtnAfter = await evalJs(`document.querySelector('.header-actions .btn')?.textContent`);
  return { modalOpen, focusInModal, headerBtnBefore, headerBtnAfter };
});

// ---------- Escape stacking (ide 64) + focus modal (ide 80) + role dialog (ide 79) ----------
await safe("escape64_79_80", async () => {
  let opened = 0;
  for (let i = 0; i < 10; i++) {
    await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.textContent.includes('Syarat')); b.click(); return 'ok'; })()`);
    await sleep(150);
    const isOpen = await evalJs(`!!document.querySelector('[role="dialog"]')`);
    if (isOpen) opened++;
    await evalJs(`(() => { const b = document.querySelector('.modal .btn.big'); b.click(); return 'ok'; })()`);
    await sleep(120);
  }
  await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.textContent.includes('Syarat')); b.click(); return 'ok'; })()`);
  await sleep(200);
  const dialogAttrs = await evalJs(`(() => { const m = document.querySelector('[role="dialog"]'); return m ? { role: m.getAttribute('role'), ariaModal: m.getAttribute('aria-modal'), focusInside: m.contains(document.activeElement) } : null; })()`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(300);
  const closedAfterEsc = await evalJs(`!document.querySelector('[role="dialog"]')`);
  return { opened10x: opened, dialogAttrs, closedAfterEsc };
});

// ---------- Email 200 karakter (ide 20) ----------
await safe("email20", async () => {
  await goHash("#/voucher/google-play");
  const longEmail = "a".repeat(190) + "@email.com";
  await setInput("#vemail", longEmail);
  await sleep(200);
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom-grid .nom')]; noms[0].click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { const pays = [...document.querySelectorAll('.pay')]; const el = pays.find((p) => p.textContent.includes('QRIS')); el.click(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => {
    const row = [...document.querySelectorAll('.sum-row')].find((e) => e.textContent.startsWith('Tujuan'));
    const b = row?.querySelector('b');
    const summary = document.querySelector('.summary');
    if (!b) return { noRow: true };
    const br = b.getBoundingClientRect(), sr = summary.getBoundingClientRect();
    return { emailLen: ${JSON.stringify(longEmail)}.length, bScrollW: b.scrollWidth, bClientW: b.clientWidth, bRight: Math.round(br.right), summaryRight: Math.round(sr.right), overflowsCard: br.right > sr.right + 1 };
  })()`);
});

// ---------- A11y semantik (ide 71-78) ----------
await safe("a11y71_78", async () => {
  await goHash("#/");
  await sleep(800);
  return evalJs(`(() => {
    const search = document.querySelector('.searchbar input');
    const searchbar = document.querySelector('.searchbar');
    return {
      searchAriaLabel: search?.getAttribute('aria-label'),
      searchRole: searchbar?.getAttribute('role'),
      chipAriaPressed: [...document.querySelectorAll('.chip')].map((c) => c.getAttribute('aria-pressed')),
    };
  })()`);
});
await safe("a11y73_76", async () => {
  await goHash("#/game/mobile-legends");
  await sleep(1200);
  return evalJs(`(() => {
    const terlaris = [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('Terlaris'));
    const danamon = [...document.querySelectorAll('.pay')].find((p) => p.textContent.includes('Danamon'));
    const tile = [...document.querySelectorAll('.nom')][0];
    return {
      terlarisInName: terlaris ? terlaris.textContent.includes('Terlaris') : null,
      danamonDisabled: danamon ? danamon.disabled : null,
      danamonAriaDisabled: danamon ? danamon.getAttribute('aria-disabled') : null,
      danamonText: danamon ? danamon.textContent.slice(0, 80) : null,
    };
  })()`);
});
await safe("a11y75_was", async () => evalJs(`(() => {
  const el = [...document.querySelectorAll('.nom .n-price')].find((n) => n.querySelector('.was'));
  if (!el) return { noWas: true };
  return { priceText: el.textContent, wasAriaLabel: el.querySelector('.was')?.getAttribute('aria-label'), priceAriaLabel: el.getAttribute('aria-label') };
})()`));
await safe("a11y77_stepper", async () => evalJs(`(() => {
  const qty = document.querySelector('.qty');
  if (!qty) return { noQty: true };
  return { minusLabel: qty.querySelector('button[aria-label="Kurangi"]') ? 'Kurangi' : null, plusLabel: qty.querySelector('button[aria-label="Tambah"]') ? 'Tambah' : null, hasNumberInput: !!qty.querySelector('input'), qtyText: qty.querySelector('b')?.textContent };
})()`));

// ---------- Keyboard journey (ide 38, parsial) ----------
await safe("kbd38", async () => {
  await goHash("#/");
  await sleep(800);
  await evalJs(`document.body.focus(); 'ok'`);
  const stops = [];
  for (let i = 0; i < 14; i++) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await sleep(120);
    stops.push(await evalJs(`(() => { const el = document.activeElement; if (!el || el === document.body) return 'BODY'; return (el.tagName + ':' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)); })()`));
  }
  return { stops };
});

// ---------- Font diblokir (ide 36) ----------
await safe("fonts36", async () => {
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2500);
  return evalJs(`(() => {
    const h1 = document.querySelector('.hero h1');
    const cs = h1 ? getComputedStyle(h1) : null;
    return { fontsLoaded: [...document.fonts].map((f) => f.family + ':' + f.status), heroFont: cs?.fontFamily, heroH: h1 ? Math.round(h1.getBoundingClientRect().height) : null, docOverflow: document.documentElement.scrollWidth > window.innerWidth };
  })()`);
});

// ---------- Console errors semua rute (ide 65) ----------
await safe("console65", async () => {
  const routes = ["#/", "#/game/mobile-legends", "#/game/free-fire", "#/pulsa", "#/pulsa/telkomsel", "#/data", "#/pln", "#/tagihan", "#/tagihan/pdam", "#/emoney", "#/emoney/dana", "#/voucher/google-play", "#/cek"];
  for (const r of routes) { await goHash(r); }
  // Sukses: seed order lalu buka
  await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-S441OK', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '', token: '' }])); 'ok'`);
  await goHash("#/sukses/RSD-S441OK");
  const errors = consoleMsgs.filter((m) => m.type === "error" || m.type === "EXCEPTION");
  return { totalConsole: consoleMsgs.length, errors, errorCount: errors.length };
});

writeFileSync(`${outDir}/cdp-s441.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", Object.keys(R).length, "checks");
