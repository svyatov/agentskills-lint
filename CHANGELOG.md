# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-07-23

### Fixed

- The installed `agentskills-lint` binary ran as a silent no-op under `npx` and
  global installs. npm points the bin at a symlink, so `process.argv[1]` was the
  symlink path while `import.meta.url` was the realpath-resolved target; the two
  never matched and the CLI never executed. The entry check now resolves the
  symlink with `realpathSync` before comparing. 0.1.0 is broken for real use;
  upgrade to 0.1.1.

## [0.1.0] - 2026-07-23

### Added

- Initial release: a zero-config CLI linter for the
  [Agent Skills specification](https://agentskills.io/specification).
- Spec-conformance errors: `name` (required, length, charset, hyphens,
  directory match), `description` (required, length), `compatibility` length,
  `metadata` string-map shape, and frontmatter parsing.
- Best-practice warnings: weak description, body line and token budgets, broken
  and deeply nested file references, unknown frontmatter keys, and empty body.
- `--json` and `--strict` flags; exit codes 0 (clean or warnings), 1 (errors or
  any warning under `--strict`), 2 (no skills found or the path is unreadable).

[0.1.1]: https://github.com/svyatov/agentskills-lint/releases/tag/v0.1.1
[0.1.0]: https://github.com/svyatov/agentskills-lint/releases/tag/v0.1.0
