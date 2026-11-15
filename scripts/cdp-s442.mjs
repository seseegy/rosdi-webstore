// Probe live s442 (390px): animasi 1-10, paste 19-20, state 21-30, a11y 71-80,
// performa 31-33, 36, 53, 61-63, harga 40, 45, 47-49, 52, 54, 56, 59, responsif 91-96, 100.
import { writeFileSync, mkdirSync } from "node:fs";

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
await send("Network.enable");
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
const click = async (sel) => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NO-EL'; el.click(); return 'clicked'; })()`);
import { appendFileSync } from "node:fs";
const PARTIAL = `${outDir}/cdp-s442-partial.jsonl`;
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT-45s:" + label)), ms))]);
const probe = async (key, fn) => {
  try { R[key] = await withTimeout(fn(), 45000, key); }
  catch (e) { R[key] = { ERROR: String(e).slice(0, 300) }; }
  try { appendFileSync(PARTIAL, JSON.stringify({ key, value: R[key] }) + "\n"); } catch {}
  console.log("PROBE-DONE", key);
};


// Helper tab kedua: buat target, navigasi eksplisit, evaluasi dengan timeout.
// Mengembalikan { ok, value } atau { ok:false, error } — tidak pernah menggantung.
const probeSecondTab = async (wsUrlMain, url, expression) => {
  const origin = wsUrlMain.replace(/^ws/, "http").replace(/\/devtools\/page\/.*$/, "");
  const timeout = (ms, label) => new Promise((_, rej) => setTimeout(() => rej(new Error("TAB2-TIMEOUT:" + label)), ms));
  try {
    const res = await Promise.race([fetch(origin + "/json/new", { method: "PUT" }), timeout(10000, "json-new")]);
    const tab = await res.json();
    const ws2 = new WebSocket(tab.webSocketDebuggerUrl);
    await Promise.race([new Promise((res2, rej) => { ws2.onopen = res2; ws2.onerror = () => rej(new Error("TAB2-WS-ERROR")); }), timeout(10000, "ws-open")]);
    let nid = 1; const pend = new Map();
    ws2.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
    const send2 = (method, params = {}) => new Promise((resolve, reject) => { const i = nid++; pend.set(i, resolve); ws2.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); reject(new Error("TAB2-SEND-TIMEOUT:" + method)); } }, 10000); });
    await send2("Page.enable");
    await send2("Page.navigate", { url });
    await new Promise((r) => setTimeout(r, 2500));
    const r = await Promise.race([send2("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }), timeout(12000, "evaluate")]);
    const value = r.result?.value;
    try { ws2.close(); } catch {}
    try { await fetch(origin + "/json/close/" + tab.id); } catch {}
    return { ok: true, value };
  } catch (e) { return { ok: false, error: String(e).slice(0, 200) }; }
};

// ---------- muat awal + metrik performa (32, 36, 61, 62) ----------
await send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
const t0 = Date.now();
await evalJs(`location.assign(${JSON.stringify(baseUrl)})`);
await sleep(6000); // 3G lambat: beri waktu muat
R.load3g = await evalJs(`(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const lcp = performance.getEntriesByType('largest-contentful-paint');
  const res = performance.getEntriesByType('resource').map((r) => ({ name: r.name.split('/').slice(-1)[0], type: r.initiatorType, size: Math.round(r.transferSize || 0), dur: Math.round(r.duration) }));
  const fonts = [...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.status);
  return {
    wallMs: ${Date.now() - t0},
    domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadEvent: nav ? Math.round(nav.loadEventEnd) : null,
    lcpMs: lcp.length ? Math.round(lcp[lcp.length - 1].startTime) : null,
    lcpEl: lcp.length ? (lcp[lcp.length - 1].element ? lcp[lcp.length - 1].element.tagName + '.' + lcp[lcp.length - 1].element.className : null) : null,
    reqCount: res.length,
    reqTotalKB: Math.round(res.reduce((a, r) => a + r.size, 0) / 1024),
    resources: res,
    fontsLoaded: fonts,
    heroImgRequested: res.some((r) => r.name.includes('hero')),
  };
})()`);
await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

// ---------- Beranda: animasi 2, 5, 6 + a11y 75 + harga 45 ----------
await probe("countdown_anim", () => evalJs(`(() => {
  const el = document.querySelector('.count-chip');
  if (!el) return 'NO-EL';
  const cs = getComputedStyle(el);
  const a = el.textContent;
  return { text: a, animationName: cs.animationName, transitionDuration: cs.transitionDuration, fontVariantNumeric: cs.fontVariantNumeric };
})()`));
await probe("countdown_tick", async () => {
  const a = await evalJs(`document.querySelector('.count-chip')?.textContent`);
  await sleep(2100);
  const b = await evalJs(`document.querySelector('.count-chip')?.textContent`);
  const cs = await evalJs(`(() => { const el = document.querySelector('.count-chip'); const cs = getComputedStyle(el); return { animationName: cs.animationName, transition: cs.transition }; })()`);
  return { before: a, after: b, changed: a !== b, ...cs };
});
await probe("flash_badge_anim", () => evalJs(`(() => {
  const b = document.querySelector('.grid.c2 .badge');
  if (!b) return 'NO-EL';
  const cs = getComputedStyle(b);
  return { text: b.textContent, animationName: cs.animationName, transitionDuration: cs.transitionDuration };
})()`));
await probe("search_live_region", async () => {
  await setInput('.searchbar input', 'mlbb');
  await sleep(400);
  return evalJs(`(() => {
    const live = [...document.querySelectorAll('[aria-live]')].map((e) => e.tagName + '.' + e.className + '="' + e.textContent.slice(0, 60) + '"');
    const cards = document.querySelectorAll('.grid a.card').length;
    const empty = document.querySelector('.empty')?.textContent || null;
    return { liveRegions: live, visibleCards: cards, empty };
  })()`);
});
await probe("chip_filter_anim", async () => {
  const before = await evalJs(`(() => { const g = document.querySelector('.grid.c4') || document.querySelector('.grid'); const cs = g ? getComputedStyle(g) : null; return { transition: cs?.transition, animation: cs?.animationName }; })()`);
  await click('.chips .chip:nth-child(3)'); // Pulsa
  await sleep(300);
  const after = await evalJs(`({ cards: document.querySelectorAll('.grid a.card').length, pulsaVisible: [...document.querySelectorAll('.p-name')].some((e) => e.textContent.includes('Pulsa')) })`);
  return { gridStyle: before, after };
});
await probe("mulai_rp_card", () => evalJs(`(() => {
  const card = [...document.querySelectorAll('.grid.c4 a.card')].find((e) => e.textContent.includes('Mobile Legends'));
  const secHead = document.querySelector('.sec-head .more')?.textContent || null;
  return { cardFrom: card ? card.querySelector('.p-from')?.textContent : null, secHead, feeMentionOnCard: card ? /biaya|fee|belum termasuk/i.test(card.textContent) : null };
})()`));
await probe("theme_icon_anim", async () => {
  const before = await evalJs(`(() => { const b = document.querySelector('.icon-btn'); const cs = getComputedStyle(b); const svg = b.querySelector('svg'); return { btnTransition: cs.transition, svgTransition: getComputedStyle(svg).transition, svgTransform: getComputedStyle(svg).transform, icon: b.getAttribute('aria-label') }; })()`);
  await click('.icon-btn');
  await sleep(300);
  const after = await evalJs(`(() => { const b = document.querySelector('.icon-btn'); const svg = b.querySelector('svg'); return { theme: document.documentElement.dataset.theme, svgTransform: getComputedStyle(svg).transform, svgTransition: getComputedStyle(svg).transition }; })()`);
  await click('.icon-btn'); // kembali light
  await sleep(200);
  return { before, after };
});
await probe("sticky_header", async () => {
  await evalJs(`window.scrollTo(0, 1500); 'ok'`);
  await sleep(300);
  return evalJs(`(() => { const h = document.querySelector('header.site'); const r = h.getBoundingClientRect(); return { top: Math.round(r.top), height: Math.round(r.height), position: getComputedStyle(h).position }; })()`);
});
await probe("footer_short_page", async () => {
  await evalJs(`localStorage.clear(); location.hash = '#/cek'; 'ok'`);
  await sleep(1200);
  return evalJs(`(() => {
    const f = document.querySelector('footer.site');
    const r = f.getBoundingClientRect();
    return { docHeight: document.body.scrollHeight, viewportH: innerHeight, footerTop: Math.round(r.top + scrollY), footerBottom: Math.round(r.bottom + scrollY), gapBelowFooter: Math.round(document.body.scrollHeight - (r.bottom + scrollY)) };
  })()`);
});

// ---------- Halaman produk MLBB: animasi 1, 7, 8 + state + harga ----------
await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
await sleep(1500);
await probe("dom_nodes_game", () => evalJs(`document.querySelectorAll('*').length`));
await probe("tab_switch_anim", async () => {
  const before = await evalJs(`(() => { const g = document.querySelector('.nom-grid'); const cs = getComputedStyle(g); return { transition: cs.transition, animationName: cs.animationName, firstNom: document.querySelector('.nom .n-name')?.textContent }; })()`);
  await evalJs(`(() => { const tabs = [...document.querySelectorAll('.tab')]; const t = tabs.find((x) => x.textContent.includes('Weekly')); t.click(); return 'ok'; })()`);
  await sleep(120);
  const mid = await evalJs(`(() => { const g = document.querySelector('.nom-grid'); return { opacity: getComputedStyle(g).opacity, firstNom: document.querySelector('.nom .n-name')?.textContent }; })()`);
  await sleep(400);
  const after = await evalJs(`document.querySelector('.nom .n-name')?.textContent`);
  return { before, mid120ms: mid, after520ms: after };
});
await probe("price_change_anim", async () => {
  const read = () => evalJs(`[...document.querySelectorAll('.pay .p-price')].map((e) => e.childNodes[0].textContent.trim()).join('|')`);
  const before = await read();
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; noms[7].click(); return 'ok'; })()`); // 172 Diamonds
  await sleep(100);
  const mid = await evalJs(`(() => { const p = document.querySelector('.pay .p-price'); return { transition: getComputedStyle(p).transition, animationName: getComputedStyle(p).animationName }; })()`);
  const after = await read();
  return { before, after, changed: before !== after, payStyle: mid };
});
await probe("focus_ring_transition", async () => {
  await evalJs(`(() => { const b = document.querySelector('.nom'); b.focus(); return 'ok'; })()`);
  await sleep(200);
  return evalJs(`(() => {
    const ae = document.activeElement;
    const cs = getComputedStyle(ae);
    return { active: ae.className, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, outlineWidth: cs.outlineWidth, transition: cs.transition };
  })()`);
});
await probe("paste_uid_space", async () => {
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  await setInput('#uid', '12345678 ');
  await setInput('#zone', '1234');
  await sleep(300);
  return evalJs(`(() => {
    const err = document.querySelector('.note.bad')?.textContent || null;
    const tujuan = [...document.querySelectorAll('.sum-row')].find((e) => e.textContent.startsWith('Tujuan'))?.textContent || null;
    return { err, tujuan };
  })()`);
});
await probe("paste_phone_dash", async () => {
  await evalJs(`location.hash = '#/pulsa/telkomsel'; 'ok'`);
  await sleep(1200);
  await setInput('#hp', '0812-3456-7890');
  await sleep(300);
  return evalJs(`(() => {
    const err = [...document.querySelectorAll('.note.bad')].map((e) => e.textContent);
    const good = document.querySelector('.note.good')?.textContent || null;
    return { err, good };
  })()`);
});
await probe("qty_sync", async () => {
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  await evalJs(`(() => { document.querySelector('.nom').click(); return 'ok'; })()`);
  await sleep(200);
  const b1 = await evalJs(`({ aside: document.querySelector('.sum-total b')?.textContent, bar: document.querySelector('.mb-total b')?.textContent })`);
  await evalJs(`(() => { document.querySelector('.qty .plus').click(); return 'ok'; })()`);
  await sleep(200);
  const b2 = await evalJs(`({ aside: document.querySelector('.sum-total b')?.textContent, bar: document.querySelector('.mb-total b')?.textContent, qty: document.querySelector('.qty b')?.textContent })`);
  return { beforePlus: b1, afterPlus: b2, sync: b2.aside === b2.bar };
});
await probe("method_reset_new_product", async () => {
  await evalJs(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('QRIS')); p.click(); return 'ok'; })()`);
  await sleep(200);
  const sel1 = await evalJs(`document.querySelector('.pay.on .p-name2')?.textContent`);
  await evalJs(`location.hash = '#/game/free-fire'; 'ok'`);
  await sleep(1200);
  const sel2 = await evalJs(`document.querySelector('.pay.on')?.textContent || 'NONE-SELECTED'`);
  const defPay = await evalJs(`document.querySelector('.pay.on') ? 'ada-default' : 'tidak-ada-default'`);
  return { selectedOnMLBB: sel1, selectedOnFF: sel2, defaultPay: defPay };
});
await probe("fee_va_vs_item", async () => {
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; noms[0].click(); return 'ok'; })()`); // 5 Diamonds Rp1.000
  await sleep(200);
  await evalJs(`(() => { const p = [...document.querySelectorAll('.pay')].find((x) => x.textContent.includes('BCA')); p.click(); return 'ok'; })()`);
  await sleep(300);
  return evalJs(`(() => {
    const rows = [...document.querySelectorAll('.sum-row')].map((e) => e.textContent);
    const warn = [...document.querySelectorAll('.note')].some((e) => /lebih besar|melebihi|peringatan|fee/i.test(e.textContent) && /Rp2.500/.test(e.textContent));
    return { rows, feeWarnsFeeBiggerThanItem: warn };
  })()`);
});
await probe("no_large_purchase_warning", async () => {
  await evalJs(`location.hash = '#/pln'; 'ok'`);
  await sleep(1200);
  await setInput('#idpel', '12345678901');
  await click('.step .btn'); // Cek Nama
  await sleep(300);
  await evalJs(`(() => { const noms = [...document.querySelectorAll('.nom')]; noms[noms.length - 1].click(); return 'ok'; })()`); // Token 1.000.000
  await sleep(300);
  return evalJs(`(() => {
    const total = document.querySelector('.sum-total b')?.textContent;
    const warn = [...document.querySelectorAll('.note')].some((e) => /besar|konfirmasi|pastikan|1 juta|peringatan/i.test(e.textContent));
    return { total, anyLargeWarning: warn };
  })()`);
});
await probe("mobile_bar_thumb", () => evalJs(`(() => {
  const bar = document.querySelector('.mobile-bar');
  if (!bar) return 'NO-BAR';
  const r = bar.getBoundingClientRect();
  const btn = bar.querySelector('.btn').getBoundingClientRect();
  return { barBottom: Math.round(r.bottom), viewportH: innerHeight, barHeight: Math.round(r.height), btnH: Math.round(btn.height), btnW: Math.round(btn.width), btnBottom: Math.round(btn.bottom), visible: r.bottom <= innerHeight + 1 };
})()`));
await probe("sticky_mobile_bar", async () => {
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  await evalJs(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
  await sleep(300);
  return evalJs(`(() => { const bar = document.querySelector('.mobile-bar'); const r = bar.getBoundingClientRect(); return { bottom: Math.round(r.bottom), viewportH: innerHeight, sticky: getComputedStyle(bar).position }; })()`);
});
await probe("sr_nom_order", () => evalJs(`(() => {
  const nom = document.querySelector('.nom');
  const kids = [...nom.children].map((c) => c.className + ':' + c.textContent.slice(0, 20));
  const ariaLabel = nom.getAttribute('aria-label');
  const tile = document.querySelector('.crumb .tile');
  return { domOrder: kids, nomAriaLabel: ariaLabel, tileAriaLabel: tile?.getAttribute('aria-label') };
})()`));
await probe("sr_game_initials", () => evalJs(`(() => {
  const tiles = [...document.querySelectorAll('.grid.c4 .tile')].slice(0, 3).map((t) => ({ text: t.textContent, aria: t.getAttribute('aria-label') }));
  return tiles;
})()`));

// ---------- Modal: animasi 3, trap 76, fokus kembali 77, viewport pendek 92 ----------
await probe("modal_close_anim", async () => {
  await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.textContent.includes('Syarat')); b.click(); return 'ok'; })()`);
  await sleep(400);
  const open = await evalJs(`!!document.querySelector('.modal-veil')`);
  const style = await evalJs(`(() => { const m = document.querySelector('.modal'); const v = document.querySelector('.modal-veil'); return m ? { modalTransition: getComputedStyle(m).transition, modalAnimation: getComputedStyle(m).animationName, veilTransition: getComputedStyle(v).transition } : 'NO-MODAL'; })()`);
  await evalJs(`(() => { const b = [...document.querySelectorAll('.modal .btn')].find((x) => x.textContent === 'Tutup'); b.click(); return 'ok'; })()`);
  const t50 = await evalJs(`!!document.querySelector('.modal-veil')`);
  await sleep(50);
  const t50b = await evalJs(`!!document.querySelector('.modal-veil')`);
  await sleep(300);
  const t350 = await evalJs(`!!document.querySelector('.modal-veil')`);
  return { open, style, immediatelyAfterClick: t50, after50ms: t50b, after350ms: t350 };
});
await probe("modal_keyboard_trap", async () => {
  await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.textContent.includes('Syarat')); b.click(); return 'ok'; })()`);
  await sleep(300);
  const seq = [];
  for (let i = 0; i < 8; i++) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await sleep(120);
    seq.push(await evalJs(`(() => { const ae = document.activeElement; return ae ? (ae.tagName + '.' + (ae.className || '') + ':' + (ae.textContent || '').slice(0, 20)) : 'BODY'; })()`));
  }
  const escaped = await evalJs(`(() => { const ae = document.activeElement; const modal = document.querySelector('.modal'); return modal ? !modal.contains(ae) : 'NO-MODAL'; })()`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(300);
  return { tabSequence: seq, focusEscapedModal: escaped };
});
await probe("modal_focus_return", async () => {
  const trigger = await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.textContent.includes('Syarat')); b.focus(); return b.textContent; })()`);
  await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.textContent.includes('Syarat')); b.click(); return 'ok'; })()`);
  await sleep(300);
  await evalJs(`(() => { document.querySelector('.modal .btn').click(); return 'ok'; })()`);
  await sleep(300);
  const back = await evalJs(`(() => { const ae = document.activeElement; return ae ? ae.tagName + ':' + (ae.textContent || '').slice(0, 30) : 'BODY'; })()`);
  return { trigger, focusAfterClose: back };
});
await probe("modal_short_viewport", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 500, deviceScaleFactor: 1, mobile: true });
  await sleep(400);
  await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.textContent.includes('Syarat')); b.click(); return 'ok'; })()`);
  await sleep(400);
  const r = await evalJs(`(() => {
    const m = document.querySelector('.modal');
    const btn = [...document.querySelectorAll('.modal .btn')].find((x) => x.textContent === 'Tutup');
    const mr = m.getBoundingClientRect(), br = btn.getBoundingClientRect();
    return { modalH: Math.round(mr.height), modalTop: Math.round(mr.top), modalBottom: Math.round(mr.bottom), viewportH: innerHeight, btnBottom: Math.round(br.bottom), btnVisible: br.bottom <= innerHeight && br.top >= 0, modalScrollable: m.scrollHeight > m.clientHeight, veilScroll: getComputedStyle(document.querySelector('.modal-veil')).overflow };
  })()`);
  await evalJs(`(() => { document.querySelector('.modal .btn').click(); return 'ok'; })()`);
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: true });
  return r;
});

