<?php
/**
 * Title: Blog Roll
 * Slug: visual-portfolio/gallery-blog-roll
 * Categories: gallery
 * Block Types: visual-portfolio/loop
 * Viewport Width: 960
 * Description: Display posts in two columns, each with its author, its reading time, an excerpt and a link to the post.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:visual-portfolio/loop {"align":"wide","block_id":"vppatblogroll","queryType":"posts","baseQuery":{"perPage":6}} -->
<div class="vp-block-loop alignwide">
	<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumnsMode":"manual","layoutColumnCount":2} -->
		<!-- wp:visual-portfolio/item-image {"aspectRatio":"16/9","clickAction":"url"} /-->
		<!-- wp:visual-portfolio/item-title {"clickAction":"url"} /-->
		<!-- wp:visual-portfolio/item-author {"isLink":true} /-->
		<!-- wp:visual-portfolio/item-meta {"metaType":"reading-time"} /-->
		<!-- wp:visual-portfolio/item-description /-->
		<!-- wp:visual-portfolio/item-read-more {"showArrow":true} /-->
	<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->
