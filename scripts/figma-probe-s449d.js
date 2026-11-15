// Probe Figma s449 v4: tinggi input HP (Pulsa) + PLN dari teks contoh yang ada.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const out = {};
const dump = (frame) => {
  const list = [];
  const visit = (n) => {
    const b = n.absoluteBoundingBox;
    list.push({
      type: n.type, x: b ? r1(b.x) : null, y: b ? r1(b.y) : null,
      w: b ? r1(b.width) : null, h: b ? r1(b.height) : null,
      chars: n.type === "TEXT" ? n.characters : null,
    });
    if (n.children) for (const c of n.children) visit(c);
  };
  visit(frame);
  return list;
};
const contains = (a, b) => a.x !== null && b.x !== null && b.x >= a.x - 1 && b.y >= a.y - 1 && (b.x + b.w) <= (a.x + a.w + 1) && (b.y + b.h) <= (a.y + a.h + 1);
const inputH = (fid, re, label) => {
  const nodes = dump(F(fid));
  const t = nodes.filter((n) => n.type === "TEXT" && re.test(n.chars || ""))[0];
  if (!t) return { label, textFound: false };
  const cands = nodes.filter((n) => n.type !== "TEXT" && n.h >= 30 && n.h <= 70 && contains(n, t));
  cands.sort((a, b) => (a.w * a.h) - (b.w * b.h));
  return { label, text: t.chars, container: cands.length ? { h: cands[0].h, w: cands[0].w } : null };
};
out.hp = inputH("2:2", /0812 3456 7890/, "hp");
out.pln = inputH("2:116", /5432|ID Pelanggan|11/, "pln");
// juga: semua teks input di frame PLN (cari placeholder-nya)
{
  const nodes = dump(F("2:116"));
  out.plnInputTexts = nodes.filter((n) => n.type === "TEXT" && /^\d[\d\s]{6,}$/.test((n.chars || "").trim())).map((t) => t.chars);
}
return out;
