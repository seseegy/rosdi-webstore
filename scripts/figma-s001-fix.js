// Perbaikan Figma batch s001 (kecil & aman, terverifikasi):
// 1. Tile Free Fire flash sale: #0EA5E9 -> #0284C7 (warna data.js Free Fire).
//    Kriteria: RECTANGLE 46x46 ber-fill #0EA5E9 (8 node: Beranda + 3 klon modal, L/D).
// 2. Hero mobile (klon Beranda, 390px): rect 358x140 di (16,140) + teks
//    "Mulai top up" di (53,260): Light #1D4ED8 -> #1E3A8A (--blue-deep light),
//    Dark #1E40AF -> #172F5E (--blue-deep dark); radius hero 18 -> 20 (kode).
//    Desktop sudah benar (#1E3A8A/#172F5E, r20) dan tidak disentuh.
// 3. Sub Indeks Pulsa (4 frame): "Pilih operator — atau langsung isi nomor,
//    operator terdeteksi otomatis" -> "Pilih operator untuk melihat nominal
//    dan harga" (sama dengan perbaikan kode PhonePages.jsx).
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
function setFill(n, fromHex, toHex) {
  const fills = n.fills.map((p) => {
    if (p && p.type === "SOLID" && p.color && hex(p.color).toLowerCase() === fromHex) {
      const v = parseInt(toHex.slice(1), 16);
      return { ...p, color: { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 } };
    }
    return p;
  });
  n.fills = fills;
}
const OLD_SUB = "Pilih operator \u2014 atau langsung isi nomor, operator terdeteksi otomatis";
const NEW_SUB = "Pilih operator untuk melihat nominal dan harga";
const page = figma.currentPage;
const frames = page.children.filter((n) => n.type === "FRAME");
const res = { ffTiles: [], heroRects: [], heroTexts: [], indexSubs: [], mutatedNodeIds: [] };
for (const f of frames) {
  const isDark = /Dark/.test(f.name);
  for (const n of f.findAll(() => true)) {
    // 1. tile FF 46x46 #0EA5E9
    if (n.type === "RECTANGLE" && Math.round(n.width) === 46 && Math.round(n.height) === 46 &&
        Array.isArray(n.fills) && n.fills.some((p) => p && p.type === "SOLID" && p.color && hex(p.color).toLowerCase() === "#0ea5e9")) {
      setFill(n, "#0ea5e9", "#0284c7");
      res.ffTiles.push({ frame: f.name, id: n.id });
      res.mutatedNodeIds.push(n.id);
    }
    // 2a. hero rect mobile 358x140 @ (16,140)
    if (n.type === "RECTANGLE" && Math.round(n.width) === 358 && Math.round(n.height) === 140 &&
        Math.round(n.x) === 16 && Math.round(n.y) === 140 && f.width === 390) {
      const from = isDark ? "#1e40af" : "#1d4ed8";
      const to = isDark ? "#172f5e" : "#1e3a8a";
      const has = Array.isArray(n.fills) && n.fills.some((p) => p && p.type === "SOLID" && p.color && hex(p.color).toLowerCase() === from);
      if (has) {
        setFill(n, from, to);
        if (n.cornerRadius === 18) n.cornerRadius = 20;
        res.heroRects.push({ frame: f.name, id: n.id, from, to, r: n.cornerRadius });
        res.mutatedNodeIds.push(n.id);
      }
    }
    // 2b. teks tombol hero "Mulai top up"
    if (n.type === "TEXT" && n.name === "Mulai top up" && Math.round(n.x) === 53 && Math.round(n.y) === 260) {
      const from = isDark ? "#1e40af" : "#1d4ed8";
      const to = isDark ? "#172f5e" : "#1e3a8a";
      const has = Array.isArray(n.fills) && n.fills.some((p) => p && p.type === "SOLID" && p.color && hex(p.color).toLowerCase() === from);
      if (has) {
        setFill(n, from, to);
        res.heroTexts.push({ frame: f.name, id: n.id, from, to });
        res.mutatedNodeIds.push(n.id);
      }
    }
    // 3. sub Indeks Pulsa
    if (n.type === "TEXT" && n.characters === OLD_SUB) {
      const segs = n.getStyledTextSegments(["fontName"]);
      for (const s of segs) await figma.loadFontAsync(s.fontName);
      n.characters = NEW_SUB;
      res.indexSubs.push({ frame: f.name, id: n.id });
      res.mutatedNodeIds.push(n.id);
    }
  }
}
return res;
