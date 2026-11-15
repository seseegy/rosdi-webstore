// Probe read-only Siklus 153: peta seksi util "Pulsa, Data, PLN, E-Wallet &
// Tagihan" di Beranda Desktop Light (20:2) + Dark (21:2) — kartu util
// (posisi/ukuran/isi teks) + y seksi berikutnya ("Kenapa Rosdi Store").
function probe(frameId) {
  const f = figma.getNodeById(frameId);
  if (!f) return { frameId, error: "tidak ditemukan" };
  const head = f.findAll((n) => n.type === "TEXT" && (n.characters || "").indexOf("Pulsa, Data, PLN") === 0)[0];
  const headY = head ? Math.round(head.y) : -1;
  const headChars = head ? head.characters : "";
  const cards = [];
  for (const c of f.children) {
    if (c.type !== "FRAME") continue;
    if (headY >= 0 && c.y < headY) continue;
    const texts = c.findAllWithCriteria({ types: ["TEXT"] });
    const name = texts.find((t) => t.fontSize === 14.5 || t.fontSize === 14);
    if (!name) continue;
    // kartu util: berisi p-from (biru) atau p-sub; bedakan dari kartu game ("Mulai Rp")
    const from = texts.find((t) => (t.characters || "").indexOf("Mulai Rp") === 0);
    if (from) continue;
    cards.push({
      id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y),
      w: Math.round(c.width), h: Math.round(c.height),
      texts: texts.map((t) => ({ id: t.id, chars: (t.characters || "").slice(0, 60), x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height), fs: t.fontSize })),
    });
  }
  cards.sort((a, b) => a.y - b.y || a.x - b.x);
  const lastCardBottom = cards.length ? cards[cards.length - 1].y + cards[cards.length - 1].h : headY;
  const below = f.findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => t.y > lastCardBottom && (t.fontSize || 0) >= 15)
    .map((t) => ({ chars: (t.characters || "").slice(0, 40), y: Math.round(t.y) }))
    .sort((a, b) => a.y - b.y).slice(0, 5);
  return { frameId, name: f.name, w: Math.round(f.width), h: Math.round(f.height), headY, headChars, nCards: cards.length, cards, below };
}
return { light: probe("20:2"), dark: probe("21:2") };
