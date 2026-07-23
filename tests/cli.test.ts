import { expect, it } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

it("returns 1 for warnings only under --strict", () => {
  const dir = makeSkill(
    "warn",
    "---\nname: warn\ndescription: Extracts data. Use when the user mentions extraction.\n---\n",
  );
  expect(run(["node", "cli", dir])).toBe(0);
  expect(run(["node", "cli", dir, "--strict"])).toBe(1);
});

it("emits parseable JSON under --json", () => {
  const dir = makeSkill("bad", "---\nname: Bad\ndescription: short\n---\n");
  let out = "";
  const write = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string) => {
    out += chunk;
    return true;
  }) as typeof process.stdout.write;
  try {
    expect(run(["node", "cli", dir, "--json"])).toBe(1);
  } finally {
    process.stdout.write = write;
  }
  const parsed = JSON.parse(out);
  expect(parsed.skillCount).toBe(1);
  expect(parsed.findings.length).toBeGreaterThan(0);
});

it("returns 2 when the path does not exist", () => {
  const dir = makeSkill(
    "good",
    "---\nname: good\ndescription: Extracts data. Use when the user mentions extraction.\n---\nBody.\n",
  );
  expect(run(["node", "cli", `${dir}/nope`])).toBe(2);
});

it("returns 2 when a directory holds no skills", () => {
  expect(run(["node", "cli", mkdtempSync(join(tmpdir(), "askill-empty-"))])).toBe(2);
});

it("returns 2 when the tree cannot be read", () => {
  if (process.getuid?.() === 0) return; // root ignores the mode bits below
  const root = mkdtempSync(join(tmpdir(), "askill-perm-"));
  const locked = join(root, "locked");
  mkdirSync(locked);
  chmodSync(locked, 0o000);
  try {
    expect(run(["node", "cli", root])).toBe(2);
  } finally {
    chmodSync(locked, 0o700);
  }
});

it("falls back to the working directory when no path is given", () => {
  const cwd = process.cwd();
  process.chdir(mkdtempSync(join(tmpdir(), "askill-cwd-")));
  try {
    expect(run(["node", "cli"])).toBe(2);
  } finally {
    process.chdir(cwd);
  }
});
