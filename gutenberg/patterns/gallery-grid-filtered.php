<?php
/**
 * Title: Filtered Portfolio Grid
 * Slug: visual-portfolio/gallery-grid-filtered
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: A grid of portfolio projects, with the list of their categories above it to narrow the gallery down.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatgridfiltered","queryType":"posts","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/loop-filter {"layout":{"type":"flex","justifyContent":"center"}} -->
		<!-- wp:visual-portfolio/loop-filter-item {"text":"All"} /-->
	<!-- /wp:visual-portfolio/loop-filter -->
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumnsMode":"manual","layoutColumnCount":3} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"4/3","clickAction":"url"} /-->
		<!-- wp:visual-portfolio/item-title {"clickAction":"url"} /-->
		<!-- wp:visual-portfolio/item-categories /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
