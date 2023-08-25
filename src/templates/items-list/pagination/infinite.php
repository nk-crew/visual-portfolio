<?php
/**
 * Default infinite pagination template.
 *
 * @var $args
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="<?php echo esc_attr( $args['class'] ); ?> vp-pagination__style-default" data-vp-pagination-type="<?php echo esc_attr( $args['type'] ); ?>">
    <div class="vp-pagination__item">
        <a class="vp-pagination__load-more" href="<?php echo esc_url( $args['next_page_url'] ); ?>">
            <span><?php echo esc_html( $args['text_load'] ); ?></span>
            <span class="vp-pagination__load-more-loading"><span class="vp-spinner"></span><span class="vp-screen-reader-text"> <?php echo esc_html( $args['text_loading'] ); ?></span></span>
            <span class="vp-pagination__load-more-no-more"><?php echo esc_html( $args['text_end_list'] ); ?></span>
        </a>
    </div>
</div>
