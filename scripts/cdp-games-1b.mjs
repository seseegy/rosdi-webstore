// cdp-games-1b.mjs — Tahap 1b: verifikasi render 11 judul game (Tahap 1a)
// via CDP terhadap Chrome headless lokal + vite preview.
// Penggunaan: node scripts/cdp-games-1b.mjs <wsUrl> <width> <baseUrl> <outDir>
// Menulis <outDir>/home-<width>.png, game-<id>-<width>.png + summary-<width>.json.
// Navigasi lewat location.assign (pola Siklus 71: Page.navigate ke loopback
// kena ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS).
import { writeFileSync, mkdirSync } from "node:fs";
import { GAMES } from "../src/data.js";

const [wsUrl, widthArg, baseUrl, outDir] = process.argv.slice(2);
if (!wsUrl || !widthArg || !baseUrl || !outDir) {
  console.error("usage: cdp-games-1b.mjs <wsUrl> <width> <baseUrl> <outDir>");
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

// --- Beranda ---
await send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(baseUrl)})` });
await sleep(2500);
const home = await evalJs(`(() => {
  const sec = [...document.querySelectorAll("section.block")].find((s) => s.querySelector("h2")?.textContent === "Top Up Game");
  const cards = [...(sec ? sec.querySelectorAll("a.card") : [])];
  const grid = sec ? sec.querySelector(".grid.c4") : null;
  const gr = grid ? grid.getBoundingClientRect() : null;
  const first = cards[0] ? cards[0].getBoundingClientRect() : null;
  return {
    gameCards: cards.length,
    names: cards.map((c) => c.querySelector(".p-name")?.textContent || "?"),
    froms: cards.map((c) => c.querySelector(".p-from")?.textContent || "?"),
    gridCols: gr && first ? Math.round(gr.width / (first.width + 12)) : null,
    cardW: first ? Math.round(first.width) : null,
    cardH: first ? Math.round(first.height) : null,
  };
})()`);
const homeOverflow = await evalJs(OFFENDERS_JS);
await shot(`home-${WIDTH}`);
console.log("HOME", JSON.stringify({ ...home, ...homeOverflow }));

// --- Tiap halaman game ---
const games = [];
for (const g of GAMES) {
  await send("Runtime.evaluate", {
    expression: `location.assign(${JSON.stringify(baseUrl + "#/game/" + g.id)})`,
  });
  await sleep(1500);
  const m = await evalJs(`(() => {
    const h1 = document.querySelector("h1")?.textContent || null;
    const tabs = [...document.querySelectorAll(".tabs button, [role=tab]")].map((b) => b.textContent.trim());
    const nomGrid = document.querySelector(".nom-grid");
    const ngr = nomGrid ? nomGrid.getBoundingClientRect() : null;
    const first = document.querySelector(".nom")?.getBoundingClientRect();
    return {
      h1,
      tabs,
      nomGridW: ngr ? Math.round(ngr.width) : null,
      nomW: first ? Math.round(first.width) : null,
    };
  })()`);
  // Klik tiap tab, hitung item nominal per tab (render generik harus ganti isi).
  const perTab = [];
  for (let i = 0; i < m.tabs.length; i++) {
    await evalJs(`(() => {
      const btns = [...document.querySelectorAll(".tabs button, [role=tab]")];
      btns[${i}].click();
      return true;
    })()`);
    await sleep(400);
    const c = await evalJs(`(() => {
      const noms = [...document.querySelectorAll(".nom")];
      return {
        nomCount: noms.length,
        nomNames: noms.map((n) => n.querySelector(".n-name")?.textContent || "?"),
        nomPrices: noms.map((n) => n.querySelector(".n-price")?.textContent || "?"),
      };
    })()`);
    perTab.push({ tab: m.tabs[i], ...c });
  }
  const ov = await evalJs(OFFENDERS_JS);
  await shot(`game-${g.id}-${WIDTH}`);
  const row = { id: g.id, expectedTabs: Object.keys(g.tabs), expectedPerTab: Object.fromEntries(Object.entries(g.tabs).map(([k, v]) => [k, v.length])), ...m, perTab, ...ov };
  games.push(row);
  console.log("GAME", JSON.stringify(row));
}

writeFileSync(`${outDir}/summary-${WIDTH}.json`, JSON.stringify({ width: WIDTH, home: { ...home, ...homeOverflow }, games }, null, 2));
ws.close();
console.log("DONE");
