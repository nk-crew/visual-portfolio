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
 * @package @@plugin_name
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$attributes = ' ';

if ( isset( $href ) && $href ) {
    $attributes .= 'href="' . esc_url( $href ) . '" ';

    if ( isset( $target ) && $target ) {
        $attributes .= 'target="' . esc_attr( $target ) . '" ';
    }
    if ( isset( $rel ) && $rel ) {
        $attributes .= 'rel="' . esc_attr( $rel ) . '" ';
    }
    if ( isset( $tabindex ) && $tabindex ) {
        $attributes .= 'tabindex="' . esc_attr( $tabindex ) . '" ';
    }
}
if ( isset( $class ) && $class ) {
    $attributes .= 'class="' . esc_attr( $class ) . '" ';
}

if ( isset( $href ) && $href ) {
    // phpcs:ignore
    echo '<a ' . $attributes . '>';
} elseif ( isset( $fallback ) && $fallback ) {
    // phpcs:ignore
    echo '<' . esc_html( $fallback ) . ' ' . $attributes . '>';
}
