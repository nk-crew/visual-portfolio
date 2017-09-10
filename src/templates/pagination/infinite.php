<?php
/**
 * Infinite pagination template.
 *
 * @var $args
 * @package visual-portfolio
 */

?>

<ul class="<?php echo esc_attr( $args['class'] ); ?> vp-pagination__style-default" data-vp-pagination-type="<?php echo esc_attr( $args['type'] ); ?>">
    <li class="vp-pagination__item">
        <a class="vp-pagination__load-more" href="<?php echo esc_url( $args['next_page_url'] ); ?>">
            <span>Load More</span>
            <span class="vp-pagination__load-more-loading">Loading...</span>
            <span class="vp-pagination__load-more-no-more">No More</span>
        </a>
    </li>
</ul>
