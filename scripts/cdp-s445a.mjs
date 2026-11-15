// Probe CDP s445 bagian A+H: ide 1-10 (animasi & motion) dan 71-80 (aksesibilitas).
// Pola disalin dari scripts/cdp-s444.mjs (WebSocket CDP, evalJs, nav, setInput,
// clickText, probe+partial jsonl). Tinggi viewport via env CDP_H (default 900).
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
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const PARTIAL = `${outDir}/cdp-s445a-partial-${WIDTH}x${HEIGHT}.jsonl`;
const probe = async (key, fn) => {
  try { R[key] = await fn(); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const nav = async (hash) => { await evalJs(`location.hash = '${hash}'; 'ok'`); await sleep(1100); };
const setInput = async (sel, val) => evalJs(`(() => { const el = document.querySelector('${sel}'); if (!el) return 'NO-EL'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(val)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const clickText = async (sel, txt) => evalJs(`(() => { const b = [...document.querySelectorAll('${sel}')].find((x) => x.textContent.trim().includes(${JSON.stringify(txt)})); if (!b) return 'NO-BTN'; b.click(); return 'clicked'; })()`);
const keyEvent = async (type, key, code, vk) => send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
const keyPress = async (key, code, vk) => { await keyEvent("rawKeyDown", key, code, vk); await keyEvent("keyUp", key, code, vk); await sleep(120); };
const mouseMove = async (x, y) => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" });
const mouseDownUp = async (x, y) => {
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await sleep(120);
  return await evalJs(`(() => { const el = document.elementFromPoint(${Math.round(x)}, ${Math.round(y)}); if (!el) return 'NO-EL-UNDER-POINT'; const cs = getComputedStyle(el.closest('button, a') || el); return { transform: cs.transform, tag: el.tagName, cls: (el.closest('button, a') || el).className.toString().slice(0, 40) }; })()`);
};

await evalJs(`localStorage.clear(); 'ok'`);
await nav("#/");

// ide 1: countdown flash + kartu flash (apakah ada logika berakhir?)
await probe("ide1_countdown_habis", async () => {
  await sleep(1300); // biarkan animasi prog-fill (.6s) selesai
  return await evalJs(`(() => {
    const chip = document.querySelector('.count-chip');
    const flashSec = document.querySelector('#katalog');
    const fr = flashSec?.getBoundingClientRect();
    const bars = [...document.querySelectorAll('.progress i')].map((i) => {
      const cs = getComputedStyle(i); const p = i.parentElement.getBoundingClientRect(); const r = i.getBoundingClientRect();
      return { widthPx: Math.round(r.width), parentPx: Math.round(p.width), transform: cs.transform, animationName: cs.animationName };
    });
    const now = new Date(); const end = new Date(); end.setHours(24, 0, 0, 0);
    return { countdownText: chip?.textContent || 'NO-CHIP', flashCards: document.querySelectorAll('#katalog .card').length,
      flashDiBawahFold: fr ? Math.round(fr.top) > window.innerHeight : 'NO-SEC', scrollY: Math.round(window.scrollY),
      msMenujuTengahMalam: Math.round(end - now), bars, adaObserverDiKode: 'cek-grep-manual' };
  })()`);
});

// ide 2: fade tepi kanan chips kategori
await probe("ide2_chips_fade", async () => {
  return await evalJs(`(() => { const c = document.querySelector('.chips'); if (!c) return 'NO-CHIPS';
    const cs = getComputedStyle(c);
    return { scrollWidth: c.scrollWidth, clientWidth: c.clientWidth, bisaScroll: c.scrollWidth > c.clientWidth + 1,
      maskImage: cs.maskImage, webkitMaskImage: cs.webkitMaskImage, maskAda: cs.maskImage !== 'none' || cs.webkitMaskImage !== 'none',
      adaElemenFade: !!c.querySelector('.fade, [class*=fade]'), boxShadow: cs.boxShadow }; })()`);
});

// ide 8: progress bar "Terjual" — lebar sebelum scroll ke viewport
await probe("ide8_progress_viewport", async () => {
  return await evalJs(`(() => {
    const sec = document.querySelector('#katalog'); const sr = sec.getBoundingClientRect();
    const out = [...document.querySelectorAll('.progress i')].map((i) => {
      const cs = getComputedStyle(i); const r = i.getBoundingClientRect(); const p = i.parentElement.getBoundingClientRect();
      return { nama: i.closest('.card').querySelector('div div')?.textContent || '?', widthPx: Math.round(r.width), parentPx: Math.round(p.width),
        rasio: +(r.width / p.width).toFixed(2), transform: cs.transform, animationName: cs.animationName, animationPlayState: cs.animationPlayState };
    });
    const sudahPenuhSebelumTerlihat = out.every((o) => o.rasio >= 0.65);
    return { scrollY: Math.round(window.scrollY), flashTop: Math.round(sr.top), viewportH: window.innerHeight,
      flashTerlihat: sr.top < window.innerHeight, bars: out, sudahPenuhSebelumTerlihat };
  })()`);
});

// ide 4: hover kartu trust (desktop saja)
if (WIDTH >= 1280) {
  await probe("ide4_trust_hover", async () => {
    await evalJs(`document.querySelector('.trust')?.scrollIntoView({ block: 'center' }); 'ok'`);
    await sleep(600);
    const tc = await evalJs(`(() => { const t = document.querySelector('.trust .card'); if (!t) return 'NO-TRUST'; const r = t.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
    const before = await evalJs(`(() => { const t = document.querySelector('.trust .card'); const cs = getComputedStyle(t); return { borderColor: cs.borderColor, boxShadow: cs.boxShadow, transform: cs.transform, transition: cs.transition.slice(0, 90) }; })()`);
    await mouseMove(tc.x, tc.y);
    await sleep(350);
    const during = await evalJs(`(() => { const t = document.querySelector('.trust .card'); const cs = getComputedStyle(t); const hov = t.matches(':hover'); return { hoverMatch: hov, borderColor: cs.borderColor, boxShadow: cs.boxShadow, transform: cs.transform }; })()`);
    // pembanding: kartu game <a class=card> di Beranda
    await nav("#/");
    await evalJs(`document.querySelector('.grid.c4 .card')?.scrollIntoView({ block: 'center' }); 'ok'`);
    await sleep(500);
    const gc = await evalJs(`(() => { const g = document.querySelector('.grid.c4 .card'); const r = g.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
    const gBefore = await evalJs(`(() => { const cs = getComputedStyle(document.querySelector('.grid.c4 .card')); return { borderColor: cs.borderColor }; })()`);
    await mouseMove(gc.x, gc.y);
    await sleep(350);
    const gDuring = await evalJs(`(() => { const g = document.querySelector('.grid.c4 .card'); const cs = getComputedStyle(g); return { hoverMatch: g.matches(':hover'), borderColor: cs.borderColor }; })()`);
    return { trust: { before, during }, gameCard: { before: gBefore, during: gDuring } };
  });
}

// ---- halaman produk MLBB: ide 5, 7, 10, 77, 79, 80, 71, 72 ----
await probe("ide5_stepper_maks10", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  const awal = await evalJs(`(() => ({ qty: document.querySelector('.qty b')?.textContent, plusDisabled: document.querySelector('.qty .plus')?.disabled }))()`);
  for (let i = 0; i < 9; i++) { await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`); await sleep(60); }
  const di10 = await evalJs(`(() => { const plus = document.querySelector('.qty .plus'); const cs = getComputedStyle(plus);
    return { qty: document.querySelector('.qty b')?.textContent, plusDisabled: plus.disabled, plusOpacity: cs.opacity, plusCursor: cs.cursor,
      plusBg: cs.backgroundColor, note: [...document.querySelectorAll('.note')].map((n) => n.textContent).find((t) => /maksimal 10/.test(t)) || 'NO-NOTE',
      qtyAriaLive: document.querySelector('.qty b')?.getAttribute('aria-live') }; })()`);
  // tekan + sekali lagi saat disabled (klik via JS pada tombol disabled = no-op)
  await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`);
  await sleep(200);
  const setelah = await evalJs(`(() => ({ qty: document.querySelector('.qty b')?.textContent, total: document.querySelector('.sum-total b')?.textContent }))()`);
  return { awal, di10, setelahTekanLagi: setelah };
});

await probe("ide7_was_transisi", async () => {
  await nav("#/game/mobile-legends");
  await clickText(".tab", "Weekly Pass");
  await sleep(300);
  await evalJs(`(() => { [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('Weekly Diamond Pass')).click(); return 'ok'; })()`);
  await sleep(300);
  const was = await evalJs(`(() => { const w = document.querySelector('.sum-row .was'); if (!w) return 'NO-WAS-DI-RINGKASAN';
    const cs = getComputedStyle(w); const nomWas = document.querySelector('.nom.on .was');
    const ncs = nomWas ? getComputedStyle(nomWas) : null;
    return { teksRingkasan: w.textContent.trim(), transition: cs.transition, animationName: cs.animationName, opacity: cs.opacity,
      nomWasTransition: ncs?.transition, nomWasAnimation: ncs?.animationName }; })()`);
  // baris diskon (disc-in) setelah promo — pembanding animasi yang memang ada
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai').click(); return 'ok'; })()`);
  await sleep(300);
  const disc = await evalJs(`(() => { const d = document.querySelector('.sum-row.disc'); if (!d) return 'NO-DISC'; const cs = getComputedStyle(d);
    return { text: d.textContent.replace(/\\s+/g, ' ').trim(), animationName: cs.animationName, transition: cs.transition.slice(0, 60) }; })()`);
  return { was, disc };
});

await probe("ide10_pakai_active", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await sleep(200);
  const pos = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); if (!b) return 'NO-BTN'; const r = b.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), disabled: b.disabled }; })()`);
  const idle = await evalJs(`(() => { const b = [...document.querySelectorAll('.step .btn')].find((x) => x.textContent.trim() === 'Pakai'); const cs = getComputedStyle(b); return { transform: cs.transform, transition: cs.transition.slice(0, 90) }; })()`);
  const pressed = await mouseDownUp(pos.x, pos.y);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
  await sleep(300);
  const setelah = await evalJs(`(() => { const m = document.querySelector('.note.good'); return m ? m.textContent.trim() : 'NO-MSG'; })()`);
  return { pos, idle, pressed, setelah };
});

await probe("ide77_fokus_error", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12");
  await sleep(300);
  const a = await evalJs(`(() => ({ activeId: document.activeElement?.id || document.activeElement?.tagName, activeAria: document.activeElement?.getAttribute('aria-label') || '',
    errUid: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()), uidHasErrClass: document.querySelector('#uid')?.classList.contains('err') }))()`);
  await setInput("#uid", "12345678");
  await sleep(300);
  const b = await evalJs(`(() => ({ activeId: document.activeElement?.id || document.activeElement?.tagName,
    errZone: [...document.querySelectorAll('.note.bad')].map((n) => n.textContent.trim()) }))()`);
  return { uidSalah: a, zoneKosong: b };
});

await probe("ide79_focus_visible_nom", async () => {
  await nav("#/game/mobile-legends");
  // Tab keyboard sungguhan dari atas halaman sampai mencapai kartu nominal
  await evalJs(`(() => { document.querySelector('.crumb .back')?.focus(); return 'ok'; })()`);
  let found = null;
  for (let i = 0; i < 40; i++) {
    await keyPress("Tab", "Tab", 9);
    const ae = await evalJs(`(() => { const a = document.activeElement; if (!a) return null;
      return { tag: a.tagName, cls: (a.className?.toString() || '').slice(0, 30), teks: (a.textContent || '').trim().slice(0, 30) }; })()`);
    if (ae && ae.cls.includes("nom") && ae.tag === "BUTTON") {
      const cs = await evalJs(`(() => { const a = document.activeElement; const s = getComputedStyle(a);
        return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, outlineOffset: s.outlineOffset, focusVisibleMatch: a.matches(':focus-visible') }; })()`);
      found = { langkahTab: i + 1, elemen: ae, computed: cs };
      break;
    }
  }
  return found || "TIDAK-MENCAPAI-NOM-DALAM-40-TAB";
});

await probe("ide80_stepper_aria_live", async () => {
  await nav("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  const sebelum = await evalJs(`(() => { const b = document.querySelector('.qty b'); const q = document.querySelector('.qty');
    return { qtyHtml: b?.outerHTML, ariaLiveB: b?.getAttribute('aria-live'), qtyParentAriaLive: q?.getAttribute('aria-live') || '(tidak ada)',
      qtyParentHtml: q?.outerHTML.slice(0, 200) }; })()`);
  await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`);
  await sleep(250);
  const sesudah = await evalJs(`(() => { const b = document.querySelector('.qty b'); return { qty: b?.textContent, ariaLiveB: b?.getAttribute('aria-live'), html: b?.outerHTML }; })()`);
  return { sebelum, sesudah };
});

