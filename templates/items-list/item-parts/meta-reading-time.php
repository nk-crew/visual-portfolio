<?php
/**
 * Item meta reading time template.
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

$meta_enabled = $opts['show_reading_time'] && $args['reading_time'];

/**
 * Allow extensions to enable reading time meta output.
 *
 * @param bool  $meta_enabled Whether reading time meta should be rendered.
 * @param array $args         Item arguments.
 * @param array $opts         Portfolio options.
 */
$meta_enabled = apply_filters( 'vpf_each_item_meta_reading_time_enabled', $meta_enabled, $args, $opts );

if ( ! $meta_enabled ) {
	return;
}

$templates_data = array(
	'args' => $args,
	'opts' => $opts,
);

?>

<?php do_action( 'vpf_each_item_meta_reading_time_before', $templates_data ); ?>

<div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-reading-rime">
	<span class="vp-portfolio__item-meta-part-icon">
		<span class="vp-screen-reader-text">
			<?php echo esc_html__( 'Reading Time', 'visual-portfolio' ); ?>
		</span>
		<?php visual_portfolio()->include_template( 'icons/book' ); ?>
	</span>
	<span class="vp-portfolio__item-meta-part-text">
		<?php
		echo esc_html(
			sprintf(
				// translators: %s Reading time minutes.
				_n(
					'%s Min Read',
					'%s Mins Read',
					is_string( $args['reading_time'] ) ? 1 : $args['reading_time'],
					'visual-portfolio'
				),
				is_string( $args['reading_time'] ) ? $args['reading_time'] : number_format_i18n( (int) $args['reading_time'] )
			)
		);
		?>
	</span>
</div>

<?php do_action( 'vpf_each_item_meta_reading_time_after', $templates_data ); ?>
