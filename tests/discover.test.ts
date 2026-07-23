import { expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { discover, NoSkillsError } from "../src/discover.ts";
import { makeSkill } from "./helpers.ts";

it("returns the dir itself when it holds a SKILL.md", () => {
  const dir = makeSkill("solo", "---\nname: solo\ndescription: x.\n---\n");
  expect(discover(dir)).toEqual([dir]);
});

it("walks subdirectories to find skills", () => {
  const dir = makeSkill("one", "---\nname: one\ndescription: x.\n---\n");
  const parent = join(dir, "..");
  const two = join(parent, "two");
  mkdirSync(two, { recursive: true });
  writeFileSync(join(two, "SKILL.md"), "---\nname: two\ndescription: x.\n---\n");
  expect(discover(parent).sort()).toEqual([dir, two].sort());
});

it("throws NoSkillsError on a missing path", () => {
  expect(() => discover("/no/such/path")).toThrow(NoSkillsError);
});
