// Probe rect-based Figma s452 (ide 47, 50-rect, 51, 52-detail, 57, 58). Read-only.
const r1 = (n) => Math.round(n * 10) / 10;
const hex = (c) => c ? "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") : null;
const box = (n) => { const b = n.absoluteBoundingBox; return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) }; };
const byId = (id) => figma.getNodeById(id);
const out = {};
const rects = (fr) => fr.findAllWithCriteria({ types: ["RECTANGLE", "FRAME"] }).filter((n) => n !== fr);

// 47c: histogram lebar rect di frame produk mobile (kartu langkah 358?)
{
  const res = {};
  for (const [key, id] of [["mlbb", "1:208"], ["pulsa", "2:2"], ["pln", "2:116"], ["dana", "3:2"], ["gp", "3:118"]]) {
    const fr = byId(id);
    const hist = {};
    for (const n of rects(fr)) {
      const w = r1(n.absoluteBoundingBox.width);
      if (w >= 300 && w <= 390) hist[w] = (hist[w] || 0) + 1;
    }
    res[key] = hist;
  }
  out.i47c = res;
}

// 50c: rect tombol CTA di sekitar teks "Mulai top up"
{
  const res = {};
  for (const [key, id, tx, ty] of [["mobLight", "1:2", 53, 260], ["deskLight", "20:2", 126, 10256.5]]) {
    const fr = byId(id);
    const cands = rects(fr).filter((n) => {
      const b = n.absoluteBoundingBox;
      return b.x <= tx && b.x + b.width >= tx + 72 && b.y <= ty && b.y + b.height >= ty + 15;
    }).map((n) => ({ name: n.name, type: n.type, box: box(n), radius: n.cornerRadius, fill: n.fills && n.fills[0] ? hex(n.fills[0].color) : null }));
    res[key] = cands;
  }
  out.i50c = res;
}

// 51c: rect input (h~46) & tombol Lacak di Cek Desktop 36:2
{
  const fr = byId("36:2");
  out.i51c = {
    inputRowRects: rects(fr).filter((n) => { const b = n.absoluteBoundingBox; return b.height >= 44 && b.height <= 48 && b.y > 25140 && b.y < 25200; }).map((n) => ({ name: n.name, box: box(n) })),
    lacRowRects: rects(fr).filter((n) => { const b = n.absoluteBoundingBox; return b.y > 25140 && b.y < 25200 && b.x > 850; }).map((n) => ({ name: n.name, box: box(n) })),
    w640: rects(fr).filter((n) => Math.abs(n.absoluteBoundingBox.width - 640) < 1).map((n) => ({ name: n.name, box: box(n) })),
  };
}

// 52c: detail node tersembunyi + teks di y yang sama
{
  const res = {};
  for (const [key, id, hy] of [["mobLight", "1:2", 346], ["deskLight", "20:2", 10444]]) {
    const fr = byId(id);
    const hidden = fr.findAll((n) => n.visible === false);
    const textsNear = fr.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => Math.abs(t.absoluteBoundingBox.y - hy) < 30).map((t) => ({ text: t.characters.slice(0, 40), box: box(t) }));
    res[key] = hidden.map((n) => ({ name: n.name, type: n.type, box: box(n), fill: n.fills && n.fills[0] ? hex(n.fills[0].color) : null, opacity: n.opacity })) .concat([{ textsNear }]);
  }
  out.i52c = res;
}

// 57c: rect lebar 640 di Cek Desktop + rect kartu hasil (di sekitar teks timeline y)
{
  const fr = byId("36:2");
  const tl = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /Pesanan dibuat/.test(x.characters));
  const tly = tl ? tl.absoluteBoundingBox.y : null;
  out.i57c = {
    w640: rects(fr).filter((n) => Math.abs(n.absoluteBoundingBox.width - 640) < 1).map((n) => ({ name: n.name, box: box(n) })),
    timelineY: tly,
    rectsNearTimeline: tly ? rects(fr).filter((n) => { const b = n.absoluteBoundingBox; return b.y <= tly && b.y + b.height >= tly + 20 && b.width >= 400; }).map((n) => ({ name: n.name, box: box(n) })) : [],
  };
}

// 58c: rect lebar 640 di Sukses Desktop + rect kartu sukses
{
  const fr = byId("36:166");
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => /Pesanan diterima/.test(x.characters));
  const ty = t ? t.absoluteBoundingBox.y : null;
  out.i58c = {
    w640: rects(fr).filter((n) => Math.abs(n.absoluteBoundingBox.width - 640) < 1).map((n) => ({ name: n.name, box: box(n) })),
    titleY: ty,
    rectsNearTitle: ty ? rects(fr).filter((n) => { const b = n.absoluteBoundingBox; return b.y <= ty && b.y + b.height >= ty + 20 && b.width >= 400; }).map((n) => ({ name: n.name, box: box(n) })) : [],
  };
}
return out;
