import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export class NoSkillsError extends Error {
  override name = "NoSkillsError";
}

function walk(dir: string, out: string[]): void {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    // Dirent types come from the directory entry, so a symlink reports as a link,
    // never a directory: this also keeps the walk from following symlinked trees.
    if (!ent.isDirectory()) continue;
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
  // readdir order is filesystem-dependent; sort so findings come out the same
  // on every machine.
  return out.sort();
}
