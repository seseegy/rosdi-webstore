// Probe Fase 3 — B4 motion: verifikasi GERAKAN via CDP (properti ter-compute +
// sampel frame selama animasi, bukan satu still). Model harness cdp-fase2-probe.
// Pakai: bash scripts/cdp-launch-isolated.sh /tmp/cdp-fase3-prof dist 4796 9296 scripts/cdp-fase3-probe.mjs hidden_files/cdp-fase3 390
import { mkdirSync, writeFileSync } from "node:fs";
const [wsUrl, wArg, baseUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const results = {};
const rec = (id, data) => { results[id] = data; console.log(id, JSON.stringify(data)); };
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; });
const setMetrics = async (w, h = 844) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(1500); };
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.data, "base64")); return name; };
// sampel berulang selama ms; toleran terhadap context-destroyed saat navigasi
const sampleDuring = async (expr, ms, step = 100) => {
  const out = []; const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { out.push([Date.now() - t0, await evalJs(expr)]); } catch { out.push([Date.now() - t0, "ctx"]); } await sleep(step); }
  return out;
};
const mouseTo = async (selector) => {
  const r = await evalJs(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  if (!r) return null;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(r.x), y: Math.round(r.y), button: "none" });
  await sleep(80);
  return r;
};
const setInput = async (selector, value) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'no-el'; const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
const clickEl = async (selector) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'no-el'; el.click(); return 'ok'; })()`);

await setMetrics(390);

// ===== J. s466-4 — skeleton Cek saat chunk lazy dimuat (throttle dulu) =====
await nav("#/");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 50 * 1024 });
await evalJs(`location.hash = '#/cek'; 'ok'`);
const j = await sampleDuring(`(() => ({ skel: !!document.querySelector('.skel'), txt: document.body.innerText.includes('Memuat halaman') }))()`, 2500, 150);
rec("J-skeleton-cek-throttled", j.filter((s) => s[1] !== "ctx").slice(0, 12));
await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await send("Network.setCacheDisabled", { cacheDisabled: false });
await sleep(1500);

// ===== Seed 7 order untuk Cek + Sukses =====
await evalJs(`(() => {
  const mk = (ref, product, item, total, kind, extra = {}) => ({ ref, product, item, qty: 1, target: '12345678 (1234)', base: total, fee: 0, disc: 0, total, method: 'QRIS', email: '', wa: '', status: 'Selesai', time: Date.now() - 86400000, kind, ...extra });
  const orders = [
    mk('RSD-TEST0001', 'Mobile Legends', '3 Diamonds', 1650, 'game'),
    mk('RSD-TEST0002', 'Mobile Legends', '86 Diamonds', 21000, 'game'),
    mk('RSD-TEST0003', 'Free Fire', '5 Diamonds', 1000, 'game'),
    mk('RSD-TEST0004', 'Honor of Kings', '16 Token', 1500, 'game'),
    mk('RSD-TEST0005', 'Genshin Impact', '60 Genesis Crystal', 12500, 'game'),
    mk('RSD-TEST0006', 'Token PLN', 'Token 20.000', 22500, 'pln', { token: '1234 5678 9012 3456 7890', target: '12345678901' }),
    mk('RSD-TEST0007', 'Steam Wallet', 'Steam 60.000', 63000, 'voucher'),
  ];
  localStorage.setItem('rosdi_orders', JSON.stringify(orders));
  return orders.length;
})()`);

// ===== A+I. s457-2 count-up + s466-2 grid stagger (navigasi segar ke Beranda) =====
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`);
await sleep(1500);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/")}); 'ok'`);
const soldExpr = `(() => { const el = document.querySelector('.sold-num'); if (!el) return null; return { after: getComputedStyle(el, '::after').content, sold: getComputedStyle(el).getPropertyValue('--sold').trim(), anims: el.getAnimations().map((a) => a.animationName + ':' + a.playState) }; })()`;
const soldTrace = await sampleDuring(soldExpr, 1800, 120);
rec("A-countup-sold", soldTrace);
const gridExpr = `(() => [...document.querySelectorAll('.grid .card')].slice(0, 6).map((el) => +(+getComputedStyle(el).opacity).toFixed(2)))()`;
const gridTrace = await sampleDuring(gridExpr, 1200, 120);
rec("I-grid-stagger", gridTrace);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/")}); 'ok'`); await sleep(500);
await shot("A-countup-mid");
rec("A-sold-final", await evalJs(soldExpr));
rec("A-sold-sronly", await evalJs(`(() => { const el = document.querySelector('.sold-num'); if (!el) return null; const sib = el.parentElement.querySelector('.sr-only'); return sib ? sib.textContent : null; })()`));

