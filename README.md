# filepath-validator-kit

[![npm version](https://img.shields.io/npm/v/filepath-validator-kit.svg)](https://www.npmjs.com/package/filepath-validator-kit)
[![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![CI](https://github.com/Recoveredd/filepath-validator-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Recoveredd/filepath-validator-kit/actions/workflows/ci.yml)

Validate file path strings with explicit portable, POSIX or Windows policies and structured diagnostics.

`filepath-validator-kit` is a small clean-room toolkit for forms, config editors, archive builders and CLIs that need to explain why a user-provided path is unsafe or unsupported. It validates strings only: no filesystem access, no path resolution, no symlink checks and no mutation of user input.

Links: [npm](https://www.npmjs.com/package/filepath-validator-kit) · [GitHub](https://github.com/Recoveredd/filepath-validator-kit)

## Package quality

- TypeScript types are generated from the source.
- ESM-only package with no runtime dependencies.
- Marked as side-effect free for bundlers.
- Browser-friendly implementation with no Node-only APIs.
- CI runs `npm ci`, `typecheck`, `build`, and `test`.
- Tested on Node.js 20 and 22 with GitHub Actions.

## Install

```bash
npm install filepath-validator-kit
```

## Quick Start

```ts
import { assertValidPath, isValidPath, validateFilePath } from "filepath-validator-kit";

isValidPath("notes/2026-05-12.txt");
// true

const result = validateFilePath("reports/con.txt", { platform: "portable" });

if (!result.valid) {
  result.issues[0]?.code;
  // "windows-reserved-name"

  result.issues[0]?.segment;
  // "con.txt"
}

assertValidPath("exports/report.csv");
// "exports/report.csv"
```

## Why this package

Some path validators only answer `true` or `false`. That is hard to use in product UI, imports, config files and command-line tools because the caller still has to explain what went wrong.

`filepath-validator-kit` returns stable issue codes, source offsets and the failing path segment:

```ts
const result = validateFilePath("safe//con.txt", { platform: "portable" });

result.issues;
// [
//   {
//     code: "empty-segment",
//     message: "Path contains an empty segment.",
//     segmentIndex: 1,
//     segment: "",
//     start: 5,
//     end: 5
//   },
//   {
//     code: "windows-reserved-name",
//     message: "Path segment is a Windows-reserved device name.",
//     segmentIndex: 2,
//     segment: "con.txt",
//     start: 6,
//     end: 13
//   }
// ]
```

## API

### `validateFilePath(input, options?)`

Returns a `FilePathValidationResult` with the original input, normalized separators, absolute-path metadata, parsed segments and structured issues.

```ts
type FilePathValidationResult = {
  valid: boolean;
  input: unknown;
  normalizedSeparators: string;
  absolute: boolean;
  segments: FilePathSegment[];
  issues: FilePathValidationIssue[];
};
```

Example:

```ts
const result = validateFilePath("assets/logo?.svg", {
  platform: "windows",
  allowAbsolute: false,
  allowTraversal: false
});
```

### `vetPath(input, options?)`

Short alias for `validateFilePath(input, options)`. It is useful when you prefer compact names, but `validateFilePath` is the clearest default in application code.

### `isValidPath(input, options?)`

Boolean shortcut for `validateFilePath(input, options).valid`.

```ts
isValidPath("assets/logo.svg", { platform: "portable" });
// true
```

### `assertValidPath(input, options?)`

Returns the input string when it is valid or throws `PathVetError` with the full validation result attached.

```ts
try {
  assertValidPath("reports/con.txt", { platform: "portable" });
} catch (error) {
  if (error instanceof PathVetError) {
    console.log(error.result.issues);
  }
}
```

### Types

The package exports the descriptive `FilePath*` type names used by the main API:

- `FilePathValidationOptions`
- `FilePathValidationResult`
- `FilePathValidationIssue`
- `FilePathSegment`

The shorter `PathVet*` type names are also exported for users who prefer the compact alias.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `platform` | `"portable"` | Validation policy: `"portable"`, `"posix"` or `"windows"`. |
| `allowAbsolute` | `true` | Reject absolute paths when set to `false`. |
| `allowRelative` | `true` | Reject relative paths when set to `false`. |
| `allowTraversal` | `false` | Allow `.` and `..` segments. |
| `allowEmptySegments` | `false` | Allow repeated separators such as `safe//file.txt`. |
| `maxLength` | none | Optional full path length limit. |
| `maxSegmentLength` | none | Optional per-segment length limit. |

## Policies

- `portable`: rejects Windows-reserved characters, Windows device names and Windows trailing dots/spaces.
- `windows`: applies Windows segment restrictions.
- `posix`: accepts characters such as `?` and `:` because they are not path separators under POSIX.

Root-only absolute paths such as `/` and `C:\\` are accepted when absolute paths are allowed.

## Diagnostics

Issue codes are stable and intended for UI messages, logs or localization:

- `empty-input`
- `not-a-string`
- `invalid-option`
- `absolute-not-allowed`
- `relative-not-allowed`
- `traversal-not-allowed`
- `empty-segment`
- `segment-too-long`
- `path-too-long`
- `nul-byte`
- `windows-reserved-character`
- `windows-reserved-name`
- `windows-trailing-dot-or-space`

## Limits

This package validates path strings only. It does not:

- check whether a file exists;
- normalize or resolve paths;
- inspect permissions;
- resolve symlinks;
- sanitize filenames;
- guarantee that every filesystem, archive format or host application will accept the path.

Use it as an explainable first-pass validation layer before application-specific checks.

## License

MPL-2.0
