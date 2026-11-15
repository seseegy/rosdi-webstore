#!/usr/bin/env python3
"""Driver read-only s459b: kartu nominal + isi frame mobile + Terlaris per frame."""
import json, subprocess

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
    code = open("/home/hatch/workspace/rosdi-webstore/scripts/figma-probe-s459b.js", encoding="utf-8").read()
    call(code, "Probe read-only Figma batch s459b (kartu nominal + frame mobile)",
         "/home/hatch/workspace/rosdi-webstore/hidden_files/figma-s459b.json")
