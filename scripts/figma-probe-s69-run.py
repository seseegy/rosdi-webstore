#!/usr/bin/env python3
"""Driver: jalankan figma-probe-s69.js lewat use_figma (Siklus 69, read-only)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s69.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 69 probe read-only: teks Populer/Lihat semua + kartu modal Refund",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-48000:])
print(r.stderr[-1000:], file=sys.stderr)
