# Plan: Gallery Loop native parity

Two repositories are involved. Unprefixed paths are the free plugin (this repo,
branch `feat/gallery-blocks`, PR 290). Paths prefixed `PRO:` live in the Pro repo
worktree (`visual-portfolio-pro/.claude/worktrees/gallery-blocks`, branch
`feat/gallery-blocks`, PR 62). Each stage ends as one or more commits pushed to
its PR. Dev sites: free http://localhost:8916, Pro http://localhost:8978
(`admin` / `password`), WordPress trunk.

## Stage 0 — fixtures and spikes

- [x] Create demo content on both dev sites with wp-cli: a "Loop Demo" page per
      site holding one loop per layout (grid, masonry, tiles, justified,
      carousel; images source with ~12 uploaded images, item-image
      `clickAction: popup`) plus one posts-source loop. Writes no repo files;
      record the wp-cli commands in this file's Deviations if they differ.
      Check: both pages render all six loops on the front end.
- [x] Spike: can a custom inspector control participate in the native
      `@tablet`/`@mobile` responsive style states (write into
      `style.states['@tablet']` or equivalent)? Timebox half a day, throwaway
      code only. Record the verdict as a checkbox note here; it gates the
      Manual-mode task in stage 2. Check: a written verdict with the API names
      tried.
- [x] Reproduce the Pro lightbox failure on the Pro demo page: confirm whether
      `data-vp-popup` is present in the markup, whether the popup view module
      loads, and capture console/network errors. Record findings for stage 7.
      Check: a written root-cause hypothesis backed by the captured evidence.

**Verify**: open both demo pages, click through every loop; free site lightbox
opens, Pro site failure captured.

## Stage 1 — editor parity (no data-model changes)

- [x] Carousel preview parity: add `vp-carousel-free-scroll` and effect classes
      to the editor wrapper. Writes `gutenberg/blocks/item-template/edit.js`.
      Check: toggling Free scrolling in the editor makes the preview scroll
      without snapping.
- [x] Non-shifting loading state: keep the current list mounted at reduced
      opacity with an absolutely positioned spinner while refetching. Writes
      `gutenberg/blocks/item-template/edit.js`,
      `gutenberg/blocks/item-template/editor.scss`. Check: changing Items per
      page never moves the list.
- [x] Tiles image fill chain: stretch item content to the fixed tile (height
      100%, `object-fit: cover`, focal point as object-position) on the front
      end and through the editor's preview wrapper. Writes
      `gutenberg/blocks/item-template/style.scss`,
      `gutenberg/blocks/item-template/editor.scss`,
      `gutenberg/blocks/item-image/style.scss`. Check: tiles demo shows no
      gaps; editor matches front end.
- [x] Add `masonry-layout` (and its `imagesloaded` peer) to npm dependencies.
      Writes `package.json`, `package-lock.json` only (sequential task — lockfile).
      Check: `npm run build` passes.
- [x] Editor layout engine: a hook that runs fjGallery (from the existing
      `flickr-justified-gallery` dependency) and Masonry inside the canvas for
      justified/masonry, relayouts on items, attributes and resize, and cleans
      up on unmount. Writes `gutenberg/blocks/item-template/use-editor-layout.js`
      (new), `gutenberg/blocks/item-template/edit.js`. Check: in the editor,
      justified shows even rows and masonry packs multiple columns.

**Verify**: `npm run lint && npm run build`; open the free demo page in the
editor, walk all five layouts against the front end. Run
`npm run test:e2e -- item-template` (or the closest existing spec filter).
Commit(s) to PR 290.

## Stage 2 — native data model

- [x] Grid via core grid semantics: Auto (minimum column width) / Manual
      (column count) controls and CSS (`repeat(auto-fill, minmax(...))` in
      Auto). Writes `gutenberg/blocks/item-template/block.json`,
      `gutenberg/blocks/item-template/edit.js`,
      `gutenberg/blocks/item-template/index.php`,
      `gutenberg/blocks/item-template/style.scss`. Check: grid switches
      Auto/Manual in the editor and front end alike.
- [x] Block spacing as the gap: `supports.spacing.blockGap`, map the style
      value onto `--vp-layout-gap` in editor and render; delete `layoutGap`.
      Writes `gutenberg/blocks/item-template/block.json`,
      `gutenberg/blocks/item-template/edit.js`,
      `gutenberg/blocks/item-template/index.php`. Check: Dimensions → Block
      spacing moves all five layouts.
