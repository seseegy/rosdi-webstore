#!/usr/bin/env python3
"""Driver: sinkron Langkah 1 Valorant + Wild Rift ke input Riot ID (Siklus 137)."""
import json, subprocess, sys

with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-riot-step1-fix.js", encoding="utf-8") as f:
    code = f.read()

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Sinkron Langkah 1 Valorant + Wild Rift ke input Riot ID (Siklus 137)",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300,
)
print(r.stdout[-8000:])
print(r.stderr[-2000:], file=sys.stderr)
