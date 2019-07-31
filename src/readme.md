# Visual Portfolio #

* Contributors: nko
* Tags: portfolio, gallery, works, masonry, popup
* Requires at least: 4.0.0
* Tested up to: 5.2
* Requires PHP: 5.4
* Stable tag: @@plugin_version
* License: GPLv2 or later
* License URI: http://www.gnu.org/licenses/gpl-2.0.html

Portfolio layouts visual editor. Masonry, justified, tiles, carousel, slider, coverflow, custom posts, custom images.

## Description ##

Visual Portfolio let you create beautiful portfolio layouts. Generates shortcode to show portfolio or any custom post types using Masonry, Justified, Tiles or Carousel layouts.

### Links ###

* [Live Demo](https://visualportfolio.co/)
* [Documentation](https://visualportfolio.co/documentation/getting-started/)
* [GitHub](https://github.com/nk-o/visual-portfolio)

## Features ##

* Visual preview for portfolio layouts shortcode builder
* Templates for theme developers
* 4 predefined layouts:
  * Masonry
  * Grid
  * Justified (Flickr)
  * Tiles
  * Slider (+ Carousel, Coverflow)
* 3 predefined hover effects:
  * Fade
  * Emerge
  * Fly
  * Default (no hover effect)
* Infinite Scroll
* Load More
* Paged layouts
* Filtering
* Sorting
* Popup gallery (YouTube and Vimeo supported)
* Custom item gutters
* Stretch option (if you want to break the fixed container of the page)
* Custom image sets
* Custom posts type layouts (not only portfolio)
  * Posts by type
  * Posts by specific ID
  * Posts by taxonomies
  * Custom order
* Custom CSS for each portfolio layouts
* Shortcode generated, so you can place unlimited portfolio layouts on the page
* Gutenberg WordPress builder supported
* WPBakery Page Builder page builder supported

## Real Usage Examples ##

* [Skylith - Multipurpose Gutenberg Theme](https://demo.nkdev.info/#skylith)
* [Piroll - Portfolio Theme](https://demo.nkdev.info/#piroll)
* [Snow - Portfolio Theme](https://demo.nkdev.info/#snow)

## Screenshots ##

1. Visual Portfolio builder p.1
2. Visual Portfolio builder p.2 (custom images set)
3. Visual Portfolio builder p.3 (custom styles)
4. Portfolio items admin
5. Visual Portfolio layouts admin
6. Example: Tiles + Stretch
7. Example: Justified Gallery (Flickr)
8. Example: Masonry + Posts
9. Example: Carousel and Coverflow
10. Example: Tiles + Custom hover color
11. Example: Tiles + Paged pagination
12. Example: Masonry
13. Example: Tiles + Popup gallery
14. Example: Popup Gallery

## Installation ##

### Automatic installation ###

Automatic installation is the easiest option as WordPress handles the file transfers itself and you don’t need to leave your web browser. To do an automatic install of Visual Portfolio, log in to your WordPress dashboard, navigate to the Plugins menu and click Add New.

In the search field type “Visual Portfolio” and click Search Plugins. Once you’ve found our plugin you can view details about it such as the point release, rating and description. Most importantly of course, you can install it by simply clicking “Install Now”.

### Manual installation ###

The manual installation method involves downloading our Visual Portfolio plugin and uploading it to your webserver via your favourite FTP application. The WordPress codex contains [instructions on how to do this here](https://codex.wordpress.org/Managing_Plugins#Manual_Plugin_Installation).

## Frequently Asked Questions ##

### How to disable enqueued plugins (JS, CSS) on frontend ####

[https://visualportfolio.co/documentation/developers/disable-enqueued-plugins-js-css/](https://visualportfolio.co/documentation/developers/disable-enqueued-plugins-js-css/)

### How to use my custom taxonomy as filter ####

[https://visualportfolio.co/documentation/developers/custom-taxonomy-for-filter/](https://visualportfolio.co/documentation/developers/custom-taxonomy-for-filter/)

### How to change default templates and styles ####

[https://visualportfolio.co/documentation/developers/changing-default-templates-and-styles/](https://visualportfolio.co/documentation/developers/changing-default-templates-and-styles/)

### DEV: WP filters ####

[https://visualportfolio.co/documentation/developers/wordpress-filters/](https://visualportfolio.co/documentation/developers/wordpress-filters/)

### DEV: Controls ####

[https://visualportfolio.co/documentation/developers/wordpress-filters/controls/](https://visualportfolio.co/documentation/developers/wordpress-filters/controls/)

### DEV: jQuery events ####

[https://visualportfolio.co/documentation/developers/jquery-events/](https://visualportfolio.co/documentation/developers/jquery-events/)

### DEV: jQuery methods ####

[https://visualportfolio.co/documentation/developers/jquery-methods/](https://visualportfolio.co/documentation/developers/jquery-methods/)

## Changelog ##

= 1.13.0 =

* added Fancybox support
* added option to avoid posts duplication
* added posts classes (such as hentry) on portfolio items
* added options to load images title and description automatically from meta data
* added support for WP Smush and WP Rocket lazy loading options
* added Items Minimal Height option for Slider layout
* added new WordPress filters:
  * `vpf_extend_image_controls`
  * `vpf_extend_query_args`
  * `vpf_extend_filter_items`
  * `vpf_extend_sort_items`
* improved placeholders function performance
* changed single post tag to `artricle`
* prevent lazy loading if `data-src` attribute already added on the image (fixed conflicts with some 3rd-party plugins)
* prevent lazy loading on AMP pages
* fixed Jetpack `jetpack_lazy_images_skip_image_with_attributes` filter name

= 1.12.2 =

* fixed tiles size on small screens
* fixed fly effect position (on 4k screens slightly visible part of overlay)

= 1.12.1 =

* fixed Vimeo and other vendors video popup loading
* fixed Tiles sometimes wrong position calculation (for example in `2|2,1|1,1|1,1|`)
* fixed overlay position bug in default theme in Fade and Fly effects

= 1.12.0 =

* changed video oembed loading method
    * no more php oembed since it may be too heavy to load pages (used JS instead)
    * no more video thumbnail loading if no featured image specified in post
* fixed portfolio categories and tags capabilities
* fixed &lt;a&gt; tag in fly and fade effect when all meta disabled

= 1.11.1 =

* fixed FireFox image blinking in Fade effect
* fixed name of sorting by date items ('newest' is actually 'oldest')
* fixed conflict with elementor carousel event
* fixed conflict with SG Optimizer (remove noscript tag)
* fixed w3 validation errors (figcaption tag may only be a child of figure tag)

= 1.11.0 =

* added Sort controls
* added Filter and Sort Dropdown styles
* added 'Portfolio Manager' and 'Portfolio Author' roles
* added portfolio custom taxonomies filter in admin page
* added slider thumbnails support
* added images and show it if javascript disabled (mostly for screen readers)
* added photoswipe zoom effect
* disabled image popup on items with custom URL
* moved popup title and description settings to Layouts options
* changed popup gallery tap actions (don't close on tap and toggle popup controls instead)
* fixed Elementor popup gallery conflict
* fixed roles for portfolio post types
* fixed IE carousel items invisible
* fixed items gap conflict with Elementor
* fixed carousel "Slides per view" auto option with static or dynamic "Items height" option
* fixed slider fade effect + default items style items width
* fixed rtl admin layout styles

= 1.10.0 =

* added Grid layout
* added Order by and Order direction for Images Content Source
* added Pause on Mouse Over option in Slider with Autoplay
* added Free Scroll Sticky option in Slider
* added figure and figcaption tags in portfolio items in layouts
* added 'author' supports to portfolio posts
* added new jQuery events 'beforeInitIsotope', 'beforeInitFjGallery', 'beforeInitSwiper', so the options could be changed before plugins init
* changed meta blocks top margin
* fixed post-based custom taxonomy and specific posts selector saving in WordPress 5.1
* fixed error because of mb_strtolower existence
* fixed popup gallery when Attachment used as post type
* fixed fade meta max width in IE11
* fixed Gutenberg block preview styles
* removed code for paged single portfolios (as portfolio archives uses our own GET variable)

= 1.9.3 =

* added WP 5 compatibility in readme
* added support for Ghost Kit 2.0 update
* fixed popup gallery height when admin bar showed

= 1.9.2 =

* added page-attributes in portfolio post type (Order attribute)
* fixed Menu Order in post based source (didn't work at all)
* possible fixed iOs isotope images position (sometimes broken)

= 1.9.1 =

* changed lazyload image preloader z position (not able to click on items links)
* fixed Swiper styles 404
* fixed PhotoSwipe top position when showed WP admin bar
* fixed PhotoSwipe incorrect unique classname (not able to destroy it)

= 1.9.0 =

Note: Don't forget to clear cache after plugin update. Changed portfolios with pagination enabled, so it may be broken.

* added "Mousewheel Control" option in Slider
* added fade-in transition for lazyloaded images
* added automatic fill title and description fields when new images added in Images Content Source
* added gutenberg block transform from shortcode
* updated vendor plugins
* fixed carousel position on first load (mostly on mobile devices)
* fixed portfolio with custom taxonomies in post based + OR relation and filter active
* fixed paged portfolios load on single posts and in archives. Now uses own get variable 'vp_page'

= 1.8.2 =

* added wp actions in registering controls and metaboxes
* updated Conditionize script

= 1.8.1 =

* fixed Click Action Target default value

= 1.8.0 =

* added lazyload preloader placeholder animation
* added Target option for Click Action URL
* added ghostkitSR support in Gutenberg block (animate on scroll functionality)
* added condition to show meta block in templates (less html if disabled showing meta data)
* added possibility to resize custom CSS Editor
* added Menu Order in post based source
* added Mask property in control styles (for developers)
* added filters to extend default controls for layouts, items styles, filters and paginations
* added filter for control arguments `vpf_print_layout_control_args` (developers may change controls settings in layouts editor)
* changed condition script for settings in layout editor, should improve performance
* changed popup gallery z-index to 1500 (like in WooCommerce)
* changed initialization method to Mutation Observers (portfolio will init automatically after ajax load)
* removed wp_unslash from custom CSS code save (because some specific styles removed)
* prevent session start in admin pages (this only needs in paged with random order)
* fixed default sorting of selected/excluded posts and taxonomies in post based content source
* fixed content source images disappear when in image meta added " symbol
* fixed layouts fetch error in Gutenberg 4.2
* fixed flex-wrap in fade style
* fixed lazyload images in IE11
* fixed popup gallery in IE11
* fixed validation error when trying to use URLs like "/something" in content source images
* minor changes

= 1.7.2 =

* added link to Documentation in admin menu
* added **vpf_extend_tiles** filter
* fixed custom jquery events triggering

= 1.7.1 =

* fixed categories show in filter
* fixed fade and fly items flex-wrap

= 1.7.0 =

* added support for Gutenberg 3.7.0
* added setting for custom taxonomies to show in portfolio filter
* added support for WooCommerce categories in portfolio filter
* added settings for the title and description popup gallery caption
* added Read More button option for Default Items Style
* added dropdown in top admin menu with the list of available portfolios on this page
* added generation placeholders on the fly (no more need to regenerate thumbnails to get placeholder)
* fixed popup image title color (were dark)
* fixed popup video play after going to the next slide

= 1.6.5 =

* added options for texts in filter and pagination
* fixed paged /portfolio/ page (https://wordpress.org/support/topic/paging-infinite-loading-not-working/)
* fixed vertical images quality
* fixed conflict with Jetpack lazy
* fixed filter shortcode output

= 1.6.4 =

* fixed font-awesome dependency

= 1.6.3 =

* added portfolio preview iframe in Gutenberg block
* changed portfolio default image sizes (since we use Lazyload, we can use larger image sizes)
* updated FontAwesome to 5.2.0
* fixed Slider styles when used 2 sliders on the page
* removed imagesloaded dependelcy
* disabled 'with_front' in portfolio post type (thanks to [https://wordpress.org/support/topic/change-the-permalink-structure-2/](https://wordpress.org/support/topic/change-the-permalink-structure-2/))

= 1.6.2 =

* additional check for isotope and fjGallery existence
* added init outside of 'ready' event (possible faster initialization)
* fixed lazyload possible conflict with the 3rd-party themes/plugins

= 1.6.1 =

* fixed validator error "The sizes attribute may be specified only if the srcset attribute is also present"

= 1.6.0 =

* NOTE: strongly recommend to regenerate thumbnails on your site using [this plugin](https://wordpress.org/plugins/regenerate-thumbnails/)
* added lazy loading for images
* added will-change styles in templates (animations should work smoother)
* added new Tiles
* added pagination paged arrows options
* added align wide and full options in Gutenberg block
* added support for custom controls styles (developers could create their own controls and add custom styles). Read FAQ for more information
* added custom control options in filter templates (helpful for developers)
* added pagination style and possibility to extend it from 3rd-party code
* added portfolio item comments number data for templates
* added 'resized' event for developers
* always enqueued main style on all pages
* changed carousel arrows shadow
* fixed validation errors (added space between data attributes)
* fixed video popup position
* fixed portfolio bugged reload in preview
* renamed nk-spinner to vp-spinner
* removed double slash in custom theme template styles urls
* removed imagesloaded usage

= 1.5.0 =

* added Slider (+ Carousel, Coverflow) layout
* added capabilities check when generated preview page
* improved responsive calculation algorithm
* disabled preview page caching by some popular caching plugins
* fixed isotope newly loaded items jumping
* fixed conditions usage on controls in 3rd-party extensions
* fixed PHP notices when trying to extend portfolio options
* fixed Data source selected item (was always Post selected)
* fixed Default filter show
* fixed Date format control UI
* fixed confirmation message when leaving layouts editor without change

= 1.4.3 =

* added check for template existance before include it (to prevent errors when 3rd-party devs don't added templates)
* fixed random order duplicates when used pagination
* fixed errors in PHP < 5.5
* disabled Infinite Load pagination in the Portfolio preview
* changed templates inclusion to support 3rd-party extensions
* removed background color from the load button when loading or no items
* renamed all events prefix from vp to vpf

= 1.4.2 =

* prepared code for extending from 3rd-party developers
* fixed saving unchecked toggle values in Layouts editor (Show title, Show categories, etc...)

= 1.4.1 =

* added filters to disable enqueued frontend plugins (see FAQ section)
* added Custom URL option to custom images set
* added support for negative number of items per page for custom images set (to show all available items on the page)
* fixed custom images show when disabled pagination
* fixed custom images filters count show

= 1.4.0 =

* added Justified layout
* added custom user images support in Content Source settings
* added Gutenberg block to easily insert layouts
* added Random order in Post-Based content source
* added spinner to load more button
* added setting to change portfolio slug
* fixed video playing when popup were closed
* fixed filter in post-based with taxonomies selected
* fixed w3c validation error when enqueuing template styles
* fixed specific posts selector ajax result
* fixed publish button click (don't show confirm alert)
* changed "No More" button text
* changed active filter buttons background color
* updated FontAwesome to 5 version
* minor changes

= 1.3.0 =

* improved CSS editor (added autocomplete hints; selectors hint; showing errors; preventing save when editor has errors)
* improved layouts editor interface
* added shortcode for portfolio filter (you can use filter outside of portfolio wrapper)
* added possibility to change date format
* added frontend WPBakery Page Builder support
* added support for post ordering plugins (Intuitive Custom Post Order)
* fixed popup video jumping
* fixed some php errors in preview
* fixed photoswipe duplicates if on the page > 1 visual portfolio with popup gallery
* fixed permalinks flush on activation and deactivation

= 1.2.1 =

* fixed video format conflict with theme formats
* fixed php error about undefined index
* fixed buttons hover border issue in default themes

= 1.2.0 =

* added support for oEmbed videos (YouTube and Vimeo supported)
* added settings for popup gallery
* added share button in popup gallery
* added "Edit Portfolio Item" button in admin menu on frontend
* added option to show filter items count
* added option to show publised date in human format
* added notice if no items found
* added support for jetpack portfolio type filter
* added portfolio tags support
* updated color picker to support WordPress 4.9
* fixed PhotoSwipe small images loading on mobile devices (performance improvements)
* prevent load more click if href is empty
* minor fixes and changes

= 1.1.4 =

* fixed conflict with WooCommerce Photoswipe gallery

= 1.1.3 =

* added ID in title to tinymce and visual composer dropdowns
* fixed fly effect transition in Safari
* fixed tiles filter jumping
* fixed iframe height calculation if in theme set html height 100%;

= 1.1.2 =

* added options to hide arrows and numbers from the paged pagination
* added support for WPBakery Page Builder
* added class attribute in shortcode
* added excerpt field to the portfolio post type
* removed enqueued portfolio scripts and styles from the admin builder
* improved fly effect, now direction calculated more correct
* changed all items-styles hover effects
* fixed showing excerpt from excerpt post fields
* fixed php short tag usage
* fixed conflict with WPBakery Page Builder and old isotope plugin

= 1.1.1 =

* fixed php enqueue errors

= 1.1.0 =

* preview changed to iframe - now all the portfolio styles showed the same as on your website frontend. Now iframe reloaded when changed all options (Customizer experience here)
* added wrapper to filter and pagination
* added tinyMCE dropdown with list of visual-portfolio shortcodes
* added CodeMirror for custom CSS field
* added loading overlay
* changed paged arrows to font-awesome
* changed default templates style
* changed popup gallery - now used image meta title and description
* fixed popup gallery buttons style conflict with default WordPress themes
* fixed styles rendering on initialization (without timeout now)
* fixed isotope items animation and remove
* fixed preloader opacity transition (added wrapper)
* fixed showing paged pagination if no items
* minor changes

= 1.0.1 =

* added custom CSS field
* added object-fit polyfill to support old browsers
* added custom image sizes
* added responsive
* added wrapper to items layout
* removed margin from main vp container
* fixed array option retrieve error
* minor changes

= 1.0.0 =

* initial Release
