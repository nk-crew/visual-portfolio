<?php
/**
 * Wrapper start.
 *
 * @var $options
 * @var $style_options
 * @var $class
 * @var $data_attrs
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>

<div class="<?php echo esc_attr( $class ); ?>"
	<?php
	foreach ( $data_attrs as $name => $data ) {
		if ( 'data-vp-next-page-url' === $name ) {
			echo esc_html( $name ) . '="' . esc_url( $data ) . '" ';
		} else {
			echo esc_html( $name ) . '="' . esc_attr( $data ) . '" ';
		}
	}
	?>
>
	<div class="vp-portfolio__preloader-wrap">
		<div class="vp-portfolio__preloader">
			<img loading="eager" src="<?php echo esc_url( visual_portfolio()->plugin_url . 'assets/images/logo-dark.svg' ); ?>" alt="<?php echo esc_attr__( 'Visual Portfolio, Posts & Image Gallery for WordPress', 'visual-portfolio' ); ?>" width="20" height="20" data-skip-lazy>
		</div>
	</div>
