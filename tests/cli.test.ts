import { expect, it } from "bun:test";
import { run } from "../src/cli.ts";
import { makeSkill } from "./helpers.ts";

it("returns 1 for a skill with errors", () => {
  const dir = makeSkill("bad", "---\nname: Bad\ndescription: short\n---\n");
  expect(run(["node", "cli", dir])).toBe(1);
});

it("returns 0 for a clean skill", () => {
  const dir = makeSkill(
    "good",
    "---\nname: good\ndescription: Extracts data from files. Use when the user mentions extraction.\n---\nReal instructions here.\n",
  );
  expect(run(["node", "cli", dir])).toBe(0);
});

it("returns 2 when no skills are found", () => {
  const dir = makeSkill(
    "good",
    "---\nname: good\ndescription: Extracts data. Use when the user mentions extraction.\n---\nBody.\n",
  );
  expect(run(["node", "cli", `${dir}/nope`])).toBe(2);
});
