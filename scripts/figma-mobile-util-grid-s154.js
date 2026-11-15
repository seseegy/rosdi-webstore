// Fix Siklus 154: propagasi grid util Beranda Desktop (Siklus 153) ke
// Beranda Mobile (1:2/1:105) + latar modal S&K/Refund (10:2/10:105/13:2/13:111):
// (1) kartu "Tagihan Pascabayar" (tile TG #475569) ditambahkan sesudah Token PLN;
// (2) urutan grid ke urutan kode (Home.jsx:122-167): Pulsa, Data, PLN, Tagihan,
// GP, Steam, PSN, DANA, GoPay, OVO, ShopeePay (mobile tadinya: Pulsa, Data,
// PLN, GP, Steam, PSN, DANA, GoPay, OVO, ShopeePay — voucher sudah duluan,
// hanya Tagihan yang hilang);
// (3) sub "Pulsa Reguler" tambah by.U ("Telkomsel, by.U, Indosat, ...").
// Geometri diturunkan per frame dari probe s154 (semua 6 frame identik):
// kolom x 16/201, baris y 1834/2018/2204/2390/2574, kartu 173 lebar,
// trust head y=2772, grid bottom 2746, frame h=3180. Skrip tetap memverifikasi
// tiap frame sebelum mutasi (guard, pola Siklus 153) dan menghitung delta
// dinamis bila sub Pulsa membungkus 3 baris (sub 145px): kartu Pulsa tumbuh,
// baris 2..6 + simpul di bawah grid ikut geser.
const FRAME_IDS = ["1:2", "1:105", "10:2", "10:105", "13:2", "13:111"];
const COLX = [16, 201];
const EXPECTED = { // nama kartu -> [x, y] saat ini (probe s154)
  "Pulsa Reguler": [16, 1834], "Paket Data": [201, 1834],
  "Token PLN": [16, 2018], "Voucher Google Play": [201, 2018],
  "Steam Wallet IDR": [16, 2204], "PlayStation Network ID": [201, 2204],
  "Saldo DANA": [16, 2390], "Saldo GoPay": [201, 2390],
  "Saldo OVO": [16, 2574], "Saldo ShopeePay": [201, 2574],
};
const TARGET = { // nama kartu -> [kolom, baris] target (urutan kode)
  "Pulsa Reguler": [0, 0], "Paket Data": [1, 0],
  "Token PLN": [0, 1], "Tagihan Pascabayar": [1, 1],
  "Voucher Google Play": [0, 2], "Steam Wallet IDR": [1, 2],
  "PlayStation Network ID": [0, 3], "Saldo DANA": [1, 3],
  "Saldo GoPay": [0, 4], "Saldo OVO": [1, 4],
  "Saldo ShopeePay": [0, 5],
};
const TG = { tile: "TG", name: "Tagihan Pascabayar",
  sub: "PLN, PDAM, BPJS, Telkom, TV Kabel & lainnya",
  from: "Cek tagihan, bayar sebelum jatuh tempo" };
const PULSA_SUB = "Telkomsel, by.U, Indosat, XL, Axis, Tri, Smartfren";
const results = [];

