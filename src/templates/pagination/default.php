<?php
/**
 * Default pagination template.
 * Available $args variable.
 *
 * @package visual-portfolio
 */

?>

<div class="vp-pagination vp-pagination__style" data-vp-pagination-type="default" data-vp-pagination-id="<?php echo esc_attr( $args['id'] ); ?>" data-vp-pagination-next-page-url="<?php echo esc_url( $args['next_page_url'] ); ?>">
    <?php
    echo paginate_links( array(
        'base' => esc_url_raw( str_replace( 999999999, '%#%', remove_query_arg( 'add-to-cart', get_pagenum_link( 999999999, false ) ) ) ),
        'format' => '',
        'add_args' => '',
        'current' => $args['start_page'],
        'total' => $args['max_pages'],
        'prev_text' => '<span class="nk-icon-arrow-left">prev</span>',
        'next_text' => '<span class="nk-icon-arrow-right">next</span>',
        'end_size' => 3,
        'mid_size' => 3,
    ) );
    ?>
</div>
