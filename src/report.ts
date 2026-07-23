import { styleText } from "node:util";
import type { Finding, Result } from "./types.ts";

export interface RenderOptions {
  json: boolean;
  strict: boolean;
  color: boolean;
}

// `color` is the caller's decision (the CLI derives it from isTTY and NO_COLOR),
// so skip the stream sniffing styleText would otherwise do against process.stdout.
function paint(s: string, style: Parameters<typeof styleText>[0], on: boolean): string {
  return on ? styleText(style, s, { validateStream: false }) : s;
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
  if (opts.json) return JSON.stringify(result, null, 2);

  const out: string[] = [];
  for (const [file, findings] of Map.groupBy(result.findings, (f) => f.file)) {
    findings.sort((a, b) => a.line - b.line || a.col - b.col);
    out.push(paint(file, "bold", opts.color));
    for (const f of findings) {
      const sev =
        f.severity === "error"
          ? paint("error", "red", opts.color)
          : paint("warning", "yellow", opts.color);
      out.push(
        `  ${paint(`${f.line}:${f.col}`, "dim", opts.color)}  ${sev}  ${f.rule}  ${f.message}`,
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
