// Ukur runtime CDP batch s436: tempel/Enter/autofill, DOM, console,
// target sentuh, mobile-bar vs footer, chip scroll, tab scroll, chunk,
// Cek lowercase, user-select.
// Penggunaan: node scripts/cdp-s436.mjs <wsUrl> <width> <baseUrl> <outDir>
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
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
// Simulasi tempel: set value via native setter + input event (jalur yang
// dipakai browser saat paste/autofill).
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const click = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'ok'; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---- ide 41: jumlah node DOM Beranda + ide 45: console saat load
await safe("dom41", async () => evalJs(`(() => ({ nodes: document.querySelectorAll('*').length, bodyText: document.body.innerText.length }))()`));
await safe("console45-home", async () => ({ msgs: consoleMsgs.slice() }));

// ---- ide 35: scroll chip setelah pencarian berubah
await safe("chip35", async () => {
  const before = await evalJs(`(() => { const c = document.querySelector('.chips'); c.scrollLeft = 120; return c.scrollLeft; })()`);
  await setInput(".searchbar input", "pulsa");
  await sleep(400);
  const mid = await evalJs(`document.querySelector('.chips').scrollLeft`);
  await setInput(".searchbar input", "");
  await sleep(400);
  const after = await evalJs(`document.querySelector('.chips').scrollLeft`);
  return { before, mid, after };
});

// ---- ide 51-57: tinggi target sentuh (390px)
await safe("touch51-57", async () => evalJs(`(() => {
  const h = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  return {
    chip: h('.chip'), tab: null, iconBtn: h('.icon-btn'),
    masukBtn: h('.header-actions .btn'),
    footerLink: (() => { const a = document.querySelector('footer.site a'); if (!a) return null; const r = a.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
  };
})()`));

// ---- ide 32: mobile-bar vs footer (390px)
await safe("mobilebar32", async () => {
  await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
  await sleep(600);
  return evalJs(`(() => {
    const mb = document.querySelector('.mobile-bar');
    const cp = document.querySelector('.copyright');
    if (!mb || !cp) return { mb: !!mb, cp: !!cp, note: 'bukan halaman produk (mobile-bar hanya di checkout)' };
    const a = mb.getBoundingClientRect(), b = cp.getBoundingClientRect();
    return { mbTop: Math.round(a.top), mbBottom: Math.round(a.bottom), cpTop: Math.round(b.top), cpBottom: Math.round(b.bottom), vh: innerHeight, overlap: a.bottom > b.top && a.top < b.bottom };
  })()`);
});

// ---- halaman produk: tempel & Enter (ide 1,2,5,7,9,10,4)
await goHash("#/game/mobile-legends");
await safe("paste1-uid", async () => {
  await setInput("#uid", "1234 5678");
  await sleep(300);
  return evalJs(`(() => ({ val: document.querySelector('#uid')?.value, err: document.querySelector('.note.bad')?.textContent || null }))()`);
});
await safe("enter7-uid", async () => {
  const before = await evalJs(`document.activeElement?.id || document.activeElement?.tagName`);
  await evalJs(`(() => { const el = document.querySelector('#uid'); el.focus(); el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true, cancelable: true })); return 'ok'; })()`);
  await sleep(300);
  const after = await evalJs(`document.activeElement?.id || document.activeElement?.tagName`);
  return { before, after, hash: await evalJs(`location.hash`) };
});
await safe("touch52-53", async () => evalJs(`(() => {
  const h = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  return { tab: h('.tab'), qtyBtn: h('.qty button'), qtyPlus: h('.qty .plus') };
})()`));
await safe("chip36-tabscroll", async () => {
  await evalJs(`window.scrollTo(0, 500); 'ok'`); await sleep(300);
  const y0 = await evalJs(`window.scrollY`);
  await evalJs(`(() => { const t = [...document.querySelectorAll('.tab')].find((e) => e.textContent.trim() === 'Weekly Pass'); t?.click(); return 'ok'; })()`);
  await sleep(500);
  const y1 = await evalJs(`window.scrollY`);
  return { y0, y1, delta: y1 - y0 };
});

// ---- Pulsa: tempel nomor ber-spasi (ide 1)
await goHash("#/pulsa/telkomsel");
await safe("paste1-hp", async () => {
  await setInput("#hp", "0812 3456 7890");
  await sleep(300);
  return evalJs(`(() => ({ val: document.querySelector('#hp')?.value, note: [...document.querySelectorAll('.note')].map((n) => n.textContent).join(' | ') }))()`);
});
await safe("enter7-hp", async () => {
  await evalJs(`(() => { const el = document.querySelector('#hp'); el.focus(); el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); return 'ok'; })()`);
  await sleep(300);
  return { active: await evalJs(`document.activeElement?.id || document.activeElement?.tagName`), hash: await evalJs(`location.hash`) };
});

