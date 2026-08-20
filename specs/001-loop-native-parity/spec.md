# Gallery Loop blocks: native Gutenberg parity

## Problem

The Gallery Loop family works, but its editing model diverges from native Gutenberg
in ways that will hurt long-term maintenance: custom per-viewport column attributes
instead of the native responsive mechanism, a custom gap attribute instead of Block
Spacing, plain `PanelBody` stacks instead of the `ToolsPanel` pattern Query Loop
uses, and a text-only start wizard instead of the native pattern chooser. Three of
the five layouts render wrong or not at all inside the editor, and the carousel's
front-end chrome (scrollbar, arrows, dots, focus ring) looks unfinished. The Pro
plugin does not yet extend the new per-image settings modal, and its lightbox does
not open at all. Fixing all of this now, before the blocks ship in a release, avoids
migrations later.

## Goals

- Move layout data onto native mechanisms: core grid layout options, `blockGap`,
  native responsive styles.
- Reorganize inspectors to the Query Loop standard: `ToolsPanel` dropdowns,
  correct spacing, toolbar controls where they fit.
- Make every layout render in the editor the way it renders on the front end.
- Rebuild the start wizard around the native pattern chooser with live previews
  and quick toggles.
- Bring the carousel to a modern standard: overlay arrows, pill dots, hidden
  scrollbar, fixed coverflow, new effects (slideshow, cards), repeat, autoplay,
  peek, edge fade, progress indicator.
- Port the polished legacy Media Settings UI (image list + image modal) to the
  loop gallery manager, with Pro extending it through the existing slot.
- Fix the lightbox in the Pro plugin.

## Non-goals

- No deprecations or content migrations: the blocks are experimental and
  unreleased; attributes change hard, only shipped patterns and docs follow.
- No legacy block changes: `visual-portfolio/block`, `visual-portfolio/saved`,
  shortcodes and Saved Layouts stay untouched.
- No flipbook carousel effect, no vertical carousel, no thumbnail-sync navigation.
- No Audio URL / Album Images fields in the loop image modal (their loop-side
  features do not exist yet).
- No new Pro modules beyond: slot fills for the image modal, hover-image
  rendering, and the lightbox fix.

## Behavior

### Layout data model

- The item template's **grid** layout uses the core grid layout options: an
  Auto mode driven by minimum column width and a Manual mode driven by column
  count — same controls, same semantics as `core/group` grid.
- **Masonry** and **carousel** get the same Auto/Manual pair rendered with our
  own controls (min column width → count derived per viewport; manual count
  clamps down on narrow viewports). **Tiles** keep taking columns from the tiles
  notation. **Justified** keeps row-height controls and has no columns.
- Gap everywhere comes from **Block spacing** (`supports.spacing.blockGap`),
  shown in the Dimensions panel. The `layoutGap`, `layoutColumnsTablet` and
  `layoutColumnsMobile` attributes are removed. Defaults: grid/masonry Auto,
  carousel Manual with 3 slides per view.
- Stage 0 spikes whether custom controls can join the native `@tablet`/`@mobile`
  responsive style states; if yes, Manual counts become natively responsive, if
  no, Manual stays a single number with automatic clamping.

### Inspector and toolbar

- Item template, loop and source panels move optional controls into
  `ToolsPanel`/`ToolsPanelItem` (the Query Loop dropdown pattern): required
  controls stay always-visible, everything else is opt-in through the panel
  menu with sane defaults and working Reset.
- Control stacks get the standard 16px vertical rhythm (no touching controls).
- Toolbar additions: layout-type switcher on the item template, click-action
  (None / URL / Lightbox) on the item image, "Edit media" on the loop when the
  source is images.

### Editor parity of layouts

- Justified runs the real fjGallery inside the editor canvas and relayouts on
  item, attribute and size changes.
- Masonry runs the same Masonry engine the front end uses (or native Grid Lanes
  where the browser has it); never a single column.
- Tiles size images correctly: the full chain down to `img` stretches to the
  tile (height 100%, `object-fit: cover`, focal point respected) in both editor
  and front end, including the editor's extra preview wrapper.