await probe("ide71_72_markup_harga_meta", async () => {
  await nav("#/game/mobile-legends");
  return await evalJs(`(() => {
    const nom86 = [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('86 Diamonds'));
    const price = nom86?.querySelector('.n-price'); const meta = nom86?.querySelector('.n-meta');
    const badge = [...document.querySelectorAll('.nom')].find((n) => n.textContent.includes('706 Diamonds'))?.querySelector('.badge');
    const flashCard = document.querySelector('#katalog .card');
    return {
      harga86: { html: price?.outerHTML || 'NO-PRICE', ariaLabel: price?.getAttribute('aria-label') || '(tidak ada)', teks: price?.textContent.trim() },
      meta86: { html: meta?.outerHTML || 'NO-META', ariaLabel: meta?.getAttribute('aria-label') || '(tidak ada)', teks: meta?.textContent.trim() },
      badge706: { html: badge?.outerHTML || 'NO-BADGE', ariaLabel: badge?.getAttribute('aria-label') || '(tidak ada)' },
      kartuNominalAria: nom86?.outerHTML.slice(0, 220),
      flashCardTeks: flashCard ? flashCard.innerText.replace(/\\n/g, ' | ') : 'NO-FLASH (bukan di halaman produk)',
      flashBadgeHtml: document.querySelector('#katalog .badge')?.outerHTML || 'NO-BADGE',
    };
  })()`);
});

