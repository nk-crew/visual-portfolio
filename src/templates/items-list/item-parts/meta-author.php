<?php
/**
 * Item meta author template.
 *
 * @var $args
 * @var $opts
 * @var $allow_links
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! $opts['show_author'] || ! $args['author'] ) {
    return;
}

$allow_links = isset( $allow_links ) ? $allow_links : false;
$link_data   = array(
    'href' => $allow_links ? $args['author_url'] : false,
);

?>

<div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-author">
    <span class="vp-portfolio__item-meta-part-icon">
        <span class="vp-screen-reader-text">
            <?php echo esc_html__( 'Author', 'visual-portfolio' ); ?>
        </span>
        <?php
        if ( $args['author_avatar'] ) {
            visual_portfolio()->include_template( 'global/link-start', $link_data );
            ?>
            <img src="<?php echo esc_url( $args['author_avatar'] ); ?>" alt="<?php echo esc_attr( $args['author'] ); ?>" width="50" height="50">
            <?php
            visual_portfolio()->include_template( 'global/link-end', $link_data );
        } else {
            visual_portfolio()->include_template( 'icons/user' );
        }
        ?>
    </span>
    <span class="vp-portfolio__item-meta-part-text">
        <?php
        printf(
            // translators: %s - author name.
            esc_html__( 'By %s', 'visual-portfolio' ),
            $link_data['href'] ? '<a href="' . esc_url( $link_data['href'] ) . '">' . esc_html( $args['author'] ) . '</a>' : esc_html( $args['author'] )
        );
        ?>
    </span>
</div>
