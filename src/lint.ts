import { join } from "node:path";
import { discover } from "./discover.ts";
import { parse } from "./parse.ts";
import { RULES } from "./rules.ts";
import type { Finding, Result, SkillContext } from "./types.ts";

export function lint(target: string): Result {
  const dirs = discover(target);
  const findings: Finding[] = [];
  for (const dir of dirs) {
    let ctx: SkillContext;
    try {
      ctx = parse(dir);
    } catch (e) {
      // An unreadable SKILL.md is one skill's problem; keep linting the rest.
      findings.push({
        file: join(dir, "SKILL.md"),
        line: 1,
        col: 1,
        severity: "error",
        rule: "unreadable",
        message: `could not read SKILL.md: ${(e as Error).message}`,
      });
      continue;
    }
    findings.push(...ctx.yamlErrors);
    for (const rule of RULES) {
      try {
        findings.push(...rule(ctx));
      } catch (e) {
        findings.push({
          file: ctx.file,
          line: 1,
          col: 1,
          severity: "error",
          rule: "internal",
          message: `rule crashed: ${(e as Error).message}`,
        });
      }
    }
  }
  return { findings, skillCount: dirs.length };
}
