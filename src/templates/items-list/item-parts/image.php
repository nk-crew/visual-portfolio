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
echo wp_kses( $args['image'], 'vp_image' );
