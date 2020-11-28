<?php
/**
 * Item image template.
 *
 * @var $args
 * @var $opts
 *
 * @package @@plugin_name
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$link_data = array(
    'href'   => $args['url'],
    'target' => $args['url_target'],
    'rel'    => $args['url_rel'],
);

?>

<div class="vp-portfolio__item-img-wrap">
    <div class="vp-portfolio__item-img">
        <?php visual_portfolio()->include_template( 'global/link-start', $link_data ); ?>

        <?php echo wp_kses( $args['image'], $args['image_allowed_html'] ); ?>

        <div class="vp-portfolio__item-img-overlay">
            <?php
            // Show Icon.
            visual_portfolio()->include_template(
                'items-list/item-parts/icon',
                array(
                    'args' => $args,
                    'opts' => $opts,
                )
            );
            ?>
        </div>

        <?php visual_portfolio()->include_template( 'global/link-end', $link_data ); ?>
    </div>
</div>
