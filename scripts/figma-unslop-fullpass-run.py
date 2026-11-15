#!/usr/bin/env python3
"""Driver pass penuh unslop Figma: copy hero/placeholder + CaraNum + diagnostik badge/chip."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-unslop-fullpass.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Pass penuh unslop: judul hero & placeholder baru, CaraNum 24, diagnostik badge dan count-chip",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=600,
)
print("rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-4000:])
print(r.stderr[-500:], file=sys.stderr)
