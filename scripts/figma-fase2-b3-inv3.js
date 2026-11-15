// Inventaris B3-3 — read-only: teks persis pola drift + struktur induk
// "Cek ID", "Pulsa & Data", "Harga final, tanpa biaya lain".
const out = {};
const allText = figma.root.findAllWithCriteria({ types: ["TEXT"] });
const exact = (label, test) => {
  const hits = allText.filter((t) => test(t.characters));
  out[label] = { count: hits.length, texts: [...new Set(hits.map((t) => t.characters))].slice(0, 6) };
};
exact("totalDibayar", (s) => s.includes("Total dibayar"));
exact("biayaLayanan", (s) => s.includes("Biaya layanan"));
exact("emailBukti", (s) => s.includes("Email untuk bukti pembayaran"));
exact("tokenPLNdan", (s) => s.includes("token PLN, dan e-wallet"));
exact("saldoKembali", (s) => s.includes("Saldo kembali"));
exact("isiSaldo", (s) => s.includes("Isi Saldo E-Wallet"));
exact("pulsaDataCtx", (s) => s === "Pulsa & Data");
exact("cekIDctx", (s) => s === "Cek ID");
exact("hargaFinalCtx", (s) => s === "Harga final, tanpa biaya lain");

const parentInfo = (label, test, n = 4) => {
  const hits = allText.filter((t) => test(t.characters)).slice(0, n);
  out[label] = hits.map((t) => {
    const p = t.parent, g = p ? p.parent : null;
    const sibTexts = p ? p.findAllWithCriteria({ types: ["TEXT"] }).map((x) => x.characters.slice(0, 30)) : [];
    return { id: t.id, text: t.characters,
      parent: p ? { name: p.name, type: p.type, w: Math.round(p.width), h: Math.round(p.height), layout: p.layoutMode || "-", kids: p.children ? p.children.length : 0, sibTexts } : null,
      grand: g ? { name: g.name, type: g.type, layout: g.layoutMode || "-" } : null };
  });
};
parentInfo("cekIDparent", (s) => s === "Cek ID");
parentInfo("pulsaDataParent", (s) => s === "Pulsa & Data");
parentInfo("hargaFinalParent", (s) => s === "Harga final, tanpa biaya lain");
// Chip "Tagihan" di Beranda Desktop 20:2 — struktur baris chip
{
  const fr = figma.getNodeById("20:2");
  const chips = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => ["Semua", "Top Up Game", "Pulsa", "Paket Data", "Token PLN", "E-Wallet", "Voucher"].includes(t.characters.trim()));
  out.chipsDesk = chips.map((t) => {
    const p = t.parent;
    return { text: t.characters, id: t.id,
      parent: p ? { name: p.name, type: p.type, w: Math.round(p.width), h: Math.round(p.height), layout: p.layoutMode || "-", x: Math.round(p.x), y: Math.round(p.y) } : null,
      grand: p && p.parent ? { name: p.parent.name, type: p.parent.type, layout: p.parent.layoutMode || "-", x: Math.round(p.parent.x), y: Math.round(p.parent.y) } : null };
  });
}
// Footer Desktop 20:2 — struktur kolom Produk
{
  const fr = figma.getNodeById("20:2");
  const links = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => ["Mobile Legends", "Free Fire", "Pulsa Reguler", "Token PLN"].includes(t.characters.trim()));
  out.footerLinksDesk = links.map((t) => {
    const p = t.parent;
    return { text: t.characters, id: t.id,
      parent: p ? { name: p.name, type: p.type, w: Math.round(p.width), h: Math.round(p.height), layout: p.layoutMode || "-", x: Math.round(p.x), y: Math.round(p.y) } : null,
      grand: p && p.parent ? { name: p.parent.name, type: p.parent.type, layout: p.parent.layoutMode || "-" } : null };
  });
}
return out;
