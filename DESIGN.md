# Settings screens

General, Images and Popup & Lightbox use WordPress Gutenberg controls within the existing plugin navigation, white content area and sticky Save Changes footer. Other settings tabs retain their existing renderer and styling.

Primary settings stay visible. Advanced or infrequently changed settings use collapsed groups. General groups custom taxonomies, performance and responsive breakpoints. Images groups independent layout and lightbox image sizes. Popup shows Behavior, Controls and Appearance before thumbnails, Albums, Quick View and Advanced.

Use the labels, descriptions, defaults and limits registered by the settings API. Keep Pro controls disabled in Free and show their existing upgrade links. Use the corrected group name Controls.

Hidden and collapsed controls preserve pending values and submit them through the existing form. Numeric controls allow intermediate typing and use native final validity. Dependency changes never reset values. Group disclosure uses native keyboard behavior. Controls stack at narrow widths, and size fields may share a responsive grid.

Watermarks and the Social Feeds preview are outside this design change.
