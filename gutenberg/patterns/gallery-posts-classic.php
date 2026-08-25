<?php
/**
 * Title: Posts Cards
 * Slug: visual-portfolio/gallery-posts-classic
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: Display posts in a grid, with the title, the categories and the publish date under each image.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatpostsclassic","queryType":"posts","baseQuery":{"perPage":6}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumnsMode":"manual","layoutColumnCount":3} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"4/3","clickAction":"url"} /-->
		<!-- wp:visual-portfolio/item-title {"clickAction":"url"} /-->
		<!-- wp:visual-portfolio/item-categories /-->
		<!-- wp:visual-portfolio/item-date /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
