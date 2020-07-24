<?php
/**
 * Items wrapper start.
 *
 * @var $options
 * @var $style_options
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$vpf_item_classes = 'vp-portfolio__items vp-portfolio__items-style-' . $options['items_style'];

if ( isset( $style_options['show_overlay'] ) && $style_options['show_overlay'] ) {
    $vpf_item_classes .= ' vp-portfolio__items-show-overlay-' . $style_options['show_overlay'];
}

?>

<div class="<?php echo esc_attr( $vpf_item_classes ); ?>">
