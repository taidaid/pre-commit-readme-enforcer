# Changelog

## 1.1.0

- **Opt-in README root reachability:** when `README_ENFORCE_INTERLINK` is set (e.g. `1` / `true` / `yes`) or `--enforce-readme-interlink` is passed, the hook verifies every tracked `readme*` file is reachable from the repository root README via relative inline Markdown links (BFS; orphans fail the check).
- **Packaging:** published tarball includes [`.pre-commit-hooks.yaml`](.pre-commit-hooks.yaml) alongside the compiled CLI.
- **Quality:** `prepublishOnly` runs the full test script before `npm publish`; integration tests live under [`test/`](test/).

## 1.0.3 and earlier

- Nearest-README staging check for staged non-README paths (existing behavior; unchanged by default).
