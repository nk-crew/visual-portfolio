# Gallery Loop blocks

The block-native gallery of Visual Portfolio: a `visual-portfolio/loop` block holds
a query, a `visual-portfolio/item-template` inside it lays the items out, and
`item-*` blocks inside that draw one item. `loop-filter`, `loop-sort`,
`loop-pagination` and the `loop-carousel-*` blocks are the controls around
them.

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

A *Custom Query* is kept as its author wrote it, with one exception. When the
user who saves it cannot read other users' private posts, the statuses they may
not read are dropped, and the query is written again from what a gallery reads
of it, with the public statuses as its `post_status`. The same holds for a
query for one post by id or slug, which checks no status otherwise. This runs
when a user saves a post or a template with a Gallery Loop or classic block,
and whenever a user writes the `vp_posts_custom_query` meta that Saved Layouts,
the shortcode and the Saved block read; an import or a command run without a
user is left alone. The editor previews such a user's query the same way.

**Item image.** On a gallery of images the toolbar of the item image carries
the two media tools the core Image block has: *Crop* and *Replace*. Both act on
the entry of the item in the loop's gallery — the same entry the gallery
manager edits from the sidebar — so a title, a category, a link or a focal point
typed into it stays. A crop is saved as a new attachment, the way the core block
saves one, and the snackbar it ends with offers to undo it; the crop itself is
the inline cropper the block editor still ships for plugins, with the zoom, the
aspect ratio and the rotation in the toolbar. Replace offers the media library
and an upload. A posts loop shows neither: its image is the featured image of
the post, and belongs to it.

**Layouts.** The item template offers grid, masonry, tiles, justified and
carousel — a block variation each, the way the Group block offers Group, Row,
Stack and Grid. The editor draws the switcher itself: a row of icons above the
settings, and an entry in the block switcher of the toolbar. Tiles adds a
*Pattern* setting once it is the layout: a select of presets, whose toggle shows
the pattern in hand as a swatch, and the same catalogue behind a button of the
block toolbar. A preset is the tiles notation of `layoutTiles` — columns, then
the width and height of every tile of the repeating pattern, width counted in
columns and height in column widths. Pro adds an editor of that notation under
the select: the tiles are drawn on a canvas at the shape the page gives them,
resized by their handles or by *Width* and *Height*, dragged onto one another to
change places, doubled or removed from a small toolbar over the selected tile.

Columns come in the two shapes the core grid layout offers, and are edited with
the same controls under the same names. **Auto** asks for a *Min. column width*
and fits as many columns as the container holds, up to *Max. columns* — zero
lifts the maximum, and *Fill available space* drops the empty tracks of a row
that cannot be filled. **Manual** asks for a count and keeps it. Tiles take
their columns from the tiles notation, and justified has none.

A count is not a promise to show that many on a phone. The stylesheet caps it at
the plugin's breakpoints — four below 1200px, three below 992px, two below 768px
and one below 576px — which is the ladder the legacy gallery walked, so every
layout ends up a single column on a narrow screen. A tile is capped with it and
keeps its proportions, so a pattern narrows into a stack instead of spilling out
of the grid. Auto mode is untouched: fitting the container is already what it
does. The gap is **Block spacing** in the Dimensions panel, like any other block.
Horizontal is the gap between columns, and between rows as well unless Vertical
sets one of its own. With only Vertical set, the columns keep the default gap.
A carousel has one row, so it reads Horizontal alone.

A grid row is as tall as its tallest item, and the other items of the row
stretch to its height. The block toolbar of a grid aligns them to the top, the
middle or the bottom of the row instead, as it does for the core Columns block.

Pro lets a manual count answer for one screen at a time, and the screen is the
one the editor is already previewing: switch the View to *Tablet* or *Mobile*
with *Responsive styles* on, and the Layout panel carries the count for that
screen. A tablet is 782px and narrower, a phone 480px and narrower, unless the
theme moves the breakpoints in `settings.viewport` of `theme.json` — the count
applies where the editor previewed it. A screen with no count of its own walks
the ladder above. Auto mode does not offer them: the width of a column is what
decides the count there. Tiles get a pattern per screen the same way. Without
Pro the Layout panel of a tablet or phone preview says so, and nothing else.

What a theme overrides in CSS, without touching the markup:

