import { expect, it } from "bun:test";
import type { Finding } from "../src/types.ts";

it("Finding shape is usable", () => {
  const f: Finding = { file: "a", line: 1, col: 1, severity: "error", rule: "x", message: "m" };
  expect(f.severity).toBe("error");
});