// ---- alur beli -> Sukses: ide 3, 74, 75 ----
await probe("ide3_toast_salin_ganda", async () => {
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
  if (ref === "NO-ORDER") return { ref };
  await nav("#/sukses/" + ref);
  const salin = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return 'NO-BTN'; b.click(); b.click(); return 'clicked-2x'; })()`);
  await sleep(150);
  const langsung = await evalJs(`(() => ({ toastCount: document.querySelectorAll('.toast').length,
    labelSalin: [...document.querySelectorAll('button')].find((x) => /Disalin|Salin/.test(x.textContent))?.textContent.trim(),
    semuaTombolSalin: [...document.querySelectorAll('button')].filter((x) => /Disalin|Salin/.test(x.textContent)).map((x) => x.textContent.trim()) }))()`);
  await sleep(2200);
  const setelah2detik = await evalJs(`(() => ({ toastCount: document.querySelectorAll('.toast').length,
    labelSalin: [...document.querySelectorAll('button')].find((x) => /Disalin|Salin/.test(x.textContent))?.textContent.trim() }))()`);
  return { ref, salin, langsung, setelah2detik };
});

await probe("ide74_75_sukses_markup", async () => {
  // Seed order PLN (token format sama persis dengan genToken lib.js: 20 digit, spasi tiap 4)
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
    const salinToken = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Salin token'));
    return {
      refHtml: refB?.outerHTML || 'NO-REF', refAriaLabel: refB?.getAttribute('aria-label') || '(tidak ada)',
      refTeks: refB?.textContent, refAdaSpasi: (refB?.textContent || '').includes(' '),
      tokenHtml: tokenBox?.outerHTML || 'NO-TOKEN', tokenAriaLabel: tokenBox?.getAttribute('aria-label') || '(tidak ada)',
      tokenTeks: tokenBox?.textContent.trim(), tokenLabel: document.querySelector('.flabel')?.textContent,
      salinTokenAriaLive: salinToken?.getAttribute('aria-live') || '(tidak ada)',
    };
  })()`);
});

