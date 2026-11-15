#!/usr/bin/env python3
"""Driver read-only Siklus 97: cari teks coret (was) di frame mobile FF + MLBB."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-badge-sweep-s97b.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "QA sapuan badge seluruh file (Siklus 97b)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=180,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-3000:])
print(r.stderr[-1000:], file=sys.stderr)
