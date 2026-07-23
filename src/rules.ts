import { existsSync } from "node:fs";
import { basename, join } from "node:path";
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

const SPEC_KEYS = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
]);
const TRIGGER_CUES = [/\bwhen\b/i, /\bif\b/i, /\buse\b/i, /\bfor\b/i];

function cleanRef(raw: string | undefined): string | null {
  if (!raw) return null;
  const p = (raw.split("#")[0] ?? "").split("?")[0]?.trim() ?? "";
  if (p === "" || p.startsWith("/") || p.startsWith("#")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return null; // http:, https:, mailto:
  if (!p.includes("/") && !/\.[A-Za-z0-9]+$/.test(p)) return null;
  return p;
}

function extractRefs(body: string): string[] {
  const refs = new Set<string>();
  for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    const p = cleanRef(m[1]);
    if (p) refs.add(p);
  }
  for (const m of body.matchAll(/(?:^|[\s`])((?:references|scripts|assets)\/[A-Za-z0-9._/-]+)/g)) {
    const p = cleanRef(m[1]);
    if (p) refs.add(p);
  }
  return [...refs];
}

function refLine(ctx: SkillContext, ref: string): number {
  const idx = ctx.lines.findIndex((l) => l.includes(ref));
  return idx >= 0 ? idx + 1 : ctx.bodyStartLine;
}

const descriptionWeak: Rule = (ctx) => {
  const d = ctx.frontmatter?.description;
  if (typeof d !== "string" || d.trim() === "") return [];
  if (d.length < 40)
    return [
      mkKey(
        ctx,
        "description",
        "warning",
        "description-weak",
        `\`description\` is only ${d.length} characters; describe both what the skill does and when to use it.`,
      ),
    ];
  if (!TRIGGER_CUES.some((re) => re.test(d)))
    return [
      mkKey(
        ctx,
        "description",
        "warning",
        "description-weak",
        "`description` may not say *when* to use the skill; agents rely on that to trigger it.",
      ),
    ];
  return [];
};

const bodyLineLimit: Rule = (ctx) => {
  const count = ctx.body.split("\n").length;
  return count > 500
    ? [
        mkLine(
          ctx,
          ctx.bodyStartLine,
          "warning",
          "body-line-limit",
          `SKILL.md body is ${count} lines; keep it under 500 and move detail into references/.`,
        ),
      ]
    : [];
};

const bodyTokenEstimate: Rule = (ctx) => {
  const est = Math.ceil(ctx.body.length / 4);
  return est > 5000
    ? [
        mkLine(
          ctx,
          ctx.bodyStartLine,
          "warning",
          "body-token-estimate",
          `SKILL.md body is ~${est} tokens (estimate); the recommended budget is 5000. Split into references/.`,
        ),
      ]
    : [];
};

const brokenReference: Rule = (ctx) =>
  extractRefs(ctx.body)
    .filter((ref) => !existsSync(join(ctx.dir, ref)))
    .map((ref) =>
      mkLine(
        ctx,
        refLine(ctx, ref),
        "warning",
        "broken-reference",
        `Referenced file \`${ref}\` does not exist in the skill.`,
      ),
    );

const referenceDepth: Rule = (ctx) =>
  extractRefs(ctx.body)
    .filter((ref) => ref.split("/").length > 2)
    .map((ref) =>
      mkLine(
        ctx,
        refLine(ctx, ref),
        "warning",
        "reference-depth",
        `Referenced file \`${ref}\` is nested more than one level below the skill root.`,
      ),
    );

const unknownKey: Rule = (ctx) => {
  if (!ctx.frontmatter) return [];
  return Object.keys(ctx.frontmatter)
    .filter((k) => !SPEC_KEYS.has(k))
    .map((k) =>
      mkKey(
        ctx,
        k,
        "warning",
        "unknown-frontmatter-key",
        `Unknown frontmatter key \`${k}\`; the spec defines name, description, license, compatibility, metadata, allowed-tools.`,
      ),
    );
};

const emptyBody: Rule = (ctx) =>
  ctx.frontmatter && ctx.body.trim() === ""
    ? [
        mkLine(
          ctx,
          ctx.bodyStartLine,
          "warning",
          "empty-body",
          "SKILL.md has no instructions; the body is where the skill does its work.",
        ),
      ]
    : [];

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
  descriptionWeak,
  bodyLineLimit,
  bodyTokenEstimate,
  brokenReference,
  referenceDepth,
  unknownKey,
  emptyBody,
];

export { mkKey, mkLine };
