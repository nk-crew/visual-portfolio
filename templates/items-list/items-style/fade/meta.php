<?php
/**
 * Item meta template.
 *
 * @var $args
 * @var $opts
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

$show_meta = $inline_meta ||
	$opts['show_icon'] ||
	$opts['show_title'] && $args['title'] ||
	$opts['show_excerpt'] && $args['excerpt'] ||
	$opts['show_categories'] && $args['categories'] && ! empty( $args['categories'] );

$align = $opts['overlay_text_align'] ?? $opts['align'] ?? 'center';

$templates_data = array(
	'args'        => $args,
	'opts'        => $opts,
	'allow_links' => ! $args['url'],
);

$link_data = array_merge(
	array(
		'href'     => $args['url'],
		'target'   => $args['url_target'],
		'rel'      => $args['url_rel'],
		'fallback' => 'span',
		'class'    => 'vp-portfolio__item-meta',
		'tabindex' => '-1',
	),
	$templates_data
);

if ( $show_meta ) : ?>
	<figcaption class="vp-portfolio__item-overlay vp-portfolio__item-overlay-text-align-<?php echo esc_attr( $align ); ?>">
		<div class="vp-portfolio__item-meta-wrap vp-portfolio__custom-scrollbar">
			<?php
			visual_portfolio()->include_template( 'global/link-start', $link_data );

			// Icon.
			visual_portfolio()->include_template( 'items-list/item-parts/icon', $templates_data );

			// Categories.
			visual_portfolio()->include_template( 'items-list/item-parts/meta-categories', $templates_data );

			// Title.
			visual_portfolio()->include_template( 'items-list/item-parts/title', $templates_data );

			// Inline Meta.
			visual_portfolio()->include_template( 'items-list/item-parts/inline-meta', $templates_data );

			// Excerpt.
			visual_portfolio()->include_template( 'items-list/item-parts/excerpt', $templates_data );

			visual_portfolio()->include_template( 'global/link-end', $link_data );
			?>
		</div>
	</figcaption>
<?php else : ?>
	<div class="vp-portfolio__item-overlay">
		<?php visual_portfolio()->include_template( 'global/link-start', $link_data ); ?>
		<?php visual_portfolio()->include_template( 'global/link-end', $link_data ); ?>
	</div>
	<?php
endif;
