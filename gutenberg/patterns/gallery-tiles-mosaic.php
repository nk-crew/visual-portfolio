<?php
/**
 * Title: Tiles Mosaic
 * Slug: visual-portfolio/gallery-tiles-mosaic
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: A mosaic of tiles of different sizes, cropped to the shape the pattern gives them.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppattilesmosaic","queryType":"images","baseQuery":{"perPage":10}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"tiles","layoutTiles":"3|1,1|2,0.5|1,1|1,2|1,1|"} -->
		<!-- wp:visual-portfolio/item-image {"clickAction":"popup"} /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
