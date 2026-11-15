#!/usr/bin/env python3
"""Driver: jalankan figma-mobile-game-grid.js lewat use_figma (Siklus 75).

Pakai: python3 figma-mobile-game-grid-run.py <frameId> <light|dark> <full|single>
"""
import json, subprocess, sys

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

frame_id = sys.argv[1]
theme = sys.argv[2]
mode = sys.argv[3]
tokens = LIGHT if theme == "light" else DARK

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-game-grid.js", encoding="utf-8") as f:
    code = f.read()
code = code.replace("__TOKENS__", json.dumps(tokens))
code = code.replace('"__FRAME__"', json.dumps(frame_id))
code = code.replace('"__MODE__"', json.dumps(mode))

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 75: rebuild grid game mobile vertikal (%s, %s, %s)" % (frame_id, theme, mode),
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-8000:])
print(r.stderr[-1000:], file=sys.stderr)
