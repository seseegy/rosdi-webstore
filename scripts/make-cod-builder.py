#!/usr/bin/env python3
"""Transform figma-desktop-game-valorant.js -> figma-desktop-game-cod.js (CoD Mobile).

Valorant adalah basis terdekat: 1 tab, grid 3 kolom. CoD Mobile: 1 tab "CP",
5 item, needsZone FALSE (kolom Zone ID dihapus, pola FF desktop), tanpa server.
Harga dihitung lewat calcTotals data.js via node -e, bukan hitung tangan:
base 400 CP Rp75.000 -> QRIS 75.000, e-wallet 75.250, VA/retail 77.500,
pulsa 80.250 (fee 5.250 = round(75.000 x 7%)).
Run: python3 make-cod-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-valorant.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-cod.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments
rep('// Builder frame Figma "Valorant — Desktop" Rosdi Store (1280px).',
    '// Builder frame Figma "Call of Duty: Mobile — Desktop" Rosdi Store (1280px).')
rep('// Isi mengikuti src/pages/GamePage.jsx (Valorant, Zone ID, tanpa server) +',
    '// Isi mengikuti src/pages/GamePage.jsx (Call of Duty: Mobile, tanpa Zone ID/server) +')

# Crumb
rep('tile(frame, 126, 84, 42, "VL", "#475569");',
    'tile(frame, 126, 84, 42, "CM", "#2563eb");')
rep('"CrumbTitle", 180, 86, "Valorant", 20, "Bold"',
    '"CrumbTitle", 180, 86, "Call of Duty: Mobile", 20, "Bold"')
rep('"CrumbSub", 180, 110, "Riot Games · Via Riot ID + tag", 13, "Regular"',
    '"CrumbSub", 180, 110, "Garena · Top up langsung ke akun", 13, "Regular"')

# Langkah 1: hapus kolom Zone ID (CoD needsZone: false, pola FF desktop)
rep('  await inputField(frame, LX + 372, y + 56, 328, "Zone ID", "1234");\n', '')
rep('await txt(frame, "Step1Note", LX + 16, y + 140, "Contoh penulisan: 12345678(1234). Zone ID ditulis tanpa tanda kurung juga bisa.", 12.5, "Regular", T.sub, { width: 684, lineHeight: 19 });',
    'await txt(frame, "Step1Note", LX + 16, y + 140, "Contoh penulisan: 12345678.", 12.5, "Regular", T.sub, { width: 684, lineHeight: 19 });')

# Nominal: whole NOMS block (Valorant 6 Points -> CoD 5 CP)
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "80 CP", price: "Rp15.000" },
  { name: "400 CP", price: "Rp75.000", badge: "Terlaris" },
  { name: "800 CP", price: "Rp149.000" },
  { name: "2000 CP", price: "Rp369.000" },
  { name: "5000 CP", price: "Rp899.000" },
];"""
s = s.replace(old_noms, new_noms)

# Tab: "Points" (w 84, center LX+58) -> "CP" (w 64, center LX+48; kalibrasi tab "UC" PUBG desktop)
rep('rect(frame, "TabPoints", LX + 16, y + 56, 84, 34, T.blueStrong, 9);',
    'rect(frame, "TabCP", LX + 16, y + 56, 64, 34, T.blueStrong, 9);')
rep('await centerTxt(frame, "TabPointsText", LX + 58, y + 73, "Points", 13.5, "Medium", "#FFFFFF");',
    'await centerTxt(frame, "TabCPText", LX + 48, y + 73, "CP", 13.5, "Medium", "#FFFFFF");')
rep('NOMS[i].name === "1000 Points"', 'NOMS[i].name === "400 CP"')

# Langkah 4 comment + payment prices (base 400 CP Rp75.000)
rep('// ---- Langkah 4: Pembayaran (base 1000 Points Rp119.000) ----',
    '// ---- Langkah 4: Pembayaran (base 400 CP Rp75.000) ----')
rep('{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp119.000", fee: "tanpa biaya" },',
    '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp75.000", fee: "tanpa biaya" },')
# e-wallet rows share identical price/fee strings; 4 occurrences
assert s.count('price: "Rp119.250", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp119.250", fee: "biaya Rp250"', 'price: "Rp75.250", fee: "biaya Rp250"')
# VA + retail rows share identical price/fee strings; 5 occurrences (BCA/Mandiri/BRI/Alfamart/Indomaret)
assert s.count('price: "Rp121.500", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp121.500", fee: "biaya Rp2.500"', 'price: "Rp77.500", fee: "biaya Rp2.500"')
# Pulsa rows (2 occurrences): round(75.000 x 7%) = 5.250 -> Rp80.250
assert s.count('price: "Rp127.330", fee: "biaya Rp8.330"') == 2
s = s.replace('price: "Rp127.330", fee: "biaya Rp8.330"', 'price: "Rp80.250", fee: "biaya Rp5.250"')

# Summary rows
rep('["Produk", "Valorant"],', '["Produk", "Call of Duty: Mobile"],')
rep('["Item", "1000 Points"],', '["Item", "400 CP"],')
rep('["Tujuan", "12345678 (1234)"],', '["Tujuan", "12345678"],')
rep('["Harga", "Rp119.000"],', '["Harga", "Rp75.000"],')
rep('await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp119.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
    'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp75.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks (termasuk komentar — pelajaran Siklus 120)
assert "Valorant" not in s and "Points" not in s and "TabPoints" not in s, "Valorant remnants remain"
assert "Riot Games" not in s and '"Zone ID"' not in s and "Zone ID ditulis" not in s and "12345678 (1234)" not in s, "Zone/Riot remnants remain"
assert "Rp119.000" not in s and "Rp119.250" not in s and "Rp121.500" not in s and "Rp127.330" not in s, "old prices remain"
assert "Call of Duty: Mobile" in s and "400 CP" in s and "Rp75.000" in s and "Rp80.250" in s and "Garena" in s, "CoD values missing"
assert "TabCP" in s and '"CP"' in s, "CP tab missing"
print("OK: builder written to", DST)
