#!/usr/bin/env python3
"""Transform figma-desktop-game-roblox.js -> figma-desktop-game-valorant.js (Valorant).

Roblox adalah basis terdekat: 1 tab, grid 3 kolom. Valorant: 1 tab "Points",
6 item, needsZone TRUE (kolom Zone ID seperti MLBB), tanpa server.
Harga dihitung lewat calcTotals data.js via node -e, bukan hitung tangan:
base 119.000 -> QRIS 119.000, e-wallet 119.250, VA/retail 121.500,
pulsa 127.330 (fee 8.330 = round(119.000 x 7%)).
Run: python3 make-valorant-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-roblox.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-valorant.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments
rep('// Builder frame Figma "Roblox — Desktop" Rosdi Store (1280px).',
    '// Builder frame Figma "Valorant — Desktop" Rosdi Store (1280px).')
rep('// Isi mengikuti src/pages/GamePage.jsx (Roblox, tanpa Zone ID/server) +',
    '// Isi mengikuti src/pages/GamePage.jsx (Valorant, Zone ID, tanpa server) +')

# Crumb
rep('tile(frame, 126, 84, 42, "RB", "#334155");',
    'tile(frame, 126, 84, 42, "VL", "#475569");')
rep('"CrumbTitle", 180, 86, "Roblox", 20, "Bold"',
    '"CrumbTitle", 180, 86, "Valorant", 20, "Bold"')
rep('"CrumbSub", 180, 110, "Roblox Corporation · Gift card Robux, kode ke email", 13, "Regular"',
    '"CrumbSub", 180, 110, "Riot Games · Via Riot ID + tag", 13, "Regular"')

# Langkah 1: tambah kolom Zone ID (seperti MLBB desktop) + catatan kode
rep('await inputField(frame, LX + 16, y + 56, 342, "User ID", "12345678");',
    'await inputField(frame, LX + 16, y + 56, 342, "User ID", "12345678");\n  await inputField(frame, LX + 372, y + 56, 328, "Zone ID", "1234");')
rep('await txt(frame, "Step1Note", LX + 16, y + 140, "Contoh penulisan: 12345678.", 12.5, "Regular", T.sub, { width: 684, lineHeight: 19 });',
    'await txt(frame, "Step1Note", LX + 16, y + 140, "Contoh penulisan: 12345678(1234). Zone ID ditulis tanpa tanda kurung juga bisa.", 12.5, "Regular", T.sub, { width: 684, lineHeight: 19 });')

# Nominal: whole NOMS block (Roblox 4 Robux -> Valorant 6 Points)
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "475 Points", price: "Rp59.000" },
  { name: "1000 Points", price: "Rp119.000", badge: "Terlaris" },
  { name: "2050 Points", price: "Rp239.000" },
  { name: "3650 Points", price: "Rp419.000" },
  { name: "5350 Points", price: "Rp599.000" },
  { name: "11000 Points", price: "Rp1.199.000" },
];"""
s = s.replace(old_noms, new_noms)

# Tab: "Robux" (w 76, center LX+54) -> "Points" (w 84, center LX+58; teks + 44 padding)
rep('rect(frame, "TabRobux", LX + 16, y + 56, 76, 34, T.blueStrong, 9);',
    'rect(frame, "TabPoints", LX + 16, y + 56, 84, 34, T.blueStrong, 9);')
rep('await centerTxt(frame, "TabRobuxText", LX + 54, y + 73, "Robux", 13.5, "Medium", "#FFFFFF");',
    'await centerTxt(frame, "TabPointsText", LX + 58, y + 73, "Points", 13.5, "Medium", "#FFFFFF");')
rep('NOMS[i].name === "400 Robux"', 'NOMS[i].name === "1000 Points"')

# Langkah 4 comment + payment prices (base 1000 Points Rp119.000)
rep('// ---- Langkah 4: Pembayaran (base 400 Robux Rp75.000) ----',
    '// ---- Langkah 4: Pembayaran (base 1000 Points Rp119.000) ----')
rep('{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp75.000", fee: "tanpa biaya" },',
    '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp119.000", fee: "tanpa biaya" },')
# e-wallet rows share identical price/fee strings; 4 occurrences
assert s.count('price: "Rp75.250", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp75.250", fee: "biaya Rp250"', 'price: "Rp119.250", fee: "biaya Rp250"')
# VA + retail rows share identical price/fee strings; 5 occurrences (BCA/Mandiri/BRI/Alfamart/Indomaret)
assert s.count('price: "Rp77.500", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp77.500", fee: "biaya Rp2.500"', 'price: "Rp121.500", fee: "biaya Rp2.500"')
# Pulsa rows (2 occurrences): round(119.000 x 7%) = 8.330 -> Rp127.330
assert s.count('price: "Rp80.250", fee: "biaya Rp5.250"') == 2
s = s.replace('price: "Rp80.250", fee: "biaya Rp5.250"', 'price: "Rp127.330", fee: "biaya Rp8.330"')

# Summary rows
rep('["Produk", "Roblox"],', '["Produk", "Valorant"],')
rep('["Item", "400 Robux"],', '["Item", "1000 Points"],')
rep('["Tujuan", "12345678"],', '["Tujuan", "12345678 (1234)"],')
rep('["Harga", "Rp75.000"],', '["Harga", "Rp119.000"],')
rep('await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp75.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
    'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp119.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks
assert "Roblox" not in s and "Robux" not in s and "TabRobux" not in s, "Roblox remnants remain"
assert "Rp75.000" not in s and "Rp75.250" not in s and "Rp77.500" not in s and "Rp80.250" not in s, "old prices remain"
assert "Valorant" in s and "1000 Points" in s and "Rp119.000" in s and "Rp127.330" in s and "Riot Games" in s, "Valorant values missing"
assert "Zone ID" in s and "12345678 (1234)" in s, "Zone ID missing"
print("OK: builder written to", DST)
