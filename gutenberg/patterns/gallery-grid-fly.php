<?php
/**
 * Title: Gallery Grid - Fly
 * Slug: visual-portfolio/gallery-grid-fly
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Description: Display gallery items in a grid, with the overlay flying in from the side the pointer came in from.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"block_id":"vppatgridfly","queryType":"images","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop">
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumnsMode":"manual","layoutColumnCount":3} -->
		<!-- wp:visual-portfolio/item-cover {"effect":"fly","contentPosition":"bottom left","clickAction":"popup","customHoverOverlayColor":"#111111","hoverDimRatio":70} -->
			<!-- wp:visual-portfolio/item-title {"style":{"color":{"text":"#ffffff"}}} /-->
			<!-- wp:visual-portfolio/item-categories {"style":{"color":{"text":"#ffffff"}}} /-->
		<!-- /wp:visual-portfolio/item-cover -->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
