<?php
/**
 * Item image template.
 *
 * @var $args
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! isset( $args['image'] ) || ! $args['image'] ) {
    return;
}
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
echo Visual_Portfolio_Security::wp_kses_image( $args['image'] );
