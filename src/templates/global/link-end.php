<?php
/**
 * Link end template.
 *
 * @var $href
 * @var $target
 * @var $class
 * @var $fallback
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( isset( $href ) && $href ) {
    echo '</a>';
} elseif ( isset( $fallback ) && $fallback ) {
    echo '</' . esc_html( $fallback ) . '>';
}
