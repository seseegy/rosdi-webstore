#!/usr/bin/env python3
"""Driver read-only Siklus 73: jalankan figma-probe-flash-s73.js lewat use_figma, simpan output ke /tmp/probe-flash-s73.json."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-flash-s73.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe read-only Siklus 73: struktur seksi Flash Sale Beranda mobile + mlbb",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
with open("/tmp/probe-flash-s73.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-3000:])
print(r.stderr[-1000:], file=sys.stderr)
