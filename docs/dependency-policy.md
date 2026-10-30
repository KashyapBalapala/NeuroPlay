# Dependency Policy

- New dependencies, version upgrades and pinned CI actions must have been released at least two weeks earlier.
- Security patches may be adopted sooner; say so in the commit message (which advisory or fix it addresses).
- GitHub Actions are pinned to a full commit SHA with the version in a trailing comment.
- Lockfiles (`pnpm-lock.yaml`, `services/api/uv.lock`) are always committed.
