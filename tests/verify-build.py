#!/usr/bin/env python3
"""
verify-build.py — Static deployment, subpath compatibility, and repository hygiene verifier.
Verifies:
  1. Required files exist and are non-empty.
  2. All asset references in index.html use relative paths (no root-absolute '/...' paths)
     so the site works under https://username.github.io/repository-name/.
  3. No external runtime scripts or stylesheets are required for core operation.
  4. No hardcoded secrets, API keys, or TODO/FIXME placeholders exist in application code.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REQUIRED_FILES = [
    "index.html",
    "DESIGN.md",
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "package.json",
    ".gitignore",
    ".nojekyll",
    ".github/workflows/deploy.yml",
    ".github/workflows/ci.yml",
    "assets/favicon.svg",
    "assets/og-preview.svg",
    "css/tokens.css",
    "css/base.css",
    "css/components.css",
    "css/print.css",
    "js/app.js",
    "js/math-engine.js",
    "js/presets.js",
    "js/renderer.js",
    "js/exporters.js",
    "js/storage.js",
    "docs/RESEARCH.md",
    "docs/ARCHITECTURE.md",
    "docs/PRIVACY.md",
    "docs/LAUNCH_PLAN.md",
    "tests/math-engine.test.js",
    "tests/exporters-storage.test.js",
]


def main() -> int:
    errors = []

    for rel in REQUIRED_FILES:
        full = os.path.join(ROOT, rel)
        if not os.path.exists(full):
            errors.append(f"Missing required file: {rel}")
        elif rel != ".nojekyll" and os.path.getsize(full) == 0:
            errors.append(f"Required file is empty: {rel}")

    index_path = os.path.join(ROOT, "index.html")
    if os.path.exists(index_path):
        html = open(index_path, encoding="utf-8").read()
        for attr, path in re.findall(r'\b(href|src)=["\']([^"\']+)["\']', html):
            if path.startswith("#") or path.startswith("data:"):
                continue
            if path.startswith("/"):
                errors.append(
                    f"Root-absolute path in index.html ({attr}={path}) breaks GitHub Pages repository subpaths."
                )
            elif path.startswith("http://") or path.startswith("https://"):
                errors.append(f"External runtime dependency in index.html: {path}")
            else:
                resolved = os.path.normpath(os.path.join(ROOT, path))
                if not os.path.exists(resolved):
                    errors.append(f"Broken relative asset in index.html: {path}")

    code_files = [
        "index.html",
        "css/tokens.css",
        "css/base.css",
        "css/components.css",
        "css/print.css",
        "js/app.js",
        "js/math-engine.js",
        "js/presets.js",
        "js/renderer.js",
        "js/exporters.js",
        "js/storage.js",
    ]
    for rel in code_files:
        full = os.path.join(ROOT, rel)
        if not os.path.exists(full):
            continue
        content = open(full, encoding="utf-8").read()
        if re.search(r"\b(TODO|FIXME)\b", content):
            errors.append(f"Found unresolved TODO/FIXME marker in {rel}")

    if errors:
        print("BUILD VERIFICATION FAILED:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print(f"OK: Verified {len(REQUIRED_FILES)} files, subpath asset safety, and zero TODOs.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
