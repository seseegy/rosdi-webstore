#!/usr/bin/env python3
"""Transform builder Steam Wallet -> PlayStation Network ID (mobile + desktop).

PSN adalah voucher terakhir tanpa frame (Siklus 44). Harga diambil dari
src/data.js via node (bukan hitung tangan — pelajaran Siklus 43):
  PSN IDR 100.000 Rp108.000, 200.000 Rp216.000, 400.000 Rp432.000
  meta "Region Indonesia" (sama semua item), markup 1,08.
Terpilih PSN IDR 200.000 Rp216.000 (tengah). Tile PS #1e3a8a.
Fee base Rp216.000: e-wallet Rp216.250 (+250), VA/retail Rp218.500 (+2.500),
pulsa round(216000*0.07)=15120 -> Rp231.120.
Run: python3 make-psn-voucher-builders.py
"""
import re

BASE = "/home/hatch/workspace/rosdi-webstore/scripts/"

def rep(s, old, new, count=1):
    assert s.count(old) == count, f"expected {count}x, got {s.count(old)}: {old[:80]!r}"
    return s.replace(old, new)

# ================= MOBILE =================
src = BASE + "figma-mobile-voucher-steam.js"
with open(src, encoding="utf-8") as f:
    s = f.read()

s = rep(s, '// Builder frame Figma "Steam Wallet IDR" mobile (390px), diklon dari',
        '// Builder frame Figma "PlayStation Network ID" mobile (390px), diklon dari')
s = rep(s, '// Isi mengikuti src/pages/VoucherPage.jsx (voucher steam-wallet) +',
        '// Isi mengikuti src/pages/VoucherPage.jsx (voucher playstation) +')
s = rep(s, '// src/data.js (VOUCHERS steam-wallet, 8 item, markup 1,05) + CheckoutShell.',
        '// src/data.js (VOUCHERS playstation, 3 item, markup 1,08) + CheckoutShell.')
s = rep(s, '// Contoh terpilih: Steam Wallet 120.000 Rp126.000, bayar QRIS (tanpa biaya).',
        '// Contoh terpilih: PSN IDR 200.000 Rp216.000, bayar QRIS (tanpa biaya).')
s = rep(s, '// Fee: DANA +Rp250 -> Rp126.250.',
        '// Fee: DANA +Rp250 -> Rp216.250.')
s = rep(s, 'nama Steam Wallet 20 karakter', 'nama PSN IDR 15 karakter')
s = rep(s, '// ---- header: tile ST abu + judul Steam Wallet IDR ----',
        '// ---- header: tile PS biru + judul PlayStation Network ID ----')
s = rep(s, '// ---- sel Steam baru (2 kolom, tinggi terukur) ----',
        '// ---- sel PSN baru (2 kolom, tinggi terukur) ----')
s = rep(s, '// ---- harga pembayaran ringkas (base Rp126.000) + total ----',
        '// ---- harga pembayaran ringkas (base Rp216.000) + total ----')

old_items = re.search(r"const ITEMS = \[.*?\n\];", s, re.S).group(0)
new_items = """const ITEMS = [
  { name: "PSN IDR 100.000", price: "Rp108.000", meta: "Region Indonesia" },
  { name: "PSN IDR 200.000", price: "Rp216.000", meta: "Region Indonesia" },
  { name: "PSN IDR 400.000", price: "Rp432.000", meta: "Region Indonesia" },
];"""
s = s.replace(old_items, new_items)
s = rep(s, 'const SELECTED = 4; // Steam Wallet 120.000 Rp126.000',
        'const SELECTED = 1; // PSN IDR 200.000 Rp216.000')
s = rep(s, 'tileRect.fills = solid("#334155");', 'tileRect.fills = solid("#1e3a8a");')
s = rep(s, 'await setText(tileText, "ST");', 'await setText(tileText, "PS");')
# Judul lebih panjang (21 karakter, ~178px di Bold 15) -> lebar 200 (x=94, ujung 294 < 374)
s = rep(s, 'await setText(title, "Steam Wallet IDR", 180);',
        'await setText(title, "PlayStation Network ID", 200);')
