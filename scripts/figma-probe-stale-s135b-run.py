#!/usr/bin/env python3
"""Driver: jalankan figma-probe-stale-s135b.js lewat use_figma (Siklus 135, read-only)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-stale-s135b.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 135b probe read-only: judul seksi util mobile berdasarkan isi teks",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-20000:])
print(r.stderr[-1000:], file=sys.stderr)
