// Probe read-only Siklus 135: judul seksi util + body S&K di Beranda mobile
// dan latar modal mobile — cek kedaluwarsa vs kode (Home.jsx:120,
// Footer.jsx DOCS.sk). Sertakan geometri agar perbaikan bisa dihitung.
const out = [];
const FRAMES = ["1:2", "1:105", "10:2", "10:105", "13:2", "13:111", "162:2", "162:111"];
for (const fid of FRAMES) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { out.push({ id: fid, error: "hilang" }); continue; }
  const texts = f.findAll((n) => n.type === "TEXT");
  const head = texts.filter((n) => n.name === "HeadUtil").map((n) => ({
    id: n.id, chars: n.characters, x: n.x, y: n.y, w: n.width, h: n.height,
  }));
  const sk = texts.filter((n) => (n.name || "").indexOf("Semua pesanan diproses") === 0).map((n) => ({
    id: n.id, name: n.name, chars: n.characters, x: n.x, y: n.y, w: n.width, h: n.height,
  }));
  // Kartu modal S&K (frame 10:x): cari frame anak bernama "Modal" atau kartu di atas veil
  let card = null;
  if (fid === "10:2" || fid === "10:105") {
    const kids = f.children || [];
    const veilIdx = kids.findIndex((k) => k.name === "Veil");
    const after = veilIdx >= 0 ? kids.slice(veilIdx + 1) : [];
    const c = after.find((k) => k.type === "FRAME" || k.type === "RECTANGLE");
    if (c) card = { id: c.id, name: c.name, x: c.x, y: c.y, w: c.width, h: c.height };
  }
  out.push({ id: fid, name: f.name, frameH: f.height, head, sk, card });
}
return out;
