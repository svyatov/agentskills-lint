#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { NoSkillsError } from "./discover.ts";
import { lint } from "./lint.ts";
import { computeExit, render } from "./report.ts";

export function run(argv: string[]): number {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const strict = args.includes("--strict");
  const positional = args.find((a) => !a.startsWith("-"));
  const target = positional ?? (existsSync("skills") ? "skills" : ".");

  try {
    const result = lint(target);
    if (result.skillCount === 0) {
      process.stderr.write(`no skills found under ${target}\n`);
      return 2;
    }
    const color = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
    process.stdout.write(`${render(result, { json, strict, color })}\n`);
    return computeExit(result, strict);
  } catch (e) {
    if (e instanceof NoSkillsError) {
      process.stderr.write(`${e.message}\n`);
      return 2;
    }
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 2;
  }
}

// argv[1] is the invoked path (often a bin symlink); realpath it so it matches
// import.meta.url, which Node reports as the resolved target. Comparing the raw
// symlink path never matches, leaving the CLI a silent no-op under npx/global installs.
const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(realpathSync(entry)).href) {
  process.exit(run(process.argv));
}
