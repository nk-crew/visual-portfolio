# Gallery Loop feature migration

This is a working list of what the legacy gallery still does that the Gallery Loop
blocks cannot, so the remaining work can be picked up deliberately rather than
discovered one bug report at a time. Every claim below was read out of the code;
paths without a prefix are relative to this repository, paths marked **Pro** are
relative to the Pro repository root.

A good deal has already crossed, and the list is worth having in one place so
nobody ports it twice. The social and taxonomy content sources both work on the
loop, through Pro bridges that register against the free source registry
(Pro `modules/socials/loop-source/index.php:25`,
Pro `modules/taxonomies/loop-source/index.php:25`,
`gutenberg/loop-sources/registry.js:41`). The Authors, publish-date, sticky and
no-thumbnail query filters all reach the loop's Filters panel through
`vpf.loopPostsFilterItems` (`gutenberg/loop-sources/posts.js:457`), each
implemented in Pro under `modules/query-settings/`. The item image carries a
per-block watermark switch, added by Pro at
`modules/watermarks/settings/assets/editor/loop-item-image.js:42` and rendered
from `modules/watermarks/watermark/index.php:69`. The infinite scroll settings
are stamped onto the pagination block by Pro
(`modules/pagination-infinite/index.php:38`) and read by the loop's own view
script (`gutenberg/blocks/loop/view.js:634`). Password and age protection work
end to end through `vpf_loop_custom_output`
(`gutenberg/blocks/item-template/index.php:752`, Pro
`modules/block-protection/index.php:68`). Hover images work end to end through
`vpf_loop_item_context` (Pro `modules/post-hover-thumbnail/index.php:38`, rendered
at `:39`). And the loop image modal already offers the custom popup image and
deep-link fields, filled by Pro into the free slot
(`gutenberg/components/loop-image-settings-slot/index.js:68`, Pro
`modules/popup/custom-image/assets/editor/loop-image-settings.js:16`, Pro
`modules/popup/deep-linking/assets/editor/loop-image-settings.js:13`).

Three of those are worth an asterisk. The per-block watermark covers the grid
picture and not the lightbox one, as Pro's own comment says
(`modules/watermarks/watermark/index.php:428-429`). The taxonomy source works but
the Gallery Filter block cannot list its terms — only the social bridge registers
`vpf_rest_filter_items_source_configs`
(Pro `modules/socials/loop-source/index.php:41`, consumed at
`classes/class-rest.php:217`). And the two image-modal fields are an
editor half without a render half: nothing reads them when the lightbox is built,
which is section 2 below.

The sections that follow are the features that have not made the crossing. Each
one says what it does for a user, where it lives today, the exact reason it stops
at the legacy renderer, and what would have to exist on the new side.

## The shape of the gap

Almost every section below has the same root cause, so it is worth stating once.
`Visual_Portfolio_Get` resolves a query in one place and then exits through two
doors. The legacy door is `each_item()` (`classes/class-get-portfolio.php:2936`),
called only from `classes/class-get-portfolio.php:1294`, which renders templates
and fires the per-item template hooks. The loop door is `get_loop_items()`
(`classes/class-get-portfolio.php:1087`), which returns item data and renders
nothing.

Both doors share `resolve_query()` and `build_items()`, so Pro filters that shape
the **query** or the **item data** keep working for loops untouched. Everything
that hangs off `each_item()`, off the legacy wrapper, or off the legacy asset
enqueue does not. The loop's own extension points are
`vpf_loop_item_context` (`gutenberg/blocks/item-template/index.php:253`) for data,
`vpf_loop_item_popup_data` (`gutenberg/popup/index.php:140`) for the lightbox, and
`vpf_loop_custom_output` (`gutenberg/blocks/item-template/index.php:752`) for
replacing the whole list.

## 1. Right-click protection

Stops a visitor saving the picture: the context menu is suppressed over gallery
images, dragging them is blocked, and the same guard is applied inside the
lightbox.

It lives in Pro's `modules/block-protection/`, a module that also carries the
password and age gates. Three separate things keep it away from a loop, and each
would have to be solved on its own:

- **The event.** The frontend script hangs everything on
  `initEvents.vpf`, in Pro
  `modules/block-protection/assets/frontend/right-click-protection.js:99`. That
  event has exactly one emitter in either repository,
  `assets/js/main.js:660`, inside the `initEvents()` method of the legacy jQuery
  class, which is instantiated on `.vp-portfolio` at `assets/js/main.js:948`. A
  loop renders no such element and boots no such class, so the handler is never
  called.
