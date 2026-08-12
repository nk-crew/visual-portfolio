<?php
/**
 * Title: Gallery Posts
 * Slug: visual-portfolio/gallery-posts-classic
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Description: Display posts in a grid, with the title, the categories and the publish date under each image.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"queryType":"posts","baseQuery":{"perPage":6}} -->
<div class="vp-block-loop">
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumns":3} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"4/3","clickAction":"url"} /-->
		<!-- wp:visual-portfolio/item-title {"isLink":true} /-->
		<!-- wp:visual-portfolio/item-categories /-->
		<!-- wp:visual-portfolio/item-date /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
