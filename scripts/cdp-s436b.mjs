// CDP lanjutan s436: autofill6 (dengan Zone), mobile-bar vs footer,
// tombol Salin + user-select di Sukses nyata, back btn, tautan footer kecil.
// Penggunaan: node scripts/cdp-s436b.mjs <wsUrl> <width> <baseUrl> <outDir>
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
await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width <= 560 });

const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  });
const goHash = async (hash) => { await evalJs(`location.hash = ${JSON.stringify(hash)}; 'ok'`); await sleep(1300); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
const safe = async (id, fn) => { try { rec(id, await fn()); } catch (e) { rec(id, { ERROR: String(e).slice(0, 300) }); } };

await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(2500);
await evalJs(`localStorage.clear(); 'ok'`);

// ---- autofill6 (perbaikan): isi UID + Zone + nominal + QRIS + email + WA
await goHash("#/game/mobile-legends");
await safe("autofill6b", async () => {
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[0]?.click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.pay')[0]?.click(); return 'ok'; })()`);
  await sleep(200);
  await setInput("#email", "test@mail.com");
  await setInput("#wa", "081234567890");
  await sleep(300);
  const sum = await evalJs(`(() => { const rows = [...document.querySelectorAll('.summary .sum-row')].map((r) => r.textContent.replace(/\\s+/g, ' ').trim()); const b = [...document.querySelectorAll('.summary .btn.big')].find((x) => x.textContent.includes('Beli')); return { rows, buyDisabled: b ? b.disabled : null }; })()`);
  return sum;
});

// ---- back button + footer small link (halaman produk)
await safe("touch57b", async () => evalJs(`(() => {
  const h = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const footLinks = [...document.querySelectorAll('footer.site .foot-in a')].map((a) => ({ t: a.textContent.trim().slice(0, 20), ...h(a) }));
  return { backBtn: h(document.querySelector('.crumb .back')), footLinks: footLinks.slice(0, 6) };
})()`));

// ---- mobile-bar vs footer: scroll ke bawah halaman produk
await safe("mobilebar32b", async () => {
  await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
  await sleep(600);
  return evalJs(`(() => {
    const mb = document.querySelector('.mobile-bar');
    const cp = document.querySelector('.copyright');
    const ft = document.querySelector('footer.site');
    if (!mb) return { mb: false };
    const a = mb.getBoundingClientRect(), b = cp.getBoundingClientRect(), f = ft.getBoundingClientRect();
    return {
      mb: { top: Math.round(a.top), bottom: Math.round(a.bottom), h: Math.round(a.height) },
      copyright: { top: Math.round(b.top), bottom: Math.round(b.bottom), visible: b.top < innerHeight && b.bottom > 0 },
      footerTop: Math.round(f.top), vh: innerHeight, scrollY: Math.round(window.scrollY),
      maxScroll: document.body.scrollHeight - innerHeight,
      overlapCopyright: a.bottom > b.top && a.top < b.bottom,
    };
  })()`);
});

// ---- beli beneran -> Sukses: ukur tombol Salin + user-select ref
await safe("buyflow", async () => {
  await evalJs(`window.scrollTo(0, 0); 'ok'`); await sleep(300);
  const clicked = await evalJs(`(() => { const b = [...document.querySelectorAll('.summary .btn.big')].find((x) => x.textContent.includes('Beli')); if (!b || b.disabled) return 'NO-BTN'; b.click(); return 'ok'; })()`);
  await sleep(1200);
  const hash = await evalJs(`location.hash`);
  return { clicked, hash };
});
await safe("success56-80", async () => evalJs(`(() => {
  const h = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const refB = [...document.querySelectorAll('.sum-row b')].find((x) => x.textContent.includes('RSD'));
  const salinBtns = [...document.querySelectorAll('button')].filter((b) => /Salin/.test(b.textContent)).map((b) => ({ t: b.textContent.trim(), ...h(b) }));
  return {
    onSuccess: !!document.querySelector('.big-check'),
    refUserSelect: refB ? getComputedStyle(refB).userSelect : null,
    refText: refB?.textContent || null,
    salinBtns,
  };
})()`));

writeFileSync(`${outDir}/cdp-s436b-${width}.json`, JSON.stringify(R, null, 1));
console.log("DONE", Object.keys(R).join(","));
ws.close();
process.exit(0);
