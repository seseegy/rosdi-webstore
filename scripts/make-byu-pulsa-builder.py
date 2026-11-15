#!/usr/bin/env python3
"""Transform figma-desktop-pulsa.js -> figma-desktop-pulsa-byu.js (Pulsa by.U).

by.U: operator baru Tahap 2 (prefix 0851/0852/0853, tile BU #1e3a8a),
punya tab Reguler/Transfer di CheckoutShell — frame ini menampilkan tab
Reguler aktif (pola tab desktop-game) + 11 nominal reguler by.U.
Harga dari data.js via node (calcTotals), bukan hitung tangan:
base Pulsa 50.000 Rp51.600 -> QRIS 51.600, e-wallet 51.850 (fee 250),
VA/retail 54.100 (fee 2.500), Pulsa 55.212 (fee 3.612 = round(51.600*7%)).
Run: python3 make-byu-pulsa-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-pulsa.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-pulsa-byu.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments
rep('// Builder frame Figma "Pulsa Telkomsel — Desktop" Rosdi Store (1280px).',
    '// Builder frame Figma "Pulsa by.U — Desktop" Rosdi Store (1280px).')
rep('// Isi mengikuti src/pages/PhonePages.jsx (Pulsa Telkomsel) +',
    '// Isi mengikuti src/pages/PhonePages.jsx (Pulsa by.U, transfer tersedia) +')
rep('// Contoh terpilih: Pulsa 50.000 Rp51.907, bayar QRIS (tanpa biaya).',
    '// Contoh terpilih: Pulsa 50.000 Rp51.600, bayar QRIS (tanpa biaya).')
rep('// Fee pulsa 7%: round(51907*0.07)=3633 -> Rp55.540.',
    '// Fee pulsa 7%: round(51600*0.07)=3612 -> Rp55.212.')

# measureW helper (tidak ada di builder pulsa; pola builder mobile)
anchor = """async function centerTxt(parent, name, cx, cy, str, size, weight, color) {
  const n = await txt(parent, name, 0, 0, str, size, weight, color);
  n.x = cx - n.width / 2; n.y = cy - n.height / 2;
  return n;
}"""
rep(anchor, anchor + """
async function measureW(str, size, weight) {
  const n = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: weight });
  n.fontName = { family: "Inter", style: weight };
  n.fontSize = size; n.characters = str;
  const w = n.width; n.remove(); return w;
}""")

# Crumb
rep('tile(frame, 126, 84, 42, "TS", "#DC2626");',
    'tile(frame, 126, 84, 42, "BU", "#1e3a8a");')
rep('await txt(frame, "CrumbTitle", 180, 86, "Pulsa Telkomsel", 20, "Bold", T.ink, { letterSpacing: -0.2 });',
    'await txt(frame, "CrumbTitle", 180, 86, "Pulsa by.U", 20, "Bold", T.ink, { letterSpacing: -0.2 });')
rep('"CrumbSub", 180, 110, "Pulsa reguler · masuk dalam hitungan detik", 13, "Regular"',
    '"CrumbSub", 180, 110, "Pulsa reguler & transfer · masuk dalam hitungan detik", 13, "Regular"')

# Langkah 1: nomor contoh + catatan deteksi
assert s.count('"081234567890"') == 2, f"nomor contoh: {s.count(chr(34)+'081234567890'+chr(34))}"
s = s.replace('"081234567890"', '"085123456789"')
rep('"Step1Note", LX + 16, y + 136, "Operator terdeteksi: Telkomsel.", 12.5, "Regular", T.green',
    '"Step1Note", LX + 16, y + 136, "Operator terdeteksi: by.U.", 12.5, "Regular", T.green')

# Langkah 2: NOMS by.U (11 nominal reguler)
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "Pulsa 5.000", price: "Rp6.400", meta: "Pulsa reguler" },
  { name: "Pulsa 10.000", price: "Rp12.100", meta: "Pulsa reguler" },
  { name: "Pulsa 15.000", price: "Rp16.600", meta: "Pulsa reguler" },
  { name: "Pulsa 20.000", price: "Rp21.600", meta: "Pulsa reguler" },
  { name: "Pulsa 25.000", price: "Rp26.600", meta: "Pulsa reguler" },
  { name: "Pulsa 30.000", price: "Rp31.600", meta: "Pulsa reguler" },
  { name: "Pulsa 50.000", price: "Rp51.600", meta: "Pulsa reguler" },
  { name: "Pulsa 75.000", price: "Rp74.600", meta: "Pulsa reguler" },
  { name: "Pulsa 100.000", price: "Rp97.600", meta: "Pulsa reguler" },
  { name: "Pulsa 150.000", price: "Rp148.500", meta: "Pulsa reguler" },
  { name: "Pulsa 200.000", price: "Rp197.500", meta: "Pulsa reguler" },
];"""
s = s.replace(old_noms, new_noms)
rep('// ---- Langkah 2: Nominal (11 nominal Telkomsel, data.js) ----',
    '// ---- Langkah 2: Nominal (11 nominal reguler by.U, data.js) ----')

