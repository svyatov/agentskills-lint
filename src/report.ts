import type { Finding, Result } from "./types.ts";

export interface RenderOptions {
  json: boolean;
  strict: boolean;
  color: boolean;
}

const C = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

function paint(s: string, code: string, on: boolean): string {
  return on ? code + s + C.reset : s;
}

function counts(findings: Finding[]): { errs: number; warns: number } {
  let errs = 0;
  let warns = 0;
  for (const f of findings) {
    if (f.severity === "error") errs++;
    else warns++;
  }
  return { errs, warns };
}

export function computeExit(result: Result, strict: boolean): number {
  const { errs, warns } = counts(result.findings);
  return errs > 0 || (strict && warns > 0) ? 1 : 0;
}

export function render(result: Result, opts: RenderOptions): string {
  if (opts.json) return JSON.stringify(result.findings, null, 2);

  const out: string[] = [];
  const byFile = new Map<string, Finding[]>();
  for (const f of result.findings) {
    const arr = byFile.get(f.file);
    if (arr) arr.push(f);
    else byFile.set(f.file, [f]);
  }
  for (const [file, findings] of byFile) {
    out.push(paint(file, C.bold, opts.color));
    for (const f of findings) {
      const sev =
        f.severity === "error"
          ? paint("error", C.red, opts.color)
          : paint("warning", C.yellow, opts.color);
      out.push(
        `  ${paint(`${f.line}:${f.col}`, C.dim, opts.color)}  ${sev}  ${f.rule}  ${f.message}`,
      );
    }
  }

  const { errs, warns } = counts(result.findings);
  const s = (n: number) => (n === 1 ? "" : "s");
  out.push(
    `${errs} error${s(errs)}, ${warns} warning${s(warns)} across ${result.skillCount} skill${s(result.skillCount)}`,
  );
  return out.join("\n");
}
