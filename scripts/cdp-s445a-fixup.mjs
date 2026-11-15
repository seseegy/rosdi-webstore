// Probe perbaikan s445a: ulangi probe yang gagal/cacat di run pertama.
// Perbaikan skrip: setInput memakai JSON.stringify untuk selector (tanda kutip
// di [aria-label='...'] sebelumnya memecah string querySelector -> SyntaxError).
// Dijalankan via: CDP_H=400 bash scripts/cdp-launch.sh scripts/cdp-s445a-fixup.mjs hidden_files/qa-periodic-s445/cdp-s445a-fixup 390
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

const [wsUrl, widthArg, , outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
const HEIGHT = parseInt(process.env.CDP_H || "900", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH, height: HEIGHT };
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
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error("EVAL-EXC: " + JSON.stringify(r.exceptionDetails).slice(0, 1200));
    return r.result.value;
  });
const PARTIAL = `${outDir}/cdp-s445a-fixup-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 1200) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = '${hash}'; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
const mouseDownUp = async (x, y) => {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await sleep(120);
  const pressed = await evalJs(`(() => { const el = document.elementFromPoint(${Math.round(x)}, ${Math.round(y)}); if (!el) return 'NO-EL-UNDER-POINT'; const t = el.closest('button, a') || el; const cs = getComputedStyle(t); return { transform: cs.transform, tag: el.tagName, cls: (t.className?.toString() || '').slice(0, 40) }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  return pressed;
};

await evalJs(`localStorage.clear(); 'ok'`);

// f1: ide 1 + 8 dengan viewport PENDEK (CDP_H=400) agar seksi flash di bawah fold saat muat
await probe("f1_ide1_ide8_belowfold", async () => {
  await nav("#/");
  await sleep(1500); // animasi prog-fill .6s pasti selesai
  return await evalJs(`(() => {
    const chip = document.querySelector('.count-chip');
    const sec = document.querySelector('#katalog'); const sr = sec.getBoundingClientRect();
    const bars = [...document.querySelectorAll('.progress i')].map((i) => {
      const cs = getComputedStyle(i); const r = i.getBoundingClientRect(); const p = i.parentElement.getBoundingClientRect();
      return { widthPx: Math.round(r.width), parentPx: Math.round(p.width), rasio: +(r.width / p.width).toFixed(2), transform: cs.transform, animationName: cs.animationName };
    });
    return { viewportH: window.innerHeight, scrollY: Math.round(window.scrollY), countdownText: chip?.textContent,
      flashTop: Math.round(sr.top), flashDiBawahFold: sr.top > window.innerHeight, bars };
  })()`);
});

// f2: ide 7 — was di ringkasan (selector promo diperbaiki)
await probe("f2_ide7_was", async () => {
  await nav("#/game/mobile-legends");
  await clickText(".tab", "Weekly Pass");
  await sleep(300);
  await evalJs(`(() => { [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('Weekly Diamond Pass')).click(); return 'ok'; })()`);
  await sleep(300);
  const was = await evalJs(`(() => { const w = document.querySelector('.sum-row .was'); if (!w) return 'NO-WAS-DI-RINGKASAN';
    const cs = getComputedStyle(w); const nomWas = document.querySelector('.nom.on .was'); const ncs = nomWas ? getComputedStyle(nomWas) : null;
    return { teksRingkasan: w.parentElement.textContent.replace(/\\s+/g, ' ').trim(), transition: cs.transition, animationName: cs.animationName, opacity: cs.opacity,
      nomWasTransition: ncs?.transition, nomWasAnimation: ncs?.animationName }; })()`);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
  await sleep(300);
  const disc = await evalJs(`(() => { const d = document.querySelector('.sum-row.disc'); if (!d) return 'NO-DISC'; const cs = getComputedStyle(d);
    return { text: d.textContent.replace(/\\s+/g, ' ').trim(), animationName: cs.animationName }; })()`);
  return { was, disc };
});

// f3: ide 10 — active state tombol Pakai (mouse sungguhan)
await probe("f3_ide10_pakai", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await sleep(200);
  const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); if (!b) return 'NO-BTN'; const r = b.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), disabled: b.disabled }; })()`);
  const idle = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); const cs = getComputedStyle(b); return { transform: cs.transform, transition: cs.transition.slice(0, 90), activeMatch: b.matches(':active') }; })()`);
  const pressed = await mouseDownUp(pos.x, pos.y);
  await sleep(300);
  const setelah = await evalJs(`(() => { const m = document.querySelector('.note.good'); return m ? m.textContent.trim() : 'NO-MSG'; })()`);
  return { pos, idle, pressed, setelah };
});

