#!/usr/bin/env python3
"""Driver: jalankan figma-mobile-modal-shift-repair.js lewat use_figma (Siklus 68).

Pakai: python3 figma-mobile-modal-shift-repair-run.py <frameId>
"""
import json, subprocess, sys

frame_id = sys.argv[1]
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-modal-shift-repair.js", encoding="utf-8") as f:
    code = f.read()
code = code.replace('"__FRAME__"', json.dumps(frame_id))

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 68 repair: kembalikan shift +459.5 simpul baru frame modal " + frame_id,
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-3000:])
print(r.stderr[-1000:], file=sys.stderr)
