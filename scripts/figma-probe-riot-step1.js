// Probe read-only: cari simpul teks Langkah 1 (User ID / Zone ID / catatan /
// hint / judul langkah / Tujuan) di 4 frame Valorant + Wild Rift, plus
// kartu RECTANGLE yang memuatnya. Siklus 137.
const IDS = ["270:2", "270:140", "274:2", "274:140", "280:2", "280:250", "285:2", "285:247"];
const NEEDLES = ["User ID", "Zone ID", "12345678", "1234", "Contoh penulisan",
  "Cara menemukan", "Masukkan User ID", "Tujuan", "Riot ID"];
const out = [];
for (const id of IDS) {
  const f = figma.getNodeById(id);
  if (!f) { out.push({ id, err: "tidak ketemu" }); continue; }
  const hits = [];
  const walk = (n) => {
    if (n.type === "TEXT" && NEEDLES.some((s) => n.characters.indexOf(s) >= 0)) {
      const b = n.absoluteBoundingBox;
      hits.push({ id: n.id, name: n.name, x: Math.round(b.x), y: Math.round(b.y),
        w: Math.round(b.width), h: Math.round(b.height), ch: n.characters.slice(0, 90) });
    }
    if (n.children) n.children.forEach(walk);
  };
  walk(f);
  // kartu langkah 1: RECTANGLE yang memuat teks "User ID" pertama
  let card = null;
  const uid = hits.find((h) => h.ch === "User ID");
  if (uid) {
    const rects = [];
    const walkR = (n) => {
      if (n.type === "RECTANGLE" || n.type === "FRAME") {
        const b = n.absoluteBoundingBox;
        if (b && b.x <= uid.x && b.y <= uid.y && b.x + b.width >= uid.x + uid.w && b.y + b.height >= uid.y + uid.h)
          rects.push({ id: n.id, name: n.name, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) });
      }
      if (n.children) n.children.forEach(walkR);
    };
    walkR(f);
    rects.sort((a, b) => (a.w * a.h) - (b.w * b.h));
    card = rects[0] || null;
  }
  out.push({ id, name: f.name, fw: Math.round(f.width), fh: Math.round(f.height), hits, card });
}
return out;
