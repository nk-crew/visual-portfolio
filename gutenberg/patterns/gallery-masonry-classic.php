<?php
/**
 * Title: Gallery Masonry
 * Slug: visual-portfolio/gallery-masonry-classic
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Description: Display gallery items in a masonry layout, keeping every image at its own aspect ratio.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"queryType":"images","baseQuery":{"perPage":12}} -->
<div class="vp-block-loop">
	<!-- wp:visual-portfolio/item-template {"layoutType":"masonry","layoutColumns":4} -->
		<!-- wp:visual-portfolio/item-image {"isLink":true} /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
