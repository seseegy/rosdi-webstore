// Verifikasi runtime batch s434 via CDP (pola cdp-s433-verify.mjs).
// Penggunaan: node scripts/cdp-s434.mjs <wsUrl> <width> <baseUrl> <outDir>
// Ide: 2,4,7,11-18,24,28,31-40,44,49,50,55,56,62,68,90 (+14,29,35).
import { writeFileSync } from "node:fs";

const [_wsUrl, widthArg, _baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const api = {
      send: (method, params = {}) => new Promise((res, rej) => {
        const id = nextId++;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      evalJs: async (expression) => {
        const r = await api.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error("eval failed: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
        return r.result.value;
      },
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    };
    ws.onopen = () => resolve(api);
    ws.onerror = reject;
  });
}

const out = { width: WIDTH };
const listPages = () => fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const findAppPage = async () => {
  // Tunggu redirect go.html selesai DAN url stabil (2 poll berurutan sama).
  let prevUrl = null, prevId = null, stable = 0;
  for (let i = 0; i < 60; i++) {
    const list = await listPages();
    const t = list.find((x) => x.type === "page" && x.url.startsWith("http://127.0.0.1:4173"));
    if (t && t.url === prevUrl && t.id === prevId) { stable++; if (stable >= 2) return t; }
    else stable = 0;
    if (t) { prevUrl = t.url; prevId = t.id; }
    await sleep(500);
  }
  throw new Error("halaman app tidak ditemukan/stabil");
};
let main;
const connectMain = async () => {
  const target = await findAppPage();
  main = await connect(target.webSocketDebuggerUrl);
  await main.send("Page.enable");
  await main.send("Runtime.enable");
  await main.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 844, deviceScaleFactor: 2, mobile: WIDTH < 900 });
  return main;
};
await connectMain();
const evalJsSafe = async (expression) => {
  const once = async () => {
    const r = await main.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval failed: " + JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  };
  try { return await once(); }
  catch (e) {
    if (!String(e.message || e).includes("-32000") && !String(e.message || e).includes("navigated")) throw e;
    await sleep(1500);
    await connectMain();
    return await once();
  }
};
const ev = evalJsSafe;
const go = async (hash) => {
  // Navigasi HASH saja (tanpa reload penuh): reload penuh dari halaman app
  // kena blok LNA (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS), sedangkan
  // perubahan hash me-render ulang rute tanpa memuat ulang dokumen.
  await ev(`location.hash = ${JSON.stringify(hash)}`);
  // Tunggu React mount/render rute (root terisi) sebelum eval apa pun.
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const r = await main.send("Runtime.evaluate", { expression: "document.getElementById('root')?.children.length || 0", returnByValue: true });
      if (r.result && r.result.value > 0) break;
    } catch { /* coba lagi */ }
  }
  await sleep(600);
};
const setInput = async (selector, value) => ev(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return 'no-el';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return el.value;
})()`);
const clickBtn = async (text, scope) => ev(`(() => {
  const root = ${scope ? `document.querySelector(${JSON.stringify(scope)})` : "document"};
  if (!root) return 'no-scope';
  const b = [...root.querySelectorAll('button')].find((x) => x.innerText.trim() === ${JSON.stringify(text)});
  if (!b) return 'no-btn:' + ${JSON.stringify(text)};
  b.click(); return 'clicked';
})()`);
await ev(`localStorage.clear()`);

// ---------- Beranda ----------
await go("");
out.hero = await ev(`(() => {
  const h1 = document.querySelector('.hero h1');
  const p = document.querySelector('.hero p');
  const btn = document.querySelector('.hero .btn');
  const r = (el) => el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;
  const hr = document.querySelector('.hero').getBoundingClientRect();
  return { h1: h1?.innerText, h1Rect: r(h1), sub: p?.innerText, subRect: r(p), cta: btn?.innerText, ctaRect: r(btn),
    heroRect: { y: Math.round(hr.y), h: Math.round(hr.height) },
    overlap: (() => { const a = h1.getBoundingClientRect(), b = p.getBoundingClientRect(), c = btn.getBoundingClientRect();
      return { h1sub: a.bottom > b.top, subCta: b.bottom > c.top }; })() };
})()`);
// Ide 2: countdown tabular-nums + lebar stabil
out.countdown = await ev(`(() => {
  const chip = document.querySelector('.count-chip');
  if (!chip) return null;
  const cs = getComputedStyle(chip);
  const w1 = chip.getBoundingClientRect().width;
  return new Promise((res) => setTimeout(() => {
    res({ text1: chip.innerText, w1, w2: chip.getBoundingClientRect().width, text2: chip.innerText,
      tabular: cs.fontVariantNumeric, fontSize: cs.fontSize });
  }, 1500));
})()`);
// Ide 11: header sticky
out.sticky = await ev(`(async () => {
  const h = document.querySelector('header.site');
  const before = h.getBoundingClientRect().top;
  window.scrollTo(0, 1500);
  await new Promise((r) => setTimeout(r, 400));
  const after = h.getBoundingClientRect().top;
  const pos = getComputedStyle(h).position;
  window.scrollTo(0, 0);
  return { before, after, position: pos };
})()`);
// Ide 12: nav aktif
out.nav = {};
for (const [hash, label] of [["", "home"], ["#/game/mobile-legends", "game"], ["#/cek", "cek"], ["#/pln", "pln"]]) {
  await go(hash);
  out.nav[label] = await ev(`[...document.querySelectorAll('nav.main a')].map((a) => a.innerText + (a.classList.contains('on') ? ':ON' : ''))`);
}
// Ide 13: login mock
await go("");
out.login = await ev(`(() => {
  const btn = [...document.querySelectorAll('header .btn')].find((b) => b.innerText.trim() === 'Masuk');
  if (!btn) return 'no-masuk-btn';
  btn.click();
  return new Promise((res) => setTimeout(() => {
    const modal = document.querySelector('.modal');
    const modalText = modal ? modal.innerText.slice(0, 120) : null;
    const ok = [...document.querySelectorAll('.modal .btn')].find((b) => b.innerText.includes('lanjut belanja'));
    if (ok) ok.click();
    setTimeout(() => {
      const after = [...document.querySelectorAll('header .btn')].map((b) => b.innerText.trim());
      res({ modalText, headerBtnsAfter: after, modalGone: !document.querySelector('.modal') });
    }, 300);
  }, 300));
})()`);
// Ide 16: footer di semua rute
out.footer = {};
for (const [hash, label] of [["", "home"], ["#/game/mobile-legends", "game"], ["#/pulsa", "pulsa"], ["#/pln", "pln"], ["#/cek", "cek"], ["#/tagihan", "tagihan"], ["#/emoney", "emoney"], ["#/voucher/google-play", "voucher"]]) {
  await go(hash);
  out.footer[label] = await ev(`(() => {
    const f = document.querySelector('footer.site');
    if (!f) return null;
    return { cols: [...f.querySelectorAll('h2')].map((h) => h.innerText), copyright: f.querySelector('.copyright')?.innerText.slice(0, 90) };
  })()`);
}
// Ide 17: tautan Produk footer
await go("");
out.footerLinks = await ev(`(async () => {
  const links = [...document.querySelectorAll('footer.site a')].map((a) => ({ t: a.innerText, href: a.getAttribute('href') }));
  const res = [];
  for (const l of links.filter((x) => ['Mobile Legends','Free Fire','Pulsa Reguler','Token PLN','Tagihan Pascabayar'].includes(x.t))) {
    const a = [...document.querySelectorAll('footer.site a')].find((x) => x.innerText === l.t);
    a.click();
    await new Promise((r) => setTimeout(r, 1200));
    res.push({ t: l.t, hash: location.hash, h1: document.querySelector('h1')?.innerText });
    location.hash = '';
    await new Promise((r) => setTimeout(r, 1200));
  }
  return res;
})()`);
// Ide 18: modal S&K dari halaman produk
await go("#/game/mobile-legends");
out.modalFromGame = await ev(`(async () => {
  const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.innerText.includes('Syarat'));
  if (!b) return 'no-btn';
  b.click();
  await new Promise((r) => setTimeout(r, 400));
  const m = document.querySelector('.modal');
  return m ? m.querySelector('h3')?.innerText : 'modal-tidak-muncul';
})()`);
await ev(`(() => { const b = document.querySelector('.modal .btn'); if (b) b.click(); return 'closed'; })()`);
// Ide 28: pencarian kosong
await go("");
out.searchEmpty = await ev(`(async () => {
  const inp = document.querySelector('.searchbar input');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, 'zzz');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  return { emptyMsg: !!document.querySelector('.empty'), trustShown: !!document.querySelector('.trust'),
    caraShown: !!document.getElementById('cara-topup'),
    trustTitles: [...document.querySelectorAll('.trust b')].map((b) => b.innerText) };
})()`);
// Ide 9: pencarian mlbb — kartu flash
out.searchMlbb = await ev(`(async () => {
  const inp = document.querySelector('.searchbar input');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, 'mlbb');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  const flash = document.querySelector('.grid.c2');
  return flash ? flash.innerText.replace(/\\n/g, ' | ') : 'no-flash';
})()`);
await ev(`(() => { const inp = document.querySelector('.searchbar input'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(inp, ''); inp.dispatchEvent(new Event('input', { bubbles: true })); return 'cleared'; })()`);

// ---------- Game page: gating, tabs, qty, promo, was, nom alignment ----------
await go("#/game/mobile-legends");
out.gating = {};
out.gating.initial = await ev(`(() => {
  const buy = [...document.querySelectorAll('.summary .btn.big, .mobile-bar .btn')].map((b) => b.disabled);
  const hint = document.querySelector('.summary .note')?.innerText || null;
  return { buyDisabled: buy, hint };
})()`);
await setInput("#uid", "12345678");
await setInput("#zone", "1234");
out.gating.afterUid = await ev(`(() => {
  const b = document.querySelector('.summary .btn.big');
  return { disabled: b.disabled, hint: b.parentElement.querySelector('.note')?.innerText };
})()`);
out.nomSelectableNoUid = await ev(`(() => {
  // ide 34: nominal bisa dipilih walau UID kosong? kosongkan dulu
  const uid = document.querySelector('#uid');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(uid, ''); uid.dispatchEvent(new Event('input', { bubbles: true }));
  return new Promise((res) => setTimeout(() => {
    const nom = document.querySelectorAll('.nom')[0];
    nom.click();
    setTimeout(() => res({ clicked: nom.classList.contains('on'), buyDisabled: document.querySelector('.summary .btn.big').disabled }), 200);
  }, 200));
})()`);
await setInput("#uid", "12345678");
await setInput("#zone", "1234");
// ide 68: ukur y harga nominal sebaris (dengan/tanpa meta)
out.nomAlign = await ev(`(() => {
  const noms = [...document.querySelectorAll('.nom')].slice(0, 3);
  return noms.map((n) => ({ name: n.querySelector('.n-name')?.innerText, hasMeta: !!n.querySelector('.n-meta'),
    priceY: Math.round(n.querySelector('.n-price').getBoundingClientRect().y),
    cardBottom: Math.round(n.getBoundingClientRect().bottom) }));
})()`);
// ide 35: tab
out.tabs = await ev(`(() => {
  const tabs = [...document.querySelectorAll('.tab')].map((t) => t.innerText + (t.classList.contains('on') ? ':ON' : ''));
  return tabs;
})()`);
await clickBtn("Weekly Pass", ".tabs");
await sleep(300);
out.tabsAfter = await ev(`[...document.querySelectorAll('.tab')].map((t) => t.innerText + (t.classList.contains('on') ? ':ON' : ''))`);
// pilih Weekly Diamond Pass (ide 4: was di ringkasan)
await ev(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.innerText.includes('Weekly Diamond Pass')); if (n) n.click(); return !!n; })()`);
await sleep(300);
out.flashSummary = await ev(`(() => {
  const rows = [...document.querySelectorAll('.summary .sum-row')].map((r) => r.innerText.replace(/\\n/g, ' '));
  const total = document.querySelector('.sum-total')?.innerText.replace(/\\n/g, ' ');
  return { rows, total };
})()`);
out.gating.afterNominal = await ev(`(() => {
  const b = document.querySelector('.summary .btn.big');
  return { disabled: b.disabled, hint: b.parentElement.querySelector('.note')?.innerText };
})()`);
// ide 37: stepper
out.qty = await ev(`(async () => {
  const q = document.querySelector('.qty');
  if (!q) return 'no-qty';
  const hasInput = !!q.querySelector('input');
  const plus = q.querySelector('.plus');
  for (let i = 0; i < 12; i++) { plus.click(); await new Promise((r) => setTimeout(r, 60)); }
  const atMax = q.querySelector('b').innerText;
  const minus = q.querySelector('button:not(.plus)');
  for (let i = 0; i < 12; i++) { minus.click(); await new Promise((r) => setTimeout(r, 60)); }
  return { hasInput, atMax, atMin: q.querySelector('b').innerText, minusDisabledAtMin: minus.disabled };
})()`);
// ide 40+49: promo sebelum nominal? (nominal sudah dipilih; uji urutan balik di bawah)
// Terapkan ROSDI10 sekarang, cek baris metode + total
await setInput("input[aria-label='Kode promo']", "ROSDI10");
await clickBtn("Pakai");
await sleep(400);
out.promo = await ev(`(() => {
  const rows = [...document.querySelectorAll('.pay')].slice(0, 4).map((p) => p.innerText.replace(/\\n/g, ' | '));
  const msg = [...document.querySelectorAll('.note')].map((n) => n.innerText).find((t) => t.includes('ROSDI10'));
  const total = document.querySelector('.sum-total')?.innerText.replace(/\\n/g, ' ');
  return { msg, rows, total };
})()`);
out.gating.afterMethod = await ev(`(() => {
  const pay = [...document.querySelectorAll('.pay')].find((p) => p.innerText.includes('QRIS'));
  pay.click();
  return new Promise((res) => setTimeout(() => {
    const b = document.querySelector('.summary .btn.big');
    res({ disabled: b.disabled, hint: b.parentElement.querySelector('.note')?.innerText || 'no-hint' });
  }, 200));
})()`);
// ide 50 + 7: beli, lalu kembali ke produk (state reset?); mobile-bar di 320 dicek terpisah
out.buyFlow = await ev(`(async () => {
  const b = document.querySelector('.summary .btn.big');
  b.click();
  await new Promise((r) => setTimeout(r, 1500));
  const hashAfter = location.hash;
  const h1 = document.querySelector('h1')?.innerText;
  location.hash = '#/game/mobile-legends';
  await new Promise((r) => setTimeout(r, 2000));
  const noms = [...document.querySelectorAll('.nom')].filter((n) => n.classList.contains('on')).length;
  const pays = [...document.querySelectorAll('.pay')].filter((p) => p.classList.contains('on')).length;
  const uidVal = document.querySelector('#uid')?.value;
  return { hashAfter, h1, nomsOn: noms, paysOn: pays, uidVal };
})()`);

