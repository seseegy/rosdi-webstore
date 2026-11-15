// Read-only audit s443b (Figma): langkah (nomor+judul+font), footer mobile,
// radius kartu modal, badge vs kartu flash, was vs harga final, harga nominal.
const out = {};
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
const all = (f) => f.findAll(() => true);
const isMobile = (f) => f.width <= 400;

// Langkah: agregasi urutan judul + ukuran font (bukan daftar per frame)
out.stepTitles = { variants: {}, sizes: {}, digitSizes: {}, framesWithTitles: 0, framesWithDigits: 0, oddFrames: [] };
for (const f of frames) {
  const titles = [];
  const digits = [];
  for (const n of all(f)) {
    if (n.type !== "TEXT") continue;
    const t = (n.characters || "").trim();
    if (/^(Masukkan|Pilih|Jumlah|Detail|Kode)/.test(t)) titles.push({ text: t.slice(0, 40), size: n.fontSize, y: Math.round(n.y) });
    else if (/^[1-6]$/.test(t)) digits.push({ d: t, size: n.fontSize, y: Math.round(n.y) });
  }
  if (titles.length) {
    out.stepTitles.framesWithTitles++;
    const key = titles.map((t) => t.text).join(" | ");
    out.stepTitles.variants[key] = (out.stepTitles.variants[key] || 0) + 1;
    for (const t of titles) out.stepTitles.sizes[String(t.size)] = (out.stepTitles.sizes[String(t.size)] || 0) + 1;
  }
  if (digits.length) {
    out.stepTitles.framesWithDigits++;
    for (const x of digits) out.stepTitles.digitSizes[String(x.size)] = (out.stepTitles.digitSizes[String(x.size)] || 0) + 1;
    const nums = digits.map((x) => parseInt(x.d, 10));
    const sorted = [...nums].sort((a, b) => a - b);
    if (JSON.stringify(nums) !== JSON.stringify(sorted) || new Set(nums).size !== nums.length) {
      if (out.stepTitles.oddFrames.length < 6) out.stepTitles.oddFrames.push({ frame: f.name, digits: nums });
    }
  }
}

// Footer di frame mobile: node bernama footer/copyright/© di sepertiga bawah
out.mobileFooter = []; out.mobileFooterZero = 0;
for (const f of frames) {
  if (!isMobile(f)) continue;
  const hits = [];
  for (const n of all(f)) {
    if (/footer|copyright|©|Rosdi Store/i.test(n.name || "") && n.y > f.height * 0.66) {
      hits.push({ name: (n.name || "").slice(0, 40), type: n.type, y: Math.round(n.y), h: Math.round(n.height) });
    }
  }
  if (hits.length === 0) out.mobileFooterZero++;
  if (out.mobileFooter.length < 6) out.mobileFooter.push({ frame: f.name, h: Math.round(f.height), hits: hits.slice(0, 4), nHits: hits.length });
}

// Kartu modal: anak frame yang memuat judul modal
out.modalCards = [];
for (const f of frames) {
  if (!/modal/i.test(f.name)) continue;
  for (const k of (f.children || [])) {
    const texts = ('findAll' in k && k.findAll) ? k.findAll((n) => n.type === "TEXT").map((n) => n.characters) : [];
    if (texts.some((t) => /Masuk ke|Syarat|Kebijakan/.test(t))) {
      out.modalCards.push({ frame: f.name, node: (k.name || "").slice(0, 40), w: Math.round(k.width), h: Math.round(k.height), radius: k.cornerRadius, pad: k.paddingTop + "/" + k.paddingRight + "/" + k.paddingBottom + "/" + k.paddingLeft });
    }
  }
}

// Badge flash vs kartu + harga: cari teks -10% lalu kartu induknya
out.badgeCard = [];
for (const f of frames) {
  if (!/beranda/i.test(f.name)) continue;
  for (const n of all(f)) {
    if (n.type === "TEXT" && /^-\d+%$/.test((n.characters || "").trim())) {
      let card = n.parent;
      while (card && !(card.type === "FRAME" && card.width >= 300 && card.height >= 80 && card !== f)) card = card.parent;
      const info = { frame: f.name, badge: n.characters, bx: Math.round(n.x), by: Math.round(n.y) };
      if (card) {
        info.card = { w: Math.round(card.width), h: Math.round(card.height), x: Math.round(card.x), y: Math.round(card.y) };
        info.rightGap = Math.round((card.x + card.width) - (n.x + n.width));
        info.topGap = Math.round(n.y - card.y);
        const prices = card.findAll((x) => x.type === "TEXT" && /^Rp/.test((x.characters || "").trim()));
        info.prices = prices.map((p) => ({ t: p.characters, x: Math.round(p.x), y: Math.round(p.y), size: p.fontSize }));
      }
      out.badgeCard.push(info);
    }
  }
}

// Was vs harga final: pasangan dalam kartu yang sama
out.wasPairs = [];
for (const f of frames) {
  for (const n of all(f)) {
    if (n.type === "TEXT" && n.textDecoration === "STRIKETHROUGH") {
      let card = n.parent;
      while (card && !(card.type === "FRAME" && card.width >= 100 && card !== f)) card = card.parent;
      const info = { frame: f.name, was: n.characters, wx: Math.round(n.x), wy: Math.round(n.y), wsize: n.fontSize };
      if (card) {
        const prices = card.findAll((x) => x.type === "TEXT" && /^Rp[\d.]+$/.test((x.characters || "").trim()) && x !== n);
        info.final = prices.map((p) => ({ t: p.characters, x: Math.round(p.x), y: Math.round(p.y), size: p.fontSize, dx: Math.round(p.x - n.x), dy: Math.round(p.y - n.y) }));
      }
      out.wasPairs.push(info);
    }
  }
}

// Harga nominal: teks Rp di dalam kartu nominal (parent frame lebar 150-400, tinggi 60-200, berisi nama item)
out.nominalPrices = {};
for (const f of frames) {
  if (/beranda|modal|cek|sukses/i.test(f.name)) continue;
  for (const n of all(f)) {
    if (n.type === "TEXT" && /^Rp[\d.]+$/.test((n.characters || "").trim())) {
      let card = n.parent;
      while (card && !(card.type === "FRAME" && card.width >= 150 && card.width <= 400 && card.height >= 50 && card.height <= 220 && card !== f)) card = card.parent;
      if (card) {
        const k = String(n.fontSize);
        out.nominalPrices[k] = (out.nominalPrices[k] || 0) + 1;
      }
    }
  }
}
return out;
