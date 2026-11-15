// Probe Figma s462b (read-only, susulan): lebar baris metode E56-58,
// "gagal" huruf kecil, lokasi "Cek ID", dan frame berisi "Kuota by.U".
const r1 = (n) => Math.round(n * 10) / 10;
const F = (id) => figma.getNodeById(id);
const box = (n) => { const b = n.absoluteBoundingBox; return b ? { y: r1(b.y), h: r1(b.height), w: r1(b.width), x: r1(b.x) } : null; };
const frameOf = (t) => {
  let p = t.parent;
  while (p) { if (p.type === "FRAME" && p.parent && p.parent.type === "PAGE") return p.name + " (" + p.id + ")"; p = p.parent; }
  return "?";
};
const out = {};

// E56-58: rantai ancestor tiap nama metode (nama, w, h) agar lebar baris ketemu
const chainFor = (fr, name) => {
  const t = fr.findAllWithCriteria({ types: ["TEXT"] }).find((x) => x.characters.trim() === name);
  if (!t) return { name, ditemukan: false };
  const chain = [];
  let a = t.parent;
  while (a && a !== fr) { chain.push({ nama: a.name, tipe: a.type, ...box(a) }); a = a.parent; }
  return { name, ditemukan: true, teks: t.characters.trim(), rantai: chain };
};
const payChains = (fid) => {
  const fr = F(fid);
  if (!fr) return { error: "frame tidak ditemukan: " + fid };
  const names = ["QRIS", "GoPay", "DANA", "OVO", "ShopeePay", "BCA Virtual Account", "Mandiri Virtual Account", "BRI Virtual Account", "Danamon Virtual Account", "Alfamart", "Indomaret", "Pulsa Telkomsel", "Pulsa XL"];
  const step3 = fr.findAll((n) => n.name === "Step3Card")[0];
  const kids = (step3 && "children" in step3) ? step3.children.map((n) => ({ nama: n.name, tipe: n.type, ...box(n) })) : [];
  const payNamed = fr.findAll((n) => /pay/i.test(n.name)).map((n) => ({ nama: n.name, tipe: n.type, ...box(n) }));
  return { frame: fr.name + " (" + fr.id + ")", step3: step3 ? box(step3) : null, anakStep3: kids.slice(0, 20), nodeBernamaPay: payNamed.slice(0, 20), rantai: names.map((n) => chainFor(fr, n)) };
};
out.e56_dana = payChains("31:2");
out.e57_pln = payChains("30:2");
out.e58_voucher = payChains("33:2");

// "gagal" huruf kecil di seluruh file
{
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.includes("gagal"));
  const perFrame = {};
  for (const t of all) { const f = frameOf(t); perFrame[f] = (perFrame[f] || 0) + (t.characters.match(/gagal/g) || []).length; }
  out.gagal_kecil = { jumlahNode: all.length, perFrame, teksUnik: [...new Set(all.map((t) => t.characters.trim()))] };
}
// lokasi teks "Cek ID"
{
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.characters.trim() === "Cek ID");
  out.cek_id = all.map((t) => ({ frame: frameOf(t), teks: t.characters.trim() }));
}
// semua frame yang memuat "Kuota by.U" (untuk E63)
{
  const all = figma.root.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => /Kuota by\.U/.test(t.characters));
  const byFrame = {};
  for (const t of all) { const f = frameOf(t); (byFrame[f] = byFrame[f] || []).push(t.characters.trim()); }
  const frames = Object.keys(byFrame);
  out.byu_frames = { jumlahFrame: frames.length, frames: frames.slice(0, 20) };
  // bila ada: item + harga by.U di frame pertama yang memuatnya
  if (frames.length) {
    const first = figma.root.findAll((n) => n.type === "FRAME" && (n.name + " (" + n.id + ")") === frames[0])[0];
    if (first) {
      const texts = first.findAllWithCriteria({ types: ["TEXT"] }).map((t) => t.characters.trim());
      out.byu_frame_pertama = { frame: frames[0], itemByu: texts.filter((t) => /by\.U/.test(t)), hargaRp: texts.filter((t) => /^Rp[\d.]+$/.test(t)) };
    }
  }
}

return out;
