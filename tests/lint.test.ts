import { expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lint } from "../src/lint.ts";
import { RULES } from "../src/rules.ts";
import { makeSkill } from "./helpers.ts";

it("lints a single skill and reports its findings", () => {
  const dir = makeSkill("bad", "---\nname: Bad\ndescription: short\n---\n");
  const result = lint(dir);
  expect(result.skillCount).toBe(1);
  const rules = result.findings.map((f) => f.rule);
  expect(rules).toContain("name-charset");
  expect(rules).toContain("name-dir-match");
});

it("lints every skill under a parent directory", () => {
  const dir = makeSkill(
    "one",
    "---\nname: one\ndescription: Extracts data. Use when the user mentions extraction.\n---\nBody.\n",
  );
  const parent = join(dir, "..");
  const two = join(parent, "two");
  mkdirSync(two, { recursive: true });
  writeFileSync(
    join(two, "SKILL.md"),
    "---\nname: two\ndescription: Extracts data. Use when the user mentions extraction.\n---\nBody.\n",
  );
  expect(lint(parent).skillCount).toBe(2);
});

it("reports an unreadable SKILL.md without abandoning the other skills", () => {
  const dir = makeSkill(
    "one",
    "---\nname: one\ndescription: Extracts data. Use when the user mentions extraction.\n---\nBody.\n",
  );
  const parent = join(dir, "..");
  // A directory named SKILL.md: discovery accepts it, reading it throws EISDIR.
  mkdirSync(join(parent, "broken", "SKILL.md"), { recursive: true });
  const result = lint(parent);
  expect(result.skillCount).toBe(2);
  expect(result.findings.map((f) => f.rule)).toContain("unreadable");
});

it("turns a crashing rule into a finding instead of a crash", () => {
  const dir = makeSkill(
    "one",
    "---\nname: one\ndescription: Extracts data. Use when the user mentions extraction.\n---\nBody.\n",
  );
  RULES.push(() => {
    throw new Error("boom");
  });
  try {
    const findings = lint(dir).findings;
    expect(findings.map((f) => f.rule)).toContain("internal");
    expect(findings.find((f) => f.rule === "internal")?.message).toContain("boom");
  } finally {
    RULES.pop();
  }
});
