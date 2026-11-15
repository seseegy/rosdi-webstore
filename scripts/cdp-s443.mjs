// Probe live s443 (390/1366/360/375): animasi A, validasi C, state D, pencarian E,
// pembayaran F, a11y H, responsif J. Pola cdp-s442.mjs (WebSocket CDP + partial JSONL).
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
const WIDTH = parseInt(widthArg || "390", 10);
mkdirSync(outDir, { recursive: true });
const R = { width: WIDTH };
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
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: WIDTH < 900 });
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => {
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result.value;
  });
const setInput = async (sel, val) => evalJs(`(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return 'NO-EL';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(val)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'set';
})()`);
const _click = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'clicked'; })()`);
const PARTIAL = `${outDir}/cdp-s443-partial-${WIDTH}.jsonl`;
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT-45s:" + label)), ms))]);
const probe = async (key, fn) => {
  try { R[key] = await withTimeout(fn(), 45000, key); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};
const goHash = async (h) => { await evalJs(`location.hash = ${JSON.stringify(h)}; 'ok'`); await sleep(1400); };

// ---------- boot bersih + storage korup (ide 66) ----------
await evalJs(`localStorage.clear(); 'ok'`);
await probe("corrupt_boot", async () => {
  await evalJs(`localStorage.setItem('rosdi_orders', '{{{corrupt'); localStorage.setItem('rosdi_theme', 'not-json{{{'); 'ok'`);
  await evalJs(`location.assign(${JSON.stringify(baseUrl)}); 'ok'`);
  await sleep(2500);
  const r = await evalJs(`(() => ({ rootChildren: document.getElementById('root')?.children.length, hero: !!document.querySelector('.hero h1'), theme: document.documentElement.dataset.theme, orders: (() => { try { return JSON.parse(localStorage.getItem('rosdi_orders')); } catch (e) { return 'PARSE-ERR'; } })() }))()`);
  await evalJs(`localStorage.clear(); location.reload(); 'ok'`);
  await sleep(2000);
  return r;
});

// ---------- Beranda: animasi 1,4,8,9 + pencarian 41-49,39 + heading 71 + ikon 74/78 ----------
await goHash("#/");
await probe("anim_progress", () => evalJs(`(() => {
  const bar = document.querySelector('.progress i');
  if (!bar) return 'NO-EL';
  const cs = getComputedStyle(bar);
  return { width: bar.style.width, transition: cs.transition, transitionDuration: cs.transitionDuration, animationName: cs.animationName };
})()`));
await probe("anim_empty", async () => {
  await setInput(".searchbar input", "zzzqqq");
  await sleep(400);
  return evalJs(`(() => { const e = document.querySelector('.empty'); if (!e) return 'NO-EMPTY'; const cs = getComputedStyle(e); return { text: e.textContent.slice(0, 50), animationName: cs.animationName, transitionDuration: cs.transitionDuration, opacity: cs.opacity }; })()`);
});
await probe("search_queries", async () => {
  const run = async (q) => {
    await setInput(".searchbar input", q);
    await sleep(350);
    return evalJs(`(() => {
      const secs = [...document.querySelectorAll('section.block h2')].map((h) => h.textContent);
      const cards = [...document.querySelectorAll('.grid a.card .p-name')].map((e) => e.textContent);
      const flash = document.querySelectorAll('.grid.c2 .card').length;
      const empty = !!document.querySelector('.empty');
      return { sections: secs, cards, flashCards: flash, empty };
    })()`);
  };
  const out = {};
  for (const q of ["voucher", "game", "promo", "murah", "legends", "bang bang", "prabayar", "pulsa"]) out[q] = await run(q);
  return out;
});
await probe("search_clear_restore", async () => {
  const before = await evalJs(`document.querySelectorAll('.grid a.card').length`);
  await setInput(".searchbar input", "mlbb");
  await sleep(350);
  const mid = await evalJs(`document.querySelectorAll('.grid a.card').length`);
  await setInput(".searchbar input", "");
  await sleep(350);
  const after = await evalJs(`document.querySelectorAll('.grid a.card').length`);
  return { before, mid, after, restored: before === after };
});
await probe("search_back_query", async () => {
  await setInput(".searchbar input", "mlbb");
  await sleep(350);
  await evalJs(`(() => { const c = [...document.querySelectorAll('.grid.c4 a.card')].find((e) => e.textContent.includes('Mobile Legends')); if (c) c.click(); return 'ok'; })()`);
  await sleep(1500);
  const onGame = await evalJs(`location.hash`);
  await evalJs(`history.back(); 'ok'`);
  await sleep(1500);
  return evalJs(`(() => ({ hash: location.hash, query: document.querySelector('.searchbar input')?.value, cards: document.querySelectorAll('.grid a.card').length }))()`).then((r) => ({ ...r, wasOnGame: onGame }));
});
await probe("header_scroll", async () => {
  await evalJs(`window.scrollTo(0, 0); 'ok'`);
  await sleep(300);
  const h0 = await evalJs(`Math.round(document.querySelector('header.site').getBoundingClientRect().height)`);
  await evalJs(`window.scrollTo(0, 2000); 'ok'`);
  await sleep(400);
  const h1 = await evalJs(`Math.round(document.querySelector('header.site').getBoundingClientRect().height)`);
  const sticky = await evalJs(`getComputedStyle(document.querySelector('header.site')).position`);
  return { hTop: h0, hScrolled: h1, position: sticky };
});
await probe("footer_chips_hover", () => evalJs(`(() => {
  const s = document.querySelector('.pay-chips span');
  if (!s) return 'NO-EL';
  const cs = getComputedStyle(s);
  let hoverRule = null;
  for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) { if (r.selectorText && r.selectorText.includes('.pay-chips') && r.selectorText.includes(':hover')) hoverRule = r.cssText; } } catch {} }
  return { transition: cs.transition, hoverRule };
})()`));
await probe("headings_home", () => evalJs(`[...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ':' + h.textContent.trim().slice(0, 30))`));
await probe("icon_contrast", () => evalJs(`(() => {
  const lum = (hex) => { const c = hex.replace('#', ''); const f = (i) => { const v = parseInt(c.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2); };
  const rgb2hex = (rgb) => { const m = rgb.match(/\\d+/g); if (!m) return null; return '#' + m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join(''); };
  const res = {};
  const mag = document.querySelector('.searchbar .mag');
  if (mag) { const cs = getComputedStyle(mag); res.searchIcon = { color: rgb2hex(cs.color), bg: rgb2hex(getComputedStyle(mag.closest('.field')).backgroundColor), ratio: ratio(rgb2hex(cs.color), rgb2hex(getComputedStyle(mag.closest('.field')).backgroundColor)) }; }
  const themeBtn = document.querySelector('.icon-btn');
  if (themeBtn) { const cs = getComputedStyle(themeBtn); res.themeIcon = { color: rgb2hex(cs.color), bg: rgb2hex(cs.backgroundColor), ratio: ratio(rgb2hex(cs.color), rgb2hex(cs.backgroundColor)) }; }
  const guar = document.querySelector('.guarantee');
  if (guar) { const cs = getComputedStyle(guar); res.checkGuarantee = { color: rgb2hex(cs.color), bg: rgb2hex(cs.backgroundColor), ratio: ratio(rgb2hex(cs.color), rgb2hex(cs.backgroundColor)) }; }
  const trustCheck = [...document.querySelectorAll('.trust .ic')].find((e) => e.textContent.trim() === '✓');
  if (trustCheck) { const cs = getComputedStyle(trustCheck); res.trustCheck = { color: rgb2hex(cs.color), bg: rgb2hex(cs.backgroundColor), ratio: ratio(rgb2hex(cs.color), rgb2hex(cs.backgroundColor)), ariaHidden: trustCheck.getAttribute('aria-hidden') }; }
  return res;
})()`));
await probe("reduced_motion", async () => {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await sleep(300);
  const r = await evalJs(`(() => {
    const els = { nom: document.querySelector('.nom') || document.querySelector('.chip'), chip: document.querySelector('.chip'), btn: document.querySelector('.btn'), header: document.querySelector('header.site') };
    const out = {};
    for (const [k, el] of Object.entries(els)) { if (el) { const cs = getComputedStyle(el); out[k] = { transitionDuration: cs.transitionDuration, transitionProperty: cs.transitionProperty }; } }
    out.scrollBehavior = getComputedStyle(document.documentElement).scrollBehavior;
    out.countdown = (() => { const el = document.querySelector('.count-chip'); if (!el) return null; const cs = getComputedStyle(el); return { transitionDuration: cs.transitionDuration, animationName: cs.animationName }; })();
    return out;
  })()`);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  return r;
});

// ---------- Game MLBB: validasi 21,22,30 + state 31-35 + promo 27,28,51,52 ----------
await goHash("#/game/mobile-legends");
await probe("valid_uid_letters", async () => {
  await setInput("#uid", "ABC123");
  await sleep(300);
  return evalJs(`(() => ({ err: document.querySelector('.note.bad')?.textContent || null, errClass: !!document.querySelector('#uid.err'), buyDisabled: document.querySelector('.btn.big')?.disabled }))()`);
});
await probe("valid_empty_buy", async () => {
  await setInput("#uid", "");
  await setInput("#zone", "");
  await sleep(300);
  return evalJs(`(() => ({ note: [...document.querySelectorAll('.summary .note')].map((e) => e.textContent).find((t) => t.includes('lengkapi')) || null, buyDisabled: document.querySelector('.btn.big')?.disabled }))()`);
});
await probe("valid_zone_empty", async () => {
  await setInput("#uid", "12345678");
  await setInput("#zone", "");
  await sleep(300);
  return evalJs(`(() => ({ zoneNote: [...document.querySelectorAll('.note.bad')].map((e) => e.textContent), buyDisabled: document.querySelector('.btn.big')?.disabled }))()`);
});
await probe("promo_case_space", async () => {
  const tryCode = async (code) => {
    await setInput(".step input[aria-label='Kode promo']", code);
    await sleep(200);
    await evalJs(`(() => { const f = document.querySelector('.step form'); f.requestSubmit(); return 'ok'; })()`);
    await sleep(300);
    return evalJs(`document.querySelector('.step .note.good, .step .note.bad')?.textContent || null`);
  };
  const lower = await tryCode("rosdi10");
  const spaced = await tryCode("ROSDI 10");
  return { lower, spaced };
});
await probe("state_tab_switch", async () => {
  // pilih nominal Diamonds idx 7 (172 Diamonds), lalu pindah tab Weekly Pass, kembali
  await evalJs(`(() => { document.querySelectorAll('.nom')[7].click(); return 'ok'; })()`);
  await sleep(200);
  const sel1 = await evalJs(`document.querySelector('.nom.on .n-name')?.textContent`);
  await evalJs(`(() => { [...document.querySelectorAll('.tab')].find((x) => x.textContent.includes('Weekly')).click(); return 'ok'; })()`);
  await sleep(300);
  const weeklyFirst = await evalJs(`document.querySelector('.nom .n-name')?.textContent`);
  await evalJs(`(() => { [...document.querySelectorAll('.tab')].find((x) => x.textContent.includes('Diamonds')).click(); return 'ok'; })()`);
  await sleep(300);
  const back = await evalJs(`document.querySelector('.nom.on .n-name')?.textContent || 'NONE-SELECTED'`);
  return { sel1, weeklyFirst, back };
});
await probe("state_pay_promo_contact", async () => {
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`); // 3 Diamonds Rp1.650
  await sleep(200);
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('GoPay')).click(); return 'ok'; })()`);
  await sleep(200);
  await setInput("#email", "test@email.com");
  await setInput("#wa", "081234567890");
  await sleep(200);
  // terapkan promo
  await setInput(".step input[aria-label='Kode promo']", "ROSDI10");
  await evalJs(`(() => { document.querySelector('.step form').requestSubmit(); return 'ok'; })()`);
  await sleep(300);
  const before = await evalJs(`(() => ({ pay: document.querySelector('.pay.on .p-name2')?.textContent, email: document.querySelector('#email').value, wa: document.querySelector('#wa').value, disc: document.querySelector('.sum-row.disc b')?.textContent || null, total: document.querySelector('.sum-total b')?.textContent }))()`);
  // pindah tab lalu kembali
  await evalJs(`(() => { [...document.querySelectorAll('.tab')].find((x) => x.textContent.includes('Weekly')).click(); return 'ok'; })()`);
  await sleep(300);
  const weekly = await evalJs(`(() => ({ pay: document.querySelector('.pay.on .p-name2')?.textContent, email: document.querySelector('#email').value, disc: document.querySelector('.sum-row.disc b')?.textContent || null, total: document.querySelector('.sum-total b')?.textContent }))()`);
  await evalJs(`(() => { [...document.querySelectorAll('.tab')].find((x) => x.textContent.includes('Diamonds')).click(); return 'ok'; })()`);
  await sleep(300);
  const back = await evalJs(`(() => ({ pay: document.querySelector('.pay.on .p-name2')?.textContent, email: document.querySelector('#email').value, wa: document.querySelector('#wa').value, disc: document.querySelector('.sum-row.disc b')?.textContent || null }))()`);
  return { before, weekly, back };
});
await probe("promo_min_flash", async () => {
  // promo sudah aktif dari probe sebelumnya (ROSDI10) — cek diskon di item termurah Rp1.650
  const cheap = await evalJs(`(() => ({ disc: document.querySelector('.sum-row.disc b')?.textContent || null, total: document.querySelector('.sum-total b')?.textContent, base: document.querySelectorAll('.sum-row b')[1]?.textContent }))()`);
  // pindah ke Weekly Pass (item flash) — promo tetap?
  await evalJs(`(() => { [...document.querySelectorAll('.tab')].find((x) => x.textContent.includes('Weekly')).click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`); // Weekly Diamond Pass Rp27.900 (was 30.900)
  await sleep(300);
  const flash = await evalJs(`(() => ({ disc: document.querySelector('.sum-row.disc b')?.textContent || null, total: document.querySelector('.sum-total b')?.textContent, was: document.querySelector('.nom.on .was')?.textContent || null }))()`);
  return { cheap, flash };
});
await probe("anim_nom_border_badge", async () => {
  const nom = await evalJs(`(() => { const n = document.querySelector('.nom'); const cs = getComputedStyle(n); return { transition: cs.transition, transitionDuration: cs.transitionDuration }; })()`);
  const badge = await evalJs(`(() => { const b = document.querySelector('.nom .badge'); if (!b) return 'NO-BADGE-IN-WEEKLY'; const cs = getComputedStyle(b); return { text: b.textContent, animationName: cs.animationName, transitionDuration: cs.transitionDuration }; })()`);
  return { nom, badge };
});
await probe("headings_game_taborder", async () => {
  const heads = await evalJs(`[...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ':' + h.textContent.trim().slice(0, 30))`);
  // Tab walk dari atas halaman
  await evalJs(`document.activeElement?.blur(); window.scrollTo(0,0); 'ok'`);
  await sleep(200);
  const seq = [];
  for (let i = 0; i < 22; i++) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await sleep(120);
    const a = await evalJs(`(() => { const el = document.activeElement; if (!el || el === document.body) return 'BODY'; const cs = getComputedStyle(el); return { tag: el.tagName, cls: (el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 20), text: (el.textContent || '').trim().slice(0, 28), outline: cs.outlineStyle + ' ' + cs.outlineWidth, aria: el.getAttribute('aria-label') || el.getAttribute('aria-pressed') || '' }; })()`);
    seq.push(a);
    if (a === "BODY") break;
  }
  return { heads, tabSeq: seq };
});
await probe("total_8digit", async () => {
  await goHash("#/game/valorant");
  await setInput("#riot", "PlayerOne#TAG12");
  await sleep(300);
  await evalJs(`(() => { document.querySelectorAll('.nom')[5].click(); return 'ok'; })()`); // 11000 Points Rp1.199.000
  await sleep(200);
  for (let i = 0; i < 9; i++) { await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`); await sleep(60); }
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('Pulsa Telkomsel')).click(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => {
    const mb = document.querySelector('.mobile-bar');
    const r = mb ? mb.getBoundingClientRect() : null;
    const b = mb?.querySelector('b');
    const br = b ? b.getBoundingClientRect() : null;
    const sumB = document.querySelector('.sum-total b');
    return { qty: document.querySelector('.qty b')?.textContent, total: sumB?.textContent, mbTotal: b?.textContent, mbVisible: !!mb && getComputedStyle(mb).display !== 'none', mbRight: r ? Math.round(r.right) : null, totalRight: br ? Math.round(br.right) : null, viewportW: innerWidth, totalScrollW: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > innerWidth };
  })()`);
});

// ---------- Genshin: server dropdown (ide 3) + UID tetap (ide 35) ----------
await goHash("#/game/genshin-impact");
await probe("server_dropdown", async () => {
  await setInput("#uid", "87654321");
  await sleep(200);
  const before = await evalJs(`(() => { const s = document.querySelector('#server'); const cs = getComputedStyle(s); return { appearance: cs.appearance, hasCustomArrow: !!document.querySelector('#server + *'), arrowChar: [...document.querySelectorAll('.step *')].some((e) => e.textContent === '▾'), options: [...s.options].map((o) => o.text) }; })()`);
  await evalJs(`(() => { const s = document.querySelector('#server'); const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; setter.call(s, 'Eropa'); s.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`);
  await sleep(300);
  const after = await evalJs(`(() => ({ server: document.querySelector('#server').value, uid: document.querySelector('#uid').value }))()`);
  return { before, after };
});

// ---------- Pulsa: validasi 23/24 + pulsa-dibayar-pulsa 56 ----------
await goHash("#/pulsa/telkomsel");
await probe("phone_62_plus62", async () => {
  const t = async (num) => {
    await setInput("#hp", num);
    await sleep(300);
    return evalJs(`(() => ({ note: [...document.querySelectorAll('.note')].map((e) => e.textContent).join(' | ').slice(0, 160), buyDisabled: document.querySelector('.btn.big')?.disabled, target: document.querySelector('.sum-row b')?.textContent }))()`);
  };
  const v62 = await t("6281234567890");
  const vPlus = await t("+6281234567890");
  const v08 = await t("081234567890");
  return { v62, vPlus, v08 };
});
await probe("pulsa_pay_pulsa", async () => {
  await setInput("#hp", "081234567890");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[1].click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('Pulsa Telkomsel')).click(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => ({ warn: [...document.querySelectorAll('.note')].map((e) => e.textContent).find((t) => t.includes('pulsa dengan pulsa')) || null, total: document.querySelector('.sum-total b')?.textContent }))()`);
});

