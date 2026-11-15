#!/usr/bin/env python3
"""Driver read-only: dump struktur frame Pulsa mobile (2:2 Light)."""
import json, subprocess, sys
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-pulsa-mobile.js", encoding="utf-8") as f:
    code = f.read()
args = {"fileKey": "CZf0aT00935jutZp7JbkYR", "description": "Probe struktur frame Pulsa mobile 2:2 (read-only)", "code": code, "skillNames": "resource:figma-use"}
r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma", "--arguments-json", json.dumps(args, ensure_ascii=False)], capture_output=True, text=True, timeout=300)
with open("/tmp/probe-pulsa-mobile.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "bytes:", len(r.stdout))
print(r.stdout[-4000:])
print(r.stderr[-500:], file=sys.stderr)
