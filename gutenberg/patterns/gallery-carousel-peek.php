<?php
/**
 * Title: Carousel Peek
 * Slug: visual-portfolio/gallery-carousel-peek
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: A carousel of two slides that keeps the edge of the next one in view, turning them as they pass.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatcarouselpeek","queryType":"images","baseQuery":{"perPage":10}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"carousel","layoutColumnsMode":"manual","layoutColumnCount":2,"carouselEffect":"coverflow","carouselPeek":90,"carouselEdgeFade":true,"carouselShowArrows":true} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"16/9","clickAction":"popup"} /-->
		<!-- wp:visual-portfolio/item-title /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
