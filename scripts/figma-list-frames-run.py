#!/usr/bin/env python3
"""Driver read-only: daftar semua frame top-level file Figma Rosdi Store."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-list-frames.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Read-only: daftar semua frame top-level (id, nama, ukuran, posisi)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
with open("/tmp/frames-list.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
try:
    outer = json.loads(r.stdout)
    for entry in outer["result"]["content"]:
        if entry.get("type") == "text":
            print(entry["text"][:4000])
            break
except Exception as e:
    print("PARSE-FAIL", e, r.stdout[:500], file=sys.stderr)
print(r.stderr[-500:], file=sys.stderr)