- **The class.** Every handler gates on the item carrying `vp-portfolio__rcp`
  (Pro `.../right-click-protection.js:103`, and again at `:139` and `:167` for
  the Fancybox and PhotoSwipe paths). The class is added through
  `vpf_extend_portfolio_class` (Pro `modules/block-protection/index.php:74`,
  `:338`), a filter applied in one place only —
  `classes/class-get-portfolio.php:570`, inside the legacy output config.
- **The assets.** The module enqueues on `vpf_after_assets_enqueue`
  (Pro `modules/block-protection/index.php:71`). That action fires at
  `classes/class-assets.php:476`, inside `Visual_Portfolio_Assets::enqueue()`.
  A loop reaches `enqueue()` only through `enqueue_loop_block()`
  (`classes/class-assets.php:989`), which walks the loop's inner blocks looking
  for a nested **legacy** `visual-portfolio/block` (`classes/class-assets.php:964`)
  — so a loop built from the new blocks alone never gets there. Worth stating
  precisely: it is not that loops cannot reach the action, it is that only a loop
  wrapping a legacy gallery does.

To port it the new side needs a marker on the item template wrapper that Pro can
set (a `vpf_loop_item_context` key is not enough — this is a gallery-level flag,
so it wants either a filter on the wrapper attributes or an attribute on the
block), a way for Pro to enqueue a script module for a loop, and a rewrite of the
handler onto the Interactivity API store instead of the jQuery event. The
password and age gates from the same module already made the crossing through
`vpf_loop_custom_output` (Pro `modules/block-protection/index.php:68`), which is
the precedent to follow for the enqueue half.

## 2. The Pro lightbox surface

The new lightbox is a separate implementation, not an extension of the old one:
a script module over PhotoSwipe 5 built from JSON on each trigger
(`gutenberg/popup/index.php`, `gutenberg/popup/view.js`). The legacy popup is
jQuery over PhotoSwipe 4 or Fancybox, built from `<template>` markup, and every
Pro feature below extends it by filtering that markup through `vpf_popup_output`,
applied at `classes/class-get-portfolio.php:3123` — inside `each_item()`, and so
never for a loop.

The ladder of subscribers on that filter is, in priority order: click action
(Pro `modules/click-action/index.php:27`), custom popup image
(Pro `modules/popup/custom-image/index.php:56`), image priority
(Pro `modules/popup/image-priority/index.php:45`), albums
(Pro `modules/albums/popup-albums/index.php:53`) and deep linking
(Pro `modules/popup/deep-linking/index.php:53`). None of them run for the new
lightbox, and none of them would be useful if they did — they rewrite HTML that
no longer exists.

The replacement is `vpf_loop_item_popup_data` (`gutenberg/popup/index.php:140`),
which passes the item's popup array, the item data and the gallery options, and
lets a filter return anything the module understands. What the module understands
today is the whole of `getSlide()` (`gutenberg/popup/view.js:93`): for an image
`src`, `srcset`, `width`, `height`, `alt`, `msrc`, `title` and `caption`; for a
video `width`, `height`, `embedUrl`, `title` and `caption`. Anything else in the
payload is ignored — note that `poster` is written by
`gutenberg/popup/index.php:198` and read by nothing, which is a small bug of its
own.

Feature by feature:

- **Deep linking.** Each slide gets its own URL, Back closes the lightbox, and a
  shared link opens on the right image. Pro resolves a per-item id and writes it
  onto the legacy markup at `modules/popup/deep-linking/index.php:252`, with the
  gallery id at `:286`, and the frontend finds the slide by that attribute at
  `modules/popup/deep-linking/assets/frontend/script.js:289`. The loop would have
  to carry a `pid` per item and a `gid` per gallery in the popup payload, and the
  module would need history handling of its own. The editor half already exists:
  Pro fills the loop image modal at
  `modules/popup/deep-linking/assets/editor/loop-image-settings.js:13`, and the
  value survives a save through `classes/class-security.php:481`.
