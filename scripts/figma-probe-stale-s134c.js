// Probe read-only Siklus 134c: characters HeadUtil + body S&K/Refund di Beranda
// dan klon modal (mobile + desktop) — cek kedaluwarsa vs kode (Home.jsx:120,
// Footer.jsx DOCS.sk/refund).
const out = [];
const FRAMES = ["1:2", "1:105", "20:2", "21:2", "10:2", "10:105", "13:2", "13:111", "165:2", "165:247", "170:2", "170:247", "170:492", "170:737"];
for (const fid of FRAMES) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { out.push({ id: fid, error: "hilang" }); continue; }
  const texts = f.findAll((n) => n.type === "TEXT");
  const head = texts.filter((n) => n.name === "HeadUtil").map((n) => n.characters);
  const sk = texts.filter((n) => (n.name || "").indexOf("Semua pesanan diproses") === 0).map((n) => n.characters);
  const rf = texts.filter((n) => (n.name || "").indexOf("Pesanan yang gagal terproses") === 0).map((n) => n.characters);
  out.push({ id: fid, name: f.name, head, sk: sk.map((s) => s.slice(0, 120)), rf: rf.map((s) => s.slice(0, 120)) });
}
return out;
