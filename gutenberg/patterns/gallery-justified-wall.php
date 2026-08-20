<?php
/**
 * Title: Justified Photo Wall
 * Slug: visual-portfolio/gallery-justified-wall
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Description: Rows of an even height that fill the width, keeping every picture at its own proportions.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"block_id":"vppatjustifiedwall","queryType":"images","baseQuery":{"perPage":12}} -->
<div class="vp-block-loop">
	<!-- wp:visual-portfolio/item-template {"layoutType":"justified","justifiedRowHeight":260} -->
		<!-- wp:visual-portfolio/item-image {"clickAction":"popup"} /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