- **Custom popup image.** The grid shows one file, the lightbox opens another.
  Pro rebuilds the whole popup from a second attachment at
  `modules/popup/custom-image/index.php:297`. On the loop side the only thing
  needed is for `Visual_Portfolio_Popup::get_image_data()` to be handed the other
  attachment id before it resolves the image — a `vpf_loop_item_popup_data`
  filter can do it today, since the id already reaches PHP and already survives a
  save (`classes/class-security.php:459`), and the editor field is already filled
  by `modules/popup/custom-image/assets/editor/loop-image-settings.js:16`. This
  is the cheapest item on the list.
- **Quick View.** Clicking an item opens the post itself in an iframe inside the
  lightbox. Pro builds it at `modules/popup/iframe/index.php:46`, chosen through
  the click action list at `modules/click-action/index.php:74` and `:254`. The
  loop payload has no slide type for a page: `getSlide()` knows `image` and
  `video` and nothing else, so this needs a third type in the module plus a
  same-origin permalink and an external-URL flag per item.
- **Thumbnail strip.** A filmstrip along the lightbox for jumping between slides.
  Pro's implementation is Fancybox-only — it bails unless the vendor setting says
  so (`modules/popup/thumbnails/index.php:27`) and its whole body is one
  `beforeInitFancybox.vpf` handler
  (`modules/popup/thumbnails/assets/frontend/script.js:15`). There is nothing to
  port; this is a new PhotoSwipe 5 UI element, plus a thumbnail URL per slide.
  `msrc` is close but is the placeholder size, not a strip size.
- **Video vendors.** Instagram, Dailymotion, Twitch, TikTok, SoundCloud and a
  dozen more, plus self-hosted video and audio. Pro adds them by extending a
  global registry (`modules/popup/video-vendors/assets/frontend/script.js:43`),
  never touching `vpf_popup_output`. The new module already has the hand-off:
  `embedUrl` (`gutenberg/popup/view.js:54`) is documented as the key a Pro vendor
  fills through `vpf_loop_item_popup_data`. That covers every iframe vendor. It
  does not cover the two self-hosted ones
  (`modules/popup/video-vendors/assets/frontend/script.js:224` and `:258`), which
  return raw `<video>` and `<audio>` markup — the payload has no slot for that.
- **Loading the next page inside the popup.** Swiping past the last slide fetches
  the next page and appends it
  (`modules/popup/load-next-pages/assets/frontend/script.js:230`), for load-more
  and infinite paginations only (`:12`). Half of this is already free on the new
  side: the module reads every trigger off the DOM at click time
  (`gutenberg/popup/view.js:345`), so items appended by Load More before the
  lightbox opened are already in the gallery. What is missing is appending while
  it is open, which needs the loop's fetch exposed to the popup module and an
  append on the PhotoSwipe instance. No per-item data.
- **Syncing with the slider.** Close the lightbox on slide seven and the carousel
  is already on slide seven
  (`modules/popup/sync-with-slider/assets/frontend/script.js:56`). No per-item
  data either; it needs the popup module and the carousel to agree on
  an index, and access to the carousel instance. Note the index is only 1:1 while
  one item means one slide — Pro's album popup already breaks that assumption
  (`modules/albums/popup-albums/index.php:53`).

## 3. Proofing

Client photo proofing: the gallery is wrapped in a form, every item gets a
selection checkbox, a logged-out client ticks the photos they want and submits,
and the selection is stored against a `vp_proofing` post and emailed.

It lives in Pro's `modules/proofing/index.php`, with the post type registered at
`:1103`. Its four render hooks are all legacy-only:

- `vpf_before_wrapper_start` and `vpf_after_wrapper_end` (Pro `:134`, `:135`) put
  the `<form>` around the list. They fire at
  `classes/class-get-portfolio.php:1237` and `:1380`, in the legacy output.
- `vpf_each_item_tag_attrs` (Pro `:137`) fires at
  `classes/class-get-portfolio.php:3058`, inside `each_item()`.
- `vpf_after_each_item` (Pro `:138`) renders the checkbox template (Pro `:1032`)
  and fires at `classes/class-get-portfolio.php:3088`, also inside `each_item()`.

Its assets ride `vpf_after_assets_enqueue`, which a loop does not fire — see
section 1. The result is not a degraded gallery but no proofing at all: no form,
no checkbox, no script.

Porting it means a proofing block, or a pair of them: something that wraps the
item template in a form and a per-item checkbox block that knows the item id from
context. The data side needs nothing new.

## 4. Albums

