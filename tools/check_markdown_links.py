#!/usr/bin/env python3
"""Check relative local targets in Markdown links and images."""

from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
LINK = re.compile(r"!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))")
IGNORED_SCHEMES = {"http", "https", "mailto", "tel", "data"}

broken = []
for markdown in ROOT.rglob("*.md"):
    if any(part in {".git", "node_modules", "target"} for part in markdown.parts):
        continue
    content = markdown.read_text(encoding="utf-8")
    for match in LINK.finditer(content):
        raw_target = match.group(1) or match.group(2)
        target = urlsplit(unquote(raw_target))
        if target.scheme.lower() in IGNORED_SCHEMES or target.netloc or not target.path:
            continue
        if target.path.startswith("/"):
            destination = ROOT / target.path.lstrip("/")
        else:
            destination = markdown.parent / target.path
        if not destination.exists():
            line = content.count("\n", 0, match.start()) + 1
            broken.append(f"{markdown.relative_to(ROOT)}:{line}: {raw_target}")

if broken:
    print("Broken local Markdown targets:", file=sys.stderr)
    print("\n".join(broken), file=sys.stderr)
    sys.exit(1)

print("All local Markdown link targets exist.")