| Property | Meaning |
|---|---|
| `--vp-layout-columns` | Column count, or the maximum in auto mode |
| `--vp-layout-columns-tablet` | Count on a tablet, when Pro set one |
| `--vp-layout-columns-mobile` | Count on a phone, when Pro set one |
| `--vp-layout-current-columns` | Columns the layout is drawn with, after narrowing |
| `--vp-layout-min-column-width` | Minimum column width, auto mode only |
| `--vp-layout-track` | The `minmax()` track a grid repeats, auto mode only |
| `--vp-layout-gap` | Block spacing |
| `--vp-layout-row-gap` | Block spacing between rows, printed only when it differs from the columns |
| `--vp-layout-row-height` | Justified row height |

Auto mode also puts `vp-layout-auto-columns` on the list, and
`vp-layout-auto-fit` when empty tracks collapse. An aligned grid carries
`are-vertically-aligned-top`, `-center` or `-bottom`.

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
unlocked. Every pattern, and the blank start, comes with a **No Results** block
that says so when the query finds nothing. The wizard's Load More and infinite
scroll add an **End of List** block, which is shown once the last page is on
screen.

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

The layout, where the slides come to rest and the container width are switched
in the block toolbar as well as in the sidebar, beside the editor's own view
switchers. The typed width of a custom container stays in the sidebar.

**Carousel controls.** Everything a carousel is steered with is a block:
*Carousel Previous Slide*, *Carousel Next Slide*, *Carousel Indicator* — drawn
as dots, as a bar or as a counter — *Carousel Play and Pause*, and *Carousel
Thumbnails*. They are usually kept in a *Carousel Navigation* row, which is
where the two carousel patterns put them and where an indicator between two
arrows reads best — but each of them can be dragged anywhere inside the loop.

Where a control sits decides how it is drawn. Beside the item template it is in
the flow, below or above the gallery. Dropped *inside* the item template — the
row or any single control — it is laid over the slides: the template renders it
once, after the list and inside the frame the list scrolls in, so an arrow is
pinned to either edge of the pictures and an indicator to the foot of them. A
control over the slides is white unless coloured, and gains a *Show on hover*
switch that fades it in while the pointer rests on the carousel (touch screens,
which have no hover, always show it). The editor draws the same blocks inside
the item being edited, positioned against the same frame.

The arrows come in two variations — *Chevron* and *Arrow*, switched in the row
of icons above the settings — and three block styles:
*Plain*, *Outlined* and *Filled* (a dark pill with a white glyph). The indicator
carries block styles of its own: *Plain*, *Outlined* and *Filled*, the box
around the dots or the bar. Selecting the row offers the same
settings and applies them to every arrow and indicator inside it.

The indicator comes in three variations. *Dots* draws one per slide, with a single filled pill that crawls from the dot
it was on to the one it is on - stretching to cover the ground between them and
gathering itself at the far end, rather than vanishing from one and appearing
at the other. The dots are the places, the pill is what moves; under autoplay
the pill is the wait, filling as the delay runs down. It carries
*Dots at once*: left at zero it draws them all, which is a wall of them for a
gallery of forty, and given a number it shows that many through a window and
slides the rest under it, with the slide on screen in the middle and the dots at
either edge shrinking away. Every dot stays in the page — one the window has
moved past cannot be clicked, but tabbing to it brings it back. *Progress bar*
draws a single bar. *Can be dragged* is on by default: the bar answers a drag,
and the arrow keys, Home and End when focused, which makes it a `slider` rather
than a `progressbar` — ARIA gives a progress bar no way to set a value. A press
that never moved travels to where it landed the way an arrow does, rather than
jumping there. Switched off, the bar only says where the carousel is, and is a
`progressbar` again. *Counter* is the pair of numbers, the slide
on screen and how many there are, and is hidden from screen readers: the arrows
and the dots already say the same thing.

*Carousel Play and Pause* stops a carousel that moves on its own and starts it
again, which is what WCAG 2.2.2 asks of any motion lasting more than five
seconds — autoplay pauses under the pointer, but a visitor on a phone or at a
keyboard had no way to stop it. It carries an *Icon* — pause or stop. Stopping holds the countdown where it
was rather than emptying it, the same way the pointer resting on a carousel
does, so starting again finishes the wait instead of beginning a new one. A
button beside a carousel with no autoplay, or one a visitor asked less motion
of, stays switched off like an arrow beside a grid.

