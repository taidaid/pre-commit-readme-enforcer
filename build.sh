#!/bin/bash
# Build script to compile TypeScript and make the result executable

set -e

echo "🔧 Installing dependencies..."
if command -v npm &> /dev/null; then
    npm install
elif command -v yarn &> /dev/null; then
    yarn install
else
    echo "❌ Error: npm or yarn is required"
    exit 1
fi

echo "🔨 Compiling TypeScript..."
npx tsc check-readme-updated.ts --target ES2020 --module CommonJS

echo "🎯 Adding shebang to compiled JavaScript..."
# Add shebang to the compiled JavaScript
{
    echo '#!/usr/bin/env node'
    cat check-readme-updated.js
} > check-readme-updated.js.tmp

# Replace the original file
mv check-readme-updated.js.tmp check-readme-updated.js

echo "✅ Making the compiled script executable..."
chmod +x check-readme-updated.js

echo "🔗 Setting up git hooks with Husky..."
npm run prepare

echo "🔄 Updating hook to newer Husky format..."
echo "node check-readme-updated.js" > .husky/pre-commit
chmod +x .husky/pre-commit

echo "✨ Build complete! You can now:"
echo "  - Run the hook directly: ./check-readme-updated.js"
echo "  - Test the hook: git commit (the hook is already set up)"
echo "  - The hook will automatically run on every commit" 