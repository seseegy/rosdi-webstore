#!/usr/bin/env python3
"""Driver Siklus 128: propagasi 10 paket data ke 8 frame (mobile+desktop x
Paket Data Telkomsel + Indeks Data, Light+Dark). Satu tema per argumen.

Pakai: python3 scripts/figma-data10-run.py light|dark
"""
import json, subprocess, sys

THEME = sys.argv[1]  # light | dark
BASE = "/home/hatch/workspace/rosdi-webstore/scripts"

JOBS = [
    ("figma-data10-mobile.js", "41:2" if THEME == "light" else "41:94",
     "Paket Data Telkomsel mobile 5->10 paket"),
    ("figma-data10-desktop.js", "46:2" if THEME == "light" else "46:235",
     "Paket Data Telkomsel desktop 5->10 paket"),
    ("figma-data10-index.js", "54:158" if THEME == "light" else "54:226",
     "Indeks Data mobile: 10 paket + Dari baru"),
    ("figma-data10-index.js", "51:2" if THEME == "light" else "51:96",
     "Indeks Data desktop: 10 paket + Dari baru"),
]

def run(script, frame_id, desc):
    with open(f"{BASE}/{script}", encoding="utf-8") as f:
        code = f.read().replace('"__FRAME__"', json.dumps(frame_id))
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": f"Siklus 128 {THEME}: {desc} ({frame_id})",
        "code": code,
        "skillNames": "resource:figma-use,resource:figma-generate-design",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    print(f"--- {script} {frame_id} ---")
    print(r.stdout[-4000:])
    if r.stderr.strip():
        print("STDERR:", r.stderr[-1000:], file=sys.stderr)

for script, fid, desc in JOBS:
    run(script, fid, desc)
