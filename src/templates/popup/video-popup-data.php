<?php
/**
 * Render data for Video popup.
 *
 * @var $video_data
 * @var $args
 * @var $opts
 *
 * @package @@plugin_name
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="vp-portfolio__item-popup"
    style="display: none;"
    data-vp-popup-video="<?php echo esc_url( $video_data['url'] ); ?>"
    data-vp-popup-poster="<?php echo $video_data['poster'] ? esc_url( $video_data['poster'] ) : ''; ?>"
></div>
