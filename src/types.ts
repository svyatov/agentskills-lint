export type Severity = "error" | "warning";

export interface Finding {
  file: string;
  line: number;
  col: number;
  severity: Severity;
  rule: string;
  message: string;
}

export interface SkillContext {
  dir: string;
  file: string;
  lines: string[];
  frontmatter: Record<string, unknown> | null;
  body: string;
  bodyStartLine: number;
  yamlErrors: Finding[];
  keyPositions: Record<string, { line: number; col: number }>;
}

export type Rule = (ctx: SkillContext) => Finding[];

export interface Result {
  findings: Finding[];
  skillCount: number;
}
