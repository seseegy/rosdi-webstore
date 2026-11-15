#!/usr/bin/env python3
"""Driver Siklus 73: jalankan figma-mobile-flash-ini-fix.js lewat use_figma.

Pakai: python3 figma-mobile-flash-ini-fix-run.py <frameId>
"""
import json, subprocess, sys

frame_id = sys.argv[1]

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-flash-ini-fix.js", encoding="utf-8") as f:
    code = f.read()
code = code.replace('"__FRAME__"', json.dumps(frame_id))

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 73: repair inisial tile flash (%s)" % frame_id,
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
