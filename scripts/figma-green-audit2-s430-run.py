#!/usr/bin/env python3
"""Driver read-only lanjutan Siklus 430 (ide bank 30)."""
import json, subprocess, os

OUT = "/home/hatch/workspace/rosdi-webstore/hidden_files/qa-periodic-s430/green-audit2.json"

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-green-audit2-s430.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Audit hijau lanjutan read-only: node Selesai + dot Cek + green-soft (Siklus 430, ide bank 30)",
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
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(json.dumps(inner, ensure_ascii=False, indent=1))
print(json.dumps(inner, ensure_ascii=False, indent=1))
print("--- disimpan:", OUT)
