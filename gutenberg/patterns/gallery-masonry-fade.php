<?php
/**
 * Title: Gallery Masonry - Fade
 * Slug: visual-portfolio/gallery-masonry-fade
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Description: Display gallery items in a masonry layout, each cover keeping the proportions of its own image, with the title fading in on hover.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"queryType":"images","baseQuery":{"perPage":12}} -->
<div class="vp-block-loop">
	<!-- wp:visual-portfolio/item-template {"layoutType":"masonry","layoutColumns":3} -->
		<!-- wp:visual-portfolio/item-cover {"aspectRatio":"","effect":"fade","isLink":true,"customHoverOverlayColor":"#000000","hoverDimRatio":60} -->
			<!-- wp:visual-portfolio/item-title {"textAlign":"center","style":{"color":{"text":"#ffffff"}}} /-->
		<!-- /wp:visual-portfolio/item-cover -->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
