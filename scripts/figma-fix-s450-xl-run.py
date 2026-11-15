#!/usr/bin/env python3
"""Driver WRITE: jalankan figma-fix-s450-xl.js lewat use_figma (satu node)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-fix-s450-xl.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Perbaikan s450 ide 88: font XL 15 -> 14.5 di Indeks Pulsa Mobile Light (satu node teks)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode)
print(r.stdout[-2000:])
print(r.stderr[-500:], file=sys.stderr)
