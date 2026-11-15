#!/usr/bin/env python3
"""Driver read-only s459c+d: rect kartu nominal + Mulai Rp Beranda mobile + Steam mobile."""
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
    for tag in ("c", "d"):
        code = open(f"/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s459{tag}.js", encoding="utf-8").read()
        call(code, f"Probe read-only Figma batch s459{tag}",
             f"/home/hatch/workspace/rosdi-webstore/hidden_files/figma-s459{tag}.json")
