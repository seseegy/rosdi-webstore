#!/usr/bin/env python3
"""Driver s467: jalankan figma-probe-s467.js lewat use_figma (read-only)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s467.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe s467 E46-60: hitung kata Crystal/Weekly/Kuota/Internet/Listrik/Tagihan/Kode/Bulan/Hari/Flash/Instan + frame Voucher Desktop + harga HoK/PUBG Desktop + Steam mobile",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
sys.stdout.write(r.stdout)
print(r.stderr[-2000:], file=sys.stderr)
