export type PathVetPlatform = "portable" | "posix" | "windows";

export type PathVetIssueCode =
  | "empty-input"
  | "not-a-string"
  | "invalid-option"
  | "absolute-not-allowed"
  | "relative-not-allowed"
  | "traversal-not-allowed"
  | "empty-segment"
  | "segment-too-long"
  | "path-too-long"
  | "nul-byte"
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

export type FilePathValidationOptions = PathVetOptions;

export interface FilePathValidator {
  validate(input: unknown, options?: FilePathValidationOptions): FilePathValidationResult;
  isValid(input: unknown, options?: FilePathValidationOptions): boolean;
  assertValid(input: unknown, options?: FilePathValidationOptions): string;
}

export interface PathVetIssue {
  code: PathVetIssueCode;
  message: string;
  segmentIndex?: number;
  segment?: string;
  start?: number;
  end?: number;
}

export type FilePathValidationIssue = PathVetIssue;

export interface PathVetSegment {
  value: string;
  index: number;
  start: number;
  end: number;
}

export type FilePathSegment = PathVetSegment;

export interface PathVetResult {
  valid: boolean;
  input: unknown;
  normalizedSeparators: string;
  absolute: boolean;
  segments: PathVetSegment[];
  issues: PathVetIssue[];
}

export type FilePathValidationResult = PathVetResult;

const WINDOWS_RESERVED_CHARACTERS = /[<>:"|?*\u0000-\u001F]/u;
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;

export class PathVetError extends Error {
  readonly result: FilePathValidationResult;

  constructor(result: FilePathValidationResult) {
    super(formatFirstIssue(result));
    this.name = "PathVetError";
    this.result = result;
  }
}

export function vetPath(input: unknown, options: PathVetOptions = {}): PathVetResult {
  return validateFilePath(input, options);
}

export function validateFilePath(
  input: unknown,
  options: FilePathValidationOptions = {}
): FilePathValidationResult {
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
      absolute: false,
      segments: [],
      issues: [
        {
          code: "not-a-string",
          message: "Path must be a string."
        }
      ]
    };
  }

  const normalizedSeparators = input.replace(/\\/gu, "/");
  const absolute = isAbsolutePath(input, normalizedSeparators);
  const rawSegments = splitPathSegments(normalizedSeparators);
  const firstMeaningfulIndex = absolute ? firstSegmentIndexAfterRoot(rawSegments) : 0;
  const segments = rawSegments.filter((segment) => segment.index >= firstMeaningfulIndex);

  if (input.length === 0) {
    issues.push({
      code: "empty-input",
      message: "Path must not be empty."
    });
  }

  if (!isPathVetPlatform(platform)) {
    issues.push({
      code: "invalid-option",
      message: `Unsupported platform option: ${String(platform)}.`
    });
  }

  if (options.maxLength !== undefined && !isNonNegativeInteger(options.maxLength)) {
    issues.push({
      code: "invalid-option",
      message: "maxLength must be a non-negative integer."
    });
  }

  if (options.maxSegmentLength !== undefined && !isNonNegativeInteger(options.maxSegmentLength)) {
    issues.push({
      code: "invalid-option",
      message: "maxSegmentLength must be a non-negative integer."
    });
  }

  if (
    options.maxLength !== undefined &&
    isNonNegativeInteger(options.maxLength) &&
    input.length > options.maxLength
  ) {
    issues.push({
      code: "path-too-long",
      message: `Path is longer than ${options.maxLength} characters.`
    });
  }

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

  if (isPathVetPlatform(platform)) {
    for (const segment of segments) {
      if (absolute && isRootOnlyEmptySegment(segment, rawSegments, firstMeaningfulIndex)) {
        continue;
      }

      const segmentInput: ValidateSegmentInput = {
        segment,
        platform,
        allowTraversal,
        allowEmptySegments,
        issues
      };

      if (options.maxSegmentLength !== undefined && isNonNegativeInteger(options.maxSegmentLength)) {
        segmentInput.maxSegmentLength = options.maxSegmentLength;
      }

      validateSegment(segmentInput);
    }
  }

  return {
    valid: issues.length === 0,
    input,
    normalizedSeparators,
    absolute,
    segments,
    issues
  };
}

export function isValidPath(input: unknown, options?: FilePathValidationOptions): boolean {
  return validateFilePath(input, options).valid;
}

export function assertValidPath(input: unknown, options?: FilePathValidationOptions): string {
  const result = validateFilePath(input, options);

  if (!result.valid) {
    throw new PathVetError(result);
  }

  return input as string;
}

