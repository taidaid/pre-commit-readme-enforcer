# pre-commit-readme-enforcer

Git **pre-commit** hook: if you stage non-README code, you must also stage the **nearest README** for each changed path (same directory, then parents). No config required.

**Prerequisites:** Node.js **18+**, **npm**, and **git** (Husky 9 needs Node 18). The `check-readme-updated` script alone may run on older Node if you wire hooks without Husky.

Using the hook in your repo → commands below. Contributing to this project → [Development](#development).

## Install (npm + Husky)

In your project root:

```bash
npm install --save-dev pre-commit-readme-enforcer husky
npx husky
echo "npx check-readme-updated" > .husky/pre-commit
```

On macOS or Linux you may optionally run `chmod +x .husky/pre-commit`. On Windows, use the hook line above as-is — see [Windows (consumer repos)](#windows-consumer-repos).

Stage code **and** the README paths the hook names, or the commit stops with a short list of what is missing.

## Teams / CI

Add `"prepare": "husky"` under `scripts` in your `package.json` so `npm install` on a fresh clone keeps Husky’s `core.hooksPath` wired. In CI or other environments where hooks should not run, set **`HUSKY=0`**.

## Usage

The hook runs on `git commit` when Husky is active.

```bash
git add src/feature.ts
git commit -m "feature"   # fails until required README files are staged too

git add src/README.md     # after you edit them (paths the hook prints)
git commit -m "feature"   # succeeds
```

On Windows, use the same `git` commands from Git Bash, PowerShell, or cmd. See [Windows (consumer repos)](#windows-consumer-repos).

## Windows (consumer repos)

For developers **using this hook in their own project** on Windows (not contributing to this package).

**Prerequisites:** Node.js **18+**, npm, and [Git for Windows](https://git-scm.com/download/win). Run `git` and `npm` from your repository root. Husky runs hooks via Git’s shell — installing Git is enough for typical setups.

### Install and create the pre-commit hook

```bash
npm install --save-dev pre-commit-readme-enforcer husky
```

**PowerShell**

```powershell
npx husky
Set-Content -Path .husky/pre-commit -Value "npx check-readme-updated" -NoNewline
Add-Content -Path .husky/pre-commit -Value "`n"
```

**cmd**

```bat
npx husky
echo npx check-readme-updated> .husky\pre-commit
```

**Git Bash / macOS / Linux**

```bash
npx husky
echo "npx check-readme-updated" > .husky/pre-commit
```

Optional on Unix only: `chmod +x .husky/pre-commit`.

Add to your app’s `package.json` so hooks install on clone:

```json
"scripts": {
  "prepare": "husky"
}
```

### Daily usage

```bash
git add src/feature.ts
git commit -m "feature"
```

If the commit fails, the hook lists README paths using forward slashes (e.g. `src/README.md`). Stage those files, then commit again:

```bash
git add src/README.md
git commit -m "feature"
```

### Manual check

```bash
npx check-readme-updated
```

If you copied the script into the repo, use `node check-readme-updated.js` (not `./check-readme-updated.js` in cmd — Windows cmd does not run shebangs).

### Opt-in README reachability on Windows

Prefer a **CLI flag** in `.husky/pre-commit` (works in every shell):

```
npx check-readme-updated --enforce-readme-interlink
```

One-off manual run with an environment variable:

**PowerShell**

```powershell
$env:README_ENFORCE_INTERLINK = "1"
npx check-readme-updated
```

**cmd**

```bat
set README_ENFORCE_INTERLINK=1
npx check-readme-updated
```

**Git Bash**

```bash
README_ENFORCE_INTERLINK=1 npx check-readme-updated
```

### CI and disabling hooks

**PowerShell:** `$env:HUSKY = "0"`  
**cmd:** `set HUSKY=0`  
**bash:** `export HUSKY=0`

### Verify on Windows

1. Change a tracked file, `git add` it, run `git commit` — expect failure with listed README paths (forward slashes).
2. Edit and `git add` those READMEs, commit again — expect success.

### Windows troubleshooting

| Issue | What to try |
|--------|-------------|
| Hook never runs | Run `npx husky` from the repo root; confirm `.husky/pre-commit` exists |
| `node` / `npm` not found | Install Node.js, restart the terminal, check `PATH` |
| README staged but hook still fails | Upgrade to **1.1.1+** (path normalization fix); ensure paths match what `git status` shows |
| `./check-readme-updated.js` fails in cmd | Use `node check-readme-updated.js` or `npx check-readme-updated` |

## Verify

1. Change a tracked file under your repo, `git add` it, try `git commit` — expect failure with listed README paths.
2. Edit and `git add` those READMEs, commit again — expect success.

Run the checker by hand: `npx check-readme-updated` (from a devDependency install) or `node check-readme-updated.js` if you copied the script. On Windows, see [Windows (consumer repos)](#windows-consumer-repos).

## How it works

1. Looks at **staged** non-README files.
2. For each, finds the closest README (name starts with `readme`, case-insensitive), walking up directories.
3. Requires **every** such README to be staged with a change when any of those code paths are staged.
4. Prints which README paths to update if the commit would otherwise go through.

## Other ways to install

### Global CLI + Husky

```bash
npm install -g pre-commit-readme-enforcer
```

Then in each repo:

```bash
npm install --save-dev husky
npx husky
echo "npx check-readme-updated" > .husky/pre-commit
```

### One-off check (no git hook)

```bash
npx pre-commit-readme-enforcer
```

### Copy the built script

Clone, build, copy `check-readme-updated.js` into your project, then point `.husky/pre-commit` at it, for example:

```bash
echo "node check-readme-updated.js" > .husky/pre-commit
```

(Use `npm install --save-dev husky` and `npx husky` first if Husky is not set up. On Windows, see [Windows (consumer repos)](#windows-consumer-repos).)

### Python `pre-commit` framework

Requires Node on the machine (hook is JS).

```yaml
repos:
  - repo: https://github.com/taidaid/pre-commit-readme-enforcer
    rev: main  # pin a tag or commit in real projects
    hooks:
      - id: check-readme-updated
```

## Configuration

No config file for the default staged-README check.

### Default behavior (always on)

- **README detection:** filenames beginning with `readme` (any case).
- **Matching:** nearest README per staged code path; **all** of them must be staged when any listed code is staged.

### Optional: root README reachability (opt-in)

When enabled, the hook also verifies that **every tracked `readme*` file** is reachable from a single **root README** by following **relative** inline Markdown links `[text](relative-path)` from file to file (BFS). Cycles and multiple incoming links are allowed; only **orphan** READMEs (never linked from the root’s component) fail the check.

- **Root README:** tracked `readme*` at the repository root (path with no `/`). Preference order: `README.md`, then `readme.md`; otherwise the first path when sorted with `en` locale. The hook prints which root was used.
- **Link sources:** only `.md` / `.markdown` readmes are scanned for outbound links. Other `readme*` files (e.g. `readme.txt`) can still be targets but do not contribute links.
- **Graph:** nodes are tracked `readme*` paths from `git ls-files`. Untracked READMEs are ignored.

**Enable in Husky (recommended — all platforms):**

```
npx check-readme-updated --enforce-readme-interlink
```

**Enable with a CLI flag** (e.g. Python `pre-commit` `args`):

```yaml
repos:
  - repo: https://github.com/taidaid/pre-commit-readme-enforcer
    rev: main
    hooks:
      - id: check-readme-updated
        args: [--enforce-readme-interlink]
```

You can combine the flag and env var; either is sufficient.

**Enable with an environment variable (bash / Git Bash)** in `.husky/pre-commit`:

```bash
echo 'README_ENFORCE_INTERLINK=1 npx check-readme-updated' > .husky/pre-commit
```

On Windows, prefer the CLI flag in the hook file; see [Windows (consumer repos)](#windows-consumer-repos) for PowerShell/cmd one-off runs.

**Manual run:**

```bash
npx check-readme-updated --enforce-readme-interlink
```

Or with an env var (bash / Git Bash): `README_ENFORCE_INTERLINK=1 npx check-readme-updated`

If the root-level README rule cannot be satisfied (no tracked root `readme*`), the reachability check exits with an error when opt-in is on.

**Performance:** with opt-in, each commit reads every tracked README for link parsing—fine for typical repos; very large documentation trees may prefer running this check in CI instead.

## Troubleshooting

**`command not found: node` / `npm`** — Install [Node.js](https://nodejs.org/) (includes npm), restart the terminal.

**`Permission denied` on `./build.sh`** — `chmod +x build.sh` then run again.

**Hook never runs** — Work in the repo root; confirm `.husky/pre-commit` exists; run `npx husky` again from that root. On Windows, see [Windows (consumer repos)](#windows-consumer-repos).

**README staged but hook still fails (Windows)** — Use package version **1.1.1+**; ensure you use `npx check-readme-updated` or `node check-readme-updated.js`, not `./script.js` in cmd.

**`npx husky` errors** — Run `git status` in a git repo; run `npm install`; use Node 18+ for Husky 9.

**Hook runs but “no README”** — Add a README (e.g. `README.md`) where the tool expects it, or adjust your layout.

**Hook runs but “README reachability failed”** — Ensure the root README links (directly or transitively) to every other tracked `readme*` using relative inline Markdown links. See [Configuration](#configuration).

**Still stuck** — [Open an issue](https://github.com/taidaid/pre-commit-readme-enforcer/issues) with OS, `node --version`, the exact error, and commands you ran.

## Development

For **this** repository (not consuming the package elsewhere):

```bash
git clone https://github.com/taidaid/pre-commit-readme-enforcer.git
cd pre-commit-readme-enforcer
npm run setup
```

On Windows, use `npm run setup` (same as above). On macOS/Linux you may alternatively run `./build.sh`, which calls `npm run setup` and configures the local Husky hook.

- `npm run setup` — install deps, compile TypeScript, run Husky  
- `npm run build` — compile TypeScript  
- `npm run dev` — run via ts-node  
- `npm start` / `npm test` — build, run integration tests, then smoke-run the hook  

### Releasing to npm

1. Update [`CHANGELOG.md`](CHANGELOG.md) and the `version` field in [`package.json`](package.json) (this repo does not run `npm version` automatically).
2. From a clean tree, run `npm test` (also runs automatically via `prepublishOnly` on publish).
3. `npm publish` (uses `prepack` to compile TypeScript before the tarball is built). Use `npm publish --dry-run` first if you want to inspect the pack without uploading.

## License

MIT — see [`LICENSE`](LICENSE).

Last updated: 2026-06-03
