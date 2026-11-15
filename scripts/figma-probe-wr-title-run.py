#!/usr/bin/env python3
"""Driver read-only: ukur judul header + lebar 'League of Legends: Wild Rift'."""
import json, subprocess, sys
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-wr-title.js", encoding="utf-8") as f:
    code = f.read()
args = {"fileKey": "CZf0aT00935jutZp7JbkYR", "description": "Probe judul header game mobile + lebar judul Wild Rift (read-only)", "code": code, "skillNames": "resource:figma-use"}
r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma", "--arguments-json", json.dumps(args, ensure_ascii=False)], capture_output=True, text=True, timeout=300)
print(r.stdout[-3000:])
print(r.stderr[-500:], file=sys.stderr) if False else print(r.stderr[-500:], file=sys.stderr)
