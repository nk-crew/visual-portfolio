<?php
/**
 * Title: Gallery Grid - Emerge
 * Slug: visual-portfolio/gallery-grid-emerge
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Description: Display gallery items in a grid, with the title scaling up out of the image on hover.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"queryType":"images","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop">
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumns":3} -->
		<!-- wp:visual-portfolio/item-cover {"effect":"emerge","isLink":true,"customHoverOverlayColor":"#000000","hoverDimRatio":50} -->
			<!-- wp:visual-portfolio/item-title {"textAlign":"center","style":{"color":{"text":"#ffffff"}}} /-->
		<!-- /wp:visual-portfolio/item-cover -->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
