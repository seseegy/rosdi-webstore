#!/usr/bin/env python3
"""Driver: jalankan figma-steam-price-fix.js lewat use_figma (Siklus 43)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-steam-price-fix.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Perbaiki harga Steam Wallet 45.000 Rp47.250 -> Rp47.300 di 4 frame Steam (Siklus 43)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print(r.stdout[-3000:])
print(r.stderr[-1000:], file=sys.stderr)
