// Probe Figma s449 v3: susulan i87 (semua tombol Beli) + i90 (placeholder HP/PLN).
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
      radius: typeof n.cornerRadius === "number" ? n.cornerRadius : null,
      chars: n.type === "TEXT" ? n.characters : null,
    });
    if (n.children) for (const c of n.children) visit(c);
  };
  visit(frame);
  return list;
};
const contains = (a, b) => a.x !== null && b.x !== null && b.x >= a.x - 1 && b.y >= a.y - 1 && (b.x + b.w) <= (a.x + a.w + 1) && (b.y + b.h) <= (a.y + a.h + 1);

// i87-beli: semua teks "Beli Sekarang" di 1:208 + container terkecilnya
{
  const nodes = dump(F("1:208"));
  const ts = nodes.filter((n) => n.type === "TEXT" && n.chars === "Beli Sekarang");
  out.beliAll = ts.map((t) => {
    const cands = nodes.filter((n) => n.type !== "TEXT" && n.radius !== null && n.h >= 28 && n.h <= 70 && contains(n, t));
    cands.sort((a, b) => (a.w * a.h) - (b.w * b.h));
    return { textAt: { x: t.x, y: t.y }, container: cands.length ? { radius: cands[0].radius, w: cands[0].w, h: cands[0].h, y: cands[0].y } : null };
  });
}
// i90-hp: semua teks mengandung "08" di frame Pulsa 2:2
{
  const nodes = dump(F("2:2"));
  out.hpTexts = nodes.filter((n) => n.type === "TEXT" && /08/.test(n.chars || "")).map((t) => ({ chars: t.chars, x: t.x, y: t.y, h: t.h }));
  const t = nodes.filter((n) => n.type === "TEXT" && /08x/.test(n.chars || ""))[0];
  if (t) {
    const cands = nodes.filter((n) => n.type !== "TEXT" && n.h >= 30 && n.h <= 70 && contains(n, t));
    cands.sort((a, b) => (a.w * a.h) - (b.w * b.h));
    out.hp = cands.length ? { h: cands[0].h, w: cands[0].w } : { container: null };
  } else out.hp = { textFound: false };
}
// i90-pln: semua teks mengandung "digit" di frame PLN 2:116
{
  const nodes = dump(F("2:116"));
  out.plnTexts = nodes.filter((n) => n.type === "TEXT" && /digit/i.test(n.chars || "")).map((t) => ({ chars: t.chars, x: t.x, y: t.y, h: t.h }));
  const t = nodes.filter((n) => n.type === "TEXT" && /digit/i.test(n.chars || ""))[0];
  if (t) {
    const cands = nodes.filter((n) => n.type !== "TEXT" && n.h >= 30 && n.h <= 70 && contains(n, t));
    cands.sort((a, b) => (a.w * a.h) - (b.w * b.h));
    out.pln = cands.length ? { h: cands[0].h, w: cands[0].w } : { container: null };
  } else out.pln = { textFound: false };
}
return out;
