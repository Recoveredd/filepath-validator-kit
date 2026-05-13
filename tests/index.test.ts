import { describe, expect, it } from "vitest";
import { PathVetError, assertValidPath, isValidPath, vetPath } from "../src/index.js";

describe("vetPath", () => {
  it("accepts a simple portable relative path", () => {
    expect(vetPath("notes/2026-05-12.txt")).toEqual({
      valid: true,
      input: "notes/2026-05-12.txt",
      normalizedSeparators: "notes/2026-05-12.txt",
      absolute: false,
      segments: [
        { value: "notes", index: 0, start: 0, end: 5 },
        { value: "2026-05-12.txt", index: 1, start: 6, end: 20 }
      ],
      issues: []
    });
  });

  it("rejects empty and non-string input", () => {
    expect(vetPath("").issues[0]?.code).toBe("empty-input");
    expect(vetPath(null).issues[0]?.code).toBe("not-a-string");
  });

  it("reports Windows-reserved names with segment details and offsets", () => {
    const result = vetPath("reports/con.txt", { platform: "portable" });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "windows-reserved-name",
      message: "Path segment is a Windows-reserved device name.",
      segmentIndex: 1,
      segment: "con.txt",
      start: 8,
      end: 15
    });
  });

  it("allows Windows characters under POSIX policy", () => {
    expect(vetPath("assets/logo?.svg", { platform: "posix" }).valid).toBe(true);
    expect(vetPath("assets/logo?.svg", { platform: "windows" }).issues[0]?.code).toBe(
      "windows-reserved-character"
    );
  });

  it("enforces absolute and relative path options", () => {
    expect(vetPath("/tmp/report.txt", { allowAbsolute: false }).issues[0]?.code).toBe(
      "absolute-not-allowed"
    );
    expect(vetPath("tmp/report.txt", { allowRelative: false }).issues[0]?.code).toBe(
      "relative-not-allowed"
    );
  });

  it("accepts absolute root paths without reporting empty segments", () => {
    expect(vetPath("/", { platform: "posix" })).toMatchObject({
      valid: true,
      absolute: true,
      issues: []
    });
    expect(vetPath("C:\\", { platform: "windows" })).toMatchObject({
      valid: true,
      absolute: true,
      issues: []
    });
  });

  it("rejects traversal and repeated separators unless allowed", () => {
    expect(vetPath("safe/../file.txt").issues.map((issue) => issue.code)).toContain(
      "traversal-not-allowed"
    );
    expect(vetPath("safe//file.txt").issues.map((issue) => issue.code)).toContain("empty-segment");

    expect(
      vetPath("safe/../file.txt", {
        allowTraversal: true
      }).valid
    ).toBe(true);
    expect(
      vetPath("safe//file.txt", {
        allowEmptySegments: true
      }).valid
    ).toBe(true);
  });

  it("checks length limits and invalid numeric options", () => {
    expect(vetPath("abcdef", { maxLength: 3 }).issues[0]?.code).toBe("path-too-long");
    expect(vetPath("abc/def", { maxSegmentLength: 2 }).issues[0]?.code).toBe("segment-too-long");
    expect(vetPath("abc", { maxLength: -1 }).issues[0]?.code).toBe("invalid-option");
    expect(vetPath("abc", { maxSegmentLength: 1.5 }).issues[0]?.code).toBe("invalid-option");
  });

  it("normalizes backslash separators for diagnostics", () => {
    const result = vetPath("safe\\aux\\file.txt");

    expect(result.normalizedSeparators).toBe("safe/aux/file.txt");
    expect(result.issues[0]).toMatchObject({
      code: "windows-reserved-name",
      segmentIndex: 1,
      segment: "aux",
      start: 5,
      end: 8
    });
  });
});

describe("isValidPath", () => {
  it("returns a boolean shortcut", () => {
    expect(isValidPath("ok/file.txt")).toBe(true);
    expect(isValidPath("bad/file?.txt")).toBe(false);
  });
});

describe("assertValidPath", () => {
  it("returns valid input or throws a typed error", () => {
    expect(assertValidPath("ok/file.txt")).toBe("ok/file.txt");
    expect(() => assertValidPath("bad/file?.txt")).toThrow(PathVetError);
  });
});
