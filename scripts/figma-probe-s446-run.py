#!/usr/bin/env python3
"""Driver read-only s446: jalankan scripts/figma-probe-s446*.js lewat use_figma."""
import json, os, subprocess, sys

BASE = "/home/hatch/workspace/rosdi-webstore"
OUT = BASE + "/hidden_files/qa-periodic-s446"
KEY = "CZf0aT00935jutZp7JbkYR"

def call(code, desc):
    args = {"fileKey": KEY, "description": desc, "code": code,
            "skillNames": "resource:figma-use,resource:figma-generate-design"}
    r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
                        "--arguments-json", json.dumps(args, ensure_ascii=False)],
                       capture_output=True, text=True, timeout=300)
    outer = json.loads(r.stdout)
    txt = outer["result"]["content"][0]["text"]
    if not txt.startswith("{"):
        raise RuntimeError("use_figma gagal: " + txt[:500])
    return json.loads(txt)

os.makedirs(OUT, exist_ok=True)
name = sys.argv[1]
with open(BASE + "/scripts/" + name, encoding="utf-8") as f:
    data = call(f.read(), "QA s446 read-only: " + name)
with open(OUT + "/" + name.replace(".js", ".json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
print("OK", name, "->", OUT + "/" + name.replace(".js", ".json"))
print(json.dumps(data, ensure_ascii=False)[:3000])
