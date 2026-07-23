import { expect, it } from "bun:test";
import { parse } from "../src/parse.ts";
import { makeSkill } from "./helpers.ts";

it("parses frontmatter, body, and key positions", () => {
  const dir = makeSkill(
    "demo",
    "---\nname: demo\ndescription: Does a thing.\nmetadata:\n  v: '1'\n---\nBody here.\n",
  );
  const ctx = parse(dir);
  expect(ctx.frontmatter?.name).toBe("demo");
  expect(ctx.body.trim()).toBe("Body here.");
  expect(ctx.keyPositions.name?.line).toBe(2);
  expect(ctx.keyPositions.description?.line).toBe(3);
  expect(ctx.keyPositions.metadata?.line).toBe(4);
  expect(ctx.keyPositions.v).toBeUndefined();
});

it("reports missing frontmatter", () => {
  const dir = makeSkill("demo", "no frontmatter here\n");
  const ctx = parse(dir);
  expect(ctx.frontmatter).toBeNull();
  expect(ctx.yamlErrors[0]?.rule).toBe("frontmatter-parse");
});

it("reports frontmatter that is never closed", () => {
  const ctx = parse(makeSkill("demo", "---\nname: demo\ndescription: x\n"));
  expect(ctx.frontmatter).toBeNull();
  expect(ctx.yamlErrors[0]?.message).toContain("no closing");
});

it("reports frontmatter that is not a mapping", () => {
  const ctx = parse(makeSkill("demo", "---\n- one\n- two\n---\nBody\n"));
  expect(ctx.frontmatter).toBeNull();
  expect(ctx.yamlErrors[0]?.message).toContain("not a YAML mapping");
});

it("reports frontmatter that parses but cannot be converted", () => {
  // An unresolved alias yields no parse error, but `toJS()` throws on it.
  const ctx = parse(makeSkill("demo", "---\nname: *missing\n---\nBody\n"));
  expect(ctx.frontmatter).toBeNull();
  expect(ctx.yamlErrors[0]?.rule).toBe("frontmatter-parse");
});

it("reports a YAML syntax error with a line offset into the file", () => {
  const dir = makeSkill("demo", "---\nname: demo\n  bad: : :\n---\nBody\n");
  const ctx = parse(dir);
  expect(ctx.yamlErrors[0]?.rule).toBe("frontmatter-parse");
  expect(ctx.yamlErrors[0]?.line).toBeGreaterThan(1);
});
