#!/usr/bin/env python3
"""Driver Siklus 75: repair frame Beranda Light (1:2) dari build grid salah tempat."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-game-grid-repair.js", encoding="utf-8") as f:
    code = f.read()
code = code.replace('"__FRAME__"', json.dumps("1:2"))
code = code.replace("__SHIFT__", "77")
code = code.replace("__OLDH__", "2344")

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 75 repair: pulihkan Beranda Light dari build grid salah tempat",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-6000:])
print(r.stderr[-1000:], file=sys.stderr)