*Carousel Thumbnails* is a strip of small pictures, one per slide, that presses
through to its slide and lights the one on screen; the strip scrolls itself, so
the current thumbnail is brought into the middle of it and the page never moves.
It carries a *Height* and an *Aspect ratio*, and two block styles: *Plain*, a
ring around the current thumbnail, and *Dimmed*, where everything else steps
back instead. A finger drags the strip because it is a scroll container; a
mouse drags it because the strip is handed to the same library the carousel
uses, which is already on the page. A gallery that appends items with **Load More** does not extend
the strip — the module has no picture to add — so the two are not combined yet.

A control that is not wanted is deleted, or hidden the way any block is hidden
— through the editor's own block visibility, which the control blocks leave
enabled. A control goes only where it can drive something: directly inside the
loop, the item template or a navigation row, which its `parent` says.

A control is rendered switched off and stays that way until a carousel is
running under it, so one that ended up beside a grid — or on a page whose module
never loaded — never appears.

*Container width* holds the slides to a width while the carousel itself keeps
the full one, so a full-width gallery starts where the text above it does. It is
switched in the toolbar of the item template, in the menu and the words the
editor uses for the width of any block — *None* is the content width, then
*Wide width*, *Full width* and *Custom*, whose width is typed in the menu.

The carousel panel of the item template carries the rest: *Effect*, *Autoplay*
and its delay, *Repeat*, *Peek*, *Slides per step* (zero
moves a whole screen at a time, and a swipe comes to rest on the same frames an
arrow does), *Slide height* and *Blocks fill the slide*,
*Fade the edges*, *Slide width from content* and *Free scrolling*.

**Controls.** Filter, sort and pagination are server-rendered links and forms.
With JavaScript they swap the gallery in place; without it they work as ordinary
page loads. Both paths land on the same URL.

*Display as dropdown* shows the filter or the sort as a select instead of links.
It is off for the filter and on for the sort, which is how both looked before the
setting existed. A filter shown as a dropdown keeps its items. The editor lists
them under the select while the filter is selected, so labels, order and the Hide
option still apply. Item styles do not, since an option holds text only. An item hidden on some screen sizes is hidden with CSS, which the native
picker of a phone may not apply to an option. While no option stands for the
current state, which happens without "All" or without the default order, the
select leads with a prompt. Without JavaScript a Filter or Sort button submits
the select. With it, changing the select swaps the gallery and the focus stays
on the select.

When the last Load More takes the trigger away from a visitor who pressed it,
the focus moves to the first link of the first item that arrived, or to that
item itself when it holds none. A last page the infinite scroll loads by itself
leaves the focus where it is.

## Anatomy

```
visual-portfolio/loop                      query, block id, layout wrapper
├── visual-portfolio/loop-filter           links, one per term, or a GET form around a <select>
│   └── visual-portfolio/loop-filter-item
├── visual-portfolio/loop-sort             a GET form around a <select>, or links
├── visual-portfolio/item-template         runs the query, renders <ul><li>
│   ├── visual-portfolio/item-image
│   ├── visual-portfolio/item-cover        image with blocks on top of it
│   ├── visual-portfolio/item-title | description | categories | author | date
│   ├── visual-portfolio/item-read-more | item-meta
│   └── any block that reads `vp/item*` context
├── visual-portfolio/loop-carousel-nav        a row for the controls below
│   └── loop-carousel-{previous,next,indicator,autoplay,thumbnails}
├── visual-portfolio/loop-no-results
└── visual-portfolio/loop-pagination
    ├── loop-pagination-{previous,numbers,next} or loop-pagination-trigger
    └── visual-portfolio/loop-pagination-end
```

The five carousel controls declare the **loop** as their ancestor rather than
the row, so the row is only the usual place to keep them: an arrow can sit in a
heading beside the gallery, an indicator under it, thumbnails below both, and a
gallery is free to draw two of either. They find their carousel through the loop
they were dropped in — one item template to a loop — however deeply they were
nested on the way.

The thumbnails are the exception to "no item block queries anything": the strip
is a sibling of the item template and has no items to read, so it resolves the
query itself, the way `loop-no-results` and `loop-pagination` do. That costs
nothing — `get_loop_items()` memoizes per request.

One trigger block covers both the button and the scroll: `loop-pagination-trigger`
carries a `triggerType` of `load-more` or `infinite`, offered as two variations,
and block transforms convert between it and the three paged children.

