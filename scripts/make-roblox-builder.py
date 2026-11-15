#!/usr/bin/env python3
"""Transform figma-desktop-game-pubg.js -> figma-desktop-game-roblox.js (Roblox).

PUBG adalah basis terdekat: 1 tab, 4 item, grid 3x2, tanpa Zone ID/server.
Run: python3 make-roblox-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-pubg.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-roblox.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments
rep('// Builder frame Figma "PUBG Mobile — Desktop" Rosdi Store (1280px).',
    '// Builder frame Figma "Roblox — Desktop" Rosdi Store (1280px).')
rep('// Isi mengikuti src/pages/GamePage.jsx (PUBG Mobile, tanpa Zone ID/server) +',
    '// Isi mengikuti src/pages/GamePage.jsx (Roblox, tanpa Zone ID/server) +')

# Crumb
rep('tile(frame, 126, 84, 42, "PB", "#334155");',
    'tile(frame, 126, 84, 42, "RB", "#334155");')
rep('"CrumbTitle", 180, 86, "PUBG Mobile", 20, "Bold"',
    '"CrumbTitle", 180, 86, "Roblox", 20, "Bold"')
rep('"CrumbSub", 180, 110, "Level Infinite · Top up langsung ke akun", 13, "Regular"',
    '"CrumbSub", 180, 110, "Roblox Corporation · Gift card Robux, kode ke email", 13, "Regular"')

# Nominal: whole NOMS block (PUBG 4 UC -> Roblox 4 Robux)
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "80 Robux", price: "Rp15.500" },
  { name: "400 Robux", price: "Rp75.000", badge: "Terlaris" },
  { name: "800 Robux", price: "Rp149.000" },
  { name: "1700 Robux", price: "Rp299.000" },
];"""
s = s.replace(old_noms, new_noms)

# Tab: "UC" (w 64, center LX+48) -> "Robux" (w 76, center LX+54; sama seperti "Token" HoK)
rep('rect(frame, "TabUC", LX + 16, y + 56, 64, 34, T.blueStrong, 9);',
    'rect(frame, "TabRobux", LX + 16, y + 56, 76, 34, T.blueStrong, 9);')
rep('await centerTxt(frame, "TabUCText", LX + 48, y + 73, "UC", 13.5, "Medium", "#FFFFFF");',
    'await centerTxt(frame, "TabRobuxText", LX + 54, y + 73, "Robux", 13.5, "Medium", "#FFFFFF");')
rep('NOMS[i].name === "325 UC"', 'NOMS[i].name === "400 Robux"')

# Langkah 4 comment + payment prices (base 400 Robux Rp75.000)
rep('// ---- Langkah 4: Pembayaran (base 325 UC Rp72.000) ----',
    '// ---- Langkah 4: Pembayaran (base 400 Robux Rp75.000) ----')
rep('{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp72.000", fee: "tanpa biaya" },',
    '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp75.000", fee: "tanpa biaya" },')
# e-wallet rows share identical price/fee strings; 4 occurrences
assert s.count('price: "Rp72.250", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp72.250", fee: "biaya Rp250"', 'price: "Rp75.250", fee: "biaya Rp250"')
# VA + retail rows share identical price/fee strings; 5 occurrences (BCA/Mandiri/BRI/Alfamart/Indomaret)
assert s.count('price: "Rp74.500", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp74.500", fee: "biaya Rp2.500"', 'price: "Rp77.500", fee: "biaya Rp2.500"')
# Pulsa rows (2 occurrences): round(75.000 x 7%) = 5.250 -> Rp80.250
assert s.count('price: "Rp77.040", fee: "biaya Rp5.040"') == 2
s = s.replace('price: "Rp77.040", fee: "biaya Rp5.040"', 'price: "Rp80.250", fee: "biaya Rp5.250"')

# Summary rows
rep('["Produk", "PUBG Mobile"],', '["Produk", "Roblox"],')
rep('["Item", "325 UC"],', '["Item", "400 Robux"],')
rep('["Harga", "Rp72.000"],', '["Harga", "Rp75.000"],')
rep('await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp72.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
    'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp75.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks
assert "PUBG Mobile" not in s and "PUBG" not in s and "Level Infinite" not in s, "PUBG remnants remain"
assert "325 UC" not in s and "60 UC" not in s and '"UC"' not in s and "TabUC" not in s, "UC remnants remain"
assert "Rp72.000" not in s and "Rp72.250" not in s and "Rp74.500" not in s and "Rp77.040" not in s, "old prices remain"
assert "Roblox" in s and "400 Robux" in s and "Rp75.000" in s and "Rp80.250" in s and "Roblox Corporation" in s, "Roblox values missing"
print("OK: builder written to", DST)
