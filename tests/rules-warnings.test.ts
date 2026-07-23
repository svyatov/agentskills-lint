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

it("flags a long description that never says when to use the skill", () => {
  expect(
    rulesOf(
      "---\nname: demo\ndescription: Converts spreadsheet cells into tidy database rows quickly.\n---\nBody.\n",
    ),
  ).toContain("description-weak");
});

it("measures description length before trimming", () => {
  // A block scalar keeps a trailing newline; 39 visible characters plus it clears
  // the 40-character floor, exactly as `description-length` would count it.
  const desc = "Extracts the data. Use when extracting.";
  expect(desc).toHaveLength(39);
  expect(rulesOf(`---\nname: demo\ndescription: |\n  ${desc}\n---\nBody.\n`)).not.toContain(
    "description-weak",
  );
});

it("flags a body over the line budget", () => {
  const body = "line\n".repeat(501);
  expect(
    rulesOf(
      `---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\n---\n${body}`,
    ),
  ).toContain("body-line-limit");
});

it("flags a body over the token budget", () => {
  const body = `${"word ".repeat(4001)}\n`;
  expect(
    rulesOf(
      `---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\n---\n${body}`,
    ),
  ).toContain("body-token-estimate");
});

it("does not treat a ./-prefixed reference as nested", () => {
  const out = rulesOf(
    "---\nname: demo\ndescription: Extracts data. Use when the user mentions extraction.\n---\nSee [notes](./references/a.md).\n",
    { "references/a.md": "x\n" },
  );
  expect(out).not.toContain("reference-depth");
  expect(out).not.toContain("broken-reference");
});
