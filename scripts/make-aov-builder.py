#!/usr/bin/env python3
"""Transform figma-desktop-game-cod.js -> figma-desktop-game-aov.js (Arena of Valor).

CoD Mobile adalah basis terdekat: 1 tab, grid 3 kolom, needsZone FALSE
(kolom Zone ID sudah dihapus, pola FF desktop), sub crumb sama
("Garena · Top up langsung ke akun"). AoV: 1 tab "Voucher", 5 item,
needsZone FALSE, tanpa server.
Harga dihitung lewat calcTotals data.js, bukan hitung tangan:
base 230 Voucher Rp72.000 -> QRIS 72.000, e-wallet 72.250, VA/retail 74.500,
pulsa 77.040 (fee 5.040 = round(72.000 x 7%)).
Tab "Voucher" (7 karakter): kalibrasi tab desktop lain — "CP" 2 kar 64px,
"Points" 6 kar 84px, "Wild Cores" 10 kar 110px (~6.5px/kar + 44 padding)
-> 7 kar ~90px, center LX+61.
Run: python3 make-aov-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-cod.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-game-aov.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments
rep('// Builder frame Figma "Call of Duty: Mobile — Desktop" Rosdi Store (1280px).',
    '// Builder frame Figma "Arena of Valor — Desktop" Rosdi Store (1280px).')
rep('// Isi mengikuti src/pages/GamePage.jsx (Call of Duty: Mobile, tanpa Zone ID/server) +',
    '// Isi mengikuti src/pages/GamePage.jsx (Arena of Valor, tanpa Zone ID/server) +')

# Crumb (sub "Garena · Top up langsung ke akun" sama — tidak diubah)
rep('tile(frame, 126, 84, 42, "CM", "#2563eb");',
    'tile(frame, 126, 84, 42, "AV", "#0f766e");')
rep('"CrumbTitle", 180, 86, "Call of Duty: Mobile", 20, "Bold"',
    '"CrumbTitle", 180, 86, "Arena of Valor", 20, "Bold"')

# Nominal: whole NOMS block (CoD 5 CP -> AoV 5 Voucher)
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "40 Voucher", price: "Rp15.000" },
  { name: "100 Voucher", price: "Rp31.000" },
  { name: "230 Voucher", price: "Rp72.000", badge: "Terlaris" },
  { name: "460 Voucher", price: "Rp144.000" },
  { name: "950 Voucher", price: "Rp289.000" },
];"""
s = s.replace(old_noms, new_noms)

# Tab: "CP" (w 64, center LX+48) -> "Voucher" (w 90, center LX+61)
rep('rect(frame, "TabCP", LX + 16, y + 56, 64, 34, T.blueStrong, 9);',
    'rect(frame, "TabVoucher", LX + 16, y + 56, 90, 34, T.blueStrong, 9);')
rep('await centerTxt(frame, "TabCPText", LX + 48, y + 73, "CP", 13.5, "Medium", "#FFFFFF");',
    'await centerTxt(frame, "TabVoucherText", LX + 61, y + 73, "Voucher", 13.5, "Medium", "#FFFFFF");')
rep('NOMS[i].name === "400 CP"', 'NOMS[i].name === "230 Voucher"')

# Langkah 4 comment + payment prices (base 230 Voucher Rp72.000)
rep('// ---- Langkah 4: Pembayaran (base 400 CP Rp75.000) ----',
    '// ---- Langkah 4: Pembayaran (base 230 Voucher Rp72.000) ----')
rep('{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp75.000", fee: "tanpa biaya" },',
    '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp72.000", fee: "tanpa biaya" },')
# e-wallet rows share identical price/fee strings; 4 occurrences
assert s.count('price: "Rp75.250", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp75.250", fee: "biaya Rp250"', 'price: "Rp72.250", fee: "biaya Rp250"')
# VA + retail rows share identical price/fee strings; 5 occurrences (BCA/Mandiri/BRI/Alfamart/Indomaret)
assert s.count('price: "Rp77.500", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp77.500", fee: "biaya Rp2.500"', 'price: "Rp74.500", fee: "biaya Rp2.500"')
# Pulsa rows (2 occurrences): round(72.000 x 7%) = 5.040 -> Rp77.040
assert s.count('price: "Rp80.250", fee: "biaya Rp5.250"') == 2
s = s.replace('price: "Rp80.250", fee: "biaya Rp5.250"', 'price: "Rp77.040", fee: "biaya Rp5.040"')

# Summary rows (Tujuan "12345678" dipertahankan — needsZone false)
rep('["Produk", "Call of Duty: Mobile"],', '["Produk", "Arena of Valor"],')
rep('["Item", "400 CP"],', '["Item", "230 Voucher"],')
rep('["Harga", "Rp75.000"],', '["Harga", "Rp72.000"],')
rep('await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp75.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
    'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp72.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks (termasuk komentar — pelajaran Siklus 120)
assert "Call of Duty" not in s and "CoD" not in s and "CP" not in s and "TabCP" not in s, "CoD remnants remain"
assert "Rp75.000" not in s and "Rp75.250" not in s and "Rp77.500" not in s and "Rp80.250" not in s, "old prices remain"
assert "Arena of Valor" in s and "230 Voucher" in s and "Rp72.000" in s and "Rp77.040" in s and "Garena" in s, "AoV values missing"
assert "TabVoucher" in s and '"Voucher"' in s, "Voucher tab missing"
assert '"Zone ID"' not in s and "Zone ID ditulis" not in s, "Zone remnants remain"
print("OK: builder written to", DST)
