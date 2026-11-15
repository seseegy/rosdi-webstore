// Probe s432d — read-only follow-up: A16 warna tile (node "Tile XX"),
// J96 gap kartu (node kartu by ukuran), J98 "Cara Top Up" di semua frame,
// G70 baris chip latar modal (y 290-340), G67 rect tombol Tutup,
// J93 rect meluber kanan (y-nya), Pulsa mobile teks nomor.
const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const out = { tiles: {}, gridGap2: {}, caraTopUpAll: {}, modalChips: {}, tutupRect: {}, overflowRight: {}, pulsaMobile: {} };
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;

// A16: node bernama "Tile XX" di Beranda (mobile+desktop, Light+Dark)
for (const fid of ["1:2", "1:105", "20:2", "21:2"]) {
  const f = byId[fid];
  const tiles = f.findAllWithCriteria({ types: ["RECTANGLE"] }).filter((n) => /^Tile /.test(n.name));
  out.tiles[f.name] = tiles.map((t) => ({ name: t.name, fill: t.fills && t.fills[0] && t.fills[0].type === "SOLID" ? hex(t.fills[0].color) : "?" }));
}
// J96: kartu by ukuran — Beranda Desktop game card w 260-280; Produk Game Desktop nominal w 220-240
const cardRow = (frame, wMin, wMax, hMin, hMax) => {
  const nodes = [];
  const walk = (n) => {
    if ((n.type === "FRAME" || n.type === "RECTANGLE" || n.type === "GROUP") && n.width >= wMin && n.width <= wMax && n.height >= hMin && n.height <= hMax && n !== frame) nodes.push(n);
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(frame);
  const fb = frame.absoluteBoundingBox;
  const rows = {};
  for (const n of nodes) {
    const b = n.absoluteBoundingBox;
    const ry = Math.round(b.y - fb.y), rx = Math.round(b.x - fb.x);
    const key = Math.round(ry / 20) * 20;
    (rows[key] = rows[key] || []).push({ x: rx, y: ry, w: Math.round(n.width), name: n.name.slice(0, 24) });
  }
  const gaps = {};
  for (const [k, arr] of Object.entries(rows)) {
    arr.sort((a, b) => a.x - b.x);
    const g = [];
    for (let i = 1; i < arr.length; i++) g.push(arr[i].x - (arr[i - 1].x + arr[i - 1].w));
    gaps[k] = { count: arr.length, xs: arr.map((a) => a.x), gaps: [...new Set(g)] };
  }
  return gaps;
};
out.gridGap2.berandaDesk = cardRow(byId["20:2"], 260, 285, 90, 200);
out.gridGap2.produkGameDesk = cardRow(byId["26:2"], 220, 245, 60, 140);
// J98: "Cara Top Up" + "Isi data tujuan" di semua frame
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim());
  if (texts.includes("Cara Top Up") || texts.includes("Isi data tujuan")) out.caraTopUpAll[f.name] = { hasTitle: texts.includes("Cara Top Up"), hasStep1: texts.includes("Isi data tujuan") };
}
// G70: baris chip latar modal — teks dengan y relatif 285-345 di frame modal & Beranda
const chipRow = (frame) => {
  const fb = frame.absoluteBoundingBox;
  return frame.findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => { const b = t.absoluteBoundingBox; const ry = b.y - fb.y; return ry >= 285 && ry <= 345; })
    .map((t) => t.characters.trim());
};
out.modalChips.berandaLight = chipRow(byId["1:2"]);
out.modalChips.modalSKLight = chipRow(byId["10:2"]);
out.modalChips.modalRefundLight = chipRow(byId["13:2"]);
// G67: rect tombol Tutup — rect yang memuat teks "Tutup"
for (const fid of ["10:2", "13:2", "170:2", "170:492"]) {
  const f = byId[fid];
  const t = f.findAllWithCriteria({ types: ["TEXT"] }).find((x) => x.characters.trim() === "Tutup");
  if (!t) { out.tutupRect[f.name] = "TIDAK ADA"; continue; }
  const tb = t.absoluteBoundingBox;
  const cands = f.findAllWithCriteria({ types: ["RECTANGLE"] }).filter((r) => {
    const b = r.absoluteBoundingBox;
    return b.x <= tb.x + 2 && b.y <= tb.y + 2 && b.x + b.width >= tb.x + tb.width - 2 && b.y + b.height >= tb.y + tb.height - 2 && r.width < 400;
  });
  out.tutupRect[f.name] = cands.map((r) => ({ w: Math.round(r.width), h: Math.round(r.height), name: r.name.slice(0, 30) })).slice(0, 3);
}
// J93: rect yang meluber kanan di Beranda — posisi y-nya
for (const fid of ["1:2"]) {
  const f = byId[fid];
  const fb = f.absoluteBoundingBox;
  const bad = [];
  const walk = (n) => {
    if (n.absoluteBoundingBox) {
      const b = n.absoluteBoundingBox;
      if (b.x + b.width > fb.x + f.width + 1) bad.push({ name: n.name.slice(0, 34), type: n.type, y: Math.round(b.y - fb.y), h: Math.round(b.height), over: Math.round(b.x + b.width - fb.x - f.width) });
    }
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(f);
  out.overflowRight[f.name] = bad.slice(0, 10);
}
// Pulsa mobile: teks nomor di Langkah 1
{
  const f = byId["2:2"];
  const texts = f.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim());
  out.pulsaMobile.texts = texts.filter((t) => /08|0812|Nomor|Operator|terdeteksi|Contoh/i.test(t));
}
return out;