// ---------- PLN: validasi 25 + tarif 99 ----------
await goHash("#/pln");
await probe("pln_id_digits", async () => {
  const t = async (num) => {
    await setInput("#idpel", num);
    await sleep(300);
    return evalJs(`(() => ({ note: document.querySelector('.note.bad')?.textContent || null, cekDisabled: [...document.querySelectorAll('.step .btn')].find((b) => b.textContent.includes('Cek'))?.disabled }))()`);
  };
  const v8 = await t("12345678");
  const v13 = await t("1234567890123");
  const v12 = await t("123456789012");
  await evalJs(`(() => { [...document.querySelectorAll('.step .btn')].find((b) => b.textContent.includes('Cek Nama')).click(); return 'ok'; })()`);
  await sleep(300);
  const checked = await evalJs(`(() => ({ good: document.querySelector('.note.good')?.textContent || null, summaryTarget: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent).join(' || ') }))()`);
  return { v8, v13, v12, checked };
});

// ---------- Voucher: validasi 26 + masa berlaku 100 ----------
await goHash("#/voucher/google-play");
await probe("voucher_email_typo_expiry", async () => {
  const t = async (em) => {
    await setInput("#vemail", em);
    await sleep(300);
    return evalJs(`(() => ({ note: document.querySelector('.note.bad')?.textContent || null, buyDisabled: document.querySelector('.btn.big')?.disabled }))()`);
  };
  const typo = await t("nama@gmai.com");
  const comma = await t("nama@email,com");
  const pageText = await evalJs(`(() => ({ expiryMention: /berlaku|kedaluwarsa|kadaluarsa|masa aktif|valid/i.test(document.body.innerText), redeem: [...document.querySelectorAll('.note')].map((e) => e.textContent).join(' | ').slice(0, 300) }))()`);
  return { typo, comma, pageText };
});

