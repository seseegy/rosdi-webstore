#!/usr/bin/env python3
"""Driver read-only: jalankan figma-fase2-b3-inv{1,2}.js lewat use_figma (Fase 2 B3)."""
import json, subprocess, sys

for n in ("1", "2"):
    with open(f"/home/hatch/workspace/rosdi-webstore/scripts/figma-fase2-b3-inv{n}.js", encoding="utf-8") as f:
        code = f.read()
    args = {
        "fileKey": "CZf0aT00935jutZp7JbkYR",
        "description": f"Fase 2 B3 inventaris {n} (read-only)",
        "code": code,
        "skillNames": "resource:figma-use,resource:figma-generate-design",
    }
    r = subprocess.run(
        ["/opt/hatch/bin/figma", "call-tool", "--name", "use_figma",
         "--arguments-json", json.dumps(args, ensure_ascii=False)],
        capture_output=True, text=True, timeout=300,
    )
    with open(f"/home/hatch/workspace/rosdi-webstore/hidden_files/figma-fase2-b3-inv{n}.json", "w", encoding="utf-8") as f:
        f.write(r.stdout)
    print(f"--- inv{n} rc:", r.returncode, "stdout bytes:", len(r.stdout))
    try:
        outer = json.loads(r.stdout)
        inner = json.loads(outer["result"]["content"][0]["text"])
        with open(f"/home/hatch/workspace/rosdi-webstore/hidden_files/figma-fase2-b3-inv{n}-parsed.json", "w", encoding="utf-8") as f:
            json.dump(inner, f, ensure_ascii=False, indent=1)
        print(f"inv{n} parsed OK, keys:", sorted(inner.keys()))
    except Exception as e:
        print(f"inv{n} PARSE FAIL", e)
        print(r.stdout[-2000:])
    print(r.stderr[-300:], file=sys.stderr)
