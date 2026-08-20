<?php
/**
 * Title: Carousel Showcase
 * Slug: visual-portfolio/gallery-carousel-showcase
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Description: A carousel of wide slides with arrows and dots, for showing a few pictures at a time.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"block_id":"vppatcarouselshowcase","queryType":"images","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop">
	<!-- wp:visual-portfolio/item-template {"layoutType":"carousel","layoutColumnsMode":"manual","layoutColumnCount":3,"carouselShowArrows":true,"carouselIndicator":"dots","carouselSnapAlign":"center"} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"4/3","clickAction":"popup"} /-->
		<!-- wp:visual-portfolio/item-title {"textAlign":"center"} /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
