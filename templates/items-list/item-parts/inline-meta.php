<?php
/**
 * Item inline meta template.
 *
 * @var $args
 * @var $opts
 * @var $allow_links
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$inline_meta = $opts['show_author'] && $args['author'] ||
	$opts['show_date'] ||
	$opts['show_comments_count'] && '' !== $args['comments_count'] ||
	$opts['show_views_count'] && $args['views_count'] ||
	$opts['show_reading_time'] && $args['reading_time'];

$templates_data = array(
	'args'        => $args,
	'opts'        => $opts,
	'allow_links' => isset( $allow_links ) ? $allow_links : false,
);

if ( ! $inline_meta ) {
	return;
}

?>

<div class="vp-portfolio__item-meta-inline">
	<?php
	// Author.
	visual_portfolio()->include_template( 'items-list/item-parts/meta-author', $templates_data );

	// Date.
	visual_portfolio()->include_template( 'items-list/item-parts/meta-date', $templates_data );

	// Comments.
	visual_portfolio()->include_template( 'items-list/item-parts/meta-comments', $templates_data );

	// Views.
	visual_portfolio()->include_template( 'items-list/item-parts/meta-views', $templates_data );

	// Reading Time.
	visual_portfolio()->include_template( 'items-list/item-parts/meta-reading-time', $templates_data );
	?>
</div>
