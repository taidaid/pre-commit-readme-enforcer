# README Updates Git Pre-commit Hook

**Automatically require README updates when you change code.**

Built with [Cursor](https://www.cursor.com/).

## What This Does For You

**Before this tool:**
```bash
git add src/button.js           # You change code
git commit -m "Fixed button"    # ✅ Commit succeeds
# Result: Code changed, but README is now outdated 😞
```

**After installing this tool:**
```bash
git add src/button.js           # You change code  
git commit -m "Fixed button"    # ❌ Commit FAILS!
# Tool says: "Please update README.md first"

git add README.md               # You update docs
git commit -m "Fixed button"    # ✅ Commit succeeds  
# Result: Code AND documentation are both updated! 🎉
```

## What This Does

This tool ensures that whenever you change code files, you also update the relevant README files. It prevents you from committing code changes without documenting them.

**Example:**
- You modify `src/components/Button.js` ✏️  
- The tool finds the nearest README file (`src/README.md`) 📄
- It requires you to also change that README before allowing the commit ✅

## Why Use This?

- **Keeps documentation current** - No more outdated README files
- **Encourages good habits** - Forces you to think about documentation
- **Team consistency** - Everyone follows the same documentation practice
- **Smart detection** - Only requires updates to README files near your changes

## How it Works

The pre-commit hook:
1. Detects when non-README files are staged for commit
2. Finds the nearest README file for each changed code file (searching same directory and parent directories)
3. Requires that ALL nearest README files are also staged
4. Fails the commit if any required README file is missing
5. Provides helpful guidance showing exactly which README files must be updated

## TL;DR - Quick Start

**For most projects, install as a dev dependency and wire it into Husky:**

```bash
# In your project repository
npm install --save-dev pre-commit-readme-enforcer husky
npm pkg set scripts["hooks:install"]="husky"
npm run hooks:install
echo "npx check-readme-updated" > .husky/pre-commit
chmod +x .husky/pre-commit
```

Now commits will fail when staged code changes are missing required README updates.

## Installation

### Who is this for?

**✅ You want to add README enforcement to your existing project** → Follow the installation steps below

**✅ You want to contribute to this project** → See the [Development](#development) section

### Prerequisites

Before you start, make sure you have these installed:

#### ✅ Node.js (version 14 or higher)
Check if you have it:
```bash
node --version
```
Should show something like `v14.0.0` or higher. If not, [download Node.js here](https://nodejs.org/).

#### ✅ npm (comes with Node.js) 
Check if you have it:
```bash
npm --version
```
Should show a version number like `8.0.0` or higher.

#### ✅ git
Check if you have it:
```bash
git --version
```
Should show something like `git version 2.30.0` or higher. If not, [install git here](https://git-scm.com/).

#### ✅ Basic Terminal/Command Line Knowledge
You should be comfortable running commands in Terminal (Mac/Linux) or Command Prompt (Windows).

### Consumption Options

Choose the setup that fits your workflow.

#### Option A (Recommended): Project dev dependency

Use this when you want your whole team to get the same behavior from the repo config.

```bash
# In your project repository
npm install --save-dev pre-commit-readme-enforcer husky
npm pkg set scripts["hooks:install"]="husky"
npm run hooks:install
echo "npx check-readme-updated" > .husky/pre-commit
chmod +x .husky/pre-commit
```

#### Option B: Global CLI install

Use this if you prefer a globally installed command and reference it from hooks.

```bash
npm install -g pre-commit-readme-enforcer
```

Then in each target project:

```bash
npm install --save-dev husky
npm pkg set scripts["hooks:install"]="husky"
npm run hooks:install
echo "check-readme-updated" > .husky/pre-commit
chmod +x .husky/pre-commit
```

#### Option C: One-off execution with npx

Run without adding the package permanently:

```bash
# Manual one-off check (does not install a git hook)
npx pre-commit-readme-enforcer
```

For hooks, prefer Option A so installs are reproducible for all contributors.

#### Option D: Build-from-source / manual copy

Use this if you need to pin to a local fork or offline artifact.

### Manual Setup

If you prefer to set up manually:

1. **Download this project:**
   ```bash
   git clone https://github.com/taidaid/pre-commit-readme-enforcer.git
   cd pre-commit-readme-enforcer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build TypeScript:**
   ```bash
   npm run build
   ```

4. **Copy the compiled hook to your project:**
   ```bash
   # Replace with your actual project path
   cp check-readme-updated.js ../my-project/
   cd ../my-project
   ```

5. **Set up Husky in your project:**
   Follow the same steps as in the Quick Setup above:
   - Install husky: `npm install --save-dev husky`
   - Add hooks install script to package.json (manually or with `npm pkg set`)
   - Run the remaining setup commands

### Alternative: Build From Source

If you need to build locally from this repository:

```bash
git clone https://github.com/taidaid/pre-commit-readme-enforcer.git
cd pre-commit-readme-enforcer
npm install
npm run build
```

Then copy `check-readme-updated.js` into your target project and wire it into `.husky/pre-commit`.

### For Advanced Users: Python Pre-commit Framework

**Skip this section if you're new to pre-commit tools.**

If you're already using the Python pre-commit framework in your project, you can reference this repository directly:

```yaml
repos:
-   repo: https://github.com/taidaid/pre-commit-readme-enforcer
    rev: main  # Use latest commit or specific tag
    hooks:
    -   id: check-readme-updated
```

**Note**: You still need Node.js installed, as the hook is written in JavaScript.

## Usage

Once installed, the hook runs automatically on every commit:

```bash
# This will fail - no README updated
git add some_code_file.ts
git commit -m "Add new feature"
# ❌ Hook fails: README update required!

# This will succeed - README is also staged
git add README.md  # Make any change to README
git commit -m "Add new feature and update docs"
# ✅ Hook passes: README was updated
```

## Testing Your Setup

### ✅ Quick Test

After installation, test that it's working:

1. **Make a small change to any code file in your project:**
   ```bash
   echo "// test comment" >> src/index.js
   git add src/index.js
   ```

2. **Try to commit (this should FAIL):**
   ```bash
   git commit -m "test commit"
   ```
   
   **Expected result**: You should see an error like:
   ```
   ❌ README update required!
   Code files staged for commit: 1
   Missing required README files: 1
   
   The following README files must be updated:
     - README.md
   ```

3. **Now add a change to README and try again:**
   ```bash
   echo "Updated on $(date)" >> README.md
   git add README.md
   git commit -m "test commit with README update"
   ```
   
   **Expected result**: The commit should succeed! ✅

### 🔍 Advanced Testing

```bash
# Test the script directly (in the enforcer project directory)
./check-readme-updated.js

# Test during development of this tool
npm run dev
```

## What Counts as a README Update?

Any change to a README file counts:
- Adding documentation about your changes
- Updating version numbers or dates
- Adding a "Last updated" timestamp
- Even adding whitespace (if you've genuinely reviewed the docs)

The hook finds the nearest README file(s) to your changed code files, searching in the same directory and parent directories.

## Troubleshooting

### 🚨 Common Issues and Solutions

#### "command not found: npm" or "command not found: node"
**Problem**: Node.js isn't installed or not in your PATH.
**Solution**: [Download and install Node.js](https://nodejs.org/), then restart your terminal.

#### "Permission denied" when running ./build.sh
**Problem**: The script isn't executable.
**Solution**: 
```bash
chmod +x build.sh
./build.sh
```

#### "No such file or directory" when copying to your project
**Problem**: Wrong path to your project.
**Solution**: 
- Use `ls` to see available directories: `ls ..`
- Use full path: `cp check-readme-updated.js ~/Documents/my-project/`
- Or navigate to your project first: `cd /path/to/your/project` then copy

#### Hook doesn't run when committing
**Problem**: Husky not set up correctly.
**Solution**: 
1. Make sure you're in your project directory (not the enforcer directory)
2. Check if `.husky/pre-commit` exists: `ls -la .husky/`
3. Re-run the setup: `npm run hooks:install`

#### "npm: command not found" for npm pkg set
**Problem**: Older npm version doesn't support `pkg set`.
**Solution**: Edit `package.json` manually instead:
```json
{
  "scripts": {
    "hooks:install": "husky"
  }
}
```

#### Hook runs but doesn't find README files
**Problem**: No README files in your project.
**Solution**: Create a README.md file in your project root:
```bash
echo "# My Project" > README.md
```

### 📞 Getting Help

If you're still having trouble:
1. Check that all prerequisites are installed
2. Make sure you're in the right directory when running commands
3. Try the manual setup instead of quick setup
4. [Open an issue on GitHub](https://github.com/taidaid/pre-commit-readme-enforcer/issues) with:
   - Your operating system (Windows, Mac, Linux)
   - Node.js version (`node --version`)
   - The exact error message
   - What commands you ran

## Understanding the Files

When you download this project, here's what each file does:

- **`check-readme-updated.js`** - The main tool (this is what you copy to your project)
- **`check-readme-updated.ts`** - The source code (TypeScript, used for development)
- **`build.sh`** - Builds the TypeScript into JavaScript
- **`package.json`** - Lists the project dependencies
- **`.husky/`** - Contains git hook examples
- **`README.md`** - This documentation file

**You only need to copy `check-readme-updated.js` to your project - that's the complete tool!**

## Configuration

The hook works out of the box with no configuration needed. It automatically:
- Detects README files (any file starting with "readme", case-insensitive)
- Finds the closest README to each changed file
- Requires ALL nearest README files to be updated when code changes (not just any README)

## Development

**To contribute to this project itself** (not to use it in your own project):

1. **Clone this repository:**
   ```bash
   git clone https://github.com/taidaid/pre-commit-readme-enforcer.git
   cd pre-commit-readme-enforcer
   ```

2. **Set up development environment:**
   ```bash
   ./build.sh  # Installs deps, builds, sets up hooks
   ```

3. **Make your changes:**
   - Edit `check-readme-updated.ts` for hook logic
   - Edit `README.md` for documentation  
   - Edit `build.sh` for build process

4. **Test your changes:**
   ```bash
   npm run build && ./check-readme-updated.js
   ```

5. **The pre-commit hook is active** - it will check your README updates when you commit to this project!

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run with ts-node (development)
- `npm start` - Run the compiled JavaScript
- `npm test` - Test the compiled hook

---

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).

---

## 📄 Project Status

- ✅ **Stable and ready to use**
- 🔄 **Actively maintained** 
- 🐛 **Issues welcome** on GitHub
- 💡 **Feature requests appreciated**

Built by developers, for developers who care about documentation.

Last updated: 2026-04-09

