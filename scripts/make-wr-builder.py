#!/usr/bin/env python3
"""Transform figma-desktop-game-valorant.js -> figma-desktop-game-wr.js (Wild Rift).

Valorant adalah basis terdekat: 1 tab, grid 3 kolom, needsZone TRUE (kolom Zone
ID dipertahankan — Wild Rift needsZone: true, tanpa server). Sub crumb sama
("Riot Games · Via Riot ID + tag"), jadi tidak diubah.
Harga dihitung lewat calcTotals data.js via node -e, bukan hitung tangan:
base 1000 Wild Cores Rp159.000 -> QRIS 159.000, e-wallet 159.250,
VA/retail 161.500, pulsa 170.130 (fee 11.130 = round(159.000 x 7%)).
Tab "Wild Cores" (10 karakter): kalibrasi tab desktop lain — "Points" 6 kar
84px, "Diamonds" 8 kar 100px, "Genesis Crystal" 15 kar 140px (~6.5px/kar +
44 padding) -> 10 kar ~110px, center LX+71.
Run: python3 make-wr-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-valorant.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-wr.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments
rep('// Builder frame Figma "Valorant — Desktop" Rosdi Store (1280px).',
    '// Builder frame Figma "League of Legends: Wild Rift — Desktop" Rosdi Store (1280px).')
rep('// Isi mengikuti src/pages/GamePage.jsx (Valorant, Zone ID, tanpa server) +',
    '// Isi mengikuti src/pages/GamePage.jsx (League of Legends: Wild Rift, Zone ID, tanpa server) +')

# Crumb (sub "Riot Games · Via Riot ID + tag" sama — tidak diubah)
rep('tile(frame, 126, 84, 42, "VL", "#475569");',
    'tile(frame, 126, 84, 42, "WR", "#0284c7");')
rep('"CrumbTitle", 180, 86, "Valorant", 20, "Bold"',
    '"CrumbTitle", 180, 86, "League of Legends: Wild Rift", 20, "Bold"')

# Nominal: whole NOMS block (Valorant 6 Points -> Wild Rift 5 Wild Cores)
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "475 Wild Cores", price: "Rp79.000" },
  { name: "1000 Wild Cores", price: "Rp159.000", badge: "Terlaris" },
  { name: "1850 Wild Cores", price: "Rp299.000" },
  { name: "3275 Wild Cores", price: "Rp499.000" },
  { name: "5650 Wild Cores", price: "Rp829.000" },
];"""
s = s.replace(old_noms, new_noms)

# Tab: "Points" (w 84, center LX+58) -> "Wild Cores" (w 110, center LX+71)
rep('rect(frame, "TabPoints", LX + 16, y + 56, 84, 34, T.blueStrong, 9);',
    'rect(frame, "TabWildCores", LX + 16, y + 56, 110, 34, T.blueStrong, 9);')
rep('await centerTxt(frame, "TabPointsText", LX + 58, y + 73, "Points", 13.5, "Medium", "#FFFFFF");',
    'await centerTxt(frame, "TabWildCoresText", LX + 71, y + 73, "Wild Cores", 13.5, "Medium", "#FFFFFF");')
rep('NOMS[i].name === "1000 Points"', 'NOMS[i].name === "1000 Wild Cores"')

# Langkah 4 comment + payment prices (base 1000 Wild Cores Rp159.000)
rep('// ---- Langkah 4: Pembayaran (base 1000 Points Rp119.000) ----',
    '// ---- Langkah 4: Pembayaran (base 1000 Wild Cores Rp159.000) ----')
rep('{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp119.000", fee: "tanpa biaya" },',
    '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp159.000", fee: "tanpa biaya" },')
# e-wallet rows share identical price/fee strings; 4 occurrences
assert s.count('price: "Rp119.250", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp119.250", fee: "biaya Rp250"', 'price: "Rp159.250", fee: "biaya Rp250"')
# VA + retail rows share identical price/fee strings; 5 occurrences (BCA/Mandiri/BRI/Alfamart/Indomaret)
assert s.count('price: "Rp121.500", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp121.500", fee: "biaya Rp2.500"', 'price: "Rp161.500", fee: "biaya Rp2.500"')
# Pulsa rows (2 occurrences): round(159.000 x 7%) = 11.130 -> Rp170.130
assert s.count('price: "Rp127.330", fee: "biaya Rp8.330"') == 2
s = s.replace('price: "Rp127.330", fee: "biaya Rp8.330"', 'price: "Rp170.130", fee: "biaya Rp11.130"')

# Summary rows (Tujuan "12345678 (1234)" dipertahankan — needsZone true)
rep('["Produk", "Valorant"],', '["Produk", "League of Legends: Wild Rift"],')
rep('["Item", "1000 Points"],', '["Item", "1000 Wild Cores"],')
rep('["Harga", "Rp119.000"],', '["Harga", "Rp159.000"],')
rep('await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp119.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
    'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp159.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks (termasuk komentar — pelajaran Siklus 120)
assert "Valorant" not in s and "Points" not in s and "TabPoints" not in s, "Valorant remnants remain"
assert "Rp119.000" not in s and "Rp119.250" not in s and "Rp121.500" not in s and "Rp127.330" not in s, "old prices remain"
assert "League of Legends: Wild Rift" in s and "1000 Wild Cores" in s and "Rp159.000" in s and "Rp170.130" in s and "Riot Games" in s, "Wild Rift values missing"
assert "TabWildCores" in s and '"Wild Cores"' in s, "Wild Cores tab missing"
assert "Zone ID" in s and "12345678 (1234)" in s, "Zone ID missing"
print("OK: builder written to", DST)
