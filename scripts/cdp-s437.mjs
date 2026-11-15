// Ukur runtime CDP batch s437: pencarian, checkout, validasi, sukses/cek,
// a11y semantik & visual, grid desktop, reflow 320, text-spacing.
// Penggunaan: node scripts/cdp-s437.mjs <wsUrl> <width> <baseUrl> <outDir>
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
  }
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width <= 560 });

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1400); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const click = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

const CONTRAST_FN = `window.__lum = (rgb) => { const m = rgb.match(/\\d+(\\.\\d+)?/g).map(Number); const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
window.__ratio = (a, b) => { const l1 = window.__lum(a), l2 = window.__lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); }; 'ok'`;
await evalJs(CONTRAST_FN);

// ---------- B. Pencarian (Home) ----------
await safe("b_search", async () => evalJs(`(() => {
  const setQ = (v) => { const el = document.querySelector('.searchbar input'); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const out = {};
  setQ('diamond');
  out.diamond = { flashCards: document.querySelectorAll('.grid.c2 .card').length, gameCards: document.querySelectorAll('.grid.c4 .card').length, flashNames: [...document.querySelectorAll('.grid.c2 .card')].map(c => c.innerText.split('\\n')[0]), firstSection: document.querySelector('section.block h2')?.innerText, mark: document.querySelectorAll('mark').length, boldMatch: [...document.querySelectorAll('.grid.c2 .card, .grid.c4 .card')].map(c => c.querySelector('b, strong')?.innerText || null) };
  setQ('mlbb');
  out.mlbb = { gameNames: [...document.querySelectorAll('.grid.c4 .card .p-name')].map(e => e.innerText), marks: document.querySelectorAll('mark').length };
  setQ('mob');
  out.mobSuggest = { listbox: !!document.querySelector('[role=listbox], .suggest, [class*=suggest]'), dropdown: !!document.querySelector('.searchbar + * [role=option]') };
  setQ('pulsa');
  out.pulsa = { sections: [...document.querySelectorAll('section.block h2')].map(h => h.innerText), emptyMsgPerSection: [...document.querySelectorAll('.empty')].map(e => e.innerText), gameVisible: !!document.querySelector('.grid.c4') };
  setQ('50000');
  out.num50000 = { nothing: document.querySelector('.empty')?.innerText || null, cards: document.querySelectorAll('a.card').length };
  setQ('diamond mlbb');
  out.multi1 = { nothing: !!document.querySelector('.empty'), cards: document.querySelectorAll('a.card').length };
  setQ('pulsa telkomsel');
  out.multi2 = { nothing: !!document.querySelector('.empty'), cards: document.querySelectorAll('a.card').length, sections: [...document.querySelectorAll('section.block h2')].map(h => h.innerText) };
  setQ('mlbb');
  out.countText = { hasCount: /menampilkan|ditemukan|\\d+ produk/i.test(document.body.innerText), chipCounts: [...document.querySelectorAll('.chip')].map(c => c.innerText) };
  setQ('');
  out.base = { demoMarker: /demo|simulasi/i.test(document.body.innerText), socialProof: /rating|bintang|testimoni|★|\\d+\\.?\\d* ?(rb|jt|ribu|juta) ?(transaksi|pengguna|pembeli)/i.test(document.body.innerText), faq: /FAQ|pertanyaan umum/i.test(document.body.innerText), hours247: /24\\/7|24 jam/i.test(document.body.innerText), flashBadges: [...document.querySelectorAll('.grid.c2 .badge')].map(b => b.innerText), flashPrices: [...document.querySelectorAll('.grid.c2 .card')].map(c => c.innerText.replace(/\\n/g, ' | ').slice(0, 120)) };
  return out;
})()`));
await safe("b_recent", async () => evalJs(`(() => ({ lsKeys: Object.keys(localStorage) }))()`));
await safe("b_opindex", async () => { await goHash("#/pulsa"); return evalJs(`(() => ({ hasSearch: !!document.querySelector('.wrap input[placeholder*=Cari], .wrap input[type=search]'), cards: document.querySelectorAll('a.card').length, h1: document.querySelector('h1')?.innerText }))()`); });

