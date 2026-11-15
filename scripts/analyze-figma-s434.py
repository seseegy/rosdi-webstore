#!/usr/bin/env python3
"""Analisis dump frame s434 -> ringkasan per ide Figma (1,3,5,6,9,10,14,15,20,21-30,60,65,71-80)."""
import json, glob, re, os, sys

QA = "/home/hatch/workspace/goals/rosdi-store-digital-product-sales-via-digiflazz/hidden_files/qa-s434"
def load(label):
    with open(f"{QA}/frame-{label}.json", encoding="utf-8") as f:
        return json.load(f)

def rp(n):
    return "Rp" + f"{n:,}".replace(",", ".")

# calcTotals tiruan data.js (tanpa promo)
PAY = [("qris",0,None),("gopay",250,None),("dana",250,None),("ovo",250,None),
       ("shopeepay",250,None),("bca",2500,None),("mandiri",2500,None),("bri",2500,None),
       ("danamon",2500,None),("alfamart",2500,None),("indomaret",2500,None),
       ("pulsa-tsel",None,0.07),("pulsa-xl",None,0.07)]
def totals(base):
    out = {}
    for pid, fee, pct in PAY:
        f = round(base*pct) if pct else fee
        out[pid] = base + f
    return out

NAMES = {"qris":"QRIS","gopay":"GoPay","dana":"DANA","ovo":"OVO","shopeepay":"ShopeePay",
         "bca":"BCA Virtual Account","mandiri":"Mandiri Virtual Account","bri":"BRI Virtual Account",
         "danamon":"Danamon Virtual Account","alfamart":"Alfamart","indomaret":"Indomaret",
         "pulsa-tsel":"Pulsa Telkomsel","pulsa-xl":"Pulsa XL"}

def method_rows(frame, base):
    """Pasangkan baris metode (nama + harga Rp) berdasarkan y yang sama."""
    texts = frame["texts"]
    exp = totals(base)
    rows = []
    for t in texts:
        c = t["c"]
        if c in NAMES.values():
            # harga di baris yang sama: teks Rp dengan |dy|<=14 dan x>600 (kolom harga)
            cands = [u for u in texts if u["c"].startswith("Rp") and abs(u["y"]-t["y"]) <= 14]
            rows.append((c, [(u["c"], u["x"]) for u in cands], t["y"]))
    return rows, exp

out = {}
# --- Ide 71-75: audit harga metode per frame desktop ---
for label, base in [("ProdukGameDesk-L",43500),("PulsaDesk-L",51907),("PLNDesk-L",102500),
                    ("DANADesk-L",99942),("VoucherDesk-L",55000)]:
    fr = load(label)
    rows, exp = method_rows(fr, base)
    audit = []
    for name, cands, y in rows:
        pid = [k for k,v in NAMES.items() if v==name][0]
        got = None
        for c, x in cands:
            m = re.match(r"Rp([\d.]+)$", c)
            if m: got = int(m.group(1).replace(".",""))
        audit.append({"method": name, "y": y, "figma": got, "expected": exp[pid],
                      "match": got == exp[pid], "allRp": cands})
    out["method-"+label] = {"base": base, "rowsFound": len(rows), "audit": audit}

# --- Ide 76: Total ringkasan vs QRIS di 5 frame desktop ---
for label, base in [("ProdukGameDesk-L",43500),("PulsaDesk-L",51907),("PLNDesk-L",102500),
                    ("DANADesk-L",99942),("VoucherDesk-L",55000)]:
    fr = load(label)
    tots = [t for t in fr["texts"] if t["c"]=="Total"]
    totvals = []
    for t in tots:
        near = [u for u in fr["texts"] if u["c"].startswith("Rp") and abs(u["y"]-t["y"])<=16 and u["x"]>700]
        totvals.append([(u["c"],u["x"],u["y"]) for u in near])
    out["summary-"+label] = {"totalLabels": len(tots), "nearRp": totvals, "qrisExpected": rp(base)}

# --- Ide 77: label biaya di baris metode ---
for label, base in [("ProdukGameDesk-L",43500),("PulsaDesk-L",51907),("PLNDesk-L",102500),
                    ("DANADesk-L",99942),("VoucherDesk-L",55000)]:
    fr = load(label)
    fees = sorted(set(t["c"] for t in fr["texts"] if re.match(r"^(biaya Rp|tanpa biaya)", t["c"])))
    out["feelabel-"+label] = fees

# --- Ide 1,9,10,78: flash di Beranda mobile/desktop + Cari mlbb ---
for label in ["Beranda-L","Beranda-D","BerandaDesk-L","BerandaDesk-D","Cari-mlbb-L"]:
    fr = load(label)
    flash = [t for t in fr["texts"] if t["c"] in ("Weekly Diamond Pass","70 Diamonds") or "Flash" in t["c"] or re.match(r"^-?\d+%$", t["c"]) or t["c"].startswith("Rp27.900") or t["c"].startswith("Rp9.450") or t["c"].startswith("Rp30.900") or t["c"].startswith("Rp10.500") or "Terjual" in t["c"] or "Berakhir" in t["c"]]
    out["flash-"+label] = [{"c":t["c"],"fs":t["fs"],"x":t["x"],"y":t["y"]} for t in flash]
    out["flashbars-"+label] = fr.get("bars", [])

# --- Ide 14,15: hero ---
for label in ["Beranda-L","Beranda-D","BerandaDesk-L","BerandaDesk-D"]:
    fr = load(label)
    hero = [t for t in fr["texts"] if "Top up, harga final" in t["c"] or "Harga final terlihat" in t["c"] or t["c"].strip()=="Mulai top up"]
    out["hero-"+label] = [{"c":t["c"][:100],"fs":t["fs"],"x":t["x"],"y":t["y"],"w":t["w"],"h":t["h"]} for t in hero]

