// Fix Siklus 69: (1) judul seksi "Populer" -> "Top Up Game" + ".more"
// "Lihat semua" -> "Harga mulai dari, final di halaman produk" (persis
// Home.jsx:94) di Beranda mobile + 6 latar modal; (2) buat node .more yang
// sama di frame pencarian "mlbb" (showGame true saat cari "mlbb", jadi
// sec-head + .more ikut tampil); (3) .more 13px di lebar 235 membungkus
// 2 baris -> geser semua simpul di bawah sec-head agar celah 11px ke grid
// terjaga, frame memanjang, veil ikut memanjang, kartu modal dipusatkan
// ulang (sekaligus memperbaiki Refund yang 21px di atas tengah).
const MORE = "Harga mulai dari, final di halaman produk";
const BLUE = {
  light: { r: 37 / 255, g: 99 / 255, b: 235 / 255 },
  dark: { r: 59 / 255, g: 130 / 255, b: 246 / 255 },
};
const TARGETS = [
  { frame: "1:2" }, { frame: "1:105" },
  { frame: "10:2" }, { frame: "10:105" },
  { frame: "13:2" }, { frame: "13:111" },
  { frame: "162:2" }, { frame: "162:111" },
  { frame: "15:2", mlbb: true }, { frame: "15:105", mlbb: true },
];
async function loadFonts(node) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
}
const results = [];
for (const t of TARGETS) {
  const f = await figma.getNodeByIdAsync(t.frame);
  if (!f) { results.push({ frame: t.frame, error: "tidak ditemukan" }); continue; }
  const isDark = f.name.includes("Dark");
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const r = { frame: t.frame, name: f.name, frameHBefore: Math.round(f.height) };

  // --- h2 ---
  const h2 = t.mlbb
    ? texts.find((x) => x.characters === "Top Up Game" && Math.round(x.y) === 522)
    : texts.find((x) => x.characters === "Populer");
  if (!h2) { r.h2 = "tidak ketemu"; results.push(r); continue; }
  await loadFonts(h2);
  if (!t.mlbb) {
    h2.characters = "Top Up Game";
    h2.name = "Top Up Game";
  }
  if (Math.round(h2.width) !== 111 || Math.round(h2.height) !== 21) {
    h2.textAutoResize = "HEIGHT";
    h2.resize(111, 21);
  }
  r.h2 = { id: h2.id, w: Math.round(h2.width), h: Math.round(h2.height) };

  // --- .more ---
  let more = t.mlbb ? null : texts.find((x) => x.characters === "Lihat semua");
  if (t.mlbb) {
    more = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    more.fontName = { family: "Inter", style: "Medium" };
    more.fills = [{ type: "SOLID", color: isDark ? BLUE.dark : BLUE.light }];
    f.appendChild(more);
  } else {
    await loadFonts(more);
  }
  more.fontSize = 13;
  more.characters = MORE;
  more.name = MORE;
  more.textAutoResize = "HEIGHT";
  more.resize(235, 16);
  more.x = 139;
  more.y = 522;
  const moreH = Math.round(more.height);
  r.more = { id: more.id, h: moreH, created: !!t.mlbb };

  // --- geser simpul di bawah sec-head ---
  const veilIdx = f.children.findIndex((c) => c.name === "Veil");
  const below = f.children.filter((c) => c.y > 543 && (veilIdx < 0 || f.children.indexOf(c) < veilIdx));
  const gridTop = below.length ? Math.min(...below.map((c) => c.y)) : null;
  if (gridTop === null) { r.shift = "tidak ada simpul di bawah"; results.push(r); continue; }
  const delta = Math.round(522 + moreH + 11 - gridTop);
  r.gridTopBefore = Math.round(gridTop);
  r.delta = delta;
  if (delta > 0) {
    for (const c of below) c.y += delta;
    f.resize(f.width, f.height + delta);
    if (veilIdx >= 0) {
      const veil = f.children[veilIdx];
      veil.resize(veil.width, veil.height + delta);
      const card = f.children[veilIdx + 1];
      if (card) {
        const beforeY = Math.round(card.y);
        card.y = Math.round(f.height / 2 - card.height / 2);
        r.card = { id: card.id, name: card.name, yBefore: beforeY, yAfter: Math.round(card.y) };
      }
    }
  }
  r.frameHAfter = Math.round(f.height);
  r.gridTopAfter = Math.round(gridTop + Math.max(0, delta));
  results.push(r);
}
return { nFrames: results.length, results };
