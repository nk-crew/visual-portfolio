<?php
/**
 * Title: Grid Rounded
 * Slug: visual-portfolio/gallery-grid-rounded
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: Display gallery items in a grid, with rounded images and a wide gap between them.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatgridrounded","queryType":"images","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumnsMode":"manual","layoutColumnCount":3,"style":{"spacing":{"blockGap":"2.5rem"}}} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"1","clickAction":"popup","style":{"border":{"radius":"20px"}}} /-->
		<!-- wp:visual-portfolio/item-title {"textAlign":"center"} /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
