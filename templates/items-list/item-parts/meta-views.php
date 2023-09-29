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

if ( ! $opts['show_views_count'] || ! $args['views_count'] ) {
	return;
}

?>

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