// ide 73: badge flash — dibaca sebagai diskon? (markup: teks tautan kartu flash)
await probe("ide73_badge_flash", async () => {
  await nav("#/");
  return await evalJs(`(() => [...document.querySelectorAll('#katalog .card')].map((c) => {
    const badge = c.querySelector('.badge');
    return { teksTautanLengkap: c.innerText.replace(/\\n/g, ' | '),
      badgeHtml: badge?.outerHTML || 'NO-BADGE', badgeAriaLabel: badge?.getAttribute('aria-label') || '(tidak ada)',
      badgeAriaHidden: badge?.getAttribute('aria-hidden') || '(tidak ada)',
      adaKataDiskon: /diskon/i.test(c.innerText) };
  }))()`);
});

// ide 76: fokus saat hasil Cek muncul
await probe("ide76_fokus_cek", async () => {
  await nav("#/cek");
  await setInput(".step .input", "RSD-DEMO1234");
  await clickText(".step .btn", "Cek");
  await sleep(600);
  return await evalJs(`(() => { const a = document.activeElement;
    const res = document.querySelector('.cek-result');
    return { activeTag: a?.tagName, activeTeks: (a?.textContent || '').trim().slice(0, 20), activeId: a?.id || '',
      hasilMuncul: !!res, hasilTabIndex: res?.getAttribute('tabindex') || '(tidak ada)',
      hasilPunyaFokus: res ? res.contains(document.activeElement) : false }; })()`);
});

