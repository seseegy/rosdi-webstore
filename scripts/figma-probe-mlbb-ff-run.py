#!/usr/bin/env python3
"""Driver read-only (Siklus 50): dump struktur frame MLBB mobile 1:208 + FF mobile 111:2."""
import json, subprocess, sys
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-mlbb-ff.js", encoding="utf-8") as f:
    code = f.read()
args = {"fileKey": "CZf0aT00935jutZp7JbkYR", "description": "Probe struktur frame MLBB + FF mobile (read-only Dark, Siklus 50)", "code": code, "skillNames": "resource:figma-use"}
r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma", "--arguments-json", json.dumps(args, ensure_ascii=False)], capture_output=True, text=True, timeout=300)
with open("/tmp/probe-mlbb-ff-dark.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "bytes:", len(r.stdout))
print(r.stdout[-2000:])
print(r.stderr[-500:], file=sys.stderr)