// ---- PLN: tempel ID ber-strip (ide 5)
await goHash("#/pln");
await safe("paste5-pln", async () => {
  await setInput("#idpel", "5432-1098-7654");
  await sleep(300);
  return evalJs(`(() => ({ val: document.querySelector('#idpel')?.value, cekDisabled: document.querySelector('.step .btn')?.disabled, note: [...document.querySelectorAll('.note')].map((n) => n.textContent).join(' | ') }))()`);
});

// ---- Voucher: tempel email kapital+spasi (ide 3) + promo tempel (ide 4,10)
await goHash("#/voucher/google-play");
await safe("paste3-email", async () => {
  await setInput("#vemail", "NAMA@EMAIL.COM ");
  await sleep(300);
  return evalJs(`(() => ({ val: document.querySelector('#vemail')?.value, err: document.querySelector('.note.bad')?.textContent || null }))()`);
});
await safe("paste4-10-promo", async () => {
  const long = await setInput(".step input[aria-label='Kode promo']", "rosdi10".padEnd(50, "x"));
  await sleep(200);
  const len = await evalJs(`document.querySelector(".step input[aria-label='Kode promo']")?.value.length`);
  await evalJs(`(() => { const i = document.querySelector(".step input[aria-label='Kode promo']"); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(i, 'rosdi10'); i.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
  await sleep(200);
  await click(".step form button[type='submit']");
  await sleep(300);
  const msg = await evalJs(`document.querySelector('.note.good, .note.bad')?.textContent || null`);
  return { pasted50Len: len, setVal: long, promoMsg: msg };
});

// ---- CheckoutShell kontak autofill (ide 6): isi email+WA via setter+input
await goHash("#/game/mobile-legends");
await safe("autofill6", async () => {
  await setInput("#uid", "12345678");
  await evalJs(`(() => { const els=[...document.querySelectorAll('.nom')]; els[0]?.click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { const els=[...document.querySelectorAll('.pay')]; els[0]?.click(); return 'ok'; })()`);
  await sleep(200);
  await setInput("#email", "test@mail.com");
  await setInput("#wa", "081234567890");
  await sleep(300);
  const canBuy = await evalJs(`(() => { const b = [...document.querySelectorAll('.summary .btn.big')].find((x) => x.textContent.includes('Beli')); return b ? !b.disabled : null; })()`);
  return { canBuy };
});

// ---- ide 47: urutan chunk saat navigasi ke game (resource timing)
await safe("chunks47", async () => evalJs(`(() => {
  const rs = performance.getEntriesByType('resource').filter((r) => r.name.includes('/assets/')).map((r) => ({ f: r.name.split('/').pop(), start: Math.round(r.startTime), dur: Math.round(r.duration) }));
  return rs;
})()`));

// ---- ide 45 lanjutan: console di halaman produk + sukses
await safe("console45-all", async () => ({ msgs: consoleMsgs.slice(), count: consoleMsgs.length }));

// ---- Cek: ref huruf kecil (ide 79) + user-select (ide 80)
await goHash("#/cek");
await safe("cek79-lower", async () => {
  await setInput(".step .input", "rsd-demo1234");
  await sleep(200);
  await click(".step .btn");
  await sleep(400);
  return evalJs(`(() => ({ found: !!document.querySelector('.timeline'), bad: document.querySelector('.note.bad')?.textContent || null }))()`);
});
await goHash("#/sukses/RSD-DEMO1234");
await safe("success80-select", async () => evalJs(`(() => {
  const b = [...document.querySelectorAll('.sum-row b')].find((x) => x.textContent.includes('RSD'));
  if (!b) return { found: false };
  const cs = getComputedStyle(b);
  return { userSelect: cs.userSelect, text: b.textContent };
})()`));
await safe("dom41-game", async () => evalJs(`(() => ({ nodes: document.querySelectorAll('*').length }))()`));

// ---- ide 51-57 lanjutan: tombol Salin di Sukses (hanya bila order demo tidak ada -> cek tombol ghost)
await safe("touch56-salin", async () => evalJs(`(() => {
  const h = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  return { backBtn: h('.crumb .back') };
})()`));

writeFileSync(`${outDir}/cdp-s436-${width}.json`, JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).join(","));
