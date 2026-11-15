// Audit susulan read-only s445 bagian I (ide 85/86/87/88/89): koreksi dua
// heuristik v1 — (a) PASS_THROUGH adalah default Figma untuk frame/grup,
// bukan blend yang mengubah warna; hanya laporkan blend selain NORMAL dan
// PASS_THROUGH. (b) Divider dibandingkan dengan kartu induk yang
// mengandungnya secara visual (bukan lebar frame): cari node terkecil yang
// memuat titik tengah divider. Plus: was di frame Dark + isi nominal frame
// Pencarian "mlbb".
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");

// ide 85 (koreksi): blend mode yang benar-benar mengubah warna
const blendReal = [];
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    if (n.blendMode && n.blendMode !== "NORMAL" && n.blendMode !== "PASS_THROUGH") {
      if (blendReal.length < 80) blendReal.push({ frame: f.name, nama: n.name, tipe: n.type, blend: n.blendMode });
    }
  }
}

// ide 86 (koreksi): divider vs kartu induk visual
function containerOf(frame, div) {
  const cx = div.x + div.width / 2, cy = div.y + div.height / 2;
  let best = null;
  for (const n of frame.findAll(() => true)) {
    if (n === div || n.type === "TEXT") continue;
    if (typeof n.width !== "number" || n.width <= div.width) continue;
    if (n.x <= cx && cx <= n.x + n.width && n.y <= cy && cy <= n.y + n.height) {
      if (!best || n.width < best.width) best = n;
    }
  }
  return best;
}
const dividers = [];
for (const f of frames) {
  for (const n of f.findAll(() => true)) {
    const isDivider = n.type === "LINE" || /divider|pemisah|separator/i.test(n.name || "") ||
      /^(CopyrightLine|SumDivider)$/.test(n.name || "") ||
      (n.type === "RECTANGLE" && (n.height <= 2 || n.width <= 2));
    if (!isDivider) continue;
    const w = Math.round(n.width), h = Math.round(n.height);
    if (!(h <= 2 && w > 2)) continue;
    const c = containerOf(f, n);
    dividers.push({
      frame: f.name, nama: n.name, w,
      induk: c ? c.name : "(frame)", indukW: c ? Math.round(c.width) : Math.round(f.width),
      pasLebarPenuh: c ? w === Math.round(c.width) : w === Math.round(f.width),
      pasDenganPadding32: c ? w === Math.round(c.width) - 32 : w === Math.round(f.width) - 32,
    });
  }
}
const divMismatch = dividers.filter((d) => !d.pasLebarPenuh && !d.pasDenganPadding32);

// ide 89 (lengkap): was di Light + Dark
const flashFrames = ["Beranda — Light", "Beranda — Dark", "Beranda — Desktop — Light", "Beranda — Desktop — Dark", "Beranda — Pencarian “mlbb” — Light", "Beranda — Pencarian “mlbb” — Dark"];
const flashWas = {};
for (const name of flashFrames) {
  const f = frames.find((x) => x.name === name);
  if (!f) { flashWas[name] = "FRAME-TIDAK-ADA"; continue; }
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  flashWas[name] = texts.filter((t) => /^Rp[\d.]+$/.test((t.characters || "").trim())).map((t) => {
    let strike = null;
    try { strike = t.textDecoration; } catch { /* abaikan */ }
    return { teks: t.characters, coret: strike, y: Math.round(t.y) };
  });
}

// ide 87/88 (lengkap): apa saja teks nominal di frame Pencarian "mlbb"?
const penc = frames.find((x) => x.name === "Beranda — Pencarian “mlbb” — Light");
const pencarianNominal = penc
  ? penc.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Diamonds|Terlaris|-5%/.test(t.characters || "")).map((t) => t.characters)
  : "FRAME-TIDAK-ADA";

return {
  frameCount: frames.length,
  blendReal: { count: blendReal.length, items: blendReal },
  dividers: { total: dividers.length, mismatch: divMismatch.length, items: divMismatch.slice(0, 40) },
  flashWas, pencarianNominal,
};