- [x] Auto/Manual for masonry and carousel; tiles keep notation columns;
      remove `layoutColumnsTablet`/`layoutColumnsMobile` and the viewport
      columns CSS/inline-style plumbing. Manual counts clamp on narrow
      viewports; wire native responsive states only if the stage-0 spike
      passed. Writes `gutenberg/blocks/item-template/block.json`,
      `gutenberg/blocks/item-template/edit.js`,
      `gutenberg/blocks/item-template/index.php`,
      `gutenberg/blocks/item-template/view.js`,
      `gutenberg/blocks/item-template/style.scss`. Check: no tablet/mobile
      sliders remain; resizing the front end reflows sensibly in Auto mode.
- [x] Update the 7 existing patterns to the surviving attributes so the branch
      stays green until stage 5 replaces them. Writes
      `gutenberg/patterns/*.php`. Check: inserting each pattern produces no
      invalid-attribute warnings.
- [x] Adjust affected PHP unit tests (columns resolution, render output).
      Writes `tests/phpunit/unit/*.php` as needed. Check:
      `npm run test:unit:php` passes.
- [x] Docs pass one: rewrite the columns/gap contract section. Writes
      `docs/gallery-loop-blocks.md`. Check: no mention of
      `--vp-layout-columns-md/-sm` or `layoutGap` remains.

**Verify**: `npm run lint && npm run test:unit:php && npm run test:e2e`; editor
and front-end walk of all layouts on the demo page. Commit(s) to PR 290.

## Stage 3 — inspector and toolbar

- [x] Item template inspector → ToolsPanel: layout extras (justified controls,
      carousel toggles) become opt-in items with defaults and Reset; standard
      spacing via VStack. Writes `gutenberg/blocks/item-template/edit.js`.
      Check: panel menu shows/hides optional controls, Reset restores defaults.
- [ ] Loop + source panels → ToolsPanel and spacing: General extras, images
      source (Title/Description Source, Order By, Order Direction), posts
      source extras. Writes `gutenberg/blocks/loop/edit.js`,
      `gutenberg/loop-sources/images.js`, `gutenberg/loop-sources/posts.js`.
      Check: no touching controls anywhere; screenshots match the Query Loop
      pattern.
- [~] Toolbars: layout-type switcher on item template; click action control on
      item image; "Edit media" on the loop for the images source. Writes
      `gutenberg/blocks/item-template/edit.js`,
      `gutenberg/blocks/item-image/edit.js`, `gutenberg/blocks/loop/edit.js`,
      `gutenberg/loop-sources/gallery-manager/index.js` (export an openable
      media control if needed). Check: all three appear and work.

**Verify**: `npm run lint && npm run test:e2e`; editor click-through of every
panel and toolbar. Commit(s) to PR 290.

## Stage 4 — carousel v2

- [x] Attribute reshape: `carouselIndicator` (`none|dots|progress`) replaces
      `carouselShowDots`; add `carouselRepeat`, `carouselAutoplay`,
      `carouselAutoplayDelay`, `carouselPeek`, `carouselEdgeFade`; extend
      `carouselEffect` enum with `slideshow`, `cards`. Writes
      `gutenberg/blocks/item-template/block.json`,
      `gutenberg/blocks/item-template/edit.js`. Check: controls render per
      spec (delay only with autoplay on, etc.).
- [x] Nav markup and chrome: hide the scrollbar always; overlay arrows
      left/right (36px, borderless, `rgba(0,0,0,.5)`, white chevron, hover
      `.7`, visible on touch); dots 6px with an 18px active pill and 0.25s
      transition; progress-bar indicator variant; remove the below-carousel
      nav layout. Writes `gutenberg/blocks/item-template/index.php`,
      `gutenberg/blocks/item-template/style.scss`,
      `gutenberg/blocks/item-template/view.js`. Check: front-end carousel
      matches the reference screenshots.
- [x] Focus behavior: no outline on mouse interaction (list and buttons),
      keyboard ring intact. Writes
      `gutenberg/blocks/item-template/style.scss`, and
      `gutenberg/blocks/item-template/view.js` if a focus call needs
      `preventScroll`/removal. Check: clicking arrows/scrollbar area never
      shows the ring; Tab still does.
