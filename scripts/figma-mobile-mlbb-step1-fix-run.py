#!/usr/bin/env python3
"""Driver (Siklus 50 lanjutan): perbaiki tumpang catatan Langkah 1 MLBB mobile."""
import json, subprocess, sys
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-mlbb-step1-fix.js", encoding="utf-8") as f:
    code = f.read()
args = {"fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": "Siklus 50: perbaiki tumpang catatan Langkah 1 vs tautan bantuan MLBB mobile",
        "code": code, "skillNames": "resource:figma-use,resource:figma-generate-design"}
r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
                    "--arguments-json", json.dumps(args, ensure_ascii=False)],
                   capture_output=True, text=True, timeout=300)
with open("/tmp/mlbb-step1-fix.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "bytes:", len(r.stdout))
print(r.stdout[-2500:])
print(r.stderr[-1000:], file=sys.stderr)
