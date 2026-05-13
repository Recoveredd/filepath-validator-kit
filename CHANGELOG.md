# Changelog

## 0.1.0

- Initial clean-room implementation.
- Add portable, POSIX, and Windows path validation policies.
- Expose `validateFilePath` as the clear primary API and `vetPath` as a compact alias.
- Return structured diagnostics, segment spans, and absolute path metadata instead of a bare boolean.
