#!/usr/bin/env python3
"""Driver read-only: jalankan probe figma s462 lewat use_figma."""
import json, subprocess, sys

script = sys.argv[1]
outfile = sys.argv[2]
desc = sys.argv[3] if len(sys.argv) > 3 else "QA probe s462 read-only"

with open(f"/home/hatch/workspace/rosdi-webstore/scripts/{script}", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": desc,
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
with open(f"/home/hatch/workspace/rosdi-webstore/hidden_files/{outfile}", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
try:
    outer = json.loads(r.stdout)
    inner = json.loads(outer["result"]["content"][0]["text"])
    print(json.dumps(inner, indent=1, ensure_ascii=False)[:6000])
except Exception as e:
    print("PARSE FAIL", e)
    print(r.stdout[-3000:])
print(r.stderr[-500:], file=sys.stderr)
