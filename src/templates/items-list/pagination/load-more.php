<?php
/**
 * Load more pagination template.
 *
 * @var $args
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<ul class="<?php echo esc_attr( $args['class'] ); ?> vp-pagination__style-default" data-vp-pagination-type="<?php echo esc_attr( $args['type'] ); ?>">
    <li class="vp-pagination__item">
        <a class="vp-pagination__load-more" href="<?php echo esc_url( $args['next_page_url'] ); ?>">
            <span><?php echo esc_html__( 'Load More', '@@text_domain' ); ?></span>
            <span class="vp-pagination__load-more-loading"><?php echo esc_html__( 'Loading...', '@@text_domain' ); ?></span>
            <span class="vp-pagination__load-more-no-more"><?php echo esc_html__( 'No More', '@@text_domain' ); ?></span>
        </a>
    </li>
</ul>