// ide 78: Escape membersihkan pencarian Beranda
await probe("ide78_escape_search", async () => {
  await nav("#/");
  await setInput(".searchbar input", "mlbb");
  await sleep(300);
  const sebelum = await evalJs(`(() => ({ nilai: document.querySelector('.searchbar input')?.value,
    kartuGame: document.querySelectorAll('.grid.c4 .card').length }))()`);
  await evalJs(`(() => { document.querySelector('.searchbar input')?.focus(); return 'ok'; })()`);
  await keyPress("Escape", "Escape", 27);
  await sleep(300);
  const sesudah = await evalJs(`(() => ({ nilai: document.querySelector('.searchbar input')?.value,
    kartuGame: document.querySelectorAll('.grid.c4 .card').length, activeTag: document.activeElement?.tagName }))()`);
  return { sebelum, sesudah };
});

// ---- probe resize (PALING AKHIR karena mengubah metrik) ----
if (WIDTH === 390) {
  await probe("ide6_resize_grid", async () => {
    await nav("#/game/mobile-legends");
    const before = await evalJs(`(() => { const grid = document.querySelector('.nom-grid');
      const cs = getComputedStyle(grid); const card = document.querySelector('.nom');
      const ccs = getComputedStyle(card);
      return { kolom: cs.gridTemplateColumns.split(' ').length, kartu: [...document.querySelectorAll('.nom')].slice(0, 4).map((n) => { const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }),
        transisiKartu: ccs.transition.slice(0, 120), transisiGrid: cs.transition.slice(0, 80) }; })()`);
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(900);
    const after = await evalJs(`(() => { const grid = document.querySelector('.nom-grid');
      const cs = getComputedStyle(grid);
      return { kolom: cs.gridTemplateColumns.split(' ').length, kartu: [...document.querySelectorAll('.nom')].slice(0, 4).map((n) => { const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }),
        overflowX: document.documentElement.scrollWidth > window.innerWidth }; })()`);
    return { before, after };
  });
}
if (WIDTH === 1280) {
  await probe("ide9_mobilebar_breakpoint", async () => {
    await nav("#/game/mobile-legends");
    const di1280 = await evalJs(`(() => { const bar = document.querySelector('.mobile-bar'); const cs = getComputedStyle(bar);
      return { display: cs.display, transition: cs.transition.slice(0, 90), animationName: cs.animationName }; })()`);
    await send("Emulation.setDeviceMetricsOverride", { width: 800, height: 900, deviceScaleFactor: 1, mobile: true });
    await sleep(900);
    const di800 = await evalJs(`(() => { const bar = document.querySelector('.mobile-bar'); const cs = getComputedStyle(bar);
      const r = bar.getBoundingClientRect();
      return { display: cs.display, transition: cs.transition.slice(0, 90), animationName: cs.animationName,
        tinggi: Math.round(r.height), top: Math.round(r.top), viewportH: window.innerHeight }; })()`);
    return { di1280, di800 };
  });
}

writeFileSync(`${outDir}/cdp-s445a-${WIDTH}x${HEIGHT}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH, "x", HEIGHT);
try { ws.close(); } catch {}
process.exit(0);
