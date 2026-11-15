#!/usr/bin/env python3
"""Driver: kirim repair figma-mobile-bill-repair.js ke use_figma (Siklus 131)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-mobile-bill-repair.js", encoding="utf-8") as f:
    code = f.read()
args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Repair lebar teks sel tagihan di frame mobile BillPage (meta meluber)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print(r.stdout[-4000:])
print(r.stderr[-2000:], file=sys.stderr)
