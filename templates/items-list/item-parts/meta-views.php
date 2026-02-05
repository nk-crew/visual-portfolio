<?php
/**
 * Item meta views template.
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

$meta_enabled = $opts['show_views_count'] && $args['views_count'];

/**
 * Allow extensions to enable views meta output.
 *
 * @param bool  $meta_enabled Whether views meta should be rendered.
 * @param array $args         Item arguments.
 * @param array $opts         Portfolio options.
 */
$meta_enabled = apply_filters( 'vpf_each_item_meta_views_enabled', $meta_enabled, $args, $opts );

if ( ! $meta_enabled ) {
	return;
}

$templates_data = array(
	'args' => $args,
	'opts' => $opts,
);

?>

<?php do_action( 'vpf_each_item_meta_views_before', $templates_data ); ?>

<div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-views">
	<span class="vp-portfolio__item-meta-part-icon">
		<span class="vp-screen-reader-text">
			<?php echo esc_html__( 'Views', 'visual-portfolio' ); ?>
		</span>
		<?php visual_portfolio()->include_template( 'icons/eye' ); ?>
	</span>
	<span class="vp-portfolio__item-meta-part-text">
		<?php
		// translators: %s Number of views.
		echo esc_html( sprintf( _n( '%s View', '%s Views', $args['views_count'], 'visual-portfolio' ), number_format_i18n( (int) $args['views_count'] ) ) );
		?>
	</span>
</div>

<?php do_action( 'vpf_each_item_meta_views_after', $templates_data ); ?>
