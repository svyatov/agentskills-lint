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

/** The frontmatter value at `key`, only when it is a string. */
function str(ctx: SkillContext, key: string): string | undefined {
  const v = ctx.frontmatter?.[key];
  return typeof v === "string" ? v : undefined;
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
  return str(ctx, "name")?.trim()
    ? []
    : [
        mkKey(
          ctx,
          "name",
          "error",
          "name-required",
          "`name` is required and must be a non-empty string.",
        ),
      ];
};

const nameLength: Rule = (ctx) => {
  const n = str(ctx, "name");
  return n && n.length > 64
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
  const n = str(ctx, "name");
  return n && !/^[a-z0-9-]+$/.test(n)
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
  const n = str(ctx, "name");
  return n && (n.startsWith("-") || n.endsWith("-") || n.includes("--"))
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
  const n = str(ctx, "name");
  const dir = basename(ctx.dir);
  return n && n !== dir
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
  return str(ctx, "description")?.trim()
    ? []
    : [
        mkKey(
          ctx,
          "description",
          "error",
          "description-required",
          "`description` is required and must be a non-empty string.",
        ),
      ];
};

const descriptionLength: Rule = (ctx) => {
  const d = str(ctx, "description");
  return d && d.length > 1024
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
  const c = str(ctx, "compatibility");
  return c && c.length > 500
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
const TRIGGER_CUES = /\b(when|if|use|for)\b/i;

// ponytail: TLD list is a heuristic ceiling; a real local file named e.g. `notes.io` would be skipped. Extend the list if that ever bites.
const COMMON_TLD = /\.(com|org|net|io|dev|co|app|ai|gov|edu|info|xyz|sh)$/i;

function cleanRef(raw: string | undefined): string | null {
  if (!raw) return null;
  const p = ((raw.split("#")[0] ?? "").split("?")[0]?.trim() ?? "")
    .replace(/[.,;:!?)\]}]+$/, "")
    // `./references/a.md` is one level deep, not two: drop the prefix before
    // anything counts segments or joins the path.
    .replace(/^(?:\.\/)+/, "");
  if (p === "" || p.startsWith("/") || p.startsWith("#")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return null; // http:, https:, mailto:
  if (COMMON_TLD.test(p.split("/")[0] ?? "")) return null; // example.com, www.foo.io/page
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
  // Length is measured raw, like `description-length`: a block scalar keeps its
  // trailing newline, and trimming here would move the 40-character boundary.
  const d = str(ctx, "description");
  if (!d?.trim()) return [];
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
  if (!TRIGGER_CUES.test(d))
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