Worth correcting a common assumption first: there is no album post type and no
album content source. An album is a per-item `album_images` attribute produced by
several sub-modules (Pro `modules/albums/index.php:22-26`) — the gallery post
format (`modules/albums/post-format-gallery/index.php:30`), a per-image control
in the legacy media settings, and a taxonomy injector
(`modules/albums/taxonomy-albums/index.php:23`). For a user it means an item that
stands for several images: it shows a stacked indicator and a count, and opening
it walks the whole album in the lightbox instead of showing one picture.

The producers hang off `vpf_post_item_args` and friends inside `build_items()`,
which loops share. Everything that renders an album is legacy-only:

- the indicator class, through `vpf_each_item_tag_attrs`
  (Pro `modules/albums/popup-albums/index.php:32`, `:213`);
- the indicator markup, by swapping the item template through
  `vpf_include_template` (Pro `:35`), which a loop never includes;
- the count badge, through the inline meta hooks (Pro `:36`, `:37`, `:296`) —
  see section 6;
- the album popup itself, through `vpf_popup_output` (Pro `:53`) — see section 2.

So the accurate statement is that the album data may well reach a loop item while
nothing renders it. The new side needs the album images in the popup payload with
a lightbox that can expand one trigger into several slides, an indicator that is
either a block or a class on the image block, and the count as a meta type
(section 6).

## 5. Video thumbnails and the audio post format

**Video thumbnails** give a video item a poster taken from the video itself and a
play badge over the grid image. Pro's module is attachment-based rather than
oEmbed-based (`modules/video-thumbnail/index.php`). Its data half already works
for loops: `vpf_image_item_args` (Pro `:29`) is applied at
`classes/class-get-portfolio.php:869`, inside `build_items()`. Its render half
does not: `vpf_each_item_args` (Pro `:30`) and `vpf_each_item_tag_attrs`
(Pro `:31`, `:346`) fire at `classes/class-get-portfolio.php:3043` and `:3058`,
inside `each_item()`, and the assets ride `vpf_after_assets_enqueue` (Pro `:22`).
The keys also stop at the context boundary: `map_item_to_context()` forwards the
format and the video URL (`gutenberg/blocks/item-template/index.php:224-225`) and
nothing else.

**The audio post format** gives an audio post a music icon in the grid and plays
the file in the lightbox. Pro sets `audio` on the item in `vpf_post_item_args`
(`modules/post-format-audio/index.php:30`), which loops do run, and then derives
`format_audio_url` in `vpf_each_item_args` (`:32`, `:214`), which they do not.
The icon itself is a free template, `templates/items-list/item-parts/icon.php:27`,
included only from legacy item styles. A loop item with an audio format renders
as a plain image.

Both are ports rather than rewrites: `vpf_loop_item_context`
(`gutenberg/blocks/item-template/index.php:253`) is the extension point, and Pro
already uses it for the hover thumbnail
(`modules/post-hover-thumbnail/index.php:38`). What is missing is somewhere for
the badge to render — a format indicator on the image block, or a small block of
its own — and the audio URL in the popup payload.

## 6. Item meta counters

Pro adds two counters to the item meta line: how many posts a term holds, and how
many images an album holds. In the legacy gallery they sit beside the comment and
view counts.

- Posts per term:
  Pro `modules/taxonomies/classes/class-taxonomy-renderer.php:155` puts the count
  on the item, `:50` and `:53` render it.
- Images per album:
  Pro `modules/albums/popup-albums/index.php:296`, `:36` and `:37`.

Both ride the same pair of hooks,
`vpf_each_item_inline_meta_enabled` and `vpf_each_item_inline_meta`, applied in a
legacy template — `templates/items-list/item-parts/inline-meta.php:31` and
`:67` — which only the legacy item styles include.

The blocker on the new side is sharper than a missing hook: the `item-meta` block
has a closed enum. `metaType` accepts `comments`, `views` and `reading-time` and
nothing else (`gutenberg/blocks/item-meta/block.json:17-21`), the values map to a
PHP `const` (`gutenberg/blocks/item-meta/index.php:21`), and the labels live in a
plain exported object in `gutenberg/blocks/item-meta/meta-types.js`. There is no
filter anywhere in that chain, so Pro cannot add a counter without a change in
this repository. That change — a registry for meta types, extensible from both
PHP and JS — is the real task, and both counters fall out of it once the item
data is carried by `vpf_loop_item_context`.

## 7. Skin style extras

