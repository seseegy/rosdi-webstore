#!/usr/bin/env python3
"""Driver Siklus 129: tambah kartu by.U ke 4 frame indeks (Pulsa+Data,
mobile+desktop) — satu tema per argumen. Frame ke-2 dst mengikuti frame
Light; Dark dijalankan dengan argumen dark.

Pakai: python3 scripts/figma-index-byu-run.py light|dark
"""
import json, subprocess, sys

THEME = sys.argv[1]  # light | dark
BASE = "/home/hatch/workspace/rosdi-webstore/scripts"

LIGHT = {
    "bg": "#F6F8FB", "surface": "#FFFFFF", "ink": "#0F172A", "sub": "#64748B",
    "faint": "#94A3B8", "line": "#E2E8F0", "blue": "#2563EB", "blueStrong": "#1D4ED8",
    "blueDeep": "#1E3A8A", "soft": "#EFF6FF", "field": "#F8FAFC", "green": "#059669",
    "red": "#DC2626", "redSoft": "#FEF2F2", "surface2": "#EEF2F7", "heroSub": "#C7D7FB",
}
DARK = {
    "bg": "#0B1220", "surface": "#131F36", "ink": "#F1F5F9", "sub": "#94A3B8",
    "faint": "#64748B", "line": "#22314F", "blue": "#3B82F6", "blueStrong": "#60A5FA",
    "blueDeep": "#172F5E", "soft": "#16294D", "field": "#0E1930", "green": "#34D399",
    "red": "#F87171", "redSoft": "#33161A", "surface2": "#0E1930", "heroSub": "#C7D7FB",
}
TOKENS = LIGHT if THEME == "light" else DARK

# (frame_id, mode, layout, deskripsi)
JOBS = [
    ("54:22" if THEME == "light" else "54:90", "pulsa", "mobile", "Indeks Pulsa Mobile"),
    ("54:158" if THEME == "light" else "54:226", "data", "mobile", "Indeks Data Mobile"),
    ("49:2" if THEME == "light" else "49:96", "pulsa", "desktop", "Indeks Pulsa Desktop"),
    ("51:2" if THEME == "light" else "51:96", "data", "desktop", "Indeks Data Desktop"),
]

with open(f"{BASE}/figma-index-byu.js", encoding="utf-8") as f:
    tpl = f.read()

for fid, mode, layout, desc in JOBS:
    code = tpl.replace('"__FRAME__"', json.dumps(fid))
    code = code.replace("__TOKENS__", json.dumps(TOKENS))
    code = code.replace('"__MODE__"', json.dumps(mode))
    code = code.replace('"__LAYOUT__"', json.dumps(layout))
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": f"Siklus 129 {THEME}: kartu by.U ke {desc} ({fid})",
        "code": code,
        "skillNames": "resource:figma-use,resource:figma-generate-design",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    print(f"--- {desc} {fid} ({THEME}) ---")
    print(r.stdout[-4000:])
    if r.stderr.strip():
        print("STDERR:", r.stderr[-1000:], file=sys.stderr)