// ---------- Beli penuh -> Sukses: toast 7, salin 80, durasi 98, tarif 99 ----------
await probe("buy_flow_success", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[7].click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')).click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
  await sleep(1500);
  return evalJs(`(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent, toast: !!document.querySelector('.toast'), rows: [...document.querySelectorAll('.sum-row')].map((r) => r.textContent).join(' || ') }))()`);
});
await probe("success_copy_toast", async () => {
  const r = await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Salin'); if (!b) return 'NO-SALIN-BTN'; b.click(); return 'clicked'; })()`);
  await sleep(400);
  return evalJs(`(() => ({ click: ${JSON.stringify(r)}, toastEl: !!document.querySelector('.toast'), btnText: [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Disalin'))?.textContent || [...document.querySelectorAll('button')].map((x) => x.textContent.trim()).filter((t) => t === 'Salin' || t.includes('Disalin')), ariaLive: [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Disalin'))?.getAttribute('aria-live') || null, salinAriaLabel: [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Salin' || x.textContent.includes('Disalin'))?.getAttribute('aria-label') || null }))()`);
});

// ---------- Cek: status 75, urutan SR 76, live region 79, heading 71, modal+back 36 ----------
await goHash("#/cek");
await probe("cek_page_a11y", async () => {
  const heads = await evalJs(`[...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ':' + h.textContent.trim().slice(0, 30))`);
  // buka riwayat pertama (order yang baru dibuat ada di daftar)
  const _hist = await evalJs(`(() => { const b = document.querySelector('.step button.sum-row'); if (!b) return 'NO-HISTORY'; b.click(); return 'clicked'; })()`);
  await sleep(1200);
  const res = await evalJs(`(() => {
    const statusEl = [...document.querySelectorAll('b,span,small')].find((e) => e.textContent.trim() === 'Diproses');
    const cs = statusEl ? getComputedStyle(statusEl) : null;
    const tl = document.querySelector('.timeline');
    const order = tl ? [...tl.parentElement.children].map((c) => c.className + ':' + (c.textContent || '').slice(0, 30)) : null;
    return { hist, statusFound: !!statusEl, statusColor: cs ? cs.color : null, statusBg: cs ? cs.backgroundColor : null, statusFontWeight: cs ? cs.fontWeight : null, resultDomOrder: order, liveRegions: [...document.querySelectorAll('[aria-live]')].map((e) => e.tagName + '.' + e.className + '=' + e.getAttribute('aria-live')) };
  })()`);
  return { heads, ...res };
});
await probe("modal_back", async () => {
  await goHash("#/");
  await evalJs(`(() => { [...document.querySelectorAll('footer.site button.flink')].find((b) => b.textContent.includes('Syarat')).click(); return 'ok'; })()`);
  await sleep(400);
  const open = await evalJs(`({ modalOpen: !!document.querySelector('.modal-veil'), hash: location.hash })`);
  await evalJs(`history.back(); 'ok'`);
  await sleep(600);
  const after = await evalJs(`({ modalOpen: !!document.querySelector('.modal-veil'), hash: location.hash, title: document.querySelector('.modal h3')?.textContent || null })`);
  await evalJs(`(() => { const b = document.querySelector('.modal .btn.big'); if (b) b.click(); return 'ok'; })()`);
  await sleep(300);
  return { open, after };
});

