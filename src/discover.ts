import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export class NoSkillsError extends Error {}

function walk(dir: string, out: string[]): void {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.isSymbolicLink()) continue;
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const sub = join(dir, ent.name);
    if (existsSync(join(sub, "SKILL.md"))) out.push(sub);
    else walk(sub, out);
  }
}

export function discover(target: string): string[] {
  if (!existsSync(target)) throw new NoSkillsError(`path not found: ${target}`);
  if (!statSync(target).isDirectory()) throw new NoSkillsError(`not a directory: ${target}`);
  if (existsSync(join(target, "SKILL.md"))) return [target];
  const out: string[] = [];
  walk(target, out);
  return out;
}
