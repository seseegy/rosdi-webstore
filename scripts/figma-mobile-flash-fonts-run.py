#!/usr/bin/env python3
"""Driver Siklus 74: rescale font kartu flash mobile ke ukuran kode.

Pakai: python3 figma-mobile-flash-fonts-run.py <frameId> <both|weekly>
"""
import json, subprocess, sys

frame_id = sys.argv[1]
expected = sys.argv[2]
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-flash-fonts.js", encoding="utf-8") as f:
    code = f.read()
code = code.replace('"__FRAME__"', json.dumps(frame_id))
code = code.replace('"__EXPECTED__"', json.dumps(expected))

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 74: rescale font kartu flash mobile (%s, %s)" % (frame_id, expected),
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
