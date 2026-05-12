# Draft report: filepath-validator-kit

## Candidate

- Old signal package: `is-valid-path`
- Current npm version: `0.1.1`
- Last publish: 2015-05-06
- License: MIT
- Repository: `git://github.com/jonschlinkert/is-valid-path.git`
- Draft package: `filepath-validator-kit`

## Score

| Criterion | Score | Notes |
| --- | ---: | --- |
| Usage actuel vérifié | 2/2 | npm page shows about 1.2M weekly downloads and 251 dependents; npm.io showed about 820k weekly downloads. |
| Abandon ou maintenance faible | 2/2 | Latest release is from 2015; only two published versions. |
| Scope livrable en 1 journée | 2/2 | Small pure string validator; no file-system access or parser standard. |
| Douleur utilisateur visible | 2/2 | Boolean-only validation makes UI/API error messages hard; path portability failures are platform-specific. |
| Différenciation non triviale | 2/2 | Returns stable issue codes with segment index/value and explicit `portable` / `posix` / `windows` policies. |

Total: 10/10

## Preuves d'usage

- npm package page for `is-valid-path`: 251 dependents and about 1.2M weekly downloads in the search snapshot.
- npm.io snapshot: about 819k weekly downloads and 100 listed dependents.
- The package is still pulled as a tiny path/glob validation utility despite its age.

## Preuves d'abandon

- `npm view is-valid-path time` reports `0.1.1` published on 2015-05-06.
- The latest dist-tag still points to `0.1.1`.
- The package has no built-in TypeScript declarations and uses an old CommonJS-era surface.

## Concurrents

- `valid-path`: maintained less recently than core leaders, returns richer data, but has a larger and callback-compatible API surface.
- `filename-reserved-regex`: actively maintained, focused on regexes for reserved filename characters rather than full path diagnostics.
- `filenamify`: actively maintained, solves sanitization/conversion rather than validation diagnostics.

## Raison du GO

This is not a clone of `is-valid-path`: the draft targets callers that need explainable validation. The small 0.1 scope is a pure TypeScript validator with no runtime dependencies, stable issue codes, segment positions, and policy profiles.

## Différenciation en 1 journée

`filepath-validator-kit` can show the exact invalid path segment and issue code under a chosen `portable`, `posix`, or `windows` policy, so a CLI or form can explain and fix the path without reverse-engineering a boolean.

## API proposée

- `vetPath(input, options?)`: returns `{ valid, input, normalizedSeparators, issues }`.
- `isValidPath(input, options?)`: boolean shortcut.
- `assertValidPath(input, options?)`: returns input or throws `PathVetError`.
- Exported types for options, result, issues, platform, and issue codes.

## Risques

- OS path rules have edge cases beyond this draft, especially Windows device paths and filesystem-specific limits.
- Users may confuse validation with sanitization or existence checks.
- The package name is available now, but should be rechecked before any publication decision.

## Limites

- No filesystem calls.
- No symlink, permission, normalization, or reserved directory checks.
- No UNC/device path support beyond rejecting obvious Windows-reserved forms.
- No locale-specific messages; issue codes are intended for callers to map themselves.

## Ce qui manque avant publication

- Human review of Windows policy edge cases.
- Decide whether absolute Windows drive paths should be accepted in `portable` mode or always rejected.
- Add benchmark only if performance becomes part of the value proposition.
- Re-run npm name availability and legal/name review.

## Verdict humain recommandé

GO for local review. Publish only if the diagnostics API feels materially better than `valid-path` after a short hands-on comparison.
