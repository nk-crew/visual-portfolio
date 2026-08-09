@AGENTS.md

## Claude Code

- Common commands (`npm run *`, `composer`, `wp-env`, read-only `git`) are pre-approved
  in `.claude/settings.json`. Anything outside that list will prompt — prefer the
  approved script over an ad-hoc shell equivalent.
- Path-scoped conventions live in `.claude/rules/` and load automatically when you open
  files they cover. Do not restate them here.
- Use plan mode for version bumps, release packaging, and changes that touch the
  public REST or filter surface.
