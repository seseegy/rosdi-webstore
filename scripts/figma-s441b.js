// Read-only audit s441 (B): geometri — grid 8pt, tinggi kartu/baris, input,
// tombol, veil modal, chip footer mobile, lebar CTA hero, baris Danamon.
// Satu tarikan data untuk ide 91-100.
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
frames.sort((a, b) => (a.y - b.y) || (a.x - b.x));
const byName = {};
for (const f of frames) byName[f.name] = f;
const out = { frameCount: frames.length };

// --- 91: grid 8pt — statistik kelipatan 4 pada w/h/x/y semua node + padding/spacing auto-layout
let odd = { w: 0, h: 0, x: 0, y: 0, total: 0 };
const oddExamples = [];
let padOdd = [];
for (const f of frames) {
  const all = f.findAll(() => true);
  for (const n of all) {
    totalCheck(n);
  }
  // padding auto-layout frame itu sendiri
  for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"]) {
    const v = f[k];
    if (typeof v === "number" && v % 4 !== 0 && padOdd.length < 20) padOdd.push({ frame: f.name, prop: k, value: v });
  }
}
function totalCheck(n) {
  odd.total++;
  const w = Math.round(n.width), h = Math.round(n.height);
  const x = Math.round(n.x), y = Math.round(n.y);
  if (w % 4 !== 0) { odd.w++; if (oddExamples.length < 25) oddExamples.push({ name: (n.name || "").slice(0, 50), prop: "w", value: w }); }
  if (h % 4 !== 0) { odd.h++; if (oddExamples.length < 25) oddExamples.push({ name: (n.name || "").slice(0, 50), prop: "h", value: h }); }
  if (x % 4 !== 0) { odd.x++; }
  if (y % 4 !== 0) { odd.y++; }
}
out.grid8pt = { odd, oddExamples, padOdd };

// --- 92: tinggi kartu sebaris — frame Beranda (mobile+desktop) & halaman produk
function rowHeights(frame) {
  const rows = {};
  for (const c of frame.children) {
    const key = Math.round(c.y / 8) * 8;
    (rows[key] = rows[key] || []).push({ name: (c.name || "").slice(0, 40), h: Math.round(c.height), y: Math.round(c.y) });
  }
  const uneven = [];
  for (const k of Object.keys(rows)) {
    const hs = [...new Set(rows[k].map((r) => r.h))];
    if (hs.length > 1) uneven.push({ y: +k, heights: hs, cards: rows[k].map((r) => r.name + ":" + r.h) });
  }
  return uneven;
}
out.rowHeights = {};
for (const f of frames) {
  if (/Beranda/i.test(f.name) || /Mobile Legends|Free Fire|Genshin|Pulsa|PLN|Voucher|E-Wallet|Cek Transaksi/i.test(f.name)) {
    const u = rowHeights(f);
    if (u.length) out.rowHeights[f.name] = u.slice(0, 6);
  }
}

// --- 93: tinggi field input (nama mengandung input/field/uid/nomor/email/promo/cari)
const INPUT_RE = /input|field|uid|nomor|email|promo|cari|pencarian|idpel|billid|\bhp\b|riot/i;
const inputHeights = [];
for (const f of frames) {
  const all = f.findAll(() => true);
  for (const n of all) {
    if (INPUT_RE.test(n.name || "") && n.height >= 30 && n.height <= 60) {
      inputHeights.push({ frame: f.name, name: (n.name || "").slice(0, 60), w: Math.round(n.width), h: Math.round(n.height) });
    }
  }
}
out.inputHeights = inputHeights.slice(0, 60);
out.inputHeightsCount = inputHeights.length;

