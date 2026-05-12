export type PathVetPlatform = "portable" | "posix" | "windows";

export type PathVetIssueCode =
  | "empty-input"
  | "not-a-string"
  | "absolute-not-allowed"
  | "relative-not-allowed"
  | "traversal-not-allowed"
  | "empty-segment"
  | "segment-too-long"
  | "path-too-long"
  | "nul-byte"
  | "posix-reserved-character"
  | "windows-reserved-character"
  | "windows-reserved-name"
  | "windows-trailing-dot-or-space";

export interface PathVetOptions {
  platform?: PathVetPlatform;
  allowAbsolute?: boolean;
  allowRelative?: boolean;
  allowTraversal?: boolean;
  allowEmptySegments?: boolean;
  maxLength?: number;
  maxSegmentLength?: number;
}

export interface PathVetIssue {
  code: PathVetIssueCode;
  message: string;
  index?: number;
  segment?: string;
}

export interface PathVetResult {
  valid: boolean;
  input: unknown;
  normalizedSeparators: string;
  issues: PathVetIssue[];
}

const WINDOWS_RESERVED_CHARACTERS = /[<>:"|?*\u0000-\u001F]/u;
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;

export class PathVetError extends Error {
  readonly result: PathVetResult;

  constructor(result: PathVetResult) {
    super(formatFirstIssue(result));
    this.name = "PathVetError";
    this.result = result;
  }
}

export function vetPath(input: unknown, options: PathVetOptions = {}): PathVetResult {
  const platform = options.platform ?? "portable";
  const allowAbsolute = options.allowAbsolute ?? true;
  const allowRelative = options.allowRelative ?? true;
  const allowTraversal = options.allowTraversal ?? false;
  const allowEmptySegments = options.allowEmptySegments ?? false;
  const issues: PathVetIssue[] = [];

  if (typeof input !== "string") {
    return {
      valid: false,
      input,
      normalizedSeparators: "",
      issues: [
        {
          code: "not-a-string",
          message: "Path must be a string."
        }
      ]
    };
  }

  const normalizedSeparators = input.replace(/\\/gu, "/");

  if (input.length === 0) {
    issues.push({
      code: "empty-input",
      message: "Path must not be empty."
    });
  }

  if (options.maxLength !== undefined && input.length > options.maxLength) {
    issues.push({
      code: "path-too-long",
      message: `Path is longer than ${options.maxLength} characters.`
    });
  }

  const absolute = isAbsolutePath(input, normalizedSeparators);

  if (absolute && !allowAbsolute) {
    issues.push({
      code: "absolute-not-allowed",
      message: "Absolute paths are not allowed."
    });
  }

  if (!absolute && !allowRelative && input.length > 0) {
    issues.push({
      code: "relative-not-allowed",
      message: "Relative paths are not allowed."
    });
  }

  const segments = normalizedSeparators.split("/");
  const firstMeaningfulIndex = absolute ? firstSegmentIndexAfterRoot(segments) : 0;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const isRootMarker = index < firstMeaningfulIndex;

    if (isRootMarker) {
      continue;
    }

    const segmentInput: ValidateSegmentInput = {
      segment,
      index,
      platform,
      allowTraversal,
      allowEmptySegments,
      issues
    };

    if (options.maxSegmentLength !== undefined) {
      segmentInput.maxSegmentLength = options.maxSegmentLength;
    }

    validateSegment(segmentInput);
  }

  return {
    valid: issues.length === 0,
    input,
    normalizedSeparators,
    issues
  };
}

export function isValidPath(input: unknown, options?: PathVetOptions): boolean {
  return vetPath(input, options).valid;
}

export function assertValidPath(input: unknown, options?: PathVetOptions): string {
  const result = vetPath(input, options);

  if (!result.valid) {
    throw new PathVetError(result);
  }

  return input as string;
}

interface ValidateSegmentInput {
  segment: string;
  index: number;
  platform: PathVetPlatform;
  allowTraversal: boolean;
  allowEmptySegments: boolean;
  maxSegmentLength?: number;
  issues: PathVetIssue[];
}

function validateSegment(input: ValidateSegmentInput): void {
  const { segment, index, platform, allowTraversal, allowEmptySegments, maxSegmentLength, issues } = input;

  if (segment.length === 0) {
    if (!allowEmptySegments) {
      issues.push({
        code: "empty-segment",
        message: "Path contains an empty segment.",
        index,
        segment
      });
    }

    return;
  }

  if (!allowTraversal && (segment === "." || segment === "..")) {
    issues.push({
      code: "traversal-not-allowed",
      message: "Traversal segments are not allowed.",
      index,
      segment
    });
  }

  if (allowTraversal && (segment === "." || segment === "..")) {
    return;
  }

  if (maxSegmentLength !== undefined && segment.length > maxSegmentLength) {
    issues.push({
      code: "segment-too-long",
      message: `Path segment is longer than ${maxSegmentLength} characters.`,
      index,
      segment
    });
  }

  if (segment.includes("\u0000")) {
    issues.push({
      code: "nul-byte",
      message: "Path segment contains a NUL byte.",
      index,
      segment
    });
  }

  if ((platform === "posix" || platform === "portable") && segment.includes("/")) {
    issues.push({
      code: "posix-reserved-character",
      message: "Path segment contains a POSIX path separator.",
      index,
      segment
    });
  }

  if (platform === "windows" || platform === "portable") {
    validateWindowsSegment(segment, index, issues);
  }
}

function validateWindowsSegment(segment: string, index: number, issues: PathVetIssue[]): void {
  if (WINDOWS_RESERVED_CHARACTERS.test(segment)) {
    issues.push({
      code: "windows-reserved-character",
      message: "Path segment contains a Windows-reserved character.",
      index,
      segment
    });
  }

  if (WINDOWS_RESERVED_NAMES.test(segment)) {
    issues.push({
      code: "windows-reserved-name",
      message: "Path segment is a Windows-reserved device name.",
      index,
      segment
    });
  }

  if (/[. ]$/u.test(segment)) {
    issues.push({
      code: "windows-trailing-dot-or-space",
      message: "Windows path segments must not end with a dot or a space.",
      index,
      segment
    });
  }
}

function isAbsolutePath(original: string, normalized: string): boolean {
  return normalized.startsWith("/") || /^[a-z]:[\\/]/iu.test(original);
}

function firstSegmentIndexAfterRoot(segments: string[]): number {
  if (segments[0] === "" && segments[1] === "") {
    return 2;
  }

  if (segments[0] === "") {
    return 1;
  }

  if (/^[a-z]:$/iu.test(segments[0] ?? "")) {
    return 1;
  }

  return 0;
}

function formatFirstIssue(result: PathVetResult): string {
  const firstIssue = result.issues[0];

  if (!firstIssue) {
    return "Invalid path.";
  }

  return firstIssue.segment === undefined
    ? firstIssue.message
    : `${firstIssue.message} Segment ${firstIssue.index}: ${JSON.stringify(firstIssue.segment)}.`;
}
