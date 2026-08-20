<?php
/**
 * Title: Masonry Captions
 * Slug: visual-portfolio/gallery-masonry-captions
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Description: A masonry of pictures at their own proportions, each with its title and description under it.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"block_id":"vppatmasonrycaptions","queryType":"images","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop">
	<!-- wp:visual-portfolio/item-template {"layoutType":"masonry","layoutColumnsMode":"auto","layoutMinimumColumnWidth":"18rem","layoutColumnCount":3} -->
		<!-- wp:visual-portfolio/item-image {"clickAction":"popup"} /-->
		<!-- wp:visual-portfolio/item-title /-->
		<!-- wp:visual-portfolio/item-description /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