// f4: ide 80 — stepper 1 -> 2, aria-live (state segar)
await probe("f4_ide80_stepper", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  const sebelum = await evalJs(`(() => { const b = document.querySelector('.qty b'); return { qty: b?.textContent, ariaLive: b?.getAttribute('aria-live'), html: b?.outerHTML }; })()`);
  await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`);
  await sleep(250);
  const sesudah = await evalJs(`(() => { const b = document.querySelector('.qty b'); return { qty: b?.textContent, ariaLive: b?.getAttribute('aria-live'), html: b?.outerHTML }; })()`);
  return { sebelum, sesudah };
});

// f5: ide 71/72 — reset tab dulu (nav ke #/ lalu kembali) agar tab Diamonds aktif
await probe("f5_ide71_72", async () => {
  await nav("#/");
  await nav("#/game/mobile-legends");
  return await evalJs(`(() => {
    const nom86 = [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('86 Diamonds'));
    const price = nom86?.querySelector('.n-price'); const meta = nom86?.querySelector('.n-meta');
    const nom706 = [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('706 Diamonds'));
    const badge = nom706?.querySelector('.badge');
    return {
      tabAktif: document.querySelector('.tab.on')?.textContent,
      harga86: { html: price?.outerHTML || 'NO-PRICE', ariaLabel: price?.getAttribute('aria-label') || '(tidak ada)', teks: price?.textContent.trim() },
      meta86: { html: meta?.outerHTML || 'NO-META', ariaLabel: meta?.getAttribute('aria-label') || '(tidak ada)', teks: meta?.textContent.trim() },
      badge706: { html: badge?.outerHTML || 'NO-BADGE', ariaLabel: badge?.getAttribute('aria-label') || '(tidak ada)' },
      tombol86AriaLabel: nom86?.getAttribute('aria-label') || '(tidak ada — nama tombol = teks konten)',
      tombol86Teks: nom86 ? nom86.innerText.replace(/\\n/g, ' | ') : 'NO-NOM86',
    };
  })()`);
});

// f6: ide 3 — beli + Salin ganda di Sukses (390)
await probe("f6_ide3_toast", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(150);
  await clickText(".pay", "QRIS");
  await sleep(150);
  await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
  await sleep(700);
  const ref = await evalJs(`(() => { const o = JSON.parse(localStorage.getItem('rosdi_orders') || '[]')[0]; return o ? o.ref : 'NO-ORDER'; })()`);
  if (ref === "NO-ORDER") return { ref, hash: await evalJs(`location.hash`) };
  await nav("#/sukses/" + ref);
  await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return 'NO-BTN'; b.click(); b.click(); return 'clicked-2x'; })()`);
  await sleep(150);
  const langsung = await evalJs(`(() => ({ toastCount: document.querySelectorAll('.toast').length,
    labelSalin: [...document.querySelectorAll('button')].find((x) => /Disalin|Salin/.test(x.textContent))?.textContent.trim() }))()`);
  await sleep(2200);
  const setelah2detik = await evalJs(`(() => ({ toastCount: document.querySelectorAll('.toast').length,
    labelSalin: [...document.querySelectorAll('button')].find((x) => /Disalin|Salin/.test(x.textContent))?.textContent.trim() }))()`);
  return { ref, langsung, setelah2detik };
});