# --- Ide 20: footer desktop vs kode ---
for label in ["BerandaDesk-L","BerandaDesk-D","Beranda-L"]:
    fr = load(label)
    foot = [t for t in fr["texts"] if t["c"] in ("Produk","Bantuan","Pembayaran") or "© 2026" in t["c"] or "Harga diperbarui" in t["c"] or t["c"] in ("QRIS","GoPay","DANA","OVO","ShopeePay","BCA","Mandiri","BRI","Alfamart","Indomaret","Pulsa","Mobile Legends","Free Fire","Pulsa Reguler","Token PLN","Tagihan Pascabayar","Cek Transaksi","Cara Top Up","Syarat & Ketentuan","Kebijakan Pengembalian")]
    out["footer-"+label] = [{"c":t["c"],"fs":t["fs"],"x":t["x"],"y":t["y"]} for t in foot]

# --- Ide 21-23,29,30: trust ---
for label in ["Beranda-L","Beranda-D","BerandaDesk-L","BerandaDesk-D"]:
    fr = load(label)
    trust = [t for t in fr["texts"] if t["c"] in ("Proses instan","Harga transparan","Garansi uang kembali","CS 24/7") or t["c"].startswith("Pesanan diproses") or t["c"].startswith("Harga tiap metode") or t["c"].startswith("Pesanan gagal") or t["c"].startswith("Tim bantuan")]
    out["trust-"+label] = [{"c":t["c"][:80],"fs":t["fs"],"x":t["x"],"y":t["y"],"w":t["w"],"h":t["h"]} for t in trust]

# --- Ide 26,27: cara top up ---
for label in ["Beranda-L","BerandaDesk-L"]:
    fr = load(label)
    steps = [t for t in fr["texts"] if t["c"] in ("1","2","3") or t["c"] in ("Isi data tujuan","Pilih nominal & pembayaran","Selesai dalam detik")]
    out["steps-"+label] = [{"c":t["c"][:60],"fs":t["fs"],"x":t["x"],"y":t["y"]} for t in steps]

# --- Ide 28: Cari zzz — trust & cara top up tetap tampil? ---
fr = load("Cari-zzz-L")
out["zzz-texts"] = [t["c"] for t in fr["texts"]]
fr2 = load("Cari-mlbb-L")
out["mlbb-texts"] = [t["c"] for t in fr2["texts"]]

# --- Ide 79,80: Cek/Sukses desktop ---
for label in ["CekDesk-L","SuksesDesk-L"]:
    fr = load(label)
    out[label+"-all"] = [t["c"] for t in fr["texts"]]
for label in ["Sukses-L","SuksesPLN-L","SuksesPasca-L","SuksesPLNDesk-L","SuksesPascaDesk-L"]:
    fr = load(label)
    out[label+"-all"] = [t["c"] for t in fr["texts"]]

# --- Ide 60: frame voucher hanya Google Play? (Steam/PSN punya frame sendiri: 100:2, 105:2) ---
for label in ["Voucher-L","Steam-L","PSN-L"]:
    fr = load(label)
    out[label+"-titles"] = [t["c"] for t in fr["texts"] if t["c"] in ("Voucher Google Play","Steam Wallet IDR","PlayStation Network ID") or "Saldo" in t["c"] or "Steam Wallet" in t["c"] or "PSN IDR" in t["c"]]

# --- Ide 65: FF Membership urutan di frame FF-L ---
fr = load("FF-L")
out["FF-all"] = [t["c"] for t in fr["texts"]]
# --- Ide 63: HoK singkatan ---
for label in ["HoK-L","HoKDesk-L"]:
    fr = load(label)
    out[label+"-titles"] = [t["c"] for t in fr["texts"] if "Honor" in t["c"] or "HoK" in t["c"] or "HOK" in t["c"]]
# --- Ide 69: crumb publisher di frame game ---
for label in ["ProdukGame-L","Genshin-L","FF-L","Valorant-L","WR-L","AoV-L","DF-L","HoK-L","Roblox-L","PUBG-L","COD-L"]:
    fr = load(label)
    out["crumb-"+label] = [t["c"] for t in fr["texts"] if t["c"] in ("Moonton","Garena","HoYoverse","Level Infinite","TiMi Studio","Roblox Corporation","Riot Games") or "·" in t["c"] and len(t["c"])<60]

# --- Ide 51: harga pulsa 10rb di frame Pulsa-L ---
fr = load("Pulsa-L")
out["pulsa-mobile-prices"] = [t["c"] for t in fr["texts"] if t["c"].startswith("Rp")]
# --- Ide 23: urutan nominal e-wallet frame 3:2 ---
fr = load("Ewallet-L")
out["ewallet-nominals"] = [(t["c"], t["y"]) for t in fr["texts"] if t["c"].startswith("Saldo ")]
fr = load("Voucher-L")
out["voucher-nominals"] = [(t["c"], t["y"]) for t in fr["texts"] if t["c"].startswith("Saldo ")]
fr = load("Steam-L")
out["steam-nominals"] = [(t["c"], t["y"]) for t in fr["texts"] if "Steam Wallet" in t["c"]]
fr = load("PSN-L")
out["psn-nominals"] = [(t["c"], t["y"]) for t in fr["texts"] if "PSN IDR" in t["c"]]

with open(f"{QA}/figma-analysis-s434.json","w",encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("OK", len(out), "keys")
for k in sorted(out):
    v = out[k]
    print("##", k, "->", json.dumps(v, ensure_ascii=False)[:600])
