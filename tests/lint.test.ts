import { expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lint } from "../src/lint.ts";
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
