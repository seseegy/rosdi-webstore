#!/usr/bin/env python3
"""Driver: kirim builder figma-mobile-game-pubg.js ke use_figma untuk satu tema."""
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

theme = sys.argv[1]  # light | dark
tokens = LIGHT if theme == "light" else DARK
name = "PUBG Mobile — Light" if theme == "light" else "PUBG Mobile — Dark"
src = "1:208" if theme == "light" else "1:314"
x = 0 if theme == "light" else 470
y = 58912

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-game-pubg.js", encoding="utf-8") as f:
    code = f.read()
code = code.replace("__TOKENS__", json.dumps(tokens))
code = code.replace('"__NAME__"', json.dumps(name))
code = code.replace('"__SRC__"', json.dumps(src))
code = code.replace("__X__", str(x)).replace("__Y__", str(y))

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Build mobile PUBG Mobile frame " + name + " (390px) cloned from Produk Game mobile",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print(r.stdout[-6000:])
print(r.stderr[-2000:], file=sys.stderr)
