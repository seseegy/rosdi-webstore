#!/usr/bin/env python3
"""Driver read-only: jalankan figma-probe-s450c.js lewat use_figma."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s450c.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "QA probe geometri s450 final (ide 81-83, 87) read-only",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
with open("/tmp/jsdom-s450/figma-s450c.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
try:
    outer = json.loads(r.stdout)
    inner = json.loads(outer["result"]["content"][0]["text"])
    print(json.dumps(inner, indent=1, ensure_ascii=False))
except Exception as e:
    print("PARSE FAIL", e)
    print(r.stdout[-3000:])
print(r.stderr[-500:], file=sys.stderr)