// ===== C. s457-5 hero hover (angkat + bayangan) =====
await mouseTo(".hero .btn");
rec("C-hero-hover", await evalJs(`(() => { const b = document.querySelector('.hero .btn'); const cs = getComputedStyle(b); return { transform: cs.transform, bg: cs.backgroundColor, shadow: cs.boxShadow.slice(0, 40), transition: cs.transitionDuration + ' ' + cs.transitionProperty }; })()`));
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 10, y: 10, button: "none" });

// ===== D. s459-3/s462-1 hover kartu (transisi border berjalan) =====
await mouseTo(".grid.c3 .card[href='#/emoney/dana']");
const d1 = await evalJs(`(() => { const c = document.querySelector(".grid.c3 .card[href='#/emoney/dana']"); return c ? getComputedStyle(c).borderColor : null; })()`);
await sleep(75);
const d2 = await evalJs(`(() => { const c = document.querySelector(".grid.c3 .card[href='#/emoney/dana']"); return c ? getComputedStyle(c).borderColor : null; })()`);
await sleep(200);
const d3 = await evalJs(`(() => { const c = document.querySelector(".grid.c3 .card[href='#/emoney/dana']"); return c ? getComputedStyle(c).borderColor : null; })()`);
rec("D-ewallet-hover-border", { t0: d1, t75: d2, t275: d3 });
await mouseTo(".grid.c2 .card");
const f1 = await evalJs(`(() => { const c = document.querySelector('.grid.c2 .card'); return c ? getComputedStyle(c).borderColor : null; })()`);
await sleep(75);
const f2 = await evalJs(`(() => { const c = document.querySelector('.grid.c2 .card'); return c ? getComputedStyle(c).borderColor : null; })()`);
await sleep(200);
const f3 = await evalJs(`(() => { const c = document.querySelector('.grid.c2 .card'); return c ? getComputedStyle(c).borderColor : null; })()`);
rec("D-flash-hover-border", { t0: f1, t75: f2, t275: f3 });
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 10, y: 10, button: "none" });

// ===== O. s452-3 cari "hok" =====
await setInput(".searchbar input", "hok");
await sleep(400);
rec("O-search-hok", await evalJs(`(() => ({ hokCard: [...document.querySelectorAll('.grid .card')].some((c) => c.textContent.includes('Honor of Kings')), count: document.querySelectorAll('.grid .card').length }))()`));
await setInput(".searchbar input", "");
await sleep(300);

// ===== B. s455-1 stagger nominal MLBB (navigasi segar) =====
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/")}); 'ok'`); await sleep(800);
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/game/mobile-legends")}); 'ok'`);
const nomExpr = `(() => [...document.querySelectorAll('.nom-grid .nom')].slice(0, 6).map((el) => +(+getComputedStyle(el).opacity).toFixed(2)))()`;
const nomTrace = await sampleDuring(nomExpr, 1400, 120);
rec("B-nom-stagger", nomTrace);
rec("B-nom-settled", await evalJs(`(() => ({ settled: document.querySelector('.nom-grid')?.classList.contains('settled'), count: document.querySelectorAll('.nom-grid .nom').length }))()`));
// pilih kartu lalu ganti pilihan: kartu yang dilepas TIDAK boleh replay entrance (opacity tetap 1)
await evalJs(`(() => { const n = document.querySelectorAll('.nom-grid .nom'); n[0].click(); return 'ok'; })()`);
await sleep(300);
const deselect = await evalJs(`(async () => { const n = document.querySelectorAll('.nom-grid .nom'); n[1].click(); await new Promise((r) => setTimeout(r, 120)); const first = n[0]; const cs = getComputedStyle(first); return { opacity: +(+cs.opacity).toFixed(2), anims: first.getAnimations().map((a) => a.animationName) }; })()`);
rec("B-nom-deselect-no-replay", deselect);
// hover lift setelah settled
await mouseTo(".nom-grid .nom");
rec("B-nom-hover-lift", await evalJs(`(() => { const el = document.querySelector('.nom-grid .nom'); return el ? getComputedStyle(el).transform : null; })()`));
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 10, y: 10, button: "none" });

