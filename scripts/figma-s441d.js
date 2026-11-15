// Read-only audit s441 (D): pelengkap — rect tombol CTA hero, tinggi kartu game
// Beranda & kartu nominal produk, baris Danamon mobile vs BCA, ada/tidaknya
// footer + chip pembayaran di frame Beranda mobile.
const frames = [];
for (const p of figma.root.children) {
  for (const n of p.children) if (n.type === "FRAME") frames.push(n);
}
const byName = {};
for (const f of frames) byName[f.name] = f;
const out = {};
function contains(a, b, pad) {
  return a.x - pad <= b.x && a.y - pad <= b.y && a.x + a.width + pad >= b.x + b.width && a.y + a.height + pad >= b.y + b.height;
}

// --- 100b: rect tombol CTA hero "Mulai top up" (rect terkecil yang memuat teks)
const cta = [];
for (const fname of ["Beranda — Light", "Beranda — Dark", "Beranda — Desktop — Light", "Beranda — Desktop — Dark"]) {
  const f = byName[fname];
  if (!f) continue;
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    if (/mulai top up/i.test(t.characters || "")) {
      const all = f.findAll(() => true);
      const cands = [];
      for (const n of all) {
        if ((n.type === "RECTANGLE" || n.type === "FRAME") && n !== t && contains(n, t, 2)) cands.push(n);
      }
      cands.sort((a, b) => (a.width * a.height) - (b.width * b.height));
      const w = cands[0];
      cta.push({ frame: fname, frameW: Math.round(f.width), textW: Math.round(t.width), btn: w ? { name: (w.name || "").slice(0, 40), w: Math.round(w.width), h: Math.round(w.height) } : null });
    }
  }
}
out.ctaButtons = cta;

// --- 92b: tinggi kartu game di Beranda + kartu nominal di Produk Game —
// kartu = anak langsung dari container grid (FRAME berisi >=4 anak yang
// masing-masing punya TILE/teks nama); kelompokkan per baris (y)
function cardRows(frameName) {
  const f = byName[frameName];
  if (!f) return null;
  const res = [];
  const all = f.findAll(() => true);
  for (const n of all) {
    if ((n.type === "FRAME" || n.type === "GROUP") && n.children && n.children.length >= 4) {
      const kids = n.children.filter((c) => c.type === "FRAME" || c.type === "GROUP" || c.type === "RECTANGLE");
      if (kids.length < 4) continue;
      const rows = {};
      for (const c of kids) {
        const key = Math.round(c.y / 4) * 4;
        (rows[key] = rows[key] || []).push({ name: (c.name || "").slice(0, 40), h: Math.round(c.height) });
      }
      for (const k of Object.keys(rows)) {
        const hs = [...new Set(rows[k].map((r) => r.h))];
        res.push({ container: (n.name || "").slice(0, 50), y: +k, n: rows[k].length, heights: hs, uneven: hs.length > 1, sample: rows[k].slice(0, 6).map((r) => r.name + ":" + r.h) });
      }
    }
  }
  return res;
}
out.berandaCardRows = cardRows("Beranda — Light");
out.produkCardRows = cardRows("Produk Game (6 Langkah) — Light");

// --- 98b: baris Danamon mobile — semua frame mobile + bandingkan wrap BCA
const danaMobile = [];
for (const f of frames) {
  if (Math.round(f.width) !== 390) continue;
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const dana = texts.filter((t) => /^Danamon/.test((t.characters || "").trim()));
  if (!dana.length) continue;
  const all = f.findAll(() => true);
  for (const t of dana) {
    let wrap = null;
    for (const n of all) {
      if ((n.type === "RECTANGLE" || n.type === "FRAME") && contains(n, t, 2)) {
        if (!wrap || n.width * n.height < wrap.width * wrap.height) wrap = n;
      }
    }
    const bca = texts.find((x) => /^BCA Virtual Account/.test((x.characters || "").trim()));
    let bcaWrap = null;
    if (bca) {
      for (const n of all) {
        if ((n.type === "RECTANGLE" || n.type === "FRAME") && contains(n, bca, 2)) {
          if (!bcaWrap || n.width * n.height < bcaWrap.width * bcaWrap.height) bcaWrap = n;
        }
      }
    }
    danaMobile.push({
      frame: f.name, danaOpacity: t.opacity,
      wrap: wrap ? { name: (wrap.name || "").slice(0, 40), w: Math.round(wrap.width), h: Math.round(wrap.height), opacity: wrap.opacity, fills: (wrap.fills || []).map((fl) => fl.type + ":" + (fl.color ? [fl.color.r, fl.color.g, fl.color.b].map((v) => v.toFixed(2)).join(",") : "?")) } : null,
      bcaWrap: bcaWrap ? { name: (bcaWrap.name || "").slice(0, 40), w: Math.round(bcaWrap.width), h: Math.round(bcaWrap.height), opacity: bcaWrap.opacity, fills: (bcaWrap.fills || []).map((fl) => fl.type + ":" + (fl.color ? [fl.color.r, fl.color.g, fl.color.b].map((v) => v.toFixed(2)).join(",") : "?")) } : null,
    });
  }
}
out.danamonMobile = danaMobile.slice(0, 10);
out.danamonMobileCount = danaMobile.length;

// --- 99b: apakah frame Beranda mobile punya footer / teks chip pembayaran?
const CHIPS = ["QRIS", "GoPay", "DANA", "OVO", "ShopeePay", "BCA", "Mandiri", "BRI", "Alfamart", "Indomaret", "Pulsa"];
const footerCheck = {};
for (const fname of ["Beranda — Light", "Beranda — Dark", "Beranda — Desktop — Light", "Beranda — Desktop — Dark"]) {
  const f = byName[fname];
  if (!f) continue;
  const texts = f.findAllWithCriteria({ types: ["TEXT"] }).map((t) => (t.characters || "").trim());
  footerCheck[fname] = {
    hasFooterWord: texts.some((t) => /footer/i.test(t)),
    hasCopyright: texts.some((t) => /© 2026/.test(t)),
    chipsFound: CHIPS.filter((c) => texts.includes(c)),
    hasPembayaranHeading: texts.some((t) => /^Pembayaran$/.test(t)),
  };
}
out.footerCheck = footerCheck;
return out;
