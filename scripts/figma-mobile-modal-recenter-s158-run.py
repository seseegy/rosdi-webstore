#!/usr/bin/env python3
"""Driver Siklus 158: pusatkan ulang kartu modal mobile S&K/Refund (+106/+107).
Pola driver Siklus 156 (use_figma via CLI). Masuk tidak disentuh (sudah terpusat,
probe s158: offBy +1, frame masih 3180)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-modal-recenter-s158.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 158 pusatkan ulang kartu modal mobile S&K/Refund (+106/+107)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-8000:])
print(r.stderr[-1000:], file=sys.stderr)
