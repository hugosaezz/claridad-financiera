#!/usr/bin/env python3
"""
Builds the unified Claridad Financiera application (Cuentas Hugo + Bolsillo + Google Stitch GUI)
into a single self-contained index.html ready for local use or GitHub Pages deployment.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

PARTS = [
    "head.html",
    "layout.html",
    "core.js",
    "views.js",
    "views_extra.js",
    "view_ajustes.js",
    "modals_actions.js",
    "modals_personal.js",
]

def main():
    combined = []
    for part in PARTS:
        path = SRC / part
        combined.append(path.read_text(encoding="utf-8"))
    out_html = "\n".join(combined)
    target = ROOT / "index.html"
    target.write_text(out_html, encoding="utf-8")
    print(f"Built {target} ({len(out_html.splitlines())} lines, {len(out_html)} bytes)")

if __name__ == "__main__":
    main()
