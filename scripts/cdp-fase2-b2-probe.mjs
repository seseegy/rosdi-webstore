// Probe B2 — roving tabindex + pintasan keyboard (CDP mentah, pola sama
// dengan scripts/cdp-fase2-probe.mjs). Tombol dikirim via
// Input.dispatchKeyEvent (event tepercaya), bukan KeyboardEvent sintetis.
// Uji: (1) chip kategori Beranda; (2) Enter di kolom cari; (3) "/" & Ctrl+K;
// (4) tab game + grid nominal; (5) metode bayar; (6) riwayat Cek.
// Pakai: bash scripts/cdp-launch-isolated.sh /tmp/cdp-fase2b2-prof dist 4798 9298 scripts/cdp-fase2-b2-probe.mjs hidden_files/cdp-fase2-b2 390
import { mkdirSync } from "node:fs";
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
await send("Page.enable"); await send("Runtime.enable");
const evalJs = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => { if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; });
const setMetrics = async (w, h = 844) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 }); await sleep(400); };
const nav = async (hash) => { await evalJs(`location.assign(${JSON.stringify(baseUrl + hash)}); 'ok'`); await sleep(1500); };

const keyMap = {
  ArrowRight: { code: "ArrowRight", vk: 39 }, ArrowLeft: { code: "ArrowLeft", vk: 37 },
  ArrowDown: { code: "ArrowDown", vk: 40 }, ArrowUp: { code: "ArrowUp", vk: 38 },
  Enter: { code: "Enter", vk: 13 }, Home: { code: "Home", vk: 36 }, End: { code: "End", vk: 35 },
  "/": { code: "Slash", vk: 191 }, k: { code: "KeyK", vk: 75 },
};
const press = async (key, modifiers = 0) => {
  const m = keyMap[key];
  const p = { type: "keyDown", key, code: m.code, windowsVirtualKeyCode: m.vk, nativeVirtualKeyCode: m.vk, modifiers };
  if (key === "Enter") p.text = "\r";
  await send("Input.dispatchKeyEvent", p);
  // Jeda singkat: keyDown+keyUp tanpa jeda membuat aktivasi Enter pada
  // <button> kadang tidak jalan di Chrome headless (terbukti di debug).
  await sleep(100);
  await send("Input.dispatchKeyEvent", { ...p, type: "keyUp" });
  await sleep(150);
};
const focusDesc = () => evalJs(`(() => { const a = document.activeElement; return a ? (a.textContent || "").trim().slice(0, 40) + " [" + (a.className || "").toString().slice(0, 30) + "] tab=" + a.tabIndex : "null"; })()`);

await setMetrics(390);
await nav("#/");

// --- (1) chip kategori: satu Tab stop, ArrowRight pindah + seleksi ikut ---
rec("B2-chips", await evalJs(`(() => {
  const chips = Array.from(document.querySelectorAll(".chips .chip"));
  return { count: chips.length, tabStops: chips.filter((c) => c.tabIndex === 0).length };
})()`));
await evalJs(`document.querySelector(".chips .chip").focus(); 'ok'`);
await press("ArrowRight");
rec("B2-chip-arrow", { focus: await focusDesc(), pressed: await evalJs(`document.querySelector(".chips .chip.on")?.textContent || null`) });
await press("End");
rec("B2-chip-end", { focus: await focusDesc() });
await press("Home");
rec("B2-chip-home", { focus: await focusDesc() });

// --- (2) Enter di kolom cari -> fokus hasil pertama ---
await evalJs(`(() => {
  const i = document.querySelector(".searchbar input");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(i, "mlbb");
  i.dispatchEvent(new Event("input", { bubbles: true }));
  i.focus();
  return 'ok';
})()`);
await sleep(200);
await press("Enter");
rec("B2-search-enter", { focus: await focusDesc() });

