#!/usr/bin/env python3
"""Transform figma-desktop-voucher.js (Google Play) -> figma-desktop-voucher-steam.js.

GP adalah basis terdekat: voucher, 5 langkah, tanpa langkah Jumlah.
Steam: 8 item (grid 3x3 -> 3 baris, tinggi kartu dihitung builder),
terpilih Steam Wallet 120.000 Rp126.000, tile ST abu #334155.
Run: python3 make-steam-voucher-builder.py
"""
import re

SRC = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-voucher.js"
DST = "/home/hatch/workspace/rosdi-webstore/scripts/figma-desktop-voucher-steam.js"

with open(SRC, encoding="utf-8") as f:
    s = f.read()

def rep(old, new):
    global s
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    s = s.replace(old, new)

# Header comments
rep('// Builder frame Figma "Voucher Google Play — Desktop" Rosdi Store (1280px).',
    '// Builder frame Figma "Steam Wallet IDR — Desktop" Rosdi Store (1280px).')
rep('// Isi mengikuti src/pages/VoucherPage.jsx (voucher google-play) +',
    '// Isi mengikuti src/pages/VoucherPage.jsx (voucher steam-wallet) +')
rep('// Contoh terpilih: Saldo 50.000 Rp55.000, bayar QRIS (tanpa biaya).',
    '// Contoh terpilih: Steam Wallet 120.000 Rp126.000, bayar QRIS (tanpa biaya).')
rep('// Fee pulsa 7%: round(55000*0.07)=3850 -> Rp58.850.',
    '// Fee pulsa 7%: round(126000*0.07)=8820 -> Rp134.820.')

# Crumb
rep('tile(frame, 126, 84, 42, "GP", "#0f766e");',
    'tile(frame, 126, 84, 42, "ST", "#334155");')
rep('"CrumbTitle", 180, 86, "Voucher Google Play", 20, "Bold"',
    '"CrumbTitle", 180, 86, "Steam Wallet IDR", 20, "Bold"')

# Nominal: whole NOMS block (GP 6 Saldo -> Steam 8 Wallet, markup 1,05 data.js)
rep('// ---- Langkah 2: Nominal (6 voucher Google Play, data.js) ----',
    '// ---- Langkah 2: Nominal (8 voucher Steam Wallet, data.js) ----')
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "Steam Wallet 12.000", price: "Rp12.600", meta: "Kode dikirim ke email" },
  { name: "Steam Wallet 45.000", price: "Rp47.300", meta: "Kode dikirim ke email" },
  { name: "Steam Wallet 60.000", price: "Rp63.000", meta: "Kode dikirim ke email" },
  { name: "Steam Wallet 90.000", price: "Rp94.500", meta: "Kode dikirim ke email" },
  { name: "Steam Wallet 120.000", price: "Rp126.000", meta: "Kode dikirim ke email" },
  { name: "Steam Wallet 250.000", price: "Rp262.500", meta: "Kode dikirim ke email" },
  { name: "Steam Wallet 400.000", price: "Rp420.000", meta: "Kode dikirim ke email" },
  { name: "Steam Wallet 600.000", price: "Rp630.000", meta: "Kode dikirim ke email" },
];"""
s = s.replace(old_noms, new_noms)
rep('NOMS[i].name === "Saldo 50.000"', 'NOMS[i].name === "Steam Wallet 120.000"')

# Langkah 3 comment + payment prices (base Steam Wallet 120.000 Rp126.000)
rep('// ---- Langkah 3: Pembayaran (base Saldo 50.000 Rp55.000) ----',
    '// ---- Langkah 3: Pembayaran (base Steam Wallet 120.000 Rp126.000) ----')
rep('{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp55.000", fee: "tanpa biaya" },',
    '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp126.000", fee: "tanpa biaya" },')
# e-wallet rows share identical price/fee strings; 4 occurrences
assert s.count('price: "Rp55.250", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp55.250", fee: "biaya Rp250"', 'price: "Rp126.250", fee: "biaya Rp250"')
# VA + retail rows share identical price/fee strings; 5 occurrences
assert s.count('price: "Rp57.500", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp57.500", fee: "biaya Rp2.500"', 'price: "Rp128.500", fee: "biaya Rp2.500"')
# Pulsa rows (2 occurrences): round(126.000 x 7%) = 8.820 -> Rp134.820
assert s.count('price: "Rp58.850", fee: "biaya Rp3.850"') == 2
s = s.replace('price: "Rp58.850", fee: "biaya Rp3.850"', 'price: "Rp134.820", fee: "biaya Rp8.820"')

# Summary rows
rep('["Produk", "Voucher Google Play"],', '["Produk", "Steam Wallet IDR"],')
rep('["Item", "Saldo 50.000"],', '["Item", "Steam Wallet 120.000"],')
rep('["Harga", "Rp55.000"],', '["Harga", "Rp126.000"],')
rep('await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp55.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
    'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp126.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

with open(DST, "w", encoding="utf-8") as f:
    f.write(s)

# Final sanity checks
assert "Google Play" not in s and '"GP", "#0f766e"' not in s, "GP remnants remain"
assert "Saldo 5.000" not in s and "Saldo 50.000" not in s and "Saldo 300.000" not in s, "GP nominal remnants remain"
assert s.count('mark: "GP"') == 1, "GoPay mark GP harus tetap ada 1x"
assert "Rp55.000" not in s and "Rp55.250" not in s and "Rp57.500" not in s and "Rp58.850" not in s, "old prices remain"
assert "Steam Wallet IDR" in s and "Steam Wallet 120.000" in s and "Rp126.000" in s and "Rp134.820" in s, "Steam values missing"
print("OK: builder written to", DST)
