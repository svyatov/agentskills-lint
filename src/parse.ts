import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument } from "yaml";
import type { Finding, SkillContext } from "./types.ts";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parse(dir: string): SkillContext {
  const file = join(dir, "SKILL.md");
  const raw = readFileSync(file, "utf8");
  const lines = raw.split("\n");
  const yamlErrors: Finding[] = [];
  const keyPositions: Record<string, { line: number; col: number }> = {};
  let frontmatter: Record<string, unknown> | null = null;
  let body = raw;
  let bodyStartLine = 1;

  if (lines[0]?.trim() !== "---") {
    yamlErrors.push({
      file,
      line: 1,
      col: 1,
      severity: "error",
      rule: "frontmatter-parse",
      message: "SKILL.md must begin with YAML frontmatter delimited by `---`.",
    });
    return { dir, file, raw, lines, frontmatter, body, bodyStartLine, yamlErrors, keyPositions };
  }

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) {
    yamlErrors.push({
      file,
      line: 1,
      col: 1,
      severity: "error",
      rule: "frontmatter-parse",
      message: "Frontmatter opening `---` has no closing `---`.",
    });
    return { dir, file, raw, lines, frontmatter, body, bodyStartLine, yamlErrors, keyPositions };
  }

  const fmText = lines.slice(1, end).join("\n");
  const doc = parseDocument(fmText, { prettyErrors: true });
  for (const e of doc.errors) {
    const lc = e.linePos?.[0];
    yamlErrors.push({
      file,
      line: (lc ? lc.line : 1) + 1,
      col: lc ? lc.col : 1,
      severity: "error",
      rule: "frontmatter-parse",
      message: e.message,
    });
  }

  let js: unknown = null;
  try {
    js = doc.toJS();
  } catch {
    js = null;
  }
  if (js && typeof js === "object" && !Array.isArray(js)) {
    frontmatter = js as Record<string, unknown>;
    for (const key of Object.keys(frontmatter)) {
      const re = new RegExp(`^${escapeRe(key)}\\s*:`);
      for (let i = 1; i < end; i++) {
        if (re.test(lines[i] ?? "")) {
          keyPositions[key] = { line: i + 1, col: 1 };
          break;
        }
      }
    }
  } else if (doc.errors.length === 0) {
    yamlErrors.push({
      file,
      line: 1,
      col: 1,
      severity: "error",
      rule: "frontmatter-parse",
      message: "Frontmatter is not a YAML mapping.",
    });
  }

  body = lines.slice(end + 1).join("\n");
  bodyStartLine = end + 2;
  return { dir, file, raw, lines, frontmatter, body, bodyStartLine, yamlErrors, keyPositions };
}
