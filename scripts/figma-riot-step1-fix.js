// Perbaikan Siklus 137: sinkron 4 frame Valorant + Wild Rift (mobile +
// desktop, Light+Dark) ke input Riot ID baru dari src/pages/GamePage.jsx
// (Siklus 136: riotId: true; needsZone dihapus).
// Langkah 1 "User ID + Zone ID" -> satu kolom "Riot ID":
//   - judul langkah "Masukkan User ID" -> "Masukkan Riot ID"
//   - input Zone ID + placeholder "( 1234 )" dihapus
//   - input UID dilebarkan jadi satu kolom penuh, placeholder "NamaKamu#TAG12"
//   - label desktop "User ID" -> "Riot ID"
//   - catatan -> "Contoh penulisan: NamaKamu#TAG12. Riot ID terdiri dari
//     nama + # + tag (3–5 karakter)."
//   - bantuan -> "Cara menemukan Riot ID saya"
//   - ringkasan desktop Tujuan "12345678 (1234)" -> "NamaKamu#TAG12"
// Frame mobile tidak punya flabel (konvensi klon MLBB) — judul langkah +
// placeholder sudah mengidentifikasi kolomnya, jadi tidak ada label baru.
// Bila catatan membungkus lebih banyak baris dari sebelumnya, kartu Langkah 1
// memanjang dan semua simpul di bawahnya geser (penjaga ukur, pola Siklus 29).
const NOTE = "Contoh penulisan: NamaKamu#TAG12. Riot ID terdiri dari nama + # + tag (3\u20135 karakter).";
const HINT = "Cara menemukan Riot ID saya";
const RIOT = "NamaKamu#TAG12";