- The carousel preview honors free scroll, snap align and effects (the editor
  wrapper carries the same classes as the front end).
- The loading spinner never shifts content: while the preview refetches, the
  current list stays in place at reduced opacity with a small absolute spinner.

### Start wizard

- Step 1: pick a content source (unchanged).
- Step 2 (images source only): the gallery manager renders right in the
  placeholder to add images before anything else.
- Step 3: native pattern setup modal (`BlockPatternSetup`, as Query Loop's
  "Choose") with live previews rendered from the real content, plus
  "Start blank". Quick toggles on this step: Filter (on/off), Pagination
  (Paged / Load more / Infinite / None), Lightbox (on/off) — applied to the
  inserted result. Toggle defaults reflect what the chosen pattern contains.
- Inserted patterns are not locked (exactly the Query Loop mechanic).
- The shipped pattern set becomes: Grid Classic, Grid Overlay, Masonry Clean,
  Masonry Captions, Tiles Mosaic, Justified Photo Wall, Carousel Showcase,
  Posts Cards. Tiles preset previews repeat the pattern to fill the swatch
  (no more single-cell previews) and get comfortable row heights.

### Carousel

- Scrollbar is always hidden (own CSS, independent of Blossom).
- Arrows overlay the slides left/right, vertically centered: 36px round,
  borderless, `rgba(0,0,0,.5)` background, white chevron, hover to `.7`,
  visible on touch as well.
- Indicator is a select: None / Dots / Progress bar. Dots: 6px, translucent
  inactive; active is an 18px pill with a 0.25s transition. With Autoplay on,
  the active pill fills with the autoplay progress.
- Coverflow rotates the correct way (Apple-style: side items face the center),
  with `translateZ` depth and center-on-top stacking.
- New effects: Slideshow (cross-fade, forces one slide per view) and Cards
  (stacked deck). Both scroll-driven, degrade to a plain carousel without
  `animation-timeline` support.
- Repeat (infinite loop) toggle: when on, Blossom loads on touch devices too;
  when off, Blossom stays desktop-only.
- Autoplay: toggle + delay (2–10s, default 5), pauses on hover/interaction,
  disabled under `prefers-reduced-motion`. Peek: 0–200px of the next slide.
  Edge fade: toggle, fixed mask softness.
- No focus ring on mouse interaction anywhere in the carousel; keyboard focus
  stays visible.

### Media Settings (images source)

- The image list gets the legacy gallery-control look: larger tiles, hover
  actions, add tile in the grid.
- The image modal gets the legacy layout: 828px, preview column (233px) on the
  left, fields in a two-column grid, collapsible "Additional" section,
  prev/next in the header, Default/Hover state tabs (tabs appear only when a
  hover-state field is registered).
- Pro fills the existing `VP.LoopImageSettings` slot with: Hover image + focal
  point (Hover tab), Custom Popup Image, Deep-Linking ID. Pro also writes
  `vp/itemHoverImgId` into the item context and the item image renders the
  hover swap on the front end.

### Pro lightbox

- Reproduce on a Pro demo page, find why `data-vp-popup` triggers do not open
  PhotoSwipe there, fix it. Clicking a lightbox-enabled item on the Pro site
  opens the lightbox, not the raw image URL.

### Docs

- `docs/gallery-loop-blocks.md` follows every model change (columns contract,
  gap, new carousel options, wizard).

## Acceptance criteria

1. Grid layout shows the core grid controls (Auto: minimum column width;
   Manual: column count) and no custom tablet/mobile column sliders anywhere in
   the family.
2. Gap is edited via Dimensions → Block spacing for all five layouts; changing
   it moves both editor preview and front end; `layoutGap`,
   `layoutColumnsTablet`, `layoutColumnsMobile` no longer exist in block.json.
3. Masonry and carousel offer Auto (min width) / Manual (count); Manual counts
   clamp on narrow viewports; if the stage-0 spike succeeds, Manual counts are
   editable per viewport through the native responsive states.
4. In the editor: justified lays out in true justified rows; masonry packs into
   multiple columns; tiles show images covering their tiles; carousel scrolls
   freely when Free scrolling is on and previews the selected effect.
