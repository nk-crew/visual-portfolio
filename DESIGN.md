# Settings screens

Settings is a framed page (see Plugin admin pages). Its tabs are the header's sections, each group of settings is a white card on the gray canvas, and the tab on screen puts its own Save Changes button where the header's action goes; below 783px it stays at the bottom of the screen. General, Images and Popup & Lightbox use WordPress Gutenberg controls with one label style; the tabs the Settings API draws itself, Pro's among them, keep their renderer inside a card.

Primary settings stay visible. Advanced or infrequently changed settings use collapsed groups. General groups custom taxonomies, performance and responsive breakpoints. Images groups independent layout and lightbox image sizes. Popup shows Behavior, Controls and Appearance before thumbnails, Albums, Quick View and Advanced.

Use the labels, descriptions, defaults and limits registered by the settings API. Keep Pro controls disabled in Free and show their existing upgrade links. Use the corrected group name Controls.

Hidden and collapsed controls preserve pending values and submit them through the existing form. Numeric controls allow intermediate typing and use native final validity. Dependency changes never reset values. Group disclosure uses native keyboard behavior.

Each setting is one row in its group's card, with a 1px divider between rows. The name and description sit on the left and the control on the right: a toggle at the right edge, any other control filling a 280px column. The control centers on the name and description together; a textarea or an image aligns to the top instead. Size fields (image sizes, breakpoints) stay a responsive grid with name, field and description stacked. Below 783px every row stacks in that same order.

Watermarks and the Social Feeds preview are outside this design change.

# Plugin admin pages

Screens the plugin draws itself are React pages in one frame (`assets/admin/pages/components/page.js`), modeled on the Site Editor's screens: a white header edge to edge over WordPress's gray canvas, the work in white cards on that canvas, and no plugin navigation bar, since the WordPress sidebar already lists every page. A page header holds the title, one line on what the page is for, the page's actions on the right, and its sections as underline tabs with counts where a count helps choose. Sections change the URL, so they can be bookmarked and the back button works. Content starts under the header at the same 32px gutter. Cards have a 1px #e0e0e0 border, an 8px radius and 24px of padding, measured to the first and last line of text, and 16px below 783px. The Welcome screen shown after activation sits in the frame at the same gutter on white, with no header, since its own hero names the plugin and it is read rather than worked in.

Core list screens (Projects, Categories, Tags, and Pro's Proofing list) keep WordPress's markup, since other plugins extend them. They get the frame's header above it, with Projects, Categories and Tags as its sections and the Add New link as its action, and WordPress's own title is hidden. Only their layout changes. A post list and its controls share one card in two rows above the table: the status links with search on the right, then bulk actions, filters and, with more than one page, pagination. The table is drawn the way DataViews draws its own: no frame, shadow or stripes, a 1px line between rows. A taxonomy's add form and its list are two cards side by side, stacked below 783px. Screen Options is a plain link in the header, beside the sections. Columns, filters, row actions and forms stay WordPress's, so what other plugins print there keeps its place.

A list screen gets this header through the `vpf_admin_list_screens` filter, whose docblock in `classes/class-admin.php` holds its shape; that is how Pro's list screens join the frame. Lists that belong together, such as a post type and its taxonomy, carry the same sections, so they read as one page with tabs. A tab shows only when the user can open its screen, and a single tab left gets no tab bar.

# Saved Layouts library

The Saved Layouts screen is a plugin admin page (see Plugin admin pages) with DataViews, the whole library in one card. It takes its type, spacing and colors from WordPress's components and adds no values of its own beyond the layout preview and the Legacy badge. Search, filters and, in the grid and list, Select all share one toolbar row; the grid has no select-all row of its own.

Grid is the default view and table the dense one. A card shows a preview, the title, one summary line (source · layout) and usage. A card's preview is the layout as a page renders it, scaled from a 1200px page and centred when it is shorter than the card. While it loads, in table and list rows, and for a layout with no items, the preview draws the arrangement from the settings in neutral placeholder tones. Legacy layouts carry a yellow Legacy badge; drafts carry their status. Rare actions live in the item menu; destructive ones open a dialog that names the pages a layout is used on.

New layouts are added from one split button whose menu holds the legacy editor. Below the medium breakpoint the button reads Add New and Import becomes an icon button.

In the editor, a setting a synced gallery changed shows a dot, "Changed on this gallery" and a reset icon above its control, in the theme color. A gallery that is not synced shows nothing of Saved Layouts in its inspector: Sync with Saved Layout… and Save as Saved Layout… live in the block's menu, as core's Create pattern does, since few galleries are synced. A synced gallery shows one status line at the top of the inspector, with no card around it: the synced-pattern icon, the layout's name, how many settings the gallery changed with an inline Reset, and a menu with Edit, Sync with another and Detach.

# Gallery Loop lightbox

The caption sits at the bottom of the viewport, above bottom thumbnails and beside side thumbnails. Its rendered height determines how much space it takes from the photo. An empty caption takes no space. Long captions scroll, including from the keyboard. Tall photos remain pannable at their fitted width.

Closing an image uses the crop of the rendered photo. When Restore Focus is enabled, the link that opened the photo receives focus again. A slideshow stops at the last photo when Loop is off.

Available toolbar buttons keep their order and spacing while zoomed. When Loop is off, the previous and next buttons stay in place at the ends and use the native disabled state with a dimmed appearance. Share opens a dark panel at least 11rem wide when space allows, with a visible focus outline on each link.
