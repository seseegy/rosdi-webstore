// Read-only s440 (bagian D): semua teks "biaya" di frame mobile (bukan
// Desktop) + varian kapitalisasi akronim + label "Biaya pembayaran".
const out = { mobileBiaya: [], tanpaBiayaFrames: {}, caseVar: {}, biayaPembayaran: 0, hargaFinal: [] };
const frames = figma.currentPage.children.filter((n) => n.type === "FRAME");
const CASE = { qrisLower: /Qris|qris/, vaLower: /\bVa\b/, uidLower: /\bUid\b/, bcaLower: /\bBca\b/, plnLower: /\bPln\b/, qrisLowerWord: /\bqris\b/ };
for (const k of Object.keys(CASE)) out.caseVar[k] = { count: 0, samples: [] };
for (const f of frames) {
  const isMobile = f.name.indexOf("Desktop") < 0;
  const texts = f.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    const s = t.characters;
    if (isMobile && /biaya/i.test(s) && out.mobileBiaya.length < 220) {
      out.mobileBiaya.push({ frame: f.name, chars: s.slice(0, 90) });
    }
    if (/tanpa biaya/i.test(s)) out.tanpaBiayaFrames[f.name] = (out.tanpaBiayaFrames[f.name] || 0) + 1;
    if (/Biaya pembayaran/.test(s)) out.biayaPembayaran++;
    if (/Harga final/.test(s) && out.hargaFinal.length < 10) out.hargaFinal.push({ frame: f.name, chars: s.slice(0, 80) });
    for (const k of Object.keys(CASE)) {
      if (CASE[k].test(s)) {
        out.caseVar[k].count++;
        if (out.caseVar[k].samples.length < 5) out.caseVar[k].samples.push({ frame: f.name, chars: s.slice(0, 60) });
      }
    }
  }
}
return { part: "D", ...out, frameCount: frames.length };
