import { describe, expect, it } from "vitest";
import { safeReturnPath } from "../src/site";

describe("safeReturnPath", () => {
  it("allows the exact /start path", () => {
    expect(safeReturnPath("/start")).toBe("/start");
  });

  it("rejects protocol-relative, absolute, traversal, and query suffixes", () => {
    for (const value of ["//evil.example", "https://x", "/start/../x", "/start?x=1", "/start/", "", null, undefined]) {
      expect(safeReturnPath(value)).toBeUndefined();
    }
  });
});
