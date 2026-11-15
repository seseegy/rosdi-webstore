#!/usr/bin/env python3
"""Driver read-only Siklus 132: probe struktur frame Sukses mobile + baris y terbawah."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-sukses-s132.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe read-only Siklus 132: struktur Sukses mobile 4:2/4:29 + baris y terbawah",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print(r.stdout[-12000:])
print(r.stderr[-2000:], file=sys.stderr)
