# agentskills-lint

[![npm version](https://img.shields.io/npm/v/agentskills-lint?style=flat-square)](https://www.npmjs.com/package/agentskills-lint)
[![CI](https://img.shields.io/github/actions/workflow/status/svyatov/agentskills-lint/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/svyatov/agentskills-lint/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/svyatov/agentskills-lint?style=flat-square)](https://codecov.io/gh/svyatov/agentskills-lint)

Zero-config linter for the [Agent Skills specification](https://agentskills.io/specification).

## Usage

    npx agentskills-lint [path]

With no `path`, it lints `./skills/` if that exists, otherwise the current
directory. A directory containing `SKILL.md` is linted as one skill; any other
directory is walked for skills.

## Flags

- `--json` — emit `{ "findings": [...], "skillCount": n }` as JSON.
- `--strict` — treat warnings as errors (exit 1).

## Exit codes

- `0` — clean, or warnings only without `--strict`.
- `1` — one or more errors (or any warning under `--strict`).
- `2` — no skills found, or the path is missing or unreadable.

## What it checks

Errors are spec violations (name rules, description length, metadata shape,
frontmatter parse). Warnings are authoring best practices (weak description,
body over budget, broken or deeply nested file references, unknown frontmatter
keys, empty body).
