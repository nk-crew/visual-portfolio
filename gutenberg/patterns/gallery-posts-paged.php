<?php
/**
 * Title: Paged Posts Grid
 * Slug: visual-portfolio/gallery-posts-paged
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: Display posts in a grid, with page numbers under it to walk through the rest of them.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatpostspaged","queryType":"posts","baseQuery":{"perPage":6}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumnsMode":"manual","layoutColumnCount":3} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"4/3","clickAction":"url"} /-->
		<!-- wp:visual-portfolio/item-title {"clickAction":"url"} /-->
		<!-- wp:visual-portfolio/item-date /-->
	<!-- /wp:visual-portfolio/item-template -->
	<!-- wp:visual-portfolio/loop-pagination {"layout":{"type":"flex","justifyContent":"space-between"}} -->
		<!-- wp:visual-portfolio/loop-pagination-previous /-->
		<!-- wp:visual-portfolio/loop-pagination-numbers /-->
		<!-- wp:visual-portfolio/loop-pagination-next /-->
	<!-- /wp:visual-portfolio/loop-pagination -->
</div>
<!-- /wp:visual-portfolio/loop -->