export function createFilePathValidator(defaultOptions: FilePathValidationOptions = {}): FilePathValidator {
  return {
    validate(input, options) {
      return validateFilePath(input, mergeOptions(defaultOptions, options));
    },
    isValid(input, options) {
      return isValidPath(input, mergeOptions(defaultOptions, options));
    },
    assertValid(input, options) {
      return assertValidPath(input, mergeOptions(defaultOptions, options));
    }
  };
}

interface ValidateSegmentInput {
  segment: PathVetSegment;
  platform: PathVetPlatform;
  allowTraversal: boolean;
  allowEmptySegments: boolean;
  maxSegmentLength?: number;
  issues: PathVetIssue[];
}

function validateSegment(input: ValidateSegmentInput): void {
  const { segment, platform, allowTraversal, allowEmptySegments, maxSegmentLength, issues } = input;

  if (segment.value.length === 0) {
    if (!allowEmptySegments) {
      issues.push(segmentIssue("empty-segment", "Path contains an empty segment.", segment));
    }

    return;
  }

  if (!allowTraversal && (segment.value === "." || segment.value === "..")) {
    issues.push(segmentIssue("traversal-not-allowed", "Traversal segments are not allowed.", segment));
  }

  if (allowTraversal && (segment.value === "." || segment.value === "..")) {
    return;
  }

  if (maxSegmentLength !== undefined && segment.value.length > maxSegmentLength) {
    issues.push(segmentIssue("segment-too-long", `Path segment is longer than ${maxSegmentLength} characters.`, segment));
  }

  if (segment.value.includes("\u0000")) {
    issues.push(segmentIssue("nul-byte", "Path segment contains a NUL byte.", segment));
  }

  if (platform === "windows" || platform === "portable") {
    validateWindowsSegment(segment, issues);
  }
}

function validateWindowsSegment(segment: PathVetSegment, issues: PathVetIssue[]): void {
  if (WINDOWS_RESERVED_CHARACTERS.test(segment.value)) {
    issues.push(segmentIssue("windows-reserved-character", "Path segment contains a Windows-reserved character.", segment));
  }

  if (WINDOWS_RESERVED_NAMES.test(segment.value)) {
    issues.push(segmentIssue("windows-reserved-name", "Path segment is a Windows-reserved device name.", segment));
  }

  if (/[. ]$/u.test(segment.value)) {
    issues.push(segmentIssue("windows-trailing-dot-or-space", "Windows path segments must not end with a dot or a space.", segment));
  }
}

function isAbsolutePath(original: string, normalized: string): boolean {
  return normalized.startsWith("/") || /^[a-z]:[\\/]/iu.test(original);
}

function splitPathSegments(normalizedPath: string): PathVetSegment[] {
  const values = normalizedPath.split("/");
  let cursor = 0;

  return values.map((value, index) => {
    const start = cursor;
    const end = start + value.length;
    cursor = end + 1;
    return { value, index, start, end };
  });
}

function firstSegmentIndexAfterRoot(segments: PathVetSegment[]): number {
  if (segments[0]?.value === "" && segments[1]?.value === "") {
    return 2;
  }

  if (segments[0]?.value === "") {
    return 1;
  }

  if (/^[a-z]:$/iu.test(segments[0]?.value ?? "")) {
    return 1;
  }

  return 0;
}

function isRootOnlyEmptySegment(
  segment: PathVetSegment,
  rawSegments: PathVetSegment[],
  firstMeaningfulIndex: number
): boolean {
  return (
    segment.index === firstMeaningfulIndex &&
    segment.value === "" &&
    rawSegments.length === firstMeaningfulIndex + 1
  );
}

function isPathVetPlatform(value: string): value is PathVetPlatform {
  return value === "portable" || value === "posix" || value === "windows";
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function mergeOptions(
  defaultOptions: FilePathValidationOptions,
  options: FilePathValidationOptions | undefined
): FilePathValidationOptions {
  return options === undefined ? { ...defaultOptions } : { ...defaultOptions, ...options };
}

function segmentIssue(code: PathVetIssueCode, message: string, segment: PathVetSegment): PathVetIssue {
  return {
    code,
    message,
    segmentIndex: segment.index,
    segment: segment.value,
    start: segment.start,
    end: segment.end
  };
}

function formatFirstIssue(result: PathVetResult): string {
  const firstIssue = result.issues[0];

  if (!firstIssue) {
    return "Invalid path.";
  }

  return firstIssue.segment === undefined
    ? firstIssue.message
    : `${firstIssue.message} Segment ${firstIssue.segmentIndex}: ${JSON.stringify(firstIssue.segment)}.`;
}
