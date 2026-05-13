# Security Policy

## Reporting a Vulnerability

If you find a security issue, please report it privately when GitHub security advisories are available for this repository. If private advisories are not available, open a minimal issue that describes the affected package and version without publishing exploit details.

Please include:

- the affected package and version;
- the smallest input or scenario needed to understand the issue;
- the validation options used;
- the impact you believe it has;
- whether the issue affects Node, browsers, or both.

This package does not touch the filesystem, but misleading validation can still matter in upload forms, archive builders, config editors, or CLI tools. Reports about denial-of-service behavior or incorrect acceptance of unsafe path strings are welcome.
