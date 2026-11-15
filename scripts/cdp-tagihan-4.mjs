// cdp-tagihan-4.mjs — Tahap 4: verifikasi render Tagihan Pascabayar
// (7 kategori, cek tagihan → rincian → pilih → bayar → sukses) via CDP
// terhadap Chrome headless lokal + vite preview.
// Penggunaan: node scripts/cdp-tagihan-4.mjs <wsUrl> <width> <baseUrl> <outDir>
// Menulis <outDir>/tagihan-index-<width>.png, tagihan-<id>-<width>.png,
// sukses-pln-pascabayar-<width>.png + summary-<width>.json. Navigasi lewat
// location.assign (pola Siklus 71).
import { writeFileSync, mkdirSync } from "node:fs";
import { BILLS, BILL_ADMIN, billItem, maskName, rp, ALL_PAYMENTS, calcTotals } from "../src/data.js";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
if (!wsUrl || !widthArg || !baseUrl || !outDir) {
  console.error("usage: cdp-tagihan-4.mjs <wsUrl> <width> <baseUrl> <outDir>");
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

// Isi input seperti pengguna mengetik (setter native + event input agar
// state React ikut berubah).
const SET_INPUT_JS = (sel, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`;
const CLICK_BY_TEXT_JS = (text) => `(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === ${JSON.stringify(text)});
  if (!b || b.disabled) return b ? "disabled" : "missing";
  b.click();
  return "clicked";
})()`;

// --- Indeks Tagihan: 7 kategori, sub + "Dari" = tagihan contoh + admin ---
await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl + "#/tagihan")})` });
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
await shot(`tagihan-index-${WIDTH}`);
const indexExpected = BILLS.map((b) => ({
  name: b.name,
  sub: b.sub,
  from: "Dari " + rp(billItem(b).price),
}));
console.log("INDEX-TAGIHAN", JSON.stringify({ rendered: index, expected: indexExpected, ...indexOverflow }));

// --- Tiap halaman tagihan: cek tagihan → rincian → 1 item → 13 metode → beli → sukses ---
const bills = [];
for (const b of BILLS) {
  const item = billItem(b);
  await send("Runtime.evaluate", {
    expression: `location.assign(${JSON.stringify(baseUrl + "#/tagihan/" + b.id)})`,
  });
  await sleep(1500);
  const head = await evalJs(`(() => ({
    h1: document.querySelector("h1")?.textContent || null,
    sub: document.querySelector(".crumb p")?.textContent || null,
    step2Title: document.querySelectorAll(".step-head h3")[1]?.textContent || null,
    detailBefore: document.querySelector(".flow > div:first-child .step:first-child")?.textContent.includes("Nama pelanggan") || false,
    buyDisabledBefore: document.querySelector(".summary .btn.big")?.disabled ?? null,
  }))()`);
  // Ketik nomor contoh lalu klik "Cek Tagihan".
  await evalJs(SET_INPUT_JS("#billid", b.example));
  await sleep(400);
  const clicked = await evalJs(CLICK_BY_TEXT_JS("Cek Tagihan"));
  await sleep(600);
  const detail = await evalJs(`(() => {
    const step1 = document.querySelector(".flow > div:first-child .step:first-child");
    const txt = step1 ? step1.textContent : "";
    const noms = [...document.querySelectorAll(".nom")];
    return {
      hasName: txt.includes(${JSON.stringify(maskName(b.example.replace(/[\s-]/g, "")))}),
      hasPeriod: txt.includes(${JSON.stringify(b.bill.period)}),
      hasUsage: txt.includes(${JSON.stringify(b.bill.usage)}),
      hasAmount: txt.includes(${JSON.stringify(rp(b.bill.amount))}),
      hasAdmin: txt.includes(${JSON.stringify("Rp" + BILL_ADMIN.toLocaleString("id-ID"))}),
      hasTotal: txt.includes(${JSON.stringify(rp(item.price))}),
      nomCount: noms.length,
      nomName: noms[0]?.querySelector(".n-name")?.textContent || null,
      nomPrice: noms[0]?.querySelector(".n-price")?.textContent.trim().replace(/\\s+/g, " ") || null,
      nomMeta: noms[0]?.querySelector(".n-meta")?.textContent || null,
    };
  })()`);
  // Pilih item lalu baca harga 13 metode bayar.
  await evalJs(`(() => { document.querySelector(".nom")?.click(); return true; })()`);
  await sleep(400);
  const pays = await evalJs(`(() => [...document.querySelectorAll(".pay")].map((p) => ({
    name: p.querySelector(".p-name2")?.textContent || "?",
    price: p.querySelector(".p-price")?.childNodes[0]?.textContent?.trim() || null,
    status: p.querySelector(".status-tag")?.textContent || null,
    disabled: p.disabled,
  })))()`);
  const paysExpected = ALL_PAYMENTS.map((p) => ({
    name: p.name,
    price: p.status ? null : rp(calcTotals(item.price, p, null).total),
    status: p.status || null,
  }));
  // Beli dengan QRIS (metode pertama) lalu cek halaman sukses.
  const ov = await evalJs(OFFENDERS_JS);
  await shot(`tagihan-${b.id}-${WIDTH}`);
  await evalJs(`(() => { document.querySelector(".pay:not([disabled])")?.click(); return true; })()`);
  await sleep(400);
  const buyState = await evalJs(`(() => ({
    buyDisabled: document.querySelector(".summary .btn.big")?.disabled ?? null,
    summaryTotal: document.querySelector(".sum-total b")?.textContent || null,
  }))()`);
  await evalJs(`(() => { document.querySelector(".summary .btn.big")?.click(); return true; })()`);
  await sleep(1800);
  const sukses = await evalJs(`(() => ({
    hash: location.hash,
    h2: document.querySelector("h2")?.textContent || null,
    sub: document.querySelector(".p-sub")?.textContent || null,
    rows: [...document.querySelectorAll(".sum-row")].map((r) => r.textContent.replace(/\\s+/g, " ").trim()),
    total: document.querySelector(".sum-total b")?.textContent || null,
  }))()`);
  if (b.id === "pln-pascabayar") await shot(`sukses-pln-pascabayar-${WIDTH}`);
  const row = {
    id: b.id,
    expected: {
      h1: b.name,
      sub: "Pascabayar · cek tagihan dulu, bayar sebelum jatuh tempo",
      step2Title: "Pilih Tagihan",
      item: { name: item.name, price: rp(item.price), meta: item.meta },
      pays: paysExpected,
      suksesSub: "Tagihan sudah dibayar. Simpan nomor transaksi sebagai bukti pembayaran.",
      suksesTotal: rp(item.price),
    },
    head, clicked, detail, pays, buyState, sukses, ...ov,
  };
  bills.push(row);
  console.log("BILL", JSON.stringify(row));
}

writeFileSync(`${outDir}/summary-${WIDTH}.json`, JSON.stringify({ width: WIDTH, index: { ...index, expected: indexExpected, ...indexOverflow }, bills }, null, 2));
ws.close();
console.log("DONE");
