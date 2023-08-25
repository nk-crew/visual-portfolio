<?php
/**
 * Item title template.
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

if ( ! $opts['show_title'] || ! $args['title'] ) {
    return;
}

$allow_links = isset( $allow_links ) ? $allow_links : false;
$link_data   = array(
    'href'   => $allow_links ? $args['url'] : false,
    'target' => $args['url_target'],
    'rel'    => $args['url_rel'],
);

?>

<h2 class="vp-portfolio__item-meta-title">
    <?php
    visual_portfolio()->include_template( 'global/link-start', $link_data );
    echo wp_kses_post( $args['title'] );
    visual_portfolio()->include_template( 'global/link-end', $link_data );
    ?>
</h2>
