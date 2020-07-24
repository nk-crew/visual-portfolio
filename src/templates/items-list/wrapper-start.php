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
        <div class="vp-portfolio__preloader"><span></span><span></span><span></span><span></span><i></i></div>
    </div>
