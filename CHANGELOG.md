# Changelog

All notable changes to this project will be documented in this file.

= 3.4.1 - Nov 11, 2025 =

* fixed sticky posts appearing in Manual Selection posts source
* **Pro:**
* fixed option Ignore Sticky Posts incorrectly change output for Current Query and Custom Query posts sources
* fixed option Ignore Sticky Posts appear when Manual Selection posts source selected

= 3.4.0 - Nov 5, 2025 =

* added custom lightbox gallery support using `.vp-lightbox-gallery` class
* added lightbox event support for third-party galleries. For example, JS events like `initFancybox` and `beforeInitPhotoSwipe` now also fire on non-portfolio galleries
* added SEO optimizations
* fixed register_script to use in_footer true by default, which we changed in recent plugin updates and broke some features, for example - iframe preview resizer
* fixed lazy loading conflict with WordPress Lightbox block
* fixed pattern context bug and posts query type handling (fixed issue with displaying block when WooCommerce installed)
* fixed RSS feed generation for portfolio archives
* fixed controls persistence and rendering in Saved Layouts
* fixed taxonomy filter counts to use actual query results
* fixed experimental filter block to work with nested loop blocks
* skip lazy loading from applying to images with fetchpriority="high" attribute
* **Pro:**
* migrated VK to new api domain
* deprecated Google Photos integration
* fixed click action for custom image
* fixed updater api

= 3.3.16 - Jun 26, 2025 =

* started our way to transition to modern blocks. Added new **experimental** blocks:
  * DON'T USE THESE BLOCKS ON PRODUCTION! Development is still in progress and we may break these blocks.
  * Gallery Loop
  * Filter by Category
  * Pagination Wrapper
    * Infinite
    * Load More
    * Next
    * Previous
    * Numbers
  * Sort
* **Pro:**
* fixed proofing gallery hash links in comments
* minor fixes

= 3.3.15 - Jun 4, 2025 =

* fixed broken css and js urls for lazyload fallback (used in legacy browsers only)
* **Pro:**
* updated used X API to v2
* fixed Google Photos integration API errors
* fixed X integration caching issue
* fixed social integration download image resolution conversion during compression
* fixed click action for item with custom popup image
* fixed updater caching issue that sometimes caused Forbidden errors

= 3.3.14 - May 25, 2025 =

* tested with WordPress 6.8
* fixed WPML error in Saved Layouts
* changed links from visualportfolio.co to www.visualportfolio.com
* rename Twitter to X
* **Pro:**
* migrate Pro plugin from Paddle to LemonSqueezy
  * added support for affiliate links
* fixed _load_textdomain_just_in_time notice

= 3.3.13 - Mar 25, 2025 =

