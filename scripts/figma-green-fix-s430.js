// Perbaikan Siklus 430 (ide bank 30) — 4 edit kecil di Figma:
// A. Cek Transaksi mobile: dot ke-3 timeline "Item terkirim" masih biru
//    (--blue, state "now") padahal teks frame sendiri "Status: Selesai"
//    dan kode (status Selesai -> semua dot "done" hijau) + Cek Desktop
//    (3 dot hijau) sepakat hijau. Light 3:262 #2563EB -> #059669;
//    Dark: cari ellipse ber-fill #3B82F6 di frame 3:265 -> #34D399.
// B. Sukses Desktop: sub "Status: Selesai. Item sedang dikirim..."
//    kontradiktif (Selesai tapi sedang dikirim) dan beda dari kode +
//    Sukses mobile ("Status: Diproses"). 36:183 & 36:261:
//    "Status: Selesai." -> "Status: Diproses." (hanya kemunculan pertama).
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
function recolor(node, fromHex, toHex) {
  const fills = JSON.parse(JSON.stringify(node.fills));
  let changed = false;
  for (const p of fills) {
    if (p.type === "SOLID" && p.color && hex(p.color).toLowerCase() === fromHex.toLowerCase()) {
      const n = parseInt(toHex.slice(1), 16);
      p.color = { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
      changed = true;
    }
  }
  if (changed) node.fills = fills;
  return changed;
}
const out = { mutated: [] };

// A1. Light
const dotL = await figma.getNodeByIdAsync("3:262");
if (dotL && recolor(dotL, "#2563eb", "#059669")) {
  out.mutated.push({ id: "3:262", what: "Cek mobile Light dot-3", from: "#2563EB", to: "#059669" });
}
// A2. Dark — cari ellipse biru di frame 3:265
const cekDark = await figma.getNodeByIdAsync("3:265");
if (cekDark) {
  for (const e of cekDark.findAll((n) => n.type === "ELLIPSE")) {
    const fs = Array.isArray(e.fills) ? e.fills : [];
    const isBlue = fs.some((p) => p.type === "SOLID" && p.color && hex(p.color).toLowerCase() === "#3b82f6");
    if (isBlue && recolor(e, "#3b82f6", "#34d399")) {
      out.mutated.push({ id: e.id, what: "Cek mobile Dark dot-3", from: "#3B82F6", to: "#34D399" });
    }
  }
}
// B. Teks sub Sukses Desktop (resep kanonik: load font dulu)
for (const id of ["36:183", "36:261"]) {
  const t = await figma.getNodeByIdAsync(id);
  if (!t || !("characters" in t)) { out.mutated.push({ id, what: "sub Sukses Desktop", error: "node teks tidak ditemukan" }); continue; }
  const before = t.characters;
  if (!before.startsWith("Status: Selesai.")) { out.mutated.push({ id, what: "sub Sukses Desktop", error: "teks awal tak sesuai: " + before.slice(0, 40) }); continue; }
  for (const seg of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(seg.fontName);
  t.characters = before.replace("Status: Selesai.", "Status: Diproses.");
  out.mutated.push({ id, what: "sub Sukses Desktop", from: before, to: t.characters });
}
return out;
