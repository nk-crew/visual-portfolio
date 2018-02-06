=== Visual Portfolio ===
Contributors: nko
Tags: portfolio, gallery, works, masonry, popup
Requires at least: 4.0.0
Tested up to: 4.9
Stable tag: 1.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Portfolio lists visual editor.



== Description ==

Visual Portfolio editor let you create beautiful portfolio layouts. Generates shortcode to show portfolio or any custom post types using Masonry or Tiles layouts.

See **Online Demo** here - [https://demo.nkdev.info/#visual-portfolio](https://demo.nkdev.info/#visual-portfolio)


=== Features ===

* Visual preview for portfolio list shortcode builder
* Templates for theme developers
* Masonry layout
* Tiles layout
* 3 predefined hover effects (will be more in the future updates):
   * Fade
   * Emerge
   * Fly
   * Default (no hover effect)
* Infinite Scroll
* Load More
* Paged lists
* Filtering
* Popup gallery (Youtube and Vimeo supported)
* Custom item gutters
* Stretch option (if you want to break the fixed container of the page)
* Custom posts type lists (not only portfolio)
   * Posts by type
   * Posts by specific ID
   * Posts by taxonomies
   * Custom order
* Custom CSS for each portfolio lists
* Shortcode generated, so you can place unlimited portfolio lists on the page
* Visual Composer page builder supported


= Real Examples =

[Piroll - Portfolio Theme](https://demo.nkdev.info/#piroll)



== Screenshots ==

1. Visual Portfolio builder p.1
2. Visual Portfolio builder p.2
3. Portfolio items list admin
4. Visual Portfolio shortcodes list admin
5. Example: Tiles + Stretch
6. Example: Masonry + Posts
7. Example: Tiles + Custom hover color
8. Example: Tiles + Paged pagination
9. Example: Masonry
10. Example: Tiles + Popup gallery
11. Example: Popup Gallery



== Installation ==

= Automatic installation =

Automatic installation is the easiest option as WordPress handles the file transfers itself and you don’t need to leave your web browser. To do an automatic install of Visual Portfolio, log in to your WordPress dashboard, navigate to the Plugins menu and click Add New.

In the search field type “Visual Portfolio” and click Search Plugins. Once you’ve found our plugin you can view details about it such as the point release, rating and description. Most importantly of course, you can install it by simply clicking “Install Now”.

= Manual installation =

The manual installation method involves downloading our Visual Portfolio plugin and uploading it to your webserver via your favourite FTP application. The WordPress codex contains [instructions on how to do this here](https://codex.wordpress.org/Managing_Plugins#Manual_Plugin_Installation).



== Changelog ==

= 1.3.0 =
* improved CSS editor (added autocomplete hints; selectors hint; showing errors; preventing save when editor has errors)
* improved layouts editor interface
* added shortcode for portfolio filter (you can use filter outside of portfolio wrapper)
* added possibility to change date format
* added frontend Visual Composer support
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
* added support for oEmbed videos (Youtube and Vimeo supported)
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
* added support for Visual Composer
* added class attribute in shortcode
* added excerpt field to the portfolio post type
* removed enqueued portfolio scripts and styles from the admin builder
* improved fly effect, now direction calculated more correct
* changed all items-styles hover effects
* fixed showing excerpt from excerpt post fields
* fixed php short tag usage
* fixed conflict with Visual Composer and old isotope plugin

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
* added wrapper to items list
* removed margin from main vp container
* fixed array option retrieve error
* minor changes

= 1.0.0 =
* initial Release



== Frequently Asked Questions ==

= How to change default templates and styles? =

You can copy files from the **/visual-portfolio/templates/** to your **YOUR_THEME/visual-portfolio/** folder and change php code and css files here.