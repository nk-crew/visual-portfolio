<?php
/**
 * Item meta date template.
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

$meta_enabled = $opts['show_date'];

/**
 * Allow extensions to enable date meta output.
 *
 * @param bool  $meta_enabled Whether date meta should be rendered.
 * @param array $args         Item arguments.
 * @param array $opts         Portfolio options.
 */
$meta_enabled = apply_filters( 'vpf_each_item_meta_date_enabled', $meta_enabled, $args, $opts );

if ( ! $meta_enabled || empty( $args['published'] ) ) {
	return;
}

$templates_data = array(
	'args' => $args,
	'opts' => $opts,
);

?>

<?php do_action( 'vpf_each_item_meta_date_before', $templates_data ); ?>

<div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-date">
	<span class="vp-portfolio__item-meta-part-icon">
		<span class="vp-screen-reader-text">
			<?php echo esc_html__( 'Date', 'visual-portfolio' ); ?>
		</span>
		<?php visual_portfolio()->include_template( 'icons/calendar' ); ?>
	</span>
	<span class="vp-portfolio__item-meta-part-text">
		<?php echo esc_html( $args['published'] ); ?>
	</span>
</div>

<?php do_action( 'vpf_each_item_meta_date_after', $templates_data ); ?>