// --- 94: tinggi tombol (nama mengandung beli/pakai/lacak/cek/tutup/masuk/lanjut/belanja/button)
const BTN_RE = /beli|pakai|lacak|cek|tutup|masuk|lanjut|belanja|button|\bbtn\b|salin|tutup/i;
const btnHeights = [];
for (const f of frames) {
  const all = f.findAll(() => true);
  for (const n of all) {
    if (BTN_RE.test(n.name || "") && n.height >= 20 && n.height <= 70 && n.width >= 40) {
      btnHeights.push({ frame: f.name, name: (n.name || "").slice(0, 60), w: Math.round(n.width), h: Math.round(n.height) });
    }
  }
}
out.btnHeights = btnHeights.slice(0, 80);
out.btnHeightsCount = btnHeights.length;

// --- 95: opasitas veil modal — frame bernama Modal/S&K/Refund/Masuk
const veil = [];
for (const f of frames) {
  if (/modal|masuk|s&k|refund|syarat|pengembalian/i.test(f.name)) {
    const all = f.findAll(() => true);
    for (const n of all) {
      if (n.fills && Array.isArray(n.fills)) {
        for (const fl of n.fills) {
          if (fl && fl.type === "SOLID" && fl.color && fl.color.r < 0.05 && fl.color.g < 0.05 && fl.color.b < 0.05 && n.width > 300) {
            veil.push({ frame: f.name, name: (n.name || "").slice(0, 50), opacity: fl.opacity, w: Math.round(n.width), h: Math.round(n.height) });
          }
        }
      }
    }
  }
}
out.veil = veil;

// --- 98: baris Danamon vs baris aktif (fill/opacity teks + baris)
const danamon = [];
for (const f of frames) {
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    if (/danamon/i.test(t.characters || "")) {
      let p = t.parent;
      danamon.push({ frame: f.name, text: t.characters.slice(0, 40), opacity: t.opacity, fills: (t.fills || []).map((x) => x.type + ":" + (x.color ? [x.color.r, x.color.g, x.color.b].map((v) => v.toFixed(2)).join(",") : "?")), parentType: p ? p.type : "?", parentOpacity: p ? p.opacity : null, parentName: p ? (p.name || "").slice(0, 50) : "" });
    }
  }
}
out.danamon = danamon.slice(0, 12);

// --- 99: chip pembayaran footer di frame Beranda mobile (lebar 390)
const CHIPS = ["QRIS", "GoPay", "DANA", "OVO", "ShopeePay", "BCA", "Mandiri", "BRI", "Alfamart", "Indomaret", "Pulsa"];
const footerChips = {};
for (const f of frames) {
  if (/beranda/i.test(f.name) && Math.round(f.width) === 390) {
    const texts = f.findAllWithCriteria({ types: ["TEXT"] });
    const found = [];
    for (const t of texts) {
      const ch = (t.characters || "").trim();
      if (CHIPS.includes(ch)) {
        const ax = t.absoluteTransform ? t.absoluteTransform[0][2] : t.x;
        const ay = t.absoluteTransform ? t.absoluteTransform[1][2] : t.y;
        found.push({ chip: ch, x: Math.round(ax - f.x), y: Math.round(ay - f.y), w: Math.round(t.width), right: Math.round(ax - f.x + t.width) });
      }
    }
    if (found.length) footerChips[f.name] = { frameW: Math.round(f.width), chips: found, maxRight: Math.max(...found.map((c) => c.right)), rows: [...new Set(found.map((c) => c.y))].length };
  }
}
out.footerChipsMobile = footerChips;

// --- 100: lebar CTA hero "Mulai Top Up" mobile vs desktop
const cta = [];
for (const f of frames) {
  if (/beranda/i.test(f.name)) {
    const texts = f.findAllWithCriteria({ types: ["TEXT"] });
    for (const t of texts) {
      if (/mulai top up/i.test(t.characters || "")) {
        let p = t.parent;
        cta.push({ frame: f.name, frameW: Math.round(f.width), text: t.characters.slice(0, 30), textW: Math.round(t.width), parentName: p ? (p.name || "").slice(0, 50) : "", parentW: p ? Math.round(p.width) : null, parentH: p ? Math.round(p.height) : null });
      }
    }
  }
}
out.heroCta = cta;
return out;