Eight Pro settings that decorate the legacy item skins. They are grouped here
because they share one pipeline, and the pipeline is the whole of the problem.

A skin declares which builtin fields it wants; Pro appends its own descriptors
through `vpf_items_style_builtin_controls`
(`classes/class-admin.php:2719`); the free side namespaces each one as
`items_style_{skin}__{field}` (`classes/class-admin.php:2733`) and registers it as
a real control (`:2765`). At render time the legacy path calls
`Visual_Portfolio_Assets::enqueue()` (`classes/class-get-portfolio.php:1209`),
which walks every registered control carrying a `style` key
(`gutenberg/utils/controls-dynamic-css/index.php:42`) and writes inline CSS
(`classes/class-assets.php:443`). The selectors it writes are scoped to
`.vp-portfolio__items-style-{skin}` and `.vp-portfolio__item*`, built at
`classes/class-get-portfolio.php:572`.

What each one gives a user, and where it registers in Pro:

- **Blend mode** — `mix-blend-mode` on the overlay or caption so it tints the
  photo instead of covering it. `modules/items/blend-mode/index.php:20`, writing
  the raw property at `:67`.
- **Image transform, normal and hover** — zoom or shift the photo at rest and on
  hover. `modules/items/image-transform/index.php:20`, writing
  `--vp-items-style-{skin}--image__transform` at `:57` and the hover twin at
  `:80`, both consumed by free skin SCSS such as
  `templates/items-list/items-style/style.scss:64`.
- **Hover border radius** — the resting radius ships free, Pro adds the hover
  value. `modules/items/image-border-radius/index.php:20`, re-declaring
  `--vp-items-style-{skin}--image__border-radius` on a `:hover` selector at `:51`.
- **Hover image filters** — brightness, contrast, saturation and the rest, at rest
  and on hover. `modules/items/image-css-filters/index.php:20`, writing
  `--vp-items--image__filter` at `:56`, with a stylesheet of its own that reads it.
- **Overlay under image** — below a chosen breakpoint the hover overlay stops
  hovering and sits under the photo, for touch. No `style` key at all: a class
  through `vpf_extend_portfolio_items_class`
  (`modules/items/overlay-under-image/index.php:32`, `:115`) plus a stylesheet per
  skin.
- **Tilt effect** — the item tilts in 3D under the cursor. Registers whole
  controls on `vpf_after_register_controls`
  (`modules/items/image-tilt-effect/index.php:27`) and renders through a class on
  the gallery (`:132`) plus a script.
- **Caption move** — a whole extra skin, added through `vpf_extend_items_styles`
  (`modules/items/style-caption-move/index.php:21`, `:39`), consumed at
  `classes/class-get-portfolio.php:196`. Its own templates, SCSS and script, and
  its builtin-controls list is what switches several of the extras above on.
- **Grid vertical align** — top, centre or bottom for short items in a grid row.
  Added through `vpf_extend_layouts`
  (`modules/layout-grid-vertical-align/index.php:20`), consumed at
  `classes/class-get-portfolio.php:146`, and rendered not as CSS but as a data
  attribute (`:109`) read by a patched Isotope
  (`modules/layout-grid-vertical-align/assets/frontend/script.js:13`).

Three independent reasons none of this reaches a loop. The dynamic controls CSS
is only ever generated from `Visual_Portfolio_Assets::enqueue()`, whose callers
are the legacy renderer and the legacy preview
(`classes/class-get-portfolio.php:1209`, `classes/class-preview.php:332`) — the
new blocks never enter that path. The selectors are written against
`.vp-portfolio__items-style-*`, while the blocks emit
`.wp-block-visual-portfolio-item-template__item`
(`gutenberg/blocks/item-template/style.scss:12`), so even emitted CSS would match
nothing. And the two class filters that carry the overlay and the tilt are
explicitly retired for this family — see the closing note.

So there is nothing to hook here, and the eight are not one task but two. Six of
them are per-block appearance and belong as attributes and block supports on
`item-image` and `item-cover`, which today have core duotone and a static border
radius and nothing else. Caption move is a pattern, not a skin — the effect enum
of `item-cover` is `none | fade | fly | emerge`
(`gutenberg/blocks/item-cover/block.json:55-58`), and a caption-move pattern would
have to be built from the cover's own placement and effect settings or earn a
fifth value. Grid vertical align is one attribute on `item-template` and an
`align-items` rule; it is the cheapest of the eight.

