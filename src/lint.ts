import { discover } from "./discover.ts";
import { parse } from "./parse.ts";
import { RULES } from "./rules.ts";
import type { Finding, Result } from "./types.ts";

export function lint(target: string): Result {
  const dirs = discover(target);
  const findings: Finding[] = [];
  for (const dir of dirs) {
    const ctx = parse(dir);
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
