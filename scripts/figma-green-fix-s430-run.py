#!/usr/bin/env python3
"""Driver perbaikan Siklus 430 (ide bank 30): jalankan figma-green-fix-s430.js
lewat use_figma, cetak hasil mutasi."""
import json, subprocess

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-green-fix-s430.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Perbaikan hijau status sukses: dot-3 Cek mobile + sub Sukses Desktop (Siklus 430, ide bank 30)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
outer = json.loads(r.stdout)
inner = json.loads(outer["result"]["content"][0]["text"])
print(json.dumps(inner, ensure_ascii=False, indent=1))
