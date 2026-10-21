<?php
/**
 * Item image template.
 *
 * @var $args
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! isset( $args['image'] ) || ! $args['image'] ) {
	return;
}
echo Visual_Portfolio_Security::kses_image( $args['image'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- passed through wp_kses there.
