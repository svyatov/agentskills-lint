#!/usr/bin/env node
import { existsSync } from "node:fs";
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(run(process.argv));
