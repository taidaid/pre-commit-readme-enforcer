#!/bin/bash
# Cross-platform setup for this repository (delegates to npm; optional Unix extras).

set -e

npm run setup

echo "node check-readme-updated.js" > .husky/pre-commit

if [ -f check-readme-updated.js ] && ! head -1 check-readme-updated.js | grep -q '^#!/'; then
    {
        echo '#!/usr/bin/env node'
        cat check-readme-updated.js
    } > check-readme-updated.js.tmp
    mv check-readme-updated.js.tmp check-readme-updated.js
fi

chmod +x check-readme-updated.js .husky/pre-commit 2>/dev/null || true

echo "Build complete. Run: npm test"
