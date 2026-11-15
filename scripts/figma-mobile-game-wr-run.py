#!/usr/bin/env python3
"""Driver: kirim builder figma-mobile-game-wr.js ke use_figma untuk satu tema."""
import json, subprocess, sys

theme = sys.argv[1]  # light | dark
name = "League of Legends: Wild Rift — Light" if theme == "light" else "League of Legends: Wild Rift — Dark"
src = "1:208" if theme == "light" else "1:314"
x = 0 if theme == "light" else 470
y = 76241

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-game-wr.js", encoding="utf-8") as f:
    code = f.read()
code = code.replace('"__NAME__"', json.dumps(name))
code = code.replace('"__SRC__"', json.dumps(src))
code = code.replace("__X__", str(x)).replace("__Y__", str(y))

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Build mobile Wild Rift frame " + name + " (390px) cloned from Produk Game mobile MLBB",
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
