// Inventaris B3-1 — read-only: halaman/frame + hitungan pola teks + struktur
// 4 frame kunci (Sukses/Cek/Beranda/search-mlbb Desktop).
const F = (id) => figma.getNodeById(id);
const frameOf = (t) => {
  let p = t.parent;
  while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") return p.name + " (" + p.id + ")"; p = p.parent; }
  return "?";
};
const out = {};
out.pages = figma.root.children.map((p) => ({ name: p.name, id: p.id, topChildren: p.children.length }));
const frames = [];
for (const p of figma.root.children) for (const c of p.children) frames.push(c.name + " (" + c.id + ")");
out.frameCount = frames.length;
out.frames = frames;

const allText = figma.root.findAllWithCriteria({ types: ["TEXT"] });
const search = (label, test) => {
  const hits = allText.filter((t) => test(t.characters));
  out[label] = { count: hits.length, sample: hits.slice(0, 3).map((t) => ({ id: t.id, frame: frameOf(t) })) };
};
search("cekID", (s) => s === "Cek ID");
search("pulsaData", (s) => s === "Pulsa & Data");
search("hargaFinal", (s) => s === "Harga final, tanpa biaya lain");
search("lacak", (s) => s === "Lacak");
search("metodeQRIS", (s) => s === "Metode: QRIS");
search("promoLama", (s) => s === "Punya kode promo? Coba ROSDI10");
search("promoBaru", (s) => s.includes("GAMER5"));
search("genshinTitik", (s) => /^(1\.090|2\.240|3\.880) Genesis Crystal$/.test(s.trim()));
search("isiSaldo", (s) => s.includes("Isi Saldo E-Wallet"));
search("tokenKamu", (s) => s === "Nomor token PLN kamu");
search("tokenCek", (s) => s === "Nomor token");
search("saldoKembali", (s) => s.includes("Saldo kembali"));
search("uangKembali", (s) => s.includes("uang kembali"));
search("totalDibayar", (s) => s.includes("Total dibayar"));
search("biayaLayanan", (s) => s.includes("Biaya layanan"));
search("emailBukti", (s) => s.includes("Email untuk bukti pembayaran"));
search("membershipBulanan", (s) => s.includes("Membership Bulanan"));
search("danEwallet", (s) => s.includes("dan e-wallet"));
search("salin", (s) => s === "Salin" || s === "Salin token");

out.footerComponents = figma.root.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] })
  .filter((c) => /footer/i.test(c.name)).map((c) => ({ id: c.id, name: c.name, type: c.type }));
const footerInst = figma.root.findAllWithCriteria({ types: ["INSTANCE"] })
  .filter((n) => n.mainComponent && /footer/i.test(n.mainComponent.name));
out.footerInstances = { count: footerInst.length, sample: footerInst.slice(0, 3).map((n) => ({ id: n.id, main: n.mainComponent.name, frame: frameOf(n) })) };

const frameTexts = (fid) => {
  const fr = F(fid);
  if (!fr) return null;
  return { name: fr.name, id: fr.id, w: Math.round(fr.width), h: Math.round(fr.height),
    texts: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters).filter((s, i, a) => a.indexOf(s) === i).slice(0, 50) };
};
out.suksesDesk = frameTexts("36:166");
out.cekDesk = frameTexts("36:2");
out.berandaDesk = frameTexts("20:2");
out.searchMlbb = frameTexts("15:2");

// Baris ringkasan Sukses Desktop (untuk sisip Waktu/Salin/garansi)
{
  const fr = F("36:166");
  if (fr) {
    const rows = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^(Nomor transaksi|Total|Waktu|Status|Metode|Pembayaran|Harga|Biaya|Diskon)/.test(t.characters.trim()));
    out.suksesRows = rows.map((t) => ({ text: t.characters.slice(0, 50), id: t.id,
      parent: t.parent ? t.parent.name + " [" + t.parent.type + "]" : "?" }));
  }
}
return out;
