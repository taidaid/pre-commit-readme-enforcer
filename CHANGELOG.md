# Changelog

## 1.1.1

- **Windows:** fix staged-README check when Git reports forward-slash paths but the filesystem used backslashes; all hook output paths now use forward slashes.
- **Tests:** staged-README integration tests; CI runs on `ubuntu-latest` and `windows-latest`.
- **Docs:** Windows section for consumer repos (PowerShell, cmd, Git Bash); cross-platform install and hook examples; `npm run setup` for contributors.

## 1.1.0

- **Opt-in README root reachability:** when `README_ENFORCE_INTERLINK` is set (e.g. `1` / `true` / `yes`) or `--enforce-readme-interlink` is passed, the hook verifies every tracked `readme*` file is reachable from the repository root README via relative inline Markdown links (BFS; orphans fail the check).
- **Packaging:** published tarball includes [`.pre-commit-hooks.yaml`](.pre-commit-hooks.yaml) alongside the compiled CLI.
- **Quality:** `prepublishOnly` runs the full test script before `npm publish`; integration tests live under [`test/`](test/).

## 1.0.3 and earlier

- Nearest-README staging check for staged non-README paths (existing behavior; unchanged by default).