// ===== E. s455-5 shake promo gagal (2x kode salah yang sama) =====
await setInput('input[aria-label="Kode promo"]', "SALAH123");
await clickEl("button.promo-btn[type='submit']");
await sleep(120);
const shake1 = await sampleDuring(`(() => { const n = document.querySelector('.note.bad.shake'); if (!n) return null; return { anims: n.getAnimations().map((a) => a.animationName + ':' + a.playState), tx: getComputedStyle(n).transform }; })()`, 500, 90);
rec("E-shake-promo-1", shake1);
await shot("E-shake-mid");
await clickEl("button.promo-btn[type='submit']");
await sleep(120);
const shake2 = await evalJs(`(() => { const n = document.querySelector('.note.bad.shake'); return n ? n.getAnimations().map((a) => a.animationName + ':' + a.playState) : null; })()`);
rec("E-shake-promo-replay", shake2);

// ===== F. s457-1/s460-1 stepper mentok (goyang, qty tetap) =====
await evalJs(`(() => { const n = document.querySelectorAll('.nom-grid .nom'); if (n[0]) n[0].click(); return 'ok'; })()`);
await sleep(200);
await evalJs(`(async () => { const p = document.querySelector('.qty button.plus'); for (let i = 0; i < 9; i++) { p.click(); await new Promise((r) => setTimeout(r, 60)); } return document.querySelector('.qty b').textContent; })()`);
rec("F-qty-10", await evalJs(`(() => ({ qty: document.querySelector('.qty b').textContent, plusDisabled: document.querySelector('.qty button.plus').disabled, plusAria: document.querySelector('.qty button.plus').getAttribute('aria-disabled') }))()`));
await clickEl(".qty button.plus");
await sleep(100);
rec("F-nudge-max", await evalJs(`(() => ({ qty: document.querySelector('.qty b').textContent, nudge: document.querySelector('.qty').classList.contains('nudge'), anims: document.querySelector('.qty').getAnimations().map((a) => a.animationName + ':' + a.playState) }))()`));
await sleep(500);
await evalJs(`(async () => { const m = document.querySelector('.qty button:not(.plus)'); for (let i = 0; i < 9; i++) { m.click(); await new Promise((r) => setTimeout(r, 60)); } return document.querySelector('.qty b').textContent; })()`);
rec("F-qty-1", await evalJs(`(() => ({ qty: document.querySelector('.qty b').textContent, minusAria: document.querySelector('.qty button:not(.plus)').getAttribute('aria-disabled') }))()`));
await clickEl(".qty button:not(.plus)");
await sleep(100);
rec("F-nudge-min", await evalJs(`(() => ({ qty: document.querySelector('.qty b').textContent, nudge: document.querySelector('.qty').classList.contains('nudge'), anims: document.querySelector('.qty').getAnimations().map((a) => a.animationName + ':' + a.playState) }))()`));
await sleep(500);

// ===== G. s465-5 animasi Total aside saat qty berubah =====
await clickEl(".qty button.plus");
await sleep(60);
rec("G-total-anim", await evalJs(`(() => { const b = document.querySelector('.sum-total b'); return b ? { text: b.textContent, anims: b.getAnimations().map((a) => a.animationName + ':' + a.playState) } : null; })()`));
await sleep(400);
rec("G-total-final", await evalJs(`(() => document.querySelector('.sum-total b')?.textContent)()`));

// ===== H. s465-3 peringatan email/WA beranimasi =====
await setInput("#email", "tanpa-at");
await sleep(150);
rec("H-email-warn-anim", await evalJs(`(() => { const n = document.querySelector('.note.warn'); return n ? { text: n.textContent.slice(0, 40), anims: n.getAnimations().map((a) => a.animationName + ':' + a.playState) } : null; })()`));
await setInput("#email", "");
await sleep(200);

// ===== N. s457-3 select Server pakai token field =====
rec("N-server-select", await evalJs(`(() => { const s = document.querySelector('#server'); if (!s) return null; const cs = getComputedStyle(s); return { bg: cs.backgroundColor, border: cs.borderColor, value: s.value, options: s.options.length }; })()`));

