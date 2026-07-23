import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function makeSkill(name: string, content: string, extra?: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "askill-"));
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), content);
  for (const [rel, body] of Object.entries(extra ?? {})) {
    const fp = join(dir, rel);
    mkdirSync(dirname(fp), { recursive: true });
    writeFileSync(fp, body);
  }
  return dir;
}
