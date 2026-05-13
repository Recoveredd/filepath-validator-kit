import { describe, expect, it } from "vitest";
import {
  PathVetError,
  assertValidPath,
  createFilePathValidator,
  isValidPath,
  validateFilePath,
  vetPath
} from "../src/index.js";

describe("validateFilePath", () => {
  it("accepts a simple portable relative path", () => {
    expect(validateFilePath("notes/2026-05-12.txt")).toEqual({
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
    expect(validateFilePath("").issues[0]?.code).toBe("empty-input");
    expect(validateFilePath(null).issues[0]?.code).toBe("not-a-string");
  });

  it("reports Windows-reserved names with segment details and offsets", () => {
    const result = validateFilePath("reports/con.txt", { platform: "portable" });

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
    expect(validateFilePath("assets/logo?.svg", { platform: "posix" }).valid).toBe(true);
    expect(validateFilePath("assets/logo?.svg", { platform: "windows" }).issues[0]?.code).toBe(
      "windows-reserved-character"
    );
  });

  it("enforces absolute and relative path options", () => {
    expect(validateFilePath("/tmp/report.txt", { allowAbsolute: false }).issues[0]?.code).toBe(
      "absolute-not-allowed"
    );
    expect(validateFilePath("tmp/report.txt", { allowRelative: false }).issues[0]?.code).toBe(
      "relative-not-allowed"
    );
  });

  it("accepts absolute root paths without reporting empty segments", () => {
    expect(validateFilePath("/", { platform: "posix" })).toMatchObject({
      valid: true,
      absolute: true,
      issues: []
    });
    expect(validateFilePath("C:\\", { platform: "windows" })).toMatchObject({
      valid: true,
      absolute: true,
      issues: []
    });
  });

  it("rejects traversal and repeated separators unless allowed", () => {
    expect(validateFilePath("safe/../file.txt").issues.map((issue) => issue.code)).toContain(
      "traversal-not-allowed"
    );
    expect(validateFilePath("safe//file.txt").issues.map((issue) => issue.code)).toContain("empty-segment");

    expect(
      validateFilePath("safe/../file.txt", {
        allowTraversal: true
      }).valid
    ).toBe(true);
    expect(
      validateFilePath("safe//file.txt", {
        allowEmptySegments: true
      }).valid
    ).toBe(true);
  });

  it("checks length limits and invalid numeric options", () => {
    expect(validateFilePath("abcdef", { maxLength: 3 }).issues[0]?.code).toBe("path-too-long");
    expect(validateFilePath("abc/def", { maxSegmentLength: 2 }).issues[0]?.code).toBe("segment-too-long");
    expect(validateFilePath("abc", { maxLength: -1 }).issues[0]?.code).toBe("invalid-option");
    expect(validateFilePath("abc", { maxSegmentLength: 1.5 }).issues[0]?.code).toBe("invalid-option");
  });

  it("normalizes backslash separators for diagnostics", () => {
    const result = validateFilePath("safe\\aux\\file.txt");

    expect(result.normalizedSeparators).toBe("safe/aux/file.txt");
    expect(result.issues[0]).toMatchObject({
      code: "windows-reserved-name",
      segmentIndex: 1,
      segment: "aux",
      start: 5,
      end: 8
    });
  });

  it("keeps vetPath as a short alias", () => {
    expect(vetPath("ok/file.txt")).toEqual(validateFilePath("ok/file.txt"));
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

describe("createFilePathValidator", () => {
  it("reuses default options and allows per-call overrides", () => {
    const uploadPath = createFilePathValidator({
      platform: "portable",
      allowAbsolute: false
    });

    expect(uploadPath.isValid("exports/report.csv")).toBe(true);
    expect(uploadPath.validate("/tmp/report.csv").issues[0]?.code).toBe("absolute-not-allowed");
    expect(uploadPath.assertValid("exports/report.csv")).toBe("exports/report.csv");

    expect(uploadPath.isValid("/tmp/report.csv", { allowAbsolute: true })).toBe(true);
  });
});