`loop-pagination-end` holds the blocks shown at the end of the list. The server
shows it on the last page of a gallery that has more than one, prints it hidden
on the pages before it, and leaves it out on a page past the last one, where No
Results speaks. Load More and infinite scroll never reload the page, so once
the page they fetched has no trigger of its own they remove the trigger and
reveal every End of List of the gallery, in whichever pagination block it sits.
Blocks inside it keep their behaviour, since it was printed with the page.

`loop-filter` lists the terms the gallery holds when the page renders, counted
over the whole gallery rather than the page on screen. The items saved in the
block keep their order, label and style. An item whose term has nothing in the
gallery is left out and stays in the content, a term without an item follows the
saved ones in the style of the first saved term item, and a gallery with no term
at all prints no filter. To keep a term off the filter, hide its item with the
block's Hide option; a deleted item comes back with its term.

For posts the terms come from the ids of the unpaged, unordered query and one
grouped count over their term relationships. Visitors who are not logged in
share one answer kept in a transient. Logged-in users are counted on every
render, since what they read depends on who they are, and so are a gallery of
the current query on a search page, which the search text would otherwise
multiply, and a query with a window of dates, which moves with the clock. On a
single post a loop that leaves out that post takes its terms off the shared
answer. The transient is dropped when a public post is saved, published,
unpublished or deleted, when the terms of a public post change, or when a term
is edited or deleted. The editor lists the same terms, adds the new ones in the
same style without marking the post edited, and keeps labels and items when the
query only narrows or widens; another kind of source or other post types rebuild
the items.

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
| `vp/lightbox` | object | Caption sources of the lightbox, `titleSource` and `descriptionSource` |

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
| `vpf_carousel_effects` | filter `( $effects )` | Carousel effects the item template offers, `name => settings`. See below |
| `vpf_loop_popup_enqueue` | action | Fires once on a page where a loop opens the lightbox: where what extends the lightbox loads its assets |
| `vpf_loop_item_picture` | filter `( $picture, $context, $attributes, $block_name, $img_attr )` | The picture of an item image or item cover, before its overlay and link: where media beside the image goes. An item without an image comes in empty and may leave with a picture, cropped by the `img` attributes of the block |
| `vpf_loop_item_click_attributes` | filter `( $attributes, $action, $context )` | The link an item block renders for a click action an extension added; without `href` the item links to its own address |
| `vpf_rest_loop_items_source_configs` | filter | Allow-list of source parameters the editor preview endpoint accepts |

### The query

The loop resolves its query through the same functions the legacy gallery does,
so every one of these keeps working unchanged: `vpf_get_options`,
`vpf_extend_options_before_query_args`, `vpf_extend_query_args`,
`vpf_custom_query_result`, `vpf_custom_items`, `vpf_image_item_args`,
`vpf_post_item_args`, `vpf_custom_filter_terms`, `vpf_wp_get_attachment_image`,
`vpf_get_pagenum_link`. The filter block takes its terms from
`vpf_custom_filter_terms`, else from the taxonomies `vpf_allow_taxonomy_for_filter`
allows; `vpf_extend_filter_items` belongs to the legacy filter markup and is not
applied.

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

### Settings of an extension

Every block of the family declares one free-form attribute, `extensions`, an
object with no keys of its own. An extension keeps its settings for a block there,
under names of its own, and reads them back from `$attributes['extensions']` in a
`render_block_{name}` filter. A block attribute the extension declared itself is
dropped the first time the page is saved in an editor without the extension; a
key of `extensions` is kept. The per-screen columns and tiles of the item template
are the exception, declared by the free plugin beside `layoutColumnCount` and
`layoutTiles`: its preview builds the per-screen column classes from the counts,
and takes the patterns from an extension through `vpf.itemTemplateTiles`.

A value list an extension adds to is left open for the same reason. The carousel
effect is a plain string, and the server draws only an effect this install has;
an effect it lacks is a plain carousel, and the value stays in the block.

