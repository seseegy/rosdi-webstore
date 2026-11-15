#!/usr/bin/env python3
"""Driver probe Siklus 129: dump struktur 8 frame indeks Pulsa/Data
(mobile+desktop, Light+Dark) sebelum tambah kartu by.U."""
import json, subprocess

BASE = "/home/hatch/workspace/rosdi-webstore/scripts"
FRAMES = [
    ("54:22", "Indeks Pulsa Mobile Light"),
    ("54:90", "Indeks Pulsa Mobile Dark"),
    ("54:158", "Indeks Data Mobile Light"),
    ("54:226", "Indeks Data Mobile Dark"),
    ("49:2", "Indeks Pulsa Desktop Light"),
    ("49:96", "Indeks Pulsa Desktop Dark"),
    ("51:2", "Indeks Data Desktop Light"),
    ("51:96", "Indeks Data Desktop Dark"),
]

with open(f"{BASE}/figma-probe-index-byu.js", encoding="utf-8") as f:
    tpl = f.read()

for fid, desc in FRAMES:
    code = tpl.replace('"__FRAME__"', json.dumps(fid))
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": f"Siklus 129 probe {desc} ({fid})",
        "code": code,
        "skillNames": "resource:figma-use,resource:figma-generate-design",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    print(f"--- {desc} {fid} ---")
    print(r.stdout[-6000:])
    if r.stderr.strip():
        print("STDERR:", r.stderr[-1000:])
