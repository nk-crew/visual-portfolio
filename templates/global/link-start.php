<?php
/**
 * Link start template.
 *
 * @var $href
 * @var $target
 * @var $rel
 * @var $tabindex
 * @var $class
 * @var $fallback
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( isset( $href ) && $href ) {
	?>
	<a
		href="<?php echo esc_url( $href ); ?>"
		<?php
		if ( isset( $target ) && $target ) {
			echo 'target="' . esc_attr( $target ) . '" ';
		}
		if ( isset( $rel ) && $rel ) {
			echo 'rel="' . esc_attr( $rel ) . '" ';
		}
		if ( isset( $tabindex ) && $tabindex ) {
			echo 'tabindex="' . esc_attr( $tabindex ) . '" ';
		}
		if ( isset( $class ) && $class ) {
			echo 'class="' . esc_attr( $class ) . '" ';
		}
		?>
	>
	<?php
} elseif ( isset( $fallback ) && $fallback ) {
	?>
	<<?php echo esc_html( $fallback ); ?>
		<?php
		if ( isset( $class ) && $class ) {
			echo ' class="' . esc_attr( $class ) . '" ';
		}
		?>
	>
	<?php
}
