#!/usr/bin/env python3
"""Driver: jalankan figma-mobile-flash-badge-fix.js lewat use_figma (Siklus 31)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-flash-badge-fix.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Perbaiki badge -10% kartu flash: pindah dari baris harga ke baris tile (Siklus 31)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-6000:])
print(r.stderr[-1000:], file=sys.stderr)