for (const fid of FRAME_IDS) {
  const f = await figma.getNodeByIdAsync(fid);
  if (!f) { results.push({ frame: fid, error: "tidak ditemukan" }); continue; }
  const headUtil = f.findAll((n) => n.type === "TEXT" && (n.characters || "").indexOf("Pulsa, Data, PLN") === 0)[0];
  if (!headUtil) { results.push({ frame: f.name, id: fid, error: "HeadUtil tidak ketemu" }); continue; }
  // --- discovery: kelompokkan 6 simpul per kartu util ---
  const groups = {};
  for (const c of f.children) {
    if (c.type !== "RECTANGLE" || Math.round(c.width) !== 173) continue;
    if (c.y <= headUtil.y) continue;
    const key = c.name;
    if (!(key in EXPECTED)) continue;
    const g = { card: c, nodes: [c] };
    for (const n of f.children) {
      if (n === c) continue;
      const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
      if (cx >= c.x && cx <= c.x + c.width && cy >= c.y && cy <= c.y + c.height) g.nodes.push(n);
    }
    groups[key] = g;
  }
  const keys = Object.keys(groups);
  if (keys.length !== 10) { results.push({ frame: f.name, id: fid, error: "kartu=" + keys.length + " (harap 10): " + keys.join(", ") }); continue; }
  let bad = null;
  for (const key of keys) {
    const g = groups[key];
    if (g.nodes.length !== 6) { bad = key + ": nodes=" + g.nodes.length; break; }
    g.tile = g.nodes.find((n) => n.type === "RECTANGLE" && n !== g.card);
    const texts = g.nodes.filter((n) => n.type === "TEXT").sort((a, b) => a.y - b.y);
    g.tileText = texts.find((t) => { const cx = t.x + t.width / 2, cy = t.y + t.height / 2; return g.tile && cx >= g.tile.x && cx <= g.tile.x + g.tile.width && cy >= g.tile.y && cy <= g.tile.y + g.tile.height; });
    const rest = texts.filter((t) => t !== g.tileText).sort((a, b) => a.y - b.y);
    [g.nameNode, g.subNode, g.fromNode] = rest;
    if (!g.tile || !g.tileText || !g.nameNode || !g.subNode || !g.fromNode) { bad = key + ": peran tidak lengkap"; break; }
  }
  if (bad) { results.push({ frame: f.name, id: fid, error: bad }); continue; }
  // --- verifikasi posisi awal ---
  let mismatch = null;
  for (const k of Object.keys(EXPECTED)) {
    const g = groups[k];
    if (Math.round(g.card.x) !== EXPECTED[k][0] || Math.round(g.card.y) !== EXPECTED[k][1]) { mismatch = k + " di (" + Math.round(g.card.x) + "," + Math.round(g.card.y) + ") harap (" + EXPECTED[k][0] + "," + EXPECTED[k][1] + ")"; break; }
  }
  if (mismatch) { results.push({ frame: f.name, id: fid, error: "posisi awal menyimpang: " + mismatch }); continue; }
  const oldH = Math.round(f.height);
  const rowYs = [1834, 2018, 2204, 2390, 2574];
  const pitch45 = rowYs[4] - rowYs[3]; // 184
  const oldGridBottom = rowYs[4] + Math.round(groups["Saldo OVO"].card.height); // 2746

  // --- muat font teks yang akan diubah ---
  const fonts = new Map();
  const pln = groups["Token PLN"];
  const loadSet = [groups["Pulsa Reguler"].subNode, pln.tileText, pln.nameNode, pln.subNode, pln.fromNode];
  for (const n of loadSet) for (const seg of n.getStyledTextSegments(["fontName"])) fonts.set(seg.fontName.family + "|" + seg.fontName.style, seg.fontName);
  for (const fn of fonts.values()) await figma.loadFontAsync(fn);

  // --- sub Pulsa: tambah by.U; ukur delta bila membungkus 3 baris ---
  const pSub = groups["Pulsa Reguler"].subNode;
  const pFrom = groups["Pulsa Reguler"].fromNode;
  const pCard = groups["Pulsa Reguler"].card;
  const subH0 = Math.round(pSub.height);
  pSub.textAutoResize = "HEIGHT";
  pSub.resize(145, pSub.height);
  pSub.characters = PULSA_SUB;
  pSub.name = PULSA_SUB;
  const subH1 = Math.round(pSub.height);
  const delta = subH1 - subH0;
  if (delta > 0) {
    pCard.resize(pCard.width, pCard.height + delta);
    pFrom.y += delta;
  }
  const totalShift = delta + pitch45; // geser simpul di bawah grid (+184 baris baru)
  const rowY = [rowYs[0], rowYs[1] + delta, rowYs[2] + delta, rowYs[3] + delta, rowYs[4] + delta, rowYs[4] + delta + pitch45];

  // --- geser simpul di bawah grid (sebelum kartu dipindah) ---
  const groupNodes = new Set();
  for (const k of keys) for (const n of groups[k].nodes) groupNodes.add(n.id);
  let shifted = 0, resizedFull = [];
  for (const c of f.children) {
    if (groupNodes.has(c.id)) continue;
    if (c.y === 0 && Math.round(c.height) === oldH) { c.resize(c.width, oldH + totalShift); resizedFull.push(c.name); continue; } // veil / bg penuh
    if (c.y > oldGridBottom) { c.y += totalShift; shifted++; }
  }

  // --- pindah 7 kartu ke slot target ---
  const moved = [];
  for (const key of ["Voucher Google Play", "Steam Wallet IDR", "PlayStation Network ID", "Saldo DANA", "Saldo GoPay", "Saldo OVO", "Saldo ShopeePay"]) {
    const g = groups[key];
    const [col, row] = TARGET[key];
    const tx = COLX[col], ty = rowY[row];
    const dx = tx - g.card.x, dy = ty - g.card.y;
    for (const n of g.nodes) { n.x += dx; n.y += dy; }
    moved.push(key + " -> (" + tx + "," + ty + ")");
  }
  // --- kartu Tagihan baru: klon 6 simpul Token PLN ke slot (201, rowY[1]) ---
  const tx = COLX[1], ty = rowY[1];
  const src = [pln.card, pln.tile, pln.tileText, pln.nameNode, pln.subNode, pln.fromNode];
  const clones = src.map((n) => { const c = n.clone(); f.appendChild(c); return c; });
  const [cCard, cTile, cTileText, cName, cSub, cFrom] = clones;
  const dx0 = tx - pln.card.x, dy0 = ty - pln.card.y;
  for (const n of clones) { n.x += dx0; n.y += dy0; }
  cCard.name = "Tagihan Pascabayar";
  cTile.name = "Tile TG";
  cTile.fills = [{ type: "SOLID", color: { r: 71 / 255, g: 85 / 255, b: 105 / 255 } }];
  cTileText.name = "TileText TG";
  cName.name = "Name Tagihan Pascabayar";
  cSub.name = "Sub Tagihan Pascabayar";
  cFrom.name = "From Tagihan Pascabayar";
  const setText = (node, chars) => {
    node.textAutoResize = "HEIGHT";
    node.resize(145, node.height);
    node.characters = chars;
    node.name = chars;
    return Math.round(node.height);
  };
  cTileText.textAutoResize = "WIDTH_AND_HEIGHT";
  cTileText.characters = TG.tile;
  cTileText.x = cTile.x + (46 - cTileText.width) / 2;
  cTileText.y = cTile.y + (46 - cTileText.height) / 2;
  const nameH = setText(cName, TG.name);
  cSub.y = cName.y + cName.height + 2;
  const subH = setText(cSub, TG.sub);
  cFrom.y = cSub.y + cSub.height + 6;
  const fromH = setText(cFrom, TG.from);
  const tgBottomPad = Math.round((cCard.y + cCard.height) - (cFrom.y + cFrom.height));
  // --- tinggi frame ---
  f.resize(f.width, oldH + totalShift);
  results.push({ frame: f.name, id: fid, ok: true, delta, totalShift, moved,
    pulsaSubH: subH1, tagihan: { nameH, subH, fromH, fromY: Math.round(cFrom.y), bottomPad: tgBottomPad },
    shifted, resizedFull, frameH: Math.round(f.height) });
}
return results;
