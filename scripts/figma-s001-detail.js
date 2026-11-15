// Probe read-only batch s001 (lanjutan): detail kartu/nama/badge/field/voucher.
function hex(c) {
  const v = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + v(c.r) + v(c.g) + v(c.b);
}
function abs(n) { const t = n.absoluteTransform; return t ? { x: t[0][2], y: t[1][2] } : { x: n.x, y: n.y }; }
function fillsOf(n) {
  const out = [];
  if (Array.isArray(n.fills)) for (const p of n.fills) if (p && p.type === "SOLID" && p.color) out.push(hex(p.color).toLowerCase());
  return out;
}
const page = figma.currentPage;
const frames = page.children.filter((n) => n.type === "FRAME");
const byName = (re) => frames.find((f) => re.test(f.name));
const out = {
  cardRadiusHist: {}, cardRadiusNon14: [],
  gameNames: [], badgeTexts: [], vaNote: null, danaTiles: [],
  fieldCounts: { light: 0, dark: 0 }, blessing: null, voucherMarkup: [],
  boldTotal: 0, boldByFrame: {}, suksesSelesai: [], suksesDarkCheck: null,
  heroDark: null, placeholders: [], totalVsPrice: null, nomCell: null,
  wildRiftLogo: null,
};
for (const f of frames) {
  const all = f.findAll(() => true);
  for (const n of all) {
    // radius kartu: FRAME non-top-level lebar >= 100 tinggi >= 40
    if (n.type === "FRAME" && n !== f && n.width >= 100 && n.height >= 40 && typeof n.cornerRadius === "number") {
      const r = n.cornerRadius;
      out.cardRadiusHist[r] = (out.cardRadiusHist[r] || 0) + 1;
      if (r !== 14 && out.cardRadiusNon14.length < 30) out.cardRadiusNon14.push({ frame: f.name, node: n.name, r, w: Math.round(n.width), h: Math.round(n.height) });
    }
    if (n.type === "TEXT") {
      const c = n.characters || "";
      const style = n.fontName ? n.fontName.style : "?";
      if (style === "Bold" || style === "Extra Bold") {
        out.boldTotal++;
        out.boldByFrame[f.name] = (out.boldByFrame[f.name] || 0) + 1;
      }
      if (/^(League of Legends: Wild Rift|Arena of Valor|Honor of Kings|Call of Duty: Mobile)$/.test(c.trim()) && /Beranda — Light$/.test(f.name)) {
        const p = n.parent;
        out.gameNames.push({ chars: c.trim(), w: Math.round(n.width), h: Math.round(n.height), size: n.fontSize, parent: p ? p.name : "?", pw: p ? Math.round(p.width) : 0, autoResize: n.textAutoResize });
      }
      if ((c.trim() === "Terlaris" || c.trim() === "-5%" || c.trim() === "-10%") && out.badgeTexts.length < 12) {
        out.badgeTexts.push({ frame: f.name, chars: c.trim(), size: n.fontSize, style, w: Math.round(n.width), h: Math.round(n.height) });
      }
      if (c.includes("Virtual Account · BCA") && !out.vaNote) out.vaNote = { frame: f.name, chars: c, size: n.fontSize };
      if (c.trim() === "Blessing of the Welkin Moon" && !out.blessing) {
        const p = n.parent;
        out.blessing = { frame: f.name, w: Math.round(n.width), size: n.fontSize, parent: p ? p.name : "?", pw: p ? Math.round(p.width) : 0 };
      }
      if (/markup|biaya layanan|termasuk margin/i.test(c) && /Voucher/i.test(f.name)) out.voucherMarkup.push({ frame: f.name, chars: c.slice(0, 80) });
      if (c.trim() === "Selesai" && /^Sukses — (Light|Dark)$/.test(f.name)) {
        out.suksesSelesai.push({ frame: f.name, parent: n.parent ? n.parent.name : "?", fills: fillsOf(n), size: n.fontSize, x: Math.round(abs(n).x - abs(f).x), y: Math.round(abs(n).y - abs(f).y) });
      }
      if (/^(12345678|08xxxxxxxxxx|NamaKamu#TAG12|Punya kode promo\? Coba ROSDI10)$/.test(c.trim())) {
        if (out.placeholders.length < 12) out.placeholders.push({ frame: f.name, chars: c.trim().slice(0, 30), fills: fillsOf(n), size: n.fontSize });
      }
    }
    // field fills
    if (/input|field/i.test(n.name)) {
      const fl = fillsOf(n);
      if (/Dark/.test(f.name) && fl.includes("#0e1930")) out.fieldCounts.dark++;
      if (/Light/.test(f.name) && fl.includes("#f8fafc")) out.fieldCounts.light++;
    }
  }
}
// E-Wallet Light: tile DANA + semua tile e-wallet
const ew = byName(/^E-Wallet — Light$/);
if (ew) {
  for (const n of ew.findAll((x) => /^Tile /.test(x.name))) {
    out.danaTiles.push({ node: n.name, fills: fillsOf(n), r: n.cornerRadius });
  }
}
// Sukses Dark: lingkaran big-check + glyph
const sd = byName(/^Sukses — Dark$/);
if (sd) {
  const circ = sd.findAll((x) => /big.?check|check.?circle|ellipse/i.test(x.name)).slice(0, 3).map((x) => ({ name: x.name, fills: fillsOf(x), w: Math.round(x.width) }));
  const glyph = sd.findAll((x) => x.type === "TEXT" && x.characters.trim() === "✓").slice(0, 2).map((x) => ({ fills: fillsOf(x), size: x.fontSize }));
  out.suksesDarkCheck = { circ, glyph };
}
// Hero Dark: latar hero vs latar frame
const bd = byName(/^Beranda — Dark$/);
if (bd) {
  const hero = bd.findAll((x) => /hero/i.test(x.name)).slice(0, 3).map((x) => ({ name: x.name, fills: fillsOf(x) }));
  out.heroDark = { frameFill: fillsOf(bd), hero };
}
// Total vs harga di Produk Game Light
const pg = byName(/^Produk Game \(6 Langkah\) — Light$/);
if (pg) {
  const totals = pg.findAll((x) => x.type === "TEXT" && /^Total/.test(x.characters.trim())).map((x) => ({ chars: x.characters.trim().slice(0, 30), size: x.fontSize }));
  const prices = pg.findAll((x) => x.type === "TEXT" && /^Rp[\d.]+$/.test(x.characters.trim())).slice(0, 3).map((x) => ({ chars: x.characters.trim(), size: x.fontSize }));
  // sel nominal: cari frame anak bernama *Nom* / kartu nominal pertama
  const nom = pg.findAll((x) => x.type === "FRAME" && /nom|86 Diamonds/i.test(x.name)).slice(0, 3).map((x) => ({ name: x.name, w: Math.round(x.width), h: Math.round(x.height), r: x.cornerRadius }));
  out.totalVsPrice = { totals, prices, nom };
}
// Wild Rift: adakah image fill / logo di frame game-nya?
const wr = byName(/^League of Legends: Wild Rift — Light$/);
if (wr) {
  const imgs = wr.findAll((x) => Array.isArray(x.fills) && x.fills.some((p) => p && p.type === "IMAGE"));
  out.wildRiftLogo = { imageFillCount: imgs.length, sample: imgs.slice(0, 3).map((x) => x.name) };
}
return out;
