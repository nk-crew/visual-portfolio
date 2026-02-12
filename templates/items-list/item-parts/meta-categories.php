<?php
/**
 * Item meta categories template.
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

$meta_enabled = $opts['show_categories'] && $args['categories'] && ! empty( $args['categories'] );

/**
 * Allow extensions to enable categories meta output.
 *
 * @param bool  $meta_enabled Whether categories meta should be rendered.
 * @param array $args         Item arguments.
 * @param array $opts         Portfolio options.
 */
$meta_enabled = apply_filters( 'vpf_each_item_meta_categories_enabled', $meta_enabled, $args, $opts );

if ( ! $meta_enabled ) {
	return;
}

$allow_links    = isset( $allow_links ) ? $allow_links : false;
$count          = $opts['categories_count'];
$templates_data = array(
	'args'        => $args,
	'opts'        => $opts,
	'allow_links' => $allow_links,
);

?>

<?php do_action( 'vpf_each_item_meta_categories_before', $templates_data ); ?>

<div class="vp-portfolio__item-meta-categories">
	<?php
	foreach ( $args['categories'] as $category ) {
		if ( ! $count ) {
			break;
		}

		$link_data = array(
			'href'     => $allow_links ? $category['url'] : false,
			'fallback' => 'span',
		);

		?>
		<div class="vp-portfolio__item-meta-category">
			<?php
			visual_portfolio()->include_template( 'global/link-start', $link_data );
			echo esc_html( $category['label'] );
			visual_portfolio()->include_template( 'global/link-end', $link_data );
			?>
		</div>
		<?php
		--$count;
	}
	?>
</div>

<?php do_action( 'vpf_each_item_meta_categories_after', $templates_data ); ?>
