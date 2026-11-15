#!/usr/bin/env python3
"""Driver Siklus 97b: jalankan figma-minus5-softbadge-fix.js lewat use_figma (mutasi 4 badge)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-minus5-softbadge-fix.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Lengkapi soft-badge -5% MLBB mobile+desktop Light+Dark (Siklus 97b)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=180,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-1500:])
print(r.stderr[-1000:], file=sys.stderr)
