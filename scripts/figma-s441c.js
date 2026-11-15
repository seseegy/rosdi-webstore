// Read-only audit s441 (C): follow-up geometri — field input (kotak ber-stroke),
// tombol (rect pembungkus label), grid kartu bersarang, area footer Beranda
// mobile, baris Danamon vs baris aktif, rect tombol CTA hero.
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
const out = {};

// --- 93b: kotak field input = RECTANGLE/FRAME 40..52 tinggi, lebar >= 180, punya stroke
const fields = [];
for (const f of frames) {
  const all = f.findAll(() => true);
  for (const n of all) {
    if ((n.type === "RECTANGLE" || n.type === "FRAME") && n.height >= 40 && n.height <= 52 && n.width >= 180 && n.strokes && n.strokes.length > 0) {
      fields.push({ frame: f.name, name: (n.name || "").slice(0, 50), w: Math.round(n.width), h: Math.round(n.height) });
    }
  }
}
out.fields = fields.slice(0, 80);
out.fieldsCount = fields.length;
const hc = {};
for (const x of fields) hc[x.h] = (hc[x.h] || 0) + 1;
out.fieldHeights = hc;

// --- 94b: tombol — untuk tiap label, cari TEXT lalu rect pembungkus terkecil
// (saudara kandung / ancestor RECTANGLE/FRAME yang memuat bounds teks)
const LABELS = ["Beli Sekarang", "Pakai", "Lacak", "Cek Nama", "Cek Tagihan", "Tutup", "Masuk", "Salin", "Belanja Lagi", "Cek Transaksi", "Siap, lanjut belanja", "Mulai Top Up"];
function contains(a, b, pad) {
  return a.x - pad <= b.x && a.y - pad <= b.y && a.x + a.width + pad >= b.x + b.width && a.y + a.height + pad >= b.y + b.height;
}
const buttons = [];
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    const ch = (t.characters || "").trim();
    if (!LABELS.includes(ch)) continue;
    // kandidat pembungkus: semua RECTANGLE/FRAME di frame ini
    const cands = [];
    const all = f.findAll(() => true);
    for (const n of all) {
      if ((n.type === "RECTANGLE" || n.type === "FRAME") && n !== t && contains(n, t, 2)) {
        cands.push(n);
      }
    }
    cands.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    const wrap = cands[0];
    buttons.push({
      frame: f.name, label: ch,
      wrap: wrap ? { name: (wrap.name || "").slice(0, 40), w: Math.round(wrap.width), h: Math.round(wrap.height) } : null,
      textW: Math.round(t.width), textH: Math.round(t.height),
    });
  }
}
out.buttons = buttons.slice(0, 100);
out.buttonsCount = buttons.length;

// --- 92b: grid kartu bersarang — node FRAME/GROUP bernama *Grid*/*Cards*/berisi kartu,
// kelompokkan anak langsung per baris (y) dan laporkan baris yang tingginya tidak sama
const grids = [];
for (const f of frames) {
  const all = f.findAll(() => true);
  for (const n of all) {
    if ((n.type === "FRAME" || n.type === "GROUP") && /grid|card|nominal|katalog/i.test(n.name || "") && n.children && n.children.length >= 2) {
      const rows = {};
      for (const c of n.children) {
        const key = Math.round(c.y / 4) * 4;
        (rows[key] = rows[key] || []).push({ name: (c.name || "").slice(0, 40), h: Math.round(c.height) });
      }
      for (const k of Object.keys(rows)) {
        const hs = [...new Set(rows[k].map((r) => r.h))];
        if (hs.length > 1) grids.push({ frame: f.name, container: (n.name || "").slice(0, 50), y: +k, heights: hs, cards: rows[k].map((r) => r.name + ":" + r.h).slice(0, 8) });
      }
    }
  }
}
out.unevenGridRows = grids.slice(0, 30);
out.unevenGridRowsCount = grids.length;

// --- 99b: area footer frame Beranda mobile — semua node di 320px terbawah
const footerArea = {};
for (const f of frames) {
  if (/^Beranda — (Light|Dark)$/.test(f.name)) {
    const all = f.findAll(() => true);
    const bottom = [];
    for (const n of all) {
      const ay = n.absoluteTransform ? n.absoluteTransform[1][2] - f.y : n.y;
      if (ay > f.height - 340) {
        bottom.push({ name: (n.name || "").slice(0, 60), type: n.type, x: Math.round((n.absoluteTransform ? n.absoluteTransform[0][2] : n.x) - f.x), y: Math.round(ay), w: Math.round(n.width), h: Math.round(n.height) });
      }
    }
    footerArea[f.name] = { frameH: Math.round(f.height), nodes: bottom.slice(0, 60) };
  }
}
out.footerAreaMobile = footerArea;

// --- 98b: baris Danamon — teks yang diawali "Danamon", rect baris di sekitarnya,
// apakah ada tag "Lagi perbaikan", bandingkan dengan baris BCA di frame yang sama
const danamonRows = [];
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const dana = texts.filter((t) => /^Danamon/.test((t.characters || "").trim()));
  if (!dana.length) continue;
  const all = f.findAll(() => true);
  for (const t of dana) {
    // rect baris: RECTANGLE/FRAME terkecil yang memuat teks + tag perbaikan di dekatnya
    let wrap = null;
    for (const n of all) {
      if ((n.type === "RECTANGLE" || n.type === "FRAME") && contains(n, t, 2)) {
        if (!wrap || n.width * n.height < wrap.width * wrap.height) wrap = n;
      }
    }
    // cari teks "Lagi perbaikan" dalam radius 200px vertikal dari teks Danamon
    const ty = t.absoluteTransform ? t.absoluteTransform[1][2] : t.y;
    const tag = texts.find((x) => /Lagi perbaikan/i.test(x.characters || "") && Math.abs((x.absoluteTransform ? x.absoluteTransform[1][2] : x.y) - ty) < 200);
    // baris BCA pembanding di frame yang sama
    const bca = texts.find((x) => /^BCA Virtual Account/.test((x.characters || "").trim()));
    danamonRows.push({
      frame: f.name,
      danaText: t.characters.slice(0, 40), danaOpacity: t.opacity,
      wrap: wrap ? { name: (wrap.name || "").slice(0, 40), w: Math.round(wrap.width), h: Math.round(wrap.height), opacity: wrap.opacity, fills: (wrap.fills || []).map((fl) => fl.type + ":" + (fl.color ? [fl.color.r, fl.color.g, fl.color.b].map((v) => v.toFixed(2)).join(",") : "?") + "@" + fl.opacity) } : null,
      hasTag: !!tag, tagText: tag ? tag.characters.slice(0, 40) : null,
      bcaOpacity: bca ? bca.opacity : null,
    });
  }
}
out.danamonRows = danamonRows.slice(0, 20);
out.danamonRowsCount = danamonRows.length;
return out;
