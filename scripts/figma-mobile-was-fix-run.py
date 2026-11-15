#!/usr/bin/env python3
"""Driver Siklus 97: jalankan figma-mobile-was-fix.js lewat use_figma (mutasi 4 frame)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-was-fix.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Tambah harga coret was + pindah badge ke atas sel di frame mobile FF + MLBB (Siklus 97)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=180,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-3000:])
print(r.stderr[-1000:], file=sys.stderr)
