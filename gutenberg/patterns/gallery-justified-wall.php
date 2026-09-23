<?php
/**
 * Title: Justified Photo Wall
 * Slug: visual-portfolio/gallery-justified-wall
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: Rows of an even height that fill the width, keeping every picture at its own proportions.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatjustifiedwall","queryType":"images","baseQuery":{"perPage":12}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"justified","justifiedRowHeight":260} -->
		<!-- wp:visual-portfolio/item-image {"clickAction":"popup"} /-->
	<!-- /wp:visual-portfolio/item-template -->
	<!-- wp:visual-portfolio/loop-no-results -->
		<!-- wp:paragraph -->
		<p><?php esc_html_e( 'No items were found matching your selection.', 'visual-portfolio' ); ?></p>
		<!-- /wp:paragraph -->
	<!-- /wp:visual-portfolio/loop-no-results -->
</div>
<!-- /wp:visual-portfolio/loop -->
