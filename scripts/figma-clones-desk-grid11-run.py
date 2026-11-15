#!/usr/bin/env python3
"""Driver: jalankan figma-clones-desk-grid11.js lewat use_figma (Siklus 134, MUTASI)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-clones-desk-grid11.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Siklus 134: sinkron grid 11 kartu + judul seksi + teks S&K di klon modal desktop",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=600,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-20000:])
print(r.stderr[-2000:], file=sys.stderr)