- [x] Coverflow fix + new effects: correct rotation sign, `translateZ`,
      center-on-top stacking; add slideshow (forces one slide per view) and
      cards recipes behind the existing `@supports` gate. Writes
      `gutenberg/blocks/item-template/style.scss`,
      `gutenberg/blocks/item-template/index.php` (effect classes),
      `gutenberg/blocks/item-template/edit.js` (editor parity). Check: each
      effect previews in editor and front end; Chrome without the feature
      still scrolls plainly.
- [x] Repeat: pass `{ repeat: true }` to Blossom and load it on touch too when
      enabled. Writes `gutenberg/blocks/item-template/view.js`,
      `gutenberg/blocks/item-template/index.php`. Check: desktop and a touch
      emulation loop infinitely.
- [x] Autoplay + peek + edge fade: timer honoring delay, pausing on
      hover/interaction, inert under reduced motion, autoplay progress filling
      the active pill; peek via scroll padding; edge fade via mask. Writes
      `gutenberg/blocks/item-template/view.js`,
      `gutenberg/blocks/item-template/style.scss`,
      `gutenberg/blocks/item-template/index.php`. Check: all three behave per
      spec on the demo page.
- [ ] Unit/e2e adjustments for the new markup and attributes. Writes
      `tests/phpunit/unit/*.php`, `tests/e2e/**` as needed. Check:
      `npm run test:unit:php && npm run test:e2e` pass.

**Verify**: full manual pass of the carousel demo (mouse, keyboard, touch
emulation, reduced motion) + the commands above. Commit(s) to PR 290.

## Stage 5 — wizard and patterns

- [ ] Wizard flow: keep source step; for images render the gallery manager in
      the placeholder; then the native pattern setup modal with live previews
      built from the user's real source attributes, plus Start blank and the
      Filter / Pagination (Paged, Load more, Infinite, None) / Lightbox
      toggles applied to the inserted blocks (defaults read from the chosen
      pattern). Writes `gutenberg/blocks/loop/edit.js`,
      `gutenberg/blocks/loop/pattern-setup.js` (new),
      `gutenberg/loop-sources/style.scss`. Check: full flow works for images
      and posts sources; previews show real content.
- [ ] Replace the pattern set with the 8 approved patterns (delete the 7 old
      files). Writes `gutenberg/patterns/*.php`. Check: chooser lists exactly
      8 visually distinct previews; inserted results are unlocked.
- [ ] Tiles preset swatches: repeat the pattern to fill the swatch, comfortable
      row height, no single-cell previews. Writes
      `gutenberg/blocks/item-template/edit.js`,
      `gutenberg/blocks/item-template/editor.scss`. Check: every preset swatch
      reads as a mosaic.

**Verify**: `npm run lint && npm run test:e2e`; insert a fresh loop end-to-end
for both sources on the free site. Commit(s) to PR 290.

## Stage 6 — media manager v2 and Pro slot

- [x] Port the legacy image-list look to the gallery manager grid (larger
      tiles, hover actions, add tile). Writes
      `gutenberg/loop-sources/gallery-manager/index.js`,
      `gutenberg/loop-sources/gallery-manager/gallery-image.js`,
      `gutenberg/loop-sources/gallery-manager/style.scss`. Check: list matches
      the legacy control visually.
- [x] Port the legacy modal layout: 828px, 233px preview column, two-column
      fields, collapsible Additional, header prev/next, Default/Hover state
      tabs shown only when a hover fill is registered; extend the slot API
      with a state prop. Writes
      `gutenberg/loop-sources/gallery-manager/image-settings-modal.js`,
      `gutenberg/loop-sources/gallery-manager/style.scss`,
      `gutenberg/components/loop-image-settings-slot/index.js`. Check: free
      install shows the new layout without tabs; slot contract documented in
      the component.
- [ ] PRO: slot fills — Hover image + focal point (Hover tab), Custom Popup
      Image, Deep-Linking ID. Writes `PRO: modules/post-hover-thumbnail/...`
      (editor asset + enqueue), `PRO: modules/popup/custom-image/...`,
      `PRO: modules/popup/deep-linking/...`. Check: with Pro active all three
      fields appear in the modal and persist.
- [ ] PRO: hover rendering — write `vp/itemHoverImgId` through
      `vpf_loop_item_context` and swap the item image on hover on the front
      end. Writes `PRO: modules/post-hover-thumbnail/index.php` plus a small
      front-end asset in the same module. Check: hover on a Pro demo item
      swaps the image.
- [ ] PRO: unit-test adjustments. Writes `PRO: tests/phpunit/unit/*.php` as
      needed. Check: Pro `npm run test:unit:php` passes.