The editor lists an extension adds to take `{ name, Item }` entries, where `Item`
is a `ToolsPanelItem`: `vpf.loopPostsFilterItems` (the loop's Filters panel) and
`vpf.itemCoverSettingsItems` (the cover's Settings panel). Without Pro, the free
plugin adds a teaser for each Pro entry the list lacks, under the same `name`:
a panel menu item marked "(Pro)" that shows one line and a link. An entry under
that name replaces it. The Effect list does the same by `value`, with a disabled
option.

### Carousel effects

The free plugin draws three: cover flow, slideshow and fade. An effect is a pair
of scroll driven animations over two boxes the item template already renders. A carousel that plays one wraps every item in them, so an
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
        $effects['acme-flip'] = array( 'columns' => false );

        return $effects;
    }
);
```

```js
addFilter( 'vpf.carouselEffects', 'acme/flip', ( options ) => [
    ...options,
    { label: 'Flip', value: 'acme-flip', columns: false },
] );
```

`columns` says whether the effect leaves the column count to the gallery. An
effect that spreads one slide over the width — a slideshow, a deck of cards —
owns that width, so the count is forced to one and the control is not offered
beside it. Cover flow is the other kind: the count is how many cards fit across
it, and it keeps the control.

`repeat` says whether the effect can be run round in a loop, and is `true`
unless the effect says otherwise. The loop is carried by moving the slides one
end has run out of to the other, so an effect that pins its slides in place —
a deck — has nothing to move: with `repeat: false` on both sides the *Repeat*
setting is left out of the page and the control is greyed with the reason. Two
carousels are left out of the loop whatever the effect: one whose slides are
their own width, since the loop is counted a step per slide, and one whose
slides all fit the frame, which has nothing to run round. The first is settled
on the server. The second is the frame's to say. Three slides fit three columns
on a desktop and overflow the one column of a phone, so the module counts the
slides against the columns, and counts again whenever the columns change,
starting the carousel over as a loop or as a plain one. An RTL carousel runs as
a plain one as well: the carousel library carries its loop in the scroll
positions of LTR only. On an RTL site the server leaves the loop out and the
control is greyed with the reason; a block made RTL on an LTR page is left out
by the module.

`peek` says whether the effect leaves an edge for a slide of the next one to
show at, and is `true` unless the effect says otherwise. An effect that lays
the slides out itself (cover flow turns them about the middle, fade and a deck
hold them over the frame) has none, so with `peek: false` a saved *Peek* is
left out of the page and the control is greyed with the reason.

The list is given the classes `vp-carousel-effect` and `vp-carousel-acme-flip`,
and the stylesheet is the install's own to enqueue —
`render_block_visual-portfolio/item-template` is where Pro does it. Everything
geometric belongs inside
`@supports (animation-timeline: view())`, for an LTR list (`:dir(ltr)`) and
under `prefers-reduced-motion: no-preference`: without it the two boxes are
still rendered and the carousel is the plain carousel it would have been anyway,
which is also what a visitor who asked for less motion gets.
Firefox and Safari before 26 have no such timelines, and Chromium measures an
RTL list's timelines from the wrong end. The plugin keeps them by hand in both
cases, for every effect the install has, with a classic script that runs on the
`vp-carousel-start` and `vp-carousel-stop` events below. It writes on each slide
how far through `cover` and through `contain` a view timeline would have it, as
`--vp-carousel-cover` and `--vp-carousel-contain`, and marks the list
`vp-carousel-scripted`. An effect then states the same animations for that
marked list, paused and held at those times, the way `_carousel-effects.scss`
does for the free ones. Under RTL the next slide comes from the left, so an
RTL list carries `--vp-carousel-direction: -1`, and every horizontal move and
turn of an effect's keyframes is multiplied by it.

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

The item template previews a screen through three JavaScript filters, each
given `{ attributes, deviceType }`: `vpf.itemTemplateTiles` with the desktop
pattern, `vpf.itemTemplateColumns` with the column settings, and
`vpf.itemTemplateEffectDriver` with what runs a carousel effect where the
browser has no timelines, the plugin's own driver by default.
`vpf.itemTemplatePatternEditor` is given `null` and `{ value, onChange }` and
returns what edits the tiles notation under the presets. Pro answers the tiles,
columns and pattern editor filters. The notation itself — `parseTiles`,
`serializeTiles`, `getTileStyles`, `formatTilesNumber` and `tilesLimits` — sits
in the `visual-portfolio/components` store beside `TilesPresetsSelect`, with
`getViewportBreakpoints()` for the breakpoints the editor previews a tablet and
a phone at.

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
| `visual-portfolio/item-template` | `build/gutenberg/blocks/item-template/view.js` | Justified and carousel layouts, the carousel controls (`actions.carouselPrev`, `actions.carouselNext`, `actions.carouselGoTo`), native masonry detection |
| `visual-portfolio/item-cover` | `build/gutenberg/blocks/item-cover/view.js` | The `fly` effect only |

Compose onto a namespace with another `store()` call, and **add** actions rather
than replace the ones already there.

Nothing in these modules is required for the gallery to work. Every control is a
real link or a real form resolved by the server; the modules replace the page
load with a region swap, and hand the navigation back to the browser whenever
they cannot. `state.isEnhanced` is how a server-rendered fallback control — the
submit button of a filter or sort form — knows to take itself away.

They are directives and actions and nothing else — between 0.4 and 4.4 KB each,
with `@wordpress/interactivity` from the WordPress bundle as the only static
dependency. Everything larger is fetched at the moment it is used and never
bundled: `@wordpress/interactivity-router` on the first region swap, the Blossom
carousel from the address on the markup. A gallery that is a plain grid
downloads neither.

The layouts that need a library use `masonry` and `imagesloaded` from WordPress
and a jQuery-free build of fjGallery registered under a handle of the family's
own. jQuery comes in with the lightbox only.

### Lightbox

The lightbox is the classic gallery's: `VPPopupAPI` with the vendor chosen in
Settings, Fancybox or PhotoSwipe, and every Popup Gallery setting. An item
carries the same `<template class="vp-portfolio__item-popup">` a classic item
does, built by `Visual_Portfolio_Get::get_item_popup_output()` and filtered by
`vpf_popup_output`; its triggers are anchors with `data-vp-popup` and the full
size image as `href`. `build/gutenberg/popup/view.js` opens the vendor with the
items of the list, one slide per item, and a stand-in for the classic gallery
instance per loop (`$item`, `uid`, `options`, `isPreview()`, `emitEvent()`), so
the vendor events (`initFancybox.vpf`, `beforeInitPhotoSwipe.vpf` and the rest)
fire on the loop element with the stand-in first, as they do for a classic
gallery. The caption sources are the loop's `lightbox` attribute,
`titleSource` and `descriptionSource`, with the values of the classic Title and
Description Source; defaults `item_title` and `item_excerpt`. An item the
lightbox has nothing to show and that has an address of its own links to it.

The click actions of the item blocks are None, Open the item and Open in
lightbox; an extension adds its own to the editor through the
`vpf.itemClickActions` JavaScript filter (`{ label, value, icon }`) and renders
them through `vpf_loop_item_click_attributes`. `VPPopupAPI.getLoopGallery( loop )`
gives the stand-in of a loop to a script that opens the lightbox itself, so its
events name the same gallery.

### Carousel events

The carousel takes commands as DOM events on the list element of an item
template:

| Event | Payload |
|---|---|
| `vp-carousel-go-to` | `detail.index` — scroll to that slide |
| `vp-carousel-autoplay` | `detail.playing` — `false` holds autoplay, `true` releases it |

And announces itself on the same element, bubbling, so that a script outside
the module can run beside a carousel for as long as it runs:

| Event | When |
|---|---|
| `vp-carousel-start` | the module has started the carousel, once per start — a Load More starts it again |
| `vp-carousel-stop` | the module is about to let go of it |

Holding autoplay is not the same as stopping it: the pause a pointer or a focus
already applies keeps working underneath, and releasing the hold does not
override it.

Nor does it override the visitor. The *Carousel Play and Pause* button writes
its own answer down separately and sends the same event with
`detail.source: 'visitor'`; a hold released by anything else leaves that answer
alone, so closing a lightbox never starts a carousel somebody had stopped.

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
therefore the URL with no parameters at all. A filter or sort form submitted
without JavaScript is the exception. It names its parameter even for "All" or the
default order, and an empty value reads the same as none.

**The portfolio archive.** A loop with the Current Query source on the page mapped
to the portfolio archive keeps its category and its page in the path, the way the
classic block does. Its filter links to /portfolio-category/{slug}/ and "All" to
the archive page, its pages are /page/N/ under the current address, and its
filter lists the categories of the whole archive with the one of the address
active. With plain permalinks the archive has no paths of its own, and the loop's
parameters address it the way they address any page. The page the plugin creates
for the archive still holds the classic block while the family is experimental.

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
