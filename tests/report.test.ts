import { expect, it } from "bun:test";
import { computeExit, render } from "../src/report.ts";
import type { Finding, Result } from "../src/types.ts";

const err: Finding = {
  file: "s/SKILL.md",
  line: 2,
  col: 1,
  severity: "error",
  rule: "name-required",
  message: "m",
};
const warn: Finding = {
  file: "s/SKILL.md",
  line: 3,
  col: 1,
  severity: "warning",
  rule: "empty-body",
  message: "m",
};

it("exit 1 when an error is present", () => {
  expect(computeExit({ findings: [err], skillCount: 1 }, false)).toBe(1);
});

it("exit 0 for warnings only, 1 under strict", () => {
  const r: Result = { findings: [warn], skillCount: 1 };
  expect(computeExit(r, false)).toBe(0);
  expect(computeExit(r, true)).toBe(1);
});

it("json render is parseable and lists findings", () => {
  const out = render(
    { findings: [err], skillCount: 1 },
    { json: true, strict: false, color: false },
  );
  expect(JSON.parse(out)).toHaveLength(1);
});

it("human render includes location, rule, and summary", () => {
  const out = render(
    { findings: [err], skillCount: 1 },
    { json: false, strict: false, color: false },
  );
  expect(out).toContain("2:1");
  expect(out).toContain("name-required");
  expect(out).toContain("1 error");
});
