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
chmod +x .husky/pre-commit
```

Stage code **and** the README paths the hook names, or the commit stops with a short list of what is missing.

## Teams / CI

Add `"prepare": "husky"` under `scripts` in your `package.json` so `npm install` on a fresh clone keeps Husky’s `core.hooksPath` wired. In CI or other environments where hooks should not run, set **`HUSKY=0`**.

## Usage

The hook runs on `git commit` when Husky is active.

```bash
git add src/feature.ts
git commit -m "feature"   # fails until required README files are staged too

git add README.md         # after you edit them
git commit -m "feature"   # succeeds
```

## Verify

1. Change a tracked file under your repo, `git add` it, try `git commit` — expect failure with listed README paths.
2. Edit and `git add` those READMEs, commit again — expect success.

Run the checker by hand: `npx check-readme-updated` (from a devDependency install) or `./check-readme-updated.js` if you copied the script.

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
echo "check-readme-updated" > .husky/pre-commit
chmod +x .husky/pre-commit
```

### One-off check (no git hook)

```bash
npx pre-commit-readme-enforcer
```

### Copy the built script

Clone, build, copy `check-readme-updated.js` into your project, then point `.husky/pre-commit` at it, for example:

```bash
echo "node check-readme-updated.js" > .husky/pre-commit
chmod +x .husky/pre-commit
```

(Use `npm install --save-dev husky` and `npx husky` first if Husky is not set up.)

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

No config file. Behavior:

- README detection: filenames beginning with `readme` (any case).
- Matching: nearest README per staged code path; **all** of them must be staged when any listed code is staged.

## Troubleshooting

**`command not found: node` / `npm`** — Install [Node.js](https://nodejs.org/) (includes npm), restart the terminal.

**`Permission denied` on `./build.sh`** — `chmod +x build.sh` then run again.

**Hook never runs** — Work in the repo root; check `ls -la .husky/pre-commit`; run `npx husky` again from that root.

**`npx husky` errors** — Run `git status` in a git repo; run `npm install`; use Node 18+ for Husky 9.

**Hook runs but “no README”** — Add a README (e.g. `README.md`) where the tool expects it, or adjust your layout.

**Still stuck** — [Open an issue](https://github.com/taidaid/pre-commit-readme-enforcer/issues) with OS, `node --version`, the exact error, and commands you ran.

## Development

For **this** repository (not consuming the package elsewhere):

```bash
git clone https://github.com/taidaid/pre-commit-readme-enforcer.git
cd pre-commit-readme-enforcer
./build.sh   # deps, compile TS, Husky + pre-commit hook for this repo
```

- `npm run build` — compile TypeScript  
- `npm run dev` — run via ts-node  
- `npm start` / `npm test` — run compiled hook  

## License

MIT — see [`LICENSE`](LICENSE).

Last updated: 2026-05-13