s = rep(s, 'await setText(payQRIS, "Rp126.000 · tanpa biaya");',
        'await setText(payQRIS, "Rp216.000 · tanpa biaya");')
s = rep(s, 'await setText(payDANA, "Rp126.250 · biaya Rp250");',
        'await setText(payDANA, "Rp216.250 · biaya Rp250");')
s = rep(s, 'await setText(total, "Rp126.000", 100);',
        'await setText(total, "Rp216.000", 100);')

assert "Steam" not in s and "Rp126.000" not in s and "Rp126.250" not in s, "Steam remnants in mobile builder"
assert "PSN IDR 200.000" in s and "Rp216.000" in s and '"PS"' in s and "#1e3a8a" in s
with open(BASE + "figma-mobile-voucher-psn.js", "w", encoding="utf-8") as f:
    f.write(s)
print("OK mobile builder:", BASE + "figma-mobile-voucher-psn.js")

# ================= DESKTOP =================
src = BASE + "figma-desktop-voucher-steam.js"
with open(src, encoding="utf-8") as f:
    s = f.read()

s = rep(s, '// Builder frame Figma "Steam Wallet IDR — Desktop" Rosdi Store (1280px).',
        '// Builder frame Figma "PlayStation Network ID — Desktop" Rosdi Store (1280px).')
s = rep(s, '// Isi mengikuti src/pages/VoucherPage.jsx (voucher steam-wallet) +',
        '// Isi mengikuti src/pages/VoucherPage.jsx (voucher playstation) +')
s = rep(s, '// Contoh terpilih: Steam Wallet 120.000 Rp126.000, bayar QRIS (tanpa biaya).',
        '// Contoh terpilih: PSN IDR 200.000 Rp216.000, bayar QRIS (tanpa biaya).')
s = rep(s, '// Fee pulsa 7%: round(126000*0.07)=8820 -> Rp134.820.',
        '// Fee pulsa 7%: round(216000*0.07)=15120 -> Rp231.120.')
s = rep(s, '// Meta nominal dari data.js: "Kode dikirim ke email" (sama semua item).',
        '// Meta nominal dari data.js: "Region Indonesia" (sama semua item).')
s = rep(s, 'tile(frame, 126, 84, 42, "ST", "#334155");',
        'tile(frame, 126, 84, 42, "PS", "#1e3a8a");')
s = rep(s, '"CrumbTitle", 180, 86, "Steam Wallet IDR", 20, "Bold"',
        '"CrumbTitle", 180, 86, "PlayStation Network ID", 20, "Bold"')
s = rep(s, '// ---- Langkah 2: Nominal (8 voucher Steam Wallet, data.js) ----',
        '// ---- Langkah 2: Nominal (3 voucher PlayStation Network, data.js) ----')
old_noms = re.search(r"const NOMS = \[.*?\n\];", s, re.S).group(0)
new_noms = """const NOMS = [
  { name: "PSN IDR 100.000", price: "Rp108.000", meta: "Region Indonesia" },
  { name: "PSN IDR 200.000", price: "Rp216.000", meta: "Region Indonesia" },
  { name: "PSN IDR 400.000", price: "Rp432.000", meta: "Region Indonesia" },
];"""
s = s.replace(old_noms, new_noms)
s = rep(s, 'NOMS[i].name === "Steam Wallet 120.000"', 'NOMS[i].name === "PSN IDR 200.000"')
s = rep(s, '// ---- Langkah 3: Pembayaran (base Steam Wallet 120.000 Rp126.000) ----',
        '// ---- Langkah 3: Pembayaran (base PSN IDR 200.000 Rp216.000) ----')