// f7: ide 74/75 — seed order PLN lalu baca markup Sukses (dengan diagnostik)
await probe("f7_ide74_75", async () => {
  await evalJs(`(() => { const orders = JSON.parse(localStorage.getItem('rosdi_orders') || '[]');
    orders.unshift({ ref: 'RSD-SEEDPLN01', kind: 'pln', product: 'Token PLN', item: 'Token 100.000', qty: 1, target: '12345678901',
      base: 100000, fee: 0, disc: 0, total: 100000, method: 'QRIS', time: Date.now(), status: 'Selesai',
      email: '', wa: '', token: '1234 5678 9012 3456 7890' });
    localStorage.setItem('rosdi_orders', JSON.stringify(orders)); return 'seeded'; })()`);
  await nav("#/sukses/RSD-SEEDPLN01");
  return await evalJs(`(() => {
    const rows = [...document.querySelectorAll('.sum-row')];
    const refRow = rows.find((r) => r.textContent.includes('Nomor transaksi'));
    const refB = refRow?.querySelector('b');
    const tokenBox = document.querySelector('.token-box');
    return { hash: location.hash, h1: document.querySelector('h1')?.textContent || 'NO-H1',
      refHtml: refB?.outerHTML || 'NO-REF', refTeks: refB?.textContent || '(kosong)',
      tokenHtml: tokenBox?.outerHTML || 'NO-TOKEN', tokenTeks: tokenBox?.textContent.trim() || '(kosong)',
      cuplikanBody: document.body.innerText.slice(0, 120).replace(/\\n/g, ' | ') };
  })()`);
});

// f8: ide 73 — badge flash di Beranda (dengan diagnostik)
await probe("f8_ide73_badge", async () => {
  await nav("#/");
  return await evalJs(`(() => ({ hash: location.hash, jumlahKartuFlash: document.querySelectorAll('#katalog .card').length,
    badges: [...document.querySelectorAll('#katalog .badge')].map((b) => ({ html: b.outerHTML, ariaLabel: b.getAttribute('aria-label') || '(tidak ada)' })),
    teksKartu: [...document.querySelectorAll('#katalog .card')].map((c) => c.innerText.replace(/\\n/g, ' | ')) }))()`);
});

// f9: ide 77 — fokus DULU ke input (seperti pengguna mengetik), lalu cek error + activeElement
await probe("f9_ide77_fokus", async () => {
  await nav("#/game/mobile-legends");
  await evalJs(`(() => { document.querySelector('#uid').focus(); return 'ok'; })()`);
  await setInput("#uid", "12");
  await sleep(300);
  const a = await evalJs(`(() => ({ activeId: document.activeElement?.id || document.activeElement?.tagName,
    err: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()),
    uidErrClass: document.querySelector('#uid')?.classList.contains('err') }))()`);
  await setInput("#uid", "12345678");
  await sleep(300);
  const b = await evalJs(`(() => ({ activeId: document.activeElement?.id || document.activeElement?.tagName,
    err: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) }))()`);
  return { uidSalah: a, zoneKosong: b };
});

// f10: ide 76 — fokus hasil Cek (dengan detail activeElement)
await probe("f10_ide76_fokus_cek", async () => {
  await nav("#/cek");
  await setInput(".step .input", "RSD-DEMO1234");
  await clickText(".step .btn", "Cek");
  await sleep(600);
  return await evalJs(`(() => { const a = document.activeElement; const res = document.querySelector('.cek-result');
    return { activeTag: a?.tagName, activeCls: (a?.className?.toString() || '').slice(0, 40), activeTeks: (a?.textContent || '').trim().slice(0, 40),
      hasilMuncul: !!res, hasilTabIndex: res?.getAttribute('tabindex') || '(tidak ada)', hasilPunyaFokus: res ? res.contains(document.activeElement) : false }; })()`);
});

writeFileSync(`${outDir}/cdp-s445a-fixup-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
