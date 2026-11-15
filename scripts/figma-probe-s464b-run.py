#!/usr/bin/env python3
"""Driver s464b: jalankan figma-probe-s464b.js lewat use_figma (read-only)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s464b.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe frasa persis Biaya layanan / Total dibayar / Harga final tanpa biaya lain / Pulsa & Data (s464)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=180,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-8000:])
print(r.stderr[-1000:], file=sys.stderr)
