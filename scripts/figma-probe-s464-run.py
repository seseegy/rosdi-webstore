#!/usr/bin/env python3
"""Driver s464: jalankan figma-probe-s464.js lewat use_figma (read-only)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s464.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe hitung kata Beranda/Pulsa/Total/Biaya/Harga (s464 E55/E58-E61)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=180,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-12000:])
print(r.stderr[-1000:], file=sys.stderr)
