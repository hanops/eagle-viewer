# Project Governance

This document outlines the governance model for Eagle Vault Viewer.

## Maintainers

The project is currently maintained by **hanops** (`opsnote@gmail.com`), who acts as the BDFL (Benevolent Dictator For Life).

## Contribution Process

1. Anyone may submit issues and pull requests.
2. Pull requests are reviewed by a maintainer before merging.
3. Significant feature additions should be discussed in an issue before implementation.

## Release Process

See [`docs/release.md`](docs/release.md) for the technical release workflow. Maintainers handle version bumps, tagging, and publishing Docker images.

## Decision Making

- **Bug fixes**: Reviewed and merged by any maintainer after CI passes.
- **New features**: Require maintainer review and alignment with the product scope (read-only browsing of Eagle libraries).
- **Breaking changes**: Require a maintainer consensus or BDFL decision.

## Code of Conduct

All contributors must abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

---

*This document may be updated by the maintainers to reflect the project's evolving governance.*
