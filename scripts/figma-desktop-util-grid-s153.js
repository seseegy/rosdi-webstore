// Fix Siklus 153: sinkron grid util Beranda Desktop (20:2/21:2) ke Home.jsx —
// (1) kartu "Tagihan Pascabayar" (tile TG #475569) HILANG dari frame padahal
// kode merendernya sesudah Token PLN (Home.jsx:146-151, Tahap 4 Siklus 115);
// (2) urutan grid frame (e-wallet dulu, voucher belakangan) menyimpang dari
// kode (voucher dulu, e-wallet belakangan — Home.jsx:153-167);
// (3) sub "Pulsa Reguler" tanpa by.U (kode: "Telkomsel, by.U, Indosat, ...").
// Struktur frame FLAT (probe s153b): tiap kartu = 6 simpul saudara
// (Card rect, Tile rect, TileText, Name, Sub, From), kolom x 80/457/834,
// lebar 365/365/366, baris y 1178/1330/1482/1634 (pitch 152), kartu h=140.
// Target 11 kartu urutan kode: Pulsa, Data, PLN | Tagihan, GP, Steam |
// PSN, DANA, GoPay | OVO, ShopeePay. HeadTrust y=1800 + frame 2407 tetap.
const FRAME_IDS = ["20:2", "21:2"];
const COLX = [80, 457, 834];
const COLW = [365, 365, 366];
const ROWY = [1178, 1330, 1482, 1634];
// nama kartu -> [kolom, baris] target; Pulsa/Data/PLN tetap di baris 1
const TARGET = {
  "Pulsa Reguler": [0, 0], "Paket Data": [1, 0], "Token PLN": [2, 0],
  "Tagihan Pascabayar": [0, 1],
  "Voucher Google Play": [1, 1], "Steam Wallet IDR": [2, 1],
  "PlayStation Network ID": [0, 2],
  "Saldo DANA": [1, 2], "Saldo GoPay": [2, 2],
  "Saldo OVO": [0, 3], "Saldo ShopeePay": [1, 3],
};
const TG = { tile: "TG", name: "Tagihan Pascabayar",
  sub: "PLN, PDAM, BPJS, Telkom, TV Kabel & lainnya",
  from: "Cek tagihan, bayar sebelum jatuh tempo" };
const PULSA_SUB = "Telkomsel, by.U, Indosat, XL, Axis, Tri, Smartfren";
const results = [];

