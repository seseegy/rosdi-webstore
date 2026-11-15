// Probe s434c — read-only: geometri detail untuk ide 3,5,6,15,21,26,29,30.
// - badge "-10%"/"-5%"/"Flash sale"/"Terlaris": fontSize + fill + posisi
// - batang progress: lebar relatif terhadap track-nya (cari pasangan rect tipis)
// - kartu trust: y ikon vs y judul vs y deskripsi (cari teks judul trust)
// - hero: y h1/sub/CTA di Beranda mobile + desktop
// - footer: kolom + copyright di Beranda mobile + desktop
const hex = (fills) => {
  if (!fills || !fills.length) return null;
  const s = fills.find((x) => x.type === "SOLID");
  if (!s) return fills[0].type;
  const c = s.color;
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return "#" + to(c.r) + to(c.g) + to(c.b);
};
const frames = figma.currentPage.children;
const byId = {};
for (const f of frames) byId[f.id] = f;
const out = {};
const dump = (fid, label) => {
  const f = byId[fid];
  if (!f) { out[label] = "FRAME HILANG"; return; }
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  const badges = texts.filter((t) => /^-?\d+%$/.test(t.characters.trim()) || /^(Flash sale|Terlaris)$/.test(t.characters.trim()))
    .map((t) => ({ c: t.characters.trim(), fs: t.fontSize, fill: hex(t.fills), x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height), parent: t.parent ? t.parent.name : null }));
  // Progress: rect tipis + track-nya (rect tipis lain di y sama, lebar lebih besar)
  const thin = f.findAllWithCriteria({ types: ["RECTANGLE"] }).filter((r) => r.height <= 8 && r.width > 40);
  const progress = thin.map((r) => ({ name: r.name, fill: hex(r.fills), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }));
  // Trust: cari judul trust + teks di sekitarnya (y berdekatan)
  const trustTitles = ["Proses instan", "Harga transparan", "Garansi uang kembali", "CS 24/7"];
  const trust = texts.filter((t) => trustTitles.includes(t.characters.trim())).map((t) => {
    const near = texts.filter((u) => Math.abs(u.y - t.y) < 90 && u !== t)
      .map((u) => ({ c: u.characters.trim().slice(0, 60), fs: u.fontSize, x: Math.round(u.x), y: Math.round(u.y), w: Math.round(u.width) }));
    return { title: t.characters.trim(), fs: t.fontSize, x: Math.round(t.x), y: Math.round(t.y), near };
  });
  // Ikon trust: node (bukan teks) di dekat judul trust — cari semua node
  // anak langsung frame dengan y dalam 60px di atas judul trust
  const trustIcons = [];
  for (const t of trust) {
    const cand = f.findAll((n) => n.type !== "TEXT" && Math.abs(n.y - (t.y - 20)) < 60 && Math.abs(n.x - t.x) < 70 && n.width <= 60 && n.height <= 60);
    trustIcons.push({ title: t.title, icons: cand.map((n) => ({ type: n.type, name: n.name, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) })) });
  }
  // Hero: h1 + sub + CTA
  const hero = texts.filter((t) => /Top up, harga final/.test(t.characters) || /Harga final terlihat/.test(t.characters) || t.characters.trim() === "Mulai top up")
    .map((t) => ({ c: t.characters.trim().slice(0, 90), fs: t.fontSize, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.width), h: Math.round(t.height) }));
  // Countdown chip
  const countdown = texts.filter((t) => /Berakhir/.test(t.characters))
    .map((t) => ({ c: t.characters.trim(), fs: t.fontSize, x: Math.round(t.x), y: Math.round(t.y) }));
  // Footer: teks copyright + judul kolom
  const footer = texts.filter((t) => /© 2026/.test(t.characters) || ["Produk", "Bantuan", "Pembayaran"].includes(t.characters.trim()))
    .map((t) => ({ c: t.characters.trim().slice(0, 80), fs: t.fontSize, x: Math.round(t.x), y: Math.round(t.y) }));
  out[label] = { badges, progress, trust, trustIcons, hero, countdown, footer };
};
dump("1:2", "Beranda-L");
dump("1:105", "Beranda-D");
dump("20:2", "BerandaDesk-L");
dump("1:208", "ProdukGame-L");
dump("26:2", "ProdukGameDesk-L");
return out;
