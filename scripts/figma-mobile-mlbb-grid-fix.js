// Siklus 50: sinkron frame MLBB mobile (Light 1:208 + Dark 1:314) vs kode.
// (a) Grid nominal Langkah 2: 3 kolom x 2 baris (6 item) -> 2 kolom x 7 baris
//     (14 item, sesuai .nom-grid 2 kolom di <=560px + data.js). 8 sel baru
//     dibuat dengan clone sel 86 Diamonds (gaya tak-terpilih).
// (b) Harga 86 Diamonds Rp21.500 -> Rp21.580 (data.js; frame desktop sudah
//     benar Rp21.580 — harga mobile salah, lolos dari check-figma-prices
//     karena Rp21.500 kebetulan = harga HoK 240 Token).
// (c) Catatan Langkah 3 "Stok: tersedia" -> "Stok tersedia · maksimal 10
//     per transaksi" (persis CheckoutShell.jsx:85) di MLBB + FF mobile
//     (FF Light 111:2 + Dark 111:139; grid FF sudah 2 kolom, hanya catatan).
// Geometri: sel 158x54, x 32/200, y 342 + baris*62; kartu Langkah 2
// 238 -> 548 (+310); semua simpul y>=502 geser +310; frame 1576 -> 1886.
// Badge Terlaris/-5% ikut selnya (pola FF: rect x=sel+104 y=sel+28).
async function setText(node, chars) {
  const segs = node.getStyledTextSegments(["fontName"]);
  for (const s of segs) await figma.loadFontAsync(s.fontName);
  node.characters = chars;
}
const ITEMS = [
  { name: "3 Diamonds", price: "Rp1.650" },
  { name: "5 Diamonds", price: "Rp1.700" },
  { name: "12 Diamonds", price: "Rp3.850" },
  { name: "28 Diamonds", price: "Rp8.950" },
  { name: "44 Diamonds", price: "Rp13.900" },
  { name: "59 Diamonds", price: "Rp18.500" },
  { name: "86 Diamonds", price: "Rp21.580" },
  { name: "172 Diamonds", price: "Rp43.500", badge: "Terlaris" },
  { name: "257 Diamonds", price: "Rp64.900" },
  { name: "344 Diamonds", price: "Rp86.500" },
  { name: "514 Diamonds", price: "Rp129.000" },
  { name: "706 Diamonds", price: "Rp175.500", badge: "-5%" },
  { name: "1050 Diamonds", price: "Rp262.000" },
  { name: "2195 Diamonds", price: "Rp548.000" },
];
const MLBB = [
  { frame: "1:208", card2: "1:226", stock: "1:269", cells: {
    "86 Diamonds": { rect: "1:236", name: "1:237", price: "1:238" },
    "172 Diamonds": { rect: "1:239", name: "1:240", price: "1:241", badgeText: "1:244" },
    "257 Diamonds": { rect: "1:245", name: "1:246", price: "1:247" },
    "344 Diamonds": { rect: "1:248", name: "1:249", price: "1:250" },
    "514 Diamonds": { rect: "1:251", name: "1:252", price: "1:253" },
    "706 Diamonds": { rect: "1:254", name: "1:255", price: "1:256", badgeText: "1:259" } } },
  { frame: "1:314", card2: "1:332", stock: "1:375", cells: {
    "86 Diamonds": { rect: "1:342", name: "1:343", price: "1:344" },
    "172 Diamonds": { rect: "1:345", name: "1:346", price: "1:347", badgeText: "1:350" },
    "257 Diamonds": { rect: "1:351", name: "1:352", price: "1:353" },
    "344 Diamonds": { rect: "1:354", name: "1:355", price: "1:356" },
    "514 Diamonds": { rect: "1:357", name: "1:358", price: "1:359" },
    "706 Diamonds": { rect: "1:360", name: "1:361", price: "1:362", badgeText: "1:365" } } },
];
const FF = [
  { frame: "111:2", stock: "111:63" },
  { frame: "111:139", stock: "111:200" },
];
const SHIFT = 310, ROWH = 62, GRID_Y0 = 342;
const out = [];
// ---- MLBB: rebuild grid + stock note ----
for (const t of MLBB) {
  const frame = figma.getNodeById(t.frame);
  const moved = new Set([t.card2]);
  const grid = [];
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    const cx = 32 + (i % 2) * 168, cy = GRID_Y0 + Math.floor(i / 2) * ROWH;
    const old = t.cells[it.name];
    let rect, nm, pr;
    if (old) {
      rect = figma.getNodeById(old.rect); nm = figma.getNodeById(old.name); pr = figma.getNodeById(old.price);
      // simpul meta kosong (chars '') di dalam sel lama ikut pindah
      for (const ch of frame.children) {
        if (ch.type === "TEXT" && ch.characters === "" && ch.x >= rect.x && ch.x < rect.x + 104 && ch.y >= rect.y && ch.y < rect.y + 54) {
          ch.x += cx - rect.x; ch.y += cy - rect.y; moved.add(ch.id);
        }
      }
      if (it.price !== pr.characters) await setText(pr, it.price); // koreksi Rp21.580
    } else {
      const src = t.cells["86 Diamonds"];
      const sRect = figma.getNodeById(src.rect), sName = figma.getNodeById(src.name), sPrice = figma.getNodeById(src.price);
      rect = sRect.clone(); nm = sName.clone(); pr = sPrice.clone();
      frame.appendChild(rect); frame.appendChild(nm); frame.appendChild(pr);
      rect.name = it.name; nm.name = it.name; pr.name = it.price;
      await setText(nm, it.name); await setText(pr, it.price);
    }
    rect.x = cx; rect.y = cy; rect.resize(158, 54);
    nm.x = cx + 12; nm.y = cy + 8; nm.textAutoResize = "HEIGHT"; nm.resize(134, 13);
    pr.x = cx + 12; pr.y = cy + 30; pr.textAutoResize = "HEIGHT"; pr.resize(134, 15);
    moved.add(rect.id); moved.add(nm.id); moved.add(pr.id);
    if (old && old.badgeText) {
      const bt = figma.getNodeById(old.badgeText);
      const br = frame.children.find(c => c.type === "RECTANGLE" && c.width === 42 && c.height === 14 && c.x === bt.x - 4 && c.y === bt.y - 2);
      if (!br) throw new Error("badge rect tidak ketemu di " + t.frame + " untuk " + it.name);
      br.x = cx + 104; br.y = cy + 28; bt.x = cx + 108; bt.y = cy + 30;
      moved.add(br.id); moved.add(bt.id);
    }
    grid.push({ item: it.name, price: pr.characters, x: rect.x, y: rect.y });
  }
  const card2 = figma.getNodeById(t.card2);
  card2.resize(358, 238 + SHIFT);
  let shifted = 0;
  for (const ch of frame.children) {
    if (ch.y >= 502 && !moved.has(ch.id)) { ch.y += SHIFT; shifted++; }
  }
  frame.resize(390, 1576 + SHIFT);
  const stock = figma.getNodeById(t.stock);
  await setText(stock, "Stok tersedia · maksimal 10 per transaksi");
  stock.textAutoResize = "HEIGHT"; stock.resize(196, stock.height);
  const card3 = frame.children.find(c => c.type === "RECTANGLE" && c.width === 358 && c.height === 96 && c.y >= 800);
  out.push({ frame: t.frame, grid, card2H: card2.height, frameH: frame.height, shifted,
    stock: { chars: stock.characters, h: stock.height, bottom: stock.y + stock.height, card3Bottom: card3 ? card3.y + card3.height : null } });
}
// ---- FF: hanya catatan stok ----
for (const t of FF) {
  const frame = figma.getNodeById(t.frame);
  const stock = figma.getNodeById(t.stock);
  await setText(stock, "Stok tersedia · maksimal 10 per transaksi");
  stock.textAutoResize = "HEIGHT"; stock.resize(196, stock.height);
  const card3 = frame.children.find(c => c.type === "RECTANGLE" && c.width === 358 && c.height === 96 && c.y >= 600 && c.y < 700);
  out.push({ frame: t.frame, stock: { chars: stock.characters, h: stock.height, bottom: stock.y + stock.height, card3Bottom: card3 ? card3.y + card3.height : null } });
}
return out;