for (const fid of FRAME_IDS) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { results.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  // --- discovery: kelompokkan 6 simpul per kartu util (di bawah HeadUtil) ---
  const headUtil = f.findAll((n) => n.type === "TEXT" && (n.characters || "").indexOf("Pulsa, Data, PLN") === 0)[0];
  if (!headUtil) { results.push({ frame: f.name, id: fid, error: "HeadUtil tidak ketemu" }); continue; }
  const groups = {};
  for (const c of f.children) {
    if (c.type === "RECTANGLE" && (c.name || "").indexOf("Card ") === 0 && c.y > headUtil.y) {
      const key = c.name.slice(5);
      const g = { card: c, nodes: [c] };
      // simpul kartu = yang titik tengahnya di dalam rect kartu (pola Siklus 77)
      for (const n of f.children) {
        if (n === c) continue;
        const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
        if (cx >= c.x && cx <= c.x + c.width && cy >= c.y && cy <= c.y + c.height) g.nodes.push(n);
      }
      groups[key] = g;
    }
  }
  const keys = Object.keys(groups);
  if (keys.length !== 10) { results.push({ frame: f.name, id: fid, error: "kartu=" + keys.length + " (harap 10): " + keys.join(", ") }); continue; }
  let bad = null;
  for (const key of keys) {
    const g = groups[key];
    if (g.nodes.length !== 6) { bad = key + ": nodes=" + g.nodes.length; break; }
    g.tile = g.nodes.find((n) => n.type === "RECTANGLE" && n !== g.card);
    g.tileText = g.nodes.find((n) => n.type === "TEXT" && (n.name || "").indexOf("TileText ") === 0);
    g.nameNode = g.nodes.find((n) => n.type === "TEXT" && (n.name || "").indexOf("Name ") === 0);
    g.subNode = g.nodes.find((n) => n.type === "TEXT" && (n.name || "").indexOf("Sub ") === 0);
    g.fromNode = g.nodes.find((n) => n.type === "TEXT" && (n.name || "").indexOf("From ") === 0);
    if (!g.tile || !g.tileText || !g.nameNode || !g.subNode || !g.fromNode) { bad = key + ": peran tidak lengkap"; break; }
  }
  if (bad) { results.push({ frame: f.name, id: fid, error: bad }); continue; }
  // --- verifikasi posisi awal: baris 1 Pulsa/Data/PLN + slot-slot lama ---
  const cur = {};
  for (const key of keys) cur[key] = [Math.round(groups[key].card.x), Math.round(groups[key].card.y)];
  const expect = { "Pulsa Reguler": [80, 1178], "Paket Data": [457, 1178], "Token PLN": [834, 1178],
    "Saldo DANA": [80, 1330], "Saldo GoPay": [457, 1330], "Saldo OVO": [834, 1330],
    "Saldo ShopeePay": [80, 1482], "Voucher Google Play": [457, 1482], "Steam Wallet IDR": [834, 1482],
    "PlayStation Network ID": [80, 1634] };
  let mismatch = null;
  for (const k of Object.keys(expect)) {
    if (!cur[k] || cur[k][0] !== expect[k][0] || cur[k][1] !== expect[k][1]) { mismatch = k + " di " + JSON.stringify(cur[k]) + " harap " + JSON.stringify(expect[k]); break; }
  }
  if (mismatch) { results.push({ frame: f.name, id: fid, error: "posisi awal menyimpang: " + mismatch }); continue; }

  // --- muat font teks yang akan diubah (sub Pulsa + teks kartu klon) ---
  const fonts = new Map();
  const pln = groups["Token PLN"];
  const loadSet = [groups["Pulsa Reguler"].subNode, pln.tileText, pln.nameNode, pln.subNode, pln.fromNode];
  for (const n of loadSet) for (const seg of n.getStyledTextSegments(["fontName"])) fonts.set(seg.fontName.family + "|" + seg.fontName.style, seg.fontName);
  for (const fn of fonts.values()) await figma.loadFontAsync(fn);

  // --- pindah 7 kartu ke slot target (dx/dy + lebar kolom target) ---
  const moved = [];
  for (const key of ["Voucher Google Play", "Steam Wallet IDR", "PlayStation Network ID", "Saldo DANA", "Saldo GoPay", "Saldo OVO", "Saldo ShopeePay"]) {
    const g = groups[key];
    const [col, row] = TARGET[key];
    const tx = COLX[col], ty = ROWY[row];
    const dx = tx - g.card.x, dy = ty - g.card.y;
    for (const n of g.nodes) { n.x += dx; n.y += dy; }
    g.card.resize(COLW[col], g.card.height);
    moved.push(key + " -> (" + tx + "," + ty + ")");
  }
  // --- kartu Tagihan baru: klon 6 simpul Token PLN, pindah ke slot (80,1330) ---
  const [tcol, trow] = TARGET["Tagihan Pascabayar"];
  const tx = COLX[tcol], ty = ROWY[trow];
  const src = [pln.card, pln.tile, pln.tileText, pln.nameNode, pln.subNode, pln.fromNode];
  const clones = src.map((n) => { const c = n.clone(); f.appendChild(c); return c; });
  const [cCard, cTile, cTileText, cName, cSub, cFrom] = clones;
  const dx0 = tx - pln.card.x, dy0 = ty - pln.card.y;
  for (const n of clones) { n.x += dx0; n.y += dy0; }
  cCard.resize(COLW[tcol], cCard.height);
  cCard.name = "Card Tagihan Pascabayar";
  cTile.name = "Tile TG";
  cTile.fills = [{ type: "SOLID", color: { r: 71 / 255, g: 85 / 255, b: 105 / 255 } }];
  cTileText.name = "TileText TG";
  cName.name = "Name Tagihan Pascabayar";
  cSub.name = "Sub Tagihan Pascabayar";
  cFrom.name = "From Tagihan Pascabayar";
  const setText = (node, chars, w) => {
    node.textAutoResize = "HEIGHT";
    node.resize(w, node.height);
    node.characters = chars;
    return { h: Math.round(node.height), w: Math.round(node.width) };
  };
  // TileText dipusatkan di tile 46x46 (pola frame: teks 18px di tengah tile)
  cTileText.textAutoResize = "WIDTH_AND_HEIGHT";
  cTileText.characters = TG.tile;
  cTileText.x = cTile.x + (46 - cTileText.width) / 2;
  cTileText.y = cTile.y + (46 - cTileText.height) / 2;
  const innerW = COLW[tcol] - 28;
  const mName = setText(cName, TG.name, innerW);
  const mSub = setText(cSub, TG.sub, innerW);
  const mFrom = setText(cFrom, TG.from, innerW);
  // --- sub Pulsa Reguler: tambah by.U ---
  const pSub = groups["Pulsa Reguler"].subNode;
  pSub.textAutoResize = "HEIGHT";
  pSub.resize(COLW[0] - 28, pSub.height);
  pSub.characters = PULSA_SUB;
  const pSubH = Math.round(pSub.height);
  pSub.name = "Sub Pulsa Reguler";
  results.push({ frame: f.name, id: fid, ok: true, moved, tagihan: { name: mName, sub: mSub, from: mFrom, tileText: { x: Math.round(cTileText.x), y: Math.round(cTileText.y), w: Math.round(cTileText.width) } }, pulsaSubH: pSubH, frameH: Math.round(f.height) });
}
return results;