s = rep(s, '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp126.000", fee: "tanpa biaya" },',
        '{ name: "QRIS", mark: "QR", desc: "Semua e-wallet & m-banking", price: "Rp216.000", fee: "tanpa biaya" },')
assert s.count('price: "Rp126.250", fee: "biaya Rp250"') == 4
s = s.replace('price: "Rp126.250", fee: "biaya Rp250"', 'price: "Rp216.250", fee: "biaya Rp250"')
assert s.count('price: "Rp128.500", fee: "biaya Rp2.500"') == 5
s = s.replace('price: "Rp128.500", fee: "biaya Rp2.500"', 'price: "Rp218.500", fee: "biaya Rp2.500"')
assert s.count('price: "Rp134.820", fee: "biaya Rp8.820"') == 2
s = s.replace('price: "Rp134.820", fee: "biaya Rp8.820"', 'price: "Rp231.120", fee: "biaya Rp15.120"')
s = rep(s, '["Produk", "Steam Wallet IDR"],', '["Produk", "PlayStation Network ID"],')
s = rep(s, '["Item", "Steam Wallet 120.000"],', '["Item", "PSN IDR 200.000"],')
s = rep(s, '["Harga", "Rp126.000"],', '["Harga", "Rp216.000"],')
s = rep(s, 'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp126.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });',
        'await txt(frame, "SumTotalVal", AX + AW - 16 - 210, ry + 14, "Rp216.000", 16, "Bold", T.blue, { width: 210, align: "RIGHT" });')

assert "Steam" not in s, "Steam remnants in desktop builder"
assert "Rp126.000" not in s and "Rp126.250" not in s and "Rp128.500" not in s and "Rp134.820" not in s, "old prices remain"
assert "PSN IDR 200.000" in s and "Rp216.000" in s and "Rp231.120" in s and '"PS", "#1e3a8a"' in s
with open(BASE + "figma-desktop-voucher-psn.js", "w", encoding="utf-8") as f:
    f.write(s)
print("OK desktop builder:", BASE + "figma-desktop-voucher-psn.js")

# ================= DRIVERS =================
with open(BASE + "figma-mobile-voucher-steam-run.py", encoding="utf-8") as f:
    d = f.read()
d = d.replace('figma-mobile-voucher-steam.js', 'figma-mobile-voucher-psn.js')
d = d.replace('Steam Wallet IDR — Light', 'PlayStation Network ID — Light')
d = d.replace('Steam Wallet IDR — Dark', 'PlayStation Network ID — Dark')
d = d.replace('Build mobile Steam Wallet IDR frame', 'Build mobile PlayStation Network ID frame')
d = d.replace('y = 50314', 'y = 53868')
assert 'figma-mobile-voucher-psn.js' in d and 'y = 53868' in d and 'Steam' not in d
with open(BASE + "figma-mobile-voucher-psn-run.py", "w", encoding="utf-8") as f:
    f.write(d)
print("OK mobile driver:", BASE + "figma-mobile-voucher-psn-run.py")

with open(BASE + "figma-desktop-voucher-steam-run.py", encoding="utf-8") as f:
    d = f.read()
d = d.replace('figma-desktop-voucher-steam.js', 'figma-desktop-voucher-psn.js')
d = d.replace('Steam Wallet IDR — Desktop — Light', 'PlayStation Network ID — Desktop — Light')
d = d.replace('Steam Wallet IDR — Desktop — Dark', 'PlayStation Network ID — Desktop — Dark')
d = d.replace('Build desktop Steam Wallet IDR page frame', 'Build desktop PlayStation Network ID page frame')
d = d.replace('y = 51406', 'y = int(sys.argv[2]) if len(sys.argv) > 2 else 54816')
assert 'figma-desktop-voucher-psn.js' in d and 'Steam' not in d
with open(BASE + "figma-desktop-voucher-psn-run.py", "w", encoding="utf-8") as f:
    f.write(d)
print("OK desktop driver:", BASE + "figma-desktop-voucher-psn-run.py")
