#!/usr/bin/env python3
"""Ensure every backend *IT class is assigned to a CI integration-test suite."""

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/backend-ci.yml"
TEST_ROOT = ROOT / "apps/backend/src/test/java"

workflow = WORKFLOW.read_text(encoding="utf-8")
registered = set(re.findall(r"test:\s*([A-Za-z0-9_,]+)", workflow))
registered_classes = {
    class_name
    for suite in registered
    for class_name in suite.split(",")
}
integration_tests = {path.stem for path in TEST_ROOT.rglob("*IT.java")}
missing = sorted(integration_tests - registered_classes)
stale = sorted(registered_classes - integration_tests)

if missing or stale:
    if missing:
        print("Unregistered backend integration tests:", ", ".join(missing))
    if stale:
        print("Workflow references missing integration tests:", ", ".join(stale))
    sys.exit(1)

print(f"All {len(integration_tests)} backend integration-test classes are registered.")
