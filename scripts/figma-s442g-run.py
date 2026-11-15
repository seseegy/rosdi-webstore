#!/usr/bin/env python3
"""Driver read-only s442: jalankan figma-s442g.js lewat use_figma; simpan dump."""
import json, subprocess, os

BASE = "/home/hatch/workspace/rosdi-webstore"
OUT = BASE + "/hidden_files/qa-periodic-s442"
os.makedirs(OUT, exist_ok=True)

def call(code, desc):
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": desc,
        "code": code,
        "skillNames": "resource:figma-use",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    outer = json.loads(r.stdout)
    txt = outer["result"]["content"][0]["text"]
    if not txt.startswith("{"):
        raise RuntimeError("use_figma gagal: " + txt[:800])
    return json.loads(txt)

with open(BASE + "/scripts/figma-s442g.js", encoding="utf-8") as f:
    data = call(f.read(), "QA s442b read-only: pendalaman 81,85,86,87,90")
with open(OUT + "/figma-s442g.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print("OK — keys:", sorted(data.keys()))
print("SELESAI")
