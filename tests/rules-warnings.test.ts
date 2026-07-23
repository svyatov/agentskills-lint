import { expect, it } from "bun:test";
import { parse } from "../src/parse.ts";
import { RULES } from "../src/rules.ts";
import { makeSkill } from "./helpers.ts";

function rulesOf(content: string, extra?: Record<string, string>): string[] {
  const ctx = parse(makeSkill("demo", content, extra));
  return RULES.flatMap((r) => r(ctx)).map((f) => f.rule);
}

it("flags a weak (too short) description", () => {
  expect(rulesOf("---\nname: demo\ndescription: Helps with PDFs.\n---\nBody.\n")).toContain(
    "description-weak",
  );
});

it("flags an empty body", () => {
  expect(
    rulesOf(
      "---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\n---\n",
    ),
  ).toContain("empty-body");
});

it("flags an unknown frontmatter key", () => {
  expect(
    rulesOf(
      "---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\nauthr: x\n---\nBody.\n",
    ),
  ).toContain("unknown-frontmatter-key");
});

it("flags a broken reference", () => {
  expect(
    rulesOf(
      "---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\n---\nSee scripts/missing.py for details.\n",
    ),
  ).toContain("broken-reference");
});

it("does not flag a reference that exists", () => {
  const out = rulesOf(
    "---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\n---\nRun scripts/extract.py now.\n",
    { "scripts/extract.py": "print('x')\n" },
  );
  expect(out).not.toContain("broken-reference");
});

it("flags a reference nested too deep", () => {
  const out = rulesOf(
    "---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\n---\nSee references/a/b.md here.\n",
    { "references/a/b.md": "x\n" },
  );
  expect(out).toContain("reference-depth");
});

it("does not flag a reference that ends a sentence with a period", () => {
  const out = rulesOf(
    "---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\n---\nRun scripts/extract.py.\n",
    { "scripts/extract.py": "print('x')\n" },
  );
  expect(out).not.toContain("broken-reference");
});

it("does not flag a scheme-less external link as a broken reference", () => {
  expect(
    rulesOf(
      "---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\n---\nSee [the site](example.com) and [docs](www.foo.io/page.html).\n",
    ),
  ).not.toContain("broken-reference");
});
