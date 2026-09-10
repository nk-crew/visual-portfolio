---
paths:
  - "gutenberg/**/*.{js,jsx,scss,json}"
  - "assets/**/*.{js,jsx,scss}"
---

# Editor and front-end sources

- These directories are the source of truth. `build/` is webpack output — never edit it,
  and never cite it as evidence that a change landed.
- Blocks live in `gutenberg/blocks/<name>/`; shared UI in `gutenberg/components/`.
- Before writing a setting of your own, look at how Gutenberg does that setting. A
  `block.json` support (colour, typography, spacing, borders, alignment) or a control
  the editor already ships needs no code from us, sits where a user looks for it and
  follows the editor as it changes. Write a custom one only when nothing in core fits,
  and say in the code what was missing.
- Import WordPress packages from `@wordpress/*`, not from globals.
- Wrap user-facing strings in `__()` / `_x()` with the `visual-portfolio` text domain.
- SCSS follows the stylelint config; check with `npm run lint:css` and fix with
  `npm run format:css`.

Run `npm run lint` before finishing. For anything visual, `npm run play` boots the plugin
in seconds and is usually enough to eyeball a change.
