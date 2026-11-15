const IDS = ["1:2","1:105","10:2","10:105","13:2","13:111","162:2","162:111","20:2","21:2","165:2","165:247","170:2","170:247","170:492","170:737"];
const ORDER = ["Semua","Top Up Game","Pulsa","Paket Data","Token PLN","Tagihan","E-Wallet","Voucher"];
const report = { fixed: [], errors: [] };
function smallestRect(frame, t){
  const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
  const rects = frame.findAll(n => n.type === "RECTANGLE");
  let best = null, bestArea = Infinity;
  for (const r of rects){
    if (cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height){
      const area = r.width * r.height; if (area < bestArea){ bestArea = area; best = r; }
    }
  }
  return best;
}
for (const fid of IDS){
  let frame;
  try { frame = await figma.getNodeByIdAsync(fid); } catch (e) { report.errors.push({ id: fid, err: "getNode: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: fid, err: "null" }); continue; }
  const desktop = frame.width >= 900;
  const rowY = desktop ? 361 : 305;
  const shift = desktop ? 81 : 90; // sesuai log T3a (+81 desktop, +90 mobile)
  const actions = [];
  try {
    // geser-balik semua pasangan label non-baris yang belum dikembalikan (kartu, chip footer, tombol modal)
    const texts = frame.findAll(n => n.type === "TEXT" && ORDER.includes(n.characters));
    for (const t of texts){
      if (Math.abs(t.y - rowY) <= 2) continue; // chip baris: sudah benar
      // elemen yang sudah dikembalikan fix2 — jangan digeser lagi
      if (t.characters === "Top Up Game" && ((desktop && Math.round(t.x) === 80 && Math.round(t.y) === 623) || (!desktop && Math.round(t.x) === 16 && Math.round(t.y) === 696))) continue;
      if (t.characters === "Token PLN" && !desktop && Math.round(t.x) === 30 && (Math.round(t.y) === 2103 || Math.round(t.y) === 2088)) continue;
      if (t.characters === "Token PLN" && desktop && Math.round(t.x) === 500 && Math.round(t.y) === 2320) continue;
      const r = smallestRect(frame, t);
      t.x -= shift;
      if (r) r.x -= shift;
      actions.push("shift-back " + t.characters + " (" + Math.round(t.x + shift) + "->" + Math.round(t.x) + ")");
    }
    // jaring pengaman: rect kartu desktop yang masih di posisi geser
    if (desktop){
      for (const r of frame.findAll(n => n.type === "RECTANGLE")){
        if (r.name === "Card Paket Data" && Math.round(r.x) === 538){ r.x = 457; actions.push("Card Paket Data 538->457"); }
        if (r.name === "Card Token PLN" && Math.round(r.x) === 915){ r.x = 834; actions.push("Card Token PLN 915->834"); }
        if (r.name === "Tombol Masuk" && Math.round(r.x) === 541){ r.x = 460; actions.push("Tombol Masuk 541->460"); }
      }
    } else {
      for (const r of frame.findAll(n => n.type === "RECTANGLE")){
        if (r.width === 173 && r.height >= 170 && r.height <= 190 && Math.round(r.x) === 291){ r.x = 201; actions.push("bill card rect 291->201"); }
      }
    }
    report.fixed.push({ id: fid, name: frame.name, actions });
  } catch (e){ report.errors.push({ id: fid, err: e.message }); }
}
return { counts: { fixed: report.fixed.length, errors: report.errors.length }, fixed: report.fixed, errors: report.errors };