* fixed broken Swiper when installed Elementor 3.28
* fixed rare bug with displaying category links on archive pages
* **Pro:**
* added support for more Audio formats in popup Audio links (https://www.visualportfolio.com/docs/projects/project-formats/#supported-audio-platforms)
* added support for more Video formats in popup Video links (https://www.visualportfolio.com/docs/projects/project-formats/#supported-video-platforms)
* fixed wrong infinity scroll loading when permalinks set to Plain
* fixed GIF hover image reset when hovering on inner overlay elements

= 3.3.12 - Dec 20, 2024 =

* fixed order by Image Title when both Title Source and Description Source is set to None
* fixed Portfolio Manager role editing Saved Layouts when Project custom post type disabled
* fixed image selection popup in block editor JS error

= 3.3.11 - Dec 15, 2024 =

* added WP 6.7 compatibility
* fixed id attribute rendering
* fixed some styles in editor
* **Pro:**
* fixed Advanced Click Actions sometimes not properly displaying a Popup
* fixed title display error in popup caption
* fixed Instagram integration - you must reconnect to use the Instagram API instead of deprecated Instagram Basic Display API. Learn more: <https://www.visualportfolio.com/docs/social-feeds/instagram/>

= 3.3.10 - Sep 30, 2024 =

* fixed possible XSS via stored HTML and Fancybox script

= 3.3.9 - Jul 17, 2024 =

* fixed Sort by Date option not working correctly
* fixed PHP warning when image was removed from Media library but still exists in the gallery
* fixed WPRocket delay JS conflict with lazyloading

= 3.3.8 - May 29, 2024 =

* **Pro:**
* fixed click action on gallery items with a custom URL in saved layouts

= 3.3.7 - May 27, 2024 =

* fixed displaying date on gallery items
* fixed gallery images resets data in saved layouts

= 3.3.6 - May 16, 2024 =

* fixed DESC order for "Manual" and "Rand" image orders
* rename "Default" order to "Manual"
* **Pro:**
* fixed Hover CSS Filter styles loading if there is no Default CSS Filter provided
* fixed custom image URL in the gallery, applied from the first item to all other items

= 3.3.5 - May 15, 2024 =

* fixed PHP warning from `array_key_exists` function
* fixed wrong attribute output for select control with bool value
* fixed gallery sorting algorithm, now it should work correctly

= 3.3.4 - May 11, 2024 =

* fixed dynamic selector block options rendering on the frontend.

= 3.3.3 - May 11, 2024 =

* fixed custom title tag XSS vulnerability (properly escape the custom tag and prevent using non-predefined values)

= 3.3.2 - Apr 30, 2024 =

* add more sort options in image galleries: Item Title, Item Description, Image Title, Image Description, Image Caption, Image Alt
* improved image gallery sort code - images with empty field will be always placed after items with non-empty field
* fixed the behavior of the "All" filters link when the portfolio archive page set as the home page
* **Pro:**
* fixed Skin typography settings error in WP 6.5
* fixed image gallery non-working Hover and Custom Popup settings when you change it
* fixed horizontal thumbnails displaying in Fancybox
* fixed displaying Pro plugin settings opacity

= 3.3.1 - Mar 13, 2024 =

* added support for Download button in PhotoSwipe
* added Horizontal Order option to Masonry layout
* added support for lazy loading inside AJAX callbacks
* added support for WooCommerce images lazy loading
* improved block gallery images in editor - allow selecting images with shift key pressed
* changed Justified Row Height option minimum threshold to 20
* fixed gallery images in block editor Uncategorized filter
* fixed image blinking after filter in Masonry, Tiles and Grid layouts
* removed stagger delay from Masonry, Tiles and Grid layouts because it is not working properly in large galleries
* minor improvements
* **Pro:**
* fixed Overlay Under Image option in Emerge and Caption Move styles

= 3.2.4 - Feb 26, 2024 =

* added stagger delay for Masonry, Grid and Tiles layouts
* added proper horizontal order for Masonry layout
* added possibility to edit gallery images in bulk
* added gallery images filter by category in editor
* fixed Portfolio menu item name change when on Taxonomy archive page
* fixed duplicating Portfolio page after WordPress XML file import
* **Pro:**
* added Twitch avatar caching to fix missing link
* added possibility to add any block on Proofing pages
* fixed Grid vertical align option
* minor fixes

= 3.2.3 - Dec 12, 2023 =

* fixed displaying editor block when creating new Saved Layout

= 3.2.2 - Nov 29, 2023 =

* added support for asset file change time when enqueue without .asset.php - better support for caching plugins
* fixed Elementor preview stopped working

= 3.2.1 - Nov 29, 2023 =

* fixed Pro plugin path and url detection - now it should work correctly when Free plugin is removed
* fixed sitemap fatal error

= 3.2.0 - Nov 25, 2023 =

* added support for proper SEO meta URLs in Portfolio archives and Filtered pages in Yoast SEO, AIOSEO, Rank Math
* added Skin option to change item title tag
* added `vpf_extend_posts_source` filter
* added check for image existence when resave the gallery from the popup
* added check for caption is empty and don't print the figcaption
* added support for new Ghost Kit extensions
* updated blocks apiVersion to 3 to allow iframe usage in editor
* fixed PHP 8.* warning
* fixed lazy loading script styles added event when 3rd-party lazy loading used
* fixed lazy loading without srcset
* fixed lazy loading placeholder displaying when used Hover image
* fixed width calculation for lazy loading and picture tag
* fixed lazysizes script version number
* fixed lazy loading conflict with WP Rocket Delay JS setting
* fixed typo in `DONOTCACHEOBJECT` constant
* fixed featured image focal point control conflict in WP 6.3
* fixed Grid layout preview JS error in editor
* simplified lazy loading placeholder animation
* changed lazy loading styles to use modern :has() CSS (with fallback for old browsers)
* removed jQuery usage from lazy loading script
* **Pro:**
* IMPORTANT: changed the Pro plugin to standalone, which is not requires the Free version installed anymore
* added Setup Wizard support to all Social Account controls
* fixed Share URL and paged gallery wrong URL
* fixed mime detection for images in Flickr social feeds
* fixed init conditionize script once opened Social settings panel

= 3.1.3 - Jul 1, 2023 =

* improved PhotoSwipe popup zoom for large vertical images
* changed 'Projects' CPT label to portfolio page name
* changed images and overlay border-radius to clip-path (better performance)
* fixed unexpected JS error when Sortable control have an undefined value (happens in Advanced Click Action for a single user after migration from older plugin version)

= 3.1.2 - Jun 6, 2023 =

* renamed `Portfolio Items` to `Projects`
* fixed playing videos in background in PhotoSwipe
* fixed portfolio archive hidden pagination in some cases
* fixed portfolio archive friendly URL in load more button
* fixed portfolio archive filter and sort paged URLs

= 3.1.1 - May 17, 2023 =

* fixed Archive mapping PHP notice when no Archive Page ID available
* renamed `Carousel` to `Slider`

= 3.1.0 - May 12, 2023 =

* added support for gradients in overlay backgrounds
* added `Restore Focus` setting to the Popup gallery
* added support for GET variables `vp_page`, `vp_filter`, `vp_sort`, `vp_search` in canonical and short links
* added PHP filter `vpf_global_data`
* changed CSS to use Gap instead of hack with margins
* changed popup data `<div>` to `<template>`. We need this change for 3 reasons:
  * prevent popup data from indexing
  * prevent a lot of not needed content rendering
  * in some cases this content causes bugs with layout styles
* changed default popup title and description source for Posts content. Use Image title and description, and not the post title and content
* changed overlay displaying from `focus` to `focus-visible`
* fixed Popup data displaying even when Click Action is URL
* fixed transition caption transition CSS variable name in the Classic skin
* fixed Skin editor error on WP 6.0 because of using `NavigatorToParentButton` component
* fixed Select control dropdown is not visible in editor when opened popup

> v3 Migration Guide – <https://www.visualportfolio.com/docs/troubleshooting/migration-to-v3/>

= 3.0.0 - Apr 13, 2023 =

* completely reworked Skin options and some UI elements of block controls this helped us to structure deep Skin customizations such as:
  * Typography control
  * Dimensions control (overlay padding, caption items gap, etc)
  * Blend Mode for overlay
  * Image transform for normal and hover states
  * Image border radius for normal and hover states
* changed the structure of Skin templates - use classes and CSS variables with `overlay` and `caption` names where appropriate
* added caption support for popup in video items
* improved controls dynamic CSS rendering - merge all styles with same selector with better formatting
* improved filter and pagination URLs to friendly on portfolio archive page (good for SEO)
* updated Swiper to v8.4.7
* changed template styles version - use dynamic value based on `filemtime` function return
* fixed portfolio category archives redirect when portfolio archive set as Front Page
* fixed pagination on portfolio taxonomy archive pages
* fixed canonical tags usage on portfolio category archives (fixes problems with SEO)
* fixed wrong Current Query generated when changed Portfolio on Front Page setting
* fixed Slider dynamic items height with Classic Style wrong items width
* fixed Slider dynamic items height with FireFox wrong items width
* fixed Slider items height incorrect size when used Items Height and Minimal Height options
* fixed conflict with Elementor new Swiper library (added in Elementor v3.11.0)
* fixed Elementor double lightbox on the pages, which does not use the Elementor page builder
* removed hardcoded CSS for popup top position based on admin bar height, use `--wp-admin--admin-bar--height` variable instead
* fixed error when using an array in control `sanitize_callback` (only in custom user controls)
* renamed `Items Style` → `Skin`
* renamed `Items Click Action` → `Click Action`
* new hooks for developers:
  * added more data to `vpf.editor.controls-render-inner-data` JS filter
  * PHP `vpf_register_block_attribute_data`
  * PHP `vpf_register_block_attributes`
  * PHP `vpf_items_style_builtin_controls`
  * PHP `vpf_pagination_item_data`
  * PHP `vpf_controls_dynamic_css_value`
  * PHP `vpf_controls_dynamic_css_styles_array`
  * JS `vpf.editor.controls-dynamic-css-value`
  * JS `vpf.editor.controls-dynamic-css-styles-object`
  * jQuery `afterShowFancybox`
* minor changes

= 2.22.0 - Feb 12, 2023 =

* added support for Youtube Shorts in popup
* added possibility to start AJAX loading when already in loading state (fixes the Search module conflict with concurrent requests)
* added support for displaying Portfolio Categories and Portfolio Tags in the `post-terms` block
* fixed filter, sort and pagination URLs to display absolute URLs
* fixed creating notices over on over again if no items found after AJAX requests
* fixed deprecated Elementor warnings
* fixed saving permalink error in WordPress 6.1
* fixed src `data:` escaping in lazy load images
* fixed minimal pagination active item wrong circle size
* fixed Fly overlay z-index when add Hover Image from Pro plugin
* fixed block crash in the Widgets and Templates editor
* fixed go pro link error when no Visual Portfolio admin menu exists
* changed defaults for popup title and description sources
* removed white background from Fancybox popup for better support vertical videos
* removed `clipboard-polyfill` and use native `navigator.clipboard.writeText` instead
* minor changes

= 2.21.2 - Nov 25, 2022 =

* fixed JS error when open WordPress images in Lightbox
* fixed JS error when changing gallery image data

= 2.21.0 - Nov 24, 2022 =

* added templates for popup data in `/templates/popup/`, so developers can override it now in the theme templates
* added auto height to filter/sort dropdown
* added support for HTML tags in the popup title
* added groups for controls for better UI
* added more steps in the block Setup Wizard
* added Wide alignment to newly added blocks by default
* added a notice for large galleries to use Infinite pagination for better performance
* added Items Per Page limit and Infinite pagination to the gallery when user adds more than 40 images in the Setup Wizard
* added support for align option in Filter and Sort shortcodes
* added `text_all` attribute to Filter shortcode
* improved shortcodes UI in Saved Layouts
* changed default Infinite pagination threshold from 250px to 400px
* fixed wrong popup image displaying when custom URL used
* fixed post featured image focal point save error
* fixed Elementor widget in Safari can't select layout
* fixed Jetpack lazy loading re-layout Masonry conflict
* fixed displaying popup data in HTML when click action disabled
* fixed duplicated portfolio page in Archive settings
* fixed PHP warning when Editors open admin screen or when plugin first time active
* fixed multiple select controls sanitize
* fixed Go Pro link style conflict with 3rd-party URLs
* minor changes and fixes

= 2.20.3 - Oct 3, 2022 =

* fixed error when close popup gallery opened from the native gallery block
* fixed focus current item in the native gallery block when closing popup gallery

= 2.20.2 - Sep 29, 2022 =

* improved accessibility - focus gallery item in after closing popup
* fixed images displaying in Slider with Classic style on Apple devices
* fixed Jetpack lazy loading when new items loaded in Visual Portfolio gallery using pagination or filters
* fixed displaying Read More button in Classic style, when all other meta disabled

= 2.20.1 - Sep 15, 2022 =

* fixed 3rd-party lazy loading scripts add lazy attributes to noscript img tags
* fixed noscript styles loading when used optimization plugins
* fixed conflict with Elementor lightbox when used optimization plugins
* fixed undefined author field usage

= 2.20.0 - Sep 6, 2022 =

* !important - this update contains a lot of code rewrites regarding the security improvements, and some parts may not work as expected. Please, let us know as soon as possible, if something stopped working after this update. We have tested it in all our sites, but some rare cases may still stop working.
* added code for data sanitization in places, where we missed it
* added nonces usage to prevent possible hacker attacks
* added support for Swiper duplicates images lazy loading in 3rd-party carousels
* added Author to the Popup Title and Description sources
* improved lazy loading script
  * prevent adding noscript when image does not have vp-lazyload class after processing (for example, when skipped from adding lazy loading)
  * prevent processing earlier if setting is disabled - faster code execution
  * restored missing noscript for lazy images inside Visual Portfolio galleries
* fixed Settings tab URL if Portfolio Post Type disabled

= 2.19.1 =

* fixed Classic style image displaying bug in slider with dynamic height option
* fixed Color Picker error in custom Skins
* fixed Swiper slides displaying conflicts, which comes from some 3rd-party plugins
* minor changes

= 2.19.0 =

* added stricter permission check for rest route `update_layout`
* allow to call rest route `get_layouts` to all users, who can edit posts
* added settings to exclude images from lazy loading by attribute <https://www.visualportfolio.com/docs/settings/images/>
* improved Gallery images selection - you can now select images without holding Ctrl/Shift keys
* improved Gallery control - added pagination to prevent overwhelming block settings
* improved Gallery control - added additional info to selected image popup (such as source file URL, file size, etc...)
* improved Visual Portfolio admin menu styles by adding dividers
* updated Swiper to the latest version 8.3.2
* fixed popup gallery open if default prevented already (fixed conflict with slider Free Scroll)
* fixed Slider text selection when trying to drag in the gap
* fixed Slider displaying images in a row before Swiper init
* fixed wrong popup gallery items parsing when Slider layout used
* fixed images little "blink" effect when swipe Slider to the left
* fixed Saved Layouts editor block control 'NaN' value when select an empty value
* fixed Saved Layouts API reset meta data if you don't provided all available attributes in your request
* minor changes

= 2.18.0 =

* added possibility to change items count on Portfolio archive page in the plugin settings
* added portfolio archive page classes to the `<body>` tag
* improved Gallery sortable component in block settings
* improved Gallery component image popup in block settings to display Title and Description loaded dynamically from the Source settings
* changed Gallery component `Add Images` button to `Edit Gallery` button. You are not allowed to insert duplicate photos in a single gallery
* prevent closing multiple posts block option dropdown when selected value. Easier to select multiple posts from dropdown
* fixed security vulnerability - rest call wrong permission check
* fixed Taxonomy selector error with empty taxonomy
* fixed displaying posts when empty Taxonomy selected in the query options
* fixed some JS errors and warnings in the Gutenberg editor
* removed custom meta settings from non-viewable post types
* removed `will-change` styles usage
* minor changes

= 2.17.1 =

* added categories classes to items, when used Images content source
* fixed PRO settings output bug
* fixed a possible error, when $id is not provided in the `the_title` filter

= 2.17.0 =

* added possibility to prevent registering Portfolio post type. Helpful when you want to use our plugin for photo gallery only
* added support for images in sitemap for `All In One SEO`, `Rank Math`, and `Yoast SEO` plugins
* added correct title for Portfolio Archive Taxonomy pages: `Portfolio Category: %s` and `Portfolio Tag: %s`
* added support for `image` post format even if the theme does not
* fixed gallery filter category output on Portfolio Archive page
* fixed wrong image size calculation in Justified gallery when naturalWidth return null or zero (mostly on iOs devices)
* renamed `Popup Iframe` feature to `Quick View`

= 2.16.0 =

* tested with WordPress 6.0
* added compatibility styles for Twenty Twenty Two theme
* added support for additional popup URL parameters for Youtube and Vimeo. You can add options like autoplay and show controls. For supported parameters look at official embed documentation of Youtube <https://developers.google.com/youtube/player_parameters#Parameters> and Vimeo <https://vimeo.zendesk.com/hc/en-us/articles/360001494447-Player-parameters-overview>
* added PHP filter `vpf_include_template_args`
* improved enqueueing block assets and custom styles in FSE themes
* fixed fallback for inline custom styles (some styles broke the code and cause an error)
* fixed error with an archive portfolio page, when the server does not allow creating it and our code trying to create it again and again
* fixed wrong CSS variable usage in sort dropdown
* fixed Elementor lightbox conflict when load more items in Visual Portfolio galleries
* fixed Elementor widget deprecation warning
* fixed Elementor widget open settings when click on it in the editor
* moved Elementor compatibility code to separate script, so when Elementor is not installed, this script is not loading
* changed blocks to use API v2
* dropped IE support
* minor changes

= 2.15.6 =

* tested with WordPress 5.9
* added promo Youtube video in the plugin description on wordpress.org
* added a quick check to create_slug function - if slug for some reason is empty, return the label. This function is used to create slugs categories, added in the image galleries.
* added block previews when adding it to the Gutenberg editor
* improved styles of the block setup wizard
* improved styles of the welcome screen
* improved styles of image settings popup
* improved styles of Layout section in the block settings
* improved styles of color picker component
* improved styles of align control component
* fixed classes tree displaying in the block custom CSS modal

= 2.15.5 =

* fixed conflict with SG Optimizer lazy loading
* fixed conflict with Architect page builder (added hacky fix for our inline styles)
* fixed conflict with Avada lazy loading
* fixed color picker styles in the latest Gutenberg
* fixed slow loading of Gallery control in editor UI (now uses lazy loading)

= 2.15.4 =

* added encoding for block custom CSS to prevent conflicts with Gutenberg attributes sanitization
* fixed blocks assets rendering inside custom content locations (for example, widgets area)
* fixed some react warnings
* minor changes

= 2.15.3 =

* fixed standard Gallery block transformation errors

= 2.15.2 =

* fixed pagination working in galleries placed on the Homepage
* fixed possible bug with translated strings in JS files

= 2.15.1 =

* fixed category filter working in galleries placed on the Homepage
* fixed massive updating post meta, when running `get_posts()` when using WPBakery shortcode (and in other similar places)

= 2.15.0 =

* added support for Portfolio post type archives. Read more [https://www.visualportfolio.com/docs/portfolio-archive/](https://www.visualportfolio.com/docs/portfolio-archive/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog)
  * added customizable archive by using custom Page with Portfolio block inside
  * added support for Category and Tags archives
  * added permalink settings to `Settings > Permalinks`. Read more [https://www.visualportfolio.com/docs/settings/permalinks/](https://www.visualportfolio.com/docs/settings/permalinks/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog)
* added compatibility for standard galleries in WordPress 5.9
* fixed Saved Layouts editor title click in WordPress 5.9

= 2.14.1 =

* added justified options `Max Rows Count` and `Last Row Align`
* fixed huge galleries with Justified layout crash on iOs devices
* fixed popup styles conflict in BeTheme

= 2.14.0 =

* IMPORTANT - there may be breaking changes for some of your galleries. Please, don't forget to make a backup and test the plugin on a staging site before updating it on production
* added possibility to display post title and content in the image lightboxes (select the sources in the click action settings)
* added support for posters in video and audio popups (added automatically)
* slightly improved performance, when using the Taxonomies option
* changed required PHP version to 7.2
* changed required WordPress version to 5.8
* fixed conflict with WPML and Taxonomies option
* fixed AJAX loading pagination with custom permalink "/index.php/%postname%"
* fixed js error in the new widgets editor
* fixed rare conflict with theme styles and our images figure tag
* removed sessions usage for randomly ordered galleries. Better for cached pages with caching plugins. If you want to use the caching plugin and random option, you will need to disable caching for the page, where used this random gallery

= 2.13.2 =

* added filtering for Saved Layouts admin screen
* fixed filter categories bug when using Avoid Duplicates option
* fixed WP 5.8 deprecated filter usage
* fixed WP 5.8 Widgets editor conflict
* fixed possible js error when using SVG images and lazy loading
* fixed block preview loading when active plugin "Paid Memberships Pro - Member Homepages Add On"
* minor changes

= 2.13.1 =

* fixed possible bug with inaccessible links on images in the Classic style

= 2.13.0 =

* added Photo Proofing support in Pro plugin [https://www.visualportfolio.com/docs/proofing/](https://www.visualportfolio.com/docs/proofing/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog)
* improved image loading placeholder animation
* changed aspect-ratio base64 placeholders to full-size in lazyloading images
* hide the Items Per Page option when selected Current Query
* fixed rare conflict with reusable blocks while parsing
* fixed Current Query displaying posts problem
* fixed conflict between Divi image block width and Visual Portfolio lazy loading
* fixed lightbox and lazyloading conflicts in Enfold theme
* fixed Avada compatibility code run if used child theme

= 2.12.1 =

* added default images placeholder on first plugin install
* changed images border radius option to use CSS variable
* fixed possible PHP warning when retrieving saved layout meta
* fixed posts menu_order wrong displaying items in some situations
* fixed displaying random photos from Pro plugin social networks
* fixed Video URL metabox displaying when changing the post format
* fixed wrong callbacks for activation and deactivation hooks (wrong displaying Welcome Screen)

= 2.12.0 =

* added new social feeds support in Pro plugin:
  * Unsplash
  * Twitch
  * VK (Vkontakte)
  * RSS
* added possibility to replace image in gallery control
* added possibility to reorder manually selected posts
* added posts order for Manual Selection
* improved overall performance. In some (not all) galleries loading speed increased up to 20%
* improved Aspect Ratio control rendering dynamic CSS
* changed general options to collapsible panel
* fixed large images (mostly 4k images) parser wrong data for lazyloading
* fixed wrong filter categories when Images in Random Order
* fixed displaying border-radius in Safari browser
* fixed load more button background in loading state when button focused
* fixed possible error with nested reusable blocks while parse page blocks
* fixed custom CSS output `>` symbol
* minor changes

= 2.11.1 =

* improved custom styles output in `<body>` - use JS to prevent w3c error
* fixed Fancybox blurry zoom images in Firefox
* fixed custom scrollbar wrong height in Astra theme
* fixed custom scrollbar in Swiper duplicated slides
* fixed custom styles wrong selector generation (mostly resolves conflict in Carousel layout)
* minor changes

= 2.11.0 =

* added support for Watermarks in Pro plugin
* added support for Block Password Protection in Pro plugin
* added support for Age Gate Protection in Pro plugin
* added support for White Label in Pro plugin
* added support for Popup settings (Loop, Thumbnails Open At Startup, Thumbnails Position) in Pro plugin
* added top toolbar to admin pages
* improved Fancybox Thumbnails styles
* improved settings UI
* removed instant JS init to allow 3rd-party scripts use jQuery events
* prevent Fancybox to loop a single Popup image using keyboard arrows
* fixed custom CSS enqueue when block is not inside content
* fixed paged gallery with Current Query option enabled
* fixed Gutenberg iframe preview width conflict with Gutenberg container styles
* fixed Gutenberg iframe preview height when iframe is in loading state
* fixed lazy loading on preloader img logo
* fixed image sizes in Twenty Twenty One theme
* fixed conflict styles in Airtifact theme
* minor changes

= 2.10.5 =

* added posts data for each item templates (fixes wrong output in Leedo theme)
* fixed possible conflicts with themes custom styles for &lt;a> tags and non-visible images
* fixed possible wrong order of lazysizes dependencies in some themes
* fixed rare bug with WPBakery Page Builder, when wrong items content displayed

= 2.10.4 =

* added more image extensions support for popup gallery (tif, jfif, jpe, svg)
* changed images output to separate template include, no more needed `image_allowed_html` config
* removed color overlay from lazyloaded image (we saw it in the transparent PNG images, even if it does not needed)
* fixed Health Check loopback error on some hosts
* fixed role caps update after WordPress updated
* fixed Lazy Load conflicts in 3rd-party code:
  * Avada theme
  * EWWW Image Optimizer plugin
  * A3 Lazy Load plugin
  * Lazy Loader plugin
* renamed `lazy-sizes-config` file to prevent conflicts with some security plugins

= 2.10.3 =

* fixed Elementor widget PHP error
* fixed preloader logo styles
* fixed wrong output of filters after AJAX call
* fixed number controls value type bug (for example, when you change Offset option, it will not display the actual value in Saved Layout)

= 2.10.2 =

* fixed conflict of lazy loading and Imagify WebP feature (again)

= 2.10.1 =

* added setting to enable lazy loading for all images on site (not only for Visual Portfolio gallery)
* changed preloader logo svg to img tag
* fixed wrong path for Pro templates
* fixed wrong name of link template
* fixed popup photo gallery for old deprecated overlay class

= 2.10.0 =

* added new Query setting to select multiple post types
* added new setting - 'Use Deep Linking URL to Share Images'
* added support for TED and Coub Video popups in Pro plugin
* added possibility to remove no-image from Settings
* added more templates for items (split meta parts to separate templates)
* added width and max-width styles to JS Stretch code to prevent possible styles conflicts
* fixed styles loading when using filter and sort shortcodes

= 2.9.1 =

* added full support for WPML plugin
* changed some PHP filter names + added fallbacks to prevent bugs with existing extensions

= 2.9.0 =

* improved plugin documentation [https://www.visualportfolio.com/docs/getting-started/](https://www.visualportfolio.com/docs/getting-started/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog). Added more pages with detailed descriptions
* added Breakpoints settings in Pro plugin to control responsive screen sizes, on which responsive features stack
* added option to completely hide the block if no items found
* updated WPBakery shortcode icon
* allow pointer events while AJAX loading
* automatically enable popup photo gallery, when select Images source in Setup Wizard
* changed Custom CSS modal size
* changed PhotoSwipe share URLs (share actual image urls)
* fixed linear loading time decrease, when adding more blocks on the page
* fixed custom query with selected taxonomy displaying all available posts, when taxonomy posts doesn't exist
* fixed layout elements modal labels
* fixed Swiper and items styles displaying scrollbars in Safari
* fixed Saved Layout disabled Update button
* fixed preloader icon w3c validator errors
* minor changes

= 2.8.2 =

* added option to change No Items notice
* removed changing opacity of items while AJAX loading
* fixed (finally!) wrong items position when used Classic Skin + Justified Layout
* fixed wrong preview iframe URL on WP Multisite
* fixed Ghost Kit animate on scroll extension compatibility <https://ghostkit.io/extensions/animate-on-scroll/>
* fixed duplicates in popup gallery, when used carousel with loop
* fixed preloader animation styles conflict with some themes
* fixed PHP warning "non-numeric value encountered"

= 2.8.1 =

* fixed preloader SVG position
* fixed preview loading error on some hosts

= 2.8.0 =

* added support for Custom Hover image in Pro version [https://www.visualportfolio.com/custom-hover-image-animated-gif/](https://www.visualportfolio.com/custom-hover-image-animated-gif/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog)
* added Vertical Gap option
* added icons to all categories toggles in editor
* added Popup Gallery setting to disable "Click to Zoom"
* added PHP filters to extend items: `vpf_each_item_tag_name` and `vpf_each_item_tag_attrs` [https://www.visualportfolio.com/docs/developers/wordpress-filters/](https://www.visualportfolio.com/docs/developers/wordpress-filters/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog)
* changed preloader animation (SVG logo with spinner)
* changed item icon when click action is not popup gallery (display image icon instead of zoom)
* changed photo gallery and layout settings dropdowns to modals
* fixed conflict of lazy loading and Imagify WebP feature
* fixed Tiles layout resize position bug
* fixed WordPress images popup when used lazy loading from Autoptimize
* fixed possibility to remove Items from Layouts control (items are required part for each layout, you can't remove it
* fixed align component UI in Layouts control
* fixed iframe preview on some hosts
* removed usage of deprecated jQuery 'ready' event in Settings
* minor fixes

= 2.7.1 =

* added legacy Swiper version, when Elementor plugin enabled (resolves conflict with it)
* improved gallery preview code
* fixed Justify layout JS error

= 2.7.0 =

* changed lazy-loading attributes (use most popular `data-src` instead of custom attributes)
* improved iframe gallery preview render code (prevent re-arrange animation when iframe loaded)
* updated all vendor scripts to the latest versions
* moved lazy loading to separate script (less page loading size, when you disable Lazy Loading feature in settings)
* slightly improved performance by using raf-schd package
* fixed Isotope re-layout when window resized and gallery items size changed, but container have static size
* fixed iframe gallery preview JS error
* fixed slider arrow color variable name
* minor changes

= 2.6.2 =

* improved image lazyloading support for Pro plugin and social integrations
* improved animated GIFs usage (we can't use resized images, used full size only)
* updated 3rd-party vendor scripts
* moved posts Focal Point picker panel to Featured image selector panel (better UI)
* fixed Focal Point image preview size on posts
* fixed saved layout shortcode paste and Gutenberg transform to block

= 2.6.1 =

* fixed gallery images displaying when Tiles + 0 gap used

= 2.6.0 =

* added WPML config
* added section with possibility to copy shortcode right inside Saved Layout editor
* added notice to admin list with Saved Layouts (information about when to use Saved Layouts)
* improved Emerge overlay skew transform
* improved noscript images output
* changed default popup gallery plugin to Fancybox
* changed Gap styles output for Grid, Masonry, Tiles to CSS variables
* changed editor preview warning time to 60 seconds
* fixed Gaps styles compatibility with the latest Elementor update
* fixed controls dynamic CSS render when no condition added
* fixed Emerge overlay semi-transparent overlay background
* fixed images popup gallery when WebP support enabled in 3rd-party plugins
* minor changes

= 2.5.0 =

* added Image Overlay setting on Emerge Skin
* added support for images filters in Pro plugin version [https://www.visualportfolio.com/masonry-image-filters/](https://www.visualportfolio.com/masonry-image-filters/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog)
* changed Emerge image transform from scale to translateY
* fixed filter displaying in FireFox
* fixed custom scrollbar initialization after ajax load
* fixed Isotope event options variable
* moved gallery items class from templates to internal code + added filter to let users extend this class string
* removed native lazy loading from Visual Portfolio images where our JS lazy loading enabled (prevent possible conflicts)
* removed staggering animation script (simplified to use CSS only)
* minor changes

= 2.4.0 =

* added support for WordPress 5.5
* added meta staggering animation for Fade and Emerge items style
* added custom scrollbar for overlays with overflow (looks better, than system scrollbar)
* added more wp actions in portfolio output (helpful for developers)
* added iframe resize when Gutenberg preview device type changed
* updated Pro plugin pricing plans. Added a single site license, which many users asked for
* fixed custom aspect ratio select (set default value if value is empty)
* fixed post taxonomies slug in the filter (fixes support for languages like Japanese, Chinese, Russian, etc.)
* fixed possible JS error 'jQuery is not defined'

= 2.3.0 =

* added Pro version support [https://www.visualportfolio.com/pricing/](https://www.visualportfolio.com/pricing/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog)
* added overlay support for Classic gallery style
* added options to change meta color, links color and links hover color for all items styles
* added options to show gallery items overlay on hover only, on default state only and always
* added version number to stored assets (may fix the caching issue, when users update to the latest version)
* added vertical scroll to overlay meta data when overflow for Fade, Fly and Emerge styles
* improved click action for popup gallery (don't open popup if click on some meta links)
* improved Play icon for video items
* disabled possibility to close popup on page scroll
* fixed renaming saved layouts possibility
* fixed portfolio preview frame loading when WooCommerce Geolocation option enabled
* fixed displaying Stretch option in Saved Layouts
* fixed Author meta displaying when no author specified in image options
* fixed custom taxonomies setting usage
* fixed RTL check error in Isotope module when no items available
* fixed disabled Gutenberg editor in some 3rd-party plugins/themes
* fixed rare headers sent error
* minor fixes

= 2.2.0 =

* added RTL support
* added images Focal Point picker
* added styles to display overlays on items focus (helpful for screen readers)
* added possibility to output inline tags inside titles and excerpt
* added Video meta box for Gutenberg posts (using native Gutenberg API)
* fixed images uploading in block (automatically add title and description)
* fixed block id regeneration after edit page reload (resolves unnecessary post re-save requirement)
* always add custom CSS tag even if no custom CSS available, to better render dynamic styles in preview
* fixed Elementor widget problem with removing (usage of bad settings name `id` renamed to `saved_id`)
* fixed URL output for item categories (use esc_url)
* force enable Visual Editor on Saved Layouts for users, who disabled it
* force change editor mode to Visual in Saved Layouts editor
* minor changes

= 2.1.0 =

* added possibility to change images aspect ratio for Masonry and Grid layouts
* added Rel option in Click Action URL
* added support for Author field in Images Content Source
* added button for All Items per page (instead of telling users to use `-1` value)
* added CSS arrow to Filter and Sort dropdowns
* added 'class' attribute in PHP filter `vpf_each_item_args` to let users extend classes of each items
* improved custom CSS code sanitation
* changed default font-size in Filter, Sort and Pagination
* fixed SVG icons fill rule in templates
* fixed gutenberg block key events (remove, clone, etc)
* fixed click on dropdown elements in preview
* fixed saved layouts id usage in classname
* fixed dynamic bullets reload in preview
* fixed Custom CSS dynamic update in preview
* fixed Custom CSS code editor placeholder rendering
* fixed adding image title and description automatically when add images in images content source
* minor changes

= 2.0.1 =

* fixed removing all images settings when editing gallery images
* fixed bug, when Saved Layout value `0` or `false` resets to defaults (for example, items gaps)
* fixed custom CSS escape symbol `>`
* fixed popup image for the old Gutenberg image block structure
* fixed setup wizard displaying in Saved Layouts
* fixed retrieve registered value of Saved Layout
* force enable Gutenberg editor for Saved Layouts to prevent conflicts with plugins, that uses Classic Editor
* changed gallery images uploading control (added resorting, removing and adding new images, instead of default WordPress gallery edit tool)
* changed tiles selector to modal component (better UI)
* changed "Saved" menu item to "Saved Layouts", as users couldn't find it

= 2.0.0 =

! IMPORTANT for version 2.x - this is a major plugin upgrade. A lot of things were changed. We recommend you test it on a staging site first before update it on the production site.

Migration Notes:

* If you extended portfolio options using PHP, you will need to remove `vp_` prefix from your custom options. Example - <https://github.com/nk-crew/visual-portfolio/blob/master/src/classes/class-admin.php#L854-L865>
* If you overwrite templates and styles, you will need to change your styles to work with CSS variables (at least variables for overlay colors) - [https://www.visualportfolio.com/docs/developers/css-variables/](https://www.visualportfolio.com/docs/developers/css-variables/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog)
* If you overwrite templates with meta, you may see no icons displayed. Icons output changed and now it works like this - <https://github.com/nk-crew/visual-portfolio/blob/master/src/templates/items-list/items-style/fade/meta.php#L55-L68>

Log:

* updated overall UI
* updated all gallery items styles
* updated all filters and pagination styles
* added full-featured Gutenberg block
* added popup gallery support for default WordPress images and galleries (enable it manually in plugin settings)
* added new UI component - Layout Elements, where you can change Filter, Sort, Items and Pagination
* added Minimal styles for Filters, Sort and Pagination
* added images corner radius option
* added offset option in Posts Query
* added more Order By options in Posts Query
* added Current Query option
* added new meta data to items: author, comments count, views count, reading time
* added `rel="noopener noreferrer"` to links with target attribute
* added transforms from default Gallery and Latest Posts blocks to Visual Portfolio block
* added Scroll to Top option for Paged pagination
* added option to hide Load More and Infinite pagination when reached end of lists
* added new templates for wrappers and slider elements
* added settings to disable built-in images lazyloading
* improved lazy loading placeholder animation background styles
* enabled comments on Portfolio custom post types by default
* changed all styles to use CSS Variables
* changed items styles default overlay background color to black
* changed Layouts editor old interface to Gutenberg
* changed default Skin to Fade
* changed tiles responsive styles from margin to padding (better for developers)
* changed `sr-only` classname usage to `vp-screen-reader-text`
* changed registered image sizes height limitation
* changed all ul elements to div to prevent conflicts with theme styles
* removed FontAwesome, all icons moved to pure SVG
* removed align options from Filter, Sort, and Pagination (used layout elements align instead)
* removed options, that allowed users to change icons classes in layout (all icons moved to templates)
* fixed titles align in default themes
* fixed assets loading order in preview
* fixed z-index CSS variable for Fancybox
* fixed swiper fade effect slide width
* moved all SVG icons to separate templates to let developers overwrite it <https://github.com/nk-crew/visual-portfolio/tree/master/src/templates/icons>
* renamed `Portfolio Layouts` to `Saved`
* renamed `Default` Skin, Filter, Sort and Pagination to `Classic`
* a lot of minor changes

= 1.16.2 =

* preview moved to `templates/preview`, so you can override it from themes
* use base64 for placeholders
* fixed posts output when taxonomies relation set to AND and no taxonomies selected
* fixed Grid JS error if used old Isotope script (for example in Bridge theme)
* fixed notices in PHP 7.4

= 1.16.1 =

* added style fixes for some Twenty themes
* added :focus styles in templates, where used :hover
* disable filter output if no taxonomies found
* reverted back taxonomies public queryable (users used it for permalinks)
* fixed grid layout position calculation after filtering
* fixed PhotoSwipe jQuery is not a function error

= 1.16.0 =

* added preview preloader in layouts editor
* added imagesloaded after AJAX loaded event (fixes Safari images stacking)
* changed images placeholders to SVG (less code, better performance)
* prevent ajax loading if requested URL is currently loaded
* fixed Avoid Duplicate Posts option if used Post-Based with Custom Post IDs
* fixed WP Smush lazyload conflict
* fixed infinite scroll loading 2 next pages at a time
* fixed Grid items position in FireFox
* fixed stretch option usage in preview (just disable it)
* fixed Elementor widget output on frontend
* fixed post-based taxonomies when posts don't contain it
* fixed AMP plugin integration PHP notices
* fixed AJAX loading with changed layout settings in editor preview
* fixed error in layouts preview when no items loaded
* a lot of code improvements for upcoming Pro plugin

= 1.15.1 =

* fixed errors when upload images without width or height (for example, SVG)

= 1.15.0 =

* added widget for Elementor
* added settings to change popup gallery background color
* added support for checkboxes and toggles in custom controls styles (needed for custom items styles)
* added tree of nodes with classes to better coding in Layouts Custom CSS
* better Gutenberg block preview (no more transform scale for iframe)
* fixed Video Post Format URL metabox display in Gutenberg
* fixed Video Popup in post with format video, but without post thumbnail
* fixed layouts editor styles loading bug when browser tab is not active
* additional attributes for taxonomies in templates

= 1.14.1 =

* added jQuery events for PhotoSwipe and Fancybox [https://www.visualportfolio.com/docs/developers/jquery-events/](https://www.visualportfolio.com/docs/developers/jquery-events/?utm_source=wordpress.org&utm_medium=changelog&utm_campaign=changelog)
* fixed carousel responsive bug since new Swiper v5

= 1.14.0 =

* added settings to change registered image sizes
* added info about sort shortcode in Layouts metaboxes
* improved assets loader (load only required css and js)
* changed PhotoSwipe A tags to Buttons
* removed height limitation for Images control in Layouts editor
* fixed slider thumbnails ajax loading
* fixed tiles wrong position calculation
* fixed Isotope gallery re-layout when WPBakery Page Builder resized full-width row
* updated FontAwesome
* updated LazySizes
* updated Swiper (no more Internet Explorer support)

= 1.13.2 =

* fixed incorrect post date if something filters it (for example Events Manager plugin). Thanks to <https://wordpress.org/support/topic/date-problem-with-events-and-1-13-1-version/>

= 1.13.1 =

* updated FontAwesome
* fixed portfolio gallery inside Tabs and Accordions
* fixed Editor role capabilities (add a possibility to manage projects)
* fixed published date output for Content Source -> Images
* fixed Gutenberg block list of all available layouts

= 1.13.0 =

* added Fancybox support
* added option to avoid posts duplication
* added posts classes (such as hentry) on projects
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
* fixed gallery items gap conflict with Elementor
* fixed carousel "Slides per view" auto option with static or dynamic "Items height" option
* fixed slider fade effect + default items style items width
* fixed rtl admin layout styles

= 1.10.0 =

* added Grid layout
* added Order by and Order direction for Images Content Source
* added Pause on Mouse Over option in Slider with Autoplay
* added Free Scroll Sticky option in Slider
* added figure and figcaption tags in projects in layouts
* added 'author' supports to portfolio posts to display in your galleries
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
* added filter for control arguments `vpf_registered_control_args` (developers may change controls settings in layouts editor)
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
* added Read More button option for Classic Skin
* added dropdown in top admin menu with the list of available portfolios on this page
* added generation placeholders on the fly (no more need to regenerate thumbnails to get placeholder)
* fixed popup image title color (were dark)
* fixed popup video play after going to the next slide

= 1.6.5 =

* added options for texts in filter and pagination
* fixed paged /portfolio/ page (<https://wordpress.org/support/topic/paging-infinite-loading-not-working/>)
* fixed vertical images quality
* fixed conflict with Jetpack lazy
* fixed filter shortcode output

= 1.6.4 =

* fixed font-awesome dependency

= 1.6.3 =

* added portfolio gallery preview iframe in Gutenberg block
* changed portfolio default image sizes (since we use Lazyload, we can use larger image sizes)
* updated FontAwesome to 5.2.0
* fixed Slider styles when used 2 sliders on the page
* removed imagesloaded dependency
* disabled 'with_front' in portfolio post type (thanks to [https://wordpress.org/support/topic/change-the-permalink-structure-2/](https://wordpress.org/support/topic/change-the-permalink-structure-2/))

= 1.6.2 =

* additional check for isotope and Flickr Justified Gallery existence
* added init outside of 'ready' event (possible faster initialization)
* fixed lazyload possible conflict with the 3rd-party themes/plugins

= 1.6.1 =

* fixed validator error "The sizes attribute may be specified only if the srcset attribute is also present"

= 1.6.0 =

* NOTE: strongly recommend to regenerate thumbnails on your site using [this plugin](https://wordpress.org/plugins/regenerate-thumbnails/)
* added lazy loading for gallery images
* added will-change styles in templates (animations should work smoother)
* added new Tiles
* added pagination paged arrows options
* added align wide and full options in Gutenberg block
* added support for custom controls styles (developers could create their own controls and add custom styles). Read FAQ for more information
* added custom control options in filter templates (helpful for developers)
* added pagination style and possibility to extend it from 3rd-party code
* added project comments number data for templates
* added 'resized' event for developers
* always enqueued main style on all pages
* changed carousel arrows shadow
* fixed validation errors (added space between data attributes)
* fixed video popup gallery position
* fixed portfolio bugged reload in preview
* renamed nk-spinner to vp-spinner
* removed double slash in custom theme template styles urls
* removed imagesloaded usage

= 1.5.0 =

* added Slider (+ Carousel, Coverflow) layout gallery
* added capabilities check when generated preview page
* improved responsive calculation algorithm
* disabled preview page caching by some popular caching plugins
* fixed isotope newly loaded gallery items jumping
* fixed conditions usage on controls in 3rd-party extensions
* fixed PHP notices when trying to extend portfolio options
* fixed Data source selected item (was always Post selected)
* fixed Default filter show
* fixed Date format control UI
* fixed confirmation message when leaving layouts editor without change

= 1.4.3 =

* added check for template existence before include it (to prevent errors when 3rd-party devs don't added templates)
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

* added Justified gallery layout
* added custom user images support in Content Source settings
* added Gutenberg block to easily insert layouts
* added Random order in Post-Based content source
* added spinner to load more button
* added setting to change portfolio slug
* fixed video playing when popup gallery were closed
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
* fixed popup video gallery jumping
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
* added "Edit Project" button in admin menu on frontend
* added option to show filter items count
* added option to show published date in human format
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