# Langkah 2: kartu + grid digeser tab (pola desktop-game: tab y+56 h 34, grid y+102)
rep('  const h = 16 + 24 + 16 + gridH + 16;',
    '  const h = 16 + 24 + 16 + 34 + 12 + gridH + 16;')
rep('  await stepHead(frame, LX + 16, y + 16, 2, "Pilih Nominal");',
    '''  await stepHead(frame, LX + 16, y + 16, 2, "Pilih Nominal");
  const regW = Math.ceil(await measureW("Reguler", 13.5, "Medium")) + 22;
  const trW = Math.ceil(await measureW("Transfer", 13.5, "Medium")) + 22;
  rect(frame, "TabReguler", LX + 16, y + 56, regW, 34, T.blueStrong, 9);
  await centerTxt(frame, "TabRegulerText", LX + 16 + regW / 2, y + 73, "Reguler", 13.5, "Medium", "#FFFFFF");
  rect(frame, "TabTransfer", LX + 16 + regW + 8, y + 56, trW, 34, T.surface, 9, T.line);
  await centerTxt(frame, "TabTransferText", LX + 16 + regW + 8 + trW / 2, y + 73, "Transfer", 13.5, "Medium", T.sub);''')
rep('    const cy = y + 56 + Math.floor(i / 3) * (86 + cg);',
    '    const cy = y + 102 + Math.floor(i / 3) * (86 + cg);')

# Langkah 3: harga pembayaran base Rp51.600
rep('// ---- Langkah 3: Pembayaran (base Pulsa 50.000 Rp51.907) ----',
    '// ---- Langkah 3: Pembayaran (base Pulsa 50.000 Rp51.600) ----')
rep('{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp51.907", fee: "tanpa biaya" },',
    '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp51.600", fee: "tanpa biaya" },')
assert s.count('price: "Rp52.157", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp52.157", fee: "biaya Rp250"', 'price: "Rp51.850", fee: "biaya Rp250"')
assert s.count('price: "Rp54.407", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp54.407", fee: "biaya Rp2.500"', 'price: "Rp54.100", fee: "biaya Rp2.500"')
assert s.count('price: "Rp55.540", fee: "biaya Rp3.633"') == 2
s = s.replace('price: "Rp55.540", fee: "biaya Rp3.633"', 'price: "Rp55.212", fee: "biaya Rp3.612"')

# Ringkasan
rep('["Produk", "Pulsa Telkomsel"],', '["Produk", "Pulsa by.U"],')
rep('["Harga", "Rp51.907"],', '["Harga", "Rp51.600"],')
rep('await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp51.907", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
    'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp51.600", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks: "Telkomsel" hanya tersisa 1x (baris bayar Pulsa Telkomsel)
assert s.count("Telkomsel") == 1, f"Telkomsel tersisa {s.count('Telkomsel')}x (harusnya 1: baris bayar)"
assert "Rp51.907" not in s and "Rp52.157" not in s and "Rp54.407" not in s and "Rp55.540" not in s, "harga lama tersisa"
assert "Rp51.600" in s and "Rp51.850" in s and "Rp54.100" in s and "Rp55.212" in s, "harga by.U hilang"
assert "by.U" in s and '"BU"' in s and "TabReguler" in s and "measureW" in s, "nilai by.U/tab hilang"
assert "081234567890" not in s and "085123456789" in s, "nomor contoh salah"
print("OK: builder written to", DST)
