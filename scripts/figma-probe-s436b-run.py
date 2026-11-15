#!/usr/bin/env python3
"""Driver read-only s436b: detail node untuk temuan s436."""
import json, subprocess, os

QA = "/home/hatch/workspace/rosdi-webstore/hidden_files/qa-s436"
os.makedirs(QA, exist_ok=True)
SCRIPT_DIR = "/home/hatch/workspace/rosdi-webstore/scripts"
code = open(f"{SCRIPT_DIR}/figma-probe-s436b.js", encoding="utf-8").read()
args = {
    "fileKey": "CZf0aT00935jutZp7JbkYR",
    "description": "QA probe read-only batch s436b detail",
    "code": code,
    "skillNames": "resource:figma-use,resource:figma-generate-design",
}
r = subprocess.run(
    ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
     "--arguments-json", json.dumps(args, ensure_ascii=False)],
    capture_output=True, text=True, timeout=600,
)
print("rc:", r.returncode)
print("stderr:", r.stderr[:1000])
outer = json.loads(r.stdout)
inner = json.loads(outer["result"]["content"][0]["text"])
with open(f"{QA}/probe-detail.json", "w", encoding="utf-8") as f:
    json.dump(inner, f, ensure_ascii=False, indent=1)
for k, v in inner.items():
    print(k, len(v), v[:2] if v else "")
print("saved:", f"{QA}/probe-detail.json")
