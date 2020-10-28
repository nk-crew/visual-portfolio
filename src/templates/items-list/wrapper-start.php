<?php
/**
 * Wrapper start.
 *
 * @var $options
 * @var $style_options
 * @var $class
 * @var $data_attrs
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="<?php echo esc_attr( $class ); ?>"
    <?php
    // phpcs:ignore
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="20" rx="10" fill="black"/>
                <mask id="vpf_logo_mask0" mask-type="alpha" maskUnits="userSpaceOnUse" x="9" y="6" width="6" height="8">
                    <path d="M11.5062 13.9L14.0488 6.59998H11.6895L9.40001 13.9H11.5062Z" fill="url(#vpf_logo_paint0_linear)"/>
                </mask>
                <g mask="url(#vpf_logo_mask0)">
                    <path d="M11.5062 13.9L14.0488 6.59998H11.6895L9.40001 13.9H11.5062Z" fill="white"/>
                </g>
                <path d="M8.54256 13.9L6 6.59998H8.35933L10.6488 13.9H8.54256Z" fill="white"/>
                <defs>
                    <linearGradient id="vpf_logo_paint0_linear" x1="12.9" y1="6.59998" x2="6.6" y2="15.4" gradientUnits="userSpaceOnUse">
                    <stop/>
                    <stop offset="1" stop-opacity="0"/>
                    </linearGradient>
                </defs>
            </svg>
        </div>
    </div>