// ---------- Sukses timeline (4) + Cek detail vs riwayat (28) + order snapshot (21) ----------
await probe("success_timeline", async () => {
  await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-S442TEST', product: 'Mobile Legends', item: '172 Diamonds', qty: 1, target: '12345678 (1234)', base: 43500, fee: 0, disc: 0, total: 43500, method: 'QRIS', time: Date.now(), status: 'Diproses', email: '', wa: '', token: null }])); location.hash = '#/sukses/RSD-S442TEST'; 'ok'`);
  await sleep(1200);
  return evalJs(`(() => {
    const rows = [...document.querySelectorAll('.sum-row')].map((e) => e.textContent);
    return { rows, hasTimeline: !!document.querySelector('.timeline'), timelineNote: 'Sukses tidak memakai .timeline (hanya Cek) — status tampil sebagai teks' };
  })()`);
});
await probe("cek_detail_vs_history", async () => {
  await evalJs(`location.hash = '#/cek'; 'ok'`);
  await sleep(1200);
  await setInput('.step .input', 'RSD-S442TEST');
  await click('.step .btn');
  await sleep(500);
  const detail = await evalJs(`(() => {
    const card = document.querySelector('.step');
    return { text: card.textContent.replace(/\\s+/g, ' ').slice(0, 500), hasTimeline: !!document.querySelector('.timeline'), timelineItems: [...document.querySelectorAll('.timeline li')].map((li) => li.className + ':' + li.textContent.replace(/\\s+/g, ' ').slice(0, 50)) };
  })()`);
  await evalJs(`(() => { const row = [...document.querySelectorAll('.step button.sum-row')][0]; row.click(); return 'ok'; })()`);
  await sleep(1200);
  const sukses = await evalJs(`(() => {
    const rows = [...document.querySelectorAll('.sum-row')].map((e) => e.textContent);
    return { rows, hasTimeline: !!document.querySelector('.timeline') };
  })()`);
  return { cekDetail: detail, suksesViaHistory: sukses };
});
await probe("cek_old_schema", async () => {
  await evalJs(`localStorage.setItem('rosdi_orders', JSON.stringify([{ ref: 'RSD-OLD001', product: 'Mobile Legends', item: '86 Diamonds' }])); location.hash = '#/cek'; 'ok'`);
  await sleep(1200);
  const r = await evalJs(`(() => {
    const rows = [...document.querySelectorAll('.step button.sum-row')].map((e) => e.textContent);
    return { historyRows: rows, crashed: !document.querySelector('#root')?.children.length };
  })()`);
  await evalJs(`(() => { const row = document.querySelector('.step button.sum-row'); if (row) row.click(); return 'ok'; })()`);
  await sleep(1000);
  const s = await evalJs(`(() => ({ suksesText: document.body.innerText.slice(0, 400), hasNaN: /NaN|undefined/.test(document.body.innerText) })()`);
  await evalJs(`localStorage.clear(); 'ok'`);
  return { history: r, sukses: s };
});
await probe("route_case_live", async () => {
  await evalJs(`location.hash = '#/GAME/MLBB'; 'ok'`);
  await sleep(900);
  const a = await evalJs(`({ h1: document.querySelector('h1')?.textContent, hash: location.hash })`);
  await evalJs(`location.hash = '#/xyz'; 'ok'`);
  await sleep(900);
  const b = await evalJs(`({ h1: document.querySelector('h1')?.textContent, is404: /tidak ditemukan|404/i.test(document.body.innerText), hash: location.hash })`);
  await evalJs(`location.hash = '#/CEK'; 'ok'`);
  await sleep(900);
  const c = await evalJs(`({ h1: document.querySelector('h1')?.textContent, hash: location.hash })`);
  return { GAME_MLBB: a, xyz: b, CEK: c };
});
await probe("scroll_restoration", async () => {
  await evalJs(`location.hash = '#/'; 'ok'`);
  await sleep(1200);
  await evalJs(`window.scrollTo(0, 1200); 'ok'`);
  await sleep(200);
  const y1 = await evalJs(`Math.round(scrollY)`);
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  await evalJs(`history.back(); 'ok'`);
  await sleep(900);
  const y2 = await evalJs(`({ y: Math.round(scrollY), hash: location.hash })`);
  return { scrolledTo: y1, afterBack: y2 };
});
await probe("deep_link_back", async () => {
  await evalJs(`location.assign(${JSON.stringify(baseUrl)} + '#/game/mobile-legends'); 'ok'`);
  await sleep(1500);
  return evalJs(`({ historyLength: history.length, hash: location.hash })`);
});
await probe("promo_two_tabs", async () => {
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1200);
  await evalJs(`(() => { document.querySelector('.nom').click(); return 'ok'; })()`);
  await sleep(200);
  await setInput('.step input[aria-label="Kode promo"]', 'ROSDI10');
  await evalJs(`(() => { const f = document.querySelector('.step form'); f.requestSubmit(); return 'ok'; })()`);
  await sleep(400);
  const r = await evalJs(`(() => {
    const msg = document.querySelector('.note.good')?.textContent || null;
    const keys = Object.keys(localStorage);
    const disc = [...document.querySelectorAll('.sum-row.disc')].map((e) => e.textContent);
    return { msg, localStorageKeys: keys, discRow: disc };
  })()`);
  // tab kedua via /json/new + Page.navigate eksplisit (param url /json/new tidak menavigasi di Chrome ini)
  const tab2 = await probeSecondTab(wsUrl, baseUrl + "#/game/mobile-legends",
    "new Promise(r => setTimeout(() => r({ disc: !!document.querySelector('.sum-row.disc'), promoKeys: Object.keys(localStorage).filter(k => /promo/i.test(k)) }), 1500))");
  return { tab1: r, tab2 };
});
await probe("uid_two_tabs", async () => {
  await evalJs(`location.hash = '#/game/mobile-legends'; 'ok'`);
  await sleep(1000);
  await setInput('#uid', '11111111');
  await sleep(300);
  const tab2 = await probeSecondTab(wsUrl, baseUrl + "#/game/mobile-legends",
    "new Promise(r => setTimeout(() => r(document.querySelector('#uid')?.value || 'EMPTY'), 1500))");
  const tab1uid = await evalJs(`document.querySelector('#uid')?.value`);
  return { tab1uid, tab2 };
});
await probe("refresh_modal_sk", async () => {
  await evalJs(`(() => { const b = [...document.querySelectorAll('footer.site button.flink')].find((x) => x.textContent.includes('Syarat')); b.click(); return 'ok'; })()`);
  await sleep(400);
  const openBefore = await evalJs(`!!document.querySelector('.modal-veil')`);
  await evalJs(`location.reload(); 'ok'`);
  await sleep(2500);
  const after = await evalJs(`({ veil: !!document.querySelector('.modal-veil'), overflow: document.documentElement.style.overflow })`);
  return { openBefore, afterReload: after };
});
await probe("contrast_live", () => evalJs(`(() => {
  const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : 'NO-EL'; };
  return {
    badgeColor: cs('.badge', 'color'), badgeBg: cs('.badge', 'backgroundColor'),
    wasColor: cs('.was', 'color'),
    copyrightColor: cs('.copyright', 'color'),
    statusTagColor: cs('.status-tag', 'color'),
    focusOutline: (() => { const b = document.querySelector('.chip'); b.focus(); const c = getComputedStyle(b); return { outline: c.outlineColor, theme: document.documentElement.dataset.theme }; })(),
  };
})()`));
await probe("contrast_live_dark", async () => {
  await click('.icon-btn');
  await sleep(400);
  const r = await evalJs(`(() => {
    const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : 'NO-EL'; };
    return { badgeColor: cs('.badge', 'color'), badgeBg: cs('.badge', 'backgroundColor'), wasColor: cs('.was', 'color'), copyrightColor: cs('.copyright', 'color'), theme: document.documentElement.dataset.theme };
  })()`);
  await click('.icon-btn');
  await sleep(200);
  return r;
});
await probe("game_explainer", () => evalJs(`(() => {
  const txt = document.body.innerText;
  return { mentionsMasukKeAkunGame: /masuk ke akun game/i.test(txt), mentionsTidakBisaDipindah: /tidak bisa dipindah|tidak dapat dipindah/i.test(txt), caraTopUpStep3: [...document.querySelectorAll('#cara-topup .p-sub')].map((e) => e.textContent)[2] || null };
})()`));

writeFileSync(`${outDir}/cdp-s442.json`, JSON.stringify(R, null, 1));
console.log("SELESAI — keys:", Object.keys(R).length);
