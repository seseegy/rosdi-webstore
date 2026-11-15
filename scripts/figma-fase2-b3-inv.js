// Inventaris B3 — read-only: cari semua node teks yang terkait 24 item drift
// Figma vs kode + struktur frame kunci (Sukses, Cek, Beranda, search mlbb,
// Paket Data Telkomsel, E-Wallet DANA, FF mobile, Genshin mobile) + komponen footer.
const F = (id) => figma.getNodeById(id);
const r1 = (n) => Math.round(n * 10) / 10;
const frameOf = (t) => {
  let p = t.parent;
  while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") return p.name + " (" + p.id + ")"; p = p.parent; }
  return "?";
};
const out = {};

// 1. Pages + jumlah frame
out.pages = figma.root.children.map((p) => ({ name: p.name, id: p.id, topChildren: p.children.length }));
const frames = [];
for (const p of figma.root.children) for (const c of p.children) frames.push({ name: c.name, id: c.id, type: c.type });
out.frameCount = frames.length;
out.frames = frames.map((f) => f.name + " (" + f.id + ")");

// 2. Pencarian teks sedunia (cocok persis / substring)
const allText = figma.root.findAllWithCriteria({ types: ["TEXT"] });
const search = (label, test, cap = 30) => {
  const hits = allText.filter((t) => test(t.characters)).slice(0, cap).map((t) => ({
    id: t.id, text: t.characters.slice(0, 90), frame: frameOf(t),
    parent: t.parent ? t.parent.name + " [" + t.parent.type + "]" : "?",
  }));
  out[label] = { count: allText.filter((t) => test(t.characters)).length, hits };
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

// 3. Komponen footer?
const comps = figma.root.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] })
  .filter((c) => /footer/i.test(c.name)).map((c) => ({ id: c.id, name: c.name, type: c.type }));
out.footerComponents = comps;
const footerInst = figma.root.findAllWithCriteria({ types: ["INSTANCE"] })
  .filter((n) => n.mainComponent && /footer/i.test(n.mainComponent.name));
out.footerInstances = { count: footerInst.length, sample: footerInst.slice(0, 5).map((n) => ({ id: n.id, main: n.mainComponent.name, frame: frameOf(n) })) };

// 4. Struktur frame kunci (anak tingkat 1 + teksnya)
const kids = (fr, depth = 1) => {
  if (!fr) return null;
  return fr.children.slice(0, 60).map((c) => {
    const o = { name: c.name, type: c.type, w: Math.round(c.width), h: Math.round(c.height) };
    if (c.type === "TEXT") o.text = c.characters.slice(0, 80);
    if (depth > 0 && c.children) o.kids = c.children.slice(0, 12).map((k) => ({ name: k.name, type: k.type, text: k.type === "TEXT" ? k.characters.slice(0, 60) : undefined }));
    return o;
  });
};
const frameTexts = (fid) => {
  const fr = F(fid);
  if (!fr) return null;
  return { name: fr.name, id: fr.id, w: Math.round(fr.width), h: Math.round(fr.height),
    texts: fr.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters).filter((s, i, a) => a.indexOf(s) === i).slice(0, 120) };
};
out.suksesDesk = frameTexts("36:166");
out.cekDesk = frameTexts("36:2");
out.berandaDesk = frameTexts("20:2");
out.searchMlbb = frameTexts("15:2");
out.ffMobile = frameTexts("111:2");
out.genshinMobile = frameTexts("6:2");
out.telkomselMobile = frameTexts("41:2");
out.emoneyMobile = frameTexts("3:2");
out.plnDesk = frameTexts("30:2");
out.gameDesk = frameTexts("26:2");

// 5. Struktur kartu nominal Telkomsel (untuk kloning operator lain): cari grid nominal
{
  const fr = F("41:2");
  if (fr) {
    const noms = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /GB|Unlimited|Malam|Lokal|Mingguan/.test(t.characters)).slice(0, 14);
    out.telkomselCards = noms.map((t) => {
      const p = t.parent;
      return { text: t.characters, card: p ? { name: p.name, type: p.type, w: Math.round(p.width), h: Math.round(p.height) } : null,
        cardTexts: p ? p.findAllWithCriteria({ types: ["TEXT"] }).map((x) => x.characters) : [] };
    });
  }
}
// 6. Kartu nominal DANA (untuk kloning GoPay)
{
  const fr = F("3:2");
  if (fr) {
    const noms = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^Saldo [\d.]+$/.test(t.characters.trim())).slice(0, 12);
    out.danaCards = noms.map((t) => {
      const p = t.parent;
      return { text: t.characters, card: p ? { name: p.name, type: p.type } : null,
        cardTexts: p ? p.findAllWithCriteria({ types: ["TEXT"] }).map((x) => x.characters) : [] };
    });
  }
}
// 7. Baris ringkasan Sukses Desktop (untuk sisip Waktu/Salin/garansi): teks + induknya
{
  const fr = F("36:166");
  if (fr) {
    const rows = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /^(Nomor transaksi|Total|Waktu|Status|Metode|Pembayaran|Harga|Biaya|Diskon|Item|Produk)/.test(t.characters.trim()));
    out.suksesRows = rows.map((t) => ({ text: t.characters.slice(0, 60), id: t.id,
      parent: t.parent ? t.parent.name + " [" + t.parent.type + "]" : "?",
      grand: t.parent && t.parent.parent ? t.parent.parent.name + " [" + t.parent.parent.type + "]" : "?" }));
  }
}
return out;
