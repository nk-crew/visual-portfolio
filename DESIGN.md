# Settings screens

General, Images and Popup & Lightbox use WordPress Gutenberg controls within the existing plugin navigation, white content area and sticky Save Changes footer. Other settings tabs retain their existing renderer and styling.

Primary settings stay visible. Advanced or infrequently changed settings use collapsed groups. General groups custom taxonomies, performance and responsive breakpoints. Images groups independent layout and lightbox image sizes. Popup shows Behavior, Controls and Appearance before thumbnails, Albums, Quick View and Advanced.

Use the labels, descriptions, defaults and limits registered by the settings API. Keep Pro controls disabled in Free and show their existing upgrade links. Use the corrected group name Controls.

Hidden and collapsed controls preserve pending values and submit them through the existing form. Numeric controls allow intermediate typing and use native final validity. Dependency changes never reset values. Group disclosure uses native keyboard behavior. Controls stack at narrow widths, and size fields may share a responsive grid.

Watermarks and the Social Feeds preview are outside this design change.

# Plugin admin pages

Screens the plugin draws itself are React pages in one frame (`assets/admin/pages/components/page.js`), modeled on the Site Editor's screens: white edge to edge, no gray canvas and no plugin navigation bar, since the WordPress sidebar already lists every page. A page header holds the title, one line on what the page is for, the page's actions on the right, and its sections as underline tabs with counts where a count helps choose. Sections change the URL, so they can be bookmarked and the back button works. Content starts under the header at the same 32px gutter.

Core list screens (Projects, Categories, Tags) keep WordPress's rendering, since other plugins extend them, and get only a light refresh.

# Saved Layouts library

The Saved Layouts screen is a plugin admin page (see Plugin admin pages) with DataViews. It takes its type, spacing and colors from WordPress's components and adds no values of its own beyond the layout preview and the Legacy badge. Search, filters and, in the grid and list, Select all share one toolbar row; the grid has no select-all row of its own.

Grid is the default view and table the dense one. A card shows a preview, the title, one summary line (source · layout) and usage. A card's preview is the layout as a page renders it, scaled from a 1200px page and centred when it is shorter than the card. While it loads, in table and list rows, and for a layout with no items, the preview draws the arrangement from the settings in neutral placeholder tones. Legacy layouts carry a yellow Legacy badge; drafts carry their status. Rare actions live in the item menu; destructive ones open a dialog that names the pages a layout is used on.

New layouts are added from one split button whose menu holds the legacy editor. Below the medium breakpoint the button reads Add New and Import becomes an icon button.

In the editor, a setting a synced gallery changed shows a dot, "Changed on this gallery" and a reset icon above its control, in the theme color. The Saved Layout panel sits first in the loop's inspector.
