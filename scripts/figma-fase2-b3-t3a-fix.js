
const INSERTED = ["1:2", "1:105", "2:116", "2:181", "10:2", "10:105", "13:2", "13:111", "15:2", "15:105", "16:2", "16:107", "20:2", "21:2", "26:2", "26:281", "28:2", "28:259", "30:2", "30:241", "31:2", "31:251", "33:2", "33:239", "36:2", "36:84", "36:166", "36:244", "46:2", "46:235", "49:2", "49:96", "51:2", "51:96", "51:190", "51:272", "80:2", "80:83", "84:2", "84:249", "87:2", "87:258", "90:2", "90:241", "93:2", "93:249", "95:2", "95:241", "100:232", "100:477", "105:162", "105:387", "162:2", "162:111", "165:2", "165:247", "170:2", "170:247", "170:492", "170:737", "280:2", "280:250", "283:2", "283:244", "285:2", "285:247", "286:2", "286:244", "287:2", "287:244", "296:2", "296:265", "306:156", "306:256", "317:56", "317:132"];
const LABELS = ["Semua","Top Up Game","Pulsa","Paket Data","Token PLN","Tagihan","E-Wallet","Voucher"];
const ORDER = ["Semua","Top Up Game","Pulsa","Paket Data","Token PLN","Tagihan","E-Wallet","Voucher"];
const page = figma.currentPage;
const report = { partA: [], partB: [], skipped: [], errors: [] };
async function loadFont(t){
  try { await figma.loadFontAsync(t.fontName); } catch (e) {
    try { const s = t.getStyledTextSegments(["fontName"]); for (const seg of s) await figma.loadFontAsync(seg.fontName); } catch (e2) {}
  }
}
function pairList(frame){
  const texts = frame.findAll(n => n.type === "TEXT" && LABELS.includes(n.characters));
  const rects = frame.findAll(n => n.type === "RECTANGLE");
  const pairs = [];
  for (const t of texts){
    const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
    let best = null, bestArea = Infinity;
    for (const r of rects){
      if (cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height){
        const area = r.width * r.height; if (area < bestArea){ bestArea = area; best = r; }
      }
    }
    if (best) pairs.push({ text: t, rect: best });
  }
  pairs.sort((a, b) => a.rect.x - b.rect.x || a.text.x - b.text.x);
  return pairs;
}
for (const fid of INSERTED){
  let frame;
  try { frame = await figma.getNodeByIdAsync(fid); } catch (e) { report.errors.push({ id: fid, err: "getNode fail: " + e.message }); continue; }
  if (!frame){ report.errors.push({ id: fid, err: "null" }); continue; }
  // deteksi baris chip: kelompokkan teks label per y (±2), butuh >=4 label termasuk "Semua"
  const texts = frame.findAll(n => n.type === "TEXT" && LABELS.includes(n.characters));
  const byY = {};
  for (const t of texts){ const k = Math.round(t.y / 2) * 2; (byY[k] = byY[k] || []).push(t); }
  let rowY = null, rowLabels = [];
  for (const k of Object.keys(byY)){
    const labs = [...new Set(byY[k].map(t => t.characters))];
    if (labs.includes("Semua") && labs.length >= 4){ rowY = byY[k][0].y; rowLabels = labs; }
  }
  try {
    if (rowY !== null){
      // ===== Part A: bangun ulang baris chip =====
      const pairs = pairList(frame);
      const rowPairs = {};
      for (const p of pairs){ if (Math.abs(p.text.y - rowY) <= 2 && !rowPairs[p.text.characters]) rowPairs[p.text.characters] = p; }
      // "Tagihan" palsu T3a tidak di baris (di kartu/footer) — ambil dari mana pun di frame
      if (!rowPairs["Tagihan"]){
        const tagPair = pairs.find(p => p.text.characters === "Tagihan");
        if (tagPair) rowPairs["Tagihan"] = tagPair;
      }
      const desktop = frame.width >= 900;
      const anchorX = desktop ? 80 : 16;
      const rowRectY = rowPairs["Semua"] ? rowPairs["Semua"].rect.y : rowY - 9;
      // ganti rect "Tagihan" yang salah (tinggi != 34) dengan klon rect chip "Token PLN" (atau "Semua")
      const tag = rowPairs["Tagihan"];
      const ref = rowPairs["Token PLN"] || rowPairs["Semua"];
      if (tag && ref && tag.rect.height !== 34){
        const nr = ref.rect.clone();
        frame.appendChild(nr);
        const old = tag.rect; tag.rect = nr; old.remove();
      }
      // layout ulang berurutan
      let cursor = anchorX; const laid = [];
      for (const lab of ORDER){
        const p = rowPairs[lab]; if (!p) continue;
        if (lab === "Tagihan" && p.rect){
          await loadFont(p.text); p.text.textAutoResize = "WIDTH_AND_HEIGHT";
          const w = Math.ceil(p.text.width) + 26; p.rect.resize(w, 34);
        }
        p.rect.x = cursor; p.rect.y = rowRectY;
        p.text.x = cursor + 13; p.text.y = rowRectY + 9;
        laid.push(lab + "@" + Math.round(cursor));
        cursor += p.rect.width + 8;
      }
      report.partA.push({ id: fid, name: frame.name, rowY: Math.round(rowY), laid });
    } else {
      // ===== Part B: hapus klon + kembalikan geseran =====
      const clones = frame.findAll(n => n.type === "TEXT" && n.characters === "Tagihan");
      if (!clones.length){ report.skipped.push({ id: fid, name: frame.name, why: "no Tagihan text" }); continue; }
      const pairs = pairList(frame);
      // indeks Token PLN pertama (yang dipakai T3a)
      const tplnIdx = pairs.findIndex(p => p.text.characters === "Token PLN");
      const done = [];
      for (const ct of clones){
        const cx = ct.x + ct.width / 2, cy = ct.y + ct.height / 2;
        const rects = frame.findAll(n => n.type === "RECTANGLE");
        let best = null, bestArea = Infinity;
        for (const r of rects){
          if (cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height){
            const area = r.width * r.height; if (area < bestArea){ bestArea = area; best = r; }
          }
        }
        if (!best){ done.push({ x: Math.round(ct.x), y: Math.round(ct.y), shiftBack: null }); ct.remove(); continue; }
        const shiftBack = best.width + 8;
        const cx0 = ct.x, cy0 = ct.y;
        if (tplnIdx >= 0){
          for (let i = tplnIdx + 1; i < pairs.length; i++){
            const p = pairs[i];
            if (p.text === ct) continue;
            p.rect.x -= shiftBack; p.text.x -= shiftBack;
          }
        }
        best.remove(); ct.remove();
        done.push({ x: Math.round(cx0), y: Math.round(cy0), shiftBack: Math.round(shiftBack) });
      }
      report.partB.push({ id: fid, name: frame.name, clones: done });
    }
  } catch (e){ report.errors.push({ id: fid, err: e.message }); }
}
return { counts: { partA: report.partA.length, partB: report.partB.length, skipped: report.skipped.length, errors: report.errors.length }, partA: report.partA, partB: report.partB, skipped: report.skipped, errors: report.errors };
