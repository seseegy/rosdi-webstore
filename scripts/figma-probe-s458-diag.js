// Diagnostik struktur frame Desktop (read-only): rantai ancestor judul langkah + anak langsung frame.
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; };
const out = {};
for (const [key, fid, heading] of [
  ["game26", "26:2", /Masukkan User ID/],
  ["tsel28", "28:2", /Masukkan Nomor HP/],
]) {
  const fr = F(fid);
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => heading.test(x.characters.trim()));
  const chain = [];
  let a = t ? t.parent : null;
  while (a && a !== fr) { chain.push({ type: a.type, name: a.name, ...box(a) }); a = a.parent; }
  out[key] = {
    frameBox: box(fr),
    headingFound: t ? t.characters.trim() : null,
    headingBox: t ? box(t) : null,
    chain,
    directChildren: fr.children.slice(0, 20).map((c) => ({ type: c.type, name: c.name, ...box(c) })),
    childCount: fr.children.length,
  };
}
return out;
