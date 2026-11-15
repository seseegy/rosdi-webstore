#!/usr/bin/env python3
"""Transform figma-desktop-game-aov.js -> figma-desktop-game-df.js (Delta Force).

AoV adalah basis terdekat: 1 tab, grid 3 kolom, needsZone FALSE
(kolom Zone ID sudah dihapus, pola FF/CoD desktop), sub crumb sama
("Garena · Top up langsung ke akun"). Delta Force: 1 tab "Delta Coins",
5 item, needsZone FALSE, tanpa server.
Harga dihitung lewat calcTotals data.js, bukan hitung tangan:
base 300 Delta Coins Rp74.000 -> QRIS 74.000, e-wallet 74.250, VA/retail 76.500,
pulsa 79.180 (fee 5.180 = round(74.000 x 7%)).
Tab "Delta Coins" (12 karakter): kalibrasi tab desktop lain — "CP" 2 kar 64px,
"Voucher" 7 kar 90px, "Wild Cores" 10 kar 110px (~6.5px/kar + 44 padding)
-> 12 kar ~122px, center LX+77.
Run: python3 make-df-desktop-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-aov.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-df.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments
rep('// Builder frame Figma "Arena of Valor — Desktop" Rosdi Store (1280px).',
    '// Builder frame Figma "Delta Force — Desktop" Rosdi Store (1280px).')
rep('// Isi mengikuti src/pages/GamePage.jsx (Arena of Valor, tanpa Zone ID/server) +',
    '// Isi mengikuti src/pages/GamePage.jsx (Delta Force, tanpa Zone ID/server) +')

# Crumb (sub "Garena · Top up langsung ke akun" sama — tidak diubah)
rep('tile(frame, 126, 84, 42, "AV", "#0f766e");',
    'tile(frame, 126, 84, 42, "DF", "#1e3a8a");')
rep('"CrumbTitle", 180, 86, "Arena of Valor", 20, "Bold"',
    '"CrumbTitle", 180, 86, "Delta Force", 20, "Bold"')

# Nominal: whole NOMS block (AoV 5 Voucher -> DF 5 Delta Coins)
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "60 Delta Coins", price: "Rp15.000" },
  { name: "300 Delta Coins", price: "Rp74.000", badge: "Terlaris" },
  { name: "680 Delta Coins", price: "Rp164.000" },
  { name: "1980 Delta Coins", price: "Rp479.000" },
  { name: "3280 Delta Coins", price: "Rp789.000" },
];"""
s = s.replace(old_noms, new_noms)

# Tab: "Voucher" (w 90, center LX+61) -> "Delta Coins" (w 122, center LX+77)
rep('rect(frame, "TabVoucher", LX + 16, y + 56, 90, 34, T.blueStrong, 9);',
    'rect(frame, "TabDeltaCoins", LX + 16, y + 56, 122, 34, T.blueStrong, 9);')
rep('await centerTxt(frame, "TabVoucherText", LX + 61, y + 73, "Voucher", 13.5, "Medium", "#FFFFFF");',
    'await centerTxt(frame, "TabDeltaCoinsText", LX + 77, y + 73, "Delta Coins", 13.5, "Medium", "#FFFFFF");')
rep('NOMS[i].name === "230 Voucher"', 'NOMS[i].name === "300 Delta Coins"')

# Langkah 4 comment + payment prices (base 300 Delta Coins Rp74.000)
rep('// ---- Langkah 4: Pembayaran (base 230 Voucher Rp72.000) ----',
    '// ---- Langkah 4: Pembayaran (base 300 Delta Coins Rp74.000) ----')
rep('{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp72.000", fee: "tanpa biaya" },',
    '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp74.000", fee: "tanpa biaya" },')
# e-wallet rows share identical price/fee strings; 4 occurrences
assert s.count('price: "Rp72.250", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp72.250", fee: "biaya Rp250"', 'price: "Rp74.250", fee: "biaya Rp250"')
# VA + retail rows share identical price/fee strings; 5 occurrences (BCA/Mandiri/BRI/Alfamart/Indomaret)
assert s.count('price: "Rp74.500", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp74.500", fee: "biaya Rp2.500"', 'price: "Rp76.500", fee: "biaya Rp2.500"')
# Pulsa rows (2 occurrences): round(74.000 x 7%) = 5.180 -> Rp79.180
assert s.count('price: "Rp77.040", fee: "biaya Rp5.040"') == 2
s = s.replace('price: "Rp77.040", fee: "biaya Rp5.040"', 'price: "Rp79.180", fee: "biaya Rp5.180"')

# Summary rows (Tujuan "12345678" dipertahankan — needsZone false)
rep('["Produk", "Arena of Valor"],', '["Produk", "Delta Force"],')
rep('["Item", "230 Voucher"],', '["Item", "300 Delta Coins"],')
rep('["Harga", "Rp72.000"],', '["Harga", "Rp74.000"],')
rep('await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp72.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
    'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp74.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks (termasuk komentar — pelajaran Siklus 120)
assert "Arena of Valor" not in s and "AoV" not in s and "Voucher" not in s and "TabVoucher" not in s, "AoV remnants remain"
assert "Rp72.000" not in s and "Rp72.250" not in s and "Rp74.500" not in s and "Rp77.040" not in s, "old prices remain"
assert "Delta Force" in s and "300 Delta Coins" in s and "Rp74.000" in s and "Rp79.180" in s and "Garena" in s, "DF values missing"
assert "TabDeltaCoins" in s and '"Delta Coins"' in s, "Delta Coins tab missing"
assert '"Zone ID"' not in s and "Zone ID ditulis" not in s, "Zone remnants remain"
print("OK: builder written to", DST)
