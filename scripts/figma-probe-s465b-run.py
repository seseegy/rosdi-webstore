#!/usr/bin/env python3
"""Driver s465b: jalankan figma-probe-s465b.js lewat use_figma (read-only)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s465b.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe s465b E54-60: frame Beranda Pencarian mlbb, harga CODM/WR/DF/AoV mobile, lebar kartu nominal + baris metode Produk Game mobile",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=240,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
sys.stdout.write(r.stdout)
print(r.stderr[-2000:], file=sys.stderr)
