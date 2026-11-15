// Read-only audit s443c (Figma): frame langkah pendek, ancestor badge/was,
// anak langsung modal, harga nominal + parent, copyright mobile.
const out = {};
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
const all = (f) => f.findAll(() => true);

// 1. Frame langkah pendek (judul < 5) — nama + urutan judul
out.shortStepFrames = [];
for (const f of frames) {
  const titles = [];
  for (const n of all(f)) {
    if (n.type !== "TEXT") continue;
    const t = (n.characters || "").trim();
    if (/^(Masukkan|Pilih Nominal|Pilih Tagihan|Jumlah Pembelian|Pilih Pembayaran|Detail Kontak|Kode Promo|Masukkan Nomor|Masukkan ID|Masukkan Email)/.test(t)) titles.push(t.slice(0, 30));
  }
  const uniq = [...new Set(titles)];
  if (uniq.length > 0 && uniq.length < 5 && !/indeks|index|cara|cek|sukses/i.test(f.name)) {
    out.shortStepFrames.push({ frame: f.name, titles: uniq });
  }
}

// 2. Ancestor badge -10% (4 level)
out.badgeAncestors = [];
for (const f of frames) {
  if (!/beranda/i.test(f.name)) continue;
  for (const n of all(f)) {
    if (n.type === "TEXT" && /^-\d+%$/.test((n.characters || "").trim())) {
      const chain = [];
      let cur = n.parent;
      for (let i = 0; i < 4 && cur; i++) {
        chain.push({ type: cur.type, name: (cur.name || "").slice(0, 30), w: Math.round(cur.width), h: Math.round(cur.height), x: Math.round(cur.x), y: Math.round(cur.y) });
        cur = cur.parent;
      }
      out.badgeAncestors.push({ frame: f.name, chain });
      break; // satu sampel per frame cukup
    }
  }
}

// 3. Ancestor was (satu sampel per frame)
out.wasAncestors = [];
for (const f of frames) {
  for (const n of all(f)) {
    if (n.type === "TEXT" && n.textDecoration === "STRIKETHROUGH") {
      const chain = [];
      let cur = n.parent;
      for (let i = 0; i < 4 && cur; i++) {
        chain.push({ type: cur.type, name: (cur.name || "").slice(0, 30), w: Math.round(cur.width), h: Math.round(cur.height), x: Math.round(cur.x), y: Math.round(cur.y) });
        cur = cur.parent;
      }
      // harga final terdekat dalam ancestor yang sama (level 2)
      let sib = [];
      if (chain.length >= 2) {
        let anc = n.parent;
        for (let i = 0; i < 2 && anc; i++) anc = anc.parent;
        if (anc && anc.findAll) sib = anc.findAll((x) => x.type === "TEXT" && /^Rp[\d.]+$/.test((x.characters || "").trim())).map((x) => ({ t: x.characters, x: Math.round(x.x), y: Math.round(x.y), size: x.fontSize }));
      }
      out.wasAncestors.push({ frame: f.name, was: n.characters, wx: Math.round(n.x), wy: Math.round(n.y), wsize: n.fontSize, chain, sibPrices: sib.slice(0, 6) });
      break;
    }
  }
}

// 4. Anak langsung frame Modal
out.modalChildren = [];
for (const f of frames) {
  if (!/modal/i.test(f.name)) continue;
  out.modalChildren.push({
    frame: f.name,
    kids: (f.children || []).slice(0, 8).map((k) => ({ type: k.type, name: (k.name || "").slice(0, 30), w: Math.round(k.width), h: Math.round(k.height), radius: k.cornerRadius === undefined ? null : k.cornerRadius })),
  });
}

// 5. Harga nominal di frame produk: teks Rp + nama parent + fontSize (sampel 24)
out.nominalSamples = [];
for (const f of frames) {
  if (/beranda|modal|cek|sukses|indeks|index/i.test(f.name)) continue;
  for (const n of all(f)) {
    if (n.type === "TEXT" && /^Rp[\d.]+$/.test((n.characters || "").trim())) {
      const par = n.parent;
      out.nominalSamples.push({ frame: f.name, text: n.characters, size: n.fontSize, parent: par ? (par.type + ":" + (par.name || "").slice(0, 30)) : null, pw: par ? Math.round(par.width) : null, ph: par ? Math.round(par.height) : null });
      if (out.nominalSamples.length >= 24) break;
    }
  }
  if (out.nominalSamples.length >= 24) break;
}

// 6. Copyright di frame mobile
out.copyrightMobile = [];
for (const f of frames) {
  if (f.width > 400) continue;
  const hits = all(f).filter((n) => n.type === "TEXT" && /©|2026 Rosdi|Hak cipta/i.test(n.characters || "")).map((n) => n.characters.slice(0, 40));
  if (hits.length) out.copyrightMobile.push({ frame: f.name, hits });
}
return out;
