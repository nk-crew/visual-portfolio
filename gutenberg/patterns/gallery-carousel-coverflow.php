<?php
/**
 * Title: Carousel Coverflow
 * Slug: visual-portfolio/gallery-carousel-coverflow
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: A carousel that turns its slides in perspective and lays them over one another, the way a cover flow does.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatcarouselcoverflow","queryType":"images","baseQuery":{"perPage":10}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"carousel","layoutColumnsMode":"manual","layoutColumnCount":3,"carouselEffect":"coverflow","carouselEdgeFade":true,"carouselShowArrows":true} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"4/3","clickAction":"popup"} /-->
		<!-- wp:visual-portfolio/item-title /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