// ---------- Buy gagal (saveOrder lempar) — ide 57 ----------
await probe("buy_failure", async () => {
  await goHash("#/game/mobile-legends");
  await setInput("#uid", "12345678");
  await setInput("#zone", "1234");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')).click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { Storage.prototype.setItem = function () { throw new Error('QUOTA'); }; return 'patched'; })()`);
  await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
  await sleep(1200);
  const r = await evalJs(`(() => ({ hash: location.hash, emptyMsg: document.querySelector('.empty')?.textContent?.slice(0, 80) || null, h1: document.querySelector('h1')?.textContent || null }))()`);
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2000);
  return r;
});

// ---------- Tab kedua: storage event 37 + nominal lintas tab 38 ----------
await probe("cross_tab", async () => {
  // buka tab 2 di #/cek (riwayat), lalu buat order di tab utama, cek tab 2 tanpa reload
  const origin = wsUrl.replace(/^ws/, "http").replace(/\/devtools\/page\/.*$/, "");
  const openTab = async (url) => {
    const res = await fetch(origin + "/json/new", { method: "PUT" });
    const tab = await res.json();
    const ws2 = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((res2, rej) => { ws2.onopen = res2; ws2.onerror = () => rej(new Error("TAB2-WS")); });
    let nid = 1; const pend = new Map();
    ws2.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
    const send2 = (method, params = {}) => new Promise((resolve) => { const i = nid++; pend.set(i, resolve); ws2.send(JSON.stringify({ id: i, method, params })); });
    await send2("Page.enable");
    await send2("Page.navigate", { url });
    await sleep(2500);
    const ev2 = (expression) => send2("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
    return { tab, ws2, ev2, close: async () => { try { ws2.close(); } catch {} try { await fetch(origin + "/json/close/" + tab.id); } catch {} } };
  };
  const t2 = await openTab(baseUrl + "#/cek");
  const before = await t2.ev2(`document.querySelectorAll('.step button.sum-row').length`);
  // buat order di tab utama
  await goHash("#/game/free-fire");
  await setInput("#uid", "99887766");
  await sleep(200);
  await evalJs(`(() => { document.querySelectorAll('.nom')[0].click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')).click(); return 'ok'; })()`);
  await sleep(200);
  await evalJs(`(() => { document.querySelector('.btn.big').click(); return 'ok'; })()`);
  await sleep(1500);
  const newRef = await evalJs(`location.hash`);
  const afterNoReload = await t2.ev2(`document.querySelectorAll('.step button.sum-row').length`);
  const afterReload = await t2.ev2(`location.reload(); 'x'`).then(async () => { await sleep(2000); return t2.ev2(`document.querySelectorAll('.step button.sum-row').length`); });
  // nominal lintas tab: tab 2 buka produk yang sama — apakah nominal ikut terpilih?
  const t3 = await openTab(baseUrl + "#/game/free-fire");
  const t3nom = await t3.ev2(`document.querySelector('.nom.on') ? document.querySelector('.nom.on .n-name').textContent : 'NONE-SELECTED'`);
  await t2.close(); await t3.close();
  return { before, afterNoReload, afterReload, newRef, t3nom };
});

// ---------- Responsif per lebar ----------
await probe("responsive", async () => {
  const info = await evalJs(`(() => {
    const out = { w: innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth };
    return out;
  })()`);
  if (WIDTH === 1366) {
    await goHash("#/game/mobile-legends");
    const r = await evalJs(`(() => {
      const flow = document.querySelector('.flow');
      const cs = flow ? getComputedStyle(flow) : null;
      const aside = document.querySelector('.summary');
      const ar = aside ? aside.getBoundingClientRect() : null;
      return { gridTemplate: cs?.gridTemplateColumns, asideW: ar ? Math.round(ar.width) : null, contentW: document.querySelector('.wrap') ? Math.round(document.querySelector('.wrap').getBoundingClientRect().width) : null, sideGap: ar ? Math.round(innerWidth - ar.right) : null };
    })()`);
    return { ...info, ...r };
  }
  if (WIDTH === 375) {
    await goHash("#/game/mobile-legends");
    const r = await evalJs(`(() => {
      const grid = document.querySelector('.nom-grid');
      const cs = grid ? getComputedStyle(grid) : null;
      const noms = [...document.querySelectorAll('.nom')].slice(0, 3).map((n) => { const b = n.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; });
      return { cols: cs?.gridTemplateColumns, noms, overflowX: document.documentElement.scrollWidth > innerWidth };
    })()`);
    return { ...info, ...r };
  }
  if (WIDTH === 360) {
    await goHash("#/cek");
    const cek = await evalJs(`(() => {
      const inp = document.querySelector('.step .input');
      const btn = [...document.querySelectorAll('.step .btn')].find((b) => b.textContent.trim() === 'Cek');
      const ir = inp?.getBoundingClientRect(), br = btn?.getBoundingClientRect();
      return { inputRight: ir ? Math.round(ir.right) : null, btnRight: br ? Math.round(br.right) : null, viewportW: innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth };
    })()`);
    // modal masuk 360
    await evalJs(`(() => { document.querySelector('.header-actions .btn').click(); return 'ok'; })()`);
    await sleep(400);
    const modal = await evalJs(`(() => {
      const m = document.querySelector('.modal');
      if (!m) return 'NO-MODAL';
      const r = m.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), viewportW: innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth };
    })()`);
    return { ...info, cek, modal };
  }
  return info;
});

writeFileSync(`${outDir}/cdp-s443-${WIDTH}.json`, JSON.stringify(R, null, 1));
console.log("SELESAI", WIDTH);
try { ws.close(); } catch {}
process.exit(0);
