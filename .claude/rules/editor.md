---
paths:
  - "gutenberg/**/*.{js,jsx,scss}"
  - "assets/**/*.{js,jsx,scss}"
---

# Editor and front-end sources

- These directories are the source of truth. `build/` is webpack output — never edit it,
  and never cite it as evidence that a change landed.
- Blocks live in `gutenberg/blocks/<name>/`; shared UI in `gutenberg/components/`.
- Import WordPress packages from `@wordpress/*`, not from globals.
- Wrap user-facing strings in `__()` / `_x()` with the `visual-portfolio` text domain.
- SCSS follows the stylelint config; check with `npm run lint:css` and fix with
  `npm run format:css`.

Run `npm run lint` before finishing. For anything visual, `npm run play` boots the plugin
in seconds and is usually enough to eyeball a change.
