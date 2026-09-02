<?php
/**
 * Title: Carousel Showcase
 * Slug: visual-portfolio/gallery-carousel-showcase
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: A carousel of wide slides with arrows and dots, for showing a few pictures at a time.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatcarouselshowcase","queryType":"images","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"carousel","layoutColumnsMode":"manual","layoutColumnCount":3,"carouselSnapAlign":"center"} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"4/3","clickAction":"popup"} /-->
		<!-- wp:visual-portfolio/item-title {"textAlign":"center"} /-->
		<!-- wp:visual-portfolio/loop-carousel-nav {"showOnHover":true} -->
			<!-- wp:visual-portfolio/loop-carousel-previous {"className":"is-style-filled"} /-->
			<!-- wp:visual-portfolio/loop-carousel-next {"className":"is-style-filled"} /-->
		<!-- /wp:visual-portfolio/loop-carousel-nav -->
	<!-- /wp:visual-portfolio/item-template -->
	<!-- wp:visual-portfolio/loop-carousel-nav -->
		<!-- wp:visual-portfolio/loop-carousel-indicator /-->
	<!-- /wp:visual-portfolio/loop-carousel-nav -->
</div>
<!-- /wp:visual-portfolio/loop -->
