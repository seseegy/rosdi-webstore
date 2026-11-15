#!/usr/bin/env python3
"""Driver read-only: jalankan figma-probe-voucher-mobile.js lewat use_figma (Siklus 43)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-voucher-mobile.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "QA dump struktur frame Voucher mobile 3:118 (Siklus 43)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-12000:])
print(r.stderr[-1000:], file=sys.stderr)