// ---------- D/C. Validasi & checkout (MLBB) ----------
await goHash("#/game/mobile-legends");
await safe("d_uid_zero", async () => {
  await setInput("#uid", "01234567");
  await setInput("#zone", "1234");
  return evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row')].map(r => r.innerText.replace(/\\n/g, ': ')); return { tujuan: rows.find(r => r.startsWith('Tujuan')), uidErr: document.querySelector('.note.bad')?.innerText || null }; })()`);
});
await safe("d_uid_emoji", async () => {
  await setInput("#uid", "😀1234");
  return evalJs(`(() => ({ err: document.querySelector('.note.bad')?.innerText || null, tujuan: [...document.querySelectorAll('.sum-row')].map(r => r.innerText).find(r => r.startsWith('Tujuan')) }))()`);
});
await safe("d_zone_zero", async () => {
  await setInput("#uid", "12345678");
  await setInput("#zone", "0");
  return evalJs(`(() => ({ err: [...document.querySelectorAll('.note.bad')].map(n => n.innerText), buyDisabled: document.querySelector('.summary .btn.big')?.disabled }))()`);
});
await safe("d_label_focus", async () => evalJs(`(() => { const l = document.querySelector('label[for=uid]'); if (!l) return 'NO-LABEL'; l.click(); return { activeId: document.activeElement?.id, labelFor: l.getAttribute('for') }; })()`));
await safe("c_unitprice", async () => {
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[6].click(); return 'ok'; })()`); // 86 Diamonds
  await evalJs(`(() => { document.querySelectorAll('.qty button')[1].click(); document.querySelectorAll('.qty button')[1].click(); return 'ok'; })()`); // qty 3
  await sleep(300);
  return evalJs(`(() => { const rows = [...document.querySelectorAll('.sum-row, .sum-total')].map(r => r.innerText.replace(/\\n/g, ' | ')); return { rows, qtyShown: document.querySelector('.qty b')?.innerText, itemRow: rows.find(r => r.startsWith('Item')) }; })()`);
});
await safe("c_promo_success_prep", async () => {
  await setInput("input[aria-label='Kode promo']", "ROSDI10");
  await click(".step form .btn");
  await sleep(300);
  return evalJs(`(() => ({ promoMsg: document.querySelector('.note.good, .note.bad')?.innerText || null, discRow: [...document.querySelectorAll('.sum-row')].map(r => r.innerText).find(r => r.includes('Diskon')) || null }))()`);
});
// ---------- C. Beli -> Sukses ----------
await safe("c_buy_success", async () => {
  await evalJs(`(() => { document.querySelectorAll('.pay')[0].click(); return 'ok'; })()`); // QRIS
  await sleep(300);
  await click(".summary .btn.big");
  await sleep(1500);
  return evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.innerText, rows: [...document.querySelectorAll('.sum-row, .sum-total')].map(r => r.innerText.replace(/\\n/g, ' | ')), bodyHasPromo: /ROSDI10/.test(document.body.innerText), bodyHasSimulasi: /simulasi|demo/i.test(document.body.innerText), bodyHasBatal: /batalkan|minta pengembalian|klaim/i.test(document.body.innerText), bodyHasSalinDetail: /salin detail pesanan/i.test(document.body.innerText), buttons: [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean), shopNameInReceipt: /Rosdi Store/.test(document.querySelector('.step')?.innerText || '') }))()`);
});
await safe("c_back_dup", async () => {
  await evalJs(`history.back(); 'ok'`);
  await sleep(1500);
  return evalJs(`(() => ({ hash: location.hash, uidVal: document.querySelector('#uid')?.value ?? 'NO-UID', zoneVal: document.querySelector('#zone')?.value ?? null, orders: JSON.parse(localStorage.getItem('rosdi_orders') || '[]').length }))()`);
});
// ---------- F. Cek Transaksi ----------
await goHash("#/cek");
await safe("f_cek", async () => {
  await setInput("input[aria-label='Nomor transaksi']", "RSD-DEMO1234");
  await click(".step .btn");
  await sleep(400);
  return evalJs(`(() => ({ timeline: [...document.querySelectorAll('.timeline li')].map(li => li.innerText.replace(/\\n/g, ' | ')), demoNote: document.querySelector('.note')?.innerText || null, filterCtl: !!document.querySelector('select, [aria-label*=Filter i], [aria-label*=filter i]'), sortCtl: !!document.querySelector('[aria-label*=Urut i]'), refundBtn: /minta pengembalian|ajukan refund|klaim/i.test(document.body.innerText), historyRows: document.querySelectorAll('.step .sum-row').length }))()`);
});
await safe("f_cek_fail", async () => {
  await setInput("input[aria-label='Nomor transaksi']", "RSD-XXXXXX00XXXX");
  await click(".step .btn");
  await sleep(400);
  return evalJs(`(() => ({ msg: document.querySelector('.note.bad')?.innerText || null }))()`);
});
// ---------- E. Pulsa/data mismatch ----------
await goHash("#/pulsa/telkomsel");
await safe("e_mismatch", async () => {
  await setInput("#hp", "085512345678");
  await sleep(200);
  return evalJs(`(() => ({ notes: [...document.querySelectorAll('.note')].map(n => n.innerText), buyDisabled: document.querySelector('.summary .btn.big')?.disabled, linkPindah: [...document.querySelectorAll('a')].map(a => a.innerText).find(t => t.includes('Pindah')) || null }))()`);
});
await goHash("#/data/telkomsel");
await safe("e_data_mismatch", async () => {
  await setInput("#hp", "085512345678");
  await sleep(200);
  return evalJs(`(() => ({ notes: [...document.querySelectorAll('.note')].map(n => n.innerText), buyDisabled: document.querySelector('.summary .btn.big')?.disabled }))()`);
});
await safe("e_draft_loss", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[7].click(); return 'ok'; })()`);
  await goHash("#/");
  await goHash("#/pulsa/telkomsel");
  await goHash("#/game/mobile-legends");
  await sleep(300);
  return evalJs(`(() => ({ uidAfter: document.querySelector('#uid')?.value, anyWarning: /draf|hilang|belum selesai/i.test(document.body.innerText) }))()`);
});
// ---------- E. PLN ----------
await goHash("#/pln");
await safe("e_pln", async () => {
  await setInput("#idpel", "054321098765");
  const btnState = await evalJs(`(() => ({ cekDisabled11: document.querySelector('.step .btn')?.disabled }))()`);
  await click(".step .btn");
  await sleep(300);
  return evalJs(`(() => ({ tujuan: [...document.querySelectorAll('.sum-row')].map(r => r.innerText).find(r => r.startsWith('Tujuan')), checkedNote: document.querySelector('.note.good')?.innerText || null, btn: ${JSON.stringify(btnState)} }))()`);
});
await safe("e_pln_fail", async () => {
  await setInput("#idpel", "999999999999");
  await click(".step .btn");
  await sleep(300);
  return evalJs(`(() => ({ checkedNote: document.querySelector('.note.good')?.innerText || null, failMsg: document.querySelector('.note.bad')?.innerText || null }))()`);
});
// ---------- E. Genshin server / voucher email ----------
await goHash("#/game/genshin-impact");
await safe("e_server_warn", async () => {
  await evalJs(`(() => { const s = document.querySelector('#server'); const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setter.call(s, 'Amerika'); s.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => ({ warn: /server (yang )?salah|tidak bisa dipindah|pindah/i.test(document.body.innerText), serverVal: document.querySelector('#server')?.value }))()`);
});
await goHash("#/voucher/google-play");
await safe("e_voucher_email", async () => evalJs(`(() => ({ emailInputs: document.querySelectorAll('input[type=email]').length, confirmInput: !!document.querySelectorAll('input[type=email]')[1], warn: [...document.querySelectorAll('.note')].map(n => n.innerText) }))()`));
// ---------- D. Email panjang & format HP ----------
await goHash("#/game/mobile-legends");
await safe("d_email_long", async () => {
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  const longMail = "a".repeat(190) + "@email.com";
  await setInput("#email", longMail);
  await sleep(300);
  return evalJs(`(() => { const b = [...document.querySelectorAll('.sum-row b')].find(el => el.innerText.includes('@')); if (!b) return { shown: false }; const r = b.getBoundingClientRect(); return { shown: true, overflowX: b.scrollWidth > b.clientWidth + 1, textLen: b.innerText.length, wraps: b.scrollHeight > 24 }; })()`);
});
await goHash("#/pulsa/telkomsel");
await safe("d_phone_format", async () => {
  await setInput("#hp", "081234567890");
  return evalJs(`(() => ({ inputVal: document.querySelector('#hp').value, tujuan: [...document.querySelectorAll('.sum-row')].map(r => r.innerText).find(r => r.startsWith('Tujuan')) }))()`);
});
// ---------- G. A11y semantik ----------
await goHash("#/");
await safe("g_a11y", async () => evalJs(`(() => ({
  ariaCurrent: document.querySelectorAll('[aria-current]').length,
  navOn: [...document.querySelectorAll('nav.main a')].map(a => ({ t: a.innerText, cls: a.className, ac: a.getAttribute('aria-current') })),
  ulCount: document.querySelectorAll('ul').length,
  dlCount: document.querySelectorAll('dl').length,
  summaryH: document.querySelector('.summary h2')?.innerText || null,
  guaranteeCheck: { text: document.querySelector('.guarantee span')?.innerText, ariaHidden: document.querySelector('.guarantee span')?.getAttribute('aria-hidden') },
  bigCheckHidden: null,
  requiredMark: [...document.querySelectorAll('.flabel')].map(l => l.innerText).slice(0, 6),
  optionalMark: [...document.querySelectorAll('.flabel')].map(l => l.innerText).filter(t => /opsional/i.test(t)),
  footerH: [...document.querySelectorAll('footer h2')].map(h => h.innerText),
  skipLink: !!document.querySelector('.skip-link'),
}))()`));
await safe("g_modal_heading", async () => {
  await evalJs(`(() => { [...document.querySelectorAll('footer button.flink')].find(b => b.innerText.includes('Syarat'))?.click(); return 'ok'; })()`);
  await sleep(400);
  return evalJs(`(() => ({ modalH: document.querySelector('.modal h3')?.innerText || null, modalHLevel: document.querySelector('.modal h3') ? 'h3' : (document.querySelector('.modal h2') ? 'h2' : 'none'), modalRole: document.querySelector('.modal')?.getAttribute('role') }))()`);
});
await safe("g_focus_nav", async () => {
  await evalJs(`(() => { document.querySelector('.modal .btn.big')?.click(); return 'ok'; })()`);
  await sleep(300);
  await evalJs(`(() => { const card = document.querySelector('.grid.c4 a.card'); card.focus(); card.click(); return 'ok'; })()`);
  await sleep(1400);
  return evalJs(`(() => ({ hash: location.hash, activeTag: document.activeElement?.tagName, activeText: (document.activeElement?.innerText || '').slice(0, 40), h1: document.querySelector('h1')?.innerText }))()`);
});
// ---------- H. Visual a11y ----------
await safe("h_contrast", async () => evalJs(`(() => {
  const cs = (el, prop) => getComputedStyle(el)[prop];
  const input = document.querySelector('#uid') || document.querySelector('.input');
  const out = {};
  const inp = document.querySelector('.input');
  out.inputBorderVsField = window.__ratio(cs(inp, 'borderColor'), cs(inp, 'backgroundColor'));
  out.inputBorderRaw = cs(inp, 'borderColor') + ' vs ' + cs(inp, 'backgroundColor');
  out.inputFontSize = cs(inp, 'fontSize');
  out.focusOutline = cs(inp, 'outlineColor') || getComputedStyle(document.documentElement).getPropertyValue('--blue');
  const nom = document.querySelector('.nom.on') || document.querySelector('.nom');
  out.nomBorderVsField = nom ? window.__ratio(cs(nom, 'borderColor'), cs(nom, 'backgroundColor')) : null;
  const btnDis = document.querySelector('.summary .btn.big');
  out.buyDisabledText = btnDis ? { color: cs(btnDis, 'color'), bg: cs(btnDis, 'backgroundColor'), ratio: window.__ratio(cs(btnDis, 'color'), cs(btnDis, 'backgroundColor')), disabled: btnDis.disabled } : null;
  const qtyMinus = document.querySelector('.qty button');
  out.qtyMinusDisabled = qtyMinus ? { ratio: window.__ratio(cs(qtyMinus, 'color'), cs(qtyMinus, 'backgroundColor')), disabled: qtyMinus.disabled, opacity: cs(qtyMinus, 'opacity') } : null;
  return out;
})()`));
await safe("h_contrast_dark", async () => {
  await click("button[aria-label='Ganti tema']");
  await sleep(400);
  return evalJs(`(() => {
    const cs = (el, prop) => getComputedStyle(el)[prop];
    const inp = document.querySelector('.input');
    const nom = document.querySelector('.nom.on') || document.querySelector('.nom');
    return { theme: document.documentElement.dataset.theme, inputBorderVsField: window.__ratio(cs(inp, 'borderColor'), cs(inp, 'backgroundColor')), nomBorderVsField: nom ? window.__ratio(cs(nom, 'borderColor'), cs(nom, 'backgroundColor')) : null, focusOutlineVsField: window.__ratio(getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() ? 'rgb(59, 130, 246)' : 'rgb(0,0,0)', cs(inp, 'backgroundColor')) };
  })()`);
});
await safe("h_targets", async () => {
  await click("button[aria-label='Ganti tema']");
  await sleep(300);
  return evalJs(`(() => {
    const m = (sel) => [...document.querySelectorAll(sel)].map(el => { const r = el.getBoundingClientRect(); return { t: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; });
    return { footerLinks: m('footer a, footer button.flink'), chips: m('.chip'), backBtn: m('.crumb .back'), searchInput: m('.searchbar input') };
  })()`);
});
await safe("h_reflow_320", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
  await sleep(800);
  const home = await evalJs(`(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, bodySW: document.body.scrollWidth }))()`);
  await goHash("#/game/mobile-legends");
  const game = await evalJs(`(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, bodySW: document.body.scrollWidth, overflowEls: [...document.querySelectorAll('body *')].filter(el => el.scrollWidth > 321 && !['HTML','BODY'].includes(el.tagName)).slice(0, 5).map(el => el.className?.toString().slice(0, 40) + ' sw=' + el.scrollWidth) }))()`);
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width <= 560 });
  return { home, game };
});
await safe("h_textspacing", async () => {
  await goHash("#/game/mobile-legends");
  await evalJs(`(() => { const st = document.createElement('style'); st.id = 'ts-override'; st.textContent = '*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important}'; document.head.appendChild(st); return 'ok'; })()`);
  await sleep(400);
  return evalJs(`(() => {
    const bad = [];
    document.querySelectorAll('.nom').forEach(el => { if (el.scrollHeight > el.clientHeight + 2) bad.push('nom overflow: ' + el.innerText.replace(/\\n/g, ' ').slice(0, 50)); });
    document.querySelectorAll('.sum-row').forEach(el => { if (el.scrollHeight > el.clientHeight + 2) bad.push('sum-row overflow: ' + el.innerText.replace(/\\n/g, ' ').slice(0, 50)); });
    const clip = [...document.querySelectorAll('.nom .n-price')].some(el => el.scrollWidth > el.clientWidth + 1);
    return { overflows: bad.slice(0, 8), priceClipped: clip };
  })()`);
});
await safe("j_grid_1280", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(600);
  await goHash("#/game/mobile-legends");
  const r = await evalJs(`(() => {
    const flow = document.querySelector('.flow');
    if (!flow) return { noFlow: true };
    const kids = [...flow.children].map(el => { const b = el.getBoundingClientRect(); return { cls: el.tagName + '.' + (el.className?.toString().slice(0, 20) || ''), x: Math.round(b.x), w: Math.round(b.width) }; });
    const wrap = document.querySelector('.wrap').getBoundingClientRect();
    const cs = getComputedStyle(flow);
    return { wrapW: Math.round(wrap.width), wrapX: Math.round(wrap.x), gap: cs.columnGap, cols: cs.gridTemplateColumns, kids };
  })()`);
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width <= 560 });
  return r;
});
await safe("console", async () => ({ msgs: consoleMsgs.slice(0, 20), count: consoleMsgs.length }));

writeFileSync(`${outDir}/cdp-s437-${width}.json`, JSON.stringify(R, null, 2));
console.log("DONE", width, Object.keys(R).length, "blok");
process.exit(0);
