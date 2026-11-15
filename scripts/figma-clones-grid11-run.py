#!/usr/bin/env python3
"""Driver: jalankan figma-clones-grid11.js lewat use_figma (Siklus 133).
Argumen: light | dark — mengerjakan 3 frame modal mobile tema itu (S&K, Refund, Masuk).
Guard idempotent di skrip: frame yang sudah 11 kartu dilewati.
"""
import json, subprocess, sys

theme = sys.argv[1]  # light | dark
frames = {
    "light": ["10:2", "13:2", "162:2"],
    "dark": ["10:105", "13:111", "162:111"],
}[theme]

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-clones-grid11.js", encoding="utf-8") as f:
    code = f.read()
code = code.replace("__FRAME_IDS__", json.dumps(frames))

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 133 sinkron grid 11 kartu di latar modal mobile (" + theme + ")",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-12000:])
print(r.stderr[-2000:], file=sys.stderr)
