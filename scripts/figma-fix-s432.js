// Perbaikan teks Figma batch s432 (ide 15, 5, 98-sebagian):
// - B15: tagline Roblox "Gift card Robux, kode ke email" -> "Top up langsung ke akun" (20 node, teks memendek — aman).
// - A5: "Pilih Paket" -> "Pilih Nominal" (2 node, Paket Data mobile); "Pilih Nominal Token" -> "Pilih Nominal" (2 node, PLN mobile).
// TIDAK disentuh: desc Cara Top Up desktop (tambah 21 karakter -> 4 baris, meluber dari kartu 150px; masuk antrean).
// Resep kanonik edit teks: load font via getStyledTextSegments -> characters.
const replacements = [];
const OLD_ROBLOX = "Roblox Corporation · Gift card Robux, kode ke email";
const NEW_ROBLOX = "Roblox Corporation · Top up langsung ke akun";
for (const f of figma.currentPage.children) {
  for (const t of f.findAllWithCriteria({ types: ["TEXT"] })) {
    if (t.characters === OLD_ROBLOX) replacements.push({ node: t, to: NEW_ROBLOX, kind: "roblox" });
    else if (t.characters.trim() === "Pilih Paket") replacements.push({ node: t, to: "Pilih Nominal", kind: "pilihPaket" });
    else if (t.characters.trim() === "Pilih Nominal Token") replacements.push({ node: t, to: "Pilih Nominal", kind: "pilihNominalToken" });
  }
}
const out = { total: replacements.length, byKind: {}, changed: [], errors: [] };
for (const r of replacements) {
  try {
    const segs = r.node.getStyledTextSegments(["fontName", "fontSize"]);
    for (const s of segs) await figma.loadFontAsync(s.fontName);
    r.node.characters = r.to;
    r.node.name = r.to.slice(0, 40);
    out.byKind[r.kind] = (out.byKind[r.kind] || 0) + 1;
    out.changed.push(r.node.id + " (" + r.kind + ") h=" + Math.round(r.node.height));
  } catch (e) {
    out.errors.push(r.node.id + ": " + String(e).slice(0, 120));
  }
}
return out;
