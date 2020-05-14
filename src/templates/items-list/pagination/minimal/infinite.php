<?php
/**
 * Minimal infinite pagination template.
 *
 * @var $args
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<ul class="<?php echo esc_attr( $args['class'] ); ?> vp-pagination__style-minimal" data-vp-pagination-type="<?php echo esc_attr( $args['type'] ); ?>">
    <li class="vp-pagination__item">
        <a class="vp-pagination__load-more" href="<?php echo esc_url( $args['next_page_url'] ); ?>">
            <span><?php echo esc_html( $args['text_load'] ); ?></span>
            <span class="vp-pagination__load-more-loading"><span class="vp-spinner"></span><span class="sr-only"> <?php echo esc_html( $args['text_loading'] ); ?></span></span>
            <span class="vp-pagination__load-more-no-more"><?php echo esc_html( $args['text_end_list'] ); ?></span>
        </a>
    </li>
</ul>
