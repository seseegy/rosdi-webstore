#!/usr/bin/env python3
"""Driver (Siklus 50): sinkron grid MLBB mobile + catatan stok MLBB/FF mobile."""
import json, subprocess, sys
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-mlbb-grid-fix.js", encoding="utf-8") as f:
    code = f.read()
args = {"fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": "Siklus 50: grid MLBB mobile 3->2 kolom (14 item) + harga 86 Rp21.580 + catatan stok MLBB/FF",
        "code": code, "skillNames": "resource:figma-use,resource:figma-generate-design"}
r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
                    "--arguments-json", json.dumps(args, ensure_ascii=False)],
                   capture_output=True, text=True, timeout=300)
with open("/tmp/mlbb-grid-fix.json", "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("rc:", r.returncode, "bytes:", len(r.stdout))
print(r.stdout[-4000:])
print(r.stderr[-1000:], file=sys.stderr)
