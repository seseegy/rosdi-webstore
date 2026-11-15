#!/usr/bin/env python3
"""Driver generik probe read-only batch s001: kirim JS ke use_figma, simpan JSON."""
import json, subprocess, sys, os

js_path, out_path = sys.argv[1], sys.argv[2]
with open(js_path, encoding="utf-8") as f:
    code = f.read()
args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "Probe read-only batch s001 Rosdi Store: " + os.path.basename(js_path),
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=300)
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    f.write(r.stdout)
print("exit", r.returncode, "->", out_path, "bytes", len(r.stdout))
if r.returncode != 0:
    print(r.stderr[:2000])
