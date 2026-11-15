#!/usr/bin/env python3
"""Transform figma-desktop-game-ff.js -> figma-desktop-game-hok.js (Honor of Kings).

Replacements are targeted with unique context so footer link "Free Fire"
(product list) is NOT touched. Run: python3 make-hok-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-ff.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-hok.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments
rep('// Builder frame Figma "Free Fire — Desktop" Rosdi Store (1280px).',
    '// Builder frame Figma "Honor of Kings — Desktop" Rosdi Store (1280px).')
rep('// Isi mengikuti src/pages/GamePage.jsx (Free Fire, tanpa Zone ID/server) +',
    '// Isi mengikuti src/pages/GamePage.jsx (Honor of Kings, tanpa Zone ID/server) +')

# Crumb
rep('tile(frame, 126, 84, 42, "FF", "#0284c7");',
    'tile(frame, 126, 84, 42, "HK", "#1e3a8a");')
rep('"CrumbTitle", 180, 86, "Free Fire", 20, "Bold"',
    '"CrumbTitle", 180, 86, "Honor of Kings", 20, "Bold"')
rep('"CrumbSub", 180, 110, "Garena · Top up langsung ke akun", 13, "Regular"',
    '"CrumbSub", 180, 110, "TiMi Studio · Top up token langsung ke akun", 13, "Regular"')

# Nominal: whole NOMS block (FF 8 items -> HoK Token 6 items)
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "16 Token", price: "Rp1.500" },
  { name: "80 Token", price: "Rp7.200" },
  { name: "240 Token", price: "Rp21.500", badge: "Terlaris" },
  { name: "400 Token", price: "Rp35.500" },
  { name: "800 Token", price: "Rp71.000" },
  { name: "2400 Token", price: "Rp212.000" },
];"""
s = s.replace(old_noms, new_noms)

# Tabs: "Diamonds" (w 100, center LX+66) -> "Token" (w 76, center LX+54);
# "Membership" (x LX+124, w 116, center LX+182) -> "Weekly Card" (x LX+100, w 124, center LX+162)
rep('rect(frame, "TabDiamonds", LX + 16, y + 56, 100, 34, T.blueStrong, 9);',
    'rect(frame, "TabToken", LX + 16, y + 56, 76, 34, T.blueStrong, 9);')
rep('await centerTxt(frame, "TabDiamondsText", LX + 66, y + 73, "Diamonds", 13.5, "Medium", "#FFFFFF");',
    'await centerTxt(frame, "TabTokenText", LX + 54, y + 73, "Token", 13.5, "Medium", "#FFFFFF");')
rep('rect(frame, "TabMembership", LX + 124, y + 56, 116, 34, T.surface, 9, T.line);',
    'rect(frame, "TabWeeklyCard", LX + 100, y + 56, 124, 34, T.surface, 9, T.line);')
rep('await centerTxt(frame, "TabMembershipText", LX + 182, y + 73, "Membership", 13.5, "Medium", T.sub);',
    'await centerTxt(frame, "TabWeeklyCardText", LX + 162, y + 73, "Weekly Card", 13.5, "Medium", T.sub);')
rep('NOMS[i].name === "140 Diamonds"', 'NOMS[i].name === "240 Token"')

# Langkah 4 comment + payment prices (base 240 Token Rp21.500)
rep('// ---- Langkah 4: Pembayaran (base 140 Diamonds Rp18.900) ----',
    '// ---- Langkah 4: Pembayaran (base 240 Token Rp21.500) ----')
rep('{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp18.900", fee: "tanpa biaya" },',
    '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp21.500", fee: "tanpa biaya" },')
# e-wallet rows share identical price/fee strings; replace all 4 occurrences at once
assert s.count('price: "Rp19.150", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp19.150", fee: "biaya Rp250"', 'price: "Rp21.750", fee: "biaya Rp250"')
# VA + retail rows share identical price/fee strings; 5 occurrences (BCA/Mandiri/BRI/Alfamart/Indomaret)
assert s.count('price: "Rp21.400", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp21.400", fee: "biaya Rp2.500"', 'price: "Rp24.000", fee: "biaya Rp2.500"')
# Pulsa rows (2 occurrences)
assert s.count('price: "Rp20.223", fee: "biaya Rp1.323"') == 2
s = s.replace('price: "Rp20.223", fee: "biaya Rp1.323"', 'price: "Rp23.005", fee: "biaya Rp1.505"')

# Summary rows
rep('["Produk", "Free Fire"],', '["Produk", "Honor of Kings"],')
rep('["Item", "140 Diamonds"],', '["Item", "240 Token"],')
rep('["Harga", "Rp18.900"],', '["Harga", "Rp21.500"],')
rep('await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp18.900", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
    'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp21.500", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks
assert "Free Fire" in s, "footer product link 'Free Fire' must survive"
assert s.count("Free Fire") == 1, f"Free Fire must appear exactly once (footer link), got {s.count('Free Fire')}"
assert "Diamonds" not in s and "Membership" not in s and "Garena" not in s, "FF remnants remain"
assert "Rp18.900" not in s and "Rp19.150" not in s and "Rp21.400" not in s and "Rp20.223" not in s, "old prices remain"
assert "Rp21.500" in s and "Rp23.005" in s and "240 Token" in s, "HoK values missing"
print("OK: builder written to", DST)