// ===== K. s455-4/s466-5 collapse riwayat + chevron =====
await nav("#/cek");
rec("K-history-count", await evalJs(`(() => ({ rows: document.querySelectorAll('.hist-in .sum-row').length, toggle: !!document.querySelector('.hist-toggle') }))()`));
const toggleSel = ".hist-toggle";
await clickEl(toggleSel);
const kExpand = await sampleDuring(`(() => { const w = document.querySelector('.hist-more'); const svg = document.querySelector('.hist-toggle svg'); return w ? { rows: getComputedStyle(w).gridTemplateRows, chev: svg ? getComputedStyle(svg).transform : null, expanded: document.querySelector('.hist-toggle').getAttribute('aria-expanded') } : null; })()`, 600, 100);
rec("K-expand", kExpand);
await shot("K-expanded");
await sleep(300);
rec("K-expanded-final", await evalJs(`(() => ({ rows: document.querySelectorAll('.hist-in .sum-row').length, chev: getComputedStyle(document.querySelector('.hist-toggle svg')).transform }))()`));
// roving: fokus baris ke-5 lalu ArrowDown — tidak boleh masuk ke baris tersembunyi saat collapse
await clickEl(toggleSel);
await sleep(500);
rec("K-collapsed-final", await evalJs(`(() => ({ rows: document.querySelectorAll('.hist-in .sum-row').length, hiddenTab: [...document.querySelectorAll('.hist-in .sum-row')].slice(5).map((b) => b.tabIndex), ariaHidden: document.querySelector('.hist-more').getAttribute('aria-hidden') }))()`));
const kRoving = await evalJs(`(async () => {
  const rows = [...document.querySelectorAll('.hist-in .sum-row')];
  rows[4].focus();
  await new Promise((r) => setTimeout(r, 100));
  const before = document.activeElement === rows[4];
  rows[4].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  await new Promise((r) => setTimeout(r, 100));
  return { before, afterIdx: rows.indexOf(document.activeElement), stillRow5: document.activeElement === rows[4] };
})()`);
rec("K-roving-collapsed", kRoving);

// ===== L. s466-6 ikon Salin di Sukses =====
await nav("#/sukses/RSD-TEST0006");
await clickEl("button[aria-label='Salin nomor token PLN']");
await sleep(120);
rec("L-copy-token", await evalJs(`(() => { const b = document.querySelector("button[aria-label='Salin nomor token PLN']"); const svg = b?.querySelector('.copy-in svg'); return b ? { text: b.textContent.trim(), hasSvg: !!svg, svgAnims: svg ? svg.getAnimations().map((a) => a.animationName + ':' + a.playState) : [], spanAnims: b.querySelector('.copy-in')?.getAnimations().map((a) => a.animationName) } : null; })()`));
await shot("L-copy-token");
await clickEl("button[aria-label='Salin nomor transaksi']");
await sleep(120);
rec("L-copy-ref", await evalJs(`(() => { const b = document.querySelector("button[aria-label='Salin nomor transaksi']"); const svg = b?.querySelector('.copy-in svg'); return b ? { text: b.textContent.trim(), hasSvg: !!svg, svgAnims: svg ? svg.getAnimations().map((a) => a.animationName + ':' + a.playState) : [] } : null; })()`));

// ===== M. s461-1 border hijau HP valid =====
await nav("#/pulsa");
await setInput("#hp", "081234567890");
await sleep(300);
rec("M-hp-ok", await evalJs(`(() => { const el = document.querySelector('#hp'); const cs = getComputedStyle(el); return el ? { cls: el.className, border: cs.borderColor, transition: cs.transitionDuration + ' ' + cs.transitionProperty } : null; })()`));

// ===== P. reduced-motion =====
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await evalJs(`location.assign(${JSON.stringify(baseUrl + "#/")}); 'ok'`); await sleep(1200);
rec("P-reduced-motion", await evalJs(`(() => { const card = document.querySelector('.grid .card'); const sold = document.querySelector('.sold-num'); return { cardAnim: card ? getComputedStyle(card).animationName : null, soldAfter: sold ? getComputedStyle(sold, '::after').content : null, qtyTransition: (() => { const q = document.querySelector('.qty button'); return q ? getComputedStyle(q).transitionDuration : null; })() }; })()`));
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });

// ===== Q. s459-4 chip footer display-only =====
rec("Q-footer-chips", await evalJs(`(() => { const chips = [...document.querySelectorAll('.pay-chips span')]; return { count: chips.length, allSpan: chips.every((c) => c.tagName === 'SPAN'), anyFocusable: chips.some((c) => c.tabIndex >= 0) }; })()`));

console.log("FASE3-PROBE-SELESAI");
