// Probe Figma s458 E61 lanjutan (read-only): baris VA di 26:2 (nama lengkap).
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) }; };
const fr = F("26:2");
const pays = fr.findAll((n) => /^Pay /.test(n.name) && !/Mark|Name|Desc|Price|Fee|Group/.test(n.name))
  .map((n) => ({ n: n.name, ...box(n) }));
return { count: pays.length, pays };