5. Changing loop settings never shifts the preview: the old items stay visible
   dimmed with an absolutely positioned spinner.
6. Optional inspector controls sit in ToolsPanel dropdowns (item template
   layout extras; source panels' Title/Description Source, Order; loop
   General extras); every control pair has standard spacing.
7. The item template toolbar switches layout type; the item image toolbar sets
   click action; the loop toolbar opens the media manager for the images
   source.
8. New loop insertion flows: source → (images) add images inline → pattern
   modal with live previews and Filter/Pagination/Lightbox toggles →
   "Start blank" alternative. Inserted result is unlocked.
9. The pattern chooser lists exactly the 8 new patterns and each preview is
   visually distinct; tiles preset swatches repeat their pattern and no preset
   renders as a single cell.
10. Front-end carousel: no visible scrollbar; arrows overlay left/right styled
    per spec; dots/progress indicator matches spec including the
    autoplay-progress pill; no focus outline after mouse clicks; keyboard focus
    ring intact.
11. Coverflow orientation matches the Blossom reference (side slides face
    center, depth visible); Slideshow and Cards effects selectable and working
    in supporting browsers; unsupported browsers get a plain working carousel.
12. Repeat loops infinitely on desktop and touch when enabled; autoplay
    advances with the configured delay, pauses on interaction, and is inert
    under reduced motion; peek and edge fade render per spec.
13. The images list and image modal match the legacy layout (two-column modal,
    preview column, collapsible section, prev/next, state tabs); with Pro
    active the Hover tab edits hover image + focal point, and Popup fields
    (Custom Popup Image, Deep-Linking ID) appear; hover image actually swaps
    on the front end.
14. On the Pro test site, clicking a lightbox item opens PhotoSwipe 5.
15. `npm run lint`, `npm run test:unit:php` and `npm run test:e2e` pass in the
    free repo; `npm run lint` and `npm run test:unit:php` pass in Pro.
16. `docs/gallery-loop-blocks.md` describes the new model (no stale mention of
    `--vp-layout-columns-md/-sm`, `layoutGap` or the old wizard).

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Grid → core layout support; blockGap everywhere; masonry/carousel → Auto/Manual pair; per-viewport column attributes removed; responsive-states spike in stage 0 | Native semantics, no homemade breakpoint controls; nothing consumes the old CSS-var contract |
| 2 | Everything lands in PR 290 / PR 62 as separate commits | Owner's release-flow call |
| 3 | Hard attribute changes, no deprecations or migrations | Experimental, unreleased blocks |
| 4 | Wizard: source → inline gallery manager (images) → native pattern modal + quick toggles (Filter / Pagination select / Lightbox) | Live previews need content chosen first |
| 5 | No pattern locking — exact Query Loop mechanic | Chosen over contentOnly lock in round 2 of brainstorm |
| 6 | Pattern set of 8, visually distinct, no pagination-only variants | Users pick a gallery by look |
| 7 | Carousel chrome: hidden scrollbar, 36px borderless overlay arrows, 6/18px pill dots; "nav below" variant removed | Matches provided reference screenshots |
| 8 | Effects: fix coverflow, add slideshow and cards; skip flipbook | Flipbook is niche |
| 9 | Repeat on → Blossom loads on touch too; off → desktop-only as today | Infinite must work everywhere |
| 10 | Autoplay (delay 2–10s, default 5) + peek (0–200px) + edge fade; indicator select None/Dots/Progress; autoplay progress fills the active dot pill | User-picked set |
| 11 | Image modal and list ported from the legacy gallery-control layout; Pro slot work ships in the same wave | The legacy UI is the already-designed reference |
| 12 | All three toolbar additions (layout switcher, click action, edit media) | User approved all |
| 13 | Defaults: grid/masonry Auto, carousel Manual 3; arrows visible on touch; dots on in Carousel Showcase | Round-2 confirmation |
| 14 | Pro slot scope: hover image + focal, Custom Popup Image, Deep-Linking ID, plus front-end hover rendering; Audio/Albums out | A stored field nothing renders is dead weight |
