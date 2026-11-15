#!/usr/bin/env python3
"""Driver susulan read-only s445b: jalankan scripts/figma-audit-s445b.js lewat
use_figma; simpan dump ke hidden_files/qa-periodic-s445/figma-s445b.json."""
import json, os, subprocess

BASE = "/home/hatch/workspace/rosdi-webstore"
OUT = BASE + "/hidden_files/qa-periodic-s445"

def call(code, desc):
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": desc,
        "code": code,
        "skillNames": "resource:figma-use,resource:figma-generate-design",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    outer = json.loads(r.stdout)
    txt = outer["result"]["content"][0]["text"]
    if not txt.startswith("{"):
        raise RuntimeError("use_figma gagal: " + txt[:500])
    return json.loads(txt)

os.makedirs(OUT, exist_ok=True)
with open(BASE + "/scripts/figma-audit-s445b.js", encoding="utf-8") as f:
    data = call(f.read(), "QA s445b read-only: blend riil, divider vs kartu induk, was Dark, nominal Pencarian")
with open(OUT + "/figma-s445b.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
print("blend riil:", data["blendReal"])
print("divider: total", data["dividers"]["total"], "mismatch", data["dividers"]["mismatch"])
for d in data["dividers"]["items"][:40]:
    print("  ", d)
print("flash was:", json.dumps(data["flashWas"], ensure_ascii=False, indent=1))
print("nominal Pencarian mlbb:", data["pencarianNominal"])