async function setText(node, str, width) {
  const segs = node.getStyledTextSegments(["fontName", "fontSize"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = str;
  node.name = str.length > 60 ? str.slice(0, 60) : str;
  if (width) { node.textAutoResize = "HEIGHT"; node.resize(width, node.height); }
}

const FRAMES = [
  { id: "270:2", kind: "mobile" }, { id: "270:140", kind: "mobile" },
  { id: "274:2", kind: "mobile" }, { id: "274:140", kind: "mobile" },
  { id: "280:2", kind: "desktop" }, { id: "280:250", kind: "desktop" },
  { id: "285:2", kind: "desktop" }, { id: "285:247", kind: "desktop" },
];
const out = [];
for (const spec of FRAMES) {
  const frame = figma.getNodeById(spec.id);
  if (!frame) throw new Error("frame tidak ketemu: " + spec.id);
  const log = { id: spec.id, name: frame.name, kind: spec.kind, changed: [], noteH: 0, delta: 0 };
  if (spec.kind === "mobile") {
    // Koordinat lokal frame (Light+Dark sama; klon MLBB).
    const byXY = (type, x, y) => frame.children.find((n) => n.type === type && Math.round(n.x) === x && Math.round(n.y) === y);
    const title = byXY("TEXT", 66, 105);
    if (!title || title.characters !== "Masukkan User ID") throw new Error(spec.id + ": judul langkah tidak ketemu");
    await setText(title, "Masukkan Riot ID"); log.changed.push("title");
    const uidRect = byXY("RECTANGLE", 32, 140);
    if (!uidRect || Math.round(uidRect.width) !== 208 || Math.round(uidRect.height) !== 42) throw new Error(spec.id + ": rect UID tidak ketemu");
    uidRect.resize(326, 42); log.changed.push("uidRect 208->326");
    const uidText = byXY("TEXT", 44, 153);
    if (!uidText || uidText.characters !== "12345678") throw new Error(spec.id + ": placeholder UID tidak ketemu");
    await setText(uidText, RIOT); log.changed.push("placeholder");
    const zoneRect = byXY("RECTANGLE", 248, 140);
    if (!zoneRect || Math.round(zoneRect.width) !== 110) throw new Error(spec.id + ": rect Zone tidak ketemu");
    zoneRect.remove(); log.changed.push("zoneRect dihapus");
    const zoneText = byXY("TEXT", 260, 153);
    if (!zoneText || zoneText.characters !== "( 1234 )") throw new Error(spec.id + ": placeholder Zone tidak ketemu");
    zoneText.remove(); log.changed.push("zoneText dihapus");
    const note = byXY("TEXT", 32, 192);
    if (!note || note.characters.indexOf("Contoh penulisan") !== 0) throw new Error(spec.id + ": catatan tidak ketemu");
    const oldH = Math.round(note.height);
    await setText(note, NOTE, 326);
    log.noteH = Math.round(note.height); log.delta = log.noteH - oldH;
    const hint = byXY("TEXT", 32, 224);
    if (!hint || hint.characters !== "Cara menemukan User ID saya") throw new Error(spec.id + ": hint tidak ketemu");
    await setText(hint, HINT); log.changed.push("hint");
    if (log.delta !== 0) {
      const card = byXY("RECTANGLE", 16, 84);
      if (!card || Math.round(card.height) !== 162) throw new Error(spec.id + ": kartu Langkah 1 tidak ketemu");
      card.resize(358, 162 + log.delta);
      const noteBottom = 192 + oldH;
      for (const n of frame.children) {
        if (n !== note && n.y > noteBottom) n.y += log.delta;
      }
      frame.resize(390, 1652 + log.delta);
      log.changed.push("kartu+geser delta " + log.delta);
    }
  } else {
    // Desktop: simpul bernama (pola builder desktop-game).
    const byName = (nm) => frame.children.find((n) => n.name === nm);
    const title = byName("StepTitle 1");
    if (!title || title.characters !== "Masukkan User ID") throw new Error(spec.id + ": StepTitle 1 tidak ketemu");
    await setText(title, "Masukkan Riot ID"); log.changed.push("title");
    const lab = byName("Label User ID");
    if (!lab) throw new Error(spec.id + ": Label User ID tidak ketemu");
    await setText(lab, "Riot ID"); lab.name = "Label Riot ID"; log.changed.push("label");
    const labZ = byName("Label Zone ID");
    const rectZ = byName("Input Zone ID");
    const txtZ = byName("InputText Zone ID");
    if (!labZ || !rectZ || !txtZ) throw new Error(spec.id + ": simpul Zone tidak lengkap");
    labZ.remove(); rectZ.remove(); txtZ.remove(); log.changed.push("zone dihapus");
    const rect = byName("Input User ID");
    if (!rect || Math.round(rect.width) !== 342 || Math.round(rect.height) !== 44) throw new Error(spec.id + ": Input User ID tidak ketemu");
    rect.resize(684, 44); rect.name = "Input Riot ID"; log.changed.push("inputRect 342->684");
    const inp = byName("InputText User ID");
    if (!inp || inp.characters !== "12345678") throw new Error(spec.id + ": InputText User ID tidak ketemu");
    await setText(inp, RIOT); inp.name = "InputText Riot ID"; log.changed.push("placeholder");
    const note = byName("Step1Note");
    if (!note) throw new Error(spec.id + ": Step1Note tidak ketemu");
    const oldH = Math.round(note.height);
    await setText(note, NOTE, 684);
    log.noteH = Math.round(note.height); log.delta = log.noteH - oldH;
    const hint = byName("Step1Hint");
    if (!hint || hint.characters !== "Cara menemukan User ID saya") throw new Error(spec.id + ": Step1Hint tidak ketemu");
    await setText(hint, HINT); log.changed.push("hint");
    const tujuan = byName("SumVal Tujuan");
    if (!tujuan || tujuan.characters !== "12345678 (1234)") throw new Error(spec.id + ": SumVal Tujuan tidak ketemu");
    await setText(tujuan, RIOT); log.changed.push("tujuan");
    if (log.delta !== 0) {
      const card = byName("Step1Card");
      if (!card || Math.round(card.height) !== 196) throw new Error(spec.id + ": Step1Card tidak ketemu");
      card.resize(716, 196 + log.delta);
      const noteBottom = card.y + 140 + oldH;
      for (const n of frame.children) {
        // Kolom kiri saja (x < 800): aside Ringkasan (x >= 824) independen.
        if (n !== note && n.y > noteBottom && n.x < 800) n.y += log.delta;
      }
      frame.resize(1280, 2410 + log.delta);
      log.changed.push("kartu+geser delta " + log.delta);
    }
  }
  out.push(log);
}
return out;
