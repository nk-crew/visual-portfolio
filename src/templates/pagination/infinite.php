<?php
/**
 * Infinite pagination template.
 * Available $args variable.
 *
 * @package visual-portfolio
 */

?>

<div class="vp-pagination vp-pagination__style" data-vp-pagination-type="<?php echo esc_attr( $args['type'] ); ?>" data-vp-pagination-id="<?php echo esc_attr( $args['id'] ); ?>" data-vp-pagination-next-page-url="<?php echo esc_url( $args['next_page_url'] ); ?>">
    <a class="vp-pagination__load-more" href="<?php echo esc_url( $args['next_page_url'] ); ?>">
        <span>Load More</span>
        <span class="vp-pagination__load-more-loading">Loading...</span>
        <span class="vp-pagination__load-more-no-more">No More</span>
    </a>
</div>
