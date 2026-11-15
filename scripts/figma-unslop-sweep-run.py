#!/usr/bin/env python3
"""Driver sweep unslop: python3 figma-unslop-sweep-run.py <start> <end>"""
import json, subprocess, sys

start, end = int(sys.argv[1]), int(sys.argv[2])
with open("/home/hatch/workspace/rosdi-webstore/scripts/figma-unslop-sweep.js", encoding="utf-8") as f:
    code = f.read().replace("__START__", str(start)).replace("__END__", str(end))

args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": f"Sweep unslop frame {start}-{end}: bobot font maks Semi Bold, tracking negatif nol, radius 11 ke 10, glif trust jadi ikon vektor",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=600,
)
print("range", start, end, "rc:", r.returncode, "stdout bytes:", len(r.stdout))
print(r.stdout[-3000:])
print(r.stderr[-500:], file=sys.stderr)
