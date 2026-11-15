#!/usr/bin/env python3
"""Driver read-only: jalankan figma-probe-s460b.js lewat use_figma."""
import json, subprocess

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s460b.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "QA probe s460b (ide 53/58/59/61/62/64 lanjutan) read-only",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
with open("/home/hatch/workspace/rosdi-webstore/hidden_files/figma-s460b.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
try:
    outer = json.loads(r.stdout)
    inner = json.loads(outer["result"]["content"][0]["text"])
    json.dump(inner, open("/home/hatch/workspace/rosdi-webstore/hidden_files/qa-periodic-s460/figma-s460b-inner.json", "w"), ensure_ascii=False)
    print(json.dumps(inner, indent=1, ensure_ascii=False)[:14000])
except Exception as e:
    print("PARSE FAIL", e)
    print(r.stdout[-4000:])
import sys
print(r.stderr[-500:], file=sys.stderr)
