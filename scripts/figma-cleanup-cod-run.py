#!/usr/bin/env python3
"""Driver cleanup: hapus frame CoD Mobile setengah jadi (figma-cleanup-cod.js)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-cleanup-cod.js", encoding="utf-8") as f:
    code = f.read()
args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Cleanup frame Call of Duty: Mobile setengah jadi (Siklus 117)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print(r.stdout[-3000:])
print(r.stderr[-1000:], file=sys.stderr)
