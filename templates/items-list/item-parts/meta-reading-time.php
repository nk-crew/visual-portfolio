<?php
/**
 * Item meta reading time template.
 *
 * @var $args
 * @var $opts
 *
 * @package @@plugin_name
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! $opts['show_reading_time'] || ! $args['reading_time'] ) {
	return;
}

?>

<div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-reading-rime">
	<span class="vp-portfolio__item-meta-part-icon">
		<span class="vp-screen-reader-text">
			<?php echo esc_html__( 'Reading Time', '@@text_domain' ); ?>
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
					'@@text_domain'
				),
				is_string( $args['reading_time'] ) ? $args['reading_time'] : number_format_i18n( (int) $args['reading_time'] )
			)
		);
		?>
	</span>
</div>
