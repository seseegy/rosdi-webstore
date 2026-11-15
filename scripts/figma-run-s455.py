#!/usr/bin/env python3
"""Driver read-only s455: discovery frame + probe ide 61-70, H74. Simpan ke hidden_files/figma-s455*.json."""
import json, subprocess, sys

def call(code, desc, outfile):
    args = {"fileKey": "CZf0aT00935jutZp7JbkYR", "description": desc,
            "code": code, "skillNames": "resource:figma-use"}
    r = subprocess.run(["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
                        "--arguments-json", json.dumps(args, ensure_ascii=False)],
                       capture_output=True, text=True, timeout=300)
    outer = json.loads(r.stdout)
    inner = json.loads(outer["result"]["content"][0]["text"])
    with open(outfile, "w", encoding="utf-8") as f:
        json.dump(inner, f, ensure_ascii=False, indent=1)
    print(outfile, "->", str(inner)[:400].replace("\n", " "))
    return inner

if __name__ == "__main__":
    which = sys.argv[1]
    if which == "discover":
        code = open("/home/hatch/workspace/rosdi-webstore/scripts/figma-discover-s454.js", encoding="utf-8").read()
        call(code, "Discovery read-only: daftar frame teratas (s455)", "/home/hatch/workspace/rosdi-webstore/hidden_files/figma-s455-discover.json")
    elif which == "probe":
        code = open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s455.js", encoding="utf-8").read()
        call(code, "Probe read-only Figma batch s455 ide 61-70, H74", "/home/hatch/workspace/rosdi-webstore/hidden_files/figma-s455.json")
