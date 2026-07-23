import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument } from "yaml";
import type { SkillContext } from "./types.ts";

export function parse(dir: string): SkillContext {
  const file = join(dir, "SKILL.md");
  const raw = readFileSync(file, "utf8");
  const lines = raw.split("\n");
  const ctx: SkillContext = {
    dir,
    file,
    lines,
    frontmatter: null,
    body: raw,
    bodyStartLine: 1,
    yamlErrors: [],
    keyPositions: {},
  };
  const fail = (message: string, line = 1, col = 1) => {
    ctx.yamlErrors.push({ file, line, col, severity: "error", rule: "frontmatter-parse", message });
  };

  if (lines[0]?.trim() !== "---") {
    fail("SKILL.md must begin with YAML frontmatter delimited by `---`.");
    return ctx;
  }

  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end === -1) {
    fail("Frontmatter opening `---` has no closing `---`.");
    return ctx;
  }

  const doc = parseDocument(lines.slice(1, end).join("\n"), { prettyErrors: true });
  for (const e of doc.errors) {
    const lc = e.linePos?.[0];
    fail(e.message, (lc?.line ?? 1) + 1, lc?.col ?? 1);
  }

  let js: unknown = null;
  try {
    js = doc.toJS();
  } catch {
    js = null;
  }
  if (js && typeof js === "object" && !Array.isArray(js)) {
    const frontmatter = js as Record<string, unknown>;
    ctx.frontmatter = frontmatter;
    // One scan of the frontmatter lines instead of a generated regex per key:
    // first top-level `key:` wins, which is what the per-key search returned.
    for (let i = 1; i < end; i++) {
      const key = /^([^:]+?)\s*:/.exec(lines[i] ?? "")?.[1];
      if (key && Object.hasOwn(frontmatter, key) && !Object.hasOwn(ctx.keyPositions, key)) {
        ctx.keyPositions[key] = { line: i + 1, col: 1 };
      }
    }
  } else if (doc.errors.length === 0) {
    fail("Frontmatter is not a YAML mapping.");
  }

  ctx.body = lines.slice(end + 1).join("\n");
  ctx.bodyStartLine = end + 2;
  return ctx;
}
