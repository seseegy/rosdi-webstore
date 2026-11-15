// Fix Siklus 77: sub kartu game Beranda Desktop (8 frame) tagline-saja ->
// "{publisher} · {tagline}" persis Home.jsx:100. Kartu tumbuh mengikuti baris
// (grid CSS: tinggi baris = kartu tertinggi), simpul di bawah geser, frame
// memanjang; di frame modal veil diresize + kelompok modal digeser total/2
// agar tetap terpusat (pelajaran Siklus 68/69).
const FRAME_IDS = ["20:2", "21:2", "165:2", "165:247", "170:2", "170:247", "170:492", "170:737"];
const TAGLINES = ["Top up langsung ke akun", "Via UID, pilih server",
  "Top up token langsung ke akun", "Gift card Robux, kode ke email"];
const PUB = { "Mobile Legends": "Moonton", "Free Fire": "Garena",
  "Genshin Impact": "HoYoverse", "PUBG Mobile": "Level Infinite",
  "Honor of Kings": "TiMi Studio", "Roblox": "Roblox Corporation" };
const results = [];
for (const fid of FRAME_IDS) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { results.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  // --- discovery (read-only dulu) ---
  const subs = [];
  const walk = (n) => {
    if (n.type === "TEXT" && TAGLINES.includes(n.characters || "") && n.fontSize === 12.5) subs.push(n);
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(f);
  let veil = null, veilIdx = -1;
  f.children.forEach((c, i) => { if (c.name === "Veil") { veil = c; veilIdx = i; } });
  if (subs.length !== 6) { results.push({ frame: f.name, id: fid, error: "subs=" + subs.length + " (harap 6)" }); continue; }
  // kartu = rect "Card ..." yang memuat tiap sub; nama game = teks 14.5 di kartu itu
  const cards = [];
  for (const sub of subs) {
    const cx = sub.x + sub.width / 2, cy = sub.y + sub.height / 2;
    let card = null;
    for (const c of f.children) {
      if ((c.type === "RECTANGLE" || c.type === "FRAME") && (c.name || "").indexOf("Card ") === 0 &&
        cx >= c.x && cx <= c.x + c.width && cy >= c.y && cy <= c.y + c.height) { card = c; break; }
    }
    if (!card) { results.push({ frame: f.name, id: fid, error: "kartu tidak ketemu untuk sub " + sub.id }); break; }
    let nameNode = null, fromNode = null;
    for (const c of f.children) {
      if (c.type !== "TEXT") continue;
      const ccx = c.x + c.width / 2, ccy = c.y + c.height / 2;
      if (ccx < card.x || ccx > card.x + card.width || ccy < card.y || ccy > card.y + card.height) continue;
      if (c.fontSize === 14.5) nameNode = c;
      if ((c.characters || "").indexOf("Mulai Rp") === 0) fromNode = c;
    }
    if (!nameNode || !fromNode) { results.push({ frame: f.name, id: fid, error: "nama/from tidak ketemu di kartu " + card.name }); break; }
    const game = nameNode.characters;
    if (!PUB[game]) { results.push({ frame: f.name, id: fid, error: "publisher tidak dikenal: " + game }); break; }
    cards.push({ card, sub, nameNode, fromNode, game, newSub: PUB[game] + " · " + sub.characters, textW: card.width - 28 });
  }
  if (cards.length !== 6) { if (!results.some(r => r.id === fid)) results.push({ frame: f.name, id: fid, error: "cards=" + cards.length }); continue; }
  // --- muat font sub ---
  const fonts = new Map();
  for (const { sub } of cards) {
    for (const seg of sub.getStyledTextSegments(["fontName"])) fonts.set(seg.fontName.family + "|" + seg.fontName.style, seg.fontName);
  }
  for (const fn of fonts.values()) await figma.loadFontAsync(fn);
  // --- ganti teks + ukur tinggi baru ---
  for (const it of cards) {
    it.oldH = it.sub.height;
    it.sub.textAutoResize = "HEIGHT";
    it.sub.resize(it.textW, it.sub.height);
    it.sub.characters = it.newSub;
    it.newH = it.sub.height;
    it.delta = it.newH - it.oldH;
    it.sub.name = it.newSub;
  }
  // --- delta per baris ---
  const ys = [...new Set(cards.map(c => Math.round(c.card.y)))].sort((a, b) => a - b);
  const row1 = cards.filter(c => Math.round(c.card.y) === ys[0]);
  const row2 = cards.filter(c => Math.round(c.card.y) === ys[1]);
  const d1 = Math.max(0, ...row1.map(c => c.delta));
  const d2 = Math.max(0, ...row2.map(c => c.delta));
  const total = d1 + d2;
  const row2BottomOld = ys[1] + row2[0].card.height;
  // --- terapkan: baris 1 tumbuh, baris 2 geser + tumbuh ---
  const inCard = (node, card) => {
    const cx = node.x + node.width / 2, cy = node.y + node.height / 2;
    return cx >= card.x && cx <= card.x + card.width && cy >= card.y && cy <= card.y + card.height;
  };
  for (const it of row1) { it.card.resize(it.card.width, it.card.height + d1); it.fromNode.y += d1; }
  for (const it of row2) {
    it.card.y += d1;
    for (const c of f.children) if (inCard(c, { x: it.card.x, y: it.card.y - d1, width: it.card.width, height: it.card.height }) && c !== it.card) c.y += d1;
    it.card.resize(it.card.width, it.card.height + d2);
    it.fromNode.y += d2;
  }
  // --- simpul latar di bawah grid geser total (kecuali veil + kelompok modal) ---
  let shiftedBelow = 0;
  for (const c of f.children) {
    if (veil && veilIdx >= 0 && f.children.indexOf(c) >= veilIdx) continue; // veil + modal ditangani terpisah
    if (c.y >= row2BottomOld && !row2.some(it => it.card === c) &&
        !row2.some(it => inCard(c, { x: it.card.x, y: it.card.y - d1, width: it.card.width, height: it.card.height + d2 }))) {
      c.y += total; shiftedBelow++;
    }
  }
  // --- veil + kelompok modal ---
  let modalShifted = 0;
  if (veil) {
    veil.resize(veil.width, veil.height + total);
    for (let i = veilIdx + 1; i < f.children.length; i++) { f.children[i].y += total / 2; modalShifted++; }
  }
  f.resize(f.width, f.height + total);
  results.push({ frame: f.name, id: fid, d1, d2, total,
    deltas: cards.map(c => c.game + ":" + c.oldH + "->" + c.newH),
    frameH: f.height, shiftedBelow, modalShifted, veil: !!veil });
}
return results;
