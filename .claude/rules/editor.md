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
- A custom setting that stands in for one of the editor's own — a width, an alignment,
  a spacing, a colour — takes its values from the theme the way the editor does, since
  a theme declares them and changes them. Read them with `useSettings()` (`theme.json`,
  plus any block-level `settings` a parent carries), never as numbers of our own; offer
  only what the theme declares, the way core drops *Wide width* on a theme with no wide
  size; and say what a value comes to where core says it (`Max 640px wide`). On the
  page, resolve the same values through the properties the theme already prints —
  `--wp--style--global--content-size`, `--wp--preset--spacing--*` and the like — so a
  theme that changes them changes the block with it.
- Import WordPress packages from `@wordpress/*`, not from globals.
- Wrap user-facing strings in `__()` / `_x()` with the `visual-portfolio` text domain.
- SCSS follows the stylelint config; check with `npm run lint:css` and fix with
  `npm run format:css`.

Run `npm run lint` before finishing. For anything visual, `npm run play` boots the plugin
in seconds and is usually enough to eyeball a change.
