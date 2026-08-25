<?php
/**
 * Title: Grid Classic
 * Slug: visual-portfolio/gallery-grid-classic
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: Display gallery items in a grid layout, with a title under each image.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatgridclassic","queryType":"images","baseQuery":{"perPage":9}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumnsMode":"manual","layoutColumnCount":3} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"1","clickAction":"popup"} /-->
		<!-- wp:visual-portfolio/item-title {"textAlign":"center"} /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
