# Contributing

Thanks for taking the time to improve this package.

## Local setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Pull requests

Please keep changes focused and include tests for behavior changes. Small API improvements are welcome when they keep path validation predictable, typed, and easy to use in both Node and browser-oriented tooling.

Before opening a pull request, run:

```bash
npm run typecheck
npm test
npm run build
```

## Issues

When reporting a bug, include:

- the package version;
- the path input that failed;
- the options used;
- the expected diagnostic or result;
- the actual diagnostic code or result.

This package validates path strings only. Please keep feature requests focused on diagnostics and policy checks rather than filesystem access, sanitization, or path resolution.
