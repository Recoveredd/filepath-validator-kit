# filepath-validator-kit

Validate file paths with explicit platform policies and structured diagnostics.

```ts
import { isValidPath, vetPath } from "filepath-validator-kit";

isValidPath("notes/2026-05-12.txt");
// true

const result = vetPath("reports/con.txt", { platform: "portable" });

if (!result.valid) {
  console.log(result.issues[0]?.code);
  // "windows-reserved-name"
}
```

## Why

Some path checks only return `true` or `false`. `filepath-validator-kit` is for validation flows that need to explain what failed, which segment failed, and whether the policy is POSIX, Windows, or portable across both.

## API

### `vetPath(input, options?)`

Returns a `PathVetResult`.

```ts
const result = vetPath("assets/logo?.svg", {
  platform: "windows",
  allowAbsolute: false,
  allowTraversal: false
});
```

Options:

- `platform`: `"portable"` by default, or `"posix"` / `"windows"`.
- `allowAbsolute`: defaults to `true`.
- `allowRelative`: defaults to `true`.
- `allowTraversal`: allows `.` and `..` segments when `true`; defaults to `false`.
- `allowEmptySegments`: allows repeated separators when `true`; defaults to `false`.
- `maxLength`: optional full path length limit.
- `maxSegmentLength`: optional per-segment length limit.

### `isValidPath(input, options?)`

Boolean shortcut for `vetPath(input, options).valid`.

### `assertValidPath(input, options?)`

Returns the input string or throws `PathVetError`.

## Notes

This library validates path strings only. It does not touch the file system, resolve symlinks, check permissions, or guarantee that an operating system will accept a path in every context.
