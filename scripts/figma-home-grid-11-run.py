#!/usr/bin/env python3
"""Driver: jalankan figma-home-grid-11.js lewat use_figma (Siklus 126).
Argumen: light | dark — mengerjakan Beranda mobile + desktop tema itu."""
import json, subprocess, sys

theme = sys.argv[1]  # light | dark
frames = {
    "light": ("1:2", "20:2", "Beranda Light"),
    "dark": ("1:105", "21:2", "Beranda Dark"),
}[theme]
mobile_id, desktop_id, label = frames

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-home-grid-11.js", encoding="utf-8") as f:
    code = f.read()
code = code.replace('"__MOBILE_ID__"', json.dumps(mobile_id))
code = code.replace('"__DESKTOP_ID__"', json.dumps(desktop_id))

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 126 grid Beranda 11 kartu game (" + label + ")",
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
print(r.stderr[-2000:], file=sys.stderr)
