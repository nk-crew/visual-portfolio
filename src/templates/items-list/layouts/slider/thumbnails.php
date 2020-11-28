<?php
/**
 * Slider layout thumbnails.
 *
 * @var $options
 * @var $style_options
 * @var $thumbnails
 * @var $img_size
 *
 * @package @@plugin_name
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="vp-portfolio__thumbnails-wrap">
    <div class="vp-portfolio__thumbnails">
        <?php
        foreach ( $thumbnails as $image_id ) {
            ?>
            <div class="vp-portfolio__thumbnail-wrap">
                <div class="vp-portfolio__thumbnail">
                    <div class="vp-portfolio__thumbnail-img-wrap">
                        <div class="vp-portfolio__thumbnail-img">
                            <?php
                            // phpcs:ignore
                            echo Visual_Portfolio_Images::get_attachment_image( $image_id, $img_size );
                            ?>
                        </div>
                    </div>
                </div>
            </div>
            <?php
        }
        ?>
    </div>
</div>
