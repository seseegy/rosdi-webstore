const IDS = ["26:2","36:2","2:116","30:2","51:2","100:232"];
const LABELS = ["Semua","Top Up Game","Pulsa","Paket Data","Token PLN","Tagihan","E-Wallet","Voucher"];
const out = [];
for (const fid of IDS){
  const frame = await figma.getNodeByIdAsync(fid);
  if (!frame){ out.push({ id: fid, err: "null" }); continue; }
  const texts = frame.findAll(n => n.type === "TEXT" && LABELS.includes(n.characters));
  const rects = frame.findAll(n => n.type === "RECTANGLE");
  const rows = [];
  for (const t of texts){
    const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
    let best = null, bestArea = Infinity;
    for (const r of rects){
      if (cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height){
        const area = r.width * r.height; if (area < bestArea){ bestArea = area; best = r; }
      }
    }
    rows.push({ text: t.characters, tx: Math.round(t.x), ty: Math.round(t.y), rect: best ? { x: Math.round(best.x), y: Math.round(best.y), w: Math.round(best.width), h: Math.round(best.height) } : null });
  }
  rows.sort((a,b) => a.ty - b.ty || a.tx - b.tx);
  out.push({ id: fid, name: frame.name, fw: Math.round(frame.width), labels: rows });
}
return out;
