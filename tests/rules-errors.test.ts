import { expect, it } from "bun:test";
import { parse } from "../src/parse.ts";
import { RULES } from "../src/rules.ts";
import { makeSkill } from "./helpers.ts";

function rulesOf(content: string, name = "demo"): string[] {
  const ctx = parse(makeSkill(name, content));
  return RULES.flatMap((r) => r(ctx)).map((f) => f.rule);
}

it("flags an uppercase name (charset)", () => {
  expect(
    rulesOf("---\nname: Demo\ndescription: A clear description of when to use.\n---\nB\n", "Demo"),
  ).toContain("name-charset");
});

it("flags name not matching the directory", () => {
  expect(
    rulesOf("---\nname: other\ndescription: A clear description of when to use.\n---\nB\n", "demo"),
  ).toContain("name-dir-match");
});

it("flags a missing description", () => {
  expect(rulesOf("---\nname: demo\n---\nB\n")).toContain("description-required");
});

it("flags consecutive hyphens", () => {
  expect(
    rulesOf(
      "---\nname: de--mo\ndescription: A clear description of when to use.\n---\nB\n",
      "de--mo",
    ),
  ).toContain("name-hyphens");
});

it("flags non-string metadata values", () => {
  expect(
    rulesOf(
      "---\nname: demo\ndescription: A clear description of when to use.\nmetadata:\n  version: 1\n---\nB\n",
    ),
  ).toContain("metadata-string-map");
});

it("accepts a clean skill", () => {
  const clean = rulesOf(
    "---\nname: demo\ndescription: Extracts data from files. Use when the user mentions extraction.\n---\nReal instructions here.\n",
  );
  expect(clean).not.toContain("name-charset");
  expect(clean).not.toContain("description-required");
});

it("flags an over-long name", () => {
  const long = "a".repeat(65);
  expect(
    rulesOf(`---\nname: ${long}\ndescription: A clear description of when to use.\n---\nB\n`, long),
  ).toContain("name-length");
});

it("flags an over-long description", () => {
  expect(rulesOf(`---\nname: demo\ndescription: ${"d".repeat(1025)}\n---\nB\n`)).toContain(
    "description-length",
  );
});

it("flags over-long compatibility", () => {
  expect(
    rulesOf(
      `---\nname: demo\ndescription: A clear description of when to use.\ncompatibility: ${"c".repeat(501)}\n---\nB\n`,
    ),
  ).toContain("compatibility-length");
});

it("flags a missing name", () => {
  expect(rulesOf("---\ndescription: A clear description of when to use.\n---\nB\n")).toContain(
    "name-required",
  );
});