// ---------- Promo SEBELUM nominal (ide 40) ----------
await go("#/game/free-fire");
await setInput("#uid", "12345678");
await setInput("input[aria-label='Kode promo']", "ROSDI10");
await clickBtn("Pakai");
await sleep(300);
out.promoFirst = await ev(`(async () => {
  const msg = [...document.querySelectorAll('.note')].map((n) => n.innerText).find((t) => t.includes('ROSDI10'));
  const totalBefore = document.querySelector('.sum-total')?.innerText.replace(/\\n/g, ' ');
  const nom = [...document.querySelectorAll('.nom')].find((x) => x.innerText.includes('140 Diamonds'));
  nom.click();
  await new Promise((r) => setTimeout(r, 300));
  const totalAfter = document.querySelector('.sum-total')?.innerText.replace(/\\n/g, ' ');
  const qrisRow = [...document.querySelectorAll('.pay')].find((p) => p.innerText.includes('QRIS'))?.innerText.replace(/\\n/g, ' | ');
  return { msg, totalBefore, totalAfter, qrisRow };
})()`);
// ide 44: pulsa bayar pulsa
await go("#/pulsa/telkomsel");
await setInput("#hp", "081212345678");
await sleep(300);
await ev(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.innerText.includes('Pulsa 50.000')); if (n) n.click(); return !!n; })()`);
await sleep(300);
await ev(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.innerText.includes('Pulsa Telkomsel')); if (p) p.click(); return !!p; })()`);
await sleep(300);
out.pulsaNote = await ev(`[...document.querySelectorAll('.note')].map((n) => n.innerText).filter((t) => t.includes('pulsa dengan pulsa'))`);
// ide 55/56: PLN Cek Nama
await go("#/pln");
await setInput("#idpel", "123456789012");
await clickBtn("Cek Nama");
await sleep(400);
out.pln = await ev(`(() => {
  const notes = [...document.querySelectorAll('.note')].map((n) => n.innerText);
  const buy = document.querySelector('.summary .btn.big');
  return { notes, buyDisabledBeforeMethod: buy.disabled };
})()`);
await ev(`(() => { const n = [...document.querySelectorAll('.nom')].find((x) => x.innerText.includes('Token 100.000')); if (n) n.click(); return !!n; })()`);
await sleep(200);
await ev(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.innerText.includes('QRIS')); if (p) p.click(); return !!p; })()`);
await sleep(200);
out.pln.buyEnabled = await ev(`document.querySelector('.summary .btn.big').disabled`);
// ide 62: WR vs AoV step1
await go("#/game/league-of-legends-wild-rift");
out.wrStep1 = await ev(`document.querySelector('.step h2')?.innerText + ' | ' + (document.querySelector('#riot') ? 'riot-input' : 'no-riot-input')`);
await go("#/game/arena-of-valor");
out.aovStep1 = await ev(`document.querySelector('.step h2')?.innerText + ' | ' + (document.querySelector('#uid') ? 'uid-input' : 'no-uid-input')`);
// ide 41: jumlah baris metode
await go("#/game/mobile-legends");
out.payRows = await ev(`(() => {
  const rows = [...document.querySelectorAll('.pay')];
  return { total: rows.length, disabled: rows.filter((r) => r.disabled).map((r) => r.innerText.split('\\n')[0]),
    groups: [...document.querySelectorAll('.pay-group')].map((g) => g.innerText) };
})()`);
// ide 90: print emulation
await main.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }], media: "print" });
await sleep(300);
out.print = await ev(`(() => {
  const disp = (s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).display : 'no-el'; };
  return { header: disp('header.site'), footer: disp('footer.site'), mobileBar: disp('.mobile-bar'), btn: disp('.summary .btn.big') };
})()`);
await main.send("Emulation.setEmulatedMedia", { media: "screen" });

writeFileSync(`${outDir}/s434-runtime-${WIDTH}.json`, JSON.stringify(out, null, 2));
console.log("CDP DONE", WIDTH, JSON.stringify(out).slice(0, 600));
process.exit(0);
