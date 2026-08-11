<?php
/**
 * Title: Gallery Grid
 * Slug: visual-portfolio/gallery-grid-classic
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Description: Display gallery items in a grid layout, with a title under each image.
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
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"1","isLink":true} /-->
		<!-- wp:visual-portfolio/item-title {"textAlign":"center"} /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