## 8. The search element

A search field above the gallery that narrows it to matching posts.

Pro already has the query half, and it already works for loops. The search term
is applied through `vpf_extend_query_args`
(Pro `modules/search-element/index.php:29`, `:80`), which fires at
`classes/class-get-portfolio.php:2258` inside `get_query_params()` — the shared
resolver both doors go through (`classes/class-get-portfolio.php:1128`).

What is missing is the field. Pro renders it as a `layout_elements` control
callback (`modules/search-element/index.php:27`, `:199`), and those callbacks are
invoked in one place, `classes/class-get-portfolio.php:1416`, between the legacy
wrapper start and end. There is no search block: `gutenberg/blocks/` registers
twenty-one and none of them is one.

A search block is not only a UI port, and this is the part worth planning for.
Pro reads a global `vp_search` parameter, while every loop control namespaces its
state per query — `classes/class-get-portfolio.php:104` builds `vp-{id}-search`
style names from the list at `:86`, which today is `page`, `filter` and `sort`.
Adding `search` to that list, and teaching the Pro query filter to read the
namespaced name, has to happen with the block or two loops on one page will
search each other.

## 9. Custom breakpoints

This one is on the list to be taken off it. It is not a gap: the new column model
answers a different and better question, and the Pro module has nothing to port.

Pro's `modules/breakpoints/` does one thing — it overrides the five global
breakpoint values from the settings page (`modules/breakpoints/index.php:21`,
`:51`) through the free filters at `classes/class-breakpoints.php:109`. Those
numbers reach the browser in `window.VPData`
(`classes/class-assets.php:796`) and the legacy layout scripts turn them into a
media-query ladder: N columns, N-1 below `xl`, N-2 below `lg`, written at
`assets/js/layout-grid.js:165` as `screen and (max-width: …)`. The module exists
because that ladder asks how wide the *viewport* is, which is the wrong question
for a gallery in a sidebar — and the only remedy the legacy architecture offers is
moving the thresholds for every gallery on the site at once, which is why the
setting is global rather than per-gallery.

The new grid asks how wide the *container* is. `docs/gallery-loop-blocks.md:33-38`
describes the two shapes — Auto, a minimum column width fitted as many times as
the container holds, and Manual, a fixed count — and
`docs/gallery-loop-blocks.md:40-43` states the consequence outright: there are no
per-viewport columns of our own, a narrower screen is what auto mode is for, and a
fixed count is made responsive through the editor's own viewport states. The
implementation is a `repeat(auto-fill, minmax(var(--vp-layout-track), 1fr))` grid
on a container query (`gutenberg/blocks/item-template/style.scss:70-71`), with the
track composed on the server (`gutenberg/blocks/item-template/index.php:508`).
Masonry and carousel, which cannot express that in CSS, measure `clientWidth`
rather than the viewport (`gutenberg/blocks/item-template/auto-columns.js:47`).

Two things to keep in mind rather than hedge over. Manual mode has no per-viewport
counts of its own by design, and a user who wants literal counts per width now
sets them in the editor's viewport states — per block, which is finer than the
site-global setting ever was. And `vpf_breakpoint_*` still matters to the legacy
gallery, so the Pro module keeps working and should not be removed; it simply has
no loop-side counterpart to build.

## Deliberately not migrated

Three decisions are already recorded and should not be reopened as part of this
list.

`specs/001-loop-native-parity/spec.md:32-42` rules out content migrations and
legacy block changes while the blocks are experimental, and rules out
thumbnail-sync navigation for the carousel.

`docs/gallery-loop-blocks.md:376-379` rules out Pro's ajax cache module: it is
built around the `vpf_ajax_call` POST of the legacy renderer, and the loop's GET
navigation is cached by the page cache itself. The module keeps serving the
legacy gallery.

`docs/gallery-loop-blocks.md:400-413` rules out the legacy per-item template
hooks — `vpf_before_each_item`, `vpf_each_item_start`, `vpf_each_item_end`,
`vpf_after_each_item`, `vpf_each_item_tag_*`, `vpf_extend_portfolio_*class*` and
`vpf_layout_elements` — together with skins, `layout_elements` and `stretch`.
Data belongs in `vpf_loop_item_context` and markup in a block. Several sections
above are blocked by exactly these hooks; the answer is a block, not a hook.
