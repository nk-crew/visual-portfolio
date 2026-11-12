---
paths:
  - "gutenberg/blocks/loop/**"
  - "gutenberg/blocks/item-*/**"
  - "gutenberg/blocks/loop-*/**"
  - "gutenberg/loop-sources/**"
  - "gutenberg/patterns/**"
  - "classes/class-loop-gallery.php"
  - "classes/class-abilities.php"
---

# Gallery abilities

AI agents build and change Gallery Loops through the abilities in
`classes/class-abilities.php`, which speak the vocabulary in
`classes/class-loop-gallery.php` (layout, source, settings, images). What a user can do
to a loop in the editor, an agent should be able to ask for.

When a change touches what a loop is made of, update the abilities in the same diff:

- A new block attribute on the loop or the item template: map it to a vocabulary field,
  or list it in `ATTRIBUTES` of `tests/phpunit/unit/test-class-abilities-coverage.php`
  with the reason it stays out.
- A new layout type: say whether `settings.columns` applies (`NO_COLUMNS`).
- A new content source in `gutenberg/loop-sources/`: add it to `get_vocabulary()`. When it
  keeps fields in `sourceQuery`, drop the ones it cannot read on a switch to it, in its
  `vpf_gallery_ability_apply` callback (`$before` is the loop before the change).
- A changed setup default in `gutenberg/blocks/loop/layout-defaults.js`: change
  `apply_layout_defaults()` to match, then update the file's hash in the coverage test.
  Two differences are on purpose: leaving the images source sets "every item on one
  page" back to 6, and, without a layout in the same call, adds the paged grid's
  pagination, because an agent sees no notice about a gallery of every post.
- A new pattern for `visual-portfolio/loop` needs nothing: patterns are the layouts.
- A new user-facing capability that is not part of a loop's shape (for example a bulk
  action): consider an ability of its own, in the same category.

Then run `npm run test:unit:php -- --filter 'Abilities|Loop_Gallery'` and
`npm run test:e2e -- tests/e2e/specs/gallery-abilities.spec.js`, and update the
"Abilities for AI agents" section of `docs/gallery-loop-blocks.md`.
