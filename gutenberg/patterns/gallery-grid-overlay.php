<?php
/**
 * Title: Grid Overlay
 * Slug: visual-portfolio/gallery-grid-overlay
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: Display gallery items in a grid, with the title and the categories fading in above the image on hover.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"block_id":"vppatgridoverlay","queryType":"images","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop">
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumnsMode":"manual","layoutColumnCount":3} -->
		<!-- wp:visual-portfolio/item-cover {"effect":"fade","clickAction":"popup","customHoverOverlayColor":"#000000","hoverDimRatio":60} -->
			<!-- wp:visual-portfolio/item-title {"textAlign":"center","style":{"color":{"text":"#ffffff"}}} /-->
			<!-- wp:visual-portfolio/item-categories {"textAlign":"center","style":{"color":{"text":"#ffffff"}}} /-->
		<!-- /wp:visual-portfolio/item-cover -->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
