// cdp-pulsa-2.mjs — Tahap 2: verifikasi render Pulsa (operator by.U,
// tab Reguler/Transfer, nominal dilebarkan ke 11) via CDP terhadap Chrome
// headless lokal + vite preview.
// Penggunaan: node scripts/cdp-pulsa-2.mjs <wsUrl> <width> <baseUrl> <outDir>
// Menulis <outDir>/pulsa-index-<width>.png, pulsa-<id>-<width>.png +
// summary-<width>.json. Navigasi lewat location.assign (pola Siklus 71).
import { writeFileSync, mkdirSync } from "node:fs";
import { OPERATORS } from "../src/data.js";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
if (!wsUrl || !widthArg || !baseUrl || !outDir) {
  console.error("usage: cdp-pulsa-2.mjs <wsUrl> <width> <baseUrl> <outDir>");
  process.exit(2);
}
const WIDTH = +widthArg;
mkdirSync(outDir, { recursive: true });

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
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: true,
});
const evalJs = (expression) =>
  send("Runtime.evaluate", { expression, returnByValue: true }).then((r) => r.result.value);
const shot = async (name) => {
  const s = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(s.data, "base64"));
};

// Peluber di luar .chips (chip kategori = scroll horizontal yang disengaja,
// sudah dikenal sejak Siklus 11 — bukan cacat).
const OFFENDERS_JS = `(() => {
  const vw = window.innerWidth;
  const bad = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5) && !el.closest(".chips")) {
      bad.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined ? "" : el.className || "").toString().slice(0, 30),
        text: (el.textContent || "").trim().slice(0, 40),
        left: Math.round(r.left), right: Math.round(r.right),
      });
    }
  });
  return { vw, scrollWidth: document.documentElement.scrollWidth, offenders: bad.slice(0, 20), offenderCount: bad.length };
})()`;

// Isi input HP seperti pengguna mengetik (setter native + event input agar
// state React ikut berubah).
const SET_PHONE_JS = (phone) => `(() => {
  const el = document.querySelector("#hp");
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set;
  setter.call(el, ${JSON.stringify(phone)});
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`;

// --- Indeks Pulsa ---
await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl + "#/pulsa")})` });
await sleep(2000);
const index = await evalJs(`(() => {
  const cards = [...document.querySelectorAll(".grid.c3 a.card")];
  return {
    h1: document.querySelector("h1")?.textContent || null,
    cards: cards.map((c) => ({
      name: c.querySelector(".p-name")?.textContent || "?",
      sub: c.querySelector(".p-sub")?.textContent || "?",
      from: c.querySelector(".p-from")?.textContent || "?",
    })),
  };
})()`);
const indexOverflow = await evalJs(OFFENDERS_JS);
await shot(`pulsa-index-${WIDTH}`);
console.log("INDEX-PULSA", JSON.stringify({ ...index, ...indexOverflow }));

// --- Indeks Paket Data (by.U harus muncul karena kini punya paket) ---
await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl + "#/data")})` });
await sleep(1500);
const dataIndex = await evalJs(`(() => {
  const cards = [...document.querySelectorAll(".grid.c3 a.card")];
  return { cards: cards.map((c) => c.querySelector(".p-name")?.textContent || "?") };
})()`);
console.log("INDEX-DATA", JSON.stringify(dataIndex));
await shot(`data-index-${WIDTH}`);

// --- Tiap halaman pulsa ---
const ops = [];
for (const op of OPERATORS) {
  await send("Runtime.evaluate", {
    expression: `location.assign(${JSON.stringify(baseUrl + "#/pulsa/" + op.id)})`,
  });
  await sleep(1500);
  const m = await evalJs(`(() => {
    const tabs = [...document.querySelectorAll(".tabs button")].map((b) => b.textContent.trim());
    const sub = document.querySelector(".crumb p")?.textContent || null;
    return { h1: document.querySelector("h1")?.textContent || null, sub, tabs };
  })()`);
  const perTab = [];
  const tabCount = Math.max(m.tabs.length, 1);
  for (let i = 0; i < tabCount; i++) {
    if (m.tabs.length > 0) {
      await evalJs(`(() => { [...document.querySelectorAll(".tabs button")][${i}].click(); return true; })()`);
      await sleep(400);
    }
    const c = await evalJs(`(() => {
      const noms = [...document.querySelectorAll(".nom")];
      return {
        nomCount: noms.length,
        nomNames: noms.map((n) => n.querySelector(".n-name")?.textContent || "?"),
        nomPrices: noms.map((n) => n.querySelector(".n-price")?.textContent.trim().replace(/\\s+/g, " ") || "?"),
        nomMetas: [...new Set(noms.map((n) => n.querySelector(".n-meta")?.textContent || ""))],
      };
    })()`);
    perTab.push({ tab: m.tabs[i] || "Reguler", ...c });
  }
  // Deteksi operator: nomor prefix operator sendiri harus terdeteksi tanpa
  // mismatch; untuk by.U, nomor Telkomsel harus memicu mismatch ke Telkomsel.
  const ownPhone = op.prefixes[0] + "23456789";
  await evalJs(SET_PHONE_JS(ownPhone));
  await sleep(500);
  const detect = await evalJs(`(() => {
    const notes = [...document.querySelectorAll(".note")].map((n) => n.textContent.trim());
    return { ownPhone: ${JSON.stringify(ownPhone)}, notes };
  })()`);
  let mismatch = null;
  if (op.id === "byu") {
    await evalJs(SET_PHONE_JS("081234567890"));
    await sleep(500);
    mismatch = await evalJs(`(() => {
      const notes = [...document.querySelectorAll(".note")].map((n) => n.textContent.trim());
      return { phone: "081234567890", notes };
    })()`);
  }
  const ov = await evalJs(OFFENDERS_JS);
  await shot(`pulsa-${op.id}-${WIDTH}`);
  const row = {
    id: op.id,
    expectedTabs: op.transfer ? ["Reguler", "Transfer"] : [],
    expectedReguler: op.pulsa.length,
    expectedTransfer: op.transfer ? op.transfer.length : 0,
    ...m, perTab, detect, mismatch, ...ov,
  };
  ops.push(row);
  console.log("OPERATOR", JSON.stringify(row));
}

// --- Pencarian Beranda "byu" harus menampilkan kartu Pulsa ---
await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl)})` });
await sleep(2000);
await evalJs(`(() => {
  const el = document.querySelector(".searchbar input");
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set;
  setter.call(el, "byu");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await sleep(600);
const search = await evalJs(`(() => {
  const names = [...document.querySelectorAll(".grid.c3 a.card .p-name, .grid.c4 a.card .p-name")].map((n) => n.textContent);
  const empty = document.querySelector(".empty")?.textContent || null;
  return { names, empty };
})()`);
console.log("SEARCH-byu", JSON.stringify(search));
await shot(`home-search-byu-${WIDTH}`);

writeFileSync(`${outDir}/summary-${WIDTH}.json`, JSON.stringify({ width: WIDTH, index: { ...index, ...indexOverflow }, dataIndex, ops, search }, null, 2));
ws.close();
console.log("DONE");
