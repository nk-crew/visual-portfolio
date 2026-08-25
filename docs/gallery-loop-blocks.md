# Gallery Loop blocks

The block-native gallery of Visual Portfolio: a `visual-portfolio/loop` block holds
a query, a `visual-portfolio/item-template` inside it lays the items out, and
`item-*` blocks inside that draw one item. `loop-filter`, `loop-sort` and
`loop-pagination` are the controls around them.

Every block of the family is marked **(Experimental)** and registered only on
**WordPress 7.1 and newer**. The legacy `visual-portfolio/block`,
`visual-portfolio/saved`, the shortcodes and Saved Layouts are a separate world
and are not affected by anything on this page.

- [For users](#for-users)
- [Anatomy](#anatomy)
- [Block context](#block-context)
- [PHP hooks](#php-hooks)
- [Content sources](#content-sources)
- [Block Bindings](#block-bindings)
- [Interactivity stores](#interactivity-stores)
- [URL parameters and caching](#url-parameters-and-caching)
- [Legacy hooks with no equivalent](#legacy-hooks-with-no-equivalent)

## For users

**Sources.** A loop shows either posts of any type (with taxonomy filters,
ordering, offsets and manual selections) or a gallery of images managed inside
the block. Visual Portfolio Pro adds social networks and taxonomy sources to the
same picker.

**Layouts.** The item template offers grid, masonry, tiles, justified and
carousel.

Columns come in the two shapes the core grid layout offers, and are edited with
the same controls. **Auto** asks for a minimum column width and fits as many
columns as the container holds, up to a maximum count — zero lifts the maximum,
and *Fill available space* drops the empty tracks of a row that cannot be
filled. **Manual** asks for a count and keeps it. Tiles take their columns from
the tiles notation, and justified has none.

A count is not a promise to show that many on a phone. The stylesheet caps it at
the plugin's breakpoints — four below 1200px, three below 992px, two below 768px
and one below 576px — which is the ladder the legacy gallery walked, so every
layout ends up a single column on a narrow screen. A tile is capped with it and
keeps its proportions, so a pattern narrows into a stack instead of spilling out
of the grid. Auto mode is untouched: fitting the container is already what it
does. There is no per-viewport count of our own to set. The gap is **Block
spacing** in the Dimensions panel, like any other block.

What a theme overrides in CSS, without touching the markup:

| Property | Meaning |
|---|---|
| `--vp-layout-columns` | Column count, or the maximum in auto mode |
| `--vp-layout-current-columns` | Columns the layout is drawn with, after narrowing |
| `--vp-layout-min-column-width` | Minimum column width, auto mode only |
| `--vp-layout-track` | The `minmax()` track a grid repeats, auto mode only |
| `--vp-layout-gap` | Block spacing |
| `--vp-layout-row-height` | Justified row height |

Auto mode also puts `vp-layout-auto-columns` on the list, and
`vp-layout-auto-fit` when empty tracks collapse.

**Patterns.** An empty loop asks for a source, then for the images if that is
the source, and then opens the pattern chooser — the same modal the core Query
block opens, previewing each pattern with the content just picked. Alongside it
sit the three choices a gallery is usually made with: a filter, what the
pagination is, and whether an item opens in the lightbox. They are applied to
whichever pattern is chosen.

Fourteen patterns ship. Eight are one per shape rather than one per skin: Grid
Classic, Grid Overlay, Masonry Clean, Masonry Captions, Tiles Mosaic, Justified
Photo Wall, Carousel Showcase and Posts Cards. Six more take a shape and add one
thing the blocks can do: Grid Rounded, Masonry Reveal, Filtered Portfolio Grid,
Paged Posts Grid, Carousel Coverflow and Blog Roll. A pattern is a starting
point and nothing more: everything in it is ordinary blocks, and it is inserted
unlocked.

**Inspector.** The loop sorts its settings the way the core Query block sorts
its own, in this order:

| Panel | Holds |
|---|---|
| Content Source | The source, and the way back to the chooser |
| Settings | What the source cannot run without. These cannot be hidden |
| Display | Items per page, offset, and a ceiling on the pages shown |
| Filters | What narrows the query. Starts empty, opened one option at a time |

A posts loop narrows by a keyword its text contains and by two exclusions that
do not overlap. Visual Portfolio Pro adds an Authors filter to the same panel,
through the `vpf.loopPostsFilterItems` JavaScript filter. *Avoid duplicates* hides what the page has
already shown — another gallery, or the list of a listing page. *Exclude the
current post* hides the post being viewed, and nothing else. Either, both or
neither can be on.

On a single post the page's own list is that post, so the two would otherwise
be the same switch. The loop leaves that list out when *Exclude the current
post* is off, which is why it never hides the post on its own. The legacy
gallery has no such switch and keeps the behaviour it always had.

The item template follows the same shape: Settings holds the layout type and the
columns, and neither can be hidden; each layout adds a panel of its own.

**Controls.** Filter, sort and pagination are server-rendered links and forms.
With JavaScript they swap the gallery in place; without it they work as ordinary
page loads. Both paths land on the same URL.

## Anatomy

```
visual-portfolio/loop                      query, block id, layout wrapper
├── visual-portfolio/loop-filter           links, one per term
│   └── visual-portfolio/loop-filter-item
├── visual-portfolio/loop-sort             a GET form around a <select>
├── visual-portfolio/item-template         runs the query, renders <ul><li>
│   ├── visual-portfolio/item-image
│   ├── visual-portfolio/item-cover        image with blocks on top of it
│   ├── visual-portfolio/item-title | description | categories | author | date
│   ├── visual-portfolio/item-read-more | item-meta
│   └── any block that reads `vp/item*` context
├── visual-portfolio/loop-no-results
└── visual-portfolio/loop-pagination
    └── loop-pagination-{previous,numbers,next} or loop-pagination-trigger
```

One trigger block covers both the button and the scroll: `loop-pagination-trigger`
carries a `triggerType` of `load-more` or `infinite`, offered as two variations,
and block transforms convert between it and the three paged children.

Items are resolved once, by `Visual_Portfolio_Get::get_loop_items()`, which is
the same query pipeline the legacy gallery uses. Every item block reads its data
from block context; none of them queries anything.

## Block context

### From the loop

| Key | Type | Meaning |
|---|---|---|
| `vp/blockId` | string | Id of the loop, also its router region |
| `vp/queryId` | number | Id the URL parameters are named after |
| `vp/queryType` | string | Selected source (`posts`, `images`, or a registered one) |
| `vp/baseQuery` | object | `perPage`, `maxPages` |
| `vp/postsQuery` / `vp/imagesQuery` | object | Settings of the built-in sources |
| `vp/sourceQuery` | object | Settings of any other source |

### From the item template

| Key | Type | Meaning |
|---|---|---|
| `vp/layoutType` | string | `grid`, `masonry`, `tiles`, `justified`, `carousel` |
| `vp/layoutColumns` | number | Columns on the widest viewport |

### Per item

`vp/itemId`, `vp/itemPostId`, `vp/itemImgId`, `vp/itemImgUrl`, `vp/itemImgAlt`,
`vp/itemNoImgId`, `vp/itemFocalPoint`, `vp/itemUrl`, `vp/itemAriaLabel`,
`vp/itemTitle`, `vp/itemContent`, `vp/itemExcerpt`, `vp/itemCategories`,
`vp/itemFormat`, `vp/itemVideoUrl`, `vp/itemAuthor`, `vp/itemAuthorUrl`,
`vp/itemAuthorAvatar`, `vp/itemPublishedTime`, `vp/itemCommentsCount`,
`vp/itemCommentsUrl`, `vp/itemViewsCount`, `vp/itemReadingTime`,
`vp/itemPopupData`.

Reserved for Pro, never written by the free plugin, but guaranteed as names:
`vp/itemHoverImgId`, `vp/itemHoverImgFocalPoint`, `vp/itemHoverVideoUrl`,
`vp/itemAlbumUrl`.

`vp/itemImageLoading` is a positional key rather than item data: it carries the
`loading` and `fetchpriority` attributes the picture of this item should get, and
the item template decides them from where the item sits (see
[Images](#images)).

A third-party block joins the family by declaring the ancestor and the context
it reads — no hook involved:

```json
{
	"name": "acme/item-badge",
	"ancestor": ["visual-portfolio/item-template"],
	"usesContext": ["vp/itemPostId", "vp/itemCategories"]
}
```

## PHP hooks

### The loop pipeline

| Hook | Signature | Purpose |
|---|---|---|
| `vpf_before_loop_items` | action `( $options )` | Per-render setup |
| `vpf_after_loop_items` | action `( $options )` | Per-render teardown |
| `vpf_loop_items` | filter `( $result, $options )` | Post-process `{ items, max_pages, options }` |
| `vpf_loop_item_context` | filter `( $context, $item, $options )` | Add context keys to one item |
| `vpf_loop_custom_output` | filter `( false\|string, $options, $block )` | Replace the whole item template output, before a single item is rendered. Content protection uses this |
| `vpf_loop_sort_options` | filter `( $options, $loop_options )` | Sort options a loop offers, `slug => label` |
| `vpf_loop_tiles_presets` | filter `( $presets )` | Tiles notations offered in the editor |
| `vpf_carousel_effects` | filter `( $effects )` | Carousel effects the item template offers. See below |
| `vpf_loop_item_popup_data` | filter `( $data, $item, $options )` | Lightbox data of one item |
| `vpf_rest_loop_items_source_configs` | filter | Allow-list of source parameters the editor preview endpoint accepts |

### The query

The loop resolves its query through the same functions the legacy gallery does,
so every one of these keeps working unchanged: `vpf_get_options`,
`vpf_extend_options_before_query_args`, `vpf_extend_query_args`,
`vpf_custom_query_result`, `vpf_custom_items`, `vpf_image_item_args`,
`vpf_post_item_args`, `vpf_custom_filter_terms`, `vpf_extend_filter_items`,
`vpf_wp_get_attachment_image`, `vpf_get_pagenum_link`.

Three of them need a word for sources that are neither posts nor images:

- **`vpf_custom_query_result`** answers for the items *and* for the page count.
  `Visual_Portfolio_Get::calculate_max_pages()` asks it in the same order the
  item pipeline does, so a source that provides a query object reports its own
  `max_num_pages` to the pagination blocks — on the front end as well as in the
  editor.
- **`vpf_allowed_max_pages_params`** filters the allow-list of legacy options
  that survive on the way to the page count. Options a source maps its
  `sourceQuery` into are stripped unless they are registered here:

  ```php
  add_filter(
      'vpf_allowed_max_pages_params',
      function ( $config ) {
          $config['acme_account'] = array( 'string', '' );
          $config['acme_count']   = array( 'number', 0 );

          return $config;
      }
  );
  ```

  Entries are `option => type` or `option => array( type, default )`, where the
  type is `string`, `number`, `boolean` or `array`. The options arrive in the
  legacy format — `sourceQuery` has already been converted away.
- **`vpf_loop_only_options`** registers a loop option that no legacy control
  does. `Visual_Portfolio_Get::get_options()` keeps registered controls and
  nothing else, so an option a source or a module adds is dropped before the
  query is built unless it is listed here:

  ```php
  add_filter(
      'vpf_loop_only_options',
      function ( $options ) {
          $options['acme_account'] = 'text';

          return $options;
      }
  );
  ```

  Entries are `option => type`, where the type is `ids`, `text`, `boolean` or
  `number` and names the sanitizer the value passes through on the way in.

### Carousel effects

An effect is a pair of scroll driven animations over two boxes the item template
already renders. A carousel that plays one wraps every item in them, so an
effect needs a stylesheet, a name on each side, and no markup of its own:

```html
<li class="…__item" style="--vp-slide-index:0">
    <div class="…__slide">
        <div class="…__card">…the blocks of the item…</div>
    </div>
</li>
```

The item stays the box the browser snaps to and the module measures slide
positions from, so an effect may turn a card, scale it or pin it in place
without moving the carousel underneath it. `--vp-slide-index` is the place of
the item in the list, which is what a stacking effect deals the pile in.

Register the name on the server and in the editor:

```php
add_filter(
    'vpf_carousel_effects',
    function ( $effects ) {
        $effects[] = 'acme-flip';

        return $effects;
    }
);
```

```js
addFilter( 'vpf.carouselEffects', 'acme/flip', ( options ) => [
    ...options,
    { label: 'Flip', value: 'acme-flip' },
] );
```

The list is given the classes `vp-carousel-effect` and `vp-carousel-acme-flip`,
and the stylesheet is the install's own to enqueue —
`render_block_visual-portfolio/item-template` is where Pro does it. Everything
geometric belongs inside
`@supports (animation-timeline: view())`: without it the two boxes are still
rendered and the carousel is the plain carousel it would have been anyway.

The frame around the list is an inline-size query container, so a width is
stated in `cqw` rather than in a percentage of the list — a carousel that
repeats is padded by half its width at each end, and a percentage of what that
leaves is nothing.

### Sitemap

`vpf_parse_sitemap_images_from_blocks` filters the images a post contributes.
The free sitemap integration walks `visual-portfolio/loop` blocks at any nesting
depth and lists the pictures of **images** sources only, and only when the loop
actually renders an `item-image` or `item-cover`. Posts sources add nothing: the
posts are in the sitemap already, with the same featured images.

## Content sources

A source is registered on both sides: JavaScript owns the inspector panel and
the mapping used for the editor preview, PHP owns the same mapping for the front
end.

```js
import { registerLoopSource } from 'visual-portfolio/loop-sources';

registerLoopSource( {
	name: 'acme/instagram',
	title: 'Instagram',
	SettingsPanel,             // React component, edits `sourceQuery`
	mapToLegacy: ( sourceQuery ) => ( { … } ),
} );
```

```php
add_filter(
	'vpf_convert_loop_source_attributes',
	function ( $legacy, $query_type, $source_query ) {
		if ( 'acme/instagram' !== $query_type ) {
			return $legacy;
		}

		$legacy['content_source'] = 'social-stream';
		// …map `$source_query` into the options your `vpf_extend_query_args`
		// callbacks read.

		return $legacy;
	},
	10,
	3
);
```

Anything a source writes into legacy options and later needs for counting pages
must also be registered through `vpf_allowed_max_pages_params`.

Per-image fields in the gallery manager are added through the
`VP.LoopImageSettings` slot. Settings of the Item Cover block are added through
the `vpf.itemCoverSettingsItems` JavaScript filter, which is given an empty array
and `{ attributes, setAttributes, clientId }` and returns `ToolsPanelItem`
children — ordinary children of the block's Settings panel, registering with it
the way the built-in ones do.

## Block Bindings

`visual-portfolio/item` binds core blocks to item data. It is a developer tool:
custom binding sources have no editor UI, so a binding is written in the code
editor or arrives inside a pattern. The user-facing path is always blocks.

```html
<!-- wp:paragraph {"metadata":{"bindings":{"content":{
    "source":"visual-portfolio/item",
    "args":{"key":"title"}
}}}} --><p>fallback</p><!-- /wp:paragraph -->
```

`args.key` is the item value without the prefix (`title`, `url`, `imgUrl`,
`author`, `commentsCount`…); the full context key (`vp/itemTitle`) is accepted
too. Non-scalar values and unknown keys resolve to `null`, which leaves whatever
the block saved. The source declares every key of
`Visual_Portfolio_Block_Item_Template::get_context_keys()`, reserved Pro keys
included, so a Pro value added through `vpf_loop_item_context` is bindable
without any change here.

## Interactivity stores

| Store | Module | What it does |
|---|---|---|
| `visual-portfolio/loop` | `build/gutenberg/blocks/loop/view.js` | Navigation of the whole family: `actions.navigate`, `actions.loadMore`, `callbacks.initLayout` (masonry), `callbacks.observeInfinite`, `state.isLoading`, `state.ariaLiveMessage`, `state.isEnhanced` |
| `visual-portfolio/item-template` | `build/gutenberg/blocks/item-template/view.js` | Justified and carousel layouts, native masonry detection |
| `visual-portfolio/item-cover` | `build/gutenberg/blocks/item-cover/view.js` | The `fly` effect only |
| `visual-portfolio/popup` | `build/gutenberg/popup/view.js` | The lightbox |

Compose onto a namespace with another `store()` call, and **add** actions rather
than replace the ones already there.

Nothing in these modules is required for the gallery to work. Every control is a
real link or a real form resolved by the server; the modules replace the page
load with a region swap, and hand the navigation back to the browser whenever
they cannot. `state.isEnhanced` is how a server-rendered fallback control — the
submit button of the sort form — knows to take itself away.

They are directives and actions and nothing else — between 0.4 and 4.4 KB each,
with `@wordpress/interactivity` from the WordPress bundle as the only static
dependency. Everything larger is fetched at the moment it is used and never
bundled: `@wordpress/interactivity-router` on the first region swap, the Blossom
carousel from the address on the markup, PhotoSwipe when a lightbox opens. A
gallery that is a plain grid downloads none of the three.

No jQuery is involved anywhere on the front end. The layouts that need a library
use `masonry` and `imagesloaded` from WordPress and a jQuery-free build of
fjGallery registered under a handle of the family's own.

### Lightbox events

The lightbox is a script module, so it announces itself with DOM events on
`document` rather than with the jQuery events the legacy gallery fires. Pro
listens to these; so may anyone else.

| Event | When |
|---|---|
| `vp-popup-open` | the lightbox is on screen |
| `vp-popup-change` | the slide changed |
| `vp-popup-close` | the lightbox is closing |

All three carry the same `detail`:

| Key | What it is |
|---|---|
| `loop` | the loop element the lightbox was opened from — its items and its pagination hang below this |
| `gallery` | the root element of the lightbox itself |
| `index` | index of the slide being shown |
| `total` | how many slides the lightbox holds right now |
| `item` | the trigger the shown slide was built from; the item is its `closest()` |
| `refresh()` | picks up the triggers the loop has grown since the lightbox opened, and returns the new `total` |

The carousel takes commands the same way, on the list element of an item
template:

| Event | Payload |
|---|---|
| `vp-carousel-go-to` | `detail.index` — scroll to that slide |
| `vp-carousel-autoplay` | `detail.playing` — `false` holds autoplay, `true` releases it |

Holding autoplay is not the same as stopping it: the pause a pointer or a focus
already applies keeps working underneath, and releasing the hold does not
override it.

## URL parameters and caching

State lives in the URL. A loop that carries a query id owns its own parameters,
so two galleries on one page never move each other:

| Role | Legacy name | Named after the loop |
|---|---|---|
| Page | `vp_page` | `vp-{queryId}-page` |
| Filter | `vp_filter` | `vp-{queryId}-filter` |
| Sort | `vp_sort` | `vp-{queryId}-sort` |
| Random seed | `vpf_random_seed` | shared by the page |

Defaults are never written: page one, an empty filter and the default sort are
removed from the URL rather than spelled out. The canonical view of a page is
therefore the URL with no parameters at all.

### What a page cache sees

Navigation is plain GET, which is exactly what a page cache understands. Each
distinct combination below is a separate cacheable URL:

| Variation | Cacheable | Notes |
|---|---|---|
| No parameters | yes | The canonical page. Indexed |
| `vp-1-page=N` | yes | One entry per page. `noindex, follow`, with `rel="prev"`/`rel="next"` in the head |
| `vp-1-filter=…` | yes | One entry per term shown by the filter |
| `vp-1-sort=…` | yes | One entry per sort option |
| Combinations of the above | yes | The product of them, which is what to keep an eye on: three galleries with four filters and four sort options each is already a large surface |
| `vpf_random_seed=…` | unbounded | See below |

Nothing in the family sets `Cache-Control`, sends cookies or varies the response
by anything but the query string, so a full-page cache can store every one of
these safely. The Interactivity router fetches the same URLs with the same
method, so a warmed cache serves the region swaps too.

**Random order.** A gallery ordered randomly draws a new order on every request,
so its pagination links carry `vpf_random_seed` to hold one order still. That
seed is part of the URL, and a cache stores each one as a page of its own: the
number of entries is unbounded. Either exclude the parameter from the cache key
— the pages will then be shuffled between visits, which is what a random gallery
is for — or do not page a random gallery at all. The editor says as much next to
the setting.

**Commercial cache plugins.** WP Rocket, LiteSpeed Cache and Cloudflare APO were
not exercised: they are not installed in this repository's environment and a run
against them has not been faked. The properties that matter to all three are the
ones above — GET navigation, no cookies, no `Vary`, state in the query string —
and the one setting worth checking on any of them is the treatment of query
strings: a cache configured to ignore unknown parameters entirely will serve
page one for every page of a gallery. Add `vp_page`, `vp_filter`, `vp_sort` and
`vp-*-page|filter|sort` to the list of parameters that form the cache key, and
`vpf_random_seed` to the list that does not.

**Pro's ajax cache module** is not wired into this family and will not be. It is
built around the `vpf_ajax_call` POST of the legacy renderer; GET navigation is
cached by the page cache itself, which is both simpler and more effective. The
module continues to serve the legacy gallery.

## Images

Item images are rendered through `Visual_Portfolio_Images::get_attachment_image()`,
the one path that carries `srcset`, the `wp-image-{id}` class, the plugin's lazy
loading and the remote images of the Pro sources.

**Size.** `sizeSlug` defaults to the size the gallery wants, chosen when the
block is inserted from the columns of the layout around it: `vp_xl` up to two
columns, `vp_lg` at three to five, `vp_md` beyond. It is a default, not a rule —
the setting belongs to the user from then on.

**Priority.** The first item of the first rendered page gets
`fetchpriority="high"` and `loading="eager"`; the rest of the first row, as wide
as the desktop column count, gets `loading="eager"`. Everything after that is
left to `wp_get_loading_optimization_attributes()`, which counts the images
before the gallery on the page as well, so a loop under a hero image does not
steal its priority. `fetchpriority="high"` doubles as the marker that keeps the
plugin's own lazy loading off the largest-paint candidate.

## Legacy hooks with no equivalent

The template actions of the legacy renderer — `vpf_before_each_item`,
`vpf_each_item_start`, `vpf_each_item_end`, `vpf_after_each_item`,
`vpf_each_item_tag_*`, `vpf_extend_portfolio_*class*`, `vpf_layout_elements` —
have no counterpart here, deliberately. In a block world the item template and
the composition of a loop are the user's, expressed in blocks. Add **data** with
`vpf_loop_item_context` and **markup** with a block of your own; the two together
do everything the template actions did, and the result is something the user can
see and move.

The same goes for skins, `layout_elements`, `stretch` and the typography and
dimension settings of the legacy gallery: they are block patterns, inner blocks,
`align: wide|full` and block supports now.
