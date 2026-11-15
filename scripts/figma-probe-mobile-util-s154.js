// Probe read-only Siklus 154: struktur grid util Beranda Mobile Light (1:2)
// + Dark (1:105) — anak langsung frame di area seksi util + y seksi
// berikutnya ("Kenapa Rosdi Store") + tinggi frame.
function probe(frameId) {
  const f = figma.getNodeById(frameId);
  if (!f) return { frameId, error: "tidak ditemukan" };
  const head = f.findAll((n) => n.type === "TEXT" && (n.characters || "").indexOf("Pulsa, Data, PLN") === 0)[0];
  const headY = head ? Math.round(head.y) : -1;
  const headChars = head ? head.characters : "";
  const trust = f.findAll((n) => n.type === "TEXT" && (n.characters || "").indexOf("Kenapa Rosdi Store") === 0)[0];
  const trustY = trust ? Math.round(trust.y) : -1;
  const kids = [];
  for (const c of f.children) {
    if (headY >= 0 && c.y + c.height < headY - 5) continue;
    if (c.y > (trustY >= 0 ? trustY + 40 : f.height)) continue;
    kids.push({ id: c.id, type: c.type, name: (c.name || "").slice(0, 40), x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) });
  }
  kids.sort((a, b) => a.y - b.y || a.x - b.x);
  const texts = f.findAll((n) => n.type === "TEXT" && n.y >= headY - 5 && (trustY < 0 || n.y < trustY))
    .map((t) => ({ id: t.id, chars: (t.characters || "").slice(0, 50), x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  return { frameId, name: f.name, w: Math.round(f.width), h: Math.round(f.height), headY, headChars, trustY, nKids: kids.length, kids, nTexts: texts.length, texts };
}
return { light: probe("1:2"), dark: probe("1:105") };
