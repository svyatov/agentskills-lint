import { expect, it } from "bun:test";
import { parse } from "../src/parse.ts";
import { makeSkill } from "./helpers.ts";

it("parses frontmatter, body, and key positions", () => {
  const dir = makeSkill("demo", "---\nname: demo\ndescription: Does a thing.\n---\nBody here.\n");
  const ctx = parse(dir);
  expect(ctx.frontmatter?.name).toBe("demo");
  expect(ctx.body.trim()).toBe("Body here.");
  expect(ctx.keyPositions.name?.line).toBe(2);
  expect(ctx.yamlErrors).toHaveLength(0);
});

it("reports missing frontmatter", () => {
  const dir = makeSkill("demo", "no frontmatter here\n");
  const ctx = parse(dir);
  expect(ctx.frontmatter).toBeNull();
  expect(ctx.yamlErrors[0]?.rule).toBe("frontmatter-parse");
});

it("reports a YAML syntax error with a line offset into the file", () => {
  const dir = makeSkill("demo", "---\nname: demo\n  bad: : :\n---\nBody\n");
  const ctx = parse(dir);
  expect(ctx.yamlErrors[0]?.rule).toBe("frontmatter-parse");
  expect(ctx.yamlErrors[0]?.line).toBeGreaterThan(1);
});
