<?php
/**
 * Title: Masonry Reveal
 * Slug: visual-portfolio/gallery-masonry-reveal
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: A masonry of pictures at their own proportions, with the title and the categories rising over the image on hover.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatmasonryreveal","queryType":"images","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"masonry","layoutColumnsMode":"manual","layoutColumnCount":3} -->
		<!-- wp:visual-portfolio/item-cover {"aspectRatio":"","effect":"emerge","clickAction":"popup","contentPosition":"bottom center","customHoverGradient":"linear-gradient(0deg,rgb(0,0,0) 0%,rgba(0,0,0,0) 70%)","hoverDimRatio":90} -->
			<!-- wp:visual-portfolio/item-title {"textAlign":"center","style":{"color":{"text":"#ffffff"}}} /-->
			<!-- wp:visual-portfolio/item-categories {"textAlign":"center","style":{"color":{"text":"#ffffff"}}} /-->
		<!-- /wp:visual-portfolio/item-cover -->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
