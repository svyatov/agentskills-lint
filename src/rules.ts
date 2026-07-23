import { basename } from "node:path";
import type { Finding, Rule, Severity, SkillContext } from "./types.ts";

function mkKey(
  ctx: SkillContext,
  key: string,
  severity: Severity,
  rule: string,
  message: string,
): Finding {
  const p = ctx.keyPositions[key] ?? { line: ctx.bodyStartLine, col: 1 };
  return { file: ctx.file, line: p.line, col: p.col, severity, rule, message };
}

function mkLine(
  ctx: SkillContext,
  line: number,
  severity: Severity,
  rule: string,
  message: string,
): Finding {
  return { file: ctx.file, line, col: 1, severity, rule, message };
}

const nameRequired: Rule = (ctx) => {
  const n = ctx.frontmatter?.name;
  return typeof n !== "string" || n.trim() === ""
    ? [
        mkKey(
          ctx,
          "name",
          "error",
          "name-required",
          "`name` is required and must be a non-empty string.",
        ),
      ]
    : [];
};

const nameLength: Rule = (ctx) => {
  const n = ctx.frontmatter?.name;
  return typeof n === "string" && n.length > 64
    ? [
        mkKey(
          ctx,
          "name",
          "error",
          "name-length",
          `\`name\` is ${n.length} characters; the maximum is 64.`,
        ),
      ]
    : [];
};

const nameCharset: Rule = (ctx) => {
  const n = ctx.frontmatter?.name;
  return typeof n === "string" && n.length > 0 && !/^[a-z0-9-]+$/.test(n)
    ? [
        mkKey(
          ctx,
          "name",
          "error",
          "name-charset",
          "`name` may contain only lowercase letters, digits, and hyphens.",
        ),
      ]
    : [];
};

const nameHyphens: Rule = (ctx) => {
  const n = ctx.frontmatter?.name;
  if (typeof n !== "string" || n.length === 0) return [];
  return n.startsWith("-") || n.endsWith("-") || n.includes("--")
    ? [
        mkKey(
          ctx,
          "name",
          "error",
          "name-hyphens",
          "`name` must not start or end with a hyphen or contain consecutive hyphens.",
        ),
      ]
    : [];
};

const nameDirMatch: Rule = (ctx) => {
  const n = ctx.frontmatter?.name;
  const dir = basename(ctx.dir);
  return typeof n === "string" && n.length > 0 && n !== dir
    ? [
        mkKey(
          ctx,
          "name",
          "error",
          "name-dir-match",
          `\`name\` (\`${n}\`) must match the skill directory name (\`${dir}\`).`,
        ),
      ]
    : [];
};

const descriptionRequired: Rule = (ctx) => {
  const d = ctx.frontmatter?.description;
  return typeof d !== "string" || d.trim() === ""
    ? [
        mkKey(
          ctx,
          "description",
          "error",
          "description-required",
          "`description` is required and must be a non-empty string.",
        ),
      ]
    : [];
};

const descriptionLength: Rule = (ctx) => {
  const d = ctx.frontmatter?.description;
  return typeof d === "string" && d.length > 1024
    ? [
        mkKey(
          ctx,
          "description",
          "error",
          "description-length",
          `\`description\` is ${d.length} characters; the maximum is 1024.`,
        ),
      ]
    : [];
};

const compatibilityLength: Rule = (ctx) => {
  const c = ctx.frontmatter?.compatibility;
  return typeof c === "string" && c.length > 500
    ? [
        mkKey(
          ctx,
          "compatibility",
          "error",
          "compatibility-length",
          `\`compatibility\` is ${c.length} characters; the maximum is 500.`,
        ),
      ]
    : [];
};

const metadataStringMap: Rule = (ctx) => {
  const m = ctx.frontmatter?.metadata;
  if (m === undefined) return [];
  const ok =
    typeof m === "object" &&
    m !== null &&
    !Array.isArray(m) &&
    Object.values(m as Record<string, unknown>).every((v) => typeof v === "string");
  return ok
    ? []
    : [
        mkKey(
          ctx,
          "metadata",
          "error",
          "metadata-string-map",
          "`metadata` must be a map of string keys to string values.",
        ),
      ];
};

export const RULES: Rule[] = [
  nameRequired,
  nameLength,
  nameCharset,
  nameHyphens,
  nameDirMatch,
  descriptionRequired,
  descriptionLength,
  compatibilityLength,
  metadataStringMap,
];

export { mkKey, mkLine };