// --- (3) "/" dan Ctrl+K fokus ke kolom cari ---
await evalJs(`document.body.focus(); 'ok'`);
await press("/");
rec("B2-slash", { focusInSearch: await evalJs(`document.activeElement === document.querySelector(".searchbar input")`) });
await evalJs(`document.body.focus(); 'ok'`);
await press("k", 2);
rec("B2-ctrlk", { focusInSearch: await evalJs(`document.activeElement === document.querySelector(".searchbar input")`) });

// --- (4) game: tab + grid nominal ---
await nav("#/game/mobile-legends");
rec("B2-game-stops", await evalJs(`(() => ({
  tabStopsTabs: Array.from(document.querySelectorAll(".tabs .tab")).filter((c) => c.tabIndex === 0).length,
  tabStopsNom: Array.from(document.querySelectorAll(".nom-grid .nom")).filter((c) => c.tabIndex === 0).length,
  cols: getComputedStyle(document.querySelector(".nom-grid")).gridTemplateColumns.split(" ").length,
}))()`));
await evalJs(`document.querySelector(".tabs .tab").focus(); 'ok'`);
await press("ArrowRight");
rec("B2-game-tab-arrow", { focus: await focusDesc(), title: await evalJs(`document.querySelector(".game-title")?.textContent || null`) });
await evalJs(`document.querySelector(".nom-grid .nom").focus(); 'ok'`);
await press("ArrowDown");
const nomDown = await evalJs(`Array.from(document.querySelectorAll(".nom-grid .nom")).indexOf(document.activeElement)`);
await press("End");
const nomEnd = await evalJs(`Array.from(document.querySelectorAll(".nom-grid .nom")).indexOf(document.activeElement)`);
await press("Enter");
const nomSelected = await evalJs(`document.querySelector(".nom-grid .nom.on")?.textContent?.trim().slice(0, 30) || null`);
rec("B2-nom-grid", { nomDown, nomEnd, nomSelected });

// --- (5) metode bayar: ArrowDown lintas grup, lewati yang nonaktif ---
rec("B2-pay-count", await evalJs(`(() => ({
  payCount: document.querySelectorAll(".pay").length,
  payDisabled: Array.from(document.querySelectorAll(".pay")).filter((p) => p.disabled).length,
  payTabStops: Array.from(document.querySelectorAll(".pay")).filter((p) => p.tabIndex === 0).length,
}))()`));
await evalJs(`(() => { const b = document.querySelectorAll(".pay"); if (b[0]) b[0].focus(); return 'ok'; })()`);
await press("ArrowDown");
const payAfter1 = await evalJs(`Array.from(document.querySelectorAll(".pay")).indexOf(document.activeElement)`);
await press("ArrowDown");
const payAfter2 = await evalJs(`Array.from(document.querySelectorAll(".pay")).indexOf(document.activeElement)`);
rec("B2-pay-arrow", { payAfter1, payAfter2 });

// --- (6) riwayat Cek: ArrowDown antar baris ---
await evalJs(`(() => {
  const o = { ref: "RSD-TEST1", date: "13 Nov 2026", time: "10:00", title: "Mobile Legends", item: "3 Diamond", price: 1650, total: 1650, method: "QRIS", status: "Sukses", kind: "game", icon: "mlbb" };
  localStorage.setItem("rosdi_orders", JSON.stringify([o, { ...o, ref: "RSD-TEST2" }, { ...o, ref: "RSD-TEST3" }]));
  return 'ok';
})()`);
await nav("#/cek");
rec("B2-history-stops", await evalJs(`(() => ({
  rows: document.querySelectorAll(".hist-in .sum-row").length,
  tabStops: Array.from(document.querySelectorAll(".hist-in .sum-row")).filter((c) => c.tabIndex === 0).length,
}))()`));
await evalJs(`document.querySelector(".hist-in .sum-row").focus(); 'ok'`);
await press("ArrowDown");
rec("B2-history-arrow", { idx: await evalJs(`Array.from(document.querySelectorAll(".hist-in .sum-row")).indexOf(document.activeElement)`) });

console.log("SELESAI");
process.exit(0);
