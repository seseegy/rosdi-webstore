#!/usr/bin/env python3
"""Driver cleanup: hapus frame Valorant setengah jadi."""
import json, subprocess
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-cleanup-valorant.js", encoding="utf-8") as f:
    code = f.read()
args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Cleanup frame Valorant setengah jadi (pasca-gagal)",
    "code": code,
    "skillNames": "resource:figma-use",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print(r.stdout[-3000:])
print(r.stderr[-1000:], file=sys.stderr) if False else None