**Verify**: free — `npm run lint && npm run test:e2e`; Pro —
`npm run lint && npm run test:unit:php`; manual modal walk on both sites.
Commits to PR 290 (free parts) and PR 62 (PRO parts).

## Stage 7 — Pro lightbox fix

- [ ] Fix the root cause captured in stage 0 (wherever it lands: Pro module,
      popup data filters, or asset path in `core-plugin` consumption). Files
      named by the diagnosis — expected in `PRO: modules/...` or a follow-up
      free commit if the bug is in `gutenberg/popup/`. Check: clicking a
      lightbox item on the Pro demo page opens PhotoSwipe 5.
- [ ] Regression guard: a PHP unit test (or e2e where it fits) pinning the
      trigger data presence with Pro active. Writes
      `PRO: tests/phpunit/unit/test-class-loop-popup.php` (new) or the free
      equivalent. Check: test fails on the pre-fix code, passes after.

**Verify**: Pro demo page lightbox works with keyboard and mouse; free demo
unaffected. Commit to PR 62 (and PR 290 if the fix is shared).

## Where this run stopped

Stages 0, 1 and 2 are complete and verified. Stage 3 is complete except the loop
and source panels and the "Edit media" toolbar. Stage 4 is complete except its
test adjustments and a visual pass over the three effects and the progress
indicator. Stage 5 has not started. Stage 6 is done on the free side and not
started on the Pro side. Stage 7's root cause is fixed in this repo (the vendored
libraries now ship); the Pro submodule was moved onto this branch locally but the
fix has not been confirmed on the Pro site and nothing is committed in the Pro
repository.

Nothing is pushed. The last full check run before the environment went down was
green: `npm run lint` (321 files), `npm run test:unit:php` (255 tests) and
`npm run test:e2e`, all after stage 2; stages 3 and 4 have been linted and built
but their PHP unit run did not finish.

## Deviations

- Stage 0: fixture pages are `Loop Demo` — free page 446 (`http://localhost:8916/loop-demo/`),
  Pro page 37 (`http://localhost:8978/loop-demo/`). The generator lives in the session
  scratchpad (`loop-demo-fixture.php`), run through `wp eval-file`; no repo files.
- Stage 0 found a second, larger bug than the one it looked for: `.gitignore` carried an
  unanchored `vendor` rule, so `assets/vendor/photoswipe-5/` was never committed, and
  `webpack.config.js` never copied Blossom into `assets/vendor/` at all. Both libraries
  404 on the Pro site (which consumes the free plugin as an unbuilt submodule) and Blossom
  404s on the free site too - which is why the carousel showed a scrollbar and had no drag.
  Fixed up front rather than in stage 7, because every later verification depends on it:
  anchored the rule to `/vendor/`, added the Blossom copies, committed both vendor
  directories.
- Stage 1: `masonry-layout` was already resolvable through `isotope-layout`; the task only
  promoted it to a direct dependency. `imagesloaded` is not needed - the editor hook
  relayouts from its own `load` listener.
- Stage 1: the editor no longer runs a masonry script where the browser supports
  `display: grid-lanes`, mirroring the decision the view module makes on the front end.
- Stage 1/2: the measured layouts are stated in `gutenberg/blocks/item-template/layouts.js`
  and run on both sides, replacing fjGallery for the loop family. Two libraries were tried
  first and neither works here: Masonry drops every element handed to it from the frame
  around the canvas (`fizzy-ui-utils` filters on `instanceof HTMLElement`), and fjGallery
  leaves a gallery of natural proportions untouched - on the page as well as in the editor,
  which is a defect the fixture with square images had been hiding. `masonry-layout` was
  added as a dependency and then reverted for the same reason; the front-end masonry keeps
  using the Masonry copy WordPress ships.
- Stage 2 deviates from decision 1 on one point: the block does not adopt core's
  `supports.layout`. The spike (stage 0) confirmed responsive states are closed to custom
  attributes, so adopting it would only help grid - while the layout support is per block,
  not per layout type, and would print `display: grid` container CSS over masonry, tiles,
  justified and the carousel too. The controls, their labels and the CSS they produce are
  core's grid semantics exactly (Auto with a minimum column width, a maximum count and
  fill-available-space; Manual with a count); only the storage is ours. Block spacing is
  native: `supports.spacing.blockGap` renders the Dimensions control, core prints no CSS
  for it without layout support, and the value is mapped onto `--vp-layout-gap`.
