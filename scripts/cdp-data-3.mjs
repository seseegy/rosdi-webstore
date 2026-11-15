// cdp-data-3.mjs — Tahap 3: verifikasi render Paket Data (10 paket per
// operator, keluarga utama/lokal/malam/unlimited) via CDP terhadap Chrome
// headless lokal + vite preview.
// Penggunaan: node scripts/cdp-data-3.mjs <wsUrl> <width> <baseUrl> <outDir>
// Menulis <outDir>/data-index-<width>.png, data-<id>-<width>.png +
// summary-<width>.json. Navigasi lewat location.assign (pola Siklus 71).
import { writeFileSync, mkdirSync } from "node:fs";
import { OPERATORS, DATA_PACKAGES, rp } from "../src/data.js";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
if (!wsUrl || !widthArg || !baseUrl || !outDir) {
  console.error("usage: cdp-data-3.mjs <wsUrl> <width> <baseUrl> <outDir>");
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

// --- Indeks Paket Data: 7 operator, "10 paket tersedia", "Dari" = termurah ---
await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl + "#/data")})` });
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
await shot(`data-index-${WIDTH}`);
const indexExpected = OPERATORS.map((o) => ({
  name: o.name,
  sub: `${DATA_PACKAGES[o.id].length} paket tersedia`,
  from: "Dari " + rp(Math.min(...DATA_PACKAGES[o.id].map((p) => p.price))),
}));
console.log("INDEX-DATA", JSON.stringify({ rendered: index, expected: indexExpected, ...indexOverflow }));

// --- Tiap halaman paket data: 10 paket, nama + harga + meta cocok data.js ---
const ops = [];
for (const op of OPERATORS) {
  await send("Runtime.evaluate", {
    expression: `location.assign(${JSON.stringify(baseUrl + "#/data/" + op.id)})`,
  });
  await sleep(1500);
  const m = await evalJs(`(() => {
    const noms = [...document.querySelectorAll(".nom")];
    return {
      h1: document.querySelector("h1")?.textContent || null,
      sub: document.querySelector(".crumb p")?.textContent || null,
      nomCount: noms.length,
      nomNames: noms.map((n) => n.querySelector(".n-name")?.textContent || "?"),
      nomPrices: noms.map((n) => n.querySelector(".n-price")?.textContent.trim().replace(/\\s+/g, " ") || "?"),
      nomMetas: noms.map((n) => n.querySelector(".n-meta")?.textContent || "?"),
    };
  })()`);
  // Deteksi operator: nomor prefix operator sendiri harus terdeteksi tanpa
  // mismatch (pola yang sama seperti verifikasi pulsa Tahap 2).
  const ownPhone = op.prefixes[0] + "23456789";
  await evalJs(SET_PHONE_JS(ownPhone));
  await sleep(500);
  const detect = await evalJs(`(() => {
    const notes = [...document.querySelectorAll(".note")].map((n) => n.textContent.trim());
    return { ownPhone: ${JSON.stringify(ownPhone)}, notes };
  })()`);
  const ov = await evalJs(OFFENDERS_JS);
  await shot(`data-${op.id}-${WIDTH}`);
  const expected = DATA_PACKAGES[op.id];
  const row = {
    id: op.id,
    expectedCount: expected.length,
    expectedNames: expected.map((p) => p.name),
    expectedPrices: expected.map((p) => rp(p.price)),
    expectedMetas: expected.map((p) => p.meta),
    ...m, detect, ...ov,
  };
  ops.push(row);
  console.log("OPERATOR", JSON.stringify(row));
}

writeFileSync(`${outDir}/summary-${WIDTH}.json`, JSON.stringify({ width: WIDTH, index: { ...index, expected: indexExpected, ...indexOverflow }, ops }, null, 2));
ws.close();
console.log("DONE");
